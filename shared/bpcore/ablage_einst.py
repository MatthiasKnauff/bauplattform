"""Was die Apps auf dem Dateiserver ablegen – Einstellungen je App (beschlossen am 17.11.2026).

Der Zugang zum Dateiserver (Server, Freigabe, Benutzer, Kennwort) bleibt in der Verwaltung → Ablage & Server und gilt für alle.
Wohin und unter welchem Namen eine App ablegt, steht in den Einstellungen der App (Baustein head/ablageeinst.js):

  bautagebuch  Ordner für Fotos und Berichte, alte Stände
  ava          Namen der PDFs, Eingangsordner (Scans vom Kopierer)
  baudaten     Allplan-Bürostandard
  wiki         Wiki-Ordner und Sicherung auf der Freigabe „Bauportal“ (bis 17.11.2026 fest im Programm)
  bauherren    Ordner „Von Bauherrschaft“ im Projektordner (bis 17.11.2026 fest)
  personal     Ordner der Personalakte (bis 17.11.2026 fest)
  plaene       Ordner der Büro-Vorlagen (Bauportal Office, 17.11.2026), Wurzel der Benutzerordner („Mein Ordner“, 19.11.2026)
  waermeschutz Ordner des Wärmeschutznachweises im Projektordner (19.11.2026)

Die Werte liegen in der zentralen Tabelle settings (bpcore/einstellungen.py, Block „ablage“ der Rechte). Wird ein Ordnername
geändert und soll der vorhandene Ordner mitwandern, merkt sich der Kern einen Auftrag („ablage:umbenennen“); den führt der
Container „dienste“ aus (bautagebuch/core/ablage_umbenennen.py) – nur er erreicht den Dateiserver, der Testserver nie.
"""
import json
import time

from flask import jsonify, request

from . import db, einstellungen, rechte
from .personal import AKTE_ORDNER

PLATZ = ("Platzhalter: {projekt} Projektordner, {kuerzel} erstes Wort des Projektnamens (z. B. A483), {datum}, {jahr}, {monat}. "
         "Mit „/“ trennst du Unterordner.")

