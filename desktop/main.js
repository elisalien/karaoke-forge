/* ============================================================================
   KARAOKE FORGE — coque de bureau (Electron)
   ----------------------------------------------------------------------------
   Une fenêtre native qui charge karaoke-forge.html depuis un schéma privé
   (kf://app/…) : pas de navigateur, pas de serveur, pas d'onglets. Le
   companion (Ableton Link via Carabiner, audio YouTube via yt-dlp) tourne
   dans un processus utilitaire lancé avec l'app.

   Lancement :  npm start            (développement, charge ../karaoke-forge.html)
                electron . --selftest (exécute l'autotest de l'app et sort)
   ============================================================================ */
'use strict';
const { app, BrowserWindow, protocol, net, shell, utilityProcess, Menu, session, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

/* En développement, l'app vit dans le dossier parent ; une fois empaquetée,
   prepare.mjs a copié karaoke-forge.html et companion/ dans desktop/app/.   */
const APP_DIR = app.isPackaged || !fs.existsSync(path.join(__dirname, '..', 'karaoke-forge.html'))
  ? path.join(__dirname, 'app') : path.join(__dirname, '..');
const SELFTEST = process.argv.includes('--selftest');
const SCHEME = 'kf';

protocol.registerSchemesAsPrivileged([{
  scheme: SCHEME,
  privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true }
}]);

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');   // le son part sans clic préalable
app.commandLine.appendSwitch('disable-renderer-backgrounding');                 // l'horloge ne ralentit pas en arrière-plan
app.setName('Karaoke Forge');

if (!app.requestSingleInstanceLock() && !SELFTEST) { app.quit(); }

/* ------------------------------------------------------- état de fenêtre --- */
const STATE_FILE = () => path.join(app.getPath('userData'), 'window.json');
function loadState() { try { return JSON.parse(fs.readFileSync(STATE_FILE(), 'utf8')); } catch (e) { return {}; } }
function saveState(win) {
  if (!win || win.isDestroyed()) return;
  const b = win.isMaximized() || win.isFullScreen() ? loadState().bounds : win.getBounds();
  try { fs.writeFileSync(STATE_FILE(), JSON.stringify({ bounds: b, max: win.isMaximized() })); } catch (e) { }
}

/* --------------------------------------------------------------- fenêtres --- */
let main = null, companion = null;

function createMain() {
  const st = loadState();
  const win = new BrowserWindow({
    width: 1600, height: 920, minWidth: 1000, minHeight: 640,
    ...(st.bounds || {}),
    show: !SELFTEST,
    title: 'Karaoke Forge',
    backgroundColor: '#15171a',
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'build', 'icon.ico'),
    webPreferences: {
      contextIsolation: true, nodeIntegration: false, sandbox: true,
      backgroundThrottling: false, spellcheck: false
    }
  });
  if (st.max && !SELFTEST) win.maximize();
  wireWindow(win);
  win.on('close', () => saveState(win));
  win.on('resize', () => saveState(win));
  win.on('move', () => saveState(win));
  win.loadURL(`${SCHEME}://app/karaoke-forge.html${SELFTEST ? '?selftest' : ''}`);
  return win;
}

/** Réglages communs à la fenêtre de contrôle et à l'écran scène. */
function wireWindow(win) {
  const wc = win.webContents;
  // F12 / Ctrl+Maj+I : outils de développement (il n'y a pas de menu)
  wc.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) { wc.toggleDevTools(); e.preventDefault(); }
    if (input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
  });
  // l'écran scène s'ouvre par window.open : une seconde fenêtre native, même origine
  wc.setWindowOpenHandler(({ url, frameName }) => {
    if (url.startsWith(SCHEME + '://')) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 1280, height: 720, backgroundColor: '#000000', autoHideMenuBar: true, title: 'Karaoke Forge — écran scène',
          icon: path.join(__dirname, 'build', 'icon.ico'),
          webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false }
        }
      };
    }
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  wc.on('did-create-window', child => wireWindow(child));
  // aucune navigation hors de l'app : les liens d'aide s'ouvrent dans le navigateur du système
  wc.on('will-navigate', (e, url) => { if (!url.startsWith(SCHEME + '://')) { e.preventDefault(); if (/^https?:/.test(url)) shell.openExternal(url); } });
  wc.on('render-process-gone', (e, d) => {
    if (d.reason === 'clean-exit') return;
    dialog.showMessageBox(win, { type: 'error', title: 'Karaoke Forge', message: 'L\'affichage a planté (' + d.reason + '). La fenêtre va se recharger.' })
      .then(() => wc.reload());
  });
}

