"""Ablauftests Live-Aktualisierung: Änderungen anderer kommen an, eigene nicht."""
from lib import pruefe

BA = "/bauantrag/api"


def test_live_aenderungen_anderer(ctx):
    """Anna fragt den Stand ab; der Administrator legt einen Bauantrag an – Anna sieht „bauantrag“ im Projekt, der Administrator selbst nicht."""
    anna = ctx.anmelden("Anna Bauer")
    s_anna = anna.gj("/api/bp/live")["seit"]
    s_adm = ctx.admin.gj("/api/bp/live")["seit"]
    aid = ctx.admin.pj(f"{BA}/antraege", {"project_id": ctx.pid, "name": "RT Live"})["antrag"]["id"]
    try:
        ev = anna.gj(f"/api/bp/live?seit={s_anna}")["ev"]
        pruefe(any(e["t"] == "bauantrag" and e["p"] == ctx.pid for e in ev), f"Anna sieht die Änderung: {ev}")
        ev2 = ctx.admin.gj(f"/api/bp/live?seit={s_adm}")["ev"]
        pruefe(not any(e["t"] == "bauantrag" for e in ev2), f"eigene Änderung löst nichts aus: {ev2}")
    finally:
        ctx.admin.delete(f"{BA}/antraege/{aid}")
