# Bauplattform

Bautagebuch, Bauzeitenplan (Gantt-App), Adressen und Baukosten auf einer gemeinsamen Datenbasis, mit einer Anmeldung für alle Apps,
einem eigenen Container für die Verwaltung und einem Skript, das neue Versionen mit einem Befehl einspielt.

| App | Adresse (Standard) | Container |
|---|---|---|
| Verteiler: alle Apps unter einer Adresse (`/bautagebuch`, `/baukosten` …) | `http://server:8090` | `bauplattform_verteiler` |
| Startseite / Anmeldung | über den Verteiler (`/`) | `bauplattform_portal` |
| Bautagebuch | `http://server:8080` (wie bisher) | `bautagebuch` |
| Bauzeitenplan | `http://server:8082` (wie bisher) | `bauzeitenplan` |
| Adressen (Firmen, Bauherren, Baustellen) | `http://server:8093` | `bauplattform_adressen` |
| Baukosten (DIN 276, Mittelabfluss) | `http://server:8094` | `bauplattform_baukosten` |
| Baudaten (Positionsdatenbank, Kataloge, eigene Preise) | `http://server:8099` | `bauplattform_baudaten` |
| Verwaltung (nur Administratoren) | `http://server:8091` | `bauplattform_admin` |
| KI im Büro (Ollama) | nur intern (`http://ollama:11434`) | `bauplattform_ollama` (+ `bauplattform_ollama_modell` lädt das Modell) |
| Datenbank (PostgreSQL 15) für alle Apps | nur intern | `bauplattform_db` (früher `bauportal_db` bzw. `Bautagebuch_db`), Volume `bauportal_pgdata` (früher `bautagebuch_pgdata`) |

```
            Browser ──► :8090 Startseite ──┐  Anmeldung (Cookie gilt für alle Ports dieses Servers)
                    ──► :8080 Bautagebuch ─┤
                    ──► :8082 Bauzeitenplan┼──► PostgreSQL (Volume bautagebuch_pgdata)
                    ──► :8091 Verwaltung ──┘     Benutzer · Sitzungen · Projekte · Kontakte/Firmen
                                                 Tagesberichte · Bauzeitenpläne · Protokoll
```

## Was sich für die Kolleginnen und Kollegen ändert

**Im Bautagebuch ändert sich an der Bedienung nichts.** Wer angemeldet ist, bleibt nach dem Update angemeldet. Name und Kennwort
bleiben gleich, und die Anmeldeseite des Bautagebuchs funktioniert weiter. Neu ist nur: Im Menü ⚙ stehen zusätzlich Links zur Startseite,
zum Bauzeitenplan und (für Administratoren) zur Verwaltung. Wer im Bautagebuch angemeldet ist, kommt ohne erneute Anmeldung
in den Bauzeitenplan. Abmelden gilt für alle Apps.

## Installation und Updates

### Erstes Mal (Umstieg von den bisherigen Einzel-Apps)

1. ZIP auf den Docker-Server kopieren und entpacken, z. B. nach `/opt/bauplattform`.
   Die bisherigen Ordner `bautagebuch/` und `gantt-app/` bleiben unangetastet.
2. Optional prüfen, was übernommen wird:
   ```bash
   cd /opt/bauplattform && bash update.sh --prepare
   ```
   Das Skript legt die Datei `.env` an und übernimmt aus den laufenden Containern: Datenbank-Kennwort, `SECRET_KEY`
   (damit alle angemeldet bleiben), Ports (auch `127.0.0.1:8080` hinter einem Proxy), `TRUST_PROXY`, `COOKIE_SECURE`,
   zusätzliche Laufwerke des Bautagebuchs (z. B. die Windows-Freigabe, über `docker-compose.override.yml`), das Volume
   der Gantt-App und deren KI-Schlüssel.
3. Umstellen:
   ```bash
   bash update.sh
   ```
   Ablauf: Images bauen → **Sicherung der Datenbank** nach `backups/` → alte Container `bautagebuch`, `Bautagebuch_db`
   und `gantt-app` entfernen (die Daten liegen in den Volumes und bleiben) → neue Container starten → warten, bis
   alle bereit sind. Das Bautagebuch ergänzt die Datenbank (Migration 0003, vorher eigene Sicherung). Der Bauzeitenplan
   übernimmt beim ersten Start alle Pläne, Versionen, Vorlagen, den Leistungskatalog und die Firmen aus dem alten Volume.
   Das alte Volume wird dabei nur gelesen und nicht verändert.
4. In der **Verwaltung** (`:8091`) prüfen, ob unter „Zustand“ alles grün ist und wie viele Pläne übernommen wurden.

### Neue Versionen

**Vom eigenen Rechner aus** (SSH-Zugang zum Server nötig, am besten mit Schlüssel):

```powershell
# Windows (PowerShell) im entpackten Ordner der neuen Version
.\deploy.ps1 benutzer@server            # Zielordner /opt/bauplattform
```
```bash
# Linux / Mac / WSL
bash deploy.sh benutzer@server
```

Die Skripte übertragen den Ordner (ohne `.env` und `backups/`) und führen auf dem Server `bash update.sh` aus.

**Direkt auf dem Server:** neue Dateien über den Ordner entpacken (`.env` bleibt, sie ist nicht im ZIP) und `bash update.sh`.

Vor jedem Update sichert das Skript die Datenbank (`backups/bauplattform-…-vor-<Version>.dump`, die letzten 10 bleiben).
`backups/deploy.log` protokolliert, welche Version wann eingespielt wurde.

### Weitere Befehle

| Befehl | Wirkung |
|---|---|
| `bash update.sh --status` | Container und Adressen anzeigen |
| `bash update.sh --backup` | nur eine Sicherung anlegen |
| `bash update.sh --restore backups/DATEI.dump` | Datenbank aus einer Sicherung zurückspielen (vorher wird der aktuelle Stand gesichert) |
| `docker compose logs -f gantt` | Meldungen eines Dienstes (`bautagebuch`, `gantt`, `portal`, `admin`, `bautagebuch_db`) |
| `docker compose exec bautagebuch python -m core.auth reset-admin` | Notfall: Benutzer „admin“ bekommt wieder das Kennwort „admin“ |

## Testsystem mit Beispieldaten

