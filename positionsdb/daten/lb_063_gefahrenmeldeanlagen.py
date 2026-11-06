# LB 063 Gefahrenmeldeanlagen, Sprech- und Türsysteme (eigene Texte, Preisstand 11/2026)
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tga_achsen import *  # noqa: E402,F401,F403


LBS = [{
    "nr": "063", "name": "Gefahrenmeldeanlagen", "atv": "DIN 18382", "lohn": "elektro",
    "gruppen": [
        {"name": "Rauchwarnmelder, Brandmeldeanlage", "positionen": [
            {"kurz": "Rauchwarnmelder DIN EN 14604, {art}",
             "lang": "Rauchwarnmelder nach DIN EN 14604 mit Q-Kennzeichen, 10-Jahres-Lithiumbatterie, {art}, an Decke "
                     "montieren nach DIN 14676, Funktionsprüfung und Dokumentation.",
             "einheit": "St", "kg": "456", "gen": "A",
             "varianten": [{"art": "Einzelgerät", "h": 0.3, "mat": 28}, {"art": "funkvernetzbar", "h": 0.4, "mat": 62}]},
            {"kurz": "Brandmelderzentrale nach DIN EN 54-2, {r} Ringe",
             "lang": "Brandmelderzentrale nach DIN EN 54-2/-4 mit Notstromversorgung, {r} Ringleitungen, Feuerwehr-"
                     "Bedienfeld, Feuerwehr-Anzeigetableau und Schlüsseldepot-Ansteuerung, Programmierung und Inbetriebnahme. "
                     "Aufschaltung zur Feuerwehr gesondert.",
             "einheit": "St", "kg": "456", "gen": "C",
             "varianten": [{"r": "2", "h": 24, "mat": 6800}, {"r": "4", "h": 36, "mat": 11500}]},
            {"kurz": "Automatischer Brandmelder Ring, {art}",
             "lang": "Automatischer Brandmelder für Ringbus mit Sockel, {art}, montieren, adressieren und prüfen; "
                     "Ringleitung anteilig bis 8 m J-Y(St)Y 2 × 2 × 0,8 rot.",
             "einheit": "St", "kg": "456", "gen": "B",
             "varianten": [{"art": "optischer Rauchmelder", "h": 1.0, "mat": 115}, {"art": "Mehrkriterienmelder (O/T)", "h": 1.0, "mat": 165},
                           {"art": "Melder in Zwischendecke mit Parallelanzeige", "h": 1.6, "mat": 200}]},
            {"kurz": "Handfeuermelder, Druckknopfmelder rot",
             "lang": "Nichtautomatischer Brandmelder (Druckknopfmelder) rot nach DIN EN 54-11, Aufputz, adressierbar, "
                     "montieren und anschließen.",
             "einheit": "St", "kg": "456", "h": 1.0, "mat": 120, "gen": "A"},
            {"kurz": "Signalgeber Sirene/Blitzleuchte Ring",
             "lang": "Akustischer bzw. optischer Alarmgeber (Sirene mit Blitzleuchte) nach DIN EN 54-3/-23, ringgespeist, montieren.",
             "einheit": "St", "kg": "456", "h": 0.9, "mat": 145, "gen": "A"},
            {"kurz": "Feststellanlage für Brandschutztür mit Rauchschalter",
             "lang": "Feststellanlage nach DIN 14677 für Feuer-/Rauchschutztür: Haftmagnet, Deckenrauchmelder bzw. "
                     "Sturzrauchschalter, Handauslösetaster, Netzteil, Abnahmeprüfung.",
             "einheit": "St", "kg": "456", "h": 4, "mat": 620, "gen": "B"},
        ]},
        {"name": "Einbruchmelde-, Tür- und Videosysteme", "positionen": [
            {"kurz": "Einbruchmeldeanlage Funk, Einfamilienhaus, Grundausstattung",
             "lang": "Einbruchmeldeanlage (Funk, VdS-Home bzw. Klasse 2) mit Zentrale, Bedienteil, 6 Öffnungsmeldern, "
                     "3 Bewegungsmeldern, Innen- und Außensirene, App-Anbindung, Programmierung und Einweisung.",
             "einheit": "psch", "kg": "456", "h": 12, "mat": 1650, "gen": "C"},
            {"kurz": "Video-Türsprechanlage IP/2-Draht, {n} Wohneinheiten",
             "lang": "Video-Türsprechanlage mit Außenstation (Kamera, Klingeltaster, Lautsprecher, Namensschild) in "
                     "Edelstahl, Netzgerät und {n} Innenstation(en) mit Farbdisplay, Türöffnerfunktion, Verkabelung anteilig, "
                     "Inbetriebnahme.",
             "einheit": "St", "kg": "455", "gen": "C",
             "varianten": [{"n": "1", "h": 8, "mat": 980}, {"n": "6", "h": 26, "mat": 3800}, {"n": "12", "h": 44, "mat": 6600}]},
            {"kurz": "Audio-Wohnungsstation zusätzlich",
             "lang": "Zusätzliche Audio-Innenstation für vorhandene Türsprechanlage, montieren, anschließen, programmieren.",
             "einheit": "St", "kg": "455", "h": 1.5, "mat": 140, "gen": "B"},
            {"kurz": "Elektrischer Türöffner mit Anschluss",
             "lang": "Elektrischer Türöffner 12 V AC/DC mit Rückhaltefunktion in Türzarge einbauen und an Sprechanlage anschließen.",
             "einheit": "St", "kg": "455", "h": 1.5, "mat": 85, "gen": "A"},
            {"kurz": "Videoüberwachung IP-Kamera außen, PoE, mit Rekorderanteil",
             "lang": "IP-Kamera Außen IP67 mit Infrarot, 4 MP, PoE, montieren und einrichten, anteilig Netzwerkrekorder. "
                     "Datenschutzhinweise (DSGVO) beachten.",
             "einheit": "St", "kg": "456", "h": 2.5, "mat": 320, "gen": "C"},
            {"kurz": "Zutrittskontrolle Leser mit Steuerung, je Tür",
             "lang": "Zutrittskontrolle je Tür: RFID-Leser, Türsteuerung, Anbindung an Motorschloss bzw. Türöffner, "
                     "Software-Lizenz anteilig, Programmierung.",
             "einheit": "St", "kg": "456", "h": 5, "mat": 950, "gen": "C"},
            {"kurz": "Notrufanlage barrierefreies WC (Zugtaster, Signal, Abstelltaster)",
             "lang": "Notrufsystem für barrierefreie WC-Anlagen nach DIN VDE 0834: Zugtaster an der Decke, Abstelltaster "
                     "im Raum, Zimmersignalleuchte außen, Netzteil und Weiterleitung an ständig besetzte Stelle.",
             "einheit": "St", "kg": "456", "h": 4, "mat": 420, "gen": "B"},
        ]},
    ],
}]

