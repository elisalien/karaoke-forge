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
