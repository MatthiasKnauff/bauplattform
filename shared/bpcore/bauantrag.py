"""Bauantrag (App „Bauantrag“): Felder, Quellen, Bauvorlagen und PDF.

Ein Antrag speichert nur, was von Hand eingetragen oder geändert wurde (daten). Alles andere kommt jedes Mal frisch aus den Quellen:
Projektdaten (Bauherr, Grundstück, Beschreibung – bpcore/stammdaten), Adressen (Anschrift, Telefon, E-Mail der Kontakte), Baukosten
(gültige Kostenermittlung: KG 300/400, Fläche), Büro-Einstellungen und Mein Konto (Entwurfsverfasser/in). So sieht man je Feld,
woher der Wert stammt, und kann ihn jederzeit auf die Quelle zurücksetzen.
Ausgabe: das amtliche Formular des Landes (bpcore/bauantrag_formulare.py), mit den Werten ausgefüllt – nichts im eigenen Layout.
"""
import json
import re

VERFAHREN = {"baugenehmigung": "Antrag auf Baugenehmigung", "vorbescheid": "Antrag auf Vorbescheid", "freistellung": "Genehmigungsfreistellung – Bauvorlagen"}
SCHRITTE = [("verfahren", "Verfahren & Formulare"), ("beteiligte", "Beteiligte"), ("grundstueck", "Grundstück"), ("vorhaben", "Vorhaben & Kenndaten"),
            ("bauvorlagen", "Bauvorlagen"), ("pruefen", "Prüfen & PDF")]
JA_NEIN = ["", "ja", "nein"]

# (Schlüssel, Bezeichnung, Schritt, Typ, Optionen, Pflicht)
FELDER = [
    ("verfahren", "Verfahren", "verfahren", "select", [[k, v] for k, v in VERFAHREN.items()], True),
    ("verfahrensart", "Verfahrensart", "verfahren", "select", ["", "vereinfachtes Genehmigungsverfahren", "Genehmigungsverfahren für Sonderbauten"], False),
    ("behoerde", "Untere Bauaufsichtsbehörde", "verfahren", "text", "", True),
    ("bauherr_name", "Bauherrschaft – Name / Firma", "beteiligte", "text", "", True),
    ("bauherr_vertreter", "vertreten durch", "beteiligte", "text", "", False),
    ("bauherr_anschrift", "Anschrift der Bauherrschaft", "beteiligte", "text", "", True),
    ("bauherr_tel", "Telefon", "beteiligte", "text", "", False),
    ("bauherr_mail", "E-Mail", "beteiligte", "text", "", False),
    ("ev_wahl", "Entwurfsverfasser/in", "beteiligte", "wahl", [["persoenlich", "persönlich"], ["buero", "Büro"]], True),
    ("ev_name", "Name, Vorname / Büro", "beteiligte", "text", "", True),
    ("ev_beruf", "Berufsbezeichnung", "beteiligte", "text", "", True),
    ("ev_kammer", "Kammer", "beteiligte", "text", "", False),
    ("ev_kammernr", "Mitgliedsnummer", "beteiligte", "text", "", True),
    ("ev_anschrift", "Anschrift (Büro)", "beteiligte", "text", "", True),
    ("ev_tel", "Telefon", "beteiligte", "text", "", False),
    ("ev_mail", "E-Mail", "beteiligte", "text", "", False),
    ("tragwerk", "Tragwerksplanung", "beteiligte", "text", "", False),
    ("gs_strasse", "Straße, Hausnummer", "grundstueck", "text", "", True),
    ("gs_ort", "PLZ, Ort", "grundstueck", "text", "", True),
    ("gemarkung", "Gemarkung", "grundstueck", "text", "", True),
    ("flur", "Flur", "grundstueck", "text", "", True),
    ("flurstueck", "Flurstück(e)", "grundstueck", "text", "", True),
    ("gs_flaeche", "Grundstücksgröße (m²)", "grundstueck", "zahl", "", False),
    ("bplan", "Bebauungsplan", "grundstueck", "text", "z. B. Nr. 7/84 „Grillostraße“ – leer = Innenbereich", False),
    ("gebiet", "Gebietsart", "grundstueck", "select", ["", "Wohngebiet (WA)", "reines Wohngebiet (WR)", "Mischgebiet (MI)", "urbanes Gebiet (MU)", "Gewerbegebiet (GE)", "Industriegebiet (GI)", "Sondergebiet (SO)", "Außenbereich"], False),
    ("baulasten", "Baulasten", "grundstueck", "select", ["", "keine bekannt", "vorhanden", "angefragt"], False),
    ("denkmal", "Denkmalschutz", "grundstueck", "select", JA_NEIN, False),
    ("bezeichnung", "Genaue Bezeichnung des Vorhabens", "vorhaben", "textarea", "", True),
    ("art", "Art", "vorhaben", "select", ["", "Errichtung", "Änderung", "Nutzungsänderung", "Erweiterung", "Abbruch"], True),
    ("gebaeudeklasse", "Gebäudeklasse", "vorhaben", "select", ["", "1", "2", "3", "4", "5"], True),
    ("sonderbau", "Sonderbau", "vorhaben", "select", JA_NEIN, True),
    ("nutzung", "Nutzung", "vorhaben", "text", "", False),
    ("grf", "Grundfläche GR (m²)", "vorhaben", "zahl", "", False),
    ("bgf", "Bruttogrundfläche BGF (m²)", "vorhaben", "zahl", "", False),
    ("bri", "Brutto-Rauminhalt BRI (m³)", "vorhaben", "zahl", "", False),
    ("nrf", "Netto-Raumfläche NRF (m²)", "vorhaben", "zahl", "", False),
    ("grz", "GRZ vorhanden", "vorhaben", "text", "", False),
    ("gfz", "GFZ vorhanden", "vorhaben", "text", "", False),
    ("geschosse", "Vollgeschosse", "vorhaben", "zahl", "", False),
    ("hoehe", "Höhe OK Gebäude (m)", "vorhaben", "zahl", "", False),
    ("we", "Wohneinheiten", "vorhaben", "zahl", "", False),
    ("st_notw", "Stellplätze notwendig", "vorhaben", "zahl", "", False),
    ("st_nachg", "Stellplätze nachgewiesen", "vorhaben", "zahl", "", False),
    ("rohbau", "Rohbaukosten (€)", "vorhaben", "eur", "", True),
    ("herstellung", "Herstellungskosten (€)", "vorhaben", "eur", "", True),
]
FK = {f[0]: f for f in FELDER}

