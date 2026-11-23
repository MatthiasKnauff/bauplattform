"""Kosten – Ausgabe im gewohnten Aufbau (GO 23.11.2026, Mock „Excel-Kostenberechnung“ XL-2 A, XL-5 A, XL-6 A; Stufe 2).

Eine Gliederung für Druck (baukosten_druck.py, Teil „din“, „zusammenstellung“, „aenderungen“) und Excel (Route unten):
    gliederung(cal, d, fassung, leer) → {"g1": [{k, name, summe, g2: [{k, name, summe, g3: [{k, name, summe, teile, mark}]}]}],
                                          "risiko", "total", "mwst", "brutto", "satz", "fussnote", "fassung"}
Fassung „2018“ (DIN 276:2018-12, wie die ganze Plattform) oder „2008“ (DIN 276-1:2008-12 – § 4 Abs. 1 S. 3 HOAI verlangt sie für die
anrechenbaren Kosten). Für 2008 nimmt jede Zeile aus einer Excel-Liste ihre Kostengruppe von dort (kg_alt), alle übrigen gehen über die
Umkehrung von baukosten_excel.UM zurück; was es 2008 so nicht gab, landet in „sonstiges“ der Gruppe und ist mit ¹ gekennzeichnet.
Die Summen 300 und 400 sind in beiden Fassungen gleich (die Umsetzung bleibt innerhalb der Hunderter).
KG 700: Zeilen 7xx stehen als Beträge da; nur was der Zuschlag (Prozent oder fest) darüber hinaus ausmacht, steht als eigene Zeile –
vorher zählten Excel-Stände ihre 7xx doppelt (Zeilen + Baunebenkosten fest).

GET /api/bk/<i>/kosten.xlsx?fassung=2018|2008&leer=weg|null – Excel im selben Aufbau: Einzelbeträge als „=a+b+c“ wie in der alten Liste,
Summen als Formeln, Zusammenstellung, Blatt „Änderungen“ mit den Hinweisen aus dem Einlesen.
"""
import io
import re
from urllib.parse import quote

from flask import Response, g, jsonify, request

from baukosten import DIN, STUFE_NAME, _j, _row, aus_modell, app, calc, clean_data
from baukosten_excel import UM
from bpcore import db, din276
import common as C

NAMEN18 = {**din276.WEITERE, **din276.NAMEN, **DIN}
# 1. Ebene der DIN 276-1:2008-12 (die 2. und 3. Ebene kommen aus der eingelesenen Liste, namen_alt)
NAMEN08 = {"100": "Grundstück", "200": "Herrichten und Erschließen", "300": "Bauwerk – Baukonstruktionen", "400": "Bauwerk – Technische Anlagen",
           "500": "Außenanlagen", "600": "Ausstattung und Kunstwerke", "700": "Baunebenkosten"}


def _rev():
    """2018 → 2008: erste Quelle aus UM; Kennzahlen, die 2008 etwas anderes bedeuteten (Schlüssel von UM), gehen auf „sonstiges“ der Gruppe."""
    R = {}
    for alt, neu in UM.items():
        if alt == neu:
            R[neu] = alt
        R.setdefault(neu, alt)
    return R


REV = _rev()


def kg08(z):
    """(Kostengruppe nach 2008, zurückgeführt?) für eine Zeile der Kostenermittlung."""
    k, alt = z.get("kg") or "", z.get("kg_alt") or ""
    if alt and UM.get(alt, alt) == k:
        return alt, False
    if k in REV:
        return REV[k], True
    if k in UM:   # gleiche Nummer, 2008 aber etwas anderes
        return k[:2] + "9", True
    return k, False


def _namen08(d):
    X = d.get("excel") or {}
    N = dict(NAMEN08)
    N.update({k: v for k, v in (X.get("namen_alt") or {}).items() if v})
    for z in X.get("zeilen") or []:
        if z.get("kg_alt") and z.get("name_alt"):
            N.setdefault(z["kg_alt"], z["name_alt"])
    return N


