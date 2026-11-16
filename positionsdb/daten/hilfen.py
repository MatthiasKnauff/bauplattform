"""Hilfen der Datendateien (lb_*.py) – einmal statt je Datei eine Kopie. gen.py legt diesen Ordner auf den Suchpfad.

Alle arbeiten auf einem Leistungsbereich lb = {"gruppen": [{"name", "positionen": [{"kurz", "achsen"?, …}]}]}.
"""


def gruppe(lb, name):
    return next(g for g in lb["gruppen"] if g["name"] == name)


def neu(lb, name, positionen):
    """Positionen an die Gruppe hängen; fehlt sie, wird sie angelegt."""
    for g in lb["gruppen"]:
        if g["name"] == name:
            g["positionen"] += positionen
            return
    lb["gruppen"].append({"name": name, "positionen": positionen})


def achsen_vorsatz(lb, prefix, achsen, gruppe_name=None):
    """Achsen für Positionen, deren Kurztext mit prefix beginnt (nur ohne eigene Achsen; wahlweise nur in einer Gruppe)."""
    for g in lb["gruppen"]:
        if gruppe_name is not None and g["name"] != gruppe_name:
            continue
        for p in g["positionen"]:
            if p["kurz"].startswith(prefix) and "achsen" not in p:
                p["achsen"] = achsen


def achsen_regeln(lb, regeln):
    """regeln = [(Vorsatz, Achsen)] – je Position die erste passende Regel (nur ohne eigene Achsen)."""
    for g in lb["gruppen"]:
        for p in g["positionen"]:
            for pre, ax in regeln:
                if p["kurz"].startswith(pre) and "achsen" not in p:
                    p["achsen"] = ax
                    break


def achsen_teil(lb, regeln):
    """regeln = [(Textteil, Achsen)] – je Position ohne Achsen die erste Regel, deren Textteil im Kurztext vorkommt."""
    for g in lb["gruppen"]:
        for p in g["positionen"]:
            if p.get("achsen"):
                continue
            for teil, ax in regeln:
                if teil in p["kurz"]:
                    p["achsen"] = ax
                    break
