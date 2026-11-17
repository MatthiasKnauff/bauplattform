"""Bauherrenportal – die Seite des Büros (beschlossen am 15.11.2026, Entwurf „Bauherrenportal: Aufbau“).

Das Portal (App „bauherren“) läuft auf einem eigenen Server (Google Cloud) und erreicht das Büro NIE. Der Kern:
  freigeben()   eine App gibt etwas für Bauherr:innen frei → Paket in bh_freigabe (Baustein head/freigeben.js: BPHead.bauherrFreigeben)
  abgleich()    der Dienst (bautagebuch/core/bauherren_dienst.py) schiebt neue Pakete und Konten hinaus und holt den Eingangskorb ab:
                Nachrichten → bh_eingang (To-do „Bauherrenportal“), Mail-Aufträge (Anmeldelinks) → mit dem Mailzugang des Büros verschicken
Einstellungen in bp_store „bauherren:einst“ {an, url, takt}; der Schlüssel liegt für sich in „bauherren:schluessel“ und geht nie an den Browser.

Entschieden am 16.11.2026 (Entwurf „Bauherrenportal: freigeben, an/aus, Uploads“):
  Bereiche je Projekt an/aus (BEREICHE; bp_store „bauherren:bereiche:<pid>“) – was aus ist, zeigt das Portal nicht (bleibt aber gespeichert).
  Freigaben können PDFs/Bilder tragen (bh_datei) – das Portal zeigt sie an. Bauherr:innen können Dateien hochladen: der Kern holt sie im Takt
  ab, legt sie in „Pläne & Dateien / Projekt / Von Bauherr:in“ (ablegen() des Dienstes) und behält eine Kopie in bh_datei („e:<id>“).
"""
import base64, json, os, ssl, time, urllib.request
from datetime import datetime

from . import rechte

ARTEN = {"gebaeude": "Gebäude", "tagesbericht": "Bautagebuch", "termine": "Termine", "rechnung": "Rechnungen", "kosten": "Kosten", "maengel": "Mängel", "plan": "Pläne",
         "foto": "Fotos", "info": "Informationen"}
TAKT = 60   # Sekunden – Vorgabe, in der Verwaltung einstellbar (15 … 3600)
BEREICHE = {"gebaeude": "Gebäude (Räume, Maßnahmen, 3D)", "tagesbericht": "Bautagebuch", "termine": "Termine", "kosten": "Kosten", "plan": "Pläne", "rechnung": "Rechnungen", "maengel": "Mängel",
            "foto": "Fotos", "info": "Informationen", "upload": "Dateien hochladen", "nachricht": "Nachrichten schreiben"}
VORGABE_AUS = {"kosten", "rechnung"}   # erst nach Absprache – das Portal nimmt dieselbe Vorgabe (bauherren/speicher.py)
MIME = {"application/pdf", "image/jpeg", "image/png", "image/webp"}   # was an einer Freigabe hängen darf
DATEI_MAX = 60 * 1024 * 1024   # je Freigabe
HAEPPCHEN = 20 * 1024 * 1024   # je Aufruf beim Abgleich (das Portal nimmt bis 80 MB)


def _jetzt():
    return datetime.now().strftime("%Y-%m-%dT%H:%M:%S")


def _t(v, n):
    return str(v if v is not None else "").strip()[:n]


def _store(c, k, v=None):
    if v is None:
        r = c.execute("SELECT data FROM bp_store WHERE key=?", (k,)).fetchone()
        try:
            return json.loads(r["data"]) if r else None
        except ValueError:
            return None
    c.execute("INSERT INTO bp_store(key, data, updated, updated_by) VALUES(?,?,?,'bauherren') ON CONFLICT(key) DO UPDATE SET data=excluded.data, updated=excluded.updated",
              (k, json.dumps(v, ensure_ascii=False), _jetzt()))


