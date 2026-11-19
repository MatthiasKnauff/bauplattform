"""Versionen der Apps in den Kisten der Verknüpfungs-Karte (GO 19.11.2026, Mock „Verknüpfungen mit Versionen“: A, B, C geklärt am 16.11.2026).

In jeder Kiste steht genau die Liste aus dem Versionsmenü der App – neueste oben, ★ = gilt, archivierte nicht:
  Termine        Pläne des Projekts im Bauzeitenplan (gantt_projects; ★ über bpcore/gueltig „gantt“)      ref gplan:<id>
  Kosten         Kostenermittlungen (bk_projects; ★ gueltig „bk“)                                          ref bk:<id>
  Ausschreibung  Versionen der Ausschreibung (ava_version; ★ = aktiv)                                      ref ava:<id>
  Honorar        Versionen des Honorars (honorar_version; ★ = gilt)                                        ref honorar:<id>
  Bauantrag      Anträge des Projekts (bauantrag; ★ gueltig „bauantrag“, sonst der neueste)               ref ba:<id>
  Wärmeschutz    Nachweise des Projekts (ws_nachweis; ★ gueltig „ws“, sonst der neueste)                  ref ws:<id>
Früher festgehaltene Stände mit anderer Kennung (z. B. gantt:<Version>) zeigt die Karte weiter mit ihrem Namen.

A: „übernehmen“ beim Zurückziehen auf „aktuell“ = diese Version wird die gültige (★) – nichts wird überschrieben (gilt_setzen).
"""
from . import gueltig


def _s(v, n=120):
    return str(v or "").strip()[:n]


def _arch(data):
    import json
    try:
        return bool((json.loads(data or "{}") or {}).get("archived"))
    except (ValueError, TypeError):
        return False


def staende(c, pid):
    """{app: [{ref, name, wann, gilt}]} – neueste zuerst, je höchstens 30, ohne Archiviertes."""
    out = {}
    G = [(r["id"], r["name"], r["created"] or "", r["updated"] or "", _arch(r["data"]))
         for r in c.execute("SELECT id, name, created, updated, data FROM gantt_projects WHERE project_id=?", (pid,)).fetchall()]
    gid = gueltig.waehlen([(i, cr, a) for i, _, cr, _, a in G], gueltig.lesen(c, "gantt", pid))
    out["termine"] = [{"ref": f"gplan:{i}", "name": _s(n) or "Plan", "wann": up or cr, "gilt": i == gid}
                      for i, n, cr, up, a in sorted(G, key=lambda x: x[2], reverse=True) if not a][:30]
    K = c.execute("SELECT id, name, updated, created, archived FROM bk_projects WHERE project_id=? ORDER BY updated DESC, id DESC LIMIT 60", (pid,)).fetchall()
    kid = gueltig.waehlen([(r["id"], r["created"] or r["updated"] or "", bool(r["archived"])) for r in K], gueltig.lesen(c, "bk", pid))
    out["kosten"] = [{"ref": f"bk:{r['id']}", "name": r["name"] or "Kostenermittlung", "wann": r["updated"] or "", "gilt": r["id"] == kid} for r in K if not r["archived"]][:30]
    out["ausschreibung"] = [{"ref": f"ava:{r['id']}", "name": r["name"] or "Version ohne Namen", "wann": r["updated"] or r["created"] or "", "gilt": bool(r["aktiv"])}
                            for r in c.execute("SELECT id, name, created, updated, aktiv FROM ava_version WHERE project_id=? AND archived=0 ORDER BY id DESC LIMIT 30", (pid,))]
    out["honorar"] = [{"ref": f"honorar:{r['id']}", "name": r["name"] or "Version ohne Namen", "wann": r["erstellt"] or "", "gilt": bool(r["gilt"])}
                      for r in c.execute("SELECT id, name, erstellt, gilt FROM honorar_version WHERE project_id=? ORDER BY id DESC LIMIT 30", (pid,))]
    for app, tab, modul, pre, leer in (("bauantrag", "bauantrag", "bauantrag", "ba", "Bauantrag"), ("waermeschutz", "ws_nachweis", "ws", "ws", "Nachweis")):
        R = c.execute(f"SELECT id, name, erstellt, geaendert FROM {tab} WHERE project_id=? ORDER BY id DESC LIMIT 30", (pid,)).fetchall()
        g = gueltig.waehlen([(r["id"], r["erstellt"] or "", False) for r in R], gueltig.lesen(c, modul, pid))
        out[app] = [{"ref": f"{pre}:{r['id']}", "name": r["name"] or leer, "wann": r["geaendert"] or r["erstellt"] or "", "gilt": r["id"] == g} for r in R]
    return {k: v for k, v in out.items() if v}


def gilt_setzen(c, pid, ref, wer=""):
    """Version ref wird die gültige (★) ihrer App → True; unbekannt oder nicht aus diesem Projekt → False."""
    art, _, nr = str(ref or "").partition(":")
    if art == "gplan":   # Pläne des Bauzeitenplans haben Textkennungen
        if not nr or not c.execute("SELECT 1 FROM gantt_projects WHERE id=? AND project_id=?", (nr[:80], pid)).fetchone():
            return False
        gueltig.setzen(c, "gantt", pid, nr[:80], wer)
        return True
    if not nr.isdigit():
        return False
    i = int(nr)
    if art in ("bk", "ba", "ws"):
        tab, modul = {"bk": ("bk_projects", "bk"), "ba": ("bauantrag", "bauantrag"), "ws": ("ws_nachweis", "ws")}[art]
        if not c.execute(f"SELECT 1 FROM {tab} WHERE id=? AND project_id=?", (i, pid)).fetchone():
            return False
        gueltig.setzen(c, modul, pid, i, wer)
        return True
    if art == "ava":
        if not c.execute("SELECT 1 FROM ava_version WHERE id=? AND project_id=?", (i, pid)).fetchone():
            return False
        c.execute("UPDATE ava_version SET aktiv=CASE WHEN id=? THEN 1 ELSE 0 END WHERE project_id=?", (i, pid))
        return True
    if art == "honorar":
        r = c.execute("SELECT auftrag_id FROM honorar_version WHERE id=? AND project_id=?", (i, pid)).fetchone()
        if not r:
            return False
        c.execute("UPDATE honorar_version SET gilt=(id=?) WHERE project_id=? AND auftrag_id IS NOT DISTINCT FROM ?", (i, pid, r["auftrag_id"]))
        return True
    return False
