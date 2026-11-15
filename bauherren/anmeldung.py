"""Anmeldung im Bauherrenportal – drei Wege, frei wählbar (entschieden am 15.11.2026):
  Anmeldelink per Mail (15 Minuten, einmal) · Kennwort + zweiter Faktor (Authenticator-App, TOTP nach RFC 6238) ·
  QR-Code wie bei Nextcloud: der PC zeigt einen Code, das angemeldete Handy scannt und erlaubt; oder der angemeldete PC koppelt ein Handy.
Hat ein Konto den zweiten Faktor eingeschaltet, fragt auch der Anmeldelink danach (QR vom angemeldeten Gerät nicht – das ist schon geprüft).
Gespeichert werden nur Prüfsummen der Schlüssel, nie die Schlüssel selbst. Mails schickt das Portal nicht selbst: der Auftrag geht in den
Eingangskorb, der Kern verschickt ihn mit dem Mailzugang des Büros (der bleibt im Büro).
"""
import base64, hashlib, hmac, os, secrets, struct, threading, time
from urllib.parse import quote

KEKS = "bh_sitzung"
SICHER = os.environ.get("BH_UNSICHER") != "1"   # nur zum Testen ohne https: BH_UNSICHER=1
SITZUNG = 30 * 86400   # Gerät 30 Tage gemerkt
LINK = 900
QR_GUELTIG = 300
_D, _DL = {}, threading.Lock()


def kern_ok(kopf):
    s = os.environ.get("BH_SCHLUESSEL", "")
    return len(s) >= 32 and hmac.compare_digest(kopf.encode(), ("Bearer " + s).encode())


def drossel(key, n, sek):
    """Höchstens n Versuche je sek – im Speicher (ein Arbeitsprozess)."""
    jetzt = time.time()
    with _DL:
        L = [t for t in _D.get(key, []) if t > jetzt - sek]
        if len(L) >= n:
            _D[key] = L
            return False
        L.append(jetzt)
        _D[key] = L
        if len(_D) > 50000:
            _D.clear()
    return True


def _h(t):
    return hashlib.sha256(t.encode()).hexdigest()


def _konto(c, kid):
    r = c.execute("SELECT * FROM konto WHERE id=? AND aktiv=1", (kid,)).fetchone()
    return dict(r) if r else None


def _neue_sitzung(c, kid, ua, offen=False):
    t = secrets.token_urlsafe(32)
    c.execute("INSERT INTO sitzung(hash, konto, ablauf, geraet, offen_code) VALUES(?,?,?,?,?)", (_h(t), kid, time.time() + SITZUNG, ua[:200], 1 if offen else 0))
    c.execute("DELETE FROM sitzung WHERE ablauf<?", (time.time(),))
    return {"token": t, "zweiter": offen}


def keks_setzen(resp, r):
    resp.set_cookie(KEKS, r["token"], max_age=SITZUNG, httponly=True, secure=SICHER, samesite="Lax")
    return resp


def sitzung(c, t):
    if not t:
        return None
    r = c.execute("SELECT s.offen_code, k.* FROM sitzung s JOIN konto k ON k.id=s.konto WHERE s.hash=? AND s.ablauf>? AND k.aktiv=1", (_h(t), time.time())).fetchone()
    if not r:
        return None
    d = dict(r)
    d["offen_code"] = bool(d.get("offen_code"))
    return d


def sitzung_ende(c, t):
    if t:
        c.execute("DELETE FROM sitzung WHERE hash=?", (_h(t),))


# ---------- Anmeldelink ----------
def link_neu(c, kid, zweck, sek=LINK):
    t = secrets.token_urlsafe(32)
    c.execute("INSERT INTO einmal(hash, konto, zweck, ablauf) VALUES(?,?,?,?)", (_h(t), kid, zweck, time.time() + sek))
    c.execute("DELETE FROM einmal WHERE ablauf<?", (time.time() - 3600,))
    return t


def link_senden(c, mail, basis):
    from speicher import eingang_neu
    k = c.execute("SELECT id, name FROM konto WHERE email=? AND aktiv=1", (mail,)).fetchone()
    if not k:
        return   # nicht verraten, ob es die Adresse gibt
    t = link_neu(c, k["id"], "link")
    url = basis.rstrip("/") + "/l/" + t
    eingang_neu(c, "mail", "", {"an": mail, "betreff": "Ihr Anmeldelink zum Bauherrenportal",
                                "text": f"Guten Tag{(' ' + k['name']) if k['name'] else ''},\n\nmit diesem Link melden Sie sich im Bauherrenportal an (gilt 15 Minuten, nur einmal):\n{url}\n\n"
                                        "Wenn Sie den Link nicht angefordert haben, können Sie diese Mail einfach löschen."}, k["id"])


def link_einloesen(c, t, ua):
    r = c.execute("SELECT * FROM einmal WHERE hash=? AND zweck IN ('link','koppeln') AND ablauf>?", (_h(t), time.time())).fetchone()
    if not r:
        return None
    c.execute("DELETE FROM einmal WHERE hash=?", (_h(t),))
    k = _konto(c, r["konto"])
    if not k:
        return None
    return _neue_sitzung(c, k["id"], ua, offen=bool(k["totp"]) and r["zweck"] == "link")


