"""Angebotsbesprechung aus den Daten (GO 18.11.2026, Mock „Angebotsbesprechung aus den Daten“: A1 · B1 · C1).

Jedes Feld des Protokolls hat eine Quelle: Projektdaten (Bauherr:in, Objektplanung, Baustelle), Bürodaten, Adressen (Bieter:in mit
Firma: Rechtsform, Sitz, HRB, Mitarbeiter:innen – contacts.extra.firma), Angebot (Datum, Bindefrist, Ansprechperson), LV-Daten
(Bindefrist, Gewerk, Kostengruppe, Vertragsart, Ausführung, Vertragsbedingungen), Auftragsdaten (nach der Vergabe) und Bauzeitenplan.

  quellen(c, lv, a, D)   {„bereich.feld“: {w: Wert, q: Quelle}} – was die Daten heute sagen
  abgleich(c, r)         B1: solange das Protokoll Entwurf ist, folgt ein Feld seiner Quelle; ist es von Hand überschrieben und
                         ändert sich die Quelle, bleibt der Text und es gibt einen Hinweis („… geändert – übernehmen?“).
                         Gemerkt wird je Feld der zuletzt übernommene Wert der Quelle (data._q).
  rueckweg(c, r)         A1: beim Abschließen, was im Gespräch geklärt wurde und zurück in Adressen / Auftragsdaten gehen kann – je Zeile
                         ein Haken; anwenden() schreibt die gewählten, data._rueckweg hält die alten Werte für Rückgängig.

GET  /api/vergabedok/<vid>/rueckweg            Zeilen für die Liste vor dem Abschließen
POST /api/vergabedok/<vid>/rueckweg/zurueck    übernommene Angaben zurücknehmen (Rückgängig)
"""
import json
import re
from datetime import date

from flask import g, jsonify

from bpcore import contacts, db, stammdaten, versionen, vorlagen
from bpcore.jsonwert import lies as _j
from ava import _lv, _now, app
import ava_vergabe as V
import common as C

PREIS = {   # Vertragsart (LV- bzw. Auftragsdaten) → Satz im Protokoll
    "Einheitspreisvertrag (VOB/B)": "Die Leistungen werden nach Einheitspreisen abgerechnet.",
    "Pauschalvertrag (VOB/B)": "Die Leistungen werden zum Pauschalpreis vergütet (§ 2 Abs. 7 VOB/B).",
    "Stundenlohnvertrag": "Die Leistungen werden nach Stundenlohn abgerechnet (§ 2 Abs. 10, § 15 VOB/B), Nachweis durch Stundenzettel.",
    "BGB-Werkvertrag": "Die Leistungen werden nach Einheitspreisen abgerechnet (Werkvertrag nach BGB).",
}
PREIS_VORGABE = "Die Leistungen werden nach Einheitspreisen abgerechnet."
FELD = {   # Beschriftung je Feld – für Hinweise und die Liste beim Abschließen
    "kopf.bauvorhaben": "Bauvorhaben", "kopf.bauherr": "Bauherr:in / AG", "kopf.architekt": "Architekt:in", "kopf.bieter": "Bieter:in / AN",
    "bieterangaben.rechtsform": "Rechtsform / Sitz", "bieterangaben.mitarbeiter": "Mitarbeiter:innen", "bieterangaben.mitarbeiter_projekt": "Mitarbeiter:innen fürs Projekt",
    "bieterangaben.bauleiter": "Bauleiter:in", "bieterangaben.subunternehmer": "Subunternehmer",
    "angebot.gueltig": "Gültigkeit", "angebot.angebot_vom": "Angebot vom", "angebot.gewerke": "Gewerke", "angebot.preis": "Preis",
    "termine.beginn": "Beginn", "termine.fertig": "Fertigstellung", "termine.unterbrechung": "Unterbrechung", "termine.bauzeitenplan": "Bauzeitenplan",
    **{"grundlagen." + k: t for k, t, _ in V.GRUNDLAGEN},
}


def _k(c, kid):
    return c.execute("SELECT * FROM contacts WHERE id=?", (kid,)).fetchone() if str(kid or "").isdigit() else None


