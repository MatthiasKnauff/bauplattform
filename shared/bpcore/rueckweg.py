"""Rückweg ins Gebäudemodell (GO 16.11.2026, „Gebäudemodell als Mitte“, Punkte 5 und 17).

Zwei Arten, wie eine App etwas ins Modell zurückgibt – nie ein ganzes neues Modell:

1. ERGEBNISSE (ergebnis_setzen): was eine App aus dem Modell ausgerechnet hat, steht für alle anderen im Modell –
     kosten   Kosten: Stufe, Kostengruppen, Summen, Datum der gültigen Kostenermittlung (kosten.melden)
     termine  Terminplan: Bauphasen mit Beginn und Ende aus dem gültigen Bauzeitenplan (termine_melden)
   Die anderen Apps (Honorar, Ausschreibung, Bauantrag, Portal) lesen nur noch das Modell. Ergebnisse zählen nicht als Änderung des
   Modells (kein neuer Änderungszähler – sonst meldete die Kosten-App ihr eigenes Ergebnis als „Modell geändert“). Steht die Linie der
   App auf „fest“, bleibt das Ergebnis des festgehaltenen Stands; „getrennt“ oder „Modell → App“ schreibt nichts.

2. ZEILEN (vorschlagen): einzelne Änderungen (Menge, Bauphase) und neue Zeilen („Leistungen ohne Bauteil“) mit Herkunft. Sie kommen
   immer nur als VORSCHLAG an die Linie der App (pm_hinweis, art „rueckweg“) – angenommen wird in der Checkliste (bp/bauteile.js).
   Doppelte Zeilen erkennt der Kern am Text (ohne KI) und bietet „Verbinden“ an. Je App ein Schalter „ins Modell“ (Standard an).

PHASEN / phase_von(z)   Bauphase eines Bauteils aus Kostengruppe und Antwort – gleiche Schlüssel wie der Planungsassistent (ph)
routen()                GET /api/bp/modell/<pid>/rueckweg · POST …/rueckweg/<hid> · PUT …/rueckweg/schalter
"""
import json
import re
from datetime import datetime

from flask import jsonify, request

from .jsonwert import lies as _j

PHASEN = (("vorb", "Vorbereitung"), ("abbruch", "Abbruch und Rückbau"), ("erd", "Erd- und Gründungsarbeiten"), ("rohbau", "Rohbau"),
          ("huelle", "Gebäudehülle"), ("tga_roh", "Haustechnik Rohinstallation"), ("ausbau", "Innenausbau"), ("tga_fein", "Haustechnik Feininstallation"),
          ("aussen", "Außenanlagen"), ("abschluss", "Abschluss"))
PH = dict(PHASEN)
# Kostengruppe (DIN 276, 3 bzw. 2 Stellen) → Bauphase; das Längste passt
KG_PHASE = {"2": "vorb", "31": "erd", "32": "erd", "33": "rohbau", "334": "huelle", "335": "huelle", "336": "ausbau", "337": "huelle", "338": "huelle",
            "34": "rohbau", "344": "ausbau", "345": "ausbau", "346": "ausbau", "35": "rohbau", "352": "ausbau", "353": "ausbau", "36": "huelle", "364": "ausbau",
            "37": "ausbau", "38": "ausbau", "39": "vorb", "4": "tga_roh", "5": "aussen", "6": "ausbau"}
APP_NAME = {"kosten": "Kosten", "termine": "Bauzeitenplan", "ausschreibung": "Ausschreibung", "ki": "Externe KI"}   # ki: verfeinern.py
ZEILEN_APPS = ("kosten", "termine")   # wer Zeilen vorschlagen darf (Klärung 7: aus der Ausschreibung in v1 nichts)


def _s(v, n):
    return str(v or "").strip()[:n]


def _z(v, lo=0.0, hi=1e9):
    try:
        x = float(v)
    except (TypeError, ValueError):
        return 0.0
    return round(min(max(x, lo), hi), 3) if x == x else 0.0


