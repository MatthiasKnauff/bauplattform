"""Blockvorlagen für Ausdrucke: einen Block (z. B. eine LV-Position, eine Titelzeile, eine Summenzeile) einmal im
Layout-Editor festlegen – die Plattform wiederholt ihn je Eintrag. Dasselbe Konzept für alle Ausdrucke mit Listen.

Vorlage (im Druck-Layout data["vorlagen"][name]):
  {"breite": mm (Breite, für die gezeichnet wurde – passt sich an die Breite des Inhalts an), "h": mm (Mindesthöhe),
   "kasten": Außenkasten, "linie": Trennlinie unten, "band": Hintergrund (z. B. Titelzeile), "abstand": mm darüber,
   "elemente": [{id, feld, x, y, w, h (mm im Block), groesse (pt), fett, farbe ("ink"|"mute"), ausrichtung, kopf (Spaltenkopf), text}]}
Felder wachsen mit ihrem Inhalt nach unten; was darunter liegt, rückt nach. Lange Texte brechen über Seiten um, Fotos und
andere Bilder werden nie geteilt oder beschnitten (sie rutschen ganz auf die nächste Seite). Über jeder Seite stehen die
Spaltenköpfe (Felder mit „kopf“), sobald ein Block oben auf einer Seite beginnt.

block(vorlage, inhalte, stile) → Flowable
  inhalte: {feld: Text (str) | [Flowables]} – Text wird mit der Schrift des Elements gesetzt, Flowables (z. B. bearbeitbare
           Absätze, Fotozeilen) werden untereinander gestellt.
  stile:   {"schrift": {n, b}, "ink": Farbe, "mute": Farbe, "linie": Farbe, "band": Farbe, "kopf": True|False}
"""
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import Flowable, Paragraph
from xml.sax.saxutils import escape

AUSR = {"links": 0, "mitte": 1, "rechts": 2}


def _stil(e, S):
    gr = float(e.get("groesse") or 9)
    return ParagraphStyle("v", fontName=S["schrift"]["b" if e.get("fett") else "n"], fontSize=gr, leading=gr * 1.28,
                          textColor=S["mute"] if e.get("farbe") == "mute" else S["ink"], alignment=AUSR.get(e.get("ausrichtung"), 0))


class _Linie(Flowable):
    def __init__(self, farbe, staerke=0.4):
        super().__init__(); self.farbe, self.staerke = farbe, staerke

    def wrap(self, aW, aH):
        self.width = aW; return aW, max(1, self.staerke)

    def draw(self):
        self.canv.setStrokeColor(self.farbe); self.canv.setLineWidth(self.staerke); self.canv.line(0, 0, self.width, 0)


