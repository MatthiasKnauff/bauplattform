"""Fenster und Türen einzeln im Gebäudemodell (GO 16.11.2026, Entwurf „Gebäudemodell wie alle Apps + Elemente und Anweisungen“, Fragen 7 und 8).

Das Modell hält jedes Fenster und jede Tür einzeln (bauteilliste["elemente"]): Nummer, Art, Geschoss, Räume, Breite, Höhe, Brüstung,
außen/innen und die Zeile der Checkliste, zu der es gehört. Die Checkliste fasst nur zusammen; Anweisungen (anweisung.py) wählen Elemente
einzeln aus (z. B. „nicht bodentief“ = Brüstung ≥ 0,20 m).

Quelle der Fenster- & Türliste der Ausschreibung ist das Modell (Frage 8): tuerliste_abgleich() sagt, was in der Liste fehlt oder anders ist,
tuerliste_uebernehmen() schreibt Nummer, Geschoss, Raum, Art, Maße und Brüstung hinein (Zeilen mit „mid“ = Element im Modell) und lässt die
Ausschreibungsfelder (Zarge, Beschlag, Brandschutz …) stehen. aus_tuerliste() holt eine vorhandene Liste einmal ins Modell, wenn der Plan
keine Fenster und Türen kennt (DXF, PDF oder noch kein Plan).
"""
import json

from .wert import kurz as _s

BODENTIEF = 0.20   # Brüstung darunter = bodentief (Fenstertür, Hebeschiebetür)


def _z(v, lo=0.0, hi=1e6):
    try:
        x = float(str(v).replace(",", "."))
    except (TypeError, ValueError):
        return None
    return round(min(hi, max(lo, x)), 3)


def art_text(e):
    """Art für Liste und Ausschreibung: Fenster, Fenstertür, Innentür, Außentür."""
    if e.get("art") == "Fenster":
        return "Fenstertür" if e.get("bruestung") is not None and e["bruestung"] < BODENTIEF else "Fenster"
    return "Außentür" if e.get("aussen") else "Innentür"


def aus_ifc(EL, Z, raeume):
    """Elemente aus dem IFC (cadimport, bestand=True) mit Nummer und Zeile der Checkliste; Räume als Raumnummern."""
    nr_von = {}
    zeile_von = {}
    for z in Z:
        if z.get("bereich") != "oeffnung":
            continue
        z["mitglieder"] = [str(i) for i in z.get("ids") or []]   # Anweisungen teilen Zeilen nach ihren Mitgliedern auf
        for k, i in enumerate(z.get("ids") or []):
            zeile_von[i] = z["id"]
            if k < len(z.get("nummern") or []):
                nr_von[i] = z["nummern"][k]
    raum_nr = {r["id"]: r["nr"] for r in raeume if r.get("id")}
    out = []
    for e in EL:
        if e["id"] not in zeile_von:
            continue
        x = {"id": e["id"], "nr": e.get("nr_ifc") or nr_von.get(e["id"], ""),   # Nummer aus dem Plan vor der fortlaufenden
             "art": e.get("art") or "", "geschoss": e.get("geschoss") or "", "aussen": bool(e.get("aussen")),
             "b": _z(e.get("b"), 0, 50), "h": _z(e.get("h"), 0, 50), "bruestung": _z(e.get("bruestung"), 0, 20) if e.get("bruestung") is not None else None,
             "raeume": [raum_nr[r] for r in e.get("raeume") or [] if r in raum_nr], "zeile": zeile_von[e["id"]], "quelle": "ifc"}
        x["typ"] = art_text(x)
        out.append(x)
    out.sort(key=lambda x: (x["nr"][:1], x["nr"]))
    return out


def sauber(v):
    out = []
    for e in (v if isinstance(v, list) else [])[:3000]:
        if not isinstance(e, dict) or not str(e.get("id") or "").strip():
            continue
        x = {"id": int(e["id"]) if str(e["id"]).isdigit() else _s(e["id"], 30), "nr": _s(e.get("nr"), 20), "art": "Tür" if e.get("art") == "Tür" else "Fenster",
             "geschoss": _s(e.get("geschoss"), 40), "aussen": bool(e.get("aussen")), "b": _z(e.get("b"), 0, 50), "h": _z(e.get("h"), 0, 50),
             "bruestung": _z(e.get("bruestung"), 0, 20) if e.get("bruestung") is not None else None,
             "raeume": [_s(r, 20) for r in (e.get("raeume") or [])[:4]], "zeile": _s(e.get("zeile"), 200), "quelle": _s(e.get("quelle"), 12) or "ifc"}
        x["typ"] = art_text(x)
        out.append(x)
    return out


# ------------------------------------------------------------------ Fenster- & Türliste der Ausschreibung (Frage 8)
def _mm(v):
    return str(int(round(v * 1000))) if v else ""


