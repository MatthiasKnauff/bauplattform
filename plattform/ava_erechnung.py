"""E-Rechnung lesen (XRechnung, ZUGFeRD/Factur-X) – statt Texterkennung die Daten, die die Firma selbst mitschickt.

Seit 2025 müssen Bauunternehmen E-Rechnungen empfangen können; viele Programme (HERO, Sander & Doll, pds …) hängen das XML
an das PDF an (Factur-X/ZUGFeRD) oder schicken es allein (XRechnung). Beides wird hier gelesen:
  · CII (CrossIndustryInvoice – ZUGFeRD, Factur-X, XRechnung-CII) und UBL (Invoice – XRechnung-UBL, Peppol).
xml_aus(data) → XML-Bytes oder None   (PDF mit Anhang oder reines XML)
lesen(xml)    → {"kopf": {re_nr, datum, netto, ust, brutto, zahlbetrag, vorauszahlung, firma}, "zeilen": [...]}
                Zeile: oz (aus dem Anfang der Bezeichnung, z. B. „03.2 Wandanschluss …“), kurz, lang, menge, einheit, ep, gp
anwenden(data, X) → ersetzt in X (ava_lesen.bloecke) die Positionsblöcke durch die Zeilen der E-Rechnung; Seite und Stelle
                    im PDF übernimmt jede Zeile vom passenden Textblock (gleicher Betrag) – zum Anklicken. Gibt kopf zurück oder None.
Abzüge der Firma (Sicherheitseinbehalt, frühere Abschläge – Zeilen mit negativem Betrag) sind keine Positionen.
"""
import io
import re
import xml.etree.ElementTree as ET

# UN/ECE Rec. 20 → Einheiten wie im LV
EINHEIT = {"MTK": "m²", "MTQ": "m³", "MTR": "m", "LM": "m", "H87": "Stk", "C62": "Stk", "EA": "Stk", "XPP": "Stk", "HUR": "h", "KGM": "kg",
           "TNE": "t", "LS": "psch", "LTR": "l", "DAY": "Tag", "WEE": "Wo", "MON": "Mon", "SET": "Satz", "PR": "Paar", "MIN": "min", "KMT": "km"}
RX_OZ_TEXT = re.compile(r"^\s*(\d{1,4}(?:\.\d{1,4}){1,4})\.?\s+(.+)$", re.S)


def xml_aus(data):
    if not data:
        return None
    kopf = data[:400].lstrip()
    if kopf.startswith(b"<?xml") or kopf.startswith(b"<") and (b"Invoice" in data[:2000]):
        return data
    if not data.startswith(b"%PDF"):
        return None
    try:
        import pypdf
        r = pypdf.PdfReader(io.BytesIO(data))
        for name, inhalt in (r.attachments or {}).items():
            if name.lower().endswith(".xml") and inhalt:
                b = inhalt[0]
                if b"CrossIndustryInvoice" in b[:3000] or b"<Invoice" in b[:3000] or b":Invoice" in b[:3000]:
                    return b
    except Exception:   # noqa: BLE001 – kaputter Anhang: dann eben aus dem Text
        return None
    return None


def _lokal(e):
    return e.tag.rsplit("}", 1)[-1]


def _kind(e, *pfad):
    for name in pfad:
        if e is None:
            return None
        e = next((k for k in e if _lokal(k) == name), None)
    return e


def _text(e, *pfad):
    k = _kind(e, *pfad)
    return (k.text or "").strip() if k is not None and k.text else ""


def _zahl(t):
    try:
        return float(t)
    except (TypeError, ValueError):
        return None


def _datum(t):
    t = (t or "").strip()
    if re.fullmatch(r"\d{8}", t):
        return f"{t[:4]}-{t[4:6]}-{t[6:]}"
    return t[:10] if re.fullmatch(r"\d{4}-\d{2}-\d{2}.*", t) else ""


def _zeile(name, beschr, menge, code, ep, gp):
    name = re.sub(r"\s+", " ", name or "").strip()
    lang = re.sub(r"<br\s*/?>", "\n", beschr or "", flags=re.I).strip()
    if lang.lower() in ("diverse", "-", ""):
        lang = ""
    m = RX_OZ_TEXT.match(name)
    oz, kurz = (m.group(1), m.group(2).strip()) if m else ("", name)
    return {"oz": oz, "kurz": kurz[:500], "lang": lang[:8000], "menge": menge, "einheit": EINHEIT.get((code or "").upper(), code or ""), "ep": ep, "gp": gp}


