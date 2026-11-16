"""Anmeldung – Kennwortprüfung und Anmelde-Bremse einmal für alle Apps (vorher je eine Kopie in Bautagebuch und Plattform).

pruefe(user, pw)   – Kennwort gegen den Hash des Benutzers; ohne Benutzer wird gegen einen Platzhalter geprüft (gleiche Dauer).
neu_pruefen(pw, name, alt) – Fehlermeldung für ein neues Kennwort oder None.
zu_viele / fehlversuch / frei – Bremse nach Fehlversuchen, je Prozess im Speicher.
"""
import time

from werkzeug.security import check_password_hash, generate_password_hash

MIN_LEN = 8
_fails = {}   # Schlüssel -> Zeitstempel der Fehlversuche
_DUMMY = generate_password_hash("kein-benutzer")


def pruefe(user, pw):
    return check_password_hash(user["pass_hash"] if user else _DUMMY, pw or "") and bool(user)


def neu_pruefen(pw, name="", alt=None):
    if len(pw or "") < MIN_LEN:
        return f"Das neue Kennwort braucht mindestens {MIN_LEN} Zeichen."
    if pw == alt:
        return "Das neue Kennwort muss sich vom alten unterscheiden."
    if pw.lower() in ((name or "").lower(), "admin", "passwort", "password"):
        return "Dieses Kennwort ist zu einfach."
    return None


def zu_viele(key, limit=5, window=600):
    now = time.time()
    _fails[key] = [t for t in _fails.get(key, []) if now - t < window]
    return len(_fails[key]) >= limit


def fehlversuch(key):
    _fails.setdefault(key, []).append(time.time())


def frei(key):
    _fails.pop(key, None)
