"""Kleine .xls (BIFF8 in OLE2) für die Tests des eigenen Lesers bpcore/xls.py – erfundene Werte, entsteht beim Test (keine .xls im Repo).
zellen: {(zeile, spalte): wert} mit Zahl, Text oder Formel als Tokenliste: [("ref", "E6"), ("num", 1.19), "*"], ("area", "C3:C6"), "sum";
eine Zahl am Ende der Liste = gespeichertes Ergebnis."""
import re
import struct


def _rc(a):
    m = re.fullmatch(r"([A-Z])(\d+)", a)
    return int(m.group(2)) - 1, ord(m.group(1)) - 65


def _tokens(T):
    o = b""
    for t in T:
        if t == "+":
            o += b"\x03"
        elif t == "*":
            o += b"\x05"
        elif t == "sum":
            o += b"\x22\x01" + struct.pack("<H", 4)   # ptgFuncVar SUM, 1 Argument
        elif t[0] == "num":
            o += b"\x1f" + struct.pack("<d", t[1])
        elif t[0] == "ref":
            r, c = _rc(t[1]); o += b"\x24" + struct.pack("<HH", r, c | 0xC000)
        elif t[0] == "area":
            (r1, c1), (r2, c2) = map(_rc, t[1].split(":")); o += b"\x25" + struct.pack("<HHHH", r1, r2, c1 | 0xC000, c2 | 0xC000)
    return o


def _rec(t, d):
    return struct.pack("<HH", t, len(d)) + d


def mappe(zellen):
    blatt = _rec(0x0809, struct.pack("<HHHHII", 0x0600, 0x0010, 0, 0, 0, 0))
    for (r, c), v in sorted(zellen.items()):
        k = struct.pack("<HHH", r - 1, c - 1, 0)
        if isinstance(v, str):
            b = v.encode("utf-16-le"); blatt += _rec(0x0204, k + struct.pack("<HB", len(v), 1) + b)
        elif isinstance(v, (int, float)):
            blatt += _rec(0x0203, k + struct.pack("<d", v))
        else:
            erg = v[-1] if isinstance(v[-1], (int, float)) else 0.0   # gespeichertes Ergebnis wie von Excel (letzter Eintrag, sonst 0)
            rg = _tokens([t for t in v if not isinstance(t, (int, float))]); blatt += _rec(0x0006, k + struct.pack("<d", erg) + struct.pack("<HIH", 0, 0, len(rg)) + rg)
    blatt += _rec(0x000A, b"")
    name = "Kosten".encode("latin-1")
    kopf = _rec(0x0809, struct.pack("<HHHHII", 0x0600, 0x0005, 0, 0, 0, 0))
    bs_len = 4 + 8 + len(name)
    start = len(kopf) + bs_len + 4   # nach BOUNDSHEET und EOF
    wb = kopf + _rec(0x0085, struct.pack("<IBBBB", start, 0, 0, len(name), 0) + name) + _rec(0x000A, b"") + blatt
    wb += b"\0" * max(0, 4096 - len(wb))   # ab 4096 Byte im normalen Strom (ohne Mini-Strom)
    n = -(-len(wb) // 512)
    wb = wb.ljust(n * 512, b"\0")
    fat = [0xFFFFFFFD, 0xFFFFFFFE] + [3 + i for i in range(n - 1)] + [0xFFFFFFFE]
    fat_s = struct.pack(f"<{len(fat)}I", *fat).ljust(512, b"\xff")

    def eintrag(nm, typ, start, groesse, kind=0xFFFFFFFF):
        b = nm.encode("utf-16-le") + b"\0\0"
        return (b.ljust(64, b"\0") + struct.pack("<HBB", len(b), typ, 1) + struct.pack("<III", 0xFFFFFFFF, 0xFFFFFFFF, kind)
                + b"\0" * 36 + struct.pack("<II", start, groesse) + b"\0" * 4)
    verz = eintrag("Root Entry", 5, 0xFFFFFFFE, 0, 1) + eintrag("Workbook", 2, 2, len(wb)) + b"\0" * 256
    kopf = (b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1" + b"\0" * 16 + struct.pack("<HHHHH", 0x3E, 3, 0xFFFE, 9, 6) + b"\0" * 10
            + struct.pack("<IIIIIIII", 1, 1, 0, 4096, 0xFFFFFFFE, 0, 0xFFFFFFFE, 0) + struct.pack("<I", 0) + b"\xff" * (109 * 4 - 4))
    return kopf + fat_s + verz + wb


def kosten():
    """Dieselbe erfundene Liste wie im .xlsx-Test: Kopf, 300, 311 „=1200+800.5“, 324, 331 (Formel auf falsche Zeile), 441, 735, Summe C3:C6."""
    Z = {(1, 1): "Nr.", (1, 2): "Bezeichnung", (1, 3): "brutto", (1, 5): "netto", (2, 1): 300, (2, 2): "Bauwerk – Baukonstruktionen", (9, 2): "Summe",
         (9, 3): [("area", "C3:C6"), "sum"]}
    for r, (kg, nm, ref, e) in enumerate([(311, "Baugrubenherstellung", "E3", [("num", 1200), ("num", 800.5), "+", 2000.5]), (324, "Unterböden und Bodenplatten", "E4", 5000),
                                          (331, "Tragende Außenwände", "E6", 20000), (441, "Hoch- und Mittelspannungsanlagen", "E6", 3000), (735, "Tragwerksplanung", "E7", 4000)], start=3):
        Z.update({(r, 1): kg, (r, 2): nm, (r, 3): [("ref", ref), ("num", 1.19), "*"], (r, 5): e})
    return mappe(Z)
