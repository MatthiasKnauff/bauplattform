"""Mängelrüge: Fotos zu selbst eingetragenen Mängeln (19.11.2026). Die Mängel kommen ins heutige Bautagebuch, die Fotos an den jeweiligen
Mangel (Dateien im Laufwerk des Bautagebuchs, nicht in der Datenbank); die Rüge nimmt die zurückgegebenen Nummern wie erfasste Mängel."""
import json, re, uuid, urllib.error, urllib.request
from datetime import date

from flask import g, jsonify, request

from bpcore import db, fehler as bpfehler, sso
import common as C


def hochladen(_projects, _sees):
    """Selbst eingetragene Mängel mit Fotos (19.11.2026): die Mängel kommen ins heutige Bautagebuch, die Fotos an den jeweiligen Mangel
    (Dateien im Laufwerk des Bautagebuchs, nicht in der Datenbank). Zurück kommen die Nummern – die Rüge nimmt sie wie erfasste Mängel,
    die Fotos stehen dann in der Anlage. Formular: pid, firma, frist, zeilen (JSON-Liste), files + zu (Zeile je Foto, ab 0)."""
    f = request.form
    try:
        zeilen = [str(z).strip()[:500] for z in json.loads(f.get("zeilen") or "[]") if str(z).strip()][:40]
        pid = int(f.get("pid") or 0)
    except (ValueError, TypeError):
        return jsonify(error="Angaben unvollständig"), 400
    dateien, zu = request.files.getlist("files")[:20], f.getlist("zu")
    if not zeilen or not dateien:
        return jsonify(error="Bitte einen Mangel eintragen und ein Foto wählen."), 400
    with db.tx() as c:
        pr = _projects(c).get(pid)
        tok = sso.current_token(request, c)
        r = c.execute("SELECT id FROM reports WHERE project_id=? AND date=? ORDER BY number DESC LIMIT 1", (pid, date.today().isoformat())).fetchone() if pr else None
    if not pr or not _sees(g.user, pr):
        return jsonify(error="Projekt nicht gefunden"), 404
    frist = str(f.get("frist") or "")[:10]
    try:
        rid = r["id"] if r else C.bt_api("POST", f"/api/projects/{pid}/reports", {})["id"]
        ids = [C.bt_api("POST", f"/api/reports/{rid}/items", {"kind": "maengel", "text": z, "company": str(f.get("firma") or "")[:200], **({"due": frist} if frist else {})})["id"] for z in zeilen]
    except (RuntimeError, KeyError, TypeError) as e:
        return jsonify(error=f"Die Mängel ließen sich nicht ins Bautagebuch eintragen ({e})."), 502
    abgelehnt = []
    for n, d in enumerate(dateien):
        k = int(zu[n]) if n < len(zu) and str(zu[n]).isdigit() and int(zu[n]) < len(ids) else 0
        roh = d.read(15 * 1024 * 1024 + 1)
        if len(roh) > 15 * 1024 * 1024 or not (d.mimetype or "").startswith("image/"):
            abgelehnt.append(d.filename or "?"); continue
        grenze = uuid.uuid4().hex
        name = re.sub(r'[\r\n"]', "_", d.filename or "foto.jpg")[:120]
        teile = (f"--{grenze}\r\nContent-Disposition: form-data; name=\"item_id\"\r\n\r\n{ids[k]}\r\n"
                 f"--{grenze}\r\nContent-Disposition: form-data; name=\"files\"; filename=\"{name}\"\r\nContent-Type: {d.mimetype}\r\n\r\n").encode() + roh + f"\r\n--{grenze}--\r\n".encode()
        try:
            req = urllib.request.Request(C.BT_INTERNAL + f"/api/reports/{rid}/images", data=teile, method="POST",
                                         headers={"Cookie": f"{sso.COOKIE}={tok}", "Content-Type": f"multipart/form-data; boundary={grenze}"})
            with urllib.request.urlopen(req, timeout=60) as a:
                abgelehnt += json.loads(a.read().decode() or "{}").get("rejected") or []
        except (urllib.error.URLError, ValueError) as e:
            bpfehler.still("aufgaben", "Mängelrüge: Foto nicht ins Bautagebuch geladen", e)
            abgelehnt.append(d.filename or "?")
    return jsonify(ids=ids, bericht=rid, abgelehnt=abgelehnt)
