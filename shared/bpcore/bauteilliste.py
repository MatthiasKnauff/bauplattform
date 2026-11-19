"""Bauteil-Checkliste im Projektmodell (Entwurf „Bauteil-Checkliste“, entschieden am 16.11.2026).

Die Plattform liest das Gebäudemodell (IFC, z. B. aus Allplan) und legt je Gruppe gleicher Bauteile eine Zeile an: was passiert damit
(bleibt / instandsetzen / erneuern / neu / Abbruch), wird es berechnet, welcher Aufbau aus dem Bauteil-Baukasten. Dazu feste Fragen für das,
was nicht im Modell steht (Elektro, Heizung, Leitungen, Schadstoffe, Baustelle). Die Antworten stehen im Projektmodell (modell.bauteilliste)
– von dort nehmen Kosten, Ausschreibung und Termine sie über ihre Linie. „IFC mit Maßnahmen ausgeben“ schreibt sie ins IFC zurück:
Raum-, Fenster- und Türnummern, Status (Pset_*Common), Maßnahme, Aufbau und Element (Pset „Bauplattform_Massnahme“).
Bauteile aus dem Allplan-Katalog der Bauplattform bringen ihre Elementnummer mit (z. B. 331.03.005) – der Aufbau steht dann schon fest.

zeilen_aus_ifc(c, R, alt)   R = cadimport.ifc_lesen(…, bestand=True) → Liste mit den Antworten aus alt
setzen(c, liste, id, neu)   eine Antwort ändern (Status, berechnen, Vorlage, Wahl) – Element und Kurztext rechnet der Kern
ausgeben(raw, liste)        IFC-Text mit den Antworten
sauber(d)                   Form im Projektmodell
"""
import json
import re
from datetime import datetime

from . import rueckweg

STATUS = ("offen", "bleibt", "instandsetzen", "erneuern", "neu", "abbruch", "pruefen")
WORT = {"offen": "offen", "bleibt": "bleibt", "instandsetzen": "instandsetzen", "erneuern": "erneuern", "neu": "neu", "abbruch": "Abbruch", "pruefen": "prüfen lassen"}
IFC_STATUS = {"bleibt": "EXISTING", "instandsetzen": "EXISTING", "erneuern": "NEW", "neu": "NEW", "abbruch": "DEMOLISH"}
ALLPLAN_STATUS = {"EXISTING": "Bestand", "NEW": "Neubau", "DEMOLISH": "Abbruch"}   # Allplan-Attribut „Status“ (Text)
COMMON = {"IFCWALL": "Pset_WallCommon", "IFCWALLSTANDARDCASE": "Pset_WallCommon", "IFCWINDOW": "Pset_WindowCommon", "IFCDOOR": "Pset_DoorCommon",
          "IFCOPENINGELEMENT": "Pset_OpeningElementCommon", "IFCSLAB": "Pset_SlabCommon", "IFCROOF": "Pset_RoofCommon", "IFCCOLUMN": "Pset_ColumnCommon",
          "IFCBEAM": "Pset_BeamCommon", "IFCCOVERING": "Pset_CoveringCommon"}   # Status ins passende Pset der Objektart – nie Pset_WindowCommon an eine Öffnung
# Welche Antworten eine Zeile anbietet: Bestand (oder unbekannt) je Bereich; neue Bauteile (Neubau, im IFC als „neu“ markiert) nur „neu“
# „neu“ überall im Bestand (16.11.2026: „neu fehlte oft“ – z. B. neuer Belag, wo keiner war; neue Wand im Bestand)
ERLAUBT = {"rohbau": ("bleibt", "instandsetzen", "erneuern", "neu", "abbruch"), "oeffnung": ("bleibt", "instandsetzen", "erneuern", "neu", "abbruch"),
           "raum": ("bleibt", "instandsetzen", "erneuern", "neu"), "ausbau": ("bleibt", "erneuern", "neu"), "frage": ("bleibt", "erneuern", "neu"),
           "hand": ("neu", "erneuern", "instandsetzen", "abbruch"), "leistung": ("neu", "bleibt")}


def erlaubt(z):
    if z.get("zustand") == "neu":
        return ["neu"]
    L = list(ERLAUBT.get(z.get("bereich"), ERLAUBT["rohbau"]))
    return L + ["pruefen"] if z.get("id") == "frage:schadstoffe" else L


def bauart(m):
    """Bauart des Projekts aus dem Assistenten: „neubau“ (nur Neubau), „bestand“ (nur Maßnahmen im Bestand), „gemischt“ (Neubau + Bestand), „“ unbekannt.
    Typ in Ebenen „k:ef:an.um:da:d“ (Maßnahmen im 3. Teil, Neubau = nb) oder ein alter Gebäudetyp (neubau_efh …)."""
    t = str(((m or {}).get("assistent") or {}).get("type") or "")
    if t.startswith("k:"):
        mass = {x for x in (t.split(":")[2] if t.count(":") >= 2 else "").split(".") if x}
        return "" if not mass else "neubau" if mass <= {"nb"} else "gemischt" if "nb" in mass else "bestand"
    return "neubau" if t.startswith("neubau") else "bestand" if t else ""
BEREICHE = (("rohbau", "Rohbau"), ("oeffnung", "Öffnungen"), ("raum", "Räume (Oberflächen)"), ("ausbau", "Küche und Bad"), ("frage", "Nicht im Modell – bitte beantworten"), ("hand", "Von Hand"),
            ("leistung", "Leistungen ohne Bauteil"))   # leistung: aus den Apps zurückgegeben (rueckweg.py), z. B. eine Leistung, die nur der Bauzeitenplan kennt
# Was im Modell nicht gezeichnet ist: (id, Name, KG, Vorlage, Einheit, Menge aus …)
FRAGEN = (("elektro", "Elektroinstallation", "444", "444.03", "m²", "wf"), ("heizung", "Heizkörper und Heizleitungen", "423", "423.09", "St", "raeume"),
          ("leitungen", "Wasser- und Abwasserleitungen bis zum Strang", "412", "412.01", "m", "wf10"),
          ("schadstoffe", "Schadstoffe (Asbest in Belag/Kleber, PAK, KMF)", "394", "394.05", "m²", "wf"),
          ("baustelle", "Baustelleneinrichtung, Schutz im Bestand, Entsorgung", "393", "393.04", "m²", "wf"))
NASS = re.compile(r"\b(bad|wc|dusch|sanit|nass)", re.I)
KUECHE = re.compile(r"(küche|kueche|kochen|teeküche)", re.I)


from . import daemmdicke, din276, kuerzel, schicht
from .wert import kurz as _s


def _z(v, lo=0.0, hi=1e9):
    try:
        x = float(str(v).replace(",", "."))
    except (TypeError, ValueError):
        return 0.0
    return round(min(hi, max(lo, x)), 3)


def leer():
    return {"quelle": {}, "zeilen": [], "raeume": [], "elemente": [], "anweisungen": [], "raumbuch": {}}


def _kuerzel_sauber(z):   # Kürzel aus dem Plan (18.11.2026): Text, wie verstanden, Vorschlag, bestätigt, Himmelsrichtung
    if not z.get("kuerzel"):
        return {}
    e = z.get("erkannt") if isinstance(z.get("erkannt"), dict) else {}
    return {"kuerzel": _s(z["kuerzel"], 200), "kz_vorlage": _s(z.get("kz_vorlage"), 12), "kz_wahl": [int(_z(x, 0, 99)) for x in (z.get("kz_wahl") or [])[:12]],
            "bestaetigt": bool(z.get("bestaetigt", True)), "dicke_plan": _z(z.get("dicke_plan"), 0, 5),
            "erkannt": {"stufe": e.get("stufe") if e.get("stufe") in ("offen", "teils", "bestaetigen") else "offen", "frage": _s(e.get("frage"), 120), "dicke": _s(e.get("dicke"), 160),
                        "waerme": bool(e.get("waerme")), "gelernt": int(_z(e.get("gelernt"), 0, 1e6)),
                        "folge": [[_s(x, 60) for x in f[:3]] for f in (e.get("folge") or [])[:30] if isinstance(f, (list, tuple)) and len(f) >= 3]},
            "richtung": {k: _z(v) for k, v in (z.get("richtung") or {}).items() if k in ("N", "O", "S", "W")}}