def _jetzt():
    return datetime.now().isoformat(timespec="seconds")


def phase_von(z):
    if z.get("phase") in PH:
        return z["phase"]
    if z.get("status") == "abbruch":
        return "abbruch"
    kg = re.sub(r"\D", "", str(z.get("kg") or ""))
    for n in (3, 2, 1):
        if len(kg) >= n and kg[:n] in KG_PHASE:
            return KG_PHASE[kg[:n]]
    return ""


def wort(t):
    """Text zum Vergleichen: klein, ohne Umlaute, Zahlen und Satzzeichen."""
    t = str(t or "").lower().replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss")
    return " ".join(w for w in re.split(r"[^a-z]+", t) if len(w) > 2)


def doppelt(name, zeilen):
    """Gleiche Zeile in der Checkliste? Gleicher Text oder alle Wörter des kürzeren im längeren → id der Zeile."""
    a = set(wort(name).split())
    if not a:
        return ""
    for z in zeilen:
        b = set(wort(z.get("name")).split())
        if b and (a == b or (min(len(a), len(b)) >= 2 and (a <= b or b <= a))):
            return z["id"]
    return ""


# ------------------------------------------------------------------ Ergebnisse der Apps im Modell
def kosten_sauber(k):
    k = k if isinstance(k, dict) else {}
    if not k.get("name") and not k.get("total"):
        return {}
    kg = k.get("kg") if isinstance(k.get("kg"), dict) else {}
    return {"bk_id": int(_z(k.get("bk_id"))), "name": _s(k.get("name"), 200), "stufe": _s(k.get("stufe"), 30), "stufe_name": _s(k.get("stufe_name"), 60),
            "datum": _s(k.get("datum"), 20), "kg300": _z(k.get("kg300")), "kg400": _z(k.get("kg400")), "bauwerk": _z(k.get("bauwerk")), "extra": _z(k.get("extra")),
            "risiko": _z(k.get("risiko")), "nk": _z(k.get("nk")), "total": _z(k.get("total")), "brutto": _z(k.get("brutto")), "area": _z(k.get("area")),
            "kg": {_s(x, 3): _z(y) for x, y in list(kg.items())[:60] if re.fullmatch(r"\d{3}", _s(x, 3))}}


def termine_sauber(t):
    t = t if isinstance(t, dict) else {}
    P = t.get("phasen") if isinstance(t.get("phasen"), dict) else {}
    d = lambda v: _s(v, 10) if re.fullmatch(r"\d{4}-\d{2}-\d{2}", _s(v, 10)) else ""   # noqa: E731
    ph = {k: {"von": d(v.get("von")), "bis": d(v.get("bis"))} for k, v in P.items() if k in PH and isinstance(v, dict) and d(v.get("von"))}
    if not ph:
        return {}
    return {"plan": _s(t.get("plan"), 200), "plan_id": _s(t.get("plan_id"), 80), "datum": _s(t.get("datum"), 20), "phasen": ph}


ERGEBNIS = {"kosten": kosten_sauber, "termine": termine_sauber}


def darf(c, pid, app):
    """Schreibt die App gerade ins Modell? Nur lebendig und in Richtung Modell."""
    from . import modell
    w = next((x for x in modell.links(c, pid) if x["app"] == app), None)
    return bool(w) and w["zustand"] == "lebendig" and w["richtung"] in ("beide", "zum_modell")


