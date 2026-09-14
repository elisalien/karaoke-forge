# Karaoke Forge — le guide complet

**Double-clic sur `START-FORGE.bat`.** L'app s'ouvre dans une fenêtre propre, sans onglets ni barre d'adresse. Laisse la fenêtre noire du lanceur ouverte pendant que tu travailles.

Sans Python ni Node, le lanceur ouvre directement `karaoke-forge.html` : tout fonctionne, seul l'export PNG passe par un `.zip` au lieu d'un dossier.

Dans l'app, **`F1`** ouvre l'aide, et **MODE SURVOL** explique chaque bouton que tu survoles.

---

## Trois espaces de travail

En haut à gauche, ou **`Alt+1`**, **`Alt+2`**, **`Alt+3`** :

| | |
|---|---|
| **① PRÉPARER** | Charger l'audio, les paroles, caler chaque syllabe, ranger le morceau. |
| **② STYLE** | L'ambiance : typo, couleurs, particules, décor, réactions au rythme. |
| **③ LIVE** | La soirée : le set, l'écran scène pour Resolume ou OBS, le pilotage au clavier. |

---

## ① PRÉPARER — le parcours

Le panneau de gauche est le mode d'emploi. L'étape utile s'ouvre d'elle-même ; un clic sur un titre y revient.

| | | |
|---|---|---|
| **①** | **AUDIO** | Dépose ton fichier ou clique la zone. *Depuis YouTube* récupère l'audio d'une vidéo (companion requis). |
| **②** | **PAROLES** | Colle le texte et clique **DÉCOUPER EN SYLLABES** — ou *chercher les paroles en ligne*. |
| **③** | **CALAGE** | **◈ CALER EN ÉCOUTANT** : tu frappes une touche sur chaque syllabe. |
| **④** | **AJUSTER** | Tu peaufines à la souris et au clavier. |
| **⑤** | **RANGER** | **Ctrl+S** : le morceau part dans la bibliothèque, prêt pour le live. |

Pas d'audio ? Prépare quand même les paroles : en live, elles se déroulent sur l'horloge de l'app.

### Paroles en ligne

