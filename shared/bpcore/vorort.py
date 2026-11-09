"""Vor Ort erkennen: Das iPhone meldet über einen Kurzbefehl (Automation „CarPlay getrennt“ oder zu festen Zeiten) den
Standort. Liegt er in der Arbeitszeit nahe einer Baustelle, merkt sich die Plattform nur „vor Ort: Projekt, Tag, von–bis“ –
die Koordinaten selbst werden nicht gespeichert. Fehlt für so einen Tag der Tagesbericht, kommt ein To-do und (einstellbar)
am Ende der Arbeitszeit eine Mail.

bp_store:  vorort:<uid>         Einstellungen {an, von, bis, tage, radius, mail}
           vorort:key:<uid>     persönlicher Schlüssel (Teil der Adresse im Kurzbefehl)
           vorort:k:<schlüssel> → uid
           vorort:log:<uid>     {"JJJJ-MM-TT": {"<pid>": ["HH:MM", "HH:MM"]}} (erste/letzte Meldung), 60 Tage
           vorort:mail:<uid>    Tag, an dem zuletzt erinnert wurde
"""
import json, math, secrets
from datetime import date, datetime, timedelta

from . import konto

STANDARD = {"an": True, "von": "07:00", "bis": "18:00", "tage": [0, 1, 2, 3, 4], "radius": 250, "mail": True, "bericht": True}


def _j(v, d):
    try:
        return json.loads(v) if v else d
    except ValueError:
        return d


def einst(c, uid):
    d = _j(konto._get(c, f"vorort:{uid}"), {}) or {}
    e = {**STANDARD, **{k: d[k] for k in STANDARD if k in d}}
    return e


def einst_setzen(c, uid, b, wer=""):
    e = einst(c, uid)
    if "an" in b:
        e["an"] = bool(b["an"])
    for k in ("von", "bis"):
        v = str(b.get(k) or "")
        if len(v) == 5 and v[2] == ":" and v.replace(":", "").isdigit():
            e[k] = v
    if isinstance(b.get("tage"), list):
        e["tage"] = sorted({int(x) for x in b["tage"] if str(x).isdigit() and 0 <= int(x) <= 6})
    if isinstance(b.get("radius"), (int, float)):
        e["radius"] = max(50, min(2000, int(b["radius"])))
    for k in ("mail", "bericht"):
        if k in b:
            e[k] = bool(b[k])
    konto._put(c, f"vorort:{uid}", json.dumps(e), wer)
    return e


def schluessel(c, uid, neu=False):
    k = konto._get(c, f"vorort:key:{uid}")
    if k and not neu:
        return k
    if k:
        c.execute("DELETE FROM bp_store WHERE key=?", (f"vorort:k:{k}",))
    k = secrets.token_urlsafe(18)
    konto._put(c, f"vorort:key:{uid}", k, "vorort")
    konto._put(c, f"vorort:k:{k}", str(uid), "vorort")
    return k


def _abstand(lat1, lon1, lat2, lon2):
    r = math.pi / 180
    a = math.sin((lat2 - lat1) * r / 2) ** 2 + math.cos(lat1 * r) * math.cos(lat2 * r) * math.sin((lon2 - lon1) * r / 2) ** 2
    return 6371000 * 2 * math.asin(math.sqrt(a))


# ---------------------------------------------------------------- Fahrten über CarPlay: „verbindet“ = Einsteigen, „trennt“ = Aussteigen
FAHRT_TEXT = {"hin": "zur Baustelle", "zurueck": "zurück ins Büro", "andere": "Fahrt"}
TOLERANZ = 60   # Minuten vor bzw. nach der Arbeitszeit zählen Fahrten noch mit


def buero(c):
    """Lage des Büros aus der Büroadresse (einmal über OpenStreetMap ermittelt und gemerkt)."""
    S = {r["key"]: r["value"] or "" for r in c.execute("SELECT key, value FROM settings WHERE key IN ('co_street','co_zip','co_city','co_lat','co_lon','co_geo_adr')").fetchall()}
    adr = "|".join((S.get("co_street", ""), S.get("co_zip", ""), S.get("co_city", "")))
    if S.get("co_lat") and S.get("co_geo_adr") == adr:
        try:
            return float(S["co_lat"]), float(S["co_lon"])
        except ValueError:
            pass
    if not (S.get("co_street") or S.get("co_city")):
        return None
    try:
        from . import kataster
        hit = kataster.adresse_suchen(S.get("co_street", ""), S.get("co_zip", ""), S.get("co_city", ""))
    except Exception:   # noqa: BLE001 – ohne Internet: Büro unbekannt, Fahrt wird „andere“
        return None
    if hit:
        for k, v in (("co_lat", str(hit[0])), ("co_lon", str(hit[1])), ("co_geo_adr", adr)):
            c.execute("INSERT INTO settings(key, value) VALUES(?,?) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", (k, v))
    return hit


