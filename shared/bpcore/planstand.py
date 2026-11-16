"""Planstände des Gebäudemodells (GO 16.11.2026, Entwurf „Gebäudemodell als Mitte“).

Jeder eingelesene Plan wird ein Planstand – wie die Versionen der anderen Apps (gemeinsames Versionsmenü): Name, „gilt“, archivieren,
löschen. Der gültige Planstand steht als Bauteilliste im Projektmodell (modell.bauteilliste, quelle.planstand = id); dort beantwortet man
Status und Aufbau. Ältere Stände bleiben zum Ansehen und Vergleichen (Tabelle pm_planstand, nur die ausgelesenen Daten – die Datei liegt
in „Pläne & Dateien“ oder kam vom Gerät).

Einlesen in zwei Schritten:
  1. lesen   Datei (vom Gerät oder aus „Pläne & Dateien“) → Entwurf mit der neuen Liste (Antworten gleicher Zeilen schon übernommen)
             und dem Abgleich gegen den gültigen Stand: neu · geändert · entfällt · unverändert.
  2. übernehmen  mit der Zuordnung per Klick („entfällt“ ↔ „neu“ = dasselbe Bauteil → Antworten wandern mit). Entfallene Zeilen mit
             Antwort bleiben als „entfällt“ stehen (nicht berechnet), bis jemand aufräumt; ohne Antwort fallen sie weg.

abgleich(alt, neu) · uebernehmen(alt, neu, zuordnung) · aufraeumen(liste) · lesen_datei(name, raw) · routen(bp, mit, lesen, schreiben)
"""
import json
import re
from datetime import datetime

from . import bauteilliste as B

FELDER = ("status", "berechnen", "vorlage", "wahl", "code", "kurz")
ENDUNGEN = ("ifc", "dxf", "pdf")


def _jetzt():
    return datetime.now().isoformat(timespec="seconds")


def _j(s, d):
    try:
        return json.loads(s) if s else d
    except (TypeError, ValueError):
        return d


def _kurz(z):
    return {"id": z["id"], "bereich": z["bereich"], "name": z["name"], "menge": z["menge"], "einheit": z["einheit"], "anzahl": z.get("anzahl", 0),
            "status": z["status"], "beantwortet": z["status"] != "offen", "nummern": z.get("nummern") or []}


def abgleich(alt, neu):
    """Was ändert sich, wenn neu (Liste) an die Stelle von alt (Liste) tritt? Nur Bauteile aus dem Plan (Rohbau, Öffnungen) können neu sein
    oder entfallen; Räume, Küche/Bad und Fragen haben feste Zeilen und können sich nur in der Menge ändern. Zeilen von Hand bleiben immer."""
    A = {z["id"]: z for z in (alt or {}).get("zeilen") or [] if z["bereich"] not in ("hand", "leistung") and not z.get("entfaellt") and not z.get("abgeleitet")}
    A = {i: dict(z, menge=z.get("menge_basis", z["menge"]), anzahl=z.get("anzahl_basis", z.get("anzahl"))) for i, z in A.items()}   # vor dem Aufteilen (Anweisungen)
    N = {z["id"]: z for z in (neu or {}).get("zeilen") or [] if z["bereich"] not in ("hand", "leistung")}
    plan = ("rohbau", "oeffnung")
    out = {"neu": [], "geaendert": [], "entfaellt": [], "gleich": 0}
    for i, z in N.items():
        a = A.get(i)
        if a is None:
            if z["bereich"] in plan:
                out["neu"].append(_kurz(z))
            continue
        if abs((a["menge"] or 0) - (z["menge"] or 0)) > 0.005 or a.get("anzahl") != z.get("anzahl"):
            out["geaendert"].append(dict(_kurz(z), menge_alt=a["menge"], anzahl_alt=a.get("anzahl", 0)))
        else:
            out["gleich"] += 1
    out["entfaellt"] = [_kurz(a) for i, a in A.items() if i not in N and a["bereich"] in plan]
    return out


