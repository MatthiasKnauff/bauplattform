"""Nummern der Leistungsverzeichnisse (15.11.2026): je Projekt (und Stand/Version) eindeutig. „1“ und „01“ gelten als dieselbe Nummer.
Ohne Angabe: die nächste freie (höchste Zahl + 1, zweistellig) – nicht mehr „Anzahl + 1“, das ergab doppelte Nummern."""
import re

AKTIV = "(version_id IS NULL OR version_id IN (SELECT id FROM ava_version WHERE aktiv=1))"


def _norm(nr):
    s = str(nr or "").strip().upper()
    return s.lstrip("0") or ("0" if s else "")


def _andere(c, pid, vid, ohne):
    vf = "version_id=?" if vid else AKTIV
    a = [pid] + ([vid] if vid else [])
    return [r["nr"] for r in c.execute(f"SELECT id, nr FROM ava_lv WHERE project_id IS NOT DISTINCT FROM ? AND {vf}", a).fetchall() if r["id"] != ohne]


def naechste(c, pid, vid=None):
    z = [int(m.group()) for n in _andere(c, pid, vid, None) for m in [re.match(r"\d+", str(n or "").strip())] if m]
    return str((max(z) if z else 0) + 1).zfill(2)


def frei_ok(c, pid, vid, nr, ohne=None):
    """True, wenn kein anderes LV des Projekts (im selben Stand) diese Nummer hat. Leere Nummer: immer erlaubt."""
    if not _norm(nr):
        return True
    return _norm(nr) not in {_norm(n) for n in _andere(c, pid, vid, ohne)}
