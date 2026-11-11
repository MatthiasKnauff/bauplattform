# Bauplattform – ToDo-Liste

Stand: 11.11.2026. Wird bei jedem Push aktualisiert und beim Start der Dienste als PDF in „Pläne & Dateien“ → Projekt „Büro“ → Ordner „Bauplattform“ abgelegt (Produktion; der Testserver schreibt nicht in die Ablage). Erledigtes ist durchgestrichen. Zeitangaben = wie lange Claude bis zum Push braucht (Bauen und eigener Test), ohne Abstimmungsrunden, euer Testen auf dem Testserver und die Pipeline (ca. 10 Minuten). Seit 11.11.2026 so gerechnet – vorher standen hier Arbeitszeiten eines Entwicklers, etwa zehn- bis zwanzigmal so lang.

## Jetzt in Arbeit

- ~~Bautagebuch auf den Baukasten (Rahmen, neun Skripte, Baukasten statt Kopien, Drucken mehrerer Berichte) – fertig am 11.11.2026~~

## Kurzfristige Sammlung (nach dem Bautagebuch)

1. Projektordner, Etappe 2: Umordnen per Ziehen und Ablegen in der Nachher-Ansicht, Dateinamen nach Schema (nicht nur das Kürzel), Seite für andere Benutzer freischalten. **ca. 30–45 min**
2. Suchleiste (Inhalte + Funktionen + Menüs, kombiniert – ca. 1–1,5 h) in allen Apps vereinheitlichen (ein Baustein: Lupe, Treffer, vor/zurück, Strg+F, eng = nur Lupe) – erst Mock. **ca. 20–30 min**
3. Vergleich im Bauzeitenplan, Etappe 2: Platzhalterzeile an der alten Stelle und Pfeil direkt in der Tabelle. **ca. 30 min**
4. Alle Tabellen (baum.js), Rest: Langtext klappt beim Verlassen zu, zugeklappte Titel bleiben zu. **ca. 15–20 min**
5. Aufmaß: Menge direkt eintragen – ohne Aufmaßzeilen entsteht eine Zeile „pauschal“, mit Aufmaßzeilen eine Ausgleichszeile (Vorschlag, wartet auf Zustimmung). **ca. 15–20 min**
6. Aufmaßprüfung: erster Rechenweg direkt in der Hauptzeile der Position (weitere Zeilen als Zwischenzeilen), Mengen auch in „lt. Rechnung“ – Enter nach unten, Tab nach rechts – Mock liegt vor. **ca. 20–30 min**
7. ~~Abnahme am Handy mit Unterschrift – in der Kommunikation (＋ → Abnahme): Angaben aus dem Auftrag, Mängel mit Fotos, Erklärungen antippen, drei Unterschriften (oder „nicht anwesend“), Niederschrift + Mängelblatt + Fotos auf dem Briefbogen, Ablage „Abnahmen + Mängel“, Abnahmedatum in die AVA, Mängel als Aufgabe, Erinnerung vor Ende der Gewährleistung, Mail nur auf Knopfdruck, Nachtrag~~
   - Abnahme, Rest: Standort beim Unterschreiben, mehrere Fotos auf einmal aus der Galerie, Abnahme auch aus dem Auftrag in der AVA starten. **ca. 20–30 min**
