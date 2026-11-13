"""GAEB DA XML (3.x) lesen und schreiben – Austausch von Leistungsverzeichnissen mit Firmen und anderen AVA-Programmen.

lesen(bytes)  → {"dp": "83"|"84"|"86"|…, "projekt": str, "lv_name": str, "bieter": str, "items": [...]}
               Items wie im LV der App: {typ:'titel', lvl, oz, kurz} bzw. {typ:'pos', oz, kurz, lang, menge, einheit, art, ep}
               art: N normal · E Bedarfsposition (ohne Gesamtbetrag) · A Wahlposition · P Pauschal · T Hinweistext
schreiben(lv, dp, preise=None, projekt="", bieter="") → bytes (X83 Angebotsaufforderung, X84 Angebot, X86 Auftrag)

Unterstützt wird der übliche Umfang (Titel in beliebiger Tiefe, Positionen mit Kurz- und Langtext, Menge, Einheit,
Einheitspreis, Bedarfs-, Wahl- und Pauschalpositionen, Hinweistexte). Ältere Formate (GAEB 90 / 2000, D83/P83) werden
nicht gelesen – bitte im anderen Programm als DA XML ausgeben.
"""
import re
import uuid
import xml.etree.ElementTree as ET
from datetime import date
from xml.sax.saxutils import escape


# GAEB-Mengeneinheiten (QU, höchstens 4 Zeichen) – gleiche Zuordnung wie /bp/vorschlag.js im Browser
_EH = {"m²": "m2", "qm": "m2", "m³": "m3", "cbm": "m3", "lfm": "m", "lfdm": "m", "mtr": "m", "st": "St", "stk": "St", "stck": "St",
       "stück": "St", "stueck": "St", "pausch": "psch", "pau": "psch", "psch": "psch", "pschl": "psch", "std": "h", "h": "h", "tag": "d",
       "tage": "d", "d": "d", "wo": "Wo", "woche": "Wo", "mon": "Mt", "monat": "Mt", "mt": "Mt", "to": "t", "t": "t", "kg": "kg",
       "ltr": "l", "l": "l", "satz": "Satz", "m": "m", "m2": "m2", "m3": "m3"}


def gaeb_einheit(v):
    k = str(v or "").strip().rstrip(".")
    return _EH.get(k.lower(), k)[:4]


def _ln(t):
    return t.rsplit("}", 1)[-1] if isinstance(t, str) else ""


def _kids(e, name):
    return [k for k in list(e) if _ln(k.tag) == name]


def _kid(e, name):
    for k in list(e):
        if _ln(k.tag) == name:
            return k
    return None


def _find(e, *path):
    for p in path:
        if e is None:
            return None
        e = _kid(e, p)
    return e


def _text(e):
    """Text eines GAEB-Textelements (<p><span>…</span></p> …) mit Zeilenumbrüchen je Absatz."""
    if e is None:
        return ""
    out = []
    ps = [x for x in e.iter() if _ln(x.tag) == "p"]
    if not ps:
        return " ".join("".join(e.itertext()).split())
    for p in ps:
        t = "".join(p.itertext()).replace("\xa0", " ")
        t = re.sub(r"[ \t]+", " ", t).strip()
        out.append(t)
    while out and not out[-1]:
        out.pop()
    return "\n".join(out).strip()


def _num(s):
    try:
        return float(str(s).strip().replace(",", "."))
    except (TypeError, ValueError):
        return None


