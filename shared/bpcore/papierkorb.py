"""Papierkorb für die ganze Bauplattform.

Statt endgültig zu löschen, legt eine App den Datensatz hier ab: ablegen(c, tabelle, id, art=…, titel=…).
Mitgenommen wird alles, was in der Datenbank daran hängt (Fremdschlüssel mit ON DELETE CASCADE, rekursiv);
Verweise mit ON DELETE SET NULL werden gemerkt und beim Wiederherstellen wieder gesetzt.
Dateien auf dem Datenträger (Fotos des Bautagebuchs) bleiben bis zum endgültigen Löschen liegen: Die App, der sie
gehören, holt sie sich über dateien_abholen(c, app) ab (Warteschlange in bp_store).

Geleert wird von Hand (Seite „Papierkorb“ auf der Startseite) oder automatisch nach der eingestellten Zahl Tagen.
"""
import base64
import json
from datetime import datetime, timedelta

EINST = "papierkorb:einst"
STANDARD_TAGE = 30


def _jetzt():
    return datetime.now().isoformat(timespec="seconds")


def _pack(v):
    if isinstance(v, (bytes, bytearray, memoryview)):
        return {"$b64": base64.b64encode(bytes(v)).decode()}
    if isinstance(v, datetime):
        return v.isoformat()
    return v


def _unpack(v):
    if isinstance(v, dict) and set(v) == {"$b64"}:
        return base64.b64decode(v["$b64"])
    return v


def _pk(c, table):
    r = c.execute("""SELECT a.attname FROM pg_index i JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=ANY(i.indkey)
                     WHERE i.indrelid=?::regclass AND i.indisprimary""", (table,)).fetchall()
    return r[0]["attname"] if len(r) == 1 else None


def _verweise(c, table):
    """Fremdschlüssel (einspaltig), die auf table zeigen: [(kind, spalte, eltern_spalte, art)] – art: c=cascade, n=set null, a/r=verbieten."""
    return [(r["kind"], r["sp"], r["psp"], r["art"]) for r in c.execute("""
        SELECT ch.relname AS kind, a.attname AS sp, pa.attname AS psp, con.confdeltype AS art
        FROM pg_constraint con
        JOIN pg_class ch ON ch.oid=con.conrelid JOIN pg_class p ON p.oid=con.confrelid
        JOIN pg_namespace n ON n.oid=p.relnamespace
        JOIN pg_attribute a ON a.attrelid=con.conrelid AND a.attnum=con.conkey[1]
        JOIN pg_attribute pa ON pa.attrelid=con.confrelid AND pa.attnum=con.confkey[1]
        WHERE con.contype='f' AND p.relname=? AND n.nspname=current_schema() AND array_length(con.conkey, 1)=1""", (table,)).fetchall()]


def _rows(c, table, where, args):
    out = []
    for r in c.execute(f"SELECT * FROM {table} WHERE {where}", args).fetchall():
        out.append({k: _pack(r[k]) for k in r.keys()})
    return out


def _sammeln(c, table, rows, teile, relink, tiefe=0, seen=None):
    """rows einer Tabelle → teile (Eltern vor Kindern), dazu alles, was per CASCADE mitgelöscht würde.
    Zeilen, die über zwei Wege erreicht werden (z. B. LV über Projekt und über Version), nur einmal."""
    seen = set() if seen is None else seen
    pk = _pk(c, table)
    if pk:
        rows = [r for r in rows if (table, str(r.get(pk))) not in seen]
        seen.update((table, str(r.get(pk))) for r in rows)
    if not rows or tiefe > 8:
        return
    teile.append({"t": table, "rows": rows})
    for kind, sp, psp, art in _verweise(c, table):
        werte = list({r[psp] for r in rows if r.get(psp) is not None})
        if not werte:
            continue
        ph = ",".join("?" * len(werte))
        if art == "c":
            _sammeln(c, kind, _rows(c, kind, f"{sp} IN ({ph})", werte), teile, relink, tiefe + 1, seen)
        elif art in ("n", "d"):
            pk = _pk(c, kind)
            if pk:
                for r in c.execute(f"SELECT {pk} AS pk, {sp} AS v FROM {kind} WHERE {sp} IN ({ph})", werte).fetchall():
                    relink.append({"t": kind, "pk": pk, "id": _pack(r["pk"]), "sp": sp, "v": _pack(r["v"])})


