"""Gebäudemodell ohne CAD-Plan (GO 17.11.2026, Entwurf „Gebäudemodell: Assistent rechts, legt Bauteile, Räume, Fenster an“).

Räume, Fenster und Türen von Hand (Arbeitsmaske in „Räume“ und „Fenster & Türen“) oder vom Assistenten vorgeschlagen werden ein Planstand
der Art „hand“ – eine Version wie jede andere im Versionsmenü. Aus ihnen entsteht dasselbe wie aus einem IFC: R im Format von
cadimport.ifc_lesen(bestand=True) → bauteilliste.zeilen_aus_ifc() (Böden, Wände, Decken je Raumgruppe; Fenster/Türen je Art und Größe;
Rohbau aus Räumen und Geschossen grob geschätzt, mit Hinweis). Kommt später ein IFC, gibt es den gewohnten Abgleich.

vorschlag(m, L)  Räume, Fenster und Türen aus den Angaben des Assistenten (Fläche, Geschosse, Einheiten) – oder aus dem gültigen Planstand
R_aus(d)         Arbeitsmaske/Vorschlag → R
routen()         POST …/hand/entwurf (neuer Planstand mit Abgleich) · PUT …/hand (Arbeitsmaske: Planstand „hand“ direkt nachführen)
                 GET …/hand/vorschlag
"""
import math

from .wert import kurz as _s

ARTEN = ("Fenster", "Fenstertür", "Innentür", "Außentür")
GESCHAETZT = "Aus Räumen und Geschossen grob geschätzt – mit einem Plan (IFC) genau."


def _f(v, lo=0.0, hi=1e6):
    try:
        x = float(str(v).replace(",", "."))
    except (TypeError, ValueError):
        return None
    return round(min(hi, max(lo, x)), 3)


def sauber(d):
    """Eingaben der Arbeitsmaske prüfen: Räume (nr, name, geschoss, flaeche, hoehe) und Elemente (nr, art, geschoss, raum, b, h, bruestung)."""
    R, E = [], []
    for k, r in enumerate((d.get("raeume") if isinstance(d.get("raeume"), list) else [])[:500]):
        if not isinstance(r, dict):
            continue
        nr = _s(r.get("nr"), 20) or f"{k + 1:02d}"
        R.append({"id": k + 1, "nr": nr, "name": _s(r.get("name"), 80) or "Raum", "geschoss": _s(r.get("geschoss"), 40) or "EG",
                  "flaeche": _f(r.get("flaeche"), 0, 10000) or 0, "hoehe": _f(r.get("hoehe"), 1.5, 20) or 2.5, "umfang": _f(r.get("umfang"), 0, 2000)})
    for k, e in enumerate((d.get("elemente") if isinstance(d.get("elemente"), list) else [])[:2000]):
        if not isinstance(e, dict):
            continue
        art = e.get("art") if e.get("art") in ARTEN else ("Fenster" if e.get("art") not in ("Tür",) else "Innentür")
        E.append({"id": k + 1, "nr": _s(e.get("nr"), 20), "art": art, "geschoss": _s(e.get("geschoss"), 40) or "EG", "raum": _s(e.get("raum"), 20),
                  "b": _f(e.get("b"), 0, 50), "h": _f(e.get("h"), 0, 50), "bruestung": _f(e.get("bruestung"), 0, 20)})
    return R, E


