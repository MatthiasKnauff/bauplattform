"""Dateien im Projektordner ändern – Pläne & Dateien → „Alle Dateien“ (GO 17.11.2026, W1 X1 Y1).

POST /api/dateien/aktion {project_id, art, pfade, ziel, ziel_projekt, name, konflikt}
  art  kopieren · verschieben (pfade → Ordner ziel, auch in ein anderes Projekt) · umbenennen (ein Pfad → name) · ordner (neuer Ordner
       name in ziel) · loeschen (in den Papierkorb) · wiederherstellen (aus dem Papierkorb an die alte Stelle) · zurueck (schritte umkehren)
  konflikt  leer: gibt es einen Namen im Ziel schon, kommt {ok: false, konflikte} zurück · ersetzen (der alte kommt in den Papierkorb) ·
            beide („… (2)“) · ueberspringen
Antwort {ok, schritte, testserver}: die ausgeführten Schritte – mit art „zurueck“ und diesen Schritten macht die Seite alles rückgängig
(und mit den Schritten der Rücknahme wieder her). Jeder Schritt ist eine Änderung, die der Benutzer auch selbst machen dürfte.

Löschen (W1): nie endgültig – die Datei wandert in den Ordner „_Papierkorb/<Zeit> <Name>/<alter Pfad>“ des Projekts; die Dienste
löschen dort nach 30 Tagen (aufraeumen). Die Liste „Alle Dateien“ (bp_store allescan:<pid>) und die Vorschaubilder werden gleich
nachgeführt, ohne den ganzen Ordner neu zu lesen. Testserver: nichts wird geschrieben (remote.NUR_LESEN).
"""
import time
from datetime import datetime, timedelta

from flask import Blueprint, g, jsonify, request

from core import audit, db, remote, sync
from bpcore import vorschau as V
from modules.plaene import _ziel

bp = Blueprint("dateiops", __name__)
PK = "_Papierkorb"
TAGE = 30
MAX_DATEIEN = 3000


class Fehler(Exception):
    pass


def _rel(s):
    return remote.clean_path(s if isinstance(s, str) else "/".join(map(str, s or [])))


def _eintrag(t, base, rel):
    """{name, dir, size, mtime} oder None."""
    if not rel:
        return {"name": "", "dir": True, "size": 0, "mtime": 0}
    return next((e for e in t.listdir("/".join(base + rel[:-1])) if e["name"] == rel[-1]), None)


def _frei(t, base, ordner, name):
    stamm, punkt, endung = name.rpartition(".")
    if not punkt or not stamm:
        stamm, endung = name, ""
    n, ziel = 1, name
    while _eintrag(t, base, ordner + [ziel]) and n < 200:
        n += 1
        ziel = f"{stamm} ({n}){'.' + endung if endung else ''}"
    return ziel


