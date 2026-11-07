"""Elektronische Signaturen in PDFs prüfen (z. B. von D-Trust sign-me, Signaturkarte, Adobe).

pruefen(daten, original=None) → {
    ok:          die letzte Signatur ist mathematisch gültig und deckt das ganze Dokument ab,
    fehler:      Grund, wenn nicht,
    signaturen:  [{name, aussteller, zeit, qualifiziert, gueltig, ganz}],
    inhalt:      True/False/None – steht der Text des Originals unverändert im signierten PDF?
}
Geprüft wird: Prüfsumme über die signierten Bereiche, die Signatur selbst mit dem Zertifikat des Unterzeichners,
ob danach nichts mehr angehängt wurde und ob das Zertifikat als qualifiziert gekennzeichnet ist (QcCompliance).
Die Vertrauenskette bis zur Wurzel der Bundesnetzagentur prüft der PDF-Betrachter des Empfängers (Adobe zeigt sie an).
"""
import hashlib, io, re
from collections import Counter

_QC_COMPLIANCE = bytes.fromhex("060604008e460101")   # OID 0.4.0.1862.1.1 (ETSI QcCompliance)


def _signaturfelder(rd):
    out = []
    try:
        fl = rd.get_fields() or {}
    except Exception as e:
        from . import fehler as _fehler
        _fehler.still(None, "PDF-Signatur: Formularfelder lesen", e)
        fl = {}
    for nm, f in fl.items():
        if f.get("/FT") != "/Sig" or not f.get("/V"):
            continue
        v = f["/V"].get_object() if hasattr(f["/V"], "get_object") else f["/V"]
        out.append((nm, v))
    return out


def _cn(name):
    try:
        n = name.native
        return n.get("common_name") or n.get("organization_name") or ", ".join(str(x) for x in n.values())
    except Exception:   # Name nur zur Anzeige
        return ""


def _eine(daten, v):
    from asn1crypto import cms
    from cryptography import x509
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.asymmetric import ec, padding, rsa
    br = [int(x) for x in v.get("/ByteRange") or []]
    if len(br) != 4:
        raise ValueError("Signatur ohne Bytebereich")
    a, b, c, d = br
    signiert = daten[a:a + b] + daten[c:c + d]
    roh = bytes(v.get("/Contents"))
    ci = cms.ContentInfo.load(roh, strict=False)
    sd = ci["content"]
    si = sd["signer_infos"][0]
    alg = si["digest_algorithm"]["algorithm"].native
    h = hashlib.new(alg.replace("sha2_", "sha"))
    h.update(signiert)
    attrs = si["signed_attrs"]
    md = None
    zeit = None
    for at in attrs:
        t = at["type"].native
        if t == "message_digest":
            md = at["values"][0].native
        elif t == "signing_time":
            zeit = at["values"][0].native
    if md != h.digest():
        raise ValueError("Das Dokument wurde nach dem Signieren verändert (Prüfsumme stimmt nicht).")
    # Zertifikat des Unterzeichners
    sid = si["sid"]
    cert = None
    for cc in sd["certificates"] or []:
        cc = cc.chosen
        if sid.name == "issuer_and_serial_number":
            if cc.issuer == sid.chosen["issuer"] and cc.serial_number == sid.chosen["serial_number"].native:
                cert = cc
        elif cc.key_identifier == sid.chosen.native:
            cert = cc
        if cert:
            break
    if cert is None:
        raise ValueError("Zertifikat des Unterzeichners fehlt in der Signatur.")
    xc = x509.load_der_x509_certificate(cert.dump())
    daten_attr = b"\x31" + attrs.dump()[1:]   # signierte Attribute als SET OF
    sig = si["signature"].native
    salg = si["signature_algorithm"]
    sname = salg["algorithm"].native
    hmap = {"sha256": hashes.SHA256(), "sha384": hashes.SHA384(), "sha512": hashes.SHA512(), "sha1": hashes.SHA1()}
    halg = hmap.get(alg.replace("sha2_", "sha"), hashes.SHA256())
    pub = xc.public_key()
    if isinstance(pub, rsa.RSAPublicKey):
        if sname == "rsassa_pss":
            p = salg["parameters"]
            ph = hmap.get(p["hash_algorithm"]["algorithm"].native, halg)
            pub.verify(sig, daten_attr, padding.PSS(mgf=padding.MGF1(ph), salt_length=p["salt_length"].native), ph)
        else:
            pub.verify(sig, daten_attr, padding.PKCS1v15(), halg)
    elif isinstance(pub, ec.EllipticCurvePublicKey):
        pub.verify(sig, daten_attr, ec.ECDSA(halg))
    else:
        raise ValueError("Unbekanntes Schlüsselverfahren")
    qual = False
    for ext in cert["tbs_certificate"]["extensions"] or []:
        if ext["extn_id"].dotted == "1.3.6.1.5.5.7.1.3" and _QC_COMPLIANCE in ext["extn_value"].contents:
            qual = True
    if zeit is None and v.get("/M"):   # PAdES: Zeit aus dem Signaturfeld (D:JJJJMMTThhmmss…)
        m = re.match(r"D:(\d{4})(\d\d)(\d\d)(\d\d)?(\d\d)?(\d\d)?", str(v.get("/M")))
        if m:
            from datetime import datetime, timezone
            zeit = datetime(*[int(x or 0) for x in m.groups()], tzinfo=timezone.utc)
    nb, na = cert["tbs_certificate"]["validity"]["not_before"].native, cert["tbs_certificate"]["validity"]["not_after"].native
    if hasattr(zeit, "tzinfo") and not (nb <= zeit <= na):
        raise ValueError("Das Zertifikat war zum Zeitpunkt der Signatur nicht gültig.")
    ende = c + d
    rest = daten[ende:]
    ganz = a == 0 and (not rest.strip() or re.fullmatch(rb"\s*(%%EOF\s*)?", rest) is not None)
    return {"name": _cn(cert.subject), "aussteller": _cn(cert.issuer), "zeit": zeit.isoformat() if hasattr(zeit, "isoformat") else (zeit or ""),
            "qualifiziert": qual, "gueltig": True, "ganz": ganz, "bis": na.date().isoformat()}


