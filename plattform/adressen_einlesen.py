"""Adressen einlesen (GO 22.11.2026, Mock „Adressen einlesen“: AE-1 … AE-7 alle A).

Eine Excel- (.xlsx) oder CSV-Datei wird nur gelesen, nie gespeichert: die Vorschau bekommt die Zeilen als Text zurück, der Browser
hält sie, bis eingelesen ist. Nichts davon kommt in die Datenbank außer den Kontakten selbst.

  POST /api/contacts/einlesen/datei   (Datei)          → {zeilen, kopf, spalten, felder, kontakte, summe}
  POST /api/contacts/einlesen/ordnen  {zeilen, spalten} → {kontakte, summe}        Zuordnung der Spalten geändert
  POST /api/contacts/einlesen         {kontakte}       → {neu, ergaenzt, ids}      wirklich anlegen bzw. ergänzen
  POST /api/contacts/einlesen/zurueck {stand}          → {ok}                      Rückgängig für das ganze Einlesen

AE-2 Spalten nach der Überschrift, in der Vorschau änderbar · AE-3 mehrere Zeilen derselben Firma = ein Kontakt, Personen als
weitere Ansprechpartner · AE-4 Gewerk „Bauherr…“ = Art Bauherr:in · AE-5 Projektnummer am Kontakt (contacts.extra.projektnr – PZ-1: gehört zum Projekt im Bauportal mit
diesem Kürzel, sonst Name aus den Projektordnern) · AE-6 schon vorhandene: ergänzen (leere Felder füllen) · überspringen · doppelt · AE-7 Gewerke so übernehmen (danach „Aufräumen“).
"""
import csv, io, json, re
from datetime import datetime

from bpcore import contacts as K

FELDER = {   # Feld → Bezeichnung in der Vorschau
    "": "– nicht einlesen –", "gewerk": "Gewerk", "firma": "Firma / Name", "person": "Ansprechpartner:in", "nachname": "Nachname",
    "strasse": "Straße", "plzort": "PLZ Ort", "plz": "PLZ", "ort": "Ort", "tel": "Telefon", "fax": "Fax", "mobil": "Mobil",
    "mail": "E-Mail", "web": "Internet", "projekt": "Projektnummer", "notiz": "Notizen", "funktion": "Funktion",
}
_KOPF = [   # Reihenfolge zählt: das Erste, was passt
    ("nachname", "nachname"), ("nicht eintragen", ""), ("nicht einlesen", ""), ("ansprech", "person"), ("anrede", "person"), ("kontaktperson", "person"), ("vorname", "person"),
    ("gewerk", "gewerk"), ("branche", "gewerk"), ("firma", "firma"), ("unternehmen", "firma"),
    ("plz ort", "plzort"), ("plz/ort", "plzort"), ("plz", "plz"), ("ort", "ort"), ("stadt", "ort"), ("straße", "strasse"), ("strasse", "strasse"),
    ("adresse", "strasse"), ("anschrift", "strasse"), ("fax", "fax"), ("mobil", "mobil"), ("handy", "mobil"), ("mail", "mail"),
    ("tel", "tel"), ("fon", "tel"), ("web", "web"), ("internet", "web"), ("homepage", "web"), ("projekt", "projekt"),
    ("notiz", "notiz"), ("sonstig", "notiz"), ("bemerk", "notiz"), ("funktion", "funktion"), ("rolle", "funktion"), ("name", "firma"),
]
MAX_ZEILEN, MAX_BYTES = 5000, 8 * 1024 * 1024
_MAIL = re.compile(r"[^@\s,;<>]+@[^@\s,;<>]+\.[^@\s,;<>]+")
_PROJ = re.compile(r"\b([A-Za-z]{1,3}\d{2,5}(?:\.\d+)?)\b")


def _t(v):
    if v is None:
        return ""
    if isinstance(v, float) and v.is_integer():
        v = int(v)
    return " ".join(str(v).replace("\r", "\n").split()) if not isinstance(v, str) else v.replace("\r", "").strip()