def bauherr(c, P, p):
    """Bauherr:in aus den Projektdaten – Anschrift, vertreten durch, Ansprechpartner:in, öffentliche:r AG (auch für den Bauvertrag)."""
    bh = _k(c, P.get("bauherr_kid"))
    z = [V._adresse(bh) if bh else (P.get("bauherr") or (p["client"] if p is not None else "") or "")]
    if P.get("bh_vertreter"):
        z.append(f"vertreten durch {P['bh_vertreter']}")
    if P.get("bh_ansprech") and P.get("bh_ansprech") != P.get("bauherr"):
        z.append(f"Ansprechpartner:in: {P['bh_ansprech']}")
    if P.get("bh_oeffentlich"):
        z.append("öffentliche:r Auftraggeber:in")
    return "\n".join(x for x in z if x)


def quellen(c, lv, a, D=None, cache=None):
    """Was die Daten heute für jedes Feld sagen → {key: {w, q}}; leere Quellen fehlen. cache: je Abfrage geteilte Projektangaben."""
    D, K = D or {}, cache if cache is not None else {}
    pid = lv["project_id"]
    if "P" not in K:
        K["P"] = stammdaten.projekt_lesen(c, pid) if pid else {}
        K["p"] = c.execute("SELECT name, client, street, zip, city FROM projects WHERE id=?", (pid,)).fetchone() if pid else None
        K["buero"] = V._buero(c)
        K["vorgaben"] = V.vorgaben(c)
    P, p, (S, buero) = K["P"], K["p"], K["buero"]
    Q = {}

    def setz(key, wert, q):
        wert = str(wert or "").strip()
        if wert:
            Q[key] = {"w": wert, "q": q}
    k, AD = _k(c, a["contact_id"]), _j(a["daten"], {}) or {}
    import ava_ebenen
    M, MQ, _ = ava_ebenen.aufloesen(c, lv, K)   # Angaben des LV, sonst des Projekts, sonst des Büros
    Vg = _j(lv["vergabe"], {}) or {}
    AU = (Vg.get("auftrag") or {}) if Vg.get("angebot_id") == a["id"] and not Vg.get("aufgehoben") else {}
    # Protokoll
    setz("kopf.bauvorhaben", vorlagen.bauvorhaben(p), "Projektdaten")
    setz("kopf.bauherr", bauherr(c, P, p), "Projektdaten")
    ob = _k(c, P.get("objektplanung_kid"))
    setz("kopf.architekt", V._adresse(ob) if ob else buero, "Projektdaten" if ob else "Bürodaten")
    ap = _k(c, AD.get("ansprech_kid"))
    bieter = V._adresse(k, True) if k else a["bieter"]
    person = (ap["name"] if ap else AD.get("ansprech")) or (k["contact_person"] if k else "")
    if person and person not in bieter:
        bieter += f"\nAnsprechpartner:in: {person}"
    setz("kopf.bieter", bieter, "Adressen")
    # Bieter:in
    F = contacts.firma(k) if k else {}
    setz("bieterangaben.rechtsform", contacts.firma_text(F), "Adressen")
    setz("bieterangaben.mitarbeiter", F.get("mitarbeiter"), "Adressen")
    setz("bieterangaben.mitarbeiter_projekt", AU.get("mitarbeiter_projekt"), "Auftragsdaten")
    setz("bieterangaben.bauleiter", AU.get("bauleiter_an"), "Auftragsdaten")
    setz("bieterangaben.subunternehmer", AU.get("subunternehmer"), "Auftragsdaten")
    # Angebot
    bf = AD.get("bindefrist") or M.get("bindefrist")
    if bf:
        setz("angebot.gueltig", f"ja, gebunden bis {V._de(bf)}", "Angebot" if AD.get("bindefrist") else "LV-Daten")
    setz("angebot.angebot_vom", AD.get("angebotsdatum") or a["eingang"], "Angebot")
    kg = str(M.get("kg") or "").strip()
    setz("angebot.gewerke", " · ".join(x for x in (lv["gewerk"] or lv["name"], f"KG {kg}" if kg else "") if x), "LV-Daten")
    va = AU.get("vertragsart") or M.get("vertragsart") or ""
    setz("angebot.preis", PREIS.get(va) or PREIS_VORGABE, "Auftragsdaten" if AU.get("vertragsart") else "LV-Daten" if va else "Vorgabe")
    # Termine: Bauzeitenplan, sonst LV-Daten (Ausführung); nach der Vergabe die vertraglichen Termine
    T = V._termine(c, pid, lv["gewerk"], lv["name"], (D.get("termine") or {}).get("plan_id"), a["contact_id"]) if pid else {}
    for f in ("beginn", "fertig", "unterbrechung", "bauzeitenplan"):
        setz("termine." + f, T.get(f), "Bauzeitenplan")
    for f, lvk, auk in (("beginn", "ausf_beginn", "beginn"), ("fertig", "ausf_ende", "ende")):
        if AU.get(auk):
            setz("termine." + f, V._de(AU[auk]), "Auftragsdaten")
        elif "termine." + f not in Q:
            setz("termine." + f, V._de(M.get(lvk)), "LV-Daten")
    Q["_plan"] = {k2: T[k2] for k2 in ("plan_id", "plan_stand") if T.get(k2)}
    zeile = lambda x: ", ".join(y for y in (x["street"], " ".join(z for z in (x["zip"], x["city"]) if z)) if y) if x is not None else ""   # noqa: E731
    bs = _k(c, P.get("baustelle_kid"))
    Q["_vor"] = {   # Auswahl im Protokoll: Ort (Büro, Baustelle, Bieter:in) und Teilnehmer:innen aus Projektdaten und Angebot
        "kopf.ort": [x for x in (f"Büro {S.get('co_short') or S.get('office_name', '')}, {S.get('co_street', '')}, {S.get('co_zip', '')} {S.get('co_city', '')}".replace(", , ", ", ").strip(" ,"),
                                 f"Baustelle, {zeile(bs)}" if bs is not None and zeile(bs) else "", f"bei der Bieter:in, {zeile(k)}" if k is not None and zeile(k) else "", "Videokonferenz") if x],
        "kopf.teilnehmer": [x for x in (C.full_name(g.user) or g.user["name"], P.get("bauleitung"), P.get("objektplanung"), P.get("bh_ansprech") or P.get("bauherr"),
                                        f"{person} ({a['bieter']})" if person else f"Vertreter:in von {a['bieter']}") if x],
    }
    # Grundlagen: Vertragsbedingungen des LV (eigene, vom Projekt oder vom Büro); Zahlungsfrist aus den Auftragsdaten
    G, LVG = K["vorgaben"], V.vb_aus({k: v for k, v in M.items() if MQ.get(k) in ("lv", "projekt")})
    for key, _, _ in V.GRUNDLAGEN:
        if key in LVG:
            setz("grundlagen." + key, LVG[key], "LV-Daten" if MQ.get("vb_" + key) == "lv" else "Projektdaten")
        elif key == "zahlungsfrist" and str(AU.get("zahlungsfrist") or "").strip():
            setz("grundlagen.zahlungsfrist", f"{AU['zahlungsfrist']} Tage nach Zugang der prüfbaren Rechnung", "Auftragsdaten")
        elif key != "einbehalt_abl" or G.get(key):
            setz("grundlagen." + key, G.get(key), "Bürodaten")
    return Q


