"""Honorar (HOAI 2021, Gebäude): Honorar je Auftrag berechnen, mit der Zeiterfassung vergleichen, Angebot als PDF.

Aufträge je Projekt (Tabelle honorar_auftrag):
  art        hoai (Honorartafel § 35, Leistungsbild § 34) · stunden (nach Aufwand) · pauschal
  kosten     anrechenbare Kosten (€ netto) – von Hand oder aus der gültigen Kostenermittlung (KG 300 + KG 400 nach § 33 Abs. 2)
  zone       Honorarzone 1–5; satz: Lage in der Spanne 0 (Basishonorarsatz) … 100 (oberer Honorarsatz)
  lph        {lph1: {an: bool, p: Prozent laut Vertrag, erbracht: Prozent der Phase}} – Vorgabe § 34 Abs. 3
  umbau      Umbau-/Modernisierungszuschlag in % (§ 36), nk: Nebenkosten {art: pauschal|aufwand, p: %}
  einheit    Abrechnungseinheit der Zeiten in Minuten (Vorgabe 15 = Viertelstunde), satz_h: Stundensatz (sonst je Person)
Zeiten: bestätigte Einträge der App „Zeiten“ (zeit_eintrag) im Projekt, je Leistungsphase; Kosten = Stunden × Stundensatz
der Person (zeit_person.satz), sonst Bürosatz. Warnung, wenn die Kosten einer Phase das Honorar der Phase übersteigen.
Die Werte der Honorartafel sind Orientierungswerte (HOAI 2021) – das Honorar ist frei vereinbar.
"""
import json
import re
import math

# § 35 Abs. 1 HOAI 2021 – Honorartafel Gebäude: anrechenbare Kosten → je Honorarzone (von, bis)
TAFEL = [
    (25000, [(3120, 3657), (3657, 4339), (4339, 5412), (5412, 6094), (6094, 6631)]),
    (35000, [(4217, 4942), (4942, 5865), (5865, 7315), (7315, 8237), (8237, 8962)]),
    (50000, [(5804, 6801), (6801, 8071), (8071, 10066), (10066, 11336), (11336, 12333)]),
    (75000, [(8342, 9776), (9776, 11601), (11601, 14469), (14469, 16293), (16293, 17727)]),
    (100000, [(10790, 12644), (12644, 15005), (15005, 18713), (18713, 21074), (21074, 22928)]),
    (150000, [(15500, 18164), (18164, 21555), (21555, 26883), (26883, 30274), (30274, 32938)]),
    (200000, [(20037, 23480), (23480, 27863), (27863, 34751), (34751, 39134), (39134, 42578)]),
    (300000, [(28750, 33692), (33692, 39981), (39981, 49864), (49864, 56153), (56153, 61095)]),
    (500000, [(45232, 53006), (53006, 62900), (62900, 78449), (78449, 88343), (88343, 96118)]),
    (750000, [(64666, 75781), (75781, 89927), (89927, 112156), (112156, 126301), (126301, 137416)]),
    (1000000, [(83182, 97479), (97479, 115675), (115675, 144268), (144268, 162464), (162464, 176761)]),
    (1500000, [(119307, 139813), (139813, 165911), (165911, 206923), (206923, 233022), (233022, 253527)]),
    (2000000, [(153965, 180428), (180428, 214108), (214108, 267034), (267034, 300714), (300714, 327177)]),
    (3000000, [(220161, 258002), (258002, 306162), (306162, 381843), (381843, 430003), (430003, 467843)]),
    (5000000, [(343879, 402984), (402984, 478207), (478207, 596416), (596416, 671640), (671640, 730744)]),
    (7500000, [(493923, 578816), (578816, 686862), (686862, 856648), (856648, 964694), (964694, 1049587)]),
    (10000000, [(638277, 747981), (747981, 887604), (887604, 1107012), (1107012, 1246635), (1246635, 1356339)]),
    (15000000, [(915129, 1072416), (1072416, 1272601), (1272601, 1587176), (1587176, 1787360), (1787360, 1944648)]),
    (20000000, [(1180414, 1383298), (1383298, 1641513), (1641513, 2047281), (2047281, 2305496), (2305496, 2508380)]),
    (25000000, [(1436874, 1683837), (1683837, 1998153), (1998153, 2492079), (2492079, 2806395), (2806395, 3053358)]),
]
# § 34 Abs. 3 HOAI – Leistungsbild Gebäude: Anteil der Leistungsphasen in Prozent
LPH = [("lph1", "Grundlagenermittlung", 2), ("lph2", "Vorplanung", 7), ("lph3", "Entwurfsplanung", 15), ("lph4", "Genehmigungsplanung", 3),
       ("lph5", "Ausführungsplanung", 25), ("lph6", "Vorbereitung der Vergabe", 10), ("lph7", "Mitwirkung bei der Vergabe", 4),
       ("lph8", "Objektüberwachung", 32), ("lph9", "Objektbetreuung", 2)]
