# Bautagebuch – Aufbau & Erweiterung

```
app.py            Start, Login, lädt alle Module automatisch
core/db.py        PostgreSQL-Verbindung (sqlite-ähnliche Schnittstelle), Migrationen, Helfer (insert/update)
core/storage.py   Bilder-Dateispeicher
modules/*.py      je Funktionsbereich eine Datei mit einem Flask-Blueprint "bp"
pg_migrations/*.sql Datenbankschema, nummeriert (0001_, 0002_, …)
static/index.html Oberfläche
data/             uploads/, backups/   (Volume bautagebuch_data)
PostgreSQL        eigener Container bauportal_db (früher Bautagebuch_db), Volume bautagebuch_pgdata
```

## Goldene Regeln für die Datenbank
1. **Nur additiv.** Neue Tabellen, neue Spalten, neue Indizes. Nichts umbenennen, nichts löschen.
   Muss ein Feld ersetzt werden: neue Spalte anlegen, Daten kopieren, alte Spalte einfach stehen lassen.
2. **Angewendete Migrationen nie mehr ändern.** Änderungen immer als neue Datei mit der nächsten Nummer.
3. **Neue Spalten brauchen einen DEFAULT** (oder NULL erlauben), damit alte Zeilen gültig bleiben.
4. Vor jeder Migration entsteht automatisch eine Sicherung in `data/backups/` (die letzten 10 bleiben).
   Schlägt eine Migration fehl, wird sie vollständig zurückgerollt und die App startet nicht.
5. Eine Datenbank, die neuer ist als die App, wird abgelehnt (Schutz vor versehentlichem Zurückstellen).

## So erweiterst du
**Neues Feld an Projekt/Bericht/Eintrag/Bild** – eine Migration genügt, der Code muss nicht geändert werden:
```sql
-- migrations/0003_bauleiter.sql
ALTER TABLE reports ADD COLUMN bauleiter TEXT DEFAULT '';
```
Die API liefert und speichert die Spalte automatisch (`PUT /api/reports/<id>` mit `{"bauleiter": "…"}`).
Für Experimente ohne Migration gibt es in jeder Tabelle das JSON-Feld `extra`.

**Neuer Listen-Abschnitt** (z. B. Material) – wieder nur eine Migration:
```sql
INSERT INTO sections(key,title,type,placeholder,position) VALUES('material','Material','list','Material eingeben',45);
```
Er erscheint im Bericht an der Position 45 und kann Einträge speichern.

**Neuer Abschnitts-Typ** (z. B. Unterschriften): Eintrag in `RENDER` in `static/index.html`
und eine Zeile in `sections` mit dem neuen `type`.

**Neuer Funktionsbereich** (Beispiel: `modules/contacts.py`): `migrations/000N_….sql` mit der Tabelle,
dazu eine neue Datei in `modules/` mit `bp = Blueprint(...)` und den Routen. Mit `db.insert/update`
bekommst du Teil-Updates, Schutz von Schlüsselfeldern und `extra` gratis. Die Datei wird beim Start automatisch geladen.

## Sicherung & Umzug
- `GET /api/export` liefert alles als versionierte JSON-Datei.
- Komplett sichern: den Ordner `data/` kopieren (Datenbank + Bilder).

## Kontakte & Anwesende
- Tabelle `contacts` (Firma, Gewerk, Ansprechpartner, Telefon, Mobil, E-Mail, Adresse, Notizen, `extra`).
- Abschnitte mit `"link_contacts": true` in `sections.extra` (aktuell „Anwesende“) legen eingetragene Namen
  automatisch als Kontakt an (Groß-/Kleinschreibung egal) und verknüpfen den Eintrag über `items.contact_id`.
- Der Text im Bericht ist eine Momentaufnahme: Umbenennen oder Löschen eines Kontakts verändert alte Berichte nicht.
- Neues Kontaktfeld: Spalte per Migration anlegen + eine Zeile in `CFIELDS` in `static/index.html`.

## Projektadresse, Standort & Wetter
- `projects` hat `street`, `zip`, `city`, `lat`, `lon` (Migration 0005). Ändert sich die Adresse, bestimmt der Server die Koordinaten
  über OpenStreetMap/Nominatim neu (`modules/projects.py`, `core/geo.py`). Direkt gesetzte `lat`/`lon` werden nicht überschrieben.
- Die Oberfläche wählt beim Start (und über den 📍-Knopf) das Projekt, das innerhalb von `NEAR_M` (600 m) liegt, per GPS aus.
- `GET /api/geo?lat&lon` liefert Wetter (Open-Meteo) und Adresse, `GET /api/geocode?q=` sucht eine Adresse. Beides läuft über den Server.
- Die App selbst sperrt GPS nicht mehr. Der Browser verlangt für die Standortfreigabe allerdings selbst HTTPS (oder localhost) – im Produktivbetrieb hinter dem Reverse Proxy ist das gegeben.
- Adresse aus dem Projektnamen: Beim Anlegen (und einmalig für bestehende Projekte ohne Adresse) wird der Name geparst (Kürzel wie „A481“ entfällt), bei OpenStreetMap/Nominatim gesucht und die PLZ ergänzt. Treffer werden auf Plausibilität (Straße/Ort) geprüft und im Reiter „Projekt“ als „bitte prüfen“ markiert. Pro Projekt gibt es nur einen automatischen Versuch (`extra.addr_tried`).


## Reverse Proxy (Produktivbetrieb)

In `docker-compose.yml`:

```yaml
ports: ["127.0.0.1:8080:8000"]   # nur lokal erreichbar, der Proxy ist der einzige Zugang
environment:
  TRUST_PROXY: "1"     # liest X-Forwarded-Proto/-Host/-For (ProxyFix)
  COOKIE_SECURE: "1"   # Session-Cookie nur über HTTPS
```

Der Proxy muss `Host`, `X-Forwarded-Proto`, `X-Forwarded-For` und `X-Forwarded-Host` weiterreichen, Foto-Uploads (`client_max_body_size 40m;`) und PDF-Erzeugung (Timeouts >= 60 s) erlauben.

Caddy:

```
bau.example.de {
    request_body { max_size 40MB }
    reverse_proxy 127.0.0.1:8080
}
```

nginx:

```
location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Host $host;
    client_max_body_size 40m;
    proxy_read_timeout 90s;
}
```

`TRUST_PROXY=1` nur setzen, wenn wirklich ein Proxy davorsteht – sonst lassen sich Header fälschen.


## Fotos, HEIC und Ablage auf dem Server

- **HEIC/HEIF** (iPhone) wird beim Hochladen in `core/storage.py` automatisch in JPG umgewandelt (`pillow-heif`, Drehung aus den EXIF-Daten wird übernommen). Alte HEIC-Dateien werden beim Start einmalig umgewandelt.
- **Einstellungen** (Reiter „Einstellungen“): Firmendaten (erscheinen in der PDF-Fußzeile), Logo, Ablage. Alles liegt in der Tabelle `settings`; neue Einstellungen brauchen nur ein neues Feld im Frontend (`CO`/`stIn`).
- **Ablage** (`core/remote.py`, `core/sync.py`, `modules/store.py`): Modus `smb` (Windows-Freigabe mit Benutzer/Kennwort über `smbprotocol`) oder `folder` (Ordner im Container, z. B. ein per CIFS eingebundenes Laufwerk). Ziel = Basisordner + Vorlage:
  - Fotos: `{projekt}/{kuerzel} 8. Fotos + Bautagebuch/{kuerzel} Fotos/{datum}` → z. B. `A483 Bovermanns Kamp 20, Essen, erledigt/A483 8. Fotos + Bautagebuch/A483 Fotos/2026-10-28/2026-10-28_0042.jpg`
  - PDFs: `{projekt}/{kuerzel} 8. Fotos + Bautagebuch/{kuerzel} Bautagebuch` → `…/A483 Bautagebuch/A483_BT_2026-10-28.pdf`
  - Platzhalter `{projekt}` `{kuerzel}` `{datum}` `{jahr}` `{monat}`. `{kuerzel}` = erstes Wort des Projektnamens. `{projekt}` = im Projekt eingetragener „Projektordner auf dem Server“ (`projects.folder`); ist er leer, wird beim Übertragen auf dem Server ein vorhandener Ordner gesucht, der mit dem Kürzel beginnt (so findet „A483 Bovermanns Kamp 20, Essen“ den Ordner „A483 Bovermanns Kamp 20, Essen, erledigt“), sonst der Projektname verwendet. Ungültige Windows-Zeichen werden ersetzt.
