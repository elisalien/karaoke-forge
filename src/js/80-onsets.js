/* ============================================================================
   KARAOKE FORGE — assistance au calage
   ----------------------------------------------------------------------------
   Détection des attaques (débuts de notes) par flux spectral. Entièrement
   locale, instantanée, aucun téléchargement. Sert à deux choses :
     · poser les syllabes d'une ligne sur les vraies attaques plutôt qu'à
       intervalles réguliers ;
     · aimanter la tête de lecture et les bords sur ces attaques.
   ============================================================================ */

/* ------------------------------------------------------------------- FFT --- */
function FFT(n) {
  this.n = n;
  this.cos = new Float32Array(n / 2);
  this.sin = new Float32Array(n / 2);
  for (let i = 0; i < n / 2; i++) {
    this.cos[i] = Math.cos(-2 * Math.PI * i / n);
    this.sin[i] = Math.sin(-2 * Math.PI * i / n);
  }
}
FFT.prototype.run = function (re, im) {
  const n = this.n;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const step = n / len, half = len >> 1;
    for (let i = 0; i < n; i += len) {
      for (let k = 0; k < half; k++) {
        const c = this.cos[k * step], s = this.sin[k * step];
        const a = i + k, b = a + half;
        const tr = re[b] * c - im[b] * s;
        const ti = re[b] * s + im[b] * c;
        re[b] = re[a] - tr; im[b] = im[a] - ti;
        re[a] += tr; im[a] += ti;
      }
    }
  }
};

