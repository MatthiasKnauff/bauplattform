"""HTML für E-Mail-Signaturen: eingefügtes HTML (z. B. aus Outlook/Word kopiert) auf sichere Bestandteile reduzieren,
HTML ↔ Text umwandeln und Mails als Text + HTML zusammensetzen."""
import html, re
from html.parser import HTMLParser

TAGS = {"a", "b", "strong", "i", "em", "u", "br", "p", "div", "span", "font", "hr", "table", "tbody", "thead", "tr", "td", "th",
        "img", "ul", "ol", "li", "h1", "h2", "h3", "h4", "small", "big", "sup", "sub", "center"}
LEER = {"br", "hr", "img"}
STYLE = {"color", "background-color", "font-size", "font-weight", "font-family", "font-style", "text-decoration", "text-align",
         "line-height", "margin", "margin-top", "margin-bottom", "margin-left", "margin-right", "padding", "padding-top", "padding-bottom",
         "padding-left", "padding-right", "border", "border-top", "border-bottom", "border-left", "border-right", "width", "height",
         "vertical-align", "white-space", "letter-spacing"}
ATTR = {"a": {"href", "title"}, "img": {"src", "alt", "width", "height"}, "font": {"color", "face", "size"},
        "td": {"colspan", "rowspan", "width", "valign", "align"}, "th": {"colspan", "rowspan", "width", "valign", "align"},
        "table": {"width", "cellpadding", "cellspacing", "border"}, "p": {"align"}, "div": {"align"}}


def _url(v, img=False):
    v = (v or "").strip()
    if re.match(r"^(https?:|mailto:|tel:)", v, re.I):
        return v
    if img and re.match(r"^data:image/(png|jpe?g|gif|webp);base64,", v, re.I) and len(v) < 300000:
        return v
    return None


def _style(v):
    out = []
    for part in (v or "").split(";"):
        if ":" not in part:
            continue
        k, val = part.split(":", 1)
        k, val = k.strip().lower(), val.strip()
        if k in STYLE and not re.search(r"url\(|expression|javascript|@import|[<>]", val, re.I) and len(val) < 120:
            out.append(f"{k}:{val}")
    return ";".join(out)


class _San(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.out, self.stack, self.skip = [], [], 0

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style", "head", "title", "xml", "o:p") or self.skip:
            if tag not in LEER:
                self.skip += 1
            return
        if tag not in TAGS:
            return
        a = []
        for k, v in attrs:
            k = (k or "").lower()
            if k == "style":
                st = _style(v)
                if st:
                    a.append(f'style="{html.escape(st)}"')
            elif k in ATTR.get(tag, ()):
                if k in ("href", "src"):
                    u = _url(v, tag == "img")
                    if u:
                        a.append(f'{k}="{html.escape(u)}"')
                elif re.match(r"^[\w#%.,\- ]{0,60}$", v or ""):
                    a.append(f'{k}="{html.escape(v or "")}"')
        if tag == "a":
            a.append('target="_blank"')
        self.out.append(f"<{tag}{' ' + ' '.join(a) if a else ''}>")
        if tag not in LEER:
            self.stack.append(tag)

    def handle_endtag(self, tag):
        if self.skip:
            if tag in ("script", "style", "head", "title", "xml", "o:p"):
                self.skip -= 1
            return
        if tag in self.stack:
            while self.stack:
                t = self.stack.pop()
                self.out.append(f"</{t}>")
                if t == tag:
                    break

    def handle_data(self, data):
        if not self.skip:
            self.out.append(html.escape(data))


def bereinigen(h, n=40000):
    p = _San()
    p.feed(re.sub(r"<!--.*?-->", "", h or "", flags=re.S))
    p.close()
    out = "".join(p.out) + "".join(f"</{t}>" for t in reversed(p.stack))
    return out[:n]


def text_zu_html(t):
    return html.escape(t or "").replace("\n", "<br>")


def html_zu_text(h):
    t = re.sub(r"(?i)<br\s*/?>", "\n", h or "")
    t = re.sub(r"(?i)</(p|div|tr|li|h\d|table)>", "\n", t)
    t = re.sub(r"(?i)<hr[^>]*>", "\n――――――――――――――――\n", t)
    t = re.sub(r"(?i)</t[dh]>", "  ", t)
    t = re.sub(r"<[^>]+>", "", t)
    t = html.unescape(t).replace("\xa0", " ")
    t = re.sub(r"[ \t]+\n", "\n", t)
    return re.sub(r"\n{3,}", "\n\n", t).strip()


def mail_html(text_mit_marke, marke, sig_html):
    """Mailtext (schon ausgefüllt, mit einer Marke an der Stelle der Signatur) → HTML-Fassung mit der Rich-Signatur."""
    body = text_zu_html(text_mit_marke).replace(html.escape(marke), sig_html or "")
    return ('<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.45;color:#1e1e1e">'
            + body + "</body></html>")
