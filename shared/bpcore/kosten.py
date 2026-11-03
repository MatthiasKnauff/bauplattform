"""Gemeinsame Vorgaben der Baukosten (genutzt von der Baukosten-App und der Verwaltung)."""

# Raumtypen mit Beispiel-Kennwerten (€/m² Raumfläche, KG 300 + 400, netto). Beispielwerte – durch eigene ersetzen.
TYPES = [
    ("buero", "Büro / Besprechung", 1450, r"büro|buero|besprech|leitung|vorstand|buchhalt|sekretar|lehrer|empfang|schulung|seminar"),
    ("sanitaer", "Sanitär / Umkleiden", 2600, r"\bwc\b|^wc|bad\b|dusch|umkleide|sanitär|sanitaer|toilette"),
    ("aufenthalt", "Eingang / Aufenthalt", 1350, r"eingang|foyer|pause|aufenthalt|multifunk|caf[eé]|küche|kueche|teeküche|halle|warte"),
    ("verkehr", "Flur / Windfang / Treppe", 950, r"flur|windfang|treppe|^th$|diele|\bgang\b|aufzug|vorraum"),
    ("neben", "Lager / Technik / Archiv", 800, r"lager|putz|server|technik|archiv|material|abstell|hausanschluss|heizung|müll|muell"),
    ("tier", "Tierbereich", 3200, r"katze|hund|\btier|zwinger|quarant|auslauf|kleintier|stall|voliere"),
    ("sonst", "Sonstige Räume", 1300, r""),
]
