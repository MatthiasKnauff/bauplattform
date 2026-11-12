"""Ausschreibung – Unterlagen der Vergabe: Angebotsbesprechung (Protokoll je Bieter) und Bauvertrag / Auftragsschreiben.

Ablauf: Preisspiegel → „Angebotsbesprechung“ (je Bieter, vorausgefüllt aus Projekt, Büro, Adressen, Angebot, Preisspiegel und Bauzeitenplan;
im Gespräch ergänzt) → „Abschließen“ schreibt Nachlass und Skonto ins Angebot (die Vergabe übernimmt sie) und, ist schon an diesen
Bieter vergeben, Einbehalt und Gewährleistung in den Auftrag → PDF in der gemeinsamen Vorschau unterschreiben → hinterlegt und im
Projektordner abgelegt. Im Schritt „Auftrag“: Bauvertrag oder kurzes Auftragsschreiben aus Auftrag + Protokoll.
Tabelle ava_vergabedok (Migration 0057). Vorgaben des Büros für die „Grundlagen“: settings „ava_besprechung_vorgaben“ (JSON).
Rechtliche Hinweise im Vertrag: VOB/B in der Fassung 2016 (in der Gesamtausgabe 2019 unverändert); gegenüber Verbrauchern ist die VOB/B
nicht privilegiert (BGH, 24.07.2008 – VII ZR 55/07); Einzelgewerk ist meist kein Verbraucherbauvertrag (BGH, 16.03.2023 – VII ZR 94/22).
"""
import base64
import io
import json
import re
import urllib.parse
from datetime import date, datetime

from flask import Response, g, jsonify, request

from bpcore import benachrichtigung, db, papierkorb
import common as C
from ava import _f, _j, _lv, _now, _s, app

ARTEN = {"besprechung": "Angebotsbesprechung", "vertrag": "Bauvertrag", "schreiben": "Auftragsschreiben"}
STATUS = {"entwurf": "Entwurf", "abgeschlossen": "abgeschlossen", "unterschrieben": "unterschrieben"}
AG_ARTEN = {"unternehmen": "Unternehmen / Verein", "privat": "Privatperson", "oeffentlich": "öffentlicher Auftraggeber"}
VORGABEN_KEY = "ava_besprechung_vorgaben"
GRUNDLAGEN = [   # (Schlüssel, Beschriftung, Vorgabe) – wie im Vordruck des Büros
    ("vertragsgrundlage", "Vertragsgrundlage (VOB/BGB)", "VOB/B (Fassung 2016)"),
    ("bescheinigungen", "Bescheinigungen / Nachweise / Sicherheiten", "Freistellungsbescheinigung (§ 48b EStG) wird spätestens mit Baubeginn eingereicht"),
    ("vertragsstrafe", "Vertragsstrafe", "keine"),
    ("erfuellung", "Vertragserfüllungsbürgschaft", "entfällt"),
    ("gewaehrleistung", "Gewährleistung", "5 Jahre"),
    ("einbehalt", "Gewährleistungseinbehalt", "5 % der Bruttoabrechnungssumme, ablösbar gegen Bankbürgschaft"),
    ("rechnungsstellung", "Rechnungsstellung", ""),
    ("energie", "Energie- / Medienkosten", ""),
]
FELDER = {   # erlaubte Felder je Bereich (alles Text) – was der Browser schickt, wird darauf beschränkt
    "kopf": ("datum", "uhrzeit", "ort", "bauvorhaben", "bauherr", "architekt", "bieter", "teilnehmer"),
    "bieterangaben": ("rechtsform", "mitarbeiter", "mitarbeiter_projekt", "bauleiter", "subunternehmer"),
    "angebot": ("gueltig", "gewerke", "angebot_vom", "nachtrag_vom", "summe", "nachlass", "skonto", "skonto_tage", "preis", "klaerung"),
    "termine": ("beginn", "fertig", "unterbrechung", "bauzeitenplan"),
    "grundlagen": tuple(k for k, _, _ in GRUNDLAGEN),
    "vertrag": ("ag_art", "ag", "ag_vertreter", "an", "gegenstand", "bestandteile", "verguetung", "termine", "zahlung", "sicherheiten", "abnahme", "weiteres", "ort_datum"),
}


def _de(t):
    t = str(t or "")
    return f"{t[8:10]}.{t[5:7]}.{t[:4]}" if re.fullmatch(r"\d{4}-\d{2}-\d{2}", t) else t


def _eur(v):
    return f"{_f(v):,.2f} €".replace(",", "X").replace(".", ",").replace("X", ".")


def _pz(v):
    return f"{_f(v):g}".replace(".", ",")


def _adresse(k, mit_kontakt=False):
    if not k:
        return ""
    z = [k["name"], k["street"] or "", f"{k['zip'] or ''} {k['city'] or ''}".strip()]
    if mit_kontakt:
        z += [x for x in (f"Tel. {k['phone']}" if k["phone"] else "", k["email"] or "") if x]
    return "\n".join(x for x in z if x)


def _buero(c):
    S = {r["key"]: r["value"] or "" for r in c.execute("SELECT key, value FROM settings WHERE key LIKE 'co\\_%' OR key='office_name'")}
    return S, "\n".join(x for x in (S.get("office_name", ""), S.get("co_street", ""), f"{S.get('co_zip', '')} {S.get('co_city', '')}".strip()) if x)