8. ~~PDF- und Foto-Ansicht am Handy und am PC wie der Standard-Viewer~~
9. Neue App „Bauantrag“: aktuelle Antragsformulare je Bundesland (NRW: Anlagen zur VV BauPrüfVO von bauportal.nrw, neue Fassungen werden gemeldet), Assistent, Felder aus Projekt, Adressen, Kataster und Baukosten; am Ende ein bearbeitbares PDF, Änderungen darin fließen in die Datenbank zurück – erst Mock. **ca. 4–6 h in mehreren Runden (je weiteres Bundesland ca. 1 h); die amtlichen Formular-PDFs müsst ihr einmal hochladen – von hier aus kann ich sie nicht herunterladen**
10. ~~Honorar: Versionen – je Auftrag oder je Projekt, jederzeit umstellbar; speichern, laden, „gilt“, PDF mit Versionsnamen~~
11. Verträge: Architekten-/Ingenieurvertrag aus Honorar, Auftragsschreiben/Bauvertrag aus der AVA-Vergabe, auf dem Briefbogen; Ablage in einem eigenen Vertragsverzeichnis, Zugangsdaten trägt der Geschäftsführer selbst ein (nie im Browser sichtbar) – wartet auf: eigene Freigabe oder geschützter Unterordner; erst Mock. **ca. 2–3 h**
12. Ansicht „Einfach“ der AVA neu denken: geführter Ablauf je LV (nächster Schritt groß, nur nötige Spalten und Knöpfe) statt nur Übersichtskarten – erst Mock; gleiche Idee für Bautagebuch (Basis/Experte). **ca. 1–1,5 h**
16. Stempel auf Nachfrage an den passenden Stellen anbieten (Rechnungsprüfung → Prüfstempel/„Zahlbetrag siehe Anlage“, Abnahme/Schreiben → Bürostempel) – sobald die Stempel hochgeladen sind. **ca. 20–30 min**
14. Unterschreiben – Rest: unterschriebenes PDF direkt in Versand/Ablage der App übernehmen, Eintrag im Verlauf (Unterschrift des GF „i. V.“: nein, entschieden 11.11.). **ca. 20 min**
13. Widget „Datei ablegen“ auf der Startseite: Kopierer-Ordner überwachen, Scans per Texterkennung (OCR, beim Hereinziehen schon eingebaut) lesen und den Ablageort nur vorschlagen – abgelegt wird erst nach Bestätigung (entschieden 11.11.). **ca. 1 h**

Summe Sammlung (offen): ca. 12–16 h.

## Offene Fragen

- Leistungsinformationen: Fehler am Dropdown noch nicht nachgestellt. **ca. 10 min**
- Baukosten: Karte „Verknüpfung“ → „Bauzeitenplan“ ohne Projektfeld? **ca. 5–10 min**

## Umbau (Zielbild vom 09.11.2026)

- Schritt 4 – Apps auf den Baukasten, große Dateien teilen:
  - Bauzeitenplan Etappe 2: alle Pläne des Projekts im Baum, Ziehen/Ablegen, Schalter „nur geöffneten Plan“, Katalog als Reiter rechts, Kennzahlen in der Leiste, Suche in die Navigation, verstecktes Menüband entfernen, genaue Texte im Rückgängig-Dock. **ca. 2–3 h**
  - Planungsassistent und Vorlagen-Baukasten als gemeinsamer Baustein, danach auch in der Kostenberechnung (Start-Assistent: Maßnahme/Gebäudetyp, Eckdaten, Schritt für Schritt, eigene Vorlagen) – erst Mock. **ca. 2–3 h**
  - AVA: Spalten-Menü für Aufträge. **ca. 15 min**
  - Große Dateien teilen: head.js, ava.py, head.py (Bauzeitenplan, Baukosten-Seite und PDF-Teil von baukosten.py sind geteilt). **ca. 2–3 h**
- Schritt 5 – Kern aus dem Bautagebuch lösen: Ablage, Pläne, Fotos, Mail, Datensicherung, Bauleiter-Regel, Rechte. **ca. 1 Tag in mehreren Runden**
- Verhaltenstests je App. **ca. 1 h je App, ca. 1 Tag gesamt**
- Typprüfung über JSDoc. **ca. 2 h**

## Später

