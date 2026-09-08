const express  = require('express');
const router   = express.Router();
const Issue    = require('../models/Issue');
const upload   = require('../middleware/upload');
const jwt      = require('jsonwebtoken');
const { findDuplicates }  = require('../utils/duplicateDetector');
const { notifyAdmins }    = require('../utils/notificationHelper');

// Optional auth — reads JWT if present, attaches req.userId (does NOT reject missing token)
function optionalAuth(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) {
      const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
      req.userId = decoded.id;
    }
  } catch {
    // Invalid token — ignore, proceed unauthenticated
  }
  next();
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/issues/check-duplicate
// Called by the frontend BEFORE final submission to check for potential dupes.
//
// Query params:
//   title       (string, required)
//   description (string, required)
//   category    (string, required)
//   location    (string)
//   lat         (number, optional)
//   lng         (number, optional)
//   radiusMatchM (number, optional — default 100 m)
//   radiusOuterM (number, optional — default 300 m)
//   threshold   (number 0-1, optional — default 0.50)
//
// Response 200:
//   { hasDuplicates: bool, duplicates: [{ issue, scores, confidence }] }
// ─────────────────────────────────────────────────────────────────────────────
router.get('/check-duplicate', async (req, res) => {
  try {
    const {
      title, description, category, location,
      lat, lng,
      radiusMatchM, radiusOuterM, threshold,
    } = req.query;

    if (!title || !description || !category) {
      return res.status(400).json({
        message: 'title, description and category are required for duplicate check',
      });
    }

    // Build the incoming issue object (not yet persisted)
    const incoming = {
      title,
      description,
      category,
      location: location || '',
      coords: {
        lat: lat  ? parseFloat(lat)  : null,
        lng: lng  ? parseFloat(lng)  : null,
      },
    };

    // Fetch candidates — only unresolved issues from the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const candidates = await Issue.find({
      status:    { $ne: 'Resolved' },
      createdAt: { $gte: sixMonthsAgo },
    }).lean();

    // Run detection
    const options = {
      radiusMatchM: radiusMatchM ? parseFloat(radiusMatchM) : undefined,
      radiusOuterM: radiusOuterM ? parseFloat(radiusOuterM) : undefined,
      threshold:    threshold    ? parseFloat(threshold)    : undefined,
    };

    const duplicates = findDuplicates(incoming, candidates, options);

    return res.json({
      hasDuplicates: duplicates.length > 0,
      duplicates: duplicates.slice(0, 5).map(d => ({
        issue:      d.issue,
        scores:     d.scores,
        confidence: d.confidence,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: 'Duplicate check failed', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/issues
// Creates a new issue.
// If the body contains duplicateOf + duplicateConfidence the issue is saved
// with those fields set (citizen chose to submit despite warning).
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', optionalAuth, upload.single('image'), async (req, res) => {
  try {
    const {
      title, description, category, location, reportedBy,
      lat, lng,
      duplicateOf, duplicateConfidence,
    } = req.body;

    if (!title || !description || !category || !location || !reportedBy) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const parsedLat = lat ? parseFloat(lat) : null;
    const parsedLng = lng ? parseFloat(lng) : null;

    const issueData = {
      title,
      description,
      category,
      location,
      reportedBy,
      // Save the user's ObjectId if we could decode it from the token
      reportedById: req.userId || null,
      image: req.file ? req.file.filename : null,
      status: 'Reported',
      coords: {
        lat: parsedLat && !isNaN(parsedLat) ? parsedLat : null,
        lng: parsedLng && !isNaN(parsedLng) ? parsedLng : null,
      },
    };

    // Attach duplicate metadata if provided by the client
    if (duplicateOf) {
      issueData.duplicateOf         = duplicateOf;
      issueData.duplicateConfidence = duplicateConfidence
        ? parseFloat(duplicateConfidence)
        : null;
      issueData.isDuplicate = true;
    }

    const issue = await Issue.create(issueData);

    // ── Notify all admins (non-blocking) ──────────────────────────────────
    const io = req.app.get('io');
    notifyAdmins(io, issue, reportedBy);

    return res.status(201).json(issue);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/issues/:id/support
// Lets a citizen "support" an existing issue (like an upvote).
// Body: { userId } — string identifier for the citizen (name or id)
//
// Rules:
//   • Cannot support your own issue (same reportedBy string)
//   • Cannot support the same issue more than once
//   • Cannot support a Resolved issue
//
// Response 200: { supportCount, supportedBy }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/support', async (req, res) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid issue ID' });
    }

    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    const issue = await Issue.findById(req.params.id);
    if (!issue) {
      return res.status(404).json({ message: 'Issue not found' });
    }
    if (issue.status === 'Resolved') {
      return res.status(400).json({ message: 'Cannot support a resolved issue' });
    }
    if (issue.reportedBy === userId) {
      return res.status(400).json({ message: 'You cannot support your own issue' });
    }
    if (issue.supportedBy.includes(userId)) {
      return res.status(400).json({ message: 'You have already supported this issue' });
    }

    issue.supportedBy.push(userId);
    issue.supportCount = issue.supportedBy.length;
    await issue.save();

    return res.json({
      supportCount: issue.supportCount,
      supportedBy:  issue.supportedBy,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/issues
// Returns all issues, newest first.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const issues = await Issue.find().sort({ createdAt: -1 });
    res.json(issues);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/issues/:id
// Returns a single issue by MongoDB ObjectId.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid issue ID' });
    }

    const issue = await Issue.findById(req.params.id).populate('duplicateOf', 'title category location status');
    if (!issue) {
      return res.status(404).json({ message: 'Issue not found' });
    }
    res.json(issue);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