def _naechste_baustelle(c, lat, lon, radius):
    best = None
    for p in c.execute("SELECT id, name, lat, lon FROM projects WHERE archived=0 AND lat IS NOT NULL AND lon IS NOT NULL").fetchall():
        try:
            d = _abstand(lat, lon, float(p["lat"]), float(p["lon"]))
        except (TypeError, ValueError):
            continue
        if d <= radius and (not best or d < best[0]):
            best = (d, p)
    return best[1] if best else None


def _hm(m):
    return f"{int(m) // 60:02d}:{int(m) % 60:02d}"


def _min(hm):
    return int(hm[:2]) * 60 + int(hm[3:5])


def fahrt_ein(c, uid, lat, lon, e, jetzt):
    """CarPlay verbindet: Fahrt starten (läuft wie die Stoppuhr auf dem Server). Eine laufende Stoppuhr (z. B. „vor Ort“) wird beendet und eingetragen."""
    r = c.execute("SELECT * FROM zeit_lauf WHERE user_id=?", (uid,)).fetchone()
    if r and r["fahrt"]:
        return f"Fahrt läuft schon seit {r['start'][11:16]}."
    tag, hm = jetzt.date().isoformat(), jetzt.strftime("%H:%M")
    if r:   # andere Zeit läuft (z. B. vor Ort): bis jetzt eintragen
        if r["start"][:10] == tag and _min(hm) > _min(r["start"][11:16]):
            c.execute("INSERT INTO zeit_eintrag(user_id, tag, von, bis, project_id, art, notiz, quelle) VALUES(?,?,?,?,?,?,?,?)",
                      (uid, tag, r["start"][11:16], hm, r["project_id"], r["art"], r["notiz"], "stoppuhr"))
        c.execute("DELETE FROM zeit_lauf WHERE user_id=?", (uid,))
    ab = _naechste_baustelle(c, lat, lon, e["radius"])   # Start an einer Baustelle: wahrscheinlich die Rückfahrt
    F = {"richtung": "", "auto": True, "ab": {"lat": round(lat, 4), "lng": round(lon, 4), "acc": 0}}
    c.execute("INSERT INTO zeit_lauf(user_id, start, project_id, art, notiz, fahrt) VALUES(?,?,?,?,?,?)",
              (uid, jetzt.strftime("%Y-%m-%d %H:%M"), ab["id"] if ab else None, "fahrt", "", json.dumps(F)))
    return f"🚗 Fahrt gestartet {hm}" + (f" (ab {ab['name']})" if ab else "")


def fahrt_aus(c, uid, lat, lon, e, jetzt):
    """CarPlay trennt: laufende Fahrt beenden und eintragen – Richtung und Projekt aus dem Ziel (Baustelle / Büro). None, wenn keine Fahrt lief."""
    r = c.execute("SELECT * FROM zeit_lauf WHERE user_id=?", (uid,)).fetchone()
    if not r or not r["fahrt"]:
        return None
    F = _j(r["fahrt"], {}) or {}
    c.execute("DELETE FROM zeit_lauf WHERE user_id=?", (uid,))
    t, v = r["start"][:10], r["start"][11:16]
    bis = jetzt.strftime("%H:%M") if jetzt.date().isoformat() == t else "23:59"
    if _min(bis) - _min(v) < 2:   # nur kurz verbunden (Motor an/aus, Parkplatz)
        return None
    F["an"] = {"lat": round(lat, 4), "lng": round(lon, 4), "acc": 0}
    a_ = F.get("ab") or {}
    if a_.get("lat") is not None:
        F["km"] = round(_abstand(a_["lat"], a_["lng"], lat, lon) / 1000, 1)
    pid = r["project_id"]
    if not F.get("richtung"):   # automatisch: Ziel entscheidet
        ziel = _naechste_baustelle(c, lat, lon, e["radius"])
        b = buero(c)
        am_buero = bool(b) and _abstand(lat, lon, b[0], b[1]) <= max(e["radius"], 300)
        if ziel:
            F["richtung"], pid = "hin", ziel["id"]
        elif am_buero:
            F["richtung"] = "zurueck"
            if not pid:   # Projekt der letzten Baustelle heute
                log = (_j(konto._get(c, f"vorort:log:{uid}"), {}) or {}).get(t) or {}
                letzte = sorted(((z[-1], k) for k, z in log.items() if k.isdigit() and isinstance(z, list)), reverse=True)
                pid = int(letzte[0][1]) if letzte else None
        else:
            F["richtung"] = "andere"
    c.execute("INSERT INTO zeit_eintrag(user_id, tag, von, bis, project_id, art, notiz, quelle, fahrt) VALUES(?,?,?,?,?,?,?,?,?)",
              (uid, t, v, bis, pid, "fahrt", FAHRT_TEXT.get(F["richtung"], "Fahrt"), "unterwegs", json.dumps(F)))
    pn = c.execute("SELECT name FROM projects WHERE id=?", (pid,)).fetchone() if pid else None
    return f"🚗 Fahrt {v}–{bis} {FAHRT_TEXT.get(F['richtung'], 'Fahrt')}" + (f" · {pn['name']}" if pn else "")


