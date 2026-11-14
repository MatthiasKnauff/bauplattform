"""KI der Bauplattform – eine Auswahl für alle Apps (Kopfleiste), mehrere Anbieter.

intern   Regeln und Kennwerte der jeweiligen App, ohne Internet, kostenlos (immer verfügbar)
ollama   eigener Ollama-Container im Docker-Netz (OLLAMA_URL, OLLAMA_MODEL) – kostenlos, Daten bleiben im Büro
claude   Anthropic (Schlüssel aus den Einstellungen des Bauzeitenplans oder ANTHROPIC_API_KEY)
gemini   Google (GEMINI_API_KEY, GEMINI_MODEL)
chatgpt  OpenAI (OPENAI_API_KEY, OPENAI_MODEL)

Schlüssel verlassen den Server nie; die Apps sehen nur „verfügbar ja/nein“.
"""
import json, os, threading, time, urllib.error, urllib.request

from . import ki_verbrauch

PROVIDERS = (
    ("intern", "Intern", "Regeln und Kennwerte – ohne Internet, kostenlos"),
    ("ollama", "Ollama", "eigener Server im Büro – kostenlos, Daten bleiben intern"),
    ("claude", "Claude", "Anthropic – kostenpflichtig je Anfrage"),
    ("gemini", "Gemini", "Google – kostenpflichtig je Anfrage"),
    ("chatgpt", "ChatGPT", "OpenAI – kostenpflichtig je Anfrage"),
)
KEYS = tuple(k for k, _, _ in PROVIDERS)
PAID = ("claude", "gemini", "chatgpt")
SCHALTBAR = ("ollama", "claude", "gemini", "chatgpt")   # Intern ist immer da
AUS_TEXT = "Diese KI ist vom Administrator abgeschaltet (Verwaltung → Büro-Einstellungen → KI)."


class AIError(Exception):
    pass


def _env(k, d=""):
    return (os.environ.get(k) or d).strip()


def ollama_url():
    return _env("OLLAMA_URL").rstrip("/")


def ollama_model():
    return _env("OLLAMA_MODEL", "qwen2.5:3b")


def ollama_vision_model():
    """Zweites Ollama-Modell, das Bilder lesen kann (Pläne) – leer = keins."""
    return _env("OLLAMA_VISION_MODEL", "qwen3-vl:4b")


def _hat(names, want):
    return bool(want) and (want in names or want + ":latest" in names or (":" not in want and any(n.split(":")[0] == want for n in names)))


def ollama_sieht():
    """Kann Ollama Bilder lesen (Bildmodell geladen)?"""
    return bool(ollama_url()) and _hat(ollama_state()["models"], ollama_vision_model())


def sieht(provider):
    """Kann der Anbieter Pläne (Bilder) lesen?"""
    return provider in VISION or (provider == "ollama" and ollama_sieht())


_oll = {"t": 0, "ok": False, "hint": "", "models": []}
_olock = threading.Lock()


def ollama_state():
    """Erreichbar und Modell geladen? (höchstens alle 30 s nachfragen)"""
    url = ollama_url()
    if not url:
        return {"ok": False, "hint": "nicht eingerichtet (OLLAMA_URL fehlt)", "models": []}
    with _olock:
        if time.time() - _oll["t"] > 30:
            try:
                with urllib.request.urlopen(url + "/api/tags", timeout=2) as r:
                    names = [m.get("name", "") for m in (json.loads(r.read().decode() or "{}").get("models") or [])]
                want = ollama_model()
                has = _hat(names, want)
                _oll.update(ok=has, models=names,
                            hint=f"Modell {want}" if has else f"Modell {want} wird noch geladen …" if not names else f"Modell {want} fehlt (vorhanden: {', '.join(names[:3])})")
            except Exception:   # Zustand wird als Hinweis angezeigt („nicht erreichbar“)
                _oll.update(ok=False, models=[], hint="Ollama-Container nicht erreichbar")
            _oll["t"] = time.time()
        return {"ok": _oll["ok"], "hint": _oll["hint"], "models": list(_oll["models"])}


CLAUDE_MODELS = {"claude-haiku-5-5": "Claude Haiku 5.5 – schnell, günstig", "claude-sonnet-5-5": "Claude Sonnet 5.5 – genauer",
                 "claude-opus-5-5": "Claude Opus 5.5 – am gründlichsten"}


