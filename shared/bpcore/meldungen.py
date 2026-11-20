"""Benachrichtigungen verwalten (GO 17.11.2026, BN A1 B1 C1 D1): alles, was die Plattform von sich aus meldet – an einer Stelle.

Vier Arten:
  erinnerung  Erinnerungen (Tabelle erinnerungen: eigene, aus Mails, Vorab aus dem Bauzeitenplan) und Einträge im Bautagebuch mit Datum
              (Mängel, Zu erledigen, Weisungen) – aus = Status „aus“ bzw. items.reminded „aus“ (keine Mail, nicht in „Zu tun“),
              löschen = eigene in den Papierkorb, Bautagebuch: Datum weg, aus dem Bauzeitenplan: aus (sie entstehen sonst neu)
  hinweis     die Regeln der automatischen To-dos (todo.REGELN) – für mich: persönliche Abweichung (todo.eigene), für alle: Büro-Regel;
              je Rolle an/aus (B1): rollen() / rollen_setzen() – die Person kann bei sich ab- oder zuschalten
  kalender    gesendete Kalendereinladungen mit Datum ab heute (bp_store „ical:termin:…“) – löschen sagt sie in Outlook ab (C1)
  mail        Mails, die von selbst gehen: Erinnerungen per Mail (je Person, Vorgabe je Rolle) und die Wochenmail an die Bauherrschaft
              (je Projekt)
„Für alle“ und Einträge anderer nur mit Recht „meldungen.alle“ (D1; ab Werk Geschäftsführung, Büroleitung – und wer „verwaltung“ hat).
Jede Änderung gibt ihre Umkehrung zurück (Rückgängig in der Oberfläche).
"""
import json
from datetime import date

from . import konto, rechte, todo

RECHT = "meldungen.alle"
MAIL_ERINNERUNG = "mail_erinnerung"   # Schlüssel in der Rollen-Tabelle für „Erinnerungen per Mail“


def _j(v, d):
    try:
        x = json.loads(v) if isinstance(v, str) else v
        return d if x is None else x
    except (TypeError, ValueError):
        return d


def darf_alle(u):
    return bool(u) and (rechte.hat(u, RECHT) or rechte.hat(u, "verwaltung"))


# ---------------------------------------------------------------- Rollen
def rollen(c):
    """{regel|mail_erinnerung: [rollen-keys]} – fehlt ein Schlüssel, gilt die Regel wie bisher für alle (bzw. die Personen der Regel)."""
    d = _j(konto._get(c, "meldungen:rollen"), {}) or {}
    return {k: [str(r) for r in v][:30] for k, v in d.items() if isinstance(v, list) and (k in todo.RK or k == MAIL_ERINNERUNG)}


def rollen_setzen(c, key, liste, wer=""):
    if key not in todo.RK and key != MAIL_ERINNERUNG:
        raise ValueError("Unbekannte Benachrichtigung")
    R = rollen(c)
    alt = R.get(key)
    if liste is None:
        R.pop(key, None)
    else:
        bekannt = {r["key"] for r in c.execute("SELECT key FROM rollen").fetchall()}
        R[key] = [r for r in dict.fromkeys(str(x) for x in liste) if r in bekannt]
    konto._put(c, "meldungen:rollen", json.dumps(R), wer)
    return alt


def _rolle(c, uid):
    r = c.execute("SELECT rolle FROM users WHERE id=?", (uid,)).fetchone()
    return (r["rolle"] or "") if r else ""


def rolle_erlaubt(c, key, uid, R=None, rolle=None):
    """None = keine Vorgabe je Rolle, sonst True/False für die Rolle der Person."""
    R = rollen(c) if R is None else R
    if key not in R:
        return None
    return (rolle if rolle is not None else _rolle(c, uid)) in R[key]


def _aus(c, uid):
    return _j(konto._get(c, f"meldungen:aus:{int(uid)}"), {}) or {}


def mail_an(c, uid):
    """Bekommt die Person Erinnerungen per Mail? Eigene Wahl vor Vorgabe der Rolle, sonst ja (wie bisher)."""
    eigen = _aus(c, uid).get(MAIL_ERINNERUNG)
    if isinstance(eigen, bool):
        return eigen
    r = rolle_erlaubt(c, MAIL_ERINNERUNG, uid)
    return True if r is None else r


def _mail_setzen(c, uid, an, wer=""):
    d = _aus(c, uid)
    alt = d.get(MAIL_ERINNERUNG)
    if an is None:
        d.pop(MAIL_ERINNERUNG, None)
    else:
        d[MAIL_ERINNERUNG] = bool(an)
    konto._put(c, f"meldungen:aus:{int(uid)}", json.dumps(d), wer)
    return alt


