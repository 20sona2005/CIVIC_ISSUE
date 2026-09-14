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

  // Greetings — English and Tamil
  if (/^(hi|hello|hey|howdy|good\s*(morning|afternoon|evening)|namaste|hii+|helo)[\s!?.]*$/.test(m) ||
      /^(வணக்கம்|ஹலோ|நமஸ்தே|வணக்கம்|ஹாய்)[\s!?.]*$/.test(message.trim())) {
    return 'greeting';
  }
  // How to report — English and Tamil
  if (/how.*(report|file|submit|create|add|raise|lodge).*(issue|complaint|problem)/.test(m) ||
      /report.*(issue|complaint|problem)/.test(m) ||
      m.includes('how to report') || m.includes('steps to report') ||
      message.includes('எப்படி தெரிவிப்பது') || message.includes('புகார் செய்வது') ||
      message.includes('பிரச்னை தெரிவி')) {
    return 'how_to_report';
  }
  // Categories — English and Tamil
  if (/categor|type.*issue|kind.*issue|issue.*type|what.*report/.test(m) ||
      message.includes('வகை') || message.includes('வகைகள்')) {
    return 'categories';
  }
  // Status explanations — English and Tamil
  if (/what.*status|status.*mean|explain.*status|status.*explain|reported.*mean|in progress.*mean|resolved.*mean/.test(m) ||
      message.includes('நிலை') || message.includes('நிலைகள்') ||
      message.includes('செயலில்') || message.includes('தீர்க்கப்பட்டது')) {
    return 'status_explanation';
  }
  // My issues — English and Tamil
  if (/my (issue|complaint|report|problem)|issue.*i.*filed|complaint.*i.*filed/.test(m) ||
      message.includes('என் புகார்') || message.includes('என்னுடைய') ||
      message.includes('சமீபத்திய புகார்')) {
    return 'my_issues';
  }
  // Admin: stats — English and Tamil
  if (/total|count|how many|number of.*(issue|complaint)|statistic|overview|summary/.test(m) ||
      message.includes('கண்ணோட்டம்') || message.includes('புள்ளிவிவரம்') ||
      message.includes('மொத்தம்')) {
    return 'stats';
  }
  // Admin: pending — English and Tamil
  if (/pending|unresolved|open issue|not resolved|not fixed/.test(m) ||
      message.includes('நிலுவை') || message.includes('தீர்க்கப்படாத')) {
    return 'pending_issues';
  }
  // Admin: recent — English and Tamil
  if (/recent|latest|new(est)? issue|last.*issue|just reported/.test(m) ||
      message.includes('சமீபத்திய') || message.includes('புதிய பிரச்னை')) {
    return 'recent_issues';
  }
  // Admin: category breakdown — English and Tamil
  if (/category.*(break|count|stat|distribut)|break.*category|which category|most.*report/.test(m) ||
      message.includes('வகை வாரியான') || message.includes('வகை பிரிவு')) {
    return 'category_stats';
  }

  return 'general';
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
// Each function accepts an optional `lang` ('ta' | 'en') and returns the
// response in that language. English is the fallback for any unknown value.

function directGreeting(userName, role, lang) {
  if (lang === 'ta') {
    const roleNote = role === 'admin'
      ? 'பிரச்னை புள்ளிவிவரங்கள், நிலுவை புகார்கள், வகை விவரங்கள் மற்றும் சமீபத்திய அறிக்கைகள் பற்றி கேளுங்கள்.'
      : 'பிரச்னையை எப்படி தெரிவிப்பது, புகார் நிலை சரிபார்க்க, அல்லது பிரச்னை வகைகள் பற்றி கேளுங்கள்.';
    return `வணக்கம் ${userName}! 👋 நான் சிவிக்போட். ${roleNote}`;
  }
  const roleNote = role === 'admin'
    ? 'You can ask me about issue statistics, pending complaints, category breakdowns, and recent reports.'
    : 'You can ask me how to report an issue, check your complaint status, or learn about issue categories.';
  return `Hi ${userName}! 👋 I'm the CivicPulse assistant. ${roleNote}`;
}

