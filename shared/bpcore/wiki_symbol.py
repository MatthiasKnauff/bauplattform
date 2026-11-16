"""Wiki-Symbol überall (GO 16.11.2026, Entwurf „Wiki-Symbol überall“): Steht zu einer Sache ein geprüfter Eintrag im Wiki, zeigt ein kleines
„W“ im Kreis das an (Baustein bp/wikisym.js). Antippen öffnet ein Fenster zum Lesen, Bearbeiten und Löschen.

  symbole(c, kontexte)   {schlüssel: {w: [Worte], p: Projekt-ID?}} → {schlüssel: [{id, titel}]} – EINE Abfrage je Seite.
                         Passt, wenn der Eintrag ausdrücklich mit dem Projekt verknüpft ist (nur Kontexte mit p) oder seine Stichworte,
                         sein Kapitel oder Titel zu den Worten passen – dieselbe Suche wie „Aufpassen bei …“ (wiki.hinweise). Nur geprüfte.
  Bearbeiten: alle; ohne das Recht „Wiki prüfen“ geht ein geänderter Eintrag in die nächste Prüfrunde (zeigt dann kein Symbol mehr).
  Löschen: mit „Wiki prüfen“ oder wer ihn angelegt hat – in den Papierkorb (mit Dateien, App „wiki“); nach der Frist des Papierkorbs
  räumt der Dienst nachts auf (aufraeumen(): Dateien auf der Ablage nach „02 Wiki/_Papierkorb“, alte gelöschte Einträge der App „Wiki“).
"""
from datetime import datetime, timedelta

from . import papierkorb, wiki as W

MAX_KONTEXTE = 400
JE_KONTEXT = 5


def _projekt_ids(v):
    return {x["id"] for x in W._projekte(v) if isinstance(x.get("id"), int)}


def symbole(c, kontexte):
    E = [dict(r, P=_projekt_ids(r["projekte"]), S=W._worte(r["stichworte"]) | W._worte(r["kapitel"]), T=W._worte(r["titel"]))
         for r in c.execute("SELECT id, titel, kapitel, stichworte, projekte FROM wiki_eintrag WHERE deleted='' AND status='geprueft'").fetchall()]
    out = {}
    if not E:
        return {k: [] for k in list(kontexte)[:MAX_KONTEXTE]}
    for k, x in list(kontexte.items())[:MAX_KONTEXTE]:
        x = x if isinstance(x, dict) else {}
        Q = W._stark([str(w)[:300] for w in (x.get("w") or [])[:10]])
        p = x.get("p") if isinstance(x.get("p"), int) else None
        T = []
        for e in E:
            t = 100 if p is not None and p in e["P"] else 0
            if Q:
                t += 2 * W._punkte(Q, e["S"]) + W._punkte(Q, e["T"])
            if t >= 2:
                T.append((t, e["id"], e["titel"]))
        T.sort(key=lambda z: -z[0])
        out[k] = [{"id": i, "titel": ti} for _, i, ti in T[:JE_KONTEXT]]
    return out


def darf_loeschen(u, e):
    return W.darf_pruefen(u) or (e and e.get("autor") == u["id"])


def lesen(c, u, eid):
    e = W.eintrag(c, eid)
    if not e or e.get("deleted"):
        return None
    if e["status"] != "geprueft" and e.get("autor") != u["id"] and not W.darf_pruefen(u):
        return None
    e["darf"] = {"aendern": True, "loeschen": bool(darf_loeschen(u, e)), "pruefen": W.darf_pruefen(u)}
    return e


def aendern(c, u, eid, b):
    """Titel, Text, Tags – mit „Wiki prüfen“ bleibt ein geprüfter Eintrag geprüft, sonst geht er in die Prüfrunde (wiki.aendern)."""
    alt = c.execute("SELECT status FROM wiki_eintrag WHERE id=? AND deleted=''", (eid,)).fetchone()
    if not alt:
        raise LookupError("Eintrag nicht gefunden")
    w = {k: b[k] for k in ("titel", "text", "tags") if k in b}
    if W.darf_pruefen(u) and alt["status"] == "geprueft":
        w["status"] = "geprueft"
    return W.aendern(c, u, eid, w)


