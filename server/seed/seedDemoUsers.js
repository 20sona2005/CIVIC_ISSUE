/**
 * seedDemoUsers.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Seeds exactly 5 dummy demo users into MongoDB.
 * Safe to run multiple times — uses upsert so no duplicates are created.
 *
 * IMPORTANT: Change the `email` values below to YOUR project Gmail address
 * (or any address you can access). All 5 OTPs will be delivered to those
 * emails during your demo.
 *
 * Run:
 *   node server/seed/seedDemoUsers.js
 *
 * DISCLAIMER: These Aadhaar numbers are fictional values created solely for
 * an academic college-project prototype. They do NOT represent real people
 * and are NOT connected to UIDAI in any way.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

// Same DNS fix as server.js — needed for MongoDB Atlas SRV lookup
const dns = require('dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);

const mongoose = require('mongoose');
const DemoUser = require('../models/DemoUser');

// ── 5 Demo users ──────────────────────────────────────────────────────────────
// All OTPs go to YOUR_EMAIL below — change it to your Gmail once.
// All 5 users share the same inbox so you can demo any Aadhaar number.
const YOUR_EMAIL = process.env.EMAIL_USER; // reads from .env automatically

const DEMO_USERS = [
  {
    name:              'Arjun Sharma',
    demoAadhaarNumber: '111122223333',
    email:             YOUR_EMAIL,
    role:              'citizen',
  },
  {
    name:              'Priya Nair',
    demoAadhaarNumber: '222233334444',
    email:             YOUR_EMAIL,
    role:              'citizen',
  },
  {
    name:              'Rahul Verma',
    demoAadhaarNumber: '333344445555',
    email:             YOUR_EMAIL,
    role:              'citizen',
  },
  {
    name:              'Sunita Patel',
    demoAadhaarNumber: '444455556666',
    email:             YOUR_EMAIL,
    role:              'citizen',
  },
  {
    name:              'Vikram Singh',
    demoAadhaarNumber: '555566667777',
    email:             YOUR_EMAIL,
    role:              'citizen',
  },
];

async function seed() {
  try {
    console.log('Connecting to MongoDB…');
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
    console.log('Connected.');
    console.log('EMAIL_USER from .env:', process.env.EMAIL_USER || '⚠️  NOT SET — check your .env file!\n');

    if (!process.env.EMAIL_USER || process.env.EMAIL_USER === 'your_gmail@gmail.com') {
      console.error('❌  EMAIL_USER is not configured in server/.env');
      console.error('    Set it to your real Gmail address and run again.');
      process.exit(1);
    }

    // Drop stale unique email index if it exists (safe no-op if not present)
    try {
      await mongoose.connection.collection('demousers').dropIndex('email_1');
      console.log('ℹ️  Dropped stale unique email index.');
    } catch (_) { /* index didn't exist — fine */ }

    let created = 0;
    let skipped = 0;

    for (const userData of DEMO_USERS) {
      const existing = await DemoUser.findOne({ demoAadhaarNumber: userData.demoAadhaarNumber });

      if (existing) {
        // Update email in case it changed
        existing.email = userData.email;
        await existing.save();
        console.log(`  ⏭️  Updated : ${userData.name} (${userData.demoAadhaarNumber}) → ${userData.email}`);
        skipped++;
      } else {
        await DemoUser.create(userData);
        console.log(`  ✅ Created : ${userData.name} (${userData.demoAadhaarNumber}) → ${userData.email}`);
        created++;
      }
    }

    console.log(`\n✅ Seed complete — ${created} created, ${skipped} updated.`);
    console.log('\nDemo Aadhaar numbers ready to use:');
    DEMO_USERS.forEach(u => console.log(`  ${u.demoAadhaarNumber}  →  ${u.name}`));
    console.log(`\nOTP emails will arrive at: ${process.env.EMAIL_USER}`);

  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

seed();