def lesen(name, roh):
    """Datei → Zeilen (Listen aus Text). Nur die erste Tabelle; leere Zeilen fallen weg."""
    if len(roh) > MAX_BYTES:
        raise ValueError("Die Datei ist zu groß (höchstens 8 MB).")
    n = (name or "").lower()
    if n.endswith((".xlsx", ".xlsm")):
        import openpyxl
        try:
            ws = openpyxl.load_workbook(io.BytesIO(roh), read_only=True, data_only=True).worksheets[0]
        except Exception as e:   # kaputte oder verschlüsselte Datei: Meldung für die Person, nichts weiter
            raise ValueError("Die Excel-Datei lässt sich nicht lesen.") from e
        Z = [[_t(v) for v in r] for r in ws.iter_rows(values_only=True)]
    elif n.endswith((".csv", ".txt")):
        t = roh.decode("utf-8-sig", errors="replace") if roh[:3] == b"\xef\xbb\xbf" or _utf8(roh) else roh.decode("cp1252", errors="replace")
        trenn = ";" if t.count(";") >= t.count(",") else ","
        Z = [[_t(v) for v in r] for r in csv.reader(io.StringIO(t), delimiter=trenn)]
    else:
        raise ValueError("Bitte eine Excel-Datei (.xlsx) oder eine CSV-Datei wählen.")
    Z = [r for r in Z if any(r)]
    if len(Z) > MAX_ZEILEN:
        raise ValueError(f"Die Datei hat mehr als {MAX_ZEILEN} Zeilen.")
    breit = max((len(r) for r in Z), default=0)
    while breit and not any(len(r) >= breit and r[breit - 1] for r in Z):
        breit -= 1
    return [(r + [""] * breit)[:breit] for r in Z]


def _utf8(b):
    try:
        b.decode("utf-8")
        return True
    except UnicodeDecodeError:
        return False


def spalten(kopf, zeilen):
    """Überschrift → Feld je Spalte (AE-2). Steht über der Firmenspalte etwas anderes (z. B. ein Name), nimmt die Spalte mit dem meisten Text."""
    S = []
    for k in kopf:
        k0 = " ".join(str(k).lower().split())
        S.append(next((f for w, f in _KOPF if w in k0), "") if k0 else "")
    gesehen = set()   # nur die erste Spalte je Feld – weitere gleicher Art bleiben frei (außer Nachname)
    for i, f in enumerate(S):
        if f and f in gesehen and f != "nachname":
            S[i] = ""
        gesehen.add(f)
    if "firma" not in S:
        frei = [i for i, f in enumerate(S) if not f]
        if frei:
            S[max(frei, key=lambda i: (sum(1 for r in zeilen if r[i]), -i))] = "firma"
    return S


_BEHOERDE = re.compile(r"^(stadt|kreis|landkreis|amt|bezirksregierung|gemeinde|land|landesbetrieb|regierungspräsidium|landratsamt|bauaufsicht|untere|obere|kreisverwaltung|stadtverwaltung)\b", re.I)   # BH-1


def _plzort(v):
    m = re.match(r"\s*(?:D-?)?(\d{4,5})\s+(.+)", v)
    return (m.group(1), m.group(2).strip()) if m else ("", v.strip())


def _projekte(c):
    """Kürzel vorn im Projektnamen („A481 Tierheim …“) → Name – nur für die Vorschau; am Kontakt steht das Kürzel (PZ-1)"""
    P = {}
    for r in c.execute("SELECT name FROM projects").fetchall():
        k = K.projekt_kuerzel(r["name"])
        if k:
            P.setdefault(k, r["name"])
    return P


