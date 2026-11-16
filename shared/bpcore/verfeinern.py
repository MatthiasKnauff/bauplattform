"""Gebäudemodell mit externer KI verfeinern (GO 16.11.2026, Entwurf „Gebäudemodell mit externer KI verfeinern“).

Nur im Gebäudemodell (Bauteile → „Verfeinern (extern) …“) und nur, wenn die Verwaltung die Zusatzrecherche im Netz eingeschaltet hat
(ki_fragen.zusatz_an, Standard aus). Die KI ändert nie selbst etwas: Ihre Antworten werden geprüft und kommen als VORSCHLAG an die Linie
„Pläne“ (pm_hinweis, art „rueckweg“, Herkunft „ki“) – angenommen wird einzeln in der Checkliste (bp/bauteile.js, rueckweg.annehmen).

Was hinausgeht (anfrage()): Bauart, Geschosse, Räume NACH ART (Bad, Küche … – nie der Raumname) mit Fläche und Höhe, die Bauteil-Liste mit
Mengen, Antworten und Aufbau, für Zeilen ohne Aufbau die passenden Vorlagen des eigenen Baukastens (nur Namen). Nicht: Projektname,
Adresse, Personen, Firmen, Preise, Pläne, Bilder. Geometrie nur als Zahlen (Entscheidung: kein Bild). ai.ask anonymisiert zusätzlich
und schreibt ins Datenschutz-Protokoll.

WAS: luecken (fehlende Bauteile) · aufbau (Aufbau aus dem Baukasten für Zeilen ohne Aufbau) · mengen (Auffälliges) · ausstattung (Aufbau für
Räume, Küche und Bad nach Standard). Geprüft wird jede Antwort (pruefen()): Zeilen nur, die es gibt; Vorlagen nur aus der mitgegebenen Liste;
Mengen > 0; höchstens 30 Vorschläge.

POST /api/bp/modell/<pid>/verfeinern  {was: [...]} → {vorschlaege, n} | {error}
"""
import json
import re

from flask import jsonify, request

from .wert import kurz as _s

WAS = {"luecken": "Fehlende Bauteile", "aufbau": "Aufbauten", "mengen": "Mengen prüfen", "ausstattung": "Ausstattung je Raumgruppe"}
VORGABE = ("luecken", "aufbau")
HERKUNFT = {"app": "ki", "name": "", "ref": "ki"}
RAUMART = ((re.compile(r"\b(bad|dusch|wc|sanit|nass)", re.I), "Bad/WC"), (re.compile(r"(küche|kueche|kochen)", re.I), "Küche"),
           (re.compile(r"(flur|diele|gang|eingang|windfang)", re.I), "Flur"), (re.compile(r"(treppe)", re.I), "Treppe"),
           (re.compile(r"(keller|lager|abstell|technik|heiz|hausanschl)", re.I), "Keller/Technik"),
           (re.compile(r"(wohn|ess|schlaf|kind|zimmer|arbeit|büro|buero|gast)", re.I), "Wohnraum"))
SYSTEM = """Du prüfst die Bauteil-Liste eines Gebäudes für ein Architekturbüro in Deutschland (Kosten nach DIN 276). Du bekommst Bauart, Räume
nach Art mit Flächen, die Bauteil-Zeilen (Kennung Z1, Z2 … mit Menge und Antwort) und für Zeilen ohne Aufbau die erlaubten Vorlagen (Kennung V…).
Mache nur Vorschläge zu den erbetenen Punkten. Erfinde keine Zeilen-Kennungen und keine Vorlagen – nur aus der Liste. Kurz begründen (ein Satz).
Antworte NUR mit JSON: {"vorschlaege":[
 {"art":"neu","name":"…","menge":12.5,"einheit":"m²","kg":"363","grund":"…"},
 {"art":"aufbau","zeile":"Z3","vorlage":"V2","grund":"…"},
 {"art":"menge","zeile":"Z5","menge":40,"grund":"…"}]}
Keine Vorschläge → {"vorschlaege":[]}."""


def raumart(name):
    return next((t for r, t in RAUMART if r.search(name or "")), "Raum")


def _vorlagen(c, kg):
    if not kg:
        return []
    return [dict(r) for r in c.execute("SELECT id, name, einheit FROM pdb_vorlage WHERE kg LIKE ? ORDER BY sort, id LIMIT 8", (kg[:3] + "%",)).fetchall()]


