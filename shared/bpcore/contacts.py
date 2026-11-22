"""Kontakte (Tabelle contacts) – gemeinsame Regeln für alle Apps der Bauplattform.

Ein Kontakt darf nur gelöscht werden, wenn er nirgends verwendet wird. Das gilt gleich im Bautagebuch, im Bauzeitenplan
(Adressbuch) und in der Adressen-App. Verwendet heißt:
- er kommt in Berichten des Bautagebuchs vor (Anwesende, Firmen, Mängel … – items.contact_id),
- er ist die Baustellenadresse eines Projekts (projects.extra.contact_id),
- er ist in einem Bauzeitenplan einem Gewerk als Firma zugeordnet (gantt_projects.data → trades[*].firm).
"""
import json


def _json(v):
    if isinstance(v, dict):
        return v
    try:
        return json.loads(v or "{}")
    except (TypeError, ValueError):
        return {}


def gantt_id(row):
    """ID, unter der der Bauzeitenplan die Firma führt (eigene ID in extra.gid, sonst „c<Kontakt-ID>“)."""
    return _json(row["extra"]).get("gid") or f"c{row['id']}"


def usage(c, cid):
    """Liste von Gründen, warum der Kontakt nicht gelöscht werden darf (leer = darf gelöscht werden)."""
    row = c.execute("SELECT id, name, extra FROM contacts WHERE id=?", (cid,)).fetchone()
    if not row:
        return []
    why = []
    r = c.execute("""SELECT COUNT(*) AS n, COUNT(DISTINCT r.project_id) AS p FROM items i JOIN reports r ON r.id=i.report_id
                     WHERE i.contact_id=?""", (cid,)).fetchone()
    if r and r["n"]:
        why.append(f"in {r['n']} {'Eintrag' if r['n'] == 1 else 'Einträgen'} des Bautagebuchs"
                   + (f" ({r['p']} Projekte)" if r["p"] > 1 else ""))
    for p in c.execute("SELECT name, extra FROM projects"):
        try:
            if int(_json(p["extra"]).get("contact_id") or 0) == cid:
                why.append(f"als Baustellenadresse des Projekts „{p['name']}“")
        except (TypeError, ValueError):
            pass
    fid = gantt_id(row)
    plans = []
    for g in c.execute("SELECT name, data FROM gantt_projects WHERE data LIKE ?", (f'%"{fid}"%',)):
        trades = _json(g["data"]).get("trades") or {}
        if isinstance(trades, dict) and any(isinstance(t, dict) and t.get("firm") == fid for t in trades.values()):
            plans.append(g["name"])
    if plans:
        why.append("im Bauzeitenplan " + ", ".join(f"„{n}“" for n in plans[:3]) + (" …" if len(plans) > 3 else ""))
    return why


def orte(c, cid, n=8):
    """Wo der Kontakt verwendet wird – zum direkten Öffnen: [{app, frag, label}] (neueste Berichte zuerst, höchstens n)."""
    row = c.execute("SELECT id, name, extra FROM contacts WHERE id=?", (cid,)).fetchone()
    if not row:
        return []
    out = []
    for p in c.execute("SELECT id, name, extra FROM projects"):
        try:
            if int(_json(p["extra"]).get("contact_id") or 0) == cid:
                out.append({"app": "bautagebuch", "frag": f"#projekt={p['id']}", "label": f"Baustellenadresse · {p['name']}"})
        except (TypeError, ValueError):
            pass
    fid = gantt_id(row)
    for g in c.execute("SELECT id, name, data FROM gantt_projects WHERE data LIKE ?", (f'%"{fid}"%',)):
        trades = _json(g["data"]).get("trades") or {}
        gw = [k for k, t in trades.items() if isinstance(t, dict) and t.get("firm") == fid] if isinstance(trades, dict) else []
        if gw:
            out.append({"app": "gantt", "frag": f"#plan={g['id']}&tab=firmen", "label": f"Bauzeitenplan „{g['name']}“ · {', '.join(gw[:3])}"})
    for r in c.execute("""SELECT r.id AS rid, r.number, r.date, p.id AS pid, p.name AS pname, COUNT(*) AS n FROM items i
                          JOIN reports r ON r.id=i.report_id JOIN projects p ON p.id=r.project_id
                          WHERE i.contact_id=? GROUP BY r.id, r.number, r.date, p.id, p.name ORDER BY r.date DESC, r.id DESC""", (cid,)):
        if len(out) >= n:
            break
        d = "-".join(reversed((r["date"] or "").split("-"))).replace("-", ".")
        out.append({"app": "bautagebuch", "frag": f"#projekt={r['pid']}&bericht={r['rid']}",
                    "label": ("Bericht" + (f" Nr. {r['number']}" if r["number"] else "") + f" vom {d} · {r['pname']}") + (f" ({r['n']} Einträge)" if r["n"] > 1 else "")})
    return out[:n]


