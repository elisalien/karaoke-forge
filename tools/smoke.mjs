/* Autotest de bout en bout : reconstruit l'app, puis la lance dans la coque
   Electron (fenêtre cachée) et exécute __selfTest(). Échoue sur toute
   assertion ratée ou toute erreur console.
     node tools/smoke.mjs
   Prérequis : `npm install` dans desktop/ (une fois).                      */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DESK = path.join(ROOT, 'desktop');
const electron = path.join(DESK, 'node_modules', '.bin', process.platform === 'win32' ? 'electron.cmd' : 'electron');

let r = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'build.mjs'), '--check'], { stdio: 'inherit' });
if (r.status) process.exit(r.status);

if (!fs.existsSync(electron)) {
  console.log('Electron absent : lance `npm install` dans desktop/ pour activer l\'autotest complet.');
  process.exit(0);
}
r = spawnSync(electron, ['.', '--selftest'], { cwd: DESK, stdio: 'inherit', shell: process.platform === 'win32' });
process.exit(r.status == null ? 1 : r.status);