Für ein eigenes Testsystem (z. B. ein zweiter LXC mit Docker, nur im LAN oder über VPN erreichbar) installierst du die
Bauplattform genauso wie im Echtbetrieb und legst danach Testdaten an:

```bash
bash update.sh              # frische Installation: Benutzer „admin“, Kennwort „admin“ (wird beim ersten Anmelden geändert)
bash update.sh --testdaten  # Beispieldaten
```

Die Testdaten umfassen:
- **Benutzer** (Kennwort für alle: `Testdaten1`): Test-Admin (Administrator), Anna Bauer (alle Apps), Bernd Krämer (nur Bautagebuch), Clara Wolf (nur Bauzeitenplan)
- **12 Firmen** mit Ansprechpartner, Telefon und Adresse. Sie erscheinen als Kontakte im Bautagebuch und im Adressbuch des Bauzeitenplans.
- **3 Projekte** mit 18 Tagesberichten der letzten Tage. Darin stehen Wetter, Anwesende mit Tätigkeit, Notizen, Mängel (teils erledigt),
  Aufgaben, Weisungen und Platzhalter-Fotos. T101 sehen nur Anna und die Administratoren, T102 Anna und Bernd, T103 alle.
- **2 Bauzeitenpläne**, verknüpft mit T101 und T102, mit Gewerken, Firmen, Vergabestand und Fortschritt.

Der Befehl bricht ab, wenn die Datenbank schon Tagesberichte enthält. Das schützt das Echtsystem. Nur auf einem Testsystem
lässt er sich mit `bash update.sh --testdaten --force` erzwingen.

## Server mit Portainer (automatische Updates über GitHub)

Die Bauplattform läuft als Portainer-Stack direkt aus diesem Repository:

| Datei | Server | bekommt |
|---|---|---|
| `server/docker-compose.yml` | Produktiv (Docker 2) | nur freigegebene Versionen (GitHub-Release `v…`, z. B. `v2026.11.2`) |
| `server/test.yml` | Testserver (optional) | jeden Stand von `main` |

1. GitHub Actions baut die drei Images (`bautagebuch`, `gantt`, `plattform`) unter `ghcr.io/matthiasknauff/bauplattform/…`.
2. Danach trägt der Workflow die Version in die passende Datei ein.
3. Portainer prüft die Quelle regelmäßig (Polling), bemerkt die Änderung und spielt die neue Version ein.

**Neue Dienste:** Liegt `server/produktiv-naechste.yml` im Repository (z. B. mit Baukosten und Ollama), ersetzt der Workflow bei der
nächsten Freigabe damit `server/docker-compose.yml`. Bis dahin bleibt der Produktivserver unverändert.

**Version freigeben:** Vorher einen Proxmox-Snapshot anlegen. Dann auf GitHub *Releases → Draft a new release*,
bei *Choose a tag* einen neuen Tag `v<VERSION>` eingeben (z. B. `v2026.11.3`, Ziel `main`) und *Publish release* klicken.

Stack in Portainer: Build method *Repository*, Source `bauplattform`, Reference `refs/heads/main`,
Compose path `server/docker-compose.yml` (Testserver: `server/test.yml`). Unter *Environment variables* mindestens `DB_PASSWORD` (Kennwort der
vorhandenen Datenbank) eintragen, sinnvollerweise auch `SECRET_KEY` aus dem bisherigen Bautagebuch-Container.

Die Volumes `bautagebuch_data`, `bautagebuch_pgdata` und `gantt-app_gantt-data` müssen schon vorhanden sein
(`external`), damit nie versehentlich mit einer leeren Datenbank gestartet wird. Vor dem ersten Start die bisherigen
Stacks `bautagebuch` und `gantt-app` entfernen (die Volumes bleiben) und vom LXC einen Snapshot anlegen.

### Testserver (Docker 1)

`server/test.yml` ist für eine **Kopie zum Ausprobieren** gedacht (z. B. Docker 1) und bekommt jeden Stand von `main` automatisch.
Sie hat eigene Volumes (`bauplattform_test_*`) und setzt `TESTSERVER=1`: die Ablage auf dem Dateiserver wird nur **gelesen**
(Speichern, Umbenennen, Löschen werden übersprungen – `bautagebuch/core/remote.py`), es gehen **keine Mails** und **keine
Kalendertermine** hinaus (`bpcore/mail.py`, `bpcore/kalender365.py`); im Büronamen steht „TESTSERVER“. So kann man eine Kopie der
echten Datenbank einspielen, ohne dass Projektordner, Firmen oder Kalender etwas davon merken. Die eigene KI (Ollama) startet dort nur
mit `COMPOSE_PROFILES=ki`. Einspielen der Kopie: neueste Sicherung `Datenbank/bau-….dump` vom Dateiserver, dann
`docker exec -i bauplattform_db pg_restore -U bautagebuch -d bautagebuch --clean --if-exists --no-owner < bau-….dump` und die Apps neu starten.

### Datenbank-Volume umbenennen (bautagebuch_pgdata → bauportal_pgdata)

Docker kann Volumes nicht umbenennen – die Daten werden einmal bei **gestoppter** Datenbank in ein neues Volume kopiert.
Das alte Volume bleibt als Sicherung liegen. Welches Volume benutzt wird, steuert `DB_VOLUME` (Standard noch der alte Name).

1. Proxmox-Snapshot von Docker 2 anlegen.
2. In Portainer den Stack **stoppen** (*Stop this stack*).
3. Auf Docker 2 (Konsole des LXC):
   ```
   docker volume create bauportal_pgdata
   docker run --rm -v bautagebuch_pgdata:/von:ro -v bauportal_pgdata:/nach alpine sh -c "cp -a /von/. /nach/ && echo fertig"
   ```
4. In Portainer beim Stack unter *Environment variables* `DB_VOLUME` = `bauportal_pgdata` eintragen, *Update the stack*.
5. Prüfen (anmelden, ein Bericht, ein Plan). Das alte Volume `bautagebuch_pgdata` erst nach ein paar Tagen löschen.

Zurück: `DB_VOLUME` wieder entfernen → der Stack nutzt das alte Volume (Stand vor dem Kopieren).

## Eine Adresse für alle Apps (Verteiler)

