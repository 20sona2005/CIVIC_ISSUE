/**
 * generateImages.js
 * Creates 12 category-specific seed images as SVG files in server/uploads/.
 * Uses ZERO external dependencies — pure Node.js built-ins only.
 * Run: node generateImages.js
 */

const fs   = require('fs');
const path = require('path');

const UPLOADS = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS, { recursive: true });

// Each entry: filename, background colour, icon (emoji rendered as text), label, sublabel
const IMAGES = [
  // ── Pothole ──────────────────────────────────────────────────────────────
  {
    file: 'seed-pothole.jpg',
    bg: '#4a3728', road: '#2d2d2d', accent: '#e8d5a3',
    icon: '🕳️', label: 'Road Pothole', sub: 'Damaged road surface',
    scene: 'pothole',
  },
  {
    file: 'seed-pothole-2.jpg',
    bg: '#3d3020', road: '#1a1a1a', accent: '#f0c060',
    icon: '⚠️', label: 'Crater Pothole', sub: 'Severe road damage',
    scene: 'pothole2',
  },

  // ── Garbage ───────────────────────────────────────────────────────────────
  {
    file: 'seed-garbage.jpg',
    bg: '#2d4a1e', road: '#1c2e12', accent: '#a8d05a',
    icon: '🗑️', label: 'Garbage Dump', sub: 'Uncollected waste',
    scene: 'garbage',
  },
  {
    file: 'seed-garbage-2.jpg',
    bg: '#3a3010', road: '#282010', accent: '#d4a030',
    icon: '♻️', label: 'Illegal Dumping', sub: 'Roadside waste pile',
    scene: 'garbage2',
  },

  // ── Streetlight ──────────────────────────────────────────────────────────
  {
    file: 'seed-streetlight.jpg',
    bg: '#0a0a2e', road: '#1a1a3e', accent: '#ffd700',
    icon: '💡', label: 'Broken Streetlight', sub: 'No illumination at night',
    scene: 'streetlight',
  },
  {
    file: 'seed-streetlight-2.jpg',
    bg: '#05051a', road: '#10103a', accent: '#ffaa00',
    icon: '🔦', label: 'Dark Road', sub: 'Non-functional street lamp',
    scene: 'streetlight2',
  },

  // ── Drainage ─────────────────────────────────────────────────────────────
  {
    file: 'seed-drainage.jpg',
    bg: '#1a3a4a', road: '#0d2030', accent: '#40a0d0',
    icon: '🌊', label: 'Blocked Drain', sub: 'Flooded road drainage',
    scene: 'drainage',
  },
  {
    file: 'seed-drainage-2.jpg',
    bg: '#152535', road: '#0a1520', accent: '#5ab8e0',
    icon: '💧', label: 'Waterlogging', sub: 'Clogged drainage system',
    scene: 'drainage2',
  },

  // ── Water Leakage ─────────────────────────────────────────────────────────
  {
    file: 'seed-water.jpg',
    bg: '#1a2e4a', road: '#0d1e30', accent: '#60b8f0',
    icon: '🚿', label: 'Water Pipe Leak', sub: 'Main pipeline burst',
    scene: 'water',
  },
  {
    file: 'seed-water-2.jpg',
    bg: '#102540', road: '#081520', accent: '#80d0ff',
    icon: '🪣', label: 'Leaking Pipeline', sub: 'Water wastage on road',
    scene: 'water2',
  },

  // ── Other ─────────────────────────────────────────────────────────────────
  {
    file: 'seed-other.jpg',
    bg: '#2a1a0a', road: '#1a1008', accent: '#c87840',
    icon: '🌳', label: 'Fallen Tree', sub: 'Road obstruction',
    scene: 'other',
  },
  {
    file: 'seed-other-2.jpg',
    bg: '#1e2820', road: '#141c14', accent: '#78a860',
    icon: '🚧', label: 'Road Obstruction', sub: 'Construction debris',
    scene: 'other2',
  },
];