def ergebnis_setzen(c, pid, app, wert):
    """Ergebnis der App ins Modell (ohne neuen Änderungszähler). → True, wenn es sich geändert hat."""
    if not pid or app not in ERGEBNIS or not darf(c, pid, app):
        return False
    wert = ERGEBNIS[app](wert)
    r = c.execute("SELECT data FROM pm_modell WHERE project_id=?", (pid,)).fetchone()
    d = _j(r["data"], {}) if r else {}
    if (d.get(app) or {}) == wert:
        return False
    d[app] = wert
    if r:
        c.execute("UPDATE pm_modell SET data=? WHERE project_id=?", (json.dumps(d, ensure_ascii=False), pid))
    else:
        c.execute("INSERT INTO pm_modell(project_id, data, rev, erstellt, geaendert, von) VALUES(?,?,0,?,?,?) ON CONFLICT (project_id) DO NOTHING",
                  (pid, json.dumps(d, ensure_ascii=False), _jetzt(), _jetzt(), APP_NAME.get(app, app)))
    return True


def termine_melden(c, pid, plan):
    """Bauzeitenplan → Bauphasen mit Beginn und Ende ins Modell (phasen_aus_plan)."""
    return ergebnis_setzen(c, pid, "termine", {"plan": plan.get("name"), "plan_id": plan.get("id"), "datum": _jetzt()[:10], "phasen": phasen_aus_plan(plan)})


def phasen_aus_plan(plan):
    """Gespeicherter Bauzeitenplan (Daten mit berechneten Terminen „sched“) → {ph: {von, bis}}. plan: {id, name, data}.
    Leistungen gehören zur Bauphase ihrer Gruppe (Zeile „_grp“ mit ph) oder zu ihrer eigenen (ph)."""
    D = plan.get("data") if isinstance(plan.get("data"), dict) else _j(plan.get("data"), {}) or {}
    sched = {x.get("uid"): x for x in (D.get("sched") or []) if isinstance(x, dict)}
    P, grp = {}, []   # grp: Stapel (lvl, ph) der offenen Gruppen
    for t in D.get("tasks") or []:
        if not isinstance(t, dict):
            continue
        lvl = int(_z(t.get("lvl"), 0, 50))
        while grp and grp[-1][0] >= lvl:
            grp.pop()
        if t.get("cat") == "_grp":
            grp.append((lvl, t.get("ph") or ""))
            continue
        ph = t.get("ph") if t.get("ph") in PH else next((p for _, p in reversed(grp) if p in PH), "")
        s = sched.get(t.get("uid")) or {}
        if not ph or s.get("g") or not s.get("s") or not s.get("f"):
            continue
        x = P.setdefault(ph, {"von": s["s"], "bis": s["f"]})
        x["von"], x["bis"] = min(x["von"], s["s"]), max(x["bis"], s["f"])
    return P


def termine_zeilen(plan):
    """Leistungen, die im Bauzeitenplan von Hand dazugekommen sind (nicht aus dem Assistenten) → Zeilen für den Rückweg."""
    D = plan.get("data") if isinstance(plan.get("data"), dict) else _j(plan.get("data"), {}) or {}
    out, grp = [], []
    for t in D.get("tasks") or []:
        if not isinstance(t, dict):
            continue
        lvl = int(_z(t.get("lvl"), 0, 50))
        while grp and grp[-1][0] >= lvl:
            grp.pop()
        if t.get("cat") == "_grp":
            grp.append((lvl, t.get("ph") or ""))
            continue
        if t.get("cat") or not _s(t.get("name"), 200) or not (t.get("dur") or 0) > 0:   # cat: aus dem Assistenten bzw. Meilenstein/Ende
            continue
        ph = t.get("ph") if t.get("ph") in PH else next((p for _, p in reversed(grp) if p in PH), "")
        out.append({"name": _s(t["name"], 200), "phase": ph, "gewerk": _s(t.get("gw"), 80)})
    return out[:100]


# ------------------------------------------------------------------ Zeilen als Vorschlag
def schalter(m):
    S = (m or {}).get("rueckweg") if isinstance((m or {}).get("rueckweg"), dict) else {}
    return {a: S.get(a) is not False for a in ZEILEN_APPS}


