"""Ausschreibung – LV an Bieter:innen versenden (Schritt „Versand“ zwischen LV und Angeboten).

Je Bieter:in eine eigene Mail mit persönlicher Anrede (niemand sieht die anderen), Ansprechpartner:in aus den Adressen gewählt
(Firma, weitere Ansprechpartner:innen und E-Mail-Adressen), Anhänge: LV als PDF ohne Preise und als GAEB X83 – immer aus dem
aktuellen Stand. Versendet wird erst auf „Senden“ (nie automatisch). Danach im Projektordner unter Leistungsverzeichnis/Gewerk:
LV-PDF, X83 und die Empfängerliste mit Datum. Rückmeldungen (Zusage, Absage) trägt man von Hand ein; ein eingegangenes Angebot
setzt „Angebot da“ von selbst. In „Kommunikation“ steht jede Mail (Art „LV-Versand“).

Gespeichert in bp_store „ava:versand:<lv>“: {abgabe, rueckmeldung, bieter: {cid: {email, name, anrede, rueck, notiz}}, laeufe: [{datum, wer, an, betreff, ablage}]}
GET  /api/lv/<i>/versand                Bieter:innen (Angebote + gewählte), Vorschläge aus den Adressen, Läufe, Vorlage
PUT  /api/lv/<i>/versand                {abgabe?, rueckmeldung?, bieter: {cid: {email?, anrede?, rueck?, notiz?, weg?}}}
POST /api/lv/<i>/versand/senden         {an: [{contact_id, email, name, anrede}], betreff, text, pdf, x83, kopie}
"""
import base64
import io
import json
import re
from datetime import datetime

from flask import g, jsonify, request

from bpcore import benachrichtigung, db, gaeb, konto, mail, vorlagen
import common as C
from ava import _druck_layout, _j, _lv, _lv_druck, _payload, _pdf_name, _sees, app

VORLAGE = vorlagen.DEF["angebotsanfrage"]   # anpassbar in Kommunikation → Vorlagen


def _key(i):
    return f"ava:versand:{i}"


def _lesen(c, i):
    r = c.execute("SELECT data FROM bp_store WHERE key=?", (_key(i),)).fetchone()
    try:
        d = json.loads(r["data"]) if r and r["data"] else {}
    except (TypeError, ValueError):
        d = {}
    d.setdefault("bieter", {}); d.setdefault("laeufe", [])
    return d


def _schreiben(c, i, d):
    c.execute("INSERT INTO bp_store(key, data) VALUES(?,?) ON CONFLICT (key) DO UPDATE SET data=EXCLUDED.data", (_key(i), json.dumps(d, ensure_ascii=False)))


def anrede(name):
    """Persönliche Anrede aus dem Namen der Ansprechperson: „Herr Kemper“ → „Sehr geehrter Herr Kemper,“; sonst allgemein."""
    n = " ".join(str(name or "").split())
    m = re.match(r"^(Herrn?|Frau)\s+((?:Dr\.|Prof\.|Dipl\.-Ing\.)\s+)*(.+)$", n)
    if m:
        nach = m.group(3).split()[-1]
        titel = "".join(x for x in re.findall(r"(Dr\.|Prof\.)\s+", n)[:1])
        return f"Sehr geehrte{'r' if m.group(1).startswith('Herr') else ''} {'Herr' if m.group(1).startswith('Herr') else 'Frau'} {titel + ' ' if titel else ''}{nach},"
    return "Sehr geehrte Damen und Herren,"


