"""Lasttest der Bauplattform – läuft in GitHub Actions nach den Ablauftests (siehe .github/workflows/build.yml).

Simuliert mehrere Bauleiter, die gleichzeitig arbeiten (Standard: 8 – das Doppelte der Spitze im Büro), und misst die
Antwortzeiten. Jeder simulierte Nutzer hat ein eigenes Projekt mit Bericht, Bauzeitenplan und LV und arbeitet darin
mit kurzen Denkpausen: Berichte öffnen, Einträge schreiben, Fotos hochladen, PDFs erzeugen, Bauzeitenplan laden und
speichern, LV öffnen, Startseite. Danach eine Spitze: alle laden gleichzeitig ein Foto hoch und erzeugen ein PDF.

Schlägt fehl bei Fehlern (Status ≠ 2xx) oder wenn eine Aktion deutlich zu langsam ist (Grenzen unten, großzügig, weil
der GitHub-Rechner mit 2 Kernen alle Container gleichzeitig trägt – der echte Server ist schneller).

Aufruf:  python3 tools/lasttest.py http://localhost:8090 [Nutzer] [Sekunden]
"""
from datetime import date
import os, random, statistics, struct, sys, threading, time, zlib

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HIER, "tests"))
from lib import Ctx, Fehler   # noqa: E402

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8090"
NUTZER = int(sys.argv[2]) if len(sys.argv) > 2 else 8
DAUER = int(sys.argv[3]) if len(sys.argv) > 3 else 60
BT, G, A = "/bautagebuch/api", "/bauzeitenplan/api", "/ava/api"

# Aktion → (Gewicht im Mix, Grenze für 95 % der Anfragen in Sekunden)
AKTIONEN = {
    "Startseite":            (3, 2.0),
    "Berichte öffnen":       (4, 2.0),
    "Eintrag schreiben":     (4, 2.0),
    "Foto hochladen":        (2, 8.0),
    "Bericht als PDF":       (1, 15.0),
    "Bauzeitenplan laden":   (2, 2.0),
    "Bauzeitenplan speichern": (1, 3.0),
    "LV öffnen":             (2, 2.0),
    "LV als PDF":            (1, 15.0),
}
SPITZE_GRENZE = 30.0   # längste Anfrage in der Spitze (alle gleichzeitig Foto + PDF)


def foto(breite=1600, hoehe=1200):
    """Gültiges PNG etwa in Größe eines Handyfotos (wenig komprimierbar, ~5 MB) – das Bautagebuch wandelt es in JPG um."""
    rnd = random.Random(4711)   # immer dasselbe „Foto“
    zeilen = [b"\x00" + rnd.randbytes(breite * 3) for _ in range(hoehe)]

    def stueck(art, daten):
        return struct.pack(">I", len(daten)) + art + daten + struct.pack(">I", zlib.crc32(art + daten) & 0xFFFFFFFF)
    return (b"\x89PNG\r\n\x1a\n" + stueck(b"IHDR", struct.pack(">IIBBBBB", breite, hoehe, 8, 2, 0, 0, 0))
            + stueck(b"IDAT", zlib.compress(b"".join(zeilen), 1)) + stueck(b"IEND", b""))


FOTO = foto()
messungen, fehler, sperre = {}, [], threading.Lock()


def mess(name, f):
    t = time.time()
    try:
        f()
        ok = True
    except Exception as e:
        ok = False
        with sperre:
            fehler.append(f"{name}: {str(e)[:300]}")
    with sperre:
        messungen.setdefault(name, []).append((time.time() - t, ok))


class Nutzer:
    def __init__(self, ctx, i):
        self.c = ctx.anmelden("Test-Admin")   # eigene Sitzung je simuliertem Nutzer
        self.n = i
        p = self.c.pj(f"{BT}/projects", {"name": f"{ctx.name('Last')} Baustelle {i}", "client": "Lasttest", "street": "Teststraße 1",
                                          "zip": "45127", "city": "Essen", "lat": None, "lon": None})
        self.pid = p["id"]
        self.rid = self.c.pj(f"{BT}/projects/{self.pid}/reports", {})["id"]
        self.c.pj(f"{BT}/reports/{self.rid}/items", {"kind": "notizen", "text": "Lasttest: Baustelle eingerichtet"})
        aufgaben = [{"uid": k + 1, "name": f"Leistung {k + 1}", "dur": 3 + k % 7, "lvl": 0,
                     "preds": [{"uid": k, "type": "FS", "lag": 0}] if k else [], "cal": {"week": 5, "state": "NW", "free": []}}
                    for k in range(60)]
        self.plan = self.c.post(f"{G}/projects", {"name": ctx.name("Lastplan"), "start": (date(2026, 11, 2) - date(1970, 1, 1)).days,
                                               "nextUid": 61, "tasks": aufgaben, "cal": {"week": 5, "state": "NW", "free": []}, "trades": {}},
                                expect=201).json
        items = [{"typ": "titel", "lvl": 1, "kurz": f"Titel {t}"} for t in range(1, 4)]
        items += [{"typ": "pos", "kurz": f"Position {k}", "lang": "Lasttest " * 20, "menge": 10 + k, "einheit": "m²", "art": "N", "ep_s": 25.5}
                  for k in range(1, 61)]
        lv = self.c.pj(f"{A}/lv", {"project_id": ctx.pid, "name": ctx.name("LastLV"), "gewerk": "Rohbau"})
        self.lv = self.c.uj(f"{A}/lv/{lv['id']}", {"data": {"items": items}, "nummerieren": True})
        self.k = 0

    # einzelne Aktionen
    def startseite(self):
        self.c.get("/api/me")
        self.c.get("/api/links")

    def berichte(self):
        self.c.get(f"{BT}/projects/{self.pid}/reports")   # wie die Oberfläche beim Öffnen eines Berichts
        self.c.get(f"{BT}/reports/{self.rid}/soll")
        self.c.get(f"{BT}/reports/{self.rid}/fortschritt")

    def eintrag(self):
        self.k += 1
        self.c.post(f"{BT}/reports/{self.rid}/items", {"kind": random.choice(["notizen", "maengel", "zu_erledigen"]),
                                                         "text": f"Lasttest Eintrag {self.k} von Nutzer {self.n}"})

    def foto(self):
        self.c.post(f"{BT}/reports/{self.rid}/images", dateien={"files": ("IMG_0001.png", FOTO, "image/png")})

    def pdf(self):
        self.c.get(f"{BT}/reports/{self.rid}/pdf?save=0").ist_pdf()

    def plan_laden(self):
        self.c.get(f"{G}/projects/{self.plan['id']}")

    def plan_speichern(self):
        self.plan = self.c.put(f"{G}/projects/{self.plan['id']}", {**self.plan, "name": self.plan["name"]}, expect=200).json

    def lv_laden(self):
        self.c.get(f"{A}/lv/{self.lv['id']}")

    def lv_pdf(self):
        self.c.get(f"{A}/lv/{self.lv['id']}/pdf").ist_pdf()

    def aufraeumen(self):
        for f in (lambda: self.c.delete(f"{BT}/projects/{self.pid}", expect=None),
                  lambda: self.c.delete(f"{G}/projects/{self.plan['id']}", expect=None),
                  lambda: self.c.delete(f"{A}/lv/{self.lv['id']}", expect=None)):
            try:
                f()
            except Exception:   # Aufräumen ist nur Kosmetik für den Testlauf
                pass


