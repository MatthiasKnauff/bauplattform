"""Gesetze im Wortlaut im Wiki (15.11.2026): der amtliche Text von gesetze-im-internet.de, je Paragraf bzw. Anlage ein Eintrag.

Amtliche Werke (Gesetze) sind frei (§ 5 UrhG). Die Dienste holen die XML-Fassung einmal in der Woche (wiki_dienst.py: gesetze) und
gleichen ab: neuer Paragraf → neuer Eintrag, geänderter Wortlaut → Text ersetzt, aufgehobener Paragraf → in den Papierkorb.
Je Eintrag nur ein Paragraf (kein ganzes Dokument in einem Datensatz); lange Anlagen in Teilen. Erkennen über die Quelle
„gesetze-im-internet.de/<kürzel> · § 69“. Status „geprüft“: amtlicher Wortlaut, keine fachliche Prüfung nötig.
"""
import io
import re
import urllib.request
import xml.etree.ElementTree as ET
import zipfile
from datetime import datetime

from . import wiki

# kürzel bei gesetze-im-internet.de · Abkürzung · Kapitel im Wiki · Name
GESETZE = [
    {"k": "geg", "abk": "GModG", "kapitel": "Wärmeschutz", "name": "Gebäudemodernisierungsgesetz (bis 28.07.2026 Gebäudeenergiegesetz GEG)"},
]
URL = "https://www.gesetze-im-internet.de/{k}/xml.zip"
MAX = 18000   # Zeichen je Eintrag (wiki.py nimmt höchstens 20.000)


def holen(k, timeout=60):
    """xml.zip laden → XML-Bytes."""
    rq = urllib.request.Request(URL.format(k=k), headers={"User-Agent": "Bauplattform-Wiki/1.0"})
    with urllib.request.urlopen(rq, timeout=timeout) as r:
        roh = r.read()
    with zipfile.ZipFile(io.BytesIO(roh)) as z:
        name = next(n for n in z.namelist() if n.lower().endswith(".xml"))
        return z.read(name)


def _txt(e):
    return re.sub(r"\s+", " ", "".join(e.itertext())).strip()


def _block(e, out, tiefe=0):
    """Inhalt eines Paragrafen als Text: Absätze, Aufzählungen (DT/DD) eingerückt, Tabellen zeilenweise mit „|“."""
    tag = e.tag.split("}")[-1]
    if tag in ("table", "tgroup"):
        for row in e.iter():
            if row.tag.split("}")[-1] == "row":
                z = " | ".join(_txt(x) for x in row if x.tag.split("}")[-1] == "entry")
                if z.strip(" |"):
                    out.append("  " * tiefe + z)
        return
    if tag == "DL":
        dt = None
        for x in e:
            t = x.tag.split("}")[-1]
            if t == "DT":
                dt = _txt(x)
            elif t == "DD":
                teile = []
                _inhalt(x, teile, tiefe + 1)
                erst = teile[0].strip() if teile else ""
                out.append("  " * tiefe + (dt + " " if dt else "") + erst)
                out.extend(teile[1:])
                dt = None
        return
    if tag in ("P", "LA", "Title", "Subtitle"):
        teile = []
        kopf = (e.text or "")
        rest = []
        for x in e:
            t = x.tag.split("}")[-1]
            if t in ("DL", "table", "tgroup", "P"):
                if kopf.strip() or rest:
                    teile.append("  " * tiefe + re.sub(r"\s+", " ", kopf + "".join(rest)).strip())
                kopf, rest = "", []
                _block(x, teile, tiefe)
            else:
                rest.append("".join(x.itertext()))
            rest.append(x.tail or "")
        if kopf.strip() or "".join(rest).strip():
            teile.append("  " * tiefe + re.sub(r"\s+", " ", kopf + "".join(rest)).strip())
        out.extend(z for z in teile if z.strip())
        return
    _inhalt(e, out, tiefe)


def _inhalt(e, out, tiefe=0):
    if (e.text or "").strip():
        out.append("  " * tiefe + re.sub(r"\s+", " ", e.text).strip())
    for x in e:
        _block(x, out, tiefe)
        if (x.tail or "").strip():
            out.append("  " * tiefe + re.sub(r"\s+", " ", x.tail).strip())