ZONEN = ["I", "II", "III", "IV", "V"]


def satz_text(satz, kurz=False):
    """Honorarsatz in Worten: 0 Basishonorarsatz, 50 Mittelsatz, 100 oberer Honorarsatz, sonst „x % der Spanne …“."""
    s = _f(satz)
    if not s:
        return "Basishonorarsatz"
    if abs(s - 50) < 1e-9:
        return "Mittelsatz"
    if abs(s - 100) < 1e-9:
        return "oberer Honorarsatz"
    z = f"{s:g}".replace(".", ",") + " %"
    return z + (" der Spanne" if kurz else " der Spanne zwischen Basis- und oberem Honorarsatz")
MWST = 19.0


def _f(v, d=0.0):
    """Zahl aus Eingabe: „850.000,50“, „850000,5“, „1.250.000“ oder 850000.5"""
    import re
    if isinstance(v, str):
        t = v.strip().replace(" ", "").replace("€", "").replace("%", "")
        if "," in t:
            t = t.replace(".", "").replace(",", ".")
        elif re.fullmatch(r"\d{1,3}(\.\d{3})+", t):
            t = t.replace(".", "")
        v = t
    try:
        x = float(v) if v not in (None, "") else d
        return x if math.isfinite(x) else d
    except (TypeError, ValueError):
        return d


def tafel(kosten, zone):
    """(von, bis) für anrechenbare Kosten und Honorarzone (1–5), linear zwischen den Tafelwerten (§ 13).
    Außerhalb der Tafel (unter 25.000 € / über 25 Mio. €): None – dort ist das Honorar frei zu vereinbaren."""
    k, z = _f(kosten), max(1, min(5, int(_f(zone, 3)))) - 1
    if k < TAFEL[0][0] or k > TAFEL[-1][0]:
        return None
    for (k1, w1), (k2, w2) in zip(TAFEL, TAFEL[1:]):
        if k1 <= k <= k2:
            t = (k - k1) / (k2 - k1)
            return tuple(round(w1[z][i] + (w2[z][i] - w1[z][i]) * t, 2) for i in (0, 1))
    return tuple(float(x) for x in TAFEL[-1][1][z])


def anrechenbar(kg300, kg400):
    """§ 33 Abs. 2: Kosten der Technischen Anlagen (KG 400) voll bis 25 % der sonstigen anrechenbaren Kosten, darüber zur Hälfte."""
    a, b = _f(kg300), _f(kg400)
    grenze = 0.25 * a
    return round(a + min(b, grenze) + max(0.0, b - grenze) * 0.5, 2)


def lph_vorgabe():
    return {k: {"an": True, "p": p, "erbracht": 0} for k, _, p in LPH}


