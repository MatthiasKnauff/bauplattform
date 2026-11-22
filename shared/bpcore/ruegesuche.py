"""Rüge aus dem Suchfeld (GO 18.11.2026, Mock „Suchfeld: Mängelrüge per Eingabe“).

„mängelrüge Wasserschaden Assenmacher“ (Reihenfolge egal) → Vorschläge für die Suche der Kopfleiste (bp/suche.js):
  Befehlswort   Mängelrüge/Rüge/Mangel → Mängelrüge · Terminrüge/Verzug → Terminrüge
  Firma         aus den Adressen und den Firmen der Mängel (Wörter, die zum Namen passen)
  Sache         die übrigen Wörter – gesucht in den offenen Mängeln der Firma, sonst im Schriftverkehr:
                gesendete Nachrichten (benachrichtigungen, Anhänge kom_datei), Vorgänge (kom_vorgang), eigener Posteingang (posteingang.lesen)
  Projekt       je Projekt, in dem die Firma vorkommt, ein Vorschlag – das wahrscheinlichste oben (Mangel passt > Schriftverkehr passt > aktuelles Projekt)
  VOB/B         nach einer unterschriebenen Abnahme der Firma im Projekt § 13 Abs. 5, sonst § 4 Abs. 7
  Hinweise      frühere Rügen an die Firma im Projekt, Abnahme
Ohne KI, feste Regeln. Abgeschickt wird nie von hier – die Vorschläge öffnen den Dialog in „Aufgaben & Mängel“.
Mit KI (nur auf Knopfdruck im Dialog, KI aus den Einstellungen, Projektschalter ki_fragen.projekt_ki): verfeinern() formuliert Mängel und Hinweise.
"""
import json
import re

from flask import jsonify, request

from . import dateien, db, rechte
from .posteingang import fold

MANGEL = re.compile(r"^(m(ae|a)ngel(r(ue|u)ge)?n?|r(ue|u)ge|reklamation)$")
TERMIN = re.compile(r"^(terminr(ue|u)ge|verzug|rueckstand|behinderung)$")
FUELL = {"an", "fuer", "wegen", "zu", "zum", "zur", "der", "die", "das", "den", "dem", "und", "mit", "bei", "von", "im", "in", "am", "firma", "schreib", "schreiben", "bitte"}
FIRMA_REST = {"gmbh", "kg", "ag", "co", "ohg", "gbr", "ug", "mbh", "e.k.", "ek", "bau", "und"}


def erkennen(q):
    """→ (art 'mangel'|'termin'|None, Wörter ohne Befehlswort und Füllwörter)"""
    art, rest = None, []
    for w in re.findall(r"[\wäöüÄÖÜß.&-]+", q or ""):
        f = fold(w).strip(".-")
        if not art and MANGEL.match(f):
            art = "mangel"
        elif not art and TERMIN.match(f):
            art = "termin"
        elif f and f not in FUELL:
            rest.append(f)
    return art, rest


def _teile(name):
    return [t for t in re.findall(r"[a-z0-9]+", fold(name)) if len(t) >= 3 and t not in FIRMA_REST]


def _passt_firma(w, name):
    return any(t.startswith(w) or (len(w) >= 5 and w in t) for t in _teile(name)) if len(w) >= 3 else False


def firmen(c, worte):
    """Firmen, deren Name zu einem der Wörter passt → [(name, contact_id|None, {wörter})], beste zuerst"""
    kand = {}
    for r in c.execute("SELECT id, name FROM contacts WHERE name<>''"):
        hit = {w for w in worte if _passt_firma(w, r["name"])}
        if hit:
            kand[fold(r["name"])] = (r["name"], r["id"], hit)
    for r in c.execute("SELECT DISTINCT company FROM items WHERE company<>'' AND kind='maengel'"):
        hit = {w for w in worte if _passt_firma(w, r["company"])}
        if hit and fold(r["company"]) not in kand:
            kand[fold(r["company"])] = (r["company"], None, hit)
    L = sorted(kand.values(), key=lambda x: (-len(x[2]), len(x[0])))
    return [x for x in L if len(x[2]) == len(L[0][2])][:3] if L else []


