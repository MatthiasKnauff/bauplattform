"""Wiki des Büros (besprochen am 13.11.2026, Mock „Wiki – Entwurf“): was das Büro auf Baustellen und beim Planen gelernt hat.

Ablauf eines Eintrags: neu (gesammelt – aus jeder App über „?“ → „Erkenntnis fürs Wiki“) → zusammengefasst (die KI ordnet einmal in der
Woche zu, führt Doppeltes zusammen; nichts ohne Bestätigung) → geprüft (fachlich, durch eine Person mit dem Recht „wiki.pruefen“).
Nur geprüfte Einträge erscheinen als Hinweis in den Apps. Ändert jemand den Text eines geprüften Eintrags, ist er wieder zu prüfen.
Lektorat: die KI schlägt einen besseren Text vor, übernommen wird nur auf Klick. Namen werden der KI so gegeben, wie sie im Eintrag
stehen (entschieden am 13.11.2026). In der Datenbank steht nur Text und ein kleines Vorschaubild – die Dateien liegen auf der Freigabe
„Bauportal“ in „02 Wiki“ (bautagebuch/modules/wiki.py). Die App: plattform/wiki.py; die Dienste legen das Wiki jede Woche als PDF in
„Pläne & Dateien“ → „Büro“ → „Wiki“ ab und bereiten montags die Zusammenfassung vor (bautagebuch/core/wiki_dienst.py).
"""
import json
import re
from datetime import date, datetime

from . import rechte

KAPITEL = ["Abdichtung", "Ausbau", "Ausschreibung & Vergabe", "Bauablauf", "Brandschutz", "Fenster & Türen", "Haustechnik", "Planung",
           "Recht & VOB", "Tragwerk", "Wärmeschutz", "Sonstiges"]
WOCHEN = "Wochen"   # Kapitel der Wochenbeiträge
STATUS = ("neu", "zusammengefasst", "geprueft")
FELDER = ("kapitel", "titel", "text", "stichworte", "quelle", "projekt_id", "projekte", "status")


def darf_pruefen(u):
    return rechte.hat(u, "wiki.pruefen") or rechte.hat(u, "verwaltung")


def _jetzt():
    return datetime.now().strftime("%Y-%m-%dT%H:%M:%S")


def _t(v, n):
    return str(v if v is not None else "").strip()[:n]


def kapitel(c):
    """Feste Kapitel und die, die schon benutzt werden (ohne „Wochen“ – die schreibt nur die Zusammenfassung)."""
    da = [r["kapitel"] for r in c.execute("SELECT DISTINCT kapitel FROM wiki_eintrag WHERE deleted='' AND kapitel<>''")]
    return sorted(set(KAPITEL) | {k for k in da if k != WOCHEN}, key=lambda k: (k == "Sonstiges", k.lower()))


def _teile(s):
    return [x.strip() for x in re.split(r"[,;·\n]+", s or "") if x.strip()]


def tags_von(kap, stichworte):
    """Tags eines Eintrags: der erste ordnet ihn im Baum ein (= kapitel), danach die übrigen – ohne Doppelte."""
    out, da = [], set()
    for x in [kap or ""] + _teile(stichworte):
        if x and x.lower() not in da:
            da.add(x.lower())
            out.append(x[:60])
    return out


def _projekte(v):
    try:
        L = json.loads(v or "[]")
    except ValueError:
        L = []
    return [x for x in L if isinstance(x, dict) and x.get("name")]


def _mit(d):
    """Zeile → mit Tags und Projekten als Listen."""
    d = dict(d)
    d["tags"] = tags_von(d.get("kapitel"), d.get("stichworte"))
    d["projekte"] = _projekte(d.get("projekte"))
    return d


def tags(c):
    """Alle Tags nach Häufigkeit (meistbenutzte zuerst) – dazu die festen Kapitel, solange noch nicht benutzt."""
    from collections import Counter
    n = Counter()
    for r in c.execute("SELECT kapitel, stichworte FROM wiki_eintrag WHERE deleted=''"):
        for t in tags_von(r["kapitel"], r["stichworte"]):
            if t != WOCHEN:
                n[t] += 1
    da = {k.lower() for k in n}
    return [{"tag": t, "n": k} for t, k in sorted(n.items(), key=lambda x: (-x[1], x[0].lower()))] + \
        [{"tag": k, "n": 0} for k in KAPITEL if k.lower() not in da]


def liste(c, q="", status=""):
    """Alle Einträge (ohne gelöschte) für den Baum – Text gekürzt, mit Projektname und Zahl der Dateien."""
    W, A = ["e.deleted=''"], []
    if status in STATUS:
        W.append("e.status=?")
        A.append(status)
    for w in [x for x in re.split(r"\s+", (q or "").strip()) if x][:6]:
        W.append("(e.titel ILIKE ? OR e.text ILIKE ? OR e.stichworte ILIKE ? OR e.kapitel ILIKE ? OR e.projekte ILIKE ?)")
        A += ["%" + w + "%"] * 5
    rows = c.execute("SELECT e.id, e.kapitel, e.titel, substr(e.text, 1, 160) AS kurz, e.stichworte, e.quelle, e.projekt_id, e.projekte, e.status, e.autor, "
                     "e.created, e.updated, COALESCE(p.name,'') AS projekt, (SELECT count(*) FROM wiki_datei d WHERE d.eintrag=e.id AND d.deleted='') AS dateien "
                     "FROM wiki_eintrag e LEFT JOIN projects p ON p.id=e.projekt_id WHERE " + " AND ".join(W) +
                     " ORDER BY e.kapitel, e.titel", A).fetchall()
    return [_mit(r) for r in rows]


