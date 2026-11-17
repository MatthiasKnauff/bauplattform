"""Anweisungen an das Gebäudemodell (GO 16.11.2026, Entwurf „Gebäudemodell wie alle Apps + Elemente und Anweisungen“, Fragen 9–11).

Beispiele: „Füge zu allen nicht bodentiefen Fenstern Fensterbänke aus Kunstmarmor hinzu“, „Alle Wohnräume im EG außer Nassräume
Mosaikparkett, im OG Teppich, im Keller Fliesen“.

1. verstehen(): Die KI im Büro (Ollama) übersetzt den Satz in Schritte aus Auswahl + Material. Extern nur mit eingeschalteter
   Zusatzrecherche – dann gehen nur der Satz, die Geschossnamen und die Raumarten hinaus (keine Projektdaten). Ohne KI versucht es eine
   einfache Regel (regel()) und sagt das dazu.
2. vorschau(): je Schritt die betroffenen Räume bzw. Fenster/Türen und der Treffer im Katalog der Bauplattform (Bauteil-Baukasten:
   Vorlage + Optionen der Schichten). Nur der Katalog – nie erfinden: passt nicht jedes Wort, kommt eine Rückfrage mit ähnlichen Einträgen
   oder „als eigene Leistung anlegen“.
3. anwenden(): Die Anweisung kommt in die Liste des Modells (bauteilliste["anweisungen"]); ableiten() teilt die Zeilen der Checkliste
   danach auf (abgeleitete Zeilen, z. B. „Böden – Estrich + Parkett, Mosaikparkett (12 Räume)“). Ein neuer Planstand wendet die
   Anweisungen wieder an. Rückgängig = zuruecknehmen() (die Zeilen entstehen ohne diese Anweisung neu).

Routen: POST /api/bp/modell/<pid>/anweisung/verstehen {text} · …/vorschau {schritte} · …/anwenden {text, schritte}
        · DELETE …/anweisung/<aid>
"""
import hashlib
import json
import re
from datetime import datetime

from flask import jsonify, request

from .wert import kurz as _s

ZIELE = ("raum", "fenster", "tuer", "oeffnung")
TEILE = {"boden": ("Böden", ("352", "353")), "wand": ("Wände", ("345", "336")), "decke": ("Decken", ("354", "364"))}
STATUS = ("bleibt", "instandsetzen", "erneuern", "neu", "abbruch")
STOP = set("""aus mit in im ins den die der das dem des und oder alle allen aller alles zu hinzu fuege fuegen fueg setze setzen mache machen
bekommen bekommt erhalten erhaelt sollen soll ein eine einem einer einen neue neuen neuer von fuer auf als bei je pro cm mm m x sowie bitte
ausser ohne nicht nur auch wird werden werde jeweils raeume raeumen raum zimmer geschoss fenster fenstern tueren tuer""".split())
GESCHOSS = {"kg": ("kg", "ug", "keller", "kellergeschoss", "untergeschoss", "souterrain"), "eg": ("eg", "erdgeschoss"),
            "og": ("og", "obergeschoss", "1.og", "1. og", "og1"), "dg": ("dg", "dachgeschoss", "spitzboden")}


def _jetzt():
    return datetime.now().isoformat(timespec="seconds")


