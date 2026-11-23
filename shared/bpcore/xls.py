"""Alte Excel-Dateien (.xls, BIFF8 in einer OLE2-Verbunddatei) lesen – ohne fremde Bibliothek (23.11.2026, Excel-Kostenberechnung Weg 1).

Gelesen wird das erste Tabellenblatt: Zahlen, Texte und Formeln. Formeln kommen als Text zurück („=1296+12568.5“, „=E19*1.19“,
„=SUM(C17:C31)“, Bezüge auf andere Dateien als „='[1]'!F113“) – so lassen sich Einzelbeträge und Rechenfehler genauso erkennen wie
bei .xlsx (openpyxl). Unbekannte Formelteile → Formel None, der zuletzt gerechnete Wert bleibt.

    zellen(roh) → {(zeile, spalte): (wert, formel)}   Zeile/Spalte ab 1 wie in openpyxl; wert = Zahl, Text oder None; formel = "=…" oder None
    spalte(n) → Buchstaben (1 → A)
"""
import struct

ENDE = 0xFFFFFFFE


class XlsFehler(ValueError):
    pass


def spalte(n):
    s = ""
    while n:
        n, r = divmod(n - 1, 26)
        s = chr(65 + r) + s
    return s


# ---------------------------------------------------------------- OLE2-Verbunddatei → Datenstrom „Workbook“
def _strom(roh):
    if roh[:8] != b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1":
        raise XlsFehler("Das ist keine Excel-Datei im alten Format (.xls).")
    sg = 1 << struct.unpack_from("<H", roh, 0x1E)[0]
    msg = 1 << struct.unpack_from("<H", roh, 0x20)[0]
    u = lambda o: struct.unpack_from("<I", roh, o)[0]   # noqa: E731
    n_fat, dir1, cutoff, mfat1, difat1, n_difat = u(0x2C), u(0x30), u(0x38), u(0x3C), u(0x44), u(0x48)
    sektor = lambda n: roh[(n + 1) * sg:(n + 2) * sg]   # noqa: E731
    difat = list(struct.unpack_from("<109I", roh, 0x4C))
    s = difat1
    for _ in range(n_difat):
        if s >= ENDE:
            break
        d = sektor(s)
        difat += list(struct.unpack_from(f"<{sg // 4 - 1}I", d))
        s = struct.unpack_from("<I", d, sg - 4)[0]
    fat = []
    for f in difat[:n_fat]:
        fat += list(struct.unpack_from(f"<{sg // 4}I", sektor(f)))

    def kette(start, tab, lies):
        out, s, n = [], start, 0
        while s < ENDE and n < len(tab) + 1:
            out.append(lies(s)); s = tab[s] if s < len(tab) else ENDE; n += 1
        return b"".join(out)
    verz = kette(dir1, fat, sektor)
    eintraege = []
    for o in range(0, len(verz) - 127, 128):
        ln = struct.unpack_from("<H", verz, o + 0x40)[0]
        name = verz[o:o + max(0, ln - 2)].decode("utf-16-le", "ignore")
        eintraege.append((name, verz[o + 0x42], struct.unpack_from("<I", verz, o + 0x74)[0], struct.unpack_from("<I", verz, o + 0x78)[0]))
    if not eintraege:
        raise XlsFehler("Die Excel-Datei ist leer oder beschädigt.")
    wb = next((e for e in eintraege if e[0] in ("Workbook", "Book")), None)
    if not wb:
        raise XlsFehler("In der Datei steht keine Arbeitsmappe.")
    _, _, start, groesse = wb
    if groesse >= cutoff:
        return kette(start, fat, sektor)[:groesse]
    mfat = list(struct.unpack(f"<{len(m) // 4}I", m)) if (m := kette(mfat1, fat, sektor)) else []
    mini = kette(eintraege[0][2], fat, sektor)   # Root Entry trägt den Mini-Strom
    return kette(start, mfat, lambda n: mini[n * msg:(n + 1) * msg])[:groesse]


