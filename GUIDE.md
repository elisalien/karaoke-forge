# Karaoke Forge — le guide complet

**Double-clic sur `START-FORGE.bat`.** Il ouvre l'app dans une fenêtre propre, sans onglets ni barre d'adresse.

Le lanceur démarre un petit serveur local (Python ou Node, selon ce qui est présent). Ça permet à l'export PNG d'écrire directement dans un dossier de ton choix. Laisse la fenêtre noire ouverte pendant que tu travailles ; une touche l'arrête.

Sans Python ni Node, le lanceur ouvre quand même `karaoke-forge.html` directement : **tout fonctionne**, l'export PNG passe simplement par un `.zip` au lieu d'un dossier. Tu peux aussi double-cliquer le `.html` toi-même.

Aucune connexion, aucune donnée envoyée : tout se passe sur ta machine.

> Ce guide décrit **Karaoke Forge**. Pour l'installation et la vue d'ensemble, voir le [README](README.md).

---

## Le parcours

Le panneau de gauche **est** le mode d'emploi : quatre étapes, une seule ouverte à la fois. Chacune se referme quand elle est faite et ouvre la suivante. Clique un titre pour y revenir.

| | | |
|---|---|---|
| **①** | **AUDIO** | Dépose ton fichier, ou clique la zone. |
| **②** | **PAROLES** | Colle le texte, clique **DÉCOUPER EN SYLLABES**. |
| **③** | **CALAGE** | **◈ CALER EN ÉCOUTANT** : tu frappes une touche sur chaque syllabe. |
| **④** | **AJUSTER** | Apparaît une fois calé : tu peaufines à la souris et au clavier. |

Puis le style à droite, et **⏺ EXPORTER**.

## Le style, en un clic

Cinq **ambiances** en haut du panneau de droite changent tout d'un coup : typo, couleurs, particules, décor.

**CHROME Y2K** · **NÉON ROSE** · **HOLO AERO** · **TERMINAL** · **MINIMAL**

En dessous, **SIMPLE** n'affiche que la vingtaine de réglages qui comptent vraiment. **EXPERT** ouvre les quatre-vingt-dix-sept : physique des particules, post-traitement, mise en page fine. Commence en SIMPLE, bascule si ça te démange.

Le menu **⋯ FICHIER** regroupe le reste : sauver ou rouvrir un projet, importer/exporter les timings en `.ass` ou `.lrc`, charger une police.

## Caler les paroles

Le principe est simple : tu écoutes, tu frappes une touche au début de chaque syllabe chantée.

**◈ CALER EN ÉCOUTANT** lance la lecture deux secondes avant le point de reprise et affiche en grand, par-dessus l'aperçu, la syllabe à frapper — avec la précédente au-dessus et les suivantes en dessous, plus une barre de progression. Tu n'as plus à chercher où tu en es.

**Ralentis la musique.** Les boutons `0.25×` `0.5×` `0.75×` `1×` en haut de la fenêtre jouent le morceau moins vite pour te laisser le temps. **Les timings enregistrés restent ceux du morceau à vitesse normale** — c'est la machine qui remet l'échelle d'aplomb, pas toi. `J` ralentit d'un cran, `L` accélère, `K` met en pause.

**Rate une syllabe ?** `Retour arrière` annule la dernière et recule un peu. Tu n'as jamais à tout refaire : *Reprendre à la sélection* repart d'une syllabe précise.

### Affiner sans tout refaire

- **↻ BOUCLER LA LIGNE** (ou `B`) rejoue la ligne en boucle pendant que tu ajustes — la zone bouclée s'affiche en vert dans la timeline.
- `Maj`+`←` `→` décale la sélection de 10 ms, `Maj`+`Alt`+flèches de 1 ms.
- `I` et `O` calent début et fin sur la tête de lecture.
- **♫** aimante les syllabes sélectionnées sur le départ de note le plus proche détecté dans l'audio.
- `Ctrl+Z` annule, `Ctrl+Maj+Z` rétablit — chaque opération sur les timings est mémorisée.

### Deux raccourcis pour une ligne entière

Cale seulement la première et la dernière syllabe d'une ligne, puis (sous *autres méthodes*) :

- **♫ Poser sur les attaques** — les syllabes intermédiaires se placent sur les vrais départs de notes, trouvés par analyse spectrale de l'audio.
- **↔ Répartir régulièrement** — elles s'étalent au prorata de leur longueur.