Alle Apps laufen unter **einer** Adresse, unterschieden durch den Pfad – ohne eigene Subdomain, DNS-Eintrag oder Proxy-Regel je App:

| Pfad | App |
|---|---|
| `https://bauportal.gk3-architektur.de/` | Startseite / Anmeldung |
| `…/bautagebuch/` | Bautagebuch |
| `…/bauzeitenplan/` | Bauzeitenplan |
| `…/adressen/` | Adressen |
| `…/baukosten/` | Baukosten |
| `…/verwaltung/` | Verwaltung |

Den Pfad verteilt der Container `bauplattform_verteiler` (`plattform/router.py`) im Docker-Netz – nicht der Nginx Proxy Manager.
Im Nginx Proxy Manager bleibt nur **ein** Eintrag: `bauportal.gk3-architektur.de` → Docker 2, Port **8090** (wie bisher für die Startseite).
Gesteuert wird das über `BAUPORTAL_URL`; die einzelnen `*_URL`-Werte bleiben leer (gesetzte Werte haben Vorrang – in Portainer ggf. löschen).
Neue Apps bekommen künftig einfach einen weiteren Pfad.

Die bisherigen Ports (8080, 8082, …) und Subdomains funktionieren weiter, solange ihre Einträge bestehen – nützlich für Lesezeichen
der Kolleginnen und Kollegen. Sie können später entfernt werden. Ohne Nginx (Testserver): `http://<IP>:8090/bautagebuch/` usw.;
dafür in Portainer `BAUPORTAL_URL=http://<IP>:8090` setzen, damit auch die Links zwischen den Apps diesen Weg nehmen.

## Gemeinsame Anmeldung (SSO)

- Anmelden geht auf der Startseite (`:8090/login`) oder wie bisher im Bautagebuch. Beides legt eine gemeinsame Sitzung an
  (Cookie `bp_sso`, 30 Tage ab letzter Nutzung). In der Datenbank liegt nur ein Hash des Schlüssels.
- Browser senden Cookies je Rechnername und nicht je Port. Deshalb erkennen alle Apps auf demselben Server dieselbe Anmeldung.
  Wichtig: Alle Apps müssen über **denselben Namen** aufgerufen werden, also immer `http://192.168.1.10:…` oder immer `http://server:…`, nicht gemischt.
- Mit eigenen Subdomains hinter einem Reverse Proxy (z. B. `bautagebuch.firma.de`, `plan.firma.de`) in `.env` die `*_URL`-Werte,
  `SSO_COOKIE_DOMAIN=firma.de`, `TRUST_PROXY=1` und `COOKIE_SECURE=1` setzen.
- Ohne Anmeldung leitet der Bauzeitenplan zur Startseite weiter und danach wieder zurück.
- Beim ersten Anmelden mit einem Startkennwort wird ein eigenes Kennwort verlangt, egal auf welcher Seite.
- „Kennwort vergessen“ läuft wie bisher über das Bautagebuch (E-Mail-Link). Die Startseite verlinkt dorthin.

**Darstellung:** Farbschema (Dunkel, Hell, Automatisch, Klassisch Grün) und Akzentfarbe stellt jeder auf der Startseite
unter *Darstellung* ein. Das gilt für den Benutzer in allen Apps und auf allen Geräten (Spalten `users.theme`, `users.accent`).

**Anmeldung ohne Nginx:** Wird eine App direkt über IP oder Rechnername und Port aufgerufen (z. B. `http://192.168.1.20:8093`),
geht die Anmeldung über die Startseite auf demselben Rechner (`http://192.168.1.20:8090`). Cookies gelten je Rechnername,
deshalb muss man sich dort einmal getrennt anmelden. Hat ein Browser noch ein altes Anmelde-Cookie nur für einen Rechnernamen
(vor `SSO_COOKIE_DOMAIN`), prüfen alle Apps alle mitgeschickten Cookies, und die Startseite stellt es auf die Domain um.

## Adressen (eigener Container)

Dieselben Kontakte wie im Bautagebuch und im Adressbuch des Bauzeitenplans (Tabelle `contacts`), als eigene App fürs
Handy und den Rechner. Ansicht als Karten oder als **Tabelle** (direkt bearbeiten, sortieren, Spalten ein-/ausblenden, je Spalte filtern): suchen, nach Firmen/Bauherren/Baustellen und Gewerk filtern, anlegen, ändern, anrufen, E-Mail,
Karte, Visitenkarte ins Handy (vCard), Drucken (PDF, wie im Bautagebuch) und Export als Excel. Gelöscht wird in allen Apps (Bautagebuch, Bauzeitenplan, Adressen) nur ein Kontakt, der nirgends
verwendet wird: nicht in Berichten, nicht als Baustellenadresse, in keinem Bauzeitenplan als Firma (`shared/bpcore/contacts.py`).
PDFs öffnen wie im Bautagebuch in einer eigenen Ansicht (Zoom, Drucken, Teilen). Baustellenadressen (im Bautagebuch beim Projekt gespeichert) erscheinen nicht als Firmen im Bauzeitenplan.

Auf Docker 2 unter `https://adressen.gk3-architektur.de` (Nginx Proxy Manager → Docker-2-IP, Port 8093, wie die anderen Apps).
Ohne Nginx (z. B. Testserver) direkt über Port 8093; dann in Portainer `SERVER_HOST` auf die IP des Servers setzen,
damit die anderen Apps dorthin verlinken. Freischalten je Benutzer
in der Verwaltung (App „Adressen“; wer „alle Apps“ hat, bekommt sie automatisch).

## Kopfleiste (alle Apps)

Projektnamen: Jedes Feld „Projektname“ (Bauzeitenplan, Baukosten, Verwaltung, Bautagebuch) schlägt beim Tippen Projekte aus dem
Bautagebuch und Ordner auf dem Server (Ablage) vor; im Bauzeitenplan wird ein gewähltes Bautagebuch-Projekt gleich verknüpft.

Alle Apps haben oben dieselbe dunkle Leiste: **Bauportal / App** (Klick führt zur Startseite) · aktuelles Projekt ·
**KI-Auswahl** · Benutzer mit App-Umschalter, Darstellung und Abmelden. Im Bautagebuch und im Bauzeitenplan sitzt sie über der
bisherigen Leiste – deren Bedienung bleibt unverändert. Code: `shared/bpcore/head.py` und `shared/bpcore/head/` (jede App liefert
`/bp/head.js`, `/bp/head.css` und `/api/bp/ki` aus).

