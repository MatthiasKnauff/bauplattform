"""Eigene Postfächer per Anmeldung beim Anbieter (OAuth 2.0) statt mit Passwort – Google (Gmail) und Microsoft (Outlook.com, fremde M365).

Ablauf (Autorisierungscode mit PKCE):
  1. „Mit Google/Microsoft verbinden“ → /api/bp/oauth/<anbieter>/start → Weiterleitung zur Anmeldeseite des Anbieters.
  2. Der Anbieter schickt zurück an /api/bp/oauth/rueck (diese Adresse muss beim Anbieter eingetragen sein).
  3. Gespeichert wird nur das Erneuerungs-Token (bp_store „postfaecher:<uid>“, verlässt den Server nie), kein Passwort.
Berechtigung nur LESEN: Google gmail.readonly, Microsoft Mail.Read (delegiert). Trennen widerruft das Token (Google) bzw.
löscht es (Microsoft – dort zusätzlich unter account.microsoft.com → Datenschutz → Apps entziehen).
Zugangsdaten der App: Verwaltung → Einstellungen → Mailserver → „Anmeldung bei Google/Microsoft“.
"""
import base64, hashlib, json, re, secrets, urllib.error, urllib.parse, urllib.request
from datetime import datetime, timedelta, timezone

ANBIETER = {
    "google": {"name": "Google (Gmail)", "auth": "https://accounts.google.com/o/oauth2/v2/auth", "token": "https://oauth2.googleapis.com/token",
               "scope": "openid email https://www.googleapis.com/auth/gmail.readonly"},
    "microsoft": {"name": "Microsoft (Outlook.com)", "auth": "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
                  "token": "https://login.microsoftonline.com/common/oauth2/v2.0/token",
                  "scope": "offline_access openid email https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/User.Read"},
}
PFAD = "/api/bp/oauth/rueck"


def _now():
    return datetime.now().isoformat(timespec="seconds")


def app_conf(c, anbieter):
    S = {r["key"]: (r["value"] or "").strip() for r in c.execute(
        "SELECT key, value FROM settings WHERE key IN ('oauth_google_client','oauth_google_secret','oauth_ms_client','oauth_ms_secret','m365_client','m365_secret','app_url')")}
    if anbieter == "google":
        cid, sec = S.get("oauth_google_client", ""), S.get("oauth_google_secret", "")
    else:   # eigene App für Microsoft-Konten, sonst die Posteingang-App (muss dann „alle Konten“ erlauben)
        cid, sec = S.get("oauth_ms_client") or S.get("m365_client", ""), S.get("oauth_ms_secret") or S.get("m365_secret", "")
    return {"client": cid, "secret": sec, "rueck": (S.get("app_url") or "").rstrip("/") + PFAD if S.get("app_url") else ""}


def bereit(c):
    return {a: bool(app_conf(c, a)["client"] and app_conf(c, a)["secret"] and app_conf(c, a)["rueck"]) for a in ANBIETER}


