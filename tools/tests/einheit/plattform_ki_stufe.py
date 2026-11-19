"""KI-Schieber (bpcore/ki_stufe.py): Höchste Stufe im Büro (Verwaltung, 19.11.2026) → Projekt → Stelle; Anbieter je Stufe
(KI im Büro = Ollama, externe KI = die Wahl aus ⚙ → Persönlich → KI). Ohne Server: die KI-Hilfen werden nachgebildet."""
from bpcore import ai, ki_fragen, ki_stufe as K
from lib import gleich


class _Nachbau:
    def __init__(self, ki=None, aus=(), ollama=True, projekt=None):
        self.k, self.aus, self.ollama, self.projekt = ki or {}, set(aus), ollama, projekt or {"buero": True, "extern": True}

    def __enter__(self):
        self.alt = {n: getattr(ai, n) for n in ("store", "abgeschaltet", "providers", "ollama_url", "ollama_state", "choice_of")}
        self.alt_pk = ki_fragen.projekt_ki
        ai.store = lambda c, key: {"ki": self.k}
        ai.abgeschaltet = lambda c=None: self.aus
        ai.providers = lambda c=None: [{"key": "ollama", "paid": False, "ok": self.ollama}, {"key": "claude", "paid": True, "ok": True},
                                       {"key": "gemini", "paid": True, "ok": True}]
        ai.ollama_url = lambda: "http://ollama:11434" if self.ollama else ""
        ai.ollama_state = lambda: {"ok": self.ollama}
        ai.choice_of = lambda u, c=None: (u or {}).get("ai") or "intern"
        ki_fragen.projekt_ki = lambda c, pid: dict(self.projekt)
        return self

    def __exit__(self, *a):
        for n, f in self.alt.items():
            setattr(ai, n, f)
        ki_fragen.projekt_ki = self.alt_pk


def test_hoechste_stufe_und_aeltere_staende():
    with _Nachbau({"stufe": "aus"}):
        gleich(K.hoechste(None), "aus", "gespeicherte Stufe")
    with _Nachbau({"zusatz": True}):
        gleich(K.hoechste(None), "extern", "älterer Stand: „Externe KI erlauben“ an → externe KI")
    with _Nachbau({}):
        gleich(K.hoechste(None), "buero", "ohne Angabe: KI im Büro")
        gleich(ki_fragen.zusatz_an(None), False, "externe KI nicht erlaubt")


def test_obergrenze_verwaltung_projekt_stelle():
    with _Nachbau({"stufe": "extern"}):
        E = K.erlaubt(None)
        gleich((E["buero"], E["extern"]), (True, True), "alles erlaubt")
        gleich(K.stufe(None, None, "extern"), "extern", "Stelle extern")
    with _Nachbau({"stufe": "buero"}):
        gleich(K.stufe(None, None, "extern"), "buero", "Verwaltung bis KI im Büro: extern → eine Stufe tiefer")
        pruef_grund = K.erlaubt(None)["grund"]["extern"]
        gleich("Höchste Stufe im Büro" in pruef_grund, True, f"Grund nennt den Schieber der Verwaltung: {pruef_grund}")
    with _Nachbau({"stufe": "aus"}):
        gleich((K.stufe(None, None, "buero"), K.erlaubt(None)["buero"]), ("aus", False), "Verwaltung „ohne KI“: auch KI im Büro gesperrt")
    with _Nachbau({"stufe": "extern"}, projekt={"buero": True, "extern": False}):
        gleich(K.stufe(None, 7, "extern"), "buero", "Projekt ohne externe KI")
    with _Nachbau({"stufe": "extern"}, ollama=False):
        gleich(K.stufe(None, None, "buero"), "aus", "KI im Büro nicht erreichbar → ohne KI")


def test_anbieter_je_stufe():
    with _Nachbau({"stufe": "extern"}):
        gleich(K.anbieter(None, "buero"), "ollama", "KI im Büro = Ollama")
        gleich(K.anbieter(None, "extern", {"ai": "gemini"}), "gemini", "externe KI: persönliche Wahl")
        gleich(K.anbieter(None, "extern", {"ai": "ollama"}), "claude", "persönliche Wahl keine externe → erste eingerichtete")
        gleich(K.anbieter(None, "aus"), None, "ohne KI: kein Anbieter")
    with _Nachbau({"stufe": "extern"}, aus={"gemini"}):
        gleich(K.anbieter(None, "extern", {"ai": "gemini"}), "claude", "abgeschaltete Wahl → die nächste")
    gleich(K.schalter("extern"), {"buero": False, "extern": True}, "Stufe als Schalter: genau die gewählte arbeitet")