## KI für alle Apps

Die Auswahl in der Kopfleiste gilt für den Benutzer in allen Apps und auf allen Geräten (Spalte `users.ai`):

| Auswahl | Was | Einrichten |
|---|---|---|
| Intern | feste Regeln und Kennwerte der App, ohne Internet | – |
| Ollama | eigene KI im Büro (Container `bauplattform_ollama`), Daten bleiben intern | läuft automatisch mit; Modell über `OLLAMA_MODEL` (Standard `qwen2.5:3b`, ≈ 3 GB RAM) |
| Claude | Anthropic | Schlüssel im Bauzeitenplan → Einstellungen oder `ANTHROPIC_API_KEY` |
| Gemini | Google | `GEMINI_API_KEY` (optional `GEMINI_MODEL`) |
| ChatGPT | OpenAI | `OPENAI_API_KEY` (optional `OPENAI_MODEL`) |

Nicht eingerichtete Anbieter sind ausgegraut; ein Klick zeigt, was fehlt. Genutzt wird die KI im Bauzeitenplan
(Positionsvorschlag für neue Leistungen) und in den Baukosten (Plausibilitätsprüfung). Kostenpflichtige Anbieter sind als solche gekennzeichnet.

**Ollama:** Beim ersten Start lädt `bauplattform_ollama_modell` das Modell herunter (einige GB, dauert je nach Leitung ein paar Minuten)
und beendet sich dann. Bis dahin steht in der Auswahl „Modell wird noch geladen“. Ohne Grafikkarte antwortet das Modell langsamer
(eine Prüfung kann 30–90 Sekunden dauern). Der Container hat keinen Port nach außen. Größeres Modell: `OLLAMA_MODEL=qwen2.5:7b` (≈ 6 GB RAM).

## Baukosten (eigener Container)

Kostenermittlung nach DIN 276, gekoppelt an Bautagebuch-Projekt und Bauzeitenplan.

- **Pläne & Mengen:** PDF hochladen. Aus Vektor-PDFs (aus dem CAD) werden Räume exakt gelesen – Raumstempel mit Nummer
  („0.12 Büro 14,20 m²“) ebenso wie Beschriftungen nur aus Name und Fläche; Geschoss-Überschriften („Kellergeschoss“,
  „Erdgeschoss“ …) ordnen die Räume dem Geschoss zu. „Neu einlesen“ wertet einen früher hochgeladenen Plan mit der
  aktuellen Erkennung erneut aus. Enthält das PDF keinen Text (Scan, Bild), liest „Räume mit KI lesen“ die Räume aus dem
  Planbild (Claude, Gemini oder ChatGPT in der Kopfleiste wählen) – die Vorschläge müssen bestätigt werden. Sonst Räume von Hand eintragen.
- **Kosten:** Fläche × Kennwert je Raumtyp, Aufteilung auf KG 300/400, eigene Positionen (KG 200, 394 Rückbau, 500 …),
  Nebenkosten KG 700. Die mitgelieferten Kennwerte sind **Beispielwerte**; eigene Werte lassen sich als Vorgabe für neue Kostenermittlungen speichern.
- **Justage**: Kennwerte × Regionalfaktor × Preisstand (Baupreisindex heute ÷ Index der Kennwerte). Neben Bauteilen wählbar,
  wie die Kostengruppen ohne Bauteile gerechnet werden: Kennwert-Anteil unverändert, an die Bauteile angeglichen
  (Verhältnis Bauteile ÷ Kennwert-Anteil der bepreisten Gruppen) oder eigener Faktor. Die Prüfung meldet, wenn Bauteile und
  Kennwerte um mehr als −30 / +40 % auseinanderliegen.
- **Bauteile & Material** (Kostenberechnung): Bauteile mit Kostengruppe (3. Ebene), Material/Ausführung (Auswahl mit
  Beispielpreisen oder eigenes), Ermittlung als Rechnung („12,5 × 2,75 + 3“ ergibt die Menge), Menge, Einheit, Einheitspreis.
  „Vorschläge aus Raumbuch & Plänen“ legt die Liste aus Flächen, Geschossen und Höhen an (Bodenbeläge je Raumtyp, Wände,
  Decken, Dach, Fenster, Technik); ✨ KI prüft und ergänzt. Hat eine Gruppe der 2. Ebene Bauteile, ersetzen sie dort den
  Kennwert-Anteil; die Genauigkeit steigt entsprechend.
- **Höhen:** aus Schnitten mit Höhenkoten (OKFF) je Geschoss, sonst gilt die erste eingetragene Raumhöhe für alle.
- **⚙ Raumtypen** (Einstellung der App): Raumtypen des Büros mit Stichwörtern und Kennwerten – umbenennen, ergänzen (z. B. Tierbereich,
  Labor, Klassenraum), entfernen, Reihenfolge = Vorrang beim Zuordnen. Mitgeliefert sind allgemeine Typen (Wohnen, Küche, Bad/WC, Büro,
  Aufenthalt, Flur, Abstell/Technik, Garage, Sonstige). Raumtypen nur eines Projekts bleiben dort erhalten.
- **Mittelabfluss:** Kosten werden über die Leistungen des verknüpften Bauzeitenplans verteilt (Gewicht = Dauer, änderbar), je Monat,
  mit Baupreisindex. Der Bauzeitenplan speichert dafür seine berechneten Termine mit; ältere Pläne einmal öffnen und speichern.
- **Schätzen und Genauigkeit:** Offene Kostengruppen (KG 200, 394 Rückbau, 500 …) und die Aufteilung auf die 2. Ebene lassen sich
  schätzen – ohne KI mit Faustwerten, mit KI zusätzlich als Vergleich; jede Schätzung mit Spanne und Sicherheit. Die Übersicht zeigt,
  zwischen welchen Beträgen die Summe wahrscheinlich liegt und was die Spanne verkleinern würde (eigene Kennwerte, bestätigte Räume …).
