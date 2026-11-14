"""ToDo-Liste der Bauplattform als Liste mit Antworten (Aufgaben & Post → Büro → „Bauplattform“).

Quelle ist shared/bpcore/buero/todo.md (im Repo, bei jedem Push nachgeführt). Punkte, die auf eine Entscheidung warten, stehen in den
Abschnitten „Wartet auf dich“ und „Offene Fragen“ – nur sie bekommen GO / Nein / Später und eine Bemerkung. Offen = rot; entschieden
(Antwort hier oder im Chat, Zeile beginnt mit „✓ “) = grün, bis es gebaut ist. Die Antworten speichert die
Datenbank des Büros (bp_store „buero:todo:antworten“) mit Name und Zeit; „Antworten für Claude kopieren“ macht daraus Text für den Chat.
"""
import hashlib, json, os, re
from datetime import datetime

from . import konto

KEY = "buero:todo:antworten"
WARTEN = ("wartet auf dich", "offene fragen")
ANTWORTEN = ("go", "nein", "spaeter")


def quelle():
    p = os.path.join(os.path.dirname(__file__), "buero", "todo.md")
    try:
        with open(p, encoding="utf-8") as f:
            return f.read()
    except OSError:
        return ""


def _ohne_md(t):
    return re.sub(r"\*\*|__|`", "", t).strip()


def _id(text):
    """Stabile Kennung: der fett geschriebene Titel am Anfang (sonst der Anfang des Texts)."""
    m = re.match(r"\s*\*\*(.+?)\*\*", text)
    k = (m.group(1) if m else _ohne_md(text)[:80]).lower()
    k = re.sub(r"[^a-z0-9äöüß]+", "-", k).strip("-")[:60]
    return k or hashlib.sha1(text.encode()).hexdigest()[:10]


def lesen(md=None):
    """Markdown → [{titel, warten, punkte: [{id, text, zeit, erledigt, unter: [...]}]}]."""
    md = quelle() if md is None else md
    abschnitte, akt, letzter = [], None, None
    for z in md.splitlines():
        if z.startswith("## "):
            t = z[3:].strip()
            akt = {"titel": t, "warten": t.lower().startswith(WARTEN), "punkte": []}
            abschnitte.append(akt); letzter = None
            continue
        m = re.match(r"^(\s*)- (.+)$", z)
        if not m or not akt:
            continue
        roh = m.group(2).strip()
        erl = roh.startswith("~~") and "~~" in roh[2:]
        text = roh.strip("~").strip() if erl else roh
        zt = re.findall(r"\*\*(ca\.[^*]+)\*\*", text)
        ent = text.startswith("✓ ")   # im Chat entschieden (grün), wartet nur noch aufs Bauen
        text = text[2:].strip() if ent else text
        p = {"id": _id(text), "text": _ohne_md(re.sub(r"\s*\*\*ca\.[^*]+\*\*", "", text)), "zeit": zt[-1] if zt else "", "erledigt": erl, "entschieden": ent}
        if m.group(1) and letzter:   # eingerückt: Unterpunkt
            letzter.setdefault("unter", []).append(p)
        else:
            akt["punkte"].append(p); letzter = p
    return abschnitte


def antworten(c):
    try:
        return json.loads(konto._get(c, KEY) or "{}")
    except ValueError:
        return {}


def antworten_setzen(c, pid, antwort, bem, wer):
    A = antworten(c)
    if antwort is None and not bem:
        A.pop(pid, None)
    else:
        A[pid] = {"antwort": antwort if antwort in ANTWORTEN else None, "bem": (bem or "")[:1000], "wer": wer,
                  "zeit": datetime.now().strftime("%d.%m.%Y %H:%M"), "kopiert": False}
    konto._put(c, KEY, json.dumps(A, ensure_ascii=False), wer)
    return A


def als_text(c, ids=None):
    """Neue (noch nicht übermittelte) Antworten als Text für den Chat."""
    A, titel = antworten(c), {}
    for a in lesen():
        for p in a["punkte"]:
            titel[p["id"]] = p["text"]
    wort = {"go": "GO", "nein": "Nein", "spaeter": "Später", None: "Bemerkung"}
    zeilen = [f"- {titel.get(k, k)[:140]}: {wort.get(v.get('antwort'))}{' – ' + v['bem'] if v.get('bem') else ''} ({v.get('wer')}, {v.get('zeit')})"
              for k, v in A.items() if (ids is None and not v.get("kopiert")) or (ids is not None and k in ids)]
    return ("Antworten zur ToDo-Liste der Bauplattform:\n" + "\n".join(zeilen)) if zeilen else ""


def kopiert(c, ids, wer):
    A = antworten(c)
    for k in ids:
        if k in A:
            A[k]["kopiert"] = True
    konto._put(c, KEY, json.dumps(A, ensure_ascii=False), wer)
    return A
