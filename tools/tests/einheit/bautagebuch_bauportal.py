"""Freigabe „Bauportal“: Ordner 01–06 mit LIESMICH anlegen, nichts Vorhandenes überschreiben; Notfallpaket enthält nur das Programm;
der Wiki-Leser findet Einträge und gibt nur Dateien aus „02 Wiki“ heraus – an einem echten Ordner, nicht auf dem Dateiserver."""
import io, json, os, tempfile, threading, urllib.request, zipfile

from lib import gleich, pruefe


def test_ordner_anlegen():
    from core import bauportal, remote
    if remote.NUR_LESEN:   # Testserver-Umgebung: schreibt nicht
        return
    with tempfile.TemporaryDirectory() as td:
        conf = {"portal_unc": td}
        alt = bauportal._conf
        bauportal._conf = lambda: conf
        try:
            os.makedirs(os.path.join(td, "03 Kataloge"))
            open(os.path.join(td, "03 Kataloge", "LIESMICH.txt"), "w").write("eigene")
            ok, msg = bauportal.einrichten()
            pruefe(ok, msg)
            gleich(sorted(n for n in os.listdir(td)), sorted(bauportal.ORDNER), "alle sechs Ordner da")
            gleich(open(os.path.join(td, "03 Kataloge", "LIESMICH.txt")).read(), "eigene", "vorhandene LIESMICH bleibt")
            pruefe("verarbeitet" in open(os.path.join(td, "01 Eingang", "LIESMICH.txt"), encoding="utf-8").read(), "LIESMICH Eingang")
            gleich(bauportal.einrichten()[1].startswith("Alle Ordner"), True, "zweiter Lauf legt nichts neu an")
        finally:
            bauportal._conf = alt


def test_notfallpaket_und_leser():
    from core import bauportal
    z = zipfile.ZipFile(io.BytesIO(bauportal.notfallpaket()))
    gleich(sorted(z.namelist()), ["wiki-notfall/Dockerfile", "wiki-notfall/LIESMICH.txt", "wiki-notfall/wiki_lesen.py"], "nur das Programm")
    import importlib.util
    spec = importlib.util.spec_from_file_location("wiki_lesen", os.path.join(bauportal.NOTFALL, "wiki_lesen.py"))
    with tempfile.TemporaryDirectory() as td:
        os.makedirs(os.path.join(td, "06 Sicherung", "Wiki")); os.makedirs(os.path.join(td, "02 Wiki", "Abdichtung"))
        open(os.path.join(td, "02 Wiki", "Abdichtung", "detail.pdf"), "wb").write(b"%PDF-1.4 test")
        open(os.path.join(td, "geheim.txt"), "w").write("nein")
        json.dump({"stand": "2026-11-13T10:00:00", "eintraege": [
            {"id": 1, "kapitel": "Abdichtung", "titel": "Sockel <b>", "text": "Perimeter bis 30 cm über Gelände",
             "dateien": [{"name": "detail.pdf", "pfad": "Abdichtung/detail.pdf", "vorschau": ""}]},
            {"id": 2, "kapitel": "Vergabe", "titel": "Nachunternehmer", "text": "Eignung prüfen", "dateien": []}]},
            open(os.path.join(td, "06 Sicherung", "Wiki", "wiki.json"), "w", encoding="utf-8"))
        W = importlib.util.module_from_spec(spec); spec.loader.exec_module(W)
        W.WURZEL = td
        s = W.seite(W.laden(), "perimeter")
        pruefe("Sockel &lt;b&gt;" in s and "Nachunternehmer" not in s, "Suche und Maskierung")
        srv = W.ThreadingHTTPServer(("127.0.0.1", 0), W.H)
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        u = f"http://127.0.0.1:{srv.server_address[1]}"
        try:
            gleich(urllib.request.urlopen(u + "/datei?p=Abdichtung/detail.pdf").read()[:4], b"%PDF", "Datei aus 02 Wiki")
            for p in ("../geheim.txt", "..%2Fgeheim.txt", "/etc/passwd"):
                try:
                    urllib.request.urlopen(u + "/datei?p=" + p); pruefe(False, "Datei außerhalb von 02 Wiki ausgeliefert: " + p)
                except urllib.error.HTTPError as e:
                    gleich(e.code, 404, p)
        finally:
            srv.shutdown()