def _zeile_liste(e, raeume):
    R = {r["nr"]: r for r in raeume or []}
    r0 = R.get((e.get("raeume") or [""])[0]) or {}
    t = {"mid": str(e["id"]), "nr": e.get("nr") or "", "geschoss": e.get("geschoss") or "", "raum": r0.get("nr", ""), "raumname": r0.get("name", ""),
         "art": e.get("typ") or art_text(e), "anzahl": "1", "b": _mm(e.get("b")), "h": _mm(e.get("h"))}
    if len(e.get("raeume") or []) > 1:
        r1 = R.get(e["raeume"][1]) or {}
        t["zu"] = " ".join(x for x in (r1.get("nr", ""), r1.get("name", "")) if x)
    if e.get("art") == "Fenster" and e.get("bruestung") is not None:
        t["bruestung"] = _mm(e["bruestung"]) or "0"
    return {k: v for k, v in t.items() if v not in ("", None)}


IN_LISTE = ("neu", "erneuern")   # nur was eingebaut wird (Entscheidung E, 16.11.2026); Zeilen ohne Checkliste (aus der Liste selbst) zählen als neu
MODELL_FELDER = ("nr", "geschoss", "raum", "raumname", "zu", "art", "b", "h", "bruestung")


def _key(pid, liste):
    liste = str(liste or "1")
    return f"tueren:{pid}" if liste == "1" else f"tueren:{pid}:{liste}"


def tuerliste_abgleich(c, pid, L, liste="1", nur=""):
    """Was eine Liste der Ausschreibung (Vorgabe „1“) gegenüber dem Modell anders hat → {neu, geaendert, liste} (liste = Zeilen nach dem Übernehmen).
    nur = "fenster" | "tueren" | "" – z. B. Fenster in Liste A, Türen in Liste B (Entscheidung D, 16.11.2026)."""
    from . import konto
    from .jsonwert import lies
    E = [e for e in (L or {}).get("elemente") or [] if not nur or (e.get("art") == "Fenster") == (nur == "fenster")]
    d = lies(konto._get(c, _key(pid, liste)), {}) or {}
    T = [dict(t) for t in d.get("tueren") or []]
    if not E:
        return {"neu": 0, "geaendert": 0, "liste": T, "daten": d}
    by_mid = {t.get("mid"): t for t in T if t.get("mid")}
    by_nr = {t.get("nr"): t for t in T if t.get("nr") and not t.get("mid")}
    neu = geaendert = 0
    st = {z["id"]: z.get("status") for z in (L or {}).get("zeilen") or []}
    for e in E:
        if st.get(e.get("zeile"), "neu") not in IN_LISTE:   # Bestand, der bleibt, und Abbruch kommen nicht in die Liste (Entscheidung E)
            continue
        soll = _zeile_liste(e, (L or {}).get("raeume"))
        t = by_mid.get(soll["mid"]) or by_nr.get(soll.get("nr"))
        if t is None:
            import uuid
            T.append({"id": uuid.uuid4().hex[:10], "flg": "1-flg.", **soll})
            neu += 1
            continue
        ab = t.get("abw") or {}   # in der Türliste bewusst anders als im Plan (IFC, D1 18.11.2026): bleibt; holt der Plan auf, ist die Abweichung weg
        for k in [k for k in ab if t.get(k) == soll.get(k)]:
            ab.pop(k)
        anders = {k: soll[k] for k in ("mid",) + MODELL_FELDER if k in soll and t.get(k) != soll[k] and k not in ab}
        for k in [k for k in MODELL_FELDER if k in ab and k in soll]:
            ab[k] = soll[k]
        if "abw" in t and not ab:
            t.pop("abw")
        if set(anders) - {"mid"}:
            geaendert += 1
        t.update(anders)
    return {"neu": neu, "geaendert": geaendert, "liste": T, "daten": d}


def tuerliste_uebernehmen(c, pid, L, wer, liste="1", nur=""):
    from . import konto
    A = tuerliste_abgleich(c, pid, L, liste, nur)
    if not (A["neu"] or A["geaendert"]):
        return A
    d = dict(A["daten"], tueren=A["liste"], rev=int(A["daten"].get("rev") or 0) + 1, updated_by=wer)
    konto._put(c, _key(pid, liste), json.dumps(d, ensure_ascii=False), wer)
    return A


def aus_tuerliste(c, pid):
    """Vorhandene Liste „1“ einmal ins Modell (wenn der Plan keine Fenster und Türen hat) → Elemente mit Quelle „tuerliste“."""
    from . import konto
    from .jsonwert import lies

    def m(v):
        try:
            x = float(str(v).replace(" ", "").replace(",", "."))
        except (TypeError, ValueError):
            return None
        return x / 1000 if x >= 10 else x
    out = []
    for k, t in enumerate((lies(konto._get(c, f"tueren:{pid}"), {}) or {}).get("tueren") or []):
        art = str(t.get("art") or "")
        fenster = "fenster" in art.lower()
        x = {"id": f"tl{t.get('id') or k}", "nr": t.get("nr") or "", "art": "Fenster" if fenster else "Tür", "geschoss": t.get("geschoss") or "",
             "aussen": fenster or "außen" in art.lower() or "haus" in art.lower(), "b": m(t.get("b")), "h": m(t.get("h")),
             "bruestung": m(t.get("bruestung")) if t.get("bruestung") not in (None, "") else (0.0 if art == "Fenstertür" else None),
             "raeume": [x for x in (t.get("raum"),) if x], "zeile": "", "quelle": "tuerliste"}
        x["typ"] = art_text(x)
        out.append(x)
    return out


