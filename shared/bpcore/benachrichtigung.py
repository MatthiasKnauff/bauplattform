"""Benachrichtigungsverlauf je Kontakt (Tabelle benachrichtigungen, bpcore/migrationen/0012).

protokoll()  eine Sendung für einen oder mehrere Empfänger eintragen – auch für E-Mail-Adressen ohne Kontakt
verlauf()    alle Sendungen an einen Kontakt (über die Kontakt-Nr. oder seine E-Mail-Adresse), neueste zuerst
unbekannt()  welche der Adressen gehören zu keinem Kontakt (für die Rückfrage „Als Kontakt anlegen?“)
"""
from datetime import datetime

ARTEN = {"planversand": "Planversand", "maengelruege": "Mängelrüge", "terminruege": "Terminrüge (Behinderung/Verzug)",
         "nachricht": "Nachricht", "vorgang": "Vorgang"}
WEGE = {"mail": "per E-Mail", "weiterleiten": "an mich zum Weiterleiten", "pdf": "als PDF (selbst zugestellt)"}


def _kontakt_zu(c, email):
    e = (email or "").strip().lower()
    if not e:
        return None
    r = c.execute("SELECT id FROM contacts WHERE lower(email)=? ORDER BY id LIMIT 1", (e,)).fetchone()
    return r["id"] if r else None


def protokoll(c, art, empfaenger, *, project_id=None, projekt="", betreff="", inhalt="", von="", weg="mail",
              status="gesendet", fehler="", link=""):
    """empfaenger: [{email, name, contact_id?}]. Fehler beim Eintragen dürfen eine Sendung nie verhindern. Gibt die neuen Zeilen-IDs zurück."""
    ts = datetime.now().isoformat(timespec="seconds")
    ids = []
    for e in empfaenger or []:
        try:
            email = str(e.get("email") or "").strip()[:200]
            cid = e.get("contact_id") if isinstance(e.get("contact_id"), int) else None
            if cid and not c.execute("SELECT 1 FROM contacts WHERE id=?", (cid,)).fetchone():
                cid = None
            cid = cid or _kontakt_zu(c, email)
            if not (cid or email):
                continue
            r = c.execute("""INSERT INTO benachrichtigungen(ts, contact_id, email, name, art, weg, project_id, projekt, betreff, inhalt, von, status, fehler, link)
                         VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id""",
                      (ts, cid, email, str(e.get("name") or "")[:200], art, weg, project_id, (projekt or "")[:200], (betreff or "")[:300],
                       (inhalt or "")[:4000], (von or "")[:200], status, (fehler or "")[:500], (link or "")[:300])).fetchone()
            if r:
                ids.append(r["id"])
        except Exception as er:   # noqa: BLE001 – Protokoll ist Nebensache
            print("Benachrichtigungsverlauf:", er, flush=True)
    return ids


def verlauf(c, cid, n=200):
    r = c.execute("SELECT email FROM contacts WHERE id=?", (cid,)).fetchone()
    if not r:
        return []
    e = (r["email"] or "").strip().lower()
    rows = c.execute("""SELECT * FROM benachrichtigungen WHERE contact_id=? OR (contact_id IS NULL AND ?<>'' AND lower(email)=?)
                        ORDER BY id DESC LIMIT ?""", (cid, e, e, n)).fetchall()
    return [{"id": x["id"], "ts": x["ts"], "art": x["art"], "art_name": ARTEN.get(x["art"], x["art"]), "weg": x["weg"], "weg_name": WEGE.get(x["weg"], x["weg"]),
             "email": x["email"], "name": x["name"], "project_id": x["project_id"], "projekt": x["projekt"], "betreff": x["betreff"],
             "inhalt": x["inhalt"], "von": x["von"], "status": x["status"], "fehler": x["fehler"], "link": x["link"]} for x in rows]


def unbekannt(c, emails):
    """Adressen (Kleinschreibung egal), zu denen es keinen Kontakt gibt – in der übergebenen Reihenfolge, ohne Doppelte."""
    out, seen = [], set()
    for m in emails or []:
        k = str(m or "").strip().lower()
        if k and k not in seen and not _kontakt_zu(c, k):
            seen.add(k)
            out.append(str(m).strip())
    return out


def zuordnen(c, cid, email):
    """Nach dem Anlegen eines Kontakts frühere Sendungen an diese Adresse fest zuordnen."""
    e = (email or "").strip().lower()
    if e:
        c.execute("UPDATE benachrichtigungen SET contact_id=? WHERE contact_id IS NULL AND lower(email)=?", (cid, e))