def anfrage(c, m, was):
    """→ (Text für die KI, Kennungen {Z1: zeilen-id}, {V1: vorlage-id})."""
    from . import bauteilliste as B
    L = (m.get("bauteilliste") or {})
    Z = [z for z in L.get("zeilen") or [] if not z.get("entfaellt")]
    zid, vid, T = {}, {}, []
    ba = B.bauart(m)
    T.append("Bauart: " + ({"neubau": "Neubau", "bestand": "Maßnahmen im Bestand", "gemischt": "Neubau und Bestand"}.get(ba) or "unbekannt"))
    G = {}
    for r in L.get("raeume") or []:
        g = G.setdefault(r.get("geschoss") or "–", {})
        a = g.setdefault(raumart(r.get("name")), [0, 0.0, []])
        a[0] += 1
        a[1] += r.get("flaeche") or 0
        a[2].append(r.get("hoehe") or 0)
    if G:
        T.append(f"Geschosse: {len(G)}, Räume nach Art (Anzahl, Fläche, lichte Höhe):")
        for i, (g, A) in enumerate(sorted(G.items()), 1):   # Geschossnamen bleiben drin, wenn sie nur Kürzel sind (EG, OG …)
            gn = g if re.fullmatch(r"[A-Za-z0-9 .\-]{1,8}", g) else f"Geschoss {i}"
            T.append(f"- {gn}: " + "; ".join(f"{t} {n}× {a:.1f} m² h {max(h):.2f} m" for t, (n, a, h) in sorted(A.items())))
    T.append("Bauteil-Zeilen:")
    for i, z in enumerate(Z, 1):
        k = f"Z{i}"
        zid[k] = z["id"]
        T.append(f"{k} [{z.get('bereich')}] KG {z.get('kg') or '–'} {z.get('art') or ''}: {z.get('name')} · {z.get('menge') or 0} {z.get('einheit') or ''}"
                 f" · Antwort: {z.get('status')}" + (f" · Aufbau: {z['kurz']}" if z.get("kurz") else " · ohne Aufbau"))
    ohne = [z for z in Z if not z.get("vorlage") and z.get("status") not in ("bleibt", "offen") and
            ("aufbau" in was or ("ausstattung" in was and z.get("bereich") in ("raum", "ausbau")))]
    if ohne:
        T.append("Erlaubte Vorlagen für Zeilen ohne Aufbau:")
        for z in ohne[:25]:
            V = _vorlagen(c, z.get("kg"))
            if not V:
                continue
            for v in V:
                if v["id"] not in vid.values():
                    vid[f"V{len(vid) + 1}"] = v["id"]
            kv = {v: k for k, v in vid.items()}
            T.append(f"- für {next(k for k, i in zid.items() if i == z['id'])}: " + "; ".join(f"{kv[v['id']]} {v['name']} ({v['einheit']})" for v in V))
    T.append("Erbeten: " + ", ".join(WAS[w] for w in was) + ".")
    if "ausstattung" in was:
        T.append("Zur Ausstattung: für Bad, Küche und Böden einen passenden Aufbau aus den Vorlagen nach üblichem mittlerem Standard; im Grund den Standard nennen.")
    return "\n".join(T), zid, vid


def _zahl(v):
    try:
        x = float(str(v).replace(",", "."))
    except (TypeError, ValueError):
        return None
    return round(x, 2) if 0 < x < 1e7 else None


