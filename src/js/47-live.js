/* ============================================================================
   KARAOKE FORGE — live
   ----------------------------------------------------------------------------
   L'espace de jeu : un set de morceaux prêts, un écran scène pour la capture,
   et un pilotage pensé pour le clavier.
     · AUDIO DU MORCEAU : l'app joue le son, les paroles suivent à la milliseconde.
     · SON EXTÉRIEUR : la musique vient des platines ; l'app déroule les paroles
       sur son horloge. On la cale à la main : ligne suivante, décalage, vitesse.
     · LIGNE PAR LIGNE : chaque ligne se joue puis s'arrête — le filet de
       sécurité quand le calage ne suit pas le DJ.
   ============================================================================ */
const LIVE_RATES = [.9, .95, 1, 1.05, 1.1, 1.2];
const KEY_PARAMS = ['bgMode', 'bgC1', 'gridOn', 'vign', 'grain', 'scanAmt', 'chroma', 'glitchAmt'];

const Live = {
  step: 'flow', keyColor: '', keyPrev: null, lastLine: -2, lastBeatN: null,

  init() {
    $('#lvScene').onclick = () => Scene.open();
    $('#lvPreview').onchange = e => { Scene.livePreview = e.target.checked; Scene.updateUi(); requestRender(); };
    $('#bPreviewOn').onclick = () => { $('#lvPreview').checked = true; Scene.livePreview = true; Scene.updateUi(); requestRender(); };
    $('#lvPlay').onclick = () => this.togglePlay();
    $('#lvPrev').onclick = () => this.prevLine();
    $('#lvNext').onclick = () => this.goLine(this.currentLine() + 1);
    $('#lvNudgeM').onclick = () => this.nudge(-.1);
    $('#lvNudgeP').onclick = () => this.nudge(.1);
    $('#lvBlack').onclick = () => this.toggleBlack();
    $('#lvBeatOn').onchange = e => { P.beatOn = e.target.checked; syncPanels(); docChanged(); requestRender(); };
    $$('#lvSource button').forEach(b => b.onclick = () => this.setSource(b.dataset.src));
    $$('#lvStep button').forEach(b => b.onclick = () => this.setStep(b.dataset.step));
    $$('#lvKey button').forEach(b => b.onclick = () => this.setKey(b.dataset.key));
    const rh = $('#lvRate');
    for (const r of LIVE_RATES) {
      const b = document.createElement('button');
      b.textContent = fmtRate(r); b.dataset.r = r;
      b.onclick = () => setRate(r);
      rh.appendChild(b);
    }
    $('#libFilter').oninput = () => this.renderLibrary();
    Online.mountLrclib($('#lvLrc'), {
      placeholder: 'titre et artiste', pickLabel: '+ SET',
      onPick: (r, b) => this.addFromWeb(r, b)
    });
    mountBeatTools($('#lvBeat'));
    mountBeatTools($('#beatTools'));
    Lib.load();
    this.transportChanged(); this.rateChanged(); this.beatChanged();
  },

  enter() {
    this.lastLine = -2;
    this.renderLines();
    this.renderLibrary();
    this.setSource(S.extClock || !S.buffer ? 'ext' : 'audio', true);
    Scene.updateUi();
    this.tick(true);
  },

  /* ------------------------------------------------------------- set --- */
  renderLibrary() {
    const setHost = $('#setList'), libHost = $('#libList');
    if (!setHost) return;
    if (!Lib.ok) {
      setHost.innerHTML = '<div class="hint err">La bibliothèque n\'est pas disponible dans ce navigateur (mode privé ?).</div>';
      libHost.innerHTML = '';
      return;
    }
    const badges = c => `${c.hasAudio ? '<span class="badge sync" title="audio rangé avec le morceau">♪</span>' : '<span class="badge none" title="pas d\'audio : son extérieur">ext</span>'}`
      + `<span class="badge ${c.timing === 'syllabes' ? 'sync' : c.timing === 'texte' || c.timing === 'vide' ? 'none' : 'txt'}">${TIMING_LABEL[c.timing]}</span>`;

    setHost.innerHTML = '';
    Lib.setlist.forEach((id, i) => {
      const c = Lib.card(id); if (!c) return;
      const row = document.createElement('div');
      row.className = 'item' + (S.song.id === id ? ' cur' : '');
      row.title = 'Clic : charger · double-clic : charger et lancer · touche ' + (i < 9 ? i + 1 : '');
      row.innerHTML = `<span class="idx">${i + 1}</span><div class="rMain"><b>${esc(c.title)}</b><span>${esc(c.artist)}</span></div>${badges(c)}`;
      const tools = document.createElement('span'); tools.className = 'tools';
      for (const [lbl, tip, fn] of [['↑', 'Monter', () => Lib.moveInSet(i, -1)], ['↓', 'Descendre', () => Lib.moveInSet(i, 1)], ['✕', 'Retirer du set', () => Lib.removeFromSet(i)]]) {
        const b = document.createElement('button'); b.textContent = lbl; b.title = tip;
        b.onclick = ev => { ev.stopPropagation(); fn(); };
        tools.appendChild(b);
      }
      row.appendChild(tools);
      row.onclick = e => { if (e.detail < 2) this.cue(id); };
      row.ondblclick = () => this.cue(id, true);
      setHost.appendChild(row);
    });
    if (!Lib.setlist.length) setHost.innerHTML = '<div class="hint">Le set est vide. Ajoute des morceaux depuis la bibliothèque ci-dessous, ou cherche des paroles en ligne.</div>';
    $('#setCount').textContent = Lib.setlist.length ? Lib.setlist.length + ' morceau' + (Lib.setlist.length > 1 ? 'x' : '') : '';

    const f = ($('#libFilter').value || '').toLowerCase();
    libHost.innerHTML = '';
    for (const c of Lib.songs) {
      if (f && !(c.title + ' ' + c.artist).toLowerCase().includes(f)) continue;
      const row = document.createElement('div');
      row.className = 'item' + (S.song.id === c.id ? ' cur' : '');
      row.innerHTML = `<div class="rMain"><b>${esc(c.title)}</b><span>${esc(c.artist)}${c.duration ? ' · ' + fmtTime(c.duration, false) : ''}</span></div>${badges(c)}`;
      const tools = document.createElement('span'); tools.className = 'tools';
      const inSet = Lib.setlist.includes(c.id);
      const add = document.createElement('button'); add.textContent = inSet ? '✓' : '+ SET'; add.disabled = inSet;
      add.title = 'Ajouter au set'; add.onclick = ev => { ev.stopPropagation(); Lib.addToSet(c.id); };
      const edit = document.createElement('button'); edit.textContent = 'ÉDITER'; edit.title = 'Ouvrir dans PRÉPARER';
      edit.onclick = async ev => { ev.stopPropagation(); if (await openSong(c.id)) setWorkspace('prep'); };
      const del = document.createElement('button'); del.textContent = '✕'; del.title = 'Supprimer de la bibliothèque'; del.className = 'dgr';
      del.onclick = async ev => {
        ev.stopPropagation();
        if (!(await modal({ title: 'SUPPRIMER ?', body: `<div class="hint big">« <b>${esc(c.title)}</b> » sera supprimé de la bibliothèque, avec son audio et son calage. Irréversible.</div>`, ok: 'SUPPRIMER' }))) return;
        await Lib.remove(c.id);
        if (S.song.id === c.id) { S.song.id = null; Doc.touch(); }
        toast('Morceau supprimé');
      };
      tools.append(add, edit, del);
      row.appendChild(tools);
      row.onclick = e => { if (e.detail < 2) this.cue(c.id); };
      libHost.appendChild(row);
    }
    if (!Lib.songs.length) libHost.innerHTML = '<div class="hint">Vide pour l\'instant. Dans <b>① PRÉPARER</b>, <b>Ctrl+S</b> range le morceau ouvert ici.</div>';
    $('#libCount').textContent = Lib.songs.length ? `(${Lib.songs.length})` : '';
  },

  async cue(id, andPlay) {
    if (S.song.id !== id) {
      const keep = $('#lvKeepStyle').checked;
      const key = this.keyColor;
      if (!(await openSong(id, { keepStyle: keep }))) return;
      if (key && !keep) { this.keyPrev = null; this.setKey(key); }
      this.setSource(S.buffer ? 'audio' : 'ext', true);
      this.lastLine = -2;
      this.renderLines(); this.renderLibrary();
      seek(0);
      toast(`Prêt : ${S.song.title}` + (S.buffer ? '' : ' — son extérieur'));
    }
    if (andPlay) { this.goLine(0); if (!S.playing) this.togglePlay(); }
  },
  cueIndex(i) { const id = Lib.setlist[i]; if (id) this.cue(id); },
  cueNext(d) {
    if (!Lib.setlist.length) return;
    const i = Lib.setlist.indexOf(S.song.id);
    this.cueIndex(clamp(i < 0 ? 0 : i + d, 0, Lib.setlist.length - 1));
  },

  async addFromWeb(rec, btn) {
    const d = Online.toDoc(rec, $('#selLang').value);
    if (!d.lines.length) { toast('Pas de paroles dans ce résultat', true); return; }
    try {
      btn.disabled = true;
      const r = await addSongRecord(d);
      Lib.addToSet(r.id);
      btn.textContent = '✓';
      toast(`« ${r.title} » ajouté au set` + (d.timing === 'texte' ? ' — texte seul : joue-le ligne par ligne' : ''));
    } catch (e) { btn.disabled = false; toast('Ajout impossible : ' + e.message, true); }
  },

  /* ------------------------------------------------------------ lignes --- */
  renderLines() {
    const host = $('#lvLines'); if (!host) return;
    host.innerHTML = '';
    S.lines.forEach((L, i) => {
      if (!L.syls.length) return;
      const sp = lineSpan(L);
      const row = document.createElement('div');
      row.className = 'line' + (sp ? '' : ' untimed');
      row.dataset.i = i;
      row.innerHTML = `<span class="lt">${sp ? fmtTime(sp[0], false) : '--:--'}</span><span class="lx">${esc(L.raw || L.syls.map(s => s.t).join(''))}</span>`;
      row.onclick = () => this.goLine(i);
      host.appendChild(row);
    });
    if (!host.children.length) host.innerHTML = '<div class="hint">Charge un morceau du set.</div>';
    this.lastLine = -2;
  },

  /** Ligne réellement commencée — sans l'anticipation d'affichage, sinon
      « suivante » sauterait une ligne. -1 avant la première. La marge
      couvre le petit élan pris par goLine avant chaque ligne.            */
  currentLine() {
    const t = now() + P.fillLead / 1000 + .15;
    let a = -1;
    S.lines.forEach((L, i) => { const sp = lineSpan(L); if (sp && sp[0] <= t) a = i; });
    return a;
  },

  /** Rafraîchit la ligne en surbrillance ; peu coûteux, appelé à chaque image de lecture. */
  tick(force) {
    if (S.ws !== 'live') return;
    const i = this.currentLine();
    if (i === this.lastLine && !force) return;
    this.lastLine = i;
    const host = $('#lvLines');
    $$('.line.cur', host).forEach(el => el.classList.remove('cur'));
    const el = $(`.line[data-i="${i}"]`, host);
    if (el) {
      el.classList.add('cur');
      if (!host.matches(':hover')) el.scrollIntoView({ block: 'center', behavior: force ? 'auto' : 'smooth' });
    }
    const n = S.lines.filter(L => L.syls.length).length;
    const k = S.lines.slice(0, i + 1).filter(L => L.syls.length).length;   // les lignes vides ne comptent pas
    $('#lvLineInfo').textContent = !n ? '' : i < 0 ? `avant la 1re ligne · ${n} lignes` : `ligne ${k} / ${n}`;
  },

  /** Métronome visuel : une pastille par temps. Appelé à chaque image. */
  frame() {
    if (S.ws === 'prep') return;
    const b = Math.floor(beatPos(now()));
    if (b === this.lastBeatN) return;
    this.lastBeatN = b;
    const k = ((b % 4) + 4) % 4;
    $$('.beatDots').forEach(d => [...d.children].forEach((el, j) => el.classList.toggle('on', j === k)));
  },

  /* ---------------------------------------------------------- transport --- */
  setSource(src, quiet) {
    if (src === 'audio' && !S.buffer) {
      if (!quiet) toast('Ce morceau n\'a pas d\'audio : il se joue sur l\'horloge', true);
      src = 'ext';
    }
    const ext = src === 'ext';
    if (ext !== S.extClock) {
      const t = now(), was = S.playing;
      if (was) { stopSrc(); S.playing = false; }
      S.extClock = ext;
      S.cur = t;
      if (was) play(t);
    }
    $$('#lvSource button').forEach(b => b.classList.toggle('on', b.dataset.src === src));
    this.updateHint();
  },
  setStep(step) {
    this.step = step;
    if (step === 'flow') clearHold();
    $$('#lvStep button').forEach(b => b.classList.toggle('on', b.dataset.step === step));
    this.updateHint();
  },
  updateHint() {
    $('#lvHint').innerHTML = S.extClock
      ? (this.step === 'line'
        ? '<b>→</b> joue la ligne suivante puis s\'arrête. Idéal quand le DJ ne suit pas la version calée.'
        : 'Lance <b>Espace</b> sur la première ligne chantée, puis recale avec <b>←</b> <b>→</b> et <b>↑</b> <b>↓</b>.')
      : 'Les paroles suivent l\'audio du morceau à la milliseconde.';
  },

  togglePlay() {
    if (!S.lines.some(L => L.syls.length)) { toast('Charge d\'abord un morceau du set', true); return; }
    if (S.playing) { pause(); return; }
    if (this.step === 'line') {
      const i = this.currentLine(), sp = i >= 0 ? lineSpan(S.lines[i]) : null;
      if (sp && S.cur < sp[1] - .05) { play(); setHold(sp[1] + .15); }
      else this.goLine(i + 1);
      return;
    }
    play();
  },

  goLine(i) {
    const n = S.lines.length; if (!n) return;
    const dir = i < this.currentLine() ? -1 : 1;
    i = clamp(i, 0, n - 1);
    let sp = lineSpan(S.lines[i]);
    for (let j = i; !sp && j >= 0 && j < n; j += dir) { sp = lineSpan(S.lines[j]); if (sp) i = j; }
    if (!sp) { toast('Aucune ligne calée dans cette direction', true); return; }
    const playing = S.playing;
    S.holdAt = null;
    seek(Math.max(0, sp[0] - .12));
    if (this.step === 'line') { if (!S.playing) play(); setHold(sp[1] + .15); }
    else if (playing && !S.playing) play();
    this.tick(true);
  },
  /** ← : revient au début de la ligne en cours, ou à la précédente si on y est déjà. */
  prevLine() {
    const i = this.currentLine(), sp = i >= 0 ? lineSpan(S.lines[i]) : null;
    if (sp && now() - sp[0] > 1) this.goLine(i);
    else this.goLine(i - 1);
  },

  /** Recaler de ±d secondes. Sur l'horloge, on la déplace ; sur l'audio, on
      décale l'affichage (sans toucher au son, qui ne doit pas hoqueter). */
  nudge(d) {
    if (S.extClock || !S.buffer) seek(now() + d);
    else { P.fillLead = clamp(P.fillLead + d * 1000, -2000, 2000); syncPanels(); docChanged(); requestRender(); }
    toast((d > 0 ? 'Paroles en avance de ' : 'Paroles en retard de ') + Math.abs(d * 1000) + ' ms');
  },

  toggleBlack() {
    S.blackout = !S.blackout;
    $('#lvBlack').classList.toggle('on', S.blackout);
    $('#lvBlack').textContent = S.blackout ? '■ TEXTE MASQUÉ — N POUR RÉAFFICHER' : '■ MASQUER LE TEXTE (N)';
    if (Scene.isOpen()) Scene.sendDoc();
    requestRender();
  },

  /** Fond uni pour le keying : les effets qui salissent la couleur sont coupés,
      et reviennent tels quels au retour sur l'ambiance.                     */
  setKey(color) {
    if (color) {
      if (!this.keyPrev) this.keyPrev = Object.fromEntries(KEY_PARAMS.map(k => [k, P[k]]));
      Object.assign(P, { bgMode: 'solid', bgC1: color, gridOn: false, vign: 0, grain: 0, scanAmt: 0, chroma: 0, glitchAmt: 0 });
    } else if (this.keyPrev) {
      Object.assign(P, this.keyPrev); this.keyPrev = null;
    }
    this.keyColor = color || '';
    $$('#lvKey button').forEach(b => b.classList.toggle('on', b.dataset.key === this.keyColor));
    syncPanels(); requestRender(); docChanged();
  },

  toggleBeat() {
    P.beatOn = !P.beatOn;
    syncPanels(); docChanged(); requestRender(); this.beatChanged();
    toast('Réaction au rythme ' + (P.beatOn ? 'activée' : 'coupée'));
  },

  transportChanged() {
    const b = $('#lvPlay'); if (b) b.textContent = S.playing ? '❚❚' : '▶';
  },
  rateChanged() { $$('#lvRate button').forEach(b => b.classList.toggle('on', Math.abs(+b.dataset.r - S.rate) < 1e-6)); },
  beatChanged(flash) {
    const on = $('#lvBeatOn'); if (on) on.checked = !!P.beatOn;
    for (const host of [$('#lvBeat'), $('#beatTools')]) if (host && host.update) host.update(flash);
  }
};

