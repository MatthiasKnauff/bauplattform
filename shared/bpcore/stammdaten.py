"""Stammdaten für alle Belange: Projekt (mit Bauherr und Terminen), Leistungsverzeichnis (Ausschreibung/Vergabe),
Angebot und Auftrag. Die Felder sind hier einmal beschrieben; dieselbe Maske (BPHead.datenMaske) zeigt sie in der
Verwaltung, in der AVA und in den Baukosten.

bp_store  projektdaten:<pid>   Projekt- und Bauherrendaten {feld: wert}
ava_lv.data["meta"]            Angaben zur Ausschreibung des LV
ava_lv.vergabe["auftrag"]      Angaben zum Auftrag
ava_angebot.daten              Angaben zum Angebot
"""
import json
from datetime import date, datetime

from . import plan

# Feld: (Schlüssel, Bezeichnung, Typ, Optionen/Hinweis) – Typen: text, textarea, date, time, zahl, eur, prozent, check, select, mail, tel,
# kontakt: Firma oder Person aus den Kontakten (Adressen) – Eingabe sucht dort, sonst „neu anlegen?“ mit der gewohnten Kontaktmaske.
#          Gespeichert werden der Name (<k>) und die Kontakt-ID (<k>_kid); Anschrift, Telefon, E-Mail kommen aus dem Kontakt.
#          Optionen als dict: {"rolle": Gewerk/Funktion beim Neuanlegen und für die Reihenfolge der Treffer, "hilfe": Hinweis}
def K(rolle, hilfe=""):
    return {"rolle": rolle, "hilfe": hilfe}


PROJEKT = [
    ("Bauherr", [
        ("bauherr", "Bauherr", "kontakt", K("Bauherr", "steht auf Briefen, Rügen, LV-Deckblatt und Rechnungsfreigabe")),
        ("bh_vertreter", "Vertreten durch", "kontakt", K("Verwalter", "z. B. Hausverwaltung, Geschäftsführer, Bevollmächtigter")),
        ("bh_ansprech", "Ansprechpartner", "kontakt", K("Bauherr")),
        ("bh_rechnung", "Rechnungsanschrift (falls abweichend)", "textarea", ""),
        ("bh_ustid", "USt-IdNr. / Steuernummer", "text", ""),
        ("bh_oeffentlich", "Öffentlicher Auftraggeber (Vergabe nach VOB/A bzw. UVgO)", "check", ""),
    ]),
    ("Beteiligte", [
        ("baustelle", "Baustelle", "kontakt", K("Baustelle", "Baustellenadresse in den Kontakten – wie im Bautagebuch")),
        ("projektsteuerung", "Projektsteuerung", "kontakt", K("Projektsteuerung")),
        ("objektplanung", "Objektplanung / Architekt", "kontakt", K("Architekt")),
        ("tragwerk", "Tragwerksplanung", "kontakt", K("Tragwerksplanung")),
        ("sigeko", "SiGeKo", "kontakt", K("SiGeKo")),
    ]),
    ("Projekt", [
        ("beschreibung", "Projektbeschreibung", "textarea", "kurz: was wird gebaut – erscheint z. B. auf dem LV-Deckblatt"),
        ("massnahme", "Art der Maßnahme", "select", ["", "Neubau", "Umbau", "Erweiterung", "Sanierung / Modernisierung", "Instandsetzung", "Abbruch", "Außenanlagen"]),
        ("nutzung", "Nutzung", "text", "z. B. Wohnen, Büro, Tierheim"),
        ("gemarkung", "Gemarkung", "text", ""), ("flur", "Flur", "text", ""), ("flurstueck", "Flurstück", "text", ""),
        ("hoehe_nhn", "Geländehöhe über NHN", "text", "in m (DHHN2016) – mit „aus ALKIS ermitteln“ aus dem DGM1 NRW an der Baustelle"),
        ("genehmigung_az", "Baugenehmigung – Aktenzeichen", "text", ""), ("genehmigung_datum", "Baugenehmigung vom", "date", ""),
        ("budget", "Kostenrahmen (brutto)", "eur", ""),
    ]),
    ("Termine", [
        ("baubeginn", "Baubeginn", "date", "kann aus dem Bauzeitenplan übernommen oder dorthin übertragen werden"),
        ("fertigstellung", "voraussichtliche Fertigstellung", "date", ""),
        ("uebergabe", "Übergabe an den Bauherrn", "date", ""),
    ]),
]