def gliederung(cal, d, fassung="2018", leer="weg"):
    X, mw = d.get("excel") or {}, d.get("mwst", 19)
    N = _namen08(d) if fassung == "2008" else NAMEN18
    blatt, teile, mark = {}, {}, {}
    sieben = 0.0
    for z in cal.get("zeilen") or []:
        k18 = re.sub(r"\D", "", z.get("kg") or "")[:3]
        if len(k18) != 3 or not z.get("betrag"):
            continue
        if k18[0] == "7":
            sieben += z["betrag"]
        if fassung == "2008":
            k, zur = kg08({**z, "kg": k18})
            if zur:
                mark[k] = f"aus DIN 276:2018 KG {k18} zurückgeführt"
        else:
            k = k18
            if z.get("kg_alt") and z["kg_alt"] != k18:
                mark[k] = f"umgesetzt von DIN 276:2008 KG {z['kg_alt']}"
        blatt[k] = blatt.get(k, 0.0) + z["betrag"]
        teile.setdefault(k, []).append((z.get("name") or "", z["betrag"]))
    rest = round((cal.get("nk") or 0) - sieben, 2)   # Zuschlag Baunebenkosten über die 7xx-Zeilen hinaus
    if abs(rest) >= 0.01:
        blatt["7__"] = rest
        teile["7__"] = [("Baunebenkosten (Zuschlag)", rest)]
    liste = set(X.get("liste") or [])
    if leer == "null":   # wie die alte Liste: jede Kostengruppe der vorkommenden Hunderter, leere mit 0
        h = {k[0] for k in blatt}
        alle = (set((X.get("namen_alt") or {}).keys()) | {z.get("kg_alt") for z in X.get("zeilen") or [] if z.get("kg_alt")}) if fassung == "2008" else set(NAMEN18)
        for k in alle:
            if k and len(k) == 3 and k[0] in h and not k.endswith("0"):
                blatt.setdefault(k, 0.0)
                if fassung == "2018" and liste and k not in liste and k not in teile:
                    mark.setdefault(k, "ergänzt aus DIN 276:2018 (fehlte in der eingelesenen Liste)")
    G1 = []
    for e in sorted({k[0] for k in blatt}):
        L1 = {k: v for k, v in blatt.items() if k[0] == e}
        g2 = []
        for p in sorted({k[:2] for k in L1}):
            L2 = {k: v for k, v in L1.items() if k[:2] == p}
            k2 = p + "0" if p[1] != "_" else "7__"
            g3 = [{"k": "" if k == "7__" else k, "name": "Baunebenkosten (Zuschlag)" if k == "7__" else N.get(k) or ", ".join(n for n, _ in teile.get(k, []))[:160] or f"KG {k}",
                   "summe": round(v, 2), "teile": teile.get(k, []), "mark": mark.get(k, "")} for k, v in sorted(L2.items())]
            if k2 == "7__":
                g2.append({"k": "", "name": "Zuschlag", "summe": round(sum(L2.values()), 2), "g3": g3, "zuschlag": True})
            else:
                g2.append({"k": k2, "name": N.get(k2, ""), "summe": round(sum(L2.values()), 2), "g3": [x for x in g3 if x["k"] != k2] or g3, "mark": mark.get(k2, "")})
        G1.append({"k": e + "00", "name": N.get(e + "00", NAMEN18.get(e + "00", "")), "summe": round(sum(L1.values()), 2), "g2": g2})
    return {"g1": G1, "risiko": round(cal.get("risiko") or 0, 2), "total": round(cal.get("total") or 0, 2), "mwst": round(cal.get("mwst") or 0, 2),
            "brutto": round(cal.get("brutto") or 0, 2), "satz": mw, "fassung": fassung,
            "fussnote": any(x["mark"] for a in G1 for b in a["g2"] for x in b["g3"])}


