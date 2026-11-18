"""Vorangegangene Abschlagszahlungen (GO 18.11.2026, Mock „Vorangegangene Abschlagszahlungen“: AZ-A1 B1 C1).

Zahlungen ohne Rechnung in der Plattform – Projekt mitten im Bau übernommen, Abschlag ohne Rechnung, Vorauszahlung – je Auftrag in
vergabe.zahlungen: [{id, art, nr, re_datum, datum, brutto, netto, bemerkung, von, am}].
  A1  eingetragen in „Rechnungen“ (Liste „Zahlungen“) und aus der Rechenleiter („bisherige Zahlungen“)
  B1  brutto wie überwiesen; netto mit der Umsatzsteuer gerechnet, änderbar
  C1  zählen als „bisherige Zahlungen“ der nächsten Abschlags- und der Schlussrechnung (ava.rechne), bis eine geprüfte kumulierte
      Rechnung sie aufnimmt; in „abgerechnet“ (Kostenkontrolle) mit
Rückgängig und Verlauf über den Verlauf des LV (avalv:<id>).

POST   /api/lv/<i>/zahlungen          {art, nr, re_datum, datum, brutto, netto?, bemerkung} → LV
PUT    /api/lv/<i>/zahlungen/<zid>    dieselben Felder → LV
DELETE /api/lv/<i>/zahlungen/<zid>    → LV
"""
import json
import uuid

from flask import g, jsonify, request

from bpcore import db, versionen
from bpcore.jsonwert import lies as _j
import common as C
from ava import MWST, _f, _lv, _now, _payload, _s, app

ARTEN = {"abschlag": "Abschlag", "voraus": "Vorauszahlung", "teilschluss": "Teilschlusszahlung"}


def _datum(v):
    v = str(v or "")[:10]
    return v if len(v) == 10 and v[4] == "-" and v[7] == "-" else ""


def eintrag(b, alt=None):
    """Felder einer Zahlung prüfen; ohne netto (oder brutto geändert) wird netto aus brutto gerechnet (B1)."""
    z = dict(alt or {})
    if "art" in b:
        z["art"] = b["art"] if b["art"] in ARTEN else "abschlag"
    for k, n in (("nr", 40), ("bemerkung", 300)):
        if k in b:
            z[k] = _s(b[k], n)
    for k in ("datum", "re_datum"):
        if k in b:
            z[k] = _datum(b[k])
    if "brutto" in b:
        z["brutto"] = round(_f(b["brutto"], 0, 0), 2)
    if b.get("netto") not in (None, ""):
        z["netto"] = round(_f(b["netto"], 0, 0), 2)
    elif "brutto" in b or "netto" not in z:
        z["netto"] = round((z.get("brutto") or 0) / (1 + MWST / 100), 2)
    z.setdefault("art", "abschlag")
    return z


def _aendern(i, fn):
    with db.tx() as c:
        c.execute("SELECT pg_advisory_xact_lock(hashtext(?))", (f"avalv:{i}",))
        r = _lv(c, i)
        if not r:
            return jsonify(error="Leistungsverzeichnis nicht gefunden"), 404
        V = _j(r["vergabe"], {}) or {}
        if not (V.get("bieter") or V.get("frei")) or V.get("aufgehoben"):
            return jsonify(error="Zahlungen gibt es erst nach der Vergabe."), 400
        Z = [z for z in V.get("zahlungen") or [] if isinstance(z, dict)]
        versionen.vor(c, f"avalv:{i}")
        try:
            Z, text = fn(Z)
        except LookupError:
            return jsonify(error="Zahlung nicht gefunden"), 404
        V["zahlungen"] = Z
        c.execute("UPDATE ava_lv SET vergabe=?, rev=rev+1, updated=?, updated_by=? WHERE id=?", (json.dumps(V, ensure_ascii=False), _now(), g.user["name"], i))
        versionen.nach(c, f"avalv:{i}", g.user["name"])
        C.audit(g.user["name"], "ava", text, f"LV {r['nr']} {r['name']}".strip())
        return jsonify(_payload(c, _lv(c, i)))


@app.post("/api/lv/<int:i>/zahlungen")
def zahlung_neu(i):
    b = request.get_json(silent=True) or {}
    if _f(b.get("brutto"), 0) <= 0:
        return jsonify(error="Betrag fehlt."), 400

    def neu(Z):
        z = {"id": uuid.uuid4().hex[:10], **eintrag(b), "von": g.user["name"], "am": _now()}
        return Z + [z], f"Zahlung eingetragen ({z['brutto']:.2f} € brutto)"
    return _aendern(i, neu)


@app.route("/api/lv/<int:i>/zahlungen/<zid>", methods=["PUT", "DELETE"])
def zahlung_aendern(i, zid):
    b = request.get_json(silent=True) or {}

    def aendern(Z):
        if not any(z.get("id") == zid for z in Z):
            raise LookupError
        if request.method == "DELETE":
            return [z for z in Z if z.get("id") != zid], "Zahlung gelöscht"
        return [eintrag(b, z) if z.get("id") == zid else z for z in Z], "Zahlung geändert"
    return _aendern(i, aendern)
