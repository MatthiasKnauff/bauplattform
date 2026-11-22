"""Wärmeschutz – Nachweis als PDF (19.11.2026, Mock „Wärmeschutznachweis als PDF“: A1 + A2, B1, C1, E1).

Gerechnet wird im Browser (bp/wsphysik.js); die Seite schickt vor dem Drucken die Ergebnisse (U-Werte, Schichten, Temperaturen, Glaser)
an /api/nachweise/<nid>/druckdaten – sie liegen klein in bp_store „ws:druck:<nid>“ (nur Zahlen und Namen, kein Dokument). Das PDF zeichnet
/api/nachweise/<nid>/nachweis.pdf über die gemeinsame Druckseite (bp/druck.js: Vorschau, Senden, Ablegen, Stempel & Unterschrift).
Teile: Deckblatt (Aufsteller:in = Bauvorlageberechtigte:r des Büros, B1) · Übersicht · je Bauteil die Schichten (A1) · auf Wunsch
Temperaturverlauf und Tauwasser nach Glaser (A2). Aussehen: Druck-Layout „Wärmeschutznachweis“ mit Briefbogen-Schalter (E1).
Abgelegt wird über die Druckseite im Ordner aus den Ablage-Einstellungen (C1, Vorgabe „Bauantrag/Nachweise“); der Name beginnt mit
„Wärmeschutznachweis“ – so findet ihn der Bauantrag als Anlage.
"""
import io
import json
from datetime import date, datetime

from flask import Response, g, jsonify, request

from bpcore import ablage_einst, bueroinfo, db, einstellungen, layout, schrift
import common as C
from waermeschutz import _detail, _j, _nachweis, app

TEILE = ("deckblatt", "uebersicht", "bauteile", "glaser")


def _f(v, lo=-1e6, hi=1e6):
    try:
        x = float(v)
    except (TypeError, ValueError):
        return None
    return x if lo <= x <= hi else None


def _bt(b):
    """Ein Bauteil aus dem Browser – nur bekannte Felder, Zahlen geprüft, Listen gekürzt."""
    t = lambda v, n=120: str(v or "")[:n]   # noqa: E731
    return {"name": t(b.get("name")), "art": t(b.get("art"), 80), "einordnung": t(b.get("einordnung")), "flaeche": _f(b.get("flaeche"), 0, 1e6),
            "u": _f(b.get("u"), 0, 20), "umax": _f(b.get("umax"), 0, 20), "ok": b.get("ok") if isinstance(b.get("ok"), bool) else None,
            "rsi": _f(b.get("rsi"), 0, 1), "rse": _f(b.get("rse"), 0, 1), "rt": _f(b.get("rt"), 0, 100), "hinweis": t(b.get("hinweis"), 300),
            "schichten": [_schicht(s, t) for s in (b.get("schichten") or [])[:30] if isinstance(s, dict)],
            "stufe": _stufe(b.get("stufe"), t), "inh": _inh(b.get("inh"), t),
            "temp": [[_f(p[0], 0, 1000), _f(p[1], -60, 60)] for p in (b.get("temp") or [])[:40] if isinstance(p, (list, tuple)) and len(p) == 2],
            "glaser": {k: _f((b.get("glaser") or {}).get(k), -1e6, 1e6) for k in ("mc", "mev", "pi", "pe", "sd")} | {
                "tauwasser": bool((b.get("glaser") or {}).get("tauwasser")),
                "ps": [[_f(p[0], 0, 1e5), _f(p[1], 0, 1e5)] for p in ((b.get("glaser") or {}).get("ps") or [])[:120] if isinstance(p, (list, tuple)) and len(p) == 2],
                "p": [[_f(p[0], 0, 1e5), _f(p[1], 0, 1e5)] for p in ((b.get("glaser") or {}).get("p") or [])[:40] if isinstance(p, (list, tuple)) and len(p) == 2]}}


def _farbe(v):
    v = str(v or "")
    return v if len(v) == 7 and v.startswith("#") and all(ch in "0123456789abcdefABCDEF" for ch in v[1:]) else "#dcdcdc"


