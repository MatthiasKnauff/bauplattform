"""Excel-Kostenberechnung einlesen (GO 23.11.2026, Mock „Excel-Kostenberechnung“: XL-0 … XL-8 alle A).

Die alte Liste der Kollegen (DIN 276-1:2008-12, je Kostengruppe der 3. Ebene ein Nettobetrag, oft als „=1296+12568,5+…“) wird nur
gelesen, nie gespeichert. Ergebnis: Zeilen je Einzelbetrag mit der Kostengruppe nach DIN 276:2018-12 (umgesetzt, „war …“), dazu die
Befunde: Rechenfehler der Liste, Gefahr doppelter Summen, fragliche Zuordnung (mit Vorschlag), übliche Lücken, Werte aus fremden Dateien.

    lesen(name, roh) → {datei, fassung, zeilen: [{id, kg, kg_alt, name, name_alt, betrag, nr, extern}], befunde: [...], summe}
    sauber(x)        → dasselbe, aus dem Browser zurück (beim Übernehmen) – nur bekannte Felder, Zahlen geprüft
Gespeichert wird im Kostenstand unter data["excel"] (baukosten.clean_data), gerechnet wie Zeilen von Hand (calc).
"""
import io
import re

from bpcore import xls

# DIN 276-1:2008-12 → DIN 276:2018-12 (3. Ebene; nur, was sich geändert hat). Quelle: Gliederung der beiden Ausgaben; 700er nach Inhalt
# zugeordnet (Objektplanung/Fachplanung/Allgemeine Baunebenkosten 2018), Finanzierung 760 → KG 800. Jede Umsetzung wird gemeldet.
UM = {
    "324": "322", "325": "324", "326": "325", "327": "326",                       # Gründung: Unterböden/Bodenplatten, Beläge, Abdichtung, Dränagen
    "352": "353", "353": "354",                                                   # Decken: 352 ist jetzt „Deckenöffnungen“
    "370": "380", "371": "381", "372": "382", "379": "389",                       # Baukonstruktive Einbauten (370 ist jetzt Infrastruktur)
    "474": "473", "475": "474", "476": "472", "477": "475", "478": "476",          # Nutzungsspezifische Anlagen
    "484": "481", "483": "481",                                                   # Gebäudeautomation
    "510": "510", "511": "511", "512": "511",                                     # Geländeflächen → Erdbau
    "520": "530", "521": "531", "522": "532", "523": "533", "524": "534", "525": "535", "526": "536", "527": "539", "529": "539",
    "530": "540", "531": "541", "532": "542", "533": "543", "534": "544", "535": "545", "536": "546", "537": "549", "538": "548", "539": "549",
    "540": "550", "541": "551", "542": "552", "543": "559", "544": "559", "545": "559", "546": "554", "547": "559", "548": "559", "549": "559",
    "550": "560", "551": "561", "552": "562", "559": "569",
    "560": "580", "561": "589", "562": "589", "569": "589",
    "571": "571", "572": "571", "573": "572", "574": "573", "575": "574", "576": "573",
    "611": "610", "612": "620", "619": "690", "620": "640", "621": "640", "622": "640", "623": "640", "629": "640",
    "733": "731", "734": "733", "735": "741", "736": "742",
    "740": "740", "741": "743", "742": "743", "743": "744", "744": "745", "745": "746", "746": "747", "747": "714", "748": "748", "749": "761",
    "760": "800", "761": "810", "762": "820", "763": "830", "769": "890",
    "770": "760", "771": "762", "772": "763", "773": "764", "774": "765", "775": "766", "779": "769",
}
# Lücken, die bei einem Gebäude fast immer Kosten haben (2018er Kennzahl, Text)
LUECKEN = (("391", "Baustelleneinrichtung"), ("743", "Bauphysik (Wärmeschutznachweis)"), ("744", "Geotechnik (Baugrundgutachten)"),
           ("745", "Vermessung / Einmessung"))
ZAHL = re.compile(r"^=?\+?\s*[-+]?\d+(?:[.,]\d+)?(?:\s*[-+]\s*\d+(?:[.,]\d+)?)*\s*$")


def _raster(name, roh):
    """Datei → {(zeile, spalte): (wert, formel)} des ersten Blatts."""
    n = (name or "").lower()
    if n.endswith(".xls") or roh[:8] == b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1":
        return xls.zellen(roh)
    if not (n.endswith((".xlsx", ".xlsm")) or roh[:2] == b"PK"):
        raise ValueError("Bitte die Excel-Datei der Kostenberechnung wählen (.xls oder .xlsx).")
    import openpyxl
    try:
        f = openpyxl.load_workbook(io.BytesIO(roh)).worksheets[0]
        w = openpyxl.load_workbook(io.BytesIO(roh), data_only=True).worksheets[0]
    except Exception as e:   # beschädigte oder geschützte Datei: Meldung an die Person, kein Absturz
        raise ValueError("Die Excel-Datei ließ sich nicht öffnen – ist sie geschützt oder beschädigt?") from e
    Z = {}
    for row in f.iter_rows():
        for c in row:
            if c.value is None:
                continue
            fo = c.value if isinstance(c.value, str) and c.value.startswith("=") else None
            Z[(c.row, c.column)] = (w.cell(c.row, c.column).value if fo else c.value, fo)
    return Z


