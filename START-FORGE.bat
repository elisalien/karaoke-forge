@echo off
rem Karaoke Forge — lanceur.
rem   1. Si l'application de bureau est construite (desktop\dist), on la lance.
rem   2. Sinon, mode navigateur : serveur local + Chrome/Edge en fenetre
rem      d'application, tout en arriere-plan, sans fenetre de commande.
rem      Serveur et companion s'eteignent seuls quand l'app est fermee.
cd /d "%~dp0"

if exist "%~dp0desktop\dist\win-unpacked\Karaoke Forge.exe" (
  start "" "%~dp0desktop\dist\win-unpacked\Karaoke Forge.exe"
  exit /b 0
)

if not exist "%~dp0karaoke-forge.html" (
  echo.
  echo   ERREUR : karaoke-forge.html est introuvable.
  echo   Garde ce raccourci dans le meme dossier que l'application.
  echo.
  pause
  exit /b 1
)

start "" /min powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0tools\start-forge.ps1"
exit /b 0
