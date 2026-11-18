"""Eigenarten von Scans aus Kopierern und Scannern – an einer Stelle für alle Apps (18.11.2026).

  scanner_name(stamm)  → (ist Scannername?, Datum aus dem Namen oder None)
      Kopierer benennen Scans nach Gerät und Zeit, nicht nach Inhalt. Bekannte Muster (Herstellerhandbücher, Foren):
        Konica Minolta  SKMBT_C55013050717230 (JJMMTTHHMM + Zähler), SKM_C250i26111812300, KM_C250i-20261118123000, „S“ + Gerätename + Zeit
        Canon           20261118123045.pdf, 20261118123045_00002.pdf, Name_20261118123045.pdf
        Ricoh           20261118123045010.pdf (mit Millisekunden), …_0001.pdf
        Kyocera         doc20261118123045.pdf
        Sharp           MX-3070N_20261118_123045.pdf, SHARP MX-…
        Xerox, HP, Brother, Epson, Lexmark  Scan_0001, scan0001, Xerox Scan_11182026123045, img-…, Scanned Document_…
  muell(text)          → Textebene eines „durchsuchbaren“ Kopierer-PDFs ist Zeichensalat (Kopierer-OCR, Schrift ohne Zeichentabelle „(cid:12)“)
  leer(bild)           → leere Seite (Rückseite beim beidseitigen Scannen) – keine Texterkennung nötig
  drehen(bild)         → quer oder kopfüber eingelegtes Blatt richtig drehen (Tesseract-Lageerkennung „--psm 0“)
  kopfzeile(z)         → Zeile, die der Kopierer bzw. das Fax dazuschreibt („Seite 1/3“, „Fax von …“, Zeitstempel) – nie Titel
"""
import re
from datetime import date

# Name ohne Endung → Gruppe „z“ = Zeitstempel (falls vorhanden)
MUSTER = [
    re.compile(r"^s?km(?:bt)?[_\- ]?[a-z]?\d{2,4}?[a-z]{0,2}[_\- ]?(?P<z>\d{10,14})\d*$", re.I),        # Konica Minolta (SKMBT_, SKM_, KM_)
    re.compile(r"^(?:.*[_\- ])?(?P<z>20\d{12})(?:\d{3})?(?:[_\- ]\d{1,5})?$"),                           # Canon, Ricoh, Kyocera ohne „doc“
    re.compile(r"^doc[_\- ]?(?P<z>20\d{12})\d*$", re.I),                                                 # Kyocera
    re.compile(r"^(?:sharp[_\- ]?)?mx[\-_ ]?\w+?[_\- ](?P<z>20\d{6}[_\- ]?\d{4,6})(?:[_\- ]\d+)?$", re.I),  # Sharp
    re.compile(r"^(?:xerox[_\- ]?)?scan(?:ned[_\- ]?document)?(?:[_\- ]?(?:from[_\- ]?\w+))?[_\- ]?(?P<z>[\d_\-]*)$", re.I),  # Xerox, HP, Lexmark
    re.compile(r"^(?:img|image|brn\w{6,12}|epson)[_\- ]?(?P<z>[\d_\-]*)$", re.I),                         # Brother, Epson
    re.compile(r"^(?:scan|img|image|dok|doc|document|dokument|bild|foto|photo|pxl|dsc|cam|kopie|copy|unbenannt|untitled|neu)?[\s_\-]*(?P<z>\d[\d\s_\-]*)$", re.I),
]


def _datum(z):
    """Datum aus einem Zeitstempel im Namen: JJJJMMTT…, JJMMTT… (Konica), MMTTJJJJ… (Xerox) – auch hinter einer Gerätenummer
    (SKMBT_C550|13050717230); nur ein echtes Datum zwischen 2005 und nächstem Jahr."""
    z = re.sub(r"\D", "", z or "")
    zeit = lambda r: len(r) < 4 or (int(r[:2]) < 24 and int(r[2:4]) < 60)   # noqa: E731 – dahinter eine Uhrzeit?
    erste = None
    for ab in range(0, min(5, max(1, len(z) - 5))):
        t = z[ab:]
        kand = []
        if len(t) >= 8:
            kand += [(t[:4], t[4:6], t[6:8], t[8:]), (t[4:8], t[:2], t[2:4], t[8:])]
        if len(t) >= 6:
            kand.append(("20" + t[:2], t[2:4], t[4:6], t[6:]))
        for j, m, tg, rest in kand:
            try:
                d = date(int(j), int(m), int(tg))
            except ValueError:
                continue
            if 2005 <= d.year <= date.today().year + 1:
                if zeit(rest):
                    return d
                erste = erste or d
    return erste


