"""Gesetze im Wortlaut im Wiki (15.11.2026): XML von gesetze-im-internet.de → je Paragraf ein Eintrag, Abgleich (bpcore/wiki_gesetze.py)."""
from lib import gleich, pruefe

from bpcore import wiki_gesetze as W

XML = """<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE dokumente SYSTEM "http://www.gesetze-im-internet.de/dtd/1.01/gii-norm.dtd">
<dokumente builddate="20260801120000" doknr="X"><norm><metadaten><jurabk>GModG</jurabk><langue>Gebäudemodernisierungsgesetz</langue></metadaten></norm>
<norm><metadaten><jurabk>GModG</jurabk><gliederungseinheit><gliederungskennzahl>010</gliederungskennzahl><gliederungsbez>Teil 1</gliederungsbez><gliederungstitel>Allgemeiner Teil</gliederungstitel></gliederungseinheit></metadaten></norm>
<norm><metadaten><jurabk>GModG</jurabk><enbez>§ 1</enbez><titel format="parat">Zweck und Ziel</titel></metadaten><textdaten><text format="XML"><Content>
<P>(1) Zweck dieses Gesetzes ist ein möglichst sparsamer Einsatz von Energie.</P><P>(2) Es gilt für<DL Type="arabic"><DT>1.</DT><DD><LA>Gebäude, die beheizt werden,</LA></DD><DT>2.</DT><DD><LA>Anlagen der Heizung.</LA></DD></DL></P></Content></text></textdaten></norm>
<norm><metadaten><jurabk>GModG</jurabk><enbez>Anlage 8</enbez><titel format="parat">Dämmung von Rohrleitungen</titel></metadaten><textdaten><text format="XML"><Content>
<table><tgroup cols="2"><tbody><row><entry>Innendurchmesser</entry><entry>Mindestdicke</entry></row><row><entry>bis 22 mm</entry><entry>20 mm</entry></row></tbody></tgroup></table></Content></text></textdaten></norm>
</dokumente>""".encode()


def test_teile():
    T = W.teile(XML)
    gleich([t["nr"] for t in T], ["§ 1", "Anlage 8"], "Paragrafen und Anlagen, ohne Gliederung")
    gleich(T[0]["gliederung"], "Teil 1 Allgemeiner Teil", "Gliederung")
    pruefe("(1) Zweck dieses Gesetzes" in T[0]["text"] and "1. Gebäude, die beheizt werden," in T[0]["text"] and "2. Anlagen der Heizung." in T[0]["text"], T[0]["text"])
    pruefe("bis 22 mm | 20 mm" in T[1]["text"], T[1]["text"])


class _C:   # Datenbank ohne Datenbank: wiki_eintrag als Liste
    def __init__(self):
        self.E = []

    def execute(self, sql, a=()):
        s = sql.split()[0]
        if s == "SELECT":
            R = [dict(e) for e in self.E if e["quelle"].startswith(a[0][:-1])]
            return type("R", (), {"fetchall": lambda _s: R})()
        if s == "INSERT":
            self.E.append({"id": len(self.E) + 1, "kapitel": a[0], "titel": a[1], "text": a[2], "stichworte": a[3], "quelle": a[4], "deleted": ""})
        elif sql.startswith("UPDATE wiki_eintrag SET titel"):
            e = next(x for x in self.E if x["id"] == a[3]); e.update(titel=a[0], text=a[1], deleted="")
        elif sql.startswith("UPDATE wiki_eintrag SET deleted"):
            next(x for x in self.E if x["id"] == a[2])["deleted"] = a[0]
        return type("R", (), {"fetchall": lambda _s: []})()


def test_abgleich():
    c, G = _C(), W.GESETZE[0]
    gleich(W.uebernehmen(c, G, XML), {"neu": 2, "geaendert": 0, "entfernt": 0}, "erst anlegen")
    pruefe(c.E[0]["titel"] == "§ 1 GModG – Zweck und Ziel" and "Stand 01.08.2026" in c.E[0]["text"], c.E[0])
    gleich(W.uebernehmen(c, G, XML.replace(b"20260801", b"20260808")), {"neu": 0, "geaendert": 0, "entfernt": 0}, "nur neuer Stand: nichts geändert")
    neu = XML.replace("sparsamer".encode(), "effizienter".encode()).replace(b"<norm><metadaten><jurabk>GModG</jurabk><enbez>Anlage 8</enbez>", b"<norm><metadaten><jurabk>X</jurabk><enbez></enbez>")
    gleich(W.uebernehmen(c, G, neu), {"neu": 0, "geaendert": 1, "entfernt": 1}, "Wortlaut geändert, Anlage weg")


def test_stuecke():
    L = W._stuecke("\n".join(["x" * 1000] * 40))
    pruefe(len(L) == 3 and all(len(x) <= W.MAX for x in L), [len(x) for x in L])
