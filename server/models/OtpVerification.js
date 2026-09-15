/**
 * OtpVerification.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Stores hashed OTPs for the Demo Aadhaar verification flow.
 *
 * Security design:
 *  - OTP is NEVER stored in plaintext — only a bcrypt hash is kept.
 *  - TTL index on `expiresAt` auto-deletes expired documents from MongoDB.
 *  - Max 5 verification attempts before the OTP is locked out.
 *  - `verified` flag ensures an OTP cannot be reused after success.
 *  - `resendAt` enforces the 60-second resend cooldown.
 */

const mongoose = require('mongoose');

const otpVerificationSchema = new mongoose.Schema(
  {
    // Reference to the DemoUser who requested this OTP
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DemoUser',
      required: true,
    },

    // bcrypt hash of the 6-digit OTP — never store plaintext
    otpHash: {
      type: String,
      required: true,
    },

    // Hard expiry timestamp — MongoDB TTL index deletes the doc automatically
    expiresAt: {
      type: Date,
      required: true,
    },

    // Number of failed verification attempts (max 5)
    attempts: {
      type: Number,
      default: 0,
    },

    // Becomes true after a correct OTP is submitted — prevents replay
    verified: {
      type: Boolean,
      default: false,
    },

    // Earliest time a resend is allowed (30-second cooldown enforced here)
    resendAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// TTL index — MongoDB background task removes documents once expiresAt passes
otpVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound index for fast lookup by userId
otpVerificationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('OtpVerification', otpVerificationSchema);
