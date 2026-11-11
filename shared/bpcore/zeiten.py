"""Zeiterfassung: Arbeitszeit und Projektzeiten – Vorschläge aus der Arbeit in der Plattform, bestätigt vom Benutzer.

Quellen der Vorschläge (nichts davon zählt, bevor der Benutzer den Tag bestätigt):
- zeit_puls: die Kopfleiste (head.js) meldet jede Minute, in der jemand aktiv in einer App arbeitet, App, Bereich und Projekt
- „vor Ort“ (vorort.py, Kurzbefehl am iPhone): erste/letzte Meldung an einer Baustelle → Baustellenzeit, davor/danach Fahrt
Aus der App (und dem Bereich der AVA) ergibt sich die Leistungsphase (HOAI); der Benutzer kann sie in jeder Zeile ändern.

Arbeitszeit = Gehen − Kommen − Pause. Pause ohne Eingabe: Lücken ab 15 Minuten, mindestens die gesetzliche Pause
(über 6 h 30 Minuten, über 9 h 45 Minuten). Urlaub/Krank/Feiertag zählen als erfüllte Sollzeit.
Saldo: Startwert + je bestätigtem (oder abwesendem) Tag Ist − Soll; offene Tage zählen erst nach dem Bestätigen.
"""
import json
from collections import Counter
from datetime import date, datetime, timedelta

try:
    from zoneinfo import ZoneInfo
    TZ = ZoneInfo("Europe/Berlin")
except Exception:   # noqa: BLE001 – ohne Zeitzonendaten: Ortszeit des Servers
    TZ = None

ARTEN = [("lph1", "LPh 1 Grundlagenermittlung"), ("lph2", "LPh 2 Vorplanung"), ("lph3", "LPh 3 Entwurfsplanung"),
         ("lph4", "LPh 4 Genehmigungsplanung"), ("lph5", "LPh 5 Ausführungsplanung"), ("lph6", "LPh 6 Vorbereitung der Vergabe"),
         ("lph7", "LPh 7 Mitwirkung bei der Vergabe"), ("lph8", "LPh 8 Objektüberwachung"), ("lph9", "LPh 9 Objektbetreuung"),
         ("fahrt", "Fahrt"), ("buero", "Büro / Organisation"), ("sonst", "Sonstiges")]
ART_NAME = dict(ARTEN)
ABW = {"urlaub": "Urlaub", "urlaub_halb": "Urlaub (halber Tag)", "krank": "Krank", "frei": "Frei / Ausgleich", "schule": "Fortbildung"}

# App (und Bereich) → Leistungsphase; ohne Projekt immer „Büro“
APP_ART = {"ava": "lph6", "ava:lv": "lph6", "ava:angebote": "lph7", "ava:auftraege": "lph8", "ava:aufmass": "lph8",
           "ava:rechnungen": "lph8", "ava:uebersicht": "lph8", "ava:tueren": "lph5", "bautagebuch": "lph8", "gantt": "lph8",
           "aufgaben": "lph8", "plaene": "lph5", "baukosten": "lph3", "baudaten": "lph6", "kommunikation": "lph8"}
LUECKE = 10      # Minuten: kürzere Lücken im selben Projekt werden geschlossen
SLOT = 15        # Minuten: je Viertelstunde zählt, woran am meisten gearbeitet wurde
BLOCK_MIN = 30   # Minuten: kürzere Blöcke gehen im Nachbarn auf (statt hin und her)
BLOCK_LUECKE = 30   # Minuten: so große Lücken werden innerhalb eines Blocks überbrückt (halbe Stunde Lesen, Telefon …)
KURZ = 5         # Minuten: kürzere Stücke gehen im Nachbarn auf
PAUSE_LUECKE = 15
FAHRT = 30       # Minuten je Richtung, wenn beim Projekt nichts eingetragen ist


def jetzt():
    return datetime.now(TZ) if TZ else datetime.now()


def heute():
    return jetzt().date().isoformat()


def m2h(m):
    return f"{int(m) // 60:02d}:{int(m) % 60:02d}"


def h2m(s):
    try:
        h, m = str(s).strip().split(":")[:2]
        v = int(h) * 60 + int(m)
        return v if 0 <= v <= 24 * 60 else None
    except (ValueError, AttributeError):
        return None


def _j(v, d):
    try:
        return json.loads(v) if v else d
    except (ValueError, TypeError):
        return d


def art_von(app, bereich, pid):
    if not pid:
        return "buero"
    return APP_ART.get(f"{app}:{bereich}") or APP_ART.get(app) or "buero"


# ------------------------------------------------------------------ Feiertage (NRW – Standort des Büros)
def ostern(j):
    a, b, c = j % 19, j // 100, j % 100
    d, e = b // 4, b % 4
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i, k = c // 4, c % 4
    l_ = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l_) // 451
    mo = (h + l_ - 7 * m + 114) // 31
    ta = ((h + l_ - 7 * m + 114) % 31) + 1
    return date(j, mo, ta)


