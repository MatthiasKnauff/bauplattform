"""To-do-Liste der Startseite: automatische Aufgaben aus den Daten der Apps + manuelle Aufgaben.

Automatische Aufgaben („Analysen“) werden bei jedem Abruf berechnet und verschwinden von selbst, sobald der Anlass
erledigt ist (Rechnung geprüft, Mangel erledigt …). Jede Analyse ist einstellbar (bp_store „todo:regeln“):
  an        – überhaupt anzeigen
  fuer      – "alle" oder Liste von Benutzer-IDs (wer sie sieht)
  projekte  – "meine" (wo ich Bauleitung bin), "alle" oder Liste von Projekt-IDs
  wert      – Schwelle der Analyse (Tage/Wochen/Prozent), falls sie eine hat
Was jemand zurückgestellt („später“) oder ausgeblendet hat, liegt je Benutzer in „todo:zustand:<uid>“.
"""
import json, re
from datetime import date, datetime, timedelta

from . import konto, plan

# key, Name, Beschreibung, Standard an?, Schwelle (Name, Einheit, Standard) oder None
REGELN = [
    ("maengel", "Mängel mit abgelaufener Frist", "Mängel, Weisungen und „zu erledigen“ aus den Tagesberichten, deren Frist vorbei ist", True, None),
    ("erinnerungen", "Fällige Erinnerungen", "Offene Erinnerungen an mich, deren Termin erreicht ist", True, ("Tage vorher", "Tage", 0)),
    ("rechnungen", "Rechnungsprüfung (VOB/B § 16)", "Rechnungen in Prüfung – Frist 21 Tage (Abschlag) bzw. 30 Tage (Schluss) ab Eingang; Hinweis so viele Tage vor Ablauf", True, ("Tage vor Fristende", "Tage", 7)),
    ("skonto", "Skontofrist läuft ab", "Rechnungen mit vereinbartem Skonto, die noch nicht als bezahlt markiert sind – Hinweis so viele Tage vor Ablauf der Skontofrist", True, ("Tage vor Ablauf", "Tage", 3)),
    ("nachtraege", "Nachträge ohne Entscheidung", "Angemeldete Nachträge in den LVs, die weder beauftragt noch abgelehnt sind", True, None),
    ("vergabe", "Vergabe vor Baubeginn", "Gewerk beginnt laut Bauzeitenplan bald, im AVA ist noch kein LV dafür vergeben", False, ("Wochen vor Beginn", "Wochen", 6)),
    ("firma", "Vorgänge ohne Firma", "Vorgänge im Bauzeitenplan, die bald beginnen und noch keine Firma haben", False, ("Tage vor Beginn", "Tage", 14)),
    ("terminruege", "Terminrüge vorschlagen", "Firmen, die laut gemeldetem Arbeitsfortschritt (Bautagebuch) so viele Arbeitstage hinter dem Bauzeitenplan liegen", True, ("Arbeitstage Verzug", "AT", 5)),
    ("verzug", "Vorgänge im Verzug", "Vorgänge, deren Ende laut Bauzeitenplan vorbei ist und die nicht als fertig gemeldet sind", False, None),
    ("planversand", "Pläne nicht versendet", "Neue Planstände im Projektordner, die noch an niemanden verschickt wurden (aus der letzten Einlesung von „Pläne & Dateien“)", False, ("Tage alt höchstens", "Tage", 30)),
    ("vorort", "Tagesbericht nach Baustellenbesuch", "Ich war laut Standort (iPhone-Kurzbefehl, ⚙ → Für mich → Vor Ort erkennen) auf der Baustelle, aber für den Tag gibt es keinen Tagesbericht", True, ("Tage zurück", "Tage", 7)),
    ("tagesbericht", "Tagesbericht fehlt", "Laufende Baustelle (Firmen laut Bauzeitenplan da), aber seit so vielen Arbeitstagen kein Tagesbericht", False, ("Arbeitstage", "Tage", 3)),
    ("budget", "Budget überschritten", "Aufträge + beauftragte Nachträge im AVA liegen über der Kostenermittlung (KG 300 + 400)", False, ("Toleranz", "%", 0)),
    ("urlaub", "Urlaubsanträge", "Für die Verwaltung: offene Urlaubsanträge entscheiden · für alle: eigene Anträge, die in den letzten Tagen entschieden wurden", True, None),
    ("honorar", "Honorar: Anfragen und Angebote", "Für die Verwaltung: Anfragen ohne Angebot, Angebote zum Nachfassen oder mit ablaufender Bindefrist, Aufträge ohne Vertrag – so viele Tage Vorlauf bzw. Wartezeit", True, ("Tage", "Tage", 7)),
    ("post", "Angebote/Rechnungen im Posteingang", "Mails der Startseite, die nach Angebot oder Rechnung aussehen und noch nicht erledigt sind", False, None),
]
RK = {r[0]: r for r in REGELN}


def _j(v, d):
    try:
        x = json.loads(v) if isinstance(v, str) else v
        return d if x is None else x
    except (TypeError, ValueError):
        return d


def _ids(v):
    try:
        return [int(x) for x in _j(v, [])]
    except (TypeError, ValueError):
        return []


