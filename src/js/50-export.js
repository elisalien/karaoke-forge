/* ============================================================================
   KARAOKE FORGE — export (WebCodecs → MP4, ou séquence PNG alpha) + boot
   ============================================================================ */

/* -------------------------------------------------- deterministic stepper --- */
function exportStep(t, dt) {
  _emitDt = dt;
  drawText(t, true);
  if (P.parOn) {
    const steps = Math.max(1, Math.round(dt / SUB));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) Particles.step(h, 0, 0);
  }
  return P.parOn ? Particles.pack() : 0;
}

/* ------------------------------------------------------------- UI dialog --- */
const EX = { fps: 30, start: 0, end: 0, fmt: 'mp4', mbps: 24, preroll: 1.2, beat: 0 };

/** Course contre la montre : rien ne doit pouvoir bloquer indéfiniment. */
function withTimeout(p, ms, msg) {
  let to;
  return Promise.race([
    Promise.resolve(p).finally(() => clearTimeout(to)),
    new Promise((_, rej) => { to = setTimeout(() => rej(new Error(msg)), ms); })
  ]);
}

function openExport() {
  if (!S.lines.length) { toast('Rien à exporter : construis d\'abord les paroles', true); return; }
  const span = S.lines.map(lineSpan).filter(Boolean);
  const a = span.length ? Math.max(0, span[0][0] - 1) : 0;
  const b = span.length ? Math.min(S.duration || 1e9, span[span.length - 1][1] + 1.5) : (S.duration || 10);
  EX.start = +a.toFixed(2); EX.end = +b.toFixed(2);
  const hasWC = typeof VideoEncoder !== 'undefined';
  const hasDir = typeof showDirectoryPicker === 'function';

  $('#modalTitle').textContent = 'Exporter la vidéo';
  $('#modalBody').innerHTML = `
    <div class="row wide"><label>Format</label><select id="exFmt">
      <option value="mp4"${hasWC ? '' : ' disabled'}>MP4 · H.264 + audio (recommandé)</option>
      <option value="png">Séquence PNG · fond alpha</option>
    </select></div>
    <div class="row wide"><label>Cadence</label><select id="exFps">
      <option value="24">24 fps</option><option value="25">25 fps</option>
      <option value="30" selected>30 fps</option><option value="50">50 fps</option><option value="60">60 fps</option>
    </select></div>
    <div class="row wide"><label>Début (s)</label><input type="number" id="exA" step="0.01" value="${EX.start}"></div>
    <div class="row wide"><label>Fin (s)</label><input type="number" id="exB" step="0.01" value="${EX.end}"></div>
    <div class="row wide"><label>Débit (Mb/s)</label><input type="number" id="exQ" step="1" min="2" max="200" value="${EX.mbps}"></div>
    <label class="chk"><input type="checkbox" id="exAudio" checked><i></i>Inclure la piste audio (MP4)</label>
    <div class="hint" id="exInfo"></div>
    <div class="bar"><i id="exBar"></i></div>
    <div class="hint" id="exLog">Prêt.</div>`;
  const info = () => {
    const fps = +$('#exFps').value, a2 = +$('#exA').value, b2 = +$('#exB').value;
    const n = Math.max(0, Math.ceil((b2 - a2) * fps));
    let extra = '';
    if ($('#exFmt').value === 'png') {
      extra = hasDir ? ' · tu choisiras un dossier de destination'
        : ' · pas de sélecteur de dossier ici : les images partiront en .zip';
      if (P.bgMode !== 'alpha') extra += ' — règle Décor → Fond sur « Transparent » pour un vrai canal alpha';
    }
    $('#exInfo').textContent = `${S.W}×${S.H} · ${n} images · ${fmtTime(Math.max(0, b2 - a2), false)}` + extra;
  };
  ['exFps', 'exA', 'exB', 'exFmt'].forEach(id => $('#' + id).oninput = info);
  $('#exFmt').value = hasWC ? 'mp4' : 'png';
  info();
  if (!hasWC && !hasDir) { $('#exLog').textContent = 'Navigateur non compatible : utilise Chrome ou Edge.'; }
  if (Modal.close) Modal.close();
  $('#modal').classList.add('on');
  $('#mOk').hidden = false; $('#mCancel').hidden = false;
  $('#mCancel').textContent = 'Fermer';
  $('#mOk').textContent = 'Lancer';
  Modal.close = () => $('#mCancel').onclick();
  $('#mOk').onclick = () => {
    EX.fps = +$('#exFps').value; EX.start = +$('#exA').value; EX.end = +$('#exB').value;
    EX.mbps = +$('#exQ').value; EX.fmt = $('#exFmt').value;
    EX.audio = $('#exAudio').checked;
    if (EX.end <= EX.start) { toast('Plage invalide', true); return; }
    $('#mOk').disabled = true;
    (EX.fmt === 'mp4' ? exportMp4 : exportPng)().catch(e => {
      console.error(e); $('#exLog').textContent = 'ERREUR : ' + e.message; toast('Export échoué : ' + e.message, true);
    }).finally(() => { $('#mOk').disabled = false; S.exporting = false; endExport(); });
  };
  $('#mCancel').onclick = () => { EX.abort = true; Modal.close = null; $('#modal').classList.remove('on'); };
}