- Webplattform für Externe (Portal): Firmen, Fachplaner, Bauherr über das Internet – eigener Portal-Container, Einladung, Zwei-Faktor, Rechte je Projekt und Rolle, Protokoll. Nach Schritt 5. **ca. 2–3 Tage**
- Projektplattform und Dokumentenmanagement: Ordner nach Vorlage, Versionen/Indizes, Freigabe-Läufe, Volltextsuche, Planlauf, Protokolle mit Fristen, Objektspeicher (MinIO). **ca. 3–5 Tage**
- Leistungsphase 0: Raumprogramm/Flächen (DIN 18205) als Grundlage für die Kostenschätzung. **ca. 4–6 h**
- Honorar, Etappe 2: Rechnungen (Abschlag nach erbrachtem Anteil, Schlussrechnung) mit Rechnungsnummer und Zahlungseingang, Angebote in Varianten, weitere Objektarten (Innenräume, Freianlagen), Freischaltung für einzelne Benutzer. **ca. 4–6 h**
- Bauantrag digital einreichen (Bauportal.NRW bzw. Portal des Bundeslands) – nach der App „Bauantrag“. **ca. 1 Tag**
- Honorar: Ansicht für Geschäftsführer (alles mit Beträgen) und Mitarbeiter (nur eigene Projekte, Stunden verbraucht/verfügbar, ohne Euro) – nur in Honorar, erst Mock. **ca. 1 h**
- Textprüfung. **ca. 2 h**
- Einrichtungsassistent. **ca. 3 h**
- Handy-App. **ca. 2 Tage**
- Mail und Kalender. **ca. 1,5 Tage**
- Redundanz (Ausfallsicherheit). **ca. 4–6 h**
- Büros bis 100 Personen (Last, Rechte, Mandanten). **ca. 1 Tag**
- Spätere Umstellung (Ziel, noch nicht begonnen): TypeScript + React, FastAPI + Pydantic, App für App mit Verhaltenstests vorweg. **ca. 2–4 Wochen**

