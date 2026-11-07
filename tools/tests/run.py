"""Ablauftests der Bauplattform ausführen – läuft in GitHub Actions nach dem Rauchtest (siehe .github/workflows/build.yml).

Aufruf:  python3 tools/tests/run.py http://localhost:8090 [Filter …]
         Filter = Teil eines Datei- oder Testnamens, z. B. "ava" oder "test_rechnung"
Sucht alle tools/tests/test_*.py und führt deren Funktionen test_*(ctx) in der Reihenfolge der Datei aus.
Rückgabewert 0 = alle bestanden, 1 = mindestens ein Fehler.
"""
import glob, importlib.util, inspect, os, re, sys, time, traceback

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import Ctx, Fehler, HIER   # noqa: E402


def _fehlerstand(ctx):
    """Fehlermeldungen der Verwaltung: Schlüssel → Anzahl (vor den Tests)."""
    try:
        return {f["schluessel"]: f["anzahl"] for f in ctx.admin.gj("/verwaltung/api/bp/fehler")["fehler"]}
    except Exception as e:
        print(f"Hinweis: Fehlermeldungen nicht lesbar ({e})")
        return None


def _neue_fehler(ctx, vorher):
    """Neue oder häufigere Einträge seit Testbeginn. Fehler = echte Ausnahmen (Art „server“ ohne bewusste 5xx-Antwort)."""
    if vorher is None:
        return [], []
    try:
        jetzt = ctx.admin.gj("/verwaltung/api/bp/fehler")["fehler"]
    except Exception:
        return [], []
    neu = [f for f in jetzt if f["anzahl"] > vorher.get(f["schluessel"], 0)]
    server = [f for f in neu if f["art"] == "server" and not re.match(r"^5\d\d: ", f["meldung"] or "")]
    still = [f for f in neu if f["art"] == "still"]
    return server, still


def main():
    base = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8090"
    filter_ = [f.lower() for f in sys.argv[2:]]
    ctx = Ctx(base)
    vorher = _fehlerstand(ctx)
    ergebnisse = []   # (datei, test, ok, sekunden, meldung)
    for pfad in sorted(glob.glob(os.path.join(HIER, "test_*.py"))):
        datei = os.path.basename(pfad)[:-3]
        spec = importlib.util.spec_from_file_location(datei, pfad)
        mod = importlib.util.module_from_spec(spec)
        try:
            spec.loader.exec_module(mod)
        except Exception:
            ergebnisse.append((datei, "(Datei laden)", False, 0, traceback.format_exc(limit=3)))
            continue
        tests = [(n, f) for n, f in vars(mod).items() if n.startswith("test_") and inspect.isfunction(f) and f.__module__ == datei]
        tests.sort(key=lambda t: t[1].__code__.co_firstlineno)
        tests = [t for t in tests if not filter_ or any(x in datei.lower() or x in t[0].lower() for x in filter_)]
        if tests:
            print(f"\n{datei}")
        for n, f in tests:
            t = time.time()
            try:
                f(ctx)
                ok, msg = True, ""
            except Fehler as e:
                ok, msg = False, str(e)
            except Exception:
                ok, msg = False, traceback.format_exc(limit=4)
            s = time.time() - t
            ergebnisse.append((datei, n, ok, s, msg))
            doc = (f.__doc__ or "").strip().split("\n")[0]
            print(f"  {'ok    ' if ok else 'FEHLER'}  {n}  ({s:.1f} s){'  – ' + doc if doc else ''}")
            if not ok:
                for z in msg.strip().split("\n"):
                    print(f"            {z}")
    neu_server, neu_still = _neue_fehler(ctx, vorher)
    if neu_still:
        print(f"\nHinweis: {len(neu_still)} abgefangene Fehler (Art „still“) während der Tests – Programm lief weiter:")
        for f in neu_still:
            print(f"  - [{f['app']}] {f['meldung'][:300]}")
    if neu_server:
        ergebnisse.append(("Fehlermeldungen", "keine unerwarteten Serverfehler", False, 0,
                           "\n".join(f"[{f['app']}] {f['pfad']} – {f['meldung'][:300]}" for f in neu_server)))
        print(f"\nFEHLER: {len(neu_server)} unerwartete Serverfehler während der Tests (Verwaltung → Fehlermeldungen):")
        for f in neu_server:
            print(f"  - [{f['app']}] {f['pfad']} – {f['meldung'][:300]}")
            for z in (f.get("stack") or "").strip().splitlines()[-6:]:
                print(f"      {z}")
    gut = sum(1 for e in ergebnisse if e[2])
    schlecht = [e for e in ergebnisse if not e[2]]
    print(f"\n{gut} Tests bestanden, {len(schlecht)} fehlgeschlagen.")
    if schlecht:
        print("\nFehlgeschlagen:")
        for d, n, _, _, msg in schlecht:
            print(f"  - {d} › {n}: {msg.strip().splitlines()[-1] if msg.strip() else ''}"[:400])
        if os.environ.get("GITHUB_STEP_SUMMARY"):
            with open(os.environ["GITHUB_STEP_SUMMARY"], "a") as fh:
                fh.write(f"### Ablauftests: {len(schlecht)} fehlgeschlagen\n\n")
                for d, n, _, _, msg in schlecht:
                    fh.write(f"- **{d} › {n}**: {msg.strip().splitlines()[-1] if msg.strip() else ''}\n")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