def _alle_woerter(text, W):
    t = fold(text)
    return bool(W) and all(w in t for w in W)


def _projekte(c, u):
    return {r["id"]: r["name"] for r in c.execute("SELECT id, name, archived FROM projects") if not r["archived"] and rechte.can_see(c, u, r["id"])}


def _maengel(c, firma, cid, pids):
    """offene Mängel der Firma in den sichtbaren Projekten"""
    f = fold(firma)
    out = []
    for r in c.execute("""SELECT i.id, i.text, i.company, i.contact_id, ct.name AS cname, r.project_id AS pid, r.date FROM items i
                          JOIN reports r ON r.id=i.report_id LEFT JOIN contacts ct ON ct.id=i.contact_id
                          WHERE i.kind='maengel' AND COALESCE(i.done,0)=0"""):
        if r["pid"] in pids and ((cid and r["contact_id"] == cid) or fold(r["company"] or r["cname"] or "") == f):
            out.append(dict(r))
    return out


def _schrift(c, u, firma, cid, pids):
    """Schriftverkehr mit der Firma: [{typ, id, pid, datum, betreff, text, eingang, anhaenge:[{id,name,mime}]}]"""
    f, out = fold(firma), []
    mails = {}
    if cid:
        k = c.execute("SELECT email FROM contacts WHERE id=?", (cid,)).fetchone()
        if k and k["email"]:
            mails[k["email"].strip().lower()] = 1
    for r in c.execute("""SELECT id, ts, contact_id, email, name, project_id, betreff, inhalt, art FROM benachrichtigungen
                          WHERE project_id IS NOT NULL ORDER BY id DESC LIMIT 4000"""):
        if r["project_id"] in pids and ((cid and r["contact_id"] == cid) or fold(r["name"]) == f or (r["email"] or "").lower() in mails):
            an = [dict(x) for x in c.execute("SELECT id, name, mime FROM kom_datei WHERE benachrichtigung_id=? ORDER BY id", (r["id"],))]
            out.append({"typ": "nachricht", "id": r["id"], "pid": r["project_id"], "datum": (r["ts"] or "")[:10], "betreff": r["betreff"] or "",
                        "text": r["inhalt"] or "", "eingang": False, "art": r["art"] or "", "anhaenge": an})
    for r in c.execute("SELECT id, project_id, art, titel, text, beteiligte, an, zeit, erstellt FROM kom_vorgang WHERE project_id IS NOT NULL AND art<>'abnahme' ORDER BY id DESC LIMIT 2000"):
        if r["project_id"] in pids and (f in fold(r["beteiligte"]) or f in fold(r["an"]) or (cid and f'"contact_id": {cid}' in (r["an"] or "")) or f in fold(r["text"])):
            an = [dict(x) for x in c.execute("SELECT id, name, mime FROM kom_datei WHERE vorgang_id=? ORDER BY id", (r["id"],))]
            out.append({"typ": "vorgang", "id": r["id"], "pid": r["project_id"], "datum": (r["zeit"] or r["erstellt"] or "")[:10], "betreff": r["titel"] or "",
                        "text": r["text"] or "", "eingang": False, "art": r["art"] or "", "anhaenge": an})
    try:
        from . import posteingang
        dom = {m.split("@")[-1] for m in mails if "@" in m}
        for m in (posteingang.lesen(c, u["id"]).get("mails") or []):
            von = (m.get("von") or "").lower()
            if m.get("pid") in pids and (von in mails or von.split("@")[-1] in dom or f in fold(m.get("von_name"))):
                out.append({"typ": "post", "id": m.get("id"), "pid": m["pid"], "datum": (m.get("zeit") or "")[:10], "betreff": m.get("betreff") or "",
                            "text": m.get("vorschau") or "", "eingang": True, "art": "mail", "anhaenge": [{"id": None, "name": n, "mime": ""} for n in (m.get("anhaenge") or [])]})
    except Exception:   # noqa: BLE001 – Posteingang ist Beiwerk
        pass
    return out


