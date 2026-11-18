"""Bieterliste drucken und als Excel (GO 18.11.2026, Mock „Bieterliste Druck“: BD-A1 B1 C1).

Je Firma eine Kopfzeile (Firma mit Gewerk darunter · E-Mail/Telefon · angeschrieben · Stand), darunter – eine Spalte eingerückt –
alles, was nach dem Anschreiben geschah, nach Datum: Nachversand, Erinnerung, Anruf mit Notiz, Zusage, Absage, Angebot (A1).
Excel im gleichen Aufbau (C1). Spalten wählbar (Druckfenster in ava-versand.js), unabhängig von der Ansicht am Bildschirm.

POST /api/lv/<i>/versand/liste   {spalten, ids (Reihenfolge wie auf der Seite), format: "pdf"|"xlsx"}
     PDF liegt dazu im LV-Ordner unter „Bieterliste“ (Vergabeakte; Testserver schreibt nicht in die Ablage).
"""
import base64
import io
import re
import urllib.parse
from datetime import datetime

from flask import Response, g, jsonify, request

from bpcore import db, schrift
import common as C
from ava import _lv, _sees, app
from ava_versand import _antwort, _de

SPALTEN = {   # Schlüssel → (Titel, Breite in mm im Querformat); „firma“ immer, „verlauf“ = Zeilen unter der Firma mit Notiz
    "firma": ("Firma / Rückfrage", 58), "kontakt": ("E-Mail · Telefon", 50), "angeschrieben": ("angeschrieben / am", 33),
    "verlauf": ("Notiz", 90), "stand": ("Stand", 38)}
ALT = {"nachgefragt": "verlauf", "angebot": "stand"}   # Schlüssel der früheren Spaltenwahl


def _tag(t):
    return f"{t[8:10]}.{t[5:7]}.{t[2:4]}" if re.match(r"\d{4}-\d\d-\d\d", t or "") else (t or "")


def stand(x):
    v = x["verlauf"]
    if v["angebot"]:
        return "Angebot" + (f" {_tag(v['angebot'])[:5]}." if v["angebot"] != "ja" else "")
    if x["rueck"] == "absage":
        return "abgesagt" + (f" {_tag(v['abgesagt'])[:5]}." if v["abgesagt"] else "")
    if x["rueck"] == "zusage":
        return "will abgeben" + (f" bis {_tag(v['zusage_bis'])[:5]}." if v["zusage_bis"] else "")
    return "offen"


def ereignisse(x):
    """Alles nach dem Anschreiben, nach Datum: [(Weg, ISO-Zeit, Text)]."""
    v, E = x["verlauf"], []
    E += [("Mail", t, "Nachversand") for t in v["nachgesandt"]]
    E += [("Anruf" if n["weg"] == "tel" else "Mail", n["t"], n["text"] or ("Anruf" if n["weg"] == "tel" else "Erinnerung")) for n in v["nachgefragt"]]
    if v.get("zugesagt") or (x["rueck"] == "zusage" and v["zusage_bis"]):
        E.append(("Zusage", v.get("zugesagt") or "", "will abgeben" + (f" bis {_tag(v['zusage_bis'])}" if v["zusage_bis"] else "")))
    if x["rueck"] == "absage":
        E.append(("Absage", v["abgesagt"], v["grund"] or "gibt nicht ab"))
    if v["angebot"]:
        E.append(("Angebot", v["angebot"] if v["angebot"] != "ja" else "", "Angebot eingegangen"))
    return sorted(E, key=lambda e: e[1] or "9999")


def kopf(x):
    return {"firma": x["name"], "gewerk": x.get("trade") or "", "kontakt": [y for y in (x["email"], x.get("telefon")) if y],
            "angeschrieben": _tag(x["verlauf"]["angeschrieben"]), "stand": stand(x)}


@app.post("/api/lv/<int:i>/versand/liste")
def lv_versand_liste(i):
    b = request.get_json(silent=True) or {}
    sp = ["firma"] + [k for k in SPALTEN if k != "firma" and k in {ALT.get(y, y) for y in (b.get("spalten") or list(SPALTEN))}]
    with db.tx() as c:
        r = _lv(c, i)
        if not r:
            return jsonify(error="Leistungsverzeichnis nicht gefunden"), 404
        p = _sees(c, r["project_id"]) if r["project_id"] else None
        A, FN = _antwort(c, r), schrift.fuer(c)
    B = {x["contact_id"]: x for x in A["bieter"]}
    ids = [int(y) for y in b.get("ids") or [] if str(y).isdigit() and int(y) in B] or list(B)
    wann = datetime.now()
    titel = f"Bieterliste · LV {r['nr']} {r['name']}".strip()
    unter = " · ".join(y for y in (p["name"] if p else "", f"Abgabe {_de(A['abgabe'])}" if A["abgabe"] else "",
                                    f"Rückmeldung bis {_de(A['rueckmeldung'])}" if A.get("rueckmeldung") else "") if y)
    zahlen = _zahlen([B[k] for k in ids])
    if b.get("format") == "xlsx":
        return _xlsx(r, titel, unter, zahlen, [B[k] for k in ids], sp, wann)
    pdf = _pdf(titel, unter, zahlen, [B[k] for k in ids], sp, wann, FN)
    hinweis = ""
    try:   # Vergabeakte: jeder Druck liegt auch im LV-Ordner
        pfad, fehl = C.projektordner_ablegen({"project_id": r["project_id"], "art": "lv", "gewerk": r["gewerk"] or "", "unter": ["Bieterliste"],
                                              "name": f"Bieterliste {wann.strftime('%Y-%m-%d %H-%M')}.pdf", "datei": base64.b64encode(pdf).decode()})
        hinweis = f"im Projektordner: {pfad}" if pfad else ("Testserver – nicht im Projektordner abgelegt" if fehl == "testserver" else fehl or "")
    except Exception as e:   # noqa: BLE001
        hinweis = f"Projektordner nicht erreichbar ({type(e).__name__})"
    return Response(pdf, mimetype="application/pdf", headers={"X-Ablage": urllib.parse.quote(hinweis)})


def _zahlen(L):
    n = lambda f: sum(1 for x in L if f(x))   # noqa: E731
    return [("angeschrieben", n(lambda x: x["verlauf"]["angeschrieben"])), ("Angebot", n(lambda x: x["verlauf"]["angebot"])),
            ("will abgeben", n(lambda x: x["rueck"] == "zusage" and not x["verlauf"]["angebot"])), ("abgesagt", n(lambda x: x["rueck"] == "absage")),
            ("offen", n(lambda x: not x["verlauf"]["angebot"] and x["rueck"] not in ("zusage", "absage")))]


def _pdf(titel, unter, zahlen, L, sp, wann, FN):
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.units import mm
    from reportlab.lib.utils import simpleSplit
    from reportlab.pdfgen import canvas
    buf = io.BytesIO(); S = landscape(A4); cv = canvas.Canvas(buf, pagesize=S)
    R0, R1, Z = 14 * mm, S[0] - 14 * mm, 4 * mm
    breit = {k: SPALTEN[k][1] for k in sp}
    breit["verlauf" if "verlauf" in sp else "firma"] += (R1 - R0) / mm - sum(breit.values())   # Rest an die Notiz
    xs, x0 = {}, R0
    for k in sp:
        xs[k] = x0; x0 += breit[k] * mm
    wrap = lambda t, k, f=None, g_=8.5: simpleSplit(str(t), f or FN["n"], g_, (breit[k] - 2) * mm) or [""]   # noqa: E731
    seite = [1]

    def fuss():
        cv.setFont(FN["n"], 7.5); cv.setFillGray(0.4)
        cv.drawString(R0, 9 * mm, titel); cv.drawRightString(R1, 9 * mm, f"Seite {seite[0]}"); cv.setFillGray(0)

    def tkopf(y):
        cv.setFont(FN["b"], 7.5)
        for k in sp:
            cv.drawString(xs[k], y, SPALTEN[k][0].upper())
        cv.setLineWidth(1); cv.line(R0, y - 1.6 * mm, R1, y - 1.6 * mm); cv.setLineWidth(0.5)
        return y - 6 * mm

    y = S[1] - 16 * mm
    cv.setFont(FN["b"], 14); cv.drawString(R0, y, titel[:100]); y -= 5 * mm
    cv.setFont(FN["n"], 8.5); cv.drawString(R0, y, unter[:140]); cv.drawRightString(R1, y, f"Stand {wann.strftime('%d.%m.%Y %H:%M')} · {C.full_name(g.user)}")
    y -= 8 * mm
    cv.setLineWidth(0.5); cv.rect(R0, y - 2 * mm, R1 - R0, 6.5 * mm); xx = R0 + 3 * mm
    for t, n in zahlen:
        cv.setFont(FN["n"], 8.5); cv.drawString(xx, y, t); xx += cv.stringWidth(t, FN["n"], 8.5) + 1.2 * mm
        cv.setFont(FN["b"], 9.5); cv.drawString(xx, y, str(n)); xx += cv.stringWidth(str(n), FN["b"], 9.5) + 7 * mm
    y = tkopf(y - 10 * mm)
    for x in L:
        K, E = kopf(x), ereignisse(x)
        zk = {"firma": wrap(K["firma"], "firma", FN["b"]) + [("g", u) for u in (wrap(K["gewerk"], "firma", g_=7.5) if K["gewerk"] else [])],
              "kontakt": [u for t in K["kontakt"] for u in wrap(t, "kontakt")] if "kontakt" in sp else [], "angeschrieben": [K["angeschrieben"] or "–"],
              "stand": wrap(K["stand"], "stand", FN["b"]) if "stand" in sp else [], "verlauf": []}
        hk = max(len(zk[k]) for k in sp)
        zeilen = []   # (Weg, Datum, [Notiz-Zeilen])
        if "verlauf" in sp:
            for weg, t, text in E:
                vor = ("" if "kontakt" in sp else weg + " ") + ("" if "angeschrieben" in sp else _tag(t) + " ")
                zeilen.append((weg, _tag(t), wrap(vor + text, "verlauf")))
            if not E:
                zeilen.append(("", "", ["noch keine Rückfrage"]))
        hoehe = (hk + sum(len(z[2]) for z in zeilen)) * Z + 3 * mm
        if y - hoehe < 16 * mm and hoehe < S[1] - 50 * mm:
            fuss(); cv.showPage(); seite[0] += 1; y = tkopf(S[1] - 16 * mm)
        cv.setStrokeGray(0.6); cv.line(R0, y + 3.2 * mm, R1, y + 3.2 * mm); cv.setStrokeGray(0)
        for k in sp:
            for j, u in enumerate(zk[k]):
                if isinstance(u, tuple):
                    cv.setFont(FN["n"], 7.5); cv.setFillGray(0.45); cv.drawString(xs[k], y - j * Z, u[1]); cv.setFillGray(0)
                else:
                    cv.setFont(FN["b"] if k in ("firma", "stand") else FN["n"], 8.5); cv.drawString(xs[k], y - j * Z, u)
        y -= hk * Z
        for weg, tag, Ls in zeilen:
            cv.setFont(FN["n"], 8.5); cv.setFillGray(0.35)
            if weg and "kontakt" in sp:
                cv.drawString(xs["kontakt"] + 3 * mm, y, weg)
            if tag and "angeschrieben" in sp:
                cv.drawString(xs["angeschrieben"], y, tag)
            cv.setFillGray(0.5 if not weg else 0.1)
            for j, u in enumerate(Ls):
                cv.drawString(xs["verlauf"], y - j * Z, u)
            cv.setFillGray(0); y -= len(Ls) * Z
        y -= 3 * mm
    fuss(); cv.save()
    return buf.getvalue()


