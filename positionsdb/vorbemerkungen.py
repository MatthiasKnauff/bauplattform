"""Technische Vorbemerkungen für Leistungsverzeichnisse (kompakt).

Eigene Texte der Bauplattform. Normen und VOB werden nur mit Nummer und Kurzbezeichnung genannt
und inhaltlich knapp in eigenen Worten zusammengefasst; nichts ist aus DIN-/VOB-Texten, sirAdos,
Heinze oder STLB-Bau übernommen. Maßgebend ist stets der Wortlaut der jeweils bei Vertragsschluss
gültigen Fassung der genannten Regelwerke.

VORBEMERKUNGEN[schlüssel] = {"titel": ..., "text": ...}
  "avb" Allgemeine Vorbemerkungen (für jedes LV, Verträge und Abrechnung)
  "bb"  Baubeschreibung (Muster)
  "bvb" Besondere Vertragsbedingungen (Muster)
  "zvb" Zusätzliche Technische Vertragsbedingungen (Muster)
  "000" … "099" je Leistungsbereich der Positionsdatenbank
Platzhalter für den Planer stehen in eckigen Klammern.
"""


def _lb(regeln, ausfuehrung, neben, besondere, abrechnung, planer=None):
    """Setzt einen LB-Vorbemerkungstext aus Spiegelstrich-Listen zusammen."""
    def block(titel, zeilen, einleitung=None):
        z = [titel]
        if einleitung:
            z.append(einleitung)
        z += ["– " + x for x in zeilen]
        return "\n".join(z)

    teile = [
        block("Geltende Regeln (in der bei Vertragsschluss gültigen Fassung)", regeln),
        block("Ausführung", ausfuehrung),
        block("Nebenleistungen (ohne eigene Position)", neben),
        block("Besondere Leistungen (gesondert vergütet)", besondere),
        block("Abrechnung", abrechnung),
    ]
    if planer:
        teile.append("Hinweis für Planer\n" + planer)
    return "\n\n".join(teile)


VORBEMERKUNGEN = {}

# ---------------------------------------------------------------------------
# Allgemeine Muster
# ---------------------------------------------------------------------------

VORBEMERKUNGEN["avb"] = {
    "titel": "Allgemeine Vorbemerkungen",
    "text": (
        'Allgemeine Vorbemerkungen\n'
        '\n'
        '1 Vertragsgrundlagen\n'
        'Es gelten in dieser Reihenfolge: das Auftragsschreiben mit Verhandlungsprotokoll, die Leistungsbeschreibung mit den Plänen, die Besonderen und Zusätzlichen Vertragsbedingungen, die VOB/C (ATV DIN 18299 ff.) und die VOB/B, jeweils in der bei Angebotsabgabe geltenden Fassung. Innerhalb der Leistungsbeschreibung geht die auf dieses Bauvorhaben bezogene, speziellere Angabe der allgemeineren vor. Unklarheiten oder Widersprüche bitte vor Angebotsabgabe schriftlich mitteilen.\n'
        '\n'
        '2 Preise\n'
        'Die Einheitspreise enthalten alle Leistungen der Position einschließlich der Nebenleistungen nach Abschnitt 4.1 der jeweiligen ATV. Besondere Leistungen nach Abschnitt 4.2 sind nur enthalten, wenn sie als Position oder in der Positionsbeschreibung ausdrücklich genannt sind; sonst werden sie nach § 2 VOB/B vergütet. Genannte Fabrikate gelten als Beispiel mit dem Zusatz „oder gleichwertig“; ein anderes Fabrikat ist im Angebot zu benennen, die Gleichwertigkeit ist auf Anforderung nachzuweisen. Alle Preise netto zuzüglich Umsatzsteuer.\n'
        '\n'
        '3 Baustelle\n'
        'Die Baustelle kann nach Absprache besichtigt werden. Was der Auftraggeber bereitstellt (Zufahrt, Lagerflächen, Strom, Wasser, Sanitär, Gerüste, Hebezeuge), steht in den projektbezogenen Angaben; alles andere bringt der Auftragnehmer selbst mit. Der Auftragnehmer hält seinen Arbeitsbereich sauber und entsorgt seine Abfälle und Verpackungen laufend. Die Vorgaben des Sicherheits- und Gesundheitsschutzplans und der Baustellenordnung sind einzuhalten.\n'
        '\n'
        '4 Ausführung\n'
        'Maße und Vorleistungen sind vor Beginn am Bau zu prüfen; Bedenken sind schriftlich vor der Ausführung anzuzeigen (§ 4 Abs. 3 VOB/B). Werk- und Montagepläne, Muster und Datenblätter sind vorzulegen, soweit die Leistungsbeschreibung sie verlangt, und vor der Ausführung freigeben zu lassen. Die Arbeiten sind mit den anderen Gewerken abzustimmen. Die eigene Leistung ist bis zur Abnahme zu schützen (§ 4 Abs. 5 VOB/B).\n'
        '\n'
        '5 Termine\n'
        'Es gelten die Vertragsfristen und der Bauzeitenplan des Auftraggebers. Behinderungen sind unverzüglich schriftlich anzuzeigen (§ 6 Abs. 1 VOB/B).\n'
        '\n'
        '6 Änderungen und zusätzliche Leistungen\n'
        'Geänderte oder zusätzliche Leistungen sind vor Beginn der Ausführung anzukündigen und mit einem Nachtragsangebot auf Grundlage der Urkalkulation zu belegen (§ 2 Abs. 5 und 6 VOB/B; ohne VOB/B gelten §§ 650b, 650c BGB). Stundenlohnarbeiten werden nur nach vorheriger Anordnung vergütet; die Stundenzettel sind wöchentlich vorzulegen (§ 15 Abs. 3 VOB/B).\n'
        '\n'
        '7 Aufmaß und Abrechnung\n'
        'Abgerechnet wird nach Abschnitt 5 der jeweiligen ATV. Das Aufmaß wird gemeinsam genommen; wo die Ausführung den Plänen entspricht, darf nach Plänen abgerechnet werden. Rechnungen sind prüfbar mit den Positionsnummern der Leistungsbeschreibung und den Aufmaßblättern einzureichen, auf Wunsch zusätzlich als GAEB-Datei.\n'
        '\n'
        '8 Unterlagen und Abnahme\n'
        'Vor der Abnahme übergibt der Auftragnehmer die Nachweise, die zur Leistung gehören: Leistungserklärungen, Prüf- und Messprotokolle, Bestandspläne, Bedienungs- und Wartungsanleitungen sowie Fotos verdeckter Bauteile. Die Abnahme erfolgt förmlich (§ 12 Abs. 4 VOB/B).\n'
        '\n'
        'Projektbezogene Angaben (nach Abschnitt 0 der ATV DIN 18299)\n'
        '0.1 Baustelle\n'
        '– Lage, Zufahrt, Lagerflächen: [ ]\n'
        '– Vom Auftraggeber gestellt (Strom, Wasser, Sanitär, Container): [ ]\n'
        '– Gerüste und Hebezeuge (wer stellt, wie lange): [ ]\n'
        '– Baugrund, Grundwasser, Schadstoffe, Gutachten: [ ]\n'
        '– Nachbarschaft, Leitungen, Schutz von Bäumen und Flächen: [ ]\n'
        '– SiGeKo, SiGe-Plan, Baustellenordnung: [ ]\n'
        '0.2 Ausführung\n'
        '– Bauzeit, Zwischentermine, Arbeitszeiten: [ ]\n'
        '– Bauen im Bestand oder unter Betrieb, Schutz vorhandener Bauteile: [ ]\n'
        '– Werkplanung, Bemusterung, Freigaben: [ ]\n'
        '0.3 Abweichungen von den ATV: [ ]\n'
        '0.4 Nebenleistungen und Besondere Leistungen, die gesondert vergütet werden: [ ]\n'
        '0.5 Abrechnungseinheiten, wenn abweichend: [ ]'
    ),
}

VORBEMERKUNGEN["bb"] = {
    "titel": "Baubeschreibung (Muster)",
    "text": (
        "Bauvorhaben\n"
        "– Bezeichnung: [Bauvorhaben], [Straße, PLZ Ort], Flurstück [Nr.]\n"
        "– Bauherr/Auftraggeber: [Name, Anschrift]; vertreten durch: [Architekt/Projektsteuerer]\n"
        "– Art der Maßnahme: [Neubau/Umbau/Sanierung/Erweiterung] eines [Gebäudetyp] mit [Geschosse], BGF ca. [m²]\n"
        "– Konstruktion in Kürze: [Gründung, Tragwerk, Dach, Fassade, Ausbau, TGA]\n"
        "\n"
        "Lage und Zugänglichkeit\n"
        "– Zufahrt über [Straße]; zulässige Fahrzeuge bis [t] Gesamtgewicht, Durchfahrtshöhe [m]\n"
        "– Lager- und Arbeitsflächen gemäß Baustelleneinrichtungsplan [Plan-Nr.]; darüber hinaus keine Flächen verfügbar\n"
        "– Nutzung öffentlicher Verkehrsflächen nur mit verkehrsrechtlicher Anordnung; Beantragung durch [AN/AG]\n"
        "– Nachbarbebauung: [Abstände, empfindliche Nutzungen wie Schule, Klinik, Tierhaltung]\n"
        "\n"
        "Bestand und Baugrund\n"
        "– Baugrundgutachten [Verfasser, Datum]; Homogenbereiche und Grundwasserstand siehe dort\n"
        "– Bekannte Leitungen und Anlagen: [Spartenpläne]; Erkundung vor Erdarbeiten durch den AN\n"
        "– Schadstoffe: [Gutachten/keine Erkenntnisse]; Kampfmittel: [Freigabe/Erkundung erforderlich]\n"
        "– Bestandsgebäude bleiben [in Betrieb/geräumt]; Betriebsabläufe des Nutzers sind zu berücksichtigen\n"
        "\n"
        "Organisation der Baustelle\n"
        "– Bauzeit: [Beginn] bis [Fertigstellung]; Zwischentermine siehe BVB und Terminplan\n"
        "– Arbeitszeiten: werktags [7–19 Uhr]; lärmintensive Arbeiten nur [Zeitfenster]\n"
        "– Baustrom und Bauwasser: Übergabepunkte [Ort]; Verbrauchskosten [Zähler/Umlage nach BVB]\n"
        "– Sanitär- und Aufenthaltseinrichtungen: [vom AG gestellt/vom AN vorzuhalten]\n"
        "– SiGe-Koordinator: [Name]; SiGe-Plan und Baustellenordnung sind Vertragsbestandteil\n"
        "– Weitere Unternehmer arbeiten zeitgleich; gegenseitige Rücksichtnahme und Abstimmung über die Bauleitung\n"
        "\n"
        "Planungsgrundlagen\n"
        "– Baugenehmigung [Az., Datum] mit Auflagen; Brandschutzkonzept [Verfasser, Datum]\n"
        "– Statik und Positionspläne [Verfasser]; Wärmeschutz-/GEG-Nachweis; Schallschutznachweis\n"
        "– Ausführungspläne gemäß Planliste [Stand]; maßgebend sind die zur Ausführung freigegebenen Pläne\n"
        "– Maße sind vor Beginn am Bau zu prüfen; Widersprüche sind vor Ausführung der Bauleitung zu melden"
    ),
}

VORBEMERKUNGEN["bvb"] = {
    "titel": "Besondere Vertragsbedingungen (Muster)",
    "text": (
        "Vertragsgrundlagen\n"
        "– Rangfolge bei Widersprüchen gemäß VOB/B § 1 Abs. 2: Leistungsbeschreibung, diese BVB, ZVB, ZTV, VOB/C, VOB/B\n"
        "– Pläne und Gutachten laut Anlagenverzeichnis [Liste]; Angebotsunterlagen des AN nur, soweit ausdrücklich einbezogen\n"
        "\n"
        "Ausführungsfristen (VOB/B § 5)\n"
        "– Beginn: [Datum oder binnen 12 Werktagen nach Aufforderung]; Fertigstellung: [Datum]\n"
        "– Verbindliche Zwischenfristen (Vertragsfristen): [Meilensteine mit Datum]; alle übrigen Termine des Bauzeitenplans sind Kontrollfristen\n"
        "– Behinderungen sind unverzüglich schriftlich anzuzeigen (§ 6 Abs. 1); Witterung, mit der bei Angebotsabgabe zu rechnen war, gilt nicht als Behinderung\n"
        "\n"
        "Vertragsstrafe (VOB/B § 11)\n"
        "– Bei schuldhafter Überschreitung der Fertigstellungsfrist [und der Zwischenfristen …]: [0,2] % der Nettoauftragssumme je Werktag\n"
        "– Insgesamt höchstens [5] % der Nettoabrechnungssumme; Zwischenfrist-Strafen werden angerechnet; Vorbehalt bis zur Schlusszahlung\n"
        "\n"
        "Sicherheiten (VOB/B § 17)\n"
        "– Vertragserfüllung: [5] % der Nettoauftragssumme, Bürgschaft eines in der EU zugelassenen Kreditinstituts, Vorlage binnen [18] Werktagen nach Auftrag\n"
        "– Mängelansprüche: [3] % der Nettoabrechnungssumme; ablösbar durch Bürgschaft; Rückgabe nach [Ablauf von 2 Jahren/Ende der Verjährungsfrist]\n"
        "\n"
        "Abrechnung und Zahlung (VOB/B §§ 14, 16)\n"
        "– Aufmaße möglichst gemeinsam; prüfbare Rechnungen mit Mengenberechnung, Plänen und Positionsbezug, [digital als PDF und GAEB X31]\n"
        "– Abschlagszahlungen nach Leistungsstand; Schlussrechnung innerhalb der Frist nach § 14 Abs. 3\n"
        "– Freistellungsbescheinigung nach § 48b EStG ist vor der ersten Zahlung vorzulegen\n"
        "\n"
        "Nachträge und Stundenlohn (VOB/B §§ 2, 15)\n"
        "– Mehrvergütung für zusätzliche Leistungen ist vor Ausführung anzukündigen; Nachtragsangebote auf Basis der Urkalkulation\n"
        "– Stundenlohnarbeiten nur nach ausdrücklicher Anordnung vor Beginn; Stundenlohnzettel [werktäglich] zur Bescheinigung vorlegen\n"
        "– Verrechnungssätze: [gemäß Angebot/LB 091]\n"
        "\n"
        "Abnahme und Mängelansprüche (VOB/B §§ 12, 13)\n"
        "– Förmliche Abnahme mit Protokoll; Teilabnahmen nur für [Bauteile]; technische Zustandsfeststellungen sind keine Abnahme\n"
        "– Verjährungsfrist für Mängelansprüche: [4 Jahre nach § 13 Abs. 4 / abweichend … Jahre für …]; für wartungsbedürftige Anlagenteile gilt § 13 Abs. 4 Nr. 2\n"
        "– Mit der Schlussrechnung zu übergeben: Bestands- und Revisionsunterlagen gemäß ZVB\n"
        "\n"
        "Sonstiges\n"
        "– Nachunternehmer nur mit vorheriger schriftlicher Zustimmung des AG (§ 4 Abs. 8)\n"
        "– Betriebshaftpflicht mit mindestens [Summe] € für Personen- und [Summe] € für Sach-/Vermögensschäden; Nachweis vor Beginn\n"
        "– Einhaltung von MiLoG, AEntG und [Tariftreue-/Vergabegesetz des Landes]; Bautagebuch ist [wöchentlich] vorzulegen"
    ),
}

VORBEMERKUNGEN["zvb"] = {
    "titel": "Zusätzliche Technische Vertragsbedingungen (Muster)",
    "text": (
        "Allgemeines\n"
        "– Alle Leistungen sind nach den allgemein anerkannten Regeln der Technik, der VOB/C und den behördlichen Auflagen auszuführen\n"
        "– Herstellervorgaben (Verarbeitungsrichtlinien, Zulassungen) gelten ergänzend; Abweichungen nur nach schriftlicher Freigabe\n"
        "\n"
        "Bauprodukte und Bemusterung\n"
        "– Nur Produkte mit erforderlichem Verwendbarkeitsnachweis (CE mit Leistungserklärung, abZ/aBG, aBP oder vorhabenbezogene Bauartgenehmigung)\n"
        "– Fabrikats- und Typangaben sind im Angebot zu nennen; „gleichwertig“ ist vom Bieter nachzuweisen\n"
        "– Muster und Musterflächen nach Anforderung der Bauleitung vor Bestellung; freigegebene Muster sind verbindlich\n"
        "\n"
        "Planung des AN und Prüfpflichten\n"
        "– Werkstatt-, Montage- und Detailpläne rechtzeitig zur Freigabe vorlegen [Vorlauf … Werktage]; Freigabe entbindet nicht von der Verantwortung des AN\n"
        "– Vorleistungen und Unterlagen vor Beginn prüfen; Bedenken schriftlich vor Ausführung mitteilen (VOB/B § 4 Abs. 3)\n"
        "– Maße am Bau nehmen; Maßtoleranzen nach DIN 18202, sofern nicht erhöhte Anforderungen vereinbart sind\n"
        "– Schlitze, Durchbrüche und Befestigungen in tragenden Bauteilen nur nach Freigabe durch den Tragwerksplaner\n"
        "\n"
        "Brandschutz, Schall- und Wärmeschutz\n"
        "– Durchdringungen von Bauteilen mit Feuerwiderstand nur mit zugelassenen Abschottungen; Kennzeichnung am Bauteil und Fotodokumentation\n"
        "– Übereinstimmungserklärungen des Errichters für Bauarten sind je Bauteil zu übergeben\n"
        "– Schallbrücken und Wärmebrücken sind zu vermeiden; Anschlüsse luftdicht nach Planung ausführen\n"
        "\n"
        "Baustellenbetrieb\n"
        "– Arbeitsschutz nach SiGe-Plan und Baustellenordnung; Heißarbeiten nur mit Erlaubnisschein\n"
        "– Staub- und Lärmschutz so, dass angrenzende Nutzungen möglichst wenig gestört werden\n"
        "– Arbeitsbereiche täglich aufräumen; eigene Abfälle getrennt nach GewAbfV sammeln und entsorgen, sofern nicht anders geregelt\n"
        "– Eigene Leistungen bis zur Abnahme vor Beschädigung und Verschmutzung schützen (VOB/B § 4 Abs. 5)\n"
        "\n"
        "Dokumentation\n"
        "– Prüf-, Mess- und Inbetriebnahmeprotokolle, Leistungserklärungen, Produktdatenblätter, Wartungs- und Bedienungsanleitungen\n"
        "– Bestands-/Revisionspläne in [PDF und DWG/IFC], gegliedert nach Gewerk und Geschoss; Übergabe spätestens zur Abnahme\n"
        "– Einweisung des Betreibers mit Teilnehmerprotokoll, soweit technische Anlagen betroffen sind"
    ),
}