# ---------- Kennwort ----------
def kennwort_setzen(c, kid, pw):
    salz = secrets.token_bytes(16)
    h = hashlib.scrypt(pw.encode(), salt=salz, n=2 ** 14, r=8, p=1)
    c.execute("UPDATE konto SET pw=? WHERE id=?", ("scrypt$" + salz.hex() + "$" + h.hex(), kid))


def _pw_ok(gespeichert, pw):
    try:
        _, salz, h = gespeichert.split("$")
        return hmac.compare_digest(hashlib.scrypt(pw.encode(), salt=bytes.fromhex(salz), n=2 ** 14, r=8, p=1).hex(), h)
    except (ValueError, TypeError):
        return False


def kennwort_pruefen(c, mail, pw, code, ua):
    k = c.execute("SELECT * FROM konto WHERE email=? AND aktiv=1", (mail,)).fetchone()
    if not k or not k["pw"] or not _pw_ok(k["pw"], pw):
        return None
    if k["totp"]:
        if not code:
            return "code"
        if not totp_ok(k["totp"], code):
            return None
    return _neue_sitzung(c, k["id"], ua)


def code_nachreichen(c, t, code):
    s = sitzung(c, t)
    if not s or not s["offen_code"] or not totp_ok(s["totp"], code):
        return False
    c.execute("UPDATE sitzung SET offen_code=0 WHERE hash=?", (_h(t),))
    return True


# ---------- zweiter Faktor (TOTP, RFC 6238: 30 s, 6 Stellen, SHA-1 – so lesen es alle Authenticator-Apps) ----------
def _totp(geheim, schritt):
    key = base64.b32decode(geheim + "=" * (-len(geheim) % 8))
    d = hmac.new(key, struct.pack(">Q", schritt), hashlib.sha1).digest()
    o = d[-1] & 15
    return "%06d" % ((struct.unpack(">I", d[o:o + 4])[0] & 0x7FFFFFFF) % 1_000_000)


def totp_ok(geheim, code, jetzt=None):
    code = "".join(ch for ch in str(code) if ch.isdigit())
    if not geheim or len(code) != 6:
        return False
    s = int((jetzt or time.time()) // 30)
    return any(hmac.compare_digest(_totp(geheim, s + d), code) for d in (-1, 0, 1))


def totp_start(c, kid, mail):
    g = base64.b32encode(secrets.token_bytes(20)).decode().rstrip("=")
    c.execute("UPDATE konto SET totp_neu=? WHERE id=?", (g, kid))
    return g, f"otpauth://totp/{quote('Bauherrenportal:' + mail)}?secret={g}&issuer=Bauherrenportal"


def totp_bestaetigen(c, kid, code):
    r = c.execute("SELECT totp_neu FROM konto WHERE id=?", (kid,)).fetchone()
    if not r or not totp_ok(r["totp_neu"], code):
        return False
    c.execute("UPDATE konto SET totp=totp_neu, totp_neu='' WHERE id=?", (kid,))
    return True


def totp_aus(c, kid, code):
    r = c.execute("SELECT totp FROM konto WHERE id=?", (kid,)).fetchone()
    if not r or not totp_ok(r["totp"], code):
        return False
    c.execute("UPDATE konto SET totp='' WHERE id=?", (kid,))
    return True


# ---------- QR-Code wie bei Nextcloud ----------
def qr_neu(c):
    t, geheim = secrets.token_urlsafe(24), secrets.token_urlsafe(24)
    c.execute("INSERT INTO einmal(hash, zweck, ablauf, geheim) VALUES(?,?,?,?)", (_h(t), "qr", time.time() + QR_GUELTIG, _h(geheim)))
    return t, geheim


def qr_erlauben(c, t, kid):
    return c.execute("UPDATE einmal SET erlaubt=? WHERE hash=? AND zweck='qr' AND ablauf>? AND erlaubt IS NULL", (kid, _h(t), time.time())).rowcount == 1


def qr_abholen(c, t, geheim, ua):
    """None = noch nicht erlaubt · False = abgelaufen · sonst die neue Sitzung (nur der Browser mit dem Geheimnis bekommt sie)."""
    r = c.execute("SELECT * FROM einmal WHERE hash=? AND zweck='qr'", (_h(t),)).fetchone()
    if not r or r["ablauf"] < time.time():
        return False
    if not geheim or not hmac.compare_digest(r["geheim"], _h(geheim)) or not r["erlaubt"]:
        return None
    c.execute("DELETE FROM einmal WHERE hash=?", (_h(t),))
    return _neue_sitzung(c, r["erlaubt"], ua) if _konto(c, r["erlaubt"]) else False


def qr_svg(text):
    from bpcore.handyus import qr_svg as q   # reportlab, ohne weiteres Paket
    return q(text, 220)