def _ausbau_sauber(v):   # Raumausbau aus dem Plan je Raum (F1): {nr: {boden|wand|decke|leiste: {text, vorlage, menge, folge, waerme}}}
    out = {}
    for nr, T in list((v if isinstance(v, dict) else {}).items())[:2000]:
        if not isinstance(T, dict):
            continue
        x = {}
        for teil in ("boden", "wand", "decke", "leiste"):
            e = T.get(teil)
            if isinstance(e, dict) and _s(e.get("text"), 200):
                x[teil] = {"text": _s(e["text"], 200), "vorlage": _s(e.get("vorlage"), 12), "menge": _z(e.get("menge")), "waerme": bool(e.get("waerme")),
                           "folge": [[_s(y, 60) for y in f[:3]] for f in (e.get("folge") or [])[:20] if isinstance(f, (list, tuple)) and len(f) >= 3]}
        if x:
            out[_s(nr, 20)] = x
    return out


def _plan_sauber(z):
    """Was der Plan zur Zeile sagt (19.11.2026): Einordnung neben dem Allplan-Namen, außen/innen, Schichten mit Allplan-Material."""
    out = {}
    if _s(z.get("einordnung"), 120):
        out["einordnung"] = _s(z["einordnung"], 120)
    if isinstance(z.get("aussen"), bool):
        out["aussen"] = z["aussen"]
    if z.get("name_hand"):
        out["name_hand"] = True
    L = [[_s(x[0], 80), round(_z(x[1], 0, 5), 4)] for x in (z.get("lagen") or [])[:20] if isinstance(x, (list, tuple)) and len(x) >= 2 and _s(x[0], 80)]
    if L:
        out["lagen"] = L
    return out


def sauber(d):
    d = d if isinstance(d, dict) else {}
    q = d.get("quelle") if isinstance(d.get("quelle"), dict) else {}
    out = leer()
    out["quelle"] = {k: v for k, v in {"datei": _s(q.get("datei"), 200), "gelesen": _s(q.get("gelesen"), 20), "programm": _s(q.get("programm"), 80),
                                       "objekte": int(_z(q.get("objekte"))), "planstand": int(_z(q.get("planstand"))), "name": _s(q.get("name"), 120),
                                       "art": _s(q.get("art"), 8), "pfad": _s(q.get("pfad"), 500)}.items() if v}   # leer bleibt leer (wie leer())
    for z in (d.get("zeilen") if isinstance(d.get("zeilen"), list) else [])[:400]:
        if not isinstance(z, dict) or not _s(z.get("id"), 200):
            continue
        st = z.get("status") if z.get("status") in STATUS else "offen"
        out["zeilen"].append({"id": _s(z.get("id"), 200), "bereich": z.get("bereich") if z.get("bereich") in dict(BEREICHE) else "rohbau",
                              "art": _s(z.get("art"), 60), "kg": _s(z.get("kg"), 3), "name": _s(z.get("name"), 200), "material": _s(z.get("material"), 200),
                              "menge": _z(z.get("menge")), "einheit": _s(z.get("einheit"), 12), "anzahl": int(_z(z.get("anzahl"), 0, 1e6)),
                              "zustand": _s(z.get("zustand"), 12), "status": st, "berechnen": bool(z.get("berechnen")),
                              "vorlage": _s(z.get("vorlage"), 12), "wahl": [int(_z(x, 0, 99)) for x in (z.get("wahl") or [])[:12]],
                              "dicken": daemmdicke.sauber(z.get("dicken")),   # eigene Stärke je Schicht (cm, schicht.py / daemmdicke.py)
                              "ausf": schicht.ausf_sauber(z.get("ausf")),   # eigene Ausführung je Schicht (Betongüte, WLS …, schicht.py)
                              **({"uw": round(_z(z["uw"], 0.3, 6), 2)} if z.get("uw") and 0.3 <= _z(z["uw"]) <= 6 else {}),   # Uw laut Angebot (U-Werte D1)
                              "code": _s(z.get("code"), 20), "kurz": _s(z.get("kurz"), 300), "quelle": _s(z.get("quelle"), 12),
                              "ids": [int(x) for x in (z.get("ids") or [])[:5000] if str(x).isdigit()], "nummern": [_s(x, 12) for x in (z.get("nummern") or [])[:500]],
                              "hinweis": _s(z.get("hinweis"), 300), "entfaellt": bool(z.get("entfaellt")),
                              "phase": _s(z.get("phase"), 12), "herkunft": _s(z.get("herkunft"), 120), "teil": _s(z.get("teil"), 20),   # Gebäudeteil (18.11.2026)
                              # Teil 2 (16.11.2026): Räume einer Raum-Zeile; abgeleitet = Zeile aus einer Anweisung (Basis-Zeile), verteilt = so viele Mitglieder
                              # stehen in abgeleiteten Zeilen; menge_basis/anzahl_basis = Menge und Anzahl der Basis-Zeile vor dem Aufteilen
                              "mitglieder": [_s(x, 20) for x in (z.get("mitglieder") or [])[:2000]], "abgeleitet": _s(z.get("abgeleitet"), 200),
                              "anweisung": _s(z.get("anweisung"), 20), "verteilt": int(_z(z.get("verteilt"), 0, 1e6)),
                              **({"menge_basis": _z(z["menge_basis"]), "anzahl_basis": int(_z(z.get("anzahl_basis"), 0, 1e6))} if z.get("menge_basis") is not None else {}),
                              **_kuerzel_sauber(z), **_plan_sauber(z)})
        z_ = out["zeilen"][-1]
        z_["erlaubt"] = erlaubt(z_)
        z_["bauphase"] = rueckweg.phase_von(z_)   # Bauphase (eigene aus dem Bauzeitenplan oder aus Kostengruppe und Antwort) – Termine dazu im Modell (termine)
        if z_["status"] not in z_["erlaubt"] + ["offen"]:
            z_["status"] = "offen"
    from . import anweisung, elemente
    out["elemente"] = elemente.sauber(d.get("elemente"))
    out["anweisungen"] = anweisung.sauber(d.get("anweisungen"))
    from . import raumbuch
    out["raumbuch"] = raumbuch.sauber(d.get("raumbuch"))   # Boden, Wand, Decke je Raum (raumbuch.py)
    if d.get("raumausbau"):
        out["raumausbau"] = _ausbau_sauber(d.get("raumausbau"))   # Raumausbau aus dem Plan (Vorschlag fürs Raumbuch)
    for r in (d.get("raeume") if isinstance(d.get("raeume"), list) else [])[:2000]:
        if isinstance(r, dict):
            out["raeume"].append({"id": int(_z(r.get("id"), 0, 1e9)), "nr": _s(r.get("nr"), 20), "name": _s(r.get("name"), 200), "flaeche": _z(r.get("flaeche")),
                                  "umfang": _z(r.get("umfang")), "hoehe": _z(r.get("hoehe"), 0, 20), "geschoss": _s(r.get("geschoss"), 40),
                                  **({"teil": _s(r.get("teil"), 20)} if r.get("teil") else {}), **_ermittelt(r)})
    return out


def _ermittelt(r):   # aus den Wänden ermittelter Raum (bpcore/raumsuche.py): Umriss und Höhe für den Weg zurück ins IFC
    U = r.get("umriss")
    if not r.get("ermittelt") or not isinstance(U, list):
        return {}
    U = [[_z(p[0], -1e6, 1e6), _z(p[1], -1e6, 1e6)] for p in U[:400] if isinstance(p, (list, tuple)) and len(p) == 2]
    return {"ermittelt": True, "z": _z(r.get("z"), -1000, 1000), "umriss": U} if len(U) >= 3 else {}