def vorgaben(c):
    r = c.execute("SELECT value FROM settings WHERE key=?", (VORGABEN_KEY,)).fetchone()
    eigen = _j(r["value"] if r else "", {}) or {}
    return {k: str(eigen.get(k, v)) for k, _, v in GRUNDLAGEN}


def _termine(c, pid, gewerk, name):
    """Beginn und Ende der Vorgänge dieses Gewerks im gültigen Bauzeitenplan (als KW) – Vorschlag fürs Protokoll."""
    try:
        from bpcore import plan
        pl = plan.plans_mit_id(c, pid)
    except Exception:   # noqa: BLE001 – ohne Bauzeitenplan kein Vorschlag
        return {}
    if not pl:
        return {}
    _, pname, d = pl[0]
    if not isinstance(d, dict):
        return {}
    gw = (gewerk or "").strip().lower()
    nm = [w for w in re.split(r"\W+", (name or "").lower()) if len(w) >= 5]
    tasks = {t.get("uid"): t for t in d.get("tasks") or [] if isinstance(t, dict)}
    ss, ff = [], []
    for s in d.get("sched") or []:
        t = tasks.get(s.get("uid"))
        if not t or s.get("g") or not s.get("s"):
            continue
        tg, tn = (t.get("gw") or "").strip().lower(), (t.get("name") or "").lower()
        if (gw and (tg == gw or gw in tn)) or (nm and any(w in tn for w in nm)):
            ss.append(s["s"]); ff.append(s.get("f") or s["s"])
    if not ss:
        return {"bauzeitenplan": f"{pname}"}
    kw = lambda t: "KW {:02d}/{}".format(date.fromisoformat(t).isocalendar()[1], t[:4])   # noqa: E731
    a, b = min(ss), max(ff)
    wo = max(1, round((date.fromisoformat(b) - date.fromisoformat(a)).days / 7))
    return {"beginn": kw(a), "fertig": f"{kw(b)} (ca. {wo} Woche{'n' if wo != 1 else ''})", "bauzeitenplan": f"„{pname}“ – wird verbindlicher Vertragsbestandteil"}


def _sauber(alt, neu):
    """Nur bekannte Felder übernehmen (Text, gekürzt)."""
    out = dict(alt or {})
    for bereich, felder in FELDER.items():
        if isinstance(neu.get(bereich), dict):
            x = dict(out.get(bereich) or {})
            for f in felder:
                if f in neu[bereich]:
                    x[f] = _s(neu[bereich][f], 2000)
            out[bereich] = x
    if isinstance(neu.get("unterschriften"), list):
        out["unterschriften"] = [_s(x, 80) for x in neu["unterschriften"][:4]]
    return out


def _zeile(r):
    d = dict(r)
    d.pop("pdf", None)
    d["data"] = _j(d.get("data"), {}) or {}
    d["hat_pdf"] = bool(r["pdf"] or (r["status"] == "unterschrieben" and r["ablage"]))   # unterschriebene Fassung (Projektordner; ältere noch in der Datenbank)
    return d


def liste(c, lid):
    return [_zeile(r) for r in c.execute("SELECT * FROM ava_vergabedok WHERE lv_id=? ORDER BY id", (lid,)).fetchall()]


KOM_ART = {"besprechung": "angebotsbesprechung", "vertrag": "bauvertrag", "schreiben": "auftragsschreiben"}


def _kommunikation(c, vid, was=""):
    """Unterlage im Verlauf der Kommunikation eintragen (bei der Firma, mit Link zurück in die Ausschreibung) – Nebensache, nie ein Fehler."""
    try:
        r = _dok(c, vid)
        lv = _lv(c, r["lv_id"]) if r else None
        if not lv:
            return
        V = _j(lv["vergabe"], {}) or {}
        a = c.execute("SELECT bieter, contact_id FROM ava_angebot WHERE id=?", (r["angebot_id"],)).fetchone() if r["angebot_id"] else None
        cid = (a["contact_id"] if a else None) or V.get("contact_id")
        name = (a["bieter"] if a else "") or V.get("bieter") or ""
        k = c.execute("SELECT name, email FROM contacts WHERE id=?", (cid,)).fetchone() if cid else None
        if not k and name:
            k = c.execute("SELECT id, name, email FROM contacts WHERE lower(name)=lower(?) ORDER BY id LIMIT 1", (name,)).fetchone()
            cid = k["id"] if k else None
        p = c.execute("SELECT name FROM projects WHERE id=?", (lv["project_id"],)).fetchone() if lv["project_id"] else None
        benachrichtigung.protokoll(c, KOM_ART[r["art"]], [{"contact_id": cid, "email": (k["email"] if k else "") or "", "name": name}],
                                   project_id=lv["project_id"], projekt=p["name"] if p else "", betreff=f"{ARTEN[r['art']]}{' – ' + was if was else ''} · LV {lv['nr']} {lv['name']}".strip(),
                                   von=C.full_name(g.user) or g.user["name"], weg="pdf", status="gesendet", link=f"ava:#lv={lv['id']}&vgdok={vid}")
    except Exception as e:   # noqa: BLE001
        print("Kommunikation (Vergabe):", e, flush=True)


def _antwort(c, lid, **mehr):
    return jsonify(dokumente=liste(c, lid), arten=ARTEN, status=STATUS, ag_arten=AG_ARTEN, grundlagen=[[k, t] for k, t, _ in GRUNDLAGEN], **mehr)


@app.get("/api/lv/<int:lid>/vergabedok")
def vd_liste(lid):
    with db.tx() as c:
        if not _lv(c, lid):
            return jsonify(error="LV nicht gefunden"), 404
        return _antwort(c, lid)


