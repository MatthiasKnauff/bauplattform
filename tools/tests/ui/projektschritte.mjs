// Projektdaten Schritt für Schritt (GO 19.11.2026, Mock „Ausschreibungsdaten Schritt für Schritt“ C1) – Ablauftest mit nachgebildetem Server.
// Geprüft: (1) erstes Öffnen ohne Angaben = Assistent mit den Grundgruppen (ohne „Ausschreibung (alle LVs)“), Zurück · Weiter · Fertig;
// (2) Weiche „kein Bauantrag“ blendet die Angaben zum Bauantrag aus; (3) mit Angaben die Übersicht mit „Schritt für Schritt“, der Knopf startet den Assistenten.
// Aufgerufen aus oberflaeche.mjs:  const fehler = await projektSchrittePruefen(browser, repoWurzel)   – allein: node tools/tests/ui/projektschritte.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

export async function projektSchrittePruefen(browser, repo) {
  const KASTEN = path.join(repo, 'shared/bpcore/head'), STAT = path.join(repo, 'plattform/static');
  const BK = /BAUKASTEN = \(([^)]*)\)/.exec(fs.readFileSync(path.join(repo, 'shared/bpcore/head.py'), 'utf8'))[1].match(/"[^"]+"/g).map((s) => s.slice(1, -1));
  const baukasten = 'void 0;\n' + BK.map((f) => fs.readFileSync(path.join(KASTEN, f), 'utf8')).join('\n;\n');
  const fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  const BA = ['behoerde', 'gebaeudeklasse'], WEI = Object.fromEntries(BA.map((k) => [k, { ba_noetig: ['Bauantrag nötig'] }]));
  const FELDER = [{ titel: 'Bauherr:in', felder: [{ k: 'bauherr', l: 'Bauherr:in', typ: 'text' }] }, { titel: 'Projekt', felder: [{ k: 'massnahme', l: 'Art der Maßnahme', typ: 'select', opt: ['', 'Neubau'] }] },
    { titel: 'Bauantrag', felder: [{ k: 'ba_noetig', l: 'Bauantrag', typ: 'select', opt: ['', 'Bauantrag nötig', 'kein Bauantrag (verfahrensfrei / Anzeige)'] }, { k: 'behoerde', l: 'Behörde', typ: 'text' }, { k: 'gebaeudeklasse', l: 'Gebäudeklasse', typ: 'text' }] },
    { titel: 'Termine', felder: [{ k: 'baubeginn', l: 'Baubeginn', typ: 'date' }] }, { titel: 'Ausschreibung (alle LVs)', felder: [{ k: 'lv_vergabeart', l: 'Vergabeart', typ: 'text' }] }];

  async function seite(werte) {
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } }), p = await ctx.newPage(), put = [];
    p.on('pageerror', (e) => fehler.push('JavaScript-Fehler: ' + String(e.message || e).split('\n')[0]));
    await p.route('http://ps.test/**', (r) => {
      const u = new URL(r.request().url()), pf = u.pathname.replace(/^\//, '');
      if (pf === '') return r.fulfill({ contentType: 'text/html', body: fs.readFileSync(path.join(STAT, 'portal.html'), 'utf8') });
      if (pf === 'bp/baukasten.js') return r.fulfill({ contentType: 'text/javascript', body: baukasten });
      const f = pf.startsWith('bp/') ? path.join(KASTEN, pf.slice(3)) : pf.startsWith('static/') ? path.join(STAT, pf.slice(7)) : null;
      if (f) return fs.existsSync(f) ? r.fulfill({ contentType: f.endsWith('.css') ? 'text/css' : 'text/javascript', body: fs.readFileSync(f) }) : r.fulfill({ status: 404, body: '' });
      const J = (o) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(o) });
      if (pf === 'api/bp/projekt/5/daten') {
        if (r.request().method() === 'PUT') put.push(JSON.parse(r.request().postData() || '{}').werte);
        return J({ projekt: 'A497 Test', felder: JSON.parse(JSON.stringify(FELDER)), werte: { ...werte, ...(put.length ? put[put.length - 1] : {}) }, plan: { plaene: [] }, satz: { id: 5, name: 'A497 Test', leaders: [] }, druck: [], geerbt: {}, quellen: {}, quelle_app: {}, weichen: WEI });
      }
      if (pf === 'api/me') return J({ ok: true, id: 1, name: 'admin', role: 'admin', admin: false, look: {} });
      if (pf === 'api/platform') return J({ apps: [], projekte: [] });
      if (/(^|\/)api\//.test(pf)) return J(/liste|kontakte|neuigkeit|projekte|verlauf|fehler|leaders/.test(pf) ? [] : {});
      return r.fulfill({ status: 404, body: '' });
    });
    await p.goto('http://ps.test/'); await p.waitForSelector('.bph-who', { timeout: 10000 });
    await p.evaluate(() => BPHead.projektDaten(5, '')); await p.waitForSelector('.bph-dm', { timeout: 10000 });
    return { p, ctx, put };
  }
  const reiter = (p) => p.evaluate(() => [...document.querySelectorAll('.bph-dm [data-dmt]')].filter((b) => !b.hidden).map((b) => b.textContent.replace('●', '').trim()).join('|'));
  let S = await seite({});
  pruef(await reiter(S.p) === 'Bauvorhaben|Bauherr:in|Projekt|Bauantrag|Termine', 'Assistent: Grundgruppen erwartet, sind ' + await reiter(S.p));
  pruef(await S.p.evaluate(() => !document.querySelector('[data-dmw="1"]').hidden && document.querySelector('[data-dms]').hidden), 'Schritt 1: Weiter statt Fertig');
  await S.p.evaluate(() => document.querySelector('[data-dmt="3"]').click()); await S.p.selectOption('#dm_ba_noetig', 'kein Bauantrag (verfahrensfrei / Anzeige)'); await S.p.waitForTimeout(80);
  pruef(await S.p.evaluate(() => !document.querySelector('#dm_behoerde') && !document.querySelector('#dm_gebaeudeklasse')), 'kein Bauantrag: Behörde und Gebäudeklasse ausgeblendet');
  await S.p.selectOption('#dm_ba_noetig', 'Bauantrag nötig'); await S.p.waitForTimeout(80);
  pruef(await S.p.evaluate(() => !!document.querySelector('#dm_behoerde')), 'Bauantrag nötig: Angaben wieder da');
  await S.ctx.close();
  S = await seite({ bauherr: 'Familie Muster' });
  const u = await S.p.evaluate(() => ({ tabs: document.querySelectorAll('.bph-dm [data-dmt]').length, knopf: !!document.querySelector('[data-pschritte]'), lv: [...document.querySelectorAll('.bph-dm details summary b')].some((b) => /alle LVs/.test(b.textContent)) }));
  pruef(!u.tabs && u.knopf && u.lv, 'mit Angaben: Übersicht mit allen Gruppen und „Schritt für Schritt“ – ' + JSON.stringify(u));
  await S.p.click('[data-pschritte]'); await S.p.waitForSelector('.bph-dm [data-dmw="1"]', { timeout: 5000 }).catch(() => {});
  pruef(await reiter(S.p) === 'Bauvorhaben|Bauherr:in|Projekt|Bauantrag|Termine', '„Schritt für Schritt“ startet den Assistenten: ' + await reiter(S.p));
  await S.ctx.close();
  return fehler;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch();
  const f = await projektSchrittePruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
  await b.close(); console.log(f.length ? f.join('\n') : 'ok'); process.exit(f.length ? 1 : 0);
}