def _heute():
    return date.today()


def _iso(d):
    return d.isoformat() if d else ""


# ---------------------------------------------------------------- Einstellungen
def regeln(c):
    d = _j(konto._get(c, "todo:regeln"), {}) or {}
    out = {}
    for k, name, txt, an, wert in REGELN:
        x = d.get(k) if isinstance(d.get(k), dict) else {}
        fuer = x.get("fuer")
        fuer = fuer if fuer == "alle" else [int(i) for i in fuer if str(i).lstrip("-").isdigit()][:50] if isinstance(fuer, list) else "alle"
        pr = x.get("projekte")
        pr = pr if pr in ("meine", "alle") else [int(i) for i in pr if str(i).isdigit()][:200] if isinstance(pr, list) else "meine"
        w = x.get("wert", wert[2] if wert else None)
        try:
            w = max(0, min(365, int(w))) if wert else None
        except (TypeError, ValueError):
            w = wert[2] if wert else None
        out[k] = {"key": k, "name": name, "text": txt, "an": bool(x.get("an", an)), "fuer": fuer, "projekte": pr, "wert": w,
                  "wert_name": wert[0] if wert else "", "einheit": wert[1] if wert else ""}
    return out


def regeln_setzen(c, b, wer):
    """b: je Regel {an, fuer, projekte, wert}; b["_standard"] = "alle" oder [Regel-Schlüssel] setzt auf die Voreinstellung zurück."""
    st = b.get("_standard")
    if st:
        d = _j(konto._get(c, "todo:regeln"), {}) or {}
        for k in ([x[0] for x in REGELN] if st == "alle" else [x for x in st if isinstance(x, str)]):
            d.pop(k, None)
        konto._put(c, "todo:regeln", json.dumps(d), wer)
        return regeln(c)
    alt = regeln(c)
    neu = {}
    for k in alt:
        x = b.get(k) if isinstance(b.get(k), dict) else {}
        neu[k] = {"an": bool(x.get("an", alt[k]["an"])), "fuer": x.get("fuer", alt[k]["fuer"]), "projekte": x.get("projekte", alt[k]["projekte"]),
                  "wert": x.get("wert", alt[k]["wert"])}
    konto._put(c, "todo:regeln", json.dumps(neu), wer)
    return regeln(c)


def zustand(c, uid):
    return _j(konto._get(c, f"todo:zustand:{uid}"), {}) or {}


def zustand_setzen(c, uid, key, bis=None, aus=False, wer=""):
    z = zustand(c, uid)
    heute = _iso(_heute())
    z = {k: v for k, v in z.items() if isinstance(v, dict) and (v.get("aus") or (v.get("bis") or "") > heute)}   # Abgelaufenes aufräumen
    if aus:
        z[key] = {"aus": 1, "am": heute}
    elif bis:
        z[key] = {"bis": bis}
    else:
        z.pop(key, None)
    konto._put(c, f"todo:zustand:{uid}", json.dumps(z), wer)


# ---------------------------------------------------------------- Projekte
def _projekte(c):
    return {r["id"]: {"id": r["id"], "name": r["name"], "leaders": _ids(r["leaders"]), "archived": bool(r["archived"])}
            for r in c.execute("SELECT id, name, leaders, archived FROM projects")}


def _sieht(u, p):
    return bool(u["is_admin"]) or not p["leaders"] or u["id"] in p["leaders"]


def _projekt_ok(u, p, R):
    if not p or p["archived"] or not _sieht(u, p):
        return False
    if R["projekte"] == "alle":
        return True
    if R["projekte"] == "meine":
        return u["id"] in p["leaders"] or not p["leaders"]
    return p["id"] in R["projekte"]


# ---------------------------------------------------------------- Analysen
def _e(regel, obj, titel, text="", pid=None, P=None, faellig=None, link="", prio=0):
    return {"key": f"{regel}:{obj}", "regel": regel, "regel_name": RK[regel][1], "titel": titel, "text": text, "pid": pid,
            "projekt": (P or {}).get(pid, {}).get("name", "") if pid else "", "faellig": _iso(faellig) if isinstance(faellig, date) else (faellig or ""),
            "link": link, "prio": prio, "auto": True}


def _a_maengel(c, u, R, P, ok):
    out = []
    heute = _iso(_heute())
    for x in c.execute("""SELECT i.id, i.kind, i.text, i.due, i.company, ct.name AS contact, r.project_id AS pid FROM items i
                          JOIN reports r ON r.id=i.report_id LEFT JOIN contacts ct ON ct.id=i.contact_id
                          WHERE i.kind IN ('maengel','zu_erledigen','weisungen') AND i.done=0 AND i.due<>'' AND i.due<?""", (heute,)).fetchall():
        if not ok(x["pid"]):
            continue
        art = {"maengel": "Mangel", "weisungen": "Weisung", "zu_erledigen": "Zu erledigen"}[x["kind"]]
        firma = x["company"] or x["contact"] or ""
        out.append(_e("maengel", x["id"], f"{art}: {(x['text'] or '').splitlines()[0][:120] if x['text'] else art}", f"Frist abgelaufen{' · ' + firma if firma else ''} – nachfassen oder rügen",
                      x["pid"], P, x["due"], "aufgaben:#maengel", 1))
    return out