def lesen(data):
    try:
        root = ET.fromstring(data)
    except ET.ParseError as e:
        raise ValueError(f"Keine gültige GAEB-XML-Datei ({e}). Bitte im anderen Programm als GAEB DA XML (X83/X84/X86) ausgeben.")
    if _ln(root.tag) != "GAEB":
        raise ValueError("Keine GAEB-DA-XML-Datei (Wurzelelement „GAEB“ fehlt).")
    award = _kid(root, "Award")
    dp = (_text(_find(award, "DP")) if award is not None else "") or ""
    m = re.search(r"DA(8\d)", root.tag or "")
    dp = dp or (m.group(1) if m else "")
    prj = _find(root, "PrjInfo")
    projekt = ""
    if prj is not None:
        a, b = _text(_find(prj, "LblPrj")), _text(_find(prj, "NamePrj"))
        projekt = a if a == b or not b else b if not a else f"{b} {a}" if a not in b and b not in a else max(a, b, key=len)
    boq = _find(award, "BoQ") if award is not None else None
    if boq is None:
        raise ValueError("In der Datei steht kein Leistungsverzeichnis (BoQ).")
    lv_name = _text(_find(boq, "BoQInfo", "LblBoQ")) or _text(_find(boq, "BoQInfo", "Name"))
    bieter = ""
    ctr = _find(award, "CTR")
    if ctr is None:
        ctr = _find(award, "Contractor")
    if ctr is not None:
        adr = _find(ctr, "Address")
        bieter = " ".join(x for x in (_text(_find(adr, "Name1")), _text(_find(adr, "Name2"))) if x) if adr is not None else ""
    items = []

    def walk(body, prefix, lvl, ctgy):
        if body is None:
            return
        for ch in list(body):
            t = _ln(ch.tag)
            if t == "BoQCtgy":
                oz = prefix + (ch.get("RNoPart") or "").strip()
                items.append({"typ": "titel", "lvl": lvl, "oz": oz, "kurz": _text(_find(ch, "LblTx")) or "Titel"})
                walk(_find(ch, "BoQBody"), oz + ".", lvl + 1, ctgy + [[]])
            elif t == "Itemlist":
                for it in list(ch):
                    tt = _ln(it.tag)
                    if tt == "Item":
                        items.append(_item(it, prefix))
                        for c_ in ctgy:   # für Zuschläge „alle Positionen des Gliederungspunkts“
                            c_.append(items[-1]["_gid"])
                    elif tt == "MarkupItem":   # Zuschlagsposition: EP = Zuschlag in %, auf die bezuschlagten Positionen
                        items.append(_zuschlag(it, prefix, ctgy[-1] if ctgy else None))
                    elif tt == "Remark":
                        txt = _text(_find(it, "Description", "CompleteText", "DetailTxt")) or _text(_find(it, "Description"))
                        kurz = _text(_find(it, "Description", "CompleteText", "OutlineText")) or (txt.split("\n")[0][:120] if txt else "Hinweis")
                        items.append({"typ": "pos", "art": "T", "oz": "", "kurz": kurz, "lang": txt, "menge": 0, "einheit": "", "ep": None})

    def _item(it, prefix):
        oz = prefix + (it.get("RNoPart") or "").strip()
        desc = _find(it, "Description")
        ct = _find(desc, "CompleteText")
        kurz = _text(_find(ct, "OutlineText")) or _text(_find(desc, "OutlineText"))
        lang = _text(_find(ct, "DetailTxt")) or _text(_find(desc, "DetailTxt"))
        if not kurz:
            kurz = (lang.split("\n")[0] if lang else "")[:200]
        art = "N"
        prov = _text(_kid(it, "Provis"))
        mit_gb = False
        if prov:
            art = "E"
            mit_gb = prov.strip().lower() == "withtotal"
        if _kid(it, "ALNGroupNo") is not None or _kid(it, "ALNSerNo") is not None:
            art = "A"
        if (_text(_kid(it, "LumpSumItem")) or "").lower() in ("yes", "true", "1"):
            art = "P"
        qty = _num(_text(_kid(it, "Qty")))
        if qty is None:
            qs = _find(it, "QtySplit")
            qty = _num(_text(_kid(qs, "Qty"))) if qs is not None else None
        up = _num(_text(_kid(it, "UP")))
        return {"typ": "pos", "oz": oz, "kurz": kurz, "lang": lang if lang != kurz else "", "menge": qty or 0,
                "einheit": _text(_kid(it, "QU")), "art": art, "ep": up, **({"gb": True} if mit_gb else {}),
                "_gid": it.get("ID") or "", **({"_mark": True} if (_text(_kid(it, "MarkupIt")) or "").lower() in ("yes", "true", "1") else {})}

    def _zuschlag(it, prefix, ctgy):
        """GAEB MarkupItem: ListInSubQty (aufgezählte Positionen), IdentAsMark (mit MarkupIt gekennzeichnete), AllInCtgy (alle im Gliederungspunkt)."""
        desc = _find(it, "Description")
        kurz = _text(_find(desc, "CompleteText", "OutlineText")) or _text(_find(desc, "OutlineText")) or "Zuschlag"
        lang = _text(_find(desc, "CompleteText", "DetailTxt")) or _text(_find(desc, "DetailTxt"))
        typ = _text(_kid(it, "MarkupType")) or "IdentAsMark"
        if typ == "ListInSubQty":
            refs = [r.get("IDRef") for q in _kids(it, "MarkupSubQty") for r in _kids(q, "RefItem") if r.get("IDRef")]
        elif typ == "AllInCtgy":
            refs = list(ctgy or [])
        else:
            refs = ["*mark*"]
        return {"typ": "pos", "oz": prefix + (it.get("RNoPart") or "").strip(), "kurz": kurz, "lang": lang if lang != kurz else "", "menge": 0,
                "einheit": "%", "art": "Z", "ep": _num(_text(_kid(it, "Markup"))), "_refs": refs}

    walk(_find(boq, "BoQBody"), "", 1, [])
    # eigene IDs vergeben und die Bezüge der Zuschläge darauf umstellen
    neu = {x["_gid"]: uuid.uuid4().hex[:10] for x in items if x.get("_gid")}
    mark = [neu[x["_gid"]] for x in items if x.get("_mark") and x.get("_gid")]
    for x in items:
        if x.get("_gid"):
            x["id"] = neu[x["_gid"]]
        if "_refs" in x:
            x["zu"] = mark if x["_refs"] == ["*mark*"] else [neu[r] for r in x["_refs"] if r in neu]
        for k in ("_gid", "_mark", "_refs"):
            x.pop(k, None)
    if not any(i["typ"] == "pos" for i in items):
        raise ValueError("Im Leistungsverzeichnis wurden keine Positionen gefunden.")
    return {"dp": dp, "projekt": projekt, "lv_name": lv_name, "bieter": bieter, "items": items}


