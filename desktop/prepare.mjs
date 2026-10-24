/* Prépare le dossier desktop/app/ pour l'empaquetage :
     · reconstruit karaoke-forge.html depuis src/ (avec vérification de syntaxe) ;
     · copie le fichier et le companion dans desktop/app/ ;
     · génère l'icône si elle manque.
   node desktop/prepare.mjs   (appelé par npm run dist)                      */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const APP = path.join(HERE, 'app');

execFileSync(process.execPath, [path.join(ROOT, 'tools', 'build.mjs'), '--check'], { stdio: 'inherit' });

fs.rmSync(APP, { recursive: true, force: true });
fs.mkdirSync(path.join(APP, 'companion'), { recursive: true });
fs.copyFileSync(path.join(ROOT, 'karaoke-forge.html'), path.join(APP, 'karaoke-forge.html'));
fs.copyFileSync(path.join(ROOT, 'companion', 'forge-companion.js'), path.join(APP, 'companion', 'forge-companion.js'));
fs.copyFileSync(path.join(ROOT, 'companion', 'LISEZ-MOI.md'), path.join(APP, 'companion', 'LISEZ-MOI.md'));

if (!fs.existsSync(path.join(HERE, 'build', 'icon.ico'))) {
  execFileSync(process.execPath, [path.join(HERE, 'make-icon.mjs')], { stdio: 'inherit' });
}
console.log('desktop/app/ prêt');
