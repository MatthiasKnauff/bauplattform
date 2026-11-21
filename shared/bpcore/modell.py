"""Projektmodell – steht über allen Apps (besprochen am 15.11.2026, Entwurf „Planung – Verknüpfungen“).

Je Projekt EIN Modell (Gebäude, Geschosse, Einheiten, Räume, Bauteile grob). Jede App hängt mit GENAU EINER Linie am Modell:

  Richtung    beide | zur_app (App folgt dem Modell) | zum_modell (App liefert ins Modell)
  Übernahme   uebernahme (erst Hinweis mit Auswirkungen, dann entscheidet der Mensch – Standard) | auto (fließt sofort)
  Zustand     lebendig (Arbeitsstand der App) | fest (eingefroren auf einem Stand der App, gehört zu einem Modellstand) | getrennt

Regeln (alle am 15.11.2026 entschieden):
  - Es gibt immer einen funktionierenden Standard (STANDARD); eine Linie steht nur in der Tabelle, wenn jemand sie verstellt hat.
  - Mit jedem neuen Stand des Modells gehen alle lebendigen Linien wieder auf „uebernahme“.
  - Verlässt etwas das Haus (LV versendet, Bauantrag eingereicht …), ruft die App einfrieren(): Linie wird fest (mit dem gültigen Planstand).
  - Die Verknüpfungen haben ihr EIGENES Rückgängig (pm_verlauf), getrennt vom Rückgängig der Apps.
  - Hinweise (pm_hinweis) sind die Vorschläge, die an einer Linie auf eine Entscheidung warten (rote Zahl). Was von einer KI kommt,
    ist immer nur ein Hinweis – auch wenn die Linie auf „auto“ steht.
  - KI je Projekt: Regeln arbeiten immer; KI im Büro (Ollama) im Standard an, externe KI getrennt schaltbar und im Standard aus.

Etappe 1 (dieser Stand): Modell, Stände, Verknüpfungen, Verlauf, Hinweise und „aus Vorhandenem vorschlagen“ – noch ohne Oberfläche
und ohne dass eine App etwas ins Modell schreibt oder daraus liest. Stände der Änderungen am Modell zusätzlich im Verlauf des Kerns
(versionen, Bereich modell:<pid>).

lesen() / schreiben()      das Modell eines Projekts (mit Änderungszähler rev)
staende()  die Versionen des Modells = Planstände (keine eigenen Modell-Stände mehr, 17.11.2026)
links() / link_setzen() / alle_linien() / einfrieren() / standard()   die Linien
rueckgaengig() / wiederholen() / verlauf()   eigenes Rückgängig der Verknüpfungen
hinweis_neu() / hinweise() / hinweis_entscheiden()
aus_vorhandenem()          liest Bauzeitenplan, Baukosten und Projektdaten zusammen und zeigt Abweichungen – schreibt nichts
routen()                   /api/bp/modell/<pid>/…
"""
import re
import json
from datetime import datetime

from flask import jsonify, request

from . import anweisung, baukasten, bauteilliste, modell_einst, modell_hand, db, elemente, ki_fragen, lernen, planstand, rueckweg, skizze, stammdaten, verfeinern, versionen, vorgang
from .jsonwert import lies as _j

RICHTUNG = ("beide", "zur_app", "zum_modell")
UEBERNAHME = ("uebernahme", "auto")
ZUSTAND = ("lebendig", "fest", "getrennt")
# App → (Name auf der Karte, Richtung im Standard, Zustand im Standard). Reihenfolge = Reihenfolge auf der Karte.
APPS = (("plaene", "Pläne", "zum_modell", "lebendig"), ("termine", "Termine", "beide", "lebendig"), ("kosten", "Kosten", "beide", "lebendig"),
        ("ausschreibung", "Ausschreibung", "beide", "lebendig"), ("bauantrag", "Bauantrag", "zur_app", "lebendig"),
        ("waermeschutz", "Wärmeschutz", "beide", "lebendig"), ("honorar", "Honorar", "zur_app", "lebendig"),
        ("bautagebuch", "Bautagebuch", "zum_modell", "lebendig"), ("zeiten", "Zeiten", "beide", "getrennt"))
NAME = {k: n for k, n, _, _ in APPS}
STANDARD = {k: {"richtung": r, "uebernahme": "uebernahme", "zustand": z, "stand_ref": "", "stand_name": "", "modell_stand": None} for k, _, r, z in APPS}
FELDER = ("richtung", "uebernahme", "zustand", "stand_ref", "stand_name", "modell_stand")
WORT = {"beide": "beide Richtungen", "zur_app": "Modell → App", "zum_modell": "App → Modell", "uebernahme": "mit Übernahme", "auto": "automatisch",
        "lebendig": "lebendig", "fest": "fest", "getrennt": "getrennt"}
HINWEIS_STATUS = ("offen", "uebernommen", "abgelehnt", "spaeter")


class Ungueltig(ValueError):
    """Eingabe passt nicht – der Text geht so an die Oberfläche."""


def _jetzt():
    return datetime.now().isoformat(timespec="seconds")


def _s(v, n):
    return str(v if v is not None else "").strip()[:n]