function directHowToReport(lang) {
  if (lang === 'ta') {
    return (
      `குடிமை பிரச்னையை எப்படி தெரிவிப்பது:\n\n` +
      `1. டாஷ்போர்டு அல்லது மேல் மெனுவில் **"பிரச்னை தெரிவி"** என்பதை கிளிக் செய்யவும்.\n` +
      `2. பிரச்னையின் **தலைப்பு** மற்றும் **விவரம்** நிரப்பவும்.\n` +
      `3. **வகை** தேர்ந்தெடுக்கவும் (எ.கா. குழி, குப்பை, தெரு விளக்கு).\n` +
      `4. **இடத்தை** உள்ளிடவும் — வரைபடத்திலும் குறிக்கலாம்.\n` +
      `5. விரும்பினால் **புகைப்படம்** இணைக்கவும் — விரைவில் தீர்வு கிடைக்கும்.\n` +
      `6. **சமர்ப்பி** கிளிக் செய்யவும் — உங்கள் புகார் பதிவாகிவிட்டது!\n\n` +
      `டாஷ்போர்டிலிருந்து எந்நேரமும் உங்கள் புகாரின் நிலையை கண்காணிக்கலாம்.`
    );
  }
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

function directCategories(lang) {
  if (lang === 'ta') {
    const tamilCats = {
      'Pothole': 'குழி', 'Garbage': 'குப்பை', 'Streetlight': 'தெரு விளக்கு',
      'Drainage': 'வடிகால்', 'Water Leakage': 'நீர் கசிவு', 'Other': 'மற்றவை',
    };
    return (
      `சிவிக்பல்ஸ் இந்த வகை பிரச்னைகளை ஆதரிக்கிறது:\n\n` +
      CATEGORIES.map(c => `• **${tamilCats[c] || c}**`).join('\n') +
      `\n\nபுகாரில் உங்கள் பிரச்னைக்கு மிகவும் பொருத்தமான வகையை தேர்ந்தெடுக்கவும்.`
    );
  }
  return (
    `CivicPulse supports these issue categories:\n\n` +
    CATEGORIES.map(c => `• **${c}**`).join('\n') +
    `\n\nChoose the one that best describes your problem when filing a report.`
  );
}

function directStatusExplanation(lang) {
  if (lang === 'ta') {
    return (
      `ஒவ்வொரு நிலையும் என்னவென்று அறிந்துகொள்ளுங்கள்:\n\n` +
      `• **புகாரளிக்கப்பட்டது** — உங்கள் பிரச்னை பெறப்பட்டது, அதிகாரிகளின் மதிப்பாய்வுக்காக காத்திருக்கிறது.\n` +
      `• **செயலில் உள்ளது** — சம்பந்தப்பட்ட துறை தீவிரமாக பணியில் உள்ளது.\n` +
      `• **தீர்க்கப்பட்டது** — பிரச்னை சரிசெய்யப்பட்டு மூடப்பட்டது.\n\n` +
      `உங்கள் பிரச்னையின் நிலை மாறும்போதெல்லாம் அறிவிப்பு வரும்.`
    );
  }
  return (
    `Here's what each status means:\n\n` +
    `• **Reported** — Your issue has been received and is awaiting review by authorities.\n` +
    `• **In Progress** — The concerned department is actively working on it.\n` +
    `• **Resolved** — The issue has been fixed and closed.\n\n` +
    `You'll receive a notification whenever your issue status changes.`
  );
}

// ── Gemini call (only for 'general' intent) ───────────────────────────────────

async function callGemini(userMessage, role, dbContext, recentHistory, lang) {
  const genAI = getGemini();

  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: {
      maxOutputTokens: 250,
      temperature: 0.4,
    },
  });

  // Language instruction injected at the top of every system prompt
  const langInstruction = lang === 'ta'
    ? 'பயனர் தேர்ந்தெடுத்த மொழி தமிழ். அனைத்து பதில்களையும் தெளிவாகவும் இயல்பாகவும் தமிழிலேயே அளிக்கவும். ஆங்கிலத்தில் மொழிபெயர்க்க வேண்டாம்.'
    : 'Respond in clear, helpful English.';

  const systemInstruction = role === 'admin'
    ? `You are CivicBot, an assistant for the CivicPulse civic issue management platform.
You are speaking with an ADMIN user.
${langInstruction}
Help with: issue statistics, pending/resolved counts, category breakdowns, recent reports, dashboard guidance.
Be concise. Use bullet points for lists. Keep replies under 120 words unless more detail is clearly needed.
Never make up data — only refer to the DB context provided below.
${dbContext ? `\nCurrent system data:\n${dbContext}` : ''}`
    : `You are CivicBot, an assistant for the CivicPulse civic issue management platform.
You are speaking with a CITIZEN user named ${role}.
${langInstruction}
Help with: how to report issues, understanding categories, status explanations, using the platform.
You may reference the user's own complaints if context is provided below.
Be friendly and concise. Keep replies under 100 words unless detail is requested.
Never reveal other users' data. Never discuss admin features.
${dbContext ? `\nThis citizen's recent issues:\n${dbContext}` : ''}`;

  const historyForGemini = (recentHistory || [])
    .slice(-4)
    .map(h => ({
      role:  h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }],
    }));

  const chat = model.startChat({
    history: [
      { role: 'user',  parts: [{ text: systemInstruction }] },
      { role: 'model', parts: [{ text: 'Understood. I will follow these instructions.' }] },
      ...historyForGemini,
    ],
  });

  const result   = await chat.sendMessage(userMessage);
  const response = result.response;
  const fallback = lang === 'ta'
    ? 'மன்னிக்கவும், பதில் உருவாக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.'
    : 'Sorry, I could not generate a response. Please try again.';
  return response.text()?.trim() || fallback;
}

