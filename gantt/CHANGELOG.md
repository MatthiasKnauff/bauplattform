# Änderungsprotokoll – Gantt-App (Bauzeitenplan)

## 3.3.1 – 03.11.2026
- Planungsassistent, eigene Leistung: „Folgt auf“ und „Muss fertig sein vor“ zeigen nur noch die im Plan verwendeten Leistungen. Ganz unten in der Liste „▼ alle Leistungen anzeigen …“ blendet den ganzen Katalog ein (und wieder aus).

## 3.3.0 – 03.11.2026
- **Leistungskatalog → Projekt: Abschnitt, Gewerk und Firma direkt änderbar.** Die Felder sind jetzt als Eingabefelder erkennbar.
  - **Abschnitt:** Leistungen aus dem Planungsassistenten werden wie beim Verschieben im Assistenten in den gewählten Abschnitt gesetzt (in allen Wohnungen, Daten bleiben). Andere Leistungen wandern unter den gleichnamigen Abschnitt im selben Gebäude-/Wohnungsblock.
  - **Gewerk:** gilt für alle Zeilen dieser Leistung im Plan (z. B. alle Wohnungen).
  - Alles mit Strg+Z rückgängig.

## 3.2.0 – 03.11.2026
- **Bezug umstellbar (Gebäude ↔ je Wohnung)**, auch bei Leistungen aus dem Standardkatalog:
  - **Im Planungsassistenten je Projekt:** Bei mehreren Einheiten steht an jeder Leistung „Gebäude“ bzw. „je Whg.“ – anklicken stellt um. Im laufenden Plan wird die Leistung dabei neu angelegt (z. B. Rollläden: statt einer Zeile unter „Gebäude / Allgemein“ je eine Zeile in jeder Wohnung); eigene Dauer bleibt, mit Strg+Z rückgängig. Gestrichelt umrandet = in diesem Projekt geändert.
  - **Im Leistungskatalog als Vorgabe:** In der Spalte „Bezug“ lässt sich jetzt auch bei Standardleistungen „Gebäude“ / „je Einheit“ wählen. Gilt für neue Planungen; bestehende Pläne bleiben unverändert.
  - Vorlagen „Ganzes Gebäude“ speichern die Bezüge mit.

## 3.1.1 – 03.11.2026
- **Firmen löschen nur, wenn nirgends verwendet** – gleiche Regel wie im Bautagebuch und in der Adressen-App: nicht in Berichten, nicht als Baustellenadresse, in keinem Bauzeitenplan einem Gewerk zugeordnet. Ist die Firma im geöffneten Plan eingetragen, zuerst beim Gewerk entfernen.

## 3.1.0 – 03.11.2026
- **Baustellenadressen nicht mehr als Firmen**: Im Bautagebuch beim Projekt gespeicherte Baustellenadressen (Gewerk „Baustelle“) erscheinen nicht mehr in der Firmenauswahl und im Adressbuch.
- **Farbschema zentral**: wird jetzt auf der Startseite unter „Darstellung“ eingestellt und gilt für alle Apps; in den Programmeinstellungen steht nur noch der Hinweis dorthin.
- Anmeldung: kein Hin- und Herspringen mehr zwischen Startseite und Bauzeitenplan, wenn der Browser noch ein altes Anmelde-Cookie hat (vor allem Handys).

## 3.0.1 – 03.11.2026
- „Gewerk hinzufügen“: Der Browser schlägt keine Projektnamen/Bauvorhabenadressen mehr vor. Stattdessen Vorschlagsliste mit üblichen Gewerken und Gewerken aus dem Adressbuch (ohne die schon im Projekt vorhandenen).

