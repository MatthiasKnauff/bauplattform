# Bauplattform

Gemeinsame Plattform für Bautagebuch, Bauzeitenplan (Gantt) und weitere Apps.

## Ablauf

Code-Änderung → GitHub Actions baut das Image → GitHub Container Registry (ghcr.io)
→ `server/update.sh` auf dem Docker-Server holt es ab.

| Image-Tag | Wann | Gedacht für |
|-----------|------|-------------|
| `latest`  | jeder Push auf `main` | Testen |
| `stable`  | Git-Tag `v*` (z. B. `v1.0.0`) | Produktivbetrieb |

## Testcontainer `hello`

Kleine Webseite, die Version und Build-Zeit anzeigt – zum Prüfen der Kette.
Auf dem Server unter `http://SERVER:8099`.
