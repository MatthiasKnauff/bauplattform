"""Ordnungsprüfung der Bauplattform – läuft in GitHub Actions VOR dem Bau der Images (siehe .github/workflows/build.yml).

Prüft Regeln, die für den ganzen Code gelten, egal wer (welcher Chat) etwas ändert. Verletzt eine Änderung eine Regel,
wird nichts gebaut und nichts auf den Testserver gebracht. Die Regeln selbst stehen in CLAUDE.md.

  1. Keine heiklen Dateien im Repo (lizenzierte Kataloge, PDFs, Bilder, Schlüssel, Sicherungen …)
  2. Keine System-Rückfragen (confirm/prompt) – immer bpFrage/bpEingabe
  3. Keine Kopien der Grundhilfen aus dem Baukasten (shared/bpcore/head) in den Apps
  4. Keine Inline-Handler (onclick= …) in Seiten
  5. Neue Dateien höchstens GRENZE Zeilen; die großen Altdateien dürfen nicht weiter wachsen als ihr Spielraum

Altlasten stehen unten in ALT_* – sie werden beim Aufräumen kleiner, neue kommen nicht dazu.
Aufruf:  python3 tools/tests/ordnung.py        (nur Standardbibliothek; Rückgabewert 0 = alles in Ordnung)
"""
import os, re, subprocess, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

# ---- 1. heikle Dateien: dürfen nie ins Repo (Kataloge sind lizenziert, Briefbogen mit Bankdaten, Screenshots, Schlüssel …)
VERBOTEN = re.compile(r"\.(ava|pdf|png|jpe?g|heic|webp|gif|bmp|tiff?|xlsx?|docx?|pptx?|dump|sql\.gz|zip|7z|tgz|p12|pfx|pem|key|env|mp4|mov)$", re.I)
ERLAUBT = set()   # bewusst erlaubte Ausnahmen (Pfad), z. B. Testdaten ohne Inhalt – derzeit keine

# ---- Oberflächen-Dateien der Apps (Baukasten selbst ausgenommen, wo es um Kopien geht)
def oberflaechen():
    out = []
    for d, endungen in (("plattform/static", (".html", ".js")), ("gantt/public", (".html", ".js")),
                        ("bautagebuch/static", (".html", ".js")), ("shared/bpcore/head", (".js",))):
        for f in sorted(os.listdir(os.path.join(ROOT, d))):
            if f.endswith(endungen):
                out.append(f"{d}/{f}")
    return out

BAUKASTEN = [f"shared/bpcore/head/{f}" for f in ("bp.js", "undo.js", "seite.js", "befehle.js", "vorschlag.js", "spalten.js")]
DEF = re.compile(r"^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(|^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=", re.M)

# Altlast: Kopien von Grundhilfen, die es schon gab (Schritt 2 „Baukasten als ein Bündel“ räumt sie weg)
ALT_KOPIEN = {
    "bautagebuch/static/index.html": {"$", "ACCENTS", "api", "appUrl", "applyAccent", "applyLook", "applyTheme", "esc", "fold", "passt", "toast"},
    "gantt/public/app.js": {"$", "ICONS", "api", "esc", "toast"},
    "plattform/static/orca.html": {"$", "api", "esc"},
}

# ---- 5. Größe
GRENZE = 1500
SPIELRAUM = 300   # so viel dürfen die Altdateien noch wachsen, bis sie geteilt werden
ALT_GROSS = {   # Zeilen am 09.11.2026 – werden in Schritt 4 geteilt
    "plattform/static/ava.html": 6461, "plattform/ava.py": 5815, "shared/bpcore/head/head.js": 3040, "gantt/public/app.js": 3039,
    "plattform/baukosten.py": 2333, "bautagebuch/static/index.html": 2229, "shared/bpcore/head.py": 1898, "plattform/static/baukosten.html": 1574,
}
GROESSE_PRUEFEN = re.compile(r"\.(py|js|mjs|html|css)$")
NICHT_GROESSE = ("plattform/vendor/", "plattform/static/vendor/", "bautagebuch/static/vendor/", "positionsdb/")


