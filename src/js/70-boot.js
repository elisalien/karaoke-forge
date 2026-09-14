/* ================================================================== BOOT === */
const WORKSPACES = ['prep', 'style', 'live'];

function boot() {
  buildPresets();
  setUiMode('simple');
  if (!GL.init()) {
    document.body.innerHTML = '<div style="padding:40px;font:14px monospace;color:#ff2fd0">' +
      'WebGL2 est requis. Utilise Chrome ou Edge à jour.</div>';
    return;
  }
  Particles.resize(P.parMax);
  Particles.reset();
  TL.init();
  resizeStage();
  Scene.init();
  wire();
  Live.init();
  setTool('V');
  Undo.reset(); Doc.clean();
  refreshDuration();
  Steps.refresh(); Steps.open(1);
  renderSylList();
  let ws = 'prep';
  try { ws = localStorage.getItem('kf.ws') || 'prep'; } catch (e) { }
  setWorkspace(WORKSPACES.includes(ws) ? ws : 'prep');
  loop();
  offerRestore();
}

/** Au démarrage, propose de reprendre le dernier travail non enregistré. */
async function offerRestore() {
  const r = Doc.restorable();
  if (!r) { toast('Dépose ton audio pour commencer · F1 pour l\'aide'); return; }
  const age = Math.max(1, Math.round((Date.now() - r.when) / 60000));
  const quand = age < 60 ? `il y a ${age} min` : age < 2880 ? `il y a ${Math.round(age / 60)} h` : `il y a ${Math.round(age / 1440)} jours`;
  const ok = await modal({
    title: 'TRAVAIL RETROUVÉ',
    body: `<div class="hint big">Une sauvegarde automatique de <b>${quand}</b> a été retrouvée :<br>
      <b class="cy">${r.lines} lignes · ${r.timed} syllabes calées</b>.<br><br>
      Elle est gardée dans ce navigateur, à part de la bibliothèque et de tes fichiers.</div>`,
    ok: 'REPRENDRE', cancel: 'IGNORER'
  });
  if (!ok) { toast('Sauvegarde automatique laissée de côté'); return; }
  try {
    const d = JSON.parse(r.data);
    setDocument(d);
    Doc.linesDirty = true; Doc.touch();
    const rec = S.song.id ? await Lib.get(S.song.id).catch(() => null) : null;
    if (rec && rec.audio) {
      await loadAudio(new File([rec.audio], rec.audioName || 'audio', { type: rec.audio.type }));
      toast('Travail repris, avec l\'audio de la bibliothèque');
    } else toast('Travail repris — recharge ton audio' + (d.audio ? ` (${d.audio})` : ''));
  } catch (e) { console.error(e); toast('Reprise impossible : ' + e.message, true); }
}

/* ------------------------------------------------------ espaces de travail --- */
function setWorkspace(ws) {
  if (ws === S.ws && document.body.classList.contains('ws-' + ws)) return;
  if (S.tapMode && ws !== 'prep') setTap(false);
  if (ws === 'live' && S.loop) { S.loop = null; $('#bLoop').classList.remove('on'); TL.invalidate(); }
  if (ws !== 'live' && S.ws === 'live') {
    clearHold();
    if (S.extClock && S.playing) pause();
    S.extClock = false;
    if (S.blackout) Live.toggleBlack();
    if (Beat.src !== 'song') Beat.setSource('song');   // hors live, la grille suit le morceau (aperçu = export)
  }
  S.ws = ws;
  for (const w of WORKSPACES) document.body.classList.toggle('ws-' + w, w === ws);
  $$('#wsNav button').forEach(b => b.classList.toggle('on', b.dataset.ws === ws));
  try { localStorage.setItem('kf.ws', ws); } catch (e) { }
  if (ws === 'live') Live.enter();
  updateStageHint();
  Scene.updateUi();
  requestAnimationFrame(() => { fitStage(); TL.resize(); TL.invalidate(); requestRender(); });
}