- **Namensvorschläge**: Beim Anlegen eines Projekts schlägt das Namensfeld (native `<datalist>`) vorhandene Serverordner vor (`GET /api/store/folders?q=`, 60 s Cache, bereits angelegte Projekte ausgenommen).
- **Warteschlange**: Jedes Foto/PDF legt einen Auftrag in `sync_jobs` an, ein Hintergrund-Thread überträgt ihn. Ist der Server nicht erreichbar, bleibt der Auftrag erhalten und wird mit wachsendem Abstand (bis 1 h) erneut versucht; die App selbst bleibt benutzbar. „Jetzt übertragen“ und „Vorhandene Fotos nachträglich übertragen“ gibt es in den Einstellungen. Ein erneut erzeugtes PDF überschreibt das alte am Ziel. `GET /api/reports/<id>/pdf?save=0` erzeugt ohne Ablage.
- Das Kennwort liegt im Klartext in der Datenbank (und damit in den Backups) und wird nie über die API ausgegeben. Eigenes Konto mit Schreibrecht nur auf diese Freigabe verwenden.
- Alternative ohne SMB-Zugangsdaten in der App: Freigabe auf dem Docker-Host einbinden und Modus „Ordner im Container“ nutzen (siehe Beispiel in `docker-compose.yml`).


## Benutzer und Anmeldung

- Tabellen `users` und `password_resets` (Migration 0007). Kennwörter nur als Hash (werkzeug), Reset-Links nur als SHA-256-Hash, 1 Stunde gültig, einmal verwendbar.
- Erster Start: Benutzer **admin**, Kennwort **admin**; die App erzwingt sofort ein neues Kennwort (mind. 8 Zeichen, nicht „admin“/Benutzername). Bis dahin sperrt der Server alle anderen API-Aufrufe (HTTP 403 `must_change`). Neue Benutzer und vom Admin gesetzte Kennwörter müssen ebenfalls beim ersten Login geändert werden.
- Nur der Administrator sieht und nutzt: Benutzerverwaltung, E-Mail-Einstellungen, Firmendaten/Logo, Ablage, Export (`admin_only()` in `app.py`). Normale Benutzer sehen unter „Einstellungen“ nur „Mein Konto“ (E-Mail, Kennwort ändern). Alle Benutzer arbeiten mit denselben Projekten.
- „Kennwort vergessen“: Name oder E-Mail eingeben → Link per E-Mail. Die Antwort ist immer gleich, egal ob es das Konto gibt. Bremse: 5 Fehlversuche je Name/IP und 5 Anfragen je IP in 10 Minuten.
- E-Mail (`core/mail.py`): SMTP mit STARTTLS, Port 587, Gmail (`smtp.gmail.com`, App-Passwort nötig) oder Office 365 (`smtp.office365.com`, „Authentifizierter SMTP-Versand“ muss für das Postfach erlaubt sein; Microsoft schaltet das teils ab). Kein OAuth. Die App-Adresse in den Links kommt aus der Einstellung `app_url`, sonst aus der Anfrage (hinter dem Proxy korrekt, wenn `TRUST_PROXY=1`).
- Kennwort des Admins vergessen und keine Mail eingerichtet: `docker compose exec bautagebuch python -m core.auth reset-admin` setzt es auf „admin“ zurück (muss dann wieder geändert werden).
- `DIARY_PASSWORD` gibt es nicht mehr. `SECRET_KEY` sollte gesetzt und geheim bleiben (Sitzungen).

## GPS über http:// (nur zum Testen)

Chrome/Edge sperren die Standortabfrage auf `http://`-Adressen (außer localhost) – das ist eine Browser-Regel, die die App nicht aufheben kann. Zum Testen im LAN: `edge://flags/#unsafely-treat-insecure-origin-as-secure` (bzw. `chrome://flags/…`) öffnen, `http://192.168.x.x:8080` eintragen, auf „Enabled“ stellen und den Browser neu starten. Im Produktivbetrieb hinter dem HTTPS-Reverse-Proxy ist nichts nötig.

- **Administratoren**: Jeder Benutzer kann vom Admin zum Administrator gemacht werden (Kontrollkästchen in der Benutzerliste). Man kann sich nicht selbst herabstufen oder löschen; der Benutzer „admin“ ist nicht lösch- und umbenennbar.
- **Bauleitung vor Ort**: Neue Tagesberichte übernehmen den Namen des angemeldeten Benutzers (außer „admin“ – dann der Wert des letzten Berichts). Das Feld bleibt frei änderbar; weitere Benutzer lassen sich per Antippen ergänzen (`GET /api/people`).

## Kopfzeile: Projekt- und Berichtsauswahl

Links in der Kopfzeile stehen zwei gleich gestaltete Auswahlknöpfe: Projekt (`#projBtn`) und Tagesbericht (`#repBtn`). Beide öffnen dasselbe Auswahlfenster (`#sheet`, Modus `proj` oder `rep` in `openSheet(mode)`) mit Suche und Liste; im Berichtsmodus mit „Neuer Tagesbericht“ als Fußzeile. Der Reiter „Projekt“ ist entfallen: Projektdaten (Bauherr, Adresse, Projektordner, Löschen) erreicht man über das Projekt-Auswahlfenster („Projekt bearbeiten“). Reiter gibt es nur noch für Bericht und Kontakte; „Einstellungen“ und „Abmelden“ stehen im Menü ⚙.

## Eingabezeilen (Anwesende, Notizen …)

Die Zeile zum Hinzufügen öffnet sich mit „＋“ (`adding`) und schließt sich automatisch: nach dem Hinzufügen (die iPhone-Tastatur wird dabei auch geschlossen) und wenn sie leer ist und man woanders hintippt. Mit angefangenem Text bleibt sie offen.

## Kontakte: Ansicht und Bearbeiten

Ein Kontakt wird zuerst nur angezeigt (nur ausgefüllte Angaben, Telefon/E-Mail als Links). Der Stift oben rechts öffnet die ganze Maske, ✓ schließt sie wieder; „Kontakt löschen“ gibt es nur in der Maske. Öffnet man einen Kontakt über den Firmennamen im Tagesbericht, steht oben „‹ Zurück zum Tagesbericht“ (`cfrom`). Neu angelegte Kontakte öffnen direkt in der Maske.

## Erledigungsdatum und E-Mail-Erinnerung

- Migration 0008/0009: `items.due`, `items.due_time` (JJJJ-MM-TT), `items.remind_user`, `items.reminded`; Abschnitte mit `sections.extra = {"due": true}` (Mängel, Weisungen, Zu erledigen) zeigen die Datumsbedienung. Ein weiterer Abschnitt bekommt sie, indem man `due` in seinem `extra` setzt.
- Wer das Datum setzt, wird erinnert (`remind_user`). `core/reminders.py` prüft alle 10 Minuten; zur gewählten Uhrzeit (Standard 9:00 Uhr, Serverzeit laut `TZ`) am Fälligkeitstag – auch nachträglich, wenn der Server aus war – geht eine Sammel-Mail an diesen Benutzer. Erledigte Einträge werden übersprungen, pro Eintrag wird nur einmal erinnert; ändert man das Datum, wird neu erinnert.
- Voraussetzung: E-Mail-Versand eingerichtet (Einstellungen → E-Mail) und eine E-Mail-Adresse bei „Mein Konto“. Ohne Adresse wird die Erinnerung nachgeholt, sobald eine eingetragen ist.
- Im PDF steht bei offenen Einträgen „(bis 5.11.2026)“.

## Unterprojekte (A450.22)

Ein Kürzel mit Punkt ist ein Unterprojekt; sein Ordner liegt im Ordner des Hauptprojekts: `Projekte\A450 Hauptprojekt\A450.22 Anbau\A450.22 8. Fotos + Bautagebuch\A450.22 Fotos\…`. `A450.22.1` liegt eine Ebene tiefer. Die App sucht jede Ebene über das Kürzel (`remote.find_project_path`); fehlt die letzte Ebene, wird sie mit dem Projektnamen angelegt, fehlt das Hauptprojekt, mit dem Kürzel. Liegt der Unterordner direkt im Basisordner, wird er dort gefunden. Ein eigener Eintrag im Projektfeld „Projektordner auf dem Server“ darf Unterordner enthalten (`A450 Haupt/A450.22 Unter`) und hat Vorrang. Die Namensvorschläge zeigen nach Eingabe von „A450.“ die Unterprojekt-Ordner des Hauptprojekts.

## Einstellungen (Bereiche)
Die Einstellungen sind in Reiter gegliedert (`STABS` in index.html): **Benutzer** (für alle; Admins sehen alle Benutzer als kompakte, aufklappbare Liste mit Name, E-Mail, Admin-Recht, Kennwort setzen, löschen und „Benutzer anlegen“ inline; normale Benutzer sehen nur ihr eigenes Konto als „Mein Konto“) und nur für Admins **Firma & Logo**, **Ablage**, **Mailserver**. Die eigene Zeile („du“) enthält E-Mail und „Kennwort ändern“ ohne Abfrage des alten Kennworts (`/api/password` verlangt es nur noch beim erzwungenen ersten Wechsel).