# Bauvorlagen: (Schlüssel, Name, Stichwörter in Dateinamen, Pflicht)
BAUVORLAGEN = [
    ("antrag", "Antragsformular", (), True),
    ("liegenschaft", "Auszug aus der Liegenschaftskarte", ("liegenschaft", "flurkarte", "katasterkarte"), True),
    ("lageplan", "Amtlicher Lageplan", ("lageplan",), True),
    ("grundrisse", "Bauzeichnungen – Grundrisse 1:100", ("grundriss",), True),
    ("schnitte", "Bauzeichnungen – Schnitte", ("schnitt",), True),
    ("ansichten", "Bauzeichnungen – Ansichten", ("ansicht",), True),
    ("baubeschreibung", "Baubeschreibung", ("baubeschreibung",), True),
    ("berechnungen", "Berechnungen BRI, BGF, GRZ/GFZ", ("berechnung", "flaechenberechnung", "flächenberechnung", "bri", "bgf", "wohnflaeche", "wohnfläche"), True),
    ("statik", "Standsicherheitsnachweis", ("statik", "standsicherheit", "tragwerk", "positionsplan"), True),
    ("waerme", "Wärmeschutznachweis (GEG)", ("geg", "waermeschutz", "wärmeschutz", "energiebedarf", "enev"), True),
    ("brandschutz", "Brandschutzkonzept / -nachweis", ("brandschutz",), False),
    ("stellplatz", "Stellplatznachweis", ("stellplatz",), False),
    ("entwaesserung", "Entwässerungsantrag", ("entwaesserung", "entwässerung", "kanal"), False),
    ("statistik", "Statistischer Erhebungsbogen", ("statistik", "erhebungsbogen"), True),
]


def _j(v, d):
    try:
        x = json.loads(v) if isinstance(v, str) else v
        return d if x is None else x
    except ValueError:
        return d


def _kontakt(c, kid):
    if not kid:
        return None
    r = c.execute("SELECT * FROM contacts WHERE id=?", (kid,)).fetchone()
    return dict(r) if r else None