// Scene-specific SVG detail drawings
function sceneDetails(scene, W, H) {
  const mid = W / 2;
  const roadY = H * 0.55;
  const roadH = H * 0.3;

  switch (scene) {
    case 'pothole':
    case 'pothole2':
      return `
        <!-- Road -->
        <rect x="0" y="${roadY}" width="${W}" height="${roadH}" fill="#2d2d2d"/>
        <!-- Road lines -->
        <rect x="${mid-4}" y="${roadY}" width="8" height="${roadH*0.3}" fill="#f0e040" opacity="0.7"/>
        <rect x="${mid-4}" y="${roadY + roadH*0.55}" width="8" height="${roadH*0.3}" fill="#f0e040" opacity="0.7"/>
        <!-- Pothole -->
        <ellipse cx="${mid}" cy="${roadY + roadH*0.45}" rx="70" ry="42" fill="#111" stroke="#555" stroke-width="3"/>
        <ellipse cx="${mid - 10}" cy="${roadY + roadH*0.38}" rx="55" ry="32" fill="#1a1a1a"/>
        <ellipse cx="${mid + 15}" cy="${roadY + roadH*0.5}" rx="30" ry="18" fill="#0a0a0a" opacity="0.8"/>
        <!-- Cracks -->
        <line x1="${mid-70}" y1="${roadY + roadH*0.45}" x2="${mid-120}" y2="${roadY + roadH*0.25}" stroke="#555" stroke-width="2" opacity="0.8"/>
        <line x1="${mid+60}" y1="${roadY + roadH*0.42}" x2="${mid+110}" y2="${roadY + roadH*0.6}" stroke="#555" stroke-width="2" opacity="0.8"/>
        <line x1="${mid-30}" y1="${roadY + roadH*0.8}" x2="${mid+50}" y2="${roadY + roadH*0.95}" stroke="#555" stroke-width="1.5" opacity="0.6"/>
        <!-- Water in pothole -->
        <ellipse cx="${mid}" cy="${roadY + roadH*0.48}" rx="50" ry="28" fill="#1e4060" opacity="0.7"/>
        <!-- Warning cone -->
        <polygon points="${mid+100},${roadY + roadH*0.1} ${mid+85},${roadY + roadH*0.65} ${mid+115},${roadY + roadH*0.65}" fill="#ff6600" stroke="#cc4400" stroke-width="2"/>
        <rect x="${mid+84}" y="${roadY + roadH*0.6}" width="32" height="8" fill="#ff6600" opacity="0.7"/>
        <rect x="${mid+90}" y="${roadY + roadH*0.35}" width="20" height="5" fill="white" opacity="0.8"/>
      `;

    case 'garbage':
    case 'garbage2':
      return `
        <!-- Ground -->
        <rect x="0" y="${roadY}" width="${W}" height="${roadH}" fill="#2a2010"/>
        <!-- Garbage pile base -->
        <ellipse cx="${mid}" cy="${roadY + roadH*0.7}" rx="140" ry="40" fill="#3a2e10" opacity="0.8"/>
        <!-- Bags and waste -->
        <ellipse cx="${mid - 60}" cy="${roadY + roadH*0.55}" rx="45" ry="35" fill="#1a3a10"/>
        <ellipse cx="${mid + 50}" cy="${roadY + roadH*0.5}" rx="40" ry="30" fill="#2a1a08"/>
        <ellipse cx="${mid - 10}" cy="${roadY + roadH*0.4}" rx="50" ry="38" fill="#3a2a00"/>
        <ellipse cx="${mid + 80}" cy="${roadY + roadH*0.6}" rx="35" ry="25" fill="#1e3818"/>
        <ellipse cx="${mid - 90}" cy="${roadY + roadH*0.65}" rx="30" ry="20" fill="#2e1808"/>
        <!-- Scattered items -->
        <rect x="${mid - 130}" y="${roadY + roadH*0.5}" width="25" height="15" fill="#c0392b" rx="3" transform="rotate(-20,${mid-130},${roadY + roadH*0.5})"/>
        <rect x="${mid + 110}" y="${roadY + roadH*0.55}" width="20" height="12" fill="#2980b9" rx="2" transform="rotate(15,${mid+110},${roadY + roadH*0.55})"/>
        <ellipse cx="${mid - 40}" cy="${roadY + roadH*0.75}" rx="18" ry="10" fill="#27ae60" opacity="0.7"/>
        <!-- Flies -->
        <circle cx="${mid-20}" cy="${roadY + roadH*0.15}" r="3" fill="#111"/>
        <circle cx="${mid+30}" cy="${roadY + roadH*0.1}" r="3" fill="#111"/>
        <circle cx="${mid-50}" cy="${roadY + roadH*0.2}" r="2.5" fill="#111"/>
        <!-- Stink lines -->
        <path d="M${mid},${roadY + roadH*0.3} Q${mid+20},${roadY + roadH*0.15} ${mid},${roadY}" stroke="#90ee90" stroke-width="2" fill="none" opacity="0.5"/>
        <path d="M${mid+40},${roadY + roadH*0.35} Q${mid+60},${roadY + roadH*0.2} ${mid+40},${roadY*0.9}" stroke="#90ee90" stroke-width="2" fill="none" opacity="0.4"/>
      `;

    case 'streetlight':
    case 'streetlight2':
      return `
        <!-- Night road -->
        <rect x="0" y="${roadY}" width="${W}" height="${roadH}" fill="#0d0d1a"/>
        <!-- Stars -->
        <circle cx="${mid-200}" cy="${H*0.1}" r="1.5" fill="white" opacity="0.8"/>
        <circle cx="${mid-100}" cy="${H*0.05}" r="1" fill="white" opacity="0.6"/>
        <circle cx="${mid+150}" cy="${H*0.15}" r="2" fill="white" opacity="0.7"/>
        <circle cx="${mid+250}" cy="${H*0.08}" r="1.5" fill="white" opacity="0.5"/>
        <circle cx="${mid-280}" cy="${H*0.2}" r="1" fill="white" opacity="0.6"/>
        <circle cx="${mid+80}" cy="${H*0.03}" r="1" fill="white" opacity="0.8"/>
        <!-- Broken pole leaning -->
        <rect x="${mid-6}" y="${H*0.15}" width="12" height="${roadY - H*0.15}"
              fill="#888" transform="rotate(12,${mid},${roadY})" opacity="0.9"/>
        <!-- Broken lamp head (dark — not working) -->
        <rect x="${mid + 50}" y="${H*0.08}" width="70" height="22" rx="8" fill="#444" stroke="#666" stroke-width="2"/>
        <rect x="${mid + 55}" y="${H*0.12}" width="60" height="10" rx="4" fill="#222"/>
        <!-- Crack on pole -->
        <line x1="${mid-2}" y1="${roadY*0.5}" x2="${mid+8}" y2="${roadY*0.55}" stroke="#555" stroke-width="3"/>
        <!-- Dark road markings -->
        <rect x="${mid-4}" y="${roadY + roadH*0.1}" width="8" height="${roadH*0.25}" fill="#1a1a2a"/>
        <rect x="${mid-4}" y="${roadY + roadH*0.6}" width="8" height="${roadH*0.25}" fill="#1a1a2a"/>
        <!-- Moon -->
        <circle cx="${mid + 200}" cy="${H * 0.12}" r="22" fill="#f5f5dc"/>
        <circle cx="${mid + 212}" cy="${H * 0.10}" r="18" fill="#0a0a2e"/>
      `;

    case 'drainage':
    case 'drainage2':
      return `
        <!-- Flooded road -->
        <rect x="0" y="${roadY}" width="${W}" height="${roadH}" fill="#0d2030"/>
        <!-- Water surface -->
        <rect x="0" y="${roadY}" width="${W}" height="${roadH * 0.6}" fill="#1e4060" opacity="0.85"/>
        <!-- Water ripples -->
        <ellipse cx="${mid - 80}" cy="${roadY + roadH*0.2}" rx="50" ry="12" fill="none" stroke="#3a7090" stroke-width="2" opacity="0.7"/>
        <ellipse cx="${mid + 60}" cy="${roadY + roadH*0.3}" rx="65" ry="15" fill="none" stroke="#3a7090" stroke-width="2" opacity="0.6"/>
        <ellipse cx="${mid}" cy="${roadY + roadH*0.15}" rx="35" ry="8" fill="none" stroke="#5090b0" stroke-width="1.5" opacity="0.8"/>
        <!-- Drain grate (blocked) -->
        <rect x="${mid-30}" y="${roadY + roadH*0.35}" width="60" height="40" rx="4" fill="#1a1a1a" stroke="#444" stroke-width="2"/>
        <line x1="${mid-25}" y1="${roadY + roadH*0.35}" x2="${mid-25}" y2="${roadY + roadH*0.75}" stroke="#333" stroke-width="3"/>
        <line x1="${mid-10}" y1="${roadY + roadH*0.35}" x2="${mid-10}" y2="${roadY + roadH*0.75}" stroke="#333" stroke-width="3"/>
        <line x1="${mid+5}" y1="${roadY + roadH*0.35}" x2="${mid+5}" y2="${roadY + roadH*0.75}" stroke="#333" stroke-width="3"/>
        <line x1="${mid+20}" y1="${roadY + roadH*0.35}" x2="${mid+20}" y2="${roadY + roadH*0.75}" stroke="#333" stroke-width="3"/>
        <!-- Debris in drain -->
        <ellipse cx="${mid}" cy="${roadY + roadH*0.55}" rx="25" ry="8" fill="#3a2a10" opacity="0.9"/>
        <!-- Rain drops -->
        <line x1="${mid-150}" y1="${H*0.05}" x2="${mid-160}" y2="${H*0.2}" stroke="#7abcd0" stroke-width="1.5" opacity="0.7"/>
        <line x1="${mid-50}" y1="${H*0.02}" x2="${mid-60}" y2="${H*0.17}" stroke="#7abcd0" stroke-width="1.5" opacity="0.7"/>
        <line x1="${mid+80}" y1="${H*0.07}" x2="${mid+70}" y2="${H*0.22}" stroke="#7abcd0" stroke-width="1.5" opacity="0.6"/>
        <line x1="${mid+180}" y1="${H*0.04}" x2="${mid+170}" y2="${H*0.19}" stroke="#7abcd0" stroke-width="1.5" opacity="0.7"/>
        <line x1="${mid-220}" y1="${H*0.08}" x2="${mid-230}" y2="${H*0.23}" stroke="#7abcd0" stroke-width="1.5" opacity="0.5"/>
      `;

    case 'water':
    case 'water2':
      return `
        <!-- Road -->
        <rect x="0" y="${roadY}" width="${W}" height="${roadH}" fill="#1a2530"/>
        <!-- Broken pipe -->
        <rect x="${mid - 80}" y="${roadY + roadH*0.1}" width="160" height="30" rx="15" fill="#607080" stroke="#405060" stroke-width="3"/>
        <!-- Pipe crack/break -->
        <path d="M${mid-10},${roadY + roadH*0.1} L${mid+5},${roadY + roadH*0.4} L${mid+15},${roadY + roadH*0.1}" fill="#405060"/>
        <!-- Water gushing out -->
        <path d="M${mid},${roadY + roadH*0.4} Q${mid-30},${roadY + roadH*0.6} ${mid-50},${roadY + roadH*0.8}" stroke="#4db8ff" stroke-width="6" fill="none" opacity="0.9"/>
        <path d="M${mid+5},${roadY + roadH*0.42} Q${mid+25},${roadY + roadH*0.62} ${mid+40},${roadY + roadH*0.82}" stroke="#4db8ff" stroke-width="5" fill="none" opacity="0.8"/>
        <!-- Water pool on road -->
        <ellipse cx="${mid}" cy="${roadY + roadH*0.85}" rx="110" ry="20" fill="#1e4a6e" opacity="0.85"/>
        <ellipse cx="${mid-20}" cy="${roadY + roadH*0.88}" rx="70" ry="12" fill="#2060a0" opacity="0.6"/>
        <!-- Water spray droplets -->
        <circle cx="${mid-15}" cy="${roadY + roadH*0.35}" r="4" fill="#80d0ff" opacity="0.8"/>
        <circle cx="${mid+20}" cy="${roadY + roadH*0.3}" r="3" fill="#80d0ff" opacity="0.7"/>
        <circle cx="${mid-30}" cy="${roadY + roadH*0.45}" r="3.5" fill="#80d0ff" opacity="0.6"/>
        <circle cx="${mid+35}" cy="${roadY + roadH*0.48}" r="2.5" fill="#80d0ff" opacity="0.8"/>
        <!-- Road excavation -->
        <rect x="${mid - 90}" y="${roadY + roadH*0.38}" width="180" height="50" rx="4" fill="#2a1a08" stroke="#3a2a18" stroke-width="2"/>
        <!-- Barrier -->
        <rect x="${mid+100}" y="${roadY}" width="15" height="${roadH*0.5}" fill="#ff6600" stroke="#cc4400" stroke-width="1"/>
        <rect x="${mid+115}" y="${roadY + roadH*0.08}" width="50" height="12" fill="#ff6600" opacity="0.9"/>
        <rect x="${mid+115}" y="${roadY + roadH*0.3}" width="50" height="12" fill="#ff6600" opacity="0.9"/>
      `;

    case 'other':
      return `
        <!-- Road/footpath -->
        <rect x="0" y="${roadY}" width="${W}" height="${roadH}" fill="#2a2018"/>
        <!-- Fallen tree trunk -->
        <rect x="${mid - W*0.45}" y="${roadY + roadH*0.2}" width="${W*0.9}" height="40" rx="20"
              fill="#6b3e1e" stroke="#4a2a0e" stroke-width="3"
              transform="rotate(-8,${mid},${roadY + roadH*0.4})"/>
        <!-- Tree bark texture -->
        <line x1="${mid - W*0.3}" y1="${roadY + roadH*0.15}" x2="${mid - W*0.28}" y2="${roadY + roadH*0.55}" stroke="#4a2a0e" stroke-width="2" opacity="0.6"/>
        <line x1="${mid}" y1="${roadY + roadH*0.12}" x2="${mid + 5}" y2="${roadY + roadH*0.52}" stroke="#4a2a0e" stroke-width="2" opacity="0.6"/>
        <line x1="${mid + W*0.15}" y1="${roadY + roadH*0.18}" x2="${mid + W*0.16}" y2="${roadY + roadH*0.58}" stroke="#4a2a0e" stroke-width="2" opacity="0.6"/>
        <!-- Branches and leaves -->
        <circle cx="${mid + W*0.35}" cy="${roadY + roadH*0.1}" r="60" fill="#2d6e1e" opacity="0.85"/>
        <circle cx="${mid + W*0.42}" cy="${roadY + roadH*0.25}" r="45" fill="#3a8a20" opacity="0.75"/>
        <circle cx="${mid + W*0.28}" cy="${roadY + roadH*0.3}" r="40" fill="#2d6e1e" opacity="0.7"/>
        <!-- Scattered leaves on road -->
        <ellipse cx="${mid - 50}" cy="${roadY + roadH*0.7}" rx="14" ry="8" fill="#4a8a20" opacity="0.7" transform="rotate(20,${mid-50},${roadY + roadH*0.7})"/>
        <ellipse cx="${mid + 80}" cy="${roadY + roadH*0.8}" rx="12" ry="7" fill="#3a7a18" opacity="0.6" transform="rotate(-15,${mid+80},${roadY + roadH*0.8})"/>
        <ellipse cx="${mid - 100}" cy="${roadY + roadH*0.75}" rx="10" ry="6" fill="#5a9a28" opacity="0.6"/>
        <!-- Roots exposed -->
        <path d="M${mid - W*0.45},${roadY + roadH*0.4} Q${mid - W*0.5},${roadY + roadH*0.2} ${mid - W*0.48},${roadY - H*0.05}" stroke="#5a3010" stroke-width="8" fill="none"/>
        <path d="M${mid - W*0.44},${roadY + roadH*0.45} Q${mid - W*0.52},${roadY + roadH*0.35} ${mid - W*0.55},${roadY + roadH*0.2}" stroke="#5a3010" stroke-width="6" fill="none"/>
      `;

    case 'other2':
      return `
        <!-- Road -->
        <rect x="0" y="${roadY}" width="${W}" height="${roadH}" fill="#2a2a20"/>
        <!-- Construction debris pile -->
        <polygon points="${mid-150},${roadY + roadH*0.9} ${mid+150},${roadY + roadH*0.9} ${mid+100},${roadY + roadH*0.2} ${mid-100},${roadY + roadH*0.2}" fill="#8a7a60"/>
        <!-- Bricks -->
        <rect x="${mid - 80}" y="${roadY + roadH*0.3}" width="35" height="20" fill="#c0522a" rx="2"/>
        <rect x="${mid - 40}" y="${roadY + roadH*0.35}" width="35" height="20" fill="#b04820" rx="2"/>
        <rect x="${mid + 10}" y="${roadY + roadH*0.28}" width="35" height="20" fill="#c05530" rx="2"/>
        <rect x="${mid + 50}" y="${roadY + roadH*0.33}" width="35" height="20" fill="#b84e28" rx="2"/>
        <!-- Sand/cement -->
        <ellipse cx="${mid}" cy="${roadY + roadH*0.6}" rx="80" ry="25" fill="#d4c090" opacity="0.8"/>
        <!-- Iron rods -->
        <line x1="${mid-120}" y1="${roadY + roadH*0.45}" x2="${mid+130}" y2="${roadY + roadH*0.5}" stroke="#708090" stroke-width="5"/>
        <line x1="${mid-100}" y1="${roadY + roadH*0.52}" x2="${mid+110}" y2="${roadY + roadH*0.58}" stroke="#708090" stroke-width="4"/>
        <!-- Warning tape -->
        <line x1="${mid-160}" y1="${roadY + roadH*0.05}" x2="${mid+160}" y2="${roadY + roadH*0.05}" stroke="#ffdd00" stroke-width="8" stroke-dasharray="20,15"/>
        <!-- Cones -->
        <polygon points="${mid-170},${roadY + roadH*0.05} ${mid-155},${roadY + roadH*0.05} ${mid-162},${roadY - H*0.02}" fill="#ff6600"/>
        <polygon points="${mid+155},${roadY + roadH*0.05} ${mid+170},${roadY + roadH*0.05} ${mid+162},${roadY - H*0.02}" fill="#ff6600"/>
      `;

    default:
      return '';
  }
}

