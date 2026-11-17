"""Einträge aus Vorschlagslisten löschen – mit Ersatz (GO 17.11.2026, Entwurf „Gewerk / Rolle löschen“: O1, P1, R1).

Vorschläge wie „Gewerk / Rolle“ entstehen aus dem, was eingetragen ist. Ein falscher oder doppelter Eintrag („Bauherr*in“ neben „Bauherr“)
verschwindet erst, wenn ihn keine Sache mehr trägt. Deshalb: alle Sachen mit diesem Eintrag zeigen, einen Ersatz für alle wählen (je Sache
änderbar, „ohne Ersatz“ entfernt ihn nur) und in einem Zug ersetzen – mit Rückgängig (der alte Wert je Sache kommt zurück).

Quellen (QUELLEN): je Liste, woher die Werte kommen, wie eine Sache heißt und wie der Wert gesetzt wird. Feste Werte (Stammdaten, GAEB-Einheiten)
sind keine Quelle und haben in der Oberfläche kein 🗑. Neue Liste = ein Eintrag hier, die Oberfläche (bp/begriffe.js) ist für alle gleich.
Rechte (R1): wer die Daten der Quelle ändern darf – bei „nur lesen“ oder „aus“ in der zugehörigen App nicht.

Routen:  GET  /api/bp/begriffe/<quelle>?wert=…        → {titel, wert, treffer: [{id, name, sub, alt}], vorschlag, werte}
         POST /api/bp/begriffe/<quelle>/ersetzen     {wert, ersatz, je: {id: ersatz|""}} → {n, rueck: [{id, alt}]}
         POST /api/bp/begriffe/<quelle>/zurueck      {rueck}                              → {n}
"""
import re
from datetime import datetime

from . import contacts, versionen

MAX_TREFFER = 500


def _norm(s):   # für „ähnlich geschrieben“: Bauherr*in, Bauherr:in, Bauherrin, Bauherren → bauherr
    s = re.sub(r"[\s*:_/.\-]+", "", str(s or "").lower())
    return re.sub(r"(innen|in|en|e|n|s)$", "", s) or s


class _Kontakt:
    """Feld der Adressen: Listenfelder (Gewerk / Rolle, Stichwörter, Tags – mit Komma) oder ein Einzelwert (Art)."""
    app = "adressen"

    def __init__(self, feld, titel, liste=True):
        self.feld, self.titel, self.liste = feld, titel, liste

    def _hat(self, v, wert):
        return any(x.lower() == wert.lower() for x in contacts.liste(v)) if self.liste else str(v or "").strip().lower() == wert.lower()

    def werte(self, c):
        out = {}
        for r in c.execute(f"SELECT {self.feld} AS v FROM contacts WHERE {self.feld}<>''").fetchall():
            for x in (contacts.liste(r["v"]) if self.liste else [str(r["v"] or "").strip()]):
                if x:
                    k = next((y for y in out if y.lower() == x.lower()), x)
                    out[k] = out.get(k, 0) + 1
        return out

    def treffer(self, c, wert):
        like = "%" + wert.lower().replace("%", "").replace("_", "") + "%"
        return [{"id": r["id"], "name": r["name"], "sub": ", ".join(x for x in (r["street"], " ".join(y for y in (r["zip"], r["city"]) if y)) if x), "alt": r["v"]}
                for r in c.execute(f"SELECT id, name, street, zip, city, {self.feld} AS v FROM contacts WHERE lower({self.feld}) LIKE ? ORDER BY lower(name) LIMIT ?",
                                   (like, MAX_TREFFER)).fetchall() if self._hat(r["v"], wert)]

    def neu(self, alt, wert, ersatz):
        if not self.liste:
            return ersatz
        L = [ersatz if x.lower() == wert.lower() else x for x in contacts.liste(alt)]
        return ", ".join(contacts.liste(", ".join(x for x in L if x)))[:contacts.FELDER[self.feld]]

    def setzen(self, c, sid, v, wer):
        versionen.vor(c, f"kontakt:{sid}")
        c.execute(f"UPDATE contacts SET {self.feld}=?, updated=? WHERE id=?", (v, datetime.now().isoformat(timespec="seconds"), sid))
        versionen.nach(c, f"kontakt:{sid}", wer)