def uebernehmen(alt, neu, zuordnung=None):
    """Neue Liste mit den Antworten von alt: zugeordnete Paare (alt-id → neu-id) übernehmen Status und Aufbau, soweit sie zur neuen Zeile passen;
    entfallene Zeilen mit Antwort bleiben als „entfällt“ (nicht berechnet), Zeilen von Hand bleiben."""
    alt, neu = alt or B.leer(), dict(neu or B.leer())
    A = {z["id"]: z for z in alt.get("zeilen") or []}
    Z = [dict(z) for z in neu.get("zeilen") or [] if z["bereich"] not in ("hand", "leistung")]
    Z += [dict(z) for z in alt.get("zeilen") or [] if z.get("abgeleitet")]   # Antworten der abgeleiteten Zeilen – ableiten() nimmt sie wieder auf
    N = {z["id"]: z for z in Z}
    benutzt = set()
    for a_id, n_id in (zuordnung or {}).items():
        a, z = A.get(str(a_id)), N.get(str(n_id))
        if not a or not z or a["bereich"] != z["bereich"] or n_id in benutzt:
            continue
        benutzt.add(n_id)
        if a["status"] in B.erlaubt(z) or a["status"] == "offen":
            for k in FELDER:
                z[k] = a.get(k, z[k])
        z["hinweis"] = (f"Zugeordnet: war „{a['name']}“." + (" " + z["hinweis"] if z.get("hinweis") else ""))[:300]
        A.pop(str(a_id))
    for i, a in A.items():
        if a.get("abgeleitet"):
            continue
        if i in N or a["bereich"] not in ("rohbau", "oeffnung", "hand", "leistung") and not a.get("entfaellt"):
            continue
        if a["bereich"] in ("hand", "leistung"):   # von Hand und aus den Apps (Leistungen ohne Bauteil) bleiben
            Z.append(dict(a))
        elif a["status"] != "offen":
            Z.append(dict(a, entfaellt=True, berechnen=False, hinweis="Im neuen Planstand nicht mehr enthalten – bleibt stehen, bis du aufräumst."))
    for z in Z:
        z["erlaubt"] = B.erlaubt(z)
    namen = {r["nr"]: r["name"] for r in alt.get("raeume") or [] if r.get("ermittelt") and r.get("name") not in ("", "Raum")}   # vergebene Namen ermittelter Räume behalten
    R = [{**r, "name": namen.get(r["nr"], r["name"])} if r.get("ermittelt") else r for r in neu.get("raeume") or []]
    return {**neu, "raeume": R, "zeilen": Z, "anweisungen": alt.get("anweisungen") or []}   # Anweisungen gelten weiter (anweisung.ableiten)


def aufraeumen(liste):
    L = dict(liste or B.leer())
    weg = [z for z in L.get("zeilen") or [] if z.get("entfaellt")]
    L["zeilen"] = [z for z in L.get("zeilen") or [] if not z.get("entfaellt")]
    return L, len(weg)


def dateiart(name, raw):
    endung = (name.rsplit(".", 1)[-1] if "." in name else "").lower()
    if endung == "ifc" or raw[:20].lstrip().startswith(b"ISO-10303-21"):
        return "ifc"
    if endung == "pdf" or raw[:5] == b"%PDF-":
        return "pdf"
    if endung == "dxf":
        return "dxf"
    if endung == "dwg" or raw[:4] == b"AC10":
        raise ValueError("DWG ist ein geschlossenes Format – bitte im CAD als DXF oder IFC speichern.")
    raise ValueError("Diese Dateiart kann das Gebäudemodell nicht lesen – bitte IFC, DXF oder PDF.")


