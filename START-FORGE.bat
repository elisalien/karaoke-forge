@echo off
setlocal enableextensions enabledelayedexpansion
title Karaoke Forge
cd /d "%~dp0"

set "APPFILE=karaoke-forge.html"
if not exist "%APPFILE%" (
  echo.
  echo   ERREUR : %APPFILE% est introuvable.
  echo   Garde ce raccourci dans le meme dossier que l'application.
  echo.
  pause
  exit /b 1
)

rem ---------------------------------------------------------------- NAVIGATEUR
rem Les parentheses de "Program Files (x86)" cassent les blocs FOR :
rem on recopie la variable AVANT d'entrer dans le bloc.
set "PF=%ProgramFiles%"
set "PF86=%ProgramFiles(x86)%"
set "LAD=%LocalAppData%"

set "BROWSER="
for %%P in (
  "%PF%\Google\Chrome\Application\chrome.exe"
  "%PF86%\Google\Chrome\Application\chrome.exe"
  "%LAD%\Google\Chrome\Application\chrome.exe"
  "%PF86%\Microsoft\Edge\Application\msedge.exe"
  "%PF%\Microsoft\Edge\Application\msedge.exe"
) do if not defined BROWSER if exist %%P set "BROWSER=%%~P"

set "BRNAME=navigateur par defaut"
if defined BROWSER for %%N in ("%BROWSER%") do set "BRNAME=%%~nxN"

rem ------------------------------------------------------------------ SERVEUR
rem Un serveur local (plutot qu'une ouverture en file://) est necessaire pour
rem l'export en sequence PNG : le selecteur de dossier est bloque sur file://.
set "RUNNER="
set "RUNARGS="

for %%C in (py python python3) do (
  if not defined RUNNER (
    where %%C >nul 2>nul && ( %%C -c "import http.server" >nul 2>nul && set "RUNNER=%%C" && set "RUNARGS=PY" )
  )
)
if not defined RUNNER (
  if exist "_forge-server.js" (
    where node >nul 2>nul && set "RUNNER=node" && set "RUNARGS=NODE"
  )
)
if not defined RUNNER goto :filemode

rem ------------------------------------------------------------ PORT FIXE
rem La bibliotheque et la sauvegarde automatique sont rangees par le
rem navigateur SOUS L'ADRESSE de la page : changer de port, c'est retrouver
rem une bibliotheque vide. On garde donc toujours 8777.
set "PORT=8777"
set "REUSE="
set "ALTPORT="
netstat -ano -p tcp 2>nul | find ":8777 " >nul
if errorlevel 1 goto :portok

rem 8777 est pris : si c'est deja un serveur Karaoke Forge, on le reutilise
powershell -NoProfile -Command "try{if((Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 'http://127.0.0.1:8777/karaoke-forge.html').StatusCode -eq 200){exit 0}}catch{};exit 1" >nul 2>nul
if not errorlevel 1 (
  set "REUSE=1"
  goto :portok
)

rem sinon, un port de secours - avec une bibliotheque separee
set "PORT="
for /l %%N in (8778,1,8797) do (
  if not defined PORT (
    netstat -ano -p tcp 2>nul | find ":%%N " >nul
    if errorlevel 1 set "PORT=%%N"
  )
)
if not defined PORT goto :filemode
set "ALTPORT=1"

:portok
set "URL=http://127.0.0.1:%PORT%/%APPFILE%"

cls
echo.
echo    K A R A O K E   F O R G E
echo    ---------------------------------------------------
echo    Adresse     : %URL%
echo    Navigateur  : %BRNAME%
if defined REUSE (echo    Serveur     : deja lance, reutilise) else (echo    Serveur     : %RUNNER%)
echo.
if defined ALTPORT (
  echo    ATTENTION : le port 8777 est occupe par un autre programme.
  echo    L'app s'ouvre sur un port de secours : sa bibliotheque et sa
  echo    sauvegarde automatique seront vides. Ferme l'autre programme
  echo    puis relance pour retrouver ta bibliotheque habituelle.
  echo.
)
echo    Laisse cette fenetre ouverte pendant que tu travailles.
echo    Appuie sur une touche pour fermer le serveur.
echo.

if not defined REUSE (
  if "%RUNARGS%"=="PY"   start "KaraokeForgeServer" /min "%RUNNER%" -m http.server %PORT% --bind 127.0.0.1
  if "%RUNARGS%"=="NODE" start "KaraokeForgeServer" /min "%RUNNER%" "%~dp0_forge-server.js" %PORT%
)

rem ------------------------------------------------------------- COMPANION
rem Facultatif : Ableton Link et audio YouTube. Demarre seulement si Node est
rem present et si aucun companion ne tourne deja (START-COMPANION.bat).
set "COMPANION="
where node >nul 2>nul && set "COMPANION=1"
if not exist "%~dp0companion\forge-companion.js" set "COMPANION="
netstat -ano -p tcp 2>nul | find ":17002 " >nul && set "COMPANION="
if defined COMPANION start "KaraokeForgeCompanion" /min node "%~dp0companion\forge-companion.js"
if defined COMPANION echo    Companion   : actif (Ableton Link, audio YouTube)
if defined COMPANION echo.

rem laisse au serveur le temps d'ecouter
ping -n 2 127.0.0.1 >nul

if defined BROWSER (
  start "" "%BROWSER%" --app="%URL%"
) else (
  start "" "%URL%"
)

pause >nul

rem ------------------------------------------------------- ARRET DU SERVEUR
rem On n'arrete que ce que CE lanceur a demarre.
if not defined REUSE for /f "tokens=5" %%A in ('netstat -ano -p tcp ^| findstr ":%PORT% " ^| findstr LISTENING') do taskkill /f /pid %%A >nul 2>nul
if defined COMPANION for /f "tokens=5" %%A in ('netstat -ano -p tcp ^| findstr ":17002 " ^| findstr LISTENING') do taskkill /f /pid %%A >nul 2>nul
exit /b 0

rem =========================================================== MODE FICHIER
:filemode
cls
echo.
echo    K A R A O K E   F O R G E
echo    ---------------------------------------------------
echo    Ni Python ni Node.js n'ont ete trouves : ouverture
echo    directe du fichier.
echo.
echo    L'application fonctionne, et l'export MP4 aussi.
echo    Seul l'export en sequence PNG passera par un .zip.
echo    La bibliotheque ouverte ainsi est distincte de celle
echo    du mode serveur.
echo.
echo    Pour tout debloquer : installe Node.js (nodejs.org)
echo    ou Python (python.org), puis relance ce raccourci.
echo.
if defined BROWSER (
  start "" "%BROWSER%" "%~dp0%APPFILE%"
) else (
  start "" "%~dp0%APPFILE%"
)
ping -n 4 127.0.0.1 >nul
exit /b 0