def _feld(D, key):
    b, f = key.split(".", 1)
    return str((D.get(b) or {}).get(f) or "")


def _setz(D, key, w):
    b, f = key.split(".", 1)
    D[b] = {**(D.get(b) or {}), f: w}


def _angebot(c, r):
    return c.execute("SELECT * FROM ava_angebot WHERE id=?", (r["angebot_id"],)).fetchone() if r["angebot_id"] else None


def neu(c, lv, a):
    """Daten eines neuen Protokolls aus den Quellen (ersetzt die feste Vorbelegung) – mit _q."""
    Q = quellen(c, lv, a)
    Q.pop("_vor", None)
    D = {"kopf": {"datum": date.today().isoformat(), "uhrzeit": "", "teilnehmer": C.full_name(g.user) or g.user["name"]},
         "bieterangaben": {}, "angebot": {}, "termine": dict(Q.pop("_plan", {})), "grundlagen": {}, "sonstiges": "", "_q": {}}
    S, _ = V._buero(c)
    D["kopf"]["ort"] = f"Büro {S.get('co_short') or S.get('office_name', '')}".strip()
    for key, x in Q.items():
        _setz(D, key, x["w"])
        D["_q"][key] = x["w"]
    return D


def abgleich(c, r, cache=None, schreiben=True):
    """B1: Entwurf einer Besprechung den Quellen nachführen. → (Daten, Quellen-Beschriftung je Feld, Hinweise, Auswahl je Feld)"""
    D = _j(r["data"], {}) or {}
    if r["art"] != "besprechung" or r["status"] != "entwurf":
        return D, {}, [], {}
    lv, a = _lv(c, r["lv_id"]), _angebot(c, r)
    if not lv or not a:
        return D, {}, [], {}
    Q = quellen(c, lv, a, D, cache)
    plan, vor = Q.pop("_plan", {}), Q.pop("_vor", {})
    alt, H, ql, geaendert = dict(D.get("_q") or {}), [], {}, False
    T = D.get("termine") or {}
    if plan and not T.get("plan_id"):
        D["termine"] = {**T, **plan}
        geaendert = True
    for key, x in Q.items():
        jetzt, q0 = _feld(D, key), alt.get(key)
        if q0 == x["w"] and jetzt == x["w"]:
            ql[key] = x["q"]
            continue
        if q0 == x["w"]:   # Quelle unverändert, Feld von Hand geändert
            continue
        if not jetzt.strip() or jetzt == x["w"] or (q0 is not None and jetzt == q0):   # leer, gleich oder noch der alte Stand der Quelle: folgt ihr
            if jetzt != x["w"]:
                _setz(D, key, x["w"])
            alt[key] = x["w"]
            ql[key] = x["q"]
            geaendert = True
        else:   # von Hand überschrieben und die Quelle sagt etwas anderes
            H.append({"key": key, "feld": FELD.get(key, key), "q": x["q"], "neu": x["w"], "jetzt": jetzt})
    if geaendert:
        D["_q"] = alt
        if schreiben:
            c.execute("UPDATE ava_vergabedok SET data=? WHERE id=?", (json.dumps(D, ensure_ascii=False), r["id"]))
    return D, ql, H, vor