def einst(c):
    E = _store(c, "bauherren:einst") or {}
    return {"an": bool(E.get("an")), "url": _t(E.get("url"), 300), "takt": max(15, min(3600, int(E.get("takt") or TAKT))),
            "schluessel": bool(_store(c, "bauherren:schluessel")), "stand": _store(c, "bauherren:stand") or {},
            "testmails": (_store(c, "bauherren:testmails") or [])[::-1] if os.environ.get("TESTSERVER") == "1" else None}


def einst_setzen(c, b):
    E = _store(c, "bauherren:einst") or {}
    if "an" in b:
        E["an"] = bool(b["an"])
    if "url" in b:
        u = _t(b["url"], 300).rstrip("/")
        if u and not u.startswith("https://") and not u.startswith("http://"):
            raise ValueError("Bitte die Adresse mit https:// angeben.")
        E["url"] = u
    if "takt" in b:
        E["takt"] = max(15, min(3600, int(b.get("takt") or TAKT)))
    _store(c, "bauherren:einst", E)
    if _t(b.get("schluessel"), 200):   # nur setzen, nie zurückgeben
        if len(b["schluessel"].strip()) < 32:
            raise ValueError("Der Schlüssel muss mindestens 32 Zeichen lang sein.")
        _store(c, "bauherren:schluessel", b["schluessel"].strip())
    return einst(c)


def darf(u):
    return rechte.hat(u, "bauherren") or rechte.hat(u, "verwaltung")


def bereiche(c, pid):
    """{Bereich: an?} eines Projekts – nie gesetzt: alles an außer VORGABE_AUS."""
    B = (_store(c, f"bauherren:bereiche:{int(pid)}") or {}).get("b") or {}
    return {k: bool(B[k]) if k in B else k not in VORGABE_AUS for k in BEREICHE}


def bereiche_setzen(c, pid, werte):
    B = bereiche(c, pid)
    B.update({k: bool(v) for k, v in (werte or {}).items() if k in BEREICHE})
    _store(c, f"bauherren:bereiche:{int(pid)}", {"b": B, "gesendet": ""})
    return B


def datei_speichern(c, schluessel, dateien):
    """dateien: [(name, mime, bytes)] → bh_datei (ersetzt, was an diesem Schlüssel hing)."""
    c.execute("DELETE FROM bh_datei WHERE schluessel=?", (schluessel,))
    for i, (name, mime, data) in enumerate(dateien or []):
        c.execute("INSERT INTO bh_datei(schluessel, nr, name, mime, groesse, inhalt, created) VALUES(?,?,?,?,?,?,?)",
                  (schluessel, i, _t(name, 200) or f"Datei {i + 1}", _t(mime, 100), len(data), data, _jetzt()))


def dateien(c, schluessel, mit_inhalt=False):
    return [{"nr": r["nr"], "name": r["name"], "mime": r["mime"], "groesse": r["groesse"], **({"inhalt": bytes(r["inhalt"] or b"")} if mit_inhalt else {})}
            for r in c.execute(f"SELECT nr, name, mime, groesse{', inhalt' if mit_inhalt else ''} FROM bh_datei WHERE schluessel=? ORDER BY nr", (schluessel,)).fetchall()]


