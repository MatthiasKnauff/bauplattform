"""Abzüge als Rechenleiter (besprochen am 14.11.2026, Mock „Abzüge netto/brutto“, Variante B): erst die Abzüge netto (vor der
Umsatzsteuer), dann die Umsatzsteuer, dann die Abzüge brutto – so rechnet die VOB/B. Reihenfolge je Seite sortierbar, jede Zeile an/aus,
eigene Zeilen netto oder brutto. Ein Eintrag je Sache: die festen Bausteine schreiben in die Felder, mit denen schon gerechnet wird
(Nachlass, Skonto, Sicherheiten, Vertragsstrafe des Auftrags); nur Reihenfolge, eigene Zeilen und Bauabzugsteuer stehen in vergabe.leiter.

Rechnen (ava.rechne): netto-Zeilen in % vom Leistungsstand nach Nachlass (bzw. €), Sicherheiten und bisherige Zahlungen wie bisher
(brutto gerechnet = netto × 1,19, daher derselbe Zahlbetrag), danach ohne Umsatzsteuer: Vertragsstrafe (nur Schlussrechnung, Betrag von
Hand – die Plattform schlägt ihn aus den Verzugstagen vor), eigene brutto-Zeilen (% vom Zahlbetrag brutto, € nur in der Schlussrechnung)
und Bauabzugsteuer (15 % des Zahlbetrags, § 48 EStG – nicht, solange die Freistellungsbescheinigung gilt).
"""
from datetime import date, timedelta
import re
import secrets

NETTO, BRUTTO = "netto", "brutto"
FEST = {   # Schlüssel → (Seite, Name)
    "nachlass": (NETTO, "Nachlass"),
    "ve": (BRUTTO, "Sicherheit Vertragserfüllung"),
    "ma": (BRUTTO, "Sicherheit Mängelansprüche"),
    "vorher": (BRUTTO, "bisherige Zahlungen"),
    "strafe": (BRUTTO, "Vertragsstrafe"),
    "bauabzug": (BRUTTO, "Bauabzugsteuer (§ 48 EStG)"),
}
STANDARD = ["nachlass", "ve", "ma", "vorher", "strafe", "bauabzug"]
AN_KEY = {"nachlass": "nachlass", "ve": "einbehalt", "ma": "ma", "vorher": "vorher", "strafe": "strafe", "bauabzug": "bauabzug"}   # Schlüssel in vergabe.abzug / rechnung.abzug
BAUABZUG_PCT = 15.0


def _f(v, d=0.0):
    try:
        return float(str(v).replace(",", ".")) if v not in (None, "") else d
    except (TypeError, ValueError):
        return d


def _s(v, n):
    return str(v or "").strip()[:n]


def eigene(V):
    return [z for z in ((V.get("leiter") or {}).get("eigen") or []) if isinstance(z, dict) and z.get("id")]


def an_auftrag(V, key):
    """Gilt die Zeile laut Auftrag? (vergabe.abzug; ohne Angabe: an – Bauabzugsteuer nur, wenn eingeschaltet)."""
    A = V.get("abzug") or {}
    k = AN_KEY.get(key, key)
    if key == "bauabzug":
        return bool(A.get(k, False))
    if key == "ma" and k not in A:
        return bool(A.get("einbehalt", True))
    return bool(A.get(k, True))


def an_rechnung(V, rd, key):
    """Gilt die Zeile in dieser Rechnung? (rechnung.abzug vor vergabe.abzug)."""
    R = (rd or {}).get("abzug") or {}
    k = AN_KEY.get(key, key)
    if isinstance(R.get(k), bool):
        return R[k]
    if key == "ma" and isinstance(R.get("einbehalt"), bool) and "ma" not in R:
        return R["einbehalt"]
    return an_auftrag(V, key)


def alle_keys(V):
    return STANDARD + ["skonto"] + ["e:" + z["id"] for z in eigene(V)]