def melden(c, key, lat, lon, jetzt=None, ereignis=None):
    """Meldung vom Kurzbefehl. Gibt (Status-Code, Text für die Mitteilung auf dem iPhone) zurück.
    ereignis: „ein“ (CarPlay verbindet) startet eine Fahrt; sonst (CarPlay trennt, Tageszeit) endet eine laufende Fahrt hier."""
    uid = konto._get(c, f"vorort:k:{key}") if key else None
    if not uid or not str(uid).isdigit():
        return 403, "Unbekannter Schlüssel – bitte den Kurzbefehl neu einrichten (⚙ → Für mich → Vor Ort erkennen)."
    uid = int(uid)
    u = c.execute("SELECT id, active FROM users WHERE id=?", (uid,)).fetchone()
    if not u or not u["active"]:
        return 403, "Konto nicht aktiv."
    e = einst(c, uid)
    jetzt = jetzt or datetime.now()
    hm = jetzt.strftime("%H:%M")
    if not e["an"]:
        return 200, "Vor-Ort-Erkennung ist ausgeschaltet."
    try:
        lat, lon = float(str(lat).replace(",", ".")), float(str(lon).replace(",", "."))
    except (TypeError, ValueError):
        return 400, "Kein Standort übermittelt."
    fahrt = None
    try:
        im_fenster = jetzt.weekday() in e["tage"] and _min(e["von"]) - TOLERANZ <= _min(hm) <= _min(e["bis"]) + TOLERANZ
        if ereignis == "ein":
            return 200, fahrt_ein(c, uid, lat, lon, e, jetzt) if im_fenster else "Außerhalb der Arbeitszeit – keine Fahrt erfasst."
        fahrt = fahrt_aus(c, uid, lat, lon, e, jetzt)   # läuft eine Fahrt, endet sie hier (auch kurz nach Feierabend)
    except Exception as ex:   # noqa: BLE001 – Zeiterfassung noch nicht eingerichtet (alte Datenbank): Vor-Ort wie bisher
        import logging
        logging.getLogger("vorort").warning("Fahrt nicht erfasst: %s", ex)
    vor = (fahrt + "\n") if fahrt else ""
    if jetzt.weekday() not in e["tage"] or not (e["von"] <= hm <= e["bis"]):
        return 200, vor + "Außerhalb der Arbeitszeit – nichts gespeichert."
    p = _naechste_baustelle(c, lat, lon, e["radius"])
    if not p:
        return 200, fahrt or "Keine Baustelle in der Nähe."
    log = _j(konto._get(c, f"vorort:log:{uid}"), {}) or {}
    tag = jetzt.date().isoformat()
    z = log.setdefault(tag, {}).setdefault(str(p["id"]), [hm, hm])
    z[0], z[1] = min(z[0], hm), max(z[1], hm)
    grenze = (jetzt.date() - timedelta(days=60)).isoformat()
    log = {k: v for k, v in log.items() if k >= grenze}
    konto._put(c, f"vorort:log:{uid}", json.dumps(log), "vorort")
    hat = c.execute("SELECT 1 FROM reports WHERE project_id=? AND date=?", (p["id"], tag)).fetchone()
    auto = log[tag].setdefault("_auto", [])   # je Projekt und Tag höchstens einmal anlegen – auch wenn er wieder gelöscht wurde
    if not hat and e.get("bericht") and str(p["id"]) not in auto:
        try:
            nr = _bericht_anlegen(c, uid, p, tag, hm)
            auto.append(str(p["id"]))
            konto._put(c, f"vorort:log:{uid}", json.dumps(log), "vorort")
            return 200, vor + f"Vor Ort: {p['name']} – Tagesbericht Nr. {nr} angelegt (Wetter, Anwesende laut Bauzeitenplan). Bitte heute ergänzen."
        except Exception as ex:   # Bericht nicht anlegbar: Meldung trotzdem merken, Erinnerung kommt wie bisher
            import logging
            logging.getLogger("vorort").warning("Tagesbericht nicht automatisch angelegt: %s", ex)
    return 200, vor + f"Vor Ort: {p['name']}" + ("" if hat else " – Tagesbericht nicht vergessen")