def gebaeude_daten(c, pid):
    """Stand des Gebäudemodells für die Bauherr:innen (Klärung 19): Planstand, Räume und Flächen, Maßnahmen, 3D – keine Kosten
    (die gibt es nur über die eigene Freigabe der App Kosten), keine Preise, keine Interna (Hinweise, Aufbau-Codes)."""
    from . import bauteilliste as BL, modell, netz as N
    m = modell.lesen(c, pid)["modell"]
    L = m.get("bauteilliste") or {}
    q, R = L.get("quelle") or {}, L.get("raeume") or m.get("raeume") or []
    Z = [z for z in L.get("zeilen") or [] if not z.get("entfaellt")]
    zahl = lambda v: f"{v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")   # noqa: E731
    fl = sum(r.get("flaeche") or 0 for r in R)
    gel = str(q.get("gelesen") or "")[:10]
    text = (f"Planstand „{q.get('name') or q.get('datei') or 'Gebäudemodell'}“" + (f" vom {gel[8:10]}.{gel[5:7]}.{gel[:4]}" if len(gel) == 10 else "") + ". "
            if q else "") + (f"{len(R)} Räume mit zusammen {zahl(fl)} m²." if R else "")
    zeilen = ([["Raum", "Geschoss", "Fläche"]] + [[" ".join(x for x in (r.get("nr") or "", r.get("name") or "") if x), r.get("geschoss") or "", f"{zahl(r.get('flaeche') or 0)} m²"] for r in R]
              + [["Summe", "", f"{zahl(fl)} m²"]]) if R else []
    mass = [f"{z['name']}: {BL.WORT.get(z['status'], z['status'])}" + (f" ({zahl(z['menge']).rstrip('0').rstrip(',')} {z['einheit']})" if z.get("menge") else "") + (f" – {z['kurz']}" if z.get("kurz") else "")
            for z in Z if z.get("status") in ("instandsetzen", "erneuern", "neu", "abbruch")]
    out = {"text": text.strip() or "Gebäudemodell", "zeilen": zeilen, "liste": mass[:400]}
    r = c.execute("SELECT daten FROM pm_netz WHERE planstand=?", (q.get("planstand") or 0,)).fetchone() if q.get("planstand") else None
    if r:
        out["netz"] = N.auspacken(bytes(r["daten"]))
        out["netz_zeilen"] = [{"id": z["id"], "name": z["name"], "status": z["status"], "ids": z.get("ids") or [], "nummern": z.get("nummern") or [], "kurz": z.get("kurz") or ""}
                              for z in Z if z.get("ids")]
    return out


def freigeben(c, u, b, anhang=None):
    """{pid, art, schluessel, titel, stand, daten} → Paket; derselbe Schlüssel ersetzt das alte (z. B. „termine“ je Projekt nur einmal).
    anhang: [(name, mime, bytes)] – PDFs/Bilder, die das Portal zeigt (Pläne, Rechnungen, Tagesbericht als PDF)."""
    pid = int(b.get("pid") or 0)
    if not pid or not c.execute("SELECT 1 FROM projects WHERE id=?", (pid,)).fetchone():
        raise ValueError("Projekt fehlt.")
    art = _t(b.get("art"), 40) or "info"
    sk = f"{pid}:{art}:{_t(b.get('schluessel'), 80) or _t(b.get('titel'), 80)}"
    daten = b.get("daten") if isinstance(b.get("daten"), (dict, list)) else {"text": _t(b.get("text"), 20000)}
    if art == "termine" and isinstance(daten, dict) and isinstance(daten.get("plan"), dict):   # Bauzeitenplan: Balken wie die Link-Ansicht (bpcore/zeitplan.py)
        from . import zeitplan
        daten = {k: v for k, v in daten.items() if k != "plan"}
        daten["zeitplan"] = {"zeilen": zeitplan.zeilen(b["daten"]["plan"], {"fortschritt": True}), "fortschritt": True}
    if art == "termine":   # Vorgabe: nur Bauphasen und Meilensteine (bauherren_kopf, je Projekt „alle Leistungen“)
        from .bauherren_kopf import termine_filtern
        daten = termine_filtern(c, pid, daten)
    if art == "gebaeude":   # Gebäude: der Kern stellt den Stand aus dem Modell zusammen (nie Kosten); Versionen = Planstände (17.11.2026)
        daten = gebaeude_daten(c, pid)
    if art not in ("gebaeude", "termine"):   # Karte für die Listen im Portal und Vorschaubilder (bauherren_karte, 17.11.2026)
        from .bauherren_karte import karte
        daten, anhang = karte(art, daten, anhang)
    roh = json.dumps(daten, ensure_ascii=False)
    if len(roh) > 15_000_000:
        raise ValueError("Zu groß für das Portal (höchstens 15 MB je Freigabe).")
    for name, mime, data in anhang or []:
        if mime not in MIME:
            raise ValueError(f"„{name}“: nur PDF und Bilder lassen sich freigeben.")
    if sum(len(x[2]) for x in anhang or []) > DATEI_MAX:
        raise ValueError("Zu groß für das Portal (höchstens 60 MB je Freigabe).")
    j = _jetzt()
    c.execute("INSERT INTO bh_freigabe(schluessel, project_id, art, titel, stand, daten, von, created, updated) VALUES(?,?,?,?,?,?,?,?,?) "
              "ON CONFLICT(schluessel) DO UPDATE SET titel=excluded.titel, stand=excluded.stand, daten=excluded.daten, von=excluded.von, updated=excluded.updated, gesendet='', geloescht=''",
              (sk, pid, art, _t(b.get("titel"), 300) or ARTEN.get(art, art), _t(b.get("stand"), 40) or j[:10], roh, (u or {}).get("name", ""), j, j))
    if anhang is not None:
        datei_speichern(c, sk, anhang)
    return {"ok": True, "schluessel": sk, "bereich_aus": not bereiche(c, pid).get(art, True)}