def _zahl(v, lo=0.0, hi=1e9, stellen=2):
    try:
        x = float(str(v).replace(",", "."))
    except (TypeError, ValueError):
        return 0
    return round(min(hi, max(lo, x)), stellen) if x == x else 0


# ------------------------------------------------------------------ Modell (reine Funktionen)

def leer():
    return {"typ": "", "massnahme": "", "einheiten": 0, "flaeche": 0, "bgf": 0, "raumhoehe": 0, "geschosse": [], "raeume": [], "bauteile": [],
            "baubeginn": "", "assistent": {}, "hand": {}, "bauteilliste": bauteilliste.leer(),
            "kosten": {}, "termine": {}, "rueckweg": {}, "teile": [], "baukasten": {}, "korb": {}}


def assistent_sauber(a):
    """Angaben des Planungsassistenten in der Form des Baukastens (plankern.js: type, floors, dg, units, area, choice, flTw, sel …)."""
    a = a if isinstance(a, dict) else {}
    if not _s(a.get("type"), 80):   # auch Bauart in Ebenen, z. B. „k:mf:an.um.es:da.fa:d“
        return {}
    W = lambda k, n=40, m=80: {_s(x, 40): _s(y, n) for x, y in list((a.get(k) if isinstance(a.get(k), dict) else {}).items())[:m] if _s(x, 40) and _s(y, n)}   # noqa: E731
    out = {"type": _s(a.get("type"), 80), "area": _zahl(a.get("area"), 0, 1e6), "erwArea": _zahl(a.get("erwArea"), 0, 1e6), "fak": _zahl(a.get("fak"), 0, 5), "units": int(_zahl(a.get("units"), 1, 500, 0) or 1), "floors": int(_zahl(a.get("floors"), 1, 30, 0) or 1),
           "dg": _s(a.get("dg"), 12) or "kalt", "flDetail": bool(a.get("flDetail", True)), "naming": _s(a.get("naming"), 12), "names": _s(a.get("names"), 2000),
           "takt": _s(a.get("takt"), 12), "choice": W("choice"), "flTw": W("flTw", 12, 40), "fakPh": W("fakPh", 8, 20), "schritt": int(_zahl(a.get("schritt"), 0, 99, 0))}
    if isinstance(a.get("sel"), list):
        out["sel"] = [_s(x, 60) for x in a["sel"][:3000] if _s(x, 60)]
    # Ergänzungen (lernen.py): eigene Leistungen wie im Katalog (id, n, ph, gw, d …), Ergänzungen je Abschnitt, abgelehnte Vorschläge
    cus = []
    for x in (a.get("custom") if isinstance(a.get("custom"), list) else [])[:200]:
        if isinstance(x, dict) and _s(x.get("id"), 60) and _s(x.get("n"), 200):
            cus.append({"id": _s(x.get("id"), 60), "n": _s(x.get("n"), 200), "ph": _s(x.get("ph"), 40), "gw": _s(x.get("gw"), 80), "d": int(_zahl(x.get("d"), 0, 999, 0) or 1),
                        "sc": "we" if x.get("sc") == "we" else "bau", "a": [_s(y, 60) for y in (x.get("a") if isinstance(x.get("a"), list) else [])[:10] if _s(y, 60)],
                        "din": _s(x.get("din"), 20), "custom": 1, **({"ms": 1} if x.get("ms") else {})})
    if cus:
        out["custom"] = cus
    no = a.get("notiz") if isinstance(a.get("notiz"), dict) else {}
    no = {_s(k, 20): [_s(t, 300) for t in (v if isinstance(v, list) else [])[:20] if _s(t, 300)] for k, v in list(no.items())[:12] if _s(k, 20)}
    if any(no.values()):
        out["notiz"] = {k: v for k, v in no.items() if v}
    # Gebäudeteile (18.11.2026): eigene Angaben je Teil (plankern.teile) und von Hand ergänzte Teile
    te = {}
    for k, v in list((a.get("teile") if isinstance(a.get("teile"), dict) else {}).items())[:20]:
        if _s(k, 20) and isinstance(v, dict):
            o = {f: _s(v.get(f), 80 if f == "n" else 12) for f in ("n", "tw", "dach") if _s(v.get(f), 80)}
            o.update({f: _zahl(v.get(f), 0, 1e6 if f == "area" else 30) for f in ("area", "floors", "keller", "neu", "wie") if v.get(f) not in (None, "")})
            for f in ("h", "flTw", "a"):   # Hülle je Teil (Dachform, Dachdeckung, Fassade, Fenster), Bauweise je Geschoss, Ausbau/Technik je Teil (GG-B1/C1)
                d = v.get(f) if isinstance(v.get(f), dict) else {}
                d = {_s(x, 20): _s(y, 20) for x, y in list(d.items())[:30] if _s(x, 20) and _s(y, 20)}
                if d:
                    o[f] = d
            if o:
                te[_s(k, 20)] = o
    if te:
        out["teile"] = te
    tp = [{"k": _s(x.get("k"), 20), "n": _s(x.get("n"), 80) or "Gebäudeteil", "neu": 1 if x.get("neu") else 0}
          for x in (a.get("teilePlus") if isinstance(a.get("teilePlus"), list) else [])[:12] if isinstance(x, dict) and _s(x.get("k"), 20)]
    if tp:
        out["teilePlus"] = tp
    tl = [{"k": _s(x.get("k"), 20), "n": _s(x.get("n"), 80), "lage": x.get("lage"), **({"auf": _s(x.get("auf"), 20)} if x.get("lage") == "auf" else {})}
          for x in (a.get("tl") if isinstance(a.get("tl"), list) else [])[:20] if isinstance(x, dict) and _s(x.get("k"), 20) and x.get("lage") in ("bestand", "neu", "auf")]
    if tl:   # Liste der Gebäudeteile (GG-D1): Bestand · neu daneben · neu auf …, Namen frei
        out["tl"] = tl
    if isinstance(a.get("abgelehnt"), list) and a["abgelehnt"]:
        out["abgelehnt"] = [_s(x, 400) for x in a["abgelehnt"][:500] if _s(x, 400)]
    return out


