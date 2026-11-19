"""„Alle Dateien“ einlesen (19.11.2026, Mein Ordner mit sehr vielen Dateien → Fehler 500): dauert das Einlesen länger als WARTE,
antwortet die Anfrage mit „läuft“ und liest im Hintergrund weiter; fertig steht die Liste im Speicher. Dateinamen mit kaputter
Kodierung (\\udcxx) brechen das Speichern nicht ab. An einem echten Ordner im Dateisystem, ohne Datenbank."""
import json
import os
import tempfile
import time

from lib import gleich, pruefe


def _app(td, fn):
    from flask import Flask, g
    from core import remote
    from modules import alle_dateien as A
    t = remote.Folder(td)
    alt = (A._ziel, A.speichern, A.WARTE, A.scan)
    gespeichert = {}

    def speichern(pid, res):
        gespeichert[pid] = json.loads(json.dumps({"res": res}))   # wie bp_store: muss sich als JSON schreiben lassen
        return "2026-11-19T23:50:00"
    A._ziel, A.speichern = (lambda pid: (t, ["P"], None)), speichern
    try:
        with Flask("t").test_request_context("/api/dateien/alle?project_id=-3"):
            g.user = {"name": "Test", "id": 3}
            return fn(A, gespeichert)
    finally:
        A._ziel, A.speichern, A.WARTE, A.scan = alt


def test_schnell_gleich_die_liste():
    with tempfile.TemporaryDirectory() as td:
        os.makedirs(os.path.join(td, "P", "a"))
        for n in ("a/x.pdf", "y.txt"):
            open(os.path.join(td, "P", n), "wb").close()

        def f(A, G):
            r = A.alle()
            d = r.get_json()
            pruefe(not d.get("laeuft") and sorted(x[0] for x in d["dateien"]) == ["a/x.pdf", "y.txt"], f"Liste: {d}")
            pruefe(-3 in G and -3 not in A.LAUF, "gespeichert und nicht mehr „läuft“")
        _app(td, f)


def test_langsam_laeuft_im_hintergrund_weiter():
    with tempfile.TemporaryDirectory() as td:
        os.makedirs(os.path.join(td, "P"))

        def f(A, G):
            echt = A.scan
            A.scan = lambda t, base: (time.sleep(0.6), echt(t, base))[1]
            A.WARTE = 0.1
            d = A.alle().get_json()
            gleich(d, {"laeuft": True}, "zu langsam: Antwort „läuft“ statt Fehler")
            gleich(A.alle().get_json(), {"laeuft": True}, "zweite Anfrage startet kein zweites Einlesen")
            for _ in range(30):
                if -3 in G:
                    break
                time.sleep(0.1)
            pruefe(-3 in G and -3 not in A.LAUF, "im Hintergrund fertig eingelesen und gespeichert")
        _app(td, f)


def test_kaputte_namen_speichern():
    from modules import alle_dateien as A
    res = {"basis": "P", "dateien": [["Pl\udcc3ne.pdf", 1, 0.0]], "ordner": [], "abgebrochen": False}
    s = json.dumps({"zeit": "z", "res": res})   # so schreibt speichern() – ASCII
    s.encode("utf-8")   # darf nicht scheitern (vorher ensure_ascii=False → UnicodeEncodeError beim Schreiben in die Datenbank)
    gleich(json.loads(s)["res"]["dateien"][0][0], "Pl\udcc3ne.pdf", "Name kommt unverändert zurück")
    pruefe("ensure_ascii=False" not in open(A.__file__, encoding="utf-8").read().split("def speichern")[1].split("def ")[0], "speichern schreibt ASCII")
