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
                  "flaeche": _f(r.get("flaeche"), 0, 10000) or 0, "hoehe": _f(r.get("hoehe"), 1.5, 20) or 2.5, "umfang": _f(r.get("umfang"), 0, 2000),
                  **({"teil": _s(r.get("teil"), 20)} if _s(r.get("teil"), 20) else {})})
    for k, e in enumerate((d.get("elemente") if isinstance(d.get("elemente"), list) else [])[:2000]):
        if not isinstance(e, dict):
            continue
        art = e.get("art") if e.get("art") in ARTEN else ("Fenster" if e.get("art") not in ("Tür",) else "Innentür")
        E.append({"id": k + 1, "nr": _s(e.get("nr"), 20), "art": art, "geschoss": _s(e.get("geschoss"), 40) or "EG", "raum": _s(e.get("raum"), 20),
                  "b": _f(e.get("b"), 0, 50), "h": _f(e.get("h"), 0, 50), "bruestung": _f(e.get("bruestung"), 0, 20)})
    return R, E


def R_aus(raeume, elemente, schaetzen=True, assistent=None, teile=None):
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
        B = rohbau(RR, EL, assistent, teile) + B
    return {"bauteile": B, "raeume": RR, "elemente": EL, "hinweise": [], "info": {"programm": "Bauplattform (von Hand)", "objekte": len(RR) + len(EL)}}


# Bauweise des Assistenten (choice.tragwerk, flTw je Geschoss) → Aufbau aus den Baudaten; die Preisspanne kommt von dort
WORT = {"massiv": "Mauerwerk", "stb": "Stahlbeton", "holz": "Holzrahmenbau", "bsp": "Brettsperrholz"}
AUFBAU = {"341": {"massiv": "341.01", "stb": "341.03", "holz": "341.05", "bsp": "341.06"},
          "351": {"massiv": "351.01", "stb": "351.01", "holz": "351.04", "bsp": "351.05"}}


def _aw(bw, fassade):
    if bw == "massiv":
        return {"putz": "331.02", "klinker": "331.03", "vhf": "331.11"}.get(fassade, "331.01")
    if bw == "stb":
        return "331.05" if fassade == "vhf" else "331.04"
    return {"holz": "331.07", "bsp": "331.17"}[bw]


def bauweisen(a, reihe):
    """Bauweise je Geschoss wie plankern.floorTw: einheitlich aus „tragwerk“, bei „gemischt“ je Geschoss (Vorgabe EG massiv, darüber Holz)."""
    ch = (a or {}).get("choice") or {}
    tw = ch.get("tragwerk") or "massiv"
    if tw != "misch":
        return {g: tw if tw in WORT else "massiv" for g in reihe}
    norm = lambda x: "".join(ch for ch in str(x).upper() if ch.isalnum())   # noqa: E731 – „1. OG“ = „1.OG“
    F = {norm(k): v for k, v in ((a or {}).get("flTw") or {}).items() if v in WORT}
    return {g: F.get(norm(g)) or ("massiv" if k == 0 else "holz") for k, g in enumerate(reihe)}


def _dach(a, bw_oben):
    """→ (flach, [(kg, Name, Vorlage, Faktor auf die Grundfläche)])"""
    ch = (a or {}).get("choice") or {}
    flach = ch.get("dachform") == "flach"
    dd = ch.get("dachdeckung") or ""
    if flach:
        return True, [("361", "Dach (Konstruktion)", "361.04" if bw_oben in ("massiv", "stb") else "361.03", 1.05),
                      ("363", "Dachabdichtung mit Dämmung", "363.10" if dd == "kunststoff" else "363.09", 1.05)]
    return False, [("361", "Dach (Konstruktion)", "361.01", 1.35), ("363", "Dachdeckung", {"schiefer": "363.02", "metall": "363.03"}.get(dd, "363.01"), 1.35),
                   ("363", "Dachdämmung", "363.04", 1.35)]


