/**
 * DemoUser.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Mongoose model for the 5 dummy Aadhaar demo users.
 * This is a SEPARATE collection from the main User model so the existing
 * citizen/admin auth flow is completely unaffected.
 *
 * DISCLAIMER: This model simulates Aadhaar verification for an academic
 * college-project prototype. It does NOT connect to UIDAI or any real
 * Aadhaar infrastructure. All Aadhaar numbers are fictional demo values.
 */

const mongoose = require('mongoose');

const demoUserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // 12-digit dummy Aadhaar number — stored as a string to preserve leading zeros
    demoAadhaarNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: [/^\d{12}$/, 'Aadhaar number must be exactly 12 digits'],
    },

    // Project-controlled email — OTP is delivered here via Nodemailer
    // Multiple demo users can share the same inbox for demo convenience
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    role: {
      type: String,
      enum: ['citizen', 'admin'],
      default: 'citizen',
    },

    // The Aadhaar number is masked for display (e.g. XXXX-XXXX-3333)
    maskedAadhaar: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

// Auto-generate maskedAadhaar before every save
demoUserSchema.pre('save', function (next) {
  if (this.demoAadhaarNumber) {
    const n = this.demoAadhaarNumber;
    this.maskedAadhaar = `XXXX-XXXX-${n.slice(-4)}`;
  }
  next();
});

module.exports = mongoose.model('DemoUser', demoUserSchema);