def blocked_message(name, why):
    return f"„{name}“ wird noch verwendet ({'; '.join(why)}) und kann deshalb nicht gelöscht werden."


# ---------------------------------------------------------------- Duplikate finden und zusammenführen
import re as _re
import unicodedata as _ud
from difflib import SequenceMatcher as _SM

_RECHTSFORM = _re.compile(r"\b(fa|firma|gmbh|mbh|co|kg|ag|gbr|ohg|ug|e\s?k|ek|inh|inhaber|haftungsbeschr\w*|und|u|the)\b")


def _fold(t):
    t = _ud.normalize("NFKD", (t or "").lower().replace("ß", "ss"))
    return "".join(ch for ch in t if not _ud.combining(ch))


def name_norm(n):
    t = _re.sub(r"[^a-z0-9 ]+", " ", _fold(n))
    return " ".join(_RECHTSFORM.sub(" ", t).split())


def _ziffern(t):
    d = _re.sub(r"\D", "", _re.sub(r"\(\s*0\s*\)", "", t or ""))   # „+49 (0)201 …“ = „0201 …“
    if d.startswith("0049"):
        d = "0" + d[4:]
    elif d.startswith("49") and len(d) > 10:
        d = "0" + d[2:]
    return d if len(d) >= 6 else ""


def _domain(w):
    m = _re.search(r"(?:https?://)?(?:www\.)?([^/\s]+)", (w or "").lower())
    return m.group(1) if m and "." in m.group(1) else ""


def duplikate(c, ignoriert=()):
    """Gruppen ähnlicher Kontakte: gleiche E-Mail, Telefonnummer oder Internetseite, gleicher oder sehr ähnlicher Name
    (ohne GmbH, Fa., & Co …), dieselbe Anschrift. → [{"ids": [...], "grund": "..."}]"""
    R = [dict(r) for r in c.execute("SELECT id, name, trade, contact_person, phone, mobile, email, website, street, zip, city FROM contacts").fetchall()]
    ign = set(ignoriert)
    for r in R:
        r["_n"] = name_norm(r["name"])
        r["_t"] = set(w for w in r["_n"].split() if len(w) >= 3)
        r["_tel"] = {x for x in (_ziffern(r["phone"]), _ziffern(r["mobile"])) if x}
        r["_dom"] = _domain(r["website"]) or ((r["email"] or "").split("@")[-1].lower() if "@" in (r["email"] or "") and not _re.search(r"@(gmail|gmx|web|t-online|hotmail|outlook|yahoo|icloud|aol|freenet|online)\.", (r["email"] or "").lower()) else "")
        r["_adr"] = (_fold(r["street"]).replace("strasse", "str").replace(" ", "").rstrip("."), (r["zip"] or "").strip()) if (r["street"] or "").strip() else None
        r["_bau"] = "baustelle" in _fold(r["trade"])
    eltern = {r["id"]: r["id"] for r in R}

    def wurzel(x):
        while eltern[x] != x:
            eltern[x] = eltern[eltern[x]]
            x = eltern[x]
        return x
    gruende = {}
    for i, a in enumerate(R):
        for b in R[i + 1:]:
            if f"{min(a['id'], b['id'])}-{max(a['id'], b['id'])}" in ign or a["_bau"] != b["_bau"]:
                continue
            g, p = [], 0.0
            if a["email"] and a["email"].lower() == (b["email"] or "").lower():
                g.append("gleiche E-Mail"); p = max(p, 1.0)
            if a["_tel"] & b["_tel"]:
                g.append("gleiche Telefonnummer"); p = max(p, 0.9)
            if a["_dom"] and a["_dom"] == b["_dom"]:
                g.append("gleiche Internetseite/Mail-Domain"); p = max(p, 0.85)
            if a["_n"] and a["_n"] == b["_n"]:
                g.append("gleicher Name"); p = max(p, 0.95)
            elif a["_t"] and b["_t"]:
                j = len(a["_t"] & b["_t"]) / len(a["_t"] | b["_t"])
                teil = (a["_t"] <= b["_t"] or b["_t"] <= a["_t"]) and any(len(w) >= 5 for w in a["_t"] & b["_t"])
                r_ = _SM(None, a["_n"], b["_n"]).ratio()
                if j >= 0.6 or teil or r_ >= 0.88:
                    g.append("ähnlicher Name"); p = max(p, 0.75 if (teil or j >= 0.6) else 0.7)
            if a["_adr"] and a["_adr"] == b["_adr"] and g:
                g.append("gleiche Anschrift"); p = min(1.0, p + 0.15)
            if p >= 0.7:
                ra, rb = wurzel(a["id"]), wurzel(b["id"])
                eltern[ra] = rb
                gruende.setdefault((min(a["id"], b["id"]), max(a["id"], b["id"])), g)
    grp = {}
    for r in R:
        grp.setdefault(wurzel(r["id"]), []).append(r["id"])
    out = []
    for ids in grp.values():
        if len(ids) < 2:
            continue
        gg = sorted({x for (a, b), g in gruende.items() if a in ids and b in ids for x in g})
        out.append({"ids": sorted(ids), "grund": ", ".join(gg)})
    out.sort(key=lambda x: -len(x["ids"]))
    return out