def rohbau(RR, EL, a=None, teile=None):
    """Rohbau grob aus Räumen und Geschossen: Außenwände (Umfang eines fast quadratischen Geschosses × Höhe – Fenster), Innenwände (halber
    Raumumfang – Außenumfang), Bodenplatte, Decken, Dach – je Bauweise des Assistenten mit passendem Aufbau aus den Baudaten (Spanne von dort).
    Jede Zeile mit Hinweis „geschätzt“. Gebäudeteile (18.11.2026): Räume mit „teil“ → je Teil eigene Zeilen mit dessen Bauweise und Dach;
    die Aufstockung steht auf dem Bestand (keine Bodenplatte)."""
    T = {t["k"]: t for t in (teile or []) if isinstance(t, dict) and t.get("k")}
    tks = list(dict.fromkeys(r.get("teil") or "" for r in RR))
    if len(tks) > 1 or (tks and tks[0] and tks[0] in T and len(T) > 1):
        out = []
        for tk in tks:
            t = T.get(tk) or {}
            a2 = dict(a or {}, choice=dict((a or {}).get("choice") or {}))
            if t.get("bauweise") in WORT:
                a2["choice"]["tragwerk"] = t["bauweise"]
            if t.get("dach"):
                a2["choice"]["dachform"] = t["dach"]
            a2["choice"].update({g: v for g, v in (t.get("huelle") or {}).items() if v})   # Dachdeckung, Fassade, Fenster des Teils
            if t.get("flTw"):   # Bauweise je Geschoss des Teils
                a2["choice"]["tragwerk"] = "misch"
                a2["flTw"] = t["flTw"]
            R1 = [r for r in RR if (r.get("teil") or "") == tk]
            ids = {r["id"] for r in R1}   # Fenster gehören über ihren Raum zum Teil (Geschossnamen wiederholen sich je Teil)
            Z = rohbau(R1, [e for e in EL if set(e.get("raeume") or []) & ids or (not e.get("raeume") and tk == tks[0])], a2)
            auf = any(x.get("art") == "aufstock" for x in T.values())
            for z in Z:
                if (t.get("art") == "aufstock" and z["kg"] == "322") or (auf and t.get("art") == "bestand" and z["art"] == "Dach"):
                    continue   # Aufstockung: keine Bodenplatte; ihr Dach ersetzt das des Bestands
                z["teil"] = tk
                if t.get("neu"):
                    z["zustand"] = "neu"   # Anbau, Aufstockung, neuer Teil: alles neu – Aufbau nach der Bauweise des Teils
                z["name"] += f" – {t.get('n') or tk}" if tk else ""
                out.append(z)
        return out
    G = {}
    for r in RR:
        G.setdefault(r["geschoss"], []).append(r)
    reihe = sorted(G, key=_rang)
    BW = bauweisen(a, reihe)
    fassade = ((a or {}).get("choice") or {}).get("fassade") or ""
    aw, iw, dk = {}, {}, {}
    for k, g in enumerate(reihe):
        L, bw = G[g], BW[g]
        fl = sum(r["flaeche"] for r in L) * 1.15   # Wände und Schächte: Brutto ≈ 1,15 × Netto
        h = max(r["hoehe"] for r in L) + 0.3
        p = 4 * math.sqrt(fl) * 1.08
        fen = sum((e["b"] or 0) * (e["h"] or 0) for e in EL if e["aussen"] and e["geschoss"] == g)
        aw[bw] = aw.get(bw, 0.0) + max(0.0, p * h - fen)
        iw[bw] = iw.get(bw, 0.0) + max(0.0, (sum(r["umfang"] for r in L) - p) / 2) * (h - 0.3)
        if k:
            unter = BW[reihe[k - 1]]   # die Decke gehört zum Geschoss darunter
            dk[unter] = dk.get(unter, 0.0) + fl
    unten = sum(r["flaeche"] for r in G[reihe[0]]) * 1.15
    oben = sum(r["flaeche"] for r in G[reihe[-1]]) * 1.15
    flach, D = _dach(a, BW[reihe[-1]])
    mehr = len(set(BW.values())) > 1
    zeilen = [("331", "Wand", "Außenwände", WORT[bw] if mehr else "", m, _aw(bw, fassade)) for bw, m in aw.items()]
    zeilen += [("341", "Wand", "Innenwände", WORT[bw] if mehr else "", m, AUFBAU["341"][bw]) for bw, m in iw.items()]
    zeilen.append(("322", "Bodenplatte", "Bodenplatte / unterste Decke", "", unten, "322.04"))
    zeilen += [("351", "Decke", "Decken", WORT[bw] if mehr else "", m, AUFBAU["351"][bw]) for bw, m in dk.items()]
    zeilen += [(kg, "Dach", nm, "", oben * f, v) for kg, nm, v, f in D]
    out = []
    for kg, art, nm, mat, m, v in zeilen:
        if m >= 0.5:
            out.append({"kg": kg, "art": art, "material": mat, "dicke": 0, "einheit": "m²", "menge": round(m, 2), "anzahl": 1, "aussen": kg in ("331", "361", "363"),
                        "name": nm, "code": "", "ids": [], "zustand": "", "hinweis": GESCHAETZT, "vorlage": v, "geschaetzt": True})
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
        R = [{"nr": r["nr"], "name": r["name"], "geschoss": r.get("geschoss") or "EG", "flaeche": r.get("flaeche") or 0, "hoehe": r.get("hoehe") or 2.5,
              **({"teil": r["teil"]} if r.get("teil") else {})} for r in L["raeume"]]
        E = [{"nr": e.get("nr") or "", "art": e.get("typ") if e.get("typ") in ARTEN else ("Fenster" if e.get("art") == "Fenster" else "Innentür"),
              "geschoss": e.get("geschoss") or "", "raum": (e.get("raeume") or [""])[0], "b": e.get("b"), "h": e.get("h"), "bruestung": e.get("bruestung")}
             for e in L.get("elemente") or []]
        return {"raeume": R, "elemente": E, "quelle": "planstand"}
    a = m.get("assistent") or {}
    fl = _f(a.get("area") or m.get("flaeche"), 0, 100000) or 120.0
    ge = int(_f(a.get("floors") or m.get("geschosse"), 1, 20) or 2)
    ne = int(_f(a.get("units") or m.get("einheiten"), 1, 200) or 1)
    R, E = [], []
    T = [t for t in (m.get("teile") or []) if isinstance(t, dict) and t.get("k")]
    if len(T) < 2:
        _programm(R, E, fl, ge, ne)
        return _nummern(R, E)
    for i, t in enumerate(T):   # Gebäudeteile (18.11.2026): Räume je Teil, Nummern mit Kürzel des Teils, Aufstockung über dem Bestand
        f_t = (_f(t.get("flaeche"), 0, 100000) or 0) if i else fl
        g_t = int(t.get("geschosse") or 1) if i else ge
        if not f_t:
            continue
        z = next(((j, x) for j, x in enumerate(T) if x["k"] == t.get("auf")), None) if t.get("art") == "aufstock" else None   # Aufstockung auf ihrem Teil (GG-D1)
        ab = (int(z[1].get("geschosse") or 1) if z and z[0] else ge) if t.get("art") == "aufstock" else 0
        _programm(R, E, f_t, g_t, ne if not i else 1, ab=ab, teil=t["k"], vor="" if not i else (t.get("n") or "T")[:1].upper() + str(i) + "-")
    return _nummern(R, E)