QUELLEN = {
    "kontakt.trade": _Kontakt("trade", "Gewerk / Rolle"),
    "kontakt.stichworte": _Kontakt("stichworte", "Stichwort"),
    "kontakt.tags": _Kontakt("tags", "Tag"),
    "kontakt.art": _Kontakt("art", "Art", liste=False),
}


def darf(u, q):
    from . import rechte
    return bool(u) and rechte.app_stufe(u, q.app) not in ("lesen", "aus")


def ansehen(c, quelle, wert):
    q = QUELLEN[quelle]
    W = q.werte(c)
    T = q.treffer(c, wert)
    andere = [w for w in W if w.lower() != wert.lower()]
    n = _norm(wert)
    vorschlag = next((w for w in sorted(andere, key=lambda w: -W[w]) if _norm(w) == n), "")   # ähnlich geschrieben, häufigster zuerst
    return {"titel": q.titel, "wert": wert, "treffer": T, "vorschlag": vorschlag, "werte": sorted(andere, key=str.lower)}


def ersetzen(c, quelle, wert, ersatz, je, wer):
    q = QUELLEN[quelle]
    ersatz = " ".join(str(ersatz or "").split())[:120]
    rueck = []
    for t in q.treffer(c, wert):
        e = je.get(str(t["id"]), ersatz) if isinstance(je, dict) else ersatz
        e = " ".join(str(e or "").split())[:120]
        v = q.neu(t["alt"], wert, e)
        if v != (t["alt"] or ""):
            q.setzen(c, t["id"], v, wer)
            rueck.append({"id": t["id"], "alt": t["alt"] or ""})
    return rueck


def zurueck(c, quelle, rueck, wer):
    q, n = QUELLEN[quelle], 0
    for x in rueck[:MAX_TREFFER] if isinstance(rueck, list) else []:
        try:
            sid, alt = int(x["id"]), str(x.get("alt") or "")
        except (KeyError, TypeError, ValueError):
            continue
        q.setzen(c, sid, alt[:600], wer)
        n += 1
    return n


def routen(bp, user):
    from flask import jsonify, request
    from . import db

    def vorab(quelle):
        u = user()
        if not u:
            return None, (jsonify(error="Nicht angemeldet"), 401)
        if quelle not in QUELLEN:
            return None, (jsonify(error="Diese Liste lässt sich nicht bearbeiten."), 404)
        if not darf(u, QUELLEN[quelle]):
            return None, (jsonify(error="Diese Einträge darfst du nicht ändern."), 403)
        return u, None

    @bp.get("/api/bp/begriffe/<quelle>")
    def begriff_ansehen(quelle):
        u, err = vorab(quelle)
        if err:
            return err
        wert = " ".join(str(request.args.get("wert") or "").split())[:120]
        if not wert:
            return jsonify(error="Welcher Eintrag?"), 400
        with db.tx() as c:
            return jsonify(ansehen(c, quelle, wert))

    @bp.post("/api/bp/begriffe/<quelle>/ersetzen")
    def begriff_ersetzen(quelle):
        u, err = vorab(quelle)
        if err:
            return err
        d = request.get_json(silent=True) or {}
        wert = " ".join(str(d.get("wert") or "").split())[:120]
        if not wert:
            return jsonify(error="Welcher Eintrag?"), 400
        with db.tx() as c:
            rueck = ersetzen(c, quelle, wert, d.get("ersatz"), d.get("je") or {}, u["name"])
        return jsonify(n=len(rueck), rueck=rueck)

    @bp.post("/api/bp/begriffe/<quelle>/zurueck")
    def begriff_zurueck(quelle):
        u, err = vorab(quelle)
        if err:
            return err
        with db.tx() as c:
            return jsonify(n=zurueck(c, quelle, (request.get_json(silent=True) or {}).get("rueck"), u["name"]))

