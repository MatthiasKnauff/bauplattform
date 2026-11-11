"""Rechentests der Zeiterfassung (bpcore/zeiten.py): Feiertage NRW, Vorschläge aus dem Puls, Pausenregel, Sollzeit, Ist aus der Tageszeile.
Ohne Datenbank – geprüft werden die reinen Rechenfunktionen.
"""
from bpcore import zeiten as Z
from lib import gleich, pruefe


def test_feiertage_nrw():
    f = Z.feiertage(2026)
    gleich(Z.ostern(2026).isoformat(), "2026-04-05", "Ostersonntag 2026")
    for t, n in (("2026-04-03", "Karfreitag"), ("2026-04-06", "Ostermontag"), ("2026-05-14", "Christi Himmelfahrt"), ("2026-05-25", "Pfingstmontag"),
                 ("2026-06-04", "Fronleichnam"), ("2026-11-01", "Allerheiligen"), ("2026-12-26", "2. Weihnachtstag")):
        gleich(f.get(t), n, t)
    gleich(Z.ostern(2027).isoformat(), "2027-03-28", "Ostersonntag 2027")


def test_soll_und_arbeitstage():
    P = {**Z.PERSON, "soll_woche": 40.0, "tage": "01234"}
    gleich(Z.soll_min(P, "2026-11-09"), 480, "Montag 8 h")
    gleich(Z.soll_min(P, "2026-11-07"), 0, "Samstag frei")
    gleich(Z.soll_min(P, "2026-11-01"), 0, "Allerheiligen (Sonntag) frei")
    gleich(Z.soll_min(P, "2026-12-25"), 0, "Weihnachten frei")
    P4 = {**P, "soll_woche": 32.0, "tage": "0123"}
    gleich(Z.soll_min(P4, "2026-11-12"), 480, "4-Tage-Woche: Donnerstag 8 h")
    gleich(Z.soll_min(P4, "2026-11-13"), 0, "4-Tage-Woche: Freitag frei")


def test_leistungsphase_aus_app():
    gleich(Z.art_von("ava", "lv", 5), "lph6", "LV → LPh 6")
    gleich(Z.art_von("ava", "angebote", 5), "lph7", "Angebote → LPh 7")
    gleich(Z.art_von("ava", "rechnungen", 5), "lph8", "Rechnungen → LPh 8")
    gleich(Z.art_von("bautagebuch", "", 5), "lph8", "Bautagebuch → LPh 8")
    gleich(Z.art_von("ava", "lv", None), "buero", "ohne Projekt → Büro")
    gleich(Z.art_von("portal", "", 5), "buero", "Startseite → Büro")


def test_bloecke_aus_puls():
    M = {}
    for m in range(480, 570):
        M[m] = (1, "lph6", "puls")
    for m in range(570, 572):   # 2 Minuten kurz in einem anderen Projekt
        M[m] = (2, "lph8", "puls")
    for m in range(572, 600):
        M[m] = (1, "lph6", "puls")
    for m in range(606, 640):   # 6 Minuten Lücke im selben Projekt → wird geschlossen
        M[m] = (1, "lph6", "puls")
    B = Z.bloecke_aus(M)
    gleich(len(B), 1, "kurzes Hineinschauen und kleine Lücke verschwinden")
    gleich((B[0]["von"], B[0]["bis"], B[0]["project_id"]), (480, 640, 1), "ein Block 8:00–10:40")
    M2 = {m: (1, "lph6", "puls") for m in range(480, 540)}
    M2.update({m: (2, "lph8", "vorort") for m in range(600, 700)})
    B2 = Z.bloecke_aus(M2)
    gleich([(b["von"], b["bis"], b["quelle"]) for b in B2], [(480, 540, "puls"), (600, 700, "vorort")], "Büro und Baustelle getrennt")


def test_ausschneiden():
    B = [{"von": 480, "bis": 720, "project_id": 1, "art": "lph6", "quelle": "puls"}]
    R = Z._minus(B, [(540, 600)])
    gleich([(b["von"], b["bis"]) for b in R], [(480, 540), (600, 720)], "erfasste Zeit wird aus dem Vorschlag geschnitten")
    gleich(Z._minus(B, [(480, 720)]), [], "ganz belegt → kein Vorschlag")


def test_pause():
    gleich(Z.pause_min([(480, 720), (765, 1020)], 480, 1020), 45, "Lücke 45 Min., 8:15 h Arbeit")
    gleich(Z.pause_min([(480, 1020)], 480, 1020), 30, "ohne Lücke: gesetzlich 30 Min. bei über 6 h")
    gleich(Z.pause_min([(420, 1020)], 420, 1020), 45, "über 9 h: 45 Min.")
    gleich(Z.pause_min([(480, 780)], 480, 780), 0, "5 h: keine Pause nötig")
    gleich(Z.pause_min([(480, 600), (610, 780)], 480, 780), 0, "10 Min. Lücke zählt nicht als Pause")


def test_ist_aus_zeile():
    P = {**Z.PERSON}
    r = {"tag": "2026-11-09", "kommen": "07:30", "gehen": "16:30", "pause": 45, "abw": "", "bestaetigt": "x"}
    gleich(Z.ist_aus_zeile(P, r), 495, "9 h − 45 Min.")
    gleich(Z.ist_aus_zeile(P, {**r, "abw": "urlaub", "bestaetigt": ""}), 480, "Urlaub = Soll")
    gleich(Z.ist_aus_zeile(P, {**r, "abw": "urlaub_halb"}), 495 + 240, "halber Urlaubstag + Arbeit")
    gleich(Z.ist_aus_zeile(P, {**r, "abw": "frei", "bestaetigt": ""}), 0, "Ausgleich: nichts gutgeschrieben")
    pruefe(Z.h2m("25:00") is None and Z.h2m("07:05") == 425 and Z.m2h(425) == "07:05", "Uhrzeiten")