# ------------------------------------------------------------------ Baukasten
def _vorlage(c, vid):
    r = c.execute("SELECT id, kg, name, einheit, daten FROM pdb_vorlage WHERE id=?", (str(vid),)).fetchone()
    if not r:
        return None
    D = json.loads(r["daten"] or "{}")
    return {"id": r["id"], "kg": r["kg"], "name": r["name"], "einheit": r["einheit"], "schichten": D.get("schichten") or []}


def _std(V):
    return [next((i for i, o in enumerate(s["optionen"]) if o.get("std")), 0) for s in V["schichten"]]


def aufbau_setzen(c, z, vid, wahl=None, dicken=None, ausf=None):
    """Vorlage + Wahl → Element (wenn es die Kombination als Standardelement gibt) und Kurztext. dicken = {Schicht-Nr: cm} eigene Stärke,
    ausf = {Schicht-Nr: Wert} eigene Ausführung (schicht.py; gleich der Option = keine eigene). Ohne Angabe bleiben beide bei gleicher Vorlage."""
    V = _vorlage(c, vid) if vid else None
    if not V:
        z.update(vorlage="", wahl=[], code="", kurz="", dicken={}, ausf={})
        return z
    w = [int(x) for x in (wahl if wahl is not None else _std(V))][:len(V["schichten"])]
    w += _std(V)[len(w):]
    w = [max(0, min(i, len(s["optionen"]) - 1)) for i, s in zip(w, V["schichten"])]
    gleich = z.get("vorlage") == V["id"]
    dk = daemmdicke.sauber(dicken if dicken is not None else (z.get("dicken") if gleich else {}))
    au = schicht.ausf_sauber(ausf if ausf is not None else (z.get("ausf") if gleich else {}))
    O = schicht.optionen(c, V["schichten"]) if dk or au else {}
    oo = lambda k: schicht.mat(O, int(k), w[int(k)]) if int(k) < len(w) else (None, {})   # noqa: E731 – gewählte Option der Schicht, Angaben ihres Materials
    dk = {k: d for k, d in dk.items() if oo(k)[0] and oo(k)[0]["dicke"] != d}
    au = {k: a for k, a in au.items() if oo(k)[0] and oo(k)[1].get("ausf") and oo(k)[0]["ausf"] != a}
    for k, a in au.items():   # vom Büro eingetragene Ausführung: gemerkt für die nächste Auswahl (MA-B1)
        if a not in oo(k)[1]["werte"]:
            schicht.lernen(c, oo(k)[1]["ausf"], a)
    e = None if dk or au else c.execute("SELECT code FROM pdb_position WHERE katalog='gk3e' AND hinweis=?", (f"Aufbau {V['id']}:{'.'.join(map(str, w))}",)).fetchone()
    ks = [schicht.kurz(s["optionen"][i]["k"], oo(n)[0]["mat"], dk.get(str(n)) or oo(n)[0]["dicke"], au.get(str(n)) or oo(n)[0]["ausf"]) if (str(n) in dk or str(n) in au) else s["optionen"][i].get("k")
          for n, (s, i) in enumerate(zip(V["schichten"], w)) if s["optionen"][i].get("k")]
    z.update(vorlage=V["id"], wahl=w, code=e["code"] if e else "", kurz=", ".join([V["name"]] + ks)[:300], dicken=dk, ausf=au)
    if z.get("bereich") == "hand":   # von Hand: KG und Einheit kommen vom Aufbau
        z.update(kg=V["kg"], einheit=V["einheit"])
    return z


def _aus_code(c, code):
    r = c.execute("SELECT hinweis FROM pdb_position WHERE katalog='gk3e' AND code=?", (code,)).fetchone()
    m = re.match(r"Aufbau ([\d.]+?):([\d.]*)$", r["hinweis"] if r and r["hinweis"] else "")
    return (m.group(1), [int(x) for x in m.group(2).split(".") if x != ""]) if m else None


def vorschlag(z, status):
    """Passende Vorlage zur Antwort – der Mensch kann sie ändern."""
    art, kg, b = z["art"].lower(), z["kg"], z["bereich"]
    if z.get("kz_vorlage") and status in ("neu", "erneuern"):   # aus dem Kürzel im Plan (kuerzel.py)
        return z["kz_vorlage"]
    if status in ("offen", "bleibt", "pruefen"):
        return "394.05" if z["id"] == "frage:schadstoffe" and status == "pruefen" else ""
    if b == "frage":
        return dict((f[0], f[3]) for f in FRAGEN).get(z["id"][6:], "")
    if status == "abbruch":
        return {"wand": "394.01", "decke": "394.02"}.get(art.split()[0], "394.09" if "öffnung" in art or art in ("fenster", "tür") else "")
    if art.startswith("wand"):
        return ("331.12" if z["kg"] in ("331", "332") else "341.07") if status == "instandsetzen" else ""
    if "fenster" in art:
        return {"erneuern": "334.15", "instandsetzen": "334.16", "neu": "334.01"}.get(status, "")
    if "tür" in art:
        if kg == "334":
            return "334.10"
        return {"erneuern": "344.13", "instandsetzen": "344.13", "neu": "344.01"}.get(status, "")
    if b == "raum":
        nass = z["id"].endswith(":nass")
        neu_ = status == "neu"   # neu: Neubau-Aufbau (wie der Raumbuch-Vorschlag); erneuern/instandsetzen: Bestand
        if z["id"].startswith("raum:boden"):
            return ("353.09" if nass else "353.02") if neu_ else ("353.09" if nass else "353.10")
        if z["id"].startswith("raum:wand"):
            return ("345.02" if nass else "345.01") if neu_ else ("345.10" if nass else "345.09")
        if z["id"].startswith("raum:decke"):
            return "354.09" if status == "instandsetzen" else "354.01"
    if b == "ausbau":
        return "412.15" if z["id"] == "ausbau:bad" else "412.13"
    return ""


# ------------------------------------------------------------------ Liste aus dem Modell
def _zeile(**k):
    z = {"id": "", "bereich": "rohbau", "art": "", "kg": "", "name": "", "material": "", "menge": 0.0, "einheit": "", "anzahl": 0, "zustand": "",
         "status": "offen", "berechnen": False, "vorlage": "", "wahl": [], "code": "", "kurz": "", "quelle": "ifc", "ids": [], "nummern": [], "hinweis": "", "entfaellt": False, "phase": "", "herkunft": "",
         "mitglieder": [], "abgeleitet": "", "anweisung": "", "verteilt": 0, "teil": ""}
    z.update(k)
    return z


def fragen_zeilen(raeume, neubau):
    """Was im Modell nicht gezeichnet ist (Elektro, Heizung, Leitungen, Schadstoffe, Baustelle) – mit Plan und ohne (Standardbaum, 17.11.2026)."""
    wf, Z = round(sum(r["flaeche"] for r in raeume), 2), []
    for fid, nm, kg, _, eh, q in FRAGEN:
        if neubau and fid == "schadstoffe":
            continue   # im Neubau gibt es keinen Bestand, der belastet sein könnte
        if neubau and fid == "baustelle":
            nm = "Baustelleneinrichtung und Entsorgung"
        m = {"wf": wf, "raeume": max(1, len([r for r in raeume if not NASS.search(r["name"])])), "wf10": round(wf / 10, 1)}[q]
        Z.append(_zeile(id=f"frage:{fid}", bereich="frage", art=nm, kg=kg, name=nm, menge=m, einheit=eh, zustand="neu" if neubau else "frage", quelle="frage",
                        status="neu" if neubau else "offen",
                        hinweis=("Menge aus der Wohnfläche geschätzt" if q != "raeume" else "Anzahl aus den Räumen geschätzt") if raeume else "Menge kommt mit Fläche oder Räumen"))
    return Z


