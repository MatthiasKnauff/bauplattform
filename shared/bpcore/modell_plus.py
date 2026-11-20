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
routen()                  PUT /api/bp/modell/<pid>/plus
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
