"""Windows-App (bpcore/winapp.py, GO 17.11.2026): neuestes Setup an den Releases finden (auch Vorabversion, nie Entwurf),
„Später“ läuft nach 7 Tagen ab, „Nicht mehr fragen“ bleibt, „genutzt“ merkt Version und ersten Start. Testdaten erfunden."""
from datetime import datetime, timedelta

from bpcore import winapp as W
from lib import gleich, pruefe

T0 = datetime(2026, 11, 17, 8, 0)


def _rel(tag, zeit, *assets, draft=False, pre=True):
    return {"tag_name": tag, "published_at": zeit, "draft": draft, "prerelease": pre,
            "assets": [{"name": a, "browser_download_url": f"https://example.invalid/{tag}/{a}"} for a in assets]}


def test_setup_waehlen():
    R = [_rel("v2026.11.274", "2026-11-17T05:14:00Z"),   # vor der Windows-App: kein Setup
         _rel("v2026.11.276", "2026-11-17T09:00:00Z", "Bauplattform-Setup-2026.11.276.exe", "Bauplattform-Setup-2026.11.276.exe.blockmap", "latest.yml"),
         _rel("v2026.11.277", "2026-11-17T12:00:00Z", "Bauplattform-Setup-2026.11.277.exe", draft=True),   # Entwurf zählt nicht
         _rel("v2026.11.275", "2026-11-17T06:07:00Z", "Bauplattform-Setup-2026.11.275.exe", pre=False)]
    s = W.waehle_setup(R)
    gleich(s["version"], "2026.11.276", "neuestes veröffentlichtes Release mit Setup")
    pruefe(s["url"].endswith("/Bauplattform-Setup-2026.11.276.exe"), "Setup selbst, nicht blockmap oder latest.yml")
    gleich(W.waehle_setup([_rel("v1", "2026-01-01T00:00:00Z", "latest.yml")]), None, "ohne Setup kein Angebot")
    gleich(W.waehle_setup(None), None, "ohne Antwort von GitHub kein Angebot")


def test_merken_und_stand():
    ex = {"bt_assistent": {"on": True}}
    s = W.stand(ex, T0)
    gleich((s["genutzt"], s["nie"], s["spaeter_bis"]), (False, False, None), "Anfang: noch nichts")
    ex = W.merken(ex, "spaeter", jetzt=T0)
    pruefe(W.stand(ex, T0 + timedelta(days=6))["spaeter_bis"], "Später: 6 Tage danach noch ruhig")
    gleich(W.stand(ex, T0 + timedelta(days=8))["spaeter_bis"], None, "Später: nach 7 Tagen wieder anbieten")
    ex = W.merken(ex, "genutzt", "2026.11.276", jetzt=T0)
    ex = W.merken(ex, "genutzt", "2026.11.280", jetzt=T0 + timedelta(days=3))
    s = W.stand(ex, T0)
    gleich((s["genutzt"], s["version"]), (True, "2026.11.280"), "genutzt mit letzter Version")
    gleich(ex["winapp"]["erstmals"], T0.isoformat(timespec="seconds"), "erster Start bleibt")
    gleich(ex["bt_assistent"], {"on": True}, "übrige Einstellungen bleiben")
    pruefe(W.stand(W.merken({}, "nie", jetzt=T0), T0)["nie"], "Nicht mehr fragen")
    try:
        W.merken({}, "irgendwas")
        pruefe(False, "unbekannte Antwort wird abgewiesen")
    except ValueError:
        pass
    gleich(W.stand({"winapp": {"spaeter_bis": "kaputt"}}, T0)["spaeter_bis"], None, "kaputtes Datum: wie nie gesagt")