- **Assistent:** führt in acht Schritten von der Verknüpfung bis zum PDF; jederzeit „Später weiter“, Fortschritt bleibt je Kostenermittlung erhalten.
- **PDF für den Bauherrn:** frei wählbar, was ins Paket kommt (Deckblatt, Zusammenfassung, Kosten nach DIN 276 in 1., 2. oder 3.
  Gliederungsebene, Kosten nach Nutzung, Raumbuch, Mittelabfluss mit Diagramm, Erläuterungen, Pläne als Anlage), netto oder brutto, Rundung.
  Für die 2. Ebene lassen sich die Kosten aus den Kennwerten prozentual auf KG 310 … 490 aufteilen.
- **Prüfung:** feste Regeln (doppelte Raumnummern, offene Kostengruppen, auffällige Kennwerte, fehlende Geschosse …) und – je nach
  KI-Auswahl – zusätzliche Hinweise der KI.

Auf Docker 2 unter `https://baukosten.gk3-architektur.de`: im Nginx Proxy Manager einen Eintrag → Docker-2-IP, Port 8094 anlegen
(wie bei den anderen Apps). Freischalten je Benutzer in der Verwaltung (App „Baukosten“; „alle Apps“ schließt sie ein).


**DIN 276:2018-12**: Stufen Kostenrahmen, -schätzung, -berechnung, -voranschlag, -anschlag, -feststellung; Mindest-Gliederungstiefe je Stufe
(Schätzung 2. Ebene, ab Berechnung 3. Ebene) wird in der Prüfung gemeldet, ebenso fehlende Kostengruppen der 1. Ebene. Kostenstand und
Kostenrisiken (Prozent mit Begründung) werden im PDF gesondert ausgewiesen.
**Vergleichsobjekte**: abgerechnete Projekte (Kosten → „als Vergleichsobjekt speichern“) und importierte Kennwerte (Excel/CSV, z. B. Export aus
BKI, sirAdos, DBD) ergeben je Raumtyp Mittelwert und Spanne; „Ø Vergleichswerte übernehmen“ setzt sie ein. Zugänge zu den kostenpflichtigen
Kostendatenbanken hinterlegt der Administrator unter „Kostendatenbanken“ (direkte Abfrage, sobald ein Anbieter eine Partner-Schnittstelle freigibt).
Beim Öffnen erklärt ein Hinweisfenster Grundlagen und Grenzen der Ermittlung („nicht mehr anzeigen“ je Benutzer).

## Aufgaben & Mängel (eigener Container)

Adresse: `/maengel` (Container `bauplattform_aufgaben`, Port 8095). Oben „Meine Projekte“ (im Bautagebuch als zuständig
eingetragen) oder „Alle Projekte“.

- **Mängel:** alle Mängel aus den Bautagesberichten (✉ Mängelrüge: am Bildschirm ausfüllbares PDF an die Firma mit Frist, nach VOB/B § 4 Abs. 7 vor bzw. § 13 Abs. 5 nach der Abnahme, auf Wunsch mit Androhung der Auftragsentziehung, Fotos als Anlage) (umschaltbar: Zu erledigen, Weisungen) mit Foto, Projekt, Bericht,
  Firma und Frist. Abhaken, Frist verschieben (+1/+2 Wochen), Firma eintragen – gespeichert wird im Bautagebuch.
  Filter nach Projekt, Firma, Status; „Mängelliste drucken“ als PDF (z. B. für eine Firma).
- **Termine:** Berichtstage der letzten 120 Tage, an denen eine Firma laut verknüpftem Bauzeitenplan auf der Baustelle sein sollte, im Bautagebuch aber nicht als
  anwesend eingetragen ist (nicht bestätigt bzw. vom Bauleiter als „nicht da“ bestätigt). Je Firma ✉ Terminrüge: Aufforderung zur Abhilfe nach VOB/B § 5 Abs. 3
  (Fristsetzung, auf Wunsch Androhung der Auftragsentziehung § 5 Abs. 4 i. V. m. § 8 Abs. 3) als ausfüllbares PDF. Im Bautagebuch schlägt der Abschnitt
  „Anwesende“ die laut Plan erwarteten Firmen vor (✓ anwesend / ✗ nicht da / nicht nötig; Tabelle soll_anwesend, Migration 0009).
- **Versand und Kalender:** Mängel- und Terminrüge als PDF, per E-Mail an mich (zum Weiterleiten) oder direkt an die Firma (auf Wunsch Kopie an
  mich), mit der eigenen Unterschrift (Handyfoto, wird freigestellt). 📅 schickt Erinnerungen und Fristen als Kalendereinladung (iCalendar REQUEST,
  gleiche UID beim Verschieben); auf Wunsch automatisch. Persönliche Einstellungen: Benutzermenü jeder App → „Unterschrift, E-Mail & Kalender“
  (api/bp/konto, api/bp/signatur); E-Mail-Vorlagen mit Platzhaltern: Verwaltung → Einstellungen → E-Mail-Vorlagen (api/bp/mailvorlagen).
- **Erinnerungen:** aus dem Bautagebuch (Erledigungsdatum – Mail verschickt das Bautagebuch am Fälligkeitstag), aus den
  Bauzeitenplänen („Firma kommt zum ersten Mal / wieder auf die Baustelle“, Vorlauf Standard 7 Tage) und eigene.
  Abgelaufene lassen sich neu terminieren (morgen, +3 Tage, +1 Woche, nächster Montag oder Datum/Uhrzeit) oder abhaken.
  ↶ Rückgängig für Abhaken, Termine und Löschen.
- **⚙ Einstellungen:** Vorlauf, Uhrzeit, ab wie vielen Tagen Pause eine Firma „wieder“ kommt, E-Mail an/aus, Testmail.
  Empfänger: Zuständige des verknüpften Bautagebuch-Projekts, sonst wer den Plan zuletzt gespeichert hat.
- E-Mails gehen über den Mailserver aus Verwaltung → Einstellungen → Mailserver. Die App gleicht die Pläne alle 5 Minuten ab.
- Neue App: Wer Bautagebuch oder Bauzeitenplan nutzen darf, bekommt sie automatisch; abwählbar in der Verwaltung.

## Ausschreibung & Abrechnung (eigener Container)

