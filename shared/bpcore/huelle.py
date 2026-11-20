"""Gebäudehülle im Projektmodell: welche Bauteile der Hülle ein Projekt hat – zusammengetragen aus den Quellen des Projekts.

Quellen heute: Baukosten (IFC-Modell oder Raumbuch: Fläche, Kostengruppe, Schichten wo das Modell sie mitgibt) und der Planungsassistent
(Bauweise, Dachform, Keller → Vorschläge für Bauteile, die noch niemand erfasst hat). Später: eingelesene Pläne (Etappe 5).
Apps greifen nicht selbst in die Daten einer anderen App – sie fragen hier (Regel des Projektmodells) und bekommen Hinweise an ihrer Linie.

huelle(c, pid)                       → {"bauteile": [...], "quellen": [...]}   (schreibt nichts)
abgleich(vorhanden, bauteile)        → Hinweise für eine App, die Hüllbauteile führt (rein): neu · flaeche · vorschlag
hinweise_abgleichen(c, pid, app, …)  → legt die Hinweise an der Linie ab (pm_hinweis), räumt überholte weg, lässt Entschiedenes in Ruhe
"""
import re

from . import modell
from .jsonwert import lies as _j

# Kostengruppe (DIN 276) → Art des Hüllbauteils ("" = Art bitte wählen, z. B. Decken)
KG_ART = {"331": "wand", "332": "wand", "334": "fenster", "361": "steildach", "362": "steildach", "363": "steildach",
          "322": "bodenplatte", "324": "bodenplatte", "351": ""}
NAME = {"wand": "Außenwand", "erdwand": "Wand gegen Erdreich", "fenster": "Fenster", "tuer": "Außentür", "steildach": "Steildach", "flachdach": "Flachdach",
        "bodenplatte": "Bodenplatte gegen Erdreich", "": "Decke"}
OHNE_SCHICHTEN = ("fenster", "tuer")
RANG = {"uebernommen": 0, "abgelehnt": 1, "spaeter": 1, "offen": 2}


def art_von(r):
    """Zeile der Baukosten → Art des Hüllbauteils; None = gehört nicht zur Hülle."""
    t = KG_ART.get(str(r.get("kg") or ""))
    if t is None:
        return None
    n = f"{r.get('name') or ''} {r.get('mat') or ''}".lower()
    if t == "wand" and re.search(r"keller|erdreich|perimeter|\bug\b|untergeschoss", n):
        return "erdwand"
    if t == "fenster" and re.search(r"\btür|tuer|\btor\b", n):
        return "tuer"
    if t == "steildach" and re.search(r"flach|gründach|grundach|attika|warmdach|umkehrdach", n):
        return "flachdach"
    return t


def aus_kosten(daten, bk_id, bk_name):
    """Bauteile einer Kostenermittlung (rein). ref „bk:<Ermittlung>:<Zeile>“ bleibt gleich, solange es die Zeile gibt."""
    out = []
    for r in (daten or {}).get("bauteile") or []:
        if not isinstance(r, dict):
            continue
        t = art_von(r)
        m2 = (r.get("einheit") or "m²") == "m²"
        if t is None or (not m2 and t not in OHNE_SCHICHTEN):
            continue
        try:
            fl = round(float(r.get("menge") or 0), 2) if m2 else None
        except (TypeError, ValueError):
            fl = None
        lagen = [[str(x[0])[:80], float(x[1] or 0)] for x in (r.get("lagen") or []) if isinstance(x, (list, tuple)) and len(x) >= 2 and isinstance(x[1], (int, float))][:20]
        out.append({"ref": f"bk:{bk_id}:{r.get('id')}", "art": t, "kg": str(r.get("kg") or ""), "name": str(r.get("name") or NAME[t])[:120], "mat": str(r.get("mat") or "")[:120],
                    "flaeche": fl, "uw": r.get("uw") if isinstance(r.get("uw"), (int, float)) else None, "lagen": [] if t in OHNE_SCHICHTEN else lagen,
                    "herkunft": str(r.get("formel") or r.get("src") or "")[:120], "quelle": f"Baukosten „{bk_name}“", "ifc": bool(lagen) or "ifc" in str(r.get("src") or "").lower(),
                    **({"aufbau": r["aufbau"]} if isinstance(r.get("aufbau"), dict) and r["aufbau"].get("v") and t not in OHNE_SCHICHTEN else {}),
                    **({"aussen": r["aussen"]} if isinstance(r.get("aussen"), bool) else {}), **({"einordnung": str(r["einordnung"])[:120]} if r.get("einordnung") else {})})
    return out


