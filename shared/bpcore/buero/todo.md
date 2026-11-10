# Bauplattform – ToDo-Liste

Stand: 10.11.2026. Wird bei jedem Push aktualisiert und beim Start der Dienste als PDF in „Pläne & Dateien“ → Projekt „Büro“ → Ordner „Bauplattform“ abgelegt (Produktion; der Testserver schreibt nicht in die Ablage). Erledigtes ist durchgestrichen. Zeitangaben = geschätzte reine Arbeitszeit am Code (ohne Abstimmung, Testen auf dem Testserver und Wartezeit der Pipeline); 1 Tag = etwa 6 Stunden.

## Jetzt in Arbeit

- Bautagebuch auf den Baukasten – GO am 10.11.2026. **gesamt ca. 2–2,5 Tage**
  - ~~Schritt 1: Rahmen – Navigation mit Kalender und Berichten des Tages, Befehlsleiste, Bereich rechts (Details, Foto, PDF-Vorschau)~~
  - ~~Schritt 2: index.html (2.250 Zeilen) in neun Skripte und bt.css geteilt wie bei der AVA~~
  - Schritt 3: eigene Kopien ersetzen – PDF-Ansicht, Fortschritt (bpProzent), Kontakte → App Adressen, Dialoge, Grundhilfen ($, api, toast) aus dem Baukasten. **ca. 4–6 h**
  - Schritt 4: Drucklayout wie im Bauzeitenplan – mehrere Berichte „von–bis“ oder mit Umschalt im Kalender wählen. **ca. 4 h**

## Kurzfristige Sammlung (nach dem Bautagebuch)

1. Rückgängig-Dock frei verschiebbar; nach einem Wechsel der App wieder am Ausgangspunkt. **ca. 1 h**
2. Suchleiste in allen Apps vereinheitlichen (ein Baustein: Lupe, Treffer, vor/zurück, Strg+F, eng = nur Lupe) – erst Mock. **ca. 4 h**
3. Apps fürs ganze Büro abschalten (Verwaltung → Apps), Querverweise auf gesperrte Apps ausblenden, gestaltete Sperrseite. **ca. 3 h**
4. Vergleich im Bauzeitenplan, Etappe 2: Platzhalterzeile an der alten Stelle und Pfeil direkt in der Tabelle (braucht geteiltes app.js). **ca. 5 h**
5. Kopierquelle (AVA): „Alles einklappen“. **ca. 0,5 h**
6. Apps-Menü: Eckdreieck in jeder Kachel öffnet in neuer Registerkarte; rechte Maustaste: Öffnen, neue Registerkarte, neues Fenster, Adresse kopieren. **ca. 1,5 h**
   6b. Kacheln durch langes Gedrückthalten neu anordnen (je Benutzer gemerkt, „Standard“ setzt zurück). **ca. 2 h**
7. Alle Tabellen (baum.js): Tab nur durch Eingabefelder (ohne Knöpfe, ohne Art und KG), Tab in die nächste Zeile, Enter zur nächsten Position, vorhandener Inhalt beim Hineinspringen zum Überschreiben markiert (F2 = ergänzen), Langtext klappt beim Verlassen zu, zugeklappte Titel bleiben zu, aktive Zeile bleibt in der Mitte. **ca. 5–6 h**
8. Aufträge aus LV/Angebot: vor dem Ändern beauftragter Positionen warnen (Vertragsinhalt – besser als Nachtrag). **ca. 1,5 h**
9. Vergleich auch zwischen Plan-Versionen (Versionswahl → „Vergleichen mit …“). **ca. 2 h**
10. Aufmaß: Menge direkt eintragen – ohne Aufmaßzeilen entsteht eine Zeile „pauschal“, mit Aufmaßzeilen eine Ausgleichszeile (Vorschlag, wartet auf Zustimmung). **ca. 2–3 h**
11. Aufmaßprüfung: erster Rechenweg direkt in der Hauptzeile der Position (weitere Zeilen als Zwischenzeilen), Mengen auch in „lt. Rechnung“ – Enter nach unten, Tab nach rechts – Mock liegt vor. **ca. 3–4 h**
12. Ansicht „Einfach“ der AVA neu denken: geführter Ablauf je LV (nächster Schritt groß, nur nötige Spalten und Knöpfe) statt nur Übersichtskarten – erst Mock; gleiche Idee für Bautagebuch (Basis/Experte). **ca. 1–1,5 Tage**

