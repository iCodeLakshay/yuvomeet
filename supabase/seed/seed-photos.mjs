/**
 * seed-photos.mjs — Seed profile, venue, and plan-cover photos for demo accounts.
 *
 * Uploads 10 AI-generated JPEG images from supabase/seed/media/ to the private
 * `media` bucket and inserts approved rows into profile_photos, venue_photos,
 * and plan_covers, then links plan covers into plans.cover_id.
 *
 * Prerequisites:
 *   Node >= 18 (uses native fetch + crypto.randomUUID)
 *   SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars (service role bypasses RLS)
 *
 * Run from the repo root:
 *   # Linux / macOS / Git Bash
 *   SUPABASE_URL=https://vzughvdsuypjymlvishl.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key> \
 *   node supabase/seed/seed-photos.mjs
 *
 *   # Windows PowerShell
 *   $env:SUPABASE_URL="https://vzughvdsuypjymlvishl.supabase.co"
 *   $env:SUPABASE_SERVICE_ROLE_KEY="<your-service-role-key>"
 *   node supabase/seed/seed-photos.mjs
 *
 * The service role key is in the Supabase dashboard under Project Settings → API.
 * Idempotent: skips profile photos if the user already has any, skips venue photos
 * if the venue already has any, skips plan covers if plans.cover_id is already set.
 */

import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MEDIA_DIR = path.join(__dirname, 'media');

// ---------------------------------------------------------------------------
// Config — read from environment
// ---------------------------------------------------------------------------
const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('ERROR: Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running.');
  process.exit(1);
}

const authHeader = { Authorization: `Bearer ${SERVICE_KEY}` };

// ---------------------------------------------------------------------------
// Demo data: users, venues and plans from supabase/seeds/demo.sql
// ---------------------------------------------------------------------------

// 44444444-4444-4444-8444-44444444440X
const U = (n) => `44444444-4444-4444-8444-4444444444${String(n).padStart(2, '0')}`;
const V = (n) => `33333333-3333-4333-8333-3333333333${String(n).padStart(2, '0')}`;
const P = (n) => `55555555-5555-4555-8555-5555555555${String(n).padStart(2, '0')}`;

/**
 * Profile photo assignments.
 * Three approved photos for Rohan (01), Sneha (04), Meera (10); one for the rest.
 * File names reference the seed images in supabase/seed/media/.
 * { userId, position, file }
 */
const PROFILE_PHOTOS = [
  // Rohan — photography, chai-cafe; 3 photos
  { userId: U(1), position: 0, file: 'portrait_man_b.jpg' },   // riverfront with camera
  { userId: U(1), position: 1, file: 'portrait_man_a.jpg' },   // cafe
  { userId: U(1), position: 2, file: 'portrait_man_c.jpg' },   // guitar indoors

  // Sneha — photography, treks; 3 photos
  { userId: U(4), position: 0, file: 'portrait_woman_b.jpg' }, // outdoor river
  { userId: U(4), position: 1, file: 'portrait_woman_a.jpg' }, // cafe study
  { userId: U(4), position: 2, file: 'portrait_woman_c.jpg' }, // sketching

  // Meera — treks, photography; 3 photos
  { userId: U(10), position: 0, file: 'portrait_woman_c.jpg' }, // sketching cafe
  { userId: U(10), position: 1, file: 'portrait_woman_b.jpg' }, // outdoor river
  { userId: U(10), position: 2, file: 'portrait_woman_a.jpg' }, // study cafe

  // Single-photo users
  { userId: U(2),  position: 0, file: 'portrait_woman_a.jpg' }, // Priya  — study
  { userId: U(3),  position: 0, file: 'portrait_man_a.jpg'   }, // Arjun  — games
  { userId: U(5),  position: 0, file: 'portrait_man_c.jpg'   }, // Karan  — sports
  { userId: U(6),  position: 0, file: 'portrait_woman_a.jpg' }, // Ananya — study/chai
  { userId: U(7),  position: 0, file: 'portrait_man_c.jpg'   }, // Vikram — music
  { userId: U(8),  position: 0, file: 'portrait_woman_c.jpg' }, // Isha   — movies
  { userId: U(9),  position: 0, file: 'portrait_man_a.jpg'   }, // Aditya — tech
  { userId: U(11), position: 0, file: 'portrait_man_b.jpg'   }, // Rahul  — sports
  { userId: U(12), position: 0, file: 'portrait_woman_c.jpg' }, // Kavya  — art
];