def sauber(a):
    """Auftrag aus der Datenbank/aus dem Browser in eine verlässliche Form bringen."""
    lph = a.get("lph")
    lph = json.loads(lph) if isinstance(lph, str) and lph else (lph or {})
    out = {}
    for k, _, p in LPH:
        x = lph.get(k) if isinstance(lph.get(k), dict) else {}
        out[k] = {"an": bool(x.get("an", not lph)), "p": round(max(0.0, min(100.0, _f(x.get("p"), p))), 2),
                  "erbracht": round(max(0.0, min(100.0, _f(x.get("erbracht"), 0))), 1)}
    nk = a.get("nk")
    nk = json.loads(nk) if isinstance(nk, str) and nk else (nk or {})
    return {**a, "lph": out, "art": a.get("art") if a.get("art") in ("hoai", "stunden", "pauschal") else "hoai",
            "kosten": round(max(0.0, _f(a.get("kosten"))), 2), "zone": max(1, min(5, int(_f(a.get("zone"), 3)))),
            "satz": max(0.0, min(100.0, _f(a.get("satz"), 0))), "umbau": max(0.0, min(100.0, _f(a.get("umbau"), 0))),
            "nk": {"art": nk.get("art") if nk.get("art") in ("pauschal", "aufwand") else "pauschal", "p": max(0.0, min(30.0, _f(nk.get("p"), 5)))},
            "einheit": max(1, min(60, int(_f(a.get("einheit"), 15)))), "satz_h": _f(a.get("satz_h"), 0) or None,
            "pauschal": _f(a.get("pauschal"), 0) or None}


def rechne(a, zeiten=None, aufwand_nk=0.0):
    """Honorar eines Auftrags. zeiten: {art: {"min": Minuten, "kosten": €}} aus der Zeiterfassung (optional).
    → {grund, spanne, phasen: [...], summe_lph, umbau, nk, netto, mwst, brutto, erbracht, ist_min, ist_kosten, warnungen}"""
    a = sauber(a)
    zeiten = zeiten or {}
    w, warn = [], []
    sp = tafel(a["kosten"], a["zone"]) if a["art"] == "hoai" else None
    if a["art"] == "hoai" and sp is None and a["kosten"] > 0:
        warn.append("Anrechenbare Kosten außerhalb der Honorartafel (25.000 € bis 25 Mio. €) – Honorar frei vereinbaren.")
    grund = round(sp[0] + (sp[1] - sp[0]) * a["satz"] / 100, 2) if sp else 0.0
    phasen, summe_lph, erbracht = [], 0.0, 0.0
    for k, name, vorgabe in LPH:
        x = a["lph"][k]
        hon = round(grund * x["p"] / 100, 2) if x["an"] and a["art"] == "hoai" else 0.0
        z = zeiten.get(k) or {}
        ph = {"key": k, "name": name, "vorgabe": vorgabe, **x, "honorar": hon, "ist_min": z.get("min", 0), "ist_kosten": round(z.get("kosten", 0), 2)}
        if hon and ph["ist_kosten"] > hon:
            warn.append(f"{name}: Aufwand {ph['ist_kosten']:,.0f} € übersteigt das Honorar der Phase ({hon:,.0f} €).".replace(",", "."))
        summe_lph += hon
        erbracht += hon * x["erbracht"] / 100
        phasen.append(ph)
    if a["art"] == "pauschal":
        summe_lph = a["pauschal"] or 0.0
    ist_min = sum(v.get("min", 0) for v in zeiten.values())
    ist_kosten = round(sum(v.get("kosten", 0) for v in zeiten.values()), 2)
    if a["art"] == "stunden":
        summe_lph = round(sum(v.get("abrechnung", v.get("kosten", 0)) for v in zeiten.values()), 2)
    umbau = round(summe_lph * a["umbau"] / 100, 2) if a["art"] == "hoai" else 0.0
    nk = round((summe_lph + umbau) * a["nk"]["p"] / 100, 2) if a["nk"]["art"] == "pauschal" else round(_f(aufwand_nk), 2)
    netto = round(summe_lph + umbau + nk, 2)
    if a["art"] in ("hoai", "pauschal") and netto and ist_kosten > summe_lph + umbau:
        warn.append(f"Der Aufwand laut Zeiterfassung ({ist_kosten:,.0f} €) übersteigt das Honorar ({summe_lph + umbau:,.0f} €).".replace(",", "."))
    mwst = round(netto * MWST / 100, 2)
    return {"art": a["art"], "grund": grund, "spanne": sp, "phasen": phasen, "summe_lph": round(summe_lph, 2), "umbau": umbau, "nk": nk,
            "netto": netto, "mwst": mwst, "brutto": round(netto + mwst, 2), "erbracht": round(erbracht * (1 + a["umbau"] / 100), 2),
            "ist_min": ist_min, "ist_kosten": ist_kosten, "warnungen": warn}