def zusammenfuehren(c, ziel, quelle):
    """Alle Verweise von quelle auf ziel umhängen (Bautagebuch, Baustellenadresse, Bauzeitenpläne, AVA, Benachrichtigungen), dann quelle löschen."""
    zr = c.execute("SELECT id, name, extra FROM contacts WHERE id=?", (ziel,)).fetchone()
    qr = c.execute("SELECT id, name, extra FROM contacts WHERE id=?", (quelle,)).fetchone()
    if not zr or not qr or ziel == quelle:
        return
    c.execute("UPDATE items SET contact_id=? WHERE contact_id=?", (ziel, quelle))
    da = lambda t: bool(c.execute("SELECT 1 FROM information_schema.tables WHERE table_name=?", (t,)).fetchone())   # noqa: E731 – Tabelle gibt es nicht überall
    for t in ("benachrichtigungen", "ava_angebot"):
        if da(t):
            c.execute(f"UPDATE {t} SET contact_id=? WHERE contact_id=?", (ziel, quelle))
    for p in c.execute("SELECT id, extra FROM projects").fetchall():
        ex = _json(p["extra"])
        try:
            if int(ex.get("contact_id") or 0) == quelle:
                ex["contact_id"] = ziel
                c.execute("UPDATE projects SET extra=? WHERE id=?", (json.dumps(ex, ensure_ascii=False), p["id"]))
        except (TypeError, ValueError):
            pass
    if da("ava_lv"):   # AVA: Vergabe merkt die Firma
        for r in c.execute("SELECT id, vergabe FROM ava_lv WHERE vergabe LIKE ?", (f'%"contact_id": {quelle}%',)).fetchall():
            V = _json(r["vergabe"])
            if V.get("contact_id") == quelle:
                V["contact_id"] = ziel
                c.execute("UPDATE ava_lv SET vergabe=? WHERE id=?", (json.dumps(V, ensure_ascii=False), r["id"]))
    fq, fz = gantt_id(qr), gantt_id(zr)
    for g in c.execute("SELECT id, data FROM gantt_projects WHERE data LIKE ?", (f'%"{fq}"%',)).fetchall():
        d = _json(g["data"])
        tr = d.get("trades") or {}
        if isinstance(tr, dict):
            for t in tr.values():
                if isinstance(t, dict) and t.get("firm") == fq:
                    t["firm"] = fz
            c.execute("UPDATE gantt_projects SET data=? WHERE id=?", (json.dumps(d, ensure_ascii=False), g["id"]))
    c.execute("DELETE FROM contacts WHERE id=?", (quelle,))


# ---- Felder eines Kontakts (wie in der Adressen-App) – für die Kontaktmaske in allen Apps (BPHead.kontaktMaske)
FELDER = {"name": 200, "trade": 300, "contact_person": 200, "role": 200, "phone": 100, "mobile": 100, "email": 200,
          "website": 300, "street": 200, "zip": 20, "city": 200, "notes": 5000, "art": 60, "stichworte": 600, "tags": 300}
LISTEN = ("trade", "stichworte", "tags")   # mit Komma getrennt – in der Maske als Bausteine mit Vorschlägen