// ── Main route: POST /api/chatbot/message ─────────────────────────────────────
router.post('/message', verifyToken, async (req, res) => {
  try {
    const { message, history, lang } = req.body;

    // Basic validation
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ message: 'Message is required.' });
    }
    if (message.trim().length > 500) {
      return res.status(400).json({ message: 'Message too long. Please keep it under 500 characters.' });
    }

    // Sanitise lang — accept only 'en' or 'ta', default to 'en'
    const safeLang = lang === 'ta' ? 'ta' : 'en';

    // Role and identity come from the verified JWT — never from the client
    const { id: userId, name: userName, role } = req.user;
    const isAdmin = role === 'admin';

    const intent = detectIntent(message.trim());

    // ── Handle intents that never need AI ───────────────────────────────────

    if (intent === 'greeting') {
      return res.json({ reply: directGreeting(userName, role, safeLang) });
    }

    if (intent === 'how_to_report') {
      if (isAdmin) {
        const adminReply = safeLang === 'ta'
          ? 'குடிமகன் ஒருவர் Report Issue படிவத்தில் தலைப்பு, வகை, இடம், விவரம் மற்றும் புகைப்படம் (விரும்பினால்) நிரப்பி சமர்ப்பிக்கலாம். சமர்ப்பிக்கும் முன் நகல் கண்டறிதல் தானாக நடைபெறும்.'
          : 'To report an issue, a citizen fills in the Report Issue form with title, category, location, description, and an optional photo. The system checks for duplicates before submission.';
        return res.json({ reply: adminReply });
      }
      return res.json({ reply: directHowToReport(safeLang) });
    }

    if (intent === 'categories') {
      return res.json({ reply: directCategories(safeLang) });
    }

    if (intent === 'status_explanation') {
      return res.json({ reply: directStatusExplanation(safeLang) });
    }

    // ── Citizen: my issues ───────────────────────────────────────────────────
    if (intent === 'my_issues') {
      if (isAdmin) {
        const reply = safeLang === 'ta'
          ? 'நிர்வாகியாக நீங்கள் நிர்வாக டாஷ்போர்டில் அனைத்து பிரச்னைகளையும் காணலாம்.'
          : 'As an admin you can view all issues on the Admin Dashboard.';
        return res.json({ reply });
      }
      const myIssues = await getCitizenIssues(userId);
      if (!myIssues.length) {
        const reply = safeLang === 'ta'
          ? 'இன்னும் எந்த பிரச்னையும் தெரிவிக்கவில்லை. டாஷ்போர்டில் **"பிரச்னை தெரிவி"** பொத்தானை கிளிக் செய்து தொடங்குங்கள்!'
          : "You haven't reported any issues yet. Use the **Report an Issue** button on your dashboard to get started!";
        return res.json({ reply });
      }
      const header = safeLang === 'ta'
        ? `உங்கள் சமீபத்திய ${myIssues.length} புகார்கள்:\n\n`
        : `Here are your ${myIssues.length} most recent reports:\n\n`;
      return res.json({ reply: header + formatIssueList(myIssues) });
    }

    // ── Admin-only intents ───────────────────────────────────────────────────
    if (['stats', 'pending_issues', 'recent_issues', 'category_stats'].includes(intent)) {
      if (!isAdmin) {
        const reply = safeLang === 'ta'
          ? 'இந்த தகவல் நிர்வாக பயனர்களுக்கு மட்டுமே கிடைக்கும்.'
          : 'That information is only available to admin users.';
        return res.status(403).json({ reply });
      }

      if (intent === 'stats' || intent === 'category_stats') {
        const stats = await getAdminStats();
        const header = safeLang === 'ta' ? '📊 **கணினி கண்ணோட்டம்**\n\n' : '📊 **System Overview**\n\n';
        return res.json({ reply: header + formatStats(stats) });
      }

      if (intent === 'pending_issues') {
        const pending = await getPendingIssues(5);
        const stats   = await getAdminStats();
        const openCount = stats.byStatus.Reported + stats.byStatus['In Progress'];
        const header = safeLang === 'ta'
          ? `🔴 **நிலுவை பிரச்னைகள் (மொத்தம் ${openCount} திறந்த)**\n\nசமீபத்திய 5:\n`
          : `🔴 **Pending Issues (${openCount} total open)**\n\nMost recent 5:\n`;
        return res.json({ reply: header + formatIssueList(pending) });
      }

      if (intent === 'recent_issues') {
        const recent = await getRecentIssues(5);
        const header = safeLang === 'ta'
          ? '📋 **5 சமீபத்திய பிரச்னைகள்**\n\n'
          : '📋 **5 Most Recent Issues**\n\n';
        return res.json({ reply: header + formatIssueList(recent) });
      }
    }

    // ── Fallback: send to Gemini with minimal DB context ────────────────────
    let dbContext = null;

    if (isAdmin) {
      const stats = await getAdminStats();
      dbContext = formatStats(stats);
    } else {
      const myIssues = await getCitizenIssues(userId);
      if (myIssues.length) {
        dbContext = formatIssueList(myIssues);
      }
    }

    const roleLabel = isAdmin ? 'admin' : userName;
    const aiReply = await callGemini(message.trim(), roleLabel, dbContext, history, safeLang);

    return res.json({ reply: aiReply });

  } catch (err) {
    console.error('[chatbot] error:', err.message);

    if (err.message.includes('GEMINI_API_KEY')) {
      return res.status(503).json({ reply: 'The AI assistant is not configured yet. Please ask the administrator to set the GEMINI_API_KEY.' });
    }
    if (err.status === 429 || err.message?.includes('quota') || err.message?.includes('RESOURCE_EXHAUSTED')) {
      return res.status(429).json({ reply: 'The AI service is temporarily busy. Please wait a moment and try again.' });
    }
    if (err.status === 400 && err.message?.includes('API_KEY')) {
      return res.status(503).json({ reply: 'AI service authentication failed. Please contact the administrator.' });
    }

    return res.status(500).json({ reply: 'Something went wrong. Please try again.' });
  }
});

