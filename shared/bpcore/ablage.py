"""Datei ablegen – in allen Apps: Datei ins Fenster ziehen → Ordner im Projektordner und Dateinamen vorschlagen, dann ablegen.

Vorschläge für den Ordner (beste zuerst): wo frühere Stände desselben Plans liegen (Plannummer aus Dateiname oder Plankopf),
wo Pläne derselben Kennung und Phase liegen, Ordner, deren Name im Plankopf vorkommt oder zum erkannten Gewerk passt.
Namen: Projektkürzel vorne, Unterstriche raus; bei Scannernamen („Scan_0457“) ein Titel aus der ersten Zeile des PDFs mit Datum.
Abgelegt wird über das Bautagebuch, das die Ablage kennt (/api/ablage/datei, nie überschreiben: gleicher Name → „(2)“).
"""
import io, json, re
from collections import Counter
from datetime import date

from . import planname


def plan_conf(c):
    """Kennungen und Stichwörter der Planliste (für das Gewerk) – Vorgaben, ergänzt um die Einstellungen von „Pläne & Dateien“."""
    out = json.loads(json.dumps(planname.STANDARD))
    r = c.execute("SELECT data FROM bp_store WHERE key='plaene'").fetchone()
    try:
        d = json.loads(r["data"]) if r else {}
    except (TypeError, ValueError):
        d = {}
    for k in ("kennungen", "stichworte"):
        if isinstance(d, dict) and isinstance(d.get(k), dict):
            out[k] = {str(a).strip()[:40]: str(b).strip()[:400] for a, b in d[k].items() if str(a).strip()}
    return out


def _falt(s):
    s = (s or "").lower().replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss")
    return re.sub(r"[^a-z0-9]+", " ", s)


def _ocr(bild):
    """Texterkennung (tesseract, im Image für alle Apps) für Scans ohne Text – nur die erste Seite, höchstens 25 s."""
    import os, shutil, subprocess, tempfile
    if not shutil.which("tesseract"):
        return ""
    try:
        from PIL import ImageOps
        with tempfile.TemporaryDirectory() as td:
            f = os.path.join(td, "s.png")
            ImageOps.autocontrast(bild.convert("L"), cutoff=1).save(f)
            return subprocess.run(["tesseract", f, "stdout", "-l", "deu+eng", "--psm", "3"], capture_output=True, text=True, timeout=25,
                                  env=dict(os.environ, OMP_THREAD_LIMIT="1")).stdout[:20000]
    except Exception:   # Texterkennung ist nur eine Hilfe für den Vorschlag
        return ""


def text_aus(data, name):
    """Text für die Vorschläge: aus dem PDF (Planköpfe, Briefe), bei Scans und Fotos per Texterkennung."""
    n = (name or "").lower()
    if n.endswith(".pdf"):
        t = pdf_anfang(data)
        if t.strip():
            return t
        try:
            import pdfplumber
            with pdfplumber.open(io.BytesIO(data)) as pdf:
                return _ocr(pdf.pages[0].to_image(resolution=200).original) if pdf.pages else ""
        except Exception:
            return ""
    if n.endswith((".jpg", ".jpeg", ".png", ".tif", ".tiff")):
        try:
            from PIL import Image
            return _ocr(Image.open(io.BytesIO(data)))
        except Exception:
            return ""
    return ""


def pdf_anfang(data):
    """Text der ersten zwei Seiten (Planköpfe sind meist Vektortext); Scans ohne Text liefern nur den Dateinamen."""
    try:
        import pdfplumber
        with pdfplumber.open(io.BytesIO(data)) as pdf:
            return "\n".join((pg.extract_text() or "") for pg in pdf.pages[:2])[:20000]
    except Exception:   # kein PDF oder beschädigt: dann zählt nur der Dateiname
        return ""