def reihe(V):
    """Reihenfolge je Seite: gespeichert, dazu fehlende feste Bausteine und eigene Zeilen hinten an."""
    E = {"e:" + z["id"]: z for z in eigene(V)}
    gesp = [k for k in ((V.get("leiter") or {}).get("reihe") or []) if k in FEST or k in E]
    for k in STANDARD + list(E):
        if k not in gesp:
            gesp.append(k)
    seite = lambda k: FEST[k][0] if k in FEST else (E[k].get("seite") if E[k].get("seite") in (NETTO, BRUTTO) else NETTO)   # noqa: E731
    return [k for k in gesp if seite(k) == NETTO], [k for k in gesp if seite(k) == BRUTTO]


def zeilen(V):
    """Die Leiter des Auftrags zum Anzeigen und Bearbeiten (LV- & Auftragsdaten, Rechnungskarte)."""
    S = V.get("sicherheit") or {}
    A = V.get("auftrag") or {}
    L = V.get("leiter") or {}
    E = {"e:" + z["id"]: z for z in eigene(V)}

    def zeile(k):
        if k in E:
            z = E[k]
            return {"k": k, "name": z.get("name") or "Abzug", "seite": z.get("seite") or NETTO, "typ": z.get("typ") or "pct", "wert": _f(z.get("wert")), "an": z.get("an", True) is not False, "eigen": True}
        x = {"k": k, "name": FEST[k][1], "seite": FEST[k][0], "an": an_auftrag(V, k), "eigen": False}
        if k == "nachlass":
            x.update(pct=_f(V.get("nachlass")), eur=_f(V.get("nachlass_eur")))
        elif k == "ve":
            x.update(pct=_f(V.get("einbehalt"), 5.0), form=(S.get("ve") or {}).get("form") or "einbehalt")
        elif k == "ma":
            ma = S.get("ma") or {}
            x.update(pct=_f(ma.get("pct"), _f(V.get("einbehalt"), 5.0)) if ma.get("pct") is not None else None, form=ma.get("form") or "einbehalt", jahre=int(_f(S.get("gw_jahre"), 4)))
        elif k == "strafe":
            x.update(pct=_f(A.get("vertragsstrafe")), max=_f(A.get("vertragsstrafe_max")), art=A.get("vertragsstrafe_art") if A.get("vertragsstrafe_art") in TAGART else "wt")
        elif k == "bauabzug":
            x.update(pct=BAUABZUG_PCT, frei_bis=(L.get("bauabzug") or {}).get("frei_bis") or "")
        return x
    n, b = reihe(V)
    return {"netto": [zeile(k) for k in n], "brutto": [zeile(k) for k in b],
            "skonto": {"pct": _f(V.get("skonto")), "tage": int(_f(V.get("skonto_tage"))), "art": V.get("skonto_art") or "kt", "an": an_auftrag(V, "skonto")}}