def feiertage(j):
    o = ostern(j)
    t = lambda d: (o + timedelta(days=d)).isoformat()
    return {f"{j}-01-01": "Neujahr", t(-2): "Karfreitag", t(1): "Ostermontag", f"{j}-05-01": "Tag der Arbeit",
            t(39): "Christi Himmelfahrt", t(50): "Pfingstmontag", t(60): "Fronleichnam", f"{j}-10-03": "Tag der Deutschen Einheit",
            f"{j}-11-01": "Allerheiligen", f"{j}-12-25": "1. Weihnachtstag", f"{j}-12-26": "2. Weihnachtstag"}


def feiertag(tag):
    return feiertage(int(tag[:4])).get(tag, "")


# ------------------------------------------------------------------ Person (Sollzeit, Urlaub, Satz)
PERSON = {"soll_woche": 40.0, "tage": "01234", "urlaub": 30.0, "satz": None, "saldo_start": 0.0, "ab": "", "aus": 0}


def person(c, uid):
    r = c.execute("SELECT * FROM zeit_person WHERE user_id=?", (uid,)).fetchone()
    return {**PERSON, **({k: r[k] for k in PERSON} if r else {})}


def person_setzen(c, uid, b):
    p = person(c, uid)
    for k in ("soll_woche", "urlaub", "saldo_start"):
        if k in b:
            try:
                p[k] = max(-9999.0, min(9999.0, float(str(b[k]).replace(",", "."))))
            except (TypeError, ValueError):
                pass
    if "satz" in b:
        try:
            p["satz"] = float(str(b["satz"]).replace(",", ".")) if str(b["satz"]).strip() else None
        except (TypeError, ValueError):
            pass
    if "tage" in b:
        t = "".join(sorted({x for x in str(b["tage"]) if x in "0123456"}))
        p["tage"] = t or "01234"
    if "ab" in b:
        a = str(b["ab"] or "")[:10]
        p["ab"] = a if (not a or _tag_ok(a)) else p["ab"]
    if "aus" in b:
        p["aus"] = 1 if b["aus"] else 0
    c.execute("INSERT INTO zeit_person(user_id, soll_woche, tage, urlaub, satz, saldo_start, ab, aus) VALUES(?,?,?,?,?,?,?,?) "
              "ON CONFLICT (user_id) DO UPDATE SET soll_woche=EXCLUDED.soll_woche, tage=EXCLUDED.tage, urlaub=EXCLUDED.urlaub, "
              "satz=EXCLUDED.satz, saldo_start=EXCLUDED.saldo_start, ab=EXCLUDED.ab, aus=EXCLUDED.aus",
              (uid, p["soll_woche"], p["tage"], p["urlaub"], p["satz"], p["saldo_start"], p["ab"], p["aus"]))
    return p


def _tag_ok(t):
    try:
        date.fromisoformat(str(t)[:10])
        return len(str(t)) == 10
    except ValueError:
        return False


def soll_min(p, tag):
    d = date.fromisoformat(tag)
    if str(d.weekday()) not in p["tage"] or feiertag(tag):
        return 0
    return round(p["soll_woche"] * 60 / max(1, len(p["tage"])))


# ------------------------------------------------------------------ Puls (aus der Kopfleiste)
def puls(c, uid, app, bereich, pid, t=None):
    t = t or jetzt()
    ts = t.strftime("%Y-%m-%d %H:%M")
    try:
        pid = int(pid) if pid not in (None, "", 0, "0") else None
    except (TypeError, ValueError):
        pid = None
    c.execute("INSERT INTO zeit_puls(user_id, ts, app, bereich, project_id) VALUES(?,?,?,?,?) ON CONFLICT (user_id, ts) DO UPDATE "
              "SET app=EXCLUDED.app, bereich=EXCLUDED.bereich, project_id=EXCLUDED.project_id",
              (uid, ts, str(app or "")[:30], str(bereich or "")[:30], pid))


def aufraeumen(c, tage=60):
    grenze = (jetzt() - timedelta(days=tage)).strftime("%Y-%m-%d")
    c.execute("DELETE FROM zeit_puls WHERE ts < ?", (grenze,))


# ------------------------------------------------------------------ Vorschläge
def _vorort_alle(c, uid):
    try:
        from . import konto
        return _j(konto._get(c, f"vorort:log:{uid}"), {}) or {}
    except Exception:   # noqa: BLE001
        return {}


def _vorort(c, uid, tag):
    try:
        from . import konto
        log = _j(konto._get(c, f"vorort:log:{uid}"), {}) or {}
    except Exception:   # noqa: BLE001
        return {}
    return log.get(tag) or {}


def _fahrt(c, pid):
    r = c.execute("SELECT fahrt FROM zeit_projekt WHERE project_id=?", (pid,)).fetchone()
    return int(r["fahrt"]) if r and r["fahrt"] is not None else FAHRT


def _einfach(minuten):
    """Minuten mit gleichem Schlüssel und kleiner Lücke zu Blöcken verbinden (Baustelle, Fahrt: genau so, wie gemeldet)."""
    B = []
    for m in sorted(minuten):
        k = minuten[m]
        if B and B[-1]["key"] == k and m - B[-1]["bis"] <= LUECKE:
            B[-1]["bis"] = m + 1
        else:
            B.append({"von": m, "bis": m + 1, "key": k})
    return B


