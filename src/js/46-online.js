/* ============================================================================
   KARAOKE FORGE — sources en ligne
   ----------------------------------------------------------------------------
   · LRCLIB (lrclib.net) : paroles, souvent synchronisées ligne par ligne.
     Seul le texte cherché part sur le réseau, et seulement au clic.
   · YouTube, via le companion local (yt-dlp) s'il est lancé.
   ============================================================================ */
const Online = {
  async lrclib(q, signal) {
    const r = await fetch('https://lrclib.net/api/search?q=' + encodeURIComponent(q), { signal });
    if (!r.ok) throw new Error('LRCLIB a répondu ' + r.status);
    const list = await r.json();
    // synchronisées d'abord, puis texte seul ; les instrumentaux à la fin
    const rank = x => x.syncedLyrics ? 0 : x.plainLyrics ? 1 : 2;
    return list.sort((a, b) => rank(a) - rank(b)).slice(0, 15);
  },

  /** Résultat LRCLIB → document Forge. */
  toDoc(rec, lang) {
    let lines = [], timing = 'texte';
    if (rec.syncedLyrics) { lines = importLrc(rec.syncedLyrics, lang); timing = 'lignes'; }
    else if (rec.plainLyrics) lines = buildLines(rec.plainLyrics.replace(/\n{3,}/g, '\n\n'), lang);
    return {
      lines, timing, lang, source: 'lrclib',
      lyrics: lines.map(L => L.raw).join('\n'),
      title: rec.trackName || '', artist: rec.artistName || '', duration: rec.duration || null
    };
  },

  /** Construit une zone de recherche LRCLIB dans `host`. `onPick(rec)` reçoit le choix. */
  mountLrclib(host, { placeholder, pickLabel, onPick, initial }) {
    host.innerHTML = `
      <div class="searchRow"><input type="search" placeholder="${esc(placeholder || 'titre et artiste')}">
        <button class="pri">Chercher</button></div>
      <div class="results"></div>`;
    const input = $('input', host), btn = $('button', host), out = $('.results', host);
    if (initial) input.value = initial();
    let ctl = null;                                  // une recherche chasse la précédente, dans CETTE zone
    const go = async () => {
      const q = input.value.trim();
      if (!q) { input.focus(); return; }
      if (ctl) ctl.abort();
      const mine = ctl = new AbortController();
      btn.disabled = true; out.innerHTML = '<div class="hint">Recherche…</div>';
      try {
        const list = await this.lrclib(q, mine.signal);
        if (!list.length) { out.innerHTML = '<div class="hint">Aucun résultat. Essaie une autre orthographe, ou le titre seul.</div>'; return; }
        out.innerHTML = '';
        for (const r of list) {
          const row = document.createElement('div'); row.className = 'result';
          const kind = r.syncedLyrics ? ['sync', 'synchronisé'] : r.plainLyrics ? ['txt', 'texte seul'] : ['none', 'instrumental'];
          row.innerHTML = `<div class="rMain"><b>${esc(r.trackName)}</b><span>${esc(r.artistName)}${r.duration ? ' · ' + fmtTime(r.duration, false) : ''}</span></div>
            <span class="badge ${kind[0]}">${kind[1]}</span>`;
          const pick = document.createElement('button');
          pick.textContent = pickLabel || 'Utiliser';
          pick.disabled = kind[0] === 'none';
          pick.onclick = () => onPick(r, pick);
          row.appendChild(pick);
          out.appendChild(row);
        }
      } catch (e) {
        if (e.name === 'AbortError') return;
        out.innerHTML = `<div class="hint err">Recherche impossible (${esc(e.message)}). Vérifie la connexion.</div>`;
      } finally { if (ctl === mine) btn.disabled = false; }
    };
    btn.onclick = go;
    input.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); go(); } };
  },

  /* ------------------------------------------------ YouTube (companion) --- */
  async companion() {
    try {
      const ctl = new AbortController(); setTimeout(() => ctl.abort(), 900);
      const r = await fetch(COMPANION + '/health', { signal: ctl.signal });
      const j = await r.json();
      return j && j.ok ? j : null;
    } catch (e) { return null; }
  },

  async mountYoutube(host) {
    const info = await this.companion();
    if (!info) {
      host.innerHTML = `<div class="hint">Pour récupérer l'audio d'une vidéo YouTube, lance <b>START-COMPANION.bat</b>
        (dossier de l'app), puis <a href="#" class="relink">réessaie</a>.</div>`;
      $('.relink', host).onclick = e => { e.preventDefault(); this.mountYoutube(host); };
      return;
    }
    if (!info.ytdlp) {
      host.innerHTML = `<div class="hint err">yt-dlp est introuvable. Dépose <b>yt-dlp.exe</b> (et <b>ffmpeg.exe</b>) dans ce dossier, puis <a href="#" class="relink">réessaie</a> :</div>
        <div class="hint" style="user-select:text;word-break:break-all">${esc(info.binDir || 'companion\bin')}</div>`;
      $('.relink', host).onclick = e => { e.preventDefault(); this.mountYoutube(host); };
      return;
    }
    host.innerHTML = `
      <div class="searchRow"><input type="search" placeholder="lien YouTube, ou recherche">
        <button class="pri">OK</button></div>
      <div class="results"></div>`;
    const input = $('input', host), btn = $('button', host), out = $('.results', host);
    const fetchAudio = async (id, title, b) => {
      const docGen = S.docGen;                      // si un autre morceau s'ouvre entre-temps, on ne l'écrase pas
      b.disabled = true; const old = b.textContent; b.textContent = '…';
      out.insertAdjacentHTML('afterbegin', '<div class="hint dl">Téléchargement de l\'audio… (peut prendre une minute)</div>');
      try {
        const r = await fetch(COMPANION + '/download?id=' + encodeURIComponent(id));
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.status);
        const blob = await r.blob();
        if (S.docGen !== docGen) { toast('Audio YouTube ignoré : un autre morceau a été ouvert entre-temps', true); return; }
        await loadAudio(new File([blob], (title || id).replace(/[\\/:*?"<>|]+/g, '_') + '.mp3', { type: 'audio/mpeg' }));
        if (!S.song.title) Object.assign(S.song, guessSongInfo(title || ''));
        updateSaveState();
      } catch (e) { toast('Téléchargement impossible : ' + e.message, true); }
      finally { b.disabled = false; b.textContent = old; const dl = $('.dl', out); if (dl) dl.remove(); }
    };
    const go = async () => {
      const q = input.value.trim(); if (!q) return;
      const id = (q.match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([\w-]{11})/) || [])[1] || (/^[\w-]{11}$/.test(q) ? q : null);
      if (id) { fetchAudio(id, '', btn); return; }
      btn.disabled = true; out.innerHTML = '<div class="hint">Recherche…</div>';
      try {
        const r = await fetch(COMPANION + '/search?q=' + encodeURIComponent(q) + '&n=6');
        const list = await r.json();
        if (!r.ok) throw new Error(list.error || r.status);
        out.innerHTML = list.length ? '' : '<div class="hint">Aucun résultat.</div>';
        for (const it of list) {
          const row = document.createElement('div'); row.className = 'result';
          row.innerHTML = `<div class="rMain"><b>${esc(it.title)}</b><span>${esc(it.channel)}${it.duration ? ' · ' + fmtTime(it.duration, false) : ''}</span></div>`;
          const b = document.createElement('button'); b.textContent = 'Audio';
          b.onclick = () => fetchAudio(it.id, it.title, b);
          row.appendChild(b); out.appendChild(row);
        }
      } catch (e) { out.innerHTML = `<div class="hint err">${esc(e.message)}</div>`; }
      finally { btn.disabled = false; }
    };
    btn.onclick = go;
    input.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); go(); } };
  }
};