Pfad `/ava`, Container `bauplattform_ava` (Port 8097, gleiches Image wie die Plattform, `APP_MODULE: ava`). Tabellen `ava_lv`,
`ava_angebot`, `ava_aufmass`, `ava_rechnung` (Migration `0013_ava.sql` im Bautagebuch), Fotos in `ava_bild` (`0014_ava_bilder.sql`).

- Leistungsverzeichnisse je Projekt (Titel, Untertitel, Positionen mit Kurz-/Langtext, Menge, Einheit, Normal-/Bedarfs-/Wahl-/Pauschalposition,
  Hinweistexte, KG nach DIN 276, Schätzpreis). Übernahme aus den Bauteilen einer Kostenermittlung oder als Kopie eines anderen LV. Langtext-Vorschlag mit der gewählten KI.
- Fotos/Skizzen je Position (hochladen, Strg+V oder hineinziehen; verkleinert auf 1600 px) – stehen unter dem Langtext und im LV-Ausdruck.
- Ansicht wie in gewohnten AVA-Programmen: links die Arbeitsschritte, oben ein Menüband, „Aufträge“ als aufklappbarer Baum Projekt › LV › Titel › Position mit Firma, Auftrag, Nachträgen, Prognose, Bedarfsposition und KG.
- GAEB DA XML 3.x lesen (X81–X86) und schreiben (X83 an die Bieter, X84, X86 Auftrags-LV) – `bpcore/gaeb.py`; Excel zum Ausfüllen für Firmen ohne GAEB, ausgefülltes Excel wieder einlesen.
- Angebote mit Preisspiegel (niedrigster Preis, Ausreißer > 30 %, Nachlass, Rang), Vergabe: die Preise des Angebots werden die Auftragspreise.
- Nachträge als Positionen mit Status (angemeldet, beauftragt, abgelehnt) und eigenem Preis.
- Aufmaß je Position mit Rechenweg („2 × 3,50 × 2,75 – 0,885 × 2,135“), Übernahme aus dem Raumbuch der Baukosten.
- Rechnungsprüfung kumuliert: Aufmaß × Auftrags-EP − Nachlass − Abzüge − Sicherheitseinbehalt − bisher anerkannt = Zahlbetrag; „Prüfung abschließen“ hält den Aufmaßstand fest.
- PDFs: LV (mit Preisfeldern oder Schätzpreisen), Preisspiegel, Massenermittlung, Rechnungsprüfblatt. Übersicht aller LV eines Projekts (Kostenkontrolle).
- Neue App: Wer Baukosten oder Bauzeitenplan nutzen darf, bekommt sie automatisch; abwählbar in der Verwaltung.

- Aufträge auch ohne LV und Angebot: „＋ Neuer Auftrag“ (Bereich Aufträge) mit Häkchen **ohne Angebot und LV** – nur Firma und Summe;
  ohne Häkchen ein vorhandenes LV (mit Angebot) wählen oder ein neues LV anlegen, das gleich an die Firma vergeben ist.
- LV-Stand **nicht vergeben** (mit Grund): ausgeschrieben, aber nicht beauftragt – zählt nicht für Budget, Prognose und To-dos; Angebote bleiben.

## ORCA-Import (eigener Container)

Container `bauplattform_orca` (Port 8100, gleiches Image wie die Plattform, `APP_MODULE: orca_import`, **ein** Arbeitsprozess) – nur für
Administratoren, direkt über `http://<Server>:8100` (nicht über den Verteiler). Bleibt dauerhaft, für die Übernahme laufender Projekte aus ORCA AVA.

- Hochladen: ORCA-Projektsicherung (`*.zip`) oder Projektdatei (`*.ava`, Access 97). Gelesen wird ohne Zusatzpakete (`orca_jet3.py`).
- Umsetzen (`orca_lesen.py`): je ORCA-Auftrag ein LV mit Vergabe (Auftragspreise, Nachlass, Einbehalt, Skonto), Nachtragspositionen als
  beauftragte Nachträge, Preisspiegel als Angebote, Rechnungen mit Prüfstand je Position (Teil-, Schluss-, Regie-, Nachtragsrechnungen,
  Freigabe der Sicherheit). Aufträge ohne Positionen bekommen das Häkchen „ohne Angebot und LV“, LVs ohne Auftrag den Stand „nicht vergeben“.
- Vorschau: nachgerechnet mit den Rechenfunktionen der AVA, Abweichungen zu ORCA je Rechnung; Firmen werden mit den Adressen abgeglichen
  (ORCA hat die Adressen in einer eigenen Datenbank – übernommen werden die Namen, neue Firmen nur mit Namen).
- Eintragen: als **eigene AVA-Version** im gewählten Projekt – vorhandene LVs bleiben unberührt; wahlweise gleich als gültige Version.

## Pläne & Dateien (eigener Container)

Pfad `/plaene`, Container `bauplattform_plaene` (Port 8096, gleiches Image wie die Plattform, `APP_MODULE: plaene`).
Liest über das Bautagebuch (nur das hat Zugang zur Ablage) die Pläne im Projektordner:

- Sucht automatisch Ordner mit „Plan/Pläne/Zeichnung/CAD …“ im Namen; ein anderer Ordner lässt sich wählen und je Projekt merken.
- Liest die Plannummerierung `A526 [Kennung] 2.1.1.2 [INDEX B] Titel`: Phase und Planart aus den ersten Ziffern, der höchste Index ist der neueste Stand (ältere Stände aufklappbar).
- Gewerk aus der Kennung (ELT → Elektro) oder Stichwörtern im Titel (Bodenplatte → Rohbau …), sonst von Hand wählen (wird je Projekt gemerkt).
- Versand: Empfänger nach Gewerk aus den Firmen des Projekts (Bauzeitenplan, Anwesende), passende CAD-Dateien (gleiche Nummer und Index) auf Nachfrage,
  direkt an die Firmen (Kopie an mich) oder an mich zum Weiterleiten; Größenhinweis; Download-Link über Nextcloud folgt.
- Mailtext: Vorlage „Planversand“ (Mein Konto → E-Mail-Vorlagen) mit {planliste}, {firma}, {anzahl}.
- Planversandliste je Projekt (Tabelle `planversand`), als PDF.
- ⚙ Einstellungen (Administrator): Phasen, Planarten, Kennungen, Stichwörter, Größe der Anhänge.

