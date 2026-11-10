"""Projekte anlegen und ändern – ein Baustein für alle Apps (Tabelle projects).

Bisher lief das nur über das Bautagebuch; Verwaltung und Kopfleiste riefen es dafür auf. Jetzt benutzen alle diesen Baustein.
Hat sich die Adresse geändert, werden die Koordinaten neu bestimmt (Adresssuche, außerhalb der Datenbank-Transaktion).
Löschen bleibt in bpcore.projektteile (Papierkorb, über alle Apps hinweg).
"""
from . import db, geo, rechte

ADDR = ("street", "zip", "city")


def mit_koordinaten(d, current=None):
    """Hat sich die Adresse geändert, werden die Koordinaten neu bestimmt (außerhalb der DB-Transaktion).
    Gibt True/False zurück, ob etwas gefunden wurde, oder None, wenn die Adresse nicht betroffen ist."""
    if not any(k in d for k in ADDR) or "lat" in d or "lon" in d:
        return None
    cur = {k: str((current or {}).get(k) or "").strip() for k in ADDR}
    cur.update({k: str(d[k] or "").strip() for k in ADDR if k in d})
    if not any(cur.values()):
        d["lat"] = d["lon"] = None
        return None
    hit = geo.search(", ".join(x for x in (cur["street"], f"{cur['zip']} {cur['city']}".strip()) if x))
    d["lat"], d["lon"] = (hit["lat"], hit["lon"]) if hit else (None, None)
    return bool(hit)


def anlegen(d):
    """Neues Projekt. Ohne Adresse wird sie aus dem Projektnamen ermittelt. → (id, Koordinaten gefunden?, Adresse automatisch?)"""
    d = dict(d or {})
    d.setdefault("name", "Neues Projekt")
    explicit = "lat" in d or "lon" in d
    found, auto = mit_koordinaten(d), False
    if found is None and not any(str(d.get(k) or "").strip() for k in ADDR) and not explicit:
        d.pop("lat", None); d.pop("lon", None)
        hit = geo.search(d["name"], from_name=True)   # keine Adresse angegeben: aus dem Projektnamen ermitteln
        d["extra"] = {"addr_tried": True}
        if hit:
            d.update({k: hit[k] for k in (*ADDR, "lat", "lon")})
            d["extra"]["addr_auto"] = auto = True
    with db.tx() as c:
        d["leaders"] = rechte.clean(d.get("leaders"), c)
        return db.insert(c, "projects", d), found, auto


def aendern(i, d):
    """Projekt ändern (Name, Bauherr, Adresse, Bauleiter, Archiv …). → Koordinaten gefunden? (None = Adresse nicht betroffen)"""
    d = dict(d or {})
    with db.tx() as c:
        row = c.execute("SELECT street, zip, city FROM projects WHERE id=?", (i,)).fetchone()
    found = mit_koordinaten(d, dict(zip(row.keys(), row)) if row else {})
    if any(k in d for k in ADDR) and "extra" not in d:
        d["extra"] = {"addr_auto": None}      # von Hand geändert: nicht mehr "automatisch ermittelt"
    with db.tx() as c:
        if "leaders" in d:   # Bauleiter dürfen weitere Bauleiter eintragen oder ändern (den Zugriff aufs Projekt prüft die App vorab)
            d["leaders"] = rechte.clean(d["leaders"], c)
        db.update(c, "projects", i, d)
        if any(k in d for k in ADDR):   # Baustellenadresse steht auch in den Kontakten: dort mitführen
            pr = db.to_dict(c.execute("SELECT street, zip, city, extra FROM projects WHERE id=?", (i,)).fetchone())
            cid = (pr.get("extra") or {}).get("contact_id")
            if cid:
                db.update(c, "contacts", cid, {k: pr[k] for k in ADDR})
    return found