def abnahme(c, pid, firma, cid):
    """unterschriebene Abnahme der Firma im Projekt → Datum (TT.MM.JJJJ) oder ''"""
    f = fold(firma)
    for r in c.execute("SELECT daten FROM kom_vorgang WHERE project_id=? AND art='abnahme' AND status='unterschrieben' ORDER BY id DESC", (pid,)):
        try:
            d = json.loads(r["daten"] or "{}")
        except ValueError:
            continue
        erkl = d.get("erkl") or {}
        if ((cid and d.get("contact_id") == cid) or fold(d.get("firma")) == f) and not erkl.get("verweigert"):
            a = d.get("abnahme_am") or ""
            return f"{a[8:10]}.{a[5:7]}.{a[:4]}" if len(a) >= 10 else "ja"
    return ""


def fruehere(c, pid, firma, cid, art="maengelruege"):
    f = fold(firma)
    L = [r["ts"][:10] for r in c.execute("SELECT ts, contact_id, name FROM benachrichtigungen WHERE project_id=? AND art=? ORDER BY id", (pid, art))
         if (cid and r["contact_id"] == cid) or fold(r["name"]) == f]
    return L


def _de(d):
    return f"{d[8:10]}.{d[5:7]}.{d[:4]}" if d and len(d) >= 10 else ""


def _erster_satz(t):
    t = re.sub(r"\s+", " ", t or "").strip()
    t = re.sub(r"^(sehr geehrte[^,]*,|hallo[^,]*,|guten tag[^,]*,)\s*", "", t, flags=re.I)
    m = re.match(r"(.{20,220}?[.!?])(\s|$)", t)
    return (m.group(1) if m else t[:200]).strip()


def mangeltext(quelle, stichwort):
    """Mangelzeile aus Schriftverkehr: Betreff, dazu der erste Satz, wenn er etwas sagt"""
    b = re.sub(r"^((aw|re|wg|fw|fwd)\s*:\s*)+", "", (quelle.get("betreff") or "").strip(), flags=re.I)
    s = _erster_satz(quelle.get("text"))
    if s and fold(s) != fold(b) and len(s) > 15:
        return f"{b}: {s}" if b else s
    return b or s or stichwort