def _schicht(s, t):
    """Schicht mit Farbe (Zeichnung), belüftet und Gefach (Mock „Schichtaufbau neu“ SA-12: Blöcke, Unterzeile je Gefach)."""
    x = {"name": t(s.get("name")), "baustoff": t(s.get("baustoff")), "d": _f(s.get("d"), 0, 1000), "lam": _f(s.get("lam"), 0, 500),
         "r": _f(s.get("r"), 0, 100), "mu": _f(s.get("mu"), 0, 1e7), "farbe": _farbe(s.get("farbe")), "aus": bool(s.get("aus"))}
    g = s.get("gef")
    if isinstance(g, dict):
        x["gef"] = {"holz": t(g.get("holz"), 80), "breite": _f(g.get("breite"), 0, 500), "abstand": _f(g.get("abstand"), 0, 1000), "anteil": _f(g.get("anteil"), 0, 1),
                    "lage": g.get("lage") if g.get("lage") in ("erst", "kreuz", "flucht") else "erst", "lam": _f(g.get("lam"), 0, 500), "r": _f(g.get("r"), 0, 100)}
    return x


def _stufe(st, t):
    if not isinstance(st, dict):
        return None
    s = _f(st.get("s"), 0, 4)
    return {"s": int(s or 0), "text": t(st.get("text"), 40), "zeichen": t(st.get("zeichen"), 4), "prozent": _f(st.get("prozent"), 0, 10000)}


def _inh(x, t):
    """Inhomogene Schichten nach DIN EN ISO 6946: Teilflächen, R′, R″, Fehler, R′/R″ (SA-12, SA-13)."""
    if not isinstance(x, dict):
        return None
    return {"ro": _f(x.get("ro"), 0, 100), "ru": _f(x.get("ru"), 0, 100), "fehler": _f(x.get("fehler"), -1, 1), "verh": _f(x.get("verh"), 0, 100), "ok": bool(x.get("ok")),
            "teil": [[t(p[0], 60), _f(p[1], 0, 1), _f(p[2], 0, 100)] for p in (x.get("teil") or [])[:16] if isinstance(p, (list, tuple)) and len(p) == 3]}


def _aufbau_zeichnung(b, W, F):
    """Gesamtaufbau als Blöcke (innen → außen): Maßkette oben, Nummern unten, Gefach als Holz-Querschnitte (erstes Gefach mit Kreuz)."""
    from reportlab.graphics.shapes import Circle, Drawing, Line, Rect, String
    from reportlab.lib import colors
    L = [s for s in b["schichten"] if (s["d"] or 0) > 0]
    if not L:
        return None
    H, X0, BW = 64.0, 26.0, W - 60.0
    gs = sum(s["d"] for s in L)
    w = [max(0.024, s["d"] / gs) for s in L]
    k = sum(w)
    w = [x / k * BW for x in w]
    d = Drawing(W, H + 34)
    y0 = 16.0
    d.add(String(2, y0 + H / 2, "innen", fontName=F["n"], fontSize=6.5))
    d.add(String(X0 + BW + 4, y0 + H / 2, "außen", fontName=F["n"], fontSize=6.5))
    x = X0
    for i, (s, ww) in enumerate(zip(L, w)):
        d.add(Rect(x, y0, ww, H, fillColor=colors.white if s["aus"] else colors.HexColor(s["farbe"]), strokeColor=colors.HexColor("#333333"), strokeWidth=0.5,
                   strokeDashArray=[2, 1.5] if s["aus"] else None))
        g = s.get("gef")
        if g and g["breite"] and g["abstand"]:
            sk = H / 90.0
            yy = -g["abstand"] / 2 + 12
            while yy < 90:
                a, e = max(0, yy), min(90, yy + g["breite"])
                if e > a:
                    ry = y0 + H - e * sk
                    d.add(Rect(x, ry, ww, (e - a) * sk, fillColor=colors.HexColor("#c99a5b"), strokeColor=colors.HexColor("#6b4a22"), strokeWidth=0.4))
                    if g["lage"] != "kreuz":
                        d.add(Line(x, ry, x + ww, ry + (e - a) * sk, strokeColor=colors.HexColor("#6b4a22"), strokeWidth=0.4))
                        d.add(Line(x, ry + (e - a) * sk, x + ww, ry, strokeColor=colors.HexColor("#6b4a22"), strokeWidth=0.4))
                yy += max(g["abstand"], g["breite"] + 1)
        d.add(Line(x, y0 + H + 6, x, y0 + H + 12, strokeWidth=0.4))
        if ww > 14:
            d.add(String(x + ww / 2, y0 + H + 8, f"{s['d']:g}".replace(".", ","), fontName=F["n"], fontSize=6.5, textAnchor="middle"))
        d.add(Circle(x + ww / 2, 7, 4.6, fillColor=colors.white, strokeColor=colors.HexColor("#333333"), strokeWidth=0.4))
        d.add(String(x + ww / 2, 5, str(i + 1), fontName=F["n"], fontSize=5.8, textAnchor="middle"))
        x += ww
    d.add(Line(x, y0 + H + 6, x, y0 + H + 12, strokeWidth=0.4))
    d.add(Line(X0, y0 + H + 9, x, y0 + H + 9, strokeWidth=0.4))
    return d