def aufraeumen(c):
    """Abgelaufene Einträge endgültig löschen (Einstellung „automatisch leeren nach … Tagen“, 0 = nie)."""
    tage = einstellungen(c)["tage"]
    if not tage:
        return 0
    grenze = (datetime.now() - timedelta(days=tage)).isoformat(timespec="seconds")
    ids = [r["id"] for r in c.execute("SELECT id FROM bp_papierkorb WHERE geloescht < ?", (grenze,)).fetchall()]
    return endgueltig(c, ids)


def einstellungen(c):
    r = c.execute("SELECT data FROM bp_store WHERE key=?", (EINST,)).fetchone()
    try:
        d = json.loads(r["data"]) if r else {}
    except ValueError:
        d = {}
    t = d.get("tage", STANDARD_TAGE)
    return {"tage": int(t) if isinstance(t, (int, float)) and 0 <= t <= 3650 else STANDARD_TAGE}


def einstellungen_setzen(c, tage, wer=""):
    c.execute("INSERT INTO bp_store(key, data, updated, updated_by) VALUES(?,?,?,?) ON CONFLICT (key) DO UPDATE SET data=EXCLUDED.data, "
              "updated=EXCLUDED.updated, updated_by=EXCLUDED.updated_by", (EINST, json.dumps({"tage": int(tage)}), _jetzt(), wer))


def ablegen(c, table, id_, art, titel, wer="", projekt="", app="", dateien=None, extra=None):
    """Datensatz (mit allem, was daran hängt) in den Papierkorb legen und aus der Datenbank löschen. Gibt die Papierkorb-ID zurück."""
    pk = _pk(c, table) or "id"
    rows = _rows(c, table, f"{pk}=?", (id_,))
    if not rows:
        return None
    teile, relink = [], []
    _sammeln(c, table, rows, teile, relink)
    for e in extra or []:   # weitere Zeilen ohne Fremdschlüssel (z. B. Anwesenheit im Bauzeitenplan)
        r2 = _rows(c, e[0], e[1], e[2])
        if r2:
            teile.append({"t": e[0], "rows": r2})
            c.execute(f"DELETE FROM {e[0]} WHERE {e[1]}", e[2])
    data = json.dumps({"teile": teile, "relink": relink}, ensure_ascii=False, default=str)
    pid = c.execute("""INSERT INTO bp_papierkorb(art, titel, projekt, app, tabelle, schluessel, data, dateien, groesse, geloescht, von)
                       VALUES(?,?,?,?,?,?,?,?,?,?,?) RETURNING id""",
                    (art, (titel or "")[:300], (projekt or "")[:300], app, table, str(id_), data, json.dumps(dateien or []),
                     len(data), _jetzt(), wer)).fetchone()["id"]
    c.execute(f"DELETE FROM {table} WHERE {pk}=?", (id_,))
    try:
        aufraeumen(c)
    except Exception:
        pass
    return pid


