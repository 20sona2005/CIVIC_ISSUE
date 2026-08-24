/**
 * Seed script — inserts 12 realistic civic issues (2 per category).
 * Every field is populated; each issue has its own image file.
 * Run once: node seed.js
 * Safe to re-run — skips if 12+ issues already exist.
 */

const dns = require('dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);

require('dotenv').config();
const mongoose = require('mongoose');
const Issue    = require('./models/Issue');

const ISSUES = [
  // ── Pothole ────────────────────────────────────────────
  {
    title:       'Large pothole near Ambattur Main Road signal',
    description: 'A deep pothole approximately 2 feet wide has formed near the Ambattur Main Road signal. Multiple two-wheelers have suffered tyre damage. The pit deepens with every rain. Urgent repair needed before a major accident occurs.',
    category:    'Pothole',
    location:    'Ambattur Main Road, Chennai',
    coords:      { lat: 13.1143, lng: 80.1548 },
    image:       'seed-pothole.jpg',
    reportedBy:  'Arjun Mehta',
    status:      'Reported',
  },
  {
    title:       'Pothole cluster on NH 44 service road damaging vehicles',
    description: 'A stretch of about 50 metres on the NH 44 service road near Padi has developed multiple interconnected potholes. Heavy vehicles avoid the stretch pushing traffic onto footpaths. Road base gravel is now exposed.',
    category:    'Pothole',
    location:    'NH 44 Service Road, Padi, Chennai',
    coords:      { lat: 13.1274, lng: 80.2117 },
    image:       'seed-pothole.jpg',
    reportedBy:  'Divya Krishnan',
    status:      'In Progress',
  },

  // ── Garbage ────────────────────────────────────────────
  {
    title:       'Garbage accumulation near residential area in Kopur',
    description: 'Uncollected domestic waste has been piling up at the corner of 3rd Cross Street, Kopur for over two weeks. The heap now blocks half the road. Strong odour and mosquito breeding are affecting nearby residents.',
    category:    'Garbage',
    location:    '3rd Cross Street, Kopur, Chennai',
    coords:      { lat: 13.0765, lng: 80.2684 },
    image:       'seed-garbage.jpg',
    reportedBy:  'Simi M',
    status:      'Resolved',
  },
  {
    title:       'Illegal dumping of construction debris on footpath',
    description: 'Construction debris including broken bricks, iron rods, and cement bags have been illegally dumped on the footpath near Anna Nagar Tower Park. Pedestrians are forced to walk on the road putting them at risk.',
    category:    'Garbage',
    location:    'Anna Nagar Tower Park Road, Chennai',
    coords:      { lat: 13.0841, lng: 80.2101 },
    image:       'seed-garbage.jpg',
    reportedBy:  'Priya Nair',
    status:      'Reported',
  },

  // ── Streetlight ────────────────────────────────────────
  {
    title:       'Five consecutive streetlights non-functional on OMR',
    description: 'Five streetlights in a row near Sholinganallur junction on OMR have been non-functional for three weeks. The stretch is completely dark after 8 PM making it dangerous for pedestrians and late-night commuters.',
    category:    'Streetlight',
    location:    'Sholinganallur Junction, OMR, Chennai',
    coords:      { lat: 12.9011, lng: 80.2279 },
    image:       'seed-streetlight.jpg',
    reportedBy:  'Karthik Rajan',
    status:      'Reported',
  },
  {
    title:       'Streetlight pole leaning dangerously over footpath',
    description: 'A streetlight pole near Velachery bus terminus is leaning at approximately 30 degrees over the footpath due to soil erosion at its base. The live electrical cable is partially exposed. Immediate safety action required.',
    category:    'Streetlight',
    location:    'Velachery Bus Terminus, Chennai',
    coords:      { lat: 12.9783, lng: 80.2209 },
    image:       'seed-streetlight.jpg',
    reportedBy:  'Meena Suresh',
    status:      'In Progress',
  },

  // ── Drainage ───────────────────────────────────────────
  {
    title:       'Blocked storm drain causing road flooding after rain',
    description: 'The main storm drain on Luz Church Road is completely blocked with silt and solid waste. Even 30 minutes of moderate rainfall causes knee-deep flooding that prevents vehicles and pedestrians from using the road for hours.',
    category:    'Drainage',
    location:    'Luz Church Road, Mylapore, Chennai',
    coords:      { lat: 13.0361, lng: 80.2685 },
    image:       'seed-drainage.jpg',
    reportedBy:  'Rajesh Iyer',
    status:      'Reported',
  },
  {
    title:       'Open drainage channel without cover near school zone',
    description: 'A 40-metre stretch of drainage channel on the road leading to SBOA School in Anna Nagar has no cover. Children and elderly residents are at risk of falling in. The channel also emits foul odour affecting the school environment.',
    category:    'Drainage',
    location:    'SBOA School Road, Anna Nagar, Chennai',
    coords:      { lat: 13.0895, lng: 80.2063 },
    image:       'seed-drainage.jpg',
    reportedBy:  'Lakshmi Venkat',
    status:      'Resolved',
  },

  // ── Water Leakage ──────────────────────────────────────
  {
    title:       'Underground water main bursting on T Nagar street',
    description: 'A underground water main has been leaking on North Usman Road, T Nagar for 5 days. Water is gushing onto the road surface causing a large depression in the tarmac. Significant water loss and traffic disruption.',
    category:    'Water Leakage',
    location:    'North Usman Road, T Nagar, Chennai',
    coords:      { lat: 13.0418, lng: 80.2341 },
    image:       'seed-waterleakage.jpg',
    reportedBy:  'Suresh Babu',
    status:      'In Progress',
  },
  {
    title:       'Overhead water tank overflowing onto street daily',
    description: 'The municipal overhead water tank near Adyar signal overflows every morning between 6–8 AM wasting thousands of litres. The overflow runs across the road creating slippery conditions and waterlogging the adjacent park.',
    category:    'Water Leakage',
    location:    'Adyar Signal, Adyar, Chennai',
    coords:      { lat: 13.0012, lng: 80.2565 },
    image:       'seed-waterleakage.jpg',
    reportedBy:  'Anitha Chandran',
    status:      'Reported',
  },

  // ── Other ──────────────────────────────────────────────
  {
    title:       'Damaged footpath tiles creating tripping hazard',
    description: 'Multiple footpath tiles on Nungambakkam High Road have cracked and shifted creating uneven surfaces. Several elderly pedestrians have already tripped. The broken edges are sharp and the base soil has eroded underneath.',
    category:    'Other',
    location:    'Nungambakkam High Road, Chennai',
    coords:      { lat: 13.0569, lng: 80.2425 },
    image:       'seed-other.jpg',
    reportedBy:  'Vijay Kumar',
    status:      'Reported',
  },
  {
    title:       'Bus stop shelter collapsed blocking pedestrian path',
    description: 'The bus stop shelter at Guindy MRTS station has partially collapsed. The corrugated roof and one support beam have fallen onto the footpath. Commuters waiting for buses have no shelter and the debris poses injury risk.',
    category:    'Other',
    location:    'Guindy MRTS Station, Guindy, Chennai',
    coords:      { lat: 13.0067, lng: 80.2206 },
    image:       'seed-other.jpg',
    reportedBy:  'Ravi Shankar',
    status:      'In Progress',
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  console.log('Connected to MongoDB');

  const existing = await Issue.countDocuments();
  if (existing >= 12) {
    console.log(`Skipping — ${existing} issues already exist. Delete them first to re-seed.`);
    await mongoose.disconnect();
    return;
  }

  // Spread createdAt across the last 30 days so the dashboard looks realistic
  const now = Date.now();
  const docs = ISSUES.map((issue, i) => ({
    ...issue,
    createdAt: new Date(now - i * 2.5 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(now - i * 2.5 * 24 * 60 * 60 * 1000),
  }));

  await Issue.insertMany(docs, { timestamps: false });
  console.log(`✓ Inserted ${docs.length} seed issues.`);

  // Print summary
  for (const d of docs) {
    console.log(`  [${d.status.padEnd(11)}] ${d.category.padEnd(14)} — ${d.title.substring(0, 55)}`);
  }

  await mongoose.disconnect();
  console.log('Done.');
}

seed().catch(err => { console.error(err); process.exit(1); });
