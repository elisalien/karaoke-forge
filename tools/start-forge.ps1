# Karaoke Forge — lanceur « navigateur », sans fenêtre de commande.
# Appelé par START-FORGE.bat (PowerShell caché). Démarre un serveur local sur
# 127.0.0.1:8777 et le companion s'ils ne tournent pas déjà, puis ouvre l'app
# dans Chrome ou Edge en fenêtre d'application. Le serveur et le companion
# s'éteignent d'eux-mêmes une minute après la fermeture de l'app : la page
# leur envoie un signe de vie toutes les 20 secondes.
$ErrorActionPreference = 'SilentlyContinue'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
$appFile = 'karaoke-forge.html'
if (-not (Test-Path (Join-Path $root $appFile))) { exit 1 }

# ---- navigateur : Chrome ou Edge, en fenêtre d'application ----
$candidates = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:LocalAppData\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
)
$browser = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1

# ---- serveur : Node de préférence (il s'éteint seul), sinon Python ----
$node = (Get-Command node).Source
$py = (Get-Command py, python, python3).Source | Select-Object -First 1
$port = 8777
$listening = (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)
$reuse = $false
if ($listening) {
  try { $reuse = (Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 "http://127.0.0.1:$port/$appFile").StatusCode -eq 200 } catch { $reuse = $false }
  if (-not $reuse) {
    # port pris par autre chose : port de secours (bibliothèque séparée)
    $port = 8778..8797 | Where-Object { -not (Get-NetTCPConnection -LocalPort $_ -State Listen -ErrorAction SilentlyContinue) } | Select-Object -First 1
    if (-not $port) { $port = $null }
  }
}

$url = $null
if ($port) {
  if (-not $reuse) {
    if ($node) { Start-Process -FilePath $node -ArgumentList @("`"$root\_forge-server.js`"", $port, '--autoexit') -WindowStyle Hidden | Out-Null }
    elseif ($py) { Start-Process -FilePath $py -ArgumentList @('-m', 'http.server', $port, '--bind', '127.0.0.1') -WindowStyle Hidden | Out-Null }
    else { $port = $null }
  }
  if ($port) { $url = "http://127.0.0.1:$port/$appFile" }
}
if (-not $url) { $url = (Join-Path $root $appFile) }   # ni Node ni Python : ouverture directe du fichier

# ---- companion : Ableton Link et audio YouTube, si Node est là ----
if ($node -and (Test-Path "$root\companion\forge-companion.js") -and -not (Get-NetTCPConnection -LocalPort 17002 -State Listen -ErrorAction SilentlyContinue)) {
  $env:FORGE_AUTOEXIT = '1'
  Start-Process -FilePath $node -ArgumentList @("`"$root\companion\forge-companion.js`"") -WindowStyle Hidden | Out-Null
}

# laisse au serveur le temps d'écouter, puis ouvre l'app
if ($url -like 'http*') { for ($i = 0; $i -lt 20; $i++) { try { if ((Invoke-WebRequest -UseBasicParsing -TimeoutSec 1 $url).StatusCode -eq 200) { break } } catch { Start-Sleep -Milliseconds 150 } } }
if ($browser) { Start-Process -FilePath $browser -ArgumentList @("--app=$url") | Out-Null }
else { Start-Process $url | Out-Null }
exit 0