def _setze(nr, titel, *args, **kw):
    VORBEMERKUNGEN[nr] = {"titel": titel, "text": _lb(*args, **kw)}


# ---------------------------------------------------------------------------
# Rohbau und Tiefbau
# ---------------------------------------------------------------------------

_setze(
    "000", "Baustelleneinrichtung",
    ["VOB/C ATV DIN 18299 Allgemeine Regelungen für Bauarbeiten jeder Art",
     "Baustellenverordnung (BaustellV) und Arbeitsstättenverordnung mit ASR",
     "DGUV Vorschrift 38 Bauarbeiten",
     "RSA 21 für Sicherungsmaßnahmen im öffentlichen Verkehrsraum"],
    ["Einrichtung nach abgestimmtem Baustelleneinrichtungsplan; Änderungen nur mit Zustimmung der Bauleitung",
     "Bauzaun, Zugänge und Beschilderung so, dass Unbefugte ferngehalten und Verkehrswege frei bleiben",
     "Anschlüsse für Baustrom und Bauwasser über geprüfte Verteiler bzw. Zähler; Prüfnachweise auf Verlangen vorlegen",
     "Vorhandene Flächen, Leitungen und Bäume vor Beginn gemeinsam dokumentieren und während der Bauzeit schützen",
     "Nach Räumung Ausgangszustand wiederherstellen; Schäden sind zu beseitigen"],
    ["Einrichten und Räumen der eigenen Arbeitsstelle mit Geräten, Werkzeugen und Kleingerät",
     "Vorhalten der eigenen Unterkünfte für die Arbeitskräfte, soweit nicht vom AG gestellt",
     "Unfallverhütung und Sicherung der eigenen Arbeitsstellen"],
    ["Einrichtungen, die anderen Unternehmern oder dem AG zur Verfügung gestellt werden (z. B. Baukran, Büro der Bauleitung)",
     "Bauzaun, Baustraßen, Baustellenbeleuchtung und Verkehrssicherung, soweit in eigenen Positionen ausgeschrieben",
     "Vorhalten über die vereinbarte Bauzeit hinaus, wenn der AN die Verlängerung nicht zu vertreten hat"],
    ["Einrichten und Räumen jeweils pauschal; Vorhalten je Woche bzw. Monat ab Betriebsbereitschaft",
     "Bauzaun und Verkehrssicherung nach Länge bzw. Stück und Vorhaltedauer"],
    "Lage von Kran, Lager- und Containerflächen im BE-Plan [Plan-Nr.] festlegen und angeben, wer Baustrom und Bauwasser bezahlt.",
)

_setze(
    "001", "Gerüstarbeiten",
    ["VOB/C ATV DIN 18451 Gerüstarbeiten",
     "DIN EN 12811-1 Temporäre Konstruktionen für Bauwerke – Arbeitsgerüste",
     "DIN EN 12810-1 Fassadengerüste aus vorgefertigten Bauteilen",
     "DIN 4420-1 Schutzgerüste",
     "TRBS 2121 Teil 1 Gefährdung von Beschäftigten durch Absturz bei der Verwendung von Gerüsten",
     "Aufbau- und Verwendungsanleitung bzw. Zulassung des Gerüstsystems"],
    ["Last- und Breitenklasse, Belaghöhen und Wandabstand nach Angabe im LV und Bedarf der nutzenden Gewerke",
     "Verankerung nach Aufbauanleitung; Netze oder Planen nur mit Nachweis für die erhöhte Windlast",
     "Untergrund auf Tragfähigkeit prüfen; Lastverteilung, Abstand zu Baugruben und Leitungen beachten",
     "Prüfung nach Fertigstellung und Kennzeichnung mit Gerüstkarte; Prüfprotokoll an die Bauleitung",
     "Umbauten nur durch den Gerüstersteller",
     "Ankerlöcher nach Abbau fachgerecht schließen"],
    ["Prüfen und Kennzeichnen des Gerüsts nach dem Aufbau",
     "Vorhalten während der vereinbarten Grundstandzeit",
     "Erforderliche Verankerungen, Verstrebungen und Seitenschutz an der Belagfläche"],
    ["Gebrauchsüberlassung über die Grundstandzeit hinaus",
     "Umbauten auf Anordnung, Konsolen, Überbrückungen, Schutzdächer, Treppentürme, Netze und Planen",
     "Prüfungen für andere Nutzer und Gerüstabnahmen durch Sachverständige"],
    ["Flächengerüste nach Länge und Höhe der eingerüsteten Fläche nach den Regeln der ATV; Öffnungen werden übermessen",
     "Gebrauchsüberlassung je Flächeneinheit und Woche über die Grundstandzeit hinaus; Zusatzbauteile nach Stück oder Länge"],
    "Grundstandzeit, Lastklasse sowie Anforderungen der Folgegewerke (z. B. WDVS-Abstand) im LV angeben.",
)

_setze(
    "002", "Erdarbeiten",
    ["VOB/C ATV DIN 18300 Erdarbeiten",
     "DIN EN 1997-1 mit DIN 1054 Geotechnische Bemessung",
     "DIN 4124 Baugruben und Gräben – Böschungen, Verbau, Arbeitsraumbreiten",
     "DIN 18196 Bodenklassifikation für bautechnische Zwecke",
     "DIN 18134 Plattendruckversuch",
     "Ersatzbaustoffverordnung (ErsatzbaustoffV) für Verwertung und Einbau mineralischer Stoffe"],
    ["Böden sind nach Homogenbereichen gemäß Baugrundgutachten beschrieben; Abweichungen unverzüglich melden",
     "Vor Beginn Leitungen und Kampfmittelfreiheit klären; in Leitungsnähe von Hand schachten",
     "Planum mit Gefälle und gegen Aufweichen geschützt herstellen; Gründungssohlen nicht auflockern",
     "Verfüllung lagenweise mit geeignetem Boden; Verdichtung nach geforderten Werten nachweisen",
     "Bei Funden (Denkmal, Kampfmittel, auffälliger Boden) Arbeiten einstellen und AG informieren"],
    ["Feststellen des Zustands angrenzender Flächen und Bauwerke vor Beginn",
     "Eigenüberwachung der Verdichtung im üblichen Umfang",
     "Sichern gegen Oberflächenwasser, mit dem normalerweise zu rechnen ist"],
    ["Verbau, Wasserhaltung und Bodenaustausch",
     "Beseitigen von Hindernissen, Bauwerksresten und Leitungen, die nicht angegeben waren",
     "Entsorgung von Boden mit Schadstoffbelastung sowie Deklarationsanalysen über das vereinbarte Maß hinaus"],
    ["Abtrag und Aushub nach Raummaß im Abtragszustand anhand von Aufmaß oder Profilen",
     "Arbeitsräume und Böschungen nur in dem nach DIN 4124 bzw. LV zulässigen Umfang",
     "Verfüllung nach Raummaß im verdichteten Zustand; Abfuhr nach Raummaß oder Gewicht laut LV"],
    "Baugrundgutachten mit Homogenbereichen und Angaben zur Verwertung des Aushubs beifügen: [Gutachten].",
)

_setze(
    "003", "Landschaftsbauarbeiten",
    ["VOB/C ATV DIN 18320 Landschaftsbauarbeiten",
     "DIN 18915 Bodenarbeiten im Landschaftsbau",
     "DIN 18916 Pflanzen und Pflanzarbeiten",
     "DIN 18917 Rasen und Saatarbeiten",
     "DIN 18919 Entwicklungs- und Unterhaltungspflege von Grünflächen",
     "DIN 18920 Schutz von Bäumen, Pflanzenbeständen und Vegetationsflächen bei Baumaßnahmen",
     "FLL-Gütebestimmungen für Baumschulpflanzen und Regel-Saatgut-Mischungen"],
    ["Vegetationstragschicht nur bei geeigneter Bodenfeuchte bearbeiten; Verdichtungen vor Auftrag beseitigen",
     "Pflanzarbeiten in der Vegetationsruhe bzw. zu den fachlich geeigneten Pflanzzeiten",
     "Pflanzqualität und Herkunft auf Verlangen nachweisen; Anlieferung frisch, Wurzeln vor Austrocknung schützen",
     "Bäume verankern und Stammschutz anbringen, soweit vorgesehen",
     "Schutzzonen bestehender Bäume einhalten; Wurzelbereich nicht befahren, nicht lagern",
     "Fertigstellungspflege bis zum abnahmefähigen Zustand"],
    ["Wässern während der Pflanzarbeiten und Fertigstellungspflege",
     "Entfernen von Steinen, Wurzeln und Unrat aus der Bearbeitungsschicht im üblichen Umfang",
     "Bodenuntersuchungen zur Eignungsfeststellung in üblichem Umfang"],
    ["Entwicklungspflege und Unterhaltungspflege nach Abnahme",
     "Bodenverbesserung über das ausgeschriebene Maß, Baumschutzmaßnahmen nach DIN 18920",
     "Ersatz von Pflanzen, deren Ausfall der AN nicht zu vertreten hat"],
    ["Flächen in der Abwicklung; Pflanzen nach Stück, Hecken nach Länge",
     "Pflegegänge je Durchgang bzw. Fläche und Pflegejahr laut LV"],
    "Dauer der Entwicklungspflege und Anzahl der Pflegegänge festlegen: [Jahre/Gänge].",
)

_setze(
    "006", "Spezialtiefbauarbeiten",
    ["VOB/C ATV DIN 18301 Bohrarbeiten, DIN 18303 Verbauarbeiten, DIN 18304 Ramm-, Rüttel- und Pressarbeiten",
     "DIN EN 1997-1 mit DIN 1054 sowie Empfehlungen des Arbeitskreises Baugruben (EAB) und Pfähle (EA-Pfähle)",
     "DIN EN 1536 Bohrpfähle, DIN EN 1538 Schlitzwände, DIN EN 12063 Spundwandkonstruktionen",
     "DIN EN 1537 Verpressanker",
     "DIN 4123 Ausschachtungen, Gründungen und Unterfangungen im Bereich bestehender Gebäude",
     "DIN 4150-3 Erschütterungen im Bauwesen – Einwirkungen auf bauliche Anlagen"],
    ["Ausführung nach geprüfter Statik und Ausführungsplanung; Verfahren und Geräte vor Beginn benennen",
     "Leitungen und Nachbarbebauung vorher erkunden; Beweissicherung abstimmen",
     "Abweichungen vom erwarteten Baugrund sofort melden und dokumentieren",
     "Protokolle je Pfahl, Anker, Lamelle bzw. Bohle (Tiefen, Mengen, Zeiten, Besonderheiten)",
     "Prüfungen (z. B. Ankerprüfungen, Integritätsprüfungen) nach Norm bzw. Statik und LV",
     "Verformungen nach Messprogramm überwachen"],
    ["Herstellen des Arbeitsplanums für die eigenen Geräte im üblichen Umfang",
     "Führen der Herstellprotokolle und Einmessen der Ansatzpunkte nach vorgegebenen Achsen"],
    ["Probebelastungen, Erschütterungsmessungen und Beweissicherungsverfahren",
     "Beseitigen von Hindernissen im Baugrund, Rückbau von Verbau und Ankern",
     "Mehrverbrauch an Beton oder Verpressgut über das vereinbarte Maß"],
    ["Pfähle und Bohrungen nach Länge von Arbeitsebene bzw. Kappebene bis Fußpunkt laut LV",
     "Wände nach Fläche in der Ansicht; Anker nach Stück und Länge; Gerät für Vorhalten nach Zeit"],
    "Baugrundgutachten, Statik und Messprogramm für Nachbarbebauung beifügen: [Unterlagen].",
)

_setze(
    "008", "Wasserhaltungsarbeiten",
    ["VOB/C ATV DIN 18305 Wasserhaltungsarbeiten",
     "Wasserhaushaltsgesetz und wasserrechtliche Erlaubnis für Entnahme und Einleitung",
     "DIN EN 1997-1 mit DIN 1054 Geotechnische Bemessung",
     "DIN 4124 Baugruben und Gräben",
     "Entwässerungssatzung bzw. Einleitbedingungen des Netzbetreibers"],
    ["Wasserhaltung nach Bemessung so betreiben, dass die Baugrubensohle trocken und standsicher bleibt",
     "Absenkziel und Wasserstände regelmäßig messen und protokollieren; Fördermengen über Zähler erfassen",
     "Ausfallsicherheit durch Reservepumpen bzw. Notstrom nach LV; Störungsalarm einrichten",
     "Einleitung nur über Absetzbecken bzw. Aufbereitung nach den Auflagen der Erlaubnis",
     "Setzungen benachbarter Bauwerke durch Grundwasserabsenkung beobachten",
     "Rückbau so, dass Brunnen und Lanzen dauerhaft verschlossen werden"],
    ["Ableiten von Oberflächen- und Sickerwasser in offener Wasserhaltung im üblichen Umfang, soweit nicht ausgeschrieben",
     "Überwachen und Warten der eigenen Anlagen während der Betriebszeit"],
    ["Wasseranalysen, Reinigungsanlagen und Gebühren für Einleitung",
     "Betrieb über die vereinbarte Dauer hinaus und Vorhalten von Reservegerät auf Anordnung",
     "Beweissicherung an Nachbarbebauung"],
    ["Einrichten und Räumen pauschal bzw. je Brunnen; Betrieb je Betriebsstunde oder Tag laut LV",
     "Fördermengen nach Zählerstand, Leitungen nach Länge"],
    "Grundwasserstände, Durchlässigkeit und Einleitstelle aus Gutachten angeben: [Werte].",
)

_setze(
    "009", "Entwässerungskanalarbeiten",
    ["VOB/C ATV DIN 18306 Entwässerungskanalarbeiten",
     "DIN EN 1610 Einbau und Prüfung von Abwasserleitungen und -kanälen",
     "DIN 1986-100 Entwässerungsanlagen für Gebäude und Grundstücke",
     "DIN EN 752 Entwässerungssysteme außerhalb von Gebäuden",
     "DWA-A 139 Einbau und Prüfung von Abwasserleitungen und -kanälen",
     "DIN 4124 Baugruben und Gräben"],
    ["Rohrauflager und Leitungszone nach Planung und Rohrherstellervorgaben; Steine im Bettungsbereich vermeiden",
     "Gefälle und Höhen vor Verfüllung prüfen und aufmessen",
     "Anschlüsse an Bestandskanäle nur mit Zustimmung des Netzbetreibers",
     "Dichtheitsprüfung (Luft oder Wasser) nach DIN EN 1610 abschnittsweise, mit Protokoll",
     "Kamerabefahrung mit Zustandsbewertung nach LV vor Abnahme",
     "Bestandsplan mit Lage, Höhen und Materialien übergeben"],
    ["Schützen der Rohrenden gegen Verschmutzung und Eindringen von Wasser",
     "Einmessen und Kennzeichnen der Anschlüsse für Folgegewerke"],
    ["Wasserhaltung, Verbau und Kreuzungen von Fremdleitungen, soweit nicht in eigenen Positionen enthalten",
     "Wiederholungsprüfungen wegen Mängeln Dritter",
     "Stilllegen und Verdämmen von Bestandsleitungen"],
    ["Leitungen nach Länge in der Rohrachse; Formstücke werden übermessen und gesondert nach Stück vergütet, soweit ausgeschrieben",
     "Schächte nach Stück mit Tiefenstaffel; Prüfungen nach Abschnitt bzw. Länge"],
    "Netzbetreiber, Anschlusspunkte und Prüfverfahren angeben: [Angaben des Planers].",
)

_setze(
    "010", "Drän- und Versickerungsarbeiten",
    ["VOB/C ATV DIN 18308 Drän- und Versickerungsarbeiten",
     "DIN 4095 Dränung zum Schutz baulicher Anlagen",
     "DWA-A 138 Anlagen zur Versickerung von Niederschlagswasser",
     "DIN 1986-100 Entwässerungsanlagen für Gebäude und Grundstücke",
     "DIN EN 13252 Geotextilien für Dränanlagen"],
    ["Dränung nur dort, wo Planung und Gutachten sie vorsehen; Ableitung des Dränwassers muss gesichert sein",
     "Filterstabilität zwischen Boden, Filter und Dränschicht beachten; Geotextilien überlappen",
     "Dränleitungen mit Gefälle verlegen; Spül- und Kontrollschächte an Richtungswechseln nach Planung",
     "Versickerungsanlagen erst nach Abschluss staubintensiver Arbeiten in Betrieb nehmen bzw. vor Feinteileintrag schützen",
     "Durchlässigkeit des Untergrunds bei Versickerung vor Ausführung bestätigen lassen",
     "Spülung vor Abnahme und Bestandsdokumentation"],
    ["Abdecken offener Rohrenden und Schächte während der Bauzeit",
     "Erstspülung der fertigen Leitungen"],
    ["Bodengutachterliche Versickerungsversuche",
     "Austausch verschlämmter Filterschichten, wenn Dritte die Verschmutzung verursacht haben"],
    ["Leitungen nach Länge in der Achse; Formstücke übermessen",
     "Filter- und Sickerschichten nach Raummaß oder Fläche laut LV; Schächte und Rigolen nach Stück bzw. Raummaß"],
    "Bemessung nach DWA-A 138 und wasserrechtliche Erlaubnis beifügen: [Unterlagen].",
)