def vorschlaege(name, text, dateien, ordner, cf):
    """Ordner, in die die Datei vermutlich gehört – beste zuerst: [{pfad, grund}].
    1. dort, wo frühere Stände desselben Plans liegen (Plannummer aus dem Dateinamen oder dem Plankopf),
    2. dort, wo Pläne derselben Kennung und Phase liegen, 3. Ordner, deren Name im Plankopf vorkommt oder zum erkannten Gewerk passt."""
    out, gesehen = [], set()

    def dazu(pf, grund):
        if pf is not None and pf not in gesehen:
            gesehen.add(pf); out.append({"pfad": pf, "grund": grund})
    i = planname.lies(name)
    if not i:   # Plannummer im Plankopf suchen
        for z in (text or "").splitlines():
            i = planname.lies(z.strip() + ".pdf")
            if i:
                break
    if i:
        gleiche, aehnlich = Counter(), Counter()
        for f in dateien:
            j = planname.lies(f.get("name") or "")
            if not j:
                continue
            if (j["proj"], j["kennung"], j["nr"]) == (i["proj"], i["kennung"], i["nr"]):
                gleiche[f.get("ordner") or ""] += 1
            elif j["kennung"] == i["kennung"] and j["teile"][:1] == i["teile"][:1]:
                aehnlich[f.get("ordner") or ""] += 1
        for pf, _ in gleiche.most_common(3):
            dazu(pf, f"frühere Stände von Plan {i['nr']}")
        for pf, _ in aehnlich.most_common(2):
            dazu(pf, "Pläne derselben Kennung und Phase")
    worte = set(_falt(name + " " + text).split())
    gw, _ = planname.gewerk(i or {"titel": name + " " + (text or "")[:2000]}, cf)
    pkt = []
    for o in ordner:
        letzte = _falt(o.rsplit("/", 1)[-1]).split()
        sig = [w for w in letzte if len(w) >= 4 and not w.isdigit()]
        n = sum(1 for w in sig if w in worte)
        if gw and _falt(gw).strip() and _falt(gw).strip() in _falt(o):
            n += 2
        if n:
            pkt.append((n, -o.count("/"), o))
    for n, _, o in sorted(pkt, reverse=True)[:5]:
        dazu(o, f"Gewerk „{gw}“" if gw and _falt(gw).strip() in _falt(o) else "Ordnername steht im Plan")
    return out[:6], (i or {}).get("nr") or ""



SCAN = re.compile(r"^(scan|img|image|dok|doc|document|dokument|bild|foto|photo|pxl|dsc|cam|kopie|copy|unbenannt|untitled|neu)?[\s_\-]*\d[\d\s_\-]*$", re.I)
DATUM = re.compile(r"\b(\d{1,2})\.(\d{1,2})\.(20\d\d)\b")


def _titel(text):
    """Erste aussagekräftige Zeile des Textes (Betreff, Überschrift) – ohne Anschrift, Telefon, Datum allein."""
    for z in (text or "").splitlines()[:40]:
        z = re.sub(r"\s+", " ", z).strip(" .:-–")
        w = [x for x in z.split() if re.search(r"[A-Za-zÄÖÜäöüß]{3}", x)]
        if 8 <= len(z) <= 70 and len(w) >= 2 and not re.search(r"(tel|fax|e-?mail|www\.|str(a(ss|ß)e)?\.?\s*\d|\d{5}\s)", z, re.I):
            return re.sub(r'[\\/:*?"<>|]+', " ", z).strip()
    return ""


def namen(name, text, kuerzel, heute=None):
    """Vorschläge für den Dateinamen, bester zuerst; der ursprüngliche Name ist immer dabei (zuletzt)."""
    stamm, punkt, endung = (name or "Datei").rpartition(".")
    if not punkt:
        stamm, endung = name or "Datei", "pdf"
    roh = re.sub(r"\s+", " ", stamm.replace("_", " ")).strip()
    k = (kuerzel or "").strip()
    vorne = lambda x: x if not k or x.upper().startswith(k.upper()) else f"{k} {x}"
    out = []
    dazu = lambda x: out.append(x) if x and x not in out else None
    t = _titel(text)
    m = DATUM.search(text or "")
    d = f"{int(m.group(1)):02d}.{int(m.group(2)):02d}.{m.group(3)}" if m else (heute or date.today()).strftime("%d.%m.%Y")
    if SCAN.match(roh) or not re.search(r"[A-Za-zÄÖÜäöüß]{3}", roh):
        if t:
            dazu(vorne(f"{t} {d}"))
    dazu(vorne(roh))
    if t:
        dazu(vorne(f"{t} {d}"))
    dazu(stamm)
    return [f"{x[:150].strip()}.{endung}" for x in out][:4]


