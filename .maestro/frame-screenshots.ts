// Wraps each captured Maestro screenshot in a marketing frame:
//   - Cream `latte-50` background (contrast with dark app UI)
//   - Headline (Fraunces Bold) + subhead (DM Sans Medium) at top
//   - Device screenshot with subtle drop shadow for depth
//
// Inputs:  .maestro/screenshots/submission/{iphone,ipad}/*.png
// Outputs: .maestro/screenshots/marketing/{iphone,ipad}/*.png
//
// Run:  bun run .maestro/frame-screenshots.ts
//
// Headlines come from the COPY map below — keys match capture filenames.

import { readFileSync, mkdirSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const FRAUNCES_PATH = join(
  ROOT,
  'node_modules/@expo-google-fonts/fraunces/700Bold/Fraunces_700Bold.ttf',
);
const DM_SANS_PATH = join(
  ROOT,
  'node_modules/@expo-google-fonts/dm-sans/500Medium/DMSans_500Medium.ttf',
);
const SOURCE_DIR = join(__dirname, 'screenshots/submission');
const OUTPUT_DIR = join(__dirname, 'screenshots/marketing');

// Brand palette.
const BG = '#f9edde'; // latte-100 — warmer cream, more contrast with dark UI
const HEADLINE_COLOR = '#3d1f14'; // latte-950 — deep coffee brown for headline
const SUBHEAD_COLOR = '#784230'; // latte-800 — warm brown subhead
const ACCENT = '#ff9d37'; // harvest — accent rule above the headline

interface Copy {
  headline: string;
  subhead: string;
}

// One headline per shot, plus a supporting subhead. Keep headlines short
// (3–5 words) and subheads explanatory (~8–12 words). Filenames must match
// the takeScreenshot targets in .maestro/flows/.
const COPY: Record<string, Copy> = {
  '00a_onboarding_welcome.png': {
    headline: 'Caliburr',
    subhead: 'Your perfect cup, dialed in by the community.',
  },
  '01_explore.png': {
    headline: 'See what works.',
    subhead: 'Live recipes from real coffee enthusiasts — every day.',
  },
  '02_explore_filter.png': {
    headline: 'Filter to your gear.',
    subhead: 'Skip the noise. Only what works on what you own.',
  },
  '03_recipe_detail.png': {
    headline: 'Made for your grinder.',
    subhead: "Not someone else's setup — yours, right down to the click.",
  },
  '04_tries.png': {
    headline: 'Trust the community.',
    subhead: 'See who tried what, and exactly what they changed.',
  },
  '05_user_profile.png': {
    headline: 'Build your reputation.',
    subhead: 'Verified equipment, tried recipes, followers who trust your taste.',
  },
  '06_grinder_stats.png': {
    headline: 'Real numbers, not marketing.',
    subhead: 'Median + spread of every grind setting from real brewers.',
  },
  '07_gear.png': {
    headline: 'Your kit, dialed in.',
    subhead: 'Track every grinder and machine you own — set a default for each.',
  },
};

// Embed both fonts as data URIs so librsvg can render them.
const fraunces = readFileSync(FRAUNCES_PATH).toString('base64');
const dmSans = readFileSync(DM_SANS_PATH).toString('base64');

const fontFaces = `
  @font-face {
    font-family: 'Fraunces';
    font-weight: 700;
    src: url(data:font/ttf;base64,${fraunces}) format('truetype');
  }
  @font-face {
    font-family: 'DMSans';
    font-weight: 500;
    src: url(data:font/ttf;base64,${dmSans}) format('truetype');
  }
`;

function escapeXml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Greedy fallback wrap.
function greedyWrap(words: string[], maxChars: number): string[] {
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    const trial = current ? current + ' ' + w : w;
    if (trial.length > maxChars && current) {
      lines.push(current);
      current = w;
    } else {
      current = trial;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// Brute-force balanced wrap into k lines, picking the split that minimizes
// the longest line length.
function balancedWrap(words: string[], k: number): string[] {
  if (k <= 1) return [words.join(' ')];
  if (words.length < k) return words;

  let best: string[] | null = null;
  let bestMax = Infinity;

  function recurse(start: number, remaining: number, acc: string[][]) {
    if (remaining === 1) {
      const all = [...acc, words.slice(start)];
      const max = Math.max(...all.map((l) => l.join(' ').length));
      if (max < bestMax) {
        bestMax = max;
        best = all.map((l) => l.join(' '));
      }
      return;
    }
    const limit = words.length - remaining + 1;
    for (let i = start + 1; i <= limit; i++) {
      acc.push(words.slice(start, i));
      recurse(i, remaining - 1, acc);
      acc.pop();
    }
  }

  recurse(0, k, []);
  return best ?? words;
}

function wrap(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.split(' ');
  for (let k = 1; k <= maxLines; k++) {
    const lines = balancedWrap(words, k);
    if (lines.every((l) => l.length <= maxChars)) {
      // Reject orphan single-word last lines if we can use one more line.
      const last = lines[lines.length - 1] ?? '';
      const orphan = lines.length > 1 && last.split(' ').length === 1 && last.length < 8;
      if (orphan && k < maxLines) continue;
      return lines;
    }
  }
  return greedyWrap(words, maxChars);
}

async function frame(srcPath: string, dstPath: string, copy: Copy) {
  const meta = await sharp(srcPath).metadata();
  const W = meta.width!;
  const H = meta.height!;

  // Top band: 23% of canvas reserved for accent rule + headline + subhead.
  const topBand = Math.round(H * 0.23);
  const bottomPad = Math.round(H * 0.05);

  // Type sizes. usable widths are slightly tighter than the screenshot inset.
  const headlineSize = Math.round(W * 0.07); // ≈ 90px on iPhone
  const subheadSize = Math.round(W * 0.034); // ≈ 44px

  const usableHeadline = W * 0.78;
  const usableSubhead = W * 0.74;

  const headlineMaxChars = Math.floor(usableHeadline / (headlineSize * 0.45));
  const subheadMaxChars = Math.floor(usableSubhead / (subheadSize * 0.5));

  const headlineLines = wrap(copy.headline, headlineMaxChars, 2);
  const subheadLines = wrap(copy.subhead, subheadMaxChars, 2);

  const headlineLineHeight = Math.round(headlineSize * 1.08);
  const subheadLineHeight = Math.round(subheadSize * 1.3);

  const headlineHeight = headlineLines.length * headlineLineHeight;
  const subheadHeight = subheadLines.length * subheadLineHeight;
  const gap = Math.round(headlineSize * 0.55);
  const accentHeight = Math.round(W * 0.008);
  const accentWidth = Math.round(W * 0.08);
  const accentGap = Math.round(headlineSize * 0.5);

  const totalTextHeight = accentHeight + accentGap + headlineHeight + gap + subheadHeight;
  const textTop = Math.round((topBand - totalTextHeight) / 2);

  // Build SVG for the top band.
  let y = textTop + accentHeight;
  const accentY = textTop;
  // Headline baseline starts here.
  let headlineY = y + accentGap + Math.round(headlineSize * 0.85);
  const headlineTspans = headlineLines
    .map(
      (line, i) =>
        `<tspan x="50%" dy="${i === 0 ? '0' : headlineLineHeight}">${escapeXml(line)}</tspan>`,
    )
    .join('');

  let subheadY =
    headlineY + (headlineLines.length - 1) * headlineLineHeight + gap + Math.round(subheadSize * 0.85);
  const subheadTspans = subheadLines
    .map(
      (line, i) =>
        `<tspan x="50%" dy="${i === 0 ? '0' : subheadLineHeight}">${escapeXml(line)}</tspan>`,
    )
    .join('');

  const textSvg = `
    <svg width="${W}" height="${topBand}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <style>
          ${fontFaces}
          .h { font-family: 'Fraunces', serif; font-weight: 700; fill: ${HEADLINE_COLOR}; }
          .s { font-family: 'DMSans', sans-serif; font-weight: 500; fill: ${SUBHEAD_COLOR}; }
        </style>
      </defs>
      <rect
        x="${(W - accentWidth) / 2}"
        y="${accentY}"
        width="${accentWidth}"
        height="${accentHeight}"
        rx="${accentHeight / 2}"
        ry="${accentHeight / 2}"
        fill="${ACCENT}"
      />
      <text class="h" x="50%" y="${headlineY}" font-size="${headlineSize}" text-anchor="middle">${headlineTspans}</text>
      <text class="s" x="50%" y="${subheadY}" font-size="${subheadSize}" text-anchor="middle">${subheadTspans}</text>
    </svg>
  `;

  // Screenshot inset: fill remaining vertical space minus bottom padding,
  // ~88% width.
  const screenshotW = Math.round(W * 0.88);
  const availableH = H - topBand - bottomPad;
  const screenshotH = Math.min(availableH, Math.round((screenshotW * H) / W));

  const resized = await sharp(srcPath)
    .resize(screenshotW, screenshotH, { fit: 'inside' })
    .toBuffer();
  const rMeta = await sharp(resized).metadata();
  const rW = rMeta.width!;
  const rH = rMeta.height!;

  const radius = Math.round(W * 0.04);
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${rW}" height="${rH}">
       <rect x="0" y="0" width="${rW}" height="${rH}" rx="${radius}" ry="${radius}" fill="#fff"/>
     </svg>`,
  );
  const rounded = await sharp(resized)
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer();

  const drawX = Math.round((W - rW) / 2);
  const drawY = topBand + Math.round((availableH - rH) / 2);

  // Drop shadow: render a black rounded rect blurred and offset slightly.
  const shadowOffset = Math.round(W * 0.01);
  const shadowBlur = Math.round(W * 0.025);
  const shadowSvg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${rW + shadowBlur * 2}" height="${rH + shadowBlur * 2}">
       <rect
         x="${shadowBlur}"
         y="${shadowBlur}"
         width="${rW}"
         height="${rH}"
         rx="${radius}"
         ry="${radius}"
         fill="rgba(0,0,0,0.18)"
       />
     </svg>`,
  );
  const shadow = await sharp(shadowSvg).blur(shadowBlur / 3).toBuffer();

  await sharp({
    create: {
      width: W,
      height: H,
      channels: 4,
      background: BG,
    },
  })
    .composite([
      { input: Buffer.from(textSvg), top: 0, left: 0 },
      {
        input: shadow,
        top: drawY - shadowBlur + shadowOffset,
        left: drawX - shadowBlur,
      },
      { input: rounded, top: drawY, left: drawX },
    ])
    .png()
    .toFile(dstPath);
}

async function processDevice(device: 'iphone' | 'ipad') {
  const srcDir = join(SOURCE_DIR, device);
  const outDir = join(OUTPUT_DIR, device);
  if (!existsSync(srcDir)) {
    console.log(`  ↷ ${device}: no captures (${srcDir} missing)`);
    return;
  }
  // Wipe stale output so renamed/removed shots don't linger from prior runs.
  if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  const files = readdirSync(srcDir)
    .filter((f) => f.endsWith('.png'))
    .sort();
  for (const file of files) {
    const copy = COPY[file];
    if (!copy) {
      console.log(`  ↷ ${device}/${file} — no copy mapped, skipping`);
      continue;
    }
    const src = join(srcDir, file);
    const dst = join(outDir, file);
    await frame(src, dst, copy);
    console.log(`  ✓ ${device}/${file}`);
  }
}

async function main() {
  console.log('Framing screenshots…');
  await processDevice('iphone');
  await processDevice('ipad');
  console.log(`\n✓ Done. Marketing-ready screenshots → ${OUTPUT_DIR}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
