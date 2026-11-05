"""Positionskatalog für die AVA: Texte aus einer Katalogdatei (z. B. sirAdos-Positionen *.ava, eine Access-Datenbank)
einlesen – Gewerke, Titel und Positionen mit Kurz- und Langtext, Einheit, Kostengruppe und Preisspanne (von / mittel / bis).

Die Katalogdatei ist lizenziert und gehört NICHT ins Repository: sie wird in der App hochgeladen und landet nur in der
Datenbank des Büros (Tabelle ava_katalog).
"""
import os
import re
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "vendor"))


def _txt(v):
    return (v or "").replace("\r\n", "\n").replace("\r", "\n").replace("\xa0", " ").strip() if isinstance(v, str) else ""


def lesen(pfad, dateiname=""):
    """Access-Katalog → (quelle, stand, zeilen, art). zeilen: Liste von Dicts in Katalog-Reihenfolge:
    {typ: 'gewerk'|'titel'|'pos', ebene, oz, kurz, lang, einheit, kg, ep_von, ep, ep_bis}; Gewerke mit „key“ (eindeutig).
    art: 'positionen' (Tabelle LV, z. B. sirAdos Positionen) oder 'elemente' (Tabelle Ele, z. B. sirAdos Elemente:
    Kostengruppe → Gruppen → Element mit Einheit und Preis → Feinelemente als Varianten)."""
    import logging
    logging.getLogger("access_parser").setLevel(logging.CRITICAL)
    from access_parser import AccessParser
    db = AccessParser(pfad)
    if "Texte" not in db.catalog or ("LV" not in db.catalog and "Ele" not in db.catalog):
        raise ValueError("Das ist kein Katalog (Tabellen „LV“ bzw. „Ele“ und „Texte“ fehlen).")
    L = db.parse_table("LV") if "LV" in db.catalog else {}
    art_k = "positionen"
    if not (L.get("id") or []) and "Ele" in db.catalog:
        L, art_k = db.parse_table("Ele"), "elemente"
    if not (L.get("id") or []):
        raise ValueError("Im Katalog wurden keine Positionen gefunden.")
    T = db.parse_table("Texte")
    texte = {i: t for i, t in zip(T.get("ID") or [], T.get("txt4TT") or [])}
    preise = {}
    if "EPreise" in db.catalog:
        E = db.parse_table("EPreise")
        for i in range(len(E.get("id") or [])):
            if E["Deleted"][i]:
                continue
            bem = (E["Bem"][i] or "").lower()
            k = "von" if '"von"' in bem else "bis" if '"bis"' in bem else "mittel" if '"mittel"' in bem else None
            if k:
                p = preise.setdefault(E["IDParent"][i], {})
                p[k] = (E["EP"][i] or 0) / 10000   # Access-Währung: 1/10000
                p.setdefault("eh", E["Eh"][i] or "")
                if E["Datum"][i]:
                    p.setdefault("datum", str(E["Datum"][i])[:10])
    n = len(L["id"])
    rows = [{k: L[k][i] if k in L else None for k in ("id", "idParent", "Nr", "Level", "Art", "OZ", "Bez", "Eh", "KG", "EP", "LTextID", "Faktor")} for i in range(n)]
    kinder = {}
    for r in rows:
        kinder.setdefault(r["idParent"], []).append(r)
    for v in kinder.values():
        v.sort(key=lambda r: (r["Nr"] or 0, r["id"]))
    out, stand, gesehen = [], "", {}

    def pos(r, art, voll, ebene, erbe=None):
        nonlocal stand
        lang = _txt(texte.get(r["LTextID"])) if r["LTextID"] else ""
        kurz = _txt(r["Bez"]) or (lang.split("\n", 1)[0][:200] if lang else "")
        p = preise.get(r["id"], {})
        stand = stand or p.get("datum", "")
        ep = p.get("mittel") if p.get("mittel") is not None else ((r["EP"] or 0) / 10000 or None)
        erbe = erbe or {}
        if erbe.get("element") and not lang:   # Feinelement = Bestandteil des Elements (Menge = Elementmenge × Faktor)
            f = r.get("Faktor")
            lang = f"Bestandteil von „{erbe['element']}“" + (f" – Menge: {str(round(f, 3)).replace('.', ',')} × Menge des Elements ({erbe.get('einheit') or ''})" if f else "")
        out.append({"typ": "pos", "ebene": ebene, "oz": voll, "kurz": kurz[:500], "lang": lang[:20000], "art": "T" if art == "T" else "N",
                    "einheit": (_txt(r["Eh"]) or p.get("eh") or erbe.get("einheit") or "")[:12],
                    "kg": re.sub(r"\D", "", str(r["KG"] or erbe.get("kg") or ""))[:3], "ep_von": p.get("von"), "ep": ep, "ep_bis": p.get("bis")})
        return out[-1]

    def gehe(pid, oz_vor, ebene, erbe=None):
        for r in kinder.get(pid, []):
            art = str(r["Art"] or "")
            oz = (r["OZ"] or "").strip()
            voll = f"{oz_vor}.{oz}" if oz_vor and oz else oz or oz_vor
            if art == "1":
                n = gesehen[oz] = gesehen.get(oz, 0) + 1   # Elemente: dieselbe Kostengruppe ein zweites Mal (Altbau/Sanierung)
                out.append({"typ": "gewerk", "ebene": 0, "oz": oz, "key": oz if n == 1 else f"A{oz}", "kurz": _txt(r["Bez"]) or f"Gewerk {oz}"})
                gehe(r["id"], "", 1)
            elif art == "4" and art_k == "elemente":   # Element: selbst eine Position, seine Feinelemente als Varianten darunter
                e = pos(r, "P", voll, ebene)
                gehe(r["id"], voll, ebene + 1, {"element": e["kurz"], "einheit": e["einheit"], "kg": e["kg"]})
            elif art in ("2", "3", "4"):
                out.append({"typ": "titel", "ebene": ebene, "oz": voll, "kurz": _txt(r["Bez"]) or f"Titel {oz}"})
                gehe(r["id"], voll, ebene + 1)
            elif art in ("P", "T"):
                pos(r, art, voll, ebene, erbe)
            else:
                gehe(r["id"], oz_vor, ebene, erbe)

    gehe(0, "", 0)   # Gewerke hängen an 0 (die Wurzelzeile mit idParent −1 hat keine Kinder)
    if not any(x["typ"] == "pos" for x in out):
        raise ValueError("Im Katalog wurden keine Positionen gefunden.")
    name = dateiname or os.path.basename(pfad)
    quelle = "sirAdos" if "sirados" in name.lower() else re.sub(r"\.[^.]+$", "", name)[:60]
    return quelle, stand, out, art_k
