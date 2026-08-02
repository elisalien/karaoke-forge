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

rem ------------------------------------------------------------ PORT LIBRE
set "PORT="
for /l %%N in (8777,1,8797) do (
  if not defined PORT (
    netstat -ano -p tcp 2>nul | find ":%%N " >nul
    if errorlevel 1 set "PORT=%%N"
  )
)
if not defined PORT goto :filemode

set "URL=http://127.0.0.1:%PORT%/%APPFILE%"

cls
echo.
echo    K A R A O K E   F O R G E
echo    ---------------------------------------------------
echo    Adresse     : %URL%
echo    Navigateur  : %BRNAME%
echo    Serveur     : %RUNNER%
echo.
echo    Laisse cette fenetre ouverte pendant que tu travailles.
echo    Appuie sur une touche pour fermer le serveur.
echo.

if "%RUNARGS%"=="PY"   start "KaraokeForgeServer" /min "%RUNNER%" -m http.server %PORT% --bind 127.0.0.1
if "%RUNARGS%"=="NODE" start "KaraokeForgeServer" /min "%RUNNER%" "%~dp0_forge-server.js" %PORT%

rem laisse au serveur le temps d'ecouter
ping -n 2 127.0.0.1 >nul

if defined BROWSER (
  start "" "%BROWSER%" --app="%URL%"
) else (
  start "" "%URL%"
)

pause >nul

rem ------------------------------------------------------- ARRET DU SERVEUR
for /f "tokens=5" %%A in ('netstat -ano -p tcp ^| findstr ":%PORT% " ^| findstr LISTENING') do (
  taskkill /f /pid %%A >nul 2>nul
)
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
echo    Seul l'export en sequence PNG sera indisponible
echo    (le navigateur bloque le selecteur de dossier en
echo    mode file://).
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
