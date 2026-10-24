/* Serveur statique minimal pour Karaoke Forge — aucune dependance.
   Lance par START-FORGE.bat :  node _forge-server.js <port>
   Sert uniquement le dossier courant, en ecoute sur 127.0.0.1. */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.argv[2], 10) || 8777;
const ROOT = __dirname;
/* --autoexit : lance par START-FORGE.bat en arriere-plan. La page envoie un
   signe de vie (POST /__alive) toutes les 20 s ; une minute sans nouvelles
   et le serveur s'eteint. S'il n'en recoit jamais (navigateur jamais ouvert),
   il s'eteint au bout de trois minutes. */
const AUTOEXIT = process.argv.includes('--autoexit');
let lastAlive = 0;
const started = Date.now();
if (AUTOEXIT) setInterval(() => {
  const now = Date.now();
  if ((lastAlive && now - lastAlive > 60e3) || (!lastAlive && now - started > 180e3)) process.exit(0);
}, 5000);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4', '.flac': 'audio/flac', '.mp4': 'video/mp4'
};

http.createServer((req, res) => {
  let rel;
  try { rel = decodeURIComponent(new URL(req.url, 'http://x').pathname); }
  catch { res.writeHead(400).end('Bad request'); return; }
  if (rel === '/__alive') { lastAlive = Date.now(); res.writeHead(204).end(); return; }
  if (rel === '/') rel = '/karaoke-forge.html';

  // interdit toute remontee hors du dossier
  const file = path.join(ROOT, path.normalize(rel).replace(/^([\\/])+/, ''));
  if (!file.startsWith(ROOT)) { res.writeHead(403).end('Forbidden'); return; }

  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404).end('Not found'); return; }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Content-Length': st.size,
      'Cache-Control': 'no-store'
    });
    fs.createReadStream(file).pipe(res);
  });
}).listen(PORT, '127.0.0.1', () => {
  console.log('Karaoke Forge : http://127.0.0.1:' + PORT + '/karaoke-forge.html');
});
