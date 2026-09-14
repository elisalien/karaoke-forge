/* ============================================================================
   KARAOKE FORGE — render : layout, text, glyph mask, particles, WebGL post
   ============================================================================ */

/* ------------------------------------------------------------ stage size --- */
const glc = $('#glc');
const txc = document.createElement('canvas');           // text layer (2D)
const tx  = txc.getContext('2d', { alpha: true, willReadFrequently: false });
const lyc = document.createElement('canvas');           // per-syllable soft-mask layer
const ly  = lyc.getContext('2d');
const mkc = document.createElement('canvas');           // glyph mask sampling
const mk  = mkc.getContext('2d', { willReadFrequently: true });

let RW = 1920, RH = 1080;                               // current render size

function resizeStage() {
  const [w, h] = P.resPreset.split('x').map(Number);
  S.W = w; S.H = h;
  setRenderSize(Math.round(w * parseFloat(P.previewScale)), Math.round(h * parseFloat(P.previewScale)));
  fitStage();
}

function setRenderSize(w, h) {
  if (RW === w && RH === h && glc.width === w) return;
  RW = w; RH = h;
  glc.width = w; glc.height = h;
  txc.width = w; txc.height = h;
  S.dirtyLayout = true; S.dirtyMask = true;
  GL.resize(w, h);
}

function fitStage() {
  const box = $('#stage').getBoundingClientRect();
  const aw = box.width - 34, ah = box.height - 34;
  const k = Math.min(aw / S.W, ah / S.H);
  glc.style.width = Math.floor(S.W * k) + 'px';
  glc.style.height = Math.floor(S.H * k) + 'px';
  $('#stageInfo').textContent = `${S.W}×${S.H} · aperçu ${Math.round(parseFloat(P.previewScale) * 100)}%`;
}
addEventListener('resize', () => { fitStage(); TL.resize(); });

/* --------------------------------------------------------------- layout --- */
/* All metrics are computed in *render pixels* so preview == export.          */
const Layout = {
  ver: 0, lines: [], fontPx: 0, lineH: 0,

  fontStr(px) {
    const fam = P.fontFamily === '__custom__' ? '"KFCustom"' : P.fontFamily;
    return `${P.italic ? 'italic ' : ''}${P.fontWeight} ${px}px ${fam}`;
  },

  build() {
    const fontPx = P.fontSize / 100 * RH;
    this.fontPx = fontPx;
    this.lineH = fontPx * P.lineHeight;
    const ls = P.letterSpacing * fontPx;
    const maxW = P.maxWidth / 100 * RW;
    tx.font = this.fontStr(fontPx);
    tx.textBaseline = 'alphabetic';

    /* Per-character advances are measured ONCE here and reused every frame:
       measureText() in the draw loop was the single hottest call.            */
    this.lines = S.lines.map(L => {
      const syls = [];
      let x = 0;
      for (const s of L.syls) {
        const t = P.uppercase ? s.t.toUpperCase() : s.t;
        const chars = Array.from(t);
        const adv = new Float32Array(chars.length);
        let w = 0;
        for (let i = 0; i < chars.length; i++) { adv[i] = tx.measureText(chars[i]).width + ls; w += adv[i]; }
        syls.push({ t, chars, adv, x, w });
        x += w;
      }
      const total = Math.max(1, x);
      return { syls, w: total, scale: total > maxW ? maxW / total : 1 };
    });
    this.ver++;
    S.dirtyLayout = false;
    S.dirtyMask = true;
  },

  /** Origin (left edge of the text, baseline y) of a line drawn at row `row`. */
  originX(li, scale) {
    const w = this.lines[li].w * this.lines[li].scale * scale;
    const cx = P.posX / 100 * RW;
    if (P.align === 'left') return cx - P.maxWidth / 100 * RW / 2;
    if (P.align === 'right') return cx + P.maxWidth / 100 * RW / 2 - w;
    return cx - w / 2;
  }
};

