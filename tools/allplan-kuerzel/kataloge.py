"""Kleine Allplan-Kundenkataloge kukat1–5 für die Kürzel aus dem Plan (Konzept vom 18.11.2026, bpcore/kuerzel.py).

Statt hunderter fertiger Aufbauten nur die Bausteine, die der Zeichner an ein Bauteil schreibt – und je Katalog ein paar Beispiele:
  Lage (freiwillig) · Kern · Schichten   →   z. B. „AW KS WDVS putz innenputz“
Der Kurztext ist genau das Kürzel (er landet im IFC am Material); die Erklärung steht im Langtext. Bei mehrschichtigen Bauteilen
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
lage = lambda k: (k.upper(), f"Lage: {L_[k][0]}")   # noqa: E731
kern = lambda k, t=None: (k.upper() if len(k) <= 3 else k, f"Kern: {t or KE[k][0]} – Dicke aus dem Plan")   # noqa: E731
sch = lambda k, wo="": (k, f"Schicht: {S_[k][0]}" + (f" ({wo})" if wo else ""))   # noqa: E731

E = lambda *w: [(x, {**{k: f"Lage: {v[0]}" for k, v in L_.items()}, **{k: f"Kern: {v[0]} – Dicke aus dem Plan" for k, v in KE.items()},   # noqa: E731
                         **{k: f"Schicht: {v[0]}" for k, v in S_.items()}}.get(x.lower(), x)) for x in w]   # einzelne Wörter für mehrschichtige Bauteile
KATALOGE = [   # (Ordner, Titel, Bauteilart für die Probe, [(Gruppe, [(Kürzel, Erklärung)])]) – je Katalog 7–15 Einträge
    ("kukat1", "Wände", "Wand", [
        ("Beispiele", [("AW KS WDVS putz innenputz", "Außenwand KS: außen WDVS mit Putz, innen Innenputz"),
                       ("AW klinker kerndaemmung KS innenputz", "Was vor dem Kern steht, ist außen: Klinker und Kerndämmung außen, innen Innenputz"),
                       ("AW HLZ leichtputz gipsputz", "Ziegel monolithisch: außen Leichtputz, innen Gipsputz"),
                       ("KW STB perimeter abdichtung innenputz", "Kelleraußenwand"),
                       ("IW KS putz", "Innenwand KS, beidseitig Putz"),
                       ("IW GK", "Trockenbauwand (Metallständer)"),
                       ("WTW KS putz fliese", "Fliese gibt es nur innen – ab dort ist die Bad-Seite"),
                       ("AW1", "Nur ein Name: Aufbau einmal im Portal festlegen – danach kennt das Büro „AW1“")]),
        ("Einzelne Schichten", E("KS", "WDVS", "putz", "gipsputz"))]),
    ("kukat2", "Decken, Böden, Gründung", "Decke", [
        ("Beispiele", [("DE STB estrich trittschall parkett gipsputz", "Geschossdecke: oben Parkett auf Estrich, unten Gipsputz"),
                       ("DE STB estrich fbh fliese", "Fußbodenheizung wird erkannt und geht zur Heizung (KG 423)"),
                       ("DE holz estrich vinyl", "Holzbalkendecke mit Estrich und Vinyl"),
                       ("BP STB perimeter abdichtung estrich fliese", "Bodenplatte mit Perimeterdämmung"),
                       ("FU STB", "Fundament Stahlbeton"),
                       ("DE1", "Nur ein Name – Aufbau einmal im Portal festlegen")]),
        ("Einzelne Schichten", E("STB", "estrich", "trittschall", "parkett"))]),
    ("kukat3", "Dächer", "Dach", [
        ("Beispiele", [("SD holz zwischensparren dachziegel gipsputz", "Steildach: Holzsparren, Zwischensparrendämmung, Ziegel, innen Gipsputz"),
                       ("FD STB eps bitumen kies", "Flachdach: Dämmung, Bitumenabdichtung, Kies"),
                       ("FD STB bitumen begruenung", "Gründach"),
                       ("SD1", "Nur ein Name – Aufbau einmal im Portal festlegen")]),
        ("Einzelne Schichten", E("holz", "zwischensparren", "dachziegel", "bitumen"))]),
    ("kukat4", "Raumausbau (Boden, Wand, Decke im Raum)", "Bekleidung", [
        ("Beispiele", [("fliese", "Bad: Wand- bzw. Bodenfliesen"), ("putz anstrich", "Wand im Raum: Putz und Anstrich"),
                       ("gipsputz tapete", "Wand im Raum: Gipsputz und Tapete"), ("estrich parkett", "Boden im Raum"),
                       ("estrich fliese", "Boden im Bad"), ("vinyl", "Belag Vinyl"), ("sockelleiste", "Leiste – Menge in m"),
                       ("naturstein", "Naturstein (Boden oder Fensterbank)")])]),
    ("kukat5", "Weitere (Stütze, Treppe, Fundament)", "Treppe", [
        ("Beispiele", [("TR STB fliese", "Treppe Stahlbeton mit Fliesenbelag"), ("TR STB naturstein", "Treppe mit Natursteinbelag"),
                       ("TR holz", "Holztreppe"), ("STB", "Stütze Stahlbeton"), ("holz", "Stütze Holz"), ("STB anstrich", "Stütze mit Anstrich"),
                       ("FU STB", "Fundament Stahlbeton")])]),
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
    ers = lambda t: (str(t).replace("–", "-").replace("„", '"').replace("“", '"').replace("ä", "ae").replace("ö", "oe").replace("ü", "ue")
                     .replace("Ä", "Ae").replace("Ö", "Oe").replace("Ü", "Ue").replace("ß", "ss").replace("→", "->"))   # noqa: E731
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
                for en, (kz, erkl) in enumerate(eintraege, 1):
                    ref = f"{dn}{en:02d}"
                    kat.append(zeile(ref, kz))   # Kurztext = genau das Kürzel (landet im IFC am Material)
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
