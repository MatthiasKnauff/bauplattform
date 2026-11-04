"""Soll-Anwesenheit aus den Bauzeitenplänen – gemeinsam für Bautagebuch und „Mängel & Erinnerungen“.

Ein Bauzeitenplan (Tabelle gantt_projects) ist über project_id mit einem Bautagebuch-Projekt verknüpft.
Seine berechneten Termine stehen in data["sched"] ({uid, s, f, g}); die Firma einer Leistung ergibt sich
aus „Gewerke & Firmen“ (data["trades"][gewerk]["firm"] = Kontakt-Schlüssel) oder dem Feld „Unternehmer“.
"""
import json, re
from datetime import date, timedelta


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
    """Bauzeitenpläne des Projekts: verknüpfte Pläne, sonst nicht verknüpfte Pläne, deren Name mit dem Projektkürzel beginnt („A541 …“)."""
    rows = c.execute("SELECT name, data FROM gantt_projects WHERE project_id=?", (project_id,)).fetchall()
    if not rows:
        p = c.execute("SELECT name FROM projects WHERE id=?", (project_id,)).fetchone()
        code = ((p["name"] or "").split() or [""])[0].rstrip(".,") if p else ""
        if re.match(r"^[A-Za-z]+\d", code):
            rows = [r for r in c.execute("SELECT name, data FROM gantt_projects WHERE project_id IS NULL").fetchall()
                    if re.match(re.escape(code) + r"(?![\d.])", (r["name"] or "").strip(), re.I)]
    return [(g["name"], _j(g["data"], {})) for g in rows]


def expected(plan_list, firms, day, ohne=None):
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
                if ohne is not None and (gw or t.get("name")):
                    ohne.setdefault(gw or "ohne Gewerk", set()).add(t.get("name") or "")
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


TAETIGKEIT = {   # naheliegende Tätigkeit je Gewerk (Stichwort im Gewerk der Firma → Text)
    "rohbau": "Rohbauarbeiten", "maurer": "Maurerarbeiten", "beton": "Betonarbeiten", "erd": "Erdarbeiten", "tiefbau": "Tiefbauarbeiten",
    "abbruch": "Abbrucharbeiten", "gerüst": "Gerüstbau", "zimmer": "Zimmererarbeiten", "holzbau": "Holzbauarbeiten", "dach": "Dacharbeiten",
    "klempner": "Klempnerarbeiten", "spengler": "Klempnerarbeiten", "fenster": "Fenstermontage", "elektro": "Elektroinstallation",
    "sanitär": "Sanitärinstallation", "heizung": "Heizungsinstallation", "lüftung": "Lüftungsinstallation", "hls": "Haustechnik-Installation",
    "shk": "Sanitär- und Heizungsinstallation", "trockenbau": "Trockenbauarbeiten", "putz": "Putzarbeiten", "estrich": "Estricharbeiten",
    "fliese": "Fliesenarbeiten", "maler": "Malerarbeiten", "tapez": "Tapezierarbeiten", "boden": "Bodenbelagsarbeiten", "parkett": "Parkettarbeiten",
    "tischler": "Tischlerarbeiten", "schreiner": "Schreinerarbeiten", "metallbau": "Metallbauarbeiten", "schlosser": "Schlosserarbeiten",
    "treppe": "Treppenmontage", "aufzug": "Aufzugsmontage", "wdvs": "Fassadendämmung", "fassade": "Fassadenarbeiten", "dämm": "Dämmarbeiten",
    "garten": "Garten- und Landschaftsbau", "galabau": "Garten- und Landschaftsbau", "pflaster": "Pflasterarbeiten", "reinigung": "Bauendreinigung",
    "abdicht": "Abdichtungsarbeiten", "statik": "Statik / Prüfung", "vermess": "Vermessung", "schornstein": "Schornsteinarbeiten",
}


def taetigkeit(c, project_id, day, contact_id, name):
    """Vorschlag für „Art der Tätigkeit“ einer von Hand eingetragenen Firma: Leistungen laut Bauzeitenplan (am Tag, sonst die nächstgelegenen),
    sonst eine naheliegende Tätigkeit nach dem Gewerk der Firma."""
    key = (name or "").strip().lower()
    try:
        pl, fm = plans(c, project_id), firm_map(c)
        for e in expected(pl, fm, day):
            if e["key"] == key or (contact_id and e["contact_id"] == contact_id):
                return ", ".join(e["leistungen"])[:300]
        best = None   # nicht am Tag eingeplant: Leistungen der Firma mit dem nächsten Termin
        for d in range(1, 15):
            for sgn in (-1, 1):
                try:
                    t = (date.fromisoformat(day) + timedelta(days=sgn * d)).isoformat()
                except ValueError:
                    break
                for e in expected(pl, fm, t):
                    if e["key"] == key or (contact_id and e["contact_id"] == contact_id):
                        best = e
                        break
                if best:
                    return ", ".join(best["leistungen"])[:300]
    except Exception:
        pass
    r = c.execute("SELECT trade FROM contacts WHERE id=?", (contact_id,)).fetchone() if contact_id else None
    tr = ((r["trade"] if r else "") or "").strip()
    low = (tr + " " + (name or "")).lower()
    for k, v in TAETIGKEIT.items():
        if k in low:
            return v
    return (tr + "arbeiten") if tr and " " not in tr and not tr.lower().endswith(("arbeiten", "bau")) else tr
