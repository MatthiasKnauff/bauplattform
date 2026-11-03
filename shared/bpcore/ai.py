"""KI der Bauplattform – eine Auswahl für alle Apps (Kopfleiste), mehrere Anbieter.

intern   Regeln und Kennwerte der jeweiligen App, ohne Internet, kostenlos (immer verfügbar)
ollama   eigener Ollama-Container im Docker-Netz (OLLAMA_URL, OLLAMA_MODEL) – kostenlos, Daten bleiben im Büro
claude   Anthropic (Schlüssel aus den Einstellungen des Bauzeitenplans oder ANTHROPIC_API_KEY)
gemini   Google (GEMINI_API_KEY, GEMINI_MODEL)
chatgpt  OpenAI (OPENAI_API_KEY, OPENAI_MODEL)

Schlüssel verlassen den Server nie; die Apps sehen nur „verfügbar ja/nein“.
"""
import json, os, threading, time, urllib.error, urllib.request

PROVIDERS = (
    ("intern", "Intern", "Regeln und Kennwerte – ohne Internet, kostenlos"),
    ("ollama", "Ollama", "eigener Server im Büro – kostenlos, Daten bleiben intern"),
    ("claude", "Claude", "Anthropic – kostenpflichtig je Anfrage"),
    ("gemini", "Gemini", "Google – kostenpflichtig je Anfrage"),
    ("chatgpt", "ChatGPT", "OpenAI – kostenpflichtig je Anfrage"),
)
KEYS = tuple(k for k, _, _ in PROVIDERS)


class AIError(Exception):
    pass


def _env(k, d=""):
    return (os.environ.get(k) or d).strip()


def ollama_url():
    return _env("OLLAMA_URL").rstrip("/")


def ollama_model():
    return _env("OLLAMA_MODEL", "qwen2.5:3b")


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
                has = want in names or want + ":latest" in names or (":" not in want and any(n.split(":")[0] == want for n in names))
                _oll.update(ok=has, models=names,
                            hint=f"Modell {want}" if has else f"Modell {want} wird noch geladen …" if not names else f"Modell {want} fehlt (vorhanden: {', '.join(names[:3])})")
            except Exception:
                _oll.update(ok=False, models=[], hint="Ollama-Container nicht erreichbar")
            _oll["t"] = time.time()
        return {"ok": _oll["ok"], "hint": _oll["hint"], "models": list(_oll["models"])}


def claude_conf(c=None):
    """Schlüssel/Modell wie im Bauzeitenplan (Programmeinstellungen), sonst ANTHROPIC_API_KEY."""
    a = {}
    if c is not None:
        try:
            r = c.execute("SELECT data FROM gantt_store WHERE key='settings'").fetchone()
            a = ((json.loads(r["data"]) if r else {}) or {}).get("ai") or {}
        except Exception:
            a = {}
    key = a.get("key") or _env("ANTHROPIC_API_KEY")
    model = a.get("model") or _env("ANTHROPIC_MODEL", "claude-haiku-5-5")
    return {"key": key, "model": model}


def providers(c=None):
    """Auswahl für die Kopfleiste: welche Anbieter sind eingerichtet?"""
    out = []
    for k, label, desc in PROVIDERS:
        if k == "intern":
            ok, hint = True, desc
        elif k == "ollama":
            st = ollama_state()
            ok, hint = st["ok"], (desc + " · " + st["hint"]) if st["ok"] else st["hint"]
        elif k == "claude":
            ok = bool(claude_conf(c)["key"])
            hint = desc if ok else "nicht eingerichtet (Schlüssel im Bauzeitenplan → Einstellungen oder ANTHROPIC_API_KEY)"
        elif k == "gemini":
            ok = bool(_env("GEMINI_API_KEY"))
            hint = desc if ok else "nicht eingerichtet (GEMINI_API_KEY)"
        else:
            ok = bool(_env("OPENAI_API_KEY"))
            hint = desc if ok else "nicht eingerichtet (OPENAI_API_KEY)"
        out.append({"key": k, "label": label, "ok": ok, "hint": hint, "paid": k in ("claude", "gemini", "chatgpt")})
    return out


def choice_of(user):
    v = (user["ai"] if user is not None and "ai" in user.keys() else "") or ""
    return v if v in KEYS else "intern"


def _post(url, payload, headers, timeout=90):
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
        raise AIError(f"KI-Fehler {e.code}: {msg}")
    except TimeoutError:
        raise AIError("Zeitüberschreitung bei der KI")
    except urllib.error.URLError as e:
        raise AIError("KI nicht erreichbar: " + str(e.reason))


def ask(provider, system, user, max_tokens=900, c=None, json_mode=False):
    """Eine Frage an den gewählten Anbieter. Gibt Text zurück (bei json_mode möglichst reines JSON)."""
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
        k = claude_conf(c)
        if not k["key"]:
            raise AIError("Kein Claude-Schlüssel hinterlegt")
        base = _env("ANTHROPIC_BASE_URL", "https://api.anthropic.com")
        d = _post(base + "/v1/messages", {"model": k["model"], "max_tokens": max_tokens, "system": system,
                                           "messages": [{"role": "user", "content": user}]},
                  {"x-api-key": k["key"], "anthropic-version": "2023-06-01"})
        return "".join(x.get("text", "") for x in d.get("content") or [] if x.get("type") == "text")
    if provider == "gemini":
        key = _env("GEMINI_API_KEY")
        if not key:
            raise AIError("Kein Gemini-Schlüssel hinterlegt")
        model = _env("GEMINI_MODEL", "gemini-2.5-flash")
        cfg = {"maxOutputTokens": max_tokens, "temperature": 0.2}
        if json_mode:
            cfg["responseMimeType"] = "application/json"
        d = _post(f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
                  {"systemInstruction": {"parts": [{"text": system}]}, "contents": [{"role": "user", "parts": [{"text": user}]}],
                   "generationConfig": cfg}, {"x-goog-api-key": key})
        cand = (d.get("candidates") or [{}])[0]
        return "".join(p.get("text", "") for p in (cand.get("content") or {}).get("parts") or [])
    if provider == "chatgpt":
        key = _env("OPENAI_API_KEY")
        if not key:
            raise AIError("Kein OpenAI-Schlüssel hinterlegt")
        p = {"model": _env("OPENAI_MODEL", "gpt-4.1-mini"), "max_completion_tokens": max_tokens,
             "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}]}
        if json_mode:
            p["response_format"] = {"type": "json_object"}
        d = _post("https://api.openai.com/v1/chat/completions", p, {"authorization": "Bearer " + key})
        return ((d.get("choices") or [{}])[0].get("message") or {}).get("content", "")
    raise AIError("Für „Intern“ gibt es keine KI-Anfrage")


def ask_json(provider, system, user, max_tokens=900, c=None):
    """Wie ask(), Antwort als JSON-Objekt (Codeblöcke und Text drumherum werden entfernt)."""
    import re
    t = ask(provider, system, user, max_tokens, c, json_mode=True) or ""
    m = re.search(r"\{[\s\S]*\}", t)
    try:
        return json.loads(m.group(0) if m else t)
    except ValueError:
        raise AIError("Antwort der KI nicht lesbar")