/* ----------------------------------------------------------- fill styles --- */
function stopsFor(mode) {
  const c1 = P.fillC1, c2 = P.fillC2, c3 = P.fillC3;
  switch (mode) {
    case 'solid':  return [[0, c1], [1, c1]];
    case 'linear': return [[0, c1], [1, c2]];
    case 'tri':    return [[0, c1], [.5, c2], [1, c3]];
    case 'chrome': return [[0, '#ffffff'], [.16, c2], [.42, '#0b1230'], [.5, '#6f86c8'], [.58, '#ffffff'], [.8, c1], [1, c3]];
    case 'holo':   return [[0, c2], [.2, '#a06bff'], [.4, c3], [.6, '#ffe66b'], [.8, '#6bffb0'], [1, c2]];
    default:       return null; // 'hue' handled separately
  }
}
function hueStops(off) {
  const a = [];
  for (let i = 0; i <= 6; i++) a.push([i / 6, `hsl(${((i / 6 + off) * 360) % 360},100%,62%)`]);
  return a;
}
/** Gradient axis for the whole text block, so it stays continuous across lines. */
function gradSpec(time) {
  const ang = P.fillAngle * Math.PI / 180;
  const R = Math.max(RW, RH) * .55 / Math.max(.05, P.fillScale);
  const cx = RW / 2, cy = RH / 2;
  const off = time * P.fillSpeed;
  const dx = Math.cos(ang) * R, dy = Math.sin(ang) * R;
  const sh = (off % 2) * R;                    // travelling offset
  const kx = sh * Math.cos(ang), ky = sh * Math.sin(ang);
  return {
    x0: cx - dx - kx, y0: cy - dy - ky, x1: cx + dx - kx, y1: cy + dy - ky,
    stops: P.fillMode === 'hue' ? hueStops(off * .25) : stopsFor(P.fillMode)
  };
}
/** CanvasGradient objects are context-bound: build one per context on demand. */
function makeGrad(ctx, sp) {
  const g = ctx.createLinearGradient(sp.x0, sp.y0, sp.x1, sp.y1);
  for (const [p, c] of sp.stops) g.addColorStop(clamp(p, 0, 1), c);
  return g;
}
/** JS-side sample of the same gradient (particle colour inheritance). */
const _gcache = { key: '', arr: null };
function fillSample(x, y, time) {
  const key = P.fillMode + P.fillC1 + P.fillC2 + P.fillC3 + P.fillAngle;
  if (_gcache.key !== key) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 1;
    const g2 = c.getContext('2d');
    const gr = g2.createLinearGradient(0, 0, 256, 0);
    const st = P.fillMode === 'hue' ? hueStops(0) : stopsFor(P.fillMode);
    for (const [p, cc] of st) gr.addColorStop(clamp(p, 0, 1), cc);
    g2.fillStyle = gr; g2.fillRect(0, 0, 256, 1);
    _gcache.key = key; _gcache.arr = g2.getImageData(0, 0, 256, 1).data;
  }
  const ang = P.fillAngle * Math.PI / 180;
  const R = Math.max(RW, RH) * .55 / Math.max(.05, P.fillScale);
  const off = time * P.fillSpeed;
  let u = ((x - RW / 2) * Math.cos(ang) + (y - RH / 2) * Math.sin(ang)) / (2 * R) + .5 + (off % 2) / 2;
  if (P.fillMode === 'hue') {
    const h = ((u + off * .25) % 1 + 1) % 1 * 360;
    return hsl2rgb(h, 1, .62);
  }
  u = ((u % 1) + 1) % 1;
  const i = (Math.min(255, Math.max(0, Math.round(u * 255)))) * 4;
  const a = _gcache.arr;
  return [a[i] / 255, a[i + 1] / 255, a[i + 2] / 255];
}
function hsl2rgb(h, s, l) {
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)];
}

const EASE = {
  linear: t => t,
  out: t => 1 - Math.pow(1 - t, 2.2),
  in: t => Math.pow(t, 2.2),
  inout: t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  step: t => t >= 1 ? 1 : 0
};

