/* ------------------------------------------------------------ import I/O --- */
/** Accepts `mm:ss.cc`, `mm:ss.mmm` and the ASS form `h:mm:ss.cc`. */
function parseTimeTag(str) {
  const m = String(str).match(/(?:(\d+):)?(\d+):(\d+)(?:[.,](\d+))?/);
  if (!m) return null;
  const h = m[1] ? +m[1] : 0;
  const frac = m[4] ? +('0.' + m[4]) : 0;
  return h * 3600 + (+m[2]) * 60 + (+m[3]) + frac;
}

function importAss(text, lang) {
  const lines = [];
  for (const raw of text.split(/\r?\n/)) {
    if (!/^Dialogue\s*:/i.test(raw)) continue;
    const parts = raw.slice(raw.indexOf(':') + 1).split(',');
    if (parts.length < 10) continue;
    const st = parseTimeTag(parts[1]), en = parseTimeTag(parts[2]);
    const body = parts.slice(9).join(',');
    if (st == null) continue;
    const syls = [];
    const re = /\{([^}]*)\}([^{]*)/g;
    let m, any = false, t = st;
    while ((m = re.exec(body))) {
      const k = m[1].match(/\\(?:k|kf|ko|K)(\d+)/);
      const txt = m[2].replace(/\\N/g, ' ');
      if (k) {
        any = true;
        const dur = +k[1] / 100;
        if (txt.length) syls.push({ t: txt, t0: t, t1: t + dur });
        t += dur;
      } else if (txt.length) syls.push({ t: txt, t0: t, t1: null });
    }
    if (!any) {
      const plain = body.replace(/\{[^}]*\}/g, '').replace(/\\N/g, ' ').trim();
      if (!plain) continue;
      const L = { raw: plain, syls: buildLines(plain, lang || $('#selLang').value)[0].syls };
      distributeInto(L, st, en != null ? en : st + 2);
      lines.push(L);
    } else {
      if (!syls.length) continue;
      // the \k durations are authoritative — `en` is only the display end
      lines.push({ raw: syls.map(s => s.t).join(''), syls });
    }
  }
  return lines;
}
function distributeInto(L, a, b) {
  const wsum = L.syls.reduce((s, x) => s + Math.max(1, x.t.trim().length), 0);
  let acc = a;
  L.syls.forEach(s => { s.t0 = acc; s.t1 = null; acc += (b - a) * Math.max(1, s.t.trim().length) / wsum; });
  L.syls[L.syls.length - 1].t1 = b;
}

/** Durée chantée plausible d'une ligne dont on ne connaît que le début. */
const estLineDur = L => clamp(L.syls.length * .26 + .45, 1, 8);

/** LRC classique ou enrichi. Gère les horodatages multiples d'une même
    ligne (refrains), la balise [offset:], et les lignes vides qui marquent
    la fin d'une phrase avant un silence.                                   */
function importLrc(text, lang) {
  lang = lang || $('#selLang').value;
  let offset = 0;
  const ev = [];                 // { t, text } — text vide = fin de phrase
  for (const raw of text.split(/\r?\n/)) {
    const off = raw.match(/^\s*\[offset:\s*([+-]?\d+)\s*\]/i);
    if (off) { offset = +off[1] / 1000; continue; }
    const head = raw.match(/^\s*((?:\[\d+:\d+(?:[.:]\d+)?\]\s*)+)(.*)$/);
    if (!head) continue;
    const stamps = head[1].match(/\[\d+:\d+(?:[.:]\d+)?\]/g).map(s => parseTimeTag(s.replace(/:(\d+)\]$/, '.$1]')));
    for (const t of stamps) if (t != null) ev.push({ t, text: head[2] });
  }
  ev.sort((a, b) => a.t - b.t);

  const out = [];
  ev.forEach((e, i) => {
    const rest = e.text;
    if (!rest.trim()) return;
    const t0 = e.t - offset;
    const next = ev[i + 1] ? ev[i + 1].t - offset : null;
    let L;
    if (/<\d+:\d+(?:[.:]\d+)?>/.test(rest)) {
      const syls = []; const re = /<(\d+:\d+(?:[.:]\d+)?)>([^<]*)/g; let m;
      while ((m = re.exec(rest))) { const tt = parseTimeTag(m[1]); if (m[2]) syls.push({ t: m[2], t0: tt != null ? tt - offset : null, t1: null }); }
      if (!syls.length) return;
      L = { raw: syls.map(s => s.t).join(''), syls };
      const last = syls[syls.length - 1];
      if (last.t0 != null) last.t1 = next != null ? Math.min(next - .05, last.t0 + 1.2) : last.t0 + .8;
    } else {
      L = { raw: rest.trim(), syls: buildLines(rest.trim(), lang)[0].syls };
      if (!L.syls.length) return;
      const end = next != null ? Math.min(next - .08, t0 + estLineDur(L)) : t0 + estLineDur(L);
      distributeInto(L, t0, Math.max(t0 + .3, end));
    }
    out.push(L);
  });
  return out;
}

