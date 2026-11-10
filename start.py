"""Das eine Startprogramm der Bauplattform: startet die App, die der Container sein soll (Umgebungsvariable APP).

  python /app/start.py            App starten (gunicorn) – Aufruf im Image (CMD)
  python /app/start.py --gesund   Gesundheitsprüfung des Containers (HEALTHCHECK)
  python /app/start.py --ordner   Ordner der App ausgeben (für Werkzeuge: docker compose exec -w …)

Welche Apps es gibt und wie sie starten, steht in apps.py.
"""
import os, sys, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from apps import APPS   # noqa: E402

BASIS = os.path.dirname(os.path.abspath(__file__))


def app():
    name = (os.environ.get("APP") or os.environ.get("APP_MODULE") or "portal").strip()
    if name not in APPS:
        sys.exit(f"start.py: unbekannte App „{name}“ – bekannt sind: {', '.join(sorted(APPS))} (siehe apps.py)")
    a = dict(APPS[name])
    a["name"] = name
    a["port"] = int(os.environ.get("APP_PORT") or a["port"]) if a["ordner"] == "plattform" else a["port"]
    a["threads"] = int(os.environ.get("APP_THREADS") or a["threads"])
    a["timeout"] = int(os.environ.get("APP_TIMEOUT") or a["timeout"])
    return a


def main():
    a = app()
    if "--gesund" in sys.argv:
        urllib.request.urlopen(f"http://127.0.0.1:{a['port']}{a['gesund']}", timeout=4)
        return
    ordner = os.path.join(BASIS, a["ordner"])
    if "--ordner" in sys.argv:
        print(ordner)
        return
    os.chdir(ordner)
    if a["ordner"] == "plattform":   # die Plattform-Apps lesen ihren Namen und Port aus der Umgebung (wie bisher)
        os.environ["APP_MODULE"] = a["modul"]
        os.environ["APP_PORT"] = str(a["port"])
    cmd = ["gunicorn", "-b", f"0.0.0.0:{a['port']}", "-w", str(os.environ.get("APP_WORKERS") or a.get("worker", 2)), "--timeout", str(a["timeout"])]
    if a["threads"]:
        cmd += ["--threads", str(a["threads"])]
    os.execvp("gunicorn", cmd + [f"{a['modul']}:app"])


if __name__ == "__main__":
    main()