_setze(
    "011", "Abscheideranlagen, Kleinkläranlagen",
    ["VOB/C ATV DIN 18306 Entwässerungskanalarbeiten (bzw. DIN 18381 innerhalb von Gebäuden)",
     "DIN EN 858-1/-2 und DIN 1999-100 Abscheideranlagen für Leichtflüssigkeiten",
     "DIN EN 1825-1/-2 und DIN 4040-100 Abscheideranlagen für Fette",
     "DIN EN 12566 Kleinkläranlagen",
     "DIN 1986-100 Entwässerungsanlagen für Gebäude und Grundstücke",
     "Allgemeine bauaufsichtliche Zulassung des Anlagentyps"],
    ["Größe und Typ nach Bemessung und Zulassung; Einbau nach Einbauanleitung des Herstellers",
     "Auftriebssicherheit bei Grundwasser nachweisen bzw. nach Herstellervorgabe sichern",
     "Abdeckungen in der Belastungsklasse der Verkehrsfläche",
     "Lüftungsleitungen und Probenahmeschacht nach Planung",
     "Dichtheitsprüfung und Inbetriebnahme mit Protokoll; Einweisung des Betreibers",
     "Unterlagen für Generalinspektion bzw. behördliche Abnahme übergeben"],
    ["Erstbefüllung mit Wasser zur Inbetriebnahme",
     "Betriebstagebuch und Wartungsanleitung übergeben"],
    ["Wartungsvertrag und Generalinspektion vor Inbetriebnahme durch Sachkundige",
     "Auftriebssicherungen und Betonumhüllungen, soweit nicht im Anlagenpreis enthalten"],
    ["Anlagen nach Stück je Nenngröße einschließlich Zubehör laut LV",
     "Aushub und Verfüllung nach den Regeln der Erdarbeiten"],
    "Abwasserart, Bemessungsgrößen und Auflagen der Wasserbehörde angeben: [Angaben des Planers].",
)

_setze(
    "012", "Mauerarbeiten",
    ["VOB/C ATV DIN 18330 Mauerarbeiten",
     "DIN EN 1996-1-1 und DIN EN 1996-2 mit Nationalen Anhängen (Bemessung und Ausführung)",
     "DIN EN 771 Festlegungen für Mauersteine",
     "DIN EN 998-2 Mauermörtel",
     "DIN 4108 Wärmeschutz und DIN 4109 Schallschutz im Hochbau",
     "DIN 18202 Toleranzen im Hochbau"],
    ["Steine, Mörtel und Verband nach Statik und Planung; Überbindemaß einhalten",
     "Keine Ausführung bei Frost; frisches Mauerwerk vor Regen, Frost und schneller Austrocknung schützen",
     "Horizontale Abdichtung und Trennlagen nach Planung, bevor aufgemauert wird",
     "Schlitze und Aussparungen möglichst im Verband herstellen; nachträgliches Fräsen nur in den zulässigen Grenzen",
     "Anschlüsse an Stahlbeton nach Statik (Anker, Gleitlager, Bewegungsfugen)",
     "Wärmebrückenarme Ausbildung von Stürzen und Deckenauflagern nach Detail"],
    ["Herstellen von Aussparungen und Schlitzen während des Aufmauerns nach Plan",
     "Vorhalten der Arbeitsgerüste bis 2 m Arbeitshöhe",
     "Anlegen der Schichten und Höhenmarken nach vorhandenem Meterriss"],
    ["Nachträgliches Herstellen von Schlitzen und Durchbrüchen",
     "Stürze, Ringanker und Bewehrung im Mauerwerk, soweit gesondert ausgeschrieben",
     "Schutzmaßnahmen gegen außergewöhnliche Witterung"],
    ["Mauerwerk nach Fläche oder Raummaß laut LV mit Abzug von Öffnungen nur oberhalb der in der ATV festgelegten Einzelgrößen",
     "Stürze, Anker und Formsteine nach Stück bzw. Länge"],
    "Steinart, Rohdichte- und Festigkeitsklasse sowie Schallschutzanforderungen je Wandtyp angeben.",
)

_setze(
    "013", "Beton- und Stahlbetonarbeiten",
    ["VOB/C ATV DIN 18331 Beton- und Stahlbetonarbeiten",
     "DIN EN 1992-1-1 mit Nationalem Anhang (Bemessung)",
     "DIN EN 206 mit DIN 1045-2 (Beton – Festlegung, Eigenschaften)",
     "DIN EN 13670 mit DIN 1045-3 (Ausführung von Tragwerken)",
     "DIN 488 Betonstahl",
     "DAfStb-Richtlinie Wasserundurchlässige Bauwerke aus Beton und DIN 18202 Toleranzen"],
    ["Ausführung nach geprüfter Statik und freigegebenen Schal- und Bewehrungsplänen",
     "Überwachungsklasse nach DIN 1045-3 einhalten; ab Klasse 2 Überwachung durch eine anerkannte Stelle",
     "Bewehrung vor dem Betonieren durch die Bauleitung bzw. den Prüfer abnehmen lassen",
     "Betonieren nur bei geeigneter Witterung; Nachbehandlung nach Norm und Protokoll",
     "Einbauteile, Aussparungen und Leerrohre der Fachgewerke nach Planung lagegenau einbauen",
     "Betonierprotokolle, Lieferscheine und Prüfergebnisse laufend übergeben"],
    ["Eigenüberwachung nach DIN 1045-3 im geforderten Umfang",
     "Einbau von Einbauteilen, die vom AG oder anderen Unternehmern beigestellt werden, sofern nicht gesondert ausgeschrieben",
     "Bindedraht und übliche Abstandhalter"],
    ["Sichtbetonanforderungen über die Normanforderung, Musterflächen",
     "Fremdüberwachung, Erstprüfungen und Bohrkernentnahmen über den Normumfang",
     "Nachträgliche Durchbrüche und Kernbohrungen"],
    ["Beton nach Raummaß aus Planmaßen; Öffnungen und Aussparungen nur oberhalb der Einzelgrößen der ATV abziehen",
     "Schalung nach Fläche der geschalten Betonfläche; Bewehrung nach Gewicht aus Stahllisten (Nenngewicht)"],
    "Expositionsklassen, Sichtbetonklassen und WU-Beanspruchungsklasse je Bauteil festlegen.",
)

_setze(
    "014", "Natur-, Betonwerksteinarbeiten",
    ["VOB/C ATV DIN 18332 Naturwerksteinarbeiten bzw. DIN 18333 Betonwerksteinarbeiten",
     "DIN EN 12058 Natursteinprodukte – Bodenplatten und Stufen",
     "DIN EN 1469 Natursteinprodukte – Bekleidungsplatten",
     "DIN EN 13748 Terrazzoplatten",
     "DIN 18516-3 Außenwandbekleidungen hinterlüftet – Naturwerkstein",
     "DIN 51130 Prüfung der rutschhemmenden Eigenschaft und DIN 18202"],
    ["Untergrund auf Ebenheit, Festigkeit, Feuchte und Rissfreiheit prüfen",
     "Verlegeart (Dick-, Mittel- oder Dünnbett) und Mörtel nach Steinart und Herstellerempfehlung; verfärbungsempfindliche Steine beachten",
     "Bewegungs- und Randfugen nach Fugenplan; Bauwerksfugen übernehmen",
     "Rutschhemmung bzw. Oberflächenbearbeitung nach LV; Muster vor Bestellung",
     "Verankerungen von Bekleidungen nach Zulassung bzw. Statik in nichtrostendem Stahl",
     "Belag bis zur Begehbarkeit absperren, danach schützen"],
    ["Reinigen nach dem Verfugen",
     "Anarbeiten an angrenzende Bauteile bei geraden Schnitten"],
    ["Imprägnierungen, Steinpflege und Schutzabdeckungen über die Bauzeit des eigenen Gewerks",
     "Schräg- und Rundschnitte, Gehrungen, Profilierungen",
     "Ausgleich unebener Untergründe über die Toleranz hinaus"],
    ["Flächen nach Fläche in der Ansicht bzw. Draufsicht; Aussparungen nur oberhalb der Einzelgröße der ATV abziehen",
     "Stufen, Fensterbänke und Abdeckungen nach Stück oder Länge"],
    "Gesteinsart, Herkunft, Format, Oberfläche und Rutschhemmklasse je Bereich angeben.",
)

_setze(
    "016", "Zimmer- und Holzbauarbeiten",
    ["VOB/C ATV DIN 18334 Zimmer- und Holzbauarbeiten",
     "DIN EN 1995-1-1 mit Nationalem Anhang (Bemessung)",
     "DIN 68800-1/-2 Holzschutz – Allgemeines und vorbeugende bauliche Maßnahmen",
     "DIN 4074-1 bzw. DIN EN 14081-1 Festigkeitssortierung von Bauholz",
     "DIN EN 14080 Brettschichtholz und Balkenschichtholz",
     "DIN 4108-3 Klimabedingter Feuchteschutz"],
    ["Holzfeuchte beim Einbau nach Norm bzw. LV; Holz trocken lagern und vor Niederschlag schützen",
     "Abbund nach freigegebenen Plänen; Verbindungsmittel nach Statik",
     "Holzschutz vorrangig konstruktiv; chemischer Schutz nur, wenn Gebrauchsklasse und Planung ihn verlangen",
     "Luft- und Winddichtheitsebenen lückenlos und dauerhaft anschließen",
     "Brandschutzanforderungen an Bauteile und Anschlüsse nach Brandschutzkonzept",
     "Maßtoleranzen nach DIN 18202; Bauteile vor dem Montieren der Folgegewerke abnehmen"],
    ["Verbindungsmittel wie Nägel, Schrauben und Bolzen, soweit nicht als Stahlteil ausgeschrieben",
     "Vorhalten von Hebezeug für die eigene Montage im üblichen Umfang"],
    ["Stahlformteile, Anker und Sonderverbinder, soweit gesondert ausgeschrieben",
     "Luftdichtheitsmessung und Feuchtemessungen über die Eigenüberwachung hinaus",
     "Hobeln, Fasen und Oberflächenbehandlung, wenn nicht beschrieben"],
    ["Hölzer nach Länge bzw. Raummaß laut LV in den Nennquerschnitten; maßgebend ist die größte Länge des Einzelholzes",
     "Schalungen, Bekleidungen und Dämmungen nach Fläche; Öffnungen nur oberhalb der Einzelgröße der ATV abziehen"],
    "Festigkeitsklassen, Nutzungsklassen und Gebrauchsklasse des Holzschutzes angeben.",
)

_setze(
    "017", "Stahlbauarbeiten",
    ["VOB/C ATV DIN 18335 Stahlbauarbeiten",
     "DIN EN 1090-1/-2 Ausführung von Stahltragwerken mit Konformitätsnachweis",
     "DIN EN 1993-1-1 mit Nationalem Anhang (Bemessung)",
     "DIN EN ISO 3834 Qualitätsanforderungen an das Schmelzschweißen",
     "DIN EN ISO 12944 Korrosionsschutz durch Beschichtungssysteme",
     "DIN EN ISO 1461 Feuerverzinkung"],
    ["Ausführungsklasse (EXC) nach Planung; Zertifikat des Herstellers für diese Klasse vorlegen",
     "Werkstattzeichnungen und Montageplanung zur Freigabe; Prüfstatik beachten",
     "Ankerschrauben und Fußplatten vor Montage aufmessen; Abweichungen melden",
     "Schweißarbeiten auf der Baustelle nur mit Schweißaufsicht und Erlaubnisschein",
     "Montagestabilität bis zum Abschluss der Aussteifung sichern",
     "Werkstoffzeugnisse, Schweißprotokolle und Leistungserklärung übergeben"],
    ["Ausrichten und Unterfüttern der Bauteile bis zum Vergießen",
     "Ausbessern von Montageschäden am Korrosionsschutz",
     "Verbindungsmittel und Kleinteile der Konstruktion"],
    ["Vergießen der Fußplatten, soweit nicht Teil der Position",
     "Brandschutzbeschichtungen und Beschichtungen über den beschriebenen Umfang",
     "Probebelastungen und zusätzliche Prüfungen durch Dritte"],
    ["Nach Gewicht aus den Stücklisten der freigegebenen Werkstattzeichnungen mit Nenngewichten; Zuschläge nur nach ATV",
     "Verbindungen, Kleinteile und Montagehilfen nach den Regeln der ATV"],
    "Ausführungsklasse, Korrosivitätskategorie und Feuerwiderstand der Bauteile angeben.",
)

_setze(
    "018", "Abdichtungsarbeiten",
    ["VOB/C ATV DIN 18336 Abdichtungsarbeiten",
     "DIN 18533 Abdichtung von erdberührten Bauteilen",
     "DIN 18534 Abdichtung von Innenräumen",
     "DIN 18535 Abdichtung von Behältern und Becken",
     "DIN 18532 Abdichtung von befahrbaren Verkehrsflächen aus Beton",
     "Verarbeitungsrichtlinien und Prüfzeugnisse der Abdichtungshersteller"],
    ["Wassereinwirkungsklasse und Rissklasse nach Planung; Bauart und Schichtdicken danach wählen",
     "Untergrund prüfen: tragfähig, sauber, ausreichend trocken, Kanten gefast, Kehlen ausgebildet",
     "Verarbeitung nur bei zulässigen Untergrund- und Lufttemperaturen; vor Regen und Frost schützen",
     "Durchdringungen, Fugen und Übergänge mit systemzugehörigen Bauteilen",
     "Schichtdicken (z. B. bei PMBC) messen und protokollieren; Durchtrocknung vor Verfüllung prüfen",
     "Schutzschichten zeitnah nach Freigabe aufbringen; Abdichtung nicht beschädigen lassen"],
    ["Reinigen des Untergrunds von losen Teilen und Staub",
     "Eigenüberwachung mit Schichtdickenkontrolle",
     "Abdecken fertiger Abdichtungen bis zum Einbau der Schutzschicht im eigenen Arbeitsablauf"],
    ["Untergrundvorbehandlung über das übliche Maß (Ausgleich, Schleifen, Trocknen)",
     "Schutzschichten, Dämmungen und Dränagen, soweit nicht in der Position enthalten",
     "Prüfungen durch Sachverständige"],
    ["Flächen nach abgedichteter Fläche; Öffnungen und Durchdringungen nur oberhalb der Einzelgröße der ATV abziehen",
     "Kehlen, Fugen und Anschlüsse nach Länge; Einbauteile nach Stück"],
    "Wassereinwirkungsklasse, Rissklasse und Nutzungsklasse je Bauteil angeben.",
)

# ---------------------------------------------------------------------------
# Dach, Hülle und Ausbau
# ---------------------------------------------------------------------------

_setze(
    "020", "Dachdeckungsarbeiten",
    ["VOB/C ATV DIN 18338 Dachdeckungs- und Dachabdichtungsarbeiten",
     "Regelwerk des Deutschen Dachdeckerhandwerks (ZVDH) mit Fachregeln für Dachdeckungen",
     "DIN EN 1991-1-4 mit Nationalem Anhang (Windlasten) für die Windsogsicherung",
     "DIN 4108-3 Klimabedingter Feuchteschutz",
     "DIN 4426 Sicherheitseinrichtungen zur Instandhaltung"],
    ["Regeldachneigung des Deckmaterials beachten; bei Unterschreitung Zusatzmaßnahmen nach Fachregel",
     "Unterdeckung bzw. Unterspannung nach Anforderungsklasse und Planung",
     "Befestigung bzw. Windsogsicherung nach Berechnung oder Fachregel",
     "Lattung nach Deckmaterial; Konterlattung für Hinterlüftung",
     "Anschlüsse an Kamine, Gauben und Durchdringungen regensicher und dauerhaft",
     "Absturzsicherung während der Arbeiten nach DGUV; Sicherheitshaken bzw. Anschlagpunkte nach Planung"],
    ["Zuschneiden und Anpassen an Kehlen, Grate und Ortgänge im üblichen Umfang",
     "Lattenprüfung auf Maßhaltigkeit vor dem Decken",
     "Lagern von Reservedeckmaterial nur, wenn vereinbart"],
    ["Schneefanggitter, Laufanlagen, Dachausstiege und Sicherheitshaken",
     "Formziegel und Sonderformate über die Regelausführung",
     "Rückbau und Entsorgung der Altdeckung"],
    ["Dachflächen nach Fläche in der Dachebene; Aussparungen nur oberhalb der Einzelgröße der ATV abziehen",
     "Grate, Firste, Kehlen, Ortgänge und Traufen nach Länge; Einbauteile nach Stück"],
    "Deckmaterial, Farbe, Anforderungsklasse der Unterdeckung und Windzone angeben.",
)