def _adressen(k):
    """E-Mail-Adressen einer Firma mit Ansprechperson: Firma (Ansprechpartner:in), weitere Ansprechpartner:innen, weitere Adressen."""
    out = []
    ex = _j(k["extra"], {}) if "extra" in k.keys() else {}
    if k["email"]:
        out.append({"email": k["email"], "name": k["contact_person"] or "", "funktion": "Firma"})
    for w in ex.get("weitere") or []:
        if not isinstance(w, dict):
            continue
        if w.get("typ") == "person" and w.get("mail"):
            out.append({"email": w["mail"], "name": w.get("wert") or "", "funktion": w.get("bez") or "Ansprechpartner:in"})
        elif w.get("typ") == "mail" and w.get("wert"):
            out.append({"email": w["wert"], "name": "", "funktion": w.get("bez") or "weitere Adresse"})
    seen, uniq = set(), []
    for x in out:
        if x["email"].lower() not in seen:
            seen.add(x["email"].lower()); uniq.append(x)
    return uniq


def _antwort(c, r):
    d = _lesen(c, r["id"])
    ang = {a["contact_id"]: a for a in c.execute("SELECT id, contact_id, bieter FROM ava_angebot WHERE lv_id=?", (r["id"],)).fetchall() if a["contact_id"]}
    ids = [int(x) for x in d["bieter"] if str(x).isdigit()] + list(ang)
    K = {k["id"]: k for k in c.execute(f"SELECT * FROM contacts WHERE id IN ({','.join('?' * len(ids)) or 'NULL'})", ids).fetchall()} if ids else {}
    bieter = []
    for cid in dict.fromkeys(ids):
        k, b = K.get(cid), d["bieter"].get(str(cid)) or {}
        if not k or b.get("weg"):
            continue
        A = _adressen(k)
        email = b.get("email") if any(x["email"] == b.get("email") for x in A) else (A[0]["email"] if A else "")   # ohne Wahl: die Adresse der Firma
        wer = next((x for x in A if x["email"] == email), {})
        bieter.append({"contact_id": cid, "name": k["name"], "trade": k["trade"] or "", "city": k["city"] or "", "adressen": A, "email": email,
                       "anrede": b.get("anrede") or anrede(wer.get("name") or ""), "anrede_hand": bool(b.get("anrede")),
                       "versendet": b.get("versendet") or "", "rueck": "angebot" if cid in ang else b.get("rueck") or "", "notiz": b.get("notiz") or ""})
    lvw = _stamm(f"{r['gewerk'] or ''} {r['name'] or ''}")   # Gewerk des LV, sonst sein Name (z. B. „Fensterarbeiten“)
    vor = [{"contact_id": k["id"], "name": k["name"], "trade": k["trade"] or "", "city": k["city"] or ""}
           for k in c.execute("SELECT id, name, trade, city FROM contacts WHERE trade<>'' ORDER BY name").fetchall()
           if lvw and k["id"] not in ids and lvw & _stamm(k["trade"])][:40]
    T = vorlagen.alle(c)["angebotsanfrage"]
    return {"abgabe": d.get("abgabe") or "", "rueckmeldung": d.get("rueckmeldung") or "", "bieter": bieter, "vorschlaege": vor, "laeufe": d["laeufe"][-20:],
            "vorlage": {"betreff": T["betreff"], "text": T["text"]}}


# Gewerke grob gleichsetzen: Wortstämme (ohne „-arbeiten“, „-bau“ …) und die üblichen Gleichnamen – passende Firmen stehen oben,
# alle anderen darunter (irgendwer kann immer eingeladen werden)
_GLEICH = [{"rohbau", "maurer", "mauer", "beton", "stahlbeton", "bauunternehmen", "hochbau"}, {"erdbau", "erdar", "tiefbau", "galab", "garte", "lands"}, {"elekt"},
           {"sanit", "heizu", "lüftu", "hlsk", "insta", "gas", "wasser"}, {"dach", "dachd", "klemp", "spengl"}, {"maler", "anstr", "lacki", "tapez"},
           {"trock", "akust"}, {"flies", "plattenl", "naturs"}, {"estri"}, {"fenst", "verglas", "glase"}, {"tisch", "schre", "innent", "türen"},
           {"gerüs"}, {"zimme", "holzb"}, {"metal", "schlo", "stahl"}, {"bodenb", "parke", "belag"}, {"putz", "stuck", "wdvs"}, {"abbru", "rückb", "schad"}]


