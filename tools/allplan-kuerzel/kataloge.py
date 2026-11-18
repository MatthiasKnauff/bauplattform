"""Kleine Allplan-Kundenkataloge kukat1–5 für die Kürzel aus dem Plan (Konzept vom 18.11.2026, bpcore/kuerzel.py).

Statt hunderter fertiger Aufbauten nur die Bausteine, die der Zeichner an ein Bauteil schreibt – und je Katalog ein paar Beispiele:
  Lage (freiwillig) · Kern · Schichten   →   z. B. „AW KS WDVS putz innenputz“
Kurztext = Kürzel mit Bedeutung in Klammern, z. B. „AW (Außenwand)“ – die Klammer überliest das Portal (kuerzel.normal);
ausführlicher steht es im Langtext. Bei mehrschichtigen Bauteilen
je Schicht ein Wort wählen – das Portal liest die Schichten in ihrer Reihenfolge zusammen.

Aufruf:  python3 tools/allplan-kuerzel/kataloge.py <Ziel.zip>
Format wie der große Katalog (bpcore/baudaten.allplan_katalog): KUKATn.KAT „*“ = Verzeichnis, Dateien kNN.kat „#“ = Einträge,
.KTX Langtext (40 Zeichen je Zeile, um 18 eingerückt), cp1252, CRLF.
"""
import io
import os
import sys
import textwrap
import zipfile

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "shared"))
from bpcore import kuerzel as K  # noqa: E402

L_, KE, S_ = K.LAGE, K.KERN, K.SCHICHT
lage = lambda k: (k.upper(), L_[k][0], f"Lage: {L_[k][0]} (freiwillig – die Art kommt aus dem Bauteil)")   # noqa: E731
kern = lambda k, t=None: (k.upper() if len(k) <= 3 else k, t or KE[k][0], f"Kern: {t or KE[k][0]} – Dicke aus dem Plan")   # noqa: E731
sch = lambda k, wo="": (k, S_[k][0] + (f", {wo}" if wo else ""), f"Schicht: {S_[k][0]}" + (f" ({wo})" if wo else ""))   # noqa: E731

