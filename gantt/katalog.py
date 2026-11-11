"""Bauzeitenplan – Leistungskatalog, Abschnitte, Firmen-Vorgaben und Adressbuch sichern: benannte Stände, Vergleich, Zurückholen in Teilen, Datei.

GET    /api/katalog/staende                    Stände (ohne Daten) – beim allerersten Aufruf wird der jetzige Stand gesichert und geschützt
POST   /api/katalog/staende {name, fest}       jetzigen Stand sichern (nur Administrator)
PUT    /api/katalog/staende/<id> {name, fest}  umbenennen, schützen (⭐ – wird nie weggeräumt)
DELETE /api/katalog/staende/<id>               löschen (nicht geschützte)
GET    /api/katalog/staende/<id>/vergleich     was ist seither anders (je Teil)
POST   /api/katalog/staende/<id>/zurueck {teile}  zurückholen: leistungen, abschnitte, vorgaben, firmen – vorher wird der jetzige Stand gesichert
GET    /api/katalog/datei                      der ganze Katalog als Datei (JSON)
POST   /api/katalog/datei                      Datei einlesen → als Stand ablegen (zurückholen dann wie oben)
Die automatischen Stände je Speicherung liefert der Versionsverlauf (bpcore/versionen, Bereiche gs:library, gs:phases, gs:catfirms, gs:catscope).
Gespeichert in gantt_store: „_kstaende“ (Liste) und „_kstand:<id>“ (Daten) – Schlüssel mit „_“ laufen nicht durch den Versionsverlauf.
"""
import json, re, secrets, time

from flask import Response, g, jsonify, request

from bpcore import db

TEILE = {"leistungen": ("library",), "abschnitte": ("phases",), "vorgaben": ("catfirms", "catscope"), "firmen": ()}
MAX = 60