/* ------------------------------------------------------------------ câblage --- */
function wire() {
  bindFocusHygiene();

  $$('#wsNav button').forEach(b => b.onclick = () => setWorkspace(b.dataset.ws));

  /* onglets de style */
  $$('#tabsR button').forEach(b => b.onclick = () => {
    $$('#tabsR button').forEach(x => x.classList.remove('on'));
    b.classList.add('on');
    $$('#right .tabpage').forEach(p => p.classList.toggle('on', p.id === b.dataset.p));
  });
  $('#mSimple').onclick = () => setUiMode('simple');
  $('#mExpert').onclick = () => setUiMode('expert');
  Steps.bind();

  /* fichiers */
  $('#fAudio').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) loadAudio(f).catch(er => toast('Audio illisible : ' + er.message, true)); };
  $('#fProj').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) f.text().then(t => loadProject(t)).catch(er => toast('Projet illisible : ' + er.message, true)); };
  $('#fAss').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) importTimingFile(f); };
  $('#fFont').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) loadFont(f); };
  $('#bImport').onclick = () => $('#fAss').click();
  $('#bUnloadAudio').onclick = () => { unloadAudio(); toast('Audio retiré du projet'); };

  /* transport */
  $('#bPlay').onclick = () => S.ws === 'live' ? Live.togglePlay() : togglePlay();
  $('#bStop').onclick = () => stop();
  $('#bTap').onclick = () => setTap(!S.tapMode);
  $('#bExport').onclick = openExport;
  $('#lyricsText').addEventListener('input', () => { Doc.lyricsDirty = true; Doc.touch(); });
  $('#bBuild').onclick = () => rebuild(false);
  $('#bMerge').onclick = () => rebuild(true);
  $('#bSave').onclick = () => saveToLibrary();
  $('#bSaveLib').onclick = () => saveToLibrary();
  $('#bSaveAs').onclick = () => saveToLibrary(true, true);

  /* menu FICHIER — regroupe tout ce qui n'a pas à encombrer la barre */
  $('#bProj').onclick = e => {
    const r = e.currentTarget.getBoundingClientRect();
    showCtx(r.left, r.bottom + 4, [
      { hd: 'MORCEAU' },
      { label: 'Enregistrer dans la bibliothèque', key: 'Ctrl+S', fn: () => saveToLibrary() },
      { label: 'Enregistrer comme nouveau morceau…', fn: () => saveToLibrary(true, true) },
      { label: 'Nouveau morceau (vide)', fn: newProject },
      { sep: 1 },
      { hd: 'FICHIERS' },
      { label: 'Exporter le projet (.kfj)', key: 'Ctrl+Maj+S', fn: saveProjectFile },
      { label: 'Ouvrir un projet (.kfj)…', fn: () => $('#fProj').click() },
      { label: 'Exporter les timings en .ass', fn: exportAss },
      { label: 'Exporter les timings en .lrc', fn: exportLrc },
      { label: 'Importer .ass / .lrc…', fn: () => $('#fAss').click() },
      { sep: 1 },
      { label: 'Charger une police…', fn: () => $('#fFont').click() }
    ]);
  };
  $('#bDistrib').onclick = () => distributeLine(S.sel.line);
  $('#bClearL').onclick = () => clearLine(S.sel.line);

  /* calage assisté, entièrement local */
  $('#bTapFrom').onclick = () => setTap(true, true);
  const tb = $('#tapBtn');
  tb.onpointerdown = e => { e.preventDefault(); if (S.tapMode) tap(); };
  tb.onpointerup = () => { if (S.tapMode) tapRelease(); };
  $('#bLoop').onclick = toggleLoop;
  $('#bSnapSyl').onclick = snapSylToOnset;
  $('#bOnsetSnap').onclick = () => {
    const scope = selCount() ? [...new Set(selList().map(o => o.li))] : S.lines.map((_, i) => i);
    runOnsetAlign(scope);
  };
  $('#tapOffset').onchange = e => { S.tapOffset = clamp(+e.target.value || 0, -500, 500); e.target.value = S.tapOffset; };
  buildSpeed();

  /* sources en ligne, montées à la première ouverture */
  $('#more1').addEventListener('click', () => { if (!$('#ytBox').dataset.on) { $('#ytBox').dataset.on = 1; Online.mountYoutube($('#ytBox')); } });
  Online.mountLrclib($('#lrcBox'), {
    placeholder: 'titre et artiste', pickLabel: 'UTILISER',
    initial: () => { const g = guessSongInfo(S.audioName); return [S.song.title || g.title, S.song.artist || g.artist].filter(Boolean).join(' '); },
    onPick: r => useLrclibInEditor(r)
  });
  $('#more2b').addEventListener('click', () => {
    const inp = $('#lrcBox input');
    if (inp && !inp.value) { const g = guessSongInfo(S.audioName); inp.value = [S.song.title || g.title, S.song.artist || g.artist].filter(Boolean).join(' '); }
  });

  /* touche de calage — Espace reste la lecture */
  const tk = $('#tapKey');
  tk.innerHTML = TAP_KEYS.map(([v, l]) => `<option value="${v}">Touche : ${l}</option>`).join('');
  tk.value = S.tapKey;
  const showTapKey = () => { $('#tapKeyHint').textContent = tapKeyLabel(); $('#tapKeyBig').textContent = tapKeyLabel(); };
  tk.onchange = () => { S.tapKey = tk.value; showTapKey(); toast(`Touche de calage : ${tapKeyLabel()}`); };
  showTapKey();

  /* aide */
  $('#bHelp').onclick = () => openHelp();
  $('#bHelpClose').onclick = () => openHelp(false);
  $('#ckHelpMode').onchange = e => setHelpMode(e.target.checked);
  $('#helpPanel').onclick = e => { if (e.target.id === 'helpPanel') openHelp(false); };
  addEventListener('mouseover', helpHover, true);

  /* timeline */
  $('#tV').onclick = () => setTool('V');
  $('#tC').onclick = () => setTool('C');
  $('#bZoomIn').onclick = () => TL.setZoom(S.tlZoom * 1.4);
  $('#bZoomOut').onclick = () => TL.setZoom(S.tlZoom / 1.4);
  $('#bZoomFit').onclick = zoomFit;
  const tgl = (id, key) => {
    const b = $(id);
    b.classList.toggle('on', !!S[key]);
    b.onclick = () => { S[key] = !S[key]; b.classList.toggle('on', S[key]); };
  };
  tgl('#ckFollow', 'follow'); tgl('#ckSnap', 'snap');
  tgl('#ckRipple', 'ripple'); tgl('#ckScrub', 'scrubAudio');
  bindTimeScrub();

  /* menus contextuels */
  addEventListener('pointerdown', e => { if (!e.target.closest || !e.target.closest('#ctx')) hideCtx(); }, true);
  addEventListener('wheel', hideCtx, { passive: true });
  addEventListener('blur', hideCtx);

  /* glisser-déposer */
  addEventListener('dragover', e => { e.preventDefault(); document.body.classList.add('dragging'); });
  addEventListener('dragleave', e => { if (!e.relatedTarget) document.body.classList.remove('dragging'); });
  addEventListener('drop', e => {
    e.preventDefault();
    document.body.classList.remove('dragging');
    const f = e.dataTransfer.files[0]; if (!f) return;
    const fail = what => er => toast(`${what} illisible : ${er.message}`, true);
    if (/\.(kfj|json)$/i.test(f.name)) f.text().then(t => loadProject(t)).catch(fail('Projet'));
    else if (/\.(ass|ssa|lrc)$/i.test(f.name)) importTimingFile(f);
    else if (/\.(ttf|otf|woff2?)$/i.test(f.name)) loadFont(f);
    else if (/\.txt$/i.test(f.name)) f.text().then(t => {
      $('#lyricsText').value = t; Doc.lyricsDirty = true; Doc.touch();
      setWorkspace('prep'); Steps.open(2);
      toast('Paroles collées — clique « Découper en syllabes »');
    });
    else if (/^audio\//.test(f.type) || /\.(mp3|wav|ogg|m4a|flac|aac|opus)$/i.test(f.name)) loadAudio(f).catch(fail('Audio'));
    else toast('Format non reconnu : ' + f.name, true);
  });

  /* on ne part pas avec du travail non enregistré */
  addEventListener('beforeunload', e => {
    if (!Doc.dirty) return;
    Doc.autosave();
    if (!Doc.linesDirty) return;
    e.preventDefault();
    e.returnValue = '';
  });

  addEventListener('keydown', onKey);
  addEventListener('keyup', onKeyUp);

  new ResizeObserver(() => fitStage()).observe($('#stage'));
}

