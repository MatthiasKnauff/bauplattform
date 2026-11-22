"""Mehrere Adressen auf einmal ändern (GO 23.11.2026, Mock „Adressen auswählen“ AW-3 A).

aendern(c, ids, feld, op, wert, wer) – Gewerk, Stichwörter, Tags dazu/entfernen, Art setzen, Projektnummer dazu/entfernen;
                                       → {id: {feld: vorher}} für das eine Rückgängig (zurueck)
zurueck(c, alt, wer)                 – setzt die gemerkten Werte wieder
loeschen(c, ids, wer)                – unbenutzte Kontakte in den Papierkorb, benutzte bleiben (Namen zurück)
Jede Änderung geht wie beim einzelnen Kontakt durch den Verlauf (versionen.vor/nach)."""
import json, re
from datetime import datetime

from bpcore import contacts as K, papierkorb, versionen

LISTEN = {"trade": (300, "Gewerk"), "stichworte": (600, "Stichwörter"), "tags": (300, "Tags")}
FELDER = {**{k: v[1] for k, v in LISTEN.items()}, "art": "Art", "projektnr": "Projekt"}
HOECHSTENS = 2000


def _liste(v):
    return [x.strip() for x in re.split(r"[,;]", v or "") if x.strip()]


def _extra(r):
    try:
        x = json.loads(r["extra"] or "{}")
    except (TypeError, ValueError):
        x = {}
    return x if isinstance(x, dict) else {}


def _ids(ids):
    out = []
    for i in ids if isinstance(ids, list) else []:
        if isinstance(i, int) and i > 0 and i not in out:
            out.append(i)
    if not out or len(out) > HOECHSTENS:
        raise ValueError("Keine Kontakte gewählt." if not out else f"Höchstens {HOECHSTENS} Kontakte auf einmal.")
    return out


def _setzen(c, i, feld, wert, wer):
    versionen.vor(c, f"kontakt:{i}")
    jetzt = datetime.now().isoformat(timespec="seconds")
    if feld == "projektnr":
        r = c.execute("SELECT extra FROM contacts WHERE id=?", (i,)).fetchone()
        ex = _extra(r)
        ex["projektnr"] = K.projektnr_bereinigen(wert)
        if not ex["projektnr"]:
            ex.pop("projektnr")
        c.execute("UPDATE contacts SET extra=?, updated=? WHERE id=?", (json.dumps(ex, ensure_ascii=False), jetzt, i))
    else:
        c.execute(f"UPDATE contacts SET {feld}=?, updated=? WHERE id=?", (wert, jetzt, i))
    versionen.nach(c, f"kontakt:{i}", wer)


def aendern(c, ids, feld, op, wert, wer):
    if feld not in FELDER or op not in ("dazu", "weg", "setzen"):
        raise ValueError("Unbekannte Änderung.")
    wert = " ".join(str(wert or "").split())
    if feld == "projektnr":
        wert = wert.upper()
        if not K.projektnr_bereinigen([wert]):
            raise ValueError("Keine gültige Projektnummer.")
    elif feld == "art":
        wert = wert[:60]
    elif not wert or len(wert) > LISTEN[feld][0]:
        raise ValueError(f"{FELDER[feld]}: bitte einen Wert.")
    ids, alt = _ids(ids), {}
    for r in c.execute(f"SELECT * FROM contacts WHERE id IN ({','.join('?' * len(ids))})", ids).fetchall():
        if feld == "art":
            vorher, neu = r["art"] or "", wert
        elif feld == "projektnr":
            vorher = _extra(r).get("projektnr") or []
            neu = vorher + [wert] if op == "dazu" and wert not in vorher else [x for x in vorher if x != wert] if op == "weg" else vorher
        else:
            vorher, L = r[feld] or "", _liste(r[feld])
            klein = [x.lower() for x in L]
            if op == "weg":
                L = [x for x in L if x.lower() != wert.lower()]
            elif wert.lower() not in klein:
                L.append(wert)
            neu = ", ".join(L)
            if len(neu) > LISTEN[feld][0]:
                raise ValueError(f"{FELDER[feld]} von „{r['name']}“ würde zu lang.")
        if neu == vorher:
            continue
        _setzen(c, r["id"], feld, neu, wer)
        alt[str(r["id"])] = {feld: vorher}
    return alt


def zurueck(c, alt, wer):
    n = 0
    for i, d in (alt or {}).items() if isinstance(alt, dict) else []:
        if not str(i).isdigit() or not isinstance(d, dict) or not c.execute("SELECT 1 FROM contacts WHERE id=?", (int(i),)).fetchone():
            continue
        for feld, v in d.items():
            if feld == "projektnr" and isinstance(v, list):
                _setzen(c, int(i), feld, v, wer)
            elif feld in LISTEN or feld == "art":
                _setzen(c, int(i), feld, " ".join(str(v or "").split())[:LISTEN.get(feld, (60,))[0]], wer)
            else:
                continue
            n += 1
    return n


def loeschen(c, ids, wer):
    pk, blockiert = [], []
    for i in _ids(ids):
        r = c.execute("SELECT id, name FROM contacts WHERE id=?", (i,)).fetchone()
        if not r:
            continue
        if K.usage(c, i):   # gleiche Regel wie beim einzelnen Kontakt
            blockiert.append(r["name"])
            continue
        versionen.vor(c, f"kontakt:{i}")
        pk.append(papierkorb.ablegen(c, "contacts", i, "Kontakt", r["name"], wer, "", "adressen"))
        versionen.nach(c, f"kontakt:{i}", wer)
    return pk, blockiert
