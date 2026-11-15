"""Fenster- & Türliste als PDF (beschlossen am 15.11.2026, Mock „Türliste drucken und anhängen“).

· Drucken aus der Türliste: GET /api/projekt/<pid>/tueren.pdf?liste=… – Druckseite des Baukastens (Layout „Türliste“, Ablegen, Senden, Stempel).
· Als Anlage: GET /api/lv/<i>/tueren.pdf?ganz=0|1 – die Elemente, aus denen das LV Positionen hat (ganz=1: die ganzen Listen).
  Die Druckseite hängt sie hinten an (bp/druck.js, „anlagen“), der LV-Druck und der Versand an Bieter:innen ebenso.
Welche Elemente im LV stecken, steht an den Positionen: „tl“ = „<liste>|<gruppe>|…“, „quelle“ = „Türliste: T 0.01, T 0.02“.
SPALTEN gilt auch für die Excel-Ausgabe (ava.tueren_excel).
"""
import re

from flask import Response, jsonify, request

from ava import TUER_JA, _j, _lv, _pdf, _sees, _tl_id, _tueren_laden, app
from bpcore import db

SPALTEN = [("nr", "Tür-Nr."), ("geschoss", "Geschoss"), ("raum", "Raum-Nr."), ("raumname", "Raum"), ("zu", "zu Raum"), ("typ", "Typ"), ("anzahl", "Anz."), ("art", "Art"),
           ("flg", "Flügel"), ("din", "Öffnungsrichtung"), ("b", "Breite"), ("h", "Höhe"), ("wand", "Wand"), ("bruestung", "Brüstung"),
           ("oeffnung", "Öffnungsart"), ("fb_innen", "Innenfensterbank"), ("fb_aussen", "Außenfensterbank"), ("rollo", "Rollo"), ("zarge", "Zarge"), ("blatt", "Türblatt"),
           ("oberfl", "Oberfläche"), ("farbe", "Farbe"), ("glas", "Verglasung"), ("brand", "Brandschutz"), ("schall", "Schall"), ("rc", "RC"),
           ("klima", "Klima"), ("schloss", "Schloss"), ("beschlag", "Beschlag")] + [(k, v.split(" (")[0].split(" nach")[0]) for k, v in TUER_JA.items()] + [("bem", "Bemerkung")]
# „die wichtigsten“ (A4 quer): Ausstattung (Häkchen-Merkmale) als eine Spalte mit Marken
WICHTIG = ["nr", "geschoss", "raum", "raumname", "typ", "anzahl", "art", "din", "b", "h", "brand", "schall", "glas", "_aus", "bem"]
BREITE = {"nr": 16, "geschoss": 13, "raum": 15, "raumname": 28, "typ": 12, "anzahl": 9, "art": 26, "din": 16, "b": 13, "h": 13, "brand": 18, "schall": 14, "glas": 20, "_aus": 40, "bem": 40}


def lv_elemente(items):
    """Positionen eines LV → {liste: {Tür-Nr., …}} (aus „tl“ und „quelle“)."""
    out = {}
    for x in items or []:
        tl, q = str(x.get("tl") or ""), str(x.get("quelle") or "")
        if not tl or not q.startswith("Türliste:"):
            continue
        out.setdefault(tl.split("|")[0], set()).update(n.strip() for n in q[len("Türliste:"):].split(",") if n.strip() and n.strip() != "?")
    return out


def _zeilen(T, alle):
    """Kopf und Zeilen der Tabelle; ohne „alle“ die wichtigsten Spalten und die Ausstattung als Marken."""
    namen = dict(SPALTEN)
    if alle:
        sp = [k for k, _ in SPALTEN]
        kopf = [namen[k] for k in sp]
        return kopf, [[("x" if t.get(k) else "") if k in TUER_JA else str(t.get(k, "") or "") for k in sp] for t in T], sp
    kopf = ["Ausstattung" if k == "_aus" else namen[k] for k in WICHTIG]
    zeilen = [[" · ".join(namen[k] for k in TUER_JA if t.get(k)) if k == "_aus" else str(t.get(k, "") or "") for k in WICHTIG] for t in T]
    return kopf, zeilen, WICHTIG


