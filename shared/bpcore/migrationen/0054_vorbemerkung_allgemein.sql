-- Allgemeine Vorbemerkungen (eigener Text, recherchiert über VOB/A/B/C, BGB, BGH-Urteile; keine Katalogsätze) als Baustein in „+ aus den Baudaten einfügen …“, ganz oben
INSERT INTO pdb_vorbemerkung(key, titel, text, sort) VALUES
  ('avb', 'Allgemeine Vorbemerkungen', 'Allgemeine Vorbemerkungen

1 Vertragsgrundlagen
Es gelten in dieser Reihenfolge: das Auftragsschreiben mit Verhandlungsprotokoll, die Leistungsbeschreibung mit den Plänen, die Besonderen und Zusätzlichen Vertragsbedingungen, die VOB/C (ATV DIN 18299 ff.) und die VOB/B, jeweils in der bei Angebotsabgabe geltenden Fassung. Innerhalb der Leistungsbeschreibung geht die auf dieses Bauvorhaben bezogene, speziellere Angabe der allgemeineren vor. Unklarheiten oder Widersprüche bitte vor Angebotsabgabe schriftlich mitteilen.

2 Preise
Die Einheitspreise enthalten alle Leistungen der Position einschließlich der Nebenleistungen nach Abschnitt 4.1 der jeweiligen ATV. Besondere Leistungen nach Abschnitt 4.2 sind nur enthalten, wenn sie als Position oder in der Positionsbeschreibung ausdrücklich genannt sind; sonst werden sie nach § 2 VOB/B vergütet. Genannte Fabrikate gelten als Beispiel mit dem Zusatz „oder gleichwertig“; ein anderes Fabrikat ist im Angebot zu benennen, die Gleichwertigkeit ist auf Anforderung nachzuweisen. Alle Preise netto zuzüglich Umsatzsteuer.

3 Baustelle
Die Baustelle kann nach Absprache besichtigt werden. Was der Auftraggeber bereitstellt (Zufahrt, Lagerflächen, Strom, Wasser, Sanitär, Gerüste, Hebezeuge), steht in den projektbezogenen Angaben; alles andere bringt der Auftragnehmer selbst mit. Der Auftragnehmer hält seinen Arbeitsbereich sauber und entsorgt seine Abfälle und Verpackungen laufend. Die Vorgaben des Sicherheits- und Gesundheitsschutzplans und der Baustellenordnung sind einzuhalten.

4 Ausführung
Maße und Vorleistungen sind vor Beginn am Bau zu prüfen; Bedenken sind schriftlich vor der Ausführung anzuzeigen (§ 4 Abs. 3 VOB/B). Werk- und Montagepläne, Muster und Datenblätter sind vorzulegen, soweit die Leistungsbeschreibung sie verlangt, und vor der Ausführung freigeben zu lassen. Die Arbeiten sind mit den anderen Gewerken abzustimmen. Die eigene Leistung ist bis zur Abnahme zu schützen (§ 4 Abs. 5 VOB/B).

5 Termine
Es gelten die Vertragsfristen und der Bauzeitenplan des Auftraggebers. Behinderungen sind unverzüglich schriftlich anzuzeigen (§ 6 Abs. 1 VOB/B).

6 Änderungen und zusätzliche Leistungen
Geänderte oder zusätzliche Leistungen sind vor Beginn der Ausführung anzukündigen und mit einem Nachtragsangebot auf Grundlage der Urkalkulation zu belegen (§ 2 Abs. 5 und 6 VOB/B; ohne VOB/B gelten §§ 650b, 650c BGB). Stundenlohnarbeiten werden nur nach vorheriger Anordnung vergütet; die Stundenzettel sind wöchentlich vorzulegen (§ 15 Abs. 3 VOB/B).

7 Aufmaß und Abrechnung
Abgerechnet wird nach Abschnitt 5 der jeweiligen ATV. Das Aufmaß wird gemeinsam genommen; wo die Ausführung den Plänen entspricht, darf nach Plänen abgerechnet werden. Rechnungen sind prüfbar mit den Positionsnummern der Leistungsbeschreibung und den Aufmaßblättern einzureichen, auf Wunsch zusätzlich als GAEB-Datei.

8 Unterlagen und Abnahme
Vor der Abnahme übergibt der Auftragnehmer die Nachweise, die zur Leistung gehören: Leistungserklärungen, Prüf- und Messprotokolle, Bestandspläne, Bedienungs- und Wartungsanleitungen sowie Fotos verdeckter Bauteile. Die Abnahme erfolgt förmlich (§ 12 Abs. 4 VOB/B).

Projektbezogene Angaben (nach Abschnitt 0 der ATV DIN 18299)
0.1 Baustelle
– Lage, Zufahrt, Lagerflächen: [ ]
– Vom Auftraggeber gestellt (Strom, Wasser, Sanitär, Container): [ ]
– Gerüste und Hebezeuge (wer stellt, wie lange): [ ]
– Baugrund, Grundwasser, Schadstoffe, Gutachten: [ ]
– Nachbarschaft, Leitungen, Schutz von Bäumen und Flächen: [ ]
– SiGeKo, SiGe-Plan, Baustellenordnung: [ ]
0.2 Ausführung
– Bauzeit, Zwischentermine, Arbeitszeiten: [ ]
– Bauen im Bestand oder unter Betrieb, Schutz vorhandener Bauteile: [ ]
– Werkplanung, Bemusterung, Freigaben: [ ]
0.3 Abweichungen von den ATV: [ ]
0.4 Nebenleistungen und Besondere Leistungen, die gesondert vergütet werden: [ ]
0.5 Abrechnungseinheiten, wenn abweichend: [ ]', -1)
ON CONFLICT (key) DO UPDATE SET titel=EXCLUDED.titel, text=EXCLUDED.text, sort=EXCLUDED.sort;