def aus_liste(L, schon=()):
    """Hüllbauteile direkt aus der Bauteilliste des Gebäudemodells (20.11.2026) – für Zeilen, die noch in keiner Kostenermittlung stehen. So bekommt der
    Wärmeschutz die Hülle schon mit dem eingelesenen Plan, ohne den Umweg über die Kosten. ref „bk:0:<Zeile>“ (dieselbe Zeile wie später in den Kosten)."""
    Z = []
    for z in (L or {}).get("zeilen") or []:
        if not isinstance(z, dict) or z.get("entfaellt") or str(z.get("id")) in schon or z.get("status") == "abbruch":
            continue
        Z.append({"id": z.get("id"), "kg": z.get("kg"), "name": z.get("name"), "mat": z.get("kurz") or z.get("material") or "", "menge": z.get("menge"), "einheit": z.get("einheit"),
                  "lagen": z.get("lagen") or [], "src": "Gebäudemodell" + (" (IFC)" if z.get("quelle") == "ifc" else ""), "uw": z.get("uw"),
                  **({"aufbau": {"v": z["vorlage"], "w": z.get("wahl") or [], **({"d": z["dicken"]} if z.get("dicken") else {}), **({"a": z["ausf"]} if z.get("ausf") else {})}} if z.get("vorlage") else {}),
                  **{k: z[k] for k in ("aussen", "einordnung") if k in z}})
    out = aus_kosten({"bauteile": Z}, 0, "")
    for b in out:
        b["quelle"] = "Gebäudemodell"
    return out


def aktuell(B, L):
    """Bauteile aus Kostenermittlungen, deren Zeile es im Gebäudemodell nicht mehr gibt, fallen weg (20.11.2026): die Ermittlung hält dann einen
    älteren Stand fest (z. B. den des Assistenten, inzwischen gilt ein eingelesener Plan) – sonst stünde die Hülle doppelt da, die alte ohne Bauteile
    im Plan. Ohne Bauteilliste (ältere Projekte) bleibt alles."""
    da = {str(z.get("id")) for z in (L or {}).get("zeilen") or [] if isinstance(z, dict) and not z.get("entfaellt")}
    return [b for b in B if _zeile(b["ref"]) in da] if da else B


KURZ = 80   # so lang speicherte der Wärmeschutz den Verweis früher höchstens


def _zeile(ref):
    """Zeile der Bauteilliste hinter einem Verweis „bk:<Ermittlung>:<Zeile>“ (Ermittlung 0 = direkt aus dem Gebäudemodell)."""
    t = str(ref or "").split(":", 2)
    return t[2] if len(t) == 3 and t[0] == "bk" else ""


def lagen_aus_aufbau(c, auf):
    """Gewählter Aufbau (Vorlage des Baukastens, Wahl je Schicht, eigene Dämmdicke) → Schichten [[Name, Dicke m, Baustoff, Gefach]] (18.11.2026:
    Wandaufbauten in den Wärmeschutz). Der Baustoff kommt fest aus bpcore/uwert.py (dieselbe Zuordnung wie die U-Werte der Bauteile)."""
    from . import uwert
    return uwert.lagen(c, auf)