def setzen(V, b, sicherheit_clean):
    """Änderungen aus der Leiter in die Felder des Auftrags übernehmen (vergabe). b: {reihe, eigen, an: {k: bool}, werte: {k: {...}}}."""
    L = dict(V.get("leiter") or {})
    if isinstance(b.get("eigen"), list):
        neu = []
        for z in b["eigen"][:30]:
            if not isinstance(z, dict):
                continue
            i = z.get("id") if isinstance(z.get("id"), str) and re.fullmatch(r"[a-z0-9]{4,12}", z.get("id") or "") else secrets.token_hex(3)
            neu.append({"id": i, "name": _s(z.get("name"), 120) or "Abzug", "seite": z.get("seite") if z.get("seite") in (NETTO, BRUTTO) else NETTO,
                        "typ": "eur" if z.get("typ") == "eur" else "pct", "wert": round(_f(z.get("wert")), 4), "an": z.get("an") is not False})
        L["eigen"] = neu
    if isinstance(b.get("reihe"), list):
        L["reihe"] = [k for k in b["reihe"][:60] if isinstance(k, str) and (k in FEST or k.startswith("e:"))]
    W = b.get("werte") if isinstance(b.get("werte"), dict) else {}
    if isinstance(W.get("bauabzug"), dict) and "frei_bis" in W["bauabzug"]:
        L["bauabzug"] = {"frei_bis": _s(W["bauabzug"]["frei_bis"], 10)}
    V["leiter"] = L
    if isinstance(b.get("an"), dict):
        A = dict(V.get("abzug") or {})
        for k, v in b["an"].items():
            if k in AN_KEY and isinstance(v, bool):
                A[AN_KEY[k]] = v
            elif k == "skonto" and isinstance(v, bool):
                A["skonto"] = v
        V["abzug"] = A
    if isinstance(W.get("nachlass"), dict):
        if "pct" in W["nachlass"]:
            V["nachlass"] = round(min(max(_f(W["nachlass"]["pct"]), 0), 100), 3)
        if "eur" in W["nachlass"]:
            V["nachlass_eur"] = round(max(_f(W["nachlass"]["eur"]), 0), 2)
    if isinstance(W.get("skonto"), dict):
        if "pct" in W["skonto"]:
            V["skonto"] = round(min(max(_f(W["skonto"]["pct"]), 0), 100), 3)
        if "tage" in W["skonto"]:
            V["skonto_tage"] = int(min(max(_f(W["skonto"]["tage"]), 0), 365))
        if W["skonto"].get("art") in ("kt", "wt", "at", "wo"):
            V["skonto_art"] = W["skonto"]["art"]
    si = {}
    if isinstance(W.get("ve"), dict):
        if "pct" in W["ve"]:
            V["einbehalt"] = round(min(max(_f(W["ve"]["pct"], 5.0), 0), 100), 3)
        if W["ve"].get("form") in ("einbehalt", "buergschaft"):
            si["ve"] = {"form": W["ve"]["form"]}
    if isinstance(W.get("ma"), dict):
        x = {}
        if W["ma"].get("form") in ("einbehalt", "buergschaft"):
            x["form"] = W["ma"]["form"]
        if "pct" in W["ma"]:
            x["pct"] = None if W["ma"]["pct"] in (None, "") else round(min(max(_f(W["ma"]["pct"]), 0), 100), 3)
        if x:
            si["ma"] = x
        if "jahre" in W["ma"]:
            si["gw_jahre"] = W["ma"]["jahre"]
    if si:
        V["sicherheit"] = sicherheit_clean(si, V.get("sicherheit"))
    if isinstance(W.get("strafe"), dict) and V.get("bieter"):
        A = dict(V.get("auftrag") or {})
        if "pct" in W["strafe"]:
            A["vertragsstrafe"] = round(max(_f(W["strafe"]["pct"]), 0), 3) if W["strafe"]["pct"] not in (None, "") else None
        if "max" in W["strafe"]:
            A["vertragsstrafe_max"] = round(max(_f(W["strafe"]["max"]), 0), 3) if W["strafe"]["max"] not in (None, "") else None
        if W["strafe"].get("art") in TAGART:
            A["vertragsstrafe_art"] = W["strafe"]["art"]
        V["auftrag"] = A
    return V


TAGART = {"kt": ("Kalendertag", 7), "wt": ("Werktag", 6), "at": ("Arbeitstag", 5)}   # Vertragsstrafe je … (Tage je Woche: Mo–So, Mo–Sa, Mo–Fr)


def werktage(von, bis, art="wt"):
    """Tage nach „von“ bis einschließlich „bis“ – Verzug ab dem Tag nach der vertraglichen Fertigstellung; Werktage Mo–Sa, Arbeitstage Mo–Fr, Kalendertage alle."""
    n, t, w = 0, von, TAGART.get(art, TAGART["wt"])[1]
    while t < bis:
        t += timedelta(days=1)
        if t.weekday() < w:
            n += 1
    return n


