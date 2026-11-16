"""KI-Gespräch „Fragen“ (bpcore/ki_fragen.py, GO 16.11.2026): Suchwörter und Preisfragen erkennen – ohne Datenbank und ohne KI."""
from bpcore import ki_fragen as K
from lib import gleich, pruefe


def test_woerter_und_preisfrage():
    gleich(K._w("Was kostet der Fenstertausch im Bad?"), ["Fenstertausch"], "nur bedeutende Wörter ab 4 Zeichen")
    pruefe(K.PREISWORT.search("Was kostet ein Dachfenster?") and K.PREISWORT.search("EP für Estrich") and not K.PREISWORT.search("Wann ist der Rohbau fertig?"), "Preisfrage erkennen")
    pruefe("NUR die mitgegebenen Daten" in K.SYSTEM and "keinen Preis" in K.SYSTEM, "Regel: nur eigene Daten, kein erfundener Preis")
