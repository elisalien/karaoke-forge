<div align="center">

# KARAOKE FORGE

**Prépare tes karaokés animés, puis joue-les en live — dans un seul fichier HTML.**

Cale tes paroles à l'oreille, choisis une ambiance, exporte en MP4 ou en séquence PNG avec canal alpha,
ou envoie-les en direct dans Resolume et OBS.

[**→ Site & mode d'emploi**](https://elisalien.github.io/karaoke-forge/) · [**→ Guide complet**](GUIDE.md) · [**→ Télécharger**](https://github.com/elisalien/karaoke-forge/archive/refs/heads/main.zip)

</div>

---

## Ce que c'est

Un outil autonome pour fabriquer des vidéos de karaoké **et** afficher des paroles en soirée, pour du VJing.
L'application tient dans `karaoke-forge.html` : aucune installation, aucun compte.

Trois espaces de travail, en haut de la fenêtre :

| | | |
|---|---|---|
| **① PRÉPARER** | audio, paroles, calage | Tu frappes une touche sur chaque syllabe pendant que le morceau joue, au ralenti si besoin. Timeline de montage, annuler/rétablir sur chaque opération. |
| **② STYLE** | le look | Huit ambiances prêtes, une centaine de réglages, particules GPU nées dans les lettres, réactions au rythme. |
| **③ LIVE** | la soirée | Un set de morceaux prêts, un écran scène sans interface à capturer, un pilotage pensé pour le clavier — que le son vienne de l'app ou des platines. |

- **Paroles en ligne** — recherche LRCLIB intégrée ; les versions synchronisées arrivent avec le début de chaque ligne, les syllabes se posent ensuite sur les attaques de l'audio.
- **Bibliothèque hors ligne** — `Ctrl+S` range le morceau, audio compris, dans le navigateur.
- **Son extérieur** — quand la musique vient d'ailleurs, les paroles déroulent sur l'horloge de l'app : ligne suivante, recalage ±100 ms, mode ligne par ligne.
- **Rythme** — tempo détecté dans l'audio, TAP, ou Ableton Link via le companion.
- **Export déterministe** — MP4 (H.264/AAC, WebCodecs) ou séquence PNG en alpha, rendus hors temps réel.

## Installation

### Le plus simple

Télécharge [**INSTALLER.bat**](https://raw.githubusercontent.com/elisalien/karaoke-forge/main/INSTALLER.bat) et double-clique dessus.
Il récupère la dernière version, l'installe dans `Documents\Karaoke Forge` et pose un raccourci sur le bureau.

### À la main

1. [Télécharge le dépôt en `.zip`](https://github.com/elisalien/karaoke-forge/archive/refs/heads/main.zip) et décompresse-le.
2. Double-clique sur **`START-FORGE.bat`**.

### Sans rien du tout

Ouvre `karaoke-forge.html` directement dans Chrome ou Edge. Tout fonctionne, sauf l'export PNG vers un dossier (il repasse par un `.zip`).

> **Pourquoi un lanceur ?** `START-FORGE.bat` démarre un petit serveur local (Python ou Node) et ouvre l'app dans une fenêtre sans onglets. Il débloque le sélecteur de dossier de l'export PNG, et lance aussi le companion si Node est présent. Tout n'écoute que sur `127.0.0.1`.

**Navigateur requis :** Chrome ou Edge récent (WebGL2, WebCodecs).

## Le companion (facultatif)

`START-COMPANION.bat` lance un petit service local, sans dépendance, pour ce que le navigateur ne sait pas faire seul :
**Ableton Link** (via [Carabiner](https://github.com/Deep-Symmetry/carabiner)) et **l'audio de vidéos YouTube** (via yt-dlp).
Voir [companion/LISEZ-MOI.md](companion/LISEZ-MOI.md).

## Raccourcis essentiels

| Préparer | | Live | |
|---|---|---|---|
| `Espace` | lecture / pause | `Espace` | lecture / pause |
| `T` | entrer dans le calage | `←` `→` | ligne précédente / suivante |
| `F` | valider une syllabe (tenir = note longue) | `↑` `↓` | paroles en avance / en retard |
| `Retour arrière` | annuler la dernière syllabe | `1`…`9` · `Entrée` | charger un morceau du set |
| `Ctrl+Z` | annuler | `N` · `K` · `T` | masquer le texte · fond vert · tap tempo |
| `Ctrl+S` | ranger dans la bibliothèque | `Alt+1` `2` `3` | changer d'espace |

La liste complète est dans le [**guide**](GUIDE.md) et dans l'app (`F1`).

## Vie privée

Aucun compte, aucune télémétrie. L'audio et les paroles restent sur la machine, dans le stockage du navigateur.
Une seule chose sort, et seulement quand tu cliques **Chercher** : le texte de ta recherche de paroles, envoyé à [lrclib.net](https://lrclib.net).

## Pour faire évoluer l'app

Le fichier distribué est assemblé à partir de `src/` :

```
src/index.html      squelette de la page
src/body.html       l'interface
src/css/            les styles
src/js/NN-*.js      le code, recollé dans l'ordre des numéros (une seule portée partagée)
src/vendor/         mp4-muxer (MIT)
tools/build.mjs     l'assemblage — aucune dépendance
companion/          le service local facultatif
```

Après une modification :

```bash
node tools/build.mjs --check
```

`MAJ-KARAOKE-FORGE.bat` (dossier parent) reconstruit puis publie sur GitHub.

---

<div align="center">
<sub>Fait pour la scène. Tous droits réservés — <a href="https://github.com/elisalien/karaoke-forge/issues">signaler un problème</a>.</sub>
</div>
