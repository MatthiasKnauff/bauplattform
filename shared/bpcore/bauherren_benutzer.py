"""Bauherren-Benutzerverwaltung (GO 17.11.2026, BH A1 B1 C1 D1 + löschbar): alle Zugänge zum Bauherrenportal über alle Projekte.

Eine Person = eine E-Mail (das Portal kennt ein Konto mit mehreren Projekten, C1); je Projekt eine Zeile in bh_konto mit Rolle (B1):
  bauherr     alles, was freigegeben ist
  vertretung  ohne Rechnungen und Kosten
  ansehen     keine Nachrichten, keine Dateien hochladen
Abweichungen je Person und Projekt in bh_konto.rechte (nur, was von der Rolle abweicht). Ablauf (D1): ohne Angabe 12 Monate nach der
Archivierung des Projekts (Tag der Archivierung merkt sich der Kern beim ersten Abgleich danach), „nie“ oder ein Datum.
Kontakt: die Person ist ein Kontakt aus Adressen, gefunden über die E-Mail – keine zweite Adressdatenbank.
Löschen: Zeilen in den Papierkorb, das Portal löscht das Konto beim nächsten Abgleich (bp_store „bauherren:weg“); Rückgängig holt sie zurück.
Zuletzt da: meldet das Portal bei jedem Abgleich (bp_store „bauherren:zuletzt“).
"""
import json
from datetime import date, datetime, timedelta

ROLLEN = {"bauherr": "Bauherr:in", "vertretung": "Vertretung", "ansehen": "nur ansehen"}
RECHTE = {"kosten": "Rechnungen und Kosten sehen", "nachricht": "Nachrichten schreiben", "upload": "Dateien hochladen", "wochenmail": "Wochenmail bekommen"}
VORGABE = {"bauherr": {}, "vertretung": {"kosten": False}, "ansehen": {"nachricht": False, "upload": False}}
ABLAUF_TAGE = 365


def _j(v, d):
    try:
        x = json.loads(v) if isinstance(v, str) else v
        return d if x is None else x
    except (TypeError, ValueError):
        return d


def _store(c, k, v=None):
    from . import bauherren
    return bauherren._store(c, k, v)


def rechte_von(rolle, eigen):
    """Gültige Rechte einer Zeile: Vorgabe der Rolle, darüber die Abweichungen."""
    R = {k: True for k in RECHTE}
    R.update(VORGABE.get(rolle, {}))
    R.update({k: bool(v) for k, v in (eigen or {}).items() if k in RECHTE})
    return R


def _archiviert(c):
    """{pid: Tag der Archivierung} – neu archivierte Projekte bekommen heute."""
    A = _store(c, "bauherren:archiviert") or {}
    heute = date.today().isoformat()
    neu = False
    P = {str(r["id"]) for r in c.execute("SELECT id FROM projects WHERE archived=1").fetchall()}
    for p in P - set(A):
        A[p] = heute
        neu = True
    for p in set(A) - P:   # wieder aus dem Archiv geholt
        del A[p]
        neu = True
    if neu:
        _store(c, "bauherren:archiviert", A)
    return A


def ablauf_tag(r, A):
    """Tag, an dem der Zugang endet ('' = nie bzw. Projekt läuft noch)."""
    if r["ablauf"] == "nie":
        return ""
    if r["ablauf"]:
        return r["ablauf"]
    a = A.get(str(r["project_id"]))
    return (date.fromisoformat(a) + timedelta(days=ABLAUF_TAGE)).isoformat() if a else ""


def ablauf_pruefen(c, heute=None):
    """Abgelaufene Zugänge sperren (vom Abgleich). Gibt die Zahl zurück."""
    heute = heute or date.today().isoformat()
    A, n = _archiviert(c), 0
    for r in c.execute("SELECT id, project_id, ablauf FROM bh_konto WHERE aktiv=1").fetchall():
        t = ablauf_tag(r, A)
        if t and t <= heute:
            c.execute("UPDATE bh_konto SET aktiv=0, abgelaufen=?, gesendet='' WHERE id=?", (heute, r["id"]))
            n += 1
    return n


def portal_projekte(c, email):
    """Für den Abgleich: aktive Projekte einer E-Mail mit den Rechten, die das Portal prüft."""
    return [{"pid": str(r["project_id"]), "rechte": {k: v for k, v in rechte_von(r["rolle"], _j(r["rechte"], {})).items() if k != "wochenmail"}}
            for r in c.execute("SELECT project_id, rolle, rechte FROM bh_konto WHERE email=? AND aktiv=1", (email,)).fetchall()]