def store(c, key):
    """Einstellungen aus der Datenbank (Verwaltung → Einstellungen). 'settings' = Bauzeitenplan/Claude, 'plattform' = übrige KI."""
    if c is None:   # ohne Verbindung (z. B. Diktat, Hintergrundaufgaben): selbst lesen – sonst fehlten die hinterlegten Schlüssel
        from . import db
        try:
            with db.tx() as c2:
                return store(c2, key)
        except Exception as e:
            from . import fehler
            fehler.still(None, f"KI-Einstellungen lesen ({key})", e)
            return {}
    try:
        r = c.execute("SELECT data FROM gantt_store WHERE key=?", (key,)).fetchone()
        v = json.loads(r["data"]) if r else {}
        return v if isinstance(v, dict) else {}
    except Exception as e:
        from . import fehler
        fehler.still(None, f"KI-Einstellungen lesen ({key})", e)
        return {}


def abgeschaltet(c=None):
    """Vom Administrator für alle abgeschaltete KIs (Menge der Schlüssel aus SCHALTBAR)."""
    if c is None:
        from . import db
        try:
            with db.tx() as c2:
                return abgeschaltet(c2)
        except Exception as e:
            from . import fehler
            fehler.still(None, "KI: abgeschaltete KIs lesen", e)
            return set()
    k = store(c, "plattform").get("ki") or {}
    aus = {x for x in (k.get("aus") or []) if x in SCHALTBAR}
    if k.get("kostenpflichtig_aus"):   # frühere Einstellung „kostenpflichtige KI aus“
        aus |= set(PAID)
    return aus


def paid_off(c=None):
    return set(PAID) <= abgeschaltet(c)


def _erlaubt(provider, c):
    if provider in abgeschaltet(c):
        raise AIError(AUS_TEXT)


def ext_conf(c, prov):
    """Schlüssel/Modell für Gemini bzw. ChatGPT: in der Verwaltung hinterlegt, sonst Umgebungsvariable."""
    k = (store(c, "plattform").get("ki") or {}).get(prov) or {}
    if prov == "gemini":
        return {"key": k.get("key") or _env("GEMINI_API_KEY"), "model": k.get("model") or _env("GEMINI_MODEL", "gemini-2.5-flash"),
                "fromEnv": not k.get("key") and bool(_env("GEMINI_API_KEY"))}
    return {"key": k.get("key") or _env("OPENAI_API_KEY"), "model": k.get("model") or _env("OPENAI_MODEL", "gpt-4.1-mini"),
            "fromEnv": not k.get("key") and bool(_env("OPENAI_API_KEY"))}


def claude_conf(c=None, zweck=None):
    """Schlüssel/Modell wie im Bauzeitenplan (Programmeinstellungen), sonst ANTHROPIC_API_KEY.
    zweck="kataloge": fehlt beides, gilt der Schlüssel, der nur dafür hinterlegt ist (Verwaltung → Kataloge erzeugen)."""
    a = (store(c, "settings").get("ai") or {})   # in der Verwaltung hinterlegt (auch ohne mitgegebene Verbindung)
    key = a.get("key") or _env("ANTHROPIC_API_KEY")
    model = a.get("model") or _env("ANTHROPIC_MODEL", "claude-haiku-5-5")
    if not key and zweck == "kataloge":
        z = store(c, "plattform").get("ki_kataloge") or {}
        key, model = z.get("key") or "", z.get("model") or "claude-sonnet-5-5"
    return {"key": key, "model": model, "nur_kataloge": bool(key) and not (a.get("key") or _env("ANTHROPIC_API_KEY"))}


def providers(c=None):
    """Auswahl für die Kopfleiste: welche Anbieter sind eingerichtet?"""
    out, aus = [], abgeschaltet(c)
    for k, label, desc in PROVIDERS:
        if k in aus:
            continue   # abgeschaltet: Knopf erscheint nirgends
        if k == "intern":
            ok, hint = True, desc
        elif k == "ollama":
            st = ollama_state()
            ok, hint = st["ok"], (desc + " · " + st["hint"]) if st["ok"] else st["hint"]
            if ok and _hat(st["models"], ollama_vision_model()):
                hint += " · liest Pläne mit " + ollama_vision_model()
        elif k == "claude":
            ok = bool(claude_conf(c)["key"])
            hint = desc if ok else "nicht eingerichtet (Verwaltung → Einstellungen → KI)"
        elif k == "gemini":
            ok = bool(ext_conf(c, "gemini")["key"])
            hint = desc if ok else "nicht eingerichtet (Verwaltung → Einstellungen → KI)"
        else:
            ok = bool(ext_conf(c, "chatgpt")["key"])
            hint = desc if ok else "nicht eingerichtet (Verwaltung → Einstellungen → KI)"
        out.append({"key": k, "label": label, "ok": ok, "hint": hint, "paid": k in ("claude", "gemini", "chatgpt"),
                    "bild": k in VISION or (k == "ollama" and ok and _hat(ollama_state()["models"], ollama_vision_model()))})
    return out


