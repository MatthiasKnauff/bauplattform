# Bauplattform – ToDo-Liste

Stand: 14.11.2026. Wird bei jedem Push aktualisiert und beim Start der Dienste als PDF in „Pläne & Dateien“ → Projekt „Büro“ → Ordner „Bauplattform“ abgelegt (Produktion; der Testserver schreibt nicht in die Ablage). Erledigtes ist durchgestrichen. Zeitangaben = wie lange Claude bis zum Push braucht (Bauen und eigener Test), ohne Abstimmungsrunden, euer Testen auf dem Testserver und die Pipeline (ca. 10 Minuten). Seit 11.11.2026 so gerechnet – vorher standen hier Arbeitszeiten eines Entwicklers, etwa zehn- bis zwanzigmal so lang.

## Wartet auf dich
Rot = deine Entscheidung fehlt. Grün (✓) = entschieden, wird gebaut.
- **Zeiten: Vorschläge einfrieren** – einmal gezeigte Vorschläge bleiben stehen, nur neue Arbeit bringt neue (mit „neu“) – einverstanden? (Entwurf „Zeiten: Strahl und Vorschläge“)
- **Zeiten: nach Feierabend** – a) im Strahl grau, in der Liste zugeklappte Gruppe „Nach Gehen“, b) ganz ausblenden, bis „Gehen“ später gesetzt wird?
- **Aufgaben & Post: Offen und Verschickt auf einer Seite** – damit beim Wechsel nichts neu lädt; größerer Umbau, Entwurf vorher? **ca. 1 h**
- **Mängel-Filter nach unten** – Filter-Chips unten in die Navigation, damit sie nicht springen?
- **AVA-Akte im Projektordner** – jeder abgeschlossene Schritt legt sein PDF selbst ab (Preisspiegel, Auftrag, Nachtrag, Freigabepaket, Aufmaß, Kostenkontrolle); Entwurf zeigen? **ca. 45–60 min**
- **Freigabepaket: Unterschrift** – alle vorhandenen Wege (gespeicherte, gezeichnet, Foto, andere Person) – so gemeint?
- **KI-Kennung mit einem #** – bauherr#… statt bauherr##… – passt?
- **Beispielanfrage in die Verfahrensbeschreibung** – Diktat-Anfrage mit Antwort und Zuordnungstabelle übernehmen?
- **„Mitarbeiter“ und „Personal“ als eine App?** – der Entwurf „Mitarbeiter“ (Stammdaten, Rolle, Vorgesetzte:r, Soll/Urlaub, Abwesenheitskalender) und die neue Personalakte zusammen in „Personal“? **ca. 1–1,5 h**
- **App-Einstellungen aufräumen** – Adressen, Bauantrag, Wärmeschutz ohne eigene App-Seite, Zeiten-Einstellungen in die Verwaltung, To-dos und Kataloge nur einmal (Entwurf gezeigt) **ca. 2 h**
- **Wiki: KI beim Sammeln an/aus** – Ollama oder Anbieter, „automatisch montags“ abschaltbar (Entwurf gezeigt) **ca. 1 h**
- **Rest aus Entwürfen** – Summen „Auftrag · aufgelaufen · diese Rechnung“ in der Befehlsleiste der Aufmaßprüfung; Telefonnotizen der Bieter:innen im Preisspiegel-Tooltip und im Druck „Firmenliste“ **ca. 30 min**
- **Dritter Server (Docker 3) als zweiter Testserver** – jeden Push wie Docker 1 (Stack aus server/test.yml, nichts zu ändern) oder eigener stabiler Stand (server/test3.yml + Pipeline)? **ca. 10 min**
- **HOAI-Prüfung, zweiter Teil** – Entwurf gewünscht? (Verbraucher-Schalter mit § 7 Abs. 2 HOAI, § 650r BGB, Widerruf; Bausubstanz; TA selbst geplant; Leistungszeitraum; Innenräume)
- **Leistungsinformationen: Fehler am Dropdown** – noch nicht nachgestellt; wo genau tritt er auf (Bild/Video)? **ca. 10 min**
- **Baukosten: Karte „Verknüpfung“ → „Bauzeitenplan“ ohne Projektfeld?** **ca. 5–10 min**
- ✓ **DSGVO: KI anonymisieren** (14.11.) – Art#Nummer, Ollama im Büro im Klartext, Bilder mit Rückfrage, Protokoll mit einstellbarer Aufbewahrung und Export (Text/XML), Recht „Datenschutz“ – in Arbeit **ca. 1 h**
- ✓ **Einwilligung beim Anlegen und App „Personal“** (14.11.) – Personalakte als neue App, Dateien unter „Büro/Personal/Name“, Recht „Personal“ für die Geschäftsführung, Einwilligungstext als Vorlage (prüfen lassen) **ca. 45 min**
- ✓ **Verfahrensbeschreibung Anonymisierung** (14.11.) – als Dokument zum Vorzeigen **ca. 20 min**
- ✓ **Honorar: Überschlag mit Akquise oder Projekt verknüpfen** (14.11.) – mit Vorschlägen beim Tippen, auch nachträglich am PC **ca. 30 min**
- ✓ **Basic: Rechnungsfreigabe** (GO 14.11.) – Rechnung hineinziehen → Betrag bestätigen → Freigeben **ca. 40 min**
- ✓ **Auftrag entziehen (§ 8 Abs. 3 VOB/B)** (GO) – eigener Ablauf im Register, PDF ausfüllen, mittendrin anders entscheiden, drucken **ca. 1,5 h**
- ✓ **Planwahl-Filter im LV-Versand** (GO) – wie gezeigt und mit Schalter **ca. 30 min**

## Jetzt in Arbeit
- Aufgaben, Erinnerungen, Post: jede Sache nur einmal (Wunsch 14.11. – „Zirkelbezüge“ auf der Startseite)
  - ~~Startseite (erledigt 14.11.): Regel mit eigenem Widget steht nicht zusätzlich in „Erinnerungen & Fristen“; kein zweites Widget von selbst; Erinnerung/Mangel mit Frist dort nur einmal; Platz eines Hinweis-Widgets geht nicht mehr verloren, wenn es gerade keine Hinweise hat; Test `tools/tests/ui/startseite.mjs`~~
  - ~~Ursachen (GO 14.11., erledigt): Vorschlag zu einer Mail wird ein To-do statt einer Erinnerung, alte Doppel (Erinnerung + To-do zur selben Mail) entfallen von selbst; Mails mit To-do in der Post ausgeblendet; zwei Zahlen (rot fällig, grau offen); Sammelzeile ab 4 gleichartigen Hinweisen; Erinnerungen aus dem Bauzeitenplan stehen beim Einsatz, Vorab-Erinnerung als Glocke, läuft nicht selbst ab, nach Beginn von selbst erledigt; Hinweis entfällt, sobald Mail/Termin raus ist~~
  - offen: Mangel mit Frist steht weiter als Mangel und unter Erinnerungen (in der App zwei Ansichten derselben Sache) **ca. 30 min**; Hinweise „Vergabe vor Baubeginn“ und „Vorgang ohne Firma“ als Marken am Termin statt als eigene Zeilen **ca. 45 min**; am Testserver mit echten Mails, Plänen und Erinnerungen gegenprüfen
- Suche in der Kopfleiste (Strg+K), Rest: Inhalte von Bautagebuch (Berichte, Mängel) und Pläne & Dateien anmelden **je ca. 15 min**; Strg+F „auf der Seite suchen“ auch in langen Listen mit Ausschnitt (LV, Preisspiegel) **ca. 45 min**
- AVA einheitlich wie das LV (GO 13.11.): ein Baustein für LV, Angebote (Bieter:innen als Spalten), Aufträge, Aufmaßprüfung; Knöpfe beim Darüberfahren, rotes Dreieck = Langtext; Etappe 1 (Knöpfe, Dreieck), Angebote und Aufträge erledigt 13.11.; offen: Felder nur in der markierten Zeile (Aufträge), Zeilenmodus der Tastatur im Preisspiegel **ca. 45 min**
  - Vorgabe Geschwindigkeit (13.11., gemessen an 2.000 Zeilen, siehe CLAUDE.md „Große Tabellen“ und `tools/tests/ui/lvgross.mjs`): Aufträge und Angebote bauen ihre Zeilen wie das LV – eine Funktion je Zeile, die den Stand von jetzt liefert, Spalten gleich in der gewählten Reihenfolge (kein Umsortieren nach dem Zeichnen, `auSpaltenAnwenden` entfällt) – und geben sie über `bpBaum.fenster.html(…)` aus; bei Änderungen nur die Zeilen tauschen (wie `lvNeu()`), nicht `render()`; Zeilen per Nummer erst holen (`bpBaum.fenster.zeige`); kein `body:has`/`tr…:has`. Danach Aufträge und Angebote in `lvgross.mjs` mit Zeitgrenzen aufnehmen.
  - ~~Aufträge im LV-Format (erledigt 13.11.): Spalten Bezeichnung · Menge · EH · Art · KG · EP Auftrag · GP · Prognose · abgerechnet; Firma, Stand und Nachtrag in der Bezeichnung; „Nachtrag Gesamt“ und „Bedarfsposition“ entfallen (Bedarf = Art E); Art-Symbole wie im LV; Zeilen als Funktionen über `bpBaum.fenster`, Spalten gleich in der gewählten Reihenfolge (`auSpaltenAnwenden` entfällt); in `lvgross.mjs` mit Zeitgrenze~~
  - ~~Angebote im LV-Format (erledigt 13.11.): Preisspiegel als Baumtabelle – Projekt, LVs als Ordner, Titel auf-/zuklappbar mit Summe je Bieter:in, Art-Symbole; Baum links entfällt, rechts Besprechung und Vergabe; Preise eintragen tauscht nur Zeilen und Fuß (`psNeu`); in `lvgross.mjs` mit Zeitgrenze~~
- Antworten 13.11.: Honorar-Rechner hinter Knopf (F2), Suchfeld übrige Listen (F3: Termine, Erinnerungen, Pläne fertig; Verschickt, Ausschreibung, Baudaten suchen auf dem Server – dort braucht der Filter Vorschläge vom Server, je ca. 30–45 min), To-dos „nur für mich“ (F4), ~~Bauantrag einreichen (F5)~~, Rechenweg Hauptzeile (F9), ~~Auszahlungsbetrag (F10)~~, ~~Zuschlagsposition (F11)~~, Aufmaß Menge direkt mit Rückfrage Ausgleich/ersetzen in Aufmaß und Prüfung (F8), AVA Einfach geführt + danach Bautagebuch (F12), Ablaufleiste Mängel und weitere (F13), papierlos: Übernahme per Klick, Erinnern auf Knopfdruck, Kachel für alle mit AVA (F14) **zusammen ca. 7–8 h**
- „Sahne“ suchen und an der Ursache beheben (ganzer Code): 183 zeitverzögerte Korrekturen (setTimeout mit Wartezeit), 305 × !important, 175 verschluckte Fehler („catch { egal }“), 20 Abfrage-Schleifen (setInterval) – je Stelle prüfen, ob sie ein Symptom überdeckt; behoben: Spaltenschnitt der Tabellen (lief 0,12 s zu spät), Doppelklick-Umbenennen (fragte alle 0,12 s nach statt auf das Öffnen zu warten), „Erkannte übernehmen“ (klickte nach 0,3 s den Knopf statt die Funktion aufzurufen), Aufmaß-Sperre (feste 0,8 s statt bis gespeichert); Fokus nach dem Neuzeichnen der AVA (jetzt synchron, 20 Krücken mit 30 ms entfernt), Fokus mit Wartezeit in Bautagebuch, Aufgaben, Bauantrag (am Handy öffnet sich die Tastatur jetzt sofort); nächste Etappe: übrige setTimeout-Verzögerungen (Bauzeitenplan, Baukosten) **ca. 1,5 h, in Etappen**
- Angebote/Rechnungen papierlos: eingehende Angebote und Rechnungen per Mail **und Scan** automatisch zum LV/Auftrag mit Beleg und Auslese; Prüffristen einstellbar (Vorgabe VOB/B); Kachel „Ausschreibungen“ (Bieter erinnern und Nachversand: erledigt 13.11.) **ca. 1,5 h**
- Zuschlagsposition von Hand anlegen (im LV: bezuschlagte Positionen oder ganze Titel wählen) – aus GAEB geht es schon **ca. 45 min**
- Blockvorlagen für die übrigen Ausdrucke (Prüfblatt, Angebotsabgabe, Listen in Briefen/Rügen; Preisspiegel hat Spalten je Bieter – eigene Lösung) – je Ausdruck **ca. 30–45 Min.**