function exportAss() {
  const H = `[Script Info]
Title: ${S.song.title || 'Karaoke Forge'}
ScriptType: v4.00+
PlayResX: ${S.W}
PlayResY: ${S.H}
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: KF,Arial,${Math.round(P.fontSize / 100 * S.H)},&H00FFFFFF,&H00FF2FD0,&H00000000,&H64000000,-1,0,0,0,100,100,0,0,1,3,0,5,40,40,40,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
  const at = t => { const h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), s = t % 60; return `${h}:${String(m).padStart(2, '0')}:${s.toFixed(2).padStart(5, '0')}`; };
  let body = '';
  for (const L of S.lines) {
    const sp = lineSpan(L); if (!sp) continue;
    let txt = '';
    L.syls.forEach((s, i) => {
      const e = sylEnd(L, i);
      const cs = s.t0 == null ? 0 : Math.max(0, Math.round(((e != null ? e : s.t0 + .2) - s.t0) * 100));
      txt += `{\\k${cs}}${s.t}`;
    });
    body += `Dialogue: 0,${at(sp[0])},${at(sp[1])},KF,,0,0,0,,${txt}\n`;
  }
  download(new Blob([H + body], { type: 'text/plain' }), baseName() + '.ass');
}
function exportLrc() {
  const at = t => { const m = Math.floor(t / 60), s = t % 60; return `${String(m).padStart(2, '0')}:${s.toFixed(2).padStart(5, '0')}`; };
  let out = `[ti:${S.song.title || baseName()}]\n` + (S.song.artist ? `[ar:${S.song.artist}]\n` : '') + `[re:Karaoke Forge]\n`;
  for (const L of S.lines) {
    const sp = lineSpan(L); if (!sp) continue;
    out += `[${at(sp[0])}]` + L.syls.map(s => (s.t0 != null ? `<${at(s.t0)}>` : '') + s.t).join('') + '\n';
  }
  download(new Blob([out], { type: 'text/plain' }), baseName() + '.lrc');
}

/** Nom de fichier du projet : titre du morceau, sinon nom de l'audio. */
function baseName() {
  const n = S.song.title ? (S.song.artist ? S.song.artist + ' - ' : '') + S.song.title
    : (S.audioName || 'karaoke').replace(/\.[^.]+$/, '');
  return n.replace(/[\\/:*?"<>|]+/g, '_').trim() || 'karaoke';
}

/* ------------------------------------------------------------- project I/O */
/** L'état complet du projet — utilisé par la sauvegarde ET l'autosauvegarde. */
function projectData() {
  return {
    kf: 2, audio: S.audioName, title: S.song.title, artist: S.song.artist, songId: S.song.id,
    params: { ...P }, tapKey: S.tapKey,
    lines: cleanLines(S.lines),
    lyrics: $('#lyricsText').value, lang: $('#selLang').value
  };
}

/** Remplace le document ouvert (paroles, timings, réglages éventuels). */
function setDocument(d) {
  if (d.params) {
    for (const k in d.params) if (k in P) P[k] = d.params[k];
    syncPanels(); resizeStage(); Particles.resize(P.parMax);
  }
  if (d.font && d.font.data) installFont(d.font.name, d.font.data).catch(() => toast('Police du morceau illisible', true));
  else if (P.fontFamily === '__custom__' && !S.customFont) {
    P.fontFamily = FONTS[1][0]; syncPanels();
    toast('Police personnalisée absente — Impact en attendant, recharge-la par ⋯ FICHIER', true);
  }
  S.lines = cleanLines(d.lines || []);
  $('#lyricsText').value = d.lyrics != null ? d.lyrics : S.lines.map(L => L.raw).join('\n');
  if (d.lang) $('#selLang').value = d.lang;
  if (d.tapKey) { S.tapKey = d.tapKey; $('#tapKey').value = d.tapKey; }
  S.song = { id: d.id || d.songId || null, title: d.title || '', artist: d.artist || '' };
  S.docGen++; S.audioRemoved = false;
  if (S.tapMode) setTap(false);
  selReset(0, 0); S.tapIdx = 0; S.loop = null; $('#bLoop').classList.remove('on');
  Undo.reset(); Doc.lyricsDirty = false;
  Particles.reset();
  S.dirtyLayout = true; S.dirtyMask = true; Mask.li = -1;
  refreshDuration();
  renderSylList(); TL.invalidate(); requestRender();
  if (Scene.isOpen()) Scene.sendDoc();      // tout de suite : la scène ne doit pas montrer l'ancien morceau
  Doc.clean();
}

function saveProjectFile() {
  const data = projectData();
  const timed = allSyls().filter(o => o.s.t0 != null).length;
  download(new Blob([JSON.stringify(data)], { type: 'application/json' }), baseName() + '.kfj');
  Doc.autosave();
  toast(`Projet exporté — ${S.lines.length} lignes, ${timed} syllabes calées`);
}
async function loadProject(txt, force) {
  const d = JSON.parse(txt);
  if (!force && !(await confirmDiscard('Ouvrir ce projet'))) { toast('Ouverture annulée'); return; }
  setDocument(d);
  toast(`Projet chargé — ${S.lines.length} lignes` + (d.audio && !S.buffer ? ` (audio attendu : ${d.audio})` : ''));
}

/** Avant de remplacer un travail non enregistré, on demande. */
async function confirmDiscard(what) {
  const timed = allSyls().filter(o => o.s.t0 != null).length;
  if (!Doc.linesDirty || !timed) return true;
  return modal({
    title: 'TRAVAIL NON ENREGISTRÉ',
    body: `<div class="hint big">${esc(what)} va remplacer <b>${timed} syllabes calées</b> qui ne sont pas dans la bibliothèque.<br><br>
      <b>Ctrl+S</b> les y range. Continuer quand même ?</div>`,
    ok: 'CONTINUER', cancel: 'ANNULER'
  });
}
