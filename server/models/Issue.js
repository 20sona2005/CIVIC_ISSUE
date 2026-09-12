const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: ['Pothole', 'Garbage', 'Streetlight', 'Drainage', 'Water Leakage', 'Other'],
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    coords: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    image: {
      type: String,   // stores filename of uploaded image
      default: null,
    },
    reportedBy: {
      type: String,   // stores the user's display name
      required: true,
    },
    // ObjectId reference to the User who reported — used for notifications
    // Optional so existing issues without it still work
    reportedById: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    status: {
      type: String,
      enum: ['Reported', 'In Progress', 'Resolved'],
      default: 'Reported',
    },

    // ── Duplicate Detection Fields ──────────────────────────────────────────

    // Number of citizens who have "supported" (upvoted) this issue
    supportCount: {
      type: Number,
      default: 0,
    },

    // Array of user IDs (or names) who have supported this issue
    // Prevents the same user from supporting more than once
    supportedBy: {
      type: [String],
      default: [],
    },

    // If this issue is flagged as a duplicate, reference the original issue
    duplicateOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Issue',
      default: null,
    },

    // Confidence score (0–1) that this is a duplicate of duplicateOf
    duplicateConfidence: {
      type: Number,
      min: 0,
      max: 1,
      default: null,
    },

    // Whether this issue was marked as a potential duplicate at creation time
    isDuplicate: {
      type: Boolean,
      default: false,
    },

    // ── Citizen Feedback Fields ───────────────────────────────────────────────
    // Collected after status reaches "Resolved" via the feedback endpoint.

    // Did the citizen confirm the issue was actually resolved?
    // null  = feedback not yet submitted
    // true  = citizen confirmed resolution
    // false = citizen said NOT resolved → triggers escalation workflow
    wasResolved: {
      type: Boolean,
      default: null,
    },

    // Star rating 1–5 (only set when wasResolved === true)
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },

    // Free-text improvement comment
    feedbackComment: {
      type: String,
      trim: true,
      default: null,
    },

    // Timestamp when feedback was first submitted
    feedbackAt: {
      type: Date,
      default: null,
    },

    // ── Escalation Fields ─────────────────────────────────────────────────────
    // Set automatically when citizen reports the issue is NOT resolved.

    // Whether this issue has been escalated to a supervisor
    isEscalated: {
      type: Boolean,
      default: false,
    },

    // Timestamp when escalation was triggered
    escalatedAt: {
      type: Date,
      default: null,
    },

    // Why it was escalated ("Citizen reported issue not resolved")
    escalationReason: {
      type: String,
      trim: true,
      default: null,
    },

    // Internal note added by supervisor / admin after reviewing escalation
    supervisorNote: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Issue', issueSchema);