def _a_erinnerungen(c, u, R, P, ok):
    bis = _iso(_heute() + timedelta(days=R["wert"] or 0))
    out = []
    for x in c.execute("SELECT id, titel, text, termin, project_id, empfaenger FROM erinnerungen WHERE status='offen' AND termin<>'' AND termin<=?", (bis,)).fetchall():
        if u["id"] not in _ids(x["empfaenger"]) or (x["project_id"] and not ok(x["project_id"])):
            continue
        out.append(_e("erinnerungen", x["id"], x["titel"] or "Erinnerung", (x["text"] or "")[:160], x["project_id"], P, x["termin"], "aufgaben:#erinnerungen"))
    return out


def _lvs(c, ok):
    for r in c.execute("SELECT * FROM ava_lv WHERE archived=0 AND (version_id IS NULL OR version_id IN (SELECT id FROM ava_version WHERE aktiv=1))").fetchall():
        if r["project_id"] and ok(r["project_id"]) and not (_j(r["vergabe"], {}) or {}).get("aufgehoben"):   # aufgehobene Beauftragung: deaktiviert, keine To-dos
            yield r


def _a_rechnungen(c, u, R, P, ok):
    out = []
    heute = _heute()
    for lv in _lvs(c, ok):
        for x in c.execute("SELECT id, nr, art, eingang, re_nr, gefordert FROM ava_rechnung WHERE lv_id=? AND status='offen'", (lv["id"],)).fetchall():
            try:
                ein = date.fromisoformat(x["eingang"]) if x["eingang"] else None
            except ValueError:
                ein = None
            if not ein:
                continue
            frist = ein + timedelta(days=30 if x["art"] == "schluss" else 21)
            if (frist - heute).days > (R["wert"] or 0):
                continue
            art = "Schlussrechnung" if x["art"] == "schluss" else "Abschlagsrechnung"
            rest = (frist - heute).days
            out.append(_e("rechnungen", x["id"], f"{x['nr']}. {art} prüfen – LV {lv['nr']} {lv['name']}",
                          (f"Prüffrist {'abgelaufen seit ' + str(-rest) + ' Tagen' if rest < 0 else 'endet heute' if rest == 0 else 'endet in ' + str(rest) + ' Tagen'}"
                           f" (Eingang {ein.strftime('%d.%m.%Y')}){' · Nr. ' + x['re_nr'] if x['re_nr'] else ''}"),
                          lv["project_id"], P, frist, f"ava:#lv={lv['id']}&tab=rechnungen", 1))
    return out


def _a_skonto(c, u, R, P, ok):
    """Skonto: Satz/Tage aus dem Auftrag (vergabe) oder der Rechnung, Frist ab Eingang; erledigt mit „bezahlt am“."""
    out = []
    heute = _heute()
    for lv in _lvs(c, ok):
        V = _j(lv["vergabe"], {}) or {}
        for x in c.execute("SELECT id, nr, art, eingang, re_nr, status, data FROM ava_rechnung WHERE lv_id=? AND art<>'sicherheit'", (lv["id"],)).fetchall():
            d = _j(x["data"], {}) or {}
            if d.get("bezahlt"):
                continue
            try:
                pct = float(d["skonto"]) if d.get("skonto") not in (None, "") else float(V.get("skonto") or 0)
                tage = int(d["skonto_tage"]) if d.get("skonto_tage") not in (None, "") else int(V.get("skonto_tage") or 0)
                ein = date.fromisoformat(x["eingang"]) if x["eingang"] else None
            except (TypeError, ValueError):
                continue
            if not pct or not tage or not ein:
                continue
            bis = ein + timedelta(days=tage)
            rest = (bis - heute).days
            if rest < 0 or rest > (R["wert"] or 0):
                continue
            art = {"schluss": "Schlussrechnung", "regie": "Regierechnung", "nachtrag": "Nachtragsrechnung"}.get(x["art"], "Abschlagsrechnung")
            out.append(_e("skonto", x["id"], f"Skonto {str(pct).rstrip('0').rstrip('.').replace('.', ',')} % – {x['nr']}. {art}, LV {lv['nr']} {lv['name']}",
                          (f"Skontofrist {'endet heute' if rest == 0 else 'endet in ' + str(rest) + ' Tagen'} ({bis.strftime('%d.%m.%Y')})"
                           f"{' · erst noch prüfen' if x['status'] != 'geprueft' else ' · Freigabe an den Bauherrn, dann „bezahlt am“ eintragen'}{' · Nr. ' + x['re_nr'] if x['re_nr'] else ''}"),
                          lv["project_id"], P, bis, f"ava:#lv={lv['id']}&tab=rechnungen", 2))
    return out


