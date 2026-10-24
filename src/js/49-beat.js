/* ============================================================================
   KARAOKE FORGE — rythme
   ----------------------------------------------------------------------------
   Deux façons de compter les temps :
     · « morceau » : la grille suit l'horloge du morceau (BPM + calage). C'est
       ce qui sert en préparation et à l'export — image par image identique ;
     · « live » : TAP ou Ableton Link, ancrés sur l'horloge murale, quand la
       musique vient d'ailleurs.
   ============================================================================ */
const COMPANION = 'http://127.0.0.1:17002';

/** Horloge murale haute résolution, commune à toutes les fenêtres. */
function epochNow() { return performance.timeOrigin + performance.now(); }

function beatPos(t) {
  return Beat.live ? Beat.liveBeat() : (t - (P.beatOffset || 0) / 1000) * P.bpm / 60;
}
function beatPulse(t) {
  if (!P.beatOn) return 0;
  const b = beatPos(t);
  if (b < 0) return 0;
  return Math.exp(-(b - Math.floor(b)) * P.beatDecay);
}

const Beat = {
  src: 'song',                // song | tap | link
  bpm: 120, anchorEpoch: 0, anchorBeat: 0,
  taps: [],
  link: { want: false, es: null, companion: false, connected: false, peers: 0, retry: 0, wait: 2000 },

  get live() { return this.src !== 'song' && !S.exporting; },
  liveBeat() { return this.anchorBeat + (epochNow() - this.anchorEpoch) / 60000 * this.bpm; },
  tempo() { return this.src === 'song' ? P.bpm : this.bpm; },

  setSource(src) {
    if (src === this.src) return;
    if (src !== 'song') {
      // on reprend la grille là où elle en est, sans à-coup
      if (this.src === 'song') { this.bpm = P.bpm; this.anchorBeat = beatPos(now()); }
      else this.anchorBeat = this.liveBeat();
      this.anchorEpoch = epochNow();
    }
    this.src = src;
    this.connectLink(src === 'link');
    this.changed();
  },

  /** TAP : la moyenne des derniers intervalles donne le tempo, le dernier
      tap tombe sur un temps. Pendant la lecture de l'audio du morceau, la
      grille est calée sur le morceau lui-même (et resservira à l'export). */
  tap() {
    const t = epochNow();
    this.taps = this.taps.filter(x => t - x < 2500);
    this.taps.push(t);
    if (this.taps.length > 8) this.taps.shift();
    if (this.taps.length >= 2) {
      const iv = (this.taps[this.taps.length - 1] - this.taps[0]) / (this.taps.length - 1);
      const bpm = Math.round(clamp(60000 / iv, 40, 240) * 10) / 10;
      if (this.src === 'song' && S.ws !== 'live') {
        // hors live : le tempo tapé devient celui du morceau (aperçu = export)
        Undo.style.snap('tempo frappé', 'bpm');
        P.bpm = bpm;
        if (S.playing) {
          const period = 60 / bpm, tt = tapTime();
          P.beatOffset = Math.round((((tt % period) + period) % period) * 1000);
        }
        this.paramsChanged();
      } else {
        if (this.src === 'link') this.connectLink(false);
        this.src = 'tap';
        this.bpm = bpm;
      }
    }
    if (this.src !== 'song') { this.anchorBeat = 0; this.anchorEpoch = t; }
    this.changed(true);
  },

  setBpm(b) {
    b = Math.round(clamp(+b || 120, 40, 240) * 10) / 10;
    if (this.src === 'song') { Undo.style.snap('tempo', 'bpm'); P.bpm = b; this.paramsChanged(); }
    else { this.anchorBeat = this.liveBeat(); this.anchorEpoch = epochNow(); this.bpm = b; }
    this.changed();
  },
  scale(k) { this.setBpm(this.tempo() * k); },

  /** « Le temps, c'est maintenant » : recale la grille sans changer le tempo. */
  resync() {
    if (this.src === 'song') {
      const period = 60 / P.bpm, tt = now();
      Undo.style.snap('caler le temps');
      P.beatOffset = Math.round((((tt % period) + period) % period) * 1000);
      this.paramsChanged();
    } else { this.anchorBeat = Math.round(this.liveBeat()); this.anchorEpoch = epochNow(); }
    this.changed(true);
  },

  detect() {
    if (!S.buffer) { toast('Charge un audio pour détecter le tempo', true); return; }
    toast('Analyse du tempo…');
    setTimeout(() => {
      const r = Onsets.tempo();
      if (!r) { toast('Pas assez d\'attaques nettes pour trouver le tempo', true); return; }
      if (this.src !== 'song') this.setSource('song');
      Undo.style.snap('tempo détecté');
      P.bpm = Math.round(r.bpm * 10) / 10;
      P.beatOffset = Math.round(r.offset * 1000);
      this.paramsChanged(); this.changed();
      toast(`Tempo détecté : ${P.bpm} BPM` + (r.confidence < .12 ? ' — peu sûr, vérifie à l\'oreille' : ''));
    }, 30);
  },

  /* ------------------------- Ableton Link, relayé par le companion ------- */
  connectLink(on) {
    const L = this.link;
    L.want = on;
    clearTimeout(L.retry);
    if (!on) {
      if (L.es) { L.es.close(); L.es = null; }
      L.connected = false;
      return;
    }
    if (L.es) return;
    let es;
    try { es = new EventSource(COMPANION + '/link'); }
    catch (e) { L.retry = setTimeout(() => this.connectLink(L.want), L.wait); L.wait = Math.min(30000, L.wait * 2); return; }
    L.es = es;
    es.onopen = () => { L.companion = true; L.wait = 2000; this.changed(); };
    es.onmessage = ev => {
      let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      L.companion = true;
      L.connected = !!m.connected; L.peers = m.peers | 0;
      if (m.connected && this.src === 'link') {
        const at = epochNow() - (m.age || 0);
        const predicted = this.anchorBeat + (at - this.anchorEpoch) / 60000 * this.bpm;
        // on ne ré-ancre que si ça dérive vraiment : pas de tremblement
        if (Math.abs(m.tempo - this.bpm) > .01 || Math.abs(predicted - m.beat) > .05 || !this.anchorEpoch) {
          this.bpm = m.tempo; this.anchorBeat = m.beat; this.anchorEpoch = at;
        }
      }
      this.changed();
    };
    es.onerror = () => {
      es.close(); if (L.es === es) L.es = null;
      L.companion = false; L.connected = false;
      this.changed();
      // sans companion, on réessaie de moins en moins souvent (2 s → 30 s) : la console reste lisible
      if (L.want) { L.retry = setTimeout(() => this.connectLink(L.want), L.wait); L.wait = Math.min(30000, L.wait * 2); }
    };
  },

  paramsChanged() { syncPanels(); Doc.touch(); docChanged(); requestRender(); },
  changed(flash) {
    Scene.sendBeat();
    if (typeof Live !== 'undefined') Live.beatChanged(flash);
    requestRender();
  },
  state() { return { src: this.src, bpm: this.bpm, anchorEpoch: this.anchorEpoch, anchorBeat: this.anchorBeat }; },
  apply(st) { this.src = st.src; this.bpm = st.bpm; this.anchorEpoch = st.anchorEpoch; this.anchorBeat = st.anchorBeat; }
};