def R_aus(raeume, elemente, schaetzen=True):
    """Arbeitsmaske → R wie cadimport.ifc_lesen(bestand=True)."""
    RR = []
    for r in raeume:
        u = r.get("umfang") or round(4 * math.sqrt(max(r["flaeche"], 0.01)) * 1.05, 2)   # ohne Umfang: fast quadratisch angenommen
        RR.append({**r, "umfang": u})
    nr_id = {r["nr"]: r["id"] for r in RR}
    EL, G = [], {}
    for e in elemente:
        fenster = e["art"] in ("Fenster", "Fenstertür")
        aussen = e["art"] != "Innentür"
        br = e["bruestung"] if e["bruestung"] is not None else (0.0 if e["art"] == "Fenstertür" else 0.9 if fenster else None)
        x = {"id": e["id"], "art": "Fenster" if fenster else "Tür", "b": e["b"], "h": e["h"], "geschoss": e["geschoss"], "aussen": aussen,
             "bruestung": br if fenster else None, "raeume": [nr_id[e["raum"]]] if e.get("raum") in nr_id else []}
        if e.get("nr"):
            x["nr_ifc"] = e["nr"]
        EL.append(x)
        kg = "334" if aussen else "344"
        gm = f" {e['b']:g} × {e['h']:g} m".replace(".", ",") if e["b"] and e["h"] else ""
        key = (kg, x["art"], e["b"], e["h"], e["art"])
        g = G.setdefault(key, {"kg": kg, "art": x["art"], "material": "", "dicke": 0, "einheit": "m²" if fenster and e["b"] and e["h"] else "St", "menge": 0.0,
                               "anzahl": 0, "aussen": aussen, "name": f"{e['art']}{gm}", "code": "", "ids": [], "zustand": "", "flaeche": 0.0})
        g["ids"].append(e["id"])
        g["anzahl"] += 1
        fl = (e["b"] or 0) * (e["h"] or 0)
        g["menge"] += fl if g["einheit"] == "m²" else 1
        g["flaeche"] += fl
    B = list(G.values())
    for g in B:
        g["menge"] = round(g["menge"], 2)
    if schaetzen and RR:
        B = rohbau(RR, EL) + B
    return {"bauteile": B, "raeume": RR, "elemente": EL, "hinweise": [], "info": {"programm": "Bauplattform (von Hand)", "objekte": len(RR) + len(EL)}}


def rohbau(RR, EL):
    """Rohbau grob aus Räumen und Geschossen: Außenwände (Umfang eines fast quadratischen Geschosses × Höhe – Fenster), Innenwände (halber
    Raumumfang – Außenumfang), Bodenplatte, Decken, Dach. Jede Zeile mit Hinweis „geschätzt“."""
    G = {}
    for r in RR:
        G.setdefault(r["geschoss"], []).append(r)
    reihe = sorted(G, key=_rang)
    aw = iw = dk = 0.0
    for g in reihe:
        L = G[g]
        a = sum(r["flaeche"] for r in L) * 1.15   # Wände und Schächte: Brutto ≈ 1,15 × Netto
        h = max(r["hoehe"] for r in L) + 0.3
        p = 4 * math.sqrt(a) * 1.08
        fen = sum((e["b"] or 0) * (e["h"] or 0) for e in EL if e["aussen"] and e["geschoss"] == g)
        aw += max(0.0, p * h - fen)
        iw += max(0.0, (sum(r["umfang"] for r in L) - p) / 2) * (h - 0.3)
        if g != reihe[0]:
            dk += a
    unten = sum(r["flaeche"] for r in G[reihe[0]]) * 1.15
    oben = sum(r["flaeche"] for r in G[reihe[-1]]) * 1.15
    out = []
    for kg, art, nm, m in (("331", "Wand", "Außenwände", aw), ("341", "Wand", "Innenwände", iw), ("322", "Bodenplatte", "Bodenplatte / unterste Decke", unten),
                           ("351", "Decke", "Decken", dk), ("361", "Dach", "Dach", oben * 1.15)):
        if m >= 0.5:
            out.append({"kg": kg, "art": art, "material": "", "dicke": 0, "einheit": "m²", "menge": round(m, 2), "anzahl": 1, "aussen": kg in ("331", "361"),
                        "name": nm, "code": "", "ids": [], "zustand": "", "hinweis": GESCHAETZT})
    return out


def _rang(g):
    s = (g or "").upper()
    for k, w in (("KG", -1), ("UG", -1), ("KELLER", -1), ("EG", 0), ("ERD", 0), ("DG", 50), ("DACH", 50), ("SB", 60), ("SPITZ", 60)):
        if k in s:
            return w
    d = "".join(ch for ch in s if ch.isdigit())
    return int(d) if d and ("OG" in s or "OBER" in s) else 1 if ("OG" in s or "OBER" in s) else 10


# ------------------------------------------------------------------ Vorschlag des Assistenten
PROGRAMM_EG = (("Wohnen", 0.32, 2, 1), ("Küche", 0.12, 1, 0), ("WC", 0.04, 1, 0), ("Flur", 0.12, 0, 0), ("Abstellraum", 0.04, 0, 0))
PROGRAMM_OG = (("Schlafen", 0.22, 1, 0), ("Kind", 0.18, 1, 0), ("Kind", 0.18, 1, 0), ("Bad", 0.10, 1, 0), ("Flur", 0.10, 0, 0))
GROESSE = {"Fenster": (1.26, 1.38, 0.9), "Fenstertür": (1.01, 2.135, 0.0), "klein": (0.885, 0.885, 1.5), "Innentür": (0.885, 2.01, None), "Außentür": (1.01, 2.135, None)}