/* --------------------------------------------------------------- attaques --- */
const Onsets = {
  cache: null,

  compute(force) {
    if (!S.buffer) return null;
    const key = S.audioName + '|' + S.buffer.duration;
    if (!force && this.cache && this.cache.key === key) return this.cache;

    const N = 1024, HOP = 512;          // 11,6 ms de résolution
    const sr = S.buffer.sampleRate;
    const len = S.buffer.length;
    const a = S.buffer.getChannelData(0);
    const b = S.buffer.numberOfChannels > 1 ? S.buffer.getChannelData(1) : null;

    const win = new Float32Array(N);
    for (let i = 0; i < N; i++) win[i] = .5 - .5 * Math.cos(2 * Math.PI * i / (N - 1));

    const fft = new FFT(N);
    const re = new Float32Array(N), im = new Float32Array(N);
    const bins = N / 2;
    let prev = new Float32Array(bins), cur = new Float32Array(bins);
    const frames = Math.max(1, Math.floor((len - N) / HOP));
    const flux = new Float32Array(frames);

    const wk = new Float32Array(bins);
    for (let k = 0; k < bins; k++) {
      const f = k * sr / N;
      wk[k] = f < 120 ? .15 : (f < 400 ? .6 : (f < 6000 ? 1 : .5));
    }

    for (let t = 0; t < frames; t++) {
      const off = t * HOP;
      for (let i = 0; i < N; i++) {
        const s = b ? (a[off + i] + b[off + i]) * .5 : a[off + i];
        re[i] = s * win[i]; im[i] = 0;
      }
      fft.run(re, im);
      let f = 0;
      for (let k = 1; k < bins; k++) {
        const m = Math.log1p(12 * Math.sqrt(re[k] * re[k] + im[k] * im[k]));
        cur[k] = m;
        const d = m - prev[k];
        if (d > 0) f += d * wk[k];
      }
      flux[t] = f;
      const sw = prev; prev = cur; cur = sw;
    }

    const sm = new Float32Array(frames);
    for (let i = 0; i < frames; i++)
      sm[i] = (flux[Math.max(0, i - 1)] + 2 * flux[i] + flux[Math.min(frames - 1, i + 1)]) / 4;

    const fps = sr / HOP;
    const W = Math.max(3, Math.round(.12 * fps));
    let gmax = 0; for (let i = 0; i < frames; i++) if (sm[i] > gmax) gmax = sm[i];
    const times = [], strength = [];
    const minGap = Math.max(1, Math.round(.055 * fps));
    let last = -1e9;
    for (let i = 1; i < frames - 1; i++) {
      let mean = 0, n = 0;
      for (let j = Math.max(0, i - W); j <= Math.min(frames - 1, i + W); j++) { mean += sm[j]; n++; }
      mean /= n;
      if (sm[i] < mean * 1.45 + gmax * .015) continue;
      if (sm[i] < sm[i - 1] || sm[i] < sm[i + 1]) continue;
      if (i - last < minGap) {
        if (sm[i] > strength[strength.length - 1]) {
          times[times.length - 1] = i / fps; strength[strength.length - 1] = sm[i]; last = i;
        }
        continue;
      }
      times.push(i / fps); strength.push(sm[i]); last = i;
    }
    this.cache = {
      key,
      times: Float32Array.from(times),
      str: Float32Array.from(strength.map(v => gmax > 0 ? v / gmax : 0))
    };
    return this.cache;
  },

  ready() { return !!(this.cache && this.cache.times.length); },

  /** Tempo et calage de la grille, par cohérence de phase des attaques :
      pour un BPM donné, chaque attaque devient un vecteur unitaire tourné
      de sa phase ; si les attaques tombent sur la grille, les vecteurs
      s'alignent et leur somme est longue. Un léger a priori autour de
      115 BPM évite de prendre systématiquement le double tempo.         */
  tempo() {
    const o = this.compute();
    if (!o || o.times.length < 12) return null;
    const T = o.times, W = o.str, n = T.length;
    const score = bpm => {
      const w = 2 * Math.PI * bpm / 60;
      let re = 0, im = 0, tot = 0;
      for (let i = 0; i < n; i++) { const a = w * T[i]; re += W[i] * Math.cos(a); im += W[i] * Math.sin(a); tot += W[i]; }
      const prior = Math.exp(-.5 * Math.pow(Math.log2(bpm / 115) / .9, 2));
      return { mag: Math.hypot(re, im) / (tot || 1), val: Math.hypot(re, im) / (tot || 1) * prior, ph: Math.atan2(im, re) };
    };
    let best = null;
    for (let b = 60; b <= 190; b += .5) { const s = score(b); if (!best || s.val > best.val) best = { bpm: b, ...s }; }
    const b0 = best.bpm;
    for (let b = b0 - .5; b <= b0 + .5; b += .02) { const s = score(b); if (s.val > best.val) best = { bpm: b, ...s }; }
    const period = 60 / best.bpm;
    let off = best.ph / (2 * Math.PI) * period;
    off = ((off % period) + period) % period;
    return { bpm: best.bpm, offset: off, confidence: best.mag };
  },

  range(a, b) {
    const o = this.cache; if (!o) return [];
    const out = [];
    for (let i = 0; i < o.times.length; i++) {
      if (o.times[i] < a) continue;
      if (o.times[i] > b) break;
      out.push(i);
    }
    return out;
  },

  /** Attaque la plus proche de t, dans une fenêtre de ±tol secondes. */
  nearest(t, tol) {
    const o = this.cache; if (!o || !o.times.length) return null;
    let lo = 0, hi = o.times.length - 1, best = null, bd = tol == null ? .12 : tol;
    while (lo <= hi) {
      const m = (lo + hi) >> 1;
      const d = Math.abs(o.times[m] - t);
      if (d < bd) { bd = d; best = o.times[m]; }
      if (o.times[m] < t) lo = m + 1; else hi = m - 1;
    }
    for (const i of [lo, hi, lo - 1, hi + 1]) {
      if (i < 0 || i >= o.times.length) continue;
      const d = Math.abs(o.times[i] - t);
      if (d < bd) { bd = d; best = o.times[i]; }
    }
    return best;
  }
};