def _adr(k):
    if not k:
        return ""
    return ", ".join(x for x in ((k.get("street") or "").strip(), " ".join(x for x in ((k.get("zip") or "").strip(), (k.get("city") or "").strip()) if x)) if x)


def quellen(c, pid, user):
    """{feld: (wert, quelle)} – was die Plattform schon weiß. Quellen: Projekt, Adressen, Kataster (über Projektdaten), Baukosten, Büro, Konto."""
    from . import konto, stammdaten
    q = {}
    p = c.execute("SELECT * FROM projects WHERE id=?", (pid,)).fetchone()
    if not p:
        return q
    p = dict(p)
    sd = stammdaten.projekt_lesen(c, pid)
    S = {r["key"]: r["value"] or "" for r in c.execute("SELECT key, value FROM settings WHERE key LIKE 'co_%' OR key='office_name'")}
    put = lambda k, v, src: q.__setitem__(k, (str(v).strip(), src)) if v not in (None, "") and str(v).strip() else None   # noqa: E731
    put("verfahren", "baugenehmigung", "Vorgabe")
    if p.get("city"):
        put("behoerde", f"Stadt {p['city']} – Bauaufsicht", "Vorschlag")
    bh = _kontakt(c, sd.get("bauherr_kid"))
    put("bauherr_name", sd.get("bauherr") or p.get("client"), "Projektdaten")
    put("bauherr_vertreter", sd.get("bh_vertreter"), "Projektdaten")
    if bh:
        put("bauherr_anschrift", _adr(bh), "Adressen")
        put("bauherr_tel", bh.get("phone") or bh.get("mobile"), "Adressen")
        put("bauherr_mail", bh.get("email"), "Adressen")
    # Entwurfsverfasser/in: persönlich (Mein Konto), wenn bauvorlageberechtigt mit Kammernummer – sonst das Büro
    k = konto.prefs(c, user["id"]) if user else {}
    pers = bool(k.get("bauvorlage") and k.get("kammernr"))
    u = user or {}
    name_ich = ", ".join(x for x in (u.get("nachname") or "", u.get("vorname") or "") if x)
    buero_adr = ", ".join(x for x in (S.get("co_street", ""), " ".join(x for x in (S.get("co_zip", ""), S.get("co_city", "")) if x)) if x)
    q["_ev"] = {"persoenlich": {"ev_name": name_ich or u.get("name", ""), "ev_beruf": k.get("beruf", ""), "ev_kammer": k.get("kammer", ""),
                                "ev_kammernr": k.get("kammernr", ""), "ev_tel": k.get("telefon") or S.get("co_phone", ""), "ev_mail": u.get("email", "")},
                "buero": {"ev_name": S.get("co_bv_name") or S.get("office_name", ""), "ev_beruf": S.get("co_bv_beruf", ""), "ev_kammer": S.get("co_bv_kammer", ""),
                          "ev_kammernr": S.get("co_bv_kammernr", ""), "ev_tel": S.get("co_phone", ""), "ev_mail": S.get("co_email", "")}}
    put("ev_wahl", "persoenlich" if pers else "buero", "Mein Konto" if pers else "Büro")
    put("ev_anschrift", (S.get("office_name", "") + ", " if S.get("office_name") else "") + buero_adr, "Büro")
    tw = _kontakt(c, sd.get("tragwerk_kid"))
    put("tragwerk", (tw or {}).get("name") or sd.get("tragwerk"), "Projektdaten")
    put("gs_strasse", p.get("street"), "Projekt")
    put("gs_ort", " ".join(x for x in ((p.get("zip") or ""), (p.get("city") or "")) if x), "Projekt")
    for f in ("gemarkung", "flur", "flurstueck"):
        put(f, sd.get(f), "Projektdaten")
    put("bezeichnung", sd.get("beschreibung") or p.get("name"), "Projektdaten" if sd.get("beschreibung") else "Projekt")
    put("art", {"Neubau": "Errichtung", "Umbau": "Änderung", "Erweiterung": "Erweiterung", "Sanierung / Modernisierung": "Änderung", "Abbruch": "Abbruch"}.get(sd.get("massnahme") or ""), "Projekt")
    put("nutzung", sd.get("nutzung"), "Projektdaten")
    for k in PD_EIGEN:   # Angaben für Bauanträge, die in den Projektdaten stehen (Gruppe „Bauantrag“)
        put(k, sd.get(k), "Projektdaten")
    put("sonderbau", sd.get("sonderbau") or "nein", "Projektdaten" if sd.get("sonderbau") else "Vorgabe")
    try:   # Baukosten: gültige Kostenermittlung – KG 300 (Rohbau näherungsweise), KG 300 + 400, Fläche
        import baukosten as BK
        from . import gueltig
        bks = c.execute("SELECT * FROM bk_projects WHERE project_id=? AND archived=0", (pid,)).fetchall()
        if bks:
            gid = gueltig.waehlen([(x["id"], x["created"], False) for x in bks], gueltig.lesen(c, "bk", pid))
            bk = next((x for x in bks if x["id"] == gid), bks[0])
            kk = BK.calc(BK.clean_data(_j(bk["data"], {}), c))
            a, b = kk.get("kg300") or 0, kk.get("kg400") or 0
            if a:
                put("rohbau", round(a), "Baukosten")
            if a or b:
                put("herstellung", round(a + b), "Baukosten")
            if kk.get("area") and "nrf" not in q:
                put("nrf", round(kk["area"], 1), "Baukosten")
    except Exception:   # noqa: BLE001 – ohne Baukosten bleiben die Felder zum Eintippen
        pass
    return q