def eintrag(c, eid):
    r = c.execute("SELECT e.*, COALESCE(p.name,'') AS projekt, COALESCE(u.name,'') AS autor_name FROM wiki_eintrag e "
                  "LEFT JOIN projects p ON p.id=e.projekt_id LEFT JOIN users u ON u.id=e.autor WHERE e.id=?", (eid,)).fetchone()
    if not r:
        return None
    d = _mit(r)
    d["dateien"] = [dict(x) for x in c.execute("SELECT id, name, pfad, mime, groesse, (vorschau IS NOT NULL) AS bild, created FROM wiki_datei "
                                                "WHERE eintrag=? AND deleted='' ORDER BY id", (eid,)).fetchall()]
    return d


def _werte(b):
    w = {}
    if isinstance(b.get("tags"), list):   # Tags (Knöpfe): der erste ordnet ein
        T = tags_von("", ", ".join(_t(x, 60) for x in b["tags"][:30]))
        w["kapitel"], w["stichworte"] = (T[0] if T else "Sonstiges"), ", ".join(T)
    if isinstance(b.get("projekte"), list):   # [{id?, name}] – Projekte der Plattform und Projektordner vom Fileserver
        P = []
        for x in b["projekte"][:40]:
            if isinstance(x, dict) and _t(x.get("name"), 200):
                q = {"name": _t(x["name"], 200)}
                if str(x.get("id") or "").isdigit():
                    q["id"] = int(x["id"])
                if q not in P:
                    P.append(q)
        w["projekte"] = json.dumps(P, ensure_ascii=False)
        w["projekt_id"] = next((x["id"] for x in P if "id" in x), None)
    if "kapitel" in b and "tags" not in b:
        w["kapitel"] = _t(b["kapitel"], 80) or "Sonstiges"
    if "titel" in b:
        w["titel"] = _t(b["titel"], 200)
    if "text" in b:
        w["text"] = _t(b["text"], 20000)
    if "stichworte" in b:
        w["stichworte"] = ", ".join(x.strip() for x in re.split(r"[,;·\n]+", _t(b["stichworte"], 400)) if x.strip())
    if "quelle" in b:
        w["quelle"] = _t(b["quelle"], 200)
    if "projekt_id" in b and "projekte" not in b:
        try:
            w["projekt_id"] = int(b["projekt_id"]) if b["projekt_id"] not in (None, "") else None
        except (TypeError, ValueError):
            w["projekt_id"] = None
    return w


def titel_aus(text):
    """Ohne Titel: der Anfang des Textes (bis zum ersten Satzende, höchstens 80 Zeichen)."""
    s = re.split(r"(?<=[.!?])\s|\n", (text or "").strip(), 1)[0]
    return (s[:77] + "…") if len(s) > 80 else s


def anlegen(c, u, b):
    """Neue Erkenntnis (Status „neu“) → id."""
    w = _werte(b)
    if not w.get("text"):
        raise ValueError("Bitte kurz aufschreiben, was wir gelernt haben.")
    j = _jetzt()
    kap = w.get("kapitel") or "Sonstiges"
    if "projekte" not in w and w.get("projekt_id"):   # nur eine Projektnummer (Sammeln, ältere Aufrufe): Name dazu
        p = c.execute("SELECT id, name FROM projects WHERE id=?", (w["projekt_id"],)).fetchone()
        w["projekte"] = json.dumps([{"id": p["id"], "name": p["name"]}] if p else [], ensure_ascii=False)
    r = c.execute("INSERT INTO wiki_eintrag(kapitel, titel, text, stichworte, quelle, projekt_id, projekte, status, autor, created, updated) "
                  "VALUES(?,?,?,?,?,?,?,'neu',?,?,?) RETURNING id",
                  (kap, w.get("titel") or titel_aus(w["text"]), w["text"], ", ".join(tags_von(kap, w.get("stichworte", ""))),
                   w.get("quelle", ""), w.get("projekt_id"), w.get("projekte", "[]"), u["id"], j, j)).fetchone()
    return r["id"]


def aendern(c, u, eid, b):
    """Felder ändern, Status setzen (geprüft nur mit Recht) → (Eintrag, vorher) – vorher für Rückgängig."""
    alt = c.execute("SELECT * FROM wiki_eintrag WHERE id=? AND deleted=''", (eid,)).fetchone()
    if not alt:
        raise LookupError("Eintrag nicht gefunden")
    vorher = {k: alt[k] for k in FELDER}
    w = _werte(b)
    st = b.get("status")
    if st is not None:
        if st not in STATUS:
            raise ValueError("Unbekannter Status")
        if (st == "geprueft" or alt["status"] == "geprueft") and st != alt["status"] and not darf_pruefen(u):
            raise PermissionError("Fachlich prüfen darf nur, wer das Recht „Wiki prüfen“ hat (Verwaltung → Rollen & Rechte).")
        w["status"] = st
    elif alt["status"] == "geprueft" and any(k in w and w[k] != alt[k] for k in ("text", "titel")):
        w["status"] = "zusammengefasst"   # Inhalt eines geprüften Eintrags geändert: wieder zu prüfen
    if "stichworte" in w and "tags" not in b:   # Stichworte (Lektorat, ältere Aufrufe): der erste Tag bleibt vorn
        w["stichworte"] = ", ".join(tags_von(w.get("kapitel", alt["kapitel"]), w["stichworte"]))
    if not w:
        return eintrag(c, eid), vorher
    c.execute("UPDATE wiki_eintrag SET " + ", ".join(f"{k}=?" for k in w) + ", updated=? WHERE id=?", (*w.values(), _jetzt(), eid))
    return eintrag(c, eid), vorher


