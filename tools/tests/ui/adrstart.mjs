// Adressen beginnen mit dem Projektbezug (GO 17.11.2026): Filter „Projekt“ = Projekt aus der zuletzt benutzten App; wird er weggeklickt,
// kommt EINMAL die Frage „künftig immer ohne Projekt beginnen?“, die Antwort steht danach als Häkchen unter „Beteiligte …“ und geht an den Server.
//
// Aufgerufen aus oberflaeche.mjs:  const fehler = await adrStartPruefen(browser, repoWurzel)   – allein: node tools/tests/ui/adrstart.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

export async function adrStartPruefen(browser, repo) {
  const KASTEN = path.join(repo, 'shared/bpcore/head');
  const BK = /BAUKASTEN = \(([^)]*)\)/.exec(fs.readFileSync(path.join(repo, 'shared/bpcore/head.py'), 'utf8'))[1].match(/"[^"]+"/g).map((s) => s.slice(1, -1));
  const baukasten = 'void 0;\n' + BK.map((f) => fs.readFileSync(path.join(KASTEN, f), 'utf8')).join('\n;\n');
  const fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  const J = (o) => ({ contentType: 'application/json', body: JSON.stringify(o) });
  const KONT0 = [{ id: 1, name: 'Dach GmbH', kind: 'firma', trade: 'Dachdecker', projects: ['Haus Mustermann'], site_of: '' },
    { id: 2, name: 'Putz KG', kind: 'firma', trade: 'Putz', projects: [], site_of: '' }, { id: 3, name: 'Fam. Muster', kind: 'bauherr', trade: '', projects: [], site_of: '' }];
  const lauf = async (start, kont = KONT0, extra = null) => {
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } }), p = await ctx.newPage(), puts = [];
    p.on('pageerror', (e) => fehler.push('Fehler im Skript – ' + e.message + ' @ ' + String(e.stack).split('\n').slice(1,3).join(' | ')));
    await p.route('http://portal.test/**', (r) => { const u = new URL(r.request().url()), pf = u.pathname.replace(/^\/adressen\//, '');
      if (pf === '' ) return r.fulfill({ contentType: 'text/html', body: fs.readFileSync(path.join(repo, 'plattform/static/adressen.html'), 'utf8') });
      if (pf === 'bp/baukasten.js') return r.fulfill({ contentType: 'text/javascript', body: baukasten });
      if (pf.startsWith('static/')) { const f = path.join(repo, 'plattform/static', pf.slice(7)); return fs.existsSync(f) ? r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(f) }) : r.fulfill({ status: 404, body: '' }); }   // eigene Skripte der Seite (adressen-rechts.js …)
      if (pf.startsWith('bp/')) { const f = path.join(KASTEN, pf.slice(3)); return fs.existsSync(f) ? r.fulfill({ contentType: f.endsWith('.css') ? 'text/css' : 'text/javascript', body: fs.readFileSync(f) }) : r.fulfill({ status: 404, body: '' }); }
      if (extra) { const x = extra(pf, r.request()); if (x) return r.fulfill(J(x)); }
      if (pf === 'api/ansicht/start') { const d = JSON.parse(r.request().postData() || '{}'); puts.push(d); return r.fulfill(J({ ohne_projekt: !!d.ohne_projekt, gefragt: !!d.gefragt })); }
      if (pf === 'api/me') return r.fulfill(J({ ok: true, id: 1, name: 'admin', is_admin: true, apps: [], start }));
      if (pf === 'api/bp/kopf') return r.fulfill(J({ conf: { apps: [], user: { name: 'admin' } }, projekt: { id: 7, name: 'Haus Mustermann' } }));
      if (pf === 'api/platform') return r.fulfill(J({ apps: [], user: { name: 'admin' } }));
      if (pf === 'api/bp/projekt') return r.fulfill(J({ id: 7, name: 'Haus Mustermann' }));
      if (pf === 'api/contacts') return r.fulfill(J(kont));
      return r.fulfill(J(/liste|kontakte|neuigkeit/.test(pf) ? [] : {})); });
    await p.goto('http://portal.test/adressen/'); await p.waitForSelector('[data-adr="b"]', { timeout: 10000 }); await p.waitForTimeout(300);
    return { ctx, p, puts };
  };
  const zahl = (p) => p.evaluate(() => shown().length);   // gefilterte Liste (Karten oder Tabelle)
  try {
    { const { ctx, p, puts } = await lauf({ ohne_projekt: false, gefragt: false });
      pruef(await zahl(p) === 1, `Start: nur die Beteiligten des Projekts (1) – ${await zahl(p)}`);
      pruef(await p.isVisible('.adr-ohne input:not(:checked)'), 'Häkchen „immer ohne Projekt beginnen“ fehlt unter „Beteiligte …“');
      await p.click('[data-adr="b"]');
      await p.waitForSelector('.bph-dlg, [data-f="ja"]', { timeout: 3000 }).catch(() => {});
      const txt = await p.evaluate(() => document.body.innerText);
      pruef(/immer ohne Projekt beginnen\?/.test(txt), 'Projekt weggeklickt: keine Frage „künftig immer ohne Projekt beginnen?“');
      await p.click('[data-f="ja"]'); await p.waitForTimeout(300);
      pruef(puts.some((d) => d.ohne_projekt && d.gefragt), `Antwort nicht an den Server – ${JSON.stringify(puts)}`);
      pruef(await p.isVisible('.adr-ohne input:checked'), 'nach „Ja“: Häkchen nicht gesetzt');
      pruef(await zahl(p) === 3, `ohne Projekt: alle Adressen (3) – ${await zahl(p)}`);
      // 19.11.2026 (Video): links „Firmen“ / „Bauherr:innen“ filterte nicht – Filterwert ist der Name der Art („Firma“), nicht die Beschriftung
      await p.click('[data-adr="k:firma"]'); await p.waitForTimeout(200);
      pruef(await zahl(p) === 2, `links „Firmen“: nur die Firmen (2) – ${await zahl(p)}`);
      // 22.11.2026 (Mock „Adressen: Filter sammeln“): ein weiterer Eintrag derselben Gruppe kommt mit ODER dazu, ein zweiter Klick nimmt ihn heraus
      await p.click('[data-adr="k:bauherr"]'); await p.waitForTimeout(200);
      let st = await p.evaluate(() => ({ an: [...document.querySelectorAll('#navL .ni.on')].map((x) => x.dataset.adr).join(','), satz: AF.satz() }));
      pruef(await zahl(p) === 3 && st.an === 'k:firma,k:bauherr' && /Firma ODER Bauherr/.test(st.satz), `Firmen + Bauherr:innen: ODER, beide markiert – ${await zahl(p)} · ${JSON.stringify(st)}`);
      await p.click('[data-adr="g:Dachdecker"]'); await p.waitForTimeout(200);
      st = await p.evaluate(() => AF.satz());
      pruef(await zahl(p) === 1 && /\) UND Dachdecker/.test(st), `andere Gruppe kommt mit UND dazu – ${await zahl(p)} · ${st}`);
      await p.click('.adr-flt .bpf-zw'); await p.waitForTimeout(200);
      pruef(await zahl(p) === 3 && /ODER Dachdecker/.test(await p.evaluate(() => AF.satz())), `Klick auf UND tauscht zu ODER – ${await zahl(p)}`);
      await p.click('[data-adr="g:Dachdecker"]'); await p.click('[data-adr="k:firma"]'); await p.waitForTimeout(200);
      pruef(await zahl(p) === 1 && await p.evaluate(() => kind) === 'bauherr', `zweiter Klick nimmt heraus – ${await zahl(p)}`);
      await p.click('[data-adr="k:"]'); await p.waitForTimeout(200);
      await p.click('[data-adr="b"]'); await p.waitForTimeout(200); await p.click('[data-adr="b"]'); await p.waitForTimeout(300);
      pruef(!(await p.evaluate(() => !!document.querySelector('[data-f="ja"]'))), 'Frage kommt ein zweites Mal');
      await ctx.close(); }
    { const { ctx, p } = await lauf({ ohne_projekt: true, gefragt: true });
      pruef(await zahl(p) === 3, `„immer ohne Projekt“: Start ohne Projektfilter (3) – ${await zahl(p)}`);
      // Mock „Adressen rechts“ (AR-1 … AR-5 A, 22.11.2026): Klick zeigt rechts, ↓ blättert, Doppelklick öffnet die Maske; die Liste nutzt die Breite
      await p.waitForSelector('#adrW > .sr-r', { timeout: 5000 });
      const pz = await p.evaluate(() => { ADR_ORDL = ['A528 Neubau Kita Essen']; return adrProjekteHtml({ projects: ['T101 Haus'], projektnr: ['T101', 'A528', 'Z900'], projektnr_offen: ['A528', 'Z900'] }, true); });   // PZ-1: Nummer → Name aus dem Projektordner
      pruef(/A528 Neubau Kita Essen/.test(pz) && /Z900/.test(pz) && (pz.match(/data-adrpjx/g) || []).length === 3, `Projekte am Kontakt: ${pz}`);
      const sp = await p.evaluate(() => ({ k: COLS.map((c) => c[0]), pj: cellVal({ projects: ['A1 X', 'B2 Y'] }, 'projekte') }));   // Spalten Stichwörter/Projekt u. a. (22.11.2026) – hinten angehängt, die gemerkte Wahl zählt nach Nummer
      pruef(['stichworte', 'projekte', 'tags', 'weitere', 'wtel', 'wmail', 'updated'].every((k) => sp.k.includes(k)) && sp.k.indexOf('stichworte') > sp.k.indexOf('used') && sp.pj === 'A1 X, B2 Y', `Spalten der Tabelle: ${JSON.stringify(sp)}`);
      await p.click('#tw tbody tr[data-id="3"] td.ro'); await p.waitForTimeout(200);   // Tabelle: Klick in eine Zeile zeigt rechts
      pruef(await p.evaluate(() => (document.querySelector('.sr-r .adr-r h3') || {}).textContent === 'Fam. Muster'), 'Tabelle: Klick zeigt den Kontakt rechts');
      await p.evaluate(() => setView('karten')); await p.waitForSelector('#list .ct');
      await p.click('#list .ct[data-id="1"]'); await p.waitForTimeout(200);
      let r = await p.evaluate(() => ({ t: (document.querySelector('.sr-r .adr-r h3') || {}).textContent, on: !!document.querySelector('#list .ct.on[data-id="1"]'), maske: !!document.querySelector('.modal-bg, .bph-dlg'),
        reiter: [...document.querySelectorAll('.sr-r [role="tab"], .sr-r .sr-tab')].map((x) => x.textContent.trim()).filter(Boolean),
        luecke: Math.round(document.querySelector('#adrW > .sr-r').getBoundingClientRect().left - document.querySelector('#list').getBoundingClientRect().right) }));
      pruef(r.t === 'Dach GmbH' && r.on && !r.maske && r.luecke < 40, `Klick zeigt den Kontakt rechts, keine leere Fläche – ${JSON.stringify(r)}`);
      await p.keyboard.press('ArrowDown'); await p.waitForTimeout(150);
      pruef(await p.evaluate(() => { const K = [...document.querySelectorAll('#list .ct')], n = K[K.findIndex((k) => k.dataset.id === '1') + 1]; return !!n && ADR_SEL === +n.dataset.id && document.activeElement === n; }), '↓ blättert zur nächsten Karte');
      await p.dblclick('#list .ct[data-id="2"]'); await p.waitForTimeout(400);
      pruef(await p.evaluate(() => !!document.querySelector('.modal-bg, .bph-dlg, .bpk')), 'Doppelklick öffnet die Kontaktmaske');
      await ctx.close(); }
    {   // Video 22.11.2026: Gewerk weiter unten in der Navigation anklicken, während das Suchfeld den Fokus hatte – die Navigation rollte nach oben
      const { ctx, p } = await lauf({ ohne_projekt: true, gefragt: true });
      await p.setViewportSize({ width: 1400, height: 360 }); await p.evaluate(() => { document.querySelector('#navL').style.width = '150px'; }); await p.waitForTimeout(200);   // schmal: der zweite Wert bricht im Filterkasten um – der Kasten oben wächst
      await p.click('[data-adr="g:Dachdecker"]'); await p.waitForTimeout(200);   // wie im Video: ein Gewerk ist schon gewählt (Kasten oben steht), dann ein anderes weiter unten
      await p.click('.adr-flt .bpf-in');
      const y0 = await p.evaluate(() => { let s = document.querySelector('[data-adr="g:Putz"]'); while (s && !(s.scrollHeight > s.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(s).overflowY))) s = s.parentElement;
        if (!s) return -1; s.scrollTop = s.scrollHeight; return s.scrollTop > 0 ? document.querySelector('[data-adr="g:Putz"]').getBoundingClientRect().top : -1; });
      const h0 = await p.evaluate(() => document.querySelector('.adr-flt').offsetHeight);
      await p.click('[data-adr="g:Putz"]'); await p.waitForTimeout(300);
      const y1 = await p.evaluate(() => document.querySelector('[data-adr="g:Putz"]').getBoundingClientRect().top);   // der angeklickte Punkt bleibt, wo er war – auch wenn oben der Filterkasten wächst
      pruef(await p.evaluate((h) => document.querySelector('.adr-flt').offsetHeight > h, h0), 'Prüfung greift nicht: der Filterkasten oben wächst beim zweiten Gewerk nicht');
      pruef(y0 > 0 && Math.abs(y1 - y0) < 2 && await zahl(p) === 2, `Gewerk unten in der Navigation: Navigation bleibt stehen, Filter greift – vorher ${y0}, nachher ${y1}, ${await zahl(p)} Treffer`);
      await p.click('.adr-flt .bpf-in'); await p.keyboard.type('Mus', { delay: 60 }); await p.waitForTimeout(300);   // Tippen zeichnet die Navigation neu – das Feld behält Fokus und Text (ohne Merk-Krücke)
      const tp = await p.evaluate(() => ({ fokus: document.activeElement && document.activeElement.classList.contains('bpf-in'), wert: document.querySelector('.adr-flt .bpf-in').value }));
      pruef(tp.fokus && tp.wert === 'Mus', `Tippen im Filterfeld: Fokus und Text bleiben – ${JSON.stringify(tp)}`);
      await ctx.close(); }
    {   // lange Gruppen: passt die Navigation nicht ohne Rollen, nur Gewähltes und zuletzt Benutztes, darüber ein Suchfeld mit Vervollständigung (GW-1 C)
      const K = ['Abbruch', 'Dachdecker', 'Elektro', 'Estrich', 'Fliesen', 'Gerüst', 'Heizung', 'Maler', 'Putz', 'Sanitär', 'Tischler', 'Zimmerer'].map((t, i) => ({ id: i + 1, name: t + ' GmbH', kind: 'firma', trade: t, projects: [], site_of: '' }));
      const { ctx, p } = await lauf({ ohne_projekt: true, gefragt: true }, K);
      await p.setViewportSize({ width: 1400, height: 520 }); await p.evaluate(() => render()); await p.waitForTimeout(200);
      let st = await p.evaluate(() => ({ su: !!document.querySelector('.adr-su[data-adrsu="g"]'), gw: document.querySelectorAll('#navL [data-adr^="g:"]').length }));
      pruef(st.su && st.gw === 0, `lange Gewerke-Liste: Suchfeld statt Liste – ${JSON.stringify(st)}`);
      await p.click('.adr-su[data-adrsu="g"]'); await p.keyboard.type('Flie', { delay: 40 }); await p.waitForSelector('.bp-vs-z', { timeout: 3000 }); await p.click('.bp-vs-z'); await p.waitForTimeout(300);
      st = await p.evaluate(() => ({ w: AF.werte('gewerk').join(), an: [...document.querySelectorAll('#navL .ni.on')].map((x) => x.dataset.adr).join(',') }));
      pruef(st.w === 'Fliesen' && /g:Fliesen/.test(st.an) && await zahl(p) === 1, `Vorschlag „Fliesen“ wird Filter und steht links als gewählt – ${JSON.stringify(st)}`);
      await ctx.close(); }
    {   // Adressen einlesen (GO 22.11.2026, AE-1 … AE-7 A): Datei → Vorschau mit Spalten und Kontakten, Spalte umstellen fragt den Server neu, Einlesen schickt die Kontakte
      const gesendet = [], K1 = [{ name: 'Dach Eins GmbH', art: '', gewerke: ['Dachdecker'], zip: '45127', city: 'Essen', personen: [{ anrede: 'Herr', name: 'Max Beispiel' }, { anrede: 'Frau', name: 'Eva Muster' }], projekte: [], stichworte: [], aktion: 'neu', schon: null },
        { name: 'Dach GmbH', art: '', gewerke: ['Dachdecker'], personen: [], projekte: [], stichworte: [], aktion: 'ergaenzen', schon: { id: 1, name: 'Dach GmbH' } }];
      const { ctx, p } = await lauf({ ohne_projekt: true, gefragt: true }, KONT0, (pf, q) => {
        if (pf === 'api/contacts/einlesen/datei') return { kopf: ['Gewerk', 'Müller'], zeilen: [['Dachdecker', 'Dach Eins GmbH']], spalten: ['gewerk', 'firma'], felder: { '': '– nicht einlesen –', gewerk: 'Gewerk', firma: 'Firma / Name', notiz: 'Notizen' }, kontakte: K1, summe: {} };
        if (pf === 'api/contacts/einlesen/ordnen') { gesendet.push(['ordnen', JSON.parse(q.postData())]); return { kontakte: K1 }; }
        if (pf === 'api/contacts/einlesen') { gesendet.push(['einlesen', JSON.parse(q.postData())]); return { ok: true, neu: 1, ergaenzt: 1 }; }
        if (pf.startsWith('api/bp/aufraeumen/')) return { vorschlaege: [], werte: [] };   // danach öffnet „Aufräumen“ (AE-7)
        if (pf === 'api/contacts/duplikate') return [];
        return null; });
      const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click('#einlesen')]);
      await fc.setFiles({ name: 'liste.xlsx', mimeType: 'application/octet-stream', buffer: Buffer.from('x') });
      await p.waitForSelector('.ae-t tbody tr', { timeout: 5000 });
      let st = await p.evaluate(() => ({ zeilen: document.querySelectorAll('.ae-t tbody tr').length, schon: !!document.querySelector('.ae-t tr.schon [data-aeakt]'), personen: /2 Personen/.test(document.querySelector('.ae-t').textContent), sum: document.querySelector('.ae-sum').textContent }));
      pruef(st.zeilen === 2 && st.schon && st.personen && /1 Kontakte neu · 1 ergänzen/.test(st.sum), `Einlesen – Vorschau: ${JSON.stringify(st)}`);
      await p.click('[data-aesp="1"]'); await p.click('.pickm [data-i="3"]'); await p.waitForTimeout(300);
      pruef(gesendet[0] && gesendet[0][0] === 'ordnen' && gesendet[0][1].spalten[1] === 'notiz', `Spalte umgestellt → neu geordnet: ${JSON.stringify(gesendet[0])}`);
      await p.click('.ae-t tr.schon [data-aeakt]'); await p.click('.pickm [data-i="1"]'); await p.waitForTimeout(150);   // überspringen
      await p.click('.modal [data-m="ok"]'); await p.waitForTimeout(400);
      const e = gesendet.find((x) => x[0] === 'einlesen');
      pruef(e && e[1].kontakte.length === 2 && e[1].kontakte[1].aktion === 'ueberspringen', `Einlesen schickt die Kontakte mit Wahl: ${JSON.stringify(e && e[1].kontakte.map((k) => k.aktion))}`);
      await ctx.close(); }
    {   // Auswählen (GO 23.11.2026, Mock „Adressen auswählen“ AW-1 … AW-5 A): Haken, Strg = dazu/ab, Umschalt = von … bis, Kopf = alle gefilterten,
        // Leiste unten schwebt (die Liste bewegt sich nicht), Auswahl bleibt beim Filtern, gemeinsames Ändern mit einem Rückgängig
      const gesendet = [], K4 = [...KONT0, { id: 4, name: 'Zimmerei Holz', kind: 'firma', trade: 'Zimmerer', projects: [], site_of: '', email: 'h@holz.test' }];
      const { ctx, p } = await lauf({ ohne_projekt: true, gefragt: true }, K4, (pf, q) => {
        if (pf === 'api/contacts/mehr') { const d = JSON.parse(q.postData()); gesendet.push(d); return { ok: true, n: d.ids.length, alt: Object.fromEntries(d.ids.map((i) => [i, { trade: '' }])) }; }
        if (pf === 'api/contacts/mehr/zurueck') { gesendet.push({ zurueck: JSON.parse(q.postData()) }); return { ok: true }; }
        if (pf === 'api/bp/layouts/adressen/wahl') return { bereich: 'adressen', vorgabe: 'v1', layouts: [{ id: 'v1', name: 'Startversion', format: 'A4 quer' }], werte: { v1: {} }, optionen: [{ key: 'notizen', name: 'Spalte Notizen', typ: 'bool', std: false }] };
        return null; });
      await p.evaluate(() => setView('tabelle')); await p.waitForSelector('#tw tbody tr[data-id="1"]');
      const reihe = await p.evaluate(() => tableRows().map((c) => c.id));
      const y0 = await p.evaluate(() => document.querySelector('#tw tbody tr[data-id="1"]').getBoundingClientRect().top);
      await p.click(`#tw tbody tr[data-id="${reihe[0]}"] [data-adrck]`);
      await p.click(`#tw tbody tr[data-id="${reihe[2]}"] td.ro`, { modifiers: ['Shift'] });
      let st = await p.evaluate(() => ({ S: [...AW.S].sort(), sel: document.querySelectorAll('#tw tbody tr.sel').length, leiste: !document.querySelector('#adrSel').hidden && /3 von \d+ gewählt/.test(document.querySelector('#adrSel').textContent),
        kopf: document.querySelector('#tw [data-adrckall]').indeterminate, n: document.querySelector('#adrN').textContent, ckx: (() => { const c = document.querySelector('#tw tbody tr [data-adrck]').getBoundingClientRect(), t = document.querySelector('#tw tbody tr td.nm').getBoundingClientRect(); return Math.round(c.left - t.left); })(), y: document.querySelector('#tw tbody tr[data-id="1"]').getBoundingClientRect().top, rechts: (document.querySelector('.sr-r .adr-r h3') || {}).textContent || '' }));
      pruef(st.S.length === 3 && st.sel === 3 && st.leiste && st.kopf && st.y === y0 && st.n === '3 gewählt' && st.ckx < 15, `Haken + Umschalt = von … bis, Leiste schwebt, nichts springt: ${JSON.stringify(st)} (vorher y ${y0})`);
      await p.click(`#tw tbody tr[data-id="${reihe[1]}"] td.ro`, { modifiers: ['Control'] });
      pruef(await p.evaluate(() => AW.S.size) === 2, 'Strg+Klick nimmt heraus');
      await p.click('#tw [data-adrckall]');
      pruef(await p.evaluate(() => AW.S.size === 4 && document.querySelector('#tw [data-adrckall]').checked), 'Haken im Kopf = alle gefilterten');
      await p.click('[data-adr="k:bauherr"]'); await p.waitForTimeout(200);
      st = await p.evaluate(() => ({ n: AW.S.size, t: document.querySelector('#adrSel').textContent.replace(/\s+/g, ' ') }));
      pruef(st.n === 4 && /dazu 3 gewählte, die der Filter gerade ausblendet/.test(st.t), `Auswahl bleibt beim Filtern (AW-4): ${JSON.stringify(st)}`);
      await p.click('#adrSel [data-aw="sicht"]');
      pruef(await p.evaluate(() => [...AW.S].join()) === '3', '„nur sichtbare“');
      await p.click('[data-adr="k:bauherr"]'); await p.waitForTimeout(200);
      await p.click('#tw tbody'); await p.keyboard.press('Control+a');
      pruef(await p.evaluate(() => AW.S.size) === 4, 'Strg+A = alle gefilterten');
      await p.click('#adrSel [data-aw="aendern"]'); await p.click('.pickm .pm-o:has-text("Gewerk dazu")'); await p.waitForTimeout(100);
      await p.click('.pickm .pm-o:has-text("Zimmerer")'); await p.waitForTimeout(400);
      pruef(gesendet[0] && gesendet[0].feld === 'trade' && gesendet[0].op === 'dazu' && gesendet[0].wert === 'Zimmerer' && gesendet[0].ids.length === 4, `gemeinsam ändern in EINER Anfrage: ${JSON.stringify(gesendet[0])}`);
      await p.evaluate(() => window.rueckgaengig && document.querySelector('.bf-undo button, .bph-uk button') && document.querySelector('.bf-undo button, .bph-uk button').click()); await p.waitForTimeout(400);
      pruef(gesendet.some((x) => x.zurueck && x.zurueck.alt), `ein Rückgängig für alle: ${JSON.stringify(gesendet.slice(1))}`);
      await p.click('#adrSel [data-aw="mail"]'); await p.waitForSelector('.bpv', { timeout: 5000 });
      st = await p.evaluate(() => ({ an: document.querySelectorAll('.bpv .bph-skw').length, text: (document.querySelector('.bpv [data-text]') || {}).value || '', hin: /keine E-Mail-Adresse/.test(document.querySelector('.bpv').textContent) }));
      pruef(st.an >= 1 && /^\{anrede\}/.test(st.text) && st.hin, `Mail an alle: gemeinsamer Versand, {anrede}, Hinweis auf Kontakte ohne Adresse – ${JSON.stringify(st)}`);
      await p.screenshot({ path: process.env.AW_BILD || '/dev/null' }).catch(() => {});
      await p.click('.bpv .bpv-x'); await p.waitForTimeout(200);
      await p.evaluate(() => { const o0 = window.bpDruck; window.bpDruck = (o) => { window.__druck = o; return o0(o); }; });   // Drucken der Auswahl: gemeinsame Druckseite, Druck-Layout „Adressverzeichnis“ (23.11.2026)
      await p.click('#adrSel [data-aw="mehr"]'); await p.click('.pickm .pm-o:has-text("Drucken")'); await p.waitForSelector('.bed-bar', { timeout: 5000 });
      st = await p.evaluate(() => ({ b: window.__druck.bereich, u: decodeURIComponent(window.__druck.url([])), lay: !!document.querySelector('[data-layw] [data-opt="notizen"]') }));
      pruef(st.b === 'adressen' && /export\.pdf\?ids=[\d,]+&filter=Auswahl/.test(st.u.replace(/%2C/g, ',')) && st.lay, `Drucken der Auswahl über bpDruck mit Layout: ${JSON.stringify(st)}`);
      await p.click('.bed-bar [data-d="x"]'); await p.waitForTimeout(200);
      await p.keyboard.press('Escape'); await p.click('#tw tbody'); await p.keyboard.press('Escape');
      pruef(await p.evaluate(() => AW.S.size === 0 && document.querySelector('#adrSel').hidden), 'Esc hebt die Auswahl auf');
      await ctx.close(); }
    {   // 23.11.2026: Spaltenfilter mit Vervollständigung der vorhandenen Werte (auch Teile von Listen), frei tippen geht; das Feld bleibt stehen
      const K5 = [...KONT0, { id: 4, name: 'Holz AG', kind: 'firma', trade: 'Dachdecker, Zimmerarbeiten', projects: [], site_of: '' }, { id: 5, name: 'Zimmerei Nord', kind: 'firma', trade: 'Zimmerarbeiten', projects: [], site_of: '' }];
      const { ctx, p } = await lauf({ ohne_projekt: true, gefragt: true }, K5);
      await p.evaluate(() => setView('tabelle')); await p.waitForSelector('#tw [data-flt="trade"]');
      await p.evaluate(() => { window.__fi = document.querySelector('#tw [data-flt="trade"]'); });
      await p.click('#tw [data-flt="trade"]'); await p.keyboard.type('zim'); await p.waitForTimeout(250);
      const r = await p.evaluate(() => ({ gleich: window.__fi === document.querySelector('#tw [data-flt="trade"]') && document.activeElement === window.__fi,
        vs: [...document.querySelectorAll('.bp-vs-z b')].map((b) => b.textContent), ids: [...document.querySelectorAll('#tw tbody tr[data-id]')].map((t) => +t.dataset.id) }));
      pruef(r.gleich, 'Spaltenfilter: das Feld wird beim Tippen neu gebaut (Fokus/Vorschlagsliste gehen verloren)');
      pruef(r.vs[0] === 'Zimmerarbeiten', `Spaltenfilter: Vervollständigung ${JSON.stringify(r.vs)}`);
      pruef(r.ids.join() === '4,5', `Spaltenfilter „zim“: Zeilen ${r.ids}`);
      await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter'); await p.waitForTimeout(200);
      pruef(await p.evaluate(() => document.querySelector('#tw [data-flt="trade"]').value) === 'Zimmerarbeiten', 'Spaltenfilter: Vorschlag wird nicht übernommen');
      await ctx.close(); }
  } catch (e) { fehler.push("Prüfung bricht ab – " + String(e.message).split("\n").slice(0, 3).join(' | ')); }
  return fehler;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await adrStartPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
  await b.close(); console.log(f.length ? f.join('\n') : 'ok'); process.exit(f.length ? 1 : 0);
}
