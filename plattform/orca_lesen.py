"""ORCA AVA → Bauplattform: liest eine ORCA-Projektdatei (*.ava, Access 97) und baut daraus LVs, Angebote, Vergaben und
Rechnungen im Format der AVA (ava_lv.data/.vergabe, ava_angebot, ava_rechnung). Ohne Datenbank – das Eintragen macht
orca_import.py. So lässt sich der Umsetzer mit den Rechenfunktionen der AVA (ava.rechne) prüfen, bevor etwas gespeichert wird.

Tabellen in ORCA (je Projekt eine Datei):
  DB_Options   Projektdaten (Schlüssel/Wert: 3 Bezeichnung, 4 Nummer, 1011–1014 Bauvorhaben, 1021–1029 Bauherr …)
  LV           Ausschreibung als Baum (idParent): Art 0 Wurzel · 1 LV (Gewerk) · 2/3… Titel · P Position · T Hinweis
  EPreise      Preisspiegel: Art 'LV', IDParent = LV-Zeile, Nr > 0 = Bieter (Kopfzeile am LV: Bem = Name, Datum),
               Nr < 0 = Auswertungen (Mittel, Min, Max …) – werden nicht übernommen
  Auf          Aufträge als Baum wie LV, idLV = zugehöriges LV (0 = Auftrag ohne Ausschreibung), Bieter, VMenge/VEP
               (Auftragsmenge/-preis), AbZuP (Nachlass in % am Auftrag, negativ). Flags & 4 = Nachtragsposition
               (Summe stimmt mit NP, der Nachtragssumme von ORCA, überein)
  Abr          Rechnungen je Auftrag (Level 2): RArt T Teil-, S Schluss-, R Regie-, N Nachtrags-, F Freigabe der Sicherheit;
               Netto = kumulierte Leistung netto, SEBPrz/SEB Sicherheitseinbehalt (% / Betrag brutto), Skonto in %
  AbrPrf       Prüfstand je Position: Nr = id der Rechnung (Abr.id), idParent = Auftragsposition, Menge kumuliert
  Texte        Langtexte (LT: formatiert, UTF-16 nach 18 Byte Kopf – oder einfacher Text; txt4TT nur Vorschau)
Adressen stehen nicht in der Projektdatei (ORCA hat dafür eine eigene Adressdatenbank) – übernommen werden die Firmennamen.
"""
import io, os, re, struct, tempfile, zipfile
from collections import defaultdict
from datetime import datetime

import orca_jet3

RE_ART = {"T": "abschlag", "S": "schluss", "R": "regie", "N": "nachtrag", "F": "sicherheit"}
PAUSCHAL = {"psch", "pausch", "pauschal", "pau", "pschl", "psch."}
MWST = 19.0



def nt_kennung(titel):
    """Nachtragskennung wie in der Plattform: „NT 3“-Schema – aus „Nachtrag 3“, „NT3“, „3“ wird „NT3“; sonst der Titel (ohne „Nachtrag“)."""
    t = (titel or "").strip()
    m = re.match(r"(?i)^(?:nachtrag|nt|n)?\s*(?:nr\.?|no\.?)?\s*[-.:#]?\s*(\d+)\b", t)
    if m:
        return f"NT{int(m.group(1))}"
    return (re.sub(r"(?i)^nachtrag\s*", "", t).strip() or "NT")[:20]

def _iso(d):
    return d.date().isoformat() if isinstance(d, datetime) else ""


def _f(v):
    try:
        return float(v) if v is not None else 0.0
    except (TypeError, ValueError):
        return 0.0


def _s(v):
    return (v or "").strip() if isinstance(v, str) else ("" if v is None else str(v))


def _ozt(oz):
    """Teil einer Ordnungszahl normiert (Leerzeichen und führende Nullen weg) – zum Abgleich LV ↔ Auftrag."""
    t = _s(oz)
    return t.lstrip("0") or ("0" if t else "")


ALLGEMEIN = {"neu", "fa", "firma", "gmbh", "mbh", "co", "kg", "ek", "e", "k", "ag", "ohg", "gbr", "und", "inh", "bau", "bauunternehmung", "der", "die", "das"}


