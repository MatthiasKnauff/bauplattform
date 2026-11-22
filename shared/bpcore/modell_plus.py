"""Ergänzen, auch wenn ein Plan gilt (GO 20.11.2026, Mock „Gebäudemodell ergänzen“: A1).

Räume, Fenster und Türen, die im Plan fehlen, stehen als eigene Einträge neben denen aus dem Plan: bauteilliste["plus"] = {raeume, elemente}
in der Form der Arbeitsmaske (modell_hand.sauber). Daraus entstehen – wie aus einem Plan – Räume, Elemente und Zeilen der Checkliste,
alle gekennzeichnet (Zeile und Raum „ergaenzt“, Element quelle „plus“, Kennung der Zeile mit „|+“ am Ende). Zeilen aus dem Plan bleiben,
wie sie sind. Der nächste Planstand nimmt die Ergänzungen mit; findet der Abgleich eine Ergänzung im neuen Plan wieder, fragt er
(„… ist jetzt im Plan – ergänzte Zeile entfernen?“).

sauber(p)                 Eingaben prüfen
anwenden(c, L, art, alt)  Ergänzungen der Liste L neu bilden (Antworten ergänzter Zeilen bleiben; alt = Liste, aus der sie kommen)
treffer(alt, neu)         Ergänzungen, die der neue Planstand jetzt selbst enthält
entfernen(L, weg)         {raeume: [k], elemente: [k]} aus den Ergänzungen nehmen
raumweg_sauber(W), ist_weg(r, W)   Flächen, die aus den Wänden als Raum ermittelt wurden, aber keiner sind (22.11.2026): bauteilliste["raumweg"] =
                          [{g: Geschoss, p: [x, y] Punkt in der Fläche, art: kein | schacht}] – der Punkt trifft die Fläche auch beim nächsten Einlesen
routen()                  PUT /api/bp/modell/<pid>/plus · PUT /api/bp/modell/<pid>/raumweg · PUT /api/bp/modell/<pid>/artje (Art je Bauteil)
"""
import re
from collections import Counter

from . import modell_hand as H

SUF = "|+"
OFF_R, OFF_E = 9_000_000, 9_500_000   # Kennungen neben denen aus dem Plan (IFC-Nummern)
HINWEIS = "Ergänzt – nicht im Plan."


def sauber(p):
    p = p if isinstance(p, dict) else {}
    R, E = H.sauber({"raeume": p.get("raeume"), "elemente": p.get("elemente")})
    R = [{k: r[k] for k in ("nr", "name", "geschoss", "flaeche", "hoehe", "teil") if k in r} for r in R[:200]]
    E = [{k: e[k] for k in ("nr", "art", "geschoss", "raum", "b", "h", "bruestung")} for e in E[:500]]
    return {"raeume": R, "elemente": E} if R or E else {}


def _norm(s):
    return re.sub(r"\W", "", str(s or "")).upper()


def _nummern(P, L):
    """Fehlende Nummern vergeben (nächste freie nach denen des Plans), doppelte Raumnummern kennzeichnen."""
    plan = {_norm(r["nr"]) for r in L.get("raeume") or []}
    for r in P["raeume"]:
        while _norm(r["nr"]) in plan:
            r["nr"] = (r["nr"] + "+")[:20]
        plan.add(_norm(r["nr"]))
    da = {_norm(e.get("nr")) for e in L.get("elemente") or []} | {_norm(e["nr"]) for e in P["elemente"] if e["nr"]}
    for e in P["elemente"]:
        if e["nr"]:
            continue
        v, n = ("F", 1) if e["art"] in ("Fenster", "Fenstertür") else ("T", 1)
        while _norm(f"{v} {n:02d}") in da:
            n += 1
        e["nr"] = f"{v} {n:02d}"
        da.add(_norm(e["nr"]))