def suche(c, u, q, pid_akt=None):
    art, W = erkennen(q)
    if not art:
        return []
    F = firmen(c, W)
    P = _projekte(c, u)
    if not F:   # ohne Firma nur bei ausdrücklicher Rüge („Mängel“ allein ist eher eine Suche)
        if not re.search(r"r(ue|u)ge", fold(q)):
            return []
        return [{"art": art, "firma": "", "pid": pid_akt if pid_akt in P else None, "projekt": P.get(pid_akt, ""), "stichwort": " ".join(W)}]
    out = []
    for name, cid, wf in F:
        stich = [w for w in W if w not in wf]
        if art == "termin":
            pids = {m["pid"] for m in _maengel(c, name, cid, P)} | ({pid_akt} if pid_akt in P else set())
            out += [{"art": "termin", "firma": name, "pid": p, "projekt": P[p], "punkte": 1 if p == pid_akt else 0} for p in (pids or set(P) & {pid_akt})]
            continue
        M = _maengel(c, name, cid, P)
        S = _schrift(c, u, name, cid, P)
        pids = {m["pid"] for m in M} | {s["pid"] for s in S} | ({pid_akt} if pid_akt in P else set())
        for p in pids:
            treffer = [m for m in M if m["pid"] == p and _alle_woerter(m["text"], stich)]
            quelle = None
            if not treffer and stich:
                qs = sorted([s for s in S if s["pid"] == p and _alle_woerter(s["betreff"] + " " + s["text"], stich)], key=lambda s: s["datum"], reverse=True)
                quelle = qs[0] if qs else None
            ab = abnahme(c, p, name, cid)
            fr = fruehere(c, p, name, cid)
            h = []
            if ab:
                h.append(f"Abnahme {'am ' + ab if ab != 'ja' else 'erfolgt'} – daher § 13 Abs. 5 VOB/B.")
            if fr:
                h.append(f"An diese Firma ging in diesem Projekt schon {len(fr)} Mängelrüge{'n' if len(fr) > 1 else ''} (zuletzt {_de(fr[-1])}).")
            v = {"art": "mangel", "firma": name, "contact_id": cid, "pid": p, "projekt": P[p], "grund": "vob13" if ab else "vob4",
                 "stichwort": " ".join(stich), "mangel_ids": [m["id"] for m in treffer], "mangel": treffer[0]["text"] if treffer else "",
                 "offen": sum(1 for m in M if m["pid"] == p), "hinweise": h,
                 "punkte": (3 if treffer else 2 if quelle else 0) + (1 if p == pid_akt else 0) + (0.5 if any(m["pid"] == p for m in M) else 0)}
            if quelle:
                v["quelle"] = {k: quelle[k] for k in ("typ", "id", "datum", "betreff", "eingang", "art")}
                v["quelle"]["anhaenge"] = [a for a in quelle["anhaenge"] if a.get("id")][:12]
                v["quelle"]["anhaenge_namen"] = [a["name"] for a in quelle["anhaenge"]][:12]
                v["frei"] = mangeltext(quelle, " ".join(stich))
            elif not treffer and stich:
                v["frei"] = " ".join(w.capitalize() if i == 0 else w for i, w in enumerate(q_rest(q, stich)))
            out.append(v)
    out.sort(key=lambda v: -v.get("punkte", 0))
    return out[:4]


def q_rest(q, stich):
    """Stichwort in der Schreibweise der Eingabe (Groß-/Kleinschreibung, Umlaute)"""
    ws = re.findall(r"[\wäöüÄÖÜß.&-]+", q or "")
    return [w for w in ws if fold(w) in stich] or stich


# ---------------------------------------------------------------- KI (nur auf Knopfdruck im Dialog)
SYSTEM = ("Du hilfst einer Bauleitung, eine Mängelrüge nach VOB/B vorzubereiten. Antworte NUR mit JSON: "
          '{"maengel": ["…"], "hinweise": ["…"]}. maengel: jeder Mangel eine knappe, sachliche Zeile (Ort, Bauteil, Schaden; kein Rechtstext, '
          "keine Fristen, nichts erfinden, was nicht im Text steht). hinweise: höchstens drei kurze Hinweise für die Bauleitung, nur wenn der Text "
          "sie hergibt (z. B. die Firma bestreitet den Mangel, hat Beseitigung zugesagt, nennt einen Termin). Deutsch.")


def verfeinern(c, u, pid, text, zeilen, ki=None):
    from . import ai, ki_stufe
    if ki in ki_stufe.STUFEN:   # KI-Schieber am Knopf (19.11.2026): die erlaubte Stufe gilt (Verwaltung → Projekt → Stelle)
        st = ki_stufe.stufe(c, pid, ki)
        if st == "aus":
            raise ValueError("Ohne KI gibt es nichts zu verfeinern – die Textbausteine stehen schon im Brief.")
        prov = ki_stufe.anbieter(c, st, u)
        if not prov:
            raise ValueError("Die KI im Büro antwortet gerade nicht." if st == "buero" else "Keine externe KI eingerichtet.")
        return _verfeinern(c, prov, text, zeilen)
    prov = ai.choice_of(u, c)
    if prov == "intern":
        raise ValueError("Keine KI eingestellt – ⚙ → Persönlich → KI.")
    if prov != "ollama" and not pk["extern"]:
        if not ai.ollama_state()["ok"]:
            raise ValueError("Externe KI ist für dieses Projekt nicht freigegeben, die KI im Büro antwortet nicht.")
        prov = "ollama"
    return _verfeinern(c, prov, text, zeilen)


