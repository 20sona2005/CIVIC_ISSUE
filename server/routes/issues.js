const express = require('express');
const router = express.Router();
const Issue = require('../models/Issue');
const upload = require('../middleware/upload');
const fs = require('fs');
const path = require('path');

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// POST /api/issues — Report a new issue
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { title, description, category, location, reportedBy } = req.body;

    if (!title || !description || !category || !location || !reportedBy) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const issue = await Issue.create({
      title,
      description,
      category,
      location,
      reportedBy,
      image: req.file ? req.file.filename : null,
    });

    res.status(201).json(issue);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/issues — Get all issues (newest first)
router.get('/', async (req, res) => {
  try {
    const issues = await Issue.find().sort({ createdAt: -1 });
    res.json(issues);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/issues/:id — Get single issue by ID
router.get('/:id', async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) {
      return res.status(404).json({ message: 'Issue not found' });
    }
    res.json(issue);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
