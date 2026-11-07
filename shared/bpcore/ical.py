"""Kalendereinladungen (iCalendar, METHOD:REQUEST) – Outlook, Apple, Google & Co. zeigen sie als Termin zum Annehmen."""
from datetime import datetime, timedelta, timezone

VTZ = """BEGIN:VTIMEZONE
TZID:Europe/Berlin
BEGIN:DAYLIGHT
TZOFFSETFROM:+0100
TZOFFSETTO:+0200
TZNAME:CEST
DTSTART:19700329T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU
END:DAYLIGHT
BEGIN:STANDARD
TZOFFSETFROM:+0200
TZOFFSETTO:+0100
TZNAME:CET
DTSTART:19701025T030000
RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU
END:STANDARD
END:VTIMEZONE"""


def _esc(s):
    return str(s or "").replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\r", "").replace("\n", "\\n")


def _fold(line):
    b, out = line.encode("utf-8"), []
    while len(b) > 74:
        cut = 74
        while cut and (b[cut] & 0xC0) == 0x80:   # nicht mitten in einem UTF-8-Zeichen trennen
            cut -= 1
        out.append(b[:cut].decode("utf-8")); b = b[cut:]
    out.append(b.decode("utf-8"))
    return "\r\n ".join(out)


def einladung(uid, datum, uhrzeit, minuten, titel, text, ort, organisator, organisator_name, teilnehmer, teilnehmer_name, seq=0, alarm_min=15, ganztags=False):
    """datum JJJJ-MM-TT, uhrzeit HH:MM (Europe/Berlin). seq erhöhen, wenn derselbe Termin verschoben wird (gleiche uid).
    ganztags=True: Termin über den ganzen Tag (z. B. Fälligkeit einer Aufgabe), als „frei“ eingetragen."""
    now = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    if ganztags:
        d0 = datetime.strptime(datum, "%Y-%m-%d")
        zeit = [f"DTSTART;VALUE=DATE:{d0:%Y%m%d}", f"DTEND;VALUE=DATE:{d0 + timedelta(days=1):%Y%m%d}"]
    else:
        st = datetime.strptime(f"{datum} {uhrzeit or '08:00'}", "%Y-%m-%d %H:%M")
        en = st + timedelta(minutes=minuten or 30)
        zeit = [f"DTSTART;TZID=Europe/Berlin:{st:%Y%m%dT%H%M%S}", f"DTEND;TZID=Europe/Berlin:{en:%Y%m%dT%H%M%S}"]
    L = ["BEGIN:VCALENDAR", "PRODID:-//Bauplattform//Termine//DE", "VERSION:2.0", "CALSCALE:GREGORIAN", "METHOD:REQUEST", *VTZ.split("\n"),
         "BEGIN:VEVENT", f"UID:{uid}", f"SEQUENCE:{int(seq)}", f"DTSTAMP:{now}", *zeit,
         f"SUMMARY:{_esc(titel)}", f"DESCRIPTION:{_esc(text)}"]
    if ort:
        L.append(f"LOCATION:{_esc(ort)}")
    L += [f"ORGANIZER;CN={_esc(organisator_name)}:mailto:{organisator}",
          f"ATTENDEE;CN={_esc(teilnehmer_name)};ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:{teilnehmer}",
          "STATUS:CONFIRMED", "TRANSP:TRANSPARENT" if ganztags else "TRANSP:OPAQUE"]
    if alarm_min:
        L += ["BEGIN:VALARM", "ACTION:DISPLAY", f"DESCRIPTION:{_esc(titel)}", (f"TRIGGER:-PT{int(alarm_min)}M" if alarm_min > 0 else f"TRIGGER;RELATED=START:PT{-int(alarm_min)}M"), "END:VALARM"]
    L += ["END:VEVENT", "END:VCALENDAR"]
    return "\r\n".join(_fold(x) for x in L) + "\r\n"
