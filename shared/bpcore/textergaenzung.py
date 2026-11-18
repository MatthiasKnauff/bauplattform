"""Textergänzungen im Langtext (bpcore/textergaenzung.py) (GO 18.11.2026, Mock „Bietertextergänzungen nach GAEB“: BT-A1 B1 C1 D1).

Im Langtext einer Position stehen Lücken als Felder – lesbar im Textfeld, so dass man sie auch von Hand schreiben kann:
  [[Büro: Farbe = weiß RAL 9016]]                  Angabe des Büros (GAEB: Ausschreiber-Textergänzung) – vor dem Versand füllen
  [[Bieter: Angebotenes Fabrikat]]                  Angabe der Bieter:in (GAEB: Bieter-Textergänzung)
  [[Bieter: Fabrikat | Hörmann BaseLine]]           mit Vorschlag des Büros (B1): „Hörmann BaseLine oder gleichwertig“ – lässt die
                                                    Bieter:in das Feld leer, gilt der Vorschlag als angeboten (VHB Formblatt 213 Nr. 8)
Druck: Büro-Angabe als Text, Bieter-Angabe als Punktlinie; am Ende des LV das Verzeichnis der Bieterangaben (D1).
GAEB DA XML: <TextComplement Kind="Owner"|"Bidder"> mit ComplCaption/ComplBody – geschrieben in gaeb.schreiben, gelesen in gaeb.lesen.
Antworten der Bieter:innen: Angebot data["bte"] = {pos_id: [antwort je Bieter-Feld in Reihenfolge]}; fehlende rot im Preisspiegel (C1).
"""
import re
from xml.sax.saxutils import escape

RX = re.compile(r"\[\[\s*(Büro|Buero|Bieter)\s*:\s*([^\]=|]*?)\s*(?:([=|])\s*([^\]]*?)\s*)?\]\]", re.I)
PUNKTE = "…………………………………"
FABRIKAT = re.compile(r"hersteller|fabrikat|typ\b|produkt", re.I)


def felder(lang):
    """→ [{art: 'buero'|'bieter', frage, wert, vorschlag, a, b}] in Reihenfolge."""
    out = []
    for m in RX.finditer(str(lang or "")):
        bieter = m.group(1).lower() == "bieter"
        w = (m.group(4) or "").strip()
        out.append({"art": "bieter" if bieter else "buero", "frage": m.group(2).strip(), "wert": "" if bieter else w,
                    "vorschlag": w if bieter else "", "a": m.start(), "b": m.end()})
    return out


def bieter_felder(lang):
    return [f for f in felder(lang) if f["art"] == "bieter"]


def druck_text(lang, antw=None):
    """Langtext für den Druck: Büro-Angabe als „Frage: Wert“ (leer: Punktlinie), Bieter-Angabe als Punktlinie bzw. die Antwort (Auftrag)."""
    antw = list(antw or [])
    k = [0]

    def ers(m):
        bieter = m.group(1).lower() == "bieter"
        frage, w = m.group(2).strip(), (m.group(4) or "").strip()
        if not bieter:
            return f"{frage}: {w or PUNKTE}" if frage else (w or PUNKTE)
        a = antw[k[0]] if k[0] < len(antw) else ""
        k[0] += 1
        vor = f"{w} oder gleichwertig – " if w and not a else ""
        return f"{frage}: {vor}{a or PUNKTE}" if frage else f"{vor}{a or PUNKTE}"
    return RX.sub(ers, str(lang or ""))


def fehlende_buero(items):
    """Angaben des Büros ohne Wert → [(oz, frage)] – Hinweis vor dem Versand."""
    return [(x.get("oz") or "", f["frage"]) for x in items or [] if x.get("typ") == "pos" for f in felder(x.get("lang")) if f["art"] == "buero" and not f["wert"]]


def verzeichnis(items):
    """Verzeichnis der Bieterangaben (D1): [(oz, kurz, frage, vorschlag)]."""
    return [(x.get("oz") or "", x.get("kurz") or "", f["frage"], f["vorschlag"]) for x in items or [] if x.get("typ") == "pos" for f in bieter_felder(x.get("lang"))]


