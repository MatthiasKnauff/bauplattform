"""PDFs der AVA lesen: Leistungsverzeichnisse, Angebote, Rechnungen und Aufmaße – mit Textebene oder als Scan.

Statt Zeile für Zeile wird ein Dokument in Positionsblöcke zerlegt:
- Spaltenköpfe (OZ/Pos · Text · Menge · Einheit · EP · GP, auch „Menge bisher/aktuell/gesamt“) geben die Spalten vor,
- ein Block beginnt mit einer Ordnungszahl in der OZ-Spalte und reicht bis zur nächsten,
- Menge, Einheit, Einheitspreis und Gesamtbetrag werden im ganzen Block gesucht (bei vielen AVA-Programmen stehen
  sie in der letzten Zeile des Langtexts, bei Firmenangeboten in der ersten, bei ausgefüllten LV-Formularen darüber),
- Kopf- und Fußzeilen, „Übertrag“, „Fortsetzung“ und wiederholte Seitenköpfe zählen nicht.
"""
import io
import re

EINHEITEN = (r"m2|m²|qm|m3|m³|cbm|m|lfm|lfdm|lm|st|stk|stck|stück|psch|pausch|pschl|pauschal|h|std|stunde|stunden|kg|t|to|wo|woche|"
             r"mt|mon|monat|tag|tage|l|ltr|liter|satz|stg|paar|pa|ve|pkt")
RX_EH = re.compile(r"^(?:" + EINHEITEN + r")\.?$", re.I)
RX_ZAHL = re.compile(r"^[-−]?(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d+)?$")
RX_ZAHL_PUNKT = re.compile(r"^\d+\.\d{1,3}$")          # 12.50 (Dezimalpunkt) – nur in Preis-/Mengenspalten
RX_OZ = re.compile(r"^(?:pos\.?)?(\d{1,4}(?:\.\d{1,4}){0,4})\.?$", re.I)
RX_DATUM = re.compile(r"^\d{1,2}\.\d{1,2}\.\d{2,4}$")
RX_KLEB = re.compile(r"^([-−]?\d[\d.,]*?)(" + EINHEITEN + r"|€)(\.?)$", re.I)     # „9m²“, „15Std.“, „4,80€“
RX_KLEB2 = re.compile(r"^(" + EINHEITEN + r")(\d[\d.,]*)$", re.I)                    # „m²12,5“ (selten)
SKIP = re.compile(r"^(übertrag|seite\b|fortsetzung|alle einzelbeträge|a l l e)", re.I)      # Zeile überspringen, Block geht weiter
STOP = re.compile(r"^(summe|zwischensumme|gesamtsumme|nettosumme|zusammenstellung|mehrwertsteuer|umsatzsteuer|mwst|"
                  r"netto|brutto|gesamtbetrag|angebotssumme|endbetrag|rechnungsbetrag)", re.I)   # Block ist zu Ende
RX_POSSUMME = re.compile(r"^summe\s+(?:pos(?:ition)?\.?\s*)?(\d[\d.]*)", re.I)    # Aufmaß: „Summe Pos. 01.0010  120,000 m2“
PLATZ = re.compile(r"^[._…\-–]{3,}$|^(ep|gp)[._…]{2,}.*$", re.I)        # „..........“, „EP.......“


def zahl(t):
    t = (t or "").strip().strip("‚‘’'`\"„“").rstrip("€").rstrip("%").strip().replace("−", "-")
    if len(t) > 2 and t[-1] in ".," and t[-2].isdigit():   # „85,000.“ (Texterkennung)
        t = t[:-1]
    if not t or not RX_ZAHL.match(t):
        return None
    try:
        return float(t.replace(".", "").replace(",", "."))
    except ValueError:
        return None


def ozn(t):
    return tuple(p.lstrip("0") or "0" for p in re.split(r"\D+", t or "") if p)


# ---------------------------------------------------------------- Wörter und Zeilen
_EH_OCR = [(re.compile(r"^(m|rn)[?*'’z²2]\.?$"), "m2"), (re.compile(r"^(m|rn)[3³]\.?$"), "m3"), (re.compile(r"^(\d[\d.,]*)(m|rn)[?*'’z²]$"), None)]


