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

STATUS = ("offen", "bleibt", "instandsetzen", "erneuern", "neu", "abbruch", "pruefen")
WORT = {"offen": "offen", "bleibt": "bleibt", "instandsetzen": "instandsetzen", "erneuern": "erneuern", "neu": "neu", "abbruch": "Abbruch", "pruefen": "prüfen lassen"}
IFC_STATUS = {"bleibt": "EXISTING", "instandsetzen": "EXISTING", "erneuern": "NEW", "neu": "NEW", "abbruch": "DEMOLISH"}
BEREICHE = (("rohbau", "Rohbau"), ("oeffnung", "Öffnungen"), ("raum", "Räume (Oberflächen)"), ("ausbau", "Küche und Bad"), ("frage", "Nicht im Modell – bitte beantworten"))
# Was im Modell nicht gezeichnet ist: (id, Name, KG, Vorlage, Einheit, Menge aus …)
FRAGEN = (("elektro", "Elektroinstallation", "444", "444.03", "m²", "wf"), ("heizung", "Heizkörper und Heizleitungen", "423", "423.09", "St", "raeume"),
          ("leitungen", "Wasser- und Abwasserleitungen bis zum Strang", "412", "412.01", "m", "wf10"),
          ("schadstoffe", "Schadstoffe (Asbest in Belag/Kleber, PAK, KMF)", "394", "394.05", "m²", "wf"),
          ("baustelle", "Baustelleneinrichtung, Schutz im Bestand, Entsorgung", "393", "393.04", "m²", "wf"))
NASS = re.compile(r"\b(bad|wc|dusch|sanit|nass)", re.I)
KUECHE = re.compile(r"(küche|kueche|kochen|teeküche)", re.I)


def _s(v, n):
    return re.sub(r"\s+", " ", str(v if v is not None else "")).strip()[:n]


def _z(v, lo=0.0, hi=1e9):
    try:
        x = float(str(v).replace(",", "."))
    except (TypeError, ValueError):
        return 0.0
    return round(min(hi, max(lo, x)), 3)


def leer():
    return {"quelle": {}, "zeilen": [], "raeume": []}


def sauber(d):
    d = d if isinstance(d, dict) else {}
    q = d.get("quelle") if isinstance(d.get("quelle"), dict) else {}
    out = leer()
    out["quelle"] = {"datei": _s(q.get("datei"), 200), "gelesen": _s(q.get("gelesen"), 20), "programm": _s(q.get("programm"), 80), "objekte": int(_z(q.get("objekte")))}
    for z in (d.get("zeilen") if isinstance(d.get("zeilen"), list) else [])[:400]:
        if not isinstance(z, dict) or not _s(z.get("id"), 200):
            continue
        st = z.get("status") if z.get("status") in STATUS else "offen"
        out["zeilen"].append({"id": _s(z.get("id"), 200), "bereich": z.get("bereich") if z.get("bereich") in dict(BEREICHE) else "rohbau",
                              "art": _s(z.get("art"), 60), "kg": _s(z.get("kg"), 3), "name": _s(z.get("name"), 200), "material": _s(z.get("material"), 200),
                              "menge": _z(z.get("menge")), "einheit": _s(z.get("einheit"), 12), "anzahl": int(_z(z.get("anzahl"), 0, 1e6)),
                              "zustand": _s(z.get("zustand"), 12), "status": st, "berechnen": bool(z.get("berechnen")),
                              "vorlage": _s(z.get("vorlage"), 12), "wahl": [int(_z(x, 0, 99)) for x in (z.get("wahl") or [])[:12]],
                              "code": _s(z.get("code"), 20), "kurz": _s(z.get("kurz"), 300), "quelle": _s(z.get("quelle"), 12),
                              "ids": [int(x) for x in (z.get("ids") or [])[:5000] if str(x).isdigit()], "nummern": [_s(x, 12) for x in (z.get("nummern") or [])[:500]],
                              "hinweis": _s(z.get("hinweis"), 300)})
    for r in (d.get("raeume") if isinstance(d.get("raeume"), list) else [])[:2000]:
        if isinstance(r, dict):
            out["raeume"].append({"id": int(_z(r.get("id"), 0, 1e9)), "nr": _s(r.get("nr"), 20), "name": _s(r.get("name"), 200), "flaeche": _z(r.get("flaeche")),
                                  "umfang": _z(r.get("umfang")), "hoehe": _z(r.get("hoehe"), 0, 20), "geschoss": _s(r.get("geschoss"), 40)})
    return out


