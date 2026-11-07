"""Bauplattform-Chronik: Protokoll aller Builds aus dem Git-Verlauf (Tags = freigegebene Builds) als eine HTML-Seite.
Aufruf im Repository:  python3 tools/chronik/chronik.py AUSGABE.html
Markierungen (neue Apps, wichtige Funktionen) stehen in markierung.json; die Seite selbst in vorlage.html."""
import json, os, re, subprocess, sys

HIER = os.path.dirname(os.path.abspath(__file__))
WEG = re.compile(r"^(Testserver:|Produktiv:|Merge |Chronik:)")
APPS = [("Bautagebuch", r"Bautagebuch|Tagesbericht|Anwesende|Vor Ort|Vor-Ort"),
        ("Bauzeitenplan", r"Bauzeitenplan|Planungsassistent|Leistungs-Assistent|Assistent einrichten|Gebäudetyp"),
        ("Baukosten", r"Baukosten|Kostenermittlung|Raumbuch|DIN 276"),
        ("Ausschreibung & Abrechnung", r"\bAVA\b|\bLV\b|LV-|Türliste|Aufmaß|Rechnung|Kopierquelle|Ausschreibung|Abrechnung|Positionskatalog|Vergabe|Skonto"),
        ("Baudaten", r"Baudaten"), ("Adressen", r"Adressen|Kontakt|Duplikat"),
        ("Planstand & Versand", r"Planstand|Planversand|Plan-Ansicht|Planansicht|Pläne|[Mm]arkier"),
        ("Aufgaben & Mängel", r"To-do|Mängel|Erinnerung|Rüge|Aufgabe"), ("Startseite & Post", r"Startseite|Post|Posteingang|Mails? "),
        ("Kommunikation", r"Kommunikation"),
        ("Verwaltung & System", r"Verwaltung|Datensicherung|Fehlermeldung|Rauchtest|Mailserver|Papierkorb|Datenbank|Versionierung|Druck-Layout|Kontextmenü|Rechte Maustaste")]


def git(*a):
    return subprocess.run(("git",) + a, capture_output=True, text=True, check=True).stdout


def main(ziel):
    M = json.load(open(os.path.join(HIER, "markierung.json"), encoding="utf-8"))
    tags = []
    for z in git("tag", "-l", "--sort=creatordate", "--format=%(refname:short)|%(creatordate:iso-strict)").splitlines():
        n, d = z.split("|")
        tags.append((n, d, git("rev-list", "-n1", n).strip()))
    log = [z.split("\x1f") for z in git("log", "--reverse", "--format=%H\x1f%aI\x1f%s").splitlines()]
    idx = {h: i for i, (h, _, _) in enumerate(log)}
    gruppen, vor = [], -1
    for n, d, c in tags:
        i = idx.get(c)
        if i is None or i <= vor:
            continue
        gruppen.append((n, d, log[vor + 1:i + 1])); vor = i
    if log[vor + 1:]:
        gruppen.append(("(noch nicht freigegeben)", log[-1][1], log[vor + 1:]))
    builds = []
    for n, d, cs in gruppen:
        neu_app, out = "", []
        for h, cd, s in cs:
            if WEG.match(s):
                continue
            s = re.sub(r"^2026\.\d+\.\d+:\s*", "", s)
            m = re.search(r"Neue App „([^“]+)“", s)
            neu = bool(m) or (n in M["neu"] and M["neu"][n][1] in s)
            if neu:
                neu_app = M["neu"][n][0] if n in M["neu"] else m.group(1)
            w = not neu and any(k in s for k in M["wichtig"])
            out.append({"h": h[:7], "d": cd, "s": s, "neu": neu, "w": w, "apps": [a for a, rx in APPS if re.search(rx, s)] or ["Plattform"]})
        if out:
            builds.append({"tag": n, "date": d, "neuApp": neu_app, "c": out})
    daten = json.dumps(builds, ensure_ascii=False).replace("</", "<\\/")
    open(ziel, "w", encoding="utf-8").write(open(os.path.join(HIER, "vorlage.html"), encoding="utf-8").read().replace("__DATA__", daten))
    print(f"{ziel}: {len(builds)} Builds, {sum(len(b['c']) for b in builds)} Änderungen")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "bauplattform-chronik.html")
