/**
 * Checks every image filename stored in MongoDB exists on disk.
 * For any missing file, copies the matching seed image as a substitute
 * so no issue card shows a broken image.
 */
const dns = require('dns'); dns.setServers(['1.1.1.1','8.8.8.8']);
require('dotenv').config();
const mongoose = require('mongoose');
const Issue    = require('./models/Issue');
const fs       = require('fs');
const path     = require('path');

const UPLOADS = path.join(__dirname, 'uploads');

// Fallback seed image per category
const FALLBACK = {
  'Pothole':       'seed-pothole.jpg',
  'Garbage':       'seed-garbage.jpg',
  'Streetlight':   'seed-streetlight.jpg',
  'Drainage':      'seed-drainage.jpg',
  'Water Leakage': 'seed-waterleakage.jpg',
  'Other':         'seed-other.jpg',
};

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const issues = await Issue.find().select('_id title category image');
  let fixed = 0, ok = 0;

  for (const issue of issues) {
    const filePath = path.join(UPLOADS, issue.image);
    if (fs.existsSync(filePath)) {
      ok++;
      continue;
    }

    // File missing — substitute with seed image for that category
    const fallbackFile = FALLBACK[issue.category] || 'seed-other.jpg';
    const fallbackPath = path.join(UPLOADS, fallbackFile);

    if (fs.existsSync(fallbackPath)) {
      // Update the DB record to point to the seed image
      await Issue.findByIdAndUpdate(issue._id, { image: fallbackFile });
      console.log(`FIXED [${issue.category}] "${issue.title.substring(0,45)}" → ${fallbackFile}`);
      fixed++;
    } else {
      console.log(`WARN  [${issue.category}] seed image missing: ${fallbackFile}`);
    }
  }

  console.log(`\nDone — ${ok} ok, ${fixed} fixed.`);
  mongoose.disconnect();
}).catch(err => { console.error(err); process.exit(1); });