def vorschlagen(c, pid, app, zeilen, herkunft, wer=""):
    """Zeilen einer App mit der Checkliste vergleichen → ein Vorschlag an der Linie der App (ersetzt den offenen Vorschlag derselben
    Herkunft). zeilen: [{id?, name, menge?, einheit?, kg?, phase?}] – mit id = Änderung an dieser Zeile, ohne = neue Zeile.
    Was schon einmal vorgeschlagen und abgelehnt wurde, kommt nicht wieder. → id des Vorschlags oder None."""
    from . import modell
    if app not in ZEILEN_APPS or not pid or not darf(c, pid, app):
        return None
    m = modell.lesen(c, pid)["modell"]
    if not schalter(m)[app]:
        return None
    L = [z for z in (m.get("bauteilliste") or {}).get("zeilen") or [] if not z.get("entfaellt")]
    by = {z["id"]: z for z in L}
    hk = {"app": app, "name": _s((herkunft or {}).get("name"), 200), "ref": _s((herkunft or {}).get("ref"), 80)}
    alt = c.execute("SELECT id, status, daten FROM pm_hinweis WHERE project_id=? AND app=? AND daten LIKE ?", (pid, app, '%"art": "rueckweg"%')).fetchall()
    schon = set()
    for h in alt:
        D = _j(h["daten"], {}) or {}
        if h["status"] in ("abgelehnt", "uebernommen"):
            schon |= {json.dumps(x.get("schluessel")) for x in D.get("zeilen") or []}
    Z = []
    for x in (zeilen or [])[:200]:
        if not isinstance(x, dict):
            continue
        z = by.get(_s(x.get("id"), 200))
        if z:
            a = {}
            if "menge" in x and abs(_z(x["menge"]) - (z.get("menge") or 0)) > 0.005:
                a["menge"] = _z(x["menge"])
            if x.get("phase") in PH and x["phase"] != phase_von(z):
                a["phase"] = x["phase"]
            if not a:
                continue
            e = {"art": "aendern", "id": z["id"], "name": z["name"], "alt": {k: (z.get("menge") if k == "menge" else phase_von(z)) for k in a}, "neu": a,
                 "einheit": z.get("einheit") or ""}
        else:
            name = _s(x.get("name"), 200)
            if not name:
                continue
            e = {"art": "neu", "name": name, "neu": {k: v for k, v in {"menge": _z(x.get("menge")), "einheit": _s(x.get("einheit"), 12), "kg": re.sub(r"\D", "", _s(x.get("kg"), 3)),
                                                                     "phase": x.get("phase") if x.get("phase") in PH else "", "gewerk": _s(x.get("gewerk"), 80)}.items() if v},
                 "doppelt": doppelt(name, L)}
        e["schluessel"] = [e["art"], e.get("id") or wort(e["name"]), e["neu"]]
        if json.dumps(e["schluessel"]) not in schon:
            Z.append(e)
    for h in alt:   # offener Vorschlag derselben Herkunft wird ersetzt
        if h["status"] == "offen" and ((_j(h["daten"], {}) or {}).get("herkunft") or {}).get("ref") == hk["ref"]:
            c.execute("DELETE FROM pm_hinweis WHERE id=?", (h["id"],))
    if not Z:
        return None
    titel = f"{APP_NAME[app]}{' „' + hk['name'] + '“' if hk['name'] else ''}: {len(Z)} Vorschl{'ag' if len(Z) == 1 else 'äge'} fürs Modell"
    return modell.hinweis_neu(c, pid, app, titel, {"art": "rueckweg", "herkunft": hk, "zeilen": Z}, "regel", wer)


def offene(c, pid):
    from . import modell
    return [h for h in modell.hinweise(c, pid) if (h["daten"] or {}).get("art") == "rueckweg"]


