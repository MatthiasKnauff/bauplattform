# Gantt-App (Docker)

Gantt-Diagramm im Stil klassischer Projektplanungs-Software: Leistungstabelle links, Balkendiagramm rechts, automatische Terminplanung.

## Start

Der Bauzeitenplan ist Teil der **Bauplattform** und wird mit ihr gestartet (siehe `README.md` im Hauptordner):

```bash
bash update.sh
```

Dann im Browser öffnen: **http://server:8082** – ohne Anmeldung geht es zuerst zur Anmeldeseite der Plattform (Port 8090).

Die Pläne liegen in der gemeinsamen PostgreSQL-Datenbank (Tabellen `gantt_projects`, `gantt_versions`, `gantt_store`).
Pläne der früheren Gantt-App werden beim ersten Start einmalig aus dem alten Docker-Volume übernommen.
Gibt es keine alten Pläne, werden zwei Beispielprojekte angelegt (*Renovierung & Umbau 2 Wohnungen*, *Website-Relaunch*).

## Mehrere Benutzer

- Oben rechts steht, wer den Plan noch geöffnet hat (grüner Punkt).
- Speichert jemand anderes, übernimmt die App den neuen Stand automatisch (alle 10 Sekunden geprüft), solange du selbst nichts Ungespeichertes hast.
- Hast du gleichzeitig etwas geändert, fragt die App: **Neu laden**, **Meine Fassung speichern** (der andere Stand bleibt in der Versionshistorie) oder **Als Kopie speichern**.
- Das Adressbuch (Reiter *Gewerke & Firmen*) ist dasselbe wie die Kontakte im Bautagebuch.
- Über das Apps-Menü (⋮⋮⋮ oben rechts) lässt sich der Plan mit einem Projekt des Bautagebuchs verknüpfen. Sind dort zuständige Bauleiter eingetragen, sehen nur sie (und Administratoren) den Plan.

## Oberfläche und Farbschema
Oben links zeigt die **Projektkarte** Name, Zeitraum und Anzahl der Leistungen – ein Klick öffnet die Projektliste. Die **Versionskarte** daneben zeigt den Speicherstatus und öffnet die Versionshistorie. Rechts: Planungsassistent, Drucken, Programmeinstellungen.

Unter **Programmeinstellungen** (Schraubenschlüssel) wird das Farbschema gewählt: *Dunkel (wie Bautagebuch)* (Standard), *Hell*, *Klassisch Grün* oder *Automatisch nach System*. Die Wahl wird im Browser gespeichert; Ausdrucke bleiben immer hell.

## Datei: Neu, Öffnen, Speichern

Reiter *Datei*:

- **Neu** – leeres Projekt oder mit Planungsassistent.
- **Öffnen** (`Strg+O`) – alle Projekte mit Suche, Duplizieren, Löschen; **Vom Computer öffnen …** liest eine `.gantt`-Datei ein und bleibt mit ihr verknüpft.
- **Speichern** (`Strg+S`) – sichert auf dem Server und, falls verknüpft, zusätzlich in die Datei auf dem Computer (Chrome/Edge).
- **Speichern unter …** (`Strg+Umschalt+S`) – als neues Projekt unter neuem Namen (du arbeitest dann in der Kopie) oder als `.gantt`-Datei an einem frei wählbaren Ort.
- **Speichern als …** – anderes Format: `.gantt`, Excel/CSV, MS Project XML, PDF.
- **Automatisch speichern** – an: jede Änderung wird sofort gesichert. Aus: ● im Titel zeigt ungespeicherte Änderungen, beim Wechseln/Schließen wird gefragt.

## Versionshistorie

*Datei → Version speichern* legt einen benannten Planstand an (z. B. „Stand Ausschreibung“, mit Notiz). Zusätzlich entstehen automatische Zwischenstände (höchstens alle 15 Minuten, die letzten 60 bleiben). *Datei → Versionshistorie* zeigt alle Stände mit Projektende und bietet:
- **Vergleichen** mit dem aktuellen Stand (Projektende, verschobene / neue / entfallene Leistungen),
- **Wiederherstellen** (der aktuelle Stand wird vorher gesichert, zusätzlich Strg+Z),
- **Als Projekt** öffnen, umbenennen, löschen.

