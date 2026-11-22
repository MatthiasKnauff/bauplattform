"""Bauteiltypen im Gebäudemodell (Konzept „Gebäudemodell neu“ GN-A, Etappe 1 – 22.11.2026).

Ein Typ (AW-01, DA-01, FE-01 …) trägt den Aufbau EINMAL für alle seine Bauteile; die Zeilen der Bauteilliste zeigen mit `typ` auf ihn.
Die Zeilen tragen den Aufbau weiter mit (vorlage, wahl, code, kurz, dicken, ausf) – so lesen Kosten, LV, Wärmeschutz und U-Werte
unverändert; der Typ ist die Stelle, an der er geändert wird, und gibt ihn an alle seine Zeilen weiter.

Maßnahme (neu, bleibt, erneuern …) bleibt je Zeile (F1-A): nur Zeilen mit einer bauenden Antwort (neu, erneuern, instandsetzen)
nehmen den Aufbau des Typs an und geben ihn weiter – „offen“, „bleibt“, „prüfen“ und „Abbruch“ behalten ihren eigenen (leer bzw.
Abbruch-Aufbau). Typen aus dem IFC: je Plan-Name und Dicke (F2-A) – gleicher Name, andere Dicke = eigener Typ.

L["typen"] = {Kürzel: {k, kg, art, name, sig, vorlage, wahl, code, kurz, dicken, ausf, eigen?}}

ableiten(L)            Zeilen ohne Typ bekommen einen (gleiches Merkmal UND gleicher Aufbau → vorhandener Typ), verwaiste Typen fallen weg
weitergeben(L, z)      Aufbau der Zeile wurde gewollt geändert → Typ und alle bauenden Zeilen desselben Typs
annehmen(L, z)         Zeile wird bauend (neue Antwort) → bekommt den Aufbau ihres Typs (False, wenn der Typ keinen hat)
neu_aus(L, k, zids)    „Neuer Typ aus diesem“: Kopie des Typs, nur diese Zeilen hängen um
zusammen(L, von, nach) alle Zeilen von „von“ bekommen Typ und Aufbau von „nach“
neu(L, kg, name)       „＋ Typ“ (ohne Bauteile, bleibt stehen)
umbenennen(L, k, name), zuweisen(L, k, zids)
routen()               PUT /api/bp/modell/<pid>/typen {aktion, …}
"""
import re

AUFBAU = ("vorlage", "wahl", "code", "kurz", "dicken", "ausf")
BAUEND = ("neu", "erneuern", "instandsetzen")
BEREICH = ("rohbau", "oeffnung", "raum")
# Kürzel je Kostengruppe (Bauteilart)
KUERZEL = {"331": "AW", "332": "AW", "341": "IW", "342": "IW", "322": "BP", "324": "BP", "325": "BP", "351": "DE", "352": "DE",
           "361": "DA", "362": "DA", "363": "DA", "364": "DA", "335": "AB", "336": "WI", "345": "WI", "353": "BO", "354": "DB", "344": "TI"}
NAME = {"AW": "Außenwand", "IW": "Innenwand", "BP": "Bodenplatte", "DE": "Decke", "DA": "Dach", "AB": "Außenwandbekleidung", "WI": "Wandbekleidung innen",
        "BO": "Bodenbelag", "DB": "Deckenbekleidung", "FE": "Fenster", "TA": "Außentür", "TI": "Innentür", "BT": "Bauteil"}


def _s(v, n):
    return str(v if v is not None else "").strip()[:n]


def vorsilbe(z):
    kg = str(z.get("kg") or "")[:3]
    if kg == "334":
        return "FE" if "Fenster" in (z.get("art") or "") else "TA"
    return KUERZEL.get(kg, "BT")