def _stamm(t):
    ws = {w[:5] for w in re.findall(r"[a-zäöüß]{3,}", (t or "").lower().replace("arbeiten", " ").replace("bauarbeiten", "bau ").replace("-", " "))
          if w not in ("und", "der", "die", "das", "für", "gmbh", "bau", "fa", "los", "lv")}
    for g in _GLEICH:
        if ws & {x[:5] for x in g} or any(w.startswith(x) for w in ws for x in g):
            ws |= {x[:5] for x in g}
    return ws


def _de(t):
    try:
        return datetime.fromisoformat(t).strftime("%d.%m.%Y" + (", %H:%M Uhr" if "T" in t else ""))
    except (TypeError, ValueError):
        return t or "…"


def _frist_falsch(d):
    """Rückmeldung (Zusage/Absage) nach dem Abgabetag ergibt keinen Sinn."""
    return bool(d.get("abgabe") and d.get("rueckmeldung") and d["rueckmeldung"][:10] > d["abgabe"][:10])


@app.route("/api/lv/<int:i>/versand", methods=["GET", "PUT"])
def lv_versand(i):
    with db.tx() as c:
        r = _lv(c, i)
        if not r:
            return jsonify(error="Leistungsverzeichnis nicht gefunden"), 404
        if request.method == "PUT":
            b = request.get_json(silent=True) or {}
            d = _lesen(c, i)
            for k in ("abgabe", "rueckmeldung"):
                if k in b:
                    d[k] = str(b[k] or "")[:16]
            if _frist_falsch(d):
                return jsonify(error="Die Rückmeldung muss spätestens am Tag der Abgabe liegen."), 400
            for cid, x in (b.get("bieter") or {}).items() if isinstance(b.get("bieter"), dict) else ():
                if not str(cid).isdigit() or not isinstance(x, dict):
                    continue
                y = d["bieter"].setdefault(str(cid), {})
                for f, n in (("email", 200), ("anrede", 200), ("notiz", 500)):
                    if f in x:
                        y[f] = str(x[f] or "").strip()[:n]
                if "rueck" in x:
                    y["rueck"] = x["rueck"] if x["rueck"] in ("zusage", "absage", "") else y.get("rueck", "")
                if "weg" in x:
                    y["weg"] = bool(x["weg"])
            _schreiben(c, i, d)
        return jsonify(_antwort(c, r))