_WX = {0: ("Heiter", "trocken"), 1: ("Heiter", "trocken"), 2: ("Wolkig", "trocken"), 3: ("Bedeckt", "trocken"), 45: ("Nebel", "trocken"), 48: ("Nebel", "trocken")}


def _wetter(lat, lon):
    """Aktuelles Wetter an der Baustelle (Open-Meteo) in den Feldern des Tagesberichts; {} wenn nicht erreichbar."""
    import urllib.parse, urllib.request
    try:
        u = "https://api.open-meteo.com/v1/forecast?" + urllib.parse.urlencode({"latitude": lat, "longitude": lon, "wind_speed_unit": "kmh", "timezone": "auto",
                                                                                  "current": "temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code"})
        with urllib.request.urlopen(u, timeout=6) as r:
            w = json.loads(r.read())["current"]
    except Exception:   # Wetter nur Beiwerk (ohne Internet leer)
        return {}
    code = w.get("weather_code")
    if code in _WX:
        wx, pr = _WX[code]
    elif code in (51, 53, 55, 56, 57, 61, 80):
        wx, pr = "Bedeckt", "leichter Regen"
    elif code in (63, 66, 67, 81):
        wx, pr = "Bedeckt", "Regen"
    elif code in (65, 82):
        wx, pr = "Bedeckt", "Starkregen"
    elif code in (71, 73, 75, 77, 85, 86):
        wx, pr = "Bedeckt", "Schnee"
    elif code in (95, 96, 99):
        wx, pr = "Gewitter", "Regen"
    else:
        wx, pr = "", ""
    n = lambda v: "" if v is None else (str(int(round(v))) if abs(v) >= 10 else str(round(v, 1)))
    return {"weather": wx, "precip": pr, "temp": n(w.get("temperature_2m")), "humidity": n(w.get("relative_humidity_2m")), "wind": n(w.get("wind_speed_10m"))}


def _bericht_anlegen(c, uid, p, tag, hm):
    """Tagesbericht wie in der App angelegt: nächste Nummer, Datum, Ankunftszeit (Viertelstunde), Bauleitung = der Gemeldete,
    PLZ/Ort, Wetter an der Baustelle. Die Anwesenden laut Bauzeitenplan erscheinen beim Öffnen als Vorschläge zum Bestätigen."""
    u = c.execute("SELECT name FROM users WHERE id=?", (uid,)).fetchone()
    pr = c.execute("SELECT * FROM projects WHERE id=?", (p["id"],)).fetchone()
    n = c.execute("SELECT COALESCE(MAX(number),0)+1 FROM reports WHERE project_id=?", (p["id"],)).fetchone()[0]
    last = c.execute("SELECT site_manager, plz FROM reports WHERE project_id=? ORDER BY date DESC, number DESC LIMIT 1", (p["id"],)).fetchone()
    h, m = hm.split(":")
    zeit = f"{h}:{int(m) // 15 * 15:02d}"
    keys = pr.keys() if hasattr(pr, "keys") else []
    g = lambda k: (pr[k] if k in keys else None) or ""
    ort = ", ".join(x for x in (g("street"), g("city")) if x)
    d = {"project_id": p["id"], "number": n, "date": tag, "time": zeit, "site_manager": (u["name"] if u else "") or (last["site_manager"] if last else ""),
         "plz": g("zip") or (last["plz"] if last else "") or "", "extra": json.dumps({**({"place": ort} if ort else {}), "wx_auto": 1, "auto": "vorort", "ankunft": hm}),
         "created": datetime.now().isoformat(timespec="seconds"), "updated": datetime.now().isoformat(timespec="seconds"),
         **_wetter(float(p["lat"]), float(p["lon"]))}
    c.execute(f"INSERT INTO reports({', '.join(d)}) VALUES({', '.join('?' * len(d))})", tuple(d.values()))
    return n