# ---------------------------------------------------------------- Liste
def _namen(c):
    return {r["id"]: r["name"] for r in c.execute("SELECT id, name FROM users").fetchall()}


ART_BT = {"maengel": "Mangel", "weisungen": "Weisung", "zu_erledigen": "Zu erledigen"}


def liste(c, u, alle=False, person=None, rolle=None):
    """Alles, was gerade aktiv (oder ausgeschaltet) ist – für mich oder (mit Recht) für alle, wahlweise einer Person oder Rolle."""
    if alle and not darf_alle(u):
        raise PermissionError("Für alle nur mit dem Recht „Benachrichtigungen aller“.")
    N = _namen(c)
    U = c.execute("SELECT id, name, rolle, active FROM users").fetchall()
    if not alle:
        wer = {u["id"]}
    elif person:
        wer = {int(person)}
    elif rolle:
        wer = {x["id"] for x in U if x["rolle"] == rolle}
    else:
        wer = None   # alle
    login = {x["id"]: (x["name"] or "").lower() for x in U}
    P = {r["id"]: r["name"] for r in c.execute("SELECT id, name FROM projects").fetchall()}
    heute = date.today().isoformat()
    out = {"erinnerung": [], "hinweis": [], "kalender": [], "mail": []}

    def betrifft(ids, von=""):
        return wer is None or bool(set(ids) & wer) or any(login.get(i) == (von or "").lower() and von for i in wer)

    for r in c.execute("SELECT * FROM erinnerungen WHERE status IN ('offen','aus') ORDER BY termin, id").fetchall():
        ids = [int(x) for x in _j(r["empfaenger"], []) if str(x).lstrip("-").isdigit()]
        if not betrifft(ids, r["erstellt_von"]):
            continue
        datum = r["ereignis"] if r["quelle"] == "plan" and r["ereignis"] else r["termin"]
        out["erinnerung"].append({"id": f"r{r['id']}", "titel": r["titel"], "projekt": P.get(r["project_id"], ""), "pid": r["project_id"],
                                  "fuer": [N.get(i, "?") for i in ids], "datum": datum, "uhrzeit": r["uhrzeit"], "woher": {"plan": "Bauzeitenplan", "eigen": "eigene", "mail": "Mail"}.get(r["quelle"], r["quelle"]),
                                  "aktiv": r["status"] == "offen", "loeschbar": r["quelle"] != "plan", "gesendet": r["gesendet"]})
    for x in c.execute("""SELECT i.id, i.kind, i.text, i.due, i.due_time, i.reminded, i.remind_user, r.project_id AS pid
                          FROM items i JOIN reports r ON r.id=i.report_id
                          WHERE i.due!='' AND i.done=0 ORDER BY i.due""").fetchall():
        if not betrifft([x["remind_user"]] if x["remind_user"] else []):
            continue
        t = (x["text"] or "").strip().splitlines()[0][:140] if (x["text"] or "").strip() else ""
        out["erinnerung"].append({"id": f"b{x['id']}", "titel": f"{ART_BT.get(x['kind'], 'Eintrag')}: {t}", "projekt": P.get(x["pid"], ""), "pid": x["pid"],
                                  "fuer": [N.get(x["remind_user"], "?")] if x["remind_user"] else [], "datum": x["due"], "uhrzeit": x["due_time"] or "09:00",
                                  "woher": "Bautagebuch", "aktiv": x["reminded"] != "aus", "loeschbar": True, "gesendet": "" if x["reminded"] == "aus" else x["reminded"]})

    R = rollen(c)
    if alle and wer is None:
        for k, x in todo.regeln(c).items():
            out["hinweis"].append({"id": f"h{k}", "titel": x["name"], "text": x["text"], "aktiv": x["an"], "wert": x["wert"], "einheit": x["einheit"],
                                   "rollen": R.get(k), "fuer": "alle" if x["fuer"] == "alle" else [N.get(i, "?") for i in x["fuer"]], "woher": "Büro"})
    else:
        for uid in sorted(wer):
            rol = next((y["rolle"] for y in U if y["id"] == uid), "")
            E = todo.eigene(c, uid)
            for k, x in todo.regeln_fuer(c, uid).items():
                r_ok = rolle_erlaubt(c, k, uid, R, rol)
                gilt = x["an"] and (x["fuer"] == "alle" or uid in x["fuer"]) and (r_ok is not False or E.get(k, {}).get("an") is True)
                out["hinweis"].append({"id": f"h{k}" + (f":{uid}" if alle else ""), "titel": x["name"] + (f" – {N.get(uid, '?')}" if alle else ""), "text": x["text"],
                                       "aktiv": bool(gilt), "wert": x["wert"], "einheit": x["einheit"], "eigen": "an" in E.get(k, {}),
                                       "woher": "eigene Wahl" if "an" in E.get(k, {}) else "Rolle" if r_ok is not None else "Büro"})

    for r in c.execute("SELECT key, data, updated_by FROM bp_store WHERE key LIKE 'ical:termin:%'").fetchall():
        d = _j(r["data"], {})
        if (d.get("termin") or "") < heute:
            continue
        ids = [int(i) for i in d.get("empf") or [] if str(i).isdigit()]
        if not betrifft(ids, r["updated_by"]):
            continue
        out["kalender"].append({"id": "k" + r["key"][len("ical:termin:"):], "titel": d.get("titel") or "Termin (vor dem 17.11.2026 gesendet)", "datum": d.get("termin"),
                                "uhrzeit": d.get("uhrzeit") or "", "projekt": P.get(d.get("pid"), ""), "pid": d.get("pid"), "fuer": [N.get(i, "?") for i in ids],
                                "woher": "Kalendereinladung", "aktiv": True, "loeschbar": True})

    for uid in (sorted(wer) if wer is not None else [x["id"] for x in U if x["active"]]):
        out["mail"].append({"id": f"m{MAIL_ERINNERUNG}:{uid}", "titel": "Erinnerungen per Mail", "fuer": [N.get(uid, "?")], "datum": "am Erinnerungstag",
                            "woher": "eigene Wahl" if isinstance(_aus(c, uid).get(MAIL_ERINNERUNG), bool) else "Rolle" if rolle_erlaubt(c, MAIL_ERINNERUNG, uid, R) is not None else "Vorgabe",
                            "aktiv": mail_an(c, uid), "projekt": ""})
    if alle:
        from . import bauherren_kopf
        for r in c.execute("SELECT key FROM bp_store WHERE key LIKE 'bauherren:kopf:%'").fetchall():
            pid = int(r["key"].rsplit(":", 1)[1])
            if bauherren_kopf.kopf(c, pid)["mail"] == "woche":
                out["mail"].append({"id": f"mwoche:{pid}", "titel": "Wochenmail an die Bauherrschaft (montags)", "fuer": ["Bauherr:innen"], "datum": "montags",
                                    "woher": "Bauherrenportal", "aktiv": True, "projekt": P.get(pid, ""), "pid": pid})
    for k in out:
        for x in out[k]:
            x["art"] = k
    return out


