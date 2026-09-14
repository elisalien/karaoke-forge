/* ======================================================= frame composer === */

/* Pulsation du temps en cours (0..1), mise à jour une fois par image. */
let _pulse = 0, _lastBeatN = null;
function resetBeatBurst() { _lastBeatN = null; }

/** Ligne active à l'instant tt : la dernière commencée — ou la suivante un
    peu en avance (réglage Anticipation), dès que la précédente est finie. */
function activeLine(tt) {
  const lead = P.lineLead || 0;
  let act = -1, actEnd = -Infinity;
  for (let i = 0; i < S.lines.length; i++) {
    const sp = lineSpan(S.lines[i]); if (!sp) continue;
    if (sp[0] <= tt || (sp[0] - lead <= tt && actEnd <= tt)) { act = i; actEnd = sp[1]; }
    else break;
  }
  return act;
}

/** Draw the 2D text layer for time `t`; emits particles as a side effect. */
function drawText(t, emit) {
  if (S.dirtyLayout) Layout.build();
  tx.clearRect(0, 0, RW, RH);
  _pulse = beatPulse(t);
  if (!S.lines.length || S.blackout) return;

  const tt = t + P.fillLead / 1000;
  let act = activeLine(tt);
  if (act < 0) act = 0;

  const gsp = gradSpec(t);
  const cy = P.posY / 100 * RH;
  const lh = Layout.lineH;
  const a0 = Math.max(0, act - P.linesBefore), a1 = Math.min(S.lines.length - 1, act + P.linesAfter);
  const beatSc = 1 + P.beatScale * _pulse;
  let actGeo = null;

  for (let li = a1; li >= a0; li--) {
    const LL = Layout.lines[li]; if (!LL || !LL.syls.length) continue;
    const isAct = li === act;
    const row = li - act;
    const lsc = isAct ? P.actScale * beatSc : P.inactScale;
    const sc = LL.scale * lsc;
    const alpha = isAct ? 1 : P.inactAlpha;
    const y = cy + row * lh;
    const ox = Layout.originX(li, lsc);
    const fpx = Layout.fontPx * sc;
    if (isAct) actGeo = { ox, y, w: LL.w * sc };
    tx.save();
    tx.globalAlpha = alpha;
    tx.font = Layout.fontStr(fpx);
    tx.textBaseline = 'middle';

    const L = S.lines[li];
    for (let si = 0; si < LL.syls.length; si++) {
      const g = LL.syls[si], sy = L.syls[si];
      const x = ox + g.x * sc, w = g.w * sc;
      // progress
      let p = 0;
      if (li < act) p = 1;
      else if (li === act) {
        const t0 = sy.t0, t1 = sylEnd(L, si);
        if (t0 == null) p = 0;
        else if (tt >= (t1 == null ? t0 : t1)) p = 1;
        else if (tt <= t0) p = 0;
        else p = EASE[P.fillEase]((tt - t0) / Math.max(.001, t1 - t0));
      }
      // syllable pop
      let bump = 1;
      if (isAct && sy.t0 != null && P.popAmt > 0) {
        const age = (tt - sy.t0) * 1000;
        if (age >= 0 && age < P.popDur) bump = 1 + P.popAmt * Math.pow(1 - age / P.popDur, 2.4);
      }
      drawSyl(g, sc, x, y, w, fpx, p, bump, gsp);

      // ---- particle emission on the moving fill front ----
      if (emit && isAct && p > 0 && p < 1 && P.parOn) emitFront(li, ox, y, x + w * p, t);
      if (emit && isAct && P.parOn && P.parBurst > 0 && sy.t0 != null) {
        const age = tt - sy.t0;
        if (age >= 0 && age < .05 && !sy.__burst) { sy.__burst = 1; burst(li, ox, y, x, w, t, P.parBurst); }
        if (age < 0 || age > .2) sy.__burst = 0;
      }
    }
    tx.restore();
  }

  // ---- rafale sur chaque temps, depuis toute la ligne active ----
  if (emit && P.beatOn && P.parOn && P.beatBurst > 0 && actGeo) {
    const n = Math.floor(beatPos(t));
    if (_lastBeatN != null && n > _lastBeatN) burst(act, actGeo.ox, actGeo.y, actGeo.ox, actGeo.w, t, P.beatBurst);
    _lastBeatN = n;
  }
}