# app → (Titel, Erklärung, braucht Ablage?, Felder) · Feld: (Schlüssel, Beschriftung, Art, Vorgabe, Auswahl, Ordner wandert mit?)
APPS = {
    "bautagebuch": ("Ablage der Berichte und Fotos", "Fotos und PDFs des Bautagebuchs landen automatisch in den Projektordnern. " + PLATZ, True, [
        ("store_tpl_photos", "Ordner für Fotos", "text", "{projekt}/{kuerzel} 8. Fotos + Bautagebuch/{kuerzel} Fotos/{datum}", None, False),
        ("store_folder_desc", "Name des Fototag-Ordners", "auswahl", "1",
         [["1", "beschreibend: Datum + Gewerke der Anwesenden + erste drei Fotonamen"], ["0", "nur das Datum"]], False),
        ("store_tpl_pdf", "Ordner für Bautagebuch-PDFs", "text", "{projekt}/{kuerzel} 8. Fotos + Bautagebuch/{kuerzel} Bautagebuch", None, False),
        ("store_old_mode", "Bei erneutem PDF-Export", "auswahl", "behalten",
         [["behalten", "alten Stand als „…_old1“ aufheben"], ["ersetzen", "alten Stand ersetzen (keine „_old“-Kopien)"]], False),
        ("store_keep_old_photos", "Alte Fototag-Ordner behalten (0 = alle)", "zahl", "0", None, False),
        ("store_keep_old_pdf", "Alte Bautagebuch-PDFs behalten (0 = alle)", "zahl", "0", None, False),
    ]),
    "ava": ("Ablage", "Namen der PDFs (Rechnungsfreigabe, Prüfblatt, LV, Preisspiegel, Massenermittlung) beim Anzeigen, Herunterladen und "
            "Ablegen. Platzhalter: {projektnr} (A481 – vorne aus dem Projektnamen), {projekt}, {art}, {firma}, {lv} (Nr. und Name), {lvnr}, "
            "{lvname}, {zusatz} (z. B. „1. Schlussrechnung Nr. 4711“), {datum}. Leere Teile fallen samt Trennzeichen weg.", False, [
        ("pdf_name_tpl", "Namen der PDFs", "text", "{projektnr} {art} {firma} – LV {lv} – {zusatz}", None, False),
        ("eingang_unc", "Eingangsordner (Scans vom Kopierer …; leer = aus) – beim Wechsel in die Ausschreibung fragt ein kleines Fenster, "
                        "welche Dateien verarbeitet werden; erledigte wandern nach „verarbeitet“", "text", "", None, False),
    ]),
    "baudaten": ("Ablage", "Wohin die Bauteilkataloge für Allplan geschrieben werden.", False, [
        ("allplan_unc", "Allplan-Bürostandard (leer = aus), z. B. \\\\server\\Allplan", "text", "", None, False),
    ]),
    "wiki": ("Ablage", "Dateien des Wikis liegen auf der Freigabe „Bauportal“ (je Kapitel ein Unterordner); die Sicherung des Wikis "
             "(Datenbankauszug, wiki.json, Notfallpaket) ebenfalls dort.", False, [
        ("ordner_wiki", "Ordner der Wiki-Dateien", "text", "02 Wiki", None, True),
        ("ordner_wiki_sicherung", "Ordner der Wiki-Sicherung", "text", "06 Sicherung/Wiki", None, True),
    ]),
    "bauherren": ("Ablage", "Dateien, die Bauherr:innen im Portal hochladen, holt der Kern ab und legt sie im Projektordner in diesen "
                  "Unterordner (mit Datum und Uhrzeit vorn).", True, [
        ("ordner_bauherren", "Ordner im Projektordner", "text", "Von Bauherrschaft", None, True),
    ]),
    "plaene": ("Ablage", "Büro-Vorlagen für „＋ Neu“ in „Alle Dateien“ (Word, Excel, OpenDocument) – Ordner in der Ablage, mit „/“ getrennt "
               "(nicht im Projektordner). Frühere Fassungen bearbeiteter Dateien liegen je Ordner unter „_Fassungen“.", True, [
        ("ordner_vorlagen", "Ordner der Büro-Vorlagen", "text", "Büro/Vorlagen", None, False),
        ("ordner_benutzer", "Ordner der Benutzerordner („Mein Ordner“ – darin wählt jede:r in Mein Konto den eigenen Unterordner)", "text", "Mitarbeiter", None, False),
    ]),
    "waermeschutz": ("Ablage", "Wohin „📁 Ablegen“ den Wärmeschutznachweis als PDF legt – Ordner im Projektordner, mit „/“ getrennt. "
                     "Der Name beginnt mit „Wärmeschutznachweis“ – so findet ihn der Bauantrag als Anlage.", True, [
        ("ordner_waerme", "Ordner im Projektordner", "text", "Bauantrag/Nachweise", None, False),
    ]),
    "personal": ("Ablage", "Beim ersten Öffnen einer Personalakte legt die App unter „Büro/Personal/<Name>“ diese Ordner an – "
                 "eine Zeile je Ordner.", True, [
        ("ordner_personal", "Ordner der Personalakte", "zeilen", "\n".join(AKTE_ORDNER), None, True),
    ]),
}
ORDNER_KEYS = tuple(f[0] for a in APPS.values() for f in a[3] if f[5])
VORGABE = {f[0]: f[3] for a in APPS.values() for f in a[3]}
VERBOTEN = '<>:"|?*\\'


def wert(conf, key):
    """Eingestellter Wert oder die Vorgabe (conf = alle Einstellungen, z. B. einstellungen.alle(c))."""
    v = (conf or {}).get(key)
    return v if v not in (None, "") or key not in ORDNER_KEYS else VORGABE.get(key, "")


def ordner(conf, key):
    """Ordnername (mit „/“ für Unterordner) als Liste der Teile; ordner_personal: je Zeile ein Name."""
    v = wert(conf, key) or ""   # leer/nicht gesetzt: Vorgabe (unten)
    if key == "ordner_personal":
        return [z.strip() for z in v.splitlines() if z.strip()] or list(AKTE_ORDNER)
    return [t.strip() for t in v.replace("\\", "/").split("/") if t.strip()] or [t for t in VORGABE[key].split("/")]


