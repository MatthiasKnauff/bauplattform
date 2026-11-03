#!/usr/bin/env bash
# =============================================================================
# Bauplattform installieren oder aktualisieren – auf dem Docker-Server im Ordner der Bauplattform ausführen:
#
#   bash update.sh                  installieren / auf diese Version aktualisieren (sichert vorher die Datenbank)
#   bash update.sh --prepare        nur die Datei .env anlegen (Einstellungen prüfen, noch nichts umstellen)
#   bash update.sh --status         Zustand der Container anzeigen
#   bash update.sh --backup         nur eine Datenbanksicherung anlegen
#   bash update.sh --restore DATEI  Datenbank aus einer Sicherung (backups/*.dump) zurückspielen
#   bash update.sh --testdaten      NUR TESTSYSTEM: Beispiel-Benutzer, -Projekte, -Berichte, -Fotos und -Bauzeitpläne anlegen
#
# Beim ersten Mal übernimmt das Skript Datenbank-Kennwort, Schlüssel, Ports und Zusatz-Laufwerke aus den bisherigen
# Containern „bautagebuch“, „Bautagebuch_db“/„bauportal_db“ und „gantt-app“ und schreibt sie in die Datei .env.
# Die Daten bleiben in den bisherigen Docker-Volumes; die alte Gantt-App wird nur gelesen (einmalige Übernahme).
# =============================================================================
set -euo pipefail
cd "$(dirname "$0")"
VER=$(cat VERSION 2>/dev/null || echo "?")
DB_NEW=bauportal_db      # Datenbank-Container (früher „Bautagebuch_db“)
DB_OLD=Bautagebuch_db
APPS="bautagebuch gantt portal admin adressen baukosten"

say()  { printf '\n\033[1m▶ %s\033[0m\n' "$*"; }
info() { printf '  %s\n' "$*"; }
warn() { printf '\033[33m  ! %s\033[0m\n' "$*"; }
die()  { printf '\n\033[31mFEHLER: %s\033[0m\n' "$*" >&2; exit 1; }

command -v docker >/dev/null || die "Docker ist auf diesem Rechner nicht installiert."
docker compose version >/dev/null 2>&1 || die "„docker compose“ (Version 2) fehlt. Bitte Docker aktualisieren."
docker info >/dev/null 2>&1 || die "Kein Zugriff auf Docker. Als root bzw. mit sudo ausführen oder den Benutzer zur Gruppe „docker“ hinzufügen."

exists()     { docker inspect "$1" >/dev/null 2>&1; }
running()    { [ "$(docker inspect -f '{{.State.Running}}' "$1" 2>/dev/null)" = "true" ]; }
project_of() { docker inspect -f '{{index .Config.Labels "com.docker.compose.project"}}' "$1" 2>/dev/null || true; }
envget()     { docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$1" 2>/dev/null | sed -n "s/^$2=//p" | head -n1; }
publish_of() {   # Container, Port im Container → "8080" oder "127.0.0.1:8080"
  docker inspect -f "{{range \$p, \$b := .HostConfig.PortBindings}}{{if eq \$p \"$2/tcp\"}}{{range \$b}}{{.HostIp}}|{{.HostPort}}{{println}}{{end}}{{end}}{{end}}" "$1" 2>/dev/null \
    | awk -F'|' 'NF==2 && $2!="" { if ($1!="" && $1!="0.0.0.0" && $1!="::") print $1":"$2; else print $2; exit }'
}
rand()       { head -c 24 /dev/urandom | od -An -tx1 | tr -d ' \n'; }
db_container(){ if exists "$DB_NEW"; then echo "$DB_NEW"; elif exists "$DB_OLD"; then echo "$DB_OLD"; else echo "$DB_NEW"; fi; }
DB=$(db_container)
getenv_file(){ sed -n "s/^$1=//p" .env | tail -n1 | sed "s/^'\(.*\)'$/\1/; s/^\"\(.*\)\"$/\1/"; }
setenv() {     # Schlüssel Wert → .env (Wert in einfachen Anführungszeichen, damit $ & usw. wörtlich gelten)
  local v="$2"; case "$v" in *"'"*) ;; "") ;; *) v="'$v'";; esac
  K="$1" V="$v" awk 'BEGIN{k=ENVIRON["K"]; v=ENVIRON["V"]} index($0, k"=")==1 {print k"="v; d=1; next} {print} END{if(!d) print k"="v}' .env > .env.tmp
  mv .env.tmp .env
}

