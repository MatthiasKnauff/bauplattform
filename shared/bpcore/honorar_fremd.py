"""Honorar – Fachplaner über unser Büro (Fremdleistungen): Fachplaner je Auftrag, ihre Rechnungen an uns, Weiterberechnung.

Ein Fachplaner (honorar_fremd) ist „über uns“ beauftragt (wird dem Bauherrn weiterberechnet) oder „vom Bauherrn direkt“ (nur zur Koordination).
Seine Rechnungen an uns (honorar_fremd_re) laufen eingang → geprueft → freigegeben → bezahlt (oder abgelehnt). Freigegebene/bezahlte
Rechnungen mit „weiter“ gehen in unsere nächste Abschlags- bzw. Schlussrechnung – durchgereicht, mit Zuschlag oder pauschal.
Die Rechnung rechnet kumuliert (wie die eigene Leistung): alles bis einschließlich dieser Rechnung, abzüglich der bisherigen Rechnungen.
"""
STATUS = {"eingang": "eingegangen", "geprueft": "geprüft", "freigegeben": "freigegeben", "bezahlt": "bezahlt", "abgelehnt": "abgelehnt"}
WEITER = {"durch": "durchgereicht", "zuschlag": "mit Zuschlag", "keine": "nicht weiterberechnen"}
BEAUFTRAGT = {"buero": "über uns", "bauherr": "Bauherr:in direkt"}
LEISTUNGEN = ["Tragwerksplanung", "Technische Ausrüstung (HLS)", "Technische Ausrüstung (Elektro)", "Brandschutz", "Vermessung", "Bodengutachten",
              "Bauphysik / Wärmeschutz", "Schallschutz", "SiGeKo", "Freianlagen", "Prüfstatik"]


def _f(v, d=0.0):
    try:
        return float(str(v).replace(",", ".")) if v not in (None, "") else d
    except (TypeError, ValueError):
        return d


def sauber(b, alt=None):
    """Angaben eines Fachplaners aus dem Browser prüfen."""
    x = dict(alt or {})
    for f, n in (("firma", 200), ("leistung", 200), ("vertrag", 1000), ("notiz", 2000)):
        if f in b:
            x[f] = str(b[f] or "").strip()[:n]
    if "contact_id" in b:
        x["contact_id"] = int(b["contact_id"]) if str(b.get("contact_id") or "").isdigit() else None
    if b.get("beauftragt") in BEAUFTRAGT:
        x["beauftragt"] = b["beauftragt"]
    if b.get("weiter") in WEITER:
        x["weiter"] = b["weiter"]
    if "zuschlag_p" in b:
        x["zuschlag_p"] = max(0.0, min(100.0, round(_f(b["zuschlag_p"]), 2)))
    if "auftrag_netto" in b:
        x["auftrag_netto"] = round(_f(b["auftrag_netto"]), 2) if b["auftrag_netto"] not in (None, "") else None
    return x


def weiterberechnen(f, r):
    """Was aus einer Rechnung des Fachplaners in unsere Rechnung geht → (netto, zuschlag)."""
    if f["beauftragt"] != "buero" or f["weiter"] == "keine" or not r["weiter"] or r["status"] not in ("freigegeben", "bezahlt"):
        return 0.0, 0.0
    n = round(_f(r["netto"]), 2)
    return n, (round(n * _f(f["zuschlag_p"]) / 100, 2) if f["weiter"] == "zuschlag" else 0.0)


def liste(c, aid):
    """Fachplaner eines Auftrags mit ihren Rechnungen und Summen (für die Ansicht)."""
    F = [dict(r) for r in c.execute("SELECT * FROM honorar_fremd WHERE auftrag_id=? ORDER BY id", (aid,)).fetchall()]
    R = [dict(r) for r in c.execute("SELECT r.id, r.fremd_id, r.nr, r.datum, r.netto, r.status, r.weiter, r.re_id, r.dateiname, r.notiz, "
                                    "(r.datei IS NOT NULL OR r.ablage<>'') AS hat_datei, r.ablage, h.nr AS re_nr FROM honorar_fremd_re r JOIN honorar_fremd f ON f.id=r.fremd_id "
                                    "LEFT JOIN honorar_rechnung h ON h.id=r.re_id WHERE f.auftrag_id=? ORDER BY r.datum, r.id", (aid,)).fetchall()]
    out, S = [], {"auftrag": 0.0, "eingang": 0.0, "weiter": 0.0, "offen": 0.0, "pruefen": 0}
    for f in F:
        rs = [r for r in R if r["fremd_id"] == f["id"]]
        eing = round(sum(_f(r["netto"]) for r in rs if r["status"] != "abgelehnt"), 2)
        w = [(r, *weiterberechnen(f, r)) for r in rs]
        weiter = round(sum(n + z for r, n, z in w if r["re_id"]), 2)
        offen = round(sum(n + z for r, n, z in w if not r["re_id"]), 2)
        pruefen = sum(1 for r in rs if r["status"] in ("eingang", "geprueft"))
        out.append({**{k: f[k] for k in ("id", "contact_id", "firma", "leistung", "beauftragt", "vertrag", "auftrag_netto", "weiter", "zuschlag_p", "notiz")},
                    "rechnungen": rs, "eingang": eing, "weiterberechnet": weiter, "offen": offen, "pruefen": pruefen,
                    "ueber": bool(f["auftrag_netto"]) and eing > _f(f["auftrag_netto"]) + 0.005})
        if f["beauftragt"] == "buero":
            S["auftrag"] += _f(f["auftrag_netto"]); S["eingang"] += eing; S["weiter"] += weiter; S["offen"] += offen; S["pruefen"] += pruefen
    return {"liste": out, "summe": {k: round(v, 2) if isinstance(v, float) else v for k, v in S.items()}, "status": STATUS, "weiter": WEITER,
            "beauftragt": BEAUFTRAGT, "leistungen": LEISTUNGEN}


def zeilen(c, aid, bis_re=None):
    """Für unsere Rechnung: alle weiterzuberechnenden Rechnungen der Fachplaner, kumuliert – schon weiterberechnete (re_id ≤ bis_re)
    und noch offene (re_id leer). → [{id, text, netto, zuschlag_p, zuschlag, betrag, neu}]"""
    out = []
    for r in c.execute("SELECT r.*, f.firma, f.leistung, f.beauftragt, f.weiter AS f_weiter, f.zuschlag_p FROM honorar_fremd_re r "
                       "JOIN honorar_fremd f ON f.id=r.fremd_id WHERE f.auftrag_id=? ORDER BY f.id, r.datum, r.id", (aid,)).fetchall():
        r = dict(r)
        if r["re_id"] and bis_re is not None and r["re_id"] > bis_re:
            continue
        f = {"beauftragt": r["beauftragt"], "weiter": r["f_weiter"], "zuschlag_p": r["zuschlag_p"]}
        n, z = weiterberechnen(f, r)
        if not n:
            continue
        text = f"{r['leistung'] or 'Fachplanung'}, {r['firma']}".strip(", ") + (f" – Rechnung {r['nr']}" if r["nr"] else "") + (f" vom {r['datum'][8:10]}.{r['datum'][5:7]}.{r['datum'][:4]}" if len(r["datum"] or "") == 10 else "")
        out.append({"id": r["id"], "text": text, "netto": n, "zuschlag_p": _f(r["zuschlag_p"]) if f["weiter"] == "zuschlag" else 0.0, "zuschlag": z,
                    "betrag": round(n + z, 2), "neu": not r["re_id"]})
    return out
