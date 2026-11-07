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


# ---------------------------------------------------------------- Duplikate finden und zusammenführen
import re as _re
import unicodedata as _ud
from difflib import SequenceMatcher as _SM

_RECHTSFORM = _re.compile(r"\b(fa|firma|gmbh|mbh|co|kg|ag|gbr|ohg|ug|e\s?k|ek|inh|inhaber|haftungsbeschr\w*|und|u|the)\b")


def _fold(t):
    t = _ud.normalize("NFKD", (t or "").lower().replace("ß", "ss"))
    return "".join(ch for ch in t if not _ud.combining(ch))


def name_norm(n):
    t = _re.sub(r"[^a-z0-9 ]+", " ", _fold(n))
    return " ".join(_RECHTSFORM.sub(" ", t).split())


def _ziffern(t):
    d = _re.sub(r"\D", "", _re.sub(r"\(\s*0\s*\)", "", t or ""))   # „+49 (0)201 …“ = „0201 …“
    if d.startswith("0049"):
        d = "0" + d[4:]
    elif d.startswith("49") and len(d) > 10:
        d = "0" + d[2:]
    return d if len(d) >= 6 else ""


def _domain(w):
    m = _re.search(r"(?:https?://)?(?:www\.)?([^/\s]+)", (w or "").lower())
    return m.group(1) if m and "." in m.group(1) else ""


def duplikate(c, ignoriert=()):
    """Gruppen ähnlicher Kontakte: gleiche E-Mail, Telefonnummer oder Internetseite, gleicher oder sehr ähnlicher Name
    (ohne GmbH, Fa., & Co …), dieselbe Anschrift. → [{"ids": [...], "grund": "..."}]"""
    R = [dict(r) for r in c.execute("SELECT id, name, trade, contact_person, phone, mobile, email, website, street, zip, city FROM contacts").fetchall()]
    ign = set(ignoriert)
    for r in R:
        r["_n"] = name_norm(r["name"])
        r["_t"] = set(w for w in r["_n"].split() if len(w) >= 3)
        r["_tel"] = {x for x in (_ziffern(r["phone"]), _ziffern(r["mobile"])) if x}
        r["_dom"] = _domain(r["website"]) or ((r["email"] or "").split("@")[-1].lower() if "@" in (r["email"] or "") and not _re.search(r"@(gmail|gmx|web|t-online|hotmail|outlook|yahoo|icloud|aol|freenet|online)\.", (r["email"] or "").lower()) else "")
        r["_adr"] = (_fold(r["street"]).replace("strasse", "str").replace(" ", "").rstrip("."), (r["zip"] or "").strip()) if (r["street"] or "").strip() else None
        r["_bau"] = "baustelle" in _fold(r["trade"])
    eltern = {r["id"]: r["id"] for r in R}

    def wurzel(x):
        while eltern[x] != x:
            eltern[x] = eltern[eltern[x]]
            x = eltern[x]
        return x
    gruende = {}
    for i, a in enumerate(R):
        for b in R[i + 1:]:
            if f"{min(a['id'], b['id'])}-{max(a['id'], b['id'])}" in ign or a["_bau"] != b["_bau"]:
                continue
            g, p = [], 0.0
            if a["email"] and a["email"].lower() == (b["email"] or "").lower():
                g.append("gleiche E-Mail"); p = max(p, 1.0)
            if a["_tel"] & b["_tel"]:
                g.append("gleiche Telefonnummer"); p = max(p, 0.9)
            if a["_dom"] and a["_dom"] == b["_dom"]:
                g.append("gleiche Internetseite/Mail-Domain"); p = max(p, 0.85)
            if a["_n"] and a["_n"] == b["_n"]:
                g.append("gleicher Name"); p = max(p, 0.95)
            elif a["_t"] and b["_t"]:
                j = len(a["_t"] & b["_t"]) / len(a["_t"] | b["_t"])
                teil = (a["_t"] <= b["_t"] or b["_t"] <= a["_t"]) and any(len(w) >= 5 for w in a["_t"] & b["_t"])
                r_ = _SM(None, a["_n"], b["_n"]).ratio()
                if j >= 0.6 or teil or r_ >= 0.88:
                    g.append("ähnlicher Name"); p = max(p, 0.75 if (teil or j >= 0.6) else 0.7)
            if a["_adr"] and a["_adr"] == b["_adr"] and g:
                g.append("gleiche Anschrift"); p = min(1.0, p + 0.15)
            if p >= 0.7:
                ra, rb = wurzel(a["id"]), wurzel(b["id"])
                eltern[ra] = rb
                gruende.setdefault((min(a["id"], b["id"]), max(a["id"], b["id"])), g)
    grp = {}
    for r in R:
        grp.setdefault(wurzel(r["id"]), []).append(r["id"])
    out = []
    for ids in grp.values():
        if len(ids) < 2:
            continue
        gg = sorted({x for (a, b), g in gruende.items() if a in ids and b in ids for x in g})
        out.append({"ids": sorted(ids), "grund": ", ".join(gg)})
    out.sort(key=lambda x: -len(x["ids"]))
    return out


def zusammenfuehren(c, ziel, quelle):
    """Alle Verweise von quelle auf ziel umhängen (Bautagebuch, Baustellenadresse, Bauzeitenpläne, AVA, Benachrichtigungen), dann quelle löschen."""
    zr = c.execute("SELECT id, name, extra FROM contacts WHERE id=?", (ziel,)).fetchone()
    qr = c.execute("SELECT id, name, extra FROM contacts WHERE id=?", (quelle,)).fetchone()
    if not zr or not qr or ziel == quelle:
        return
    c.execute("UPDATE items SET contact_id=? WHERE contact_id=?", (ziel, quelle))
    da = lambda t: bool(c.execute("SELECT 1 FROM information_schema.tables WHERE table_name=?", (t,)).fetchone())   # noqa: E731 – Tabelle gibt es nicht überall
    for t in ("benachrichtigungen", "ava_angebot"):
        if da(t):
            c.execute(f"UPDATE {t} SET contact_id=? WHERE contact_id=?", (ziel, quelle))
    for p in c.execute("SELECT id, extra FROM projects").fetchall():
        ex = _json(p["extra"])
        try:
            if int(ex.get("contact_id") or 0) == quelle:
                ex["contact_id"] = ziel
                c.execute("UPDATE projects SET extra=? WHERE id=?", (json.dumps(ex, ensure_ascii=False), p["id"]))
        except (TypeError, ValueError):
            pass
    if da("ava_lv"):   # AVA: Vergabe merkt die Firma
        for r in c.execute("SELECT id, vergabe FROM ava_lv WHERE vergabe LIKE ?", (f'%"contact_id": {quelle}%',)).fetchall():
            V = _json(r["vergabe"])
            if V.get("contact_id") == quelle:
                V["contact_id"] = ziel
                c.execute("UPDATE ava_lv SET vergabe=? WHERE id=?", (json.dumps(V, ensure_ascii=False), r["id"]))
    fq, fz = gantt_id(qr), gantt_id(zr)
    for g in c.execute("SELECT id, data FROM gantt_projects WHERE data LIKE ?", (f'%"{fq}"%',)).fetchall():
        d = _json(g["data"])
        tr = d.get("trades") or {}
        if isinstance(tr, dict):
            for t in tr.values():
                if isinstance(t, dict) and t.get("firm") == fq:
                    t["firm"] = fz
            c.execute("UPDATE gantt_projects SET data=? WHERE id=?", (json.dumps(d, ensure_ascii=False), g["id"]))
    c.execute("DELETE FROM contacts WHERE id=?", (quelle,))
