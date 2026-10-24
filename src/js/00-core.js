/* ============================================================================
   KARAOKE FORGE — core : utils, state, schema, UI generation
   ============================================================================ */
'use strict';

/* ---------------------------------------------------------------- utils --- */
const $  = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp  = (a, b, t) => a + (b - a) * t;
const TAU = Math.PI * 2;

/** deterministic PRNG (mulberry32) — identical preview & export */
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function fmtTime(t, ms) {
  if (!isFinite(t) || t < 0) t = 0;
  const m = Math.floor(t / 60), s = Math.floor(t % 60);
  const p = n => String(n).padStart(2, '0');
  return ms === false ? `${p(m)}:${p(s)}`
    : `${p(m)}:${p(s)}.${String(Math.floor((t % 1) * 1000)).padStart(3, '0')}`;
}

function hex2rgb(h) {
  h = (h || '#000').replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = parseInt(h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
const rgbCss = (c, a) => `rgba(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)},${a === undefined ? 1 : a})`;

function toast(msg, err) {
  const d = document.createElement('div');
  d.className = 'tst' + (err ? ' err' : '');
  d.textContent = msg;
  $('#toast').appendChild(d);
  setTimeout(() => { d.style.transition = '.35s'; d.style.opacity = '0'; setTimeout(() => d.remove(), 360); }, err ? 4200 : 2300);
}

function download(blob, name) {
  const u = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = u; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(u), 4000);
}

/* ------------------------------------------------------------ parameters --- */
/* Flat parameter store. Every key is declared once in SCHEMA below.           */
const P = {};
const PMETA = {};

const FONTS = [
  ['Helvetica Neue, Arial, sans-serif', 'Helvetica / Arial'],
  ['Impact, Haettenschweiler, sans-serif', 'Impact'],
  ['Arial Black, Arial, sans-serif', 'Arial Black'],
  ['Georgia, serif', 'Georgia'],
  ['Times New Roman, serif', 'Times'],
  ['Courier New, monospace', 'Courier'],
  ['Verdana, sans-serif', 'Verdana'],
  ['Trebuchet MS, sans-serif', 'Trebuchet'],
  ['Tahoma, sans-serif', 'Tahoma'],
  ['Segoe UI, system-ui, sans-serif', 'Segoe UI'],
  ['__custom__', '★ POLICE CHARGÉE']
];

const SCHEMA = {
  pgTxt: [
    ['Typographie', [
      ['fontFamily', 'Police', 'sel', FONTS, FONTS[1][0]],
      ['fontWeight', 'Graisse', 'sel', [['400', 'Regular'], ['500', 'Medium'], ['600', 'Semibold'], ['700', 'Bold'], ['800', 'Extrabold'], ['900', 'Black']], '900'],
      ['italic', 'Italique', 'chk', null, false],
      ['fontSize', 'Taille', 'rng', [2, 26, .1, '%H'], 9],
      ['letterSpacing', 'Interlettre', 'rng', [-.12, .5, .005, 'em'], .02],
      ['lineHeight', 'Interligne', 'rng', [.7, 3, .01, 'em'], 1.28],
      ['uppercase', 'Majuscules', 'chk', null, true]
    ]],
    ['Mise en page', [
      ['align', 'Alignement', 'sel', [['center', 'Centré'], ['left', 'Gauche'], ['right', 'Droite']], 'center'],
      ['posX', 'Position X', 'rng', [0, 100, .1, '%'], 50],
      ['posY', 'Position Y', 'rng', [0, 100, .1, '%'], 50],
      ['maxWidth', 'Largeur max', 'rng', [20, 100, .5, '%'], 84],
      ['linesBefore', 'Lignes avant', 'rng', [0, 3, 1, ''], 1],
      ['linesAfter', 'Lignes après', 'rng', [0, 3, 1, ''], 1],
      ['lineLead', 'Anticipation', 'rng', [0, 3, .05, 's'], .8],
      ['inactAlpha', 'Opacité inactive', 'rng', [0, 1, .01, ''], .3],
      ['inactScale', 'Échelle inactive', 'rng', [.4, 1.2, .01, '×'], .82],
      ['actScale', 'Échelle active', 'rng', [.5, 1.6, .01, '×'], 1]
    ]],
    ['Texte avant remplissage', [
      ['baseColor', 'Couleur', 'col', null, '#2b3a6b'],
      ['baseAlpha', 'Opacité', 'rng', [0, 1, .01, ''], .85],
      ['strokeW', 'Contour', 'rng', [0, 14, .1, 'px'], 0],
      ['strokeColor', 'Couleur du contour', 'col', null, '#31f6ff', () => P.strokeW > 0],
      ['shadowOn', 'Ombre portée', 'chk', null, false],
      ['shadowColor', 'Couleur de l\'ombre', 'col', null, '#000000', () => P.shadowOn],
      ['shadowBlur', 'Flou de l\'ombre', 'rng', [0, 60, .5, 'px'], 14, () => P.shadowOn],
      ['shadowY', 'Décalage vertical', 'rng', [-40, 40, .5, 'px'], 6, () => P.shadowOn]
    ]]
  ],

  pgFill: [
    ['Remplissage', [
      ['fillMode', 'Mode', 'sel', [['solid', 'Uni'], ['linear', 'Dégradé 2'], ['tri', 'Dégradé 3'], ['chrome', 'Chrome Y2K'], ['holo', 'Holographique'], ['hue', 'Teinte tournante']], 'chrome'],
      ['fillC1', 'Couleur 1', 'col', null, '#ffffff'],
      ['fillC2', 'Couleur 2', 'col', null, '#31f6ff', () => P.fillMode !== 'solid'],
      ['fillC3', 'Couleur 3', 'col', null, '#ff2fd0', () => ['tri', 'chrome', 'holo'].includes(P.fillMode)],
      ['fillAngle', 'Angle', 'rng', [0, 360, 1, '°'], 90, () => P.fillMode !== 'solid'],
      ['fillScale', 'Échelle', 'rng', [.1, 4, .01, '×'], 1, () => P.fillMode !== 'solid'],
      ['fillSpeed', 'Animation', 'rng', [-3, 3, .01, ''], .35, () => P.fillMode !== 'solid']
    ]],
    ['Progression', [
      ['fillEase', 'Courbe', 'sel', [['linear', 'Linéaire'], ['out', 'Décélérée'], ['in', 'Accélérée'], ['inout', 'Douce aux deux bouts'], ['step', 'Instantané']], 'linear'],
      ['fillLead', 'Avance', 'rng', [-300, 300, 1, 'ms'], 0],
      ['fillSoft', 'Bord doux', 'rng', [0, 80, .5, 'px'], 10]
    ]],
    ['Accent de syllabe', [
      ['popAmt', 'Grossissement', 'rng', [0, .6, .005, ''], .06],
      ['popDur', 'Durée du grossissement', 'rng', [40, 800, 5, 'ms'], 180, () => P.popAmt > 0],
      ['glowAmt', 'Halo du texte', 'rng', [0, 3, .01, ''], 1.1],
      ['glowColor', 'Couleur du halo', 'col', null, '#31f6ff', () => P.glowAmt > 0],
      ['fillStroke', 'Contour rempli', 'chk', null, true],
      ['fillStrokeC', 'Couleur du contour', 'col', null, '#ff2fd0', () => P.fillStroke],
      ['fillStrokeW', 'Épaisseur du contour', 'rng', [0, 14, .1, 'px'], 2.5, () => P.fillStroke]
    ]]
  ],

  pgPar: [
    ['Émetteur', [
      ['parOn', 'Activer', 'chk', null, true],
      ['parType', 'Type', 'sel', [['spark', 'Étincelles'], ['dust', 'Poussière'], ['pixel', 'Pixels Y2K'], ['bubble', 'Bulles Aero'], ['shard', 'Éclats'], ['star', 'Étoiles'], ['streak', 'Traînées'], ['petal', 'Pétales'], ['note', 'Notes ♪'], ['confetti', 'Confettis'], ['heart', 'Cœurs']], 'spark', () => P.parOn],
      ['parRate', 'Débit', 'rng', [0, 4000, 5, '/s'], 700, () => P.parOn],
      ['parBurst', 'Bouffée par syllabe', 'rng', [0, 400, 1, ''], 26, () => P.parOn],
      ['parBand', 'Bande d\'émission', 'rng', [1, 160, .5, 'px'], 22, () => P.parOn],
      ['parEmitFull', 'Toute la surface', 'chk', null, false, () => P.parOn],
      ['parMax', 'Max particules', 'rng', [200, 40000, 100, ''], 9000, () => P.parOn]
    ]],
    ['Physique', [
      ['parSpeed', 'Vitesse', 'rng', [0, 2200, 5, 'px/s'], 340, () => P.parOn],
      ['parSpeedRnd', 'Aléa vitesse', 'rng', [0, 1, .01, ''], .65, () => P.parOn],
      ['parDir', 'Direction', 'rng', [-180, 180, 1, '°'], -90, () => P.parOn],
      ['parSpread', 'Dispersion', 'rng', [0, 360, 1, '°'], 150, () => P.parOn],
      ['parGravity', 'Gravité', 'rng', [-3000, 3000, 5, ''], -180, () => P.parOn],
      ['parDrag', 'Friction', 'rng', [0, 8, .01, ''], 1.6, () => P.parOn],
      ['parTurb', 'Turbulence', 'rng', [0, 2000, 5, ''], 220, () => P.parOn],
      ['parTurbScale', 'Échelle turbulence', 'rng', [.2, 12, .05, ''], 2.4, () => P.parOn]
    ]],
    ['Aspect', [
      ['parSize', 'Taille', 'rng', [.5, 80, .1, 'px'], 5, () => P.parOn],
      ['parSizeRnd', 'Aléa taille', 'rng', [0, 1, .01, ''], .6, () => P.parOn],
      ['parGrow', 'Croissance', 'rng', [-1, 3, .01, ''], -.75, () => P.parOn],
      ['parLife', 'Durée de vie', 'rng', [.05, 8, .01, 's'], 1.1, () => P.parOn],
      ['parLifeRnd', 'Aléa durée', 'rng', [0, 1, .01, ''], .5, () => P.parOn],
      ['parSpin', 'Rotation', 'rng', [0, 25, .05, ''], 4, () => P.parOn],
      ['parStretch', 'Étirement', 'rng', [0, 6, .01, ''], 1.2, () => P.parOn],
      ['parColorMode', 'Couleur', 'sel', [['fill', 'Couleur du remplissage'], ['c1', 'Uni'], ['grad', 'Dégradé 1→2'], ['rand', 'Aléatoire 1/2']], 'fill', () => P.parOn],
      ['parC1', 'Couleur 1', 'col', null, '#ffffff', () => P.parOn && P.parColorMode !== 'fill'],
      ['parC2', 'Couleur 2', 'col', null, '#ff2fd0', () => P.parOn && (P.parColorMode === 'grad' || P.parColorMode === 'rand')],
      ['parAlpha', 'Opacité', 'rng', [0, 1, .01, ''], .9, () => P.parOn],
      ['parFadeIn', 'Fondu entrée', 'rng', [0, .6, .005, 's'], .04, () => P.parOn],
      ['parBlend', 'Fusion', 'sel', [['add', 'Additif'], ['normal', 'Normal']], 'add', () => P.parOn],
      ['parSeed', 'Graine', 'rng', [1, 9999, 1, ''], 1337, () => P.parOn]
    ]]
  ],

  pgFx: [
    ['Fond', [
      ['bgMode', 'Type', 'sel', [['solid', 'Uni'], ['grad', 'Dégradé'], ['alpha', 'Transparent (alpha)']], 'grad'],
      ['bgC1', 'Couleur 1', 'col', null, '#05030f', () => P.bgMode !== 'alpha'],
      ['bgC2', 'Couleur 2', 'col', null, '#1b0430', () => P.bgMode === 'grad'],
      ['bgAngle', 'Angle', 'rng', [0, 360, 1, '°'], 160, () => P.bgMode === 'grad'],
      ['gridOn', 'Grille rétro', 'chk', null, true],
      ['gridColor', 'Couleur de la grille', 'col', null, '#ff2fd0', () => P.gridOn],
      ['gridAlpha', 'Opacité grille', 'rng', [0, 1, .01, ''], .22, () => P.gridOn],
      ['gridSize', 'Densité', 'rng', [2, 60, .5, ''], 16, () => P.gridOn],
      ['gridSpeed', 'Défilement', 'rng', [-3, 3, .01, ''], .35, () => P.gridOn],
      ['gridHorizon', 'Horizon', 'rng', [.2, 1, .005, ''], .62, () => P.gridOn]
    ]],
    ['Bloom', [
      ['bloomOn', 'Activer', 'chk', null, true],
      ['bloomThr', 'Seuil', 'rng', [0, 1.2, .01, ''], .45, () => P.bloomOn],
      ['bloomInt', 'Intensité', 'rng', [0, 3, .01, ''], .95, () => P.bloomOn],
      ['bloomRad', 'Rayon', 'rng', [.4, 5, .05, ''], 1.6, () => P.bloomOn]
    ]],
    ['Post-traitement', [
      ['chroma', 'Aberration', 'rng', [0, 30, .1, 'px'], 3.2],
      ['chromaWarp', 'Aberration radiale', 'rng', [0, 1, .01, ''], .7, () => P.chroma > 0],
      ['scanAmt', 'Lignes de balayage', 'rng', [0, 1, .01, ''], .16],
      ['scanCount', 'Nombre de lignes', 'rng', [80, 2000, 10, ''], 900, () => P.scanAmt > 0],
      ['scanRoll', 'Défilement des lignes', 'rng', [-2, 2, .01, ''], .12, () => P.scanAmt > 0],
      ['grain', 'Grain', 'rng', [0, .7, .005, ''], .06],
      ['vign', 'Vignette', 'rng', [0, 2, .01, ''], .5],
      ['contrast', 'Contraste', 'rng', [.4, 2.2, .01, '×'], 1.06],
      ['sat', 'Saturation', 'rng', [0, 2.2, .01, '×'], 1.1],
      ['glitchAmt', 'Glitch', 'rng', [0, 1, .01, ''], 0],
      ['glitchRate', 'Fréquence du glitch', 'rng', [.1, 12, .1, 'Hz'], 2.4, () => P.glitchAmt > 0]
    ]],
    ['Rendu', [
      ['resPreset', 'Résolution', 'sel', [['1920x1080', '1920×1080 · 16:9'], ['1080x1920', '1080×1920 · 9:16'], ['1080x1080', '1080×1080 · 1:1'], ['1280x720', '1280×720 · HD'], ['2560x1440', '2560×1440 · QHD'], ['3840x2160', '3840×2160 · 4K']], '1920x1080'],
      ['previewScale', 'Qualité aperçu', 'sel', [['0.5', '50 % (rapide)'], ['0.75', '75 %'], ['1', '100 % (exact)']], '0.75']
    ]]
  ],

  pgBeat: [
    ['Tempo', [
      ['beatOn', 'Réagir au rythme', 'chk', null, false],
      ['bpm', 'BPM', 'rng', [40, 240, .1, ''], 120],
      ['beatOffset', 'Calage du temps', 'rng', [-1500, 1500, 1, 'ms'], 0]
    ]],
    ['Réactions au temps', [
      ['beatScale', 'Pulsation texte', 'rng', [0, .3, .005, ''], .05, () => P.beatOn],
      ['beatGlow', 'Éclat du halo', 'rng', [0, 3, .01, ''], .8, () => P.beatOn],
      ['beatBloom', 'Éclat du bloom', 'rng', [0, 2, .01, ''], .5, () => P.beatOn],
      ['beatBurst', 'Rafale particules', 'rng', [0, 400, 1, ''], 0, () => P.beatOn],
      ['beatDecay', 'Sécheresse', 'rng', [1, 14, .1, ''], 5, () => P.beatOn]
    ]]
  ]
};

/* ------------------------------------------------------- schema → state --- */
(function initParams() {
  for (const page in SCHEMA)
    for (const [, items] of SCHEMA[page])
      for (const it of items) {
        const [k, label, type, opt, def, when] = it;
        P[k] = def;
        PMETA[k] = { label, type, opt, def, page, when };
      }
})();

/* Contextual help, shown by the hover mode and in the help sheet.
   Only the parameters worth an explanation are listed; the rest fall back
   to their label.                                                          */
const PHELP = {
  fontSize: "Taille du texte en pourcentage de la hauteur de l'image — indépendante de la résolution d'export.",
  letterSpacing: "Espacement entre les lettres, en cadratins. Négatif = resserré.",
  maxWidth: "Au-delà de cette largeur, une ligne est réduite automatiquement pour tenir. Chaque ligne est ajustée séparément.",
  linesBefore: "Nombre de lignes déjà chantées affichées au-dessus de la ligne active.",
  linesAfter: "Nombre de lignes à venir affichées en dessous — utile pour anticiper.",
  inactAlpha: "Opacité des lignes qui ne sont pas en cours de chant.",
  baseColor: "Couleur du texte <em>avant</em> son remplissage. C'est le contraste avec le fill qui rend le karaoké lisible.",
  strokeW: "Contour du texte non rempli. Indispensable si le fond est chargé.",
  fillMode: "Comment le texte rempli est coloré. <em>Chrome Y2K</em> et <em>Holographique</em> donnent le rendu métallique typique.",
  fillAngle: "Direction du dégradé de remplissage, en degrés.",
  fillSpeed: "Fait défiler le dégradé dans le temps. 0 = figé.",
  fillEase: "Courbe de progression du remplissage à l'intérieur d'une syllabe. <em>Instantané</em> = la syllabe s'allume d'un coup.",
  fillLead: "Décale tout le remplissage dans le temps sans toucher aux timings. Sert à compenser une latence perçue.",
  fillSoft: "Adoucit le bord d'attaque du remplissage. 0 = coupe nette.",
  popAmt: "Petit grossissement de la syllabe au moment où elle démarre.",
  glowAmt: "Halo autour du texte rempli. Combiné au bloom, c'est ce qui donne le côté néon.",
  parOn: "Active les particules. Les couper libère beaucoup de GPU si tu manques de performance.",
  parType: "Forme des particules. <em>Pixels Y2K</em> et <em>Éclats</em> pour un rendu dur, <em>Poussière</em> et <em>Bulles</em> pour un rendu doux.",
  parRate: "Particules émises par seconde pendant qu'une syllabe se remplit.",
  parBurst: "Bouffée instantanée émise à l'attaque de chaque syllabe, en plus du débit continu.",
  parBand: "Épaisseur de la zone d'émission derrière le front de remplissage. Petite = filet net qui suit la lettre, grande = nappe.",
  parEmitFull: "Émet depuis toute la surface de la syllabe au lieu du seul front qui avance.",
  parMax: "Plafond de particules vivantes. C'est le principal levier de performance.",
  parSpeed: "Vitesse d'éjection initiale, en pixels par seconde à 1080p.",
  parSpeedRnd: "Fait varier la vitesse d'une particule à l'autre. 0 = toutes identiques.",
  parDir: "Direction moyenne d'éjection. −90° = vers le haut.",
  parSpread: "Ouverture du cône d'éjection autour de la direction. 360° = toutes directions.",
  parGravity: "Accélération verticale constante. Négatif = les particules montent.",
  parDrag: "Freinage progressif. Élevé = les particules s'arrêtent vite.",
  parTurb: "Force d'un champ de turbulence qui fait onduler les trajectoires.",
  parTurbScale: "Échelle du champ de turbulence. Petit = grandes ondulations molles.",
  parSize: "Taille de base, à 1080p. Elle suit automatiquement la résolution d'export.",
  parGrow: "Évolution de la taille au fil de la vie. Négatif = la particule rétrécit en mourant.",
  parLife: "Durée de vie. Longue = traînées persistantes, courte = étincelles sèches.",
  parStretch: "Étire la particule dans le sens de sa vitesse. Ne s'applique qu'aux étincelles et traînées.",
  parColorMode: "<em>Hérite du fill</em> prend la couleur exacte du dégradé à l'endroit précis où la particule naît.",
  parBlend: "<em>Additif</em> fait s'accumuler la lumière — le choix habituel sur fond sombre.",
  parSeed: "Graine de l'aléatoire. Même graine = résultat identique, image par image, à chaque export.",
  bgMode: "<em>Transparent</em> produit un vrai canal alpha — obligatoire pour l'export en séquence PNG.",
  gridOn: "Grille en perspective façon synthwave, tracée sous l'horizon.",
  gridHorizon: "Hauteur de la ligne d'horizon de la grille, de haut en bas de l'image.",
  bloomOn: "Diffusion lumineuse sur les zones claires. C'est elle qui fait « briller » le texte et les particules.",
  bloomThr: "Seuil de luminosité à partir duquel un pixel se met à diffuser.",
  chroma: "Sépare les canaux rouge et bleu — l'artefact d'optique typique du look cybercore.",
  chromaWarp: "Rend l'aberration plus forte sur les bords qu'au centre, comme une vraie lentille.",
  scanAmt: "Lignes de balayage type moniteur cathodique.",
  scanRoll: "Fait défiler lentement les scanlines vers le haut ou le bas.",
  glitchAmt: "Décalage horizontal aléatoire de bandes d'image.",
  resPreset: "Résolution de l'export. L'aperçu s'adapte, la mise en page reste identique.",
  previewScale: "Qualité de l'aperçu seulement. Baisse-la si ça rame — l'export reste toujours en pleine résolution.",
  lineLead: "Affiche la ligne suivante un peu avant qu'elle soit chantée, dès que la précédente est finie. 0 = la ligne n'apparaît qu'à sa première syllabe.",
  beatOn: "Fait réagir le texte, le glow, le bloom et les particules à chaque temps. Le tempo vient du BPM ci-dessous, du TAP, ou d'Ableton Link en live.",
  bpm: "Tempo du morceau. <em>Détecter</em> le trouve dans l'audio ; en live, le TAP et Ableton Link le remplacent.",
  beatOffset: "Déplace la grille des temps pour que la pulsation tombe pile sur le kick.",
  beatScale: "Le texte actif grossit un instant sur chaque temps.",
  beatBurst: "Nombre de particules lâchées d'un coup sur chaque temps, depuis toute la ligne active.",
  beatDecay: "Vitesse à laquelle la pulsation retombe. Élevé = coup sec, faible = respiration lente."
};

/* Le mode SIMPLE n'affiche que ces réglages : de quoi couvrir la très grande
   majorité des besoins sans noyer qui que ce soit. Le mode EXPERT ouvre tout. */
const SIMPLE = new Set([
  'fontFamily', 'fontSize', 'uppercase', 'posY', 'linesBefore', 'linesAfter',
  'baseColor', 'strokeW',
  'fillMode', 'fillC1', 'fillC2', 'glowAmt',
  'parOn', 'parType', 'parRate', 'parSize', 'parSpeed', 'parLife',
  'bgMode', 'bgC1', 'gridOn', 'bloomOn',
  'beatOn', 'bpm', 'beatScale', 'beatBurst',
  'resPreset', 'previewScale'
]);

/* Ambiances prêtes à l'emploi — un clic, tout le style bascule. */
const PRESETS = {
  'CHROME Y2K': {
    fontFamily: 'Impact, Haettenschweiler, sans-serif', fontWeight: '900', uppercase: true, fontSize: 9,
    baseColor: '#2b3a6b', baseAlpha: .85, strokeW: 0, strokeColor: '#31f6ff',
    fillMode: 'chrome', fillC1: '#ffffff', fillC2: '#31f6ff', fillC3: '#ff2fd0', fillSpeed: .35,
    glowAmt: 1.1, glowColor: '#31f6ff', fillStroke: true, fillStrokeC: '#ff2fd0', fillStrokeW: 2.5,
    parOn: true, parType: 'spark', parRate: 700, parSize: 5, parSpeed: 340, parLife: 1.1,
    parColorMode: 'fill', parBlend: 'add', parGravity: -180,
    bgMode: 'grad', bgC1: '#05030f', bgC2: '#1b0430', gridOn: true, gridColor: '#ff2fd0', gridAlpha: .22,
    bloomOn: true, bloomInt: .95, chroma: 3.2, scanAmt: .16, grain: .06, vign: .5, sat: 1.1
  },
  'NÉON ROSE': {
    fontFamily: 'Arial Black, Arial, sans-serif', fontWeight: '900', uppercase: true, fontSize: 8.5,
    baseColor: '#3a1046', baseAlpha: .9, strokeW: 1.5, strokeColor: '#ff2fd0',
    fillMode: 'linear', fillC1: '#fff1fb', fillC2: '#ff2fd0', fillSpeed: .1,
    glowAmt: 2, glowColor: '#ff2fd0', fillStroke: false,
    parOn: true, parType: 'star', parRate: 520, parSize: 7, parSpeed: 260, parLife: 1.5,
    parColorMode: 'grad', parC1: '#ffffff', parC2: '#ff2fd0', parBlend: 'add', parGravity: -60,
    bgMode: 'grad', bgC1: '#0a0212', bgC2: '#2b0038', gridOn: true, gridColor: '#31f6ff', gridAlpha: .16,
    bloomOn: true, bloomInt: 1.5, chroma: 5, scanAmt: .1, grain: .05, vign: .7, sat: 1.25
  },
  'HOLO AERO': {
    fontFamily: 'Segoe UI, system-ui, sans-serif', fontWeight: '700', uppercase: false, fontSize: 8,
    baseColor: '#20315e', baseAlpha: .7, strokeW: 0,
    fillMode: 'holo', fillC1: '#ffffff', fillC2: '#31f6ff', fillC3: '#ff2fd0', fillSpeed: .6, fillSoft: 22,
    glowAmt: .8, glowColor: '#ffffff', fillStroke: false,
    parOn: true, parType: 'bubble', parRate: 260, parSize: 14, parSpeed: 120, parLife: 2.6,
    parColorMode: 'fill', parBlend: 'add', parGravity: -90, parDrag: 2.4, parTurb: 140,
    bgMode: 'grad', bgC1: '#040a18', bgC2: '#0d2a44', gridOn: false,
    bloomOn: true, bloomInt: 1.2, chroma: 2, scanAmt: .05, grain: .03, vign: .45, sat: 1.05
  },
  'TERMINAL': {
    fontFamily: 'Courier New, monospace', fontWeight: '700', uppercase: true, fontSize: 7,
    baseColor: '#123d1a', baseAlpha: 1, strokeW: 0,
    fillMode: 'solid', fillC1: '#a6ff2f', fillSpeed: 0,
    glowAmt: 1.4, glowColor: '#a6ff2f', fillStroke: false,
    parOn: true, parType: 'pixel', parRate: 900, parSize: 3, parSpeed: 180, parLife: .7,
    parColorMode: 'c1', parC1: '#a6ff2f', parBlend: 'add', parGravity: 260, parSizeRnd: .2,
    bgMode: 'solid', bgC1: '#02060a', gridOn: false,
    bloomOn: true, bloomInt: .8, chroma: 1.2, scanAmt: .45, scanCount: 620, grain: .12, vign: .9, sat: .9
  },
  'MINIMAL': {
    fontFamily: 'Helvetica Neue, Arial, sans-serif', fontWeight: '800', uppercase: false, fontSize: 7.5,
    baseColor: '#333a4a', baseAlpha: .55, strokeW: 0,
    fillMode: 'solid', fillC1: '#ffffff', fillSpeed: 0, fillSoft: 6,
    glowAmt: 0, fillStroke: false, popAmt: .03,
    parOn: true, parType: 'dust', parRate: 240, parSize: 3, parSpeed: 90, parLife: 1.8,
    parColorMode: 'c1', parC1: '#ffffff', parBlend: 'normal', parGravity: -30, parAlpha: .5,
    bgMode: 'solid', bgC1: '#0b0c10', gridOn: false,
    bloomOn: true, bloomInt: .4, chroma: 0, scanAmt: 0, grain: .04, vign: .35, sat: 1
  },
  'KAWAII': {
    fontFamily: 'Arial Black, Arial, sans-serif', fontWeight: '900', uppercase: false, fontSize: 8.5,
    baseColor: '#ffffff', baseAlpha: .95, strokeW: 5, strokeColor: '#ff5fb2',
    fillMode: 'linear', fillC1: '#ff2f9a', fillC2: '#b04dff', fillAngle: 90, fillSpeed: .12,
    glowAmt: .6, glowColor: '#ff8fd0', fillStroke: true, fillStrokeC: '#ffffff', fillStrokeW: 4,
    parOn: true, parType: 'heart', parRate: 150, parSize: 15, parSpeed: 150, parLife: 1.8, parSpin: 1.2,
    parColorMode: 'rand', parC1: '#ff5fb2', parC2: '#ffffff', parBlend: 'normal', parGravity: -140, parAlpha: .95,
    bgMode: 'grad', bgC1: '#ffd6ec', bgC2: '#cbb8ff', bgAngle: 160, gridOn: false,
    bloomOn: true, bloomInt: .3, bloomThr: .8, chroma: 0, scanAmt: 0, grain: .02, vign: .12, sat: 1.1
  },
  'SAKURA': {
    fontFamily: 'Georgia, serif', fontWeight: '700', uppercase: false, fontSize: 8,
    baseColor: '#5a3550', baseAlpha: .75, strokeW: 0,
    fillMode: 'linear', fillC1: '#ffffff', fillC2: '#ffb7d5', fillSpeed: .08, fillSoft: 18,
    glowAmt: .9, glowColor: '#ff9cc6', fillStroke: false,
    parOn: true, parType: 'petal', parRate: 70, parSize: 13, parSpeed: 70, parLife: 3.4, parSpin: 3,
    parDir: 90, parSpread: 140, parGravity: 70, parDrag: 1.2, parTurb: 180, parTurbScale: 1.6,
    parColorMode: 'grad', parC1: '#ffd1e3', parC2: '#ff7fb0', parBlend: 'normal', parAlpha: .9,
    bgMode: 'grad', bgC1: '#140a18', bgC2: '#3b1b33', gridOn: false,
    bloomOn: true, bloomInt: .55, chroma: .6, scanAmt: 0, grain: .03, vign: .5, sat: 1.05
  },
  'FRUTIGER': {
    fontFamily: 'Segoe UI, system-ui, sans-serif', fontWeight: '700', uppercase: false, fontSize: 8,
    baseColor: '#ffffff', baseAlpha: .5, strokeW: 0, shadowOn: true, shadowColor: '#0b4f7a', shadowBlur: 18, shadowY: 4,
    fillMode: 'linear', fillC1: '#ffffff', fillC2: '#e2fbff', fillSpeed: 0, fillSoft: 14,
    glowAmt: 1, glowColor: '#ffffff', fillStroke: false,
    parOn: true, parType: 'bubble', parRate: 110, parSize: 18, parSpeed: 90, parLife: 2.8,
    parColorMode: 'c1', parC1: '#ffffff', parBlend: 'add', parGravity: -120, parDrag: 2, parTurb: 120,
    bgMode: 'grad', bgC1: '#1f8fd6', bgC2: '#8fe07a', bgAngle: 90, gridOn: false,
    bloomOn: true, bloomInt: .6, bloomThr: .6, chroma: 0, scanAmt: 0, grain: .02, vign: .2, sat: 1.15
  }
};

/* Signals that force recomputation of cached glyph layout / masks */
const LAYOUT_KEYS = new Set(['fontFamily', 'fontWeight', 'italic', 'fontSize', 'letterSpacing',
  'lineHeight', 'uppercase', 'align', 'maxWidth', 'resPreset', 'previewScale']);

/* ---------------------------------------------------------------- state --- */
const S = {
  /* audio */
  ctx: null, buffer: null, audioBlob: null, peaks: null, audioName: '',
  audioGen: 0, docGen: 0, audioRemoved: false,   // jetons : un chargement plus récent annule les anciens
  duration: 0, playing: false, src: null, startCtxT: 0, startOff: 0, freeT: 0, cur: 0,
  rate: 1,              // playback rate (J / K / L)
  extClock: false,      // live : horloge seule, le son vient de l'extérieur
  holdAt: null,         // live « ligne par ligne » : pause automatique à cet instant
  /* lyrics */
  lines: [],            // [{ raw, syls:[{t,t0,t1}] }]
  sel: { line: 0, syl: 0 },     // anchor / primary selection
  selSet: new Set(),            // multi-selection, keys "li:si"
  tapMode: false, tapIdx: 0, tapKey: 'f', tapHeld: null, tapOffset: 0,
  /* morceau courant, tel que rangé dans la bibliothèque */
  song: { id: null, title: '', artist: '' },
  /* view */
  ws: 'prep',           // espace de travail : prep | style | live
  tlZoom: 90,           // px per second
  tlScroll: 0,          // seconds at left edge
  follow: true, snap: true, ripple: false, tool: 'V', scrubAudio: true, uiMode: 'simple',
  loop: null,           // [début, fin] en secondes, ou null
  blackout: false,      // live : texte masqué d'un coup
  /* render */
  W: 1920, H: 1080, dirtyLayout: true, dirtyMask: true,
  customFont: null,     // { name, data:ArrayBuffer } — renvoyée à l'écran scène
  exporting: false
};

/* --------------------------------------------------------- syllabation --- */
const V_FR = 'aeiouyàâäéèêëîïôöùûüœæ';
const V_EN = 'aeiouy';
const CLUSTERS = ['bl', 'br', 'ch', 'cl', 'cr', 'dr', 'fl', 'fr', 'gl', 'gn', 'gr', 'ph', 'pl', 'pr', 'qu', 'th', 'tr', 'vr'];
const ACCENTS = 'éèêëàâîïôöûùü';

function isV(c, lang) { return (lang === 'en' ? V_EN : V_FR).indexOf(c) >= 0; }

/** Split a single word into syllables (heuristic, editable afterwards). */
function syllabify(word, lang) {
  if (lang === 'none' || word.length < 3) return [word];
  const low = word.toLowerCase();
  const n = word.length;
  const cuts = [];                                  // indices where a syllable starts

  // classify: build nucleus groups
  const kind = [];
  for (let i = 0; i < n; i++) kind.push(isV(low[i], lang) ? 'V' : (/[a-zà-ÿœæ']/i.test(low[i]) ? 'C' : 'X'));
  // nasal closing: vowel + n/m + consonant  →  the n/m belongs to the nucleus
  for (let i = 0; i < n - 1; i++)
    if (kind[i] === 'V' && (low[i + 1] === 'n' || low[i + 1] === 'm') && (i + 2 >= n || kind[i + 2] === 'C') && lang === 'fr')
      kind[i + 1] = 'V';

  let i = 0;
  while (i < n) {
    // advance to end of vowel group
    if (kind[i] !== 'V') { i++; continue; }
    // extend through the vowel group; an accented vowel followed by another
    // vowel is a hiatus in French ("Né-on", "ré-action") → close the nucleus
    let ve = i;
    while (ve + 1 < n && kind[ve + 1] === 'V') {
      if (lang === 'fr' && ACCENTS.indexOf(low[ve]) >= 0) break;
      ve++;
    }
    // count consonants after
    let ce = ve; while (ce + 1 < n && kind[ce + 1] === 'C') ce++;
    const nc = ce - ve;
    // is there another vowel after the consonants?
    let hasNext = false;
    for (let j = ce + 1; j < n; j++) if (kind[j] === 'V') { hasNext = true; break; }
    if (!hasNext) break;
    let cut;
    if (nc === 0) cut = ve + 1;                                   // V/V
    else if (nc === 1) cut = ve + 1;                              // V/CV
    else {
      const pair = low.slice(ce - 1, ce + 1);
      cut = CLUSTERS.indexOf(pair) >= 0 ? ce - 1 : ce;            // VC/CV or V/CCV
    }
    if (cut > 0 && cut < n) cuts.push(cut);
    i = ce + 1;
  }
  // silent final 'e' (fr) : glue to previous syllable
  const out = []; let prev = 0;
  for (const c of cuts) { if (c > prev) { out.push(word.slice(prev, c)); prev = c; } }
  out.push(word.slice(prev));
  const res = out.filter(s => s.length);
  if (lang === 'fr' && res.length > 1) {
    const last = res[res.length - 1].toLowerCase();
    if (last === 'e' || last === 'es' || last === 'ent') { res[res.length - 2] += res.pop(); }
  }
  return res.length ? res : [word];
}

/** Text → line/syllable model. Manual '-' forces a cut. */
function buildLines(text, lang) {
  return text.replace(/\r/g, '').split('\n').map(raw => {
    const line = raw.trimEnd();
    const syls = [];
    const tokens = line.match(/(\s+|[^\s]+)/g) || [];
    for (const tok of tokens) {
      if (/^\s+$/.test(tok)) { if (syls.length) syls[syls.length - 1].t += ' '; continue; }
      const parts = tok.split('-').filter(x => x.length);
      const pieces = [];
      for (let pi = 0; pi < parts.length; pi++) {
        const sub = syllabify(parts[pi], lang);
        for (let si = 0; si < sub.length; si++) pieces.push(sub[si] + (si === sub.length - 1 && pi < parts.length - 1 ? '-' : ''));
      }
      for (const p of pieces) syls.push({ t: p, t0: null, t1: null });
    }
    return { syls, raw: line };
  });
}

/* ------------------------------------------------------------ timing api --- */
function allSyls() {
  const out = [];
  S.lines.forEach((L, li) => L.syls.forEach((s, si) => out.push({ s, li, si })));
  return out;
}
function lineSpan(L) {
  let a = Infinity, b = -Infinity;
  for (const s of L.syls) { if (s.t0 != null) { a = Math.min(a, s.t0); b = Math.max(b, s.t1 != null ? s.t1 : s.t0); } }
  return isFinite(a) ? [a, Math.max(b, a)] : null;
}
/** Effective end of a syllable (explicit, or next syllable's start). */
function sylEnd(L, i) {
  const s = L.syls[i];
  if (s.t1 != null) return s.t1;
  for (let j = i + 1; j < L.syls.length; j++) if (L.syls[j].t0 != null) return L.syls[j].t0;
  return s.t0 != null ? s.t0 + .35 : null;
}
/* ------------------------------------------------------------- annulation --- */
/* Le calage à la main, c'est essayer, rater, recommencer. Chaque opération
   prend un instantané juste AVANT de modifier ; Ctrl+Z revient dessus.

   Deux piles indépendantes, une par espace de travail :
     · Undo.doc   — paroles, timings, titre (PRÉPARER)
     · Undo.style — les réglages d'ambiance P (STYLE)
   Ctrl+Z agit sur la pile de l'espace actif ; en LIVE rien n'est annulable.

   Invariant : `stack[idx]` est le dernier état ENREGISTRÉ ; l'état vivant
   peut lui être postérieur d'une opération (celle qui a suivi le dernier
   snap). Chaque entrée porte le nom de l'opération qui a PRODUIT cet état,
   ce qui donne des messages justes : « Annulé : déplacer ».

   Les opérations répétées (flèches tenues, curseur qu'on glisse) passent un
   `group` : tant que le même groupe revient dans la seconde, elles ne font
   qu'une seule étape.                                                        */
class UndoStack {
  constructor(opts) {
    this.capture = opts.capture;        // → { key, aside } : key comparée, aside restaurée mais non comparée
    this.apply = opts.apply;            // (entry) → remet l'état en place
    this.onChange = opts.onChange;      // appelé quand une opération a réellement changé l'état
    this.max = opts.max || 80;
    this.coalesceMs = opts.coalesceMs || 900;
    this.stack = []; this.idx = -1; this.pending = 'modification';
    this.lastGroup = null; this.lastAt = 0; this.checking = false;
  }

  push(c, label) {
    this.stack.length = this.idx + 1;             // nouvelle branche : le « rétablir » tombe
    this.stack.push({ key: c.key, aside: c.aside, label });
    if (this.stack.length > this.max) this.stack.shift();
    this.idx = this.stack.length - 1;
  }

  /** À appeler AVANT une modification. */
  snap(label, group) {
    const t = performance.now();
    const c = this.capture();
    const top = this.stack[this.idx];
    if (top && c.key !== top.key) {
      // l'opération précédente n'est pas encore dans la pile : on l'y range,
      // sauf si on est dans la même rafale (flèches tenues, curseur glissé)
      const same = group && group === this.lastGroup && t - this.lastAt < this.coalesceMs;
      if (!same) this.push(c, this.pending);
    } else if (top) {
      top.aside = c.aside;      // la sélection au moment de quitter cet état : c'est elle qu'on retrouvera
    }
    if (!top) this.push(c, 'état initial');
    if (!(group && group === this.lastGroup && t - this.lastAt < this.coalesceMs)) this.pending = label || 'modification';
    this.lastGroup = group || null; this.lastAt = t;
    this.scheduleCheck();
  }

  /** Après l'opération : si l'état a vraiment changé, on le signale (modifié, autosave). */
  scheduleCheck() {
    if (this.checking || !this.onChange) return;
    this.checking = true;
    queueMicrotask(() => {
      this.checking = false;
      const top = this.stack[this.idx];
      if (top && this.capture().key !== top.key) this.onChange();
    });
  }

  /** Vrai si Ctrl+Z aurait un effet. */
  canUndo() {
    if (this.idx > 0) return true;
    const top = this.stack[this.idx];
    return !!top && this.capture().key !== top.key;
  }
  canRedo() { return this.idx >= 0 && this.idx < this.stack.length - 1 && this.capture().key === this.stack[this.idx].key; }
  /** Nom de la prochaine opération annulable / rétablissable. */
  undoLabel() {
    const top = this.stack[this.idx]; if (!top) return '';
    return this.capture().key !== top.key ? this.pending : (this.idx > 0 ? top.label : '');
  }
  redoLabel() { return this.canRedo() ? this.stack[this.idx + 1].label : ''; }

  undo() {
    const c = this.capture();
    const top = this.stack[this.idx];
    if (top && c.key !== top.key) this.push(c, this.pending);     // l'opération en cours entre dans la pile
    if (this.idx <= 0) { toast('Rien à annuler'); return false; }
    const leaving = this.stack[this.idx];
    leaving.aside = c.aside;                                        // pour retrouver la sélection au rétablir
    this.idx--;
    this.lastGroup = null;
    this.apply(this.stack[this.idx]);
    toast('Annulé : ' + leaving.label);
    if (this.onChange) this.onChange();
    return true;
  }

  redo() {
    const c = this.capture();
    const top = this.stack[this.idx];
    if (top && c.key !== top.key) { this.push(c, this.pending); toast('Rien à rétablir'); return false; }
    if (this.idx >= this.stack.length - 1) { toast('Rien à rétablir'); return false; }
    if (top) top.aside = c.aside;
    this.idx++;
    this.lastGroup = null;
    this.apply(this.stack[this.idx]);
    toast('Rétabli : ' + this.stack[this.idx].label);
    if (this.onChange) this.onChange();
    return true;
  }

  reset() {
    this.stack = []; this.idx = -1; this.pending = 'modification'; this.lastGroup = null;
    this.push(this.capture(), 'état initial');
  }
}

const Undo = {
  /* ---- document : paroles, timings, titre ---- */
  doc: new UndoStack({
    capture() {
      const ta = document.getElementById('lyricsText');
      return {
        key: JSON.stringify({
          lines: cleanLines(S.lines), lyrics: ta ? ta.value : '', ld: !!Doc.lyricsDirty,
          title: S.song.title, artist: S.song.artist
        }),
        aside: { sel: { ...S.sel }, selSet: [...S.selSet], tapIdx: S.tapIdx }
      };
    },
    apply(e) {
      if (typeof TL !== 'undefined' && TL.drag) TL.cancelDrag();
      if (S.tapMode && typeof setTap === 'function') setTap(false);
      const d = JSON.parse(e.key);
      S.lines = d.lines;
      const ta = document.getElementById('lyricsText'); if (ta) ta.value = d.lyrics;
      Doc.lyricsDirty = d.ld;
      S.song.title = d.title; S.song.artist = d.artist;
      const a = e.aside || {};
      S.selSet = new Set((a.selSet || []).filter(k => { const [li, si] = k.split(':').map(Number); return S.lines[li] && S.lines[li].syls[si]; }));
      const li = clamp((a.sel && a.sel.line) || 0, 0, Math.max(0, S.lines.length - 1));
      const si = clamp((a.sel && a.sel.syl) || 0, 0, Math.max(0, (S.lines[li] ? S.lines[li].syls.length : 1) - 1));
      S.sel = { line: li, syl: si };
      S.tapIdx = clamp(a.tapIdx || 0, 0, allSyls().length);
      if (S.loop) { const sp = S.lines[li] && lineSpan(S.lines[li]); S.loop = sp ? [Math.max(0, sp[0] - .35), sp[1] + .35] : null; }
      S.dirtyLayout = true; S.dirtyMask = true;
      if (typeof Mask !== 'undefined') Mask.li = -1;
      afterUndo();
    },
    onChange() { Doc.linesDirty = true; Doc.touch(); updateUndoUi(); }
  }),

  /* ---- style : les réglages P (sans le fond d'incrustation du live) ---- */
  style: new UndoStack({
    capture() {
      const p = typeof Live !== 'undefined' ? Live.docParams() : { ...P };
      return { key: JSON.stringify(p), aside: null };
    },
    apply(e) {
      const d = JSON.parse(e.key);
      const key = typeof Live !== 'undefined' ? Live.keyColor : '';
      if (key) Live.keyPrev = null;
      for (const k in d) if (k in P) P[k] = d[k];
      if (key) Live.setKey(key);            // le fond d'incrustation reste un état de soirée
      S.dirtyLayout = true; S.dirtyMask = true;
      if (typeof Mask !== 'undefined') Mask.li = -1;
      syncPanels();
      if (typeof resizeStage === 'function') resizeStage();
      if (typeof Particles !== 'undefined') { Particles.resize(P.parMax); Particles.reset(); }
      if (typeof Beat !== 'undefined') Beat.changed();
      $$('#presets button').forEach(b => b.classList.remove('on'));
      requestRender(); docChanged();
    },
    onChange() { Doc.touch(); updateUndoUi(); }
  }),

  /** La pile de l'espace actif ; aucune en LIVE. */
  active() { return S.ws === 'style' ? this.style : S.ws === 'prep' ? this.doc : null; },

  /* raccourcis historiques : les opérations sur les timings passent par ici */
  snap(label, group) { this.doc.snap(label, group); },
  undo() {
    const u = this.active();
    if (!u) { toast('Pas d\'annulation en LIVE : les morceaux restent tels quels pendant le show'); return; }
    u.undo();
  },
  redo() { const u = this.active(); if (!u) return; u.redo(); },
  reset() { this.doc.reset(); this.style.reset(); updateUndoUi(); }
};

/** Boutons ↶ ↷ de l'en-tête : état et infobulle suivent la pile active. */
let _undoUiTimer = 0;
function updateUndoUi() {
  if (_undoUiTimer) return;
  _undoUiTimer = requestAnimationFrame(() => {
    _undoUiTimer = 0;
    const bu = document.getElementById('bUndo'), br = document.getElementById('bRedo');
    if (!bu || !br) return;
    const u = Undo.active();
    const cu = !!u && u.canUndo(), cr = !!u && u.canRedo();
    bu.disabled = !cu; br.disabled = !cr;
    bu.title = cu ? `Annuler : ${u.undoLabel()} (Ctrl+Z)` : (u ? 'Rien à annuler (Ctrl+Z)' : 'Pas d\'annulation en LIVE');
    br.title = cr ? `Rétablir : ${u.redoLabel()} (Ctrl+Maj+Z)` : 'Rien à rétablir (Ctrl+Maj+Z)';
  });
}
/* ------------------------------------------------------ filet de sécurité --- */
/* Le travail de calage se compte en heures. Rien ne doit pouvoir l'effacer
   sans retour possible : sauvegarde automatique locale, drapeau « modifié »,
   et avertissement avant de quitter.                                        */
const Doc = {
  /* dirty : quelque chose a changé (style compris) · linesDirty : le texte ou
     les timings ont changé — c'est ce qui mérite une confirmation.         */
  dirty: false, linesDirty: false, lyricsDirty: false, timer: 0, KEY: 'kf.autosave.v1',

  touch() {
    this.dirty = true;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.autosave(), 1500);
    updateSaveState();
  },

  /* Un enregistrement annule aussi l'autosave en attente : sinon un
     document vide armé au démarrage écraserait la sauvegarde retrouvée. */
  clean() { this.dirty = false; this.linesDirty = false; clearTimeout(this.timer); updateSaveState(); updateUndoUi(); },

  autosave() {
    try {
      const d = projectData();
      d.savedAt = Date.now();
      localStorage.setItem(this.KEY, JSON.stringify(d));
    } catch (e) { console.warn('[autosave]', e); }
  },

  restorable() {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (!raw) return null;
      const d = JSON.parse(raw);
      const n = (d.lines || []).reduce((a, L) => a + L.syls.filter(s => s.t0 != null).length, 0);
      return n ? { data: raw, when: d.savedAt || 0, timed: n, lines: (d.lines || []).length } : null;
    } catch (e) { return null; }
  },

  forget() { try { localStorage.removeItem(this.KEY); } catch (e) { } }
};

function afterUndo() {
  if (typeof refreshDuration === 'function') refreshDuration();
  renderSylList();
  TL.invalidate();
  requestRender();
  if (typeof updateTapHud === 'function') updateTapHud();
  updateSaveState();
}

/** Copie des lignes réduite à ce qui fait le document. */
function cleanLines(lines) {
  return lines.map(L => ({ raw: L.raw, syls: L.syls.map(s => ({ t: s.t, t0: s.t0, t1: s.t1 })) }));
}

/** Le document a changé : l'écran scène doit suivre. */
function docChanged() { if (typeof Scene !== 'undefined') Scene.docChanged(); }

/** Indicateur d'enregistrement dans l'en-tête. */
function updateSaveState() {
  const el = document.getElementById('saveState'); if (!el) return;
  const name = S.song.title || (S.audioName ? S.audioName.replace(/\.[^.]+$/, '') : '');
  el.textContent = (name ? name + ' · ' : '') + (Doc.dirty ? 'non enregistré' : (S.song.id ? 'enregistré' : ''));
  el.classList.toggle('dirty', Doc.dirty);
}

/* ------------------------------------------------------ multi-selection --- */
const sk = (li, si) => li + ':' + si;
const selHas = (li, si) => S.selSet.has(sk(li, si));
const selCount = () => S.selSet.size;

function selOne(li, si) { S.selSet.clear(); S.selSet.add(sk(li, si)); S.sel = { line: li, syl: si }; }
function selToggle(li, si) {
  const k = sk(li, si);
  if (S.selSet.has(k)) { S.selSet.delete(k); }
  else { S.selSet.add(k); S.sel = { line: li, syl: si }; }
}
function selClear() { S.selSet.clear(); }
/** Ordered list of the selected syllables, with their owning line. */
function selList() {
  const out = [];
  for (const k of S.selSet) {
    const i = k.indexOf(':'), li = +k.slice(0, i), si = +k.slice(i + 1);
    const L = S.lines[li];
    if (L && L.syls[si]) out.push({ li, si, L, s: L.syls[si] });
  }
  return out.sort((a, b) => a.li - b.li || a.si - b.si);
}
/** Select every syllable between the anchor and (li,si) in reading order. */
function selRangeTo(li, si) {
  const flat = allSyls();
  const a = flat.findIndex(o => o.li === S.sel.line && o.si === S.sel.syl);
  const b = flat.findIndex(o => o.li === li && o.si === si);
  if (a < 0 || b < 0) { selOne(li, si); return; }
  S.selSet.clear();
  for (let i = Math.min(a, b); i <= Math.max(a, b); i++) S.selSet.add(sk(flat[i].li, flat[i].si));
}
function selLine(li) {
  S.selSet.clear();
  const L = S.lines[li]; if (!L) return;
  L.syls.forEach((_, si) => S.selSet.add(sk(li, si)));
  S.sel = { line: li, syl: 0 };
}
/** Indices shift after a structural edit — drop the selection but keep the anchor. */
function selReset(li, si) {
  S.selSet.clear();
  if (li != null && S.lines[li] && S.lines[li].syls[si]) selOne(li, si);
  else S.sel = { line: clamp(li || 0, 0, Math.max(0, S.lines.length - 1)), syl: 0 };
}

function sortLines() {
  S.lines.sort((a, b) => {
    const A = lineSpan(a), B = lineSpan(b);
    if (!A && !B) return 0; if (!A) return 1; if (!B) return -1;
    return A[0] - B[0];
  });
}

/* ------------------------------------------------------ UI : parameters --- */
function buildPanels() {
  const simple = S.uiMode === 'simple';
  for (const page in SCHEMA) {
    const host = $('#' + page); if (!host) continue;
    host.innerHTML = '';
    for (const [title, items] of SCHEMA[page]) {
      const keep = items.filter(it => !simple || SIMPLE.has(it[0]));
      if (!keep.length && !(page === 'pgBeat' && title === 'Tempo')) continue;   // groupe vide : on l'omet
      const g = document.createElement('div'); g.className = 'grp';
      const h = document.createElement('h3'); h.textContent = title;
      h.onclick = () => g.classList.toggle('fold');
      const inn = document.createElement('div'); inn.className = 'grpin';
      if (page === 'pgBeat' && title === 'Tempo') {
        // les outils de tempo (tap, détection, Link) vivent dans ce groupe, une seule fois
        const bt = document.createElement('div'); bt.id = 'beatTools'; inn.appendChild(bt);
        if (typeof mountBeatTools === 'function') mountBeatTools(bt);
      }
      for (const [k, label, type, opt] of keep) { const row = makeControl(k, label, type, opt); PMETA[k].row = row; inn.appendChild(row); }
      g.appendChild(h); g.appendChild(inn); host.appendChild(g);
    }
  }
  refreshVisibility();
}

/** Les réglages qui n'ont pas de sens dans l'état courant se cachent
    (couleur 2 d'un fond uni, flou d'une ombre désactivée…). */
function refreshVisibility() {
  const groups = new Set();
  for (const k in PMETA) {
    const m = PMETA[k]; if (!m.row) continue;
    const hide = m.when ? !m.when() : false;
    if (m.row.hidden !== hide) m.row.hidden = hide;
    groups.add(m.row.parentElement);
  }
  for (const inn of groups) {
    if (!inn) continue;
    const g = inn.parentElement;
    const visible = [...inn.children].some(el => !el.hidden);
    if (g && g.classList.contains('grp')) g.hidden = !visible;
  }
}

function setUiMode(m) {
  S.uiMode = m;
  $('#mSimple').classList.toggle('on', m === 'simple');
  $('#mExpert').classList.toggle('on', m === 'expert');
  document.body.classList.toggle('ui-expert', m === 'expert');
  for (const k in PMETA) { PMETA[k].el = null; PMETA[k].row = null; }
  buildPanels();
  if (typeof UiPrefs !== 'undefined') UiPrefs.set({ mode: m });
  if (typeof Live !== 'undefined' && Live.beatChanged) Live.beatChanged();
}

function applyPreset(name) {
  const p = PRESETS[name]; if (!p) return;
  Undo.style.snap('ambiance ' + name);
  for (const k in p) if (k in P) P[k] = p[k];
  S.dirtyLayout = true; S.dirtyMask = true;
  syncPanels();
  if (typeof resizeStage === 'function') resizeStage();
  if (typeof Particles !== 'undefined') Particles.reset();
  requestRender();
  Doc.touch(); docChanged();
  $$('#presets button').forEach(b => b.classList.toggle('on', b.textContent === name));
  toast('Ambiance : ' + name);
}

function buildPresets() {
  const host = $('#presets'); host.innerHTML = '';
  for (const name in PRESETS) {
    const b = document.createElement('button');
    b.textContent = name;
    b.dataset.help = 'Applique l\'ambiance <em>' + name + '</em> : typo, couleurs, particules et décor d\'un coup.';
    b.onclick = () => applyPreset(name);
    host.appendChild(b);
  }
}

function makeControl(k, label, type, opt) {
  const row = document.createElement('div');
  row.dataset.help = PHELP[k] || label;
  if (type === 'chk') {
    row.className = 'row full';
    const l = document.createElement('label'); l.className = 'chk';
    const i = document.createElement('input'); i.type = 'checkbox'; i.checked = !!P[k];
    const b = document.createElement('i');
    l.append(i, b, document.createTextNode(label));
    i.onchange = () => setParam(k, i.checked);
    row.appendChild(l); PMETA[k].el = i; return row;
  }
  const lab = document.createElement('label'); lab.textContent = label; lab.title = label;
  if (type === 'sel') {
    row.className = 'row wide';
    const s = document.createElement('select');
    for (const [v, t] of opt) { const o = document.createElement('option'); o.value = v; o.textContent = t; s.appendChild(o); }
    s.value = P[k];
    s.onchange = () => setParam(k, s.value);
    row.append(lab, s); PMETA[k].el = s; return row;
  }
  if (type === 'col') {
    row.className = 'row wide';
    const c = document.createElement('input'); c.type = 'color'; c.value = P[k];
    c.oninput = () => setParam(k, c.value);
    row.append(lab, c); PMETA[k].el = c; return row;
  }
  // range
  row.className = 'row';
  const [mn, mx, st, unit] = opt;
  const r = document.createElement('input'); r.type = 'range';
  r.min = mn; r.max = mx; r.step = st; r.value = P[k];
  const v = document.createElement('div'); v.className = 'val';
  const show = () => v.textContent = (st < 1 ? (+P[k]).toFixed(String(st).split('.')[1].length) : P[k]) + (unit || '');
  r.oninput = () => { setParam(k, parseFloat(r.value)); show(); };
  v.ondblclick = () => { setParam(k, PMETA[k].def); r.value = P[k]; show(); };
  v.style.cursor = 'pointer'; v.title = 'Double-clic : valeur par défaut';
  show();
  row.append(lab, r, v); PMETA[k].el = r; PMETA[k].show = show; return row;
}

function setParam(k, val) {
  if (P[k] === val) return;
  Undo.style.snap('réglage « ' + ((PMETA[k] && PMETA[k].label) || k) + ' »', k);
  P[k] = val;
  $$('#presets button.on').forEach(b => b.classList.remove('on'));   // l'ambiance n'est plus telle quelle
  if (LAYOUT_KEYS.has(k)) { S.dirtyLayout = true; S.dirtyMask = true; }
  if (k === 'resPreset' || k === 'previewScale') resizeStage();
  if (k === 'parMax') Particles.resize(P.parMax);
  if (k === 'parSeed') Particles.reset();
  refreshVisibility();
  requestRender();
  Doc.touch(); docChanged();
}

function syncPanels() {
  for (const k in PMETA) {
    const m = PMETA[k]; if (!m.el) continue;
    if (m.type === 'chk') m.el.checked = !!P[k];
    else m.el.value = P[k];
    if (m.show) m.show();
  }
  refreshVisibility();
}