def aufrunden(minuten, einheit):
    """Abrechnung je Eintrag auf die Einheit aufrunden (Vorgabe Viertelstunde)."""
    e = max(1, int(einheit or 15))
    return int(math.ceil(max(0, minuten) / e) * e)


def zeiten_projekt(c, pid, einheit=15, satz_h=None, satz_buero=None):
    """Bestätigte bzw. erfasste Zeiten des Projekts je Tätigkeit: {art: {min, abr_min, kosten, abrechnung, personen}}"""
    from . import zeiten as Z
    satz_buero = satz_buero if satz_buero is not None else Z.buero_satz(c)
    personen = {r["user_id"]: r["satz"] for r in c.execute("SELECT user_id, satz FROM zeit_person").fetchall()}
    namen = {r["id"]: r["name"] for r in c.execute("SELECT id, name FROM users").fetchall()}
    out = {}
    for r in c.execute("SELECT user_id, von, bis, art FROM zeit_eintrag WHERE project_id=?", (pid,)).fetchall():
        a, b = Z.h2m(r["von"]), Z.h2m(r["bis"])
        if a is None or b is None or b <= a:
            continue
        m = b - a
        s = personen.get(r["user_id"]) or satz_buero or 0
        x = out.setdefault(r["art"] or "sonst", {"min": 0, "abr_min": 0, "kosten": 0.0, "abrechnung": 0.0, "personen": {}})
        x["min"] += m
        x["abr_min"] += aufrunden(m, einheit)
        x["kosten"] += m / 60 * s
        x["abrechnung"] += aufrunden(m, einheit) / 60 * (satz_h or s)
        p = x["personen"].setdefault(namen.get(r["user_id"], "?"), 0)
        x["personen"][namen.get(r["user_id"], "?")] = p + m
    for x in out.values():
        x["kosten"], x["abrechnung"] = round(x["kosten"], 2), round(x["abrechnung"], 2)
    return out


def kosten_aus_kostenermittlung(c, pid):
    """Anrechenbare Kosten aus der gültigen Kostenermittlung (Baukosten) des Projekts: (Betrag, Beschreibung) oder (None, Grund)."""
    from . import kosten
    bk, k = kosten.kostenermittlung(c, pid)
    if not bk:
        return None, k
    a, b = k.get("kg300") or 0, k.get("kg400") or 0
    if not (a or b):
        return None, f"Die Kostenermittlung „{bk['name']}“ enthält noch keine Kosten in KG 300/400."
    return anrechenbar(a, b), f"„{bk['name']}“: KG 300 {a:,.0f} € + KG 400 {b:,.0f} € (§ 33 Abs. 2)".replace(",", ".")


# ---------------------------------------------------------------- Abschlags- und Schlussrechnung (§ 15 HOAI)
RE_ART = {"abschlag": "Abschlagsrechnung", "schluss": "Schlussrechnung"}