def annehmen(c, pid, hid, wahl, wer):
    """Vorschlag entscheiden: wahl = {Index: "ja" | "nein" | "verbinden:<id>"}; fehlende Indizes = nein.
    Angenommene Änderungen gehen in die Checkliste, neue Zeilen als „Leistungen ohne Bauteil“ (bzw. in die verbundene Zeile)."""
    from . import bauteilliste, modell
    h = next((x for x in offene(c, pid) if x["id"] == hid), None)
    if not h:
        raise modell.Ungueltig("Diesen Vorschlag gibt es nicht mehr.")
    M = modell.lesen(c, pid)
    m = M["modell"]
    L = m.get("bauteilliste") or bauteilliste.leer()
    by = {z["id"]: z for z in L["zeilen"]}
    hk = h["daten"].get("herkunft") or {}
    n = 0
    for i, e in enumerate(h["daten"].get("zeilen") or []):
        w = str((wahl or {}).get(str(i)) or "nein")
        ziel = by.get(e.get("id")) if e["art"] == "aendern" and w == "ja" else by.get(w.split(":", 1)[1]) if w.startswith("verbinden:") else None
        if ziel is not None:
            if "menge" in e["neu"]:
                ziel["menge"] = e["neu"]["menge"]
            if e["neu"].get("phase"):
                ziel["phase"] = e["neu"]["phase"]
            if e["neu"].get("vorlage"):   # Aufbau aus dem Baukasten (Vorschlag der externen KI, verfeinern.py)
                bauteilliste.aufbau_setzen(c, ziel, e["neu"]["vorlage"])
            n += 1
        elif e["art"] == "neu" and w == "ja":
            z = bauteilliste._zeile(id=f"lst:{hk.get('app', '')}:{abs(hash((e['name'], hid, i))) % 10 ** 9}", bereich="leistung", art="Leistung", kg=e["neu"].get("kg") or "",
                                    name=e["name"], menge=e["neu"].get("menge") or 0.0, einheit=e["neu"].get("einheit") or "psch", zustand="hand", status="neu",
                                    berechnen=False, quelle="app", phase=e["neu"].get("phase") or "", herkunft=f"{APP_NAME.get(hk.get('app'), '')} {hk.get('name') or ''}".strip())
            L["zeilen"].append(z)
            n += 1
    modell.hinweis_entscheiden(c, pid, hid, "uebernommen" if n else "abgelehnt", wer)
    if n:
        m["bauteilliste"] = L
        modell.schreiben(c, pid, m, wer)
    return n


def routen(bp, mit, lesen_modell):
    def koerper():
        d = request.get_json(silent=True)
        return d if isinstance(d, dict) else {}

    @bp.get("/api/bp/modell/<int:pid>/rueckweg")
    def rueckweg_liste(pid):
        from . import ki_fragen
        return mit(pid, lambda c, wer: jsonify(vorschlaege=offene(c, pid), schalter=schalter(lesen_modell(c, pid)["modell"]), extern=ki_fragen.zusatz_an(c),
                                               phasen=[{"k": k, "n": n} for k, n in PHASEN], termine=lesen_modell(c, pid)["modell"].get("termine") or {}))

    @bp.post("/api/bp/modell/<int:pid>/rueckweg/<int:hid>")
    def rueckweg_entscheiden(pid, hid):
        d = koerper()

        def tun(c, wer):
            n = annehmen(c, pid, hid, d.get("wahl") if isinstance(d.get("wahl"), dict) else {}, wer)
            return jsonify(n=n, vorschlaege=offene(c, pid), **lesen_modell(c, pid))
        return mit(pid, tun)

    @bp.put("/api/bp/modell/<int:pid>/rueckweg/schalter")
    def rueckweg_schalter(pid):
        d = koerper()

        def tun(c, wer):
            from . import modell
            M = lesen_modell(c, pid)
            m = M["modell"]
            m["rueckweg"] = dict(schalter(m), **{a: bool(d[a]) for a in ZEILEN_APPS if a in d})
            modell.schreiben(c, pid, m, wer)
            return jsonify(schalter=schalter(m))
        return mit(pid, tun)