# ---------------------------------------------------------------- Ändern
def _meins(c, u, art, id_):
    """Darf u diesen Eintrag ohne „für alle“ ändern? (er ist für u bestimmt oder von u angelegt)"""
    if art == "r":
        r = c.execute("SELECT empfaenger, erstellt_von FROM erinnerungen WHERE id=?", (int(id_),)).fetchone()
        return bool(r) and (u["id"] in [int(x) for x in _j(r["empfaenger"], []) if str(x).isdigit()] or (r["erstellt_von"] or "").lower() == (u["name"] or "").lower())
    if art == "b":
        r = c.execute("SELECT remind_user FROM items WHERE id=?", (int(id_),)).fetchone()
        return bool(r) and r["remind_user"] == u["id"]
    if art == "k":
        r = c.execute("SELECT data, updated_by FROM bp_store WHERE key=?", (f"ical:termin:{id_}",)).fetchone()
        return bool(r) and (u["id"] in (_j(r["data"], {}).get("empf") or []) or (r["updated_by"] or "").lower() == (u["name"] or "").lower())
    return False


def aendern(c, u, id_, was, alle=False):
    """was: aus | an | loeschen (Erinnerung, Kalender), aus | an | standard (Hinweis, Mail). Gibt {zurueck: {id, was, …}, hinweis} zurück."""
    from . import erinnern, papierkorb
    art, rest = id_[:1], id_[1:]
    if alle and not darf_alle(u):
        raise PermissionError("Nur mit dem Recht „Benachrichtigungen aller“.")
    if art in ("r", "b", "k") and not alle and not _meins(c, u, art, rest):
        raise PermissionError("Das ist nicht deine Benachrichtigung – „Für alle“ braucht das Recht „Benachrichtigungen aller“.")
    if art == "r":
        r = c.execute("SELECT * FROM erinnerungen WHERE id=?", (int(rest),)).fetchone()
        if not r:
            raise ValueError("Die Erinnerung gibt es nicht mehr.")
        if was in ("aus", "an"):
            c.execute("UPDATE erinnerungen SET status=? WHERE id=?", ("aus" if was == "aus" else "offen", r["id"]))
            return {"zurueck": {"id": id_, "was": "an" if r["status"] == "offen" else "aus"}}
        if was == "loeschen":
            if r["quelle"] == "plan":   # entsteht aus dem Bauzeitenplan neu – ausschalten bleibt
                c.execute("UPDATE erinnerungen SET status='aus' WHERE id=?", (r["id"],))
                return {"zurueck": {"id": id_, "was": "an" if r["status"] == "offen" else "aus"}, "hinweis": "Aus dem Bauzeitenplan – ausgeschaltet statt gelöscht."}
            p = c.execute("SELECT name FROM projects WHERE id=?", (r["project_id"],)).fetchone() if r["project_id"] else None
            pk = papierkorb.ablegen(c, "erinnerungen", r["id"], "Erinnerung", r["titel"] or "Erinnerung", u["name"], p["name"] if p else "", "aufgaben")
            return {"zurueck": {"id": id_, "was": "papierkorb", "pk": pk}}
    elif art == "b":
        x = c.execute("SELECT id, due, reminded FROM items WHERE id=?", (int(rest),)).fetchone()
        if not x:
            raise ValueError("Den Eintrag gibt es nicht mehr.")
        if was in ("aus", "an"):
            if (x["reminded"] == "aus") != (was == "aus"):
                c.execute("UPDATE items SET reminded=? WHERE id=?", ("aus" if was == "aus" else "", x["id"]))
            return {"zurueck": {"id": id_, "was": "setzen", "reminded": x["reminded"]}}
        if was == "loeschen":   # Erinnerung am Eintrag weg (Datum), der Eintrag selbst bleibt im Bautagebuch
            c.execute("UPDATE items SET due='' WHERE id=?", (x["id"],))
            return {"zurueck": {"id": id_, "was": "setzen", "due": x["due"]}, "hinweis": "Das Datum am Eintrag im Bautagebuch ist entfernt – der Eintrag bleibt."}
        if was == "setzen":
            raise ValueError("Bitte über Rückgängig.")
    elif art == "k":
        if was == "loeschen":
            n, fehl, d = erinnern.termine_absagen(c, rest, u["name"])
            if d is None:
                raise ValueError(fehl)
            return {"zurueck": {"id": id_, "was": "neu_senden", "d": d}, "hinweis": (f"Abgesagt bei {n} Person{'en' if n != 1 else ''}." if n else "") + (" " + fehl if fehl else "")}
    elif art == "h":
        k, _, uid = rest.partition(":")
        if k not in todo.RK:
            raise ValueError("Unbekannte Regel")
        uid = int(uid) if uid.isdigit() else (None if alle else u["id"])
        if uid is not None and uid != u["id"] and not darf_alle(u):
            raise PermissionError("Nur mit dem Recht „Benachrichtigungen aller“.")
        if uid is None:   # Büro-Regel
            alt = todo.regeln(c)[k]["an"]
            todo.regeln_setzen(c, {k: {"an": was == "an"}}, u["name"])
            return {"zurueck": {"id": id_, "was": "an" if alt else "aus"}}
        alt = todo.eigene(c, uid).get(k, {}).get("an")
        todo.eigene_setzen(c, uid, {k: None if was == "standard" else {"an": was == "an"}}, u["name"])
        return {"zurueck": {"id": id_, "was": "standard" if alt is None else "an" if alt else "aus"}}
    elif art == "m":
        if rest.startswith(MAIL_ERINNERUNG + ":"):
            uid = int(rest.split(":", 1)[1])
            if uid != u["id"] and not darf_alle(u):
                raise PermissionError("Nur mit dem Recht „Benachrichtigungen aller“.")
            alt = _mail_setzen(c, uid, None if was == "standard" else was == "an", u["name"])
            return {"zurueck": {"id": id_, "was": "standard" if alt is None else "an" if alt else "aus"}}
        if rest.startswith("woche:"):
            if not darf_alle(u):
                raise PermissionError("Nur mit dem Recht „Benachrichtigungen aller“.")
            from . import bauherren_kopf
            pid = int(rest.split(":", 1)[1])
            alt = bauherren_kopf.kopf(c, pid)["mail"]
            bauherren_kopf.kopf_setzen(c, pid, {"mail": "woche" if was == "an" else "aus"})
            return {"zurueck": {"id": id_, "was": "an" if alt == "woche" else "aus"}}
    raise ValueError("Das geht hier nicht.")


