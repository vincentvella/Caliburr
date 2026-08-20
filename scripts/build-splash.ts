/**
 * Generates assets/images/splash.png from fonts + artwork.
 *
 * The original design file is lost, and the shipped asset had two problems: an
 * opaque #100B08 matte baked in behind both text blocks, and text that had been
 * rendered small and upscaled (a 4-5px edge ramp where crisp type gives 1-2).
 * Correcting the matte alone would have preserved the blur, so the type is
 * re-rendered from the real brand fonts instead.
 *
 * Both faces and weights were identified by measurement rather than by eye,
 * against the original at matched glyph width, thresholding at the midpoint
 * between background and glyph so the comparison sees through the blur:
 *
 *   wordmark  Fraunces 700   ink coverage 39.79% vs 39.72%, stem 30px vs 30px
 *             (600 was -14.9%, 800 was +7.2%)
 *   tagline   DM Sans 400    ink coverage +6.5% (500 was +23.7%)
 *
 * Colours are the peak (least blur-affected) pixels from the original; they are
 * not palette tokens. The bean is illustration, not type, so it is reused as
 * extracted artwork — see extract-splash-layers.ts.
 *
 * Requires Fraunces and DM Sans to be installed where fontconfig can see them
 * (~/Library/Fonts on macOS). sharp resolves SVG fonts through fontconfig and
 * silently falls back to a default face otherwise — which renders the wrong
 * typeface with no error, so this checks for it.
 *
 * Usage:
 *   bun run scripts/build-splash.ts             write assets/images/splash.png
 *   bun run scripts/build-splash.ts --out X     write elsewhere
 *   bun run scripts/build-splash.ts --verify    check layout against the original
 */

import sharp from 'sharp';

const CANVAS = { width: 1284, height: 2778 };
const BACKGROUND = '#0f0300';

// Glyph bounding boxes measured on the original, so the regenerated art lands
// exactly where the old one did.
const TEXT = [
  {
    name: 'wordmark',
    content: 'Caliburr',
    family: 'Fraunces',
    weight: 700,
    size: 171.6,
    fill: '#ffd617',
    box: { x: 285, y: 559, w: 722, h: 133 },
  },
  {
    name: 'tagline',
    content: 'Dial in your perfect cup.',
    family: 'DM Sans',
    weight: 400,
    size: 79.9,
    fill: '#fa9347',
    box: { x: 202, y: 2088, w: 869, h: 74 },
  },
];

const BEAN = { file: 'assets/splash-layers/bean.png', left: 232, top: 979 };

const arg = (flag: string) => {
  const i = process.argv.indexOf(flag);
  return i === -1 ? undefined : process.argv[i + 1];
};

function svg(t: (typeof TEXT)[number], width: number, height: number) {
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">` +
      `<text x="${width / 2}" y="${height * 0.7}" text-anchor="middle" ` +
      `font-family="${t.family}" font-size="${t.size}" font-weight="${t.weight}" ` +
      `fill="${t.fill}">${t.content}</text></svg>`,
  );
}

/** Bounding box of non-transparent pixels. */
async function inkBox(buf: Buffer) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -1,
    y1 = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * info.channels + 3] > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return { x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/**
 * fontconfig substitutes a default face for an unknown family without warning,
 * so an uninstalled font renders as the wrong typeface rather than failing.
 * Compare each family against a name that cannot exist.
 */
async function assertFontsResolve() {
  const probe = async (family: string) => {
    const buf = await sharp(svg({ ...TEXT[0], family, content: 'Caliburr' }, 900, 260))
      .png()
      .toBuffer();
    const { data } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
    let h = 0;
    for (let i = 0; i < data.length; i += 4) h = (h * 31 + data[i]) >>> 0;
    return h;
  };
  const fallback = await probe('__no_such_family__');
  for (const family of [...new Set(TEXT.map((t) => t.family))]) {
    if ((await probe(family)) === fallback) {
      throw new Error(
        `Font "${family}" is not visible to fontconfig — it would silently render ` +
          `as a fallback face. Install the TTFs from node_modules/@expo-google-fonts ` +
          `into ~/Library/Fonts and retry.`,
      );
    }
  }
}

async function main() {
  await assertFontsResolve();

  const layers: sharp.OverlayOptions[] = [{ input: BEAN.file, left: BEAN.left, top: BEAN.top }];

  for (const t of TEXT) {
    // Render oversized, then place by measured ink box so the glyphs land on the
    // original's coordinates regardless of font metrics or baseline behaviour.
    const w = Math.round(t.box.w * 1.6);
    const h = Math.round(t.box.h * 2.4);
    const buf = await sharp(svg(t, w, h))
      .png()
      .toBuffer();
    const ink = await inkBox(buf);
    // Crop to the glyphs before compositing: the render canvas is deliberately
    // oversized to avoid clipping, which would otherwise exceed the target
    // canvas and force negative offsets.
    const cropped = await sharp(buf)
      .extract({ left: ink.x0, top: ink.y0, width: ink.w, height: ink.h })
      .png()
      .toBuffer();
    layers.push({ input: cropped, left: t.box.x, top: t.box.y });
    const dw = ink.w - t.box.w;
    const dh = ink.h - t.box.h;
    console.log(
      `${t.name.padEnd(9)} ${t.family} ${t.weight} @ ${t.size}px  ` +
        `ink ${ink.w}x${ink.h}  target ${t.box.w}x${t.box.h}  ` +
        `delta ${dw >= 0 ? '+' : ''}${dw}x${dh >= 0 ? '+' : ''}${dh}`,
    );
  }

  const out = await sharp({ create: { ...CANVAS, channels: 4, background: BACKGROUND } })
    .composite(layers)
    .png({ compressionLevel: 9 })
    .toBuffer();

  if (process.argv.includes('--verify')) {
    const a = await sharp('assets/images/splash.png').raw().toBuffer({ resolveWithObject: true });
    const b = await sharp(out).raw().toBuffer({ resolveWithObject: true });
    let diff = 0;
    for (let i = 0; i < a.data.length; i += a.info.channels) {
      let d = 0;
      for (let c = 0; c < 3; c++) d = Math.max(d, Math.abs(a.data[i + c] - b.data[i + c]));
      if (d > 24) diff++;
    }
    // Not expected to match pixel-for-pixel: the point is that the new type is
    // sharper. This only catches gross layout drift.
    const pct = (diff / (a.info.width * a.info.height)) * 100;
    console.log(`\npixels differing by >24 levels: ${diff} (${pct.toFixed(2)}%)`);
    console.log(pct < 3 ? 'layout matches the original' : 'LAYOUT DRIFT — inspect before using');
    process.exit(pct < 3 ? 0 : 1);
  }

  const dest = arg('--out') ?? 'assets/images/splash.png';
  await sharp(out).toFile(dest);
  console.log(`\nwrote ${dest} (${CANVAS.width}x${CANVAS.height})`);
}

main();
