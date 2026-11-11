"""Stempel des Büros (Bürostempel, Prüfstempel, „Zahlbetrag siehe Anlage“) – liegen in der Datenbank (bp_store „stempel:<art>“),
nie im Repo. Hochgeladen unter Verwaltung → Büro-Einstellungen → Firma & Logo; eingesetzt in der PDF-Vorschau (✍ → Stempel),
leicht schräg wie ein echter Stempel (bpcore.unterschrift.stempeln mit drehung)."""
import base64, io

from . import konto

ARTEN = (("buero", "Bürostempel", "Firmenstempel für Schreiben, Abnahmen, Freigaben"),
         ("pruef", "Prüfstempel", "„sachlich und rechnerisch geprüft“ – für Rechnungen und Aufmaße"),
         ("zahlbetrag", "Zahlbetrag siehe Anlage", "für Rechnungen, deren Betrag in der Prüfanlage steht"))
NAMEN = {k: n for k, n, _ in ARTEN}
# Felder, die beim Einsetzen ausgefüllt werden: (Platzhalter, x, y, Schrifthöhe – Anteile am Stempelbild, Neigung in Grad im Uhrzeigersinn)
# Prüfstempel des Büros: „geprüft am:“ oben, darunter das Datum; „von:“ unten, rechts daneben der Name (der Stempel steht leicht schräg)
FELDER = {"pruef": (("{datum}", 0.22, 0.50, 0.12, 8), ("{name}", 0.30, 0.80, 0.08, 8))}


def aufbereiten(raw):
    """Foto oder Scan eines Stempels → PNG mit durchsichtigem Grund, Farbe bleibt (Stempelfarbe), zugeschnitten, höchstens 900 px."""
    from PIL import Image, ImageOps
    try:
        im = ImageOps.exif_transpose(Image.open(io.BytesIO(raw)))
    except Exception:
        raise ValueError("Das Bild konnte nicht gelesen werden (PNG, JPG oder WEBP).")
    im = im.convert("RGBA")
    im.thumbnail((1600, 1600))
    if im.getextrema()[3][0] == 255:   # kein durchsichtiger Grund: Weiß/Papier ausblenden, Farbe behalten
        px = im.load()
        for y in range(im.height):
            for x in range(im.width):
                r, g, b, _ = px[x, y]
                hell = min(r, g, b)
                px[x, y] = (r, g, b, 0 if hell > 225 else 255 if hell < 150 else int((225 - hell) * 255 / 75))
    box = im.getchannel("A").point(lambda v: 255 if v > 20 else 0).getbbox()
    if not box:
        raise ValueError("Auf dem Bild wurde kein Stempel erkannt.")
    im = im.crop(box)
    if im.width > 900:
        im = im.resize((900, max(1, round(im.height * 900 / im.width))), Image.LANCZOS)
    buf = io.BytesIO(); im.save(buf, "PNG", optimize=True)
    return buf.getvalue()


def holen(c, art):
    raw = konto._get(c, f"stempel:{art}") if art in NAMEN else None
    return base64.b64decode(raw) if raw else None


def speichern(c, art, png, wer=""):
    konto._put(c, f"stempel:{art}", base64.b64encode(png).decode(), wer)


def loeschen(c, art):
    c.execute("DELETE FROM bp_store WHERE key=?", (f"stempel:{art}",))


def liste(c):
    da = {r["key"][8:] for r in c.execute("SELECT key FROM bp_store WHERE key LIKE 'stempel:%'").fetchall()}
    return [{"art": k, "name": n, "text": t, "vorhanden": k in da} for k, n, t in ARTEN]
