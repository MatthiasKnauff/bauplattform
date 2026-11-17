"""Bauherrenportal – Aussehen (Büro) und Kopf je Projekt (GO 17.11.2026, Entwurf „Bauherrenportal neu“, alles wie vorgeschlagen):
  A1  Startseite: Titelbild (Foto oder Zeichnung – „im Kopf soll ein Foto/eine Zeichnung hinterlegt werden können“), Bauphasen
      („Wo stehen wir?“), Kacheln je Bereich mit „neu“, „Neu seit Ihrem letzten Besuch“, Ansprechperson
  B1  Logo und Name aus dem Büro (logo.druck, settings office_name), Akzentfarbe wählbar
  C   sparsam als Vorgabe: Termine nur Bauphasen und Meilensteine (termine_filtern, je Projekt „alle Leistungen“ möglich)
  D1  wöchentliche Zusammenfassung per Mail – nur mit Schalter je Projekt (Vorgabe aus), verschickt der Kern (wochenmail)
  E   Anrede „Sie“/„du“ fürs Büro, je Projekt abweichend

Gespeichert im Büro: bp_store „bauherren:aussehen“ {farbe, anrede, gruss}, „bauherren:kopf:<pid>“ {ansprech, phasen, termine, mail,
anrede, bild_text}, Titelbild in bh_datei („kopf:<pid>“, JPEG). Ans Portal geht nur, was es zeigt (portal_aussehen, portal_kopf) –
geändert wird erkannt über einen Fingerabdruck (offen/gesendet), nie Zugangsdaten des Büros.
"""
import base64
import hashlib
import io
import json
from datetime import date, datetime, timedelta

FARBEN = ["#3b5a8f", "#7a5c2e", "#2e7d5b", "#6b4c8a", "#a0442c", "#33475b"]
AUSSEHEN_STD = {"farbe": FARBEN[0], "anrede": "Sie", "gruss": ""}
KOPF_STD = {"ansprech": None, "phasen": True, "termine": "phasen", "mail": "aus", "anrede": "", "bild_text": ""}
TERMINE = {"phasen": "nur Bauphasen und Meilensteine", "alle": "alle Leistungen"}
BILD_MAX = 1600   # Pixel Breite des Titelbilds


def _t(v, n):
    return str(v if v is not None else "").strip()[:n]


def _st(c, k, v=None):
    from .bauherren import _store
    return _store(c, k, v)


def aussehen(c):
    A = {**AUSSEHEN_STD, **(_st(c, "bauherren:aussehen") or {})}
    return {"farbe": A["farbe"] if A["farbe"] in FARBEN else FARBEN[0], "anrede": "du" if A["anrede"] == "du" else "Sie", "gruss": _t(A["gruss"], 600), "farben": FARBEN}


def aussehen_setzen(c, b):
    A = aussehen(c)
    if b.get("farbe") in FARBEN:
        A["farbe"] = b["farbe"]
    if b.get("anrede") in ("Sie", "du"):
        A["anrede"] = b["anrede"]
    if "gruss" in b:
        A["gruss"] = _t(b["gruss"], 600)
    _st(c, "bauherren:aussehen", {k: A[k] for k in AUSSEHEN_STD})
    return aussehen(c)


def kopf(c, pid):
    K = {**KOPF_STD, **(_st(c, f"bauherren:kopf:{int(pid)}") or {})}
    K["termine"] = K["termine"] if K["termine"] in TERMINE else "phasen"
    K["mail"] = "woche" if K["mail"] == "woche" else "aus"
    K["anrede"] = K["anrede"] if K["anrede"] in ("Sie", "du") else ""
    K["bild"] = bool(c.execute("SELECT 1 FROM bh_datei WHERE schluessel=?", (f"kopf:{int(pid)}",)).fetchone())
    return K