def _teilen(ws):
    """Zusammengeklebte Wörter trennen: „9m²“ → „9“ „m²“, „4,80€“ → „4,80“ „€“; Texterkennung: „m?“ → „m2“."""
    out = []
    for w in ws:
        t = w["text"]
        if w.get("conf") is not None:
            for rx, ersatz in _EH_OCR:
                m = rx.match(t)
                if m and ersatz:
                    t = ersatz
                elif m:
                    t = m.group(1) + "m2"
            if t.endswith(".") and RX_ZAHL.match(t[:-1]):   # „195.“
                t = t[:-1]
            w = {**w, "text": t}
        m = RX_KLEB.match(t)
        if m and zahl(m.group(1)) is not None:
            x0, x1 = float(w["x0"]), float(w["x1"])
            k = x0 + (x1 - x0) * len(m.group(1)) / max(1, len(t))
            out.append({**w, "text": m.group(1), "x1": k})
            out.append({**w, "text": m.group(2) + m.group(3), "x0": k})
            continue
        out.append(w)
    return out


_OCR_EINZELN = __import__("threading").BoundedSemaphore(1)   # je Arbeitsprozess höchstens eine Texterkennung zugleich – sonst steht der Server


def _tess(f, psm, timeout):
    """Eine Seite durch Tesseract. Immer nur eine zugleich (weitere warten) und mit einem Rechenkern (OMP_THREAD_LIMIT=1):
    Mehrere Texterkennungen nebeneinander haben den Server sonst so ausgelastet, dass keine Seite mehr lud."""
    import os
    import subprocess
    with _OCR_EINZELN:
        return subprocess.run(["tesseract", f, "stdout", "-l", "deu+eng", "--psm", psm, "tsv"], capture_output=True, text=True, timeout=timeout,
                              env=dict(os.environ, OMP_THREAD_LIMIT="1")).stdout


def _tsv(out, k, zl=True):
    ws = []
    for zeile in out.splitlines()[1:]:
        t = zeile.split("\t")
        if len(t) < 12 or t[0] != "5" or not t[11].strip():
            continue
        try:
            x, y, w, h, conf = int(t[6]), int(t[7]), int(t[8]), int(t[9]), float(t[10])
        except ValueError:
            continue
        tx = t[11].strip().strip("‚‘’'`\"„“|")
        if conf < 15 or not tx or (len(tx) <= 1 and not tx.isalnum()) or (conf < 45 and not re.search(r"[A-Za-zÄÖÜäöü0-9]{2}", tx)):
            continue   # Schmutz
        d = {"text": tx, "x0": x * k, "x1": (x + w) * k, "top": y * k, "bottom": (y + h) * k, "conf": conf}
        if zl:
            d["zl"] = (int(t[2]), int(t[3]), int(t[4]))   # Zeile laut Tesseract (auch bei schief eingelegtem Blatt)
        ws.append(d)
    return ws


def ocr_woerter(pg, dpi=300, timeout=90):
    """Wörter einer gescannten Seite per Tesseract (deutsch), in PDF-Koordinaten wie pdfplumber.extract_words.
    Zwei Durchgänge: als Textblock (Zeilen auch bei schiefem Blatt) und „verstreuter Text“ – der findet Mengenzeilen
    neben handschriftlich eingetragenen Preisen, die der erste auslässt; dessen Wörter kommen dazu, wo noch nichts steht."""
    import os
    import shutil
    import tempfile
    if not shutil.which("tesseract"):
        return []
    try:
        # Bildauflösung der Vorlage reicht – höher rechnen bringt nichts, kostet nur Zeit
        src = max((im.get("srcsize") or (0, 0))[0] / max(1.0, float(im["x1"]) - float(im["x0"])) * 72 for im in pg.images) if pg.images else 0
        dpi = int(min(dpi, max(200, src * 1.3))) if src else dpi
        from PIL import ImageOps
        bild = ImageOps.autocontrast(pg.to_image(resolution=dpi).original.convert("L"), cutoff=1)
        with tempfile.TemporaryDirectory() as td:
            f = os.path.join(td, "s.png")
            bild.save(f)
            k = 72.0 / dpi
            ws = _tsv(_tess(f, "6", timeout), k)
            dazu = _tsv(_tess(f, "11", timeout), k, zl=False)
    except Exception as e:
        try:
            from bpcore import fehler
            fehler.still("ava", "Texterkennung (tesseract) einer Seite", e)
        except Exception:
            pass
        return []
    def frei(w):
        cx, cy = (w["x0"] + w["x1"]) / 2, (w["top"] + w["bottom"]) / 2
        return not any(v["x0"] - 1 <= cx <= v["x1"] + 1 and v["top"] - 2 <= cy <= v["bottom"] + 2 for v in ws)
    zeilen_m = {}
    for v in ws:
        zeilen_m.setdefault(v["zl"], []).append((v["top"] + v["bottom"]) / 2)
    zm = {k_: sum(v) / len(v) for k_, v in zeilen_m.items()}
    neu = 0
    for w in dazu:
        if not frei(w):
            continue
        cy = (w["top"] + w["bottom"]) / 2
        h = w["bottom"] - w["top"]
        nah = min(zm.items(), key=lambda kv: abs(kv[1] - cy), default=None)
        if nah and abs(nah[1] - cy) <= max(2.5, h * 0.45):
            w["zl"] = nah[0]
        else:
            w["zl"] = (9999, round(cy / 4), 0)
            zm[w["zl"]] = cy
        ws.append(w)
        neu += 1
    return ws