## Rückgängig beim Löschen
`DELETE /api/items/<id>` liefert die gelöschte Zeile als `item` zurück; der Browser zeigt 8 Sekunden lang einen Hinweis mit „Rückgängig" (`toast(msg, undo)`). Der Knopf ruft `POST /api/items/restore` auf, das die Zeile unverändert (alte ID, Reihenfolge, Erledigungsdatum/Erinnerung) wieder einfügt. Gilt für Notizen, Anwesende, Mängel, Weisungen, Zu erledigen. Projekte, Berichte, Kontakte, Bilder und Benutzer behalten die Zwei-Tipp-Sicherung.

## PDF-Kompaktlayout
Im Bautagebuch-PDF ist jeder Block (Bemerkungen, Zu erledigen, weitere Abschnitte, Firmentabelle) nur so hoch wie sein Inhalt plus genau **eine** freie Zeile zum handschriftlichen Nachtragen. Leere Abschnitte schrumpfen dadurch auf Beschriftung + eine Zeile.

## Erneuter Export: alte Stände behalten
Beim Übertragen eines PDFs (`core/sync.py`, `_rotate_old`) wird geprüft, ob es am Ziel schon liegt. Wenn ja, werden das vorhandene PDF und der Fotoordner des Tages in `…_old1`, `…_old2` usw. umbenannt (jeweils die nächste freie Nummer), danach werden alle aktuellen Fotos des Berichts neu in den Tagesordner übertragen. Das geschieht im Hintergrund-Job, funktioniert also auch, wenn der Server beim Export gerade nicht erreichbar ist. Das PDF-Auftrags-`extra` enthält dafür die `report_id`; `Folder`/`Smb` haben `exists()` und `rename()`.

## Projekte in Unterordnern (Vorschläge)
Liegen die Projekte erst in einem Hauptordner („A450 Pürzer verschiedenes/A450.1. Kordts Feld, Bochum“), bietet `sync.suggest_projects` beim Tippen die Unterordner an: passt die Eingabe zu einem Hauptordner (Name beginnt damit oder Kürzel stimmt, höchstens 6), werden dessen Unterordner mit `<Kürzel>.` am Anfang geladen (60 s im Speicher) und natürlich sortiert (1, 7, 10). Ein Hauptordner mit Unterprojekten wird selbst nicht vorgeschlagen. Das Kürzel liest `remote.code_prefix` per Muster (`A450.7` aus „A450.7.in der Löchte“); `remote.has_code` verhindert, dass `A450.1` auf `A450.10` passt.

Zusätzlich baut `sync._indexed` im Hintergrund einen Index aller Unterprojekte aller Hauptordner auf (10 min im Speicher). Damit findet die Suche auch nach Straße/Ort („auf dem holte“); `/api/store/folders` verlangt, dass jedes eingegebene Wort irgendwo im Ordnernamen vorkommt. Bis der Index fertig ist (erste Eingabe nach dem Start), gibt es nur Treffer nach Kürzel.

## Favicon
`GET /api/favicon` (ohne Anmeldung, damit es auch auf der Login-Seite erscheint) liefert das Büro-Logo als quadratisches PNG (64 px; `?s=180` für das Home-Bildschirm-Symbol), erzeugt aus `data/branding/logo.*` und zwischengespeichert. Ohne Logo gibt es 404 und der Browser zeigt sein Standardsymbol.

## Fotos mit Beschreibung und Fotos an Einträgen
- `images.item_id` (Migration 0010, `ON DELETE SET NULL`) verknüpft ein Foto mit einem Eintrag. Abschnitte mit `extra.photos` (Mängel, Notizen) zeigen am Eintrag einen Kamera-Knopf und kleine Vorschaubilder (30 px, `/api/thumb/96/…`); das Foto liegt nur einmal in der Datenbank und auf dem Server und erscheint zusätzlich groß unter „Bilder“. Löscht man den Eintrag, bleibt das Foto im Bericht; „Rückgängig“ verknüpft es wieder (`image_ids`).
- Die Fotobeschreibung (`images.caption`, Feld unter jedem Foto) ist der Dateiname auf dem Server (`_image_name`: „Riss Nordwand.jpg“, bei Doppelten „ (2)“, ohne Beschreibung `Datum_Nummer.jpg`). Ändert man sie, wird die abgelegte Datei im Hintergrund umbenannt (`rename_image`, Auftrag `rename`; `images.sent_remote` merkt sich den letzten Ablageort).
- Im PDF stehen kleine Vorschaubilder hinter dem Eintragstext (`bt_pdf.entry`); die großen Bilder mit Beschreibung stehen in der Fotodokumentation.
- Verkleinerte Kopien werden in `data/thumbs` zwischengespeichert (`storage.thumb`).

Fotos an Einträgen bekommen beim Hochladen automatisch die Beschreibung „Mangel 1“, „Mangel 2“ …, „Notiz 1“ … (Nummer = Position des Eintrags unter seinesgleichen im Bericht, weitere Fotos desselben Eintrags „Mangel 2 (2)“); das Wort steht in `sections.extra.photo_label` (Migration 0011). Die Beschreibung ist weiter änderbar und bleibt der Dateiname auf dem Server. Das Beschreibungsfeld unter den Fotos ist randlos und zeigt den Rahmen nur bei Hover/Fokus; Enter schließt es.

## Farbe pro Benutzer
`users.accent` (Migration 0012, `#rrggbb`, leer = Standard Pink) steht unter „Benutzer → eigene Zeile → Farbe der Oberfläche“ (neun Farben plus eigene Farbe). `PUT /api/account` speichert sie, `applyAccent()` setzt `--y` und die Schriftfarbe darauf (`--on`, dunkel oder weiß je nach Helligkeit); die zuletzt benutzte Farbe liegt zusätzlich im localStorage, damit schon die Anmeldeseite passt.
PDF: Vorschaubilder an Einträgen stehen jetzt in einer eigenen Zeile unter dem Text (12 mm hoch).

## Erinnerungs-Wähler (iPhone-tauglich)
Statt `datetime-local` gibt es ein Panel unter dem Eintrag (`.duepanel`): Datum (`type=date`, am iPhone der Kalender), Uhrzeit als Auswahlliste in Viertelstunden (`<select>`, am iPhone ein Rad), Schnellwahl „Heute / Morgen / +1 Woche“, „Fertig“ und „Datum löschen“. Jede Änderung wird sofort gespeichert (`saveDue`); die Uhrzeitwahl schließt das Panel. Beim Anlegen eines Eintrags gilt dieselbe Uhrzeitliste. Fotos gibt es jetzt auch bei „Zu erledigen“ (Migration 0013, Beschreibung „Aufgabe 1“ …).

## iPhone: Tastatur und Zoom
- Auf Touch-Geräten haben alle Eingabefelder mindestens 16 px Schrift (`@media (pointer:coarse)`); kleinere Schrift lässt Safari beim Antippen hineinzoomen, und die Ansicht springt danach nicht zurück.
- Nach dem Schließen der Tastatur (`focusout`, `visualViewport.resize`) wird die Seite auf Position 0 zurückgesetzt (`resetView`); `#app` nutzt `100dvh`.
- Die Erinnerungszeile beim Hinzufügen (`.dl`) bricht um: Beschriftung oben, darunter Datum und Uhrzeit.
- Seite fixiert (`html, body {position: fixed; overflow: hidden}`): nur `#detail` scrollt. Dadurch kann sich beim Wischen am iPhone nicht mehr die ganze App wegschieben (leerer Bildschirm mit Tableiste oben). `fitApp()` setzt die Höhe von `#app` auf die sichtbare Höhe (`visualViewport`), solange die Tastatur offen ist, und gibt sie beim Schließen wieder frei.
- Gummiband am iPhone: Ein `touchmove`-Filter (index.html, vor `fitApp`) verwirft Wischer, die nicht in einem scrollbaren Bereich liegen oder am Anfang/Ende eines Bereichs weiter ziehen; `#detail` hat zusätzlich `overscroll-behavior: contain`. Sonst zieht Safari beim Weiterwischen die ganze App mit (Kopf verschwindet, leere Fläche unter der Tableiste).

## Kontaktvorschläge bei „Anwesende“
Statt der nativen `<datalist>` (die der Browser nur beim ersten Antippen anbietet) gibt es eine eigene Vorschlagsliste (`showSug`, `.sug`): Sie erscheint bei jedem Antippen und beim Tippen, filtert die Kontakte nach dem Eingegebenen (höchstens 8) und übernimmt mit einem Tipp den Namen; danach springt der Fokus in „Art der Tätigkeit“.

