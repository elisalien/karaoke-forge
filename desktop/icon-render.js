/* Rendu de l'icône : lancé par make-icon.mjs dans Electron (fenêtre hors
   écran, fond transparent). Dessine le SVG de la marque à chaque taille et
   écrit build/icon-<taille>.png. Pas d'autre dépendance que Chromium.

   La marque : un carré arrondi anthracite, deux ou trois lignes de paroles ;
   la ligne du milieu est remplie en cyan jusqu'au front de karaoké. Aux
   petites tailles, deux lignes plus épaisses : lisible à 16 px.          */
'use strict';
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'build');
const SIZES = [16, 20, 24, 32, 40, 48, 64, 128, 256, 512];

function svg(size) {
  const small = size <= 32;
  const bars = small
    ? [{ y: 78, h: 44, w: 148, fill: '#b9c1cb' }, { y: 140, h: 44, w: 148, fill: '#5f6771', acc: 96 }]
    : [{ y: 70, h: 30, w: 150, fill: '#c3cad3' }, { y: 113, h: 30, w: 150, fill: '#6a737d', acc: 98 }, { y: 156, h: 30, w: 118, fill: '#6a737d' }];
  const x0 = 54, r = 60;
  let body = '';
  for (const b of bars) {
    body += `<rect x="${x0}" y="${b.y}" width="${b.w}" height="${b.h}" rx="${b.h / 2}" fill="${b.fill}"/>`;
    if (b.acc) body += `<rect x="${x0}" y="${b.y}" width="${b.acc}" height="${b.h}" rx="${b.h / 2}" fill="#3fb8d8"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="${size}" height="${size}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#262a30"/><stop offset="1" stop-color="#17191d"/></linearGradient></defs>
    <rect x="8" y="8" width="240" height="240" rx="${r}" fill="url(#g)"/>
    <rect x="9" y="9" width="238" height="238" rx="${r - 1}" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="2"/>
    ${body}
    ${small ? '' : `<rect x="${x0 + 98 - 3}" y="104" width="6" height="48" rx="3" fill="#ffffff" opacity=".92"/>`}
  </svg>`;
}

async function render(size) {
  const win = new BrowserWindow({
    width: size, height: size, show: false, frame: false, transparent: true, backgroundColor: '#00000000',
    webPreferences: { offscreen: true, backgroundThrottling: false }
  });
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:transparent;overflow:hidden}svg{display:block}</style></head><body>${svg(size)}</body></html>`;
  const img = await new Promise((resolve, reject) => {
    let frames = 0;
    win.webContents.on('paint', (e, dirty, image) => { if (++frames >= 2) resolve(image); });   // la 2e image est stable
    win.webContents.on('did-fail-load', (e, code, desc) => reject(new Error(desc)));
    win.webContents.setFrameRate(30);
    win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    setTimeout(() => reject(new Error('pas de rendu pour ' + size)), 8000);
  });
  fs.writeFileSync(path.join(OUT, `icon-${size}.png`), img.resize({ width: size, height: size }).toPNG());
  win.destroy();
}

app.disableHardwareAcceleration();
app.on('window-all-closed', () => { });     // chaque taille a sa fenêtre : la fermer ne quitte pas
app.whenReady().then(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  try { for (const s of SIZES) await render(s); process.stdout.write('rendu : ' + SIZES.join(', ') + ' px\n'); app.exit(0); }
  catch (e) { console.error(e); app.exit(1); }
});