def _teile(name):
    return {w for w in re.findall(r"[a-z0-9äöüß]+", re.sub(r"[\"„“].*?[\"“”]", " ", (name or "").casefold())) if w not in ALLGEMEIN and len(w) > 1}


def langtext(row):
    """Langtext aus der Texte-Tabelle: formatiert (Kennung B1 04) = UTF-16 nach 18 Byte Kopf; sonst einfacher Text."""
    if not row:
        return ""
    b = row.get("LT")
    t = ""
    if isinstance(b, (bytes, bytearray)) and b:
        if b[:2] == b"\xb1\x04" and len(b) >= 18:
            n = struct.unpack_from("<H", b, 14)[0]
            t = bytes(b[18:18 + 2 * n]).decode("utf-16le", "replace")
            t = t.replace("\x1f", "").replace("\t", " ")   # weiche Trennstellen, Tabulatoren
        else:
            t = bytes(b).split(b"\x00")[0].decode("cp1252", "replace")
    if not t.strip():
        t = _s(row.get("txt4TT"))
    t = t.replace("\r\n", "\n").replace("\r", "\n")
    t = re.sub(r"[  ]+\n", "\n", re.sub(r"[  ]{2,}", " ", t))
    return t.strip()


# ---------------------------------------------------------------- Datei öffnen
def oeffnen(pfad):
    """Pfad zu .ava oder .zip (ORCA-Projektsicherung) → (Pfad der .ava, aufräumen()). Entpackt ins Temp-Verzeichnis."""
    with open(pfad, "rb") as fh:
        kopf = fh.read(4)
    if kopf[:2] == b"PK":
        z = zipfile.ZipFile(pfad)
        namen = [n for n in z.namelist() if n.lower().endswith(".ava")]
        if not namen:
            raise ValueError("In der ZIP-Datei steht keine ORCA-Projektdatei (*.ava).")
        if len(namen) > 1:
            raise ValueError("Die ZIP-Datei enthält mehrere Projekte – bitte je Projekt eine Datei hochladen.")
        tmp = tempfile.NamedTemporaryFile(suffix=".ava", delete=False, dir=os.environ.get("ORCA_TMP") or None)
        with z.open(namen[0]) as src:
            while True:
                b = src.read(8 << 20)
                if not b:
                    break
                tmp.write(b)
        tmp.close()
        return tmp.name, lambda: os.unlink(tmp.name)
    return pfad, lambda: None


TABELLEN = ("DB_Options", "LV", "Auf", "Abr", "AbrPrf", "EPreise", "Texte")


def tabellen(pfad, fortschritt=None):
    """Alle benötigten Tabellen als Listen von Zeilen (dict)."""
    db = orca_jet3.DB(pfad)
    try:
        vorhanden = db.tables()
        fehlt = [t for t in TABELLEN if t not in vorhanden]
        if fehlt:
            raise ValueError("Das ist keine ORCA-AVA-Projektdatei (es fehlen die Tabellen " + ", ".join(fehlt) + ").")
        T = {}
        for k, n in enumerate(TABELLEN):
            if fortschritt:
                fortschritt(f"Lese {n} …", k / len(TABELLEN))
            cols = ["ID", "LT", "txt4TT"] if n == "Texte" else None
            T[n] = list(db.table(n).rows(cols))
        return T
    finally:
        db.close()