VERGABEART = ["", "Öffentliche Ausschreibung", "Beschränkte Ausschreibung", "Freihändige Vergabe / Verhandlungsvergabe", "Preisanfrage (privat)", "Direktauftrag"]
VERTRAG = ["", "Einheitspreisvertrag (VOB/B)", "Pauschalvertrag (VOB/B)", "Stundenlohnvertrag", "BGB-Werkvertrag"]
LV = [
    ("Ausschreibung", [
        ("vergabeart", "Vergabeart", "select", VERGABEART), ("vergabenr", "Vergabenummer", "text", ""),
        ("gewerk", "Gewerk", "text", {"hilfe": "Tippen – Vorschläge aus den Adressen und den anderen LVs", "liste": "gw"}),
        ("kg", "Kostengruppe DIN 276", "text", {"hilfe": "z. B. 330 – Vorschläge beim Tippen", "liste": "kg"}),
        ("budget", "Kostenansatz (netto)", "eur", "für den Vergleich mit den Angeboten"),
        ("versand", "Versand an die Bieter", "date", ""),
        ("abgabe", "Angebotsabgabe bis", "date", ""), ("abgabe_zeit", "Uhrzeit", "time", ""),
        ("eroeffnung", "Eröffnungstermin (Submission)", "date", ""),
        ("bindefrist", "Zuschlags- und Bindefrist bis", "date", ""),
        ("zuschlag", "Zuschlag erteilt am", "date", ""),
        ("vertragsart", "Vertragsart", "select", VERTRAG),
        ("nebenangebote", "Nebenangebote zugelassen", "check", ""),
    ]),
    ("Ausführung", [
        ("ausf_beginn", "Ausführungsbeginn", "date", "kann aus dem Bauzeitenplan übernommen werden (Leistungen dieses Gewerks)"),
        ("ausf_ende", "Fertigstellung der Leistung", "date", ""),
        ("bemerkung", "Bemerkung", "textarea", ""),
    ]),
]
ANGEBOT = [
    ("Angebot", [
        ("angebotsnr", "Angebotsnummer", "text", ""), ("angebotsdatum", "Angebot vom", "date", ""),
        ("bindefrist", "gebunden bis", "date", ""),
        ("ansprech", "Ansprechpartner", "kontakt", K("", "Person beim Bieter – Telefon und E-Mail aus den Kontakten")),
        ("nebenangebot", "enthält Nebenangebote", "check", ""), ("geprueft", "rechnerisch geprüft", "check", ""),
        ("vorbehalte", "Vorbehalte / Abweichungen", "textarea", "z. B. eigene Zahlungs- oder Lieferbedingungen"),
    ]),
]
AUFTRAG = [
    ("Auftrag", [
        ("auftragsnr", "Auftragsnummer", "text", ""), ("auftragsdatum", "Auftrag vom", "date", ""),
        ("vertragsart", "Vertragsart", "select", VERTRAG),
        ("beginn", "vertraglicher Ausführungsbeginn", "date", ""), ("ende", "vertragliche Fertigstellung", "date", ""),
        ("vertragsstrafe", "Vertragsstrafe je Werktag", "prozent", "der Auftragssumme, z. B. 0,2"),
        ("vertragsstrafe_max", "Vertragsstrafe höchstens", "prozent", "z. B. 5"),
        ("zahlungsfrist", "Zahlungsfrist Abschlagsrechnungen (Tage)", "zahl", "VOB/B: 21 Tage"),
        ("bauleiter_an", "Bauleiter des Auftragnehmers", "kontakt", K("Bauleiter", "Telefon und E-Mail aus den Kontakten")),
        ("bemerkung", "Bemerkung", "textarea", ""),
    ]),
]


def _opt(o):
    if isinstance(o, list):
        return {"opt": o}
    if isinstance(o, dict):
        return {k: v for k, v in o.items() if v}
    return {"hilfe": o} if o else {}