let _savedRes = null;
function beginExport() {
  S.exporting = true; EX.abort = false; EX.beat = performance.now();
  $('#stageBadge').textContent = 'Export en cours';
  pause();
  _savedRes = [RW, RH];
  setRenderSize(S.W, S.H);
  Layout.build(); Mask.li = -1;
  Particles.reset();
  allSyls().forEach(o => o.s.__burst = 0);
}
function endExport() {
  if (_savedRes) { setRenderSize(_savedRes[0], _savedRes[1]); _savedRes = null; }
  S.exporting = false; EX.beat = 0;
  Particles.reset(); requestRender(); TL.invalidate();
}
function exProg(v, msg) {
  EX.beat = performance.now();                 // « je suis vivant »
  const b = $('#exBar'); if (b) b.style.width = clamp(v, 0, 1) * 100 + '%';
  const l = $('#exLog'); if (l && msg) l.textContent = msg;
}

const sleep = ms => new Promise(r => setTimeout(r, ms || 0));

/* ---------------------------------------------------------------- pre-roll */
function preroll(from) {
  const dt = 1 / EX.fps;
  let t = Math.max(0, from - EX.preroll);
  while (t < from - 1e-6) { exportStep(t, dt); t += dt; }
}

/* --------------------------------------------------------------- MP4 path --- */
/* Deviner le bon niveau H.264 est un piège : le 1080p à 60 fps dépasse le
   niveau 4.0, le 1440p dépasse le 4.1… On demande au navigateur, du plus
   capable au plus modeste, et on garde la première configuration acceptée. */
const AVC_CANDIDATES = [
  'avc1.640034', 'avc1.640033', 'avc1.640032',   // High 5.2 / 5.1 / 5.0
  'avc1.64002a', 'avc1.640029', 'avc1.640028',   // High 4.2 / 4.1 / 4.0
  'avc1.4d0034', 'avc1.4d0029', 'avc1.4d0028',   // Main
  'avc1.42003c', 'avc1.42002a', 'avc1.42001f'    // Baseline
];

async function pickVideoConfig(W, H, fps, bitrate) {
  const tried = [];
  for (const codec of AVC_CANDIDATES) {
    for (const extra of [{ latencyMode: 'quality' }, {}]) {
      const cfg = { codec, width: W, height: H, bitrate, framerate: fps, ...extra };
      try {
        const s = await VideoEncoder.isConfigSupported(cfg);
        if (s && s.supported) return cfg;
        tried.push(codec);
      } catch (e) { tried.push(codec + '!'); }
    }
  }
  throw new Error(`Aucun encodeur H.264 ne prend ${W}×${H} à ${fps} fps. `
    + `Essaie une cadence plus basse, une résolution plus petite, ou la séquence PNG.`);
}