def sauber(d):
    """Beliebige Eingabe → gültiges Modell (Grenzen, Typen). Unbekannte Schlüssel fallen weg."""
    d = d if isinstance(d, dict) else {}
    L = lambda k: d.get(k) if isinstance(d.get(k), list) else []   # noqa: E731
    out = leer()
    out.update({"typ": _s(d.get("typ"), 80), "massnahme": _s(d.get("massnahme"), 40), "einheiten": int(_zahl(d.get("einheiten"), 0, 500, 0)),
                "flaeche": _zahl(d.get("flaeche"), 0, 1e6), "bgf": _zahl(d.get("bgf"), 0, 1e6), "raumhoehe": _zahl(d.get("raumhoehe"), 0, 20)})
    out["geschosse"] = [{"id": _s(g.get("id"), 40) or f"g{i + 1}", "name": _s(g.get("name"), 60), "flaeche": _zahl(g.get("flaeche"), 0, 1e6),
                         "hoehe": _zahl(g.get("hoehe"), 0, 20), "bauweise": _s(g.get("bauweise"), 40)} for i, g in enumerate(L("geschosse")[:40]) if isinstance(g, dict)]
    out["raeume"] = [{"id": _s(r.get("id"), 40) or f"r{i + 1}", "nr": _s(r.get("nr"), 20), "name": _s(r.get("name"), 200), "flaeche": _zahl(r.get("flaeche"), 0, 1e6),
                      "geschoss": _s(r.get("geschoss"), 40)} for i, r in enumerate(L("raeume")[:2000]) if isinstance(r, dict)]
    out["bauteile"] = [{"id": _s(b.get("id"), 40) or f"b{i + 1}", "name": _s(b.get("name"), 200), "art": _s(b.get("art"), 40), "menge": _zahl(b.get("menge"), 0, 1e9, 3),
                        "einheit": _s(b.get("einheit"), 12)} for i, b in enumerate(L("bauteile")[:500]) if isinstance(b, dict)]
    bb = _s(d.get("baubeginn"), 10)
    out["baubeginn"] = bb if re.fullmatch(r"\d{4}-\d{2}-\d{2}", bb) else ""
    out["assistent"] = assistent_sauber(d.get("assistent"))
    out["teile"] = [{"k": _s(t.get("k"), 20), "n": _s(t.get("n"), 80), "art": _s(t.get("art"), 12), "neu": bool(t.get("neu")), "flaeche": _zahl(t.get("flaeche"), 0, 1e6),
                     "geschosse": int(_zahl(t.get("geschosse"), 1, 30, 0) or 1), "bauweise": _s(t.get("bauweise"), 12), "keller": bool(t.get("keller")), "dach": _s(t.get("dach"), 12),
                     "lage": _s(t.get("lage"), 8), "auf": _s(t.get("auf"), 20),
                     **{f: {_s(x, 20): _s(y, 20) for x, y in list(t[f].items())[:30] if _s(x, 20) and _s(y, 20)} for f in ("huelle", "flTw", "ausbau") if isinstance(t.get(f), dict)}}
                    for t in L("teile")[:20] if isinstance(t, dict) and _s(t.get("k"), 20)]   # Gebäudeteile aus dem Assistenten (abgeleitet, plankern.teile)
    out["baukasten"] = baukasten.sauber(d["baukasten"]) if isinstance(d.get("baukasten"), dict) and d["baukasten"].get("koerper") else {}   # Gebäude-Baukasten (20.11.2026)
    out["korb"] = baukasten.korb_sauber(d.get("korb"))   # Aufbauten des Projekts (G1)
    out["bauteilliste"] = bauteilliste.sauber(d.get("bauteilliste"))   # Bauteil-Checkliste: was mit den Bauteilen passiert (bauteilliste.py)
    hand = d.get("hand") if isinstance(d.get("hand"), dict) else {}
    out["hand"] = {_s(k, 120): True for k, v in list(hand.items())[:2000] if v and _s(k, 120)}   # von Hand gesetzte Werte: werden nie still überschrieben
    for k, f in rueckweg.ERGEBNIS.items():   # Ergebnisse der Apps (Kosten, Termine) – schreiben nur die Apps selbst (rueckweg.ergebnis_setzen)
        out[k] = f(d.get(k))
    rw = d.get("rueckweg") if isinstance(d.get("rueckweg"), dict) else {}
    out["rueckweg"] = {a: False for a in rueckweg.ZEILEN_APPS if rw.get(a) is False}   # Schalter „ins Modell“ je App (Standard an)
    return out


