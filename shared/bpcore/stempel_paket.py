"""Stempel und Unterschriften im PDF-Paket (Rechnungsfreigabe): an den vorgesehenen Stellen vorschlagen, nach der Lage einsetzen.

Ein Paket besteht aus Teilen (Rechnungsfreigabe, Prüfblatt, Massenermittlung, Rechnung der Firma …), jeder Teil hat seine Seiten im Paket.
Gemerkt wird je Rechnung nur die Lage (Teil, Seite im Teil, x/y/Breite/Höhe als Anteile der Seite, gelöscht ja/nein) – nie das fertige PDF.
Beim Erzeugen wird gestempelt: Büro-, Prüfstempel (Prüfdatum und Name in den Feldern), „Zahlbetrag siehe Anlage“, Unterschrift (rot).

Objekt: {"id": "r1-zahlbetrag", "art": "buero"|"pruef"|"zahlbetrag"|"sig", "teil": "rechnung:3", "s": 0, "x": .6, "y": .03, "w": .34, "h": .09, "weg": False}
"""
import io, re

from . import stempel, unterschrift

ARTEN = ("buero", "pruef", "zahlbetrag", "sig")
ROT = (178, 24, 24)
# Seitenverhältnis (Breite : Höhe) der Stempel als Vorgabe, falls kein Bild da ist – die Höhe ergibt sich beim Einsetzen aus dem Bild
VERH = {"buero": 2.6, "pruef": 1.0, "zahlbetrag": 6.0, "sig": 3.2}


def _hoehe(art, w, seite_verh=0.707):
    """Höhe (Anteil der Seitenhöhe) zu einer Breite (Anteil der Seitenbreite) – A4 hoch: Breite/Höhe = 0,707."""
    return round(w * seite_verh / VERH.get(art, 2.0), 4)


def suche(pdf, woerter, seiten=None):
    """Fundstellen von Wörtern (ohne Groß/klein) → [(seite, x0, y0, x1, y1)] als Anteile, y von oben."""
    out = []
    try:
        import pypdfium2 as pdfium
        doc = pdfium.PdfDocument(pdf)
        for n in (seiten if seiten is not None else range(len(doc))):
            if n < 0 or n >= len(doc):
                continue
            pg = doc[n]; bw, bh = pg.get_size(); tp = pg.get_textpage()
            for w in woerter:
                s = tp.search(w, match_case=False)
                while True:
                    f = s.get_next()
                    if not f:
                        break
                    i, k = f
                    boxen = [tp.get_charbox(j) for j in range(i, i + k)]
                    x0 = min(b[0] for b in boxen); x1 = max(b[2] for b in boxen); y0 = min(b[1] for b in boxen); y1 = max(b[3] for b in boxen)
                    out.append((n, w, x0 / bw, 1 - y1 / bh, x1 / bw, 1 - y0 / bh))
                s.close()
            tp.close(); pg.close()
        doc.close()
    except Exception:
        return []
    return out


def _ob(id_, art, teil, s, x, y, w, h=None):
    h = _hoehe(art, w) if h is None else h
    x = max(0.01, min(0.99 - w, x)); y = max(0.01, min(0.99 - h, y))
    return {"id": id_, "art": art, "teil": teil, "s": s, "x": round(x, 4), "y": round(y, 4), "w": round(w, 4), "h": round(h, 4), "weg": False}


