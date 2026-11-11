# Bauplattform – ToDo-Liste

Stand: 11.11.2026. Wird bei jedem Push aktualisiert und beim Start der Dienste als PDF in „Pläne & Dateien“ → Projekt „Büro“ → Ordner „Bauplattform“ abgelegt (Produktion; der Testserver schreibt nicht in die Ablage). Erledigtes ist durchgestrichen. Zeitangaben = geschätzte reine Arbeitszeit am Code (ohne Abstimmung, Testen auf dem Testserver und Wartezeit der Pipeline); 1 Tag = etwa 6 Stunden.

## Jetzt in Arbeit

- ~~Bautagebuch auf den Baukasten (Rahmen, neun Skripte, Baukasten statt Kopien, Drucken mehrerer Berichte) – fertig am 11.11.2026~~

## Kurzfristige Sammlung (nach dem Bautagebuch)

1. Projektordner, Etappe 2: Umordnen per Ziehen und Ablegen in der Nachher-Ansicht, Dateinamen nach Schema (nicht nur das Kürzel), Seite für andere Benutzer freischalten. **ca. 4–6 h**
2. Suchleiste in allen Apps vereinheitlichen (ein Baustein: Lupe, Treffer, vor/zurück, Strg+F, eng = nur Lupe) – erst Mock. **ca. 4 h**
3. Vergleich im Bauzeitenplan, Etappe 2: Platzhalterzeile an der alten Stelle und Pfeil direkt in der Tabelle. **ca. 5 h**
4. Alle Tabellen (baum.js), Rest: Langtext klappt beim Verlassen zu, zugeklappte Titel bleiben zu. **ca. 2–3 h**
5. Aufmaß: Menge direkt eintragen – ohne Aufmaßzeilen entsteht eine Zeile „pauschal“, mit Aufmaßzeilen eine Ausgleichszeile (Vorschlag, wartet auf Zustimmung). **ca. 2–3 h**
6. Aufmaßprüfung: erster Rechenweg direkt in der Hauptzeile der Position (weitere Zeilen als Zwischenzeilen), Mengen auch in „lt. Rechnung“ – Enter nach unten, Tab nach rechts – Mock liegt vor. **ca. 3–4 h**
7. ~~Abnahme am Handy mit Unterschrift – in der Kommunikation (＋ → Abnahme): Angaben aus dem Auftrag, Mängel mit Fotos, Erklärungen antippen, drei Unterschriften (oder „nicht anwesend“), Niederschrift + Mängelblatt + Fotos auf dem Briefbogen, Ablage „Abnahmen + Mängel“, Abnahmedatum in die AVA, Mängel als Aufgabe, Erinnerung vor Ende der Gewährleistung, Mail nur auf Knopfdruck, Nachtrag~~
   - Abnahme, Rest: Standort beim Unterschreiben, mehrere Fotos auf einmal aus der Galerie, Abnahme auch aus dem Auftrag in der AVA starten. **ca. 3–4 h**
8. ~~PDF- und Foto-Ansicht am Handy und am PC wie der Standard-Viewer~~
9. Neue App „Bauantrag“: aktuelle Antragsformulare je Bundesland (NRW: Anlagen zur VV BauPrüfVO von bauportal.nrw, neue Fassungen werden gemeldet), Assistent, Felder aus Projekt, Adressen, Kataster und Baukosten; am Ende ein bearbeitbares PDF, Änderungen darin fließen in die Datenbank zurück – erst Mock. **ca. 1,5–2 Wochen (je weiteres Bundesland ca. 2–3 Tage)**
10. Honorar: Versionen je Auftrag wie in Baukosten/AVA – „Neues Angebot“ kopiert die Version, eine Version „gilt“ (beauftragt), PDF mit Versionsnamen – wartet auf: je Auftrag oder je Projekt. **ca. 3–4 h**
11. Verträge: Architekten-/Ingenieurvertrag aus Honorar, Auftragsschreiben/Bauvertrag aus der AVA-Vergabe, auf dem Briefbogen; Ablage in einem eigenen Vertragsverzeichnis, Zugangsdaten trägt der Geschäftsführer selbst ein (nie im Browser sichtbar) – wartet auf: eigene Freigabe oder geschützter Unterordner; erst Mock. **ca. 2–3 Tage**
12. Ansicht „Einfach“ der AVA neu denken: geführter Ablauf je LV (nächster Schritt groß, nur nötige Spalten und Knöpfe) statt nur Übersichtskarten – erst Mock; gleiche Idee für Bautagebuch (Basis/Experte). **ca. 1–1,5 Tage**
13. Widget „Datei ablegen“ auf der Startseite: Kopierer-Ordner immer überwachen, Scans lesen und in die Projektdokumente ablegen – wartet auf: vorschlagen oder selbst ablegen; erst Mock. **ca. 1–1,5 Tage**