# ----------------------------------------------------------------------------- Sicherung
backup() {
  mkdir -p backups
  if ! running "$DB"; then info "Keine laufende Datenbank – keine Sicherung nötig."; return 0; fi
  local f="backups/bauplattform-$(date +%Y%m%d-%H%M%S)-vor-$VER.dump"
  say "Sichere die Datenbank → $f"
  docker exec "$DB" pg_dump -U bautagebuch -d bautagebuch -Fc > "$f" || { rm -f "$f"; die "Sicherung fehlgeschlagen – Update abgebrochen."; }
  [ -s "$f" ] || { rm -f "$f"; die "Sicherung ist leer – Update abgebrochen."; }
  info "$(du -h "$f" | cut -f1) gesichert."
  ls -1t backups/bauplattform-*.dump 2>/dev/null | tail -n +11 | xargs -r rm -f   # die letzten 10 behalten
}

status() {
  say "Zustand (Version $VER)"
  docker compose ps --format 'table {{.Service}}\t{{.Status}}\t{{.Ports}}' 2>/dev/null || docker compose ps
  local ip; ip=$(hostname -I 2>/dev/null | awk '{print $1}'); ip=${ip:-localhost}
  [ -f .env ] && {
    info ""
    info "Startseite / Anmeldung:  http://$ip:$(getenv_file PORTAL_PORT)"
    info "Bautagebuch:             http://$ip:$(getenv_file BAUTAGEBUCH_PORT)"
    info "Bauzeitenplan:           http://$ip:$(getenv_file GANTT_PORT)"
    info "Verwaltung:              http://$ip:$(getenv_file ADMIN_PORT)"
    info "Adressen:                http://$ip:$(p=$(getenv_file ADRESSEN_PORT); echo "${p:-8093}")"
    info "Baukosten:               http://$ip:$(p=$(getenv_file BAUKOSTEN_PORT); echo "${p:-8094}")"
    info "KI (Ollama):             nur intern im Docker-Netz, Modell $(m=$(getenv_file OLLAMA_MODEL); echo "${m:-qwen2.5:3b}")"
  }
}

case "${1:-}" in
  --status) status; exit 0;;
  --backup) backup; exit 0;;
  --restore)
    f="${2:-}"; [ -f "$f" ] || die "Sicherung „$f“ nicht gefunden (siehe Ordner backups/)."
    running "$DB" || die "Die Datenbank läuft nicht. Erst „bash update.sh“ ausführen."
    say "Spiele $f zurück – die Apps werden dafür kurz angehalten"
    backup
    docker compose stop $APPS
    docker exec -i "$DB" pg_restore -U bautagebuch -d bautagebuch --clean --if-exists --no-owner < "$f" || warn "pg_restore meldete Warnungen (meist unkritisch)."
    docker compose up -d
    status; exit 0;;
  --testdaten)
    running bautagebuch || die "Die Bauplattform läuft noch nicht. Erst „bash update.sh“ ausführen."
    say "Lege Testdaten an (nur für Testsysteme)"
    docker compose exec -T bautagebuch python tools/testdaten.py ${2:-}
    exit 0;;
  ""|--prepare) ;;
  *) die "Unbekannte Option „$1“. Möglich: --prepare, --status, --backup, --restore DATEI, --testdaten";;
esac

say "Bauplattform $VER"

