"""Ausschreibung – mehrere LVs in einem Versand (19.11.2026, Mock „Versand mehrerer LVs“: A eine Mail je Firma, B Tabelle mit Spalte je LV,
C Termine je LV + auf Frage ein gemeinsamer, D LV-Daten aus dem Baum).

Häkchen an den LVs im Baum (nur Bereich „Versand & Rücklauf“) → die Seite zeigt die Bieter:innen aller gewählten LVs zusammen. Eine Firma, die
in mehreren gewählten LVs steht, bekommt EINE Mail mit allen ihren LVs und Unterlagen; danach liegt je LV wie bisher ein eigener Ordner
„Versand <Datum>“ im Projektordner, und jedes LV führt seinen Lauf (mit Hinweis, welche LVs mitgingen). Die Schritte je LV (Anhänge, Ablage,
Stand der Bieter:innen) kommen aus ava_versand.py – hier nur das Bündeln.

POST /api/versand/mehrere  {art, lvs: [lv_id], an: [{contact_id, email, name, anrede, lvs: [lv_id]}], betreff, text, kopie, pdf, x83, unterlagen, anhaenge}
"""
from flask import g, jsonify, request

from bpcore import db, konto, mail, schrift
import ava_versand as V
from ava import app


def _lv_text(R, ids):
    """„LV 01 Rohbau und LV 02 Abbruch“ – für den Platzhalter {lv} der gemeinsamen Mail."""
    n = [f"LV {R[i][0]['nr']} {R[i][0]['name']}".strip() for i in ids]
    return n[0] if len(n) == 1 else ", ".join(n[:-1]) + " und " + n[-1]


@app.post("/api/versand/mehrere")
def versand_mehrere():
    b = request.get_json(silent=True) or {}
    art = b.get("art") if b.get("art") in V.ARTEN else "versand"
    if V._nur_nachfassen():
        return jsonify(error="Über „Nachverfolgen“ lässt sich nur je LV erinnern."), 403
    lvs = [int(x) for x in (b.get("lvs") or []) if str(x).isdigit()][:12]
    an = [x for x in (b.get("an") or []) if isinstance(x, dict) and "@" in str(x.get("email") or "")][:60]
    if len(lvs) < 2:
        return jsonify(error="Bitte mindestens zwei LVs anhaken."), 400
    if not an:
        return jsonify(error="Keine Empfänger:in mit E-Mail-Adresse gewählt."), 400
    if art == "erinnerung":
        b = {**b, "pdf": False, "x83": False, "tueren": False, "unterlagen": False}
    R = {}
    try:
        for i in lvs:   # je LV einmal zusammenstellen (LV-PDF, X83, Türliste, Unterlagen)
            r, p, _P, d, anh, anl, _gr = V._anhaenge_lv(i, b)
            R[i] = (r, p, d, anh, anl)
        anl_r, _gr = V._vom_rechner(b) if art != "erinnerung" else ([], 0)
    except V._Fehler as e:
        return jsonify(error=str(e), **e.extra), e.status
    if len({R[i][0]["project_id"] for i in lvs}) > 1:
        return jsonify(error="Gemeinsam versenden geht nur mit LVs desselben Projekts."), 400
    je = []   # (Firma, ihre LVs)
    for x in an:
        ihre = [int(i) for i in (x.get("lvs") or []) if str(i).isdigit() and int(i) in R]
        if not ihre:
            continue
        gross = sum(len(a[1]) for i in ihre for a in R[i][3] + R[i][4]) + sum(len(a[1]) for a in anl_r)
        if gross > V.MAX_ANHANG:
            return jsonify(error=f"Für {x.get('name') or x['email']} sind die Anhänge zusammen zu groß (höchstens etwa 25 MB je Mail) – bitte weniger LVs oder Unterlagen.", zu_gross=True), 400
        je.append((x, ihre))
    if not je:
        return jsonify(error="Keine Firma hat ein gewähltes LV angehakt."), 400
    with db.tx() as c:
        cf = mail.conf(c)
        von, vname = konto.absender(c, g.user, cf)
        FN = schrift.fuer(c)
        teile = []
        for x, ihre in je:
            r, p, d = R[ihre[0]][:3]
            W0 = {**V._w0(r, p, d, b, cf), "lv": _lv_text(R, ihre)}
            teile.append((x, ihre, *V._fuellen(c, W0, b, x, d, art)))
        ids = [int(x["contact_id"]) for x, _i in je if str(x.get("contact_id") or "").isdigit()]
        K = {k["id"]: k for k in c.execute(f"SELECT * FROM contacts WHERE id IN ({','.join('?' * len(ids))})", ids).fetchall()} if ids else {}
        W0s = {i: V._w0(R[i][0], R[i][1], R[i][2], b, cf) for i in lvs}
    ich = (g.user["email"] or "").strip()
    erg = []
    for x, ihre, betreff, text, html in teile:   # je Firma eine Mail mit allen ihren LVs – niemand sieht die anderen
        anh = [a for i in ihre for a in R[i][3]] + [a for i in ihre for a in R[i][4]] + anl_r
        try:
            mail.send(cf, x["email"], betreff, text, sender=vname, from_addr=von, attachments=anh, cc=[ich] if b.get("kopie") and ich else None,
                      reply_to=ich or None, html=html)
            erg.append({**x, "ok": True, "_lvs": ihre})
        except mail.MailError as e:
            erg.append({**x, "ok": False, "fehler": str(e), "_lvs": ihre})
    ordner, ablage_fehler, abgelegt = "", "", 0
    for i in lvs:   # je LV wie bisher: eigener Ordner, Stand der Bieter:innen, Lauf (mit den mitgeschickten LVs), Kommunikation
        e_i = [e for e in erg if i in e["_lvs"]]
        if not e_i:
            continue
        t_i = [(x, betreff, text, html) for x, ihre, betreff, text, html in teile if i in ihre]
        mit = sorted({j for e in e_i for j in e["_lvs"] if j != i})
        a, f, o = V._nachher(i, R[i][0], art, {**b, "mit": [f"{R[j][0]['nr']} {R[j][0]['name']}".strip() for j in mit]}, e_i, t_i, R[i][3], R[i][4] + anl_r, W0s[i], K, FN)
        ordner, ablage_fehler, abgelegt = o or ordner, f or ablage_fehler, abgelegt + len(a)
    return jsonify(ergebnis=[{"name": x["name"], "email": x["email"], "ok": x["ok"], "fehler": x.get("fehler", ""), "lvs": x["_lvs"]} for x in erg],
                   ordner=ordner, abgelegt=abgelegt, ablage_fehler=ablage_fehler)