/* ------------------------------------------------------------ glyph mask --- */
/* Point cloud of glyph coverage for the active line, used to spawn particles */
const Mask = {
  li: -1, ver: -1, xs: null, ys: null, n: 0, y0: 0, scale: 1,

  /* Coordinates are stored in FINAL canvas units, relative to the line origin
     (x) and to the text's vertical centre (y) — exactly the frame the drawing
     code uses, so emission needs no further conversion.                      */
  build(li) {
    const LL = Layout.lines[li]; if (!LL || !LL.syls.length) { this.n = 0; return; }
    const sc = LL.scale * P.actScale;
    const fpx = Layout.fontPx * sc;
    const PAD = 4;
    const w = Math.ceil(LL.w * sc) + PAD * 2;
    const h = Math.ceil(fpx * 1.9) + PAD * 2;
    if (w < 2 || h < 2) { this.n = 0; return; }
    mkc.width = Math.min(w, 8192); mkc.height = Math.min(h, 2048);
    const cy = Math.round(mkc.height / 2);
    mk.clearRect(0, 0, mkc.width, mkc.height);
    mk.font = Layout.fontStr(fpx);
    mk.textBaseline = 'middle';
    mk.fillStyle = '#fff';
    for (const s of LL.syls) {
      let x = s.x * sc + PAD;
      for (let i = 0; i < s.chars.length; i++) { mk.fillText(s.chars[i], x, cy); x += s.adv[i] * sc; }
    }
    const step = Math.max(2, Math.round(fpx / 26));
    const img = mk.getImageData(0, 0, mkc.width, mkc.height).data;
    const cap = Math.ceil(mkc.width / step) * Math.ceil(mkc.height / step);
    const xs = new Float32Array(cap), ys = new Float32Array(cap);
    let n = 0;
    for (let px = 0; px < mkc.width; px += step)
      for (let py = 0; py < mkc.height; py += step) {
        if (img[(py * mkc.width + px) * 4 + 3] > 110) { xs[n] = px - PAD; ys[n] = py - cy; n++; }
      }
    // sort by x for O(log n) band queries
    const idx = Array.from({ length: n }, (_, i) => i).sort((a, b) => xs[a] - xs[b]);
    const sx = new Float32Array(n), sy = new Float32Array(n);
    for (let i = 0; i < n; i++) { sx[i] = xs[idx[i]]; sy[i] = ys[idx[i]]; }
    this.xs = sx; this.ys = sy; this.n = n; this.li = li; this.ver = Layout.ver;
  },

  lower(x) { let a = 0, b = this.n; while (a < b) { const m = (a + b) >> 1; if (this.xs[m] < x) a = m + 1; else b = m; } return a; }
};