def git_dateien():
    r = subprocess.run(["git", "ls-files"], cwd=ROOT, capture_output=True, text=True, check=True)
    return [x for x in r.stdout.splitlines() if x]


def zeilen(p):
    with open(os.path.join(ROOT, p), encoding="utf-8", errors="replace") as f:
        return sum(1 for _ in f)


def main():
    fehler, hinweise = [], []
    dateien = git_dateien()

    for p in dateien:
        if VERBOTEN.search(p) and p not in ERLAUBT:
            fehler.append(f"heikle Datei im Repo: {p} (Kataloge, PDFs, Bilder, Schlüssel und Sicherungen gehören nie ins Repo)")

    ui = oberflaechen()
    for p in ui:
        s = open(os.path.join(ROOT, p), encoding="utf-8").read()
        for m in re.finditer(r"(?<![\w.$])(confirm|prompt)\s*\(", s):
            z = s.count("\n", 0, m.start()) + 1
            fehler.append(f"{p}:{z}: System-Rückfrage {m.group(1)}() – stattdessen await bpFrage(…) bzw. bpEingabe(…)")
        if p.endswith(".html"):
            for m in re.finditer(r"<[a-zA-Z][^>]*\son(click|change|input|submit|load|keydown|keyup|blur|focus)\s*=", s):
                z = s.count("\n", 0, m.start()) + 1
                fehler.append(f"{p}:{z}: Inline-Handler on{m.group(1)}= – Ereignisse im Skript anmelden (addEventListener / data-…)")

    baukasten = {}
    for p in BAUKASTEN:
        for a, b in DEF.findall(open(os.path.join(ROOT, p), encoding="utf-8").read()):
            baukasten.setdefault(a or b, p)
    for p in ui:
        if p in BAUKASTEN:
            continue
        namen = {a or b for a, b in DEF.findall(open(os.path.join(ROOT, p), encoding="utf-8").read())}
        neu = sorted((namen & set(baukasten)) - ALT_KOPIEN.get(p, set()))
        for n in neu:
            fehler.append(f"{p}: „{n}“ gibt es schon im Baukasten ({baukasten[n]}) – dort benutzen statt kopieren")
        weg = sorted(ALT_KOPIEN.get(p, set()) - namen)
        if weg:
            hinweise.append(f"{p}: Altlast erledigt ({', '.join(weg)}) – bitte aus ALT_KOPIEN in tools/tests/ordnung.py streichen")

    for p in dateien:
        if not GROESSE_PRUEFEN.search(p) or p.startswith(NICHT_GROESSE) or not os.path.exists(os.path.join(ROOT, p)):
            continue
        n = zeilen(p)
        if p in ALT_GROSS:
            if n > ALT_GROSS[p] + SPIELRAUM:
                fehler.append(f"{p}: {n} Zeilen – Spielraum aufgebraucht ({ALT_GROSS[p]} + {SPIELRAUM}); erst teilen, dann erweitern")
            elif n > ALT_GROSS[p]:
                hinweise.append(f"{p}: {n} Zeilen (war {ALT_GROSS[p]}, Spielraum bis {ALT_GROSS[p] + SPIELRAUM})")
        elif n > GRENZE:
            fehler.append(f"{p}: {n} Zeilen – neue Dateien höchstens {GRENZE}; in Bausteine teilen")

    for h in hinweise:
        print("Hinweis:", h)
    for f in fehler:
        print("FEHLER: ", f)
    print(f"\nOrdnungsprüfung: {len(fehler)} Fehler, {len(hinweise)} Hinweise ({len(dateien)} Dateien geprüft).")
    return 1 if fehler else 0


if __name__ == "__main__":
    sys.exit(main())