## 3.0.0 – 03.11.2026 · Teil der Bauplattform
- **Gemeinsame Datenbank** mit dem Bautagebuch (PostgreSQL) statt JSON-Dateien. Beim ersten Start werden alle bisherigen Pläne, Versionen, Vorlagen, der Leistungskatalog, Abschnitte, Firmen-Vorgaben und Einstellungen aus dem alten Docker-Volume übernommen (nur gelesen, das alte Volume bleibt unverändert).
- **Gemeinsame Anmeldung (SSO)**: Anmeldung über die Startseite der Bauplattform; wer im Bautagebuch angemeldet ist, ist es auch hier. Abmelden gilt für alle Apps.
- **Mehrere Benutzer gleichzeitig**: Kopfleiste zeigt, wer den Plan noch geöffnet hat. Änderungen anderer werden automatisch übernommen, solange man selbst nichts Ungespeichertes hat. Speichert jemand auf einem veralteten Stand, fragt die App: *Neu laden*, *Meine Fassung speichern* (der andere Stand bleibt als Version erhalten) oder *Als Kopie speichern*. Versionen zeigen, wer sie angelegt hat.
- **Adressbuch = Kontakte des Bautagebuchs**: Firmen sind in beiden Apps dieselben. Gelöscht wird nur, was ausdrücklich gelöscht wird; Kontakte, die im Bautagebuch verwendet werden, bleiben.
- **Verknüpfung mit Bautagebuch-Projekten** (Apps-Menü oben rechts): Der Plan zeigt das Projekt in der Kopfleiste; Sichtbarkeit richtet sich nach den zuständigen Bauleitern des Projekts.
- **Gemeinsames Erscheinungsbild**: Schema „Dunkel“ mit den Flächen des Bautagebuchs, persönliche Akzentfarbe aus dem Bautagebuch, gleiche Schrift; App-Umschalter oben rechts.
- Server von Node.js auf Python umgestellt (gleiche Schnittstelle, gleiche Oberfläche).

## 2.8.3
- Nach einem Update lädt der Browser die neuen Programmdateien garantiert neu (Versionsstempel an Skripten und Stylesheets). Vorher konnten Browser oder Proxy-Cache alte Dateien weiterverwenden.

## 2.8.2
- Leistungskatalog: Spalte „Empfohlen für“ heißt jetzt „Vorausgewählt bei“, mit Erklärung als Tooltip.

## 2.8.1
- Projektwechsel in den Reitern „Gewerke & Firmen“ und „Leistungskatalog“: Projektkarte (Name, Zeitraum) und Statusleiste werden jetzt sofort aktualisiert.
- Projektkarte zeigt den vollständigen Projektnamen als Tooltip (hilfreich bei langen, ähnlichen Namen).

## 2.8.0 – 02.11.2026
- **Tabellen: Spaltenbreite und Sortierung** in Gewerke & Firmen, Adressbuch, Leistungskatalog (Vorgaben, Projekt) und Abschnitte (nur Breite). Spaltenrand im Kopf ziehen ändert die Breite, Doppelklick setzt zurück; Klick auf die Überschrift sortiert auf-/absteigend bzw. zurück zur ursprünglichen Reihenfolge. Datumsspalten sortieren nach Datum; im Leistungskatalog wird innerhalb der Abschnitte sortiert. Breiten und Sortierung bleiben gespeichert.

## 2.7.12 – 02.11.2026
- Gewerke & Firmen: Der Einsatz-Balken zeigt nur die **tatsächlichen Arbeitszeiträume** des Gewerks (je Leistung bzw. Abschnitt, zusammenhängende Tage zusammengefasst) – Pausen bleiben als Lücke sichtbar; ebenso in der Druckliste. Mauszeiger auf einem Stück zeigt dessen Zeitraum.
- Spalte „Anzahl“ entfernt; die Leistungen des Gewerks stehen im Tooltip der Einsatz-Spalte.
- Planungsassistent auch auf der Startseite und in den Reitern Gewerke & Firmen und Leistungskatalog sichtbar.

## 2.7.11 – 02.11.2026
- Gewerke & Firmen: Spalte „Leist.“ heißt jetzt **„Anzahl“** (Leistungen des Gewerks im Plan); Mauszeiger über der Zahl zeigt die Leistungen mit Namen. In der Druckliste ausgeschrieben.

## 2.7.10 – 02.11.2026
- Leistungsinformationen: **Vorschlagsliste für den Unternehmer** (▾ oder Alt+↓) – Firmen für das eingetragene Gewerk (aus „Gewerke & Firmen“ und dem Adressbuch), Unternehmerbezeichnung, im Projekt verwendete Unternehmer, ganzes Adressbuch.

## 2.7.9 – 02.11.2026
- Vorschlagsliste für Bezeichnungen zeigt nur noch die Bezeichnung; das Gewerk wird nicht mehr angezeigt und nicht mehr automatisch eingetragen.
- Leistungsinformationen: **◀ Vorherige · Nächste ▶ · ↶ Rückgängig** sitzen jetzt in der Titelleiste und springen nicht mehr mit der Fensterhöhe.