def teile(xml):
    """XML (gii-norm) → [{nr: '§ 69', titel, gliederung, text}] in der Reihenfolge des Gesetzes; Gliederung = „Teil 4 · Abschnitt 2 …“."""
    root = ET.fromstring(xml)
    out, glied = [], {}
    for n in root.iter("norm"):
        md = n.find("metadaten")
        if md is None:
            continue
        ge = md.find("gliederungseinheit")
        enbez = (md.findtext("enbez") or "").strip()
        if ge is not None and not enbez:   # Überschrift eines Teils/Abschnitts
            bez, tit, kz = (ge.findtext("gliederungsbez") or "").strip(), (ge.findtext("gliederungstitel") or "").strip(), (ge.findtext("gliederungskennzahl") or "")
            ebene = max(1, len(kz) // 3)
            glied = {k: v for k, v in glied.items() if k < ebene}
            glied[ebene] = " ".join(x for x in (bez, tit) if x)
            continue
        if not enbez or enbez.lower() in ("inhaltsübersicht", "eingangsformel"):
            continue
        titel = _txt(md.find("titel")) if md.find("titel") is not None else ""
        Z = []
        td = n.find("textdaten")
        cont = td.find("text/Content") if td is not None else None
        if cont is not None:
            _inhalt(cont, Z)
        text = "\n".join(z for z in Z if z.strip()).strip()
        if not text:
            text = "(weggefallen)" if "weggefallen" in titel.lower() or not titel else ""
        out.append({"nr": enbez, "titel": titel, "gliederung": " · ".join(glied[k] for k in sorted(glied)), "text": text})
    return out


def _stuecke(text):
    """Langer Text (Anlagen) → Teile höchstens MAX Zeichen, an Zeilen getrennt."""
    if len(text) <= MAX:
        return [text]
    out, cur = [], ""
    for z in text.split("\n"):
        while len(z) > MAX:
            if cur:
                out.append(cur)
            cur = ""
            out.append(z[:MAX])
            z = z[MAX:]
        if len(cur) + len(z) + 1 > MAX:
            out.append(cur)
            cur = ""
        cur = (cur + "\n" + z) if cur else z
    if cur:
        out.append(cur)
    return out


def abgleichen(c, G, T, stand=""):
    """Einträge des Gesetzes G an die Teile T angleichen → {neu, geaendert, entfernt}."""
    jetzt = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
    q0 = f"gesetze-im-internet.de/{G['k']}"
    da = {r["quelle"]: r for r in c.execute("SELECT id, quelle, titel, text, stichworte, deleted FROM wiki_eintrag WHERE quelle LIKE ?", (q0 + " · %",)).fetchall()}
    gesehen, n = set(), {"neu": 0, "geaendert": 0, "entfernt": 0}
    for t in T:
        st = _stuecke(t["text"])
        for i, s in enumerate(st):
            nr = t["nr"] + (f" (Teil {i + 1})" if len(st) > 1 else "")
            quelle = f"{q0} · {nr}"[:200]
            titel = f"{nr} {G['abk']}" + (f" – {t['titel']}" if t["titel"] else "")
            text = (f"{G['name']}\n{t['gliederung']}\n\n" if t["gliederung"] else f"{G['name']}\n\n") + s + (f"\n\nQuelle: {URL.format(k=G['k']).replace('xml.zip', '')}" + (f" · Stand {stand}" if stand else ""))
            stw = ", ".join(wiki.tags_von(G["kapitel"], f"{G['abk']}, Gesetz, Wortlaut"))
            gesehen.add(quelle)
            alt = da.get(quelle)
            if alt is None:
                c.execute("INSERT INTO wiki_eintrag(kapitel, titel, text, stichworte, quelle, status, created, updated) VALUES(?,?,?,?,?,'geprueft',?,?)",
                          (G["kapitel"], titel[:200], text[:20000], stw, quelle, jetzt, jetzt))
                n["neu"] += 1
            elif alt["deleted"] or alt["titel"] != titel[:200] or _ohne_stand(alt["text"]) != _ohne_stand(text[:20000]):
                c.execute("UPDATE wiki_eintrag SET titel=?, text=?, deleted='', status='geprueft', updated=? WHERE id=?", (titel[:200], text[:20000], jetzt, alt["id"]))
                n["geaendert"] += 1
    for q, r in da.items():
        if q not in gesehen and not r["deleted"]:
            c.execute("UPDATE wiki_eintrag SET deleted=?, updated=? WHERE id=?", (jetzt, jetzt, r["id"]))
            n["entfernt"] += 1
    return n


def _ohne_stand(text):
    return re.sub(r" · Stand [^\n]*$", "", text or "")


def uebernehmen(c, G, xml=None):
    """Ein Gesetz holen und abgleichen (xml für Tests)."""
    xml = xml if xml is not None else holen(G["k"])
    m = re.search(rb'builddate="(\d{8})', xml[:4000])
    stand = f"{m.group(1)[6:8].decode()}.{m.group(1)[4:6].decode()}.{m.group(1)[:4].decode()}" if m else ""
    return abgleichen(c, G, teile(xml), stand)
