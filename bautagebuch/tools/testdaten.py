"""Testdaten für eine Test-Installation der Bauplattform (nicht für den Echtbetrieb!).

Aufruf auf dem Server:   bash update.sh --testdaten
(direkt:                 docker compose exec bautagebuch python tools/testdaten.py)

Legt an: Test-Benutzer mit unterschiedlichen Rechten, Firmen/Kontakte, drei Projekte mit Tagesberichten (Wetter, Anwesende,
Notizen, Mängel, Aufgaben, Weisungen, Fotos) und zwei mit den Projekten verknüpfte Bauzeitenpläne. Alles läuft über die
normalen Schnittstellen der Apps (gleiche Prüfungen wie bei Eingaben in der Oberfläche).
Bricht ab, wenn die Datenbank schon Tagesberichte enthält (Schutz vor dem Echtsystem) – außer mit --force.
"""
import http.cookiejar, io, json, os, random, sys, time, urllib.error, urllib.request, uuid
from datetime import date, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from core import db   # noqa: E402
from werkzeug.security import generate_password_hash   # noqa: E402

BT = os.environ.get("TESTDATEN_BT", "http://127.0.0.1:8000")
GANTT = os.environ.get("GANTT_INTERNAL", "http://gantt:8082")
PW = "Testdaten1"
random.seed(4711)

USERS = [  # Name, Admin, Apps ('' = alle), Rolle
    ("Test-Admin", 1, "", "Administrator"),
    ("Anna Bauer", 0, "", "Bauleiterin – Bautagebuch und Bauzeitenplan"),
    ("Bernd Krämer", 0, '["bautagebuch"]', "Bauleiter – nur Bautagebuch"),
    ("Clara Wolf", 0, '["gantt"]', "Büro / Terminplanung – nur Bauzeitenplan"),
]
FIRMS = [  # Name, Gewerk, Ansprechpartner, Telefon, E-Mail, Straße, PLZ, Ort
    ("Erdbau Hoffmann GmbH", "Erdbau", "Jens Hoffmann", "0201 4711-10", "info@erdbau-hoffmann.test", "Industriestr. 12", "45329", "Essen"),
    ("Rohbau Schulte & Söhne", "Rohbau", "Markus Schulte", "0201 4711-20", "bau@schulte-rohbau.test", "Am Bauhof 3", "45356", "Essen"),
    ("Zimmerei Brandt", "Zimmerer", "Ole Brandt", "0234 5566-1", "kontakt@zimmerei-brandt.test", "Holzweg 8", "44787", "Bochum"),
    ("Dachdeckerei Klein", "Dach", "Sabine Klein", "0234 5566-2", "dach@klein.test", "Schieferweg 2", "44789", "Bochum"),
    ("Fensterbau Nowak", "Fenster", "Piotr Nowak", "0208 3344-5", "info@fenster-nowak.test", "Glasstr. 17", "46045", "Oberhausen"),
    ("Elektro Wilhelmi", "Elektro", "Thomas Wilhelmi", "0201 8899-0", "service@elektro-wilhelmi.test", "Stromweg 5", "45138", "Essen"),
    ("Haustechnik Yilmaz", "Sanitär, Heizung", "Emre Yilmaz", "0201 8899-7", "info@yilmaz-haustechnik.test", "Rohrgasse 9", "45144", "Essen"),
    ("Putz & Stuck Berger", "Putz", "Karl Berger", "0203 1122-3", "berger@putz.test", "Kalkstr. 4", "47051", "Duisburg"),
    ("Estrich Becker", "Estrich", "Lena Becker", "0203 1122-9", "lena@estrich-becker.test", "Fließweg 1", "47053", "Duisburg"),
    ("Fliesen Rossi", "Fliesen", "Marco Rossi", "0201 2233-4", "rossi@fliesen.test", "Mosaikplatz 6", "45127", "Essen"),
    ("Malerbetrieb Kunz", "Maler", "Petra Kunz", "0201 2233-8", "kunz@maler.test", "Farbenstr. 11", "45131", "Essen"),
    ("Gerüstbau Ruhr", "Gerüst", "Dirk Lange", "0201 9988-1", "dispo@geruest-ruhr.test", "Stangenweg 20", "45326", "Essen"),
]
PROJECTS = [  # Name, Bauherr, Straße, PLZ, Ort, lat, lon, Bauleiter (Namen), Anzahl Berichte
    ("T101 Neubau EFH Am Birkenhain", "Familie Neumann", "Am Birkenhain 7", "45219", "Essen", 51.3611, 6.9532, ["Anna Bauer"], 9),
    ("T102 Sanierung MFH Lindenstraße", "Wohnbau Ruhr eG", "Lindenstraße 42", "45128", "Essen", 51.4467, 7.0098, ["Anna Bauer", "Bernd Krämer"], 6),
    ("T103 Umbau Kita Sonnenschein", "Stadt Essen, Immobilienwirtschaft", "Sonnenweg 3", "45133", "Essen", 51.4180, 6.9805, [], 3),
]
WX = [("Sonnig", "trocken", 14, 55, "8"), ("Heiter", "trocken", 11, 62, "12"), ("Wolkig", "trocken", 9, 70, "15"),
      ("Bedeckt", "leichter Regen", 8, 85, "22"), ("Regen", "Regen", 7, 92, "28"), ("Nebel", "trocken", 4, 96, "5")]