def strafe_vorschlag(V, abrechnung_netto, abnahme=""):
    """Vertragsstrafe vorschlagen: Werktage zwischen vertraglicher Fertigstellung (Auftrag) und Abnahme × Satz, höchstens Obergrenze –
    bezogen auf die Abrechnungssumme netto (BGH, Urt. v. 15.02.2024 – VII ZR 42/22: nach der Schlussrechnung, nicht dem Angebot)."""
    A = V.get("auftrag") or {}
    pct, mx = _f(A.get("vertragsstrafe")), _f(A.get("vertragsstrafe_max"))
    ab = abnahme or (V.get("sicherheit") or {}).get("abnahme") or ""
    try:
        ende, fertig = date.fromisoformat(str(A.get("ende") or "")[:10]), date.fromisoformat(str(ab)[:10])
    except ValueError:
        return {"tage": 0, "betrag": 0.0, "grund": "vertragliche Fertigstellung (Auftrag) oder Abnahme fehlt"} if pct else None
    if not pct:
        return None
    art = A.get("vertragsstrafe_art") if A.get("vertragsstrafe_art") in TAGART else "wt"
    t = werktage(ende, fertig, art)
    b = abrechnung_netto * pct / 100 * t
    if mx:
        b = min(b, abrechnung_netto * mx / 100)
    return {"tage": t, "betrag": round(max(b, 0), 2), "grund": f"{t} {TAGART[art][0]}e nach dem {ende.strftime('%d.%m.%Y')} bis zur Abnahme am {fertig.strftime('%d.%m.%Y')}"}


def bauabzug_gilt(V, rd, datum):
    """Bauabzugsteuer einbehalten? Nur wenn eingeschaltet und keine gültige Freistellungsbescheinigung (gültig bis ≥ Rechnungsdatum)."""
    if not an_rechnung(V, rd, "bauabzug"):
        return False
    bis = ((V.get("leiter") or {}).get("bauabzug") or {}).get("frei_bis") or ""
    return not (bis and bis >= (datum or date.today().isoformat()))


def vb_text(V):
    """Text der Vertragsbedingungen (Protokoll, Bauvertrag, Auftragsschreiben) aus der Leiter – kein zweites Textfeld."""
    Z = zeilen(V)
    num = lambda x: f"{x:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".").rstrip("0").rstrip(",")   # noqa: E731
    by = {z["k"]: z for z in Z["netto"] + Z["brutto"]}
    out = {}
    s = by.get("strafe")
    out["vertragsstrafe"] = (f"{num(s['pct'])} % der Abrechnungssumme netto je {TAGART.get(s.get('art'), TAGART['wt'])[0]} Verzug" + (f", höchstens {num(s['max'])} %" if s.get("max") else "")) if s and s["an"] and s.get("pct") else "keine"
    ve = by.get("ve")
    out["erfuellung"] = (f"{num(ve['pct'])} % " + ("Einbehalt von jeder Abschlagszahlung" if ve["form"] == "einbehalt" else "als Bürgschaft")) if ve and ve["an"] and ve.get("pct") else "entfällt"
    ma = by.get("ma")
    if ma:
        out["gewaehrleistung"] = f"{ma.get('jahre') or 4} Jahre ab Abnahme"
        p = ma.get("pct") if ma.get("pct") is not None else (ve or {}).get("pct")
        out["einbehalt"] = f"{num(p)} % der Bruttoabrechnungssumme" if ma["an"] and p else "keiner"
        out["einbehalt_abl"] = "ja" if ma.get("form") == "buergschaft" or ma["an"] else ""
    um = [z for z in Z["netto"] if z["eigen"] and z["an"]]
    if um:
        out["energie"] = "; ".join(f"{z['name']} {num(z['wert'])} {'%' if z['typ'] == 'pct' else '€'}" for z in um) + " (Abzug netto)"
    return out