def zurueckziehen(c, schluessel):
    c.execute("UPDATE bh_freigabe SET geloescht=?, gesendet='' WHERE schluessel=?", (_jetzt(), schluessel))


def freigaben(c, pid):
    return [dict(r) for r in c.execute("SELECT schluessel, art, titel, stand, von, updated, gesendet, geloescht FROM bh_freigabe WHERE project_id=? ORDER BY updated DESC", (pid,)).fetchall()]


def vorschlaege(c, pid):
    """Wer sich als Bauherr:in anbietet (Einladen, 17.11.2026): Bauherr:in, Vertretung und Ansprechperson aus den Projektdaten zuerst,
    dann Beteiligte mit „Bauherr“ im Gewerk – nur mit E-Mail, ohne die schon Eingeladenen. Freie Eingabe bleibt möglich."""
    from . import stammdaten, versand
    da = {k["email"].lower() for k in konten(c, pid)}
    d, out, ids = stammdaten.projekt_lesen(c, pid), [], set()
    def dazu(kid, rolle):
        if not kid or kid in ids:
            return
        r = c.execute("SELECT id, name, contact_person, email FROM contacts WHERE id=?", (kid,)).fetchone()
        if r and r["email"] and r["email"].lower() not in da:
            ids.add(kid)
            out.append({"name": r["contact_person"] or r["name"], "email": r["email"], "rolle": rolle, "firma": r["name"] if r["contact_person"] else ""})
    for k, rolle in (("bauherr", "Bauherr:in"), ("bh_vertreter", "Vertreten durch"), ("bh_ansprech", "Ansprechpartner:in")):
        dazu(d.get(k + "_kid"), rolle)
    for x in versand.beteiligte(c, pid):
        if "bauherr" in (x["gewerk"] or "").lower():
            dazu(x["id"], x["gewerk"])
    return out[:20]


def konten(c, pid):
    return [dict(r) for r in c.execute("SELECT id, email, name, aktiv, gesendet, eingeladen, updated FROM bh_konto WHERE project_id=? ORDER BY name, email", (pid,)).fetchall()]


def konto_setzen(c, pid, b):
    mail = _t(b.get("email"), 200).lower()
    if "@" not in mail or "." not in mail.split("@")[-1]:
        raise ValueError("Bitte eine gültige E-Mail-Adresse angeben.")
    j = _jetzt()
    c.execute("INSERT INTO bh_konto(project_id, email, name, aktiv, created, updated) VALUES(?,?,?,?,?,?) ON CONFLICT(project_id, email) "
              "DO UPDATE SET name=excluded.name, aktiv=excluded.aktiv, updated=excluded.updated, gesendet=''",
              (pid, mail, _t(b.get("name"), 200), 0 if b.get("aktiv") is False else 1, j, j))
    return konten(c, pid)


# ---------- Abgleich mit dem Portal (Dienst) ----------
def _ruf_roh(E, schluessel, pfad, timeout=300):
    rq = urllib.request.Request(E["url"] + pfad, headers={"Authorization": "Bearer " + schluessel, "User-Agent": "Bauplattform-Kern"})
    with urllib.request.urlopen(rq, timeout=timeout, context=ssl.create_default_context()) as r:
        return r.read()


