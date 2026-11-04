"""Soll-Anwesenheit aus den Bauzeitenplänen – gemeinsam für Bautagebuch und „Mängel & Erinnerungen“.

Ein Bauzeitenplan (Tabelle gantt_projects) ist über project_id mit einem Bautagebuch-Projekt verknüpft.
Seine berechneten Termine stehen in data["sched"] ({uid, s, f, g}); die Firma einer Leistung ergibt sich
aus „Gewerke & Firmen“ (data["trades"][gewerk]["firm"] = Kontakt-Schlüssel) oder dem Feld „Unternehmer“.
"""
import json
from datetime import date


def _j(s, d):
    try:
        return json.loads(s) if isinstance(s, str) else (s if s is not None else d)
    except ValueError:
        return d


def firm_map(c):
    """Kontakt-Schlüssel des Bauzeitenplans → (Name, Kontakt-ID)."""
    out = {}
    for r in c.execute("SELECT id, name, extra FROM contacts"):
        gid = (_j(r["extra"], {}) or {}).get("gid")
        out[gid or f"c{r['id']}"] = (r["name"], r["id"])
    return out


def plans(c, project_id):
    return [(g["name"], _j(g["data"], {})) for g in c.execute("SELECT name, data FROM gantt_projects WHERE project_id=?", (project_id,)).fetchall()]


def expected(plan_list, firms, day):
    """Firmen, die laut Plan an `day` (JJJJ-MM-TT) auf der Baustelle sein sollen → [{firma, key, contact_id, gw, leistungen, plan}].
    Samstag/Sonntag: niemand erwartet. Leistungen ohne eingetragene Firma werden übergangen (nicht zuordenbar)."""
    try:
        if date.fromisoformat(day).weekday() >= 5:
            return []
    except ValueError:
        return []
    out = {}
    for pname, data in plan_list:
        if not isinstance(data, dict):
            continue
        tasks = {t.get("uid"): t for t in (data.get("tasks") or []) if isinstance(t, dict)}
        trades = data.get("trades") or {}
        for s in data.get("sched") or []:
            t = tasks.get(s.get("uid"))
            if not t or s.get("g") or not t.get("dur") or not s.get("s") or not (s["s"] <= day <= (s.get("f") or s["s"])):
                continue
            gw = (t.get("gw") or "").strip()
            tr = trades.get(gw) or {}
            name, cid = firms.get(tr.get("firm") or "", ("", None))
            res = (t.get("res") or "").strip()
            if not name and res and res != (tr.get("craft") or "").strip():
                name = res
            if not name:
                continue
            k = name.strip().lower()
            e = out.setdefault(k, {"firma": name.strip(), "key": k, "contact_id": cid, "gw": gw, "leistungen": [], "plan": pname})
            if (t.get("name") or "") and t["name"] not in e["leistungen"]:
                e["leistungen"].append(t["name"])
    return sorted(out.values(), key=lambda e: e["firma"].lower())


def present(c, report_id):
    """Anwesende Firmen eines Berichts (Abschnitte mit Kontaktverknüpfung) → (Namen klein, Kontakt-IDs)."""
    names, ids = set(), set()
    for r in c.execute("""SELECT i.text, i.contact_id FROM items i JOIN sections s ON s.key=i.kind
                          WHERE i.report_id=? AND s.extra LIKE '%link_contacts%'""", (report_id,)):
        if r["text"]:
            names.add(r["text"].strip().lower())
        if r["contact_id"]:
            ids.add(r["contact_id"])
    return names, ids


def soll_ist(c, report_id, project_id, day, firms=None, plan_list=None):
    """Erwartete Firmen eines Berichts mit Status: da (anwesend eingetragen), fehlt, nein (nicht erforderlich), offen (nicht bestätigt)."""
    firms = firms if firms is not None else firm_map(c)
    plan_list = plan_list if plan_list is not None else plans(c, project_id)
    exp = expected(plan_list, firms, day)
    if not exp:
        return []
    names, ids = present(c, report_id)
    dec = {r["firma"]: r for r in c.execute("SELECT * FROM soll_anwesend WHERE report_id=?", (report_id,))}
    for e in exp:
        d = dec.get(e["key"])
        if e["key"] in names or (e["contact_id"] and e["contact_id"] in ids):
            e["status"] = "da"
        elif d:
            e["status"] = d["status"]
            e["von"], e["am"] = d["geaendert_von"], d["geaendert"]
        else:
            e["status"] = "offen"
    return exp
