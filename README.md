# KARAOKE FORGE

> Un studio de karaoké animé, dans un seul fichier HTML — pour fabriquer des vidéos de karaoké ou des visuels de paroles pour du VJing.

![Platform](https://img.shields.io/badge/platform-Web%20(Chrome%20%7C%20Edge)%20%7C%20Windows-informational) ![Stack](https://img.shields.io/badge/stack-HTML%20%2B%20JS%20%2B%20WebGL2-blue)

**[Site & mode d'emploi](https://elisalien.github.io/karaoke-forge/)** · **[Guide complet](GUIDE.md)** · **[Télécharger](https://github.com/elisalien/karaoke-forge/archive/refs/heads/main.zip)**

## À propos

Cale tes paroles à l'oreille, choisis une ambiance, exporte en MP4 ou en séquence PNG avec canal alpha.
Aucune installation, aucun compte, aucune donnée envoyée : tout tourne dans ton navigateur.

Un outil autonome pour fabriquer des vidéos de karaoké — ou des visuels de paroles pour du VJing.
Le tout tient dans `karaoke-forge.html` : 280 Ko, zéro dépendance, zéro réseau.

## Fonctionnalités

- **Calage à l'oreille** — tu frappes une touche sur chaque syllabe pendant que le morceau joue, au ralenti si besoin.
- **Timeline de montage** — sélection, lame, aimantation, ripple, annuler/rétablir sur chaque opération.
- **Découpe syllabique du français** — automatique, corrigeable au tiret ou à la souris.
- **Cinq ambiances** — Chrome Y2K, Néon Rose, Holo Aero, Terminal, Minimal. 97 réglages en mode expert.
- **Particules GPU** — émises sur le front de remplissage, à l'intérieur des glyphes.
- **Export déterministe** — MP4 (H.264/AAC, WebCodecs) ou séquence PNG en alpha, rendus hors temps réel : aucune image perdue.
- **Vie privée** — aucune requête réseau, aucun compte, aucune télémétrie. Ton audio et tes paroles ne quittent jamais la machine. La sauvegarde automatique écrit dans le stockage local du navigateur, rien d'autre.

## Installation

**Navigateur requis :** Chrome ou Edge récent (l'export MP4 utilise WebCodecs). Firefox et Safari font tourner l'app mais pas l'export vidéo.

### Le plus simple

Télécharge [**INSTALLER.bat**](https://raw.githubusercontent.com/elisalien/karaoke-forge/main/INSTALLER.bat) et double-clique dessus.
Il récupère la dernière version, l'installe dans `Documents\Karaoke Forge` et pose un raccourci sur le bureau.

### À la main

1. [Télécharge le dépôt en `.zip`](https://github.com/elisalien/karaoke-forge/archive/refs/heads/main.zip) et décompresse-le.
2. Double-clique sur **`START-FORGE.bat`**.

### Sans rien du tout

Ouvre `karaoke-forge.html` directement dans Chrome ou Edge. Tout fonctionne, sauf l'export en séquence PNG vers un dossier — il repasse par un `.zip`.

> **Pourquoi un lanceur ?** `START-FORGE.bat` démarre un petit serveur local (Python ou Node, selon ce qui est présent) et ouvre l'app dans une fenêtre sans onglets. Le serveur ne sert qu'à débloquer le sélecteur de dossier pour l'export PNG — il n'écoute que sur `127.0.0.1` et rien ne sort de la machine.

## Utilisation

### Le parcours, en quatre étapes

| | | |
|---|---|---|
| **①** | **AUDIO** | Dépose ton fichier, ou clique la zone. |
| **②** | **PAROLES** | Colle le texte, clique **DÉCOUPER EN SYLLABES**. |
| **③** | **CALAGE** | **◈ CALER EN ÉCOUTANT** : tu frappes une touche sur chaque syllabe. |
| **④** | **AJUSTER** | Tu peaufines à la souris et au clavier. |

Puis le style à droite, et **⏺ EXPORTER**.

Le panneau de gauche **est** le mode d'emploi : chaque étape se referme quand elle est faite et ouvre la suivante.

### Raccourcis essentiels

| Action | Raccourci |
|---|---|
| Lecture / pause | `Espace` |
| Ralentir / accélérer | `J` / `L` |
| Entrer dans le calage | `T` |
| Valider une syllabe | `F` |
| Annuler la dernière syllabe | `Retour arrière` |
| Boucler la ligne | `B` |
| Annuler / rétablir | `Ctrl+Z` / `Ctrl+Maj+Z` |
| Décaler la sélection de ±10 ms | `Maj` + `←` `→` |
| Sauver / exporter | `Ctrl+S` / `Ctrl+E` |

La liste complète est dans le [**guide**](GUIDE.md#raccourcis).

### Export

**MP4** — H.264 + AAC via WebCodecs, muxé image par image. Rendu hors temps réel : chaque image est calculée puis encodée, donc aucune image perdue même sur une scène lourde.

**Séquence PNG** — pour un vrai canal alpha (After Effects, Premiere, Resolume, TouchDesigner). Mets d'abord **FX → FOND → Type** sur `Transparent (alpha)`.

Deux exports avec les mêmes réglages donnent le même fichier, image pour image : la simulation de particules avance par pas fixe avec un générateur aléatoire à graine.

### Formats

| | |
|---|---|
| **Projet** | `.kfj` — paroles, timings et tous les réglages visuels (l'audio n'est pas embarqué) |
| **Timing** | `.ass` (tags `{\k}`, lus et écrits) · `.lrc` classique et enrichi |
| **Polices** | `.ttf` · `.otf` · `.woff2` — par le bouton **A FONT** ou par glisser-déposer |
| **Sortie** | `.mp4` · séquence `.png` (dossier ou `.zip`) |

## Structure du projet

```
karaoke-forge.html    l'application entière — un seul fichier, aucune dépendance
START-FORGE.bat       lanceur Windows (serveur local + fenêtre propre)
_forge-server.js      serveur statique minimal, utilisé par le lanceur si Node est présent
INSTALLER.bat         installation en un double-clic (télécharge + raccourci bureau)
GUIDE.md              le mode d'emploi complet
docs/index.html       la page publiée sur GitHub Pages
```

## Stack technique

HTML / CSS / JavaScript dans un seul fichier, WebGL2 (particules), WebCodecs (export MP4 H.264/AAC), lanceur Windows `.bat` avec serveur local Python (`http.server`) ou Node.js.

## Crédits & licence

Fait pour la scène. Aucune licence n'est spécifiée — tous droits réservés.
[Signaler un problème](https://github.com/elisalien/karaoke-forge/issues).

---

<p align="center">
  Fait par <a href="https://github.com/elisalien">Élisalien</a> ·
  <a href="https://gitlab.com/elisalien/catalog">Catalogue des shaders, sources & logiciels</a>
</p>