class Lauf:
    """Eine Aktion: Ziele je Projekt (eine Verbindung), ausgeführte Schritte."""
    def __init__(self):
        self.Z, self.schritte, self.n = {}, [], 0
        self.stempel = f"{datetime.now():%Y-%m-%d %H-%M-%S} {remote.clean(g.user.get('name') or '') or 'Benutzer'}"

    def ziel(self, pid):
        if pid not in self.Z:
            t, base, err = _ziel(pid)
            if err:
                raise Fehler(err)
            self.Z[pid] = (t, base)
        return self.Z[pid]

    # ---- Grundschritte (je einer in self.schritte)
    def mv(self, pa, a, pb, b):
        ta, ba = self.ziel(pa)
        bb = self.ziel(pb)[1]
        ta.rename("/".join(ba + a), "/".join(bb + b))   # alle Projektordner liegen in derselben Ablage
        self.schritte.append({"a": "mv", "von": [pa, "/".join(a)], "nach": [pb, "/".join(b)]})

    def cp(self, pa, a, pb, b):
        ta, ba = self.ziel(pa)
        tb, bb = self.ziel(pb)
        e = _eintrag(ta, ba, a)
        if not e:
            raise Fehler(f"„{a[-1]}“ gibt es nicht mehr.")
        self._kopie(ta, ba + a, tb, bb + b, e["dir"])
        self.schritte.append({"a": "cp", "von": [pa, "/".join(a)], "nach": [pb, "/".join(b)]})

    def _kopie(self, ta, a, tb, b, ist_dir):
        if ist_dir:
            tb.mkdir("/".join(b))
            for e in ta.listdir("/".join(a)):
                self._kopie(ta, a + [e["name"]], tb, b + [e["name"]], e["dir"])
            return
        self.n += 1
        if self.n > MAX_DATEIEN:
            raise Fehler(f"Mehr als {MAX_DATEIEN} Dateien auf einmal – bitte in kleineren Teilen kopieren.")
        tb.put_bytes(ta.read("/".join(a), 600 * 1024 * 1024), "/".join(b))

    def md(self, p, rel):
        t, base = self.ziel(p)
        t.mkdir("/".join(base + rel))
        self.schritte.append({"a": "md", "nach": [p, "/".join(rel)]})

    def rd(self, p, rel):
        t, base = self.ziel(p)
        if t.listdir("/".join(base + rel)):
            raise Fehler(f"Der Ordner „{rel[-1]}“ ist nicht mehr leer.")
        t.rmdir_if_empty("/".join(base + rel))
        self.schritte.append({"a": "rd", "nach": [p, "/".join(rel)]})

    def papierkorb(self, p, rel):
        t, base = self.ziel(p)
        ziel = [PK, self.stempel] + rel[:-1]
        self.mv(p, rel, p, ziel + [_frei(t, base, ziel, rel[-1])])   # nie etwas im Papierkorb überschreiben

    # ---- Ziel mit Namenskonflikt
    def platz(self, p, ordner, name, konflikt):
        """Name im Zielordner nach der Wahl bei Konflikten – None = überspringen."""
        t, base = self.ziel(p)
        if not _eintrag(t, base, ordner + [name]):
            return name
        if konflikt == "ersetzen":
            self.papierkorb(p, ordner + [name])
            return name
        if konflikt == "beide":
            return _frei(t, base, ordner, name)
        return None


def _pruefen(L, pfade, pid, ordner, zpid):
    """Namen, die es im Ziel schon gibt (für die Rückfrage)."""
    t, base = L.ziel(zpid)
    return sorted({r[-1] for r in pfade if (pid != zpid or r[:-1] != ordner) and _eintrag(t, base, ordner + [r[-1]])})