PD_EIGEN = ("behoerde", "gs_flaeche", "bplan", "gebiet", "baulasten", "denkmal", "gebaeudeklasse", "sonderbau", "grf", "bgf", "bri",
            "grz", "gfz", "geschosse", "hoehe", "we", "st_notw", "st_nachg")
PD_UMBENANNT = {"bauherr_name": "bauherr", "bauherr_vertreter": "bh_vertreter", "bezeichnung": "beschreibung", "nutzung": "nutzung",
                "gemarkung": "gemarkung", "flur": "flur", "flurstueck": "flurstueck", "tragwerk": "tragwerk"}
KONTO = {"ev_beruf": "beruf", "ev_kammer": "kammer", "ev_kammernr": "kammernr", "ev_tel": "telefon"}
BUERO = {"ev_name": "co_bv_name", "ev_beruf": "co_bv_beruf", "ev_kammer": "co_bv_kammer", "ev_kammernr": "co_bv_kammernr"}


def ziel(key, ev_wahl, admin):
    """Wohin eine Änderung dieses Felds geschrieben wird (Name für die Seite) – None: bleibt nur im Antrag."""
    if key in PD_EIGEN or key in PD_UMBENANNT:
        return "Projektdaten"
    if key in ("bauherr_anschrift", "bauherr_tel", "bauherr_mail"):
        return "Adressen"
    if key in ("gs_strasse", "gs_ort"):
        return "Projekt"
    if ev_wahl == "persoenlich" and key in KONTO:
        return "Mein Konto"
    if ev_wahl == "buero" and admin and key in BUERO:
        return "Büro"
    return None


def _plz_ort(s):
    m = re.match(r"^\s*(\d{5})\s+(.+)$", s or "")
    return (m.group(1), m.group(2).strip()) if m else ("", (s or "").strip())


