/* ============================================================================
   KARAOKE FORGE — écran scène
   ----------------------------------------------------------------------------
   Une seconde fenêtre (le même fichier, suivi de #scene) n'affiche que
   l'image, plein cadre, pour la capture dans Resolume ou OBS. La fenêtre de
   contrôle lui envoie le document (paroles + réglages), l'horloge et le
   rythme ; la scène calcule ses images elle-même, particules comprises.

   Deux canaux, pour marcher partout : postMessage vers la fenêtre ouverte, et
   BroadcastChannel pour retrouver une scène déjà ouverte après un rechargement.
   Chaque type de message porte son propre compteur : un doublon ou un message
   en retard est ignoré.
   ============================================================================ */
const Scene = {
  isScene: /^#scene\b/.test(location.hash),
  sid: Math.random().toString(36).slice(2),
  win: null, bc: null, seq: 0, docVer: 0, fontVer: 0, sentFontVer: -1,
  docTimer: 0, lastClockMs: 0, lastHello: 0, livePreview: false,
  /* côté scène */
  ctlSid: null, lastSeq: {}, clock: null, gotDoc: false, lastMsg: 0,

  init() {
    try { this.bc = new BroadcastChannel('karaoke-forge'); this.bc.onmessage = e => this.recv(e.data); } catch (e) { this.bc = null; }
    addEventListener('message', e => { if (e.data && e.data.kf) this.recv(e.data); });
    if (!this.isScene) {
      addEventListener('beforeunload', () => { if (this.win && !this.win.closed) this.post({ k: 'bye' }); });
      // signe de vie : une scène sans nouvelles de son pilote pendant 4 s accepte un autre onglet
      setInterval(() => { if (this.isOpen()) this.post({ k: 'ping' }); }, 1500);
    }
  },

  /* ------------------------------------------------------ côté contrôle --- */
  open() {
    if (this.win && !this.win.closed) { this.win.focus(); this.sendAll(); return; }
    const url = location.href.replace(/#.*$/, '') + '#scene';
    this.win = window.open(url, 'kf-scene', 'popup=yes,width=1280,height=720');
    if (!this.win) { toast('Fenêtre bloquée : autorise les fenêtres pop-up pour cette page', true); return; }
    toast('Écran scène ouvert — glisse-le sur le 2e écran, double-clic dedans pour le plein écran');
    setTimeout(() => this.sendAll(), 400);
    this.updateUi();
  },
  isOpen() { return !this.isScene && ((this.win && !this.win.closed) || performance.now() - this.lastHello < 4000); },
  previewPaused() { return !this.isScene && S.ws === 'live' && !this.livePreview && this.isOpen(); },

  post(msg) {
    msg.kf = 1; msg.sid = this.sid; msg.seq = ++this.seq;
    if (!this.isScene && this.win && !this.win.closed) { try { this.win.postMessage(msg, '*'); } catch (e) { } }
    if (this.isScene && window.opener) { try { window.opener.postMessage(msg, '*'); } catch (e) { } }
    if (this.bc) { try { this.bc.postMessage(msg); } catch (e) { } }
  },

  docChanged() {
    if (!this.isOpen()) return;
    clearTimeout(this.docTimer);
    this.docTimer = setTimeout(() => this.sendDoc(), 60);
  },
  fontChanged() { this.fontVer++; this.docChanged(); },
  sendDoc(claim) {
    clearTimeout(this.docTimer);
    const m = { k: 'doc', ver: ++this.docVer, lines: cleanLines(S.lines), params: { ...P }, blackout: S.blackout, claim: !!claim };
    if (S.customFont && this.sentFontVer !== this.fontVer) { m.font = S.customFont; this.sentFontVer = this.fontVer; }
    this.post(m);
  },
  sendClock(jump) {
    if (this.isScene || !this.isOpen()) return;
    this.lastClockMs = performance.now();
    this.post({ k: 'clock', pos: now(), at: epochNow(), rate: S.rate, playing: S.playing, hold: S.holdAt, jump: !!jump });
  },
  sendBeat() { if (!this.isScene && this.isOpen()) this.post({ k: 'beat', st: Beat.state() }); },
  sendAll() { this.sentFontVer = -1; this.sendDoc(true); this.sendClock(true); this.sendBeat(); },
  /** L'horloge audio et l'horloge murale dérivent un peu : on recale chaque seconde. */
  heartbeat(ms) { if (ms - this.lastClockMs > 1000 && this.isOpen()) this.sendClock(); },

  updateUi() {
    const el = $('#sceneState'); if (!el) return;
    const on = this.isOpen();
    el.textContent = on ? '● écran scène connecté' : '○ écran scène fermé';
    el.classList.toggle('on', on);
    const b = $('#lvScene'); if (b) b.textContent = on ? 'MONTRER L\'ÉCRAN SCÈNE' : 'OUVRIR L\'ÉCRAN SCÈNE ↗';
    $('#stageWrap').classList.toggle('paused', this.previewPaused());
  },

  /* ------------------------------------------------------------ réception --- */
  recv(m) {
    if (!m || !m.kf || m.sid === this.sid) return;
    if (!this.isScene) {
      if (m.k === 'hello') {
        if (m.ctl && m.ctl !== this.sid) return;      // scène pilotée par un autre onglet
        const first = performance.now() - this.lastHello > 4000;
        this.lastHello = performance.now();
        if (m.ctl !== this.sid || m.ver !== this.docVer) this.sendAll();
        if (first) this.updateUi();
      } else if (m.k === 'bye') { this.lastHello = 0; this.updateUi(); }
      return;
    }
    if (m.k === 'bye') { this.clock = this.clock && { ...this.clock, pos: this.sceneTime(), at: epochNow(), playing: false }; return; }
    const ctlAlive = performance.now() - this.lastMsg < 4000;
    if (this.ctlSid && m.sid !== this.ctlSid && !m.claim && ctlAlive) return;   // un seul pilote à la fois
    if (m.sid !== this.ctlSid) { this.ctlSid = m.sid; this.lastSeq = {}; }
    if (m.seq <= (this.lastSeq[m.k] || 0)) return;
    this.lastSeq[m.k] = m.seq;
    this.lastMsg = performance.now();

    if (m.k === 'doc') {
      const layoutBefore = [...LAYOUT_KEYS].map(k => P[k]).join('|');
      for (const k in m.params) if (k in P) P[k] = m.params[k];
      if (m.params.parMax !== Particles.cap) Particles.resize(P.parMax);
      S.lines = m.lines; S.blackout = m.blackout;
      if (m.font) this.loadFont(m.font);
      S.dirtyLayout = true; S.dirtyMask = true; Mask.li = -1;
      if ([...LAYOUT_KEYS].map(k => P[k]).join('|') !== layoutBefore) this.fit();
      this.docVer = m.ver; this.gotDoc = true;
      $('#sceneWait').classList.add('hide');
    } else if (m.k === 'clock') {
      this.clock = m;
      if (m.jump) Particles.reset();
    } else if (m.k === 'beat') Beat.apply(m.st);
  },

  async loadFont(f) {
    try {
      const ff = new FontFace('KFCustom', f.data);
      await ff.load();
      if (this.ff) document.fonts.delete(this.ff);
      document.fonts.add(ff); this.ff = ff;
      S.dirtyLayout = true; S.dirtyMask = true;
    } catch (e) { console.warn('[scène] police', e); }
  },

  /* ------------------------------------------------------------ côté scène --- */
  sceneTime() {
    const c = this.clock; if (!c) return 0;
    const t = c.playing ? c.pos + (epochNow() - c.at) / 1000 * c.rate : c.pos;
    return c.hold != null ? Math.min(t, c.hold) : t;
  },

  fit() {
    const [w, h] = P.resPreset.split('x').map(Number);
    S.W = w; S.H = h;
    const dpr = Math.min(2, devicePixelRatio || 1);
    const k = Math.min(innerWidth / w, innerHeight / h);
    const cw = Math.max(1, Math.floor(w * k)), ch = Math.max(1, Math.floor(h * k));
    setRenderSize(Math.min(w, Math.round(cw * dpr)), Math.min(h, Math.round(ch * dpr)));
    glc.style.width = cw + 'px'; glc.style.height = ch + 'px';
  },

  boot() {
    document.body.classList.add('scene-mode');
    document.title = 'KARAOKE FORGE — écran scène';
    if (!GL.init()) { document.body.innerHTML = '<p style="padding:30px;color:#ff2fd0;font:14px monospace">WebGL2 est requis.</p>'; return; }
    Particles.resize(P.parMax); Particles.reset();
    this.init();
    this.fit();
    addEventListener('resize', () => this.fit());

    const fs = () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => { });
    addEventListener('dblclick', fs);
    addEventListener('keydown', e => { if (e.key === 'f' || e.key === 'F' || e.key === 'Enter') fs(); });
    let idle = 0;
    addEventListener('pointermove', () => {
      document.body.classList.remove('idle'); clearTimeout(idle);
      idle = setTimeout(() => document.body.classList.add('idle'), 1800);
    });

    const hello = () => this.post({ k: 'hello', ctl: performance.now() - this.lastMsg < 4000 ? this.ctlSid : null, ver: this.gotDoc ? this.docVer : -1 });
    hello(); setInterval(hello, 1500);
    addEventListener('beforeunload', () => this.post({ k: 'bye' }));

    let last = performance.now();
    const frame = () => {
      requestAnimationFrame(frame);
      const t = performance.now(), dt = clamp((t - last) / 1000, 0, .1); last = t;
      const waiting = !this.gotDoc || t - this.lastMsg > 6000;
      $('#sceneWait').classList.toggle('hide', !waiting || this.gotDoc);
      try { renderFrame(this.sceneTime(), dt); } catch (e) { console.error(e); }
    };
    frame();
  }
};