def felder(defn):
    return [{"titel": t, "felder": [{"k": k, "l": l, "typ": typ, **_opt(o)} for k, l, typ, o in F]} for t, F in defn]


def kontakt_ids(defn, werte):
    return sorted({int(werte[k + "_kid"]) for _, F in defn for k, _, typ, _ in F
                   if typ == "kontakt" and str((werte or {}).get(k + "_kid") or "").isdigit()})


def bereinigen(defn, werte, alt=None):
    """Nur bekannte Felder, Texte gekürzt, Zahlen als Zahl, Häkchen als bool."""
    out = dict(alt or {})
    for _, F in defn:
        for k, _, typ, o in F:
            if typ == "kontakt" and k + "_kid" in (werte or {}):
                kid = str(werte.get(k + "_kid") or "")
                out[k + "_kid"] = int(kid) if kid.isdigit() else None
            if k not in (werte or {}):
                continue
            v = werte[k]
            if typ == "check":
                out[k] = bool(v)
            elif typ in ("zahl", "eur", "prozent"):
                try:
                    out[k] = None if v in (None, "") else round(float(str(v).replace(".", "").replace(",", ".") if isinstance(v, str) and "," in v else v), 4)
                except (TypeError, ValueError):
                    out[k] = None
            elif typ == "date":
                v = str(v or "")[:10]
                out[k] = v if len(v) == 10 and v[4] == "-" else ""
            elif typ == "select":
                out[k] = v if v in o else ""
            else:
                out[k] = str(v or "")[:4000 if typ == "textarea" else 300]
    return out


def _j(v, d):
    try:
        return json.loads(v) if isinstance(v, str) and v else (v if v is not None and not isinstance(v, str) else d)
    except ValueError:
        return d


def projekt_lesen(c, pid):
    r = c.execute("SELECT data FROM bp_store WHERE key=?", (f"projektdaten:{int(pid)}",)).fetchone()
    d = _j(r["data"], {}) if r else {}
    p = c.execute("SELECT * FROM projects WHERE id=?", (pid,)).fetchone()
    if p is not None and not d.get("bauherr") and (p["client"] if "client" in p.keys() else ""):
        d["bauherr"] = p["client"]   # bisher nur der Name des Bauherrn am Projekt
    for k in ("bauherr", "bh_vertreter", "bh_ansprech"):   # früher Freitext: mit gleichnamigem Kontakt verbinden
        if d.get(k) and not d.get(k + "_kid"):
            r = c.execute("SELECT id FROM contacts WHERE lower(name)=?", (str(d[k]).strip().lower(),)).fetchone()
            if r:
                d[k + "_kid"] = r["id"]
    if p is not None and not d.get("baustelle_kid"):   # Baustellenadresse des Projekts (Bautagebuch)
        cid = _j(p["extra"], {}).get("contact_id") if "extra" in p.keys() else None
        r = c.execute("SELECT id, name FROM contacts WHERE id=?", (cid,)).fetchone() if str(cid or "").isdigit() else None
        if r:
            d["baustelle"], d["baustelle_kid"] = r["name"], r["id"]
    if d.get("baustelle_kid") and not any(d.get(k) for k in GRUNDSTUECK):   # Grundstück bisher nur an der Baustelle (Adressen)
        g = grundstueck_kontakt(c, d["baustelle_kid"])
        d.update({k: v for k, v in g.items() if v})
    return d


GRUNDSTUECK = ("gemarkung", "flur", "flurstueck", "hoehe_nhn")


def grundstueck_kontakt(c, kid):
    r = c.execute("SELECT data FROM bp_store WHERE key=?", (f"grundstueck:kontakt:{int(kid)}",)).fetchone()
    d = _j(r["data"], {}) if r else {}
    return {k: str(d.get(k) or "") for k in GRUNDSTUECK}