*Chercher les paroles en ligne* interroge [LRCLIB](https://lrclib.net), une base gratuite. Seul le texte cherché part sur le réseau, et seulement au clic.

- Une version **synchronisée** arrive avec le début de chaque ligne déjà posé. Charge l'audio, puis **③ → autres méthodes → ♫ Poser sur les attaques** : les syllabes se placent sur les vrais départs de notes.
- Une version **texte seul** remplit les paroles ; il reste à les caler.
- Vérifie que la durée affichée correspond à ton audio : une autre version du morceau décalerait tout. L'app te prévient si l'écart dépasse 3 secondes.

### Caler en écoutant

**◈ CALER EN ÉCOUTANT** lance la lecture un peu avant le point de reprise et affiche en grand la syllabe à frapper, la précédente et les suivantes.

- **Frappe** la touche de calage (`F` par défaut) au début de chaque syllabe.
- **Tiens-la** sur la dernière syllabe d'une ligne : la note reste à l'écran tant que tu tiens. Un simple tap donne une fin raisonnable, sans jamais remplir tout le silence jusqu'à la ligne suivante.
- **`Retour arrière`** annule la dernière et recule un peu.
- **Reprendre à la sélection** repart d'une syllabe précise.

**Ralentis la musique** avec `0.25×` `0.5×` `0.75×` `1×` en haut. Les timings restent ceux du morceau à vitesse normale, et la latence de la carte son est compensée. Si tes frappes tombent toujours un peu en retard, règle **Décalage frappe** sous *autres méthodes*.

### Ajuster

- **↻ BOUCLER LA LIGNE** (ou `B`) rejoue la ligne en boucle.
- `Maj`+`←` `→` décale la sélection de 10 ms, `Maj`+`Alt`+flèches de 1 ms.
- `I` et `O` calent début et fin sur la tête de lecture.
- **♫** aimante les syllabes sélectionnées sur l'attaque la plus proche.
- `Ctrl+Z` annule, `Ctrl+Maj+Z` rétablit — chaque opération sur les timings est mémorisée.

Cale seulement la première et la dernière syllabe d'une ligne, puis **♫ Poser sur les attaques** ou **↔ Répartir régulièrement** place les autres.

---

## La timeline

| Geste | Effet |
|---|---|
| Clic sur la règle ou l'onde | placer la tête de lecture ; glisser pour la déplacer |
| Clic sur une syllabe | la sélectionner et s'y placer — **un clic ne déplace jamais rien** |
| Glisser le corps d'une syllabe | déplacer la syllabe et toute la sélection |
| Glisser un bord | changer le début ou la fin (le curseur devient ↔) |
| Glisser une ligne (piste du milieu) | déplacer toute la ligne d'un bloc |
| Glisser dans le vide | lasso de sélection |
| `Ctrl`+clic · `Maj`+clic | ajouter / retirer · sélectionner une plage |
| Double-clic | zoomer sur la ligne ; sur la règle : tout voir |
| Clic droit | menu : effacer, couper, fusionner, aimanter, boucler… |
| Molette | zoom centré sur le curseur |
| `Maj`+molette · clic molette · pavé tactile horizontal | faire défiler |
| `Alt` pendant un glissé | désactiver l'aimantation |

Un glissé ne commence qu'après quelques pixels : un clic un peu tremblant ne décale rien. Une syllabe s'arrête au contact de sa voisine au lieu de la traverser. **RIPPLE** emmène tout ce qui suit.

**Outil lame (`C`)** : le clic coupe une syllabe en deux à l'endroit exact. **Aimant (`S`)** : les bords collent à la tête de lecture, aux syllabes voisines et à la grille 10 ms.

### Clavier

| Action | Raccourci |
|---|---|
| Lecture / pause | `Espace` |
| Pause · accélérer · ralentir | `K` · `L` · `J` |
| Syllabe / ligne précédente ou suivante | `←` `→` / `↑` `↓` |
| Entrer / sortir du calage | `T` / `Échap` |
| Outil sélection · lame | `V` · `C` |
| Zoom · tout voir | `+` `−` · `F` |
| Effacer le timing · supprimer les syllabes | `Suppr` · `Maj+Suppr` |
| Fusionner · sélectionner la ligne | `M` · `Ctrl+A` |
| Ranger · exporter le projet · exporter la vidéo | `Ctrl+S` · `Ctrl+Maj+S` · `Ctrl+E` |

**Découpe syllabique.** L'algorithme gère les cas courants du français. Pour corriger : un tiret dans les paroles (`ma-gni-fi-que`), `Alt`+clic dans la liste pour couper, `Alt`+`Maj`+clic pour fusionner, ou l'outil lame.

---

## ② STYLE

Huit **ambiances** changent tout d'un coup : **CHROME Y2K** · **NÉON ROSE** · **HOLO AERO** · **TERMINAL** · **MINIMAL** · **KAWAII** · **SAKURA** · **FRUTIGER**.

**SIMPLE** n'affiche que l'essentiel, **EXPERT** ouvre tout. Double-clic sur la valeur d'un curseur pour revenir au défaut.

**Anticipation** (TEXTE → MISE EN PAGE) affiche la ligne suivante un peu avant qu'elle soit chantée, dès que la précédente est finie.

### Particules

Elles naissent sur le front de remplissage, à l'intérieur des glyphes. Onze formes : étincelles, poussière, pixels, bulles, éclats, étoiles, traînées, pétales, notes, confettis, cœurs. **Graine** : même graine, même résultat, image par image.

### Rythme

Onglet **RYTHME** : coche **Réagir au rythme**, puis donne le tempo.

- **♫ DÉTECTER DANS L'AUDIO** trouve le tempo et cale la grille sur le morceau.
- **TAP** (touche `T` dans STYLE et LIVE) : frappe au moins deux fois en rythme.
- **÷2** · **×2** corrigent une erreur d'octave ; **CALER** dit « le temps, c'est maintenant ».
- Source **MORCEAU** : la grille suit l'audio et se retrouve à l'identique à l'export. **TAP** et **LINK** suivent l'horloge murale, pour le live.

Réactions : pulsation du texte, éclat du glow et du bloom, rafale de particules sur chaque temps, sécheresse de la retombée.

---

## ③ LIVE

### Le set

- La **bibliothèque** contient tout ce que tu as rangé avec `Ctrl+S`, audio compris, disponible hors ligne. **ÉDITER** rouvre un morceau dans PRÉPARER.
- Le **set** est la liste de la soirée : **+ SET** depuis la bibliothèque ou depuis *chercher des paroles en ligne*. `↑` `↓` pour l'ordre.
- Clic : charger. Double-clic : charger et lancer. `1`…`9` chargent directement, `Entrée` passe au suivant.
- **Garder l'ambiance en cours** : un look constant pour toute la soirée, quel que soit le style rangé avec chaque morceau.

### Jouer

| | |
|---|---|
| **AUDIO DU MORCEAU** | L'app joue le son rangé avec le morceau ; les paroles suivent à la milliseconde. |
| **SON EXTÉRIEUR** | La musique vient des platines. Les paroles se déroulent sur l'horloge de l'app : lance-les sur la première ligne chantée, recale avec les flèches. |
| **CONTINU** | Les paroles défilent seules. |
| **LIGNE PAR LIGNE** | Chaque ligne se joue puis s'arrête ; `→` lance la suivante. Le filet de sécurité quand le DJ ne suit pas la version calée. |

| Action | Raccourci |
|---|---|
| Lecture / pause | `Espace` |
| Début de ligne ou ligne précédente · ligne suivante | `←` · `→` |
| Paroles en avance / en retard de 100 ms | `↑` / `↓` |
| Morceau n° du set · suivant · précédent | `1`…`9` · `Entrée` · `Maj+Entrée` |
| Tap tempo | `T` |
| Masquer / réafficher le texte | `N` |
| Fond vert / ambiance | `K` |
| Ligne par ligne · son extérieur · rythme | `L` · `X` · `R` |
| Ouvrir l'écran scène | `O` |

### L'écran scène

**OUVRIR L'ÉCRAN SCÈNE** ouvre une fenêtre qui n'affiche que l'image. Glisse-la sur le second écran, double-clic (ou `F`) pour le plein écran ; le curseur disparaît tout seul. Pendant ce temps l'aperçu de la fenêtre de contrôle se met en pause pour épargner le GPU — coche *Garder l'aperçu ici aussi* si ta machine suit.

- **Resolume** : source *Screen Capture* sur la fenêtre, ou OBS en intermédiaire (capture de fenêtre → NDI ou Spout).
- **Incrustation** : fond **VERT** ou **BLEU**, puis un chroma key. Grille, vignette, grain et aberration sont coupés automatiquement et reviennent sur **AMBIANCE**.
- Si le navigateur bloque la fenêtre, autorise les pop-ups pour la page.

---

## Le companion (facultatif)

`START-COMPANION.bat` — ou automatiquement avec `START-FORGE.bat` si Node.js est installé. Il apporte :

- **Ableton Link** : lance [Carabiner](https://github.com/Deep-Symmetry/carabiner), puis choisis la source **LINK** dans RYTHME.
- **Audio YouTube** : étape ① → *depuis YouTube*. Dépose `yt-dlp.exe` et `ffmpeg.exe` dans `companion\bin`.

Détails : [companion/LISEZ-MOI.md](companion/LISEZ-MOI.md).

---

## Ton travail est protégé

- **Sauvegarde automatique** dans le navigateur une seconde et demie après chaque modification. Au démarrage, l'app propose de reprendre, et recharge l'audio depuis la bibliothèque si le morceau y est.
- **Avertissement** avant de fermer ou de remplacer des timings non rangés.
- **`Ctrl+Z` remonte tout**, y compris un redécoupage, un import ou l'effacement de tous les timings.
- **Ce que tu tapes dans les paroles n'est jamais écrasé** par une opération sur la timeline.

> **Bibliothèque et adresse.** Le navigateur range la bibliothèque sous l'adresse de la page. `START-FORGE.bat` utilise donc toujours la même (`127.0.0.1:8777`). Ouvrir le fichier `.html` directement, ou via un autre navigateur, donne une bibliothèque distincte. Pour transporter un morceau d'une machine à l'autre : **⋯ FICHIER → Exporter le projet (.kfj)**.

---

## Export

**MP4** — H.264 + AAC via WebCodecs, rendu image par image : aucune image perdue. Si le navigateur propose un sélecteur de fichier, la vidéo est écrite directement sur le disque.

**Séquence PNG** — pour un vrai canal alpha (After Effects, Premiere, Resolume, TouchDesigner). Règle d'abord **DÉCOR → FOND → Type** sur `Transparent (alpha)`. Destination : un dossier si possible, sinon un `.zip`.

**Déterminisme.** Particules à pas fixe et graine, pré-roll de 1,2 s, grille rythmique calée sur le morceau : deux exports identiques donnent le même fichier.

## Formats

| | |
|---|---|
| **Bibliothèque** | dans le navigateur : paroles, timings, style et audio |
| **Projet** | `.kfj` — paroles, timings et réglages (sans l'audio) |
| **Timings** | `.ass` (`{\k}` lus et écrits) · `.lrc` classique, enrichi, refrains multiples, `[offset:]` |
| **Polices** | `.ttf` · `.otf` · `.woff2` — menu FICHIER ou glisser-déposer |
| **Sortie** | `.mp4` jusqu'en 4K · séquence `.png` en 16:9, 9:16 ou 1:1 |

Glisse n'importe quel fichier dans la fenêtre : audio, paroles `.txt`, timings, projet ou police.

## Performance

Le compteur en haut à droite de l'aperçu indique les particules vivantes. Si ça rame : baisse **Qualité aperçu** (DÉCOR → RENDU) ou **Max particules**. L'export reste toujours en pleine résolution.
