/* ================================================================== AIDE === */
const K = s => `<span class="kbd">${s}</span>`;

function helpSections() {
  const TK = tapKeyLabel();
  return [
    ['DÉMARRAGE', [['p',
      `Trois espaces de travail, en haut à gauche : ${K('① PRÉPARER')} ${K('② STYLE')} ${K('③ LIVE')} — ou ${K('Alt')}+${K('1')} ${K('2')} ${K('3')}.`
    ], ['t', [
      ['① AUDIO', 'Dépose ton fichier, ou récupère-le depuis YouTube via le companion'],
      ['② PAROLES', 'Colle le texte ou cherche-le en ligne, puis découpe en syllabes'],
      ['③ CALAGE', 'Tu écoutes et tu frappes une touche sur chaque syllabe'],
      ['④ AJUSTER', 'Tu peaufines à la souris et au clavier'],
      ['⑤ RANGER', 'Ctrl+S : le morceau part dans la bibliothèque, prêt pour le live']
    ]], ['p',
      `Le panneau de gauche est le parcours : l'étape utile s'ouvre d'elle-même, un clic sur un titre y revient. ` +
      `Tout est enregistré automatiquement dans le navigateur en cas de fermeture accidentelle.`]]],

    ['CALER LES PAROLES', [['p',
      `${K('◈ CALER EN ÉCOUTANT')} lance la lecture un peu avant le point de reprise et affiche en grand la syllabe à frapper.`
    ], ['t', [
      [K('T'), 'Démarrer / arrêter le calage'],
      ['la touche de calage', `Début de la syllabe — ${TK} actuellement, modifiable`],
      ['tenir la touche', 'Sur la dernière syllabe d\'une ligne : la note reste à l\'écran tant que tu tiens'],
      [K('Retour'), 'Annuler la dernière et reculer un peu'],
      [K('Échap'), 'Sortir du calage'],
      ['Reprendre à la sélection', 'Repartir d\'une syllabe précise']
    ]], ['p',
      `<b>Ralentis la musique</b> si le débit est rapide : ${K('0.25×')} ${K('0.5×')} ${K('0.75×')} ${K('1×')} en haut. ` +
      `<em>Les timings restent ceux du morceau à vitesse normale</em>, et la latence de la carte son est compensée. ` +
      `${K('J')} ralentit, ${K('L')} accélère, ${K('K')} met en pause.`]]],

    ['AFFINER SANS TOUT REFAIRE', [['t', [
      [K('↻ BOUCLER LA LIGNE') + ' ou ' + K('B'), 'Rejoue la ligne en boucle pendant que tu ajustes'],
      [K('Maj') + '+' + K('←') + K('→'), 'Décaler la sélection de 10 ms'],
      [K('Maj') + '+' + K('Alt') + '+ flèches', 'Décaler de 1 ms'],
      [K('I') + ' / ' + K('O'), 'Caler le début / la fin sur la tête de lecture'],
      [K('♫'), 'Aimanter la sélection sur le départ de note le plus proche'],
      [K('Ctrl') + '+' + K('Z'), 'Annuler · ' + K('Ctrl') + '+' + K('Maj') + '+' + K('Z') + ' rétablir']
    ]], ['p',
      `Une ligne entière à refaire ? Cale sa première et sa dernière syllabe — ou importe des paroles synchronisées — puis ` +
      `${K('♫ Poser sur les attaques')} place les autres sur les vrais départs de notes détectés dans l'audio, ` +
      `ou ${K('↔ Répartir régulièrement')} les étale. Instantané, 100 % local.`]]],

    ['TIMELINE — SOURIS', [['t', [
      ['Clic sur la règle ou l\'onde', 'Placer la tête de lecture (glisser pour la déplacer)'],
      ['Clic sur une syllabe', 'La sélectionner et s\'y placer — un clic ne déplace jamais rien'],
      ['Glisser le corps', 'Déplacer la syllabe et toute la sélection'],
      ['Glisser un bord', 'Changer le début ou la fin (le curseur devient ↔)'],
      ['Glisser une ligne (piste du milieu)', 'Déplacer toute la ligne d\'un bloc'],
      ['Glisser dans le vide', 'Lasso de sélection multiple'],
      [K('Ctrl') + '+ clic / ' + K('Maj') + '+ clic', 'Ajouter / retirer · sélectionner une plage'],
      ['Double-clic', 'Zoomer sur la ligne · sur la règle : tout voir'],
      ['Clic droit', 'Menu : effacer, couper, fusionner, aimanter…'],
      ['Molette', 'Zoom centré sur le curseur'],
      [K('Maj') + '+ molette · clic molette', 'Faire défiler'],
      [K('Alt') + ' pendant un glissé', 'Désactive l\'aimantation'],
      [K('Échap') + ' pendant un glissé', 'Rien ne bouge : le geste est annulé si la fenêtre perd la main']
    ]], ['p',
      `Une syllabe ne peut pas traverser sa voisine : les blocs s'arrêtent au contact. ` +
      `Le mode ${K('RIPPLE')} emmène tout ce qui suit.`]]],

    ['TIMELINE — CLAVIER', [['t', [
      [K('Espace'), 'Lecture / pause'],
      [K('←') + K('→') + ' / ' + K('↑') + K('↓'), 'Syllabe / ligne précédente ou suivante'],
      [K('V') + ' · ' + K('C'), 'Outil sélection · outil lame'],
      [K('S') + ' · ' + K('R'), 'Aimantation · ripple'],
      [K('+') + K('−') + ' · ' + K('F'), 'Zoom · tout voir (si F n\'est pas ta touche de calage)'],
      [K('Suppr') + ' · ' + K('Maj') + '+' + K('Suppr'), 'Effacer le timing · supprimer les syllabes'],
      [K('M') + ' · ' + K('Ctrl') + '+' + K('A'), 'Fusionner · sélectionner la ligne'],
      [K('Début') + ' / ' + K('Fin'), 'Début / fin du morceau']
    ]]]],

    ['PAROLES ET AUDIO EN LIGNE', [['p',
      `<b>Paroles</b> — étape ② → <em>chercher les paroles en ligne</em>. La base LRCLIB est gratuite ; seul le texte cherché part sur le réseau. ` +
      `Une version <em>synchronisée</em> arrive avec le début de chaque ligne : charge l'audio puis ${K('♫ Poser sur les attaques')}. ` +
      `Vérifie que la durée de la version trouvée correspond à ton audio.<br><br>` +
      `<b>Audio YouTube</b> — lance ${K('START-COMPANION.bat')} (dossier de l'app, Node.js requis), puis étape ① → <em>depuis YouTube</em>. ` +
      `Le companion utilise yt-dlp et n'écoute que ta machine.`]]],

    ['STYLE ET RYTHME', [['p',
      `Les <b>ambiances</b> changent tout d'un clic. ${K('SIMPLE')} montre l'essentiel, ${K('EXPERT')} ouvre tout. ` +
      `Double-clic sur la valeur d'un curseur : valeur par défaut.<br><br>` +
      `Onglet <b>RYTHME</b> : coche <em>Réagir au rythme</em>, puis donne le tempo — ${K('♫ DÉTECTER')} le cherche dans l'audio, ` +
      `${K('TAP')} (touche ${K('T')}) le frappe, ${K('÷2')} ${K('×2')} corrigent une erreur d'octave, ${K('CALER')} dit « le temps, c'est maintenant ». ` +
      `En source <em>MORCEAU</em>, la grille suit l'audio et se retrouve à l'identique à l'export.`]]],

    ['LIVE — LE SET', [['p',
      `La <b>bibliothèque</b> contient tout ce que tu as rangé avec ${K('Ctrl+S')}, audio compris, disponible hors ligne. ` +
      `Le <b>set</b> est la liste de la soirée : ${K('+ SET')} depuis la bibliothèque ou la recherche en ligne, ${K('↑')} ${K('↓')} pour l'ordre. ` +
      `Clic : charger · double-clic : charger et lancer.`
    ], ['t', [
      [K('Espace'), 'Lecture / pause'],
      [K('←') + ' / ' + K('→'), 'Début de ligne ou ligne précédente / ligne suivante'],
      [K('↑') + ' / ' + K('↓'), 'Paroles en avance / en retard de 100 ms'],
      [K('1') + '…' + K('9') + ' · ' + K('Entrée'), 'Charger le n° du set · morceau suivant'],
      [K('T') + ' · ' + K('N') + ' · ' + K('K'), 'Tap tempo · masquer le texte · fond vert'],
      [K('L') + ' · ' + K('X') + ' · ' + K('R'), 'Ligne par ligne · son extérieur · rythme'],
      [K('O'), 'Ouvrir l\'écran scène']
    ]], ['p',
      `<b>SON EXTÉRIEUR</b> : quand la musique vient des platines, les paroles se déroulent sur l'horloge de l'app. ` +
      `Lance-les sur la première ligne chantée, recale avec les flèches. <b>LIGNE PAR LIGNE</b> joue chaque ligne puis s'arrête : ` +
      `le filet de sécurité quand le DJ ne suit pas la version calée.`]]],

    ['ÉCRAN SCÈNE, RESOLUME, OBS', [['p',
      `${K('OUVRIR L\'ÉCRAN SCÈNE')} ouvre une fenêtre sans interface. Glisse-la sur le second écran, double-clic (ou ${K('F')}) pour le plein écran, ` +
      `le curseur disparaît tout seul. Pendant ce temps, l'aperçu de la fenêtre de contrôle se met en pause pour épargner le GPU.<br><br>` +
      `<b>Resolume</b> : source <em>Screen Capture</em> sur cette fenêtre, ou passe par OBS (capture de fenêtre → NDI / Spout). ` +
      `<b>Incrustation</b> : choisis le fond ${K('VERT')} ou ${K('BLEU')} puis un chroma key ; grille, vignette, grain et aberration sont coupés automatiquement, ` +
      `et reviennent sur ${K('AMBIANCE')}. Pour un vrai canal alpha hors live, exporte en séquence PNG.`]]],

    ['FICHIERS ET EXPORT', [['t', [
      [K('Ctrl') + '+' + K('S'), 'Enregistrer dans la bibliothèque'],
      [K('Ctrl') + '+' + K('Maj') + '+' + K('S'), 'Exporter le projet en fichier .kfj'],
      [K('Ctrl') + '+' + K('E'), 'Exporter la vidéo'],
      ['.ass / .ssa', 'Timings {\\k} lus et écrits au centième de seconde'],
      ['.lrc', 'Classique et enrichi, refrains multiples et [offset:] compris'],
      ['.kfj', 'Le projet : paroles, timings et réglages (sans l\'audio)']
    ]], ['p',
      `L'export MP4 encode image par image : aucune image perdue. Pour un canal alpha, séquence PNG et <em>DÉCOR → FOND → Transparent</em>. ` +
      `Glisse n'importe quel fichier dans la fenêtre : audio, paroles .txt, timings, projet ou police.`]]],

    ['PERFORMANCE', [['p',
      `Le compteur en haut à droite de l'aperçu indique les particules vivantes. Si ça rame : baisse <em>Qualité aperçu</em> (DÉCOR → RENDU) ou <em>Max particules</em>. ` +
      `L'export reste toujours en pleine résolution. En live, n'affiche l'aperçu que si le GPU le permet.`]]],

    ['PARAMÈTRES', [['p',
      `Active <em>MODE SURVOL</em> en haut de cette fenêtre : une barre en bas de l'écran explique chaque curseur, bouton et zone survolés.`]]]
  ];
}

