// Raumbuch (bp/raumbuch.js, GO 17.11.2026 H1/I1/J1) – nachgebildeter Kern, kein Server.
// Geprüft: Tabelle mit Räumen und Boden/Wand/Decke; Vorschlag grau; Klick öffnet die Liste, Wahl schickt raeume/teil/vorlage;
// angehakte Räume bekommen die Wahl gemeinsam; Fliesenhöhe bei Wandfliesen; „Vorschläge übernehmen“; Rückgängig schickt den alten Stand.
//
// Aufgerufen aus oberflaeche.mjs:  const fehler = await raumbuchPruefen(browser, repoWurzel)   – allein: node tools/tests/ui/raumbuch.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { ESC } from './esc.mjs';

export async function raumbuchPruefen(browser, repo) {
  const K = path.join(repo, 'shared/bpcore/head'), fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  const S = { posts: [] };
  const RB = { raeume: [{ nr: '1.01', name: 'Wohnen', geschoss: 'EG', flaeche: 30 }, { nr: '1.02', name: 'Schlafen', geschoss: 'EG', flaeche: 20 }, { nr: '1.03', name: 'Bad', geschoss: 'EG', flaeche: 8 }],
    raumbuch: {}, vorschlag: { '1.01': { art: 'Wohnraum', boden: { vorlage: '353.02' } }, '1.03': { art: 'Bad/WC', wand: { vorlage: '345.02', fliesen: 'raumhoch' } } },
    vorlagen: { boden: [{ id: '353.01', name: 'Estrich + Fliesen' }, { id: '353.02', name: 'Estrich + Parkett' }], wand: [{ id: '345.01', name: 'Innenputz mit Anstrich' }, { id: '345.02', name: 'Wandfliesen Nassbereich' }], decke: [{ id: '354.01', name: 'Deckenputz mit Anstrich' }] },
    grund: {}, fliesen: { raumhoch: 'raumhoch', 120: 'bis 1,20 m', spritz: 'Spritzbereich' }, fliesen_vorlagen: ['345.02', '345.10'] };
  const p = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  p.on('pageerror', (e) => fehler.push('Fehler im Skript – ' + e.message));
  await p.route('http://rb.test/**', async (r) => {
    const u = new URL(r.request().url()), pf = u.pathname, J = (o) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(o) });
    if (pf === '/seite') return r.fulfill({ contentType: 'text/html', body: `<!doctype html><meta charset=utf-8><body><div id="h"></div>
      <script>window.UNDO = []; window.rueckgaengig = (t, f) => UNDO.push([t, f]); window.toast = () => {};</script>${ESC}<script src="/bp/raumbuch.js"></script>` });
    if (pf.startsWith('/bp/')) return r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(K, pf.slice(4))) });
    if (pf === '/m/raumbuch' && r.request().method() === 'GET') return J(RB);
    if (pf.startsWith('/m/raumbuch')) {
      const b = r.request().postDataJSON(); S.posts.push([pf, b]);
      if (b.vorlage) for (const n of b.raeume) RB.raumbuch[n] = { ...(RB.raumbuch[n] || {}), [b.teil]: { vorlage: b.vorlage, wahl: [], ...(b.fliesen ? { fliesen: b.fliesen } : b.vorlage === '345.02' ? { fliesen: 'raumhoch' } : {}) } };
      return J({ rev: S.posts.length, raumbuch: RB, n: 1 });
    }
    return r.fulfill({ status: 404, body: '' });
  });
  try {
    await p.goto('http://rb.test/seite');
    await p.evaluate(() => bpRaumbuch.mount(document.getElementById('h'), { basis: '/m', rev: 0, sel: ['1.01'] }));
    await p.waitForSelector('.rb-t', { timeout: 5000 });
    pruef(await p.evaluate(() => document.querySelectorAll('.rb-t tbody tr').length === 3), 'drei Räume');
    pruef(await p.evaluate(() => document.querySelector('[data-rb="1.01|boden"]').closest('td').classList.contains('vor')), 'Vorschlag ist nicht grau');
    await p.click('[data-rban="1.01"]'); await p.click('[data-rban="1.02"]');
    await p.click('[data-rb="1.01|boden"]');
    await p.waitForSelector('.rb-m', { timeout: 3000 });
    await p.click('.rb-m [data-rbw="353.01"]');
    for (let i = 0; i < 60 && !S.posts.length; i++) await p.waitForTimeout(50);
    const b = S.posts[0] && S.posts[0][1];
    pruef(b && b.teil === 'boden' && b.vorlage === '353.01' && b.raeume.sort().join() === '1.01,1.02', `Wahl für angehakte Räume: ${JSON.stringify(b)}`);
    await p.waitForFunction(() => document.querySelector('[data-rb="1.02|boden"]') && document.querySelector('[data-rb="1.02|boden"]').textContent.includes('Fliesen'), null, { timeout: 3000 });
    await p.click('[data-rban="1.01"]'); await p.click('[data-rban="1.02"]');   // Haken weg
    await p.click('[data-rb="1.03|wand"]'); await p.click('.rb-m [data-rbw="345.02"]');
    await p.waitForSelector('[data-rbfl="1.03"]', { timeout: 3000 });
    await p.click('[data-rbfl="1.03"]'); await p.click('.rb-m [data-rbw="120"]');
    for (let i = 0; i < 60 && S.posts.length < 3; i++) await p.waitForTimeout(50);
    pruef(S.posts[2] && S.posts[2][1].fliesen === '120' && S.posts[2][1].raeume.join() === '1.03', `Fliesenhöhe: ${JSON.stringify(S.posts[2])}`);
    await p.click('[data-rbvor]');
    for (let i = 0; i < 60 && S.posts.length < 4; i++) await p.waitForTimeout(50);
    pruef(S.posts[3] && S.posts[3][0] === '/m/raumbuch/vorschlag', `Vorschläge übernehmen: ${JSON.stringify(S.posts[3])}`);
    await p.evaluate(() => UNDO[0][1]());
    for (let i = 0; i < 60 && S.posts.length < 5; i++) await p.waitForTimeout(50);
    const u = S.posts[4] && S.posts[4][1];
    pruef(u && u.teil === 'boden' && u.zurueck && '1.01' in u.zurueck && u.zurueck['1.01'] === null, `Rückgängig schickt den alten Stand: ${JSON.stringify(u)}`);
  } catch (e) { fehler.push('bricht ab – ' + String(e.message).split('\n')[0]); }
  await p.close();
  return fehler;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await raumbuchPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
  await b.close(); console.log(f.length ? f.join('\n') : 'ok'); process.exit(f.length ? 1 : 0);
}
