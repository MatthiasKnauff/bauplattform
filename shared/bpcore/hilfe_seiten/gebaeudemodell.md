# Gebäudemodell: Verknüpfungen

Ein Modell – überall sichtbar, geändert nur dort. Die Kennzeichen (A1, B2, C3, R5, IV …) sind dieselben wie auf dem Whiteboard „Gebäudemodell – Verknüpfungen“ vom 20.11.2026; wer auf eines verweist, meint genau diesen Kasten.

## A – Eingänge
- **A1 Assistent**: Angaben zum Gebäude (Bauart, Größe, Geschosse, Dach, Gebäudeteile).
- **A2 IFC-Datei**: der Plan aus „Pläne & Dateien“ (oder vom Gerät).

Beide liefern einen Planstand in B. Es gilt immer genau einer (★).

## B – Gebäudemodell
- **B1 Angaben** des Assistenten.
- **B2 Bauteile** mit ihrem Aufbau (Vorlage aus dem Baukasten, Schichten, Dicken).
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
- **II Skizze aus Körpern** – Planstand „Assistent“, anklickbar wie ein Plan (dieselbe 3D-Ansicht B5).
- **III IFC einlesen** – neuer Planstand als Entwurf.
- **IV Abgleich** – Skizzen-Bauteil ↔ Plan-Bauteile bestätigen; was keinen Partner findet, steht in einer kurzen Liste zum Zuordnen.
- **V Planstand „IFC“ gilt** – Aufbau und Ausführungseinheiten wandern mit. C1–C3 sehen nur geänderte Mengen als Hinweis, C4 bleibt stehen, der alte Planstand bleibt zum Zurückspringen.

## Stand
Umgesetzt: R4 für den Wärmeschutz (Hülle nur aus B2), der erste Fall von R3 (Dämmdicke aus C2 nach B2) und R2 für C2 und das Gebäudemodell (B5 und Liste wählen sich gegenseitig). B5 groß als Seite „Bauteile“ des Gebäudemodells: jede Änderung an B2 steht mit App, Person und Datum im Verlauf (Färbung „Änderungen“, Zeitschieber, Zurücknehmen). Noch offen: feste Kennung je Bauteil (Voraussetzung für IV, V und R7), Zuordnen in 3D (B5) im Gebäudemodell, R7 in der Ausschreibung.
