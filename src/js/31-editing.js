/* ------------------------------------------------------ syllable edition --- */
/* Reflète le modèle dans la zone de texte — sauf si l'utilisateur y a tapé
   quelque chose qui n'a pas encore été découpé : son texte prime toujours. */
function syncLyricsText() {
  if (Doc.lyricsDirty) return;
  $('#lyricsText').value = S.lines.map(L => L.syls.map(s => s.t).join('')).join('\n');
}

/** Split a syllable at an absolute time (razor tool). */
function splitSylAt(li, si, t) {
  const L = S.lines[li], s = L.syls[si];
  const e = sylEnd(L, si);
  if (s.t0 == null || e == null || t <= s.t0 + .01 || t >= e - .01) { toast('Coupe hors de la syllabe', true); return; }
  const txt = s.t.replace(/\s+$/, '');
  if (txt.length < 2) { toast('Syllabe trop courte pour être coupée', true); return; }
  Undo.snap('couper');
  const f = clamp((t - s.t0) / (e - s.t0), 0, 1);
  const cut = clamp(Math.round(txt.length * f), 1, txt.length - 1);
  const b = { t: s.t.slice(cut), t0: t, t1: s.t1 };
  s.t = s.t.slice(0, cut); s.t1 = null;
  L.syls.splice(si + 1, 0, b);
  selReset(li, si + 1);
  afterStructuralEdit();
  toast(`Coupée en « ${s.t.trim()} » / « ${b.t.trim()} »`);
}

/** Alt+click in the syllable list: halve, or merge with the next one. */
function splitOrMerge(li, si, merge) {
  const L = S.lines[li];
  if (merge) {
    if (si >= L.syls.length - 1) { toast('Pas de syllabe suivante dans la ligne', true); return; }
    Undo.snap('fusionner');
    const a = L.syls[si], b = L.syls[si + 1];
    a.t = a.t + b.t;
    a.t1 = b.t1 != null ? b.t1 : null;
    L.syls.splice(si + 1, 1);
    selReset(li, si);
  } else {
    const s = L.syls[si];
    const txt = s.t.replace(/\s+$/, '');
    if (txt.length < 2) { toast('Syllabe trop courte pour être coupée', true); return; }
    Undo.snap('couper');
    const h = Math.ceil(txt.length / 2);
    const e = sylEnd(L, si);
    const mid = s.t0 != null && e != null ? (s.t0 + e) / 2 : null;
    const b = { t: s.t.slice(h), t0: mid, t1: s.t1 };
    s.t = s.t.slice(0, h); s.t1 = null;
    L.syls.splice(si + 1, 0, b);
    selReset(li, si + 1);
  }
  afterStructuralEdit();
}

function mergeSelection() {
  const sel = selList();
  if (sel.length < 2) { toast('Sélectionne au moins deux syllabes', true); return; }
  const li = sel[0].li;
  if (sel.some(o => o.li !== li)) { toast('La fusion doit rester dans une seule ligne', true); return; }
  Undo.snap('fusionner');
  const a = sel[0].si, b = sel[sel.length - 1].si;
  const L = S.lines[li];
  const merged = L.syls.slice(a, b + 1);
  const end = sylEnd(L, b);
  L.syls[a].t = merged.map(s => s.t).join('');
  L.syls[a].t1 = end;
  L.syls.splice(a + 1, b - a);
  selReset(li, a);
  afterStructuralEdit();
  toast(`Fusion en « ${L.syls[a].t.trim()} »`);
}

function clearTimingSelection() {
  const sel = selList();
  if (!sel.length) return;
  Undo.snap('effacer le timing');
  sel.forEach(o => { o.s.t0 = null; o.s.t1 = null; });
  toast(`${sel.length} timing${sel.length > 1 ? 's' : ''} effacé${sel.length > 1 ? 's' : ''} — Ctrl+Z pour revenir`);
  renderSylList(); TL.invalidate(); requestRender();
}

async function clearAllTimings() {
  const timed = allSyls().filter(o => o.s.t0 != null).length;
  if (!timed) { toast('Aucun timing à effacer'); return; }
  const ok = await modal({
    title: 'EFFACER TOUS LES TIMINGS ?',
    body: `<div class="hint big">Les <b>${timed} syllabes calées</b> quittent la timeline. Le texte reste. <b>Ctrl+Z</b> pour revenir.</div>`,
    ok: 'EFFACER'
  });
  if (!ok) return;
  Undo.snap('effacer tous les timings');
  allSyls().forEach(o => { o.s.t0 = null; o.s.t1 = null; });
  renderSylList(); TL.invalidate(); requestRender();
}