def _a_nachtraege(c, u, R, P, ok):
    out = []
    for lv in _lvs(c, ok):
        for x in (_j(lv["data"], {}) or {}).get("items") or []:
            if x.get("nt") and (x.get("nt_status") or "angemeldet") == "angemeldet" and not x.get("entf"):
                out.append(_e("nachtraege", f"{lv['id']}:{x.get('id')}", f"Nachtrag {x['nt']} entscheiden – {x.get('kurz') or ''}".strip(" –"),
                              f"LV {lv['nr']} {lv['name']} · {x.get('oz') or ''}", lv["project_id"], P, None, f"ava:#lv={lv['id']}&pos={x.get('id')}"))
    return out


def _gantt(c, ok, P):
    """(Projekt-ID, Planname, Plan-ID, data) aller Bauzeitenpläne der gewählten Projekte."""
    pids = [r["project_id"] for r in c.execute("SELECT DISTINCT project_id FROM gantt_projects WHERE project_id IS NOT NULL").fetchall()]
    for pid in pids:   # je Projekt nur die gültige Version des Bauzeitenplans
        if ok(pid):
            for gid, name, data in plan.plans_mit_id(c, pid):
                yield pid, name, gid, data if isinstance(data, dict) else {}


def _vorgaenge(data):
    tasks = {t.get("uid"): t for t in (data.get("tasks") or []) if isinstance(t, dict)}
    for s in data.get("sched") or []:
        t = tasks.get(s.get("uid"))
        if t and not s.get("g") and t.get("dur") and s.get("s"):
            yield t, s