def _ruf(E, schluessel, methode, pfad, body=None, timeout=60):
    rq = urllib.request.Request(E["url"] + pfad, method=methode, data=json.dumps(body).encode() if body is not None else None,
                                headers={"Authorization": "Bearer " + schluessel, "Content-Type": "application/json", "User-Agent": "Bauplattform-Kern"})
    with urllib.request.urlopen(rq, timeout=timeout, context=ssl.create_default_context()) as r:
        return json.loads(r.read() or b"{}")


def _konten_alle(c, mails):
    """Je E-Mail alle Projekte, in denen das Konto aktiv ist (das Portal kennt Konten, nicht Einladungen je Projekt)."""
    out = []
    for m in mails:
        R = c.execute("SELECT project_id, name, aktiv, abmelden FROM bh_konto WHERE email=?", (m,)).fetchall()
        if not R:   # gelöscht – geht über „konten_loeschen“
            continue
        from .bauherren_benutzer import portal_projekte   # Rolle je Projekt: was das Portal zulässt (17.11.2026)
        pro = portal_projekte(c, m)
        out.append({"email": m, "name": next((r["name"] for r in R if r["name"]), ""), "projekte": pro, "aktiv": bool(pro),
                    **({"abmelden": True} if any(r["abmelden"] for r in R) else {})})
    return out


def _bereiche_offen(c):
    """Projekte, deren Bereiche noch nicht beim Portal sind: [{pid, name, bereiche}]."""
    out = []
    for r in c.execute("SELECT key, data FROM bp_store WHERE key LIKE 'bauherren:bereiche:%'").fetchall():
        try:
            S = json.loads(r["data"] or "{}")
        except ValueError:
            continue
        if S.get("gesendet"):
            continue
        pid = int(r["key"].rsplit(":", 1)[1])
        p = c.execute("SELECT name FROM projects WHERE id=?", (pid,)).fetchone()
        if p:
            out.append({"pid": str(pid), "name": p["name"], "bereiche": bereiche(c, pid)})
    return out