ANW = {  # je Projekt: (Firma, Tätigkeit, Personen)
    0: [("Erdbau Hoffmann GmbH", "Baugrube ausheben, Bodenaustausch", 3), ("Rohbau Schulte & Söhne", "Bodenplatte schalen und bewehren", 4),
        ("Rohbau Schulte & Söhne", "Mauerwerk EG", 5), ("Gerüstbau Ruhr", "Gerüst stellen", 2), ("Zimmerei Brandt", "Dachstuhl abbinden", 3),
        ("Elektro Wilhelmi", "Leerrohre in Decke", 2), ("Haustechnik Yilmaz", "Grundleitungen", 2)],
    1: [("Gerüstbau Ruhr", "Fassadengerüst", 3), ("Fensterbau Nowak", "Fenster ausbauen/einbauen 2. OG", 3), ("Elektro Wilhelmi", "Steigleitungen erneuern", 2),
        ("Haustechnik Yilmaz", "Strangsanierung Bad", 3), ("Putz & Stuck Berger", "Innenputz Treppenhaus", 3), ("Malerbetrieb Kunz", "Treppenhaus streichen", 2)],
    2: [("Rohbau Schulte & Söhne", "Wanddurchbruch Gruppenraum", 3), ("Elektro Wilhelmi", "Beleuchtung Gruppenräume", 2), ("Fliesen Rossi", "Kinderwaschraum fliesen", 2)],
}
NOTIZEN = ["Abstimmung mit Statiker vor Ort, Bewehrungsabnahme erfolgt.", "Anlieferung Mauersteine 2 Paletten zu wenig – nachbestellt.",
           "Bauherr war vor Ort, Bemusterung Fliesen auf nächste Woche verschoben.", "Prüfstatiker hat Bewehrung freigegeben.",
           "Kranstellung mit Nachbarn abgestimmt.", "Baustrom-Zähler abgelesen: 1.248 kWh.", "Lieferung Fenster bestätigt für KW 49.",
           "Schlagregen am Nachmittag, Arbeiten an der Fassade unterbrochen.", "Absperrung Gehweg erneuert."]
MAENGEL = ["Abplatzung an Betonkante Treppenpodest", "Fuge Mauerwerk Achse B nicht vollfugig", "Leerrohr in Decke verschoben, Lage prüfen",
           "Fensteranschluss links nicht abgedichtet", "Riss im Innenputz Treppenhaus 1. OG", "Gefälle Duschbereich zu gering"]
AUFGABEN = ["Bemusterungstermin Fliesen mit Bauherr vereinbaren", "Nachtrag Mehrmengen Erdaushub prüfen", "Schlussrechnung Gerüst anfordern",
            "Abnahmeprotokoll Elektro vorbereiten", "Brandschutzklappen dokumentieren"]
WEISUNGEN = [("Baustelle täglich besenrein verlassen", "Rohbau Schulte & Söhne"), ("Fenster bis Freitag abdichten", "Fensterbau Nowak"),
             ("Gerüstlage 3 sofort sichern (fehlender Seitenschutz)", "Gerüstbau Ruhr"), ("Arbeitszeiten Kita beachten: Lärm erst ab 9 Uhr", "Elektro Wilhelmi")]