def vorschlag(m, L=None):
    """Räume, Fenster und Türen vorschlagen: aus dem gültigen Planstand, sonst aus Fläche, Geschossen und Einheiten des Assistenten."""
    L = L or {}
    if L.get("raeume"):
        R = [{"nr": r["nr"], "name": r["name"], "geschoss": r.get("geschoss") or "EG", "flaeche": r.get("flaeche") or 0, "hoehe": r.get("hoehe") or 2.5}
             for r in L["raeume"]]
        E = [{"nr": e.get("nr") or "", "art": e.get("typ") if e.get("typ") in ARTEN else ("Fenster" if e.get("art") == "Fenster" else "Innentür"),
              "geschoss": e.get("geschoss") or "", "raum": (e.get("raeume") or [""])[0], "b": e.get("b"), "h": e.get("h"), "bruestung": e.get("bruestung")}
             for e in L.get("elemente") or []]
        return {"raeume": R, "elemente": E, "quelle": "planstand"}
    a = m.get("assistent") or {}
    fl = _f(a.get("area") or m.get("flaeche"), 0, 100000) or 120.0
    ge = int(_f(a.get("floors") or m.get("geschosse"), 1, 20) or 2)
    ne = int(_f(a.get("units") or m.get("einheiten"), 1, 200) or 1)
    namen = ["EG"] + [f"{k}. OG" if ge > 2 else "OG" for k in range(1, ge)]
    R, E = [], []
    for k, g in enumerate(namen):
        prog = PROGRAMM_EG if (k == 0 and ge > 1) else PROGRAMM_OG if k > 0 else PROGRAMM_EG + (("Schlafen", 0.18, 1, 0), ("Bad", 0.08, 1, 0))
        summe = sum(p[1] for p in prog)
        for w in range(ne if ne <= 4 else 1):
            for nm, anteil, n_fenster, n_ft in prog:
                f = round(fl / ge / (ne if ne <= 4 else 1) * anteil / summe, 1)
                nr = f"{'EG' if k == 0 else g.replace('. ', '').replace(' ', '')}.{len([r for r in R if r['geschoss'] == g]) + 1:02d}"
                R.append({"nr": nr, "name": nm + (f" WE {w + 1}" if 1 < ne <= 4 else ""), "geschoss": g, "flaeche": f, "hoehe": 2.5})
                for _ in range(n_fenster):
                    b, h, br = GROESSE["klein" if nm in ("Bad", "WC") else "Fenster"]
                    E.append({"art": "Fenster", "geschoss": g, "raum": nr, "b": b, "h": h, "bruestung": br})
                for _ in range(n_ft):
                    b, h, br = GROESSE["Fenstertür"]
                    E.append({"art": "Fenstertür", "geschoss": g, "raum": nr, "b": b, "h": h, "bruestung": br})
                if nm != "Flur":
                    b, h, _ = GROESSE["Innentür"]
                    E.append({"art": "Innentür", "geschoss": g, "raum": nr, "b": b, "h": h, "bruestung": None})
                elif k == 0:
                    b, h, _ = GROESSE["Außentür"]
                    E.append({"art": "Außentür", "geschoss": g, "raum": nr, "b": b, "h": h, "bruestung": None})
    nf = nt = 0
    for e in E:
        if e["art"] in ("Fenster", "Fenstertür"):
            nf += 1; e["nr"] = f"F {nf:02d}"
        else:
            nt += 1; e["nr"] = f"T {nt:02d}"
    return {"raeume": R, "elemente": E, "quelle": "assistent"}


