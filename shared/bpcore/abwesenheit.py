"""Abwesenheiten zurücknehmen und löschen (beschlossen am 17.11.2026, S1 T1 U1 V1) – eine Stelle für Zeiten und Personal.

Wer: die Person selbst (nur ab heute) und wer das Recht „urlaub.aendern“ hat (Abwesenheiten anderer ändern, auch Vergangenes;
ab Werk Geschäftsführung, Büroleitung, Assistenz).
Was: Klick auf eine Abwesenheit im Kalender → info() sagt Zeitraum, Antrag, was erlaubt ist und wen man benachrichtigen kann;
aendern() mit aktion
  tage     einzelne Tage zurückgeben (genehmigter Antrag bleibt, „teilweise zurückgenommen“ – zeit_antrag.zurueck)
  ganz     den ganzen Zeitraum zurücknehmen (Antrag: status „zurueckgenommen“, bleibt im Verlauf)
  loeschen Fehleintrag: Tage frei, der Antrag geht in den Papierkorb
Jede Änderung steht im Protokoll (audit_log). Benachrichtigt wird nur, wen der Dialog angehakt hat (Hinweis „Neu für dich“ auf der
Startseite – todo._a_urlaub –, auf Wunsch zusätzlich per Mail). Rückgängig: signierter Stand (rueck), nur für den, der geändert hat.
"""
import json
from datetime import date, timedelta

from . import rechte
from . import zeiten as Z

AKTIONEN = {"tage": "zurückgegeben", "ganz": "zurückgenommen", "loeschen": "gelöscht"}


def darf_andere(user):
    return bool(user.get("is_admin")) or rechte.hat(user, "urlaub.aendern")


def _name(c, uid):
    r = c.execute("SELECT name, vorname, nachname, email FROM users WHERE id=?", (uid,)).fetchone()
    if not r:
        return "", ""
    return (" ".join(x for x in (r["vorname"] or "", r["nachname"] or "") if x) or r["name"]), (r["email"] or "")


def _antrag_am(c, uid, tag, status):
    r = c.execute("SELECT * FROM zeit_antrag WHERE user_id=? AND status=? AND von<=? AND bis>=? ORDER BY id DESC LIMIT 1",
                  (uid, status, tag, tag)).fetchone()
    return dict(r) if r else None


def _zeitraum(c, P, uid, tag, art):
    """Zusammenhängende Tage derselben Art um tag (Wochenende und Feiertage dazwischen gehören dazu) – höchstens 120 Tage je Richtung."""
    def gleich(t):
        return Z.zt(c, uid, t).get("abw") == art

    def frei(t):
        return not Z.soll_min(P, t) and not Z.zt(c, uid, t).get("abw")
    d0 = date.fromisoformat(tag)
    a = b = d0
    for i in range(1, 121):
        t = (d0 - timedelta(days=i)).isoformat()
        if gleich(t):
            a = d0 - timedelta(days=i)
        elif not frei(t):
            break
    for i in range(1, 121):
        t = (d0 + timedelta(days=i)).isoformat()
        if gleich(t):
            b = d0 + timedelta(days=i)
        elif not frei(t):
            break
    return a.isoformat(), b.isoformat()


def _empfaenger(c, uid, selbst, antrag):
    """Wen der Dialog zum Benachrichtigen anbietet: die Person und wer entscheidet. Vorgeschlagen ist immer „der andere“."""
    out = []
    n, _ = _name(c, uid)
    if not selbst:
        out.append({"id": uid, "name": n, "rolle": "die Person selbst", "vor": True})
    ent = Z.entscheider(c, antrag or {"user_id": uid})
    for e in ent:
        if e == uid:
            continue
        m, _ = _name(c, e)
        out.append({"id": e, "name": m, "rolle": "entscheidet über Urlaub", "vor": selbst})
    return out


def _tag_von_antrag(c, aid):
    """Erster Tag eines Antrags, an dem noch etwas eingetragen ist (offen: der erste Arbeitstag) – Einstieg aus der Antragsliste."""
    a = Z.antrag(c, int(aid))
    if not a:
        raise ValueError("Antrag nicht gefunden.")
    T = Z.arbeitstage(Z.person(c, a["user_id"]), a["von"], a["bis"])
    if a["status"] == "genehmigt":
        T = [t for t in T if Z.zt(c, a["user_id"], t).get("abw") == a["art"]]
    elif a["status"] != "offen":
        raise ValueError("Der Antrag ist schon erledigt.")
    if not T:
        raise ValueError("Für diesen Antrag ist kein Tag mehr eingetragen.")
    heute = Z.heute()
    return a["user_id"], next((t for t in T if t >= heute), T[0])


