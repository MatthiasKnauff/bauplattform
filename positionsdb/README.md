# Positionsdatenbank (Hochbau)

Eigene Baupositionsdatenbank der Bauplattform, ähnlich aufgebaut wie kommerzielle Baudatenbanken: Leistungsbereich → Gruppe → Grundposition
→ Variante → Ausführung (rund 64.000 Positionen in 66 Leistungsbereichen, Langtext = Grundtext + Folgetext),
je Position Kurztext, Langtext, Einheit, DIN-276-Kostengruppe (3. Ebene) und eine Preisspanne (von – mittel – bis, netto).
Gedacht für die Kostenschätzung (Baukosten-App) und als Textbaustein-Katalog für Leistungsverzeichnisse (Ausschreibung/Vergabe).

Die Texte sind selbst formuliert, und die Preise sind selbst kalkuliert. Übernommen wurde nichts aus Sirados, Heinze, StLB-Bau oder BKI.
Nur die Nummerierung der Leistungsbereiche lehnt sich an das StLB-Bau an, damit LVs vertraut aussehen.

## Inhalt

| Datei | Zweck |
|---|---|
| `daten/lb_*.py` | Quelldaten: ein Leistungsbereich je Datei, Positionen mit Varianten (Abmessungen, Güten) |
| `gen.py` | erzeugt daraus die Migration `bautagebuch/pg_migrations/0025_positionsdb_daten.sql` und `positionsdb.csv` (nicht im Repository) |
| `daten/tga_achsen.py` | gemeinsame Ausführungsachsen der TGA-Leistungsbereiche |
| `../bautagebuch/pg_migrations/0023_positionsdb.sql` | Tabellen `pdb_*` in `bauportal_db` |

## Aufbau einer Datendatei

Je Grundposition: `kurz`, `lang` (mit `{Platzhaltern}`), `einheit`, `kg`, `h` (Zeitansatz h/E), `mat` (Stoff €/E), optional `geraet`, `gen`,
`lohn` (abweichendes Gewerk), `tags`, `hinweis`.
`varianten` setzen die Platzhalter (z. B. Wanddicke) – je Variante ein Grundtext.
`achsen` sind Ausführungsoptionen (z. B. Festigkeitsklasse, Bestand, Kleinflächen) mit Kurztext-Zusatz `k`, Folgetext `t` und Wirkung auf den Preis
(`fh`/`fm`/`fg` Faktoren, `h`/`mat`/`geraet` Zuschläge); jede Kombination ist eine Position. Code: `LB.GG.PPP.VVAAA`.

## Preisbildung

```
EP mittel = Zeitansatz [h/E] × Verrechnungslohn des Gewerks [€/h] + (Stoff + Gerät) [€/E] × 1,12
EP von/bis = EP mittel × Faktor der Genauigkeitsklasse
```

* **Preisstand 11/2026**, netto ohne MwSt., Bundesdurchschnitt, übliche Mengen (kein Kleinstauftrag).
* **Verrechnungslöhne** je Gewerk (Tabelle `pdb_lohn`, z. B. Rohbau 68 €/h, Maler 55 €/h, Elektro 70 €/h): Grundlage ist der Ecklohn Bau
  von 24,60 €/h (Gesamttarifstundenlohn Lohngruppe 4: 26,05 €/h, seit 01.04.2026 bundeseinheitlich), plus Zuschläge.
  Die Werte liegen in der für 2026 veröffentlichten Spanne der Handwerker-Stundensätze von 45 bis 80 €/h.
* **Indexbasis**: Baupreisindex Wohngebäude August 2026 = 141,7 (2021 = 100), +5,5 % zum Vorjahr (Destatis, PM 360 vom 09.10.2026).
  Fortschreiben: `EP × Index_neu / 141,7`.
* **Genauigkeit**
  * A: Standardleistung, etwa −15 % / +20 %
  * B: Einfluss von Produkt oder Menge, etwa −22 % / +30 %
  * C: stark abhängig von Produkt, Menge oder Ort (Geräte, TGA, Bestand), etwa −32 % / +50 %

  Grundlage: Untersuchungen zur Bandbreite üblicher Einheitspreise im Hochbau zeigen 25 bis 50 %.
* **Kataloge aus der Ausschreibung** (z. B. sirAdos *.ava) werden mit der Destatis-Reihe aus ihrem Preisstand fortgeschrieben
  (z. B. Stand 2019: Index 90,2 → heute); der Index lässt sich je Katalog unter ⤒ Import überschreiben.