# ------------------------------------------------------------------ Adressen (eingehängt in modell.routen)
def routen(bp, mit, lesen_modell, schreiben_modell):
    from datetime import datetime
    from flask import jsonify, request
    from . import bauteilliste as B, planstand as P

    @bp.get("/api/bp/modell/<int:pid>/hand/vorschlag")
    def hand_vorschlag(pid):
        def tun(c, wer):
            m = lesen_modell(c, pid)["modell"]
            return jsonify(vorschlag(m, m.get("bauteilliste")))
        return mit(pid, tun)

    @bp.post("/api/bp/modell/<int:pid>/hand/entwurf")
    def hand_entwurf(pid):
        """Assistent: Räume, Fenster, Türen → neuer Planstand „Assistent“ als Entwurf mit Abgleich (wie Einlesen eines Plans)."""
        d = request.get_json(silent=True) or {}
        RA, EA = sauber(d)
        if not RA:
            return jsonify(error="Bitte mindestens einen Raum angeben."), 400

        def tun(c, wer):
            m = lesen_modell(c, pid)["modell"]
            alt = m.get("bauteilliste") or B.leer()
            R = R_aus(RA, EA)
            neu = B.zeilen_aus_ifc(c, R, alt, B.bauart(m))
            name = _s(d.get("name"), 100) or f"Assistent {datetime.now().strftime('%d.%m.%Y')}"
            neu["quelle"] = {"datei": "", "gelesen": P._jetzt(), "programm": "Bauplattform", "objekte": len(RA) + len(EA), "art": "hand", "pfad": "", "name": name}
            c.execute("DELETE FROM pm_netz WHERE planstand IN (SELECT id FROM pm_planstand WHERE project_id=? AND entwurf=1)", (pid,))
            c.execute("DELETE FROM pm_planstand_datei WHERE planstand IN (SELECT id FROM pm_planstand WHERE project_id=? AND entwurf=1)", (pid,))
            c.execute("DELETE FROM pm_planstand WHERE project_id=? AND entwurf=1", (pid,))
            sid = P._neu(c, pid, name, "", "", "hand", "hand", wer, {"liste": neu, "hinweise": []}, True)
            return jsonify(entwurf=sid, name=name, art="hand", erster=not alt.get("zeilen"), abgleich=P.abgleich(alt, neu), hinweise=[], zeilen=len(neu["zeilen"]))
        return mit(pid, tun)

    @bp.put("/api/bp/modell/<int:pid>/hand")
    def hand_setzen(pid):
        """Arbeitsmaske: Räume bzw. Fenster und Türen von Hand – nur ohne Plan oder wenn der gültige Planstand von Hand ist. Führt ihn direkt nach."""
        d = request.get_json(silent=True) or {}

        def tun(c, wer):
            from . import anweisung
            m = lesen_modell(c, pid)["modell"]
            alt = m.get("bauteilliste") or B.leer()
            Q = alt.get("quelle") or {}
            if alt.get("zeilen") and Q.get("art") not in ("hand", None, ""):
                return jsonify(error="Räume, Fenster und Türen kommen aus dem Plan – ändern im Plan und neu einlesen."), 409
            RA, EA = sauber({"raeume": d["raeume"] if isinstance(d.get("raeume"), list) else alt.get("raeume") or [],
                             "elemente": d["elemente"] if isinstance(d.get("elemente"), list) else _el_zurueck(alt)})
            R = R_aus(RA, EA)
            neu = B.zeilen_aus_ifc(c, R, alt, B.bauart(m))
            neu["anweisungen"] = alt.get("anweisungen") or []
            neu["quelle"] = dict(Q, art="hand", gelesen=P._jetzt(), name=Q.get("name") or f"Von Hand {datetime.now().strftime('%d.%m.%Y')}")
            anweisung.ableiten(c, neu)
            P._sichern(c, pid, neu, wer)   # legt beim ersten Mal den Planstand an
            if neu["quelle"].get("planstand"):
                c.execute("UPDATE pm_planstand SET art='hand' WHERE id=?", (neu["quelle"]["planstand"],))
            schreiben_modell(c, pid, P.anwenden(m, neu), wer)
            return jsonify(dict(lesen_modell(c, pid), planstaende=P.liste(c, pid)))
        return mit(pid, tun)


def _el_zurueck(L):
    """Elemente der Liste → Eingaben der Arbeitsmaske (Art, Raum als Nummer)."""
    return [{"nr": e.get("nr"), "art": e.get("typ") if e.get("typ") in ARTEN else "Fenster", "geschoss": e.get("geschoss"), "raum": (e.get("raeume") or [""])[0],
             "b": e.get("b"), "h": e.get("h"), "bruestung": e.get("bruestung")} for e in L.get("elemente") or []]