## Gewerke & Firmen

Eigener Reiter **Gewerke & Firmen** (ersetzt die Planansicht, solange er gewählt ist). Eine Zeile je Gewerk des Projekts, in Bauablauf-Reihenfolge:

| Spalte | Inhalt |
|---|---|
| Gewerk nach DIN (VOB/C) | ATV-Nummer und Bezeichnung, z. B. *18355 Tischlerarbeiten* – vorgeschlagen, änderbar |
| Unternehmer | Bezeichnung des Handwerks, z. B. *Fensterbauer*, *Estrichleger* – aus dem Plan oder vorgeschlagen, änderbar |
| Firma | aus dem Adressbuch wählen oder neu eintragen; wird bei den Leistungen des Gewerks als Unternehmer eingetragen |
| Kontakt | Ansprechpartner, Telefon, Mobil, E-Mail, Adresse (im Adressbuch, gilt für alle Projekte) |
| Vergabe, Notiz | offen / angefragt / Angebot liegt vor / beauftragt / abgeschlossen – je Projekt |
| Leistungen, Einsatz | aus dem Terminplan berechnet |

Weitere Gewerke ohne Leistungen (z. B. Statiker) über *Gewerk hinzufügen*. Darunter das **Adressbuch** aller Firmen (suchen, bearbeiten, löschen) – es ist dasselbe wie die Kontakte im Bautagebuch. Ausgabe: CSV, Liste drucken/PDF, E-Mail an alle Firmen. In der Balkenbeschriftung steht zusätzlich die *Unternehmer-Bezeichnung* zur Wahl.

## Bedienung (wie gewohnt)

| Aktion | So geht's |
|---|---|
| Neue Leistung | In die erste leere Zeile tippen, oder `Einfg` (fügt über der Markierung ein) |
| Bearbeiten | Zelle anklicken und lostippen, `F2` oder Doppelklick. `Enter` = übernehmen, `Esc` = abbrechen, `Tab` = nächste Spalte |
| Dauer | `5`, `5t`, `2w` (=10 Tage), `0` = Meilenstein |
| Vorgänger | Zeilennummern mit `;` getrennt: `3;4AA+2t;5EE-1t` (EA, AA, EE, AE) |
| Anfang setzen | Datum eintragen → Einschränkung „Anfang nicht früher als“; leeren = so früh wie möglich |
| Gliedern | `Alt+Umschalt+→ / ←`, Leistungsgruppe-Knopf; Dreieck klappt ein/aus |
| Verschieben/Reihenfolge | `Alt+Umschalt+↑ / ↓` |
| Verknüpfen | Mehrere markieren (Strg/Umschalt-Klick) + `Strg+F2`, oder Balken senkrecht auf einen anderen ziehen |
| Balken | waagerecht ziehen = verschieben, rechte Kante ziehen = Dauer ändern, Doppelklick = Leistungsinformationen |
| Verknüpfungslinie | Doppelklick = Art/Zeitabstand ändern oder löschen |
| Zoom | Reiter *Ansicht*, Regler unten rechts oder `Strg+Mausrad` |
| Kritischer Weg | Reiter *Projekt* → Kritischer Weg |
| Rückgängig | `Strg+Z` / `Strg+Y` |
| Entf | Löscht markierte Leistungen (Leistungsgruppen mit Teilleistungen) |

## Mausbedienung