def quelle_antwort(c, r, D, was):
    """Hinweis beantworten: {key: „uebernehmen“ | „behalten“} – übernehmen setzt den Wert der Quelle, beides merkt sich den neuen Stand."""
    lv, a = _lv(c, r["lv_id"]), _angebot(c, r)
    if not lv or not a or not isinstance(was, dict):
        return D
    Q, alt = quellen(c, lv, a, D), dict(D.get("_q") or {})
    Q.pop("_vor", None), Q.pop("_plan", None)
    for key, w in was.items():
        if key in Q and key in FELD:
            if w == "uebernehmen":
                _setz(D, key, Q[key]["w"])
            alt[key] = Q[key]["w"]
    D["_q"] = alt
    return D


# ---------------------------------------------------------------- A1: Rückweg beim Abschließen
def _datum(t, ende=False):
    """„12.03.2027“, „2027-03-12“ oder „KW 10/2027“ → ISO-Datum (KW: Montag bzw. beim Ende Freitag)."""
    t = str(t or "")
    m = re.search(r"(\d{4})-(\d{2})-(\d{2})", t) or None
    if m:
        return m.group(0)
    m = re.search(r"(\d{1,2})\.(\d{1,2})\.(\d{4})", t)
    if m:
        return f"{m.group(3)}-{int(m.group(2)):02d}-{int(m.group(1)):02d}"
    m = re.search(r"KW\s*(\d{1,2})\s*/\s*(\d{4})", t, re.I)
    if m:
        try:
            return date.fromisocalendar(int(m.group(2)), int(m.group(1)), 5 if ende else 1).isoformat()
        except ValueError:
            return ""
    return ""


def _vertragsart(t, jetzt):
    t = str(t or "")
    if re.search(r"pauschal", t, re.I):
        return "Pauschalvertrag (VOB/B)"
    if re.search(r"stundenlohn", t, re.I) and not re.search(r"einheitspreis", t, re.I):
        return "Stundenlohnvertrag"
    if re.search(r"einheitspreis", t, re.I):
        return jetzt if jetzt in ("Einheitspreisvertrag (VOB/B)", "BGB-Werkvertrag") else "Einheitspreisvertrag (VOB/B)"
    return ""


