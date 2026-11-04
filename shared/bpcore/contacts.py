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


def orte(c, cid, n=8):
    """Wo der Kontakt verwendet wird – zum direkten Öffnen: [{app, frag, label}] (neueste Berichte zuerst, höchstens n)."""
    row = c.execute("SELECT id, name, extra FROM contacts WHERE id=?", (cid,)).fetchone()
    if not row:
        return []
    out = []
    for p in c.execute("SELECT id, name, extra FROM projects"):
        try:
            if int(_json(p["extra"]).get("contact_id") or 0) == cid:
                out.append({"app": "bautagebuch", "frag": f"#projekt={p['id']}", "label": f"Baustellenadresse · {p['name']}"})
        except (TypeError, ValueError):
            pass
    fid = gantt_id(row)
    for g in c.execute("SELECT id, name, data FROM gantt_projects WHERE data LIKE ?", (f'%"{fid}"%',)):
        trades = _json(g["data"]).get("trades") or {}
        gw = [k for k, t in trades.items() if isinstance(t, dict) and t.get("firm") == fid] if isinstance(trades, dict) else []
        if gw:
            out.append({"app": "gantt", "frag": f"#plan={g['id']}&tab=firmen", "label": f"Bauzeitenplan „{g['name']}“ · {', '.join(gw[:3])}"})
    for r in c.execute("""SELECT r.id AS rid, r.number, r.date, p.id AS pid, p.name AS pname, COUNT(*) AS n FROM items i
                          JOIN reports r ON r.id=i.report_id JOIN projects p ON p.id=r.project_id
                          WHERE i.contact_id=? GROUP BY r.id, r.number, r.date, p.id, p.name ORDER BY r.date DESC, r.id DESC""", (cid,)):
        if len(out) >= n:
            break
        d = "-".join(reversed((r["date"] or "").split("-"))).replace("-", ".")
        out.append({"app": "bautagebuch", "frag": f"#projekt={r['pid']}&bericht={r['rid']}",
                    "label": ("Bericht" + (f" Nr. {r['number']}" if r["number"] else "") + f" vom {d} · {r['pname']}") + (f" ({r['n']} Einträge)" if r["n"] > 1 else "")})
    return out[:n]


def blocked_message(name, why):
    return f"„{name}“ wird noch verwendet ({'; '.join(why)}) und kann deshalb nicht gelöscht werden."
