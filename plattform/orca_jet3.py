"""Leser für Microsoft-Access-Dateien im Jet-3-Format (Access 97) – ohne externe Pakete, nur lesend.

ORCA AVA speichert jedes Projekt als solche Datei (*.ava, in der Projektsicherung als ZIP). Aufbau nach der
Formatbeschreibung von mdbtools (HACKING) und Jackcess:
  Seiten zu 2048 Byte · Seite 2 = Tabellendefinition von MSysObjects (Verzeichnis aller Tabellen) ·
  Tabellendefinition (Typ 0x02): Spalten, Nutzungskarte der Datenseiten · Datenseiten (Typ 0x01): Zeilen von hinten nach vorn.
  Zeilenzeiger: 0x8000 = gelöscht (auch alte Fassungen geänderter Zeilen), 0x4000 = Überlauf (die Zeile steht woanders,
  hier nur Zeile + Seite). Memo/OLE: inline, auf einer Seite oder als Kette über mehrere Seiten.
Der Zeilenzähler im Tabellenkopf ist bei Access 97 oft veraltet – maßgeblich sind die gelesenen Zeilen.
"""
import mmap
import struct
from datetime import datetime, timedelta

PG = 2048
ENC = "cp1252"
T_BOOL, T_BYTE, T_INT, T_LONG, T_MONEY, T_FLOAT, T_DOUBLE, T_DATE, T_BIN, T_TEXT, T_OLE, T_MEMO = range(1, 13)
T_GUID, T_NUMERIC = 15, 16


class Col:
    __slots__ = ("name", "type", "num", "var_num", "fixed_off", "size", "fixed")


