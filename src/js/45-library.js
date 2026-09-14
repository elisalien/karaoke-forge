/* ============================================================================
   KARAOKE FORGE — bibliothèque
   ----------------------------------------------------------------------------
   Les morceaux préparés vivent dans le navigateur (IndexedDB), audio compris :
   tout reste disponible hors ligne, prêt pour le live. Le set est une liste
   ordonnée d'identifiants. Seules les fiches légères restent en mémoire ;
   paroles et audio sont relus au moment d'ouvrir un morceau.
   ============================================================================ */
const Lib = {
  db: null, songs: [], setlist: [], ok: true, persisted: false,

  open() {
    if (this.db) return Promise.resolve(this.db);
    return new Promise((res, rej) => {
      const rq = indexedDB.open('karaoke-forge', 1);
      rq.onupgradeneeded = () => {
        const db = rq.result;
        if (!db.objectStoreNames.contains('songs')) db.createObjectStore('songs', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'k' });
      };
      rq.onsuccess = () => { this.db = rq.result; res(this.db); };
      rq.onerror = () => rej(rq.error);
    });
  },

  req(store, mode, make) {
    return this.open().then(db => new Promise((res, rej) => {
      const t = db.transaction(store, mode);
      const r = make(t.objectStore(store));
      t.oncomplete = () => res(r.result);
      t.onerror = t.onabort = () => rej(t.error || r.error);
    }));
  },

  async load() {
    try {
      const all = await this.req('songs', 'readonly', s => s.getAll());
      this.songs = all.map(songCard).sort((a, b) => b.updatedAt - a.updatedAt);
      const m = await this.req('meta', 'readonly', s => s.get('setlist'));
      this.setlist = ((m && m.ids) || []).filter(id => this.songs.some(x => x.id === id));
      this.ok = true;
    } catch (e) {
      console.warn('[bibliothèque]', e);
      this.ok = false;
    }
    this.changed();
  },

  get(id) { return this.req('songs', 'readonly', s => s.get(id)); },
  card(id) { return this.songs.find(x => x.id === id) || null; },

  async put(rec) {
    rec.updatedAt = Date.now();
    rec.createdAt = rec.createdAt || rec.updatedAt;
    await this.req('songs', 'readwrite', s => s.put(rec));
    if (!this.persisted && navigator.storage && navigator.storage.persist) {
      this.persisted = true;
      navigator.storage.persist().catch(() => { });     // évite que le navigateur fasse le ménage
    }
    await this.load();
    return rec;
  },

  async remove(id) {
    await this.req('songs', 'readwrite', s => s.delete(id));
    this.setlist = this.setlist.filter(x => x !== id);
    await this.saveSet();
    await this.load();
  },

  async saveSet() {
    await this.req('meta', 'readwrite', s => s.put({ k: 'setlist', ids: this.setlist }));
    this.changed();
  },
  addToSet(id) { if (!this.setlist.includes(id)) { this.setlist.push(id); this.saveSet(); } },
  removeFromSet(i) { this.setlist.splice(i, 1); this.saveSet(); },
  moveInSet(i, d) {
    const j = i + d; if (j < 0 || j >= this.setlist.length) return;
    [this.setlist[i], this.setlist[j]] = [this.setlist[j], this.setlist[i]];
    this.saveSet();
  },

  changed() { if (typeof Live !== 'undefined') Live.renderLibrary(); }
};

const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/** Fiche légère affichée dans les listes. */
function songCard(r) {
  const syls = (r.lines || []).reduce((a, L) => a + L.syls.length, 0);
  const timed = (r.lines || []).reduce((a, L) => a + L.syls.filter(s => s.t0 != null).length, 0);
  return {
    id: r.id, title: r.title || 'Sans titre', artist: r.artist || '', updatedAt: r.updatedAt || 0,
    hasAudio: !!r.audio, duration: r.duration || null, nLines: (r.lines || []).length,
    timing: !syls ? 'vide' : timed === 0 ? 'texte' : r.timing === 'lignes' ? 'lignes' : timed < syls ? 'partiel' : 'syllabes',
    source: r.source || 'forge'
  };
}
const TIMING_LABEL = { syllabes: 'calé', lignes: 'lignes', partiel: 'partiel', texte: 'texte seul', vide: 'vide' };

/** « Artiste - Titre.mp3 » → { artist, title } */
function guessSongInfo(fileName) {
  const base = (fileName || '').replace(/\.[^.]+$/, '').replace(/_/g, ' ').trim();
  const m = base.match(/^(.+?)\s+[-–—]\s+(.+)$/);
  return m ? { artist: m[1].trim(), title: m[2].trim() } : { artist: '', title: base };
}