def ordnen(c, zeilen, S):
    """Zeilen + Zuordnung → Kontakte für die Vorschau (AE-3 … AE-6)."""
    P = _projekte(c)
    alt = {K.name_norm(r["name"]): r for r in c.execute("SELECT id, name, trade, contact_person, phone, mobile, email, website, street, zip, city FROM contacts").fetchall()}
    G, reihe = {}, []
    for z in zeilen:
        w = {}
        for i, f in enumerate(S):
            if f and i < len(z) and z[i]:
                w[f] = (w[f] + " " + z[i]) if f in w and f == "nachname" else w.get(f) or z[i]
        if not any(w.get(f) for f in ("firma", "person", "nachname", "mail", "tel", "mobil")):
            continue
        gw = w.get("gewerk", "")
        bauherr = bool(re.match(r"\s*bauherr", gw, re.I))
        # Nachname nur, wenn die Spalte der Person leer ist – in der Liste des Büros steht dort „nicht eintragen, wird automatisch erzeugt“,
        # bei manchen Zeilen aber nur dort der Name („Hr. Böttrich“); bis 23.11.2026 fiel er weg und die Person hieß „Ansprechpartner:in“
        anrede, titel, person, zusatz = K.person_zerlegen(w.get("person") or w.get("nachname", ""))
        name = (w.get("firma") or person or "").strip()[:200]
        behoerde = bool(_BEHOERDE.match(name)) and not bauherr
        if not name:
            continue
        key = K.name_norm(name) or name.lower()
        k = G.get(key)
        if not k:
            plz, ort = _plzort(w.get("plzort", "")) if w.get("plzort") else (w.get("plz", ""), w.get("ort", ""))
            k = G[key] = {"name": name, "art": "bauherr" if bauherr else "behoerde" if behoerde else "", "gewerke": [], "street": w.get("strasse", "")[:200],
                          "zip": plz[:20], "city": ort[:200], "website": w.get("web", "")[:300], "personen": [], "mails": [], "tel": [],
                          "projekte": [], "projektnr": [], "notizen": [], "zeilen": 0}
            reihe.append(key)
        k["zeilen"] += 1
        if gw and not bauherr and k["art"] != "behoerde" and gw.lower() not in [x.lower() for x in k["gewerke"]]:
            k["gewerke"].append(gw[:80])
        mails = _MAIL.findall(w.get("mail", ""))
        p = {"anrede": anrede, "titel": titel, "name": person if person != name else "", "zusatz": zusatz, "tel": w.get("tel", ""), "mobil": w.get("mobil", ""),
             "mail": mails[0] if mails else "", "funktion": w.get("funktion", ""), "amt": gw if k["art"] == "behoerde" else "",
             "projekt": [x.upper() for x in _PROJ.findall(w.get("projekt", ""))]}   # Behörde: Gewerk-Spalte = Amt (BH-1)
        if k["art"] == "bauherr" and not w.get("firma") and not k["personen"]:   # Bauherr:in = Person (BH-4): Anrede, Titel, Zusatz gehören zum Kontakt selbst
            k["person"] = {"anrede": anrede, "titel": titel, "zusatz": zusatz}
        if any(v for f, v in p.items() if f != "projekt"):
            k["personen"].append(p)
        for m in mails[1:]:
            if m not in k["mails"]:
                k["mails"].append(m)
        if w.get("fax") and not re.search(r"\d{3}", w["fax"]):   # in der Fax-Spalte steht keine Nummer (z. B. ein Name) → Notiz, nicht als Fax
            w["notiz"] = " · ".join(x for x in (w.get("notiz"), "Fax-Spalte: " + w["fax"]) if x)
        elif w.get("fax") and w["fax"] not in k["tel"]:
            k["tel"].append(w["fax"])
        for nr in _PROJ.findall(w.get("projekt", "")):
            nr = nr.upper()
            if nr not in k["projektnr"]:
                k["projektnr"].append(nr)
                if nr in P:
                    k["projekte"].append({"nr": nr, "name": P[nr]})   # nur fürs Anzeigen
        if w.get("notiz") and w["notiz"] not in k["notizen"]:
            k["notizen"].append(w["notiz"])
        for f, ziel in (("strasse", "street"), ("web", "website")):   # Angaben der ersten Zeile, die sie hat
            if w.get(f) and not k[ziel]:
                k[ziel] = w[f][:300]
    out = []
    for key in reihe:
        k = G[key]
        a = alt.get(key)
        k["schon"] = {"id": a["id"], "name": a["name"]} if a else None
        k["aktion"] = "ergaenzen" if a else "neu"
        out.append(k)
    return out, summe(out)