def grundstueck_kontakt_schreiben(c, kid, werte, wer):
    d = {k: str((werte or {}).get(k) or "").strip()[:200] for k in GRUNDSTUECK}
    c.execute("INSERT INTO bp_store(key, data, updated, updated_by) VALUES(?,?,?,?) ON CONFLICT (key) DO UPDATE SET data=EXCLUDED.data, "
              "updated=EXCLUDED.updated, updated_by=EXCLUDED.updated_by", (f"grundstueck:kontakt:{int(kid)}", json.dumps(d, ensure_ascii=False), datetime.now().isoformat(timespec="seconds"), wer))
    return d


def projekt_schreiben(c, pid, werte, wer):
    d = bereinigen(PROJEKT, werte, projekt_lesen(c, pid))
    c.execute("INSERT INTO bp_store(key, data, updated, updated_by) VALUES(?,?,?,?) ON CONFLICT (key) DO UPDATE SET data=EXCLUDED.data, "
              "updated=EXCLUDED.updated, updated_by=EXCLUDED.updated_by", (f"projektdaten:{int(pid)}", json.dumps(d, ensure_ascii=False), datetime.now().isoformat(timespec="seconds"), wer))
    if "bauherr" in (werte or {}):   # der Name gilt weiter für alle Apps (Bautagebuch „Bauherrschaft“ usw.)
        c.execute("UPDATE projects SET client=? WHERE id=?", (d.get("bauherr") or "", pid))
    if d.get("baustelle_kid") and "baustelle_kid" in (werte or {}):   # gewählter Kontakt ist die Baustellenadresse des Projekts
        p = c.execute("SELECT extra, street, zip, city FROM projects WHERE id=?", (pid,)).fetchone()
        ex = _j(p["extra"], {}) if p else {}
        if p is not None and ex.get("contact_id") != d["baustelle_kid"]:
            ex.update(contact_id=d["baustelle_kid"], contact_declined=None)
            c.execute("UPDATE projects SET extra=? WHERE id=?", (json.dumps(ex, ensure_ascii=False), pid))
            k = c.execute("SELECT street, zip, city FROM contacts WHERE id=?", (d["baustelle_kid"],)).fetchone()
            if k and not (p["street"] or p["city"]) and (k["street"] or k["city"]):   # Projekt ohne Adresse: die des Kontakts übernehmen
                c.execute("UPDATE projects SET street=?, zip=?, city=? WHERE id=?", (k["street"], k["zip"], k["city"], pid))
    return d


def plan_termine(c, pid, gewerk=None, name=None):
    """Anfang/Ende laut Bauzeitenplan(en) des Projekts – mit gewerk/name nur die passenden Leistungen."""
    s, f, plaene = None, None, []
    for gid, pname, data in plan.plans_mit_id(c, pid):
        if not isinstance(data, dict):
            continue
        plaene.append({"id": gid, "name": pname, "start": data.get("start") or ""})
        tasks = {t.get("uid"): t for t in data.get("tasks") or [] if isinstance(t, dict)}
        for x in data.get("sched") or []:
            t = tasks.get(x.get("uid")) or {}
            if x.get("g") or not x.get("s"):
                continue
            if gewerk or name:
                gw = (t.get("gw") or "").strip().lower()
                tn = (t.get("name") or "").lower()
                if not ((gewerk and gw and (gw == gewerk.lower() or gewerk.lower() in gw or gw in gewerk.lower()))
                        or (name and len(name) > 3 and name.lower() in tn)):
                    continue
            s = min(s, x["s"]) if s else x["s"]
            f = max(f, x.get("f") or x["s"]) if f else (x.get("f") or x["s"])
    return {"start": s or "", "ende": f or "", "plaene": plaene}


def baubeginn_in_plan(c, pid, tag):
    """Baubeginn als Projektanfang in die verknüpften Bauzeitenpläne schreiben (Termine rechnet der Plan beim Öffnen neu)."""
    try:
        date.fromisoformat(tag)
    except (TypeError, ValueError):
        return 0
    n = 0
    for gid, _, data in plan.plans_mit_id(c, pid, alle=True):   # in jede Version
        if isinstance(data, dict):
            data["start"] = tag
            c.execute("UPDATE gantt_projects SET data=? WHERE id=?", (json.dumps(data, ensure_ascii=False), gid))
            n += 1
    return n