# ---------------------------------------------------------------- Runde 2
LBS[0]["gruppen"] += [
    {"name": "Brandmeldeanlage – Peripherie, Feuerwehr", "positionen": [
        {"kurz": "Feuerwehr-Peripherie: FSD, FBF/FAT, Freischaltelement, psch",
         "lang": "Feuerwehrperipherie nach DIN 14675 bzw. örtlichen TAB: Feuerwehrschlüsseldepot mit Freischaltelement, "
                 "Feuerwehr-Bedienfeld und -Anzeigetableau, Blitzleuchte, Anschluss an die Brandmelderzentrale, Abnahme vorbereiten.",
         "einheit": "psch", "kg": "456", "h": 20, "mat": 5200, "gen": "C"},
        {"kurz": "Übertragungseinrichtung (ÜE) zur Feuerwehr, Aufschaltung",
         "lang": "Übertragungseinrichtung für Brandmeldungen an die alarmauslösende Stelle (IP/Mobilfunk), montieren, "
                 "anschließen, Aufschaltung koordinieren; Gebühren des Konzessionärs gesondert.",
         "einheit": "St", "kg": "456", "h": 6, "mat": 1600, "gen": "C"},
        {"kurz": "Parallelanzeige für Melder in Zwischendecke/-boden",
         "lang": "Parallelanzeige für verdeckt montierte Melder, Leitung bis 10 m, beschriftet, montieren und anschließen.",
         "einheit": "St", "kg": "456", "h": 0.8, "mat": 28, "gen": "A"},
        {"kurz": "Rauchansaugsystem (RAS) für {m} m² Überwachungsfläche",
         "lang": "Rauchansaugsystem mit Auswerteeinheit und Ansaugrohrnetz für bis {m} m² Überwachungsfläche, "
                 "Projektierung und Berechnung der Ansaugöffnungen, Inbetriebnahme.",
         "einheit": "St", "kg": "456", "gen": "C",
         "varianten": [{"m": "500", "h": 16, "mat": 2900}, {"m": "1.500", "h": 28, "mat": 4800}]},
        {"kurz": "Brandmeldeleitung 2 × 2 × 0,8 BMA rot",
         "lang": "Brandmeldeleitung 2 × 2 × 0,8 rot, im Ring verlegt, mit Befestigung.",
         "einheit": "m", "kg": "456", "h": 0.08, "mat": 0.9, "gen": "A"},
        {"kurz": "Inbetriebnahme und Abnahme BMA nach DIN 14675, je Melder",
         "lang": "Inbetriebnahme der Brandmeldeanlage, Programmierung, Melderprüfung, Dokumentation, Feuerwehrlaufkarten, "
                 "Begleitung der Abnahme durch Sachverständigen; Abrechnung je Melder.",
         "einheit": "St", "kg": "456", "h": 0.5, "mat": 12, "gen": "B"},
        {"kurz": "Wartung/Inspektion Brandmeldeanlage, je Melder und Jahr",
         "lang": "Inspektion und Wartung nach DIN VDE 0833-2 und DIN 14675 (vierteljährlich Inspektion, jährlich Wartung), je Melder.",
         "einheit": "St", "kg": "456", "h": 0.25, "mat": 1, "gen": "B"},
    ]},
    {"name": "Einbruchmeldetechnik, Video", "positionen": [
        {"kurz": "EMA-Zentrale VdS Klasse {k} mit Bedienteil",
         "lang": "Einbruchmelderzentrale VdS Klasse {k} mit Notstromversorgung, Bedienteil, Übertragungsgerät, montieren, "
                 "programmieren und in Betrieb nehmen.",
         "einheit": "St", "kg": "456", "gen": "C",
         "varianten": [{"k": "A", "h": 8, "mat": 1100}, {"k": "B", "h": 12, "mat": 1900}, {"k": "C", "h": 16, "mat": 3200}]},
        {"kurz": "EMA-Melder {art}, verdrahtet",
         "lang": "Einbruchmelder {art}, VdS-anerkannt, mit Leitung bis 20 m zur Zentrale, montieren, anschließen und prüfen.",
         "einheit": "St", "kg": "456", "gen": "B",
         "varianten": [{"art": "Bewegungsmelder Dual (PIR/Mikrowelle)", "h": 1.2, "mat": 95}, {"art": "Magnetkontakt Fenster/Tür", "h": 0.9, "mat": 28},
                       {"art": "Glasbruchmelder passiv", "h": 0.9, "mat": 55}, {"art": "Riegelschaltkontakt", "h": 1.2, "mat": 45},
                       {"art": "Außensirene mit Blitzleuchte", "h": 1.5, "mat": 180}]},
        {"kurz": "IP-Kamera {art}, PoE, inkl. Einrichtung",
         "lang": "Netzwerk-Kamera {art}, Auflösung mind. 4 MP, Nachtsicht, PoE, montieren, ausrichten, Datenschutz-Maskierung "
                 "einrichten und am Rekorder einbinden.",
         "einheit": "St", "kg": "456", "gen": "B",
         "varianten": [{"art": "Dome innen", "h": 1.5, "mat": 220}, {"art": "Bullet außen IP67", "h": 2, "mat": 290}, {"art": "PTZ außen", "h": 3, "mat": 1150}]},
        {"kurz": "Netzwerk-Videorekorder {k} Kanäle mit Festplatte",
         "lang": "Netzwerkvideorekorder für {k} Kanäle mit Festplatten (Speicherdauer nach Vorgabe), Einrichtung und Benutzerverwaltung.",
         "einheit": "St", "kg": "456", "gen": "B",
         "varianten": [{"k": "8", "h": 3, "mat": 520}, {"k": "16", "h": 4, "mat": 890}, {"k": "32", "h": 5, "mat": 1650}]},
        {"kurz": "Gefahrenmeldeanlage Bestand demontieren, je Melder",
         "lang": "Vorhandene Melder, Signalgeber bzw. Kameras abklemmen, demontieren und entsorgen, Leitungen sichern.",
         "einheit": "St", "kg": "394", "h": 0.3, "mat": 0, "geraet": 1.5, "gen": "B", "tags": ["altbau"]},
    ]},
]
_K = lambda *worte: (lambda g, p: any(w in p["kurz"] for w in worte))
HOEHE = [{}, {"k": "über 3,5 m", "t": "Montagehöhe über 3,5 m, Arbeitsbühne stellt der Auftragnehmer.", "fh": 1.3, "geraet": 3}]
zuweisen(LBS, [
    (_K("Rauchwarnmelder"), [[{}, {"k": "funkvernetzt", "t": "Funkvernetzt innerhalb der Nutzungseinheit.", "fm": 1.6}], ORT, [{}, {"k": "inkl. 10 J. Wartung", "t": "Einschließlich jährlicher Inspektion für zehn Jahre.", "mat": 28, "h": 0.5}]]),
    (_K("Automatischer Brandmelder", "Handfeuermelder", "Signalgeber", "Parallelanzeige", "EMA-Melder", "IP-Kamera"), [HOEHE, ORT]),
    (_K("Brandmeldeleitung"), [VERLEGUNG_KABEL, [{"k": "J-Y(St)Y", "t": "Leitung J-Y(St)Y ohne Funktionserhalt."}, {"k": "JE-H(St)H E30", "t": "Leitung JE-H(St)H FE180 mit Funktionserhalt E30 auf geprüftem Verlegesystem nach DIN 4102-12.", "fm": 3.0, "fh": 1.8, "mat": 2.5}], ORT_KLEIN]),
    (_K("Brandmelderzentrale", "EMA-Zentrale", "Videorekorder", "Rauchansaug", "Feststellanlage"), [ORT_KLEIN]),
    (_K("Türsprechanlage", "Wohnungsstation"), [[{}, {"k": "Design", "t": "Gerät mit Frontblende in Edelstahl- bzw. Designausführung.", "fm": 1.4}], ORT]),
    (_K("Türöffner"), [ORT]),
])
