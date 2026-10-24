/* ============================================================================
   KARAOKE FORGE — autotest
   ----------------------------------------------------------------------------
   `__selfTest()` rejoue en page les parcours essentiels (découpage, calage,
   glissé, annulation, réglages, enregistrement) et renvoie la liste des
   vérifications réussies et échouées. Inerte tant qu'on ne l'appelle pas :
   lancé par  `npm test`  dans desktop/ (Electron, fenêtre cachée) ou par
   `node tools/smoke.mjs`.
   ============================================================================ */
async function __selfTest() {
  const passed = [], failed = [];
  const ok = (cond, what) => { (cond ? passed : failed).push(what); if (!cond) console.warn('[autotest] échec :', what); };
  const eq = (a, b, what) => ok(a === b, `${what} (attendu ${JSON.stringify(b)}, obtenu ${JSON.stringify(a)})`);
  const tick = () => new Promise(r => setTimeout(r, 0));
  const key = (k, o = {}) => window.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...o }));
  const timed = () => allSyls().filter(o => o.s.t0 != null).length;

  /* un WAV de 24 s (bruit léger) : le décodage audio et la forme d'onde sont testés pour de vrai */
  function makeWav(sec) {
    const sr = 22050, n = sr * sec, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
    const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    str(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    str(36, 'data'); v.setUint32(40, n * 2, true);
    let seed = 7;
    for (let i = 0; i < n; i++) { seed = (seed * 1103515245 + 12345) & 0x7fffffff; const beat = (i % (sr / 2)) < 400 ? .6 : .05; v.setInt16(44 + i * 2, ((seed / 0x7fffffff) * 2 - 1) * beat * 32767, true); }
    return new File([buf], 'autotest.wav', { type: 'audio/wav' });
  }

  try {
    if (Modal.close) Modal.close();                    // « travail retrouvé » éventuel
    setWorkspace('prep');
    Doc.forget();
    setDocument({ lines: [], lyrics: '' });
    unloadAudio();

    /* ---- 1. audio ---- */
    const loaded = await loadAudio(makeWav(24));
    ok(loaded && S.buffer && S.duration > 23, 'audio WAV décodé');
    ok(!!S.peaks, 'forme d\'onde calculée');

    /* ---- 2. paroles ---- */
    $('#lyricsText').value = 'Néon dans la nuit\nJe danse avec ton ombre\nLa lumière tombe';
    Doc.lyricsDirty = true;
    await rebuild(false);
    eq(S.lines.length, 3, 'trois lignes découpées');
    ok(allSyls().length >= 12, 'au moins douze syllabes');
    eq(Undo.doc.undoLabel(), 'redécoupage', 'annulation nommée « redécoupage »');

    /* ---- 3. calage simulé ---- */
    setTap(true); pause();
    ok(S.tapMode, 'mode calage actif');
    const n = allSyls().length;
    for (let i = 0; i < n; i++) { S.cur = 1 + i * .5; tap(); }
    await new Promise(r => setTimeout(r, 1600));       // la dernière frappe referme le calage
    eq(timed(), n, 'toutes les syllabes calées');
    ok(!S.tapMode, 'calage terminé automatiquement');

    /* ---- 4. annuler / rétablir : une rafale de frappes = une étape ---- */
    const before = timed();
    Undo.doc.undo(); await tick();
    ok(timed() < before, 'Ctrl+Z annule le calage');
    Undo.doc.redo(); await tick();
    eq(timed(), before, 'Ctrl+Maj+Z rétablit le calage');

    /* ---- 5. décalage au clavier : 30 appuis = 1 étape, sélection conservée ---- */
    selOne(0, 1); renderSylList();
    const t0 = S.lines[0].syls[1].t0;
    for (let i = 0; i < 30; i++) nudgeSelection(.001);
    ok(Math.abs(S.lines[0].syls[1].t0 - t0 - .03) < 1e-6, 'trente décalages de 1 ms appliqués');
    eq(Undo.doc.undoLabel(), 'décaler', 'annulation nommée « décaler »');
    key('z', { ctrlKey: true });
    await tick();
    ok(Math.abs(S.lines[0].syls[1].t0 - t0) < 1e-6, 'Ctrl+Z annule les trente décalages d\'un coup');
    ok(selHas(0, 1), 'la sélection survit à l\'annulation');
    eq(Undo.doc.redoLabel(), 'décaler', 'rétablir nommé « décaler »');

    /* ---- 6. bornes : une syllabe ne traverse pas sa voisine ---- */
    selOne(0, 1); renderSylList();
    const prevT0 = S.lines[0].syls[0].t0;
    nudgeSelection(-10);
    ok(S.lines[0].syls[1].t0 > prevT0, 'le décalage s\'arrête sur la voisine');
    Undo.doc.undo(); await tick();

    /* ---- 7. libellés corrects en chaîne ---- */
    selOne(1, 0); renderSylList();
    nudgeSelection(.01);
    await new Promise(r => setTimeout(r, 1000));        // rafale close
    selOne(1, 1); clearTimingSelection();
    eq(Undo.doc.undoLabel(), 'effacer le timing', 'dernière opération : effacer le timing');
    Undo.doc.undo(); await tick();
    eq(Undo.doc.undoLabel(), 'décaler', 'opération précédente : décaler');
    ok(S.lines[1].syls[1].t0 != null, 'le timing effacé est revenu');
    Undo.doc.undo(); await tick();

    /* ---- 8. glissé à la souris sur la timeline, puis Échap ---- */
    zoomFit(); TL.draw();
    const s = S.lines[2].syls[0], r = TL.c.getBoundingClientRect(), G = TL.geo();
    const sx = r.left + (TL.t2x(s.t0) + 8 * TL.dpr) / TL.dpr, sy = r.top + (G.sylY + G.syl / 2) / TL.dpr;
    const pe = (type, x, y) => TL.c.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, button: 0, buttons: 1, pointerId: 1, bubbles: true, isPrimary: true }));
    const was = s.t0;
    pe('pointerdown', sx, sy); pe('pointermove', sx + 40, sy); pe('pointermove', sx + 60, sy);
    ok(TL.drag && TL.drag.moved, 'glissé en cours');
    ok(s.t0 > was, 'la syllabe suit la souris');
    key('Escape');
    ok(!TL.drag && Math.abs(s.t0 - was) < 1e-9, 'Échap annule le glissé, la syllabe revient');
    pe('pointerdown', sx, sy); pe('pointermove', sx + 40, sy); pe('pointerup', sx + 40, sy);
    ok(s.t0 > was, 'glissé terminé : la syllabe a bougé');
    eq(Undo.doc.undoLabel(), 'déplacer', 'annulation nommée « déplacer »');
    Undo.doc.undo(); await tick();
    ok(Math.abs(S.lines[2].syls[0].t0 - was) < 1e-9, 'Ctrl+Z annule le glissé');

    /* ---- 9. réglages : pile séparée ---- */
    const fs0 = P.fontSize;
    setParam('fontSize', fs0 + 2);
    ok(Undo.style.canUndo(), 'un réglage est annulable');
    ok(Undo.doc.undoLabel() !== 'réglage « Taille »', 'le réglage n\'entre pas dans la pile des timings');
    Undo.style.undo(); await tick();
    eq(P.fontSize, fs0, 'Ctrl+Z en STYLE remet la taille');
    applyPreset('TERMINAL');
    Undo.style.undo(); await tick();
    eq(P.fontSize, fs0, 'l\'ambiance s\'annule en une étape');
    setWorkspace('live');
    const before2 = S.lines[0].syls[0].t0;
    key('z', { ctrlKey: true }); await tick();
    eq(S.lines[0].syls[0].t0, before2, 'Ctrl+Z en LIVE ne touche à rien');
    setWorkspace('prep');

    /* ---- 10. enregistrement et état « modifié » ---- */
    S.song.title = 'Autotest Forge'; S.song.artist = 'Robot';
    const saved = await saveToLibrary();
    ok(saved && S.song.id, 'morceau enregistré dans la bibliothèque');
    ok(!Doc.dirty, 'document propre après enregistrement');
    selOne(0, 0); nudgeSelection(.01); await tick();
    ok(Doc.dirty, 'un décalage marque le document modifié');
    Undo.doc.undo(); await tick();
    ok(Doc.dirty, 'une annulation marque aussi le document modifié');
    Doc.autosave();
    ok(!!localStorage.getItem(Doc.KEY), 'sauvegarde automatique écrite');
    const id = S.song.id;
    await Lib.remove(id);
    ok(!Lib.card(id), 'morceau de test retiré de la bibliothèque');
    Doc.forget();

    /* ---- 11. texte des paroles : annulable, resynchronisé ---- */
    const ta = $('#lyricsText');
    const txt = ta.value;
    ta.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: 'x', bubbles: true }));
    ta.value = txt + '\nNouvelle ligne'; ta.dispatchEvent(new Event('input', { bubbles: true }));
    eq(Undo.doc.undoLabel(), 'saisie des paroles', 'la frappe est annulable');
    Undo.doc.undo(); await tick();
    eq(ta.value, txt, 'Ctrl+Z remet le texte');
  } catch (e) {
    console.error('[autotest] exception', e);
    failed.push('exception : ' + (e && e.message || e));
  }
  return { ok: !failed.length, passed, failed };
}
if (/[?&]selftest\b/.test(location.search)) window.__selfTest = __selfTest;
else window.__selfTest = __selfTest;
