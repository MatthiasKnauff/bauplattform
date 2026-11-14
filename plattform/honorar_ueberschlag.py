"""Honorar – abgelegte Überschläge (besprochen am 14.11.2026, Mock „Überschlag ablegen“).

Im Rechner „🧮 Honorar überschlagen“ (Handy und Rechner) legt ✓ das Ergebnis mit allen Eingaben ab – ohne Projekt. Am Rechner fragt
Honorar (und die Startseite), ob daraus ein Honorarangebot werden soll: in ein Projekt übernehmen oder löschen.
(Akquiseprojekte – eigener Bereich „Akquise“ im Projektpfad, eigene App – kommen später dazu, 14.11.2026.)
Sichtbar nur für die Verwaltung (Geschäftsführung) – wie die ganze App.

GET    /api/ueberschlaege                 alle abgelegten, neueste zuerst
POST   /api/ueberschlaege                 {wofuer, kosten, zone, satz, umbau, nk, geraet} – gerechnet wird hier (dieselbe Tafel wie die Aufträge)
DELETE /api/ueberschlaege/<id>            in den Papierkorb
POST   /api/ueberschlaege/<id>/uebernehmen {project_id} → Honorarauftrag (Stand Angebot); der Überschlag geht in den Papierkorb.
                                           Rückgängig: POST /api/ueberschlaege/zurueck {auftrag_id, papierkorb}
"""
import time

from flask import g, jsonify, request

from bpcore import db, honorar as H, papierkorb
import common as C
from honorar import KEY, anlegen, app

ZONEN = ("I", "II", "III", "IV", "V")


def _titel(u):
    return f"{u['wofuer'] or 'Überschlag'} – {ZONEN[max(1, min(5, int(u['zone']))) - 1]}, {round(u['netto']):,} € netto".replace(",", ".")


@app.get("/api/ueberschlaege")
def ue_liste():
    with db.tx() as c:
        L = [dict(r) for r in c.execute("SELECT * FROM honorar_ueberschlag ORDER BY erstellt DESC, id DESC").fetchall()]
    return jsonify(ueberschlaege=L)


@app.post("/api/ueberschlaege")
def ue_ablegen():
    b = request.get_json(silent=True) or {}
    a = H.sauber({"art": "hoai", "kosten": b.get("kosten"), "zone": b.get("zone"), "satz": b.get("satz"), "umbau": b.get("umbau"),
                  "nk": {"art": "pauschal", "p": b.get("nk", 5)}})
    if not a["kosten"]:
        return jsonify(error="Erst die anrechenbaren Kosten eintragen."), 400
    k = H.rechne(a)
    if not k["netto"]:
        return jsonify(error=(k.get("warnungen") or ["Damit lässt sich kein Honorar rechnen."])[0]), 400
    with db.tx() as c:
        uid = c.execute("""INSERT INTO honorar_ueberschlag(wofuer, kosten, zone, satz, umbau, nk, netto, von, geraet, erstellt)
                           VALUES(?,?,?,?,?,?,?,?,?,?) RETURNING id""",
                        (str(b.get("wofuer") or "").strip()[:200], a["kosten"], a["zone"], a["satz"], a["umbau"], a["nk"]["p"], round(k["netto"], 2),
                         C.full_name(g.user), "Handy" if b.get("geraet") == "handy" else "Rechner", time.strftime("%Y-%m-%d %H:%M:%S"))).fetchone()["id"]
    return jsonify(ok=True, id=uid)


def _weg(c, u):
    return papierkorb.ablegen(c, "honorar_ueberschlag", u["id"], "Honorar-Überschlag", _titel(u), g.user["name"], "", KEY)


@app.delete("/api/ueberschlaege/<int:uid>")
def ue_loeschen(uid):
    with db.tx() as c:
        u = c.execute("SELECT * FROM honorar_ueberschlag WHERE id=?", (uid,)).fetchone()
        if not u:
            return jsonify(error="Nicht mehr da."), 404
        pk = _weg(c, u)
    return jsonify(ok=True, papierkorb=pk)


@app.post("/api/ueberschlaege/<int:uid>/uebernehmen")
def ue_uebernehmen(uid):
    b = request.get_json(silent=True) or {}
    with db.tx() as c:
        u = c.execute("SELECT * FROM honorar_ueberschlag WHERE id=?", (uid,)).fetchone()
        if not u:
            return jsonify(error="Nicht mehr da – schon übernommen oder gelöscht."), 404
        p = c.execute("SELECT id, name FROM projects WHERE id=?", (b.get("project_id"),)).fetchone()
        if not p:
            return jsonify(error="Bitte ein Projekt wählen."), 400
        pid, pname = p["id"], p["name"]
        info = f"aus dem Überschlag vom {u['erstellt'][8:10]}.{u['erstellt'][5:7]}.{u['erstellt'][:4]} ({u['von']})"
        aid = anlegen(c, pid, "Architektenleistungen LPh 1–9", nk=u["nk"], kosten=u["kosten"], kosten_info=info, zone=u["zone"], satz=u["satz"], umbau=u["umbau"])
        pk = _weg(c, u)
    C.audit(g.user["name"], "honorar", "Überschlag übernommen", f"{pname}: {_titel(dict(u))}")
    return jsonify(ok=True, auftrag_id=aid, project_id=pid, papierkorb=pk)


@app.post("/api/ueberschlaege/zurueck")
def ue_zurueck():
    """Übernehmen rückgängig: den Auftrag in den Papierkorb, den Überschlag zurück."""
    b = request.get_json(silent=True) or {}
    with db.tx() as c:
        a = c.execute("SELECT a.id, a.name, p.name AS projekt FROM honorar_auftrag a JOIN projects p ON p.id=a.project_id WHERE a.id=?",
                      (b.get("auftrag_id"),)).fetchone()
        if a:
            papierkorb.ablegen(c, "honorar_auftrag", a["id"], "Honorarauftrag", a["name"], g.user["name"], a["projekt"], KEY)
        try:
            papierkorb.wiederherstellen(c, int(b.get("papierkorb") or 0))
        except ValueError as e:
            return jsonify(error=str(e)), 400
    return jsonify(ok=True)
