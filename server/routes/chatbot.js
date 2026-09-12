/**
 * routes/chatbot.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Role-aware AI chatbot endpoint.
 *
 * Architecture:
 *   React frontend → POST /api/chatbot/message
 *     → verifyToken (JWT check)
 *     → intent detection (no AI cost for simple queries)
 *     → controlled DB query (only fetch what's needed)
 *     → Gemini API call (only when needed, minimal context)
 *     → response
 *
 * Security guarantees:
 *   - Role is read from the verified JWT payload — never from request body.
 *   - Citizens can only query their own issues (filtered by reportedById).
 *   - Admin DB data is only fetched/returned when role === 'admin'.
 *   - The AI never has direct DB access — it only sees pre-fetched summaries.
 *   - GEMINI_API_KEY lives only in server .env.
 */

const express = require('express');
const router  = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { verifyToken } = require('../middleware/auth');
const Issue   = require('../models/Issue');

// ── Gemini client (lazy — only constructed when a key is present) ─────────────
let geminiClient = null;
function getGemini() {
  if (!geminiClient) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured in .env');
    }
    geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return geminiClient;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const CATEGORIES = ['Pothole', 'Garbage', 'Streetlight', 'Drainage', 'Water Leakage', 'Other'];
const STATUSES   = ['Reported', 'In Progress', 'Resolved'];

// ── Intent detection ──────────────────────────────────────────────────────────
// Returns a string intent key so we can handle simple queries without an AI call.
// Keeps costs low and responses instant for the most common questions.
function detectIntent(message) {
  const m = message.toLowerCase().trim();

  // Greetings
  if (/^(hi|hello|hey|howdy|good\s*(morning|afternoon|evening)|namaste|hii+|helo)[\s!?.]*$/.test(m)) {
    return 'greeting';
  }
  // How to report
  if (/how.*(report|file|submit|create|add|raise|lodge).*(issue|complaint|problem)/.test(m) ||
      /report.*(issue|complaint|problem)/.test(m) ||
      m.includes('how to report') || m.includes('steps to report')) {
    return 'how_to_report';
  }
  // Categories
  if (/categor|type.*issue|kind.*issue|issue.*type|what.*report/.test(m)) {
    return 'categories';
  }
  // Status explanations
  if (/what.*status|status.*mean|explain.*status|status.*explain|reported.*mean|in progress.*mean|resolved.*mean/.test(m)) {
    return 'status_explanation';
  }
  // My issues / my complaints
  if (/my (issue|complaint|report|problem)|issue.*i.*filed|complaint.*i.*filed/.test(m)) {
    return 'my_issues';
  }
  // Admin: stats / counts
  if (/total|count|how many|number of.*(issue|complaint)|statistic|overview|summary/.test(m)) {
    return 'stats';
  }
  // Admin: pending issues
  if (/pending|unresolved|open issue|not resolved|not fixed/.test(m)) {
    return 'pending_issues';
  }
  // Admin: recent issues
  if (/recent|latest|new(est)? issue|last.*issue|just reported/.test(m)) {
    return 'recent_issues';
  }
  // Admin: category breakdown
  if (/category.*(break|count|stat|distribut)|break.*category|which category|most.*report/.test(m)) {
    return 'category_stats';
  }

  return 'general'; // fallback → send to AI
}

// ── DB helpers (fetch only the fields needed) ─────────────────────────────────

async function getCitizenIssues(userId) {
  return Issue.find({ reportedById: userId })
    .select('title category status location createdAt')
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();
}

async function getAdminStats() {
  const [total, statusAgg, categoryAgg] = await Promise.all([
    Issue.countDocuments(),
    Issue.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Issue.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
  ]);

  const byStatus   = { Reported: 0, 'In Progress': 0, Resolved: 0 };
  const byCategory = {};
  statusAgg.forEach(({ _id, count }) => { if (_id in byStatus) byStatus[_id] = count; });
  categoryAgg.forEach(({ _id, count }) => { if (_id) byCategory[_id] = count; });

  return { total, byStatus, byCategory };
}

async function getRecentIssues(limit = 5) {
  return Issue.find()
    .select('title category status location reportedBy createdAt')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}

async function getPendingIssues(limit = 5) {
  return Issue.find({ status: { $ne: 'Resolved' } })
    .select('title category status location reportedBy createdAt')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}

// ── Format helpers (turn DB objects into tidy text for the AI / direct reply) ──

