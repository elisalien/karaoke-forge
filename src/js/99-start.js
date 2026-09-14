/* ============================================================================
   KARAOKE FORGE — démarrage
   Placé en toute fin de bundle : tous les modules sont évalués avant boot().
   Le même fichier sert la fenêtre de contrôle et, suivi de #scene, l'écran
   scène destiné à la capture vidéo.
   ============================================================================ */
function safeBoot() {
  try { Scene.isScene ? Scene.boot() : boot(); }
  catch (e) {
    console.error('[boot]', e);
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;inset:auto 16px 16px 16px;z-index:99999;padding:14px 18px;'
      + 'background:#180a14;border:1px solid #ff2fd0;border-radius:5px;color:#ffd6f6;'
      + 'font:12px/1.6 ui-monospace,Consolas,monospace;box-shadow:0 0 40px rgba(255,47,208,.4)';
    d.innerHTML = '<b>Le démarrage a échoué.</b><br>' + esc(String(e && e.message || e))
      + '<br><span style="color:#8fa0d8">Ouvre la console (F12) pour la trace complète.</span>';
    document.body.appendChild(d);
  }
}
if (document.readyState === 'loading') addEventListener('DOMContentLoaded', safeBoot);
else safeBoot();