def einbinden(app, *, store_get, store_put, store_put_roh, all_firms, clean_firm, save_firm, firm_of, uname, body, clean_lib, phase_key):

    def jetzt(c):
        return {"library": store_get(c, "library", []), "phases": store_get(c, "phases", []), "catfirms": store_get(c, "catfirms", {}),
                "catscope": store_get(c, "catscope", {}), "firmen": all_firms(c)}

    def zahlen(d):
        return {"leistungen": len(d.get("library") or []), "abschnitte": len(d.get("phases") or []),
                "vorgaben": len(d.get("catfirms") or {}) + len(d.get("catscope") or {}), "firmen": len(d.get("firmen") or [])}

    def liste(c):
        L = store_get(c, "_kstaende", [])
        return L if isinstance(L, list) else []

    def sichern(c, name, fest=False, daten=None):
        d = daten if daten is not None else jetzt(c)
        sid = secrets.token_hex(6)
        L = liste(c)
        L.insert(0, {"id": sid, "name": str(name)[:120], "am": time.strftime("%Y-%m-%d %H:%M:%S"), "von": uname(), "fest": bool(fest), "zahlen": zahlen(d)})
        weg = [x for x in L[MAX:] if not x.get("fest")]   # Älteste ungeschützte wegräumen
        L = [x for x in L if x not in weg]
        for x in weg:
            c.execute("DELETE FROM gantt_store WHERE key=?", ("_kstand:" + x["id"],))
        store_put_roh(c, "_kstand:" + sid, d, uname())
        store_put_roh(c, "_kstaende", L, uname())
        return sid

    def admin():
        return bool(g.user and g.user["is_admin"])

    NUR = "Den Leistungskatalog für alle Projekte sichert und ändert der Administrator."

    @app.get("/api/katalog/staende")
    def katalog_staende():
        with db.tx() as c:
            L = liste(c)
            if not L and admin():   # erster Aufruf: den Stand vor Einführung festhalten – zum Zurückrufen
                sichern(c, "Stand vor Einführung der Sicherung (" + time.strftime("%d.%m.%Y") + ")", fest=True)
                L = liste(c)
            return jsonify(staende=L, admin=admin(), jetzt=zahlen(jetzt(c)))

    @app.post("/api/katalog/staende")
    def katalog_sichern():
        if not admin():
            return jsonify(error=NUR), 403
        b = body() or {}
        with db.tx() as c:
            sid = sichern(c, (b.get("name") or "").strip() or "Stand vom " + time.strftime("%d.%m.%Y %H:%M"), b.get("fest"))
            return jsonify(staende=liste(c), neu=sid)

    @app.route("/api/katalog/staende/<sid>", methods=["PUT", "DELETE"])
    def katalog_stand(sid):
        if not admin():
            return jsonify(error=NUR), 403
        with db.tx() as c:
            L = liste(c)
            x = next((y for y in L if y["id"] == sid), None)
            if not x:
                return jsonify(error="Stand nicht gefunden."), 404
            if request.method == "DELETE":
                if x.get("fest"):
                    return jsonify(error="Geschützter Stand – erst den Stern entfernen."), 409
                L.remove(x)
                c.execute("DELETE FROM gantt_store WHERE key=?", ("_kstand:" + sid,))
            else:
                b = body() or {}
                if str(b.get("name") or "").strip():
                    x["name"] = str(b["name"]).strip()[:120]
                if "fest" in b:
                    x["fest"] = bool(b["fest"])
            store_put_roh(c, "_kstaende", L, uname())
            return jsonify(staende=L)

    def unterschied(alt, neu):
        """Je Teil: neu dazugekommen, weggefallen, geändert (Zahlen) – zum Anzeigen vor dem Zurückholen."""
        def per(a, b, key):
            A = {key(x): x for x in a}
            B = {key(x): x for x in b}
            return {"dazu": len(set(B) - set(A)), "weg": len(set(A) - set(B)), "anders": sum(1 for k in set(A) & set(B) if A[k] != B[k])}
        def dct(a, b):
            return {"dazu": len(set(b) - set(a)), "weg": len(set(a) - set(b)), "anders": sum(1 for k in set(a) & set(b) if a[k] != b[k])}
        v1, v2 = dct(alt.get("catfirms") or {}, neu.get("catfirms") or {}), dct(alt.get("catscope") or {}, neu.get("catscope") or {})
        return {"leistungen": per(alt.get("library") or [], neu.get("library") or [], lambda x: x.get("id")),
                "abschnitte": per(alt.get("phases") or [], neu.get("phases") or [], lambda x: x.get("k")),
                "vorgaben": {k: v1[k] + v2[k] for k in v1},
                "firmen": per(alt.get("firmen") or [], neu.get("firmen") or [], lambda x: x.get("id"))}

    @app.get("/api/katalog/staende/<sid>/vergleich")
    def katalog_vergleich(sid):
        with db.tx() as c:
            d = store_get(c, "_kstand:" + sid, None)
            if not isinstance(d, dict):
                return jsonify(error="Stand nicht gefunden."), 404
            return jsonify(seither=unterschied(d, jetzt(c)))   # alt = Stand, neu = jetzt

    @app.post("/api/katalog/staende/<sid>/zurueck")
    def katalog_zurueck(sid):
        if not admin():
            return jsonify(error=NUR), 403
        teile = [t for t in ((body() or {}).get("teile") or []) if t in TEILE]
        if not teile:
            return jsonify(error="Bitte mindestens einen Teil wählen."), 400
        with db.tx() as c:
            c.execute("SELECT pg_advisory_xact_lock(hashtext('gantt:katalog'))")
            d = store_get(c, "_kstand:" + sid, None)
            x = next((y for y in liste(c) if y["id"] == sid), None)
            if not isinstance(d, dict) or not x:
                return jsonify(error="Stand nicht gefunden."), 404
            vorher = sichern(c, f"automatisch vor dem Zurückholen von „{x['name']}“")
            for t in teile:
                for k in TEILE[t]:
                    store_put(c, k, d.get(k) if d.get(k) is not None else ([] if k in ("library", "phases") else {}), uname())   # mit Versionsverlauf
            n_firmen = 0
            if "firmen" in teile:   # Adressbuch: Firmen wie damals – geändert oder wieder angelegt, nie gelöscht
                by_id = {firm_of(r)["id"]: r for r in c.execute("SELECT * FROM contacts")}
                for f in map(clean_firm, d.get("firmen") or []):
                    if save_firm(c, f, by_id) is not None:
                        n_firmen += 1
        return jsonify(ok=True, vorher=vorher, firmen=n_firmen)

    @app.get("/api/katalog/datei")
    def katalog_datei():
        with db.tx() as c:
            d = {"art": "bauplattform-leistungskatalog", "version": 1, "am": time.strftime("%Y-%m-%d %H:%M:%S"), **jetzt(c)}
        return Response(json.dumps(d, ensure_ascii=False, indent=1), mimetype="application/json",
                        headers={"Content-Disposition": f'attachment; filename="Leistungskatalog_{time.strftime("%Y-%m-%d")}.json"'})

    @app.post("/api/katalog/datei")
    def katalog_einlesen():
        if not admin():
            return jsonify(error=NUR), 403
        f = request.files.get("datei")
        try:
            d = json.loads((f.read(20 * 1024 * 1024) if f else b"").decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            return jsonify(error="Keine gültige Katalog-Datei."), 400
        if not isinstance(d, dict) or d.get("art") != "bauplattform-leistungskatalog":
            return jsonify(error="Das ist keine Katalog-Datei der Bauplattform."), 400
        lst = lambda k: d.get(k) if isinstance(d.get(k), list) else []
        dic = lambda k: d.get(k) if isinstance(d.get(k), dict) else {}
        ok = lambda k: isinstance(k, str) and re.fullmatch(r"[\w~.-]{1,60}", k)
        daten = {"library": [clean_lib(x) for x in lst("library")[:5000]],   # wie beim Speichern geprüft
                 "phases": [{"k": x["k"], "n": str(x.get("n") or x["k"])[:120], "own": bool(x.get("own"))} for x in lst("phases")[:200] if isinstance(x, dict) and phase_key.match(str(x.get("k") or ""))],
                 "catfirms": {k: str(v)[:200] for k, v in list(dic("catfirms").items())[:5000] if ok(k) and v},
                 "catscope": {k: v for k, v in list(dic("catscope").items())[:5000] if ok(k) and v in ("bau", "we")},
                 "firmen": [clean_firm(x) for x in lst("firmen")[:5000]]}
        with db.tx() as c:
            sid = sichern(c, f"aus Datei {f.filename or ''} (Stand {str(d.get('am') or '')[:10]})", daten=daten)
            return jsonify(staende=liste(c), neu=sid)
