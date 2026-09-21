/**
 * Generates real PNG app icons with zero dependencies.
 * Design: deep-teal rounded square (light-theme primary) with a white
 * motion swoosh + head dot — an abstract figure in movement.
 *
 * Run: node scripts/generate-icons.mjs   (also: npm run generate-icons)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");
mkdirSync(outDir, { recursive: true });

/* ---------------- CRC32 + PNG encoder ---------------- */
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c;
}
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePNG(w, h, px) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const stride = 1 + w * 4;
  const raw = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    raw[y * stride] = 0; // filter type 0 (None)
    for (let x = 0; x < w; x++) {
      const o = y * stride + 1 + x * 4;
      const p = (y * w + x) * 4;
      raw[o] = px[p]; raw[o + 1] = px[p + 1]; raw[o + 2] = px[p + 2]; raw[o + 3] = px[p + 3];
    }
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ---------------- Design ---------------- */
const TOP = [47, 152, 140];   // lighter medical teal
const BOTTOM = [13, 88, 81];  // deep teal
const WHITE = [255, 255, 255];

// Cubic bezier control points (unit space) for the motion swoosh
const P0 = [0.15, 0.76], P1 = [0.37, 0.74], P2 = [0.44, 0.35], P3 = [0.72, 0.35];
const HEAD = [0.765, 0.19]; // "head" dot — the figure in motion
const STROKE = 0.078;
const HEAD_R = 0.058;

function bezierPoint(t) {
  const u = 1 - t;
  return [
    u * u * u * P0[0] + 3 * u * u * t * P1[0] + 3 * u * t * t * P2[0] + t * t * t * P3[0],
    u * u * u * P0[1] + 3 * u * u * t * P1[1] + 3 * u * t * t * P2[1] + t * t * t * P3[1],
  ];
}
// Precompute polyline once
const SEGMENTS = 160;
const poly = [];
for (let i = 0; i <= SEGMENTS; i++) poly.push(bezierPoint(i / SEGMENTS));

function distToPolyline(x, y) {
  let best = Infinity;
  for (let i = 0; i < SEGMENTS; i++) {
    const ax = poly[i][0], ay = poly[i][1];
    const bx = poly[i + 1][0], by = poly[i + 1][1];
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    let t = len2 === 0 ? 0 : ((x - ax) * dx + (y - ay) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    const px = ax + t * dx - x, py = ay + t * dy - y;
    const d = px * px + py * py;
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}

function lerp(a, b, t) { return a + (b - a) * t; }

function render(size, { rounded, markScale }) {
  const px = Buffer.alloc(size * size * 4);
  const radius = 0.225; // rounded-corner radius (unit space)
  for (let y = 0; y < size; y++) {
    const v = (y + 0.5) / size;
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size;
      const o = (y * size + x) * 4;

      // Background: rounded rect (or full bleed), vertical teal gradient
      let inBg;
      if (rounded) {
        const qx = Math.abs(u - 0.5) - (0.5 - radius);
        const qy = Math.abs(v - 0.5) - (0.5 - radius);
        const cx = Math.max(qx, 0), cy = Math.max(qy, 0);
        inBg = Math.hypot(cx, cy) <= radius;
      } else {
        inBg = true;
      }
      if (!inBg) {
        px[o + 3] = 0;
        continue;
      }
      px[o] = Math.round(lerp(TOP[0], BOTTOM[0], v));
      px[o + 1] = Math.round(lerp(TOP[1], BOTTOM[1], v));
      px[o + 2] = Math.round(lerp(TOP[2], BOTTOM[2], v));
      px[o + 3] = 255;

      // Mark, optionally scaled toward the centre (maskable safe zone)
      const mu = 0.5 + (u - 0.5) / markScale;
      const mv = 0.5 + (v - 0.5) / markScale;

      const dCurve = distToPolyline(mu, mv);
      const dHead = Math.hypot(mu - HEAD[0], mv - HEAD[1]);
      if (dCurve <= STROKE / 2 || dHead <= HEAD_R) {
        // Crisp white mark; slight soft edge via 1px AA
        const edge = Math.min(dCurve - STROKE / 2, dHead - HEAD_R);
        const aa = edge > 0 ? Math.max(0, 1 - edge * size) : 1;
        const a = Math.min(1, aa);
        px[o] = Math.round(lerp(px[o], WHITE[0], a));
        px[o + 1] = Math.round(lerp(px[o + 1], WHITE[1], a));
        px[o + 2] = Math.round(lerp(px[o + 2], WHITE[2], a));
      }
    }
  }
  return px;
}

const targets = [
  { name: "icon-192.png", size: 192, rounded: true, markScale: 1 },
  { name: "icon-512.png", size: 512, rounded: true, markScale: 1 },
  { name: "maskable-192.png", size: 192, rounded: false, markScale: 0.78 },
  { name: "maskable-512.png", size: 512, rounded: false, markScale: 0.78 },
  { name: "apple-touch-icon.png", size: 180, rounded: false, markScale: 0.85 },
];

for (const t of targets) {
  const png = encodePNG(t.size, t.size, render(t.size, t));
  writeFileSync(join(outDir, t.name), png);
  console.log(`wrote ${t.name} (${t.size}x${t.size}, ${png.length} bytes)`);
}