KATALOGE = [   # (Ordner, Titel, Bauteilart für die Probe, [(Gruppe, [(Kürzel, Erklärung)])])
    ("kukat1", "Wände", "Wand", [
        ("Beispiele", [("AW KS WDVS putz innenputz", "Außenwand KS, außen WDVS mit Putz, innen Innenputz"),
                       ("AW HLZ leichtputz gipsputz", "Außenwand Ziegel monolithisch, außen Leichtputz, innen Gipsputz"),
                       ("IW KS putz", "Innenwand KS, beidseitig Putz"),
                       ("IW GK", "Trockenbauwand (Metallständer)"),
                       ("WTW KS putz fliese", "Wohnungstrennwand, Fliese steht nur innen – Bad-Seite"),
                       ("AW1", "Nur ein Name: den Aufbau einmal im Portal festlegen – danach kennt das Büro „AW1“")]),
        ("Lage (freiwillig)", [lage(k) for k in ("aw", "iw", "kw", "tw", "wtw", "gw")]),
        ("Kern", [kern(k) for k in ("ks", "pp", "hlz", "ssz", "stb", "gk", "lb", "hrb")]),
        ("Schichten", [sch("wdvs", "außen"), sch("klinker", "außen"), sch("kerndaemmung", "außen"), sch("leichtputz", "außen"), sch("putz", "beidseitig"),
                       sch("gipsputz", "innen"), sch("innenputz", "innen"), sch("fliese", "innen"), sch("anstrich"), sch("tapete", "innen")])]),
    ("kukat2", "Decken, Böden, Gründung", "Decke", [
        ("Beispiele", [("DE STB estrich trittschall parkett gipsputz", "Geschossdecke Stahlbeton, oben Parkett auf Estrich, unten Gipsputz"),
                       ("BP STB perimeter abdichtung estrich fliese", "Bodenplatte mit Perimeterdämmung und Fliesen"),
                       ("DE STB estrich fbh fliese", "Decke mit Fußbodenheizung – FBH geht zur Heizung (KG 423)"),
                       ("DE holz estrich vinyl", "Holzbalkendecke mit Trockenestrich und Vinyl")]),
        ("Lage (freiwillig)", [lage(k) for k in ("de", "bp", "fu")]),
        ("Kern", [kern("stb"), kern("holz"), kern("bsp")]),
        ("Schichten", [sch(k) for k in ("estrich", "trittschall", "fbh", "parkett", "fliese", "laminat", "vinyl", "linoleum", "teppich", "perimeter",
                                        "abdichtung", "gipsputz", "anstrich")])]),
    ("kukat3", "Dächer", "Dach", [
        ("Beispiele", [("SD holz zwischensparren dachziegel gipsputz", "Steildach: Holzsparren mit Zwischensparrendämmung, Dachziegel, innen Gipsputz"),
                       ("FD STB bitumen kies", "Flachdach Stahlbeton, Bitumenabdichtung, Kies"),
                       ("FD STB bitumen begruenung", "Gründach")]),
        ("Lage (freiwillig)", [lage(k) for k in ("fd", "sd")]),
        ("Kern", [kern("stb"), kern("holz"), kern("bsp")]),
        ("Schichten", [sch(k) for k in ("sparren", "zwischensparren", "dachziegel", "bitumen", "kies", "begruenung", "eps", "mineralwolle", "gipsputz")])]),
    ("kukat4", "Raumausbau (Boden, Wand, Decke im Raum)", "Bekleidung", [
        ("Beispiele", [("fliese", "Bad: Wandfliesen bzw. Bodenfliesen"), ("putz anstrich", "Wand im Raum: Putz und Anstrich"),
                       ("estrich parkett", "Boden im Raum"), ("sockelleiste", "Leiste (Sockel) – Menge in m")]),
        ("Schichten", [sch(k) for k in ("putz", "gipsputz", "anstrich", "tapete", "raufaser", "fliese", "estrich", "parkett", "laminat", "vinyl",
                                        "teppich", "sockelleiste", "naturstein")])]),
    ("kukat5", "Weitere (Stütze, Treppe, Fundament)", "Treppe", [
        ("Beispiele", [("TR STB fliese", "Treppe Stahlbeton mit Fliesenbelag"), ("FU STB", "Fundament Stahlbeton"), ("STB", "Stütze Stahlbeton")]),
        ("Lage (freiwillig)", [lage(k) for k in ("tr", "fu")]),
        ("Kern", [kern("stb"), kern("holz"), kern("bsp")]),
        ("Schichten", [sch(k) for k in ("fliese", "naturstein", "anstrich", "putz")])]),
]

HILFE = """Kuerzel-Kataloge der Bauplattform fuer Allplan (klein)

Statt fertiger Aufbauten schreibt man an das Bauteil, wie es aufgebaut ist:
   Lage (freiwillig)  Kern  Schichten          z. B.  AW KS WDVS putz innenputz
Gross/klein egal, Tippfehler bis 1 Buchstabe werden erkannt, die Dicke kommt aus dem Plan.
Was vor dem Kern steht, ist aussen; was es nur innen gibt (Gipsputz, Fliese, Tapete), beginnt die Innenseite.

Zwei Wege:
 - Einschichtiges Bauteil: unter Material/Qualitaet ein Beispiel waehlen oder das Kuerzel selbst eintippen.
 - Mehrschichtiges Bauteil: je Schicht ein Wort waehlen (Kern, WDVS, Putz ...) - das Portal liest die Schichten
   in ihrer Reihenfolge zusammen.

Was das Portal erkannt hat, zeigt es im Gebaeudemodell -> Bauteile ("So verstanden") - bitte bestaetigen.
Bestaetigte Kuerzel merkt sich das Buero (beim naechsten Mal "1x im Buero").

Einrichten (einmal):
1. Die Ordner kukat1 ... kukat5 in den Buerostandard kopieren (...\\Allplan\\Daten\\std\\) - vorhandene vorher sichern
   (es sind dieselben Ordner wie beim grossen Bauteilkatalog; nur einer von beiden kann aktiv sein).
2. Allplan: Optionen -> Kataloge -> Katalogzuordnung:
     Wand -> 1, Decke/Bodenplatte -> 2, Dach -> 3, Raum-/Flaechenausbau -> 4, Sonstiges -> 5.
   Fenster und Tueren brauchen kein Kuerzel (sie kommen ueber die Fenster- & Tuerliste).
"""


