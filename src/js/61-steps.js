/* ============================== LE PARCOURS =============================== */
/* Quatre étapes, une seule ouverte à la fois. Quand l'état du projet change
   (audio chargé, paroles découpées, premier calage), la prochaine étape
   utile s'ouvre d'elle-même. Un clic sur un titre y revient.              */
const Steps = {
  prev: null,

  open(n) {
    for (let i = 1; i <= 5; i++) {
      const el = $('#st' + i);
      if (!el) continue;
      el.classList.toggle('open', i === n);
      el.classList.toggle('active', i === n);
    }
  },

  refresh() {
    const all = allSyls();
    const timed = all.filter(o => o.s.t0 != null).length;
    const hasAudio = !!S.buffer, hasLyrics = all.length > 0, hasTimed = timed > 0;

    $('#sum1').textContent = hasAudio ? `${S.audioName.replace(/\.[^.]+$/, '').slice(0, 22)} · ${fmtTime(S.duration, false)}` : '';
    $('#sum2').textContent = hasLyrics ? `${S.lines.length} lignes · ${all.length} syllabes` : '';
    $('#sum3').textContent = hasTimed ? `${timed}/${all.length} calées` : '';
    $('#sum4').textContent = hasTimed && timed === all.length ? 'tout est calé'
      : (hasTimed ? `${all.length - timed} restantes` : 'rien à ajuster');

    $('#st1').classList.toggle('done', hasAudio);
    $('#st2').classList.toggle('done', hasLyrics);
    $('#st3').classList.toggle('done', hasTimed && timed === all.length);
    $('#st4').classList.toggle('done', hasTimed && timed === all.length);
    $('#st4').classList.toggle('dim', !hasTimed);
    $('#sum5').textContent = S.song.id ? (Doc.linesDirty ? 'modifié' : 'dans la bibliothèque') : '';
    $('#st5').classList.toggle('done', !!S.song.id && !Doc.linesDirty);
    $('#st5').classList.toggle('dim', !hasLyrics);
    const ua = $('#bUnloadAudio'); if (ua) ua.hidden = !hasAudio;

    const st = [hasAudio, hasLyrics, hasTimed];
    if (this.prev && !S.tapMode && st.some((v, i) => v && !this.prev[i])) {
      this.open(!hasLyrics ? (hasAudio ? 2 : 1) : !hasAudio ? 1 : hasTimed ? 4 : 3);
    }
    this.prev = st;
    updateStageHint();
  },

  bind() {
    for (let i = 1; i <= 5; i++) {
      const el = $('#st' + i); if (!el) continue;
      el.querySelector('h3').onclick = () => this.open(el.classList.contains('open') ? 0 : i);
    }
    for (const t of $$('.more[data-box]')) {
      const box = $('#' + t.dataset.box);
      t.addEventListener('click', () => { const on = box.classList.toggle('on'); t.classList.toggle('open', on); });
    }
  }
};

/** Le message au centre de l'aperçu dit toujours quoi faire ensuite. */
function updateStageHint() {
  const h = $('#dropHint'); if (!h) return;
  const hasLyrics = S.lines.some(L => L.syls.length);
  h.classList.toggle('hide', hasLyrics);
  if (hasLyrics) return;
  const [b, span] = [h.querySelector('b'), h.querySelector('span')];
  if (S.ws === 'live') {
    b.textContent = 'CHOISIS UN MORCEAU';
    span.textContent = 'dans le set à gauche — ou cherche des paroles en ligne';
  } else if (S.buffer) {
    b.textContent = 'COLLE TES PAROLES';
    span.textContent = 'étape ② à gauche — ou cherche-les en ligne';
  } else {
    b.textContent = 'DÉPOSE UN FICHIER AUDIO';
    span.textContent = 'ou commence par les paroles, étape ②';
  }
}