/* ------------------------------------------------------------- particles --- */
const Particles = {
  cap: 0, n: 0,
  px: null, py: null, vx: null, vy: null, life: null, max: null, size: null, rot: null, vr: null,
  cr: null, cg: null, cb: null, seed: null,
  inst: null, rnd: mulberry32(1337), emitAcc: 0, tGlobal: 0,

  resize(cap) {
    cap = Math.max(200, Math.round(cap));
    if (cap === this.cap) return;
    this.cap = cap;
    const F = () => new Float32Array(cap);
    this.px = F(); this.py = F(); this.vx = F(); this.vy = F();
    this.life = F(); this.max = F(); this.size = F(); this.rot = F(); this.vr = F();
    this.cr = F(); this.cg = F(); this.cb = F(); this.seed = F();
    this.inst = new Float32Array(cap * 9);
    this.n = 0;
    GL.allocParticles(cap);
  },
  reset() { this.n = 0; this.rnd = mulberry32(P.parSeed | 0); this.emitAcc = 0; this.tGlobal = 0; resetBeatBurst(); },

  spawn(x, y, time) {
    if (this.n >= this.cap) return;
    const i = this.n++, r = this.rnd;
    const dir = (P.parDir + (r() - .5) * P.parSpread) * Math.PI / 180;
    const sp = P.parSpeed * (1 - P.parSpeedRnd * r());
    this.px[i] = x; this.py[i] = y;
    this.vx[i] = Math.cos(dir) * sp; this.vy[i] = Math.sin(dir) * sp;
    const lf = P.parLife * (1 - P.parLifeRnd * r());
    this.life[i] = 0; this.max[i] = Math.max(.02, lf);
    this.size[i] = P.parSize * (RH / 1080) * (1 - P.parSizeRnd * r());
    this.rot[i] = r() * TAU; this.vr[i] = (r() - .5) * P.parSpin;
    this.seed[i] = r();
    let c;
    switch (P.parColorMode) {
      case 'c1':   c = hex2rgb(P.parC1); break;
      case 'grad': { const a = hex2rgb(P.parC1), b = hex2rgb(P.parC2), k = r();
                     c = [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)]; break; }
      case 'rand': c = hex2rgb(r() < .5 ? P.parC1 : P.parC2); break;
      default:     c = fillSample(x, y, time);
    }
    this.cr[i] = c[0]; this.cg[i] = c[1]; this.cb[i] = c[2];
  },

  kill(i) {
    const j = --this.n; if (j === i) return;
    const A = ['px', 'py', 'vx', 'vy', 'life', 'max', 'size', 'rot', 'vr', 'cr', 'cg', 'cb', 'seed'];
    for (const k of A) this[k][i] = this[k][j];
  },

  step(h) {
    this.tGlobal += h;
    const t = this.tGlobal;
    const k = P.parTurbScale / 400, T = P.parTurb, dg = P.parGravity, dr = P.parDrag;
    for (let i = 0; i < this.n; i++) {
      this.life[i] += h;
      if (this.life[i] >= this.max[i]) { this.kill(i); i--; continue; }
      let ax = 0, ay = dg;
      if (T > 0) {
        const sx = this.px[i] * k, sy = this.py[i] * k;
        ax += Math.sin(sy + t * 1.3 + this.seed[i] * 6.28) * Math.cos(sx * .77 - t * .9) * T;
        ay += Math.cos(sx + t * 1.1 + this.seed[i] * 6.28) * Math.sin(sy * .81 + t * .7) * T;
      }
      this.vx[i] += ax * h; this.vy[i] += ay * h;
      const d = Math.max(0, 1 - dr * h);
      this.vx[i] *= d; this.vy[i] *= d;
      this.px[i] += this.vx[i] * h;
      this.py[i] += this.vy[i] * h;
      this.rot[i] += this.vr[i] * h;
    }
  },

  /** Fill the GPU instance buffer; returns instance count. */
  pack() {
    const a = this.inst, gr = P.parGrow, al = P.parAlpha, fi = Math.max(.001, P.parFadeIn);
    const stretchOn = (P.parType === 'streak' || P.parType === 'spark');
    let o = 0;
    for (let i = 0; i < this.n; i++) {
      const u = this.life[i] / this.max[i];
      let alpha = al * Math.min(1, this.life[i] / fi) * (1 - u * u);
      let sz = this.size[i] * (1 + gr * u);
      if (sz <= 0 || alpha <= 0.002) continue;
      let rot = this.rot[i], asp = 1;
      if (stretchOn) {
        const vx = this.vx[i], vy = this.vy[i], sp = Math.hypot(vx, vy);
        if (sp > 1) { rot = Math.atan2(vy, vx); asp = 1 + P.parStretch * Math.min(3, sp / 600); }
      }
      a[o] = this.px[i]; a[o + 1] = this.py[i]; a[o + 2] = sz; a[o + 3] = rot; a[o + 4] = asp;
      a[o + 5] = this.cr[i]; a[o + 6] = this.cg[i]; a[o + 7] = this.cb[i]; a[o + 8] = alpha;
      o += 9;
    }
    return o / 9;
  }
};