- Suchfeld mit Filtern in den übrigen Listen: Verschickt (Server-Suche umstellen), Termine, Erinnerungen, Pläne, Ausschreibung, Baudaten **je App ca. 15 min**


- ~~Bautagebuch auf den Baukasten (Rahmen, neun Skripte, Baukasten statt Kopien, Drucken mehrerer Berichte) – fertig am 11.11.2026~~

## Kurzfristige Sammlung (nach dem Bautagebuch)

- Geschwindigkeit, Rest: Ziehen einer Zeile über weite Strecken im großen LV am Testserver prüfen; Angebote und Aufträge mit echten Daten am Testserver gegenprüfen (bisher nur nachgebildete Server-Antworten) **ca. 30 min**

- Wiki, Rest: Hinweise auch in Baukosten; Warnung auch beim Eintragen von Mängeln im Bautagebuch; in der Verwaltung je App ein-/ausschaltbar **ca. 30 min**
- Testpaket fürs Wochenende: GAEB-Dateien, Scans, Beispiele und Testplan (sieben Abläufe) – im Textchat zusammenstellen

- Lange Namen links auf Initialien kürzen, mit Textfeld nachfragen **ca. 20 min**
- Oberflächentest „Rollposition bleibt nach Klick/Neuzeichnen“ ins Repo (tools/tests/ui) **ca. 30 min**

- Bauantrag: Pläne & Anlagen je Punkt als eigene Seite (wie die Vordrucke): Dateien aus Planliste/Projektordner verknüpfen (nur Verweis, keine Kopie in der Datenbank), „liegt als Plot bei“ – Mock **ca. 1–1,5 h**
- Bestehende PDFs aus der Datenbank einmalig in den Projektordner verschieben (Bauantrag-Unterlagen, Vergabe, Fachplaner; danach nur Verweis) – Knopf in der Verwaltung **ca. 30 min**
- head.js teilen: Viewer (Fotos/PDF, ~500 Zeilen) erst beim Öffnen laden, Hilfe/Konto in eigene Dateien **ca. 30–45 min**
- Sekretariat: Eingang nur/immer an die Rolle (mit der Rollenverwaltung), 📥-Zähler in der Kopfleiste, To-do nach 1 Werktag, Projekt aus OCR vorschlagen – Mock gezeigt **ca. 1 h**
- Bauantrag: Statistik-Assistent mit Auswahlbaum wie das Original im Netz – wartet auf die „Erläuterungen“-PDF, dann Mock **ca. 1,5 h**


- Honorar: Fremdleistungen Stufe 2 – Eingangsrechnungen aus dem Posteingang zuordnen, To-do „Rechnung 7 Tage ungeprüft“ / „freigegeben, nicht weiterberechnet“, pauschale Weiterberechnung, Rechnungen der Fachplaner als Anlage an unsere **ca. 45 min** · Teilleistungstabelle zum Abhaken, LPh 8 nach Bauzeit – zurückgestellt
- Leistungskatalog (Bauzeitenplan): Zurücksetzen einheitlich – drei Ebenen Standard → Büro-Vorgabe → Projekt, Abweichungen gelb mit ↺, ein „↺ Zurücksetzen …“ je Reiter mit Vorschau – Mock gezeigt **ca. 1 h**
- Wärmeschutz: Abgleich mit dem Allplan-Bauteilkatalog (Schichtaufbauten aus Allplan übernehmen, Materialnamen zuordnen) – Mock folgt **ca. 1–1,5 h**
- Wärmeschutz Etappe ② Nachweis als PDF (Briefbogen, Unterschrift, Projektordner) und Übergabe an den Bauantrag **ca. 1 h** · ④ Hitzeschutz-Reiter, Wärmebrücken-Hinweise **ca. 1 h**

- Verwaltung mit Registern – Schritt 2: Einstellungen der Apps als Bürovorgabe (Schild Büro/persönlich/Projekt), ⚙ in der App zeigt Bürovorgaben zum Ansehen, Register je Rolle freigeben **ca. 1,5 h**
- Einrichtungsassistent beim ersten Start mit Ablaufleiste (Büro → Standort → Ablage → Mail → Mitarbeiter → Apps). **ca. 1–1,5 h**

- Ablaufleisten in den übrigen Apps, eine Stelle nach der anderen (Vorschläge als Mock): Mängel, Pläne (Planlauf), Bautagebuch (Bericht), Zeiten (Urlaubsantrag), Kommunikation (Schreiben). **je ca. 20–45 min**

- Baukosten, Stufenleiste Schritt 2: Stände je Stufe festschreiben (Betrag, Datum), Abweichung zur Vorstufe, Vergleich, Kostenverfolgung als PDF. **ca. 1–1,5 h**

- Rollen & Rechte, Rest: weitere Rechte, sobald Apps sie prüfen (Honorar & Verträge, Rechnungen, Zeiten aller, Abwesenheitsgrund, Projekt anlegen/löschen, Server & Sicherung getrennt von „Verwaltung“), „Ansehen als …“ **ca. 1 h**
- Hilfetexte für die übrigen Apps (Aufbau, häufige Aufgaben, Handy-Ansicht) – Bauantrag und „In allen Apps“ sind da. **je ca. 10–15 min, zusammen ca. 3 h**
- Bauantrag Versionen Stufe 2: Abweichung je Feld zum Ursprung („wie im Ursprung“/„geändert“), Bauvorlagen unverändert/geändert/neu, ins Paket nur Geändertes. **ca. 45 min**
- Bauantrag: „n offen“ anklickbar (springt ins erste leere Pflichtfeld), Zähler je Karte, deutlicher Hinweis „fehlt“ mit Weg zur Quelle; Pflichtfelder mit dem NRW-Formular abgleichen (z. B. Kammer). **ca. 35 min**
- Neue App „Mitarbeiter“: Stammdaten, Rolle, Vorgesetzter, Soll/Urlaub, Abwesenheitskalender, Fristen – Mock gezeigt, wartet auf GO. **ca. 1–1,5 h**
- Urlaubsantrag in „Zeiten“ mit Popup und Inline-Freigabe/Ablehnung (mit Begründung) bei der Geschäftsführung – Mock gezeigt, wartet auf GO. **ca. 1 h**
- Honorar nach HOAI-Prüfung (Mock folgt): Schalter „Verbraucher“ mit Hinweis § 7 Abs. 2 HOAI im Angebot, Belehrung § 650r BGB und Widerrufsbelehrung im Vertrag; mitzuverarbeitende Bausubstanz (§ 4 Abs. 3); § 33 Abs. 2 nur für nicht selbst geplante TA; Leistungszeitraum auf der Rechnung; Objektart Innenräume. **ca. 1,5–2 h**

- Honorar: „＋ Anfrage“ aus einer Mail im Posteingang der Startseite, Widget „Honorar offen“. **ca. 20–30 min**
- Bautagebuch: Tagesbericht direkt in der PDF-Vorschau bearbeiten (Klick ins Feld → bearbeiten, wie in der Seite). **ca. 45–60 min**
- Bauantrag: Änderungen im ausgefüllten amtlichen PDF zurück in die Datenbank; falls ein Vordruck keine Formularfelder hat: Felder einmal per Klick platzieren. **ca. 45–60 min**
- Bauantrag: Lageplan-/Liegenschaftskarte aus ALKIS anfordern, Gebühr schätzen, Bauvorlagen direkt aus dem Projektordner beilegen. **ca. 30–45 min**
1. Projektordner, Etappe 2: Umordnen per Ziehen und Ablegen in der Nachher-Ansicht, Dateinamen nach Schema (nicht nur das Kürzel), Seite für andere Benutzer freischalten. **ca. 30–45 min**
2. Suchleiste (Inhalte + Funktionen + Menüs, kombiniert – ca. 1–1,5 h) in allen Apps vereinheitlichen (ein Baustein: Lupe, Treffer, vor/zurück, Strg+F, eng = nur Lupe) – erst Mock. **ca. 20–30 min**
3. Vergleich im Bauzeitenplan, Etappe 2: Platzhalterzeile an der alten Stelle und Pfeil direkt in der Tabelle. **ca. 30 min**
4. Alle Tabellen (baum.js), Rest: Langtext klappt beim Verlassen zu, zugeklappte Titel bleiben zu. **ca. 15–20 min**
5. Aufmaß: Menge direkt eintragen – ohne Aufmaßzeilen entsteht eine Zeile „pauschal“, mit Aufmaßzeilen eine Ausgleichszeile (Vorschlag, wartet auf Zustimmung). **ca. 15–20 min**
6. ~~Aufmaßprüfung: erster Rechenweg direkt in der Hauptzeile der Position (weitere Zeilen als Zwischenzeilen) – 13.11.2026~~ · Rest: Mengen auch in „lt. Rechnung“ **ca. 15 min**
7. ~~Abnahme am Handy mit Unterschrift – in der Kommunikation (＋ → Abnahme): Angaben aus dem Auftrag, Mängel mit Fotos, Erklärungen antippen, drei Unterschriften (oder „nicht anwesend“), Niederschrift + Mängelblatt + Fotos auf dem Briefbogen, Ablage „Abnahmen + Mängel“, Abnahmedatum in die AVA, Mängel als Aufgabe, Erinnerung vor Ende der Gewährleistung, Mail nur auf Knopfdruck, Nachtrag~~
   - Abnahme, Rest: Standort beim Unterschreiben, mehrere Fotos auf einmal aus der Galerie, Abnahme auch aus dem Auftrag in der AVA starten. **ca. 20–30 min**
8. ~~PDF- und Foto-Ansicht am Handy und am PC wie der Standard-Viewer~~
9. Neue App „Bauantrag“: aktuelle Antragsformulare je Bundesland (NRW: Anlagen zur VV BauPrüfVO von bauportal.nrw, neue Fassungen werden gemeldet), Assistent, Felder aus Projekt, Adressen, Kataster und Baukosten; am Ende ein bearbeitbares PDF, Änderungen darin fließen in die Datenbank zurück – erst Mock. **ca. 4–6 h in mehreren Runden (je weiteres Bundesland ca. 1 h); die amtlichen Formular-PDFs müsst ihr einmal hochladen – von hier aus kann ich sie nicht herunterladen**
10. ~~Honorar: Versionen – je Auftrag oder je Projekt, jederzeit umstellbar; speichern, laden, „gilt“, PDF mit Versionsnamen~~
11. Verträge: Architekten-/Ingenieurvertrag aus Honorar, (Auftragsschreiben/Bauvertrag aus der AVA-Vergabe ist fertig, 12.11.), auf dem Briefbogen; Ablage in einem eigenen Vertragsverzeichnis, Zugangsdaten trägt der Geschäftsführer selbst ein (nie im Browser sichtbar) – wartet auf: eigene Freigabe oder geschützter Unterordner; erst Mock. **ca. 2–3 h**
12. Ansicht „Einfach“ der AVA neu denken: geführter Ablauf je LV (nächster Schritt groß, nur nötige Spalten und Knöpfe) statt nur Übersichtskarten – erst Mock; gleiche Idee für Bautagebuch (Basis/Experte). **ca. 1–1,5 h**
16. Stempel auf Nachfrage an den passenden Stellen anbieten (Rechnungsprüfung → Prüfstempel/„Zahlbetrag siehe Anlage“, Abnahme/Schreiben → Bürostempel) – sobald die Stempel hochgeladen sind. **ca. 20–30 min**
14. Unterschreiben – Rest: unterschriebenes PDF direkt in Versand/Ablage der App übernehmen, Eintrag im Verlauf (Unterschrift des GF „i. V.“: nein, entschieden 11.11.). **ca. 20 min**
13. Widget „Datei ablegen“ auf der Startseite: Kopierer-Ordner überwachen, Scans per Texterkennung (OCR, beim Hereinziehen schon eingebaut) lesen und den Ablageort nur vorschlagen – abgelegt wird erst nach Bestätigung (entschieden 11.11.). **ca. 1 h**

Summe Sammlung (offen): ca. 12–16 h.

