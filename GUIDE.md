# Karaoke Forge — le guide complet

Lance **Karaoke Forge** depuis le menu Démarrer, le bureau, ou l'exécutable portable. Pas de navigateur, pas de serveur : une fenêtre.

Dans l'app, **`F1`** (ou `?`) ouvre l'aide, et **Mode survol** explique chaque bouton que tu survoles.

---

## Trois espaces de travail

En haut à gauche, ou **`Alt+1`**, **`Alt+2`**, **`Alt+3`** :

| | |
|---|---|
| **1 Préparer** | Charger l'audio, les paroles, caler chaque syllabe, ranger le morceau. |
| **2 Style** | L'ambiance : typo, couleurs, particules, décor, réactions au rythme. |
| **3 Live** | La soirée : le set, l'écran scène pour Resolume ou OBS, le pilotage au clavier. |

L'en-tête s'adapte : les vitesses de lecture n'apparaissent qu'en Préparer ; en Live, Enregistrer, Fichier et Exporter disparaissent et `Ctrl+S` comme `Ctrl+Z` sont neutres. **Pendant le show, aucune fausse manip ne peut toucher un morceau.**

### Annuler

`Ctrl+Z` annule, `Ctrl+Maj+Z` rétablit — aussi par les deux flèches ↶ ↷ de l'en-tête, dont l'infobulle dit ce qui va être annulé.