_setze(
    "021", "Dachabdichtungsarbeiten",
    ["VOB/C ATV DIN 18338 Dachdeckungs- und Dachabdichtungsarbeiten",
     "DIN 18531 Abdichtung von Dächern sowie Balkonen, Loggien und Laubengängen",
     "Fachregel für Abdichtungen – Flachdachrichtlinie des ZVDH",
     "DIN EN 12056-3 und DIN 1986-100 Dachentwässerung einschließlich Notentwässerung",
     "DIN EN 1991-1-4 mit Nationalem Anhang (Windlasten)",
     "DIN 4108-2/-3 Mindestwärmeschutz und Feuchteschutz"],
    ["Untergrund vor Beginn prüfen: tragfähig, trocken, eben, mit planmäßigem Gefälle",
     "Dampfsperre, Dämmung und Abdichtung als abgestimmtes System nach Herstellerangaben",
     "Anschlusshöhen an aufgehende Bauteile und Türen nach Fachregel bzw. Detail",
     "Lagesicherheit gegen Windsog nachweisen (Auflast, Verklebung oder mechanische Befestigung)",
     "Abläufe und Notüberläufe nach Bemessung; Dachfläche bei Arbeitsende regensicher schließen",
     "Abdichtung bei Übergabe an Folgegewerke dokumentieren; Schutz gegen Beschädigung"],
    ["Reinigen des Untergrunds und Voranstrich, soweit systembedingt",
     "Tägliche provisorische Abschlüsse",
     "Eigenüberwachung der Nähte"],
    ["Dichtheitsprüfungen (z. B. Leckortung) durch Dritte",
     "Schutzlagen und Belag bei genutzten Dachflächen, Dachbegrünung",
     "Rückbau und Entsorgung vorhandener Schichten"],
    ["Flächen nach abgedichteter Dachfläche; Aussparungen nur oberhalb der Einzelgröße der ATV abziehen",
     "An- und Abschlüsse nach Länge; Abläufe, Durchdringungen und Lichtkuppeln nach Stück"],
    "Anwendungsklasse, Gefälle, Nutzung (z. B. begrünt, begehbar) und Brandverhalten (harte Bedachung) angeben.",
)

_setze(
    "022", "Klempnerarbeiten",
    ["VOB/C ATV DIN 18339 Klempnerarbeiten",
     "Fachregeln des Klempnerhandwerks (ZVSHK) und Fachregel für Metallarbeiten im Dachdeckerhandwerk",
     "DIN EN 612 Hängedachrinnen und Regenfallrohre aus Metallblech",
     "DIN EN 1462 Rinnenhalter für Hängedachrinnen",
     "DIN EN 12056-3 und DIN 1986-100 Dachentwässerung"],
    ["Werkstoffe untereinander verträglich wählen; Kontaktkorrosion durch Trennlagen vermeiden",
     "Wärmedehnung durch Dehnungsausgleicher und Schiebenähte berücksichtigen",
     "Rinnen mit Gefälle zu den Abläufen; Befestigungsabstände nach Fachregel",
     "Anschlüsse an Abdichtungen und Putz dauerhaft regensicher ausführen",
     "Kanten und Schnittflächen entgraten; Oberflächen vor Beschädigung schützen",
     "Abstimmung mit Dachdecker, Fassade und Gerüst über Reihenfolge und Anschlüsse"],
    ["Anpassen an Kehlen, Ecken und Durchdringungen im üblichen Umfang",
     "Befestigungsmittel und Haften"],
    ["Rinnenheizungen, Laubfangkörbe und Sonderformteile",
     "Schneefang und Laufanlagen",
     "Rückbau vorhandener Bauteile"],
    ["Rinnen, Rohre, Abdeckungen und Anschlüsse nach Länge in der Achse; Formteile übermessen",
     "Endstücke, Stutzen, Bögen und Kleinteile nach Stück, soweit ausgeschrieben"],
    "Werkstoff, Materialdicke, Zuschnitt und Oberfläche je Bauteil angeben.",
)

_setze(
    "023", "Putz- und Stuckarbeiten, Wärmedämmsysteme",
    ["VOB/C ATV DIN 18350 Putz- und Stuckarbeiten sowie DIN 18345 Wärmedämm-Verbundsysteme",
     "DIN EN 13914-1/-2 Planung, Zubereitung und Ausführung von Außen- und Innenputzen",
     "DIN 18550-1/-2 Ergänzende Festlegungen zu Putzen",
     "DIN EN 998-1 Putzmörtel und DIN EN 13279-1 Gipsputze",
     "DIN 55699 Anwendung und Verarbeitung von WDVS",
     "Zulassung bzw. Bauartgenehmigung des WDVS; DIN 18202 Toleranzen"],
    ["Putzgrund auf Tragfähigkeit, Saugverhalten, Feuchte und Ebenheit prüfen; Vorbehandlung nach Herstellerangabe",
     "Nicht bei Frost bzw. unter der vom Hersteller genannten Mindesttemperatur arbeiten",
     "Oberflächenqualität nach vereinbarter Qualitätsstufe (Q1–Q4) bzw. Struktur nach Muster",
     "WDVS nur als zugelassenes System; Brandschutzmaßnahmen (z. B. Brandriegel) nach Zulassung und Konzept",
     "Anschlüsse an Fenster, Dächer und Durchdringungen schlagregendicht mit Systemprofilen",
     "Frische Putzflächen vor Schlagregen, Sonne und Wind schützen"],
    ["Schützen angrenzender Bauteile vor Verunreinigung",
     "Kanten- und Eckschutzprofile im üblichen Umfang, soweit nicht gesondert ausgeschrieben",
     "Beiputzen in geringem Umfang während der eigenen Arbeiten"],
    ["Putzträger, Bewehrung über Rissbereiche und Ausgleichsputz über die Toleranz hinaus",
     "Beiputzarbeiten nach Abschluss der eigenen Leistung",
     "Laibungen, Faschen, Gesimse und Profile mit eigener Position"],
    ["Wand- und Deckenflächen nach Fläche; Öffnungen bis 2,5 m² Einzelgröße werden übermessen",
     "Laibungen bei abgezogenen Öffnungen nach Länge oder Fläche gesondert; Profile nach Länge"],
    "Qualitätsstufe, Putzsystem, Dämmstoff und Brandschutzklasse des WDVS angeben.",
)

_setze(
    "024", "Fliesen- und Plattenarbeiten",
    ["VOB/C ATV DIN 18352 Fliesen- und Plattenarbeiten",
     "DIN 18157-1 Ausführung keramischer Bekleidungen im Dünnbettverfahren",
     "DIN EN 14411 Keramische Fliesen und Platten",
     "DIN EN 12004-1 Mörtel und Klebstoffe für Fliesen und Platten",
     "DIN 18534 Abdichtung von Innenräumen (Verbundabdichtung)",
     "DIN 51130 und DIN 51097 Rutschhemmung; DIN 18202 Toleranzen"],
    ["Untergrund prüfen: Ebenheit, Festigkeit, Belegreife (Restfeuchte), Fugen und Risse",
     "Verbundabdichtung nach Wassereinwirkungsklasse mit Dichtbändern an Ecken und Durchdringungen",
     "Fugenbild nach Verlegeplan bzw. Absprache; Bewegungs- und Randfugen ausbilden",
     "Großformate mit geeignetem Kleber und Verfahren hohlraumarm verlegen",
     "Elastische Anschlussfugen als Wartungsfugen ausführen; Hinweis an den AG",
     "Flächen bis zur Belastbarkeit sperren, danach schützen"],
    ["Reinigen des Untergrunds und Haftgrund, soweit systembedingt",
     "Abschließende Reinigung des Belags",
     "Zuschnitte an geraden Anschlüssen"],
    ["Ausgleich von Untergrundunebenheiten über die Toleranz hinaus",
     "Bohrungen und Ausschnitte für Installationen, Profile und Sockel, soweit gesondert ausgeschrieben",
     "Imprägnierung und Schutzabdeckungen"],
    ["Flächen nach Fläche; Aussparungen bis 0,1 m² Einzelgröße werden übermessen",
     "Sockel, Kanten, Profile und Fugen nach Länge; Ausschnitte nach Stück"],
    "Format, Rutschhemmung, Fugenbreite und Wassereinwirkungsklasse je Raum angeben.",
)

_setze(
    "025", "Estricharbeiten",
    ["VOB/C ATV DIN 18353 Estricharbeiten",
     "DIN 18560 Estriche im Bauwesen (Teile 1–4 und 7)",
     "DIN EN 13813 Estrichmörtel und Estrichmassen",
     "DIN EN 1264-4 Fußbodenheizung – Installation",
     "DIN 4109 Schallschutz und DIN 18202 Toleranzen"],
    ["Untergrund und Rohdecke auf Ebenheit, Höhenlage und Sauberkeit prüfen; Höhenbezug festlegen",
     "Randdämmstreifen vollständig; Schall- und Wärmebrücken vermeiden",
     "Estrichart, Festigkeits- und Biegezugklasse sowie Nenndicke nach Nutzlast und LV",
     "Fugenplan mit Bewegungs- und Scheinfugen, abgestimmt mit Bodenleger und Heizungsbauer",
     "Heizestrich: Funktionsheizen mit Protokoll; Belegreifheizen nach Absprache",
     "Zugluft und direkte Sonneneinstrahlung beim Erhärten vermeiden; Begehbarkeit beachten"],
    ["Abdecken der Dämmschicht mit Trennlage bzw. Folie nach Norm",
     "Herstellen der Höhenmarken auf Grundlage des Meterrisses",
     "Anarbeiten an Türzargen und aufgehende Bauteile"],
    ["Belegreifheizen, CM-Messungen über den Eigenbedarf hinaus",
     "Schleifen und Grundieren für den Folgebelag",
     "Ausgleichsschüttungen und zusätzliche Dämmlagen"],
    ["Estrich und Dämmung nach Fläche; Aussparungen nur oberhalb der Einzelgröße der ATV abziehen",
     "Randstreifen und Fugen nach Länge; Mehrdicken nach Fläche und cm"],
    "Belag, Nutzlast, Fußbodenheizung und Schallschutzanforderung je Raum angeben.",
)

_setze(
    "026", "Fenster, Außentüren",
    ["VOB/C ATV DIN 18355 Tischlerarbeiten bzw. DIN 18360 Metallbauarbeiten",
     "DIN EN 14351-1 Fenster und Außentüren – Produktnorm",
     "Leitfaden zur Planung und Ausführung der Montage von Fenstern und Haustüren (RAL-Gütegemeinschaft)",
     "DIN 4108-2/-7 Wärmeschutz und Luftdichtheit",
     "DIN 18008 Glas im Bauwesen",
     "DIN EN 1627 Einbruchhemmung; DIN 18040 Barrierefreies Bauen"],
    ["Öffnungsmaße vor Fertigung am Bau nehmen; Abweichungen von der Planung melden",
     "Befestigung lastabtragend nach Herstellerangabe und statischem Erfordernis",
     "Anschlussfuge dreiebenig: innen luftdicht, Mitte gedämmt, außen schlagregendicht",
     "Bodenschwellen und Türanschlüsse abgestimmt mit Abdichtung und Barrierefreiheit",
     "Beschläge einstellen; Funktionsprüfung bei Übergabe",
     "Schutzfolien und Schutz der Oberflächen bis zur Abnahme"],
    ["Befestigungsmittel und Einstellen der Beschläge",
     "Übergabe von Pflege- und Wartungsanleitungen"],
    ["Fensterbänke innen und außen, Rollladenkästen und Insektenschutz, soweit gesondert",
     "Erhöhte Sicherheits- und Schallschutzklassen über die Beschreibung",
     "Ausbau und Entsorgung von Altfenstern"],
    ["Elemente nach Stück mit Angabe der Rahmenaußenmaße oder nach Fläche laut LV",
     "Anschlussfugen nach Länge, soweit nicht im Elementpreis enthalten"],
    "Uw-Wert, Schall-, Einbruch- und Schlagregenklasse je Element in der Fensterliste angeben.",
)

_setze(
    "027", "Tischlerarbeiten",
    ["VOB/C ATV DIN 18355 Tischlerarbeiten",
     "DIN 18101 Türen für den Wohnungsbau – Maße",
     "DIN 68706-1 Innentüren aus Holz und Holzwerkstoffen",
     "DIN EN 942 Holz in Tischlerarbeiten",
     "Verwendbarkeitsnachweise für Feuer- und Rauchschutzabschlüsse",
     "DIN 18040-1/-2 Barrierefreies Bauen"],
    ["Maße am Bau nehmen; Werkstattzeichnungen und Muster vor Fertigung freigeben lassen",
     "Holzfeuchte und Klimabedingungen vor Einbau prüfen; Einbau erst nach Abschluss nasser Arbeiten",
     "Brand- und Rauchschutztüren nur nach Zulassung einbauen; Kennzeichnung und Übereinstimmungserklärung",
     "Schall- und Klimaklassen der Türen nach Türliste",
     "Einbauten an Installationen und Wände anpassen; Befestigung abgestimmt mit Trockenbau",
     "Oberflächen bis zur Abnahme schützen"],
    ["Befestigungsmittel, Einstellen der Beschläge und Funktionsprüfung",
     "Anpassen an vorhandene Maßtoleranzen innerhalb DIN 18202"],
    ["Bauaufmaß bei nicht maßhaltigen Bestandsöffnungen",
     "Sonderbeschläge, Feststellanlagen und Elektrozubehör",
     "Ausbau vorhandener Türen und Einbauten"],
    ["Türen und Einbauten nach Stück; Bekleidungen und Leisten nach Länge",
     "Arbeitsplatten und Verkleidungen nach Länge bzw. Fläche laut LV"],
    "Türliste mit Maßen, Anschlag, Klassen (Brand, Schall, Klima) und Beschlägen beifügen.",
)

_setze(
    "028", "Parkett-, Holzpflasterarbeiten",
    ["VOB/C ATV DIN 18356 Parkett- und Holzpflasterarbeiten",
     "DIN EN 13489 Mehrschichtparkettelemente",
     "DIN EN 14342 Holzfußböden – Eigenschaften",
     "DIN 18560 Estriche (Belegreife des Untergrunds)",
     "Merkblätter der TKB bzw. des Zentralverbands Parkett und Fußbodentechnik",
     "DIN 18202 Toleranzen im Hochbau"],
    ["Untergrund prüfen: Restfeuchte (CM-Messung), Festigkeit, Ebenheit, Risse, Randdämmstreifen",
     "Raumklima vor und während der Verlegung nach Herstellerangabe (Temperatur, Luftfeuchte)",
     "Bei Fußbodenheizung Aufheizprotokoll und Belegreife des Estrichs vorlegen lassen",
     "Randabstand für Quellen und Schwinden einhalten; Fugen nach Raumgröße",
     "Oberflächenbehandlung nach Muster; Pflegeanleitung übergeben",
     "Belag bis zur Abnahme vor Feuchte und Schmutz schützen"],
    ["Prüfen des Untergrunds einschließlich CM-Messung im üblichen Umfang",
     "Reinigen des Untergrunds von groben Verunreinigungen",
     "Erstpflege nach Herstellerangabe"],
    ["Schleifen und Spachteln des Untergrunds über die Toleranz hinaus",
     "Sockelleisten, Profile und Übergangsschienen, soweit gesondert",
     "Schutzabdeckungen für die Bauzeit anderer Gewerke"],
    ["Flächen nach verlegter Fläche; Aussparungen nur oberhalb der Einzelgröße der ATV abziehen",
     "Leisten und Profile nach Länge; Stufen nach Stück"],
    "Holzart, Sortierung, Aufbau, Verlegemuster und Oberflächenbehandlung angeben.",
)

_setze(
    "029", "Beschlagarbeiten",
    ["VOB/C ATV DIN 18357 Beschlagarbeiten",
     "DIN EN 1906 Türdrücker und Türknäufe",
     "DIN EN 1303 Schließzylinder",
     "DIN EN 1154 Türschließer",
     "DIN EN 179 Notausgangsverschlüsse und DIN EN 1125 Paniktürverschlüsse",
     "DIN 18273 Türdrückergarnituren für Feuer- und Rauchschutztüren"],
    ["Beschläge passend zu Türtyp, Gewicht und Nutzungshäufigkeit wählen",
     "Fluchttürbeschläge nur in zugelassener Kombination mit Schloss und Tür",
     "Bei Brand- und Rauchschutztüren nur zugelassene Beschläge; Zulassung der Tür beachten",
     "Schließanlage nach Schließplan; Übergabe der Schlüssel mit Quittung und Sicherungskarte",
     "Montage maßgenau und funktionsgerecht; Einstellen von Schließern",
     "Oberflächen schützen; Funktionsprüfung mit Protokoll"],
    ["Befestigungsmittel und Einstellen",
     "Übergabe von Wartungshinweisen"],
    ["Erstellen und Pflegen des Schließplans",
     "Elektrische Komponenten (Motorschlösser, Türöffner) und deren Anschluss",
     "Nachbestellungen von Schlüsseln"],
    ["Beschläge nach Stück bzw. Garnitur; Schließanlagen nach Zylinder und Schlüssel"],
    "Schließplan, Fluchtwegfunktionen und Brandschutzanforderungen je Tür angeben.",
)

_setze(
    "030", "Rollladenarbeiten, Sonnenschutz",
    ["VOB/C ATV DIN 18358 Rollladenarbeiten",
     "DIN EN 13659 Abschlüsse außen und Außenjalousien",
     "DIN EN 13561 Markisen",
     "DIN EN 13120 Abschlüsse innen",
     "DIN 4108-2 Sommerlicher Wärmeschutz"],
    ["Windwiderstandsklasse nach Einbausituation und Windzone",
     "Einbaumaße und Befestigung am Bau prüfen; Abstimmung mit Fenster, WDVS und Putz",
     "Führungsschienen lot- und fluchtgerecht; Behänge leichtgängig",
     "Elektrische Antriebe und Steuerungen mit Elektro und Gebäudeautomation abstimmen",
     "Windwächter bzw. Sensorik nach Planung; Funktionsprüfung mit Protokoll",
     "Bedien- und Wartungsanleitungen übergeben"],
    ["Befestigungsmittel und Einstellen der Endlagen",
     "Funktionsprüfung bei Übergabe"],
    ["Steuerungen, Sensoren und Gebäudeautomationsanbindung",
     "Elektroanschluss, soweit nicht beschrieben",
     "Ausbau vorhandener Anlagen"],
    ["Anlagen nach Stück mit Größenangabe oder nach Fläche des Behangs laut LV",
     "Führungsschienen und Blenden nach Länge, soweit gesondert"],
    "Behangart, Farbe, Bedienung und Windklasse je Fenster angeben.",
)