## Schnell hinzufügen und einklappbare Abschnitte (Handy-Bedienung)
- Runder „+“-Knopf (`#fab`, im `#app`, nur auf dem Berichts-Tab) öffnet ein Fenster von unten (`#qs`, Zustand `q`): Menü mit Foto aufnehmen (`capture`), Foto aus Mediathek und je einem Knopf pro Listen-Abschnitt (aus `meta.sections`, also automatisch auch für neue Abschnitte). Eintrag: großes Textfeld (bei Anwesende Name mit Kontaktvorschlägen, Tätigkeit, Anzahl), bei Abschnitten mit `extra.due` Datum, Uhrzeit und Schnellwahl. „Hinzufügen“ nutzt dieselbe `addItem()` wie die Zeile im Abschnitt. Nach dem Foto fragt „Foto zuordnen“, ob es zu einem Mangel/einer Notiz/Aufgabe gehört (dann `item_id`). Das Fenster liegt im `#app`, dessen Höhe `fitApp()` an die Tastatur anpasst, daher sitzt „Hinzufügen“ über der Tastatur.
- Abschnitte mit Einträgen/Bildern lassen sich über die Überschrift ein- und ausklappen (`secHead`, `secOpen`, im localStorage gemerkt); leere Abschnitte sind standardmäßig eingeklappt, die Zahl zeigt die Einträge.

## PDF-Design
Farben und Radius stehen oben in `core/bt_pdf.py` (`INK`, `LINE`, `SOFT`, `ZEBRA`, `RAD`): schmale dunkle Linie unter dem Kopf, hellgraue Beschriftungsfelder, leicht gerundete Rahmen (`cornerRadii`), Bauvorhaben groß in eigenem Feld, feine Streifen statt Linien in der Firmentabelle, abgerundete Checkboxen, Fußzeile mit Trennlinie, Fotodokumentation mit Titelzeile und Linie. Aufbau und Inhalt der Vorlage sind unverändert.

## Wetter nach Projektadresse, PDF-Lochrand
- `fillGeo()` holt das Wetter für die Koordinaten des **Projekts** (`projects.lat/lon`; fehlen sie, werden sie aus Straße/PLZ/Ort gesucht), nicht mehr für den GPS-Standort des Geräts. PLZ und Ort im Bericht kommen aus der Projektadresse. Ohne Adresse gibt es einen Hinweis. Das GPS bleibt nur für „Projekt nach Standort wählen“.
- PDF: linker Rand 25 mm (Lochrand nach DIN 5008, `LM` in `core/bt_pdf.py`), rechts 12 mm.

Fotos lassen sich schon beim Anlegen eines Eintrags (Schnell-Fenster und Eingabezeile im Abschnitt) wählen (`addFiles`, Vorschau `#apv`, entfernbar); `addItem()` legt den Eintrag an und lädt die Fotos danach mit dessen `item_id` hoch (Beschreibung „Mangel 1“ usw. wie gehabt).

## iPhone: Tastatur & Schnell-Hinzufügen (Nachtrag)
- `addItem` liest das Eingabefeld bevorzugt aus dem Schnell-Fenster (`#qs`), sonst aus der Seite – vorher wurde teils das falsche (leere) Feld gelesen, sodass neue Firmen über das große „+“ nicht ankamen.
- `fitApp` setzt `body.kb`, solange die Tastatur offen ist: Tab-Leiste und „+“ werden ausgeblendet, Vorschlagsliste max. 6,5 rem, fokussiertes Feld wird zentriert.
- Firmenfelder: `autocomplete="nope"`, `name="bt-add"`, `autocorrect/spellcheck` aus → kein Safari-Kontakt-Autofill.

## Mehrzeilige Tätigkeit
„Art der Tätigkeit“ (Anwesende) ist ein automatisch wachsendes `textarea.ed` (Liste und Hinzufügen-Zeile); Enter = neue Zeile. Das PDF setzt `\n` bereits als `<br/>`, die Zeile wächst mit.

## Freie Uhrzeit
`timeSelect` hat als letzte Option „Andere Zeit …“; sie ersetzt die Liste durch `<input type="time">` (minutengenau, am iPhone Rad). Gleiche `data-dp`/`data-add-time`-Attribute, daher keine Änderung an Speicherlogik. Bereits gespeicherte Zeiten außerhalb der Viertelstunden erscheinen weiterhin in der Liste.

## Sicherheit (Prüfung 1.11.)
- `SECRET_KEY`: fehlt er oder ist es der Beispielwert, wird ein Zufallsschlüssel in `data/.secret_key` (0600) erzeugt – vorher hätte der Beispielwert gefälschte Sitzungen (Admin) erlaubt.
- Header: `nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy`, `Cache-Control: no-store` für `/api/`.
- Bekannt/akzeptiert: Mail-/Ablage-Kennwörter liegen im Klartext in der Datenbank (werden nie an den Browser gesendet); alle angemeldeten Benutzer sehen alle Projekte (keine Projektrechte); Login-Sperre je IP+Name (hinter Proxy `TRUST_PROXY=1` setzen, sonst teilen sich alle eine IP); keine 2FA.

## Projekt archivieren
Migration 0014: `projects.archived` (0/1). Reiter „Projekt“ → „Projekt archivieren“ / „Aus dem Archiv holen“ (mit „Rückgängig“-Hinweis). Archivierte Projekte fehlen in der Projektauswahl und bei der GPS-Wahl, bleiben aber komplett erhalten (Berichte, PDFs, Ablage). Wiederfinden: Projektauswahl → „Archiv (n)“ am Listenende, oder einfach im Suchfeld suchen (Treffer im Archiv erscheinen automatisch, grau mit „archiviert“).

## Wetter zum Berichtsdatum
- `/api/geo?lat&lon&date=YYYY-MM-DD&time=HH:MM[&noaddr=1]`: heute → aktuelle Werte; sonst Open-Meteo `hourly` für Datum und Stunde des Berichts – Forecast-API für −90…+15 Tage, davor das Archiv (ERA5, ~5 Tage verzögert). Weiter als 15 Tage in der Zukunft → Fehler.
- Frontend: `autoWx()` (nach `openProject`) füllt Berichte ohne Wetterwerte einmal je Sitzung automatisch (nachträglich), nie während getippt wird. Automatik füllt nur leere Felder; der Knopf „Wetter laden“ überschreibt. Ändert man Datum/Uhrzeit eines automatisch befüllten Berichts, wird das Wetter nachgezogen (`extra.wx_auto`); wer Wetterfelder von Hand ändert, setzt `wx_auto=0` – dann bleibt alles unangetastet.
- Wetter gilt immer für die Projektadresse (Koordinaten des Projekts).

## Versionsverlauf der Berichte
- Migration 0015: `report_versions(report_id, created, user_name, reason auto|export|before_restore, pdf_name, hash, data JSON)`; `core/versions.py`, `modules/versions.py`.
- Momentaufnahme = Bericht + Einträge + Foto-Verweise (ohne Zeitstempel). Entstehen: automatisch nach einer Minute Ruhe nach einer Änderung (nur bei echter Änderung, Hash-Vergleich; max. 80 automatische je Bericht), bei jedem PDF-Export (`reason=export`, mit PDF-Dateiname; Exporte werden nie gelöscht) und vor einer Wiederherstellung.
- Änderungs-Erkennung: `guard()` ermittelt je schreibender Anfrage den betroffenen Bericht (`versions.report_of`), `after_request` markiert ihn, ein Hintergrund-Thread legt die Version an.
- Status (`/api/reports/<id>/versions`): `never` | `exported` (Stand = letzter Export) | `changed`. Anzeige unter dem Berichtskopf, „Verlauf“ klappt die Liste auf (Ansehen / Wiederherstellen, zweistufig). Wiederherstellen setzt Kopfdaten und Einträge zurück, Fotos bleiben (Zuordnung zu Einträgen wird soweit möglich wiederhergestellt).
- Das PDF selbst wird nicht in der Datenbank gespeichert, nur sein Name (die Datei liegt in der Ablage).