def _xlsx(r, titel, unter, zahlen, L, sp, wann):
    from openpyxl import Workbook
    from openpyxl.styles import Alignment, Border, Font, Side
    wb = Workbook(); ws = wb.active; ws.title = "Bieter"
    ws.append([titel]); ws["A1"].font = Font(bold=True, size=13)
    ws.append([f"{unter} · Stand {wann.strftime('%d.%m.%Y %H:%M')}"])
    ws.append([" · ".join(f"{t} {n}" for t, n in zahlen)]); ws.append([])
    ws.append([SPALTEN[k][0] for k in sp]); kz = ws.max_row
    for z in ws[kz]:
        z.font = Font(bold=True); z.border = Border(bottom=Side(style="medium"))
    oben = Border(top=Side(style="thin", color="999999"))
    for x in L:
        K = kopf(x)
        werte = {"firma": K["firma"] + (f"\n{K['gewerk']}" if K["gewerk"] else ""), "kontakt": "\n".join(K["kontakt"]),
                 "angeschrieben": K["angeschrieben"], "verlauf": "", "stand": K["stand"]}
        ws.append([werte[k] for k in sp])
        for j, z in enumerate(ws[ws.max_row]):
            z.alignment = Alignment(wrap_text=True, vertical="top"); z.border = oben
            if sp[j] in ("firma", "stand"):
                z.font = Font(bold=True)
        if "verlauf" in sp:
            E = ereignisse(x)
            for weg, t, text in E or [("", "", "noch keine Rückfrage")]:
                w = {"firma": "", "kontakt": weg, "angeschrieben": _tag(t), "verlauf": text, "stand": ""}
                if "kontakt" not in sp and weg:
                    w["verlauf"] = f"{weg}: {text}"
                ws.append([w[k] for k in sp])
                for z in ws[ws.max_row]:
                    z.alignment = Alignment(wrap_text=True, vertical="top", indent=1 if z.column > 1 else 0)
                    if not weg:
                        z.font = Font(italic=True, color="888888")
    for j, k in enumerate(sp):
        ws.column_dimensions[chr(65 + j)].width = max(12, SPALTEN[k][1] / 2)
    ws.freeze_panes = f"A{kz + 1}"
    buf = io.BytesIO(); wb.save(buf)
    name = f"Bieterliste LV {r['nr']} {wann.strftime('%Y-%m-%d')}.xlsx"
    return Response(buf.getvalue(), mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    headers={"Content-Disposition": "attachment; filename*=UTF-8''" + urllib.parse.quote(name)})