def loeschen(c, eid, zurueck=False):
    c.execute("UPDATE wiki_eintrag SET deleted=?, updated=? WHERE id=?", ("" if zurueck else _jetzt(), _jetzt(), eid))


def _worte(s):
    return {w for w in re.findall(r"[a-zäöüß0-9]{3,}", (s or "").lower())}


# Wörter ohne Aussage für den Vergleich (Füllwörter, Allerwelts-Verben aus Kurztexten)
LEER = {"und", "der", "die", "das", "den", "dem", "des", "ein", "eine", "einer", "mit", "für", "von", "aus", "bei", "zum", "zur", "ohne", "inkl",
        "sowie", "oder", "bzw", "nach", "über", "unter", "auf", "als", "ist", "sind", "wird", "wurde", "nicht", "noch", "auch", "alle", "neu",
        "liefern", "einbauen", "herstellen", "montieren", "erstellen", "liefern", "stück", "gemäß", "bauseits", "vorhandene", "vorhanden"}


def _stark(texte):
    W = set()
    for x in texte or []:
        W |= _worte(str(x))
    return W - LEER


def _punkte(Q, W):
    """Wie gut passen die Suchwörter Q zu den Wörtern W? Gleiches Wort 2, Wortteil 1 – auch zusammengesetzte Wörter
    („Kellerabdichtung“ ↔ „Abdichtung“, „Keller“), Teile ab 5 Buchstaben."""
    t = 0
    for q in Q:
        if q in W:
            t += 2
        elif len(q) >= 5:
            teil = max((min(len(w), len(q)) for w in W if len(w) >= 5 and (w in q or q in w)), default=0)
            t += 2 if teil >= 8 else 1 if teil else 0   # langer gemeinsamer Teil („abdichtung“) zählt wie ein ganzes Wort
    return t


def hinweise(c, worte, n=3):
    """Geprüfte Einträge, die zu den Worten passen (Gewerk, Kurztexte, Kostengruppe …): Stichworte und Kapitel zählen doppelt.
    → [{id, titel, kapitel, kurz, treffer}] – die besten zuerst."""
    Q = _stark(worte)
    if not Q:
        return []
    out = []
    for r in c.execute("SELECT id, titel, kapitel, stichworte, substr(text, 1, 220) AS kurz FROM wiki_eintrag WHERE deleted='' AND status='geprueft'"):
        t = 2 * _punkte(Q, _worte(r["stichworte"]) | _worte(r["kapitel"])) + _punkte(Q, _worte(r["titel"]))
        if t >= 2:
            out.append({"id": r["id"], "titel": r["titel"], "kapitel": r["kapitel"], "kurz": r["kurz"], "treffer": t})
    return sorted(out, key=lambda x: -x["treffer"])[:n]


def warnung(c, u, text, worte=(), n=5):
    """Beim Eintippen (LV-Position, Vorgang im Bauzeitenplan): geprüfte Wiki-Einträge und frühere Mängel aus den Bautagebüchern
    (aller Projekte, die der Benutzer sehen darf), die zum Text passen → {wiki, maengel}."""
    Q = _stark([text])
    if not Q:
        return {"wiki": [], "maengel": []}
    wk = hinweise(c, [text, *worte], 3)
    sicht = rechte.visible_ids(c, u)
    M = []
    for r in c.execute("SELECT i.id, i.text, r.date, r.number, p.id AS pid, p.name FROM items i JOIN reports r ON r.id=i.report_id "
                       "JOIN projects p ON p.id=r.project_id WHERE i.kind='maengel' AND i.text<>'' ORDER BY r.date DESC LIMIT 5000"):
        if sicht is not None and r["pid"] not in sicht:
            continue
        t = _punkte(Q, _worte(r["text"]))
        if t >= 2:
            M.append({"text": r["text"][:200], "projekt": r["name"], "datum": r["date"], "bericht": r["number"], "treffer": t})
    M.sort(key=lambda x: str(x["datum"]), reverse=True)   # neueste zuerst, dann die besten Treffer nach vorn
    M.sort(key=lambda x: -x["treffer"])
    return {"wiki": wk, "maengel": M[:n]}


# ---------- Sammeln: Erkenntnisse aus Bautagebüchern (Mängel, Weisungen) und Mails vorschlagen lassen ----------
SYS_SAMMELN = """Du pflegst das Wiki eines Architekturbüros (Bauleitung, Ausschreibung, Planung). Du bekommst Mängel und Weisungen aus
Bautagesberichten und Auszüge aus Mails der letzten Wochen, jeweils mit Kennung in eckigen Klammern. Finde darin ERKENNTNISSE, aus denen das Büro
für künftige Projekte lernen kann: wiederkehrende Fehler, Ursachen, was man in Planung, Ausschreibung (LV) oder Bauablauf früher hätte beachten
sollen. Einzelne Alltagsmeldungen ohne Lehre (z. B. „Container voll“, Terminabsprachen) lässt du weg. Nichts erfinden, keine Normen oder Urteile
nennen, die nicht im Text stehen. Je Erkenntnis: Kapitel (eines aus der Liste, wenn es passt), kurzer Titel, Text auf Deutsch (ein Satz, was passiert
ist, dann was künftig zu tun ist als Liste mit "- "), 3–6 Stichworte, und die Kennungen der Quellen.
Antworte NUR mit JSON: {"erkenntnisse":[{"quellen":["i12","m3"],"kapitel":"…","titel":"…","text":"…","stichworte":"a, b, c"}]}"""
MAIL_THEMA = re.compile(r"mangel|mängel|maengel|schaden|reklamation|behinderung|bedenken|nachtrag|mehrkosten|undicht|riss|feucht|abnahme", re.I)


