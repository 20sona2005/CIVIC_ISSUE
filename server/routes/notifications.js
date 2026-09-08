/**
 * routes/notifications.js
 * ─────────────────────────────────────────────────────────────────────────────
 * All routes require a valid JWT (verifyToken middleware).
 * Users can only see/modify their OWN notifications.
 *
 * Endpoints
 * ─────────
 *  GET    /api/notifications          — fetch notifications for logged-in user
 *  GET    /api/notifications/unread-count — just the count badge number
 *  PATCH  /api/notifications/:id/read — mark one notification as read
 *  PATCH  /api/notifications/read-all — mark all of user's notifications as read
 */

const express  = require('express');
const router   = express.Router();
const mongoose = require('mongoose');
const { verifyToken } = require('../middleware/auth');
const Notification    = require('../models/Notification');

// All notification routes require login
router.use(verifyToken);

// ── GET /api/notifications ────────────────────────────────────────────────────
// Returns the logged-in user's notifications, newest first.
// Query params:
//   limit  (default 20, max 100)
//   skip   (default 0) — for pagination
//   unread (boolean string "true") — only unread
router.get('/', async (req, res) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit)  || 20, 100);
    const skip   = parseInt(req.query.skip)  || 0;
    const onlyUnread = req.query.unread === 'true';

    const query = { recipientId: req.user.id };
    if (onlyUnread) query.isRead = false;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments({ recipientId: req.user.id }),
      Notification.countDocuments({ recipientId: req.user.id, isRead: false }),
    ]);

    res.json({ notifications, total, unreadCount });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ── GET /api/notifications/unread-count ──────────────────────────────────────
// Lightweight endpoint polled by the bell icon badge.
// Must be defined BEFORE /:id route to avoid "unread-count" being treated as an id.
router.get('/unread-count', async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      recipientId: req.user.id,
      isRead: false,
    });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ── PATCH /api/notifications/read-all ────────────────────────────────────────
// Mark every unread notification for the logged-in user as read.
// Must be defined BEFORE /:id to avoid route collision.
router.patch('/read-all', async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { recipientId: req.user.id, isRead: false },
      { $set: { isRead: true } }
    );
    res.json({ modifiedCount: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ── PATCH /api/notifications/:id/read ────────────────────────────────────────
// Mark a single notification as read.
// Only allowed if the notification belongs to the requesting user.
router.patch('/:id/read', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid notification ID' });
    }

    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipientId: req.user.id },
      { $set: { isRead: true } },
      { new: true }
    );

    if (!notif) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json(notif);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