async function exportMp4() {
  if (typeof VideoEncoder === 'undefined')
    throw new Error('Ce navigateur n\'encode pas la vidéo (WebCodecs absent). Utilise Chrome ou Edge, ou exporte en séquence PNG.');
  const fps = EX.fps, W = S.W, H = S.H;
  const nF = Math.ceil((EX.end - EX.start) * fps);
  if (!nF) throw new Error('Plage vide');

  /* ---- 1. destination — d'abord, tant que le clic de l'utilisateur compte
          encore : le sélecteur de fichier exige une activation récente ---- */
  let target = null, writable = null;
  const fname = baseName() + `_${W}x${H}_${fps}fps.mp4`;
  if (typeof showSaveFilePicker === 'function') {
    try {
      const fh = await showSaveFilePicker({
        suggestedName: fname,
        types: [{ description: 'Vidéo MP4', accept: { 'video/mp4': ['.mp4'] } }]
      });
      writable = await fh.createWritable();
      target = new Mp4Muxer.FileSystemWritableFileStreamTarget(writable);
    } catch (e) {
      if (e && e.name === 'AbortError') throw new Error('Annulé');
      console.warn('[export] sélecteur de fichier indisponible, repli mémoire', e);
    }
  }
  if (!target) target = new Mp4Muxer.ArrayBufferTarget();

  /* ---- 2. encodeurs : on demande au navigateur ce qu'il accepte ---- */
  exProg(.01, 'Recherche d\'un encodeur compatible…');
  const cfg = await pickVideoConfig(W, H, fps, Math.round(EX.mbps * 1e6));

  let withAudio = EX.audio && S.buffer && typeof AudioEncoder !== 'undefined';
  if (withAudio) {
    try {
      const s = await AudioEncoder.isConfigSupported({
        codec: 'mp4a.40.2', sampleRate: S.buffer.sampleRate,
        numberOfChannels: Math.min(2, S.buffer.numberOfChannels), bitrate: 192000
      });
      withAudio = !!(s && s.supported);
    } catch (e) { withAudio = false; }
    if (!withAudio) { console.warn('[export] encodeur AAC indisponible : la vidéo sera muette'); toast('Pas d\'encodeur audio dans ce navigateur : la vidéo sera muette', true); }
  }

  /* ---- 3. on bascule en mode rendu hors ligne ---- */
  beginExport();

  const muxer = new Mp4Muxer.Muxer({
    target,
    video: { codec: 'avc', width: W, height: H, frameRate: fps },
    audio: withAudio ? { codec: 'aac', sampleRate: S.buffer.sampleRate, numberOfChannels: Math.min(2, S.buffer.numberOfChannels) } : undefined,
    firstTimestampBehavior: 'offset',
    fastStart: writable ? false : 'in-memory'
  });

  let encErr = null;
  const enc = new VideoEncoder({
    output: (c, m) => muxer.addVideoChunk(c, m),
    error: e => { encErr = e; console.error('[export] VideoEncoder', e); }
  });
  enc.configure(cfg);
  /* si quoi que ce soit échoue ensuite, on relâche le fichier au lieu de
     laisser un .mp4 tronqué et verrouillé sur le disque */
  const release = async () => {
    try { enc.close(); } catch (e) { }
    if (writable) { try { await writable.abort(); } catch (e) { } writable = null; }
  };
  try {
  exProg(.02, `Encodeur ${cfg.codec} · ${W}×${H} · ${fps} fps`);

  /* ---- audio ---- */
  if (withAudio) {
    exProg(.04, 'Encodage de la piste audio…');
    await new Promise(r => setTimeout(r, 0));
    try { await encodeAudio(muxer, EX.start, EX.end); }
    catch (e) { console.error('[export] audio', e); throw new Error('Encodage audio impossible : ' + e.message); }
  }

  /* ---- video ---- */
  exProg(0, 'Pré-roll des particules…');
  await new Promise(r => setTimeout(r, 0));
  preroll(EX.start);

  const dt = 1 / fps;
  const t0 = performance.now();
  for (let i = 0; i < nF; i++) {
    if (EX.abort) throw new Error('Annulé');
    if (encErr) throw encErr;

    /* Contre-pression réelle : on attend que l'encodeur ait digéré, sinon la
       file grossit sans fin, la mémoire explose et la finalisation ne rend
       jamais la main. C'est ce qui bloquait sur « Finalisation ». */
    while (enc.encodeQueueSize > 8) {
      if (EX.abort) throw new Error('Annulé');
      if (encErr) throw encErr;
      await sleep(3);
    }

    const t = EX.start + i * dt;
    const n = exportStep(t, dt);
    GL.draw(t, n);
    const frame = new VideoFrame(glc, { timestamp: Math.round(i * 1e6 / fps), duration: Math.round(1e6 / fps) });
    enc.encode(frame, { keyFrame: i % (fps * 2) === 0 });
    frame.close();

    if ((i & 3) === 0) {
      const el = (performance.now() - t0) / 1000;
      const rest = i > 4 ? ` · ${fmtTime(el / i * (nF - i), false)} restantes` : '';
      exProg(i / nF, `Image ${i + 1}/${nF} — ${fmtTime(t)}${rest}`);
      await sleep(0);
    }
  }
  exProg(.99, `Vidage de l'encodeur (${enc.encodeQueueSize} en file)…`);
  await sleep(0);
  await withTimeout(enc.flush(), 60000, 'L\'encodeur ne répond plus. Baisse la cadence ou le débit et réessaie.');
  enc.close();
  exProg(1, 'Écriture du fichier…');
  await sleep(0);
  muxer.finalize();
  if (writable) { await withTimeout(writable.close(), 120000, 'Écriture du fichier interrompue'); writable = null; toast('MP4 écrit sur le disque'); }
  else { download(new Blob([target.buffer], { type: 'video/mp4' }), fname); toast('MP4 exporté'); }
  exProg(1, 'Terminé ✓');
  $('#modal').classList.remove('on');
  } catch (e) { await release(); throw e; }
}