# ---------------------------------------------------------------- BIFF8
def _datensaetze(w):
    o = 0
    while o + 4 <= len(w):
        t, ln = struct.unpack_from("<HH", w, o)
        yield t, w[o + 4:o + 4 + ln], o
        o += 4 + ln


def _rk(v):
    x = (struct.unpack("<d", struct.pack("<Q", (v & 0xFFFFFFFC) << 32))[0]) if not v & 2 else float(v >> 2 if v < 2 ** 31 else (v >> 2) - (1 << 30))
    return x / 100 if v & 1 else x


def _sst(teile):
    """Tabelle der Texte (SST + CONTINUE): ein Text darf über die Grenze eines Datensatzes laufen; danach steht ein neues Kennzeichen."""
    werte, ti, o = [], 0, 8
    n = struct.unpack_from("<I", teile[0], 4)[0] if teile and len(teile[0]) >= 8 else 0

    def byte():
        nonlocal ti, o
        while o >= len(teile[ti]):
            ti += 1; o = 0
        b = teile[ti][o]; o += 1
        return b

    def roh(k):
        nonlocal ti, o
        out = b""
        while len(out) < k:
            while o >= len(teile[ti]):
                ti += 1; o = 0
            nimm = min(k - len(out), len(teile[ti]) - o); out += teile[ti][o:o + nimm]; o += nimm
        return out
    try:
        for _ in range(n):
            cch = struct.unpack("<H", roh(2))[0]; fl = byte()
            rt = struct.unpack("<H", roh(2))[0] if fl & 8 else 0
            sz = struct.unpack("<I", roh(4))[0] if fl & 4 else 0
            breit, s, rest = fl & 1, "", cch
            while rest:
                if o >= len(teile[ti]):   # Grenze: neuer Datensatz beginnt mit einem eigenen Kennzeichen (8 oder 16 Bit)
                    ti += 1; o = 0; breit = byte() & 1
                verf = (len(teile[ti]) - o) // (2 if breit else 1)
                k = min(rest, verf)
                b = roh(k * (2 if breit else 1))
                s += b.decode("utf-16-le") if breit else b.decode("latin-1"); rest -= k
            roh(rt * 4 + sz)
            werte.append(s)
    except (IndexError, struct.error):
        pass
    return werte


def _text(d, o, breite16=True):
    cch = struct.unpack_from("<H", d, o)[0] if breite16 else d[o]
    o += 2 if breite16 else 1
    fl = d[o]; o += 1
    return d[o:o + cch * 2].decode("utf-16-le", "ignore") if fl & 1 else d[o:o + cch].decode("latin-1")


def _ref(rw, col, zr, zs, relativ):
    """Zellbezug → A1; relativ (geteilte Formel): Zeile/Spalte als Abstand zur Zelle, wo das jeweilige Kennzeichen gesetzt ist."""
    cr, rr, c = bool(col & 0x4000), bool(col & 0x8000), col & 0x3FFF
    if relativ:
        if rr:
            rw = (zr + (rw if rw < 0x8000 else rw - 0x10000)) & 0xFFFF
        if cr:
            c = (zs + (c if c < 0x2000 else c - 0x4000)) & 0xFF
    return f"{'' if cr else '$'}{spalte(c + 1)}{'' if rr else '$'}{rw + 1}"


FUNK = {0: "COUNT", 1: "IF", 4: "SUM", 5: "AVERAGE", 6: "MIN", 7: "MAX", 3: "ISERROR", 25: "ABS", 27: "ROUND", 36: "AND", 37: "OR", 65: "DATE", 212: "ROUNDUP", 213: "ROUNDDOWN"}
OPS = {0x03: "+", 0x04: "-", 0x05: "*", 0x06: "/", 0x07: "^", 0x08: "&", 0x09: "<", 0x0A: "<=", 0x0B: "=", 0x0C: ">=", 0x0D: ">", 0x0E: "<>"}