def lesen_datei(name, raw, zuordnung=None):
    """Datei → Rohdaten wie cadimport.ifc_lesen(…, bestand=True). DXF braucht die Zuordnung der Ebenen und Blöcke (plan2d)."""
    art = dateiart(name, raw)
    if art == "ifc":
        from . import cadimport
        return art, cadimport.ifc_lesen(raw, bestand=True)
    from . import plan2d
    return art, (plan2d.pdf_lesen(raw) if art == "pdf" else plan2d.dxf_lesen(raw, zuordnung))


DXF_KEY = "gebaeudemodell:dxf"   # Zuordnung der Ebenen und Blöcke – fürs ganze Büro gemerkt (CAD-Gewohnheiten des Büros)


def dxf_zuordnung(c, neu=None, wer=""):
    r = c.execute("SELECT data FROM bp_store WHERE key=?", (DXF_KEY,)).fetchone()
    Z = _j(r["data"] if r else "", {}) or {}
    Z = {"ebenen": dict(Z.get("ebenen") or {}), "bloecke": dict(Z.get("bloecke") or {})}
    if neu:
        from . import plan2d
        for k, erlaubt_ in (("ebenen", plan2d.ROLLEN_EBENE), ("bloecke", plan2d.ROLLEN_BLOCK)):
            for n, rolle in list((neu.get(k) or {}).items())[:2000]:
                if rolle in erlaubt_:
                    Z[k][str(n)[:200]] = rolle
        c.execute("INSERT INTO bp_store(key, data, updated, updated_by) VALUES(?,?,?,?) ON CONFLICT (key) DO UPDATE SET data=EXCLUDED.data, "
                  "updated=EXCLUDED.updated, updated_by=EXCLUDED.updated_by", (DXF_KEY, json.dumps(Z, ensure_ascii=False), _jetzt(), wer[:120]))
    return Z


# ------------------------------------------------------------------ Datenbank
def _zeile(r):
    return {"id": r["id"], "name": r["name"], "datei": r["datei"], "pfad": r["pfad"], "art": r["art"], "wer": r["wer"], "erstellt": r["erstellt"],
            "archiviert": bool(r["archiviert"])}


def liste(c, pid):
    return [_zeile(r) for r in c.execute("SELECT id, name, datei, pfad, art, wer, erstellt, archiviert FROM pm_planstand WHERE project_id=? AND entwurf=0 "
                                         "ORDER BY id", (pid,)).fetchall()]


def holen(c, pid, sid):
    r = c.execute("SELECT * FROM pm_planstand WHERE id=? AND project_id=?", (sid, pid)).fetchone()
    return (dict(_zeile(r), entwurf=bool(r["entwurf"]), daten=_j(r["daten"], {})) if r else None)


def _neu(c, pid, name, datei, pfad, quelle, art, wer, daten, entwurf):
    c.execute("INSERT INTO pm_planstand(project_id, name, datei, pfad, quelle, art, wer, erstellt, entwurf, daten) VALUES(?,?,?,?,?,?,?,?,?,?)",
              (pid, name[:120], datei[:200], pfad[:500], quelle[:12], art[:8], wer[:120], _jetzt(), 1 if entwurf else 0, json.dumps(daten, ensure_ascii=False)))
    return c.execute("SELECT max(id) AS id FROM pm_planstand WHERE project_id=?", (pid,)).fetchone()["id"]


def _sichern(c, pid, L, wer):
    """Den Stand im Modell in seinen Planstand zurückschreiben (Antworten gehören zum Stand). Ohne Planstand (Modell von vor dem 16.11.2026)
    wird einer angelegt – so beginnt die Geschichte mit dem, was schon da war."""
    if not L or not L.get("zeilen"):
        return None
    sid = (L.get("quelle") or {}).get("planstand")
    if sid and c.execute("SELECT 1 FROM pm_planstand WHERE id=? AND project_id=?", (sid, pid)).fetchone():
        c.execute("UPDATE pm_planstand SET daten=? WHERE id=?", (json.dumps(L, ensure_ascii=False), sid))
        return sid
    Q = L.get("quelle") or {}
    sid = _neu(c, pid, f"Planstand {(Q.get('gelesen') or _jetzt())[:10]}", Q.get("datei", ""), Q.get("pfad", ""), "", Q.get("art", "ifc"), wer, L, False)
    L["quelle"] = dict(Q, planstand=sid)
    c.execute("UPDATE pm_planstand SET daten=? WHERE id=?", (json.dumps(L, ensure_ascii=False), sid))
    return sid


