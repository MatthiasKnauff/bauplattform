from . import db


def ensure(con, name):
    """Findet einen Kontakt (ohne Beachtung der Groß-/Kleinschreibung) oder legt ihn an.
    Gibt (id, kanonischer Name, neu_angelegt) zurück."""
    name = " ".join(str(name).split())
    q = "SELECT id, name FROM contacts WHERE name=?"
    row = con.execute(q, (name,)).fetchone()
    if row:
        return row["id"], row["name"], False
    try:
        with con.savepoint():
            return db.insert(con, "contacts", {"name": name}), name, True
    except db.IntegrityError:  # parallel von einem anderen Worker angelegt
        row = con.execute(q, (name,)).fetchone()
        return row["id"], row["name"], False