class Table:
    def __init__(self, db, name, tdef_pg):
        self.db, self.name, self.tdef_pg = db, name, tdef_pg
        buf = bytearray(db.page(tdef_pg))
        nxt = struct.unpack_from("<I", buf, 4)[0]
        while nxt:
            p = db.page(nxt)
            buf += p[8:]
            nxt = struct.unpack_from("<I", p, 4)[0]
        self.num_rows = struct.unpack_from("<I", buf, 12)[0]
        self.num_var = struct.unpack_from("<H", buf, 23)[0]
        ncols = struct.unpack_from("<H", buf, 25)[0]
        nridx = struct.unpack_from("<I", buf, 31)[0]
        self.usage = struct.unpack_from("<I", buf, 35)[0]
        off = 43 + nridx * 8
        cols = []
        for i in range(ncols):
            c = Col()
            c.type = buf[off]
            c.num = buf[off + 1]
            c.var_num = struct.unpack_from("<H", buf, off + 3)[0]
            flags = buf[off + 13]
            c.fixed = bool(flags & 0x01)
            c.fixed_off = struct.unpack_from("<H", buf, off + 14)[0]
            c.size = struct.unpack_from("<H", buf, off + 16)[0]
            cols.append(c)
            off += 18
        for c in cols:
            ln = buf[off]
            c.name = bytes(buf[off + 1:off + 1 + ln]).decode(ENC, "replace")
            off += 1 + ln
        self.cols = cols

    # ---- Seiten, die zur Tabelle gehören ----------------------------------
    def pages(self):
        db = self.db
        rp = self.usage
        data = db.row_bytes(rp >> 8, rp & 0xFF)
        if data is None:
            return db.owner_pages(self.tdef_pg)
        out = []
        if data[0] == 0:
            start = struct.unpack_from("<I", data, 1)[0]
            bm = data[5:]
            for i, b in enumerate(bm):
                if b:
                    for k in range(8):
                        if b & (1 << k):
                            out.append(start + i * 8 + k)
        else:
            per = (PG - 4) * 8
            for j in range((len(data) - 1) // 4):
                mp = struct.unpack_from("<I", data, 1 + j * 4)[0]
                if not mp:
                    continue
                bm = db.page(mp)[4:]
                for i, b in enumerate(bm):
                    if b:
                        for k in range(8):
                            if b & (1 << k):
                                out.append(j * per + i * 8 + k)
        return [p for p in out if p < db.npages and db.page(p)[0] == 1 and
                struct.unpack_from("<I", db.page(p), 4)[0] == self.tdef_pg]

    def rows(self, cols=None):
        want = None if cols is None else set(cols)
        for pg in self.pages():
            p = self.db.page(pg)
            n = struct.unpack_from("<H", p, 8)[0]
            for r in range(n):
                raw = struct.unpack_from("<H", p, 10 + r * 2)[0]
                if raw & 0x8000:
                    continue  # gelöscht
                if raw & 0x4000:  # Überlauf: Zeiger auf andere Zeile
                    s, e = self.db.row_span(p, r)
                    ptr = p[s:s + 4]
                    rr = ptr[0]
                    pp = ptr[1] | (ptr[2] << 8) | (ptr[3] << 16)
                    p2 = self.db.page(pp)
                    s, e = self.db.row_span(p2, rr)
                    yield self._crack(p2, s, e, want)
                    continue
                s, e = self.db.row_span(p, r)
                yield self._crack(p, s, e, want)

    def _crack(self, p, rs, re_, want):
        # rs = erstes Byte, re_ = letztes Byte (inklusive)
        row_cols = p[rs]
        bm = (row_cols + 7) // 8
        nullmask = p[re_ - bm + 1:re_ + 1]
        offs = []
        rvc = 0
        if self.num_var:
            rvc = p[re_ - bm]
            row_len = re_ - rs + 1
            nj = (row_len - 1) // 256
            col_ptr = re_ - bm - nj - 1
            if nj and (col_ptr - rs - rvc) // 256 < nj:
                nj -= 1
            used = 0
            for i in range(rvc + 1):
                while used < nj and i == p[re_ - bm - used - 1]:
                    used += 1
                offs.append(p[col_ptr - i] + used * 256)
        row_fixed = row_cols - rvc
        found = 0
        rec = {}
        for c in self.cols:
            bi, bt = c.num // 8, c.num % 8
            notnull = bi < len(nullmask) and bool(nullmask[bi] & (1 << bt))
            if c.fixed:
                inrow = found < row_fixed
                found += 1
                if want is not None and c.name not in want:
                    continue
                if c.type == T_BOOL:
                    rec[c.name] = notnull
                    continue
                if not notnull or not inrow:
                    rec[c.name] = None
                    continue
                st = rs + 1 + c.fixed_off
                rec[c.name] = self._val(c, bytes(p[st:st + c.size]))
            else:
                if want is not None and c.name not in want:
                    continue
                if not notnull or c.var_num >= rvc:
                    rec[c.name] = None
                    continue
                a, b = offs[c.var_num], offs[c.var_num + 1]
                rec[c.name] = self._val(c, bytes(p[rs + a:rs + b]))
        return rec

    def _val(self, c, b):
        t = c.type
        try:
            if t == T_BYTE:
                return b[0]
            if t == T_INT:
                return struct.unpack("<h", b[:2])[0]
            if t == T_LONG:
                return struct.unpack("<i", b[:4])[0]
            if t == T_MONEY:
                return struct.unpack("<q", b[:8])[0] / 10000.0
            if t == T_FLOAT:
                return struct.unpack("<f", b[:4])[0]
            if t == T_DOUBLE:
                return struct.unpack("<d", b[:8])[0]
            if t == T_DATE:
                d = struct.unpack("<d", b[:8])[0]
                try:
                    return datetime(1899, 12, 30) + timedelta(days=d)
                except (OverflowError, ValueError):
                    return None
            if t == T_TEXT:
                return b.decode(ENC, "replace")
            if t in (T_MEMO, T_OLE):
                data = self.db.memo(b)
                if data is None:
                    return None
                return data.decode(ENC, "replace") if t == T_MEMO else data
            if t == T_GUID:
                return b.hex()
            return b
        except Exception:
            return None


class DB:
    def __init__(self, path):
        self.f = open(path, "rb")
        self.m = mmap.mmap(self.f.fileno(), 0, access=mmap.ACCESS_READ)
        self.npages = len(self.m) // PG
        if self.m[:20] != b"\x00\x01\x00\x00Standard Jet DB\x00":
            raise ValueError("Keine ORCA-/Access-Datei (Kennung „Standard Jet DB“ fehlt).")
        if self.m[0x14] != 0:
            raise ValueError("Die Datei ist im neueren Access-Format (ab Access 2000) – gelesen wird nur das Format von Access 97 (ORCA AVA).")
        self._tables = None

    def page(self, n):
        return self.m[n * PG:(n + 1) * PG]

    @staticmethod
    def row_span(p, r):
        start = struct.unpack_from("<H", p, 10 + r * 2)[0] & 0x1FFF
        end = PG if r == 0 else (struct.unpack_from("<H", p, 10 + (r - 1) * 2)[0] & 0x1FFF)
        return start, end - 1

    def row_bytes(self, pg, r):
        if pg <= 0 or pg >= self.npages:
            return None
        p = self.page(pg)
        n = struct.unpack_from("<H", p, 8)[0]
        if r >= n:
            return None
        s, e = self.row_span(p, r)
        return p[s:e + 1]

    def memo(self, b):
        if len(b) < 12:
            return None
        ln = struct.unpack_from("<I", b, 0)[0]
        flags = ln & 0xC0000000
        ln &= 0x3FFFFFFF
        if flags & 0x80000000:
            return b[12:12 + ln]
        ptr = struct.unpack_from("<I", b, 4)[0]
        if flags == 0x40000000:
            d = self.row_bytes(ptr >> 8, ptr & 0xFF)
            return None if d is None else d[:ln]
        out = bytearray()
        seen = 0
        while ptr and len(out) < ln and seen < 100000:
            d = self.row_bytes(ptr >> 8, ptr & 0xFF)
            if d is None:
                break
            ptr = struct.unpack_from("<I", d, 0)[0]
            out += d[4:]
            seen += 1
        return bytes(out[:ln])

    def owner_pages(self, tdef):
        return [i for i in range(self.npages) if self.m[i * PG] == 1 and
                struct.unpack_from("<I", self.m, i * PG + 4)[0] == tdef]

    def tables(self, system=False):
        if self._tables is None:
            sysobj = Table(self, "MSysObjects", 2)
            t = {}
            for r in sysobj.rows(["Id", "Name", "Type", "Flags"]):
                if r.get("Type") == 1 and r.get("Name"):
                    t[r["Name"]] = (r["Id"] & 0x00FFFFFF, r.get("Flags") or 0)
            self._tables = t
        return {k: v[0] for k, v in self._tables.items() if system or not k.startswith("MSys")}

    def table(self, name):
        return Table(self, name, self.tables(True)[name])

    def close(self):
        try:
            self.m.close()
        finally:
            self.f.close()