## Auditprotokoll + Aufräumen auf dem Projektserver (nur Administrator)
- Migration 0016 `audit_log(ts, user_name, cat inhalt|export|konto, action, detail, project_id, project, report)`; `core/audit.py`. `guard()` ermittelt vor jeder ändernden Anfrage den Bezug (`audit.pre`, damit auch gelöschte Zeilen benannt werden können), `after_request` schreibt den Eintrag (`audit.describe`). Zusätzlich explizit: Anmeldung/Abmeldung/Fehlversuch, PDF-Export, Server-Übertragungen und Umbenennungen (`System`), Löschungen auf dem Server. Kennwörter/Zugangsdaten werden nie protokolliert (Einstellungen/Benutzer: nur Feldnamen). Es bleiben die letzten 100 000 Einträge.
- API `/api/audit` (Filter cat, q, user, project_id, before; 100 je Seite) – `/api/audit*` ist `admin_only`.
- `core/cleanup.py`: sucht im Projektordner (Pfade aus den Ablage-Vorlagen je Berichtsdatum, `{projekt}` wie beim Übertragen aufgelöst) Kopien „…_oldN.pdf“ und Fotoordner „…_oldN“ (`Folder`/`Smb`: `listdir`, `tree`, `delete`). Löschen (`POST /api/audit/cleanup`) wiederholt die Suche und löscht nur Pfade, die darin wieder gefunden werden – nie frei übergebene Pfade. Jede Löschung wird protokolliert.
- UI: dritter Reiter „Protokoll“ (nur Admin) neben Bericht/Kontakte: oben „Alte Versionen auf dem Projektserver“ (Suchen, markieren, zweistufig löschen), darunter das Protokoll mit Filter und Suche.
- Protokoll-Filter: Knöpfe (Kategorie), Benutzer-Auswahl und Suchfeld (live, 300 ms) wirken gemeinsam; eine Zeile zeigt den aktiven Filter mit „zurücksetzen“.

## Datenbankversionen (Datensicherung)
- `core/backups.py`: `pg_dump -Fc` → `data/backups/bau-JJJJMMTT-HHMMSS-<art>.dump`. Arten: `auto` (Hintergrund-Thread, täglich, mit Dateisperre `.backup.lock` für mehrere Gunicorn-Prozesse; letzte 30), `manuell` (30), `vor-…` (vor Migration / Wiederherstellung; 10).
- `modules/backups.py` (admin_only): Liste, „Jetzt sichern“, Download, Löschen, Wiederherstellen (prüft per `pg_restore --list`, sichert vorher, spielt per `pg_restore --clean --single-transaction` ein, ruft `db.migrate()`). Dateinamen werden gegen ein festes Muster geprüft (kein Pfad-Trick). Fotodateien (`data/uploads`) gehören nicht zur DB-Sicherung.
- UI: Einstellungen → Reiter „Datensicherung“. Aktionen stehen im Auditprotokoll.

## Volltextsuche (Stichwortsuche)
- `core/search.py` + `GET /api/search?q=&project_id=`: durchsucht Projekte, Berichte (Datum, Bauleitung, Wetter, Ort), Einträge (Text, Tätigkeit), Fotobeschreibungen, Kontakte. Alle Wörter müssen vorkommen; Groß-/Kleinschreibung und Akzente egal, zusätzlich locker ae/oe/ue/ss = ä/ö/ü/ß. Treffer mit markiertem Ausschnitt; Klick springt in Projekt + Bericht bzw. Kontakt. Reiter „Suche“ für alle Benutzer, wahlweise nur im aktuellen Projekt. (Python-seitig, bei den Datenmengen eines Bautagebuchs ausreichend; bei sehr großen Beständen ließe sich SQLite FTS5 ergänzen.)
- Aufräumen mit Bereichsauswahl: `GET /api/audit/cleanup?scope=one|active|archived|all&project_id=` durchsucht mehrere Projekte über eine Verbindung (`cleanup.scan_many`); Ergebnis nach Projekt gruppiert. `POST` erwartet `entries:[{project_id, path}]`; je Projekt wird frisch gesucht, gelöscht wird nur, was dort wiedergefunden wird.
- Schnell-Menü („+“ am Handy) hat zusätzlich „Neuer Bericht“ (legt wie das + im Berichtskopf einen Tagesbericht an, Wetter wird automatisch geholt).

- Migration 0017: Fotos auch an Weisungen (`sections.extra.photos`, Beschriftung „Weisung 1“ …); PDF zeigt sie wie bei Mängeln/Notizen (Anweisung + Vorschaubild).
- Kalender-Symbol im Berichtskopf = Datum des Berichts ändern: jetzt ein durchsichtiges `<input type="date">` direkt über dem Symbol (`.calb`) statt eines versteckten Feldes mit `showPicker()` (das am iPhone nicht zuverlässig öffnete). Der Tipp landet direkt im Datumsfeld und öffnet das native Datumsrad.

## Firma bei Weisungen
Migration 0018: `items.company` + `sections.extra.company=true` für Weisungen (generisch für weitere Abschnitte). Eingabe frei oder per Vorschlagsliste aus den Kontakten (legt keinen Kontakt an), in Hinzufügen-Fenster, Eingabezeile und nachträglich in der Zeile. PDF: „Anweisung an <Firma>: …“; Volltextsuche findet die Firma.
- iPhone-Tastatur und Schnell-Fenster: Sobald in `#qs` ein Feld Fokus hat (`qTyping`), rückt das Fenster nach OBEN unter die Kopfzeile (`#qs.typing`), statt unten zu kleben. Safari verschob sonst die Seite/verdeckte das Fenster mit der Tastatur (Bildschirmaufnahme 2.11.). `fitApp` passt die App-Höhe in diesem Zustand nicht an.

## Beschreibender Fotoordner auf dem Server
`sync.day_label`: Name des Tagesordners = Datum + Gewerke der anwesenden Firmen (`contacts.trade`; fehlt es, das erste Wort der Tätigkeit; doppelte entfallen) + „ - “ + die ersten drei Fotobeschreibungen (leere ausgenommen). Beispiel `2026-11-02 Elektro, Mauerwerk - Riss Fassade, Fenster`. Max. 120 Zeichen, Windows-Zeichen bereinigt. Wirkt auf den letzten `{datum}`-Teil der Foto-Vorlage (`render(..., label=)`).
Ändert sich der Name (Firma/Gewerk/Foto-Beschreibung), verschiebt `refresh_day` (von `after_request` bei jeder Änderung am Bericht aufgerufen) die schon abgelegten Fotos per `rename`-Auftrag in den neuen Ordner; noch nicht übertragene Aufträge werden neu berechnet; der leere alte Ordner wird entfernt (`rmdir_if_empty`). Abschaltbar: Einstellungen → Ablage → „Name des Fototag-Ordners“ (`store_folder_desc=0`). Gewerk-Änderungen im Kontakt wirken erst bei der nächsten Änderung des jeweiligen Berichts.

## Fotoformat und PDF-Größe
- `storage.save()` wandelt **jedes** Bild (HEIC, PNG, WEBP, GIF) in JPG um – volle Auflösung, EXIF-Drehung eingerechnet, Transparenz auf Weiß, Qualität 90. Normale JPG ohne Drehung werden unverändert übernommen (keine Neukompression). Upload-Ordner und Projektserver enthalten daher nur `.jpg` in Originalauflösung.
- `storage.convert_legacy()` wandelt beim Start alte Nicht-JPG-Dateien um; auf dem Server schon abgelegte werden über `sync.rename_image` auf die neue Endung umbenannt.
- Nur die Kopie **im PDF** wird verkleinert: `bt_pdf.prepare()` – max. 1100 px, JPEG Qualität 72, optimiert/progressiv. Originale bleiben unberührt.

## Handy: Einträge mit Datum und Foto
Zeilen mit Erinnerungsdatum (`.due`) dürfen auf schmalen Bildschirmen (≤ 640 px) umbrechen: Das Datum rutscht unter den Text, das Textfeld behält mindestens 9 rem Breite (vorher wurde es zu einem schmalen Streifen).

## Zugang per E-Mail senden / Desktop-Verknüpfung
- `POST /api/users/<id>/access` (nur Admin): Das bestehende Kennwort ist nur als Hash gespeichert und kann nicht erneut gesendet werden. Stattdessen erzeugt die App ein neues 12-stelliges Startkennwort (ohne verwechselbare Zeichen), setzt `must_change` und schickt es im Klartext an die hinterlegte Adresse (Adresse der App aus `app_url`). Das Kennwort steht nie im Audit-Protokoll („Zugangsdaten per E-Mail gesendet“). Im Benutzer-Dialog mit Zwei-Schritt-Bestätigung.
- `GET /manifest.webmanifest` (öffentlich): Web-App-Manifest mit Büro-Logo (`/api/favicon?s=192|512`). Chrome/Edge bieten damit „App installieren“ an; die so erzeugte Desktop-/Startmenü-Verknüpfung trägt das Logo. Eine per Drag & Drop erzeugte `.url`-Datei bekommt ihr Symbol dagegen von Windows/Browser – darauf hat die Seite keinen Einfluss.