def merkmal(z):
    """Was Bauteile zu einem Typ macht: Plan-Name und Dicke (F2-A); Baukasten je Korb-Eintrag; Raumflächen je Art und nass/trocken."""
    if z.get("abgeleitet"):
        return "ab:" + z["id"]   # aus einer Anweisung / dem Raumbuch: eigener Aufbau je Raum – eigener Typ
    if z.get("korb"):
        return "k:" + z["korb"]
    if z.get("bereich") == "raum":
        return "r:" + str(z.get("kg")) + (":nass" if ":nass" in z["id"] else "")
    t = z["id"].split("|")
    return "|".join([vorsilbe(z)] + t[:6] + [z.get("name") if not z.get("name_hand") else ""])


def aufbau(z):
    return {k: z.get(k) for k in AUFBAU}


def _gleich(a, b):
    return all((a.get(k) or None) == (b.get(k) or None) for k in AUFBAU)


def _kopie(x):
    return {k: (list(v) if isinstance(v, list) else dict(v) if isinstance(v, dict) else v) for k, v in aufbau(x).items()}


def sauber(T):
    out = {}
    for k, t in (T.items() if isinstance(T, dict) else []):
        if not isinstance(t, dict) or not re.fullmatch(r"[A-ZÄÖÜ]{2}-\d{2,3}", str(k)):
            continue
        out[k] = {"k": k, "kg": _s(t.get("kg"), 3), "art": _s(t.get("art"), 60), "name": _s(t.get("name"), 120), "sig": _s(t.get("sig"), 400),
                  "vorlage": _s(t.get("vorlage"), 12), "wahl": [int(x) for x in (t.get("wahl") or [])[:12] if str(x).lstrip("-").isdigit()],
                  "code": _s(t.get("code"), 20), "kurz": _s(t.get("kurz"), 300),
                  "dicken": dict(t["dicken"]) if isinstance(t.get("dicken"), dict) else {}, "ausf": dict(t["ausf"]) if isinstance(t.get("ausf"), dict) else {},
                  **({"eigen": True} if t.get("eigen") else {})}
    return out


def _naechstes(T, vs):
    n = max([int(k.split("-")[1]) for k in T if k.startswith(vs + "-")] or [0]) + 1
    return f"{vs}-{n:02d}"


def _anlegen(T, z, sig):
    k = _naechstes(T, vorsilbe(z))
    T[k] = {"k": k, "kg": str(z.get("kg") or "")[:3], "art": z.get("art") or "", "name": "", "sig": sig, **_kopie(z)}
    return k


def mit_typ(L):
    return [z for z in L.get("zeilen") or [] if z.get("bereich") in BEREICH and not z.get("entfaellt")]


def ableiten(L):
    """Jede Bauteil-Zeile hat einen Typ. Erst die mit bauender Antwort (sie bestimmen den Aufbau), dann die übrigen (nur Merkmal)."""
    T = sauber(L.get("typen"))
    Z = mit_typ(L)
    for z in Z:
        if z.get("typ") and z["typ"] not in T:
            z.pop("typ", None)
    offen = [z for z in Z if not z.get("typ")]
    for z in sorted(offen, key=lambda z: z.get("status") not in BAUEND):
        sig = merkmal(z)
        bauend = z.get("status") in BAUEND
        k = next((k for k, t in T.items() if t["sig"] == sig and (not bauend or not t["vorlage"] or _gleich(t, z))), None)
        if k is None:
            k = _anlegen(T, z, sig)
            if not bauend:
                T[k].update({a: ([] if a == "wahl" else {} if a in ("dicken", "ausf") else "") for a in AUFBAU})
        elif bauend and not T[k]["vorlage"] and z.get("vorlage"):
            T[k].update(_kopie(z))
        z["typ"] = k
    benutzt = {z["typ"] for z in Z}
    T = {k: t for k, t in T.items() if k in benutzt or t.get("eigen")}
    if T:
        L["typen"] = T
    else:
        L.pop("typen", None)   # leere Liste bleibt wie leer()
    return L


def weitergeben(L, z):
    """Der Aufbau der Zeile wurde gewollt geändert (Auswahl, Dicke, Ausführung, Suche …): er gilt für den ganzen Typ."""
    k = z.get("typ")
    T = L.get("typen") or {}
    if not k or k not in T or z.get("status") not in BAUEND:
        return 0
    T[k].update(_kopie(z))
    n = 0
    for x in mit_typ(L):
        if x is not z and x.get("typ") == k and x.get("status") in BAUEND and not _gleich(x, z):
            x.update(_kopie(z))
            n += 1
    return n