## Umbau (Zielbild vom 09.11.2026)

- Ablage ähnliche Ordner, Etappe 2: auch beim automatischen Ablegen (Tagesbericht, Rügen, Abnahme, Pläne) fragen; am Handy/im Hintergrund ohne Frage ablegen und am PC als To-do „Ablage klären“; Ausnahmen-Liste (Ordner, die nie angefasst werden); Knopf „Ganzen Projektordner aufräumen“. **ca. 45–60 min**

- Aus dem Umbau-Mock gewählt: Hintergrund-Warteschlange für lange Aufgaben **ca. 1–2 h**, Volltextsuche über alles **ca. 1–2 h**, Typprüfung über JSDoc **ca. 2 h**; später: Überwachung (Dienste, Speicher, Sicherung) **ca. 1 h**. Live-Aktualisierung für AVA und Baukosten nachziehen **ca. 30 min**

- Schritt 4 – Apps auf den Baukasten, große Dateien teilen:
  - Bauzeitenplan Etappe 2: alle Pläne des Projekts im Baum, Ziehen/Ablegen, Schalter „nur geöffneten Plan“, Katalog als Reiter rechts, Kennzahlen in der Leiste, Suche in die Navigation, verstecktes Menüband entfernen, genaue Texte im Rückgängig-Dock. **ca. 2–3 h**
  - Planungsassistent und Vorlagen-Baukasten als gemeinsamer Baustein, danach auch in der Kostenberechnung (Start-Assistent: Maßnahme/Gebäudetyp, Eckdaten, Schritt für Schritt, eigene Vorlagen) – erst Mock. **ca. 2–3 h**
  - Große Dateien teilen: head.js, ava.py, head.py (Bauzeitenplan, Baukosten-Seite und PDF-Teil von baukosten.py sind geteilt). **ca. 2–3 h**
- Schritt 5 – Kern aus dem Bautagebuch lösen: Ablage, Pläne, Fotos, Mail, Datensicherung, Bauleiter-Regel, Rechte. **ca. 1 Tag in mehreren Runden**
- Verhaltenstests je App. **ca. 1 h je App, ca. 1 Tag gesamt**
- Typprüfung über JSDoc. **ca. 2 h**

- Messung im Browser: Lade- und Aufbauzeit je App in die Langsam-Liste der Verwaltung (angeboten 12.11.) **ca. 20 min**



- Ablauf bis zum Schluss: Schritt „Schluss“ in der Ausschreibung; Kostenkontrolle als Schritt der Baukosten-Leiste (Soll aus Baukosten, Ist aus der Ausschreibung), in der Ausschreibung nur Verweis – Vorschlag gemacht, Antwort offen **ca. 1–1,5 h**
- Repo privat + eigener Runner: vorbereitet (server/runner.yml, Variable RUNNER) – Schritte in GitHub/Portainer macht der Inhaber

- Browser-Auswahllisten (datalist) in Adressen, Pläne, Türliste, Leistungsbereiche auf den Vorschlag-Baustein umstellen **ca. 30 min**

- Bauantrag: Änderung/Ergänzung per Versand-Dialog an die Bauaufsicht schicken (Anschreiben mit Aktenzeichen ist da) **ca. 15 min**

- Zeiten: Rahmen um mehrere Blöcke (markieren, gemeinsam ändern/übernehmen/zusammenfassen/löschen) – Rückfrage gestellt **ca. 45 min**

## Später
- Kanban-Board für To-dos (wie Nextcloud Deck) – „im Moment nicht“ (14.11.2026)
- Aufgaben & Post auch im Code zu einer App zusammenlegen (ein Container statt zwei; Kommunikation als Teil der App Aufgaben, Rechte und Verweise umstellen) **ca. 1,5 h**
- Honorar: Schnellrechner mit Speichern zur späteren Übernahme (＋ wie im Bautagebuch) – Mock folgt **ca. 1 h**
- Mitarbeiter: Fristen je Person (Ersthelfer, Unterweisung) mit Erinnerung **ca. 45 min**
- Urlaubsfenster: Termine der Person in der Zeit (Bauzeitenplan, Abnahmen, Bauantrag-Abgaben) anzeigen; Warnung beim Beantragen **ca. 30 min**

- Layouteditor: Register „Texte“ – feste Formulierungen je Ausdruck (Honorar, Bauantrag, Rügen, Ausschreibung) selbst fassen, mit Vorgabe, Platzhaltern, Versionen; Hinweis bei geänderter Vorgabe – zurückgestellt bis zur generellen Überarbeitung des Layouteditors (Mock gezeigt). **ca. 1,5 h + je Ausdruck 15–30 min**
- Eigene Installation je Büro (beschlossen 12.11.): Update-Weg für viele Installationen (nur freigegebene Versionen holen, z. B. Portainer-Webhook) **ca. 30 min**
- Bauantrag: Anlagenstempel auf jedem Blatt („Anlage 2.1 zum Bauantrag vom …“, freies Feld für den Prüfvermerk) **ca. 20 min** · Nachreichung als eigenes kleines Paket **ca. 30 min**
- Bauantrag digital an die Behörde (FIT-Connect, vorgemerkt 11.11.2026): Vorbereitung – Antragsdaten und Anlagenliste als strukturierte Datei (XBau-nah), Zustell-ID der Bauaufsicht in den Adressen **ca. 45 min**; Senden erst nach Zulassung durch die FITKO
- FreePBX (vorgemerkt 11.11.2026; vorher Version, Telefone und Netz klären): Name auf dem Telefon-Display aus den Adressen (CallerID Lookup Source, nur Büronetz, mit Schlüssel) **ca. 20 min** · Anrufjournal – Gespräche beim Kontakt und Projekt in „Kommunikation“, mit Notiz **ca. 45–60 min** · Telefonate als Vorschläge in den Zeiten (Quelle Telefon) **ca. 30 min**

- Webplattform für Externe (Portal): Firmen, Fachplaner, Bauherr über das Internet – eigener Portal-Container, Einladung, Zwei-Faktor, Rechte je Projekt und Rolle, Protokoll. Nach Schritt 5. **ca. 2–3 Tage**
- Projektplattform und Dokumentenmanagement: Ordner nach Vorlage, Versionen/Indizes, Freigabe-Läufe, Volltextsuche, Planlauf, Protokolle mit Fristen, Objektspeicher (MinIO). **ca. 3–5 Tage**
- Leistungsphase 0: Raumprogramm/Flächen (DIN 18205) als Grundlage für die Kostenschätzung. **ca. 4–6 h**
- Honorar, Etappe 2: Angebote in Varianten, weitere Objektarten (Innenräume, Freianlagen), Freischaltung für einzelne Benutzer. **ca. 4–6 h**
- Bauantrag digital einreichen (Bauportal.NRW bzw. Portal des Bundeslands) – nach der App „Bauantrag“. **ca. 1 Tag**
- Honorar: Ansicht für Geschäftsführer (alles mit Beträgen) und Mitarbeiter (nur eigene Projekte, Stunden verbraucht/verfügbar, ohne Euro) – nur in Honorar, erst Mock. **ca. 1 h**
- Textprüfung. **ca. 2 h**
- Handy-App. **ca. 2 Tage**
- Mail und Kalender. **ca. 1,5 Tage**
- Redundanz (Ausfallsicherheit). **ca. 4–6 h**
- Büros bis 100 Personen (Last, Rechte, Mandanten). **ca. 1 Tag**
- Spätere Umstellung (Ziel, noch nicht begonnen): TypeScript + React, FastAPI + Pydantic, App für App mit Verhaltenstests vorweg. **ca. 2–4 Wochen**

- Bauantrag: „Bauvorlagen“ (Schritt 5) und „Anlagen“ (Schritt 6) zu einer Liste zusammenführen – Mock **ca. 1,5 h**

