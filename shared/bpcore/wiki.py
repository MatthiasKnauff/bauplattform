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
FELDER = ("kapitel", "titel", "text", "stichworte", "quelle", "projekt_id", "status")


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


def _zeile(r, n=None):
    d = dict(r)
    if n is not None:
        d["dateien"] = n
    return d


def liste(c, q="", status=""):
    """Alle Einträge (ohne gelöschte) für den Baum – Text gekürzt, mit Projektname und Zahl der Dateien."""
    W, A = ["e.deleted=''"], []
    if status in STATUS:
        W.append("e.status=?")
        A.append(status)
    for w in [x for x in re.split(r"\s+", (q or "").strip()) if x][:6]:
        W.append("(e.titel ILIKE ? OR e.text ILIKE ? OR e.stichworte ILIKE ? OR e.kapitel ILIKE ? OR COALESCE(p.name,'') ILIKE ?)")
        A += ["%" + w + "%"] * 5
    rows = c.execute("SELECT e.id, e.kapitel, e.titel, substr(e.text, 1, 160) AS kurz, e.stichworte, e.quelle, e.projekt_id, e.status, e.autor, "
                     "e.created, e.updated, COALESCE(p.name,'') AS projekt, (SELECT count(*) FROM wiki_datei d WHERE d.eintrag=e.id AND d.deleted='') AS dateien "
                     "FROM wiki_eintrag e LEFT JOIN projects p ON p.id=e.projekt_id WHERE " + " AND ".join(W) +
                     " ORDER BY e.kapitel, e.titel", A).fetchall()
    return [dict(r) for r in rows]


def eintrag(c, eid):
    r = c.execute("SELECT e.*, COALESCE(p.name,'') AS projekt, COALESCE(u.name,'') AS autor_name FROM wiki_eintrag e "
                  "LEFT JOIN projects p ON p.id=e.projekt_id LEFT JOIN users u ON u.id=e.autor WHERE e.id=?", (eid,)).fetchone()
    if not r:
        return None
    d = dict(r)
    d["dateien"] = [dict(x) for x in c.execute("SELECT id, name, pfad, mime, groesse, (vorschau IS NOT NULL) AS bild, created FROM wiki_datei "
                                                "WHERE eintrag=? AND deleted='' ORDER BY id", (eid,)).fetchall()]
    return d


def _werte(b):
    w = {}
    if "kapitel" in b:
        w["kapitel"] = _t(b["kapitel"], 80) or "Sonstiges"
    if "titel" in b:
        w["titel"] = _t(b["titel"], 200)
    if "text" in b:
        w["text"] = _t(b["text"], 20000)
    if "stichworte" in b:
        w["stichworte"] = ", ".join(x.strip() for x in re.split(r"[,;·\n]+", _t(b["stichworte"], 400)) if x.strip())
    if "quelle" in b:
        w["quelle"] = _t(b["quelle"], 200)
    if "projekt_id" in b:
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
    r = c.execute("INSERT INTO wiki_eintrag(kapitel, titel, text, stichworte, quelle, projekt_id, status, autor, created, updated) "
                  "VALUES(?,?,?,?,?,?,'neu',?,?,?) RETURNING id",
                  (w.get("kapitel") or "Sonstiges", w.get("titel") or titel_aus(w["text"]), w["text"], w.get("stichworte", ""),
                   w.get("quelle", ""), w.get("projekt_id"), u["id"], j, j)).fetchone()
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
    if not w:
        return eintrag(c, eid), vorher
    c.execute("UPDATE wiki_eintrag SET " + ", ".join(f"{k}=?" for k in w) + ", updated=? WHERE id=?", (*w.values(), _jetzt(), eid))
    return eintrag(c, eid), vorher


def loeschen(c, eid, zurueck=False):
    c.execute("UPDATE wiki_eintrag SET deleted=?, updated=? WHERE id=?", ("" if zurueck else _jetzt(), _jetzt(), eid))


def _worte(s):
    return {w for w in re.findall(r"[a-zäöüß0-9]{3,}", (s or "").lower())}


def hinweise(c, worte, n=3):
    """Geprüfte Einträge, die zu den Worten passen (Gewerk, Kurztexte, Kostengruppe …): Stichworte, Titel und Kapitel zählen.
    → [{id, titel, kapitel, kurz, treffer}] – die besten zuerst."""
    W = set()
    for x in worte or []:
        W |= _worte(str(x))
    W -= {"und", "der", "die", "das", "mit", "für", "von", "aus", "bei", "zum", "zur", "ohne", "inkl", "liefern", "einbauen", "herstellen"}
    if not W:
        return []
    out = []
    for r in c.execute("SELECT id, titel, kapitel, stichworte, substr(text, 1, 220) AS kurz FROM wiki_eintrag WHERE deleted='' AND status='geprueft'"):
        sw, ti = _worte(r["stichworte"]) | _worte(r["kapitel"]), _worte(r["titel"])
        t = 2 * len(W & sw) + len(W & ti)
        if t:
            out.append({"id": r["id"], "titel": r["titel"], "kapitel": r["kapitel"], "kurz": r["kurz"], "treffer": t})
    return sorted(out, key=lambda x: -x["treffer"])[:n]


def markdown(c):
    """Das ganze Wiki als Markdown (für das PDF): Kapitel, darin die Einträge; Status in Klammern, wenn nicht geprüft."""
    rows = c.execute("SELECT e.kapitel, e.titel, e.text, e.stichworte, e.status, COALESCE(p.name,'') AS projekt FROM wiki_eintrag e "
                     "LEFT JOIN projects p ON p.id=e.projekt_id WHERE e.deleted='' ORDER BY e.kapitel=?, e.kapitel, e.titel", (WOCHEN,)).fetchall()
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
        extra = " · ".join(x for x in (r["projekt"] and "Projekt: " + r["projekt"], r["stichworte"] and "Stichworte: " + r["stichworte"]) if x)
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
                      (e["kapitel"], e["titel"] or titel_aus(e["text"]), e["text"], e["stichworte"], j, lebt[0]))
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
            return jsonify(kapitel=kapitel(c))

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

    @bp.get("/api/bp/wiki/hinweise")
    def bp_wiki_hinweise():
        """?w=Gewerk,Kurztext,… → geprüfte Einträge, die dazu passen (für den Hinweis in AVA und Bautagebuch)."""
        u, _ = _uid()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        with db.tx() as c:
            return jsonify(hinweise=hinweise(c, (request.args.get("w") or "").split(",")[:40]))