| Mit der Maus | Wirkung |
|---|---|
| Balken ziehen | verschieben (Anfang nicht früher als …) |
| rechte / linke Balkenkante ziehen | Ende bzw. Anfang ändern (Dauer passt sich an) |
| kleines Dreieck unter dem Balken ziehen | Fortschritt in 5-%-Schritten |
| Punkt rechts am Balken ziehen (oder Balken senkrecht ziehen) | Verknüpfung zur Nachfolger-Leistung |
| in leerer Zeile waagerecht ziehen / doppelklicken | neue Leistung aufziehen |
| freie Fläche oder Zeitskala ziehen | Ansicht verschieben; Mausrad über der Zeitskala blättert waagerecht |
| Nummernspalte ziehen | Zeile(n) samt Unterleistungen verschieben (auch Mehrfachauswahl) |
| Rechtsklick auf Balken | Unterbrechen, Fortschritt, Löschen, Informationen … |
| Rechtsklick auf Verknüpfungspfeil | Art ändern (EA/AA/EE/AE), bearbeiten, löschen |

## Verschieben und neu verknüpfen

Wird eine Leistung an eine andere Stelle verschoben (Nummernspalte ziehen, *Nach oben/unten*, `Alt+Umschalt+↑/↓`), hängt sie standardmäßig an der Leistung **direkt darüber**. Neben der Zeile erscheint ein kleines Auswahlfeld:

- anderen Vorgänger wählen (benachbarte Leistungen darüber und darunter), die bisherigen behalten oder keinen,
- optional: die Leistung darunter wartet auf die verschobene (in die Kette einfügen).

Steht die Leistung danach hinter einem ihrer eigenen Nachfolger, wird diese Abhängigkeit automatisch überbrückt (kein Zirkelbezug) und angezeigt. `Strg+Z` nimmt Verschieben und Verknüpfen in einem Schritt zurück. Ist *Autom. verknüpfen* aus, bleiben die bisherigen Vorgänger voreingestellt.

## Arbeitszeit und Feiertage

Reiter *Projekt* → **Arbeitszeit & Feiertage** (bzw. Projektinformationen):

- **Arbeitswoche:** 5 (Mo–Fr), 6 (Mo–Sa) oder 7 Tage.
- **Feiertage:** gesetzliche Feiertage bundesweit oder je Bundesland (inkl. beweglicher Feiertage wie Ostern, Pfingsten, Fronleichnam, Buß- und Bettag). Mariä Himmelfahrt wird nur fürs Saarland gerechnet – in Bayern gilt er nur in einem Teil der Gemeinden und kann als eigener freier Tag eingetragen werden.
- **Eigene freie Tage:** Zeiträume mit Bezeichnung, optional jährlich wiederkehrend; Schnellknöpfe für Weihnachtsferien 24.12.–01.01. sowie Heiligabend/Silvester.
- Die Vorschau zeigt alle zusätzlich freien Tage im Projektzeitraum. Dauern zählen nur Arbeitstage; freie Tage sind im Diagramm rot hinterlegt (Name im Tooltip) – auch im Druck.
- Standard für neue und bestehende Projekte: 5-Tage-Woche mit bundesweiten Feiertagen.

## Balken unterbrechen

Reiter *Leistung* → **Unterbrechen**, dann auf die Stelle im Balken klicken (oder Rechtsklick → *Hier unterbrechen …* mit frei wählbarer Pause). Die Leistung besteht dann aus Abschnitten mit Pause dazwischen:

- Jeder Abschnitt lässt sich einzeln verschieben; zurück an den vorherigen geschoben, werden beide wieder zusammengeführt.
- **Pfeile an beiden Abschnitten:** Verknüpfungen können am Ende eines bestimmten Abschnitts beginnen (Verknüpfung vom gewünschten Abschnitt aus ziehen) und an einem bestimmten Abschnitt ankommen (auf den Abschnitt ziehen). Im Verknüpfungsdialog lässt sich der Abschnitt auch auswählen.
- In den Leistungsinformationen stehen die Abschnitte als Tabelle (Dauer, Pause davor) zum genauen Eingeben. Die Dauer der Leistung ist die Summe der Abschnitte.

## Verknüpfungspfeile

Die Pfeile steuern die Terminrechnung (Leistung beginnt, wenn ihre Vorleistung fertig ist). Damit der Plan übersichtlich bleibt: *Ansicht → Pfeile* **nur bei markierten Leistungen** (Standard; zusätzlich die Leistung unter der Maus), **nur kritischer Weg**, **keine** oder **alle**. Die Rechnung bleibt immer gleich. *Leistung → Pfeile aufräumen* entfernt Verknüpfungen, die über andere Leistungen ohnehin gelten – die Termine ändern sich dabei nicht. Im Druckdialog lässt sich getrennt wählen, welche Pfeile gedruckt werden.