def namen_aus_plan(A, P):
    """Schichten des gewählten Aufbaus A [[Name, Dicke m, Baustoff, …]] bekommen den Namen der Schicht im Plan P [[Allplan-Material, Dicke m]] (B1, 19.11.2026):
    gleiche Zahl → der Reihe nach (oder umgekehrt, je nachdem, was besser zur Dicke passt), sonst je Schicht nach der Dicke (±5 mm). Markiert mit „plan“ (3. Stelle)."""
    A = [list(x) for x in A or []]
    if not A or not P:
        return A
    def setz(i, n):
        A[i][0] = n
        while len(A[i]) < 3:
            A[i].append(None)
        A[i] = A[i][:2] + [A[i][2], *(A[i][3:4] or [None]), True]
    if len(A) == len(P):
        ab = lambda Q: sum(abs((a[1] or 0) - (q[1] or 0)) for a, q in zip(A, Q))   # noqa: E731
        Q = P if ab(P) <= ab(P[::-1]) else P[::-1]
        for i, q in enumerate(Q):
            setz(i, q[0])
        return A
    frei = list(P)
    for i, a in enumerate(A):
        q = next((q for q in frei if abs((q[1] or 0) - (a[1] or 0)) <= 0.005), None)
        if q:
            frei.remove(q)
            setz(i, q[0])
    return A


def sig(x):
    """Kurzer Stand des Aufbaus (Schichten und Dicken) – ändert er sich im Modell, bekommt der Wärmeschutz einen Hinweis."""
    import hashlib
    return hashlib.sha1(repr(x.get("lagen") or []).encode()).hexdigest()[:12] if x.get("lagen") else ""


def aus_assistent(m):
    """Was laut Planungsassistent zur Hülle gehören muss (rein) – ohne Fläche und Aufbau, nur als Vorschlag."""
    a = (m or {}).get("assistent") or {}
    if not a.get("type"):
        return []
    ch = a.get("choice") or {}
    m = re.match(r"^k:[a-z]{2}:([a-z.]*)", a["type"])   # Bauart in Ebenen: Maßnahme „nb“ = Neubau
    neubau = a["type"].startswith("neubau") or bool(m and "nb" in m.group(1).split(".")) or ch.get("massnahme") == "neu"
    V = []
    if ch.get("keller") and ch["keller"] != "none":
        V.append(("erdwand", "Kellerwand gegen Erdreich", "Keller laut Assistent – beheizt? Dann gehört die Kellerwand in den Nachweis."))
    if ch.get("dachform"):
        flach = ch["dachform"] == "flach"
        V.append(("flachdach" if flach else "steildach", "Flachdach" if flach else "Steildach" + (" (ausgebautes Dachgeschoss)" if a.get("dg") == "aus" else ""), "Dachform laut Assistent"))
    if neubau:
        V += [("wand", "Außenwand", "Neubau laut Assistent"), ("fenster", "Fenster", "Neubau laut Assistent"), ("bodenplatte", "Bodenplatte gegen Erdreich", "Neubau laut Assistent")]
    return [{"ref": f"as:{art}", "art": art, "kg": "", "name": name, "mat": "", "flaeche": None, "uw": None, "lagen": [], "herkunft": grund, "quelle": "Planungsassistent", "ifc": False, "vorschlag": True}
            for art, name, grund in V]


def huelle(c, pid):
    P = c.execute("SELECT id, name, data FROM bk_projects WHERE project_id=? AND archived=0 ORDER BY updated DESC", (pid,)).fetchall()
    B = []
    for p in P[:3]:
        B += aus_kosten(_j(p["data"], {}) or {}, p["id"], p["name"])
    m = modell.lesen(c, pid)["modell"]
    B = aktuell(B, m.get("bauteilliste"))
    B += aus_liste(m.get("bauteilliste"), {_zeile(b["ref"]) for b in B})   # was noch in keiner Kostenermittlung steht, kommt direkt aus dem Gebäudemodell
    for b in B:   # der im Modell/den Kosten gewählte Aufbau (Baukasten, Dämmdicke, Kürzel) liefert die Baustoffe, die Namen bleiben die aus dem Plan (B1)
        if b.get("aufbau"):
            b["lagen"], b["aus_aufbau"] = namen_aus_plan(lagen_aus_aufbau(c, b["aufbau"]), b["lagen"]), True
        b["sig"] = sig(b)
    da = {b["art"] for b in B}
    B += [v for v in aus_assistent(m) if v["art"] not in da]   # Vorschlag nur, wo keine Quelle das Bauteil schon liefert
    return {"bauteile": B, "quellen": [p["name"] for p in P[:3]] + (["Gebäudemodell"] if any(b["ref"].startswith("bk:0:") for b in B) else []) + (["Planungsassistent"] if (m.get("assistent") or {}).get("type") else [])}