def kopf_setzen(c, pid, b):
    K = {k: v for k, v in kopf(c, pid).items() if k in KOPF_STD}
    if "ansprech" in b:
        K["ansprech"] = int(b["ansprech"]) if str(b.get("ansprech") or "").isdigit() else None
    for k in ("phasen",):
        if k in b:
            K[k] = bool(b[k])
    if b.get("termine") in TERMINE:
        K["termine"] = b["termine"]
    if b.get("mail") in ("aus", "woche"):
        K["mail"] = b["mail"]
    if b.get("anrede") in ("", "Sie", "du"):
        K["anrede"] = b["anrede"]
    if "bild_text" in b:
        K["bild_text"] = _t(b["bild_text"], 200)
    _st(c, f"bauherren:kopf:{int(pid)}", K)
    return kopf(c, pid)


def bild_aus(data, mime, breite=None):
    """Foto (JPEG/PNG/WEBP/HEIC) oder Zeichnung (PDF, erste Seite) → JPEG, höchstens breite (Vorgabe BILD_MAX) Pixel breit."""
    mb = breite or BILD_MAX
    from PIL import Image
    if mime == "application/pdf" or data[:5] == b"%PDF-":
        import pypdfium2 as pdfium
        doc = pdfium.PdfDocument(data)
        s = doc[0]
        im = s.render(scale=min(4.0, mb / max(1.0, s.get_width()))).to_pil()
    else:
        try:
            import pillow_heif
            pillow_heif.register_heif_opener()
        except Exception:   # noqa: BLE001 – ohne HEIC-Unterstützung gehen die anderen Formate
            pass
        im = Image.open(io.BytesIO(data))
        try:
            from PIL import ImageOps
            im = ImageOps.exif_transpose(im)
        except Exception:   # noqa: BLE001
            pass
    im = im.convert("RGB")
    if im.width > mb:
        im = im.resize((mb, round(im.height * mb / im.width)))
    out = io.BytesIO()
    im.save(out, "JPEG", quality=80, optimize=True, progressive=True)
    return out.getvalue()


def titelbild_setzen(c, pid, name, mime, data):
    from .bauherren import datei_speichern
    if data is None:
        datei_speichern(c, f"kopf:{int(pid)}", [])
        return kopf(c, pid)
    if len(data) > 40 * 1024 * 1024:
        raise ValueError("Die Datei ist zu groß (höchstens 40 MB).")
    try:
        jpg = bild_aus(data, mime)
    except Exception as e:   # noqa: BLE001
        raise ValueError("Das Bild ließ sich nicht lesen – bitte ein Foto (JPG, PNG, HEIC) oder eine Zeichnung als PDF.") from e
    datei_speichern(c, f"kopf:{int(pid)}", [(_t(name, 200) or "Titelbild.jpg", "image/jpeg", jpg)])
    return kopf(c, pid)


def titelbild(c, pid):
    r = c.execute("SELECT inhalt FROM bh_datei WHERE schluessel=? ORDER BY nr LIMIT 1", (f"kopf:{int(pid)}",)).fetchone()
    return bytes(r["inhalt"]) if r and r["inhalt"] else None


def _logo(c):
    """Logo des Büros klein für den Kopf des Portals (PNG, 96 Pixel hoch) als data:-Adresse – oder ''."""
    try:
        from PIL import Image
        from . import logo
        roh = logo.druck(c)
        if not roh:
            return ""
        im = Image.open(io.BytesIO(roh)).convert("RGBA")
        if im.height > 96:
            im = im.resize((max(1, round(im.width * 96 / im.height)), 96))
        out = io.BytesIO()
        im.save(out, "PNG", optimize=True)
        return "data:image/png;base64," + base64.b64encode(out.getvalue()).decode()
    except Exception:   # noqa: BLE001 – ohne Logo: nur der Name
        return ""


def portal_aussehen(c):
    A = aussehen(c)
    S = {r["key"]: r["value"] or "" for r in c.execute("SELECT key, value FROM settings WHERE key IN ('office_name','co_short')").fetchall()}
    return {"buero": S.get("office_name") or S.get("co_short") or "", "logo": _logo(c), "farbe": A["farbe"], "anrede": A["anrede"], "gruss": A["gruss"]}


