# LB 053 Niederspannungsanlagen – Kabel/Leitungen, Verlegesysteme, Installationsgeräte (eigene Texte, Preisstand 11/2026)
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tga_achsen import *  # noqa: E402,F401,F403


# Lokale Achsen (Prüfbefund): Aufputz-/Deckengeräte ohne Schalterprogramm und Unterputzdose
AP_FARBE = [{"k": "", "t": "Aufputzgehäuse grau bzw. weiß, Schutzart wie angegeben."},
            {"k": "anthrazit", "t": "Aufputzgehäuse anthrazit bzw. schwarz.", "mat": 6}]
DECKE_MONT = [{"k": "Decke Aufbau", "t": "Aufbaumontage an der Decke."},
              {"k": "Decke Einbau", "t": "Einbau in Unterdecke mit Einbaudose.", "fh": 1.05, "mat": 3}]

LBS = [{
    "nr": "053", "name": "Niederspannungsanlagen – Kabel/Leitungen, Verlegesysteme, Installationsgeräte", "atv": "DIN 18382", "lohn": "elektro",
    "gruppen": [
        {"name": "Hausanschluss, Zählerplätze, Verteiler", "positionen": [
            {"kurz": "Hausanschluss-Vorbereitung, Mehrsparten-Einführung",
             "lang": "Mehrsparten-Hauseinführung für Strom, Wasser, Gas und Telekommunikation in Bodenplatte bzw. "
                     "Kellerwand nach Vorgaben der Versorger einbauen (gas- und wasserdicht), Abstimmung mit den "
                     "Netzbetreibern, Anschlussraum bzw. -wand vorbereiten.",
             "einheit": "St", "kg": "444", "h": 4, "mat": 780, "gen": "B", "tags": ["neubau"]},
            {"kurz": "Zählerschrank nach VDE-AR-N 4100, {art}",
             "lang": "Zählerschrank nach TAB und VDE-AR-N 4100 {art}, mit APZ-Feld, Hauptleitungsabzweigklemmen, "
                     "SLS-Schalter, Überspannungsschutz-Platz, Verteilerfeld und Kommunikationsfeld, Aufputz bzw. "
                     "Unterputz, montieren, verdrahten und Anmeldung beim Netzbetreiber (Inbetriebsetzungsauftrag) vorbereiten.",
             "einheit": "St", "kg": "444", "gen": "B",
             "varianten": [{"art": "mit 1 Zählerplatz (eHZ) und Verteilerfeld", "h": 10, "mat": 1150},
                           {"art": "mit 2 Zählerplätzen (Haushalt und Wärmepumpe/PV)", "h": 14, "mat": 1650},
                           {"art": "mit 4 Zählerplätzen (Mehrfamilienhaus)", "h": 20, "mat": 2650},
                           {"art": "mit 8 Zählerplätzen (Mehrfamilienhaus)", "h": 32, "mat": 4600}]},
            {"kurz": "Unterverteilung {r}-reihig, bestückt, Unterputz",
             "lang": "Kleinverteiler bzw. Stromkreisverteiler Unterputz {r}-reihig mit Tür, N- und PE-Klemmen, bestückt "
                     "mit FI/LS-Schutzeinrichtungen nach Stromkreisliste (Ansatz Grundbestückung), montieren, verdrahten, "
                     "beschriften und Stromkreisverzeichnis einlegen.",
             "einheit": "St", "kg": "444", "gen": "B",
             "varianten": [{"r": "2", "h": 6, "mat": 420}, {"r": "3", "h": 9, "mat": 680}, {"r": "4", "h": 12, "mat": 920}]},
            {"kurz": "Fehlerstrom-Schutzschalter {art}",
             "lang": "Fehlerstrom-Schutzschalter {art}, Bemessungsfehlerstrom 30 mA, in Verteiler einbauen und anschließen.",
             "einheit": "St", "kg": "444", "gen": "A",
             "varianten": [{"art": "Typ A, 4-polig 40 A", "h": 0.5, "mat": 62}, {"art": "Typ B (allstromsensitiv), 4-polig 40 A", "h": 0.6, "mat": 380},
                           {"art": "Typ F, 2-polig 40 A", "h": 0.4, "mat": 95}]},
            {"kurz": "FI/LS-Schalter 1-polig + N, B16 / 30 mA",
             "lang": "Kombinierter Fehlerstrom-/Leitungsschutzschalter 1+N, Charakteristik B 16 A, 30 mA Typ A, "
                     "in Verteiler einbauen und anschließen.",
             "einheit": "St", "kg": "444", "h": 0.4, "mat": 52, "gen": "A"},
            {"kurz": "Leitungsschutzschalter {art}",
             "lang": "Leitungsschutzschalter {art}, Schaltvermögen 6 kA, in Verteiler einbauen und anschließen.",
             "einheit": "St", "kg": "444", "gen": "A",
             "varianten": [{"art": "1-polig B16", "h": 0.25, "mat": 6}, {"art": "3-polig B16", "h": 0.35, "mat": 22},
                           {"art": "3-polig C32", "h": 0.40, "mat": 32}]},
            {"kurz": "Brandschutzschalter (AFDD) 1+N, B16",
             "lang": "Fehlerlichtbogen-Schutzeinrichtung (AFDD) in Kombination mit LS-Schalter B16, nach DIN VDE 0100-420 "
                     "für Schlaf- und Aufenthaltsräume, in Verteiler einbauen.",
             "einheit": "St", "kg": "444", "h": 0.4, "mat": 135, "gen": "A"},
            {"kurz": "Hauptleitung NYM-J 5 × {q} mm² Zählerschrank – Unterverteilung",
             "lang": "Hauptleitung bzw. Zuleitung Unterverteiler aus NYM-J 5 × {q} mm² auf Kabelrinne, in Rohr bzw. "
                     "unter Putz verlegen und beidseitig anschließen. Abrechnung nach Länge.",
             "einheit": "m", "kg": "444", "gen": "A",
             "varianten": [{"q": "10", "h": 0.18, "mat": 9.5}, {"q": "16", "h": 0.22, "mat": 14}]},
        ]},
        {"name": "Kabel und Leitungen", "positionen": [
            {"kurz": "Installationsleitung NYM-J {q}",
             "lang": "Installationsleitung NYM-J {q} verlegen (Verlegeart siehe Folgetext), "
                     "einschließlich Befestigung, Kennzeichnung und Anschluss an beiden Enden. Abrechnung nach Länge.",
             "einheit": "m", "kg": "444", "gen": "A",
             "varianten": [{"q": "3 × 1,5 mm²", "h": 0.08, "mat": 1.2}, {"q": "5 × 1,5 mm²", "h": 0.09, "mat": 1.9},
                           {"q": "3 × 2,5 mm²", "h": 0.09, "mat": 1.9}, {"q": "5 × 2,5 mm²", "h": 0.10, "mat": 3.0},
                           {"q": "5 × 4 mm²", "h": 0.12, "mat": 4.6}, {"q": "5 × 6 mm²", "h": 0.14, "mat": 6.8}]},
            {"kurz": "Kabel NYY-J {q}",
             "lang": "Kabel NYY-J {q} verlegen (Verlegeart siehe Folgetext), "
                     "einschließlich Endverschluss und Anschluss. Abrechnung nach Länge.",
             "einheit": "m", "kg": "444", "gen": "A",
             "varianten": [{"q": "3 × 1,5 mm²", "h": 0.09, "mat": 1.8}, {"q": "5 × 2,5 mm²", "h": 0.12, "mat": 3.8},
                           {"q": "5 × 10 mm²", "h": 0.18, "mat": 11}, {"q": "5 × 16 mm²", "h": 0.22, "mat": 16},
                           {"q": "4 × 35 mm²", "h": 0.30, "mat": 28}, {"q": "4 × 70 mm²", "h": 0.40, "mat": 52}]},
            {"kurz": "Halogenfreie Leitung NHXMH-J {q}",
             "lang": "Halogenfreie Installationsleitung NHXMH-J {q} für Rettungswege bzw. öffentliche Bereiche, "
                     "verlegen und anschließen. Abrechnung nach Länge.",
             "einheit": "m", "kg": "444", "gen": "A",
             "varianten": [{"q": "3 × 1,5 mm²", "h": 0.09, "mat": 1.9}, {"q": "5 × 2,5 mm²", "h": 0.11, "mat": 4.2}]},
            {"kurz": "Funktionserhalt-Kabel E30/E90 {q} mit Tragsystem",
             "lang": "Kabel mit Funktionserhalt (z. B. NHXH FE180/E30 bzw. E90) {q} auf geprüftem Verlegesystem nach "
                     "DIN 4102-12 mit Befestigungsabstand nach Prüfzeugnis verlegen. Abrechnung nach Länge, Tragsystem anteilig.",
             "einheit": "m", "kg": "444", "gen": "B",
             "varianten": [{"q": "3 × 1,5 mm²", "h": 0.20, "mat": 7}, {"q": "5 × 2,5 mm²", "h": 0.24, "mat": 11}]},
            {"kurz": "Steuerleitung J-Y(St)Y {q}",
             "lang": "Installationskabel J-Y(St)Y {q} für Steuer-, Bus- und Signalleitungen verlegen und anschließen. "
                     "Abrechnung nach Länge.",
             "einheit": "m", "kg": "444", "gen": "A",
             "varianten": [{"q": "2 × 2 × 0,8", "h": 0.06, "mat": 0.6}, {"q": "4 × 2 × 0,8", "h": 0.07, "mat": 1.0}]},
            {"kurz": "Schlitze und Durchbrüche für Elektroinstallation (Bestand)",
             "lang": "Leitungsschlitze in Mauerwerk bzw. Putz fräsen, Leitungen einlegen und Schlitze beiputzen, "
                     "staubarm mit Absaugung. Abrechnung nach Schlitzlänge.",
             "einheit": "m", "kg": "444", "h": 0.25, "mat": 1.5, "geraet": 1.5, "gen": "B", "tags": ["altbau"]},
        ]},
        {"name": "Verlegesysteme", "positionen": [
            {"kurz": "Kabelrinne Stahl verzinkt {b} × 60 mm, mit Abhängung",
             "lang": "Kabelrinne aus feuerverzinktem Stahlblech, gelocht, Breite {b} mm, Seitenhöhe 60 mm, an Decke "
                     "bzw. Wand mit Abhängern, Auslegern und Verbindern montieren, Formteile anteilig, Potentialausgleich. "
                     "Abrechnung nach Länge.",
             "einheit": "m", "kg": "444", "gen": "A",
             "varianten": [{"b": "100", "h": 0.35, "mat": 14}, {"b": "200", "h": 0.40, "mat": 19}, {"b": "300", "h": 0.45, "mat": 25},
                           {"b": "400", "h": 0.50, "mat": 31}]},
            {"kurz": "Gitterrinne verzinkt {b} × 60 mm",
             "lang": "Gitterrinne aus galvanisch verzinktem Stahldraht, Breite {b} mm, mit Befestigungen und Verbindern "
                     "montieren. Abrechnung nach Länge.",
             "einheit": "m", "kg": "444", "gen": "A",
             "varianten": [{"b": "100", "h": 0.28, "mat": 10}, {"b": "200", "h": 0.32, "mat": 14}]},
            {"kurz": "Installationsrohr flexibel/starr M{m}, verlegt",
             "lang": "Elektro-Installationsrohr nach DIN EN 61386, M{m}, flexibel in Beton/Hohlwand bzw. starr auf Putz "
                     "mit Schellen verlegen, mit Zugdraht. Abrechnung nach Länge.",
             "einheit": "m", "kg": "444", "gen": "A",
             "varianten": [{"m": "20", "h": 0.07, "mat": 0.8}, {"m": "25", "h": 0.08, "mat": 1.1}, {"m": "32", "h": 0.09, "mat": 1.7},
                           {"m": "50", "h": 0.12, "mat": 3.5}]},
            {"kurz": "Kabelkanal Kunststoff {m} mm mit Oberteil",
             "lang": "Leitungsführungskanal aus PVC bzw. halogenfrei, {m} mm, mit Deckel, auf Wand montieren, "
                     "Form- und Endstücke anteilig. Abrechnung nach Länge.",
             "einheit": "m", "kg": "444", "gen": "A",
             "varianten": [{"m": "40 × 60", "h": 0.20, "mat": 7}, {"m": "60 × 110 (Brüstungskanal)", "h": 0.35, "mat": 24, "achsen": [ORT, MENGE]}]},
            {"kurz": "Leerrohr erdverlegt KG/PE DN {dn} mit Zugdraht",
             "lang": "Kabelschutzrohr PE bzw. PVC DN {dn} im bauseitigen Graben verlegen, mit Zugdraht und Endkappen. "
                     "Abrechnung nach Länge.",
             "einheit": "m", "kg": "444", "gen": "A",
             "varianten": [{"dn": "50", "h": 0.06, "mat": 2.2}, {"dn": "110", "h": 0.08, "mat": 4.5}]},
            {"kurz": "Unterputz-/Hohlwanddose, Abzweigdose",
             "lang": "Geräte- bzw. Abzweigdose Unterputz oder Hohlwand einschließlich Ausfräsen bzw. Bohren, "
                     "Einsetzen und Klemmen.",
             "einheit": "St", "kg": "444", "h": 0.25, "mat": 1.8, "gen": "A"},
        ]},
        {"name": "Installationsgeräte (komplett)", "positionen": [
            {"kurz": "Schalter/Taster komplett, {art}",
             "lang": "Installationsgerät komplett einschließlich Gerätedose, Leitung bis 8 m NYM 3 × 1,5 mm² anteilig "
                     "ab Verteilung bzw. Abzweig, Unterputzeinsatz, Wippe und Abdeckrahmen (Schalterprogramm "
                     "Kunststoff reinweiß, Standard), {art}, montieren und anschließen.",
             "einheit": "St", "kg": "444", "gen": "B",
             "varianten": [{"art": "Aus-/Wechselschalter", "h": 0.85, "mat": 26}, {"art": "Serienschalter", "h": 0.95, "mat": 32},
                           {"art": "Kreuzschalter", "h": 1.0, "mat": 34}, {"art": "Taster mit Kontrolllicht", "h": 0.95, "mat": 36},
                           {"art": "Jalousietaster", "h": 1.1, "mat": 40}, {"art": "Dimmer LED", "h": 1.0, "mat": 85}]},
            {"kurz": "Steckdose komplett, {art}",
             "lang": "Schutzkontakt-Steckdose komplett einschließlich Gerätedose, Leitung NYM-J 3 × 1,5 bzw. 3 × 2,5 mm² "
                     "bis 8 m anteilig, Einsatz mit erhöhtem Berührungsschutz und Rahmen (Standardprogramm), {art}.",
             "einheit": "St", "kg": "444", "gen": "B",
             "varianten": [{"art": "einfach", "h": 0.85, "mat": 22}, {"art": "zweifach", "h": 1.05, "mat": 34},
                           {"art": "dreifach", "h": 1.25, "mat": 46}, {"art": "einfach mit USB-A/C", "h": 0.90, "mat": 55},
                           {"art": "Feuchtraum/Außen Aufputz IP44 mit Klappdeckel", "h": 0.95, "mat": 30, "achsen": [AP_FARBE, ORT_KLEIN]}]},
            {"kurz": "Bewegungsmelder {art}, komplett",
             "lang": "Bewegungs- bzw. Präsenzmelder {art} mit Leitung bis 8 m anteilig, montieren, anschließen und einstellen.",
             "einheit": "St", "kg": "444", "gen": "B",
             "varianten": [{"art": "Unterputz 180°", "h": 1.0, "mat": 65}, {"art": "Decke 360° Präsenzmelder", "h": 1.2, "mat": 140, "achsen": [DECKE_MONT, ORT_KLEIN]},
                           {"art": "Außen IP55", "h": 1.0, "mat": 75, "achsen": [AP_FARBE, ORT_KLEIN]}]},
            {"kurz": "Brennstellen-Anschluss Decke/Wand (Leuchtenauslass)",
             "lang": "Brennstelle für Decken- bzw. Wandleuchte herstellen: Auslassdose bzw. Geräteanschlussklemme, "
                     "Leitung NYM-J 3 × 1,5 mm² bis 6 m anteilig. Leuchte gesondert.",
             "einheit": "St", "kg": "444", "h": 0.6, "mat": 8, "gen": "A"},
            {"kurz": "Geräteanschluss {art}",
             "lang": "Festanschluss für {art} mit Geräteanschlussdose bzw. Abzweigdose, Leitung bis 10 m anteilig "
                     "ab Verteilung, eigener Stromkreis, anschließen und prüfen.",
             "einheit": "St", "kg": "444", "gen": "A",
             "varianten": [{"art": "Elektroherd / Kochfeld 400 V (NYM-J 5 × 2,5 mm²)", "h": 1.6, "mat": 48},
                           {"art": "Geschirrspüler / Waschmaschine / Trockner 230 V", "h": 1.2, "mat": 30},
                           {"art": "Durchlauferhitzer 400 V (NYM-J 5 × 6 mm²)", "h": 1.8, "mat": 95},
                           {"art": "Wärmepumpe Außeneinheit (Leistung und Steuerung)", "h": 4.5, "mat": 210},
                           {"art": "Heizung / Kessel mit Notschalter", "h": 1.8, "mat": 60}]},
            {"kurz": "Rollladen-/Raffstoreanschluss mit Taster",
             "lang": "Anschluss eines elektrischen Rollladen- bzw. Raffstoreantriebs mit Jalousietaster und Leitung "
                     "NYM-J 5 × 1,5 mm² bis 8 m anteilig.",
             "einheit": "St", "kg": "444", "h": 1.4, "mat": 48, "gen": "A"},
            {"kurz": "Klingel- und Gong-Anlage einfach, Einfamilienhaus",
             "lang": "Klingelanlage mit Klingeltaster außen (beleuchtet), Gong, Klingeltrafo im Verteiler und Leitung, komplett.",
             "einheit": "psch", "kg": "444", "h": 3, "mat": 95, "gen": "A"},
            {"kurz": "Unterputz-Einsatz Steckdose (Bestand) austauschen",
             "lang": "Vorhandenes Installationsgerät (Schalter/Steckdose) gegen neues Gerät des gewählten Programms "
                     "austauschen, Rahmen erneuern.",
             "einheit": "St", "kg": "444", "h": 0.35, "mat": 16, "gen": "A", "tags": ["altbau"]},
        ]},
        {"name": "E-Mobilität, Photovoltaik", "positionen": [
            {"kurz": "Leerrohr-Vorbereitung Ladepunkt (GEIG), je Stellplatz",
             "lang": "Leitungsinfrastruktur für einen späteren Ladepunkt nach GEIG vorbereiten: Schutzrohr M50 bzw. "
                     "Kabelrinne bis 25 m vom Verteiler bis zum Stellplatz, Platzreserve im Zählerschrank.",
             "einheit": "St", "kg": "444", "h": 3, "mat": 140, "gen": "B"},
            {"kurz": "Wallbox 11 kW mit Zuleitung bis {l} m, {art}",
             "lang": "Ladestation (Wallbox) Mode 3, 11 kW, Typ-2-Ladekabel bzw. -Steckdose, {art}, an Wand bzw. Standfuß "
                     "montieren, Zuleitung NYM-J/NYY-J 5 × 6 mm² bis {l} m mit FI Typ A + DC-Fehlerstromerkennung "
                     "bzw. FI Typ B und LS-Schalter, Anmeldung beim Netzbetreiber, Inbetriebnahme.",
             "einheit": "St", "kg": "444", "gen": "C",
             "varianten": [{"art": "Standard", "l": "15", "h": 7, "mat": 1050}, {"art": "mit Lastmanagement, PV-Überschussladen und App", "l": "15", "h": 8, "mat": 1550},
                           {"art": "eichrechtskonform mit Abrechnungsfunktion (gewerblich)", "l": "25", "h": 10, "mat": 2450}]},
            {"kurz": "Photovoltaikanlage Aufdach, Module, WR, Montage, je kWp ({g})",
             "lang": "Netzgekoppelte Photovoltaikanlage auf Schrägdach mit monokristallinen Glas-Folie- bzw. Glas-Glas-Modulen "
                     "(Wirkungsgrad ≥ 21 %), Unterkonstruktion mit Dachhaken, DC-Verkabelung, Wechselrichter, AC-Anschluss "
                     "bis Zählerschrank, Überspannungsschutz, Inbetriebnahme und Anmeldung beim Netzbetreiber. "
                     "Gerüst gesondert. Abrechnung je kWp installierter Leistung.",
             "einheit": "kWp", "kg": "442", "gen": "C",
             "varianten": [{"g": "Anlage 8–15 kWp", "h": 9, "mat": 820}, {"g": "Anlage 30–100 kWp", "h": 7, "mat": 660}]},
            {"kurz": "Photovoltaikanlage Flachdach, aufgeständert, ballastiert, je kWp",
             "lang": "Photovoltaikanlage auf Flachdach mit aerodynamischem, ballastiertem Ost-West- bzw. Süd-System ohne "
                     "Durchdringung der Abdichtung, Lastnachweis des Daches bauseits, sonst wie vor. Abrechnung je kWp.",
             "einheit": "kWp", "kg": "442", "h": 8, "mat": 760, "gen": "C"},
            {"kurz": "Batteriespeicher Lithium-Eisenphosphat, nutzbar {kwh} kWh",
             "lang": "Stationärer Batteriespeicher (LFP) mit nutzbarer Kapazität {kwh} kWh, Hybrid- bzw. Batteriewechselrichter "
                     "kompatibel, mit Energiemanager, montieren, anschließen und in Betrieb nehmen.",
             "einheit": "St", "kg": "442", "gen": "C",
             "varianten": [{"kwh": "5", "h": 6, "mat": 3100}, {"kwh": "10", "h": 7, "mat": 5400}, {"kwh": "15", "h": 8, "mat": 7600}]},
            {"kurz": "Balkonkraftwerk / Steckersolargerät 800 VA",
             "lang": "Steckersolargerät mit zwei Modulen und Mikrowechselrichter 800 VA an Balkon bzw. Fassade montieren, "
                     "Einspeisesteckdose bzw. Energiesteckvorrichtung.",
             "einheit": "St", "kg": "442", "h": 4, "mat": 520, "gen": "C"},
        ]},
        {"name": "Prüfung, Dokumentation", "positionen": [
            {"kurz": "Erstprüfung nach DIN VDE 0100-600 mit Protokoll, je Stromkreis",
             "lang": "Erstprüfung der elektrischen Anlage (Besichtigen, Erproben, Messen) nach DIN VDE 0100-600, "
                     "Prüfprotokoll nach ZVEH-Muster. Abrechnung je Stromkreis.",
             "einheit": "St", "kg": "444", "h": 0.35, "mat": 0, "gen": "A"},
            {"kurz": "E-Check / Wiederholungsprüfung Wohnung bzw. Einfamilienhaus",
             "lang": "Wiederholungsprüfung der elektrischen Anlage nach DIN VDE 0105-100 (E-Check) mit Prüfprotokoll "
                     "und Prüfplakette, Wohnung bzw. Einfamilienhaus bis 20 Stromkreise.",
             "einheit": "psch", "kg": "444", "h": 4, "mat": 10, "gen": "B", "tags": ["altbau"]},
            {"kurz": "Revisionsunterlagen Elektro (Bestandspläne, Stromlaufpläne)",
             "lang": "Bestandsdokumentation: Installationspläne, Verteilerpläne, Stromkreisliste, Prüfprotokolle, "
                     "Datenblätter, digital (PDF) und einfach in Papier.",
             "einheit": "psch", "kg": "444", "h": 8, "mat": 30, "gen": "B"},
            {"kurz": "Elektroinstallation Bestand demontieren, je Wohnung",
             "lang": "Vorhandene, nicht mehr benötigte Elektroinstallation (Geräte, Leitungen Aufputz, Altverteiler) "
                     "spannungsfrei schalten, demontieren und entsorgen, Unterputzleitungen tot legen, Wohnung bis 80 m².",
             "einheit": "psch", "kg": "444", "h": 10, "mat": 0, "geraet": 120, "gen": "C", "tags": ["altbau"]},
        ]},
    ],
}]

