# Companion de Karaoke Forge

Petit programme qui fait ce qu'une page web ne sait pas faire seule :

- **Ableton Link** — relaie le tempo et la phase de Carabiner vers l'app (onglet Rythme, source Link) ;
- **Audio YouTube** — cherche une vidéo et récupère son audio en MP3 (étape 1 Audio → *Depuis YouTube*).

Sans lui, tout le reste de Karaoke Forge fonctionne.

## Dans l'application de bureau

Rien à lancer : le companion démarre et s'arrête avec l'application.

- Les binaires `yt-dlp.exe` et `ffmpeg.exe` vont dans le dossier `bin` du profil de l'application
  (`%AppData%\Karaoke Forge\bin`). Le chemin exact s'affiche dans l'app, étape 1 → *Depuis YouTube*.
- Les MP3 téléchargés sont gardés dans `%AppData%\Karaoke Forge\cache-youtube`.

## En mode navigateur

Double-clic sur **`START-COMPANION.bat`** (dossier de l'app), ou `START-FORGE.bat` le lance en même temps que l'app. Il faut [Node.js](https://nodejs.org). Aucune installation de paquet : le companion n'a aucune dépendance.

Il n'écoute que sur `127.0.0.1:17002` et ne répond qu'à l'app ouverte sur cette machine.

## Ableton Link

Installe et lance [Carabiner](https://github.com/Deep-Symmetry/carabiner) (il écoute sur le port 17000). Le companion s'y connecte tout seul et réessaie toutes les 5 secondes.

## YouTube

Le companion cherche `yt-dlp` (et `ffmpeg` pour la conversion en MP3), dans cet ordre :

1. le dossier indiqué par la variable d'environnement `YT_BIN_DIR` (l'application de bureau la règle sur son dossier `bin`) ;
2. un dossier `bin` à côté de `forge-companion.js` ;
3. le `PATH` de Windows.

Un second téléchargement du même lien est immédiat : les MP3 restent en cache.

## Réglages avancés

| Variable | Défaut | Rôle |
|---|---|---|
| `FORGE_COMPANION_PORT` | `17002` | port HTTP du companion (l'app attend 17002) |
| `CARABINER_PORT` | `17000` | port de Carabiner |
| `YT_BIN_DIR` | — | dossier contenant yt-dlp et ffmpeg |
| `FORGE_CACHE_DIR` | `companion/.cache` | dossier des MP3 téléchargés |
