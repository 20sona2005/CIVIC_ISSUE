const dns = require('dns');
// Use public DNS servers for MongoDB SRV lookup
dns.setServers(['1.1.1.1', '8.8.8.8']);

const http       = require('http');
const express    = require('express');
const { Server } = require('socket.io');
const mongoose   = require('mongoose');
const cors       = require('cors');
const dotenv     = require('dotenv');
const path       = require('path');
const jwt        = require('jsonwebtoken');
const rateLimit  = require('express-rate-limit');

dotenv.config();

const app    = express();
const server = http.createServer(app);   // wrap express in http.Server for Socket.IO

// ── Socket.IO setup ──────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Make io accessible inside route handlers via req.app.get('io')
app.set('io', io);

/**
 * Socket.IO authentication middleware
 * Every connecting socket must pass a valid JWT as a handshake query param:
 *   socket = io('http://localhost:5000', { query: { token: '...' } })
 * On success, socket.user = { id, name, email, role }
 */
io.use((socket, next) => {
  const token = socket.handshake.query?.token || socket.handshake.auth?.token;
  if (!token) {
    return next(new Error('Authentication token missing'));
  }
  try {
    socket.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    next(new Error('Invalid or expired token'));
  }
});

io.on('connection', (socket) => {
  const { id: userId, role, name } = socket.user;

  // ── Join personal room ───────────────────────────────────────────────────
  socket.join(`user:${userId}`);

  // ── Admins also join the shared admin broadcast room ─────────────────────
  if (role === 'admin') {
    socket.join('role:admin');
  }

  console.log(`[Socket] connected: ${name} (${role}) — socket ${socket.id}`);

  socket.on('disconnect', (reason) => {
    console.log(`[Socket] disconnected: ${name} — ${reason}`);
  });
});

// ── Express middleware ───────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Serve uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Routes ───────────────────────────────────────────────────────────────────

// Chatbot rate limiter — 30 messages per user per 10 minutes
// Keyed on IP; enough headroom for normal use, blocks abuse
const chatbotLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { reply: 'Too many messages. Please wait a few minutes before trying again.' },
});

app.use('/api/auth',          require('./routes/auth'));
app.use('/api/issues',        require('./routes/issues'));
app.use('/api/admin',         require('./routes/admin'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/chatbot',       chatbotLimiter, require('./routes/chatbot'));
app.use('/api/feedback',      require('./routes/feedback'));

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Civic Issue API is running' });
});

// ── MongoDB + server start ───────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

if (!process.env.MONGO_URI) {
  console.error('ERROR: MONGO_URI is not defined. Please check your .env file.');
  process.exit(1);
}

try {
  const mongoUrl = new URL(process.env.MONGO_URI);
  console.log('MongoDB host:', mongoUrl.hostname);
} catch {
  console.error('ERROR: MONGO_URI is not a valid URL.');
  process.exit(1);
}

mongoose
  .connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 })
  .then(() => {
    console.log('MongoDB connected');
    // Use server.listen (not app.listen) so Socket.IO shares the same port
    server.listen(PORT, () => {
      console.log(`Server + Socket.IO running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });
