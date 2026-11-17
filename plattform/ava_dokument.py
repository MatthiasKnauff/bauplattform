"""Rechnung prüfen direkt im Dokument (GO 17.11.2026, K1 L1 N1) – Server-Teil; Oberfläche in static/ava-dokument.js.

Korrekturen an Ort und Stelle (K1): Weicht die geprüfte Menge (bzw. der Auftrags-EP oder der neue Gesamtpreis) von der Rechnung ab, wird
die Zahl der Firma rot durchgestrichen und der geprüfte Wert darüber geschrieben – die Stelle der Zahl kommt aus den erkannten Zahlen der
Zeile (auslese.zahlen). Summen (N1): Netto, Umsatzsteuer, Endsumme ebenso, darunter „Zahlbetrag lt. Prüfung“.
Notizen (L1): Rahmen mit Text (data.notizen) – in der Prüf-PDF, außer „nur intern“.
Sperre: Ist die Rechnungsfreigabe verschickt (Verlauf der Kommunikation, Link nachweis_link), bleiben Haken, Notizen und Automarkierungen
so, wie sie abgelegt sind – „Korrekturversion beginnen“ (data.korrektur) gibt sie wieder frei, bis die Korrektur verschickt ist.
"""
import json

from flask import g, jsonify

from bpcore import db
from bpcore.wert import eur as _eur
import common as C
from ava import _j, _lv, _now, _s, _touch, app, MWST

ROT = "#e02424"
NOTIZ = "#d08a00"


def _num(v):
    return f"{v:,.3f}".rstrip("0").rstrip(",.").replace(",", "X").replace(".", ",").replace("X", ".")


def zahlbox(A, seite, box, wert):
    """Stelle der Zahl wert in der Zeile box (Seite seite) – die rechteste passende, sonst None."""
    if box is None or wert is None:
        return None
    L = [z for z in ((A.get("zahlen") or {}).get(str(seite)) or []) if box[1] - 0.004 <= (z[1] + z[3]) / 2 <= box[3] + 0.004 and abs(z[4] - wert) < 0.005]
    return max(L, key=lambda z: z[2])[:4] if L else None


def zeile_y(A, t):
    """Höhe der Zeile mit den Zahlen eines Treffers (Positionen sind oft mehrzeilig, die letzte auf der Seite reicht bis zum Fuß):
    die Zahl des Betrags bzw. der Menge – sonst die erste Zeile des Blocks."""
    b = t.get("box")
    if not b:
        return None
    z = next((x for x in (zahlbox(A, t.get("seite"), b, t.get(k)) for k in ("gp", "menge", "ep", "wert")) if x), None)
    return (z[1] + z[3]) / 2 if z else min((b[1] + b[3]) / 2, b[1] + 0.008)


def korrekturen(A, K, RC, R, VP):
    """[(seite, box, text)] – geprüfte Werte über den Zahlen der Firma (K1) und die Summen (N1)."""
    if not A or not RC or not R:
        return []
    rd = (_j(R["data"], {}) or {}) if R else {}
    am = K.get("aufmass") or {}
    stand = rd.get("stand") if R["status"] == "geprueft" and isinstance(rd.get("stand"), dict) else am
    out = []
    if R["art"] != "regie":
        for pid, t in (A.get("pos") or {}).items():
            if t.get("menge") is None or t.get("box") is None or (pid not in am and R["status"] != "geprueft" and pid not in stand):
                continue
            m, ep = stand.get(pid, 0) or 0, VP.get(pid)
            ep = float(ep) if ep not in (None, "") else None
            if abs(t["menge"] - m) >= 1e-6:
                b = zahlbox(A, t["seite"], t["box"], t["menge"])
                if b:
                    out.append((t["seite"], b, _num(m)))
            if ep is not None and t.get("ep") is not None and abs(t["ep"] - ep) >= 0.005:
                b = zahlbox(A, t["seite"], t["box"], t["ep"])
                if b:
                    out.append((t["seite"], b, _eur(ep)))
            e_ = ep if ep is not None else t.get("ep")
            if t.get("gp") is not None and e_ is not None and abs(t["gp"] - round(m * e_, 2)) >= 0.005:
                b = zahlbox(A, t["seite"], t["box"], t["gp"])
                if b:
                    out.append((t["seite"], b, _eur(round(m * e_, 2))))
    ng = RC["leistung"] - RC["nachlass"]
    S = {"netto": [ng], "mwst": [RC["mwst"], ng * MWST / 100], "brutto": [RC["brutto"], ng * (1 + MWST / 100)]}
    su_b = None
    for su in (A.get("kopf") or {}).get("summen") or []:
        if su["art"] not in S or not su.get("box"):
            continue
        if su["art"] == "brutto" or not su_b or (su_b["art"] != "brutto" and su["box"][3] > su_b["box"][3]):   # unter der Endsumme, sonst unter der untersten
            su_b = su
        if not any(abs(su["wert"] - v) <= 1 for v in S[su["art"]]):
            out.append((su["seite"], su["box"], _eur(S[su["art"]][0])))
    if su_b and out:
        b = su_b["box"]
        z = RC.get("auszahlung", RC.get("zahlung"))
        out.append((su_b["seite"], [b[0], b[3] + 0.006, b[2], b[3] + 0.006], f"Zahlbetrag lt. Prüfung: {_eur(z)}" if z is not None else ""))
    return [x for x in out if x[2]]