/* --------------------------------------------------------------- autotest --- */
function runSelfTest(win) {
  const wc = win.webContents;
  const lines = [];
  let errors = 0;
  wc.on('console-message', ev => {               // Electron ≥ 32 : un objet { level, message }
    const level = ev.level, msg = ev.message;
    const isErr = level === 'error';
    if (isErr) errors++;
    lines.push((isErr ? '[ERREUR] ' : '') + msg);
    process.stdout.write((isErr ? '  ! ' : '    ') + msg + '\n');
  });
  wc.once('did-finish-load', async () => {
    let result;
    try {
      result = await wc.executeJavaScript('(typeof __selfTest === "function" ? __selfTest() : Promise.reject(new Error("__selfTest absent")))', true);
    } catch (e) { result = { ok: false, failed: [String(e && e.message || e)], passed: [] }; }
    const ok = result && result.ok && errors === 0;
    process.stdout.write(`\n${result.passed.length} vérification(s) réussie(s), ${result.failed.length} échec(s), ${errors} erreur(s) console\n`);
    for (const f of result.failed) process.stdout.write('  ✗ ' + f + '\n');
    process.stdout.write(ok ? 'AUTOTEST OK\n' : 'AUTOTEST ÉCHOUÉ\n');
    app.exit(ok ? 0 : 1);
  });
  setTimeout(() => { process.stdout.write('AUTOTEST : délai dépassé\n'); app.exit(2); }, 90000);
}

/* ------------------------------------------------------------- companion --- */
function startCompanion() {
  const script = path.join(APP_DIR, 'companion', 'forge-companion.js');
  if (!fs.existsSync(script)) return;
  const binDir = path.join(app.getPath('userData'), 'bin');
  const cacheDir = path.join(app.getPath('userData'), 'cache-youtube');
  try { fs.mkdirSync(binDir, { recursive: true }); } catch (e) { }
  companion = utilityProcess.fork(script, [], {
    env: { ...process.env, FORGE_EMBEDDED: '1', FORGE_CACHE_DIR: cacheDir, YT_BIN_DIR: process.env.YT_BIN_DIR || binDir },
    stdio: 'pipe', serviceName: 'forge-companion'
  });
  companion.stdout.on('data', d => process.stdout.write('[companion] ' + d));
  companion.stderr.on('data', d => process.stderr.write('[companion] ' + d));
  companion.on('exit', () => { companion = null; });
}

/* ------------------------------------------------------------------ démarrage */
app.whenReady().then(() => {
  // kf://app/<fichier> → dossier de l'app, et rien d'autre
  protocol.handle(SCHEME, req => {
    const u = new URL(req.url);
    let rel = decodeURIComponent(u.pathname).replace(/^\/+/, '') || 'karaoke-forge.html';
    const file = path.normalize(path.join(APP_DIR, rel));
    if (!file.startsWith(path.normalize(APP_DIR))) return new Response('Forbidden', { status: 403 });
    return net.fetch(pathToFileURL(file).toString());
  });
  session.defaultSession.setPermissionRequestHandler((wc, permission, cb) => cb(true));
  Menu.setApplicationMenu(null);          // les raccourcis (Ctrl+Z…) appartiennent à l'app, pas à un menu

  startCompanion();                       // aussi pendant l'autotest : il vérifie que le companion répond
  main = createMain();
  if (SELFTEST) runSelfTest(main);

  app.on('second-instance', () => { if (main) { if (main.isMinimized()) main.restore(); main.focus(); } });
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) main = createMain(); });
});

app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => { if (companion) { try { companion.kill(); } catch (e) { } } });