## 2.7.8 – 02.11.2026
- **Vorschlagsliste für Bezeichnungen** (▾ oder Alt+↓): zuletzt verwendet · in diesem Projekt · Leistungskatalog; Tippen filtert, ↑/↓ + Enter wählt. In den Leistungsinformationen und beim Bearbeiten in der Tabelle. Bei Auswahl einer Katalog-Leistung wird ein leeres Gewerk mit ausgefüllt.

## 2.7.7 – 02.11.2026
- Leistungsinformationen: Feld „Name“ heißt jetzt **„Bezeichnung“**.

## 2.7.6 – 02.11.2026
- Leistungsinformationen: **◀ Vorherige / Nächste ▶** (Alt+↑/↓) übernehmen die Änderungen und springen zur benachbarten Leistung; **↶ Rückgängig** (Strg+Z im Fenster) nimmt die Änderungen im Fenster Schritt für Schritt zurück.
- KI-Vorschlag: feste Antwortstruktur über die Claude-Schnittstelle (Werkzeugaufruf) – behebt „Antwort der KI nicht lesbar“.

## 2.7.5 – 02.11.2026
- Gewerke & Firmen: Spalte **Einsatz im Plan** mit Zeitbalken in der Gewerkfarbe über den Projektzeitraum, Monatsraster und Monatsnamen im Spaltenkopf (wie in der gedruckten Liste).

## 2.7.4 – 02.11.2026
- Eckdaten verständlicher: Reihenfolge Geschosse → Keller → Dachform → **Darüber**. „Darüber“ richtet sich nach der Dachform: Steildach = Dachraum nicht ausgebaut (Spitzboden) oder Dachgeschoss ausgebaut; Flachdach = nichts (Flachdach direkt auf dem obersten Vollgeschoss) oder Staffelgeschoss. Darunter eine Zeile mit dem Gebäude in Worten, z. B. „KG · EG · 1.OG · Staffelgeschoss – Flachdach“.

## 2.7.3 – 02.11.2026
- Planungsassistent: **Dachform** und **Keller** stehen jetzt auch direkt unter *Eckdaten* (neben Geschossen und Dachgeschoss); die Auswahl ist mit der im jeweiligen Abschnitt verbunden.

## 2.7.2 – 02.11.2026
- Alle Dialogfenster an der Titelleiste verschiebbar; die Position wird je Dialog gemerkt (bis zum Neuladen), Doppelklick auf die Titelleiste stellt sie wieder mittig.

## 2.7.1 – 02.11.2026
- Dauer von Leistungsgruppen standardmäßig wieder als **Zeitspanne** (wie MS Project); Summe oder beides weiterhin unter Ansicht → Leistungsgruppen wählbar.

## 2.7.0 – 02.11.2026
- **Dauer von Leistungsgruppen = Summe der Leistungen** (Standard). Unter Ansicht → Leistungsgruppen wählbar: Summe, Zeitspanne (erste bis letzte Leistung, wie MS Project) oder beides. Tooltip zeigt beide Werte; der Gruppenbalken zeigt die Zeitspanne. Gilt auch im Ausdruck.

## 2.6.1 – 02.11.2026
- Leistungskatalog: Bei Kopien steht im Vorschlags-Umschalter vorn **„wie Standardkatalog“** bzw. bei duplizierten eigenen Leistungen **„wie Kopiervorlage“** – setzt Abschnitt, Gewerk, DIN, Bezug, Dauer und Position auf die Werte des Originals zurück. Kopien merken sich ihr Original.

## 2.6.0 – 02.11.2026
- **Vorschlags-Umschalter „Eigene | Eingebaut | KI“** im Planungsassistenten (eigene Leistung), im Leistungskatalog (✨ je Zeile) und neu in den Leistungsinformationen im Plan (Gewerk, Dauer, Vorgänger, Nachfolger aus dem Plan). Gesucht wird nur beim ersten Anzeigen einer Variante, danach wird ohne neue Abfrage umgeschaltet; **Doppelklick** sucht neu. „Eigene“ stellt die eigenen Angaben wieder her.
- Beim Übernehmen aus anderen Projekten wird der Abschnitt mit dem eingebauten Vorschlag bestimmt.
- **Entfernen mit Rückfrage**: Beim Abwählen im Planungsassistenten und beim Löschen im Plan wird gefragt, ob sich die Gesamtzeit verkürzen soll oder die Dauer auf die Hauptleistung umgelegt wird (z. B. Badmöbel → Sanitär-Feininstallation, Sockelleisten → Bodenbelag). Ziel je Leistung wählbar; „für weitere so verfahren“ bzw. „nicht mehr fragen“ (Programmeinstellungen → Löschen).