def wochenmail_an(c, pid):
    return [r["email"] for r in c.execute("SELECT email, rolle, rechte FROM bh_konto WHERE project_id=? AND aktiv=1", (pid,)).fetchall()
            if rechte_von(r["rolle"], _j(r["rechte"], {}))["wochenmail"]]


def liste(c):
    """Alle Personen mit Zugang (je E-Mail), ihre Projekte, Rolle, Rechte, Stand, Ablauf, zuletzt da, Kontakt aus Adressen."""
    A, Z = _archiviert(c), _store(c, "bauherren:zuletzt") or {}
    P = {r["id"]: r["name"] for r in c.execute("SELECT id, name FROM projects").fetchall()}
    K = {}
    for r in c.execute("SELECT * FROM bh_konto ORDER BY email, project_id").fetchall():
        p = K.setdefault(r["email"], {"email": r["email"], "name": "", "projekte": [], "eingeladen": "", "gesendet": True, "abmelden": ""})
        p["name"] = p["name"] or r["name"]
        p["eingeladen"] = max(p["eingeladen"], r["eingeladen"] or "")
        p["gesendet"] = p["gesendet"] and bool(r["gesendet"])
        p["abmelden"] = p["abmelden"] or r["abmelden"]
        eig = _j(r["rechte"], {})
        p["projekte"].append({"pid": r["project_id"], "projekt": P.get(r["project_id"], "?"), "rolle": r["rolle"], "aktiv": bool(r["aktiv"]),
                              "rechte": rechte_von(r["rolle"], eig), "eigen": sorted(k for k in eig if k in RECHTE), "ablauf": r["ablauf"],
                              "ablauf_tag": ablauf_tag(r, A), "abgelaufen": r["abgelaufen"], "archiviert": str(r["project_id"]) in A})
    mails = list(K)
    kont = {}
    if mails:
        for r in c.execute("SELECT id, name, email FROM contacts WHERE email<>''").fetchall():
            for m in str(r["email"]).lower().replace(";", ",").split(","):
                if m.strip() in K and m.strip() not in kont:
                    kont[m.strip()] = {"id": r["id"], "name": r["name"]}
    out = []
    for m, p in K.items():
        aktiv = [x for x in p["projekte"] if x["aktiv"]]
        z = Z.get(m)
        p["zuletzt"] = datetime.fromtimestamp(float(z)).isoformat(timespec="minutes") if z else ""
        p["stand"] = ("gesperrt" if not aktiv and not any(x["abgelaufen"] for x in p["projekte"]) else "abgelaufen" if not aktiv
                      else "aktiv" if p["zuletzt"] else "eingeladen")
        p["kontakt"] = kont.get(m)
        out.append(p)
    return sorted(out, key=lambda x: (x["name"] or x["email"]).lower())


def vorschau(c, email, pid):
    """So sieht die Person das Projekt im Portal (GO 18.11.2026, Mock „Portal-Benutzer mit Vorschau“: BV-A2 B1 C1) – im Büro aus denselben
    Daten zusammengestellt, die der Kern ins Portal schiebt (Aussehen, Kopf, Bereiche, Freigaben, Rechte der Person); keine Verbindung zum Portal.
    Bereiche: Kachel je Bereich mit den sichtbaren Freigaben (Titel, Datum, neu seit dem letzten Besuch); gesperrt = für diese Person aus."""
    from . import bauherren as BH, bauherren_kopf as BK
    email = str(email or "").strip().lower()
    r = c.execute("SELECT * FROM bh_konto WHERE email=? AND project_id=?", (email, int(pid))).fetchone()
    if r is None:
        raise ValueError("Diese Person hat das Projekt nicht.")
    R, B = rechte_von(r["rolle"], _j(r["rechte"], {})), BH.bereiche(c, pid)
    z = (_store(c, "bauherren:zuletzt") or {}).get(email)
    zuletzt = datetime.fromtimestamp(float(z)).isoformat(timespec="seconds") if z else ""
    F = {}
    for f in BH.freigaben(c, pid):
        if not f["geloescht"]:
            F.setdefault(f["art"], []).append({"titel": f["titel"], "am": str(f["updated"] or "")[:10], "neu": bool(zuletzt) and str(f["updated"] or "") > zuletzt})
    sperre = {"kosten": "kosten", "rechnung": "kosten", "nachricht": "nachricht", "upload": "upload"}   # Bereich → Recht der Person
    kacheln = [{"k": k, "t": t, "an": B[k], "darf": R.get(sperre[k], True) if k in sperre else True, "freigaben": F.get(k, [])}
               for k, t in BH.BEREICHE.items() if B[k]]
    A, K = BK.portal_aussehen(c), BK.portal_kopf(c, pid)
    P = c.execute("SELECT name FROM projects WHERE id=?", (pid,)).fetchone()
    return {"name": r["name"] or email, "projekt": P["name"] if P else "", "buero": A["buero"], "logo": A["logo"], "farbe": A["farbe"],
            "anrede": K["anrede"] or A["anrede"], "bild": K["bild"], "bild_text": K["bild_text"], "phasen": K["phasen"], "ansprech": K["ansprech"],
            "zuletzt": zuletzt, "kacheln": kacheln}


