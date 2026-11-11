-- Allgemeine Vorbemerkungen (eigener Text, recherchiert über VOB/A/B/C, BGB, BGH-Urteile; keine Katalogsätze) als Baustein in „+ aus den Baudaten einfügen …“, ganz oben.
-- Robust für jede vorhandene Datenbank: Tabelle anlegen, falls sie fehlt; ohne ON CONFLICT (ältere Tabellen haben evtl. keinen Schlüssel auf „key“);
-- fehlende Bausteine der Baudaten werden ergänzt, vorhandene bleiben unverändert, „avb“ wird neu geschrieben.
CREATE TABLE IF NOT EXISTS pdb_vorbemerkung(
  key TEXT PRIMARY KEY,
  titel TEXT NOT NULL DEFAULT '',
  text TEXT NOT NULL DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0);
DELETE FROM pdb_vorbemerkung WHERE key='avb';
INSERT INTO pdb_vorbemerkung(key, titel, text, sort)
SELECT v.key, v.titel, v.text, v.sort FROM (VALUES
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
0.5 Abrechnungseinheiten, wenn abweichend: [ ]', -1),
  ('bb', 'Baubeschreibung (Muster)', 'Bauvorhaben
– Bezeichnung: [Bauvorhaben], [Straße, PLZ Ort], Flurstück [Nr.]
– Bauherr/Auftraggeber: [Name, Anschrift]; vertreten durch: [Architekt/Projektsteuerer]
– Art der Maßnahme: [Neubau/Umbau/Sanierung/Erweiterung] eines [Gebäudetyp] mit [Geschosse], BGF ca. [m²]
– Konstruktion in Kürze: [Gründung, Tragwerk, Dach, Fassade, Ausbau, TGA]

Lage und Zugänglichkeit
– Zufahrt über [Straße]; zulässige Fahrzeuge bis [t] Gesamtgewicht, Durchfahrtshöhe [m]
– Lager- und Arbeitsflächen gemäß Baustelleneinrichtungsplan [Plan-Nr.]; darüber hinaus keine Flächen verfügbar
– Nutzung öffentlicher Verkehrsflächen nur mit verkehrsrechtlicher Anordnung; Beantragung durch [AN/AG]
– Nachbarbebauung: [Abstände, empfindliche Nutzungen wie Schule, Klinik, Tierhaltung]

Bestand und Baugrund
– Baugrundgutachten [Verfasser, Datum]; Homogenbereiche und Grundwasserstand siehe dort
– Bekannte Leitungen und Anlagen: [Spartenpläne]; Erkundung vor Erdarbeiten durch den AN
– Schadstoffe: [Gutachten/keine Erkenntnisse]; Kampfmittel: [Freigabe/Erkundung erforderlich]
– Bestandsgebäude bleiben [in Betrieb/geräumt]; Betriebsabläufe des Nutzers sind zu berücksichtigen

Organisation der Baustelle
– Bauzeit: [Beginn] bis [Fertigstellung]; Zwischentermine siehe BVB und Terminplan
– Arbeitszeiten: werktags [7–19 Uhr]; lärmintensive Arbeiten nur [Zeitfenster]
– Baustrom und Bauwasser: Übergabepunkte [Ort]; Verbrauchskosten [Zähler/Umlage nach BVB]
– Sanitär- und Aufenthaltseinrichtungen: [vom AG gestellt/vom AN vorzuhalten]
– SiGe-Koordinator: [Name]; SiGe-Plan und Baustellenordnung sind Vertragsbestandteil
– Weitere Unternehmer arbeiten zeitgleich; gegenseitige Rücksichtnahme und Abstimmung über die Bauleitung

Planungsgrundlagen
– Baugenehmigung [Az., Datum] mit Auflagen; Brandschutzkonzept [Verfasser, Datum]
– Statik und Positionspläne [Verfasser]; Wärmeschutz-/GEG-Nachweis; Schallschutznachweis
– Ausführungspläne gemäß Planliste [Stand]; maßgebend sind die zur Ausführung freigegebenen Pläne
– Maße sind vor Beginn am Bau zu prüfen; Widersprüche sind vor Ausführung der Bauleitung zu melden', 1),
  ('bvb', 'Besondere Vertragsbedingungen (Muster)', 'Vertragsgrundlagen
– Rangfolge bei Widersprüchen gemäß VOB/B § 1 Abs. 2: Leistungsbeschreibung, diese BVB, ZVB, ZTV, VOB/C, VOB/B
– Pläne und Gutachten laut Anlagenverzeichnis [Liste]; Angebotsunterlagen des AN nur, soweit ausdrücklich einbezogen

Ausführungsfristen (VOB/B § 5)
– Beginn: [Datum oder binnen 12 Werktagen nach Aufforderung]; Fertigstellung: [Datum]
– Verbindliche Zwischenfristen (Vertragsfristen): [Meilensteine mit Datum]; alle übrigen Termine des Bauzeitenplans sind Kontrollfristen
– Behinderungen sind unverzüglich schriftlich anzuzeigen (§ 6 Abs. 1); Witterung, mit der bei Angebotsabgabe zu rechnen war, gilt nicht als Behinderung

Vertragsstrafe (VOB/B § 11)
– Bei schuldhafter Überschreitung der Fertigstellungsfrist [und der Zwischenfristen …]: [0,2] % der Nettoauftragssumme je Werktag
– Insgesamt höchstens [5] % der Nettoabrechnungssumme; Zwischenfrist-Strafen werden angerechnet; Vorbehalt bis zur Schlusszahlung

Sicherheiten (VOB/B § 17)
– Vertragserfüllung: [5] % der Nettoauftragssumme, Bürgschaft eines in der EU zugelassenen Kreditinstituts, Vorlage binnen [18] Werktagen nach Auftrag
– Mängelansprüche: [3] % der Nettoabrechnungssumme; ablösbar durch Bürgschaft; Rückgabe nach [Ablauf von 2 Jahren/Ende der Verjährungsfrist]

Abrechnung und Zahlung (VOB/B §§ 14, 16)
– Aufmaße möglichst gemeinsam; prüfbare Rechnungen mit Mengenberechnung, Plänen und Positionsbezug, [digital als PDF und GAEB X31]
– Abschlagszahlungen nach Leistungsstand; Schlussrechnung innerhalb der Frist nach § 14 Abs. 3
– Freistellungsbescheinigung nach § 48b EStG ist vor der ersten Zahlung vorzulegen

Nachträge und Stundenlohn (VOB/B §§ 2, 15)
– Mehrvergütung für zusätzliche Leistungen ist vor Ausführung anzukündigen; Nachtragsangebote auf Basis der Urkalkulation
– Stundenlohnarbeiten nur nach ausdrücklicher Anordnung vor Beginn; Stundenlohnzettel [werktäglich] zur Bescheinigung vorlegen
– Verrechnungssätze: [gemäß Angebot/LB 091]

Abnahme und Mängelansprüche (VOB/B §§ 12, 13)
– Förmliche Abnahme mit Protokoll; Teilabnahmen nur für [Bauteile]; technische Zustandsfeststellungen sind keine Abnahme
– Verjährungsfrist für Mängelansprüche: [4 Jahre nach § 13 Abs. 4 / abweichend … Jahre für …]; für wartungsbedürftige Anlagenteile gilt § 13 Abs. 4 Nr. 2
– Mit der Schlussrechnung zu übergeben: Bestands- und Revisionsunterlagen gemäß ZVB

Sonstiges
– Nachunternehmer nur mit vorheriger schriftlicher Zustimmung des AG (§ 4 Abs. 8)
– Betriebshaftpflicht mit mindestens [Summe] € für Personen- und [Summe] € für Sach-/Vermögensschäden; Nachweis vor Beginn
– Einhaltung von MiLoG, AEntG und [Tariftreue-/Vergabegesetz des Landes]; Bautagebuch ist [wöchentlich] vorzulegen', 2),
  ('zvb', 'Zusätzliche Technische Vertragsbedingungen (Muster)', 'Allgemeines
– Alle Leistungen sind nach den allgemein anerkannten Regeln der Technik, der VOB/C und den behördlichen Auflagen auszuführen
– Herstellervorgaben (Verarbeitungsrichtlinien, Zulassungen) gelten ergänzend; Abweichungen nur nach schriftlicher Freigabe

Bauprodukte und Bemusterung
– Nur Produkte mit erforderlichem Verwendbarkeitsnachweis (CE mit Leistungserklärung, abZ/aBG, aBP oder vorhabenbezogene Bauartgenehmigung)
– Fabrikats- und Typangaben sind im Angebot zu nennen; „gleichwertig“ ist vom Bieter nachzuweisen
– Muster und Musterflächen nach Anforderung der Bauleitung vor Bestellung; freigegebene Muster sind verbindlich

Planung des AN und Prüfpflichten
– Werkstatt-, Montage- und Detailpläne rechtzeitig zur Freigabe vorlegen [Vorlauf … Werktage]; Freigabe entbindet nicht von der Verantwortung des AN
– Vorleistungen und Unterlagen vor Beginn prüfen; Bedenken schriftlich vor Ausführung mitteilen (VOB/B § 4 Abs. 3)
– Maße am Bau nehmen; Maßtoleranzen nach DIN 18202, sofern nicht erhöhte Anforderungen vereinbart sind
– Schlitze, Durchbrüche und Befestigungen in tragenden Bauteilen nur nach Freigabe durch den Tragwerksplaner

Brandschutz, Schall- und Wärmeschutz
– Durchdringungen von Bauteilen mit Feuerwiderstand nur mit zugelassenen Abschottungen; Kennzeichnung am Bauteil und Fotodokumentation
– Übereinstimmungserklärungen des Errichters für Bauarten sind je Bauteil zu übergeben
– Schallbrücken und Wärmebrücken sind zu vermeiden; Anschlüsse luftdicht nach Planung ausführen

Baustellenbetrieb
– Arbeitsschutz nach SiGe-Plan und Baustellenordnung; Heißarbeiten nur mit Erlaubnisschein
– Staub- und Lärmschutz so, dass angrenzende Nutzungen möglichst wenig gestört werden
– Arbeitsbereiche täglich aufräumen; eigene Abfälle getrennt nach GewAbfV sammeln und entsorgen, sofern nicht anders geregelt
– Eigene Leistungen bis zur Abnahme vor Beschädigung und Verschmutzung schützen (VOB/B § 4 Abs. 5)

Dokumentation
– Prüf-, Mess- und Inbetriebnahmeprotokolle, Leistungserklärungen, Produktdatenblätter, Wartungs- und Bedienungsanleitungen
– Bestands-/Revisionspläne in [PDF und DWG/IFC], gegliedert nach Gewerk und Geschoss; Übergabe spätestens zur Abnahme
– Einweisung des Betreibers mit Teilnehmerprotokoll, soweit technische Anlagen betroffen sind', 3),
  ('000', 'Baustelleneinrichtung', 'Geltende Regeln (in der bei Vertragsschluss gültigen Fassung)
– VOB/C ATV DIN 18299 Allgemeine Regelungen für Bauarbeiten jeder Art
– Baustellenverordnung (BaustellV) und Arbeitsstättenverordnung mit ASR
– DGUV Vorschrift 38 Bauarbeiten
– RSA 21 für Sicherungsmaßnahmen im öffentlichen Verkehrsraum

Ausführung
– Einrichtung nach abgestimmtem Baustelleneinrichtungsplan; Änderungen nur mit Zustimmung der Bauleitung
– Bauzaun, Zugänge und Beschilderung so, dass Unbefugte ferngehalten und Verkehrswege frei bleiben
– Anschlüsse für Baustrom und Bauwasser über geprüfte Verteiler bzw. Zähler; Prüfnachweise auf Verlangen vorlegen
– Vorhandene Flächen, Leitungen und Bäume vor Beginn gemeinsam dokumentieren und während der Bauzeit schützen
– Nach Räumung Ausgangszustand wiederherstellen; Schäden sind zu beseitigen

Nebenleistungen (ohne eigene Position)
– Einrichten und Räumen der eigenen Arbeitsstelle mit Geräten, Werkzeugen und Kleingerät
– Vorhalten der eigenen Unterkünfte für die Arbeitskräfte, soweit nicht vom AG gestellt
– Unfallverhütung und Sicherung der eigenen Arbeitsstellen

Besondere Leistungen (gesondert vergütet)
– Einrichtungen, die anderen Unternehmern oder dem AG zur Verfügung gestellt werden (z. B. Baukran, Büro der Bauleitung)
– Bauzaun, Baustraßen, Baustellenbeleuchtung und Verkehrssicherung, soweit in eigenen Positionen ausgeschrieben
– Vorhalten über die vereinbarte Bauzeit hinaus, wenn der AN die Verlängerung nicht zu vertreten hat

Abrechnung
– Einrichten und Räumen jeweils pauschal; Vorhalten je Woche bzw. Monat ab Betriebsbereitschaft
– Bauzaun und Verkehrssicherung nach Länge bzw. Stück und Vorhaltedauer

Hinweis für Planer
Lage von Kran, Lager- und Containerflächen im BE-Plan [Plan-Nr.] festlegen und angeben, wer Baustrom und Bauwasser bezahlt.', 4),
  ('001', 'Gerüstarbeiten', 'Geltende Regeln (in der bei Vertragsschluss gültigen Fassung)
– VOB/C ATV DIN 18451 Gerüstarbeiten
– DIN EN 12811-1 Temporäre Konstruktionen für Bauwerke – Arbeitsgerüste
– DIN EN 12810-1 Fassadengerüste aus vorgefertigten Bauteilen
– DIN 4420-1 Schutzgerüste
– TRBS 2121 Teil 1 Gefährdung von Beschäftigten durch Absturz bei der Verwendung von Gerüsten
– Aufbau- und Verwendungsanleitung bzw. Zulassung des Gerüstsystems

Ausführung
– Last- und Breitenklasse, Belaghöhen und Wandabstand nach Angabe im LV und Bedarf der nutzenden Gewerke
– Verankerung nach Aufbauanleitung; Netze oder Planen nur mit Nachweis für die erhöhte Windlast
– Untergrund auf Tragfähigkeit prüfen; Lastverteilung, Abstand zu Baugruben und Leitungen beachten
– Prüfung nach Fertigstellung und Kennzeichnung mit Gerüstkarte; Prüfprotokoll an die Bauleitung
– Umbauten nur durch den Gerüstersteller
– Ankerlöcher nach Abbau fachgerecht schließen

Nebenleistungen (ohne eigene Position)
– Prüfen und Kennzeichnen des Gerüsts nach dem Aufbau
– Vorhalten während der vereinbarten Grundstandzeit
– Erforderliche Verankerungen, Verstrebungen und Seitenschutz an der Belagfläche

Besondere Leistungen (gesondert vergütet)
– Gebrauchsüberlassung über die Grundstandzeit hinaus
– Umbauten auf Anordnung, Konsolen, Überbrückungen, Schutzdächer, Treppentürme, Netze und Planen
– Prüfungen für andere Nutzer und Gerüstabnahmen durch Sachverständige

Abrechnung
– Flächengerüste nach Länge und Höhe der eingerüsteten Fläche nach den Regeln der ATV; Öffnungen werden übermessen
– Gebrauchsüberlassung je Flächeneinheit und Woche über die Grundstandzeit hinaus; Zusatzbauteile nach Stück oder Länge

Hinweis für Planer
Grundstandzeit, Lastklasse sowie Anforderungen der Folgegewerke (z. B. WDVS-Abstand) im LV angeben.', 5),
  ('002', 'Erdarbeiten', 'Geltende Regeln (in der bei Vertragsschluss gültigen Fassung)
– VOB/C ATV DIN 18300 Erdarbeiten
– DIN EN 1997-1 mit DIN 1054 Geotechnische Bemessung
– DIN 4124 Baugruben und Gräben – Böschungen, Verbau, Arbeitsraumbreiten
– DIN 18196 Bodenklassifikation für bautechnische Zwecke
– DIN 18134 Plattendruckversuch
– Ersatzbaustoffverordnung (ErsatzbaustoffV) für Verwertung und Einbau mineralischer Stoffe

Ausführung
– Böden sind nach Homogenbereichen gemäß Baugrundgutachten beschrieben; Abweichungen unverzüglich melden
– Vor Beginn Leitungen und Kampfmittelfreiheit klären; in Leitungsnähe von Hand schachten
– Planum mit Gefälle und gegen Aufweichen geschützt herstellen; Gründungssohlen nicht auflockern
– Verfüllung lagenweise mit geeignetem Boden; Verdichtung nach geforderten Werten nachweisen
– Bei Funden (Denkmal, Kampfmittel, auffälliger Boden) Arbeiten einstellen und AG informieren

Nebenleistungen (ohne eigene Position)
– Feststellen des Zustands angrenzender Flächen und Bauwerke vor Beginn
– Eigenüberwachung der Verdichtung im üblichen Umfang
– Sichern gegen Oberflächenwasser, mit dem normalerweise zu rechnen ist

Besondere Leistungen (gesondert vergütet)
– Verbau, Wasserhaltung und Bodenaustausch
– Beseitigen von Hindernissen, Bauwerksresten und Leitungen, die nicht angegeben waren
– Entsorgung von Boden mit Schadstoffbelastung sowie Deklarationsanalysen über das vereinbarte Maß hinaus

Abrechnung
– Abtrag und Aushub nach Raummaß im Abtragszustand anhand von Aufmaß oder Profilen
– Arbeitsräume und Böschungen nur in dem nach DIN 4124 bzw. LV zulässigen Umfang
– Verfüllung nach Raummaß im verdichteten Zustand; Abfuhr nach Raummaß oder Gewicht laut LV

Hinweis für Planer
Baugrundgutachten mit Homogenbereichen und Angaben zur Verwertung des Aushubs beifügen: [Gutachten].', 6),
  ('003', 'Landschaftsbauarbeiten', 'Geltende Regeln (in der bei Vertragsschluss gültigen Fassung)
– VOB/C ATV DIN 18320 Landschaftsbauarbeiten
– DIN 18915 Bodenarbeiten im Landschaftsbau
– DIN 18916 Pflanzen und Pflanzarbeiten
– DIN 18917 Rasen und Saatarbeiten
– DIN 18919 Entwicklungs- und Unterhaltungspflege von Grünflächen
– DIN 18920 Schutz von Bäumen, Pflanzenbeständen und Vegetationsflächen bei Baumaßnahmen
– FLL-Gütebestimmungen für Baumschulpflanzen und Regel-Saatgut-Mischungen

Ausführung
– Vegetationstragschicht nur bei geeigneter Bodenfeuchte bearbeiten; Verdichtungen vor Auftrag beseitigen
– Pflanzarbeiten in der Vegetationsruhe bzw. zu den fachlich geeigneten Pflanzzeiten
– Pflanzqualität und Herkunft auf Verlangen nachweisen; Anlieferung frisch, Wurzeln vor Austrocknung schützen
– Bäume verankern und Stammschutz anbringen, soweit vorgesehen
– Schutzzonen bestehender Bäume einhalten; Wurzelbereich nicht befahren, nicht lagern
– Fertigstellungspflege bis zum abnahmefähigen Zustand

Nebenleistungen (ohne eigene Position)
– Wässern während der Pflanzarbeiten und Fertigstellungspflege
– Entfernen von Steinen, Wurzeln und Unrat aus der Bearbeitungsschicht im üblichen Umfang
– Bodenuntersuchungen zur Eignungsfeststellung in üblichem Umfang

Besondere Leistungen (gesondert vergütet)
– Entwicklungspflege und Unterhaltungspflege nach Abnahme
– Bodenverbesserung über das ausgeschriebene Maß, Baumschutzmaßnahmen nach DIN 18920
– Ersatz von Pflanzen, deren Ausfall der AN nicht zu vertreten hat

Abrechnung
– Flächen in der Abwicklung; Pflanzen nach Stück, Hecken nach Länge
– Pflegegänge je Durchgang bzw. Fläche und Pflegejahr laut LV

Hinweis für Planer
Dauer der Entwicklungspflege und Anzahl der Pflegegänge festlegen: [Jahre/Gänge].', 7),
  ('006', 'Spezialtiefbauarbeiten', 'Geltende Regeln (in der bei Vertragsschluss gültigen Fassung)
– VOB/C ATV DIN 18301 Bohrarbeiten, DIN 18303 Verbauarbeiten, DIN 18304 Ramm-, Rüttel- und Pressarbeiten
– DIN EN 1997-1 mit DIN 1054 sowie Empfehlungen des Arbeitskreises Baugruben (EAB) und Pfähle (EA-Pfähle)
– DIN EN 1536 Bohrpfähle, DIN EN 1538 Schlitzwände, DIN EN 12063 Spundwandkonstruktionen
– DIN EN 1537 Verpressanker
– DIN 4123 Ausschachtungen, Gründungen und Unterfangungen im Bereich bestehender Gebäude
– DIN 4150-3 Erschütterungen im Bauwesen – Einwirkungen auf bauliche Anlagen

Ausführung
– Ausführung nach geprüfter Statik und Ausführungsplanung; Verfahren und Geräte vor Beginn benennen
– Leitungen und Nachbarbebauung vorher erkunden; Beweissicherung abstimmen
– Abweichungen vom erwarteten Baugrund sofort melden und dokumentieren
– Protokolle je Pfahl, Anker, Lamelle bzw. Bohle (Tiefen, Mengen, Zeiten, Besonderheiten)
– Prüfungen (z. B. Ankerprüfungen, Integritätsprüfungen) nach Norm bzw. Statik und LV
– Verformungen nach Messprogramm überwachen

Nebenleistungen (ohne eigene Position)
– Herstellen des Arbeitsplanums für die eigenen Geräte im üblichen Umfang
– Führen der Herstellprotokolle und Einmessen der Ansatzpunkte nach vorgegebenen Achsen

Besondere Leistungen (gesondert vergütet)
– Probebelastungen, Erschütterungsmessungen und Beweissicherungsverfahren
– Beseitigen von Hindernissen im Baugrund, Rückbau von Verbau und Ankern
– Mehrverbrauch an Beton oder Verpressgut über das vereinbarte Maß

Abrechnung
– Pfähle und Bohrungen nach Länge von Arbeitsebene bzw. Kappebene bis Fußpunkt laut LV
– Wände nach Fläche in der Ansicht; Anker nach Stück und Länge; Gerät für Vorhalten nach Zeit

Hinweis für Planer
Baugrundgutachten, Statik und Messprogramm für Nachbarbebauung beifügen: [Unterlagen].', 8),
  ('008', 'Wasserhaltungsarbeiten', 'Geltende Regeln (in der bei Vertragsschluss gültigen Fassung)
– VOB/C ATV DIN 18305 Wasserhaltungsarbeiten
– Wasserhaushaltsgesetz und wasserrechtliche Erlaubnis für Entnahme und Einleitung
– DIN EN 1997-1 mit DIN 1054 Geotechnische Bemessung
– DIN 4124 Baugruben und Gräben
– Entwässerungssatzung bzw. Einleitbedingungen des Netzbetreibers

Ausführung
– Wasserhaltung nach Bemessung so betreiben, dass die Baugrubensohle trocken und standsicher bleibt
– Absenkziel und Wasserstände regelmäßig messen und protokollieren; Fördermengen über Zähler erfassen
– Ausfallsicherheit durch Reservepumpen bzw. Notstrom nach LV; Störungsalarm einrichten
– Einleitung nur über Absetzbecken bzw. Aufbereitung nach den Auflagen der Erlaubnis
– Setzungen benachbarter Bauwerke durch Grundwasserabsenkung beobachten
– Rückbau so, dass Brunnen und Lanzen dauerhaft verschlossen werden

Nebenleistungen (ohne eigene Position)
– Ableiten von Oberflächen- und Sickerwasser in offener Wasserhaltung im üblichen Umfang, soweit nicht ausgeschrieben
– Überwachen und Warten der eigenen Anlagen während der Betriebszeit

Besondere Leistungen (gesondert vergütet)
– Wasseranalysen, Reinigungsanlagen und Gebühren für Einleitung
– Betrieb über die vereinbarte Dauer hinaus und Vorhalten von Reservegerät auf Anordnung
– Beweissicherung an Nachbarbebauung

Abrechnung
– Einrichten und Räumen pauschal bzw. je Brunnen; Betrieb je Betriebsstunde oder Tag laut LV
– Fördermengen nach Zählerstand, Leitungen nach Länge

Hinweis für Planer
Grundwasserstände, Durchlässigkeit und Einleitstelle aus Gutachten angeben: [Werte].', 9),
  ('009', 'Entwässerungskanalarbeiten', 'Geltende Regeln (in der bei Vertragsschluss gültigen Fassung)
– VOB/C ATV DIN 18306 Entwässerungskanalarbeiten
– DIN EN 1610 Einbau und Prüfung von Abwasserleitungen und -kanälen
– DIN 1986-100 Entwässerungsanlagen für Gebäude und Grundstücke
– DIN EN 752 Entwässerungssysteme außerhalb von Gebäuden
– DWA-A 139 Einbau und Prüfung von Abwasserleitungen und -kanälen
– DIN 4124 Baugruben und Gräben

Ausführung
– Rohrauflager und Leitungszone nach Planung und Rohrherstellervorgaben; Steine im Bettungsbereich vermeiden
– Gefälle und Höhen vor Verfüllung prüfen und aufmessen
– Anschlüsse an Bestandskanäle nur mit Zustimmung des Netzbetreibers
– Dichtheitsprüfung (Luft oder Wasser) nach DIN EN 1610 abschnittsweise, mit Protokoll
– Kamerabefahrung mit Zustandsbewertung nach LV vor Abnahme
– Bestandsplan mit Lage, Höhen und Materialien übergeben

Nebenleistungen (ohne eigene Position)
– Schützen der Rohrenden gegen Verschmutzung und Eindringen von Wasser
– Einmessen und Kennzeichnen der Anschlüsse für Folgegewerke

Besondere Leistungen (gesondert vergütet)
– Wasserhaltung, Verbau und Kreuzungen von Fremdleitungen, soweit nicht in eigenen Positionen enthalten
– Wiederholungsprüfungen wegen Mängeln Dritter
– Stilllegen und Verdämmen von Bestandsleitungen

Abrechnung
– Leitungen nach Länge in der Rohrachse; Formstücke werden übermessen und gesondert nach Stück vergütet, soweit ausgeschrieben
– Schächte nach Stück mit Tiefenstaffel; Prüfungen nach Abschnitt bzw. Länge

Hinweis für Planer
Netzbetreiber, Anschlusspunkte und Prüfverfahren angeben: [Angaben des Planers].', 10),
  ('010', 'Drän- und Versickerungsarbeiten', 'Geltende Regeln (in der bei Vertragsschluss gültigen Fassung)
– VOB/C ATV DIN 18308 Drän- und Versickerungsarbeiten
– DIN 4095 Dränung zum Schutz baulicher Anlagen
– DWA-A 138 Anlagen zur Versickerung von Niederschlagswasser
– DIN 1986-100 Entwässerungsanlagen für Gebäude und Grundstücke
– DIN EN 13252 Geotextilien für Dränanlagen

Ausführung
– Dränung nur dort, wo Planung und Gutachten sie vorsehen; Ableitung des Dränwassers muss gesichert sein
– Filterstabilität zwischen Boden, Filter und Dränschicht beachten; Geotextilien überlappen
– Dränleitungen mit Gefälle verlegen; Spül- und Kontrollschächte an Richtungswechseln nach Planung
– Versickerungsanlagen erst nach Abschluss staubintensiver Arbeiten in Betrieb nehmen bzw. vor Feinteileintrag schützen
– Durchlässigkeit des Untergrunds bei Versickerung vor Ausführung bestätigen lassen
– Spülung vor Abnahme und Bestandsdokumentation

Nebenleistungen (ohne eigene Position)
– Abdecken offener Rohrenden und Schächte während der Bauzeit
– Erstspülung der fertigen Leitungen

Besondere Leistungen (gesondert vergütet)
– Bodengutachterliche Versickerungsversuche
– Austausch verschlämmter Filterschichten, wenn Dritte die Verschmutzung verursacht haben

Abrechnung
– Leitungen nach Länge in der Achse; Formstücke übermessen
– Filter- und Sickerschichten nach Raummaß oder Fläche laut LV; Schächte und Rigolen nach Stück bzw. Raummaß

Hinweis für Planer
Bemessung nach DWA-A 138 und wasserrechtliche Erlaubnis beifügen: [Unterlagen].', 11),
  ('011', 'Abscheideranlagen, Kleinkläranlagen', 'Geltende Regeln (in der bei Vertragsschluss gültigen Fassung)
– VOB/C ATV DIN 18306 Entwässerungskanalarbeiten (bzw. DIN 18381 innerhalb von Gebäuden)
– DIN EN 858-1/-2 und DIN 1999-100 Abscheideranlagen für Leichtflüssigkeiten
– DIN EN 1825-1/-2 und DIN 4040-100 Abscheideranlagen für Fette
– DIN EN 12566 Kleinkläranlagen
– DIN 1986-100 Entwässerungsanlagen für Gebäude und Grundstücke
– Allgemeine bauaufsichtliche Zulassung des Anlagentyps

Ausführung
– Größe und Typ nach Bemessung und Zulassung; Einbau nach Einbauanleitung des Herstellers
– Auftriebssicherheit bei Grundwasser nachweisen bzw. nach Herstellervorgabe sichern
– Abdeckungen in der Belastungsklasse der Verkehrsfläche
– Lüftungsleitungen und Probenahmeschacht nach Planung
– Dichtheitsprüfung und Inbetriebnahme mit Protokoll; Einweisung des Betreibers
– Unterlagen für Generalinspektion bzw. behördliche Abnahme übergeben

Nebenleistungen (ohne eigene Position)
– Erstbefüllung mit Wasser zur Inbetriebnahme
– Betriebstagebuch und Wartungsanleitung übergeben

Besondere Leistungen (gesondert vergütet)
– Wartungsvertrag und Generalinspektion vor Inbetriebnahme durch Sachkundige
– Auftriebssicherungen und Betonumhüllungen, soweit nicht im Anlagenpreis enthalten

Abrechnung
– Anlagen nach Stück je Nenngröße einschließlich Zubehör laut LV
– Aushub und Verfüllung nach den Regeln der Erdarbeiten

Hinweis für Planer
Abwasserart, Bemessungsgrößen und Auflagen der Wasserbehörde angeben: [Angaben des Planers].', 12),
  ('012', 'Mauerarbeiten', 'Geltende Regeln (in der bei Vertragsschluss gültigen Fassung)
– VOB/C ATV DIN 18330 Mauerarbeiten
– DIN EN 1996-1-1 und DIN EN 1996-2 mit Nationalen Anhängen (Bemessung und Ausführung)
– DIN EN 771 Festlegungen für Mauersteine
– DIN EN 998-2 Mauermörtel
– DIN 4108 Wärmeschutz und DIN 4109 Schallschutz im Hochbau
– DIN 18202 Toleranzen im Hochbau

Ausführung
– Steine, Mörtel und Verband nach Statik und Planung; Überbindemaß einhalten
– Keine Ausführung bei Frost; frisches Mauerwerk vor Regen, Frost und schneller Austrocknung schützen
– Horizontale Abdichtung und Trennlagen nach Planung, bevor aufgemauert wird
– Schlitze und Aussparungen möglichst im Verband herstellen; nachträgliches Fräsen nur in den zulässigen Grenzen
– Anschlüsse an Stahlbeton nach Statik (Anker, Gleitlager, Bewegungsfugen)
– Wärmebrückenarme Ausbildung von Stürzen und Deckenauflagern nach Detail

Nebenleistungen (ohne eigene Position)
– Herstellen von Aussparungen und Schlitzen während des Aufmauerns nach Plan
– Vorhalten der Arbeitsgerüste bis 2 m Arbeitshöhe
– Anlegen der Schichten und Höhenmarken nach vorhandenem Meterriss

Besondere Leistungen (gesondert vergütet)
– Nachträgliches Herstellen von Schlitzen und Durchbrüchen
– Stürze, Ringanker und Bewehrung im Mauerwerk, soweit gesondert ausgeschrieben
– Schutzmaßnahmen gegen außergewöhnliche Witterung

Abrechnung
– Mauerwerk nach Fläche oder Raummaß laut LV mit Abzug von Öffnungen nur oberhalb der in der ATV festgelegten Einzelgrößen
– Stürze, Anker und Formsteine nach Stück bzw. Länge

Hinweis für Planer
Steinart, Rohdichte- und Festigkeitsklasse sowie Schallschutzanforderungen je Wandtyp angeben.', 13),
  ('013', 'Beton- und Stahlbetonarbeiten', 'Geltende Regeln (in der bei Vertragsschluss gültigen Fassung)
– VOB/C ATV DIN 18331 Beton- und Stahlbetonarbeiten
– DIN EN 1992-1-1 mit Nationalem Anhang (Bemessung)
– DIN EN 206 mit DIN 1045-2 (Beton – Festlegung, Eigenschaften)
– DIN EN 13670 mit DIN 1045-3 (Ausführung von Tragwerken)
– DIN 488 Betonstahl
– DAfStb-Richtlinie Wasserundurchlässige Bauwerke aus Beton und DIN 18202 Toleranzen

Ausführung
– Ausführung nach geprüfter Statik und freigegebenen Schal- und Bewehrungsplänen
– Überwachungsklasse nach DIN 1045-3 einhalten; ab Klasse 2 Überwachung durch eine anerkannte Stelle
– Bewehrung vor dem Betonieren durch die Bauleitung bzw. den Prüfer abnehmen lassen
– Betonieren nur bei geeigneter Witterung; Nachbehandlung nach Norm und Protokoll
– Einbauteile, Aussparungen und Leerrohre der Fachgewerke nach Planung lagegenau einbauen
– Betonierprotokolle, Lieferscheine und Prüfergebnisse laufend übergeben

Nebenleistungen (ohne eigene Position)
– Eigenüberwachung nach DIN 1045-3 im geforderten Umfang
– Einbau von Einbauteilen, die vom AG oder anderen Unternehmern beigestellt werden, sofern nicht gesondert ausgeschrieben
– Bindedraht und übliche Abstandhalter

Besondere Leistungen (gesondert vergütet)
– Sichtbetonanforderungen über die Normanforderung, Musterflächen
– Fremdüberwachung, Erstprüfungen und Bohrkernentnahmen über den Normumfang
– Nachträgliche Durchbrüche und Kernbohrungen

Abrechnung
– Beton nach Raummaß aus Planmaßen; Öffnungen und Aussparungen nur oberhalb der Einzelgrößen der ATV abziehen
– Schalung nach Fläche der geschalten Betonfläche; Bewehrung nach Gewicht aus Stahllisten (Nenngewicht)

Hinweis für Planer
Expositionsklassen, Sichtbetonklassen und WU-Beanspruchungsklasse je Bauteil festlegen.', 14),
  ('014', 'Natur-, Betonwerksteinarbeiten', 'Geltende Regeln (in der bei Vertragsschluss gültigen Fassung)
– VOB/C ATV DIN 18332 Naturwerksteinarbeiten bzw. DIN 18333 Betonwerksteinarbeiten
– DIN EN 12058 Natursteinprodukte – Bodenplatten und Stufen
– DIN EN 1469 Natursteinprodukte – Bekleidungsplatten
– DIN EN 13748 Terrazzoplatten
– DIN 18516-3 Außenwandbekleidungen hinterlüftet – Naturwerkstein
– DIN 51130 Prüfung der rutschhemmenden Eigenschaft und DIN 18202

Ausführung
– Untergrund auf Ebenheit, Festigkeit, Feuchte und Rissfreiheit prüfen
– Verlegeart (Dick-, Mittel- oder Dünnbett) und Mörtel nach Steinart und Herstellerempfehlung; verfärbungsempfindliche Steine beachten
– Bewegungs- und Randfugen nach Fugenplan; Bauwerksfugen übernehmen
– Rutschhemmung bzw. Oberflächenbearbeitung nach LV; Muster vor Bestellung
– Verankerungen von Bekleidungen nach Zulassung bzw. Statik in nichtrostendem Stahl
– Belag bis zur Begehbarkeit absperren, danach schützen

Nebenleistungen (ohne eigene Position)
– Reinigen nach dem Verfugen
– Anarbeiten an angrenzende Bauteile bei geraden Schnitten

Besondere Leistungen (gesondert vergütet)
– Imprägnierungen, Steinpflege und Schutzabdeckungen über die Bauzeit des eigenen Gewerks
– Schräg- und Rundschnitte, Gehrungen, Profilierungen
– Ausgleich unebener Untergründe über die Toleranz hinaus

Abrechnung
– Flächen nach Fläche in der Ansicht bzw. Draufsicht; Aussparungen nur oberhalb der Einzelgröße der ATV abziehen
– Stufen, Fensterbänke und Abdeckungen nach Stück oder Länge

Hinweis für Planer
Gesteinsart, Herkunft, Format, Oberfläche und Rutschhemmklasse je Bereich angeben.', 15),
  ('016', 'Zimmer- und Holzbauarbeiten', 'Geltende Regeln (in der bei Vertragsschluss gültigen Fassung)
– VOB/C ATV DIN 18334 Zimmer- und Holzbauarbeiten
– DIN EN 1995-1-1 mit Nationalem Anhang (Bemessung)
– DIN 68800-1/-2 Holzschutz – Allgemeines und vorbeugende bauliche Maßnahmen
– DIN 4074-1 bzw. DIN EN 14081-1 Festigkeitssortierung von Bauholz
– DIN EN 14080 Brettschichtholz und Balkenschichtholz
– DIN 4108-3 Klimabedingter Feuchteschutz

Ausführung
– Holzfeuchte beim Einbau nach Norm bzw. LV; Holz trocken lagern und vor Niederschlag schützen
– Abbund nach freigegebenen Plänen; Verbindungsmittel nach Statik
– Holzschutz vorrangig konstruktiv; chemischer Schutz nur, wenn Gebrauchsklasse und Planung ihn verlangen
– Luft- und Winddichtheitsebenen lückenlos und dauerhaft anschließen
– Brandschutzanforderungen an Bauteile und Anschlüsse nach Brandschutzkonzept
– Maßtoleranzen nach DIN 18202; Bauteile vor dem Montieren der Folgegewerke abnehmen

Nebenleistungen (ohne eigene Position)
– Verbindungsmittel wie Nägel, Schrauben und Bolzen, soweit nicht als Stahlteil ausgeschrieben
– Vorhalten von Hebezeug für die eigene Montage im üblichen Umfang

Besondere Leistungen (gesondert vergütet)
– Stahlformteile, Anker und Sonderverbinder, soweit gesondert ausgeschrieben
– Luftdichtheitsmessung und Feuchtemessungen über die Eigenüberwachung hinaus
– Hobeln, Fasen und Oberflächenbehandlung, wenn nicht beschrieben

Abrechnung
– Hölzer nach Länge bzw. Raummaß laut LV in den Nennquerschnitten; maßgebend ist die größte Länge des Einzelholzes
– Schalungen, Bekleidungen und Dämmungen nach Fläche; Öffnungen nur oberhalb der Einzelgröße der ATV abziehen

Hinweis für Planer
Festigkeitsklassen, Nutzungsklassen und Gebrauchsklasse des Holzschutzes angeben.', 16),
  ('017', 'Stahlbauarbeiten', 'Geltende Regeln (in der bei Vertragsschluss gültigen Fassung)
– VOB/C ATV DIN 18335 Stahlbauarbeiten
– DIN EN 1090-1/-2 Ausführung von Stahltragwerken mit Konformitätsnachweis
– DIN EN 1993-1-1 mit Nationalem Anhang (Bemessung)
– DIN EN ISO 3834 Qualitätsanforderungen an das Schmelzschweißen
– DIN EN ISO 12944 Korrosionsschutz durch Beschichtungssysteme
– DIN EN ISO 1461 Feuerverzinkung

Ausführung
– Ausführungsklasse (EXC) nach Planung; Zertifikat des Herstellers für diese Klasse vorlegen
– Werkstattzeichnungen und Montageplanung zur Freigabe; Prüfstatik beachten
– Ankerschrauben und Fußplatten vor Montage aufmessen; Abweichungen melden
– Schweißarbeiten auf der Baustelle nur mit Schweißaufsicht und Erlaubnisschein
– Montagestabilität bis zum Abschluss der Aussteifung sichern
– Werkstoffzeugnisse, Schweißprotokolle und Leistungserklärung übergeben

Nebenleistungen (ohne eigene Position)
– Ausrichten und Unterfüttern der Bauteile bis zum Vergießen
– Ausbessern von Montageschäden am Korrosionsschutz
– Verbindungsmittel und Kleinteile der Konstruktion

Besondere Leistungen (gesondert vergütet)
– Vergießen der Fußplatten, soweit nicht Teil der Position
– Brandschutzbeschichtungen und Beschichtungen über den beschriebenen Umfang
– Probebelastungen und zusätzliche Prüfungen durch Dritte

Abrechnung
– Nach Gewicht aus den Stücklisten der freigegebenen Werkstattzeichnungen mit Nenngewichten; Zuschläge nur nach ATV
– Verbindungen, Kleinteile und Montagehilfen nach den Regeln der ATV

Hinweis für Planer
Ausführungsklasse, Korrosivitätskategorie und Feuerwiderstand der Bauteile angeben.', 17),
  ('018', 'Abdichtungsarbeiten', 'Geltende Regeln (in der bei Vertragsschluss gültigen Fassung)
– VOB/C ATV DIN 18336 Abdichtungsarbeiten
– DIN 18533 Abdichtung von erdberührten Bauteilen
– DIN 18534 Abdichtung von Innenräumen
– DIN 18535 Abdichtung von Behältern und Becken
– DIN 18532 Abdichtung von befahrbaren Verkehrsflächen aus Beton
– Verarbeitungsrichtlinien und Prüfzeugnisse der Abdichtungshersteller

Ausführung
– Wassereinwirkungsklasse und Rissklasse nach Planung; Bauart und Schichtdicken danach wählen
– Untergrund prüfen: tragfähig, sauber, ausreichend trocken, Kanten gefast, Kehlen ausgebildet
– Verarbeitung nur bei zulässigen Untergrund- und Lufttemperaturen; vor Regen und Frost schützen
– Durchdringungen, Fugen und Übergänge mit systemzugehörigen Bauteilen
– Schichtdicken (z. B. bei PMBC) messen und protokollieren; Durchtrocknung vor Verfüllung prüfen
– Schutzschichten zeitnah nach Freigabe aufbringen; Abdichtung nicht beschädigen lassen

Nebenleistungen (ohne eigene Position)
– Reinigen des Untergrunds von losen Teilen und Staub
– Eigenüberwachung mit Schichtdickenkontrolle
– Abdecken fertiger Abdichtungen bis zum Einbau der Schutzschicht im eigenen Arbeitsablauf

Besondere Leistungen (gesondert vergütet)
– Untergrundvorbehandlung über das übliche Maß (Ausgleich, Schleifen, Trocknen)
– Schutzschichten, Dämmungen und Dränagen, soweit nicht in der Position enthalten
– Prüfungen durch Sachverständige

Abrechnung
– Flächen nach abgedichteter Fläche; Öffnungen und Durchdringungen nur oberhalb der Einzelgröße der ATV abziehen
– Kehlen, Fugen und Anschlüsse nach Länge; Einbauteile nach Stück

Hinweis für Planer
Wassereinwirkungsklasse, Rissklasse und Nutzungsklasse je Bauteil angeben.', 18),
  ('020', 'Dachdeckungsarbeiten', 'Geltende Regeln (in der bei Vertragsschluss gültigen Fassung)
– VOB/C ATV DIN 18338 Dachdeckungs- und Dachabdichtungsarbeiten
– Regelwerk des Deutschen Dachdeckerhandwerks (ZVDH) mit Fachregeln für Dachdeckungen
– DIN EN 1991-1-4 mit Nationalem Anhang (Windlasten) für die Windsogsicherung
– DIN 4108-3 Klimabedingter Feuchteschutz
– DIN 4426 Sicherheitseinrichtungen zur Instandhaltung

Ausführung
– Regeldachneigung des Deckmaterials beachten; bei Unterschreitung Zusatzmaßnahmen nach Fachregel
– Unterdeckung bzw. Unterspannung nach Anforderungsklasse und Planung
– Befestigung bzw. Windsogsicherung nach Berechnung oder Fachregel
– Lattung nach Deckmaterial; Konterlattung für Hinterlüftung
– Anschlüsse an Kamine, Gauben und Durchdringungen regensicher und dauerhaft
– Absturzsicherung während der Arbeiten nach DGUV; Sicherheitshaken bzw. Anschlagpunkte nach Planung

Nebenleistungen (ohne eigene Position)
– Zuschneiden und Anpassen an Kehlen, Grate und Ortgänge im üblichen Umfang
– Lattenprüfung auf Maßhaltigkeit vor dem Decken
– Lagern von Reservedeckmaterial nur, wenn vereinbart

Besondere Leistungen (gesondert vergütet)
– Schneefanggitter, Laufanlagen, Dachausstiege und Sicherheitshaken
– Formziegel und Sonderformate über die Regelausführung
– Rückbau und Entsorgung der Altdeckung

Abrechnung
– Dachflächen nach Fläche in der Dachebene; Aussparungen nur oberhalb der Einzelgröße der ATV abziehen
– Grate, Firste, Kehlen, Ortgänge und Traufen nach Länge; Einbauteile nach Stück

Hinweis für Planer
Deckmaterial, Farbe, Anforderungsklasse der Unterdeckung und Windzone angeben.', 19),
  ('021', 'Dachabdichtungsarbeiten', 'Geltende Regeln (in der bei Vertragsschluss gültigen Fassung)
– VOB/C ATV DIN 18338 Dachdeckungs- und Dachabdichtungsarbeiten
– DIN 18531 Abdichtung von Dächern sowie Balkonen, Loggien und Laubengängen
– Fachregel für Abdichtungen – Flachdachrichtlinie des ZVDH
– DIN EN 12056-3 und DIN 1986-100 Dachentwässerung einschließlich Notentwässerung
– DIN EN 1991-1-4 mit Nationalem Anhang (Windlasten)
– DIN 4108-2/-3 Mindestwärmeschutz und Feuchteschutz

Ausführung
– Untergrund vor Beginn prüfen: tragfähig, trocken, eben, mit planmäßigem Gefälle
– Dampfsperre, Dämmung und Abdichtung als abgestimmtes System nach Herstellerangaben
– Anschlusshöhen an aufgehende Bauteile und Türen nach Fachregel bzw. Detail
– Lagesicherheit gegen Windsog nachweisen (Auflast, Verklebung oder mechanische Befestigung)
– Abläufe und Notüberläufe nach Bemessung; Dachfläche bei Arbeitsende regensicher schließen
– Abdichtung bei Übergabe an Folgegewerke dokumentieren; Schutz gegen Beschädigung

Nebenleistungen (ohne eigene Position)
– Reinigen des Untergrunds und Voranstrich, soweit systembedingt
– Tägliche provisorische Abschlüsse
– Eigenüberwachung der Nähte

Besondere Leistungen (gesondert vergütet)
– Dichtheitsprüfungen (z. B. Leckortung) durch Dritte
– Schutzlagen und Belag bei genutzten Dachflächen, Dachbegrünung
– Rückbau und Entsorgung vorhandener Schichten

Abrechnung
– Flächen nach abgedichteter Dachfläche; Aussparungen nur oberhalb der Einzelgröße der ATV abziehen
– An- und Abschlüsse nach Länge; Abläufe, Durchdringungen und Lichtkuppeln nach Stück

Hinweis für Planer
Anwendungsklasse, Gefälle, Nutzung (z. B. begrünt, begehbar) und Brandverhalten (harte Bedachung) angeben.', 20),
  ('022', 'Klempnerarbeiten', 'Geltende Regeln (in der bei Vertragsschluss gültigen Fassung)
– VOB/C ATV DIN 18339 Klempnerarbeiten
– Fachregeln des Klempnerhandwerks (ZVSHK) und Fachregel für Metallarbeiten im Dachdeckerhandwerk
– DIN EN 612 Hängedachrinnen und Regenfallrohre aus Metallblech
– DIN EN 1462 Rinnenhalter für Hängedachrinnen
– DIN EN 12056-3 und DIN 1986-100 Dachentwässerung

Ausführung
– Werkstoffe untereinander verträglich wählen; Kontaktkorrosion durch Trennlagen vermeiden
– Wärmedehnung durch Dehnungsausgleicher und Schiebenähte berücksichtigen
– Rinnen mit Gefälle zu den Abläufen; Befestigungsabstände nach Fachregel
– Anschlüsse an Abdichtungen und Putz dauerhaft regensicher ausführen
– Kanten und Schnittflächen entgraten; Oberflächen vor Beschädigung schützen
– Abstimmung mit Dachdecker, Fassade und Gerüst über Reihenfolge und Anschlüsse

Nebenleistungen (ohne eigene Position)
– Anpassen an Kehlen, Ecken und Durchdringungen im üblichen Umfang
– Befestigungsmittel und Haften

Besondere Leistungen (gesondert vergütet)
– Rinnenheizungen, Laubfangkörbe und Sonderformteile
– Schneefang und Laufanlagen
– Rückbau vorhandener Bauteile

Abrechnung
– Rinnen, Rohre, Abdeckungen und Anschlüsse nach Länge in der Achse; Formteile übermessen
– Endstücke, Stutzen, Bögen und Kleinteile nach Stück, soweit ausgeschrieben

Hinweis für Planer
Werkstoff, Materialdicke, Zuschnitt und Oberfläche je Bauteil angeben.', 21),
  ('023', 'Putz- und Stuckarbeiten, Wärmedämmsysteme', 'Geltende Regeln (in der bei Vertragsschluss gültigen Fassung)
– VOB/C ATV DIN 18350 Putz- und Stuckarbeiten sowie DIN 18345 Wärmedämm-Verbundsysteme
– DIN EN 13914-1/-2 Planung, Zubereitung und Ausführung von Außen- und Innenputzen
– DIN 18550-1/-2 Ergänzende Festlegungen zu Putzen
– DIN EN 998-1 Putzmörtel und DIN EN 13279-1 Gipsputze
– DIN 55699 Anwendung und Verarbeitung von WDVS
– Zulassung bzw. Bauartgenehmigung des WDVS; DIN 18202 Toleranzen

Ausführung
– Putzgrund auf Tragfähigkeit, Saugverhalten, Feuchte und Ebenheit prüfen; Vorbehandlung nach Herstellerangabe
– Nicht bei Frost bzw. unter der vom Hersteller genannten Mindesttemperatur arbeiten
– Oberflächenqualität nach vereinbarter Qualitätsstufe (Q1–Q4) bzw. Struktur nach Muster
– WDVS nur als zugelassenes System; Brandschutzmaßnahmen (z. B. Brandriegel) nach Zulassung und Konzept
– Anschlüsse an Fenster, Dächer und Durchdringungen schlagregendicht mit Systemprofilen
– Frische Putzflächen vor Schlagregen, Sonne und Wind schützen

Nebenleistungen (ohne eigene Position)
– Schützen angrenzender Bauteile vor Verunreinigung
– Kanten- und Eckschutzprofile im üblichen Umfang, soweit nicht gesondert ausgeschrieben
– Beiputzen in geringem Umfang während der eigenen Arbeiten

Besondere Leistungen (gesondert vergütet)
– Putzträger, Bewehrung über Rissbereiche und Ausgleichsputz über die Toleranz hinaus
– Beiputzarbeiten nach Abschluss der eigenen Leistung
– Laibungen, Faschen, Gesimse und Profile mit eigener Position

Abrechnung
– Wand- und Deckenflächen nach Fläche; Öffnungen bis 2,5 m² Einzelgröße werden übermessen
– Laibungen bei abgezogenen Öffnungen nach Länge oder Fläche gesondert; Profile nach Länge

Hinweis für Planer
Qualitätsstufe, Putzsystem, Dämmstoff und Brandschutzklasse des WDVS angeben.', 22),
  ('024', 'Fliesen- und Plattenarbeiten', 'Geltende Regeln (in der bei Vertragsschluss gültigen Fassung)
– VOB/C ATV DIN 18352 Fliesen- und Plattenarbeiten
– DIN 18157-1 Ausführung keramischer Bekleidungen im Dünnbettverfahren
– DIN EN 14411 Keramische Fliesen und Platten
– DIN EN 12004-1 Mörtel und Klebstoffe für Fliesen und Platten
– DIN 18534 Abdichtung von Innenräumen (Verbundabdichtung)
– DIN 51130 und DIN 51097 Rutschhemmung; DIN 18202 Toleranzen

Ausführung
– Untergrund prüfen: Ebenheit, Festigkeit, Belegreife (Restfeuchte), Fugen und Risse
– Verbundabdichtung nach Wassereinwirkungsklasse mit Dichtbändern an Ecken und Durchdringungen
– Fugenbild nach Verlegeplan bzw. Absprache; Bewegungs- und Randfugen ausbilden
– Großformate mit geeignetem Kleber und Verfahren hohlraumarm verlegen
– Elastische Anschlussfugen als Wartungsfugen ausführen; Hinweis an den AG
– Flächen bis zur Belastbarkeit sperren, danach schützen

Nebenleistungen (ohne eigene Position)
– Reinigen des Untergrunds und Haftgrund, soweit systembedingt
– Abschließende Reinigung des Belags
– Zuschnitte an geraden Anschlüssen

Besondere Leistungen (gesondert vergütet)
– Ausgleich von Untergrundunebenheiten über die Toleranz hinaus
– Bohrungen und Ausschnitte für Installationen, Profile und Sockel, soweit gesondert ausgeschrieben
– Imprägnierung und Schutzabdeckungen

Abrechnung
– Flächen nach Fläche; Aussparungen bis 0,1 m² Einzelgröße werden übermessen
– Sockel, Kanten, Profile und Fugen nach Länge; Ausschnitte nach Stück

Hinweis für Planer
Format, Rutschhemmung, Fugenbreite und Wassereinwirkungsklasse je Raum angeben.', 23),
  ('025', 'Estricharbeiten', 'Geltende Regeln (in der bei Vertragsschluss gültigen Fassung)
– VOB/C ATV DIN 18353 Estricharbeiten
– DIN 18560 Estriche im Bauwesen (Teile 1–4 und 7)
– DIN EN 13813 Estrichmörtel und Estrichmassen
– DIN EN 1264-4 Fußbodenheizung – Installation
– DIN 4109 Schallschutz und DIN 18202 Toleranzen

Ausführung
– Untergrund und Rohdecke auf Ebenheit, Höhenlage und Sauberkeit prüfen; Höhenbezug festlegen
– Randdämmstreifen vollständig; Schall- und Wärmebrücken vermeiden
– Estrichart, Festigkeits- und Biegezugklasse sowie Nenndicke nach Nutzlast und LV
– Fugenplan mit Bewegungs- und Scheinfugen, abgestimmt mit Bodenleger und Heizungsbauer
– Heizestrich: Funktionsheizen mit Protokoll; Belegreifheizen nach Absprache
– Zugluft und direkte Sonneneinstrahlung beim Erhärten vermeiden; Begehbarkeit beachten

Nebenleistungen (ohne eigene Position)
– Abdecken der Dämmschicht mit Trennlage bzw. Folie nach Norm
– Herstellen der Höhenmarken auf Grundlage des Meterrisses
– Anarbeiten an Türzargen und aufgehende Bauteile

Besondere Leistungen (gesondert vergütet)
– Belegreifheizen, CM-Messungen über den Eigenbedarf hinaus
– Schleifen und Grundieren für den Folgebelag
– Ausgleichsschüttungen und zusätzliche Dämmlagen

Abrechnung
– Estrich und Dämmung nach Fläche; Aussparungen nur oberhalb der Einzelgröße der ATV abziehen
– Randstreifen und Fugen nach Länge; Mehrdicken nach Fläche und cm

Hinweis für Planer
Belag, Nutzlast, Fußbodenheizung und Schallschutzanforderung je Raum angeben.', 24),
  ('026', 'Fenster, Außentüren', 'Geltende Regeln (in der bei Vertragsschluss gültigen Fassung)
– VOB/C ATV DIN 18355 Tischlerarbeiten bzw. DIN 18360 Metallbauarbeiten
– DIN EN 14351-1 Fenster und Außentüren – Produktnorm
– Leitfaden zur Planung und Ausführung der Montage von Fenstern und Haustüren (RAL-Gütegemeinschaft)
– DIN 4108-2/-7 Wärmeschutz und Luftdichtheit
– DIN 18008 Glas im Bauwesen
– DIN EN 1627 Einbruchhemmung; DIN 18040 Barrierefreies Bauen

Ausführung
– Öffnungsmaße vor Fertigung am Bau nehmen; Abweichungen von der Planung melden
– Befestigung lastabtragend nach Herstellerangabe und statischem Erfordernis
– Anschlussfuge dreiebenig: innen luftdicht, Mitte gedämmt, außen schlagregendicht
– Bodenschwellen und Türanschlüsse abgestimmt mit Abdichtung und Barrierefreiheit
– Beschläge einstellen; Funktionsprüfung bei Übergabe
– Schutzfolien und Schutz der Oberflächen bis zur Abnahme

Nebenleistungen (ohne eigene Position)
– Befestigungsmittel und Einstellen der Beschläge
– Übergabe von Pflege- und Wartungsanleitungen

Besondere Leistungen (gesondert vergütet)
– Fensterbänke innen und außen, Rollladenkästen und Insektenschutz, soweit gesondert
– Erhöhte Sicherheits- und Schallschutzklassen über die Beschreibung
– Ausbau und Entsorgung von Altfenstern

Abrechnung
– Elemente nach Stück mit Angabe der Rahmenaußenmaße oder nach Fläche laut LV
– Anschlussfugen nach Länge, soweit nicht im Elementpreis enthalten

Hinweis für Planer
Uw-Wert, Schall-, Einbruch- und Schlagregenklasse je Element in der Fensterliste angeben.', 25),
  ('027', 'Tischlerarbeiten', 'Geltende Regeln (in der bei Vertragsschluss gültigen Fassung)
– VOB/C ATV DIN 18355 Tischlerarbeiten
– DIN 18101 Türen für den Wohnungsbau – Maße
– DIN 68706-1 Innentüren aus Holz und Holzwerkstoffen
– DIN EN 942 Holz in Tischlerarbeiten
– Verwendbarkeitsnachweise für Feuer- und Rauchschutzabschlüsse
– DIN 18040-1/-2 Barrierefreies Bauen

Ausführung
– Maße am Bau nehmen; Werkstattzeichnungen und Muster vor Fertigung freigeben lassen
– Holzfeuchte und Klimabedingungen vor Einbau prüfen; Einbau erst nach Abschluss nasser Arbeiten
– Brand- und Rauchschutztüren nur nach Zulassung einbauen; Kennzeichnung und Übereinstimmungserklärung
– Schall- und Klimaklassen der Türen nach Türliste
– Einbauten an Installationen und Wände anpassen; Befestigung abgestimmt mit Trockenbau
– Oberflächen bis zur Abnahme schützen

Nebenleistungen (ohne eigene Position)
– Befestigungsmittel, Einstellen der Beschläge und Funktionsprüfung
– Anpassen an vorhandene Maßtoleranzen innerhalb DIN 18202

Besondere Leistungen (gesondert vergütet)
– Bauaufmaß bei nicht maßhaltigen Bestandsöffnungen
– Sonderbeschläge, Feststellanlagen und Elektrozubehör
– Ausbau vorhandener Türen und Einbauten

Abrechnung
– Türen und Einbauten nach Stück; Bekleidungen und Leisten nach Länge
– Arbeitsplatten und Verkleidungen nach Länge bzw. Fläche laut LV

Hinweis für Planer
Türliste mit Maßen, Anschlag, Klassen (Brand, Schall, Klima) und Beschlägen beifügen.', 26),
  ('028', 'Parkett-, Holzpflasterarbeiten', 'Geltende Regeln (in der bei Vertragsschluss gültigen Fassung)
– VOB/C ATV DIN 18356 Parkett- und Holzpflasterarbeiten
– DIN EN 13489 Mehrschichtparkettelemente
– DIN EN 14342 Holzfußböden – Eigenschaften
– DIN 18560 Estriche (Belegreife des Untergrunds)
– Merkblätter der TKB bzw. des Zentralverbands Parkett und Fußbodentechnik
– DIN 18202 Toleranzen im Hochbau

Ausführung
– Untergrund prüfen: Restfeuchte (CM-Messung), Festigkeit, Ebenheit, Risse, Randdämmstreifen
– Raumklima vor und während der Verlegung nach Herstellerangabe (Temperatur, Luftfeuchte)
– Bei Fußbodenheizung Aufheizprotokoll und Belegreife des Estrichs vorlegen lassen
– Randabstand für Quellen und Schwinden einhalten; Fugen nach Raumgröße
– Oberflächenbehandlung nach Muster; Pflegeanleitung übergeben
– Belag bis zur Abnahme vor Feuchte und Schmutz schützen

Nebenleistungen (ohne eigene Position)
– Prüfen des Untergrunds einschließlich CM-Messung im üblichen Umfang
– Reinigen des Untergrunds von groben Verunreinigungen
– Erstpflege nach Herstellerangabe

Besondere Leistungen (gesondert vergütet)
– Schleifen und Spachteln des Untergrunds über die Toleranz hinaus
– Sockelleisten, Profile und Übergangsschienen, soweit gesondert
– Schutzabdeckungen für die Bauzeit anderer Gewerke

Abrechnung
– Flächen nach verlegter Fläche; Aussparungen nur oberhalb der Einzelgröße der ATV abziehen
– Leisten und Profile nach Länge; Stufen nach Stück

Hinweis für Planer
Holzart, Sortierung, Aufbau, Verlegemuster und Oberflächenbehandlung angeben.', 27),
  ('029', 'Beschlagarbeiten', 'Geltende Regeln (in der bei Vertragsschluss gültigen Fassung)
– VOB/C ATV DIN 18357 Beschlagarbeiten
– DIN EN 1906 Türdrücker und Türknäufe
– DIN EN 1303 Schließzylinder
– DIN EN 1154 Türschließer
– DIN EN 179 Notausgangsverschlüsse und DIN EN 1125 Paniktürverschlüsse
– DIN 18273 Türdrückergarnituren für Feuer- und Rauchschutztüren

Ausführung
– Beschläge passend zu Türtyp, Gewicht und Nutzungshäufigkeit wählen
– Fluchttürbeschläge nur in zugelassener Kombination mit Schloss und Tür
– Bei Brand- und Rauchschutztüren nur zugelassene Beschläge; Zulassung der Tür beachten
– Schließanlage nach Schließplan; Übergabe der Schlüssel mit Quittung und Sicherungskarte
– Montage maßgenau und funktionsgerecht; Einstellen von Schließern
– Oberflächen schützen; Funktionsprüfung mit Protokoll

Nebenleistungen (ohne eigene Position)
– Befestigungsmittel und Einstellen
– Übergabe von Wartungshinweisen

Besondere Leistungen (gesondert vergütet)
– Erstellen und Pflegen des Schließplans
– Elektrische Komponenten (Motorschlösser, Türöffner) und deren Anschluss
– Nachbestellungen von Schlüsseln

Abrechnung
– Beschläge nach Stück bzw. Garnitur; Schließanlagen nach Zylinder und Schlüssel

Hinweis für Planer
Schließplan, Fluchtwegfunktionen und Brandschutzanforderungen je Tür angeben.', 28),
  ('030', 'Rollladenarbeiten, Sonnenschutz', 'Geltende Regeln (in der bei Vertragsschluss gültigen Fassung)
– VOB/C ATV DIN 18358 Rollladenarbeiten
– DIN EN 13659 Abschlüsse außen und Außenjalousien
– DIN EN 13561 Markisen
– DIN EN 13120 Abschlüsse innen
– DIN 4108-2 Sommerlicher Wärmeschutz

Ausführung
– Windwiderstandsklasse nach Einbausituation und Windzone
– Einbaumaße und Befestigung am Bau prüfen; Abstimmung mit Fenster, WDVS und Putz
– Führungsschienen lot- und fluchtgerecht; Behänge leichtgängig
– Elektrische Antriebe und Steuerungen mit Elektro und Gebäudeautomation abstimmen
– Windwächter bzw. Sensorik nach Planung; Funktionsprüfung mit Protokoll
– Bedien- und Wartungsanleitungen übergeben

Nebenleistungen (ohne eigene Position)
– Befestigungsmittel und Einstellen der Endlagen
– Funktionsprüfung bei Übergabe

Besondere Leistungen (gesondert vergütet)
– Steuerungen, Sensoren und Gebäudeautomationsanbindung
– Elektroanschluss, soweit nicht beschrieben
– Ausbau vorhandener Anlagen

Abrechnung
– Anlagen nach Stück mit Größenangabe oder nach Fläche des Behangs laut LV
– Führungsschienen und Blenden nach Länge, soweit gesondert

Hinweis für Planer
Behangart, Farbe, Bedienung und Windklasse je Fenster angeben.', 29),
  ('031', 'Metallbauarbeiten', 'Geltende Regeln (in der bei Vertragsschluss gültigen Fassung)
– VOB/C ATV DIN 18360 Metallbauarbeiten
– DIN EN 1090-1/-2/-3 Ausführung von Stahl- und Aluminiumtragwerken
– DIN 18065 Gebäudetreppen
– DIN EN 1991-1-1 mit Nationalem Anhang (Horizontallasten auf Geländer)
– DIN EN 13241 Tore und DIN EN 16034 Feuer- und Rauchschutzeigenschaften
– DIN EN ISO 12944 bzw. DIN EN ISO 1461 Korrosionsschutz

Ausführung
– Maße am Bau nehmen; Werkstattzeichnungen zur Freigabe vorlegen
– Tragende Bauteile nur mit Zertifizierung nach DIN EN 1090 in der geforderten Ausführungsklasse
– Absturzsicherungen nach Landesbauordnung (Höhe, Öffnungen, Leiterwirkung) ausführen
– Befestigungen mit zugelassenen Dübeln und Ankern; Randabstände beachten
– Kontaktkorrosion zwischen unterschiedlichen Metallen vermeiden
– Oberflächen bis zur Abnahme schützen; Leistungserklärungen übergeben

Nebenleistungen (ohne eigene Position)
– Befestigungsmittel und Kleinteile
– Ausbessern von Montageschäden an Beschichtungen

Besondere Leistungen (gesondert vergütet)
– Statische Berechnungen und Prüfungen für Sonderkonstruktionen
– Antriebe, Steuerungen und Elektroanschluss bei Toren
– Beschichtungen über die beschriebene Ausführung

Abrechnung
– Bauteile nach Stück, Länge oder Gewicht laut LV
– Geländer nach Länge in der Achse des Handlaufs

Hinweis für Planer
Ausführungsklasse, Oberfläche, Korrosivitätskategorie und Lastannahmen angeben.', 30),
  ('032', 'Verglasungsarbeiten', 'Geltende Regeln (in der bei Vertragsschluss gültigen Fassung)
– VOB/C ATV DIN 18361 Verglasungsarbeiten
– DIN 18008 Glas im Bauwesen (Teile 1–5)
– DIN EN 1279 Mehrscheiben-Isolierglas
– DIN EN 12150 Einscheibensicherheitsglas und DIN EN 14449 Verbund-Sicherheitsglas
– DIN 18545 Abdichten von Verglasungen mit Dichtstoffen
– Technische Richtlinien des Glaserhandwerks

Ausführung
– Glasaufbau nach Anforderungen an Absturzsicherung, Verletzungsschutz, Wärme- und Schallschutz
– Absturzsichernde und Überkopfverglasungen nur nach DIN 18008 bzw. mit Nachweis
– Verklotzung und Glasfalz nach Richtlinie; Falzraum belüftet
– Verträglichkeit von Dichtstoffen und Randverbund sicherstellen
– Kennzeichnung von Sicherheitsglas sichtbar; Markierung großer Glasflächen nach Bedarf
– Gläser bis zur Abnahme vor Beschädigung schützen

Nebenleistungen (ohne eigene Position)
– Klotzung, Dichtprofile und Befestigungsleisten
– Entfernen von Etiketten

Besondere Leistungen (gesondert vergütet)
– Bauteilversuche und Sondernachweise
– Sicherheitsmarkierungen und Folien
– Bruchersatz bei Fremdverschulden

Abrechnung
– Glas nach Fläche des kleinsten umschriebenen Rechtecks; Mindestabrechnungsflächen nach ATV
– Formscheiben und Sonderzuschnitte nach Stück bzw. mit Zuschlag laut LV

Hinweis für Planer
Glasaufbau, Ug-Wert, Sicherheitsanforderung und Einbaulage je Element angeben.', 31),
  ('033', 'Baureinigungsarbeiten', 'Geltende Regeln (in der bei Vertragsschluss gültigen Fassung)
– VOB/C ATV DIN 18299 Allgemeine Regelungen für Bauarbeiten jeder Art
– Reinigungs- und Pflegeanleitungen der Hersteller der jeweiligen Oberflächen
– Richtlinien des Bundesinnungsverbands des Gebäudereiniger-Handwerks
– Gefahrstoffverordnung (GefStoffV) für Reinigungsmittel

Ausführung
– Reinigungsmittel und -verfahren auf das Material abstimmen; empfindliche Flächen vorher testen
– Bauzwischenreinigungen nach Abruf der Bauleitung; Bauendreinigung vor Übergabe
– Fenster und Glas einschließlich Rahmen innen und außen nach LV
– Schutzfolien und Etiketten entfernen, soweit beauftragt
– Schäden vor Beginn dokumentieren; beschädigte Oberflächen nicht weiterbehandeln
– Abnahme der Reinigung gemeinsam mit der Bauleitung

Nebenleistungen (ohne eigene Position)
– Wasser- und Stromentnahme an vorhandenen Anschlüssen
– Entsorgung der Reinigungsabfälle

Besondere Leistungen (gesondert vergütet)
– Beseitigen grober Verschmutzungen durch andere Gewerke, sofern nicht deren Pflicht
– Erstpflege von Bodenbelägen und Sonderreinigungen
– Hubarbeitsbühnen und Gerüste für große Höhen

Abrechnung
– Flächen nach gereinigter Grundfläche bzw. Ansichtsfläche; Glas nach Fläche oder Stück laut LV

Hinweis für Planer
Die grobe Reinigung des eigenen Arbeitsbereichs bleibt Pflicht jedes Gewerks; dies in allen LVs festhalten.', 32),
  ('034', 'Maler- und Lackierarbeiten', 'Geltende Regeln (in der bei Vertragsschluss gültigen Fassung)
– VOB/C ATV DIN 18363 Maler- und Lackierarbeiten
– DIN EN 13300 Beschichtungsstoffe für Wände und Decken innen
– DIN EN 1062-1 Beschichtungsstoffe für Mauerwerk und Beton außen
– BFS-Merkblätter des Bundesausschusses Farbe und Sachwertschutz
– Merkblatt Nr. 2 des Bundesverbands der Gipsindustrie (Qualitätsstufen Q1–Q4)

Ausführung
– Untergrund auf Tragfähigkeit, Feuchte, Saugfähigkeit und Verunreinigung prüfen; Bedenken schriftlich
– Mindesttemperaturen und Luftfeuchte nach Herstellerangabe; nicht bei Nebel, Frost oder direkter Sonne außen
– Beschichtungssystem aufeinander abgestimmt; Nassabriebklasse und Glanzgrad nach LV
– Farbtöne nach Musterfläche festlegen lassen
– Angrenzende Bauteile abdecken und abkleben
– Lackierte Flächen vor Staub und Beschädigung schützen

Nebenleistungen (ohne eigene Position)
– Abdecken und Abkleben angrenzender Bauteile
– Entfernen loser Teile und Staub vom Untergrund
– Kleine Ausbesserungen des Untergrunds vor dem Beschichten

Besondere Leistungen (gesondert vergütet)
– Spachtelarbeiten in Flächen, Grundierungen über das systembedingte Maß
– Entfernen alter Beschichtungen und Tapeten
– Musterflächen über die erste hinaus

Abrechnung
– Wand- und Deckenflächen nach Fläche; Öffnungen bis 2,5 m² Einzelgröße werden übermessen
– Laibungen bei abgezogenen Öffnungen gesondert; Kleinteile wie Heizkörper oder Rohre nach Stück oder Länge

Hinweis für Planer
Qualitätsstufe des Untergrunds, Beschichtungssystem und Farbtonkonzept angeben.', 33),
  ('035', 'Korrosionsschutzarbeiten an Stahl- und Aluminiumbauten', 'Geltende Regeln (in der bei Vertragsschluss gültigen Fassung)
– VOB/C ATV DIN 18364 Korrosionsschutzarbeiten an Stahl- und Aluminiumbauten
– DIN EN ISO 12944 Korrosionsschutz durch Beschichtungssysteme (Teile 1–9)
– DIN EN ISO 8501-1 Visuelle Beurteilung der Oberflächenreinheit
– DIN EN ISO 1461 Feuerverzinkung
– DIN 55633 Pulverbeschichtung von Stahlbauten
– DIN EN ISO 2808 Bestimmung der Schichtdicke

Ausführung
– Korrosivitätskategorie und Schutzdauer bestimmen Systemwahl und Sollschichtdicke
– Oberflächenvorbereitung auf den geforderten Reinheitsgrad; Rauheit nach System
– Beschichten nur bei ausreichendem Abstand zum Taupunkt und geeigneter Oberflächentemperatur
– Kanten, Schweißnähte und Schrauben gesondert vorlegen (Kantenschutz)
– Schichtdicken messen und protokollieren; Kontrollflächen nach Norm
– Klima- und Arbeitsprotokolle laufend führen

Nebenleistungen (ohne eigene Position)
– Messungen der Klimabedingungen und Schichtdicken im Rahmen der Eigenüberwachung
– Abdecken angrenzender Bauteile

Besondere Leistungen (gesondert vergütet)
– Strahlen auf höhere Reinheitsgrade und Schadstoffbeseitigung bei Altbeschichtungen
– Einhausungen und Absaugungen
– Prüfungen durch Dritte

Abrechnung
– Nach beschichteter Fläche oder Gewicht der Konstruktion laut LV; Kleinteile nach Stück

Hinweis für Planer
Korrosivitätskategorie, Schutzdauer und Farbton nach RAL angeben.', 34),
  ('036', 'Bodenbelagarbeiten', 'Geltende Regeln (in der bei Vertragsschluss gültigen Fassung)
– VOB/C ATV DIN 18365 Bodenbelagarbeiten
– DIN EN 14041 Elastische, textile und Laminat-Bodenbeläge – wesentliche Eigenschaften
– DIN EN ISO 10874 Klassifizierung nach Nutzung
– DIN 18560 Estriche (Belegreife des Untergrunds)
– TKB-Merkblätter zur Untergrundvorbereitung und Verlegung
– DIN 18202 Toleranzen im Hochbau

Ausführung
– Untergrund prüfen: Restfeuchte (CM-Messung), Festigkeit, Ebenheit, Risse, Temperatur
– Bei Fußbodenheizung Aufheizprotokoll anfordern; Belegreife erst danach
– Raumklima während Verlegung und Aushärtung nach Herstellerangabe
– Spachtelmasse und Klebstoff als abgestimmtes, emissionsarmes System
– Nähte nach Herstellerangabe verschweißen oder versiegeln; Fugen des Untergrunds übernehmen
– Belag bis zur Abnahme abdecken bzw. schützen

Nebenleistungen (ohne eigene Position)
– Prüfen des Untergrunds einschließlich CM-Messung im üblichen Umfang
– Reinigen des Untergrunds von groben Verunreinigungen
– Erstreinigung nach Verlegung

Besondere Leistungen (gesondert vergütet)
– Schleifen, Grundieren und Spachteln über das übliche Maß
– Sockelleisten, Kantenprofile und Treppenkanten, soweit gesondert
– Schutzabdeckungen für Folgegewerke

Abrechnung
– Flächen nach verlegter Fläche; Aussparungen nur oberhalb der Einzelgröße der ATV abziehen
– Sockel und Profile nach Länge; Stufen nach Stück

Hinweis für Planer
Belagart, Nutzungsklasse, Brandverhalten und Ableitfähigkeit je Raum angeben.', 35),
  ('037', 'Tapezierarbeiten', 'Geltende Regeln (in der bei Vertragsschluss gültigen Fassung)
– VOB/C ATV DIN 18366 Tapezierarbeiten
– DIN EN 233 Wandbekleidungen in Rollen – Tapeten
– DIN EN 259-1 Wandbekleidungen in Rollen – Strapazierfähige Wandbekleidungen
– BFS-Merkblätter
– Merkblatt Nr. 2 des Bundesverbands der Gipsindustrie (Qualitätsstufen)

Ausführung
– Untergrund auf Tragfähigkeit, Feuchte, Ebenheit und Saugfähigkeit prüfen
– Kleister bzw. Kleber nach Tapetenart; Raumklima nach Herstellerangabe
– Muster- und Rapportbild beachten; nur Rollen derselben Anfertigung je Raum
– Nähte stoßen und andrücken; keine Überlappungen ohne Vereinbarung
– Schalter und Steckdosen nur nach Freischalten durch den Elektriker umarbeiten
– Angrenzende Bauteile schützen

Nebenleistungen (ohne eigene Position)
– Abdecken angrenzender Bauteile
– Vorbehandlung des Untergrunds durch Grundierung im üblichen Umfang

Besondere Leistungen (gesondert vergütet)
– Entfernen alter Tapeten und Spachteln des Untergrunds
– Makulatur oder Renoviervlies, soweit gesondert

Abrechnung
– Wand- und Deckenflächen nach Fläche; Öffnungen bis 2,5 m² Einzelgröße werden übermessen
– Laibungen bei abgezogenen Öffnungen gesondert nach Länge bzw. Fläche

Hinweis für Planer
Tapetenart, Rapport und Qualitätsstufe des Untergrunds angeben.', 36),
  ('038', 'Vorgehängte hinterlüftete Fassaden', 'Geltende Regeln (in der bei Vertragsschluss gültigen Fassung)
– VOB/C ATV DIN 18351 Vorgehängte hinterlüftete Fassaden
– DIN 18516-1 Außenwandbekleidungen hinterlüftet – Anforderungen und Prüfgrundsätze
– DIN EN 1991-1-4 mit Nationalem Anhang (Windlasten)
– Zulassungen bzw. Bauartgenehmigungen für Unterkonstruktion und Bekleidung
– Muster-Verwaltungsvorschrift Technische Baubestimmungen (Brandschutz der Fassade)
– Fachregeln des Fachverbands Baustoffe und Bauteile für vorgehängte hinterlüftete Fassaden (FVHF)

Ausführung
– Verankerungsgrund prüfen; Dübel nach Zulassung und Auszugswerten am Bauwerk
– Unterkonstruktion mit thermischer Trennung; Wärmebrücken gering halten
– Dämmung lückenlos und dicht gestoßen; Winddichtung nach Planung
– Hinterlüftungsquerschnitte und Zu-/Abluftöffnungen freihalten; Insektenschutz
– Brandsperren bzw. Brandschutzmaßnahmen nach Konzept und Zulassung
– Fugenbild nach Fassadenplan; Musterfläche vor Serienfertigung

Nebenleistungen (ohne eigene Position)
– Befestigungsmittel, Fugenprofile und Einmessen
– Statische Nachweise für Standardbefestigung nach Systemangaben

Besondere Leistungen (gesondert vergütet)
– Auszugsversuche, Sonderstatik und Bauteilprüfungen
– Fensteranschlüsse, Laibungen und Attikaabdeckungen, soweit gesondert
– Gerüste über die Vorhaltung für das eigene Gewerk

Abrechnung
– Bekleidung nach Fläche in der Ansicht; Öffnungen nur oberhalb der Einzelgröße der ATV abziehen
– Laibungen, Ecken und Abschlüsse nach Länge

Hinweis für Planer
Bekleidungsmaterial, Fugenbild, Dämmstoff, Gebäudeklasse und Brandschutzanforderungen angeben.', 37),
  ('039', 'Trockenbauarbeiten', 'Geltende Regeln (in der bei Vertragsschluss gültigen Fassung)
– VOB/C ATV DIN 18340 Trockenbauarbeiten
– DIN 18181 Gipsplatten im Hochbau – Verarbeitung
– DIN 18183-1 Trennwände und Vorsatzschalen aus Gipsplatten mit Metallunterkonstruktion
– DIN 18168-1 Gipsplatten-Deckenbekleidungen und Unterdecken
– DIN 4102-4 bzw. Klassifizierung nach DIN EN 13501-2 (Feuerwiderstand)
– DIN 4109 Schallschutz; Merkblatt Nr. 2 Bundesverband der Gipsindustrie (Q1–Q4)

Ausführung
– Montage erst bei geschlossener Gebäudehülle und geeignetem Raumklima
– Anschlüsse an Rohbau gleitend bzw. schalltechnisch entkoppelt nach System
– Brand- und Schallschutzwände nur als nachgewiesenes System; Kennzeichnung und Übereinstimmungserklärung
– Installationen und Revisionsöffnungen mit TGA abstimmen; Beplankung erst nach Freigabe
– Verspachtelung nach vereinbarter Qualitätsstufe
– Ebenheit und Lotabweichung nach DIN 18202

Nebenleistungen (ohne eigene Position)
– Abstimmen und Anzeichnen der Wandachsen auf Grundlage vorhandener Achsen
– Dämmstreifen an Anschlüssen nach Systemvorgabe
– Verspachtelung in Qualitätsstufe Q2, soweit nichts anderes vereinbart

Besondere Leistungen (gesondert vergütet)
– Ausschnitte und Verstärkungen für Einbauten, Revisionsöffnungen
– Höhere Qualitätsstufen (Q3, Q4)
– Schließen von Öffnungen nach Installation anderer Gewerke

Abrechnung
– Wände und Decken nach Fläche; Öffnungen bis 2,5 m² Einzelgröße werden übermessen
– Anschlüsse, Ecken und Kanten nach Länge; Ausschnitte nach Stück

Hinweis für Planer
Wandtypen mit Feuerwiderstand, Schalldämmmaß und Beplankung in einer Wandtypenliste festlegen.', 38),
  ('040', 'Wärmeversorgungsanlagen – Betriebseinrichtungen', 'Geltende Regeln (in der bei Vertragsschluss gültigen Fassung)
– VOB/C ATV DIN 18380 Heizanlagen und zentrale Wassererwärmungsanlagen
– Gebäudeenergiegesetz (GEG)
– DIN EN 12828 Planung von Warmwasser-Heizungsanlagen
– VDI 2035 Vermeidung von Schäden in Warmwasser-Heizanlagen
– DVGW-Arbeitsblatt G 600 (TRGI) bei Gasfeuerstätten; 1. BImSchV
– DIN EN 13384 Abgasanlagen – Berechnung

Ausführung
– Aufstellung nach Herstellerangaben, Feuerungsverordnung und Abstandsregeln; Zugänglichkeit für Wartung
– Füll- und Ergänzungswasser nach VDI 2035 aufbereiten und protokollieren
– Sicherheitstechnische Ausrüstung nach DIN EN 12828 vollständig
– Abgasführung und Verbrennungsluft vor Inbetriebnahme mit dem Schornsteinfeger abstimmen
– Inbetriebnahme mit Einregulierung, Funktionsprüfung und Messprotokoll
– Revisionsunterlagen mit Bestandsplänen, Prüfprotokollen, Datenblättern und Wartungsanleitungen; Einweisung des Betreibers

Nebenleistungen (ohne eigene Position)
– Erstbefüllung, Entlüftung und Probebetrieb
– Abstimmung der Schnittstellen zu Elektro und Gebäudeautomation

Besondere Leistungen (gesondert vergütet)
– Fundamente, Schallentkopplung und Einbringhilfen über das übliche Maß
– Abnahme durch Sachverständige und Gebühren
– Wartung während der Gewährleistung

Abrechnung
– Geräte und Anlagenteile nach Stück einschließlich Zubehör laut LV

Hinweis für Planer
Heizlast nach DIN EN 12831, Wärmeerzeuger und Systemtemperaturen angeben.', 39),
  ('041', 'Wärmeversorgungsanlagen – Leitungen, Armaturen, Heizflächen', 'Geltende Regeln (in der bei Vertragsschluss gültigen Fassung)
– VOB/C ATV DIN 18380 Heizanlagen und zentrale Wassererwärmungsanlagen
– DIN EN 12828 Planung von Warmwasser-Heizungsanlagen
– DIN EN 442 Radiatoren und Konvektoren
– DIN EN 1264 Flächenheizung und -kühlung
– GEG Anlage 8 (Dämmung von Rohrleitungen)
– VDI 2035 Heizungswasser

Ausführung
– Leitungsführung mit Gefälle zu Entlüftungs- und Entleerungsstellen; Längenausdehnung berücksichtigen
– Befestigungen schallentkoppelt; Brandabschottungen nach Zulassung
– Druckprobe vor Verdecken und Dämmen mit Protokoll
– Spülen der Anlage vor Inbetriebnahme
– Hydraulischer Abgleich mit dokumentierten Einstellwerten
– Revisionsunterlagen mit Bestandsplänen, Prüfprotokollen, Datenblättern und Wartungsanleitungen; Einweisung des Betreibers

Nebenleistungen (ohne eigene Position)
– Befestigungsmaterial im üblichen Umfang
– Druckprobe, Spülen und Entlüften
– Anzeichnen von Schlitzen und Durchbrüchen

Besondere Leistungen (gesondert vergütet)
– Herstellen von Schlitzen und Durchbrüchen
– Dämmung der Leitungen, soweit gesondert (siehe LB 047)
– Demontage und Wiedermontage von Heizkörpern für andere Gewerke

Abrechnung
– Rohrleitungen nach Länge in der Achse; Formstücke und Armaturen übermessen, Armaturen nach Stück
– Heizflächen nach Stück; Flächenheizung nach Fläche

Hinweis für Planer
Systemtemperaturen, Rohrwerkstoffe und Heizflächen nach Raumbuch angeben.', 40),
  ('042', 'Gas- und Wasseranlagen – Leitungen, Armaturen', 'Geltende Regeln (in der bei Vertragsschluss gültigen Fassung)
– VOB/C ATV DIN 18381 Gas-, Wasser- und Entwässerungsanlagen innerhalb von Gebäuden
– DIN EN 806 und DIN 1988 Technische Regeln für Trinkwasser-Installationen
– Trinkwasserverordnung (TrinkwV)
– DVGW-Arbeitsblatt W 551 Legionellenwachstum und VDI/DVGW 6023 Hygiene
– DVGW-Arbeitsblatt G 600 (TRGI) für Gasinstallationen

Ausführung
– Nur Werkstoffe und Bauteile mit Eignung für Trinkwasser; Mischinstallationen nur zulässig kombinieren
– Hygiene: Rohrenden verschließen, Stagnation vermeiden, Inbetriebnahme kurz vor Nutzung
– Warmwasser- und Zirkulationstemperaturen nach Planung; Kaltwasser vor Erwärmung schützen
– Druckprüfung und Spülen nach Norm bzw. ZVSHK-Merkblatt mit Protokoll
– Gasleitungen mit Belastungs- und Dichtheitsprüfung nach TRGI
– Revisionsunterlagen mit Bestandsplänen, Prüfprotokollen, Datenblättern und Wartungsanleitungen; Einweisung des Betreibers

Nebenleistungen (ohne eigene Position)
– Druckprüfung und Spülen
– Befestigungsmaterial im üblichen Umfang

Besondere Leistungen (gesondert vergütet)
– Trinkwasseruntersuchungen durch akkreditierte Labore
– Schlitze, Durchbrüche und Dämmung, soweit gesondert
– Provisorische Bauwasserversorgung

Abrechnung
– Rohrleitungen nach Länge in der Achse; Formstücke übermessen; Armaturen nach Stück

Hinweis für Planer
Leitungsführung, Rohrwerkstoff und Hygienekonzept (z. B. Spülpläne) angeben.', 41),
  ('044', 'Abwasseranlagen – Leitungen, Abläufe', 'Geltende Regeln (in der bei Vertragsschluss gültigen Fassung)
– VOB/C ATV DIN 18381 Gas-, Wasser- und Entwässerungsanlagen innerhalb von Gebäuden
– DIN EN 12056 Schwerkraftentwässerungsanlagen innerhalb von Gebäuden
– DIN 1986-100 Entwässerungsanlagen für Gebäude und Grundstücke
– DIN EN 1610 Einbau und Prüfung von Abwasserleitungen (Grundleitungen)
– DIN 4109 Schallschutz im Hochbau

Ausführung
– Gefälle, Belüftung und Reinigungsöffnungen nach Bemessung
– Rückstauschutz unterhalb der Rückstauebene nach Planung
– Schallschutz durch geeignete Rohre und entkoppelte Befestigung
– Brandabschottungen nach Zulassung; Kennzeichnung
– Dichtheitsprüfung von Grund- und Sammelleitungen mit Protokoll
– Revisionsunterlagen mit Bestandsplänen, Prüfprotokollen, Datenblättern und Wartungsanleitungen; Einweisung des Betreibers

Nebenleistungen (ohne eigene Position)
– Verschließen offener Rohrenden
– Befestigungsmaterial im üblichen Umfang
– Dichtheitsprüfung

Besondere Leistungen (gesondert vergütet)
– Kamerabefahrung
– Schlitze und Durchbrüche
– Anschluss an Bestandsleitungen mit Sanierung

Abrechnung
– Rohrleitungen nach Länge in der Achse; Formstücke übermessen; Abläufe nach Stück

Hinweis für Planer
Entwässerungsverfahren, Rückstauebene und Schallschutzanforderungen angeben.', 42),
  ('045', 'Gas-, Wasser- und Entwässerungsanlagen – Ausstattung, Elemente', 'Geltende Regeln (in der bei Vertragsschluss gültigen Fassung)
– VOB/C ATV DIN 18381 Gas-, Wasser- und Entwässerungsanlagen innerhalb von Gebäuden
– DIN 18040-1/-2 Barrierefreies Bauen
– DIN EN 997 WC-Becken und DIN EN 14688 Waschbecken
– DIN EN 817 Mechanisch einstellbare Mischer
– DIN 4109 Schallschutz im Hochbau

Ausführung
– Montageelemente nach Herstellerangabe und mit schalltechnischer Entkoppelung
– Montagehöhen und Bewegungsflächen nach Planung, bei Barrierefreiheit nach DIN 18040
– Objekte erst nach Abschluss der Fliesen- und Malerarbeiten montieren
– Silikonfugen als Wartungsfugen; Hinweis an AG
– Funktionsprüfung aller Objekte; Armaturen einregulieren
– Objekte bis zur Abnahme schützen

Nebenleistungen (ohne eigene Position)
– Befestigungs- und Dichtmaterial
– Funktionsprüfung und Erstreinigung

Besondere Leistungen (gesondert vergütet)
– Zusatzausstattung wie Spiegel, Halte- und Stützgriffe, soweit gesondert
– Demontage vorhandener Objekte

Abrechnung
– Objekte und Elemente nach Stück einschließlich Zubehör laut LV

Hinweis für Planer
Objektliste mit Fabrikat, Montagehöhen und Barrierefreiheit je Raum beifügen.', 43),
  ('046', 'Gas-, Wasser- und Entwässerungsanlagen – Betriebseinrichtungen', 'Geltende Regeln (in der bei Vertragsschluss gültigen Fassung)
– VOB/C ATV DIN 18381 Gas-, Wasser- und Entwässerungsanlagen innerhalb von Gebäuden
– DIN EN 12050 Abwasserhebeanlagen
– DIN EN 13564 Rückstauverschlüsse
– DIN 1988-500 Druckerhöhungsanlagen
– DIN EN 806-2 und DVGW W 551 Trinkwassererwärmung und Legionellenschutz

Ausführung
– Aufstellung zugänglich für Bedienung und Wartung; Schall- und Schwingungsentkopplung
– Hebeanlagen mit Rückstauschleife über die Rückstauebene
– Druckerhöhung und Trinkwassererwärmung nach Bemessung
– Elektroanschluss und Störmeldung mit Elektro bzw. GA abstimmen
– Inbetriebnahme mit Funktionsprüfung und Protokoll
– Revisionsunterlagen mit Bestandsplänen, Prüfprotokollen, Datenblättern und Wartungsanleitungen; Einweisung des Betreibers

Nebenleistungen (ohne eigene Position)
– Erstbefüllung und Probebetrieb
– Einstellen der Schalt- und Regelwerte

Besondere Leistungen (gesondert vergütet)
– Wartungsverträge
– Fundamente und Einbringöffnungen über das übliche Maß

Abrechnung
– Anlagen nach Stück einschließlich Zubehör laut LV

Hinweis für Planer
Förderhöhen, Volumenströme und Aufstellräume angeben.', 44),
  ('047', 'Dämm- und Brandschutzarbeiten an technischen Anlagen', 'Geltende Regeln (in der bei Vertragsschluss gültigen Fassung)
– VOB/C ATV DIN 18421 Dämm- und Brandschutzarbeiten an technischen Anlagen
– DIN 4140 Dämmarbeiten an betriebs- und haustechnischen Anlagen
– VDI 2055 Wärme- und Kälteschutz
– GEG Anlage 8 (Mindestdämmung von Rohrleitungen)
– Muster-Leitungsanlagen-Richtlinie (MLAR)
– Zulassungen bzw. Bauartgenehmigungen der Abschottungen

Ausführung
– Dämmung erst nach erfolgreicher Druckprobe und Freigabe
– Kältedämmung diffusionsdicht und durchgehend; Stöße verkleben
– Abschottungen nur nach Zulassung; Abstände zwischen Abschottungen einhalten
– Kennzeichnungsschilder und Übereinstimmungserklärungen je Abschottung
– Ummantelungen an Formteilen sauber anpassen
– Fotodokumentation der Brandschutzmaßnahmen vor Verschließen

Nebenleistungen (ohne eigene Position)
– Befestigungs- und Klebematerial
– Kennzeichnung

Besondere Leistungen (gesondert vergütet)
– Ummantelungen aus Blech, soweit gesondert
– Abschottungen in Bestandsbauteilen mit Sanierung
– Rückbau vorhandener Dämmung

Abrechnung
– Dämmung von Rohrleitungen nach Länge in der Achse; Formstücke und Armaturen nach den Regeln der ATV (z. B. nach Stück)
– Abschottungen nach Stück je Größe

Hinweis für Planer
Dämmdicken, Brandschutzanforderungen und Abschottungssysteme angeben.', 45),
  ('049', 'Feuerlöschanlagen, Feuerlöschgeräte', 'Geltende Regeln (in der bei Vertragsschluss gültigen Fassung)
– VOB/C ATV DIN 18381 Gas-, Wasser- und Entwässerungsanlagen innerhalb von Gebäuden
– DIN 14462 Löschwassereinrichtungen
– DIN 1988-600 Trinkwasser-Installationen in Verbindung mit Feuerlösch- und Brandschutzanlagen
– DIN EN 12845 bzw. VdS CEA 4001 Sprinkleranlagen
– DIN EN 671 Wandhydranten und DIN EN 3 tragbare Feuerlöscher
– ASR A2.2 Maßnahmen gegen Brände

Ausführung
– Bemessung und Ausführung nach Brandschutzkonzept und Auflagen der Feuerwehr
– Trennung zum Trinkwasser nach DIN 1988-600
– Druck- und Funktionsprüfung mit Protokoll
– Prüfung durch Sachverständige vor Inbetriebnahme, soweit gefordert
– Kennzeichnung nach ASR A1.3 bzw. DIN EN ISO 7010
– Revisionsunterlagen mit Bestandsplänen, Prüfprotokollen, Datenblättern und Wartungsanleitungen; Einweisung des Betreibers

Nebenleistungen (ohne eigene Position)
– Druckprüfung und Spülen
– Kennzeichnung

Besondere Leistungen (gesondert vergütet)
– Sachverständigenprüfung und Gebühren
– Wartung und Instandhaltung

Abrechnung
– Leitungen nach Länge in der Achse; Geräte und Hydranten nach Stück

Hinweis für Planer
Löschwasserbedarf, Anlagenart und Schutzbereiche angeben.', 46),
  ('053', 'Niederspannungsanlagen – Kabel/Leitungen, Verlegesysteme, Installationsgeräte', 'Geltende Regeln (in der bei Vertragsschluss gültigen Fassung)
– VOB/C ATV DIN 18382 Nieder- und Mittelspannungsanlagen mit Nennspannungen bis 36 kV
– DIN VDE 0100 Errichten von Niederspannungsanlagen
– DIN VDE 0100-600 Erstprüfungen
– DIN 18015 Elektrische Anlagen in Wohngebäuden
– TAB des Netzbetreibers
– Muster-Leitungsanlagen-Richtlinie (MLAR)

Ausführung
– Verlegung nach Planung; Installationszonen nach DIN 18015-3 beachten
– Funktionserhalt und Brandschutz von Leitungsanlagen nach MLAR
– Kennzeichnung von Leitungen und Verteilungen
– Erstprüfung mit Messprotokollen vor Inbetriebnahme
– Abstimmung mit Trockenbau, Haustechnik und Gebäudeautomation
– Revisionsunterlagen mit Bestandsplänen, Prüfprotokollen, Datenblättern und Wartungsanleitungen; Einweisung des Betreibers

Nebenleistungen (ohne eigene Position)
– Befestigungsmaterial
– Erstprüfung und Messprotokolle

Besondere Leistungen (gesondert vergütet)
– Schlitze und Durchbrüche
– Brandschutzabschottungen, soweit gesondert
– Provisorische Baustromanlagen

Abrechnung
– Kabel und Leitungen nach Länge; Verlegesysteme nach Länge; Geräte nach Stück

Hinweis für Planer
Netzform, Anschlussleistung und Raumbuch mit Ausstattung je Raum angeben.', 47),
  ('055', 'Ersatzstromversorgungsanlagen', 'Geltende Regeln (in der bei Vertragsschluss gültigen Fassung)
– VOB/C ATV DIN 18382 Nieder- und Mittelspannungsanlagen mit Nennspannungen bis 36 kV
– DIN VDE 0100-551 Niederspannungs-Stromerzeugungseinrichtungen
– DIN VDE 0100-560 Einrichtungen für Sicherheitszwecke
– DIN 6280-13 Stromerzeugungsaggregate für Sicherheitszwecke
– DIN EN 62040 Unterbrechungsfreie Stromversorgungssysteme
– AwSV für Kraftstoffbehälter

Ausführung
– Aufstellung nach Herstellerangabe; Abgas, Zu- und Abluft sowie Schallschutz
– Kraftstofflagerung nach Wasserrecht; Auffangwannen
– Netzumschaltung mit Netzbetreiber und Verteilung abstimmen
– Probebetrieb unter Last mit Protokoll
– Prüfung durch Sachverständige, soweit gefordert
– Revisionsunterlagen mit Bestandsplänen, Prüfprotokollen, Datenblättern und Wartungsanleitungen; Einweisung des Betreibers

Nebenleistungen (ohne eigene Position)
– Erstbefüllung mit Betriebsstoffen
– Probebetrieb

Besondere Leistungen (gesondert vergütet)
– Sachverständigenprüfung
– Wartungsverträge
– Kraftstoff für Probebetriebe über das übliche Maß

Abrechnung
– Anlagen nach Stück einschließlich Zubehör laut LV

Hinweis für Planer
Leistung, Überbrückungszeit und Verbraucher angeben.', 48),
  ('063', 'Gefahrenmeldeanlagen', 'Geltende Regeln (in der bei Vertragsschluss gültigen Fassung)
– VOB/C ATV DIN 18382 Nieder- und Mittelspannungsanlagen mit Nennspannungen bis 36 kV
– DIN 14675-1 Brandmeldeanlagen – Aufbau und Betrieb
– DIN VDE 0833 Gefahrenmeldeanlagen für Brand, Einbruch und Überfall
– DIN EN 54 Brandmeldeanlagen
– DIN EN 50131 Einbruchmeldeanlagen
– Technische Anschlussbedingungen der Feuerwehr

Ausführung
– Ausführung nur durch nach DIN 14675 zertifizierte Fachfirmen
– Melderanordnung nach Konzept und Norm
– Brandfallsteuerungen mit anderen Gewerken abstimmen
– Funktionsprüfung und Abnahme mit Feuerwehr bzw. Sachverständigem
– Feuerwehrlaufkarten und Dokumentation
– Revisionsunterlagen mit Bestandsplänen, Prüfprotokollen, Datenblättern und Wartungsanleitungen; Einweisung des Betreibers

Nebenleistungen (ohne eigene Position)
– Befestigungsmaterial
– Programmierung im üblichen Umfang
– Funktionsprüfung

Besondere Leistungen (gesondert vergütet)
– Sachverständigenprüfung
– Aufschaltung und Gebühren
– Wartungsverträge

Abrechnung
– Geräte und Melder nach Stück; Leitungen nach Länge

Hinweis für Planer
Schutzumfang, Alarmierung und Brandfallsteuerungen angeben.', 49),
  ('070', 'Gebäudeautomation', 'Geltende Regeln (in der bei Vertragsschluss gültigen Fassung)
– VOB/C ATV DIN 18386 Gebäudeautomation
– VDI 3814 Gebäudeautomation (Planung, Ausführung, Datenpunktlisten)
– DIN EN ISO 16484 Systeme der Gebäudeautomation (u. a. BACnet in Teil 5)
– DIN EN ISO 52120-1 Einfluss der Gebäudeautomation auf die Energieeffizienz
– VDI 3813 Raumautomation
– GEG (Anforderungen an Gebäudeautomation in Nichtwohngebäuden)

Ausführung
– Funktionen nach freigegebener Funktionsbeschreibung und Datenpunktliste; Adressierung nach Kennzeichnungsschlüssel des AG
– Schnittstellen und Protokolle zu Heizung, Lüftung, Kälte, Elektro und Sonnenschutz frühzeitig abstimmen
– Schaltschränke mit Stromlaufplänen, Reserve und Kennzeichnung
– Punkt-zu-Punkt-Test, Funktionsprüfung je Anlage und Übergabe der Datenpunkte an die Managementebene
– Mitwirkung an integralen Tests der Brandfallsteuerungen
– Software, Parametrierung und Zugangsdaten vollständig übergeben; IT-Sicherheit nach Vorgabe des Betreibers

Nebenleistungen (ohne eigene Position)
– Programmierung und Parametrierung der beschriebenen Funktionen
– Inbetriebnahme, Punkt-zu-Punkt-Test und Einweisung
– Dokumentation nach VDI 3814

Besondere Leistungen (gesondert vergütet)
– Optimierung im Betrieb (Monitoring) über die Inbetriebnahme hinaus
– Lizenzen, Fernzugänge und Wartungsverträge, soweit gesondert
– Anbindung von Fremdanlagen, deren Schnittstellen nicht beschrieben sind

Abrechnung
– Hardware nach Stück; Datenpunkte nach Stück je Art; Software und Bedienebene pauschal oder je Lizenz laut LV
– Leitungen nach Länge, soweit nicht in LB 053 enthalten

Hinweis für Planer
Funktionsbeschreibung, Datenpunktliste, GA-Effizienzklasse und Kennzeichnungsschlüssel beifügen.', 50),
  ('075', 'Raumlufttechnische Anlagen', 'Geltende Regeln (in der bei Vertragsschluss gültigen Fassung)
– VOB/C ATV DIN 18379 Raumlufttechnische Anlagen
– DIN EN 16798-3 Lüftung von Nichtwohngebäuden
– DIN 1946-6 Lüftung von Wohnungen
– VDI 6022 Blatt 1 Hygieneanforderungen an RLT-Anlagen
– DIN EN 12599 Prüf- und Messverfahren für die Übergabe
– Muster-Lüftungsanlagen-Richtlinie (M-LüAR); DIN EN 1507 und DIN EN 12237 Dichtheit von Luftleitungen

Ausführung
– Luftleitungen bis zur Montage verschlossen lagern und während der Bauzeit offene Enden abdecken (Hygiene)
– Brandschutzklappen und Abschottungen nur nach Zulassung; Zugänglichkeit für Wartung
– Revisionsöffnungen nach VDI 6022 und Planung
– Schall- und Schwingungsentkopplung an Geräten und Leitungen
– Einregulierung der Volumenströme mit Messprotokoll; Funktions- und Leistungsprüfung nach DIN EN 12599
– Hygieneerstinspektion nach VDI 6022 vor Übergabe; Revisionsunterlagen mit Einweisung

Nebenleistungen (ohne eigene Position)
– Verschließen und Reinigen der Luftleitungen im eigenen Arbeitsablauf
– Erstfilterung während des Probebetriebs
– Einregulierung und Messprotokolle

Besondere Leistungen (gesondert vergütet)
– Dichtheitsprüfungen über den vereinbarten Umfang, Reinigung nach Verschmutzung durch Dritte
– Ersatzfilter für Baubetrieb, Wartungsverträge
– Brandschutzklappen-Ansteuerung, soweit nicht beschrieben

Abrechnung
– Luftleitungen nach Fläche der Abwicklung bzw. runde Leitungen nach Länge laut LV; Formstücke nach den Regeln der ATV
– Geräte, Klappen und Luftdurchlässe nach Stück

Hinweis für Planer
Luftmengen, Hygieneanforderungen, Dichtheitsklasse und Brandschutzkonzept angeben.', 51),
  ('078', 'Kälteanlagen für raumlufttechnische Anlagen', 'Geltende Regeln (in der bei Vertragsschluss gültigen Fassung)
– VOB/C ATV DIN 18379 Raumlufttechnische Anlagen
– DIN EN 378 Kälteanlagen und Wärmepumpen – Sicherheit und Umwelt
– F-Gas-Verordnung (EU) 2024/573 und Chemikalien-Klimaschutzverordnung
– DIN EN 14511 Leistungsbestimmung von Klimageräten und Wärmepumpen
– Druckgeräterichtlinie bzw. Betriebssicherheitsverordnung

Ausführung
– Kältemittel und Füllmenge nach Planung und Sicherheitsanforderungen der Aufstellräume
– Ausführung nur durch zertifiziertes Personal und zertifizierte Betriebe
– Festigkeits- und Dichtheitsprüfung sowie Evakuieren vor Befüllung mit Protokoll
– Kondensatableitung und Schallschutz der Außengeräte nach Planung
– Inbetriebnahme mit Leistungsmessung; Logbuch nach F-Gas-Vorgaben anlegen
– Revisionsunterlagen mit Bestandsplänen, Prüfprotokollen, Datenblättern und Wartungsanleitungen; Einweisung des Betreibers

Nebenleistungen (ohne eigene Position)
– Erstbefüllung mit Kältemittel
– Dichtheitsprüfung und Probebetrieb

Besondere Leistungen (gesondert vergütet)
– Wartungsverträge und wiederkehrende Dichtheitskontrollen
– Prüfung durch zugelassene Überwachungsstellen
– Fundamente und Schallschutzeinhausungen

Abrechnung
– Anlagen nach Stück; Kältemittelleitungen nach Länge in der Achse

Hinweis für Planer
Kälteleistung, Kältemittel und Aufstellorte angeben.', 52),
  ('050', 'Blitzschutz- und Erdungsanlagen, Überspannungsschutz', 'Geltende Regeln (in der bei Vertragsschluss gültigen Fassung)
– VOB/C ATV DIN 18384 Blitzschutzanlagen
– DIN EN 62305-1 bis -4 (VDE 0185-305) Blitzschutz
– DIN 18014 Fundamenterder – Planung, Ausführung und Dokumentation
– DIN VDE 0100-540 Erdungsanlagen und Schutzleiter
– DIN VDE 0100-443 und DIN VDE 0100-534 Überspannungsschutz

Ausführung
– Blitzschutzklasse nach Risikobewertung bzw. Vorgabe der Planung; Fangeinrichtungen und Ableitungen danach anordnen
– Fundament- bzw. Ringerder vor dem Betonieren einbauen, Durchgangsmessung durchführen und mit Fotos dokumentieren
– Anschlussfahnen an Potentialausgleichsschiene und Messstellen dauerhaft korrosionsgeschützt herausführen
– Trennungsabstände zu leitfähigen Installationen einhalten oder Näherungen fachgerecht verbinden
– Abdichtungen und Dachhaut beim Befestigen nicht durchdringen; Halter mit Dachdecker abstimmen
– Abschlussprüfung mit Erdungsmessung und Prüfbericht; Bestandsplan mit Erdern und Messstellen

Nebenleistungen (ohne eigene Position)
– Befestigungsmaterial und Verbindungsklemmen
– Durchgangs- und Erdungsmessungen sowie Prüfbericht für die eigene Anlage
– Kennzeichnung der Trennstellen

Besondere Leistungen (gesondert vergütet)
– Risikobewertung, Blitzschutzplanung und Prüfung durch Sachverständige
– Erdungsmessungen für Anlagen Dritter, Tiefenerder bei schlechtem Erdwiderstand
– Überspannungsschutzgeräte, soweit nicht ausdrücklich beschrieben

Abrechnung
– Leitungen und Erder nach Länge; Fangstangen, Klemmen, Messstellen und Schutzgeräte nach Stück

Hinweis für Planer
Blitzschutzklasse und Schnittstellen zu Rohbau (Fundamenterder) und Dach angeben.', 53),
  ('058', 'Leuchten und Lampen', 'Geltende Regeln (in der bei Vertragsschluss gültigen Fassung)
– VOB/C ATV DIN 18382 Nieder- und Mittelspannungsanlagen mit Nennspannungen bis 36 kV
– DIN EN 12464-1 Beleuchtung von Arbeitsstätten in Innenräumen, DIN EN 12464-2 im Freien
– ASR A3.4 Beleuchtung und Sichtverbindung
– DIN EN 60598 Leuchten
– DIN VDE 0100-559 Leuchten und Beleuchtungsanlagen

Ausführung
– Leuchtentyp, Lichtfarbe und Farbwiedergabe nach Lichtplanung; Musterleuchte vor Bestellung
– Deckeneinbauleuchten mit Trockenbau und Lüftung koordinieren (Raster, Einbautiefe, Abstand zu Klappen)
– Brandschutz beachten: Einbauleuchten in Decken mit Feuerwiderstand nur mit geeigneter Abdeckung bzw. Zulassung
– Befestigung tragfähig; Leuchten über 5 kg bzw. Pendelleuchten mit eigener Abhängung
– Adressierung und Gruppierung für Lichtsteuerung nach Planung; Funktionstest je Raum
– Leuchten bis zur Abnahme staubfrei halten; Leuchtmittel- und Treiberdaten übergeben

Nebenleistungen (ohne eigene Position)
– Befestigungsmaterial und Anschluss an vorhandene Auslässe
– Funktionsprüfung und Reinigung bei Übergabe

Besondere Leistungen (gesondert vergütet)
– Lichtberechnungen und Messungen der Beleuchtungsstärke
– Programmierung von Lichtmanagementsystemen über die Grundfunktion
– Zusätzliche Abhängungen, Tragschienen und Montage in großen Höhen

Abrechnung
– Leuchten nach Stück einschließlich Leuchtmittel und Betriebsgerät; Lichtbänder nach Länge laut LV

Hinweis für Planer
Leuchtenliste mit Typ, Lichtfarbe, Schutzart und Steuerung je Raum beifügen.', 54),
  ('059', 'Sicherheitsbeleuchtungsanlagen', 'Geltende Regeln (in der bei Vertragsschluss gültigen Fassung)
– VOB/C ATV DIN 18382 Nieder- und Mittelspannungsanlagen mit Nennspannungen bis 36 kV
– DIN EN 1838 Angewandte Lichttechnik – Notbeleuchtung
– DIN VDE V 0108-100-1 Sicherheitsbeleuchtungsanlagen
– DIN EN 50171 Zentrale Stromversorgungssysteme
– DIN EN 60598-2-22 Leuchten für Notbeleuchtung
– DIN EN ISO 7010 und ASR A1.3 Sicherheitskennzeichnung

Ausführung
– Anordnung von Rettungszeichen- und Sicherheitsleuchten nach Brandschutzkonzept und Flucht- und Rettungsplan
– Stromversorgung (Einzelbatterie oder zentrale Anlage) mit geforderter Nennbetriebsdauer
– Leitungen zu Unterverteilungen mit Funktionserhalt nach MLAR; Stromkreise brandabschnittsweise
– Überwachungs- und Prüfeinrichtung einrichten; Prüfbuch anlegen
– Erstprüfung mit Messung der Beleuchtungsstärke an Rettungswegen und Protokoll
– Prüfung durch Prüfsachverständige vor Inbetriebnahme, soweit bauordnungsrechtlich gefordert

Nebenleistungen (ohne eigene Position)
– Befestigungsmaterial und Kennzeichnung der Stromkreise
– Funktionsprüfung und Erstbefüllung des Prüfbuchs

Besondere Leistungen (gesondert vergütet)
– Sachverständigenprüfung und Gebühren
– Wartungsverträge und wiederkehrende Prüfungen
– Anpassen an geänderte Rettungswegplanung nach Auftragserteilung

Abrechnung
– Leuchten, Geräte und Batterieanlagen nach Stück; Leitungen nach Länge

Hinweis für Planer
Systemart, Nennbetriebsdauer und Rettungswegplan angeben.', 55),
  ('061', 'Kommunikationsnetze', 'Geltende Regeln (in der bei Vertragsschluss gültigen Fassung)
– VOB/C ATV DIN 18382 Nieder- und Mittelspannungsanlagen mit Nennspannungen bis 36 kV
– DIN EN 50173 Anwendungsneutrale Kommunikationskabelanlagen
– DIN EN 50174-1 bis -3 Installation von Kommunikationsverkabelung
– DIN EN 50310 Potentialausgleich und Erdung für Gebäude mit Einrichtungen der Informationstechnik
– DIN EN 50346 Prüfung installierter Verkabelung

Ausführung
– Übertragungsklasse (Kupfer) bzw. Faserkategorie (LWL) durchgängig mit Komponenten eines Systems
– Biegeradien, Zugkräfte und Trennabstände zu Energieleitungen nach DIN EN 50174-2 einhalten
– Brandabschottungen bei Durchführungen; Kabelwege mit Belegungsreserve
– Einheitliche Kennzeichnung von Dosen, Patchfeldern und Kabeln nach Beschriftungskonzept des AG
– Abnahmemessung aller Strecken (Permanent Link) mit Messprotokoll als Datei
– Bestandsdokumentation mit Belegungsplänen und Schrankansichten

Nebenleistungen (ohne eigene Position)
– Befestigungsmaterial, Beschriftung und Abnahmemessung
– Potentialausgleich der Verteilerschränke

Besondere Leistungen (gesondert vergütet)
– Aktive Netzwerkkomponenten und deren Konfiguration
– Verteilerschränke und Patchkabel, soweit gesondert
– Nachmessungen wegen Beschädigungen durch Dritte

Abrechnung
– Kabel nach Länge; Anschlussdosen, Patchfelder und Spleiße nach Stück

Hinweis für Planer
Übertragungsklasse, Lage der Verteiler und Beschriftungskonzept angeben.', 56),
  ('062', 'Kommunikationsanlagen, Türsprech- und Rufanlagen', 'Geltende Regeln (in der bei Vertragsschluss gültigen Fassung)
– VOB/C ATV DIN 18382 Nieder- und Mittelspannungsanlagen mit Nennspannungen bis 36 kV
– DIN VDE 0834-1/-2 Rufanlagen in Krankenhäusern, Pflegeheimen und ähnlichen Einrichtungen
– DIN EN 62820 Gebäudesprechanlagen
– DIN EN 60728 Kabelnetze für Fernseh- und Tonsignale
– DIN 18040 Barrierefreies Bauen (Zwei-Sinne-Prinzip)

Ausführung
– Anlagenaufbau und Funktionen nach Funktionsbeschreibung; Komponenten eines Systems
– Montagehöhen von Sprechstellen und Bedienelementen nach Planung, bei Barrierefreiheit optisch und akustisch
– Schnittstellen zu Zutrittskontrolle, Türöffnern, Netzwerk und Telefonanlage abstimmen
– Rufanlagen nach DIN VDE 0834 mit Überwachung und Störmeldung; Zimmerzuordnung nach Raumbuch
– Antennen- und Verteilanlagen mit Pegelmessung an allen Anschlussdosen
– Funktionsprüfung je Teilnehmer, Einweisung und Dokumentation

Nebenleistungen (ohne eigene Position)
– Befestigungsmaterial und Grundprogrammierung
– Funktionsprüfung und Messprotokolle

Besondere Leistungen (gesondert vergütet)
– Erweiterte Programmierung, Software-Lizenzen und Anbindung an Fremdsysteme
– Wartungsverträge

Abrechnung
– Zentralen, Sprech- und Rufstellen nach Stück; Leitungen nach Länge

Hinweis für Planer
Funktionsumfang, Teilnehmerzahl und Schnittstellen angeben.', 57),
  ('064', 'Zutrittskontroll- und Zeiterfassungsanlagen', 'Geltende Regeln (in der bei Vertragsschluss gültigen Fassung)
– VOB/C ATV DIN 18382 Nieder- und Mittelspannungsanlagen mit Nennspannungen bis 36 kV
– DIN EN 60839-11-1 Zutrittskontrollanlagen
– VdS 2358 Richtlinien für Zutrittskontrollanlagen
– DIN EN 13637 Elektrisch gesteuerte Fluchttüranlagen
– DSGVO und BDSG für die Verarbeitung personenbezogener Daten

Ausführung
– Ausführung nach Tür- und Berechtigungskonzept; Leser, Zentralen und Türkomponenten aufeinander abgestimmt
– Fluchtwegfunktionen dürfen nicht beeinträchtigt werden; Fluchttüren nur mit zugelassener Steuerung
– Brandfallsteuerung und Freischaltung mit Brandmeldeanlage abstimmen
– Daten verschlüsselt übertragen; Zugangsdaten und Rechte nach Vorgabe des Betreibers
– Datenschutz und Mitbestimmung (Zeiterfassung) vor Inbetriebnahme durch den AG geklärt
– Funktionsprüfung je Tür, Einweisung und Dokumentation

Nebenleistungen (ohne eigene Position)
– Befestigungsmaterial und Grundprogrammierung
– Funktionsprüfung

Besondere Leistungen (gesondert vergütet)
– Anlage von Berechtigungen und Personaldaten
– Software-Lizenzen, Ausweismedien und Wartungsverträge
– Schnittstellen zu Personal- oder Lohnsoftware

Abrechnung
– Leser, Zentralen und Terminals nach Stück; Leitungen nach Länge; Lizenzen nach Stück

Hinweis für Planer
Türliste mit Zutrittsfunktionen, Fluchtwegfunktion und Ausweistechnik beifügen.', 58),
  ('069', 'Aufzüge', 'Geltende Regeln (in der bei Vertragsschluss gültigen Fassung)
– VOB/C ATV DIN 18385 Förderanlagen, Aufzugsanlagen, Fahrtreppen und Fahrsteige
– DIN EN 81-20 und DIN EN 81-50 Sicherheitsregeln für Personen- und Lastenaufzüge
– DIN EN 81-70 Zugänglichkeit für Personen einschließlich Personen mit Behinderungen
– DIN EN 81-72 Feuerwehraufzüge und DIN EN 81-73 Verhalten im Brandfall
– Aufzugsrichtlinie 2014/33/EU und Betriebssicherheitsverordnung (BetrSichV)

Ausführung
– Schachtmaße, Schachtgrube, Schachtkopf und Lotabweichung vor Fertigung prüfen; Abweichungen melden
– Anforderungen an Rohbau (Ankerschienen, Montagehaken, Türöffnungen) rechtzeitig übergeben
– Zwei-Wege-Notrufsystem mit ständig besetzter Stelle
– Brandfallsteuerung und Schnittstellen zu BMA und Gebäudeautomation abstimmen
– Prüfung vor Inbetriebnahme durch eine zugelassene Überwachungsstelle
– Konformitätserklärung, Prüfbescheinigung, Betriebsanleitung und Notbefreiungsanleitung übergeben

Nebenleistungen (ohne eigene Position)
– Montagegerüst im Schacht für die eigene Montage
– Einweisung des Betreibers und Befreiungsunterweisung

Besondere Leistungen (gesondert vergütet)
– Wartung und Notrufaufschaltung nach Übergabe
– Bauzeitliche Nutzung durch andere Gewerke
– Prüfgebühren der Überwachungsstelle, soweit gesondert

Abrechnung
– Anlagen nach Stück einschließlich Zubehör laut LV; Zusatzausstattungen nach Stück

Hinweis für Planer
Nennlast, Förderhöhe, Haltestellen, Kabinenmaße und Brandfallanforderungen angeben.', 59),
  ('080', 'Straßen, Wege, Plätze', 'Geltende Regeln (in der bei Vertragsschluss gültigen Fassung)
– VOB/C ATV DIN 18315 Oberbauschichten ohne Bindemittel und DIN 18318 Pflasterdecken, Plattenbeläge, Einfassungen
– ZTV E-StB 17 Erdarbeiten im Straßenbau
– ZTV SoB-StB 20 Schichten ohne Bindemittel
– ZTV Pflaster-StB 20 Pflasterdecken, Plattenbeläge und Einfassungen
– RStO 12 Standardisierung des Oberbaus
– DIN 18134 Plattendruckversuch; DIN 18040-3 Barrierefreiheit im Verkehrsraum

Ausführung
– Planum und Tragschichten mit geforderten Verformungsmoduln; Nachweis mit Plattendruckversuch
– Gefälle und Höhen nach Planung; Wasserabfluss sicherstellen
– Bettung und Fugenmaterial nach Regelwerk; Pflaster nicht auf zu hoher Bettung
– Einfassungen auf Fundament mit Rückenstütze
– Ebenheit mit Messlatte prüfen; Fugen vollständig füllen
– Bestandsplan mit Höhen übergeben

Nebenleistungen (ohne eigene Position)
– Eigenüberwachung der Verdichtung
– Anarbeiten an Einbauten mit geraden Schnitten

Besondere Leistungen (gesondert vergütet)
– Prüfungen durch Dritte
– Passsteine und Schnitte an Rundungen
– Entsorgung von Altbelägen

Abrechnung
– Flächen nach Fläche; Aussparungen nur oberhalb der Einzelgröße der ATV abziehen
– Einfassungen nach Länge; Einbauten nach Stück

Hinweis für Planer
Belastungsklasse nach RStO, Belagart und Entwässerung angeben.', 60),
  ('081', 'Betonerhaltungsarbeiten', 'Geltende Regeln (in der bei Vertragsschluss gültigen Fassung)
– VOB/C ATV DIN 18349 Betonerhaltungsarbeiten
– Technische Regel Instandhaltung von Betonbauwerken (TR Instandhaltung, DIBt)
– DIN EN 1504 Produkte und Systeme für Schutz und Instandsetzung von Betontragwerken
– DAfStb-Richtlinie Schutz und Instandsetzung von Betonbauteilen (soweit vereinbart)
– ZTV-ING Teil 3 Massivbau (bei Ingenieurbauwerken)

Ausführung
– Instandsetzung nach Instandhaltungsplan des sachkundigen Planers
– Ausführung nur durch Betriebe mit Nachweis der Qualifikation (z. B. SIVV-Schein der Bauleitung)
– Untergrundvorbereitung bis zum tragfähigen Beton; Bewehrung freilegen und entrosten nach Vorgabe
– Haftzugfestigkeit, Carbonatisierungstiefe bzw. Chloridgehalt nach Prüfplan prüfen
– Witterungsbedingungen und Taupunktabstand bei Beschichtungen beachten
– Ausführungsprotokolle mit Klimadaten und Materialverbrauch führen

Nebenleistungen (ohne eigene Position)
– Eigenüberwachung nach Prüfplan
– Abdecken angrenzender Bauteile

Besondere Leistungen (gesondert vergütet)
– Zusätzliche Untersuchungen durch Dritte
– Einhausungen und Staubabsaugung
– Mehrmengen bei unvorhersehbaren Schäden

Abrechnung
– Flächen nach Fläche; Fehlstellen nach Fläche und Tiefe; Bewehrungsergänzungen nach Gewicht oder Länge

Hinweis für Planer
Instandhaltungsplan mit Schadenskartierung und Prüfplan beifügen.', 61),
  ('082', 'Bekämpfender Holzschutz', 'Geltende Regeln (in der bei Vertragsschluss gültigen Fassung)
– VOB/C ATV DIN 18363 Maler- und Lackierarbeiten (Holzschutzarbeiten)
– DIN 68800-4 Holzschutz – Bekämpfungs- und Sanierungsmaßnahmen gegen holzzerstörende Pilze und Insekten
– DIN 68800-1 Holzschutz – Allgemeines
– WTA-Merkblätter zum Holzschutz
– Biozidprodukte-Verordnung (EU) 528/2012 und GefStoffV

Ausführung
– Bekämpfung erst nach Befund durch Sachkundige mit Bestimmung des Schädlings
– Ursachen (Feuchte) vorrangig beseitigen; chemische Mittel nur so viel wie nötig
– Heißluftverfahren mit Temperaturmessung und Protokoll
– Schutzmittel nur mit Zulassung und für den Anwendungsbereich
– Arbeitsschutz und Lüftung nach Sicherheitsdatenblatt
– Kennzeichnung behandelter Bauteile und Bericht an den AG

Nebenleistungen (ohne eigene Position)
– Absperren des Arbeitsbereichs
– Dokumentation der Maßnahmen

Besondere Leistungen (gesondert vergütet)
– Rückbau befallener Bauteile und Entsorgung
– Gutachten Dritter
– Nachkontrollen über den vereinbarten Umfang

Abrechnung
– Behandelte Flächen nach Fläche; Hölzer nach Länge; Heißluftverfahren nach Raummaß oder pauschal laut LV

Hinweis für Planer
Befund und Sanierungskonzept beifügen: [Gutachten].', 62),
  ('083', 'Sanierungsarbeiten an schadstoffhaltigen Bauteilen', 'Geltende Regeln (in der bei Vertragsschluss gültigen Fassung)
– VOB/C ATV DIN 18459 Abbruch- und Rückbauarbeiten
– Gefahrstoffverordnung (GefStoffV)
– TRGS 519 Asbest – Abbruch-, Sanierungs- und Instandhaltungsarbeiten
– TRGS 521 Abbruch-, Sanierungs- und Instandhaltungsarbeiten mit alter Mineralwolle
– TRGS 524 Schutzmaßnahmen bei Tätigkeiten in kontaminierten Bereichen
– TRGS 551 Teer und andere Pyrolyseprodukte

Ausführung
– Arbeiten nach Schadstoffgutachten und Arbeitsplan; Anzeige an die Behörde fristgerecht
– Sachkundiges Personal nach TRGS; Aufsichtführender vor Ort
– Schwarzbereich mit Unterdruck, Schleusen und Messprotokollen
– Getrennte Erfassung, Verpackung und Kennzeichnung der Abfälle
– Freimessung nach Sanierung durch unabhängige Stelle
– Entsorgungsnachweise und Abschlussbericht übergeben

Nebenleistungen (ohne eigene Position)
– Arbeitsplan und Gefährdungsbeurteilung
– Persönliche Schutzausrüstung
– Reinigen des Arbeitsbereichs

Besondere Leistungen (gesondert vergütet)
– Freimessungen
– Entsorgung und Deponiekosten, soweit gesondert
– Zusätzliche Untersuchungen

Abrechnung
– Flächen nach Fläche; Bauteile nach Stück oder Länge; Abfälle nach Gewicht laut Wiegeschein

Hinweis für Planer
Schadstoffgutachten und Mengenermittlung beifügen.', 63),
  ('084', 'Abbruch- und Rückbauarbeiten', 'Geltende Regeln (in der bei Vertragsschluss gültigen Fassung)
– VOB/C ATV DIN 18459 Abbruch- und Rückbauarbeiten
– DGUV Vorschrift 38 Bauarbeiten
– Kreislaufwirtschaftsgesetz (KrWG) und Gewerbeabfallverordnung (GewAbfV)
– DIN 4150-2/-3 Erschütterungen im Bauwesen (Menschen in Gebäuden, bauliche Anlagen)
– AVV Baulärm
– Bauordnungsrechtliche Abbruchgenehmigung bzw. -anzeige

Ausführung
– Abbruchanweisung mit Reihenfolge und Verfahren vor Beginn vorlegen; bei Teilabbruch Standsicherheit der verbleibenden Bauteile nachweisen lassen
– Schadstofferkundung abgeschlossen; belastete Bauteile werden vorab nach LB 083 ausgebaut
– Ver- und Entsorgungsleitungen vor Beginn durch die Versorger stilllegen lassen
– Rückbau selektiv, damit Abfälle sortenrein getrennt und verwertet werden können
– Staub durch Benetzen mindern; Lärm- und Erschütterungsgrenzen gegenüber Nachbarn einhalten
– Bauteile, die erhalten bleiben, schützen; Schnitt- und Trennflächen sauber herstellen

Nebenleistungen (ohne eigene Position)
– Sichern der Abbruchstelle und Absperren der Gefahrenbereiche
– Laden, Zwischenlagern und Sortieren der Abbruchmassen auf der Baustelle
– Beseitigen von Staub und Schutt im Arbeitsbereich

Besondere Leistungen (gesondert vergütet)
– Beweissicherung an Nachbarbauwerken und Erschütterungsmessungen
– Abfangen, Unterfangen und Abstützen verbleibender Bauteile
– Transport und Entsorgung, soweit in LB 087 ausgeschrieben

Abrechnung
– Nach Raummaß des umbauten Raums, nach Fläche, Länge oder Stück laut LV
– Abfälle nach Gewicht laut Wiegeschein, soweit Entsorgung enthalten ist

Hinweis für Planer
Abbruchumfang mit Plänen, Schadstoffgutachten und zu erhaltenden Bauteilen beifügen.', 64),
  ('087', 'Abfallentsorgung, Verwertung und Beseitigung', 'Geltende Regeln (in der bei Vertragsschluss gültigen Fassung)
– VOB/C ATV DIN 18299 Allgemeine Regelungen für Bauarbeiten jeder Art
– Kreislaufwirtschaftsgesetz (KrWG) und Gewerbeabfallverordnung (GewAbfV)
– Nachweisverordnung (NachwV) und Abfallverzeichnis-Verordnung (AVV)
– Ersatzbaustoffverordnung (ErsatzbaustoffV) und Deponieverordnung (DepV)
– LAGA PN 98 Richtlinie für die Probenahme

Ausführung
– Abfälle bereits an der Anfallstelle nach Abfallschlüsseln getrennt halten; Getrennthaltung dokumentieren
– Beprobung und Deklarationsanalyse nach Vorgabe des Entsorgers bzw. der Behörde
– Entsorgung nur über zugelassene Beförderer und Anlagen; Annahmebedingungen vorher klären
– Gefährliche Abfälle mit elektronischem Nachweisverfahren; Erzeugernummer des AG verwenden
– Wiegescheine und Übernahmescheine je Fuhre zeitnah an die Bauleitung
– Verwertung hat Vorrang vor Beseitigung; Ersatzbaustoffe nur mit Klassifizierung

Nebenleistungen (ohne eigene Position)
– Bereitstellen und Wechseln der Behälter im vereinbarten Umfang
– Zusammenstellen der Entsorgungsdokumentation

Besondere Leistungen (gesondert vergütet)
– Analysen, Gutachten und behördliche Gebühren
– Zwischenlager mit Abdeckung und Sonderbehälter für gefährliche Abfälle
– Annahmekosten der Anlagen, soweit nicht im Einheitspreis enthalten

Abrechnung
– Nach Gewicht laut Wiegeschein; ersatzweise nach Raummaß oder Behälter laut LV
– Behältergestellung nach Stück und Standzeit

Hinweis für Planer
Abfallarten, voraussichtliche Mengen und Analysenergebnisse aus dem Gutachten angeben.', 65),
  ('090', 'Baulogistik', 'Geltende Regeln (in der bei Vertragsschluss gültigen Fassung)
– VOB/C ATV DIN 18299 Allgemeine Regelungen für Bauarbeiten jeder Art
– Baustellenverordnung (BaustellV) und SiGe-Plan
– Straßenverkehrs-Ordnung (StVO) mit verkehrsrechtlicher Anordnung und RSA 21
– Betriebssicherheitsverordnung (BetrSichV) für Krane und Hebezeuge
– DGUV Vorschrift 52 Krane

Ausführung
– Logistikkonzept mit Anlieferzonen, Zeitfenstern, Lager- und Pufferflächen vor Beginn abstimmen
– Anlieferungen aller Gewerke über ein Buchungssystem bzw. die Logistikleitung koordinieren
– Zugangskontrolle mit Ausweisen und Unterweisungsnachweis; Besucherregelung
– Kranbelegung und Hebevorgänge planen; Kranführer und Anschläger mit Befähigung
– Zufahrten und öffentliche Flächen sauber halten; Reifenreinigung bei Bedarf
– Anlieferungen, Störungen und Belegungen täglich dokumentieren

Nebenleistungen (ohne eigene Position)
– Abstimmung der eigenen Anlieferungen mit der Logistikleitung
– Entladen und Verteilen eigener Stoffe auf der Baustelle

Besondere Leistungen (gesondert vergütet)
– Logistikpersonal, Einweiser und Torposten
– Zusätzliche Lagerflächen, Hebezeuge und Bauaufzüge für andere Gewerke
– Verlängerte Vorhaltung durch Bauzeitverlängerung, die der AN nicht zu vertreten hat

Abrechnung
– Einrichten pauschal; Betrieb und Personal nach Zeit (Stunde, Woche, Monat) laut LV

Hinweis für Planer
Logistikkonzept, verfügbare Flächen und Anlieferzeiten beifügen: [Plan-Nr.].', 66),
  ('091', 'Stundenlohnarbeiten', 'Geltende Regeln (in der bei Vertragsschluss gültigen Fassung)
– VOB/B § 2 Abs. 10 und § 15 Stundenlohnarbeiten
– Mindestlohngesetz (MiLoG) und Arbeitnehmer-Entsendegesetz (AEntG)
– Einschlägige Tarifverträge (z. B. Bundesrahmentarifvertrag Bau)

Ausführung
– Vergütet werden nur Stundenlohnarbeiten, die vor Beginn ausdrücklich als solche vereinbart bzw. angeordnet wurden
– Beginn der Arbeiten der Bauleitung vorher anzeigen, damit eine Kontrolle möglich ist
– Stundenlohnzettel je nach Vereinbarung werktäglich oder wöchentlich vorlegen: Datum, Ort, Tätigkeit, Namen, Qualifikation, Stunden, Geräte und Stoffe
– Der AG gibt die Zettel bescheinigt zurück; Einwendungen innerhalb von 6 Werktagen, sonst gelten sie als anerkannt
– Stundenlohnrechnungen alsbald nach Abschluss, längstens in Abständen von 4 Wochen einreichen
– Leistungen, die durch Einheitspreise erfasst sind, nicht als Stundenlohn abrechnen

Nebenleistungen (ohne eigene Position)
– Kleingeräte und Werkzeuge, An- und Abfahrt innerhalb des Arbeitstages
– Aufsicht durch Vorarbeiter im üblichen Umfang

Besondere Leistungen (gesondert vergütet)
– Stoffe nach Nachweis zum vereinbarten Zuschlag
– Maschinen und Geräte nach Einsatzstunden
– Zuschläge für angeordnete Nacht-, Sonn- und Feiertagsarbeit

Abrechnung
– Nach bescheinigten Stundenlohnzetteln mit den vereinbarten Verrechnungssätzen je Qualifikation

Hinweis für Planer
Stundensätze je Qualifikation (Facharbeiter, Helfer, Meister) und Zuschläge im LV abfragen.', 67),
  ('098', 'Witterungsschutzmaßnahmen', 'Geltende Regeln (in der bei Vertragsschluss gültigen Fassung)
– VOB/C ATV DIN 18299 Allgemeine Regelungen für Bauarbeiten jeder Art und die ATV des jeweiligen Gewerks
– VOB/B § 4 Abs. 5 (Schutz der Leistung) und § 6 Abs. 2 (Witterung als Behinderung)
– DIN EN 12811-1 und Aufbauanleitung des Gerüsts bei Einhausungen
– DIN EN 1991-1-4 mit Nationalem Anhang (Windlasten)

Ausführung
– Mit der für Ort und Jahreszeit üblichen Witterung ist zu rechnen; sie begründet keine Behinderung
– Einhausungen, Planen und Notdächer gegen Wind sichern; Lasten auf Gerüst und Bauwerk nachweisen
– Beheizung und Trocknung nur mit sicherer Abgasführung und Brandschutz; CO-Gefahr in geschlossenen Räumen beachten
– Frische Bauteile (Beton, Mörtel, Putz, Estrich) vor Frost, Regen und schnellem Austrocknen schützen
– Mindesttemperaturen der Hersteller einhalten; Temperaturen und Feuchte im Bautagebuch dokumentieren
– Schutzmaßnahmen nach Wegfall der Gefahr zurückbauen; Wasserschäden sofort melden

Nebenleistungen (ohne eigene Position)
– Schutz der eigenen Leistung gegen Witterung, mit der normalerweise zu rechnen ist (z. B. Abdecken, Sichern gegen Tagwasser)
– Beseitigen von Schnee und Eis im eigenen Arbeitsbereich

Besondere Leistungen (gesondert vergütet)
– Einhausungen, Notdächer, Winterbaumaßnahmen und Beheizung auf Anordnung
– Bautrocknung zur Beschleunigung
– Schutzmaßnahmen gegen außergewöhnliche Witterung

Abrechnung
– Einhausungen nach Fläche und Vorhaltezeit; Beheizung und Trocknung nach Betriebszeit bzw. Gerät und Tag; Energie nach Zähler

Hinweis für Planer
Zeiträume und Bauteile, für die Winterbau vorgesehen ist, angeben: [Angaben des Planers].', 68),
  ('099', 'Allgemeine Leistungen, Schutzmaßnahmen, Winterbau', 'Geltende Regeln (in der bei Vertragsschluss gültigen Fassung)
– VOB/C ATV DIN 18299 Allgemeine Regelungen für Bauarbeiten jeder Art
– VOB/B § 4 Abs. 5 Schutz der Leistung
– DIN 18920 Schutz von Bäumen, Pflanzenbeständen und Vegetationsflächen
– AVV Baulärm und Landesimmissionsschutzrecht
– Brandschutzordnung und Baustellenordnung des Vorhabens

Ausführung
– Bestand (Böden, Treppen, Türen, Aufzüge, Fassaden) vor Beginn gemeinsam dokumentieren und wirksam schützen
– Staubschutzwände und Schleusen bei Arbeiten in genutzten Gebäuden; Unterdruck, wo gefordert
– Baumschutz mit Zaun bzw. Stammschutz; Wurzelbereich freihalten
– Provisorische Abschlüsse von Öffnungen gegen Witterung, Einbruch und Absturz
– Winterbau: Frostschutz für Leitungen und Bauteile, Räumen der Verkehrswege
– Schutzmaßnahmen bis zum vereinbarten Zeitpunkt vorhalten, dann rückstandsfrei entfernen

Nebenleistungen (ohne eigene Position)
– Schutz der eigenen Leistungen bis zur Abnahme
– Abdecken von Bauteilen gegen Verschmutzung durch die eigenen Arbeiten
– Sichern der eigenen Arbeitsstellen

Besondere Leistungen (gesondert vergütet)
– Schutzmaßnahmen, die anderen Gewerken oder dem Nutzer dienen
– Besondere Schutzmaßnahmen auf Verlangen des AG über das übliche Maß
– Vorhalten über die vereinbarte Dauer hinaus

Abrechnung
– Schutzabdeckungen und Wände nach Fläche; Absperrungen nach Länge; Vorhalten nach Zeit laut LV

Hinweis für Planer
Zu schützende Bestandsbereiche und Nutzungen während der Bauzeit angeben.', 69)
) AS v(key, titel, text, sort)
WHERE NOT EXISTS (SELECT 1 FROM pdb_vorbemerkung p WHERE p.key = v.key);
