"""„Fragen und Antworten“ im Gebäudemodell führt Änderungssätze aus (GO 18.11.2026, Mock „Fragen führt Änderungen aus“: FA-A1 B2 C2,
KI über den Schieber; Wunsch 18.11.: KI-Vorschläge protokollieren).

erkennen(text)      Ist das ein Änderungssatz (hinzufügen, tauschen, ersetzen, ändern, entfernen, „alle …“, „in allen …“, „statt“) – oder eine Frage?
verstehen(…)        → Vorschau ohne zu ändern:
                      art "kuerzel": „tausche AW KS WDVS in PP“ – Bauteile mit diesem Kürzel bekommen den Aufbau des neuen (Kern bpcore/kuerzel.py);
                                     unklar (nur der Kern genannt, mehrere Deutungen) → Rückfrage mit Auswahl
                      art "anweisung": alles, was „Anweisung …“ kann (bpcore/anweisung.py: Böden, Wände, Decken je Raum, Fenster, Türen …)
ausfuehren(…)       ändert das Modell und schreibt ins Protokoll (audit_log „KI-Vorschlag“: Satz, Stufe/KI, wer, was vorher → nachher).
"""
import json
import re
from datetime import datetime

AENDERN = re.compile(r"\b(tausch\w*|ersetz\w*|änder\w*|aender\w*|hinzu\w*|ergänz\w*|füg\w*|entfern\w*|lösch\w*|setz\w*)\b|\bin allen\b|^alle\b|\bstatt\b", re.I)
FRAGE = re.compile(r"^(was|wie|wann|wo|wer|warum|welche\w*|gibt es|kostet|ist|sind|kann|hat)\b|\?\s*$", re.I)
TAUSCH = re.compile(r"(?:tausch\w*|ersetz\w*|änder\w*|aender\w*)\s+[\"„“']?(.+?)[\"“”']?\s+(?:in|durch|gegen|zu|mit)\s+[\"„“']?(.+?)[\"“”']?\s*\.?$", re.I)


def erkennen(text):
    t = " ".join(str(text or "").split())
    return bool(t) and bool(AENDERN.search(t)) and not FRAGE.search(t)


def _zeilen_mit(L, alt):
    from . import kuerzel
    n = kuerzel.zerlegen(alt)["norm"]
    return [z for z in L.get("zeilen") or [] if z.get("kuerzel") and kuerzel.zerlegen(z["kuerzel"])["norm"] == n and not z.get("entfaellt")]


def _deutungen(alt, neu):
    """„AW KS WDVS“ → „PP“: ist nur der Kern genannt, gibt es zwei Lesarten – Kern tauschen (Rest bleibt) oder ganz „PP“."""
    from . import kuerzel
    A, N = kuerzel.zerlegen(alt), kuerzel.zerlegen(neu)
    if N["kern"] and not (N["aussen_s"] or N["innen_s"] or N["beide_s"] or N["lage"]) and (A["aussen_s"] or A["innen_s"] or A["beide_s"] or A["lage"]):
        w = A["norm"].split()
        k = next((i for i, x in enumerate(w) if kuerzel.zerlegen(x)["kern"]), None)
        if k is not None:
            w[k] = N["norm"].split()[0]
            return [" ".join(w).upper(), N["norm"].upper()]
    return [N["norm"].upper()]


def _kz_vorschau(c, L, alt, neu):
    from . import bauteilliste as B, kuerzel
    Z = _zeilen_mit(L, alt)
    if not Z:
        return {"art": "kuerzel", "fehler": f"Kein Bauteil mit dem Kürzel „{alt}“ im gültigen Planstand."}
    D = _deutungen(alt, neu)
    if len(D) > 1:
        return {"art": "kuerzel", "rueckfrage": f"„{neu}“ statt „{alt}“ – wie gemeint?", "optionen": [
            {"neu": D[0], "text": f"nur den Kern tauschen → {D[0]} (die übrigen Schichten bleiben)"}, {"neu": D[1], "text": f"ganz {D[1]} (ohne die übrigen Schichten)"}], "alt": alt}
    z0 = Z[0]
    KZ = kuerzel.zerlegen(D[0], z0.get("art") or "Wand", True if z0.get("kg") in ("331", "335", "361", "363") else None)
    vid, wahl, dh = kuerzel.vorschlag(c, KZ, z0.get("kg") or "", z0.get("dicke_plan") or 0)
    if not vid:
        return {"art": "kuerzel", "fehler": f"Zu „{D[0]}“ gibt es keinen passenden Aufbau im Katalog ({KZ.get('frage') or 'unbekannt'}) – bitte genauer angeben oder im Baukasten anlegen."}
    V = B._vorlage(c, vid) or {}
    return {"art": "kuerzel", "alt": alt, "neu": D[0], "vorlage": vid, "wahl": wahl, "vorlage_name": V.get("name") or vid, "dicke": dh,
            "zeilen": [{"id": z["id"], "name": z["name"], "menge": z["menge"], "einheit": z["einheit"], "vorher": z.get("kurz") or ""} for z in Z],
            "verstanden": kuerzel.lesbar(KZ)}


