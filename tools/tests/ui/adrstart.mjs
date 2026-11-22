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
  const lauf = async (start, kont = KONT0) => {
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } }), p = await ctx.newPage(), puts = [];
    p.on('pageerror', (e) => fehler.push('Fehler im Skript – ' + e.message));
    await p.route('http://portal.test/**', (r) => { const u = new URL(r.request().url()), pf = u.pathname.replace(/^\/adressen\//, '');
      if (pf === '' ) return r.fulfill({ contentType: 'text/html', body: fs.readFileSync(path.join(repo, 'plattform/static/adressen.html'), 'utf8') });
      if (pf === 'bp/baukasten.js') return r.fulfill({ contentType: 'text/javascript', body: baukasten });
      if (pf.startsWith('static/')) { const f = path.join(repo, 'plattform/static', pf.slice(7)); return fs.existsSync(f) ? r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(f) }) : r.fulfill({ status: 404, body: '' }); }   // eigene Skripte der Seite (adressen-rechts.js …)
      if (pf.startsWith('bp/')) { const f = path.join(KASTEN, pf.slice(3)); return fs.existsSync(f) ? r.fulfill({ contentType: f.endsWith('.css') ? 'text/css' : 'text/javascript', body: fs.readFileSync(f) }) : r.fulfill({ status: 404, body: '' }); }
      if (pf === 'api/ansicht/start') { const d = JSON.parse(r.request().postData() || '{}'); puts.push(d); return r.fulfill(J({ ohne_projekt: !!d.ohne_projekt, gefragt: !!d.gefragt })); }
      if (pf === 'api/me') return r.fulfill(J({ ok: true, id: 1, name: 'admin', is_admin: true, apps: [], start }));
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
  } catch (e) { fehler.push('Prüfung bricht ab – ' + String(e.message).split('\n')[0]); }
  return fehler;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await adrStartPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
  await b.close(); console.log(f.length ? f.join('\n') : 'ok'); process.exit(f.length ? 1 : 0);
}
