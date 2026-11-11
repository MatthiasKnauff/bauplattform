"""Projektordner prüfen und nach einem Muster angleichen (Verwaltung → System → Projektordner; nur Administratoren).

GET  /api/ordner/muster                     Muster finden: Projektvorlage auf dem Dateiserver (Einstellung „ordner_vorlage“,
                                            sonst der Ordner „… Projektvorlage …“ im Basisordner) – oder ?projekt=<id> als Muster
GET  /api/ordner/pruefen?project_id=&projekt=   Projektordner gegen das Muster: Baum (vorher) und vorgeschlagene Schritte
POST /api/ordner/ausfuehren {project_id, projekt?, ids:[…]}
                                            Prüft neu und führt nur Schritte aus, die dabei wieder genauso gefunden werden.

Die Logik (Vergleich, Reihenfolge) steht in core/ordnerschema.py. Testserver: die Ablage wird nur gelesen – es wird nichts geändert.
"""
from flask import Blueprint, g, jsonify, request

from core import audit, db, ordnerschema as osch, remote, settings, sync

bp = Blueprint("ordner", __name__)
MAX = 4000   # höchstens so viele Einträge je Ordnerbaum (Schutz vor riesigen Projektordnern)


def _ziel():
    with db.tx() as c:
        conf = settings.all(c)
    if not sync.enabled(conf):
        raise ValueError("Die Ablage auf dem Dateiserver ist nicht eingerichtet (⚙ → Büro → Ablage).")
    return remote.open_target(conf), conf


def lesen(t, teile, tiefe=4, zaehler=None):
    """Ordnerbaum ab teile (Liste) bis zur Tiefe: {name: {dir, kinder, groesse, quelle}}."""
    zaehler = zaehler if zaehler is not None else [0]
    out = {}
    for e in t.listdir("/".join(teile)):
        zaehler[0] += 1
        if zaehler[0] > MAX:
            break
        n = {"dir": e["dir"], "kinder": {}, "groesse": e.get("size", 0)}
        if e["dir"] and tiefe > 1:
            n["kinder"] = lesen(t, teile + [e["name"]], tiefe - 1, zaehler)
        out[e["name"]] = n
    return out


def _quellen(baum, pfad=()):
    for k, v in baum.items():
        if not v["dir"]:
            v["quelle"] = list(pfad) + [k]
        else:
            _quellen(v["kinder"], tuple(pfad) + (k,))
    return baum


def _projekt(c, pid):
    p = c.execute("SELECT id, name, folder FROM projects WHERE id=?", (pid,)).fetchone()
    if not p:
        raise ValueError("Projekt nicht gefunden.")
    return dict(p)


def _projektpfad(t, p):
    teile = remote.clean_path(p["folder"] or "") or remote.find_project_path(t, sync.code_of(p), remote.clean(p["name"]) or "Projekt")
    if not teile or not t.exists("/".join(teile)):
        raise ValueError(f"Projektordner von „{p['name']}“ nicht gefunden – im Projekt den Ordner eintragen.")
    return teile


def muster(t, conf, projekt=None):
    """→ (Beschreibung, Pfadteile, Baum)"""
    if projekt:
        with db.tx() as c:
            p = _projekt(c, projekt)
        teile = _projektpfad(t, p)
        return {"art": "projekt", "name": p["name"], "pfad": "/".join(teile)}, teile, _quellen(lesen(t, teile))
    eigen = remote.clean_path(conf.get("ordner_vorlage") or "")
    if eigen and t.exists("/".join(eigen)):
        teile = eigen
    else:
        kand = sorted((d for d in t.dirs(()) if "projektvorlage" in d.lower().replace(" ", "")), key=lambda d: ("leer" not in d.lower(), d))
        if not kand:
            raise ValueError("Keine Projektvorlage auf dem Dateiserver gefunden (Ordner „… Projektvorlage …“ im Basisordner der Ablage).")
        teile = [kand[0]]
    return {"art": "vorlage", "name": teile[-1], "pfad": "/".join(teile)}, teile, _quellen(lesen(t, teile))


def pruefen(pid, projekt=None):
    t, conf = _ziel()
    m_info, m_teile, m_baum = muster(t, conf, projekt)
    with db.tx() as c:
        p = _projekt(c, pid)
    teile = _projektpfad(t, p)
    code = sync.code_of(p)
    if not remote.code_prefix(p["name"]):
        raise ValueError(f"„{p['name']}“ hat kein Projektkürzel – wird nicht geprüft.")
    ist = lesen(t, teile)
    schritte = osch.vergleichen(m_baum, ist, code)
    return {"projekt": {"id": p["id"], "name": p["name"], "kuerzel": code, "pfad": "/".join(teile)}, "muster": m_info,
            "muster_kuerzel": osch.muster_kuerzel(m_baum), "vorher": ist, "schritte": schritte, "testserver": remote.NUR_LESEN}, t, teile, m_teile