async function importTimingFile(f) {
  try {
    const t = await f.text();
    const lang = $('#selLang').value;
    const lines = /^\s*\[Script Info\]|Dialogue\s*:/im.test(t) ? importAss(t, lang) : importLrc(t, lang);
    if (!lines.length) { toast('Aucune ligne reconnue', true); return; }
    Undo.snap('import de timings');
    S.lines = lines;
    Doc.lyricsDirty = false;
    $('#lyricsText').value = lines.map(L => L.raw || L.syls.map(s => s.t).join('')).join('\n');
    selReset(0, 0); S.tapIdx = 0; S.dirtyLayout = true; S.dirtyMask = true; Mask.li = -1;
    refreshDuration(); renderSylList(); TL.invalidate(); requestRender();
    toast(`Import : ${lines.length} lignes, ${allSyls().length} syllabes`);
  } catch (e) { toast('Fichier de timings illisible : ' + e.message, true); }
}

/** Installe une police sous le nom KFCustom, en remplaçant la précédente. */
async function installFont(name, data) {
  const ff = new FontFace('KFCustom', data.slice(0));
  await ff.load();
  if (S.fontFace) document.fonts.delete(S.fontFace);
  document.fonts.add(ff); S.fontFace = ff;
  S.customFont = { name, data };
  S.dirtyLayout = true; S.dirtyMask = true; Mask.li = -1; requestRender();
  Scene.fontChanged();
}
async function loadFont(f) {
  try {
    await installFont(f.name, await f.arrayBuffer());
    P.fontFamily = '__custom__'; syncPanels(); Doc.touch(); docChanged();
    toast('Police chargée : ' + f.name);
  } catch (er) { toast('Police illisible', true); }
}

