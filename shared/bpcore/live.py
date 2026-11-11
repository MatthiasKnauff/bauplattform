"""Live-Aktualisierung: Änderungen anderer erscheinen ohne Neuladen.

Trigger (Migration 0046) schreiben je geänderter Zeile einen kleinen Eintrag in bp_aenderung (Tabelle, Projekt, wer).
Die Seiten fragen alle paar Sekunden GET /api/bp/live?seit=<nr> (Baukasten head/head.js → BPHead.live) und bekommen die
Änderungen anderer seitdem – zusammengefasst je Tabelle und Projekt. Was die Seite daraus macht (neu laden, Hinweis),
entscheidet die App. Einträge älter als ein Tag werden nebenbei gelöscht.
"""
import random


def stand(c):
    r = c.execute("SELECT COALESCE(MAX(id), 0) AS m FROM bp_aenderung").fetchone()
    return int(r["m"] or 0)


def seit(c, nr, uid, grenze=500):
    """Änderungen anderer nach Nr. nr: (neuer Stand, [{t, p, n}]) – je Tabelle und Projekt einmal, n = Anzahl."""
    rows = c.execute("""SELECT tabelle, project_id, COUNT(*) AS n, MAX(id) AS m FROM (
                            SELECT id, tabelle, project_id FROM bp_aenderung WHERE id > ? AND (von IS NULL OR von <> ?) ORDER BY id LIMIT ?) x
                        GROUP BY tabelle, project_id""", (nr, uid or 0, grenze)).fetchall()
    neu = max([nr] + [int(r["m"]) for r in rows])
    if not rows:
        neu = max(nr, stand(c)) if nr else stand(c)
    if random.random() < 0.01:   # aufräumen
        c.execute("DELETE FROM bp_aenderung WHERE zeit < now() - interval '1 day'")
    return neu, [{"t": r["tabelle"], "p": r["project_id"], "n": int(r["n"])} for r in rows]


def routen(bp, user):
    """GET /api/bp/live?seit=<nr> – ohne seit: nur der aktuelle Stand."""
    from flask import jsonify, request
    from . import db

    @bp.get("/api/bp/live")
    def bp_live():
        u = user()
        if u is None:
            return jsonify(error="Nicht angemeldet"), 401
        nr = request.args.get("seit", type=int)
        with db.tx() as c:
            if not nr:
                return jsonify(seit=stand(c), ev=[])
            neu, ev = seit(c, nr, u["id"])
        return jsonify(seit=neu, ev=ev)