def _fertig(c, pid, tag):
    """(gibt es einen Bericht, ist er fertig): ein automatisch angelegter Bericht gilt erst als fertig, wenn er als PDF erstellt wurde."""
    r = c.execute("SELECT id, extra FROM reports WHERE project_id=? AND date=? ORDER BY id", (pid, tag)).fetchall()
    if not r:
        return False, False
    for x in r:
        ex = _j(x["extra"], {}) if isinstance(x["extra"], str) else (x["extra"] or {})
        if not (isinstance(ex, dict) and ex.get("auto")):
            return True, True
        try:
            if c.execute("SELECT 1 FROM report_versions WHERE report_id=? AND reason='export'", (x["id"],)).fetchone():
                return True, True
        except Exception:   # im Zweifel als fertig werten – lieber keine Erinnerung als eine falsche
            return True, True
    return True, False


def besuche(c, uid, tage=14):
    """[{datum, pid, projekt, von, bis, bericht}] der letzten Tage, neueste zuerst."""
    log = _j(konto._get(c, f"vorort:log:{uid}"), {}) or {}
    grenze = (date.today() - timedelta(days=tage)).isoformat()
    namen = {r["id"]: r["name"] for r in c.execute("SELECT id, name FROM projects").fetchall()}
    out = []
    for tag in sorted(log, reverse=True):
        if tag < grenze:
            continue
        for pid, z in log[tag].items():
            if not pid.isdigit():
                continue
            von, bis = z
            pid = int(pid)
            hat, fertig = _fertig(c, pid, tag)
            out.append({"datum": tag, "pid": pid, "projekt": namen.get(pid, f"Projekt {pid}"), "von": von, "bis": bis, "bericht": fertig, "angelegt": hat and not fertig})
    return out


def ohne_bericht(c, uid, tage=7):
    return [b for b in besuche(c, uid, tage) if not b["bericht"] and b["datum"] <= date.today().isoformat()]


def abend_mails(c, jetzt=None):
    """Am Ende der Arbeitszeit: wer heute vor Ort war und keinen Tagesbericht hat, bekommt eine Mail (einmal am Tag)."""
    from . import mail, platform
    jetzt = jetzt or datetime.now()
    heute, hm = jetzt.date().isoformat(), jetzt.strftime("%H:%M")
    cf = mail.conf(c)
    if not mail.configured(cf):
        return 0
    n = 0
    for r in c.execute("SELECT key FROM bp_store WHERE key LIKE 'vorort:log:%'").fetchall():
        uid = r["key"].split(":")[-1]
        if not uid.isdigit():
            continue
        uid = int(uid)
        e = einst(c, uid)
        if not e["an"] or not e["mail"] or hm < e["bis"] or konto._get(c, f"vorort:mail:{uid}") == heute:
            continue
        fehlt = [b for b in besuche(c, uid, 0) if b["datum"] == heute and not b["bericht"]]
        u = c.execute("SELECT name, email, active FROM users WHERE id=?", (uid,)).fetchone()
        konto._put(c, f"vorort:mail:{uid}", heute, "vorort")
        if not fehlt or not u or not u["active"] or not (u["email"] or "").strip():
            continue
        zeilen = []
        for b in fehlt:
            lk = platform.link("bautagebuch", f"#projekt={b['pid']}", cf)
            zeilen.append(f"• {b['projekt']} – vor Ort {b['von']}{'–' + b['bis'] if b['bis'] != b['von'] else ''} Uhr"
                          + (" – automatisch angelegt, noch zu ergänzen und als PDF zu erstellen" if b.get("angelegt") else " – noch kein Tagesbericht") + (f"\n  {lk}" if lk else ""))
        txt = (f"Hallo {u['name']},\n\ndu warst heute laut Standort auf {'der Baustelle' if len(fehlt) == 1 else 'diesen Baustellen'}, "
               f"der Tagesbericht ist aber noch nicht fertig:\n\n" + "\n".join(zeilen) + "\n\nDie Erinnerung lässt sich unter ⚙ → Für mich → Vor Ort erkennen abschalten.\n")
        try:
            mail.send(cf, u["email"], f"Tagesbericht {'ergänzen' if all(b.get('angelegt') for b in fehlt) else 'fehlt'}: {fehlt[0]['projekt']}" + (f" (+{len(fehlt) - 1})" if len(fehlt) > 1 else ""), txt,
                      sender=cf.get("office_name") or "Bauplattform")
            n += 1
        except Exception as ex:
            if not getattr(ex, "gemeldet", False):   # Mailfehler meldet mail.send schon selbst
                from . import fehler
                fehler.still(None, "Vor Ort: Erinnerung an den Tagesbericht", ex)
            pass
    return n