/* ------------------------------------------------------- poids syllabique --- */
const VOW = 'aeiouyàâäéèêëîïôöùûüœæ';
function sylWeight(t) {
  const s = t.trim().toLowerCase();
  if (!s) return .4;
  let v = 0; for (const c of s) if (VOW.indexOf(c) >= 0) v++;
  return Math.max(.5, s.length * .35 + v * .8);
}

/** Place les syllabes i0..i1 entre a et b, en s'accrochant aux attaques. */
function placeOnOnsets(L, i0, i1, a, b, useOnsets) {
  const k = i1 - i0 + 1;
  const w = []; let sum = 0;
  for (let i = i0; i <= i1; i++) { const x = sylWeight(L.syls[i].t); w.push(x); sum += x; }
  const ideal = [a]; let acc = 0;
  for (let i = 0; i < k - 1; i++) { acc += w[i]; ideal.push(a + (b - a) * acc / sum); }

  const times = ideal.slice();
  if (useOnsets && Onsets.cache) {
    const cand = Onsets.range(a - .04, b).map(i => Onsets.cache.times[i]);
    const slot = (b - a) / k;
    let prev = a;
    for (let i = 1; i < k; i++) {
      let best = null, bd = slot * .62;
      for (const c of cand) {
        if (c <= prev + .045) continue;
        const d = Math.abs(c - ideal[i]);
        if (d < bd) { bd = d; best = c; }
      }
      times[i] = best != null ? best : Math.max(prev + .045, ideal[i]);
      prev = times[i];
    }
  }
  for (let i = 0; i < k; i++) {
    const s = L.syls[i0 + i];
    s.t0 = times[i];
    s.t1 = (i === k - 1) ? b : null;
  }
}

/** Groupes de syllabes formant un mot (une syllabe finie par une espace le clôt). */
function lineWords(L) {
  const out = [];
  let start = 0;
  for (let i = 0; i < L.syls.length; i++) {
    if (/\s$/.test(L.syls[i].t) || i === L.syls.length - 1) {
      const text = L.syls.slice(start, i + 1).map(s => s.t).join('').trim();
      if (text) out.push({ i0: start, i1: i, text });
      start = i + 1;
    }
  }
  return out;
}

/* ------------------------------------------------------------- opérations --- */
function snapLineToOnsets(li) {
  const L = S.lines[li]; if (!L || !L.syls.length) return false;
  const sp = lineSpan(L);
  if (!sp || sp[1] - sp[0] < .05) return false;
  placeOnOnsets(L, 0, L.syls.length - 1, sp[0], sp[1], true);
  return true;
}

async function runOnsetAlign(scopeLines) {
  if (!S.buffer) { toast('Charge un audio d\'abord', true); return; }
  Undo.snap('caler sur les attaques');
  toast('Analyse des attaques…');
  await new Promise(r => setTimeout(r, 30));
  Onsets.compute();
  let n = 0;
  for (const li of scopeLines) if (snapLineToOnsets(li)) n++;
  renderSylList(); TL.invalidate(); requestRender();
  toast(n ? `${n} ligne${n > 1 ? 's' : ''} recalée${n > 1 ? 's' : ''} sur les attaques`
    : 'Cale d\'abord le début et la fin de la ligne', !n);
}

/** Aligne la syllabe sélectionnée sur l'attaque audio la plus proche. */
function snapSylToOnset() {
  const sel = selList().filter(o => o.s.t0 != null);
  if (!sel.length) { toast('Sélectionne au moins une syllabe calée', true); return; }
  if (!Onsets.ready()) { toast('Analyse des attaques…'); Onsets.compute(); }
  Undo.snap('aimanter sur l\'attaque');
  let n = 0;
  for (const o of sel) {
    const t = Onsets.nearest(o.s.t0, .16);
    if (t != null && Math.abs(t - o.s.t0) > 1e-4) { o.s.t0 = t; n++; }
  }
  renderSylList(); TL.invalidate(); requestRender();
  toast(n ? `${n} syllabe${n > 1 ? 's' : ''} aimantée${n > 1 ? 's' : ''}` : 'Déjà sur une attaque');
}
