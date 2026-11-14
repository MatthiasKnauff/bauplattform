/* Kontaktmaske und Kontaktfeld – dieselben in jeder App und in „Adressen“ (/bp/kontakt.js, erst bei Bedarf geladen über BPHead.kontaktMaske / BPHead.kontaktFeld).
   bpKontakt(vor, opt) → Promise<Kontakt | null>
     vor   { id } bzw. ganzer Kontakt (vorhandener) oder { name, trade, … } (neuer)
     opt.basis       Präfix der Adressen (z. B. '' oder 'bt/')
     opt.speichern   async (daten, neu) → Kontakt   (Vorgabe: /api/bp/kontakte)
     opt.loeschen    async (kontakt) → …            (nur dann gibt es „Löschen“)
     opt.info        HTML unter den Feldern (z. B. „kommt in 3 Einträgen vor“)
     opt.grundstueck true: Feld Grundstück (Baustellenadressen)
     opt.verlaufAuf  true: Benachrichtigungsverlauf gleich aufgeklappt
     opt.voll        true: vor ist schon der ganze Kontakt (nicht neu laden) · opt.vorschlag  Adresse der Netz-Vorschläge
   Oben: Anrufen, Mobil, E-Mail (Outlook oder Schreiben aus der Plattform), Route, Ins Handy; Karte; weitere Nummern, Mails,
   Anschriften und Ansprechpartner; neu: Vorschläge aus dem Netz zum Namen. */