_setze(
    "031", "Metallbauarbeiten",
    ["VOB/C ATV DIN 18360 Metallbauarbeiten",
     "DIN EN 1090-1/-2/-3 Ausführung von Stahl- und Aluminiumtragwerken",
     "DIN 18065 Gebäudetreppen",
     "DIN EN 1991-1-1 mit Nationalem Anhang (Horizontallasten auf Geländer)",
     "DIN EN 13241 Tore und DIN EN 16034 Feuer- und Rauchschutzeigenschaften",
     "DIN EN ISO 12944 bzw. DIN EN ISO 1461 Korrosionsschutz"],
    ["Maße am Bau nehmen; Werkstattzeichnungen zur Freigabe vorlegen",
     "Tragende Bauteile nur mit Zertifizierung nach DIN EN 1090 in der geforderten Ausführungsklasse",
     "Absturzsicherungen nach Landesbauordnung (Höhe, Öffnungen, Leiterwirkung) ausführen",
     "Befestigungen mit zugelassenen Dübeln und Ankern; Randabstände beachten",
     "Kontaktkorrosion zwischen unterschiedlichen Metallen vermeiden",
     "Oberflächen bis zur Abnahme schützen; Leistungserklärungen übergeben"],
    ["Befestigungsmittel und Kleinteile",
     "Ausbessern von Montageschäden an Beschichtungen"],
    ["Statische Berechnungen und Prüfungen für Sonderkonstruktionen",
     "Antriebe, Steuerungen und Elektroanschluss bei Toren",
     "Beschichtungen über die beschriebene Ausführung"],
    ["Bauteile nach Stück, Länge oder Gewicht laut LV",
     "Geländer nach Länge in der Achse des Handlaufs"],
    "Ausführungsklasse, Oberfläche, Korrosivitätskategorie und Lastannahmen angeben.",
)

_setze(
    "032", "Verglasungsarbeiten",
    ["VOB/C ATV DIN 18361 Verglasungsarbeiten",
     "DIN 18008 Glas im Bauwesen (Teile 1–5)",
     "DIN EN 1279 Mehrscheiben-Isolierglas",
     "DIN EN 12150 Einscheibensicherheitsglas und DIN EN 14449 Verbund-Sicherheitsglas",
     "DIN 18545 Abdichten von Verglasungen mit Dichtstoffen",
     "Technische Richtlinien des Glaserhandwerks"],
    ["Glasaufbau nach Anforderungen an Absturzsicherung, Verletzungsschutz, Wärme- und Schallschutz",
     "Absturzsichernde und Überkopfverglasungen nur nach DIN 18008 bzw. mit Nachweis",
     "Verklotzung und Glasfalz nach Richtlinie; Falzraum belüftet",
     "Verträglichkeit von Dichtstoffen und Randverbund sicherstellen",
     "Kennzeichnung von Sicherheitsglas sichtbar; Markierung großer Glasflächen nach Bedarf",
     "Gläser bis zur Abnahme vor Beschädigung schützen"],
    ["Klotzung, Dichtprofile und Befestigungsleisten",
     "Entfernen von Etiketten"],
    ["Bauteilversuche und Sondernachweise",
     "Sicherheitsmarkierungen und Folien",
     "Bruchersatz bei Fremdverschulden"],
    ["Glas nach Fläche des kleinsten umschriebenen Rechtecks; Mindestabrechnungsflächen nach ATV",
     "Formscheiben und Sonderzuschnitte nach Stück bzw. mit Zuschlag laut LV"],
    "Glasaufbau, Ug-Wert, Sicherheitsanforderung und Einbaulage je Element angeben.",
)

_setze(
    "033", "Baureinigungsarbeiten",
    ["VOB/C ATV DIN 18299 Allgemeine Regelungen für Bauarbeiten jeder Art",
     "Reinigungs- und Pflegeanleitungen der Hersteller der jeweiligen Oberflächen",
     "Richtlinien des Bundesinnungsverbands des Gebäudereiniger-Handwerks",
     "Gefahrstoffverordnung (GefStoffV) für Reinigungsmittel"],
    ["Reinigungsmittel und -verfahren auf das Material abstimmen; empfindliche Flächen vorher testen",
     "Bauzwischenreinigungen nach Abruf der Bauleitung; Bauendreinigung vor Übergabe",
     "Fenster und Glas einschließlich Rahmen innen und außen nach LV",
     "Schutzfolien und Etiketten entfernen, soweit beauftragt",
     "Schäden vor Beginn dokumentieren; beschädigte Oberflächen nicht weiterbehandeln",
     "Abnahme der Reinigung gemeinsam mit der Bauleitung"],
    ["Wasser- und Stromentnahme an vorhandenen Anschlüssen",
     "Entsorgung der Reinigungsabfälle"],
    ["Beseitigen grober Verschmutzungen durch andere Gewerke, sofern nicht deren Pflicht",
     "Erstpflege von Bodenbelägen und Sonderreinigungen",
     "Hubarbeitsbühnen und Gerüste für große Höhen"],
    ["Flächen nach gereinigter Grundfläche bzw. Ansichtsfläche; Glas nach Fläche oder Stück laut LV"],
    "Die grobe Reinigung des eigenen Arbeitsbereichs bleibt Pflicht jedes Gewerks; dies in allen LVs festhalten.",
)

_setze(
    "034", "Maler- und Lackierarbeiten",
    ["VOB/C ATV DIN 18363 Maler- und Lackierarbeiten",
     "DIN EN 13300 Beschichtungsstoffe für Wände und Decken innen",
     "DIN EN 1062-1 Beschichtungsstoffe für Mauerwerk und Beton außen",
     "BFS-Merkblätter des Bundesausschusses Farbe und Sachwertschutz",
     "Merkblatt Nr. 2 des Bundesverbands der Gipsindustrie (Qualitätsstufen Q1–Q4)"],
    ["Untergrund auf Tragfähigkeit, Feuchte, Saugfähigkeit und Verunreinigung prüfen; Bedenken schriftlich",
     "Mindesttemperaturen und Luftfeuchte nach Herstellerangabe; nicht bei Nebel, Frost oder direkter Sonne außen",
     "Beschichtungssystem aufeinander abgestimmt; Nassabriebklasse und Glanzgrad nach LV",
     "Farbtöne nach Musterfläche festlegen lassen",
     "Angrenzende Bauteile abdecken und abkleben",
     "Lackierte Flächen vor Staub und Beschädigung schützen"],
    ["Abdecken und Abkleben angrenzender Bauteile",
     "Entfernen loser Teile und Staub vom Untergrund",
     "Kleine Ausbesserungen des Untergrunds vor dem Beschichten"],
    ["Spachtelarbeiten in Flächen, Grundierungen über das systembedingte Maß",
     "Entfernen alter Beschichtungen und Tapeten",
     "Musterflächen über die erste hinaus"],
    ["Wand- und Deckenflächen nach Fläche; Öffnungen bis 2,5 m² Einzelgröße werden übermessen",
     "Laibungen bei abgezogenen Öffnungen gesondert; Kleinteile wie Heizkörper oder Rohre nach Stück oder Länge"],
    "Qualitätsstufe des Untergrunds, Beschichtungssystem und Farbtonkonzept angeben.",
)

_setze(
    "035", "Korrosionsschutzarbeiten an Stahl- und Aluminiumbauten",
    ["VOB/C ATV DIN 18364 Korrosionsschutzarbeiten an Stahl- und Aluminiumbauten",
     "DIN EN ISO 12944 Korrosionsschutz durch Beschichtungssysteme (Teile 1–9)",
     "DIN EN ISO 8501-1 Visuelle Beurteilung der Oberflächenreinheit",
     "DIN EN ISO 1461 Feuerverzinkung",
     "DIN 55633 Pulverbeschichtung von Stahlbauten",
     "DIN EN ISO 2808 Bestimmung der Schichtdicke"],
    ["Korrosivitätskategorie und Schutzdauer bestimmen Systemwahl und Sollschichtdicke",
     "Oberflächenvorbereitung auf den geforderten Reinheitsgrad; Rauheit nach System",
     "Beschichten nur bei ausreichendem Abstand zum Taupunkt und geeigneter Oberflächentemperatur",
     "Kanten, Schweißnähte und Schrauben gesondert vorlegen (Kantenschutz)",
     "Schichtdicken messen und protokollieren; Kontrollflächen nach Norm",
     "Klima- und Arbeitsprotokolle laufend führen"],
    ["Messungen der Klimabedingungen und Schichtdicken im Rahmen der Eigenüberwachung",
     "Abdecken angrenzender Bauteile"],
    ["Strahlen auf höhere Reinheitsgrade und Schadstoffbeseitigung bei Altbeschichtungen",
     "Einhausungen und Absaugungen",
     "Prüfungen durch Dritte"],
    ["Nach beschichteter Fläche oder Gewicht der Konstruktion laut LV; Kleinteile nach Stück"],
    "Korrosivitätskategorie, Schutzdauer und Farbton nach RAL angeben.",
)

_setze(
    "036", "Bodenbelagarbeiten",
    ["VOB/C ATV DIN 18365 Bodenbelagarbeiten",
     "DIN EN 14041 Elastische, textile und Laminat-Bodenbeläge – wesentliche Eigenschaften",
     "DIN EN ISO 10874 Klassifizierung nach Nutzung",
     "DIN 18560 Estriche (Belegreife des Untergrunds)",
     "TKB-Merkblätter zur Untergrundvorbereitung und Verlegung",
     "DIN 18202 Toleranzen im Hochbau"],
    ["Untergrund prüfen: Restfeuchte (CM-Messung), Festigkeit, Ebenheit, Risse, Temperatur",
     "Bei Fußbodenheizung Aufheizprotokoll anfordern; Belegreife erst danach",
     "Raumklima während Verlegung und Aushärtung nach Herstellerangabe",
     "Spachtelmasse und Klebstoff als abgestimmtes, emissionsarmes System",
     "Nähte nach Herstellerangabe verschweißen oder versiegeln; Fugen des Untergrunds übernehmen",
     "Belag bis zur Abnahme abdecken bzw. schützen"],
    ["Prüfen des Untergrunds einschließlich CM-Messung im üblichen Umfang",
     "Reinigen des Untergrunds von groben Verunreinigungen",
     "Erstreinigung nach Verlegung"],
    ["Schleifen, Grundieren und Spachteln über das übliche Maß",
     "Sockelleisten, Kantenprofile und Treppenkanten, soweit gesondert",
     "Schutzabdeckungen für Folgegewerke"],
    ["Flächen nach verlegter Fläche; Aussparungen nur oberhalb der Einzelgröße der ATV abziehen",
     "Sockel und Profile nach Länge; Stufen nach Stück"],
    "Belagart, Nutzungsklasse, Brandverhalten und Ableitfähigkeit je Raum angeben.",
)

_setze(
    "037", "Tapezierarbeiten",
    ["VOB/C ATV DIN 18366 Tapezierarbeiten",
     "DIN EN 233 Wandbekleidungen in Rollen – Tapeten",
     "DIN EN 259-1 Wandbekleidungen in Rollen – Strapazierfähige Wandbekleidungen",
     "BFS-Merkblätter",
     "Merkblatt Nr. 2 des Bundesverbands der Gipsindustrie (Qualitätsstufen)"],
    ["Untergrund auf Tragfähigkeit, Feuchte, Ebenheit und Saugfähigkeit prüfen",
     "Kleister bzw. Kleber nach Tapetenart; Raumklima nach Herstellerangabe",
     "Muster- und Rapportbild beachten; nur Rollen derselben Anfertigung je Raum",
     "Nähte stoßen und andrücken; keine Überlappungen ohne Vereinbarung",
     "Schalter und Steckdosen nur nach Freischalten durch den Elektriker umarbeiten",
     "Angrenzende Bauteile schützen"],
    ["Abdecken angrenzender Bauteile",
     "Vorbehandlung des Untergrunds durch Grundierung im üblichen Umfang"],
    ["Entfernen alter Tapeten und Spachteln des Untergrunds",
     "Makulatur oder Renoviervlies, soweit gesondert"],
    ["Wand- und Deckenflächen nach Fläche; Öffnungen bis 2,5 m² Einzelgröße werden übermessen",
     "Laibungen bei abgezogenen Öffnungen gesondert nach Länge bzw. Fläche"],
    "Tapetenart, Rapport und Qualitätsstufe des Untergrunds angeben.",
)

_setze(
    "038", "Vorgehängte hinterlüftete Fassaden",
    ["VOB/C ATV DIN 18351 Vorgehängte hinterlüftete Fassaden",
     "DIN 18516-1 Außenwandbekleidungen hinterlüftet – Anforderungen und Prüfgrundsätze",
     "DIN EN 1991-1-4 mit Nationalem Anhang (Windlasten)",
     "Zulassungen bzw. Bauartgenehmigungen für Unterkonstruktion und Bekleidung",
     "Muster-Verwaltungsvorschrift Technische Baubestimmungen (Brandschutz der Fassade)",
     "Fachregeln des Fachverbands Baustoffe und Bauteile für vorgehängte hinterlüftete Fassaden (FVHF)"],
    ["Verankerungsgrund prüfen; Dübel nach Zulassung und Auszugswerten am Bauwerk",
     "Unterkonstruktion mit thermischer Trennung; Wärmebrücken gering halten",
     "Dämmung lückenlos und dicht gestoßen; Winddichtung nach Planung",
     "Hinterlüftungsquerschnitte und Zu-/Abluftöffnungen freihalten; Insektenschutz",
     "Brandsperren bzw. Brandschutzmaßnahmen nach Konzept und Zulassung",
     "Fugenbild nach Fassadenplan; Musterfläche vor Serienfertigung"],
    ["Befestigungsmittel, Fugenprofile und Einmessen",
     "Statische Nachweise für Standardbefestigung nach Systemangaben"],
    ["Auszugsversuche, Sonderstatik und Bauteilprüfungen",
     "Fensteranschlüsse, Laibungen und Attikaabdeckungen, soweit gesondert",
     "Gerüste über die Vorhaltung für das eigene Gewerk"],
    ["Bekleidung nach Fläche in der Ansicht; Öffnungen nur oberhalb der Einzelgröße der ATV abziehen",
     "Laibungen, Ecken und Abschlüsse nach Länge"],
    "Bekleidungsmaterial, Fugenbild, Dämmstoff, Gebäudeklasse und Brandschutzanforderungen angeben.",
)

_setze(
    "039", "Trockenbauarbeiten",
    ["VOB/C ATV DIN 18340 Trockenbauarbeiten",
     "DIN 18181 Gipsplatten im Hochbau – Verarbeitung",
     "DIN 18183-1 Trennwände und Vorsatzschalen aus Gipsplatten mit Metallunterkonstruktion",
     "DIN 18168-1 Gipsplatten-Deckenbekleidungen und Unterdecken",
     "DIN 4102-4 bzw. Klassifizierung nach DIN EN 13501-2 (Feuerwiderstand)",
     "DIN 4109 Schallschutz; Merkblatt Nr. 2 Bundesverband der Gipsindustrie (Q1–Q4)"],
    ["Montage erst bei geschlossener Gebäudehülle und geeignetem Raumklima",
     "Anschlüsse an Rohbau gleitend bzw. schalltechnisch entkoppelt nach System",
     "Brand- und Schallschutzwände nur als nachgewiesenes System; Kennzeichnung und Übereinstimmungserklärung",
     "Installationen und Revisionsöffnungen mit TGA abstimmen; Beplankung erst nach Freigabe",
     "Verspachtelung nach vereinbarter Qualitätsstufe",
     "Ebenheit und Lotabweichung nach DIN 18202"],
    ["Abstimmen und Anzeichnen der Wandachsen auf Grundlage vorhandener Achsen",
     "Dämmstreifen an Anschlüssen nach Systemvorgabe",
     "Verspachtelung in Qualitätsstufe Q2, soweit nichts anderes vereinbart"],
    ["Ausschnitte und Verstärkungen für Einbauten, Revisionsöffnungen",
     "Höhere Qualitätsstufen (Q3, Q4)",
     "Schließen von Öffnungen nach Installation anderer Gewerke"],
    ["Wände und Decken nach Fläche; Öffnungen bis 2,5 m² Einzelgröße werden übermessen",
     "Anschlüsse, Ecken und Kanten nach Länge; Ausschnitte nach Stück"],
    "Wandtypen mit Feuerwiderstand, Schalldämmmaß und Beplankung in einer Wandtypenliste festlegen.",
)

# ---------------------------------------------------------------------------
# Technische Gebäudeausrüstung
# ---------------------------------------------------------------------------

_TGA_DOKU = "Revisionsunterlagen mit Bestandsplänen, Prüfprotokollen, Datenblättern und Wartungsanleitungen; Einweisung des Betreibers"

