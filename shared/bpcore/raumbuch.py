"""Raumbuch (GO 17.11.2026, H1 I1 J1): Boden, Wand und Decke je Raum wählen.

Gespeichert in bauteilliste["raumbuch"] = {Raum-Nr: {"boden": {"vorlage", "wahl"}, "wand": {"vorlage", "wahl", "fliesen"}, "decke": {…}}}.
Die Zeilen der Checkliste entstehen wie bei den Anweisungen (anweisung.ableiten): je gleichem Aufbau eine abgeleitete Zeile mit ihren
Räumen; was im Raumbuch nicht gewählt ist, bleibt in der Grundzeile („Böden (…)“, „Wände (…)“). Das Raumbuch geht den Anweisungen vor.
Fliesen an der Wand (J1): raumhoch · bis 1,20 m · nur Spritzbereich (4 m² je Raum) – der Rest der Wand bleibt in der Grundzeile.
Vorbelegung nach Raumart (I1): vorschlag() – nur ein Vorschlag, gespeichert wird erst mit „übernehmen“.

Routen: GET /api/bp/modell/<pid>/raumbuch · POST …/raumbuch {raeume, teil, vorlage|"", wahl?, fliesen?} · POST …/raumbuch/vorschlag {raeume?}
"""
import json
import re

from .wert import kurz as _s

TEILE = {"boden": ("Böden", "353"), "wand": ("Wände", "345"), "decke": ("Decken", "354")}
FLIESEN = {"raumhoch": "raumhoch", "120": "bis 1,20 m", "spritz": "Spritzbereich"}
FLIESEN_VORLAGE = ("345.02", "345.10")
SPRITZ_M2 = 4.0
# Raumart (verfeinern.raumart) → Vorschlag: Boden, Wand, Decke, Fliesenhöhe
VORSCHLAG = {"Bad/WC": ("353.09", "345.02", "354.01", "raumhoch"), "Küche": ("353.01", "345.01", "354.01", ""),
             "Flur": ("353.01", "345.01", "354.01", ""), "Treppe": ("353.01", "345.01", "354.01", ""),
             "Keller/Technik": ("353.06", "345.01", "354.01", ""), "Wohnraum": ("353.02", "345.01", "354.01", ""), "Raum": ("353.02", "345.01", "354.01", "")}
_VID = re.compile(r"\d{3}\.\d{2}$")


def sauber(v):
    out = {}
    for nr, T in list((v if isinstance(v, dict) else {}).items())[:2000]:
        nr = _s(nr, 20)
        if not nr or not isinstance(T, dict):
            continue
        x = {}
        for teil in TEILE:
            e = T.get(teil)
            if isinstance(e, dict) and _VID.match(str(e.get("vorlage") or "")):
                y = {"vorlage": e["vorlage"], "wahl": [int(w) for w in (e.get("wahl") or [])[:12] if isinstance(w, int) and 0 <= w < 99]}
                if teil == "wand" and e["vorlage"] in FLIESEN_VORLAGE:
                    y["fliesen"] = e.get("fliesen") if e.get("fliesen") in FLIESEN else "raumhoch"
                x[teil] = y
        if x:
            out[nr] = x
    return out


def _wand_nr(name):
    return bool(re.search(r"\b(bad|dusch)", name or "", re.I))


def vorschlag(L):
    """Vorschlag je Raum nach Raumart (ohne die schon gewählten Teile) – {nr: {teil: {vorlage, fliesen?}}}."""
    from .verfeinern import raumart
    RB = L.get("raumbuch") or {}
    out = {}
    for r in L.get("raeume") or []:
        art = raumart(r.get("name"))
        b, w, d, fl = VORSCHLAG.get(art, VORSCHLAG["Raum"])
        if art == "Bad/WC" and not _wand_nr(r.get("name")):
            fl = "120"   # WC, Gäste-WC: Fliesen bis 1,20 m
        x = {}
        for teil, vid in (("boden", b), ("wand", w), ("decke", d)):
            if teil not in (RB.get(r["nr"]) or {}):
                x[teil] = {"vorlage": vid, **({"fliesen": fl} if teil == "wand" and vid in FLIESEN_VORLAGE else {})}
        if x:
            out[r["nr"]] = {"art": art, **x}
    return out