Summe Sammlung: ca. 4–5 Tage.

## Offene Fragen

- Adressverzeichnis auf dem Testserver druckt nur Namen – Daten oder Fehler? **ca. 0,5 h**
- Leistungsinformationen: Fehler am Dropdown noch nicht nachgestellt. **ca. 0,5–1 h**
- Baukosten: Karte „Verknüpfung“ → „Bauzeitenplan“ ohne Projektfeld? **ca. 0,5 h**

## Umbau (Zielbild vom 09.11.2026)

- Schritt 4 – Apps auf den Baukasten, große Dateien teilen:
  - Bauzeitenplan Etappe 2: alle Pläne des Projekts im Baum, Ziehen/Ablegen, Schalter „nur geöffneten Plan“, Katalog als Reiter rechts, Kennzahlen in der Leiste, Suche in die Navigation, app.js teilen, verstecktes Menüband entfernen, genaue Texte im Rückgängig-Dock. **ca. 2–3 Tage**
  - Planungsassistent und Vorlagen-Baukasten als gemeinsamer Baustein, danach auch in der Kostenberechnung (Start-Assistent: Maßnahme/Gebäudetyp, Eckdaten, Schritt für Schritt, eigene Vorlagen) – erst Mock. **ca. 2–3 Tage**
  - AVA: Spalten-Menü für Aufträge. **ca. 2 h**
  - Große Dateien teilen: head.js, ava.py, baukosten.py, head.py. **ca. 2–3 Tage**
- Schritt 5 – Kern aus dem Bautagebuch lösen: Ablage, Pläne, Fotos, Mail, Datensicherung, Bauleiter-Regel, Rechte. **ca. 1,5–2 Wochen**
- Verhaltenstests je App. **ca. 1 Tag je App, ca. 1,5 Wochen gesamt**
- Typprüfung über JSDoc. **ca. 2 Tage**

## Später

- Webplattform für Externe (Portal): Firmen, Fachplaner, Bauherr über das Internet – eigener Portal-Container, Einladung, Zwei-Faktor, Rechte je Projekt und Rolle, Protokoll. Nach Schritt 5. **ca. 3–4 Wochen**
- Projektplattform und Dokumentenmanagement: Ordner nach Vorlage, Versionen/Indizes, Freigabe-Läufe, Volltextsuche, Planlauf, Protokolle mit Fristen, Objektspeicher (MinIO). **ca. 4–6 Wochen**
- Leistungsphase 0: Raumprogramm/Flächen (DIN 18205) als Grundlage für die Kostenschätzung. **ca. 1 Woche**
- Zeiterfassung: Tagesblöcke und Rückgängig (Zweig zeiten-rueckgaengig). **ca. 2 Tage**
- Honorarabrechnung (HOAI). **ca. 1,5–2 Wochen**
- Textprüfung. **ca. 2 Tage**
- Einrichtungsassistent. **ca. 3 Tage**
- Nächtliches Aufräumen. **ca. 1 Tag**
- Handy-App. **ca. 2–3 Wochen**
- Mail und Kalender. **ca. 2 Wochen**
- Redundanz (Ausfallsicherheit). **ca. 1 Woche**
- Büros bis 100 Personen (Last, Rechte, Mandanten). **ca. 1–2 Wochen**
- Spätere Umstellung (Ziel, noch nicht begonnen): TypeScript + React, FastAPI + Pydantic, App für App mit Verhaltenstests vorweg. **ca. 3–6 Monate**

## Erledigt

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