## Balkenbeschriftung

Reiter *Ansicht* → **Balkenbeschriftung**: für *Links*, *Im Balken* und *Rechts* jeweils Leistung, Unternehmer, Gewerk, Dauer, Anfang, Ende, Anfang–Ende, % oder Nr. wählen. Gilt auch für den Druck.

## Planungsassistent

Reiter *Projekt* → **Planungsassistent** blendet rechts ein Panel ein; **Eigenes Fenster** öffnet ihn in einem zweiten Browserfenster (z. B. auf dem zweiten Bildschirm). Beide Varianten arbeiten direkt auf dem geöffneten Plan.

1. **Maßnahme / Gebäudetyp wählen:** Neubau EFH, Neubau MFH, Kernsanierung EFH, Sanierung MFH, Umbau/Renovierung Wohnungen, Badsanierung, Dachgeschossausbau, energetische Sanierung oder individuell. Der Assistent wählt die typischen Leistungen vor (*empfohlen*) und bietet weitere an (*optional*, *Weitere Leistungen*).
2. **Eckdaten:** Wohnfläche (daraus werden Richtdauern abgeleitet), Anzahl Einheiten mit Bezeichnung (Wohnung 1…, Wohnung EG/1.OG…, Bauabschnitte, eigene Namen), Ablauf *parallel* oder *nacheinander – jedes Gewerk folgt*, Baubeginn.
3. **Leistungen ankreuzen** – mit Gewerk (Farbe), VOB/C-Nummer (ATV DIN 18xxx) und Dauer. Die Vorschau zeigt sofort das voraussichtliche Ende. **Neues Projekt erstellen** erzeugt den verknüpften Plan.

**Live:** Ein mit dem Assistenten erstelltes Projekt bleibt mit ihm verknüpft. Ein Häkchen fügt die Leistung in alle Einheiten an der richtigen Stelle ein, ein entferntes Häkchen nimmt sie heraus – die Verknüpfungen schließen sich dabei sinnvoll (von Hand gesetzte bleiben erhalten). Ebenso live: Anzahl der Einheiten, Ablauf, Fläche (nur noch nicht von Hand geänderte Dauern werden angepasst), Bezeichnungen, Baubeginn. Alles mit `Strg+Z` rückgängig.

**Reihenfolge ändern:** Am Anfasser ⠿ jede Leistung per Maus an eine andere Stelle ziehen – auch in einen anderen Abschnitt. Danach folgt sie standardmäßig auf die gewählte Leistung darüber; ein Auswahlfeld darunter bietet benachbarte Leistungen, den Katalog-Standard oder „frei“. Im verknüpften Projekt wandert sie im Plan sofort mit (Daten bleiben erhalten). Die Reihenfolge wird auch in Vorlagen gespeichert.

**Weitere Leistungen:** Leistungen, die für die gewählte Maßnahme nicht typisch sind, stehen unten unter *Weitere Leistungen*. Mit **↑** wandern sie gezielt in ihren Abschnitt (und werden ausgewählt), mit **↓** wieder zurück. Das Häkchen schaltet nur an/aus – nichts springt dabei.

**Bestehende Projekte** (nicht mit dem Assistenten erstellt): Mit **＋** wird eine Leistung samt Gewerk und Richtdauer an der markierten Zeile eingefügt.

**Dauern (AT):** Jede Leistung hat ein Feld für die Arbeitstage. Ein eigener Wert ist farbig markiert, leeren stellt den Richtwert wieder her. Im verknüpften Projekt ändert sich die Dauer sofort in allen Einheiten.

**Eigene Leistungen:** In jedem Abschnitt *＋ eigene*. Beim Tippen der Bezeichnung schlägt der Assistent die wahrscheinlichsten Gewerke mit VOB/C-Nummer (ATV DIN 18299 ff.) vor – ein Klick übernimmt Gewerk und DIN. Dazu: je Einheit oder einmal fürs Gebäude, Dauer, *folgt auf* und *muss fertig sein vor*.

