"""Ablauftests: Chat in der Kopfleiste (bpcore/chat.py) – Gesamtchat und je App ein fester Raum.

- Räume je Benutzer: Gesamtchat für alle, App-Räume nur mit Zugriff auf die App, „Verwaltung“ nur für Administratoren
- Senden, Lesen (in jeder App derselbe Raum), ungelesene Nachrichten, Nachladen (nach=), Löschen (eigene; Admin jede)
"""
from lib import finde, gleich, pruefe


def _raeume(cl, app="adressen"):
    return cl.gj(f"/{app}/api/bp/chat")


def test_raeume_je_benutzer(ctx):
    admin = [r["raum"] for r in _raeume(ctx.admin)["raeume"]]
    gleich(admin[0], "gesamt", "Gesamtchat zuerst")
    for k in ("bautagebuch", "gantt", "adressen", "baukosten", "admin"):
        pruefe(k in admin, f"Admin sieht den Raum {k} nicht: {admin}")
    pruefe(all(r["angepinnt"] for r in _raeume(ctx.admin)["raeume"]), "alle Räume sind angepinnt")
    bernd = ctx.anmelden("Bernd Krämer")
    br = [r["raum"] for r in _raeume(bernd, "bautagebuch")["raeume"]]
    pruefe("gesamt" in br and "bautagebuch" in br, f"Bernd: {br}")
    pruefe("gantt" not in br and "admin" not in br, f"Bernd sieht fremde Räume: {br}")
    bernd.get("/bautagebuch/api/bp/chat/gantt", expect=403)
    bernd.post("/bautagebuch/api/bp/chat/admin", {"text": "x"}, expect=403)
    ctx.gast().get("/adressen/api/bp/chat", expect=401)


def test_senden_lesen_ungelesen(ctx):
    anna, clara = ctx.anmelden("Anna Bauer"), ctx.anmelden("Clara Wolf")
    text = ctx.name("Hallo Chat")
    clara.gj("/bauzeitenplan/api/bp/chat/gesamt")   # alles bis jetzt gelesen
    m = anna.pj("/baukosten/api/bp/chat/gesamt", {"text": f"  {text}\nzweite Zeile ", "projekt": "T101"})
    gleich(m["text"], f"{text}\nzweite Zeile", "Text ohne Leerraum am Rand")
    pruefe(m["ich"] and m["projekt"] == "T101", f"Antwort: {m}")
    # Clara sieht sie als ungelesen – in jeder App derselbe Raum
    r = finde(_raeume(clara, "bauzeitenplan")["raeume"], raum="gesamt")
    pruefe(r["ungelesen"] >= 1 and r["letzte"]["text"].startswith(text), f"Übersicht: {r}")
    d = clara.gj("/maengel/api/bp/chat/gesamt")
    z = finde(d["nachrichten"], id=m["id"])
    pruefe(z and not z["ich"] and z["name"], f"Nachricht fehlt: {d['nachrichten'][-3:]}")
    gleich(finde(_raeume(clara, "bauzeitenplan")["raeume"], raum="gesamt")["ungelesen"], 0, "nach dem Lesen")
    # Nachladen: nur Neueres
    m2 = anna.pj("/adressen/api/bp/chat/gesamt", {"text": ctx.name("zweite")})
    neu = clara.gj(f"/bauzeitenplan/api/bp/chat/gesamt?nach={m['id']}")["nachrichten"]
    pruefe([x["id"] for x in neu if x["id"] in (m["id"], m2["id"])] == [m2["id"]], f"nach=: {neu}")
    anna.post("/adressen/api/bp/chat/gesamt", {"text": "   "}, expect=400)
    anna.post("/adressen/api/bp/chat/gesamt", {"text": "x" * 4001}, expect=400)


def test_app_raum_und_loeschen(ctx):
    anna, clara = ctx.anmelden("Anna Bauer"), ctx.anmelden("Clara Wolf")
    m = clara.pj("/bauzeitenplan/api/bp/chat/gantt", {"text": ctx.name("Plan")})
    pruefe(finde(anna.gj("/baukosten/api/bp/chat/gantt")["nachrichten"], id=m["id"]), "Anna (alle Apps) liest im Bauzeitenplan-Raum mit")
    anna.delete(f"/baukosten/api/bp/chat/gantt/{m['id']}", expect=403)   # fremde Nachricht
    clara.delete(f"/bauzeitenplan/api/bp/chat/gantt/{m['id']}")
    d = anna.gj(f"/baukosten/api/bp/chat/gantt?nach={m['id'] - 1}&ab={m['id']}")
    pruefe(not finde(d["nachrichten"], id=m["id"]) and m["id"] in d["geloescht"], f"gelöscht: {d}")
    clara.delete(f"/bauzeitenplan/api/bp/chat/gantt/{m['id']}", expect=404)
    m2 = anna.pj("/adressen/api/bp/chat/gesamt", {"text": ctx.name("Admin löscht")})
    ctx.admin.delete(f"/verwaltung/api/bp/chat/gesamt/{m2['id']}")