Les deux sont instantanés, entièrement locaux, et ne demandent aucun téléchargement.

## Raccourcis

**Lecture** — `Espace` fait toujours play/pause, y compris en mode TAP.

| Action | Raccourci |
|---|---|
| Lecture / pause | `Espace` |
| Pause | `K` |
| Accélérer ×2 puis ×4 | `L` |
| Ralentir ×0,5 puis ×0,25 | `J` |
| Début / fin du morceau | `Début` / `Fin` |
| Syllabe précédente / suivante | `←` `→` |
| Ligne précédente / suivante | `↑` `↓` |

**Calage**

| Action | Raccourci |
|---|---|
| Entrer / sortir du calage | `T` — `Échap` pour sortir |
| Valider une syllabe | `F` — modifiable juste sous le bouton |
| Annuler la dernière syllabe | `Retour arrière` |
| Boucler la ligne | `B` |
| Annuler / rétablir | `Ctrl+Z` / `Ctrl+Maj+Z` |
| Décaler la sélection de ±10 ms | `Maj` + `←` `→` |
| Décaler de ±1 ms | `Maj` + `Alt` + `←` `→` |
| Début / fin sur la tête de lecture | `I` / `O` |

**Timeline**

| Action | Raccourci |
|---|---|
| Outil sélection / lame | `V` / `C` |
| Aimantation, ripple | `S`, `R` |
| Zoom avant / arrière, voir tout | `+` `−`, `F` |
| Effacer le timing de la sélection | `Suppr` |
| Supprimer les syllabes | `Maj` + `Suppr` |
| Fusionner la sélection | `M` |
| Sélectionner toute la ligne | `Ctrl` + `A` |
| Tout désélectionner | `Échap` |
| Sauver / exporter | `Ctrl` + `S` / `Ctrl` + `E` |

## Se déplacer dans le temps

- **Attrape la tête de lecture** (le triangle vert) et fais-la glisser : elle s'épaissit, le curseur passe en ↔ et l'heure exacte s'affiche à côté.
- **Glisser sur la règle ou l'onde** fait la même chose, en sautant d'abord à l'endroit cliqué.
- **Glisser le compteur** en haut de la fenêtre le transforme en molette de défilement — `Maj` pour la course rapide, `Alt` pour le réglage au millième.
- La case **♪ SCRUB** fait entendre un court extrait sous le curseur pendant que tu te déplaces.

Pendant un déplacement, la lecture est suspendue une seule fois puis reprend exactement là où tu lâches : plus de hoquet audio. Si l'aimant est actif, la tête colle aux débuts de syllabes ; `Alt` la libère.

## La timeline, comme un banc de montage

- **Clic** sur la règle ou l'onde : placer la tête de lecture. Sur un bloc : le sélectionner.
- **Glisser** le corps d'un bloc le déplace, ses bords changent début et fin. Toute la sélection suit.
- **Glisser dans le vide** trace un lasso de sélection multiple.
- **`Ctrl`+clic** ajoute ou retire un bloc, **`Maj`+clic** sélectionne toute la plage.
- **Clic droit** ouvre le menu : effacer le timing, supprimer, couper, fusionner, caler sur la tête de lecture, répartir la ligne…
- **Outil lame (`C`)** : le clic coupe une syllabe en deux à l'endroit exact, texte partagé au prorata.
- **Aimant** : les bords collent à la tête de lecture, aux syllabes voisines et à la grille 10 ms — un repère orange confirme l'accroche. `Alt` le désactive le temps d'un glissé.
- **Ripple** : déplacer une syllabe décale d'autant toutes celles qui suivent. Pratique quand un couplet entier est en retard.
- **Molette** : zoom centré sur le curseur. `Maj`+molette : défilement.

**Découpe syllabique.** L'algorithme gère les cas courants du français (`ma-gni-fi-que`, `Né-on`, `cons-tel-la-tion`). Pour corriger :

- écris un tiret dans les paroles pour forcer une coupe : `ma-gni-fi-que` ;
- ou, dans l'étape **④ AJUSTER**, `Alt`+clic coupe une syllabe en deux, `Alt`+`Maj`+clic la fusionne avec la suivante ;
- ou l'outil lame (`C`) sur la timeline, qui coupe à l'endroit exact du clic.