## Erledigt
- ~~Bauzeitenplan, Arbeitszeit & Feiertage: Arbeitswoche und Feiertage als Knöpfe statt Auswahllisten, Tabelle der freien Tage mit Platz~~
- ~~Bauzeitenplan: Fenster „Arbeitszeit & Feiertage“ öffnet gleich groß~~
- ~~Bauzeitenplan, Leistungskatalog → Projekt (Firmen im Projekt): Abschnitt jeder einzelnen Leistung frei wählbar – alle Gruppen des Plans, auch aus der obersten Ebene heraus~~
- ~~Baukosten, Kostenansätze übernehmen: Auswahl mit Suche über alle Projekte, nach Projekt gruppiert (eigenes zuerst), statt Systemliste~~
- ~~Erinnerungen & Fristen: Auswahl nur nach Klick aufs Zahnrad (auch bei gesperrter Startseite), nicht mehr automatisch beim Anlegen~~
- ~~Adressverzeichnis druckt nur Namen: kein Fehler – auf dem Testserver sind die Adressen fast leer (geklärt 11.11.)~~
- ~~Unterschreiben am Handy per QR-Code vom PC: ✍ → „📱 Am Handy“, Unterschrift erscheint im PDF am PC~~
- ~~Stempel werden beim Hochladen gerade ausgerichtet (Schräglage gemessen), schräg erst beim Einsetzen~~
- ~~Prüfstempel: „geprüft am“ und „von“ werden beim Einsetzen mit Datum und Namen ausgefüllt~~
- ~~To-dos: neue ohne Datum ganz oben, sonst nach Fälligkeit; in der App sortierbar (Fälligkeit, Neueste, Projekt, Titel)~~
- ~~Eigener Datums- und Zeitauswahl-Baustein (datum.js): Kalender mit KW und Schnellwahl, Uhrzeit Stunde/Minute; ersetzt Systemkalender in allen Apps~~
- ~~Handy: Auswahllisten öffnen nie mehr die Systemliste (kein Fokus nach der Wahl, Tippen auf die Beschriftung, Tastatur-Pfeile)~~
- ~~Adressen: deutliches „‹ Zurück zum Bautagebuch“, nur wenn man aus dem Bautagebuch kommt~~
- ~~AVA einfache Übersicht: LV-Karten farbig gebändert nach Stand (blau, gelb, grün, rot über Auftrag, grau)~~
- ~~Neuigkeiten: Rundgang öffnet App, Reiter (hash) und Menü (klick) selbst – über alle Apps hinweg~~
- ~~To-dos: ↗ auch bei eigenen To-dos~~
- ~~To-dos: in „Aufgaben & Mängel“ selbst kein ↗ mehr bei To-dos ohne Verknüpfung (Klick auf den Titel bearbeitet)~~
- ~~Startseite: Widget „Erinnerungen & Fristen“ (Arten wählbar, mehrfach), ＋-Menü erklärt jeden Eintrag („· zweites Projekt“), Häkchen 🖥 PC / 📱 Handy beim Anordnen, ✕ am Handy nur fürs Handy~~
- ~~Ablage/Projektordner: SMB-Anmeldung reißt nicht mehr ab, wenn zwei Anfragen gleichzeitig den Dateiserver öffnen („No username or password was specified“)~~
- ~~Bauantrag vorbereitet: Felder für Entwurfsverfasser/in in Mein Konto (Beruf, Kammer, Mitgliedsnr., bauvorlageberechtigt) und in den Büro-Einstellungen (Verantwortliche/r, Kammer, Nr., Berufshaftpflicht)~~
- ~~Projektordner prüfen: Vorher zeigt rot durchgestrichen, was verschoben, umbenannt oder aufgelöst wird; Dateien stehen direkt unter ihrem Ordner (vor den Unterordnern) und wandern sichtbar mit~~
- ~~Dokumente in jeder App ins Fenster ziehen → im Projektordner ablegen: Ordner mit allen Unterordnern (Suche), Namensvorschlag mit Kürzel bzw. Titel und Datum aus dem PDF (Baustein bp/ablegen.js, Kern bpcore/ablage.py)~~
- ~~Kommunikation: Plotaufträge erscheinen als „Plotauftrag“ (🖨) statt als Planversand~~
- ~~Kern: Datei-Ablage-Routen aus head.py nach bpcore/ablage.py (head.py war über der Grenze der Ordnungsprüfung)~~
- ~~Abnahme: gesperrt erst mit der Unterschrift von Bauherr oder Unternehmer; nur Architekt = abgeschlossen, aber änderbar; Folgen (Aufgaben, Erinnerung) nur beim ersten Abschließen~~
- ~~Startseite: App-Kachel auf eine andere ziehen reiht sie ein (die dazwischen rücken weiter) statt zu tauschen~~
- ~~Übersicht/Widgets: je Block wählbar, wie viele Einträge er zeigt (5 · 10 · 20 · alle), gemerkt~~
- ~~Stempel: Felder unter Büro-Einstellungen → Firma & Logo (Bürostempel, Prüfstempel, „Zahlbetrag siehe Anlage“), Einsetzen in der PDF-Vorschau leicht schräg~~
- ~~AVA Neues LV → Kopie eines LV: erst Projekt, dann LV wählen (zwei Auswahlknöpfe mit Suche)~~
- ~~Abnahme: Beteiligte (Ansprechpartner/Vertreter Bauherr, Bauleitung, Firma) als Vorschläge bei Teilnehmern und Unterschrift; Name klein unter der Unterschrift im PDF~~
- ~~AVA: beauftragte Aufträge und beauftragte Nachträge nur nach ausdrücklicher Bestätigung änderbar (🔒, je LV/Nachtrag freischalten)~~
- ~~Neuigkeiten: von selbst vorerst nur auf dem Testserver (Produktion: Schalter NUR_TEST_AUS in head/neu.js)~~
- ~~AVA Nachträge: Stand als Ampel – abgelehnt rot, angemeldet gelb, beauftragt grün~~
- ~~Versanddialog: Planversand, Plotauftrag, Mängel- und Terminrügen auf den gemeinsamen Dialog umgestellt (Versandart bei Rügen erst am Ende)~~
- ~~Kommunikation: bei der Abnahme steht in der Liste, wer unterschrieben hat~~
- ~~Gemeinsamer Versanddialog (BPHead.versand, Baustein versand.js) – Abnahme umgestellt~~
- ~~Markieren: beim Fertig und beim Schließen klare Frage „behalten?“, Rückmeldung; in der Planliste „📌 markiert“~~
- ~~Neuigkeiten: Rundgang und Überblick größer~~
- ~~Markieren → Einladen: Kollegen als Chips zum Antippen statt Häkchenliste, kürzerer Text~~
- ~~Unterschrift am Handy natürlicher (Strichstärke aus Tempo/Druck, weiche Kurven) und immer im Querformat – Vorschau und Abnahme, ein Baustein~~
- ~~Unterschreiben in der PDF-Vorschau (alle Apps): eigene Unterschrift vorbelegt, verschiebbar/vergrößerbar, am Handy mit dem Finger, PDF wird neu erzeugt~~
- ~~Neuigkeiten nach jedem neuen Stand: Überblick auf der Startseite, Rundgang mit Scheinwerfer in der App, einmal je Benutzer (alle Geräte); Benutzermenü „Neuigkeiten“~~
- ~~Pläne & Dateien: Dateien hereinziehen und im Projektordner ablegen – Vorschlag zuerst „hier“ (Zeile bzw. gezeigte Pläne), dann erkannt aus Dateiname/Plankopf, dann alle Ordner mit Suche~~
- ~~Startseite: Widgets unten nie angeschnitten (fester weißer Rand), Überschrift deckt beim Rollen ganz ab~~
- ~~Bautagebuch am PC: „Kontakte“ links öffnet die Adressen-App (gleiches Projekt, nur die Beteiligten); am Handy bleibt die eigene Kontaktliste~~
- ~~Bautagebuch am PC: Mitte höchstens 980 px breit und mittig, Navigation links unverändert~~
- ~~Aufgaben & Mängel → Übersicht: Fenster „⚙ Blöcke“ entfällt – Blöcke direkt am Block ausblenden (✕), über ＋ wieder holen, dort auch „Reihenfolge zurücksetzen“~~

