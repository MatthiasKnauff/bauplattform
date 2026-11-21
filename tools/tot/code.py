"""Toter Code – Suchlauf (21.11.2026). Aufruf im Hauptordner:  python3 tools/tot/code.py [--weg]

Meldet, was im ganzen Repo nur an seiner eigenen Stelle vorkommt:
  Python   Funktionen (def ohne Dekorator) und Namen auf Modulebene
  JS       Funktionen (function x / const x = (…) =>) in den Seiten und Bausteinen
  Module   Python-Dateien, die niemand importiert
  Schema   Tabellen aus den Migrationen, die der Code nicht mehr nennt (nur melden – Migrationen sind additiv)
Mit --weg werden tote Python-Funktionen entfernt (so oft, bis nichts mehr übrig ist); alles andere nur melden und von Hand prüfen.
Nicht gemeint: Rahmen-Methoden (HTMLParser, HTTP-Handler), Daten der Positionsdatenbank, mitgelieferte Bibliotheken (vendor).
Die Stilblätter prüft tools/tot/css.py."""
import collections
import glob
import os
import re
import subprocess
import sys

HOOK = {"handle_starttag", "handle_endtag", "handle_data", "getSpaceBefore", "do_GET", "log_message", "print_database"}
TEXT = (".js", ".html", ".mjs", ".py", ".yml", ".md", ".json")


def _dateien():
    F = [p for p in subprocess.check_output(["git", "ls-files"]).decode().split() if p.endswith(TEXT) and os.path.exists(p) and os.path.getsize(p) < 3e6]
    return {p: open(p, errors="ignore").read() for p in F}


def _eigen(p):
    return not (p.startswith("tools/") or "positionsdb/" in p or "/vendor/" in p or "/migrationen/" in p or "pdfjs" in p)


def python(T, cnt, weg):
    n = 0
    for p, t in T.items():
        if not p.endswith(".py") or not _eigen(p):
            continue
        L, i, neu = t.split("\n"), 0, False
        while i < len(L):
            m = re.match(r"(\s*)def ([A-Za-z_]\w*)\(", L[i])
            if m and cnt[m.group(2)] == 1 and m.group(2) not in HOOK and not m.group(2).startswith("__") and not (i > 0 and L[i - 1].lstrip().startswith("@")):
                ind, j = len(m.group(1)), i + 1
                while j < len(L) and (L[j].strip() == "" or len(L[j]) - len(L[j].lstrip()) > ind):
                    j += 1
                print(f"  Funktion  {p}: {m.group(2)} ({j - i} Zeilen)")
                n += 1
                if weg:
                    while j > i and L[j - 1].strip() == "":
                        j -= 1
                    del L[i:j]
                    neu = True
                    continue
            i += 1
        if neu:
            open(p, "w").write(re.sub(r"\n{4,}", "\n\n\n", "\n".join(L)))
        for m in re.finditer(r"^([A-Za-z_]\w*) = ", t, re.M):
            if cnt[m.group(1)] == 1 and m.group(1) != "__all__":
                print(f"  Name      {p}: {m.group(1)}")
    return n


def javascript(T, cnt):
    for p, t in T.items():
        if not p.endswith((".js", ".html")) or not _eigen(p) or p.startswith("windows/"):
            continue
        for m in re.finditer(r"^[ \t]*(?:async )?function ([A-Za-z_$][\w$]*)\(|^[ \t]*(?:const|let) ([A-Za-z_$][\w$]*) = (?:async )?\(?[\w, ={}\[\]]*\)? =>", t, re.M):
            name = m.group(1) or m.group(2)
            if cnt[name] == 1:
                print(f"  JS        {p}: {name}")


def module(T):
    src = {p: t for p, t in T.items() if p.endswith(".py") and not p.startswith("tools/tests")}
    for p in src:
        name = os.path.basename(p)[:-3]
        if not _eigen(p) or name in ("__init__", "start", "apps") or p.startswith("tools/"):
            continue
        if not any(re.search(r"\b" + re.escape(name) + r"\b", t) for q, t in src.items() if q != p):
            print(f"  Modul     {p}")


def schema(T):
    mig = "\n".join(open(p).read() for p in sorted(glob.glob("shared/bpcore/migrationen/*.sql")))
    code = "\n".join(t for p, t in T.items() if p.endswith(".py") and not p.startswith("tools/"))
    weg = set(re.findall(r"DROP TABLE(?: IF EXISTS)? (\w+)", mig, re.I))   # später gelöscht (0103)
    for t in sorted(set(re.findall(r"CREATE TABLE(?: IF NOT EXISTS)? (\w+)", mig, re.I)) - weg):
        if not re.search(r"\b" + t + r"\b", code):
            print(f"  Tabelle   {t} (steht nur noch in den Migrationen)")


if __name__ == "__main__":
    weg = "--weg" in sys.argv
    while True:
        T = _dateien()
        cnt = collections.Counter(re.findall(r"[A-Za-z_$][\w$]*", "\n".join(T.values())))
        if not (python(T, cnt, weg) and weg):
            break
    javascript(T, cnt)
    module(T)
    schema(T)