@app.post("/api/lv/<int:lid>/besprechung")
def besprechung_neu(lid):
    """Protokoll für einen Bieter anlegen (oder das vorhandene öffnen) – vorausgefüllt. b: {angebot_id, summe, klaerung} (Summe und
    auffällige Positionen rechnet der Browser aus dem Preisspiegel)."""
    b = request.get_json(silent=True) or {}
    with db.tx() as c:
        r = _lv(c, lid)
        if not r:
            return jsonify(error="LV nicht gefunden"), 404
        a = c.execute("SELECT * FROM ava_angebot WHERE id=? AND lv_id=?", (b.get("angebot_id"), lid)).fetchone()
        if not a:
            return jsonify(error="Angebot nicht gefunden"), 404
        da = c.execute("SELECT id FROM ava_vergabedok WHERE lv_id=? AND angebot_id=? AND art='besprechung'", (lid, a["id"])).fetchone()
        if da:
            return _antwort(c, lid, neu=da["id"])
        p = c.execute("SELECT name, client, street, zip, city FROM projects WHERE id=?", (r["project_id"],)).fetchone() if r["project_id"] else None
        k = c.execute("SELECT * FROM contacts WHERE id=?", (a["contact_id"],)).fetchone() if a["contact_id"] else None
        bh = c.execute("SELECT * FROM contacts WHERE name=?", (p["client"],)).fetchone() if p and p["client"] else None
        S, buero = _buero(c)
        netto = _f(b.get("summe"), 0)
        D = {
            "kopf": {"datum": date.today().isoformat(), "uhrzeit": "", "ort": f"Büro {S.get('co_short') or S.get('office_name', '')}".strip(),
                     "bauvorhaben": (p["name"] if p else "") + (f", {p['street']}, {p['zip'] or ''} {p['city'] or ''}".rstrip(", ") if p and p["street"] else ""),
                     "bauherr": _adresse(bh) if bh else (p["client"] if p and p["client"] else ""), "architekt": buero,
                     "bieter": _adresse(k, True) if k else a["bieter"], "teilnehmer": C.full_name(g.user) or g.user["name"]},
            "bieterangaben": {"rechtsform": "", "mitarbeiter": "", "mitarbeiter_projekt": "", "bauleiter": "", "subunternehmer": ""},
            "angebot": {"gueltig": "ja", "gewerke": r["gewerk"] or r["name"], "angebot_vom": a["eingang"] or "", "nachtrag_vom": "",
                        "summe": f"{_eur(netto)} netto zuzüglich MwSt. (brutto {_eur(netto * 1.19)})" if netto else "",
                        "nachlass": _pz(a["nachlass"] or 0), "skonto": _pz(a["skonto"] or 0), "skonto_tage": str(a["skonto_tage"] or ""),
                        "preis": "Die Leistungen werden nach Einheitspreisen abgerechnet.", "klaerung": _s(b.get("klaerung"), 2000)},
            "termine": {"beginn": "", "fertig": "", "unterbrechung": "", "bauzeitenplan": "", **_termine(c, r["project_id"], r["gewerk"], r["name"])},
            "grundlagen": vorgaben(c),
            "sonstiges": "",
        }
        vid = c.execute("INSERT INTO ava_vergabedok(lv_id, angebot_id, art, data, geaendert, von) VALUES(?,?,?,?,?,?) RETURNING id",
                        (lid, a["id"], "besprechung", json.dumps(D, ensure_ascii=False), _now(), g.user["name"])).fetchone()["id"]
        C.audit(g.user["name"], "ava", "Angebotsbesprechung angelegt", f"LV {r['nr']} {r['name']} · {a['bieter']}")
        _kommunikation(c, vid, "angelegt")
        return _antwort(c, lid, neu=vid)