function drawSyl(g, sc, x, y, w, fpx, p, bump, gsp) {
  const chars = g.chars, adv = g.adv, n = chars.length;
  const drawChars = (ctx, sx) => { let cx = sx; for (let i = 0; i < n; i++) { ctx.fillText(chars[i], cx, y); cx += adv[i] * sc; } };
  const strokeChars = (ctx, sx) => { let cx = sx; for (let i = 0; i < n; i++) { ctx.strokeText(chars[i], cx, y); cx += adv[i] * sc; } };

  tx.save();
  if (bump !== 1) { tx.translate(x + w / 2, y); tx.scale(bump, bump); tx.translate(-(x + w / 2), -y); }

  // base (unfilled)
  if (P.shadowOn) { tx.shadowColor = P.shadowColor; tx.shadowBlur = P.shadowBlur; tx.shadowOffsetY = P.shadowY; }
  tx.globalAlpha *= P.baseAlpha;
  tx.fillStyle = P.baseColor;
  drawChars(tx, x);
  tx.shadowColor = 'transparent'; tx.shadowBlur = 0; tx.shadowOffsetY = 0;
  if (P.strokeW > 0) { tx.lineWidth = P.strokeW * (RH / 1080); tx.strokeStyle = P.strokeColor; tx.lineJoin = 'round'; strokeChars(tx, x); }
  tx.restore();

  if (p <= 0) return;

  tx.save();
  if (bump !== 1) { tx.translate(x + w / 2, y); tx.scale(bump, bump); tx.translate(-(x + w / 2), -y); }
  const soft = P.fillSoft * (RH / 1080);
  const front = x + w * p;
  if (p >= 1 || soft <= .5) {
    if (p < 1) { tx.beginPath(); tx.rect(x - fpx, y - fpx * 2, (front - x) + fpx, fpx * 4); tx.clip(); }
    paintFill(tx, drawChars, strokeChars, x, fpx, makeGrad(tx, gsp));
  } else {
    // soft leading edge, composited through an offscreen layer
    const pad = Math.ceil(fpx * 1.4 + soft + 12);
    const need = [Math.ceil(w + pad * 2), Math.ceil(fpx * 3 + pad)];
    if (lyc.width < need[0] || lyc.height < need[1]) {
      lyc.width = Math.max(lyc.width, need[0]); lyc.height = Math.max(lyc.height, need[1]);
    }
    const oxL = pad - x, oyL = lyc.height / 2 - y;
    ly.setTransform(1, 0, 0, 1, 0, 0);
    ly.clearRect(0, 0, lyc.width, lyc.height);
    ly.save();
    ly.translate(oxL, oyL);
    ly.font = tx.font; ly.textBaseline = 'middle'; ly.globalAlpha = 1;
    paintFill(ly, drawChars, strokeChars, x, fpx, makeGrad(ly, gsp));
    ly.restore();
    ly.globalCompositeOperation = 'destination-in';
    const g2 = ly.createLinearGradient(front - soft + oxL, 0, front + oxL, 0);
    g2.addColorStop(0, 'rgba(0,0,0,1)'); g2.addColorStop(1, 'rgba(0,0,0,0)');
    ly.fillStyle = g2; ly.fillRect(Math.max(0, front - soft + oxL), 0, lyc.width, lyc.height);
    ly.globalCompositeOperation = 'source-over';
    tx.drawImage(lyc, -oxL, -oyL);
  }
  tx.restore();
}

function paintFill(ctx, drawChars, strokeChars, x, fpx, grad) {
  if (P.glowAmt > 0) { ctx.shadowColor = P.glowColor; ctx.shadowBlur = P.glowAmt * fpx * .28 * (1 + P.beatGlow * _pulse); }
  ctx.fillStyle = grad;
  drawChars(ctx, x);
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
  if (P.fillStroke && P.fillStrokeW > 0) {
    ctx.lineWidth = P.fillStrokeW * (RH / 1080); ctx.strokeStyle = P.fillStrokeC; ctx.lineJoin = 'round';
    strokeChars(ctx, x);
  }
}

/* ------------------------------------------------------------- emission --- */
let _emitDt = 1 / 60;
function ensureMask(li) {
  if (Mask.li !== li || Mask.ver !== Layout.ver) Mask.build(li);
}
function emitFront(li, ox, y, frontX, time) {
  ensureMask(li);
  if (!Mask.n) return;
  Particles.emitAcc += P.parRate * _emitDt;
  let k = Math.floor(Particles.emitAcc);
  if (k <= 0) return;
  Particles.emitAcc -= k;
  k = Math.min(k, 900);
  const band = P.parBand * (RH / 1080);
  const local = frontX - ox;
  const lo = P.parEmitFull ? 0 : Mask.lower(local - band);
  const hi = P.parEmitFull ? Mask.n : Mask.lower(local);
  const avail = hi - lo; if (avail <= 0) return;
  const r = Particles.rnd;
  for (let i = 0; i < k; i++) {
    const j = Math.min(Mask.n - 1, lo + ((r() * avail) | 0));
    Particles.spawn(ox + Mask.xs[j], y + Mask.ys[j], time);
  }
}
function burst(li, ox, y, x, w, time, count) {
  ensureMask(li);
  if (!Mask.n) return;
  const lo = Mask.lower(x - ox), hi = Mask.lower(x + w - ox);
  const avail = Math.max(1, hi - lo);
  const r = Particles.rnd;
  for (let i = 0; i < count; i++) {
    const j = Math.min(Mask.n - 1, lo + ((r() * avail) | 0));
    Particles.spawn(ox + Mask.xs[j], y + Mask.ys[j], time);
  }
}

/* ------------------------------------------------------------ main frame --- */
const SUB = 1 / 120;
let _acc = 0;

function renderFrame(t, dt) {
  _emitDt = Math.min(.1, Math.max(1 / 240, dt));
  drawText(t, true);
  if (P.parOn) {
    _acc += dt;
    let guard = 0;
    while (_acc >= SUB && guard++ < 16) { Particles.step(SUB, 0, 0); _acc -= SUB; }
  } else if (Particles.n) Particles.n = 0;
  const n = P.parOn ? Particles.pack() : 0;
  GL.draw(t, n);
  const badge = $('#stageBadge'); if (badge) badge.textContent = `${Particles.n} part.`;
}