def zusammen(t, von, nach):
    """Inhalt von „von“ nach „nach“ bringen: gleichnamige Ordner werden zusammengeführt, gleichnamige Dateien bekommen „(2)“;
    „von“ wird danach entfernt, wenn er leer ist."""
    da = {e["name"]: e["dir"] for e in t.listdir(nach)}
    for e in t.listdir(von):
        if e["dir"] and da.get(e["name"]) is True:
            zusammen(t, f"{von}/{e['name']}", f"{nach}/{e['name']}")
            continue
        z = osch.frei(e["name"], da); da[z] = e["dir"]
        t.rename(f"{von}/{e['name']}", f"{nach}/{z}")
    t.rmdir_if_empty(von)


@bp.get("/api/ordner/muster")
def api_muster():
    try:
        t, conf = _ziel()
        info, _, baum = muster(t, conf, request.args.get("projekt", type=int))
    except ValueError as e:
        return jsonify(error=str(e)), 400
    except Exception as e:   # noqa: BLE001 – Dateiserver nicht erreichbar
        return jsonify(error=sync._msg(e)), 502
    return jsonify(muster=info, baum=baum, kuerzel=osch.muster_kuerzel(baum), testserver=remote.NUR_LESEN)


@bp.get("/api/ordner/pruefen")
def api_pruefen():
    try:
        res = pruefen(request.args.get("project_id", type=int), request.args.get("projekt", type=int))[0]
    except ValueError as e:
        return jsonify(error=str(e)), 400
    except Exception as e:   # noqa: BLE001
        return jsonify(error=sync._msg(e)), 502
    return jsonify(res)


@bp.post("/api/ordner/ausfuehren")
def api_ausfuehren():
    b = request.get_json(silent=True) or {}
    ids = set(b.get("ids") or [])
    try:
        res, t, teile, m_teile = pruefen(int(b.get("project_id") or 0), b.get("projekt") or None)
    except ValueError as e:
        return jsonify(error=str(e)), 400
    except Exception as e:   # noqa: BLE001
        return jsonify(error=sync._msg(e)), 502
    wahl = [s for s in res["schritte"] if s["id"] in ids]
    erledigt, fehler, umbenannt, verschoben = 0, [], {}, set()
    voll = lambda pf: "/".join(teile + pf)   # noqa: E731
    for s in osch.reihenfolge(wahl):
        try:
            if s["art"] in ("aufloesen", "verschieben") and any(tuple(s["pfad"][:i]) in verschoben for i in range(1, len(s["pfad"]))):
                continue   # liegt in einem Ordner, der schon als Ganzes verschoben/aufgelöst wurde
            if s["art"] == "umbenennen":
                alt = osch.umgerechnet(s["pfad"][:-1], umbenannt) + [s["pfad"][-1]]
                neu = alt[:-1] + [s["neu"]]
                if t.exists(voll(neu)) and s["neu"].lower() != s["pfad"][-1].lower():
                    raise ValueError(f"„{s['neu']}“ gibt es schon")
                t.rename(voll(alt), voll(neu))
                umbenannt[tuple(s["pfad"])] = s["neu"]
            elif s["art"] == "aufloesen":
                x = osch.umgerechnet(s["pfad"], umbenannt)
                zusammen(t, voll(x), voll(x[:-1]))
            elif s["art"] == "verschieben":
                x, ziel = osch.umgerechnet(s["pfad"], umbenannt), s["ziel"]
                if not t.exists(voll(ziel)):
                    t.rename(voll(x), voll(ziel))
                else:   # Ziel gibt es schon: Inhalt zusammenführen
                    zusammen(t, voll(x), voll(ziel))
            elif s["art"] == "anlegen":
                t.mkdir(voll(osch.umgerechnet(s["pfad"], umbenannt)))
            elif s["art"] == "kopieren":
                ziel = voll(osch.umgerechnet(s["pfad"], umbenannt))
                if not t.exists(ziel) and s.get("quelle"):
                    t.put_bytes(t.read("/".join(m_teile + s["quelle"])), ziel)
            if s["art"] in ("aufloesen", "verschieben"):
                verschoben.add(tuple(s["pfad"]))
            erledigt += 1
            if not remote.NUR_LESEN:
                audit.record(g.user["name"], "export", "Projektordner angeglichen",
                             f"{s['art']}: {'/'.join(s['pfad'])}" + (f" → {s['neu']}" if s.get("neu") else "") + (f" → {'/'.join(s['ziel'])}" if s.get("ziel") else ""), res["projekt"]["id"], res["projekt"]["name"])
        except Exception as e:   # noqa: BLE001 – Schritt überspringen, die übrigen laufen weiter
            fehler.append(f"{'/'.join(s['pfad'])}: {e}"[:300])
    return jsonify(ok=True, erledigt=erledigt, gewaehlt=len(wahl), unbekannt=len(ids) - len(wahl), fehler=fehler, testserver=remote.NUR_LESEN)
