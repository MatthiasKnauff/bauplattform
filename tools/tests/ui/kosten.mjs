// Kosten (plattform/static/baukosten.js, Entwurf „Kosten aus Bauteilen“ vom 16.11.2026): Übersicht mit Summen und Genauigkeits-Band,
// Hinweis „Projektmodell geändert → übernehmen“, Bauteile mit Preis überschreiben (PUT nur preise), DIN 276, Stufe wechseln; Reiter „Bauteile“
// rechts (Checkliste); ohne Kostenermittlung „anlegen“. Ablauftest im echten Browser mit nachgebildetem Server.
//
// Aufgerufen aus oberflaeche.mjs:  const fehler = await kostenPruefen(browser, repoWurzel)   – allein: node tools/tests/ui/kosten.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

export async function kostenPruefen(browser, repo) {
  const KASTEN = path.join(repo, 'shared/bpcore/head'), fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  const BK = /BAUKASTEN = \(([^)]*)\)/.exec(fs.readFileSync(path.join(repo, 'shared/bpcore/head.py'), 'utf8'))[1].match(/"[^"]+"/g).map((s) => s.slice(1, -1));
  const baukasten = 'void 0;\n' + BK.map((f) => fs.readFileSync(path.join(KASTEN, f), 'utf8')).join('\n;\n');
  const Z = [{ id: 'f', bereich: 'oeffnung', kg: '334', name: 'Fenster F 01–09', mat: 'Fenstertausch', menge: 9, einheit: 'St', ep: 1000, ep_von: 800, ep_bis: 1250, hand: false, code: '334.15.002', betrag: 9000, quelle: 'ifc' }];
  const S = { put: [], ueb: 0, rev: 3 };
  const bk = (mehr = {}) => ({ id: 1, name: 'Startversion', project_id: 7, stufe: S.stufe || 'berechnung', rev: S.rev, data: { bauteile: Z, preise: S.preise || {}, risiko: 10, nk: 20, nk_fest: null, mwst: 19, rate: 3 },
    calc: { zeilen: Z.map((z) => (S.preise && S.preise[z.id] ? { ...z, ep: S.preise[z.id], hand: true, betrag: S.preise[z.id] * 9 } : z)), kg2: { 330: { wert: 9000 } }, kg300: 9000, kg400: 0, bauwerk: 9000, extra: 0, risiko: 900, nk: 1980, total: 11880, mwst: 2257, brutto: 14137, area: 80, kw: 112,
      genau: { unten: 8100, oben: 12500, minus: 10, plus: 38.9, ampel: 'rot', ziel: [20, 25], ziel_quelle: 'OLG Hamm', teile: { preise: 6, markt: 8.2, mengen: 2, offen: 30 }, offen: 1, besser: ['„Elektro“ beantworten (bis 2.700 €)'] } },
    modell: { rev: 5, neu: !S.ueb, zeilen: 1, offen: [{ id: 'frage:elektro', name: 'Elektro', moeglich: 2700 }] }, stufen: [['berechnung', 'Kostenberechnung'], ['anschlag', 'Kostenanschlag']].map(([key, name]) => ({ key, name })),
    din: { 300: 'Bauwerk – Baukonstruktionen', 330: 'Außenwände', 400: 'Bauwerk – Technische Anlagen', 700: 'Baunebenkosten' }, ...mehr });
  const p = await browser.newPage({ viewport: { width: 1500, height: 950 } });
  p.on('pageerror', (e) => fehler.push('Fehler im Skript – ' + e.message));
  await p.route('http://kosten.test/**', (r) => {
    const q = r.request(), pf = new URL(q.url()).pathname.replace(/^\//, ''), J = (o, st) => r.fulfill({ status: st || 200, contentType: 'application/json', body: JSON.stringify(o) });
    if (pf === '') return r.fulfill({ contentType: 'text/html', body: fs.readFileSync(path.join(repo, 'plattform/static/baukosten.html')) });
    if (pf.startsWith('static/')) return r.fulfill({ contentType: pf.endsWith('.css') ? 'text/css' : 'text/javascript', body: fs.readFileSync(path.join(repo, 'plattform/static', pf.slice(7))) });
    if (pf === 'bp/baukasten.js') return r.fulfill({ contentType: 'text/javascript', body: baukasten });
    if (pf.startsWith('bp/')) { const f = path.join(KASTEN, pf.slice(3)); return fs.existsSync(f) ? r.fulfill({ contentType: f.endsWith('.css') ? 'text/css' : 'text/javascript', body: fs.readFileSync(f) }) : r.fulfill({ status: 404, body: '' }); }
    if (pf === 'api/me') return J({ ok: true, id: 1, name: 'admin', vorname: 'A', role: 'admin', admin: true, is_admin: true, look: {} });
    if (pf === 'api/platform') return J({ apps: [], user: { name: 'admin', role: 'admin' }, projekte: [] });
    if (pf === 'api/bp/projekt') return J({ id: 7, name: 'Testprojekt', nummer: 'A1' });
    if (pf === 'api/bk') return J([{ id: 1, name: 'Startversion', project_id: 7, gueltig: true, total: 11880 }]);
    if (pf === 'api/bk/1' && q.method() === 'PUT') { const b = JSON.parse(q.postData() || '{}'); S.put.push(b); S.rev++; if (b.data) S.preise = b.data.preise; if (b.stufe) S.stufe = b.stufe; return J(bk()); }
    if (pf === 'api/bk/1') return J(bk());
    if (pf === 'api/bk/1/uebernehmen') { S.ueb++; return J(bk()); }
    if (pf === 'api/bk/1/flow') return J({ ok: false, why: 'Für das Projekt gibt es keinen Bauzeitenplan.' });
    if (pf.startsWith('api/bp/modell/7')) return J({ modell: { bauteilliste: { zeilen: [], raeume: [], quelle: {} } }, rev: 5 });
    return J(/liste|projekte|neuigkeit|kontakte/.test(pf) ? [] : {});
  });
  try {
    await p.addInitScript(() => { try { localStorage.setItem('bp.projekt', '7'); } catch { /* egal */ } });
    await p.goto('http://kosten.test/'); await p.waitForSelector('#view .bk-band', { timeout: 10000 });
    const a = await p.evaluate(() => ({ nav: [...document.querySelectorAll('#navL [data-tab]')].map((x) => x.textContent.trim()), hw: !!document.querySelector('[data-bkueb]'),
      band: /−10 % \/ \+38,9 %/.test(document.querySelector('#view').textContent), tabs: [...document.querySelectorAll('.sr-tab')].map((x) => x.textContent.trim()), quer: document.documentElement.scrollWidth > innerWidth + 1 }));
    pruef(a.nav.join('|') === 'Übersicht|Bauteile|DIN 276|Mittelabfluss', `Navigation: ${a.nav.join('|')}`);
    pruef(a.hw && a.band, `Übersicht: Hinweis Projektmodell und Band – ${JSON.stringify(a)}`);
    pruef(a.tabs.includes('Bauteile'), `Reiter „Bauteile“ rechts fehlt: ${a.tabs.join('|')}`);
    pruef(!a.quer, 'waagerechter Scrollbalken');
    await p.click('[data-bkueb]'); await p.waitForTimeout(250);
    pruef(S.ueb === 1 && !(await p.$('[data-bkueb]')), 'Übernehmen aus dem Projektmodell');
    await p.click('[data-bkstufe="anschlag"]'); await p.waitForTimeout(250);
    pruef(S.put.at(-1) && S.put.at(-1).stufe === 'anschlag', 'Stufe wechseln');
    await p.evaluate(() => [...document.querySelectorAll('#navL [data-tab]')].find((x) => /Bauteile/.test(x.textContent)).click()); await p.waitForSelector('[data-bkep="f"]');
    await p.fill('[data-bkep="f"]', '900'); await p.press('[data-bkep="f"]', 'Tab'); await p.waitForTimeout(300);
    const put = S.put.at(-1);
    pruef(put && put.data && put.data.preise && put.data.preise.f === 900 && put.rev, `Preis von Hand: ${JSON.stringify(put)}`);
    await p.evaluate(() => [...document.querySelectorAll('#navL [data-tab]')].find((x) => /DIN/.test(x.textContent)).click()); await p.waitForSelector('.bk-din');
    pruef(await p.evaluate(() => /Außenwände/.test(document.querySelector('.bk-din').textContent)), 'DIN 276 zeigt die 2. Ebene nicht');
  } catch (e) { fehler.push('bricht ab – ' + String(e.message).split('\n')[0]); }
  await p.close();
  return fehler;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await kostenPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
  await b.close(); console.log(f.length ? f.join('\n') : 'ok'); process.exit(f.length ? 1 : 0);
}