## Bauherrschaft aus Kontakten vorschlagen
Beim Anlegen und Bearbeiten eines Projekts hängt am Feld „Bauherrschaft“ eine Vorschlagsliste (`<datalist id="dl-client">`): alle Kontakte, deren Gewerk „bauherr“ enthält (also Bauherr, Bauherrin, Bauherrschaft). Die Auswahl trägt „Name, Straße, PLZ Ort“ ein. Rein im Browser aus der geladenen Kontaktliste; kein neuer Endpunkt.

## Uhrzeit im Berichtskopf
Die Uhrzeit des Berichts (Berichtskopf → Stift) ist wie bei den Erinnerungen eine Auswahlliste in 15-Minuten-Schritten (05:00–21:45, „–“ = leer) mit „Andere Zeit …“ für minutengenaue Eingabe (`timeSelect(val, attrs, blank)`).

### Ablauf: App mit Büro-Logo installieren
1. Neue Version einspielen (`docker compose up -d --build`), Büro-Logo unter Einstellungen → Firma hochladen (Quelle des Manifest-Symbols).
2. Alte, per Drag & Drop erzeugte Verknüpfung löschen (behält das Edge-Symbol).
3. Seite über https öffnen: Edge → Menü → Apps → „Diese Website als App installieren“ (Chrome: Speichern und teilen → Als App installieren), „Auf dem Desktop erstellen“ anhaken. iPhone: Teilen → „Zum Home-Bildschirm“.
Im Handbuch steht dieser Ablauf als Abschnitt 12.

## Handbücher
Zwei Ausgaben der Kurzanleitung (PDF, Skript lag außerhalb der App): `Bautagebuch_Kurzanleitung.pdf` (6 Seiten, ohne Admin-Funktionen, für alle Kolleg*innen) und `Bautagebuch_Kurzanleitung_Admin.pdf` (9 Seiten: dieselben 6 Seiten plus „Teil 2 – Verwaltung“ zu Benutzer, Firma & Logo, Ablage, Mailserver, Datensicherung, Protokoll/Aufräumen und Update).

## Berichtskopf: drei Symbole
Rechts im Berichtskopf stehen untereinander Neuer Bericht (+), Bearbeiten (Stift: Nummer, Datum, Uhrzeit in 15-Minuten-Schritten, Bauleitung) und Löschen (`.side.q3`). Der frühere Kalender-Knopf entfiel, weil er dasselbe wie der Stift tat.

## Zuständige Bauleiter (Sichtbarkeit je Projekt)
- Migration 0019: `projects.leaders` = JSON-Liste von Benutzer-IDs. Leer = alle Benutzer sehen das Projekt; Administratoren sehen immer alle.
- `core/access.py`: `visible_ids`, `can_see`, `project_of(path)` (löst `/api/projects|reports|items|images|versions/<id>` zum Projekt auf). Prüfung auf dem Server: Der `before_request`-Guard in `app.py` liefert 403 für Nicht-Admins ohne Eintrag; `GET /api/projects` und `/api/search` filtern.
- Wer ein Projekt sehen darf, darf `leaders` ändern (`PUT /api/projects/<id>`, Eingabe wird auf vorhandene Benutzer bereinigt). `GET /api/leaders` liefert die Auswahlliste (ohne das Konto „admin“). Neue Projekte von Nicht-Admins tragen den Ersteller vor; bei Admins ist die Liste leer (= alle).
- Oberfläche: Chips „Zuständige Bauleiter“ im Formular „Neues Projekt“ und „Projekt bearbeiten“.

## PDF-Ansicht in der installierten App
Auf dem iPhone-Startbildschirm (Standalone) hat die Seite keine Zurück-Taste. Dort lädt „PDF“ den Bericht per `fetch` und zeigt ihn im Overlay `#pv` (pdf.js, lokal unter `static/vendor/pdfjs/`, nur bei Bedarf geladen) mit „Schließen“, Zoom und „Teilen“; die Wischgeste „zurück“ schließt ebenfalls (History-Eintrag). Im normalen Browser öffnet sich das PDF weiter im neuen Tab.

## Alte Versionen auf dem Server automatisch löschen
Einstellungen → Ablage: „Alte Fototag-Ordner behalten“ (`store_keep_old_photos`) und „Alte Bautagebuch-PDFs behalten“ (`store_keep_old_pdf`). Beim erneuten Export (`sync._rotate_old`) bleiben je Bericht nur die neuesten N Stück von `…_old1`, `…_old2` …; ältere werden gelöscht und protokolliert (Benutzer „System“). 0 = nichts automatisch löschen.


## PostgreSQL (statt SQLite)
- Auf Wunsch statt Redis: relationale Daten gehören in eine relationale Datenbank. Eigener Container `bauportal_db` (früher `Bautagebuch_db`) (`postgres:15`, Healthcheck `pg_isready`, kein veröffentlichter Port), Daten im benannten Volume `bautagebuch_pgdata`. Die App wartet per `depends_on: service_healthy` und verbindet über `DATABASE_URL`. Kennwort in `docker-compose.yml` ändern (an zwei Stellen identisch).
- `core/db.py` behält die sqlite-ähnliche Schnittstelle (`con.execute(sql, ?-Parameter)`, Zeilen mit Namens- und Indexzugriff, `lastrowid`, `con.savepoint()` für Eindeutigkeitsfehler) und übersetzt `?` → `%s`, `datetime('now')`, `json_extract`. Einfacher Verbindungspool; Migrationen unter Advisory-Lock (mehrere Gunicorn-Worker). Namen sind `citext` (Benutzer, Kontakte: Groß-/Kleinschreibung egal).
- Schema: `pg_migrations/0001_baseline.sql` (vollständig, IDENTITY-Spalten). Die alten SQLite-Migrationen entfielen, weil die App noch nicht produktiv war – **es gibt keinen Import alter `bau.db`-Dateien**. Ab jetzt gelten die goldenen Regeln wie oben (nur additive Migrationen; vor jeder Migration `pg_dump`).
- Sicherung/Wiederherstellung siehe „Datenbankversionen“. Das Image enthält `postgresql-client` für `pg_dump`/`pg_restore`; die Hauptversion soll zum Datenbank-Container passen (15).
- Für Entwicklung: `docker compose up -d --build`. Daten komplett zurücksetzen: `docker compose down` und beide Volumes löschen.
- Der Ordner heißt bewusst `pg_migrations/` (nicht `migrations/`): Wird ein neues ZIP über eine alte Installation entpackt, bleiben alte SQLite-Dateien in `migrations/` liegen und würden sonst gelesen. Den alten Ordner `migrations/` kann man löschen.
- Maske „Neues Projekt“/„Projekt“: Die Regel `.cform label.w,.cform .info,.cform .acts,.cform .w{grid-column:1/-1}` darf nicht verändert werden (Hinweistexte und Knöpfe laufen über die volle Breite, PLZ/Ort stehen am Desktop nebeneinander). Eigene Stile für neue Blöcke immer als separate Regel anlegen.

### Benutzer anlegen = Startkennwort per E-Mail
`POST /api/users` verlangt Name und E-Mail (Pflicht) und einen eingerichteten Mailserver. Der Server erzeugt das 12-stellige Startkennwort (`_gen_pw`, gleiche Funktion wie bei „Zugang per E-Mail senden“), setzt `must_change` und verschickt die Zugangsdaten (`_access_mail`). Schlägt der Versand fehl, wird der Benutzer wieder gelöscht (sonst gäbe es ein Konto, dessen Kennwort niemand kennt). Das Startkennwort gibt es nicht mehr als Eingabefeld.

### Projektauswahl: „Eigene Projekte“ / „Fremde Projekte“ (nur Administratoren)
Für Administratoren trennt `renderSheet()` die Projekte: **eigen** = kein Bauleiter eingetragen oder man selbst eingetragen; **fremd** = Bauleiter eingetragen, man selbst nicht dabei. Eigene stehen oben unter „Eigene Projekte“, fremde hinter dem Knopf „Fremde Projekte (n) – anzeigen“ (wie „Archiv“, klappt bei Suchtreffern automatisch auf; mit Namen der Bauleiter, archivierte Fremde dort mit Vermerk). Gibt es keine fremden Projekte, bleibt die Liste wie bisher. Normale Benutzer sehen fremde Projekte ohnehin nie (Server-Filter).