def ausfuehren(b):
    art, pid = b.get("art"), b.get("project_id")
    if not isinstance(pid, int):
        raise Fehler("Projekt fehlt")
    L = Lauf()
    pfade = [r for r in (_rel(x) for x in (b.get("pfade") or [])[:500]) if r]
    zpid = b.get("ziel_projekt") if isinstance(b.get("ziel_projekt"), int) else pid
    ordner = _rel(b.get("ziel") or "")
    konflikt = b.get("konflikt") if b.get("konflikt") in ("ersetzen", "beide", "ueberspringen") else None
    if art in ("kopieren", "verschieben"):
        if not pfade:
            raise Fehler("Nichts gewählt.")
        if ordner[:1] == [PK]:
            raise Fehler("In den Papierkorb bitte mit „Löschen“.")
        for r in pfade:
            if pid == zpid and (ordner == r or ordner[:len(r)] == r) and art == "verschieben":
                raise Fehler(f"„{r[-1]}“ kann nicht in sich selbst verschoben werden.")
        if konflikt is None:
            k = _pruefen(L, pfade, pid, ordner, zpid)
            if k:
                return {"konflikte": k}, 409
        for r in pfade:
            if art == "verschieben" and pid == zpid and r[:-1] == ordner:
                continue   # liegt schon dort
            name = r[-1] if not (art == "kopieren" and pid == zpid and r[:-1] == ordner) else _frei(L.ziel(zpid)[0], L.ziel(zpid)[1], ordner, r[-1])
            name = L.platz(zpid, ordner, name, konflikt or "beide")
            if name is None:
                continue
            if not _eintrag(*L.ziel(pid), r):
                raise Fehler(f"„{r[-1]}“ gibt es nicht mehr – bitte neu einlesen.")
            (L.mv if art == "verschieben" else L.cp)(pid, r, zpid, ordner + [name])
    elif art == "umbenennen":
        name = remote.clean(b.get("name") or "")
        if len(pfade) != 1 or not name:
            raise Fehler("Bitte einen Namen eingeben.")
        r = pfade[0]
        if name != r[-1]:
            t, base = L.ziel(pid)
            if _eintrag(t, base, r[:-1] + [name]) and name.lower() != r[-1].lower():
                raise Fehler(f"„{name}“ gibt es in diesem Ordner schon.")
            L.mv(pid, r, pid, r[:-1] + [name])
    elif art == "ordner":
        name = remote.clean(b.get("name") or "")
        if not name:
            raise Fehler("Bitte einen Namen eingeben.")
        t, base = L.ziel(pid)
        if _eintrag(t, base, ordner + [name]):
            raise Fehler(f"„{name}“ gibt es hier schon.")
        L.md(pid, ordner + [name])
    elif art == "loeschen":
        for r in pfade:
            if r[0] == PK:
                raise Fehler("Im Papierkorb wird nach 30 Tagen von selbst gelöscht.")
            if not _eintrag(*L.ziel(pid), r):
                continue
            L.papierkorb(pid, r)
    elif art == "wiederherstellen":
        for r in pfade:
            if r[0] != PK or len(r) < 3:
                raise Fehler("Nur aus dem Papierkorb.")
            orig = r[2:]
            name = L.platz(pid, orig[:-1], orig[-1], konflikt or "beide")
            if name:
                L.mv(pid, r, pid, orig[:-1] + [name])
    elif art == "zurueck":
        S = b.get("schritte") if isinstance(b.get("schritte"), list) else []
        for s in reversed(S[:2000]):
            if not isinstance(s, dict) or s.get("a") not in ("mv", "cp", "md", "rd"):
                raise Fehler("Ungültiger Schritt")
            n = s.get("nach") or [None, ""]
            pn, rn = n[0], _rel(n[1])
            if not isinstance(pn, int) or not rn:
                raise Fehler("Ungültiger Schritt")
            if s["a"] == "mv":
                v = s.get("von") or [None, ""]
                pv, rv = v[0], _rel(v[1])
                if not isinstance(pv, int) or not rv:
                    raise Fehler("Ungültiger Schritt")
                if _eintrag(*L.ziel(pv), rv):
                    raise Fehler(f"„{rv[-1]}“ gibt es an der alten Stelle schon wieder – Rückgängig nicht möglich.")
                L.mv(pn, rn, pv, rv)
            elif s["a"] == "cp":
                if _eintrag(*L.ziel(pn), rn):
                    L.papierkorb(pn, rn)
            elif s["a"] == "md":
                L.rd(pn, rn)
            else:
                L.md(pn, rn)
    else:
        raise Fehler("Unbekannte Aktion")
    return L, 200


# ---------------------------------------------------------------- Liste „Alle Dateien“ und Vorschaubilder nachführen
def _drin(p, rel):
    return p == rel or p.startswith(rel + "/")