def summe(L):
    n = {"neu": 0, "ergaenzen": 0, "ueberspringen": 0, "doppelt": 0}
    for k in L:
        n[k.get("aktion", "neu")] = n.get(k.get("aktion", "neu"), 0) + 1
    return n


def _felder(k):
    """Kontakt aus der Vorschau → Spalten, weitere Angaben, Firma (Anrede/Titel/Zusatz der Person, Amt) und Projektnummern – wie die Kontaktmaske sie schreibt"""
    P = k.get("personen") or []
    p0 = P[0] if P else {}
    bh = k.get("art") == "bauherr" and k.get("person") is not None   # Bauherr:in als Person: die Person ist der Kontakt selbst (BH-4)
    d = {"name": k["name"][:200], "trade": ", ".join(k.get("gewerke") or [])[:300], "contact_person": "" if bh else (p0.get("name") or "")[:200],
         "role": (p0.get("funktion") or "")[:200], "phone": (p0.get("tel") or "")[:100], "mobile": (p0.get("mobil") or "")[:100],
         "email": (p0.get("mail") or "")[:200], "website": (k.get("website") or "")[:300], "street": (k.get("street") or "")[:200],
         "zip": (k.get("zip") or "")[:20], "city": (k.get("city") or "")[:200], "notes": "\n".join(k.get("notizen") or [])[:5000],
         "art": k.get("art") if k.get("art") in ("bauherr", "behoerde") else ""}
    if d["website"] and not re.match(r"https?://", d["website"], re.I):
        d["website"] = "https://" + d["website"]
    q = k.get("person") if bh else p0
    F = {"ap_anrede": q.get("anrede") or "", "ap_titel": q.get("titel") or "", "ap_zusatz": q.get("zusatz") or "", "amt": p0.get("amt") or "",
         "ist_firma": "ja" if k.get("art") == "bauherr" and not bh else ""}   # Bauherr:in mit Firmenspalte (Hausverwaltung, WEG) = Firma mit Ansprechpartner:in
    W = []
    for p in P[1:]:
        if p.get("name") or p.get("tel") or p.get("mobil") or p.get("mail"):
            # kein Platzhalter als Name (bis 23.11.2026 „Ansprechpartner:in“); Funktion, sonst die Projektnummer der Zeile; Telefon UND Mobil bleiben
            W.append({"typ": "person", "wert": p.get("name") or "", "anrede": p.get("anrede") or "", "titel": p.get("titel") or "", "zusatz": p.get("zusatz") or "",
                      "amt": p.get("amt") or "", "tel": p.get("tel") or p.get("mobil") or "", "mail": p.get("mail") or "",
                      "bez": p.get("funktion") or ("Projekt " + ", ".join(p["projekt"]) if p.get("projekt") else "")})
            if p.get("tel") and p.get("mobil"):
                W.append({"typ": "tel", "bez": ((p.get("name") or "") + " mobil").strip(), "wert": p["mobil"]})
    for m in k.get("mails") or []:
        W.append({"typ": "mail", "wert": m})
    for t in k.get("tel") or []:
        W.append({"typ": "tel", "bez": "Fax", "wert": t})
    return d, K.weitere_bereinigen(W), {x: v for x, v in K.firma_bereinigen(F).items() if v}, K.projektnr_bereinigen(k.get("projektnr") or [])


def _ersetzt(a, w, W):
    """Person aus einem früheren Einlesen ohne Namen (leer oder Platzhalter) und dieselbe Nummer bzw. Mail wie die neue mit Namen?
    Früher stand bei Telefon und Mobil nur das Mobil an der Person – das steht jetzt als „<Name> mobil“ daneben."""
    if not (a.get("typ") == "person" == w["typ"] and w.get("wert") and (a.get("wert") or "") in ("", K.PLATZHALTER)):
        return False
    nr = {w.get("tel")} | {x["wert"] for x in W if x["typ"] == "tel" and x.get("bez") == w["wert"] + " mobil"}
    return bool((a.get("tel") and a["tel"] in nr) or (a.get("mail") and a.get("mail") == w.get("mail")))