function buildHelp() {
  const host = $('#helpBody');
  host.innerHTML = '';
  for (const [title, blocks] of helpSections()) {
    const sec = document.createElement('div'); sec.className = 'hsec';
    const h = document.createElement('h3'); h.textContent = title; sec.appendChild(h);
    for (const [kind, data] of blocks) {
      if (kind === 'p') { const p = document.createElement('p'); p.innerHTML = data; sec.appendChild(p); }
      else {
        const t = document.createElement('table');
        t.innerHTML = data.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join('');
        sec.appendChild(t);
      }
    }
    host.appendChild(sec);
  }
}

function openHelp(on) {
  const p = $('#helpPanel');
  const show = on === undefined ? !p.classList.contains('on') : on;
  if (show) buildHelp();
  p.classList.toggle('on', show);
}

function setHelpMode(on) {
  document.body.classList.toggle('helpmode', on);
  $('#helpBar').classList.toggle('on', on);
  $('#ckHelpMode').checked = on;
  setTimeout(() => { fitStage(); TL.resize(); }, 30);
}

function helpHover(e) {
  if (!document.body.classList.contains('helpmode')) return;
  const el = e.target.closest && e.target.closest('[data-help]');
  const span = $('#helpBar span');
  if (el) span.innerHTML = el.dataset.help;
  else span.innerHTML = "Survole n'importe quel élément pour savoir ce qu'il fait.";
}