def abrechnung(a, k, frueher=(), anteil=None, fremd=()):
    """Rechnungsbetrag aus der bis heute erbrachten Leistung (kumuliert) abzüglich der bisherigen Rechnungen.
    a: Auftrag, k: rechne(a, …), frueher: [{nr, art, datum, betrag, status, bezahlt, bezahlt_am}] (gestellte, nicht stornierte),
    anteil: bei Pauschalhonorar der erbrachte Anteil in %, fremd: weiterberechnete Fachplaner-Rechnungen kumuliert (honorar_fremd.zeilen).
    → Stand (JSON-fähig) für Rechnung und Erläuterung."""
    a = sauber(a)
    zeilen, umbau = [], 0.0
    if a["art"] == "hoai":
        for p in k["phasen"]:
            if p["an"] and p["honorar"]:
                zeilen.append({"key": p["key"], "name": p["name"], "p": p["p"], "honorar": p["honorar"], "erbracht": p["erbracht"],
                               "betrag": round(p["honorar"] * p["erbracht"] / 100, 2)})
        lph = round(sum(z["betrag"] for z in zeilen), 2)
        umbau = round(lph * a["umbau"] / 100, 2)
        anteil = round(lph / k["summe_lph"] * 100, 1) if k["summe_lph"] else 0.0
    elif a["art"] == "pauschal":
        anteil = round(max(0.0, min(100.0, _f(anteil, 0))), 1)
        lph = round(k["summe_lph"] * anteil / 100, 2)
    else:   # nach Aufwand: abgerechnete Zeiten bis heute
        anteil, lph = None, k["summe_lph"]
    nk = round((lph + umbau) * a["nk"]["p"] / 100, 2) if a["nk"]["art"] == "pauschal" else k["nk"]
    fz = [dict(x) for x in fremd or ()]
    fremd_sum = round(sum(_f(x.get("betrag")) for x in fz), 2)
    kum = round(lph + umbau + nk + fremd_sum, 2)
    fr = [{f: x.get(f) for f in ("nr", "art", "datum", "betrag", "status", "bezahlt", "bezahlt_am")} for x in frueher]
    bisher = round(sum(_f(x["betrag"]) for x in fr), 2)
    betrag = round(kum - bisher, 2)
    mwst = round(betrag * MWST / 100, 2)
    return {"art": a["art"], "kosten": a["kosten"], "zone": a["zone"], "satz": a["satz"], "grund": k["grund"], "summe_lph": k["summe_lph"],
            "netto_gesamt": k["netto"], "zeilen": zeilen, "anteil": anteil, "lph": lph, "umbau_p": a["umbau"], "umbau": umbau,
            "nk_art": a["nk"]["art"], "nk_p": a["nk"]["p"], "nk": nk, "fremd": fz, "fremd_summe": fremd_sum, "kum": kum, "frueher": fr, "bisher": bisher,
            "betrag": betrag, "mwst_p": MWST, "mwst": mwst, "brutto": round(betrag + mwst, 2), "ist_min": k.get("ist_min", 0)}


def re_nummer(muster, jahr, lfd):
    """Rechnungsnummer aus dem Muster des Büros, z. B. „{jahr}-{lfd:03}“ → 2026-007, „HR{jahr2}/{lfd}“ → HR26/7."""
    try:
        return (muster or "{jahr}-{lfd:03}").format(jahr=jahr, jahr2=str(jahr)[-2:], lfd=lfd)[:40]
    except (KeyError, ValueError, IndexError):
        return f"{jahr}-{lfd:03}"


STNR = re.compile(r"steuer|st\.?-?nr|\bust\b|ust\.?-?id|\bDE ?\d{9}\b|\b\d{2,3}/\d{3,4}/\d{4,5}\b", re.I)


def steuernummer_da(text):
    """Steht im Text eine Steuernummer oder USt-IdNr.? (Pflichtangabe nach § 14 Abs. 4 Nr. 2 UStG)"""
    return bool(STNR.search(text or ""))


def auftrag_anlegen(c, pid, name, von, art="hoai", status="angebot", ablauf=None, nk=5, **werte):
    """Neuer Honorarauftrag (Honorar, aus einem abgelegten Überschlag, beim Umwandeln einer Akquise) → id.
    werte: kosten, kosten_info, zone, satz, umbau."""
    import time
    aid = c.execute("INSERT INTO honorar_auftrag(project_id, name, art, status, lph, nk, datum, von, ablauf) VALUES(?,?,?,?,?,?,?,?,?) RETURNING id",
                    (pid, name[:200], art, status, json.dumps(lph_vorgabe()), json.dumps({"art": "pauschal", "p": nk}), time.strftime("%Y-%m-%d"), von,
                     json.dumps(ablauf or {}))).fetchone()["id"]
    if werte:
        a = sauber({"art": art, **werte})
        c.execute("UPDATE honorar_auftrag SET kosten=?, kosten_info=?, zone=?, satz=?, umbau=? WHERE id=?",
                  (a["kosten"], str(werte.get("kosten_info") or "")[:300], a["zone"], a["satz"], a["umbau"], aid))
    return aid