function formatIssueList(issues) {
  if (!issues.length) return 'No issues found.';
  return issues.map((i, idx) => {
    const date = new Date(i.createdAt).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
    return `${idx + 1}. "${i.title}" — ${i.category} | ${i.status} | ${i.location} | ${date}`;
  }).join('\n');
}

function formatStats(stats) {
  const catLines = Object.entries(stats.byCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, n]) => `  • ${cat}: ${n}`)
    .join('\n');
  return (
    `Total issues: ${stats.total}\n` +
    `By status:\n  • Reported: ${stats.byStatus.Reported}\n` +
    `  • In Progress: ${stats.byStatus['In Progress']}\n` +
    `  • Resolved: ${stats.byStatus.Resolved}\n` +
    `By category:\n${catLines}`
  );
}

// ── Direct (no-AI) response builders ──────────────────────────────────────────

function directGreeting(userName, role) {
  const roleNote = role === 'admin'
    ? 'You can ask me about issue statistics, pending complaints, category breakdowns, and recent reports.'
    : 'You can ask me how to report an issue, check your complaint status, or learn about issue categories.';
  return `Hi ${userName}! 👋 I'm the CivicPulse assistant. ${roleNote}`;
}

function directHowToReport() {
  return (
    `Here's how to report a civic issue:\n\n` +
    `1. Click **"Report an Issue"** from the dashboard or the top navigation.\n` +
    `2. Fill in the **title** and **description** of the problem.\n` +
    `3. Choose the **category** (e.g. Pothole, Garbage, Streetlight).\n` +
    `4. Enter the **location** — you can also pin it on the map.\n` +
    `5. Optionally attach a **photo** for faster resolution.\n` +
    `6. Click **Submit** — your issue is now registered!\n\n` +
    `You can track the status of your report from your dashboard anytime.`
  );
}

function directCategories() {
  return (
    `CivicPulse supports these issue categories:\n\n` +
    CATEGORIES.map(c => `• **${c}**`).join('\n') +
    `\n\nChoose the one that best describes your problem when filing a report.`
  );
}

function directStatusExplanation() {
  return (
    `Here's what each status means:\n\n` +
    `• **Reported** — Your issue has been received and is awaiting review by authorities.\n` +
    `• **In Progress** — The concerned department is actively working on it.\n` +
    `• **Resolved** — The issue has been fixed and closed.\n\n` +
    `You'll receive a notification whenever your issue status changes.`
  );
}

// ── Gemini call (only for 'general' intent) ───────────────────────────────────

async function callGemini(userMessage, role, dbContext, recentHistory) {
  const genAI = getGemini();

  // gemini-1.5-flash: fast, cheap, generous free tier
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: {
      maxOutputTokens: 250,   // ~200 words — keeps responses concise
      temperature: 0.4,
    },
  });

  // Build a single system instruction string
  const systemInstruction = role === 'admin'
    ? `You are CivicBot, an assistant for the CivicPulse civic issue management platform.
You are speaking with an ADMIN user.
Help with: issue statistics, pending/resolved counts, category breakdowns, recent reports, dashboard guidance.
Be concise. Use bullet points for lists. Keep replies under 120 words unless more detail is clearly needed.
Never make up data — only refer to the DB context provided below.
${dbContext ? `\nCurrent system data:\n${dbContext}` : ''}`
    : `You are CivicBot, an assistant for the CivicPulse civic issue management platform.
You are speaking with a CITIZEN user named ${role}.
Help with: how to report issues, understanding categories, status explanations, using the platform.
You may reference the user's own complaints if context is provided below.
Be friendly and concise. Keep replies under 100 words unless detail is requested.
Never reveal other users' data. Never discuss admin features.
${dbContext ? `\nThis citizen's recent issues:\n${dbContext}` : ''}`;

  // Gemini uses a "history" array of { role, parts } objects.
  // roles must alternate user/model; we map 'assistant' → 'model'.
  // Only pass the last 4 exchanges to keep token count low.
  const historyForGemini = (recentHistory || [])
    .slice(-4)
    .map(h => ({
      role:  h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }],
    }));

  // Start a chat session with history and a system instruction prepended
  // to the first user turn (Gemini Flash supports systemInstruction natively
  // but passing it as the first history item is the most compatible pattern).
  const chat = model.startChat({
    history: [
      // Inject system context as the opening model "thought"
      { role: 'user',  parts: [{ text: systemInstruction }] },
      { role: 'model', parts: [{ text: 'Understood. I will follow these instructions.' }] },
      ...historyForGemini,
    ],
  });

  const result   = await chat.sendMessage(userMessage);
  const response = result.response;
  return response.text()?.trim() || 'Sorry, I could not generate a response. Please try again.';
}