**Import / export de timing.** Par le menu **⋯ FICHIER** : `.ass` (les tags `{\k}` sont lus et écrits au centième de seconde), `.lrc` classique et enrichi. Tu peux partir d'un fichier karaoké existant, ou reprendre tes timings dans un autre logiciel.

**Projet.** Toujours dans **⋯ FICHIER**, *Sauver le projet* écrit un `.kfj` (paroles + timings + tous les réglages visuels). `Ctrl+S` marche aussi, même le curseur dans les paroles. L'audio n'est pas embarqué : recharge-le à l'ouverture.

## Ton travail est protégé

- **Sauvegarde automatique.** Toute modification est enregistrée dans le navigateur une seconde et demie plus tard. Si l'app se ferme mal, elle te propose de reprendre au démarrage — en indiquant l'ancienneté et le nombre de syllabes retrouvées.
- **Avertissement avant de fermer** l'onglet avec des modifications non sauvegardées.
- **`Ctrl+Z` remonte tout**, y compris un redécoupage. Rien n'efface l'historique dans ton dos.
- **Redécouper prévient.** Si des syllabes sont déjà calées, un message te le dit et te renvoie vers *Redécouper sans perdre les timings*.
- **Ouvrir un projet demande confirmation** si le travail en cours n'est pas sauvegardé.
- **Ce que tu tapes dans les paroles n'est jamais écrasé** par une opération sur la timeline.

---

## Particules

Elles naissent **sur le front de remplissage**, à l'intérieur des glyphes. Le moteur échantillonne la couverture réelle de la police (pas une boîte englobante), donc elles sortent bien des lettres.

- **Débit** : particules par seconde pendant que la syllabe se remplit.
- **Burst syllabe** : bouffée instantanée à l'attaque de chaque syllabe.
- **Bande d'émission** : épaisseur de la zone active derrière le front. Petite = filet net, grande = nappe.
- **Toute la surface** : émet depuis toute la syllabe au lieu du seul front.
- **Hérite du fill** : la particule prend la couleur exacte du dégradé à l'endroit où elle naît.
- **Graine** : change l'aléatoire. Même graine = même résultat, image par image.

Sept types : étincelles, poussière, pixels Y2K, bulles aero, éclats, étoiles, traînées.

**Performance.** Les particules tournent sur GPU (quads instanciés, un seul appel de dessin) et la simulation est en `Float32Array` sans allocation par image. Le compteur en haut à droite de l'aperçu affiche le nombre vivant. Si ça rame : baisse **Qualité aperçu** à 50 % (onglet FX → RENDU) — ça n'affecte **pas** l'export, qui est toujours rendu à la résolution pleine.

---

## Export

**MP4** — H.264 + AAC via WebCodecs, muxé image par image. Le rendu est *offline* : chaque image est calculée puis encodée, donc aucune image perdue même si la scène est lourde. Si ton navigateur propose un sélecteur de fichier, la vidéo est écrite directement sur le disque en streaming (pas de limite mémoire).

**Séquence PNG** — pour un vrai canal alpha (After Effects, Premiere, Resolume, TouchDesigner). Mets d'abord **FX → FOND → Type** sur `Transparent (alpha)`.

L'app choisit la meilleure destination disponible : un **dossier** si le navigateur propose un sélecteur (le mieux, sans limite de taille), sinon un **.zip écrit directement sur le disque**, sinon un **.zip téléchargé** — ce dernier passe partout, y compris en `file://`, mais reste borné par la mémoire (l'export s'arrête proprement au-delà de ~3,4 Go en te disant de choisir un dossier).

**Déterminisme.** La simulation de particules avance par pas fixe avec un générateur aléatoire à graine, et un pré-roll de 1,2 s est simulé avant la première image exportée. Deux exports identiques donnent le même fichier, image pour image.

---

## Notes

- Charge ta propre police avec **A FONT** (`.ttf`, `.otf`, `.woff2`) — ou glisse-la simplement dans la fenêtre.
- La résolution d'export se choisit dans **FX → RENDU** (jusqu'au 4K, formats 16:9, 9:16, 1:1).
- Double-clic sur la valeur d'un curseur pour revenir à sa valeur par défaut.
- Clic sur le titre d'un groupe de réglages pour le replier.
