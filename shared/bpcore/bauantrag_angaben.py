"""Bauantrag – Angaben der Vordrucke (entschieden am 16.11.2026, Etappe 2).

Jeder gewählte Vordruck hat Felder. Was zu einem der Antragsfelder passt (bauantrag.FELDER, Zuordnung bauantrag_formulare.REGELN),
kommt aus dem Antrag und seinen Quellen. Alles andere ist eine „Angabe“: einmal eingetragen, gilt sie in jedem Vordruck, in dem sie
vorkommt – auch im nächsten Antrag des Projekts. Gespeichert am Projekt (bp_store „bauantrag_angaben:<pid>“ = {Schlüssel: Wert}).

Schlüssel einer Angabe: aus der Beschriftung des Felds (Tooltip, sonst Name) – gleiche Beschriftung in zwei Vordrucken = eine Angabe.
Felder ohne sprechende Beschriftung („Text12“, „Kontrollkästchen3“) gelten nur in ihrem Vordruck (Schlüssel mit Datei-Kennung).
Vordrucke ohne Formularfelder (z. B. der statistische Erhebungsbogen als leeres PDF): Angaben werden beim „Platzieren“ gesetzt
(Platzierung mit feld „a:<Schlüssel>“, text = Bezeichnung, art = text|kreuz) und kommen aus demselben Speicher.
Felder, die die Behörde ausfüllt (Aktenzeichen, Eingangsvermerk …) oder die von Hand unterschrieben werden, zählen nicht als offen.
"""
import json
import re
from datetime import datetime

from . import bauantrag_formulare as BF

GENERISCH = re.compile(r"^(text|textfeld|textfield|feld|field|kontrollk\w*|check\s*box|checkbox|kk|optionsfeld|radio\w*|undefined|untitled)[\s_.\-]*\d*$")
AMT = ("aktenzeichen", "eingangsvermerk", "eingangsstempel", "eingegangen", "vermerk der", "von der behoerde", "von der bauaufsicht auszufuellen",
       "nur fuer die behoerde", "nicht ausfuellen", "bearbeitungsvermerk", "unterschrift", "dienstsiegel", "sachbearbeit")
_FELDER = {}   # sha → Formularfelder (je Inhalt nur einmal gelesen)


def felder(daten, sha):
    if sha not in _FELDER:
        if len(_FELDER) > 64:
            _FELDER.clear()
        try:
            _FELDER[sha] = BF.felder(daten)
        except Exception:   # noqa: BLE001 – kaputtes/verschlüsseltes PDF: ohne Felder
            _FELDER[sha] = []
    return _FELDER[sha]


def bezeichnung(f):
    """Lesbare Beschriftung eines Formularfelds: Tooltip, sonst der letzte Teil des Namens."""
    t = re.sub(r"\s+", " ", str(f.get("tu") or "")).strip()
    if t:
        return t[:160]
    n = str(f.get("name") or "").split(".")[-1]
    return re.sub(r"[_]+", " ", n).strip()[:160] or str(f.get("name") or "")[:160]


def schluessel(f, sha):
    """Schlüssel der Angabe hinter einem Formularfeld."""
    t = BF.fold(f.get("tu") or "")
    if not t:
        n = BF.fold(str(f.get("name") or "").split(".")[-1])
        if not n or GENERISCH.match(n) or re.fullmatch(r"[\d ]+", n):   # ohne sprechende Beschriftung: nur in diesem Vordruck
            return "v:" + (sha or "")[:10] + ":" + BF.fold(f.get("name") or "").replace(" ", "_")[:60]
        t = n
    return "a:" + t.replace(" ", "_")[:70]


def schluessel_frei(label):
    """Schlüssel für eine beim Platzieren benannte Angabe – gleiche Bezeichnung wie ein Formularfeld = dieselbe Angabe."""
    t = BF.fold(label)
    return "a:" + t.replace(" ", "_")[:70] if t else ""


def amt(text):
    t = BF.fold(text)
    return any(w in t for w in AMT)


def kreuz_vom_antrag(f):
    """Kästchen/Optionsfelder, die der Antrag selbst setzt (Gebäudeklasse, Antragsart, Sonderbau, Verfahren, vorliegende Unterlagen)."""
    t = BF.fold(f["name"] + " " + f["tu"])
    Z = {BF.fold(z.strip("/")) for z in f.get("zustaende") or []}
    return any(w in t for w in ("gebaeudeklasse", "antragsart", "unterlage", "sonderbau", "vorbescheid", "vereinfacht")) or {"vorbescheid", "bauantrag"} <= Z


def lesen(c, pid):
    r = c.execute("SELECT data FROM bp_store WHERE key=?", (f"bauantrag_angaben:{int(pid)}",)).fetchone()
    try:
        d = json.loads(r["data"]) if r and r["data"] else {}
    except (TypeError, ValueError):
        d = {}
    return d if isinstance(d, dict) else {}