def _zahl(v):
    return ("%.2f" % v).rstrip("0").rstrip(".").replace(".", ",")


def abgleich(vorhanden, bauteile):
    """vorhanden = Bauteile der App [{id, ref, typ, flaeche, name}] → Hinweise [{schluessel, art: neu|flaeche|vorschlag, titel, text, quelle, bauteil, da?}].
    Der Schlüssel enthält den Wert: Ändert sich die Quelle noch einmal, ist es ein neuer Hinweis – ein abgelehnter kommt sonst nicht wieder."""
    nach_ref = {str(b.get("ref")): b for b in vorhanden if b.get("ref")}
    nach_zeile = {_zeile(b.get("ref")): b for b in vorhanden if _zeile(b.get("ref"))}   # dieselbe Zeile: erst aus dem Gebäudemodell (bk:0:…), später aus den Kosten – oder umgekehrt
    arten = {b.get("typ") for b in vorhanden}
    H = []
    for x in bauteile:
        b = nach_ref.get(x["ref"]) or next((v for r, v in nach_ref.items() if len(r) == KURZ and x["ref"].startswith(r)), None)   # KURZ: bis 20.11.2026 abgeschnitten gespeichert
        if not b and _zeile(x["ref"]):
            v = nach_zeile.get(_zeile(x["ref"]))
            if v and (x["ref"].startswith("bk:0:") or str(v.get("ref")).startswith("bk:0:")):
                b = v
        if x.get("vorschlag"):
            if not b and x["art"] not in arten:
                H.append({"schluessel": x["ref"], "art": "vorschlag", "titel": f"Vorschlag: {x['name']} fehlt", "text": x["herkunft"] + " – Fläche und Aufbau sind noch nicht bekannt.",
                          "quelle": x["quelle"], "bauteil": x})
        elif not b:
            fl = f" {_zahl(x['flaeche'])} m²" if x["flaeche"] else ""
            auf = f" mit {len(x['lagen'])} Schichten" if x["lagen"] else (" mit U-Wert" if x["uw"] else "")
            H.append({"schluessel": f"{x['ref']}|neu|{x['flaeche']}", "art": "neu", "titel": f"Neu: {x['name']}{fl}{auf}",
                      "text": ("Die Art bitte wählen (z. B. Kellerdecke oder oberste Geschossdecke)." if not x["art"] else "Steht in den Quellen des Projekts, fehlt aber hier.")
                      + (" Schichten kommen aus dem Modell – Reihenfolge innen → außen bitte prüfen." if x["lagen"] else ""),
                      "quelle": x["quelle"] + (f" · KG {x['kg']}" if x["kg"] else "") + (f" · {x['herkunft']}" if x["herkunft"] else ""), "bauteil": x})
        elif x.get("sig") and ((b.get("sig") and b["sig"] != x["sig"]) or (x.get("aus_aufbau") and not b.get("sig") and not b.get("schichten"))):   # Aufbau im Modell geändert (z. B. „tausche AW KS WDVS in PP“, andere Dämmdicke)
            H.append({"schluessel": f"{x['ref']}|aufbau|{x['sig']}", "art": "aufbau", "da": b.get("id"),
                      "titel": f"{b.get('kurz') or b.get('name') or x['name']}: Aufbau geändert ({len(x['lagen'])} Schichten)",
                      "text": "Im Modell bzw. in den Kosten hat sich der Aufbau geändert: " + " · ".join(f"{n} {_zahl(d * 100)} cm" for n, d, *_ in x["lagen"][:6]) + ". Übernehmen ersetzt die Schichten (gelb = Baustoff bitte prüfen).",
                      "quelle": x["quelle"], "bauteil": x})
        elif x["flaeche"] is not None and abs((b.get("flaeche") or 0) - x["flaeche"]) >= 0.05:
            H.append({"schluessel": f"{x['ref']}|flaeche|{x['flaeche']}", "art": "flaeche", "da": b.get("id"),
                      "titel": f"{b.get('kurz') or b.get('name') or x['name']}: Fläche {_zahl(b.get('flaeche') or 0)} → {_zahl(x['flaeche'])} m²",
                      "text": "In der Quelle hat sich die Fläche geändert. Aufbau und U-Wert bleiben, nur die Fläche wird angeglichen.", "quelle": x["quelle"], "bauteil": x})
    return H


