"""Projektdaten: Herkunft je Feld (GO 18.11.2026, Mock „Projektdaten mit Herkunft“: PD-A1 B1 C1).

Felder, deren Wert an anderer Stelle schon steht, folgen ihrer Quelle von selbst (B1) – bis jemand in den Projektdaten etwas anderes
einträgt (gelb „eigener Wert“ mit ↺). Gespeichert wird nur, was von der Quelle abweicht; projekt_lesen() liefert allen Apps den
gültigen Wert (eigener Wert, sonst Quelle).

  QUELLEN        Schlüssel → Beschriftung des Schilds („aus Kosten“ …) und App für den Sprung dorthin
  geerbt(c, pid, roh)   {Feld: [Wert, Anzeige, Quelle]} – roh = gespeicherte Projektdaten (ohne Quellen)
  bauherr_firma(c, d)   Rechnungsanschrift, USt-IdNr., „öffentlich“ aus dem Kontakt der Bauherr:in (PD-A1)
"""
from datetime import datetime

QUELLEN = {"kosten": ("aus Kosten", "baukosten"), "plan": ("aus Bauzeitenplan", "gantt"), "modell": ("aus Gebäudemodell", "gebaeudemodell"),
           "baustelle": ("aus Adressen · Baustelle", ""), "gerechnet": ("gerechnet", "")}
MASSNAHME = {"nb": "Neubau", "um": "Umbau", "an": "Erweiterung", "au": "Erweiterung", "sa": "Sanierung / Modernisierung", "es": "Sanierung / Modernisierung",
             "ab": "Abbruch"}
BH_FIRMA = ("bh_rechnung", "bh_ustid", "bh_oeffentlich")   # liegen seit 18.11.2026 am Kontakt der Bauherr:in (contacts.extra.firma)


def _eur(v):
    return f"{v:,.0f} €".replace(",", ".")


def _tag(iso):
    return ".".join(reversed(iso.split("-"))) if iso else ""


def _massnahme(typ):
    """Bauart „k:mf:an.um:da:d“ → „Erweiterung“ (erste passende Maßnahme), sonst ""."""
    t = str(typ or "")
    teile = t.split(":")[2].split(".") if t.startswith("k:") and t.count(":") >= 2 else []
    return next((MASSNAHME[x] for x in teile if x in MASSNAHME), "")


def geerbt(c, pid, roh):
    """{Feld: [Wert, Anzeige, Quelle]} für die Felder, die eine Quelle haben (nur Quellen mit Wert)."""
    from . import bauantrag, modell, stammdaten
    out = {}
    m = modell.lesen(c, pid)["modell"]
    k = m.get("kosten") or {}
    if k.get("brutto"):
        out["budget"] = [round(k["brutto"], 2), _eur(k["brutto"]) + (f" · {k['stufe_name']}" if k.get("stufe_name") else ""), "kosten"]
    T = stammdaten.plan_termine(c, pid)
    if T["start"]:
        out["baubeginn"] = [T["start"], _tag(T["start"]), "plan"]
    if T["ende"]:
        out["fertigstellung"] = [T["ende"], _tag(T["ende"]), "plan"]
    mn = _massnahme((m.get("assistent") or {}).get("type"))
    if mn:
        out["massnahme"] = [mn, mn, "modell"]
    A = bauantrag.aus_modell(c, pid)
    for f, einheit in (("bgf", " m²"), ("bri", " m³"), ("geschosse", ""), ("we", "")):
        if A.get(f):
            v = A[f]
            out[f] = [v, f"{v:g}".replace(".", ",") + einheit, "modell"]
    if roh.get("baustelle_kid"):
        for f, v in stammdaten.grundstueck_kontakt(c, roh["baustelle_kid"]).items():
            if v:
                out[f] = [v, v, "baustelle"]
    gs = _zahl(roh.get("gs_flaeche"))
    if gs:   # GRZ/GFZ aus Grundfläche bzw. BGF und Grundstück
        for f, basis in (("grz", "grf"), ("gfz", "bgf")):
            b = _zahl(roh.get(basis)) or _zahl((out.get(basis) or [None])[0])
            if b:
                v = f"{b / gs:.2f}".replace(".", ",")
                out[f] = [v, v, "gerechnet"]
    return out


def _zahl(v):
    try:
        return float(str(v).replace(",", ".")) if v not in (None, "") else 0.0
    except ValueError:
        return 0.0


def gleich(a, b):
    """Gleicher Wert? Zahlen und Texte nachsichtig (52000 = „52000,0“)."""
    if isinstance(a, (int, float)) or isinstance(b, (int, float)):
        return abs(_zahl(a) - _zahl(b)) < 0.005
    return str(a if a is not None else "").strip() == str(b if b is not None else "").strip()


def wirksam(roh, G):
    """Gespeicherte Projektdaten + Quellen: was leer ist, kommt aus der Quelle."""
    d = dict(roh)
    for f, (v, _, _) in G.items():
        if d.get(f) in (None, ""):
            d[f] = v
    return d


def nur_abweichendes(werte, G):
    """Beim Speichern: Felder, die der Quelle gleichen, bleiben leer (folgen ihr weiter)."""
    return {f: ("" if f in G and gleich(v, G[f][0]) else v) for f, v in werte.items()}


def bauherr_firma(c, d):
    """PD-A1: Rechnungsanschrift, USt-IdNr. und „öffentlich“ stehen am Kontakt der Bauherr:in – frühere Werte am Projekt gelten, bis
    sie beim nächsten Speichern dorthin wandern (firma_umziehen)."""
    from . import contacts
    r = c.execute("SELECT extra FROM contacts WHERE id=?", (d["bauherr_kid"],)).fetchone() if str(d.get("bauherr_kid") or "").isdigit() else None
    f = contacts.firma(r) if r else {}
    return {"bh_rechnung": f.get("rechnung") or d.get("bh_rechnung") or "", "bh_ustid": f.get("ustid") or d.get("bh_ustid") or "",
            "bh_oeffentlich": (f.get("oeffentlich") == "ja") if f.get("oeffentlich") else bool(d.get("bh_oeffentlich"))}


def firma_umziehen(c, d):
    """Frühere Angaben am Projekt (bh_…) einmal in den Kontakt der Bauherr:in – nur in leere Felder; danach weg aus den Projektdaten."""
    import json
    from . import contacts
    alt = {k: d.pop(k) for k in BH_FIRMA if k in d}
    if not any(alt.values()) or not str(d.get("bauherr_kid") or "").isdigit():
        return
    r = c.execute("SELECT extra FROM contacts WHERE id=?", (d["bauherr_kid"],)).fetchone()
    if r is None:
        return
    ex = contacts._json(r["extra"])
    f = ex.get("firma") or {}
    for k, ziel in (("bh_rechnung", "rechnung"), ("bh_ustid", "ustid")):
        if alt.get(k) and not f.get(ziel):
            f[ziel] = str(alt[k])
    if alt.get("bh_oeffentlich") and not f.get("oeffentlich"):
        f["oeffentlich"] = "ja"
    ex["firma"] = contacts.firma_bereinigen(f)
    c.execute("UPDATE contacts SET extra=?, updated=? WHERE id=?", (json.dumps(ex, ensure_ascii=False), datetime.now().isoformat(timespec="seconds"), d["bauherr_kid"]))
