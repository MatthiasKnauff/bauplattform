"""Kontakte (Tabelle contacts) – gemeinsame Regeln für alle Apps der Bauplattform.

Ein Kontakt darf nur gelöscht werden, wenn er nirgends verwendet wird. Das gilt gleich im Bautagebuch, im Bauzeitenplan
(Adressbuch) und in der Adressen-App. Verwendet heißt:
- er kommt in Berichten des Bautagebuchs vor (Anwesende, Firmen, Mängel … – items.contact_id),
- er ist die Baustellenadresse eines Projekts (projects.extra.contact_id),
- er ist in einem Bauzeitenplan einem Gewerk als Firma zugeordnet (gantt_projects.data → trades[*].firm).
"""
import json


def _json(v):
    if isinstance(v, dict):
        return v
    try:
        return json.loads(v or "{}")
    except (TypeError, ValueError):
        return {}


def gantt_id(row):
    """ID, unter der der Bauzeitenplan die Firma führt (eigene ID in extra.gid, sonst „c<Kontakt-ID>“)."""
    return _json(row["extra"]).get("gid") or f"c{row['id']}"


def usage(c, cid):
    """Liste von Gründen, warum der Kontakt nicht gelöscht werden darf (leer = darf gelöscht werden)."""
    row = c.execute("SELECT id, name, extra FROM contacts WHERE id=?", (cid,)).fetchone()
    if not row:
        return []
    why = []
    r = c.execute("""SELECT COUNT(*) AS n, COUNT(DISTINCT r.project_id) AS p FROM items i JOIN reports r ON r.id=i.report_id
                     WHERE i.contact_id=?""", (cid,)).fetchone()
    if r and r["n"]:
        why.append(f"in {r['n']} {'Eintrag' if r['n'] == 1 else 'Einträgen'} des Bautagebuchs"
                   + (f" ({r['p']} Projekte)" if r["p"] > 1 else ""))
    for p in c.execute("SELECT name, extra FROM projects"):
        try:
            if int(_json(p["extra"]).get("contact_id") or 0) == cid:
                why.append(f"als Baustellenadresse des Projekts „{p['name']}“")
        except (TypeError, ValueError):
            pass
    fid = gantt_id(row)
    plans = []
    for g in c.execute("SELECT name, data FROM gantt_projects WHERE data LIKE ?", (f'%"{fid}"%',)):
        trades = _json(g["data"]).get("trades") or {}
        if isinstance(trades, dict) and any(isinstance(t, dict) and t.get("firm") == fid for t in trades.values()):
            plans.append(g["name"])
    if plans:
        why.append("im Bauzeitenplan " + ", ".join(f"„{n}“" for n in plans[:3]) + (" …" if len(plans) > 3 else ""))
    return why


def blocked_message(name, why):
    return f"„{name}“ wird noch verwendet ({'; '.join(why)}) und kann deshalb nicht gelöscht werden."