def info(c, user, uid, tag, aid=None):
    """Was am Tag eingetragen ist und was der Benutzer damit tun darf. PermissionError / ValueError mit Klartext."""
    Z.arten_laden(c)
    if aid:
        uid, tag = _tag_von_antrag(c, aid)
    uid, selbst = int(uid), int(uid) == user["id"]
    andere = darf_andere(user)
    if not selbst and not andere:
        raise PermissionError("Abwesenheiten anderer ändern Geschäftsführung, Büroleitung und Assistenz (Recht „Abwesenheiten anderer ändern“).")
    if not Z._tag_ok(tag):
        raise ValueError("Datum prüfen.")
    P = Z.person(c, uid)
    art = Z.zt(c, uid, tag).get("abw") or ""
    offen = None if art else _antrag_am(c, uid, tag, "offen")
    if not art and not offen:
        raise ValueError("An dem Tag ist keine Abwesenheit eingetragen.")
    if offen:
        a, von, bis, art, tage = offen, offen["von"], offen["bis"], offen["art"], Z.arbeitstage(P, offen["von"], offen["bis"])
    else:
        a = _antrag_am(c, uid, tag, "genehmigt")
        if a and a["art"] != art:
            a = None
        von, bis = (a["von"], a["bis"]) if a else _zeitraum(c, P, uid, tag, art)
        tage = [t for t in Z.arbeitstage(P, von, bis) if Z.zt(c, uid, t).get("abw") == art] if a else \
            [t for t in _alle_tage(von, bis) if Z.zt(c, uid, t).get("abw") == art]
    n, _ = _name(c, uid)
    ab = "" if andere else Z.heute()
    return {"uid": uid, "tag": tag, "name": n, "selbst": selbst, "art": art, "art_text": Z.ABW.get(art, art), "von": von, "bis": bis, "tage": tage,
            "antrag": ({k: a[k] for k in ("id", "status", "von", "bis", "tage", "entschieden_von", "entschieden")} | {"zurueck": json.loads(a.get("zurueck") or "[]")}) if a else None,
            "offen": bool(offen), "ab": ab, "an": _empfaenger(c, uid, selbst, a)}


def _alle_tage(von, bis):
    t, out = date.fromisoformat(von), []
    while t.isoformat() <= bis:
        out.append(t.isoformat())
        t += timedelta(days=1)
    return out


def _kurz(t):
    return f"{t[8:10]}.{t[5:7]}.{t[:4]}"


def _spanne(tage):
    if not tage:
        return ""
    return _kurz(tage[0]) if len(tage) == 1 else f"{_kurz(tage[0])} – {_kurz(tage[-1])}"