Der Produktivserver bekommt den Container mit der nächsten Freigabe (`server/produktiv-naechste.yml`).

## Baudaten (eigener Container)

Pfad `/baudaten`, Container `bauplattform_baudaten` (Port 8099, gleiches Image wie die Plattform, `APP_MODULE: baudaten`).
Alle Positions- und Preisdaten an einer Stelle; Ausschreibung & Abrechnung und Baukosten fügen daraus Positionen ein.

- **Positionsdatenbank der Bauplattform** (Katalog „gk3“): rund 64.000 Positionen in 66 Leistungsbereichen (Nummern angelehnt an das
  StLB-Bau), je Position Kurztext (max. 70 Zeichen) und ausführliche Bezeichnung, Langtext (Grundtext + Folgetext), Einheit, DIN-276-Kostengruppe und Preisspanne von – mittel – bis.
  Texte und Kalkulation sind eigene, Preisstand 11/2026. Quelle und Pflege: `positionsdb/` (siehe `positionsdb/README.md`).
- **Importierte Kataloge**, z. B. Sirados: als GAEB-Datei (X81–X86) einlesen oder aus einem LV der Ausschreibung übernehmen (⤒ Import, nur
  Administrator). Die Daten liegen nur in der Datenbank des Büros, nie im Repository – Lizenz des Anbieters beachten.
- **Eigene Positionen** (Katalog „Eigene Positionen“): neu anlegen oder aus jedem Katalog übernehmen und anpassen; **eigene Preise** aus Vergaben
  je Position notieren (Median wird angezeigt).
- **Preise auf heute**: aktueller Baupreisindex und Regional-/Projektfaktor (⚙ Preise); sirAdos-Kataloge werden aus ihrem Preisstand
  mit der Destatis-Reihe fortgeschrieben (je Katalog überschreibbar); der Administrator pflegt Index, Faktoren und die
  Verrechnungslöhne je Gewerk – Katalogpreise werden dann aus Zeitansatz × Lohn + Stoff neu gerechnet.
- In **Ausschreibung & Abrechnung**: in der **Kopierquelle** unter „Kataloge“ („Baudaten: …“) – je Gruppe blättern oder suchen, anhaken oder
  ziehen; Langtext, Einheit, KG und Preis als Schätzung. Die Auswahl der Kopierquelle hat unter „Projekte“ ein Filterfeld.
  In **Baukosten** bei den Bauteilen: „+ aus Baudaten“.
- Wer Baukosten oder Ausschreibung nutzt, bekommt die App automatisch (in der Verwaltung abwählbar).
- Tabellen `pdb_*` (Migrationen 0023 Schema, 0025 Katalogdaten im Bautagebuch); gemeinsamer Zugriff `shared/bpcore/baudaten.py`.

## Kommunikation (eigener Container)

Pfad `/kommunikation`, Container `bauplattform_kommunikation` (Port 8098, gleiches Image wie die Plattform, `APP_MODULE: kommunikation`).
Zeigt, was aus der Plattform an wen verschickt wurde – Planversand, Mängel- und Terminrügen (per E-Mail, an mich zum Weiterleiten
oder als PDF) – aus dem Benachrichtigungsverlauf (Tabelle `benachrichtigungen`). Die App liest nur.

- Projekt oben im Kopf oder alle Projekte; links „Mit wem“ mit Anzahl und letzter Sendung, rechts der Verlauf nach Tagen.
- Ein Kontakt (links anklicken oder „👤 Kontakt …“): alles, was ihm geschickt wurde, über alle Projekte – links nach Projekten.
- Filter nach Art, „nur von mir“, Suche; Export für Excel (CSV) und Drucken als Nachweis.
- Wer Bautagebuch, Bauzeitenplan, Planstand oder Aufgaben & Mängel nutzt, bekommt die App automatisch (in der Verwaltung abwählbar).

## Verwaltung (eigener Container)

**Einstellungen** (Reiter in der Verwaltung, alles was für alle Apps gilt): Darstellung (Farbschema, Akzentfarbe), KI (Positionsvorschlag
an/aus, Schlüssel und Modelle für Claude, Gemini, ChatGPT, Zustand von Ollama mit Verbindungstest), Firma & Logo, Ablage, Mailserver und
Datensicherung. Die letzten vier gehören technisch zum Bautagebuch – die Verwaltung bearbeitet dieselben Daten, im Bautagebuch bleiben sie
wie gewohnt erreichbar. Einstellungen einer einzelnen App stehen in der App: Baukosten → ⚙ Raumtypen, Bauzeitenplan → Reiter „Leistung“
(Nachfragen beim Löschen). Das Büro-Logo steht in der Kopfzeile aller Ausdrucke (Bautagebuch, Baukosten, Adressverzeichnis, Bauzeitenplan).

Nur für Administratoren. Die Benutzer sind dieselben wie im Bautagebuch.

- **Projekte anlegen, bearbeiten, archivieren:** Bauvorhaben, Bauherrschaft, Adresse, Projektordner und „Sichtbar für“ (zuständige
  Bauleiter, wie im Bautagebuch) – gespeichert über das Bautagebuch, gilt für alle Apps.
- **Projekte:** alle Projekte über alle Apps – je Projekt Bautagebuch, verknüpfte Bauzeitenpläne und Kostenermittlungen.
  „Öffnen in …“ springt direkt in die gewählte App. Fehlt das Bautagebuch-Projekt, wird angeboten, es anzulegen und zu verknüpfen.
  „Löschen …“ löscht nur die angekreuzten Teile (z. B. nur den Bauzeitenplan); das Bautagebuch-Projekt erst nach Eintippen des Namens,
  das Bautagebuch löscht dabei selbst Berichte und Fotos.

- **Benutzer:** anlegen (das Startkennwort wird einmal angezeigt), Apps je Benutzer freischalten (Bautagebuch, Bauzeitenplan),
  Administrator, sperren (meldet sofort überall ab), Kennwort zurücksetzen, überall abmelden, löschen.
- **Angemeldet:** alle Geräte mit aktiver Anmeldung, einzeln beendbar.
- **Zustand:** Erreichbarkeit und Version aller Dienste, Datenbank (Version, Größe), Anzahl der Datensätze, Ergebnis der Übernahme.
- **Protokoll:** Anmeldungen und Änderungen der Verwaltung (das ausführliche Protokoll bleibt im Bautagebuch).