def zeilen_aus_ifc(c, R, alt=None, art=""):
    """R = cadimport.ifc_lesen(raw, bestand=True). Antworten aus alt (gleiche id) bleiben; Mengen und Objekte kommen neu aus dem Modell.
    art = bauart(modell): Bei „neubau“ ist alles neu, was das IFC nicht anders markiert (kein „erneuern“ oder „bleibt“ im Neubau);
    bei Bestand oder unbekannt fragt die Liste je Bauteil."""
    neubau = art == "neubau"
    rz = "neu" if neubau else "bestand"   # Räume, Küche/Bad, Fragen
    A = {z["id"]: z for z in ((alt or {}).get("zeilen") or [])}
    Z = []
    oeff_fl = {"aussen": 0.0, "innen": 0.0}
    for g in R["bauteile"]:
        zu = g.get("zustand") or ("neu" if neubau else "")
        if zu == "leer" and neubau:
            zu = "neu"
        art = g["art"]
        ber = "oeffnung" if g["kg"] in ("334", "344") else "rohbau"
        zid = "|".join(str(x) for x in (g["kg"], art, g.get("material") or "", g.get("dicke") or 0, g.get("einheit"), g.get("code") or (g.get("vorlage") if g.get("geschaetzt") else "") or "", zu))   # geschätzt: andere Bauweise = neue Zeile
        if g.get("teil"):   # Gebäudeteil (GT-C1): eigene Zeile je Teil
            zid += "|t:" + g["teil"]
        KZ = kuerzel.zerlegen(g["kuerzel"], art, g.get("aussen")) if g.get("kuerzel") else None
        if KZ and g.get("kuerzel_name"):   # Name als Kürzel: gleiche Bauteile, gleicher Name – eigene Zeile je Name
            zid += "|" + KZ["norm"]
        eig = g["name"] + (f" ({g['material']})" if g.get("material") and ber == "rohbau" else "")
        z = _zeile(id=zid, bereich=ber, art=art, kg=g["kg"], name=g.get("planname") or eig,   # Allplan-Name bleibt der Name, unsere Einordnung klein dazu (A1)
                   einordnung=g["name"] if g.get("planname") else "", **({"aussen": g["ext"]} if "ext" in g else {}),
                   lagen=[[str(n)[:80], round(float(d or 0), 4)] for n, d in (g.get("lagen") or [])[:20] if n and d],   # Schichten mit dem Allplan-Material (B1)
                   material=g.get("material") or "", menge=g["menge"], einheit=g["einheit"], anzahl=g["anzahl"], zustand=zu, ids=list(g.get("ids") or []),
                   status="abbruch" if zu == "abbruch" else "neu" if g.get("code") or zu == "neu" else "offen",   # beantworten lassen – klar sind Katalogbauteile und neue Teile
                   hinweis=g.get("hinweis") or "", teil=g.get("teil") or "")   # z. B. „aus dem DXF geschätzt“
        if KZ and ber != "oeffnung":   # Kürzel aus dem Plan (nicht bei Fenstern/Türen – der Name ist dort der Typ; Ausführung über die Türliste): wie verstanden, Vorschlag aus dem Baukasten (bzw. Gelerntes), „bitte bestätigen“ (C1)
            z.update(kuerzel=g["kuerzel"], dicke_plan=g.get("dicke") or 0, richtung=g.get("richtung") or {}, bestaetigt=True,
                     erkannt={"stufe": kuerzel.stufe(KZ), "folge": kuerzel.lesbar(KZ), "frage": KZ["frage"], "waerme": KZ["waerme"]})
            if not g.get("code"):
                gl = kuerzel.gelernt(c, KZ["norm"])
                vid, wahl, dh = (gl["vorlage"], gl["wahl"], "") if gl else kuerzel.vorschlag(c, KZ, g["kg"], g.get("dicke") or 0, innen_mit=not R.get("raeume"))
                if dh:
                    z["erkannt"]["dicke"] = dh
                if gl:
                    z["erkannt"]["gelernt"] = gl["n"]
                if vid:
                    z.update(kz_vorlage=vid, kz_wahl=wahl)
        if ber == "oeffnung":
            fl = g.get("flaeche") or (g["menge"] if g["einheit"] == "m²" else 0)
            oeff_fl["aussen" if g.get("aussen") else "innen"] += fl
            if g.get("zustand") == "leer":
                z["name"] = f"{'Fenster' if 'Fenster' in art else 'Tür'}{' außen' if g.get('aussen') and 'Tür' in art else ''} – Öffnung ohne Bauteil im Modell"
                z["hinweis"] = "Im Modell ist nur die Öffnung gezeichnet."
        if g.get("code"):
            a = _aus_code(c, g["code"])
            if a:
                aufbau_setzen(c, z, a[0], a[1])
                z.update(quelle="allplan", hinweis=f"Aus dem Allplan-Katalog der Bauplattform ({g['code']}).")
        elif g.get("geschaetzt"):   # Assistent ohne Plan: Menge geschätzt, Aufbau nach der gewählten Bauweise (Preisspanne aus den Baudaten)
            z["quelle"] = "schaetzung"
            if g.get("vorlage") and z["status"] == "neu":
                aufbau_setzen(c, z, g["vorlage"])
        Z.append(z)
    # Fenster und Türen nummerieren (in der Reihenfolge der Objekte)
    nf = nt = 0
    for z in sorted([z for z in Z if z["bereich"] == "oeffnung"], key=lambda z: (z["ids"] or [0])[0]):
        N = []
        for _ in z["ids"]:
            if "Fenster" in z["art"]:
                nf += 1; N.append(f"F {nf:02d}")
            else:
                nt += 1; N.append(f"T {nt:02d}")
        z["nummern"] = N
    # Räume: Nummern (fehlt sie, fortlaufend), Oberflächen je Gruppe – Nassräume getrennt
    raeume = []
    for k, r in enumerate(sorted(R["raeume"], key=lambda r: (r.get("geschoss") or "", r.get("nr") or "~", -(r.get("flaeche") or 0)))):
        nr = r.get("nr") if re.search(r"\d", r.get("nr") or "") else ""   # „Raum Nr.“ aus dem Raumstempel ist keine Nummer (Planstände vor dem 16.11.2026)
        raeume.append({"id": r.get("id") or 0, "nr": nr or f"0.{k + 1:02d}", "name": r.get("name") or "Raum", "flaeche": r.get("flaeche") or 0,
                       "umfang": r.get("umfang") or 0, "hoehe": r.get("hoehe") or 2.5, "geschoss": r.get("geschoss") or "",
                       **({"teil": r["teil"]} if r.get("teil") else {}), **({"ermittelt": True, "z": r.get("z") or 0, "umriss": r["umriss"]} if r.get("ermittelt") and r.get("umriss") else {})})
    brutto = sum(r["umfang"] * r["hoehe"] for r in raeume) or 1
    abzug = min(0.5, (oeff_fl["aussen"] + 2 * oeff_fl["innen"]) / brutto)   # Öffnungen anteilig abziehen (Innentüren zählen zweimal)
    TK = sorted({r.get("teil") or "" for r in raeume}) if len({r.get("teil") or "" for r in raeume}) > 1 else [None]   # Räume mehrerer Gebäudeteile: je Teil eigene Zeilen
    for tk, nass in ((tk, nass) for tk in TK for nass in (False, True)):
        RR = [r for r in raeume if bool(NASS.search(r["name"])) == nass and (tk is None or (r.get("teil") or "") == tk)]
        if not RR:
            continue
        nr = ", ".join(r["nr"] for r in RR) if len(RR) <= 8 else f"{len(RR)} Räume"   # viele Räume: nur die Zahl, die Liste steht unter „Objekte“
        t = " – Nassräume" if nass else ""
        for teil, nm, m in (("boden", "Böden", sum(r["flaeche"] for r in RR)), ("wand", "Wände", sum(r["umfang"] * r["hoehe"] for r in RR) * (1 - abzug)),
                            ("decke", "Decken", sum(r["flaeche"] for r in RR))):
            Z.append(_zeile(id=f"raum:{teil}:{'nass' if nass else 'trocken'}" + (f":{tk}" if tk else ""), teil=tk or "", bereich="raum", art=nm, kg={"boden": "353", "wand": "345", "decke": "354"}[teil],
                            name=f"{nm}{t} ({nr})", menge=round(m, 2), einheit="m²", anzahl=len(RR), zustand=rz, status="neu" if neubau else "offen", quelle="raum", ids=[r["id"] for r in RR if r["id"]],
                            mitglieder=[r["nr"] for r in RR]))
    nb = [r for r in raeume if NASS.search(r["name"])]
    kue = [r for r in raeume if KUECHE.search(r["name"])]
    Z.append(_zeile(id="ausbau:bad", bereich="ausbau", art="Bad", kg="412", name="Bad: Sanitärobjekte und Installation" + (f" ({', '.join(r['nr'] for r in nb)})" if nb else ""),
                    menge=max(1, len(nb)), einheit="St", anzahl=len(nb), zustand=rz, status="neu" if neubau else "offen", quelle="raum", ids=[r["id"] for r in nb if r["id"]]))
    Z.append(_zeile(id="ausbau:kueche", bereich="ausbau", art="Küche", kg="412", name="Küche: Anschluss Spüle, Fliesenspiegel" + (f" ({', '.join(r['nr'] for r in kue)})" if kue else ""),
                    menge=1, einheit="St", anzahl=len(kue), zustand=rz, status="neu" if neubau else "offen", quelle="raum", ids=[r["id"] for r in kue if r["id"]]))
    Z += fragen_zeilen(raeume, neubau)
    Z += [dict(z) for z in A.values() if z.get("bereich") == "hand"]   # Zeilen von Hand bleiben, wie sie sind
    for z in Z:   # Antworten von vorher behalten – soweit sie zur Zeile passen
        a = A.get(z["id"])
        if a and (a.get("status") in erlaubt(z) or a.get("status") == "offen"):
            for k in ("status", "berechnen", "vorlage", "wahl", "code", "kurz"):
                z[k] = a.get(k, z[k])
            if a.get("name_hand"):   # von Hand umbenannt geht dem Plan vor
                z["name"], z["name_hand"] = a["name"], True
            if z.get("kuerzel") and "bestaetigt" in a:
                z["bestaetigt"] = a["bestaetigt"]
        else:
            z["berechnen"] = z["status"] not in ("offen", "bleibt", "pruefen")
            if z["status"] == "neu" and not z["vorlage"] and z["quelle"] != "allplan":
                aufbau_setzen(c, z, vorschlag(z, "neu"))
                _kz_wahl(c, z)
        z["erlaubt"] = erlaubt(z)
    from . import elemente
    out = {"zeilen": Z, "raeume": raeume, "elemente": elemente.aus_ifc(R.get("elemente") or [], Z, raeume)}
    RA = raumausbau(c, R.get("ausbau") or [], raeume)
    if RA:
        out["raumausbau"] = RA
        fbh = [nr for nr, x in RA.items() if (x.get("boden") or {}).get("waerme")]
        if fbh:
            zb = next((z for z in Z if z["id"].startswith("raum:boden")), None)
            if zb:
                zb["hinweis"] = (zb["hinweis"] + " " if zb["hinweis"] else "") + f"Fußbodenheizung im Plan ({', '.join(fbh[:8])}) – gehört zur Heizung (KG 423), nicht zum Belag."
    return out