def einlesen(c, L, wer):
    """Anlegen bzw. ergänzen; Antwort mit dem Stand für Rückgängig (neue Kennungen, vorige Zeilen der ergänzten)."""
    jetzt = datetime.now().isoformat(timespec="seconds")
    neu, ergaenzt, vorher = [], [], []
    namen = {K.name_norm(r["name"]): r["id"] for r in c.execute("SELECT id, name FROM contacts").fetchall()}
    for k in L:
        akt = k.get("aktion") or "neu"
        if akt == "ueberspringen" or not str(k.get("name") or "").strip():
            continue
        d, W, FI, P = _felder(k)
        ziel = namen.get(K.name_norm(d["name"])) if akt == "ergaenzen" else None
        if ziel:
            r = c.execute("SELECT * FROM contacts WHERE id=?", (ziel,)).fetchone()
            ex = K._json(r["extra"])
            vorher.append({"id": ziel, "zeile": {f: r[f] for f in d}, "extra": r["extra"]})
            ch = {f: v for f, v in d.items() if v and not (r[f] or "").strip()}
            alt_w = ex.get("weitere") or []
            alt_w = [a for a in alt_w if not any(_ersetzt(a, w, W) for w in W)]   # ohne Namen eingelesene Person (Platzhalter) → durch dieselbe mit Namen ersetzen
            dazu = [w for w in W if w not in alt_w and not (w["typ"] == "person" and w.get("wert") and any(a.get("typ") == "person" and a.get("wert") == w["wert"] for a in alt_w))]
            pj = [p for p in P if p not in (ex.get("projektnr") or [])]
            fi = {f: v for f, v in FI.items() if not (ex.get("firma") or {}).get(f)}
            if dazu or pj or fi:
                ex["weitere"] = K.weitere_bereinigen(alt_w + dazu)
                if pj:
                    ex["projektnr"] = (ex.get("projektnr") or []) + pj
                if fi:
                    ex["firma"] = {**(ex.get("firma") or {}), **fi}
                ch["extra"] = json.dumps(ex, ensure_ascii=False)
            if ch:
                c.execute(f"UPDATE contacts SET {', '.join(f + '=?' for f in ch)}, updated=? WHERE id=?", (*ch.values(), jetzt, ziel))
                ergaenzt.append(ziel)
            continue
        name = d["name"]
        if akt == "doppelt" or K.name_norm(name) in namen:   # Name gibt es schon (eindeutig in der Datenbank): mit Zähler anlegen
            i = 2
            while K.name_norm(f"{name} ({i})") in namen:
                i += 1
            d["name"] = f"{name} ({i})"[:200]
        ex = {**({"weitere": W} if W else {}), **({"firma": FI} if FI else {}), **({"projektnr": P} if P else {})}
        cols = list(d) + ["extra", "created", "updated"]
        cid = c.execute(f"INSERT INTO contacts({', '.join(cols)}) VALUES({', '.join('?' * len(cols))}) RETURNING id",
                        (*d.values(), json.dumps(ex, ensure_ascii=False), jetzt, jetzt)).fetchone()[0]
        namen[K.name_norm(d["name"])] = cid
        neu.append(cid)
    return {"neu": len(neu), "ergaenzt": len(ergaenzt), "stand": {"neu": neu, "vorher": vorher, "wer": wer}}


def zurueck(c, st):
    """Rückgängig: neue Kontakte weg (nur, solange nichts sie benutzt), ergänzte wie vorher."""
    weg, blieb = 0, 0
    for i in st.get("neu") or []:
        if not isinstance(i, int):
            continue
        if K.usage(c, i):
            blieb += 1
            continue
        weg += c.execute("DELETE FROM contacts WHERE id=?", (i,)).rowcount
    for v in st.get("vorher") or []:
        z = v.get("zeile") or {}
        f = [k for k in z if k in K.FELDER]
        if isinstance(v.get("id"), int) and f:
            c.execute(f"UPDATE contacts SET {', '.join(k + '=?' for k in f)}, extra=? WHERE id=?", (*(z[k] for k in f), v.get("extra") or "{}", v["id"]))
    return {"weg": weg, "blieb": blieb}