def _fold(t):
    t = str(t or "").lower()
    for a, b in (("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("ß", "ss")):
        t = t.replace(a, b)
    return t


def _stamm(w):
    if len(w) > 5 and w[-2:] in ("en", "er", "es", "em"):
        return w[:-2]
    if len(w) > 4 and w[-1] in "ens":
        return w[:-1]
    return w


def woerter(t):
    return [_stamm(w) for w in re.findall(r"[a-z0-9]+", _fold(t)) if w not in STOP and len(w) > 1 and not w.isdigit()]


def raumart(name):
    from .verfeinern import raumart as RA
    return RA(name)


def _gs(name, wunsch):
    """Geschossname passt zum Wunsch (EG, OG, Keller …)?"""
    n, w = _fold(name).replace(" ", ""), _fold(wunsch).replace(" ", "")
    if not w:
        return True
    if w in n or n == w:
        return True
    for k, A in GESCHOSS.items():
        if w in A or w == k:
            return any(a.replace(" ", "") == n or n.startswith(a.replace(" ", "")) for a in A)
    return False


# ------------------------------------------------------------------ Daten
def _schritt(x):
    if not isinstance(x, dict):
        return None
    ziel = x.get("ziel") if x.get("ziel") in ZIELE else ""
    if not ziel:
        return None
    f = x.get("filter") if isinstance(x.get("filter"), dict) else {}
    num = lambda v: None if v in (None, "") else _num(v)   # noqa: E731
    out = {"ziel": ziel, "teil": x.get("teil") if x.get("teil") in TEILE else ("boden" if ziel == "raum" else ""),
           "filter": {"geschoss": [_s(g, 30) for g in (f.get("geschoss") or [])[:6] if _s(g, 30)],
                      "raumart": [_s(g, 30) for g in (f.get("raumart") or [])[:8] if _s(g, 30)],
                      "ohne_raumart": [_s(g, 30) for g in (f.get("ohne_raumart") or [])[:8] if _s(g, 30)],
                      "aussen": f.get("aussen") if isinstance(f.get("aussen"), bool) else None,
                      "bruestung_min": num(f.get("bruestung_min")), "bruestung_max": num(f.get("bruestung_max"))},
           "material": _s(x.get("material"), 120), "status": x.get("status") if x.get("status") in STATUS else ""}
    t = x.get("treffer") if isinstance(x.get("treffer"), dict) else None
    if t and (t.get("eigen") or re.fullmatch(r"\d{3}\.\d{2}", str(t.get("vorlage") or ""))):
        out["treffer"] = {"vorlage": _s(t.get("vorlage"), 12), "setze": {str(int(k)): int(v) for k, v in (t.get("setze") or {}).items() if str(k).isdigit() and isinstance(v, int)},
                          "name": _s(t.get("name"), 200), "eigen": bool(t.get("eigen"))}
    return out


def _num(v):
    try:
        x = float(str(v).replace(",", "."))
    except (TypeError, ValueError):
        return None
    return round(x / 1000 if x > 20 else x, 3)


def sauber(v):
    out = []
    for a in (v if isinstance(v, list) else [])[:100]:
        if not isinstance(a, dict) or not _s(a.get("id"), 20):
            continue
        S = [s for s in (_schritt(x) for x in (a.get("schritte") or [])[:8]) if s and s.get("treffer")]
        if S:
            out.append({"id": _s(a["id"], 20), "text": _s(a.get("text"), 500), "schritte": S, "wann": _s(a.get("wann"), 20), "wer": _s(a.get("wer"), 80)})
    return out


# ------------------------------------------------------------------ Auswahl
def mitglieder(L, s):
    """Basis-Zeilen und ihre Mitglieder, die der Schritt trifft → [(zeile, [mitglied …])]."""
    R = {r["nr"]: r for r in L.get("raeume") or []}
    E = {str(e["id"]): e for e in L.get("elemente") or []}
    f = s["filter"]
    ra = [_fold(x) for x in f.get("raumart") or []]
    ohne = [_fold(x) for x in f.get("ohne_raumart") or []]

    def art_ok(namen):
        arten = [_fold(raumart(n)) for n in namen]
        if ra and not any(any(w in a or a in w for w in ra) for a in arten):
            return False
        return not (ohne and any(any(w in a or a in w for w in ohne) for a in arten))
    out = []
    for z in L.get("zeilen") or []:
        if z.get("abgeleitet") or z.get("entfaellt"):
            continue
        if s["ziel"] == "raum":
            if z["bereich"] != "raum" or not z["id"].startswith(f"raum:{s['teil']}:"):
                continue
            M = [n for n in z.get("mitglieder") or [] if n in R and art_ok([R[n]["name"]])
                 and (not f["geschoss"] or any(_gs(R[n]["geschoss"], g) for g in f["geschoss"]))]
        else:
            if z["bereich"] != "oeffnung":
                continue
            M = []
            for k in z.get("mitglieder") or []:
                e = E.get(k)
                if not e:
                    continue
                if s["ziel"] == "fenster" and e["art"] != "Fenster" or s["ziel"] == "tuer" and e["art"] != "Tür":
                    continue
                if f.get("aussen") is not None and e["aussen"] != f["aussen"]:
                    continue
                br = e.get("bruestung")
                if f.get("bruestung_min") is not None and (br is None or br < f["bruestung_min"]):
                    continue
                if f.get("bruestung_max") is not None and (br is None or br > f["bruestung_max"]):
                    continue
                if f["geschoss"] and not any(_gs(e["geschoss"], g) for g in f["geschoss"]):
                    continue
                if (ra or ohne) and not art_ok([R[n]["name"] for n in e.get("raeume") or [] if n in R] or ["Raum"]):
                    continue
                M.append(k)
        if M:
            out.append((z, M))
    return out


# ------------------------------------------------------------------ Katalog (nur der Baukasten der Bauplattform)
def katalog(c, material, kgs, bauart=""):
    """Treffer für ein Material in den Vorlagen der Kostengruppen: je Vorlage die Optionen der Schichten, die die meisten Wörter treffen.
    → [{vorlage, setze {Schicht: Option}, name, wert (Anteil der getroffenen Wörter)}], beste zuerst."""
    Q = list(dict.fromkeys(woerter(material)))
    if not Q:
        return []

    def trifft(q, text, teil=True):   # Wort ganz (auch in Zusammensetzungen: „fensterbank“ in „innenfensterbank“); teil: auch umgekehrt
        T = [_stamm(w) for w in re.findall(r"[a-z0-9]+", _fold(text))]
        return any(q == t or q in t or (teil and len(t) >= 5 and t in q) for t in T)
    out = []
    for r in c.execute("SELECT id, kg, name, daten, tags FROM pdb_vorlage WHERE " + " OR ".join("kg LIKE ?" for _ in kgs) + " ORDER BY sort, id",
                       tuple(k[:3] + "%" for k in kgs)).fetchall():
        D = json.loads(r["daten"] or "{}")
        hat = {q for q in Q if trifft(q, r["name"], False)}
        setze, gleich = {}, {}   # gleich: Schicht → weitere Optionen, die genauso gut passen (werden eigene Kandidaten)
        S = D.get("schichten") or []
        for si, sch in enumerate(S):
            best, bi, alle = set(), None, []
            for oi, o in enumerate(sch.get("optionen") or []):
                m = {q for q in Q if q not in hat and trifft(q, f"{o.get('k', '')} {o.get('t', '')}")}
                if m and len(m) > len(best):
                    best, bi, alle = m, oi, [oi]
                elif m and len(m) == len(best):
                    alle.append(oi)
            if bi is not None:
                hat |= best
                setze[str(si)] = bi
                gleich[str(si)] = alle
        if not hat:
            continue
        tags = str(r["tags"] or "")
        passt = 1 if (bauart in ("bestand", "gemischt") and "altbau" in tags) or (bauart == "neubau" and "neubau" in tags) else 0
        varianten = [setze] + [dict(setze, **{si: oi}) for si, A_ in gleich.items() for oi in A_ if oi != setze[si]]
        for v in varianten[:6]:
            namen = [(S[int(si)]["optionen"][oi].get("t") or S[int(si)]["optionen"][oi].get("k") or "").strip() for si, oi in sorted(v.items(), key=lambda x: int(x[0]))]
            out.append({"vorlage": r["id"], "setze": v, "name": ", ".join([r["name"]] + [n for n in namen if n])[:200], "wert": round(len(hat) / len(Q), 2),
                        "_sort": (-len(hat), -passt, len(v), len(out))})
    out.sort(key=lambda x: x["_sort"])
    for x in out:
        x.pop("_sort")
    return out[:6]


def _kgs(L, s, M=None):
    if s["ziel"] == "raum":
        return TEILE[s["teil"]][1]
    K = sorted({z["kg"] for z, _ in (M or []) if z.get("kg")}) or ["334", "344"]
    return tuple(K)


def beschreiben(s):
    f, t = s["filter"], []
    if s["ziel"] == "raum":
        t.append(f"{TEILE[s['teil']][0]} der Räume")
        if f.get("raumart"):
            t.append("Art: " + ", ".join(f["raumart"]))
        if f.get("ohne_raumart"):
            t.append("ohne " + ", ".join(f["ohne_raumart"]))
    else:
        t.append({"fenster": "Fenster", "tuer": "Türen", "oeffnung": "Fenster und Türen"}[s["ziel"]])
        if f.get("aussen") is not None:
            t.append("außen" if f["aussen"] else "innen")
        if f.get("bruestung_min") is not None:
            t.append(f"Brüstung ≥ {str(f['bruestung_min']).replace('.', ',')} m")
        if f.get("bruestung_max") is not None:
            t.append(f"Brüstung ≤ {str(f['bruestung_max']).replace('.', ',')} m")
    if f.get("geschoss"):
        t.append("Geschoss " + ", ".join(f["geschoss"]))
    return " · ".join(t)


def vorschau(c, L, schritte, bauart=""):
    out = []
    for x in schritte:
        s = _schritt(x)
        if not s:
            continue
        M = mitglieder(L, s)
        n = sum(len(m) for _, m in M)
        bleibt = sum(len(m) for z, m in M if s["ziel"] != "raum" and not s["status"] and z["status"] in ("bleibt", "offen", "pruefen"))
        K = katalog(c, s["material"], _kgs(L, s, M), bauart) if s["material"] else []
        v = {**s, "beschreibung": beschreiben(s), "anzahl": n, "bleiben": bleibt,
             "einheit": "Räume" if s["ziel"] == "raum" else "Elemente"}
        if s.get("treffer"):
            pass
        elif K and K[0]["wert"] >= 1:
            v["treffer"] = {k: K[0][k] for k in ("vorlage", "setze", "name")}
        else:
            v["rueckfrage"] = {"text": f"„{s['material'] or '…'}“ steht so nicht im Katalog der Bauplattform." + (" Ähnlich:" if K else ""), "kandidaten": K}
        out.append(v)
    return out


# ------------------------------------------------------------------ Zeilen aufteilen
def _menge_mitglied(L, z, k):
    if z["bereich"] == "raum":
        r = next((r for r in L.get("raeume") or [] if r["nr"] == k), None)
        if not r:
            return 0.0
        if z["id"].startswith("raum:wand:"):
            alle = [x for x in L.get("raeume") or [] if x["nr"] in (z.get("mitglieder") or [])]
            roh = sum((x["umfang"] or 0) * (x["hoehe"] or 0) for x in alle) or 1
            return (r["umfang"] or 0) * (r["hoehe"] or 0) * (z.get("menge_basis", z["menge"]) / roh)
        return r["flaeche"] or 0
    e = next((e for e in L.get("elemente") or [] if str(e["id"]) == k), None)
    if z["einheit"] == "m²" and e and e.get("b") and e.get("h"):
        return e["b"] * e["h"]
    return z.get("menge_basis", z["menge"]) / max(1, len(z.get("mitglieder") or [])) if z["einheit"] == "m²" else 1


def ableiten(c, L):
    """Abgeleitete Zeilen aus den Anweisungen neu bilden (in der Reihenfolge der Anweisungen; spätere gehen vor). Antworten, die jemand an
    einer abgeleiteten Zeile geändert hat, bleiben (gleiche Kennung)."""
    from . import bauteilliste as B
    Z = L.get("zeilen") or []
    alt = {z["id"]: z for z in Z if z.get("abgeleitet")}
    Z = [z for z in Z if not z.get("abgeleitet") and not (z.get("bereich") == "hand" and z.get("anweisung") and not any(a["id"] == z["anweisung"] for a in L.get("anweisungen") or []))]
    for z in Z:
        if z.get("menge_basis") is not None:
            z["menge"], z["anzahl"] = z.pop("menge_basis"), z.pop("anzahl_basis", z["anzahl"])
        z["verteilt"] = 0
    L["zeilen"] = Z
    ziel = {}   # (Basis-Zeile, Mitglied) → (Signatur, Schritt, Anweisung)
    for a in L.get("anweisungen") or []:
        for s in a["schritte"]:
            t = s.get("treffer") or {}
            if t.get("eigen") or not t.get("vorlage"):
                continue
            for z, M in mitglieder(L, s):
                st = s["status"] or ("neu" if z.get("zustand") == "neu" else "erneuern" if s["ziel"] == "raum" else
                                     z["status"] if z["status"] in ("erneuern", "neu", "instandsetzen") else "")
                if not st or st not in B.erlaubt(z):
                    continue   # Fenster, die bleiben: nichts ändern (steht in der Vorschau)
                for k in M:
                    ziel[(z["id"], k)] = (json.dumps([t["vorlage"], t["setze"], st], sort_keys=True), s, t, st, a["id"])
    neu = []
    for z in Z:
        neu.append(z)
        G = {}
        for k in z.get("mitglieder") or []:
            x = ziel.get((z["id"], k))
            if x:
                G.setdefault(x[0], (x, []))[1].append(k)
        if not G:
            continue
        mb, ab = z["menge"], z["anzahl"]
        weg_m, weg_n = 0.0, 0
        for sig, ((_, s, t, st, aid), M) in sorted(G.items()):
            m = round(sum(_menge_mitglied(L, z, k) for k in M), 2)
            d = dict(z, id=f"{z['id']}~{hashlib.sha1(sig.encode()).hexdigest()[:8]}", abgeleitet=z["id"], anweisung=aid, mitglieder=list(M), menge=m, anzahl=len(M),
                     verteilt=0, status=st, entfaellt=False)
            d.pop("menge_basis", None)
            d.pop("anzahl_basis", None)
            if z["bereich"] == "oeffnung":
                idx = {str(i): n for n, i in enumerate(z.get("ids") or [])}
                d["ids"] = [int(k) for k in M if k.isdigit()]
                d["nummern"] = [z["nummern"][idx[k]] for k in M if k in idx and idx[k] < len(z.get("nummern") or [])]
            else:
                R = {r["nr"]: r for r in L.get("raeume") or []}
                d["ids"] = [R[k]["id"] for k in M if k in R and R[k].get("id")]
            wahl = z["wahl"] if z.get("vorlage") == t["vorlage"] else None
            B.aufbau_setzen(c, d, t["vorlage"], wahl)
            if t["setze"]:
                w = list(d["wahl"])
                for si, oi in t["setze"].items():
                    if int(si) < len(w):
                        w[int(si)] = oi
                B.aufbau_setzen(c, d, t["vorlage"], w)
            d["berechnen"] = st not in ("offen", "bleibt", "pruefen")
            nm = z["art"] if z["bereich"] == "raum" else z["art"]
            wer = f"{len(M)} Räume" if z["bereich"] == "raum" and len(M) > 8 else ", ".join(d["nummern"][:8]) if z["bereich"] == "oeffnung" else ", ".join(M)
            d["name"] = f"{nm}{' – Nassräume' if z['id'].endswith(':nass') else ''} – {d['kurz'] or t['name']} ({wer})"[:200]
            d["hinweis"] = "Aus einer Anweisung an das Modell."
            o = alt.get(d["id"])
            if o:
                for k in ("status", "berechnen", "vorlage", "wahl", "code", "kurz"):
                    d[k] = o.get(k, d[k])
            d["erlaubt"] = B.erlaubt(d)
            neu.append(d)
            weg_m += m
            weg_n += len(M)
        z["menge_basis"], z["anzahl_basis"] = mb, ab
        z["menge"], z["anzahl"], z["verteilt"] = round(max(0.0, mb - weg_m), 2), max(0, ab - weg_n), weg_n
        if z["anzahl"] == 0:
            z["menge"] = 0.0
    L["zeilen"] = neu
    return L


# ------------------------------------------------------------------ verstehen (KI) und Regel ohne KI
SYSTEM = """Du übersetzt eine Anweisung an ein Gebäudemodell in JSON. Antworte NUR mit JSON:
{"schritte":[{"ziel":"raum|fenster|tuer|oeffnung","teil":"boden|wand|decke (nur bei raum)",
 "filter":{"geschoss":["EG"],"raumart":["Wohnraum"],"ohne_raumart":["Bad/WC"],"aussen":true|false|null,"bruestung_min":0.2,"bruestung_max":null},
 "material":"Material oder Bauteil in den Worten der Anweisung","status":"" }]}
Regeln: Ein Schritt je Material bzw. Geschoss. „nicht bodentief“ = bruestung_min 0.2; „bodentief“ = bruestung_max 0.2. Fensterbänke, Rollläden,
Verglasung gehören zu ziel "fenster". Böden, Beläge, Parkett, Fliesen am Boden = teil "boden"; Putz, Anstrich, Tapete = "wand"; Deckenbekleidung = "decke".
„außer Nassräume“ = ohne_raumart ["Bad/WC"]. „Wohnräume“ = raumart ["Wohnraum"]. Raumarten: RAUMARTEN. Geschosse im Modell: GESCHOSSE.
Erfinde keine Materialien – übernimm die Worte der Anweisung. status nur, wenn die Anweisung es sagt (bleibt, instandsetzen, erneuern, neu, abbruch)."""


def regel(text, geschosse=()):
    """Ohne KI: Teilsätze (Komma, „im …“) mit Geschoss, Ziel und Material – einfach, die Vorschau zeigt, was verstanden wurde."""
    t = " " + str(text or "") + " "
    ohne = ["Bad/WC"] if re.search(r"(au(ß|ss)er|ohne)\s+(den\s+)?nass", t, re.I) else []
    ra = ["Wohnraum"] if re.search(r"wohnr(ä|ae)um", t, re.I) else []
    fenster = re.search(r"fenster", t, re.I)
    br = {}
    if re.search(r"nicht\s+bodentief", t, re.I):
        br = {"bruestung_min": 0.2}
    elif re.search(r"bodentief", t, re.I):
        br = {"bruestung_max": 0.2}
    S = []
    for teil in re.split(r",|;|\bund\s+(?=im\b|in\b)", t):
        gs = [k.upper() for k, A in GESCHOSS.items() if any(re.search(rf"\b{re.escape(a)}\b", teil, re.I) for a in A)]
        mat = re.sub(r"\b(alle|allen|wohnr(ä|ae)ume|r(ä|ae)ume|au(ß|ss)er|ohne|nassr(ä|ae)ume|nass\w*|im|in|den|die|der|mit|aus|füge|fuege|hinzu|zu|nicht|"
                     r"bodentiefen?|fenstern?|fensterb(ä|a)nke|eg|og|dg|kg|ug|keller|erdgeschoss|obergeschoss|dachgeschoss|bekommen|sollen)\b", " ", teil, flags=re.I)
        mat = " ".join(mat.split()).strip(" .")
        if fenster and re.search(r"fensterb", teil, re.I):
            mat = ("Fensterbank " + mat).strip()
        if not mat:
            continue
        if fenster:
            S.append({"ziel": "fenster", "teil": "", "filter": {"geschoss": gs, **br}, "material": mat})
        else:
            S.append({"ziel": "raum", "teil": "wand" if re.search(r"putz|tapete|anstrich|wand", mat, re.I) else "decke" if re.search(r"decke", mat, re.I) else "boden",
                      "filter": {"geschoss": gs, "raumart": ra, "ohne_raumart": ohne}, "material": mat})
    return S


def verstehen(c, text, L, reicht=None, ki=None):
    """→ (Schritte, Anbieter). Zuerst die Regel ohne KI: reicht(Schritte) sagt, ob jeder Schritt etwas trifft und einen Katalogeintrag hat –
    dann sofort, ohne die KI im Büro (auf dem Server ohne Grafikkarte dauert eine Antwort Minuten; 16.11.2026). Sonst die KI, danach die Regel."""
    from . import ai, ki_fragen
    text = " ".join(str(text or "").split())[:500]
    if not text:
        raise ValueError("Bitte eine Anweisung eingeben.")
    gs = sorted({r["geschoss"] for r in L.get("raeume") or [] if r.get("geschoss")} | {e["geschoss"] for e in L.get("elemente") or [] if e.get("geschoss")})
    R = [s for s in (_schritt(x) for x in regel(text, gs)) if s]
    if R and reicht and reicht(R):
        return R, ""
    sysp = SYSTEM.replace("RAUMARTEN", "Wohnraum, Bad/WC, Küche, Flur, Treppe, Keller/Technik, Raum").replace("GESCHOSSE", ", ".join(gs) or "unbekannt")
    prov = None
    ki = ki or {"buero": True, "extern": ki_fragen.zusatz_an(c)}   # Schalter des Projekts (ki_fragen.projekt_ki)
    if ki["buero"] and ai.ollama_url() and "ollama" not in ai.abgeschaltet(c) and ai.ollama_state()["ok"]:
        prov = "ollama"
    elif ki["extern"]:
        aus = ai.abgeschaltet(c)
        prov = next((p["key"] for p in ai.providers(c) if p["paid"] and p["ok"] and p["key"] not in aus), None)
    if prov:
        try:
            roh = ai.parse_json(ai.ask(prov, sysp, text, max_tokens=900, c=c, json_mode=True, zweck="anweisung") or "")
            S = [s for s in (_schritt(x) for x in (roh or {}).get("schritte") or []) if s]
            if S:
                return S, prov
        except ai.AIError:
            pass
    return R, ""


# ------------------------------------------------------------------ anwenden, zurücknehmen
def anwenden(c, pid, text, schritte, wer):
    from . import bauteilliste as B, modell
    M = modell.lesen(c, pid)
    m = M["modell"]
    L = B.sauber(m.get("bauteilliste"))
    S = [s for s in (_schritt(x) for x in schritte or []) if s and s.get("treffer")]
    if not S:
        raise modell.Ungueltig("Nichts anzuwenden – jeder Schritt braucht einen Eintrag aus dem Katalog (oder „als eigene Leistung“).")
    aid = hashlib.sha1(f"{text}{_jetzt()}".encode()).hexdigest()[:10]
    L["anweisungen"] = (L.get("anweisungen") or []) + [{"id": aid, "text": _s(text, 500), "schritte": S, "wann": _jetzt()[:16], "wer": _s(wer, 80)}]
    for s in S:   # „als eigene Leistung“: eine Zeile von Hand mit der Anzahl der getroffenen Räume/Elemente
        if s["treffer"].get("eigen"):
            n = sum(len(x) for _, x in mitglieder(L, s))
            z = B.hand_neu(L, f"{s['material']} – {beschreiben(s)}"[:200])
            z.update(menge=float(n or 1), einheit="St", anweisung=aid, hinweis="Aus einer Anweisung – nicht im Katalog, Preis in den Kosten eintragen.")
    ableiten(c, L)
    m["bauteilliste"] = L
    modell.schreiben(c, pid, m, wer)
    return aid


def zuruecknehmen(c, pid, aid, wer):
    from . import bauteilliste as B, modell
    m = modell.lesen(c, pid)["modell"]
    L = B.sauber(m.get("bauteilliste"))
    vorher = len(L.get("anweisungen") or [])
    L["anweisungen"] = [a for a in L.get("anweisungen") or [] if a["id"] != aid]
    if len(L["anweisungen"]) == vorher:
        raise modell.Ungueltig("Diese Anweisung gibt es nicht mehr.")
    L["zeilen"] = [z for z in L["zeilen"] if not (z.get("bereich") == "hand" and z.get("anweisung") == aid)]
    ableiten(c, L)
    m["bauteilliste"] = L
    modell.schreiben(c, pid, m, wer)


def routen(bp, mit, lesen_modell):
    def koerper():
        d = request.get_json(silent=True)
        return d if isinstance(d, dict) else {}

    @bp.post("/api/bp/modell/<int:pid>/anweisung/verstehen")
    def anweisung_verstehen(pid):
        d = koerper()

        def tun(c, wer):
            from . import bauteilliste as B
            m = lesen_modell(c, pid)["modell"]
            L = B.sauber(m.get("bauteilliste"))
            ba = B.bauart(m)
            reicht = lambda S: all(v.get("treffer") and v["anzahl"] for v in vorschau(c, L, S, ba))   # noqa: E731
            try:
                from . import ki_fragen
                S, prov = verstehen(c, d.get("text"), L, reicht, ki_fragen.projekt_ki(c, pid))
            except ValueError as e:
                return jsonify(error=str(e)), 400
            if not S:
                return jsonify(error="Die Anweisung habe ich nicht verstanden – bitte mit Ziel (Räume, Fenster …), Geschoss und Material formulieren."), 400
            return jsonify(schritte=vorschau(c, L, S, B.bauart(m)), ki=prov)
        return mit(pid, tun)

    @bp.post("/api/bp/modell/<int:pid>/anweisung/vorschau")
    def anweisung_vorschau(pid):
        d = koerper()

        def tun(c, wer):
            from . import bauteilliste as B
            m = lesen_modell(c, pid)["modell"]
            return jsonify(schritte=vorschau(c, B.sauber(m.get("bauteilliste")), d.get("schritte") or [], B.bauart(m)))
        return mit(pid, tun)

    @bp.post("/api/bp/modell/<int:pid>/anweisung/anwenden")
    def anweisung_anwenden(pid):
        d = koerper()

        def tun(c, wer):
            aid = anwenden(c, pid, d.get("text"), d.get("schritte"), wer)
            return jsonify(id=aid, **lesen_modell(c, pid))
        return mit(pid, tun)

    @bp.delete("/api/bp/modell/<int:pid>/anweisung/<aid>")
    def anweisung_weg(pid, aid):
        def tun(c, wer):
            zuruecknehmen(c, pid, str(aid)[:20], wer)
            return jsonify(**lesen_modell(c, pid))
        return mit(pid, tun)