/**
 * Venue photo assignments.
 * { venueId, position, file }
 */
const VENUE_PHOTOS = [
  { venueId: V(1),  position: 0, file: 'venue_chai.jpg'   }, // Chai Sutta Bar
  { venueId: V(2),  position: 0, file: 'venue_river.jpg'  }, // Riverfront Cycling Path
  { venueId: V(6),  position: 0, file: 'venue_river.jpg'  }, // Seven Wonders Park
  { venueId: V(9),  position: 0, file: 'cover_sports.jpg' }, // Coral Park Turf Arena
  { venueId: V(10), position: 0, file: 'venue_chai.jpg'   }, // Kunhari Board Game Cafe
];

/**
 * Plan cover assignments.
 * Host is needed so the storage path follows `plans/{hostUserId}/{coverId}.jpg`.
 * { planId, hostId, file }
 */
const PLAN_COVERS = [
  { planId: P(3), hostId: U(5),  file: 'cover_sports.jpg' }, // Saturday box cricket (Karan)
  { planId: P(6), hostId: U(7),  file: 'cover_music.jpg'  }, // Unplugged acoustic jam (Vikram)
  { planId: P(4), hostId: U(10), file: 'venue_river.jpg'  }, // Sunset photo walk (Meera)
];

// ---------------------------------------------------------------------------
// Supabase helpers
// ---------------------------------------------------------------------------

/** Upload a local file to the `media` bucket. Upserts so re-runs are safe. */
async function uploadToMedia(storagePath, localFile) {
  const bytes = fs.readFileSync(localFile);
  const url = `${SUPABASE_URL}/storage/v1/object/media/${storagePath}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...authHeader,
      'Content-Type': 'image/jpeg',
      'x-upsert': 'true',
    },
    body: bytes,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Storage upload failed for ${storagePath}: ${res.status} ${body}`);
  }
  return storagePath;
}

/** Execute a query via the PostgREST REST API using the service role (bypasses RLS). */
async function rest(method, table, body, params = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}${params}`;
  const res = await fetch(url, {
    method,
    headers: {
      ...authHeader,
      apikey: SERVICE_KEY,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`REST ${method} ${table} failed: ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

/** Check if a profile already has any photos (skip if so). */
async function hasProfilePhotos(userId) {
  const rows = await rest('GET', `profile_photos?user_id=eq.${userId}&limit=1`, null, '');
  return Array.isArray(rows) && rows.length > 0;
}

/** Check if a venue already has any photos. */
async function hasVenuePhotos(venueId) {
  const rows = await rest('GET', `venue_photos?venue_id=eq.${venueId}&limit=1`, null, '');
  return Array.isArray(rows) && rows.length > 0;
}

