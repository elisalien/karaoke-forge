/* ============================================================================
   KARAOKE FORGE — petits outils d'interface
   ============================================================================ */

/** Échappe un texte venu de l'extérieur (fichier, recherche en ligne). */
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ------------------------------------------------------------ dialogues --- */
const Modal = { close: null };

/** Fenêtre modale : résout true (OK) ou false (Annuler, Échap). */
function modal({ title, body, ok = 'OK', cancel = 'ANNULER', onOpen, validate }) {
  return new Promise(resolve => {
    if (Modal.close) Modal.close();
    const m = $('#modal'), bOk = $('#mOk'), bCancel = $('#mCancel');
    $('#modalTitle').textContent = title;
    $('#modalBody').innerHTML = body;
    bOk.textContent = ok || ''; bOk.hidden = !ok; bOk.disabled = false;
    bCancel.textContent = cancel || ''; bCancel.hidden = !cancel;
    m.classList.add('on');
    const done = v => {
      m.classList.remove('on');
      bOk.onclick = bCancel.onclick = null;
      $('#modalBody').onkeydown = null;
      Modal.close = null;
      resolve(v);
    };
    bOk.onclick = () => { if (validate && !validate()) return; done(true); };
    bCancel.onclick = () => done(false);
    $('#modalBody').onkeydown = e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); bOk.click(); } };
    Modal.close = () => done(false);
    if (onOpen) onOpen($('#modalBody'));
    const first = $('#modalBody input, #modalBody select');
    if (first) setTimeout(() => { first.focus(); if (first.select) first.select(); }, 30);
  });
}

/* ------------------------------------------------------------- clavier --- */
/** Vrai quand l'utilisateur est en train d'ÉCRIRE : les raccourcis se taisent. */
function isTyping(el) {
  if (!el || !el.tagName) return false;
  if (el.isContentEditable || el.tagName === 'TEXTAREA') return true;
  return el.tagName === 'INPUT' && /^(text|search|number|url|email|password|)$/.test(el.type);
}

/* Après un clic souris, un bouton, une case ou un curseur ne gardent pas le
   focus : sinon Espace et les flèches continuent d'agir sur eux au lieu de
   piloter la lecture. La navigation au clavier (Tab) n'est pas touchée.   */
function bindFocusHygiene() {
  const SEL = 'button, input[type=range], input[type=checkbox], input[type=color], select';
  addEventListener('pointerup', () => setTimeout(() => {
    const a = document.activeElement;
    if (a && a !== document.body && a.matches('button, input[type=range], input[type=checkbox]')) a.blur();
  }, 0), true);
  addEventListener('change', e => { if (e.target.matches && e.target.matches(SEL)) e.target.blur(); }, true);
}

/* ------------------------------------------------------------- icônes --- */
/* Un seul jeu de pictos, trait fin, hérite de la couleur du texte. */
const ICONS = {
  mark: '<path d="M5 3l12 7-12 7z"/><rect x="18" y="4" width="2.5" height="12" rx="1"/>',
  play: '<path d="M7 4.5v15l12-7.5z"/>',
  pause: '<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="1.5"/>',
  prev: '<path d="M18 5v14L8 12z"/><rect x="5" y="5" width="2" height="14" rx="1"/>',
  next: '<path d="M6 5v14l10-7z"/><rect x="17" y="5" width="2" height="14" rx="1"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
  redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7"/><path d="M12 17h.01"/>',
  select: '<path d="M5 4l14 8-6 1.5L10 20z"/>',
  razor: '<path d="M4 20 20 4"/><path d="M4 20l4-1 1-4"/><path d="M14 10l4 4"/>',
  zoomIn: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/><path d="M11 8v6M8 11h6"/>',
  zoomOut: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/><path d="M8 11h6"/>',
  loop: '<path d="M17 4l3 3-3 3"/><path d="M4 11V9a2 2 0 0 1 2-2h14"/><path d="M7 20l-3-3 3-3"/><path d="M20 13v2a2 2 0 0 1-2 2H4"/>',
  magnet: '<path d="M6 4v7a6 6 0 0 0 12 0V4"/><path d="M6 4h4v7a2 2 0 0 0 4 0V4h4"/><path d="M6 8h4M14 8h4"/>',
  scene: '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/>'
};
const ICON_FILLED = new Set(['mark', 'play', 'pause', 'stop', 'prev', 'next']);
function icon(name) {
  const d = ICONS[name]; if (!d) return '';
  return `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"${ICON_FILLED.has(name) ? ' style="fill:currentColor;stroke:none"' : ''}>${d}</svg>`;
}
/** Pose le picto de chaque élément porteur de data-icon, devant son libellé. */
function applyIcons(root) {
  for (const el of $$('[data-icon]', root)) {
    if (el.querySelector('svg.ic')) continue;
    el.insertAdjacentHTML('afterbegin', icon(el.dataset.icon));
  }
}

/* ------------------------------------------------- préférences d'interface --- */
/* Ce qui ne concerne que l'écran (mode Simple/Expert, onglet ouvert, mode
   survol) : mémorisé dans le navigateur, jamais dans le morceau.           */
const UiPrefs = {
  KEY: 'kf.ui', cache: null,
  get() { if (!this.cache) { try { this.cache = JSON.parse(localStorage.getItem(this.KEY)) || {}; } catch (e) { this.cache = {}; } } return this.cache; },
  set(patch) { Object.assign(this.get(), patch); try { localStorage.setItem(this.KEY, JSON.stringify(this.cache)); } catch (e) { } }
};
