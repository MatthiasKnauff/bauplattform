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
  const XL = { datei: 'kosten.xls', fassung: '2008', summe: 9200, liste: ['322', '441'], zeilen: [{ id: 'xl:1', kg: '322', kg_alt: '324', name: 'Betrag 1', name_alt: 'Unterböden', betrag: 5000 },
    { id: 'xl:2', kg: '322', kg_alt: '324', name: 'Betrag 2', name_alt: 'Unterböden', betrag: 1200 }, { id: 'xl:3', kg: '441', kg_alt: '441', name: 'Hochspannung', name_alt: 'Hochspannung', betrag: 3000 }],
    befunde: [{ art: 'umgesetzt', kg: '322', text: '324 → 322' }, { art: 'pruefen', kg: '441', nach: '444', text: '441 – meist 444' }, { art: 'luecke', kg: '391', text: '391: 0 €' }] };
  const p = await browser.newPage({ viewport: { width: 1500, height: 950 } });
  p.on('pageerror', (e) => fehler.push('Fehler im Skript – ' + e.message));
  await p.route('http://kosten.test/**', (r) => {
    const q = r.request(), pf = new URL(q.url()).pathname.replace(/^\//, ''), J = (o, st) => r.fulfill({ status: st || 200, contentType: 'application/json', body: JSON.stringify(o) });
    if (pf === '') return r.fulfill({ contentType: 'text/html', body: fs.readFileSync(path.join(repo, 'plattform/static/baukosten.html')) });
    if (pf.startsWith('static/')) return r.fulfill({ contentType: pf.endsWith('.css') ? 'text/css' : 'text/javascript', body: fs.readFileSync(path.join(repo, 'plattform/static', pf.slice(7))) });
    if (pf === 'bp/baukasten.js') return r.fulfill({ contentType: 'text/javascript', body: baukasten });
    if (pf.startsWith('bp/')) { const f = path.join(KASTEN, pf.slice(3)); return fs.existsSync(f) ? r.fulfill({ contentType: f.endsWith('.css') ? 'text/css' : 'text/javascript', body: fs.readFileSync(f) }) : r.fulfill({ status: 404, body: '' }); }
    if (pf === 'api/me') return J({ ok: true, id: 1, name: 'admin', vorname: 'A', role: 'admin', admin: true, is_admin: true, look: {} });
    if (pf === 'api/bp/kopf') return J({ conf: { apps: [], projekte: [] }, projekt: { id: 7, name: 'Testprojekt', nummer: 'A1' } });
    if (pf === 'api/platform') return J({ apps: [], user: { name: 'admin', role: 'admin' }, projekte: [] });
    if (pf === 'api/bp/projekt') return J({ id: 7, name: 'Testprojekt', nummer: 'A1' });
    if (pf === 'api/bk') return J([{ id: 1, name: 'Startversion', project_id: 7, gueltig: true, total: 11880 }]);
    if (pf === 'api/bk/1' && q.method() === 'DELETE') { S.weg = true; return J({ ok: true, papierkorb: 5 }); }
    if (pf === 'api/bk/1' && q.method() === 'PUT') { const b = JSON.parse(q.postData() || '{}'); S.put.push(b); S.rev++; if (b.data) S.preise = b.data.preise; if (b.stufe) S.stufe = b.stufe; return J(bk()); }
    if (pf === 'api/bk/1' || pf === 'api/bk/2') return J(bk());   // 2 = neu aus Excel
    if (pf === 'api/bk/excel/vorschau') { S.vorschau = (q.postDataBuffer() || '').length; return J(XL); }
    if (pf === 'api/bk/excel') { S.excelNeu = JSON.parse(q.postData() || '{}'); return J({ id: 2 }); }
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
    {   // Heftzwecke wie in Ausschreibung und Bauzeitenplan (21.11.2026): ein Klick blendet die Befehlsleiste aus, der nächste holt sie zurück
      const h = await p.evaluate(() => { const b = document.querySelector('.bf-heftz .bf-heft'); if (!b) return null; b.click(); const zu = document.getElementById('bfl').classList.contains('bf-zu'); b.click(); return { zu, wieder: !document.getElementById('bfl').classList.contains('bf-zu') }; });
      pruef(h && h.zu && h.wieder, `Heftzwecke über den Kosten: ${JSON.stringify(h)}`); }
    pruef(!a.quer, 'waagerechter Scrollbalken');
    const bf = await p.evaluate(() => [...document.querySelectorAll('#bfl .bf-gt')].map((x) => x.textContent.trim()).join('|'));   // Befehlsleiste wie in allen Apps
    pruef(/^Rückgängig\|Neu\|Modell\|Ausgabe/.test(bf) && /Ansicht$/.test(bf), `Befehlsleiste: ${bf}`);
    pruef(!(await p.$('#view [data-bkdruck]')), 'Drucken steht in der Befehlsleiste, nicht mehr in der Karte');
    await p.click('[data-bkueb]'); await p.waitForTimeout(250);
    pruef(S.ueb === 1 && !(await p.$('[data-bkueb]')), 'Übernehmen aus dem Projektmodell');
    await p.click('[data-bkstufe="anschlag"]'); await p.waitForTimeout(250);
    pruef(S.put.at(-1) && S.put.at(-1).stufe === 'anschlag', 'Stufe wechseln');
    await p.evaluate(() => [...document.querySelectorAll('#navL [data-tab]')].find((x) => /Bauteile/.test(x.textContent)).click()); await p.waitForSelector('[data-bkep="f"]');
    await p.fill('[data-bkep="f"]', '900'); await p.press('[data-bkep="f"]', 'Tab'); await p.waitForTimeout(300);
    const put = S.put.at(-1);
    pruef(put && put.data && put.data.preise && put.data.preise.f === 900 && put.rev, `Preis von Hand: ${JSON.stringify(put)}`);
    await p.fill('[data-bkmg="f"]', '12'); await p.press('[data-bkmg="f"]', 'Tab'); await p.waitForTimeout(300);   // Menge hier ändern → Vorschlag ans Modell (Kern)
    const pm = S.put.at(-1);
    pruef(pm && pm.data && pm.data.mengen && pm.data.mengen.f === 12, `Menge von Hand: ${JSON.stringify(pm)}`);
    await p.evaluate(() => [...document.querySelectorAll('#navL [data-tab]')].find((x) => /DIN/.test(x.textContent)).click()); await p.waitForSelector('.bk-din');
    pruef(await p.evaluate(() => /Außenwände/.test(document.querySelector('.bk-din').textContent)), 'DIN 276 zeigt die 2. Ebene nicht');
    {   // Excel-Kostenberechnung (23.11.2026): Einlesen über die Befehlsleiste, Vorschau mit 441 → 444, Seite DIN 276 wie die Liste
      const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.evaluate(() => [...document.querySelectorAll('#bfl button')].find((b) => /Aus Excel/.test(b.textContent)).click())]);
      await fc.setFiles({ name: 'kosten.xls', mimeType: 'application/vnd.ms-excel', buffer: Buffer.from('xls') });
      await p.waitForSelector('[data-bkxv]');
      await p.click('[data-bkxv] [data-bkxnach]'); await p.waitForTimeout(100);
      pruef(await p.evaluate(() => !document.querySelector('[data-bkxv] [data-bkxnach]')), 'Vorschau: Vorschlag 441 → 444 bleibt stehen');
      await p.click('.modal [data-m="ok"]'); await p.waitForTimeout(400);
      const x = S.excelNeu && S.excelNeu.excel;
      pruef(S.vorschau > 0 && x && S.excelNeu.project_id === 7 && x.zeilen.some((z) => z.kg === '444') && !x.befunde.some((b) => b.nach), `Excel übernehmen: ${JSON.stringify(S.excelNeu)}`);
      await p.evaluate((X) => { B = { ...B, data: { ...B.data, excel: { ...X, am: '2026-11-23', von: 'admin', gelesen: false } },
        calc: { ...B.calc, zeilen: X.zeilen.map((z) => ({ ...z, quelle: 'excel', bereich: 'excel' })), total: 9200, brutto: 10948, risiko: 0 }, din: { ...B.din, 320: 'Gründung', 322: 'Flachgründungen und Bodenplatten', 323: 'Tiefgründungen', 440: 'Elektrische Anlagen', 441: 'Hoch- und Mittelspannungsanlagen' } }; tab = 'din'; zeichne(); }, XL);
      const v = await p.evaluate(() => ({ t: document.querySelector('.bkx-t').innerText, hw: !!document.querySelector('.bkx-hw [data-bkxnach]'), ee: document.querySelectorAll('.bkx-t tr.ee').length }));
      pruef(/war 324/.test(v.t) && /ergänzt/.test(v.t) && /2 Beträge/.test(v.t) && v.hw && v.ee === 0, `DIN 276 aus Excel: ${JSON.stringify(v)}`);
      await p.click('[data-bkxk="322"]'); await p.waitForTimeout(100);
      pruef(await p.evaluate(() => document.querySelectorAll('.bkx-t tr.ee').length) === 2, 'Einzelbeträge aufklappen');
      const n = S.put.length; await p.click('.bkx-hw [data-bkxnach]'); await p.waitForTimeout(300);
      const pu = S.put[n]; pruef(pu && pu.data.excel.zeilen.filter((z) => z.kg === '444').length === 1, `Vorschlag auf der Seite: ${JSON.stringify(pu && pu.data.excel)}`);
      // 23.11.2026: bearbeiten wie in der Liste – Betrag in der Zelle, ＋ in einer leeren KG, ✕ entfernt; KG 700 = Baunebenkosten fest
      const xl = () => p.evaluate((X) => { B = { ...B, data: { ...B.data, preise: { 'xl:3': 2900 }, excel: { ...X, am: '2026-11-23', gelesen: true } },
        calc: { ...B.calc, zeilen: X.zeilen.map((z) => ({ ...z, quelle: 'excel' })), total: 9200, brutto: 10948, risiko: 0 }, din: { ...B.din, 320: 'Gründung', 322: 'Flachgründungen', 323: 'Tiefgründungen', 440: 'Elektrische Anlagen', 441: 'Hochspannung', 444: 'Niederspannung' } }; tab = 'din'; zeichne(); }, XL);
      await xl(); let m = S.put.length;
      await p.fill('[data-bkxb="xl:3"]', '3.500,5'); await p.press('[data-bkxb="xl:3"]', 'Tab'); await p.waitForTimeout(300);
      let q = S.put[m]; pruef(q && q.data.excel.zeilen.find((z) => z.id === 'xl:3').betrag === 3500.5 && !('xl:3' in q.data.preise) && q.data.nk_fest === 0, `Betrag in der Zelle: ${JSON.stringify(q && q.data)}`);
      await xl(); m = S.put.length; await p.click('[data-bkxneu="323"]', { force: true }); await p.waitForTimeout(300);
      q = S.put[m]; const neu = q && q.data.excel.zeilen.find((z) => z.kg === '323');
      pruef(neu && neu.id === 'xl:4' && neu.betrag === 0 && neu.name === 'Tiefgründungen', `＋ Betrag in leerer KG: ${JSON.stringify(q && q.data.excel.zeilen)}`);
      await xl(); m = S.put.length;   // 322 ist von oben noch aufgeklappt
      await p.click('[data-bkxweg="xl:2"]', { force: true }); await p.waitForTimeout(300);
      q = S.put[m]; pruef(q && q.data.excel.zeilen.length === 2 && !q.data.excel.zeilen.some((z) => z.id === 'xl:2'), `✕ entfernt den Betrag: ${JSON.stringify(q && q.data.excel.zeilen)}`);
      await xl(); m = S.put.length;
      await p.fill('[data-bkxkg="xl:1"]', '715'); await p.press('[data-bkxkg="xl:1"]', 'Tab'); await p.waitForTimeout(300);
      q = S.put[m]; pruef(q && q.data.excel.zeilen.find((z) => z.id === 'xl:1').kg === '715' && q.data.nk_fest === 5000, `KG ändern, KG 700 fest: ${JSON.stringify(q && q.data)}`);
    }
    {   // 20.11.2026: die aktuelle Version lässt sich wie in den anderen Apps über das Versionsmenü löschen (Papierkorb, Rückgängig)
      await p.click('.bk-vm-nav [data-vm="dd"]'); await p.waitForSelector('.bph-vm-m [data-vm="verw"]');
      await p.click('.bph-vm-m [data-vm="verw"]'); await p.waitForTimeout(300);
      pruef(await p.evaluate(() => /Startversion.*Papierkorb/.test(document.body.innerText) && /gültige Kostenermittlung/.test(document.body.innerText)), 'Löschen der gültigen Version fragt nicht nach');
      await p.evaluate(() => [...document.querySelectorAll('button')].filter((b) => b.textContent.trim() === 'Löschen').pop().click()); await p.waitForTimeout(400);
      pruef(S.weg === true, 'Version löschen geht nicht an den Server');
    }
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