def link_wirksam(app, zeile=None):
    """Standard der App, überlagert von der gespeicherten Zeile; „abweichend“ = jemand hat die Linie verstellt."""
    w = dict(STANDARD[app])
    for k in FELDER:
        if zeile is not None and zeile.get(k) not in (None, ""):
            w[k] = zeile[k]
    if w["zustand"] != "fest":
        w.update(stand_ref="", stand_name="", modell_stand=None)
    w.update(app=app, name=NAME[app], abweichend=any(w[k] != STANDARD[app][k] for k in FELDER))
    return w


def link_pruefen(app, jetzt, neu):
    """Gewünschte Änderung an einer Linie prüfen → neue Werte (alle FELDER). jetzt = wirksame Linie, neu = nur die geänderten Schlüssel."""
    if app not in STANDARD:
        raise Ungueltig("Diese App gibt es auf der Karte nicht.")
    w = {k: jetzt[k] for k in FELDER}
    for k, erlaubt in (("richtung", RICHTUNG), ("uebernahme", UEBERNAHME), ("zustand", ZUSTAND)):
        if k in neu:
            if neu[k] not in erlaubt:
                raise Ungueltig(f"Unbekannter Wert für {k}: {neu[k]}")
            w[k] = neu[k]
    if w["zustand"] == "fest":
        w["stand_ref"] = _s(neu.get("stand_ref", w["stand_ref"]), 120)
        w["stand_name"] = _s(neu.get("stand_name", w["stand_name"]), 200)
        if not (w["stand_ref"] or w["stand_name"]):
            raise Ungueltig("Fest geht nur auf einem Stand der App – bitte den Stand angeben.")
        ms = neu.get("modell_stand", w["modell_stand"])
        w["modell_stand"] = int(ms) if str(ms or "").isdigit() else None
    else:
        w.update(stand_ref="", stand_name="", modell_stand=None)
    return w


def link_text(app, alt, neu):
    """Eine Zeile für den Verlauf: „Ausschreibung: fest (Stand 12.11.)“."""
    T = [WORT[neu[k]] for k in ("richtung", "uebernahme", "zustand") if alt[k] != neu[k]]
    if neu["zustand"] == "fest" and (alt["stand_ref"], alt["stand_name"]) != (neu["stand_ref"], neu["stand_name"]) and "fest" not in T:
        T.append("fest")
    t = ", ".join(T) or "unverändert"
    return f"{NAME[app]}: {t}" + (f" (Stand {neu['stand_name'] or neu['stand_ref']})" if neu["zustand"] == "fest" and "fest" in T else "")


def zusammenfuehren(gantt, kosten, pd):
    """Angaben aus Bauzeitenplan (Assistent), Baukosten (neueste Ermittlung) und Projektdaten nebeneinander: je Feld alle Quellen, der
    Vorschlag (erste Quelle mit Wert) und ob die Quellen sich widersprechen. Schreibt nichts."""
    gantt, kosten, pd = gantt or {}, kosten or {}, pd or {}
    raeume = [r for r in (kosten.get("rooms") or []) if isinstance(r, dict)]
    etagen = sorted({_s(r.get("floor"), 40) for r in raeume if _s(r.get("floor"), 40)})
    Q = lambda quelle, wert: {"quelle": quelle, "wert": wert}   # noqa: E731
    F = [
        ("typ", "Gebäudetyp / Maßnahme", [Q("Bauzeitenplan", _s(gantt.get("type"), 40) if gantt.get("type") not in (None, "", "frei") else ""), Q("Projektdaten", _s(pd.get("art"), 40))], False),
        ("geschosse", "Geschosse", [Q("Bauzeitenplan", int(_zahl(gantt.get("floors"), 0, 60, 0))), Q("Projektdaten", int(_zahl(pd.get("geschosse"), 0, 60, 0))), Q("Baukosten", len(etagen))], True),
        ("einheiten", "Einheiten", [Q("Bauzeitenplan", int(_zahl(gantt.get("units"), 0, 500, 0))), Q("Projektdaten", int(_zahl(pd.get("we"), 0, 500, 0)))], True),
        ("flaeche", "Wohn-/Nutzfläche (m²)", [Q("Bauzeitenplan", _zahl(gantt.get("area"), 0, 1e6)), Q("Baukosten", round(sum(_zahl(r.get("area"), 0, 1e6) for r in raeume), 2))], True),
        ("bgf", "Bruttogrundfläche (m²)", [Q("Projektdaten", _zahl(pd.get("bgf"), 0, 1e6))], True),
        ("raumhoehe", "Raumhöhe (m)", [Q("Baukosten", _zahl(kosten.get("hoehe_std"), 0, 20))], True),
        ("raeume", "Räume", [Q("Baukosten", len(raeume))], True),
    ]
    out = []
    for feld, name, werte, zahl in F:
        da = [w for w in werte if w["wert"]]
        verschieden = len({(round(w["wert"], 1) if zahl else str(w["wert"]).lower()) for w in da}) > 1
        out.append({"feld": feld, "name": name, "werte": da, "vorschlag": da[0]["wert"] if da else (0 if zahl else ""), "abweichung": verschieden})
    return {"felder": out, "geschosse": etagen, "abweichungen": sum(1 for x in out if x["abweichung"]), "leer": not any(x["werte"] for x in out)}