## 2.5.1 – 02.11.2026
- Planungsassistent: **Dachform** auch bei Kernsanierung EFH, Sanierung MFH, Dachgeschossausbau und Energetischer Sanierung (steuert dort Deckungsarten, Bezeichnungen und Dauern; Dachstuhl wird nur beim Neubau automatisch an-/abgewählt).
- Eckdaten: Haken „Rohbau und Treppen geschossweise aufteilen“ richtig ausgerichtet.

## 2.5.0 – 02.11.2026
- **Positionsvorschlag für neue Leistungen**: Knopf „✨ Position vorschlagen“ im Planungsassistenten (eigene Leistung) und im Leistungskatalog. Schlägt Abschnitt, Gewerk, DIN, Bezug, Dauer, „folgt auf“ und „muss fertig sein vor“ vor, mit Begründung.
  - *Eingebaut (ohne KI)*: Ähnlichkeit zu vorhandenen Leistungen (ganze Wortstämme, auch in zusammengesetzten Wörtern), DIN-Schlagworte und eine Liste typischer Fachbegriffe – offline, kostenlos.
  - *KI (Claude)*: über den eigenen Server; bei Fehlern greift der eingebaute Vorschlag.
- **Programmeinstellungen**: Variante (Aus / Eingebaut / KI), API-Schlüssel (nur auf dem Server gespeichert, nie an den Browser zurückgegeben), Modell, „Verbindung testen“.
- **Projekt schließen**: im Reiter Datei, im Menü der Projektkarte (zuletzt bearbeitete Projekte, Öffnen, Neu, Schließen) und mit Strg+W; Startseite mit den zuletzt bearbeiteten Projekten.
- **Vorgänger und Nachfolger** der markierten Leistung: Vorgänger blau, Nachfolger orange (Pfeile, Balkenrahmen, Zeilen); Tooltip nennt beide mit Namen.
- Dunkles Farbschema: hervorgehobene Knöpfe wieder in Akzentfarbe; Leistungskatalog ohne geöffnetes Projekt nutzbar.

## 2.4.0 – 02.11.2026
- **Eigene Abschnitte**: Leistungskatalog → Unterreiter *Abschnitte*. Abschnitte anlegen, umbenennen, Reihenfolge mit ↑/↓ oder Ziehen festlegen (auch für Standardabschnitte), eigene löschen (Leistungen wandern in den Abschnitt davor), Standard wiederherstellen. Gilt für alle Projekte und den Planungsassistenten.
- „Reihenfolge im Projekt anwenden“ ordnet die Leistungsgruppen eines mit dem Assistenten erstellten Plans neu (Verknüpfungen bleiben).
- Leere Abschnitte erscheinen im Katalog, damit dort Leistungen angelegt werden können.

## 2.3.0 – 02.11.2026
- **Leistungskatalog mit Unterreitern**: *Vorgaben für alle Projekte* und *Projekt: …*.
- Firmen-Vorgabe je Leistung für alle Projekte – auch für den Standardkatalog. Ohne eigenen Eintrag gilt die Stammfirma des Gewerks aus dem Adressbuch (grau). Neue Firmen werden ins Adressbuch übernommen.
- Neue Projekte und eingefügte Leistungen erhalten die Vorgabe-Firmen; im Reiter „Gewerke & Firmen“ ist die Stammfirma je Gewerk vorbelegt.
- Unterreiter *Projekt*: alle Leistungen des Projekts mit Firma, Vorgabe und Telefon; abweichen, „← Vorgabe“, „↑ als Vorgabe“, „Vorgaben für Leistungen ohne Firma übernehmen“, Filter „nur ohne Firma“.
- Gewerke & Firmen: Auswahl „Vergabe“ baut die Tabelle nicht mehr neu auf (Auswahlliste bleibt offen), Fokus bleibt nach Änderungen erhalten.