def verstehen(c, pid, text, ki="buero"):
    from . import anweisung, bauteilliste as B, ki_stufe, modell
    st = ki_stufe.stufe(c, pid, ki)
    m = modell.lesen(c, pid)["modell"]
    L = B.sauber(m.get("bauteilliste"))
    t = " ".join(str(text or "").split())[:500]
    mt = TAUSCH.search(t)
    if mt and _zeilen_mit(L, mt.group(1)):
        return dict(_kz_vorschau(c, L, mt.group(1).strip(), mt.group(2).strip()), stufe=st)
    ba = B.bauart(m)
    reicht = lambda S: all(v.get("treffer") and v["anzahl"] for v in anweisung.vorschau(c, L, S, ba))   # noqa: E731
    S, prov = anweisung.verstehen(c, t, L, reicht, {"buero": st in ("buero", "extern"), "extern": st == "extern"})
    if not S:
        return {"art": "anweisung", "fehler": "Das habe ich nicht verstanden – bitte mit Ziel (Räume, Fenster, Bauteil-Kürzel …), Geschoss und Material formulieren.", "stufe": st}
    return {"art": "anweisung", "schritte": anweisung.vorschau(c, L, S, ba), "ki": prov, "stufe": st}


def _protokoll(c, wer, text, stufe, ki, was):
    c.execute("INSERT INTO audit_log(ts, user_name, cat, action, detail) VALUES(?,?,?,?,?)",
              (datetime.now().strftime("%Y-%m-%d %H:%M:%S"), wer, "ki-vorschlag", f"Änderung aus „Fragen und Antworten“ ({ {'aus': 'ohne KI', 'buero': 'KI im Büro', 'extern': 'externe KI'}.get(stufe, stufe)}{', ' + ki if ki else ''})",
               json.dumps({"satz": text, "was": was}, ensure_ascii=False)[:4000]))


def ausfuehren(c, pid, d, wer):
    from . import anweisung, bauteilliste as B, modell
    text, stufe, ki = str(d.get("text") or "")[:500], str(d.get("stufe") or "aus"), str(d.get("ki") or "")[:40]
    if d.get("art") == "kuerzel":
        m = modell.lesen(c, pid)["modell"]
        L = B.sauber(m.get("bauteilliste"))
        ids, was = set(d.get("ids") or []), []
        for z in L["zeilen"]:
            if z["id"] in ids:
                vor = z.get("kurz") or ""
                B.aufbau_setzen(c, z, d.get("vorlage"), d.get("wahl") or [])
                z.update(kz_vorlage=d.get("vorlage") or "", kz_wahl=d.get("wahl") or [], bestaetigt=True,
                         hinweis=(f"Aufbau per Änderung: „{d.get('alt')}“ → „{d.get('neu')}“ – im Plan nachziehen (An den Zeichner)." + (" " + z["hinweis"] if z.get("hinweis") else ""))[:300])
                was.append({"zeile": z["name"], "vorher": vor, "nachher": z.get("kurz") or ""})
        if not was:
            raise modell.Ungueltig("Die Bauteile gibt es nicht mehr – bitte neu fragen.")
        m["bauteilliste"] = L
        modell.schreiben(c, pid, m, wer)
        _protokoll(c, wer, text, stufe, ki, was)
        return {"n": len(was)}
    aid = anweisung.anwenden(c, pid, text, d.get("schritte"), wer)
    _protokoll(c, wer, text, stufe, ki, [{"anweisung": aid, "schritte": [anweisung.beschreiben(s) for s in (anweisung._schritt(x) for x in d.get("schritte") or []) if s]}])
    return {"id": aid}


def routen(bp, mit, _lesen_modell):
    from flask import jsonify, request

    @bp.post("/api/bp/modell/<int:pid>/aendern/verstehen")
    def fa_verstehen(pid):
        d = request.get_json(silent=True) or {}

        def tun(c, wer):
            try:
                return jsonify(verstehen(c, pid, d.get("text"), d.get("ki") or "buero"))
            except ValueError as e:
                return jsonify(error=str(e)), 400
        return mit(pid, tun)

    @bp.post("/api/bp/modell/<int:pid>/aendern/ausfuehren")
    def fa_ausfuehren(pid):
        d = request.get_json(silent=True) or {}

        def tun(c, wer):
            return jsonify(ausfuehren(c, pid, d, wer))
        return mit(pid, tun)