def _mitarbeiter(t):
    m = re.search(r"\d[\d.]*", str(t or ""))
    return m.group(0).replace(".", "") if m else str(t or "").strip()


def rueckweg(c, r):
    """Zeilen für „Diese Angaben gehen in Adressen / Auftragsdaten“ → (zeilen, hinweis). Zeile: {id, ziel, feld, alt, neu}."""
    D = _j(r["data"], {}) or {}
    lv, a = _lv(c, r["lv_id"]), _angebot(c, r)
    if not lv or not a:
        return [], ""
    B, T, G, A = (D.get(x) or {} for x in ("bieterangaben", "termine", "grundlagen", "angebot"))
    Z = []
    k = _k(c, a["contact_id"])
    if k:
        F, P = contacts.firma(k), contacts.firma_lesen(B.get("rechtsform"))
        if str(B.get("rechtsform") or "").strip() and contacts.firma_text({**F, **P}) != contacts.firma_text(F):
            Z.append({"id": "firma", "ziel": f"Adressen · {k['name']}", "feld": "Rechtsform / Sitz / Handelsregister", "alt": contacts.firma_text(F), "neu": contacts.firma_text({**F, **P})})
        ma = _mitarbeiter(B.get("mitarbeiter"))
        if ma and ma != F.get("mitarbeiter"):
            Z.append({"id": "mitarbeiter", "ziel": f"Adressen · {k['name']}", "feld": "Mitarbeiter:innen", "alt": F.get("mitarbeiter") or "", "neu": ma})
    Vg = _j(lv["vergabe"], {}) or {}
    if Vg.get("angebot_id") != a["id"] or Vg.get("aufgehoben"):
        return Z, f"Noch nicht an {a['bieter']} vergeben – Bauleiter:in, Subunternehmer, Termine, Vertragsart und Zahlungsfrist gehen erst nach der Vergabe in die Auftragsdaten (dann „Wieder öffnen“ und erneut abschließen)."
    import ava_ebenen
    AU, M = Vg.get("auftrag") or {}, ava_ebenen.aufloesen(c, lv)[0]
    ziel = f"Auftragsdaten · LV {lv['nr']} {lv['name']}".strip()
    neu = {
        "mitarbeiter_projekt": str(B.get("mitarbeiter_projekt") or "").strip(),
        "bauleiter_an": str(B.get("bauleiter") or "").strip(),
        "subunternehmer": "" if re.fullmatch(r"\s*(keine?|–|-)?\s*", str(B.get("subunternehmer") or ""), re.I) else str(B.get("subunternehmer") or "").strip(),
        "vertragsart": _vertragsart(A.get("preis"), AU.get("vertragsart") or M.get("vertragsart") or ""),
        "beginn": _datum(T.get("beginn")), "ende": _datum(T.get("fertig"), ende=True),
        "zahlungsfrist": (re.search(r"\d+", str(G.get("zahlungsfrist") or "")) or [""])[0],
    }
    namen = {f[0]: f[1] for _, F in stammdaten.AUFTRAG for f in F}
    for key, w in neu.items():
        if w and w != str(AU.get(key) or ""):
            anz = (lambda x: V._de(x)) if key in ("beginn", "ende") else (lambda x: x)
            Z.append({"id": "au." + key, "ziel": ziel, "feld": namen.get(key, key), "alt": anz(str(AU.get(key) or "")), "neu": anz(w), "wert": w})
    return Z, ""


