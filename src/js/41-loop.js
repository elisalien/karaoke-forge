/* -------------------------------------------------------------- app loop --- */
let _needs = true, _lastT = performance.now();
function requestRender() { _needs = true; }

function loop() {
  requestAnimationFrame(loop);
  const nowMs = performance.now();
  let dt = (nowMs - _lastT) / 1000; _lastT = nowMs;
  dt = clamp(dt, 0, .1);

  /* Pendant un export, l'aperçu se met en retrait — il partage le canevas.
     Mais un export qui ne donne plus signe de vie ne doit PAS geler l'app :
     au-delà de 15 s sans battement, on reprend la main.                    */
  if (S.exporting) {
    if (EX.beat && nowMs - EX.beat > 15000) {
      console.warn('[export] aucun signe de vie depuis 15 s — reprise de l\'aperçu');
      EX.abort = true;
      endExport();
      $('#stageBadge').textContent = '—';
      toast('Export sans réponse — aperçu réactivé', true);
    } else return;
  }

  if (S.playing) {
    S.cur = now(); updateTime(); _needs = true;
    if (S.loop && S.ws !== 'live' && S.cur >= S.loop[1]) seek(S.loop[0]);
    else if (S.holdAt != null && S.cur >= S.holdAt) {
      // live « ligne par ligne » : on s'arrête net en fin de ligne
      const h = S.holdAt; pause(); S.cur = h; updateTime(); Scene.sendClock();
    }
    else if (!S.src && S.cur >= S.duration) pause();     // horloge libre arrivée au bout
    Scene.heartbeat(nowMs);
    Live.tick();
  }
  if (P.beatOn && Beat.live) _needs = true;              // la pulsation vit même à l'arrêt
  Live.frame();

  if (_needs) {
    _needs = S.playing || (P.beatOn && Beat.live);
    if (!Scene.previewPaused()) {
      try { renderFrame(S.cur, S.playing ? dt : 1 / 60); _fail.r = 0; }
      catch (e) { console.error(e); reportFail('r', 'Aperçu', e); }
    }
  }
  if (S.ws === 'live') return;                           // pas de timeline en live

  if (S.playing) {
    TL.clampScroll();
    if (S.follow && !TL.followPaused && !TL.drag) {
      const vis = TL.visSpan();
      if (S.cur < S.tlScroll + vis * .1 || S.cur > S.tlScroll + vis * .8) {
        S.tlScroll = Math.max(0, S.cur - vis * .3);
        TL.invalidate();
      }
    }
    TL.needs = true;
  }
  if (TL.needs) {
    TL.needs = false;
    try { TL.draw(); _fail.t = 0; }
    catch (e) { console.error(e); reportFail('t', 'Timeline', e); }
  }
}

/* Un canevas noir sans explication est le pire des symptômes : au bout de
   quelques échecs d'affilée, on le dit une bonne fois, avec le message. */
const _fail = { r: 0, t: 0, said: {} };
function reportFail(key, what, e) {
  if (++_fail[key] < 3 || _fail.said[key]) return;
  _fail.said[key] = 1;
  const msg = String(e && e.message || e).slice(0, 120);
  toast(`${what} en échec : ${msg} — voir la console (F12)`, true);
  const b = $('#stageBadge'); if (b) b.textContent = 'ERREUR — F12';
}
