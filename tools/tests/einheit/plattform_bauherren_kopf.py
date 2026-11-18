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
    G = {**D, "gliederung": True}
    gleich(_mit_lager({}, lambda: BK.termine_filtern(_C(), 7, G)), G, "Gliederung im Plan gewählt (GL-C1): so wie dort")


def test_zeitplan_zugeklappte_gruppe():
    """Gliederung grob · mittel (18.11.2026): eine zugeklappte Gruppe kommt als ein farbiger Balken, nicht als graue Gruppe."""
    from bpcore import zeitplan
    d = {"tasks": [{"uid": 1, "name": "Rohbau", "lvl": 0, "dur": 30, "zu": True, "farbe": "#c0392b", "pct": 40}, {"uid": 2, "name": "Maurer", "lvl": 0, "dur": 9, "gw": "Maurer", "zu": True, "farbe": "nix"}],
         "sched": [{"uid": 1, "s": "2027-03-01", "f": "2027-04-12", "g": True}, {"uid": 2, "s": "2027-03-01", "f": "2027-03-12", "g": True}], "gwColors": {"Maurer": "#2980b9"}}
    R = zeitplan.zeilen(d)
    gleich([(x["g"], x["m"], x["c"], x["p"]) for x in R], [(0, 0, "#c0392b", 40), (0, 0, "#2980b9", 0)], "farbig, kein Meilenstein, keine Gruppe; ungültige Farbe → Gewerk")


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