def _vertrag_daten(c, r, ag_art="unternehmen"):
    """Vertragsangaben aus Auftrag (Vergabe) und – falls vorhanden – dem Protokoll der Angebotsbesprechung mit diesem Bieter."""
    V = _j(r["vergabe"], {}) or {}
    p = c.execute("SELECT name, client, street, zip, city FROM projects WHERE id=?", (r["project_id"],)).fetchone() if r["project_id"] else None
    bh = c.execute("SELECT * FROM contacts WHERE name=?", (p["client"],)).fetchone() if p and p["client"] else None
    k = c.execute("SELECT * FROM contacts WHERE id=?", (V.get("contact_id"),)).fetchone() if V.get("contact_id") else None
    pr = c.execute("SELECT data, erstellt FROM ava_vergabedok WHERE lv_id=? AND angebot_id=? AND art='besprechung' ORDER BY id DESC LIMIT 1",
                   (r["id"], V.get("angebot_id"))).fetchone() if V.get("angebot_id") else None
    P = _j(pr["data"], {}) if pr else {}
    A, T, G = P.get("angebot") or {}, P.get("termine") or {}, P.get("grundlagen") or vorgaben(c)
    pdat = _de((P.get("kopf") or {}).get("datum"))
    summe = _f(V.get("summe"), 0) or 0
    try:   # Auftragssumme wie in der Ansicht (Rechenkern der Ausschreibung)
        from ava import _payload
        summe = (_payload(c, r).get("calc") or {}).get("auftrag") or summe
    except Exception:   # noqa: BLE001 – ohne Rechenkern die gespeicherte Summe
        pass
    verbraucher = ag_art == "privat"
    best = ["dieser Vertrag"]
    if pr:
        best.append(f"das Protokoll der Angebotsbesprechung vom {pdat}")
    best.append(f"das Leistungsverzeichnis „{r['name']}“ mit Vorbemerkungen" + (f" und das Angebot vom {_de(A.get('angebot_vom'))}" if A.get("angebot_vom") else ""))
    if T.get("bauzeitenplan"):
        best.append("der Bauzeitenplan " + re.sub(r"\s*–.*$", "", T["bauzeitenplan"]))
    best.append("die Ausführungspläne des Architekten")
    best.append("die Allgemeinen Technischen Vertragsbedingungen für Bauleistungen (VOB/C) in der bei Vertragsschluss geltenden Fassung")
    best.append("die Vorschriften des BGB über den Bauvertrag (§§ 650a ff. BGB)" if verbraucher else "die Vergabe- und Vertragsordnung für Bauleistungen Teil B (VOB/B) in der Fassung 2016")
    nl = (f", abzüglich {A.get('nachlass')} % Nachlass" if _f(A.get("nachlass"), 0) else "")
    sk = A.get("skonto") if _f(A.get("skonto"), 0) else ""
    return {
        "ag_art": ag_art,
        "ag": _adresse(bh) if bh else (p["client"] if p and p["client"] else ""), "ag_vertreter": "",
        "an": _adresse(k) if k else (V.get("bieter") or ""),
        "gegenstand": f"{r['gewerk'] or r['name']} für das Bauvorhaben {p['name'] if p else ''}".strip(),
        "bestandteile": "\n".join(f"{i}. {x}" for i, x in enumerate(best, 1)) + "\nBei Widersprüchen gelten die Bestandteile in dieser Reihenfolge.",
        "verguetung": (f"Einheitspreisvertrag. Abgerechnet wird nach den tatsächlich ausgeführten Mengen zu den Einheitspreisen des Angebots{nl}. "
                       f"Vorläufige Auftragssumme: {_eur(summe)} netto zuzüglich der gesetzlichen Umsatzsteuer.") if summe else "Einheitspreisvertrag nach den Einheitspreisen des Angebots.",
        "termine": "\n".join(x for x in (f"Beginn der Ausführung: {T['beginn']}" if T.get("beginn") else "", f"Fertigstellung: {T['fertig']}" if T.get("fertig") else "",
                                         f"Der Bauzeitenplan {re.sub(r'^.*?„', '„', T['bauzeitenplan']) if '„' in (T.get('bauzeitenplan') or '') else ''} ist Vertragsbestandteil." if T.get("bauzeitenplan") else "",
                                         f"Vertragsstrafe: {G.get('vertragsstrafe')}" if G.get("vertragsstrafe") else "") if x),
        "zahlung": ("Abschlagszahlungen auf Grundlage prüfbarer Aufmaße und Rechnungen" + ("" if verbraucher else " nach § 16 VOB/B") + "."
                    + (f" Bei Zahlung innerhalb von {A.get('skonto_tage') or '…'} Arbeitstagen nach Eingang der prüfbaren Rechnung darf der Auftraggeber {sk} % Skonto abziehen." if sk else "")
                    + (f"\n{G['rechnungsstellung']}" if G.get("rechnungsstellung") else "")),
        "sicherheiten": "\n".join(x for x in (f"Vertragserfüllung: {G.get('erfuellung')}" if G.get("erfuellung") else "", f"Mängelansprüche: {G.get('einbehalt')}" if G.get("einbehalt") else "") if x),
        "abnahme": f"Die Abnahme erfolgt förmlich{' (§ 12 Abs. 4 VOB/B)' if not verbraucher else ''}. Verjährungsfrist für Mängelansprüche: {G.get('gewaehrleistung') or ('4 Jahre (§ 13 Abs. 4 VOB/B)' if not verbraucher else '5 Jahre (§ 634a BGB)')} ab Abnahme.",
        "weiteres": "\n".join(x for x in (G.get("bescheinigungen") or "", "Der Auftragnehmer weist eine ausreichende Betriebshaftpflichtversicherung nach.",
                                          "Nachunternehmer setzt der Auftragnehmer nur mit vorheriger Zustimmung des Auftraggebers ein.",
                                          f"Energie- und Medienkosten: {G['energie']}" if G.get("energie") else "",
                                          "Änderungen und Ergänzungen dieses Vertrags bedürfen der Textform. Sollte eine Bestimmung unwirksam sein, bleibt der Vertrag im Übrigen wirksam.") if x),
        "ort_datum": "",
    }


@app.post("/api/lv/<int:lid>/bauvertrag")
def vertrag_neu(lid):
    """Bauvertrag (art=vertrag) oder Auftragsschreiben (art=schreiben) aus Auftrag + Protokoll anlegen. b: {art, ag_art}"""
    b = request.get_json(silent=True) or {}
    art = b.get("art") if b.get("art") in ("vertrag", "schreiben") else "vertrag"
    ag_art = b.get("ag_art") if b.get("ag_art") in AG_ARTEN else "unternehmen"
    with db.tx() as c:
        r = _lv(c, lid)
        if not r:
            return jsonify(error="LV nicht gefunden"), 404
        V = _j(r["vergabe"], {}) or {}
        if not (V.get("bieter") or V.get("frei")):
            return jsonify(error="Erst vergeben – der Vertrag entsteht aus dem Auftrag."), 409
        D = {"vertrag": _vertrag_daten(c, r, ag_art)}
        vid = c.execute("INSERT INTO ava_vergabedok(lv_id, angebot_id, art, data, geaendert, von) VALUES(?,?,?,?,?,?) RETURNING id",
                        (lid, V.get("angebot_id"), art, json.dumps(D, ensure_ascii=False), _now(), g.user["name"])).fetchone()["id"]
        C.audit(g.user["name"], "ava", f"{ARTEN[art]} angelegt", f"LV {r['nr']} {r['name']} · {V.get('bieter') or ''}")
        _kommunikation(c, vid, "angelegt")
        return _antwort(c, lid, neu=vid)


