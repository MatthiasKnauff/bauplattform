"""Rechentests Bauantrag: Anlagen der NRW-Seite erkennen (zwei Links je Anlage, Titel, Nummer), Fassung aus der Adresse, nur sichere Adressen."""
from lib import gleich, pruefe

from bpcore import bauantrag_formulare as BF

SEITE = """<div id="attachments">
<a href="/system/files/2026-08/smbl_23210_20000308_a_anlage1.1.pdf">(Anlage I/1 Baugenehmigungsverfahren § 65 BauO NRW 2018)</a>
<a href="/system/files/2026-08/smbl_23210_20000308_a_anlage1.1.pdf">Anlage I/1 Baugenehmigungsverfahren § 65 BauO NRW 2018 (PDF) Barrierefrei</a>
<a href="/system/files/2026-11/2026-11-0007663.pdf">Anlage I/2 Vereinfachtes Baugenehmigungsverfahren &sect; 64 BauO NRW 2018 (PDF) Barrierefrei</a>
<a href="/system/files/BA/47790-50738-smbl_23210_20000308_a_anlageii4.pdf">Anlage II/4 Bericht Bauzustandsbesichtigung (PDF) Nicht barrierefrei</a>
<a href="/impressum">Impressum</a></div>"""


def test_anlagen_der_nrw_seite():
    """Jede Anlage einmal, mit Nummer, Titel ohne „(PDF) Barrierefrei“ und voller Adresse."""
    A = BF.anlagen_lesen(SEITE, "https://recht.nrw.de/lrmb/verwaltungsvorschrift/10112026-verwaltungsvorschrift-zur-verordnung-ueber-bautechnische")
    gleich([a["nr"] for a in A], ["I/1", "I/2", "II/4"], "drei Anlagen")
    gleich(A[1]["titel"], "Vereinfachtes Baugenehmigungsverfahren § 64 BauO NRW 2018", "Titel")
    gleich(A[0]["url"], "https://recht.nrw.de/system/files/2026-08/smbl_23210_20000308_a_anlage1.1.pdf", "volle Adresse")
    gleich(BF._fassung("https://recht.nrw.de/lrmb/verwaltungsvorschrift/10112026-verwaltungsvorschrift-zur", ""), "10.11.2026", "Fassung aus der Adresse")


def test_nur_sichere_adressen():
    """Keine http-Adressen und nichts im eigenen Netz (der Server ruft die Seite ab)."""
    for u in ("http://recht.nrw.de/x", "https://127.0.0.1/x", "https://localhost/x", "ftp://a.de/x"):
        try:
            BF._sicher(u)
            pruefe(False, f"abgelehnt: {u}")
        except (ValueError, OSError):
            pass
