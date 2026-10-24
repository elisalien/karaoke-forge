/* ============================================================== TIMELINE === */
/* Banc de montage sur canevas. Tous les gestes passent par les Pointer Events
   avec capture : un glissé commencé sur la timeline lui appartient jusqu'au
   relâchement, même si la souris sort de la fenêtre. Un seuil de quelques
   pixels sépare le clic du glissé : cliquer ne déplace jamais rien, et un
   bloc ne peut pas traverser une voisine qui ne bouge pas avec lui.

   Deux calques en cache :
     · la VUE (règle, onde, attaques, zone de boucle) — ne change qu'au zoom,
       au défilement ou au chargement d'un audio ;
     · les BLOCS (lignes, syllabes) — changent à chaque édition ou sélection.
   Un glissé ne redessine que les blocs : l'onde, coûteuse, reste en cache.  */
const DRAG_PX = 4;        // distance (px CSS) avant qu'un clic devienne un glissé
const MIN_SYL = .02;      // écart minimal entre deux débuts de syllabe (s)

/** Capture du pointeur ; certains périphériques la refusent : le geste continue quand même. */
function capturePointer(el, e) { try { el.setPointerCapture(e.pointerId); } catch (er) { } }

const TL = {
  c: null, g: null,
  view: null, vg: null,          // calque vue (règle + onde)
  blk: null, bg: null,           // calque blocs (lignes + syllabes)
  dirty: true, dirtyBlocks: true, needs: true, drag: null, dpr: 1,
  snapGuide: null, hoverT: null, hoverX: null, hoverHit: null,
  onHead: false, scrubWasPlaying: false, lastGrain: 0,
  followPaused: false, lastDownAt: 0, lastDownX: 0, curBeforeDown: 0,
  RULER: 18, WAVE: 44, LANE: 22, SYL: 36,

  init() {
    this.c = $('#tlCanvas');
    this.g = this.c.getContext('2d');
    this.view = document.createElement('canvas'); this.vg = this.view.getContext('2d');
    this.blk = document.createElement('canvas'); this.bg = this.blk.getContext('2d');
    this.resize();
    this.bind();
    new ResizeObserver(() => this.resize()).observe($('#tlScroll'));
  },

  /** Tout redessiner : vue et blocs. */
  invalidate() { this.dirty = true; this.dirtyBlocks = true; this.needs = true; },
  /** Seuls les blocs ont changé (édition, sélection) : l'onde reste en cache. */
  invalidateBlocks() { this.dirtyBlocks = true; this.needs = true; },
  /** Calques intacts : seules les surcouches (tête, lasso, guides) bougent. */
  repaint() { this.needs = true; },

  resize() {
    const r = $('#tlScroll').getBoundingClientRect();
    if (!r.width || !r.height) return;             // timeline masquée
    const dpr = Math.min(2, devicePixelRatio || 1);
    const w = Math.max(300, Math.floor(r.width * dpr));
    const h = Math.max(120, Math.floor(r.height * dpr));
    if (w === this.c.width && h === this.c.height && dpr === this.dpr) return;
    this.c.width = w; this.c.height = h;
    this.view.width = w; this.view.height = h;
    this.blk.width = w; this.blk.height = h;
    this.dpr = dpr;
    this.invalidate();
  },

  x2t(x) { return S.tlScroll + x / (S.tlZoom * this.dpr); },
  t2x(t) { return (t - S.tlScroll) * S.tlZoom * this.dpr; },
  visSpan() { return this.c.width / (S.tlZoom * this.dpr); },

  /* lane geometry, in device pixels */
  geo() {
    const d = this.dpr;
    const ruler = this.RULER * d, wave = this.WAVE * d, lane = this.LANE * d, syl = this.SYL * d;
    return { ruler, wave, lane, syl, waveY: ruler, laneY: ruler + wave, sylY: ruler + wave + lane };
  },

  clampScroll() {
    const vis = this.visSpan();
    S.tlScroll = clamp(S.tlScroll, 0, Math.max(0, (S.duration || 60) - vis * .5));
  },

  /** Zoom autour d'un point (px canevas) ; sans point : autour de la tête de
      lecture si elle est visible, sinon du centre. */
  setZoom(z, anchorX) {
    let ax = anchorX;
    if (ax === undefined) {
      const px = this.t2x(S.cur);
      ax = px >= 0 && px <= this.c.width ? px : this.c.width / 2;
    }
    const tAt = this.x2t(ax);
    S.tlZoom = clamp(z, 2, 4000);
    S.tlScroll = tAt - ax / (S.tlZoom * this.dpr);
    this.clampScroll();
    this.invalidate();
    this.updateStat();
  },

  /** Défilement manuel : pendant la lecture, le suivi se met en pause
      jusqu'au prochain déplacement de la tête (lecture, clic, recherche). */
  userScrolled() {
    if (S.playing && S.follow && !this.followPaused) { this.followPaused = true; this.updateFollowUi(); }
  },
  resumeFollow() {
    if (this.followPaused) { this.followPaused = false; this.updateFollowUi(); }
  },
  updateFollowUi() {
    const b = $('#ckFollow'); if (!b) return;
    b.classList.toggle('paused', this.followPaused);
    b.title = this.followPaused ? 'Suivi en pause le temps que tu regardes ailleurs — reprend à la prochaine lecture' : 'La vue suit la lecture';
  },

  /* ------------------------------------------------------ calque : vue --- */
  buildView() {
    const g = this.vg, W = this.view.width, H = this.view.height, d = this.dpr;
    const G = this.geo();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = TLC.bg; g.fillRect(0, 0, W, H);
    this.clampScroll();
    const t0 = S.tlScroll, t1 = this.x2t(W);
    const FONT = n => `${n * d}px ${TLC.font}`;

    /* ---- règle ---- */
    g.fillStyle = TLC.ruler; g.fillRect(0, 0, W, G.ruler);
    const steps = [.02, .05, .1, .25, .5, 1, 2, 5, 10, 15, 30, 60, 120];
    const stp = steps.find(s => s * S.tlZoom > 64) || 120;
    g.font = FONT(10); g.textBaseline = 'middle';
    const sub = stp / 5;
    /* on compte en graduations entières : additionner 0,2 s à la chaîne
       accumule des erreurs d'arrondi, et la règle affichait 00:01 deux fois */
    for (let i = Math.floor(t0 / sub); i * sub < t1; i++) {
      const t = Math.round(i * sub * 1000) / 1000;
      const x = Math.round(this.t2x(t)) + .5;
      const major = i % 5 === 0;
      g.strokeStyle = major ? TLC.gridMajor : TLC.gridMinor;
      g.beginPath(); g.moveTo(x, major ? 0 : G.ruler * .55); g.lineTo(x, major ? H : G.ruler); g.stroke();
      if (major) { g.fillStyle = TLC.rulerTxt; g.fillText(fmtTime(t, stp < 1), x + 3 * d, G.ruler / 2); }
    }

    /* ---- onde ---- */
    g.fillStyle = TLC.waveBg; g.fillRect(0, G.waveY, W, G.wave);
    if (S.peaks) {
      const { mn, mx, rate } = S.peaks, mid = G.waveY + G.wave / 2, amp = G.wave / 2 - 2 * d;
      g.strokeStyle = TLC.wave; g.lineWidth = 1;
      g.beginPath();
      for (let x = 0; x < W; x++) {
        const ia = Math.max(0, Math.floor(this.x2t(x) * rate));
        const ib = Math.min(mn.length - 1, Math.ceil(this.x2t(x + 1) * rate));
        if (ia > mn.length - 1) break;
        let a = 1, b = -1;
        for (let i = ia; i <= ib; i++) { if (mn[i] < a) a = mn[i]; if (mx[i] > b) b = mx[i]; }
        if (b < a) continue;
        g.moveTo(x + .5, mid - b * amp); g.lineTo(x + .5, mid - a * amp);
      }
      g.stroke();
      g.strokeStyle = TLC.waveMid; g.beginPath(); g.moveTo(0, mid); g.lineTo(W, mid); g.stroke();

      /* ---- attaques détectées : petits traits sous la règle ---- */
      if (typeof Onsets !== 'undefined' && Onsets.ready()) {
        const o = Onsets.cache;
        g.lineWidth = 1;
        for (let i = 0; i < o.times.length; i++) {
          const t = o.times[i]; if (t < t0) continue; if (t > t1) break;
          const x = Math.round(this.t2x(t)) + .5;
          const h = (3 + 6 * o.str[i]) * d;
          g.strokeStyle = o.str[i] > .5 ? TLC.onsetStrong : TLC.onset;
          g.beginPath(); g.moveTo(x, G.waveY); g.lineTo(x, G.waveY + h); g.stroke();
        }
      }
    } else {
      g.fillStyle = TLC.faint; g.font = FONT(11);
      g.fillText(S.lines.length ? '— sans audio : horloge libre —' : '— aucun audio chargé —', 10 * d, G.waveY + G.wave / 2);
    }

    /* ---- zone de boucle ---- */
    if (S.loop) {
      const lx = this.t2x(S.loop[0]), lw = this.t2x(S.loop[1]) - lx;
      g.fillStyle = TLC.loopFill;
      g.fillRect(lx, 0, lw, H);
      g.strokeStyle = TLC.loopLine; g.lineWidth = 1;
      g.beginPath();
      g.moveTo(lx + .5, 0); g.lineTo(lx + .5, H);
      g.moveTo(lx + lw - .5, 0); g.lineTo(lx + lw - .5, H);
      g.stroke();
    }

    /* ---- fond des pistes ---- */
    g.fillStyle = TLC.laneBg; g.fillRect(0, G.laneY, W, H - G.laneY);
    g.strokeStyle = TLC.laneLine; g.beginPath();
    g.moveTo(0, G.sylY + .5); g.lineTo(W, G.sylY + .5); g.stroke();
    this.dirty = false;
  },

  /* ---------------------------------------------------- calque : blocs --- */
  buildBlocks() {
    const g = this.bg, W = this.blk.width, H = this.blk.height, d = this.dpr;
    const G = this.geo();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, W, H);
    const t0 = S.tlScroll, t1 = this.x2t(W);
    g.font = `${10.5 * d}px ${TLC.font}`; g.textBaseline = 'middle';

    /* ---- lignes ---- */
    S.lines.forEach((L, li) => {
      const sp = lineSpan(L); if (!sp || sp[1] < t0 || sp[0] > t1) return;
      const x = this.t2x(sp[0]), w = Math.max(2 * d, this.t2x(sp[1]) - x);
      const act = li === S.sel.line;
      g.fillStyle = act ? TLC.lineAct : TLC.line;
      g.fillRect(x, G.laneY + 2 * d, w, G.lane - 4 * d);
      g.strokeStyle = act ? TLC.acc : TLC.lineEdge;
      g.lineWidth = 1; g.strokeRect(x + .5, G.laneY + 2 * d + .5, w - 1, G.lane - 4 * d - 1);
      g.save(); g.beginPath(); g.rect(x, G.laneY, w, G.lane); g.clip();
      g.fillStyle = act ? TLC.txt : TLC.dim;
      g.fillText(`${li + 1}· ${L.raw || L.syls.map(s => s.t).join('')}`.slice(0, 110), x + 5 * d, G.laneY + G.lane / 2);
      g.restore();
    });

    /* ---- syllabes ---- */
    const hh = this.hoverHit;
    S.lines.forEach((L, li) => {
      L.syls.forEach((s, si) => {
        if (s.t0 == null) return;
        const e = sylEnd(L, si); if (e == null || e < t0 || s.t0 > t1) return;
        const x = this.t2x(s.t0), w = Math.max(3 * d, this.t2x(e) - x);
        const sel = selHas(li, si);
        const prim = S.sel.line === li && S.sel.syl === si;
        const hov = hh && hh.li === li && hh.si === si && !this.drag;
        g.fillStyle = sel ? TLC.sylSel : (hov ? TLC.sylHover : (li % 2 ? TLC.sylB : TLC.sylA));
        g.fillRect(x, G.sylY + 3 * d, w - 1, G.syl - 7 * d);
        if (sel) {
          g.strokeStyle = prim ? TLC.white : TLC.acc; g.lineWidth = (prim ? 1.6 : 1) * d;
          g.strokeRect(x + .5, G.sylY + 3 * d + .5, w - 2, G.syl - 7 * d - 1);
        } else if (hov) {
          g.strokeStyle = TLC.accDim; g.lineWidth = 1;
          g.strokeRect(x + .5, G.sylY + 3 * d + .5, w - 2, G.syl - 7 * d - 1);
        }
        g.fillStyle = sel ? TLC.white : TLC.acc;
        g.fillRect(x, G.sylY + 3 * d, 2 * d, G.syl - 7 * d);
        if (w > 15 * d) {
          g.save(); g.beginPath(); g.rect(x, G.sylY, w - 2, G.syl); g.clip();
          g.fillStyle = sel ? TLC.white : TLC.txt;
          g.fillText(s.t.trim(), x + 5 * d, G.sylY + G.syl / 2);
          g.restore();
        }
      });
    });
    this.dirtyBlocks = false;
  },

  updateStat() {
    const st = $('#tlStat'); if (st) st.textContent = `${Math.round(S.tlZoom)} px/s` + (S.snap ? ' · aimant' : '');
    const n = selCount();
    const se = $('#tlSel'); if (se) se.textContent = n === 0 ? '—' : (n === 1 ? '1 syllabe' : `${n} syllabes`);
  },

  /* ---------------------------------------------------------- overlays --- */
  draw() {
    if (!this.c.width) return;
    if (this.dirty) this.buildView();
    if (this.dirtyBlocks) this.buildBlocks();
    const g = this.g, W = this.c.width, H = this.c.height, d = this.dpr;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, W, H);
    g.drawImage(this.view, 0, 0);
    g.drawImage(this.blk, 0, 0);
    const G = this.geo();

    /* lasso — borné dans le temps, pas en pixels : le défilement auto ne le déforme pas */
    if (this.drag && this.drag.mode === 'lasso') {
      const dr = this.drag;
      const x0 = this.t2x(dr.ta), x1 = this.t2x(dr.tb);
      const rx = Math.min(x0, x1), ry = Math.min(dr.y0, dr.y1);
      g.fillStyle = TLC.lassoFill; g.fillRect(rx, ry, Math.abs(x1 - x0), Math.abs(dr.y1 - dr.y0));
      g.strokeStyle = TLC.acc; g.lineWidth = 1;
      g.strokeRect(rx + .5, ry + .5, Math.abs(x1 - x0), Math.abs(dr.y1 - dr.y0));
    }

    /* guide d'aimantation */
    if (this.snapGuide != null) {
      const x = Math.round(this.t2x(this.snapGuide)) + .5;
      g.strokeStyle = TLC.snap; g.lineWidth = 1;
      g.setLineDash([4 * d, 3 * d]);
      g.beginPath(); g.moveTo(x, G.laneY); g.lineTo(x, H); g.stroke();
      g.setLineDash([]);
    }

    /* lame */
    if (S.tool === 'C' && this.hoverT != null && !this.drag) {
      const x = Math.round(this.t2x(this.hoverT)) + .5;
      g.strokeStyle = TLC.razor; g.lineWidth = 1;
      g.beginPath(); g.moveTo(x, G.sylY); g.lineTo(x, H); g.stroke();
    }

    /* temps sous le curseur, dans la règle */
    if (this.hoverX != null && !this.drag && !this.onHead) {
      const x = Math.round(this.hoverX) + .5;
      g.strokeStyle = TLC.cursor; g.lineWidth = 1;
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x, G.laneY); g.stroke();
      this.label(g, fmtTime(this.x2t(this.hoverX)), x + 6 * d, 1, TLC.cursor, TLC.cursorTxt);
    }

    /* tête de lecture + poignée */
    const px = Math.round(this.t2x(S.cur)) + .5;
    if (px >= -12 && px <= W + 12) {
      const hot = this.onHead || (this.drag && this.drag.mode === 'scrub');
      g.strokeStyle = hot ? TLC.white : TLC.head;
      g.lineWidth = (hot ? 2 : 1.4) * d;
      g.beginPath(); g.moveTo(px, 0); g.lineTo(px, H); g.stroke();
      const s = (hot ? 7 : 5) * d;
      g.fillStyle = hot ? TLC.white : TLC.head;
      g.beginPath();
      g.moveTo(px - s, 0); g.lineTo(px + s, 0); g.lineTo(px, s * 1.5); g.fill();
      if (hot) this.label(g, fmtTime(S.cur), px + 7 * d, 1, TLC.head, TLC.head);
    }
  },

  /** Petite étiquette monospace sur fond sombre. */
  label(g, txt, x, y, border, color) {
    const d = this.dpr, W = this.c.width;
    g.font = `${10 * d}px ${TLC.font}`; g.textBaseline = 'middle';
    const tw = g.measureText(txt).width + 8 * d;
    const bx = clamp(x, 0, Math.max(0, W - tw));
    g.fillStyle = TLC.labelBg; g.fillRect(bx, y, tw, 14 * d);
    g.strokeStyle = border; g.lineWidth = 1; g.strokeRect(bx + .5, y + .5, tw - 1, 14 * d - 1);
    g.fillStyle = color; g.fillText(txt, bx + 4 * d, y + 7 * d);
  },

  /* ------------------------------------------------------ hit testing --- */
  zone(my) {
    const G = this.geo();
    if (my < G.ruler) return 'ruler';
    if (my < G.laneY) return 'wave';
    if (my < G.sylY) return 'lane';
    if (my < G.sylY + G.syl) return 'syl';
    return 'below';
  },

  /** Le bloc sous le pointeur. Quand deux blocs se touchent, celui qui
      CONTIENT le pointeur gagne. Les poignées de bord prennent 6 px sur un
      bloc large ; sur un bloc étroit elles se réduisent à 30 % de chaque
      côté, pour rester saisissables sans zoomer.                            */
  hitSyl(mx, my) {
    const G = this.geo();
    if (my < G.sylY || my > G.sylY + G.syl) return null;
    const d = this.dpr, grab = 6 * d, tol = 3 * d;
    const tv0 = this.x2t(-tol), tv1 = this.x2t(this.c.width + tol);
    let best = null, bestScore = Infinity;
    for (let li = 0; li < S.lines.length; li++) {
      const L = S.lines[li];
      for (let si = 0; si < L.syls.length; si++) {
        const s = L.syls[si]; if (s.t0 == null) continue;
        const e = sylEnd(L, si); if (e == null || e < tv0 || s.t0 > tv1) continue;
        const x = this.t2x(s.t0), w = Math.max(3 * d, this.t2x(e) - x);
        if (mx < x - tol || mx > x + w + tol) continue;
        const dl = Math.abs(mx - x), dr = Math.abs(x + w - mx);
        const score = (mx >= x && mx <= x + w) ? 0 : Math.min(dl, dr);
        if (score > bestScore || (score === bestScore && best && dl >= best.dl)) continue;
        let edge = 'M';
        const gz = w >= grab * 2 + 4 * d ? grab : Math.max(2 * d, w * .3);
        if (w >= 6 * d) {
          if (dl <= gz && dl <= dr) edge = 'L';
          else if (dr <= gz) edge = 'R';
        }
        best = { li, si, edge, x, w, t0: s.t0, t1: e, dl };
        bestScore = score;
      }
    }
    return best;
  },

  hitLine(mx, my) {
    const G = this.geo();
    if (my < G.laneY || my > G.sylY) return null;
    for (let li = 0; li < S.lines.length; li++) {
      const sp = lineSpan(S.lines[li]); if (!sp) continue;
      const x = this.t2x(sp[0]), w = Math.max(2 * this.dpr, this.t2x(sp[1]) - x);
      if (mx >= x && mx <= x + w) return li;
    }
    return null;
  },

  /* ------------------------------------------------------------ scrubbing --- */
  /** True when the pointer is close enough to grab the playhead. */
  nearHead(mx) { return Math.abs(mx - this.t2x(S.cur)) < 8 * this.dpr; },

  /** Take over the transport for the duration of a drag: the audio source is
      stopped ONCE instead of being restarted on every mouse move.           */
  startScrub() {
    this.scrubWasPlaying = S.playing;
    if (S.playing) { S.cur = now(); stopSrc(); S.holdAt = null; setPlaying(false); }
    this.c.style.cursor = 'ew-resize';
    this.resumeFollow();
  },

  scrubTo(t, noSnap) {
    t = this.snapTime(clamp(t, 0, S.duration || 0), null, noSnap || !S.snap);
    S.cur = clamp(t, 0, S.duration || 0);
    Particles.reset();
    updateTime();
    this.scrubAudio(S.cur);
    // keep the playhead in view while dragging near an edge
    const vis = this.visSpan();
    if (S.cur < S.tlScroll + vis * .04 || S.cur > S.tlScroll + vis * .96) {
      S.tlScroll = Math.max(0, S.cur - vis * .5);
      this.dirty = true; this.dirtyBlocks = true;
    }
    this.repaint();
    requestRender();
  },

  endScrub() {
    this.c.style.cursor = '';
    this.snapGuide = null;
    if (this.scrubWasPlaying) play(S.cur);
    else Scene.sendClock(true);
    this.scrubWasPlaying = false;
    this.repaint();
  },

  /** Short audio grain under the cursor, like an NLE scrub. */
  scrubAudio(t) {
    if (!S.scrubAudio || !S.buffer || !S.ctx) return;
    const ms = performance.now();
    if (ms - this.lastGrain < 55) return;
    this.lastGrain = ms;
    try {
      if (S.ctx.state === 'suspended') S.ctx.resume();
      const src = S.ctx.createBufferSource(), gn = S.ctx.createGain();
      src.buffer = S.buffer;
      const T = S.ctx.currentTime, D = .09;
      gn.gain.setValueAtTime(0, T);
      gn.gain.linearRampToValueAtTime(.85, T + .007);
      gn.gain.setValueAtTime(.85, T + D - .022);
      gn.gain.linearRampToValueAtTime(0, T + D);
      src.connect(gn); gn.connect(S.ctx.destination);
      src.start(T, clamp(t, 0, Math.max(0, S.duration - .1)), D);
      src.stop(T + D + .01);
    } catch (e) { /* un grain perdu n'est jamais grave */ }
  },

  /* ----------------------------------------------------------- snapping --- */
  /** Aimante `t` : tête de lecture, bords des syllabes voisines, puis les
      attaques détectées dans l'audio, puis la grille de 10 ms. Les syllabes
      en train de bouger (`ignore`) ne sont jamais des cibles.               */
  snapTime(t, ignore, noSnap) {
    this.snapGuide = null;
    if (!S.snap || noSnap) return t;
    const tol = 9 / (S.tlZoom);                 // 9 px expressed in seconds
    let best = null, bd = tol;
    const test = v => { if (v == null) return; const d2 = Math.abs(v - t); if (d2 < bd) { bd = d2; best = v; } };
    if (!(this.drag && this.drag.mode === 'scrub')) test(S.cur);
    const skip = ignore || new Set();
    const t0 = S.tlScroll - tol, t1 = this.x2t(this.c.width) + tol;
    for (let li = 0; li < S.lines.length; li++) {
      const L = S.lines[li];
      for (let si = 0; si < L.syls.length; si++) {
        if (skip.has(sk(li, si))) continue;
        const s = L.syls[si]; if (s.t0 == null) continue;
        const e = sylEnd(L, si);
        if ((s.t0 < t0 || s.t0 > t1) && (e == null || e < t0 || e > t1)) continue;
        test(s.t0); test(e);
      }
    }
    if (best == null && typeof Onsets !== 'undefined' && Onsets.ready()) test(Onsets.nearest(t, tol));
    if (best != null) { this.snapGuide = best; return best; }
    return Math.round(t * 100) / 100;           // 10 ms grid fallback
  },

  /* ------------------------------------------------------------- bornes --- */
  /** Fin « dure » d'une voisine : sa fin explicite, sinon juste après son début. */
  hardEnd(s) { return s.t1 != null ? s.t1 : s.t0 + MIN_SYL; },

  /** Intervalle de décalage permis pour un groupe : jamais avant 0, jamais à
      travers une voisine de la même ligne qui ne fait pas partie du groupe. */
  moveBounds(items, keys) {
    let lo = -Infinity, hi = Infinity;
    for (const it of items) {
      const L = S.lines[it.li];
      lo = Math.max(lo, -it.o0);
      for (let j = it.si - 1; j >= 0; j--) {
        const n = L.syls[j]; if (n.t0 == null) continue;
        if (!keys.has(sk(it.li, j))) lo = Math.max(lo, this.hardEnd(n) - it.o0);
        break;
      }
      for (let j = it.si + 1; j < L.syls.length; j++) {
        const n = L.syls[j]; if (n.t0 == null) continue;
        if (!keys.has(sk(it.li, j))) hi = Math.min(hi, n.t0 - MIN_SYL - (it.o1 != null ? it.o1 : it.o0));
        break;
      }
    }
    return [lo, Math.max(lo, hi)];
  },

  /** Voisines immédiates (calées) d'une syllabe dans sa ligne. */
  neighbours(li, si) {
    const L = S.lines[li]; let prev = null, next = null;
    for (let j = si - 1; j >= 0; j--) if (L.syls[j].t0 != null) { prev = L.syls[j]; break; }
    for (let j = si + 1; j < L.syls.length; j++) if (L.syls[j].t0 != null) { next = L.syls[j]; break; }
    return { prev, next };
  },

  /* ------------------------------------------------------------- events --- */
  bind() {
    const c = this.c;

    c.addEventListener('contextmenu', e => {
      e.preventDefault();
      if (this.drag) return;
      const [mx, my] = this.local(e);
      const h = this.hitSyl(mx, my);
      if (h) {
        if (!selHas(h.li, h.si)) selOne(h.li, h.si);
        this.invalidateBlocks(); renderSylList();
        ctxMenuSyl(e.clientX, e.clientY, h);
      } else {
        const li = this.hitLine(mx, my);
        if (li != null) { selLine(li); this.invalidateBlocks(); renderSylList(); ctxMenuLine(e.clientX, e.clientY, li); }
        else ctxMenuEmpty(e.clientX, e.clientY, this.x2t(mx));
      }
    });

    // clic molette : sous Windows, le navigateur lancerait son défilement automatique
    c.addEventListener('mousedown', e => { if (e.button === 1) e.preventDefault(); });
    c.addEventListener('pointerdown', e => this.onDown(e));
    c.addEventListener('pointermove', e => this.onMove(e));
    c.addEventListener('pointerup', e => this.onUp(e));
    c.addEventListener('pointercancel', () => this.cancelDrag());
    c.addEventListener('lostpointercapture', e => { if (this.drag) this.onUp(e); });
    c.addEventListener('pointerleave', () => {
      if (this.drag) return;
      this.hideTip(); this.hoverT = null; this.hoverX = null;
      if (this.hoverHit) { this.hoverHit = null; this.invalidateBlocks(); }
      if (this.onHead) this.onHead = false;
      this.repaint();
    });
    c.addEventListener('dblclick', e => {
      const [mx, my] = this.local(e);
      const z = this.zone(my);
      if (z === 'ruler' || z === 'wave') { seek(this.curBeforeDown); zoomFit(); return; }   // la tête ne bouge pas
      const h = this.hitSyl(mx, my);
      const li = h ? h.li : this.hitLine(mx, my);
      if (li != null) { selLine(li); zoomSelection(); renderSylList(); }
    });

    c.addEventListener('wheel', e => {
      e.preventDefault();
      const [mx] = this.local(e);
      const k = e.deltaMode === 1 ? 16 : 1;
      const dx = e.deltaX * k, dy = e.deltaY * k;
      // molette : zoom · Maj ou geste horizontal (pavé tactile) : défilement
      if (e.shiftKey || Math.abs(dx) > Math.abs(dy)) {
        const delta = Math.abs(dx) > Math.abs(dy) ? dx : dy;
        S.tlScroll += delta / S.tlZoom;
        this.clampScroll(); this.userScrolled(); this.invalidate();
      } else if (dy) {
        this.setZoom(S.tlZoom * Math.pow(1.0018, -dy), mx);
      }
    }, { passive: false });
  },

  local(e) {
    const r = this.c.getBoundingClientRect();
    return [(e.clientX - r.left) * this.dpr, (e.clientY - r.top) * this.dpr];
  },

  onDown(e) {
    const c = this.c;
    if (this.drag) return;
    const [mx, my] = this.local(e);
    const d = this.dpr;

    /* clic molette : saisir la timeline pour la faire glisser */
    if (e.button === 1) {
      e.preventDefault();
      capturePointer(c, e);
      this.drag = { mode: 'pan', x0: mx, s0: S.tlScroll };
      c.style.cursor = 'grabbing';
      this.userScrolled();
      return;
    }
    if (e.button !== 0) return;
    hideCtx();
    this.hideTip();
    const z = this.zone(my);

    /* règle et onde : prise en main de la tête de lecture.
       Le second clic d'un double-clic ne déplace rien : « voir tout » ne
       doit pas faire sauter la tête.                                     */
    if (z === 'ruler' || z === 'wave') {
      const nowMs = performance.now();
      const dbl = nowMs - this.lastDownAt < 350 && Math.abs(mx - this.lastDownX) < 6 * d;
      this.lastDownAt = nowMs; this.lastDownX = mx;
      if (dbl) return;
      this.curBeforeDown = S.cur;
      capturePointer(c, e);
      const grabbed = this.nearHead(mx);
      this.startScrub();
      this.drag = { mode: 'scrub', grabbed };
      if (!grabbed) this.scrubTo(this.x2t(mx), e.altKey);
      this.repaint();
      return;
    }
    capturePointer(c, e);

    /* piste des lignes : sélectionner la ligne, la glisser en bloc */
    if (z === 'lane') {
      const li = this.hitLine(mx, my);
      if (li == null) { this.drag = { mode: 'scrub', grabbed: false }; this.startScrub(); this.scrubTo(this.x2t(mx), true); return; }
      selLine(li);
      const items = S.lines[li].syls.map((s, si) => ({ li, si, o0: s.t0, o1: s.t1 })).filter(o => o.o0 != null);
      const after = S.ripple ? this.linesAfter(li) : null;
      this.drag = {
        mode: 'line', li, x0: mx, grab: this.x2t(mx), pending: true, moved: false,
        items, keys: new Set(items.concat(after || []).map(o => sk(o.li, o.si))), prim: items[0],
        after, seekTo: lineSpan(S.lines[li])[0]
      };
      renderSylList(); this.invalidateBlocks();
      return;
    }
    if (z !== 'syl') { this.releaseCapture(e); return; }

    const h = this.hitSyl(mx, my);

    /* lame */
    if (S.tool === 'C') {
      if (h) splitSylAt(h.li, h.si, this.x2t(mx));
      this.releaseCapture(e);
      return;
    }

    /* lasso dans le vide — Alt retire de la sélection */
    if (!h) {
      const sub = e.altKey;
      const add = !sub && (e.ctrlKey || e.metaKey || e.shiftKey);
      if (!add && !sub) { selClear(); renderSylList(); }
      const ta = this.x2t(mx);
      this.drag = { mode: 'lasso', ta, tb: ta, y0: my, y1: my, add, sub };
      this.invalidateBlocks();
      return;
    }

    let selectOnUp = false;
    if (e.shiftKey) selRangeTo(h.li, h.si);
    else if (e.ctrlKey || e.metaKey) {
      selToggle(h.li, h.si);
      if (!selHas(h.li, h.si)) { renderSylList(); this.invalidateBlocks(); this.releaseCapture(e); return; }
    }
    else if (!selHas(h.li, h.si)) { selOne(h.li, h.si); seek(h.t0); }
    else { S.sel = { line: h.li, syl: h.si }; selectOnUp = true; }   // un clic sans glisser réduira la sélection

    const items = (h.edge === 'M' ? selList() : [{ li: h.li, si: h.si, s: S.lines[h.li].syls[h.si] }])
      .filter(o => o.s.t0 != null)
      .map(o => ({ li: o.li, si: o.si, o0: o.s.t0, o1: o.s.t1, oe: sylEnd(S.lines[o.li], o.si) }));
    const prim = items.find(o => o.li === h.li && o.si === h.si) || items[0];
    const after = S.ripple && h.edge === 'M' ? this.afterOf(items) : null;
    this.drag = {
      mode: h.edge === 'M' ? 'move' : (h.edge === 'L' ? 'edgeL' : 'edgeR'),
      x0: mx, grab: this.x2t(mx), pending: true, moved: false, selectOnUp, h,
      items, keys: new Set(items.concat(after || []).map(o => sk(o.li, o.si))), prim, after
    };
    renderSylList(); this.invalidateBlocks();
  },

  onMove(e) {
    const [mx, my] = this.local(e);
    const d = this.drag;
    if (!d) { this.hover(e, mx, my); return; }

    if (d.mode === 'pan') {
      S.tlScroll = d.s0 - (mx - d.x0) / (S.tlZoom * this.dpr);
      this.clampScroll(); this.invalidate();
      return;
    }
    if (d.mode === 'scrub') { this.scrubTo(this.x2t(mx), e.altKey); return; }
    if (d.mode === 'lasso') { d.tb = this.x2t(mx); d.y1 = my; this.autoScroll(mx); this.repaint(); return; }

    if (d.pending) {
      if (Math.abs(mx - d.x0) < DRAG_PX * this.dpr) return;
      if (!d.items.length) return;
      d.pending = false;
      d.selectOnUp = false;
      Undo.snap(d.mode === 'line' ? 'déplacer la ligne' : d.mode === 'move' ? 'déplacer' : 'redimensionner');
      this.c.style.cursor = d.mode === 'move' || d.mode === 'line' ? 'grabbing' : 'ew-resize';
    }
    this.autoScroll(mx);

    const raw = this.x2t(mx) - d.grab;
    const noSnap = e.altKey;
    let dt = 0, tipTxt = '';

    if (d.mode === 'edgeL' || d.mode === 'edgeR') {
      const p = d.prim, s = S.lines[p.li].syls[p.si];
      const { prev, next } = this.neighbours(p.li, p.si);
      const end = p.oe != null ? p.oe : p.o0 + .3;
      if (d.mode === 'edgeL') {
        const nt = this.snapTime(p.o0 + raw, d.keys, noSnap);
        const lo = prev ? this.hardEnd(prev) : 0;
        s.t0 = clamp(nt, lo, Math.max(lo, end - MIN_SYL));
        dt = s.t0 - p.o0;
        tipTxt = `début ${fmtTime(s.t0)}   ${this.fmtDelta(dt)}`;
      } else {
        const nt = this.snapTime(end + raw, d.keys, noSnap);
        const hi = next ? next.t0 : Infinity;
        s.t1 = clamp(nt, s.t0 + MIN_SYL, Math.max(s.t0 + MIN_SYL, hi));
        dt = s.t1 - end;
        tipTxt = `fin ${fmtTime(s.t1)}   ${this.fmtDelta(dt)}   ${Math.round((s.t1 - s.t0) * 1000)} ms`;
      }
    } else if (d.mode === 'move') {
      const nt = this.snapTime(d.prim.o0 + raw, d.keys, noSnap);
      const moving = d.after ? d.items.concat(d.after) : d.items;
      const [lo, hi] = this.moveBounds(moving, d.keys);
      dt = clamp(nt - d.prim.o0, lo, hi);
      for (const it of moving) {
        const s = S.lines[it.li].syls[it.si];
        s.t0 = it.o0 + dt;
        if (it.o1 != null) s.t1 = it.o1 + dt;
      }
      const s = S.lines[d.prim.li].syls[d.prim.si];
      tipTxt = `${fmtTime(s.t0)} → ${fmtTime(sylEnd(S.lines[d.prim.li], d.prim.si))}   ${this.fmtDelta(dt)}`
        + (moving.length > 1 ? `   (${moving.length} syllabes)` : '');
    } else if (d.mode === 'line') {
      const nt = this.snapTime(d.prim.o0 + raw, d.keys, noSnap);
      const li = d.li;
      let lo = -Math.min(...d.items.map(o => o.o0)), hi = Infinity;
      const prevEnd = li > 0 ? this.spanBefore(li) : null;
      if (prevEnd != null) lo = Math.max(lo, prevEnd + MIN_SYL - d.prim.o0);
      if (!d.after) { const nx = this.spanAfter(li); if (nx != null) hi = nx - MIN_SYL - Math.max(...d.items.map(o => o.o1 != null ? o.o1 : o.o0)); }
      dt = clamp(nt - d.prim.o0, lo, Math.max(lo, hi));
      for (const it of d.items.concat(d.after || [])) {
        const s = S.lines[it.li].syls[it.si];
        s.t0 = it.o0 + dt;
        if (it.o1 != null) s.t1 = it.o1 + dt;
      }
      const sp = lineSpan(S.lines[li]);
      tipTxt = `ligne ${li + 1}   ${fmtTime(sp[0])} → ${fmtTime(sp[1])}   ${this.fmtDelta(dt)}`;
    }
    d.moved = true;
    this.showTip(e, tipTxt);
    this.invalidateBlocks();
    requestRender();
    docChanged();
  },

  fmtDelta(dt) { const ms = Math.round(dt * 1000); return (ms > 0 ? '+' : '') + ms + ' ms'; },

  onUp(e) {
    const d = this.drag;
    if (!d) return;
    this.drag = null;
    this.releaseCapture(e);
    this.c.style.cursor = '';
    this.snapGuide = null;
    this.hideTip();

    if (d.mode === 'pan') { this.invalidate(); return; }
    if (d.mode === 'scrub') { this.endScrub(); return; }
    if (d.mode === 'lasso') { this.applyLasso(d); renderSylList(); this.invalidateBlocks(); return; }

    if (d.pending) {
      // simple clic : aucun timing ne bouge
      if (d.mode === 'line') { seek(d.seekTo); }
      else if (d.selectOnUp) { selOne(d.h.li, d.h.si); seek(d.h.t0); }
      renderSylList(); this.invalidateBlocks();
      return;
    }
    if (d.moved) {
      refreshDuration();
      if (S.loop) {                       // la boucle suit la ligne qu'on vient de déplacer
        const L = S.lines[S.sel.line], sp = L && lineSpan(L);
        S.loop = sp ? [Math.max(0, sp[0] - .35), sp[1] + .35] : null;
        this.invalidate();
      }
      Undo.doc.scheduleCheck();           // le document a changé : modifié, autosave
      renderSylList(); requestRender();
    }
    this.invalidateBlocks();
  },

  /** Annule le geste en cours et remet tout comme avant (Échap, perte du pointeur). */
  cancelDrag() {
    const d = this.drag; if (!d) return;
    this.drag = null; this.snapGuide = null; this.c.style.cursor = '';
    this.hideTip();
    if (d.mode === 'scrub') { this.endScrub(); return; }
    if (d.moved && d.items) {           // on remet tout comme avant le geste
      for (const it of d.items.concat(d.after || [])) {
        const L = S.lines[it.li], s = L && L.syls[it.si];
        if (s) { s.t0 = it.o0; s.t1 = it.o1; }
      }
      renderSylList(); requestRender();
      toast('Geste annulé');
    }
    this.invalidateBlocks();
  },

  releaseCapture(e) {
    try { if (e && e.pointerId != null && this.c.hasPointerCapture(e.pointerId)) this.c.releasePointerCapture(e.pointerId); }
    catch (er) { }
  },

  /** Faire défiler quand un glissé approche d'un bord. */
  autoScroll(mx) {
    const edge = 28 * this.dpr, W = this.c.width;
    let v = 0;
    if (mx < edge) v = -(edge - mx);
    else if (mx > W - edge) v = mx - (W - edge);
    if (!v) return;
    S.tlScroll += v / (S.tlZoom * this.dpr) * .25;
    this.clampScroll(); this.dirty = true; this.dirtyBlocks = true;
  },

  showTip(e, txt) {
    const tip = $('#tlTip'), c = this.c;
    if (!txt) { this.hideTip(); return; }
    tip.style.display = 'block';
    tip.textContent = txt;
    const r = c.getBoundingClientRect();
    tip.style.left = clamp(e.clientX - r.left + 12, 0, Math.max(0, r.width - tip.offsetWidth - 4)) + 'px';
    tip.style.top = Math.max(0, e.clientY - r.top - 28) + 'px';
  },
  hideTip() { const tip = $('#tlTip'); if (tip) tip.style.display = 'none'; },

  hover(e, mx, my) {
    const c = this.c;
    const z = this.zone(my);
    this.hoverT = z === 'syl' ? this.x2t(mx) : null;
    this.hoverX = mx;
    const onRuler = z === 'ruler' || z === 'wave';
    const head = onRuler && this.nearHead(mx);
    if (head !== this.onHead) this.onHead = head;
    const h = z === 'syl' ? this.hitSyl(mx, my) : null;
    const lineHit = z === 'lane' ? this.hitLine(mx, my) : null;
    const hk = h ? { li: h.li, si: h.si } : null;
    if ((hk && (!this.hoverHit || this.hoverHit.li !== hk.li || this.hoverHit.si !== hk.si)) || (!hk && this.hoverHit)) {
      this.hoverHit = hk; this.invalidateBlocks();
    }
    this.repaint();
    c.style.cursor = head ? 'ew-resize'
      : S.tool === 'C' ? 'crosshair'
        : h ? (h.edge === 'M' ? 'grab' : 'ew-resize')
          : lineHit != null ? 'grab'
            : onRuler ? 'col-resize' : 'default';
    if (h) {
      const L = S.lines[h.li], s = L.syls[h.si];
      this.showTip(e, `${h.li + 1}·${h.si + 1}  « ${s.t.trim()} »   ${fmtTime(s.t0)} → ${fmtTime(h.t1)}   ${Math.round((h.t1 - s.t0) * 1000)} ms`
        + (h.edge !== 'M' ? (h.edge === 'L' ? '   ⇤ début' : '   fin ⇥') : ''));
    } else if (lineHit != null) {
      const sp = lineSpan(S.lines[lineHit]);
      this.showTip(e, `ligne ${lineHit + 1}   ${fmtTime(sp[0])} → ${fmtTime(sp[1])}   glisser pour déplacer en bloc`);
    } else this.hideTip();
  },

  /** Syllables located after the last dragged one — used by ripple mode. */
  afterOf(items) {
    const flat = allSyls();
    const last = items[items.length - 1];
    const idx = flat.findIndex(o => o.li === last.li && o.si === last.si);
    if (idx < 0) return null;
    const keys = new Set(items.map(o => sk(o.li, o.si)));
    return flat.slice(idx + 1)
      .filter(o => o.s.t0 != null && !keys.has(sk(o.li, o.si)))
      .map(o => ({ li: o.li, si: o.si, o0: o.s.t0, o1: o.s.t1 }));
  },
  linesAfter(li) {
    const out = [];
    for (let j = li + 1; j < S.lines.length; j++)
      S.lines[j].syls.forEach((s, si) => { if (s.t0 != null) out.push({ li: j, si, o0: s.t0, o1: s.t1 }); });
    return out;
  },
  /** Fin de la ligne calée précédente / début de la suivante. */
  spanBefore(li) { for (let j = li - 1; j >= 0; j--) { const sp = lineSpan(S.lines[j]); if (sp) return sp[1]; } return null; },
  spanAfter(li) { for (let j = li + 1; j < S.lines.length; j++) { const sp = lineSpan(S.lines[j]); if (sp) return sp[0]; } return null; },

  applyLasso(d) {
    const G = this.geo();
    const ry = Math.min(d.y0, d.y1), ry2 = Math.max(d.y0, d.y1);
    if (ry2 < G.sylY || ry > G.sylY + G.syl) return;
    const a = Math.min(d.ta, d.tb), b = Math.max(d.ta, d.tb);
    if ((b - a) * S.tlZoom < DRAG_PX) return;                      // simple clic dans le vide
    if (!d.add && !d.sub) selClear();
    let first = null;
    S.lines.forEach((L, li) => L.syls.forEach((s, si) => {
      if (s.t0 == null) return;
      const e = sylEnd(L, si); if (e == null) return;
      if (e >= a && s.t0 <= b) {
        if (d.sub) S.selSet.delete(sk(li, si));
        else { S.selSet.add(sk(li, si)); if (!first) first = { li, si }; }
      }
    }));
    if (first) S.sel = { line: first.li, syl: first.si };
  }
};