_setze(
    "040", "Wärmeversorgungsanlagen – Betriebseinrichtungen",
    ["VOB/C ATV DIN 18380 Heizanlagen und zentrale Wassererwärmungsanlagen",
     "Gebäudeenergiegesetz (GEG)",
     "DIN EN 12828 Planung von Warmwasser-Heizungsanlagen",
     "VDI 2035 Vermeidung von Schäden in Warmwasser-Heizanlagen",
     "DVGW-Arbeitsblatt G 600 (TRGI) bei Gasfeuerstätten; 1. BImSchV",
     "DIN EN 13384 Abgasanlagen – Berechnung"],
    ["Aufstellung nach Herstellerangaben, Feuerungsverordnung und Abstandsregeln; Zugänglichkeit für Wartung",
     "Füll- und Ergänzungswasser nach VDI 2035 aufbereiten und protokollieren",
     "Sicherheitstechnische Ausrüstung nach DIN EN 12828 vollständig",
     "Abgasführung und Verbrennungsluft vor Inbetriebnahme mit dem Schornsteinfeger abstimmen",
     "Inbetriebnahme mit Einregulierung, Funktionsprüfung und Messprotokoll",
     _TGA_DOKU],
    ["Erstbefüllung, Entlüftung und Probebetrieb",
     "Abstimmung der Schnittstellen zu Elektro und Gebäudeautomation"],
    ["Fundamente, Schallentkopplung und Einbringhilfen über das übliche Maß",
     "Abnahme durch Sachverständige und Gebühren",
     "Wartung während der Gewährleistung"],
    ["Geräte und Anlagenteile nach Stück einschließlich Zubehör laut LV"],
    "Heizlast nach DIN EN 12831, Wärmeerzeuger und Systemtemperaturen angeben.",
)

_setze(
    "041", "Wärmeversorgungsanlagen – Leitungen, Armaturen, Heizflächen",
    ["VOB/C ATV DIN 18380 Heizanlagen und zentrale Wassererwärmungsanlagen",
     "DIN EN 12828 Planung von Warmwasser-Heizungsanlagen",
     "DIN EN 442 Radiatoren und Konvektoren",
     "DIN EN 1264 Flächenheizung und -kühlung",
     "GEG Anlage 8 (Dämmung von Rohrleitungen)",
     "VDI 2035 Heizungswasser"],
    ["Leitungsführung mit Gefälle zu Entlüftungs- und Entleerungsstellen; Längenausdehnung berücksichtigen",
     "Befestigungen schallentkoppelt; Brandabschottungen nach Zulassung",
     "Druckprobe vor Verdecken und Dämmen mit Protokoll",
     "Spülen der Anlage vor Inbetriebnahme",
     "Hydraulischer Abgleich mit dokumentierten Einstellwerten",
     _TGA_DOKU],
    ["Befestigungsmaterial im üblichen Umfang",
     "Druckprobe, Spülen und Entlüften",
     "Anzeichnen von Schlitzen und Durchbrüchen"],
    ["Herstellen von Schlitzen und Durchbrüchen",
     "Dämmung der Leitungen, soweit gesondert (siehe LB 047)",
     "Demontage und Wiedermontage von Heizkörpern für andere Gewerke"],
    ["Rohrleitungen nach Länge in der Achse; Formstücke und Armaturen übermessen, Armaturen nach Stück",
     "Heizflächen nach Stück; Flächenheizung nach Fläche"],
    "Systemtemperaturen, Rohrwerkstoffe und Heizflächen nach Raumbuch angeben.",
)

_setze(
    "042", "Gas- und Wasseranlagen – Leitungen, Armaturen",
    ["VOB/C ATV DIN 18381 Gas-, Wasser- und Entwässerungsanlagen innerhalb von Gebäuden",
     "DIN EN 806 und DIN 1988 Technische Regeln für Trinkwasser-Installationen",
     "Trinkwasserverordnung (TrinkwV)",
     "DVGW-Arbeitsblatt W 551 Legionellenwachstum und VDI/DVGW 6023 Hygiene",
     "DVGW-Arbeitsblatt G 600 (TRGI) für Gasinstallationen"],
    ["Nur Werkstoffe und Bauteile mit Eignung für Trinkwasser; Mischinstallationen nur zulässig kombinieren",
     "Hygiene: Rohrenden verschließen, Stagnation vermeiden, Inbetriebnahme kurz vor Nutzung",
     "Warmwasser- und Zirkulationstemperaturen nach Planung; Kaltwasser vor Erwärmung schützen",
     "Druckprüfung und Spülen nach Norm bzw. ZVSHK-Merkblatt mit Protokoll",
     "Gasleitungen mit Belastungs- und Dichtheitsprüfung nach TRGI",
     _TGA_DOKU],
    ["Druckprüfung und Spülen", "Befestigungsmaterial im üblichen Umfang"],
    ["Trinkwasseruntersuchungen durch akkreditierte Labore", "Schlitze, Durchbrüche und Dämmung, soweit gesondert", "Provisorische Bauwasserversorgung"],
    ["Rohrleitungen nach Länge in der Achse; Formstücke übermessen; Armaturen nach Stück"],
    "Leitungsführung, Rohrwerkstoff und Hygienekonzept (z. B. Spülpläne) angeben.",
)

_setze(
    "044", "Abwasseranlagen – Leitungen, Abläufe",
    ["VOB/C ATV DIN 18381 Gas-, Wasser- und Entwässerungsanlagen innerhalb von Gebäuden",
     "DIN EN 12056 Schwerkraftentwässerungsanlagen innerhalb von Gebäuden",
     "DIN 1986-100 Entwässerungsanlagen für Gebäude und Grundstücke",
     "DIN EN 1610 Einbau und Prüfung von Abwasserleitungen (Grundleitungen)",
     "DIN 4109 Schallschutz im Hochbau"],
    ["Gefälle, Belüftung und Reinigungsöffnungen nach Bemessung",
     "Rückstauschutz unterhalb der Rückstauebene nach Planung",
     "Schallschutz durch geeignete Rohre und entkoppelte Befestigung",
     "Brandabschottungen nach Zulassung; Kennzeichnung",
     "Dichtheitsprüfung von Grund- und Sammelleitungen mit Protokoll",
     _TGA_DOKU],
    ["Verschließen offener Rohrenden", "Befestigungsmaterial im üblichen Umfang", "Dichtheitsprüfung"],
    ["Kamerabefahrung", "Schlitze und Durchbrüche", "Anschluss an Bestandsleitungen mit Sanierung"],
    ["Rohrleitungen nach Länge in der Achse; Formstücke übermessen; Abläufe nach Stück"],
    "Entwässerungsverfahren, Rückstauebene und Schallschutzanforderungen angeben.",
)

_setze(
    "045", "Gas-, Wasser- und Entwässerungsanlagen – Ausstattung, Elemente",
    ["VOB/C ATV DIN 18381 Gas-, Wasser- und Entwässerungsanlagen innerhalb von Gebäuden",
     "DIN 18040-1/-2 Barrierefreies Bauen",
     "DIN EN 997 WC-Becken und DIN EN 14688 Waschbecken",
     "DIN EN 817 Mechanisch einstellbare Mischer",
     "DIN 4109 Schallschutz im Hochbau"],
    ["Montageelemente nach Herstellerangabe und mit schalltechnischer Entkoppelung",
     "Montagehöhen und Bewegungsflächen nach Planung, bei Barrierefreiheit nach DIN 18040",
     "Objekte erst nach Abschluss der Fliesen- und Malerarbeiten montieren",
     "Silikonfugen als Wartungsfugen; Hinweis an AG",
     "Funktionsprüfung aller Objekte; Armaturen einregulieren",
     "Objekte bis zur Abnahme schützen"],
    ["Befestigungs- und Dichtmaterial", "Funktionsprüfung und Erstreinigung"],
    ["Zusatzausstattung wie Spiegel, Halte- und Stützgriffe, soweit gesondert", "Demontage vorhandener Objekte"],
    ["Objekte und Elemente nach Stück einschließlich Zubehör laut LV"],
    "Objektliste mit Fabrikat, Montagehöhen und Barrierefreiheit je Raum beifügen.",
)

_setze(
    "046", "Gas-, Wasser- und Entwässerungsanlagen – Betriebseinrichtungen",
    ["VOB/C ATV DIN 18381 Gas-, Wasser- und Entwässerungsanlagen innerhalb von Gebäuden",
     "DIN EN 12050 Abwasserhebeanlagen",
     "DIN EN 13564 Rückstauverschlüsse",
     "DIN 1988-500 Druckerhöhungsanlagen",
     "DIN EN 806-2 und DVGW W 551 Trinkwassererwärmung und Legionellenschutz"],
    ["Aufstellung zugänglich für Bedienung und Wartung; Schall- und Schwingungsentkopplung",
     "Hebeanlagen mit Rückstauschleife über die Rückstauebene",
     "Druckerhöhung und Trinkwassererwärmung nach Bemessung",
     "Elektroanschluss und Störmeldung mit Elektro bzw. GA abstimmen",
     "Inbetriebnahme mit Funktionsprüfung und Protokoll",
     _TGA_DOKU],
    ["Erstbefüllung und Probebetrieb", "Einstellen der Schalt- und Regelwerte"],
    ["Wartungsverträge", "Fundamente und Einbringöffnungen über das übliche Maß"],
    ["Anlagen nach Stück einschließlich Zubehör laut LV"],
    "Förderhöhen, Volumenströme und Aufstellräume angeben.",
)

_setze(
    "047", "Dämm- und Brandschutzarbeiten an technischen Anlagen",
    ["VOB/C ATV DIN 18421 Dämm- und Brandschutzarbeiten an technischen Anlagen",
     "DIN 4140 Dämmarbeiten an betriebs- und haustechnischen Anlagen",
     "VDI 2055 Wärme- und Kälteschutz",
     "GEG Anlage 8 (Mindestdämmung von Rohrleitungen)",
     "Muster-Leitungsanlagen-Richtlinie (MLAR)",
     "Zulassungen bzw. Bauartgenehmigungen der Abschottungen"],
    ["Dämmung erst nach erfolgreicher Druckprobe und Freigabe",
     "Kältedämmung diffusionsdicht und durchgehend; Stöße verkleben",
     "Abschottungen nur nach Zulassung; Abstände zwischen Abschottungen einhalten",
     "Kennzeichnungsschilder und Übereinstimmungserklärungen je Abschottung",
     "Ummantelungen an Formteilen sauber anpassen",
     "Fotodokumentation der Brandschutzmaßnahmen vor Verschließen"],
    ["Befestigungs- und Klebematerial", "Kennzeichnung"],
    ["Ummantelungen aus Blech, soweit gesondert", "Abschottungen in Bestandsbauteilen mit Sanierung", "Rückbau vorhandener Dämmung"],
    ["Dämmung von Rohrleitungen nach Länge in der Achse; Formstücke und Armaturen nach den Regeln der ATV (z. B. nach Stück)",
     "Abschottungen nach Stück je Größe"],
    "Dämmdicken, Brandschutzanforderungen und Abschottungssysteme angeben.",
)

_setze(
    "049", "Feuerlöschanlagen, Feuerlöschgeräte",
    ["VOB/C ATV DIN 18381 Gas-, Wasser- und Entwässerungsanlagen innerhalb von Gebäuden",
     "DIN 14462 Löschwassereinrichtungen",
     "DIN 1988-600 Trinkwasser-Installationen in Verbindung mit Feuerlösch- und Brandschutzanlagen",
     "DIN EN 12845 bzw. VdS CEA 4001 Sprinkleranlagen",
     "DIN EN 671 Wandhydranten und DIN EN 3 tragbare Feuerlöscher",
     "ASR A2.2 Maßnahmen gegen Brände"],
    ["Bemessung und Ausführung nach Brandschutzkonzept und Auflagen der Feuerwehr",
     "Trennung zum Trinkwasser nach DIN 1988-600",
     "Druck- und Funktionsprüfung mit Protokoll",
     "Prüfung durch Sachverständige vor Inbetriebnahme, soweit gefordert",
     "Kennzeichnung nach ASR A1.3 bzw. DIN EN ISO 7010",
     _TGA_DOKU],
    ["Druckprüfung und Spülen", "Kennzeichnung"],
    ["Sachverständigenprüfung und Gebühren", "Wartung und Instandhaltung"],
    ["Leitungen nach Länge in der Achse; Geräte und Hydranten nach Stück"],
    "Löschwasserbedarf, Anlagenart und Schutzbereiche angeben.",
)


_setze(
    "053", "Niederspannungsanlagen – Kabel/Leitungen, Verlegesysteme, Installationsgeräte",
    ["VOB/C ATV DIN 18382 Nieder- und Mittelspannungsanlagen mit Nennspannungen bis 36 kV",
     "DIN VDE 0100 Errichten von Niederspannungsanlagen",
     "DIN VDE 0100-600 Erstprüfungen",
     "DIN 18015 Elektrische Anlagen in Wohngebäuden",
     "TAB des Netzbetreibers",
     "Muster-Leitungsanlagen-Richtlinie (MLAR)"],
    ["Verlegung nach Planung; Installationszonen nach DIN 18015-3 beachten",
     "Funktionserhalt und Brandschutz von Leitungsanlagen nach MLAR",
     "Kennzeichnung von Leitungen und Verteilungen",
     "Erstprüfung mit Messprotokollen vor Inbetriebnahme",
     "Abstimmung mit Trockenbau, Haustechnik und Gebäudeautomation",
     _TGA_DOKU],
    ["Befestigungsmaterial", "Erstprüfung und Messprotokolle"],
    ["Schlitze und Durchbrüche", "Brandschutzabschottungen, soweit gesondert", "Provisorische Baustromanlagen"],
    ["Kabel und Leitungen nach Länge; Verlegesysteme nach Länge; Geräte nach Stück"],
    "Netzform, Anschlussleistung und Raumbuch mit Ausstattung je Raum angeben.",
)

_setze(
    "055", "Ersatzstromversorgungsanlagen",
    ["VOB/C ATV DIN 18382 Nieder- und Mittelspannungsanlagen mit Nennspannungen bis 36 kV",
     "DIN VDE 0100-551 Niederspannungs-Stromerzeugungseinrichtungen",
     "DIN VDE 0100-560 Einrichtungen für Sicherheitszwecke",
     "DIN 6280-13 Stromerzeugungsaggregate für Sicherheitszwecke",
     "DIN EN 62040 Unterbrechungsfreie Stromversorgungssysteme",
     "AwSV für Kraftstoffbehälter"],
    ["Aufstellung nach Herstellerangabe; Abgas, Zu- und Abluft sowie Schallschutz",
     "Kraftstofflagerung nach Wasserrecht; Auffangwannen",
     "Netzumschaltung mit Netzbetreiber und Verteilung abstimmen",
     "Probebetrieb unter Last mit Protokoll",
     "Prüfung durch Sachverständige, soweit gefordert",
     _TGA_DOKU],
    ["Erstbefüllung mit Betriebsstoffen", "Probebetrieb"],
    ["Sachverständigenprüfung", "Wartungsverträge", "Kraftstoff für Probebetriebe über das übliche Maß"],
    ["Anlagen nach Stück einschließlich Zubehör laut LV"],
    "Leistung, Überbrückungszeit und Verbraucher angeben.",
)





_setze(
    "063", "Gefahrenmeldeanlagen",
    ["VOB/C ATV DIN 18382 Nieder- und Mittelspannungsanlagen mit Nennspannungen bis 36 kV",
     "DIN 14675-1 Brandmeldeanlagen – Aufbau und Betrieb",
     "DIN VDE 0833 Gefahrenmeldeanlagen für Brand, Einbruch und Überfall",
     "DIN EN 54 Brandmeldeanlagen",
     "DIN EN 50131 Einbruchmeldeanlagen",
     "Technische Anschlussbedingungen der Feuerwehr"],
    ["Ausführung nur durch nach DIN 14675 zertifizierte Fachfirmen",
     "Melderanordnung nach Konzept und Norm",
     "Brandfallsteuerungen mit anderen Gewerken abstimmen",
     "Funktionsprüfung und Abnahme mit Feuerwehr bzw. Sachverständigem",
     "Feuerwehrlaufkarten und Dokumentation",
     _TGA_DOKU],
    ["Befestigungsmaterial", "Programmierung im üblichen Umfang", "Funktionsprüfung"],
    ["Sachverständigenprüfung", "Aufschaltung und Gebühren", "Wartungsverträge"],
    ["Geräte und Melder nach Stück; Leitungen nach Länge"],
    "Schutzumfang, Alarmierung und Brandfallsteuerungen angeben.",
)



_setze(
    "070", "Gebäudeautomation",
    ["VOB/C ATV DIN 18386 Gebäudeautomation",
     "VDI 3814 Gebäudeautomation (Planung, Ausführung, Datenpunktlisten)",
     "DIN EN ISO 16484 Systeme der Gebäudeautomation (u. a. BACnet in Teil 5)",
     "DIN EN ISO 52120-1 Einfluss der Gebäudeautomation auf die Energieeffizienz",
     "VDI 3813 Raumautomation",
     "GEG (Anforderungen an Gebäudeautomation in Nichtwohngebäuden)"],
    ["Funktionen nach freigegebener Funktionsbeschreibung und Datenpunktliste; Adressierung nach Kennzeichnungsschlüssel des AG",
     "Schnittstellen und Protokolle zu Heizung, Lüftung, Kälte, Elektro und Sonnenschutz frühzeitig abstimmen",
     "Schaltschränke mit Stromlaufplänen, Reserve und Kennzeichnung",
     "Punkt-zu-Punkt-Test, Funktionsprüfung je Anlage und Übergabe der Datenpunkte an die Managementebene",
     "Mitwirkung an integralen Tests der Brandfallsteuerungen",
     "Software, Parametrierung und Zugangsdaten vollständig übergeben; IT-Sicherheit nach Vorgabe des Betreibers"],
    ["Programmierung und Parametrierung der beschriebenen Funktionen",
     "Inbetriebnahme, Punkt-zu-Punkt-Test und Einweisung",
     "Dokumentation nach VDI 3814"],
    ["Optimierung im Betrieb (Monitoring) über die Inbetriebnahme hinaus",
     "Lizenzen, Fernzugänge und Wartungsverträge, soweit gesondert",
     "Anbindung von Fremdanlagen, deren Schnittstellen nicht beschrieben sind"],
    ["Hardware nach Stück; Datenpunkte nach Stück je Art; Software und Bedienebene pauschal oder je Lizenz laut LV",
     "Leitungen nach Länge, soweit nicht in LB 053 enthalten"],
    "Funktionsbeschreibung, Datenpunktliste, GA-Effizienzklasse und Kennzeichnungsschlüssel beifügen.",
)