def anteil(r, teil, e):
    """Anteil der Fläche eines Raums, den der gewählte Aufbau bekommt (Fliesen an der Wand: nach Höhe)."""
    if teil != "wand" or e.get("vorlage") not in FLIESEN_VORLAGE:
        return 1.0
    h, u = r.get("hoehe") or 2.5, r.get("umfang") or 0
    f = e.get("fliesen") or "raumhoch"
    if f == "120":
        return min(1.0, 1.2 / h) if h else 1.0
    if f == "spritz":
        return min(1.0, SPRITZ_M2 / (u * h)) if u and h else 1.0
    return 1.0


def ziele(L):
    """Für anweisung.ableiten: {(Grundzeile, Raum-Nr): [(Signatur, Schritt, Treffer, Antwort, "raumbuch", Anteil)]}."""
    from . import bauteilliste as B
    RB = L.get("raumbuch") or {}
    if not RB:
        return {}
    R = {r["nr"]: r for r in L.get("raeume") or []}
    out = {}
    for z in L.get("zeilen") or []:
        if z.get("abgeleitet") or z.get("entfaellt") or z.get("bereich") != "raum":
            continue
        teil = z["id"].split(":")[1] if z["id"].count(":") >= 2 else ""
        if teil not in TEILE:
            continue
        st = "neu" if z.get("zustand") == "neu" else "erneuern"
        if st not in B.erlaubt(z):
            continue
        for k in z.get("mitglieder") or []:
            e = (RB.get(k) or {}).get(teil)
            if not e or k not in R:
                continue
            sig = json.dumps(["rb", e["vorlage"], e.get("wahl") or [], st], sort_keys=True)
            t = {"vorlage": e["vorlage"], "wahl": e.get("wahl") or None, "setze": {}, "name": ""}
            out[(z["id"], k)] = [(sig, {"ziel": "raum", "teil": teil}, t, st, "raumbuch", anteil(R[k], teil, e))]
    return out


def setzen(L, raeume, teil, vorlage, wahl=None, fliesen=None):
    if teil not in TEILE:
        raise ValueError("Boden, Wand oder Decke?")
    RB = L.setdefault("raumbuch", {})
    nrs = {r["nr"] for r in L.get("raeume") or []}
    n = 0
    for nr in raeume or []:
        nr = _s(nr, 20)
        if nr not in nrs:
            continue
        x = RB.setdefault(nr, {})
        if not vorlage:
            x.pop(teil, None)
        else:
            alt = x.get(teil) or {}
            y = {"vorlage": vorlage, "wahl": list(wahl) if isinstance(wahl, list) else (alt.get("wahl") if alt.get("vorlage") == vorlage else [])}
            if teil == "wand" and vorlage in FLIESEN_VORLAGE:
                y["fliesen"] = fliesen if fliesen in FLIESEN else alt.get("fliesen") or "raumhoch"
            x[teil] = y
        if not x:
            RB.pop(nr, None)
        n += 1
    L["raumbuch"] = sauber(RB)
    return n


def zuruecksetzen(L, teil, alt):
    """Rückgängig: {nr: Eintrag | None} für einen Teil wiederherstellen."""
    if teil not in TEILE or not isinstance(alt, dict):
        raise ValueError("Nichts zurückzunehmen.")
    RB = L.setdefault("raumbuch", {})
    for nr, e in list(alt.items())[:2000]:
        x = RB.setdefault(_s(nr, 20), {})
        if isinstance(e, dict):
            x[teil] = e
        else:
            x.pop(teil, None)
    L["raumbuch"] = sauber(RB)
    return len(alt)


