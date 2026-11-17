"""Bauherrenportal – Karte und Vorschaubilder je Freigabe (entschieden am 17.11.2026, Entwurf „Bauherrenportal: Ansichten“).

Die Listen im Portal (Fotos als Raster nach Tagen, Pläne als Karten mit Vorschaubild, Bautagebuch als Zeitleiste, Informationen als Karten,
Rechnungen und Mängel mit Status-Schild) brauchen je Paket nur wenig: das steht in daten["karte"] – klein, damit die Übersicht schnell lädt.
Vorschaubilder rechnet der Kern beim Freigeben (das Portal rechnet nichts) und hängt sie als eigene Dateien an („vorschau-<n>.jpg“);
das große Bild bzw. das PDF holt das Portal erst beim Öffnen.

  karte(art, daten, anhang) → (daten mit „karte“, anhang neu)   – aufgerufen von bauherren.freigeben()
  karte = {text, wetter, index, massstab, status: {text, ton: ok|offen|faellig, frist}, bilder: [{v: Nr. Vorschau, g: Nr. groß, t: Titel}]}
"""
import base64, re

VOR = "vorschau-"
BREITE = 480        # Pixel – Vorschaubild (Raster am Handy zweispaltig, Karten bis 240 px bei doppelter Dichte)
FOTOS_MAX = 40      # je Freigabe „Fotos“
GROSS = 2400       # Pixel – Fotos groß im Portal
BILD = ("image/jpeg", "image/png", "image/webp")
TON = ("ok", "offen", "faellig")


def _t(v, n):
    return str(v if v is not None else "").strip()[:n]


def ist_vorschau(name):
    return str(name or "").startswith(VOR)


def _datauri(src):
    m = re.match(r"^data:(image/(?:jpeg|png|webp));base64,(.+)$", str(src or ""), re.S)
    if not m:
        return None
    try:
        return m.group(1), base64.b64decode(m.group(2), validate=False)
    except (ValueError, TypeError):
        return None


def _bild(data, mime, breite):
    from .bauherren_kopf import bild_aus
    try:
        return bild_aus(data, mime, breite)
    except Exception:   # noqa: BLE001 – ohne Vorschaubild zeigt das Portal ein Symbol
        return None


def _vorschau(data, mime):
    return _bild(data, mime, BREITE)


def karte(art, daten, anhang):
    d = dict(daten) if isinstance(daten, dict) else {}
    k = {}
    txt = _t(d.get("text"), 4000)
    if txt:
        k["text"] = txt if art == "info" else txt[:400]
    for f, n in (("wetter", 80), ("index", 20), ("massstab", 30), ("datum", 20)):
        v = _t(d.get(f), n)
        if v:
            k[f] = v
    st = d.get("status")
    if isinstance(st, dict) and _t(st.get("text"), 60):
        k["status"] = {"text": _t(st["text"], 60), "ton": st.get("ton") if st.get("ton") in TON else "offen", **({"frist": _t(st["frist"], 10)} if st.get("frist") else {})}
    neu = None if anhang is None else [x for x in anhang if not ist_vorschau(x[0])]
    bilder = [x for x in (d.pop("bilder", None) or []) if isinstance(x, dict)][:FOTOS_MAX]
    gross = []   # (Nr. groß, Titel)
    for i, b in enumerate(bilder):   # Fotos als data:-Adresse (z. B. Tagesbericht) → eigene Dateien
        x = _datauri(b.get("src"))
        if not x:
            continue
        neu = neu if neu is not None else []
        neu.append((f"Foto {i + 1}.{x[0].split('/')[1].replace('jpeg', 'jpg')}", x[0], x[1]))
        gross.append((len(neu) - 1, _t(b.get("titel"), 200)))
    if neu is not None:
        for i, (n, m, data) in enumerate(neu):   # Fotos: HEIC & Co. → JPEG, große Bilder auf GROSS Pixel (das Portal muss keine 12-MB-Fotos ausliefern)
            if m.startswith("image/") and (m not in BILD or len(data) > 1_500_000):
                j = _bild(data, m, GROSS)
                if j:
                    neu[i] = (n.rsplit(".", 1)[0] + ".jpg", "image/jpeg", j)
        fotos = [(i, n.rsplit(".", 1)[0]) for i, (n, m, _) in enumerate(neu) if m in BILD]
        if art == "foto":
            gross = fotos[:FOTOS_MAX]
        elif art == "tagesbericht":   # Zeitleiste: bis zu 3 Fotos (kein Vorschaubild vom PDF)
            gross = (gross or fotos)[:3]
        elif not gross:   # Plan, Rechnung, Mangel, Information: das erste PDF/Bild als Karte
            gross = [(i, "") for i, (n, m, _) in enumerate(neu) if m in BILD or m == "application/pdf"][:1]
        B = []
        for g, titel in gross:
            v = _vorschau(neu[g][2], neu[g][1])
            if v:
                neu.append((f"{VOR}{g}.jpg", "image/jpeg", v))
                B.append({"v": len(neu) - 1, "g": g, **({"t": titel} if titel else {})})
        if B:
            k["bilder"] = B
    d["karte"] = k
    return d, neu