# ---------------------------------------------------------------- schreiben
def _p(text):
    lines = (text or "").split("\n")
    return "".join(f"<p><span>{escape(x)}</span></p>" if x.strip() else "<p>&#160;</p>" for x in lines) or "<p></p>"


def _f(v, n):
    return f"{v:.{n}f}"


def _xid(x):
    """XML-ID einer Position aus ihrer ID im LV – damit Zuschläge (MarkupItem) auf ihre Positionen verweisen können."""
    return "i" + re.sub(r"[^A-Za-z0-9_.-]", "_", str(x.get("id") or "")) if x.get("id") else "i" + uuid.uuid4().hex


def schreiben(lv, dp="83", preise=None, projekt="", bieter="", nachlass=0.0):
    """lv: {nr, name, items}. preise: {pos_id: EP} für X84/X86. Gibt UTF-8-Bytes zurück."""
    dp = str(dp)
    items = [x for x in lv.get("items") or [] if x.get("typ") in ("titel", "pos")]
    # Gliederung (BoQBkdn): Länge je Titelebene und der Positionsnummer aus den OZ ableiten
    tlen, plen, maxl = {}, 4, 0
    for x in items:
        parts = [p for p in str(x.get("oz") or "").split(".") if p]
        if x["typ"] == "titel":
            lv_ = int(x.get("lvl") or 1); maxl = max(maxl, lv_)
            if parts:
                tlen[lv_] = max(tlen.get(lv_, 1), len(parts[-1]))
        elif parts and x.get("art") != "T":
            plen = max(plen, len(parts[-1]))
    bkdn = "".join(f"<BoQBkdn><Type>BoQLevel</Type><LblBoQBkdn>{'Titel' if l == 1 else 'Untertitel'}</LblBoQBkdn><Length>{tlen.get(l, 2)}</Length><Num>Yes</Num></BoQBkdn>"
                   for l in range(1, maxl + 1))
    bkdn += f"<BoQBkdn><Type>Item</Type><LblBoQBkdn>Position</LblBoQBkdn><Length>{plen}</Length><Num>Yes</Num></BoQBkdn>"
    mit_preis = dp in ("84", "86") and preise is not None

    ids = {x.get("id") for x in items if x.get("id")}

    def item_xml(x):
        parts = [p for p in str(x.get("oz") or "").split(".") if p]
        if x.get("art") == "Z":   # Zuschlagsposition: Satz in % auf die aufgezählten Positionen
            refs = "".join(f'<MarkupSubQty><RefItem IDRef="{_xid({"id": r})}"/></MarkupSubQty>' for r in x.get("zu") or [] if r in ids)
            mk = ""
            if mit_preis and preise.get(x["id"]) is not None:
                basis = sum(float(y.get("menge") or 0) * float(preise.get(y["id"]) or 0) for y in items if y.get("id") in set(x.get("zu") or []))
                mk = f"<Markup>{_f(float(preise[x['id']]), 3)}</Markup><IT>{_f(round(basis * float(preise[x['id']]) / 100, 2), 2)}</IT>"
            return (f'<MarkupItem ID="{_xid(x)}" RNoPart="{escape(parts[-1] if parts else "")}"><MarkupType>ListInSubQty</MarkupType>{refs}{mk}'
                    f'<Description><OutlineText><OutlTxt><TextOutlTxt>{_p(x.get("kurz"))}</TextOutlTxt></OutlTxt></OutlineText></Description></MarkupItem>')
        if x.get("art") == "T":
            return (f'<Remark ID="{uuid.uuid4()}"><Description><CompleteText><DetailTxt><Text>{_p(x.get("lang") or x.get("kurz"))}</Text></DetailTxt>'
                    f'<OutlineText><OutlTxt><TextOutlTxt>{_p(x.get("kurz"))}</TextOutlTxt></OutlTxt></OutlineText></CompleteText></Description></Remark>')
        a = x.get("art") or "N"
        h = f'<Item ID="{_xid(x)}" RNoPart="{escape(parts[-1] if parts else "")}">'
        if a == "E":
            h += "<Provis>WithTotal</Provis>" if x.get("gb") else "<Provis>WithoutTotal</Provis>"
        if a == "A":
            h += "<ALNGroupNo>1</ALNGroupNo><ALNSerNo>1</ALNSerNo>"
        if a == "P":
            h += "<LumpSumItem>Yes</LumpSumItem>"
        h += f"<Qty>{_f(float(x.get('menge') or 0), 3)}</Qty><QU>{escape(gaeb_einheit(x.get('einheit')))}</QU>"
        if mit_preis:
            ep = preise.get(x["id"])
            if ep is not None:
                gp = 0.0 if (a == "A" or (a == "E" and not x.get("gb"))) else round(float(x.get("menge") or 0) * float(ep), 2)
                h += f"<UP>{_f(float(ep), 2)}</UP><IT>{_f(gp, 2)}</IT>"
        lang = x.get("lang") or ""
        h += (f"<Description><CompleteText><DetailTxt><Text>{_p(lang or x.get('kurz'))}</Text></DetailTxt>"
              f"<OutlineText><OutlTxt><TextOutlTxt>{_p(x.get('kurz'))}</TextOutlTxt></OutlTxt></OutlineText></CompleteText></Description></Item>")
        return h

    # Baum aus der flachen Liste: Titel öffnen Ebenen, Positionen landen in der Itemlist der aktuellen Ebene
    out, stack = [], []   # stack: offene Titel-Ebenen

    def close_to(lvl):
        while stack and stack[-1]["lvl"] >= lvl:
            t = stack.pop()
            body = ("<Itemlist>" + "".join(t["items"]) + "</Itemlist>" if t["items"] else "") + "".join(t["kids"])
            xml = (f'<BoQCtgy ID="{uuid.uuid4()}" RNoPart="{escape(t["rno"])}"><LblTx>{_p(t["kurz"])}</LblTx><BoQBody>{body}</BoQBody></BoQCtgy>')
            (stack[-1]["kids"] if stack else out).append(xml)

    top_items = []
    for x in items:
        if x["typ"] == "titel":
            lvl = int(x.get("lvl") or 1)
            close_to(lvl)
            parts = [p for p in str(x.get("oz") or "").split(".") if p]
            stack.append({"lvl": lvl, "rno": parts[-1] if parts else str(len(out) + 1).zfill(2), "kurz": x.get("kurz") or "", "items": [], "kids": []})
        else:
            (stack[-1]["items"] if stack else top_items).append(item_xml(x))
    close_to(0)
    body = ("<Itemlist>" + "".join(top_items) + "</Itemlist>" if top_items else "") + "".join(out)
    ns = f"http://www.gaeb.de/GAEB_DA_XML/DA{dp}/3.3"
    ctr = f"<CTR><Address><Name1>{escape(bieter)}</Name1></Address></CTR>" if bieter and dp in ("84", "86") else ""
    nl = f"<DiscountPcnt>{_f(float(nachlass), 2)}</DiscountPcnt>" if mit_preis and nachlass else ""
    xml = (f'<?xml version="1.0" encoding="UTF-8"?>\n<GAEB xmlns="{ns}"><GAEBInfo><Version>3.3</Version><VersDate>2021-05</VersDate>'
           f"<Date>{date.today().isoformat()}</Date><ProgSystem>Bauplattform</ProgSystem></GAEBInfo>"
           f"<PrjInfo><NamePrj>{escape(projekt)}</NamePrj><LblPrj>{escape(projekt)}</LblPrj><Cur>EUR</Cur><CurLbl>Euro</CurLbl></PrjInfo>"
           f"<Award><DP>{dp}</DP><AwardInfo><Cur>EUR</Cur><CurLbl>Euro</CurLbl></AwardInfo>{ctr}"
           f'<BoQ ID="{uuid.uuid4()}"><BoQInfo><Name>{escape(lv.get("nr") or "")}</Name><LblBoQ>{escape(lv.get("name") or "")}</LblBoQ>{bkdn}{nl}</BoQInfo>'
           f"<BoQBody>{body}</BoQBody></BoQ></Award></GAEB>")
    return xml.encode("utf-8")