def hinweise_abgleichen(c, pid, app, soll, wer="", bereich=""):
    """Hinweise an der Linie der App auf den Stand „soll“ bringen: fehlende anlegen, überholte offene entfernen; abgelehnte und zurückgestellte
    bleiben entschieden. Linie getrennt oder eingefroren: keine Hinweise. bereich = Vorsatz der Schlüssel (z. B. „n12|“ für einen Nachweis):
    nur Hinweise dieses Bereichs werden angefasst. Rückgabe: die offenen Hinweise mit id, und die Linie."""
    linie = next(x for x in modell.links(c, pid) if x["app"] == app)
    if linie["zustand"] != "lebendig" or linie["richtung"] == "zum_modell":
        soll = []
    R = c.execute("SELECT id, status, daten FROM pm_hinweis WHERE project_id=? AND app=?", (pid, app)).fetchall()
    alt = {}
    for r in R:
        k = (_j(r["daten"], {}) or {}).get("schluessel")
        if k and k.startswith(bereich) and (k not in alt or RANG[r["status"]] > RANG[alt[k]["status"]]):   # offen vor abgelehnt/später vor übernommen
            alt[k] = r
    S = {bereich + h["schluessel"]: h for h in soll}
    for k, r in alt.items():
        if r["status"] == "offen" and k not in S:
            c.execute("DELETE FROM pm_hinweis WHERE id=?", (r["id"],))
    out = []
    for k, h in S.items():
        r = alt.get(k)
        if r and r["status"] in ("abgelehnt", "spaeter"):
            continue
        hid = r["id"] if r and r["status"] == "offen" else modell.hinweis_neu(c, pid, app, h["titel"], {"schluessel": k, **{x: h[x] for x in ("art", "text", "quelle")}}, "regel", wer)
        out.append(dict(h, id=hid))
    return out, linie


def zurueck(c, pid, von_app, an, titel, daten, wer=""):
    """Rückweg: Eine App meldet eine Festlegung ans Modell – als Hinweis an die Linien der Apps „an“. Geht nur, wenn die Linie der meldenden App
    lebt und nicht nur zur App zeigt. Gleicher Schlüssel, noch offen: kein zweiter Hinweis."""
    linie = next(x for x in modell.links(c, pid) if x["app"] == von_app)
    if linie["zustand"] != "lebendig" or linie["richtung"] == "zur_app":
        raise modell.Ungueltig("Die Linie zeigt nur vom Modell zur App – erst für beide Richtungen öffnen.")
    k = (daten or {}).get("schluessel")
    n = 0
    for app in an:
        R = c.execute("SELECT daten FROM pm_hinweis WHERE project_id=? AND app=? AND status='offen'", (pid, app)).fetchall()
        if k and any((_j(r["daten"], {}) or {}).get("schluessel") == k for r in R):
            continue
        modell.hinweis_neu(c, pid, app, titel, daten, "regel", wer); n += 1
    return n


__all__ = ["huelle", "abgleich", "hinweise_abgleichen", "zurueck", "aus_kosten", "aus_assistent", "art_von"]