function deleteSelection() {
  const sel = selList();
  if (!sel.length) return;
  Undo.snap('supprimer');
  const byLine = new Map();
  sel.forEach(o => { if (!byLine.has(o.li)) byLine.set(o.li, []); byLine.get(o.li).push(o.si); });
  const anchor = sel[0];
  for (const [li, idx] of byLine) {
    idx.sort((a, b) => b - a).forEach(si => S.lines[li].syls.splice(si, 1));
  }
  // seules les lignes vidées par CETTE suppression disparaissent : les lignes vides des couplets restent
  [...byLine.keys()].sort((a, b) => b - a).forEach(li => { if (!S.lines[li].syls.length) S.lines.splice(li, 1); });
  selReset(Math.min(anchor.li, Math.max(0, S.lines.length - 1)), 0);
  afterStructuralEdit();
  toast(`${sel.length} syllabe${sel.length > 1 ? 's' : ''} supprimée${sel.length > 1 ? 's' : ''} — Ctrl+Z pour revenir`);
}

function afterStructuralEdit() {
  S.lines.forEach(L => { L.raw = L.syls.map(s => s.t).join(''); });
  syncLyricsText();
  S.dirtyLayout = true; S.dirtyMask = true; Mask.li = -1;
  S.tapIdx = Math.min(S.tapIdx || 0, allSyls().length);
  renderSylList(); TL.invalidate(); requestRender();
}

/** Nudge every selected syllable. */
function nudgeSelection(dt) {
  const sel = selList().filter(o => o.s.t0 != null);
  if (!sel.length) return;
  Undo.snap('décaler');
  sel.forEach(o => { o.s.t0 = Math.max(0, o.s.t0 + dt); if (o.s.t1 != null) o.s.t1 += dt; });
  renderSylList(); TL.invalidate(); requestRender();
}
/** Anchor a selected syllable's start / end on the playhead. */
function setEdgeAtPlayhead(which) {
  const o = selList()[0]; if (!o) { toast('Sélectionne une syllabe', true); return; }
  Undo.snap('caler sur la tête');
  if (which === 'in') { o.s.t0 = S.cur; if (o.s.t1 != null && o.s.t1 <= o.s.t0) o.s.t1 = o.s.t0 + .1; }
  else { if (o.s.t0 == null) o.s.t0 = Math.max(0, S.cur - .2); o.s.t1 = Math.max(o.s.t0 + .02, S.cur); }
  renderSylList(); TL.invalidate(); requestRender();
}

/* ------------------------------------------------------- context menus --- */
function hideCtx() { $('#ctx').classList.remove('on'); }
function showCtx(x, y, items) {
  const m = $('#ctx');
  m.innerHTML = '';
  for (const it of items) {
    if (it.sep) { const d = document.createElement('div'); d.className = 'sp'; m.appendChild(d); continue; }
    if (it.hd) { const d = document.createElement('div'); d.className = 'hd'; d.textContent = it.hd; m.appendChild(d); continue; }
    const d = document.createElement('div');
    d.className = 'it' + (it.dis ? ' dis' : '') + (it.cls ? ' ' + it.cls : '');
    const lbl = document.createElement('span'); lbl.textContent = it.label; d.appendChild(lbl);
    if (it.key) { const kk = document.createElement('span'); kk.className = 'k'; kk.textContent = it.key; d.appendChild(kk); }
    if (!it.dis) d.onclick = () => { hideCtx(); it.fn(); };
    m.appendChild(d);
  }
  m.classList.add('on');
  const r = m.getBoundingClientRect();
  m.style.left = Math.max(4, Math.min(x, innerWidth - r.width - 8)) + 'px';
  m.style.top = Math.max(4, Math.min(y, innerHeight - r.height - 8)) + 'px';
}