def _gesammelt(c):
    r = c.execute("SELECT data FROM bp_store WHERE key='wiki:gesammelt'").fetchone()
    try:
        return set(json.loads(r["data"])) if r else set()
    except ValueError:
        return set()


def _mails(c, u, seit):
    """Mails des Benutzers (eigene und zugewiesene Postfächer) seit … – nur Betreff und Vorschau, nur Themen mit Mängeln, Bedenken, Nachträgen."""
    from . import posteingang as PE
    out, fehler = [], []
    if PE.m365_ok(c):
        for adr in PE.m365_postfaecher_von(c, u):
            try:
                out += PE.m365_lesen(PE.m365_conf(c), adr, seit)
            except Exception as e:   # noqa: BLE001
                fehler.append(f"{adr}: {e}")
    for k in PE.postfaecher(c, u["id"])["konten"]:
        if k.get("an", True):
            try:
                out += PE.imap_lesen(k, seit)
            except Exception as e:   # noqa: BLE001
                fehler.append(f"{k.get('name') or k.get('user')}: {e}")
    return [m for m in out if MAIL_THEMA.search((m.get("betreff") or "") + " " + (m.get("vorschau") or ""))], fehler


def _seit(wochen):
    from datetime import timedelta
    return date.today() - timedelta(weeks=max(1, min(int(wochen or 8), 104)))


def quellen_bautagebuch(c, seit, da):
    """Mängel und Weisungen aus allen Bautagebüchern seit … (ohne schon gelesene)."""
    Q = []
    for r in c.execute("SELECT i.id, i.kind, i.text, r.date, r.number, p.id AS pid, p.name FROM items i JOIN reports r ON r.id=i.report_id "
                       "JOIN projects p ON p.id=r.project_id WHERE i.kind IN ('maengel','weisungen') AND r.date>=? AND trim(i.text)<>'' ORDER BY r.date",
                       (seit.isoformat(),)):
        if f"i{r['id']}" not in da:
            art = "Mangel" if r["kind"] == "maengel" else "Weisung"
            Q.append({"k": f"i{r['id']}", "pid": r["pid"], "quelle": f"Bautagebuch {r['name'][:40]} · {('Bericht ' + str(r['number'])) if r['number'] else r['date']} ({art})",
                      "zeile": f"({r['name'][:50]}, {r['date']}, {art}) {r['text'][:500]}"})
    return Q


def quellen_mails(c, u, seit, da):
    """Mails des Benutzers zu Mängeln, Bedenken, Nachträgen seit … → (Quellen, Fehler)."""
    import hashlib
    from datetime import timezone
    M, fehler = _mails(c, u, datetime.combine(seit, datetime.min.time(), timezone.utc))
    Q = []
    for m in M:
        k = "m" + hashlib.sha1(str(m.get("id") or m.get("betreff")).encode()).hexdigest()[:12]
        if k not in da:
            Q.append({"k": k, "pid": m.get("pid"), "quelle": f"Mail von {(m.get('von_name') or m.get('von') or '')[:40]}: {(m.get('betreff') or '')[:60]}",
                      "zeile": f"(Mail {str(m.get('zeit'))[:10]}, {m.get('von_name') or m.get('von')}) {m.get('betreff')}: {(m.get('vorschau') or '')[:350]}"})
    return Q, fehler


def auswerten(c, u, ki, runde):
    """Eine Runde Quellen an die KI → neue Einträge („neu“); die Quellen gelten danach als gelesen (bp_store „wiki:gesammelt“). → Zahl neuer Einträge."""
    from . import ai
    if not runde:
        return 0
    kurz = {f"q{n}": x for n, x in enumerate(runde)}
    t = ai.ask(ki, SYS_SAMMELN, "KAPITEL: " + json.dumps(kapitel(c), ensure_ascii=False) + "\nQUELLEN:\n" +
               "\n".join(f"[{k}] {x['zeile']}" for k, x in kurz.items()), max_tokens=6000, c=c, json_mode=True) or ""
    if not t.strip():
        v = {}   # keine Antwort = keine Erkenntnis in dieser Runde
    else:
        try:
            v = ai.parse_json(t) or {}
        except ai.AIError:
            raise ai.AIError("Antwort der KI nicht lesbar: " + " ".join(t.split())[:160])
    E = (v.get("erkenntnisse") or v.get("_objekte") or []) if isinstance(v, dict) else []   # abgeschnittene Antwort: gerettete Einträge
    neu = 0
    for e in E:
        if not isinstance(e, dict) or not _t(e.get("text"), 20000):
            continue
        qs = [kurz[k] for k in (e.get("quellen") or []) if k in kurz]
        q0 = qs[0] if qs else {}
        anlegen(c, u or {"id": None}, {"text": e.get("text"), "titel": e.get("titel"), "kapitel": e.get("kapitel"), "stichworte": e.get("stichworte"),
                                        "quelle": (q0.get("quelle", "gesammelt") + (f" u. {len(qs) - 1} weitere" if len(qs) > 1 else ""))[:200],
                                        "projekt_id": q0.get("pid")})
        neu += 1
    _store(c, "wiki:gesammelt", sorted(_gesammelt(c) | {x["k"] for x in runde})[-20000:])
    return neu