def _formel(r, zr, zs, relativ=False):
    """Formel-Kennzeichen (umgekehrte polnische Folge) → Text ohne „=“; None bei Unbekanntem."""
    st, o = [], 0
    try:
        while o < len(r):
            t = r[o]; o += 1
            b = t & 0x1F if t >= 0x20 else t
            if t in OPS:
                y, x = st.pop(), st.pop(); st.append(f"{x}{OPS[t]}{y}")
            elif t == 0x12:
                st.append("+" + st.pop())
            elif t == 0x13:
                st.append("-" + st.pop())
            elif t == 0x14:
                st.append(st.pop() + "%")
            elif t == 0x15:
                st.append(f"({st.pop()})")
            elif t == 0x16:
                st.append("")
            elif t == 0x17:
                s = _text(r, o, False); n = r[o]; o += 2 + n * (2 if r[o + 1] & 1 else 1); st.append('"' + s.replace('"', '""') + '"')
            elif t == 0x19:   # tAttr: Summe mit einem Bereich, Leerzeichen, Sprünge
                art = r[o]
                if art & 0x04:   # Choose: Tabelle der Sprünge
                    n = struct.unpack_from("<H", r, o + 1)[0]; o += 3 + 2 * (n + 1)
                else:
                    o += 3
                    if art & 0x10:
                        st.append(f"SUM({st.pop()})")
            elif t in (0x1C, 0x1D):
                st.append(("#FEHLER" if t == 0x1C else ("WAHR" if r[o] else "FALSCH"))); o += 1
            elif t == 0x1E:
                st.append(str(struct.unpack_from("<H", r, o)[0])); o += 2
            elif t == 0x1F:
                v = struct.unpack_from("<d", r, o)[0]; o += 8; st.append(repr(v) if v != int(v) else str(int(v)))
            elif b in (0x04, 0x0C):   # ptgRef / ptgRefN
                rw, col = struct.unpack_from("<HH", r, o); o += 4; st.append(_ref(rw, col, zr, zs, b == 0x0C or relativ))
            elif b in (0x05, 0x0D):   # ptgArea / ptgAreaN
                r1, r2, c1, c2 = struct.unpack_from("<HHHH", r, o); o += 8
                rel = b == 0x0D or relativ; st.append(f"{_ref(r1, c1, zr, zs, rel)}:{_ref(r2, c2, zr, zs, rel)}")
            elif b == 0x1A:   # ptgRef3d – andere Datei/anderes Blatt
                _, rw, col = struct.unpack_from("<HHH", r, o); o += 6; st.append(f"'[ext]'!{_ref(rw, col, zr, zs, False)}")
            elif b == 0x1B:
                _, r1, r2, c1, c2 = struct.unpack_from("<HHHHH", r, o); o += 10; st.append(f"'[ext]'!{_ref(r1, c1, zr, zs, False)}:{_ref(r2, c2, zr, zs, False)}")
            elif b == 0x01:   # ptgFunc
                f = struct.unpack_from("<H", r, o)[0]; o += 2
                if f not in FUNK:
                    return None
                n = {25: 1, 3: 1, 27: 2, 212: 2, 213: 2, 65: 3}.get(f)
                if n is None:
                    return None
                a = [st.pop() for _ in range(n)][::-1]; st.append(f"{FUNK[f]}({','.join(a)})")
            elif b == 0x02:   # ptgFuncVar
                n = r[o]; f = struct.unpack_from("<H", r, o + 1)[0] & 0x7FFF; o += 3
                if f not in FUNK:
                    return None
                a = [st.pop() for _ in range(n)][::-1]; st.append(f"{FUNK[f]}({','.join(a)})")
            elif b == 0x03:   # ptgName
                o += 4; st.append("NAME")
            elif b == 0x19:   # ptgNameX
                o += 6; st.append("'[ext]'!NAME")
            else:
                return None
        return st[-1] if len(st) == 1 else None
    except (IndexError, struct.error):
        return None


