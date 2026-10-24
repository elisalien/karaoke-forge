/* Génère l'icône de l'application :
     build/icon.ico   — 16, 20, 24, 32, 40, 48, 64, 128, 256 px (PNG embarqués)
     build/icon.png   — 512 px, pour le site et la documentation
   Le dessin est rendu par Chromium (desktop/icon-render.js) ; ce script
   assemble le .ico. Aucune dépendance en dehors d'Electron.
   node desktop/make-icon.mjs                                                 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url));
/** L'exécutable Electron installé (sans passer par un .cmd ni un shell). */
function electronExe(deskDir) {
  const dist = path.join(deskDir, 'node_modules', 'electron', 'dist');
  const txt = path.join(deskDir, 'node_modules', 'electron', 'path.txt');
  if (!fs.existsSync(txt)) return null;
  const exe = path.join(dist, fs.readFileSync(txt, 'utf8').trim());
  return fs.existsSync(exe) ? exe : null;
}

const BUILD = path.join(HERE, 'build');
const electron = electronExe(HERE);
if (!electron) { console.error('Electron absent : lance `npm install` dans desktop/'); process.exit(1); }

const r = spawnSync(electron, [path.join(HERE, 'icon-render.js')], { stdio: 'inherit' });
if (r.status) process.exit(r.status);

const ICO_SIZES = [16, 20, 24, 32, 40, 48, 64, 128, 256];
const pngs = ICO_SIZES.map(s => ({ s, data: fs.readFileSync(path.join(BUILD, `icon-${s}.png`)) }));
const head = Buffer.alloc(6 + 16 * pngs.length);
head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(pngs.length, 4);
let off = head.length;
pngs.forEach((p, i) => {
  const e = 6 + 16 * i;
  head[e] = p.s >= 256 ? 0 : p.s; head[e + 1] = p.s >= 256 ? 0 : p.s;
  head[e + 2] = 0; head[e + 3] = 0;
  head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6);
  head.writeUInt32LE(p.data.length, e + 8); head.writeUInt32LE(off, e + 12);
  off += p.data.length;
});
fs.writeFileSync(path.join(BUILD, 'icon.ico'), Buffer.concat([head, ...pngs.map(p => p.data)]));
fs.copyFileSync(path.join(BUILD, 'icon-512.png'), path.join(BUILD, 'icon.png'));
for (const s of [20, 40, 64, 128, 512].concat(ICO_SIZES)) { try { if (s !== 512) fs.unlinkSync(path.join(BUILD, `icon-${s}.png`)); } catch (e) { } }
try { fs.unlinkSync(path.join(BUILD, 'icon-512.png')); } catch (e) { }
console.log(`icône écrite : desktop/build/icon.ico (${pngs.length} tailles) et icon.png`);
