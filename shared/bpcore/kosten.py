"""Kosten eines Projekts für alle Apps – aus dem Gebäudemodell (GO 16.11.2026, „Gebäudemodell als Mitte“, Klärung 17: keine Sonderrolle).

Die App Kosten (plattform/baukosten.py) schreibt das Ergebnis ihrer gültigen Kostenermittlung ins Modell (melden → rueckweg.ergebnis_setzen,
Schlüssel „kosten“: Stufe, Kostengruppen, Summen, Datum). Honorar (anrechenbare Kosten), Ausschreibung (Budget), Bauantrag (Herstellungs-
kosten) und das Bauherrenportal lesen NUR das Modell (stand). Festhalten eines Stands: Modellstand + Linie „Kosten“ auf „fest“ – dann
bleibt das Ergebnis im Modell stehen, auch wenn in der App weitergerechnet wird.

Übergang: Projekte, deren Kostenermittlung vor dem 16.11.2026 zuletzt gespeichert wurde, haben noch kein Ergebnis im Modell – stand()
holt es dann einmal aus der App Kosten (nur wo deren Modul im Container liegt) und schreibt es ins Modell.
"""
import json


def ergebnis(bk, k, stufe_name=""):
    """Zeile der Kostenermittlung + Berechnung (baukosten.calc) → Ergebnis fürs Modell."""
    kg = {}
    for z in k.get("zeilen") or []:
        x = str(z.get("kg") or "")[:1]
        if x.isdigit():
            kg[x + "00"] = round(kg.get(x + "00", 0) + (z.get("betrag") or 0), 2)
    if k.get("nk"):
        kg["700"] = round(k["nk"], 2)
    return {"bk_id": bk["id"], "name": bk["name"], "stufe": bk["stufe"] or "", "stufe_name": stufe_name, "datum": str(bk["updated"] or "")[:10],
            "kg300": k.get("kg300") or 0, "kg400": k.get("kg400") or 0, "bauwerk": k.get("bauwerk") or 0, "extra": k.get("extra") or 0,
            "risiko": k.get("risiko") or 0, "nk": k.get("nk") or 0, "total": k.get("total") or 0, "brutto": k.get("brutto") or 0, "area": k.get("area") or 0, "kg": kg}


def gueltige(c, pid):
    """Gültige Kostenermittlung eines Projekts (Zeile) oder None."""
    from . import gueltig
    bks = c.execute("SELECT * FROM bk_projects WHERE project_id=? AND archived=0", (pid,)).fetchall()
    if not bks:
        return None
    gid = gueltig.waehlen([(x["id"], x["created"], False) for x in bks], gueltig.lesen(c, "bk", pid))
    return next((x for x in bks if x["id"] == gid), bks[0])


def melden(c, pid, wert):
    """Ergebnis der gültigen Kostenermittlung ins Modell (wert = ergebnis(…) oder {} wenn es keine mehr gibt)."""
    from . import rueckweg
    return rueckweg.ergebnis_setzen(c, pid, "kosten", wert or {})


def stand(c, pid):
    """Kosten des Projekts aus dem Modell: (Ergebnis, None) oder (None, Grund)."""
    from . import modell
    k = modell.lesen(c, pid)["modell"].get("kosten") or {}
    if not k:
        bk = gueltige(c, pid)
        if not bk:
            return None, "Für das Projekt gibt es noch keine Kosten im Gebäudemodell (App Kosten)."
        try:   # Übergang (siehe oben)
            import baukosten as BK
            d = json.loads(bk["data"]) if isinstance(bk["data"], str) else (bk["data"] or {})
            melden(c, pid, ergebnis(bk, BK.calc(BK.clean_data(d, c)), BK.STUFE_NAME.get(bk["stufe"], "")))
            k = modell.lesen(c, pid)["modell"].get("kosten") or {}
        except Exception:   # noqa: BLE001 – Modul nicht im Container: einmal in der App Kosten öffnen
            pass
        if not k:
            return None, "Die Kosten stehen noch nicht im Gebäudemodell – die Kostenermittlung einmal in der App Kosten öffnen."
    return k, None
