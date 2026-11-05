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
    """Access-Katalog → (quelle, stand, zeilen). zeilen: Liste von Dicts in Katalog-Reihenfolge:
    {typ: 'gewerk'|'titel'|'pos', ebene, oz, kurz, lang, einheit, kg, ep_von, ep, ep_bis}."""
    import logging
    logging.getLogger("access_parser").setLevel(logging.CRITICAL)
    from access_parser import AccessParser
    db = AccessParser(pfad)
    if "LV" not in db.catalog or "Texte" not in db.catalog:
        raise ValueError("Das ist kein Positionskatalog (Tabellen „LV“ und „Texte“ fehlen).")
    L = db.parse_table("LV")
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
    rows = [{k: L[k][i] for k in ("id", "idParent", "Nr", "Level", "Art", "OZ", "Bez", "Eh", "KG", "EP", "LTextID")} for i in range(n)]
    kinder = {}
    for r in rows:
        kinder.setdefault(r["idParent"], []).append(r)
    for v in kinder.values():
        v.sort(key=lambda r: (r["Nr"] or 0, r["id"]))
    out, stand = [], ""

    def gehe(pid, oz_vor, ebene):
        nonlocal stand
        for r in kinder.get(pid, []):
            art = str(r["Art"] or "")
            oz = (r["OZ"] or "").strip()
            voll = f"{oz_vor}.{oz}" if oz_vor and oz else oz or oz_vor
            if art == "1":
                out.append({"typ": "gewerk", "ebene": 0, "oz": oz, "kurz": _txt(r["Bez"]) or f"Gewerk {oz}"})
                gehe(r["id"], "", 1)
            elif art in ("2", "3", "4"):
                out.append({"typ": "titel", "ebene": ebene, "oz": voll, "kurz": _txt(r["Bez"]) or f"Titel {oz}"})
                gehe(r["id"], voll, ebene + 1)
            elif art in ("P", "T"):
                lang = _txt(texte.get(r["LTextID"])) if r["LTextID"] else ""
                kurz = _txt(r["Bez"]) or (lang.split("\n", 1)[0][:200] if lang else "")
                p = preise.get(r["id"], {})
                stand = stand or p.get("datum", "")
                ep = p.get("mittel") if p.get("mittel") is not None else ((r["EP"] or 0) / 10000 or None)
                out.append({"typ": "pos", "ebene": ebene, "oz": voll, "kurz": kurz[:500], "lang": lang[:20000], "art": "T" if art == "T" else "N",
                            "einheit": (_txt(r["Eh"]) or p.get("eh") or "")[:12], "kg": re.sub(r"\D", "", str(r["KG"] or ""))[:3],
                            "ep_von": p.get("von"), "ep": ep, "ep_bis": p.get("bis")})
            else:
                gehe(r["id"], oz_vor, ebene)

    gehe(0, "", 0)   # Gewerke hängen an 0 (die Wurzelzeile mit idParent −1 hat keine Kinder)
    if not any(x["typ"] == "pos" for x in out):
        raise ValueError("Im Katalog wurden keine Positionen gefunden.")
    name = dateiname or os.path.basename(pfad)
    quelle = "sirAdos" if "sirados" in name.lower() else re.sub(r"\.[^.]+$", "", name)[:60]
    return quelle, stand, out
