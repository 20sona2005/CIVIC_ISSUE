/**
 * routes/aadhaarAuth.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Demo Aadhaar Verification — College Project Only.
 * Does NOT connect to UIDAI or any real Aadhaar infrastructure.
 *
 * Endpoints:
 *   POST /api/aadhaar/verify-aadhaar  — validate demo Aadhaar, send OTP
 *   POST /api/aadhaar/verify-otp      — verify OTP, issue JWT
 *   POST /api/aadhaar/resend-otp      — resend OTP (60-second cooldown)
 *   GET  /api/aadhaar/me              — get logged-in demo user (JWT required)
 */

const express  = require('express');
const router   = express.Router();
const crypto   = require('crypto');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');

const DemoUser         = require('../models/DemoUser');
const OtpVerification  = require('../models/OtpVerification');
const { sendOtpEmail, maskEmail } = require('../utils/aadhaarEmail');

// ── Constants ─────────────────────────────────────────────────────────────────
const OTP_EXPIRY_MS    = 5 * 60 * 1000;   // 5 minutes
const OTP_MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN  = 60 * 1000;        // 60 seconds
const JWT_EXPIRY       = '2h';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Cryptographically secure 6-digit OTP */
function generateOtp() {
  return String(crypto.randomInt(100000, 999999));
}

/** JWT signed with server secret */
function signToken(user) {
  return jwt.sign(
    { id: user._id, name: user.name, email: user.email, role: user.role, type: 'aadhaar-demo' },
    process.env.JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

/** Middleware: verify JWT from Authorization header */
function requireAadhaarToken(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided.' });
  }
  try {
    const payload = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    if (payload.type !== 'aadhaar-demo') {
      return res.status(401).json({ success: false, message: 'Invalid token type.' });
    }
    req.demoUser = payload;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Token invalid or expired.' });
  }
}

// ── POST /api/aadhaar/verify-aadhaar ─────────────────────────────────────────
router.post('/verify-aadhaar', async (req, res) => {
  try {
    const { aadhaarNumber } = req.body;

    // 1. Input validation
    if (!aadhaarNumber) {
      return res.status(400).json({ success: false, message: 'Aadhaar number is required.' });
    }
    if (!/^\d{12}$/.test(aadhaarNumber.toString().trim())) {
      return res.status(400).json({
        success: false,
        message: 'Aadhaar number must be exactly 12 digits (numbers only).',
      });
    }

    // 2. Look up demo user in MongoDB
    const user = await DemoUser.findOne({ demoAadhaarNumber: aadhaarNumber.trim() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Aadhaar number not found in demo records. Please use one of the 5 demo numbers.',
      });
    }

    // 3. Invalidate any previous un-verified OTP for this user
    await OtpVerification.deleteMany({ userId: user._id, verified: false });

    // 4. Generate + hash OTP
    const otp       = generateOtp();
    const otpHash   = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);
    const resendAt  = new Date(Date.now() + RESEND_COOLDOWN);

    await OtpVerification.create({ userId: user._id, otpHash, expiresAt, resendAt });

    // 5. Send OTP email via Nodemailer
    try {
      await sendOtpEmail(user.email, user.name, otp);
    } catch (mailErr) {
      console.error('[aadhaarAuth] Email send failed:', mailErr.message);
      return res.status(500).json({
        success: false,
        message: 'Aadhaar verified but failed to send OTP email. Check EMAIL_USER / EMAIL_APP_PASSWORD in .env.',
      });
    }

    // 6. Return success — never include the OTP in the response
    return res.json({
      success: true,
      message: 'Demo Aadhaar verified. OTP sent to your registered email.',
      maskedEmail: maskEmail(user.email),
      userId: user._id,          // needed by frontend to call verify-otp
    });

  } catch (err) {
    console.error('[aadhaarAuth/verify-aadhaar]', err.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

// ── POST /api/aadhaar/verify-otp ─────────────────────────────────────────────
router.post('/verify-otp', async (req, res) => {
  try {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
      return res.status(400).json({ success: false, message: 'userId and otp are required.' });
    }
    if (!/^\d{6}$/.test(otp.toString().trim())) {
      return res.status(400).json({ success: false, message: 'OTP must be exactly 6 digits.' });
    }

    // Find the latest unverified OTP record for this user
    const record = await OtpVerification.findOne({ userId, verified: false })
      .sort({ createdAt: -1 });

    if (!record) {
      return res.status(400).json({
        success: false,
        message: 'No active OTP found. Please request a new OTP.',
      });
    }

    // Check expiry
    if (new Date() > record.expiresAt) {
      await OtpVerification.deleteOne({ _id: record._id });
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.',
      });
    }

    // Check attempt limit
    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      await OtpVerification.deleteOne({ _id: record._id });
      return res.status(429).json({
        success: false,
        message: 'Too many incorrect attempts. Please request a new OTP.',
      });
    }

    // Verify OTP hash
    const isMatch = await bcrypt.compare(otp.toString().trim(), record.otpHash);
    if (!isMatch) {
      record.attempts += 1;
      await record.save();
      const remaining = OTP_MAX_ATTEMPTS - record.attempts;
      return res.status(400).json({
        success: false,
        message: `Incorrect OTP. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`,
      });
    }

    // Mark as verified (prevents replay)
    record.verified = true;
    await record.save();

    // Fetch user and issue JWT
    const user = await DemoUser.findById(userId).select('-__v');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const token = signToken(user);

    return res.json({
      success: true,
      message: 'OTP verified successfully.',
      token,
      user: { id: user._id, name: user.name, role: user.role, maskedAadhaar: user.maskedAadhaar },
    });

  } catch (err) {
    console.error('[aadhaarAuth/verify-otp]', err.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

// ── POST /api/aadhaar/resend-otp ─────────────────────────────────────────────
router.post('/resend-otp', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId is required.' });
    }

    const user = await DemoUser.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Check cooldown on the most recent OTP record
    const latest = await OtpVerification.findOne({ userId, verified: false })
      .sort({ createdAt: -1 });

    if (latest && latest.resendAt && new Date() < latest.resendAt) {
      const waitSecs = Math.ceil((latest.resendAt - Date.now()) / 1000);
      return res.status(429).json({
        success: false,
        message: `Please wait ${waitSecs} second${waitSecs !== 1 ? 's' : ''} before requesting a new OTP.`,
        waitSeconds: waitSecs,
      });
    }

    // Invalidate previous OTPs and issue a fresh one
    await OtpVerification.deleteMany({ userId, verified: false });

    const otp       = generateOtp();
    const otpHash   = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);
    const resendAt  = new Date(Date.now() + RESEND_COOLDOWN);

    await OtpVerification.create({ userId, otpHash, expiresAt, resendAt });

    try {
      await sendOtpEmail(user.email, user.name, otp);
    } catch (mailErr) {
      console.error('[aadhaarAuth/resend-otp] Email failed:', mailErr.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to resend OTP email. Check email credentials in .env.',
      });
    }

    return res.json({
      success: true,
      message: 'New OTP sent to your registered email.',
      maskedEmail: maskEmail(user.email),
    });

  } catch (err) {
    console.error('[aadhaarAuth/resend-otp]', err.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

// ── GET /api/aadhaar/me ───────────────────────────────────────────────────────
router.get('/me', requireAadhaarToken, async (req, res) => {
  try {
    const user = await DemoUser.findById(req.demoUser.id).select('-__v');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    return res.json({
      success: true,
      user: { id: user._id, name: user.name, role: user.role, maskedAadhaar: user.maskedAadhaar },
    });
  } catch (err) {
    console.error('[aadhaarAuth/me]', err.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