def nachfuehren(c, schritte):
    """Gespeicherte Dateiliste je Projekt (bp_store allescan:<pid>) an die Schritte anpassen; Vorschaubilder wandern mit."""
    S = {}

    def scan(pid):
        if pid not in S:
            s = V.scan_laden(c, pid)
            S[pid] = s if s and isinstance(s.get("res"), dict) else None
        return S[pid]

    jetzt = round(time.time(), 1)
    for s in schritte:
        pn, rn = s["nach"]
        if s["a"] in ("mv", "cp"):
            pv, rv = s["von"]
            a, z = scan(pv), scan(pn)
            ar = (a or {}).get("res") or {}
            alt = [d for d in ar.get("dateien") or [] if _drin(d[0], rv)]
            ord_alt = [o for o in ar.get("ordner") or [] if _drin(o, rv)]
            ist_dir = bool(ord_alt) or any(d[0] != rv for d in alt)
            neu = [[rn + d[0][len(rv):], d[1], d[2] if s["a"] == "mv" else jetzt] for d in alt]
            ord_neu = {rn + o[len(rv):] for o in ord_alt} | ({rn} if ist_dir else set())
            if s["a"] == "mv" and a:
                ar["dateien"] = [d for d in ar.get("dateien") or [] if not _drin(d[0], rv)]
                ar["ordner"] = [o for o in ar.get("ordner") or [] if not _drin(o, rv)]
            if z:
                zr = z["res"]
                zr["dateien"] = [d for d in zr.get("dateien") or [] if not _drin(d[0], rn)] + neu
                zr["ordner"] = sorted({o for o in zr.get("ordner") or [] if not _drin(o, rn)} | ord_neu)
            if s["a"] == "mv" and pn < 0:   # in „Mein Ordner“ (bpcore/meinordner.py) gibt es keine Vorschaubilder
                c.execute("DELETE FROM bp_vorschau WHERE project_id=? AND (pfad=? OR substr(pfad, 1, ?)=?)", (pv, rv, len(rv) + 1, rv + "/"))
            elif s["a"] == "mv":   # Vorschaubilder mitnehmen
                c.execute("DELETE FROM bp_vorschau WHERE project_id=? AND (pfad=? OR substr(pfad, 1, ?)=?)", (pn, rn, len(rn) + 1, rn + "/"))
                c.execute("UPDATE bp_vorschau SET project_id=?, pfad=? || substr(pfad, ?) WHERE project_id=? AND (pfad=? OR substr(pfad, 1, ?)=?)",
                          (pn, rn, len(rv) + 1, pv, rv, len(rv) + 1, rv + "/"))
        elif s["a"] == "md" and scan(pn):
            S[pn]["res"]["ordner"] = sorted(set(S[pn]["res"].get("ordner") or []) | {rn})
        elif s["a"] == "rd" and scan(pn):
            S[pn]["res"]["ordner"] = [o for o in S[pn]["res"].get("ordner") or [] if o != rn]
    import json
    for pid, s in S.items():
        if s:
            c.execute("UPDATE bp_store SET data=? WHERE key=?", (json.dumps(s, ensure_ascii=False), f"allescan:{pid}"))


@bp.post("/api/dateien/aktion")
def aktion():
    b = request.get_json(silent=True) or {}
    try:
        L, st = ausfuehren(b)
    except Fehler as e:
        return jsonify(error=str(e)), 400
    except Exception as e:   # Dateiserver
        return jsonify(error="Dateiserver: " + sync._msg(e)), 502
    if st != 200:   # Namen gibt es im Ziel schon: die Seite fragt „Ersetzen · Beide behalten · Überspringen“
        return jsonify(ok=False, **L)
    if L.schritte and not remote.NUR_LESEN:
        with db.tx() as c:
            nachfuehren(c, L.schritte)
            p = c.execute("SELECT id, name FROM projects WHERE id=?", (b["project_id"],)).fetchone()
            T = {"kopieren": "Dateien kopiert", "verschieben": "Dateien verschoben", "umbenennen": "Datei umbenannt", "ordner": "Ordner angelegt",
                 "loeschen": "Dateien in den Papierkorb", "wiederherstellen": "Dateien wiederhergestellt", "zurueck": "Dateiänderung rückgängig"}
            audit.log(c, g.user["name"], "export", T.get(b.get("art"), "Dateien geändert"),
                      "; ".join(f"{s['von'][1]} → {s['nach'][1]}" if s.get("von") else s["nach"][1] for s in L.schritte)[:900],
                      p["id"] if p else None, p["name"] if p else "", "")
    return jsonify(ok=True, schritte=L.schritte, testserver=remote.NUR_LESEN)


# ---------------------------------------------------------------- Papierkorb leeren (Dienste, nachts)
def aufraeumen(t, base, tage=TAGE):
    """Einträge im Papierkorb, die älter als „tage“ sind, endgültig löschen. → Zahl der gelöschten Einträge."""
    grenze, n = datetime.now() - timedelta(days=tage), 0
    for e in t.listdir("/".join(base + [PK])):
        try:
            am = datetime.strptime(e["name"][:19], "%Y-%m-%d %H-%M-%S")
        except ValueError:
            continue
        if e["dir"] and am < grenze:
            t.delete("/".join(base + [PK, e["name"]]), True)
            n += 1
    if n and not t.listdir("/".join(base + [PK])):
        t.rmdir_if_empty("/".join(base + [PK]))
    return n