**Eigene Vorlagen (projektübergreifend):** *Als Vorlage speichern …* sichert die aktuelle Zusammenstellung – entweder als **ganzes Gebäude** (Maßnahme, Eckdaten, alle Leistungen) oder nur für **gewählte Abschnitte** (z. B. Haustechnik + Innenausbau). Gespeichert werden Auswahl, Dauern und eigene Leistungen. Unter *Meine Vorlagen* lassen sie sich in jedem Projekt anwenden; eine Abschnitts-Vorlage ersetzt nur diese Abschnitte. Die Vorlagen liegen auf dem Server in `presets.json` im Daten-Volume.

Der Katalog liegt in `public/catalog.js` (Leistungen, Abhängigkeiten, Dauern, Profile je Gebäudetyp) und kann dort erweitert werden.

### Geschosse
Unter *Eckdaten* stehen Anzahl der Vollgeschosse und Art des Dachgeschosses. Mit „Rohbau und Treppen geschossweise aufteilen“ wird der Rohbau als Folge Wände → Decke je Geschoss geplant, beim ausgebauten DG mit Drempel und Giebel, beim Staffelgeschoss mit Dachdecke; Treppen je Geschossübergang (mit Keller ab KG). Gerüst, Dach und alle übrigen Leistungen schließen an das letzte Rohbauteil an.

### Bauweise
Unter jedem Abschnitt des Assistenten stehen Auswahlfelder zur Bauweise (Keller, Tragwerk, Dachform, Dachdeckung, Fassade, Fenster, PV, Wärmeerzeuger, Lüftung, Wärmeverteilung, Estrich, Innenwände, Bodenbelag – je nach Gebäudetyp). Eine Änderung wählt die passenden Leistungen an oder ab und passt Bezeichnung, DIN, Gewerk, Richtdauer und Reihenfolge an (z. B. Holzbau: Vorfertigung + Montage statt Mauerwerk; Sole-WP: Erdsonden bohren vor der Wärmepumpe; Trockenestrich: keine Trocknungszeit). „Empfehlung übernehmen“ berücksichtigt die gewählte Bauweise. Leistungen mit dem Hinweis *Bauweise* kommen aus dieser Auswahl.

## Leistungskatalog (eigene Leistungen für alle Projekte)
Im Unterreiter **Abschnitte** legst du eigene Abschnitte an (z. B. „Brandschutz“), benennst Abschnitte um und bestimmst ihre Reihenfolge – per ↑/↓ oder durch Ziehen am Griff ⠿. Die Reihenfolge gilt im Planungsassistenten und für neu erzeugte Pläne; „Reihenfolge im Projekt anwenden“ sortiert die Gruppen eines bestehenden Assistenten-Plans um.

Der Reiter hat zwei Unterreiter. **Vorgaben für alle Projekte**: Standard- und eigene Leistungen mit Firmen-Vorgabe – grau steht die Stammfirma des Gewerks aus dem Adressbuch, ein eigener Eintrag gilt für diese Leistung. **Projekt: …**: die Leistungen des geöffneten Projekts mit der dort eingetragenen Firma; hier kann je Projekt abgewichen, die Vorgabe übernommen („← Vorgabe“) oder die Projekt-Firma zur Vorgabe gemacht werden („↑ als Vorgabe“).

Im Reiter **Leistungskatalog** legst du eigene Leistungen an: Bezeichnung, Abschnitt, Gewerk (mit DIN-Vorschlag), Unternehmerbezeichnung, Stammfirma, Bezug (je Einheit oder Gebäude), Dauer, *folgt auf* und *muss fertig sein vor*. Mit den Symbolen unter *Empfohlen für* wird eine Leistung für einen Gebäudetyp im Assistenten vorausgewählt; sonst steht sie dort unter „Weitere Leistungen“.
- **Aus Projekten übernehmen** listet alle Leistungen vorhandener Projekte, die nicht aus dem Standardkatalog stammen.
- **Standardkatalog** blendet die mitgelieferten Leistungen ein – mit „kopieren“ wird daraus eine eigene Variante.
- Im Planungsassistenten speichert „＋ eigene“ die neue Leistung auf Wunsch auch im Katalog.
- Beim Einfügen in ein Projekt wird die Firma aus „Gewerke & Firmen“ eingetragen (sonst die Stammfirma), die Unternehmerbezeichnung wird übernommen. Das Projekt erhält eine Kopie – spätere Katalogänderungen verändern bestehende Pläne nicht.