def sammeln(c, u, ki, wochen=8, mails=False, menge=40):
    """Eine Runde nur aus den Bautagebüchern (und auf Wunsch Mails) – für die Dienste montags. → {neu, gelesen, rest, fehler}."""
    seit, da = _seit(wochen), _gesammelt(c)
    Q, fehler = quellen_bautagebuch(c, seit, da), []
    if mails and u is not None:
        M, fehler = quellen_mails(c, u, seit, da)
        Q += M
    return {"neu": auswerten(c, u, ki, Q[:menge]), "gelesen": len(Q[:menge]), "rest": max(0, len(Q) - menge), "fehler": fehler}


# Sammeln im Hintergrund (Verwaltung → Einstellungen → Wiki): der Auftrag steht in bp_store „wiki:sammeln“, die Dienste arbeiten ihn ab
# (bautagebuch/core/wiki_dienst.py) – auch wenn niemand mehr zusieht. Am Ende ein To-do für den, der gestartet hat.
AUFTRAG = "wiki:sammeln"


def auftrag(c):
    r = c.execute("SELECT data FROM bp_store WHERE key=?", (AUFTRAG,)).fetchone()
    try:
        return json.loads(r["data"]) if r else {}
    except ValueError:
        return {}


def auftrag_setzen(c, u, b):
    A = auftrag(c)
    from datetime import timedelta
    if A.get("status") in ("wartet", "laeuft") and A.get("wann", "") > (datetime.now() - timedelta(hours=3)).strftime("%Y-%m-%dT%H:%M:%S"):   # hängt er länger, darf neu gestartet werden
        raise ValueError("Es wird gerade schon gesammelt.")
    A = {"status": "wartet", "uid": u["id"], "von": u["name"], "wochen": max(1, min(int(b.get("wochen") or 8), 104)), "mails": bool(b.get("mails")),
         "ordner": bool(b.get("ordner")), "wann": _jetzt(), "gesamt": 0, "gelesen": 0, "neu": 0, "fehler": [], "schritt": "wartet auf die Dienste"}
    _store(c, AUFTRAG, A)
    return A


def auftrag_stand(c, **kw):
    A = auftrag(c)
    A.update(kw)
    _store(c, AUFTRAG, A)
    return A


def markdown(c):
    """Das ganze Wiki als Markdown (für das PDF): Kapitel, darin die Einträge; Status in Klammern, wenn nicht geprüft."""
    rows = c.execute("SELECT e.kapitel, e.titel, e.text, e.stichworte, e.status, e.projekte FROM wiki_eintrag e "
                     "WHERE e.deleted='' ORDER BY e.kapitel=?, e.kapitel, e.titel", (WOCHEN,)).fetchall()
    out = ["# Wiki des Büros", f"Stand {date.today().strftime('%d.%m.%Y')} · {len(rows)} Einträge · geprüfte Einträge ohne Vermerk"]
    k0 = None
    for r in rows:
        if r["kapitel"] != k0:
            k0 = r["kapitel"]
            out.append(f"## {k0 or 'Ohne Kapitel'}")
        out.append(f"### {r['titel'] or 'Ohne Titel'}" + ("" if r["status"] == "geprueft" else f" ({'noch nicht geprüft' if r['status'] == 'zusammengefasst' else 'neu, ungeprüft'})"))
        for z in (r["text"] or "").splitlines():
            if z.strip():
                out.append(z.rstrip())
        pj = ", ".join(x["name"] for x in _projekte(r["projekte"]))
        extra = " · ".join(x for x in (pj and "Projekte: " + pj, r["stichworte"] and "Tags: " + r["stichworte"]) if x)
        if extra:
            out.append(extra)
    return "\n".join(out) + "\n"


# ---------- KI: Wochenzusammenfassung und Lektorat ----------
SYS_WOCHE = """Du pflegst das Wiki eines Architekturbüros (Bauleitung, Ausschreibung, Planung). Du bekommst NEUE Erkenntnisse der Woche
und die Titel der vorhandenen Einträge je Kapitel. Aufgabe:
1. Ordne jede neue Erkenntnis einem Kapitel zu (nimm ein vorhandenes, wenn es passt).
2. Führe neue Erkenntnisse zusammen, die dasselbe sagen. Ergänzt eine neue Erkenntnis einen vorhandenen Eintrag, gib dessen Titel unter "zu" an.
3. Schreibe je Ergebnis einen klaren Titel und einen sachlichen Text auf Deutsch: was ist passiert, was folgt daraus (als Liste mit "- ").
   Nichts erfinden, keine Normen oder Urteile nennen, die nicht in den Erkenntnissen stehen.
4. Schreibe "woche": 2–4 Sätze, was diese Woche gelernt wurde.
Antworte NUR mit JSON: {"eintraege":[{"ids":[Nummern der neuen Erkenntnisse],"kapitel":"…","titel":"…","text":"…","stichworte":"a, b, c","zu":"Titel oder leer"}],"woche":"…"}"""