function buildSVG(img) {
  const W = 800, H = 500;
  const mid = W / 2;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <!-- Sky / background -->
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${img.bg}"/>
      <stop offset="100%" stop-color="${img.road}"/>
    </linearGradient>
    <linearGradient id="overlay" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(0,0,0,0)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.55)"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#sky)"/>

  <!-- Scene details -->
  ${sceneDetails(img.scene, W, H)}

  <!-- Dark overlay for text readability -->
  <rect width="${W}" height="${H}" fill="url(#overlay)"/>

  <!-- Category pill top-left -->
  <rect x="20" y="20" width="160" height="36" rx="18" fill="${img.accent}" opacity="0.92"/>
  <text x="100" y="43" text-anchor="middle" font-family="Arial,sans-serif"
        font-size="15" font-weight="bold" fill="#111">CIVIC ISSUE</text>

  <!-- Icon circle top-right -->
  <circle cx="${W - 50}" cy="50" r="32" fill="rgba(0,0,0,0.5)" stroke="${img.accent}" stroke-width="2"/>
  <text x="${W - 50}" y="58" text-anchor="middle" font-size="26">${img.icon}</text>

  <!-- Bottom label bar -->
  <rect x="0" y="${H - 80}" width="${W}" height="80" fill="rgba(0,0,0,0.72)"/>
  <text x="24" y="${H - 48}" font-family="Arial,sans-serif" font-size="22"
        font-weight="bold" fill="white">${img.label}</text>
  <text x="24" y="${H - 22}" font-family="Arial,sans-serif" font-size="14"
        fill="${img.accent}" opacity="0.9">${img.sub}</text>

  <!-- Accent bar at bottom -->
  <rect x="0" y="${H - 5}" width="${W}" height="5" fill="${img.accent}" opacity="0.8"/>
</svg>`;
}

let count = 0;
for (const img of IMAGES) {
  const svgContent = buildSVG(img);
  // Save as .svg but name it .jpg — browsers/img tags handle SVG fine via src
  // and the server static middleware sends it correctly
  const outPath = path.join(UPLOADS, img.file);
  fs.writeFileSync(outPath, svgContent, 'utf8');
  console.log(`Created: ${img.file}`);
  count++;
}

console.log(`\nDone — ${count} category images created in uploads/`);