_setze(
    "075", "Raumlufttechnische Anlagen",
    ["VOB/C ATV DIN 18379 Raumlufttechnische Anlagen",
     "DIN EN 16798-3 Lüftung von Nichtwohngebäuden",
     "DIN 1946-6 Lüftung von Wohnungen",
     "VDI 6022 Blatt 1 Hygieneanforderungen an RLT-Anlagen",
     "DIN EN 12599 Prüf- und Messverfahren für die Übergabe",
     "Muster-Lüftungsanlagen-Richtlinie (M-LüAR); DIN EN 1507 und DIN EN 12237 Dichtheit von Luftleitungen"],
    ["Luftleitungen bis zur Montage verschlossen lagern und während der Bauzeit offene Enden abdecken (Hygiene)",
     "Brandschutzklappen und Abschottungen nur nach Zulassung; Zugänglichkeit für Wartung",
     "Revisionsöffnungen nach VDI 6022 und Planung",
     "Schall- und Schwingungsentkopplung an Geräten und Leitungen",
     "Einregulierung der Volumenströme mit Messprotokoll; Funktions- und Leistungsprüfung nach DIN EN 12599",
     "Hygieneerstinspektion nach VDI 6022 vor Übergabe; Revisionsunterlagen mit Einweisung"],
    ["Verschließen und Reinigen der Luftleitungen im eigenen Arbeitsablauf",
     "Erstfilterung während des Probebetriebs",
     "Einregulierung und Messprotokolle"],
    ["Dichtheitsprüfungen über den vereinbarten Umfang, Reinigung nach Verschmutzung durch Dritte",
     "Ersatzfilter für Baubetrieb, Wartungsverträge",
     "Brandschutzklappen-Ansteuerung, soweit nicht beschrieben"],
    ["Luftleitungen nach Fläche der Abwicklung bzw. runde Leitungen nach Länge laut LV; Formstücke nach den Regeln der ATV",
     "Geräte, Klappen und Luftdurchlässe nach Stück"],
    "Luftmengen, Hygieneanforderungen, Dichtheitsklasse und Brandschutzkonzept angeben.",
)

_setze(
    "078", "Kälteanlagen für raumlufttechnische Anlagen",
    ["VOB/C ATV DIN 18379 Raumlufttechnische Anlagen",
     "DIN EN 378 Kälteanlagen und Wärmepumpen – Sicherheit und Umwelt",
     "F-Gas-Verordnung (EU) 2024/573 und Chemikalien-Klimaschutzverordnung",
     "DIN EN 14511 Leistungsbestimmung von Klimageräten und Wärmepumpen",
     "Druckgeräterichtlinie bzw. Betriebssicherheitsverordnung"],
    ["Kältemittel und Füllmenge nach Planung und Sicherheitsanforderungen der Aufstellräume",
     "Ausführung nur durch zertifiziertes Personal und zertifizierte Betriebe",
     "Festigkeits- und Dichtheitsprüfung sowie Evakuieren vor Befüllung mit Protokoll",
     "Kondensatableitung und Schallschutz der Außengeräte nach Planung",
     "Inbetriebnahme mit Leistungsmessung; Logbuch nach F-Gas-Vorgaben anlegen",
     _TGA_DOKU],
    ["Erstbefüllung mit Kältemittel", "Dichtheitsprüfung und Probebetrieb"],
    ["Wartungsverträge und wiederkehrende Dichtheitskontrollen", "Prüfung durch zugelassene Überwachungsstellen", "Fundamente und Schallschutzeinhausungen"],
    ["Anlagen nach Stück; Kältemittelleitungen nach Länge in der Achse"],
    "Kälteleistung, Kältemittel und Aufstellorte angeben.",
)

_setze(
    "050", "Blitzschutz- und Erdungsanlagen, Überspannungsschutz",
    ["VOB/C ATV DIN 18384 Blitzschutzanlagen",
     "DIN EN 62305-1 bis -4 (VDE 0185-305) Blitzschutz",
     "DIN 18014 Fundamenterder – Planung, Ausführung und Dokumentation",
     "DIN VDE 0100-540 Erdungsanlagen und Schutzleiter",
     "DIN VDE 0100-443 und DIN VDE 0100-534 Überspannungsschutz"],
    ["Blitzschutzklasse nach Risikobewertung bzw. Vorgabe der Planung; Fangeinrichtungen und Ableitungen danach anordnen",
     "Fundament- bzw. Ringerder vor dem Betonieren einbauen, Durchgangsmessung durchführen und mit Fotos dokumentieren",
     "Anschlussfahnen an Potentialausgleichsschiene und Messstellen dauerhaft korrosionsgeschützt herausführen",
     "Trennungsabstände zu leitfähigen Installationen einhalten oder Näherungen fachgerecht verbinden",
     "Abdichtungen und Dachhaut beim Befestigen nicht durchdringen; Halter mit Dachdecker abstimmen",
     "Abschlussprüfung mit Erdungsmessung und Prüfbericht; Bestandsplan mit Erdern und Messstellen"],
    ["Befestigungsmaterial und Verbindungsklemmen",
     "Durchgangs- und Erdungsmessungen sowie Prüfbericht für die eigene Anlage",
     "Kennzeichnung der Trennstellen"],
    ["Risikobewertung, Blitzschutzplanung und Prüfung durch Sachverständige",
     "Erdungsmessungen für Anlagen Dritter, Tiefenerder bei schlechtem Erdwiderstand",
     "Überspannungsschutzgeräte, soweit nicht ausdrücklich beschrieben"],
    ["Leitungen und Erder nach Länge; Fangstangen, Klemmen, Messstellen und Schutzgeräte nach Stück"],
    "Blitzschutzklasse und Schnittstellen zu Rohbau (Fundamenterder) und Dach angeben.",
)

_setze(
    "058", "Leuchten und Lampen",
    ["VOB/C ATV DIN 18382 Nieder- und Mittelspannungsanlagen mit Nennspannungen bis 36 kV",
     "DIN EN 12464-1 Beleuchtung von Arbeitsstätten in Innenräumen, DIN EN 12464-2 im Freien",
     "ASR A3.4 Beleuchtung und Sichtverbindung",
     "DIN EN 60598 Leuchten",
     "DIN VDE 0100-559 Leuchten und Beleuchtungsanlagen"],
    ["Leuchtentyp, Lichtfarbe und Farbwiedergabe nach Lichtplanung; Musterleuchte vor Bestellung",
     "Deckeneinbauleuchten mit Trockenbau und Lüftung koordinieren (Raster, Einbautiefe, Abstand zu Klappen)",
     "Brandschutz beachten: Einbauleuchten in Decken mit Feuerwiderstand nur mit geeigneter Abdeckung bzw. Zulassung",
     "Befestigung tragfähig; Leuchten über 5 kg bzw. Pendelleuchten mit eigener Abhängung",
     "Adressierung und Gruppierung für Lichtsteuerung nach Planung; Funktionstest je Raum",
     "Leuchten bis zur Abnahme staubfrei halten; Leuchtmittel- und Treiberdaten übergeben"],
    ["Befestigungsmaterial und Anschluss an vorhandene Auslässe",
     "Funktionsprüfung und Reinigung bei Übergabe"],
    ["Lichtberechnungen und Messungen der Beleuchtungsstärke",
     "Programmierung von Lichtmanagementsystemen über die Grundfunktion",
     "Zusätzliche Abhängungen, Tragschienen und Montage in großen Höhen"],
    ["Leuchten nach Stück einschließlich Leuchtmittel und Betriebsgerät; Lichtbänder nach Länge laut LV"],
    "Leuchtenliste mit Typ, Lichtfarbe, Schutzart und Steuerung je Raum beifügen.",
)

_setze(
    "059", "Sicherheitsbeleuchtungsanlagen",
    ["VOB/C ATV DIN 18382 Nieder- und Mittelspannungsanlagen mit Nennspannungen bis 36 kV",
     "DIN EN 1838 Angewandte Lichttechnik – Notbeleuchtung",
     "DIN VDE V 0108-100-1 Sicherheitsbeleuchtungsanlagen",
     "DIN EN 50171 Zentrale Stromversorgungssysteme",
     "DIN EN 60598-2-22 Leuchten für Notbeleuchtung",
     "DIN EN ISO 7010 und ASR A1.3 Sicherheitskennzeichnung"],
    ["Anordnung von Rettungszeichen- und Sicherheitsleuchten nach Brandschutzkonzept und Flucht- und Rettungsplan",
     "Stromversorgung (Einzelbatterie oder zentrale Anlage) mit geforderter Nennbetriebsdauer",
     "Leitungen zu Unterverteilungen mit Funktionserhalt nach MLAR; Stromkreise brandabschnittsweise",
     "Überwachungs- und Prüfeinrichtung einrichten; Prüfbuch anlegen",
     "Erstprüfung mit Messung der Beleuchtungsstärke an Rettungswegen und Protokoll",
     "Prüfung durch Prüfsachverständige vor Inbetriebnahme, soweit bauordnungsrechtlich gefordert"],
    ["Befestigungsmaterial und Kennzeichnung der Stromkreise",
     "Funktionsprüfung und Erstbefüllung des Prüfbuchs"],
    ["Sachverständigenprüfung und Gebühren",
     "Wartungsverträge und wiederkehrende Prüfungen",
     "Anpassen an geänderte Rettungswegplanung nach Auftragserteilung"],
    ["Leuchten, Geräte und Batterieanlagen nach Stück; Leitungen nach Länge"],
    "Systemart, Nennbetriebsdauer und Rettungswegplan angeben.",
)

_setze(
    "061", "Kommunikationsnetze",
    ["VOB/C ATV DIN 18382 Nieder- und Mittelspannungsanlagen mit Nennspannungen bis 36 kV",
     "DIN EN 50173 Anwendungsneutrale Kommunikationskabelanlagen",
     "DIN EN 50174-1 bis -3 Installation von Kommunikationsverkabelung",
     "DIN EN 50310 Potentialausgleich und Erdung für Gebäude mit Einrichtungen der Informationstechnik",
     "DIN EN 50346 Prüfung installierter Verkabelung"],
    ["Übertragungsklasse (Kupfer) bzw. Faserkategorie (LWL) durchgängig mit Komponenten eines Systems",
     "Biegeradien, Zugkräfte und Trennabstände zu Energieleitungen nach DIN EN 50174-2 einhalten",
     "Brandabschottungen bei Durchführungen; Kabelwege mit Belegungsreserve",
     "Einheitliche Kennzeichnung von Dosen, Patchfeldern und Kabeln nach Beschriftungskonzept des AG",
     "Abnahmemessung aller Strecken (Permanent Link) mit Messprotokoll als Datei",
     "Bestandsdokumentation mit Belegungsplänen und Schrankansichten"],
    ["Befestigungsmaterial, Beschriftung und Abnahmemessung",
     "Potentialausgleich der Verteilerschränke"],
    ["Aktive Netzwerkkomponenten und deren Konfiguration",
     "Verteilerschränke und Patchkabel, soweit gesondert",
     "Nachmessungen wegen Beschädigungen durch Dritte"],
    ["Kabel nach Länge; Anschlussdosen, Patchfelder und Spleiße nach Stück"],
    "Übertragungsklasse, Lage der Verteiler und Beschriftungskonzept angeben.",
)

_setze(
    "062", "Kommunikationsanlagen, Türsprech- und Rufanlagen",
    ["VOB/C ATV DIN 18382 Nieder- und Mittelspannungsanlagen mit Nennspannungen bis 36 kV",
     "DIN VDE 0834-1/-2 Rufanlagen in Krankenhäusern, Pflegeheimen und ähnlichen Einrichtungen",
     "DIN EN 62820 Gebäudesprechanlagen",
     "DIN EN 60728 Kabelnetze für Fernseh- und Tonsignale",
     "DIN 18040 Barrierefreies Bauen (Zwei-Sinne-Prinzip)"],
    ["Anlagenaufbau und Funktionen nach Funktionsbeschreibung; Komponenten eines Systems",
     "Montagehöhen von Sprechstellen und Bedienelementen nach Planung, bei Barrierefreiheit optisch und akustisch",
     "Schnittstellen zu Zutrittskontrolle, Türöffnern, Netzwerk und Telefonanlage abstimmen",
     "Rufanlagen nach DIN VDE 0834 mit Überwachung und Störmeldung; Zimmerzuordnung nach Raumbuch",
     "Antennen- und Verteilanlagen mit Pegelmessung an allen Anschlussdosen",
     "Funktionsprüfung je Teilnehmer, Einweisung und Dokumentation"],
    ["Befestigungsmaterial und Grundprogrammierung",
     "Funktionsprüfung und Messprotokolle"],
    ["Erweiterte Programmierung, Software-Lizenzen und Anbindung an Fremdsysteme",
     "Wartungsverträge"],
    ["Zentralen, Sprech- und Rufstellen nach Stück; Leitungen nach Länge"],
    "Funktionsumfang, Teilnehmerzahl und Schnittstellen angeben.",
)

_setze(
    "064", "Zutrittskontroll- und Zeiterfassungsanlagen",
    ["VOB/C ATV DIN 18382 Nieder- und Mittelspannungsanlagen mit Nennspannungen bis 36 kV",
     "DIN EN 60839-11-1 Zutrittskontrollanlagen",
     "VdS 2358 Richtlinien für Zutrittskontrollanlagen",
     "DIN EN 13637 Elektrisch gesteuerte Fluchttüranlagen",
     "DSGVO und BDSG für die Verarbeitung personenbezogener Daten"],
    ["Ausführung nach Tür- und Berechtigungskonzept; Leser, Zentralen und Türkomponenten aufeinander abgestimmt",
     "Fluchtwegfunktionen dürfen nicht beeinträchtigt werden; Fluchttüren nur mit zugelassener Steuerung",
     "Brandfallsteuerung und Freischaltung mit Brandmeldeanlage abstimmen",
     "Daten verschlüsselt übertragen; Zugangsdaten und Rechte nach Vorgabe des Betreibers",
     "Datenschutz und Mitbestimmung (Zeiterfassung) vor Inbetriebnahme durch den AG geklärt",
     "Funktionsprüfung je Tür, Einweisung und Dokumentation"],
    ["Befestigungsmaterial und Grundprogrammierung",
     "Funktionsprüfung"],
    ["Anlage von Berechtigungen und Personaldaten",
     "Software-Lizenzen, Ausweismedien und Wartungsverträge",
     "Schnittstellen zu Personal- oder Lohnsoftware"],
    ["Leser, Zentralen und Terminals nach Stück; Leitungen nach Länge; Lizenzen nach Stück"],
    "Türliste mit Zutrittsfunktionen, Fluchtwegfunktion und Ausweistechnik beifügen.",
)

_setze(
    "069", "Aufzüge",
    ["VOB/C ATV DIN 18385 Förderanlagen, Aufzugsanlagen, Fahrtreppen und Fahrsteige",
     "DIN EN 81-20 und DIN EN 81-50 Sicherheitsregeln für Personen- und Lastenaufzüge",
     "DIN EN 81-70 Zugänglichkeit für Personen einschließlich Personen mit Behinderungen",
     "DIN EN 81-72 Feuerwehraufzüge und DIN EN 81-73 Verhalten im Brandfall",
     "Aufzugsrichtlinie 2014/33/EU und Betriebssicherheitsverordnung (BetrSichV)"],
    ["Schachtmaße, Schachtgrube, Schachtkopf und Lotabweichung vor Fertigung prüfen; Abweichungen melden",
     "Anforderungen an Rohbau (Ankerschienen, Montagehaken, Türöffnungen) rechtzeitig übergeben",
     "Zwei-Wege-Notrufsystem mit ständig besetzter Stelle",
     "Brandfallsteuerung und Schnittstellen zu BMA und Gebäudeautomation abstimmen",
     "Prüfung vor Inbetriebnahme durch eine zugelassene Überwachungsstelle",
     "Konformitätserklärung, Prüfbescheinigung, Betriebsanleitung und Notbefreiungsanleitung übergeben"],
    ["Montagegerüst im Schacht für die eigene Montage",
     "Einweisung des Betreibers und Befreiungsunterweisung"],
    ["Wartung und Notrufaufschaltung nach Übergabe",
     "Bauzeitliche Nutzung durch andere Gewerke",
     "Prüfgebühren der Überwachungsstelle, soweit gesondert"],
    ["Anlagen nach Stück einschließlich Zubehör laut LV; Zusatzausstattungen nach Stück"],
    "Nennlast, Förderhöhe, Haltestellen, Kabinenmaße und Brandfallanforderungen angeben.",
)

# ---------------------------------------------------------------------------
# Außenanlagen, Bestand und Allgemeines
# ---------------------------------------------------------------------------

