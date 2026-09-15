const mongoose = require('mongoose');

/**
 * Notification Model
 * ─────────────────────────────────────────────────────────────────────────────
 * Stores every notification permanently so users can view history even after
 * the real-time socket event was missed (e.g. user was offline).
 *
 * Recipient strategy
 * ──────────────────
 * Because Issue.reportedBy is stored as a name string (not an ObjectId),
 * we store BOTH a recipientId (ObjectId → User) and a recipientName (string)
 * so lookups can be done either way. recipientId is the canonical field;
 * recipientName is a convenience denormalisation for display and fallback.
 *
 * Notification types
 * ──────────────────
 *  NEW_ISSUE       — admin receives when a citizen files a new report
 *  STATUS_UPDATE   — citizen receives when admin changes status
 *  ISSUE_REOPENED  — citizen receives when admin moves status back to Reported
 */

const notificationSchema = new mongoose.Schema(
  {
    // ── Recipient ──────────────────────────────────────────────────────────
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,          // null for "all admins" broadcasts resolved at query time
    },
    recipientRole: {
      type: String,
      enum: ['admin', 'citizen'],
      required: true,
    },
    // Name is denormalised so we can display it without a populate
    recipientName: {
      type: String,
      default: '',
    },

    // ── Type & Content ─────────────────────────────────────────────────────
    type: {
      type: String,
      enum: ['NEW_ISSUE', 'STATUS_UPDATE', 'ISSUE_RESOLVED', 'ISSUE_REOPENED'],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },

    // ── Related issue ──────────────────────────────────────────────────────
    issueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Issue',
      required: true,
    },
    issueTitle: {
      type: String,
      default: '',
    },
    issueCategory: {
      type: String,
      default: '',
    },
    issueLocation: {
      type: String,
      default: '',
    },

    // ── Who triggered it ───────────────────────────────────────────────────
    triggeredBy: {
      type: String,   // name of the user who caused the notification
      default: '',
    },

    // ── Read state ─────────────────────────────────────────────────────────
    isRead: {
      type: Boolean,
      default: false,
    },

    // ── Supervisor note (set when admin adds a note to an escalated issue) ──
    // Stored here so the citizen's notification card can display it directly
    // without needing a separate API call to the issue.
    supervisorNote: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { timestamps: true }
);

// Index for fast per-user queries sorted newest-first
notificationSchema.index({ recipientId: 1, createdAt: -1 });
notificationSchema.index({ recipientRole: 1, createdAt: -1 });  // for "all admins" query

module.exports = mongoose.model('Notification', notificationSchema);
