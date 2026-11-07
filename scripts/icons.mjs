// Generates public/icon-{16,48,128}.png: a lime rounded square with a dark slash. Run: node scripts/icons.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const crcT = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = b => ~b.reduce((c, x) => crcT[(c ^ x) & 255] ^ (c >>> 8), ~0) >>> 0;
const chunk = (t, d) => {
  const b = Buffer.concat([Buffer.from(t), d]);
  const out = Buffer.alloc(b.length + 8);
  out.writeUInt32BE(d.length, 0);
  b.copy(out, 4);
  out.writeUInt32BE(crc(b), b.length + 4);
  return out;
};

function png(size) {
  const S = 4; // supersample
  const raw = Buffer.alloc(size * (size * 4 + 1));
  const r = size * 0.22;
  const inRound = (x, y) => {
    const dx = Math.max(r - x, 0, x - (size - r));
    const dy = Math.max(r - y, 0, y - (size - r));
    return dx * dx + dy * dy <= r * r;
  };
  // slash: line from (0.36,0.80) to (0.64,0.20), thickness 0.15
  const [x1, y1, x2, y2, hw] = [0.36 * size, 0.8 * size, 0.64 * size, 0.2 * size, 0.075 * size];
  const onSlash = (x, y) => {
    const t = Math.max(0, Math.min(1, ((x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)) / ((x2 - x1) ** 2 + (y2 - y1) ** 2)));
    return Math.hypot(x - (x1 + t * (x2 - x1)), y - (y1 + t * (y2 - y1))) <= hw;
  };
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      let a = 0, s = 0;
      for (let j = 0; j < S; j++)
        for (let i = 0; i < S; i++) {
          const px = x + (i + 0.5) / S, py = y + (j + 0.5) / S;
          if (inRound(px, py)) { a++; if (onSlash(px, py)) s++; }
        }
      const n = S * S, o = y * (size * 4 + 1) + 1 + x * 4;
      const k = a ? s / a : 0; // blend lime -> ink
      raw[o] = 190 + (24 - 190) * k; raw[o + 1] = 240 + (28 - 240) * k; raw[o + 2] = 90 + (20 - 90) * k;
      raw[o + 3] = Math.round((a / n) * 255);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

for (const s of [16, 48, 128]) writeFileSync(`public/icon-${s}.png`, png(s));