def _verfeinern(c, prov, text, zeilen):
    from . import ai
    eingabe = ("Schriftverkehr:\n" + (text or "")[:6000] + "\n\nBisherige Mangelzeilen:\n" + "\n".join(zeilen or [])[:3000]).strip()
    d = ai.ask_json(prov, SYSTEM, eingabe, max_tokens=900, c=c, zweck="ruege")
    M = [re.sub(r"\s+", " ", str(x)).strip()[:500] for x in (d.get("maengel") or []) if str(x).strip()][:20]
    H = [re.sub(r"\s+", " ", str(x)).strip()[:300] for x in (d.get("hinweise") or []) if str(x).strip()][:3]
    return {"maengel": M, "hinweise": H, "ki": prov}


def quelle_text(c, u, typ, qid):
    """voller Text einer Quelle (für die KI) – nur, was der Benutzer sehen darf"""
    if typ == "nachricht":
        r = c.execute("SELECT project_id, betreff, inhalt FROM benachrichtigungen WHERE id=?", (qid,)).fetchone()
        return (r["betreff"] + "\n" + r["inhalt"], r["project_id"]) if r else ("", None)
    if typ == "vorgang":
        r = c.execute("SELECT project_id, titel, text FROM kom_vorgang WHERE id=?", (qid,)).fetchone()
        return (r["titel"] + "\n" + r["text"], r["project_id"]) if r else ("", None)
    if typ == "post":
        from . import posteingang
        m = next((m for m in posteingang.lesen(c, u["id"]).get("mails") or [] if m.get("id") == qid), None)
        return ((m.get("betreff") or "") + "\n" + (m.get("suchtext") or m.get("vorschau") or ""), m.get("pid")) if m else ("", None)
    return "", None


def anhaenge(c, u, typ, qid, ids):
    """Anhänge einer Quelle als (name, mime, bytes) – nur die angefragten, nur aus dieser Quelle"""
    spalte = {"nachricht": "benachrichtigung_id", "vorgang": "vorgang_id"}.get(typ)
    if not spalte or not ids:
        return []
    _, pid = quelle_text(c, u, typ, qid)
    if pid and not rechte.can_see(c, u, pid):
        return []
    return [(r["name"], r["mime"], dateien.inhalt(c, r)) for r in c.execute(
        f"SELECT name, mime, data, datei_ref FROM kom_datei WHERE {spalte}=? AND id IN ({','.join('?' * len(ids))}) ORDER BY id", (qid, *ids))]


def routen(bp, user):
    @bp.get("/api/bp/ruege/suche")
    def ruege_suche():
        u = user()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        if rechte.app_stufe(u, "aufgaben") != "an":
            return jsonify([])
        with db.tx() as c:
            return jsonify(suche(c, u, request.args.get("q", "")[:200], request.args.get("pid", type=int)))

    @bp.post("/api/bp/ruege/ki")
    def ruege_ki():
        u = user()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        b = request.get_json(silent=True) or {}
        pid = b.get("pid") if isinstance(b.get("pid"), int) else None
        with db.tx() as c:
            if pid and not rechte.can_see(c, u, pid):
                return jsonify(error="Projekt nicht gefunden"), 404
            q = b.get("quelle") if isinstance(b.get("quelle"), dict) else {}
            text, qpid = quelle_text(c, u, q.get("typ"), q.get("id")) if q else ("", None)
            if qpid and qpid != pid:
                text = ""
            zeilen = [str(z)[:500] for z in (b.get("zeilen") or []) if str(z).strip()][:40]
            if not text and not zeilen:
                return jsonify(error="Nichts zum Verfeinern – erst einen Mangel eintragen."), 400
            try:
                return jsonify(verfeinern(c, u, pid, text, zeilen, b.get("ki")))
            except ValueError as e:
                return jsonify(error=str(e)), 400
            except Exception as e:   # noqa: BLE001 – KI nicht erreichbar u. Ä.
                return jsonify(error=f"Die KI hat nicht geantwortet ({e})."), 502


