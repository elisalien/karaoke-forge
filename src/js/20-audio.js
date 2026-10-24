/* ============================================================================
   KARAOKE FORGE — audio et transport
   ----------------------------------------------------------------------------
   Deux horloges derrière la même interface :
     · l'audio du morceau (Web Audio) quand un fichier est chargé ;
     · une horloge libre sinon — ou en live, quand le son vient de l'extérieur.
   Le reste de l'app ne voit que play / pause / seek / now.
   ============================================================================ */

/* ----------------------------------------------------------------- audio --- */
async function loadAudio(file) {
  if (!S.ctx) {
    try { S.ctx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch (e) { throw new Error('Web Audio indisponible dans ce navigateur'); }
  }
  const gen = ++S.audioGen;          // un chargement lancé après celui-ci l'annule
  const busy = setBusy(`Décodage de ${file.name || 'l\'audio'}…`);
  let ab;
  try {
    const buf = await file.arrayBuffer();
    try { ab = await S.ctx.decodeAudioData(buf); }
    catch (e) { if (gen !== S.audioGen) return false; throw new Error('format audio non reconnu'); }
  } finally { busy(); }
  if (gen !== S.audioGen) return false;
  stop();
  S.buffer = ab; S.audioBlob = file; S.audioName = file.name || 'audio'; S.audioRemoved = false;
  Onsets.cache = null;
  refreshDuration();
  buildPeaks(ab);
  S.tlZoom = clamp((TL.c.width / TL.dpr || 1200) / Math.max(1, S.duration), 6, 400);
  S.tlScroll = 0;
  updateTime(); TL.invalidate();
  Steps.refresh();
  toast(`Audio chargé — ${S.audioName} (${fmtTime(ab.duration, false)})`);
  // les attaques se calculent en tâche de fond : la timeline les affiche dès qu'elles sont prêtes
  Onsets.computeAsync(() => { if (gen === S.audioGen) TL.invalidate(); });
  return true;
}

/** Indicateur d'activité discret dans l'en-tête ; renvoie la fonction qui le retire. */
function setBusy(msg) {
  const el = $('#saveState'); if (!el) return () => { };
  el.dataset.busy = (+(el.dataset.busy || 0) + 1);
  el.classList.add('busy'); el.textContent = msg;
  return () => {
    el.dataset.busy = Math.max(0, +(el.dataset.busy || 1) - 1);
    if (!+el.dataset.busy) { el.classList.remove('busy'); updateSaveState(); }
  };
}

/** Oublie l'audio (le projet reste). */
function unloadAudio() {
  S.audioGen++; S.audioRemoved = true;
  stop();
  S.buffer = null; S.audioBlob = null; S.audioName = ''; S.peaks = null;
  Onsets.cache = null;
  refreshDuration(); TL.invalidate(); Steps.refresh();
}

function buildPeaks(ab) {
  const B = 256, ch = ab.numberOfChannels, len = ab.length;
  const n = Math.ceil(len / B);
  const mn = new Float32Array(n), mx = new Float32Array(n);
  const d0 = ab.getChannelData(0), d1 = ch > 1 ? ab.getChannelData(1) : null;
  for (let i = 0; i < n; i++) {
    let a = 1, b = -1;
    const s = i * B, e = Math.min(len, s + B);
    for (let j = s; j < e; j++) {
      const v = d1 ? (d0[j] + d1[j]) * .5 : d0[j];
      if (v < a) a = v; if (v > b) b = v;
    }
    mn[i] = a; mx[i] = b;
  }
  S.peaks = { mn, mx, rate: ab.sampleRate / B };
}

/* ------------------------------------------------------------- durée utile --- */
function lastTimedEnd() {
  let e = 0;
  for (const L of S.lines) { const sp = lineSpan(L); if (sp && sp[1] > e) e = sp[1]; }
  return e;
}
/** Sans audio, le morceau dure jusqu'à la dernière syllabe calée, plus une marge. */
function refreshDuration() {
  const d = S.buffer ? S.buffer.duration
    : (S.lines.some(L => L.syls.length) ? Math.max(30, lastTimedEnd() + 5) : 0);
  if (d !== S.duration) {
    S.duration = d;
    if (S.cur > d) S.cur = d;
    updateTime();
    if (TL.c) TL.invalidate();
  }
}
const usesAudio = () => !!S.buffer && !S.extClock;

/* -------------------------------------------------------------- transport --- */
function play(from) {
  refreshDuration();
  if (!S.duration) { toast('Charge un audio ou des paroles d\'abord', true); return; }
  const off = clamp(from !== undefined ? from : S.cur, 0, Math.max(0, S.duration - .01));
  stopSrc();
  if (usesAudio()) {
    if (S.ctx.state === 'suspended') S.ctx.resume();
    const src = S.ctx.createBufferSource();
    src.buffer = S.buffer;
    src.playbackRate.value = S.rate;
    src.connect(S.ctx.destination);
    src.start(0, off);
    S.src = src; S.startCtxT = S.ctx.currentTime;
    src.onended = () => {
      if (S.src !== src) return;
      // fin du morceau, ou arrêt programmé en fin de ligne (live « ligne par ligne »)
      S.src = null; S.cur = Math.min(S.holdAt != null ? S.holdAt : S.duration, S.duration);
      S.holdAt = null; setPlaying(false); updateTime(); requestRender();
    };
  }
  S.startOff = off; S.freeT = performance.now();
  if (from === undefined) TL.resumeFollow();    // reprise de lecture : la vue suit de nouveau
  setPlaying(true);
  if (S.holdAt != null) setHold(S.holdAt);
  requestRender();
}

/** Arrêt automatique à l'instant `t` (live « ligne par ligne »). Le son est
    coupé par Web Audio lui-même et l'horloge est bornée : l'arrêt tombe juste
    même si la fenêtre de contrôle est en arrière-plan et ne dessine plus. */
function setHold(t) {
  S.holdAt = t;
  if (t != null && S.playing && S.src) {
    try { S.src.stop(S.ctx.currentTime + Math.max(0, (t - now()) / S.rate)); } catch (e) { }
  }
  Scene.sendClock();
}
/** Lève l'arrêt programmé. Web Audio ne sait pas annuler un stop() déjà
    planifié : on relance une source neuve au même instant.              */
function clearHold() {
  if (S.holdAt == null) return;
  const t = now();
  S.holdAt = null;
  if (S.playing && S.src) play(t); else Scene.sendClock();
}
function setPlaying(on) {
  S.playing = on;
  $('#bPlay').innerHTML = icon(on ? 'pause' : 'play');
  document.body.classList.toggle('playing', on);
  if (typeof Live !== 'undefined') Live.transportChanged();
  Scene.sendClock();
}
function stopSrc() { if (S.src) { try { S.src.onended = null; S.src.stop(); } catch (e) { } S.src = null; } }
function pause() {
  if (!S.playing) return;
  S.cur = now(); stopSrc(); S.holdAt = null;
  setPlaying(false); updateTime(); TL.repaint(); requestRender();
}
function togglePlay() { S.playing ? pause() : play(); }
function stop() {
  stopSrc(); S.cur = 0; S.holdAt = null;
  setPlaying(false); setRate(1);
  Particles.reset(); updateTime(); TL.invalidate(); requestRender();
}
function now() {
  if (!S.playing) return S.cur;
  const el = S.src ? S.ctx.currentTime - S.startCtxT : (performance.now() - S.freeT) / 1000;
  return clamp(S.startOff + el * S.rate, 0, S.holdAt != null ? Math.min(S.holdAt, S.duration) : S.duration);
}
function seek(t) {
  S.cur = clamp(t, 0, S.duration || 0);
  TL.resumeFollow();
  if (S.holdAt != null && S.cur >= S.holdAt - .01) S.holdAt = null;   // aller au-delà de l'arrêt l'annule
  Particles.reset();
  if (S.playing) play(S.cur);
  else { updateTime(); requestRender(); Scene.sendClock(true); }
  TL.repaint();
}

/** Ralenti / accéléré. Les timings enregistrés restent ceux du morceau
    à vitesse normale : `now()` remet l'échelle d'aplomb. La position est
    lue AVANT de changer la vitesse — sinon la tête de lecture saute.     */
const RATES = [.25, .5, .75, 1];
const fmtRate = r => (Math.round(r * 100) / 100) + '×';
function setRate(r) {
  r = clamp(r, .125, 4);
  const t = now();
  S.rate = r;
  if (S.playing) play(t); else Scene.sendClock();
  updateTime();
  $$('#speed button').forEach(b => b.classList.toggle('on', Math.abs(+b.dataset.r - S.rate) < 1e-6));
  const tr = $('#tapRate'); if (tr) tr.textContent = fmtRate(S.rate);
  if (typeof Live !== 'undefined') Live.rateChanged();
}
function buildSpeed() {
  const host = $('#speed'); host.innerHTML = '';
  for (const r of RATES) {
    const b = document.createElement('button');
    b.dataset.r = r;
    b.textContent = fmtRate(r);
    b.title = r === 1 ? 'Vitesse normale' : `Ralenti ${fmtRate(r)} — pour caler plus facilement`;
    b.classList.toggle('on', r === S.rate);
    b.onclick = () => setRate(r);
    host.appendChild(b);
  }
}
function updateTime() {
  const el = $('#time'); if (!el) return;
  const r = S.rate !== 1 ? ` <span>·</span> ${fmtRate(S.rate)}` : '';
  el.innerHTML = `${fmtTime(S.cur)} <span>/</span> ${fmtTime(S.duration)}${r}`;
}

/* ---------------------------------------------------------------- boucle --- */
function toggleLoop() {
  if (S.loop) { S.loop = null; $('#bLoop').classList.remove('on'); toast('Boucle arrêtée'); TL.invalidate(); return; }
  const L = S.lines[S.sel.line];
  const sp = L && lineSpan(L);
  if (!sp) { toast('Sélectionne une ligne calée', true); return; }
  S.loop = [Math.max(0, sp[0] - .35), sp[1] + .35];
  $('#bLoop').classList.add('on');
  seek(S.loop[0]); play();
  TL.invalidate();
  toast(`Boucle sur la ligne ${S.sel.line + 1}`);
}
