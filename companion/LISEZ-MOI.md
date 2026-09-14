# Companion de Karaoke Forge

Petit programme **facultatif** qui fait ce qu'un navigateur ne sait pas faire seul :

- **Ableton Link** — relaie le tempo et la phase de Carabiner vers l'app (onglet RYTHME, source LINK) ;
- **Audio YouTube** — cherche une vidéo et récupère son audio en MP3 (étape ① AUDIO → *depuis YouTube*).

Sans lui, tout le reste de Karaoke Forge fonctionne.

## Lancer

Double-clic sur **`START-COMPANION.bat`** (dossier de l'app). Il faut [Node.js](https://nodejs.org). Aucune installation de paquet : le companion n'a aucune dépendance.

Il n'écoute que sur `127.0.0.1:17002` et ne répond qu'à l'app ouverte sur cette machine.

## Ableton Link

Installe et lance [Carabiner](https://github.com/Deep-Symmetry/carabiner) (il écoute sur le port 17000). Le companion s'y connecte tout seul et réessaie toutes les 5 secondes.

## YouTube

Le companion cherche `yt-dlp` (et `ffmpeg` pour la conversion en MP3), dans cet ordre :

1. le dossier indiqué par la variable d'environnement `YT_BIN_DIR` ;
2. un dossier `bin` à côté de `forge-companion.js` — le plus simple : dépose-y `yt-dlp.exe` et `ffmpeg.exe` ;
3. le `PATH` de Windows.

Les MP3 téléchargés sont gardés dans `companion/.cache` : un second téléchargement du même lien est immédiat.

## Réglages avancés

| Variable | Défaut | Rôle |
|---|---|---|
| `FORGE_COMPANION_PORT` | `17002` | port HTTP du companion (l'app attend 17002) |
| `CARABINER_PORT` | `17000` | port de Carabiner |
| `YT_BIN_DIR` | — | dossier contenant yt-dlp et ffmpeg |