# ---------------------------------------------------------------- Umsetzen
def umsetzen(T, dateiname=""):
    """ORCA-Tabellen → {"projekt", "lvs", "firmen", "warnungen"} im Format der AVA."""
    W = []
    opt = {r["Key"]: _s(r.get("Value")) for r in T["DB_Options"] if r.get("Key") is not None}
    projekt = {"nr": opt.get(4, ""), "name": opt.get(3, ""),
               "bauvorhaben": " ".join(x for x in (opt.get(1011), opt.get(1012), opt.get(1013), opt.get(1014)) if x),
               "bauherr": ", ".join(x for x in (opt.get(1021, "").rstrip(","), opt.get(1022), opt.get(1023)) if x),
               "bauherr_kontakt": " · ".join(x for x in (opt.get(1027), opt.get(1029)) if x),
               "orca_version": opt.get(132) or opt.get(1, ""), "datei": dateiname, "mwst": _f(opt.get(1122)) or MWST}
    texte = {r["ID"]: r for r in T["Texte"] if r.get("ID") is not None}
    lang = lambda i: langtext(texte.get(i)) if i else ""   # noqa: E731

    def baum(rows):
        kids = defaultdict(list)
        for r in rows:
            kids[r["idParent"]].append(r)
        for v in kids.values():
            v.sort(key=lambda r: (r.get("Nr") or 0, r["id"]))
        return kids

    lvk, aufk = baum(T["LV"]), baum(T["Auf"])
    lv_by = {r["id"]: r for r in T["LV"]}

    def items_aus(kids, wurzel, pfx, auftrag):
        """Baum unter einem LV/Auftrag → Liste der AVA-Items; dazu {Pfad-Schlüssel: Item-ID} für den Preisabgleich."""
        out, schluessel = [], {}

        def walk(pid, oz_pfad, key_pfad, lvl, nt_titel):
            for r in kids.get(pid, []):
                art, oz = _s(r.get("Art")), _s(r.get("OZ"))
                iid = f"{pfx}{r['id']}"
                if art.isdigit():   # Titel
                    ozv = ".".join(x for x in oz_pfad + [oz] if x)
                    out.append({"id": iid, "typ": "titel", "lvl": max(1, min(4, lvl)), "oz": ozv, "kurz": _s(r.get("Bez"))[:300] or "Titel"})
                    ist_nt = nt_titel or ("nachtrag" in _s(r.get("Bez")).lower())
                    walk(r["id"], oz_pfad + [oz], key_pfad + (_ozt(oz),), lvl + 1, _s(r.get("Bez")) if ist_nt and not nt_titel else nt_titel)
                    continue
                kurz = _s(r.get("Bez"))[:500]
                lt = lang(r.get("LTextID"))
                if art == "T" or (r.get("PosArt1") == 4 and not _f(r.get("VEP" if auftrag else "EP"))):
                    out.append({"id": iid, "typ": "pos", "art": "T", "oz": "", "kurz": kurz or (lt.split("\n")[0][:120] if lt else "Hinweis"),
                                "lang": lt, "menge": 0, "einheit": ""})
                    continue
                eh = _s(r.get("Eh"))[:12]
                p = {"id": iid, "typ": "pos", "oz": ".".join(x for x in oz_pfad + [oz] if x), "kurz": kurz, "lang": lt if lt and lt != kurz else "",
                     "menge": round(_f(r.get("VMenge" if auftrag else "Menge")), 3), "einheit": eh, "art": "N"}
                if eh.lower().rstrip(".") in PAUSCHAL:
                    p["art"] = "P"
                if not r.get("PosAktiv") or r.get("PosArt2") == -1:   # in ORCA nicht aktiv: Bedarfs-/Wahlposition ohne Gesamtbetrag
                    p["art"] = "E"
                kg = re.sub(r"\D", "", _s(r.get("KG")))[:3]
                if kg:
                    p["kg"] = kg
                if auftrag and (r.get("Flags") or 0) & 4:   # Nachtragsposition
                    p["nt"] = nt_kennung(nt_titel)
                    p["nt_status"] = "beauftragt"
                if not auftrag and _f(r.get("EP")):
                    p["ep_s"] = round(_f(r.get("EP")), 2)
                out.append(p)
                if _ozt(oz):
                    schluessel.setdefault(key_pfad + (_ozt(oz),), iid)
                tx = ("#", re.sub(r"\W+", " ", kurz.casefold()).strip(), eh.casefold())
                schluessel[tx] = None if tx in schluessel else iid   # Kurztext + Einheit, nur wenn eindeutig

        walk(wurzel, [], (), 1, "")
        return out, schluessel

    # Preisspiegel: Bieter je LV und Preise je LV-Position
    ep_rows = [e for e in T["EPreise"] if _s(e.get("Art")) == "LV" and (e.get("Nr") or 0) > 0 and not e.get("Deleted")]
    preise_lv = defaultdict(dict)   # LV-Zeile → {Bieter-Nr: EP}
    for e in ep_rows:
        if e.get("EP") is not None:
            preise_lv[e["IDParent"]][e["Nr"]] = round(_f(e["EP"]), 4)
    bieter_lv = defaultdict(dict)   # LV-Wurzel → {Bieter-Nr: Kopfzeile}
    lv_wurzeln = {r["id"] for r in T["LV"] if r.get("Level") == 1}
    for e in ep_rows:
        if e["IDParent"] in lv_wurzeln:
            bieter_lv[e["IDParent"]][e["Nr"]] = e

    def angebote_fuer(lv_row, schluessel_lv, map_id):
        """Angebote aller Bieter eines ORCA-LV; map_id: LV-Item-ID → Item-ID im Ziel-LV (None = übernimmt die LV-IDs)."""
        out = []
        for nr, kopf in sorted(bieter_lv.get(lv_row["id"], {}).items()):
            P, fehlt = {}, 0
            for key, iid in schluessel_lv.items():
                if key[:1] == ("#",) or iid is None:
                    continue
                ziel = map_id(iid) if map_id else iid
                v = preise_lv.get(int(iid[1:]), {}).get(nr)
                if v is None:
                    continue
                if ziel is None:
                    fehlt += 1
                    continue
                P[ziel] = v
            nl = -_f(kopf.get("AbZuP")) if _f(kopf.get("AbZuP")) < 0 else 0.0
            out.append({"bieter": _s(kopf.get("Bem")) or f"Bieter {nr}", "eingang": _iso(kopf.get("Datum")), "preise": P,
                        "nachlass": round(nl, 3), "notiz": "aus ORCA" + (" · ausgeschlossen" if (kopf.get("Flags") or 0) & 16 else ""),
                        "_nr": nr, "_gp": round(_f(kopf.get("GP")), 2), "_ohne_ziel": fehlt})
        return out

    abr_by_auf = defaultdict(list)
    for r in T["Abr"]:
        if r.get("Level") == 2 and r.get("idAuf"):
            abr_by_auf[r["idAuf"]].append(r)
    prf = defaultdict(dict)   # Abr.id → {Auftragsposition: Menge}
    for x in T["AbrPrf"]:
        if _s(x.get("Art")) == "Auf" and x.get("Nr") and _f(x.get("Menge")):   # Menge 0 = in ORCA nicht nach Positionen geprüft
            prf[x["Nr"]][x["idParent"]] = _f(x["Menge"])

    lvs, firmen = [], {}
    verknuepft = set()
    auf_rows = {r["id"]: r for r in T["Auf"]}
    auftraege = sorted([r for r in T["Auf"] if r.get("Level") == 1], key=lambda r: (r.get("Nr") or 0, r["id"]))
    for a in auftraege:
        items, sch_auf = items_aus(aufk, a["id"], "a", True)
        pos_ids = {x["id"] for x in items if x["typ"] == "pos"}
        lv_row = lv_by.get(a.get("idLV")) if a.get("idLV") else None
        ang = []
        if lv_row:
            verknuepft.add(lv_row["id"])
            _, sch_lv = items_aus(lvk, lv_row["id"], "l", False)
            umk = {v: sch_auf.get(k) for k, v in sch_lv.items() if k[:1] != ("#",) and v}
            for k, v in sch_lv.items():   # zweiter Versuch über Kurztext + Einheit (OZ im Auftrag geändert)
                if k[:1] == ("#",) and v and not umk.get(v) and sch_auf.get(k):
                    umk[v] = sch_auf[k]
            ang = angebote_fuer(lv_row, sch_lv, lambda iid: umk.get(iid))
            ohne = sum(x["_ohne_ziel"] for x in ang)
            if ohne:
                W.append(f"Auftrag {_s(a['OZ'])} {_s(a['Bez'])}: {ohne} Angebotspreise zu LV-Positionen, die im Auftrag fehlen – nicht übernommen.")
        bieter = _s(a.get("Bieter"))
        if bieter:
            firmen[bieter.casefold()] = bieter
        for x in ang:
            firmen.setdefault(x["bieter"].casefold(), x["bieter"])
        VP = {}
        for x in items:
            if x["typ"] == "pos" and x.get("art") != "T":
                r = auf_rows.get(int(x["id"][1:]))
                if r is not None and r.get("VEP") is not None:
                    VP[x["id"]] = round(_f(r["VEP"]), 4)
        rs = sorted(abr_by_auf.get(a["id"], []), key=lambda r: (r.get("Nr") or 0, r["id"]))
        tr = [r for r in rs if _s(r.get("RArt")) in ("T", "S", "N")]
        einbehalt = max([_f(r.get("SEBPrz")) for r in tr] or [0.0])
        skonto = max([_f(r.get("Skonto")) for r in tr if _f(r.get("Skonto")) <= 10] or [0.0])
        nachlass = -_f(a.get("AbZuP")) if _f(a.get("AbZuP")) < 0 else 0.0
        hat_pos = any(x["typ"] == "pos" and x.get("art") != "T" for x in items)
        hat_nt = any(x.get("nt") for x in items)
        # Prüfstand je Position nur, wenn ORCA ihn für mindestens eine Teil-/Schlussrechnung geführt hat – sonst Beträge
        mit_stand = hat_pos and any(prf.get(r["id"]) for r in tr if _s(r.get("RArt")) in ("T", "S"))
        # zugeschlagenes Angebot: Bieter des Auftrags im Preisspiegel
        ang_id = None
        if bieter and ang:   # meiste gemeinsame markante Namensteile (ohne Rechtsform, „neu“, „Bau“ …); bei Gleichstand das günstigere
            b0 = _teile(bieter)
            wert = [(len(b0 & _teile(x["bieter"])), x["bieter"].casefold() == bieter.casefold(), _teile(x["bieter"]) == b0, -x["_gp"], k) for k, x in enumerate(ang)]
            best = max(wert) if wert else None
            if best and best[0] > 0:
                ang_id = best[-1]
        datum = (ang[ang_id]["eingang"] if ang_id is not None else "") or (_iso(rs[0].get("RDatum")) if rs else "")
        V = {"bieter": bieter or (ang[ang_id]["bieter"] if ang_id is not None else "Firma"), "datum": datum, "nachlass": round(nachlass, 3), "nachlass_eur": 0,
             "skonto": skonto, "skonto_tage": 0, "einbehalt": round(einbehalt, 2), "preise": VP if hat_pos else {}}
        if ang_id is not None:
            V["angebot_idx"] = ang_id   # wird beim Eintragen zur echten angebot_id
        if not hat_pos:   # Auftrag ohne Positionen: nur Summe (Häkchen „ohne Angebot und LV“)
            V.update({"frei": True, "ohne_lv": True, "summe": round(_f(a.get("VP")), 2)})
        # Rechnungen
        R = []
        letzter_stand = {}
        for k, r in enumerate(rs, start=1):
            ra = _s(r.get("RArt"))
            art = RE_ART.get(ra, "abschlag")
            nt_frei = False
            if art == "nachtrag":   # Nachtragsrechnung: bei Nachtragspositionen im Auftrag einzeln (wie Regie), sonst eigene Kette mit Betrag
                art, nt_frei = ("regie", False) if hat_nt else ("nachtrag", True)
            d = {"geprueft_am": _iso(r.get("EDatum")) or _iso(r.get("RDatum")), "geprueft_von": "ORCA-Import", "bezahlt": _iso(r.get("ZDatum")),
                 "orca": {"netto": round(_f(r.get("Netto")), 2), "netto1": round(_f(r.get("Netto1")), 2), "seb": round(_f(r.get("SEB")), 2),
                          "brutto_zahlung": round(_f(r.get("Brutto3")) or _f(r.get("Brutto2")), 2), "bez": _s(r.get("Bez")), "rstat": r.get("RStat")}}
            if art != "sicherheit":
                d["einbehalt"] = round(_f(r.get("SEBPrz")), 2)
                if _f(r.get("Skonto")) and _f(r.get("Skonto")) <= 10:
                    d["skonto"] = round(_f(r.get("Skonto")), 2)
            ab = _f(r.get("AbNetto")) + _f(r.get("AbBrutto")) / (1 + MWST / 100)
            if ab < -0.005:
                d["abzuege"] = [{"text": "Abzug laut ORCA", "betrag": round(-ab, 2)}]
            if art == "sicherheit":
                d["betrag"] = round(abs(_f(r.get("SEB"))) / (1 + MWST / 100), 2) or round(_f(r.get("Brutto2")) / (1 + MWST / 100), 2)
            elif art == "regie":
                d["zeilen"] = [{"text": _s(r.get("Bez")) or "Rechnung", "menge": 1, "einheit": "psch", "ep": round(_f(r.get("Netto")), 2)}]
            elif nt_frei or not mit_stand:   # ohne Prüfstand je Position: geprüfter Betrag (ORCA kumuliert → unten je Rechnung)
                d["frei"] = round(_f(r.get("Netto")), 2)
            else:
                st = {f"a{pid}": round(m, 4) for pid, m in prf.get(r["id"], {}).items() if f"a{pid}" in pos_ids and m}
                if not st and letzter_stand:   # in ORCA ohne Prüfstand erfasst: Stand der vorigen Rechnung (Zahlbetrag dann 0)
                    st = dict(letzter_stand)
                    d["orca"]["stand_uebernommen"] = True
                d["stand"] = st
                letzter_stand = st
            R.append({"nr": k, "art": art, "datum": _iso(r.get("RDatum")), "eingang": _iso(r.get("EDatum")), "re_nr": _s(r.get("RNr"))[:60],
                      "gefordert": round(_f(r.get("RBetrag")), 2) if _f(r.get("RBetrag")) > 0 and art not in ("sicherheit",) else 0.0,
                      "status": "geprueft", "data": d, "notiz": _s(r.get("Bez"))})
        # Schlussrechnung ohne Aufmaß-Positionen (frei) zählt einzeln: bei Aufträgen ohne Positionen die Beträge je Rechnung
        if not mit_stand:
            kum = 0.0
            for x in R:
                if x["art"] in ("abschlag", "schluss") and "frei" in x["data"]:
                    n = x["data"]["frei"]
                    x["data"]["frei"] = round(n - kum, 2) if n >= kum else n   # ORCA rechnet kumuliert, ohne Positionen zählt die Plattform je Rechnung
                    x["data"]["orca"]["kumuliert"] = n
                    kum = max(kum, n)
        status = "abgerechnet" if any(x["art"] == "schluss" for x in R) else "vergeben"
        lvs.append({"key": f"auf{a['id']}", "nr": _s(a.get("OZ")), "name": _s(a.get("Bez")) or "Auftrag", "gewerk": _s(lv_row.get("Bez")) if lv_row else "",
                    "status": status, "items": items, "angebote": ang, "vergabe": V, "rechnungen": R,
                    "orca": {"auftrag": round(_f(a.get("VP")), 2), "nachtraege": round(_f(a.get("NP")), 2), "prognose": round(_f(a.get("Prog")), 2),
                             "lv": f"{_s(lv_row.get('OZ'))} {_s(lv_row.get('Bez'))}".strip() if lv_row else ""}})
    # LVs ohne Auftrag: ausgeschrieben, nicht beauftragt (mit Angeboten) bzw. Entwurf
    for lv_row in sorted([r for r in T["LV"] if r.get("Level") == 1 and r["id"] not in verknuepft], key=lambda r: (r.get("Nr") or 0, r["id"])):
        items, sch = items_aus(lvk, lv_row["id"], "l", False)
        ang = angebote_fuer(lv_row, sch, None)
        for x in ang:
            firmen.setdefault(x["bieter"].casefold(), x["bieter"])
        V = {}
        st = "entwurf"
        if ang:
            st = "nicht_vergeben"
            V = {"nicht_vergeben": {"grund": "", "notiz": "in ORCA ohne Auftrag", "datum": "", "von": "ORCA-Import"}}
        lvs.append({"key": f"lv{lv_row['id']}", "nr": _s(lv_row.get("OZ")), "name": _s(lv_row.get("Bez")) or "LV", "gewerk": _s(lv_row.get("Bez")),
                    "status": st, "items": items, "angebote": ang, "vergabe": V, "rechnungen": [], "orca": {"lv": "", "schaetzung": round(_f(lv_row.get("SP")), 2)}})
    lvs.sort(key=lambda x: (x["nr"] or "~", x["name"]))
    return {"projekt": projekt, "lvs": lvs, "firmen": sorted(firmen.values(), key=str.casefold), "warnungen": W}


def lesen(pfad, dateiname="", fortschritt=None):
    """Datei (.ava oder .zip) → Ergebnis von umsetzen()."""
    ava, weg = oeffnen(pfad)
    try:
        T = tabellen(ava, fortschritt)
    finally:
        weg()
    if fortschritt:
        fortschritt("Setze um …", 0.95)
    return umsetzen(T, dateiname or os.path.basename(pfad))
