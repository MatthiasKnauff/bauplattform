# Bauplattform – ToDo-Liste

Stand: 10.11.2026. Wird bei jedem Push aktualisiert und beim Start der Dienste als PDF in „Pläne & Dateien“ → Projekt „Büro“ → Ordner „Bauplattform“ abgelegt (Produktion; der Testserver schreibt nicht in die Ablage).

## Jetzt in Arbeit

- Bautagebuch auf den Baukasten: Navigation links mit Kalender, Befehlsleiste, Bericht in der Mitte, Bereich rechts (Details, Foto, PDF). Mock liegt vor – wartet auf GO. Danach in drei Schritten: 1 Rahmen, 2 index.html teilen, 3 eigene Kopien ersetzen (PDF-Ansicht, Fortschritt, Kontakte → Adressen, Dialoge).

## Kurzfristige Sammlung (nach dem Bautagebuch)

1. Rückgängig-Dock frei verschiebbar; nach einem Wechsel der App wieder am Ausgangspunkt.
2. Suchleiste in allen Apps vereinheitlichen (ein Baustein: Lupe, Treffer, vor/zurück, Strg+F, eng = nur Lupe) – erst Mock.
3. Apps fürs ganze Büro abschalten (Verwaltung → Apps), Querverweise auf gesperrte Apps ausblenden, gestaltete Sperrseite.
4. Vergleich im Bauzeitenplan, Etappe 2: Platzhalterzeile an der alten Stelle und Pfeil direkt in der Tabelle (braucht geteiltes app.js).
5. Kopierquelle (AVA): „Alles einklappen“.
6. Apps-Menü: Eckdreieck in jeder Kachel öffnet in neuer Registerkarte; rechte Maustaste: Öffnen, neue Registerkarte, neues Fenster, Adresse kopieren.
   6b. Kacheln durch langes Gedrückthalten neu anordnen (je Benutzer gemerkt, „Standard“ setzt zurück).
7. Alle Tabellen (baum.js): Tab nur durch Eingabefelder (ohne Knöpfe, ohne Art und KG), Langtext klappt beim Verlassen der Zeile zu, zugeklappte Titel bleiben zu, aktive Zeile bleibt in der Mitte.
8. Aufträge aus LV/Angebot: vor dem Ändern beauftragter Positionen warnen (Vertragsinhalt – besser als Nachtrag).
9. Vergleich auch zwischen Plan-Versionen (Versionswahl → „Vergleichen mit …“).

## Offene Fragen

- Adressverzeichnis auf dem Testserver druckt nur Namen – Daten oder Fehler?
- Leistungsinformationen: Fehler am Dropdown noch nicht nachgestellt.
- Baukosten: Karte „Verknüpfung“ → „Bauzeitenplan“ ohne Projektfeld?

## Umbau (Zielbild vom 09.11.2026)

- Schritt 4 – Apps auf den Baukasten, große Dateien teilen:
  - Bauzeitenplan Etappe 2: alle Pläne des Projekts im Baum, Ziehen/Ablegen, Schalter „nur geöffneten Plan“, Katalog als Reiter rechts, Kennzahlen in der Leiste, Suche in die Navigation, app.js teilen, verstecktes Menüband entfernen, genaue Texte im Rückgängig-Dock.
  - Planungsassistent und Vorlagen-Baukasten als gemeinsamer Baustein, danach auch in der Kostenberechnung (Start-Assistent: Maßnahme/Gebäudetyp, Eckdaten, Schritt für Schritt, eigene Vorlagen) – erst Mock.
  - AVA: Spalten-Menü für Aufträge.
  - Große Dateien teilen: head.js, ava.py, baukosten.py, head.py, Bautagebuch.
- Schritt 5 – Kern aus dem Bautagebuch lösen: Ablage, Pläne, Fotos, Mail, Datensicherung, Bauleiter-Regel, Rechte.
- Verhaltenstests je App; Typprüfung über JSDoc.

## Später

- Webplattform für Externe (Portal): Firmen, Fachplaner, Bauherr über das Internet – eigener Portal-Container, Einladung, Zwei-Faktor, Rechte je Projekt und Rolle, Protokoll. Nach Schritt 5.
- Projektplattform und Dokumentenmanagement: Ordner nach Vorlage, Versionen/Indizes, Freigabe-Läufe, Volltextsuche, Planlauf, Protokolle mit Fristen, Objektspeicher (MinIO).
- Leistungsphase 0: Raumprogramm/Flächen (DIN 18205) als Grundlage für die Kostenschätzung.
- Zeiterfassung: Tagesblöcke und Rückgängig (Zweig zeiten-rueckgaengig).
- Honorarabrechnung, Textprüfung, Einrichtungsassistent, nächtliches Aufräumen, Handy-App, Mail und Kalender, Redundanz, Büros bis 100 Personen.
- Spätere Umstellung (beschlossen als Ziel, noch nicht begonnen): TypeScript + React, FastAPI + Pydantic, App für App mit Verhaltenstests vorweg.

## Zuletzt erledigt (10.11.2026)

- Bauzeitenplan: neuer Aufbau (Navigation, Befehlsleiste, Bereich rechts), Baukasten-Farben, Druckdialog kompakt, Spalten-Menü, Rückgängig-Dock, Fortschritt mit Schieber, Zeilen-Darstellung (Bänderung/roter Strich, auch im Druck), Vergleich mit Version direkt im Plan, Handy-Ansicht wieder erreichbar.
- Navigation in Bauzeitenplan und AVA: Heftzwecke, nur Symbole mit ruckelfreiem Aufklappen, nach oben ziehen; Optionen für langsame Rechner.
- AVA: GAEB-Hinweis wegklickbar (Warnzeichen über der ersten Kennzahl), kein Flackern beim Neuzeichnen, Kopierquelle volle Breite.
- Alle Apps: Apps-Menü als Kacheln, Trenner-Griff nur bei Bedarf, Mindestbreite Bereich rechts, Scrollbalken bereinigt.