def zeilen_aus_tuerliste(E, art_von_projekt=""):
    """Zeilen der Checkliste für Elemente aus der Türliste (ohne Plan): je Art eine Zeile, Mitglieder = Elemente."""
    from .bauteilliste import _zeile, erlaubt
    G = {}
    for e in E:
        G.setdefault(e["typ"], []).append(e)
    Z = []
    for typ, L in sorted(G.items()):
        fenster = L[0]["art"] == "Fenster"
        aussen = any(e["aussen"] for e in L)
        fl = sum((e.get("b") or 0) * (e.get("h") or 0) for e in L)
        z = _zeile(id=f"tl:{typ}", bereich="oeffnung", art=typ, kg="334" if aussen else "344", name=f"{typ} (aus der Türliste)",
                   menge=round(fl, 2) if fenster and fl else len(L), einheit="m²" if fenster and fl else "St", anzahl=len(L), zustand="neu" if art_von_projekt == "neubau" else "bestand",
                   status="neu" if art_von_projekt == "neubau" else "offen", quelle="tuerliste", mitglieder=[str(e["id"]) for e in L], nummern=[e["nr"] for e in L])
        z["erlaubt"] = erlaubt(z)
        for e in L:
            e["zeile"] = z["id"]
        Z.append(z)
    return Z


def abweichungen(c, pid):
    from .jsonwert import lies
    out = {}
    for r in c.execute("SELECT data FROM bp_store WHERE key=? OR key LIKE ?", (f"tueren:{pid}", f"tueren:{pid}:%")).fetchall():
        for t in (lies(r["data"], {}) or {}).get("tueren") or []:
            if t.get("mid") and t.get("abw"):
                out.setdefault(str(t["mid"]), {}).update({k: {"liste": t.get(k) or "", "plan": v} for k, v in t["abw"].items()})
    return out


def routen(bp, mit, lesen_modell, schreiben_modell):
    from flask import jsonify

    @bp.post("/api/bp/modell/<int:pid>/elemente/aus_tuerliste")
    def elemente_aus_tuerliste(pid):
        """Plan ohne Fenster und Türen (DXF, PDF, noch kein Plan): die Fenster- & Türliste der Ausschreibung einmal ins Modell holen."""
        def tun(c, wer):
            from . import bauteilliste as B
            M = lesen_modell(c, pid)
            m = M["modell"]
            L = B.sauber(m.get("bauteilliste"))
            if L.get("elemente"):
                return jsonify(error="Das Modell hat schon Fenster und Türen (aus dem Plan)."), 400
            E = aus_tuerliste(c, pid)
            if not E:
                return jsonify(error="Die Fenster- & Türliste der Ausschreibung ist leer."), 400
            L["zeilen"] = [z for z in L["zeilen"] if z.get("quelle") != "tuerliste"] + zeilen_aus_tuerliste(E, B.bauart(m))
            L["elemente"] = E
            m["bauteilliste"] = L
            schreiben_modell(c, pid, m, wer)
            return jsonify(n=len(E), **lesen_modell(c, pid))
        return mit(pid, tun)

    @bp.get("/api/bp/modell/<int:pid>/elemente/abweichungen")
    def elemente_abweichungen(pid):
        """Was die Fenster- & Türlisten bewusst anders haben als der Plan (IFC, D1 18.11.2026) → {mid: {Feld: {liste, plan}}} – für „An den Zeichner“."""
        return mit(pid, lambda c, wer: jsonify(abweichungen(c, pid)))

    @bp.post("/api/bp/modell/<int:pid>/raum")
    def raum_benennen(pid):
        """Namen eines Raums ändern (vor allem aus den Wänden ermittelte – die Geometrie kennt keine Namen): {nr, name}."""
        from flask import request
        d = request.get_json(silent=True) or {}

        def tun(c, wer):
            from . import bauteilliste as B
            m = lesen_modell(c, pid)["modell"]
            L = B.sauber(m.get("bauteilliste"))
            r = next((x for x in L["raeume"] if x["nr"] == str(d.get("nr") or "")), None)
            name = str(d.get("name") or "").strip()[:200]
            if not r or not name:
                return jsonify(error="Raum nicht gefunden oder Name leer."), 400
            r["name"] = name
            m["bauteilliste"] = L
            schreiben_modell(c, pid, m, wer)
            return jsonify(**lesen_modell(c, pid))
        return mit(pid, tun)