def anwenden(c, L, art="", alt=None):
    from . import bauteilliste as B, elemente
    A = [dict(z, id=z["id"][:-len(SUF)]) for z in ((alt if alt is not None else L).get("zeilen") or []) if z.get("ergaenzt") and not z.get("abgeleitet")]
    L["zeilen"] = [z for z in L.get("zeilen") or [] if not z.get("ergaenzt")]
    L["raeume"] = [r for r in L.get("raeume") or [] if not r.get("ergaenzt")]
    L["elemente"] = [e for e in L.get("elemente") or [] if e.get("quelle") != "plus"]
    P = sauber(L.get("plus"))
    if not P:
        L.pop("plus", None)
        return L
    _nummern(P, L)
    L["plus"] = P
    RA, EA = H.sauber(P)
    for r in RA:
        r["id"] += OFF_R
    for e in EA:
        e["id"] += OFF_E
    R = H.R_aus(RA, EA, schaetzen=False)
    plan = {r["nr"]: r["id"] for r in L["raeume"] if r.get("id")}
    for e, x in zip(EA, R["elemente"]):   # der Raum eines ergänzten Fensters kann aus dem Plan sein
        if not x["raeume"] and e.get("raum") in plan:
            x["raeume"] = [plan[e["raum"]]]
    N = B.zeilen_aus_ifc(c, R, {"zeilen": A}, art)
    nr = {e["id"]: e["nr"] for e in EA}
    Z = []
    for z in N["zeilen"]:
        if z["bereich"] not in ("oeffnung", "raum"):
            continue
        z.update(id=z["id"] + SUF, ergaenzt=True, hinweis=(HINWEIS + (" " + z["hinweis"] if z.get("hinweis") else ""))[:300])
        if z["bereich"] == "oeffnung":
            z["nummern"] = [nr.get(i, "") for i in z["ids"]]
        Z.append(z)
    RR = [dict(r, ergaenzt=True) for r in N["raeume"]]
    L["zeilen"] += Z
    L["raeume"] += RR
    L["elemente"] += [dict(e, quelle="plus") for e in elemente.aus_ifc(R["elemente"], Z, L["raeume"])]
    return L


def treffer(alt, neu):
    """Ergänzungen, die der neue Planstand jetzt selbst enthält: Raum mit gleicher Nummer oder gleichem Namen im Geschoss; Fenster/Tür, wenn
    der neue Plan von dieser Art und Größe im Geschoss mehr hat als der alte."""
    P = sauber((alt or {}).get("plus"))
    if not P or ((neu or {}).get("quelle") or {}).get("art") == "hand":
        return []
    out = []
    NR = neu.get("raeume") or []
    nrn = {_norm(r["nr"]) for r in NR}
    namen = {(_norm(r["name"]), _norm(r.get("geschoss"))) for r in NR}
    for k, r in enumerate(P["raeume"]):
        if _norm(r["nr"].rstrip("+")) in nrn or (_norm(r["name"]), _norm(r["geschoss"])) in namen:
            out.append({"art": "raeume", "k": k, "text": f"Raum {r['nr']} {r['name']}"})
    sig = lambda typ, b, h, g: (typ, round(b or 0, 2), round(h or 0, 2), _norm(g))   # noqa: E731
    mehr = Counter(sig(e.get("typ"), e.get("b"), e.get("h"), e.get("geschoss")) for e in neu.get("elemente") or [])
    mehr.subtract(Counter(sig(e.get("typ"), e.get("b"), e.get("h"), e.get("geschoss")) for e in alt.get("elemente") or [] if e.get("quelle") != "plus"))
    for k, e in enumerate(P["elemente"]):
        s = sig(e["art"], e["b"], e["h"], e["geschoss"])
        if mehr[s] > 0:
            mehr[s] -= 1
            gm = f" {e['b']:g} × {e['h']:g} m".replace(".", ",") if e["b"] and e["h"] else ""
            out.append({"art": "elemente", "k": k, "text": f"{e['nr'] or e['art']} ({e['art']}{gm})"})
    return out


def entfernen(L, weg):
    P = sauber(L.get("plus"))
    if not P or not isinstance(weg, dict):
        return L
    for art in ("raeume", "elemente"):
        W = {int(k) for k in (weg.get(art) or []) if str(k).isdigit()}
        P[art] = [x for k, x in enumerate(P[art]) if k not in W]
    L["plus"] = P
    return L