def aendern(c, user, b, secret):
    """b: {uid, tag, aktion, tage?, an: [ids], mail: bool, grund}. Gibt {ok, n, text, rueck, mails: [(email, betreff, text)]} zurück –
    die Mails verschickt der Aufrufer nach der Transaktion."""
    aktion = b.get("aktion")
    if aktion not in AKTIONEN:
        raise ValueError("Was soll passieren?")
    I = info(c, user, b.get("uid") or user["id"], str(b.get("tag") or "")[:10])
    uid, art, a = I["uid"], I["art"], I["antrag"]
    if aktion == "tage":
        if I["offen"]:
            raise ValueError("Ein offener Antrag lässt sich nur ganz zurücknehmen – oder neu stellen.")
        sel = sorted(set(str(t)[:10] for t in (b.get("tage") or [])) & set(I["tage"]))
        if not sel:
            raise ValueError("Bitte die Tage antippen, die zurückgehen.")
    else:
        sel = list(I["tage"])
    if I["ab"] and not I["offen"] and any(t < I["ab"] for t in sel):
        raise ValueError("Vergangene Tage ändern Geschäftsführung, Büroleitung oder Assistenz – du kannst Tage ab heute zurückgeben.")
    grund = " ".join(str(b.get("grund") or "").split())[:300]
    jetzt = Z.jetzt().strftime("%Y-%m-%d %H:%M")
    rueck = {"u": user["id"], "uid": uid, "tage": {}, "a": None, "pk": None}
    for t in ([] if I["offen"] else sel):
        rueck["tage"][t] = art
        Z.zt_setzen(c, uid, t, abw="")
    if a:
        alt = c.execute("SELECT status, zurueck, entschieden_von, entschieden, gesehen FROM zeit_antrag WHERE id=?", (a["id"],)).fetchone()
        rueck["a"] = {"id": a["id"], **dict(alt)}
        rest = [t for t in Z.arbeitstage(Z.person(c, uid), a["von"], a["bis"]) if Z.zt(c, uid, t).get("abw") == art]
        if aktion == "loeschen":
            from . import papierkorb
            rueck["pk"] = papierkorb.ablegen(c, "zeit_antrag", a["id"], "urlaubsantrag", f"{I['art_text']} {I['name']} {_spanne([a['von'], a['bis']])}",
                                             wer=user["name"], app="zeiten")
        elif I["offen"] or not rest:
            c.execute("UPDATE zeit_antrag SET status='zurueckgenommen', rueckzug='', zurueck=?, entschieden=?, entschieden_von=?, gesehen=1 WHERE id=?",
                      (json.dumps(sorted(set(a["zurueck"]) | set(sel))), jetzt, user["name"], a["id"]))   # benachrichtigt wird nur über den Dialog
        else:
            c.execute("UPDATE zeit_antrag SET zurueck=? WHERE id=?", (json.dumps(sorted(set(a["zurueck"]) | set(sel))), a["id"]))
    n = len(sel) * (0.5 if art == "urlaub_halb" else 1)
    was = {"tage": f"{I['art_text']}: {n:g} Tag{'' if n == 1 else 'e'} zurückgegeben", "ganz": f"{I['art_text']} zurückgenommen",
           "loeschen": f"{I['art_text']} gelöscht"}[aktion]
    erlaubt = {x["id"] for x in I["an"]}
    an = [int(x) for x in (b.get("an") or []) if str(x).isdigit() and int(x) in erlaubt]
    namen, mails = [], []
    text = f"{was} – {I['name']}, {_spanne(sel) if sel else _spanne([I['von'], I['bis']])}" + (f". Grund: {grund}" if grund else "") + f". Geändert von {user['name']}."
    for e in an:
        nm, mail_ = _name(c, e)
        namen.append(nm)
        c.execute("INSERT INTO zeit_abw_meldung(user_id, ts, titel, text, von) VALUES(?,?,?,?,?)", (e, jetzt, was[:200], text[:1000], user["name"][:120]))
        if b.get("mail") and mail_:
            mails.append((mail_, was, text + "\n\nZu sehen in der Bauplattform unter Zeiten → Monat & Urlaub."))
    c.execute("INSERT INTO audit_log(ts, user_name, cat, action, detail) VALUES(?,?,?,?,?)",
              (Z.jetzt().strftime("%Y-%m-%d %H:%M:%S"), user["name"], "zeiten", was if aktion != "tage" else f"{I['art_text']} zurückgenommen ({n:g} Tage)",
               f"{I['name']} · {_spanne(sel) if sel else _spanne([I['von'], I['bis']])}" + (f" · benachrichtigt: {', '.join(namen)}" if namen else "")
               + (" (mit Mail)" if mails else "") + (f" · Grund: {grund}" if grund else "")))
    return {"ok": True, "n": n, "text": was, "rueck": _signieren(secret, rueck), "mails": mails}


def _signieren(secret, d):
    from itsdangerous import URLSafeSerializer
    return URLSafeSerializer(secret, salt="bp-abwesenheit").dumps(d)