def _zeilen(c, email):
    return c.execute("SELECT * FROM bh_konto WHERE email=?", (email,)).fetchall()


def aendern(c, email, b, wer=""):
    """b: {name?, ablauf? ('', 'nie', Datum), aktiv?, abmelden?, projekt?: {pid, rolle?, rechte?: {k: bool|null}, aktiv?, neu?}}.
    Gibt den alten Stand der Zeilen zurück (für Rückgängig)."""
    from . import bauherren
    email = str(email or "").strip().lower()
    alt = [dict(r) for r in _zeilen(c, email)]
    if not alt and not (b.get("projekt") or {}).get("neu"):
        raise ValueError("Diesen Zugang gibt es nicht.")
    j = bauherren._jetzt()
    if "name" in b:
        c.execute("UPDATE bh_konto SET name=?, updated=?, gesendet='' WHERE email=?", (bauherren._t(b["name"], 200), j, email))
    if "ablauf" in b:
        a = str(b["ablauf"] or "")
        if a not in ("", "nie"):
            try:
                a = date.fromisoformat(a).isoformat()
            except ValueError:
                raise ValueError("Ablauf: Datum JJJJ-MM-TT, „nie“ oder leer.") from None
        c.execute("UPDATE bh_konto SET ablauf=?, updated=? WHERE email=?", (a, j, email))
    if "aktiv" in b:   # Sperren / wieder zulassen – alle Projekte; abgelaufen und wieder zugelassen: endet dann nie (sonst gleich wieder gesperrt)
        c.execute("UPDATE bh_konto SET aktiv=?, abgelaufen='', updated=?, gesendet='' WHERE email=?", (1 if b["aktiv"] else 0, j, email))
        if b["aktiv"]:
            A, heute = _archiviert(c), date.today().isoformat()
            for r in _zeilen(c, email):
                t = ablauf_tag(r, A)
                if t and t <= heute and "ablauf" not in b:
                    c.execute("UPDATE bh_konto SET ablauf='nie' WHERE id=?", (r["id"],))
    if b.get("abmelden"):
        c.execute("UPDATE bh_konto SET abmelden=?, gesendet='' WHERE email=?", (j, email))
    pr = b.get("projekt")
    if isinstance(pr, dict) and str(pr.get("pid") or "").isdigit():
        pid = int(pr["pid"])
        if pr.get("neu"):
            if not c.execute("SELECT 1 FROM projects WHERE id=?", (pid,)).fetchone():
                raise ValueError("Projekt nicht gefunden.")
            bauherren.konto_setzen(c, pid, {"email": email, "name": b.get("name") or (alt[0]["name"] if alt else "")})
        r = c.execute("SELECT * FROM bh_konto WHERE email=? AND project_id=?", (email, pid)).fetchone()
        if not r:
            raise ValueError("Die Person hat dieses Projekt nicht.")
        if pr.get("weg"):
            c.execute("DELETE FROM bh_konto WHERE id=?", (r["id"],))
            c.execute("UPDATE bh_konto SET gesendet='' WHERE email=?", (email,))
            if not c.execute("SELECT 1 FROM bh_konto WHERE email=?", (email,)).fetchone():
                _weg(c, email, True)
        else:
            rolle = pr.get("rolle") if pr.get("rolle") in ROLLEN else r["rolle"]
            eig = _j(r["rechte"], {}) if rolle == r["rolle"] else {}
            for k, v in (pr.get("rechte") or {}).items():
                if k not in RECHTE:
                    continue
                if v is None or bool(v) == rechte_von(rolle, {})[k]:
                    eig.pop(k, None)
                else:
                    eig[k] = bool(v)
            c.execute("UPDATE bh_konto SET rolle=?, rechte=?, aktiv=?, updated=?, gesendet='' WHERE id=?",
                      (rolle, json.dumps(eig), 1 if pr.get("aktiv", bool(r["aktiv"])) else 0, j, r["id"]))
    return alt


