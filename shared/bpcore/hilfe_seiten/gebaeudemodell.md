# Gebäudemodell: Verknüpfungen

Ein Modell – überall sichtbar, geändert nur dort. Die Kennzeichen (A1, B2, C3, R5, IV …) sind dieselben wie auf dem Whiteboard „Gebäudemodell – Verknüpfungen“ vom 20.11.2026; wer auf eines verweist, meint genau diesen Kasten.

## A – Eingänge
- **A1 Assistent**: Angaben zum Gebäude (Bauart, Größe, Geschosse, Dach, Gebäudeteile) – als Fragen oder als **Baukasten** (dasselbe Gebäude per Klick und Ziehen: Geschosse, Keller, Staffelgeschoss, Anbauten, Dächer, Gauben, Fenster und Türen). Beide füllen dieselben Angaben.
- **A2 IFC-Datei**: der Plan aus „Pläne & Dateien“ (oder vom Gerät).

Beide liefern einen Planstand in B. Es gilt immer genau einer (★).

## B – Gebäudemodell
- **B1 Angaben** des Assistenten.
- **B2 Bauteile** mit ihrem Aufbau (Vorlage aus dem Baukasten, Schichten, Dicken).
- **Korb** der Aufbauten je Projekt: jedes Bauteil aus dem Gebäude-Baukasten ist fest mit einem Aufbau im Korb verknüpft. Tauschen im Korb ändert alle verknüpften Bauteile; „Kopie“ macht eine eigene Fassung für Abweichungen.
- **B3 Ausführungseinheiten**, z. B. „Dach samt Gaube“ – so baut der Bauzeitenplan zusammen.
- **B4 abgelegte Ergebnisse** der Apps: Kosten-Stand, Termine, Nachweis.
- **B5 3D-Ansicht** – in jeder App daneben, anklickbar. Was dort geändert wird, landet in B.

## C – Apps
- **C1 Kosten** – Preise aus B2.
- **C2 Wärmeschutz** – U-Werte und Nachweis aus B2.
- **C3 Ausschreibung** – LV-Texte aus B2.
- **C4 Bauzeitenplan** – Leistungen aus B1 und B3.
- **C5 Honorar** – anrechenbare Kosten aus B4.
- **C6 Bauantrag** – Nachweis und Flächen aus B4.

C1–C4 holen Bauteile oder Angaben (grün), C5 und C6 ein abgelegtes Ergebnis (lila). Bautagebuch und Bauherrenportal lesen nur die Termine aus B4.

## Regeln
- **R1** Ein Gebäudemodell (B) je Projekt; A1 oder A2 liefert den Planstand, es gilt immer einer.
- **R2** Die 3D-Ansicht (B5) liegt in jeder App C1–C6 daneben, anklickbar, mit eigener Färbung.
- **R3** Jede Änderung an einem Bauteil (B2) landet direkt in B – egal aus welcher App C1–C6.
- **R4** Keine App C liest in den Daten einer anderen; Ergebnisse liegen in B4.
- **R5** C1 erzeugt aus B2 die Preise, C2 die U-Werte, C3 die LV-Texte, C4 aus B1 und B3 die Leistungen.
- **R6** Was in C1–C6 von Hand angepasst ist, bleibt stehen und bekommt einen Hinweis.
- **R7** C3 im Entwurf schreibt mit; verschickt → Bieterrundschreiben, vergeben → Nachtrag, beides als Entwurf.
- **R8** Zwei Etiketten je Bauteil: Aufbau (B2 → C1, C2, C3) und Ausführungseinheit (B3 → C4).

## Von der Skizze zum Plan
- **I Assistent** – z. B. Einfamilienhaus, Keller, Anbau, Satteldach, Gaube.
- **II Skizze aus Körpern** – Planstand „Assistent“, anklickbar wie ein Plan (dieselbe 3D-Ansicht B5). Gezeichnet im Gebäude-Baukasten; Mengen gemessen statt geschätzt.
- **III IFC einlesen** – neuer Planstand als Entwurf.
- **IV Abgleich** – Skizzen-Bauteil ↔ Plan-Bauteile bestätigen; was keinen Partner findet, steht in einer kurzen Liste zum Zuordnen.
- **V Planstand „IFC“ gilt** – Aufbau und Ausführungseinheiten wandern mit. C1–C3 sehen nur geänderte Mengen als Hinweis, C4 bleibt stehen, der alte Planstand bleibt zum Zurückspringen.

## Stand
Umgesetzt: R4 für den Wärmeschutz (Hülle nur aus B2), der erste Fall von R3 (Dämmdicke aus C2 nach B2) und R2 für C2 und das Gebäudemodell (B5 und Liste wählen sich gegenseitig). B5 groß als Seite „Bauteile“ des Gebäudemodells (den Reiter „Änderungen“ mit Zeitschieber gibt es seit 21.11.2026 nicht mehr – zurück und wieder über Rückgängig, das sagt, was sich geändert hat). Die Seite „Verknüpfungen“ zeigt genau dieses Bild (A → B → C, Weg I–V mit dem aktuellen Schritt, Regeln); eingestellt wird je App im Feld rechts. Gebäude-Baukasten (II) mit Korb: Planstand „Assistent“ aus der gezeichneten Geometrie, Fenster mit Rahmen, Verglasung und Uw als Vorgabe. Seit 21.11.2026 (Mock „Gebäudemodell schlank“): eine 3D-Ansicht für B5 – ohne Plan baut man darin mit dem Baukasten (II), mit IFC-Plan zeigt sie den Plan (V); dazu der Grundriss je Geschoss, in dem Flächen ohne Raum per Klick als Raum ergänzt werden. Seit 21.11.2026 (Mock „Baukasten wie 3D“): der Baukasten (II) zeigt sich in derselben 3D-Ansicht wie der Plan (V) – Bauteile mit Dicke aus dem Aufbau, Befehle rechts und per Rechtsklick, Bausteine aufs Modell ziehen, Maße an Griffen; „Neuer Planstand …“ fragt „Wie willst du beginnen?“ (Baukasten · Planung · Datei); ein Planstand, der nicht gilt, ist überall nur zum Ansehen. „Mit der Planung“ (21.11.2026) baut das ganze Gebäude aus dem Assistenten (I → II) im Baukasten – alle Teile, Aufstockung oben drauf, Mengen aus der Geometrie. Seit 21.11.2026 durchdringen sich die Körper im Baukasten nicht mehr (Dachüberstand endet am Nachbarn, Ziehen hält an), Giebel und Gaubenwände zählen zur Außenwand. Noch offen: Baukasten-Angaben bei einem später eingelesenen IFC als Vorschlag über den Abgleich (IV), feste Kennung je Bauteil (Voraussetzung für IV, V und R7), Zuordnen in 3D (B5) im Gebäudemodell, R7 in der Ausschreibung.