def korrektur_striche(A, K, RC, R, VP):
    """Korrekturen als Striche für skizze.pdf_zeichnen: rote Linie durch die Zahl, Wert rechtsbündig darüber (Zahlbetrag darunter)."""
    out = []
    for seite, b, txt in korrekturen(A, K, RC, R, VP):
        h = max(0.008, b[3] - b[1])
        if txt.startswith("Zahlbetrag"):
            out.append({"seite": seite, "art": "text", "farbe": ROT, "breite": 0.0034, "rechts": True, "pts": [[b[2], b[1] + 0.012]], "text": txt})
            continue
        ym = (b[1] + b[3]) / 2
        out.append({"seite": seite, "art": "stift", "farbe": ROT, "breite": 0.0016, "pts": [[b[0] - 0.003, ym], [b[2] + 0.003, ym]]})
        out.append({"seite": seite, "art": "text", "farbe": ROT, "breite": max(0.0028, min(0.0042, h / 4.2)), "rechts": True, "kursiv": True,
                    "pts": [[b[2] + 0.004, b[1] - 0.003]], "text": txt})
    return out


def notizen_sauber(L):
    out = []
    for n in (L if isinstance(L, list) else [])[:300]:
        if not isinstance(n, dict) or not _s(n.get("text"), 600).strip():
            continue
        try:
            box = [round(min(1.0, max(0.0, float(v))), 4) for v in (n.get("box") or [])[:4]]
            bid, seite = int(n.get("bid")), int(n.get("seite"))
        except (TypeError, ValueError):
            continue
        if len(box) != 4 or box[2] <= box[0] or box[3] <= box[1]:
            continue
        out.append({"id": _s(n.get("id"), 20) or str(abs(hash((bid, seite, *box))))[:10], "bid": bid, "seite": seite, "box": box, "text": _s(n.get("text"), 600).strip(),
                    "intern": bool(n.get("intern")), "von": _s(n.get("von"), 80), "am": _s(n.get("am"), 20)})
    return out


def notiz_striche(rdata, bid):
    """Notizen (nicht „nur intern“) als Rahmen und Text für die Prüf-PDF."""
    out = []
    for n in notizen_sauber((rdata or {}).get("notizen")):
        if n["bid"] != bid or n["intern"]:
            continue
        x0, y0, x1, y1 = n["box"]
        out.append({"seite": n["seite"], "art": "rechteck", "farbe": NOTIZ, "breite": 0.0014, "pts": [[x0, y0], [x1, y1]]})
        out.append({"seite": n["seite"], "art": "notiz", "farbe": NOTIZ, "breite": 0.003, "pts": [[x0, y1 + 0.004], [x1, y1]], "text": n["text"] + (f" – {n['von']}" if n["von"] else "")})
    return out


# ------------------------------------------------------------------ Sperre nach dem Versand, Korrekturversion
def versendet_am(c, lv_id, rid):
    from ava_pruefablage import nachweis_link
    r = c.execute("SELECT MAX(ts) AS t FROM benachrichtigungen WHERE link=? AND status='gesendet'", (nachweis_link(lv_id, rid),)).fetchone()
    return (r["t"] or "") if r else ""


def sperre(c, x):
    """{versendet, korrektur, gesperrt} einer Rechnung (Zeile ava_rechnung)."""
    d = _j(x["data"], {}) or {}
    v = versendet_am(c, x["lv_id"], x["id"])
    k = (d.get("korrektur") or {}).get("am") or ""
    n = lambda t: str(t or "").replace("T", " ")[:19]   # noqa: E731 – Zeitstempel einheitlich vergleichen
    return {"versendet": n(v), "korrektur": n(k), "gesperrt": bool(v) and not (k and n(k) > n(v))}


def gesperrt(c, x):
    return sperre(c, x)["gesperrt"]


@app.get("/api/rechnungen/<int:k>/dokument")
def rechnung_dokument(k):
    with db.tx() as c:
        x = c.execute("SELECT * FROM ava_rechnung WHERE id=?", (k,)).fetchone()
        if not x or not _lv(c, x["lv_id"]):
            return jsonify(error="Nicht gefunden"), 404
        return jsonify(sperre(c, x))


@app.post("/api/rechnungen/<int:k>/korrektur")
def rechnung_korrektur(k):
    """Korrekturversion beginnen: Haken, Notizen und Automarkierungen sind wieder änderbar, bis die Korrektur verschickt ist.
    Die abgelegte und verschickte Fassung bleibt, wie sie ist (Ablage „GEPRÜFT“, nächste Ablage „GEPRÜFT NEU“)."""
    with db.tx() as c:
        x = c.execute("SELECT * FROM ava_rechnung WHERE id=?", (k,)).fetchone()
        r = _lv(c, x["lv_id"]) if x else None
        if not r:
            return jsonify(error="Nicht gefunden"), 404
        d = _j(x["data"], {}) or {}
        d["korrektur"] = {"am": _now(), "von": C.full_name(g.user)}
        c.execute("UPDATE ava_rechnung SET data=? WHERE id=?", (json.dumps(d), k))
        _touch(c, r["id"])
        x = c.execute("SELECT * FROM ava_rechnung WHERE id=?", (k,)).fetchone()
        st = sperre(c, x)
    C.audit(g.user["name"], "ava", "Korrekturversion der Rechnungsprüfung", f"LV {r['nr']} {r['name']}: Rechnung {x['nr']}")
    return jsonify(st)
