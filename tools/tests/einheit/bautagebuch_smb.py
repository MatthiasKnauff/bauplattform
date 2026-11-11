"""Ablage über SMB: Anmeldung reist bei jedem Aufruf mit, der gemeinsame Verbindungsspeicher wird nur bei neuen Zugangsdaten zurückgesetzt
(früher bei jedem Öffnen – das riss gleichzeitigen Anfragen die Sitzung weg: „No username or password was specified“)."""
import sys
import types

from lib import gleich, pruefe


def _falsch():
    m = types.ModuleType("smbclient"); m.log = []
    m.reset_connection_cache = lambda: m.log.append(("reset",))
    m.register_session = lambda server, **k: m.log.append(("reg", server, k.get("username")))
    m.scandir = lambda path, **k: (m.log.append(("scandir", path, k.get("username"), k.get("password"))) or [])
    return m


def test_smb_anmeldung_bei_jedem_aufruf():
    alt = sys.modules.get("smbclient"); m = sys.modules["smbclient"] = _falsch()
    try:
        from core import remote
        remote._SMB_STAND = None
        a = remote.Smb("srv", "daten", "Projekte", "bt", "geheim", "BUERO")
        remote.Smb("srv", "daten", "Projekte", "bt", "geheim", "BUERO")   # gleichzeitig zweites Öffnen
        gleich(sum(1 for x in m.log if x[0] == "reset"), 0, "gleiche Zugangsdaten: kein Zurücksetzen")
        a.listdir("A481")
        s = [x for x in m.log if x[0] == "scandir"][-1]
        gleich((s[2], s[3]), ("BUERO\\bt", "geheim"), "scandir bekommt die Anmeldung mit")
        pruefe(s[1].endswith("\\daten\\Projekte\\A481"), s[1])
        remote.Smb("srv", "daten", "Projekte", "bt", "neu", "BUERO")
        gleich(sum(1 for x in m.log if x[0] == "reset"), 1, "neues Kennwort: einmal zurücksetzen")
    finally:
        if alt is None: sys.modules.pop("smbclient", None)
        else: sys.modules["smbclient"] = alt