def routen(bp, user):
    """Routen für alle Apps (aus bpcore/head.py eingebunden): /api/bp/ablage/vorschlag, /api/bp/ablage."""
    import os, urllib.error, urllib.request
    from flask import jsonify, request
    from . import db, sso

    def _bt_json(method, pfad, body=None):
        with db.tx() as c:
            tok = sso.current_token(request, c)
        base = os.environ.get("BAUTAGEBUCH_INTERNAL", "http://bautagebuch:8000").rstrip("/")
        req = urllib.request.Request(base + pfad, method=method, data=json.dumps(body).encode() if body is not None else None,
                                     headers={"Cookie": f"{sso.COOKIE}={tok}", "Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=90) as r:
                return json.loads(r.read().decode() or "null") or {}
        except urllib.error.HTTPError as e:
            try:
                msg = json.loads(e.read().decode() or "{}").get("error")
            except ValueError:
                msg = None
            raise RuntimeError(msg or f"Bautagebuch antwortet mit Fehler {e.code}")
        except urllib.error.URLError as e:
            raise RuntimeError("Bautagebuch nicht erreichbar: " + str(e.reason)[:120])

    @bp.post("/api/bp/ablage/vorschlag")
    def bp_ablage_vorschlag():
        """Hereingezogene Datei lesen → {erkannt:[{pfad, grund}], ordner:[alle Ordner], namen:[…], basis, kuerzel, plan}."""
        if not user():
            return jsonify(error="Nicht angemeldet"), 401
        f, pid = request.files.get("datei"), request.form.get("project_id", type=int)
        if not f or not pid:
            return jsonify(error="Datei oder Projekt fehlt"), 400
        data = f.read(80 * 1024 * 1024)
        text = text_aus(data, f.filename or "")
        try:
            b = _bt_json("GET", f"/api/ablage/ordnerbaum?project_id={pid}")
            if not b.get("ok"):
                return jsonify(error=b.get("error") or "Ablage nicht erreichbar"), 502
            try:   # Pläne des Projekts (zwischengespeichert): frühere Stände desselben Plans finden
                d = _bt_json("GET", f"/api/plaene/dateien?project_id={pid}")
            except RuntimeError:
                d = {}
        except RuntimeError as e:
            return jsonify(error=str(e)), 502
        with db.tx() as c:
            cf = plan_conf(c)
        erkannt, nr = vorschlaege(f.filename or "", text, d.get("dateien") or [], b["ordner"], cf)
        return jsonify(erkannt=erkannt, ordner=b["ordner"], basis=b.get("basis") or "", kuerzel=b.get("kuerzel") or "", plan=nr,
                       text=bool(text.strip()), namen=namen(f.filename or "", text, b.get("kuerzel") or ""))

    @bp.post("/api/bp/ablage")
    def bp_ablage():
        """Datei im gewählten Ordner ablegen, mit dem gewählten Namen (gleicher Name → „(2)“, nie überschreiben)."""
        import base64
        if not user():
            return jsonify(error="Nicht angemeldet"), 401
        f, pid = request.files.get("datei"), request.form.get("project_id", type=int)
        if not f or not pid:
            return jsonify(error="Datei oder Projekt fehlt"), 400
        ordner = [x for x in (request.form.get("ordner") or "").split("/") if x.strip()]
        if not ordner:
            return jsonify(error="Bitte einen Ordner wählen."), 400
        name = (request.form.get("name") or f.filename or "Datei.pdf").strip()
        try:
            a = _bt_json("POST", "/api/ablage/datei", {"project_id": pid, "art": "datei", "name": name, "ordner": ordner,
                                                       "datei": base64.b64encode(f.read(80 * 1024 * 1024)).decode()})
        except RuntimeError as e:
            return jsonify(error=str(e)), 502
        return jsonify(ok=True, pfad=(a or {}).get("pfad") or "")