GERAET = re.compile(r"^(s?km(bt)?|doc|dok|scan|scanned|document|dokument|xerox|sharp|mx|img|image|brn\w*|epson|from|bizhub|canon|ricoh|kyocera|hp|copy|kopie|"
                    r"bild|foto|photo|pxl|dsc|cam|unbenannt|untitled|neu)$", re.I)


def scanner_name(stamm):
    """(ist Scannername?, Datum|None) – Gerät, Zähler und Zeit statt Inhalt. Steht ein echtes Wort davor („Angebot_20261118123045“,
    Canon mit eingetipptem Namen), ist es kein Scannername – das Datum zählt trotzdem."""
    s = re.sub(r"\s+", " ", str(stamm or "")).strip()
    for rx in MUSTER:
        m = rx.match(s)
        if m:
            vorn = s[:m.start("z")] if m.group("z") else s
            woerter = [w for w in re.split(r"[\s_\-\d]+", vorn) if len(w) >= 3]
            return (not any(not GERAET.match(w) and not re.fullmatch(r"[a-z]?\d*[a-z]{0,2}", w, re.I) for w in woerter)), _datum(m.group("z") or s)
    if not re.search(r"[A-Za-zÄÖÜäöüß]{3}", s):   # nur Ziffern und Zeichen
        return True, _datum(s)
    return False, None


def muell(text):
    """Zeichensalat statt Text? „(cid:12)“-Schrift ohne Zeichentabelle oder kaum echte Wörter (schlechte OCR des Kopierers)."""
    t = str(text or "")
    if t.count("(cid:") >= 5:
        return True
    w = t.split()
    if len(w) < 30:
        return False
    gut = sum(1 for x in w if re.fullmatch(r"[A-Za-zÄÖÜäöüß][a-zäöüß\-]{2,}[.,:;]?|\d[\d.,]*", x))
    return gut / len(w) < 0.35


def leer(bild, schwelle=0.002):
    """Leere Seite? Anteil dunkler Bildpunkte unter 0,2 % (Rand und Lochung zählen kaum)."""
    try:
        g = bild.convert("L")
        g.thumbnail((600, 600))
        w, h = g.size
        g = g.crop((int(w * 0.05), int(h * 0.05), int(w * 0.95), int(h * 0.95)))   # Rand (Schatten, Lochung) nicht mitzählen
        dunkel = sum(g.histogram()[:200])
        return dunkel / max(1, g.size[0] * g.size[1]) < schwelle
    except Exception:
        return False


def drehen(bild, timeout=20):
    """Blatt quer oder kopfüber eingelegt: Lage per Tesseract erkennen („--psm 0“, braucht osd) und gerade drehen; sonst unverändert."""
    import os
    import shutil
    import subprocess
    import tempfile
    if not shutil.which("tesseract"):
        return bild
    try:
        with tempfile.TemporaryDirectory() as td:
            f = os.path.join(td, "o.png")
            b = bild.convert("L")
            b.thumbnail((1800, 1800))
            b.save(f)
            out = subprocess.run(["tesseract", f, "stdout", "--psm", "0"], capture_output=True, text=True, timeout=timeout,
                                 env=dict(os.environ, OMP_THREAD_LIMIT="1")).stdout
        m = re.search(r"Rotate:\s*(\d+)", out)
        k = re.search(r"Orientation confidence:\s*([\d.]+)", out)
        grad = int(m.group(1)) if m else 0
        if grad and (not k or float(k.group(1)) >= 1.5):
            return bild.rotate(-grad, expand=True)   # Tesseract nennt die Drehung im Uhrzeigersinn
    except Exception:   # Lageerkennung ist nur eine Hilfe
        pass
    return bild


KOPF = re.compile(r"^(seite|page|s\.)\s*\d+\s*(/|von|of)\s*\d+|^(fax|telefax|von|from|an|to)\s*[:\-]|^\+?\d[\d\s/\-]{6,}$|"
                  r"^\d{1,2}[./]\d{1,2}[./]\d{2,4}\s+\d{1,2}:\d{2}|^\d{4}-\d{2}-\d{2}\s+\d{1,2}:\d{2}|"
                  r"(konica|minolta|bizhub|kyocera|taskalfa|ricoh|canon|imagerunner|sharp|xerox|brother|lexmark)", re.I)


def kopfzeile(z):
    """Zeile, die Kopierer oder Fax dazuschreiben (Seitenzahl, Absender-Kennung, Zeitstempel, Gerätename)."""
    return bool(KOPF.search(str(z or "").strip()))