def _dok(c, vid):
    r = c.execute("SELECT * FROM ava_vergabedok WHERE id=?", (vid,)).fetchone()
    if not r or not _lv(c, r["lv_id"]):
        return None
    return r


@app.put("/api/vergabedok/<int:vid>")
def vd_aendern(vid):
    """b: Felder je Bereich (siehe FELDER), sonstiges; status: entwurf (wieder öffnen); ag_art (Vertrag neu aufbauen)."""
    b = request.get_json(silent=True) or {}
    with db.tx() as c:
        r = _dok(c, vid)
        if not r:
            return jsonify(error="Nicht gefunden"), 404
        D = _sauber(_j(r["data"], {}), b)
        if "sonstiges" in b:
            D["sonstiges"] = _s(b.get("sonstiges"), 4000)
        if b.get("neu_aufbauen") and r["art"] in ("vertrag", "schreiben"):   # z. B. andere Art des Auftraggebers: Texte neu aus Auftrag + Protokoll
            D["vertrag"] = _vertrag_daten(c, _lv(c, r["lv_id"]), (b.get("vertrag") or {}).get("ag_art") or (D.get("vertrag") or {}).get("ag_art") or "unternehmen")
        status = r["status"]
        if b.get("status") == "entwurf" and status != "entwurf":
            status = "entwurf"
        c.execute("UPDATE ava_vergabedok SET data=?, status=?, geaendert=? WHERE id=?", (json.dumps(D, ensure_ascii=False), status, _now(), vid))
        return _antwort(c, r["lv_id"])


@app.post("/api/vergabedok/vorgaben")
def vd_vorgaben():
    """Die „Grundlagen“ dieses Protokolls als Vorgabe des Büros merken (gilt für neue Protokolle)."""
    b = request.get_json(silent=True) or {}
    G = {k: _s((b.get("grundlagen") or {}).get(k, ""), 2000) for k, _, _ in GRUNDLAGEN}
    with db.tx() as c:
        c.execute("INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", (VORGABEN_KEY, json.dumps(G, ensure_ascii=False)))
    return jsonify(ok=True, vorgaben=G)


def _zahl(t):
    m = re.search(r"-?\d+(?:[.,]\d+)?", str(t or ""))
    return float(m.group(0).replace(",", ".")) if m else None


@app.post("/api/vergabedok/<int:vid>/abschliessen")
def vd_abschliessen(vid):
    """Protokoll abschließen: Nachlass und Skonto ins Angebot (die Vergabe übernimmt sie); ist schon an diesen Bieter vergeben,
    auch in den Auftrag, dazu Einbehalt für Mängelansprüche und Verjährungsfrist. → {übernommen: [...]}"""
    with db.tx() as c:
        r = _dok(c, vid)
        if not r or r["art"] != "besprechung":
            return jsonify(error="Nicht gefunden"), 404
        D = _j(r["data"], {}) or {}
        A, G = D.get("angebot") or {}, D.get("grundlagen") or {}
        a = c.execute("SELECT * FROM ava_angebot WHERE id=?", (r["angebot_id"],)).fetchone()
        neu = []
        if a:
            nl, sk, st = _zahl(A.get("nachlass")), _zahl(A.get("skonto")), _zahl(A.get("skonto_tage"))
            werte = {"nachlass": max(0.0, min(100.0, nl)) if nl is not None else a["nachlass"], "skonto": max(0.0, min(100.0, sk)) if sk is not None else a["skonto"],
                     "skonto_tage": int(max(0, min(365, st))) if st is not None else a["skonto_tage"]}
            c.execute("UPDATE ava_angebot SET nachlass=?, skonto=?, skonto_tage=?, updated=? WHERE id=?", (werte["nachlass"], werte["skonto"], werte["skonto_tage"], _now(), a["id"]))
            neu.append(f"Angebot: {_pz(werte['nachlass'] or 0)} % Nachlass, {_pz(werte['skonto'] or 0)} % Skonto" + (f" in {werte['skonto_tage']} Tagen" if werte["skonto_tage"] else ""))
            lv = _lv(c, r["lv_id"])
            V = _j(lv["vergabe"], {}) or {}
            if V.get("angebot_id") == a["id"]:
                V.update(nachlass=werte["nachlass"] or 0, skonto=werte["skonto"] or 0, skonto_tage=werte["skonto_tage"] or 0)
                S = dict(V.get("sicherheit") or {})
                ma = dict(S.get("ma") or {})
                eb = _zahl(G.get("einbehalt"))
                if eb is not None:
                    ma["pct"] = eb
                if "bürgschaft" in (G.get("einbehalt") or "").lower() and "ablös" not in (G.get("einbehalt") or "").lower():
                    ma["form"] = "buergschaft"
                S["ma"] = ma
                j = _zahl(G.get("gewaehrleistung"))
                if j is not None and 0 < j <= 30:
                    S["gw_jahre"] = int(j)
                if re.search(r"entf|kein", G.get("erfuellung") or "", re.I):
                    V["einbehalt"] = 0.0
                V["sicherheit"] = S
                c.execute("UPDATE ava_lv SET vergabe=?, rev=rev+1, updated=?, updated_by=? WHERE id=?", (json.dumps(V, ensure_ascii=False), _now(), g.user["name"], lv["id"]))
                neu.append("Auftrag: Nachlass, Skonto, Sicherheiten und Verjährungsfrist")
        c.execute("UPDATE ava_vergabedok SET status='abgeschlossen', geaendert=? WHERE id=?", (_now(), vid))
        C.audit(g.user["name"], "ava", "Angebotsbesprechung abgeschlossen", "; ".join(neu))
        _kommunikation(c, vid, "abgeschlossen")
        return _antwort(c, r["lv_id"], uebernommen=neu)