def _pruefe_ordner(key, v):
    teile = [z.strip() for z in v.splitlines()] if key == "ordner_personal" else [t.strip() for t in v.replace("\\", "/").split("/")]
    teile = [t for t in teile if t]
    if not teile:
        return "Bitte einen Ordnernamen eingeben."
    for t in teile:
        if t in (".", "..") or any(ch in t for ch in VERBOTEN) or t.endswith("."):
            return f"„{t}“ geht als Ordnername nicht (verboten: {' '.join(VERBOTEN)} und ein Punkt am Ende)."
    return ""


def beschreibung(c):
    """Für die Verwaltung: welche App was ablegt (Liste mit Sprung in die App-Einstellung)."""
    conf = einstellungen.alle(c)
    def zeige(f):
        v = wert(conf, f[0]) or f[3]
        return dict(f[4]).get(v, v) if f[4] else v
    return [{"app": k, "titel": t, "felder": [{"label": f[1], "wert": zeige(f)} for f in F]} for k, (t, _, _, F) in APPS.items()]


def auftraege(c, neu=None):
    r = c.execute("SELECT data FROM bp_store WHERE key='ablage:umbenennen'").fetchone()
    alt = json.loads(r["data"]) if r and r["data"] else []
    if neu is not None:
        c.execute("INSERT INTO bp_store(key,data) VALUES('ablage:umbenennen',?) ON CONFLICT(key) DO UPDATE SET data=excluded.data",
                  (json.dumps(neu, ensure_ascii=False),))
    return alt


def routen(bp, _uid):
    @bp.route("/api/bp/ablage-einst/<app>", methods=["GET", "PUT"])
    def ablage_einst(app):
        u, _ = _uid()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        if app not in APPS:
            return jsonify(error="Unbekannte App"), 404
        st = rechte.stufe(u, "ablage")
        if not st:
            return jsonify(error="Die Ablage-Einstellungen sieht nur, wer in der Verwaltung den Bereich „Ablage“ hat."), 403
        titel, text, braucht, F = APPS[app]
        with db.tx() as c:
            conf = einstellungen.alle(c)
            if request.method == "PUT":
                if st != "aendern":
                    return jsonify(error="Ändern darf nur, wer den Bereich „Ablage“ ändern darf."), 403
                b = request.get_json(silent=True) or {}
                werte = {k: str(v)[:500] for k, v in (b.get("werte") or {}).items() if k in {f[0] for f in F} and isinstance(v, (str, int))}
                job = []
                for k, v in werte.items():
                    if k in ORDNER_KEYS:
                        v = werte[k] = v.strip() if k != "ordner_personal" else "\n".join(z.strip() for z in v.splitlines() if z.strip())
                        fe = _pruefe_ordner(k, v)
                        if fe:
                            return jsonify(error=fe), 400
                        if v == VORGABE[k]:
                            werte[k] = ""   # Vorgabe: nichts speichern
                        a, n = ordner(conf, k), ordner({k: v}, k)
                        if a != n:
                            job.append({"key": k, "alt": a, "neu": n})
                einstellungen.aendern(c, werte, u["name"])
                if job and b.get("umbenennen"):
                    auftraege(c, auftraege(c) + [dict(j, wann=time.strftime("%Y-%m-%dT%H:%M:%S"), wer=u["name"]) for j in job])
                conf = einstellungen.alle(c)
            offen = [j for j in auftraege(c) if j.get("key") in {f[0] for f in F} and not j.get("fertig")]
            fertig = [j for j in auftraege(c) if j.get("key") in {f[0] for f in F} and j.get("fertig")][-3:]
        return jsonify(titel=titel, text=text, aendern=st == "aendern", ablage=(conf.get("store_mode") or "off") != "off" or not braucht,
                       felder=[{"key": f[0], "label": f[1], "art": f[2], "vorgabe": f[3], "opt": f[4], "ordner": f[5],
                                "wert": wert(conf, f[0]) if f[5] else (conf.get(f[0]) if conf.get(f[0]) not in (None, "") else f[3])} for f in F],
                       auftraege=offen + fertig)

    @bp.get("/api/bp/ablage-einst")
    def ablage_einst_alle():
        u, _ = _uid()
        if not u:
            return jsonify(error="Nicht angemeldet"), 401
        if not rechte.stufe(u, "ablage"):
            return jsonify(error="Kein Zugriff"), 403
        with db.tx() as c:
            return jsonify(apps=beschreibung(c))