def _phasen(c, pid):
    from . import modell, rueckweg
    T = (modell.lesen(c, pid)["modell"].get("termine") or {}).get("phasen") or {}
    return [{"n": n, "von": T[k]["von"], "bis": T[k]["bis"]} for k, n in rueckweg.PHASEN if k in T and T[k].get("von") and T[k].get("bis")]


def portal_kopf(c, pid):
    from . import konto
    K = kopf(c, pid)
    out = {"bild": "", "bild_text": K["bild_text"], "anrede": K["anrede"], "phasen": _phasen(c, pid) if K["phasen"] else [], "ansprech": None}
    b = titelbild(c, pid)
    if b:
        out["bild"] = "data:image/jpeg;base64," + base64.b64encode(b).decode()
    if K["ansprech"]:
        u = c.execute("SELECT id, name, vorname, nachname, email FROM users WHERE id=? AND active=1", (K["ansprech"],)).fetchone()
        if u:
            P = konto.prefs(c, u["id"])
            tel = P.get("telefon") or (c.execute("SELECT value FROM settings WHERE key='co_phone'").fetchone() or {"value": ""})["value"]
            out["ansprech"] = {"name": " ".join(x for x in (u["vorname"], u["nachname"]) if x) or u["name"], "funktion": _t(P.get("funktion"), 80),
                               "tel": _t(tel, 60), "mail": _t(u["email"], 200)}
    return out