# ---------------------------------------------------------------- Runde 2: weitere Grundpositionen
LBS[0]["gruppen"] += [
    {"name": "Hauptverteilung, Objekt", "positionen": [
        {"kurz": "Niederspannungs-Hauptverteilung, Feld {b} mm, bestückt",
         "lang": "Niederspannungs-Hauptverteilung (NSHV) als Standschrank-Feld nach DIN EN 61439-2, Bauform {b} mm breit, "
                 "Schutzart IP43, mit Sammelschienensystem, Abgangsschaltgeräten nach Verteilerplan, Beschriftung, "
                 "Bauartnachweis und Prüfprotokoll, aufstellen, ausrichten und anschließen.",
         "einheit": "St", "kg": "443", "gen": "C",
         "varianten": [{"b": "600", "h": 14, "mat": 5200}, {"b": "800", "h": 18, "mat": 7400}, {"b": "1000", "h": 22, "mat": 9600}]},
        {"kurz": "Lasttrennschalter/NH-Sicherungslasttrenner {i} A, 3-polig",
         "lang": "NH-Sicherungslasttrennschalter Größe nach Bemessungsstrom {i} A, 3-polig, mit NH-Sicherungseinsätzen, "
                 "in vorhandene Verteilung einbauen und anschließen.",
         "einheit": "St", "kg": "443", "gen": "B",
         "varianten": [{"i": "63", "h": 1.0, "mat": 95}, {"i": "160", "h": 1.5, "mat": 180}, {"i": "250", "h": 2.0, "mat": 290}, {"i": "400", "h": 3.0, "mat": 520}]},
        {"kurz": "Leistungsschalter kompakt {i} A, einstellbar",
         "lang": "Kompaktleistungsschalter 3-polig, Bemessungsstrom {i} A, mit einstellbarem Überlast- und Kurzschlussauslöser, "
                 "Hilfsschalter, in Hauptverteilung einbauen, einstellen nach Selektivitätsnachweis und anschließen.",
         "einheit": "St", "kg": "443", "gen": "C",
         "varianten": [{"i": "160", "h": 3, "mat": 820}, {"i": "250", "h": 3.5, "mat": 1150}, {"i": "400", "h": 4.5, "mat": 1950}, {"i": "630", "h": 6, "mat": 3200}]},
        {"kurz": "Unterverteilung Aufputz Stahlblech {f} Felder, IP54",
         "lang": "Unterverteiler Stahlblechgehäuse Aufputz, Schutzart IP54, {f} Felder breit, mit Hutschienen, N- und PE-Schienen, "
                 "Berührungsschutz und Tür mit Schloss, bestückt nach Verteilerplan (bis 24 Stromkreise), montieren und verdrahten.",
         "einheit": "St", "kg": "444", "gen": "B",
         "varianten": [{"f": "2", "h": 8, "mat": 980}, {"f": "3", "h": 11, "mat": 1450}, {"f": "4", "h": 14, "mat": 1900}]},
        {"kurz": "Zählerplatz-Erweiterung / Zusatzfeld im Bestand",
         "lang": "Vorhandenen Zählerschrank um ein Zählerfeld (eHZ) bzw. Verteiler- oder Kommunikationsfeld erweitern, "
                 "Anpassung an TAB des Netzbetreibers, Verdrahtung und Anmeldung.",
         "einheit": "St", "kg": "444", "h": 4, "mat": 380, "gen": "C", "tags": ["altbau"]},
        {"kurz": "Fehlerstrom-Überwachung RCM / Energiemessgerät in Verteilung",
         "lang": "Multifunktionsmessgerät bzw. Differenzstromüberwachung (RCM) für Hutschiene mit Stromwandlern, Modbus-Schnittstelle, "
                 "einbauen, parametrieren und anschließen.",
         "einheit": "St", "kg": "444", "h": 2.5, "mat": 420, "gen": "B"},
    ]},
    {"name": "Objektinstallation, Unterflur", "positionen": [
        {"kurz": "CEE-Steckdose {i} A, 5-polig, {art}",
         "lang": "CEE-Steckdose {i} A 400 V, 5-polig, Schutzart IP44 bzw. IP67, {art}, mit Anschlussleitung bis 5 m vom Verteiler, "
                 "montieren und anschließen.",
         "einheit": "St", "kg": "444", "gen": "B",
         "varianten": [{"i": "16", "art": "Aufbau", "h": 1.2, "mat": 48}, {"i": "32", "art": "Aufbau", "h": 1.5, "mat": 72},
                       {"i": "16", "art": "in Steckdosenkombination mit Schuko", "h": 2.0, "mat": 210}, {"i": "63", "art": "Aufbau", "h": 2.5, "mat": 160}]},
        {"kurz": "Brüstungskanal Aluminium {b} mm, mit Trennsteg",
         "lang": "Brüstungs- bzw. Geräteeinbaukanal aus Aluminium eloxiert, Abmessung {b} mm, mit Trennsteg für Stark- und Schwachstrom, "
                 "Form- und Endstücken anteilig, montieren. Geräteeinbau gesondert.",
         "einheit": "m", "kg": "444", "gen": "B",
         "varianten": [{"b": "130 × 55", "h": 0.45, "mat": 28}, {"b": "170 × 70", "h": 0.55, "mat": 38}]},
        {"kurz": "Unterflur-Kanalsystem estrichbündig, {art}",
         "lang": "Unterflur-Installationssystem estrichbündig bzw. estrichüberdeckt, {art}, mit Kanaltrennung, Höhenausgleich, "
                 "Abdichtung zum Estrich, verlegen und ausrichten.",
         "einheit": "m", "kg": "444", "gen": "C",
         "varianten": [{"art": "zweizügig", "h": 0.6, "mat": 46}, {"art": "dreizügig", "h": 0.75, "mat": 62}]},
        {"kurz": "Bodentank/Geräteeinsatz Unterflur für {n} Geräte",
         "lang": "Bodentank bzw. Geräteeinsatz mit Deckel zur Aufnahme von {n} Installationsgeräten (Steckdosen, Datendosen), "
                 "höheneinstellbar, mit Belagsaufnahme, einbauen; Geräte gesondert.",
         "einheit": "St", "kg": "444", "gen": "B",
         "varianten": [{"n": "4", "h": 1.5, "mat": 185}, {"n": "6", "h": 1.8, "mat": 240}, {"n": "9", "h": 2.2, "mat": 310}]},
        {"kurz": "Kabelbühne verzinkt {b} × 110 mm, schwere Ausführung",
         "lang": "Kabelleiter bzw. Kabelbühne feuerverzinkt, Breite {b} mm, Holmhöhe 110 mm, mit Wand- bzw. Deckenauslegern "
                 "und Formteilen anteilig, montieren und erden.",
         "einheit": "m", "kg": "444", "gen": "B",
         "varianten": [{"b": "300", "h": 0.8, "mat": 42}, {"b": "400", "h": 0.9, "mat": 52}, {"b": "600", "h": 1.1, "mat": 70}]},
        {"kurz": "Stromschienensystem bis {i} A, je m",
         "lang": "Schienenverteiler bzw. Stromschienensystem für Werkstatt/Halle bis {i} A, mit Abgangskästen anteilig, Einspeisung "
                 "und Befestigung, montieren und anschließen.",
         "einheit": "m", "kg": "444", "gen": "C",
         "varianten": [{"i": "40", "h": 0.7, "mat": 75}, {"i": "63", "h": 0.8, "mat": 95}, {"i": "160", "h": 1.2, "mat": 210}]},
        {"kurz": "Not-Aus-Taster mit Schutzkragen, verdrahtet",
         "lang": "Not-Aus-Taster rot/gelb mit Schutzkragen, Aufputz, Leitung bis 15 m zur Schaltstelle, montieren und anschließen, "
                 "Funktionsprüfung.",
         "einheit": "St", "kg": "444", "h": 1.8, "mat": 65, "gen": "B"},
    ]},
    {"name": "Anschlüsse, Demontage, Nebenleistungen", "positionen": [
        {"kurz": "Anschluss Heizungs-/Lüftungsanlage elektrisch, {art}",
         "lang": "Elektrischen Anschluss {art} herstellen: Zuleitung bis 10 m vom Verteiler, Reparaturschalter bzw. Klemmkasten, "
                 "anschließen und Drehrichtung bzw. Funktion prüfen.",
         "einheit": "St", "kg": "444", "gen": "B",
         "varianten": [{"art": "Wärmepumpe 3-phasig mit Steuerleitung (EVU-Sperre)", "h": 4.5, "mat": 160},
                       {"art": "Lüftungsgerät 1-phasig", "h": 2.0, "mat": 55}, {"art": "Umwälzpumpe/Stellantrieb", "h": 1.0, "mat": 25},
                       {"art": "Durchlauferhitzer 21 kW", "h": 2.5, "mat": 95}]},
        {"kurz": "Leitungen im Bestand demontieren, {art}",
         "lang": "Nicht mehr benötigte Elektroleitungen {art} freischalten, demontieren, Befestigungen entfernen und Material sortenrein "
                 "entsorgen; Kupfererlös wird verrechnet.",
         "einheit": "m", "kg": "394", "gen": "C", "tags": ["altbau"], "lohn": "elektro",
         "varianten": [{"art": "Aufputz bzw. auf Rinne", "h": 0.06, "mat": 0, "geraet": 0.3}, {"art": "Kabelrinne inkl. Kabel", "h": 0.25, "mat": 0, "geraet": 1.5}]},
        {"kurz": "Installationsgerät/Verteiler demontieren, {art}",
         "lang": "{art} spannungsfrei schalten, demontieren, Leitungsenden sichern bzw. isolieren und Altmaterial entsorgen.",
         "einheit": "St", "kg": "394", "gen": "B", "tags": ["altbau"],
         "varianten": [{"art": "Schalter/Steckdose", "h": 0.2, "mat": 0, "geraet": 0.5}, {"art": "Unterverteilung bis 4-reihig", "h": 2.5, "mat": 0, "geraet": 15},
                       {"art": "Zählerschrank", "h": 3.5, "mat": 0, "geraet": 25}]},
        {"kurz": "Provisorische Stromversorgung Bestand während Umbau",
         "lang": "Provisorische Versorgung von Bestandsbereichen während der Umbauphase mit Interimsverteiler, Leitungen und "
                 "Steckdosen herstellen, vorhalten und zurückbauen, je Nutzungseinheit.",
         "einheit": "St", "kg": "444", "h": 8, "mat": 220, "gen": "C", "tags": ["altbau"]},
        {"kurz": "Kennzeichnung und Beschriftung Stromkreise/Verteiler, je Verteiler",
         "lang": "Beschriftung aller Schutzorgane, Abgänge und Klemmen mit dauerhaften Schildern, Stromkreisliste in der Verteilertür, "
                 "Aufkleber für Leitungen in Schaltschränken.",
         "einheit": "St", "kg": "444", "h": 1.5, "mat": 25, "gen": "A"},
        {"kurz": "Thermografie elektrischer Anlagen, je Verteiler",
         "lang": "Thermografische Prüfung einer Verteilung unter Last mit Wärmebildkamera, Bericht mit Bildern und Bewertung.",
         "einheit": "St", "kg": "444", "h": 1.2, "mat": 0, "geraet": 35, "gen": "B"},
    ]},
]