@app.post("/api/nachweise/<int:nid>/druckdaten")
def druckdaten(nid):
    """Ergebnisse aus dem Browser für den Ausdruck merken (je Nachweis, wird bei jedem Drucken neu geschickt)."""
    b = request.get_json(silent=True) or {}
    with db.tx() as c:
        n = _nachweis(c, nid)
        if not n:
            return jsonify(error="Nachweis nicht gefunden"), 404
        d = {"bauteile": [_bt(x) for x in (b.get("bauteile") or [])[:80] if isinstance(x, dict)],
             "fassung": str(b.get("fassung") or "")[:200], "zone": str(b.get("zone") or "")[:80], "vorhaben": str(b.get("vorhaben") or "")[:120],
             "soll": {k: str((b.get("soll") or {}).get(k) or "")[:300] for k in ("n", "quelle", "stand", "land")}}
        c.execute("INSERT INTO bp_store(key, data, updated, updated_by) VALUES(?,?,?,?) ON CONFLICT(key) DO UPDATE SET data=excluded.data, updated=excluded.updated, updated_by=excluded.updated_by",
                  (f"ws:druck:{nid}", json.dumps(d, ensure_ascii=False), datetime.now().isoformat(timespec="seconds"), g.user["name"]))
        ordner = "/".join(ablage_einst.ordner(einstellungen.alle(c), "ordner_waerme"))   # C1: Ordner aus den Einstellungen des Wärmeschutzes
    return jsonify(ok=True, ordner=ordner)


def _werte(c, n, p):
    S = {x["key"]: x["value"] for x in c.execute("SELECT key, value FROM settings WHERE key='office_name' OR key LIKE 'co\\_%'").fetchall()}
    kurz = S.get("co_short") or S.get("office_name") or ""
    W = {"buero": S.get("office_name") or kurz, "datum": date.today().strftime("%d.%m.%Y"), "bearbeiter": C.full_name(g.user),
         "fusszeile": " · ".join(v for v in (kurz, S.get("co_street"), " ".join(x for x in (S.get("co_zip"), S.get("co_city")) if x), S.get("co_phone"), S.get("co_email"), S.get("co_web")) if v),
         "projekt": p.get("name", ""), "bauvorhaben": p.get("name", ""), "bauherr": p.get("client", ""), "dokument": "Nachweis des Wärmeschutzes",
         "untertitel": n["name"], "lv": "Wärmeschutznachweis", "gewerk": "", "auftragnehmer": ""}
    W.update({k: v for k, v in layout.eigene_werte(c, n["project_id"]).items() if v or k not in W})
    return W