/** Check if a plan already has a cover set. */
async function hasPlanCover(planId) {
  const rows = await rest('GET', `plans?id=eq.${planId}&select=cover_id&limit=1`, null, '');
  return Array.isArray(rows) && rows.length > 0 && rows[0].cover_id != null;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function seedProfilePhotos() {
  console.log('\n── Profile photos ──');

  // Group by userId to skip whole users at once
  const byUser = {};
  for (const row of PROFILE_PHOTOS) {
    (byUser[row.userId] ??= []).push(row);
  }

  let seeded = 0;
  let skipped = 0;

  for (const [userId, photos] of Object.entries(byUser)) {
    if (await hasProfilePhotos(userId)) {
      console.log(`  skip  user ${userId} (already has photos)`);
      skipped++;
      continue;
    }

    for (const { position, file } of photos) {
      const photoId = randomUUID();
      const localPath = path.join(MEDIA_DIR, file);
      const storagePath = `profiles/${userId}/${photoId}.jpg`;

      await uploadToMedia(storagePath, localPath);

      await rest('POST', 'profile_photos', {
        id: photoId,
        user_id: userId,
        quarantine_path: `${userId}/seeded.jpg`, // placeholder; field is required but unused after approval
        path: storagePath,
        position,
        status: 'approved',
      });

      console.log(`  ✓  profiles/${userId.slice(-4)} pos=${position} (${file})`);
      seeded++;
    }
  }

  console.log(`  ${seeded} photos inserted, ${skipped} users skipped`);
}

async function seedVenuePhotos() {
  console.log('\n── Venue photos ──');
  let seeded = 0;

  for (const { venueId, position, file } of VENUE_PHOTOS) {
    if (await hasVenuePhotos(venueId)) {
      console.log(`  skip  venue ${venueId.slice(-4)} (already has photos)`);
      continue;
    }

    const photoId = randomUUID();
    const localPath = path.join(MEDIA_DIR, file);
    const storagePath = `venues/${venueId}/${photoId}.jpg`;

    await uploadToMedia(storagePath, localPath);

    await rest('POST', 'venue_photos', {
      id: photoId,
      venue_id: venueId,
      path: storagePath,
      position,
      status: 'approved',
    });

    console.log(`  ✓  venues/${venueId.slice(-4)} pos=${position} (${file})`);
    seeded++;
  }

  console.log(`  ${seeded} venue photos inserted`);
}

async function seedPlanCovers() {
  console.log('\n── Plan covers ──');
  let seeded = 0;

  for (const { planId, hostId, file } of PLAN_COVERS) {
    if (await hasPlanCover(planId)) {
      console.log(`  skip  plan ${planId.slice(-4)} (cover already set)`);
      continue;
    }

    const coverId = randomUUID();
    const localPath = path.join(MEDIA_DIR, file);
    const storagePath = `plans/${hostId}/${coverId}.jpg`;

    await uploadToMedia(storagePath, localPath);

    await rest('POST', 'plan_covers', {
      id: coverId,
      user_id: hostId,
      quarantine_path: `${hostId}/seeded.jpg`, // placeholder
      path: storagePath,
      status: 'approved',
    });

    // Link the cover to the plan
    await rest('PATCH', `plans?id=eq.${planId}`, { cover_id: coverId });

    console.log(`  ✓  plan ${planId.slice(-4)} → plans/${hostId.slice(-4)}/${coverId.slice(0, 8)}… (${file})`);
    seeded++;
  }

  console.log(`  ${seeded} plan covers inserted`);
}

async function main() {
  console.log(`Seeding photos → ${SUPABASE_URL}`);
  console.log(`Media directory: ${MEDIA_DIR}`);

  // Verify media files exist
  const missing = [];
  const needed = new Set([
    ...PROFILE_PHOTOS.map((r) => r.file),
    ...VENUE_PHOTOS.map((r) => r.file),
    ...PLAN_COVERS.map((r) => r.file),
  ]);
  for (const f of needed) {
    if (!fs.existsSync(path.join(MEDIA_DIR, f))) missing.push(f);
  }
  if (missing.length) {
    console.error(`ERROR: Missing media files:\n  ${missing.join('\n  ')}`);
    process.exit(1);
  }

  await seedProfilePhotos();
  await seedVenuePhotos();
  await seedPlanCovers();

  console.log('\n✅  Done. Run the app to see photos on plan cards and profiles.');
}

main().catch((err) => {
  console.error('\n❌ ', err.message);
  process.exit(1);
});