PHOTO_CAP = ["Baugrube", "Bewehrung Bodenplatte", "Mauerwerk EG", "Gerüst Südseite", "Dachstuhl", "Fensteranschluss", "Bad 2. OG", "Treppenhaus"]


# ------------------------------------------------------------------------------------------------ HTTP-Hilfen
class Client:
    def __init__(self, base):
        self.base, self.cookies = base, http.cookiejar.CookieJar()
        self.op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.cookies))
        self.extra = {}

    def req(self, method, path, data=None, body=None, ctype=None):
        if data is not None:
            body, ctype = json.dumps(data).encode(), "application/json"
        r = urllib.request.Request(self.base + path, data=body, method=method, headers={**({"Content-Type": ctype} if ctype else {}), **self.extra})
        try:
            with self.op.open(r, timeout=60) as resp:
                return json.loads(resp.read().decode() or "{}")
        except urllib.error.HTTPError as e:
            raise RuntimeError(f"{method} {path}: {e.code} {e.read().decode()[:300]}")

    def cookie(self, name):
        return next((c.value for c in self.cookies if c.name == name), None)


def multipart(files, fields=None):
    b = uuid.uuid4().hex
    out = io.BytesIO()
    for k, v in (fields or {}).items():
        out.write(f"--{b}\r\nContent-Disposition: form-data; name=\"{k}\"\r\n\r\n{v}\r\n".encode())
    for name, data in files:
        out.write(f"--{b}\r\nContent-Disposition: form-data; name=\"files\"; filename=\"{name}\"\r\nContent-Type: image/jpeg\r\n\r\n".encode())
        out.write(data + b"\r\n")
    out.write(f"--{b}--\r\n".encode())
    return out.getvalue(), f"multipart/form-data; boundary={b}"


def photo(caption, seed):
    """Platzhalter-Foto (1600×1200) mit Himmel, Boden, Rohbau-Andeutung und Beschriftung „Testfoto“."""
    from PIL import Image, ImageDraw, ImageFont
    rnd = random.Random(seed)
    im = Image.new("RGB", (1600, 1200))
    d = ImageDraw.Draw(im)
    sky = (rnd.randint(120, 170), rnd.randint(160, 200), rnd.randint(200, 235))
    for y in range(720):
        k = y / 720
        d.line([(0, y), (1600, y)], fill=tuple(int(c * (1 - .25 * k)) for c in sky))
    d.rectangle([0, 720, 1600, 1200], fill=(118 + rnd.randint(-10, 10), 98, 78))
    x0 = rnd.randint(200, 500)
    for i in range(rnd.randint(3, 6)):   # Wände / Stockwerke
        d.rectangle([x0, 720 - i * 110, x0 + 800, 720 - i * 110 + 100], fill=(170 + 10 * (i % 2), 170, 165), outline=(110, 110, 105), width=4)
        for w in range(4):
            d.rectangle([x0 + 60 + w * 190, 740 - i * 110, x0 + 160 + w * 190, 800 - i * 110], fill=(70, 80, 95))
    d.line([(x0 + 900, 300), (x0 + 900, 720)], fill=(230, 180, 20), width=14)   # Kran
    d.line([(x0 + 600, 300), (x0 + 1150, 300)], fill=(230, 180, 20), width=12)
    try:
        f = ImageFont.load_default(size=56)
    except TypeError:
        f = ImageFont.load_default()
    d.rectangle([0, 1080, 1600, 1200], fill=(0, 0, 0))
    d.text((40, 1105), f"Testfoto – {caption}", fill=(255, 255, 255), font=f)
    b = io.BytesIO()
    im.save(b, "JPEG", quality=82)
    return b.getvalue()


def workdays_back(n, end=None):
    d, out = end or date.today(), []
    while len(out) < n:
        if d.weekday() < 5:
            out.append(d)
        d -= timedelta(days=1)
    return sorted(out)


# ------------------------------------------------------------------------------------------------ Bauzeitenplan
def day_no(d):
    return (d - date(1970, 1, 1)).days