def zurueck(c, u, z, alle=False):
    """Umkehrung einer Änderung (aus aendern() → zurueck)."""
    from . import erinnern, papierkorb
    if z.get("was") == "papierkorb":
        if not z.get("pk"):
            raise ValueError("Nicht mehr im Papierkorb.")
        papierkorb.wiederherstellen(c, int(z["pk"]))
        return {}
    if z.get("was") == "setzen" and str(z.get("id", "")).startswith("b"):
        if not alle and not _meins(c, u, "b", z["id"][1:]):
            raise PermissionError("Nicht deine Benachrichtigung.")
        for k in ("due", "reminded"):
            if k in z:
                c.execute(f"UPDATE items SET {k}=? WHERE id=?", (str(z[k] or ""), int(z["id"][1:])))
        return {}
    if z.get("was") == "neu_senden":
        d = z.get("d") or {}
        if not alle and u["id"] not in (d.get("empf") or []):
            raise PermissionError("Nicht deine Benachrichtigung.")
        erinnern.termine_senden(c, str(z["id"])[1:], d.get("termin"), d.get("uhrzeit"), d.get("titel") or "Termin", d.get("text") or "", d.get("pid"),
                                [int(i) for i in d.get("empf") or []], u["name"])
        return {}
    return aendern(c, u, z["id"], z["was"], alle)