# ------------------------------------------------------------------ Modell (Datenbank)

def lesen(c, pid):
    r = c.execute("SELECT data, rev, geaendert, von FROM pm_modell WHERE project_id=?", (pid,)).fetchone()
    return {"modell": sauber(_j(r["data"], {})) if r else leer(), "rev": r["rev"] if r else 0, "geaendert": r["geaendert"] if r else "", "von": r["von"] if r else ""}


def schreiben(c, pid, daten, wer, rev=None):
    """Modell speichern. rev = Änderungszähler, den der Browser gelesen hat: passt er nicht, hat jemand anderes gespeichert → None."""
    alt = c.execute("SELECT rev, data FROM pm_modell WHERE project_id=?", (pid,)).fetchone()
    if rev is not None and (alt["rev"] if alt else 0) != rev:
        return None
    daten = dict(daten if isinstance(daten, dict) else {})
    vorher = _j(alt["data"], {}) if alt else {}
    for k in rueckweg.ERGEBNIS:   # Ergebnisse der Apps bleiben, wie sie im Modell stehen – der Browser schickt nur eine Kopie mit
        daten[k] = vorher.get(k) or {}
    with versionen.aenderung(c, f"modell:{pid}", wer):
        c.execute("INSERT INTO pm_modell(project_id, data, rev, erstellt, geaendert, von) VALUES(?,?,1,?,?,?) ON CONFLICT (project_id) DO UPDATE SET "
                  "data=EXCLUDED.data, rev=pm_modell.rev+1, geaendert=EXCLUDED.geaendert, von=EXCLUDED.von",
                  (pid, json.dumps(sauber(daten), ensure_ascii=False), _jetzt(), _jetzt(), wer))
    lernen.merken(c, pid, sauber(daten), wer)   # Ergänzungen im Assistenten: fürs Büro merken
    return lesen(c, pid)


def staende(c, pid):
    """Versionen des Modells = die Planstände (17.11.2026: keine eigenen Modell-Stände mehr – „Versionen wie überall müssen reichen“).
    nr = Nummer des Planstands; gilt = der gültige."""
    gilt = ((lesen(c, pid)["modell"].get("bauteilliste") or {}).get("quelle") or {}).get("planstand")
    return [{"nr": r["id"], "kommentar": r["name"], "anlass": "", "wann": r["erstellt"], "wer": r["wer"], "gilt": r["id"] == gilt}
            for r in c.execute("SELECT id, name, erstellt, wer FROM pm_planstand WHERE project_id=? AND entwurf=0 AND COALESCE(archiviert, 0)=0 ORDER BY id DESC",
                               (pid,)).fetchall()]


def _zeilen(c, pid):
    return {r["app"]: {k: r[k] for k in FELDER} for r in c.execute("SELECT * FROM pm_link WHERE project_id=?", (pid,)).fetchall() if r["app"] in STANDARD}


def links(c, pid):
    Z = _zeilen(c, pid)
    offen = {r["app"]: r["n"] for r in c.execute("SELECT app, COUNT(*) AS n FROM pm_hinweis WHERE project_id=? AND status='offen' GROUP BY app", (pid,)).fetchall()}
    return [dict(link_wirksam(app, Z.get(app)), offen=offen.get(app, 0)) for app, _, _, _ in APPS]


def _setzen(c, pid, app, w, wer):
    """Eine Linie speichern – entspricht sie wieder dem Standard, verschwindet die Zeile."""
    if all(w[k] == STANDARD[app][k] for k in FELDER):
        c.execute("DELETE FROM pm_link WHERE project_id=? AND app=?", (pid, app))
    else:
        c.execute("INSERT INTO pm_link(project_id, app, richtung, uebernahme, zustand, stand_ref, stand_name, modell_stand, geaendert, von) VALUES(?,?,?,?,?,?,?,?,?,?) "
                  "ON CONFLICT (project_id, app) DO UPDATE SET richtung=EXCLUDED.richtung, uebernahme=EXCLUDED.uebernahme, zustand=EXCLUDED.zustand, "
                  "stand_ref=EXCLUDED.stand_ref, stand_name=EXCLUDED.stand_name, modell_stand=EXCLUDED.modell_stand, geaendert=EXCLUDED.geaendert, von=EXCLUDED.von",
                  (pid, app, w["richtung"], w["uebernahme"], w["zustand"], w["stand_ref"], w["stand_name"], w["modell_stand"], _jetzt(), wer))