@app.delete("/api/vergabedok/<int:vid>")
def vd_loeschen(vid):
    with db.tx() as c:
        r = _dok(c, vid)
        if not r:
            return jsonify(error="Nicht gefunden"), 404
        lv = _lv(c, r["lv_id"])
        pk = papierkorb.ablegen(c, "ava_vergabedok", vid, ARTEN.get(r["art"], "Unterlage"), f"{lv['name']}", g.user["name"], "", "ava")
        return _antwort(c, r["lv_id"], papierkorb=pk)


# ---------------------------------------------------------------- PDF
def _pdf(c, r):
    """Protokoll bzw. Vertrag als PDF auf dem Briefbogen des Büros. → (Bytes, Dateiname)"""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.lib.utils import simpleSplit
    from reportlab.pdfgen import canvas
    from bpcore import briefbogen, schrift
    D = _j(r["data"], {}) or {}
    lv = _lv(c, r["lv_id"])
    bogen, F = briefbogen.holen(c), schrift.fuer(c)
    S, buero = _buero(c)
    rand = briefbogen.raender(bogen) or {}
    L, R = rand.get("links") or 25 * mm, A4[0] - (rand.get("rechts") or 20 * mm)
    oben, unten = A4[1] - (rand.get("kopf") or 45 * mm) - 6 * mm, (rand.get("fuss") or 25 * mm) + 6 * mm
    titel = ARTEN.get(r["art"], "Unterlage")
    buf = io.BytesIO()
    cv = canvas.Canvas(buf, pagesize=A4)
    cv.setTitle(f"{titel} {lv['name']}")
    y, seite = oben, [1]
    X2 = L + 52 * mm

    def neu():
        nonlocal y
        cv.setFont(F["n"], 8); cv.setFillGray(0.45)
        cv.drawRightString(R, 12 * mm, f"{titel} · {lv['name'][:60]} · Seite {seite[0]}")
        cv.showPage(); seite[0] += 1; y = A4[1] - 25 * mm

    def platz(h):
        if y - h < unten:
            neu()

    def text(t, x, gr=10, fett=False, grau=False, breite=None):
        nonlocal y
        zs = [z2 for z in str(t or "").split("\n") for z2 in (simpleSplit(z, F["b"] if fett else F["n"], gr, breite or (R - x)) or [""])]
        for z in zs:
            platz(gr * 0.45 * mm + 1)
            cv.setFont(F["b"] if fett else F["n"], gr); cv.setFillGray(0.45 if grau else 0)
            cv.drawString(x, y, z); y -= gr * 0.43 * mm + 1.6 * mm
        return len(zs)

    def kapitel(t):
        nonlocal y
        platz(16 * mm); y -= 3 * mm
        cv.setFont(F["n"], 13); cv.setFillGray(0); cv.drawString(L, y, t); y -= 3 * mm
        cv.setStrokeGray(0.75); cv.setLineWidth(0.5); cv.line(L, y, R, y); y -= 5 * mm

    def feld(label, wert):
        nonlocal y
        platz(6 * mm)
        y0 = y
        cv.setFont(F["b"], 7.8); cv.setFillGray(0.2)
        for i, z in enumerate(simpleSplit(label.upper(), F["b"], 7.8, X2 - L - 3 * mm)[:3]):
            cv.drawString(L, y0 - i * 3.4 * mm, z)
        text(wert or "", X2, gr=9.5)
        y = min(y, y0 - 3.6 * mm * len(simpleSplit(label.upper(), F["b"], 7.8, X2 - L - 3 * mm)[:3])) - 1.4 * mm

    if r["art"] == "besprechung":
        K, B, A, T, G = (D.get(k) or {} for k in ("kopf", "bieterangaben", "angebot", "termine", "grundlagen"))
        cv.setFont(F["n"], 20); cv.drawString(L, y, "Angebotsbesprechung"); y -= 11 * mm
        cv.setFont(F["n"], 10); cv.setFillGray(0.5); cv.drawString(L, y, "PROTOKOLL"); cv.setFillGray(0)
        cv.drawString(L + 50 * mm, y, _de(K.get("datum"))); cv.drawString(L + 85 * mm, y, (K.get("uhrzeit") or "") + (" Uhr" if K.get("uhrzeit") else ""))
        cv.drawRightString(R, y, f"Ort: {K.get('ort') or ''}"); y -= 4 * mm
        cv.setStrokeGray(0.75); cv.line(L, y, R, y); y -= 6 * mm
        for lab, k in (("Bauvorhaben", "bauvorhaben"), ("Bauherr/AG", "bauherr"), ("Architekt", "architekt"), ("Bieter/AN", "bieter"), ("Teilnehmer", "teilnehmer")):
            feld(lab, K.get(k))
        kapitel("Angaben zum Bieter/AN:")
        for lab, k in (("Rechtsform/Sitz", "rechtsform"), ("Anzahl der Mitarbeiter", "mitarbeiter"), ("Mitarbeiter für das Projekt", "mitarbeiter_projekt"),
                       ("Bauleiter für das Projekt", "bauleiter"), ("Subunternehmer", "subunternehmer")):
            feld(lab, B.get(k))
        kapitel("Angaben zum Angebot:")
        feld("Gültigkeit des Angebots", A.get("gueltig")); feld("Angebotene Gewerke", A.get("gewerke"))
        feld("Angebot vom", _de(A.get("angebot_vom")) + (f"      Nachtragsangebot vom {_de(A.get('nachtrag_vom'))}" if A.get("nachtrag_vom") else ""))
        feld("Angebotssumme nach Prüfung", A.get("summe"))
        feld("Skonto/Nachlässe", f"{A.get('nachlass') or '0'} % Nachlass auf die Einheitspreise und {A.get('skonto') or '0'} % Skonto bei Zahlungen innerhalb {A.get('skonto_tage') or '…'} Arbeitstagen (Mo–Fr)")
        feld("Preis", A.get("preis"))
        if A.get("klaerung"):
            feld("Klärung einzelner Positionen", A.get("klaerung"))
        kapitel("Termine:")
        for lab, k in (("Beginn der Ausführung", "beginn"), ("Fertigstellung der Arbeiten", "fertig"), ("Arbeitsunterbrechung", "unterbrechung"), ("Bauzeitenplan", "bauzeitenplan")):
            feld(lab, T.get(k))
        kapitel("Grundlagen")
        for k, lab, _ in GRUNDLAGEN:
            feld(lab, G.get(k))
        kapitel("Sonstiges")
        text(D.get("sonstiges") or "", L, gr=9.5)
        platz(60 * mm); y -= 6 * mm
        cv.setFont(F["b"], 13); cv.drawString(L, y, "Dieses Protokoll wird bei einer Auftragserteilung Bestandteil des Vertrages!"); y -= 14 * mm
        ort = (S.get("co_city") or "") + (", " + _de(K.get("datum")) if K.get("datum") else "")
        for wer in ("Unterschrift Bauherr/in", "Unterschrift Architekt/in", "Unterschrift Bieter/in"):
            cv.setFont(F["n"], 9.5); cv.drawString(L, y + 1.5 * mm, ort)
            cv.setStrokeGray(0.4); cv.line(L, y, L + 60 * mm, y); cv.line(L + 75 * mm, y, R, y)
            cv.setFont(F["n"], 8); cv.drawString(L, y - 3.5 * mm, "Ort/Datum"); cv.drawString(L + 75 * mm, y - 3.5 * mm, wer)
            y -= 17 * mm
        name = f"Angebotsbesprechung {lv['name']} {(K.get('bieter') or '').splitlines()[0] if K.get('bieter') else ''}".strip()
    else:
        Vt = D.get("vertrag") or {}
        schreiben = r["art"] == "schreiben"
        cv.setFont(F["n"], 20); cv.drawString(L, y, "Auftragsschreiben" if schreiben else "Bauvertrag"); y -= 7 * mm
        cv.setFont(F["n"], 9.5); cv.setFillGray(0.45)
        cv.drawString(L, y, "Einheitspreisvertrag" + (" nach BGB (§§ 650a ff.)" if Vt.get("ag_art") == "privat" else " unter Einbeziehung der VOB/B")); cv.setFillGray(0); y -= 9 * mm
        feld("Auftraggeber", Vt.get("ag") + (f"\nvertreten durch {Vt['ag_vertreter']}" if Vt.get("ag_vertreter") else ""))
        feld("Auftragnehmer", Vt.get("an"))
        feld("Bauleitung / Architekt", buero)
        abschn = [("Gegenstand", "gegenstand"), ("Vertragsbestandteile", "bestandteile"), ("Vergütung", "verguetung"), ("Ausführungsfristen", "termine"),
                  ("Zahlung", "zahlung"), ("Sicherheiten", "sicherheiten"), ("Abnahme und Mängelansprüche", "abnahme"), ("Weitere Vereinbarungen", "weiteres")]
        if schreiben:
            y -= 3 * mm
            text(f"Sehr geehrte Damen und Herren,\n\nauf Grundlage Ihres Angebots{(' und der Angebotsbesprechung') if 'Angebotsbesprechung' in (Vt.get('bestandteile') or '') else ''} "
                 f"erteilen wir Ihnen im Namen und im Auftrag des Auftraggebers den Auftrag über: {Vt.get('gegenstand') or ''}.", L)
            y -= 2 * mm
        for i, (t, k) in enumerate(abschn, 1):
            if not Vt.get(k):
                continue
            platz(14 * mm); y -= 2 * mm
            cv.setFont(F["b"], 10.5); cv.drawString(L, y, f"§ {i}  {t}" if not schreiben else t); y -= 5.5 * mm
            text(Vt.get(k), L, gr=9.5)
        if schreiben:
            y -= 2 * mm
            text("Bitte bestätigen Sie den Auftrag durch Ihre Unterschrift und senden Sie uns ein Exemplar zurück.\n\nMit freundlichen Grüßen", L)
        platz(45 * mm); y -= 12 * mm
        ort = Vt.get("ort_datum") or f"{S.get('co_city') or ''}, {date.today().strftime('%d.%m.%Y')}"
        cv.setStrokeGray(0.4)
        cv.line(L, y, L + 70 * mm, y); cv.line(R - 70 * mm, y, R, y)
        cv.setFont(F["n"], 8)
        cv.drawString(L, y - 3.5 * mm, f"{ort} – Auftraggeber{' (bzw. Architekt in Vollmacht)' if not schreiben else ' / Architekt'}")
        cv.drawString(R - 70 * mm, y - 3.5 * mm, "Ort, Datum – Auftragnehmer")
        if Vt.get("ag_art") == "privat":
            y -= 14 * mm
            text("Hinweis für den Gebrauch: Gegenüber Verbrauchern ist die VOB/B nicht als Ganzes privilegiert; dieser Vertrag stützt sich deshalb auf das BGB. "
                 "Ob ein Verbraucherbauvertrag (§ 650i BGB) vorliegt, ist im Einzelfall zu prüfen – bei Vergabe einzelner Gewerke meist nicht.", L, gr=7.5, grau=True)
        name = f"{'Auftragsschreiben' if schreiben else 'Bauvertrag'} {lv['name']} {(Vt.get('an') or '').splitlines()[0] if Vt.get('an') else ''}".strip()
    cv.setFont(F["n"], 8); cv.setFillGray(0.45); cv.drawRightString(R, 12 * mm, f"{titel} · {lv['name'][:60]} · Seite {seite[0]}")
    cv.save()
    pdf = briefbogen.unterlegen(buf.getvalue(), bogen)
    return pdf, re.sub(r"[^\w .()-]+", "_", name)[:120] + ".pdf"