def gantt_plan(name, start, rows, trades):
    """rows: (Ebene, Name, Dauer, Gewerk, Vorgänger-Nr. (1-basiert) | None, % fertig)"""
    tasks = []
    for i, (lvl, n, dur, gw, pre, pct) in enumerate(rows, 1):
        preds = [{"uid": p, "type": "FS", "lag": 0} for p in (pre if isinstance(pre, (list, tuple)) else [pre] if pre else [])]
        tasks.append({"uid": i, "name": n, "dur": dur, "lvl": lvl, "gw": gw or "", "res": "", "pct": pct, "preds": preds, "notes": "", "cons": None})
    return {"name": name, "start": day_no(start), "nextUid": len(tasks) + 1, "tasks": tasks, "trades": trades,
            "cal": {"week": 5, "state": "NW", "free": []}}


EFH = [  # Neubau Einfamilienhaus
    (0, "Baubeginn", 0, "", None, 100),
    (0, "Rohbau", 0, "", None, 0),
    (1, "Baustelleneinrichtung", 3, "Rohbau", 1, 100), (1, "Baugrube / Erdarbeiten", 5, "Erdbau", 3, 100),
    (1, "Bodenplatte", 6, "Rohbau", 4, 100), (1, "Mauerwerk EG", 10, "Rohbau", 5, 80), (1, "Decke über EG", 4, "Rohbau", 6, 0),
    (1, "Mauerwerk DG", 8, "Rohbau", 7, 0), (1, "Gerüst", 2, "Gerüst", 6, 100),
    (0, "Gebäudehülle", 0, "", None, 0),
    (1, "Dachstuhl", 5, "Zimmerer", 8, 0), (1, "Dacheindeckung", 6, "Dach", 11, 0), (1, "Fenster und Außentüren", 4, "Fenster", 8, 0),
    (0, "Ausbau", 0, "", None, 0),
    (1, "Elektro Rohinstallation", 6, "Elektro", 13, 0), (1, "Sanitär/Heizung Rohinstallation", 7, "Sanitär", 13, 0),
    (1, "Innenputz", 8, "Putz", [15, 16], 0), (1, "Estrich", 4, "Estrich", 17, 0), (1, "Estrich trocknen", 20, "", 18, 0),
    (1, "Fliesen", 8, "Fliesen", 19, 0), (1, "Malerarbeiten", 8, "Maler", 19, 0), (1, "Endmontage Elektro/Sanitär", 5, "Elektro", [20, 21], 0),
    (0, "Übergabe an Bauherr", 0, "", 22, 0),
]
MFH = [  # Sanierung Mehrfamilienhaus
    (0, "Start Sanierung", 0, "", None, 100),
    (0, "Vorbereitung", 0, "", None, 0),
    (1, "Fassadengerüst", 3, "Gerüst", 1, 100), (1, "Mieterinformation / Baustelleneinrichtung", 2, "", 1, 100),
    (0, "Fenster und Fassade", 0, "", None, 0),
    (1, "Fenstertausch 1. OG", 5, "Fenster", 3, 100), (1, "Fenstertausch 2. OG", 5, "Fenster", 6, 40), (1, "Fenstertausch DG", 4, "Fenster", 7, 0),
    (0, "Haustechnik", 0, "", None, 0),
    (1, "Steigleitungen Elektro", 8, "Elektro", 4, 60), (1, "Strangsanierung Bäder", 15, "Sanitär", 4, 30),
    (0, "Treppenhaus", 0, "", None, 0),
    (1, "Innenputz Treppenhaus", 6, "Putz", [10, 11], 0), (1, "Malerarbeiten Treppenhaus", 5, "Maler", 13, 0),
    (0, "Gerüst abbauen / Abnahme", 0, "", [8, 14], 0),
]


