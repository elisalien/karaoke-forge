@echo off
setlocal enableextensions enabledelayedexpansion
title Karaoke Forge - Installation
color 0B

rem ============================================================
rem   KARAOKE FORGE - installation en un double-clic
rem   Telecharge la derniere version depuis GitHub, l'installe
rem   dans Documents et pose un raccourci sur le bureau.
rem ============================================================

set "GH_USER=VOTRE-COMPTE"
set "GH_REPO=karaoke-forge"
set "BRANCH=main"
set "BASE=https://raw.githubusercontent.com/%GH_USER%/%GH_REPO%/%BRANCH%"
set "DEST=%USERPROFILE%\Documents\Karaoke Forge"

cls
echo.
echo    K A R A O K E   F O R G E
echo    ---------------------------------------------------
echo    Installation
echo.
echo    Destination : %DEST%
echo.

rem ------------------------------------------------ PowerShell present ?
where powershell >nul 2>nul
if errorlevel 1 (
  echo    ERREUR : PowerShell est introuvable sur ce systeme.
  echo    Telecharge le dossier a la main depuis :
  echo    https://github.com/%GH_USER%/%GH_REPO%
  echo.
  pause
  exit /b 1
)

rem ------------------------------------------------ dossier
if not exist "%DEST%" mkdir "%DEST%" 2>nul
if not exist "%DEST%" (
  echo    ERREUR : impossible de creer le dossier de destination.
  echo.
  pause
  exit /b 1
)

rem ------------------------------------------------ telechargement
set "FAILED=0"

call :get karaoke-forge.html  "l application"
call :get START-FORGE.bat     "le lanceur"
call :get _forge-server.js    "le serveur local"
call :get GUIDE.md            "le mode d emploi"

if "%FAILED%"=="1" (
  echo.
  echo    Le telechargement a echoue. Verifie ta connexion, ou
  echo    recupere le dossier a la main :
  echo    https://github.com/%GH_USER%/%GH_REPO%
  echo.
  pause
  exit /b 1
)

rem ------------------------------------------------ raccourci bureau
echo    [*] Raccourci sur le bureau...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$w = New-Object -ComObject WScript.Shell;" ^
  "$d = $w.SpecialFolders('Desktop');" ^
  "$s = $w.CreateShortcut((Join-Path $d 'Karaoke Forge.lnk'));" ^
  "$s.TargetPath = '%DEST%\START-FORGE.bat';" ^
  "$s.WorkingDirectory = '%DEST%';" ^
  "$s.Description = 'Karaoke Forge';" ^
  "$s.Save()" >nul 2>nul

if errorlevel 1 (
  echo        raccourci non cree - sans importance, lance START-FORGE.bat
  echo        depuis le dossier.
) else (
  echo        ok
)

rem ------------------------------------------------ moteur disponible ?
set "ENGINE="
for %%C in (py python python3) do (
  if not defined ENGINE ( where %%C >nul 2>nul && set "ENGINE=Python" )
)
if not defined ENGINE ( where node >nul 2>nul && set "ENGINE=Node.js" )

cls
echo.
echo    K A R A O K E   F O R G E
echo    ---------------------------------------------------
echo    Installe dans : %DEST%
echo.
if defined ENGINE (
  echo    Serveur local : %ENGINE% detecte - tout est disponible,
  echo    y compris l export en sequence PNG vers un dossier.
) else (
  echo    Ni Python ni Node.js detectes. L application fonctionne
  echo    et l export MP4 aussi ; seul l export PNG vers un dossier
  echo    repassera par un .zip. Pour tout debloquer, installe
  echo    Node.js ^(nodejs.org^) ou Python ^(python.org^).
)
echo.
echo    Lance l application par le raccourci "Karaoke Forge"
echo    sur le bureau, ou par START-FORGE.bat dans le dossier.
echo.
echo    ---------------------------------------------------
echo.

choice /c ON /n /m "    Ouvrir le dossier maintenant ? [O/N] "
if errorlevel 2 goto :done
start "" explorer "%DEST%"

:done
echo.
echo    Appuie sur une touche pour fermer.
pause >nul
endlocal
exit /b 0

rem ============================================================
:get
rem  %1 = nom du fichier   %2 = libelle affiche
echo    [*] Telechargement : %~2
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12;" ^
  "try { Invoke-WebRequest -UseBasicParsing -Uri '%BASE%/%~1' -OutFile '%DEST%\%~1'; exit 0 }" ^
  "catch { exit 1 }" >nul 2>nul
if errorlevel 1 (
  echo        ECHEC : %~1
  set "FAILED=1"
) else (
  echo        ok
)
exit /b 0
