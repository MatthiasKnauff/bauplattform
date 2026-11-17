"""Bauzeitenplan zum Ansehen: aus den gespeicherten Daten eines Plans (tasks, sched, gwColors) die Zeilen für den Baustein bp/zeitplan.js.
Benutzt von der Link-Ansicht des Bauzeitenplans (gantt/links.py) und vom Bauherrenportal (bauherren.freigeben, art „termine“)."""


def nur_phasen(rows):
    """Für Bauherr:innen (Vorgabe): nur Gruppen (Bauphasen) und Meilensteine – die einzelnen Leistungen fallen weg, die Ebenen rücken auf."""
    R = [dict(x) for x in rows if x.get("g") or x.get("m")]
    if R:
        m = min(int(x.get("l") or 0) for x in R)
        for x in R:
            x["l"] = int(x.get("l") or 0) - m
    return R


def zeilen(d, o=None):
    """Zeilen für die Ansicht: nur Bezeichnung, Ebene, Termine, Gewerk/Farbe, Firma, ggf. Fortschritt – keine Notizen, keine Namen von Bearbeitern.
    o.gewerk: nur Leistungen dieses Gewerks, dazu die Meilensteine und die Gruppen, in denen sie stehen. o.meilensteine False: ohne Meilensteine."""
    o = o or {}
    fortschritt, gw_nur, ms = bool(o.get("fortschritt", True)), str(o.get("gewerk") or ""), o.get("meilensteine", True) is not False
    sched = {s["uid"]: s for s in (d.get("sched") or []) if isinstance(s, dict)}
    cols = d.get("gwColors") or {}
    rows = []
    for t in d.get("tasks") or []:
        s = sched.get(t.get("uid"))
        if not s:
            continue
        rows.append({"n": t.get("name") or "", "l": int(t.get("lvl") or 0), "s": s["s"], "f": s["f"], "g": 1 if s.get("g") else 0,
                     "m": 1 if not s.get("g") and not t.get("dur") else 0, "gw": t.get("gw") or "", "c": cols.get(t.get("gw") or "", ""),
                     "r": t.get("res") or "", "_p": float(t.get("pct") or 0), "_d": float(t.get("dur") or 0)})
    if fortschritt:   # Gruppen: Fortschritt gewichtet nach Dauer ihrer Leistungen
        for i, x in enumerate(rows):
            if x["g"]:
                kids, j = [], i + 1
                while j < len(rows) and rows[j]["l"] > x["l"]:
                    if not rows[j]["g"]:
                        kids.append(rows[j])
                    j += 1
                w = sum(max(k["_d"], 1) for k in kids)
                x["p"] = round(sum(k["_p"] * max(k["_d"], 1) for k in kids) / w) if w else 0
            else:
                x["p"] = round(x["_p"])
    if gw_nur or not ms:   # Auswahl: Leistungen (des Gewerks) und Meilensteine – Gruppen nur, wenn darunter etwas bleibt
        bleibt = [(not x["g"]) and ((x["m"] and ms) or (not x["m"] and (not gw_nur or x["gw"] == gw_nur))) for x in rows]
        for i in range(len(rows) - 1, -1, -1):
            if rows[i]["g"]:
                j = i + 1
                while j < len(rows) and rows[j]["l"] > rows[i]["l"]:
                    if bleibt[j]:
                        bleibt[i] = True
                        break
                    j += 1
        rows = [x for x, b in zip(rows, bleibt) if b]
    for x in rows:
        x.pop("_p"); x.pop("_d")
    return rows