function ctxMenuSyl(x, y, h) {
  const n = selCount();
  const L = S.lines[h.li];
  const many = n > 1;
  showCtx(x, y, [
    { hd: many ? `${n} SYLLABES` : `SYLLABE « ${L.syls[h.si].t.trim()} »` },
    { label: 'Effacer le timing', key: 'Suppr', fn: clearTimingSelection },
    { label: many ? 'Supprimer les syllabes' : 'Supprimer la syllabe', key: 'Maj+Suppr', cls: 'dgr', fn: deleteSelection },
    { sep: 1 },
    { label: 'Couper en deux', key: 'C puis clic', dis: many, fn: () => splitOrMerge(h.li, h.si, false) },
    { label: many ? 'Fusionner la sélection' : 'Fusionner avec la suivante', key: 'M', fn: () => many ? mergeSelection() : splitOrMerge(h.li, h.si, true) },
    { sep: 1 },
    { label: 'Début sur la tête de lecture', key: 'I', fn: () => setEdgeAtPlayhead('in') },
    { label: 'Fin sur la tête de lecture', key: 'O', fn: () => setEdgeAtPlayhead('out') },
    { label: 'Aimanter sur l\'attaque la plus proche', fn: snapSylToOnset },
    { label: 'Reprendre le calage ici', fn: () => { selOne(h.li, h.si); setTap(true, true); } },
    { sep: 1 },
    { label: 'Sélectionner toute la ligne', key: 'Ctrl+A', fn: () => { selLine(h.li); renderSylList(); TL.invalidate(); } },
    { label: 'Répartir la ligne', fn: () => distributeLine(h.li) },
    { label: 'Supprimer la phrase de la timeline', cls: 'dgr', fn: () => clearLine(h.li) }
  ]);
}

function ctxMenuLine(x, y, li) {
  const L = S.lines[li];
  showCtx(x, y, [
    { hd: `LIGNE ${li + 1}` },
    { label: 'Lire cette ligne', fn: () => { const sp = lineSpan(L); if (sp) { seek(Math.max(0, sp[0] - .4)); play(); } } },
    { label: 'Boucler cette ligne', key: 'B', fn: () => { selLine(li); if (S.loop) toggleLoop(); toggleLoop(); } },
    { label: 'Sélectionner ses syllabes', fn: () => { selLine(li); renderSylList(); TL.invalidate(); } },
    { label: 'Zoomer sur la ligne', fn: () => { selLine(li); zoomSelection(); renderSylList(); } },
    { sep: 1 },
    { label: 'Poser sur les attaques', fn: () => runOnsetAlign([li]) },
    { label: 'Répartir sur la durée', fn: () => distributeLine(li) },
    { label: 'Supprimer la phrase de la timeline', cls: 'dgr', fn: () => clearLine(li) },
    { label: 'Supprimer la phrase ET son texte', cls: 'dgr', fn: () => { selLine(li); deleteSelection(); } }
  ]);
}

function ctxMenuEmpty(x, y, t) {
  showCtx(x, y, [
    { hd: 'TIMELINE' },
    { label: 'Placer la tête de lecture ici', fn: () => seek(t) },
    { label: 'Tout désélectionner', key: 'Échap', fn: () => { selClear(); renderSylList(); TL.invalidate(); } },
    { sep: 1 },
    { label: 'Voir tout le morceau', key: 'F', fn: () => zoomFit() },
    { label: 'Zoomer sur la sélection', dis: !selCount(), fn: () => zoomSelection() },
    { sep: 1 },
    { label: 'Effacer TOUS les timings…', cls: 'dgr', fn: clearAllTimings }
  ]);
}

function zoomFit() {
  S.tlZoom = clamp(TL.c.width / TL.dpr / Math.max(1, S.duration || 30), 2, 4000);
  S.tlScroll = 0; TL.invalidate();
}
function zoomSelection() {
  const sel = selList().filter(o => o.s.t0 != null);
  if (!sel.length) return;
  let a = Infinity, b = -Infinity;
  sel.forEach(o => { a = Math.min(a, o.s.t0); b = Math.max(b, sylEnd(o.L, o.si) || o.s.t0); });
  const pad = Math.max(.15, (b - a) * .25);
  S.tlZoom = clamp(TL.c.width / TL.dpr / Math.max(.05, (b - a) + pad * 2), 2, 4000);
  S.tlScroll = Math.max(0, a - pad);
  TL.invalidate();
}