SYS_LEKTORAT = """Du bist Lektor:in für das Wiki eines Architekturbüros. Verbessere den Eintrag: Rechtschreibung, klare kurze Sätze,
Fachbegriffe richtig, Aufbau: ein Satz, worum es geht, dann die Folgerungen als Liste mit "- ". Inhalt nicht verändern, nichts erfinden.
Schlage 3–6 Stichworte vor. Fällt dir fachlich etwas Zweifelhaftes auf, nenne es kurz unter "hinweis" (sonst leer).
Antworte NUR mit JSON: {"titel":"…","text":"…","stichworte":"a, b, c","hinweis":"…"}"""


def ki_von(c, u):
    """Gewählte KI des Benutzers; „intern“ (Regeln ohne KI) kann keine Texte schreiben → die KI im Büro (Ollama)."""
    from . import ai
    k = ai.choice_of(u, c) if u is not None else "intern"
    return "ollama" if k == "intern" else k


def woche_vorschlag(c, ki):
    """Vorschlag für die neuen Einträge (Status „neu“) → {wann, ki, woche, eintraege, ids} – gespeichert in bp_store „wiki:woche“."""
    from . import ai
    neu = c.execute("SELECT id, kapitel, titel, text, stichworte FROM wiki_eintrag WHERE deleted='' AND status='neu' ORDER BY id LIMIT 60").fetchall()
    if not neu:
        raise ValueError("Keine neuen Erkenntnisse zum Zusammenfassen.")
    da = {}
    for r in c.execute("SELECT kapitel, titel FROM wiki_eintrag WHERE deleted='' AND status<>'neu' AND kapitel<>?", (WOCHEN,)):
        da.setdefault(r["kapitel"], []).append(r["titel"])
    frage = ("KAPITEL: " + json.dumps(kapitel(c), ensure_ascii=False) + "\nVORHANDEN: " + json.dumps(da, ensure_ascii=False)[:6000] +
             "\nNEU:\n" + "\n".join(f"[{r['id']}] ({r['kapitel']}) {r['titel']}: {r['text'][:1500]}" for r in neu))
    v = ai.ask_json(ki, SYS_WOCHE, frage, max_tokens=3500, c=c) or {}
    ids = {r["id"] for r in neu}
    E = []
    for e in (v.get("eintraege") or []) if isinstance(v, dict) else []:
        if not isinstance(e, dict):
            continue
        i = [int(x) for x in (e.get("ids") or []) if str(x).isdigit() and int(x) in ids]
        if i and _t(e.get("text"), 20000):
            E.append({"ids": i, "kapitel": _t(e.get("kapitel"), 80) or "Sonstiges", "titel": _t(e.get("titel"), 200), "text": _t(e.get("text"), 20000),
                      "stichworte": _t(e.get("stichworte"), 400), "zu": _t(e.get("zu"), 200)})
    V = {"wann": _jetzt(), "ki": ki, "woche": _t((v or {}).get("woche") if isinstance(v, dict) else "", 2000), "eintraege": E, "ids": sorted(ids)}
    _store(c, "wiki:woche", V)
    return V


def _store(c, key, v):
    c.execute("INSERT INTO bp_store(key, data, updated, updated_by) VALUES(?, ?, ?, 'wiki') "
              "ON CONFLICT(key) DO UPDATE SET data=excluded.data, updated=excluded.updated, updated_by=excluded.updated_by",
              (key, json.dumps(v, ensure_ascii=False), _jetzt()))


def woche_offen(c):
    r = c.execute("SELECT data FROM bp_store WHERE key='wiki:woche'").fetchone()
    try:
        v = json.loads(r["data"]) if r else None
    except ValueError:
        v = None
    return v if v and v.get("eintraege") else None


def woche_uebernehmen(c, u, nummern):
    """Ausgewählte Vorschläge übernehmen: ergänzt einen vorhandenen Eintrag („zu“) oder wird der erste der zusammengeführten neuen;
    die übrigen gehen im ersten auf (gelöscht). Dazu ein Wochenbeitrag im Kapitel „Wochen“. → Zahl der übernommenen."""
    V = woche_offen(c)
    if not V:
        raise ValueError("Kein Vorschlag offen.")
    n, j = 0, _jetzt()
    for k, e in enumerate(V["eintraege"]):
        if nummern is not None and k not in nummern:
            continue
        lebt = [i for i in e["ids"] if c.execute("SELECT 1 FROM wiki_eintrag WHERE id=? AND deleted='' AND status='neu'", (i,)).fetchone()]
        if not lebt:
            continue
        ziel = c.execute("SELECT id, text FROM wiki_eintrag WHERE deleted='' AND status<>'neu' AND titel=? AND kapitel<>? ORDER BY id LIMIT 1",
                         (e["zu"], WOCHEN)).fetchone() if e.get("zu") else None
        if ziel:   # ergänzt einen vorhandenen Eintrag: Text dazu, wieder zu prüfen; die neuen gehen darin auf
            c.execute("UPDATE wiki_eintrag SET text=?, status='zusammengefasst', updated=? WHERE id=?", (ziel["text"].rstrip() + "\n\n" + e["text"], j, ziel["id"]))
            weg = lebt
        else:
            c.execute("UPDATE wiki_eintrag SET kapitel=?, titel=?, text=?, stichworte=?, status='zusammengefasst', updated=? WHERE id=?",
                      (e["kapitel"], e["titel"] or titel_aus(e["text"]), e["text"], ", ".join(tags_von(e["kapitel"], e["stichworte"])), j, lebt[0]))
            weg = lebt[1:]
        for i in weg:
            c.execute("UPDATE wiki_eintrag SET deleted=?, updated=? WHERE id=?", (j, j, i))
        n += 1
    if n and V.get("woche"):
        kw = date.today().isocalendar()
        c.execute("INSERT INTO wiki_eintrag(kapitel, titel, text, stichworte, quelle, status, autor, created, updated) VALUES(?,?,?,?,?,'zusammengefasst',?,?,?)",
                  (WOCHEN, f"Woche {kw[1]}/{kw[0]}", V["woche"], "", "Zusammenfassung " + V.get("ki", ""), u["id"] if u else None, j, j))
    c.execute("DELETE FROM bp_store WHERE key='wiki:woche'")
    return n


