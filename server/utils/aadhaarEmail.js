/**
 * aadhaarEmail.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Nodemailer helper — sends OTP emails for the Demo Aadhaar auth flow.
 * Credentials come exclusively from environment variables.
 *
 * Gmail setup:
 *   1. Enable 2-Step Verification on your Google account.
 *   2. Visit https://myaccount.google.com/apppasswords
 *   3. Create an App Password for "Mail".
 *   4. Set EMAIL_USER and EMAIL_APP_PASSWORD in server/.env
 */

const nodemailer = require('nodemailer');

// ── Lazy transporter — constructed once on first use ─────────────────────────
let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;

  if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
    throw new Error(
      'EMAIL_USER and EMAIL_APP_PASSWORD must be set in server/.env'
    );
  }

  _transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER.trim(),
      pass: process.env.EMAIL_APP_PASSWORD.trim(),
    },
  });

  return _transporter;
}

// ── Mask email for display (e.g. sh***a@gmail.com) ───────────────────────────
function maskEmail(email) {
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local.slice(0, 2)}${'*'.repeat(Math.min(local.length - 2, 4))}@${domain}`;
}

// ── Send OTP email ────────────────────────────────────────────────────────────
/**
 * @param {string} toEmail   - recipient email address
 * @param {string} userName  - recipient display name
 * @param {string} otp       - plaintext 6-digit OTP (NOT the hash)
 * @param {number} expiryMins - expiry window in minutes (default 5)
 */
async function sendOtpEmail(toEmail, userName, otp, expiryMins = 5) {
  const transporter = getTransporter();

  const subject = 'Civic Issue Management System - OTP Verification';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>OTP Verification</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0"
          style="background:#ffffff;border-radius:12px;overflow:hidden;
                 box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e3a8a,#2563eb);
                        padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;
                          font-weight:700;letter-spacing:-0.3px;">
                🏛️ Civic Issue Management System
              </h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.78);
                         font-size:13px;">
                Demo Aadhaar Verification — Academic Project
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 6px;font-size:15px;color:#374151;">
                Hello, <strong>${userName}</strong>
              </p>
              <p style="margin:0 0 28px;font-size:14px;color:#6b7280;
                          line-height:1.6;">
                Your One-Time Password (OTP) for Demo Aadhaar verification is:
              </p>

              <!-- OTP Box -->
              <div style="background:#eff6ff;border:2px dashed #2563eb;
                           border-radius:10px;padding:24px;text-align:center;
                           margin-bottom:28px;">
                <span style="font-size:42px;font-weight:800;letter-spacing:14px;
                              color:#1e3a8a;font-family:monospace;">
                  ${otp}
                </span>
              </div>

              <!-- Expiry notice -->
              <div style="background:#fef3c7;border-left:4px solid #f59e0b;
                           border-radius:6px;padding:12px 16px;margin-bottom:24px;">
                <p style="margin:0;font-size:13px;color:#92400e;font-weight:600;">
                  ⏰ This OTP expires in <strong>${expiryMins} minutes</strong>.
                  Do not share it with anyone.
                </p>
              </div>

              <p style="margin:0 0 8px;font-size:13px;color:#6b7280;
                          line-height:1.6;">
                If you did not request this OTP, please ignore this email.
              </p>
            </td>
          </tr>

          <!-- Disclaimer -->
          <tr>
            <td style="background:#f9fafb;padding:20px 40px;
                        border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:11px;color:#9ca3af;
                          text-align:center;line-height:1.6;">
                ⚠️ <strong>ACADEMIC PROJECT NOTICE:</strong> This is a
                simulated Demo Aadhaar verification built for a college
                final-year project. It does <strong>NOT</strong> connect
                to UIDAI or any real Aadhaar infrastructure. All Aadhaar
                numbers used are fictional demo values.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text =
    `Civic Issue Management System — OTP Verification\n\n` +
    `Hello ${userName},\n\n` +
    `Your Demo Aadhaar verification OTP is: ${otp}\n\n` +
    `This OTP expires in ${expiryMins} minutes.\n\n` +
    `DISCLAIMER: This is a simulated verification for an academic ` +
    `college-project prototype. It does NOT connect to UIDAI.\n`;

  await transporter.sendMail({
    from: `"Civic Issue Management System" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject,
    text,
    html,
  });
}

module.exports = { sendOtpEmail, maskEmail };
