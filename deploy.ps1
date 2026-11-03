# =============================================================================
# Neue Version von einem Windows-Rechner auf den Docker-Server bringen und starten (PowerShell, Windows 10/11).
#
#   .\deploy.ps1 benutzer@server                    Ordner auf dem Server: /opt/bauplattform
#   .\deploy.ps1 benutzer@server /pfad/ordner       anderer Ordner
#
# Nutzt die in Windows eingebauten Programme ssh, scp und tar. Voraussetzung: Anmeldung per SSH auf dem Server
# (am besten mit Schlüssel: ssh-keygen, dann den öffentlichen Schlüssel auf dem Server in ~/.ssh/authorized_keys)
# und Docker-Rechte für diesen Benutzer. .env und backups/ auf dem Server bleiben erhalten.
# Falls Skripte gesperrt sind:  powershell -ExecutionPolicy Bypass -File .\deploy.ps1 benutzer@server
# =============================================================================
param(
  [Parameter(Mandatory = $true)][string]$Server,
  [string]$Ordner = "/opt/bauplattform"
)
$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot
$ver = (Get-Content VERSION -Raw).Trim()
$tmp = Join-Path $env:TEMP "bauplattform-$ver.tgz"
Write-Host "▶ Packe Bauplattform $ver"
tar -czf $tmp --exclude=.env --exclude=backups --exclude=__pycache__ --exclude=*.pyc --exclude=*.zip --exclude=.git --exclude=docker-compose.override.yml .
if ($LASTEXITCODE -ne 0) { throw "Packen fehlgeschlagen" }
Write-Host "▶ Übertrage nach ${Server}:$Ordner"
scp $tmp "${Server}:/tmp/bauplattform.tgz"
if ($LASTEXITCODE -ne 0) { throw "Übertragung fehlgeschlagen (SSH-Zugang prüfen)" }
Write-Host "▶ Installiere und starte auf dem Server"
ssh -t $Server "set -e; mkdir -p '$Ordner' && tar xzf /tmp/bauplattform.tgz -C '$Ordner' && rm -f /tmp/bauplattform.tgz && cd '$Ordner' && if docker info >/dev/null 2>&1; then bash update.sh; else sudo bash update.sh; fi"
if ($LASTEXITCODE -ne 0) { throw "Update auf dem Server meldete einen Fehler (siehe oben)" }
Remove-Item $tmp -ErrorAction SilentlyContinue
Write-Host "Fertig."
