const express = require('express');
const router = express.Router();
const Issue = require('../models/Issue');
const upload = require('../middleware/upload');
const path = require('path');

// POST /api/issues — Report a new issue
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { title, description, category, location, reportedBy, lat, lng } = req.body;

    if (!title || !description || !category || !location || !reportedBy) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Parse coordinates if provided (sent as strings via FormData)
    const parsedLat = lat ? parseFloat(lat) : null;
    const parsedLng = lng ? parseFloat(lng) : null;

    const issue = await Issue.create({
      title,
      description,
      category,
      location,
      reportedBy,
      image: req.file ? req.file.filename : null,
      status: 'Reported',
      coords: {
        lat: parsedLat && !isNaN(parsedLat) ? parsedLat : null,
        lng: parsedLng && !isNaN(parsedLng) ? parsedLng : null,
      },
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
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid issue ID' });
    }

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
