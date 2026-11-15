"""Baukosten: Kennwert und Bauteile mischen (beschlossen am 15.11.2026).

Jede Kostengruppe der 2. Ebene (z. B. 330 Außenwände) hat bis zu drei Quellen: den Kennwert-Anteil (Fläche × €/m²), geschätzte Bauteile
(Überschlag aus Raumbuch oder Planungsassistent, Vorschlag der KI – grau) und bekannte Bauteile (IFC, Ausstattung, Baukasten, von Hand).
Die Gewichtung w sagt, wie stark die Bauteile gegenüber dem Kennwert zählen:  Betrag = (1 − w) · Kennwert + w · Bauteile.

Automatik:      bekannte Bauteile zählen voll, geschätzte halb, gemischt anteilig nach Betrag; ohne Bauteile gilt der Kennwert.
Hauptschieber:  verschiebt alle Gruppen gemeinsam (0 % = nur Kennwert, Stand der Automatik = unverändert, 100 % = nur Bauteile);
                was an einer Kostengruppe von Hand gestellt ist, bleibt stehen.
Dieselbe Rechnung steht im Browser (static/baukosten-kern.js: mixGewichte) – beide müssen gleich bleiben (tools/tests/js/baukosten_mix.test.mjs).
"""
import re

GESCH = ("Vorschlag", "Modell", "KI")   # Herkunft (src) geschätzter Bauteile; alles andere gilt als bekannt
ALT = {"haupt": 100.0, "kg": {}}       # Kostenermittlungen von vor dem 15.11.2026: Bauteile ersetzen den Kennwert ganz (wie bisher)
NEU = {"haupt": None, "kg": {}}        # neue: Automatik


def geschaetzt(b):
    return str(b.get("src") or "").startswith(GESCH)


def _p(v):
    try:
        x = float(str(v).replace(",", "."))
    except (TypeError, ValueError):
        return None
    return round(min(100.0, max(0.0, x)), 1) if x == x else None


def clean(v):
    """Gewichtung säubern: haupt = None (Automatik) oder 0–100, kg = {Kostengruppe der 2. Ebene: 0–100} (von Hand gestellt)."""
    if not isinstance(v, dict):
        return {"haupt": ALT["haupt"], "kg": {}}
    kg = v.get("kg") if isinstance(v.get("kg"), dict) else {}
    return {"haupt": _p(v.get("haupt")) if v.get("haupt") not in (None, "") else None,
            "kg": {str(k): _p(x) for k, x in list(kg.items())[:40] if re.fullmatch(r"[34]\d0", str(k)) and _p(x) is not None}}


def gewichte(G, mix):
    """G = {kg2: {"kw": Kennwert-Anteil, "bek": bekannte Bauteile €, "ges": geschätzte €}} (nur Gruppen mit Bauteilen)
    → ({kg2: {"w", "auto", "hand"}} mit Werten 0…1, Stand der Automatik über alles 0…1)."""
    fest = {k for k, g in G.items() if g["kw"] <= 0 and g["bek"] + g["ges"] > 0}   # kein Kennwert-Anteil (z. B. noch kein Raumbuch): nichts zu mischen, die Bauteile gelten
    auto = {k: (1.0 if k in fest else (g["bek"] + 0.5 * g["ges"]) / (g["bek"] + g["ges"]) if g["bek"] + g["ges"] > 0 else 0.0) for k, g in G.items()}
    skw = sum(g["kw"] for g in G.values())
    w0 = (sum(auto[k] * G[k]["kw"] for k in G) / skw) if skw > 0 else (sum(auto.values()) / len(auto) if auto else 0.0)
    h = None if mix.get("haupt") is None else mix["haupt"] / 100
    out = {}
    for k in G:
        a = auto[k]
        if k in fest:
            out[k] = {"w": 1.0, "auto": 1.0, "hand": False}
            continue
        if k in (mix.get("kg") or {}):
            out[k] = {"w": mix["kg"][k] / 100, "auto": a, "hand": True}
            continue
        if h is None:
            w = a
        elif h >= w0:
            w = 1.0 if w0 >= 1 else a + (1 - a) * (h - w0) / (1 - w0)
        else:
            w = a * h / w0
        out[k] = {"w": min(1.0, max(0.0, w)), "auto": a, "hand": False}
    return out, w0