async function encodeAudio(muxer, a, b) {
  const ab = S.buffer, sr = ab.sampleRate;
  const nch = Math.min(2, ab.numberOfChannels);
  const i0 = Math.floor(a * sr), i1 = Math.min(ab.length, Math.ceil(b * sr));
  const total = Math.max(0, i1 - i0);
  if (!total) return;
  const chans = [];
  for (let c = 0; c < nch; c++) chans.push(ab.getChannelData(c));
  let err = null;
  const aenc = new AudioEncoder({
    output: (c, m) => muxer.addAudioChunk(c, m),
    error: e => { err = e; }
  });
  aenc.configure({ codec: 'mp4a.40.2', sampleRate: sr, numberOfChannels: nch, bitrate: 192000 });
  const BLK = 4096;
  for (let off = 0; off < total; off += BLK) {
    if ((off & 0x3FFFF) === 0) EX.beat = performance.now();
    if (err) throw err;
    const n = Math.min(BLK, total - off);
    const data = new Float32Array(n * nch);
    for (let c = 0; c < nch; c++) data.set(chans[c].subarray(i0 + off, i0 + off + n), c * n);
    const ad = new AudioData({
      format: 'f32-planar', sampleRate: sr, numberOfFrames: n, numberOfChannels: nch,
      timestamp: Math.round(off / sr * 1e6), data
    });
    aenc.encode(ad); ad.close();
    if (aenc.encodeQueueSize > 24) await new Promise(r => setTimeout(r, 0));
  }
  await aenc.flush(); aenc.close();
}