# ----------------------------------------------------------------------------- erste Einrichtung: .env
if [ ! -f .env ]; then
  say "Erste Einrichtung – übernehme Einstellungen der bisherigen Container"
  cp .env.example .env
  pw=""
  if exists "$DB"; then pw=$(envget "$DB" POSTGRES_PASSWORD); fi
  if [ -z "$pw" ]; then
    if docker volume inspect bautagebuch_pgdata >/dev/null 2>&1 || docker volume inspect bauportal_pgdata >/dev/null 2>&1; then
      rm -f .env
      die "Es gibt schon eine Datenbank (Volume bautagebuch_pgdata bzw. bauportal_pgdata), aber keinen Container, aus dem ich das Kennwort lesen kann.
       Bitte .env.example nach .env kopieren, dort DB_PASSWORD eintragen (wie bisher in docker-compose.yml) und erneut starten."
    fi
    pw=$(rand); info "Neue Installation: Datenbank-Kennwort erzeugt."
  else
    info "Datenbank-Kennwort aus „$DB“ übernommen."
  fi
  setenv DB_PASSWORD "$pw"
  if exists bautagebuch; then
    sk=$(envget bautagebuch SECRET_KEY)
    case "$sk" in ""|lange-zufaellige-zeichenfolge|dev-nur-zum-testen|x) ;; *) setenv SECRET_KEY "$sk"; info "Schlüssel (SECRET_KEY) übernommen – alle bleiben angemeldet.";; esac
    for k in TRUST_PROXY COOKIE_SECURE TZ; do v=$(envget bautagebuch "$k"); [ -n "$v" ] && setenv "$k" "$v"; done
    pub=$(publish_of bautagebuch 8000); if [ -n "$pub" ]; then setenv BAUTAGEBUCH_PUBLISH "$pub"; setenv BAUTAGEBUCH_PORT "${pub##*:}"; info "Bautagebuch bleibt auf Port ${pub}."; fi
    # zusätzliche Laufwerke (z. B. Windows-Freigabe für die Ablage) in docker-compose.override.yml übernehmen
    extra=$(docker inspect -f '{{range .Mounts}}{{if ne .Destination "/data"}}{{.Type}}|{{if eq .Type "volume"}}{{.Name}}{{else}}{{.Source}}{{end}}|{{.Destination}}|{{.RW}}{{println}}{{end}}{{end}}' bautagebuch 2>/dev/null | grep -v '^$' || true)
    if [ -n "$extra" ] && [ ! -f docker-compose.override.yml ]; then
      { echo "# Von update.sh aus dem bisherigen Bautagebuch-Container übernommen (zusätzliche Laufwerke)"
        echo "services:"; echo "  bautagebuch:"; echo "    volumes:"
        echo "$extra" | while IFS='|' read -r t s d rw; do echo "      - \"$s:$d$([ "$rw" = false ] && echo ':ro')\""; done
        vols=$(echo "$extra" | awk -F'|' '$1=="volume"{print $2}')
        if [ -n "$vols" ]; then echo "volumes:"; echo "$vols" | while read -r v; do echo "  $v:"; echo "    external: true"; done; fi
      } > docker-compose.override.yml
      info "Zusätzliche Laufwerke übernommen → docker-compose.override.yml"
    fi
  fi
  g=""
  for c in gantt-app $(docker ps -a --format '{{.Names}}' | grep -i gantt || true); do exists "$c" && { g="$c"; break; }; done
  if [ -n "$g" ] && [ "$(project_of "$g")" != "bauplattform" ]; then
    gv=$(docker inspect -f '{{range .Mounts}}{{if eq .Destination "/data"}}{{.Name}}{{end}}{{end}}' "$g")
    [ -n "$gv" ] && { setenv GANTT_LEGACY_VOLUME "$gv"; info "Daten der Gantt-App: Volume „$gv“ (wird übernommen)."; }
    pub=$(publish_of "$g" 8082); [ -n "$pub" ] && { setenv GANTT_PUBLISH "$pub"; setenv GANTT_PORT "${pub##*:}"; }
    ak=$(envget "$g" ANTHROPIC_API_KEY); [ -n "$ak" ] && setenv ANTHROPIC_API_KEY "$ak"
  else
    gv=$(docker volume ls --format '{{.Name}}' | grep -E 'gantt.*data' | head -n1 || true)
    [ -n "$gv" ] && { setenv GANTT_LEGACY_VOLUME "$gv"; info "Daten der Gantt-App: Volume „$gv“ (wird übernommen)."; }
  fi
  chmod 600 .env
  info "Einstellungen stehen in .env – bei Bedarf dort anpassen."
fi
[ -n "$(getenv_file DB_PASSWORD)" ] || die "DB_PASSWORD fehlt in .env."
if [ "${1:-}" = "--prepare" ]; then say "Die Datei .env ist bereit. Zum Umstellen: bash update.sh"; exit 0; fi

# ----------------------------------------------------------------------------- bauen, sichern, umstellen
say "Baue die Images (kann beim ersten Mal einige Minuten dauern)"
docker compose build --pull

backup

say "Stelle um"
for c in "$DB_OLD" "$DB_NEW" bautagebuch gantt-app bauzeitenplan bauplattform_portal bauplattform_admin; do
  if exists "$c" && [ "$(project_of "$c")" != "bauplattform" ]; then
    info "Entferne bisherigen Container „$c“ (Daten bleiben in den Volumes)"
    docker rm -f "$c" >/dev/null
  fi
done
docker compose up -d --remove-orphans
DB=$DB_NEW

say "Warte, bis alle Dienste bereit sind"
end=$((SECONDS + 300)); ok=0
while [ $SECONDS -lt $end ]; do
  bad=""
  for s in bautagebuch_db $APPS; do
    id=$(docker compose ps -q "$s" 2>/dev/null); [ -n "$id" ] || { bad="$s"; break; }
    h=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$id")
    case "$h" in healthy|running) ;; *) bad="$s ($h)";; esac
  done
  [ -z "$bad" ] && { ok=1; break; }
  sleep 5
done
if [ $ok = 1 ]; then
  echo "$(date '+%Y-%m-%d %H:%M:%S') $VER ok" >> backups/deploy.log
  status
  say "Fertig – Version $VER läuft."
else
  echo "$(date '+%Y-%m-%d %H:%M:%S') $VER FEHLER $bad" >> backups/deploy.log
  warn "Noch nicht bereit: $bad"
  docker compose logs --tail=40 ${bad%% *} || true
  die "Bitte die Meldungen oben prüfen. Die Sicherung liegt im Ordner backups/."
fi
