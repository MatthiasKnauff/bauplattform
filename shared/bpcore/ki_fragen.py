"""KI-Gespräch „Fragen“ zum Projekt (GO 16.11.2026, „Gebäudemodell als Mitte“, Punkte 1, 2, 9–11) – Reiter in Gebäudemodell, Kosten, Bauzeitenplan.

Regeln (entschieden):
  - Es fragt NUR die KI im Büro (Ollama). Ist sie nicht erreichbar, kommt ein Hinweis – nie still eine externe KI.
  - Grundlage sind nur die eigenen Daten: Gebäudemodell (Bauart, Flächen, Räume, Bauteile mit Antworten und Preisspanne, Bauphasen,
    Kosten), eigene Preise aus Angeboten und Aufträgen (pdb_preis) zuerst, dann die Preisdatenbank. Keine Langtexte aus Katalogen,
    nur Kurztext, Einheit und Preis. Firmennamen der Angebote nur mit Zugang zur Ausschreibung.
  - Findet sich kein Preis, fragt die Seite „im Netz nachfragen?“ – nur wenn die Verwaltung die Zusatzrecherche eingeschaltet hat
    (Verwaltung → Einstellungen → KI, Standard aus). Ein Suchdienst ist vorerst nicht angebunden: „im Netz“ heißt eine externe KI
    (anonymisiert über ai.ask), und vorher warnt die Seite. Antworten daraus sind als „extern, ungeprüft“ gekennzeichnet.

POST /api/bp/modell/<pid>/fragen   {frage, app, extern?: true} → {antwort, quellen, kein_preis, zusatz, extern?} | {hinweis}
"""
import re

from flask import jsonify, request

PREISWORT = re.compile(r"(preis|kost|€|euro|teuer|günstig|guenstig|ep\b|einheitspreis|was kostet)", re.I)
STOPP = {"was", "wie", "viel", "kostet", "kosten", "preis", "preise", "der", "die", "das", "ein", "eine", "einen", "für", "fuer", "mit", "und", "oder",
         "pro", "je", "im", "in", "am", "an", "auf", "ist", "sind", "wir", "ich", "uns", "unser", "unsere", "welche", "welcher", "wann", "wo", "noch",
         "projekt", "haus", "gebäude", "bitte", "kann", "können", "soll", "sollen", "gibt", "es", "zu", "von", "bei", "nach", "über", "ueber"}
SYSTEM = ("Du bist die KI eines Architekturbüros in Deutschland und beantwortest Fragen zu EINEM Bauprojekt. Antworte auf Deutsch, knapp und "
          "sachlich. Nutze NUR die mitgegebenen Daten. Preise nennst du nur, wenn sie in den Daten stehen – mit Quelle (eigenes Angebot, "
          "Preisdatenbank, Bauteil-Checkliste). Steht kein passender Preis darin, sage genau: „Dazu habe ich keinen Preis in unseren Daten.“ "
          "Erfinde keine Zahlen, keine Normen und keine Firmen.")


def _w(t):
    return [w for w in re.findall(r"[A-Za-zÄÖÜäöüß]{4,}", t or "") if w.lower() not in STOPP][:4]


def _zahl(v, n=2):
    return f"{v:,.{n}f}".replace(",", "X").replace(".", ",").replace("X", ".")


def projekt_ki(c, pid):
    """KI-Schalter des Projekts (Planung → letzter Schritt, modell.ki): buero = KI im Büro hilft mit, extern = externe KI als Ergänzung erlaubt.
    Externe KI gilt nur, wenn zusätzlich die Verwaltung sie erlaubt (zusatz_an) – X1, 17.11.2026. Solange im Projekt nichts gewählt ist
    (kein ki.wahl), gilt die Obergrenze der Verwaltung."""
    from . import modell
    try:
        k = (modell.lesen(c, pid)["modell"].get("ki") or {}) if pid else {}
    except Exception:   # noqa: BLE001 – ohne Modell: wie die Vorgabe
        k = {}
    ext = bool(k.get("extern")) if k.get("wahl") else True   # ohne Wahl im Projekt folgt es der Verwaltung (19.11.2026)
    return {"buero": bool(k.get("buero", True)), "extern": ext and zusatz_an(c)}


def zusatz_an(c):
    """Externe KI vom Büro erlaubt = Höchste Stufe im Büro „externe KI“ (ki_stufe.hoechste; früher Schalter „Externe KI erlauben“)."""
    from . import ki_stufe
    return ki_stufe.hoechste(c) == "extern"