def _fold(t):
    return re.sub(r"[^a-z0-9]", "", str(t or "").lower().replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss"))


def _a_vergabe(c, u, R, P, ok):
    out = []
    heute, bis = _iso(_heute()), _iso(_heute() + timedelta(weeks=R["wert"] or 6))
    lvs = {}
    for lv in _lvs(c, ok):
        lvs.setdefault(lv["project_id"], []).append(lv)
    for pid, pname, gid, data in _gantt(c, ok, P):
        beginn = {}
        for t, s in _vorgaenge(data):
            gw = (t.get("gw") or "").strip()
            if gw and heute <= s["s"] <= bis:
                beginn[gw] = min(beginn.get(gw, s["s"]), s["s"])
        for gw, b in beginn.items():
            f = _fold(gw)
            treffer = [lv for lv in lvs.get(pid, []) if f and (f in _fold(lv["gewerk"]) or f in _fold(lv["name"]) or _fold(lv["gewerk"]) and _fold(lv["gewerk"]) in f)]
            if any(lv["status"] in ("vergeben", "abgerechnet", "nicht_vergeben") for lv in treffer):   # nicht vergeben: bewusst entschieden
                continue
            st = "LV noch im Entwurf" if treffer and all(lv["status"] == "entwurf" for lv in treffer) else "LV versendet, noch nicht vergeben" if treffer else "noch kein LV im AVA"
            out.append(_e("vergabe", f"{pid}:{f}", f"{gw}: Vergabe vor Baubeginn {date.fromisoformat(b).strftime('%d.%m.')}", f"{st} · {pname}",
                          pid, P, date.fromisoformat(b) - timedelta(weeks=2), "ava:", 1))
    return out


def _a_firma(c, u, R, P, ok):
    out = []
    heute, bis = _iso(_heute()), _iso(_heute() + timedelta(days=R["wert"] or 14))
    firms = plan.firm_map(c)
    for pid, pname, gid, data in _gantt(c, ok, P):
        trades = data.get("trades") or {}
        for t, s in _vorgaenge(data):
            if not (heute <= s["s"] <= bis):
                continue
            tr = trades.get((t.get("gw") or "").strip()) or {}
            if firms.get(tr.get("firm") or "") or ((t.get("res") or "").strip() and (t.get("res") or "").strip() != (tr.get("craft") or "").strip()):
                continue
            out.append(_e("firma", f"{gid}:{t.get('uid')}", f"Firma fehlt: {t.get('name') or 'Vorgang'}", f"Beginn {date.fromisoformat(s['s']).strftime('%d.%m.%Y')}"
                          f"{' · ' + t['gw'] if t.get('gw') else ''} · {pname}", pid, P, s["s"], f"gantt:#plan={gid}"))
    return out


def _a_verzug(c, u, R, P, ok):
    out = []
    heute = _iso(_heute())
    for pid, pname, gid, data in _gantt(c, ok, P):
        for t, s in _vorgaenge(data):
            f = s.get("f") or s["s"]
            pct = t.get("pct") or 0
            if f < heute and pct < 100:
                out.append(_e("verzug", f"{gid}:{t.get('uid')}", f"Im Verzug: {t.get('name') or 'Vorgang'}", f"Ende war {date.fromisoformat(f).strftime('%d.%m.%Y')} · {pct:g} % fertig"
                              f"{' · ' + t['gw'] if t.get('gw') else ''} · {pname}", pid, P, f, f"gantt:#plan={gid}"))
    return out


SCHWELLE = "termin:schwelle"   # je Projekt abweichende Schwelle für die Terminrüge {pid: Arbeitstage}


def schwellen(c):
    d = _j(konto._get(c, SCHWELLE), {}) or {}
    return {int(k): int(v) for k, v in d.items() if str(k).isdigit() and isinstance(v, (int, float)) and 0 < v <= 120}


def schwelle(c, pid, regel=None):
    """Ab wie vielen Arbeitstagen Verzug eine Terminrüge vorgeschlagen wird: Projekt, sonst Regel „Terminrüge vorschlagen“ (Standard 5)."""
    return schwellen(c).get(pid) or ((regel or regeln(c)["terminruege"])["wert"] or 5)


def schwelle_setzen(c, pid, tage, wer=""):
    d = schwellen(c)
    if tage:
        d[pid] = max(1, min(120, int(tage)))
    else:
        d.pop(pid, None)
    konto._put(c, SCHWELLE, json.dumps({str(k): v for k, v in d.items()}), wer)


def verzug(c, pids, heute=None, alle=False, regel=None):
    """Vorgänge im Verzug laut Arbeitsfortschritt (je Projekt ab dessen Schwelle; alle=True: jeder Rückstand > 0)."""
    heute = heute or _iso(_heute())
    firms, out = plan.firm_map(c), []
    for pid in pids:
        sw = schwelle(c, pid, regel)
        for x in plan.fortschritt(plan.plans_mit_id(c, pid), firms, heute):
            if x["verzug"] > 0 and (alle or x["verzug"] >= sw):
                m = c.execute("""SELECT f.ampel, f.pct, r.date FROM bt_fortschritt f JOIN reports r ON r.id=f.report_id
                                 WHERE f.gantt_id=? AND f.uid=? ORDER BY r.date DESC LIMIT 1""", (x["gantt_id"], x["uid"])).fetchone()
                out.append({**x, "pid": pid, "schwelle": sw, "gemeldet": m["date"] if m else "", "ampel": m["ampel"] if m else ""})
    return out


def _a_terminruege(c, u, R, P, ok):
    out, n = [], {}
    L = sorted(verzug(c, [p for p in P if ok(p)], regel=R), key=lambda y: -y["verzug"])   # je Firma der größte Rückstand vorn
    for x in L:
        k = (x["pid"], x["key"])
        if k in n:   # je Firma und Projekt ein Vorschlag
            continue
        n[k] = 1
        weitere = [y["vorgang"] for y in L if y["pid"] == x["pid"] and y["key"] == x["key"] and y is not x][:3]
        out.append(_e("terminruege", f"{x['pid']}:{x['key']}", f"Terminrüge? {x['firma']} ca. {x['verzug']:g} AT im Verzug",
                      f"{x['vorgang']}: {x['ist']} % statt {x['soll']} %" + (f" · auch {', '.join(weitere)}" if weitere else ""), x["pid"], P, None,
                      f"aufgaben:#termine&ruege={x['pid']}|{x['key']}", 1))
    return out


def _a_planversand(c, u, R, P, ok):
    """Aus der letzten Einlesung („plaene:stand:<pid>“, von Pläne & Dateien gemerkt): neueste PDF je Plan, noch nie versendet."""
    out = []
    grenze = _iso(_heute() - timedelta(days=R["wert"] or 30))
    for pid in [p for p in P if ok(p)]:
        st = _j(konto._get(c, f"plaene:stand:{pid}"), {}) or {}
        if not st.get("plaene"):
            continue
        gesendet = set()
        for r in c.execute("SELECT plaene FROM planversand WHERE project_id=?", (pid,)):
            gesendet |= {x.get("pfad") for x in _j(r["plaene"], [])}
        for x in st["plaene"]:
            if x.get("pfad") in gesendet or (x.get("datum") or "") < grenze:
                continue
            out.append(_e("planversand", f"{pid}:{x.get('pfad')}", f"Plan versenden: {x.get('name') or x.get('pfad')}",
                          f"Index {x.get('index') or '–'} vom {date.fromisoformat(x['datum'][:10]).strftime('%d.%m.%Y') if x.get('datum') else '?'}{' · ' + x['gewerk'] if x.get('gewerk') else ''}",
                          pid, P, None, "plaene:#plaene"))
    return out


def _arbeitstage_zurueck(d, n):
    while n > 0:
        d -= timedelta(days=1)
        if d.weekday() < 5:
            n -= 1
    return d


def _a_tagesbericht(c, u, R, P, ok):
    out = []
    heute = _heute()
    seit = _arbeitstage_zurueck(heute, R["wert"] or 3)
    firms = plan.firm_map(c)
    for pid in [p for p in P if ok(p)]:
        pl = plan.plans(c, pid)
        if not pl:
            continue
        # läuft die Baustelle? an jedem der letzten Arbeitstage werden Firmen erwartet
        tage = [seit + timedelta(days=i) for i in range((heute - seit).days) if (seit + timedelta(days=i)).weekday() < 5]
        if not tage or not all(plan.expected(pl, firms, _iso(t)) for t in tage):
            continue
        r = c.execute("SELECT MAX(date) AS d FROM reports WHERE project_id=?", (pid,)).fetchone()
        letzter = r["d"] if r else None
        if letzter and letzter >= _iso(seit):
            continue
        out.append(_e("tagesbericht", pid, "Tagesbericht schreiben", f"Letzter Bericht {date.fromisoformat(letzter).strftime('%d.%m.%Y') if letzter else '– noch keiner'}"
                      " · laut Bauzeitenplan wird gearbeitet", pid, P, heute, f"bautagebuch:#projekt={pid}"))
    return out


def _a_vorort(c, u, R, P, ok):
    from . import vorort
    out = []
    for b in vorort.ohne_bericht(c, u["id"], R["wert"] or 7):
        if isinstance(R["projekte"], list) and b["pid"] not in R["projekte"]:
            continue
        d = date.fromisoformat(b["datum"])
        out.append(_e("vorort", f"{b['pid']}:{b['datum']}", f"Tagesbericht vom {d.strftime('%d.%m.')} {'ergänzen (automatisch angelegt)' if b.get('angelegt') else 'schreiben'}",
                      f"Du warst {'heute' if d == _heute() else 'am ' + d.strftime('%d.%m.')} {b['von']}{'–' + b['bis'] if b['bis'] != b['von'] else ''} Uhr vor Ort",
                      b["pid"], P, b["datum"], f"bautagebuch:#projekt={b['pid']}", 1))
    return out


def _a_budget(c, u, R, P, ok):
    out = []
    try:
        import ava as AVA
        import baukosten as BK
    except Exception:   # Module nicht im Container – Analyse entfällt
        return out
    for pid in [p for p in P if ok(p)]:
        lvs = c.execute("SELECT * FROM ava_lv WHERE project_id=? AND archived=0 AND (version_id IS NULL OR version_id IN (SELECT id FROM ava_version WHERE aktiv=1))", (pid,)).fetchall()
        if not lvs:
            continue
        summe = 0.0
        for lv in lvs:
            k = AVA.rechne(lv, c.execute("SELECT * FROM ava_angebot WHERE lv_id=?", (lv["id"],)).fetchall(),
                           c.execute("SELECT pos_id, menge FROM ava_aufmass WHERE lv_id=?", (lv["id"],)).fetchall(),
                           c.execute("SELECT * FROM ava_rechnung WHERE lv_id=?", (lv["id"],)).fetchall())
            summe += (k.get("auftrag") or 0) + ((k.get("nachtraege") or {}).get("beauftragt") or 0)
        from . import gueltig
        bks = c.execute("SELECT * FROM bk_projects WHERE project_id=? AND archived=0", (pid,)).fetchall()
        gid = gueltig.waehlen([(x["id"], x["created"], False) for x in bks], gueltig.lesen(c, "bk", pid))
        bk = next((x for x in bks if x["id"] == gid), None)   # die gültige Kostenermittlung (★, sonst die neueste)
        if not bk or not summe:
            continue
        try:
            k = BK.calc(BK.clean_data(_j(bk["data"], {}), c))
            budget = (k.get("kg300") or 0) + (k.get("kg400") or 0)
        except Exception as e:
            from . import fehler
            fehler.still(None, f"Aufgaben: Budgetprüfung (Projekt {pid})", e)
            continue
        if budget and summe > budget * (1 + (R["wert"] or 0) / 100):
            eu = lambda v: f"{v:,.0f} €".replace(",", ".")
            out.append(_e("budget", pid, f"Budget überschritten um {eu(summe - budget)}", f"Aufträge + Nachträge {eu(summe)} · Kostenermittlung KG 300+400 {eu(budget)}",
                          pid, P, None, "baukosten:", 1))
    return out


def _a_post(c, u, R, P, ok):
    from . import posteingang
    d = posteingang.lesen(c, u["id"])
    erl = d.get("erledigt") or {}
    out = []
    for m in posteingang.sichtbar(c, u["id"], d.get("mails") or []):
        art = (m.get("art") or "").lower()
        if m.get("id") in erl or not any(a in art for a in ("rechnung", "angebot")):
            continue
        pid = m.get("pid")
        if pid and not ok(pid):
            continue
        out.append(_e("post", m["id"], f"{m.get('art') or 'Mail'} von {m.get('von_name') or m.get('von') or '?'}", m.get("betreff") or "", pid, P, None, m.get("link") or ""))
    return out


def _a_urlaub(c, u, R, P, ok):
    from . import zeiten as Z
    out, seit = [], _iso(_heute() - timedelta(days=7))
    if u["is_admin"]:
        for a in Z.antraege(c, status="offen"):
            if a["user_id"] == u["id"]:
                continue
            out.append(_e("urlaub", a["id"], f"Urlaubsantrag von {a['name']}: {_d(a['von'])} – {_d(a['bis'])}",
                          f"{Z.ABW.get(a['art'], a['art'])}, {a['tage']:g} Arbeitstag{'' if a['tage'] == 1 else 'e'}" + (f" · Vertretung {a['vertretung']}" if a["vertretung"] else ""),
                          None, P, a["von"], "zeiten:#antraege", 1))
    for a in Z.antraege(c, uid=u["id"]):
        if a["status"] in ("genehmigt", "abgelehnt") and (a["entschieden"] or "")[:10] >= seit:
            out.append(_e("urlaub", f"e{a['id']}", f"Urlaub {_d(a['von'])} – {_d(a['bis'])} {a['status']}", a["antwort"] or f"entschieden von {a['entschieden_von']}",
                          None, P, None, "zeiten:#antraege"))
    return out


def _a_honorar(c, u, R, P, ok):
    """Honorar-Ablauf (nur Verwaltung): Anfrage seit n Tagen ohne Angebot, Angebot nachfassen (Datum erreicht) oder Bindefrist in n Tagen,
    beauftragt seit n Tagen ohne Vertrag."""
    if not u["is_admin"]:
        return []
    n, heute = R["wert"] or 7, _heute()
    out = []
    for x in c.execute("SELECT id, project_id, name, status, ablauf, datum FROM honorar_auftrag WHERE status IN ('anfrage','angebot','beauftragt')").fetchall():
        p = P.get(x["project_id"])
        if p and p["archived"]:
            continue
        ab = _j(x["ablauf"], {}) or {}
        an, ag, au = ab.get("anfrage") or {}, ab.get("angebot") or {}, ab.get("auftrag") or {}
        link = f"honorar:#a{x['id']}"
        if x["status"] == "anfrage":
            seit = _d_iso(an.get("datum") or x["datum"])
            if seit and seit <= heute - timedelta(days=n):
                out.append(_e("honorar", f"an{x['id']}", f"Honoraranfrage beantworten: {x['name']}", f"Anfrage{' von ' + an['von'] if an.get('von') else ''} seit {(heute - seit).days} Tagen ohne Angebot",
                              x["project_id"], P, an.get("datum") or x["datum"], link, 1))
        elif x["status"] == "angebot":
            nf, bf = _d_iso(ag.get("nachfassen")), _d_iso(ag.get("bindefrist"))
            if nf and nf <= heute:
                out.append(_e("honorar", f"nf{x['id']}", f"Honorarangebot nachfassen: {x['name']}", f"gesendet {_d(ag.get('gesendet', ''))}" if ag.get("gesendet") else "",
                              x["project_id"], P, ag["nachfassen"], link, 1))
            elif bf and bf <= heute + timedelta(days=n):
                out.append(_e("honorar", f"bf{x['id']}", f"Bindefrist Honorarangebot {'abgelaufen' if bf < heute else 'läuft ab'}: {x['name']}", f"bis {_d(ag['bindefrist'])}",
                              x["project_id"], P, ag["bindefrist"], link, 1))
        else:
            seit = _d_iso(au.get("datum"))
            if seit and seit <= heute - timedelta(days=n):
                out.append(_e("honorar", f"vt{x['id']}", f"Architektenvertrag fehlt: {x['name']}", f"beauftragt am {_d(au['datum'])}", x["project_id"], P, au["datum"], link))
    return out


def _d_iso(t):
    try:
        return date.fromisoformat(str(t)[:10]) if t else None
    except ValueError:
        return None


def _d(t):
    return f"{t[8:10]}.{t[5:7]}." if t and len(t) >= 10 else (t or "")


ANALYSEN = {"urlaub": _a_urlaub, "terminruege": _a_terminruege, "maengel": _a_maengel, "erinnerungen": _a_erinnerungen, "rechnungen": _a_rechnungen, "skonto": _a_skonto, "nachtraege": _a_nachtraege, "vergabe": _a_vergabe,
            "firma": _a_firma, "verzug": _a_verzug, "planversand": _a_planversand, "tagesbericht": _a_tagesbericht, "vorort": _a_vorort, "budget": _a_budget, "post": _a_post,
            "honorar": _a_honorar}


def automatisch(c, u):
    """Alle automatischen Aufgaben für den Benutzer (ohne Ausgeblendete; Zurückgestellte mit „bis“)."""
    RG, P = regeln(c), _projekte(c)
    z = zustand(c, u["id"])
    heute = _iso(_heute())
    out, fehler = [], []
    for k, fn in ANALYSEN.items():
        R = RG[k]
        if not R["an"] or (R["fuer"] != "alle" and u["id"] not in R["fuer"]):
            continue
        ok = (lambda R_: lambda pid: _projekt_ok(u, P.get(pid), R_))(R)
        try:
            for e in fn(c, u, R, P, ok):
                s = z.get(e["key"]) or {}
                if s.get("aus"):
                    continue
                if (s.get("bis") or "") > heute:
                    e["spaeter"] = s["bis"]
                out.append(e)
        except Exception as ex:   # eine Analyse darf die Liste nicht verhindern
            fehler.append(f"{RK[k][1]}: {ex}")
    return out, fehler


# ---------------------------------------------------------------- manuelle Aufgaben
# Erinnerung zur Fälligkeit: Schlüssel → (Minuten vor Beginn des Fälligkeitstags für den Kalender-Alarm, Text)
# Kalender: ganztägiger Termin beginnt um 0 Uhr – „am Tag, 8 Uhr“ = 8 Stunden NACH Beginn (negativ = danach)
ERINNERUNG = {"tag": (-480, "am Fälligkeitstag, 8 Uhr"), "1t": (960, "1 Tag vorher, 8 Uhr"), "2t": (2400, "2 Tage vorher, 8 Uhr"), "1w": (8160, "1 Woche vorher, 8 Uhr")}


def erinnerung_zeit(faellig, art):
    """Zeitpunkt der Erinnerung (datetime) oder None."""
    if not faellig or art not in ERINNERUNG:
        return None
    try:
        return datetime.fromisoformat(faellig + "T00:00") - timedelta(minutes=ERINNERUNG[art][0])
    except ValueError:
        return None


def erinnerungen_senden(c, jetzt=None):
    """Offene Aufgaben, deren Erinnerung fällig ist: einmal per Mail an Ersteller und Beteiligte (mit E-Mail-Adresse)."""
    from . import mail as M, platform as PF
    from .skizze import name_von
    jetzt = jetzt or datetime.now()
    cf = M.conf(c)
    if not M.configured(cf):
        return 0
    n = 0
    for x in c.execute("SELECT * FROM todo WHERE status='offen' AND erinnerung<>'' AND faellig<>''").fetchall():
        t = erinnerung_zeit(x["faellig"], x["erinnerung"])
        key = f"todo:erinnert:{x['id']}"
        if not t or t > jetzt or t < jetzt - timedelta(days=2) or c.execute("SELECT 1 FROM bp_store WHERE key=?", (key,)).fetchone():
            continue
        c.execute("INSERT INTO bp_store(key, data, updated, updated_by) VALUES(?,?,?,?) ON CONFLICT (key) DO NOTHING", (key, x["faellig"], jetzt.isoformat(timespec="seconds"), "todo"))
        ids = {x["erstellt_von"], *_ids(x["personen"])}
        pr = c.execute("SELECT name FROM projects WHERE id=?", (x["project_id"],)).fetchone() if x["project_id"] else None
        lk = PF.link("portal", "", cf)
        for u in c.execute("SELECT * FROM users WHERE active=1").fetchall():
            if u["id"] not in ids or not (u["email"] or "").strip():
                continue
            d = datetime.fromisoformat(x["faellig"])
            txt = (f"Hallo {name_von(u)},\n\nErinnerung an die Aufgabe\n\n    {x['titel']}\n\n" + (f"Projekt: {pr['name']}\n" if pr else "")
                   + f"Fällig: {d.strftime('%d.%m.%Y')}\n" + (f"\n{x['notiz']}\n" if x["notiz"] else "") + (f"\nZur Startseite: {lk}\n" if lk else ""))
            try:
                M.send(cf, u["email"], f"Erinnerung: {x['titel'][:80]} – fällig {d.strftime('%d.%m.')}", txt, sender=cf.get("office_name") or "Bauplattform")
                n += 1
            except Exception as e:
                if not getattr(e, "gemeldet", False):   # Mailfehler meldet mail.send schon selbst
                    from . import fehler
                    fehler.still(None, "Aufgaben: Erinnerung per Mail", e)
                pass
    return n


def _zeile(x, U, D=None):
    k = set(x.keys()) if hasattr(x, "keys") else set()
    return {"dateien": (D or {}).get(x["id"], []), "id": x["id"], "titel": x["titel"], "notiz": x["notiz"], "pid": x["project_id"], "faellig": x["faellig"], "prio": x["prio"],
            "erinnerung": (x["erinnerung"] if "erinnerung" in k else "") or "",
            "personen": _ids(x["personen"]), "personen_namen": [U.get(i, "?") for i in _ids(x["personen"])], "mail": bool(x["mail"]),
            "status": x["status"], "erstellt": x["erstellt"], "erstellt_von": x["erstellt_von"], "erstellt_name": x["erstellt_name"],
            "erledigt": x["erledigt"], "erledigt_name": x["erledigt_name"], "auto": False, "key": f"t:{x['id']}"}


def benutzer(c):
    from .skizze import name_von
    return {r["id"]: name_von(r) for r in c.execute("SELECT * FROM users")}


def manuell(c, u, erledigte_tage=7):
    """Offene Aufgaben, die ich angelegt habe oder an denen ich beteiligt bin – dazu die in den letzten Tagen erledigten."""
    U = benutzer(c)
    seit = (datetime.now() - timedelta(days=erledigte_tage)).isoformat(timespec="seconds")
    rows = [x for x in c.execute("SELECT * FROM todo WHERE status='offen' OR erledigt>=? ORDER BY id DESC", (seit,)).fetchall()
            if x["erstellt_von"] == u["id"] or u["id"] in _ids(x["personen"])]
    D = dateien(c, [x["id"] for x in rows])
    return [_zeile(x, U, D) for x in rows]


def dateien(c, ids):
    """Anhänge (ohne Inhalt) je Aufgabe."""
    D = {}
    if ids:
        for r in c.execute(f"SELECT id, todo_id, name, mime, groesse FROM todo_datei WHERE todo_id IN ({','.join('?' * len(ids))}) ORDER BY id", tuple(ids)).fetchall():
            D.setdefault(r["todo_id"], []).append({"id": r["id"], "name": r["name"], "mime": r["mime"], "groesse": r["groesse"]})
    return D


def darf(c, u, tid):
    x = c.execute("SELECT * FROM todo WHERE id=?", (tid,)).fetchone()
    return x if x and (x["erstellt_von"] == u["id"] or u["id"] in _ids(x["personen"]) or u["is_admin"]) else None