def _kz_wahl(c, z):
    """Vorschlag aus dem Kürzel: mit der Wahl der Schichten (Kern-Dicke aus dem Plan), noch zu bestätigen (C1)."""
    if z.get("kz_vorlage") and z.get("vorlage") == z["kz_vorlage"] and z.get("kz_wahl"):
        aufbau_setzen(c, z, z["vorlage"], z["kz_wahl"])
        if z["erkannt"]["stufe"] != "offen" or z["erkannt"].get("gelernt"):
            z["bestaetigt"] = False


def raumausbau(c, A, raeume):
    """Raumausbau aus dem Plan (Allplan: Boden-, Decken-, Seitenfläche, Leiste je Raum) → {nr: {teil: {text, vorlage, menge, folge, waerme}}}.
    Die Vorlage ist der Vorschlag fürs Raumbuch (raumbuch.vorschlag) – der Plan geht dem Vorschlag nach Raumart vor (F1)."""
    from . import anweisung
    nr_von = {r["id"]: r["nr"] for r in raeume if r.get("id")}
    KG = {"boden": "353", "wand": "345", "decke": "354"}
    out, kat = {}, {}
    for a in A:
        nr = nr_von.get(a.get("raum"))
        if not nr or not a.get("text"):
            continue
        x = out.setdefault(nr, {})
        KZ = kuerzel.zerlegen(a["text"], "Bekleidung")
        e = {"text": a["text"], "menge": a.get("menge") or 0, "folge": kuerzel.lesbar(KZ), "waerme": KZ["waerme"], "vorlage": ""}
        if a["teil"] in KG:
            w = " ".join(kuerzel._such(k) for k in KZ["innen_s"] + KZ["beide_s"] + KZ["aussen_s"] if kuerzel._such(k))
            if w:
                if (a["teil"], w) not in kat:
                    T = anweisung.katalog(c, w, [KG[a["teil"]]])
                    kat[(a["teil"], w)] = T[0]["vorlage"] if T else ""
                e["vorlage"] = kat[(a["teil"], w)]
        if a["teil"] in x and a["teil"] != "leiste":
            x[a["teil"]]["menge"] += e["menge"]
        else:
            x[a["teil"]] = e
    return out


def setzen(c, liste, zid, neu):
    """Eine Antwort ändern. neu: {status?, berechnen?, vorlage?, wahl?}. Bei neuem Status ohne eigene Vorlage schlägt der Kern eine vor."""
    z = next((x for x in liste["zeilen"] if x["id"] == zid), None)
    if z is None:
        return None
    if "status" in neu and neu["status"] in erlaubt(z) and neu["status"] != z["status"]:
        z["status"] = neu["status"]
        z["berechnen"] = z["status"] not in ("offen", "bleibt", "pruefen")
        if "vorlage" not in neu and z["quelle"] != "allplan":
            aufbau_setzen(c, z, vorschlag(z, z["status"]))
    if z.get("kuerzel"):
        if "status" in neu and "vorlage" not in neu and z.get("vorlage") == z.get("kz_vorlage"):   # neue Antwort: Vorschlag aus dem Kürzel mit seiner Wahl
            _kz_wahl(c, z)
        if neu.get("bestaetigt"):   # „Bestätigen“: gilt, und das Büro merkt es sich für dieses Kürzel (D1)
            z["bestaetigt"] = True
            kuerzel.lernen(c, kuerzel.normal(z["kuerzel"]), z.get("vorlage"), z.get("wahl"))
        if neu.get("wie"):   # Aufbau wie eine andere Zeile (gleiche Wände, verschiedene Namen)
            o = next((x for x in liste["zeilen"] if x["id"] == neu["wie"] and x.get("vorlage")), None)
            if o:
                aufbau_setzen(c, z, o["vorlage"], o.get("wahl"), o.get("dicken"), o.get("ausf"))
                z.update(status=o["status"] if o["status"] in erlaubt(z) else z["status"], berechnen=o.get("berechnen", z["berechnen"]), bestaetigt=True)
    if "berechnen" in neu:
        z["berechnen"] = bool(neu["berechnen"])
    if "uw" in neu:   # Fenster/Türen: Uw laut Angebot, leer = Wert der Position (bpcore/uwert.py)
        if neu["uw"] and 0.3 <= _z(neu["uw"]) <= 6:
            z["uw"] = round(_z(neu["uw"]), 2)
        else:
            z.pop("uw", None)
    if z["bereich"] in ("hand", "leistung"):   # nur Zeilen von Hand und Leistungen ohne Bauteil: Name und Menge hier, weg mit „loeschen“
        if neu.get("loeschen"):
            liste["zeilen"].remove(z)
            return z
        if "name" in neu and _s(neu["name"], 200):
            z["name"], z["name_hand"] = _s(neu["name"], 200), True
        if "menge" in neu:
            z["menge"] = _z(neu["menge"])
    if "vorlage" in neu:
        aufbau_setzen(c, z, _s(neu["vorlage"], 12), neu.get("wahl"), neu.get("dicken"), neu.get("ausf"))
        if z.get("kuerzel"):   # von Hand gewählt = bestätigt
            z["bestaetigt"] = True
            kuerzel.lernen(c, kuerzel.normal(z["kuerzel"]), z.get("vorlage"), z.get("wahl"))
    elif ("wahl" in neu or "dicken" in neu or "ausf" in neu) and z["vorlage"]:
        aufbau_setzen(c, z, z["vorlage"], neu.get("wahl", z.get("wahl")), neu.get("dicken"), neu.get("ausf"))
    return z


