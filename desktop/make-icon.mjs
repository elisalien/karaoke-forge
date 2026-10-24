/* Génère build/icon.ico (256 px, PNG embarqué) et build/icon.png sans aucune
   dépendance : un carré arrondi anthracite, une onde et un triangle cyan.
   node desktop/make-icon.mjs                                                 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const N = 256;
const px = new Uint8Array(N * N * 4);

const BG = [0x1c, 0x1f, 0x24], ACC = [0x3f, 0xb8, 0xd8], TXT = [0xe6, 0xe8, 0xeb];
const put = (x, y, c, a = 1) => {
  if (x < 0 || y < 0 || x >= N || y >= N) return;
  const i = (y * N + x) * 4, a0 = px[i + 3] / 255, na = a + a0 * (1 - a);
  for (let k = 0; k < 3; k++) px[i + k] = Math.round((c[k] * a + px[i + k] * a0 * (1 - a)) / (na || 1));
  px[i + 3] = Math.round(na * 255);
};
/* carré arrondi, bord anticrénelé */
const R = 56, M = 8;
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
  const cx = Math.min(Math.max(x, M + R), N - 1 - M - R), cy = Math.min(Math.max(y, M + R), N - 1 - M - R);
  const d = Math.hypot(x - cx, y - cy) - R;
  const a = Math.max(0, Math.min(1, .5 - d));
  if (a > 0 && x >= M && y >= M && x < N - M && y < N - M) put(x, y, BG, a);
}
/* onde : barres verticales cyan, amplitude variée */
const bars = [.25, .5, .8, .45, 1, .6, .35, .7, .5, .3];
const bw = 12, gap = 8, total = bars.length * bw + (bars.length - 1) * gap, x0 = (N - total) / 2, mid = 150;
bars.forEach((h, i) => {
  const bx = Math.round(x0 + i * (bw + gap)), hh = Math.round(h * 70);
  for (let y = mid - hh; y <= mid + hh; y++) for (let x = bx; x < bx + bw; x++) put(x, y, i % 3 === 1 ? TXT : ACC, 1);
});
/* petit triangle de lecture en haut */
for (let y = 40; y < 92; y++) {
  const t = (y - 40) / 52, half = t < .5 ? t * 2 : (1 - t) * 2;
  const w = Math.round(half * 30);
  for (let x = 113; x < 113 + w; x++) put(x, y, ACC, 1);
}

/* ---- PNG ---- */
const crcT = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc = b => { let c = -1; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const be32 = n => Buffer.from([(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]);
const chunk = (type, data) => { const t = Buffer.from(type, 'latin1'); return Buffer.concat([be32(data.length), t, data, be32(crc(Buffer.concat([t, data])))]); };
const raw = Buffer.alloc((N * 4 + 1) * N);
for (let y = 0; y < N; y++) { raw[y * (N * 4 + 1)] = 0; Buffer.from(px.buffer, y * N * 4, N * 4).copy(raw, y * (N * 4 + 1) + 1); }
const ihdr = Buffer.concat([be32(N), be32(N), Buffer.from([8, 6, 0, 0, 0])]);
const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);

/* ---- ICO : un seul membre, PNG 256×256 ---- */
const head = Buffer.alloc(6 + 16);
head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(1, 4);
head[6] = 0; head[7] = 0; head[8] = 0; head[9] = 0;
head.writeUInt16LE(1, 10); head.writeUInt16LE(32, 12);
head.writeUInt32LE(png.length, 14); head.writeUInt32LE(22, 18);

fs.mkdirSync(path.join(HERE, 'build'), { recursive: true });
fs.writeFileSync(path.join(HERE, 'build', 'icon.ico'), Buffer.concat([head, png]));
fs.writeFileSync(path.join(HERE, 'build', 'icon.png'), png);
console.log('icône écrite : desktop/build/icon.ico');