/** Le bloc « tempo » : affiché dans LIVE et dans l'onglet STYLE → RYTHME. */
function mountBeatTools(host) {
  if (!host) return;
  host.innerHTML = `
    <div class="beatBox">
      <div class="bpmRow"><input type="number" class="bpmIn" min="40" max="240" step="0.1" title="Tempo"><span>BPM</span>
        <span class="beatDots"><i></i><i></i><i></i><i></i></span></div>
      <div class="segRow tight src">
        <button data-bsrc="song" title="La grille suit le morceau (préparation, export)">MORCEAU</button>
        <button data-bsrc="tap" title="Tempo frappé ou saisi, calé sur l'instant">TAP</button>
        <button data-bsrc="link" title="Ableton Link, via le companion et Carabiner">LINK</button>
      </div>
      <div class="segRow tight">
        <button class="bTap hero" title="Frappe au moins deux fois en rythme — touche T">TAP</button>
        <button data-bk="0.5" title="Tempo divisé par deux">÷2</button>
        <button data-bk="2" title="Tempo doublé">×2</button>
        <button class="bResync" title="Le temps, c'est maintenant">CALER</button>
      </div>
      <div class="rowbtn"><button class="bDetect" title="Cherche le tempo dans l'audio du morceau">♫ DÉTECTER DANS L'AUDIO</button></div>
      <div class="hint linkState"></div>
    </div>`;
  const inp = $('.bpmIn', host);
  inp.onchange = () => Beat.setBpm(inp.value);
  $$('[data-bsrc]', host).forEach(b => b.onclick = () => Beat.setSource(b.dataset.bsrc));
  $$('[data-bk]', host).forEach(b => b.onclick = () => Beat.scale(+b.dataset.bk));
  $('.bTap', host).onpointerdown = e => { e.preventDefault(); Beat.tap(); };
  $('.bResync', host).onclick = () => Beat.resync();
  $('.bDetect', host).onclick = () => Beat.detect();
  host.update = flash => {
    if (document.activeElement !== inp) inp.value = Beat.tempo();
    $$('[data-bsrc]', host).forEach(b => b.classList.toggle('on', b.dataset.bsrc === Beat.src));
    $('.bDetect', host).disabled = !S.buffer;
    const L = Beat.link;
    $('.linkState', host).innerHTML = Beat.src !== 'link' ? ''
      : !L.companion ? 'Companion introuvable : lance <b>START-COMPANION.bat</b>.'
        : !L.connected ? 'Companion prêt, mais Carabiner ne répond pas. Lance Carabiner.'
          : `Link connecté · ${L.peers} pair${L.peers > 1 ? 's' : ''}`;
    if (flash) { const t = $('.bTap', host); t.classList.remove('flash'); void t.offsetWidth; t.classList.add('flash'); }
  };
  host.update();
}