def loeschen(c, u, eid):
    e = W.eintrag(c, eid)
    if not e or e.get("deleted"):
        raise LookupError("Eintrag nicht gefunden")
    if not darf_loeschen(u, e):
        raise PermissionError("Löschen darf, wer den Eintrag angelegt hat oder das Recht „Wiki prüfen“ hat.")
    pfade = [d["pfad"] for d in e.get("dateien") or [] if d.get("pfad")]
    return papierkorb.ablegen(c, "wiki_eintrag", eid, "Wiki-Eintrag", e.get("titel") or "", u["name"], e.get("projekt") or "", "wiki", dateien=pfade)


def faellig(c, jetzt=None):
    """Was nachts weg muss: Dateien aus dem Papierkorb (endgültig gelöscht) und Einträge/Dateien, die die App „Wiki“ selbst als gelöscht
    markiert hat und die älter sind als die Frist des Papierkorbs → (Pfade, eintrag_ids, datei_ids)."""
    tage = papierkorb.einstellungen(c)["tage"]
    pfade = [p for p in papierkorb.dateien_abholen(c, "wiki") if isinstance(p, str)]
    if not tage:
        return pfade, [], []
    grenze = ((jetzt or datetime.now()) - timedelta(days=tage)).strftime("%Y-%m-%dT%H:%M:%S")
    E = [r["id"] for r in c.execute("SELECT id FROM wiki_eintrag WHERE deleted<>'' AND deleted<?", (grenze,)).fetchall()]
    D = []
    for r in c.execute("SELECT id, pfad, eintrag, deleted FROM wiki_datei WHERE deleted<>'' AND deleted<?", (grenze,)).fetchall():
        D.append(r["id"])
        pfade.append(r["pfad"])
    if E:
        ph = ",".join("?" * len(E))
        pfade += [r["pfad"] for r in c.execute(f"SELECT pfad FROM wiki_datei WHERE eintrag IN ({ph}) AND deleted=''", E).fetchall()]
    return [p for p in dict.fromkeys(pfade) if p], E, D


def entfernen(c, E, D):
    """Endgültig aus der Datenbank (Dateien hängen per Fremdschlüssel mit ON DELETE CASCADE)."""
    for i in D:
        c.execute("DELETE FROM wiki_datei WHERE id=?", (i,))
    for i in E:
        c.execute("DELETE FROM wiki_eintrag WHERE id=?", (i,))
    return len(E), len(D)


def routen(bp, _uid):
    from flask import jsonify, request
    from . import db

    def _ich():
        u, _ = _uid()
        return u

    @bp.post("/api/bp/wiki/symbole")
    def bp_wiki_symbole():
        """{schlüssel: {w: [Worte], p: Projekt-ID?}} → {schlüssel: [{id, titel}]} – alle sichtbaren Zeilen einer Seite auf einmal."""
        u = _ich()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        b = request.get_json(silent=True) or {}
        with db.tx() as c:
            return jsonify(symbole(c, b if isinstance(b, dict) else {}))

    @bp.route("/api/bp/wiki/eintrag/<int:eid>", methods=["GET", "PUT", "DELETE"])
    def bp_wiki_eintrag(eid):
        u = _ich()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        try:
            with db.tx() as c:
                if request.method == "GET":
                    e = lesen(c, u, eid)
                    return (jsonify(e), 200) if e else (jsonify(error="Eintrag nicht gefunden"), 404)
                if request.method == "PUT":
                    d, vorher = aendern(c, u, eid, request.get_json(silent=True) or {})
                    neu = lesen(c, u, eid) or d
                    return jsonify({**neu, "vorher": {"titel": vorher.get("titel"), "text": vorher.get("text"), "tags": W.tags_von(vorher.get("kapitel"), vorher.get("stichworte"))}})
                return jsonify(ok=True, papierkorb=loeschen(c, u, eid))
        except LookupError as e:
            return jsonify(error=str(e)), 404
        except PermissionError as e:
            return jsonify(error=str(e)), 403
        except ValueError as e:
            return jsonify(error=str(e)), 400