## Positionsvorschlag (eingebaut oder KI)
Der Umschalter **Eigene | Eingebaut | KI** erscheint im Planungsassistenten bei „＋ eigene“, im Leistungskatalog (✨) und in den Leistungsinformationen einer Leistung im Plan. Ein Klick zeigt eine Variante – gesucht wird nur beim ersten Mal, danach wird ohne neue Abfrage hin- und hergeschaltet. **Doppelklick** löst eine neue Suche aus.

Beim Anlegen einer eigenen Leistung (Planungsassistent „＋ eigene“ oder Leistungskatalog ✨) schlägt die App Abschnitt, Gewerk, DIN, Dauer und Position (folgt auf / fertig vor) vor – du prüfst und übernimmst.
Einstellung unter **Programmeinstellungen** (Schraubenschlüssel):
- **Eingebaut (ohne KI)** – Textvergleich mit vorhandenen Leistungen, DIN-Schlagworten und typischen Fachbegriffen; offline und kostenlos.
- **KI (Claude)** – API-Schlüssel von console.anthropic.com eintragen, Modell wählen, „Verbindung testen“. Der Schlüssel liegt nur auf dem Server (`settings.json` im Datenordner) und wird nie an den Browser zurückgegeben. Übertragen werden nur Leistungsbezeichnungen, Gewerke und Abschnitte. Kosten je Anfrage über dein Anthropic-Konto. Alternativ kann der Schlüssel als Umgebungsvariable `ANTHROPIC_API_KEY` in der `docker-compose.yml` stehen.
- **Aus** – kein Vorschlagsknopf.

Hinweis: Die App hat keine eigene Anmeldung. Wer die Seite erreicht, kann die Einstellungen ändern (den Schlüssel aber nicht auslesen). Für den Betrieb im Internet den Zugang z. B. im Nginx Proxy Manager mit einer Access List schützen.

## Leistungen entfernen: verkürzen oder umlegen
Wird eine Leistung im Planungsassistenten abgewählt oder im Plan gelöscht, fragt die App, ob sich die Gesamtzeit verkürzen soll oder ob die Dauer auf die Hauptleistung übertragen wird (z. B. Badmöbel → Sanitär-Feininstallation). Im Plan ist das Ziel je Leistung wählbar. Die Rückfrage lässt sich unter Programmeinstellungen → Löschen abschalten.

## Tabellen anpassen
In Gewerke & Firmen, im Adressbuch und im Leistungskatalog lässt sich die Spaltenbreite am Spaltenrand im Kopf ziehen (Doppelklick = zurücksetzen). Ein Klick auf die Überschrift sortiert – erst aufsteigend, dann absteigend, dann wieder die ursprüngliche Reihenfolge.

## Mehrere Leistungen gemeinsam ändern

- Zeilen mit Umschalt- oder Strg-Klick markieren, dann in der gewünschten Spalte einfach lostippen (oder `F2`): **Gewerk, Dauer, Unternehmer, % Abgeschlossen und Anfang** werden für alle markierten Leistungen übernommen. Name und Vorgänger bleiben je Zeile.
- **Informationen** (`Umschalt+F2`, Knopf oder Rechtsklick → „Gemeinsam bearbeiten“) öffnet bei Mehrfachauswahl einen Sammeldialog: gleiche Werte sind vorausgefüllt, abweichende als „(unterschiedlich)“ gekennzeichnet; geändert wird nur, was du anfasst – Gewerk, Balkenfarbe, Unternehmer, Dauer, %, Termineinschränkung, Notizen (anhängen/ersetzen/leeren).
- **Balkenfarbe:** Standard ist die Farbe des Gewerks; pro Leistung kann eine eigene Farbe gesetzt werden (runder Farbpunkt in der Tabelle).