def test_bloecke_ruhig():
    """Hin und her zwischen zwei Projekten (alle 10 Minuten) ergibt wenige ruhige Blöcke von mindestens 30 Minuten statt vieler Schnipsel."""
    M = {}
    for m in range(480, 600):
        M[m] = (1, "lph6", "puls") if (m - 480) // 10 % 2 == 0 else (2, "lph8", "puls")
    for m in range(600, 720):   # danach zwei Stunden ruhig an Projekt 2, mit kurzem Blick in Projekt 3
        M[m] = (3, "lph5", "puls") if 650 <= m < 653 else (2, "lph8", "puls")
    B = Z.bloecke_aus(M)
    pruefe(len(B) <= 4, f"zu viele Blöcke: {[(b['von'], b['bis'], b['project_id']) for b in B]}")
    pruefe(all(b["bis"] - b["von"] >= Z.BLOCK_MIN for b in B), "jeder Block mindestens 30 Minuten")
    gleich((B[0]["von"], B[-1]["bis"]), (480, 720), "der Tag bleibt vollständig abgedeckt")
    gleich(B[-1]["project_id"], 2, "der lange Block am Ende gehört zu Projekt 2")
    gleich(sum(b["bis"] - b["von"] for b in B), 240, "keine Minute geht verloren oder doppelt")


def test_takt_runden():
    """Takt: Vorschläge auf die Viertelstunde, kurze Reste gehen im Nachbarn auf, gleiche Nachbarn werden ein Block."""
    gleich([Z.runden(m, 15) for m in (483, 487, 488, 600)], [480, 480, 495, 600], "auf die nächste Viertelstunde")
    B = [{"von": 483, "bis": 587, "project_id": 1, "art": "lph8", "quelle": "puls"},
         {"von": 587, "bis": 641, "project_id": 1, "art": "lph8", "quelle": "puls"},
         {"von": 641, "bis": 649, "project_id": None, "art": "buero", "quelle": "puls"},
         {"von": 649, "bis": 712, "project_id": 2, "art": "lph5", "quelle": "puls"}]
    R = Z.im_takt(B, 15)
    gleich([(b["von"], b["bis"], b["project_id"]) for b in R], [(480, 645, 1), (645, 705, 2)], "Tierheim 08:00–10:45, Schule 10:45–11:45")


def test_ordnen():
    """Erfasste Zeiten: gerundet, das Geänderte behält seine Zeit, Gleiches wird verbunden, Pausen verdrängen bei Vorrang."""
    E = [{"id": 1, "von": 480, "bis": 587, "project_id": 1, "art": "lph8", "quelle": "puls", "notiz": "", "updated": "a"},
         {"id": 2, "von": 587, "bis": 598, "project_id": 1, "art": "lph8", "quelle": "hand", "notiz": "Telefon", "updated": "b"},
         {"id": 3, "von": 600, "bis": 660, "project_id": 2, "art": "lph5", "quelle": "hand", "notiz": "", "updated": "c"}]
    Zt, weg, P = Z.ordnen(E, 15)
    gleich([(x["id"], x["von"], x["bis"]) for x in Zt], [(1, 480, 600), (3, 600, 660)], "08:00–10:00 eine Zeile, Projekt 2 danach")
    gleich(weg, [2], "die angehängte Zeile geht in der ersten auf")
    pruefe("Telefon" in Zt[0]["notiz"], "Notiz bleibt erhalten")
    E2 = E[:1] + [{**E[2], "von": 540, "bis": 630}]   # Projekt 2 wird in Projekt 1 hineingezogen
    Zt, weg, _ = Z.ordnen(E2, 15, vorrang=3)
    gleich([(x["id"], x["von"], x["bis"]) for x in Zt], [(1, 480, 540), (3, 540, 630)], "der Nachbar wird gekürzt, nicht überlappt")
    Zt, weg, P = Z.ordnen(E[:1], 15, pausen=[[525, 555]], p_vorrang=True)
    gleich(([(x["von"], x["bis"]) for x in Zt], P), ([(480, 525), (555, 585)], [[525, 555]]), "Pause hineingezogen: die Zeit wird geteilt")
    pruefe(Zt[1]["id"] is None, "der zweite Teil ist eine neue Zeile")
    Zt, weg, P = Z.ordnen(E[:1], 15, pausen=[[525, 555]])
    gleich(([(x["von"], x["bis"]) for x in Zt], P), ([(480, 585)], []), "ohne Vorrang behält die Zeit ihren Platz, die Pause weicht")


def test_pause_vorgabe():
    B = {"beginn": "12:00", "dauer": 30, "modus": "immer"}
    gleich(Z.pause_vorgabe({"pause": ""}, B), {"beginn": 720, "dauer": 30, "modus": "immer"}, "wie das Büro")
    gleich(Z.pause_vorgabe({"pause": "12:30/45"}, B)["beginn"], 750, "eigene Pause")
    gleich(Z.pause_vorgabe({"pause": "-"}, B), None, "keine Pause")
    gleich([Z.pause_text(x) for x in ("1230/45", "12.30/45", "-", "quatsch", "")], ["12:30/45", "12:30/45", "-", "", ""], "Eingabe der Personenpause")
    gleich(Z.pausen_pruefen([["12:00", "12:30"], [800, 790], "x"]), [[720, 750]], "Pausen geprüft")
