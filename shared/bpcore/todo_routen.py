"""To-do-Regeln: GET/PUT /api/bp/todo-regeln (fürs Büro, Block „Aufgaben“) und PUT /api/bp/todo-regeln/ich (persönliche Abweichung).
Aus head.py ausgelagert; head.blueprint() ruft register(bp, _uid) auf."""
from flask import jsonify, request

from . import db, fehler, rechte, skizze, todo, versionen


def register(bp, _uid):
    @bp.route("/api/bp/todo-regeln", methods=["GET", "PUT"])
    def todo_regeln():
        """Einstellungen der automatischen Aufgaben – gelten für alle Benutzer (wer sie sieht, steht je Regel)."""
        u, uid = _uid()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        with db.tx() as c:
            if request.method == "PUT":   # mit Stand im Verlauf (⚙ → Verlauf); gelten fürs ganze Büro – Block „Aufgaben“ (Verwaltung je Rolle)
                if rechte.stufe(u, "aufgaben") != "aendern":
                    return jsonify(error="Die Regeln der To-dos gelten fürs ganze Büro – die darfst du nicht ändern."), 403
                versionen.vor(c, "bp:todo:regeln")
                R = todo.regeln_setzen(c, request.get_json(silent=True) or {}, u["name"])
                versionen.nach(c, "bp:todo:regeln", u["name"])
            else:
                R = todo.regeln(c)
            E = todo.eigene(c, uid)
            P = [{"id": r["id"], "name": r["name"]} for r in c.execute("SELECT id, name FROM projects WHERE archived=0 ORDER BY name").fetchall()]
            U = [{"id": r["id"], "name": skizze.name_von(r)} for r in c.execute("SELECT * FROM users WHERE active=1 AND lower(name)<>'admin' ORDER BY name").fetchall()]
            try:
                from . import posteingang
                meine = [r["id"] for r in posteingang.meine_projekte(c, uid)]
            except Exception as e:
                fehler.still(None, "Aufgabenregeln: eigene Projekte ermitteln", e)
                meine = []
        return jsonify(regeln=list(R.values()), eigene=E, darf=rechte.stufe(u, "aufgaben") == "aendern", projekte=P, benutzer=U, ich=uid, meine=meine,
                       erinnerung=[[k, v[1]] for k, v in todo.ERINNERUNG.items()])

    @bp.route("/api/bp/todo-regeln/ich", methods=["PUT"])
    def todo_regeln_ich():
        """Persönliche Abweichungen von den To-do-Regeln („nur für mich“) – darf jede:r für sich."""
        u, uid = _uid()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        with db.tx() as c:
            E = todo.eigene_setzen(c, uid, request.get_json(silent=True) or {}, u["name"])
        return jsonify(eigene=E)