def kontext(c, pid, u, frage):
    """Daten zum Projekt als Text für die KI + Quellen für die Anzeige. → (text, quellen, preise_gefunden)"""
    from . import baudaten, bauteilliste, modell, sso
    m = modell.lesen(c, pid)["modell"]
    p = c.execute("SELECT name FROM projects WHERE id=?", (pid,)).fetchone()
    a, L = m.get("assistent") or {}, m.get("bauteilliste") or {}
    R = L.get("raeume") or m.get("raeume") or []
    T, Q = [f"Projekt: {p['name'] if p else pid}"], []
    T.append(f"Bauart: {bauteilliste.bauart(m) or 'unbekannt'}; Fläche laut Assistent {a.get('area') or '–'} m², {a.get('floors') or '–'} Geschosse, {a.get('units') or '–'} Einheiten.")
    if R:
        T.append(f"Räume: {len(R)}, zusammen {_zahl(sum(r.get('flaeche') or 0 for r in R))} m².")
    Z, offen = bauteilliste.berechnete(c, L)
    if Z or offen:
        T.append("Bauteile (Bauteil-Checkliste; Menge, Maßnahme, Einheitspreis mittel und Spanne aus dem eigenen Baukasten):")
        T += [f"- {z['name']}: {_zahl(z['menge'])} {z['einheit']}, {z['status']}, EP {_zahl(z['ep'])} € ({_zahl(z['ep_von'], 0)}–{_zahl(z['ep_bis'], 0)} €)" for z in Z[:60]]
        T += [f"- {o['name']}: noch offen" for o in offen[:20]]
        Q.append({"art": "modell", "text": f"Bauteil-Checkliste ({len(Z)} berechnet, {len(offen)} offen)"})
    k = m.get("kosten") or {}
    if k:
        T.append(f"Kosten ({k.get('stufe_name') or 'Kosten'} „{k.get('name')}“, Stand {k.get('datum')}): KG 300 {_zahl(k.get('kg300') or 0, 0)} €, KG 400 {_zahl(k.get('kg400') or 0, 0)} €, gesamt netto {_zahl(k.get('total') or 0, 0)} €.")
        Q.append({"art": "kosten", "text": f"Kosten „{k.get('name')}“"})
    ph = (m.get("termine") or {}).get("phasen") or {}
    if ph:
        from .rueckweg import PH
        T.append("Bauphasen (gültiger Bauzeitenplan): " + "; ".join(f"{PH.get(x, x)} {v['von']} bis {v['bis']}" for x, v in ph.items()))
        Q.append({"art": "termine", "text": "Bauphasen aus dem Bauzeitenplan"})
    gefunden = False
    W = _w(frage)
    if W and PREISWORT.search(frage or "") or W and not Z:
        ava = "ava" in (sso.apps_of(u) if u is not None else [])
        treffer, gesehen = [], set()
        for w in W[:3]:
            try:
                rows, _ = baudaten.suche(c, {"q": w}, n=8)
            except Exception:   # noqa: BLE001 – ohne Preisdatenbank (Tests, frische Installation)
                rows = []
            for r in rows:
                if r["id"] not in gesehen:
                    gesehen.add(r["id"]); treffer.append(r)
        eigene = []
        if treffer:
            ids = [r["id"] for r in treffer if r["id"] > 0][:30]
            if ids:
                eigene = c.execute(f"SELECT position_id, ep, datum, firma FROM pdb_preis WHERE position_id IN ({','.join('?' * len(ids))}) ORDER BY datum DESC LIMIT 40", ids).fetchall()
        kurz = {r["id"]: r for r in treffer}
        if eigene:   # eigene Angebote und Aufträge zuerst
            T.append("Eigene Preise aus Angeboten/Aufträgen:")
            for e in eigene:
                r = kurz.get(e["position_id"]) or {}
                T.append(f"- {r.get('kurz') or ''} ({r.get('einheit') or ''}): {_zahl(e['ep'] or 0)} € am {e['datum']}" + (f", {e['firma']}" if ava and e["firma"] else ""))
            Q.append({"art": "angebote", "text": f"{len(eigene)} eigene Preise aus Angeboten/Aufträgen" + ("" if ava else " (Firmen nur mit Zugang zur Ausschreibung)")})
            gefunden = True
        mit_preis = [r for r in treffer if r.get("ep_mittel_akt")][:12]
        if mit_preis:
            T.append("Preisdatenbank (Einheitspreise heute, von–mittel–bis):")
            T += [f"- {r['kurz']} ({r['einheit']}): {_zahl(r['ep_von_akt'] or 0)}–{_zahl(r['ep_mittel_akt'])}–{_zahl(r['ep_bis_akt'] or 0)} €" for r in mit_preis]
            Q.append({"art": "preisdatenbank", "text": f"{len(mit_preis)} Positionen der Preisdatenbank"})
            gefunden = True
    return "\n".join(T), Q, gefunden