def von_hand_anfangen(c, pid, m, wer):
    """Gebäudemodell ohne Plan: neuer gültiger Planstand „Von Hand“ mit den Fragen „Nicht im Modell“ – damit gibt es wieder eine Version
    (löschen, wiederherstellen) wie nach dem Einlesen eines Plans."""
    from .planstand import _neu
    L = leer()
    L["zeilen"] = fragen_zeilen(m.get("raeume") or [], bauart(m) == "neubau")
    for z in L["zeilen"]:
        z["erlaubt"] = erlaubt(z)
    sid = _neu(c, pid, "Von Hand", "", "", "", "hand", wer, L, False)
    L["quelle"] = {"planstand": sid, "name": "Von Hand", "art": "hand"}
    return L


def hand_neu(liste, name, kg=""):
    """Zeile von Hand (frühe Phase ohne Modell oder was im Modell fehlt): Menge eintippen, Aufbau aus dem Baukasten."""
    import time
    z = _zeile(id=f"hand:{int(time.time() * 1000)}", bereich="hand", art="von Hand", kg=re.sub(r"\D", "", str(kg or ""))[:3] or "300", name=_s(name, 200) or "Bauteil",
               menge=0.0, einheit="m²", zustand="hand", status="neu", berechnen=True, quelle="hand")
    z["erlaubt"] = erlaubt(z)
    liste["zeilen"].append(z)
    return z


def vorlagen(c, kg):
    """Vorlagen des Baukastens für eine KG (2. oder 3. Ebene) – nur das, was die Auswahl braucht."""
    k = re.sub(r"\D", "", str(kg or ""))[:3]
    if not k:
        return []
    w = (k[:2] + "%") if len(k) == 3 else (k + "%")
    out = []
    for r in c.execute("SELECT id, kg, name, einheit, daten, tags FROM pdb_vorlage WHERE kg LIKE ? ORDER BY sort, id", (w,)):
        D = json.loads(r["daten"] or "{}")
        O = schicht.optionen(c, D.get("schichten") or [])   # Material · Stärke · Ausführung je Option (MA-A1 B1 C1)
        tg = [t.strip() for t in (r["tags"] or "").split(",") if t.strip()]
        out.append({"id": r["id"], "kg": r["kg"], "name": r["name"], "einheit": r["einheit"], "tags": r["tags"] or "",
                    "block": din276.NAMEN.get(str(r["kg"] or "")[:3], ""), "bestand": "altbau" in tg and "neubau" not in tg,   # Blöcke in bp/bauteile.js (BL-A1 B1 C1)
                    "schichten": [{"name": s["name"], **({"gl": True, "mats": O[si]["mats"]} if si in O else {}),
                                   "optionen": [{"k": o.get("k", ""), "t": o.get("t", ""), "std": bool(o.get("std")),
                                                 **({k: O[si]["o"][oi][k] for k in ("mat", "dicke", "ausf")} if oi in (O.get(si) or {}).get("o", {}) else {})} for oi, o in enumerate(s["optionen"])]}
                                  for si, s in enumerate(D.get("schichten") or [])]})
    return out


# ------------------------------------------------------------------ Für die Apps: was berechnet wird
def berechnete(c, L):
    """Zeilen der Checkliste, die berechnet werden – mit Aufbau, Preisspanne (Baudaten) und Herkunft; dazu die offenen Zeilen mit
    möglichem Betrag. Gemeinsame Grundlage für Kosten (Stand der Bauteile) und Ausschreibung (LV-Entwurf aus den Aufbauten).
    → (zeilen, offen)"""
    from . import baudaten
    Z, offen = [], []
    for z in (L or {}).get("zeilen") or []:
        if z.get("entfaellt") or (z.get("menge_basis") is not None and z.get("menge") == 0 and z.get("verteilt")):
            continue   # ganz auf abgeleitete Zeilen verteilt (Anweisungen) – die rechnen
        if z["status"] == "offen":
            vid = vorschlag(z, "instandsetzen" if z["bereich"] == "rohbau" else "erneuern")
            A = baudaten.aufbau(c, vid, aufbau_setzen(c, dict(z), vid)["wahl"]) if vid else None
            offen.append({"id": z["id"], "name": z["name"], "moeglich": round((A["ep_mittel"] if A else 0) * z["menge"], 2), "vorlage": A["name"] if A else ""})
            continue
        if not z["berechnen"]:
            continue
        A = baudaten.aufbau(c, z["vorlage"], z["wahl"], z.get("dicken"), z.get("ausf")) if z["vorlage"] else None
        Z.append({"id": z["id"], "bereich": z["bereich"], "kg": (A or {}).get("kg") or z["kg"], "name": z["name"], "mat": z["kurz"],
                  "menge": z["menge"], "einheit": (A or {}).get("einheit") or z["einheit"], "ep": (A or {}).get("ep_mittel") or 0,
                  "ep_von": (A or {}).get("ep_von") or 0, "ep_bis": (A or {}).get("ep_bis") or 0, "code": z["code"], "status": z["status"],
                  "quelle": z["quelle"], "formel": f"Projektmodell: {z['anzahl']} Objekte" if z["anzahl"] else "Projektmodell",
                  "aufbau": {"v": z["vorlage"], "w": z["wahl"], **({"d": z["dicken"]} if z.get("dicken") else {}), **({"a": z["ausf"]} if z.get("ausf") else {})} if z["vorlage"] else None,
                  **({"teil": z["teil"]} if z.get("teil") else {}),   # Gebäudeteil (GT-C1): Kosten je Teil
                  **{k: z[k] for k in ("einordnung", "aussen", "lagen") if k in z and z[k] not in ("", [])}})   # aus dem Plan (A1, B1, D1)
    return Z, offen


# ------------------------------------------------------------------ IFC mit den Antworten
def _step(s):
    return "".join(ch if ord(ch) < 128 else "\\X2\\%04X\\X0\\" % ord(ch) for ch in str(s).replace("\\", "\\\\").replace("'", "''"))


def _guid(n):
    c = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$"
    import uuid
    x = uuid.uuid5(uuid.NAMESPACE_OID, f"bauplattform-{n}").int
    s = ""
    for _ in range(21):
        s = c[x % 64] + s; x //= 64
    return c[x % 4] + s


