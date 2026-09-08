const express  = require('express');
const router   = express.Router();
const { verifyToken, requireAdmin } = require('../middleware/auth');
const Issue    = require('../models/Issue');
const User     = require('../models/User');
const { notifyIssueReporter } = require('../utils/notificationHelper');

// All routes require a valid token AND admin role
router.use(verifyToken, requireAdmin);

// ── GET /api/admin/stats ──────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const [totalIssues, totalUsers, statusCounts] = await Promise.all([
      Issue.countDocuments(),
      User.countDocuments(),
      Issue.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const byStatus = { Reported: 0, 'In Progress': 0, Resolved: 0 };
    statusCounts.forEach(({ _id, count }) => {
      if (_id in byStatus) byStatus[_id] = count;
    });

    res.json({ totalIssues, totalUsers, byStatus });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ── GET /api/admin/issues ─────────────────────────────────────────────────────
router.get('/issues', async (req, res) => {
  try {
    const issues = await Issue.find().sort({ createdAt: -1 });
    res.json(issues);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ── PATCH /api/admin/issues/:id/status ───────────────────────────────────────
// Updates issue status and fires a citizen notification if status changed.
router.patch('/issues/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['Reported', 'In Progress', 'Resolved'];

    if (!allowed.includes(status)) {
      return res.status(400).json({
        message: `Invalid status. Must be one of: ${allowed.join(', ')}`,
      });
    }

    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid issue ID' });
    }

    // Fetch BEFORE update so we know the old status
    const existing = await Issue.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: 'Issue not found' });
    }

    const oldStatus = existing.status;

    // Skip DB write and notification if status hasn't changed
    if (oldStatus === status) {
      return res.json(existing);
    }

    const updatedIssue = await Issue.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    // ── Fire notification (non-blocking) ────────────────────────────────────
    const io = req.app.get('io');
    const adminName = req.user?.name || 'Authority';
    notifyIssueReporter(io, updatedIssue, oldStatus, status, adminName);
    // notifyIssueReporter never throws — safe to call without await in critical path

    res.json(updatedIssue);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