def liste(v):
    """„Dachdecker, Klempner“ → ["Dachdecker", "Klempner"] – leere und doppelte (ohne Groß/klein) fallen weg."""
    out, da = [], set()
    for x in str(v or "").replace(";", ",").split(","):
        x = " ".join(x.split())
        if x and x.lower() not in da:
            da.add(x.lower())
            out.append(x)
    return out


def begriffe(c):
    """Alle Gewerke, Stichwörter und Tags der Adressen mit Anzahl – für die Vorschläge in der Kontaktmaske, häufigste zuerst."""
    out = {k: {} for k in (*LISTEN, "amt")}
    for r in c.execute("SELECT trade, stichworte, tags, extra FROM contacts").fetchall():
        ex = _json(r["extra"])
        amt = [(ex.get("firma") or {}).get("amt") or ""] + [w.get("amt") or "" for w in ex.get("weitere") or [] if isinstance(w, dict)]   # Ämter der Behörden (BH-1)
        for k in (*LISTEN, "amt"):
            for x in (amt if k == "amt" else liste(r[k])):
                x = " ".join(str(x).split())
                if not x:
                    continue
                d = out[k]
                schon = next((y for y in d if y.lower() == x.lower()), x)
                d[schon] = d.get(schon, 0) + 1
    from .stammdaten import KONTAKT_GEWERKE, KONTAKT_TAGS
    S = {"trade": KONTAKT_GEWERKE, "tags": KONTAKT_TAGS}   # übliche Werte (Anzahl 0) hinter dem, was das Büro schon hat
    erg = {k: sorted(v.items(), key=lambda t: (-t[1], t[0].lower())) for k, v in out.items()}
    for k, L in S.items():
        da = {x.lower() for x, _ in erg.get(k, [])}
        erg[k] = erg.get(k, []) + [(x, 0) for x in L if x.lower() not in da]
    return erg


def bereinigen(d, partial=False):
    import re
    out = {}
    for k, mx in FELDER.items():
        if k in d or not partial:
            v = str(d.get(k) or "").strip()
            out[k] = ", ".join(liste(v))[:mx] if k in LISTEN else " ".join(v.split())[:mx] if k != "notes" else v[:mx]
    if out.get("email") and not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", out["email"]):
        raise ValueError("Die E-Mail-Adresse ist ungültig.")
    if out.get("website") and not re.match(r"https?://", out["website"], re.I):
        out["website"] = "https://" + out["website"]
    return out


# ---- Projektnummern (Mock „Behörden in den Adressen“ PZ-1, 22.11.2026): am Kontakt steht das Kürzel (A528), kein Projekt im Bauportal nötig;
# gibt es ein Projekt, dessen Name mit dem Kürzel beginnt, gehört der Kontakt dazu („Beteiligte“) – sonst kommt der Name aus den Projektordnern
_PNR = _re.compile(r"^[A-Za-z]{1,3}\d{2,5}(?:\.\d+)?$")


def projektnr_bereinigen(L):
    out = []
    for x in (L if isinstance(L, list) else [])[:40]:
        x = " ".join(str(x or "").split()).upper()
        if _PNR.match(x) and x not in out:
            out.append(x)
    return out


_TITEL = _re.compile(r"^((?:Prof\.|Dr\.(?:-Ing\.)?|Dipl\.-[\wäöü]+\.?|Dr\. med\.)\s*)+", _re.I)
_ZUSATZ = _re.compile(r"(?:,?\s+(?:M\.\s?A\.|B\.\s?A\.|M\.\s?Sc\.|B\.\s?Sc\.|M\.\s?Eng\.|B\.\s?Eng\.|LL\.\s?M\.|MBA|M\.\s?Arch\.|B\.\s?Arch\.))+$", _re.I)


def person_zerlegen(t):
    """„Hr. Dr. Max Beispiel M.A.“ → (Herr, Dr., Max Beispiel, M.A.) – eine Person in einer Zeile (BH-2, 22.11.2026)."""
    t = " ".join(str(t or "").split())
    m = _re.match(r"(hr\.?|herrn?|fr\.?|frau)\s+", t, _re.I)
    anrede = ("Herr" if m.group(1).lower().startswith("h") else "Frau") if m else ""
    t = t[m.end():] if m else t
    mt = _TITEL.match(t)
    titel = mt.group(0).strip() if mt else ""
    t = t[mt.end():] if mt else t
    mz = _ZUSATZ.search(t)
    zusatz = mz.group(0).strip(" ,") if mz else ""
    return anrede, titel, (t[:mz.start()] if mz else t).strip(" ,"), zusatz