(() => {
  if (window.bpKontakt) return;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const KX = (u, o = {}) => fetch(u, { credentials: 'same-origin', ...o }).then(async (r) => { const j = await r.json().catch(() => ({})); if (!r.ok || j.error) { const e = new Error(j.error || 'Fehler ' + r.status); e.data = j; throw e; } return j; });
  const css = document.createElement('style');
  css.textContent = `.bph-kmk .bph-km-q{display:flex;flex-wrap:wrap;gap:.3rem;margin:0 0 .6rem}.bph-kmk .bph-km-q .bph-btn{font-size:.85em;padding:.25rem .65rem;text-decoration:none}
.bph-kmk .bph-km-map{position:relative;margin:0 0 .7rem;border-radius:calc(10px*var(--rk,1));overflow:hidden;border:1px solid var(--line,#ccc);height:150px}
.bph-kmk .bph-km-map iframe{border:0;width:100%;height:100%;display:block}
.bph-kmk .bph-km-map a{position:absolute;right:.4rem;bottom:.4rem;background:var(--card,#fff);color:var(--ink,#222);border-radius:calc(6px*var(--rk,1));padding:.1rem .5rem;font-size:.8em;text-decoration:none;box-shadow:var(--sh0,0 1px 4px rgba(0,0,0,.2))}
.bph-kmk .bph-km-info{font-size:.85em;color:var(--mute,#888);margin:.5rem 0 0}
.bph-kmk details.bph-km-bn{margin:.6rem 0 0;border:1px solid var(--line,#ccc);border-radius:calc(10px*var(--rk,1));padding:.35rem .6rem}.bph-kmk details.bph-km-bn summary{cursor:pointer}
.bph-kmk .bph-km-f{display:flex;gap:.4rem;align-items:center;flex-wrap:wrap}.bph-kmk .bph-km-sp{flex:1}
.bph-kmk .bph-km-del{color:var(--red,#c0392b);border-color:color-mix(in srgb,var(--red,#c0392b) 45%,transparent)}`;
  document.head.appendChild(css);
  const F = [['name', 'Firma / Name', 'w'], ['trade', 'Gewerk / Rolle', ''], ['role', 'Funktion', ''], ['contact_person', 'Ansprechpartner:in', 'w'],
    ['phone', 'Telefon', '', 'tel'], ['mobile', 'Mobil', '', 'tel'], ['email', 'E-Mail', '', 'email'], ['website', 'Internet', '', 'url']];
  const F2 = [['art', 'Art', 'w', '', 'Firma, Bauherr:in, Baustelle, Plotdienst – oder eine eigene Art (z. B. Behörde, Planer:in)'], ['street', 'Straße, Nr.', 'w'], ['zip', 'PLZ', ''], ['city', 'Ort', '']];
  const WT = { tel: ['☎', 'Telefon', 'z. B. Zentrale, Büro, privat'], mail: ['✉', 'E-Mail', 'z. B. Rechnungen, Buchhaltung'], adr: ['📍', 'Anschrift', 'z. B. Rechnungsanschrift, Lager'], person: ['👤', 'Ansprechpartner:in', 'Funktion, z. B. Bauleiter:in'] };
  const tel = (n) => String(n || '').replace(/[^\d+]/g, '');
  const addr = (c) => [c.street, [c.zip, c.city].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  const wtMails = (c) => [c.email, ...(c.weitere || []).flatMap((x) => (x.typ === 'mail' ? [x.wert] : x.typ === 'person' ? [x.mail] : []))].filter(Boolean);
  const wtTel = (c) => (c.weitere || []).flatMap((x) => (x.typ === 'tel' ? [[x.bez, x.wert]] : x.typ === 'person' && x.tel ? [[x.wert, x.tel]] : [])).filter((x) => x[1]);
  const wtZeile = (x, i) => {
    const v = (k) => esc(x[k] || ''), [ic, t, ph] = WT[x.typ] || WT.tel, inp = (k, pl, ty, cl) => `<input data-kwt="${i}" data-wk="${k}"${ty ? ` type="${ty}"` : ''}${cl ? ` class="${cl}"` : ''} value="${v(k)}" placeholder="${pl}" autocomplete="off" aria-label="${pl}">`;
    const f = x.typ === 'adr' ? inp('street', 'Straße, Nr.', '', 'w2') + inp('zip', 'PLZ') + inp('city', 'Ort')
      : x.typ === 'person' ? inp('wert', 'Name') + inp('bez', ph) + inp('tel', 'Telefon', 'tel') + inp('mail', 'E-Mail', 'email')
        : inp('wert', t, x.typ === 'mail' ? 'email' : 'tel', 'w2');
    return `<div class="bph-kwt-z"><div class="bph-kwt-t"><span>${ic} ${t}</span>${x.typ === 'person' ? '' : inp('bez', ph)}<button type="button" class="bph-x" data-kwtx="${i}" title="Entfernen" aria-label="Entfernen">✕</button></div><div class="bph-kwt-f">${f}</div></div>`;
  };
  const appZiel = (key) => { const H = window.BPHead, a = H && H.conf && (H.conf.apps || []).find((x) => x.key === key && x.allowed !== false); return a && H.appUrl ? H.appUrl(a) + '/' : ''; };

  window.bpKontakt = async function (vor = {}, opt = {}) {
    const B = opt.basis || '', neu = !vor.id, H = window.BPHead || {};
    if (!neu && !opt.voll) { try { const v = await KX(B + 'api/bp/kontakte?ids=' + vor.id); if (Array.isArray(v) && v[0]) vor = { ...vor, ...v[0] }; } catch { /* mit dem arbeiten, was da ist */ } }
    const c = { ...vor };
    let WTL = (c.weitere || []).map((x) => ({ ...x }));
    const sugB = opt.vorschlag || (H.app === 'bautagebuch' ? 'api/contacts/suggest' : 'api/bp/bt/contacts/suggest');   // Vorschläge aus dem Netz
    const ad = addr(c), route = ad ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(ad)}&travelmode=driving` : '';
    const vcf = neu ? '' : (H.app === 'adressen' ? '' : appZiel('adressen')) + `api/contacts/${c.id}.vcf`;
    const quick = neu ? '' : [c.phone && `<a class="bph-btn" href="tel:${esc(tel(c.phone))}">☎ Anrufen</a>`, c.mobile && `<a class="bph-btn" href="tel:${esc(tel(c.mobile))}">📱 Mobil</a>`,
      c.email && `<a class="bph-btn" href="mailto:${esc(c.email)}" data-mailwahl="${esc(c.email)}" data-firma="${esc(c.name)}" title="E-Mail – normal über Outlook oder ein Schreiben aus der Plattform">✉ E-Mail</a>`,
      ...wtTel(c).map(([b, n]) => `<a class="bph-btn" href="tel:${esc(tel(n))}">☎ ${esc(b || n)}</a>`), ...wtMails(c).slice(1).map((m) => `<a class="bph-btn" href="mailto:${esc(m)}" data-mailwahl="${esc(m)}" data-firma="${esc(c.name)}">✉ ${esc(m)}</a>`),
      route && `<a class="bph-btn" href="${esc(route)}" target="_blank" rel="noopener" title="Route in Google Maps planen">🧭 Route</a>`, (H.app === 'adressen' || appZiel('adressen')) && `<a class="bph-btn" href="${esc(vcf)}" title="Visitenkarte – ins Handy übernehmen">Ins Handy</a>`].filter(Boolean).join('');
    const feld = ([k, l, w, t, tip]) => `<label class="bph-dm-f${w ? ' bph-dm-w' : ''}"${tip ? ` title="${esc(tip)}"` : ''}><span>${l}</span><input data-kmf="${k}" type="${t || 'text'}" value="${esc(c[k] || '')}" autocomplete="off"${k === 'zip' ? ' inputmode="numeric"' : ''}></label>`;
    return new Promise((fertig) => {
      const bg = document.createElement('div'); bg.className = 'bph-dlg-bg';
      bg.innerHTML = `<div class="bph-dlg bph-dm bph-kmk" role="dialog" aria-label="Kontakt" style="width:min(640px,96vw)"><div class="bph-dlg-h"><b>${neu ? 'Neuer Kontakt' : esc(c.name || 'Kontakt')}</b><button type="button" class="bph-x" data-kmx aria-label="Schließen">✕</button></div>
        <div class="bph-dm-b">${quick ? `<div class="bph-km-q">${quick}</div>` : ''}
          ${!neu && ad ? `<div class="bph-km-map"><iframe loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Karte" src="https://www.google.com/maps?q=${encodeURIComponent(ad)}&hl=de&z=15&output=embed"></iframe><a href="${esc(route)}" target="_blank" rel="noopener">Route dorthin planen ↗</a></div>` : ''}
          <div class="bph-dm-g">${F.map(feld).join('')}
          ${neu ? '<div class="bph-dm-w bph-kmsug" data-kmsug></div>' : ''}
          <div class="bph-dm-w bph-kwt"><div data-kwtbox></div><div class="bph-kwt-add">${Object.entries(WT).map(([k, [ic]]) => `<button type="button" class="bph-btn" data-kwtadd="${k}">＋ ${ic} ${{ tel: 'weitere Nummer', mail: 'weitere E-Mail', adr: 'weitere Anschrift', person: 'Ansprechpartner:in' }[k]}</button>`).join('')}</div></div>
          ${F2.map(feld).join('')}
          <label class="bph-dm-f bph-dm-w"><span>Notizen</span><textarea data-kmf="notes" rows="2">${esc(c.notes || '')}</textarea></label></div>
          ${!neu && opt.grundstueck ? '<div class="bph-km-info"><b>Grundstück</b><div data-kmgs></div></div>' : ''}
          ${opt.info ? `<div class="bph-km-info">${opt.info}</div>` : ''}
          ${neu ? '' : '<details class="bph-km-bn" data-kmbn><summary>Benachrichtigungsverlauf <small class="bph-mu">Pläne, Mängel- und Terminrügen</small></summary><div data-kmbnh></div></details>'}</div>
        <p class="bph-err" data-kmerr></p>
        <div class="bph-row bph-km-f">${!neu && opt.loeschen ? '<button type="button" class="bph-btn bph-km-del" data-kmdel>Löschen</button>' : ''}${neu ? '' : `<button type="button" class="bph-btn" data-bph-verlauf="kontakt:${c.id}" title="Frühere Stände dieser Adresse ansehen und wiederherstellen">🕘 Verlauf</button>`}<span class="bph-km-sp" title="Dieselben Adressen in allen Apps – in „Adressen“, im Bautagebuch, im Bauzeitenplan, in der AVA …"></span><button type="button" class="bph-btn" data-kmx>Abbrechen</button><button type="button" class="bph-btn pri" data-kms>${neu ? 'Anlegen' : 'Speichern'}</button></div></div>`;
      document.body.appendChild(bg);
      const root = bg.firstChild, q = (a) => root.querySelector(a);
      let SUG = [], sT = 0, done = false, grund = null;
      const wtLesen = () => root.querySelectorAll('[data-kwt]').forEach((el) => { const x = WTL[+el.dataset.kwt]; if (x) x[el.dataset.wk] = el.value; });
      const wtZeichnen = (fokus) => { const bx = q('[data-kwtbox]'); bx.innerHTML = WTL.map(wtZeile).join(''); if (fokus) { const l = bx.querySelectorAll('.bph-kwt-z'); const i = l[l.length - 1]?.querySelector('.bph-kwt-f input'); if (i) i.focus(); } };
      wtZeichnen();
      const ende = (k) => { if (done) return; done = true; bg.remove(); document.removeEventListener('keydown', esc1, true); fertig(k || null); };
      const esc1 = (e) => { if (e.key === 'Escape' && !document.querySelector('.modal-bg')) { e.stopPropagation(); ende(null); } };
      document.addEventListener('keydown', esc1, true);
      const gs = q('[data-kmgs]');
      if (gs && H.grundstueck) KX(`${B}api/bp/kontakt/${c.id}/grundstueck`).then((G) => {
        const f = (k) => (q(`[data-kmf="${k}"]`) || {}).value || '';
        grund = H.grundstueck(gs, { werte: G.werte, klasse: 'bph-dm-g', knopf: 'bph-btn', url: B + 'api/bp/kataster', adresse: () => ({ strasse: f('street'), plz: f('zip'), ort: f('city') }) });
      }).catch(() => { gs.textContent = 'Grundstück konnte nicht geladen werden.'; });
      const bn = q('[data-kmbn]');
      if (bn && H.benachrichtigungen) {
        bn.addEventListener('toggle', () => { if (bn.open && !bn.dataset.l) { bn.dataset.l = '1'; H.benachrichtigungen(c.id, q('[data-kmbnh]')); } });
        if (opt.verlaufAuf) { bn.open = true; setTimeout(() => bn.scrollIntoView({ block: 'nearest' }), 300); }
      }
      const sug = (t) => {
        clearTimeout(sT); const box = q('[data-kmsug]'); if (!box) return; t = t.trim(); if (t.length < 3) { box.innerHTML = ''; return; }
        sT = setTimeout(async () => {
          let r = {}; try { r = await KX(B + sugB + '?q=' + encodeURIComponent(t)); } catch { return; }
          SUG = Array.isArray(r.items) ? r.items : [];
          box.innerHTML = SUG.length ? '<small class="bph-mu">Vorschläge aus dem Netz – antippen zum Übernehmen</small>' + SUG.map((x, i) => `<button type="button" class="bph-kf-o" data-kmsg="${i}"><b>${esc(x.name)}</b><small>${esc([x.trade, [x.street, [x.zip, x.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')].filter(Boolean).join(' · '))}</small></button>`).join('') : '';
        }, 350);
      };
      root.addEventListener('input', (e) => { if (neu && e.target.dataset.kmf === 'name') sug(e.target.value); });
      root.addEventListener('click', async (e) => {
        if (e.target.closest('[data-kmx]')) return ende(null);
        const wa = e.target.closest('[data-kwtadd]'); if (wa) { wtLesen(); WTL.push({ typ: wa.dataset.kwtadd }); wtZeichnen(true); return; }
        const wx = e.target.closest('[data-kwtx]'); if (wx) { wtLesen(); WTL.splice(+wx.dataset.kwtx, 1); wtZeichnen(); return; }
        const sg = e.target.closest('[data-kmsg]');
        if (sg) {
          let x = SUG[+sg.dataset.kmsg]; if (!x) return;
          if (x.osm_id) { try { x = { ...x, ...(await KX(B + sugB + `/detail?type=${encodeURIComponent(x.osm_type)}&id=${x.osm_id}`)) }; } catch { /* egal */ } }
          const set = (k, v) => { const el = q(`[data-kmf="${k}"]`); if (el && v && !el.value.trim()) el.value = v; };
          if (x.name) q('[data-kmf="name"]').value = x.name;
          ['trade', 'street', 'zip', 'city', 'phone', 'email', 'website'].forEach((k) => set(k, x[k]));
          q('[data-kmsug]').innerHTML = '<small class="bph-mu">Übernommen – bitte prüfen.</small>'; return;
        }
        if (e.target.closest('[data-kmdel]')) {
          try { await opt.loeschen(c); ende(null); } catch (er) {
            const el = q('[data-kmerr]'); el.textContent = er.message;
            const O = (er.data && er.data.orte) || [];
            if (O.length) el.insertAdjacentHTML('beforeend', ' ' + O.map((o) => { const u = appZiel(o.app); return u ? `<a href="${esc(u + o.frag)}">↗ ${esc(o.label)}</a>` : `<span>${esc(o.label)}</span>`; }).join(' · '));
          }
          return;
        }
        if (!e.target.closest('[data-kms]')) return;
        const d = {}; root.querySelectorAll('[data-kmf]').forEach((el) => { d[el.dataset.kmf] = el.value; });
        wtLesen(); d.weitere = WTL.filter((x) => ['wert', 'street', 'city', 'tel', 'mail'].some((k) => (x[k] || '').trim()));
        if (!d.name.trim()) { q('[data-kmerr]').textContent = 'Bitte einen Namen eingeben.'; q('[data-kmf="name"]').focus(); return; }
        try {
          const k = opt.speichern ? await opt.speichern(d, neu, c)
            : (await KX(B + 'api/bp/kontakte' + (neu ? '' : '/' + c.id), { method: neu ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) })).kontakt;
          if (grund && !neu) await KX(`${B}api/bp/kontakt/${c.id}/grundstueck`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ werte: grund.werte() }) });
          if (window.toast) toast(neu ? 'Kontakt angelegt.' : 'Kontakt gespeichert.');
          ende(k || { ...c, ...d });
        } catch (er) { q('[data-kmerr]').textContent = er.message; }
      });
      const n = q('[data-kmf="name"]'); setTimeout(() => { if (!neu) return; n.focus(); n.setSelectionRange(n.value.length, n.value.length); sug(n.value); }, 30);
    });
  };

  /* Kontaktfeld: Name eintippen sucht in den Kontakten – wählen, oder „＋ als neuen Kontakt anlegen“ (dieselbe Maske wie oben).
     bpKontaktFeld(host, { wert, kid, rolle, basis, platz, setzen(kontakt | null, text) }) – verbunden zeigt es die Karte mit ✎ (bearbeiten) und × (lösen). */
  window.bpKontaktFeld = function (host, o = {}) {
    const B = o.basis || ''; let L = [], I = -1, T = 0, K = null;
    const kAdr = (k) => [addr(k), k.contact_person, k.phone || k.mobile ? '☎ ' + (k.phone || k.mobile) : '', k.email ? '✉ ' + k.email : ''].filter(Boolean).join(' · ');
    const zeichne = (fokus) => {
      host.innerHTML = K ? `<span class="bph-kf-c bph-kf-v"><span><b>${esc(K.name)}</b>${kAdr(K) ? ' · ' + esc(kAdr(K)) : ''}</span><button type="button" class="bph-btn" data-kfe title="Kontakt bearbeiten (gilt überall)">✎</button><button type="button" class="bph-btn" data-kfx title="Verbindung lösen">×</button></span>`
        : `<span class="bph-kf"><input data-kfi value="${esc(o.wert || '')}" autocomplete="off" placeholder="${esc(o.platz || 'Name eintippen – sucht in den Kontakten')}" role="combobox" aria-autocomplete="list"><span class="bph-kf-l" data-kfl hidden></span></span>`;
      if (fokus && !K) { const i = host.querySelector('[data-kfi]'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
    };
    const box = () => host.querySelector('[data-kfl]'), inp = () => host.querySelector('[data-kfi]');
    const zeigen = () => { const b = box(), t = (inp() || {}).value || ''; if (!b) return;
      b.innerHTML = L.map((x, i) => `<button type="button" class="bph-kf-o${i === I ? ' on' : ''}" data-kfw="${i}" tabindex="-1"><b>${esc(x.name)}</b><small>${esc([x.trade, kAdr(x)].filter(Boolean).join(' · '))}</small></button>`).join('')
        + (t.trim() ? `<button type="button" class="bph-kf-o bph-kf-neu${I === L.length ? ' on' : ''}" data-kfn tabindex="-1">＋ „${esc(t.trim())}“ als neuen Kontakt anlegen</button>` : '');
      b.hidden = !b.innerHTML; };
    const setzen = (k) => { K = k; if (k) o.wert = k.name; zeichne(); if (o.setzen) o.setzen(k, k ? k.name : o.wert || ''); };
    const neu = async () => { const t = ((inp() || {}).value || '').trim(); const k = await window.bpKontakt({ name: t, trade: o.rolle || '', ...(o.vor || {}) }, { basis: B }); if (k) setzen(k); else zeichne(true); };
    host.addEventListener('input', (e) => { if (!e.target.matches('[data-kfi]')) return; o.wert = e.target.value; clearTimeout(T); I = -1; const t = e.target.value.trim();
      if (!t) { L = []; zeigen(); return; }
      T = setTimeout(async () => { try { L = await KX(B + 'api/bp/kontakte?q=' + encodeURIComponent(t) + '&rolle=' + encodeURIComponent(o.rolle || '')); } catch { L = []; } if (document.activeElement === e.target && e.target.value.trim() === t) zeigen(); }, 180); });
    host.addEventListener('keydown', (e) => { if (!e.target.matches('[data-kfi]')) return; const b = box(), n = L.length + (e.target.value.trim() ? 1 : 0);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { if (!n) return; e.preventDefault(); const ab = e.key === 'ArrowDown'; I = I < 0 ? (ab ? 0 : n - 1) : (I + (ab ? 1 : -1) + n) % n; zeigen(); return; }
      if (e.key === 'Enter') { e.preventDefault(); if (b && !b.hidden && I >= 0) { const x = b.querySelectorAll('.bph-kf-o')[I]; if (x) x.click(); } else e.target.blur(); return; }
      if (e.key === 'Escape' && b && !b.hidden) { e.stopPropagation(); b.hidden = true; } });
    host.addEventListener('mousedown', (e) => { if (e.target.closest('.bph-kf-o')) e.preventDefault(); });   // Fokus bleibt im Feld
    host.addEventListener('focusout', (e) => { if (!e.target.matches('[data-kfi]')) return;
      setTimeout(() => { if (document.activeElement === e.target || !host.isConnected) return; const b = box(); if (b) b.hidden = true;
        const t = e.target.value.trim(), gleich = L.find((x) => x.name.toLowerCase() === t.toLowerCase());
        if (gleich) setzen(gleich); else if (o.setzen) o.setzen(null, t); }, 150); });   // genau dieser Name ist ein Kontakt: verbinden – sonst bleibt der Text
    host.addEventListener('click', async (e) => {
      const w = e.target.closest('[data-kfw]'); if (w) { const k = L[+w.dataset.kfw]; if (k) setzen(k); return; }
      if (e.target.closest('[data-kfn]')) { box().hidden = true; neu(); return; }
      if (e.target.closest('[data-kfe]') && K) { const k = await window.bpKontakt(K, { basis: B }); if (k) setzen({ ...K, ...k }); return; }
      if (e.target.closest('[data-kfx]')) { K = null; zeichne(true); if (o.setzen) o.setzen(null, o.wert || ''); }
    });
    (async () => { if (o.kid) { try { const v = await KX(B + 'api/bp/kontakte?ids=' + o.kid); K = (Array.isArray(v) && v[0]) || null; } catch { K = null; } } zeichne(); })();
    zeichne();
  };

  /* E-Mail an einen Kontakt ([data-mailwahl]): normal (Outlook) oder ein Schreiben aus der Plattform – Firma und aktuelles Projekt vorausgefüllt */
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('[data-mailwahl]'); if (!b || !window.modalBox) return;
    e.preventDefault();
    const H = window.BPHead || {}, mail = b.dataset.mailwahl, firma = b.dataset.firma || '', pj = H.projektId ? H.projektId() : null;
    const ziel = (k, frag) => (appZiel(k) ? appZiel(k) + frag : '');
    const W = [['outlook', '✉ Normal schreiben (Outlook)', `mailto:${mail}`, ''],
      ['mr', '⚠ Mängelrüge', pj && ziel('aufgaben', `#maengel&mruege=${encodeURIComponent(pj + '|' + firma)}`), 'öffnet „Aufgaben & Mängel“ – Mängel dieser Firma vorgewählt'],
      ['tr', '⏱ Terminrüge', pj && ziel('aufgaben', `#termine&ruege=${encodeURIComponent(pj + '|' + firma)}`), 'öffnet „Aufgaben & Mängel“ – Rückstand dieser Firma'],
      ['pl', '📐 Pläne senden', pj && ziel('plaene', `#plaene&an=${encodeURIComponent(firma)}`), 'öffnet „Pläne & Dateien“ – Firma als Empfänger:in vorgewählt']];
    const mb = modalBox(`<h3>E-Mail an ${esc(firma || mail)}</h3><div style="display:flex;flex-direction:column;gap:.45rem">${W.map(([k, l, u, t]) => `<button class="btn${k === 'outlook' ? ' pri' : ''}" data-m="${k}"${u ? '' : ' disabled'} style="justify-content:flex-start;text-align:left;display:flex;flex-direction:column;align-items:flex-start;gap:.1rem"><span>${l}</span>${t || !u ? `<small class="hint" style="font-weight:400">${!u && k !== 'outlook' ? (pj ? 'App nicht freigeschaltet' : 'erst oben ein Projekt wählen') : t}</small>` : ''}</button>`).join('')}</div>
      <div class="acts"><button class="btn" data-m="x">Abbrechen</button></div>`, (m, bg, close) => {
      if (m === 'x') return close();
      const w = W.find((x) => x[0] === m); if (!w || !w[2]) return;
      close(); location.href = w[2];
    });
    if (mb && mb.style) mb.style.zIndex = 1100;   // auch über der Kontaktmaske
  });
})();