def lesen(xml):
    root = ET.fromstring(xml)
    art = _lokal(root)
    kopf, Z = {}, []
    if art == "CrossIndustryInvoice":
        doc = _kind(root, "ExchangedDocument")
        kopf["re_nr"] = _text(doc, "ID")
        kopf["datum"] = _datum(_text(doc, "IssueDateTime", "DateTimeString"))
        tr = _kind(root, "SupplyChainTradeTransaction")
        for li in tr if tr is not None else []:
            if _lokal(li) != "IncludedSupplyChainTradeLineItem":
                continue
            pr = _kind(li, "SpecifiedTradeProduct")
            q = _kind(li, "SpecifiedLineTradeDelivery", "BilledQuantity")
            Z.append(_zeile(_text(pr, "Name"), _text(pr, "Description"), _zahl(q.text if q is not None else None), q.get("unitCode") if q is not None else "",
                            _zahl(_text(li, "SpecifiedLineTradeAgreement", "NetPriceProductTradePrice", "ChargeAmount")),
                            _zahl(_text(li, "SpecifiedLineTradeSettlement", "SpecifiedTradeSettlementLineMonetarySummation", "LineTotalAmount"))))
        s = _kind(tr, "ApplicableHeaderTradeSettlement", "SpecifiedTradeSettlementHeaderMonetarySummation")
        kopf.update(ust=_zahl(_text(s, "TaxTotalAmount")), brutto=_zahl(_text(s, "GrandTotalAmount")), zahlbetrag=_zahl(_text(s, "DuePayableAmount")),
                    vorauszahlung=_zahl(_text(s, "TotalPrepaidAmount")), basis=_zahl(_text(s, "TaxBasisTotalAmount")))
        kopf["firma"] = _text(tr, "ApplicableHeaderTradeAgreement", "SellerTradeParty", "Name")
    elif art in ("Invoice", "CreditNote"):
        kopf["re_nr"] = _text(root, "ID")
        kopf["datum"] = _datum(_text(root, "IssueDate"))
        for li in root:
            if _lokal(li) not in ("InvoiceLine", "CreditNoteLine"):
                continue
            q = _kind(li, "InvoicedQuantity") if _kind(li, "InvoicedQuantity") is not None else _kind(li, "CreditedQuantity")
            it = _kind(li, "Item")
            Z.append(_zeile(_text(it, "Name"), _text(it, "Description"), _zahl(q.text if q is not None else None), q.get("unitCode") if q is not None else "",
                            _zahl(_text(li, "Price", "PriceAmount")), _zahl(_text(li, "LineExtensionAmount"))))
        s = _kind(root, "LegalMonetaryTotal")
        kopf.update(ust=_zahl(_text(root, "TaxTotal", "TaxAmount")), brutto=_zahl(_text(s, "TaxInclusiveAmount")), zahlbetrag=_zahl(_text(s, "PayableAmount")),
                    vorauszahlung=_zahl(_text(s, "PrepaidAmount")), basis=_zahl(_text(s, "TaxExclusiveAmount")))
        kopf["firma"] = _text(root, "AccountingSupplierParty", "Party", "PartyLegalEntity", "RegistrationName") or _text(root, "AccountingSupplierParty", "Party", "PartyName", "Name")
    else:
        return None
    pos = [z for z in Z if (z["gp"] or 0) >= 0]   # negative Zeilen: Abzüge der Firma (Einbehalt, frühere Abschläge) – keine Positionen
    kopf["abzuege"] = [{"text": z["kurz"], "betrag": z["gp"]} for z in Z if (z["gp"] or 0) < 0]
    kopf["netto"] = round(sum(z["gp"] or 0 for z in pos), 2)   # Leistungsstand wie bei der gelesenen Rechnung (Summe der Positionen)
    return {"kopf": {k: v for k, v in kopf.items() if v not in (None, "")}, "zeilen": pos}


def anwenden(data, X):
    """X = ava_lesen.bloecke(...): Positionsblöcke durch die E-Rechnung ersetzen (Stelle im PDF vom Textblock mit gleichem Betrag)."""
    xml = xml_aus(data)
    if not xml:
        return None
    try:
        E = lesen(xml)
    except ET.ParseError:
        return None
    if not E or not E["zeilen"]:
        return None
    alt = [b for b in X.get("bloecke") or [] if not b.get("titel")]
    titel = [b for b in X.get("bloecke") or [] if b.get("titel")]
    neu = []
    for z in E["zeilen"]:
        b = next((a for a in alt if a.get("gp") is not None and z["gp"] is not None and abs(a["gp"] - z["gp"]) < 0.005), None)
        if b is not None:
            alt.remove(b)
        neu.append({"oz": z["oz"], "kurz": z["kurz"], "lang": z["lang"], "menge": z["menge"], "einheit": z["einheit"], "ep": z["ep"], "gp": z["gp"],
                    "titel": False, "erechnung": True, **({"seite": b.get("seite"), "box": b.get("box"), "boxen": b.get("boxen")} if b else {"seite": 1})})
    X["bloecke"] = titel + neu
    return E["kopf"]