def _muell(ws):
    """Textebene eines Scans, die nur Zeichensalat enthält (schlechte OCR des Kopierers)?"""
    if len(ws) < 30:
        return False
    gut = sum(1 for w in ws if re.fullmatch(r"[A-Za-zÄÖÜäöüß][a-zäöüß\-]{2,}[.,:;]?|\d[\d.,]*", w["text"]))
    return gut / len(ws) < 0.35


def seiten(data, max_seiten=80, ocr_seiten=40, zeit=None, fortschritt=None):
    """[(nr, breite, höhe, wörter, ocr)] – Wörter mit text, x0, x1, top, bottom (und fett)."""
    import time
    import pdfplumber
    out, t0 = [], time.time()
    with pdfplumber.open(io.BytesIO(data)) as pdf:
        N = pdf.pages[:max_seiten]
        for n, pg in enumerate(N, 1):
            try:
                ws = pg.extract_words(keep_blank_chars=False, use_text_flow=False, extra_attrs=["fontname", "size"])
            except Exception:
                ws = []
            ocr = False
            if (not ws or _muell(ws)) and n <= ocr_seiten and (zeit is None or time.time() - t0 < zeit):
                if fortschritt:
                    fortschritt(n, len(N))
                o = ocr_woerter(pg)
                if o:
                    ws, ocr = o, True
            for w in ws:
                w["fett"] = "bold" in str(w.get("fontname") or "").lower()
            out.append((n, float(pg.width), float(pg.height), _teilen(ws), ocr))
    return out


def zeilen(ws):
    if ws and all("zl" in w for w in ws):   # Scan: Zeilen wie Tesseract sie erkannt hat
        G = {}
        for w in ws:
            G.setdefault(w["zl"], []).append(w)
        Z = []
        for g in G.values():
            g.sort(key=lambda w: float(w["x0"]))
            Z.append({"m": sum((float(w["top"]) + float(w["bottom"])) / 2 for w in g) / len(g), "w": g})
        Z.sort(key=lambda z: z["m"])
        for z in Z:
            z["t"] = " ".join(w["text"] for w in z["w"])
            z["top"] = min(float(w["top"]) for w in z["w"])
            z["bottom"] = max(float(w["bottom"]) for w in z["w"])
        return Z
    ws = sorted(ws, key=lambda w: (float(w["top"]), float(w["x0"])))
    Z = []
    for w in ws:
        m = (float(w["top"]) + float(w["bottom"])) / 2
        h = float(w["bottom"]) - float(w["top"])
        if Z and abs(m - Z[-1]["m"]) <= max(2.5, h * 0.4):
            Z[-1]["w"].append(w)
        else:
            Z.append({"m": m, "w": [w]})
    for z in Z:
        z["w"].sort(key=lambda w: float(w["x0"]))
        z["t"] = " ".join(w["text"] for w in z["w"])
        z["top"] = min(float(w["top"]) for w in z["w"])
        z["bottom"] = max(float(w["bottom"]) for w in z["w"])
    return Z


# ---------------------------------------------------------------- Spaltenköpfe
_KOPF = [
    ("oz", r"^(oz|pos\.?|position|nr\.?|ordnungszahl|lfd\.?)$"),
    ("text", r"^(leistungsbeschreibung|beschreibung|bezeichnung|text|kurztext|leistung|leistungstext|artikel)$"),
    ("menge", r"^(menge|menge/|anzahl|mengen?)$"),
    ("eh", r"^(einh\.?|einheit|me|eh|mengeneinheit)$"),
    ("ep", r"^(ep|e-preis|einzelpreis|einheitspreis|preis|\(ep\)|ep/€|ep\s?€)$"),
    ("gp", r"^(gp|g-preis|gesamtpreis|gesamt|betrag|gesamtbetrag|\(gp\)|gp/€|summe)$"),
]