/* ---------------------------------------------------------- PNG sequence --- */
/* Trois destinations, de la meilleure à la plus universelle :
     1. un dossier (showDirectoryPicker) — écriture directe, aucune limite ;
     2. un fichier .zip streamé (showSaveFilePicker) — aucune limite non plus ;
     3. un .zip construit en mémoire puis téléchargé — marche partout, y
        compris en file://, mais borné par la RAM.                          */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(u8) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < u8.length; i++) c = CRC_TABLE[(c ^ u8[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

/** Écrivain ZIP « stored » (sans compression : les PNG le sont déjà). */
class ZipWriter {
  constructor(write) { this.out = write; this.entries = []; this.offset = 0; }
  async add(name, data) {
    const nm = new TextEncoder().encode(name);
    const crc = crc32(data);
    const lh = new Uint8Array(30 + nm.length);
    const dv = new DataView(lh.buffer);
    dv.setUint32(0, 0x04034b50, true);
    dv.setUint16(4, 20, true); dv.setUint16(6, 0, true); dv.setUint16(8, 0, true);
    dv.setUint16(10, 0, true); dv.setUint16(12, 0x0021, true);
    dv.setUint32(14, crc, true);
    dv.setUint32(18, data.length, true); dv.setUint32(22, data.length, true);
    dv.setUint16(26, nm.length, true); dv.setUint16(28, 0, true);
    lh.set(nm, 30);
    this.entries.push({ nm, crc, size: data.length, off: this.offset });
    await this.out(lh); await this.out(data);
    this.offset += lh.length + data.length;
  }
  async finish() {
    const start = this.offset;
    for (const e of this.entries) {
      const ch = new Uint8Array(46 + e.nm.length);
      const dv = new DataView(ch.buffer);
      dv.setUint32(0, 0x02014b50, true);
      dv.setUint16(4, 20, true); dv.setUint16(6, 20, true);
      dv.setUint16(8, 0, true); dv.setUint16(10, 0, true);
      dv.setUint16(12, 0, true); dv.setUint16(14, 0x0021, true);
      dv.setUint32(16, e.crc, true);
      dv.setUint32(20, e.size, true); dv.setUint32(24, e.size, true);
      dv.setUint16(28, e.nm.length, true);
      dv.setUint32(42, e.off, true);
      ch.set(e.nm, 46);
      await this.out(ch);
      this.offset += ch.length;
    }
    const eo = new Uint8Array(22);
    const dv = new DataView(eo.buffer);
    dv.setUint32(0, 0x06054b50, true);
    dv.setUint16(8, this.entries.length, true);
    dv.setUint16(10, this.entries.length, true);
    dv.setUint32(12, this.offset - start, true);
    dv.setUint32(16, start, true);
    await this.out(eo);
  }
}

async function exportPng() {
  const fps = EX.fps, dt = 1 / fps;
  const nF = Math.ceil((EX.end - EX.start) * fps);
  if (!nF) throw new Error('Plage vide');
  const base = baseName().replace(/[^\w-]+/g, '_') || 'karaoke';

  /* ---- destination, tant que le clic compte encore ---- */
  let dir = null, zip = null, writable = null, chunks = null, mode = '';
  if (typeof showDirectoryPicker === 'function') {
    try { dir = await showDirectoryPicker({ mode: 'readwrite' }); mode = 'dossier'; }
    catch (e) { if (e && e.name === 'AbortError') throw new Error('Annulé'); }
  }
  if (!dir && typeof showSaveFilePicker === 'function') {
    try {
      const fh = await showSaveFilePicker({
        suggestedName: base + '_png.zip',
        types: [{ description: 'Archive ZIP', accept: { 'application/zip': ['.zip'] } }]
      });
      writable = await fh.createWritable();
      zip = new ZipWriter(d => writable.write(d));
      mode = 'zip disque';
    } catch (e) { if (e && e.name === 'AbortError') throw new Error('Annulé'); }
  }
  if (!dir && !zip) {
    chunks = [];
    zip = new ZipWriter(d => { chunks.push(d.slice()); });
    mode = 'zip mémoire';
  }

  beginExport();
  exProg(0, `Destination : ${mode} · pré-roll des particules…`);
  await sleep(0);
  preroll(EX.start);

  const t0 = performance.now();
  let bytes = 0;
  try {
    for (let i = 0; i < nF; i++) {
      if (EX.abort) throw new Error('Annulé');
      const t = EX.start + i * dt;
      const n = exportStep(t, dt);
      GL.draw(t, n);

      const blob = await new Promise((res, rej) =>
        glc.toBlob(b => b ? res(b) : rej(new Error('Le canevas n\'a pas pu être converti en PNG')), 'image/png'));
      bytes += blob.size;
      const name = `${base}_${String(i).padStart(6, '0')}.png`;

      if (dir) {
        const fh = await dir.getFileHandle(name, { create: true });
        const w = await fh.createWritable();
        await w.write(blob); await w.close();
      } else {
        await zip.add(name, new Uint8Array(await blob.arrayBuffer()));
        if (chunks && bytes > 3.4e9)
          throw new Error('Séquence trop lourde pour la mémoire. Relance en choisissant un dossier de destination.');
      }

      if ((i & 1) === 0) {
        const el = (performance.now() - t0) / 1000;
        const rest = i > 4 ? ` · ${fmtTime(el / i * (nF - i), false)} restantes` : '';
        exProg(i / nF, `Image ${i + 1}/${nF} — ${fmtTime(t)}${rest}`);
        await sleep(0);
      }
    }

    if (zip) {
      exProg(1, 'Fermeture de l\'archive…'); await sleep(0);
      await zip.finish();
      if (writable) { await writable.close(); writable = null; }
      else { download(new Blob(chunks, { type: 'application/zip' }), base + '_png.zip'); }
    }
  } catch (e) {
    if (writable) { try { await writable.abort(); } catch (e2) { } writable = null; }
    throw e;
  }

  exProg(1, 'Terminé ✓');
  toast(`${nF} PNG · ${(bytes / 1048576).toFixed(0)} Mo (${mode})`);
  $('#modal').classList.remove('on');
}

