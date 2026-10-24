<div align="center">

# KARAOKE FORGE

**Prépare tes karaokés animés, puis joue-les en live — une application de bureau, rien d'autre à installer.**

Cale tes paroles à l'oreille, choisis une ambiance, exporte en MP4 ou en séquence PNG avec canal alpha,
ou envoie-les en direct dans Resolume et OBS.

[**→ Site & mode d'emploi**](https://elisalien.github.io/karaoke-forge/) · [**→ Guide complet**](GUIDE.md) · [**→ Dernière version**](https://github.com/elisalien/karaoke-forge/releases)

</div>

---

## Ce que c'est

Un outil autonome pour fabriquer des vidéos de karaoké **et** afficher des paroles en soirée, pour du VJing.
Aucun compte, aucune télémétrie, tout reste sur la machine.

Trois espaces de travail, en haut de la fenêtre :

| | | |
|---|---|---|
| **1 Préparer** | audio, paroles, calage | Tu frappes une touche sur chaque syllabe pendant que le morceau joue, au ralenti si besoin. Timeline de montage, annulation sur chaque opération. |
| **2 Style** | le look | Huit ambiances prêtes, une centaine de réglages, particules GPU nées dans les lettres, réactions au rythme. |
| **3 Live** | la soirée | Un set de morceaux prêts, un écran scène sans interface à capturer, un pilotage au clavier — que le son vienne de l'app ou des platines. En Live, rien ne peut modifier un morceau. |

- **Paroles en ligne** — recherche LRCLIB intégrée ; les versions synchronisées arrivent avec le début de chaque ligne, les syllabes se posent ensuite sur les attaques de l'audio.
- **Bibliothèque hors ligne** — `Ctrl+S` range le morceau, audio compris.
- **Son extérieur** — quand la musique vient d'ailleurs, les paroles déroulent sur l'horloge de l'app : ligne suivante, recalage ±100 ms, mode ligne par ligne.
- **Rythme** — tempo détecté dans l'audio, tap, ou Ableton Link via le companion intégré.
- **Export déterministe** — MP4 (H.264/AAC) ou séquence PNG en alpha, rendus hors temps réel.

## Installation

**Windows 10 / 11, 64 bits.** Deux fichiers au choix dans la [dernière version](https://github.com/elisalien/karaoke-forge/releases) :

| | |
|---|---|
| `Karaoke-Forge-Setup-x.y.z.exe` | Installeur classique : raccourci sur le bureau et dans le menu Démarrer, désinstallation propre. |
| `Karaoke-Forge-x.y.z-portable.exe` | Un seul fichier à lancer, à poser sur une clé USB. Rien n'est installé. |

Windows SmartScreen peut demander confirmation la première fois (l'application n'est pas signée) : « Informations complémentaires » → « Exécuter quand même ».

La bibliothèque (morceaux, audio, set) est rangée dans le profil Windows de l'application. Pour transporter un morceau d'une machine à l'autre : **Fichier → Exporter le projet (.kfj)**.

### Companion : Ableton Link et audio YouTube

Le companion est **intégré** à l'application de bureau. Il n'y a rien à lancer :

- **Ableton Link** — lance [Carabiner](https://github.com/Deep-Symmetry/carabiner), puis choisis la source **Link** dans l'onglet Rythme.
- **Audio YouTube** — dépose `yt-dlp.exe` et `ffmpeg.exe` dans le dossier `bin` du profil de l'application. Le chemin exact s'affiche à l'étape 1 → *Depuis YouTube*.

### Sans installer : dans le navigateur

Le cœur de l'application est un seul fichier, `karaoke-forge.html`. Télécharge le [code source](https://github.com/elisalien/karaoke-forge/archive/refs/heads/main.zip) et décompresse-le ; double-clic sur **`START-FORGE.bat`** ouvre l'app dans Chrome ou Edge avec un petit serveur local, et lance le companion si Node.js est présent (`START-COMPANION.bat` le lance seul). Voir [companion/LISEZ-MOI.md](companion/LISEZ-MOI.md).

Il n'y a plus de script d'installation (`INSTALLER.bat`) : l'installeur `.exe` de la [dernière version](https://github.com/elisalien/karaoke-forge/releases/latest) le remplace.

## Raccourcis essentiels

| Préparer | | Live | |
|---|---|---|---|
| `Espace` | lecture / pause | `Espace` | lecture / pause |
| `T` | entrer dans le calage | `←` `→` | ligne précédente / suivante |
| `F` | poser une syllabe (tenir = note longue) | `↑` `↓` | paroles en avance / en retard |
| `Retour arrière` | annuler la dernière syllabe | `1`…`9` · `Entrée` | charger un morceau du set |
| `Ctrl+Z` | annuler (timings en Préparer, réglages en Style) | `N` · `K` · `T` | masquer le texte · fond vert · tap tempo |
| `Ctrl+S` | ranger dans la bibliothèque | `Alt+1` `2` `3` | changer d'espace |

La liste complète est dans le [**guide**](GUIDE.md) et dans l'app (`F1`).

## Vie privée

Aucun compte, aucune télémétrie. L'audio et les paroles restent sur la machine.
Une seule chose sort, et seulement quand tu cliques **Chercher** : le texte de ta recherche de paroles, envoyé à [lrclib.net](https://lrclib.net).

## Pour faire évoluer l'app

```
src/index.html      squelette de la page
src/body.html       l'interface
src/css/app.css     les styles (thème « studio sombre »)
src/js/NN-*.js      le code, recollé dans l'ordre des numéros (une seule portée partagée)
src/js/98-selftest.js   l'autotest en page
src/vendor/         mp4-muxer (MIT)
tools/build.mjs     l'assemblage du fichier unique — aucune dépendance
tools/smoke.mjs     reconstruit l'app et lance l'autotest dans Electron
desktop/            la coque de bureau (Electron) : main.js, prepare.mjs, make-icon.mjs
companion/          Ableton Link et yt-dlp, embarqué dans l'app de bureau
```

`karaoke-forge.html` est **généré** : on ne le modifie jamais à la main. Après une modification dans `src/` :

```bash
node tools/build.mjs --check
```

L'autotest (découpage, calage, glissé, annulation, réglages, enregistrement) tourne dans la vraie coque, fenêtre cachée :

```bash
node tools/smoke.mjs
```

Construire l'application de bureau (installeur + portable dans `desktop/dist/`) :

```bash
cd desktop && npm install && npm run dist
```

---

<div align="center">
<sub>Fait pour la scène. Tous droits réservés — <a href="https://github.com/elisalien/karaoke-forge/issues">signaler un problème</a>.</sub>
</div>
