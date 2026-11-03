"""Stichwortsuche über alle Inhalte (Projekte, Berichte, Einträge, Fotobeschreibungen, Kontakte).
Alle Suchwörter müssen vorkommen (UND); Groß-/Kleinschreibung und Umlaut-Akzente sind egal (ä findet a und ä)."""
import unicodedata
from . import db


def fold(s):
    # Zeichen für Zeichen (Länge bleibt gleich, damit Fundstellen im Original markiert werden können)
    return "".join((unicodedata.normalize("NFD", c)[:1] or c).lower() for c in str(s or ""))


def loose(s):
    """Locker: ae/oe/ue/ss/ß werden wie ä/ö/ü/ß behandelt (Häser = Haeser, Außenwand = Aussenwand)."""
    return s.replace("ae", "a").replace("oe", "o").replace("ue", "u").replace("ss", "s").replace("ß", "s")


def tokens(q):
    return [t for t in fold(q).split() if t]


def hit(fields, toks):
    """Alle Wörter irgendwo in den Feldern? Gibt (Feldtext mit erster Fundstelle) oder None zurück."""
    hay = [fold(f) for f in fields]
    whole = " ".join(hay)
    lw = loose(whole)
    if not all(t in whole or loose(t) in lw for t in toks):
        return None
    for f, h in zip(fields, hay):
        if any(t in h or loose(t) in loose(h) for t in toks):
            return f
    return fields[0] if fields else ""


def snippet(text, toks, width=70):
    """Textausschnitt um die erste Fundstelle als [[Text, Treffer?], …]."""
    text = " ".join(str(text or "").split())
    f = fold(text)
    ranges = []
    for t in toks:
        i = f.find(t)
        while i != -1:
            ranges.append((i, i + len(t)))
            i = f.find(t, i + len(t))
    if not ranges:
        return [[text[:width * 2], 0]]
    ranges.sort()
    merged = [list(ranges[0])]
    for a, b in ranges[1:]:
        if a <= merged[-1][1]: merged[-1][1] = max(merged[-1][1], b)
        else: merged.append([a, b])
    start = max(0, merged[0][0] - width // 2)
    end = min(len(text), start + width * 2)
    out, pos = [], start
    if start: out.append(["…", 0])
    for a, b in merged:
        if b <= start or a >= end: continue
        a, b = max(a, start), min(b, end)
        if a > pos: out.append([text[pos:a], 0])
        out.append([text[a:b], 1]); pos = b
    if pos < end: out.append([text[pos:end], 0])
    if end < len(text): out.append(["…", 0])
    return out


def de(d):
    return f"{d[8:10]}.{d[5:7]}.{d[:4]}" if d and len(d) == 10 else (d or "")


def run(q, project_id=None, limit=150):
    toks = tokens(q)
    if not toks:
        return []
    res = []
    with db.tx() as c:
        titles = {r["key"]: r["title"] for r in c.execute("SELECT key, title FROM sections")}
        projs = {r["id"]: dict(r) for r in c.execute("SELECT * FROM projects")}
        reps = {r["id"]: dict(r) for r in c.execute("SELECT * FROM reports")}
        base = lambda rid: {"project_id": reps[rid]["project_id"], "project": projs[reps[rid]["project_id"]]["name"], "archived": projs[reps[rid]["project_id"]]["archived"],
                            "report_id": rid, "report": f"Nr. {reps[rid]['number']} · {de(reps[rid]['date'])}", "date": reps[rid]["date"] or ""}
        for p in projs.values():
            if project_id and p["id"] != project_id: continue
            f = [p["name"], p["client"] or "", p["street"] or "", f"{p['zip'] or ''} {p['city'] or ''}", p["folder"] or ""]
            if hit(f, toks) is not None:
                t = hit(f, toks)
                res.append({"type": "Projekt", "project_id": p["id"], "project": p["name"], "archived": p["archived"], "report_id": None, "report": "", "date": "", "snip": snippet(t, toks)})
        for r in reps.values():
            if project_id and r["project_id"] != project_id: continue
            f = [f"{de(r['date'])} {r['date']}", r["site_manager"] or "", r["weather"] or "", r["precip"] or "", r["plz"] or ""]
            ex = db.to_dict(r).get("extra") or {}
            f.append(ex.get("place") or "")
            t = hit(f, toks)
            if t is not None:
                res.append({"type": "Bericht", **base(r["id"]), "snip": snippet(" · ".join(x for x in f if x), toks)})
        for i in c.execute("SELECT * FROM items"):
            if i["report_id"] not in reps or (project_id and reps[i["report_id"]]["project_id"] != project_id): continue
            f = [i["text"] or "", i["activity"] or "", i["due"] or "", i["company"] or ""]
            if hit(f, toks) is not None:
                res.append({"type": titles.get(i["kind"], i["kind"]), **base(i["report_id"]), "snip": snippet(" – ".join(x for x in ([f[3]] if f[3] else []) + f[:2] if x), toks)})
        for i in c.execute("SELECT * FROM images"):
            if i["report_id"] not in reps or (project_id and reps[i["report_id"]]["project_id"] != project_id): continue
            f = [i["caption"] or ""]
            if f[0] and hit(f, toks) is not None:
                res.append({"type": "Foto", **base(i["report_id"]), "snip": snippet(f[0], toks), "image_id": i["id"]})
        if not project_id:
            for k in c.execute("SELECT * FROM contacts"):
                f = [k["name"] or "", k["trade"] or "", k["contact_person"] or "", k["phone"] or "", k["mobile"] or "", k["email"] or "", k["street"] or "", f"{k['zip'] or ''} {k['city'] or ''}"]
                t = hit(f, toks)
                if t is not None:
                    res.append({"type": "Kontakt", "project_id": None, "project": "", "archived": 0, "report_id": None, "report": "", "date": "", "contact_id": k["id"], "snip": snippet(" · ".join(x for x in f if x.strip()), toks)})
    res.sort(key=lambda x: (x["date"] or ""), reverse=True)
    return res[:limit]