// ── Description Assistant: POST /api/chatbot/assist-description ───────────────
// Accepts a raw civic issue description and returns an improved version.
// Preserves the user's facts — only improves grammar, clarity, and tone.
// Never exposed to the client — API key stays on the server.
router.post('/assist-description', verifyToken, async (req, res) => {
  try {
    const { description, lang } = req.body;

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return res.status(400).json({ message: 'Description is required.' });
    }
    if (description.trim().length > 1000) {
      return res.status(400).json({ message: 'Description too long.' });
    }

    const isTamil = lang === 'ta';

    const prompt = isTamil
      ? `நீங்கள் ஒரு குடிமை புகார் எழுத்தாளர். கீழே உள்ள உள்ளீடு ஆங்கிலம், தமிழ் அல்லது Tanglish-ல் இருக்கலாம் — எந்த மொழியிலும் இருந்தாலும் பரவாயில்லை.

உங்கள் பணி:
- உள்ளீடு குறுகியதாகவோ தெளிவற்றதாகவோ இருந்தால், அதை ஒரு முழுமையான, தெளிவான குடிமை புகார் விவரணையாக விரிவுபடுத்துங்கள்
- உள்ளீடு ஏற்கனவே விரிவாக இருந்தால், இலக்கணம் மற்றும் தெளிவை மட்டும் சரிசெய்யுங்கள்
- அரசு அதிகாரிகளுக்கு ஏற்ற தொனியில் எழுதுங்கள்
- பயனர் குறிப்பிட்ட இடம், பிரச்னை வகை, தாக்கம் ஆகியவற்றை அப்படியே வைக்கவும்
- இடம், தேதி, நபர், அளவு போன்ற புதிய தகவல்களை கற்பனையாக சேர்க்காதீர்கள்
- **பதில் தமிழிலேயே இருக்க வேண்டும்** — உள்ளீடு ஆங்கிலத்தில் இருந்தாலும் சரி
- வெறும் மேம்படுத்தப்பட்ட விவரணையை மட்டும் திருப்பி அனுப்புங்கள்

எடுத்துக்காட்டுகள்:
உள்ளீடு: "water problem" → வெளியீடு: "தண்ணீர் கசிவு ஏற்பட்டு தண்ணீர் வீணாகி, சுற்றியுள்ள பகுதிக்கு பாதிப்பு ஏற்படுகிறது."
உள்ளீடு: "road problem" → வெளியீடு: "சாலையில் சேதம் மற்றும் பள்ளங்கள் ஏற்பட்டு, வாகன ஓட்டிகள் மற்றும் பாதசாரிகளுக்கு சிரமம் ஏற்படுகிறது."
உள்ளீடு: "குப்பை பிரச்னை" → வெளியீடு: "அப்பகுதியில் குப்பைகள் தேங்கி, முறையான குப்பை சேகரிப்பு இல்லாததால் சுகாதார பாதிப்பு ஏற்படுகிறது."

உள்ளீடு:
"${description.trim()}"`
      : `You are a civic complaint writing assistant. The input may be in English, Tamil, or Tanglish — always respond in English regardless.

Your task:
- If the input is short or vague, EXPAND it into a clear, complete civic complaint description
- If the input is already detailed, improve grammar, clarity, and tone only
- Use formal language suitable for a civic authority complaint
- Preserve any facts the user mentioned: location, problem type, impact
- Do NOT invent new facts such as exact location, date, person, measurement, or cause
- Output language MUST be English regardless of input language
- Return ONLY the improved description text, no labels or explanations

Examples:
Input: "water problem" → Output: "Water leakage is occurring in the area, causing water wastage and affecting the surrounding locality."
Input: "road problem" → Output: "The road is in poor condition with potholes and surface damage, causing difficulty for vehicles and pedestrians."
Input: "garbage problem" → Output: "Garbage is accumulating in the area due to irregular waste collection, creating an unhygienic environment."
Input: "தண்ணீர் பிரச்னை" → Output: "Water leakage is occurring in the area, causing water wastage and affecting the surrounding locality."

Input:
"${description.trim()}"`;

    const genAI = getGemini();
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        maxOutputTokens: 300,
        temperature: 0.3,
      },
    });

    const result   = await model.generateContent(prompt);
    const improved = result.response.text()?.trim();

    if (!improved) {
      return res.status(500).json({ message: 'AI returned an empty response.' });
    }

    // Strip surrounding quotes if Gemini wrapped the text in them
    const clean = improved.replace(/^["'"']+|["'"']+$/gu, '').trim();

    return res.json({ improved: clean });

  } catch (err) {
    console.error('[assist-description] error:', err.message);

    if (err.message?.includes('GEMINI_API_KEY')) {
      return res.status(503).json({ message: 'AI service is not configured.' });
    }
    if (err.status === 429 || err.message?.includes('quota') || err.message?.includes('RESOURCE_EXHAUSTED')) {
      return res.status(429).json({ message: 'AI service is temporarily busy. Please try again shortly.' });
    }
    return res.status(500).json({ message: 'AI assist failed. Please try again.' });
  }
});