def pdf(c, pid, listen, nur=None, r=None, alle=False, titel=None):
    """listen: [Listen-Id …]; nur: {liste: {Tür-Nr.}} oder None (alle Elemente); r: LV (Fußzeile, Variablen) oder None."""
    p = _sees(c, pid)
    blocks = []
    for lid in listen:
        d = _tueren_laden(c, pid, lid)
        T = [t for t in d["tueren"] if nur is None or str(t.get("nr") or "").strip() in nur.get(lid, set())]
        if T:
            blocks.append((d["name"] or ("Fenster- & Türliste" if lid == "1" else "Liste"), T))
    n = sum(len(T) for _, T in blocks)
    r0 = r or {"project_id": pid, "vergabe": None, "nr": "", "name": "", "gewerk": ""}
    titel = titel or ("Fenster- & Türliste" if len(blocks) != 1 else blocks[0][0])
    sub = f"{p['name'] if p else ''} · {n} Element{'' if n == 1 else 'e'}" + (f" · LV {r['nr']} {r['name']}" if r else "")

    def story(st, S, X, table, W, mm, _p):
        from reportlab.platypus import Paragraph, Spacer
        for name, T in blocks:
            if len(blocks) > 1:
                st.append(Paragraph(X(name), S["h2"]))
            kopf, zeilen, sp = _zeilen(T, alle)
            w = [BREITE.get(k, 6 if k in TUER_JA else 14) for k in sp]
            f = W / sum(w)
            st.append(table([[Paragraph(X(k), S["l"]) for k in kopf]] + [[Paragraph(X(v), S["p"]) for v in z] for z in zeilen], [x * f for x in w]))
            st.append(Spacer(1, 4 * mm))
        if not blocks:
            st.append(Paragraph("Keine Elemente.", S["p"]))
    return _pdf(r0, titel, sub, story, quer=True, bereich="tuerliste", werte={"lv": f"LV {r['nr']} {r['name']}" if r else titel}, a3=alle), n


def _opt():
    import json
    from bpcore import layout
    try:
        ex = json.loads(request.args.get("opt.tuerliste") or request.args.get("opt") or "{}")
    except ValueError:
        ex = {}
    with db.tx() as c_:
        return layout.optionen(c_, "tuerliste", request.args.get("layout.tuerliste") or request.args.get("layout"), ex if isinstance(ex, dict) else {})


def _antwort(data, name):
    from urllib.parse import quote
    fn = quote(re.sub(r'[\\/:*?"<>|]+', "_", name) + ".pdf")
    return Response(data, mimetype="application/pdf", headers={"Content-Disposition": f"inline; filename*=UTF-8''{fn}"})


@app.get("/api/projekt/<int:pid>/tueren.pdf")
def tueren_pdf(pid):
    alle = _opt().get("spalten") == "alle"
    with db.tx() as c:
        if not _sees(c, pid):
            return jsonify(error="Projekt nicht gefunden"), 404
        data, _n = pdf(c, pid, [_tl_id(request.args.get("liste"))], alle=alle)
        p = _sees(c, pid)
    return _antwort(data, f"Türliste {p['name']}")


@app.get("/api/lv/<int:i>/tueren.pdf")
def lv_tueren_pdf(i):
    alle = _opt().get("spalten") == "alle"
    with db.tx() as c:
        r = _lv(c, i)
        if not r or not r["project_id"] or not _sees(c, r["project_id"]):
            return jsonify(error="LV nicht gefunden"), 404
        E = lv_elemente((_j(r["data"], {}) or {}).get("items"))
        if not E:
            return jsonify(error="Dieses LV hat keine Positionen aus einer Türliste."), 404
        data, _n = pdf(c, r["project_id"], sorted(E), None if request.args.get("ganz") == "1" else E, r, alle=alle, titel="Anlage – Fenster- & Türliste")
    return _antwort(data, f"Türliste LV {r['nr']}")