- ~~Baukosten: Seite geteilt – baukosten.css und drei Skripte (baukosten-kern, -bauteile, -start)~~
- ~~Baukosten: Bauherren-PDF aus baukosten.py in baukosten_pdf.py ausgelagert~~
- ~~Bauzeitenplan: app.js (3.000 Zeilen) in fünf Skripte geteilt – gantt-kern, -diagramm, -befehle, -ereignisse, -start (wie AVA und Bautagebuch)~~
- ~~Zeiten: Rückgängig für „Tag bestätigen“ und für das Übernehmen einzelner Vorschläge (Zweig zeiten-rueckgaengig übernommen und geprüft)~~
- ~~Tabellen (baum.js): Tab überspringt Art und KG im LV (Option tabOhne); die aktive Zeile bleibt beim Wandern mit der Tastatur in der Mitte (rollt erst, wenn sie das mittlere Feld verlässt)~~
- ~~Startseite: Kacheln frei verschieben (Maus ziehen, am Handy lange drücken), je Benutzer gemerkt, „Startseite zurücksetzen“ – war mit dem Raster schon fertig~~
- ~~Bauzeitenplan: Vergleich auch mit einer anderen Version des Plans (Versionsleiste → „⇄ Vergleichen mit anderer Version …“)~~
- ~~Apps fürs ganze Büro abschalten (⚙ Büro-Einstellungen → Apps): verschwinden aus Kacheln, Apps-Menü und Verweisen, auch für Administratoren; direkter Aufruf zeigt eine gestaltete Sperrseite~~
- ~~AVA: Warnung vor der ersten Änderung an einem beauftragten LV (Vertragsinhalt – besser als Nachtrag), „Rückgängig“ nimmt die Änderung gleich zurück~~
- ~~Neue App „Honorar“ (nur Verwaltung): Aufträge je Projekt nach HOAI 2021 (Honorartafel § 35 mit Zwischenwerten, Zone, Satz in der Spanne, Leistungsphasen § 34, Umbauzuschlag), nach Aufwand (Viertelstunde, Stundensatz je Person oder Auftrag) oder pauschal; anrechenbare Kosten aus der Kostenermittlung (§ 33); Nebenkosten pauschal oder nach Aufwand; Abgleich mit den Zeiten und Warnung bei Überschreitung; Angebot als PDF auf dem Briefbogen~~
- ~~Bautagebuch: kleine Karte bzw. Foto oben rechts im Bericht und im PDF ersatzlos gestrichen~~
- ~~Kommunikation: ＋ bietet Mängelrüge vor/nach Abnahme und Terminrüge – öffnet denselben Dialog in „Aufgaben & Mängel“~~
- ~~Bautagebuch: PDF-Vorschau im Bereich rechts zeigt alle Seiten mit der Fotodokumentation (Baustein BPHead.pdfIn statt iframe)~~
- ~~AVA Schlussrechnung: Abnahme wird gezeigt (Datum oder rote Warnung) und beim Anlegen abgefragt – Datum eintragen oder bewusst ohne Abnahme anlegen~~
- ~~Startseite sperrbar: gesperrt (Vorgabe) kein Verschieben, Vergrößern, Ausblenden – „🔒 Anordnen“ entsperrt, je Benutzer gemerkt~~
- ~~Startseite: Hinweise in den Widgets anklickbar (Zeile → Stelle in der App, Erinnerung → Aufgaben & Mängel, Abhaken/Später auch dort); Überschriften führen in den Hauptbereich (To-dos, Übersicht, App der Hinweise)~~
- ~~Pipeline: Freigabe überschreibt nicht mehr das Test-Image desselben Commits (Testserver behält Wasserzeichen)~~
- ~~Verwaltung → Benutzer: Apps kompakt und umgebrochen (nur freigeschaltete, „alle“ wenn alle, dahinter „ohne …“) – kein waagerechter Scrollbalken~~
- ~~Verwaltung → Projekte: „Öffnen“ ohne Rückfrage in der zuletzt benutzten App (Projekt oben gewählt); Hinweis „kein Bautagebuch – anlegen?“ weg, Kärtchen nur „Bauzeitenplan“/„Baukosten“~~
- ~~Fehler behoben: PDF-Vorschau im eigenen Browserfenster (⇱) zeigte Kästchen statt Buchstaben~~
- ~~Verwaltung → Benutzer: Apps, Administrator und „Konto gesperrt“ als Knöpfe zum Antippen wie unter Einstellungen~~
- ~~Ansicht für PDFs und Fotos wie der Standard-Viewer: schmale Leiste (Handy: blendet sich beim Scrollen aus, Antippen holt sie), Zoom mit zwei Fingern, Wischen zum nächsten Plan, Punkte; PC: Seitenleiste mit Plänen, Zoom und „Ganze Seite“ oben; Markieren-Werkzeuge in einer Leiste unten, Behalten/Einladen/PDF/Löschen im Menü ⋯, „Fertig“ oben; Klick daneben schließt nicht mehr~~
- ~~Startseite: Widget „Honorarstand“ (nur Verwaltung) – je Auftrag Honorar netto, erbracht, Aufwand laut Zeiten~~
- ~~Honorar: Vorschau des Angebots rechts wie im Bautagebuch (alle Seiten, nach jeder Änderung neu)~~
- ~~Honorar am Handy: Liste der Aufträge als Karten, Auftrag mit Reitern (Übersicht, Phasen, Nebenkosten), nur ansehen – erfassen nur Nebenkosten; Summe oben anheften oder nur in der Übersicht (Stecknadel)~~
- ~~Honorar freigegeben: kommt mit v2026.11.194 in die Produktion~~
- ~~Zeiten: Urlaubsantrag – Urlaub, Frei und Fortbildung beantragen (Zeitraum, Vertretung, Notiz), Verwaltung genehmigt/lehnt ab (mit Resturlaub), erst die Genehmigung trägt die Tage ein; zurückziehen, solange nicht begonnen; To-do für die Verwaltung; abschaltbar unter Einstellungen~~
- ~~Zeiten: ruhige Tagesblöcke statt Schnipsel – je Viertelstunde zählt, woran am meisten gearbeitet wurde; Blöcke unter 30 Minuten gehen im Nachbarn auf (bevorzugt im selben Projekt); Baustelle und Fahrt bleiben genau~~
- ~~Verwaltung → Projektordner: Projektordner mit der Projektvorlage (oder einem gut sortierten Projekt) vergleichen – umbenennen, fehlende Ordner anlegen, Vorlagedateien kopieren, zusätzliche Unterordner auflösen, an die Stelle des Musters verschieben; Vorher/Nachher, erst nach Bestätigung ausführen (Testserver nur Vorschau)~~
- ~~Bautagebuch: beim Springen zu „Mangel“ rutschte die ganze Seite samt Kopf und Leiste weg – die Seite rollt jetzt nie, nur die Bereiche~~
- ~~Dateiserver nachts aufräumen: alte „_old“-Stände der Bautagebuch-Ablage gegen 2 Uhr nach Einstellung (abschaltbar, Ergebnis in den Einstellungen)~~
- ~~Apps-Menü: kleinere Eckdreiecke „in neuem Tab“~~
- ~~Bauzeitenplan: Fortschritt in der Befehlsleiste in 25er-Stufen mit kleinem Schieber~~
- ~~Bauzeitenplan: neuer Aufbau – Navigation links, Befehlsleiste, Bereich rechts mit Details und Assistent (Etappe 1)~~
- ~~Bauzeitenplan: Farben des Baukastens in Plan, Diagramm, Statuszeile und Assistent~~
- ~~Bauzeitenplan: Druckdialog kompakt, Blatt wächst beim Größerziehen, Bänderung im Druck~~
- ~~Bauzeitenplan: Schriftgröße wie in der AVA, Fenster kompakt~~
- ~~Bauzeitenplan: Spalten ein-/ausblenden und ordnen wie überall~~
- ~~Bauzeitenplan: Planschritte im gemeinsamen Rückgängig-Dock~~
- ~~Bauzeitenplan: Fortschritt mit Stufen und Schieber (Baustein bpProzent)~~
- ~~Bauzeitenplan: Zeilen-Darstellung (farbig, Bänderung, roter Strich an der aktiven Zeile)~~
- ~~Bauzeitenplan: Vergleich mit einer Version direkt im Plan (Variante C, Umordnungs-Pfeile, Reiter „Vergleich“)~~
- ~~Bauzeitenplan: doppelte Knöpfe (Assistent, Details, Ausgabe in der Navigation) entfernt, Hinweis „Verknüpft“ entfernt~~
- ~~Bauzeitenplan: Scrollbalken – nur einer, unter der Kopfzeile~~
- ~~Bauzeitenplan am Handy: Knopf zurück zur Handy-Ansicht~~
- ~~Navigation (Bauzeitenplan, AVA): Heftzwecke, nur Symbole mit ruckelfreiem Aufklappen, Griff nach oben ziehen, Navigation oben in einer Zeile~~
- ~~Darstellung: Optionen für langsame Rechner (Animationen, Unschärfe aus, Paket „Schnell“)~~
- ~~AVA: Geteilt in zehn Skripte, Details-Karte, Langtext wandert mit, Gliederung übernimmt markierte Positionen~~
- ~~AVA: GAEB-Hinweis wegklickbar, Warnzeichen über der ersten Kennzahl~~
- ~~AVA: kein Flackern beim Neuzeichnen, Kopierquelle in voller Breite~~
- ~~Alle Apps: Apps-Menü als quadratische Kacheln, Trenner-Griff nur beim Darüberfahren, Mindestbreite Bereich rechts, Einstellungen abdockbar, Spalten-Menü für alle Tabellen~~
- ~~Adressen: PDF in der gemeinsamen Ansicht, Tabelle füllt den Bereich~~
- ~~Baukosten: Vorschläge schließen, Assistent ohne Schritt „Projekt“, „Aus anderem Projekt übernehmen“~~
- ~~Kommunikation: Liste oben bündig~~
- ~~ToDo-Liste im Projekt „Büro“~~
- ~~AVA: Aufmaßprüfung, Rechnungen, Angebote – Seite rollt nicht mehr, Felder rollen in sich, unten gleichmäßiger Rand~~
- ~~Alle Apps: senkrechte Reiter des zugeklappten Bereichs rechts einheitlich kleiner~~
- ~~AVA: Rechnung – Skonto, Frist, bezahlt auf einer Höhe~~
- ~~AVA: Aufmaßprüfung – Ablagefeld für Aufmaß/Rechnung der Firma (Scan) wie in der Rechnung~~
- ~~Bautagebuch Schritt 1: Rahmen mit Navigation, Kalender, Befehlsleiste, Bereich rechts~~
- ~~AVA: Knöpfe ganz rechts in der LV-Tabelle (⊞) nicht mehr unter dem Rand~~
- ~~Aufmaß: ＋ am Ende der Eingabezeile für eine weitere Zeile (wie Umschalt+Enter), Hinweis zum Rechenweg mit Beispielen~~
- ~~Aufmaßprüfung: Aufmaßzeilen als Zwischenzeilen (Schalter „Rechenweg“), Ausdruck mit oder ohne Zwischenschritte~~
- ~~Navigation gelöst: Symbole dicht wie im Mock, Gruppen als Trennstrich, Heftzwecke rot~~
- ~~Bauzeitenplan: Fenster „Darstellung“ aufgeräumt und kompakt~~
- ~~Navigation: Symbole als farbige Kacheln; Bautagebuch gelöst mit Datums-Kachel statt Kalender – nichts springt mehr~~
- ~~AVA: Ablage-Dialog – Vorgabe ist die aktuelle Position (Bereich, LV, Firma), Texterkennung nur als Hinweis mit „Dorthin“~~
- ~~Bauzeitenplan: kein Loch mehr oben rechts über dem Scrollbalken~~
- ~~Bereich rechts klappt bei zu schmalem Fenster von selbst zu (alle Apps)~~
- ~~AVA: Stundenlohn- und Handpositionen der Rechnung – breit eine Zeile, schmal Text oben und Zahlen darunter~~
- ~~Rückgängig-Dock am Griff ⋮⋮ frei verschiebbar (nach App-Wechsel wieder unten in der Mitte)~~
- ~~Apps-Menü: Eckdreieck öffnet in neuem Tab, rechte Maustaste: Öffnen, neuer Tab, neues Fenster, Adresse kopieren~~
- ~~Kopierquelle: „Alles einklappen“~~
- ~~AVA-Tabellen: Zelle mit Inhalt beim Hineinspringen ganz markiert (Tippen überschreibt, F2 ans Ende); Aufmaß-Spalte ✕/＋ nicht mehr abgeschnitten~~
- ~~Navigation gelöst: Versionsnummer im Streifen (AVA, Bauzeitenplan), AVA-Bereiche farbig, keine Lücken durch Suche und „＋ Neu“~~
- ~~Bauzeitenplan: aktive Zeile als dünner roter Rahmen (gestrichelt) – am Bildschirm (Darstellung → Zeilen) und im Druck („Markierte Zeile hervorheben“); bleibt unter der Maus sichtbar~~
- ~~Bauzeitenplan: „Teilen“ – Link zum Ansehen ohne Anmeldung (mitlaufend mit wechselbarer Version oder fester Stand, mit/ohne Fortschritt, Ablaufdatum, zurückziehen)~~
