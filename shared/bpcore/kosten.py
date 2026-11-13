"""Gemeinsame Vorgaben der Baukosten: Raumtypen mit Beispiel-Kennwerten.

Das Büro pflegt seine eigene Liste in der Baukosten-App (⚙ Einstellungen → Raumtypen): Kennwerte ändern, eigene Raumtypen
anlegen (z. B. „Tierbereich“, „Labor“, „Klassenraum“), nicht benötigte entfernen. Die Liste unten ist nur der Startwert.
"""
import json
import re

# key, Bezeichnung, Beispiel-Kennwert (€/m² Raumfläche, KG 300 + 400, netto), Stichwörter (Teil des Raumnamens; Reihenfolge = Vorrang)
TYPES = [
    ("sanitaer", "Bad / WC / Umkleiden", 2600, "wc, bad, dusch, umkleide, sanitär, sanitaer, toilette, waschraum"),
    ("neben", "Abstell / Technik / Lager", 800, "lager, putz, server, technik, archiv, abstell, hausanschluss, heizung, müll, muell, hauswirtschaft, hwr, vorrat, speis, keller, wasch"),
    ("kueche", "Küche", 2200, "küche, kueche, kochen"),
    ("buero", "Büro / Besprechung", 1450, "büro, buero, besprech, lehrer, leitung, sekretar, arbeit, schulung, seminar, empfang"),
    ("aufenthalt", "Aufenthalt / Versammlung", 1350, "eingang, foyer, pause, aufenthalt, multifunk, café, cafe, halle, warte, gruppe, mehrzweck"),
    ("verkehr", "Flur / Treppe / Diele", 950, "flur, windfang, treppe, diele, gang, aufzug, vorraum, galerie"),
    ("garage", "Garage / Carport", 600, "garage, carport, stellplatz"),
    ("wohnen", "Wohnen / Schlafen", 1700, "wohn, schlaf, kind, zimmer, essen, gast, gäste, ankleide, studio, loggia"),
    ("sonst", "Sonstige Räume", 1300, ""),
]
DEFAULT = {k: kw for k, _, kw, _ in TYPES}


def _num(v, d):
    try:
        t = str(v).strip().replace(" ", "").replace("€", "")
        if re.fullmatch(r"\d{1,3}(\.\d{3})+(,\d+)?", t):   # 2.800 oder 2.800,50
            t = t.replace(".", "")
        x = float(t.replace(",", "."))
        return max(0.0, min(50000.0, x))
    except (TypeError, ValueError):
        return d


def _slug(label, used):
    s = re.sub(r"[^a-z0-9]+", "_", label.lower().replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss")).strip("_")[:24] or "typ"
    k, n = s, 2
    while k in used:
        k, n = f"{s}_{n}", n + 1
    return k


def _load(c, key):
    r = c.execute("SELECT data FROM bk_store WHERE key=?", (key,)).fetchone()
    if not r or not r["data"]:
        return None
    try:
        return json.loads(r["data"])
    except ValueError:
        return None


def catalog(c):
    """Raumtypen des Büros: [{key, label, kw, worte, beispiel}] – beispiel nur bei vorgegebenen Typen."""
    stored = _load(c, "raumtypen")
    if isinstance(stored, list) and stored:
        out = []
        for x in stored:
            if isinstance(x, dict) and x.get("key") and x.get("label"):
                out.append({"key": str(x["key"])[:40], "label": str(x["label"])[:60], "kw": _num(x.get("kw"), 1300),
                            "worte": str(x.get("worte") or "")[:400], "beispiel": DEFAULT.get(x["key"])})
        if not any(x["key"] == "sonst" for x in out):
            out.append({"key": "sonst", "label": "Sonstige Räume", "kw": DEFAULT["sonst"], "worte": "", "beispiel": DEFAULT["sonst"]})
        return out
    own = _load(c, "kennwerte")   # frühere Fassung: nur eigene Kennwerte zu den festen Typen
    own = own if isinstance(own, dict) else {}
    out = [{"key": k, "label": lab, "kw": _num(own.get(k), kw), "worte": w, "beispiel": kw} for k, lab, kw, w in TYPES]
    if "tier" in own:   # wurde früher als fester Typ angeboten
        out.insert(-1, {"key": "tier", "label": "Tierbereich", "kw": _num(own["tier"], 3200), "worte": "tier, hund, katze, zwinger, quarantäne, auslauf, stall, voliere", "beispiel": None})
    return out


def clean_catalog(items):
    """Eingabe aus dem Einstellungsdialog prüfen. Neue Typen bekommen einen Schlüssel aus der Bezeichnung."""
    out, used = [], set()
    for x in (items if isinstance(items, list) else [])[:60]:
        if not isinstance(x, dict):
            continue
        label = str(x.get("label") or "").strip()[:60]
        if not label:
            continue
        k = str(x.get("key") or "").strip()[:40]
        if not re.fullmatch(r"[a-z0-9_]{1,40}", k) or k in used:
            k = _slug(label, used | set(DEFAULT))
        used.add(k)
        worte = ", ".join(w.strip().lower() for w in str(x.get("worte") or "").split(",") if w.strip())[:400]
        out.append({"key": k, "label": label, "kw": _num(x.get("kw"), DEFAULT.get(k, 1300)), "worte": worte})
    if not any(x["key"] == "sonst" for x in out):
        out.append({"key": "sonst", "label": "Sonstige Räume", "kw": DEFAULT["sonst"], "worte": ""})
    return out


def guess(name, cat):
    """Raumtyp aus dem Raumnamen: erstes Stichwort, das im Namen vorkommt (auch in Wortzusammensetzungen wie „Stuhllager“)."""
    n = (name or "").lower().strip()
    if not n:
        return "sonst"
    for t in cat:
        for w in (t.get("worte") or "").split(","):
            w = w.strip()
            if w and w in n:
                return t["key"]
    return "sonst"


def kostenermittlung(c, pid):
    """Gültige Kostenermittlung (App Baukosten) eines Projekts: (Zeile, Berechnung) oder (None, Grund).
    Gemeinsam für Honorar (anrechenbare Kosten) und Ausschreibung (Budget im Projekt)."""
    try:
        import baukosten as BK
    except Exception:   # noqa: BLE001 – Modul nicht im Container
        return None, "Baukosten nicht erreichbar"
    from . import gueltig
    bks = c.execute("SELECT * FROM bk_projects WHERE project_id=? AND archived=0", (pid,)).fetchall()
    if not bks:
        return None, "Für das Projekt gibt es keine Kostenermittlung."
    gid = gueltig.waehlen([(x["id"], x["created"], False) for x in bks], gueltig.lesen(c, "bk", pid))
    bk = next((x for x in bks if x["id"] == gid), bks[0])
    d = json.loads(bk["data"]) if isinstance(bk["data"], str) else (bk["data"] or {})
    return bk, BK.calc(BK.clean_data(d, c))