def uebernehmen(L, raeume=None):
    """Vorschläge der Raumart übernehmen (alle Räume oder die gewählten). Rückgängig: der alte Stand des Raumbuchs (raumbuch_alt)."""
    V = vorschlag(L)
    RB = L.setdefault("raumbuch", {})
    n = 0
    for nr, x in V.items():
        if raeume and nr not in raeume:
            continue
        for teil in TEILE:
            if teil in x:
                RB.setdefault(nr, {})[teil] = {"vorlage": x[teil]["vorlage"], "wahl": [], **({"fliesen": x[teil]["fliesen"]} if x[teil].get("fliesen") else {})}
                n += 1
    L["raumbuch"] = sauber(RB)
    return n


def ansicht(c, L):
    """Für die Oberfläche: Räume, Wahl, Vorschlag und die Vorlagen je Teil (Name)."""
    V = {}
    for teil, (_, kg) in TEILE.items():
        V[teil] = [{"id": r["id"], "name": r["name"]} for r in c.execute(
            "SELECT id, name FROM pdb_vorlage WHERE kg=? AND einheit='m²' ORDER BY sort, id", (kg,)).fetchall()]
    grund = {}
    for z in L.get("zeilen") or []:
        if z.get("bereich") == "raum" and not z.get("abgeleitet") and z["id"].count(":") >= 2:
            for k in z.get("mitglieder") or []:
                grund.setdefault(k, {})[z["id"].split(":")[1]] = {"id": z["id"], "kurz": z.get("kurz") or "", "vorlage": z.get("vorlage") or ""}
    return {"raeume": L.get("raeume") or [], "raumbuch": L.get("raumbuch") or {}, "vorschlag": vorschlag(L), "vorlagen": V, "grund": grund,
            "fliesen": FLIESEN, "fliesen_vorlagen": list(FLIESEN_VORLAGE)}


def routen(bp, mit, lesen_modell, schreiben_modell):
    from flask import jsonify, request

    from . import anweisung, bauteilliste as B

    @bp.get("/api/bp/modell/<int:pid>/raumbuch")
    def raumbuch_lesen(pid):
        return mit(pid, lambda c, wer: jsonify(ansicht(c, B.sauber(lesen_modell(c, pid)["modell"].get("bauteilliste")))))

    def aendern(pid, fn):
        def tun(c, wer):
            M = lesen_modell(c, pid)
            m = M["modell"]
            L = B.sauber(m.get("bauteilliste"))
            if not L.get("raeume"):
                return jsonify(error="Das Modell hat noch keine Räume."), 400
            try:
                n = fn(L)
            except ValueError as e:
                return jsonify(error=str(e)), 400
            anweisung.ableiten(c, L)
            m["bauteilliste"] = L
            schreiben_modell(c, pid, m, wer)
            return jsonify(dict(lesen_modell(c, pid), raumbuch=ansicht(c, L), n=n))
        return mit(pid, tun)

    @bp.post("/api/bp/modell/<int:pid>/raumbuch")
    def raumbuch_setzen(pid):
        d = request.get_json(silent=True) or {}
        if isinstance(d.get("zurueck"), dict):
            return aendern(pid, lambda L: zuruecksetzen(L, d.get("teil"), d["zurueck"]))
        v = str(d.get("vorlage") or "")
        if v and not _VID.match(v):
            return jsonify(error="Vorlage?"), 400
        return aendern(pid, lambda L: setzen(L, d.get("raeume") if isinstance(d.get("raeume"), list) else [], d.get("teil"), v,
                                             d.get("wahl") if isinstance(d.get("wahl"), list) else None, d.get("fliesen")))

    @bp.post("/api/bp/modell/<int:pid>/raumbuch/vorschlag")
    def raumbuch_vorschlag(pid):
        d = request.get_json(silent=True) or {}
        R = [_s(x, 20) for x in d.get("raeume") or []] if isinstance(d.get("raeume"), list) else None
        return aendern(pid, lambda L: uebernehmen(L, R))