// ── Search Query Enhancer: POST /api/chatbot/enhance-search ──────────────────
// Takes a short user search query and returns an improved version.
// Corrects typos, clarifies intent, and stays in the requested language.
router.post('/enhance-search', verifyToken, async (req, res) => {
  try {
    const { query, lang } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({ message: 'Query is required.' });
    }
    if (query.trim().length > 1000) {
      return res.status(400).json({ message: 'Input too long.' });
    }

    const isTamil = lang === 'ta';

    const prompt = isTamil
      ? `நீங்கள் ஒரு குடிமை புகார் எழுத்தாளர். கீழே உள்ள உள்ளீடு ஆங்கிலம், தமிழ் அல்லது Tanglish-ல் இருக்கலாம் — எந்த மொழியிலும் இருந்தாலும் பரவாயில்லை.

உங்கள் பணி:
- உள்ளீடு குறுகியதாகவோ தெளிவற்றதாகவோ இருந்தால், அதை ஒரு முழுமையான, தெளிவான குடிமை புகார் விவரணையாக விரிவுபடுத்துங்கள்
- உள்ளீடு ஏற்கனவே விரிவாக இருந்தால், இலக்கணம் மற்றும் தெளிவை மட்டும் சரிசெய்யுங்கள்
- அரசு அதிகாரிகளுக்கு ஏற்ற தொனியில் எழுதுங்கள்
- பயனர் குறிப்பிட்ட இடம், பிரச்னை வகை, தாக்கம் ஆகியவற்றை அப்படியே வைக்கவும்
- இடம், தேதி, நபர், அளவு போன்ற புதிய தகவல்களை கற்பனையாக சேர்க்காதீர்கள்
- **பதில் தமிழிலேயே இருக்க வேண்டும்** — உள்ளீடு ஆங்கிலத்தில் இருந்தாலும் சரி
- வெறும் மேம்படுத்தப்பட்ட விவரணையை மட்டும் திருப்பி அனுப்புங்கள்

எடுத்துக்காட்டுகள்:
உள்ளீடு: "water problem" → வெளியீடு: "தண்ணீர் கசிவு ஏற்பட்டு தண்ணீர் வீணாகி, சுற்றியுள்ள பகுதிக்கு பாதிப்பு ஏற்படுகிறது."
உள்ளீடு: "road problem" → வெளியீடு: "சாலையில் சேதம் மற்றும் பள்ளங்கள் ஏற்பட்டு, வாகன ஓட்டிகள் மற்றும் பாதசாரிகளுக்கு சிரமம் ஏற்படுகிறது."
உள்ளீடு: "குப்பை பிரச்னை" → வெளியீடு: "அப்பகுதியில் குப்பைகள் தேங்கி, முறையான குப்பை சேகரிப்பு இல்லாததால் சுகாதார பாதிப்பு ஏற்படுகிறது."

உள்ளீடு:
"${query.trim()}"`
      : `You are a civic complaint writing assistant. The input may be in English, Tamil, or Tanglish — always respond in English.

Your task:
- If the input is short or vague, EXPAND it into a clear, complete civic complaint description
- If the input is already detailed, improve grammar, clarity, and tone only
- Use formal language suitable for a civic authority complaint
- Preserve any facts the user mentioned: location, problem type, impact
- Do NOT invent new facts such as exact location, date, person, measurement, or cause
- Output language MUST be English regardless of input language
- Return ONLY the improved description text, no labels or explanations

Examples:
Input: "water problem" → Output: "Water leakage is occurring in the area, causing water wastage and affecting the surrounding locality."
Input: "road problem" → Output: "The road is in poor condition with potholes and surface damage, causing difficulty for vehicles and pedestrians."
Input: "garbage problem" → Output: "Garbage is accumulating in the area due to irregular waste collection, creating an unhygienic environment."
Input: "தண்ணீர் பிரச்னை" → Output: "Water leakage is occurring in the area, causing water wastage and affecting the surrounding locality."

Input:
"${query.trim()}"`;

    const genAI = getGemini();
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: { maxOutputTokens: 300, temperature: 0.3 },
    });

    const result  = await model.generateContent(prompt);
    const enhanced = result.response.text()?.trim();

    if (!enhanced) {
      return res.status(500).json({ message: 'AI returned an empty response.' });
    }

    // Strip surrounding quotes if Gemini wrapped them
    const clean = enhanced.replace(/^["'"']+|["'"']+$/gu, '').trim();

    return res.json({ enhanced: clean });

  } catch (err) {
    console.error('[enhance-search] error:', err.message);
    if (err.message?.includes('GEMINI_API_KEY')) {
      return res.status(503).json({ message: 'AI service is not configured.' });
    }
    if (err.status === 429 || err.message?.includes('quota') || err.message?.includes('RESOURCE_EXHAUSTED')) {
      return res.status(429).json({ message: 'AI service is busy. Please try again shortly.' });
    }
    return res.status(500).json({ message: 'AI enhancement failed. Please try again.' });
  }
});

module.exports = router;