def projekt_kuerzel(name):
    m = _re.match(r"\s*([A-Za-z]{1,3}\d{2,5}(?:\.\d+)?)\b", name or "")
    return m.group(1).upper() if m else ""


def projektnr_umziehen(c):
    """Einmal (Dienste beim Start): Projektnummern, die das Einlesen bis 22.11.2026 als Stichwort abgelegt hat, an den Kontakt (extra.projektnr)."""
    n = 0
    for r in c.execute("SELECT id, stichworte, extra FROM contacts WHERE stichworte <> ''").fetchall():
        L = liste(r["stichworte"])
        nr = [x for x in L if _PNR.match(x) and _re.search(r"\d{3}", x)]
        if not nr:
            continue
        ex = _json(r["extra"])
        ex["projektnr"] = projektnr_bereinigen((ex.get("projektnr") or []) + nr)
        c.execute("UPDATE contacts SET stichworte=?, extra=? WHERE id=?", (", ".join(x for x in L if x not in nr), json.dumps(ex, ensure_ascii=False), r["id"]))
        n += 1
    return n


def aus(r):
    d = {"id": r["id"], **{k: (r[k] if k in r.keys() else "") or "" for k in FELDER}}
    d["weitere"] = (_json(r["extra"]).get("weitere") or []) if "extra" in r.keys() else []
    d["projektnr"] = (_json(r["extra"]).get("projektnr") or []) if "extra" in r.keys() else []
    d["firma"] = firma(r)
    return d


# ---- Firma (GO 18.11.2026, AB-C1): Rechtsform, Sitz / Registergericht, Handelsregister, Mitarbeiter:innen – in contacts.extra.firma;
# gelesen von der Angebotsbesprechung (Bieter:in), dorthin zurück beim Abschließen des Protokolls
FIRMA = {"rechtsform": 80, "sitz": 200, "hrb": 80, "mitarbeiter": 40, "rechnung": 600, "ustid": 80, "oeffentlich": 3,   # rechnung/ustid/oeffentlich: Bauherr:in (PD-A1, 18.11.2026)
         "ap_anrede": 10, "ap_titel": 40,   # Anrede/Titel der Hauptansprechperson (AP-B1, 18.11.2026)
         "ap_zusatz": 40, "amt": 200, "ist_firma": 3}   # Zusatz hinter dem Namen (M.A.), Amt/Abteilung einer Behörde, Bauherr:in ist eine Firma (Mock „Behörden in den Adressen“ BH-1 … BH-4, 22.11.2026)
ANREDEN = ("Herr", "Frau")


def firma(r):
    """Firmenangaben eines Kontakts (Zeile mit extra) → {rechtsform, sitz, hrb, mitarbeiter, rechnung, ustid, oeffentlich} (leer, wenn nichts da)."""
    f = (_json(r["extra"]).get("firma") or {}) if r is not None and "extra" in r.keys() else {}
    return {k: str(f.get(k) or "") for k in FIRMA}


def firma_bereinigen(f):
    f = f or {}
    out = {k: " ".join(str(f.get(k) or "").split())[:mx] for k, mx in FIRMA.items()}
    out["rechnung"] = "\n".join(" ".join(z.split()) for z in str(f.get("rechnung") or "").splitlines() if z.strip())[:FIRMA["rechnung"]]   # Anschrift: Zeilen bleiben
    out["oeffentlich"] = "ja" if f.get("oeffentlich") in (True, "ja", "1", 1, "on") else ""
    out["ist_firma"] = "ja" if f.get("ist_firma") in (True, "ja", "1", 1, "on") else ""
    out["ap_anrede"] = out["ap_anrede"] if out["ap_anrede"] in ANREDEN else ""
    return out


def firma_text(f):
    """„GmbH, Sitz Essen (AG Essen), HRB 12345“ – wie im Protokoll der Angebotsbesprechung."""
    f = f or {}
    return ", ".join(x for x in (f.get("rechtsform") or "", f"Sitz {f['sitz']}" if f.get("sitz") else "", f.get("hrb") or "") if x)