def wiederherstellen(c, pid):
    """Alles wieder einfügen (Eltern vor Kindern). Fehler (z. B. das Projekt gibt es nicht mehr) → ValueError mit Klartext."""
    r = c.execute("SELECT * FROM bp_papierkorb WHERE id=?", (pid,)).fetchone()
    if not r:
        raise ValueError("Nicht mehr im Papierkorb.")
    d = json.loads(r["data"])
    spalten, offen = {}, []
    for teil in d.get("teile") or []:
        t = teil["t"]
        if t not in spalten:
            spalten[t] = {x["column_name"] for x in c.execute(
                "SELECT column_name FROM information_schema.columns WHERE table_name=? AND table_schema=current_schema()", (t,)).fetchall()}
        offen += [(t, {k: _unpack(v) for k, v in row.items() if k in spalten[t]}) for row in teil["rows"]]
    if offen and r["tabelle"] and r["schluessel"]:
        pk = _pk(c, r["tabelle"])
        if pk and c.execute(f"SELECT 1 FROM {r['tabelle']} WHERE {pk}::text=?", (r["schluessel"],)).fetchone():
            raise ValueError(f"„{r['titel']}“ ist schon wieder da.")
    # in Durchgängen einfügen: was an einer noch fehlenden Zeile hängt (Fremdschlüssel), kommt im nächsten Durchgang
    letzter = ""
    for _ in range(12):
        rest = []
        for t, vals in offen:
            if not vals:
                continue
            try:
                with c.savepoint():
                    c.execute(f"INSERT INTO {t}({','.join(vals)}) VALUES({','.join('?' * len(vals))})", list(vals.values()))
            except Exception as e:
                m = str(e).lower()
                if "duplicate" in m or "doppelt" in m:
                    continue   # gibt es schon
                if "foreign key" in m or "fremdschl" in m:
                    rest.append((t, vals)); letzter = str(e)
                    continue
                raise
        if not rest or len(rest) == len(offen):
            offen = rest
            break
        offen = rest
    if offen:
        raise ValueError(f"„{r['titel']}“ lässt sich nicht wiederherstellen – es hängt an etwas, das es nicht mehr gibt (z. B. ein gelöschtes Projekt). {letzter[:120]}")
    for x in d.get("relink") or []:
        try:
            with c.savepoint():
                c.execute(f"UPDATE {x['t']} SET {x['sp']}=? WHERE {x['pk']}=? AND {x['sp']} IS NULL", (_unpack(x["v"]), _unpack(x["id"])))
        except Exception:
            pass   # Verweis lässt sich nicht mehr setzen – kein Grund, das Wiederherstellen abzubrechen
    c.execute("DELETE FROM bp_papierkorb WHERE id=?", (pid,))
    return {"art": r["art"], "titel": r["titel"], "app": r["app"], "tabelle": r["tabelle"], "schluessel": r["schluessel"]}


def endgueltig(c, ids):
    """Endgültig löschen. Dateien auf dem Datenträger kommen in die Warteschlange ihrer App."""
    n = 0
    for pid in ids:
        r = c.execute("SELECT app, dateien FROM bp_papierkorb WHERE id=?", (pid,)).fetchone()
        if not r:
            continue
        try:
            files = json.loads(r["dateien"] or "[]")
        except ValueError:
            files = []
        if files:
            key = f"papierkorb:dateien:{r['app'] or 'bautagebuch'}"
            alt = c.execute("SELECT data FROM bp_store WHERE key=?", (key,)).fetchone()
            liste = (json.loads(alt["data"]) if alt else []) + files
            c.execute("INSERT INTO bp_store(key, data, updated, updated_by) VALUES(?,?,?,?) ON CONFLICT (key) DO UPDATE SET data=EXCLUDED.data, "
                      "updated=EXCLUDED.updated", (key, json.dumps(liste), _jetzt(), ""))
        c.execute("DELETE FROM bp_papierkorb WHERE id=?", (pid,))
        n += 1
    return n


def dateien_abholen(c, app):
    """Dateien, die endgültig gelöscht wurden und die app vom Datenträger entfernen soll (leert die Warteschlange)."""
    key = f"papierkorb:dateien:{app}"
    r = c.execute("SELECT data FROM bp_store WHERE key=?", (key,)).fetchone()
    if not r:
        return []
    c.execute("DELETE FROM bp_store WHERE key=?", (key,))
    try:
        return json.loads(r["data"]) or []
    except ValueError:
        return []


def liste(c):
    try:
        aufraeumen(c)
    except Exception:
        pass
    return [{"id": r["id"], "art": r["art"], "titel": r["titel"], "projekt": r["projekt"], "app": r["app"], "geloescht": r["geloescht"],
             "von": r["von"], "groesse": r["groesse"]}
            for r in c.execute("SELECT id, art, titel, projekt, app, geloescht, von, groesse FROM bp_papierkorb ORDER BY geloescht DESC, id DESC").fetchall()]