/** Demande titre et artiste. */
async function askSongInfo() {
  const g = guessSongInfo(S.audioName);
  const title = S.song.title || g.title, artist = S.song.artist || g.artist;
  const ok = await modal({
    title: 'ENREGISTRER DANS LA BIBLIOTHÈQUE',
    body: `<div class="row wide"><label>Titre</label><input type="text" id="siTitle" value="${esc(title)}"></div>
      <div class="row wide"><label>Artiste</label><input type="text" id="siArtist" value="${esc(artist)}"></div>
      <div class="hint">${S.audioBlob ? 'L\'audio est rangé avec les paroles : le morceau sera jouable hors ligne.' : 'Sans audio : le morceau se jouera en live sur l\'horloge, son externe.'}</div>`,
    ok: 'ENREGISTRER',
    validate: () => { if (!$('#siTitle').value.trim()) { $('#siTitle').focus(); return false; } return true; }
  });
  if (!ok) return false;
  S.song.title = $('#siTitle').value.trim();
  S.song.artist = $('#siArtist').value.trim();
  return true;
}

/** Ctrl+S : range le morceau ouvert (paroles, timings, style, audio). */
async function saveToLibrary(forceAsk, asNew) {
  if (Lib.saving) return false;                    // double-clic, Ctrl+S tenu
  if (!S.lines.some(L => L.syls.length)) { toast('Rien à enregistrer : pas encore de paroles', true); return false; }
  if (!Lib.ok) { toast('Bibliothèque indisponible ici — exporte en .kfj (menu FICHIER)', true); return false; }
  Lib.saving = true;
  try {
    if (forceAsk || !S.song.title) { if (!(await askSongInfo())) return false; }
    const id = asNew ? null : S.song.id;           // « comme nouveau » ne détache qu'une fois confirmé
    const prev = id ? await Lib.get(id) : null;
    const custom = P.fontFamily === '__custom__';
    const rec = {
      ...(prev || {}),
      id: id || newId(),
      title: S.song.title, artist: S.song.artist,
      lines: cleanLines(S.lines), lyrics: $('#lyricsText').value, lang: $('#selLang').value,
      params: { ...P },
      font: custom ? (S.customFont || (prev && prev.font) || null) : null,
      audio: S.audioBlob || (S.audioRemoved ? null : (prev && prev.audio)) || null,
      audioName: S.audioBlob ? S.audioName : (S.audioRemoved ? '' : (prev && prev.audioName) || ''),
      duration: S.buffer ? S.buffer.duration : (prev && prev.duration) || null,
      source: (prev && prev.source) || 'forge'
    };
    if (prev && prev.timing === 'lignes' && allSyls().some(o => o.s.t0 != null)) rec.timing = prev.timing;
    if (asNew) { delete rec.createdAt; }
    await Lib.put(rec);
    S.song.id = rec.id;
    Doc.clean(); Doc.autosave();
    toast(`« ${rec.title} » enregistré dans la bibliothèque`);
    return true;
  } catch (e) {
    console.error(e);
    toast('Enregistrement impossible : ' + (e.message || e) + ' — exporte en .kfj', true);
    return false;
  } finally { Lib.saving = false; }
}

/** Ouvre un morceau de la bibliothèque. `keepStyle` garde l'ambiance en cours.
    Deux ouvertures rapprochées (touches 1 puis 2) : seule la dernière aboutit. */
async function openSong(id, opts = {}) {
  const gen = Lib.openGen = (Lib.openGen || 0) + 1;
  const rec = await Lib.get(id).catch(() => null);
  if (gen !== Lib.openGen) return false;
  if (!rec) { toast('Morceau introuvable', true); return false; }
  if (!opts.force && !(await confirmDiscard(`Ouvrir « ${rec.title} »`))) return false;
  if (gen !== Lib.openGen) return false;
  if (S.playing) pause();                          // l'horloge s'arrête avant que le document change
  setDocument({ ...rec, params: opts.keepStyle ? null : rec.params, font: opts.keepStyle ? null : rec.font });
  stop();
  if (rec.audio) {
    try { await loadAudio(new File([rec.audio], rec.audioName || 'audio', { type: rec.audio.type })); }
    catch (e) { toast('Audio du morceau illisible : ' + e.message, true); }
    if (gen !== Lib.openGen) return false;
  } else if (S.buffer || S.audioBlob) { unloadAudio(); S.audioRemoved = false; }
  Doc.clean();
  Steps.refresh();
  return true;
}

/** Range directement un morceau venu d'ailleurs (recherche en ligne). */
async function addSongRecord(d) {
  const rec = { id: newId(), title: d.title || 'Sans titre', artist: d.artist || '', lines: cleanLines(d.lines || []),
    lyrics: d.lyrics || '', lang: d.lang || 'fr', params: null, audio: null, audioName: '',
    duration: d.duration || null, source: d.source || 'import', timing: d.timing };
  await Lib.put(rec);
  return rec;
}
