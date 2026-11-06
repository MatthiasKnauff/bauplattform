import json
import re
from flask import Blueprint, g, jsonify, request
from core import contacts, db

bp = Blueprint("items", __name__)
DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
TIME = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")


def _due(d):
    """Erledigungsdatum prüfen; wer es setzt, wird erinnert. Gibt einen Fehlertext oder None zurück."""
    for k in ("remind_user", "reminded"):   # nicht vom Browser setzbar
        d.pop(k, None)
    if "due" in d:
        d["due"] = str(d["due"] or "").strip()
        if d["due"] and not DATE.match(d["due"]):
            return "Das Datum ist ungültig."
        d["remind_user"] = g.user["id"] if d["due"] else None
        d["reminded"] = ""
    if "due_time" in d:
        d["due_time"] = str(d["due_time"] or "").strip() or "09:00"
        if not TIME.match(d["due_time"]):
            return "Die Uhrzeit ist ungültig."
        if "due" not in d:   # nur die Uhrzeit geändert: Erinnerung gilt neu
            d["reminded"] = ""
            d["remind_user"] = g.user["id"]
    return None


def _als_termin(c, item_id):
    """Einstellung „sofort als Termin“ (⚙ → Für mich → Erinnerungen): Erinnerung zum Erledigungsdatum gleich als Einladung
    an mich bzw. alle Bauleiter des Projekts – die Mail am Tag entfällt dann (reminded = „termin“)."""
    try:
        from bpcore import erinnern
        r = c.execute("""SELECT i.id, i.text, i.due, i.due_time, i.remind_user, i.done, s.title AS sec, rp.project_id AS pid
                         FROM items i JOIN reports rp ON rp.id=i.report_id LEFT JOIN sections s ON s.key=i.kind WHERE i.id=?""", (item_id,)).fetchone()
        if not r or not r["due"] or r["done"] or not r["remind_user"] or erinnern.einstellung(c, r["remind_user"])["art"] != "termin":
            return ""
        t = (r["text"] or "").strip()
        with c.savepoint():
            n, f = erinnern.termine_senden(c, f"b{r['id']}", r["due"], r["due_time"] or "09:00", f"{r['sec'] or 'Eintrag'}: {t.splitlines()[0][:120] if t else ''}",
                                           t, r["pid"], erinnern.empfaenger(c, r["remind_user"], r["pid"]), g.user["name"])
            if n:
                c.execute("UPDATE items SET reminded='termin' WHERE id=?", (r["id"],))
        return "Als Termin verschickt." if n else f
    except Exception:
        return ""


@bp.post("/api/reports/<int:r>/items")
def create_item(r):
    d = request.json or {}
    text = str(d.get("text", "")).strip()
    if not text:
        return jsonify(error="Text fehlt"), 400
    err = _due(d)
    if err:
        return jsonify(error=err), 400
    with db.tx() as c:  # erlaubt sind alle aktiven Listen-Abschnitte aus der Tabelle "sections"
        sec = c.execute("SELECT * FROM sections WHERE key=? AND type='list' AND enabled=1", (d.get("kind"),)).fetchone()
        if not sec:
            return jsonify(error="Unbekannter Abschnitt"), 400
        forced, out = {"report_id": r}, {}
        if json.loads(sec["extra"] or "{}").get("link_contacts"):  # z. B. Anwesende: Firma automatisch als Kontakt
            cid, name, created = contacts.ensure(c, text)
            text = name
            forced["contact_id"] = cid
            out = {"contact_id": cid, "contact_created": created, "name": name}
            if "activity" not in d or "headcount" not in d:   # von Hand eingetragen: Tätigkeit nach Bauzeitenplan/Gewerk, 1 Anwesender vorschlagen
                rep = c.execute("SELECT project_id, date FROM reports WHERE id=?", (r,)).fetchone()
                if "activity" not in d and rep:
                    from bpcore import plan
                    try:
                        with c.savepoint():
                            d["activity"] = plan.taetigkeit(c, rep["project_id"], rep["date"], cid, name)
                    except Exception:
                        d["activity"] = ""
                d.setdefault("headcount", 1)
        d["text"] = text
        neu = db.insert(c, "items", d, forced=forced)
        if d.get("due"):
            out["hinweis"] = _als_termin(c, neu)
        return jsonify(id=neu, **out)


@bp.put("/api/items/<int:i>")
def update_item(i):
    d = request.json or {}
    err = _due(d)
    if err:
        return jsonify(error=err), 400
    with db.tx() as c:
        db.update(c, "items", i, d, protected=("report_id",))
        hinweis = _als_termin(c, i) if d.get("due") or ("due_time" in d and "due" not in d) else ""
    return jsonify(ok=True, hinweis=hinweis)


@bp.delete("/api/items/<int:i>")
def delete_item(i):
    with db.tx() as c:
        row = c.execute("SELECT * FROM items WHERE id=?", (i,)).fetchone()
        imgs = [r["id"] for r in c.execute("SELECT id FROM images WHERE item_id=?", (i,))]   # Fotos bleiben im Bericht
        c.execute("DELETE FROM items WHERE id=?", (i,))
    return jsonify(ok=True, item=dict(row, image_ids=imgs) if row else None)   # für "Rückgängig"


@bp.post("/api/items/restore")
def restore_item():
    """Gerade gelöschten Eintrag unverändert (mit alter ID und Reihenfolge) wiederherstellen."""
    d = request.json or {}
    with db.tx() as c:
        if not c.execute("SELECT 1 FROM reports WHERE id=?", (d.get("report_id"),)).fetchone():
            return jsonify(error="Der Bericht existiert nicht mehr."), 404
        if c.execute("SELECT 1 FROM items WHERE id=?", (d.get("id"),)).fetchone():
            return jsonify(error="Eintrag ist schon wieder da."), 409
        have = set(db.cols(c, "items"))
        vals = {k: v for k, v in d.items() if k in have}
        ids = [int(x) for x in d.get("image_ids") or []]
        if d.get("contact_id") and not c.execute("SELECT 1 FROM contacts WHERE id=?", (d["contact_id"],)).fetchone():
            vals["contact_id"] = None
        c.execute(f"INSERT INTO items({','.join(vals)}) VALUES({','.join('?' * len(vals))})", list(vals.values()))
        for n in ids:   # Fotos wieder dem Eintrag zuordnen
            c.execute("UPDATE images SET item_id=? WHERE id=? AND report_id=?", (vals["id"], n, vals["report_id"]))
    return jsonify(ok=True)