# ---------------------------------------------------------------- Routen
def routen(bp, user):
    from flask import jsonify, request
    from . import db, mailaus
    mailaus.routen(bp, user)   # EIN Haken: alle Benachrichtigungs-Mails aus (20.11.2026)

    def fehler(e):
        return jsonify(error=str(e)), 403 if isinstance(e, PermissionError) else 400

    @bp.get("/api/bp/meldungen")
    def ml_liste():
        u = user()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        try:
            with db.tx() as c:
                alle = request.args.get("alle") == "1"
                L = liste(c, u, alle, request.args.get("person", type=int), request.args.get("rolle") or None)
                rol = [{"key": r["key"], "name": r["name"]} for r in c.execute("SELECT key, name FROM rollen ORDER BY sort, name").fetchall()] if darf_alle(u) else []
                pers = [{"id": r["id"], "name": r["name"]} for r in c.execute("SELECT id, name FROM users WHERE active=1 ORDER BY name").fetchall()] if darf_alle(u) else []
                return jsonify(listen=L, darf_alle=darf_alle(u), rollen=rol, personen=pers, matrix=rollen(c) if darf_alle(u) else {}, mailaus=mailaus.stand(c, u),
                               regeln=[{"key": k, "name": n} for k, n, *_ in todo.REGELN] + [{"key": MAIL_ERINNERUNG, "name": "Erinnerungen per Mail"}])
        except (PermissionError, ValueError) as e:
            return fehler(e)

    @bp.post("/api/bp/meldungen")
    def ml_aendern():
        u = user()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        b = request.get_json(silent=True) or {}
        alle = bool(b.get("alle"))
        try:
            with db.tx() as c:
                if b.get("zurueck"):
                    r = zurueck(c, u, b["zurueck"], alle)
                elif b.get("rollen_fuer"):
                    if not darf_alle(u):
                        raise PermissionError("Nur mit dem Recht „Benachrichtigungen aller“.")
                    alt = rollen_setzen(c, b["rollen_fuer"], b.get("rollen"), u["name"])
                    r = {"zurueck": {"rollen_fuer": b["rollen_fuer"], "rollen": alt}}
                else:
                    ids = [str(i) for i in (b.get("ids") or [b.get("id")]) if i][:200]
                    Z, H = [], []
                    for i in ids:
                        x = aendern(c, u, i, str(b.get("was") or ""), alle)
                        Z.append(x.get("zurueck"))
                        if x.get("hinweis"):
                            H.append(x["hinweis"])
                    r = {"zurueck": Z, "hinweis": " ".join(dict.fromkeys(H))}
            try:
                from datetime import datetime
                with db.tx() as c:
                    c.execute("INSERT INTO audit_log(ts, user_name, cat, action, detail) VALUES(?,?,?,?,?)",
                              (datetime.now().isoformat(timespec="seconds").replace("T", " "), u["name"], "inhalt", "Benachrichtigungen",
                               f"{b.get('was') or ('Rollen' if b.get('rollen_fuer') else 'Rückgängig')}: {', '.join(map(str, b.get('ids') or [b.get('id') or b.get('rollen_fuer') or '']))}"[:200]))
            except Exception:   # noqa: BLE001 – das Protokoll darf die Änderung nicht verhindern
                pass
            return jsonify(ok=True, **r)
        except (PermissionError, ValueError) as e:
            return fehler(e)
