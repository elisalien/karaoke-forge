/* ================================================================== AIDE === */
const K = s => `<span class="kbd">${s}</span>`;

/* La table des raccourcis, par espace de travail. C'est elle qui nourrit
   l'aide (F1) : ce qui est écrit ici est ce que le clavier fait.           */
function keyMap() {
  const TK = tapKeyLabel();
  return {
    all: [
      [K('Alt') + '+' + K('1') + ' ' + K('2') + ' ' + K('3'), 'Préparer · Style · Live'],
      [K('Espace'), 'Lecture / pause'],
      [K('Ctrl') + '+' + K('S'), 'Enregistrer dans la bibliothèque (pas en Live)'],
      [K('Ctrl') + '+' + K('Maj') + '+' + K('S'), 'Exporter le projet en fichier .kfj'],
      [K('Ctrl') + '+' + K('E'), 'Exporter la vidéo'],
      [K('F1') + ' · ' + K('?'), 'Cette aide'],
      [K('Échap'), 'Fermer, annuler le geste en cours, désélectionner']
    ],
    prep: [
      [K('Ctrl') + '+' + K('Z') + ' / ' + K('Ctrl') + '+' + K('Maj') + '+' + K('Z'), 'Annuler / rétablir (timings et paroles)'],
      [K('T'), 'Entrer / sortir du calage'],
      [K(TK), 'Pendant le calage : poser une syllabe (tenir = note longue)'],
      [K('Retour arrière'), 'Pendant le calage : annuler la dernière frappe · sinon effacer le timing sélectionné'],
      [K('J') + ' · ' + K('K') + ' · ' + K('L'), 'Ralentir · pause · accélérer'],
      [K('←') + K('→') + ' / ' + K('↑') + K('↓'), 'Syllabe / ligne précédente ou suivante'],
      [K('Maj') + '+' + K('←') + K('→'), 'Décaler la sélection de 10 ms (' + K('Alt') + ' en plus : 1 ms)'],
      [K('I') + ' / ' + K('O'), 'Début / fin de la syllabe sur la tête de lecture'],
      [K('M'), 'Fusionner les syllabes sélectionnées'],
      [K('Suppr') + ' / ' + K('Maj') + '+' + K('Suppr'), 'Effacer le timing / supprimer les syllabes'],
      [K('Ctrl') + '+' + K('A'), 'Sélectionner la ligne, une seconde fois tout le morceau'],
      [K('B'), 'Boucler la ligne'],
      [K('V') + ' · ' + K('C'), 'Outil sélection · outil lame'],
      [K('S') + ' · ' + K('R'), 'Aimant · décaler la suite'],
      [K('+') + ' ' + K('−') + ' · ' + K('F'), 'Zoom · tout voir' + (TK === 'F' ? ' (F est ta touche de calage : passe par le bouton)' : '')],
      [K('Début') + ' / ' + K('Fin'), 'Début / fin du morceau']
    ],
    style: [
      [K('Ctrl') + '+' + K('Z') + ' / ' + K('Ctrl') + '+' + K('Maj') + '+' + K('Z'), 'Annuler / rétablir un réglage ou une ambiance'],
      [K('T'), 'Tap tempo'],
      [K('J') + ' · ' + K('K') + ' · ' + K('L'), 'Ralentir · pause · accélérer'],
      [K('↑') + K('↓'), 'Ligne précédente / suivante (pour juger le rendu)'],
      [K('←') + K('→'), 'Reculer / avancer de 2 s'],
      [K('+') + ' ' + K('−') + ' · ' + K('F'), 'Zoom de la timeline · tout voir']
    ],
    live: [
      [K('←') + ' / ' + K('→'), 'Début de ligne ou ligne précédente / ligne suivante'],
      [K('↑') + ' / ' + K('↓'), 'Paroles en avance / en retard de 100 ms'],
      [K('1') + '…' + K('9'), 'Charger le morceau n° du set'],
      [K('Entrée') + ' / ' + K('Maj') + '+' + K('Entrée'), 'Morceau suivant / précédent du set'],
      [K('Début'), 'Première ligne'],
      [K('T'), 'Tap tempo'],
      [K('N'), 'Masquer / réafficher le texte'],
      [K('K'), 'Fond vert / ambiance'],
      [K('L') + ' · ' + K('X') + ' · ' + K('R'), 'Ligne par ligne · son extérieur · réaction au rythme'],
      [K('O'), 'Ouvrir l\'écran scène']
    ]
  };
}