def lektorat(c, u, eid):
    from . import ai
    r = c.execute("SELECT titel, text, stichworte, kapitel FROM wiki_eintrag WHERE id=? AND deleted=''", (eid,)).fetchone()
    if not r:
        raise LookupError("Eintrag nicht gefunden")
    ki = ki_von(c, u)
    v = ai.ask_json(ki, SYS_LEKTORAT, f"KAPITEL: {r['kapitel']}\nTITEL: {r['titel']}\nSTICHWORTE: {r['stichworte']}\nTEXT:\n{r['text'][:8000]}",
                    max_tokens=2500, c=c) or {}
    v = v if isinstance(v, dict) else {}
    return {"ki": ki, "titel": _t(v.get("titel"), 200) or r["titel"], "text": _t(v.get("text"), 20000) or r["text"],
            "stichworte": _t(v.get("stichworte"), 400) or r["stichworte"], "hinweis": _t(v.get("hinweis"), 1000)}


CODE = re.compile(r"\b([A-Z]\d{3}(?:\.\d+)?)\b")


def vorschlag_aus_text(c, u, text, ordner=()):
    """Nach dem Lesen eines Dokuments (Texterkennung): Tags und Projekte, die darin vorkommen → {tags, projekte}.
    Projekte über die Projektnummer (z. B. A497) oder den vollen Namen; Projektordner vom Fileserver ebenso."""
    t = " ".join((text or "").split())
    if not t:
        return {"tags": [], "projekte": []}
    tl = t.lower()
    T = [x["tag"] for x in tags(c) if len(x["tag"]) >= 3 and (re.search(r"(?<!\w)" + re.escape(x["tag"].lower()) + r"(?!\w)", tl)
                                                               or (len(x["tag"]) >= 5 and _punkte(_worte(x["tag"]), _worte(tl)) >= 2))][:8]
    codes = set(CODE.findall(t))
    sicht = rechte.visible_ids(c, u) if u is not None else None
    P = []
    for r in c.execute("SELECT id, name FROM projects WHERE archived=0"):
        if sicht is not None and r["id"] not in sicht:
            continue
        m = CODE.match(r["name"] or "")
        if (m and m.group(1) in codes) or (len(r["name"] or "") > 8 and r["name"].lower() in tl):
            P.append({"id": r["id"], "name": r["name"]})
    da = {x["name"].lower() for x in P}
    for n in ordner:
        m = CODE.match(n or "")
        if n.lower() not in da and m and m.group(1) in codes:
            P.append({"name": n})
    return {"tags": T, "projekte": P[:6]}


SYS_ESSENZ = """Du liest ein Dokument aus einem Architekturbüro (Protokoll, Mängelrüge, Bedenkenanzeige, Nachtrag, Abnahme, Mail).
Schreibe die ESSENZ als Erkenntnis fürs Büro-Wiki: ein bis drei kurze Sätze auf Deutsch – was ist passiert, was folgt daraus für künftige Projekte.
Nichts erfinden. Wähle 2–5 Tags, bevorzugt aus der Liste VORHANDENE TAGS. Nenne die Projektnummer (z. B. A497), wenn sie im Text steht.
Antworte NUR mit JSON: {"erkenntnis":"…","tags":["…"],"projekt":"A497 oder leer"}"""


def essenz(c, text):
    """Zuerst die KI im Büro (Ollama): Essenz, Tags und Projektnummer aus dem Text – None, wenn Ollama nicht bereit ist oder nichts liefert."""
    from . import ai
    if len((text or "").strip()) < 40 or "ollama" in ai.abgeschaltet(c) or not ai.ollama_state()["ok"]:
        return None
    try:
        v = ai.ask_json("ollama", SYS_ESSENZ, "VORHANDENE TAGS: " + ", ".join(x["tag"] for x in tags(c)[:40]) + "\nDOKUMENT:\n" + text[:6000], 700, c=c) or {}
    except ai.AIError:
        return None
    if not isinstance(v, dict) or not _t(v.get("erkenntnis"), 2000):
        return None
    return {"text": _t(v.get("erkenntnis"), 2000), "tags": [_t(x, 60) for x in (v.get("tags") or []) if _t(x, 60)][:6], "projekt": _t(v.get("projekt"), 20)}


