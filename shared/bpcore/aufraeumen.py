"""Adressen aufräumen (GO 19.11.2026, Mock „Adressen aufräumen“: A1 B1 C1 D1) – ähnliche Werte von Gewerk, Art, Stichwörtern und Tags finden
und mit einem Klick je Gruppe zusammenführen; ausgeführt wird über begriffe.ersetzen (derselbe Weg wie das 🗑 in der Vorschlagsliste, mit Rückgängig).

Vorschläge je Quelle (vorschlaege):
  zusammen  ähnliche Werte → ein Ziel (A1): gleiche Schreibweise bis auf Groß/Klein, Umlaute, Gendern, Mehrzahl (begriffe._norm), Tippfehler
            (Abstand ≤ 1 bei 4–7, ≤ 2 ab 8 Buchstaben), gleicher Wortstamm (gemeinsamer Anfang ≥ 6 Buchstaben), bekannte Abkürzungen (ABK + gelernte).
            Ziel: der Wert aus der festen Liste (stammdaten.KONTAKT_GEWERKE), sonst der häufigste.
  aufteilen ein Eintrag aus zwei bekannten Gewerken („Heizung Sanitär“) → zwei Einträge (B1, nur Gewerk).
  zuordnen  Art: eigene Art, die einer üblichen ähnelt (Bauherrin → Bauherr:in) bzw. nur einmal vorkommt (C1).
  leeren    Kontakte der Art „Baustelle“ mit dem Gewerk „Baustelle“ – doppelt, das Gewerk fällt weg (D1).
„Nicht ähnlich“ merkt sich die Gruppe (bp_store „aufraeumen:nicht“) – sie kommt nicht wieder. Zusammengeführte Abkürzungen lernt das Büro
(bp_store „aufraeumen:abk“). Routen: GET /api/bp/aufraeumen/<quelle> · POST …/<quelle>/anwenden {vorschlaege: [...]} · POST …/nicht {schluessel}.
"""
import json
import re
from datetime import datetime

from . import begriffe, contacts

ABK = {"galabau": "Garten- und Landschaftsbau", "gala-bau": "Garten- und Landschaftsbau", "hls": "Heizung, Lüftung, Sanitär", "tga": "Technische Gebäudeausrüstung",
       "elt": "Elektro", "hzg": "Heizung", "sigeko": "SiGeKo", "wdvs": "Wärmedämmverbundsystem", "trockenbauer": "Trockenbau", "stahlbau": "Stahlbau"}
ARTEN = {"firma": "Firma", "bauherr": "Bauherr:in", "baustelle": "Baustelle"}   # übliche Arten (wie KINDS0 in adressen.html)
QUELLEN = {"kontakt.trade": "Gewerk", "kontakt.art": "Art", "kontakt.stichworte": "Stichwörter", "kontakt.tags": "Tags"}
_NICHT, _ABK = "aufraeumen:nicht", "aufraeumen:abk"


def _store(c, k, leer):
    r = c.execute("SELECT data FROM bp_store WHERE key=?", (k,)).fetchone()
    try:
        return json.loads(r["data"]) if r else leer
    except (TypeError, ValueError):
        return leer


def _store_setzen(c, k, d, wer):
    c.execute("INSERT INTO bp_store(key, data, updated, updated_by) VALUES(?,?,?,?) ON CONFLICT (key) DO UPDATE SET data=EXCLUDED.data, updated=EXCLUDED.updated",
              (k, json.dumps(d, ensure_ascii=False), datetime.now().isoformat(timespec="seconds"), wer))


