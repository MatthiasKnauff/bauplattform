"""Gemeinsame Kosten der Bauplattform: die gültige Kostenermittlung eines Projekts (App Kosten, plattform/baukosten.py).

Seit dem 16.11.2026 entstehen die Kosten nur aus den Bauteilen des Projektmodells (Entwurf „Kosten aus Bauteilen“) – Raumtypen
und Kennwerte gibt es nicht mehr.
"""
import json


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