def _weg(c, email, an):
    W = set(_store(c, "bauherren:weg") or [])
    (W.add if an else W.discard)(email)
    _store(c, "bauherren:weg", sorted(W))


def loeschen(c, email, wer=""):
    """Alle Zeilen der Person in den Papierkorb, das Portal löscht das Konto. Gibt die Papierkorb-Kennungen zurück."""
    from . import papierkorb
    email = str(email or "").strip().lower()
    Z = _zeilen(c, email)
    if not Z:
        raise ValueError("Diesen Zugang gibt es nicht.")
    pk = []
    for r in Z:
        p = c.execute("SELECT name FROM projects WHERE id=?", (r["project_id"],)).fetchone()
        pk.append(papierkorb.ablegen(c, "bh_konto", r["id"], "Zugang Bauherrenportal", f"{r['name'] or email} ({email})", wer, p["name"] if p else "", "bauherren"))
    _weg(c, email, True)
    return pk


def zurueck(c, z):
    """Rückgängig: {pk: [...], email} (gelöscht) oder {alt: [Zeilen]} (geändert)."""
    from . import papierkorb
    if z.get("pk"):
        for i in z["pk"]:
            papierkorb.wiederherstellen(c, int(i))
        email = str(z.get("email") or "").lower()
        c.execute("UPDATE bh_konto SET gesendet='' WHERE email=?", (email,))
        _weg(c, email, False)
        return
    alt = z.get("alt") or []
    if not alt:
        return
    email = alt[0]["email"]
    ids = {int(r["id"]) for r in alt}
    for r in _zeilen(c, email):
        if r["id"] not in ids:   # dazugekommenes Projekt
            c.execute("DELETE FROM bh_konto WHERE id=?", (r["id"],))
    for r in alt:
        c.execute("INSERT INTO bh_konto(id, project_id, email, name, aktiv, created, updated, gesendet, eingeladen, rolle, rechte, ablauf, abgelaufen, abmelden) "
                  "VALUES(?,?,?,?,?,?,?,'',?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, aktiv=excluded.aktiv, gesendet='', rolle=excluded.rolle, "
                  "rechte=excluded.rechte, ablauf=excluded.ablauf, abgelaufen=excluded.abgelaufen",
                  (int(r["id"]), int(r["project_id"]), email, r["name"], int(r["aktiv"]), r["created"], r["updated"], r.get("eingeladen") or "",
                   r["rolle"], r["rechte"], r["ablauf"], r["abgelaufen"], r.get("abmelden") or ""))
    _weg(c, email, False)


def routen(bp, _wer):
    from flask import jsonify, request
    from . import db

    @bp.get("/api/bp/bauherren/benutzer/vorschau")
    def bh_benutzer_vorschau():
        u, f = _wer()
        if f:
            return f
        try:
            with db.tx() as c:
                return jsonify(vorschau(c, request.args.get("email"), int(request.args.get("pid") or 0)))
        except ValueError as e:
            return jsonify(error=str(e)), 404

    @bp.route("/api/bp/bauherren/benutzer", methods=["GET", "POST"])
    def bh_benutzer():
        u, f = _wer()
        if f:
            return f
        b = request.get_json(silent=True) or {}
        try:
            with db.tx() as c:
                z = None
                if request.method == "POST":
                    if b.get("zurueck"):
                        zurueck(c, b["zurueck"])
                    elif b.get("aktion") == "loeschen":
                        z = {"pk": loeschen(c, b.get("email"), u["name"]), "email": str(b.get("email") or "").lower()}
                    else:
                        z = {"alt": aendern(c, b.get("email"), b, u["name"])}
                    c.execute("INSERT INTO audit_log(ts, user_name, cat, action, detail) VALUES(?,?,?,?,?)",
                              (datetime.now().isoformat(timespec="seconds").replace("T", " "), u["name"], "inhalt", "Bauherrenportal: Zugang",
                               f"{b.get('aktion') or ('Rückgängig' if b.get('zurueck') else 'geändert')}: {b.get('email') or ''}"[:200]))
                P = [{"id": r["id"], "name": r["name"]} for r in c.execute("SELECT id, name FROM projects WHERE archived=0 ORDER BY name").fetchall()]
                return jsonify(personen=liste(c), projekte=P, rollen=ROLLEN, rechte=RECHTE, vorgabe=VORGABE, zurueck=z)
        except ValueError as e:
            return jsonify(error=str(e)), 400
