#!/bin/sh
# Holt neue Images von GitHub und startet nur geänderte Container neu.
# Manuell:   ./update.sh
# Automatisch: per systemd-Timer (siehe README)
set -eu
cd "$(dirname "$0")"

BEFORE=$(docker compose images -q 2>/dev/null | sort | tr '\n' ' ')
docker compose pull --quiet
docker compose up -d --remove-orphans
AFTER=$(docker compose images -q 2>/dev/null | sort | tr '\n' ' ')

if [ "$BEFORE" != "$AFTER" ]; then
  echo "$(date '+%F %T') Update eingespielt"
  docker image prune -f >/dev/null
else
  echo "$(date '+%F %T') Keine neue Version"
fi