# ---------------------------------------------------------------- Runde 2: Achsen zuordnen
_G = lambda *namen: (lambda g, p: g in namen)
_K = lambda *worte: (lambda g, p: any(w in p["kurz"] for w in worte))
MONTAGE_V = [{}, {"k": "Aufputz-Gehäuse", "t": "Ausführung als Aufputzverteiler mit Kunststoff- bzw. Stahlblechgehäuse.", "fh": 0.9, "fm": 0.95},
             {"k": "Hohlwand", "t": "Einbau in Trockenbauwand mit Hohlwand-Einbaurahmen.", "fh": 0.95, "mat": 25}]
MONTAGEHOEHE = [{}, {"k": "über 3,5 m", "t": "Montagehöhe über 3,5 m bis 6 m, Hubarbeitsbühne bzw. Rollgerüst stellt der Auftragnehmer.", "fh": 1.25, "geraet": 1.5},
                {"k": "über 6 m, Hubsteiger", "t": "Montagehöhe über 6 m, Hubsteiger stellt der Auftragnehmer.", "fh": 1.4, "geraet": 4, "gen": "C"}]
UNTERGRUND = [{}, {"k": "an Trapezblech/Stahl", "t": "Befestigung an Stahlkonstruktion bzw. Trapezblech mit Trägerklemmen.", "fh": 1.1, "mat": 1.5}]
NYY_VERLEGUNG = [VERLEGUNG_KABEL[1], VERLEGUNG_KABEL[2], VERLEGUNG_KABEL[3], VERLEGUNG_KABEL[4],
                 {"k": "im Erdreich", "t": "Verlegung im bauseits hergestellten Kabelgraben auf Sandbett mit Trassenwarnband.", "fh": 0.7, "mat": 0.4}]
