"""Akquise – Anfragen ohne Projekt (besprochen am 14.11.2026, Entwurf „Akquise-App“). Baustein des Kerns: die App „Akquise“ und
„Honorar“ (abgelegte Überschläge → Akquise) benutzen ihn.

Eine Akquise ist kein Projekt: sie erscheint nicht in der Projektwahl. Ihre Dateien liegen im Projektpfad unter „Akquise/<ordner>“
(archiviert: „Akquise/_Archiv/<ordner>“) – in der Datenbank stehen nur die Daten, nie Dokumente. Umwandeln legt ein echtes Projekt an.
"""
import re
import time

STAENDE = {"anfrage": "Anfrage", "angebot": "Angebot abgegeben", "zusage": "Zusage", "absage": "Absage"}
FELDER = ("name", "bauherr", "ansprech", "telefon", "email", "adresse", "stand", "wiedervorlage", "notiz")
WURZEL = "Akquise"
ARCHIV = "_Archiv"
_BAD = re.compile(r'[\\/:*?"<>|\x00-\x1f]')


def ordner_name(name):
    """Ordnername wie auf dem Dateiserver (Windows-tauglich, wie bautagebuch/core/remote.clean)."""
    s = re.sub(r"\s+", " ", _BAD.sub(" ", name or "")).strip().rstrip(". ")
    return s[:120] or "Akquise"


def _freier_ordner(c, name, ohne=None):
    basis = ordner_name(name)
    belegt = {r["ordner"].lower() for r in c.execute("SELECT ordner FROM akquise WHERE id IS DISTINCT FROM ?", (ohne,)).fetchall()}
    z, n = basis, 1
    while z.lower() in belegt:
        n += 1
        z = f"{basis} ({n})"
    return z


def sauber(b):
    d = {k: str(b.get(k) or "").strip()[:2000 if k == "notiz" else 300] for k in FELDER if k in b}
    if "stand" in d and d["stand"] not in STAENDE:
        d["stand"] = "anfrage"
    if "wiedervorlage" in d and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", d["wiedervorlage"]):
        d["wiedervorlage"] = ""
    return d


def anlegen(c, name, von, **felder):
    """Neue Akquise → id. Der Ordner auf dem Dateiserver entsteht mit der ersten Datei."""
    d = sauber({**felder, "name": name})
    d["name"] = d.get("name") or "Neue Akquise"
    jetzt = time.strftime("%Y-%m-%d %H:%M:%S")
    sp = list(d)
    return c.execute(f"INSERT INTO akquise({', '.join(sp)}, ordner, von, erstellt, geaendert) VALUES({', '.join('?' for _ in sp)}, ?, ?, ?, ?) RETURNING id",
                     (*[d[k] for k in sp], _freier_ordner(c, d["name"]), von, jetzt, jetzt)).fetchone()["id"]


def aendern(c, aid, b):
    d = sauber(b)
    if not d:
        return
    if "name" in d and not d["name"]:
        d.pop("name")
    c.execute(f"UPDATE akquise SET {', '.join(k + '=?' for k in d)}, geaendert=? WHERE id=?", (*d.values(), time.strftime("%Y-%m-%d %H:%M:%S"), aid))


def liste(c, archiv=False):
    """Akquisen (ohne umgewandelte), neueste zuerst – mit den daran hängenden Überschlägen."""
    A = [dict(r) for r in c.execute("SELECT * FROM akquise WHERE project_id IS NULL AND archiviert=? ORDER BY geaendert DESC, id DESC", (1 if archiv else 0,)).fetchall()]
    U = {}
    for r in c.execute("SELECT id, akquise_id, wofuer, kosten, zone, satz, umbau, nk, netto, erstellt, von FROM honorar_ueberschlag WHERE akquise_id IS NOT NULL").fetchall():
        U.setdefault(r["akquise_id"], []).append(dict(r))
    for a in A:
        a["ueberschlaege"] = U.get(a["id"], [])
    return A


def pfad(a):
    """Pfadteile des Ordners unter dem Projektpfad."""
    return [WURZEL, ARCHIV, a["ordner"]] if a["archiviert"] else [WURZEL, a["ordner"]]


CODE = re.compile(r"^([A-Za-z]{1,3})(\d{2,5})(?=[\s.,_-]|$)")


def naechste_nummer(c, weitere=()):
    """Nächste freie Projektnummer (Hauptnummer, z. B. „A562“) aus den Projekten – und weiteren Namen (Ordner auf dem Dateiserver)."""
    best = {}
    for n in [r["name"] for r in c.execute("SELECT name FROM projects").fetchall()] + list(weitere):
        m = CODE.match((n or "").strip())
        if m:
            k = m.group(1).upper()
            best[k] = max(best.get(k, (0, 0)), (int(m.group(2)), len(m.group(2))))
    if not best:
        return ""
    k, (z, breite) = max(best.items(), key=lambda x: x[1][0])   # Buchstabe mit der höchsten Nummer
    return f"{k}{str(z + 1).zfill(breite)}"
