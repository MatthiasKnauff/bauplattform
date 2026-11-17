// Einträge aus Vorschlagslisten löschen mit Ersatz (bp/begriffe.js + vorschlag.js, GO 17.11.2026 O1/P1/R1) – nachgebildeter Kern, kein Server.
// Geprüft: Eintrag mit quelle hat 🗑, fester Eintrag nicht; 🗑 öffnet das Popup mit den Adressen, „Ersatz für alle“ ist die ähnliche Schreibweise;
// je Adresse änderbar; „Ersetzen und löschen“ schickt wert, ersatz und je; das Feld mit dem gelöschten Wert bekommt den Ersatz; Rückgängig schickt rueck.
//
// Aufgerufen aus oberflaeche.mjs:  const fehler = await begriffePruefen(browser, repoWurzel)   – allein: node tools/tests/ui/begriffe.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

export async function begriffePruefen(browser, repo) {
  const K = path.join(repo, 'shared/bpcore/head'), fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  const S = { posts: [] };
  const p = await browser.newPage({ viewport: { width: 1100, height: 800 } });
  p.on('pageerror', (e) => fehler.push('Fehler im Skript – ' + e.message));
  await p.route('http://bg.test/**', async (r) => {
    const u = new URL(r.request().url()), pf = u.pathname, J = (o) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(o) });
    if (pf === '/seite') return r.fulfill({ contentType: 'text/html', body: `<!doctype html><meta charset=utf-8><body><input id="f" data-vs="t" value="Bauherr*in" autocomplete="off">
      <script>window.BP_HEAD_BASIS = ['/bp/', '']; window.UNDO = []; window.rueckgaengig = (t, f) => UNDO.push([t, f]); window.toast = () => {}; window.AENDER = 0;</script>
      <script src="/bp/vorschlag.js"></script><script>bpVorschlag.listen.t = [{ w: 'Bauherr' , quelle: 'kontakt.trade' }, { w: 'Bauherr*in', quelle: 'kontakt.trade' }, { w: 'm2' }];
      document.getElementById('f').addEventListener('change', () => AENDER++);</script>` });
    if (pf.startsWith('/bp/')) return r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(K, pf.slice(4))) });
    if (pf === '/api/bp/begriffe/kontakt.trade') return J({ titel: 'Gewerk / Rolle', wert: u.searchParams.get('wert'), vorschlag: 'Bauherr', werte: ['Bauherr', 'Maler'],
      treffer: [{ id: 1, name: 'Matthias Knauff', sub: 'Haumannplatz 3, Essen', alt: 'Bauherr*in' }, { id: 2, name: 'Familie Muster', sub: '', alt: 'Bauherr*in, Maler' }] });
    if (pf.endsWith('/ersetzen')) { S.posts.push(['ersetzen', r.request().postDataJSON()]); return J({ n: 2, rueck: [{ id: 1, alt: 'Bauherr*in' }, { id: 2, alt: 'Bauherr*in, Maler' }] }); }
    if (pf.endsWith('/zurueck')) { S.posts.push(['zurueck', r.request().postDataJSON()]); return J({ n: 2 }); }
    return r.fulfill({ status: 404, body: '' });
  });
  try {
    await p.goto('http://bg.test/seite'); await p.click('#f');
    await p.waitForSelector('.bp-vs [data-bpbegr]', { timeout: 5000 });
    const z = await p.evaluate(() => [...document.querySelectorAll('.bp-vs-z')].map((x) => [x.querySelector('b').textContent, !!x.querySelector('[data-bpbegr]')]));
    pruef(JSON.stringify(z) === JSON.stringify([['Bauherr', true], ['Bauherr*in', true], ['m2', false]]), `🗑 nur bei Einträgen mit Quelle: ${JSON.stringify(z)}`);
    await p.hover('.bp-vs-z:nth-child(2)'); await p.click('.bp-vs-z:nth-child(2) [data-bpbegr]');
    await p.waitForSelector('#bpbAlle', { timeout: 5000 });
    pruef(await p.inputValue('#bpbAlle') === 'Bauherr', 'Ersatz für alle: ähnliche Schreibweise nicht vorgeschlagen');
    pruef(await p.evaluate(() => [...document.querySelectorAll('[data-bpbje]')].every((x) => x.value === 'Bauherr')), 'Zeilen übernehmen den Ersatz für alle nicht');
    await p.fill('[data-bpbje="2"]', '');   // diese Adresse ohne Ersatz
    await p.click('[data-bpbok]');
    for (let i = 0; i < 60 && !S.posts.length; i++) await p.waitForTimeout(50);
    pruef(S.posts[0] && JSON.stringify(S.posts[0][1]) === JSON.stringify({ wert: 'Bauherr*in', ersatz: 'Bauherr', je: { 2: '' } }), `Ersetzen schickt ${JSON.stringify(S.posts[0])}`);
    await p.waitForFunction(() => !document.querySelector('.bph-dlg-bg'), null, { timeout: 3000 });
    pruef(await p.inputValue('#f') === 'Bauherr' && await p.evaluate(() => AENDER === 1), `Feld mit dem gelöschten Wert bekommt den Ersatz: ${await p.inputValue('#f')}`);
    pruef(await p.evaluate(() => UNDO.length === 1), 'kein Rückgängig');
    await p.evaluate(() => UNDO[0][1]());
    for (let i = 0; i < 40 && S.posts.length < 2; i++) await p.waitForTimeout(50);
    pruef(S.posts[1] && S.posts[1][0] === 'zurueck' && S.posts[1][1].rueck.length === 2, `Rückgängig schickt ${JSON.stringify(S.posts[1])}`);
  } catch (e) { fehler.push('bricht ab – ' + String(e.message).split('\n')[0]); }
  await p.close();
  return fehler;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await begriffePruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
  await b.close(); console.log(f.length ? f.join('\n') : 'ok'); process.exit(f.length ? 1 : 0);
}