def befunde(d):
    """Hinweise aus dem Einlesen (Anhang „Änderungen beim Einlesen“)."""
    X = d.get("excel") or {}
    return [{"art": b.get("art"), "kg": b.get("kg"), "text": b.get("text")} for b in X.get("befunde") or []]


ART = {"rechenfehler": "Rechenfehler der Liste", "gefahr": "Gefahr doppelter Summe", "pruefen": "zu prüfen", "luecke": "Lücke",
       "ohne_aufteilung": "aus anderer Datei", "umgesetzt": "umgesetzt (DIN 276:2008 → 2018)", "ergaenzt": "ergänzt"}


def _fassung():
    return "2008" if request.args.get("fassung") == "2008" else "2018"


@app.get("/api/bk/<int:i>/kosten.xlsx")
def bk_xlsx(i):
    from openpyxl import Workbook
    from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
    fassung, leer = _fassung(), ("null" if request.args.get("leer") == "null" else "weg")
    with db.tx() as c:
        r = _row(c, i)
        if not r:
            return jsonify(error="Nicht gefunden"), 404
        d = clean_data(_j(r["data"], {}))
        _, _, _, offen = aus_modell(c, r["project_id"])
        cal = calc(d, [] if d.get("excel") else offen, r["stufe"])
        p = c.execute("SELECT name, street, zip, city FROM projects WHERE id=?", (r["project_id"],)).fetchone() if r["project_id"] else None
        office = C.kurzname(c)
    Gl, satz = gliederung(cal, d, fassung, leer), d.get("mwst", 19)
    stufe = STUFE_NAME.get(r["stufe"], "Kostenermittlung")
    wb = Workbook()
    ws = wb.active
    ws.title = "Kosten"
    fett, klein = Font(bold=True), Font(size=9, color="666666")
    band, linie = PatternFill("solid", fgColor="EDEBE5"), Border(top=Side(style="thin"))
    EUR = '#,##0.00 "€"'
    ws.column_dimensions["A"].width = 8
    ws.column_dimensions["B"].width = 58
    for s in "CDE":
        ws.column_dimensions[s].width = 17
    ws.append([f"{stufe} nach DIN 276{':2018-12' if fassung == '2018' else '-1:2008-12'}"])
    ws["A1"].font = Font(bold=True, size=13)
    ws.append([" · ".join(x for x in ((p["name"] if p else ""), r["name"]) if x)])
    ws.append([", ".join(x for x in ((p["street"] if p else ""), " ".join(y for y in ((p["zip"] if p else ""), (p["city"] if p else "")) if y)) if x)])
    ws.append([])
    ws.append(["Nr.", "Kostengruppe", "Teilbetrag netto", "Gesamtbetrag netto", f"brutto ({satz:g} %)"])
    for cl in ws[ws.max_row]:
        cl.font = fett
        cl.border = Border(bottom=Side(style="medium"))
    fk = 1 + satz / 100
    summen1 = {}   # 1. Ebene → Zelle der Summe
    fussnote = False
    for a in Gl["g1"]:
        ws.append([a["k"], a["name"]])
        ws.cell(ws.max_row, 1).font = fett
        ws.cell(ws.max_row, 2).font = fett
        z2 = []
        for b in a["g2"]:
            if b["k"]:
                ws.append([b["k"], b["name"]])
                ws.cell(ws.max_row, 1).font = fett
                ws.cell(ws.max_row, 2).font = fett
            von = ws.max_row + 1
            for x in b["g3"]:
                t = [v for _, v in x["teile"] if v]
                wert = ("=" + "+".join(f"{v:.2f}".rstrip("0").rstrip(".") for v in t)) if len(t) > 1 else (t[0] if t else 0)
                ws.append([x["k"], x["name"] + (" ¹" if x["mark"] else ""), wert])
                fussnote = fussnote or bool(x["mark"])
            bis = ws.max_row
            ws.append(["", f"Summe {b['k'] or b['name']}", None, f"=SUM(C{von}:C{bis})"])
            ws.cell(ws.max_row, 5).value = f"=D{ws.max_row}*{fk}"
            z2.append(ws.max_row)
            ws.cell(ws.max_row, 2).font = klein
        ws.append(["", f"Summe {a['k']}", None, "=" + "+".join(f"D{n}" for n in z2)])
        n = ws.max_row
        ws.cell(n, 5).value = f"=D{n}*{fk}"
        for cl in ws[n]:
            cl.font = fett
            cl.fill = band
            cl.border = linie
        summen1[a["k"]] = n
        ws.append([])
    for row in ws.iter_rows(min_row=6):
        for cl in row[2:5]:
            cl.number_format = EUR
    if fussnote:
        ws.append(["", "¹ Kostengruppe " + ("umgesetzt von DIN 276:2008 bzw. ergänzt – siehe Blatt „Änderungen“" if fassung == "2018" else "aus der DIN 276:2018 zurückgeführt (gab es 2008 so nicht)")])
        ws.cell(ws.max_row, 2).font = klein
        ws.append([])
    # Zusammenstellung
    ws.append(["", "Zusammenstellung der Kosten", None, "netto", "brutto"])
    for cl in ws[ws.max_row]:
        cl.font = fett
        cl.border = Border(bottom=Side(style="medium"))
    z = []
    for a in Gl["g1"]:
        ws.append([a["k"], a["name"], None, f"=D{summen1[a['k']]}", None])
        z.append(ws.max_row)
    if Gl["risiko"]:
        ws.append(["", "Unvorhergesehenes (Kostenrisiko)", None, Gl["risiko"], None])
        z.append(ws.max_row)
    ws.append(["", "Summe netto", None, "=" + "+".join(f"D{n}" for n in z), None])
    sn = ws.max_row
    ws.append(["", f"Umsatzsteuer {satz:g} %", None, f"=D{sn}*{satz / 100}", None])
    ws.append(["", "Summe brutto", None, f"=D{sn}+D{sn + 1}", None])
    for n in z + [sn]:
        ws.cell(n, 5).value = f"=D{n}*{fk}"
    ws.cell(sn + 2, 5).value = f"=D{sn + 2}"
    for n in (sn, sn + 2):
        for cl in ws[n]:
            cl.font = fett
            cl.border = linie
    for row in ws.iter_rows(min_row=sn - len(z), max_row=sn + 2):
        for cl in row[2:5]:
            cl.number_format = EUR
    with db.tx() as c:
        ort = (c.execute("SELECT value FROM settings WHERE key='co_city'").fetchone() or {"value": ""})["value"] or ""
    from datetime import date
    ws.append([])
    ws.append(["", f"{ort + ', ' if ort else ''}{date.today().strftime('%d.%m.%Y')}"])
    ws.append(["", " · ".join(x for x in (office, C.full_name(g.user)) if x)])
    for row in ws.iter_rows():
        for cl in row:
            cl.alignment = Alignment(vertical="top", wrap_text=cl.column == 2)
    B = befunde(d)
    if B:
        w2 = wb.create_sheet("Änderungen")
        w2.column_dimensions["A"].width = 26
        w2.column_dimensions["B"].width = 8
        w2.column_dimensions["C"].width = 100
        w2.append([f"Beim Einlesen von „{(d.get('excel') or {}).get('datei', '')}“ geändert oder aufgefallen"])
        w2["A1"].font = fett
        w2.append(["Art", "KG", "Hinweis"])
        for cl in w2[2]:
            cl.font = fett
        for b in B:
            w2.append([ART.get(b["art"], b["art"]), b["kg"], b["text"]])
    buf = io.BytesIO()
    wb.save(buf)
    C.audit(g.user["name"], "baukosten", "Kosten als Excel", f"{r['name']} · DIN 276:{fassung}")
    fn = re.sub(r"[\\/:*?\"<>|]+", "_", f"{stufe} {r['name']} (DIN 276-{fassung}).xlsx")
    return Response(buf.getvalue(), mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quote(fn)}"})