@app.get("/api/vergabedok/<int:vid>.pdf")
def vd_pdf(vid):
    """Unterschrieben hinterlegt → diese Fassung; sonst frisch erzeugt (?neu=1: immer frisch)."""
    with db.tx() as c:
        r = _dok(c, vid)
        if not r:
            return jsonify(error="Nicht gefunden"), 404
        if r["status"] == "unterschrieben" and request.args.get("neu") != "1" and (r["ablage"] or r["pdf"]):
            if r["pdf"]:   # ältere Fassung: noch in der Datenbank (vor dem 12.11.2026)
                data, name = bytes(r["pdf"]), r["pdf_name"] or "Unterlage.pdf"
            else:   # liegt im Projektordner – nur der Verweis steht hier
                pid, pfad, name = _lv(c, r["lv_id"])["project_id"], r["ablage"], (r["ablage"] or "").rsplit("/", 1)[-1]
                try:
                    data = C.bt_api("GET", "/api/dateien/datei?" + urllib.parse.urlencode({"project_id": pid, "pfad": pfad}), roh=True)
                except RuntimeError as e:
                    return jsonify(error=f"Unterschriebene Fassung im Projektordner nicht lesbar: {e}"), 502
        else:
            data, name = _pdf(c, r)
    from urllib.parse import quote
    return Response(data, mimetype="application/pdf", headers={"Content-Disposition": f"inline; filename*=UTF-8''{quote(name)}", "Cache-Control": "no-store"})


