/**
 * duplicateDetector.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Pure utility module — no DB calls, no side effects.
 * Exports a single function: findDuplicates(newIssue, candidates, options)
 *
 * Algorithm (three signals combined into a weighted confidence score):
 *
 *  1. Category Match  (weight 0.20)
 *     Exact match → 1.0, no match → 0.0
 *
 *  2. Location Proximity  (weight 0.45)
 *     Uses the Haversine formula to compute great-circle distance.
 *     If coords are available for both issues:
 *       ≤ RADIUS_MATCH_M  metres → 1.0
 *       ≤ RADIUS_OUTER_M  metres → linear decay to 0.0
 *       > RADIUS_OUTER_M  metres → 0.0
 *     If coords are missing, falls back to location-string similarity.
 *
 *  3. Description Similarity  (weight 0.35)
 *     Normalises both strings (lowercase, strip punctuation, collapse whitespace),
 *     extracts tokens, then computes a Jaccard coefficient on bigrams + unigrams.
 *     Jaccard = |intersection| / |union|
 *
 *  Composite score = w1*category + w2*location + w3*description
 *  Issues whose composite score ≥ DUPLICATE_THRESHOLD are returned as duplicates.
 *
 * Configurable constants (can be overridden via options argument):
 *   RADIUS_MATCH_M   — metres inside which location score = 1.0   (default 100)
 *   RADIUS_OUTER_M   — metres outside which location score = 0.0  (default 300)
 *   DUPLICATE_THRESHOLD — minimum composite score to flag         (default 0.50)
 */

// ── Weights (must sum to 1.0) ─────────────────────────────────────────────────
const W_CATEGORY    = 0.20;
const W_LOCATION    = 0.45;
const W_DESCRIPTION = 0.35;

// ── Default radius config (metres) ───────────────────────────────────────────
const DEFAULT_RADIUS_MATCH_M = 100;   // full score inside this radius
const DEFAULT_RADIUS_OUTER_M = 300;   // zero score beyond this radius
const DEFAULT_THRESHOLD      = 0.50;  // composite score to call it a duplicate

// ── 1. Haversine distance (returns metres) ────────────────────────────────────
function haversineMetres(lat1, lng1, lat2, lng2) {
  const R = 6_371_000; // Earth radius in metres
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── 2. Location score ─────────────────────────────────────────────────────────
function locationScore(newIssue, candidate, radiusMatchM, radiusOuterM) {
  const n = newIssue.coords;
  const c = candidate.coords;

  const hasCoords =
    n && c &&
    n.lat != null && n.lng != null &&
    c.lat != null && c.lng != null;

  if (hasCoords) {
    const dist = haversineMetres(n.lat, n.lng, c.lat, c.lng);
    if (dist <= radiusMatchM) return 1.0;
    if (dist >= radiusOuterM) return 0.0;
    // Linear decay between radiusMatchM and radiusOuterM
    return 1.0 - (dist - radiusMatchM) / (radiusOuterM - radiusMatchM);
  }

  // Fallback: string similarity on location text
  return stringSimilarity(
    newIssue.location || '',
    candidate.location || ''
  );
}

// ── 3. Text normalisation helpers ─────────────────────────────────────────────
function normalise(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')  // strip punctuation
    .replace(/\s+/g, ' ')          // collapse whitespace
    .trim();
}

function tokenise(text) {
  return normalise(text).split(' ').filter(Boolean);
}

// Build a set of unigrams + bigrams for richer matching
function ngrams(tokens) {
  const set = new Set(tokens);                     // unigrams
  for (let i = 0; i < tokens.length - 1; i++) {
    set.add(`${tokens[i]} ${tokens[i + 1]}`);      // bigrams
  }
  return set;
}

// Jaccard coefficient on ngram sets
function jaccardSimilarity(setA, setB) {
  if (setA.size === 0 && setB.size === 0) return 1.0;
  if (setA.size === 0 || setB.size === 0) return 0.0;

  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return intersection / union;
}

// ── 4. Description similarity ─────────────────────────────────────────────────
function descriptionSimilarity(textA, textB) {
  const tokA = tokenise(textA);
  const tokB = tokenise(textB);

  // Also include the title tokens in the description comparison for better signal
  const ngramA = ngrams(tokA);
  const ngramB = ngrams(tokB);

  return jaccardSimilarity(ngramA, ngramB);
}

// Generic string similarity used as fallback for location
function stringSimilarity(a, b) {
  return jaccardSimilarity(ngrams(tokenise(a)), ngrams(tokenise(b)));
}

// ── 5. Combined text for description — title + description ───────────────────
function combinedText(issue) {
  return `${issue.title || ''} ${issue.description || ''}`;
}

// ── 6. Main exported function ─────────────────────────────────────────────────
/**
 * findDuplicates(newIssue, candidates, options?)
 *
 * @param {object}   newIssue   — the issue being submitted (not yet saved)
 *   { title, description, category, location, coords: { lat, lng } }
 * @param {object[]} candidates — existing issues to compare against
 * @param {object}   [options]
 *   { radiusMatchM, radiusOuterM, threshold }
 *
 * @returns {Array<{ issue, scores, confidence }>} sorted by confidence desc
 *   Only issues whose confidence >= threshold are included.
 */
function findDuplicates(newIssue, candidates, options = {}) {
  const radiusMatchM = options.radiusMatchM ?? DEFAULT_RADIUS_MATCH_M;
  const radiusOuterM = options.radiusOuterM ?? DEFAULT_RADIUS_OUTER_M;
  const threshold    = options.threshold    ?? DEFAULT_THRESHOLD;

  const results = [];

  for (const candidate of candidates) {
    // Skip already-resolved issues (they are no longer active)
    if (candidate.status === 'Resolved') continue;

    // ── Signal 1: Category ──────────────────────────────────────────────────
    const catScore =
      (newIssue.category || '').toLowerCase() ===
      (candidate.category || '').toLowerCase()
        ? 1.0
        : 0.0;

    // Category mismatch → skip immediately (different type of issue can't be duplicate)
    if (catScore === 0) continue;

    // ── Signal 2: Location proximity ────────────────────────────────────────
    const locScore = locationScore(newIssue, candidate, radiusMatchM, radiusOuterM);

    // ── Signal 3: Description similarity ────────────────────────────────────
    const descScore = descriptionSimilarity(
      combinedText(newIssue),
      combinedText(candidate)
    );

    // ── Composite confidence ─────────────────────────────────────────────────
    const confidence =
      W_CATEGORY * catScore +
      W_LOCATION * locScore +
      W_DESCRIPTION * descScore;

    if (confidence >= threshold) {
      results.push({
        issue:      candidate,
        scores: {
          category:    parseFloat(catScore.toFixed(3)),
          location:    parseFloat(locScore.toFixed(3)),
          description: parseFloat(descScore.toFixed(3)),
        },
        confidence: parseFloat(confidence.toFixed(3)),
      });
    }
  }

  // Sort highest confidence first
  results.sort((a, b) => b.confidence - a.confidence);

  return results;
}

module.exports = {
  findDuplicates,
  haversineMetres,        // exported for testing
  descriptionSimilarity,  // exported for testing
  DEFAULT_RADIUS_MATCH_M,
  DEFAULT_RADIUS_OUTER_M,
  DEFAULT_THRESHOLD,
};
