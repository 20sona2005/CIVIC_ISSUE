/**
 * notificationHelper.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Central module for creating and emitting notifications.
 * All notification creation goes through this file — routes never touch
 * the Notification model directly.
 *
 * Usage pattern in routes:
 *   const { notifyAdmins, notifyUser } = require('../utils/notificationHelper');
 *   await notifyAdmins(io, issue, reporterName);
 *   await notifyUser(io, issue, oldStatus, newStatus, adminName);
 *
 * Socket.IO rooms
 * ───────────────
 *  • Each logged-in user joins a personal room: "user:<userId>"
 *  • All admins also join a shared room:         "role:admin"
 * Events emitted:
 *  • "notification:new"  — payload: the saved Notification document
 */

const Notification = require('../models/Notification');
const User         = require('../models/User');

// ── Message templates ────────────────────────────────────────────────────────

function newIssueTitle() {
  return '🔔 New Civic Issue Reported';
}

function newIssueMessage(issue, reporterName) {
  const date = new Date(issue.createdAt || Date.now()).toLocaleString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
  return (
    `Problem: ${issue.title}\n` +
    `Category: ${issue.category}\n` +
    `Reported By: ${reporterName}\n` +
    `Location: ${issue.location}\n` +
    `Reported On: ${date}`
  );
}

function statusUpdateTitle(newStatus) {
  if (newStatus === 'Resolved')    return '✅ Your Issue Has Been Resolved';
  if (newStatus === 'In Progress') return '🔄 Your Issue Is Now In Progress';
  if (newStatus === 'Reported')    return '🔁 Your Issue Has Been Reopened';
  return '📋 Your Issue Status Changed';
}

function statusUpdateMessage(issue, newStatus) {
  const date = new Date().toLocaleString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
  if (newStatus === 'Resolved') {
    return (
      `Good news! Your reported issue "${issue.title}" has been marked as resolved ` +
      `by the concerned authority.\n` +
      `Status: Resolved\nUpdated On: ${date}\n\n` +
      `Please verify the resolution and provide feedback if required.`
    );
  }
  if (newStatus === 'In Progress') {
    return (
      `Your reported issue "${issue.title}" is now being processed by the concerned authority.\n` +
      `Status: In Progress\nUpdated On: ${date}`
    );
  }
  if (newStatus === 'Reported') {
    return (
      `Your issue "${issue.title}" has been reopened for further review.\n` +
      `Status: Reported\nUpdated On: ${date}`
    );
  }
  return `Your issue "${issue.title}" status changed to ${newStatus}.\nUpdated On: ${date}`;
}

function notifType(newStatus) {
  if (newStatus === 'Resolved')    return 'ISSUE_RESOLVED';
  if (newStatus === 'Reported')    return 'ISSUE_REOPENED';
  return 'STATUS_UPDATE';
}

// ── Helper: find all admin user docs ────────────────────────────────────────
async function getAllAdmins() {
  return User.find({ role: 'admin' }).select('_id name').lean();
}

// ── Helper: find a citizen by ObjectId (preferred) or name string (fallback) ──
async function findCitizenForIssue(issue) {
  // Primary: use the stored ObjectId reference (set since the fix)
  if (issue.reportedById) {
    const user = await User.findById(issue.reportedById).select('_id name role').lean();
    if (user) return user;
  }
  // Fallback: case-insensitive name search
  const name = (issue.reportedBy || '').trim();
  if (!name) return null;
  return User.findOne({
    name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
    role: 'citizen',
  }).select('_id name').lean();
}

// ── Core: save + emit one notification ───────────────────────────────────────
async function saveAndEmit(io, notifData) {
  const notif = await Notification.create(notifData);

  if (io) {
    // Personal room — always emit
    if (notifData.recipientId) {
      io.to(`user:${notifData.recipientId}`).emit('notification:new', notif);
    }
    // Broadcast room for admins
    if (notifData.recipientRole === 'admin') {
      io.to('role:admin').emit('notification:new', notif);
    }
  }

  return notif;
}

// ── PUBLIC: notify all admins that a new issue was reported ──────────────────
/**
 * @param {object} io        — Socket.IO server instance (may be null in tests)
 * @param {object} issue     — Mongoose Issue document (just created)
 * @param {string} reporterName — display name of the citizen
 */
async function notifyAdmins(io, issue, reporterName) {
  try {
    const admins = await getAllAdmins();
    if (!admins.length) return;   // no admins registered yet

    const baseData = {
      recipientRole: 'admin',
      type:          'NEW_ISSUE',
      title:         newIssueTitle(),
      message:       newIssueMessage(issue, reporterName),
      issueId:       issue._id,
      issueTitle:    issue.title,
      issueCategory: issue.category,
      issueLocation: issue.location,
      triggeredBy:   reporterName,
    };

    // One notification document per admin so each can mark it read independently
    const promises = admins.map(admin =>
      saveAndEmit(io, {
        ...baseData,
        recipientId:   admin._id,
        recipientName: admin.name,
      })
    );

    await Promise.all(promises);
  } catch (err) {
    // Never crash the main request because of a notification failure
    console.error('[notifyAdmins] error:', err.message);
  }
}

// ── PUBLIC: notify the citizen who owns an issue when status changes ─────────
/**
 * @param {object} io        — Socket.IO server instance
 * @param {object} issue     — Mongoose Issue document (after update)
 * @param {string} oldStatus — previous status value
 * @param {string} newStatus — new status value
 * @param {string} adminName — display name of the admin who made the change
 */
async function notifyIssueReporter(io, issue, oldStatus, newStatus, adminName) {
  try {
    if (oldStatus === newStatus) return;

    // Look up citizen by ObjectId first, then name fallback
    const citizen = await findCitizenForIssue(issue);
    if (!citizen) {
      console.warn(`[notifyIssueReporter] No citizen found for issue "${issue.title}" (reportedBy="${issue.reportedBy}", reportedById=${issue.reportedById})`);
      return;
    }

    await saveAndEmit(io, {
      recipientId:   citizen._id,
      recipientName: citizen.name,
      recipientRole: 'citizen',
      type:          notifType(newStatus),
      title:         statusUpdateTitle(newStatus),
      message:       statusUpdateMessage(issue, newStatus),
      issueId:       issue._id,
      issueTitle:    issue.title,
      issueCategory: issue.category,
      issueLocation: issue.location,
      triggeredBy:   adminName || 'Authority',
    });
  } catch (err) {
    console.error('[notifyIssueReporter] error:', err.message);
  }
}

module.exports = { notifyAdmins, notifyIssueReporter };