/* Couleurs du canevas — lues dans les variables CSS au premier dessin, pour
   que la timeline suive le thème de l'interface.                           */
const TLC = {
  font: 'ui-monospace,Consolas,monospace',
  bg: '#15171a', ruler: '#1a1d21', rulerTxt: '#9aa3ad', gridMajor: '#2c3139', gridMinor: '#22262c',
  waveBg: '#121417', wave: '#3b7f93', waveMid: '#243a42', onset: 'rgba(63,184,216,.35)', onsetStrong: 'rgba(63,184,216,.7)',
  loopFill: 'rgba(63,184,216,.07)', loopLine: 'rgba(63,184,216,.5)',
  laneBg: '#191c20', laneLine: '#2c3139',
  line: '#242930', lineAct: '#1f3640', lineEdge: '#343a43',
  sylA: '#262c34', sylB: '#232931', sylSel: '#2a5f70', sylHover: '#2d343d',
  acc: '#3fb8d8', accDim: 'rgba(63,184,216,.5)', white: '#ffffff', txt: '#e6e8eb', dim: '#9aa3ad', faint: '#5f6771',
  head: '#3fb8d8', snap: '#e0a537', razor: '#e05a5a', cursor: 'rgba(230,232,235,.35)', cursorTxt: '#9aa3ad',
  lassoFill: 'rgba(63,184,216,.12)', labelBg: 'rgba(21,23,26,.94)'
};

/* Le compteur de l'en-tête se pilote aussi à la souris : clic maintenu puis
   glissé horizontal, comme un champ numérique de station de montage. Un
   simple clic ne touche pas à la lecture.                                    */
function bindTimeScrub() {
  const el = $('#time');
  let st = null;
  el.addEventListener('pointerdown', e => {
    if (e.button !== 0 || !S.duration) return;
    e.preventDefault();
    capturePointer(el, e);
    st = { x: e.clientX, t: S.cur, started: false };
  });
  el.addEventListener('pointermove', e => {
    if (!st) return;
    if (!st.started) {
      if (Math.abs(e.clientX - st.x) < 3) return;
      st.started = true; st.t = now();
      el.classList.add('drag'); TL.startScrub();
    }
    const k = e.altKey ? .002 : (e.shiftKey ? .25 : .02);   // s par pixel
    TL.scrubTo(st.t + (e.clientX - st.x) * k, true);
  });
  const end = () => {
    if (!st) return;
    const was = st.started; st = null;
    if (was) { el.classList.remove('drag'); TL.endScrub(); }
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  el.addEventListener('lostpointercapture', end);
}
