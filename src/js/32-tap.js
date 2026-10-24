/* -------------------------------------------------------------- tap sync --- */
/* Espace reste dédié à la lecture : le tap se fait sur une autre touche.
   Appuyer pose le début de la syllabe. Pour la dernière syllabe d'une ligne,
   RELÂCHER pose la fin : tenir la touche sur une note longue, c'est la tenir
   à l'écran. Les instants sont corrigés de la latence de sortie audio.     */
const TAP_KEYS = [
  ['f', 'F'], ['g', 'G'], ['d', 'D'], ['b', 'B'],
  ['Enter', 'Entrée'], ['ShiftRight', 'Maj droite'], ['ControlRight', 'Ctrl droite']
];
const TAP_HOLD_MIN = .25;   // un relâché plus court est un simple tap, pas une tenue
const TAP_LINE_END = 1.2;   // fin par défaut d'une fin de ligne non tenue (s)

function isTapKey(e) {
  const k = S.tapKey;
  if (k === 'ShiftRight' || k === 'ControlRight') return e.code === k;
  if (k === 'Enter') return e.key === 'Enter';
  return e.key.toLowerCase() === k;
}
function tapKeyLabel() { const f = TAP_KEYS.find(k => k[0] === S.tapKey); return f ? f[1] : S.tapKey; }

/** L'instant réellement entendu : la sortie audio a du retard sur l'horloge. */
function tapTime() {
  let lat = 0;
  if (S.src && S.ctx) lat = S.ctx.outputLatency || S.ctx.baseLatency || 0;
  return Math.max(0, now() - (lat + (S.tapOffset || 0) / 1000) * S.rate);
}

/** Démarre le calage. `fromSel` reprend à la syllabe sélectionnée plutôt
    qu'à la première non calée, avec deux secondes d'élan avant.            */
function setTap(on, fromSel) {
  if (on) {
    if (!S.buffer) { toast('Charge un audio d\'abord', true); return; }
    if (!allSyls().length) { toast('Découpe d\'abord les paroles', true); return; }
  }
  S.tapMode = on;
  S.tapHeld = null;
  $('#bTap').classList.toggle('on', on);
  $('#tapHud').classList.toggle('on', on);
  if (!on) { renderSylList(); updateUndoUi(); return; }

  const list = allSyls();
  let i;
  if (fromSel) i = Math.max(0, list.findIndex(o => o.li === S.sel.line && o.si === S.sel.syl));
  else { i = list.findIndex(o => o.s.t0 == null); if (i < 0) i = 0; }
  S.tapIdx = i;

  /* on repart un peu avant, pour attraper le rythme */
  let from = 0;
  if (i > 0) { const pv = list[i - 1]; if (pv.s.t0 != null) from = Math.max(0, pv.s.t0 - .6); }
  if (list[i].s.t0 != null) from = Math.max(0, list[i].s.t0 - 2);
  S.extClock = false;
  seek(from);
  play();
  renderSylList(); updateTapHud();
  toast(`Frappe ${tapKeyLabel()} sur chaque syllabe · Échap pour sortir`);
}

function tap() {
  const list = allSyls();
  if (S.tapIdx >= list.length) { setTap(false); toast('Fin des paroles — bien joué'); return; }
  const t = tapTime();
  const e = list[S.tapIdx];
  Undo.snap('calage', 'tap');          // une rafale de frappes = une seule étape d'annulation
  e.s.t0 = t; e.s.t1 = null;
  if (S.tapIdx > 0) {
    const pv = list[S.tapIdx - 1];
    if (pv.li !== e.li && pv.s.t0 != null) {
      /* fin de la ligne précédente : le relâché s'il a été tenu, sinon un
         maintien raisonnable — jamais tout le silence jusqu'à la suivante */
      const hi = Math.max(pv.s.t0 + .05, t);
      pv.s.t1 = pv.s.t1 != null ? clamp(pv.s.t1, pv.s.t0 + .05, hi)
        : clamp(pv.s.t0 + TAP_LINE_END, pv.s.t0 + .05, hi);
    }
  }
  const nx = list[S.tapIdx + 1];
  S.tapHeld = { li: e.li, si: e.si, t0: t, last: !nx || nx.li !== e.li };
  if (!nx) e.s.t1 = t + .6;
  S.tapIdx++;
  if (!nx) setTimeout(() => {       // dernière syllabe : on laisse le temps de relâcher, puis on sort
    if (S.tapMode && S.tapIdx >= allSyls().length) { setTap(false); toast('Calage terminé — ajuste à l\'étape 4, puis Ctrl+S'); }
  }, 1500);
  selOne(...(nx ? [nx.li, nx.si] : [e.li, e.si]));
  refreshDuration();
  renderSylList(); TL.invalidate();
  updateTapHud(true);
}