def fragen(c, pid, u, frage, extern=False, ki=None):
    from . import ai, ki_stufe
    frage = " ".join(str(frage or "").split())[:1000]
    if not frage:
        raise ValueError("Bitte eine Frage eingeben.")
    text, Q, gefunden = kontext(c, pid, u, frage)
    if ki is not None:   # KI-Schieber (18.11.2026): die erlaubte Stufe gilt; „ohne KI“ = die passenden Daten des Projekts ohne Formulierung
        st = ki_stufe.stufe(c, pid, ki)
        extern = st == "extern"
        if st == "aus":
            zeilen = [z for z in text.split("\n") if z.strip()][:14]
            return {"antwort": "Ohne KI – die passenden Daten aus dem Projekt:\n" + "\n".join(zeilen) if zeilen else "Ohne KI habe ich zu dieser Frage nichts Passendes in den Projektdaten gefunden.",
                    "quellen": Q, "kein_preis": False, "zusatz": False, "ohne_ki": True}
    preisfrage = bool(PREISWORT.search(frage))
    PK = projekt_ki(c, pid)
    if extern:   # nur nach Warnung im Browser und nur mit eingeschalteter Zusatzrecherche – anonymisiert (ai.ask)
        if not zusatz_an(c):
            raise ValueError("Die externe KI als Ergänzung ist ausgeschaltet (Verwaltung → Einstellungen → KI).")
        if not PK["extern"]:
            raise ValueError("Für dieses Projekt ist die externe KI ausgeschaltet (Planung → letzter Schritt „Was daraus entsteht“).")
        prov = ki_stufe.anbieter(c, "extern", u)   # ⚙ → Persönlich → KI: welche externe KI
        if not prov:
            raise ValueError("Für die Nachfrage im Netz ist keine externe KI eingerichtet – ein Suchdienst ist noch nicht angebunden.")
        sys2 = SYSTEM.replace("Nutze NUR die mitgegebenen Daten.", "Nutze die mitgegebenen Daten und dein allgemeines Wissen über übliche Preise in Deutschland; kennzeichne Schätzungen als Schätzung.")
        a = ai.ask(prov, sys2, f"{text}\n\nFrage: {frage}", max_tokens=700, c=c, zweck="fragen")
        return {"antwort": a.strip(), "quellen": Q + [{"art": "extern", "text": f"externe KI ({prov}), anonymisiert – ungeprüft"}], "extern": prov, "kein_preis": False, "zusatz": True}
    if not PK["buero"]:
        return {"hinweis": "Für dieses Projekt ist die KI im Büro ausgeschaltet – einschalten unter Planung → letzter Schritt „Was daraus entsteht“."}
    if not ai.ollama_url() or "ollama" in ai.abgeschaltet(c) or not ai.ollama_state()["ok"]:
        return {"hinweis": "Die KI im Büro (Ollama) ist gerade nicht erreichbar – bitte später noch einmal. Eine externe KI fragt dieser Reiter nicht von selbst."}
    try:
        a = ai.ask("ollama", SYSTEM, f"{text}\n\nFrage: {frage}", max_tokens=600, c=c, zweck="fragen")
    except ai.AIError as e:
        return {"hinweis": f"Die KI im Büro antwortet gerade nicht ({e})."}
    kein = preisfrage and (not gefunden or "keinen preis" in a.lower())
    return {"antwort": a.strip(), "quellen": Q, "kein_preis": kein, "zusatz": PK["extern"]}


def routen(bp, mit, _uid):
    @bp.post("/api/bp/modell/<int:pid>/fragen")
    def ki_fragen(pid):
        d = request.get_json(silent=True)
        d = d if isinstance(d, dict) else {}
        u, _ = _uid()

        def tun(c, wer):
            from . import ai
            try:
                return jsonify(fragen(c, pid, u, d.get("frage"), bool(d.get("extern")), d.get("ki")))
            except ValueError as e:
                return jsonify(error=str(e)), 400
            except ai.AIError as e:
                return jsonify(error=f"Die externe KI hat nicht geantwortet: {e}"), 502
        return mit(pid, tun)
