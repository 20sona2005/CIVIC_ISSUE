const dns = require('dns');

// Use public DNS servers for MongoDB SRV lookup
dns.setServers(['1.1.1.1', '8.8.8.8']);

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/issues', require('./routes/issues'));
app.use('/api/admin', require('./routes/admin'));

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Civic Issue API is running' });
});

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;

if (!process.env.MONGO_URI) {
  console.error('ERROR: MONGO_URI is not defined. Please create a .env file in the server/ directory.');
  process.exit(1);
}

try {
  const mongoUrl = new URL(process.env.MONGO_URI);
  console.log('MongoDB host:', mongoUrl.hostname);
  console.log('MongoDB database:', mongoUrl.pathname);
} catch {
  console.error('ERROR: MONGO_URI is not a valid URL. Check your .env file.');
  process.exit(1);
}

mongoose
  .connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
  })
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });
