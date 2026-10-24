/* ============================================================================
   KARAOKE FORGE — companion (facultatif)
   ----------------------------------------------------------------------------
   node forge-companion.js          (ou START-COMPANION.bat)

   Ce que le navigateur ne sait pas faire seul :
     · Ableton Link, via Carabiner (TCP 17000)  →  GET /link  (flux SSE)
     · YouTube, via yt-dlp                       →  GET /search?q=   GET /download?id=
   N'écoute que sur 127.0.0.1. Aucune dépendance : Node suffit.

   yt-dlp (et ffmpeg) sont cherchés, dans l'ordre : dossier de la variable
   YT_BIN_DIR, dossier « bin » à côté de ce fichier, puis le PATH.
   ============================================================================ */
'use strict';
const http = require('http');
const net = require('net');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PORT = +process.env.FORGE_COMPANION_PORT || 17002;
const CARABINER_PORT = +process.env.CARABINER_PORT || 17000;
const SEARCH_TIMEOUT = 30e3, DOWNLOAD_TIMEOUT = 5 * 60e3;

/* ------------------------------------------------------------ binaires --- */
const exe = n => (process.platform === 'win32' ? n + '.exe' : n);
function findInPath(name) {
  for (const dir of (process.env.PATH || '').split(path.delimiter)) {
    if (dir && fs.existsSync(path.join(dir, name))) return path.join(dir, name);
  }
  return null;
}
const BIN_DIR = [process.env.YT_BIN_DIR, path.join(__dirname, 'bin'), 'D:\\CREA\\TOOLS\\yt-dlp-4k-windows (2)\\bin']
  .filter(Boolean).find(d => fs.existsSync(path.join(d, exe('yt-dlp')))) || null;
const YTDLP = BIN_DIR ? path.join(BIN_DIR, exe('yt-dlp')) : findInPath(exe('yt-dlp'));
const FFMPEG = BIN_DIR && fs.existsSync(path.join(BIN_DIR, exe('ffmpeg'))) ? path.join(BIN_DIR, exe('ffmpeg')) : findInPath(exe('ffmpeg'));
const childEnv = { ...process.env, PATH: (BIN_DIR ? BIN_DIR + path.delimiter : '') + (process.env.PATH || '') };
const CACHE = process.env.FORGE_CACHE_DIR || path.join(__dirname, '.cache');
fs.mkdirSync(CACHE, { recursive: true });

/* ---------------------------------------------------- Ableton Link (SSE) --- */
let link = { tempo: 120, beat: 0, peers: 0, connected: false, at: Date.now() };
const listeners = new Set();

function pushLink() {
  const msg = `data: ${JSON.stringify({ ...link, age: Date.now() - link.at })}\n\n`;
  for (const res of listeners) res.write(msg);
}

function connectCarabiner() {
  const sock = net.connect(CARABINER_PORT, '127.0.0.1');
  let buf = '', timer = null;
  sock.on('connect', () => {
    console.log('[link] connecté à Carabiner');
    sock.write('status\n');
    timer = setInterval(() => { try { sock.write('status\n'); } catch (e) { } }, 400);
  });
  sock.on('data', chunk => {
    buf += chunk.toString();
    if (buf.length > 65536) buf = buf.slice(-4096);
    let nl;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line.startsWith('status')) continue;
      const bpm = /:bpm\s+([\d.]+)/.exec(line);
      if (!bpm) continue;
      const beat = /:beat\s+([\d.-]+)/.exec(line), peers = /:peers\s+(\d+)/.exec(line);
      link = { tempo: +bpm[1], beat: beat ? +beat[1] : 0, peers: peers ? +peers[1] : 0, connected: true, at: Date.now() };
      pushLink();
    }
  });
  sock.on('error', () => { });
  sock.on('close', () => {
    clearInterval(timer);
    if (link.connected) { link = { ...link, connected: false, peers: 0, at: Date.now() }; pushLink(); }
    setTimeout(connectCarabiner, 5000);
  });
}

/* ---------------------------------------------------------------- YouTube --- */
function parseVideoId(input) {
  const s = String(input || '').trim();
  let id = null;
  if (/^[\w-]{11}$/.test(s)) id = s;
  else {
    try {
      const u = new URL(s);
      if (u.hostname.includes('youtu.be')) id = u.pathname.slice(1, 12);
      else id = u.searchParams.get('v') || (u.pathname.match(/\/(?:shorts|embed|live)\/([\w-]{11})/) || [])[1];
    } catch (e) { }
  }
  return id && /^[\w-]{11}$/.test(id) ? id : null;
}

function run(args, timeout) {
  return new Promise((resolve, reject) => {
    if (!YTDLP) { reject(new Error('yt-dlp introuvable (voir companion/LISEZ-MOI.md)')); return; }
    const ps = spawn(YTDLP, args, { env: childEnv, windowsHide: true });
    let out = '', err = '';
    const kill = setTimeout(() => { ps.kill(); reject(new Error('yt-dlp ne répond plus')); }, timeout);
    ps.stdout.on('data', d => { out += d; });
    ps.stderr.on('data', d => { err += d; if (err.length > 20000) err = err.slice(-4000); });
    ps.on('error', e => { clearTimeout(kill); reject(e); });
    ps.on('close', code => { clearTimeout(kill); resolve({ code, out, err }); });
  });
}

async function ytSearch(q, n) {
  const { code, out, err } = await run([`ytsearch${n}:${q}`, '--dump-json', '--flat-playlist', '--no-warnings', '--ignore-errors'], SEARCH_TIMEOUT);
  const items = [];
  for (const line of out.split('\n')) {
    try {
      const j = JSON.parse(line);
      if (j.id) items.push({ id: j.id, title: j.title || j.id, channel: j.channel || j.uploader || '', duration: typeof j.duration === 'number' ? j.duration : null });
    } catch (e) { }
  }
  if (!items.length && code !== 0) throw new Error(err.trim().split('\n').pop() || `yt-dlp code ${code}`);
  return items;
}

const inflight = new Map();
function ytDownload(id) {
  const file = path.join(CACHE, id + '.mp3');
  if (fs.existsSync(file)) return Promise.resolve(file);
  if (inflight.has(id)) return inflight.get(id);
  const args = ['-f', 'bestaudio/best', '--extract-audio', '--audio-format', 'mp3', '--audio-quality', '0',
    '--no-playlist', '--no-warnings', '-o', path.join(CACHE, id + '.%(ext)s')];
  if (FFMPEG) args.push('--ffmpeg-location', FFMPEG);
  args.push('https://www.youtube.com/watch?v=' + id);
  const p = run(args, DOWNLOAD_TIMEOUT).then(({ code, err }) => {
    if (code === 0 && fs.existsSync(file)) return file;
    throw new Error(err.trim().split('\n').pop() || `yt-dlp code ${code}`);
  }).finally(() => inflight.delete(id));
  inflight.set(id, p);
  return p;
}

/* ------------------------------------------------------------------ HTTP --- */
/* Seules l'app ouverte en fichier local (Origin: null) et les pages servies
   par cette machine ont le droit de parler au companion.                    */
const allowed = o => !o || o === 'null' || /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(o) || o === 'kf://app';

function send(res, code, obj, origin) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', ...cors(origin) });
  res.end(JSON.stringify(obj));
}
const cors = origin => (origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {});

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  // Host vérifié (bloque le « DNS rebinding ») ; seules les pages locales parlent au companion
  if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(req.headers.host || '') || !allowed(origin)) { res.writeHead(403).end(); return; }
  const url = new URL(req.url, 'http://127.0.0.1');
  // ce qui lance yt-dlp exige une vraie requête de l'app (une balise <img> d'un site n'envoie pas d'Origin)
  if (!origin && (url.pathname === '/search' || url.pathname === '/download')) { res.writeHead(403).end(); return; }
  if (req.method === 'OPTIONS') { res.writeHead(204, { ...cors(origin), 'Access-Control-Allow-Methods': 'GET' }).end(); return; }
  try {
    switch (url.pathname) {
      case '/__alive':
        lastAlive = Date.now();
        res.writeHead(204, cors(origin)).end();
        return;
      case '/health':
        send(res, 200, { ok: true, name: 'forge-companion', ytdlp: !!YTDLP, ffmpeg: !!FFMPEG, link: link.connected, binDir: BIN_DIR || process.env.YT_BIN_DIR || path.join(__dirname, 'bin') }, origin);
        return;
      case '/link':
        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive', ...cors(origin) });
        res.write('retry: 4000\n\n');
        listeners.add(res);
        res.write(`data: ${JSON.stringify({ ...link, age: Date.now() - link.at })}\n\n`);
        req.on('close', () => listeners.delete(res));
        return;
      case '/search': {
        const q = (url.searchParams.get('q') || '').trim().slice(0, 200);
        if (!q) { send(res, 400, { error: 'recherche vide' }, origin); return; }
        const n = clamp(parseInt(url.searchParams.get('n'), 10) || 8, 1, 20);
        send(res, 200, await ytSearch(q, n), origin);
        return;
      }
      case '/download': {
        const id = parseVideoId(url.searchParams.get('id') || url.searchParams.get('url'));
        if (!id) { send(res, 400, { error: 'lien YouTube invalide' }, origin); return; }
        const file = await ytDownload(id);
        const st = fs.statSync(file);
        res.writeHead(200, { 'Content-Type': 'audio/mpeg', 'Content-Length': st.size, ...cors(origin) });
        fs.createReadStream(file).on('error', () => res.destroy()).pipe(res);
        return;
      }
      default:
        send(res, 404, { error: 'route inconnue' }, origin);
    }
  } catch (e) {
    if (!res.headersSent) send(res, 500, { error: String(e && e.message || e) }, origin);
    else res.destroy();
  }
});
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

setInterval(() => { for (const res of listeners) res.write(': ping\n\n'); }, 15000);

/* Lance en arriere-plan par START-FORGE.bat (FORGE_AUTOEXIT) : la page envoie
   un signe de vie toutes les 20 s ; une minute sans nouvelles et on s'eteint. */
let lastAlive = 0;
const startedAt = Date.now();
if (process.env.FORGE_AUTOEXIT) setInterval(() => {
  const now = Date.now();
  if ((lastAlive && now - lastAlive > 60e3) || (!lastAlive && now - startedAt > 180e3)) process.exit(0);
}, 5000);

server.on('error', e => {
  if (e.code === 'EADDRINUSE') console.log(`[companion] le port ${PORT} est déjà pris — le companion tourne peut-être déjà.`);
  else console.log('[companion]', e.message);
  if (!process.env.FORGE_EMBEDDED) process.exit(1);   // dans l'app de bureau, on reste discret
});
server.listen(PORT, '127.0.0.1', () => {
  console.log(`[companion] prêt sur http://127.0.0.1:${PORT}`);
  console.log(`[companion] yt-dlp : ${YTDLP || 'introuvable'} · ffmpeg : ${FFMPEG || 'introuvable'}`);
  console.log('[companion] Ableton Link : en attente de Carabiner sur le port ' + CARABINER_PORT);
  connectCarabiner();
});