def kopf_finden(Z, W_):
    """Zeile mit Spaltenköpfen → {name: (x0, x1)}; Mengenspalten mit Zusatz (bisher/aktuell/gesamt) getrennt."""
    best = None
    for z in Z:
        # Wörter zu Phrasen (Abstand < 6 pt): „Menge bisher“, „Preis (EP)“, „Gesamt (GP)“
        P, akt = [], None
        for w in z["w"]:
            neu_kopf = re.match(r"^(menge|ep|gp|e-preis|g-preis|einh|einheit|me|eh|betrag|einzelpreis|einheitspreis|gesamtpreis|preis|pos|oz|nr|text|kurztext|leistung)", w["text"].lower())
            if akt and float(w["x0"]) - akt["x1"] < 6 and not neu_kopf:
                akt["t"] += " " + w["text"]; akt["x1"] = float(w["x1"])
            else:
                akt = {"t": w["text"], "x0": float(w["x0"]), "x1": float(w["x1"])}; P.append(akt)
        S = {}
        for p in P:
            tl = p["t"].lower().strip(":,.;")
            teile = tl.replace("/", " / ").split()
            name = None
            if "menge" in tl and re.search(r"bisher|vorher|vorige", tl):
                name = "menge_bis"
            elif "menge" in tl and re.search(r"aktuell|diese|neu\b|lfd", tl):
                name = "menge_akt"
            elif "menge" in tl and re.search(r"gesamt|kumul|bis heute", tl):
                name = "menge_ges"
            elif re.search(r"(betrag|gp|gesamt|summe).*(gesamt|kumul)|gesamtbetrag", tl) and len(S) >= 2:
                name = "gp"
            else:
                for nm, rx in _KOPF:
                    if any(re.match(rx, t) for t in teile) or re.match(rx, tl):
                        name = nm
                        if nm == "menge" and re.search(r"einh|me\b", tl):   # „Menge/ Einh.“ in einer Spalte
                            S.setdefault("eh", (p["x0"], p["x1"]))
                        break
            if name == "gp" and "gp" in S and re.search(r"gp|preis", tl) is None:
                continue
            if name and name not in S:
                S[name] = (p["x0"], p["x1"])
        zahl_sp = sum(1 for k in S if k.startswith("menge") or k in ("ep", "gp"))
        if zahl_sp >= 2 and ("text" in S or "oz" in S) and (not best or len(S) > len(best[1])):
            best = (z, S)
    return best


def _spalte(w, S):
    """Spalte eines Zahlworts: rechtsbündige Zahl unter dem rechten Rand des Kopfs, sonst der nächste Kopf."""
    if not S:
        return None
    x0, x1 = float(w["x0"]), float(w["x1"])
    c = (x0 + x1) / 2
    zx = min((v[0] for k, v in S.items() if k not in ("text", "oz")), default=0)
    if "text" in S and S["text"][0] < zx and x1 < zx - 12:
        return None   # steht im Text (links der ersten Zahlenspalte)
    best, bd = None, 1e9
    for k, (a, b) in S.items():
        if k in ("text", "oz"):
            continue
        d = min(abs(x1 - b), abs(c - (a + b) / 2), abs(x0 - a))
        if a - 40 <= c <= b + 40 and d < bd:
            best, bd = k, d
    return best if bd < 70 else None


# ---------------------------------------------------------------- Positionsblöcke
def _wiederholt(SZ):
    """Zeilen, die auf mehreren Seiten an derselben Stelle oben oder unten stehen (Seitenkopf/-fuß)."""
    from collections import Counter
    cnt = Counter()
    for _, H_, Z in SZ:
        for z in Z:
            if z["top"] < H_ * 0.16 or z["bottom"] > H_ * 0.9:
                cnt[_rep_key(z, H_)] += 1
    n = len(SZ)
    return {t for t, k in cnt.items() if n >= 2 and k >= max(2, n * 0.5)}


def _rep_key(z, H_):
    t = re.sub(r"(seite|blatt|s\.)\s*:?\s*\d+(\s*(von|/)\s*\d+)?", "seite #", z["t"].strip().lower())   # Seitenzahl darf sich ändern
    t = re.sub(r"übertrag\b.*", "übertrag", t)
    return (t, round(z["top"] / 12))


