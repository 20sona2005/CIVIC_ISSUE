const express = require('express');
const router = express.Router();
const { verifyToken, requireAdmin } = require('../middleware/auth');
const Issue = require('../models/Issue');
const User = require('../models/User');

// All routes here require a valid token AND admin role
router.use(verifyToken, requireAdmin);

// GET /api/admin/stats — summary counts for admin dashboard
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

// GET /api/admin/issues — all issues (admin view)
router.get('/issues', async (req, res) => {
  try {
    const issues = await Issue.find().sort({ createdAt: -1 });
    res.json(issues);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PATCH /api/admin/issues/:id/status — update issue status
router.patch('/issues/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['Reported', 'In Progress', 'Resolved'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Must be one of: ${allowed.join(', ')}` });
    }

    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid issue ID' });
    }

    const issue = await Issue.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!issue) return res.status(404).json({ message: 'Issue not found' });

    res.json(issue);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