def choice_of(user, c=None):
    v = (user["ai"] if user is not None and "ai" in user.keys() else "") or ""
    v = v if v in KEYS else "intern"
    aus = abgeschaltet(c) if v != "intern" else set()
    if v in aus:   # gewählte KI ist abgeschaltet → Ollama, wenn erlaubt und bereit, sonst Intern
        return "ollama" if "ollama" not in aus and ollama_state()["ok"] else "intern"
    return v


def _post(url, payload, headers, timeout=90):
    """Anfrage an eine KI. Überlastet der Anbieter kurz (500, 502, 503, 529 – „high demand“), noch zweimal versuchen (nach 2 und 6 s)."""
    import time
    for warte in (2, 6, None):
        try:
            return _post1(url, payload, headers, timeout)
        except _Ueberlast as e:
            if warte is None:
                raise AIError(f"Die KI ist gerade überlastet ({e.args[0]}) – das liegt beim Anbieter und gibt sich meist nach kurzer Zeit. Bitte gleich noch einmal versuchen.")
            time.sleep(warte)


class _Ueberlast(Exception):
    pass


def _post1(url, payload, headers, timeout):
    req = urllib.request.Request(url, data=json.dumps(payload).encode(), method="POST", headers={"content-type": "application/json", **headers})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        try:
            d = json.loads(e.read().decode() or "{}")
        except ValueError:
            d = {}
        err = d.get("error")
        msg = (err.get("message") if isinstance(err, dict) else err) or e.reason
        if e.code in (401, 403):
            raise AIError("API-Schlüssel ungültig oder ohne Berechtigung")
        if e.code == 429:
            raise AIError("Zu viele Anfragen oder Guthaben aufgebraucht")
        if e.code in (500, 502, 503, 529):
            raise _Ueberlast(e.code)
        raise AIError(f"KI-Fehler {e.code}: {msg}")
    except TimeoutError:
        raise AIError("Zeitüberschreitung bei der KI")
    except urllib.error.URLError as e:
        raise AIError("KI nicht erreichbar: " + str(e.reason))


def _mit_schutz(provider, system, user, c, zweck, bild, senden):
    """Datenschutz (14.11.2026): externe KI bekommt Namen, Adressen, E-Mail, Telefon nur als Art#Nummer (anonym.py);
    die Antwort wird zurückübersetzt. Jede Anfrage ins Protokoll (wenn eingeschaltet) – Ollama im Büro ohne Austausch."""
    from . import anonym, db as _db
    t0 = time.time()
    with (_db.tx() if c is None else _nullctx(c)) as cc:
        T = anonym.Tausch(cc) if provider in anonym.EXTERN else None
        s2, u2 = (T.hin(system), T.hin(user)) if T else (system, user)
        if T and T.ersetzt:
            s2 = (s2 or "") + "\n\n" + anonym.ZUSATZ
    antwort = senden(s2, u2)
    klar = T.zurueck(antwort) if T else antwort
    try:
        with (_db.tx() if c is None else _nullctx(c)) as cc:
            anonym.protokollieren(cc, provider, zweck, f"[SYSTEM]\n{s2}\n\n[ANFRAGE]\n{u2}", antwort, T.ersetzt if T else [], (time.time() - t0) * 1000, bild)
    except Exception as e:   # Protokoll darf die Antwort nicht verhindern
        print("KI-Protokoll:", e, flush=True)
    return klar


class _nullctx:
    def __init__(self, c):
        self.c = c

    def __enter__(self):
        return self.c

    def __exit__(self, *a):
        return False