def main():
    print(f"Lasttest gegen {BASE}: {NUTZER} gleichzeitige Nutzer, {DAUER} s, Foto {len(FOTO) / 1e6:.1f} MB\n")
    ctx = Ctx(BASE)
    leute = [Nutzer(ctx, i + 1) for i in range(NUTZER)]
    zuordnung = {"Startseite": "startseite", "Berichte öffnen": "berichte", "Eintrag schreiben": "eintrag", "Foto hochladen": "foto",
                 "Bericht als PDF": "pdf", "Bauzeitenplan laden": "plan_laden", "Bauzeitenplan speichern": "plan_speichern",
                 "LV öffnen": "lv_laden", "LV als PDF": "lv_pdf"}
    namen = list(AKTIONEN)
    gewichte = [AKTIONEN[n][0] for n in namen]
    ende = time.time() + DAUER

    def arbeiten(u):
        rnd = random.Random(u.n)
        while time.time() < ende:
            name = rnd.choices(namen, gewichte)[0]
            mess(name, getattr(u, zuordnung[name]))
            time.sleep(rnd.uniform(0.5, 2.0))   # Denkpause
    ts = [threading.Thread(target=arbeiten, args=(u,)) for u in leute]
    for t in ts:
        t.start()
    for t in ts:
        t.join()

    # Spitze: alle gleichzeitig Foto + PDF
    start = threading.Barrier(NUTZER)

    def spitze(u):
        start.wait()
        mess("Spitze: Foto", u.foto)
        mess("Spitze: PDF", u.pdf)
    ts = [threading.Thread(target=spitze, args=(u,)) for u in leute]
    for t in ts:
        t.start()
    for t in ts:
        t.join()
    for u in leute:
        u.aufraeumen()

    # Auswertung
    zeilen, probleme = [], []
    for name, werte in messungen.items():
        z = sorted(w for w, _ in werte)
        p50, p95 = statistics.median(z), z[min(len(z) - 1, int(round(0.95 * (len(z) - 1))))]
        fehl = sum(1 for _, ok in werte if not ok)
        grenze = AKTIONEN[name][1] if name in AKTIONEN else SPITZE_GRENZE
        wert = p95 if name in AKTIONEN else z[-1]
        status = "ok" if not fehl and wert <= grenze else "ZU LANGSAM" if not fehl else "FEHLER"
        if status != "ok":
            probleme.append(name)
        zeilen.append((name, len(werte), fehl, p50, p95, z[-1], grenze, status))
    kopf = f"{'Aktion':26} {'Anzahl':>6} {'Fehler':>6} {'Median':>8} {'95 %':>8} {'längste':>8} {'Grenze':>7}  Ergebnis"
    print(kopf)
    for n, a, f, p50, p95, mx, gr, st in zeilen:
        print(f"{n:26} {a:6} {f:6} {p50:7.2f}s {p95:7.2f}s {mx:7.2f}s {gr:6.0f}s  {st}")
    gesamt = sum(z[1] for z in zeilen)
    print(f"\n{gesamt} Anfragen in {DAUER} s, {len(fehler)} Fehler.")
    for f in fehler[:20]:
        print("  - " + f)
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a") as fh:
            fh.write(f"### Lasttest: {NUTZER} gleichzeitige Nutzer, {DAUER} s\n\n| Aktion | Anzahl | Fehler | Median | 95 % | längste | Grenze | Ergebnis |\n|---|---|---|---|---|---|---|---|\n")
            for n, a, f, p50, p95, mx, gr, st in zeilen:
                fh.write(f"| {n} | {a} | {f} | {p50:.2f} s | {p95:.2f} s | {mx:.2f} s | {gr:.0f} s | {st} |\n")
    if probleme:
        print("\nLasttest NICHT bestanden: " + ", ".join(probleme))
        return 1
    print("\nLasttest bestanden.")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Fehler as e:
        print(f"Lasttest konnte nicht vorbereitet werden: {e}")
        sys.exit(1)
