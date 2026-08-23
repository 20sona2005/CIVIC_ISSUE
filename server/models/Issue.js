const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: ['Pothole', 'Garbage', 'Streetlight', 'Drainage', 'Water Leakage', 'Other'],
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,   // stores filename of uploaded image
      default: null,
    },
    reportedBy: {
      type: String,   // stores the user's name
      required: true,
    },
    status: {
      type: String,
      enum: ['Reported', 'In Progress', 'Resolved'],
      default: 'Reported',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Issue', issueSchema);