def ist_neubau(a):
    """Angaben des Planungsassistenten: Neubau? (Gebäudetyp „neubau_…“, Bauart in Ebenen mit Maßnahme „nb“, oder Art der Maßnahme „neu“)"""
    t = str((a or {}).get("type") or "")
    m = re.match(r"^k:[a-z]{2}:([a-z.]*)", t)
    return t.startswith("neubau") or bool(m and "nb" in m.group(1).split(".")) or ((a or {}).get("choice") or {}).get("massnahme") == "neu"


def bauteile_modell(a, MAT):
    """Überschlag der Bauteile aus den Angaben des Planungsassistenten (Projektmodell) – für den Fall, dass es noch kein Raumbuch gibt.
    Geometrie wie im Bauzeitenplan (plankern.js: geo): BGF ≈ 1,25 × Wohnfläche, Grundfläche = BGF ÷ Geschosse, Umfang = 4 × √Grundfläche,
    Fassade = Umfang × Geschosse × 2,9 m (+ 1,5 m im Dachgeschoss), Dach = Grundfläche × 1,05 (flach) bzw. 1,35 (geneigt). Nur Neubau.
    Zeilen mit src „Modell“ – sie gelten als geschätzt, bis jemand Menge oder Preis von Hand ändert."""
    a = a or {}
    A = float(a.get("area") or 0)
    if A <= 0 or not ist_neubau(a):
        return []
    ch = a.get("choice") or {}
    n = max(1, int(a.get("floors") or 1))
    dg = 0.6 if a.get("dg") == "aus" else 0.7 if a.get("dg") == "staffel" else 0
    flach = ch.get("dachform") == "flach"
    keller = bool(ch.get("keller")) and ch.get("keller") != "none"
    holz = ch.get("tragwerk") in ("holz", "bsp")
    bgf = 1.25 * A
    gr = bgf / (n + dg)
    u = 4 * gr ** 0.5
    fas = u * (n * 2.9 + (1.5 if dg else 0))
    dach = gr * (1.05 if flach else 1.35)
    z = lambda v, st=0: (f"{v:.{st}f}").replace(".", ",")   # noqa: E731
    grund = f"aus dem Planungsassistenten: {z(A)} m² Wohnfläche, {n} Geschoss(e)" + (", Dachgeschoss" if dg else "")
    out = []

    def add(kg, menge, mat=None, formel="", name=None):
        if kg not in MAT or menge <= 0:
            return
        nm, eh, opts = MAT[kg]
        m = next((o for o in opts if o[0] == mat), opts[0])
        out.append({"id": f"m{len(out) + 1}", "kg": kg, "name": name or nm, "mat": m[0], "formel": formel or grund, "menge": round(menge, 1), "einheit": eh, "ep": m[1],
                    "src": "Modell", "geschoss": "", "notiz": ""})
    add("322", gr, "WU-Bodenplatte" if keller else None, f"Grundfläche ≈ BGF {z(bgf)} m² ÷ {z(n + dg, 1)} Geschosse")
    add("331", fas * 0.8, "Holzrahmenwand" if holz else None, f"Umfang {z(u)} m × Höhe − 20 % Fenster")
    if keller:
        add("331", u * 2.6, "Stahlbeton 25 cm", f"Kellerwände: Umfang {z(u)} m × 2,6 m", "Kellerwände")
    add("334", fas * 0.2, formel="≈ 20 % der Fassade")
    add("335", fas * 0.8, "Holzfassade hinterlüftet" if holz else None)
    add("336", fas * 0.8, "Gipskarton-Vorsatzschale" if holz else None)
    add("341", A * 0.3, formel="Innenwände ≈ 1 m² je m² Wohnfläche, davon 30 % tragend")
    add("342", A * 0.7, formel="davon 70 % nichttragend")
    add("344", max(1, round(A / 14)), formel="≈ eine Tür je 14 m² Wohnfläche")
    add("345", A * 2, formel="beide Seiten der Innenwände")
    add("351", gr * (n - 1 + (1 if dg else 0) + (1 if keller else 0)), "Holzbalkendecke" if holz else None, "Geschossdecken (ohne Bodenplatte)")
    add("352", A, formel="Wohnfläche")
    add("353", A, formel="Wohnfläche")
    add("361", dach, ("Holzbalken-Flachdach" if holz else "Stahlbeton-Flachdach") if flach else None, f"Grundfläche × {'1,05' if flach else '1,35'}")
    add("363", dach, "Flachdachabdichtung mit Dämmung" if flach else None)
    return out