def _diagramm(b, breite, glaser, fn="Helvetica"):
    """Temperaturverlauf (A2) bzw. Dampfdruck nach Glaser als kleine Grafik (reportlab Drawing)."""
    from reportlab.graphics.shapes import Drawing, Line, PolyLine, Rect, String
    from reportlab.lib import colors
    h = 120
    D = Drawing(breite, h + 22)
    D.add(Rect(0, 18, breite, h, strokeColor=colors.HexColor("#d9d6cf"), fillColor=None, strokeWidth=0.5))
    if glaser:
        G = b["glaser"]
        P = [q for q in G["ps"] if None not in q] + [q for q in G["p"] if None not in q]
        if not P:
            return None
        xs, ys = [q[0] for q in P], [q[1] for q in P]
        x0, x1, y0, y1 = min(xs), max(xs) or 1, 0, max(ys) * 1.05 or 1
        sx, sy = (breite - 10) / ((x1 - x0) or 1), (h - 10) / ((y1 - y0) or 1)
        pt = lambda q: (5 + (q[0] - x0) * sx, 23 + (q[1] - y0) * sy)   # noqa: E731
        D.add(PolyLine([v for q in G["ps"] if None not in q for v in pt(q)], strokeColor=colors.HexColor("#c0392b"), strokeWidth=1.2))
        D.add(PolyLine([v for q in G["p"] if None not in q for v in pt(q)], strokeColor=colors.HexColor("#2c63c9"), strokeWidth=1.2))
        D.add(String(4, 4, "Dampfdruck über sd: rot Sättigungsdruck · blau vorhandener Druck (Glaser, DIN 4108-3)", fontName=fn, fontSize=7, fillColor=colors.HexColor("#6b6b66")))
        return D
    T = [q for q in b["temp"] if None not in q]
    if len(T) < 2:
        return None
    x1 = max(q[0] for q in T) or 1
    tmin, tmax = min(q[1] for q in T), max(q[1] for q in T)
    sx, sy = (breite - 10) / x1, (h - 10) / ((tmax - tmin) or 1)
    pt = lambda q: (5 + q[0] * sx, 23 + (q[1] - tmin) * sy)   # noqa: E731
    for q in T[1:-1]:
        D.add(Line(5 + q[0] * sx, 18, 5 + q[0] * sx, 18 + h, strokeColor=colors.HexColor("#ece9e2"), strokeWidth=0.5))
    D.add(PolyLine([v for q in T for v in pt(q)], strokeColor=colors.HexColor("#c0392b"), strokeWidth=1.4))
    D.add(String(4, 4, f"Temperaturverlauf innen → außen: {T[0][1]:.1f} °C … {T[-1][1]:.1f} °C (Winter)".replace(".", ","), fontName=fn, fontSize=7, fillColor=colors.HexColor("#6b6b66")))
    return D


@app.get("/api/nachweise/<int:nid>/nachweis.pdf")
def nachweis_pdf(nid):
    teile = [t for t in (request.args.get("teile") or ",".join(TEILE[:3])).split(",") if t in TEILE]
    with db.tx() as c:
        n = _nachweis(c, nid)
        if not n:
            return jsonify(error="Nachweis nicht gefunden"), 404
        r = c.execute("SELECT data FROM bp_store WHERE key=?", (f"ws:druck:{nid}",)).fetchone()
        DD = _j(r["data"], {}) if r else {}
        if not DD.get("bauteile"):
            return jsonify(error="Noch keine Ergebnisse – bitte in der Stufe „Nachweis“ auf „📄 Nachweis erzeugen“ tippen."), 400
        det = _detail(c, n)
        pr = c.execute("SELECT name, client, street, zip, city FROM projects WHERE id=?", (n["project_id"],)).fetchone()
        p = dict(pr) if pr else {}
        bv = bueroinfo.bauvorlage(c)   # B1: Aufsteller:in = Bauvorlageberechtigte:r des Büros
        LAY = layout.aktiv(c, "waermeschutz", request.args.get("layout.waermeschutz") or request.args.get("layout"))
        unter, frei, _roh = layout.bogen(c, LAY)
        LW = _werte(c, n, p)
        F = schrift.fuer(c)
    pdf = bauen(DD, teile, p, bv, LW, LAY, frei, det["grundlagen"], C.full_name(g.user), F=F, logo_fn=lambda cv_, r_, t_, h_, w_: C.draw_logo(cv_, r_, t_, h_, w_))
    if unter:
        from bpcore import briefbogen
        pdf = briefbogen.unterlegen(pdf, unter, seiten=1)
    return Response(pdf, mimetype="application/pdf", headers={"Content-Disposition": "inline; filename=Waermeschutznachweis.pdf"})