def schreiben(c, pid, werte, wer):
    """werte: {Schlüssel: Wert} – None/""/False löscht. Gibt den neuen Stand zurück."""
    d = lesen(c, pid)
    for k, v in (werte or {}).items():
        k = str(k)[:90]
        if not re.match(r"^[av]:", k):
            continue
        if v in (None, "", False):
            d.pop(k, None)
        else:
            d[k] = v if isinstance(v, bool) else str(v)[:2000]
    c.execute("INSERT INTO bp_store(key, data, updated, updated_by) VALUES(?,?,?,?) ON CONFLICT (key) DO UPDATE SET data=EXCLUDED.data, "
              "updated=EXCLUDED.updated, updated_by=EXCLUDED.updated_by", (f"bauantrag_angaben:{int(pid)}", json.dumps(d, ensure_ascii=False),
                                                                          datetime.now().isoformat(timespec="seconds"), wer))
    return d


def feldwert(f, sha, A, eigene=None):
    """Wert eines Formularfelds ohne Antragsfeld: im Vordruck dieses Antrags eingetragen (älterer Stand) – sonst die Angabe des Projekts."""
    if eigene and f["name"] in eigene:
        return eigene[f["name"]]
    return (A or {}).get(schluessel(f, sha))


def liste(vordrucke, W, felder_antrag, A, eigene_alle=None):
    """Alle Felder aller gewählten Vordrucke, je Angabe einmal.
    vordrucke: [{key, titel, sha, F (Formularfelder), P (Platzierungen)}]; felder_antrag: d["felder"] (key, label, wert, quelle, schritt);
    A: Angaben des Projekts; eigene_alle: {sha: {Feldname: Wert}} (älterer Stand, je Vordruck).
    → {zeilen: [{key, art: antrag|angabe, label, typ, optionen, wert, quelle, schritt, in: [Titel], vordruck, amt}], felder, gefuellt, offen}"""
    V = BF.werte_v(W)
    FA = {x["key"]: x for x in felder_antrag}
    Z, reihe = {}, []

    def zeile(key, **kw):
        if key not in Z:
            Z[key] = {"key": key, "in": [], **kw}
            reihe.append(key)
        return Z[key]

    def dabei(z, v):
        if v["titel"] not in z["in"]:
            z["in"].append(v["titel"])
    n = 0
    for v in vordrucke:
        F, sha, eig = v.get("F") or [], v.get("sha") or "", (eigene_alle or {}).get(v.get("sha") or "") or {}
        zu = BF.zuordnung(F, V, alle=True)
        for f in F:
            n += 1
            if f["name"] in zu:   # gehört zu einem Antragsfeld
                ak = next(iter(BF.zurueck(zu[f["name"]], "x", W) or {}), "")
                x = FA.get(ak)
                if x:
                    dabei(zeile("f:" + ak, art="antrag", label=x["label"], typ="text", optionen=[], wert=str(x["wert"] or ""), quelle=x.get("quelle") or "",
                                schritt=x.get("schritt") or "", vordruck=v["key"], amt=False), v)
                    continue
                dabei(zeile("w:" + zu[f["name"]], art="antrag", label=bezeichnung(f), typ="text", optionen=[], wert=str(V.get(zu[f["name"]]) or ""),
                            quelle="Antrag", schritt="", vordruck=v["key"], amt=False), v)
                continue
            if f["typ"] == "kreuz" and kreuz_vom_antrag(f):
                continue   # setzt der Antrag (Gebäudeklasse, Verfahren, Unterlagen)
            k = schluessel(f, sha)
            mehr = len(f.get("zustaende") or []) > 1 or f.get("radio")
            w = feldwert(f, sha, A, eig)
            z = zeile(k, art="angabe", label=bezeichnung(f), typ="wahl" if mehr else f["typ"] if f["typ"] in ("text", "kreuz") else "text",
                      optionen=[s for s in f.get("zustaende") or []] if mehr else [], wert=w if isinstance(w, bool) else str(w or ""),
                      quelle="Antragsangabe am Projekt" if k in (A or {}) else ("nur in diesem Vordruck" if f["name"] in eig else ""),
                      schritt="", vordruck=v["key"], amt=amt(f["name"] + " " + f["tu"]), name=f["name"], nur_hier=k.startswith("v:"))
            dabei(z, v)
        for p in v.get("P") or []:   # Platzierungen (Vordrucke ohne eigene Felder)
            fe = str(p.get("feld") or "")
            if fe in ("datum", "kreuz", "frei"):
                continue
            n += 1
            if fe.startswith("a:"):
                w = (A or {}).get(fe)
                dabei(zeile(fe, art="angabe", label=p.get("text") or fe[2:].replace("_", " "), typ="kreuz" if p.get("art") == "kreuz" else "text", optionen=[],
                            wert=w if isinstance(w, bool) else str(w or ""), quelle="Antragsangabe am Projekt" if fe in (A or {}) else "", schritt="",
                            vordruck=v["key"], amt=False, nur_hier=False), v)
                continue
            x = FA.get(fe)
            if x:
                dabei(zeile("f:" + fe, art="antrag", label=x["label"], typ="text", optionen=[], wert=str(x["wert"] or ""), quelle=x.get("quelle") or "",
                            schritt=x.get("schritt") or "", vordruck=v["key"], amt=False), v)
    zeilen = [Z[k] for k in reihe]
    zaehlen = [z for z in zeilen if not z["amt"]]
    voll = lambda z: z["wert"] is True or (isinstance(z["wert"], str) and z["wert"].strip())   # noqa: E731
    return {"zeilen": zeilen, "felder": n, "gefuellt": len([z for z in zaehlen if voll(z)]),
            "offen": len([z for z in zaehlen if not voll(z) and z["typ"] != "kreuz"])}
