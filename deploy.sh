#!/usr/bin/env bash
# =============================================================================
# Neue Version vom eigenen Rechner (Linux, Mac, WSL, Git-Bash) auf den Docker-Server bringen und starten.
#
#   bash deploy.sh benutzer@server                 Ordner auf dem Server: /opt/bauplattform
#   bash deploy.sh benutzer@server /pfad/ordner    anderer Ordner
#
# Voraussetzung: Anmeldung per SSH auf dem Server (am besten mit Schlüssel) und Docker-Rechte für diesen Benutzer
# (root, sudo ohne Kennwort oder Gruppe „docker“). Die Datei .env und der Ordner backups/ auf dem Server bleiben erhalten.
# =============================================================================
set -euo pipefail
cd "$(dirname "$0")"
HOST="${1:?Aufruf: bash deploy.sh benutzer@server [/opt/bauplattform]}"
DIR="${2:-/opt/bauplattform}"
VER=$(cat VERSION)
echo "▶ Übertrage Bauplattform $VER nach $HOST:$DIR"
tar czf - --exclude=.env --exclude=backups --exclude='__pycache__' --exclude='*.pyc' --exclude='*.zip' --exclude='.git' \
    --exclude=docker-compose.override.yml . \
  | ssh "$HOST" "set -e; mkdir -p '$DIR' && tar xzf - -C '$DIR' && cd '$DIR' && if docker info >/dev/null 2>&1; then bash update.sh; else sudo -n bash update.sh; fi"
