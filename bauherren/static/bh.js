'use strict';
/* Bauherrenportal – Oberfläche. Nur Text aus den Paketen (textContent), Bilder als data:-Adresse oder vom Portal selbst (/api/datei), kein HTML aus dem Büro.
   Anmeldung: Link per Mail · Kennwort (+ Code) · QR-Code wie bei Nextcloud. Alle POST mit Kopf X-BH (gegen fremde Formulare). */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const M = $('#m'), K = $('#kopf');
  const el = (tag, attr = {}, ...kids) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attr)) { if (k === 'text') e.textContent = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v); } kids.flat().forEach((x) => x != null && e.append(x)); return e; };
  async function api(pfad, body) {
    const r = await fetch(pfad, body === undefined ? { credentials: 'same-origin' } : { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-BH': '1' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(j.error || 'Das ging gerade nicht.'); e.status = r.status; throw e; }
    return j;
  }
  const svgBild = (svg) => el('img', { class: 'qr', alt: 'QR-Code', src: 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg))) });
  const hinweis = (text, art = 'mu') => el('p', { class: art + ' hin', text });
  let ICH = null, qrPoll = null, PA = null;   // PA: gerade gezeigtes Projekt (Anrede je Projekt)
  /* Aussehen des Büros (17.11.2026): Logo und Name im Kopf, Akzentfarbe; Anrede „Sie“/„du“ (Büro, je Projekt abweichend) */
  const AUS = () => (ICH && ICH.aussehen) || {};
  const du = () => ((PA && PA.kopf && PA.kopf.anrede) || AUS().anrede) === 'du';
  const T = (sie, d) => (du() ? d : sie);
  function marke() {
    const A = AUS(), b = $('.bh-k b');
    if (A.farbe) { document.documentElement.style.setProperty('--af', A.farbe); document.documentElement.style.setProperty('--afl', A.farbe + '1a'); }
    b.replaceChildren(...[A.logo ? el('img', { class: 'logo', src: A.logo, alt: '' }) : null, el('span', { text: A.buero || 'Bauherrenportal' })].filter(Boolean));
  }

  async function start() {
    try { ICH = await api('/api/ich'); } catch { ICH = { angemeldet: false }; }
    marke();
    const q = location.pathname.match(/^\/q\/([\w-]+)$/);
    if (q) return ICH.angemeldet ? qrErlauben(q[1]) : anmelden('Bitte zuerst hier anmelden – danach können Sie die Anmeldung am PC erlauben.');
    if (!ICH.angemeldet) return ICH.zweiter ? codeSeite() : anmelden();
    uebersicht();
  }

  // ---------- Anmeldung ----------
  function anmelden(vorab) {
    K.replaceChildren();
    let art = 'link';
    const box = el('div', { class: 'card' });
    const zeig = () => {
      clearInterval(qrPoll);
      const R = el('div', { class: 'reiter' }, ...[['link', 'Link per Mail'], ['pw', 'Kennwort'], ['qr', 'QR-Code']].map(([k, t]) => el('button', { type: 'button', class: k === art ? 'on' : '', text: t, onclick: () => { art = k; zeig(); } })));
      const inhalt = art === 'link' ? linkForm() : art === 'pw' ? pwForm() : qrForm();
      box.replaceChildren(...[el('h1', { text: 'Anmelden' }), vorab && hinweis(vorab), R, inhalt].filter(Boolean));   // replaceChildren schreibt null sonst als Text „null“
    };
    zeig();
    M.replaceChildren(box);
  }
  function linkForm() {
    const mail = el('input', { type: 'email', autocomplete: 'email', placeholder: 'name@beispiel.de', required: true });
    const msg = el('div');
    const f = el('form', { class: 'liste', onsubmit: async (e) => { e.preventDefault(); msg.replaceChildren(); try { const r = await api('/api/anmelden/link', { email: mail.value }); msg.append(hinweis(r.text, 'ok')); } catch (x) { msg.append(hinweis(x.message, 'err')); } } },
      el('label', {}, 'E-Mail-Adresse', mail), el('div', { class: 'reihe' }, el('button', { class: 'pri', type: 'submit', text: 'Anmeldelink schicken' })), msg,
      hinweis('Sie bekommen eine Mail mit einem Link – ein Klick, und Sie sind angemeldet. Dieses Gerät bleibt 30 Tage angemeldet.'));
    return f;
  }
  function pwForm() {
    const mail = el('input', { type: 'email', autocomplete: 'username', required: true }), pw = el('input', { type: 'password', autocomplete: 'current-password', required: true });
    const code = el('input', { inputmode: 'numeric', autocomplete: 'one-time-code', maxlength: '6', placeholder: '6 Ziffern' }), codeL = el('label', { hidden: true }, 'Code aus der Authenticator-App', code);
    const msg = el('div');
    return el('form', { class: 'liste', onsubmit: async (e) => { e.preventDefault(); msg.replaceChildren(); try { const r = await api('/api/anmelden/kennwort', { email: mail.value, kennwort: pw.value, code: code.value }); if (r.code) { codeL.hidden = false; code.focus(); return; } start(); } catch (x) { msg.append(hinweis(x.message, 'err')); } } },
      el('label', {}, 'E-Mail-Adresse', mail), el('label', {}, 'Kennwort', pw), codeL, el('div', { class: 'reihe' }, el('button', { class: 'pri', type: 'submit', text: 'Anmelden' })), msg,
      hinweis('Ein Kennwort legen Sie nach der ersten Anmeldung per Link unter „Mein Konto“ fest.'));
  }
  function qrForm() {
    const box = el('div', { class: 'liste' }, hinweis('Mit dem Handy, auf dem Sie schon angemeldet sind, den Code scannen und die Anmeldung erlauben.'));
    const los = el('button', { class: 'pri', type: 'button', text: 'QR-Code anzeigen', onclick: async () => {
      try {
        const r = await api('/api/qr/neu', {}); los.remove(); box.append(svgBild(r.svg), hinweis('Wartet auf Ihr Handy … (gilt 5 Minuten)'));
        clearInterval(qrPoll);
        qrPoll = setInterval(async () => { try { const s = await api('/api/qr/' + r.token); if (s.fertig) { clearInterval(qrPoll); start(); } } catch (x) { clearInterval(qrPoll); box.append(hinweis(x.message, 'err')); } }, 2000);
      } catch (x) { box.append(hinweis(x.message, 'err')); }
    } });
    box.append(los);
    return box;
  }
  function codeSeite() {
    const code = el('input', { inputmode: 'numeric', autocomplete: 'one-time-code', maxlength: '6', placeholder: '6 Ziffern' }), msg = el('div');
    M.replaceChildren(el('form', { class: 'card', onsubmit: async (e) => { e.preventDefault(); msg.replaceChildren(); try { await api('/api/anmelden/code', { code: code.value }); history.replaceState(null, '', '/'); start(); } catch (x) { msg.append(hinweis(x.message, 'err')); } } },
      el('h1', { text: 'Noch ein Schritt' }), el('label', {}, 'Code aus Ihrer Authenticator-App', code), el('div', { class: 'reihe' }, el('button', { class: 'pri', type: 'submit', text: 'Bestätigen' })), msg));
    code.focus();
  }
  function qrErlauben(token) {
    kopf();
    const msg = el('div');
    M.replaceChildren(el('div', { class: 'card' }, el('h1', { text: 'Am PC anmelden?' }), hinweis(`Angemeldet als ${ICH.konto.name || ICH.konto.email}. Erlauben Sie die Anmeldung nur, wenn Sie selbst gerade am PC sitzen.`),
      el('div', { class: 'reihe' }, el('button', { class: 'pri', type: 'button', text: 'Erlauben', onclick: async (e) => { e.target.disabled = true; try { await api(`/api/qr/${token}/erlauben`, {}); msg.replaceChildren(hinweis('Erledigt – der PC ist gleich angemeldet.', 'ok')); } catch (x) { msg.replaceChildren(hinweis(x.message, 'err')); } } }),
        el('button', { type: 'button', text: 'Nein', onclick: () => { location.href = '/'; } })), msg));
  }

  // ---------- angemeldet ----------
  function kopf() {
    K.replaceChildren(el('span', { text: ICH.konto.name || ICH.konto.email }), el('button', { type: 'button', text: 'Mein Konto', onclick: konto }),
      el('button', { type: 'button', text: 'Abmelden', onclick: async () => { await api('/api/abmelden', {}).catch(() => {}); location.href = '/'; } }));
  }
  const ARTEN = { gebaeude: 'Gebäude', tagesbericht: 'Bautagebuch', termine: 'Termine', rechnung: 'Rechnungen', kosten: 'Kosten', maengel: 'Mängel', plan: 'Pläne', foto: 'Fotos', info: 'Informationen' };
  /* Startseite je Projekt (A1, 17.11.2026): Titelbild (Foto oder Zeichnung), „Wo stehen wir?“ (Bauphasen), Kacheln je Bereich mit „neu“,
     „Neu seit Ihrem letzten Besuch“, Ansprechperson – am Handy alles untereinander */
  const IKON = { gebaeude: '🏠', tagesbericht: '📓', termine: '📅', rechnung: '🧾', kosten: '💶', maengel: '⚠️', plan: '📐', foto: '📷', info: 'ℹ️' };
  function uebersicht() {
    M.classList.remove('breit');
    history.replaceState(null, '', '/');
    kopf(); PA = null;
    if (!ICH.projekte.length) { M.replaceChildren(el('div', { class: 'card' }, el('h1', { text: 'Willkommen' }), hinweis(T('Für Sie ist noch kein Projekt freigegeben. Sobald das Büro etwas freigibt, steht es hier.', 'Für dich ist noch kein Projekt freigegeben. Sobald das Büro etwas freigibt, steht es hier.')))); return; }
    M.replaceChildren(...ICH.projekte.map(projektKarte));
  }
  function phasenBand(P) {
    const heute = new Date().toISOString().slice(0, 10);
    const st = (x) => (x.bis < heute ? 'f' : x.von <= heute ? 'a' : '');
    const akt = P.find((x) => st(x) === 'a'), naechst = P.find((x) => x.von > heute);
    const pct = (x) => { const a = new Date(x.von), b = new Date(x.bis), h = new Date(heute); return Math.max(5, Math.min(95, Math.round((h - a) / Math.max(1, b - a) * 100))); };
    return el('div', { class: 'phasen-w' }, el('div', { class: 'mu', text: 'Wo stehen wir?' }),
      el('div', { class: 'phasen' }, ...P.map((x) => { const s = st(x), bar = el('i');
        if (s === 'a') bar.style.setProperty('--p', pct(x) + '%');
        return el('div', { class: s, title: `${x.n}: ${datum(x.von)} – ${datum(x.bis)}` }, bar, el('span', { text: x.n })); })),
      el('div', { class: 'mu hin', text: akt ? `${akt.n} bis ${datum(akt.bis)}` + (naechst ? ` · danach ${naechst.n} ab ${datum(naechst.von)}` : '') : naechst ? `Als Nächstes: ${naechst.n} ab ${datum(naechst.von)}` : P.every((x) => st(x) === 'f') ? 'Alle Bauphasen abgeschlossen.' : '' }));
  }
  function projektKarte(p) {
    PA = p;
    const K = p.kopf || {}, arten = [...new Set(p.pakete.map((x) => x.art))], neu = p.pakete.filter((x) => x.neu);
    const held = el('div', { class: 'held' + (K.bild ? '' : ' ohne') }, K.bild ? el('img', { src: K.bild, alt: K.bild_text || '' }) : null,
      el('div', { class: 'held-t' }, el('h1', { text: p.name }), K.bild_text ? el('span', { text: K.bild_text }) : null));
    const kach = el('div', { class: 'kach' }, ...arten.map((a) => { const L = p.pakete.filter((x) => x.art === a), n = L.filter((x) => x.neu).length;
      return el('button', { type: 'button', onclick: () => bereichZeigen(p, a) }, el('span', { class: 'ik', text: IKON[a] || '•' }), el('span', { text: ARTEN[a] || a || 'Weitere' }),
        el('b', { text: String(L.length) }), n ? el('em', { text: `${n} neu` }) : null); }),
      p.upload ? el('button', { type: 'button', onclick: () => formZeigen(p, hochladenForm(p)) }, el('span', { class: 'ik', text: '⬆️' }), el('span', { text: 'Datei senden' })) : null,
      p.nachricht ? el('button', { type: 'button', onclick: () => formZeigen(p, nachrichtForm(p)) }, el('span', { class: 'ik', text: '✉️' }), el('span', { text: 'Nachricht' })) : null);
    const feed = neu.length ? el('div', { class: 'feed' }, el('div', { class: 'mu', text: T('Neu seit Ihrem letzten Besuch', 'Neu seit deinem letzten Besuch') }),
      ...neu.slice(0, 6).map((x) => el('button', { type: 'button', class: 'pk', onclick: () => zeigePaket(p, x) }, el('span', { text: `${IKON[x.art] || '•'} ${x.titel || 'Ohne Titel'}` }), el('small', { text: datum(x.stand) }))))
      : p.pakete.length ? el('div', { class: 'feed' }, el('div', { class: 'mu', text: 'Zuletzt freigegeben' }),
        ...p.pakete.slice(0, 3).map((x) => el('button', { type: 'button', class: 'pk', onclick: () => zeigePaket(p, x) }, el('span', { text: `${IKON[x.art] || '•'} ${x.titel || 'Ohne Titel'}` }), el('small', { text: datum(x.stand) }))))
        : hinweis('Noch nichts freigegeben.');
    const A = K.ansprech, an = A ? el('div', { class: 'an' }, el('span', { class: 'ik', text: '👷' }), el('div', {}, el('b', { text: T('Ihre Ansprechperson: ', 'Deine Ansprechperson: ') + A.name }), A.funktion ? el('div', { class: 'mu', text: A.funktion }) : null,
      el('div', { class: 'reihe' }, A.tel ? el('a', { href: 'tel:' + A.tel.replace(/[^\d+]/g, ''), text: '☎ ' + A.tel }) : null, A.mail ? el('a', { href: 'mailto:' + A.mail, text: '✉ ' + A.mail }) : null))) : null;
    const gruss = AUS().gruss ? el('p', { class: 'gruss', text: AUS().gruss }) : null;
    return el('section', { class: 'card bh-p' }, held, el('div', { class: 'bh-pb' }, gruss, K.phasen && K.phasen.length ? phasenBand(K.phasen) : null, kach, feed, an));
  }
  /* Bereiche (entschieden am 17.11.2026, Entwurf „Bauherrenportal: Ansichten“): Fotos als Raster nach Tagen mit großer Ansicht, Pläne als Karten mit
     Vorschaubild, Bautagebuch als Zeitleiste, Informationen als Karten, Rechnungen und Mängel mit Status-Schild. Die Karte je Paket (Text, Wetter,
     Index, Status, Vorschaubilder) stellt der Kern beim Freigeben zusammen (bpcore/bauherren_karte.py) – hier wird nur gezeigt. */
  const furl = (p, x, nr) => `/api/datei/${encodeURIComponent(p.pid)}/${encodeURIComponent(x.id)}/${nr}?v=${encodeURIComponent(x.v || x.stand || '')}`;
  const tagLang = (s) => { const d = new Date(String(s).slice(0, 10) + 'T12:00'); return isNaN(d) ? datum(s) : d.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }); };
  const tagKurz = (s) => { const d = new Date(String(s).slice(0, 10) + 'T12:00'); return isNaN(d) ? datum(s) : d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' }); };
  const neuChip = (x) => (x.neu ? el('em', { class: 'neu', text: 'neu' }) : null);
  const vorschau = (p, x, b, alt) => el('img', { src: furl(p, x, b.v), alt: alt || b.t || x.titel || '', loading: 'lazy', decoding: 'async' });
  function bereichZeigen(p, a) {
    PA = p; M.classList.remove('breit');
    const L = p.pakete.filter((x) => x.art === a);
    const inhalt = a === 'foto' ? fotos(p, L) : a === 'plan' ? plaene(p, L) : a === 'tagesbericht' ? berichte(p, L) : a === 'info' ? infos(p, L)
      : a === 'rechnung' || a === 'maengel' ? statusListe(p, L) : el('div', { class: 'liste' }, ...L.map((x) => el('button', { type: 'button', class: 'pk', onclick: () => zeigePaket(p, x) },
        el('span', { text: x.titel || 'Ohne Titel' }), neuChip(x), el('small', { text: datum(x.stand) }))));
    M.replaceChildren(el('div', { class: 'card' }, el('div', { class: 'reihe' }, el('button', { type: 'button', text: '← Zurück', onclick: uebersicht }), el('span', { class: 'mu', text: p.name })),
      el('h1', { text: ARTEN[a] || a }), inhalt));
  }
  // Fotos: Raster nach Tagen, antippen → groß (wischen, ‹ ›), Bildunterschrift, Herunterladen
  function fotos(p, L) {
    const alle = [], tage = new Map();
    L.forEach((x) => { const k = String(x.stand || '').slice(0, 10); if (!tage.has(k)) tage.set(k, []); tage.get(k).push(x); });
    const box = el('div', { class: 'fotos' });
    for (const [tag, X] of tage) {
      const raster = el('div', { class: 'raster' });
      X.forEach((x) => { const B = (x.karte && x.karte.bilder) || [];
        if (!B.length) raster.append(el('button', { type: 'button', class: 'ohne', onclick: () => zeigePaket(p, x), text: '📷 ' + (x.titel || 'Fotos') }));
        B.forEach((b) => { const n = alle.push({ p, x, b }) - 1; raster.append(el('button', { type: 'button', 'aria-label': 'Foto groß ansehen', onclick: () => gross(alle, n) }, vorschau(p, x, b))); }); });
      box.append(el('div', { class: 'tag' }, el('span', { text: tagLang(tag) }), el('span', { class: 'mu', text: ' – ' + [...new Set(X.map((x) => x.titel).filter(Boolean))].join(' · ') }), X.some((x) => x.neu) ? el('em', { class: 'neu', text: 'neu' }) : null), raster);
    }
    return L.length ? box : hinweis('Noch keine Fotos.');
  }
  function gross(alle, n) {
    let i = n, x0 = null;
    const bild = el('img', { alt: '' }), unter = el('div', { class: 'lb-u' }), lade = el('a', { class: 'lb-k', text: 'Herunterladen', download: '' });
    const zeig = () => { const f = alle[i]; bild.src = furl(f.p, f.x, f.b.g); bild.alt = f.b.t || f.x.titel || 'Foto'; lade.href = bild.src;
      unter.replaceChildren(el('b', { text: f.b.t || f.x.titel || '' }), el('span', { class: 'mu', text: ` · ${datum(f.x.stand)} · ${i + 1} von ${alle.length}` })); };
    const weiter = (d) => { i = (i + d + alle.length) % alle.length; zeig(); };
    const zu = () => { lb.remove(); document.removeEventListener('keydown', taste); };
    const taste = (e) => { if (e.key === 'ArrowRight') weiter(1); else if (e.key === 'ArrowLeft') weiter(-1); else if (e.key === 'Escape') zu(); };
    const lb = el('div', { class: 'lb', role: 'dialog', 'aria-label': 'Foto' },
      el('button', { type: 'button', class: 'lb-x', 'aria-label': 'Schließen', text: '✕', onclick: zu }),
      alle.length > 1 ? el('button', { type: 'button', class: 'lb-l', 'aria-label': 'Voriges Foto', text: '‹', onclick: () => weiter(-1) }) : null,
      el('div', { class: 'lb-b', ontouchstart: (e) => { x0 = e.touches[0].clientX; }, ontouchend: (e) => { if (x0 == null) return; const d = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(d) > 50) weiter(d < 0 ? 1 : -1); } }, bild),
      alle.length > 1 ? el('button', { type: 'button', class: 'lb-r', 'aria-label': 'Nächstes Foto', text: '›', onclick: () => weiter(1) }) : null,
      el('div', { class: 'lb-f' }, unter, lade));
    document.body.append(lb); document.addEventListener('keydown', taste); zeig();
  }
  // Pläne: Karten mit Vorschaubild, Index, Maßstab, Datum; frühere Indizes klein darunter
  function plaene(p, L) {
    const plan = (x) => String(x.titel || '').replace(/\s+[–-]\s+Index\s+\S+\s*$/i, '');
    const G = new Map(); L.forEach((x) => { const k = plan(x); if (!G.has(k)) G.set(k, []); G.get(k).push(x); });
    const karten = [...G.entries()].map(([name, X]) => { const x = X[0], K = x.karte || {}, b = (K.bilder || [])[0];
      const idx = K.index || ((String(x.titel).match(/Index\s+(\S+)\s*$/i) || [])[1] || '');
      return el('div', { class: 'pkarte' }, el('button', { type: 'button', class: 'pk-b', onclick: () => zeigePaket(p, x) },
        b ? vorschau(p, x, b, name) : el('span', { class: 'pk-ohne', text: '📐' }),
        el('span', { class: 'pk-t' }, el('b', { text: name || 'Plan' }), neuChip(x)),
        el('small', { class: 'mu', text: [idx ? 'Index ' + idx : '', K.massstab || '', datum(x.stand)].filter(Boolean).join(' · ') })),
        X.length > 1 ? el('small', { class: 'mu pk-alt' }, 'frühere Stände: ', ...X.slice(1).map((y) => el('button', { type: 'button', class: 'lnk', text: (y.karte && y.karte.index) || datum(y.stand), onclick: () => zeigePaket(p, y) }))) : null); });
    return L.length ? el('div', { class: 'pkarten' }, ...karten) : hinweis('Noch keine Pläne.');
  }
  // Bautagebuch: Zeitleiste je Tag – Datum, Wetter, Text, bis zu 3 Fotos, Bericht als PDF
  function berichte(p, L) {
    return L.length ? el('div', { class: 'zeitl' }, ...L.map((x) => { const K = x.karte || {}, B = (K.bilder || []).slice(0, 3), alle = B.map((b) => ({ p, x, b }));
      return el('div', { class: 'zl' + (x.neu ? ' neu' : '') }, el('div', { class: 'zl-d' }, el('b', { text: tagKurz(x.stand) }), K.wetter ? el('small', { class: 'mu', text: K.wetter }) : null),
        el('div', { class: 'zl-i' }, el('div', {}, el('span', { text: K.text || x.titel || '' }), ' ', neuChip(x)),
          B.length ? el('div', { class: 'zl-f' }, ...B.map((b, n) => el('button', { type: 'button', 'aria-label': 'Foto groß ansehen', onclick: () => gross(alle, n) }, vorschau(p, x, b)))) : null,
          el('button', { type: 'button', class: 'lnk', text: 'Bericht als PDF öffnen', onclick: () => zeigePaket(p, x) }))); })) : hinweis('Noch keine Berichte.');
  }
  // Informationen: Karten mit Überschrift, Text, Datum; ungelesen hervorgehoben; Anhang ansehen
  function infos(p, L) {
    return L.length ? el('div', { class: 'liste' }, ...L.map((x) => { const K = x.karte || {}, rest = String(K.text || '').startsWith(x.titel || '\u0000') ? String(K.text).slice(String(x.titel).length).trim() : (K.text || '');
      return el('div', { class: 'info' + (x.neu ? ' neu' : '') }, el('div', { class: 'info-k' }, el('b', { text: x.titel || 'Information' }), el('small', { class: 'mu', text: datum(x.stand) })),
        rest ? el('div', { class: 'text', text: rest }) : null,
        (K.bilder || []).length ? el('button', { type: 'button', class: 'lnk', text: '📎 Anhang ansehen', onclick: () => zeigePaket(p, x) }) : null); })) : hinweis('Noch keine Informationen.');
  }
  // Rechnungen und Mängel: Liste mit Status-Schild (grün erledigt/geprüft, grau offen, rot fällig)
  function statusListe(p, L) {
    const heute = new Date().toISOString().slice(0, 10);
    return L.length ? el('div', { class: 'liste' }, ...L.map((x) => { const S = (x.karte && x.karte.status) || null, faellig = S && S.ton !== 'ok' && S.frist && S.frist < heute;
      return el('button', { type: 'button', class: 'pk', onclick: () => zeigePaket(p, x) }, el('span', { text: x.titel || 'Ohne Titel' }), neuChip(x),
        S ? el('span', { class: 'schild ' + (faellig ? 'faellig' : S.ton), text: S.text + (S.frist && S.ton !== 'ok' ? ' · bis ' + datum(S.frist) : '') }) : null, el('small', { text: datum(x.stand) })); })) : hinweis('Noch nichts freigegeben.');
  }
  /* PDF im Portal ansehen (pdf.js aus /static/pdfjs, wie im Büro) – zoomen mit − / + / Breite; Herunterladen daneben */
  let PDFJS = null;
  const pdfjs = () => (PDFJS = PDFJS || import('/static/pdfjs/pdf.mjs').then((m) => { m.GlobalWorkerOptions.workerSrc = '/static/pdfjs/pdf.worker.mjs'; return m; }));
  function pdfAnsicht(url, name) {
    const seiten = el('div', { class: 'pdfs' }), stufe = el('span', { class: 'mu', text: '100 %' });
    let zoom = 1, doc = null, lauf = 0;
    const zeichnen = async () => {
      if (!doc) return; const mein = ++lauf, w = Math.max(280, seiten.clientWidth - 4), dpr = Math.min(2, window.devicePixelRatio || 1);
      stufe.textContent = Math.round(zoom * 100) + ' %'; seiten.replaceChildren();
      for (let n = 1; n <= doc.numPages && mein === lauf; n++) {
        const pg = await doc.getPage(n), v1 = pg.getViewport({ scale: 1 }), sc = (w / v1.width) * zoom, f = Math.min(dpr, Math.sqrt(16e6 / (v1.width * v1.height * sc * sc)));
        const vp = pg.getViewport({ scale: sc * f }), cv = el('canvas', { 'aria-label': `Seite ${n}` });
        cv.width = Math.floor(vp.width); cv.height = Math.floor(vp.height); cv.style.width = Math.floor(vp.width / f) + 'px'; seiten.append(cv);
        await pg.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
      }
    };
    const box = el('div', { class: 'pdfv' }, el('div', { class: 'reihe' },
      el('button', { type: 'button', 'aria-label': 'Verkleinern', text: '−', onclick: () => { zoom = Math.max(0.5, zoom / 1.4); zeichnen(); } }), stufe,
      el('button', { type: 'button', 'aria-label': 'Vergrößern', text: '+', onclick: () => { zoom = Math.min(6, zoom * 1.4); zeichnen(); } }),
      el('button', { type: 'button', text: 'Breite', onclick: () => { zoom = 1; zeichnen(); } }),
      el('a', { class: 'pk-dl', href: url, download: name || '', text: 'Herunterladen' })), seiten);
    Promise.all([pdfjs(), fetch(url, { credentials: 'same-origin' }).then((r) => { if (!r.ok) throw new Error(); return r.arrayBuffer(); })])
      .then(([lib, data]) => lib.getDocument({ data, isEvalSupported: false, disableFontFace: true }).promise).then((d) => { doc = d; zeichnen(); })
      .catch(() => seiten.replaceChildren(el('a', { class: 'pk', href: url, target: '_blank', rel: 'noopener', text: (name || 'PDF') + ' öffnen' })));
    return box;
  }
  function formZeigen(p, f) {
    PA = p;
    M.replaceChildren(el('div', { class: 'card' }, el('div', { class: 'reihe' }, el('button', { type: 'button', text: '← Zurück', onclick: uebersicht }), el('span', { class: 'mu', text: p.name })), f));
  }
  /* Dateien ans Büro (Bereich „Dateien hochladen“): PDF, Bilder, Word/Excel bis 50 MB – der Kern holt sie ab und legt sie in den Projektordner */
  function hochladenForm(p) {
    const f = el('input', { type: 'file', accept: '.pdf,.jpg,.jpeg,.png,.webp,.heic,.doc,.docx,.xls,.xlsx,image/*,application/pdf' });
    const t = el('input', { type: 'text', maxlength: '2000', placeholder: 'Kurz dazu (z. B. „Angebot Küche“)' }), msg = el('div'), liste = el('div', { class: 'liste' });
    const zeigListe = async () => { try { const L = await api(`/api/hochgeladen/${encodeURIComponent(p.pid)}`);
      liste.replaceChildren(...L.map((x) => el('small', { class: 'mu', text: `${x.name} – ${new Date(x.zeit * 1000).toLocaleDateString('de-DE')} ${x.angekommen ? '✓ beim Büro angekommen' : '· wird abgeholt'}` }))); } catch { /* ohne Liste */ } };
    const knopf = el('button', { class: 'pri', type: 'submit', text: 'Senden' });
    const form = el('form', { class: 'liste', onsubmit: async (e) => {
      e.preventDefault(); msg.replaceChildren();
      if (!f.files.length) { msg.append(hinweis('Bitte eine Datei wählen.', 'err')); return; }
      const fd = new FormData(); fd.append('pid', p.pid); fd.append('text', t.value); fd.append('datei', f.files[0]);
      knopf.disabled = true; msg.append(hinweis('Wird hochgeladen …'));
      try {
        const r = await fetch('/api/hochladen', { method: 'POST', credentials: 'same-origin', headers: { 'X-BH': '1' }, body: fd }), j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || 'Das ging gerade nicht.');
        f.value = ''; t.value = ''; msg.replaceChildren(hinweis(j.text, 'ok')); zeigListe();
      } catch (x) { msg.replaceChildren(hinweis(x.message, 'err')); } finally { knopf.disabled = false; }
    } }, el('h3', { text: 'Dateien ans Büro senden' }), el('label', {}, 'Datei oder Foto', f), el('label', {}, 'Kurz dazu', t),
      el('div', { class: 'reihe' }, knopf), msg, hinweis('PDF, Bilder (JPG, PNG, HEIC) oder Word/Excel – bis 50 MB je Datei.'), liste);
    zeigListe();
    return form;
  }
  const datum = (s) => { if (!s) return ''; const d = new Date(s); return isNaN(d) ? s : d.toLocaleDateString('de-DE'); };
  function nachrichtForm(p) {
    const t = el('textarea', { placeholder: 'Ihre Nachricht an das Büro …', maxlength: '5000' }), msg = el('div');
    return el('form', { class: 'liste', onsubmit: async (e) => { e.preventDefault(); msg.replaceChildren(); try { const r = await api('/api/nachricht', { pid: p.pid, text: t.value }); t.value = ''; msg.append(hinweis(r.text, 'ok')); } catch (x) { msg.append(hinweis(x.message, 'err')); } } },
      el('h3', { text: 'Nachricht an das Büro' }), hinweis(T('Wir melden uns so schnell wie möglich bei Ihnen.', 'Wir melden uns so schnell wie möglich bei dir.')), t, el('div', { class: 'reihe' }, el('button', { class: 'pri', type: 'submit', text: 'Senden' })), msg);
  }
  async function zeigePaket(p, x) {
    let d; try { d = await api(`/api/paket/${encodeURIComponent(p.pid)}/${encodeURIComponent(x.id)}`); } catch (e) { return; }
    const D = d.daten || {}, teile = [];
    M.classList.toggle('breit', !!(D.zeitplan && D.zeitplan.zeilen) || x.art === 'plan');   // Balkenplan und Pläne brauchen die ganze Breite
    if (D.text) teile.push(el('div', { class: 'text', text: String(D.text) }));
    if (D.zeitplan && Array.isArray(D.zeitplan.zeilen) && D.zeitplan.zeilen.length) {   // Bauzeitenplan als Balken – derselbe Baustein wie die Link-Ansicht (/static/zeitplan.js)
      const f = el('div', { class: 'zplan' }); teile.push(f);
      const los = () => window.bpZeitplan.mount(f, D.zeitplan, { leiste: true });
      if (window.bpZeitplan) setTimeout(los); else document.head.append(el('script', { src: '/static/zeitplan.js', onload: los }));
    } else if (Array.isArray(D.zeilen) && D.zeilen.length) teile.push(el('div', { class: 'tw' }, el('table', {}, ...D.zeilen.map((z) => el('tr', {}, ...(Array.isArray(z) ? z : [z]).map((v, i) => el(i ? 'td' : 'th', { text: String(v ?? '') })))))));
    if (Array.isArray(D.liste) && D.liste.length) teile.push(el('ul', {}, ...D.liste.map((v) => el('li', { text: String(v) }))));
    const DT = Array.isArray(D.dateien) ? D.dateien.filter((f) => !String(f.name || '').startsWith('vorschau-')) : [];   // Vorschaubilder nur für die Listen
    if (DT.length) {   // PDFs/Bilder des Büros (Pläne, Rechnungen, Tagesbericht): PDFs im Portal ansehen, Bilder groß
      const url = (f) => furl(p, x, f.nr);
      teile.push(el('div', { class: 'liste' }, ...DT.map((f) => /^image\//.test(f.mime)
        ? el('figure', {}, el('img', { src: url(f), alt: f.name || '' }), el('figcaption', { class: 'mu hin', text: f.name || '' }))
        : pdfAnsicht(url(f), f.name))));
    }
    if (D.netz && Array.isArray(D.netz.e) && D.netz.e.length) {   // Gebäude: 3D-Ansicht (derselbe Betrachter wie im Büro, /static/ansicht3d.js)
      const f = el('div', { class: 'd3' }); teile.unshift(f);
      const los = () => window.bp3d.mount(f, { netz: D.netz, zeilen: D.netz_zeilen || [] });
      if (window.bp3d) setTimeout(los); else document.head.append(el('script', { src: '/static/ansicht3d.js', onload: los }));
    }
    if (Array.isArray(D.bilder) && D.bilder.length) teile.push(el('div', { class: 'bilder' }, ...D.bilder.filter((b) => /^data:image\/(jpeg|png|webp);base64,/.test(b.src || '')).map((b) => el('figure', {}, el('img', { src: b.src, alt: b.titel || '' }), b.titel ? el('figcaption', { class: 'mu hin', text: b.titel }) : null))));
    M.replaceChildren(el('div', { class: 'card' }, el('div', { class: 'reihe' }, el('button', { type: 'button', text: '← Zurück', onclick: uebersicht }), el('span', { class: 'mu', text: p.name })),
      el('h1', { text: d.titel || '' }), d.stand ? hinweis('Stand ' + datum(d.stand)) : null, ...(teile.length ? teile : [hinweis('Kein Inhalt.')])));
  }

  // ---------- Konto ----------
  function konto() {
    const k = ICH.konto, msg = el('div');
    const pw = el('input', { type: 'password', autocomplete: 'new-password', minlength: '10' });
    const zfa = el('div', { class: 'liste' });
    const zfaZeig = () => {
      if (k.zfa) {
        const c = el('input', { inputmode: 'numeric', maxlength: '6', placeholder: 'Code' });
        zfa.replaceChildren(hinweis('Zweiter Faktor ist eingeschaltet.', 'ok'), el('div', { class: 'reihe' }, c, el('button', { type: 'button', text: 'Ausschalten', onclick: async () => { try { await api('/api/konto/2fa/aus', { code: c.value }); k.zfa = false; zfaZeig(); } catch (x) { zfa.append(hinweis(x.message, 'err')); } } })));
      } else zfa.replaceChildren(hinweis('Mit einer Authenticator-App (z. B. Google Authenticator, Microsoft Authenticator) wird die Anmeldung noch sicherer.'),
        el('div', { class: 'reihe' }, el('button', { type: 'button', text: 'Einrichten', onclick: async () => {
          const r = await api('/api/konto/2fa/start', {}), c = el('input', { inputmode: 'numeric', maxlength: '6', placeholder: '6 Ziffern' });
          zfa.replaceChildren(hinweis('Den Code mit der App scannen und die angezeigte Zahl eintragen:'), svgBild(r.svg), el('small', { class: 'mu', text: 'oder von Hand: ' + r.geheim }),
            el('div', { class: 'reihe' }, c, el('button', { class: 'pri', type: 'button', text: 'Bestätigen', onclick: async () => { try { await api('/api/konto/2fa/bestaetigen', { code: c.value }); k.zfa = true; zfaZeig(); } catch (x) { zfa.append(hinweis(x.message, 'err')); } } })));
        } })));
    };
    zfaZeig();
    const handy = el('div', { class: 'liste' }, hinweis('Mit dem Handy diesen Code scannen – dann ist das Handy angemeldet (gilt 5 Minuten, nur einmal).'),
      el('div', { class: 'reihe' }, el('button', { type: 'button', text: 'Handy koppeln', onclick: async (e) => { const r = await api('/api/koppeln', {}); e.target.replaceWith(svgBild(r.svg)); } })));
    M.replaceChildren(el('div', { class: 'card' }, el('div', { class: 'reihe' }, el('button', { type: 'button', text: '← Zurück', onclick: uebersicht })), el('h1', { text: 'Mein Konto' }), hinweis(k.email),
      el('h2', { text: k.kennwort ? 'Kennwort ändern' : 'Kennwort festlegen' }),
      el('form', { class: 'reihe', onsubmit: async (e) => { e.preventDefault(); msg.replaceChildren(); try { await api('/api/konto/kennwort', { neu: pw.value }); pw.value = ''; k.kennwort = true; msg.append(hinweis('Gespeichert.', 'ok')); } catch (x) { msg.append(hinweis(x.message, 'err')); } } }, pw, el('button', { class: 'pri', type: 'submit', text: 'Speichern' })), msg,
      el('h2', { text: 'Zweiter Faktor' }), zfa, el('h2', { text: 'Handy anmelden' }), handy));
  }

  start();
})();