def ask(provider, system, user, max_tokens=900, c=None, json_mode=False, zweck=None):
    """Eine Frage an den gewählten Anbieter. Gibt Text zurück (bei json_mode möglichst reines JSON).
    Externe KI nur anonymisiert (anonym.py), jede Anfrage ins Protokoll.
    zweck="kataloge": Claude auch mit dem nur dafür hinterlegten Schlüssel (siehe claude_conf)."""
    if not (zweck == "kataloge" and provider == "claude"):
        _erlaubt(provider, c)
    return _mit_schutz(provider, system, user, c, zweck, False, lambda s, u: _ask_roh(provider, s, u, max_tokens, c, json_mode, zweck))


def _ask_roh(provider, system, user, max_tokens=900, c=None, json_mode=False, zweck=None):
    """Die eigentliche Anfrage – nur über ask() aufrufen (Anonymisierung, Protokoll)."""
    if not (zweck == "kataloge" and provider == "claude"):
        _erlaubt(provider, c)
    if provider == "ollama":
        if not ollama_url():
            raise AIError("Ollama ist nicht eingerichtet")
        p = {"model": ollama_model(), "stream": False, "options": {"num_predict": max_tokens, "temperature": 0.2},
             "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}]}
        if json_mode:
            p["format"] = "json"
        d = _post(ollama_url() + "/api/chat", p, {}, timeout=240)   # CPU ohne Grafikkarte: kann dauern
        return (d.get("message") or {}).get("content", "")
    if provider == "claude":
        k = claude_conf(c, zweck)
        if not k["key"]:
            raise AIError("Kein Claude-Schlüssel hinterlegt")
        base = _env("ANTHROPIC_BASE_URL", "https://api.anthropic.com")
        d = _post(base + "/v1/messages", {"model": k["model"], "max_tokens": max_tokens, "system": system,
                                           "messages": [{"role": "user", "content": user}]},
                  {"x-api-key": k["key"], "anthropic-version": "2023-06-01"}, timeout=240 if zweck == "kataloge" else 90)
        ki_verbrauch.merke("claude", k["model"], d)
        return "".join(x.get("text", "") for x in d.get("content") or [] if x.get("type") == "text")
    if provider == "gemini":
        g = ext_conf(c, "gemini")
        key, model = g["key"], g["model"]
        if not key:
            raise AIError("Kein Gemini-Schlüssel hinterlegt")
        cfg = {"maxOutputTokens": max_tokens, "temperature": 0.2}
        if json_mode:
            cfg["responseMimeType"] = "application/json"
        d = _post(f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
                  {"systemInstruction": {"parts": [{"text": system}]}, "contents": [{"role": "user", "parts": [{"text": user}]}],
                   "generationConfig": cfg}, {"x-goog-api-key": key})
        ki_verbrauch.merke("gemini", model, d)
        cand = (d.get("candidates") or [{}])[0]
        return "".join(p.get("text", "") for p in (cand.get("content") or {}).get("parts") or [])
    if provider == "chatgpt":
        o = ext_conf(c, "chatgpt")
        key = o["key"]
        if not key:
            raise AIError("Kein OpenAI-Schlüssel hinterlegt")
        p = {"model": o["model"], "max_completion_tokens": max_tokens,
             "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}]}
        if json_mode:
            p["response_format"] = {"type": "json_object"}
        d = _post("https://api.openai.com/v1/chat/completions", p, {"authorization": "Bearer " + key})
        ki_verbrauch.merke("chatgpt", o["model"], d)
        return ((d.get("choices") or [{}])[0].get("message") or {}).get("content", "")
    raise AIError("Für „Intern“ gibt es keine KI-Anfrage")


VISION = ("claude", "gemini", "chatgpt")   # können Bilder (Pläne) lesen; das lokale Standardmodell von Ollama nicht


def ask_image(provider, system, user, png, max_tokens=2500, c=None):
    """Frage mit Bild (z. B. Grundriss als PNG). Antwort als Text. Der Text wird anonymisiert, das Bild nicht (das lässt sich nicht
    sicher austauschen – vor dem Senden an externe KI fragt die Oberfläche nach, BPHead.kiFragen mit bild)."""
    _erlaubt(provider, c)
    return _mit_schutz(provider, system, user, c, "bild", True, lambda s, u: _ask_image_roh(provider, s, u, png, max_tokens, c))


def _ask_image_roh(provider, system, user, png, max_tokens=2500, c=None):
    import base64
    b64 = base64.b64encode(png).decode()
    if provider == "claude":
        k = claude_conf(c)
        if not k["key"]:
            raise AIError("Kein Claude-Schlüssel hinterlegt")
        base = _env("ANTHROPIC_BASE_URL", "https://api.anthropic.com")
        d = _post(base + "/v1/messages", {"model": k["model"], "max_tokens": max_tokens, "system": system, "messages": [{"role": "user", "content": [
            {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": b64}}, {"type": "text", "text": user}]}]},
                  {"x-api-key": k["key"], "anthropic-version": "2023-06-01"}, timeout=180)
        ki_verbrauch.merke("claude", k["model"], d)
        return "".join(x.get("text", "") for x in d.get("content") or [] if x.get("type") == "text")
    if provider == "gemini":
        g = ext_conf(c, "gemini")
        if not g["key"]:
            raise AIError("Kein Gemini-Schlüssel hinterlegt")
        d = _post(f"https://generativelanguage.googleapis.com/v1beta/models/{g['model']}:generateContent",
                  {"systemInstruction": {"parts": [{"text": system}]}, "contents": [{"role": "user", "parts": [{"inline_data": {"mime_type": "image/png", "data": b64}}, {"text": user}]}],
                   "generationConfig": {"maxOutputTokens": max_tokens, "temperature": 0, "responseMimeType": "application/json"}}, {"x-goog-api-key": g["key"]}, timeout=180)
        ki_verbrauch.merke("gemini", g["model"], d)
        cand = (d.get("candidates") or [{}])[0]
        return "".join(p.get("text", "") for p in (cand.get("content") or {}).get("parts") or [])
    if provider == "chatgpt":
        o = ext_conf(c, "chatgpt")
        if not o["key"]:
            raise AIError("Kein OpenAI-Schlüssel hinterlegt")
        d = _post("https://api.openai.com/v1/chat/completions", {"model": o["model"], "max_completion_tokens": max_tokens, "response_format": {"type": "json_object"},
                  "messages": [{"role": "system", "content": system}, {"role": "user", "content": [{"type": "text", "text": user},
                                                                                                   {"type": "image_url", "image_url": {"url": "data:image/png;base64," + b64}}]}]},
                  {"authorization": "Bearer " + o["key"]}, timeout=180)
        ki_verbrauch.merke("chatgpt", o["model"], d)
        return ((d.get("choices") or [{}])[0].get("message") or {}).get("content", "")
    if provider == "ollama" and ollama_url():
        vm = ollama_vision_model()
        if not _hat(ollama_state()["models"], vm):
            raise AIError(f"Das Bildmodell {vm or '(keins)'} ist in Ollama noch nicht geladen – kurz warten oder Claude, Gemini, ChatGPT wählen")
        p = {"model": vm, "stream": False, "format": "json", "options": {"num_predict": max_tokens, "temperature": 0, "num_ctx": 16384},
             "messages": [{"role": "system", "content": system}, {"role": "user", "content": user, "images": [b64]}]}
        d = _post(ollama_url() + "/api/chat", p, {}, timeout=900)   # ohne Grafikkarte: mehrere Minuten
        return (d.get("message") or {}).get("content", "")
    raise AIError("Diese KI kann keine Pläne (Bilder) lesen – oben Claude, Gemini, ChatGPT oder Ollama (mit Bildmodell) wählen")


def ask_json(provider, system, user, max_tokens=900, c=None, zweck=None):
    """Wie ask(), Antwort als JSON-Objekt (Codeblöcke und Text drumherum werden entfernt)."""
    t = ask(provider, system, user, max_tokens, c, json_mode=True, zweck=zweck) or ""
    return parse_json(t)


def parse_json(t):
    """JSON aus einer KI-Antwort lesen – auch wenn Text drumherum steht oder die Antwort abgeschnitten wurde.
    Notfalls werden die vollständigen Einzelobjekte gerettet und unter „_objekte“ zurückgegeben."""
    import re
    t = re.sub(r"```(?:json)?", "", t or "").strip()
    i = t.find("{")
    if i >= 0:
        try:
            return json.JSONDecoder().raw_decode(t[i:])[0]
        except ValueError:
            pass
    m = re.search(r"\{[\s\S]*\}", t)
    if m:
        try:
            return json.loads(m.group(0))
        except ValueError:
            pass
    objs = []
    for x in re.findall(r"\{[^{}]*\}", t):   # abgeschnittene Antwort: vollständige Einträge retten
        try:
            o = json.loads(x)
            if isinstance(o, dict):
                objs.append(o)
        except ValueError:
            pass
    if objs:
        return {"_objekte": objs}
    raise AIError("Antwort der KI nicht lesbar")