## 2.2.0 – 02.11.2026
- **Geschosse im Planungsassistenten**: Anzahl Vollgeschosse, Dachgeschoss (nicht ausgebaut, ausgebaut, Staffelgeschoss) und Schalter „Rohbau und Treppen geschossweise aufteilen“. Der Rohbau wird dann je Geschoss geplant (Wände EG → Decke über EG → Wände 1.OG … → Drempel und Giebel DG bzw. Staffelgeschoss mit Dachdecke), Treppen je Geschossübergang (KG–EG, EG–1.OG …, folgen jeweils auf die Decke darunter). Bezeichnungen nach Bauweise (Mauerwerk, Stahlbeton, Holzrahmen, Brettsperrholz), oberste Decke beim Flachdach als Dachdecke. Jedes Teil hat eine eigene Dauer; im verknüpften Projekt wirken Änderungen sofort.

## 2.1.0 – 02.11.2026
- **Kleinteiligerer Katalog** (92 statt 57 Leistungen): Wände/Decken spachteln und schleifen (Q2/Q3), Tapezieren, Streichen, abgehängte Decken; Boden-Untergrund vorbereiten, Parkett schleifen/ölen, Altparkett aufarbeiten, Treppenbelag; Treppengeländer, Fensterbänke innen/außen, Badmöbel, Duschabtrennung, Bad-Accessoires, Silikonfugen, Küche, Einbauschränke; außen Rollläden/Raffstores, Vordach, Balkone, Balkongeländer, Dachflächenfenster, Schornstein, Dachzubehör, Blitzschutz, Fundamenterder, Zuwege, Terrasse, Markise, Garage/Carport, Zaun, Briefkasten/Klingel, Außenbeleuchtung. Bodenbelag-Bauweise „Massivparkett“.
- **Neuer Reiter „Leistungskatalog“**: eigene Leistungen projektübergreifend anlegen (Abschnitt, Gewerk, DIN, Unternehmer, Stammfirma, Bezug, Dauer, Vorgänger/Nachfolger, „empfohlen für“ je Gebäudetyp), aus vorhandenen Projekten übernehmen, Standardkatalog einblenden und als eigene Variante kopieren, Export/Import, direkt in den Plan einfügen.
- Katalog-Leistungen erscheinen im Planungsassistenten (empfohlene vorausgewählt); „＋ eigene“ im Assistenten speichert wahlweise auch im Katalog. Beim Einfügen werden Firma und Unternehmerbezeichnung wie im Reiter „Gewerke & Firmen“ übernommen.
- **Firmenliste drucken** neu gestaltet: Kopf mit Kennzahlen, Kontakt gebündelt, Vergabestatus farbig, Einsatz-Zeitbalken mit Monatsraster, Seitenzahlen.
- Verknüpfungs-Vorschaulinie (orange gestrichelt) verschwindet nach dem Loslassen zuverlässig.

## 2.0.0 – 02.11.2026
- **Neues Layout** im Stil des Bautagebuchs: Kopfleiste mit Projektkarte (Name, Zeitraum, Anzahl Leistungen – Klick öffnet die Projektliste) und Versionskarte (Speicherstatus – Klick öffnet die Versionshistorie), Symbole für Assistent, Drucken und Einstellungen; Reiter mit Symbolen und Unterstrich.
- **Programmeinstellungen** (Schraubenschlüssel oben rechts oder Datei → Einstellungen): Farbschema *Dunkel (wie Bautagebuch)*, *Hell*, *Klassisch Grün* oder *Automatisch nach System*. Gilt je Browser, auch im Assistenten-Fenster; Druck und PDF bleiben hell.

## 1.10.0 – 02.11.2026
- **Bauweise im Planungsassistenten**: jeder Bereich hat Auswahlfelder – Keller/Gründung (Bodenplatte, WU-Beton, gemauert + Abdichtung, Fertigkeller), Tragwerk (Massiv, Stahlbeton, Holzrahmen, Brettsperrholz), Dachform und -deckung (passend zur Form, z. B. Gründach nur beim Flachdach), Fassade (Putz, WDVS, Klinker, vorgehängt hinterlüftet, Holz), Fenster, Photovoltaik, Wärmeerzeuger (Luft-/Sole-WP mit Erdsonden, Gas, Fernwärme, Pellet), Lüftung, Wärmeverteilung (FBH/Heizkörper), Estrich (Zement, Calciumsulfat, Trockenestrich ohne Trocknung), Innenwände, Bodenbelag.
- Die Wahl setzt passende Leistungen, Bezeichnungen, DIN, Gewerk, Dauer und Vorgänger; im verknüpften Projekt sofort im Plan (Strg+Z). Von Hand geänderte Namen/Dauern bleiben erhalten.
- Neue Leistungen im Katalog: Erdwärmesonden, Holzbau-Vorfertigung und -Montage, Dachbegrünung, Photovoltaik, Klinker, VHF, Holzfassade, Fußbodenheizung. Vorlagen speichern die Bauweise mit.