def _woerter(rd):
    w = Counter()
    for pg in rd.pages:
        try:
            w.update(re.findall(r"\w+", pg.extract_text() or ""))
        except Exception:   # Text einer Seite nicht lesbar – Vergleich mit dem Rest
            pass
    return w


def pruefen(daten, original=None):
    from pypdf import PdfReader
    try:
        rd = PdfReader(io.BytesIO(daten))
    except Exception as e:
        return {"ok": False, "fehler": f"Die Datei ist kein lesbares PDF ({e}).", "signaturen": [], "inhalt": None}
    felder = _signaturfelder(rd)
    if not felder:
        return {"ok": False, "fehler": "Im PDF ist keine elektronische Signatur. Bitte die Datei nach dem Unterschreiben in sign-me herunterladen.",
                "signaturen": [], "inhalt": None}
    sigs, fehler = [], ""
    for nm, v in felder:
        try:
            sigs.append(_eine(daten, v))
        except Exception as e:
            sigs.append({"name": nm, "aussteller": "", "zeit": "", "qualifiziert": False, "gueltig": False, "ganz": False, "fehler": str(e)})
            fehler = fehler or f"Signatur ungültig: {e}"
    letzte = sigs[-1]
    if not fehler and not any(s["ganz"] for s in sigs):
        fehler = "Nach dem Signieren wurde am PDF noch etwas geändert."
    inhalt = None
    if original:
        try:
            o, s = _woerter(PdfReader(io.BytesIO(original))), _woerter(rd)
            inhalt = all(s[k] >= n for k, n in o.items())
        except Exception as e:
            from . import fehler as _fehler
            _fehler.still(None, "PDF-Signatur: Text mit dem Original vergleichen", e)
            inhalt = None
            if not fehler:   # ohne Textvergleich kein „in Ordnung“ melden
                fehler = "Der Text des signierten PDFs ließ sich nicht mit der gespeicherten Fassung vergleichen."
        if inhalt is False and not fehler:
            fehler = "Das signierte PDF enthält nicht den gespeicherten Text – bitte die zuletzt gespeicherte Fassung unterschreiben."
    return {"ok": not fehler and letzte["gueltig"], "fehler": fehler, "signaturen": sigs, "inhalt": inhalt}