def firma_lesen(t):
    """Umkehrung von firma_text – aus dem Protokoll: Teil mit HRB/HRA/GnR/PR/VR = Register, „Sitz …“ = Sitz, der erste andere = Rechtsform."""
    import re
    out = {"rechtsform": "", "sitz": "", "hrb": ""}
    rest = []
    for x in [y.strip() for y in re.split(r"[,;\n]", str(t or "")) if y.strip()]:
        if re.match(r"(HR\s?[AB]|GnR|PR|VR)\b", x, re.I):
            out["hrb"] = x
        elif re.match(r"sitz\b", x, re.I):
            out["sitz"] = re.sub(r"^sitz\s*[:]?\s*", "", x, flags=re.I)
        elif not out["rechtsform"]:
            out["rechtsform"] = x
        else:
            rest.append(x)
    if rest:
        out["sitz"] = ", ".join(([out["sitz"]] if out["sitz"] else []) + rest)
    return out


WEITERE_TYP = ("tel", "mail", "adr", "person")


def weitere_bereinigen(L):
    """Weitere Telefonnummern, E-Mail-Adressen, Anschriften und Ansprechpartner (contacts.extra.weitere) – wie in „Adressen“."""
    import re
    out = []
    for x in (L if isinstance(L, list) else [])[:40]:
        if not isinstance(x, dict) or x.get("typ") not in WEITERE_TYP:
            continue
        y = {"typ": x["typ"]}
        for k, mx in (("bez", 80), ("wert", 200), ("street", 200), ("zip", 20), ("city", 200), ("tel", 100), ("mail", 200), ("anrede", 10), ("titel", 40), ("zusatz", 40), ("amt", 200)):
            v = " ".join(str(x.get(k) or "").split())[:mx]
            if v and (k != "anrede" or v in ANREDEN) and (k not in ("anrede", "titel", "zusatz", "amt") or y["typ"] == "person"):
                y[k] = v
        for k in ("mail",) + (("wert",) if y["typ"] == "mail" else ()):
            if y.get(k) and not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", y[k]):
                raise ValueError(f"Die E-Mail-Adresse „{y[k]}“ ist ungültig.")
        if any(y.get(k) for k in ("wert", "street", "city", "tel", "mail")):
            out.append(y)
    return out


def suchen(c, q, rolle="", n=12):
    """Kontakte zur Eingabe und für die Suche (Strg+K): JEDES Wort muss irgendwo vorkommen – Name, Ansprechpartner, Gewerk, Ort, Stichwörter,
    Tags, Funktion, Telefon, Mail, Anschrift, Notizen und die weiteren Angaben (Personen, Ämter, Projektnummern); Namensanfang und passende Rolle
    zuerst. Bis 23.11.2026 suchte es nur Name, Ansprechpartner, Gewerk und Ort mit dem ganzen Text – Stichwörter fand die Suche nicht."""
    q = " ".join(str(q or "").split())[:100].lower()
    if not q:
        return []
    text = "lower(" + " || ' ' || ".join(f"coalesce({k}, '')" for k in ("name", "contact_person", "trade", "city", "stichworte", "tags", "role", "phone", "mobile",
                                                                            "email", "street", "zip", "notes", "extra")) + ")"
    W = q.split()[:8]
    rows = c.execute(f"SELECT * FROM contacts WHERE {' AND '.join([text + ' LIKE ?'] * len(W))} ORDER BY name LIMIT 200", [f"%{w}%" for w in W]).fetchall()
    rl = (rolle or "").lower()

    def rang(r):
        nm = str(r["name"] or "").lower()
        return (0 if nm.startswith(q) else 1 if q in nm else 2, 0 if rl and rl in str(r["trade"] or "").lower() else 1, nm)
    return [aus(r) for r in sorted(rows, key=rang)[:n]]


# ---------- Mail an einen Kontakt (aus ava_versand.py in den Kern geholt – Honorar und AVA nutzen dieselben) ----------
def anrede(name, art="", titel=""):
    """Persönliche Anrede: mit Anrede an der Person (AP-B1) „Sehr geehrter Herr Dr. Schulte,“; sonst aus dem Namen („Herr Kemper“);
    Name ohne Herr/Frau → „Guten Tag Peter Schulte,“; ohne Namen allgemein."""
    n = " ".join(str(name or "").split())
    m = _re.match(r"^(Herrn?|Frau)\s+((?:Dr\.|Prof\.|Dipl\.-Ing\.)\s+)*(.+)$", n)
    if art in ANREDEN and n:
        nach = (m.group(3) if m else n).split()[-1]
        t = " ".join(str(titel or "").split()) or "".join(_re.findall(r"(Dr\.|Prof\.)\s+", n)[:1])
        return f"Sehr geehrte{'r' if art == 'Herr' else ''} {art} {t + ' ' if t else ''}{nach},"
    if m:
        nach = m.group(3).split()[-1]
        t = "".join(_re.findall(r"(Dr\.|Prof\.)\s+", n)[:1])
        return f"Sehr geehrte{'r' if m.group(1).startswith('Herr') else ''} {'Herr' if m.group(1).startswith('Herr') else 'Frau'} {t + ' ' if t else ''}{nach},"
    return f"Guten Tag {n}," if n else "Sehr geehrte Damen und Herren,"