async function newProject() {
  if (!(await confirmDiscard('Un nouveau morceau'))) return;
  unloadAudio();
  setDocument({ lines: [], lyrics: '' });
  setWorkspace('prep'); Steps.refresh(); Steps.open(1);
  toast('Nouveau morceau');
}

function setTool(t) {
  S.tool = t;
  $('#tV').classList.toggle('on', t === 'V');
  $('#tC').classList.toggle('on', t === 'C');
  TL.repaint();
}

/* ------------------------------------------------------------------ clavier --- */
function onKey(e) {
  if (S.exporting) return;
  const k = e.key, low = k.length === 1 ? k.toLowerCase() : k;
  const mod = e.ctrlKey || e.metaKey;

  /* une fenêtre de dialogue ouverte garde la main */
  if (k === 'Escape' && Modal.close) { e.preventDefault(); Modal.close(); return; }
  if ($('#modal').classList.contains('on')) { if (mod && (low === 's' || low === 'e')) e.preventDefault(); return; }

  /* Ctrl+S et Ctrl+E marchent partout, même le curseur dans les paroles —
     sinon c'est la boîte « Enregistrer la page » du navigateur qui s'ouvre. */
  if (mod && !e.altKey) {
    if (low === 's') { e.preventDefault(); if (!e.repeat) e.shiftKey ? saveProjectFile() : saveToLibrary(); return; }
    if (low === 'e') { e.preventDefault(); if (!e.repeat) openExport(); return; }
  }
  /* Alt+1/2/3 : espaces de travail (codes physiques : marche en AZERTY) */
  const ws = /^(?:Digit|Numpad)([123])$/.exec(e.code);
  if (e.altKey && !mod && ws) { e.preventDefault(); setWorkspace(WORKSPACES[+ws[1] - 1]); return; }
  if (isTyping(e.target)) return;
  if (k === 'F1') { e.preventDefault(); openHelp(); return; }
  if ($('#helpPanel').classList.contains('on')) { if (k === 'Escape') openHelp(false); return; }

  if (S.ws === 'live') { onKeyLive(e, k, low, mod); return; }

  /* --- le tap passe avant tout le reste quand le mode est actif --- */
  if (S.tapMode && !e.repeat && isTapKey(e) && (!mod || S.tapKey === 'ControlRight')) { e.preventDefault(); tap(); return; }

  /* --- combinaisons --- */
  if (mod) {
    if (low === 'a') { e.preventDefault(); selLine(S.sel.line); renderSylList(); TL.invalidate(); return; }
    if (low === 'z') { e.preventDefault(); e.shiftKey ? Undo.redo() : Undo.undo(); return; }
    if (low === 'y') { e.preventDefault(); Undo.redo(); return; }
    return;
  }

  switch (k) {
    case ' ': e.preventDefault(); togglePlay(); return;
    case 'Escape':
      e.preventDefault(); hideCtx();
      if (S.tapMode) { setTap(false); return; }
      selClear(); renderSylList(); TL.invalidate(); return;
    case 'Home': e.preventDefault(); seek(0); return;
    case 'End': e.preventDefault(); seek(S.duration); return;
    case 'Backspace':
      e.preventDefault();
      if (S.tapMode) untap(); else clearTimingSelection();
      return;
    case 'Delete':
      e.preventDefault();
      if (e.shiftKey) deleteSelection(); else clearTimingSelection();
      return;
    case 'ArrowLeft': case 'ArrowRight': {
      e.preventDefault();
      const dir = k === 'ArrowRight' ? 1 : -1;
      if (e.shiftKey) { nudgeSelection(dir * (e.altKey ? .001 : .01)); return; }
      const list = allSyls(); if (!list.length) return;
      let i = list.findIndex(o => o.li === S.sel.line && o.si === S.sel.syl);
      i = clamp((i < 0 ? 0 : i) + dir, 0, list.length - 1);
      const o = list[i];
      selOne(o.li, o.si); S.tapIdx = i;
      if (o.s.t0 != null) seek(o.s.t0);
      renderSylList(); TL.invalidate();
      return;
    }
    case 'ArrowUp': case 'ArrowDown': {
      e.preventDefault();
      if (!S.lines.length) return;
      const li = clamp(S.sel.line + (k === 'ArrowDown' ? 1 : -1), 0, S.lines.length - 1);
      if (!S.lines[li].syls.length) { S.sel = { line: li, syl: 0 }; return; }
      selOne(li, 0);
      const sp = lineSpan(S.lines[li]); if (sp) seek(sp[0]);
      renderSylList(); TL.invalidate();
      return;
    }
    case '+': case '=': e.preventDefault(); TL.setZoom(S.tlZoom * 1.4); return;
    case '-': case '_': e.preventDefault(); TL.setZoom(S.tlZoom / 1.4); return;
    case '?': openHelp(); return;
  }
  if (e.repeat) return;
  switch (low) {
    case 't': if (S.ws === 'style') Beat.tap(); else setTap(!S.tapMode); break;
    case 'k': pause(); break;
    case 'l': S.playing ? setRate(S.rate >= 4 ? 4 : S.rate * 2) : (setRate(1), play()); break;
    case 'j': setRate(S.rate <= .25 ? .25 : (S.rate <= .5 ? .25 : (S.rate <= .75 ? .5 : .75))); if (!S.playing) play(); break;
    case 'b': toggleLoop(); break;
    case 'v': setTool('V'); break;
    case 'c': setTool('C'); break;
    case 's': S.snap = !S.snap; $('#ckSnap').classList.toggle('on', S.snap); toast('Aimantation ' + (S.snap ? 'activée' : 'désactivée')); break;
    case 'r': S.ripple = !S.ripple; $('#ckRipple').classList.toggle('on', S.ripple); toast('Décaler la suite : ' + (S.ripple ? 'activé' : 'désactivé')); break;
    case 'm': mergeSelection(); break;
    case 'i': setEdgeAtPlayhead('in'); break;
    case 'o': setEdgeAtPlayhead('out'); break;
    case 'f': if (S.tapKey !== 'f') zoomFit(); break;
  }
}

