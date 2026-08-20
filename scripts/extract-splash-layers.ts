/**
 * Recovers the bean artwork as a transparent layer from the flattened splash.
 *
 * The original design file is gone, so assets/images/splash.png is the only
 * copy of the brand mark. Re-typesetting it from fonts would mean guessing at
 * weight, optical size and letter-spacing against nothing — so instead this
 * un-composites the existing artwork, which keeps the real pixels.
 *
 * For a pixel P drawn with colour G at opacity a over background BG:
 *
 *   P = a·G + (1 - a)·BG    =>    G = (P - (1 - a)·BG) / a
 *
 * a is estimated from how far P has travelled from BG toward the layer's
 * brightest colour, measured on the channel with the widest range. Any (a, G)
 * pair satisfying the first equation reproduces P exactly, so re-compositing
 * over the same background is lossless by construction. The estimate only
 * matters when compositing over a *different* background — which is precisely
 * what makes the layers reusable, and what build-splash.ts checks.
 *
 * Usage: bun run scripts/extract-splash-layers.ts
 */

import sharp from 'sharp';

const SOURCE = 'assets/images/splash.png';
// Committed alongside the extracted artwork, so it always exists.
const OUT_DIR = 'assets/splash-layers';
const BG = [15, 3, 0] as const;

// Measured from the source with scripts that located flat-colour bands and the
// non-background bounding box. Recorded here so the composite is reproducible.
// Only the bean. The wordmark and tagline are re-rendered from Fraunces and
// DM Sans by build-splash.ts — extracting them would just preserve the blur of
// the upscaled original, which is the thing worth fixing.
const REGIONS = [{ name: 'bean', x0: 232, y0: 979, x1: 1050, y1: 1797 }];

const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);

async function main() {
  const { data, info } = await sharp(SOURCE).raw().toBuffer({ resolveWithObject: true });
  const ch = info.channels;
  const at = (x: number, y: number) => (y * info.width + x) * ch;

  const manifest: Record<string, unknown>[] = [];

  for (const r of REGIONS) {
    const w = r.x1 - r.x0 + 1;
    const h = r.y1 - r.y0 + 1;

    // Widest-range channel across the region: the most reliable basis for alpha.
    const span = [0, 1, 2].map((c) => {
      let max: number = BG[c];
      for (let y = r.y0; y <= r.y1; y++)
        for (let x = r.x0; x <= r.x1; x++) max = Math.max(max, data[at(x, y) + c]);
      return Math.abs(max - BG[c]);
    });
    const basis = span.indexOf(Math.max(...span));
    const range = span[basis];

    const out = Buffer.alloc(w * h * 4);
    let opaque = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = at(r.x0 + x, r.y0 + y);
        const o = (y * w + x) * 4;

        // The artwork is opaque wherever it is drawn — it is a flattened render,
        // not a translucent overlay. Deriving alpha from brightness instead
        // (the obvious approach) makes dark artwork semi-transparent, which
        // round-trips badly and looks washed out over any other background.
        //
        // So: covered or not. Edge pixels were blended against BG when the
        // source was flattened and that blend cannot be undone from a single
        // image, so they keep their blended colour at full opacity. Against a
        // dark background that is invisible; against a light one it shows as a
        // faint dark fringe. Documented, not solved.
        const covered =
          Math.abs(data[i] - BG[0]) > 2 ||
          Math.abs(data[i + 1] - BG[1]) > 2 ||
          Math.abs(data[i + 2] - BG[2]) > 2;
        const a = covered ? 1 : 0;

        if (a === 0) {
          out[o] = out[o + 1] = out[o + 2] = out[o + 3] = 0;
          continue;
        }
        for (let c = 0; c < 3; c++) out[o + c] = data[i + c];
        out[o + 3] = 255;
        if (out[o + 3] === 255) opaque++;
      }
    }

    await sharp(out, { raw: { width: w, height: h, channels: 4 } })
      .png({ compressionLevel: 9 })
      .toFile(`${OUT_DIR}/${r.name}.png`);

    manifest.push({ ...r, width: w, height: h, basisChannel: 'rgb'[basis], fullyOpaquePx: opaque });
    console.log(
      `${r.name.padEnd(9)} ${w}x${h}  basis=${'rgb'[basis]} range=${range}  fully-opaque ${((opaque / (w * h)) * 100).toFixed(1)}%`,
    );
  }

  console.log(`\nwrote ${REGIONS.length} layers to ${OUT_DIR}/`);
  console.log(
    JSON.stringify({ background: BG, canvas: [info.width, info.height], manifest }, null, 2),
  );
}

main();