// ── Main route: POST /api/chatbot/message ─────────────────────────────────────
router.post('/message', verifyToken, async (req, res) => {
  try {
    const { message, history } = req.body;

    // Basic validation
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ message: 'Message is required.' });
    }
    if (message.trim().length > 500) {
      return res.status(400).json({ message: 'Message too long. Please keep it under 500 characters.' });
    }

    // Role and identity come from the verified JWT — never from the client
    const { id: userId, name: userName, role } = req.user;
    const isAdmin = role === 'admin';

    const intent = detectIntent(message.trim());

    // ── Handle intents that never need AI ───────────────────────────────────

    if (intent === 'greeting') {
      return res.json({ reply: directGreeting(userName, role) });
    }

    if (intent === 'how_to_report') {
      if (isAdmin) {
        return res.json({ reply: 'To report an issue, a citizen fills in the Report Issue form with title, category, location, description, and an optional photo. The system checks for duplicates before submission.' });
      }
      return res.json({ reply: directHowToReport() });
    }

    if (intent === 'categories') {
      return res.json({ reply: directCategories() });
    }

    if (intent === 'status_explanation') {
      return res.json({ reply: directStatusExplanation() });
    }

    // ── Citizen: my issues ───────────────────────────────────────────────────
    if (intent === 'my_issues') {
      if (isAdmin) {
        return res.json({ reply: 'As an admin you can view all issues on the Admin Dashboard.' });
      }
      const myIssues = await getCitizenIssues(userId);
      if (!myIssues.length) {
        return res.json({ reply: "You haven't reported any issues yet. Use the **Report an Issue** button on your dashboard to get started!" });
      }
      return res.json({
        reply: `Here are your ${myIssues.length} most recent reports:\n\n${formatIssueList(myIssues)}`,
      });
    }

    // ── Admin-only intents ───────────────────────────────────────────────────
    if (['stats', 'pending_issues', 'recent_issues', 'category_stats'].includes(intent)) {
      if (!isAdmin) {
        return res.status(403).json({ reply: 'That information is only available to admin users.' });
      }

      if (intent === 'stats' || intent === 'category_stats') {
        const stats = await getAdminStats();
        return res.json({ reply: `📊 **System Overview**\n\n${formatStats(stats)}` });
      }

      if (intent === 'pending_issues') {
        const pending = await getPendingIssues(5);
        const stats   = await getAdminStats();
        const openCount = stats.byStatus.Reported + stats.byStatus['In Progress'];
        return res.json({
          reply: `🔴 **Pending Issues (${openCount} total open)**\n\nMost recent 5:\n${formatIssueList(pending)}`,
        });
      }

      if (intent === 'recent_issues') {
        const recent = await getRecentIssues(5);
        return res.json({
          reply: `📋 **5 Most Recent Issues**\n\n${formatIssueList(recent)}`,
        });
      }
    }

    // ── Fallback: send to Gemini with minimal DB context ────────────────────
    // Only fetch DB data that's actually relevant to the role
    let dbContext = null;

    if (isAdmin) {
      // Give admin a fresh stats summary as context
      const stats = await getAdminStats();
      dbContext = formatStats(stats);
    } else {
      // Give citizen only their own recent issues
      const myIssues = await getCitizenIssues(userId);
      if (myIssues.length) {
        dbContext = formatIssueList(myIssues);
      }
    }

    // Pass role label or user name based on role for system prompt personalisation
    const roleLabel = isAdmin ? 'admin' : userName;
    const aiReply = await callGemini(message.trim(), roleLabel, dbContext, history);

    return res.json({ reply: aiReply });

  } catch (err) {
    console.error('[chatbot] error:', err.message);

    // Surface a friendly message for missing API key
    if (err.message.includes('GEMINI_API_KEY')) {
      return res.status(503).json({ reply: 'The AI assistant is not configured yet. Please ask the administrator to set the GEMINI_API_KEY.' });
    }
    // Gemini quota / rate-limit errors
    if (err.status === 429 || err.message?.includes('quota') || err.message?.includes('RESOURCE_EXHAUSTED')) {
      return res.status(429).json({ reply: 'The AI service is temporarily busy. Please wait a moment and try again.' });
    }
    // Gemini auth errors
    if (err.status === 400 && err.message?.includes('API_KEY')) {
      return res.status(503).json({ reply: 'AI service authentication failed. Please contact the administrator.' });
    }

    return res.status(500).json({ reply: 'Something went wrong. Please try again.' });
  }
});

module.exports = router;