* **Regionalfaktor**: Tabelle `pdb_faktor`, die das Büro selbst pflegt (Vorgabe: Bundesdurchschnitt 1,00).
* **Eigene Preise**: Auftragspreise aus der AVA können je Position in `pdb_preis` gesammelt werden.
  Die Ansicht `pdb_position_ansicht` liefert dazu den Median.

Kurztext: höchstens 70 Zeichen (GAEB), automatisch mit üblichen Abkürzungen gebildet; die Angaben aus Varianten und Achsen bleiben
erhalten, feste Nebenangaben entfallen zuerst. Die vollständige Bezeichnung steht in `bez` (Anzeige und Suche), der ganze Inhalt im Langtext.

Einheiten: m², m³, m, St, kg, t, psch, h, Tag, Wo, Mon, l, kW, kWp sowie Vorhalteeinheiten StWo, mWo, m²Wo, m³Wo (Menge × Woche).

Die Preise sind Richtwerte für Kostenschätzung und Kostenberechnung. Sie ersetzen keine Angebotsprüfung.
Je mehr eigene Vergabepreise erfasst sind, desto belastbarer werden die Ergebnisse.

## Ändern und ergänzen

1. Datei in `daten/` bearbeiten. Gewerk, Zeitansatz `h` und Stoffpreis `mat` stellen den Preis ein.
2. `python3 positionsdb/gen.py --pruefen 012` prüft die Datei und zeigt die Preise an.
3. `python3 positionsdb/gen.py` erzeugt Migration und CSV.

Wichtig: Eine Migration läuft je Datenbank nur einmal. Spätere Katalog-Updates kommen deshalb als neue Migration (0026 …).
Diese fügt nur fehlende Codes ein (`ON CONFLICT DO NOTHING`) und aktualisiert bei Bedarf gezielt `quelle = 'katalog'`.
Eigene Positionen (`quelle = 'eigen'`) bleiben immer unberührt.

## Bauteil-Baukasten und Standardelemente

Für die Kostenberechnung nach Bauteilen (DIN 276, 3. Ebene) gibt es einen Baukasten statt starrer Elemente:

* **Vorlage** (`bauteile/kg_*.py`, Tabelle `pdb_vorlage`): ein Bauteil, z. B. „AW Mauerwerk + WDVS“ je m², mit **Schichten**
  (Tragschicht, Dämmung, Bekleidung …) und je Schicht mehreren **Optionen**.
* Jede Option hängt an Positionen dieser Datenbank mit einem **Mengenfaktor**: Menge der Position je 1 Einheit des Bauteils.
  Beispiele: Beton m³ je m² Wand = Dicke, Schalung 2 m² je m² Wand, Kimmschicht 0,36 m je m² Wand.
* **Preis** eines Aufbaus = Σ Faktor × EP (von, mittel, bis getrennt). Er stimmt also immer mit den Positionspreisen überein
  und wird mit dem Index fortgeschrieben.
* **Standardelemente** (Katalog `gk3e`, Bestandteile in `pdb_element_teil`): die üblichen Kombinationen (Optionen mit `"std": True`)
  zum schnellen Auswählen und Durchsuchen – in Baudaten, Baukosten und als Kopierquelle der Ausschreibung.
* **Kompakte Vorbemerkungen** je Leistungsbereich und Muster für Baubeschreibung/BVB/ZTV (`vorbemerkungen.py`, Tabelle `pdb_vorbemerkung`).

Verwendung:

* **Baukosten** → Bauteile & Material → „+ aus Baukasten“ (oder Material „Aufbau aus dem Baukasten …“): Vorlage und Schichten wählen,
  Preis von–mittel–bis live; mit 🧱 später ändern.
* **Ausschreibung** → „Aus Baukosten …“: Bauteile mit Aufbau werden in Einzelpositionen aufgelöst (Menge = Faktor × Bauteilmenge).
  In der Kopierquelle „Baudaten: Bauteile & Elemente“ steht je Element ein Titel mit seinen Positionen (Menge je 1 Einheit).
  LV → Vorbemerkungen → „aus den Baudaten einfügen“.
* **Baudaten**: Elemente zeigen ihre Bestandteile; je Leistungsbereich „📄 Vorbemerkungen“.

Ändern: Datei in `bauteile/` bearbeiten → `python3 positionsdb/bauteile_gen.py --pruefen kg_330.py` → `python3 positionsdb/bauteile_gen.py`
(schreibt die Migration und `bauteile.csv`). Auch hier gilt: für ein späteres Update eine neue Migrationsnummer verwenden.