# Schalterprogramm: Mehrpreis je Gerät als fester Betrag statt Faktor auf das ganze Gerät (Prüfbefund Dimmer/Design)
SCHALTER = [{"k": "reinweiß", "t": "Schalterprogramm Kunststoff reinweiß glänzend."},
            {"k": "anthrazit matt", "t": "Schalterprogramm Kunststoff anthrazit bzw. schwarz matt.", "mat": 8},
            {"k": "Edelstahl/Alu", "t": "Schalterprogramm Metall (Edelstahl oder Aluminium).", "mat": 28},
            {"k": "Designrahmen Glas", "t": "Schalterprogramm mit Designrahmen aus Glas bzw. Echtmaterial nach Bemusterung.", "mat": 55, "gen": "C"}]
PV_MONT = [{}, {"k": "mit Kran", "t": "Materialtransport aufs Dach mit Autokran bzw. Dachlift, anteilig je kWp.", "geraet": 70, "fh": 1.05}]
LEERROHR_AX = [ORT_KLEIN, MENGE]
zuweisen(LBS, [
    (_K("Hauptleitung NYM"), [VERLEGUNG_KABEL, ORT, MENGE]),
    (_K("Leerrohr erdverlegt"), LEERROHR_AX),
    (_K("Unterputz-/Hohlwanddose"), [ORT_KLEIN]),
    (_K("Photovoltaikanlage"), [PV_MONT, ORT_KLEIN]),
    (_K("Batteriespeicher"), [GERAET_AUFSTELLUNG[:2], ORT_KLEIN]),
    (_K("Zählerschrank", "Unterverteilung", "Zählerplatz"), [MONTAGE_V, ORT]),
    (_K("Kabel NYY"), [NYY_VERLEGUNG, ORT_KLEIN, MENGE]),
    (_K("Installationsleitung", "Halogenfreie", "Steuerleitung"), [VERLEGUNG_KABEL, ORT, MENGE]),
    (_K("Funktionserhalt"), [MONTAGEHOEHE, ORT_KLEIN, MENGE]),
    (_G("Verlegesysteme"), [MONTAGEHOEHE, UNTERGRUND, ORT_KLEIN]),
    (_K("Kabelbühne", "Stromschienensystem"), [MONTAGEHOEHE, UNTERGRUND, ORT_KLEIN]),
    (_K("Brüstungskanal"), [ORT, MENGE]),
    (_K("Schalter/Taster", "Steckdose komplett", "Bewegungsmelder"), [SCHALTER, VERLEGUNG_GERAET, ORT_KLEIN]),
    (_K("Brennstellen", "Geräteanschluss", "Rollladen-", "Anschluss Heizungs"), [VERLEGUNG_GERAET, ORT]),
    (_K("CEE-Steckdose", "Not-Aus"), [ORT, MONTAGEHOEHE]),
    (_K("Wallbox", "Leerrohr-Vorbereitung"), [[{}, {"k": "Tiefgarage", "t": "Montage in Tiefgarage an Stahlbetonwand/Stütze, Leitungsführung auf Rinne.", "fh": 1.1, "mat": 20},
                                               {"k": "Außenwand/Carport", "t": "Montage im Außenbereich mit Witterungsschutz bzw. Standsäule.", "fh": 1.2, "mat": 180}], ORT_KLEIN]),
    (_K("Leistungsschalter", "Lasttrennschalter", "Hauptverteilung", "RCM"), [ORT_KLEIN]),
    (_K("Fehlerstrom", "FI/LS", "Leitungsschutzschalter", "Brandschutzschalter"), [[{}, {"k": "Nachrüstung Bestand", "t": "Nachrüstung in vorhandener Verteilung inkl. Anpassung der Verdrahtung.", "fh": 1.6, "tags": ["altbau"]}]]),
    (_K("Bodentank", "Unterflur"), [ORT_KLEIN, MENGE]),
])