### Von Hand umbenannte Dateien auf dem Server (Namensschema)
- `core/scheme.py`: Beim Öffnen eines Projekts ruft die Oberfläche `GET /api/store/rename-check?project_id=` auf (einmal je Projekt und Sitzung; Fehler/Server nicht erreichbar → keine Rückfrage). Der Server listet den PDF-Ordner und den Eltern-Ordner der Tagesordner und lernt aus den **nicht** von der App benannten Einträgen ein Schema: aus „A489 40_26.10.2026 Bautagebuch.pdf“ wird `{kuerzel} {nr}_{datum:TT.MM.JJJJ} Bautagebuch`, aus „A489 2026.10.27 loser Putz“ wird `{kuerzel} {datum:JJJJ.MM.TT}{rest}` (Datumsformate: TT.MM.JJJJ, JJJJ.MM.TT, JJJJ-MM-TT, TT-MM-JJJJ, JJJJMMTT, TT.MM.JJ; mindestens 2 gleiche Namen nötig; `_oldN` wird ignoriert).
- Gibt es noch Einträge mit dem App-Namen (`A489_BT_JJJJ-MM-TT.pdf`, `JJJJ-MM-TT Beschreibung`) und ein Schema, erscheint im Bericht eine Rückfrage (`.rnb`): „Ja, umbenennen“ → `POST /api/store/rename-apply` benennt auf dem Server um (Berichtsnummer aus dem Datum des Berichts, vorhandene Zielnamen werden nie überschrieben), zieht `images.sent_remote` nach und speichert das Schema (Einstellung `scheme_<Projekt-ID>`, state `on`). „Nein, nicht mehr fragen“ → state `off`. „Später“ blendet nur aus.
- Bei state `on` benennen `modules/pdf.py` (PDF-Dateiname) und `sync.day_label` (Tagesordner) künftig im Schema des Projekts. Beide Routen stehen auch normalen Benutzern offen (Zugriff aufs Projekt wird geprüft); übrige `/api/store/*` bleiben admin_only.
- Nicht abgedeckt: Wurde ein Ordner mit schon übertragenen Fotos von Hand umbenannt, verweist `images.sent_remote` weiter auf den alten Namen; die App legt dann bei einem erneuten Export einen neuen Tagesordner an.

### Kontakt-Vorschläge aus dem Netz
- `GET /api/contacts/suggest?q=&lat=&lon=` → `geo.companies()`: Nominatim-Suche (OpenStreetMap) mit `extratags` und `namedetails`; liefert Name, Gewerk (aus `craft`/`type`, Tabelle `_TRADES`), Straße, PLZ, Ort, Telefon, E-Mail, Website. Straßen, Grenzen u. Ä. werden ausgefiltert, Doppelte entfernt, bis zu 6 Treffer. Mit Bezugspunkt (`lat`/`lon`: Projektstandort, sonst Gerätestandort) wird der Umkreis von ≈ 50 km bevorzugt und die Trefferliste nach Entfernung sortiert (Feld `km`, nächste zuerst).
- Schnell: Eingabe mit 350 ms Verzögerung, Zwischenspeicher im Server (1 Stunde, gleiche Suche kostet nichts), höchstens eine Anfrage pro Sekunde an Nominatim (Nutzungsrichtlinie), Zeitlimit 8 s. Fehler/kein Netz → leere Liste, die Eingabe wird nie blockiert.
- Oberfläche: „Neuer Kontakt“ zeigt beim Tippen Vorschläge; ein Tipp legt den Kontakt mit allen Daten an (Website landet in „Notizen“, es gibt kein eigenes Feld). Im Bearbeiten-Modus „Aus dem Netz ergänzen“ füllt nur **leere** Felder. Es wird nur der Firmenname (und der Projektstandort grob) an OpenStreetMap übertragen.
- Grenze: OSM kennt viele Handwerksbetriebe nicht oder ohne Telefonnummer. Bessere Daten gäbe es nur über einen kostenpflichtigen Dienst (z. B. Google Places) mit eigenem API-Schlüssel.
- Gewerk-Vorschläge aus dem Verlauf: `tradeOpts()` sammelt die bereits bei Kontakten vergebenen Gewerke (ohne Beachtung der Groß-/Kleinschreibung, häufigste zuerst) als `<datalist id="dl-trade">` am Feld „Gewerk“ im Kontakt-Formular. Übernimmt man einen Netz-Vorschlag, wird dessen Gewerk in die vorhandene Schreibweise umgesetzt („elektro“ → „Elektro“).

### Adressen ergänzen und Adressdatenbank (Kontakte)
- `GET /api/address/complete?street=&zip=&city=` (`modules/address.py`): ergänzt **nur**, wenn genau PLZ oder Ort fehlt. Reihenfolge: (1) Verlauf – häufigste Stadt zur PLZ aus Kontakten, Projekten und Firmendaten (sofort, offline); (2) Netz – `geo.complete_address()`: PLZ allein → Ort (Nominatim strukturiert), Straße + Ort → PLZ, Straße + PLZ → Ort (Treffer wird auf Plausibilität geprüft, Zwischenspeicher, 1 Anfrage/s). Nur Ort ohne Straße ergibt bewusst keine PLZ (geraten). Ohne Netz: keine Ergänzung, keine Fehlermeldung.
- Oberfläche: `addrComplete()` hängt an jedem `change` der Felder Straße/PLZ/Ort (Kontakt bearbeiten, Projekt neu/bearbeiten, Firmendaten), füllt nur leere Felder, löst die normalen Speicher-Handler aus und blendet einen Hinweis „Ergänzt: … (bitte prüfen)“ ein. `addrLists()` liefert Datalists `dl-zip`/`dl-city` aus dem Verlauf.
- Migration 0002: `contacts.website`, `contacts.role` (Funktion des Ansprechpartners). Netz-Vorschläge übernehmen die Website ins neue Feld.
- Export: `GET /api/contacts/export.xlsx` (openpyxl: Kopfzeile, Filter, fixierte Spalte/Zeile, Querformat, PLZ als Text) und `GET /api/contacts/export.pdf` (reportlab, A4 quer, Wiederholungskopf, Zebra). Beide nutzen `?q=` und `?trade=` wie die Liste (Auswahlfeld „Alle Gewerke“ über der Liste, Knöpfe „Excel“ und „Drucken“). Export wird im Auditprotokoll vermerkt. In der installierten iPhone-App öffnet „Drucken“ die PDF-Ansicht mit „Teilen“.

### Adressvorschläge beim Tippen (wie bei Paketdiensten) – Photon statt Nominatim
- **Änderung:** Live-Vorschläge beim Tippen laufen über **Photon** (`photon.komoot.io`, OSM-Daten, dafür gedacht). Nominatim verbietet Autovervollständigung in seiner Nutzungsrichtlinie und wird deshalb nur noch (a) für das Ergänzen von PLZ/Ort nach dem Verlassen eines Felds (`complete_address`) und (b) einmal je angetipptem Firmenvorschlag für Telefon/E-Mail/Internet (`company_detail`, `GET /api/contacts/suggest/detail`) benutzt. Wer das eigenständig betreiben will: `PHOTON` in `core/geo.py` auf eine eigene Photon-Instanz zeigen lassen.
- `GET /api/address/suggest?q=&lat=&lon=` → `geo.addresses()`: Straße (+ PLZ/Ort, soweit schon eingetragen) → „Straße Hausnummer, PLZ Ort“, nächste zuerst (Projektstandort, sonst Gerätestandort). Oberfläche: `adrSuggest()` unter jedem Feld „Straße“ (Kontakt, Projekt, Firmendaten); Tipp setzt Straße, PLZ und Ort.
- `GET /api/contacts/suggest` (Firmennamen) nutzt ebenfalls Photon; die Treffer enthalten `osm_type`/`osm_id`, Telefon/E-Mail/Internet kommen beim Antippen nach.
- Zwischenspeicher 1 Stunde, mindestens 0,3 s Abstand zwischen Photon-Anfragen, Fehler/kein Netz → keine Vorschläge.

### Karte mit Routenlink (Kontakte, Projekt)
`mapBlock()` in `index.html` bettet eine kleine Google-Karte ein (`https://www.google.com/maps?q=…&output=embed`, kein API-Schlüssel nötig, `loading="lazy"`) und zeigt darunter „Route dorthin planen“ (`maps/dir/?api=1&destination=…`; am iPhone öffnet das die Karten-App/Google Maps, Startpunkt = aktueller Standort). Zu sehen in der Kontaktansicht (wenn eine Adresse eingetragen ist) und im Reiter „Projekt“ (Koordinaten, sonst Adresse). Datenschutz: Beim Anzeigen wird die Adresse an Google übertragen. Die Einbettung ohne Schlüssel ist ein Komfortweg von Google; für dauerhaft garantierten Betrieb wäre die Maps Embed API mit eigenem Schlüssel nötig.