## 1.9.0 – 02.11.2026
- **Reiter „Gewerke & Firmen“**: Tabelle je Gewerk mit *Gewerk nach DIN (VOB/C)*, *Unternehmer* (z. B. Fensterbauer, Estrichleger) und *Firma* samt Ansprechpartner, Telefon, Mobil, E-Mail, Adresse, Vergabestatus und Notiz; Leistungsanzahl und Einsatzzeitraum aus dem Plan. DIN-Nummer und Bezeichnung werden vorgeschlagen und sind änderbar.
- Projektübergreifendes **Adressbuch** der Firmen; eine Firma für ein Gewerk wird als Unternehmer bei dessen Leistungen eingetragen, die Unternehmer-Spalte schlägt Firmen vor.
- Export als CSV, Firmenliste drucken/PDF, E-Mail an alle Firmen; Balkenbeschriftung „Unternehmer-Bezeichnung“.

## 1.8.0 – 02.11.2026
- **Dateihandling** wie in Office: Neu, Öffnen (Projektliste mit Suche, Duplizieren, Löschen), Speichern (Strg+S), Speichern unter (neuer Name auf dem Server oder als `.gantt`-Datei auf dem Computer, mit Dateiverknüpfung), Speichern als (.gantt, Excel/CSV, MS Project XML, PDF). Schalter *Automatisch speichern*; ohne Autospeichern Anzeige ● und Rückfrage vor dem Wechseln/Schließen.
- **Versionshistorie** je Projekt: benannte Versionen mit Notiz, automatische Zwischenstände (höchstens alle 15 Min., die letzten 60), Vergleich mit dem aktuellen Stand (Projektende, verschobene/neue/entfallene Leistungen), Wiederherstellen (mit Sicherung und Strg+Z), als neues Projekt öffnen.
- **Pfeile**: Anzeige *alle / nur markierte / kritischer Weg / keine* (Standard: nur markierte); *Pfeile aufräumen* entfernt überflüssige Verknüpfungen ohne Terminänderung; Druckoption für Pfeile.

## 1.7.0
- Nach dem Verschieben einer Leistung: Vorgänger standardmäßig die Leistung darüber, Auswahlfeld für Alternativen, optional in die Kette einfügen; Zirkelbezüge werden überbrückt.
- Planungsassistent: Reihenfolge per Maus ändern (auch über Abschnitte), mit Vorgängerwahl.
- Arbeitskalender: 5-/6-/7-Tage-Woche, gesetzliche Feiertage bundesweit oder je Bundesland, eigene freie Tage (auch jährlich).

## 1.6.0
- Planungsassistent: Dauer (AT) je Leistung einstellbar, eigene Leistungen mit Gewerk-/DIN-Vorschlag nach VOB/C, Vorlagen projektübergreifend (ganzes Gebäude oder Abschnitte), „Weitere Leistungen“ mit ↑/↓.

## 1.5.0
- Bau-Vokabular (Leistung, Unternehmer, Leistungsgruppe), Balkenbeschriftung links/im Balken/rechts, Balken unterbrechen mit Pfeilen je Abschnitt, umfangreiche Mausbedienung.

## 1.4.0
- Planungsassistent (angedockt oder eigenes Fenster) mit Gebäudetyp-Profilen und Live-Änderung.

## 1.3.0
- Automatisch verknüpfen beim Einfügen/Löschen, mehrere Leistungen gemeinsam bearbeiten, eigene Balkenfarben.

## 1.2.0
- Gewerke mit Farben, automatische Gewerk-Zuordnung.

## 1.1.0
- Drucken/PDF mit freien Papierformaten und Plotter-Rolle.

## 1.0.0
- Gantt-App als Docker-Container: Tabelle + Diagramm, Terminrechnung mit EA/AA/EE/AE, Leistungsgruppen, kritischer Weg, Rückgängig, Export.