def zurueck(c, user, token, secret):
    """Rückgängig – nur mit dem signierten Stand und nur für den, der geändert hat."""
    from itsdangerous import BadSignature, URLSafeSerializer
    try:
        d = URLSafeSerializer(secret, salt="bp-abwesenheit").loads(str(token or ""))
    except BadSignature:
        raise ValueError("Das lässt sich nicht mehr rückgängig machen.")
    if d.get("u") != user["id"]:
        raise PermissionError("Rückgängig nur für den, der geändert hat.")
    for t, art in (d.get("tage") or {}).items():
        if Z._tag_ok(t):
            Z.zt_setzen(c, d["uid"], t, abw=art)
    if d.get("pk"):
        from . import papierkorb
        papierkorb.wiederherstellen(c, d["pk"])
    elif d.get("a"):
        x = d["a"]
        c.execute("UPDATE zeit_antrag SET status=?, zurueck=?, entschieden_von=?, entschieden=?, gesehen=? WHERE id=?",
                  (x["status"], x["zurueck"], x["entschieden_von"], x["entschieden"], x["gesehen"], x["id"]))
    c.execute("INSERT INTO audit_log(ts, user_name, cat, action, detail) VALUES(?,?,?,?,?)",
              (Z.jetzt().strftime("%Y-%m-%d %H:%M:%S"), user["name"], "zeiten", "Abwesenheit: Änderung rückgängig", f"Person {d['uid']}"))
    return {"ok": True}


def meldungen(c, uid, tage=14):
    """Benachrichtigungen der letzten Tage für die Startseite („Neu für dich“)."""
    seit = (Z.jetzt() - timedelta(days=tage)).strftime("%Y-%m-%d")
    return [dict(r) for r in c.execute("SELECT * FROM zeit_abw_meldung WHERE user_id=? AND ts>=? ORDER BY id DESC LIMIT 30", (uid, seit)).fetchall()]


def routen(bp, user):
    from flask import current_app, jsonify, request
    from . import db

    def fehler(e):
        return jsonify(error=str(e)), 403 if isinstance(e, PermissionError) else 400

    @bp.get("/api/bp/abwesenheit")
    def abw_info():
        u = user()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        try:
            with db.tx() as c:
                aid = request.args.get("aid")
                return jsonify(info(c, u, int(request.args.get("uid") or u["id"]), str(request.args.get("tag") or "")[:10], int(aid) if str(aid or "").isdigit() else None))
        except (PermissionError, ValueError) as e:
            return fehler(e)

    @bp.post("/api/bp/abwesenheit")
    def abw_aendern():
        u = user()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        try:
            with db.tx() as c:
                r = aendern(c, u, request.get_json(silent=True) or {}, current_app.secret_key)
                cf = None
                if r["mails"]:
                    from . import mail
                    cf = mail.conf(c)
        except (PermissionError, ValueError) as e:
            return fehler(e)
        gesendet = 0
        for an, betreff, text in r.pop("mails"):
            try:
                from . import mail
                mail.send(cf, an, betreff, text)
                gesendet += 1
            except Exception:   # noqa: BLE001 – steht unter Verwaltung → Fehlermeldungen (mail.send meldet selbst)
                pass
        r["gesendet"] = gesendet
        return jsonify(r)

    @bp.post("/api/bp/abwesenheit/zurueck")
    def abw_zurueck():
        u = user()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        try:
            with db.tx() as c:
                return jsonify(zurueck(c, u, (request.get_json(silent=True) or {}).get("rueck"), current_app.secret_key))
        except (PermissionError, ValueError) as e:
            return fehler(e)

    @bp.route("/api/bp/abwesenheit/arten", methods=["GET", "PUT"])
    def abw_arten():
        u = user()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        with db.tx() as c:
            if request.method == "PUT":
                if not rechte.hat(u, "verwaltung"):
                    return jsonify(error="Eigene Arten legt die Verwaltung an."), 403
                try:
                    L = Z.arten_abw_setzen(c, (request.get_json(silent=True) or {}).get("arten"))
                except ValueError as e:
                    return jsonify(error=str(e)), 400
                c.execute("INSERT INTO audit_log(ts, user_name, cat, action, detail) VALUES(?,?,?,?,?)",
                          (Z.jetzt().strftime("%Y-%m-%d %H:%M:%S"), u["name"], "zeiten", "Abwesenheitsarten geändert", ", ".join(x["name"] for x in L if not x["fest"])[:300]))
            else:
                L = Z.arten_abw_liste(c)
        return jsonify(arten=L, wirkungen=Z.WIRKUNGEN, darf=rechte.hat(u, "verwaltung"))