def pruefen(c, m, roh, zid, vid, was):
    """Antwort der KI → Zeilen im Format des Rückwegs (rueckweg.annehmen). Was nicht passt, fällt still weg."""
    from . import rueckweg as RW
    L = [z for z in (m.get("bauteilliste") or {}).get("zeilen") or [] if not z.get("entfaellt")]
    by = {z["id"]: z for z in L}
    namen = {r["id"]: r["name"] for r in c.execute("SELECT id, name FROM pdb_vorlage").fetchall()} if vid else {}
    out, gesehen = [], set()
    for x in ((roh or {}).get("vorschlaege") or [])[:60]:
        if not isinstance(x, dict) or len(out) >= 30:
            continue
        art, grund = str(x.get("art") or ""), _s(x.get("grund"), 240)
        z = by.get(zid.get(str(x.get("zeile") or "").strip()))
        if art == "neu" and "luecken" in was:
            name = _s(x.get("name"), 200)
            if not name or RW.wort(name) in gesehen:
                continue
            gesehen.add(RW.wort(name))
            neu = {k: v for k, v in {"menge": _zahl(x.get("menge")) or 0.0, "einheit": _s(x.get("einheit"), 12) or "psch",
                                      "kg": re.sub(r"\D", "", _s(x.get("kg"), 3))}.items() if v}
            e = {"art": "neu", "name": name, "neu": neu, "doppelt": RW.doppelt(name, L)}
        elif art == "aufbau" and z and ("aufbau" in was or ("ausstattung" in was and z.get("bereich") in ("raum", "ausbau"))):
            v = vid.get(str(x.get("vorlage") or "").strip())
            if not v or v == z.get("vorlage"):
                continue
            e = {"art": "aendern", "id": z["id"], "name": z["name"], "alt": {"aufbau": z.get("kurz") or ""}, "neu": {"vorlage": v, "vorlage_name": namen.get(v, v)},
                 "einheit": z.get("einheit") or ""}
        elif art == "menge" and z and "mengen" in was:
            mg = _zahl(x.get("menge"))
            if mg is None or abs(mg - (z.get("menge") or 0)) < 0.01:
                continue
            e = {"art": "aendern", "id": z["id"], "name": z["name"], "alt": {"menge": z.get("menge") or 0}, "neu": {"menge": mg}, "einheit": z.get("einheit") or ""}
        else:
            continue
        e["grund"] = grund
        e["schluessel"] = [e["art"], e.get("id") or RW.wort(e["name"]), e["neu"]]
        out.append(e)
    return out


def verfeinern(c, pid, was, wer=""):
    from . import ai, ki_fragen, modell
    if not ki_fragen.zusatz_an(c):
        raise modell.Ungueltig("Die Zusatzrecherche im Netz ist ausgeschaltet (Verwaltung → Einstellungen → KI).")
    was = [w for w in WAS if w in (was or [])] or list(VORGABE)
    m = modell.lesen(c, pid)["modell"]
    if not ((m.get("bauteilliste") or {}).get("zeilen")):
        raise modell.Ungueltig("Erst einen Planstand einlesen – ohne Bauteil-Liste gibt es nichts zu verfeinern.")
    aus = ai.abgeschaltet(c)
    prov = next((p["key"] for p in ai.providers(c) if p["paid"] and p["ok"] and p["key"] not in aus), None)
    if not prov:
        raise modell.Ungueltig("Es ist keine externe KI eingerichtet (Verwaltung → Einstellungen → KI).")
    text, zid, vid = anfrage(c, m, was)
    roh = ai.parse_json(ai.ask(prov, SYSTEM, text, max_tokens=2500, c=c, json_mode=True, zweck="verfeinern") or "")
    Z = pruefen(c, m, roh, zid, vid, was)
    alt = c.execute("SELECT id, status, daten FROM pm_hinweis WHERE project_id=? AND daten LIKE ?", (pid, '%"ref": "ki"%')).fetchall()
    schon = {json.dumps(e.get("schluessel")) for h in alt if h["status"] in ("abgelehnt", "uebernommen") for e in (json.loads(h["daten"] or "{}").get("zeilen") or [])}
    Z = [e for e in Z if json.dumps(e["schluessel"]) not in schon]   # schon entschieden: kommt nicht wieder
    for h in alt:   # der offene Vorschlag der letzten Anfrage wird ersetzt
        if h["status"] == "offen":
            c.execute("DELETE FROM pm_hinweis WHERE id=?", (h["id"],))
    if not Z:
        return 0
    titel = f"Externe KI ({prov}): {len(Z)} Vorschl{'ag' if len(Z) == 1 else 'äge'} – ungeprüft"
    modell.hinweis_neu(c, pid, "plaene", titel, {"art": "rueckweg", "herkunft": {**HERKUNFT, "name": prov}, "zeilen": Z, "extern": True}, "ki", wer)
    return len(Z)


def routen(bp, mit):
    @bp.post("/api/bp/modell/<int:pid>/verfeinern")
    def modell_verfeinern(pid):
        d = request.get_json(silent=True)
        d = d if isinstance(d, dict) else {}

        def tun(c, wer):
            from . import ai, rueckweg
            try:
                n = verfeinern(c, pid, d.get("was") if isinstance(d.get("was"), list) else [], wer)
            except ai.AIError as e:
                return jsonify(error=f"Die externe KI hat nicht geantwortet: {e}"), 502
            return jsonify(n=n, vorschlaege=rueckweg.offene(c, pid))
        return mit(pid, tun)