# ------------------------------------------------------------------ Baukasten
def _vorlage(c, vid):
    r = c.execute("SELECT id, kg, name, einheit, daten FROM pdb_vorlage WHERE id=?", (str(vid),)).fetchone()
    if not r:
        return None
    D = json.loads(r["daten"] or "{}")
    return {"id": r["id"], "kg": r["kg"], "name": r["name"], "einheit": r["einheit"], "schichten": D.get("schichten") or []}


def _std(V):
    return [next((i for i, o in enumerate(s["optionen"]) if o.get("std")), 0) for s in V["schichten"]]


def aufbau_setzen(c, z, vid, wahl=None):
    """Vorlage + Wahl → Element (wenn es die Kombination als Standardelement gibt) und Kurztext."""
    V = _vorlage(c, vid) if vid else None
    if not V:
        z.update(vorlage="", wahl=[], code="", kurz="")
        return z
    w = [int(x) for x in (wahl if wahl is not None else _std(V))][:len(V["schichten"])]
    w += _std(V)[len(w):]
    w = [max(0, min(i, len(s["optionen"]) - 1)) for i, s in zip(w, V["schichten"])]
    e = c.execute("SELECT code FROM pdb_position WHERE katalog='gk3e' AND hinweis=?", (f"Aufbau {V['id']}:{'.'.join(map(str, w))}",)).fetchone()
    ks = [s["optionen"][i].get("k") for s, i in zip(V["schichten"], w) if s["optionen"][i].get("k")]
    z.update(vorlage=V["id"], wahl=w, code=e["code"] if e else "", kurz=", ".join([V["name"]] + ks)[:300])
    return z


def _aus_code(c, code):
    r = c.execute("SELECT hinweis FROM pdb_position WHERE katalog='gk3e' AND code=?", (code,)).fetchone()
    m = re.match(r"Aufbau ([\d.]+?):([\d.]*)$", r["hinweis"] if r and r["hinweis"] else "")
    return (m.group(1), [int(x) for x in m.group(2).split(".") if x != ""]) if m else None


def vorschlag(z, status):
    """Passende Vorlage zur Antwort – der Mensch kann sie ändern."""
    art, kg, b = z["art"].lower(), z["kg"], z["bereich"]
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
        if z["id"].startswith("raum:boden"):
            return "353.09" if nass else "353.10"
        if z["id"].startswith("raum:wand"):
            return "345.10" if nass else "345.09"
        if z["id"].startswith("raum:decke"):
            return "354.09" if status == "instandsetzen" else "354.01"
    if b == "ausbau":
        return "412.15" if z["id"] == "ausbau:bad" else "412.13"
    return ""


# ------------------------------------------------------------------ Liste aus dem Modell
def _zeile(**k):
    z = {"id": "", "bereich": "rohbau", "art": "", "kg": "", "name": "", "material": "", "menge": 0.0, "einheit": "", "anzahl": 0, "zustand": "",
         "status": "offen", "berechnen": False, "vorlage": "", "wahl": [], "code": "", "kurz": "", "quelle": "ifc", "ids": [], "nummern": [], "hinweis": ""}
    z.update(k)
    return z


