@echo off
setlocal enableextensions
title Karaoke Forge - companion
cd /d "%~dp0"

rem ============================================================
rem   Companion facultatif : Ableton Link (Carabiner) et audio
rem   YouTube (yt-dlp). Laisse cette fenetre ouverte pendant le
rem   live ; ferme-la pour l'arreter.
rem ============================================================

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo    Node.js est necessaire pour le companion.
  echo    Installe-le depuis https://nodejs.org puis relance.
  echo.
  echo    Sans companion, Karaoke Forge fonctionne quand meme :
  echo    seuls Ableton Link et l'audio YouTube sont indisponibles.
  echo.
  pause
  exit /b 1
)

echo.
echo    K A R A O K E   F O R G E  -  companion
echo    ---------------------------------------------------
echo    Laisse cette fenetre ouverte. Ferme-la pour arreter.
echo.
node "%~dp0companion\forge-companion.js"
echo.
pause