def _h(d):
    return hashlib.sha1(json.dumps(d, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def offen(c, pids):
    """Was das Portal noch nicht hat: (aussehen | None, {pid: kopf}) – über Fingerabdrücke („bauherren:gesendet“)."""
    G = _st(c, "bauherren:gesendet") or {}
    A = portal_aussehen(c)
    K = {}
    for pid in pids:
        k = portal_kopf(c, int(pid))
        if G.get(f"kopf:{pid}") != _h(k):
            K[str(pid)] = k
    return (A if G.get("aussehen") != _h(A) else None), K


def gesendet(c, A, K):
    G = _st(c, "bauherren:gesendet") or {}
    if A is not None:
        G["aussehen"] = _h(A)
    for pid, k in K.items():
        G[f"kopf:{pid}"] = _h(k)
    _st(c, "bauherren:gesendet", G)


def termine_filtern(c, pid, daten):
    """Termine für die Bauherr:innen: Vorgabe nur Gruppen (Bauphasen, „▸ …“) und Meilensteine (Ende „–“); je Projekt „alle“."""
    if kopf(c, pid)["termine"] == "alle" or not isinstance(daten, dict):
        return daten
    if isinstance(daten.get("zeitplan"), dict):   # Balkenplan: nur Gruppen und Meilensteine (bpcore/zeitplan.nur_phasen)
        from .zeitplan import nur_phasen
        R = nur_phasen(daten["zeitplan"].get("zeilen") or [])
        if R:
            daten = {**daten, "zeitplan": {**daten["zeitplan"], "zeilen": R}}
    if not isinstance(daten.get("zeilen"), list) or len(daten["zeilen"]) < 2:
        return daten
    kopfz, Z = daten["zeilen"][0], daten["zeilen"][1:]
    W = [z for z in Z if isinstance(z, list) and z and (str(z[0]).startswith("▸") or (len(z) > 2 and str(z[2]).strip() in ("–", "-", "")))]
    return {**daten, "zeilen": [kopfz] + [[str(z[0]).lstrip("▸ ").strip(), *z[1:]] for z in W]} if W else daten


def wochenmail(c, mail_senden, heute=None, url=""):
    """Montags je Projekt mit Schalter „wöchentlich“: Mail an die aktiven Bauherr:innen, was in der letzten Woche neu freigegeben wurde.
    Nichts Neues → keine Mail. Höchstens einmal je Woche (bauherren:woche:<pid>). Gibt die Zahl der Mails zurück."""
    heute = heute or date.today()
    if heute.weekday() != 0:
        return 0
    woche, n = heute.strftime("%G-%V"), 0
    A = aussehen(c)
    for r in c.execute("SELECT key FROM bp_store WHERE key LIKE 'bauherren:kopf:%'").fetchall():
        pid = int(r["key"].rsplit(":", 1)[1])
        K = kopf(c, pid)
        if K["mail"] != "woche" or (_st(c, f"bauherren:woche:{pid}") or {}).get("woche") == woche:
            continue
        seit = (datetime.combine(heute, datetime.min.time()) - timedelta(days=7)).strftime("%Y-%m-%dT%H:%M:%S")
        F = c.execute("SELECT titel FROM bh_freigabe WHERE project_id=? AND geloescht='' AND updated>=? ORDER BY updated DESC LIMIT 30", (pid, seit)).fetchall()
        _st(c, f"bauherren:woche:{pid}", {"woche": woche})
        if not F:
            continue
        p = c.execute("SELECT name FROM projects WHERE id=?", (pid,)).fetchone()
        du = (K["anrede"] or A["anrede"]) == "du"
        liste = "\n".join("– " + x["titel"] for x in F)
        text = (f"Hallo,\n\nim Bauherrenportal gibt es Neues zu {p['name'] if p else 'deinem Projekt'}:\n\n{liste}\n\n"
                + ("Schau gern rein" if du else "Schauen Sie gern hinein") + (f": {url}" if url else ".") + "\n\nViele Grüße")
        for k in c.execute("SELECT email FROM bh_konto WHERE project_id=? AND aktiv=1", (pid,)).fetchall():
            try:
                mail_senden(k["email"], f"Neues im Bauherrenportal – {p['name'] if p else 'Projekt'}", text)
                n += 1
            except Exception:   # noqa: BLE001 – nächste Woche wieder; der Abgleich meldet Mailfehler ohnehin
                pass
    return n


def routen(bp, wer):
    from flask import Response, jsonify, request
    from . import db

    @bp.route("/api/bp/bauherren/aussehen", methods=["GET", "PUT"])
    def bh_aussehen():
        u, f = wer()
        if f:
            return f
        with db.tx() as c:
            return jsonify(aussehen_setzen(c, request.get_json(silent=True) or {}) if request.method == "PUT" else aussehen(c))

    @bp.route("/api/bp/bauherren/projekt/<int:pid>/kopf", methods=["GET", "PUT"])
    def bh_kopf(pid):
        u, f = wer()
        if f:
            return f
        with db.tx() as c:
            K = kopf_setzen(c, pid, request.get_json(silent=True) or {}) if request.method == "PUT" else kopf(c, pid)
            L = [{"id": r["id"], "name": " ".join(x for x in (r["vorname"], r["nachname"]) if x) or r["name"]}
                 for r in c.execute("SELECT id, name, vorname, nachname FROM users WHERE active=1 ORDER BY nachname, vorname, name").fetchall()]
            return jsonify({**K, "leute": L, "termine_wahl": TERMINE})

    @bp.route("/api/bp/bauherren/projekt/<int:pid>/titelbild", methods=["GET", "POST", "DELETE"])
    def bh_titelbild(pid):
        u, f = wer()
        if f:
            return f
        try:
            with db.tx() as c:
                if request.method == "GET":
                    b = titelbild(c, pid)
                    return Response(b, mimetype="image/jpeg", headers={"Cache-Control": "no-store"}) if b else (jsonify(error="Kein Titelbild."), 404)
                if request.method == "DELETE":
                    return jsonify(titelbild_setzen(c, pid, "", "", None))
                x = request.files.get("datei")
                if not x:
                    return jsonify(error="Bitte ein Foto oder eine Zeichnung (PDF) wählen."), 400
                return jsonify(titelbild_setzen(c, pid, x.filename, (x.mimetype or "").split(";")[0], x.read()))
        except ValueError as e:
            return jsonify(error=str(e)), 400