# ---------------------------------------------------------------- Brief: Bezug auf den Schriftverkehr, dessen Anhänge als Anlage
def bezug_satz(bz):
    """bz = {datum: JJJJ-MM-TT, eingang: bool, typ} → Satz für das Anschreiben (leer ohne Datum)"""
    if not isinstance(bz, dict) or not re.match(r"\d{4}-\d{2}-\d{2}$", str(bz.get("datum") or "")):
        return ""
    d = _de(bz["datum"])
    if bz.get("eingang"):
        return f"Wir beziehen uns auf Ihre Nachricht vom {d}."
    if bz.get("typ") == "vorgang":
        return f"Auf die Mängel hatten wir Sie bereits am {d} hingewiesen."
    return f"Wie Ihnen bereits mit Schreiben vom {d} mitgeteilt, bestehen die Mängel weiterhin."


def vermerk(bz):
    """kurzer Vermerk für den Mangel im Bautagebuch: woher er kam"""
    if not bezug_satz(bz):
        return ""
    d = _de(bz["datum"])
    return f"gemeldet per Mail am {d}" if bz.get("eingang") else f"festgehalten am {d}" if bz.get("typ") == "vorgang" else f"angeschrieben am {d}"


def mit_bezug(text, bz):
    s = bezug_satz(bz)
    if not s:
        return text
    for marke in (" festgestellt. ", " aufgetreten. "):
        if marke in text:
            return text.replace(marke, marke + s + " ", 1)
    return text


def anlagen_anhaengen(c, u, anl, pdf):
    """anl = {typ, id, ids}: Bilder je eine Seite, PDFs mit allen Seiten hinter den Brief → neues PDF (unverändert ohne Anlagen)"""
    if not isinstance(anl, dict):
        return pdf
    ids = [int(x) for x in anl.get("ids") or [] if str(x).isdigit()][:12]
    D = anhaenge(c, u, anl.get("typ"), anl.get("id"), ids)
    if not D:
        return pdf
    import io
    from pypdf import PdfReader, PdfWriter
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.lib.utils import ImageReader
    from reportlab.pdfgen import canvas
    w = PdfWriter()
    for s in PdfReader(io.BytesIO(pdf)).pages:
        w.add_page(s)
    for name, mime, data in D:
        try:
            if (mime or "").startswith("image/") or re.search(r"\.(jpe?g|png|gif|webp)$", name or "", re.I):
                buf = io.BytesIO(); cv = canvas.Canvas(buf, pagesize=A4); W, H = A4
                ir = ImageReader(io.BytesIO(data)); iw, ih = ir.getSize(); bw, bh = W - 40 * mm, H - 50 * mm
                sc = min(bw / iw, bh / ih, 1.0 if iw > bw else bw / iw)
                cv.setFont("Helvetica-Bold", 11); cv.drawString(20 * mm, H - 18 * mm, f"Anlage – {name}"[:110])
                cv.drawImage(ir, 20 * mm, H - 28 * mm - ih * sc, iw * sc, ih * sc); cv.save()
                for s in PdfReader(io.BytesIO(buf.getvalue())).pages:
                    w.add_page(s)
            elif (mime or "") == "application/pdf" or (name or "").lower().endswith(".pdf"):
                for s in PdfReader(io.BytesIO(data)).pages[:30]:
                    w.add_page(s)
        except Exception as e:   # noqa: BLE001 – eine kaputte Anlage soll den Brief nicht verhindern
            print("Rüge: Anlage übersprungen:", name, e, flush=True)
    out = io.BytesIO(); w.write(out)
    return out.getvalue()
