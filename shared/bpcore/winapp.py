"""Windows-App der Bauplattform (17.11.2026): merken, wer sie schon nutzt, und zum neuesten Setup weiterleiten.

Die App (windows/) meldet sich über window.bpDesktop; der Baustein head/winapp.js schickt dann einmal je Sitzung „genutzt“.
Wer unter Windows im Browser arbeitet und die App noch nie benutzt hat, bekommt auf der Startseite einmal das Angebot
(Später = in 7 Tagen wieder, Nicht mehr fragen = nie wieder); im Menü unter dem Benutzernamen steht es immer.

/api/bp/winapp         GET  → Stand für die angemeldete Person ({genutzt, version, nie, spaeter_bis, setup, setup_version})
                       POST {art: 'genutzt'|'spaeter'|'nie', version?}
/api/bp/winapp/setup   GET  → Weiterleitung auf das neueste Setup (Release-Anhang auf GitHub), sonst auf die Release-Seite

Gemerkt wird in users.extra["winapp"]. Das Setup hängt die Pipeline an jede Freigabe (.github/workflows/windows.yml).
"""
import json
import os
import re
import time
from datetime import datetime, timedelta

REPO = os.environ.get("WINAPP_REPO", "MatthiasKnauff/bauplattform")
SETUP = re.compile(r"^Bauplattform-Setup-[\d.]+\.exe$")
SPAETER_TAGE = 7
_CACHE = {"t": 0.0, "wert": None}
MERKEN_S, FEHLER_S = 1800, 600   # gefunden: 30 min merken; GitHub nicht erreichbar: 10 min nicht neu fragen


def waehle_setup(releases):
    """Neuestes Release (auch Vorabversion, nie Entwurf) mit Setup-Anhang → {url, version} oder None."""
    beste = None
    for r in releases or []:
        if r.get("draft"):
            continue
        for a in r.get("assets") or []:
            if SETUP.match(a.get("name") or ""):
                zeit = r.get("published_at") or r.get("created_at") or ""
                if not beste or zeit > beste["zeit"]:
                    beste = {"url": a.get("browser_download_url"), "version": (r.get("tag_name") or "").lstrip("v"), "zeit": zeit}
    return {"url": beste["url"], "version": beste["version"]} if beste and beste["url"] else None


def setup():
    """Neuestes Setup auf GitHub (zwischengespeichert) – None, wenn es keins gibt oder GitHub nicht erreichbar ist."""
    jetzt = time.time()
    if _CACHE["t"] and jetzt - _CACHE["t"] < (MERKEN_S if _CACHE["wert"] else FEHLER_S):
        return _CACHE["wert"]
    wert = None
    if REPO:
        try:
            from urllib.request import Request, urlopen
            q = Request(f"https://api.github.com/repos/{REPO}/releases?per_page=30", headers={"Accept": "application/vnd.github+json", "User-Agent": "bauplattform"})
            with urlopen(q, timeout=4) as r:
                wert = waehle_setup(json.loads(r.read().decode("utf-8")))
        except Exception:   # kein Netz, GitHub langsam: dann eben kein Angebot – nie ein Fehler auf der Startseite
            wert = None
    _CACHE.update(t=jetzt, wert=wert)
    return wert


def stand(extra, jetzt=None):
    """Was die Oberfläche über die Person wissen muss – aus users.extra["winapp"]."""
    w = (extra or {}).get("winapp") or {}
    jetzt = jetzt or datetime.now()
    sp = w.get("spaeter_bis")
    try:
        sp = sp if sp and datetime.fromisoformat(sp) > jetzt else None
    except ValueError:
        sp = None
    return {"genutzt": bool(w.get("genutzt")), "version": w.get("version") or "", "zuletzt": w.get("zuletzt") or "", "nie": bool(w.get("nie")), "spaeter_bis": sp}


def merken(extra, art, version="", jetzt=None):
    """users.extra um die Antwort ergänzen (gibt das neue extra zurück)."""
    ex = dict(extra or {})
    w = dict(ex.get("winapp") or {})
    jetzt = jetzt or datetime.now()
    if art == "genutzt":
        w.update(genutzt=True, version=str(version or "")[:30], zuletzt=jetzt.isoformat(timespec="seconds"))
        if not w.get("erstmals"):
            w["erstmals"] = w["zuletzt"]
    elif art == "spaeter":
        w["spaeter_bis"] = (jetzt + timedelta(days=SPAETER_TAGE)).isoformat(timespec="seconds")
    elif art == "nie":
        w["nie"] = True
    else:
        raise ValueError(art)
    ex["winapp"] = w
    return ex


def routen(bp, _uid):
    from flask import jsonify, redirect, request
    from . import db

    def _extra(c, uid):
        r = c.execute("SELECT extra FROM users WHERE id=?", (uid,)).fetchone()
        try:
            return json.loads((r and r["extra"]) or "{}") or {}
        except ValueError:
            return {}

    @bp.route("/api/bp/winapp", methods=["GET", "POST"])
    def bp_winapp():
        u, uid = _uid()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        with db.tx() as c:
            ex = _extra(c, uid)
            if request.method == "POST":
                d = request.get_json(silent=True) or {}
                try:
                    ex = merken(ex, d.get("art"), d.get("version"))
                except ValueError:
                    return jsonify(error="Unbekannte Antwort"), 400
                c.execute("UPDATE users SET extra=? WHERE id=?", (json.dumps(ex, ensure_ascii=False), uid))
        s = stand(ex)
        neu = setup() if request.method == "GET" else None
        s.update(setup=bool(neu), setup_version=(neu or {}).get("version", ""))
        return jsonify(s)

    @bp.get("/api/bp/winapp/setup")
    def bp_winapp_setup():
        neu = setup()
        return redirect(neu["url"] if neu else f"https://github.com/{REPO}/releases", code=302)