def _zahl(v):
    if isinstance(v, bool) or v is None:
        return None
    if isinstance(v, (int, float)):
        return float(v)
    try:
        return float(str(v).replace(".", "").replace(",", ".")) if re.fullmatch(r"-?[\d.]+(,\d+)?", str(v).strip()) else None
    except ValueError:
        return None


def _teile(formel):
    """„=1296+12568.5+1200“ → [1296, 12568.5, 1200]; nur Zahlen mit + und – (sonst None)."""
    if not formel or not ZAHL.match(formel):
        return None
    s = formel.lstrip("=").replace(" ", "").replace(",", ".")
    return [float(x) for x in re.findall(r"[-+]?\d+(?:\.\d+)?", s if s[:1] in "+-" else "+" + s)]


def _kg(v):
    s = str(int(v)) if isinstance(v, float) and v == int(v) else str(v or "").strip()
    return s if re.fullmatch(r"[1-8]\d\d", s) else ""


def lesen(name, roh):
    Z = _raster(name, roh)
    mx = max((r for r, _ in Z), default=0)
    # Spalte „netto“: Überschrift mit „netto“ in der Zeile mit „Nr.“ (in der Liste Spalte E); sonst die letzte Zahlenspalte
    sp_netto = next((c for (r, c), (v, _) in sorted(Z.items()) if isinstance(v, str) and "netto" in v.lower()), 5)
    zeilen, befunde, kg_zeile, nr = [], [], {}, 0
    summen = []   # Bereiche der SUM-Formeln (Spalte, von, bis)
    for (r, c), (v, f) in Z.items():
        for m in re.finditer(r"SUM\(\$?([A-Z]+)\$?(\d+):\$?[A-Z]+\$?(\d+)\)", f or ""):
            summen.append((m.group(1), int(m.group(2)), int(m.group(3))))
    sp_brutto = next((c for (r, c), (v, f) in sorted(Z.items()) if f and re.fullmatch(r"=\$?E\$?\d+\*1[.,]19", f)), 3)
    for r in range(1, mx + 1):
        kg = _kg(Z.get((r, 1), (None, None))[0])
        if not kg:
            continue
        nm = str(Z.get((r, 2), ("", None))[0] or "").strip()
        v, f = Z.get((r, sp_netto), (None, None))
        kg_zeile[kg] = r
        bf = Z.get((r, sp_brutto), (None, None))[1]
        if kg[2] != "0" and kg[0] in "1234567" and not bf and not f and _zahl(v) is None:
            befunde.append({"art": "rechenfehler", "kg": kg, "text": f"{kg} {nm}: keine Formel – ein Betrag hier fehlt in der Summe der Liste"})
        m = re.fullmatch(r"=\$?E\$?(\d+)\*1[.,]19", bf or "")
        if m and int(m.group(1)) != r:
            befunde.append({"art": "rechenfehler", "kg": kg, "text": f"{kg} {nm}: die Formel zeigt auf Zeile {m.group(1)} statt {r} – der Betrag zählt dort nie"})
        betrag = _zahl(v)
        if betrag is None and _teile(f):   # Formel aus reinen Zahlen ohne gespeichertes Ergebnis (Datei nicht von Excel gespeichert): selbst rechnen
            betrag = sum(_teile(f))
        if not betrag:
            continue
        teile, extern = _teile(f), bool(f and ("[" in f or "!" in f))
        neu = UM.get(kg, kg)
        for k, b in enumerate(teile if teile and len(teile) > 1 else [betrag]):
            nr += 1
            zeilen.append({"id": f"xl:{nr}", "kg": neu, "kg_alt": kg, "name_alt": nm, "name": f"Betrag {k + 1}" if teile and len(teile) > 1 else nm,
                           "betrag": round(b, 2), "nr": k + 1, "extern": extern})
        if extern:
            befunde.append({"art": "ohne_aufteilung", "kg": neu, "text": f"{kg} {nm}: der Betrag ({_eur(betrag)}) kommt aus einer anderen Datei, die nicht dabei war – nur die Summe wird übernommen"})
        if neu != kg:
            befunde.append({"art": "umgesetzt", "kg": neu, "text": f"{kg} „{nm}“ → {neu} (DIN 276:2018)"})
    # Summenbereiche: Kostengruppen mit Betrag, die in keiner Summe der Liste stehen
    sp_b = xls.spalte(sp_brutto)
    bereiche = [(a, b) for c_, a, b in summen if c_ == sp_b]
    if bereiche:
        for kg, r in kg_zeile.items():
            if kg[2] != "0" and not any(a <= r <= b for a, b in bereiche):
                befunde.append({"art": "rechenfehler", "kg": UM.get(kg, kg), "text": f"{kg}: steht in keiner Summe der Liste – ein Betrag hier fehlt im Ergebnis"})
    # Überschriften (x10) mit eigener Formel über Zeilen mit Kostengruppen: Gefahr doppelt zu zählen
    for kg, r in kg_zeile.items():
        if kg[2] == "0" and kg[1] != "0" and Z.get((r, sp_brutto), (None, None))[1] and any(k[:2] == kg[:2] and k != kg for k in kg_zeile):
            befunde.append({"art": "gefahr", "kg": UM.get(kg, kg), "text": f"{kg}: die Überschrift rechnet selbst mit – ein Betrag hier und darunter zählte doppelt"})
    summe = round(sum(z["betrag"] for z in zeilen), 2)
    hat = {z["kg"] for z in zeilen}
    s441 = sum(z["betrag"] for z in zeilen if z["kg"] == "441")
    if s441:
        befunde.append({"art": "pruefen", "kg": "441", "nach": "444", "text": f"441 Hoch- und Mittelspannungsanlagen ({_eur(s441)}) – bei Wohn- und kleinen Gebäuden ist das meist 444 Niederspannungsinstallation"})
    s429 = sum(z["betrag"] for z in zeilen if z["kg"] == "429")
    if s429 and not hat & {"421", "422", "423"}:
        befunde.append({"art": "pruefen", "kg": "429", "text": f"429 Wärmeversorgung, sonstiges ({_eur(s429)}) – üblich ist die Aufteilung auf 421 Wärmeerzeugung, 422 Verteilung, 423 Heizflächen"})
    if any(z["kg"][0] in "34" for z in zeilen):
        for k, t in LUECKEN:
            if k not in hat:
                befunde.append({"art": "luecke", "kg": k, "text": f"{k} {t}: 0 € – beim Bauen meist nötig"})
    return {"datei": str(name or "")[:200], "fassung": "2008", "zeilen": zeilen, "befunde": befunde, "summe": summe,
            "liste": sorted({UM.get(k, k) for k in kg_zeile})}   # Kostengruppen, die in der Liste stehen – was 2018 fehlt, heißt „ergänzt“