def anwenden(m, L):
    """Bauteilliste ins Modell; Räume und Fläche des Modells aus dem Plan, solange niemand sie von Hand gepflegt hat."""
    m["bauteilliste"] = L
    R = L.get("raeume") or []
    if R and (not m.get("raeume") or all(str(r.get("id", "")).startswith("ifc") for r in m["raeume"])):
        m["raeume"] = [{"id": f"ifc{r['id']}", "nr": r["nr"], "name": r["name"], "flaeche": r["flaeche"], "geschoss": r["geschoss"]} for r in R]
    if R and not (m.get("hand") or {}).get("flaeche"):
        m["flaeche"] = round(sum(r["flaeche"] for r in R), 2)
    return m


def datei_holen(pid):
    """Datei vom Gerät (Formular „datei“) oder aus dem Projektordner (JSON {quelle: plan|server, pfad}) → (name, bytes, pfad, quelle)."""
    from flask import request
    f = request.files.get("datei")
    if f:
        raw = f.read()
        return (f.filename or "modell.ifc"), raw, "", "geraet"
    d = request.get_json(silent=True) or {}
    pfad = str(d.get("pfad") or "")[:500]
    if not pfad:
        raise ValueError("Keine Datei erhalten.")
    if not re.search(r"\.(" + "|".join(ENDUNGEN) + r")$", pfad, re.I):
        raise ValueError("Bitte eine IFC-, DXF- oder PDF-Datei wählen.")
    import urllib.parse
    from .ablage import bt_json
    weg = "/api/plaene/datei?" if d.get("quelle") == "plan" else "/api/dateien/datei?"
    try:
        raw = bt_json("GET", weg + urllib.parse.urlencode({"project_id": pid, "pfad": pfad}), roh=True)
    except RuntimeError as e:
        raise ValueError(str(e))
    return pfad.rsplit("/", 1)[-1], raw, pfad, "ablage"


def netz_speichern(c, sid, art, raw, zuordnung=None):
    """3D-Netz des Planstands (bpcore/netz.py) – PDF hat keins; misslingt es, bleibt der Planstand ohne 3D-Ansicht."""
    if art == "pdf":
        return False
    from . import netz
    try:
        n = netz.netz_ifc(raw) if art == "ifc" else netz.netz_dxf(raw, zuordnung)
    except Exception:   # noqa: BLE001 – ungewöhnliche Geometrie: Planstand trotzdem nutzbar
        return False
    if not n["e"]:
        return False
    c.execute("INSERT INTO pm_netz(planstand, daten, erstellt) VALUES(?,?,?) ON CONFLICT (planstand) DO UPDATE SET daten=EXCLUDED.daten, erstellt=EXCLUDED.erstellt",
              (sid, netz.packen(n), _jetzt()))
    return True