_setze(
    "080", "Straßen, Wege, Plätze",
    ["VOB/C ATV DIN 18315 Oberbauschichten ohne Bindemittel und DIN 18318 Pflasterdecken, Plattenbeläge, Einfassungen",
     "ZTV E-StB 17 Erdarbeiten im Straßenbau",
     "ZTV SoB-StB 20 Schichten ohne Bindemittel",
     "ZTV Pflaster-StB 20 Pflasterdecken, Plattenbeläge und Einfassungen",
     "RStO 12 Standardisierung des Oberbaus",
     "DIN 18134 Plattendruckversuch; DIN 18040-3 Barrierefreiheit im Verkehrsraum"],
    ["Planum und Tragschichten mit geforderten Verformungsmoduln; Nachweis mit Plattendruckversuch",
     "Gefälle und Höhen nach Planung; Wasserabfluss sicherstellen",
     "Bettung und Fugenmaterial nach Regelwerk; Pflaster nicht auf zu hoher Bettung",
     "Einfassungen auf Fundament mit Rückenstütze",
     "Ebenheit mit Messlatte prüfen; Fugen vollständig füllen",
     "Bestandsplan mit Höhen übergeben"],
    ["Eigenüberwachung der Verdichtung", "Anarbeiten an Einbauten mit geraden Schnitten"],
    ["Prüfungen durch Dritte", "Passsteine und Schnitte an Rundungen", "Entsorgung von Altbelägen"],
    ["Flächen nach Fläche; Aussparungen nur oberhalb der Einzelgröße der ATV abziehen",
     "Einfassungen nach Länge; Einbauten nach Stück"],
    "Belastungsklasse nach RStO, Belagart und Entwässerung angeben.",
)

_setze(
    "081", "Betonerhaltungsarbeiten",
    ["VOB/C ATV DIN 18349 Betonerhaltungsarbeiten",
     "Technische Regel Instandhaltung von Betonbauwerken (TR Instandhaltung, DIBt)",
     "DIN EN 1504 Produkte und Systeme für Schutz und Instandsetzung von Betontragwerken",
     "DAfStb-Richtlinie Schutz und Instandsetzung von Betonbauteilen (soweit vereinbart)",
     "ZTV-ING Teil 3 Massivbau (bei Ingenieurbauwerken)"],
    ["Instandsetzung nach Instandhaltungsplan des sachkundigen Planers",
     "Ausführung nur durch Betriebe mit Nachweis der Qualifikation (z. B. SIVV-Schein der Bauleitung)",
     "Untergrundvorbereitung bis zum tragfähigen Beton; Bewehrung freilegen und entrosten nach Vorgabe",
     "Haftzugfestigkeit, Carbonatisierungstiefe bzw. Chloridgehalt nach Prüfplan prüfen",
     "Witterungsbedingungen und Taupunktabstand bei Beschichtungen beachten",
     "Ausführungsprotokolle mit Klimadaten und Materialverbrauch führen"],
    ["Eigenüberwachung nach Prüfplan", "Abdecken angrenzender Bauteile"],
    ["Zusätzliche Untersuchungen durch Dritte", "Einhausungen und Staubabsaugung", "Mehrmengen bei unvorhersehbaren Schäden"],
    ["Flächen nach Fläche; Fehlstellen nach Fläche und Tiefe; Bewehrungsergänzungen nach Gewicht oder Länge"],
    "Instandhaltungsplan mit Schadenskartierung und Prüfplan beifügen.",
)

_setze(
    "082", "Bekämpfender Holzschutz",
    ["VOB/C ATV DIN 18363 Maler- und Lackierarbeiten (Holzschutzarbeiten)",
     "DIN 68800-4 Holzschutz – Bekämpfungs- und Sanierungsmaßnahmen gegen holzzerstörende Pilze und Insekten",
     "DIN 68800-1 Holzschutz – Allgemeines",
     "WTA-Merkblätter zum Holzschutz",
     "Biozidprodukte-Verordnung (EU) 528/2012 und GefStoffV"],
    ["Bekämpfung erst nach Befund durch Sachkundige mit Bestimmung des Schädlings",
     "Ursachen (Feuchte) vorrangig beseitigen; chemische Mittel nur so viel wie nötig",
     "Heißluftverfahren mit Temperaturmessung und Protokoll",
     "Schutzmittel nur mit Zulassung und für den Anwendungsbereich",
     "Arbeitsschutz und Lüftung nach Sicherheitsdatenblatt",
     "Kennzeichnung behandelter Bauteile und Bericht an den AG"],
    ["Absperren des Arbeitsbereichs", "Dokumentation der Maßnahmen"],
    ["Rückbau befallener Bauteile und Entsorgung", "Gutachten Dritter", "Nachkontrollen über den vereinbarten Umfang"],
    ["Behandelte Flächen nach Fläche; Hölzer nach Länge; Heißluftverfahren nach Raummaß oder pauschal laut LV"],
    "Befund und Sanierungskonzept beifügen: [Gutachten].",
)

_setze(
    "083", "Sanierungsarbeiten an schadstoffhaltigen Bauteilen",
    ["VOB/C ATV DIN 18459 Abbruch- und Rückbauarbeiten",
     "Gefahrstoffverordnung (GefStoffV)",
     "TRGS 519 Asbest – Abbruch-, Sanierungs- und Instandhaltungsarbeiten",
     "TRGS 521 Abbruch-, Sanierungs- und Instandhaltungsarbeiten mit alter Mineralwolle",
     "TRGS 524 Schutzmaßnahmen bei Tätigkeiten in kontaminierten Bereichen",
     "TRGS 551 Teer und andere Pyrolyseprodukte"],
    ["Arbeiten nach Schadstoffgutachten und Arbeitsplan; Anzeige an die Behörde fristgerecht",
     "Sachkundiges Personal nach TRGS; Aufsichtführender vor Ort",
     "Schwarzbereich mit Unterdruck, Schleusen und Messprotokollen",
     "Getrennte Erfassung, Verpackung und Kennzeichnung der Abfälle",
     "Freimessung nach Sanierung durch unabhängige Stelle",
     "Entsorgungsnachweise und Abschlussbericht übergeben"],
    ["Arbeitsplan und Gefährdungsbeurteilung", "Persönliche Schutzausrüstung", "Reinigen des Arbeitsbereichs"],
    ["Freimessungen", "Entsorgung und Deponiekosten, soweit gesondert", "Zusätzliche Untersuchungen"],
    ["Flächen nach Fläche; Bauteile nach Stück oder Länge; Abfälle nach Gewicht laut Wiegeschein"],
    "Schadstoffgutachten und Mengenermittlung beifügen.",
)






_setze(
    "084", "Abbruch- und Rückbauarbeiten",
    ["VOB/C ATV DIN 18459 Abbruch- und Rückbauarbeiten",
     "DGUV Vorschrift 38 Bauarbeiten",
     "Kreislaufwirtschaftsgesetz (KrWG) und Gewerbeabfallverordnung (GewAbfV)",
     "DIN 4150-2/-3 Erschütterungen im Bauwesen (Menschen in Gebäuden, bauliche Anlagen)",
     "AVV Baulärm",
     "Bauordnungsrechtliche Abbruchgenehmigung bzw. -anzeige"],
    ["Abbruchanweisung mit Reihenfolge und Verfahren vor Beginn vorlegen; bei Teilabbruch Standsicherheit der verbleibenden Bauteile nachweisen lassen",
     "Schadstofferkundung abgeschlossen; belastete Bauteile werden vorab nach LB 083 ausgebaut",
     "Ver- und Entsorgungsleitungen vor Beginn durch die Versorger stilllegen lassen",
     "Rückbau selektiv, damit Abfälle sortenrein getrennt und verwertet werden können",
     "Staub durch Benetzen mindern; Lärm- und Erschütterungsgrenzen gegenüber Nachbarn einhalten",
     "Bauteile, die erhalten bleiben, schützen; Schnitt- und Trennflächen sauber herstellen"],
    ["Sichern der Abbruchstelle und Absperren der Gefahrenbereiche",
     "Laden, Zwischenlagern und Sortieren der Abbruchmassen auf der Baustelle",
     "Beseitigen von Staub und Schutt im Arbeitsbereich"],
    ["Beweissicherung an Nachbarbauwerken und Erschütterungsmessungen",
     "Abfangen, Unterfangen und Abstützen verbleibender Bauteile",
     "Transport und Entsorgung, soweit in LB 087 ausgeschrieben"],
    ["Nach Raummaß des umbauten Raums, nach Fläche, Länge oder Stück laut LV",
     "Abfälle nach Gewicht laut Wiegeschein, soweit Entsorgung enthalten ist"],
    "Abbruchumfang mit Plänen, Schadstoffgutachten und zu erhaltenden Bauteilen beifügen.",
)

_setze(
    "087", "Abfallentsorgung, Verwertung und Beseitigung",
    ["VOB/C ATV DIN 18299 Allgemeine Regelungen für Bauarbeiten jeder Art",
     "Kreislaufwirtschaftsgesetz (KrWG) und Gewerbeabfallverordnung (GewAbfV)",
     "Nachweisverordnung (NachwV) und Abfallverzeichnis-Verordnung (AVV)",
     "Ersatzbaustoffverordnung (ErsatzbaustoffV) und Deponieverordnung (DepV)",
     "LAGA PN 98 Richtlinie für die Probenahme"],
    ["Abfälle bereits an der Anfallstelle nach Abfallschlüsseln getrennt halten; Getrennthaltung dokumentieren",
     "Beprobung und Deklarationsanalyse nach Vorgabe des Entsorgers bzw. der Behörde",
     "Entsorgung nur über zugelassene Beförderer und Anlagen; Annahmebedingungen vorher klären",
     "Gefährliche Abfälle mit elektronischem Nachweisverfahren; Erzeugernummer des AG verwenden",
     "Wiegescheine und Übernahmescheine je Fuhre zeitnah an die Bauleitung",
     "Verwertung hat Vorrang vor Beseitigung; Ersatzbaustoffe nur mit Klassifizierung"],
    ["Bereitstellen und Wechseln der Behälter im vereinbarten Umfang",
     "Zusammenstellen der Entsorgungsdokumentation"],
    ["Analysen, Gutachten und behördliche Gebühren",
     "Zwischenlager mit Abdeckung und Sonderbehälter für gefährliche Abfälle",
     "Annahmekosten der Anlagen, soweit nicht im Einheitspreis enthalten"],
    ["Nach Gewicht laut Wiegeschein; ersatzweise nach Raummaß oder Behälter laut LV",
     "Behältergestellung nach Stück und Standzeit"],
    "Abfallarten, voraussichtliche Mengen und Analysenergebnisse aus dem Gutachten angeben.",
)

_setze(
    "090", "Baulogistik",
    ["VOB/C ATV DIN 18299 Allgemeine Regelungen für Bauarbeiten jeder Art",
     "Baustellenverordnung (BaustellV) und SiGe-Plan",
     "Straßenverkehrs-Ordnung (StVO) mit verkehrsrechtlicher Anordnung und RSA 21",
     "Betriebssicherheitsverordnung (BetrSichV) für Krane und Hebezeuge",
     "DGUV Vorschrift 52 Krane"],
    ["Logistikkonzept mit Anlieferzonen, Zeitfenstern, Lager- und Pufferflächen vor Beginn abstimmen",
     "Anlieferungen aller Gewerke über ein Buchungssystem bzw. die Logistikleitung koordinieren",
     "Zugangskontrolle mit Ausweisen und Unterweisungsnachweis; Besucherregelung",
     "Kranbelegung und Hebevorgänge planen; Kranführer und Anschläger mit Befähigung",
     "Zufahrten und öffentliche Flächen sauber halten; Reifenreinigung bei Bedarf",
     "Anlieferungen, Störungen und Belegungen täglich dokumentieren"],
    ["Abstimmung der eigenen Anlieferungen mit der Logistikleitung",
     "Entladen und Verteilen eigener Stoffe auf der Baustelle"],
    ["Logistikpersonal, Einweiser und Torposten",
     "Zusätzliche Lagerflächen, Hebezeuge und Bauaufzüge für andere Gewerke",
     "Verlängerte Vorhaltung durch Bauzeitverlängerung, die der AN nicht zu vertreten hat"],
    ["Einrichten pauschal; Betrieb und Personal nach Zeit (Stunde, Woche, Monat) laut LV"],
    "Logistikkonzept, verfügbare Flächen und Anlieferzeiten beifügen: [Plan-Nr.].",
)

_setze(
    "091", "Stundenlohnarbeiten",
    ["VOB/B § 2 Abs. 10 und § 15 Stundenlohnarbeiten",
     "Mindestlohngesetz (MiLoG) und Arbeitnehmer-Entsendegesetz (AEntG)",
     "Einschlägige Tarifverträge (z. B. Bundesrahmentarifvertrag Bau)"],
    ["Vergütet werden nur Stundenlohnarbeiten, die vor Beginn ausdrücklich als solche vereinbart bzw. angeordnet wurden",
     "Beginn der Arbeiten der Bauleitung vorher anzeigen, damit eine Kontrolle möglich ist",
     "Stundenlohnzettel je nach Vereinbarung werktäglich oder wöchentlich vorlegen: Datum, Ort, Tätigkeit, Namen, Qualifikation, Stunden, Geräte und Stoffe",
     "Der AG gibt die Zettel bescheinigt zurück; Einwendungen innerhalb von 6 Werktagen, sonst gelten sie als anerkannt",
     "Stundenlohnrechnungen alsbald nach Abschluss, längstens in Abständen von 4 Wochen einreichen",
     "Leistungen, die durch Einheitspreise erfasst sind, nicht als Stundenlohn abrechnen"],
    ["Kleingeräte und Werkzeuge, An- und Abfahrt innerhalb des Arbeitstages",
     "Aufsicht durch Vorarbeiter im üblichen Umfang"],
    ["Stoffe nach Nachweis zum vereinbarten Zuschlag",
     "Maschinen und Geräte nach Einsatzstunden",
     "Zuschläge für angeordnete Nacht-, Sonn- und Feiertagsarbeit"],
    ["Nach bescheinigten Stundenlohnzetteln mit den vereinbarten Verrechnungssätzen je Qualifikation"],
    "Stundensätze je Qualifikation (Facharbeiter, Helfer, Meister) und Zuschläge im LV abfragen.",
)

_setze(
    "098", "Witterungsschutzmaßnahmen",
    ["VOB/C ATV DIN 18299 Allgemeine Regelungen für Bauarbeiten jeder Art und die ATV des jeweiligen Gewerks",
     "VOB/B § 4 Abs. 5 (Schutz der Leistung) und § 6 Abs. 2 (Witterung als Behinderung)",
     "DIN EN 12811-1 und Aufbauanleitung des Gerüsts bei Einhausungen",
     "DIN EN 1991-1-4 mit Nationalem Anhang (Windlasten)"],
    ["Mit der für Ort und Jahreszeit üblichen Witterung ist zu rechnen; sie begründet keine Behinderung",
     "Einhausungen, Planen und Notdächer gegen Wind sichern; Lasten auf Gerüst und Bauwerk nachweisen",
     "Beheizung und Trocknung nur mit sicherer Abgasführung und Brandschutz; CO-Gefahr in geschlossenen Räumen beachten",
     "Frische Bauteile (Beton, Mörtel, Putz, Estrich) vor Frost, Regen und schnellem Austrocknen schützen",
     "Mindesttemperaturen der Hersteller einhalten; Temperaturen und Feuchte im Bautagebuch dokumentieren",
     "Schutzmaßnahmen nach Wegfall der Gefahr zurückbauen; Wasserschäden sofort melden"],
    ["Schutz der eigenen Leistung gegen Witterung, mit der normalerweise zu rechnen ist (z. B. Abdecken, Sichern gegen Tagwasser)",
     "Beseitigen von Schnee und Eis im eigenen Arbeitsbereich"],
    ["Einhausungen, Notdächer, Winterbaumaßnahmen und Beheizung auf Anordnung",
     "Bautrocknung zur Beschleunigung",
     "Schutzmaßnahmen gegen außergewöhnliche Witterung"],
    ["Einhausungen nach Fläche und Vorhaltezeit; Beheizung und Trocknung nach Betriebszeit bzw. Gerät und Tag; Energie nach Zähler"],
    "Zeiträume und Bauteile, für die Winterbau vorgesehen ist, angeben: [Angaben des Planers].",
)

_setze(
    "099", "Allgemeine Leistungen, Schutzmaßnahmen, Winterbau",
    ["VOB/C ATV DIN 18299 Allgemeine Regelungen für Bauarbeiten jeder Art",
     "VOB/B § 4 Abs. 5 Schutz der Leistung",
     "DIN 18920 Schutz von Bäumen, Pflanzenbeständen und Vegetationsflächen",
     "AVV Baulärm und Landesimmissionsschutzrecht",
     "Brandschutzordnung und Baustellenordnung des Vorhabens"],
    ["Bestand (Böden, Treppen, Türen, Aufzüge, Fassaden) vor Beginn gemeinsam dokumentieren und wirksam schützen",
     "Staubschutzwände und Schleusen bei Arbeiten in genutzten Gebäuden; Unterdruck, wo gefordert",
     "Baumschutz mit Zaun bzw. Stammschutz; Wurzelbereich freihalten",
     "Provisorische Abschlüsse von Öffnungen gegen Witterung, Einbruch und Absturz",
     "Winterbau: Frostschutz für Leitungen und Bauteile, Räumen der Verkehrswege",
     "Schutzmaßnahmen bis zum vereinbarten Zeitpunkt vorhalten, dann rückstandsfrei entfernen"],
    ["Schutz der eigenen Leistungen bis zur Abnahme",
     "Abdecken von Bauteilen gegen Verschmutzung durch die eigenen Arbeiten",
     "Sichern der eigenen Arbeitsstellen"],
    ["Schutzmaßnahmen, die anderen Gewerken oder dem Nutzer dienen",
     "Besondere Schutzmaßnahmen auf Verlangen des AG über das übliche Maß",
     "Vorhalten über die vereinbarte Dauer hinaus"],
    ["Schutzabdeckungen und Wände nach Fläche; Absperrungen nach Länge; Vorhalten nach Zeit laut LV"],
    "Zu schützende Bestandsbereiche und Nutzungen während der Bauzeit angeben.",
)