def zurueckschreiben(c, pid, user, felder, ev_wahl, wer):
    """Änderungen aus dem Antrag dorthin schreiben, wo sie hingehören (Projektdaten, Adressen des Bauherrn, Projektanschrift,
    Mein Konto, Büro). Gibt die Schlüssel zurück, die geschrieben wurden – die bleiben nicht als „von Hand“ im Antrag."""
    from . import konto, stammdaten
    admin = bool(user and user.get("is_admin"))
    pd, kt, bu, done = {}, {}, {}, set()
    for k, v in felder.items():
        z = ziel(k, ev_wahl, admin)
        if not z or v is None:
            continue
        v = str(v).strip()
        if z == "Projektdaten":
            pd[PD_UMBENANNT.get(k, k)] = v
        elif z == "Mein Konto":
            kt[KONTO[k]] = v
        elif z == "Büro":
            bu[BUERO[k]] = v
        elif z == "Projekt":
            if k == "gs_strasse":
                c.execute("UPDATE projects SET street=? WHERE id=?", (v[:200], pid))
            else:
                plz, ort = _plz_ort(v)
                c.execute("UPDATE projects SET zip=?, city=? WHERE id=?", (plz[:10], ort[:120], pid))
        elif z == "Adressen":
            sd = stammdaten.projekt_lesen(c, pid)
            kid = sd.get("bauherr_kid")
            if not kid:   # Bauherr noch nicht in den Adressen: anlegen (oder gleichnamigen nehmen) und mit dem Projekt verbinden
                name = (sd.get("bauherr") or "").strip()
                if not name:
                    continue
                r = c.execute("SELECT id FROM contacts WHERE lower(name)=?", (name.lower(),)).fetchone()
                kid = r["id"] if r else c.execute("INSERT INTO contacts(name, created, updated) VALUES(?, now()::text, now()::text) RETURNING id", (name[:200],)).fetchone()["id"]
                stammdaten.projekt_schreiben(c, pid, {"bauherr_kid": kid}, wer)
            if k == "bauherr_anschrift":
                teile = [t.strip() for t in v.split(",")]
                plz, ort = _plz_ort(teile[-1] if len(teile) > 1 else "")
                c.execute("UPDATE contacts SET street=?, zip=?, city=?, updated=now()::text WHERE id=?", (teile[0][:200] if len(teile) > 1 else v[:200], plz, ort[:120], kid))
            else:
                c.execute(f"UPDATE contacts SET {'phone' if k == 'bauherr_tel' else 'email'}=?, updated=now()::text WHERE id=?", (v[:200], kid))
        done.add(k)
    if pd:
        stammdaten.projekt_schreiben(c, pid, pd, wer)
    if kt and user:
        konto.set_prefs(c, user["id"], kt, wer)
    for k, v in bu.items():
        c.execute("INSERT INTO settings(key, value) VALUES(?,?) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", (k, v[:300]))
    return done


def werte(c, pid, user, daten):
    """Felder mit Wert, Quelle und ob von Hand geändert – für die Seite und das PDF."""
    q = quellen(c, pid, user)
    ev = q.pop("_ev", {})
    wahl = daten.get("ev_wahl") or (q.get("ev_wahl") or ("buero", ""))[0]
    for k, v in (ev.get(wahl) or {}).items():   # Entwurfsverfasser je nach Wahl
        if v:
            q[k] = (v, "Mein Konto" if wahl == "persoenlich" else "Büro")
    out = []
    for key, label, schritt, typ, opt, pflicht in FELDER:
        qv, qs = q.get(key, ("", ""))
        eigen = key in daten
        out.append({"key": key, "label": label, "schritt": schritt, "typ": typ, "optionen": opt if isinstance(opt, list) else [], "hilfe": opt if isinstance(opt, str) else "",
                    "ziel": ziel(key, wahl, bool((user or {}).get("is_admin"))) or "",
                    "pflicht": pflicht, "wert": str(daten[key]) if eigen else qv, "quelle": "von Hand" if eigen else qs, "quelle_wert": qv, "quelle_name": qs, "eigen": eigen})
    return out


def sauber(daten):
    """Nur bekannte Felder, Text gekürzt; leerer Text bleibt als „bewusst leer“ erhalten."""
    out = {}
    for k, v in (daten or {}).items():
        if k in FK and v is not None:
            out[k] = str(v)[:2000 if FK[k][3] == "textarea" else 300]
    return out


def bauvorlagen(dateien, gespeichert, c=None, pid=None):
    """Checkliste: je Bauvorlage erkannte Dateien (aus dem Projektordner) und der von Hand gesetzte Stand."""
    def fold(s):
        return (s or "").lower().replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss")
    out = []
    for key, name, worte, pflicht in BAUVORLAGEN:
        treffer = [f for f in dateien if any(fold(w) in fold(f.get("name")) for w in worte)][:5] if worte else []
        g = (gespeichert or {}).get(key) or {}
        st = g.get("status") or ("da" if treffer else "offen")
        x = {"key": key, "name": name, "pflicht": pflicht, "status": st, "dateien": [{"name": f["name"], "pfad": f.get("pfad", "")} for f in treffer],
             "notiz": g.get("notiz", ""), "auto": bool(treffer) and not g.get("status")}
        if st == "nachgereicht":   # wer liefert, bis wann (Datum oder aus dem Bauzeitenplan), wie erinnert wird
            x["nach"] = {k: g.get(k) for k in NACH_FELDER}
            x["nach"]["frist"] = nach_frist(c, pid, g) if c is not None else (g.get("bis") or "")
        out.append(x)
    return out