Die Benutzerverwaltung im Bautagebuch (Einstellungen) funktioniert weiter. Beide arbeiten auf derselben Tabelle.

## Versionen und Änderungsverlauf (alle Apps)

Jede Speicherung von Einstellungen und Stammdaten legt automatisch einen Stand an (Tabelle `versionen`, `shared/bpcore/versionen.py`):
allgemeine Einstellungen (Firma, Ablage, Mailserver), E-Mail-Vorlagen, KI-Einstellungen, Leistungskatalog/Phasen/Firmen/Vorlagen/Assistent
des Bauzeitenplans, Einstellungen von „Aufgaben & Mängel“, Raumtypen und Kostenermittlungen, Adressen (auch gelöschte) und die
persönlichen Einstellungen jedes Benutzers (Versand, Kalender, Darstellung, KI, Assistent, Unterschrift).

- Jeder Stand nennt die Änderungen in Worten („Büroname: „A“ → „B““); Speicherungen desselben Benutzers innerhalb von 10 Minuten werden zusammengefasst.
- **↶ Verlauf** neben dem Speichern-Knopf: Stände ansehen, mit dem jetzigen vergleichen, wiederherstellen (der jetzige bleibt erhalten), Stände benennen.
- Persönliche Einstellungen sieht und ändert nur der Benutzer selbst, allgemeine Einstellungen nur der Administrator, Stammdaten alle.
- Kennwörter und API-Schlüssel werden nie gespeichert (nur eine Prüfsumme); beim Wiederherstellen bleiben sie unverändert.
- Verwaltung → Einstellungen → **Änderungsverlauf**: alle Stände mit Filter; Aufbewahrung mit Vorschlägen und geschätztem Speicherbedarf
  (Standard: alle Stände 90 Tage, danach einer je Tag bis 730 Tage). Aufgeräumt wird einmal täglich; benannte Stände, der Ausgangsstand und der jüngste Stand bleiben immer.
- Bautagesberichte und Bauzeitenpläne haben weiterhin ihren eigenen Verlauf in der App („Version speichern“ im Bauzeitenplan).


### Sicherung auf dem Dateiserver und Wiederherstellung nach einem Ausfall
Verwaltung → Einstellungen → Datensicherung → „Sicherung auf dem Dateiserver“: Pfad z. B. `\\192.168.233.88\Projekte\Bauportal`
(Zugang wie bei der Ablage). Nach jeder täglichen und jeder manuellen Sicherung legt das Bautagebuch dort `Datenbank/bau-….dump`
(die letzten 30), `Logo/` und `LIESMICH.txt` (Anleitung) ab. Nach einem Ausfall: neu installieren, Ablage und Pfad eintragen,
die Sicherung „Zurückholen und wiederherstellen“. Fehlende Fotos holt die App danach (und bei jedem Start) aus den Projektordnern
auf dem Dateiserver zurück – Voraussetzung: die Ablage war eingeschaltet (`images.sent_remote`).

## Gemeinsame Daten

| Daten | Tabelle | genutzt von |
|---|---|---|
| Benutzer, App-Rechte, Sperre | `users` (`apps`, `active`) | allen |
| Anmeldungen | `sso_sessions` | allen |
| Projekte | `projects` | Bautagebuch; Bauzeitenpläne können damit verknüpft werden (`gantt_projects.project_id`) |
| Kontakte / Firmen | `contacts` | Bautagebuch (Kontakte) und Bauzeitenplan (Adressbuch) |
| Bauzeitenpläne, Versionen | `gantt_projects`, `gantt_versions` | Bauzeitenplan |
| Vorlagen, Katalog, Abschnitte … | `gantt_store` | Bauzeitenplan |
| Protokoll | `audit_log` | Bautagebuch, Startseite, Verwaltung, Baukosten |
| Kostenermittlungen, Pläne, eigene Kennwerte | `bk_projects`, `bk_files`, `bk_store` | Baukosten |
| KI-Auswahl je Benutzer | `users.ai` | alle (Kopfleiste) |

Das Schema gehört dem Bautagebuch (`bautagebuch/pg_migrations/`). Die anderen Dienste warten beim Start, bis die
benötigte Version da ist. Neue Tabellen kommen immer als neue Migration dazu (nur ergänzen, nie ändern).

**Mehrere Benutzer im Bauzeitenplan:** Jeder Plan hat einen Änderungszähler. Wer auf einem veralteten Stand speichert,
überschreibt nichts. Die App fragt nach (*Neu laden* / *Meine Fassung speichern* / *Als Kopie speichern*). Wer den Plan gerade offen hat,
steht oben in der Kopfleiste. Neue Stände anderer werden automatisch geladen.

## Ordner

```
bauplattform/
├── docker-compose.yml     alle Dienste
├── .env.example           Vorlage für .env (Kennwörter, Ports, Adressen)
├── update.sh              installieren / aktualisieren / sichern / zurückspielen (auf dem Server)
├── deploy.sh, deploy.ps1  neue Version vom eigenen Rechner auf den Server bringen
├── VERSION
├── shared/bpcore/         gemeinsamer Kern: Datenbankzugriff, Anmeldung (sso.py), App-Adressen
├── bautagebuch/           Bautagebuch (Flask) – besitzt das Datenbankschema
├── gantt/                 Bauzeitenplan: Server (app.py, Flask) + Oberfläche (public/)
└── plattform/             Startseite, Verwaltung, Adressen, Baukosten – ein Image für vier Container
```

## Direkt von Claude installieren lassen

Es gibt zwei Wege, damit Claude neue Versionen selbst auf den Server bringt:

1. **Über deinen Rechner:** Den Chat in der Claude-Desktop-App öffnen und mit dem Rechner verknüpfen, auf dem der SSH-Schlüssel
   für den Server liegt. Claude führt dann `deploy.ps1` bzw. `deploy.sh` aus.
2. **Über GitHub:** Der Code liegt in einem Repository, GitHub baut die Images, und der Server holt neue Versionen selbst ab.
   Dafür muss der Server nach außen nichts freigeben. Voraussetzung ist ein mit Claude verbundenes GitHub-Konto.