def _post(url, d):
    req = urllib.request.Request(url, data=urllib.parse.urlencode(d).encode(), headers={"Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        try:
            j = json.loads(e.read().decode())
        except Exception:
            j = {}
        raise RuntimeError(f"Anbieter lehnt ab ({e.code}): {j.get('error_description') or j.get('error') or ''}".strip()[:300])


def _get(url, tok):
    req = urllib.request.Request(url, headers={"Authorization": "Bearer " + tok, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=25) as r:
        return json.loads(r.read().decode())


def start(c, u, anbieter, zurueck):
    """Anmelde-Adresse beim Anbieter; der Zustand (mit PKCE-Geheimnis) liegt 10 Minuten im bp_store."""
    from . import konto
    A, K = ANBIETER[anbieter], app_conf(c, anbieter)
    if not (K["client"] and K["secret"]):
        raise RuntimeError(f"Die Anmeldung bei {A['name']} ist noch nicht eingerichtet (Verwaltung → Einstellungen → Mailserver).")
    if not K["rueck"]:
        raise RuntimeError("In den Einstellungen fehlt die „Adresse in den Links“ (z. B. https://bauportal.firma.de).")
    state, ver = secrets.token_urlsafe(32), secrets.token_urlsafe(64)
    ch = base64.urlsafe_b64encode(hashlib.sha256(ver.encode()).digest()).decode().rstrip("=")
    zurueck = zurueck if isinstance(zurueck, str) and re.fullmatch(r"/[\w/.-]{0,120}", zurueck or "") else "/"
    konto._put(c, "oauthstate:" + hashlib.sha256(state.encode()).hexdigest(),
               json.dumps({"uid": u["id"], "anbieter": anbieter, "ver": ver, "zurueck": zurueck,
                           "bis": (datetime.now() + timedelta(minutes=10)).isoformat(timespec="seconds")}), u["name"])
    q = {"client_id": K["client"], "redirect_uri": K["rueck"], "response_type": "code", "scope": A["scope"], "state": state,
         "code_challenge": ch, "code_challenge_method": "S256"}
    if anbieter == "google":
        q.update(access_type="offline", prompt="consent", include_granted_scopes="true")
    else:
        q.update(response_mode="query", prompt="select_account")
    return A["auth"] + "?" + urllib.parse.urlencode(q)


def rueck(c, u, state, code):
    """Code gegen Tokens tauschen, Adresse ermitteln, Konto speichern. → (Rücksprungpfad, Meldung)."""
    from . import konto, posteingang
    k = "oauthstate:" + hashlib.sha256(str(state or "").encode()).hexdigest()
    raw = konto._get(c, k)
    c.execute("DELETE FROM bp_store WHERE key=?", (k,))   # nur einmal verwendbar
    if not raw:
        raise RuntimeError("Die Anmeldung ist abgelaufen oder ungültig – bitte noch einmal „verbinden“.")
    st = json.loads(raw)
    if st["uid"] != u["id"] or st["bis"] < _now():
        raise RuntimeError("Die Anmeldung gehört zu einer anderen Sitzung oder ist abgelaufen – bitte noch einmal „verbinden“.")
    an, K = st["anbieter"], app_conf(c, st["anbieter"])
    t = _post(ANBIETER[an]["token"], {"client_id": K["client"], "client_secret": K["secret"], "code": code, "redirect_uri": K["rueck"],
                                      "grant_type": "authorization_code", "code_verifier": st["ver"]})
    if not t.get("refresh_token"):
        raise RuntimeError("Der Anbieter hat keinen Dauerzugang erteilt – bitte noch einmal verbinden und alle Häkchen bestätigen.")
    if an == "google":
        adr = (_get("https://openidconnect.googleapis.com/v1/userinfo", t["access_token"]).get("email") or "").lower()
    else:
        me = _get("https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName", t["access_token"])
        adr = (me.get("mail") or me.get("userPrincipalName") or "").lower()
    pf = posteingang.postfaecher(c, u["id"])
    konten = [x for x in pf["konten"] if not (x.get("art") == "oauth" and x.get("anbieter") == an and x.get("user") == adr)]
    konten.append({"id": secrets.token_hex(4), "art": "oauth", "anbieter": an, "name": ANBIETER[an]["name"].split(" (")[0] + (" · " + adr if adr else ""),
                   "user": adr, "refresh": t["refresh_token"], "an": True, "seit": _now()})
    d = json.loads(konto._get(c, f"postfaecher:{u['id']}") or "{}")
    d["konten"] = konten[:8]
    konto._put(c, f"postfaecher:{u['id']}", json.dumps(d, ensure_ascii=False), u["name"])
    return st["zurueck"], f"{adr or 'Postfach'} ist verbunden."


def _access(c, uid, k):
    """Zugangs-Token aus dem Erneuerungs-Token; ein neues Erneuerungs-Token (Microsoft) wird gleich gespeichert."""
    from . import konto
    K = app_conf(c, k["anbieter"])
    t = _post(ANBIETER[k["anbieter"]]["token"], {"client_id": K["client"], "client_secret": K["secret"], "refresh_token": k["refresh"], "grant_type": "refresh_token",
                                                  **({"scope": ANBIETER["microsoft"]["scope"]} if k["anbieter"] == "microsoft" else {})})
    if t.get("refresh_token") and t["refresh_token"] != k["refresh"] and uid:
        d = json.loads(konto._get(c, f"postfaecher:{uid}") or "{}")
        for x in d.get("konten") or []:
            if x.get("id") == k.get("id"):
                x["refresh"] = t["refresh_token"]
        konto._put(c, f"postfaecher:{uid}", json.dumps(d, ensure_ascii=False), "posteingang")
    return t["access_token"]


def lesen(c, uid, k, seit):
    """Mails seit `seit` im Format von posteingang (wie m365_lesen / imap_lesen)."""
    tok, adr, out = _access(c, uid, k), (k.get("user") or "").lower(), []
    if k["anbieter"] == "microsoft":
        q = urllib.parse.urlencode({"$filter": f"receivedDateTime ge {seit.strftime('%Y-%m-%dT%H:%M:%SZ')}", "$orderby": "receivedDateTime desc", "$top": "80",
                                    "$select": "id,subject,from,toRecipients,ccRecipients,receivedDateTime,bodyPreview,hasAttachments,webLink,isRead"})
        for x in _get("https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?" + q, tok).get("value") or []:
            f = (x.get("from") or {}).get("emailAddress") or {}
            out.append({"id": "o:" + x["id"][-40:], "quelle": adr, "von": (f.get("address") or "").lower(), "von_name": f.get("name") or "",
                        "betreff": x.get("subject") or "", "zeit": x.get("receivedDateTime") or "", "vorschau": (x.get("bodyPreview") or "")[:400],
                        "anhaenge": [], "link": x.get("webLink") or "", "gelesen": bool(x.get("isRead")), "postfach": adr,
                        "an": [((r.get("emailAddress") or {}).get("address") or "").lower() for r in x.get("toRecipients") or []][:40],
                        "cc": [((r.get("emailAddress") or {}).get("address") or "").lower() for r in x.get("ccRecipients") or []][:40],
                        "suchtext": x.get("bodyPreview") or ""})
        return out
    import email.utils
    q = urllib.parse.urlencode({"q": f"in:inbox after:{int(seit.timestamp())}", "maxResults": "60"})
    for m in _get("https://gmail.googleapis.com/gmail/v1/users/me/messages?" + q, tok).get("messages") or []:
        x = _get(f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{m['id']}?format=metadata"
                 "&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Cc&metadataHeaders=Subject&metadataHeaders=Date", tok)
        H = {h["name"].lower(): h["value"] for h in (x.get("payload") or {}).get("headers") or []}
        name, von = email.utils.parseaddr(H.get("from", ""))
        zeit = datetime.fromtimestamp(int(x.get("internalDate") or 0) / 1000, timezone.utc).isoformat().replace("+00:00", "Z")
        lst = lambda s: [a.lower() for _, a in email.utils.getaddresses([s or ""]) if a][:40]
        out.append({"id": "g:" + x["id"], "quelle": adr, "von": von.lower(), "von_name": name, "betreff": H.get("subject", ""), "zeit": zeit,
                    "vorschau": (x.get("snippet") or "")[:400], "anhaenge": [], "link": f"https://mail.google.com/mail/u/{urllib.parse.quote(adr)}/#inbox/{x['id']}",
                    "gelesen": "UNREAD" not in (x.get("labelIds") or []), "postfach": adr, "an": lst(H.get("to")), "cc": lst(H.get("cc")),
                    "suchtext": x.get("snippet") or ""})
    return out


def widerrufen(k):
    """Beim Trennen: Google-Token widerrufen (Microsoft kennt keinen Widerruf per Schnittstelle – Token wird nur gelöscht)."""
    if k.get("anbieter") == "google" and k.get("refresh"):
        try:
            _post("https://oauth2.googleapis.com/revoke", {"token": k["refresh"]})
        except Exception:
            pass
