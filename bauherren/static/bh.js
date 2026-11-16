'use strict';
/* Bauherrenportal – Oberfläche. Nur Text aus den Paketen (textContent), Bilder nur als data:-Adresse, kein HTML aus dem Büro.
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
  let ICH = null, qrPoll = null;

  async function start() {
    try { ICH = await api('/api/ich'); } catch { ICH = { angemeldet: false }; }
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
  function uebersicht() {
    history.replaceState(null, '', '/');
    kopf();
    if (!ICH.projekte.length) { M.replaceChildren(el('div', { class: 'card' }, el('h1', { text: 'Willkommen' }), hinweis('Für Sie ist noch kein Projekt freigegeben. Sobald das Büro etwas freigibt, steht es hier.'))); return; }
    M.replaceChildren(...ICH.projekte.map((p) => {
      const arten = [...new Set(p.pakete.map((x) => x.art))];
      return el('section', { class: 'card' }, el('h1', { text: p.name }),
        p.pakete.length ? arten.map((a) => el('div', { class: 'liste' }, el('div', { class: 'art', text: ARTEN[a] || a || 'Weitere' }),
          ...p.pakete.filter((x) => x.art === a).map((x) => el('button', { type: 'button', class: 'pk', onclick: () => zeigePaket(p, x) }, el('span', { text: x.titel || 'Ohne Titel' }), el('small', { text: datum(x.stand) })))))
          : hinweis('Noch nichts freigegeben.'),
        p.upload ? hochladenForm(p) : null, p.nachricht ? nachrichtForm(p) : null);
    }));
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
      el('h3', { text: 'Nachricht an das Büro' }), t, el('div', { class: 'reihe' }, el('button', { class: 'pri', type: 'submit', text: 'Senden' })), msg);
  }
  async function zeigePaket(p, x) {
    let d; try { d = await api(`/api/paket/${encodeURIComponent(p.pid)}/${encodeURIComponent(x.id)}`); } catch (e) { return; }
    const D = d.daten || {}, teile = [];
    if (D.text) teile.push(el('div', { class: 'text', text: String(D.text) }));
    if (Array.isArray(D.zeilen) && D.zeilen.length) teile.push(el('div', { class: 'tw' }, el('table', {}, ...D.zeilen.map((z) => el('tr', {}, ...(Array.isArray(z) ? z : [z]).map((v, i) => el(i ? 'td' : 'th', { text: String(v ?? '') })))))));
    if (Array.isArray(D.liste) && D.liste.length) teile.push(el('ul', {}, ...D.liste.map((v) => el('li', { text: String(v) }))));
    if (Array.isArray(D.dateien) && D.dateien.length) {   // PDFs/Bilder des Büros (Pläne, Rechnungen, Tagesbericht)
      const url = (f) => `/api/datei/${encodeURIComponent(p.pid)}/${encodeURIComponent(x.id)}/${f.nr}`;
      teile.push(el('div', { class: 'liste' }, ...D.dateien.map((f) => /^image\//.test(f.mime)
        ? el('figure', {}, el('img', { src: url(f), alt: f.name || '' }), el('figcaption', { class: 'mu hin', text: f.name || '' }))
        : el('a', { class: 'pk', href: url(f), target: '_blank', rel: 'noopener' }, el('span', { text: (f.name || 'PDF') + ' öffnen' }), el('small', { text: f.groesse ? Math.max(1, Math.round(f.groesse / 1048576)) + ' MB' : '' })))));
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