/** Étape 2 : les paroles trouvées remplacent celles du projet. */
async function useLrclibInEditor(rec) {
  const lang = $('#selLang').value;
  const d = Online.toDoc(rec, lang);
  if (!d.lines.length) { toast('Ce résultat ne contient pas de paroles', true); return; }
  const timed = allSyls().filter(o => o.s.t0 != null).length;
  if (timed && !(await modal({
    title: 'Remplacer les paroles ?',
    body: `<div class="hint big">Les paroles actuelles et leurs <b>${timed} syllabes calées</b> seront remplacées. <b>Ctrl+Z</b> reste possible.</div>`,
    ok: 'Remplacer'
  }))) return;
  Undo.snap('paroles en ligne');
  S.lines = d.lines;
  $('#lyricsText').value = d.lyrics;
  Doc.lyricsDirty = false;
  if (!S.song.title) S.song.title = d.title;
  if (!S.song.artist) S.song.artist = d.artist;
  selReset(0, 0); S.tapIdx = 0;
  S.dirtyLayout = true; S.dirtyMask = true; Mask.li = -1;
  refreshDuration(); renderSylList(); TL.invalidate(); requestRender(); Doc.touch(); docChanged();
  if (d.timing === 'lignes') {
    toast(`${d.lines.length} lignes avec leurs débuts — ${S.buffer ? '« ♫ Poser sur les attaques » affine les syllabes' : 'charge l\'audio pour les affiner'}`);
    if (S.buffer && S.duration && d.duration && Math.abs(S.duration - d.duration) > 3)
      toast(`Attention : cette version dure ${fmtTime(d.duration, false)}, ton audio ${fmtTime(S.duration, false)} — les timings risquent d'être décalés`, true);
  } else toast(`${d.lines.length} lignes de texte — à caler en écoutant`);
}
