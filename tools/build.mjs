/* Karaoke Forge — assemblage du fichier unique.
   node tools/build.mjs            → écrit karaoke-forge.html
   node tools/build.mjs --check    → vérifie aussi la syntaxe du JS assemblé

   Aucune dépendance : le code source vit dans src/, découpé par thème, et
   ce script le recolle dans l'ordre alphabétique des fichiers (préfixes
   numériques). Tout tourne dans un seul <script> : les modules partagent
   la même portée, comme dans le fichier d'origine. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'karaoke-forge.html');

const read = f => fs.readFileSync(path.join(SRC, f), 'utf8').replace(/\r\n/g, '\n');
const listDir = (dir, ext) => fs.readdirSync(path.join(SRC, dir))
  .filter(f => f.endsWith(ext)).sort().map(f => dir + '/' + f);

const css = listDir('css', '.css').map(read).join('');
const js = listDir('js', '.js').map(read).join('');
const vendor = listDir('vendor', '.js').map(read).join('');
const body = read('body.html');

// function replacers: a "$" in the sources must never be read as a pattern
const html = read('index.html')
  .replace('/*@CSS*/', () => css)
  .replace('<!--@BODY-->', () => body)
  .replace('/*@VENDOR*/', () => vendor)
  .replace('/*@JS*/', () => js);

if (process.argv.includes('--check')) {
  for (const [name, code] of [['vendor', vendor], ['app', js]]) {
    try { new vm.Script(code, { filename: name + '.js' }); }
    catch (e) { console.error(`Erreur de syntaxe (${name}) :`, e.message); process.exit(1); }
  }
}

fs.writeFileSync(OUT, html);
console.log(`karaoke-forge.html — ${(html.length / 1024).toFixed(0)} Ko, ${js.split('\n').length} lignes d'app`);