def zeilen_aus_ifc(c, R, alt=None):
    """R = cadimport.ifc_lesen(raw, bestand=True). Antworten aus alt (gleiche id) bleiben; Mengen und Objekte kommen neu aus dem Modell."""
    A = {z["id"]: z for z in ((alt or {}).get("zeilen") or [])}
    Z = []
    oeff_fl = {"aussen": 0.0, "innen": 0.0}
    for g in R["bauteile"]:
        zu = g.get("zustand") or "neu"
        art = g["art"]
        ber = "oeffnung" if g["kg"] in ("334", "344") else "rohbau"
        zid = "|".join(str(x) for x in (g["kg"], art, g.get("material") or "", g.get("dicke") or 0, g.get("einheit"), g.get("code") or "", zu))
        z = _zeile(id=zid, bereich=ber, art=art, kg=g["kg"], name=g["name"] + (f" ({g['material']})" if g.get("material") and ber == "rohbau" else ""),
                   material=g.get("material") or "", menge=g["menge"], einheit=g["einheit"], anzahl=g["anzahl"], zustand=zu, ids=list(g.get("ids") or []),
                   status="abbruch" if zu == "abbruch" else "neu" if g.get("code") else "offen")   # alles beantworten lassen – nur Allplan-Katalogbauteile sind schon klar
        if ber == "oeffnung":
            fl = g.get("flaeche") or (g["menge"] if g["einheit"] == "m²" else 0)
            oeff_fl["aussen" if g.get("aussen") else "innen"] += fl
            if zu == "leer":
                z["name"] = f"{'Fenster' if 'Fenster' in art else 'Tür'}{' außen' if g.get('aussen') and 'Tür' in art else ''} – Öffnung ohne Bauteil im Modell"
                z["hinweis"] = "Im Modell ist nur die Öffnung gezeichnet."
        if g.get("code"):
            a = _aus_code(c, g["code"])
            if a:
                aufbau_setzen(c, z, a[0], a[1])
                z.update(quelle="allplan", hinweis=f"Aus dem Allplan-Katalog der Bauplattform ({g['code']}).")
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
        raeume.append({"id": r.get("id") or 0, "nr": r.get("nr") or f"0.{k + 1:02d}", "name": r.get("name") or "Raum", "flaeche": r.get("flaeche") or 0,
                       "umfang": r.get("umfang") or 0, "hoehe": r.get("hoehe") or 2.5, "geschoss": r.get("geschoss") or ""})
    brutto = sum(r["umfang"] * r["hoehe"] for r in raeume) or 1
    abzug = min(0.5, (oeff_fl["aussen"] + 2 * oeff_fl["innen"]) / brutto)   # Öffnungen anteilig abziehen (Innentüren zählen zweimal)
    for nass in (False, True):
        RR = [r for r in raeume if bool(NASS.search(r["name"])) == nass]
        if not RR:
            continue
        nr = ", ".join(r["nr"] for r in RR)
        t = " – Nassräume" if nass else ""
        for teil, nm, m in (("boden", "Böden", sum(r["flaeche"] for r in RR)), ("wand", "Wände", sum(r["umfang"] * r["hoehe"] for r in RR) * (1 - abzug)),
                            ("decke", "Decken", sum(r["flaeche"] for r in RR))):
            Z.append(_zeile(id=f"raum:{teil}:{'nass' if nass else 'trocken'}", bereich="raum", art=nm, kg={"boden": "353", "wand": "345", "decke": "354"}[teil],
                            name=f"{nm}{t} ({nr})", menge=round(m, 2), einheit="m²", anzahl=len(RR), zustand="bestand", quelle="raum", ids=[r["id"] for r in RR if r["id"]]))
    nb = [r for r in raeume if NASS.search(r["name"])]
    kue = [r for r in raeume if KUECHE.search(r["name"])]
    Z.append(_zeile(id="ausbau:bad", bereich="ausbau", art="Bad", kg="412", name="Bad: Sanitärobjekte und Installation" + (f" ({', '.join(r['nr'] for r in nb)})" if nb else ""),
                    menge=max(1, len(nb)), einheit="St", anzahl=len(nb), zustand="bestand", quelle="raum", ids=[r["id"] for r in nb if r["id"]]))
    Z.append(_zeile(id="ausbau:kueche", bereich="ausbau", art="Küche", kg="412", name="Küche: Anschluss Spüle, Fliesenspiegel" + (f" ({', '.join(r['nr'] for r in kue)})" if kue else ""),
                    menge=1, einheit="St", anzahl=len(kue), zustand="bestand", quelle="raum", ids=[r["id"] for r in kue if r["id"]]))
    wf = round(sum(r["flaeche"] for r in raeume), 2)
    for fid, nm, kg, _, eh, q in FRAGEN:
        m = {"wf": wf, "raeume": max(1, len([r for r in raeume if not NASS.search(r["name"])])), "wf10": round(wf / 10, 1)}[q]
        Z.append(_zeile(id=f"frage:{fid}", bereich="frage", art=nm, kg=kg, name=nm, menge=m, einheit=eh, zustand="frage", quelle="frage",
                        hinweis="Menge aus der Wohnfläche geschätzt" if q != "raeume" else "Anzahl aus den Räumen geschätzt"))
    for z in Z:   # Antworten von vorher behalten
        a = A.get(z["id"])
        if a:
            for k in ("status", "berechnen", "vorlage", "wahl", "code", "kurz"):
                z[k] = a.get(k, z[k])
        else:
            z["berechnen"] = z["status"] not in ("offen", "bleibt", "pruefen")
    return {"zeilen": Z, "raeume": raeume}