def _empfaengerliste(r, projekt, an, betreff, wann, wer, FN):
    """Empfängerliste als PDF (für den Projektordner): wer wann was bekommen hat."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.pdfgen import canvas
    buf = io.BytesIO(); cv = canvas.Canvas(buf, pagesize=A4)
    y = A4[1] - 25 * mm
    cv.setFont(FN["b"], 14); cv.drawString(25 * mm, y, f"Versand LV {r['nr']} {r['name']}"[:80]); y -= 7 * mm
    cv.setFont(FN["n"], 9.5); cv.drawString(25 * mm, y, f"{projekt} · versendet {wann} von {wer}"[:110]); y -= 5 * mm
    cv.drawString(25 * mm, y, f"Betreff: {betreff}"[:110]); y -= 9 * mm
    cv.setFont(FN["b"], 9); cv.drawString(25 * mm, y, "Firma"); cv.drawString(95 * mm, y, "E-Mail"); cv.drawString(160 * mm, y, "Stand"); y -= 5 * mm
    cv.setFont(FN["n"], 9)
    for x in an:
        if y < 25 * mm:
            cv.showPage(); y = A4[1] - 25 * mm; cv.setFont(FN["n"], 9)
        cv.drawString(25 * mm, y, x["name"][:40]); cv.drawString(95 * mm, y, x["email"][:42]); cv.drawString(160 * mm, y, "gesendet" if x["ok"] else "Fehler"); y -= 5 * mm
    cv.save()
    return buf.getvalue()


@app.post("/api/lv/<int:i>/versand/senden")
def lv_versand_senden(i):
    b = request.get_json(silent=True) or {}
    an = [x for x in (b.get("an") or []) if isinstance(x, dict) and "@" in str(x.get("email") or "")][:60]
    if not an:
        return jsonify(error="Keine Empfänger:in mit E-Mail-Adresse gewählt."), 400
    from bpcore import schrift
    with db.tx() as c:
        r = _lv(c, i)
        if not r:
            return jsonify(error="Leistungsverzeichnis nicht gefunden"), 404
        p = _sees(c, r["project_id"]) if r["project_id"] else None
        P = _payload(c, r)
        d0 = _j(r["data"], {}) or {}
        anh = []
        if b.get("pdf", True):   # LV ohne Preise – derselbe Druck wie „Drucken“
            pdf, _F = _lv_druck(c, r, P, {**_druck_layout(d0, {}, c), "preise": "leer"})
            anh.append((_pdf_name(P["projekt"], "LV", "", r), pdf, "application/pdf"))
        if b.get("x83", True):
            items = [x for x in d0.get("items") or [] if not x.get("nt")]
            x83 = gaeb.schreiben({"nr": r["nr"], "name": r["name"], "items": items}, "83", None, p["name"] if p else "", "", 0)
            anh.append((_pdf_name(P["projekt"], "LV", "", r).rsplit(".", 1)[0] + ".x83", x83 if isinstance(x83, bytes) else str(x83).encode("utf-8"), "application/xml"))
        gross = sum(len(x[1]) for x in anh)
        for z in (b.get("anhaenge") or [])[:20]:   # weitere Unterlagen aus dem Versanddialog (Pläne, Baubeschreibung …) – zusammen höchstens 20 MB
            try:
                roh = base64.b64decode(str(z.get("daten") or ""), validate=True)
            except Exception:   # noqa: BLE001 – kaputter Anhang
                return jsonify(error=f"Anhang „{str(z.get('name'))[:60]}“ ist beschädigt."), 400
            gross += len(roh)
            if gross > 25 * 1048576:
                return jsonify(error="Die Anhänge sind zusammen zu groß (höchstens etwa 20 MB)."), 400
            anh.append((re.sub(r'[\\/:*?"<>|]+', "_", str(z.get("name") or "Anhang"))[:120], roh, str(z.get("mime") or "application/octet-stream")[:80]))
        cf = mail.conf(c)
        von, vname = konto.absender(c, g.user, cf)
        d = _lesen(c, i)
        bv = vorlagen.bauvorhaben(p)
        W0 = {"lv": f"LV {r['nr']} {r['name']}".strip(), "projekt": p["name"] if p else "", "bauvorhaben": bv, "gewerk": r["gewerk"] or "",
              "abgabe": _de(b.get("abgabe") or d.get("abgabe")), "rueckmeldung": _de(b.get("rueckmeldung") or d.get("rueckmeldung")),
              "absender": C.full_name(g.user), "buero": cf.get("office_name") or "", "datum": datetime.now().strftime("%d.%m.%Y")}
        teile = []
        for x in an:
            W = {**W0, "firma": str(x.get("name") or ""), "anrede": str(x.get("anrede") or "") or "Sehr geehrte Damen und Herren,"}
            roh_t = str(b.get("text") or VORLAGE["text"])
            for k_ in ("abgabe", "rueckmeldung"):   # ohne Datum: den Satz dazu weglassen statt „bis …“
                if W[k_] == "…":
                    roh_t = re.sub(r"(?m)^[^\n]*\{" + k_ + r"\}[^\n]*\n?", "", roh_t)
            text, html = konto.mail_teile(c, g.user, roh_t, W)
            teile.append((x, vorlagen.fuellen(str(b.get("betreff") or VORLAGE["betreff"]), W), text, html))
        FN = schrift.fuer(c)
    ich = (g.user["email"] or "").strip()
    erg = []
    for x, betreff, text, html in teile:   # je Bieter:in eine eigene Mail – niemand sieht die anderen
        try:
            mail.send(cf, x["email"], betreff, text, sender=vname, from_addr=von, attachments=anh, cc=[ich] if b.get("kopie") and ich else None,
                      reply_to=ich or None, html=html)
            erg.append({**x, "ok": True})
        except mail.MailError as e:
            erg.append({**x, "ok": False, "fehler": str(e)})
    jetzt = datetime.now()
    wann = jetzt.strftime("%d.%m.%Y %H:%M")
    ok = [x for x in erg if x["ok"]]
    ablage, ablage_fehler = [], ""
    if ok:   # Projektordner: Leistungsverzeichnis / Gewerk – LV, X83 und die Empfängerliste mit Datum
        tag = jetzt.strftime("%Y-%m-%d")
        dateien = [(f"{n.rsplit('.', 1)[0]} versendet {tag}" + (f".{n.rsplit('.', 1)[1]}" if "." in n else ""), dat) for n, dat, _m in anh] \
            + [(f"LV {r['nr']} {r['name']} Empfängerliste {tag}.pdf", _empfaengerliste(r, W0["projekt"], erg, teile[0][1], wann, C.full_name(g.user), FN))]
        for n, dat in dateien:
            try:   # die Mails sind schon raus – die Ablage darf den Versand nie scheitern lassen
                pfad, fehl = C.projektordner_ablegen({"project_id": r["project_id"], "art": "lv", "gewerk": r["gewerk"] or "", "name": re.sub(r"[^\w .()-]+", "_", n)[:150],
                                                      "datei": base64.b64encode(dat).decode()})
            except Exception as e:   # noqa: BLE001
                pfad, fehl = None, f"Projektordner nicht erreichbar ({type(e).__name__})"
            if pfad:
                ablage.append(pfad)
            elif fehl and fehl != "testserver":
                ablage_fehler = fehl
            elif fehl == "testserver":
                ablage_fehler = "Testserver – nicht im Projektordner abgelegt"
    with db.tx() as c:
        d = _lesen(c, i)
        for x in ok:
            y = d["bieter"].setdefault(str(x.get("contact_id") or ""), {}) if x.get("contact_id") else {}
            y.update({"versendet": wann, "email": x["email"]})
        if b.get("abgabe"):
            d["abgabe"] = str(b["abgabe"])[:16]
        if b.get("rueckmeldung"):
            d["rueckmeldung"] = str(b["rueckmeldung"])[:16]
        if _frist_falsch(d):
            d["rueckmeldung"] = ""   # schon versendet: eine falsche Frist nicht speichern
        d["laeufe"].append({"datum": wann, "wer": C.full_name(g.user), "betreff": teile[0][1], "an": [{"name": x["name"], "email": x["email"], "ok": x["ok"]} for x in erg],
                            "ablage": ablage[:3]})
        _schreiben(c, i, d)
        for x, betreff, text, _h in teile:
            e = next(y for y in erg if y is x or (y["email"] == x["email"]))
            benachrichtigung.protokoll(c, "lvversand", [{"email": x["email"], "name": x.get("name") or "", "contact_id": x.get("contact_id")}], project_id=r["project_id"],
                                       projekt=W0["projekt"], betreff=betreff, inhalt=text, von=C.full_name(g.user), weg="mail",
                                       status="gesendet" if e["ok"] else "fehler", fehler=e.get("fehler") or "", link="ava:")
        if r["status"] in ("", "entwurf", None) and ok:
            c.execute("UPDATE ava_lv SET status='versendet', rev=rev+1 WHERE id=? AND COALESCE(status,'') IN ('', 'entwurf')", (i,))
        C.audit(g.user["name"], "ava", "LV an Bieter:innen versendet", f"LV {r['nr']} {r['name']} · {len(ok)} von {len(erg)}")
        out = _antwort(c, _lv(c, i))
    return jsonify({**out, "ergebnis": [{"name": x["name"], "email": x["email"], "ok": x["ok"], "fehler": x.get("fehler", "")} for x in erg],
                    "ablage": ablage, "ablage_fehler": ablage_fehler})