function onKeyLive(e, k, low, mod) {
  if (mod) return;
  if (e.repeat && !/^Arrow/.test(k)) return;    // une touche tenue ne recharge pas dix morceaux
  const dig = /^(?:Digit|Numpad)([1-9])$/.exec(e.code);
  if (dig && !e.altKey) { e.preventDefault(); Live.cueIndex(+dig[1] - 1); return; }
  switch (k) {
    case ' ': e.preventDefault(); Live.togglePlay(); return;
    case 'ArrowRight': e.preventDefault(); Live.goLine(Live.currentLine() + 1); return;
    case 'ArrowLeft': e.preventDefault(); Live.prevLine(); return;
    case 'ArrowUp': e.preventDefault(); Live.nudge(.1); return;
    case 'ArrowDown': e.preventDefault(); Live.nudge(-.1); return;
    case 'Home': e.preventDefault(); Live.goLine(0); return;
    case 'Enter': e.preventDefault(); Live.cueNext(e.shiftKey ? -1 : 1); return;
    case 'Escape': e.preventDefault(); hideCtx(); return;
    case '?': openHelp(); return;
  }
  if (e.repeat) return;
  switch (low) {
    case 't': Beat.tap(); break;
    case 'n': Live.toggleBlack(); break;
    case 'o': Scene.open(); break;
    case 'l': Live.setStep(Live.step === 'line' ? 'flow' : 'line'); break;
    case 'x': Live.setSource(S.extClock ? 'audio' : 'ext'); break;
    case 'r': Live.toggleBeat(); break;
    case 'k': Live.setKey(Live.keyColor ? '' : '#00b140'); break;
  }
}

function onKeyUp(e) {
  if (S.tapMode && isTapKey(e)) tapRelease();
  // Espace relâché sur un bouton ne doit pas le cliquer une seconde fois
  if (e.key === ' ' && e.target && e.target.tagName === 'BUTTON') e.preventDefault();
}