def setzen(c, liste, zid, neu):
    """Eine Antwort ändern. neu: {status?, berechnen?, vorlage?, wahl?}. Bei neuem Status ohne eigene Vorlage schlägt der Kern eine vor."""
    z = next((x for x in liste["zeilen"] if x["id"] == zid), None)
    if z is None:
        return None
    if "status" in neu and neu["status"] in STATUS and neu["status"] != z["status"]:
        z["status"] = neu["status"]
        z["berechnen"] = z["status"] not in ("offen", "bleibt", "pruefen")
        if "vorlage" not in neu and z["quelle"] != "allplan":
            aufbau_setzen(c, z, vorschlag(z, z["status"]))
    if "berechnen" in neu:
        z["berechnen"] = bool(neu["berechnen"])
    if "vorlage" in neu:
        aufbau_setzen(c, z, _s(neu["vorlage"], 12), neu.get("wahl"))
    elif "wahl" in neu and z["vorlage"]:
        aufbau_setzen(c, z, z["vorlage"], neu["wahl"])
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
        out.append({"id": r["id"], "kg": r["kg"], "name": r["name"], "einheit": r["einheit"], "tags": r["tags"] or "",
                    "schichten": [{"name": s["name"], "optionen": [{"k": o.get("k", ""), "t": o.get("t", ""), "std": bool(o.get("std"))} for o in s["optionen"]]}
                                  for s in D.get("schichten") or []]})
    return out


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
    """IFC (Text) + Antworten → IFC (Text). Fügt nur hinzu bzw. setzt leere Namen: Raumnummern, F/T-Nummern, Status und Maßnahme je Objekt."""
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

    for r in liste.get("raeume") or []:
        if r.get("id") in E:
            name_setzen(r["id"], r["nr"], r["name"])
    for z in liste.get("zeilen") or []:
        ids = [i for i in z.get("ids") or [] if i in E]
        if not ids:
            continue
        if z["bereich"] == "oeffnung":
            for i, nr in zip(z["ids"], z.get("nummern") or []):
                if i in E:
                    name_setzen(i, nr, immer=True)
        st = IFC_STATUS.get(z["status"])
        common = {"oeffnung": "Pset_DoorCommon" if "Tür" in z["art"] else "Pset_WindowCommon", "rohbau": "Pset_WallCommon" if z["art"].startswith("Wand") else ""}.get(z["bereich"], "")
        if st and common and z["bereich"] != "raum" and z.get("zustand") != "leer":
            pset(ids, common, [("Status", st)], z["id"] + common)
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
    from . import cadimport

    def datei():
        f = request.files.get("datei")
        raw = f.read() if f else b""
        if not raw:
            raise ValueError("Keine Datei erhalten.")
        if len(raw) > 200 * 1024 * 1024:
            raise ValueError("Die Datei ist zu groß (höchstens 200 MB).")
        return (f.filename or "modell.ifc"), raw

    @bp.get("/api/bp/modell/<int:pid>/bauteile/vorlagen")
    def bauteile_vorlagen(pid):
        return mit(pid, lambda c, wer: jsonify(vorlagen(c, request.args.get("kg"))))

    @bp.post("/api/bp/modell/<int:pid>/bauteile/lesen")
    def bauteile_lesen(pid):
        try:
            name, raw = datei()
            R = cadimport.ifc_lesen(raw, bestand=True)
        except ValueError as e:
            return jsonify(error=str(e)), 400
        except Exception as e:   # noqa: BLE001 – kaputte Datei: Meldung an die Oberfläche
            return jsonify(error="Die Datei konnte nicht gelesen werden: " + str(e).splitlines()[0][:150]), 400

        def tun(c, wer):
            M = lesen_modell(c, pid)
            m = M["modell"]
            L = zeilen_aus_ifc(c, R, m.get("bauteilliste"))
            m["bauteilliste"] = {"quelle": {"datei": name, "gelesen": datetime.now().isoformat(timespec="seconds"), "programm": R["info"].get("programm", ""),
                                            "objekte": R["info"].get("objekte", 0)}, **L}
            if not m.get("raeume") or all(str(r.get("id", "")).startswith("ifc") for r in m["raeume"]):   # Räume des Modells aus dem IFC (von Hand gepflegte bleiben)
                m["raeume"] = [{"id": f"ifc{r['id']}", "nr": r["nr"], "name": r["name"], "flaeche": r["flaeche"], "geschoss": r["geschoss"]} for r in L["raeume"]]
            if not m.get("flaeche") and not (m.get("hand") or {}).get("flaeche"):
                m["flaeche"] = round(sum(r["flaeche"] for r in L["raeume"]), 2)
            schreiben_modell(c, pid, m, wer)
            return jsonify(dict(lesen_modell(c, pid), hinweise=R["hinweise"]))
        return mit(pid, tun)

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
            neu = {k: d[k] for k in ("status", "berechnen", "vorlage", "wahl") if k in d}
            if not any(setzen(c, L, _s(i, 200), dict(neu)) for i in ids[:400]):
                return jsonify(error="Zeile nicht gefunden – bitte neu laden."), 404
            m["bauteilliste"] = L
            schreiben_modell(c, pid, m, wer)
            return jsonify(lesen_modell(c, pid))
        return mit(pid, tun)

    @bp.post("/api/bp/modell/<int:pid>/bauteile/ifc")
    def bauteile_ifc(pid):
        try:
            name, raw = datei()
        except ValueError as e:
            return jsonify(error=str(e)), 400

        def tun(c, wer):
            L = lesen_modell(c, pid)["modell"].get("bauteilliste") or leer()
            if not L["zeilen"]:
                return jsonify(error="Die Checkliste ist noch leer – bitte zuerst das Modell einlesen."), 400
            neu_name = re.sub(r"(\.ifc)?$", "-massnahmen.ifc", name, count=1, flags=re.I)
            try:
                out = ausgeben(raw, L, neu_name, datetime.now().strftime("%d.%m.%Y"))
            except ValueError as e:
                return jsonify(error=str(e)), 400
            from urllib.parse import quote
            return Response(out, mimetype="application/x-step", headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quote(neu_name)}"})
        return mit(pid, tun)