## Automatisch verknüpfen

Schalter im Reiter *Leistung* → **Autom. verknüpfen** (standardmäßig an):

- **Einfügen:** Sind die Leistung darüber und die darunter verknüpft, wird die neue dazwischen gesetzt (A → B wird A → neu → B). Sonst wird sie hinter die Leistung darüber gehängt; als erste Leistung einer Gruppe übernimmt sie die Vorgänger der bisherigen ersten.
- **Löschen:** Die Kette wird überbrückt – Nachfolger hängen danach an den Vorgängern der gelöschten Leistung (A → B → C, B löschen → A → C), auch bei ganzen Leistungsgruppen. Zeitabstände bleiben erhalten; ist ein Nachfolger ohnehin schon (indirekt) abhängig, wird keine doppelte Verknüpfung angelegt.
- Eine Meldung zeigt, was angepasst wurde; `Strg+Z` nimmt alles auf einmal zurück.

## Gewerke & Farben

- Spalte **Gewerk** (oder Leistungsinformationen): Gewerk eintragen, Vorschläge erscheinen beim Tippen. Bei mehreren markierten Leistungenn gilt die Eingabe für alle; bei einem Leistungsgruppe für alle Teilleistungen.
- Jedes Gewerk hat eine feste Farbe – im Diagramm, in der Tabelle und beim Drucken (inkl. Legende).
- Reiter *Projekt* → **Gewerke & Farben**: Farben ändern, Gewerke umbenennen.
- Reiter *Projekt* → **Gewerke zuordnen**: erkennt eindeutige Fälle aus Leistung und Unternehmer (z. B. „Malerarbeiten“ → Maler) und zeigt sie vor dem Übernehmen zur Kontrolle. Vorhandene Einträge bleiben unverändert.
- Kritischer Weg: kritische Leistungen behalten ihre Gewerkfarbe und bekommen einen roten Rand.

## Drucken / PDF

Reiter *Datei* → **Drucken / PDF** (oder `Strg+P`) öffnet einen Dialog mit Live-Vorschau:

- **Formate:** A0–A6, B3–B5, US Letter/Legal, Tabloid, ANSI C–E, ARCH C–E, **benutzerdefiniert** (Breite × Höhe in mm) und **Rolle/Endlospapier** für Plotter (Rollenbreite wählen, Länge wird automatisch berechnet)
- Hoch-/Querformat, Ränder
- **An Seitenbreite anpassen** (auf N Seiten breit) oder feste Zeitskala; Zeilen optional auf N Seiten hoch anpassen; Schriftgröße
- Zeitraum (gesamt oder von–bis), Spaltenauswahl, Tabelle auf jeder Seite wiederholen, kritischer Weg, Heute-Linie, Legende, Kopfzeile, Seitenzahl
- Als PDF speichern: im Druckdialog des Browsers „Als PDF speichern“ wählen – das Seitenformat wird übernommen (am zuverlässigsten in Chrome/Edge)

Export: JSON (Sicherung/Import), CSV (Excel, Semikolon) und **MS-Project-XML**, das sich in Projektsoftware öffnen lässt.

## Planungslogik

- Arbeitstage laut Projektkalender (Arbeitswoche, Feiertage, eigene freie Tage)
- Vorwärtsrechnung ab Projektanfang, Rückwärtsrechnung für Puffer und kritischen Weg
- Leistungsgruppen berechnen Anfang, Ende, Dauer und % Abgeschlossen aus ihren Teilleistungen; Verknüpfungen auf Leistungsgruppen gelten für alle Teilleistungen
- Zirkelbezüge werden erkannt und abgelehnt

## Port ändern

In der Datei `.env` der Bauplattform `GANTT_PUBLISH` und `GANTT_PORT` anpassen und `bash update.sh` ausführen.
