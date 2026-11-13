"""KI-Verbrauch je Dienst (Verwaltung → KI): jede Anfrage an Claude, Gemini und ChatGPT wird mit ihren Tokens je Tag und Modell
mitgeschrieben (Tabelle ki_verbrauch). Kosten = Tokens × Listenpreis des Modells (USD je 1 Mio. Tokens, umgerechnet in €) – geschätzt.
Die Anbieter geben den Kontostand mit normalen API-Schlüsseln nicht heraus; das Guthaben ist deshalb
eingetragene Aufladungen − Verbrauch seit der ersten Aufladung (bp_store „ki:aufladung“). Ollama und Intern kosten nichts.
"""
import json
from datetime import date, timedelta

EUR_JE_USD = 0.92   # grob – die Rechnung des Anbieters ist maßgeblich
# Listenpreise USD je 1 Mio. Tokens (Eingabe, Ausgabe) – erster passender Namensteil gilt
PREISE = [
    ("claude", "opus", 5.0, 25.0), ("claude", "sonnet", 3.0, 15.0), ("claude", "haiku", 1.0, 5.0), ("claude", "", 3.0, 15.0),
    ("gemini", "pro", 1.25, 10.0), ("gemini", "flash-lite", 0.10, 0.40), ("gemini", "flash", 0.30, 2.50), ("gemini", "", 0.30, 2.50),
    ("chatgpt", "nano", 0.10, 0.40), ("chatgpt", "mini", 0.40, 1.60), ("chatgpt", "gpt-5", 1.25, 10.0), ("chatgpt", "", 2.0, 8.0),
]
ANBIETER = ("claude", "gemini", "chatgpt")
KEY = "ki:aufladung"


def preis(anbieter, modell):
    m = (modell or "").lower()
    for a, teil, i, o in PREISE:
        if a == anbieter and teil in m:
            return i, o
    return 0.0, 0.0


def tokens(anbieter, d):
    """(Eingabe, Ausgabe) aus der Antwort des Anbieters."""
    if anbieter == "claude":
        u = d.get("usage") or {}
        return int(u.get("input_tokens") or 0) + int(u.get("cache_read_input_tokens") or 0) + int(u.get("cache_creation_input_tokens") or 0), int(u.get("output_tokens") or 0)
    if anbieter == "gemini":
        u = d.get("usageMetadata") or {}
        return int(u.get("promptTokenCount") or 0), int(u.get("candidatesTokenCount") or 0) + int(u.get("thoughtsTokenCount") or 0)
    if anbieter == "chatgpt":
        u = d.get("usage") or {}
        return int(u.get("prompt_tokens") or 0), int(u.get("completion_tokens") or 0)
    return 0, 0


def merke(anbieter, modell, d):
    """Nach jeder Antwort: Tokens zum Tag addieren. Eigene Verbindung (die Anfrage läuft oft in einer fremden Transaktion);
    ein Fehler hier darf die KI-Antwort nie verhindern."""
    if anbieter not in ANBIETER:
        return
    ein, aus = tokens(anbieter, d or {})
    if not (ein or aus):
        return
    try:
        from . import db
        with db.tx() as c:
            c.execute("INSERT INTO ki_verbrauch(tag, anbieter, modell, ein, aus, n) VALUES(?,?,?,?,?,1) ON CONFLICT (tag, anbieter, modell) "
                      "DO UPDATE SET ein=ki_verbrauch.ein+EXCLUDED.ein, aus=ki_verbrauch.aus+EXCLUDED.aus, n=ki_verbrauch.n+1",
                      (date.today().isoformat(), anbieter, (modell or "")[:80], ein, aus))
    except Exception as e:   # noqa: BLE001
        from . import fehler
        fehler.still(None, "KI-Verbrauch mitschreiben", e)


def kosten(anbieter, modell, ein, aus):
    i, o = preis(anbieter, modell)
    return (ein * i + aus * o) / 1e6 * EUR_JE_USD


def aufladungen(c):
    r = c.execute("SELECT data FROM bp_store WHERE key=?", (KEY,)).fetchone()
    try:
        d = json.loads(r["data"]) if r and r["data"] else {}
    except (TypeError, ValueError):
        d = {}
    return {a: [x for x in d.get(a) or [] if isinstance(x, dict)] for a in ANBIETER}


def aufladung_setzen(c, anbieter, liste):
    A = aufladungen(c)
    A[anbieter] = liste
    c.execute("INSERT INTO bp_store(key, data) VALUES(?,?) ON CONFLICT (key) DO UPDATE SET data=EXCLUDED.data", (KEY, json.dumps(A, ensure_ascii=False)))


def stand(c):
    """Je Anbieter: heute, dieser Monat, Ø je Tag (30 Tage), Anfragen, Aufladungen, Guthaben (falls eine Aufladung eingetragen ist)."""
    heute = date.today()
    seit30, monat = (heute - timedelta(days=29)).isoformat(), heute.replace(day=1).isoformat()
    rows = c.execute("SELECT tag, anbieter, modell, ein, aus, n FROM ki_verbrauch").fetchall()
    A = aufladungen(c)
    out = {}
    for a in ANBIETER:
        R = [r for r in rows if r["anbieter"] == a]
        k = lambda xs: round(sum(kosten(a, r["modell"], r["ein"], r["aus"]) for r in xs), 2)   # noqa: E731
        L = sorted(A[a], key=lambda x: x.get("datum") or "")
        ab = L[0]["datum"] if L else None
        out[a] = {"heute": k([r for r in R if r["tag"] == heute.isoformat()]), "monat": k([r for r in R if r["tag"] >= monat]),
                  "tag_mittel": round(k([r for r in R if r["tag"] >= seit30]) / 30, 2), "n_monat": sum(r["n"] for r in R if r["tag"] >= monat),
                  "tokens_monat": sum(r["ein"] + r["aus"] for r in R if r["tag"] >= monat), "seit": min((r["tag"] for r in R), default=None),
                  "aufladungen": L, "guthaben": round(sum(float(x.get("betrag") or 0) for x in L) - k([r for r in R if r["tag"] >= ab]), 2) if ab else None}
    return out
