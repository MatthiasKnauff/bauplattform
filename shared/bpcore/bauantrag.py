"""Bauantrag (App „Bauantrag“): Felder, Quellen, Bauvorlagen und PDF.

Ein Antrag speichert nur, was von Hand eingetragen oder geändert wurde (daten). Alles andere kommt jedes Mal frisch aus den Quellen:
Projektdaten (Bauherr, Grundstück, Beschreibung – bpcore/stammdaten), Adressen (Anschrift, Telefon, E-Mail der Kontakte), Baukosten
(gültige Kostenermittlung: KG 300/400, Fläche), Büro-Einstellungen und Mein Konto (Entwurfsverfasser/in). So sieht man je Feld,
woher der Wert stammt, und kann ihn jederzeit auf die Quelle zurücksetzen.
Erste Fassung: PDF im eigenen Layout, angelehnt an die Bauvorlagen NRW. Das amtliche, ausfüllbare Formular kommt, sobald die PDFs
des Landes hochgeladen sind.
"""
import io
import json
import re
from datetime import date

VERFAHREN = {"baugenehmigung": "Antrag auf Baugenehmigung", "vorbescheid": "Antrag auf Vorbescheid", "freistellung": "Genehmigungsfreistellung – Bauvorlagen"}
SCHRITTE = [("verfahren", "Verfahren"), ("beteiligte", "Beteiligte"), ("grundstueck", "Grundstück"), ("vorhaben", "Vorhaben & Kenndaten"),
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


def bauvorlagen(dateien, gespeichert):
    """Checkliste: je Bauvorlage erkannte Dateien (aus dem Projektordner) und der von Hand gesetzte Stand."""
    def fold(s):
        return (s or "").lower().replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss")
    out = []
    for key, name, worte, pflicht in BAUVORLAGEN:
        treffer = [f for f in dateien if any(fold(w) in fold(f.get("name")) for w in worte)][:5] if worte else []
        g = (gespeichert or {}).get(key) or {}
        st = g.get("status") or ("da" if treffer else "offen")
        out.append({"key": key, "name": name, "pflicht": pflicht, "status": st, "dateien": [{"name": f["name"], "pfad": f.get("pfad", "")} for f in treffer],
                    "notiz": g.get("notiz", ""), "auto": bool(treffer) and not g.get("status")})
    return out


def fehlt(F, B):
    """Was vor dem Einreichen noch fehlt (Pflichtfelder, Pflicht-Bauvorlagen)."""
    f = [x["label"] for x in F if x["pflicht"] and not str(x["wert"]).strip()]
    b = [x["name"] for x in B if x["pflicht"] and x["status"] == "offen" and x["key"] != "antrag"]
    return f, b


def eur(v):
    try:
        return f"{float(str(v).replace('.', '').replace(',', '.')):,.0f} €".replace(",", ".")
    except ValueError:
        return str(v)


def pdf(F, B, name, projekt, entwurf=True):
    """Antrag im eigenen Layout (A4): Kopf, nummerierte Abschnitte mit Feldern, Bauvorlagen, Unterschriften."""
    from reportlab.lib.colors import Color, black, white
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.pdfgen import canvas
    W = {x["key"]: str(x["wert"] or "") for x in F}
    buf = io.BytesIO()
    cv = canvas.Canvas(buf, pagesize=A4)
    cv.setTitle(f"{VERFAHREN.get(W.get('verfahren'), 'Bauantrag')} – {projekt}")
    L, R, y = 18 * mm, A4[0] - 18 * mm, A4[1] - 18 * mm
    blau, grau = Color(0.11, 0.31, 0.66), Color(0.9, 0.9, 0.9)
    seite = [1]

    def kopf():
        nonlocal y
        cv.setFont("Helvetica", 7.5); cv.setFillColor(Color(.3, .3, .3))
        cv.drawString(L, A4[1] - 12 * mm, f"Bauvorlagen · {projekt}")
        cv.drawRightString(R, A4[1] - 12 * mm, f"Seite {seite[0]}")
        if entwurf:
            cv.saveState(); cv.setFont("Helvetica-Bold", 60); cv.setFillColor(Color(.85, .85, .85, alpha=0.35)); cv.translate(A4[0] / 2, A4[1] / 2); cv.rotate(35)
            cv.drawCentredString(0, 0, "ENTWURF"); cv.restoreState()
        cv.setFillColor(black)

    def neu():
        nonlocal y
        cv.showPage(); seite[0] += 1; y = A4[1] - 20 * mm; kopf()

    def platz(h):
        if y - h < 22 * mm:
            neu()

    def abschnitt(t):
        nonlocal y
        platz(16 * mm)
        y -= 3 * mm
        cv.setFillColor(grau); cv.rect(L, y - 5.2 * mm, R - L, 5.2 * mm, fill=1, stroke=1); cv.setFillColor(black)
        cv.setFont("Helvetica-Bold", 9); cv.drawString(L + 1.5 * mm, y - 3.8 * mm, t)
        y -= 5.2 * mm

    def zeile(felder):   # felder: [(Bezeichnung, Wert, Anteil)]
        nonlocal y
        h = 10.5 * mm
        platz(h)
        x = L
        for lab, wert, ant in felder:
            w = (R - L) * ant
            cv.rect(x, y - h, w, h, fill=0, stroke=1)
            cv.setFont("Helvetica", 6.8); cv.setFillColor(Color(.25, .25, .25)); cv.drawString(x + 1.2 * mm, y - 3 * mm, lab)
            cv.setFont("Courier", 9); cv.setFillColor(blau)
            t = str(wert or "")
            while t and cv.stringWidth(t, "Courier", 9) > w - 3 * mm:
                t = t[:-2] + "…" if len(t) > 2 else ""
            cv.drawString(x + 1.2 * mm, y - 8 * mm, t)
            cv.setFillColor(black)
            x += w
        y -= h

    def kreuz(wahl, opts):
        return "   ".join(("[X] " if wahl == o else "[ ] ") + o for o in opts)

    kopf()
    cv.setFont("Helvetica-Bold", 15); cv.drawString(L, y - 6 * mm, VERFAHREN.get(W.get("verfahren"), "Bauantrag"))
    cv.setFont("Helvetica", 8.5); cv.drawString(L, y - 11 * mm, (W.get("verfahrensart") or "") + (" · " if W.get("verfahrensart") else "") + "an die untere Bauaufsichtsbehörde")
    y -= 15 * mm
    zeile([("Untere Bauaufsichtsbehörde", W.get("behoerde"), 0.65), ("Eingangsstempel / Aktenzeichen", "", 0.35)])
    abschnitt("1  Bauherrschaft")
    zeile([("Name, Vorname / Firma", W.get("bauherr_name"), 0.6), ("vertreten durch", W.get("bauherr_vertreter"), 0.4)])
    zeile([("Anschrift", W.get("bauherr_anschrift"), 0.55), ("Telefon", W.get("bauherr_tel"), 0.2), ("E-Mail", W.get("bauherr_mail"), 0.25)])
    abschnitt("2  Entwurfsverfasser/in (bauvorlageberechtigt)")
    zeile([("Name, Vorname / Büro, Berufsbezeichnung", ", ".join(x for x in (W.get("ev_name"), W.get("ev_beruf")) if x), 0.65), ("Kammer · Mitgliedsnummer", " ".join(x for x in (W.get("ev_kammer"), W.get("ev_kammernr")) if x), 0.35)])
    zeile([("Anschrift", W.get("ev_anschrift"), 0.55), ("Telefon", W.get("ev_tel"), 0.2), ("E-Mail", W.get("ev_mail"), 0.25)])
    if W.get("tragwerk"):
        zeile([("Tragwerksplanung", W.get("tragwerk"), 1.0)])
    abschnitt("3  Baugrundstück")
    zeile([("Straße, Hausnummer", W.get("gs_strasse"), 0.5), ("PLZ, Ort", W.get("gs_ort"), 0.3), ("Grundstücksgröße", (W.get("gs_flaeche") + " m²") if W.get("gs_flaeche") else "", 0.2)])
    zeile([("Gemarkung", W.get("gemarkung"), 0.4), ("Flur", W.get("flur"), 0.2), ("Flurstück(e)", W.get("flurstueck"), 0.4)])
    zeile([("Bebauungsplan", W.get("bplan") or "–", 0.4), ("Gebietsart", W.get("gebiet"), 0.25), ("Baulasten", W.get("baulasten"), 0.2), ("Denkmal", W.get("denkmal"), 0.15)])
    abschnitt("4  Vorhaben")
    zeile([("Genaue Bezeichnung des Vorhabens", W.get("bezeichnung"), 1.0)])
    zeile([("Art", kreuz(W.get("art"), ["Errichtung", "Änderung", "Nutzungsänderung"]) if W.get("art") in ("Errichtung", "Änderung", "Nutzungsänderung") else W.get("art"), 0.5),
           ("Gebäudeklasse", W.get("gebaeudeklasse"), 0.2), ("Sonderbau", W.get("sonderbau"), 0.15), ("Nutzung", W.get("nutzung"), 0.15)])
    abschnitt("5  Kenndaten")
    m = lambda k, e: (W.get(k) + " " + e) if W.get(k) else ""   # noqa: E731
    zeile([("Grundfläche GR", m("grf", "m²"), 0.25), ("BGF", m("bgf", "m²"), 0.25), ("BRI", m("bri", "m³"), 0.25), ("NRF", m("nrf", "m²"), 0.25)])
    zeile([("GRZ", W.get("grz"), 0.15), ("GFZ", W.get("gfz"), 0.15), ("Vollgeschosse", W.get("geschosse"), 0.2), ("Höhe OK", m("hoehe", "m"), 0.2), ("Wohneinheiten", W.get("we"), 0.3)])
    zeile([("Stellplätze notwendig / nachgewiesen", " / ".join(x for x in (W.get("st_notw"), W.get("st_nachg")) if x), 0.3),
           ("Rohbaukosten", eur(W["rohbau"]) if W.get("rohbau") else "", 0.35), ("Herstellungskosten", eur(W["herstellung"]) if W.get("herstellung") else "", 0.35)])
    abschnitt("6  Beigefügte Bauvorlagen")
    for b in B:
        platz(5 * mm)
        cv.setFont("Helvetica", 8.5)
        cv.drawString(L + 2 * mm, y - 4 * mm, ("[X] " if b["status"] in ("da", "beigefuegt") else "[ ] " if b["status"] == "offen" else "[–] ") + b["name"]
                      + ("" if b["status"] != "entfaellt" else "  (entfällt)"))
        y -= 4.6 * mm
    platz(30 * mm)
    y -= 14 * mm
    cv.setLineWidth(0.6)
    for x0, x1, t in ((L, L + (R - L) * 0.46, "Datum, Unterschrift Bauherrschaft"), (L + (R - L) * 0.54, R, "Datum, Unterschrift Entwurfsverfasser/in")):
        cv.line(x0, y, x1, y); cv.setFont("Helvetica", 7); cv.drawString(x0, y - 3.2 * mm, t)
    cv.setFont("Helvetica", 6.5); cv.setFillColor(Color(.4, .4, .4))
    cv.drawString(L, 14 * mm, "Erstellt mit der Bauplattform – eigenes Layout, angelehnt an die Bauvorlagen NRW. Maßgeblich ist das amtliche Formular des Landes.")
    cv.save()
    return buf.getvalue()


def dateiname(projekt, verfahren, heute=None):
    k = (re.match(r"^[A-Za-z]{1,4}\d{2,6}(?:\.\d+)?", (projekt or "").strip()) or [""])[0]
    return f"{k + ' ' if k else ''}{VERFAHREN.get(verfahren, 'Bauantrag')} {(heute or date.today()).strftime('%d.%m.%Y')}.pdf"