def _programm(R, E, fl, ge, ne, ab=0, teil="", vor=""):
    """Räume, Fenster, Türen eines Gebäudes bzw. Gebäudeteils (ab = Geschosse darunter, z. B. Aufstockung auf dem Bestand)."""
    gesamt = ab + ge
    namen = [("EG" if k == 0 else f"{k}. OG" if gesamt > 2 else "OG") for k in range(ab, ab + ge)]
    for j, g in enumerate(namen):
        k = ab + j
        prog = PROGRAMM_EG if (k == 0 and ge > 1) else PROGRAMM_OG if k > 0 else PROGRAMM_EG + (("Schlafen", 0.18, 1, 0), ("Bad", 0.08, 1, 0))
        summe = sum(p[1] for p in prog)
        for w in range(ne if ne <= 4 else 1):
            for nm, anteil, n_fenster, n_ft in prog:
                f = round(fl / ge / (ne if ne <= 4 else 1) * anteil / summe, 1)
                nr = f"{vor}{'EG' if k == 0 else g.replace('. ', '').replace(' ', '')}.{len([r for r in R if r['geschoss'] == g and r.get('teil', '') == teil]) + 1:02d}"
                R.append({"nr": nr, "name": nm + (f" WE {w + 1}" if 1 < ne <= 4 else ""), "geschoss": g, "flaeche": f, "hoehe": 2.5, **({"teil": teil} if teil else {})})
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


def _nummern(R, E):
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
            R = R_aus(RA, EA, assistent=m.get("assistent"), teile=m.get("teile"))
            neu = B.zeilen_aus_ifc(c, R, alt, B.bauart(m))
            neu["anweisungen"] = alt.get("anweisungen") or []
            neu["raumbuch"] = alt.get("raumbuch") or {}
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