# ---------------------------------------------------------------- Bauvorlagen „wird nachgereicht“
NACH_FELDER = ("liefert", "liefert_kid", "bis", "plan_uid", "plan_name", "vorlauf", "todo", "bt", "mail")


def nach_sauber(v):
    """Angaben zu „wird nachgereicht“ aus dem Browser – nur bekannte Felder, Datum geprüft."""
    v = v or {}
    out = {"liefert": str(v.get("liefert") or "")[:200], "bis": str(v.get("bis") or "")[:10], "plan_uid": str(v.get("plan_uid") or "")[:60],
           "plan_name": str(v.get("plan_name") or "")[:200], "todo": v.get("todo", True) is not False, "bt": bool(v.get("bt")), "mail": v.get("mail", True) is not False}
    try:
        out["liefert_kid"] = int(v.get("liefert_kid")) if v.get("liefert_kid") else None
    except (TypeError, ValueError):
        out["liefert_kid"] = None
    try:
        out["vorlauf"] = max(0, min(365, int(v.get("vorlauf") or 0)))
    except (TypeError, ValueError):
        out["vorlauf"] = 0
    if out["bis"] and not re.match(r"^\d{4}-\d{2}-\d{2}$", out["bis"]):
        out["bis"] = ""
    return out


def plan_vorgaenge(c, pid):
    """Vorgänge des gültigen Bauzeitenplans (für „bis … vor Beginn von …“): [{uid, name, s}]."""
    from . import plan
    out = []
    for _gid, _name, data in plan.plans_mit_id(c, pid):
        if not isinstance(data, dict):
            continue
        T = {t.get("uid"): t for t in (data.get("tasks") or []) if isinstance(t, dict)}
        for x in data.get("sched") or []:
            t = T.get(x.get("uid"))
            if t and x.get("s"):
                out.append({"uid": str(t.get("uid")), "name": t.get("name") or "Vorgang", "s": x["s"], "gruppe": bool(x.get("g"))})
    return sorted(out, key=lambda y: y["s"])


def nach_frist(c, pid, g):
    """Frist zum Nachreichen: festes Datum oder Beginn des Vorgangs im Bauzeitenplan minus Vorlauf (wandert mit dem Plan)."""
    if g.get("plan_uid") and pid:
        try:
            v = next((x for x in plan_vorgaenge(c, pid) if x["uid"] == str(g["plan_uid"])), None)
        except Exception:   # noqa: BLE001 – ohne Plan bleibt das Datum
            v = None
        if v:
            from datetime import date, timedelta
            try:
                return (date.fromisoformat(v["s"][:10]) - timedelta(days=int(g.get("vorlauf") or 0))).isoformat()
            except ValueError:
                pass
    return g.get("bis") or ""


def nachreichen_offen(c, pids=None):
    """Alle Bauvorlagen „wird nachgereicht“ (für To-dos und das Bautagebuch): [{aid, pid, antrag, key, name, liefert, liefert_kid, frist, todo, bt, mail}]."""
    out = []
    for r in c.execute("SELECT id, project_id, name, bauvorlagen FROM bauantrag").fetchall():
        if pids is not None and r["project_id"] not in pids:
            continue
        try:
            B = json.loads(r["bauvorlagen"] or "{}")
        except ValueError:
            continue
        for key, g in (B or {}).items():
            if not isinstance(g, dict) or g.get("status") != "nachgereicht":
                continue
            name = next((n for k, n, _, _ in BAUVORLAGEN if k == key), key)
            out.append({"aid": r["id"], "pid": r["project_id"], "antrag": r["name"], "key": key, "name": name, "liefert": g.get("liefert") or "",
                        "liefert_kid": g.get("liefert_kid"), "frist": nach_frist(c, r["project_id"], g), "todo": g.get("todo", True) is not False,
                        "bt": bool(g.get("bt")), "mail": g.get("mail", True) is not False})
    return out


def fehlt(F, B):
    """Was vor dem Einreichen noch fehlt (Pflichtfelder, Pflicht-Bauvorlagen)."""
    f = [x["label"] for x in F if x["pflicht"] and not str(x["wert"]).strip()]
    b = [x["name"] for x in B if x["pflicht"] and x["status"] == "offen" and x["key"] != "antrag"]   # „wird nachgereicht“ fehlt nicht
    return f, b
