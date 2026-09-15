/**
 * routes/feedback.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Citizen feedback + admin metrics endpoints.
 *
 * POST /api/feedback/submit
 *   → Citizen only, own resolved issues, one submission per issue.
 *   → wasResolved = true  : save rating + comment, done.
 *   → wasResolved = false : save, then reopen issue → escalate → notify all admins.
 *
 * GET  /api/feedback/stats          → Admin only — aggregate metrics.
 * GET  /api/feedback/escalated      → Admin only — list of escalated issues.
 * PATCH /api/feedback/:id/supervisor-note → Admin only — add note to escalated issue.
 */

const express         = require('express');
const router          = express.Router();
const { verifyToken, requireAdmin } = require('../middleware/auth');
const Issue           = require('../models/Issue');
const { notifyEscalation, notifySupervisorNote } = require('../utils/notificationHelper');

// ── POST /api/feedback/submit ─────────────────────────────────────────────────
router.post('/submit', verifyToken, async (req, res) => {
  try {
    const { issueId, wasResolved, rating, feedbackComment } = req.body;
    const { id: userId, role } = req.user;

    // Only citizens submit feedback
    if (role !== 'citizen') {
      return res.status(403).json({ message: 'Only citizens can submit feedback.' });
    }

    // Validate required fields
    if (!issueId) {
      return res.status(400).json({ message: 'issueId is required.' });
    }
    if (typeof wasResolved !== 'boolean') {
      return res.status(400).json({ message: 'wasResolved must be true or false.' });
    }
    if (wasResolved && (!rating || rating < 1 || rating > 5)) {
      return res.status(400).json({ message: 'A rating between 1 and 5 is required when marking as resolved.' });
    }

    // Validate ObjectId format
    if (!/^[0-9a-fA-F]{24}$/.test(issueId)) {
      return res.status(400).json({ message: 'Invalid issue ID.' });
    }

    const issue = await Issue.findById(issueId);
    if (!issue) {
      return res.status(404).json({ message: 'Issue not found.' });
    }

    // Must be the reporter — check ObjectId first, fall back to name
    const isOwner = (issue.reportedById && issue.reportedById.toString() === userId) ||
                    (issue.reportedBy === req.user.name);
    if (!isOwner) {
      return res.status(403).json({ message: 'You can only submit feedback for your own issues.' });
    }

    // Issue must be resolved before feedback is allowed
    if (issue.status !== 'Resolved') {
      return res.status(400).json({ message: 'Feedback can only be submitted for resolved issues.' });
    }

    // Prevent duplicate feedback
    if (issue.feedbackAt !== null && issue.wasResolved !== null) {
      return res.status(409).json({ message: 'Feedback has already been submitted for this issue.' });
    }

    // Sanitise optional comment
    const comment = typeof feedbackComment === 'string'
      ? feedbackComment.trim().slice(0, 1000)
      : null;

    // ── Path A: citizen confirms resolution ───────────────────────────────────
    if (wasResolved) {
      issue.wasResolved    = true;
      issue.rating         = rating;
      issue.feedbackComment = comment;
      issue.feedbackAt     = new Date();
      await issue.save();

      return res.json({
        message: 'Thank you for your feedback!',
        issue: _publicIssueFields(issue),
      });
    }

    // ── Path B: citizen says NOT resolved → Reopen → Escalate ────────────────
    issue.wasResolved      = false;
    issue.feedbackComment  = comment;
    issue.feedbackAt       = new Date();
    issue.status           = 'Reported';               // reopen
    issue.isEscalated      = true;
    issue.escalatedAt      = new Date();
    issue.escalationReason = 'Citizen reported the issue was not actually resolved.';
    await issue.save();

    // Notify all admins (non-blocking)
    const io = req.app.get('io');
    notifyEscalation(io, issue, req.user.name);

    return res.json({
      message: 'Noted. Your issue has been reopened and escalated to a supervisor.',
      issue: _publicIssueFields(issue),
    });

  } catch (err) {
    console.error('[feedback/submit]', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ── GET /api/feedback/stats ───────────────────────────────────────────────────
// Admin: aggregate satisfaction metrics — no raw PII returned.
router.get('/stats', verifyToken, requireAdmin, async (req, res) => {
  try {
    const [
      totalResolved,
      feedbackCount,
      satisfiedCount,
      escalatedCount,
      ratingAgg,
      ratingDist,
    ] = await Promise.all([
      Issue.countDocuments({ status: 'Resolved' }),
      Issue.countDocuments({ feedbackAt: { $ne: null } }),
      Issue.countDocuments({ wasResolved: true }),
      Issue.countDocuments({ isEscalated: true }),

      // Average rating (only where rating was given)
      Issue.aggregate([
        { $match: { rating: { $ne: null } } },
        { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
      ]),

      // Rating distribution 1–5
      Issue.aggregate([
        { $match: { rating: { $ne: null } } },
        { $group: { _id: '$rating', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const avgRating   = ratingAgg[0] ? parseFloat(ratingAgg[0].avg.toFixed(2)) : null;
    const ratedCount  = ratingAgg[0]?.count || 0;
    const dist        = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratingDist.forEach(({ _id, count }) => { dist[_id] = count; });

    const satisfactionRate = feedbackCount > 0
      ? parseFloat(((satisfiedCount / feedbackCount) * 100).toFixed(1))
      : null;

    res.json({
      totalResolved,
      feedbackCount,
      feedbackRate: totalResolved > 0
        ? parseFloat(((feedbackCount / totalResolved) * 100).toFixed(1))
        : null,
      satisfiedCount,
      satisfactionRate,
      escalatedCount,
      avgRating,
      ratedCount,
      ratingDistribution: dist,
    });
  } catch (err) {
    console.error('[feedback/stats]', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ── GET /api/feedback/escalated ───────────────────────────────────────────────
// Admin: list of escalated issues, newest first.
router.get('/escalated', verifyToken, requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip  = parseInt(req.query.skip) || 0;

    const [issues, total] = await Promise.all([
      Issue.find({ isEscalated: true })
        .select('title category location status reportedBy escalatedAt escalationReason supervisorNote feedbackComment feedbackAt createdAt')
        .sort({ escalatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Issue.countDocuments({ isEscalated: true }),
    ]);

    res.json({ issues, total });
  } catch (err) {
    console.error('[feedback/escalated]', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ── PATCH /api/feedback/:id/supervisor-note ───────────────────────────────────
// Admin: attach a supervisor resolution note to an escalated issue.
router.patch('/:id/supervisor-note', verifyToken, requireAdmin, async (req, res) => {
  try {
    if (!/^[0-9a-fA-F]{24}$/.test(req.params.id)) {
      return res.status(400).json({ message: 'Invalid issue ID.' });
    }

    const { note } = req.body;
    if (!note || typeof note !== 'string' || !note.trim()) {
      return res.status(400).json({ message: 'Note text is required.' });
    }

    const issue = await Issue.findByIdAndUpdate(
      req.params.id,
      { supervisorNote: note.trim().slice(0, 2000) },
      { new: true }
    ).select('title category location supervisorNote escalatedAt status reportedBy reportedById');

    if (!issue) return res.status(404).json({ message: 'Issue not found.' });

    // Notify the citizen who reported the issue (non-blocking)
    const io       = req.app.get('io');
    const adminName = req.user?.name || 'Supervisor';
    notifySupervisorNote(io, issue, note.trim(), adminName);

    res.json({ message: 'Supervisor note saved.', issue });
  } catch (err) {
    console.error('[feedback/supervisor-note]', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ── Internal helper ───────────────────────────────────────────────────────────
function _publicIssueFields(issue) {
  return {
    _id:              issue._id,
    status:           issue.status,
    wasResolved:      issue.wasResolved,
    rating:           issue.rating,
    feedbackComment:  issue.feedbackComment,
    feedbackAt:       issue.feedbackAt,
    isEscalated:      issue.isEscalated,
    escalatedAt:      issue.escalatedAt,
  };
}

module.exports = router;