RAUMWEG = {"kein": "kein Raum", "schacht": "Schacht"}


def raumweg_sauber(W):
    out = []
    for w in (W if isinstance(W, list) else [])[:300]:
        if not isinstance(w, dict) or w.get("art") not in RAUMWEG or not isinstance(w.get("p"), (list, tuple)) or len(w["p"]) != 2:
            continue
        try:
            p = [round(float(w["p"][0]), 3), round(float(w["p"][1]), 3)]
        except (TypeError, ValueError):
            continue
        out.append({"g": str(w.get("g") or "")[:40], "p": p, "art": w["art"]})
    return out


def _innen(x, y, P):
    d = False
    for k in range(len(P)):
        (xi, yi), (xj, yj) = P[k], P[k - 1]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            d = not d
    return d


def ist_weg(r, W):
    """Liegt ein Punkt aus W in der ermittelten Fläche r (gleiches Geschoss)? Nur ermittelte Räume – Räume aus dem Plan ändert man im Plan."""
    U = r.get("umriss") or []
    if not r.get("ermittelt") or len(U) < 3:
        return None
    return next((w for w in W if w["g"] == (r.get("geschoss") or "") and _innen(w["p"][0], w["p"][1], U)), None)


def routen(bp, mit, lesen_modell, schreiben_modell):
    from flask import jsonify, request
    from . import anweisung, bauteilliste as B, planstand as P

    @bp.put("/api/bp/modell/<int:pid>/plus")
    def plus_setzen(pid):
        """Ergänzte Räume bzw. Fenster und Türen neben dem gültigen Plan: {raeume?: [...], elemente?: [...]} – jeweils die ganze Liste."""
        d = request.get_json(silent=True) or {}

        def tun(c, wer):
            m = lesen_modell(c, pid)["modell"]
            L = m.get("bauteilliste") or B.leer()
            Q = L.get("quelle") or {}
            if not L.get("zeilen") or Q.get("art") == "hand":   # wie die Oberfläche (gmHandModus): ohne Zeilen oder Planstand von Hand = Arbeitsmaske
                return jsonify(error="Ohne Plan stehen Räume, Fenster und Türen direkt in der Liste – dort eintragen."), 409
            alt = sauber(L.get("plus")) or {"raeume": [], "elemente": []}
            L["plus"] = {"raeume": d["raeume"] if isinstance(d.get("raeume"), list) else alt["raeume"],
                         "elemente": d["elemente"] if isinstance(d.get("elemente"), list) else alt["elemente"]}
            anwenden(c, L, B.bauart(m))
            if len(L["zeilen"]) > 400:
                return jsonify(error="Die Checkliste ist voll (400 Zeilen)."), 400
            anweisung.ableiten(c, L)
            schreiben_modell(c, pid, P.anwenden(m, L), wer)
            return jsonify(lesen_modell(c, pid))
        return mit(pid, tun)

    @bp.put("/api/bp/modell/<int:pid>/raumweg")
    def raumweg_setzen(pid):
        """Eine aus den Wänden ermittelte Fläche ist kein Raum (oder ein Schacht) – bzw. doch wieder einer: {g, p: [x, y], art: kein | schacht | ""}.
        Die Liste wird aus der gespeicherten IFC-Datei des gültigen Planstands neu gebildet (wie beim Einlesen, Antworten bleiben)."""
        d = request.get_json(silent=True) or {}

        def tun(c, wer):
            m = lesen_modell(c, pid)["modell"]
            L = m.get("bauteilliste") or B.leer()
            Q = L.get("quelle") or {}
            if not Q.get("planstand") or (Q.get("art") or "ifc") != "ifc":
                return jsonify(error="Ermittelte Räume gibt es nur mit einem eingelesenen IFC-Plan."), 409
            W = raumweg_sauber(L.get("raumweg"))
            neu = raumweg_sauber([{"g": d.get("g"), "p": d.get("p"), "art": d.get("art")}])
            if not neu and d.get("art"):
                return jsonify(error="Angabe unvollständig."), 400
            g = str(d.get("g") or "")[:40]
            U = d.get("umriss") if isinstance(d.get("umriss"), list) else []
            try:   # dieselbe Fläche: Punkte darin (Umriss der Fläche) bzw. derselbe Punkt
                U = [[float(a[0]), float(a[1])] for a in U if isinstance(a, (list, tuple)) and len(a) == 2]
            except (TypeError, ValueError):
                U = []
            W = [w for w in W if not (w["g"] == g and ((len(U) >= 3 and _innen(w["p"][0], w["p"][1], U)) or (neu and w["p"] == neu[0]["p"])))]
            W += neu
            return _neu_bilden(c, pid, m, L, wer, W=W)
        return mit(pid, tun)

    def _neu_bilden(c, pid, m, L, wer, W=None, AJ=None):
        """Liste aus der gespeicherten IFC-Datei des gültigen Planstands neu bilden (wie beim Einlesen, Antworten bleiben) –
        mit geänderten Flächen ohne Raum (W) bzw. Art je Bauteil (AJ, Schlüssel GlobalId oder „#<Nummer>“)."""
        from . import cadimport
        Q = L.get("quelle") or {}
        S = P.elemente(c, pid, Q["planstand"])   # einmal gelesen und beim Planstand aufgehoben – hier nur neu ordnen (Millisekunden)
        if not S:
            return jsonify(error="Die IFC-Datei dieses Planstands liegt nicht vor – bitte den Plan noch einmal einlesen."), 409
        W = raumweg_sauber(L.get("raumweg")) if W is None else W
        R = cadimport.ifc_ordnen(S, {**(L.get("art_je") or {}), **(AJ or {})})
        art = B.bauart(m)
        alt = dict(L, raumweg=W)
        if AJ is not None:   # neu bestimmt: was R meldet (GlobalId), ersetzt die Einträge dieser Bauteile
            alt["art_je"] = {**(L.get("art_je") or {}), **(R.get("art_je") or {})}
        N = B.zeilen_aus_ifc(c, R, alt, art)
        L2 = P.uebernehmen(alt, N)
        L2["quelle"] = Q
        if W:
            L2["raumweg"] = W
        else:
            L2.pop("raumweg", None)
        if N.get("art_je"):
            L2["art_je"] = N["art_je"]
        if L2.get("plus"):
            anwenden(c, L2, art, L)
        anweisung.ableiten(c, L2)
        P._sichern(c, pid, L2, wer)
        schreiben_modell(c, pid, P.anwenden(m, L2), wer)
        return jsonify(lesen_modell(c, pid))

    @bp.put("/api/bp/modell/<int:pid>/artje")
    def art_je_setzen(pid):
        """Art einzelner Bauteile berichtigen (22.11.2026: „eine Außenwand wird als Innenwand erkannt“): {ids: [Nummer im Plan], kg}
        oder {je: {Nummer: kg}} (Rückgängig: jedes Bauteil zurück auf seine alte Art – eine Anfrage). Die Bauteile wandern in die Zeile
        ihrer neuen Art; gemerkt je GlobalId – bleibt beim Neubilden und beim nächsten Einlesen."""
        d = request.get_json(silent=True) or {}
        je = d.get("je") if isinstance(d.get("je"), dict) else {x: d.get("kg") for x in (d.get("ids") or [])}
        AJ = {f"#{int(i)}": str(k) for i, k in list(je.items())[:2000] if str(i).isdigit() and str(k or "") in B.ARTEN}
        if not AJ:
            return jsonify(error="Art oder Bauteile fehlen."), 400

        def tun(c, wer):
            m = lesen_modell(c, pid)["modell"]
            L = m.get("bauteilliste") or B.leer()
            Q = L.get("quelle") or {}
            if not Q.get("planstand") or (Q.get("art") or "ifc") != "ifc":
                return jsonify(error="Die Art einzelner Bauteile lässt sich nur in einem eingelesenen IFC-Plan ändern – sonst „Art“ an der Zeile."), 409
            return _neu_bilden(c, pid, m, L, wer, AJ=AJ)
        return mit(pid, tun)