def bauen():
    ers = lambda t: (str(t).replace("–", "-").replace("„", '"').replace("“", '"').replace("→", "->"))   # noqa: E731
    enc = lambda t: str(t).encode("cp1252", "replace")   # noqa: E731
    crlf = lambda L: b"\r\n".join(L) + b"\r\n"   # noqa: E731
    zeile = lambda ref, t: enc(ref.ljust(18) + str(t)[:60].ljust(60))   # noqa: E731
    buf, probe = io.BytesIO(), []
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        for key, titel, art, gruppen in KATALOGE:
            stamm = [b"*", b"REFNAM            KURZT", b""]
            for gn, (gname, eintraege) in enumerate(gruppen, 1):
                dn = f"k{key[-1]}{gn:02d}"
                stamm.append(zeile(dn, ers(gname)))
                kat, ktx = [b"#", b"REFNAM            KURZT", b""], [b"#", b"REFNAM            LANGT", b""]
                for en, x in enumerate(eintraege, 1):
                    kz, kurz, erkl = x if len(x) == 3 else (x[0], x[1], x[1])
                    ref = f"{dn}{en:02d}"
                    platz = 60 - len(kz) - 3   # Bedeutung in Klammern dahinter – das Portal überliest sie
                    kurz = kurz.replace(" (", ", ").replace(")", "")   # keine Klammer in der Klammer
                    b = ers(kurz) if len(ers(kurz)) <= platz else ers(kurz)[:max(0, platz - 1)].rsplit(" ", 1)[0].rstrip(",;:") + "…"
                    kat.append(zeile(ref, f"{kz} ({b})" if platz > 8 else kz))
                    ktx.append(enc(ref.ljust(18)))
                    ktx += [enc(" " * 18 + x[:40]) for x in textwrap.wrap(ers(erkl), 40)]
                    if gname == "Beispiele":
                        zz = K.zerlegen(kz, art)
                        probe.append((key, kz, K.stufe(zz), zz["unbekannt"]))
                z.writestr(f"{key}/{dn}.kat", crlf(kat))
                z.writestr(f"{key}/{dn}.ktx", crlf(ktx))
            N = key.upper()
            z.writestr(f"{key}/{N}.KAT", crlf(stamm))
            z.writestr(f"{key}/{N}.KTX", crlf([b"#", b"REFNAM            LANGT", b""]))
            z.writestr(f"{key}/{N}.KTM", crlf([b">", b"REFNAM             KUPD GEW ABR PRIOR SCH     DICKE LAYER BER SMF", b"", b""]))
        z.writestr("LIESMICH.txt", HILFE.replace("\n", "\r\n").encode("cp1252"))
    return buf.getvalue(), probe


if __name__ == "__main__":
    daten, probe = bauen()
    for key, kz, st, unb in probe:
        print(f"{key}  {kz:<46} {st}{'  unbekannt: ' + ', '.join(unb) if unb else ''}")
    open(sys.argv[1] if len(sys.argv) > 1 else "kuerzel-kataloge.zip", "wb").write(daten)