def anwenden(c, r, D, ids):
    """Gewählte Zeilen schreiben; alte Werte in D._rueckweg (Rückgängig). → Liste „was übernommen“."""
    Z, _ = rueckweg(c, r)
    Z = [z for z in Z if z["id"] in set(ids or [])]
    if not Z:
        return []
    lv, a = _lv(c, r["lv_id"]), _angebot(c, r)
    zurueck, out = {}, []
    kz = [z for z in Z if z["id"] in ("firma", "mitarbeiter")]
    k = _k(c, a["contact_id"]) if kz else None
    if k:
        ex = json.loads(k["extra"] or "{}") or {}
        F = contacts.firma(k)
        zurueck["kontakt"] = {"id": k["id"], "firma": dict(F)}
        for z in kz:
            if z["id"] == "firma":
                F.update(contacts.firma_lesen(_j(r["data"], {}).get("bieterangaben", {}).get("rechtsform")))
            else:
                F["mitarbeiter"] = z["neu"]
        versionen.vor(c, f"kontakt:{k['id']}")
        ex["firma"] = contacts.firma_bereinigen(F)
        c.execute("UPDATE contacts SET extra=?, updated=? WHERE id=?", (json.dumps(ex, ensure_ascii=False), _now(), k["id"]))
        versionen.nach(c, f"kontakt:{k['id']}", g.user["name"])
        out.append(f"Adressen ({k['name']}): " + ", ".join(z["feld"] for z in kz))
    az = [z for z in Z if z["id"].startswith("au.")]
    if az:
        Vg = _j(lv["vergabe"], {}) or {}
        AU = dict(Vg.get("auftrag") or {})
        zurueck["auftrag"] = {z["id"][3:]: AU.get(z["id"][3:]) for z in az} | ({"bauleiter_an_kid": AU.get("bauleiter_an_kid")} if any(z["id"] == "au.bauleiter_an" for z in az) else {})
        werte = {z["id"][3:]: z["wert"] for z in az}
        if "bauleiter_an" in werte:   # Kontaktfeld: mit gleichnamigem Kontakt verbinden, sonst nur der Name
            m = c.execute("SELECT id FROM contacts WHERE lower(name)=lower(?)", (werte["bauleiter_an"],)).fetchone()
            werte["bauleiter_an_kid"] = m["id"] if m else None
        versionen.vor(c, f"avalv:{lv['id']}")
        Vg["auftrag"] = stammdaten.bereinigen(stammdaten.AUFTRAG, werte, AU)
        c.execute("UPDATE ava_lv SET vergabe=?, updated=?, updated_by=? WHERE id=?", (json.dumps(Vg, ensure_ascii=False), _now(), g.user["name"], lv["id"]))
        versionen.nach(c, f"avalv:{lv['id']}", g.user["name"])
        out.append("Auftragsdaten: " + ", ".join(z["feld"] for z in az))
    D["_rueckweg"] = zurueck
    return out


@app.get("/api/vergabedok/<int:vid>/rueckweg")
def rw_liste(vid):
    with db.tx() as c:
        r = V._dok(c, vid)
        if not r or r["art"] != "besprechung":
            return jsonify(error="Nicht gefunden"), 404
        Z, h = rueckweg(c, r)
        return jsonify(zeilen=Z, hinweis=h)


@app.post("/api/vergabedok/<int:vid>/rueckweg/zurueck")
def rw_zurueck(vid):
    """Rückgängig: übernommene Angaben in Adressen und Auftragsdaten auf den Stand davor."""
    with db.tx() as c:
        r = V._dok(c, vid)
        if not r:
            return jsonify(error="Nicht gefunden"), 404
        D = _j(r["data"], {}) or {}
        R = D.pop("_rueckweg", None) or {}
        kt = R.get("kontakt") or {}
        k = _k(c, kt.get("id"))
        if k:
            ex = json.loads(k["extra"] or "{}") or {}
            ex["firma"] = contacts.firma_bereinigen(kt.get("firma"))
            c.execute("UPDATE contacts SET extra=?, updated=? WHERE id=?", (json.dumps(ex, ensure_ascii=False), _now(), k["id"]))
        if R.get("auftrag"):
            lv = _lv(c, r["lv_id"])
            Vg = _j(lv["vergabe"], {}) or {}
            AU = dict(Vg.get("auftrag") or {})
            for key, w in R["auftrag"].items():
                if w in (None, ""):
                    AU.pop(key, None)
                else:
                    AU[key] = w
            Vg["auftrag"] = AU
            c.execute("UPDATE ava_lv SET vergabe=?, updated=?, updated_by=? WHERE id=?", (json.dumps(Vg, ensure_ascii=False), _now(), g.user["name"], lv["id"]))
        c.execute("UPDATE ava_vergabedok SET data=? WHERE id=?", (json.dumps(D, ensure_ascii=False), vid))
        C.audit(g.user["name"], "ava", "Angebotsbesprechung: Übernahme zurückgenommen", f"Protokoll {vid}")
        return V._antwort(c, r["lv_id"])