def _aendern(c, pid, neu, text, wer):
    """Mehrere Linien in EINEM Schritt ändern (neu = {app: Werte}) und als einen Eintrag ins eigene Rückgängig schreiben."""
    Z = _zeilen(c, pid)
    vor = {app: {k: link_wirksam(app, Z.get(app))[k] for k in FELDER} for app in neu}
    neu = {app: w for app, w in neu.items() if w != vor[app]}
    if not neu:
        return False
    for app, w in neu.items():
        _setzen(c, pid, app, w, wer)
    c.execute("UPDATE pm_verlauf SET zurueck=2 WHERE project_id=? AND zurueck=1", (pid,))   # nach einer neuen Änderung gibt es nichts mehr zu wiederholen
    c.execute("INSERT INTO pm_verlauf(project_id, text, vorher, nachher, wann, wer) VALUES(?,?,?,?,?,?)",
              (pid, _s(text, 400), json.dumps({a: vor[a] for a in neu}, ensure_ascii=False), json.dumps(neu, ensure_ascii=False), _jetzt(), wer))
    return True


def link_setzen(c, pid, app, aenderung, wer):
    if app not in STANDARD:
        raise Ungueltig("Diese App gibt es auf der Karte nicht.")
    jetzt = link_wirksam(app, _zeilen(c, pid).get(app))
    w = link_pruefen(app, jetzt, aenderung if isinstance(aenderung, dict) else {})
    _aendern(c, pid, {app: w}, link_text(app, jetzt, w), wer)
    return links(c, pid)


def _alle_auf(c, pid, uebernahme):
    """Neue Werte für alle lebendigen Linien, die noch nicht auf dieser Übernahme stehen (feste und getrennte bleiben)."""
    Z, neu = _zeilen(c, pid), {}
    for app in STANDARD:
        w = link_wirksam(app, Z.get(app))
        if w["zustand"] == "lebendig" and w["uebernahme"] != uebernahme:
            neu[app] = dict({k: w[k] for k in FELDER}, uebernahme=uebernahme)
    return neu


def alle_linien(c, pid, uebernahme, wer):
    """Schalter „Alle Linien“: automatisch für die frühe Phase, mit Übernahme sonst."""
    if uebernahme not in UEBERNAHME:
        raise Ungueltig("Unbekannte Übernahme.")
    _aendern(c, pid, _alle_auf(c, pid, uebernahme), f"Alle Linien: {WORT[uebernahme]}", wer)
    return links(c, pid)


def einfrieren(c, pid, app, stand_ref, stand_name, wer, kommentar=""):
    """Etwas verlässt das Haus (LV versendet, Bauantrag eingereicht …): die Linie der App wird fest auf ihrem Stand und merkt sich den
    gültigen Planstand des Modells (nr; None ohne Planstand)."""
    if app not in STANDARD:
        raise Ungueltig("Diese App gibt es auf der Karte nicht.")
    jetzt = link_wirksam(app, _zeilen(c, pid).get(app))
    nr = ((lesen(c, pid)["modell"].get("bauteilliste") or {}).get("quelle") or {}).get("planstand")
    w = link_pruefen(app, jetzt, {"zustand": "fest", "stand_ref": stand_ref, "stand_name": stand_name, "modell_stand": nr})
    _aendern(c, pid, {app: w}, f"{NAME[app]}: fest (Stand {w['stand_name'] or w['stand_ref']})" + (f" · Planstand {nr}" if nr else ""), wer)
    return nr


def standard(c, pid, wer, app=None):
    """Standard wiederherstellen – für eine Linie oder alle."""
    if app is not None and app not in STANDARD:
        raise Ungueltig("Diese App gibt es auf der Karte nicht.")
    _aendern(c, pid, {a: dict(STANDARD[a]) for a in ([app] if app else STANDARD)}, f"Standard wiederhergestellt{': ' + NAME[app] if app else ''}", wer)
    return links(c, pid)


def _schritt(c, pid, vor):
    """Den nächsten Eintrag zum Rückgängigmachen (vor=False) bzw. Wiederholen (vor=True) holen."""
    if vor:
        return c.execute("SELECT * FROM pm_verlauf WHERE project_id=? AND zurueck=1 ORDER BY id LIMIT 1", (pid,)).fetchone()
    return c.execute("SELECT * FROM pm_verlauf WHERE project_id=? AND zurueck=0 ORDER BY id DESC LIMIT 1", (pid,)).fetchone()


def _springen(c, pid, wer, vor):
    r = _schritt(c, pid, vor)
    if not r:
        return None
    for app, w in (_j(r["nachher" if vor else "vorher"], {}) or {}).items():
        if app in STANDARD:
            _setzen(c, pid, app, {k: w.get(k) for k in FELDER}, wer)
    c.execute("UPDATE pm_verlauf SET zurueck=? WHERE id=?", (0 if vor else 1, r["id"]))
    return r["text"]


def rueckgaengig(c, pid, wer):
    return _springen(c, pid, wer, False)


def wiederholen(c, pid, wer):
    return _springen(c, pid, wer, True)


def verlauf(c, pid, n=200):
    R = c.execute("SELECT id, text, zurueck, wann, wer FROM pm_verlauf WHERE project_id=? AND zurueck<2 ORDER BY id DESC LIMIT ?", (pid, n)).fetchall()
    return {"eintraege": [dict(r) for r in R], "rueck": bool(_schritt(c, pid, False)), "vor": bool(_schritt(c, pid, True))}


# ------------------------------------------------------------------ Hinweise an einer Linie