def bloecke(S, kopf_min=None):
    """S = seiten(...) → {"bloecke": [...], "kopf": Spalten, "ocr": bool}.
    Block: oz, seite, box (Seite, x0, y0, x1, y1 relativ), kurz, lang, menge, einheit, ep, gp, mengen{bis, akt, ges}, titel."""
    SZ = [(n, H_, zeilen(ws)) for n, W_, H_, ws, _ in S]
    rep = _wiederholt(SZ)
    spalten, oz_max, txt_x = None, None, None
    for n, W_, H_, ws, _ in S:
        K = kopf_finden(zeilen(ws), W_)
        if K:
            spalten = K[1]
            break
    if spalten:
        tx = spalten.get("text")
        zahl_x = min(v[0] for k, v in spalten.items() if k not in ("oz", "text"))
        if tx:
            txt_x = tx[0]
            oz_max = tx[0] - 3
        elif "oz" in spalten:
            oz_max = spalten["oz"][1] + 40
        if spalten.get("menge") and spalten["menge"][0] < (tx[0] if tx else 1e9):   # „Pos Menge Beschreibung“: Menge vor dem Text
            oz_max = spalten["menge"][0] - 2
    B, akt = [], None
    for (n, W_, H_, ws, ocr), (_, _, Z) in zip(S, SZ):
        om = oz_max if oz_max else W_ * 0.2
        k0 = next((k for k, z in enumerate(Z) if spalten and kopf_finden([z], W_)), None)
        if k0 is not None:
            Z = Z[k0 + 1:]
        elif spalten and n == 1:   # erste Seite ohne Spaltenkopf: Anschreiben – erst ab der ersten OZ mit Zahlen
            pass
        for z in Z:
            t = z["t"].strip()
            if not t:
                continue
            if _rep_key(z, H_) in rep:
                continue
            if spalten and kopf_finden([z], W_):
                continue
            if spalten and "oz" in spalten and len(z["w"]) > 1 and float(z["w"][0]["x1"]) < spalten["oz"][0] - 5:
                z = {**z, "w": [w for w in z["w"] if float(w["x1"]) >= spalten["oz"][0] - 5] or z["w"]}   # Randzeichen links
            w0 = z["w"][0]
            if w0.get("conf") is not None and re.fullmatch(r"\d{1,4}(?:,\d{1,4}){1,3}", w0["text"]) and float(w0["x0"]) <= om:
                w0 = {**w0, "text": w0["text"].replace(",", ".")}   # Texterkennung: „04,8“ = OZ 04.8
                z = {**z, "w": [w0] + z["w"][1:]}
            oz_r = (spalten["oz"][1] + 30) if spalten and "oz" in spalten else om
            m = RX_OZ.match(w0["text"]) if float(w0["x0"]) <= min(om, oz_r) else None
            start = bool(m) and not RX_DATUM.match(w0["text"]) and len(z["w"]) >= 1
            if start and m:
                oz = m.group(1)
                # einzelne Zahl ohne Punkt nur, wenn sie wie eine OZ aussieht (0001, 1, 12) und Text folgt
                if "." not in w0["text"] and (len(z["w"]) < 2 or zahl(z["w"][1]["text"]) is not None and len(z["w"]) < 3 and not RX_EH.match(z["w"][-1]["text"])):
                    start = len(oz) >= 3 and len(z["w"]) >= 2
                if float(w0["x0"]) > W_ * 0.35:
                    start = False
            if start:
                akt = {"oz": m.group(1), "seite": n, "W": W_, "H": H_, "zeilen": [], "ocr": ocr}
                B.append(akt)
            if akt is None:
                continue
            tt = t.lstrip("-–• ")
            if SKIP.match(tt):
                continue
            ms = RX_POSSUMME.match(tt)
            if ms and ozn(ms.group(1)) == ozn(akt["oz"]):   # Aufmaß: Summe der Position = Menge
                akt["summe"] = (n, W_, H_, z)
                akt["ende"] = True
                continue
            if STOP.match(tt):
                if akt["zeilen"]:
                    akt["ende"] = True
                continue
            if akt.get("ende"):
                continue
            akt["zeilen"].append((n, W_, H_, z))
    for b in B:
        _auswerten(b, spalten, txt_x)
    lens = sorted(len(b["oz"]) for b in B if b["menge"] is not None)
    if lens:   # „00 LV Trockenbau“ vor „0001“: kürzer als die OZ der Positionen, ohne Zahlen → Titel/Vorbemerkung
        for b in B:
            if b["menge"] is None and b["ep"] is None and b["gp"] is None and len(b["oz"]) < lens[len(lens) // 2] and "." not in b["oz"]:
                b["titel"] = True
    alle = [ozn(b["oz"]) for b in B]
    for b in B:   # Titel: OZ ist Anfang anderer OZ (01 → 01.0010) und keine Menge
        T = ozn(b["oz"])
        if b["menge"] is None and b["ep"] is None and any(len(a) > len(T) and a[:len(T)] == T for a in alle):
            b["titel"] = True
    # Zahlen am Zeilenanfang im Langtext („2020“, „100 mm“): OZ in anderer Form als die der Positionen mit Menge → weg
    form = lambda o: tuple(len(p) for p in re.split(r"\D+", o) if p)   # noqa: E731
    punkt = sum(1 for b in B if "." in b["oz"])
    if punkt >= 3 and punkt >= len(B) * 0.6:   # OZ mit Punkten üblich: lose Zahlen ohne Punkt und ohne Menge sind Text
        B = [b for b in B if b["titel"] or b["menge"] is not None or "." in b["oz"] or len(b["oz"]) <= 2]
    # gleiche OZ mehrfach (Seitenkopf „00 LV …“, Titel in der Zusammenstellung): die erste gilt, außer sie ist leer
    out, seen = [], {}
    for b in B:
        k = ozn(b["oz"])
        if k in seen:
            a = seen[k]
            if not a["titel"] and a.get("menge") is None and b.get("menge") is not None:
                out[out.index(a)] = b; seen[k] = b
            continue
        seen[k] = b
        out.append(b)
    return {"bloecke": out, "kopf": spalten}


def _auswerten(b, S, txt_x):
    if b.get("summe"):   # Aufmaß: Menge aus „Summe Pos. …“, Einheit dahinter oder in der Kopfzeile der Position
        n, W1, H1, z = b.pop("summe")
        ws = z["w"]
        v = [zahl(w["text"]) for w in ws if zahl(w["text"]) is not None and not ozn(w["text"]) == ozn(b["oz"])]
        e = [w["text"] for w in ws if RX_EH.match(w["text"])] or [w["text"] for zz in b["zeilen"][:1] for w in zz[3]["w"] if RX_EH.match(w["text"])]
        if v:
            b["aufmass"] = True
            b["_menge"], b["_eh"] = v[-1], (e[-1] if e else "")
    Z = b["zeilen"]
    W_ = b["W"]
    nums, ehs, texte, ep_pro = [], [], [], None
    for k, (n, _, H_, z) in enumerate(Z):
        ws = z["w"][1:] if k == 0 else z["w"]   # OZ selbst nicht
        # Zahlenteil am Zeilenende (Menge, Einheit, Preise, „€“, „/ pro qm“, Platzhalter) gehört nicht zum Text
        ende = len(ws)
        while ende > 0 and (zahl(ws[ende - 1]["text"]) is not None or RX_EH.match(ws[ende - 1]["text"]) or PLATZ.match(ws[ende - 1]["text"])
                            or ws[ende - 1]["text"] in ("€", "EUR", "/", "pro", "je", "EP", "GP", "N.E.P.", "x", "×")):
            ende -= 1
        tline = []
        for i, w in enumerate(ws):
            t = w["text"]
            v = zahl(t)
            sp = _spalte(w, S) if S else None
            im_ende = i >= ende
            if v is not None and (sp is not None or (not S and im_ende) or (not S and i + 1 < len(ws) and RX_EH.match(ws[i + 1]["text"]) and i + 1 >= ende)):
                nums.append({"v": v, "w": w, "sp": sp, "z": k, "i": i, "t": t})
                continue
            if RX_EH.match(t) and (im_ende or sp is not None):
                ehs.append({"t": t, "w": w, "z": k, "sp": sp})
                continue
            if PLATZ.match(t) or (im_ende and t in ("€", "EUR", "/", "pro", "je", "EP", "GP", "x", "×")):
                continue
            tline.append(w)
        # „78,00 € / pro qm“ (ausgefülltes Formular): Einheitspreis je Einheit
        m = re.search(r"(\d[\d.]*,\d{2})\s*€?\s*/\s*(?:pro|je)\s+(\S+)", z["t"])
        if m and zahl(m.group(1)) is not None:
            ep_pro = zahl(m.group(1))
        txt = " ".join(w["text"] for w in tline if not (txt_x and float(w["x0"]) < txt_x - 30 and k > 0)).strip()
        if txt:
            texte.append((k, txt, any(w.get("fett") for w in tline)))
    # Menge + Einheit: Zahl direkt vor einer Einheit (beste Stelle: Mengenspalte, eigene Zeile, erste Zeile hinter der OZ)
    menge = eh = None
    kand = []
    for e in ehs:
        for x in nums:
            if x["z"] == e["z"] and 0 <= float(e["w"]["x0"]) - float(x["w"]["x1"]) < 25:
                sc = 0
                if x["sp"] in ("menge", "menge_ges"):
                    sc += 4
                if x["sp"] in ("menge_bis", "menge_akt"):
                    sc += 1
                if x["z"] == 0:
                    sc += 2
                zt = Z[x["z"]][3]["t"]
                if len([w for w in Z[x["z"]][3]["w"] if zahl(w["text"]) is None and not RX_EH.match(w["text"]) and not PLATZ.match(w["text"]) and w["text"] not in ("€", "/", "EP", "GP")]) <= 1:
                    sc += 3   # Zeile nur aus Menge, Einheit, Preisen
                if txt_x and float(x["w"]["x0"]) < txt_x + 200 and x["sp"] is None and len(zt) > 40:
                    sc -= 3   # mitten im Langtext („Wandhöhe 2,47 m“)
                kand.append((sc, x["z"], x, e))
    if kand:
        kand.sort(key=lambda k: (-k[0], -k[1]))
        sc, _, x, e = kand[0]
        if sc >= 1 or len(kand) == 1:
            menge, eh = x["v"], e["t"].rstrip(".")
            x["menge"] = True
    if menge is None and S:   # Zahl in der Mengenspalte ohne Einheit dahinter – nur mit Einheit- oder Preisspalte im Block
        mm = [x for x in nums if x["sp"] in ("menge", "menge_ges")]
        if mm and (any(x["sp"] in ("ep", "gp") for x in nums) or any(e["sp"] == "eh" for e in ehs)):
            menge = mm[-1]["v"]; mm[-1]["menge"] = True
            e2 = [e for e in ehs if e["sp"] == "eh"]
            eh = e2[-1]["t"].rstrip(".") if e2 else None
    mengen = {}
    for k in ("menge_bis", "menge_akt", "menge_ges"):
        v = [x["v"] for x in nums if x["sp"] == k]
        if v:
            mengen[k[6:]] = v[-1]
    if "ges" in mengen:
        menge = mengen["ges"]
    elif "bis" in mengen and "akt" in mengen:
        menge = round(mengen["bis"] + mengen["akt"], 3)
    # Preise: aus den Spalten, sonst Menge × EP = GP im Block
    ep = gp = None
    if S:
        e_ = [x for x in nums if x["sp"] == "ep" and not x.get("menge")]
        g_ = [x for x in nums if x["sp"] == "gp" and not x.get("menge")]
        ep = e_[-1]["v"] if e_ else None
        gp = g_[-1]["v"] if g_ else None
    if ep_pro is not None:
        ep = ep_pro
        if gp is None:
            rest = [x["v"] for x in nums if not x.get("menge") and x["v"] != ep_pro]
            if menge is not None:
                gp = next((v for v in rest if abs(menge * ep - v) <= max(0.05, abs(v) * 0.002)), None)
    if menge is not None and (ep is None or gp is None or abs(menge * ep - gp) > max(0.05, abs(gp) * 0.002)):
        rest = [x["v"] for x in nums if not x.get("menge")]
        for i in range(len(rest)):   # EP und GP dahinter, die zur Menge passen
            for j in range(i + 1, len(rest)):
                if rest[i] and abs(menge * rest[i] - rest[j]) <= max(0.05, abs(rest[j]) * 0.002):
                    ep, gp = rest[i], rest[j]
                    break
            else:
                continue
            break
    if menge is None and len(nums) >= 3:   # ohne Einheit: Dreiergruppe a × b = c
        V = [x["v"] for x in nums]
        for c in range(len(V) - 1, 1, -1):
            for bb in range(c - 1, 0, -1):
                for a in range(bb - 1, -1, -1):
                    if V[c] and V[a] and V[bb] and abs(V[a] * V[bb] - V[c]) <= max(0.05, abs(V[c]) * 0.002):
                        menge, ep, gp = V[a], V[bb], V[c]
                        break
                else:
                    continue
                break
            else:
                continue
            break
    passt = lambda m_, e_, g_: abs(m_ * e_ - g_) <= max(0.05, abs(g_) * 0.002)   # noqa: E731
    ziffern = lambda v: re.sub(r"\D", "", f"{v:.3f}").strip("0")   # noqa: E731
    if menge is not None and gp and not (ep and passt(menge, ep, gp)):   # Texterkennung: Komma der Menge verloren („9375“ statt „9,375“)?
        for e_ in ([ep] if ep else []) + [x["v"] for x in nums if not x.get("menge") and x["v"] not in (gp, menge)]:
            if e_:
                m2 = round(gp / e_, 3)
                if passt(m2, e_, gp) and ziffern(m2) == ziffern(menge):
                    menge, ep = m2, e_
                    break
    if b.get("ocr") and (ep is not None or gp is not None) and not (menge and ep and gp and passt(menge, ep, gp)):
        b["unsicher"] = True   # Scan: Preise nur, wenn Menge × EP = GP aufgeht (handschriftliche Preise liest die Texterkennung falsch)
    if ep is None and gp is not None and menge:
        ep = round(gp / menge, 2)
    # Texte: erste Zeile = Kurztext (bei fettem Kurztext alle fetten Zeilen), Rest Langtext
    kurz, lang = "", []
    if texte:
        kurz = texte[0][1]
        rest = texte[1:]
        if texte[0][2]:
            while rest and rest[0][2] and len(kurz) < 120:
                kurz += " " + rest[0][1]; rest = rest[1:]
        lang = [t for _, t, _ in rest]
        if lang and lang[0].lower().startswith(kurz.lower()[:25]) and len(kurz) > 15:   # Kurztext im Langtext wiederholt
            pass
    if b.get("aufmass"):
        menge, eh, ep, gp = b.pop("_menge"), b.pop("_eh"), None, None
        lang = []
    b.update(kurz=kurz[:250], lang="\n".join(lang)[:8000], menge=menge, einheit=_eh(eh), ep=ep, gp=gp, mengen=mengen)
    b["titel"] = menge is None and ep is None and gp is None and len(texte) <= 3 and bool(kurz)
    # Stelle im Dokument (erste Seite des Blocks), bis zur Zeile mit den Zahlen
    b["boxen"] = {}
    for sn in sorted({zz[0] for zz in Z}):
        zs = [zz for zz in Z if zz[0] == sn]
        W1, H1 = zs[0][1], zs[0][2]
        b["boxen"][sn] = [round(min(float(w["x0"]) for zz in zs for w in zz[3]["w"]) / W1, 4), round(min(zz[3]["top"] for zz in zs) / H1, 4),
                          round(max(float(w["x1"]) for zz in zs for w in zz[3]["w"]) / W1, 4), round(max(zz[3]["bottom"] for zz in zs) / H1, 4)]
    z1 = [zz for zz in Z if zz[0] == b["seite"]] or Z
    if z1:
        n, W1, H1, _ = z1[0]
        ys = [zz[3] for zz in z1]
        b["box"] = [round(min(float(w["x0"]) for zz in ys for w in zz["w"]) / W1, 4), round(min(zz["top"] for zz in ys) / H1, 4),
                    round(max(float(w["x1"]) for zz in ys for w in zz["w"]) / W1, 4), round(max(zz["bottom"] for zz in ys) / H1, 4)]
    for k in ("zeilen", "W", "H"):
        b.pop(k, None)


def _rechts(w, W_, txt_x, S):
    """Zahl ohne Spaltenkopf: zählt nur rechts vom Fließtext (Mengen-/Preisspalte) oder in einer kurzen Zahlenzeile."""
    return float(w["x0"]) > W_ * 0.45 or not S


def _eh(t):
    if not t:
        return ""
    t = t.rstrip(".")
    return {"qm": "m2", "m²": "m2", "m³": "m3", "cbm": "m3", "stk": "St", "stck": "St", "stück": "St", "st": "St", "psch": "psch", "pausch": "psch",
            "pschl": "psch", "pauschal": "psch", "std": "h", "stunde": "h", "stunden": "h", "lfm": "m", "lfdm": "m", "lm": "m"}.get(t.lower(), t)


# ---------------------------------------------------------------- Zuordnung zu LV-Positionen
def zuordnen(B, items):
    """Blöcke den Positionen eines LV zuordnen: über die OZ (auch abweichend formatiert: 01.0010 ↔ 1.10 ↔ 0010),
    sonst über den Kurztext. → {pos_id: block}"""
    P = [x for x in items if x.get("typ") == "pos" and x.get("art") != "T"]
    voll = {}
    for x in P:
        voll.setdefault(ozn(x.get("oz")), []).append(x)
    out, frei = {}, []
    for b in B:
        if b["titel"]:
            continue
        T = ozn(b["oz"])
        x = None
        if T in voll and len(voll[T]) == 1:
            x = voll[T][0]
        else:
            kand = [y for y in P if ozn(y.get("oz")) and ((len(T) > len(ozn(y["oz"])) and T[-len(ozn(y["oz"])):] == ozn(y["oz"]))
                                                         or (len(T) < len(ozn(y["oz"])) and T == ozn(y["oz"])[-len(T):] and (len(T) >= 2 or int(T[0]) >= 10)))]
            if len(kand) == 1:
                x = kand[0]
            elif len(kand) > 1:
                x = _aehnlich(b, kand, 0.3)
        if x is None:
            frei.append(b)
            continue
        if x["id"] in out and out[x["id"]].get("menge") is not None:
            continue
        out[x["id"]] = b
    rest = [x for x in P if x["id"] not in out]
    for b in frei:   # ohne passende OZ: Kurztext ähnlich genug
        x = _aehnlich(b, rest, 0.6)
        if x:
            out[x["id"]] = b
            rest.remove(x)
    return out


def _woerter(t):
    return {w for w in re.findall(r"[a-zäöüß0-9]{3,}", (t or "").lower())}


def _aehnlich(b, P, grenze):
    a = _woerter(b["kurz"] + " " + b["lang"][:200])
    best, bs = None, 0
    for y in P:
        c = _woerter(y.get("kurz"))
        if not c:
            continue
        s = len(a & c) / len(c)
        if b.get("einheit") and y.get("einheit") and _eh(b["einheit"]).lower() == _eh(y["einheit"]).lower():
            s += 0.1
        if s > bs:
            best, bs = y, s
    return best if bs >= grenze else None
