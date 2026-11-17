// Abwesenheit zurücknehmen oder löschen (bp/abwesenheit.js, GO 17.11.2026 S1/T1/U1) – nachgebildeter Kern, kein Server.
// Geprüft: Fenster mit Zeitraum und Status; vergangene Tage gesperrt, vorgewählt ab dem angeklickten Tag; „Tage zurückgeben“ zählt mit;
// vorgeschlagen ist „der andere“; OK schickt aktion, tage, an, grund; Rückgängig schickt rueck; Löschen schickt aktion loeschen.
//
// Aufgerufen aus oberflaeche.mjs:  const fehler = await abwesenheitPruefen(browser, repoWurzel)   – allein: node tools/tests/ui/abwesenheit.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

export async function abwesenheitPruefen(browser, repo) {
  const K = path.join(repo, 'shared/bpcore/head'), fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  const S = { posts: [] };
  const I = { uid: 7, tag: '2027-05-12', name: 'Anna Bauer', selbst: true, art: 'urlaub', art_text: 'Urlaub', von: '2027-05-10', bis: '2027-05-14',
    tage: ['2027-05-10', '2027-05-11', '2027-05-12', '2027-05-13', '2027-05-14'], antrag: { id: 3, status: 'genehmigt', von: '2027-05-10', bis: '2027-05-14', tage: 5, entschieden_von: 'M. Knauff', zurueck: [] },
    offen: false, ab: '2027-05-11', an: [{ id: 1, name: 'M. Knauff', rolle: 'entscheidet über Urlaub', vor: true }] };
  const p = await browser.newPage({ viewport: { width: 1100, height: 800 } });
  p.on('pageerror', (e) => fehler.push('Fehler im Skript – ' + e.message));
  await p.route('http://ab.test/**', async (r) => {
    const u = new URL(r.request().url()), pf = u.pathname, J = (o) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(o) });
    if (pf === '/seite') return r.fulfill({ contentType: 'text/html', body: `<!doctype html><meta charset=utf-8><body>
      <script src="/bp/bp.js"></script><script>window.UNDO = []; window.rueckgaengig = (t, f) => UNDO.push([t, f]); window.NACH = 0;</script><script src="/bp/abwesenheit.js"></script>` });
    if (pf.startsWith('/bp/')) return r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(K, pf.slice(4))) });
    if (pf === '/api/bp/abwesenheit' && r.request().method() === 'GET') return J(I);
    if (pf === '/api/bp/abwesenheit') { const b = r.request().postDataJSON(); S.posts.push(['aendern', b]); return J({ ok: true, n: b.tage.length, text: 'Urlaub: zurückgegeben', rueck: 'TOKEN', gesendet: 0 }); }
    if (pf === '/api/bp/abwesenheit/zurueck') { S.posts.push(['zurueck', r.request().postDataJSON()]); return J({ ok: true }); }
    return r.fulfill({ status: 404, body: '' });
  });
  try {
    await p.goto('http://ab.test/seite');
    await p.evaluate(() => bpAbwesenheit.oeffnen({ tag: '2027-05-12', nachher: () => { NACH++; } }));
    await p.waitForSelector('.bp-abw', { timeout: 5000 });
    const T = await p.evaluate(() => [...document.querySelectorAll('[data-abwtag]')].map((x) => [x.dataset.abwtag, x.disabled, x.classList.contains('zur')]));
    pruef(T.length === 5 && T[0][1] && !T[1][1], `vergangene Tage gesperrt: ${JSON.stringify(T)}`);
    pruef(T.filter((x) => x[2]).map((x) => x[0]).join() === '2027-05-12,2027-05-13,2027-05-14', `vorgewählt ab dem angeklickten Tag: ${JSON.stringify(T)}`);
    await p.click('[data-abwtag="2027-05-12"]');
    pruef((await p.textContent('[data-abwok]')).includes('2 Tage'), `Knopf zählt mit: ${await p.textContent('[data-abwok]')}`);
    pruef(await p.isChecked('[data-abwan="1"]'), 'wer entscheidet ist nicht vorgeschlagen');
    await p.fill('[data-abwgrund]', 'früher zurück');
    await p.click('[data-abwok]');
    for (let i = 0; i < 60 && !S.posts.length; i++) await p.waitForTimeout(50);
    const b = S.posts[0] && S.posts[0][1];
    pruef(b && b.aktion === 'tage' && b.tage.sort().join() === '2027-05-13,2027-05-14' && b.an.join() === '1' && b.grund === 'früher zurück', `OK schickt ${JSON.stringify(b)}`);
    await p.waitForFunction(() => !document.querySelector('.bp-abw'), null, { timeout: 3000 });
    pruef(await p.evaluate(() => NACH === 1 && UNDO.length === 1), 'nachher bzw. Rückgängig fehlt');
    await p.evaluate(() => UNDO[0][1]());
    for (let i = 0; i < 40 && S.posts.length < 2; i++) await p.waitForTimeout(50);
    pruef(S.posts[1] && S.posts[1][0] === 'zurueck' && S.posts[1][1].rueck === 'TOKEN', `Rückgängig schickt ${JSON.stringify(S.posts[1])}`);
    await p.evaluate(() => bpAbwesenheit.oeffnen({ tag: '2027-05-12' }));
    await p.waitForSelector('.bp-abw', { timeout: 5000 });
    await p.click('[data-abwmod="loeschen"]');
    pruef(await p.evaluate(() => document.querySelector('[data-abwok]').classList.contains('rot') && !document.querySelector('[data-abwtag]')), 'Löschen: roter Knopf, keine Tagesauswahl');
    await p.click('[data-abwok]');
    for (let i = 0; i < 60 && S.posts.length < 3; i++) await p.waitForTimeout(50);
    pruef(S.posts[2] && S.posts[2][1].aktion === 'loeschen', `Löschen schickt ${JSON.stringify(S.posts[2])}`);
  } catch (e) { fehler.push('bricht ab – ' + String(e.message).split('\n')[0]); }
  await p.close();
  return fehler;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await abwesenheitPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
  await b.close(); console.log(f.length ? f.join('\n') : 'ok'); process.exit(f.length ? 1 : 0);
}