- En **Préparer**, l'annulation porte sur les timings et les paroles. La sélection reste en place : tu peux annuler un décalage et recommencer autrement.
- En **Style**, elle porte sur les réglages et les ambiances. Une ambiance s'annule en une étape.
- Une rafale (flèches tenues, curseur qu'on glisse, frappes de calage) ne compte que pour une étape.
- En plein calage, `Ctrl+Z` recule d'une syllabe, comme `Retour arrière`.

---

## 1 Préparer — le parcours

Le panneau de gauche est le mode d'emploi. L'étape utile s'ouvre d'elle-même ; un clic sur un titre y revient.

| | | |
|---|---|---|
| **1** | **Audio** | Dépose ton fichier ou clique la zone. *Depuis YouTube* récupère l'audio d'une vidéo. |
| **2** | **Paroles** | Colle le texte et clique **Découper en syllabes** — ou *Chercher les paroles en ligne*. |
| **3** | **Calage** | **Caler en écoutant** : tu frappes une touche sur chaque syllabe. |
| **4** | **Ajuster** | Tu peaufines à la souris et au clavier, ligne par ligne. |
| **5** | **Ranger** | **Ctrl+S** : le morceau part dans la bibliothèque, prêt pour le live. |

Pas d'audio ? Prépare quand même les paroles : en live, elles se déroulent sur l'horloge de l'app.

### Paroles en ligne

*Chercher les paroles en ligne* interroge [LRCLIB](https://lrclib.net), une base gratuite. Seul le texte cherché part sur le réseau, et seulement au clic.

- Une version **synchronisée** arrive avec le début de chaque ligne déjà posé. Charge l'audio, puis **3 → Autres méthodes → Poser sur les attaques** : les syllabes se placent sur les vrais départs de notes.
- Une version **texte seul** remplit les paroles ; il reste à les caler.
- Vérifie que la durée affichée correspond à ton audio : une autre version du morceau décalerait tout. L'app te prévient si l'écart dépasse 3 secondes.

### Caler en écoutant

**Caler en écoutant** lance la lecture un peu avant le point de reprise et affiche en grand la syllabe à frapper, la précédente et les suivantes.

- **Frappe** la touche de calage (`F` par défaut, modifiable à côté du bouton) au début de chaque syllabe.
- **Tiens-la** sur la dernière syllabe d'une ligne : la note reste à l'écran tant que tu tiens. Un simple tap donne une fin raisonnable, sans jamais remplir tout le silence jusqu'à la ligne suivante.
- **`Retour arrière`** ou `Ctrl+Z` annule la dernière et recule un peu.
- **Reprendre à la syllabe choisie** repart d'une syllabe précise.

**Ralentis la musique** avec `0.25×` `0.5×` `0.75×` `1×` en haut. Les timings restent ceux du morceau à vitesse normale, et la latence de la carte son est compensée. Si tes frappes tombent toujours un peu en retard, règle **Décalage frappe** sous *Autres méthodes*.

### Ajuster

L'étape 4 ne montre que la **ligne sélectionnée** (`↑` `↓` pour changer, *Toutes les lignes* pour tout voir) : la timeline montre déjà l'ensemble.

- **Boucle** (`B`, dans la barre de la timeline) rejoue la ligne en boucle.
- `Maj`+`←` `→` décale la sélection de 10 ms, `Maj`+`Alt`+flèches de 1 ms — une syllabe ne traverse jamais sa voisine.
- `I` et `O` calent début et fin sur la tête de lecture.
- **Sur l'attaque** aimante les syllabes sélectionnées sur le départ de note le plus proche.
- **Effacer le calage de la phrase** remet la ligne à zéro, le texte reste.

Cale seulement la première et la dernière syllabe d'une ligne, puis **Poser sur les attaques** ou **Répartir régulièrement** place les autres.

---

## La timeline

| Geste | Effet |
|---|---|
| Clic sur la règle ou l'onde | placer la tête de lecture ; glisser pour la déplacer |
| Clic sur une syllabe | la sélectionner et s'y placer — **un clic ne déplace jamais rien** |
| Glisser le corps d'une syllabe | déplacer la syllabe et toute la sélection ; l'infobulle affiche le temps et l'écart en direct |
| Glisser un bord | changer le début ou la fin (le curseur devient ↔) ; les blocs étroits gardent des poignées |
| Glisser une ligne (piste du milieu) | déplacer toute la ligne d'un bloc |
| Glisser dans le vide | lasso de sélection — `Alt` retire de la sélection |
| `Ctrl`+clic · `Maj`+clic | ajouter / retirer · sélectionner une plage |
| Double-clic | zoomer sur la ligne ; sur la règle : tout voir, sans déplacer la tête |
| Clic droit | menu : effacer, couper, fusionner, aimanter, boucler… |
| Molette | zoom centré sur le curseur ; `+` `−` zooment autour de la tête |
| `Maj`+molette · clic molette · pavé tactile horizontal | faire défiler |
| `Alt` pendant un glissé | désactiver l'aimantation |
| `Échap` pendant un glissé | annuler le geste : rien ne bouge |

Un glissé ne commence qu'après quelques pixels. Une syllabe s'arrête au contact de sa voisine au lieu de la traverser. **Décaler la suite** emmène tout ce qui suit.

**Suivre** : la vue suit la lecture. Si tu défiles toi-même pendant la lecture, le suivi se met en pause (le bouton passe en pointillés) jusqu'au prochain déplacement de la tête.

**Aimant (`S`)** : les bords collent à la tête de lecture, aux syllabes voisines, aux **attaques détectées dans l'audio** (les petits traits sous la règle), puis à la grille 10 ms. **Lame (`C`)** : le clic coupe une syllabe en deux à l'endroit exact. Le survol affiche le temps sous le curseur dans la règle.

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
| Fusionner · sélectionner la ligne (deux fois : tout) | `M` · `Ctrl+A` |
| Ranger · exporter le projet · exporter la vidéo | `Ctrl+S` · `Ctrl+Maj+S` · `Ctrl+E` |

**Découpe syllabique.** L'algorithme gère les cas courants du français. Pour corriger : un tiret dans les paroles (`ma-gni-fi-que`), `Alt`+clic dans la liste pour couper, `Alt`+`Maj`+clic pour fusionner, ou l'outil lame.

---

## 2 Style

Huit **ambiances** changent tout d'un coup : **Chrome Y2K** · **Néon rose** · **Holo Aero** · **Terminal** · **Minimal** · **Kawaii** · **Sakura** · **Frutiger**. Dès que tu touches un réglage, l'ambiance n'est plus surlignée : c'est la tienne.

**Simple** n'affiche que l'essentiel, **Expert** ouvre tout. Les réglages sans objet se cachent d'eux-mêmes (les couleurs 2 et 3 d'un fond uni, le flou d'une ombre désactivée…). Double-clic sur la valeur d'un curseur pour revenir au défaut. Le mode et l'onglet ouverts sont mémorisés.

En Style, la timeline sert à se repérer : aucune touche n'y modifie les timings.

**Anticipation** (Texte → Mise en page) affiche la ligne suivante un peu avant qu'elle soit chantée, dès que la précédente est finie.

### Particules

Elles naissent sur le front de remplissage, à l'intérieur des glyphes. Onze formes : étincelles, poussière, pixels, bulles, éclats, étoiles, traînées, pétales, notes, confettis, cœurs. **Graine** : même graine, même résultat, image par image.

### Rythme

Onglet **Rythme** : coche **Réagir au rythme**, puis donne le tempo.

- **Détecter dans l'audio** trouve le tempo et cale la grille sur le morceau.
- **Tap** (touche `T` dans Style et Live) : frappe au moins deux fois en rythme.
- **÷2** · **×2** corrigent une erreur d'octave ; **Caler** dit « le temps, c'est maintenant ».
- Source **Morceau** : la grille suit l'audio et se retrouve à l'identique à l'export. **Tap** et **Link** suivent l'horloge murale, pour le live.

Réactions : pulsation du texte, éclat du halo et du bloom, rafale de particules sur chaque temps, sécheresse de la retombée.

---

## 3 Live

### Le set

- La **bibliothèque** contient tout ce que tu as rangé avec `Ctrl+S`, audio compris, disponible hors ligne. **Éditer** rouvre un morceau dans Préparer. **Supprimer** demande confirmation : c'est définitif.
- Le **set** est la liste de la soirée : **+ Set** depuis la bibliothèque ou depuis *Chercher des paroles en ligne*. `↑` `↓` pour l'ordre.
- Clic : charger. Double-clic : charger et lancer. `1`…`9` chargent directement, `Entrée` passe au suivant.
- **Garder l'ambiance en cours** : un look constant pour toute la soirée, quel que soit le style rangé avec chaque morceau.

### Jouer

| | |
|---|---|
| **Audio du morceau** | L'app joue le son rangé avec le morceau ; les paroles suivent à la milliseconde. |
| **Son extérieur** | La musique vient des platines. Les paroles se déroulent sur l'horloge de l'app : lance-les sur la première ligne chantée, recale avec les flèches. |
| **Continu** | Les paroles défilent seules. |
| **Ligne par ligne** | Chaque ligne se joue puis s'arrête ; `→` lance la suivante. Le filet de sécurité quand le DJ ne suit pas la version calée. |

Le recalage ±0,1 s est un réglage de soirée : il n'est pas enregistré dans le morceau et s'oublie en quittant le Live.

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

**Ouvrir l'écran scène** ouvre une seconde fenêtre qui n'affiche que l'image. Glisse-la sur le second écran, double-clic (ou `F`) pour le plein écran ; le curseur disparaît tout seul. Pendant ce temps l'aperçu de la fenêtre de contrôle se met en pause pour épargner le GPU — coche *Garder l'aperçu ici aussi* si ta machine suit.

- **Resolume** : source *Screen Capture* sur la fenêtre, ou OBS en intermédiaire (capture de fenêtre → NDI ou Spout).
- **Incrustation** : fond **Vert** ou **Bleu**, puis un chroma key. Grille, vignette, grain et aberration sont coupés automatiquement et reviennent sur **Ambiance**.

---

## Companion : Ableton Link et YouTube

Dans l'application de bureau, le companion tourne déjà. Il apporte :

- **Ableton Link** : lance [Carabiner](https://github.com/Deep-Symmetry/carabiner), puis choisis la source **Link** dans Rythme.
- **Audio YouTube** : étape 1 → *Depuis YouTube*. Dépose `yt-dlp.exe` et `ffmpeg.exe` dans le dossier indiqué à l'écran.

En mode navigateur (`START-FORGE.bat`), il faut Node.js ; détails dans [companion/LISEZ-MOI.md](companion/LISEZ-MOI.md).

---

## Ton travail est protégé

- **Sauvegarde automatique** une seconde et demie après chaque modification. Au démarrage, l'app propose de reprendre, et recharge l'audio depuis la bibliothèque si le morceau y est.
- **Avertissement** avant de fermer ou de remplacer des timings non rangés.
- **`Ctrl+Z` remonte tout**, y compris un redécoupage, un import, l'effacement de tous les timings — et ce que tu tapes dans les paroles.
- **En Live, rien ne s'enregistre** : le set de la soirée ne peut pas être abîmé par une fausse touche.

Pour transporter un morceau d'une machine à l'autre : **Fichier → Exporter le projet (.kfj)**.

---

## Export

**MP4** — H.264 + AAC, rendu image par image : aucune image perdue. Si l'app propose un sélecteur de fichier, la vidéo est écrite directement sur le disque. Si la machine n'a pas d'encodeur audio, l'app prévient : la vidéo sera muette.

**Séquence PNG** — pour un vrai canal alpha (After Effects, Premiere, Resolume, TouchDesigner). Règle d'abord **Décor → Fond → Type** sur `Transparent (alpha)`. Destination : un dossier.

**Déterminisme.** Particules à pas fixe et graine, pré-roll de 1,2 s, grille rythmique calée sur le morceau : deux exports identiques donnent le même fichier.

## Formats

| | |
|---|---|
| **Bibliothèque** | dans l'application : paroles, timings, style et audio |
| **Projet** | `.kfj` — paroles, timings et réglages (sans l'audio) |
| **Timings** | `.ass` (`{\k}` lus et écrits) · `.lrc` classique, enrichi, refrains multiples, `[offset:]` — menu Fichier → Importer |
| **Polices** | `.ttf` · `.otf` · `.woff2` — menu Fichier ou glisser-déposer |
| **Sortie** | `.mp4` jusqu'en 4K · séquence `.png` en 16:9, 9:16 ou 1:1 |

Glisse n'importe quel fichier dans la fenêtre : audio, paroles `.txt`, timings, projet ou police.

## Performance

En mode Expert, le compteur en haut à droite de l'aperçu indique les particules vivantes. Si ça rame : baisse **Qualité aperçu** (Décor → Rendu) ou **Max particules**. L'export reste toujours en pleine résolution.