def text_aus_datei(daten, name):
    """Text eines Dokuments für die Vorbelegung: PDF (Scans per Texterkennung), Fotos per Texterkennung, Word, Text."""
    import io
    import zipfile
    from . import ablage, vorschau
    n = (name or "").lower()
    try:
        if n.endswith(".docx"):
            z = zipfile.ZipFile(io.BytesIO(daten))
            return " ".join(vorschau._absaetze(z.open("word/document.xml").read(3 * 1048576).decode("utf-8", "replace"), r"</w:p>", r"<w:t[^>]*>(.*?)</w:t>")[:80])
        if n.endswith((".txt", ".eml", ".csv")):
            return daten[:20000].decode("utf-8", "replace")
        return ablage.text_aus(daten, name) or ""
    except Exception:   # noqa: BLE001 – ohne Text keine Vorbelegung
        return ""


# ---------- Routen für alle Apps (aus head.py eingebunden): festhalten, Kapitel, Hinweise, Datei anhängen ----------
def routen(bp, _uid):
    from flask import jsonify, request
    from . import db

    @bp.get("/api/bp/wiki/kapitel")
    def bp_wiki_kapitel():
        u, _ = _uid()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        with db.tx() as c:
            return jsonify(kapitel=kapitel(c), tags=tags(c))

    def _ordner():
        from .ablage import bt_json
        try:
            r = bt_json("GET", "/api/store/folders?alle=1")
            return r if isinstance(r, list) else []
        except RuntimeError:
            return []

    @bp.get("/api/bp/wiki/projekte")
    def bp_wiki_projekte():
        """Projekte zum Ankreuzen: die der Plattform (die man sehen darf) und alle Projektordner vom Fileserver."""
        u, _ = _uid()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        with db.tx() as c:
            sicht = rechte.visible_ids(c, u)
            P = [{"id": r["id"], "name": r["name"]} for r in c.execute("SELECT id, name FROM projects WHERE archived=0 ORDER BY name")
                 if sicht is None or r["id"] in sicht]
        da = {x["name"].lower() for x in P}
        return jsonify(projekte=P, ordner=[n for n in _ordner() if n.lower() not in da])

    @bp.post("/api/bp/wiki/lesen")
    def bp_wiki_lesen():
        """{name, datei (Base64)} → Text lesen (Texterkennung) und daraus Tags und Projekte vorschlagen – nichts wird gespeichert."""
        import base64
        u, _ = _uid()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        b = request.get_json(silent=True) or {}
        try:
            daten = base64.b64decode(b.get("datei") or "")[:40 * 1048576]
        except Exception:   # noqa: BLE001
            return jsonify(error="Datei nicht lesbar"), 400
        text = text_aus_datei(daten, str(b.get("name") or ""))
        with db.tx() as c:
            E = essenz(c, text) if b.get("essenz", True) else None   # zuerst Ollama: Essenz, Tags, Projektnummer
            V = vorschlag_aus_text(c, u, text + (" " + E["projekt"] if E and E["projekt"] else ""), _ordner() if CODE.search(text or "") else ())
        if E:
            V["text"] = E["text"]
            V["tags"] = list(dict.fromkeys(E["tags"] + V["tags"]))[:8]
        return jsonify(V)

    @bp.post("/api/bp/wiki")
    def bp_wiki_festhalten():
        """{text, kapitel, titel?, stichworte?, quelle, projekt_id} → {id} – aus jeder App („?“ → „Erkenntnis fürs Wiki“)."""
        u, _ = _uid()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        try:
            with db.tx() as c:
                return jsonify(ok=True, id=anlegen(c, u, request.get_json(silent=True) or {}))
        except ValueError as e:
            return jsonify(error=str(e)), 400

    @bp.delete("/api/bp/wiki/<int:eid>")
    def bp_wiki_zurueck(eid):
        """Rückgängig nach „Festhalten“ – nur eigene, noch neue Einträge."""
        u, uid = _uid()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        with db.tx() as c:
            if not c.execute("SELECT 1 FROM wiki_eintrag WHERE id=? AND autor=? AND status='neu'", (eid, uid)).fetchone():
                return jsonify(error="Eintrag nicht gefunden"), 404
            loeschen(c, eid)
        return jsonify(ok=True)

    @bp.post("/api/bp/wiki/<int:eid>/datei")
    def bp_wiki_datei(eid):
        """Datei zum Eintrag (Base64) – das Bautagebuch legt sie auf „Bauportal/02 Wiki“ ab und merkt das Vorschaubild."""
        from .ablage import bt_json
        u, _ = _uid()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        try:
            return jsonify(bt_json("POST", f"/api/wiki/{eid}/datei", request.get_json(silent=True) or {}))
        except RuntimeError as e:
            return jsonify(error=str(e)), 502

    @bp.get("/api/bp/wiki/warnung")
    def bp_wiki_warnung():
        """?t=Kurztext&w=Gewerk → {wiki, maengel} – Hinweis beim Eintippen (Baustein wiki.js, bpWiki.warnung)."""
        u, _ = _uid()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        with db.tx() as c:
            return jsonify(warnung(c, u, (request.args.get("t") or "")[:300], (request.args.get("w") or "").split(",")[:10]))

    @bp.get("/api/bp/wiki/hinweise")
    def bp_wiki_hinweise():
        """?w=Gewerk,Kurztext,… → geprüfte Einträge, die dazu passen (für den Hinweis in AVA und Bautagebuch)."""
        u, _ = _uid()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        with db.tx() as c:
            return jsonify(hinweise=hinweise(c, (request.args.get("w") or "").split(",")[:40]))