def ausgeben(raw, liste, kopf_name="", stempel=""):
    """IFC (Text) + Antworten → IFC (Text): Raumnummern, F/T-Nummern, Status und Maßnahme je Objekt.
    Für den Weg zurück nach Allplan (16.11.2026): vorhandene Angaben werden geändert statt verdoppelt – Status im Pset_…Common (IFC-Wert)
    und im Allplan-Attribut der Schicht (Text Neubau/Bestand/Abbruch); hat die Zeile ein Element des Allplan-Katalogs der Bauplattform
    (z. B. 331.02.004), wird es das Material einschichtiger Bauteile (IfcMaterial und Allplan-Attribut „Material“) – Allplan zeigt dann den
    Eintrag des Kundenkatalogs. Gemeinsam benutzte Materialien und Psets bleiben unberührt; mehrschichtige tragen schon die Schichtmaterialien."""
    t = raw.decode("latin-1") if isinstance(raw, (bytes, bytearray)) else str(raw)
    if "ISO-10303-21" not in t[:200] or "DATA;" not in t:
        raise ValueError("Das ist keine IFC-Datei (STEP, ISO 10303-21).")
    kopf, rest = t.split("DATA;", 1)
    daten, fuss = rest.rsplit("ENDSEC;", 1)
    E = {int(m.group(1)): m.group(2) for m in re.finditer(r"^#(\d+)\s*=\s*(.*?);\s*$", daten, re.M | re.S)}
    nid = [max(E) + 1 if E else 1]
    oh = next((i for i, v in E.items() if v.startswith("IFCOWNERHISTORY(")), None)
    OH = f"#{oh}" if oh else "$"

    def neu(s):
        i = nid[0]; nid[0] += 1; E[i] = s; return i

    def name_setzen(i, wert, lang=None, immer=False):   # Name nur, wenn leer (immer: Fenster-/Türnummer); LongName (IfcSpace) ebenso
        v = E.get(i)
        if not v:
            return
        m = re.match(r"([A-Z0-9_]+)\('([^']*)',([^,]*),'((?:[^']|'')*)'|([A-Z0-9_]+)\('([^']*)',([^,]*),\$", v)
        if not m:
            return
        if m.group(1) and m.group(4).strip() and not immer:
            return
        typ, g_, o_ = (m.group(1), m.group(2), m.group(3)) if m.group(1) else (m.group(5), m.group(6), m.group(7))
        E[i] = f"{typ}('{g_}',{o_},'{_step(wert)}'" + v[m.end():]
        if lang and typ == "IFCSPACE":
            a = E[i]
            teile, tiefe, q, start = [], 0, False, a.index("(") + 1
            for k in range(start, len(a)):
                ch = a[k]
                if ch == "'":
                    q = not q
                elif not q and ch == "(":
                    tiefe += 1
                elif not q and ch == ")":
                    if tiefe == 0:
                        teile.append(a[start:k]); break
                    tiefe -= 1
                elif not q and ch == "," and tiefe == 0:
                    teile.append(a[start:k]); start = k + 1
            if len(teile) > 7 and teile[7].strip() in ("$", "''"):
                teile[7] = f"'{_step(lang)}'"
                E[i] = "IFCSPACE(" + ",".join(teile) + ")"

    def pset(ids, name, werte, n):
        pv = []
        for k, v in werte:
            if v in (None, ""):
                continue
            if isinstance(v, bool):
                pv.append(neu(f"IFCPROPERTYSINGLEVALUE('{_step(k)}',$,IFCBOOLEAN({'.T.' if v else '.F.'}),$)"))
            elif k == "Status":
                pv.append(neu(f"IFCPROPERTYENUMERATEDVALUE('Status',$,(IFCLABEL('{v}')),$)"))
            else:
                pv.append(neu(f"IFCPROPERTYSINGLEVALUE('{_step(k)}',$,IFCTEXT('{_step(v)}'),$)"))
        if not pv or not ids:
            return
        ps = neu(f"IFCPROPERTYSET('{_guid(n + 'p')}',{OH},'{_step(name)}',$,({','.join('#%d' % x for x in pv)}))")
        neu(f"IFCRELDEFINESBYPROPERTIES('{_guid(n + 'r')}',{OH},$,$,({','.join('#%d' % x for x in ids)}),#{ps})")

    # ---- Rückweg nach Allplan (16.11.2026): vorhandene Angaben ändern statt doppelte anhängen ----
    def args(v):   # „TYP(a,(b,c),'d')“ → ("TYP", ["a", "(b,c)", "'d'"]) – nur oberste Ebene
        k = v.index("(")
        A, tiefe, q, start = [], 0, False, k + 1
        for j in range(k + 1, len(v)):
            ch = v[j]
            if ch == "'":
                q = not q
            elif q:
                continue
            elif ch == "(":
                tiefe += 1
            elif ch == ")":
                if tiefe == 0:
                    A.append(v[start:j]); break
                tiefe -= 1
            elif ch == "," and tiefe == 0:
                A.append(v[start:j]); start = j + 1
        return v[:k], A
    refs = lambda s_: [int(x) for x in re.findall(r"#(\d+)", s_)]   # noqa: E731
    psets, ps_objs, mat, mat_objs, nutz = {}, {}, {}, {}, {}
    for i, v in E.items():
        if v.startswith(("IFCMATERIALDEFINITIONREPRESENTATION(", "IFCMATERIALPROPERTIES(")):
            continue   # Darstellung/Eigenschaften des Materials zählen nicht als zweite Verwendung
        for x in set(refs(v)):
            nutz[x] = nutz.get(x, 0) + 1
        if v.startswith(("IFCRELDEFINESBYPROPERTIES(", "IFCRELASSOCIATESMATERIAL(")):
            _, A = args(v)
            objs, ziel = refs(A[4]), refs(A[5])
            if ziel:
                for o in objs:
                    (psets.setdefault(o, []).append(ziel[0]) if v.startswith("IFCRELDEFINES") else mat.__setitem__(o, ziel[0]))
                (ps_objs if v.startswith("IFCRELDEFINES") else mat_objs).setdefault(ziel[0], set()).update(objs)

    def eigenschaften(ps):   # [(id, verschachtelt)] – auch in zusammengesetzten Eigenschaften (Allplan „Object Layer Attributes #1“)
        A = args(E[ps])[1]
        out, offen = [], [(x, False) for x in refs(A[4])] if len(A) > 4 else []
        while offen:
            x, tief = offen.pop()
            if E.get(x, "").startswith("IFCCOMPLEXPROPERTY("):
                offen += [(y, True) for y in refs(args(E[x])[1][3])]
            elif x in E:
                out.append((x, tief))
        return out

    def status_setzen(obj, st, eigene):   # vorhandenes „Status“ ändern (IFC-Wert und Allplan-Text) – nur in Psets, die allein zu dieser Zeile gehören
        gefunden = False
        for ps in psets.get(obj, []):
            if not ps_objs.get(ps, set()) <= eigene:
                continue
            common = re.fullmatch(r"'Pset_\w+Common'", args(E[ps])[1][2].strip())
            for x, tief in eigenschaften(ps):
                v = E[x]
                if not re.match(r"IFCPROPERTY(SINGLE|ENUMERATED)VALUE\('Status',", v) or nutz.get(x, 0) > 1:
                    continue
                if tief:   # Allplan-Attribut „Status“ einer Schicht: Text wie in Allplan (Neubau, Bestand, Abbruch)
                    E[x] = f"IFCPROPERTYSINGLEVALUE('Status',$,IFCTEXT('{ALLPLAN_STATUS[st]}'),$)"
                elif common:   # Pset_…Common: der IFC-Wert (PEnum_ElementStatus)
                    E[x] = f"IFCPROPERTYENUMERATEDVALUE('Status',$,(IFCLABEL('{st}')),$)"; gefunden = True
        return gefunden

    def material_setzen(obj, code, eigene):   # Element des Allplan-Katalogs der Bauplattform als Material (= REFNAM im Kundenkatalog)
        m = mat.get(obj)
        if not m or not mat_objs.get(m, set()) <= eigene or nutz.get(m, 0) > 1:
            return False
        kette, x = [m], m
        while E.get(x, "").startswith(("IFCMATERIALLAYERSETUSAGE(", "IFCMATERIALLAYERSET(", "IFCMATERIALLAYER(")):
            typ, A = args(E[x])
            r = refs(A[0])
            if typ == "IFCMATERIALLAYERSET" and len(r) != 1:
                return False   # mehrschichtig: die Schichten tragen schon die Schichtmaterialien des Katalogs
            if not r or nutz.get(r[0], 0) > 1:
                return False   # gemeinsam benutzt (andere Bauteile) – nicht anfassen
            x = r[0]; kette.append(x)
        if not E.get(x, "").startswith("IFCMATERIAL("):
            return False
        typ, A = args(E[x])
        alt = A[0].strip("'")
        if alt == _step(code):
            return False
        E[x] = "IFCMATERIAL(" + ",".join([f"'{_step(code)}'"] + A[1:]) + ")"
        for ps in psets.get(obj, []):   # Allplan-Attribut „Material“ derselben Schicht mitziehen
            for y, _ in eigenschaften(ps):
                if E[y].startswith("IFCPROPERTYSINGLEVALUE('Material',") and f"IFCTEXT('{alt}')" in E[y] and nutz.get(y, 0) <= 1:
                    E[y] = f"IFCPROPERTYSINGLEVALUE('Material',$,IFCTEXT('{_step(code)}'),$)"
        return True

    for r in liste.get("raeume") or []:
        if r.get("id") in E:
            name_setzen(r["id"], r["nr"], r["name"])
    from .raumsuche import ins_ifc   # aus den Wänden ermittelte Räume als echte IfcSpace (GO 16.11.2026)
    ins_ifc(E, neu, OH, liste.get("raeume") or [], _guid, _step)
    for z in liste.get("zeilen") or []:
        ids = [i for i in z.get("ids") or [] if i in E]
        if not ids:
            continue
        if z["bereich"] == "oeffnung":
            for i, nr in zip(z["ids"], z.get("nummern") or []):
                if i in E:
                    name_setzen(i, nr, immer=True)
        st, eigene = IFC_STATUS.get(z["status"]), set(ids)
        if st and z["bereich"] != "raum" and z.get("zustand") != "leer":
            fehlt = {}
            for i in ids:   # vorhandenes Status ändern (Allplan schreibt Pset_WallCommon schon selbst) – sonst ein passendes Common-Pset je Objektart
                if not status_setzen(i, st, eigene):
                    cp = COMMON.get(args(E[i])[0])
                    if cp and not any(args(E[ps])[1][2].strip("'") == cp for ps in psets.get(i, [])):
                        fehlt.setdefault(cp, []).append(i)
            for cp, L_ in fehlt.items():
                pset(L_, cp, [("Status", st)], z["id"] + cp)
        if z.get("code") and z["status"] not in ("offen", "bleibt", "abbruch"):
            for i in ids:
                material_setzen(i, z["code"], eigene)
        pset(ids, "Bauplattform_Massnahme", [("Maßnahme", WORT[z["status"]]), ("Teil", z["name"] if z["bereich"] in ("raum", "ausbau") else ""),
                                             ("Element", z.get("code") or (f"{z['vorlage']} (Aufbau nach Wahl)" if z.get("vorlage") else "")),
                                             ("Kurztext", z.get("kurz")), ("Berechnen", bool(z.get("berechnen"))), ("Menge der Gruppe", f"{z['menge']:g} {z['einheit']}".replace(".", ",")),
                                             ("Quelle", "Bauteil-Checkliste der Bauplattform" + (f", {stempel}" if stempel else ""))], z["id"])
    if kopf_name:
        kopf = re.sub(r"FILE_NAME\s*\(\s*'[^']*'", f"FILE_NAME('{_step(kopf_name)}'", kopf, count=1)
    return (kopf + "DATA;\n" + "".join(f"#{i}={E[i]};\n" for i in sorted(E)) + "ENDSEC;" + fuss).encode("latin-1", "replace")