def bauen(DD, teile, p, bv, LW, LAY, frei, gl, wer, F=None, logo_fn=None):
    """Das PDF aus den gemerkten Ergebnissen (ohne Datenbank – prüft einheit/plattform_ws_pdf.py)."""
    from reportlab.lib import colors
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.platypus import BaseDocTemplate, CondPageBreak, KeepTogether, PageBreak, Paragraph, Spacer, Table, TableStyle
    from xml.sax.saxutils import escape as X
    office = LW.get("buero") or ""
    F = F or schrift.registrieren("lato")   # Schrift der Briefe (mit ² und λ)
    INK, MUTE, LINE, BAND, OK, NO = (colors.HexColor(x) for x in ("#1c1c1a", "#6b6b66", "#d9d6cf", "#f2efe8", "#2e7d32", "#c62828"))
    S = {"h1": ParagraphStyle("h1", fontName=F["b"], fontSize=20, leading=25, textColor=INK, spaceAfter=4),
         "h2": ParagraphStyle("h2", fontName=F["b"], fontSize=12.5, leading=16, textColor=INK, spaceBefore=4, spaceAfter=5),
         "p": ParagraphStyle("p", fontName=F["n"], fontSize=9.5, leading=13.5, textColor=INK),
         "m": ParagraphStyle("m", fontName=F["n"], fontSize=8, leading=11, textColor=MUTE),
         "c": ParagraphStyle("c", fontName=F["n"], fontSize=8.8, leading=11, textColor=INK)}
    z = lambda v, k=2: "–" if v is None else f"{v:,.{k}f}".replace(",", "§").replace(".", ",").replace("§", ".")   # noqa: E731
    tpl, W = layout.platypus_seiten(LAY, LW, F, logo_fn=logo_fn, bogen=frei)

    def tab(rows, widths, rechts=(), fett=()):
        t = Table(rows, colWidths=widths, repeatRows=1)
        st = [("FONT", (0, 0), (-1, -1), F["n"], 8.8), ("FONT", (0, 0), (-1, 0), F["b"], 8), ("TEXTCOLOR", (0, 0), (-1, 0), MUTE),
              ("LINEBELOW", (0, 0), (-1, 0), 0.8, INK), ("LINEBELOW", (0, 1), (-1, -1), 0.3, LINE), ("VALIGN", (0, 0), (-1, -1), "TOP"),
              ("TOPPADDING", (0, 0), (-1, -1), 2.5), ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5), ("LEFTPADDING", (0, 0), (-1, -1), 3)]
        st += [("ALIGN", (k, 0), (k, -1), "RIGHT") for k in rechts] + [("FONT", (0, i), (-1, i), F["b"], 8.8) for i in fett]
        t.setStyle(TableStyle(st))
        return t
    B = DD["bauteile"]
    alle_ok = all(b["ok"] is not False for b in B)
    SO = DD.get("soll") or {}
    soll_t = " – ".join(x for x in (SO.get("n"), f"{SO.get('quelle')}, Stand {SO.get('stand')}" if SO.get("quelle") else "") if x) or "GModG Anlage 7 (Höchstwert je Maßnahme)"
    stufe_t = lambda b: (f"{b['stufe']['zeichen']} {b['stufe']['text']} ({z(b['stufe']['prozent'], 0)} %)" if b.get("stufe")   # noqa: E731
                         else "erfüllt" if b["ok"] else "nicht erfüllt" if b["ok"] is False else "–")
    story = []
    if "deckblatt" in teile:
        adr = ", ".join(x for x in (p.get("street") or "", " ".join(y for y in (p.get("zip") or "", p.get("city") or "") if y)) if x)
        auf = ", ".join(x for x in (bv.get("name"), bv.get("beruf"), (bv.get("kammer") + " " + bv.get("kammernr")).strip() if bv.get("kammer") or bv.get("kammernr") else "") if x)
        story += [Spacer(1, 18 * mm), Paragraph("Nachweis des Wärmeschutzes", S["h1"]),
                  Paragraph(X(f"nach dem Gebäudemodernisierungsgesetz (GModG) · {DD.get('vorhaben') or gl.get('vorhaben') or ''}"), S["p"]), Spacer(1, 8 * mm)]
        for k, v in (("Bauvorhaben", ", ".join(x for x in (p.get("name") or "", adr if adr and adr not in (p.get("name") or "") else "") if x)), ("Bauherr:in", p.get("client") or ""),
                     ("Aufgestellt von", "\n".join(x for x in (auf or wer, office) if x)), ("Grundlagen", " · ".join(x for x in (DD.get("fassung"), DD.get("zone")) if x)), ("Anforderung (Soll)", soll_t),
                     ("Ergebnis", ("Alle " if alle_ok else "") + f"{sum(1 for b in B if b['ok'] is not False)} von {len(B)} Bauteilen erfüllen die Anforderungen.")):
            if v:
                story += [Paragraph(X(k), S["m"]), Paragraph(X(v).replace("\n", "<br/>"), S["p"]), Spacer(1, 3.5 * mm)]
        story += [Spacer(1, 18 * mm), Paragraph("_" * 46, S["p"]), Paragraph(X(f"Ort, Datum · Unterschrift {bv.get('name') or ''}".strip()), S["m"]), PageBreak()]
    if "uebersicht" in teile:
        rows = [["Bauteil", "Fläche", "U vorh.", "Soll", ""]] + [[Paragraph(X(b["name"]) + (f"<br/><font size=7 color='#6b6b66'>{X(b['art'])}</font>" if b["art"] else ""), S["c"]),
                                                              f"{z(b['flaeche'], 0)} m²" if b["flaeche"] else "", z(b["u"]), z(b["umax"]) if b["umax"] else "–",
                                                              stufe_t(b)] for b in B]
        t = tab(rows, [W - 90 * mm, 22 * mm, 20 * mm, 20 * mm, 28 * mm], rechts=(1, 2, 3))
        t.setStyle(TableStyle([("TEXTCOLOR", (4, i + 1), (4, i + 1), OK if b["ok"] else NO) for i, b in enumerate(B) if b["ok"] is not None]))
        story += [Paragraph("Übersicht der Bauteile", S["h2"]), t, Spacer(1, 3 * mm),
                  Paragraph(X("U-Werte nach DIN EN ISO 6946, Bemessungswerte der Wärmeleitfähigkeit nach DIN 4108-4 bzw. Herstellerangabe. Soll: " + soll_t), S["m"]), Spacer(1, 6 * mm)]
    if "bauteile" in teile:
        for b in B:
            el = [Paragraph(X(b["name"]), S["h2"]), Paragraph(X(" · ".join(x for x in (b["art"], b["einordnung"], f"{z(b['flaeche'], 0)} m²" if b["flaeche"] else "") if x)), S["m"]), Spacer(1, 2 * mm)]
            if b["schichten"]:
                zg = _aufbau_zeichnung(b, W, F)
                if zg:
                    el += [Paragraph("AUFBAU (INNEN → AUSSEN, MASSE IN CM)", S["m"]), zg, Spacer(1, 2 * mm)]
                rows, grau = [["Nr", "Schicht", "= Baustoff", "d cm", "λ", "R"]], []
                for i, s_ in enumerate(b["schichten"]):
                    rows.append([str(i + 1), Paragraph(X(s_["name"] or s_["baustoff"]) + (" <i>(belüftet, zählt nicht)</i>" if s_["aus"] else ""), S["c"]),
                                 Paragraph(X(s_["baustoff"] if s_["name"] and s_["name"] != s_["baustoff"] else ""), S["c"]), z(s_["d"], 2 if s_["d"] and round(s_["d"], 1) != s_["d"] else 1), z(s_["lam"], 3), z(s_["r"], 3) if s_["r"] is not None else "–"])
                    g_ = s_.get("gef")
                    if g_:
                        lage = {"kreuz": ", kreuzweise", "flucht": ", in Flucht"}.get(g_["lage"], "")
                        rows.append(["", Paragraph(X(f"Gefach {g_['holz']} {z(g_['breite'], 0)} cm, Abstand {z(g_['abstand'], 1)} cm – Anteil {z((g_['anteil'] or 0) * 100, 1)} %{lage}"), S["m"]),
                                     "", "", z(g_["lam"], 3), z(g_["r"], 3)])
                        grau.append(len(rows) - 1)
                t_ = tab(rows, [W * 0.06, W * 0.34, W * 0.3, W * 0.1, W * 0.1, W * 0.1], rechts=(3, 4, 5))
                t_.setStyle(TableStyle([("TEXTCOLOR", (0, i), (-1, i), MUTE) for i in grau] + [("FONT", (0, i), (-1, i), F["n"], 7.8) for i in grau] + [("SPAN", (1, i), (3, i)) for i in grau]))
                el.append(t_)
                el.append(Spacer(1, 1.5 * mm))
                ih = b.get("inh")
                if ih and ih["teil"]:
                    zeilen = [[Paragraph(X(f"Teilfläche {n}"), S["c"]), f"{z((f or 0) * 100, 1)} %", f"R {z(r, 3)}"] for n, f, r in ih["teil"]]
                    zeilen += [[Paragraph("obere Grenze R′", S["c"]), "", z(ih["ro"], 3)], [Paragraph("untere Grenze R″", S["c"]), "", z(ih["ru"], 3)],
                               [Paragraph("R<sub>T</sub> = (R′ + R″) / 2", S["c"]), "", z(b["rt"], 3)],
                               [Paragraph("Fehler e · R′/R″", S["c"]), f"{z((ih['fehler'] or 0) * 100, 1)} %", z(ih["verh"])]]
                    el += [Paragraph("INHOMOGENE SCHICHTEN NACH DIN EN ISO 6946", S["m"]), tab([["", "Anteil", "R m²K/W"]] + zeilen, [W * 0.6, W * 0.2, W * 0.2], rechts=(1, 2)), Spacer(1, 1.5 * mm)]
                    if not ih["ok"]:
                        el.append(Paragraph("<font color='#c62828'><b>R′/R″ &gt; 1,5 – das vereinfachte Verfahren ist nicht zulässig; eine Wärmebrückenberechnung ist nötig. Der U-Wert ist nur ein Anhalt.</b></font>", S["p"]))
            el.append(Paragraph(X(f"Rsi {z(b['rsi'])} · Rse {z(b['rse'])} · RT {z(b['rt'])} m²K/W · ") + f"<b>U = {z(b['u'])} W/(m²K)</b>"
                                + (X(f" · Soll {z(b['umax'])}") if b["umax"] else "") + (f" <font color='{'#2e7d32' if b['ok'] else '#c62828'}'>– {X(stufe_t(b))}</font>" if b["ok"] is not None else ""), S["p"]))
            if b["hinweis"]:
                el.append(Paragraph(X(b["hinweis"]), S["m"]))
            if "glaser" in teile and b["schichten"]:
                for gl_ in (False, True):
                    d_ = _diagramm(b, W, gl_, F["n"])
                    if d_:
                        el += [Spacer(1, 2 * mm), d_]
                G = b["glaser"]
                el.append(Paragraph(X("Tauwasser (Glaser): " + ("kein Tauwasser im Bauteil." if not G["tauwasser"] else
                                                                 f"Tauwassermenge {z(G['mc'], 3)} kg/m², Verdunstung {z(G['mev'], 3)} kg/m² – " + ("trocknet aus." if (G["mev"] or 0) >= (G["mc"] or 0) else "trocknet nicht vollständig aus!"))), S["p"]))
            el.append(Spacer(1, 6 * mm))
            story += [CondPageBreak(70 * mm), KeepTogether(el) if len(el) < 12 else el[0]] + ([] if len(el) < 12 else el[1:])
    if not story:
        story = [Paragraph("Keine Teile gewählt.", S["p"])]
    buf = io.BytesIO()
    doc = BaseDocTemplate(buf, pagesize=layout.seite_pt(LAY), title=f"Wärmeschutznachweis {p.get('name') or ''}".strip(), author=office or "Bauplattform")
    doc.addPageTemplates(tpl)
    doc.build(story)
    return buf.getvalue()