/** Relâché de la touche : ne compte que sur une fin de ligne tenue. */
function tapRelease() {
  const h = S.tapHeld; S.tapHeld = null;
  if (!h || !h.last) return;
  const s = S.lines[h.li] && S.lines[h.li].syls[h.si];
  if (!s || s.t0 == null || s.t0 !== h.t0) return;
  const t = tapTime();
  if (t - s.t0 < TAP_HOLD_MIN) return;
  Undo.snap('calage', 'tap');
  s.t1 = t;
  TL.invalidate(); requestRender(); docChanged();
}

function untap() {
  if (S.tapIdx <= 0) { toast('Début des paroles'); return; }
  Undo.snap('annuler la frappe', 'untap');
  S.tapIdx--;
  S.tapHeld = null;
  const list = allSyls(), e = list[S.tapIdx];
  const back = e.s.t0;
  e.s.t0 = null; e.s.t1 = null;
  selOne(e.li, e.si);
  if (back != null) seek(Math.max(0, back - .8));
  renderSylList(); TL.invalidate();
  updateTapHud();
}

/** Le grand affichage central : la syllabe à frapper, celle d'avant, les suivantes. */
function updateTapHud(flash) {
  if (!S.tapMode) return;
  const list = allSyls();
  const i = S.tapIdx;
  const txt = o => o ? o.s.t.trim() || '·' : '';
  $('#tapPrev').textContent = i > 0 ? txt(list[i - 1]) : '';
  $('#tapCur').textContent = i < list.length ? txt(list[i]) : '✓ terminé';
  $('#tapNext').textContent = list.slice(i + 1, i + 5).map(o => txt(o)).join('  ');
  $('#tapCount').textContent = `${Math.min(i, list.length)} / ${list.length}`;
  $('#tapBar').style.width = (list.length ? Math.min(i / list.length, 1) * 100 : 0) + '%';
  $('#tapKeyBig').textContent = tapKeyLabel();
  $('#tapRate').textContent = fmtRate(S.rate);
  if (flash) {
    const h = $('#tapHud');
    h.classList.remove('flash');
    void h.offsetWidth;
    h.classList.add('flash');
  }
}

/* ---------------------------------------------------------- line helpers --- */
function distributeLine(li) {
  const L = S.lines[li]; if (!L || !L.syls.length) return;
  const a = L.syls[0].t0;
  let b = L.syls[L.syls.length - 1].t1;
  if (b == null) { const nx = S.lines[li + 1]; const sp = nx && lineSpan(nx); b = sp ? sp[0] : (a != null ? a + L.syls.length * .3 : null); }
  if (a == null || b == null || b <= a) { toast('Cale au moins la 1re syllabe de la ligne', true); return; }
  Undo.snap('répartir');
  distributeInto(L, a, b);
  renderSylList(); TL.invalidate(); requestRender();
  toast(`Ligne ${li + 1} répartie sur ${((b - a)).toFixed(2)} s`);
}
/** Remet la phrase à zéro dans la timeline. Le texte n'est pas touché :
    seules les positions disparaissent, et la ligne devient le point de
    reprise du calage.                                                     */
function clearLine(li) {
  const L = S.lines[li]; if (!L || !L.syls.length) return;
  const had = L.syls.some(s => s.t0 != null);
  if (!had) { toast('Cette phrase n\'est pas encore placée'); return; }
  Undo.snap('supprimer la phrase');
  if (S.loop) { S.loop = null; $('#bLoop').classList.remove('on'); }
  L.syls.forEach(s => { s.t0 = null; s.t1 = null; });
  selOne(li, 0);
  S.tapIdx = Math.max(0, allSyls().findIndex(o => o.li === li && o.si === 0));
  renderSylList(); TL.invalidate(); requestRender();
  toast(`Phrase ${li + 1} retirée de la timeline — « Reprendre à la syllabe choisie » pour la recaler`);
}