Summe Sammlung (offen): ca. 15–19 Tage.

## Offene Fragen

- Adressverzeichnis auf dem Testserver druckt nur Namen – Daten oder Fehler? **ca. 0,5 h**
- Leistungsinformationen: Fehler am Dropdown noch nicht nachgestellt. **ca. 0,5–1 h**
- Baukosten: Karte „Verknüpfung“ → „Bauzeitenplan“ ohne Projektfeld? **ca. 0,5 h**

## Umbau (Zielbild vom 09.11.2026)

- Schritt 4 – Apps auf den Baukasten, große Dateien teilen:
  - Bauzeitenplan Etappe 2: alle Pläne des Projekts im Baum, Ziehen/Ablegen, Schalter „nur geöffneten Plan“, Katalog als Reiter rechts, Kennzahlen in der Leiste, Suche in die Navigation, verstecktes Menüband entfernen, genaue Texte im Rückgängig-Dock. **ca. 2–3 Tage**
  - Planungsassistent und Vorlagen-Baukasten als gemeinsamer Baustein, danach auch in der Kostenberechnung (Start-Assistent: Maßnahme/Gebäudetyp, Eckdaten, Schritt für Schritt, eigene Vorlagen) – erst Mock. **ca. 2–3 Tage**
  - AVA: Spalten-Menü für Aufträge. **ca. 2 h**
  - Große Dateien teilen: head.js, ava.py, head.py (Bauzeitenplan, Baukosten-Seite und PDF-Teil von baukosten.py sind geteilt). **ca. 2–3 Tage**
- Schritt 5 – Kern aus dem Bautagebuch lösen: Ablage, Pläne, Fotos, Mail, Datensicherung, Bauleiter-Regel, Rechte. **ca. 1,5–2 Wochen**
- Verhaltenstests je App. **ca. 1 Tag je App, ca. 1,5 Wochen gesamt**
- Typprüfung über JSDoc. **ca. 2 Tage**

## Später

- Webplattform für Externe (Portal): Firmen, Fachplaner, Bauherr über das Internet – eigener Portal-Container, Einladung, Zwei-Faktor, Rechte je Projekt und Rolle, Protokoll. Nach Schritt 5. **ca. 3–4 Wochen**
- Projektplattform und Dokumentenmanagement: Ordner nach Vorlage, Versionen/Indizes, Freigabe-Läufe, Volltextsuche, Planlauf, Protokolle mit Fristen, Objektspeicher (MinIO). **ca. 4–6 Wochen**
- Leistungsphase 0: Raumprogramm/Flächen (DIN 18205) als Grundlage für die Kostenschätzung. **ca. 1 Woche**
- Honorar, Etappe 2: Rechnungen (Abschlag nach erbrachtem Anteil, Schlussrechnung) mit Rechnungsnummer und Zahlungseingang, Angebote in Varianten, weitere Objektarten (Innenräume, Freianlagen), Freischaltung für einzelne Benutzer. **ca. 1 Woche**
- Bauantrag digital einreichen (Bauportal.NRW bzw. Portal des Bundeslands) – nach der App „Bauantrag“. **ca. 1–2 Wochen**
- Honorar: Ansicht für Geschäftsführer (alles mit Beträgen) und Mitarbeiter (nur eigene Projekte, Stunden verbraucht/verfügbar, ohne Euro) – nur in Honorar, erst Mock. **ca. 1 Tag**
- Textprüfung. **ca. 2 Tage**
- Einrichtungsassistent. **ca. 3 Tage**
- Handy-App. **ca. 2–3 Wochen**
- Mail und Kalender. **ca. 2 Wochen**
- Redundanz (Ausfallsicherheit). **ca. 1 Woche**
- Büros bis 100 Personen (Last, Rechte, Mandanten). **ca. 1–2 Wochen**
- Spätere Umstellung (Ziel, noch nicht begonnen): TypeScript + React, FastAPI + Pydantic, App für App mit Verhaltenstests vorweg. **ca. 3–6 Monate**

## Erledigt
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