# ------------------------------------------------------------------ Adressen (eingehängt in modell.routen)
def routen(bp, mit, lesen_modell, schreiben_modell):
    from flask import jsonify, request

    def antwort(c, pid, **mehr):
        return jsonify(dict(lesen_modell(c, pid), planstaende=liste(c, pid), **mehr))

    @bp.post("/api/bp/modell/<int:pid>/bauteile/lesen")
    def planstand_lesen(pid):
        """Schritt 1: Datei lesen → Entwurf mit Abgleich gegen den gültigen Stand (das Modell bleibt unverändert)."""
        try:
            name, raw, pfad, quelle = datei_holen(pid)
            if not raw:
                raise ValueError("Die Datei ist leer.")
            if len(raw) > 200 * 1024 * 1024:
                raise ValueError("Die Datei ist zu groß (höchstens 200 MB).")
            art = dateiart(name, raw)
            R = None if art == "dxf" else lesen_datei(name, raw)[1]   # DXF erst mit der Zuordnung (braucht die Datenbank)
            zu_neu = request.form.get("zuordnung") if request.files else (request.get_json(silent=True) or {}).get("zuordnung")
            zu_neu = _j(zu_neu, None) if isinstance(zu_neu, str) else zu_neu if isinstance(zu_neu, dict) else None
        except ValueError as e:
            return jsonify(error=str(e)), 400
        except Exception as e:   # noqa: BLE001 – kaputte Datei: Meldung an die Oberfläche
            return jsonify(error="Die Datei konnte nicht gelesen werden: " + str(e).splitlines()[0][:150]), 400

        def tun(c, wer):
            nonlocal R
            Z = None
            if art == "dxf":   # Ebenen und Blöcke: Unbekanntes erst zuordnen lassen (einmal je Büro)
                from . import plan2d
                Z = dxf_zuordnung(c, zu_neu, wer)
                try:
                    E = plan2d.dxf_ebenen(raw)
                    fehlt = [e for e in E["ebenen"] if e["name"] not in Z["ebenen"]] + [b for b in E["bloecke"] if b["name"] not in Z["bloecke"]]
                    if fehlt and zu_neu is None:
                        return jsonify(zuordnen={"ebenen": [dict(e, rolle=Z["ebenen"].get(e["name"]) or plan2d.vorschlag(e["name"], "ebene")) for e in E["ebenen"]][:300],
                                                 "bloecke": [dict(b, rolle=Z["bloecke"].get(b["name"]) or plan2d.vorschlag(b["name"], "block")) for b in E["bloecke"]][:300],
                                                 "rollen_ebene": plan2d.ROLLEN_EBENE, "rollen_block": plan2d.ROLLEN_BLOCK})
                    R = plan2d.dxf_lesen(raw, Z)
                except ValueError as e:
                    return jsonify(error=str(e)), 400
            m = lesen_modell(c, pid)["modell"]
            alt = m.get("bauteilliste") or B.leer()
            neu = B.zeilen_aus_ifc(c, R, alt, B.bauart(m))
            neu["quelle"] = {"datei": name, "gelesen": _jetzt(), "programm": R["info"].get("programm", ""), "objekte": R["info"].get("objekte", 0),
                             "art": art, "pfad": pfad, "name": f"Planstand {datetime.now().strftime('%d.%m.%Y')} – {name}"[:120]}
            c.execute("DELETE FROM pm_netz WHERE planstand IN (SELECT id FROM pm_planstand WHERE project_id=? AND entwurf=1)", (pid,))
            c.execute("DELETE FROM pm_planstand WHERE project_id=? AND entwurf=1", (pid,))   # höchstens ein offener Entwurf je Projekt
            sid = _neu(c, pid, neu["quelle"]["name"], name, pfad, quelle, art, wer, {"liste": neu, "hinweise": R.get("hinweise") or []}, True)
            netz_speichern(c, sid, art, raw, Z if art == "dxf" else None)
            return jsonify(entwurf=sid, name=neu["quelle"]["name"], art=art, erster=not alt.get("zeilen"), abgleich=abgleich(alt, neu),
                           hinweise=R.get("hinweise") or [], zeilen=len(neu["zeilen"]))
        return mit(pid, tun)

    @bp.post("/api/bp/modell/<int:pid>/planstand/<int:sid>/uebernehmen")
    def planstand_uebernehmen(pid, sid):
        """Schritt 2: Entwurf mit Zuordnung übernehmen → neuer gültiger Planstand; der bisherige behält seine Antworten."""
        d = request.get_json(silent=True) or {}
        zu = {str(k)[:200]: str(v)[:200] for k, v in (d.get("zuordnung") if isinstance(d.get("zuordnung"), dict) else {}).items()}

        def tun(c, wer):
            P = holen(c, pid, sid)
            if not P or not P["entwurf"]:
                return jsonify(error="Dieser Entwurf ist nicht mehr da – bitte die Datei noch einmal einlesen."), 404
            m = lesen_modell(c, pid)["modell"]
            alt = m.get("bauteilliste") or B.leer()
            _sichern(c, pid, alt, wer)
            L = uebernehmen(alt, P["daten"].get("liste"), zu)
            from . import anweisung
            anweisung.ableiten(c, L)   # Anweisungen auf den neuen Planstand anwenden
            name = str(d.get("name") or P["name"]).strip()[:120] or P["name"]
            L["quelle"] = dict(L.get("quelle") or {}, planstand=sid, name=name)
            c.execute("UPDATE pm_planstand SET entwurf=0, name=?, daten=? WHERE id=?", (name, json.dumps(L, ensure_ascii=False), sid))
            schreiben_modell(c, pid, anwenden(m, L), wer)
            return antwort(c, pid, hinweise=P["daten"].get("hinweise") or [])
        return mit(pid, tun)

    @bp.get("/api/bp/modell/<int:pid>/planstaende")
    def planstaende(pid):
        return mit(pid, lambda c, wer: jsonify(planstaende=liste(c, pid), gilt=((lesen_modell(c, pid)["modell"].get("bauteilliste") or {}).get("quelle") or {}).get("planstand")))

    @bp.get("/api/bp/modell/<int:pid>/planstand/<int:sid>")
    def planstand_ansehen(pid, sid):
        """Ein Planstand zum Ansehen, mit Abgleich gegen den gültigen (was wäre anders, wenn er gälte)."""
        def tun(c, wer):
            P = holen(c, pid, sid)
            if not P or P["entwurf"]:
                return jsonify(error="Planstand nicht gefunden."), 404
            L = B.sauber(P["daten"] if "zeilen" in P["daten"] else P["daten"].get("liste"))
            g = lesen_modell(c, pid)["modell"].get("bauteilliste") or B.leer()
            return jsonify(planstand={k: v for k, v in P.items() if k != "daten"}, liste=L, abgleich=abgleich(g, L))
        return mit(pid, tun)

    @bp.post("/api/bp/modell/<int:pid>/planstand/<int:sid>")
    def planstand_aendern(pid, sid):
        """{name} umbenennen · {archiviert} · {gilt: true} gültig machen · {loeschen: true, nachfolger?} in den Papierkorb – beim gültigen
        gilt danach der Nachfolger; ist er der einzige, verliert das Modell, was aus dem Plan kam (von Hand Ergänztes bleibt)."""
        d = request.get_json(silent=True) or {}

        def tun(c, wer):
            P = holen(c, pid, sid)
            if not P or P["entwurf"]:
                return jsonify(error="Planstand nicht gefunden."), 404
            m = lesen_modell(c, pid)["modell"]
            alt = m.get("bauteilliste") or B.leer()
            gilt = (alt.get("quelle") or {}).get("planstand") == sid
            if d.get("loeschen"):   # jeder Planstand – auch der gültige (16.11.2026: „alles löschen können“); in den Papierkorb, mit 3D-Netz
                from . import papierkorb
                if gilt:
                    andere = [x for x in liste(c, pid) if x["id"] != sid]
                    nf = next((x for x in andere if str(x["id"]) == str(d.get("nachfolger"))), None)
                    if andere and not nf:
                        return jsonify(error="Welcher Planstand soll danach gelten?", nachfolger=[x["id"] for x in andere]), 400
                    if nf:   # der Nachfolger gilt ab jetzt – wie „gelten lassen“
                        _sichern(c, pid, alt, wer)
                        N = holen(c, pid, nf["id"])
                        L = B.sauber(N["daten"] if "zeilen" in N["daten"] else N["daten"].get("liste"))
                        L["quelle"] = dict(L.get("quelle") or {}, planstand=nf["id"], name=N["name"])
                        c.execute("UPDATE pm_planstand SET archiviert=0 WHERE id=?", (nf["id"],))
                        schreiben_modell(c, pid, anwenden(m, L), wer)
                    else:   # der einzige: das Modell verliert, was aus dem Plan kam – von Hand Ergänztes bleibt
                        _sichern(c, pid, alt, wer)
                        L = B.leer()
                        L["zeilen"] = [z for z in alt.get("zeilen") or [] if z.get("bereich") in ("hand", "leistung")]
                        m["bauteilliste"] = L
                        m["raeume"] = [r for r in m.get("raeume") or [] if not str(r.get("id", "")).startswith("ifc")]
                        schreiben_modell(c, pid, m, wer)
                pr = c.execute("SELECT name FROM projects WHERE id=?", (pid,)).fetchone()
                pk = papierkorb.ablegen(c, "pm_planstand", sid, "Planstand", P["name"], wer, pr["name"] if pr else "", "gebaeudemodell",
                                        extra=[("pm_netz", "planstand=?", (sid,))])
                return antwort(c, pid, papierkorb=pk, war_gueltig=gilt)
            if "name" in d and str(d["name"]).strip():
                nm = str(d["name"]).strip()[:120]
                c.execute("UPDATE pm_planstand SET name=? WHERE id=?", (nm, sid))
                if gilt:
                    alt["quelle"] = dict(alt.get("quelle") or {}, name=nm)
                    schreiben_modell(c, pid, m, wer)
            if "archiviert" in d:
                if gilt and d["archiviert"]:
                    return jsonify(error="Der gültige Planstand kann nicht archiviert werden."), 400
                c.execute("UPDATE pm_planstand SET archiviert=? WHERE id=?", (1 if d["archiviert"] else 0, sid))
            if d.get("gilt") and not gilt:
                _sichern(c, pid, alt, wer)
                L = B.sauber(P["daten"] if "zeilen" in P["daten"] else P["daten"].get("liste"))
                L["quelle"] = dict(L.get("quelle") or {}, planstand=sid, name=P["name"])
                c.execute("UPDATE pm_planstand SET archiviert=0 WHERE id=?", (sid,))
                schreiben_modell(c, pid, anwenden(m, L), wer)
            return antwort(c, pid)
        return mit(pid, tun)

    @bp.get("/api/bp/modell/<int:pid>/netz")
    def planstand_netz(pid):
        """3D-Netz des gültigen (oder ?planstand=…) Planstands – gzip-JSON, der Browser packt es selbst aus."""
        from flask import Response

        def tun(c, wer):
            sid = request.args.get("planstand", type=int) or ((lesen_modell(c, pid)["modell"].get("bauteilliste") or {}).get("quelle") or {}).get("planstand")
            r = c.execute("SELECT n.daten FROM pm_netz n JOIN pm_planstand p ON p.id = n.planstand WHERE n.planstand=? AND p.project_id=?", (sid or 0, pid)).fetchone()
            if not r:
                return jsonify(error="Für diesen Planstand gibt es keine 3D-Ansicht – aus PDF geht das nicht, ältere Planstände bitte noch einmal einlesen."), 404
            return Response(bytes(r["daten"]), mimetype="application/json", headers={"Content-Encoding": "gzip", "Cache-Control": "private, max-age=300"})
        return mit(pid, tun)

    @bp.post("/api/bp/modell/<int:pid>/bauteile/aufraeumen")
    def bauteile_aufraeumen(pid):
        def tun(c, wer):
            m = lesen_modell(c, pid)["modell"]
            L, n = aufraeumen(m.get("bauteilliste"))
            m["bauteilliste"] = L
            schreiben_modell(c, pid, m, wer)
            return antwort(c, pid, entfernt=n)
        return mit(pid, tun)