# ------------------------------------------------------------------------------------------------ Ablauf
def main(force=False):
    with db.tx() as c:
        if c.execute("SELECT 1 FROM settings WHERE key='testdaten'").fetchone():
            print("Testdaten sind schon vorhanden – nichts zu tun.")
            return
        n = c.execute("SELECT COUNT(*) FROM reports").fetchone()[0]
        if n and not force:
            sys.exit(f"Die Datenbank enthält schon {n} Tagesberichte – sieht nach einem Echtsystem aus. Abbruch.\n"
                     "Nur auf einem Testsystem erzwingen: bash update.sh --testdaten --force")
        ids = {}
        for name, adm, apps, _ in USERS:
            r = c.execute("SELECT id FROM users WHERE name=?", (name,)).fetchone()
            if r:
                c.execute("UPDATE users SET pass_hash=?, must_change=0, active=1, is_admin=?, apps=? WHERE id=?", (generate_password_hash(PW), adm, apps, r[0]))
                ids[name] = r[0]
            else:
                ids[name] = c.execute("INSERT INTO users(name, email, pass_hash, is_admin, must_change, apps) VALUES(?,?,?,?,0,?) RETURNING id",
                                      (name, name.split()[0].lower().replace("-", "") + "@beispiel.test", generate_password_hash(PW), adm, apps)).fetchone()[0]
        r = c.execute("SELECT value FROM settings WHERE key='office_name'").fetchone()
        if not (r and r[0]):
            c.execute("INSERT INTO settings(key, value) VALUES('office_name', 'Testbüro Bauplattform') ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value")
    print(f"Benutzer: {', '.join(n for n, *_ in USERS)} (Kennwort für alle: {PW})")

    bt = Client(BT)
    bt.req("POST", "/api/login", {"name": "Test-Admin", "password": PW})
    cid = {}
    for name, trade, person, phone, mail, street, zp, city in FIRMS:
        try:
            cid[name] = bt.req("POST", "/api/contacts", {"name": name, "trade": trade, "contact_person": person, "phone": phone, "email": mail,
                                                         "street": street, "zip": zp, "city": city})["id"]
        except RuntimeError as e:
            if " 409 " not in str(e):
                raise
            cid[name] = json.loads(str(e).split(" 409 ", 1)[1])["id"]
    print(f"Firmen: {len(cid)}")

    pids, photos = [], 0
    for pi, (name, client, street, zp, city, lat, lon, leaders, nrep) in enumerate(PROJECTS):
        pid = bt.req("POST", "/api/projects", {"name": name, "client": client, "street": street, "zip": zp, "city": city, "lat": lat, "lon": lon,
                                               "leaders": [ids[x] for x in leaders]})["id"]
        pids.append(pid)
        open_m = []
        for k, day in enumerate(workdays_back(nrep, date.today() - timedelta(days=1))):
            wx = random.choice(WX)
            rid = bt.req("POST", f"/api/projects/{pid}/reports", {"date": day.isoformat(), "time": random.choice(["07:30", "08:00", "09:15", "13:30"]),
                                                                    "site_manager": (leaders or ["Bernd Krämer"])[0], "plz": zp})["id"]
            bt.req("PUT", f"/api/reports/{rid}", {"weather": wx[0], "precip": wx[1], "temp": str(wx[2] + random.randint(-2, 3)), "humidity": str(wx[3]),
                                                  "wind": wx[4], "chk_tidy": int(random.random() > .3), "chk_photos": 1, "chk_firms": int(random.random() > .2)})
            for f, act, cnt in random.sample(ANW[pi], min(len(ANW[pi]), random.randint(2, 4))):
                bt.req("POST", f"/api/reports/{rid}/items", {"kind": "anwesende", "text": f, "activity": act, "headcount": cnt + random.randint(-1, 1)})
            for t in random.sample(NOTIZEN, random.randint(1, 2)):
                bt.req("POST", f"/api/reports/{rid}/items", {"kind": "notizen", "text": t})
            item_for_photo = None
            if random.random() < .55:
                due = (day + timedelta(days=random.randint(3, 10))).isoformat()
                m = bt.req("POST", f"/api/reports/{rid}/items", {"kind": "maengel", "text": random.choice(MAENGEL), "due": due})
                open_m.append(m["id"])
                item_for_photo = m["id"]
            if open_m and random.random() < .4:   # älteren Mangel als erledigt markieren
                bt.req("PUT", f"/api/items/{open_m.pop(0)}", {"done": 1})
            if random.random() < .4:
                bt.req("POST", f"/api/reports/{rid}/items", {"kind": "zu_erledigen", "text": random.choice(AUFGABEN),
                                                             "due": (day + timedelta(days=7)).isoformat()})
            if random.random() < .3:
                w, co = random.choice(WEISUNGEN)
                bt.req("POST", f"/api/reports/{rid}/items", {"kind": "weisungen", "text": w, "company": co})
            files = [(f"IMG_{rid:04d}_{j}.jpg", photo(random.choice(PHOTO_CAP), rid * 10 + j)) for j in range(random.randint(1, 3))]
            body, ctype = multipart(files)
            bt.req("POST", f"/api/reports/{rid}/images", body=body, ctype=ctype)
            photos += len(files)
            if item_for_photo:
                body, ctype = multipart([(f"Mangel_{rid}.jpg", photo("Mangel", rid))], {"item_id": item_for_photo})
                bt.req("POST", f"/api/reports/{rid}/images", body=body, ctype=ctype)
                photos += 1
        print(f"Projekt {name}: {nrep} Tagesberichte")
    print(f"Fotos: {photos}")

    # Bauzeitenpläne – über den Bauzeitenplan-Dienst, mit der gemeinsamen Anmeldung
    tok = bt.cookie("bp_sso")
    gc = Client(GANTT)
    gc.extra = {"Cookie": f"bp_sso={tok}"}
    for _ in range(60):   # Dienst startet evtl. noch
        try:
            gc.req("GET", "/api/me")
            break
        except Exception:
            time.sleep(2)
    firms = {f["name"]: f["id"] for f in gc.req("GET", "/api/firms")}
    tr = lambda pairs: {gw: {"firm": firms.get(fn, ""), "status": st, "note": "", "din": "", "craft": "", "extra": False} for gw, fn, st in pairs}
    monday = date.today() - timedelta(days=date.today().weekday())
    plans = [
        (gantt_plan("T101 Neubau EFH – Bauzeitenplan", monday - timedelta(weeks=5), EFH, tr([
            ("Erdbau", "Erdbau Hoffmann GmbH", "fertig"), ("Rohbau", "Rohbau Schulte & Söhne", "beauftragt"), ("Gerüst", "Gerüstbau Ruhr", "beauftragt"),
            ("Zimmerer", "Zimmerei Brandt", "beauftragt"), ("Dach", "Dachdeckerei Klein", "angebot"), ("Fenster", "Fensterbau Nowak", "angefragt"),
            ("Elektro", "Elektro Wilhelmi", "beauftragt"), ("Sanitär", "Haustechnik Yilmaz", "angebot"), ("Putz", "", "offen"),
            ("Estrich", "Estrich Becker", "angefragt"), ("Fliesen", "Fliesen Rossi", "offen"), ("Maler", "Malerbetrieb Kunz", "offen")])), pids[0]),
        (gantt_plan("T102 Sanierung Lindenstraße – Bauablauf", monday - timedelta(weeks=3), MFH, tr([
            ("Gerüst", "Gerüstbau Ruhr", "beauftragt"), ("Fenster", "Fensterbau Nowak", "beauftragt"), ("Elektro", "Elektro Wilhelmi", "beauftragt"),
            ("Sanitär", "Haustechnik Yilmaz", "beauftragt"), ("Putz", "Putz & Stuck Berger", "angebot"), ("Maler", "Malerbetrieb Kunz", "angefragt")])), pids[1]),
    ]
    for p, link in plans:
        for t in p["tasks"]:   # Unternehmer = Firma des Gewerks
            fid = (p["trades"].get(t["gw"]) or {}).get("firm")
            t["res"] = next((n for n, i in firms.items() if i == fid), "") if fid else ""
        made = gc.req("POST", "/api/projects", {**p, "_link": link})
        gc.req("POST", f"/api/projects/{made['id']}/versions", {"name": "Stand Vergabe", "note": "Testdaten"})
        print(f"Bauzeitenplan: {p['name']} (verknüpft)")

    with db.tx() as c:
        c.execute("INSERT INTO settings(key, value) VALUES('testdaten', ?) ON CONFLICT (key) DO NOTHING", (date.today().isoformat(),))
    print("\nFertig. Anmelden auf der Startseite (Port 8090) z. B. als „Anna Bauer“ oder „Test-Admin“, Kennwort: " + PW)
    print("Rechte zum Ausprobieren: Bernd Krämer nur Bautagebuch, Clara Wolf nur Bauzeitenplan; T101 sehen nur Anna und Admins.")


if __name__ == "__main__":
    main(force="--force" in sys.argv)