def annehmen(L, z):
    """Neue bauende Antwort: Aufbau des Typs (wenn er einen hat)."""
    t = (L.get("typen") or {}).get(z.get("typ") or "")
    if not t or not t.get("vorlage"):
        return False
    z.update(_kopie(t))
    return True


def _zeilen(L, zids):
    S = set(zids or [])
    return [z for z in mit_typ(L) if z["id"] in S]


def neu_aus(L, k, zids, name=""):
    T = L.setdefault("typen", {})
    if k not in T:
        return None
    vs = k.split("-")[0]
    nk = _naechstes(T, vs)
    T[nk] = {**{a: v for a, v in T[k].items() if a != "eigen"}, "k": nk, "name": _s(name, 120) or (f"wie {k}"), "sig": "", "eigen": True}
    for z in _zeilen(L, zids):
        z["typ"] = nk
    return nk


def zusammen(L, von, nach):
    T = L.get("typen") or {}
    if von not in T or nach not in T or von == nach:
        return 0
    n = 0
    for z in mit_typ(L):
        if z.get("typ") == von:
            z["typ"] = nach
            if z.get("status") in BAUEND and T[nach].get("vorlage"):
                z.update(_kopie(T[nach]))
            n += 1
    T.pop(von, None)
    return n


def zuweisen(L, k, zids):
    T = L.get("typen") or {}
    if k not in T:
        return 0
    n = 0
    for z in _zeilen(L, zids):
        z["typ"] = k
        if z.get("status") in BAUEND and T[k].get("vorlage"):
            z.update(_kopie(T[k]))
        n += 1
    return n


def neu(L, kg, name=""):
    T = L.setdefault("typen", {})
    z = {"kg": _s(kg, 3), "art": "", "id": ""}
    k = _naechstes(T, vorsilbe(z))
    T[k] = {"k": k, "kg": z["kg"], "art": "", "name": _s(name, 120) or NAME.get(vorsilbe(z), "Bauteil"), "sig": "", "eigen": True,
            "vorlage": "", "wahl": [], "code": "", "kurz": "", "dicken": {}, "ausf": {}}
    return k


def umbenennen(L, k, name):
    T = L.get("typen") or {}
    if k in T:
        T[k]["name"] = _s(name, 120)
    return k in T


def routen(bp, mit, lesen_modell, schreiben_modell):
    from flask import jsonify, request
    from . import bauteilliste as B, planstand as P

    @bp.put("/api/bp/modell/<int:pid>/typen")
    def typen_aendern(pid):
        d = request.get_json(silent=True) or {}

        def tun(c, wer):
            m = lesen_modell(c, pid)["modell"]
            L = B.sauber(m.get("bauteilliste") or B.leer())
            a, k = d.get("aktion"), _s(d.get("typ"), 8)
            zids = [_s(x, 200) for x in (d.get("zeilen") or [])[:400]]
            if a == "neu_aus":
                r = neu_aus(L, k, zids, d.get("name"))
            elif a == "zusammen":
                r = zusammen(L, k, _s(d.get("nach"), 8))
            elif a == "zuweisen":
                r = zuweisen(L, k, zids)
            elif a == "neu":
                r = neu(L, d.get("kg"), d.get("name"))
            elif a == "name":
                r = umbenennen(L, k, d.get("name"))
            else:
                return jsonify(error="Unbekannte Aktion."), 400
            if not r:
                return jsonify(error="Typ nicht gefunden."), 404
            from . import anweisung
            anweisung.ableiten(c, L)
            if (L.get("quelle") or {}).get("planstand"):
                P._sichern(c, pid, L, wer)
            schreiben_modell(c, pid, P.anwenden(m, L), wer)
            return jsonify({**lesen_modell(c, pid), "typ": r if isinstance(r, str) else k})
        return mit(pid, tun)