def bloecke_aus(minuten):
    """minuten: {m: (pid, art, quelle)} → ruhige Blöcke [{von, bis, project_id, art, quelle}] (bis exklusiv).

    Arbeit am Bildschirm (quelle „puls“) springt oft hin und her. Daraus werden sinnvolle Blöcke:
    1. je Viertelstunde zählt, woran am meisten gearbeitet wurde (bei Gleichstand: woran davor gearbeitet wurde),
    2. gleiche Viertelstunden hintereinander (Lücke bis BLOCK_LUECKE) werden ein Block,
    3. Blöcke unter BLOCK_MIN gehen im Nachbarn auf – bevorzugt im selben Projekt, sonst im längeren.
    Baustelle und Fahrt (vor Ort) bleiben genau, die Bildschirmzeit wird dort herausgeschnitten."""
    if not minuten:
        return []
    fest = {m: k for m, k in minuten.items() if k[2] != "puls"}
    puls = {m: k for m, k in minuten.items() if k[2] == "puls"}
    slots, erst = {}, {}
    for m in sorted(puls):
        k = puls[m]
        sl = slots.setdefault(m // SLOT, {"n": Counter(), "von": m, "bis": m + 1})
        sl["n"][k] += 1; sl["bis"] = m + 1
        erst.setdefault(k, m)
    B, vor = [], None
    for s in sorted(slots):
        sl = slots[s]
        best = max(sl["n"].values())
        kand = sorted((k for k, v in sl["n"].items() if v == best), key=lambda k: erst[k])
        k = vor if vor in kand else kand[0]
        if B and B[-1]["key"] == k and sl["von"] - B[-1]["bis"] <= BLOCK_LUECKE:
            B[-1]["bis"] = sl["bis"]
        else:
            B.append({"von": sl["von"], "bis": sl["bis"], "key": k})
        vor = k
    while True:   # kurze Blöcke im Nachbarn aufgehen lassen (der kürzeste zuerst)
        kurz = [i for i, b in enumerate(B) if b["bis"] - b["von"] < BLOCK_MIN]
        ziel = None
        for i in sorted(kurz, key=lambda i: B[i]["bis"] - B[i]["von"]):
            nb = [j for j in (i - 1, i + 1) if 0 <= j < len(B) and (B[j]["von"] - B[i]["bis"] if j > i else B[i]["von"] - B[j]["bis"]) <= BLOCK_LUECKE]
            if nb:
                ziel = (i, sorted(nb, key=lambda j: (B[j]["key"][0] != B[i]["key"][0], -(B[j]["bis"] - B[j]["von"])))[0])
                break
        if not ziel:
            break
        i, j = ziel
        B[j]["von"], B[j]["bis"] = min(B[i]["von"], B[j]["von"]), max(B[i]["bis"], B[j]["bis"])
        del B[i]
        i = 0
        while i < len(B) - 1:   # gleiche Nachbarn verbinden
            if B[i]["key"] == B[i + 1]["key"] and B[i + 1]["von"] - B[i]["bis"] <= BLOCK_LUECKE:
                B[i]["bis"] = B[i + 1]["bis"]; del B[i + 1]
            else:
                i += 1
    F = _einfach(fest)
    if F:   # Baustelle/Fahrt haben Vorrang: dort keine Bildschirmzeit
        B = [{**b, "key": b["key"]} for b in _minus([{"von": b["von"], "bis": b["bis"], "key": b["key"]} for b in B], [(f["von"], f["bis"]) for f in F])]
    out = sorted(B + F, key=lambda b: b["von"])
    return [{"von": b["von"], "bis": b["bis"], "project_id": b["key"][0], "art": b["key"][1], "quelle": b["key"][2]} for b in out]


def _naechster(tag):
    return (date.fromisoformat(tag) + timedelta(days=1)).isoformat()


def lade(c, uid, von, bis):
    """Alles für einen Zeitraum in wenigen Abfragen (Woche, Monat, Konto) – statt je Tag einzeln."""
    Z = {"puls": {}, "E": {}, "T": {}, "vorort": None, "von": von, "bis": bis}
    for r in c.execute("SELECT ts, app, bereich, project_id FROM zeit_puls WHERE user_id=? AND ts>=? AND ts<? ORDER BY ts", (uid, von, _naechster(bis))).fetchall():
        Z["puls"].setdefault(r["ts"][:10], []).append(dict(r))
    for r in c.execute("SELECT * FROM zeit_eintrag WHERE user_id=? AND tag>=? AND tag<=? ORDER BY von, id", (uid, von, bis)).fetchall():
        Z["E"].setdefault(r["tag"], []).append(dict(r))
    for r in c.execute("SELECT * FROM zeit_tag WHERE user_id=? AND tag>=? AND tag<=?", (uid, von, bis)).fetchall():
        Z["T"][r["tag"]] = dict(r)
    return Z


def _im(Z, tag):
    return Z is not None and Z["von"] <= tag <= Z["bis"]


def roh_vorschlaege(c, uid, tag, Z=None):
    """Vorschläge eines Tages ohne Rücksicht auf schon erfasste Zeiten."""
    M = {}
    rows = Z["puls"].get(tag, []) if _im(Z, tag) else c.execute("SELECT ts, app, bereich, project_id FROM zeit_puls WHERE user_id=? AND ts>=? AND ts<? ORDER BY ts", (uid, tag, _naechster(tag))).fetchall()
    for r in rows:
        m = h2m(r["ts"][11:16])
        if m is not None:
            M[m] = (r["project_id"], art_von(r["app"], r["bereich"], r["project_id"]), "puls")
    if Z is not None and Z.get("vorort") is None:
        Z["vorort"] = _vorort_alle(c, uid)
    vo = (Z["vorort"].get(tag) or {}) if Z is not None else _vorort(c, uid, tag)
    # tatsächlich erfasste Fahrten (Einsteigen/Aussteigen) ersetzen die geschätzte Fahrzeit dieser Richtung
    echt = {(r["project_id"], (_j(r["fahrt"], {}) or {}).get("richtung"))
            for r in c.execute("SELECT project_id, fahrt FROM zeit_eintrag WHERE user_id=? AND tag=? AND quelle='unterwegs'", (uid, tag)).fetchall()}
    for pid, zt in (vo or {}).items():   # Baustelle: überschreibt die Arbeit am Bildschirm
        try:
            pid = int(pid)
        except ValueError:
            continue
        a, b = h2m((zt or [None])[0]), h2m((zt or [None, None])[-1])
        if a is None:
            continue
        b = max(b or a, a + 30)
        f = _fahrt(c, pid)
        for m in range(max(0, a - f), a) if (pid, "hin") not in echt else ():
            M[m] = (pid, "fahrt", "fahrt")
        for m in range(b, min(24 * 60, b + f)) if (pid, "zurueck") not in echt else ():
            M[m] = (pid, "fahrt", "fahrt")
        for m in range(a, b):
            M[m] = (pid, "lph8", "vorort")
    return bloecke_aus(M)


def _minus(bl, belegt):
    """Bereiche aus Blöcken herausschneiden (belegt: [(von, bis)])."""
    out = []
    for b in bl:
        teile = [(b["von"], b["bis"])]
        for v, z in belegt:
            neu = []
            for a, e in teile:
                if z <= a or v >= e:
                    neu.append((a, e))
                    continue
                if v > a:
                    neu.append((a, v))
                if z < e:
                    neu.append((z, e))
            teile = neu
        out += [{**b, "von": a, "bis": e} for a, e in teile if e - a >= KURZ]
    return out


def zt(c, uid, tag, Z=None):
    if _im(Z, tag):
        r = Z["T"].get(tag)
        return dict(r) if r else {"user_id": uid, "tag": tag, "kommen": "", "gehen": "", "pause": None, "abw": "", "notiz": "", "bestaetigt": "", "ignor": "[]"}
    r = c.execute("SELECT * FROM zeit_tag WHERE user_id=? AND tag=?", (uid, tag)).fetchone()
    return dict(r) if r else {"user_id": uid, "tag": tag, "kommen": "", "gehen": "", "pause": None, "abw": "", "notiz": "", "bestaetigt": "", "ignor": "[]"}


def zt_setzen(c, uid, tag, **f):
    t = {**zt(c, uid, tag), **f}
    c.execute("INSERT INTO zeit_tag(user_id, tag, kommen, gehen, pause, abw, notiz, bestaetigt, ignor) VALUES(?,?,?,?,?,?,?,?,?) "
              "ON CONFLICT (user_id, tag) DO UPDATE SET kommen=EXCLUDED.kommen, gehen=EXCLUDED.gehen, pause=EXCLUDED.pause, abw=EXCLUDED.abw, "
              "notiz=EXCLUDED.notiz, bestaetigt=EXCLUDED.bestaetigt, ignor=EXCLUDED.ignor",
              (uid, tag, t["kommen"] or "", t["gehen"] or "", t["pause"], t["abw"] or "", t["notiz"] or "", t["bestaetigt"] or "", t["ignor"] or "[]"))
    return t


def eintraege(c, uid, tag):
    return [dict(r) for r in c.execute("SELECT * FROM zeit_eintrag WHERE user_id=? AND tag=? ORDER BY von, id", (uid, tag)).fetchall()]


def vorschlaege(c, uid, tag, E=None, T=None, Z=None):
    E = eintraege(c, uid, tag) if E is None else E
    T = zt(c, uid, tag) if T is None else T
    if T.get("bestaetigt"):
        return []
    belegt = [(h2m(e["von"]), h2m(e["bis"])) for e in E] + [(int(a), int(b)) for a, b in _j(T.get("ignor"), [])]
    belegt = [(a, b) for a, b in belegt if a is not None and b is not None]
    bl = _minus(roh_vorschlaege(c, uid, tag, Z), belegt)
    if tag == heute():   # heute: der letzte Block endet nicht in der Zukunft
        n = jetzt().hour * 60 + jetzt().minute + 1
        bl = [{**b, "bis": min(b["bis"], n)} for b in bl if b["von"] < n]
    return [{**b, "von": m2h(b["von"]), "bis": m2h(b["bis"])} for b in bl]


def pause_min(spannen, kommen, gehen):
    """Pause: Lücken ab 15 Minuten zwischen den Zeiten, mindestens die gesetzliche Pause."""
    if kommen is None or gehen is None or gehen <= kommen:
        return 0
    s = sorted((a, b) for a, b in spannen if a is not None and b is not None)
    lueck, ende = 0, kommen
    for a, b in s:
        if a - ende >= PAUSE_LUECKE:
            lueck += a - ende
        ende = max(ende, b)
    if gehen - ende >= PAUSE_LUECKE and s:
        pass   # nach dem letzten Block bis „Gehen“ ist keine Pause, sondern Arbeit ohne Plattform (z. B. Telefon)
    brutto = gehen - kommen
    gesetz = 45 if brutto - lueck > 9 * 60 else 30 if brutto - lueck > 6 * 60 else 0
    return max(lueck, gesetz)


def tag_daten(c, uid, tag, P=None, Z=None):
    P = P or person(c, uid)
    T = zt(c, uid, tag, Z)
    E = [dict(x) for x in Z["E"].get(tag, [])] if _im(Z, tag) else eintraege(c, uid, tag)
    V = vorschlaege(c, uid, tag, E, T, Z)
    alle = [(h2m(x["von"]), h2m(x["bis"])) for x in E + V]
    alle = [(a, b) for a, b in alle if a is not None and b is not None and b > a]
    k_v = min((a for a, _ in alle), default=None)
    g_v = max((b for _, b in alle), default=None)
    kommen, gehen = h2m(T["kommen"]) if T["kommen"] else k_v, h2m(T["gehen"]) if T["gehen"] else g_v
    pause = T["pause"] if T["pause"] is not None else pause_min(alle, kommen, gehen)
    arbeit = max(0, (gehen - kommen - pause)) if kommen is not None and gehen is not None else 0
    soll = soll_min(P, tag)
    abw = T["abw"] or ""
    gutschrift = _gutschrift(abw, soll)   # „frei“ (Ausgleich): Soll bleibt, der Saldo sinkt
    projekt = sum(max(0, h2m(e["bis"]) - h2m(e["von"])) for e in E if e["art"] != "pause")
    return {"tag": tag, "feiertag": feiertag(tag), "soll": soll, "kommen": m2h(kommen) if kommen is not None else "",
            "gehen": m2h(gehen) if gehen is not None else "", "kommen_v": m2h(k_v) if k_v is not None else "", "gehen_v": m2h(g_v) if g_v is not None else "",
            "kommen_fest": bool(T["kommen"]), "gehen_fest": bool(T["gehen"]), "pause": pause, "pause_fest": T["pause"] is not None,
            "arbeit": arbeit, "ist": arbeit + gutschrift, "projekt": projekt, "abw": abw, "notiz": T["notiz"], "bestaetigt": T["bestaetigt"],
            "eintraege": E, "vorschlaege": V}


def _gutschrift(abw, soll):
    return soll if abw in ("urlaub", "krank", "schule") else round(soll / 2) if abw == "urlaub_halb" else 0


def ist_aus_zeile(P, r):
    """Ist-Zeit eines bestätigten bzw. abwesenden Tages aus der gespeicherten Zeile (ohne Vorschläge neu zu rechnen)."""
    soll = soll_min(P, r["tag"])
    k, g_ = h2m(r["kommen"]), h2m(r["gehen"])
    arbeit = max(0, g_ - k - (r["pause"] or 0)) if r["bestaetigt"] and k is not None and g_ is not None else 0
    return arbeit + _gutschrift(r["abw"] or "", soll)


def bestaetigen(c, uid, tag, wer=""):
    """Alle offenen Vorschläge übernehmen, Kommen/Gehen/Pause festhalten, Tag als bestätigt markieren."""
    d = tag_daten(c, uid, tag)
    for v in d["vorschlaege"]:
        c.execute("INSERT INTO zeit_eintrag(user_id, tag, von, bis, project_id, art, quelle) VALUES(?,?,?,?,?,?,?)",
                  (uid, tag, v["von"], v["bis"], v["project_id"], v["art"], v["quelle"]))
    zt_setzen(c, uid, tag, kommen=d["kommen"], gehen=d["gehen"], pause=d["pause"], bestaetigt=jetzt().strftime("%Y-%m-%d %H:%M"))
    return tag_daten(c, uid, tag)


def beginn(c, uid):
    r = c.execute("SELECT MIN(d) AS d FROM (SELECT MIN(substr(ts, 1, 10)) AS d FROM zeit_puls WHERE user_id=? UNION ALL "
                  "SELECT MIN(tag) FROM zeit_eintrag WHERE user_id=? UNION ALL SELECT MIN(tag) FROM zeit_tag WHERE user_id=?) x", (uid, uid, uid)).fetchone()
    return (r["d"] or "") if r else ""


def offene_tage(c, uid, tage=14, P=None):
    """Vergangene Arbeitstage mit Vorschlägen oder Einträgen, die noch nicht bestätigt sind (für den Hinweis auf der Startseite)."""
    P = P or person(c, uid)
    if P["aus"]:
        return []
    h = date.fromisoformat(heute())
    von, bis = (h - timedelta(days=tage)).isoformat(), (h - timedelta(days=1)).isoformat()
    ab = P["ab"] or beginn(c, uid)   # ohne Startdatum: ab dem ersten Tag, an dem die Zeiterfassung etwas gesehen hat
    if not ab:
        return []
    if ab > von:
        von = ab
    if von > bis:
        return []
    fertig = {r["tag"] for r in c.execute("SELECT tag FROM zeit_tag WHERE user_id=? AND tag>=? AND tag<=? AND (bestaetigt<>'' OR abw<>'')", (uid, von, bis)).fetchall()}
    aktiv = {r["d"] for r in c.execute("SELECT DISTINCT substr(ts, 1, 10) AS d FROM zeit_puls WHERE user_id=? AND ts>=? AND ts<?", (uid, von, _naechster(bis))).fetchall()}
    aktiv |= {r["tag"] for r in c.execute("SELECT DISTINCT tag FROM zeit_eintrag WHERE user_id=? AND tag>=? AND tag<=?", (uid, von, bis)).fetchall()}
    out = []
    t = date.fromisoformat(bis)
    while t.isoformat() >= von:
        x = t.isoformat()
        if x not in fertig and (x in aktiv or soll_min(P, x)):
            out.append(x)
        t -= timedelta(days=1)
    return out


# ------------------------------------------------------------------ Konto (Saldo, Urlaub)
def konto(c, uid, bis=None, P=None):
    P = P or person(c, uid)
    bis = bis or heute()
    rows = {r["tag"]: dict(r) for r in c.execute("SELECT * FROM zeit_tag WHERE user_id=? AND tag<=?" + (" AND tag>=?" if P["ab"] else ""),
                                                  (uid, bis, P["ab"]) if P["ab"] else (uid, bis)).fetchall()}
    saldo = round(P["saldo_start"] * 60)
    offen = 0
    for t, r in rows.items():
        if r["bestaetigt"] or r["abw"]:
            saldo += ist_aus_zeile(P, r) - soll_min(P, t)
    j = bis[:4]
    jahr = c.execute("SELECT abw FROM zeit_tag WHERE user_id=? AND tag>=? AND tag<=? AND abw<>''", (uid, j + "-01-01", j + "-12-31")).fetchall()   # auch geplanter Urlaub
    urlaub = sum(1 if r["abw"] == "urlaub" else 0.5 if r["abw"] == "urlaub_halb" else 0 for r in jahr)
    krank = sum(1 for r in jahr if r["abw"] == "krank")
    offen = len(offene_tage(c, uid, 31, P))
    beantragt = urlaub_beantragt(c, uid, j)
    return {"saldo": saldo, "urlaub_genommen": urlaub, "urlaub_rest": P["urlaub"] - urlaub, "urlaub_beantragt": beantragt, "krank": krank, "offen": offen}


def woche(c, uid, tag, P=None):
    P = P or person(c, uid)
    d = date.fromisoformat(tag)
    mo = d - timedelta(days=d.weekday())
    Z = lade(c, uid, mo.isoformat(), (mo + timedelta(days=6)).isoformat())
    out = []
    for i in range(7):
        t = (mo + timedelta(days=i)).isoformat()
        x = tag_daten(c, uid, t, P, Z)
        out.append({k: x[k] for k in ("tag", "feiertag", "soll", "ist", "arbeit", "kommen", "gehen", "pause", "abw", "bestaetigt", "projekt")}
                   | {"vorschlaege": len(x["vorschlaege"]), "eintraege": len(x["eintraege"])})
    return out


# ------------------------------------------------------------------ Auswertung (Admins)
def buero_satz(c):
    r = c.execute("SELECT value FROM settings WHERE key='zeit_satz'").fetchone()
    try:
        return float(r["value"]) if r and str(r["value"]).strip() else None
    except (TypeError, ValueError):
        return None


def projekt_einst(c, pid):
    r = c.execute("SELECT * FROM zeit_projekt WHERE project_id=?", (pid,)).fetchone()
    return {"honorar": r["honorar"] if r else None, "soll": _j(r["soll"], {}) if r else {}, "fahrt": r["fahrt"] if r and r["fahrt"] is not None else None}


def projekt_einst_setzen(c, pid, b):
    e = projekt_einst(c, pid)
    if "honorar" in b:
        try:
            e["honorar"] = float(str(b["honorar"]).replace(".", "").replace(",", ".")) if str(b["honorar"] or "").strip() else None
        except ValueError:
            pass
    if isinstance(b.get("soll"), dict):
        s = {}
        for k, v in b["soll"].items():
            if k in ART_NAME:
                try:
                    if str(v).strip():
                        s[k] = float(str(v).replace(",", "."))
                except ValueError:
                    pass
        e["soll"] = s
    if "fahrt" in b:
        try:
            e["fahrt"] = max(0, min(240, int(b["fahrt"]))) if str(b["fahrt"]).strip() else None
        except (TypeError, ValueError):
            pass
    c.execute("INSERT INTO zeit_projekt(project_id, honorar, soll, fahrt) VALUES(?,?,?,?) ON CONFLICT (project_id) DO UPDATE SET "
              "honorar=EXCLUDED.honorar, soll=EXCLUDED.soll, fahrt=EXCLUDED.fahrt", (pid, e["honorar"], json.dumps(e["soll"]), e["fahrt"]))
    return e


def auswertung(c, pid=None):
    """Stunden je Projekt und Leistungsphase (nur bestätigte bzw. erfasste Zeiten), Kosten nach Stundensatz."""
    bs = buero_satz(c)
    saetze = {r["user_id"]: r["satz"] for r in c.execute("SELECT user_id, satz FROM zeit_person").fetchall()}
    q = "SELECT project_id, user_id, art, von, bis FROM zeit_eintrag WHERE project_id IS NOT NULL" + (" AND project_id=?" if pid else "")
    P = {}
    for r in c.execute(q, (pid,) if pid else ()).fetchall():
        m = max(0, (h2m(r["bis"]) or 0) - (h2m(r["von"]) or 0))
        x = P.setdefault(r["project_id"], {"min": 0, "arten": {}, "kosten": 0.0, "ohne_satz": 0})
        x["min"] += m
        x["arten"][r["art"]] = x["arten"].get(r["art"], 0) + m
        s = saetze.get(r["user_id"]) or bs
        if s:
            x["kosten"] += m / 60 * s
        else:
            x["ohne_satz"] += m
    names = {r["id"]: r["name"] for r in c.execute("SELECT id, name FROM projects").fetchall()}
    out = []
    for p, x in P.items():
        e = projekt_einst(c, p)
        out.append({"project_id": p, "name": names.get(p, f"Projekt {p}"), **x, "kosten": round(x["kosten"], 2), **e})
    return sorted(out, key=lambda z: z["name"].lower())


def konten(c):
    """Arbeitszeitkonten aller aktiven Benutzer – nur Summen, keine Tagesabläufe."""
    h = heute()
    d = date.fromisoformat(h)
    mo = (d - timedelta(days=d.weekday())).isoformat()
    out = []
    for u in c.execute("SELECT id, name FROM users ORDER BY name").fetchall():
        P = person(c, u["id"])
        if P["aus"]:
            continue
        k = konto(c, u["id"], h, P)
        w = woche(c, u["id"], mo, P)
        out.append({"user_id": u["id"], "name": u["name"], "soll_woche": P["soll_woche"], "ist_woche": sum(x["ist"] for x in w if x["bestaetigt"] or x["abw"]),
                    **k, "person": P})
    return out


def export_zeilen(c, monat):
    """Arbeitszeitnachweis je Benutzer und Tag eines Monats (für Lohn/Steuerbüro): Kommen, Gehen, Pause, Arbeitszeit, Abwesenheit."""
    j, m = int(monat[:4]), int(monat[5:7])
    erster = date(j, m, 1)
    letzter = (date(j + (m == 12), m % 12 + 1, 1) - timedelta(days=1))
    out = []
    for u in c.execute("SELECT id, name FROM users ORDER BY name").fetchall():
        P = person(c, u["id"])
        if P["aus"]:
            continue
        Z = lade(c, u["id"], erster.isoformat(), letzter.isoformat())
        t = erster
        while t <= letzter:
            d = tag_daten(c, u["id"], t.isoformat(), P, Z)
            if d["bestaetigt"] or d["abw"] or d["soll"]:
                out.append([u["name"], t.strftime("%d.%m.%Y"), ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"][t.weekday()],
                            d["kommen"] if d["bestaetigt"] else "", d["gehen"] if d["bestaetigt"] else "", m2h(d["pause"]) if d["bestaetigt"] else "",
                            m2h(d["arbeit"]) if d["bestaetigt"] else "", m2h(d["soll"]), ABW.get(d["abw"], d["feiertag"]),
                            "ja" if d["bestaetigt"] else ("" if d["abw"] or not d["soll"] else "offen")])
            t += timedelta(days=1)
    return out


# ------------------------------------------------------------------ Urlaubsanträge
ANTRAG_ARTEN = ("urlaub", "urlaub_halb", "frei", "schule")   # Krank wird direkt eingetragen
ANTRAG_STATUS = {"offen": "offen", "genehmigt": "genehmigt", "abgelehnt": "abgelehnt", "zurueckgezogen": "zurückgezogen"}


def antrag_pflicht(c):
    """Müssen Urlaub, Frei und Fortbildung beantragt werden (Vorgabe: ja)? Einstellung „zeit_antrag“ (0 = direkt eintragen)."""
    r = c.execute("SELECT value FROM settings WHERE key='zeit_antrag'").fetchone()
    return not (r and str(r["value"]) == "0")


def arbeitstage(P, von, bis):
    """Arbeitstage (mit Sollzeit, ohne Feiertage) im Zeitraum."""
    out, t = [], date.fromisoformat(von)
    while t.isoformat() <= bis:
        if soll_min(P, t.isoformat()):
            out.append(t.isoformat())
        t += timedelta(days=1)
    return out


def antrag_tage(P, von, bis, art):
    n = len(arbeitstage(P, von, bis))
    return n * 0.5 if art == "urlaub_halb" else float(n)


def antraege(c, uid=None, status=None, jahr=None):
    q, a = ["1=1"], []
    if uid:
        q.append("a.user_id=?"); a.append(uid)
    if status:
        q.append("a.status=?"); a.append(status)
    if jahr:
        q.append("a.bis>=? AND a.von<=?"); a += [f"{jahr}-01-01", f"{jahr}-12-31"]
    return [dict(r) for r in c.execute(f"SELECT a.*, u.name FROM zeit_antrag a JOIN users u ON u.id=a.user_id WHERE {' AND '.join(q)} "
                                       "ORDER BY CASE a.status WHEN 'offen' THEN 0 ELSE 1 END, a.von DESC, a.id DESC", a).fetchall()]


def antrag_neu(c, uid, b):
    von, bis, art = str(b.get("von") or "")[:10], str(b.get("bis") or b.get("von") or "")[:10], b.get("art") or "urlaub"
    if art not in ANTRAG_ARTEN:
        raise ValueError("Diese Art lässt sich nicht beantragen.")
    if not (_tag_ok(von) and _tag_ok(bis)) or bis < von:
        raise ValueError("Bitte den Zeitraum prüfen.")
    if (date.fromisoformat(bis) - date.fromisoformat(von)).days > 120:
        raise ValueError("Höchstens 120 Tage auf einmal.")
    P = person(c, uid)
    tage = antrag_tage(P, von, bis, art)
    if not tage:
        raise ValueError("Im Zeitraum gibt es keinen Arbeitstag.")
    if c.execute("SELECT 1 FROM zeit_antrag WHERE user_id=? AND status IN ('offen','genehmigt') AND von<=? AND bis>=?", (uid, bis, von)).fetchone():
        raise ValueError("Für diesen Zeitraum gibt es schon einen Antrag.")
    r = c.execute("INSERT INTO zeit_antrag(user_id, von, bis, art, tage, notiz, vertretung) VALUES(?,?,?,?,?,?,?) RETURNING id",
                  (uid, von, bis, art, tage, str(b.get("notiz") or "")[:500], str(b.get("vertretung") or "")[:120])).fetchone()
    return r["id"]


def antrag(c, aid):
    r = c.execute("SELECT a.*, u.name FROM zeit_antrag a JOIN users u ON u.id=a.user_id WHERE a.id=?", (aid,)).fetchone()
    return dict(r) if r else None


def antrag_entscheiden(c, aid, ok, wer, antwort=""):
    """Genehmigen (trägt die Abwesenheit an den Arbeitstagen ein, Krank bleibt stehen) oder ablehnen."""
    a = antrag(c, aid)
    if not a or a["status"] != "offen":
        raise ValueError("Der Antrag ist nicht mehr offen.")
    if ok:
        P = person(c, a["user_id"])
        for t in arbeitstage(P, a["von"], a["bis"]):
            if zt(c, a["user_id"], t).get("abw") != "krank":
                zt_setzen(c, a["user_id"], t, abw=a["art"])
    c.execute("UPDATE zeit_antrag SET status=?, antwort=?, entschieden_von=?, entschieden=? WHERE id=?",
              ("genehmigt" if ok else "abgelehnt", str(antwort or "")[:500], wer, jetzt().strftime("%Y-%m-%d %H:%M"), aid))
    return antrag(c, aid)


def antrag_zurueckziehen(c, aid, uid, admin=False):
    """Offene Anträge zieht die Person selbst zurück; genehmigte nur, solange sie noch nicht begonnen haben –
    die eingetragenen Tage werden dann wieder frei."""
    a = antrag(c, aid)
    if not a or (a["user_id"] != uid and not admin):
        raise ValueError("Antrag nicht gefunden.")
    if a["status"] == "genehmigt":
        if a["von"] <= heute() and not admin:
            raise ValueError("Der Urlaub hat schon begonnen – bitte an die Verwaltung wenden.")
        for t in arbeitstage(person(c, a["user_id"]), a["von"], a["bis"]):
            if zt(c, a["user_id"], t).get("abw") == a["art"]:
                zt_setzen(c, a["user_id"], t, abw="")
    elif a["status"] != "offen":
        raise ValueError("Der Antrag ist schon entschieden.")
    c.execute("UPDATE zeit_antrag SET status='zurueckgezogen', entschieden=? WHERE id=?", (jetzt().strftime("%Y-%m-%d %H:%M"), aid))
    return antrag(c, aid)


def urlaub_beantragt(c, uid, jahr):
    r = c.execute("SELECT COALESCE(SUM(tage), 0) AS n FROM zeit_antrag WHERE user_id=? AND status='offen' AND art IN ('urlaub','urlaub_halb') "
                  "AND von>=? AND von<=?", (uid, f"{jahr}-01-01", f"{jahr}-12-31")).fetchone()
    return float(r["n"] or 0)