## Erledigt
- ~~14.11.2026 Datenschutz: externe KI nur anonymisiert (Art#Nummer, bpcore/anonym.py), Protokoll mit Aufbewahrung und Export (Text/XML), Recht „Datenschutz“, Bilder mit Rückfrage; offene Fragen in „Wartet auf dich“ (rot/grün)~~
- 14.11.2026 Akquise: Bauherr:in aus den Kontakten wählen oder anlegen (Baustein BPHead.kontaktFeld), beim Umwandeln in die Projektdaten
- 14.11.2026 Basic: je App wählbar (Schalter oben), Vorgabe je Rolle (Rollen & Rechte); AVA-Nachträge in Basic mit drei Ständen, Frist und Entscheidung
- 14.11.2026 AVA LV-Versand: Mailvorschau rechts (Mail · Anhang ansehen · Bieter:in), Empfänger mit „alle“, Text je LV oder je Firma, Versanddatum je Unterlage
- 14.11.2026 Kontaktmaske nur noch einmal (bp/kontakt.js): überall wie in „Adressen“; Verwaltung → Projekte: „Bautagebuch · 0“ ausgeblendet
- 14.11.2026 AVA: Ablegen-Kasten und Kopierer-Eingang auch in der eingeklappten Navigation
- 14.11.2026 Aufgaben & Post: Navigation auf Offen/Verschickt gleich (Zahlen, Büro, Suchfeld links); Liste in Verschickt wieder volle Breite (Trenner merkte sich alte Spaltenbreite)
- 14.11.2026 AVA: Vertragsbedingungen im LV/Auftrag vorbelegbar, Einbehalt ablösbar als eigener Schalter, Abschlag pauschal, Energie/Medien
- ~~Aufgaben & Post: Suchfeld in allen Bereichen (kein Springen), To-dos und Bauplattform-Liste filterbar – 14.11.2026~~
- ~~Nachtrags-Stände: angemeldet · angeboten · geprüft · beauftragt · abgelehnt (Stufen der Akte), Frist davor wird mit der Stufe erledigt – 14.11.2026~~
- ~~Wiki im Aufbau der anderen Apps: Bereiche links, Tag-Zeile und Baumtabelle in der Mitte, Eintrag rechts, Ziehen aufs Kapitel, Handy mit Karten – 14.11.2026~~
- ~~Neue App „Akquise“: Dateibaum, Daten, Stände, Wiedervorlage, Überschläge, Umwandeln mit Nummer-Nachfrage und Einsortieren (Rest → Leistungsphasen 0), Archiv, Papierkorb, Recht „akquise“, Gruppe in der Verwaltung, Honorar → „💼 Akquise …“ – 14.11.2026~~
- ~~ToDo-Liste: Entscheidungsfragen rot bis entschieden, danach grün – 14.11.2026~~
- ~~Honorar überschlagen: ✓ Ablegen ohne Projekt (Handy und Rechner), am Rechner Frage in Honorar und auf der Startseite, Fenster „Abgelegte Überschläge“: in ein Projekt übernehmen (Angebot) oder löschen – 14.11.2026~~
- ~~Freigabepaket: Stempel und Unterschrift an den vorgesehenen Stellen, in der Vorschau seitenübergreifend verschiebbar, löschen und wieder einfügen – 14.11.2026~~
- ~~ToDo-Maske: Aufgaben & Post → Büro → „Bauplattform“ mit GO / Nein / Später, Bemerkung, Antworten für Claude kopieren – 14.11.2026~~
- ~~Bautagebuch: ✕ der Bericht-/Projektauswahl am Handy größer – 14.11.2026~~
- ~~Aufträge: Nachträge an ihrer Stelle im LV, ans Ende statt Sammeltitel, Ziehen mit Warnung mitten ins LV, Ordnungszahl im Eigenschaften-Fenster (dasselbe wie im LV), Stand als Knopf, Zuschlagsposition im Eigenschaften-Fenster – 14.11.2026~~
- ~~Prüfstempel: Datum in der oberen Hälfte, größer und rot; Name rechts neben „von:“ ohne an den Rahmen zu stoßen – 14.11.2026~~
- ~~Freigabe der Sicherheit als Karte in der Leiste (ziehbar, Vorschlag aus dem Einbehalt links davon); Schalter „Es gelten die Bedingungen des Hauptvertrags“ je Rechnung – 14.11.2026~~
- ~~Kopfleiste: „Basic | Profi“ statt „Einfach | Profi“, Suche rechts daneben – 14.11.2026~~
- ~~Aufmaßprüfung je Rechnung: Kartenleiste (kumulierend / nicht kumulierend), Zuwachs je Rechnung, Rechenzeilen je Rechnung, Regie mit eigenem Aufmaß, Löschen nur letzte – 14.11.2026~~
- ~~Aufmaß rechts: erst eine Zeile, ＋/✕ an der letzten, Nr. statt Datum; Zahl in „aufgemessen“ bei schmaler Spalte – 14.11.2026~~
- ~~Aufträge: beauftragte Firma hervorgehoben – 14.11.2026~~
- ~~Versand: Bieter:innen als Liste mit Stand (abgegeben / will abgeben / gibt nicht ab / offen), bis zu 10 Telefonnotizen, nächster Anruf mit To-do; Vergeben/Vergabe aufheben in der Angebotsbesprechung, aufheben mit Rechnungen streng – 14.11.2026~~
- ~~Ausschreibung: gelöschtes LV springt nicht mehr hin und her – bleibt offen mit Hinweis und „LV wiederherstellen“ – 14.11.2026~~
- ~~Ausschreibung: vergeben an ein Angebot ohne Preise gilt als Auftrag (Nachträge, Aufmaß, Rechnungen) – 14.11.2026~~
- ~~Ausschreibung → Aufträge: „Vergabe aufheben“ in der Befehlsleiste; „Löschen“ bei vergeben ohne Preise hebt nur die Beauftragung auf (nie das LV) – 14.11.2026~~
- ~~Ausschreibung: Nachtragsposition beim Prüfen anlegen – Befehlsleiste der Aufmaßprüfung und im Assistenten „Rechnung prüfen“ – 14.11.2026~~
- ~~Ausschreibung → Angebote: Befehlsleiste „Entfernen“ (Bieter:in) und „Vergabe aufheben“ – 14.11.2026~~
- ~~Ausschreibung → Aufträge: ausgegraute Nachtrags-Knöpfe sagen, warum (LV noch nicht vergeben / Auftrag wählen) – 14.11.2026~~
- ~~Bauantrag: Bauvorlagen – Datei je Zeile aus dem Projekt zuordnen oder hochladen (Projektordner), Zuordnung lösen – 14.11.2026~~
- ~~Ausschreibung: Rechnung prüfen Schritt für Schritt – Assistent mit fünf Schritten (Rechnung mit PDF-Auslese und Prüffrist, Prüfweg ohne Aufmaß / Mengen je Position / Rechenweg, Leistung, Abzüge, Freigabe) – 13.11.2026~~
- ~~Ausschreibung: Angebotsbesprechung als eigene Seite unter Vergabe – Bieter:innen oben mit Stand, Protokoll kompakt mit Auswahlfeldern (eigener Text bleibt möglich), Wege in der Befehlsleiste – 13.11.2026~~
- ~~Kopfleiste: Suche (Strg+K – Inhalte der App, Funktionen, Einstellungen, Apps, Projekte, Adressen; Ausschreibung angebunden) und Büro-Logo links (aus · dezent · in Farbe) – 13.11.2026~~
- ~~Startseite: ⤢-Knopf nur am Handy, am PC wieder an der Ecke ziehen – 13.11.2026~~
- ~~Bauzeitenplan: unterbrochene Leistungen – alle Balkenenden ziehbar, Verknüpfung je Abschnitt – 13.11.2026~~
- ~~Befehlsleiste: bei Enge erst kleiner Text unter großen Symbolen, dann ohne Text – 13.11.2026~~
- ~~Verwaltung: Schalter „Wer darf hier hinein?“ einheitlich abgerundet – 13.11.2026~~
- ~~Aufmaßprüfung: Auftragsmenge, GP Auftrag, EP/GP Schätzung, Mehr-/Mindermenge, %, bisher abgerechnet, Zuwachs, Prognose, KG, Art als Spalten – 13.11.2026~~
- ~~Ausschreibung: ✎ in den Spaltenköpfen entfernt – 13.11.2026~~
- ~~Unterschrift: gleich auf die passende Zeile im Dokument, etwas kleiner – 13.11.2026~~
- ~~Ausschreibung: Stufe „Ausführung“ heißt „Aufmaß“ – 13.11.2026~~
- ~~Baudaten: Suchen und Filtern wie in der Ausschreibung (Bereich, Neubau/Altbau, Preis, Sortieren, Chips, Markierung, Leistungsbereich suchen, oft geöffnet, zuletzt gesucht); Suchwörter auch in der Kopierquelle markiert – 13.11.2026~~
- ~~Baudaten: Fenster „Preise umrechnen“ in Abschnitten, Löhne in Spalten – 13.11.2026~~
- ~~Bauantrag: Bauvorlagen kompakter (Stand in einer Zeile) – 13.11.2026~~
- ~~Aufmaßprüfung schnell bei großen LVs (13.11.2026): Positionsliste und Baum zeigen nur den Ausschnitt im Bild, Spaltenbreiten bleiben stehen; Langtext auf/zu und Art ändern tauschen im LV nur die Zeilen. 2.000 Zeilen: Neuzeichnen 1,1 s → 0,1 s~~
- ~~Versand: echte Dateinamen der Anhänge, GAEB-Datei abwählbar – 13.11.2026~~
- ~~Ausschreibung schnell auch bei großen LVs (13.11.2026): nur der Ausschnitt im Bild steht auf der Seite (LV, Preisspiegel, Kopierquelle), im LV werden nur die Zeilen getauscht, Summen und Rückgängig rechnen sparsam, teure Stil-Regeln ersetzt. Gemessen an 2.000 Zeilen: Tastendruck 1,3 s → 0,03 s, Auf-/Zuklappen 5,8 s → 0,1 s, Neuzeichnen 6 s → 0,2 s. Messtest in der Pipeline.~~
- ~~Ausschreibung: Versand an Bieter:innen als eigene Seite unter Vergabe – Unterlagen aus Pläne & Dateien, Fileserver, Rechner; Erinnern, Nachversand; Ordner „Versand <Datum>“ mit Adressliste (PDF, Excel) – 13.11.2026~~
- ~~Kopierquelle: Neubau · Altbau auch für die Baudaten (aus den Stichwörtern der Positionen) – 13.11.2026~~
- ~~Kopierquelle → Gliederung: angehakt springt die Liste dorthin, „Alle zuklappen“ nur über der Liste, größere Dreiecke – 13.11.2026~~
- ~~Kopierquelle → Gliederung: Suche auch in der Hauptgruppe („Dach“ → 021 Dachabdichtungsarbeiten) – 13.11.2026~~
- ~~Korb: Positionen einzeln herausnehmen und Korb leeren auch in Ausschreibung (Kopierquelle) und Baukosten – 13.11.2026~~
- ~~Stil „Schalter“: feste Größe, kein Überlappen mehr (Kataloge u. a.) – 13.11.2026~~
- ~~Versand: Rückmeldung nur bis zum Tag der Abgabe – 13.11.2026~~
- ~~Darstellung: Schriftgröße wirkt in allen Apps, „wie Bautagebuch“ entfernt – 13.11.2026~~
- ~~Ausschreibung: unter „Neu“ Position vor Gliederung – 13.11.2026~~
- ~~Wiki sammeln: Runde mit unlesbarer KI-Antwort hält den Rest nicht auf (gerettete Einträge zählen), Dateien der Projektordner über denselben Pfad wie die Vorschaubilder – 13.11.2026~~
- ~~Wiki: Tags als Knöpfe statt Rubrik (nach Häufigkeit), mehrere Projekte mit Häkchen (aktuelles zuerst, dann alle Projektordner), Dokumente vorbelegen (Ollama-Essenz, Tags, Projekte) – 13.11.2026~~
- ~~Verwaltung → Projekte: Module (Bautagebuch, Bauzeitenplan, Baukosten) antippen – öffnen, archivieren, zurückholen, Papierkorb; Auswahl einzeln oder alle – 13.11.2026~~
- ~~Projektdaten: eigene Felder der Druck-Layouts „je Projekt“ als Gruppe „Felder für Ausdrucke“ in der gemeinsamen Maske – 13.11.2026~~
- ~~KI: bei Überlastung des Anbieters (500/502/503/529) zweimal neu versuchen, verständliche Meldung; „Schlüssel vorher speichern“ nur ohne Schlüssel – 13.11.2026~~
- ~~Wiki sammeln im Hintergrund (Dienste) mit Projektordnern (Protokolle, Rügen, Bedenken, Nachträge, Abnahmen), Knopf nur in Verwaltung → Einstellungen → Wiki, To-do am Ende – 13.11.2026~~
- ~~Startseite am Handy: beim Einrichten einreihen statt tauschen, keine Lücken (dicht gepackt), Tippen öffnet keine App – 13.11.2026~~
- ~~Wiki: „Sammeln“ (KI liest Mängel/Weisungen der Bautagebücher und eigene Mails, montags von selbst), Warnung beim Eintippen in LV-Positionen und Vorgängen mit geprüften Einträgen und früheren Mängeln – 13.11.2026~~
- ~~Projektdaten: „Bauvorhaben“ mit Projektordner fehlte Administratoren bei fremden Projekten – „verwaltung“ sieht alle Projekte – 13.11.2026~~
- ~~Wiki: eigene App (Kapitel, Eintrag, Prüfung, Woche), „? → Erkenntnis fürs Wiki“ in allen Apps, Wochenzusammenfassung und Lektorat mit KI (nur auf Klick), Fachprüfung mit Recht „Wiki prüfen“, Dateien auf Bauportal/02 Wiki, PDF wöchentlich in Pläne & Dateien → Büro → Wiki, Hinweise in AVA und Bautagebuch – 13.11.2026~~
- ~~Diktat: „Kein Claude-Schlüssel hinterlegt“, obwohl hinterlegt – KI-Einstellungen werden jetzt auch ohne mitgegebene Datenbankverbindung gelesen – 13.11.2026~~
- ~~Dienste „unhealthy“: Vorschau von Excel/Calc mit vielen leeren formatierten Zellen lief quadratisch und hielt den Prozess an – jetzt linear – 13.11.2026~~
- ~~Angebotsanfrage-Mail: CRLF für Microsoft 365 (kein zerhacktes quoted-printable), Gruß nur einmal, Bauvorhaben ohne doppelte Adresse, Satz ohne Datum entfällt – 13.11.2026~~
- ~~LV-Versand: eigene Anhänge (Datei wählen oder hineinziehen); Ablauf oben zeigt „Versand“, wenn der Reiter offen ist – 13.11.2026~~
- ~~Bautagebuch: auch Tippen in vorhandene Einträge und Häkchen eines älteren Berichts fragen erst nach – 13.11.2026~~
- ~~Projektdaten: Abschnitt „Bauvorhaben“ (mit Projektordner) fehlte, wenn die Projektliste nicht passte – kommt jetzt mit den Projektdaten – 13.11.2026~~
- ~~LV aus der Kostenermittlung: Blöcke nach Leistung (zusammengefasst) oder je Bauteil, eine Ebene mit Überschrift oder Gliederungspunkte – 13.11.2026~~
- ~~Datum: nur noch der eigene Kalender – der Systemkalender ging zusätzlich auf (Bautagebuch, Aufmaß, Bauzeitenplan) – 13.11.2026~~
- ~~Bautagebuch per Sprache: Diktat → KI verteilt auf den Bericht von heute, Freigabe sofort oder später am Rechner (Hinweis + To-do) – 13.11.2026~~
- ~~AVA Versand: Bieter:in ohne Adresse eintippen, später im Adressfenster ergänzen – 13.11.2026~~
- ~~F5 Bauantrag einreichen: Weg, Datum, Aktenzeichen, Verlauf, Ablage mit Begleitliste – 13.11.2026~~
- ~~F3 Teil 1: Suchfeld mit Filtern bei Termine & Verzug, Erinnerungen und Pläne – 13.11.2026~~
- ~~AVA F11: Zuschlagspositionen (GAEB MarkupItem) einlesen, rechnen (Schätzung, Angebot, Preisspiegel, Auftrag, Aufmaß, Rechnung), ausgeben – 13.11.2026~~
- ~~AVA F10: „tatsächlich gezahlt“ auch bei früheren Rechnungen – nicht Gezahltes holt die nächste Rechnung nach – 13.11.2026~~
- ~~Bautagebuch: ein Bericht je Tag – Neues landet im Bericht von heute, ältere nur nach Rückfrage ändern – 13.11.2026~~
- ~~Freigabe „Bauportal“: Ordner 01–06 mit LIESMICH, Scanner-Eingang, Wiki-Sicherung für sich, Notfallpaket (Docker/Python) – 13.11.2026~~
- ~~AVA: Sperre beauftragter LVs/Nachträge leise im Baum (🔒/🔓) und in den Details, freischalten und wieder sperren – 13.11.2026~~
- ~~Kopfleiste kompakter: ? mit Hilfe, Neuigkeiten, Frage/Live-Hilfe, Fehler melden (Käfer entfällt); ↶ ↷ als Paar – 13.11.2026~~
- ~~Rückgängig: am Handy ↶ in der Kopfleiste, am Rechner wieder das Dock unten – deutlicher (Akzentrand, leuchtet bei neuem Schritt) – 13.11.2026~~
- ~~KI-Langtext in der AVA: Länge ganz kurz/kurz/mittel/lang, ohne Floskeln außer bei lang, mit Rückgängig – 13.11.2026~~
- ~~KI-Langtext auch im Fenster „Eigenschaften: Position“ – 13.11.2026~~
- ~~Grundstück ermitteln: Meldung „Ermittelt: …“ entfernt – 13.11.2026~~
- ~~AVA: Details rechts für Projekt, LV und Gliederungspunkt mit Budget und Leistungsfortschritt – 13.11.2026~~
- ~~Preise der Baudaten überall tief · mittel · hoch, tief links – 13.11.2026~~
- ~~Block „Zugänge“ je Rolle (Schlüssel/Kennwörter neu setzen, nie sehen) – 13.11.2026~~
- ~~KI-Verbrauch je Dienst (Monat, Ø je Tag, Guthaben aus Aufladungen) – 13.11.2026~~
- ~~Bestandteile mit Anteil für sirAdos-, Bauportal- und eigene Elemente – 13.11.2026~~
- ~~Honorar überschlagen: am Handy oben, am Rechner Knopf in der Navigation – 13.11.2026~~
- ~~Versand: Firma anklicken öffnet die Adresse im Fenster – 13.11.2026~~
- ~~To-do-Regeln „für mich“: eigene Abweichung je Regel – 13.11.2026~~
- ~~Angebote: Baum springt nicht mehr (Rollposition des Feldes), Schloss in der Summenspalte – 13.11.2026~~
- ~~Aufmaßprüfung: springt beim Anklicken nicht mehr waagerecht – 13.11.2026~~
- ~~Bautagebuch: Farbe des Arbeitsfortschritts nach dem Abstand zum Plan (Dauer des Einsatzes) – 13.11.2026~~
- ~~Ein Balken „Ist gegenüber Soll“ im Baukasten (bpBalken): Aufmaß und Arbeitsfortschritt – 13.11.2026~~
- ~~Druck-Layouts: Variablen per Ziehen auf die Seite oder in einen Text – 13.11.2026~~
- ~~Startseite einrichten wie am iPhone: lange drücken, wackeln, ⤢ Größe, je Gerät, Vorgabe der Büroleitung – 13.11.2026~~
- ~~Auswahlfeld mit Häkchen über mehrere Suchen (Baukasten); Versand: mehrere Bieter:innen auf einmal – 13.11.2026~~
- ~~Vorbemerkungen aus Katalogen (sirAdos, Bauplattform) in den Baudaten nicht mehr leer; zählen als vorhanden je Leistungsbereich; Katalogauswahl einklappbar – 13.11.2026~~
- ~~Massenermittlung nach Blockvorlagen (Position, Aufmaßzeile, Summe) – 13.11.2026~~
- ~~Aufgeräumt: Spalten-Menü der Aufträge und Druckseite der AVA waren schon fertig – 13.11.2026~~
- ~~Suche über alle Einstellungen in der Verwaltung (nur, was die Rolle sehen darf) – 13.11.2026~~
- ~~Sahne Etappe 2: AVA stellt den Fokus nach dem Neuzeichnen sofort wieder her; 20 Wartezeiten von 30 ms vor dem Fokussieren entfernt – 13.11.2026~~
- ~~Rückgängig am Handy: Leiste über der Tab-Leiste, danach ↶ in der Kopfleiste mit Verlauf als Blatt – 13.11.2026~~
- ~~Verwaltung je Rolle, Teil 2: Einstellungen der Apps je Rolle (Raumtypen, Preise, Abrechnung, Pläne, Bauzeitenplan-Katalog, Erinnerungen/To-do-Regeln); Bautagebuch ohne doppelte Firma/Ablage/Mail/Sicherung; Zugänge der Kostendatenbanken nur Administrator – 13.11.2026~~
- ~~Verwaltung je Rolle, Teil 1: Blöcke der Verwaltung mit – / sehen / ändern, „Wer darf hier hinein?“, Übersicht unter Rollen; Zugänge nur Administrator – 13.11.2026~~
- ~~Einstellungen in der Verwaltung: ⚙ springt im selben Fenster dorthin (Persönlich, je App eine Seite), Seitenfenster entfällt – 13.11.2026~~
- ~~Bautagebuch: Fortschritt im Feld der Firma unter „Anwesende“ (farbig 0 rot … 100 grün), getrennter Kasten entfällt – 13.11.2026~~
- ~~Neuigkeiten-Rundgang am Handy: Karte passt in die Breite (Punkte brechen um) – 13.11.2026~~
- ~~Kataloge erzeugen, Teil 2: Bauteil-Vorlagen mit Schichten per KI, daraus Elemente (Baukosten, AVA, Allplan) – 13.11.2026~~
- ~~AVA-Eingabe neutral (keine blauen Felder) – 13.11.2026~~
- ~~Flackern: Spaltenbreiten vor dem Malen, PDF-Vorschau tauscht erst fertige Seiten; neues LV sichtbar und markiert – 13.11.2026~~
- ~~Verwaltung → Kataloge erzeugen: Allplan-Kataloge übertragen, Vorbemerkungen und Positionen mit Claude ergänzen (Prüfliste, eigener Schlüssel möglich) – 13.11.2026~~
- ~~Verwaltung mit Registern, Schritt 1: Büro · Einstellungen · System, Büro-Einstellungen direkt in der Verwaltung, Rollen ab Werk (Büroleitung, Bauleitung, Administrator, Gast) – 13.11.2026~~
- ~~Aufgaben & Post: aufgeklappte Erinnerung nicht mehr zusammengequetscht (Knöpfe in eigener Zeile) – 13.11.2026~~
- ~~Wärmeschutz: Hüllbauteile aus den Baukosten (IFC) mit Fläche, Schichten, Uw – 13.11.2026~~
- ~~Bauantrag: Farbbalken oben und Vordrucke/Unterlagen/Pläne mit Stand links wieder da (alt + neu kombiniert) – 12.11.2026~~
- ~~Pfeile in allen Bäumen gleich groß (schwarz = Inhalt, grau = leer), Eingaben im LV/Aufträge ohne Kasten – 12.11.2026~~
- ~~LV-Versand an Bieter:innen: Reiter „Versand“ im LV, eigene Mail je Firma mit Anrede, PDF ohne Preise + X83, Ablage mit Empfängerliste – 12.11.2026~~
- ~~Bäume: angeklickte Zeile bleibt unter der Maus (bpBaum.anker), leere LVs ohne Dreieck – 12.11.2026~~
- ~~Zeiten: Stoppuhr und Fahrten lösen Überschneidungen auf (vorher doppelt gezählt); Hinweis, wenn Projektzeit über der Arbeitszeit liegt~~
- ~~LV-Druck nach Blockvorlage (Reiter Position/Titel/Summe im Layout-Editor, Außenkasten, wachsende Felder, Seitenumbruch ohne geteilte Fotos, Spaltenköpfe je Seite) – gemeinsamer Baustein bpcore/vorlage.py~~
- ~~AVA Schritt „Besprechung“: Reiter Besprechung mit Protokoll je Bieter:in, Blanko-Druck, digital unterschreiben (Bauleitung + Bieter:in nacheinander), Scan/Foto einlesen, im Projektordner suchen und zuordnen~~
- ~~AVA Preisspiegel: nach der Vergabe fest (kein ✎, keine Eingaben), Angebot im Baum ↔ markierte Spalte~~
- ~~Drucken: eine Druckseite für alle Apps (Layouts, Teile, Zoom, PDF, Drucken), Seiten zeichnet überall derselbe Baustein (BPHead.pdfSeite), Ansehen-Fenster mit derselben Zoomleiste und Strg+Mausrad~~
- ~~Bautagebuch: Vorschläge laut Bauzeitenplan wieder mit „nicht da“ (Begründung) neben Bestätigen und Löschen; Knopf „Kopfdaten“ entfernt~~
- ~~AVA: Doppelklick auf eine Rechnung in jedem Baum – Erklärung hinter dem Namen (z. B. „3. Teilrechnung · Rohbau EG“), Nummer und Art bleiben~~
- ~~AVA Aufmaßprüfung: Baum einheitlich – Klick auf die ganze Zeile klappt, Zeile bleibt stehen, feste Spalten, immer nur ein Titel je Ebene offen, Doppelklick auf Rechnung benennt um~~
- ~~Bauantrag: ein Weg statt drei – links die sechs Schritte, oben keine Schrittleiste mehr, rechts folgt das Blatt (Schritt 5: Datei der Bauvorlage)~~
- ~~AVA Aufmaßprüfung: Titel auf-/zuklappen ohne Neuzeichnen – Spalten bleiben stehen, nichts flackert, richtige Zeilen klappen~~
- ~~Gendern mit Doppelpunkt in Oberfläche, Schreiben, Verträgen und Ausdrucken (gut 400 Stellen); Feldnamen, Protokoll-Einträge und gespeicherte Werte bleiben unverändert~~
- ~~Navigation: „＋ Neu …“ unter dem gewählten Punkt auch gelöst (beim Aufklappen) und oben (im Aufklappmenü)~~
- ~~AVA: Pfeile im Baum größer (feste Größe, kein Springen beim Klick), leere Knoten mit ganz blassem Pfeil (Baukasten bpBaum.zelle o.leer)~~
- ~~Baukosten: Stufenleiste als Keil (spitz → breit), bis zur gewählten Stufe kräftig~~
- ~~Baukosten: Raumbuch ohne waagerechten Scrollbalken (Pläne als Leiste darüber, Besonderheiten unter dem Raumnamen, Maßnahme unter dem Standard, schmalere Felder)~~
- ~~Adressen: Suchfeld mit Filtern (Art, Gewerk, Funktion, Name, Ort, Projekt; UND/ODER/NICHT), Punkte links setzen den Filter, Filterleiste oben entfällt~~
- ~~Baustein Suchfeld mit Filtern (bp/filter.js): Vorschläge nach Art mit Anzahl, Filter je Art farbig, UND/ODER innerhalb und zwischen, NICHT, ✕ – zuerst bei Mängel & Weisungen (Auswahllisten und Statusknöpfe entfallen)~~
- ~~Baukosten: Stufenleiste DIN 276 auch ohne Räume sichtbar~~
- ~~Zeiten: Monat blättern direkt im Kalenderfeld (Monat & Urlaub, Mitarbeiter) statt in der Befehlsleiste~~
- ~~Aufgaben & Post: Aufgaben & Mängel und Kommunikation als eine App im Menü, links Offen / Verschickt / Mit wem (gemeinsamer Baustein aufpost.js), Reiter und Art-Chips entfallen~~
- ~~Zeiten → Mitarbeiter: Abwesenheitskalender aller (Grund und Urlaubskonto nur mit Recht), Klick auf den Namen: Rolle, Vorgesetzte, Soll, Urlaubskonto~~
- ~~Urlaubsanträge: Fenster in jeder App für die Entscheider (Vorgesetzte, sonst alle mit dem Recht) mit „Wer ist sonst weg?“, Genehmigen/Ablehnen mit Begründung/Später; Meldung der Entscheidung an die Person; Hinweis nach einstellbaren Tagen ohne Antwort; genehmigten Urlaub nur mit Zustimmung zurückziehen; Entscheidungen im Protokoll~~
- ~~Rollen & Rechte im Kern: Rollen (Geschäftsführung, Mitarbeiter, Assistenz, IT / Admin, Extern, eigene), Rechte als Häkchen, Ausnahmen je Person, Vorgesetzte; „Administrator“ = Recht „Verwaltung“; Urlaubsanträge entscheidet, wer das Recht hat; Projekt-Sichtbarkeit an einer Stelle (vorher drei Kopien)~~
- ~~Ausschreibung: Archiv-Gruppe unten im Baum (LVs und Aufträge, zurückholen mit ↩); gelöschtes LV schließt sich, das nächste öffnet; Strg+Z nimmt immer den neuesten Schritt (auch Löschen)~~
- ~~Ausschreibung: Langtextfeld im gesperrten LV aufziehen und markieren, Rückfrage erst beim Ändern~~
- ~~Druck-Layout: Änderung sofort in der Vorschau dahinter~~
- ~~Zeiten: Urlaub/Krank im Monat mit ✕ entfernen (ganzer Zeitraum oder nur der Tag, Rückgängig) – vorher nur über die Datumsfelder~~
- ~~Wärmeschutz: 225 Musteraufbauten in 20 Gruppen (statt 10), Test rechnet alle; Auswahllisten suchen jetzt jedes Wort (pickMenu nutzt passt)~~
- ~~AVA: eingebbare Spalten hellblau mit ✎ im Kopf, feste Werte grauer (LV, Preisspiegel, Aufträge, Aufmaß)~~
- ~~Ausschreibung: LV löschen mit zwei Warnungen (Kette, LV-Nummer eintippen); nur das LV verschwindet aus der Ausschreibung, Angebote/Auftrag/Aufmaß/Rechnungen bleiben; wiederherstellbar~~
- ~~Bautagebuch Anwesende: vorausgefüllte Firmen „✓ Bestätigen“ oder 🗑 löschen mit Begründung auf Wunsch; „nicht da“ (Terminrüge) entfällt hier~~
- ~~Ausschreibung: Löschen unter „Aufträge“ löscht nur den Auftrag (LV und Angebote bleiben), nicht bei vorhandenen Rechnungen, Warnung bei unterschriebenem Vertrag~~
- ~~Rumrutschen: Preisspiegel zentrierte die Spalte des gewählten Bieters immer (mit Gleiten) – jetzt nur wenn verdeckt, sofort, so weit wie nötig; alle 25 gleitenden/zentrierenden Stellen in den Apps gleich umgestellt; Rollposition der Kostenkontrolle ging beim Neuzeichnen verloren (bp-feld in der Kennung)~~
- ~~Menü links in Papierkorb (je App), Adressen (Arten, Beteiligte, Gewerke), Baukosten (Bereiche, Version), Baudaten (Kataloge, Leistungsbereiche, Werkzeuge), Verwaltung (Büro, Menschen, Einstellungen, System) – gemeinsamer Aufbau main.bp-app im Baukasten, App-Farben als --af-<app>~~
- ~~Ausschreibung Aufmaß: Tabelle sprang nach jeder Eingabe nach oben (Rollposition ging beim Neuzeichnen verloren) – behoben; Menge in „aufgemessen“ auch bei Positionen ohne Aufmaß und mit Rechenweg-Spalte direkt eintragen~~
- ~~Eingang (Scans vom Kopierer): Fenster öffnet sich nur bei Administratoren~~
- ~~App-Symbole überall als farbige Kachel (Apps-Menü, Kopfleiste neben dem App-Namen), eigene Farben für Baudaten, Zeiten, Bauantrag, Wärmeschutz, Honorar; keine farbigen Halbrahmen mehr (Navigation, Bauantrag-Vordrucke, Hilfe, Rechnung von Hand, Bautagebuch-Untermenü)~~
- ~~Symbole links überall farbig wie im Bautagebuch – eine Farbreihe im Baukasten (Zeiten, Bauantrag, Wärmeschutz, Pläne; Ausschreibung und Bauzeitenplan jetzt auch im hellen Stil kräftig)~~
- ~~Zeiten: 10-Stunden-Linie im Zeitstrahl (§ 3 ArbZG; ab Kommen, Pausen nicht mitgezählt, mindestens 45 min)~~
- ~~Ausschreibung Aufmaß: bei nur einer Aufmaßzeile die Menge direkt in der Spalte „aufgemessen“ ändern~~
- ~~Bauantrag „Im PDF ausfüllen“: Seiten wurden gleichzeitig gerendert – pdfium ist nicht threadsicher und brach ab (leere Seiten, verlorene Eingaben). Jetzt nacheinander, Seitenbild lädt bei Fehler neu, Passwortmanager springt nicht mehr an~~
- ~~Bautagebuch: großer Stift rechts bei Kopfdaten und Wetter (gleiche Stelle), beim Bearbeiten grünes Häkchen; Enter übernimmt, Esc schließt~~
- ~~Bauantrag: Reihenfolge der Vordrucke – ganze Zeile ziehbar, Linie zeigt davor/danach (vorher zeigte sie immer „davor“, abgelegt wurde je nach Hälfte danach)~~
- ~~Wärmeschutz: Nachweise als Versionen wie überall~~
- ~~Wärmeschutz übersichtlicher: zugeklappte Stufen, Ampelzeile mit fehlender Dämmdicke, Grafiken rechts (Querschnitt mit Materialmustern, Glaser-Diagramm, Temperaturwelle Hitzeschutz, Prüfung)~~
- ~~Rechnen in allen Zahlenfeldern („20*20*7“ → 2800), ein gemeinsamer Baustein bpRechne statt zwei Kopien (Ausschreibung, Baukosten)~~
- ~~Wärmeschutz: Baustoffdatenbank (175 Baustoffe, 26 Herstellerprodukte mit Datenblatt-Link), eigene Baustoffe, verknüpft mit Bauteilen und Bauteilkatalog („verwendet in“)~~
- ~~Neue App „Wärmeschutz“ (Etappe ①): Ablauf wie Honorar, Bauteile mit Schichten, U-Wert/Tauwasser/fRsi/Phasenverschiebung live, Prüfung nach GModG Anlage 7 mit 10-%-Regel, Grundlagen aus dem Bauantrag, Musteraufbauten, Bauteilkatalog des Büros~~
- ~~Bautagebuch: Einträge mit Firma (Weisungen, Zu erledigen) springen nicht mehr – Firma ohne Kasten bis zum Darüberfahren, gewählter Eintrag mit Rahmen außen herum~~
- ~~Tests: Freigabe-Test ohne Projektordner (v207 war daran hängen geblieben)~~
- ~~Zeiten: Blöcke im Strahl mit ✕ oder Entf löschen (mit Rückgängig)~~
- ~~To-dos: Link-Adresse nicht mehr im Notizfeld, nur noch als Knopf (auch ✉ in der Liste)~~
- ~~Aufmaß: Enter in den Aufmaßzeilen springt sicher weiter, Reihenfolge bleibt, eigene Spalte „Rechenweg“~~
- ~~To-dos: Links in der Notiz als Knopf („✉ Mail in Outlook öffnen“), Notizfeld wächst mit~~
- ~~Auftragsbedingungen: Hinweis bei Abweichung vom beauftragten Angebot/Protokoll, „Auf Vertrag zurücksetzen“; Preisspiegel mit Spalten Schätzung und Mittel~~
- ~~Preisspiegel kompakt (eine Zeile, GP im Tooltip); Spaltenauswahl mit drittem Zustand „grau“ (Baustein spalten.js, data-spgrau) – grau zählt nicht, im Druck fehlen grau/aus~~
- ~~Protokoll: Bauzeitenplan mit Stand wählbar (Termine daraus); Skontofrist in Arbeits-/Werk-/Kalendertagen oder Wochen (auch Auftrag, Rechnung)~~
- ~~Aufmaß: Mengenbalken als Skala 0–200 % mit Verlauf (grün → leicht orange bei 100 % → rot bei 200 %), Mitte = LV-Menge~~
- ~~Aufmaßprüfung: Rechenweg der Aufmaßzeilen direkt in der Tabelle ändern (Enter → nächste Zeile)~~
- ~~Eingang vom Kopierer: Fenster in jeder App (Stand zählen die Dienste alle 3 Minuten, keine Abfrage beim Öffnen), Ablegen mit Ordner-/Namensvorschlag, in der Ausschreibung mit Erkennung~~
- ~~Bauantrag: eigene Unterlagen und beigelegte Pläne nur als Verweis auf den Projektordner (Paket liest sie vom Server, Zwischenspeicher bis Mitternacht, „↻ neu einlesen“ leert ihn); Testserver zum Ausprobieren weiter in der Datenbank~~
- ~~Dokumente auf den Dateiserver: unterschriebene Vergabeunterlagen und Rechnungen der Fachplaner liegen im Projektordner, in der Datenbank nur der Verweis (ältere bleiben lesbar)~~
- ~~Datei ablegen: „Im Ordnerbaum wählen …“ als letzte Möglichkeit~~
- ~~Zeiten: Kommen und Gehen als deutliche Linie im Zeitstrahl (gestrichelt = Vorschlag)~~
- ~~Bautagebuch: PDF (Tagesbericht, Zeitraum, Kontakte) im gemeinsamen Viewer statt neuem Fenster bzw. eigener Ansicht; Ablage-Meldung wie bisher~~
- ~~Bautagebuch: Tätigkeit der Anwesenden immer eigene volle Zeile; „← Bericht“ als auffälliger Pfeil-Knopf; Hinweis Terminrüge entfernt~~
- ~~Waagerechter Scrollbalken zu früh: Baumspalte gibt zuerst nach (alle Baumtabellen), Stufen-Pfeile schmaler, Pläne-Titel, Honorar-Tabellen, Bauantrag-Auswahl, Arbeitsfortschritt im Bautagebuch; Adressen-Tabelle und Bauzeitenplan rollen weiter bewusst~~
- ~~Bauantrag: leere Pflichtfelder sprangen (Abstand der Leer-Anzeige), Statistikbogen bleibt bei „entfällt“ links sichtbar, Hinweis „Vordruck fehlt noch“ statt „liegt bei“~~
- ~~Ausschreibung: „Protokoll“ in der Leiste der Aufträge; Protokoll, Bauvertrag und Auftragsschreiben in der Kommunikation bei der Firma, mit Link zurück~~
- ~~Ausschreibung: „Dokument ablegen“ mit Dateiname – Vorschlag wie die Dateien im Zielordner (Datum, Firma, nächste Nummer), von Hand getippte Namen werden je Ordner gemerkt~~
- ~~Ausschreibung: Angebotsbesprechung (Protokoll je Angebot, vorausgefüllt, im Gespräch ausfüllen, Abschluss übernimmt Nachlass/Skonto/Sicherheiten) und Bauvertrag/Auftragsschreiben aus dem Auftrag (VOB/B oder BGB für Privat), PDF auf dem Briefbogen, unterschrieben zurück in den Projektordner~~
- ~~Honorar: Fachplaner über unser Büro – Fachplaner je Auftrag, ihre Rechnungen (PDF, prüfen/freigeben/bezahlt), Weiterberechnung durchgereicht oder mit Zuschlag in Abschlag/Schluss, Blatt 2 „Fremdleistungen“~~
- ~~Bauantrag: Statistikbogen als Vordruck wie die anderen Formulare (Quelle: Statistische Ämter, einmal hochladen, Platzieren, ins Paket) – Online-Weg entfernt; beschädigte PDF werden beim Hochladen abgewiesen~~
- ~~Bauantrag: Befehlsleiste nur „Drucken“, „Alle Vordrucke …“ und „Neu einlesen“ links~~
- ~~Bautagebuch: „Art der Tätigkeit“ eigene, größere Zeile~~
- ~~Bautagebuch: Gewerk ohne Firma – Firma eintragen (Rückfluss in den Bauzeitenplan) oder heute ausblenden, mit Rückgängig~~
- ~~Honorar: 50 % = „Mittelsatz“, 100 % = „oberer Honorarsatz“ in Angebot, Vertrag, Rechnung und App~~
- ~~Honorar: Hilfe (Anteile nach § 34, Leistungsstand begründen: Teilleistungstabellen, LPh 8 nach Bauzeit) und Hinweis auf Blatt 2 der Rechnung~~
- ~~Statistikbogen: Landesamt lässt sich nicht einbetten – Formular als eigenes Fenster rechts daneben~~
- ~~Zeiten (Woche): Block auf einen anderen Tag ziehen – mit kurzer Rückfrage und Rückgängig~~
- ~~Bauantrag: neue Version als Änderung (Tektur), Ergänzung (Nachreichung, Anschreiben mit Liste) oder ganz neu – Bezug mit Aktenzeichen und Datum, umstellbar, eingerückt unter dem Ursprung~~
- ~~„?“ kleiner und gefüllt (gelb bei Ungesehenem)~~
- ~~Zeiten: Fahrt starten und Stoppuhr immer in der Leiste, springen zu „Mein Tag“ heute~~
- ~~„?“ in der Kopfleiste: Hilfe zur App (mit Handy-Ansicht) und alle Änderungen seit Beginn, gelber Rand bei Ungesehenem; „Neuigkeiten“ aus dem Benutzermenü~~
- ~~Bauantrag: Statistikbogen geteilt – rechts das Online-Formular, links die Werte; Lesezeichen „Bauportal ausfüllen“ setzt alles auf einmal~~
- ~~Bautagebuch: „Verwerfen“ neben „Hinzufügen“ (mit Rückgängig)~~
- ~~Dialoge: mehr Luft zwischen Beschriftung und Feld; Projektordner-Muster als Suchfeld mit Meine/Andere Projekte~~
- ~~Build wieder grün: Tests an die Regel „Bauvorlagen nachreichen“ angepasst~~
- ~~Aufmaß: Empfindlichkeit der Mengenüberschreitung einstellbar (Hinweis ab %, rot ab %) und Rückfrage bei Bedarfspositionen abschaltbar – ⚙ Einstellungen → Abrechnung~~
- ~~Aufmaß: Mengenüberschreitung als Balken gelb → rot (ab +10 % rot), Rückfrage bei Bedarfs-/Wahlpositionen vor der ersten Aufmaßzeile~~
- ~~PDF schneller: Antragspaket wird zwischengespeichert und nur neu gebaut, wenn sich etwas geändert hat (ETag, Browser fragt nur nach – lokal 2,3 s → 0,6 s); Rechnungs-PDFs der Firmen bleiben im Browser~~
- ~~Zeiten: Kommen/Gehen als Maßstab – Vorschläge außerhalb grau, beim Bestätigen gefragt (Kommen/Gehen rücken mit)~~
- ~~Bauantrag: Bauvorlagen „wird nachgereicht“ – liefert (Adressen), Frist fest oder aus dem Bauzeitenplan, Erinnerung als To-do, im Bautagebuch und vorbereitete Mail-Nachfrage~~
- ~~Navigation (alle Apps): gewählter Bereich kräftiger mit Farbstreifen, Gruppe der Phase markiert; Ablaufleiste der Ausschreibung: „hier“ deutlicher~~
- ~~Ausschreibung: Vorschläge für Gewerk und Firma in „Neues LV“, „Neuer Auftrag“, Rechnung ohne Auftrag (statt Browser-Listen); Skontofrist klar als Kalendertage ab Eingang der prüfbaren Rechnung~~
- ~~Ablaufleiste bei „nicht vergeben“: ganzer Ablauf sichtbar, Ausführung und Abrechnung durchgestrichen~~
- ~~Aufmaßprüfung: Positionen unter den LV-Titeln (auf-/zuklappbar); automatische Zeichen in der PDF ausblendbar~~
- ~~Bauantrag: Formulare links (amtlich, eigene Unterlagen, Pläne & Anlagen mit Stand), Schritte oben, Anträge wie Versionen (★ Hauptantrag, Kopie, Umbenennen), Projekt aus der Kopfleiste; Statistikbogen online + Beleg; Tab-Reihenfolge im PDF wie man liest~~
- ~~Bautagebuch: Kalender oder Liste wählbar; Abschnitte hüpfen nicht mehr, leere ohne Pfeil~~
- ~~Bauantrag „Im PDF ausfüllen“: Vorschläge je Feld (Bauherrschaft aus den Adressen füllt den Block), „Alle übernehmen“, leere Felder gelblich mit Zähler und Sprung, Herkunft klein im Feld~~
- ~~Ausschreibung „Einfach“: Tafel „Alle LVs“ nach Ablauf statt der Karten über der Seite; Navigation bleibt links, Hinweise nur bei offenen Aufgaben, Filter Zu tun / Über Auftrag~~
- ~~Ausschreibung, Ablaufleiste: folgt der Navigation links (geöffneter Bereich hinterlegt), dicker, kräftiges Violett statt Ocker~~
- ~~Pläne & Dateien, Details: Hochkant-Fotos bleiben im Rahmen (Text lief ins Bild); „In der Karte zeigen“ mit Google Maps, Kartendienst in der Verwaltung wählbar (Google, OpenStreetMap, Apple)~~
- ~~Büro-Zuschnitt entkoppelt: Bundesland des Büros und Name der Plattform in den Firmendaten; Feiertage je Land aus einer Liste (Zeiten, Bauantrag); Eingangs- und Allplan-Ordner nicht mehr fest im Programm (bestehende Werte übernommen)~~
- ~~Bautagebuch am Handy: Abschnitte als Kacheln (Variante C), Abschnitt einzeln öffnen, kein Pfeil/＋ je Zeile – PC unverändert~~
- ~~Ausschreibung: Ablauf des LV als schmale Leiste über den Kennzahlen (Variante B)~~
- ~~Bautagebuch am Handy: Fußleiste flach mit ＋ in der Mitte (Variante C) statt schwebendem ＋~~
- ~~Schneller laden: alle Apps packen Skripte, Stile und Daten (gzip), Bausteine mit Stand („?v=“) bleiben im Browser; langsame Anfragen (> 1 s) als Hinweis in den Fehlermeldungen (Art „langsam“)~~
- ~~Baukosten: Stufenleiste nach DIN 276 (Variante C, Punkte auf einer Linie, Petrol) statt der Karte „Wofür reichen die Daten?“~~
- ~~Zeiten am Handy, „Mein Tag“ (Mittelweg): Stechuhr oben (Kommen, Pause, Fahrt, Gehen, Ring gegen Soll), darunter die Zeiten als Liste, Antippen ändert Projekt/Tätigkeit/Zeit oder übernimmt Vorschläge~~
- ~~Zeiten am Handy: Woche und Monat & Urlaub als reine Ansicht (Tageskarten, Kalender, Urlaubsring, Wischen); Auswertung/Einstellungen nur am PC~~
- ~~Migration 0054 robust gemacht (Produktion: dienste startete bei v204 nicht)~~
- ~~Bauantrag: PDF-Vorschau springt beim Schrittwechsel an die passende Stelle (Sprungmarken im Antragspaket); nach Änderungen bleibt sie stehen~~
- ~~Bauantrag „Im PDF ausfüllen“: Klick auf ein Kästchen (z. B. Gebäudeklasse 2) sprang an den Anfang – der Bereich rechts wird nur noch beim Wechsel des Antrags neu aufgebaut~~
- ~~Ausschreibung: Vorbemerkungen der Bauplattform als Katalog in der Kopierquelle – je Abschnitt ins LV ziehen (Art V, Druck über das Druck-Layout abschaltbar)~~
- ~~Bauantrag: selbst hochgeladene Formulare löschen (Papierkorb, Rückgängig)~~
- ~~Ausschreibung: „Allgemeine Vorbemerkungen“ (eigener, recherchierter Text) als erster Baustein unter „+ aus den Baudaten einfügen …“~~
- ~~Zeiten: Aufbau wie die übrigen Apps – Navigation links mit Heftzwecke (Erfassen, Übersicht, Büro), Befehlsleiste mit Fahrt/Stoppuhr und Datum; am Handy Reiter oben~~
- ~~Honorar nach HOAI-Prüfung, erste Kleinigkeiten: Hinweis zum Umbauzuschlag nach § 6 Abs. 2 / § 36 (ohne Vereinbarung 20 %), Warnung bei fehlender Steuernummer/USt-IdNr. (§ 14 UStG), Fälligkeit auf der Schlussrechnung (§ 650g Abs. 4 BGB)~~
- ~~Startseite, Bearbeiten: „PC / Handy“ je Kachel als kleiner Umschalter mit Linien-Symbolen statt Häkchen~~
- ~~Viewer am iPhone: „Kollegen oder Externe einladen“ zeigte ein riesiges weißes Kärtchen – Kärtchen und Zeichenfläche haben jetzt eigene Namen (auch im Versand-Dialog)~~
- ~~Pläne & Dateien: Aufbau wie die übrigen Apps – Navigation links mit Heftzwecke (Pläne, Planversandliste, Alle Dateien), der Ordnerbaum als Unterpunkt unter „Alle Dateien“; Kopfzeile und Filterleiste bleiben beim Rollen stehen; „Alle Dateien“ über die ganze Breite~~
- ~~Alle Dateien: Details rechts (abdockbar) – Vorschau, Pfad, Größe, Datum; Fotos mit EXIF (Aufnahme, Kamera, Belichtung, Ort mit nächster Baustelle), PDF mit Seiten und Format, Office mit Titel und Autor; Klick wählt, Doppelklick öffnet~~
- ~~Alle Dateien: Vorschaubilder auch für Office (eingebettete Vorschau, sonst erste Seite aus dem Inhalt: Word, Excel, PowerPoint, OpenDocument, TXT, CSV); alte .doc/.xls bleiben beim Symbol~~
- ~~Bauantrag: Anlagen – Pläne aus der Planliste (Nummer, Index; Hinweis auf neueren Index), Dateien aus dem Projektordner, frei; je Anlage Abschnitt, „PDF“ oder „nur nennen“, Stand (liegt bei · wird nachgereicht · liegt Prüfingenieur vor); Nummern je Abschnitt im Inhaltsverzeichnis~~
- ~~Bauantrag: Abgabe auf Papier (Paket komplett, Pläne nur noch dazulegen – Packliste auf der letzten Seite) oder digital (Pläne als PDF, ZIP mit einer Datei je Anlage)~~
- ~~Bauantrag: Anschreiben mit ausgeschriebenen Anlagen und „Wird nachgereicht“ (umschaltbar auf „gemäß Inhaltsverzeichnis“)~~
- ~~Honorar: Kennwort für die PDFs im Projektordner (Verträge, Rechnungen – AES-256, auch ohne Plattform zu öffnen; Kennwort wird nie angezeigt)~~
- ~~Druck-Layouts nur noch in der Verwaltung – Hinweise und Knöpfe in Bauantrag, Honorar und Aufgaben entfernt~~
- ~~Zeiten: Zeittakt (5/10/15/30 min, Einstellungen) – Vorschläge und Zeiten gerundet, gleiches Projekt und gleiche Tätigkeit hintereinander automatisch eine Zeile, kurze Reste gehen im Nachbarn auf~~
- ~~Zeiten: Pause in den Einstellungen (Beginn, Dauer, immer/nur über 6 h; je Person abweichend) und als schraffierte Fläche im Zeitstrahl – verschieben, Dauer ändern, entfernen~~
- ~~Zeiten: Zeitstrahl mit Farben je Projekt, Quelle als Zeichen und Streifen; Blöcke verschieben und an den Rändern ziehen (rastet auf den Takt, Nachbar wird gekürzt); Klick in eine Lücke: Zeit eintragen, Pause hier, Kommen/Gehen; Ablage unter dem Strahl (eigene Projekte zuerst, Büro, Pause, freie Beschriftung) zum Hineinziehen; Rückgängig über den Stand davor~~
- ~~Zeiten, Woche: ein Strahl je Tag untereinander (Mo–Fr oder Mo–So), auch dort ziehen und ablegen~~
- ~~Startseite: Projektauswahl der Widgets – erst die eigenen, dann die anderen Projekte~~
- ~~Heftzwecke der Navigation neu (Linie, Vorschlag Nr. 5), etwas größer, Farbe aus dem Stil (--pin bzw. Akzentfarbe); gelöst schräg und blass, angeheftet gerade und leicht gefüllt~~
- ~~Zeiten: Rückgängig auch beim Ändern und Eintragen einer Zeit, bei Kommen/Gehen/Pause/Abwesenheit und beim Wieder-Öffnen eines Tages~~
- ~~Pfeil-Kästen als Baustein (bp.css .bp-stufen): Honorar-Ablauf und Bauantrag-Schritte gleich – im Bauantrag grün = vollständig, rot = offen, gewählter Schritt kräftig~~
- ~~Honorar und Bauantrag: „＋ Neuer Auftrag“ bzw. „＋ Neuer Antrag“ links in der Navigation wie „＋ Neues LV“ in der Ausschreibung (statt „Neu“ in der Befehlsleiste)~~
- ~~Ein Druck für alles: Druckseite im Baukasten (druck.js, bpDruck – links ankreuzen, rechts Vorschau, dann Viewer mit Drucken/Teilen); Honorar (Angebot/Aufstellung, Vertrag, Rechnungen) und Bauantrag (Anschreiben, Deckblatt, Trennblätter, Unterlagen) nutzen sie~~
- ~~Bauantrag als komplettes Paket (Schritt 6): Anschreiben an die Bauaufsicht (Behörde aus den Adressen, Ansprechpartner:in, Aktenzeichen, Ausfertigungen, Text mit Vorschlag; Druck-Layout „Bauantrag – Anschreiben“), Deckblatt mit Inhaltsverzeichnis und Seitenzahlen, Häkchenliste weiterer Unterlagen mit Ergänzen, fünf Trennblätter (umbenennen, an/aus, ziehen); Knöpfe in Schritt 1 nebeneinander~~
- ~~Bauantrag: direkt im PDF ausfüllen (Ansicht „Im PDF ausfüllen“ rechts und über die Leiste) – Werte, die zum Antrag gehören, gehen in Maske, Quellen und alle Vordrucke (live), andere bleiben beim Vordruck; Zuordnung an der echten Anlage I/1 verbessert (Bauaufsicht, Grundstücksadresse, Telefon/E-Mail, Ort/Datum, Gebäudeklasse und Antragsart als Optionsfeld, Kästchen der vorliegenden Unterlagen)~~
- ~~PDF-Viewer: weiße runde Fläche über dem Dokument behoben (Zeichenfläche bekam den Stil der Kollegen-Chips)~~
- ~~Bauantrag Schritt 1 „Verfahren & Formulare“: amtliche Vordrucke wählen (Vorschlag nach Verfahren und Vorhaben), eigene Unterlagen (PDF, Scan, Foto → PDF; ausfüllen oder nur beilegen), Reihenfolge ziehen, „Platzieren …“ für Vordrucke ohne Felder und Scans (gemerkt je Datei), Antragspaket als ein PDF mit Inhaltsverzeichnis; Textüberlauf in der Schrittleiste behoben~~
- ~~Honorarrechnung als richtiger Brief: Briefkopf, Absenderzeile, Anschrift im Fenster, Datum/Bearbeiter, Betreff nach DIN 5008 aus dem Druck-Layout „Honorarrechnung“ (wie die Rügen), Bankverbindung und Steuernummer; Befehlsleiste „Rechnung“ und „Vertrag“~~
- ~~Honorar: Architektenvertrag als PDF aus dem beauftragten Stand (Parteien, Leistungen je LPh, Honorar, Zahlungen nach § 15 HOAI, Termine, Versicherung, weitere Vereinbarungen), in der Vorschau unterschreiben (auch am Handy), unterschriebene Fassung gespeichert und im Projektordner abgelegt („… Honorar + Vertrag“); Ablage im eigenen Vertragsverzeichnis folgt mit Punkt 11~~
- ~~Honorar-Rechnungen: Muster der Rechnungsnummer, Zahlungsziel und Texte einstellbar (Zahnrad → Diese App), gestellte Rechnung automatisch im Projektordner, To-do „Honorarrechnung überfällig“~~
- ~~„Pläne & Dateien“ → „Alle Dateien“: ganzer Projektordner mit Filtern (Art, Ordner, Zeitraum, Suche), Größe Liste/S/M/L, Vorschaubilder im Hintergrund (Dienste, nur wenn wenig los ist; angesehene zuerst), keine Kopien – Originale direkt vom Dateiserver im gemeinsamen Viewer~~
- ~~Bauantrag: selbst hochgeladene Vordrucke ohne Anlage-Nummer werden am Dateinamen erkannt („mb2026-220-anlage1.2“ → I/2) und im Antrag benutzt~~
- ~~Honorar: Abschlags- und Schlussrechnungen nach § 15 HOAI – erbrachte Leistung kumuliert (LPh × erbracht %, Umbau, Nebenkosten; Pauschal nach Anteil, Aufwand nach Zeiten) minus bisherige Rechnungen; Entwurf → stellen (eingefroren) → bezahlt/storniert; PDF mit Blatt 1 Rechnung auf dem Briefbogen und Blatt 2 Erläuterung~~
- ~~Bauantrag: NRW-Vordrucke jetzt von der Seite der Architektenkammer (AKNW, Fassung 09/2026 nach dem 3. Änderungsgesetz), ersatzweise recht.nrw.de; Quelle für NRW in der Verwaltung änderbar~~
- ~~Bautagebuch am Handy: Kopfzeile kompakt (Bericht breit, Suche als Lupe, Standort), „PDF“ in der Akzentfarbe hervorgehoben~~
- ~~Startseite am Handy, Post: Zeit, Erinnerung und App unter den Text – Art und Betreff werden nicht mehr abgeschnitten~~
- ~~Projektordner prüfen: auch Dateinamen (fremdes Kürzel → umbenennen, ohne Kürzel → Kürzel davor; Fotos bleiben frei; nicht vorgewählt); am Handy nur ansehen~~
- ~~Bautagebuch am Handy: ＋ kleiner und im Stil der Leiste unten~~
- ~~Kommunikation: ein Knopf „＋ Neu“, Leiste mit allen Arten oben in jedem Dialog (Nachricht, Vorgang, Abnahme, Rügen, Pläne, Datei) – Wechsel nimmt Firma/Empfänger, Betreff, Text mit, auch app-übergreifend~~
- ~~Abnahme: „Mängel in der anliegenden Mängelliste“ wird automatisch nach den eingetragenen Mängeln gesetzt~~
- ~~Bauzeitenplan, Planungsassistent Schritt für Schritt: bei „gemischt“ wird die Bauweise jedes Geschosses als eigener Schritt abgefragt~~
- ~~Bauzeitenplan, Leistungskatalog: Stände sichern (benannt, geschützt), vergleichen, in Teilen zurückholen (vorher automatisch gesichert), als Datei; Stand vor Einführung automatisch gesichert~~
- ~~Bauzeitenplan, Gewerke & Firmen: Klick auf das Farbkästchen öffnet „Gewerke & Farben“ mit dieser Zeile~~
- ~~Bauzeitenplan, Leistungskatalog und Gewerke & Firmen: Hinweistext einzeilig (ⓘ, ganz beim Darüberfahren) – Kopf spart Platz~~
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
- ~~Ablegen (Datei ins Fenster ziehen, am PC): ähnliche Ordner 1–3 Stufen tief erkennen (ohne Kürzel/Nummer, Synonyme), Vorschlag laut Projektvorlage, Inhalt zusammenführen (gleiche Namen „(2)“, gleicher Inhalt bleibt liegen), leer gewordene Ordner auf Wunsch löschen, je Projekt merken, Rückgängig~~
- ~~Warte-Hinweis (z. B. „Die KI arbeitet …“) mit „Abbrechen“ – die Seite wartet dann nicht mehr~~
- ~~Bauzeitenplan: Fortschritt in der Leiste aufgeräumt – Stufen und Wert oben, Schieber darunter, eigener Abstand zur nächsten Gruppe~~
- ~~Rückgängig-Dock setzt sich beim Erscheinen selbst dorthin, wo es am wenigsten verdeckt (unten links/Mitte/rechts, oben rechts), leicht durchsichtig~~
- ~~Bauzeitenplan-Assistent: Bauweise je Geschoss nur noch bei „gemischt“~~
- ~~Bauantrag-Formulare: alle auf dem Portal des Landes veröffentlichten Vordrucke werden gelistet und zwischengespeichert (auch andere Länder); ist das Portal nicht mehr lesbar (weg, keine PDFs, deutlich weniger als bisher), bleibt der Bestand, Meldung als To-do und Formulare selbst hochladen bzw. ersetzen~~
- ~~Projektfeld öffnet überall die Standardmaske (große Projektauswahl); Sondereinträge der App (ohne Projekt, erkannt …) stehen darin oben; Tippen beginnt die Suche~~
- ~~Bautagebuch: „>“ öffnet auch leere Bereiche (gleich mit Eingabezeile, Bilder mit Hinweis), rundes Plus an den Bereichen, oben „Neuer Tagesbericht“~~
- ~~Entwürfe einzeln und gesammelt löschen: Kästchen je Entwurf, „alle markieren“, „Markierte löschen“ mit Rückgängig – Abnahme-Entwürfe in der Kommunikation, Schreiben-Entwürfe in Aufgaben & Mängel~~
- ~~Bauantrag: Ausgabe nur noch als amtliches Formular (NRW I/1, I/2 oder I/3 je Verfahren), Felder automatisch an Name/Tooltip erkannt und ausgefüllt, Gebäudeklasse/Sonderbau/Vorbescheid angekreuzt; eigenes Layout entfernt~~
- ~~Rückgängig-Dock startet unten links statt mittig~~
- ~~Bauantrag: Gebäudeklasse als Skizzen wählbar (GK 1–5 mit 7-m- und 13-m-Linie)~~
- ~~Bauantrag: amtliche Formulare – NRW (Anlagen VV BauPrüfVO, recht.nrw.de) täglich geprüft und vorgehalten, Liste mit Fassung und Stand, neu/geändert als To-do bis „gesehen“; andere Länder auf Abruf (Quelle eintragen, nur Verwaltung)~~
- ~~Bauantrag: Felder bündig und sinnvoll breit angeordnet; Änderungen gehen zurück in Projektdaten (neue Gruppe „Bauantrag“: Behörde, Grundstück, Planungsrecht, Gebäudeklasse, Kenndaten), Adressen des Bauherrn (wird bei Bedarf angelegt), Projektanschrift, Mein Konto bzw. Büro – Kennzeichen „⇄ Projektdaten“ am Feld~~
- ~~Auswahl wie die Projektauswahl auch für Firmen und Aufträge (Baustein data-bp-auswahl): Abnahme „Auftrag wählen“ als Suchfeld, darunter zugeklappt „Aus anderen Projekten“; Mängel- und Terminrüge: Firmen mit Gewerk/offenen Mängeln, „Weitere Firmen aus den Adressen“ zugeklappt~~
- ~~Startseite, Post: Mails mit Häkchen als erledigt abhaken (statt ✕ ausblenden), unten „✓ Erledigt (n)“ durchgestrichen, Rückgängig~~
- ~~Live-Aktualisierung: Änderungen anderer erscheinen ohne Neuladen (Bautagebuch, Aufgaben, Startseite-To-dos, Kommunikation, Adressen, Honorar, Bauantrag), nie während man tippt; kleine Notiz „⟳ Aktualisiert“~~
- ~~Projektfeld überall wie die große Projektauswahl: Adresse unter dem Namen, Suche auch nach Adresse/Bauherr, Entfernung, unten „＋ Neues Projekt“, „📍 Nach Standort“, „⤢ Alle“; jetzt auch in Bauantrag, Honorar und Zeiten~~
- ~~„＋ Neu“-Leiste in Dialogen kompakt (keine Knöpfe über die volle Breite)~~
- ~~Bautagebuch: Fotos einzeln hochladen – beliebig viele auf einmal, „Foto 7 von 23“, bis 100 MB je Foto, eindeutige Meldung welches Foto warum nicht ging, „Nochmal“~~
- ~~Honorar mit Ablauf: Stufen Anfrage → Angebot → Auftrag → Vertrag → Abrechnung → Abgeschlossen (dazu abgelehnt) als Leiste, je Stufe eine Karte mit Angaben, links nach Stufe gruppiert mit Hinweisen (seit n T., v2, ohne Vertrag), To-dos: Anfrage beantworten, nachfassen, Bindefrist, Vertrag fehlt~~
- ~~Handy: kleiner Rückgängig-Knopf nach dem Dock unten links, kleiner und durchscheinend~~
- ~~Neue App „Bauantrag“: Assistent in 6 Schritten (Verfahren, Beteiligte, Grundstück, Vorhaben & Kenndaten, Bauvorlagen, Prüfen & PDF), Werte aus Projektdaten, Adressen, Kataster, Baukosten, Büro und Mein Konto mit Quelle und ↺, Entwurfsverfasser persönlich/Büro, Bauvorlagen aus dem Projektordner erkannt, PDF im eigenen Layout~~
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