@app.post("/api/vergabedok/<int:vid>/unterschrieben")
def vd_unterschrieben(vid):
    """Unterschriebenes PDF aus der Vorschau hinterlegen und im Projektordner ablegen (Testserver: nur lesen → Meldung)."""
    f = request.files.get("datei")
    if not f:
        return jsonify(error="Keine Datei."), 400
    daten = f.read(30 * 1024 * 1024 + 1)
    if not daten.startswith(b"%PDF") or len(daten) > 30 * 1024 * 1024:
        return jsonify(error="Bitte ein PDF (höchstens 30 MB)."), 400
    name = re.sub(r"[^\w .()-]+", "_", f.filename or "Unterlage.pdf")[:120]
    with db.tx() as c:
        r = _dok(c, vid)
        if not r:
            return jsonify(error="Nicht gefunden"), 404
        lv = _lv(c, r["lv_id"])
    # Dokumente gehören auf den Dateiserver, nicht in die Datenbank: erst ablegen, dann nur den Verweis merken
    pfad, fehl = C.projektordner_ablegen({"project_id": lv["project_id"], "art": "angebot" if r["art"] == "besprechung" else "vertrag",
                                          "gewerk": lv["gewerk"] or "", "name": name, "datei": base64.b64encode(daten).decode()})
    if pfad is None:
        return jsonify(error=f"Nicht gespeichert – {fehl}."), 502
    with db.tx() as c:
        if fehl == "testserver":   # nur zum Ausprobieren: in der Datenbank
            c.execute("UPDATE ava_vergabedok SET pdf=?, pdf_name=?, status='unterschrieben', geaendert=? WHERE id=?", (daten, name, _now(), vid))
        else:
            c.execute("UPDATE ava_vergabedok SET pdf=NULL, pdf_name=?, ablage=?, status='unterschrieben', geaendert=? WHERE id=?", (name, pfad, _now(), vid))
        C.audit(g.user["name"], "ava", f"{ARTEN.get(r['art'])} unterschrieben", f"LV {lv['nr']} {lv['name']}")
        _kommunikation(c, vid, "unterschrieben")
        return _antwort(c, r["lv_id"], ablage=pfad, ablage_fehler="Testserver – nur hier gespeichert, nicht im Projektordner" if fehl == "testserver" else "")