def _um(s):
    s = str(s or "").lower()
    for a, b in (("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("ß", "ss")):
        s = s.replace(a, b)
    return s


def schluessel(w):
    """Vergleichsform: Umlaute, Groß/Klein, Gendern, Mehrzahl (begriffe._norm)."""
    return begriffe._norm(_um(w))


def abstand(a, b, grenze=3):
    """Tippfehler-Abstand (Levenshtein), bricht ab, sobald er die Grenze überschreitet."""
    if abs(len(a) - len(b)) > grenze:
        return grenze + 1
    vor = list(range(len(b) + 1))
    for i, x in enumerate(a, 1):
        jetzt = [i] + [0] * len(b)
        for j, y in enumerate(b, 1):
            jetzt[j] = min(vor[j] + 1, jetzt[j - 1] + 1, vor[j - 1] + (x != y))
        if min(jetzt) > grenze:
            return grenze + 1
        vor = jetzt
    return vor[-1]


def aehnlich(a, b, abk=None):
    """Gehören zwei Werte zusammen? → Grund oder ''."""
    ka, kb = schluessel(a), schluessel(b)
    if not ka or not kb:
        return ""
    if ka == kb:
        return "Schreibweise"
    A = {**ABK, **(abk or {})}
    if schluessel(A.get(_um(a).strip(), "")) == kb or schluessel(A.get(_um(b).strip(), "")) == ka:
        return "Abkürzung"
    n = min(len(ka), len(kb))
    if n >= 4 and abstand(ka, kb, 2) <= (1 if n < 8 else 2):
        return "Tippfehler"
    if " " not in a.strip() and " " not in b.strip():   # Wortstamm nur bei einzelnen Wörtern („Elektro“, „Elektroarbeiten“)
        p = 0
        while p < n and ka[p] == kb[p]:
            p += 1
        if p >= 6 and p >= 0.45 * n:
            return "Wortstamm"
    return ""


def _gruppen(W, nicht, abk):
    """W = {wert: anzahl} → Gruppen ähnlicher Werte (Union-Find), ohne als „nicht ähnlich“ gemerkte."""
    werte = sorted(W, key=str.lower)
    eltern = {w: w for w in werte}
    grund = {}

    def wurzel(w):
        while eltern[w] != w:
            eltern[w] = eltern[eltern[w]]
            w = eltern[w]
        return w
    for i, a in enumerate(werte):
        for b in werte[i + 1:]:
            g = aehnlich(a, b, abk)
            if g:
                ra, rb = wurzel(a), wurzel(b)
                if ra != rb:
                    eltern[rb] = ra
                grund[ra] = grund.get(ra) or g
    G = {}
    for w in werte:
        G.setdefault(wurzel(w), []).append(w)
    out = []
    for r, L in G.items():
        if len(L) < 2:
            continue
        k = "|".join(sorted(schluessel(x) for x in L))
        if k in nicht:
            continue
        out.append((L, grund.get(r, "ähnlich"), k))
    return out


def _ziel(L, W, fest):
    F = {x.lower(): x for x in fest}
    for x in L:
        if x.lower() in F:
            return F[x.lower()]
    return sorted(L, key=lambda x: (-W[x], len(x), x.lower()))[0]


def vorschlaege(c, quelle):
    from .stammdaten import KONTAKT_GEWERKE
    q = begriffe.QUELLEN[quelle]
    W = q.werte(c)
    nicht, abk = set(_store(c, _NICHT, [])), _store(c, _ABK, {})
    fest = KONTAKT_GEWERKE if quelle == "kontakt.trade" else list(ARTEN) if quelle == "kontakt.art" else []
    out = []
    if quelle == "kontakt.art":   # Anzeige: übliche Arten mit Namen vergleichen (bauherr ↔ Bauherr:in)
        for k, n in ARTEN.items():
            W.setdefault(k, 0)
        for L, g, k in _gruppen({w: n for w, n in W.items()}, nicht, abk):
            if all(x in ARTEN for x in L):
                continue
            z = next((x for x in L if x in ARTEN), None) or _ziel(L, W, fest)
            out.append({"art": "zusammen", "schluessel": k, "grund": g, "werte": [{"w": x, "n": W[x], "name": ARTEN.get(x, x)} for x in L if W[x]], "ziel": z})
        drin = {x["w"] for v in out for x in v["werte"]}
        for w, n in W.items():   # C1: eigene Art, die nur einmal vorkommt → zuordnen?
            if w not in ARTEN and w not in drin and n == 1 and ("art|" + schluessel(w)) not in nicht:
                out.append({"art": "zuordnen", "schluessel": "art|" + schluessel(w), "grund": "nur einmal vergeben", "werte": [{"w": w, "n": n, "name": w}], "ziel": "",
                            "wahl": [[k, v] for k, v in ARTEN.items()]})
        return out
    for L, g, k in _gruppen(W, nicht, abk):
        out.append({"art": "zusammen", "schluessel": k, "grund": g, "werte": [{"w": x, "n": W[x]} for x in L], "ziel": _ziel(L, W, fest)})
    if quelle == "kontakt.trade":
        bekannt = {x.lower(): x for x in list(KONTAKT_GEWERKE) + [w for w, n in W.items() if n >= 2]}
        for w, n in W.items():   # B1: zwei bekannte Gewerke in einem Eintrag
            T = [t for t in re.split(r"\s*(?:/|\+|&|\bund\b|\s)\s*", w) if t]
            k = "teil|" + schluessel(w)
            if len(T) >= 2 and len(T) <= 3 and w.lower() not in bekannt and all(t.lower() in bekannt and len(t) >= 3 for t in T) and k not in nicht:
                out.append({"art": "aufteilen", "schluessel": k, "grund": "mehrere Gewerke in einem Eintrag", "werte": [{"w": w, "n": n}], "ziel": [bekannt[t.lower()] for t in T]})
        nb = sum(1 for r in c.execute("SELECT art, trade FROM contacts WHERE lower(art)='baustelle'").fetchall() if any(x.lower() == "baustelle" for x in contacts.liste(r["trade"])))
        if nb and "leer|baustelle" not in nicht:   # D1
            out.append({"art": "leeren", "schluessel": "leer|baustelle", "grund": "die Art „Baustelle“ sagt es schon", "werte": [{"w": "Baustelle", "n": nb}], "ziel": ""})
    return out


def anwenden(c, quelle, V, wer):
    """Vorschläge ausführen → rueck [{id, alt}] (für begriffe.zurueck). Gelernt werden zusammengeführte Abkürzungen."""
    rueck, abk = [], _store(c, _ABK, {})
    for v in V[:200] if isinstance(V, list) else []:
        art, werte = v.get("art"), [str(x) for x in (v.get("werte") or []) if str(x).strip()][:50]
        if art == "zusammen":
            z = " ".join(str(v.get("ziel") or "").split())[:120]
            if not z:
                continue
            for w in werte:
                if w.lower() != z.lower():
                    rueck += begriffe.ersetzen(c, quelle, w, z, {}, wer)
                    if len(w) <= 8 and schluessel(w) != schluessel(z) and not abstand(schluessel(w), schluessel(z), 2) <= 2:
                        abk[_um(w).strip()] = z   # kurze Form → lange: gelernte Abkürzung
        elif art == "zuordnen":
            z = str(v.get("ziel") or "").strip()[:60]
            if z:
                for w in werte:
                    rueck += begriffe.ersetzen(c, quelle, w, z, {}, wer)
        elif art == "aufteilen" and quelle == "kontakt.trade":
            T = [" ".join(str(t).split())[:60] for t in (v.get("ziel") or []) if str(t).strip()][:3]
            for w in werte:
                if T:
                    rueck += begriffe.ersetzen(c, quelle, w, ", ".join(T), {}, wer)
        elif art == "leeren" and quelle == "kontakt.trade":
            q = begriffe.QUELLEN[quelle]
            ids = {r["id"] for r in c.execute("SELECT id FROM contacts WHERE lower(art)='baustelle'").fetchall()}
            je = {str(t["id"]): ("" if t["id"] in ids else "Baustelle") for t in q.treffer(c, "Baustelle")}
            rueck += begriffe.ersetzen(c, quelle, "Baustelle", "Baustelle", je, wer)
    if abk:
        _store_setzen(c, _ABK, abk, wer)
    return rueck


def nicht_aehnlich(c, schl, wer):
    S = set(_store(c, _NICHT, []))
    S.add(str(schl)[:400])
    _store_setzen(c, _NICHT, sorted(S), wer)


def routen(bp, user):
    from flask import jsonify, request
    from . import db

    def vorab(quelle):
        u = user()
        if not u:
            return None, (jsonify(error="Nicht angemeldet"), 401)
        if quelle not in QUELLEN or quelle not in begriffe.QUELLEN:
            return None, (jsonify(error="Diese Liste lässt sich nicht aufräumen."), 404)
        if not begriffe.darf(u, begriffe.QUELLEN[quelle]):
            return None, (jsonify(error="Diese Einträge darfst du nicht ändern."), 403)
        return u, None

    @bp.get("/api/bp/aufraeumen/<quelle>")
    def aufr_liste(quelle):
        u, err = vorab(quelle)
        if err:
            return err
        with db.tx() as c:
            W = begriffe.QUELLEN[quelle].werte(c)
            return jsonify(titel=QUELLEN[quelle], vorschlaege=vorschlaege(c, quelle), werte=sorted(([w, n] for w, n in W.items()), key=lambda x: x[0].lower()))

    @bp.post("/api/bp/aufraeumen/<quelle>/anwenden")
    def aufr_anwenden(quelle):
        u, err = vorab(quelle)
        if err:
            return err
        with db.tx() as c:
            rueck = anwenden(c, quelle, (request.get_json(silent=True) or {}).get("vorschlaege"), u["name"])
        return jsonify(n=len({x["id"] for x in rueck}), rueck=rueck[::-1])   # zurück: der älteste Stand je Kontakt zuletzt

    @bp.post("/api/bp/aufraeumen/<quelle>/nicht")
    def aufr_nicht(quelle):
        u, err = vorab(quelle)
        if err:
            return err
        with db.tx() as c:
            nicht_aehnlich(c, (request.get_json(silent=True) or {}).get("schluessel") or "", u["name"])
        return jsonify(ok=True)