function helpSections() {
  const KM = keyMap();
  return [
    ['Démarrage', [['p',
      `Trois espaces de travail, en haut à gauche : <b>Préparer</b>, <b>Style</b>, <b>Live</b> — ou ${K('Alt')}+${K('1')} ${K('2')} ${K('3')}.`
    ], ['t', [
      ['1 · Audio', 'Dépose ton fichier, ou récupère-le depuis YouTube via le companion'],
      ['2 · Paroles', 'Colle le texte ou cherche-le en ligne, puis découpe en syllabes'],
      ['3 · Calage', 'Tu écoutes et tu frappes une touche sur chaque syllabe'],
      ['4 · Ajuster', 'Tu peaufines à la souris et au clavier'],
      ['5 · Ranger', 'Ctrl+S : le morceau part dans la bibliothèque, prêt pour le live']
    ]], ['p',
      `Le panneau de gauche est le parcours : l'étape utile s'ouvre d'elle-même, un clic sur un titre y revient. ` +
      `Tout est enregistré automatiquement en cas de fermeture accidentelle.`]]],

    ['Caler les paroles', [['p',
      `<b>Caler en écoutant</b> lance la lecture un peu avant le point de reprise et affiche en grand la syllabe à frapper.`
    ], ['t', [
      ['Frapper', `Début de la syllabe — touche ${K(tapKeyLabel())}, modifiable à côté du bouton`],
      ['Tenir la touche', 'Sur la dernière syllabe d\'une ligne : la note reste à l\'écran tant que tu tiens'],
      [K('Retour arrière') + ' · ' + K('Ctrl') + '+' + K('Z'), 'Annuler la dernière frappe et reculer un peu'],
      [K('Échap'), 'Sortir du calage'],
      ['Reprendre à la syllabe choisie', 'Repartir d\'une syllabe précise']
    ]], ['p',
      `<b>Ralentis la musique</b> si le débit est rapide : ${K('0.25×')} ${K('0.5×')} ${K('0.75×')} ${K('1×')} en haut. ` +
      `<em>Les timings restent ceux du morceau à vitesse normale</em>, et la latence de la carte son est compensée.`]]],

    ['Affiner sans tout refaire', [['t', [
      ['Boucle (' + K('B') + ')', 'Rejoue la ligne en boucle pendant que tu ajustes'],
      [K('Maj') + '+' + K('←') + K('→'), 'Décaler la sélection de 10 ms — tenir la touche ne fait qu\'une étape d\'annulation'],
      [K('I') + ' / ' + K('O'), 'Caler le début / la fin sur la tête de lecture'],
      ['Sur l\'attaque', 'Aimanter la sélection sur le départ de note le plus proche'],
      [K('Ctrl') + '+' + K('Z'), 'Annuler — la sélection reste en place pour recommencer autrement']
    ]], ['p',
      `Une ligne entière à refaire ? Cale sa première et sa dernière syllabe — ou importe des paroles synchronisées — puis ` +
      `<b>Poser sur les attaques</b> place les autres sur les vrais départs de notes détectés dans l'audio, ` +
      `ou <b>Répartir régulièrement</b> les étale. Instantané, 100 % local.`]]],

    ['Timeline — souris', [['t', [
      ['Clic sur la règle ou l\'onde', 'Placer la tête de lecture (glisser pour la déplacer)'],
      ['Clic sur une syllabe', 'La sélectionner et s\'y placer — un clic ne déplace jamais rien'],
      ['Glisser le corps', 'Déplacer la syllabe et toute la sélection ; l\'infobulle suit le temps et l\'écart'],
      ['Glisser un bord', 'Changer le début ou la fin (le curseur devient ↔)'],
      ['Glisser une ligne (piste du milieu)', 'Déplacer toute la ligne d\'un bloc'],
      ['Glisser dans le vide', 'Lasso de sélection — ' + K('Alt') + ' retire de la sélection'],
      [K('Ctrl') + '+ clic / ' + K('Maj') + '+ clic', 'Ajouter / retirer · sélectionner une plage'],
      ['Double-clic', 'Zoomer sur la ligne · sur la règle : tout voir'],
      ['Clic droit', 'Menu : effacer, couper, fusionner, aimanter…'],
      ['Molette', 'Zoom centré sur le curseur'],
      [K('Maj') + '+ molette · clic molette', 'Faire défiler (met le suivi en pause pendant la lecture)'],
      [K('Alt') + ' pendant un glissé', 'Désactive l\'aimantation'],
      [K('Échap') + ' pendant un glissé', 'Annule le geste : rien ne bouge']
    ]], ['p',
      `Une syllabe ne peut pas traverser sa voisine : les blocs s'arrêtent au contact. ` +
      `<b>Décaler la suite</b> emmène tout ce qui suit. Les petits traits sous la règle sont les attaques détectées dans l'audio : l'aimant s'y accroche aussi.`]]],

    ['Raccourcis — partout', [['t', KM.all]]],
    ['Raccourcis — Préparer', [['t', KM.prep]]],
    ['Raccourcis — Style', [['t', KM.style]]],
    ['Raccourcis — Live', [['t', KM.live]]],

    ['Paroles et audio en ligne', [['p',
      `<b>Paroles</b> — étape 2 → <em>Chercher les paroles en ligne</em>. La base LRCLIB est gratuite ; seul le texte cherché part sur le réseau. ` +
      `Une version <em>synchronisée</em> arrive avec le début de chaque ligne : charge l'audio puis <b>Poser sur les attaques</b>. ` +
      `Vérifie que la durée de la version trouvée correspond à ton audio.<br><br>` +
      `<b>Audio YouTube</b> — dans l'application de bureau, le companion est déjà lancé ; dépose <em>yt-dlp.exe</em> et <em>ffmpeg.exe</em> dans son dossier <em>bin</em> ` +
      `(indiqué à l'étape 1 → <em>Depuis YouTube</em>). En navigateur, lance ${K('START-COMPANION.bat')}.`]]],

    ['Style et rythme', [['p',
      `Les <b>ambiances</b> changent tout d'un clic. <b>Simple</b> montre l'essentiel, <b>Expert</b> ouvre tout ; les réglages sans objet se cachent d'eux-mêmes. ` +
      `Double-clic sur la valeur d'un curseur : valeur par défaut. ${K('Ctrl')}+${K('Z')} annule un réglage ou une ambiance.<br><br>` +
      `Onglet <b>Rythme</b> : coche <em>Réagir au rythme</em>, puis donne le tempo — <b>Détecter dans l'audio</b> le cherche, ` +
      `<b>Tap</b> (touche ${K('T')}) le frappe, ${K('÷2')} ${K('×2')} corrigent une erreur d'octave, <b>Caler</b> dit « le temps, c'est maintenant ». ` +
      `En source <em>Morceau</em>, la grille suit l'audio et se retrouve à l'identique à l'export.`]]],

    ['Live — le set', [['p',
      `La <b>bibliothèque</b> contient tout ce que tu as rangé avec ${K('Ctrl+S')}, audio compris, disponible hors ligne. ` +
      `Le <b>set</b> est la liste de la soirée : <b>+ Set</b> depuis la bibliothèque ou la recherche en ligne, ${K('↑')} ${K('↓')} pour l'ordre. ` +
      `Clic : charger · double-clic : charger et lancer.<br><br>` +
      `En Live, l'en-tête se vide : rien ne s'enregistre, rien ne s'exporte, ${K('Ctrl')}+${K('Z')} est neutre. Une fausse manip pendant le show ne touche à aucun morceau.`
    ], ['p',
      `<b>Son extérieur</b> : quand la musique vient des platines, les paroles se déroulent sur l'horloge de l'app. ` +
      `Lance-les sur la première ligne chantée, recale avec les flèches — ce recalage de soirée n'est pas enregistré dans le morceau. <b>Ligne par ligne</b> joue chaque ligne puis s'arrête : ` +
      `le filet de sécurité quand le DJ ne suit pas la version calée.`]]],

    ['Écran scène, Resolume, OBS', [['p',
      `<b>Ouvrir l'écran scène</b> ouvre une fenêtre sans interface. Glisse-la sur le second écran, double-clic (ou ${K('F')}) pour le plein écran, ` +
      `le curseur disparaît tout seul. Pendant ce temps, l'aperçu de la fenêtre de contrôle se met en pause pour épargner le GPU.<br><br>` +
      `<b>Resolume</b> : source <em>Screen Capture</em> sur cette fenêtre, ou passe par OBS (capture de fenêtre → NDI / Spout). ` +
      `<b>Incrustation</b> : choisis le fond <b>Vert</b> ou <b>Bleu</b> puis un chroma key ; grille, vignette, grain et aberration sont coupés automatiquement, ` +
      `et reviennent sur <b>Ambiance</b>. Pour un vrai canal alpha hors live, exporte en séquence PNG.`]]],

    ['Fichiers et export', [['t', [
      ['.ass / .ssa', 'Timings {\\k} lus et écrits au centième de seconde'],
      ['.lrc', 'Classique et enrichi, refrains multiples et [offset:] compris'],
      ['.kfj', 'Le projet : paroles, timings et réglages (sans l\'audio)'],
      ['.ttf / .otf / .woff2', 'Une police, par le menu Fichier ou en la glissant dans la fenêtre']
    ]], ['p',
      `L'export MP4 encode image par image : aucune image perdue. Pour un canal alpha, séquence PNG et <em>Décor → Fond → Transparent</em>. ` +
      `Glisse n'importe quel fichier dans la fenêtre : audio, paroles .txt, timings, projet ou police.`]]],

    ['Performance', [['p',
      `En mode Expert, un compteur en haut à droite de l'aperçu indique les particules vivantes. Si ça rame : baisse <em>Qualité aperçu</em> (Décor → Rendu) ou <em>Max particules</em>. ` +
      `L'export reste toujours en pleine résolution. En live, n'affiche l'aperçu que si le GPU le permet.`]]],

    ['Mode survol', [['p',
      `Coche <em>Mode survol</em> en haut de cette fenêtre : une barre en bas de l'écran explique chaque curseur, bouton et zone survolés.`]]]
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