def hinweis_neu(c, pid, app, titel, daten=None, quelle="regel", wer=""):
    """Ein Vorschlag wartet an der Linie der App: titel = was sich geändert hat, daten = {aenderung, auswirkungen: [...], …}."""
    if app not in STANDARD:
        raise Ungueltig("Diese App gibt es auf der Karte nicht.")
    r = c.execute("INSERT INTO pm_hinweis(project_id, app, titel, daten, quelle, status, wann, wer) VALUES(?,?,?,?,?,'offen',?,?) RETURNING id",
                  (pid, app, _s(titel, 300), json.dumps(daten if isinstance(daten, dict) else {}, ensure_ascii=False), "ki" if quelle == "ki" else "regel", _jetzt(), wer))
    return r.fetchone()["id"]


def hinweise(c, pid, app=None, status="offen"):
    R = c.execute("SELECT * FROM pm_hinweis WHERE project_id=? AND status=? ORDER BY id", (pid, status)).fetchall()
    return [dict({k: r[k] for k in ("id", "app", "titel", "quelle", "status", "wann", "wer")}, daten=_j(r["daten"], {})) for r in R if not app or r["app"] == app]


def hinweis_entscheiden(c, pid, hid, status, wer):
    if status not in HINWEIS_STATUS:
        raise Ungueltig("Unbekannte Entscheidung.")
    r = c.execute("UPDATE pm_hinweis SET status=?, erledigt=?, erledigt_von=? WHERE id=? AND project_id=? RETURNING id", (status, _jetzt(), wer, hid, pid)).fetchone()
    return bool(r)


# ------------------------------------------------------------------ aus Vorhandenem vorschlagen

def aus_vorhandenem(c, pid):
    g = c.execute("SELECT data FROM gantt_projects WHERE project_id=? ORDER BY updated DESC LIMIT 1", (pid,)).fetchone()
    k = c.execute("SELECT data FROM bk_projects WHERE project_id=? AND archived=0 ORDER BY updated DESC LIMIT 1", (pid,)).fetchone()
    assist = (_j(g["data"], {}) or {}).get("assist") if g else None
    assist = assist if isinstance(assist, dict) else {}
    return dict(zusammenfuehren(assist, _j(k["data"], {}) if k else {}, stammdaten.projekt_lesen(c, pid, quellen=False)), assistent=assistent_sauber(assist))   # assistent: Angaben aus dem Bauzeitenplan zum Übernehmen


def app_staende(c, pid):
    """Die Versionen der Apps für die Kisten der Karte – genau die Liste ihres Versionsmenüs, ★ = gilt (modell_versionen.py)."""
    from . import modell_versionen
    return modell_versionen.staende(c, pid)


def alles(c, pid):
    """Alles, was die Karte braucht, in einer Antwort."""
    return dict(lesen(c, pid), staende=staende(c, pid), links=links(c, pid), verlauf=verlauf(c, pid, 30), app_staende=app_staende(c, pid),
                apps=[{"app": k, "name": n} for k, n, _, _ in APPS])


# ------------------------------------------------------------------ Adressen

