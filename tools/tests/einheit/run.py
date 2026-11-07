"""Rechentests (Einheitentests) – laufen IM Container der jeweiligen App, damit der echte Programmcode geprüft wird.

Aufruf in GitHub Actions (siehe build.yml), z. B.:
  docker compose … run --rm -T --no-deps -v "$PWD/tools/tests:/tests:ro" --entrypoint python ava /tests/einheit/run.py plattform
Art = plattform | gantt | bautagebuch → führt /tests/einheit/<art>_*.py aus, jeweils alle Funktionen test_*() ohne Argumente.
Der Programmcode der App liegt im Container unter /app (z. B. `import ava`, `import baukosten`, `from bpcore import …`,
im Bautagebuch `from core import …`). Hilfen gleich()/pruefe() aus tools/tests/lib.py.
"""
import glob, importlib.util, inspect, os, sys, time, traceback

ART = sys.argv[1] if len(sys.argv) > 1 else "plattform"
HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, "/app")
sys.path.insert(0, os.path.dirname(HIER))   # lib.py
os.chdir("/app")
from lib import Fehler   # noqa: E402


def main():
    erg = []
    for pfad in sorted(glob.glob(os.path.join(HIER, f"{ART}_*.py"))):
        datei = os.path.basename(pfad)[:-3]
        spec = importlib.util.spec_from_file_location(datei, pfad)
        mod = importlib.util.module_from_spec(spec)
        print(f"\n{datei}")
        try:
            spec.loader.exec_module(mod)
        except Exception:
            erg.append((datei, "(Datei laden)", False, traceback.format_exc(limit=4)))
            print("  FEHLER  Datei laden\n" + erg[-1][3])
            continue
        tests = sorted([(n, f) for n, f in vars(mod).items() if n.startswith("test_") and inspect.isfunction(f) and f.__module__ == datei],
                       key=lambda t: t[1].__code__.co_firstlineno)
        for n, f in tests:
            t = time.time()
            try:
                f()
                ok, msg = True, ""
            except Fehler as e:
                ok, msg = False, str(e)
            except Exception:
                ok, msg = False, traceback.format_exc(limit=4)
            erg.append((datei, n, ok, msg))
            doc = (f.__doc__ or "").strip().split("\n")[0]
            print(f"  {'ok    ' if ok else 'FEHLER'}  {n}  ({time.time() - t:.2f} s){'  – ' + doc if doc else ''}")
            if not ok:
                for z in msg.strip().split("\n"):
                    print(f"            {z}")
    schlecht = [e for e in erg if not e[2]]
    print(f"\nRechentests ({ART}): {len(erg) - len(schlecht)} bestanden, {len(schlecht)} fehlgeschlagen.")
    if schlecht and os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a") as fh:
            fh.write(f"### Rechentests ({ART}): {len(schlecht)} fehlgeschlagen\n\n")
            for d, n, _, msg in schlecht:
                fh.write(f"- **{d} › {n}**: {msg.strip().splitlines()[-1] if msg.strip() else ''}\n")
    return 1 if schlecht else 0


if __name__ == "__main__":
    sys.exit(main())
