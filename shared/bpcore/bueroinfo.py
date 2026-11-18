"""Büroinfos, die mehrere Apps brauchen: Bundesland und Name der Plattform (Verwaltung → Büro).

Nichts davon steht fest im Programm – jede Installation trägt ihre Werte in der Verwaltung ein.
"""
from .feiertage import LAENDER

NAME = "Bauportal"   # Vorgabe, solange in der Verwaltung kein eigener Name steht


def _wert(c, key):
    r = c.execute("SELECT value FROM settings WHERE key=?", (key,)).fetchone()
    return ((r["value"] if r else "") or "").strip()


def land(c):
    """Bundesland des Büros (Kürzel wie NW); ohne Eintrag „DE“ = nur bundesweite Feiertage."""
    v = _wert(c, "co_land").upper()
    return v if v in LAENDER else "DE"


def land_oder(c, vorgabe="NW"):
    """Bundesland des Büros für Dinge, die ein echtes Land brauchen (Bauantrag-Vordrucke); ohne Eintrag die Vorgabe."""
    v = land(c)
    return v if v in LAENDER else vorgabe


def name(c):
    """Name der Plattform im Kopf, auf der Anmeldung und als App-Name."""
    return _wert(c, "plattform_name")[:40] or NAME


def bauvorlage(c, S=None):
    """Bauvorlageberechtigte:r des Büros (MJ, 18.11.2026): die gewählte Person aus den Mitarbeiter:innen (co_bv_uid) – Name, Beruf, Kammer,
    Nummer aus ihrem Konto; was in der Verwaltung eingetragen ist (co_bv_*), geht vor. → {name, beruf, kammer, kammernr, uid, quelle}"""
    from . import konto
    S = S if S is not None else {r["key"]: r["value"] or "" for r in c.execute("SELECT key, value FROM settings WHERE key LIKE 'co\\_bv\\_%'").fetchall()}
    uid = int(S.get("co_bv_uid") or 0) if str(S.get("co_bv_uid") or "").isdigit() else 0
    u = c.execute("SELECT id, name, vorname, nachname FROM users WHERE id=?", (uid,)).fetchone() if uid else None
    K = konto.prefs(c, uid) if u else {}
    name = (" ".join(x for x in ((u["vorname"] or ""), (u["nachname"] or "")) if x) or u["name"]) if u else ""
    aus = {"name": name, "beruf": K.get("beruf", ""), "kammer": K.get("kammer", ""), "kammernr": K.get("kammernr", "")}
    return {**{k: (S.get("co_bv_" + k) or "").strip() or v for k, v in aus.items()}, "uid": uid if u else None, "konto": aus if u else {}}