def vorschlag(teile, betrag=""):
    """teile: [{"teil": "freigabe"|"pruef"|"aufmass"|"rechnung:<id>", "pdf": bytes, "n": Seiten}] → Objekte an den vorgesehenen Stellen."""
    out = []
    for t in teile:
        tk, pdf, n = t["teil"], t["pdf"], max(1, t.get("n") or 1)
        if tk in ("freigabe", "pruef"):
            # Freigabe: über „Bauleitung / Objektüberwachung“ unterschreiben, Prüfstempel links daneben;
            # Prüfblatt allein: unter „Sachlich und rechnerisch geprüft“
            f = [x for x in suche(pdf, ["Bauleitung / Objektüberwachung"]) if tk == "freigabe"]
            if f:
                s, _, x0, y0, _, y1 = f[0]
                out.append(_ob(f"{tk}-pruef", "pruef", tk, s, 0.05, y1 + 0.03, 0.17))   # unter der Unterschriftszeile (darüber steht der Text der Freigabe)
                out.append(_ob(f"{tk}-sig", "sig", tk, s, x0, y0 - 0.065, 0.2))
                continue
            g = suche(pdf, ["rechnerisch geprüft"])
            s, y = (g[-1][0], g[-1][5] + 0.012) if g else (n - 1, 0.78)
            out.append(_ob(f"{tk}-pruef", "pruef", tk, s, 0.06, y, 0.17))
            out.append(_ob(f"{tk}-sig", "sig", tk, s, 0.27, y + 0.06, 0.2))
        elif tk == "aufmass":
            out.append(_ob("aufmass-pruef", "pruef", tk, n - 1, 0.06, 0.8, 0.17))
            out.append(_ob("aufmass-sig", "sig", tk, n - 1, 0.27, 0.86, 0.2))
        elif tk.startswith("rechnung"):
            out.append(_ob(f"{tk}-buero", "buero", tk, 0, 0.6, 0.025, 0.34))
            # „Zahlbetrag siehe Anlage“ neben den Rechnungsbetrag der Firma (gesuchte Beschriftung, sonst der Betrag selbst)
            f = suche(pdf, ["Rechnungsbetrag", "Gesamtbetrag", "Endbetrag", "Bruttobetrag", "Zahlbetrag", "zu zahlen"] + ([betrag] if betrag else []))
            if f:
                s, _, x0, y0, x1, y1 = f[-1]
                out.append(_ob(f"{tk}-zahlbetrag", "zahlbetrag", tk, s, max(0.04, min(0.62, x0)), y1 + 0.008, 0.32))
            else:
                out.append(_ob(f"{tk}-zahlbetrag", "zahlbetrag", tk, 0, 0.55, 0.72, 0.32))
            out.append(_ob(f"{tk}-pruef", "pruef", tk, 0, 0.05, 0.8, 0.16))
            out.append(_ob(f"{tk}-sig", "sig", tk, 0, 0.24, 0.86, 0.2))
    return out


def bereinigen(liste):
    """Lage vom Browser prüfen: nur bekannte Arten, Zahlen in 0…1."""
    out = []
    for o in (liste or [])[:80]:
        if not isinstance(o, dict) or o.get("art") not in ARTEN:
            continue
        try:
            z = {k: max(0.0, min(1.0, float(o.get(k)))) for k in ("x", "y", "w", "h")}
            out.append({"id": str(o.get("id") or "")[:60], "art": o["art"], "teil": str(o.get("teil") or "")[:40], "s": max(0, int(o.get("s") or 0)),
                        **{k: round(v, 4) for k, v in z.items()}, "weg": bool(o.get("weg"))})
        except (TypeError, ValueError):
            continue
    return out


def zusammenfuehren(gemerkt, vorschlag_):
    """Gemerkte Lage gilt; neue Teile (z. B. eine weitere Rechnung der Firma) bekommen den Vorschlag."""
    if not gemerkt:
        return vorschlag_
    teile_g = {o["teil"] for o in gemerkt}
    return gemerkt + [o for o in vorschlag_ if o["teil"] not in teile_g]


def anwenden(pdf, objekte, bereiche, bild, felder_pruef=()):
    """objekte nach der Lage einsetzen. bereiche: {teil: erste Seite im Paket (0-basiert), …}; bild(art) → PNG oder None."""
    cache = {}
    for o in objekte:
        if o.get("weg") or o.get("teil") not in bereiche:
            continue
        art = o["art"]
        if art not in cache:
            png = bild(art)
            cache[art] = stempel.einfaerben(png, ROT) if png and art == "sig" else png
        png = cache[art]
        if not png:
            continue
        seite = bereiche[o["teil"]] + int(o.get("s") or 0) + 1
        try:
            pdf = unterschrift.stempeln(pdf, png, seite, o["x"], o["y"], o["w"], o["h"], "", drehung=-2.0 if art in ("buero", "pruef", "zahlbetrag") else 0.0,
                                        felder=felder_pruef if art == "pruef" else ())
        except Exception:
            continue
    return pdf


def seiten(pdf):
    from pypdf import PdfReader
    return len(PdfReader(io.BytesIO(pdf)).pages)


def betrag_text(v):
    """12345.6 → '12.345,60' (wie auf deutschen Rechnungen)."""
    try:
        return re.sub(r"(\d)(?=(\d{3})+,)", r"\1.", f"{float(v):.2f}".replace(".", ","))
    except (TypeError, ValueError):
        return ""