def routen(bp, _uid):
    def mit(pid, fn):
        """Angemeldet und darf das Projekt sehen → fn(c, u, wer); Ungueltig wird zur 400-Antwort."""
        u, _ = _uid()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        try:
            with db.tx() as c:
                if not c.execute("SELECT 1 FROM projects WHERE id=?", (pid,)).fetchone() or not vorgang.sieht(c, u, pid):
                    return jsonify(error="Projekt nicht gefunden"), 404
                return fn(c, skizze.name_von(u))
        except Ungueltig as e:
            return jsonify(error=str(e)), 400

    def koerper():
        d = request.get_json(silent=True)
        return d if isinstance(d, dict) else {}

    @bp.get("/api/bp/modell/<int:pid>")
    def modell_lesen(pid):
        return mit(pid, lambda c, wer: jsonify(alles(c, pid)))

    @bp.put("/api/bp/modell/<int:pid>")
    def modell_schreiben(pid):
        d = koerper()

        def tun(c, wer):
            r = schreiben(c, pid, d.get("modell"), wer, d.get("rev") if isinstance(d.get("rev"), int) else None)
            return (jsonify(error="Jemand anderes hat das Modell inzwischen geändert – bitte neu laden.", **lesen(c, pid)), 409) if r is None else jsonify(alles(c, pid))
        return mit(pid, tun)

    @bp.put("/api/bp/modell/<int:pid>/link/<app>")
    def modell_link(pid, app):
        d = koerper()

        def tun(c, wer):
            if app not in STANDARD:
                return jsonify(error="Diese App gibt es auf der Karte nicht."), 404
            link_setzen(c, pid, app, d, wer)
            return jsonify(alles(c, pid))
        return mit(pid, tun)

    @bp.post("/api/bp/modell/<int:pid>/gilt")
    def modell_gilt(pid):
        """Zurück auf „aktuell“ mit „übernehmen“ (Karte): {ref} – diese Version der App wird die gültige (★), nichts wird überschrieben."""
        d = koerper()

        def tun(c, wer):
            from . import modell_versionen
            if not modell_versionen.gilt_setzen(c, pid, d.get("ref"), wer):
                return jsonify(error="Diese Version gibt es nicht (mehr) – sie lässt sich nicht als gültig setzen."), 404
            return jsonify(alles(c, pid))
        return mit(pid, tun)

    @bp.post("/api/bp/modell/<int:pid>/alle")
    def modell_alle(pid):
        d = koerper()

        def tun(c, wer):
            alle_linien(c, pid, d.get("uebernahme"), wer)
            return jsonify(alles(c, pid))
        return mit(pid, tun)

    @bp.post("/api/bp/modell/<int:pid>/einfrieren")
    def modell_einfrieren(pid):
        d = koerper()

        def tun(c, wer):
            nr = einfrieren(c, pid, d.get("app"), d.get("stand_ref"), d.get("stand_name"), wer, _s(d.get("kommentar"), 200))
            return jsonify(dict(alles(c, pid), nr=nr))
        return mit(pid, tun)

    @bp.post("/api/bp/modell/<int:pid>/standard")
    def modell_standard(pid):
        d = koerper()

        def tun(c, wer):
            standard(c, pid, wer, d.get("app") or None)
            return jsonify(alles(c, pid))
        return mit(pid, tun)

    @bp.post("/api/bp/modell/<int:pid>/<any(rueck, vor):wohin>")
    def modell_springen(pid, wohin):
        def tun(c, wer):
            text = (wiederholen if wohin == "vor" else rueckgaengig)(c, pid, wer)
            return jsonify(dict(alles(c, pid), text=text or ""))
        return mit(pid, tun)

    @bp.get("/api/bp/modell/<int:pid>/verlauf")
    def modell_verlauf(pid):
        return mit(pid, lambda c, wer: jsonify(verlauf(c, pid)))

    @bp.get("/api/bp/modell/<int:pid>/hinweise")
    def modell_hinweise(pid):
        return mit(pid, lambda c, wer: jsonify(hinweise(c, pid, request.args.get("app") or None)))

    @bp.post("/api/bp/modell/<int:pid>/hinweis/<int:hid>")
    def modell_hinweis(pid, hid):
        d = koerper()

        def tun(c, wer):
            if not hinweis_entscheiden(c, pid, hid, d.get("status"), wer):
                return jsonify(error="Hinweis nicht gefunden"), 404
            return jsonify(alles(c, pid))
        return mit(pid, tun)

    bauteilliste.routen(bp, mit, lesen, schreiben)   # /api/bp/modell/<pid>/bauteile/… – Bauteil-Checkliste
    modell_einst.routen(bp, _uid)
    baukasten.routen(bp, mit, lesen, schreiben)   # Gebäude-Baukasten: GET/PUT /api/bp/modell/<pid>/baukasten (20.11.2026)   # Änderungen je Bauteil, Zurücknehmen, Einstellungen A–F (20.11.2026)
    planstand.routen(bp, mit, lesen, schreiben)   # Planstände: einlesen mit Abgleich, ansehen, gelten lassen, aufräumen
    ki_fragen.routen(bp, mit, _uid)   # KI-Gespräch „Fragen“ – nur Ollama, eigene Daten und Preise
    rueckweg.routen(bp, mit, lesen)   # Rückweg: Vorschläge der Apps (Menge, Bauphase, Leistungen ohne Bauteil) annehmen, Schalter „ins Modell“
    elemente.routen(bp, mit, lesen, schreiben)   # Fenster und Türen einzeln: Türliste der Ausschreibung einmal ins Modell
    modell_hand.routen(bp, mit, lesen, schreiben)   # Räume, Fenster, Türen von Hand und vom Assistenten (17.11.2026)
    from . import modell_plus
    modell_plus.routen(bp, mit, lesen, schreiben)   # Ergänzen neben dem gültigen Plan (20.11.2026)
    anweisung.routen(bp, mit, lesen, _uid)   # Anweisungen an das Modell (Auswahl + Katalog, Vorschau, Rückgängig)
    from . import fragen_aenderung, uwert
    uwert.routen(bp, mit)   # /api/bp/modell/<pid>/uwerte – Schichten und Baustoffe für die U-Werte der Bauteile (bp/uwert.js)
    fragen_aenderung.routen(bp, mit, lesen)   # „Fragen und Antworten“ führt Änderungssätze aus (Kürzel tauschen, Anweisungen), mit Protokoll
    from . import raumbuch
    raumbuch.routen(bp, mit, lesen, schreiben)   # Raumbuch: Boden, Wand, Decke je Raum (raumbuch.py)
    from . import grundriss
    grundriss.routen(bp, mit, lesen)   # Grundriss je Geschoss: Flächen zwischen den Wänden, mit Raum oder frei (grundriss.py)
    verfeinern.routen(bp, mit)   # Verfeinern mit externer KI – nur mit Zusatzrecherche, nur Vorschläge über den Rückweg
    lernen.routen(bp, mit, lesen, _uid)   # Assistent lernt: Vorschläge aus ähnlichen Projekten, Liste „Gelerntes“

    @bp.get("/api/bp/modell/<int:pid>/vorschlag")
    def modell_vorschlag(pid):
        return mit(pid, lambda c, wer: jsonify(aus_vorhandenem(c, pid)))