def zellen(roh):
    w = _strom(roh)
    recs = list(_datensaetze(w))
    if not recs or recs[0][0] != 0x0809 or struct.unpack_from("<H", recs[0][1], 0)[0] != 0x0600:
        raise XlsFehler("Diese Excel-Datei ist älter als Excel 97 – bitte in Excel öffnen und als .xlsx speichern.")
    teile, blatt, sst = [], None, []
    for i, (t, d, _) in enumerate(recs):
        if t == 0x0085 and blatt is None and len(d) >= 6 and d[5] == 0:   # BOUNDSHEET: erstes Tabellenblatt
            blatt = struct.unpack_from("<I", d, 0)[0]
        elif t == 0x00FC:
            teile = [d]; j = i + 1
            while j < len(recs) and recs[j][0] == 0x003C:
                teile.append(recs[j][1]); j += 1
            sst = _sst(teile)
    if blatt is None:
        raise XlsFehler("In der Datei steht kein Tabellenblatt.")
    Z, geteilt, letzte = {}, {}, None
    for t, d, o in _datensaetze(w[blatt:]):
        if t == 0x000A and o > 0:   # EOF des Blatts
            break
        if t == 0x00FD:
            rw, col, _, i = struct.unpack_from("<HHHI", d); Z[(rw + 1, col + 1)] = (sst[i] if i < len(sst) else "", None)
        elif t == 0x0204:
            rw, col, _ = struct.unpack_from("<HHH", d); Z[(rw + 1, col + 1)] = (_text(d, 6), None)
        elif t == 0x0203:
            rw, col, _, v = struct.unpack_from("<HHHd", d); Z[(rw + 1, col + 1)] = (v, None)
        elif t == 0x027E:
            rw, col, _, v = struct.unpack_from("<HHHI", d); Z[(rw + 1, col + 1)] = (_rk(v), None)
        elif t == 0x00BD:
            rw, c1 = struct.unpack_from("<HH", d)
            for k in range((len(d) - 6) // 6):
                Z[(rw + 1, c1 + k + 1)] = (_rk(struct.unpack_from("<I", d, 4 + 6 * k + 2)[0]), None)
        elif t == 0x04BC:   # SHRFMLA: geteilte Formel für einen Bereich – gilt für die Formel davor und alle mit Verweis darauf
            r1, r2, c1, c2 = struct.unpack_from("<HHBB", d); n = struct.unpack_from("<H", d, 8)[0]
            geteilt[(r1, c1)] = (r1, r2, c1, c2, d[10:10 + n])
        elif t == 0x0006:
            rw, col, _ = struct.unpack_from("<HHH", d)
            erg = d[6:14]
            wert = None if erg[6:8] == b"\xff\xff" else struct.unpack("<d", erg)[0]
            if erg[6:8] == b"\xff\xff" and erg[0] == 1:
                wert = bool(erg[2])
            n = struct.unpack_from("<H", d, 20)[0]; r = d[22:22 + n]
            letzte = (rw, col)
            Z[(rw + 1, col + 1)] = (wert, ("EXP", r) if r[:1] == b"\x01" else ("=" + f if (f := _formel(r, rw, col)) is not None else None))
        elif t == 0x0207 and letzte:   # Text als Ergebnis der Formel davor
            v, f = Z[(letzte[0] + 1, letzte[1] + 1)]; Z[(letzte[0] + 1, letzte[1] + 1)] = (_text(d, 0), f)
    for (zr, zs), (v, f) in list(Z.items()):   # ptgExp → geteilte Formel an dieser Zelle auflösen
        if isinstance(f, tuple):
            rw0, c0 = struct.unpack_from("<HH", f[1], 1)
            g = geteilt.get((rw0, c0)) or next((x for x in geteilt.values() if x[0] <= zr - 1 <= x[1] and x[2] <= zs - 1 <= x[3]), None)
            txt = _formel(g[4], zr - 1, zs - 1, True) if g else None
            Z[(zr, zs)] = (v, "=" + txt if txt is not None else None)
    return Z
