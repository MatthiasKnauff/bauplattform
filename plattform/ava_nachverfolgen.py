"""Ausschreibung – LV-Nachverfolgung (17.11.2026, Mock „LV-Nachverfolgung“, Symbol B, Einstieg B1, Vorgabe C1 ↔ C2).

Alle versendeten LVs mit ihren Bieter:innen auf einen Blick – über alle Projekte. Dieselben Daten wie im Reiter „Versand“
(bp_store „ava:versand:<lv>“, ava_versand.py), nur zusammengestellt; geändert wird über dieselbe Adresse (PUT /api/lv/<i>/versand).
GET /api/nachverfolgen?alle=0|1   alle=0: nur Projekte, in denen ich Bauleitung bin (bzw. ohne Bauleitung); sonst alle, die ich sehe.
Je LV: stand = laufend | frist (Abgabe vorbei, noch offene Bieter:innen) | erledigt (vergeben oder niemand mehr offen).
"""
from datetime import date

from flask import g, jsonify, request

from bpcore import db
from ava import _j, _sees, app
import ava_versand as V


def _letzt(d, b, x):
    """Letzte Nachfrage (Anruf oder Erinnerungs-Mail) bzw. Versand – für die Spalte „zuletzt“."""
    v = V._verlauf(d, x, None)
    n = (v.get("nachgefragt") or [])[-1:] or []
    if n:
        return {"t": n[0]["t"], "weg": n[0]["weg"]}
    return {"t": v.get("angeschrieben") or "", "weg": "mail"} if v.get("angeschrieben") else {}


def liste(c, alle):
    heute = date.today().isoformat()
    out = []
    for s in c.execute("SELECT key, data FROM bp_store WHERE key LIKE 'ava:versand:%'").fetchall():
        i = s["key"].rsplit(":", 1)[1]
        if not i.isdigit():
            continue
        r = c.execute("SELECT id, project_id, nr, name, gewerk, status, vergabe, archived FROM ava_lv WHERE id=?", (int(i),)).fetchone()
        if not r or r["archived"] or not r["project_id"]:
            continue
        p = _sees(c, r["project_id"])
        if not p or p["archived"]:
            continue
        lead = _j(p["leaders"], []) or []
        if not alle and lead and g.user["id"] not in lead:
            continue
        d = V._lesen(c, r["id"])
        if not d["laeufe"]:   # noch nichts verschickt – gehört in den Versand, nicht in die Nachverfolgung
            continue
        ang = {a["contact_id"] for a in c.execute("SELECT contact_id FROM ava_angebot WHERE lv_id=?", (r["id"],)).fetchall() if a["contact_id"]}
        ids = [int(x) for x in d["bieter"] if str(x).isdigit()]
        K = {k["id"]: k for k in c.execute(f"SELECT id, name, phone, mobile, email FROM contacts WHERE id IN ({','.join('?' * len(ids)) or 'NULL'})", ids).fetchall()} if ids else {}
        B = []
        for cid in ids:
            k, b = K.get(cid), d["bieter"].get(str(cid)) or {}
            if not k or b.get("weg"):
                continue
            x = {"contact_id": cid, "name": k["name"], "email": b.get("email") or (k["email"] or "").split(",")[0].strip(), "rueck": "angebot" if cid in ang else b.get("rueck") or ""}
            if not b.get("versendet") and not any(any(a.get("ok") and (a.get("email") == x["email"] or a.get("name") == x["name"]) for a in l.get("an") or []) for l in d["laeufe"]):
                continue   # noch nicht angeschrieben
            B.append({**x, "telefon": k["phone"] or k["mobile"] or "", "bis": b.get("bis") or "", "naechst": b.get("naechst") or "", "versendet": b.get("versendet") or "",
                      "anrufe": len(b.get("anrufe") or []), "letzt": _letzt(d, b, x),
                      "faellig": bool(x["rueck"] in ("", "zusage") and (b.get("naechst") or "9") <= heute)})
        if not B:
            continue
        offen = [b for b in B if b["rueck"] in ("", "zusage")]
        vergeben = bool((_j(r["vergabe"], {}) or {}).get("angebot_id")) or r["status"] in ("vergeben", "abgerechnet")
        abgabe = (d.get("abgabe") or "")[:10]
        stand = "erledigt" if vergeben or not offen else "frist" if abgabe and abgabe < heute else "laufend"
        verschickt = next((l["datum"] for l in d["laeufe"] if l.get("art") == "versand"), d["laeufe"][0].get("datum", ""))
        out.append({"lv_id": r["id"], "nr": r["nr"], "name": r["name"], "gewerk": r["gewerk"], "pid": r["project_id"], "projekt": p["name"],
                    "mein": not lead or g.user["id"] in lead, "abgabe": d.get("abgabe") or "", "rueckmeldung": d.get("rueckmeldung") or "",
                    "verschickt": verschickt, "stand": stand, "vergeben": vergeben, "bieter": B,
                    "da": sum(1 for b in B if b["rueck"] in ("angebot", "abgegeben")), "zusage": sum(1 for b in B if b["rueck"] == "zusage"),
                    "absage": sum(1 for b in B if b["rueck"] == "absage")})
    return sorted(out, key=lambda x: ({"laufend": 0, "frist": 1, "erledigt": 2}[x["stand"]], x["abgabe"] or "9", x["projekt"], x["nr"]))


@app.get("/api/nachverfolgen")
def nachverfolgen():
    with db.tx() as c:
        return jsonify(lvs=liste(c, request.args.get("alle") == "1"), heute=date.today().isoformat())
