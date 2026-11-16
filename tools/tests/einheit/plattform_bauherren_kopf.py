"""Bauherrenportal – Startseite (17.11.2026, bpcore/bauherren_kopf.py): Termine für Bauherr:innen nur Bauphasen und Meilensteine (Vorgabe),
Titelbild aus Foto oder Zeichnung (PDF, erste Seite) als JPEG, höchstens 1.600 Pixel breit."""
import io

from lib import gleich, mini_pdf, pruefe


class _C:
    def execute(self, *a):
        return self

    def fetchone(self):
        return None

    def fetchall(self):
        return []


def _mit_lager(lager, f):
    from bpcore import bauherren as B
    alt = B._store
    B._store = lambda c, k, v=None: lager.get(k) if v is None else lager.__setitem__(k, v)
    try:
        return f()
    finally:
        B._store = alt


def test_termine_nur_bauphasen():
    from bpcore import bauherren_kopf as BK
    D = {"zeilen": [["Leistung", "Beginn", "Ende"], ["▸ Rohbau", "01.03.2027", "30.06.2027"], ["Mauerwerk EG", "01.03.2027", "20.03.2027"], ["Richtfest", "01.07.2027", "–"]]}
    gleich(_mit_lager({}, lambda: BK.termine_filtern(_C(), 7, D))["zeilen"], [["Leistung", "Beginn", "Ende"], ["Rohbau", "01.03.2027", "30.06.2027"], ["Richtfest", "01.07.2027", "–"]],
           "Vorgabe: Gruppen und Meilensteine, ohne einzelne Leistungen")
    gleich(_mit_lager({"bauherren:kopf:7": {"termine": "alle"}}, lambda: BK.termine_filtern(_C(), 7, D)), D, "je Projekt: alle Leistungen")
    gleich(_mit_lager({}, lambda: BK.termine_filtern(_C(), 7, {"text": "x"})), {"text": "x"}, "ohne Tabelle unverändert")


def test_titelbild_aus_foto_und_zeichnung():
    from PIL import Image
    from bpcore import bauherren_kopf as BK
    b = io.BytesIO(); Image.new("RGB", (3000, 1500), (200, 100, 50)).save(b, "PNG")
    j = BK.bild_aus(b.getvalue(), "image/png")
    im = Image.open(io.BytesIO(j))
    gleich((im.format, im.width, im.height), ("JPEG", 1600, 800), "Foto: JPEG, auf 1.600 Pixel verkleinert")
    p = BK.bild_aus(mini_pdf(), "application/pdf")
    pruefe(Image.open(io.BytesIO(p)).format == "JPEG", "Zeichnung (PDF): erste Seite als JPEG")
    try:
        BK.bild_aus(b"kein Bild", "image/jpeg")
        pruefe(False, "kaputtes Bild muss scheitern")
    except Exception:   # noqa: BLE001 – erwartet
        pass