### Baustellenadresse in der Adressdatenbank
- Im Reiter „Projekt“ fragt die App (Kasten `.rnb`, kein Popup), sobald das Projekt eine Adresse hat: „Baustellenadresse auch in den Kontakten speichern?“ mit Namensfeld (vorbelegt mit dem Projektnamen). `POST /api/projects/<id>/contact` {accept, name} legt den Kontakt mit Gewerk „Baustelle“ und der Adresse an (Name schon vergeben → 409, anderen Namen wählen) und merkt `projects.extra.contact_id`; „Nein“ setzt `extra.contact_declined` (nie wieder fragen).
- Danach führt `PUT /api/projects/<id>` Adressänderungen (Straße/PLZ/Ort) im verknüpften Kontakt mit. Wird der Kontakt gelöscht, erscheint die Frage wieder. Die Projektkarte (`mapBlock(…, true)`) ist kleiner als die Kontaktkarte, am Handy 90 px hoch.

### Dekorative Karte in der PDF-Kopfzeile
`core/staticmap.py`: Aus dem Projektstandort (`lat`/`lon`) werden 3 × 2 OSM-Kacheln (Zoom 16) geladen, zu einem 3:1-Streifen zugeschnitten, per `flatten()` stark entsättigt und zum Papierton hin aufgehellt („ganz abgeflachte Farben“) und mit einer kleinen, gedämpft rosa Markierung versehen. Das fertige JPEG wird je Standort in `data/maptiles/` zwischengespeichert (die Kacheln werden also nur einmal geladen, mit User-Agent gemäß OSM-Kachelrichtlinie). `bt_pdf.info_tables()` setzt es rechts in das Feld „Bauvorhaben“ (52 mm breit, mit „© OpenStreetMap-Mitwirkende“); unter dem Projektnamen steht jetzt auch die Adresse. Ohne Standort oder ohne Netz (nächster Versuch nach 10 Minuten) erscheint die PDF ohne Karte, ohne Fehler.
- Dieselbe Karte erscheint im Web neben der Überschrift „Tagesbericht“ (`headMap()`, Bild von `GET /api/projects/<id>/map.jpg`, 1 Tag privat zwischengespeichert; Web 280 × 94 px, am Handy quadratisch 96 × 96 px (Ausschnitt um den Standort), rechts neben den Angaben (Raster `.hgrid`; Überschrift darüber in voller Breite)). Antippen öffnet die Routenplanung. Ohne Standort/Karte (404) verschwindet das Bild.

### PDF-Kopf: zwei getrennte Felder (bt_pdf.py)
`info_tables()` setzt Bauvorhaben-Feld (links, gerundet) und Kartenfeld (rechts) als zwei eigene Felder mit 4 mm Abstand nebeneinander.
`map_field(jpg, w, h)` schneidet die Karte auf das Seitenverhältnis des Feldes zu, sodass sie das Feld vollständig füllt, und zeichnet Eckenradius (`RAD`) und Rahmenlinie wie bei den Tabellenfeldern.
Die OSM-Quellenangabe steht klein in einer eigenen Zeile unter dem Kartenfeld. Ohne Karte bleibt ein einzelnes Vollbreiten-Feld.

Hinweis Kopfbereich: `.hgrid` nutzt `minmax(0,1fr)` und `min-width:0` für die Kinder, sonst drückt das Bearbeitungsraster (`.wgrid`) die Spalte auf Handybreite über den Rand und die Seitenbuttons werden überdeckt.

Hinweis Anwesende-Auswahl: `showSug()` blendet Kontakte mit Gewerk „Baustelle“ (Baustellenadressen aus den Projekten) aus; sie bleiben in der Adressdatenbank.

Hinweis Karte: Zoom 17, Farben nur leicht entsättigt/aufgehellt (`flatten`: 30 % Grau, Aufhellung 30 %·0,62). Der Cache-Dateiname enthält Zoom und Farbvariante (`_z17c2`); bei neuen Werten ändert man das Suffix, damit alte Bilder neu erzeugt werden.

### Ordnerpfad-Button (nur PC)
Ordner-Symbol in der Kopfzeile (`#i-fp`, Klasse `pconly`; nur bei `hover:hover`, feinem Zeiger und ≥ 900 px Breite sichtbar). Klick → `GET /api/store/path?project_id=` liefert den Netzwerkpfad des Projektordners (`\\\\server\\freigabe\\…`, nur im Modus „Windows-Server“; Ordner aus dem Projekt oder per Kürzel auf dem Server gesucht). Der Pfad wird in die Zwischenablage kopiert (Browser dürfen keine Explorer-Fenster öffnen). Der Endpunkt steht für alle Benutzer offen (Ausnahme in `app.py`).

Hinweis Bilder: Ab dem 7. Bild zeigt `imgSec` unter den Fotos einen breiten Button „Alle N Bilder anzeigen“ (`moreImgs`), danach „Weniger anzeigen“ (`lessImgs`). Das frühere kleine „+N“ oben rechts wurde übersehen.

### Namenskonventionen im Reiter „Projekt“
`GET /api/store/names?project_id=` (für alle Benutzer; braucht keine Serververbindung) liefert Beispiele für PDF-Dateiname, PDF-Ordner und Fototag-Ordner nach den im Projekt aktiven Regeln (Schema des Projekts aus `core/scheme.py`, sonst Standard bzw. Ordnervorlagen aus den Einstellungen) sowie die Schema-Muster. Das Frontend zeigt sie unter dem Feld „Projektordner“ (`loadNames`, Box `#pnames`). Beispieldatum = letzter Bericht des Projekts.

Hinweis: Der Kasten „Aktive Namenskonventionen“ ist ein `<details>`-Element; Auf-/Zu-Zustand merkt sich der Browser (localStorage `namesOpen`), Standard: aufgeklappt.

### Kontakte nach Projekt filtern
`GET /api/contacts` liefert je Kontakt `projects` (Projekt-IDs: Vorkommen in Berichtseinträgen wie Anwesende über `items.contact_id` → `reports.project_id`, plus die Baustellenadresse des Projekts aus `projects.extra.contact_id`; `_projects_of()` in `modules/contacts.py`). Die Kontaktliste hat dafür ein zweites Auswahlfeld `#cpr` neben dem Gewerk-Filter; Excel-/PDF-Export übernehmen den Filter über `?project=<id>` (steht auch in der Kopfzeile des Ausdrucks und im Protokoll).

## Bauplattform (ab 2026.11.1)

Das Bautagebuch ist Teil der Bauplattform (siehe `../README.md`). Gestartet wird es nicht mehr mit einer eigenen
`docker-compose.yml`, sondern mit der gemeinsamen im Hauptordner (`bash update.sh`). Das Image wird aus dem Hauptordner gebaut,
damit `shared/bpcore` (gemeinsamer Kern) hineinkommt.

- **Schema-Besitzer:** Das Bautagebuch führt alle Migrationen aus, auch die Tabellen der anderen Apps
  (`0003_plattform.sql`: `users.apps`, `users.active`, `sso_sessions`, `gantt_projects`, `gantt_versions`, `gantt_store`, `gantt_presence`).
  Bauzeitenplan, Startseite und Verwaltung warten beim Start auf `bpcore.SCHEMA`.
- **Gemeinsame Anmeldung** (`app.py` → `sso_adopt()`, `bpcore/sso.py`): Bei jeder API-Anfrage werden die Flask-Sitzung und die SSO-Sitzung (Cookie `bp_sso`) abgeglichen:
  - Ein SSO-Cookie ohne Flask-Sitzung (z. B. nach Anmeldung auf der Startseite) meldet hier an.
  - Fehlt die SSO-Sitzung, obwohl die Flask-Sitzung aus einer SSO-Anmeldung stammt, wird abgemeldet.
  - Alte Flask-Sitzungen aus der Zeit vor der Plattform bekommen einmalig eine SSO-Sitzung. So bleibt beim Update niemand außen vor.
  - `/api/login` und `/api/logout` legen die SSO-Sitzung an bzw. löschen sie.
- **App-Rechte:** `users.apps` leer = alle Apps, sonst JSON-Liste (`["bautagebuch","gantt"]`). Administratoren haben immer alle.
  Ohne Recht für das Bautagebuch gibt es 403 und keine Anmeldung.
- **Gesperrte Konten** (`users.active=0`, gesetzt in der Verwaltung) gelten in `auth.get()` als abgemeldet. Die Benutzerverwaltung nutzt `auth.get_any()`.
- **`/api/platform`** (ohne Anmeldung) liefert die Adressen der anderen Apps für das Menü ⚙. Neue Menüeinträge kommen aus `bpcore/platform.py`.
- Kontakte (`contacts`) sind zugleich das Firmen-Adressbuch des Bauzeitenplans. Der Bauzeitenplan merkt sich seine eigene Firmen-ID in `contacts.extra.gid`.
  Gewerke stehen kommagetrennt in `trade`.
- Die Datenbankverbindung bekommt das Kennwort über `PGPASSWORD` (nicht in `DATABASE_URL`). Das gilt auch für `pg_dump`/`pg_restore`.