def abgleich(tx, mail_senden, ablegen=None):
    """Ein Durchgang: hinausschicken, Eingangskorb abholen. tx = db.tx; mail_senden(an, betreff, text);
    ablegen(pid, name, bytes) → Pfad in der Ablage (Dateien der Bauherr:innen; None = nur in bh_datei). Gibt den Stand zurück."""
    with tx() as c:
        E, sk = einst(c), _store(c, "bauherren:schluessel")
        if not E["an"] or not E["url"] or not sk:
            return {"aus": True}
        from . import bauherren_benutzer as BB   # Zugänge, deren Ablauf erreicht ist, sperren; gelöschte Konten
        BB.ablauf_pruefen(c)
        WEG = list(_store(c, "bauherren:weg") or [])
        F = c.execute("SELECT f.*, p.name AS projekt FROM bh_freigabe f JOIN projects p ON p.id=f.project_id WHERE f.gesendet='' ORDER BY f.id LIMIT 50").fetchall()
        mails = sorted({r["email"] for r in c.execute("SELECT email FROM bh_konto WHERE gesendet=''").fetchall()})
        K = _konten_alle(c, mails)
        PB = _bereiche_offen(c)
        NG = set(_store(c, "bauherren:namen") or [])   # Projekte, deren Name schon beim Portal ist – sonst steht dort nur „Projekt“
        for r in c.execute("SELECT DISTINCT k.project_id AS pid, p.name FROM bh_konto k JOIN projects p ON p.id=k.project_id WHERE k.aktiv=1").fetchall():
            if str(r["pid"]) not in NG and str(r["pid"]) not in {x["pid"] for x in PB}:
                PB.append({"pid": str(r["pid"]), "name": r["name"], "bereiche": bereiche(c, r["pid"])})
        from . import bauherren_kopf as BK   # Aussehen des Büros und Kopf je Projekt (Titelbild, Bauphasen, Ansprechperson)
        AU, KO = BK.offen(c, sorted({r["project_id"] for r in c.execute("SELECT DISTINCT project_id FROM bh_konto WHERE aktiv=1").fetchall()}))
        pakete = []
        for r in F:
            if r["geloescht"]:
                continue
            d = json.loads(r["daten"] or "{}")
            A = dateien(c, r["schluessel"], True)
            if A:   # PDFs/Bilder: als base64 mit hinaus, das Portal legt sie für sich ab
                d = {**(d if isinstance(d, dict) else {"liste": d}), "dateien": [{"name": x["name"], "mime": x["mime"], "b64": base64.b64encode(x["inhalt"]).decode()} for x in A]}
            pakete.append(({"id": r["schluessel"], "pid": str(r["project_id"]), "projekt": r["projekt"], "art": r["art"], "titel": r["titel"], "stand": r["stand"],
                            "daten": d}, r))
    weg = [r for r in F if r["geloescht"]]
    n = {"gesendet": 0, "eingang": 0, "mails": 0, "konten": 0}
    # in Häppchen hinaus (große Pläne): Konten, Bereiche und Löschungen mit dem ersten
    haeppchen, akt, groesse = [], [], 0
    for p, r in pakete:
        g = len(json.dumps(p["daten"], ensure_ascii=False))
        if akt and groesse + g > HAEPPCHEN:
            haeppchen.append(akt)
            akt, groesse = [], 0
        akt.append((p, r))
        groesse += g
    if akt or weg or K or PB or AU or KO or WEG:
        haeppchen.append(akt)
    for i, H in enumerate(haeppchen):
        erst = i == 0
        antwort = _ruf(E, sk, "POST", "/api/kern/sync", {"pakete": [p for p, _ in H], "loeschen": [r["schluessel"] for r in weg] if erst else [],
                                              "konten": K if erst else [], "projekte": PB if erst else [], "konten_loeschen": WEG if erst else [],
                                              **({"aussehen": AU, "koepfe": KO} if erst else {})}, timeout=300)
        with tx() as c:
            j = _jetzt()
            for r in [r for _, r in H] + (weg if erst else []):
                c.execute("UPDATE bh_freigabe SET gesendet=? WHERE id=? AND updated=?", (j, r["id"], r["updated"]))
            if erst:
                for m in mails:
                    c.execute("UPDATE bh_konto SET gesendet=?, abmelden='' WHERE email=? AND gesendet=''", (j, m))
                if WEG:
                    _store(c, "bauherren:weg", sorted(set(_store(c, "bauherren:weg") or []) - set(WEG)))
                if isinstance(antwort, dict) and isinstance(antwort.get("zuletzt"), dict):   # letzter Besuch je E-Mail (Benutzerverwaltung)
                    _store(c, "bauherren:zuletzt", {str(k)[:200]: v for k, v in list(antwort["zuletzt"].items())[:5000] if isinstance(v, (int, float))})
                _store(c, "bauherren:namen", sorted(set(_store(c, "bauherren:namen") or []) | {x["pid"] for x in PB}))
                BK.gesendet(c, AU, KO)
                for x in PB:   # nur, wenn sich inzwischen nichts geändert hat
                    if bereiche(c, x["pid"]) == x["bereiche"]:
                        _store(c, f"bauherren:bereiche:{x['pid']}", {"b": x["bereiche"], "gesendet": j})
        n["gesendet"] += len(H) + (len(weg) if erst else 0)
        n["konten"] += len(K) if erst else 0
    L = _ruf(E, sk, "GET", "/api/kern/eingang")
    fertig, mailfehler = [], ""
    for x in L if isinstance(L, list) else []:
        if x.get("art") == "mail":   # Anmeldelink: mit dem Mailzugang des Büros verschicken
            d = x.get("daten") or {}
            try:
                mail_senden(_t(d.get("an"), 200), _t(d.get("betreff"), 200), _t(d.get("text"), 5000))
                n["mails"] += 1
            except Exception as e:   # noqa: BLE001 – bleibt im Eingangskorb, nächster Durchgang; der Grund steht in der Verwaltung
                mailfehler = f"Anmeldemail an {_t(d.get('an'), 200)} nicht verschickt: {str(e)[:200] or type(e).__name__}"
                continue
        else:
            pid = int(x["pid"]) if str(x.get("pid") or "").isdigit() else None
            d = x.get("daten") if isinstance(x.get("daten"), dict) else {}
            data = None
            if x.get("art") == "datei":   # hochgeladene Datei: Inhalt holen, ablegen, Kopie behalten
                try:
                    data = _ruf_roh(E, sk, f"/api/kern/eingang/{int(x['id'])}/datei")
                except Exception:   # noqa: BLE001 – beim nächsten Durchgang wieder (bleibt im Eingangskorb)
                    continue
                if ablegen and pid:
                    try:
                        d = {**d, "ablage": ablegen(pid, _t(d.get("name"), 200) or "Datei", data) or ""}
                    except Exception as e:   # noqa: BLE001 – nur im Büro gespeichert; Grund am Eintrag
                        d = {**d, "ablage_fehler": str(e)[:200] or type(e).__name__}
            with tx() as c:
                c.execute("INSERT INTO bh_eingang(fern_id, project_id, art, daten, zeit, created) VALUES(?,?,?,?,?,?) ON CONFLICT(fern_id) DO NOTHING",
                          (int(x["id"]), pid, _t(x.get("art"), 40), json.dumps(d, ensure_ascii=False),
                           datetime.fromtimestamp(float(x.get("zeit") or time.time())).strftime("%Y-%m-%dT%H:%M:%S"), _jetzt()))
                if data is not None:
                    datei_speichern(c, f"e:{int(x['id'])}", [(_t(d.get("name"), 200), _t(d.get("mime"), 100), data)])
            n["eingang"] += 1
        fertig.append(x["id"])
    if fertig:
        _ruf(E, sk, "POST", "/api/kern/eingang/quittung", {"ids": fertig})
    with tx() as c:
        try:   # montags: Zusammenfassung an Projekte mit Schalter „wöchentlich“ (nie ohne den Schalter)
            n["wochenmails"] = BK.wochenmail(c, mail_senden, url=E["url"])
        except Exception as e:   # noqa: BLE001
            mailfehler = mailfehler or f"Wochenmail: {str(e)[:200]}"
        _store(c, "bauherren:stand", {"zeit": _jetzt(), **n, "fehler": mailfehler})
    return n