/* ------------------------------------------------------------ lyrics UI --- */
function renderSylList() {
  const host = $('#sylList');
  host.innerHTML = '';
  const curFlat = S.tapMode ? S.tapIdx : -1;
  let flat = 0;
  const frag = document.createDocumentFragment();
  S.lines.forEach((L, li) => {
    const row = document.createElement('div');
    row.className = 'lineRow' + (li === S.sel.line ? ' act' : '');
    const hd = document.createElement('div'); hd.className = 'lineHd';
    const sp = lineSpan(L);
    hd.innerHTML = `<b>${String(li + 1).padStart(2, '0')}</b> ${sp ? fmtTime(sp[0]) + ' → ' + fmtTime(sp[1]) : '<span class="untimed">non calée</span>'}`;
    const mini = document.createElement('div'); mini.className = 'mini';
    const b1 = document.createElement('button'); b1.textContent = '▶'; b1.title = 'Lire depuis cette phrase';
    b1.disabled = !sp;
    b1.onclick = ev => { ev.stopPropagation(); if (sp) { seek(Math.max(0, sp[0] - .4)); play(); } };
    mini.appendChild(b1);
    const b2 = document.createElement('button');
    b2.textContent = '✕'; b2.title = 'Retirer la phrase de la timeline (le texte reste)';
    b2.disabled = !sp;
    b2.onclick = ev => { ev.stopPropagation(); clearLine(li); };
    mini.appendChild(b2);
    hd.appendChild(mini);
    hd.onclick = () => { selLine(li); if (sp) seek(sp[0]); renderSylList(); TL.invalidate(); };
    hd.oncontextmenu = ev => { ev.preventDefault(); ctxMenuLine(ev.clientX, ev.clientY, li); };

    const wrap = document.createElement('div'); wrap.className = 'sylWrap';
    L.syls.forEach((s, si) => {
      const fi = flat++;
      const el = document.createElement('span');
      el.className = 'syl' + (s.t0 != null ? ' timed' : '') + (selHas(li, si) ? ' sel' : '') + (fi === curFlat ? ' cur' : '');
      el.textContent = s.t;
      if (s.t0 != null) { const t = document.createElement('i'); t.className = 't'; t.textContent = s.t0.toFixed(2); el.appendChild(t); }
      el.onclick = ev => {
        if (ev.altKey) { splitOrMerge(li, si, ev.shiftKey); return; }
        if (ev.shiftKey) selRangeTo(li, si);
        else if (ev.ctrlKey || ev.metaKey) selToggle(li, si);
        else { selOne(li, si); if (s.t0 != null) seek(s.t0); }
        S.tapIdx = fi;
        renderSylList(); TL.invalidate();
      };
      el.oncontextmenu = ev => {
        ev.preventDefault();
        if (!selHas(li, si)) selOne(li, si);
        renderSylList(); TL.invalidate();
        ctxMenuSyl(ev.clientX, ev.clientY, { li, si });
      };
      wrap.appendChild(el);
    });
    row.append(hd, wrap); frag.appendChild(row);
  });
  host.appendChild(frag);
  if (!S.lines.length) host.innerHTML = '<div class="hint">Les syllabes apparaîtront ici après le découpage des paroles (étape ②).</div>';
  const sel = $('.syl.cur', host) || $('.syl.sel', host);
  if (sel && host.offsetParent) sel.scrollIntoView({ block: 'nearest' });
  refreshDuration();
  TL.updateStat();
  Steps.refresh();
  if (typeof Live !== 'undefined' && S.ws === 'live') Live.renderLines();
  docChanged();
}

async function rebuild(keepTiming) {
  const txt = $('#lyricsText').value;
  if (!txt.trim()) { toast('Colle d\'abord des paroles', true); $('#lyricsText').focus(); return; }
  const lang = $('#selLang').value;
  const old = S.lines;
  const timed = allSyls().filter(o => o.s.t0 != null).length;

  /* Un redécoupage jette la structure : on prévient avant, et on garde de
     quoi revenir en arrière. C'est ici qu'on perdait des heures de calage. */
  if (timed && !keepTiming) {
    const ok = await modal({
      title: 'REDÉCOUPER ?',
      body: `<div class="hint big">Redécouper va effacer le placement de <b>${timed} syllabe${timed > 1 ? 's' : ''}</b>.<br><br>
        Pour garder ton calage, choisis <b>Redécouper sans perdre les timings</b>.</div>`,
      ok: 'EFFACER ET REDÉCOUPER', cancel: 'ANNULER'
    });
    if (!ok) return;
  }
  Undo.snap(keepTiming ? 'redécoupage conservateur' : 'redécoupage');

  S.lines = buildLines(txt, lang);
  if (keepTiming && old.length) {
    for (let li = 0; li < S.lines.length && li < old.length; li++) {
      const a = S.lines[li], b = old[li];
      for (let si = 0; si < a.syls.length && si < b.syls.length; si++) { a.syls[si].t0 = b.syls[si].t0; a.syls[si].t1 = b.syls[si].t1; }
    }
  }
  Doc.lyricsDirty = false;
  selReset(0, 0); S.tapIdx = 0;
  S.dirtyLayout = true; S.dirtyMask = true; Mask.li = -1;
  renderSylList(); TL.invalidate(); requestRender();
  const kept = allSyls().filter(o => o.s.t0 != null).length;
  toast(`${S.lines.length} lignes · ${allSyls().length} syllabes`
    + (keepTiming && kept ? ` · ${kept} timings conservés` : '')
    + (timed && !keepTiming ? ' · Ctrl+Z pour revenir' : ''));
}