def _eur(v):
    return f"{v:,.2f} €".replace(",", "X").replace(".", ",").replace("X", ".")


ARTEN = ("rechenfehler", "gefahr", "pruefen", "luecke", "ohne_aufteilung", "umgesetzt", "ergaenzt")


def sauber(x):
    """Stand aus dem Browser (Vorschau, ggf. mit übernommenem Vorschlag) → nur bekannte Felder."""
    x = x if isinstance(x, dict) else {}
    s = lambda v, n: str(v if v is not None else "").strip()[:n]   # noqa: E731
    Z = []
    for i, z in enumerate((x.get("zeilen") if isinstance(x.get("zeilen"), list) else [])[:3000]):
        if not isinstance(z, dict) or not re.fullmatch(r"[1-8]\d\d", str(z.get("kg") or "")):
            continue
        try:
            b = round(float(z.get("betrag") or 0), 2)
        except (TypeError, ValueError):
            continue
        Z.append({"id": f"xl:{i + 1}", "kg": z["kg"], "kg_alt": s(z.get("kg_alt"), 3), "name": s(z.get("name"), 200) or "Betrag", "name_alt": s(z.get("name_alt"), 200),
                  "betrag": max(-1e9, min(1e9, b)), "nr": int(z.get("nr") or 1) if str(z.get("nr") or "1").isdigit() else 1, "extern": bool(z.get("extern"))})
    B = [{"art": b["art"], "kg": s(b.get("kg"), 3), "text": s(b.get("text"), 300), **({"nach": s(b["nach"], 3)} if b.get("nach") else {})}
         for b in (x.get("befunde") if isinstance(x.get("befunde"), list) else [])[:200] if isinstance(b, dict) and b.get("art") in ARTEN]
    L = sorted({k for k in (x.get("liste") if isinstance(x.get("liste"), list) else []) if re.fullmatch(r"[1-8]\d\d", str(k))})
    return {"datei": s(x.get("datei"), 200), "fassung": "2008", "am": s(x.get("am"), 20), "von": s(x.get("von"), 80), "gelesen": bool(x.get("gelesen")),
            "zeilen": Z, "befunde": B, "liste": L}