def eingang(c, pid=None, offen=True):
    q = "SELECT e.*, COALESCE(p.name,'') AS projekt FROM bh_eingang e LEFT JOIN projects p ON p.id=e.project_id WHERE 1=1"
    a = []
    if pid:
        q += " AND e.project_id=?"
        a.append(pid)
    if offen:
        q += " AND e.erledigt=''"
    return [{**dict(r), "daten": json.loads(r["daten"] or "{}")} for r in c.execute(q + " ORDER BY e.zeit DESC LIMIT 300", a).fetchall()]


def routen(bp, _uid):
    from flask import Response, jsonify, request
    from . import db

    def _wer():
        u, _ = _uid()
        if not u:
            return None, (jsonify(error="Nicht angemeldet"), 401)
        if not darf(u):
            return None, (jsonify(error="Dafür fehlt das Recht „Bauherrenportal“."), 403)
        return u, None

    from . import bauherren_kopf, bauherren_benutzer
    bauherren_kopf.routen(bp, _wer)
    bauherren_benutzer.routen(bp, _wer)   # Verwaltung → Bauherrenportal → Benutzer

    @bp.post("/api/bp/bauherren/freigeben")
    def bh_freigeben():
        """JSON {pid, art, schluessel, titel, stand, daten} – oder multipart: Feld „json“ mit denselben Angaben und Dateien „datei“ (PDF/Bilder)."""
        u, f = _wer()
        if f:
            return f
        if request.files:
            try:
                b = json.loads(request.form.get("json") or "{}")
            except ValueError:
                return jsonify(error="Angaben fehlen."), 400
            anhang = [(x.filename or "Datei", (x.mimetype or "").split(";")[0], x.read()) for x in request.files.getlist("datei")][:40]
        else:
            b, anhang = request.get_json(silent=True) or {}, None
        try:
            with db.tx() as c:
                return jsonify(freigeben(c, u, b, anhang))
        except ValueError as e:
            return jsonify(error=str(e)), 400

    @bp.get("/api/bp/bauherren/datei/<path:sk>/<int:nr>")
    def bh_datei(sk, nr):
        """PDF/Bild an einer Freigabe oder Datei von Bauherr:in („e:<id>“) – zum Ansehen im Büro."""
        u, f = _wer()
        if f:
            return f
        with db.tx() as c:
            D = [x for x in dateien(c, sk, True) if x["nr"] == nr]
        if not D:
            return jsonify(error="Nicht gefunden."), 404
        from urllib.parse import quote
        x = D[0]
        mime = x["mime"] if x["mime"] in MIME else "application/octet-stream"
        return Response(x["inhalt"], mimetype=mime, headers={"Content-Disposition": f"{'inline' if mime in MIME else 'attachment'}; filename*=UTF-8''{quote(x['name'])}",
                                                             "X-Content-Type-Options": "nosniff", "Cache-Control": "private, max-age=300"})

    @bp.route("/api/bp/bauherren/projekt/<int:pid>", methods=["GET", "POST"])
    def bh_projekt(pid):
        u, f = _wer()
        if f:
            return f
        b = request.get_json(silent=True) or {}
        try:
            with db.tx() as c:
                if request.method == "POST" and b.get("zurueck"):
                    zurueckziehen(c, _t(b["zurueck"], 200))
                elif request.method == "POST" and isinstance(b.get("bereiche"), dict):   # Bereiche an/aus
                    bereiche_setzen(c, pid, b["bereiche"])
                elif request.method == "POST" and b.get("eingeladen"):   # Einladungsmail ging über den Versand-Dialog raus: Vermerk am Konto
                    c.execute("UPDATE bh_konto SET eingeladen=? WHERE project_id=? AND email=?", (_jetzt(), pid, _t(b["eingeladen"], 200).lower()))
                elif request.method == "POST":
                    konto_setzen(c, pid, b)
                B = bereiche(c, pid)
                EG = eingang(c, pid, offen=False)[:50]
                for x in EG:
                    if x["art"] == "datei":
                        x["dateien"] = dateien(c, f"e:{x['fern_id']}")
                FG = freigaben(c, pid)
                for x in FG:
                    x["dateien"] = [d for d in dateien(c, x["schluessel"]) if not d["name"].startswith("vorschau-")]
                return jsonify({"konten": konten(c, pid), "vorschlaege": vorschlaege(c, pid), "freigaben": FG, "eingang": EG, "an": einst(c)["an"],
                                "url": einst(c)["url"], "takt": einst(c)["takt"], "bereiche": [{"key": k, "titel": t, "an": B[k]} for k, t in BEREICHE.items()]})
        except ValueError as e:
            return jsonify(error=str(e)), 400

    @bp.post("/api/bp/bauherren/eingang/<int:eid>/erledigt")
    def bh_erledigt(eid):
        u, f = _wer()
        if f:
            return f
        with db.tx() as c:
            c.execute("UPDATE bh_eingang SET erledigt=? WHERE id=?", (_jetzt(), eid))
        return jsonify(ok=True)

    @bp.route("/api/bp/bauherren/einst", methods=["GET", "PUT"])
    def bh_einst():
        u, _ = _uid()
        if not u or not rechte.hat(u, "verwaltung"):
            return jsonify(error="Nur für die Verwaltung."), 403
        try:
            with db.tx() as c:
                return jsonify(einst_setzen(c, request.get_json(silent=True) or {}) if request.method == "PUT" else einst(c))
        except ValueError as e:
            return jsonify(error=str(e)), 400