# ------------------------------------------------------------------ Adressen (eingehängt in modell.routen)
def routen(bp, mit, lesen_modell, schreiben_modell):
    from flask import Response, jsonify, request

    @bp.get("/api/bp/modell/<int:pid>/bauteile/vorlagen")
    def bauteile_vorlagen(pid):
        return mit(pid, lambda c, wer: jsonify(vorlagen(c, request.args.get("kg"))))

    @bp.post("/api/bp/modell/<int:pid>/bauteile/zeile")
    def bauteile_zeile(pid):
        d = request.get_json(silent=True) or {}

        def tun(c, wer):
            M = lesen_modell(c, pid)
            m = M["modell"]
            if isinstance(d.get("rev"), int) and d["rev"] != M["rev"]:
                return jsonify(error="Jemand anderes hat das Modell inzwischen geändert – bitte neu laden.", **M), 409
            L = m.get("bauteilliste") or leer()
            ids = d.get("ids") if isinstance(d.get("ids"), list) else [d.get("id")]
            neu = {k: d[k] for k in ("status", "berechnen", "vorlage", "wahl", "dicken", "ausf", "name", "menge", "loeschen", "bestaetigt", "wie", "uw") if k in d}
            if not any(setzen(c, L, _s(i, 200), dict(neu)) for i in ids[:400]):
                return jsonify(error="Zeile nicht gefunden – bitte neu laden."), 404
            m["bauteilliste"] = L
            schreiben_modell(c, pid, m, wer)
            return jsonify(lesen_modell(c, pid))
        return mit(pid, tun)

    @bp.get("/api/bp/modell/kuerzel")
    def bauteile_kuerzel():   # für die Zeichner: Kürzel, die das Portal sicher kennt (kuerzel.py)
        return jsonify(kuerzel.liste())

    @bp.post("/api/bp/modell/<int:pid>/bauteile/hand")
    def bauteile_hand(pid):
        d = request.get_json(silent=True) or {}

        def tun(c, wer):
            m = lesen_modell(c, pid)["modell"]
            L = m.get("bauteilliste") or leer()
            if len(L["zeilen"]) >= 400:
                return jsonify(error="Die Checkliste ist voll (400 Zeilen)."), 400
            angelegt = not (L.get("quelle") or {}).get("planstand")
            if angelegt:   # erste Zeile ohne Plan (C1, 17.11.2026): Planstand „Von Hand“ mit den Fragen
                L = von_hand_anfangen(c, pid, m, wer)
            if not d.get("nur_start"):   # nur_start: nur den Planstand anlegen (z. B. um eine Frage zu beantworten)
                hand_neu(L, d.get("name"), d.get("kg"))
            m["bauteilliste"] = L
            schreiben_modell(c, pid, m, wer)
            r = lesen_modell(c, pid)
            if angelegt:   # das Versionsmenü zeigt den neuen Planstand sofort
                from .planstand import liste
                r = dict(r, planstaende=liste(c, pid))
            return jsonify(r)
        return mit(pid, tun)

    @bp.post("/api/bp/modell/<int:pid>/bauteile/ifc")
    def bauteile_ifc(pid):
        from .planstand import datei_holen, datei_lesen
        try:
            name, raw, _p, _q = datei_holen(pid)   # vom Gerät oder aus „Pläne & Dateien“
        except ValueError:
            name, raw = "", None   # sonst die beim Einlesen gespeicherte Datei des Planstands

        def tun(c, wer):
            nonlocal name, raw
            L = lesen_modell(c, pid)["modell"].get("bauteilliste") or leer()
            if not L["zeilen"]:
                return jsonify(error="Die Checkliste ist noch leer – bitte zuerst das Modell einlesen."), 400
            Q = L.get("quelle") or {}
            if not Q.get("planstand") or (Q.get("art") or "ifc") != "ifc":   # ohne gültigen IFC-Planstand gibt es kein IFC, in das man schreiben könnte
                return jsonify(error="IFC ausgeben geht nur mit einem eingelesenen IFC-Plan als gültigem Planstand."), 400
            if raw is None:
                g = datei_lesen(c, pid, (L.get("quelle") or {}).get("planstand"))
                if not g:
                    return jsonify(error="Die IFC-Datei dieses Planstands liegt nicht vor (vor dem 17.11.2026 eingelesen) – bitte einmal wählen.", waehlen=True), 409
                name, raw = g
            neu_name = re.sub(r"(\.ifc)?$", "-massnahmen.ifc", name, count=1, flags=re.I)
            try:
                out = ausgeben(raw, L, neu_name, datetime.now().strftime("%d.%m.%Y"))
            except ValueError as e:
                return jsonify(error=str(e)), 400
            from urllib.parse import quote
            return Response(out, mimetype="application/x-step", headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quote(neu_name)}"})
        return mit(pid, tun)
