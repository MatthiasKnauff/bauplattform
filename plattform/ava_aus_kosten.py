"""LV aus der Kostenermittlung gliedern (besprochen am 13.11.2026): zwei Schalter statt eines Untertitels je Bauteil.

  bloecke  "leistung"  gleiche Leistung aus mehreren Bauteilen wird eine Position (Mengen addiert, Herkunft in „quelle“),
                       Blöcke nach Gruppe der Baudaten (Beton, Schalung, Bewehrung …)
           "bauteil"   je Bauteil ein Block mit seinen Bestandteilen (Mengen je Bauteil)
  ebenen   "eine"      keine Gliederungspunkte: Positionen in einer Ebene, jeder Block mit Hinweistext als Überschrift
           "gliederung" Titel (Leistungsbereich bzw. Kostengruppe) und je Block ein Untertitel
  titel    "lb" | "kg" Titel nach Leistungsbereich (VOB/C) oder Kostengruppe (DIN 276) – nur mit Gliederungspunkten

Bauteile ohne Aufbau aus dem Baukasten bleiben eine Position; ihr Block ist dann die Kostengruppe.
"""
import uuid

from bpcore import baudaten, din276


def _id():
    return uuid.uuid4().hex[:10]


def _nf(v):
    return f"{v:,.3f}".rstrip("0").rstrip(".").replace(",", "X").replace(".", ",").replace("X", ".")


def _eintraege(c, bts, aufloesen):
    """Je Bauteil seine Positionen mit Leistungsbereich/Gruppe (aus den Baudaten) bzw. der Kostengruppe."""
    out = []
    for x in bts:
        kurz = x.get("name") or ""
        if x.get("mat") and x["mat"] not in kurz:
            kurz = f"{kurz} – {x['mat']}" if kurz else x["mat"]
        kg2 = (x.get("kg") or "000")[:2] + "0"
        kgt = f"{kg2} {din276.NAMEN.get(kg2, '')}".strip()
        a = x.get("aufbau") if aufloesen else None
        A = (baudaten.aufbau(c, a.get("v"), a.get("w")) if isinstance(a, dict) and a.get("v")
             else baudaten.teile_aufbau(c, a["t"]) if isinstance(a, dict) and a.get("t") else None)
        if A and A["teile"]:
            for y in baudaten.aufloesen(c, A["teile"], x.get("menge") or 0, kurz):
                out.append({**y, "kg": y["kg"] or x.get("kg") or "", "_bauteil": kurz, "_kg": kgt,
                            "_lb": f"{y['lb_name']}".strip() or kgt, "_gruppe": y.get("gruppe_name") or y.get("lb_name") or kgt})
        else:
            out.append({"typ": "pos", "art": "N", "kurz": kurz, "lang": x.get("notiz") or "", "menge": x.get("menge") or 0, "einheit": x.get("einheit") or "",
                        "kg": x.get("kg") or "", "ep_s": x.get("ep"), "_bauteil": kurz, "_kg": kgt, "_lb": kgt, "_gruppe": kgt})
    return out


def _zusammen(E):
    """Gleiche Leistung (Baudaten-Code oder Kurztext, Einheit, Schätzpreis) aus mehreren Bauteilen → eine Position."""
    by = {}
    for e in E:
        k = (e.get("code") or e["kurz"], e["einheit"], e.get("ep_s"), e["_lb"], e["_gruppe"])
        if k in by:
            z = by[k]
            z["menge"] = round((z["menge"] or 0) + (e["menge"] or 0), 3)
            z["_aus"].append((e["_bauteil"], e["menge"], e["einheit"]))
        else:
            by[k] = {**e, "_aus": [(e["_bauteil"], e["menge"], e["einheit"])]}
    for z in by.values():
        if len(z["_aus"]) > 1:
            z["quelle"] = ("aus: " + " · ".join(f"{b} ({_nf(m or 0)} {eh})" for b, m, eh in z["_aus"]))[:200]
    return list(by.values())


def _pos(e):
    return {"id": _id(), "typ": "pos", "art": "N", **{k: e.get(k) for k in ("kurz", "lang", "menge", "einheit", "kg", "ep_s", "quelle") if e.get(k) not in (None, "")}}


def gliedern(c, bts, bloecke="leistung", ebenen="eine", titel="lb", aufloesen=True):
    """Bauteile der Kostenermittlung → LV-Einträge (Titel, Hinweistexte, Positionen) in der gewählten Gliederung."""
    E = _eintraege(c, bts, aufloesen)
    leistung = bloecke != "bauteil"
    if leistung:
        E = _zusammen(E)
    tkey = (lambda e: e["_lb"]) if titel == "lb" and leistung else (lambda e: e["_kg"])   # je Bauteil: Titel immer nach Kostengruppe
    bkey = (lambda e: e["_gruppe"]) if leistung else (lambda e: e["_bauteil"])
    gruppen = {}
    for e in E:   # Reihenfolge des ersten Auftretens bleibt (Bauteile wie in der Kostenermittlung)
        gruppen.setdefault(tkey(e), {}).setdefault(bkey(e), []).append(e)
    items, mehrere = [], len(gruppen) > 1
    for t, B in gruppen.items():
        if ebenen == "gliederung":
            items.append({"id": _id(), "typ": "titel", "lvl": 1, "kurz": t[:200]})
        for b, L in B.items():
            if not leistung and len(L) == 1 and L[0]["kurz"] == b:   # Bauteil ohne Aufbau: eine Position mit demselben Namen – keine Überschrift dazu
                items.append(_pos(L[0]))
                continue
            if ebenen == "gliederung":
                if len(B) > 1 or b != t:
                    items.append({"id": _id(), "typ": "titel", "lvl": 2, "kurz": b[:200]})
            else:   # eine Ebene: Überschrift als Hinweistext (bei mehreren Titeln mit dem Titel davor)
                kopf = f"{t} – {b}" if mehrere and b != t and leistung else b
                items.append({"id": _id(), "typ": "pos", "art": "T", "kurz": kopf[:200], "lang": "", "menge": 0, "einheit": ""})
            items += [_pos(e) for e in L]
    return items
