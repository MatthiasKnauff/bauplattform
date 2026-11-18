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
  css.textContent = `.bph-kmk .bph-kap{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:.35rem}.bph-kmk .bph-km-q{display:flex;flex-wrap:wrap;gap:.3rem;margin:0 0 .6rem}.bph-kmk .bph-km-q .bph-btn{font-size:.85em;padding:.25rem .65rem;text-decoration:none}
.bph-kmk .bph-km-map{position:relative;margin:0 0 .7rem;border-radius:calc(10px*var(--rk,1));overflow:hidden;border:1px solid var(--line,#ccc);height:150px}
.bph-kmk .bph-km-map iframe{border:0;width:100%;height:100%;display:block}
.bph-kmk .bph-km-map a{position:absolute;right:.4rem;bottom:.4rem;background:var(--card,#fff);color:var(--ink,#222);border-radius:calc(6px*var(--rk,1));padding:.1rem .5rem;font-size:.8em;text-decoration:none;box-shadow:var(--sh0,0 1px 4px rgba(0,0,0,.2))}
.bph-kmk .bph-km-info{font-size:.85em;color:var(--mute,#888);margin:.5rem 0 0}
.bph-kmk .bph-chf{position:relative}.bph-kmk .bph-chips{display:flex;flex-wrap:wrap;gap:.25rem;align-items:center;margin:0;padding:.1rem .4rem;border:1px solid var(--line,#3b3e42);border-radius:calc(7px*var(--rk,1));background:var(--bg,transparent);cursor:text}
.bph-kmk .bph-chips input[data-chipin]{all:unset;flex:1 1 5rem;min-width:4rem;font:inherit;color:inherit;padding:.3rem 0;line-height:normal}
.bph-kmk .bph-chip{display:inline-flex;align-items:center;gap:.2rem;background:color-mix(in srgb,var(--af,#2b4a7a) 14%,transparent);color:inherit;border-radius:99px;padding:0 .2rem 0 .55rem;font-size:.86em;line-height:1.5}
.bph-kmk .bph-chip button{all:unset;cursor:pointer;opacity:.6;padding:0 .25rem}.bph-kmk .bph-chip button:hover{opacity:1}
.bph-kmk .bph-chip.tag.gruen{background:color-mix(in srgb,var(--c-g,#1f8a4c) 18%,transparent)}.bph-kmk .bph-chip.tag.rot{background:color-mix(in srgb,var(--red,#c0392b) 18%,transparent)}
.bph-kmk .bph-chl{position:absolute;left:0;right:0;top:100%;z-index:5;margin-top:.15rem;background:var(--card,#fff);color:var(--ink,#222);border:1px solid var(--line,#ccc);border-radius:calc(8px*var(--rk,1));box-shadow:var(--sh0,0 8px 22px rgba(0,0,0,.18));max-height:14rem;overflow:auto}
.bph-kmk .bph-chl div{display:flex;justify-content:space-between;gap:.5rem;padding:.3rem .6rem;cursor:pointer}.bph-kmk .bph-chl div.on,.bph-kmk .bph-chl div:hover{background:var(--hov,rgba(127,127,127,.12))}.bph-kmk .bph-chl small{color:var(--mute,#888)}
.bph-kmk details.bph-km-bn{margin:.6rem 0 0;border:1px solid var(--line,#ccc);border-radius:calc(10px*var(--rk,1));padding:.35rem .6rem}.bph-kmk details.bph-km-bn summary{cursor:pointer}
.bph-kmk .bph-km-f{display:flex;gap:.4rem;align-items:center;flex-wrap:wrap}.bph-kmk .bph-km-sp{flex:1}
.bph-kmk .bph-km-del{color:var(--red,#c0392b);border-color:color-mix(in srgb,var(--red,#c0392b) 45%,transparent)}`;
  document.head.appendChild(css);
  /* Felder (15.11.2026): Ansprechpartner:in neben dem Gewerk, Funktion darunter halb breit; Gewerk, Stichwörter, Tags als Bausteine mit Vorschlägen */
  const F = [['name', 'Firma / Name', 'w'], ['trade', 'Gewerk / Rolle', '', 'chips'], ['contact_person', 'Ansprechpartner:in', ''], ['role', 'Funktion', ''], ['', '', ''],
    ['phone', 'Telefon', '', 'tel'], ['mobile', 'Mobil', '', 'tel'], ['email', 'E-Mail', '', 'email'], ['website', 'Internet', '', 'url']];
  const F3 = [['stichworte', 'Stichwörter', 'w', 'chips', 'Was die Firma kann – zum Finden (z. B. Flachdach, Gründach, Denkmal)'], ['tags', 'Tags', 'w', 'chips', 'Eure Einschätzung (z. B. Stammfirma, zuverlässig, nicht mehr beauftragen)']];
  const liste = (v) => { const o = []; String(v || '').replace(/;/g, ',').split(',').forEach((x) => { x = x.trim().replace(/\s+/g, ' '); if (x && !o.some((y) => y.toLowerCase() === x.toLowerCase())) o.push(x); }); return o; };
  const tagArt = (t) => (/nicht mehr|gesperrt|keine? auftr|schlecht/i.test(t) ? ' rot' : /stamm|zuverl|empfohl|gut/i.test(t) ? ' gruen' : '');
  let BEGR = null, BEGR_T = 0;   // Gewerke, Stichwörter, Tags der Adressen mit Anzahl – einmal je Minute geladen
  const F2 = [['art', 'Art', 'w', '', 'Firma, Bauherr:in, Baustelle, Plotdienst – oder eine eigene Art (z. B. Behörde, Planer:in)'], ['street', 'Straße, Nr.', 'w'], ['zip', 'PLZ', ''], ['city', 'Ort', '']];
  const WT = { tel: ['☎', 'Telefon', 'z. B. Zentrale, Büro, privat'], mail: ['✉', 'E-Mail', 'z. B. Rechnungen, Buchhaltung'], adr: ['📍', 'Anschrift', 'z. B. Rechnungsanschrift, Lager'], person: ['👤', 'Ansprechpartner:in', 'Funktion, z. B. Bauleiter:in'] };
  const tel = (n) => String(n || '').replace(/[^\d+]/g, '');
  const addr = (c) => [c.street, [c.zip, c.city].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  const wtMails = (c) => [c.email, ...(c.weitere || []).flatMap((x) => (x.typ === 'mail' ? [x.wert] : x.typ === 'person' ? [x.mail] : []))].filter(Boolean);
  const wtTel = (c) => (c.weitere || []).flatMap((x) => (x.typ === 'tel' ? [[x.bez, x.wert]] : x.typ === 'person' && x.tel ? [[x.wert, x.tel]] : [])).filter((x) => x[1]);
  /* Anrede und Titel je Ansprechperson (AP-B1, 18.11.2026) – daraus die Anrede in Mails (contacts.anrede) */
  const anrSel = (attr, v) => `<select ${attr} data-bp-auswahl aria-label="Anrede">${[['', 'Anrede –'], ['Herr', 'Herr'], ['Frau', 'Frau']].map(([k, t]) => `<option value="${k}"${(v || '') === k ? ' selected' : ''}>${t}</option>`).join('')}</select>`;
  const wtZeile = (x, i) => {
    const v = (k) => esc(x[k] || ''), [ic, t, ph] = WT[x.typ] || WT.tel, inp = (k, pl, ty, cl) => `<input data-kwt="${i}" data-wk="${k}"${ty ? ` type="${ty}"` : ''}${cl ? ` class="${cl}"` : ''} value="${v(k)}" placeholder="${pl}" autocomplete="off" aria-label="${pl}">`;
    const f = x.typ === 'adr' ? inp('street', 'Straße, Nr.', '', 'w2') + inp('zip', 'PLZ') + inp('city', 'Ort')
      : x.typ === 'person' ? anrSel(`data-kwt="${i}" data-wk="anrede"`, x.anrede) + inp('titel', 'Titel (Dr., Prof.)') + inp('wert', 'Name') + inp('bez', ph) + inp('tel', 'Telefon', 'tel') + inp('mail', 'E-Mail (leer = die der Firma)', 'email')
        : inp('wert', t, x.typ === 'mail' ? 'email' : 'tel', 'w2');
    return `<div class="bph-kwt-z"><div class="bph-kwt-t"><span>${ic} ${t}</span>${x.typ === 'person' ? '' : inp('bez', ph)}<button type="button" class="bph-x" data-kwtx="${i}" title="Entfernen" aria-label="Entfernen">✕</button></div><div class="bph-kwt-f">${f}</div></div>`;
  };
  /* Firma (GO 18.11.2026, Angebotsbesprechung AB-C1): Rechtsform, Sitz / Registergericht, Handelsregister, Mitarbeiter:innen – liest die Angebotsbesprechung,
     beim Abschließen des Protokolls kommt Geklärtes hierher zurück */
  /* PD-A1 (18.11.2026): dazu Rechnungsanschrift, USt-IdNr. und „öffentlich“ der Bauherr:in – gelten in jedem Projekt dieser Bauherr:in (Projektdaten zeigen sie nur) */
  const FIRMA = [['rechtsform', 'Rechtsform', 'z. B. GmbH, GmbH & Co. KG, e. K.'], ['sitz', 'Sitz / Registergericht', 'z. B. Essen (AG Essen)'], ['hrb', 'Handelsregister', 'z. B. HRB 12345'], ['mitarbeiter', 'Mitarbeiter:innen', 'Anzahl'],
    ['ustid', 'USt-IdNr. / Steuernummer', 'z. B. DE123456789'], ['rechnung', 'Rechnungsanschrift (falls abweichend)', 'nur wenn anders als die Anschrift oben', 'w'], ['oeffentlich', 'Öffentliche:r Auftraggeber:in (Vergabe nach VOB/A bzw. UVgO)', '', 'ck']];
  const firmaFeld = ([k, l, ph, art], f) => (art === 'ck' ? `<label class="bph-ck bph-dm-w"><input type="checkbox" data-kmfi="${k}"${f[k] === 'ja' ? ' checked' : ''}> ${l}</label>`
    : `<label class="bph-dm-f${art ? ' bph-dm-w' : ''}"><span>${l}</span>${art ? `<textarea data-kmfi="${k}" rows="2" placeholder="${esc(ph)}">${esc(f[k] || '')}</textarea>` : `<input data-kmfi="${k}" value="${esc(f[k] || '')}" placeholder="${esc(ph)}" autocomplete="off"${k === 'mitarbeiter' ? ' inputmode="numeric"' : ''}>`}</label>`);
  const firmaHtml = (f) => `<details class="bph-dm-w bph-km-bn bph-km-firma"${FIRMA.some(([k]) => f[k]) ? ' open' : ''}><summary>Firma / Rechnung <small class="bph-mu">${esc(FIRMA.map(([k, l]) => (k === 'oeffentlich' ? (f[k] ? 'öffentlich' : '') : k === 'rechnung' && f[k] ? 'eigene Rechnungsanschrift' : f[k])).filter(Boolean).join(' · ') || 'Rechtsform, Register, USt-IdNr., Rechnungsanschrift')}</small></summary>
    <div class="bph-dm-g">${FIRMA.map((x) => firmaFeld(x, f)).join('')}</div></details>`;
  const appZiel = (key) => { const H = window.BPHead, a = H && H.conf && (H.conf.apps || []).find((x) => x.key === key && x.allowed !== false); return a && H.appUrl ? H.appUrl(a) + '/' : ''; };

  window.bpKontakt = async function (vor = {}, opt = {}) {
    const B = opt.basis || '', neu = !vor.id, H = window.BPHead || {};
    if (!window.bpBegriff) { const [bb, vv] = window.BP_HEAD_BASIS || ['/bp/', ''], sc = document.createElement('script'); sc.src = bb + 'begriffe.js' + vv; document.head.appendChild(sc); }   // 🗑 in den Vorschlägen (Gewerk, Stichwörter, Tags)
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
    const feld = ([k, l, w, t, tip]) => !k ? `<div class="bph-dm-f"><span>Anrede · Titel</span><span class="bph-kap">${anrSel('data-kmfi="ap_anrede"', (c.firma || {}).ap_anrede)}<input data-kmfi="ap_titel" value="${esc((c.firma || {}).ap_titel || '')}" placeholder="Dr., Prof." autocomplete="off" aria-label="Titel"></span></div>`
      : t === 'chips' ? `<div class="bph-dm-f${w ? ' bph-dm-w' : ''} bph-chf"${tip ? ` title="${esc(tip)}"` : ''}><span>${l}</span><div class="bph-chips" data-chips="${k}"></div><input type="hidden" data-kmf="${k}" value="${esc(c[k] || '')}"><div class="bph-chl" data-chl="${k}" hidden></div></div>`
      : `<label class="bph-dm-f${w ? ' bph-dm-w' : ''}"${tip ? ` title="${esc(tip)}"` : ''}><span>${l}</span><input data-kmf="${k}" type="${t || 'text'}" value="${esc(c[k] || '')}" autocomplete="off"${k === 'zip' ? ' inputmode="numeric"' : ''}></label>`;
    return new Promise((fertig) => {
      const bg = document.createElement('div'); bg.className = 'bph-dlg-bg';
      bg.innerHTML = `<div class="bph-dlg bph-dm bph-kmk" role="dialog" aria-label="Kontakt" style="width:min(640px,96vw)"><div class="bph-dlg-h"><b>${neu ? 'Neuer Kontakt' : esc(c.name || 'Kontakt')}</b><button type="button" class="bph-x" data-kmx aria-label="Schließen">✕</button></div>
        <div class="bph-dm-b">${quick ? `<div class="bph-km-q">${quick}</div>` : ''}
          ${!neu && ad ? `<div class="bph-km-map"><iframe loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Karte" src="https://www.google.com/maps?q=${encodeURIComponent(ad)}&hl=de&z=15&output=embed"></iframe><a href="${esc(route)}" target="_blank" rel="noopener">Route dorthin planen ↗</a></div>` : ''}
          <div class="bph-dm-g">${F.map(feld).join('')}
          ${neu ? '<div class="bph-dm-w bph-kmsug" data-kmsug></div>' : ''}
          <div class="bph-dm-w bph-kwt"><div data-kwtbox></div><div class="bph-kwt-add">${Object.entries(WT).map(([k, [ic]]) => `<button type="button" class="bph-btn" data-kwtadd="${k}">＋ ${ic} ${{ tel: 'weitere Nummer', mail: 'weitere E-Mail', adr: 'weitere Anschrift', person: 'Ansprechpartner:in' }[k]}</button>`).join('')}</div></div>
          ${F3.map(feld).join('')}
          ${firmaHtml(c.firma || {})}
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
      /* Bausteine (Gewerk, Stichwörter, Tags): tippen → Vorschläge aus den Adressen (häufigste zuerst), ↓↑ wählen, Enter oder Komma übernimmt;
         Neues nur über „＋ neu: …“ (bewusst bestätigt), Rücktaste im leeren Feld nimmt den letzten Baustein weg */
      const chipWerte = (k) => liste(q(`[data-kmf="${k}"]`).value);
      const chipZeichnen = (k, fokus) => {
        const box = q(`[data-chips="${k}"]`); if (!box) return;
        box.innerHTML = chipWerte(k).map((x, i) => `<span class="bph-chip${k === 'tags' ? ' tag' + tagArt(x) : ''}">${k === 'tags' && tagArt(x) === ' gruen' ? '✔ ' : ''}${esc(x)}<button type="button" data-chipx="${k}" data-i="${i}" aria-label="${esc(x)} entfernen">✕</button></span>`).join('')
          + `<input data-chipin="${k}" autocomplete="off" placeholder="${chipWerte(k).length ? '' : { trade: 'Gewerk …', stichworte: 'Stichwort …', tags: 'Tag …' }[k]}" aria-label="${{ trade: 'Gewerk', stichworte: 'Stichwort', tags: 'Tag' }[k]} hinzufügen">`;
        if (fokus) box.querySelector('input').focus();
      };
      const chipSetzen = (k, L) => { q(`[data-kmf="${k}"]`).value = L.join(', '); chipZeichnen(k, true); };
      const chipListe = (k, t) => {
        const el = q(`[data-chl="${k}"]`), da = chipWerte(k).map((x) => x.toLowerCase()), tl = t.trim().toLowerCase();
        const V = ((BEGR && BEGR[k]) || []).filter(([v]) => !da.includes(v.toLowerCase()) && (!tl || v.toLowerCase().includes(tl))).slice(0, 8);
        const neuT = tl && !(BEGR && (BEGR[k] || []).some(([v]) => v.toLowerCase() === tl)) && !da.includes(tl) ? t.trim() : '';
        const E = [...V.map(([v, n]) => ({ v, n })), ...(neuT ? [{ v: neuT, neu: true }] : [])];
        el._E = E; el._a = 0;
        el.hidden = !E.length;
        el.innerHTML = E.map((x, i) => `<div class="${i ? '' : 'on'}" data-chipw="${k}" data-i="${i}">${x.neu ? `<b>＋ neu:</b> „${esc(x.v)}“` : esc(x.v)}${x.n ? `<small>${x.n}</small>` : ''}${!x.neu && x.n && window.bpBegriff ? bpBegriff.knopf('kontakt.' + k, x.v) : ''}</div>`).join('');   // 🗑: löschen mit Ersatz (begriffe.js)
      };
      const chipNehmen = (k, i) => { const el = q(`[data-chl="${k}"]`), x = (el._E || [])[i]; if (!x) return; el.hidden = true; chipSetzen(k, [...chipWerte(k), x.v]); };
      const begriffe = () => { if (BEGR && Date.now() - BEGR_T < 60000) return; BEGR_T = Date.now(); KX(B + 'api/bp/kontakte?begriffe=1').then((r) => { BEGR = r; const a = document.activeElement; if (a && a.dataset && a.dataset.chipin && root.contains(a)) chipListe(a.dataset.chipin, a.value); }).catch(() => {}); };
      ['trade', 'stichworte', 'tags'].forEach((k) => chipZeichnen(k));
      begriffe();   // gleich beim Öffnen holen – beim ersten Tippen sind die Vorschläge da
      root.addEventListener('focusin', (e) => { const k = e.target.dataset && e.target.dataset.chipin; if (k) { begriffe(); chipListe(k, e.target.value); } });
      root.addEventListener('focusout', (e) => { const k = e.target.dataset && e.target.dataset.chipin; if (k) setTimeout(() => { const el = q(`[data-chl="${k}"]`); if (el && !el.contains(document.activeElement)) el.hidden = true; }, 150); });
      root.addEventListener('input', (e) => { const k = e.target.dataset && e.target.dataset.chipin; if (k) chipListe(k, e.target.value); });
      root.addEventListener('keydown', (e) => {
        const k = e.target.dataset && e.target.dataset.chipin; if (!k) return;
        const el = q(`[data-chl="${k}"]`), n = (el._E || []).length;
        if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && n) { e.preventDefault(); el._a = (el._a + (e.key === 'ArrowDown' ? 1 : n - 1)) % n; el.querySelectorAll('[data-chipw]').forEach((d, i) => d.classList.toggle('on', i === el._a)); return; }
        if ((e.key === 'Enter' || e.key === ',') && e.target.value.trim()) { e.preventDefault(); if (!el.hidden && n) chipNehmen(k, el._a); return; }
        if (e.key === 'Enter') { e.preventDefault(); return; }
        if (e.key === 'Backspace' && !e.target.value) { const L = chipWerte(k); if (L.length) { L.pop(); chipSetzen(k, L); } }
      });
      root.addEventListener('mousedown', async (e) => {   // 🗑 in der Liste: Eintrag löschen, die Adressen bekommen einen Ersatz (auch diese hier, falls sie ihn trägt)
        const dl = e.target.closest('[data-bpbegr]'); if (!dl) return;
        e.preventDefault(); e.stopPropagation(); const k = dl.dataset.bpbegr.slice(8), w = dl.dataset.wert; q(`[data-chl="${k}"]`).hidden = true;
        const r = await bpBegriff.loeschen({ quelle: dl.dataset.bpbegr, wert: w, basis: B, nachher: () => { BEGR_T = 0; begriffe(); } });
        if (r && chipWerte(k).some((x) => x.toLowerCase() === w.toLowerCase())) { const e2 = String((c.id && r.je && c.id in r.je ? r.je[c.id] : r.ersatz) || '').trim();
          chipSetzen(k, chipWerte(k).map((x) => (x.toLowerCase() === w.toLowerCase() ? e2 : x)).filter(Boolean)); }
      }, true);
      root.addEventListener('mousedown', (e) => { const w = e.target.closest('[data-chipw]'); if (w) { e.preventDefault(); chipNehmen(w.dataset.chipw, +w.dataset.i); } });
      root.addEventListener('click', (e) => {
        const x = e.target.closest('[data-chipx]'); if (x) { const L = chipWerte(x.dataset.chipx); L.splice(+x.dataset.i, 1); chipSetzen(x.dataset.chipx, L); return; }
        const b = e.target.closest('.bph-chips'); if (b && !e.target.closest('input,button')) b.querySelector('input').focus();
      });
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
          const ort = ((q('[data-kmf="city"]') || {}).value || '').trim(), pj = H.projektId ? H.projektId() : null;   // gesucht wird zuerst dort (Projekt, sonst Büro)
          let r = {}; try { r = await KX(B + sugB + '?q=' + encodeURIComponent(t) + (pj ? '&pid=' + pj : '') + (ort ? '&ort=' + encodeURIComponent(ort) : '')); } catch { return; }
          SUG = Array.isArray(r.items) ? r.items : [];
          box.innerHTML = SUG.length ? `<small class="bph-mu">Firmen und Ämter aus dem Netz${ort ? ' – um ' + esc(ort) : ''} – antippen zum Übernehmen</small>` + SUG.map((x, i) => `<button type="button" class="bph-kf-o" data-kmsg="${i}"><b>${esc(x.name)}</b><small>${esc([x.trade, [x.street, [x.zip, x.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')].filter(Boolean).join(' · '))}</small></button>`).join('') : '';
        }, 350);
      };
      let gewaehlt = false;   // Vorschlag übernommen: der Ort verfeinert dann nicht mehr
      root.addEventListener('input', (e) => { if (!neu) return; const k = e.target.dataset.kmf;
        if (k === 'name') { gewaehlt = false; sug(e.target.value); } else if (k === 'city' && !gewaehlt) sug(q('[data-kmf="name"]').value); });   // Ort eingetragen → dort suchen
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
          ['trade', 'street', 'zip', 'city', 'phone', 'email', 'website'].forEach((k) => set(k, x[k])); chipZeichnen('trade');
          gewaehlt = true; clearTimeout(sT); q('[data-kmsug]').innerHTML = '<small class="bph-mu">Übernommen – bitte prüfen.</small>'; return;
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
        d.firma = {}; root.querySelectorAll('[data-kmfi]').forEach((el) => { d.firma[el.dataset.kmfi] = el.type === 'checkbox' ? (el.checked ? 'ja' : '') : el.value.trim(); });
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
    const B = o.basis || ''; let L = [], I = -1, T = 0, K = null, nurText = false;
    const kAdr = (k) => [addr(k), k.contact_person, k.phone || k.mobile ? '☎ ' + (k.phone || k.mobile) : '', k.email ? '✉ ' + k.email : ''].filter(Boolean).join(' · ');
    const zeichne = (fokus) => {
      host.innerHTML = K ? `<span class="bph-kf-c bph-kf-v"><span><b>${esc(K.name)}</b>${kAdr(K) ? ' · ' + esc(kAdr(K)) : ''}</span><button type="button" class="bph-btn" data-kfe title="Kontakt bearbeiten (gilt überall)">✎</button><button type="button" class="bph-btn" data-kfx title="Verbindung lösen">×</button></span>`
        : `<span class="bph-kf"><input data-kfi value="${esc(o.wert || '')}" autocomplete="off" placeholder="${esc(o.platz || 'Name eintippen – sucht in den Kontakten')}" role="combobox" aria-autocomplete="list"><span class="bph-kf-l" data-kfl hidden></span></span>`;
      if (fokus && !K) { const i = host.querySelector('[data-kfi]'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
    };
    const box = () => host.querySelector('[data-kfl]'), inp = () => host.querySelector('[data-kfi]');
    const zeigen = () => { const b = box(), t = (inp() || {}).value || ''; if (!b) return;
      b.innerHTML = L.map((x, i) => `<button type="button" class="bph-kf-o${i === I ? ' on' : ''}" data-kfw="${i}" tabindex="-1"><b>${esc(x.name)}</b><small>${esc([x.trade, kAdr(x)].filter(Boolean).join(' · '))}</small></button>`).join('')
        + (t.trim() ? `<button type="button" class="bph-kf-o bph-kf-neu${I === L.length ? ' on' : ''}" data-kfn tabindex="-1">＋ „${esc(t.trim())}“ als neuen Kontakt anlegen</button>`
          + `<button type="button" class="bph-kf-o bph-kf-oh${I === L.length + 1 ? ' on' : ''}" data-kft tabindex="-1"><span>„${esc(t.trim())}“ nur als Text – ohne Kontakt</span></button>` : '');   // suchen · anlegen · weder noch
      b.hidden = !b.innerHTML; };
    const setzen = (k) => { K = k; if (k) o.wert = k.name; zeichne(); if (o.setzen) o.setzen(k, k ? k.name : o.wert || ''); };
    const neu = async () => { const t = ((inp() || {}).value || '').trim(); const k = await window.bpKontakt({ name: t, trade: o.rolle || '', ...(o.vor || {}) }, { basis: B }); if (k) setzen(k); else zeichne(true); };
    host.addEventListener('input', (e) => { if (!e.target.matches('[data-kfi]')) return; o.wert = e.target.value; nurText = false; clearTimeout(T); I = -1; const t = e.target.value.trim();
      if (!t) { L = []; zeigen(); return; }
      T = setTimeout(async () => { try { L = await KX(B + 'api/bp/kontakte?q=' + encodeURIComponent(t) + '&rolle=' + encodeURIComponent(o.rolle || '')); } catch { L = []; } if (document.activeElement === e.target && e.target.value.trim() === t) zeigen(); }, 180); });
    host.addEventListener('keydown', (e) => { if (!e.target.matches('[data-kfi]')) return; const b = box(), n = L.length + (e.target.value.trim() ? 2 : 0);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { if (!n) return; e.preventDefault(); const ab = e.key === 'ArrowDown'; I = I < 0 ? (ab ? 0 : n - 1) : (I + (ab ? 1 : -1) + n) % n; zeigen(); return; }
      if (e.key === 'Enter') { e.preventDefault(); if (b && !b.hidden && I >= 0) { const x = b.querySelectorAll('.bph-kf-o')[I]; if (x) x.click(); } else e.target.blur(); return; }
      if (e.key === 'Escape' && b && !b.hidden) { e.stopPropagation(); b.hidden = true; } });
    host.addEventListener('mousedown', (e) => { if (e.target.closest('.bph-kf-o')) e.preventDefault(); });   // Fokus bleibt im Feld
    host.addEventListener('focusout', (e) => { if (!e.target.matches('[data-kfi]')) return;
      setTimeout(() => { if (document.activeElement === e.target || !host.isConnected) return; const b = box(); if (b) b.hidden = true;
        const t = e.target.value.trim(), gleich = !nurText && L.find((x) => x.name.toLowerCase() === t.toLowerCase());
        if (gleich) setzen(gleich); else if (o.setzen) o.setzen(null, t); }, 150); });   // genau dieser Name ist ein Kontakt: verbinden – sonst bleibt der Text
    host.addEventListener('click', async (e) => {
      const w = e.target.closest('[data-kfw]'); if (w) { const k = L[+w.dataset.kfw]; if (k) setzen(k); return; }
      if (e.target.closest('[data-kfn]')) { box().hidden = true; neu(); return; }
      if (e.target.closest('[data-kft]')) { nurText = true; box().hidden = true; const i = inp(); if (i) i.blur(); return; }   // Text bleibt, kein Kontakt (focusout speichert)
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

  /* ---------- Adresse wählen – mit Filter oben (15.11.2026, Mock „Bauantrag: Adressen wählen“): bpKontaktWahl({ titel, rolle, kids, basis })
     → Promise<{ id, name, trade } | null>. Suchfeld oben, darunter Rollen (aus dem Gewerk der Adressen; „rolle“ vorbelegt), „nur dieses Projekt“
     (kids: Kontakte des Projekts zuerst), Liste, „＋ neu anlegen“ (Kontaktmaske). ↑↓ wählt, Enter übernimmt, Esc schließt. ---------- */
  window.bpKontaktWahl = async function (o = {}) {
    const B = o.basis || '', P = new Set((o.kids || []).map(Number)), low = (x) => String(x || '').toLowerCase();
    let L = []; try { L = await KX(B + 'api/bp/kontakte?namen=1'); } catch { L = []; }
    const zahl = {}; L.forEach((x) => { const t = (x.trade || '').trim(); if (t) zahl[t] = (zahl[t] || 0) + 1; });
    const passt = (x, r) => !r || low(x.trade).includes(low(r));
    const R0 = o.rolle && L.some((x) => passt(x, o.rolle)) ? o.rolle : '';
    const chips = [...new Set([R0, ...Object.entries(zahl).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([t]) => t)].filter(Boolean))];
    let rolle = R0, q = '', nurP = false, sel = 0, T = [];
    return new Promise((fertig) => {
      const bg = document.createElement('div'); bg.className = 'bph-dlg-bg';
      bg.innerHTML = `<div class="bph-dlg bph-dm bph-kw" role="dialog" aria-label="Adresse wählen" style="width:min(560px,96vw);display:flex;flex-direction:column;max-height:86vh">
        <div class="bph-dlg-h"><b>${esc(o.titel || 'Adresse wählen')}</b><button type="button" class="bph-x" data-kwx aria-label="Schließen">✕</button></div>
        <input data-kwq placeholder="Name, Ort, Gewerk …" autocomplete="off" aria-label="Suchen" style="margin:0 0 .45rem">
        <div class="bph-kw-c" data-kwc></div><div class="bph-dm-b bph-kw-l" data-kwl role="listbox"></div>
        <div class="bph-dm-g" style="display:flex;gap:.4rem;align-items:center;margin-top:.55rem"><button type="button" class="bph-btn" data-kwneu>＋ neu anlegen</button><span style="flex:1"></span><button type="button" class="bph-btn" data-kwx>Abbrechen</button><button type="button" class="bph-btn pri" data-kwok>Übernehmen</button></div></div>`;
      if (!document.getElementById('bph-kw-css')) { const st = document.createElement('style'); st.id = 'bph-kw-css';
        st.textContent = '.bph-kw-c{display:flex;flex-wrap:wrap;gap:.3rem;margin:0 0 .45rem}.bph-kw-c button{border:1px solid var(--line,#ccc);background:var(--card,#fff);color:var(--ink,#222);border-radius:999px;padding:.08rem .6rem;font:inherit;font-size:.8em;cursor:pointer}.bph-kw-c button.on{border-color:var(--y,#2f5fb3);color:var(--y,#2f5fb3);font-weight:600;background:color-mix(in srgb,var(--y,#2f5fb3) 10%,transparent)}.bph-kw-l{min-height:12rem}.bph-kw-z{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.5rem;padding:.35rem .5rem;border-radius:calc(6px*var(--rk,1));cursor:pointer}.bph-kw-z small{color:var(--mute,#888)}.bph-kw-z:hover{background:var(--hov,rgba(0,0,0,.05))}.bph-kw-z.on{background:color-mix(in srgb,var(--y,#2f5fb3) 12%,transparent);box-shadow:inset 3px 0 0 var(--y,#2f5fb3)}';
        document.head.appendChild(st); }
      document.body.appendChild(bg);
      const $q = (s) => bg.querySelector(s), inp = $q('[data-kwq]');
      const ende = (k) => { bg.remove(); document.removeEventListener('keydown', key, true); fertig(k || null); };
      const liste = () => {
        const t = low(q).trim();
        T = L.filter((x) => (!nurP || P.has(x.id)) && (t ? low(x.name + ' ' + x.trade).includes(t) : passt(x, rolle)))
          .sort((a, b) => (P.has(b.id) - P.has(a.id)) || a.name.localeCompare(b.name, 'de')).slice(0, 120);
        sel = Math.min(sel, Math.max(0, T.length - 1));
        $q('[data-kwc]').innerHTML = [...chips.map((c) => `<button type="button" data-kwr="${esc(c)}" class="${!t && rolle === c ? 'on' : ''}">${esc(c)}</button>`),
          `<button type="button" data-kwr="" class="${!t && !rolle ? 'on' : ''}">alle</button>`, P.size ? `<button type="button" data-kwp class="${nurP ? 'on' : ''}">nur dieses Projekt</button>` : ''].join('');
        $q('[data-kwl]').innerHTML = T.length ? T.map((x, i) => `<div class="bph-kw-z${i === sel ? ' on' : ''}" role="option" data-kwi="${i}"><span><b>${esc(x.name)}</b>${x.trade ? ' · ' + esc(x.trade) : ''}</span><small>${P.has(x.id) ? 'im Projekt' : ''}</small></div>`).join('')
          : `<p class="bph-mu" style="margin:.4rem">Nichts gefunden${t ? ' – mit „＋ neu anlegen“ als neue Adresse' : ''}.</p>`;
      };
      const zeig = () => { const el = $q(`[data-kwi="${sel}"]`); bg.querySelectorAll('.bph-kw-z.on').forEach((x) => x.classList.remove('on')); if (el) { el.classList.add('on'); el.scrollIntoView({ block: 'nearest' }); } };
      const neu = async () => { const k = await bpKontakt({ name: q.trim(), trade: rolle || o.rolle || '' }, { basis: B }); if (k && k.id) ende({ id: k.id, name: k.name, trade: k.trade || '' }); };
      const key = (e) => {
        if (document.querySelector('.bph-kmk')) return;   // Kontaktmaske darüber
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); ende(null); }
        else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, Math.min(T.length - 1, sel + (e.key === 'ArrowDown' ? 1 : -1))); zeig(); }
        else if (e.key === 'Enter' && bg.contains(e.target) && !e.target.closest('button')) { e.preventDefault(); if (T[sel]) ende(T[sel]); }
      };
      document.addEventListener('keydown', key, true);
      inp.addEventListener('input', () => { q = inp.value; sel = 0; liste(); });
      bg.addEventListener('click', (e) => {
        const b = e.target.closest('button, .bph-kw-z'); if (!b) return;   // daneben klicken schließt nicht
        if (b.dataset.kwx !== undefined) ende(null);
        else if (b.dataset.kwok !== undefined) { if (T[sel]) ende(T[sel]); }
        else if (b.dataset.kwneu !== undefined) neu();
        else if (b.dataset.kwr !== undefined) { rolle = b.dataset.kwr; q = ''; inp.value = ''; sel = 0; liste(); inp.focus(); }
        else if (b.dataset.kwp !== undefined) { nurP = !nurP; sel = 0; liste(); inp.focus(); }
        else if (b.dataset.kwi !== undefined) { sel = +b.dataset.kwi; zeig(); }
      });
      bg.addEventListener('dblclick', (e) => { const z = e.target.closest('.bph-kw-z'); if (z) ende(T[+z.dataset.kwi]); });
      liste(); inp.focus();
    });
  };
})();