def mail_adressen(k):
    """Ansprechpersonen einer Firma mit E-Mail (AP-A1, 18.11.2026): Firma (Hauptansprechperson), weitere Ansprechpartner:innen – auch ohne
    eigene E-Mail (dann die Adresse der Firma, eigene=False) –, weitere Adressen. Je Eintrag {email, name, funktion, anrede, titel, eigene}."""
    out = []
    ex = _json(k["extra"]) if "extra" in k.keys() else {}
    f = ex.get("firma") or {}
    fm = k["email"] or ""
    if fm:
        person = (k["art"] if "art" in k.keys() else "") == "bauherr" and not f.get("ist_firma") and not k["contact_person"]   # Bauherr:in als Person (BH-4): der Name ist die Person
        out.append({"email": fm, "name": (k["name"] if person else k["contact_person"]) or "", "funktion": "Firma", "anrede": f.get("ap_anrede") or "", "titel": f.get("ap_titel") or "", "eigene": True})
    for w in ex.get("weitere") or []:
        if not isinstance(w, dict):
            continue
        if w.get("typ") == "person" and (w.get("mail") or (fm and w.get("wert"))):
            out.append({"email": w.get("mail") or fm, "name": w.get("wert") or "", "funktion": w.get("bez") or "Ansprechpartner:in",
                        "anrede": w.get("anrede") or "", "titel": w.get("titel") or "", "eigene": bool(w.get("mail"))})
        elif w.get("typ") == "mail" and w.get("wert"):
            out.append({"email": w["wert"], "name": "", "funktion": w.get("bez") or "weitere Adresse", "anrede": "", "titel": "", "eigene": True})
    seen, uniq = set(), []
    for x in out:
        key = (x["email"].lower(), x["name"].lower())
        if key not in seen:
            seen.add(key); uniq.append(x)
    return uniq


def anrede_von(x):
    """Anrede für einen Eintrag aus mail_adressen."""
    return anrede((x or {}).get("name") or "", (x or {}).get("anrede") or "", (x or {}).get("titel") or "")


# ---------- Export der Adressdatenbank: Excel und Druck (PDF) – ein Baustein für Bautagebuch und Adressen (17.11.2026) ----------
EXPORT_COLS = [("Firma / Name", "name", 34), ("Gewerk", "trade", 18), ("Ansprechpartner:in", "contact_person", 22), ("Funktion", "role", 16),
               ("Telefon", "phone", 17), ("Mobil", "mobile", 17), ("E-Mail", "email", 28), ("Internet", "website", 26),
               ("Straße", "street", 26), ("PLZ", "zip", 8), ("Ort", "city", 18), ("Notizen", "notes", 40)]


def export_xlsx(rows):
    """Adressverzeichnis als Excel-Datei (Bytes): eine Zeile je Kontakt, Spalten EXPORT_COLS + „In Berichten verwendet“ (rows[i]['used'])."""
    import io
    from openpyxl import Workbook
    from openpyxl.styles import Alignment, Font, PatternFill
    from openpyxl.utils import get_column_letter
    wb = Workbook(); ws = wb.active; ws.title = "Adressen"
    ws.append([h for h, _, _ in EXPORT_COLS] + ["In Berichten verwendet"])
    for r in rows:
        ws.append([r.get(k) or "" for _, k, _ in EXPORT_COLS] + [r.get("used") or 0])
    head = PatternFill("solid", fgColor="E0388F")
    for cell in ws[1]:
        cell.font = Font(bold=True, color="FFFFFF"); cell.fill = head; cell.alignment = Alignment(vertical="center", wrap_text=True)
    for n, (_, _, w) in enumerate(EXPORT_COLS, 1):
        ws.column_dimensions[get_column_letter(n)].width = w
    ws.column_dimensions[get_column_letter(len(EXPORT_COLS) + 1)].width = 14
    for row in ws.iter_rows(min_row=2):
        for cell in row:
            cell.alignment = Alignment(vertical="top", wrap_text=True)
            if cell.column == 10 and cell.value:
                cell.number_format = "@"          # PLZ mit führender Null als Text
    ws.freeze_panes = "B2"
    ws.auto_filter.ref = ws.dimensions
    ws.page_setup.orientation = "landscape"; ws.page_setup.fitToWidth = 1; ws.page_setup.fitToHeight = 0
    ws.sheet_properties.pageSetUpPr.fitToPage = True
    ws.print_title_rows = "1:1"
    buf = io.BytesIO(); wb.save(buf)
    return buf.getvalue()


