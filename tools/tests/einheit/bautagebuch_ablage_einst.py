"""Ablage-Einstellungen je App (17.11.2026): Ordnernamen mit Vorgabe, verbotene Zeichen, und das Umbenennen im Dienst –
an einem echten Ordner: nur wo der alte Ordner da ist und der neue nicht; nichts wird überschrieben."""
import os, tempfile

from lib import gleich, pruefe


def test_ordner_vorgaben_und_pruefung():
    from bpcore import ablage_einst as A
    gleich(A.ordner({}, "ordner_wiki"), ["02 Wiki"], "Vorgabe Wiki")
    gleich(A.ordner({"ordner_wiki_sicherung": "Sicherung\\Wiki "}, "ordner_wiki_sicherung"), ["Sicherung", "Wiki"], "Unterordner mit \\ oder /")
    gleich(A.ordner({}, "ordner_bauherren"), ["Von Bauherrschaft"], "Vorgabe Bauherrschaft")
    gleich(len(A.ordner({}, "ordner_personal")), 7, "Personalakte: sieben Ordner")
    gleich(A.ordner({"ordner_personal": "A\n\n B \n"}, "ordner_personal"), ["A", "B"], "je Zeile ein Ordner")
    pruefe("geht als Ordnername nicht" in A._pruefe_ordner("ordner_bauherren", "Bauherr:in"), "Doppelpunkt verboten (Windows-Freigabe)")
    pruefe("geht" in A._pruefe_ordner("ordner_wiki", "../x"), "kein Weg nach oben")
    gleich(A._pruefe_ordner("ordner_wiki", "Wiki"), "", "erlaubter Name")
    pruefe(all(k in A.einstellungen.ABLAGE for k in A.ORDNER_KEYS), "Ordnernamen gehören zum Block „Ablage“ der Rechte")
    pruefe({"bautagebuch", "ava", "baudaten", "wiki", "bauherren", "personal"} <= set(A.APPS), "alle Apps, die ablegen")


def test_umbenennen_im_dienst():
    from core import ablage_umbenennen as U, remote
    if remote.NUR_LESEN:
        return
    with tempfile.TemporaryDirectory() as td:
        os.makedirs(os.path.join(td, "Büro", "Personal", "Anna", "01 Vertrag & Nachträge"))
        os.makedirs(os.path.join(td, "Büro", "Personal", "Bert", "01 Vertrag & Nachträge"))
        os.makedirs(os.path.join(td, "Büro", "Personal", "Bert", "01 Vertrag"))   # neuer Name schon da: nichts anfassen
        os.makedirs(os.path.join(td, "02 Wiki", "Abdichtung"))
        os.makedirs(os.path.join(td, "A100 Haus", "Von Bauherrschaft"))
        conf = {"store_mode": "folder", "store_dir": td, "portal_unc": td}
        j = {"key": "ordner_personal", "alt": ["01 Vertrag & Nachträge", "02 Bewerbung"], "neu": ["01 Vertrag", "02 Bewerbung"]}
        gleich(U.ausfuehren(j, conf), 1, "eine Akte umbenannt")
        pruefe(os.path.isdir(os.path.join(td, "Büro", "Personal", "Anna", "01 Vertrag")), "Anna umbenannt")
        pruefe(os.path.isdir(os.path.join(td, "Büro", "Personal", "Bert", "01 Vertrag & Nachträge")), "Bert: vorhandener Ordner bleibt")
        gleich(U.ausfuehren({"key": "ordner_wiki", "alt": ["02 Wiki"], "neu": ["02 Wissen"]}, conf), 1, "Wiki-Ordner")
        pruefe(os.path.isdir(os.path.join(td, "02 Wissen", "Abdichtung")), "Inhalt wandert mit")
        P = [{"id": 1, "name": "A100 Haus", "folder": "A100 Haus"}]
        gleich(U.ausfuehren({"key": "ordner_bauherren", "alt": ["Von Bauherrschaft"], "neu": ["Bauherrschaft", "Eingang"]}, conf, P), 1, "Projektordner")
        pruefe(os.path.isdir(os.path.join(td, "A100 Haus", "Bauherrschaft", "Eingang")), "Unterordner angelegt")
        gleich(U.ausfuehren({"key": "ordner_wiki", "alt": ["02 Wiki"], "neu": ["02 Wissen"]}, conf), 0, "zweiter Lauf: nichts mehr zu tun")