class Block(Flowable):
    """Ein Block nach Vorlage. teile: schon gesetzte Kästchen (Fortsetzung nach einem Seitenumbruch)."""

    def __init__(self, V, inhalte, S, kasten=None, _teile=None, _hoehe=None, fortsetzung=False, erster=False):
        super().__init__()
        self.V, self.inhalte, self.S, self._teile, self._hoehe, self.fortsetzung, self.erster = V, inhalte, S, _teile, _hoehe, fortsetzung, erster
        self._kopf = False

    # ---------- Satz ----------
    def _setzen(self, aW):
        V, S = self.V, self.S
        f = aW / ((float(V.get("breite") or 0) * mm) or aW)
        platz = []   # (x0, x1, y_unten_vorlage, y_unten_neu) – je gesetztes Element
        teile, unten = [], float(V.get("h") or 0) * mm
        for e in sorted(V.get("elemente") or [], key=lambda e: (float(e.get("y") or 0), float(e.get("x") or 0))):
            x, w = float(e.get("x") or 0) * mm * f, max(4, float(e.get("w") or 10) * mm * f)
            y0, h0 = float(e.get("y") or 0) * mm, float(e.get("h") or 4) * mm
            ueber = [p for p in platz if p[2] <= y0 + 0.01 and p[0] < x + w - 0.5 and p[1] > x + 0.5]
            n = max(ueber, key=lambda p: p[2]) if ueber else None   # das nächste Element darüber (in derselben Spalte)
            top = n[3] + (y0 - n[2]) if n else y0   # Abstand dazu wie in der Vorlage, nur verschoben
            if e.get("feld") == "linie":
                fl = [_Linie(S["linie"], float(e.get("staerke") or 0.4))]
            else:
                inh = self.inhalte.get(e.get("feld")) if e.get("feld") != "text" else e.get("text")
                if inh is None or inh == "" or inh == []:   # leer: fällt weg, was darunter steht, rückt auf
                    platz.append((x, x + w, y0 + h0, n[3] if n else top)); continue
                fl = [Paragraph(escape(str(inh)).replace("\n", "<br/>"), _stil(e, S))] if isinstance(inh, (str, int, float)) else list(inh)
            y = top
            for fw in fl:
                _, hh = fw.wrap(w, 10 ** 6)
                teile.append({"x": x, "y": y, "w": w, "h": hh, "f": fw})
                y += hh
            nb = max(top + h0, y)
            platz.append((x, x + w, y0 + h0, nb))
            unten = max(unten, nb)
        return teile, unten

    def wrap(self, aW, aH):
        fr = getattr(self, "_frame", None)
        self._kopf = bool(self.S.get("kopf") and self.V.get("_spalten") and (self.erster or (fr is not None and fr._atTop)))
        self._px = 1.5 * mm if self.V.get("kasten") or self.V.get("band") else 0   # mit Kasten/Band: innen etwas Rand
        if self._teile is None:
            self._teile, self._hoehe = self._setzen(aW - 2 * self._px)
        self.width = aW
        self._kh = self._kopfhoehe() if self._kopf else 0
        pad = 1.2 * mm if self.V.get("kasten") or self.V.get("band") else 0.6 * mm
        self.height = self._kh + self._hoehe + 2 * pad
        self._pad = pad
        return aW, self.height

    def getSpaceBefore(self):
        return 0 if self.fortsetzung else float(self.V.get("abstand") or 0) * mm

    def split(self, aW, aH):
        self.wrap(aW, aH)
        if self.height <= aH:
            return [self]
        cut = aH - self._kh - 2 * self._pad
        if cut <= 6 * mm:
            return []
        A, B = [], []
        for t in self._teile:
            if t["y"] + t["h"] <= cut + 0.01:
                A.append(t); continue
            if t["y"] >= cut - 0.01:
                B.append({**t, "y": t["y"] - cut}); continue
            f = t["f"]
            stuecke = f.split(t["w"], cut - t["y"]) if isinstance(f, Paragraph) else []
            if len(stuecke) == 2:   # Text über den Seitenrand: oben weiter, Rest auf der nächsten Seite
                _, h1 = stuecke[0].wrap(t["w"], 10 ** 6); _, h2 = stuecke[1].wrap(t["w"], 10 ** 6)
                A.append({**t, "f": stuecke[0], "h": h1}); B.append({**t, "f": stuecke[1], "h": h2, "y": 0})
            else:   # Bild, Fotozeile, einzelne Zeile: ganz auf die nächste Seite
                B.append({**t, "y": 0 if t["y"] < cut else t["y"] - cut})
        if not A:
            return []
        if B:   # Fortsetzung: Lücken oben schließen, Reihenfolge und Abstände untereinander bleiben
            m = min(t["y"] for t in B)
            B = [{**t, "y": t["y"] - m} for t in B]
        hA = max(t["y"] + t["h"] for t in A)
        a = Block(self.V, self.inhalte, self.S, _teile=A, _hoehe=hA, fortsetzung=self.fortsetzung, erster=self.erster)
        if not B:
            return [a]
        return [a, Block(self.V, self.inhalte, self.S, _teile=B, _hoehe=max(t["y"] + t["h"] for t in B), fortsetzung=True)]

    # ---------- Spaltenköpfe ----------
    def _kopfhoehe(self):
        return 5.5 * mm

    def _kopf_zeichnen(self, c, top):
        S, f = self.S, (self.width - 2 * self._px) / ((float(self.V.get("_kbreite") or self.V.get("breite") or 0) * mm) or self.width)
        c.setFont(S["schrift"]["b"], 7.5); c.setFillColor(S["mute"])
        y = top - 3.6 * mm
        for x, w, t, a in self.V["_spalten"]:
            x, w = self._px + x * mm * f, w * mm * f
            if a == "rechts":
                c.drawRightString(x + w, y, t)
            elif a == "mitte":
                c.drawCentredString(x + w / 2, y, t)
            else:
                c.drawString(x, y, t)
        c.setStrokeColor(S["ink"]); c.setLineWidth(0.6); c.line(0, top - self._kh + 0.8 * mm, self.width, top - self._kh + 0.8 * mm)

    # ---------- Zeichnen ----------
    def draw(self):
        c, V, S, H = self.canv, self.V, self.S, self.height
        if self._kopf:
            self._kopf_zeichnen(c, H)
        top = H - self._kh
        hb = top
        if V.get("band"):
            c.setFillColor(S["band"]); c.rect(0, 0, self.width, hb, stroke=0, fill=1)
        if V.get("kasten"):
            c.setStrokeColor(S["linie"]); c.setLineWidth(0.5); c.rect(0, 0, self.width, hb, stroke=1, fill=0)
        elif V.get("linie"):
            c.setStrokeColor(S["linie"]); c.setLineWidth(0.3); c.line(0, 0, self.width, 0)
        for t in self._teile:
            t["f"].wrap(t["w"], 10 ** 6)
            t["f"].drawOn(c, self._px + t["x"], top - self._pad - t["y"] - t["h"])


def spalten(V):
    """Spaltenköpfe aus der Vorlage: [(x, w, Text, Ausrichtung)] – Elemente mit „kopf“."""
    return [(float(e.get("x") or 0), float(e.get("w") or 0), e["kopf"], e.get("ausrichtung") or "links")
            for e in V.get("elemente") or [] if e.get("kopf")]


def block(V, inhalte, S, erster=False, kopf_von=None):
    """kopf_von: Vorlage, aus der die Spaltenköpfe kommen (z. B. die Position auch über einer Titelzeile)."""
    V = dict(V); V["_spalten"] = spalten(kopf_von or V); V["_kbreite"] = float((kopf_von or V).get("breite") or V.get("breite") or 0)
    return Block(V, inhalte, S, erster=erster)


def vorlage(lay_data, name, std):
    """Vorlage aus dem Druck-Layout – fehlt sie (ältere Layouts), gilt die Vorgabe."""
    v = ((lay_data or {}).get("vorlagen") or {}).get(name)
    return v if isinstance(v, dict) and v.get("elemente") else std