def export_pdf(c, rows, label, wer="", vid=None, extra=None):
    """Adressverzeichnis zum Drucken (PDF-Bytes) im Druck-Layout „Adressverzeichnis“ (Verwaltung → Druck-Layouts, ab Werk A4 quer) –
    Kopf, Fuß, Logo, Briefbogen und Format wie bei allen Ausdrucken (bpcore/layout.py). vid/extra: gewähltes Layout und Inhaltseinstellungen
    der Druckseite (bpDruck). Ein Baustein für Adressen und Bautagebuch."""
    import io
    from datetime import datetime
    from reportlab.lib import colors
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.platypus import BaseDocTemplate, LongTable, Paragraph, Spacer, TableStyle
    from xml.sax.saxutils import escape
    from . import briefbogen, layout, schrift
    LAY = layout.aktiv(c, "adressen", vid)
    O = layout.optionen(c, "adressen", vid, extra)
    unter, frei, _roh = layout.bogen(c, LAY)
    F = schrift.fuer(c)
    W = {**layout.buero_werte(c), "bearbeiter": wer, "dokument": "Adressverzeichnis",
         "untertitel": f"Stand {datetime.now():%d.%m.%Y} · {len(rows)} Kontakt{'e' if len(rows) != 1 else ''} · {label}"}
    tpl, B = layout.platypus_seiten(LAY, W, F, logo_fn=layout.logo_zeichner(c), bogen=frei)
    st = ParagraphStyle("c", fontName=F["n"], fontSize=8, leading=10)
    sh = ParagraphStyle("h", parent=st, fontName=F["b"], textColor=colors.white)
    esc = lambda v: escape(str(v or ""))   # noqa: E731
    P = lambda t, s=st: Paragraph(t or "&nbsp;", s)   # noqa: E731
    kopf = ["Firma / Name", "Gewerk", "Telefon", "E-Mail / Internet", "Adresse"] + (["Notizen"] if O.get("notizen") else [])
    data = [[P(h, sh) for h in kopf]]
    for r in rows:
        person = " · ".join(x for x in (r.get("contact_person"), r.get("role")) if x) if O.get("person") else ""
        tel = "<br/>".join(x for x in (esc(r.get("phone")), ("Mobil " + esc(r.get("mobile"))) if r.get("mobile") else "") if x)
        net = "<br/>".join(x for x in (esc(r.get("email")), esc(r.get("website"))) if x)
        adr = "<br/>".join(x for x in (esc(r.get("street")), esc(" ".join(y for y in (r.get("zip"), r.get("city")) if y))) if x)
        data.append([P(f"<b>{esc(r.get('name'))}</b>" + (f"<br/>{esc(person)}" if person else "")), P(esc(r.get("trade"))), P(tel), P(net), P(adr)]
                    + ([P(esc(r.get("notes")).replace("\n", "<br/>"))] if O.get("notizen") else []))
    anteil = [.27, .14, .17, .24, .18] if not O.get("notizen") else [.22, .11, .14, .2, .15, .18]
    t = LongTable(data, colWidths=[B * a for a in anteil], repeatRows=1)
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), colors.HexColor(layout.TABELLE_KOPF)), ("VALIGN", (0, 0), (-1, -1), "TOP"),
                           ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor(layout.TABELLE_STREIFEN)]),
                           ("LINEBELOW", (0, 0), (-1, -1), .25, colors.HexColor(layout.TABELLE_LINIE)), ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3)]))
    buf = io.BytesIO()
    doc = BaseDocTemplate(buf, pagesize=layout.seite_pt(LAY), title="Adressverzeichnis", author=W["buero"])
    doc.addPageTemplates(tpl)
    doc.build([t] if rows else [Spacer(1, 1)])
    return briefbogen.unterlegen(buf.getvalue(), unter, seiten=1) if unter else buf.getvalue()