def pruefen(items, antworten):
    """Angebotsprüfung (C1): je Bieter-Feld die Antwort oder „fehlt“ bzw. „gilt Vorschlag“. antworten = {pos_id: [..]} → [{pos, oz, frage, antwort, status}]"""
    out = []
    for x in items or []:
        if x.get("typ") != "pos":
            continue
        A = (antworten or {}).get(x.get("id")) or []
        for k, f in enumerate(bieter_felder(x.get("lang"))):
            a = (A[k] if k < len(A) else "") or ""
            out.append({"pos": x.get("id"), "oz": x.get("oz") or "", "frage": f["frage"], "antwort": a,
                        "status": "ok" if a.strip() else "vorschlag" if f["vorschlag"] else "fehlt"})
    return out


# ---------------------------------------------------------------- GAEB
def _p_inline(t):
    return "".join(f"<span>{escape(x)}</span>" for x in [t] if x)


def gaeb_text(lang, antw=None):
    """Langtext → Inhalt von <Text> (Absätze <p>), Felder als <TextComplement Kind="Owner"|"Bidder">."""
    antw = list(antw or [])
    out, k = [], 0
    for zeile in str(lang or "").split("\n"):
        if not zeile.strip():
            out.append("<p>&#160;</p>")
            continue
        h, pos = "", 0
        for m in RX.finditer(zeile):
            h += _p_inline(zeile[pos:m.start()])
            bieter = m.group(1).lower() == "bieter"
            frage, w = m.group(2).strip(), (m.group(4) or "").strip()
            if bieter:
                a = antw[k] if k < len(antw) else ""
                k += 1
                vor = f"<span>{escape(w)} oder gleichwertig</span>" if w else ""
                h += (f'<TextComplement Kind="Owner"><ComplCaption>{_p_inline(frage + ": ") if frage else ""}</ComplCaption><ComplBody>{vor}</ComplBody></TextComplement>' if w else "")
                h += f'<TextComplement Kind="Bidder"><ComplCaption>{_p_inline(("Angeboten: " if w else (frage + ": ")) if frage else "")}</ComplCaption><ComplBody>{_p_inline(a)}</ComplBody></TextComplement>'
            else:
                h += f'<TextComplement Kind="Owner"><ComplCaption>{_p_inline(frage + ": ") if frage else ""}</ComplCaption><ComplBody>{_p_inline(w)}</ComplBody></TextComplement>'
            pos = m.end()
        h += _p_inline(zeile[pos:])
        out.append(f"<p>{h}</p>")
    return "".join(out) or "<p></p>"


def aus_gaeb(e, ln, txt):
    """TextComplement im gelesenen GAEB → Felder im Langtext; gibt (Ersatztext je Element, Antworten der Bieter-Felder) über Rückruf.
    e: TextComplement-Element, ln: Tag ohne Namensraum, txt: Text eines Elements. → (marker, antwort|None)"""
    kind = (e.get("Kind") or "").lower()
    cap = body = ""
    for c in e:
        if ln(c.tag) == "ComplCaption":
            cap = txt(c)
        elif ln(c.tag) == "ComplBody":
            body = txt(c)
    frage = cap.strip().rstrip(":").strip()
    if kind == "bidder":
        if frage.lower() == "angeboten":   # zweites Feld nach dem Vorschlag (gaeb_text): Vorschlag steht schon im Owner-Feld davor
            return "\x00B\x00", body.strip()
        return f"[[Bieter: {frage}]]", body.strip()
    w = re.sub(r"\s*oder gleichwertig\s*$", "", body.strip())
    if re.search(r"oder gleichwertig\s*$", body.strip()):
        return f"\x00V{frage}\x00{w}\x00", None
    return f"[[Büro: {frage} = {w}]]" if w else f"[[Büro: {frage}]]", None


def zusammenfuegen(text):
    """Owner-Vorschlag + Bidder „Angeboten“ (aus gaeb_text) wieder zu einem Bieter-Feld mit Vorschlag."""
    text = re.sub(r"\x00V([^\x00]*)\x00([^\x00]*)\x00\s*\x00B\x00", lambda m: f"[[Bieter: {m.group(1)} | {m.group(2)}]]", text)
    text = re.sub(r"\x00V([^\x00]*)\x00([^\x00]*)\x00", lambda m: f"[[Büro: {m.group(1)} = {m.group(2)} oder gleichwertig]]", text)
    return text.replace("\x00B\x00", "[[Bieter: Angeboten]]")
