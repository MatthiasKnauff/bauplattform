// Startdaten aus dem Gebäudemodell (bp/startdaten.js, GO 16.11.2026, Schritt 7): leeres Modell → keine Frage, nur Hinweis;
// Modell mit Bauteilen → Frage mit drei Antworten, die Antwort setzt die Linie der App (PUT link/<app>); Abbrechen → null.
// Ablauftest im echten Browser, ohne Server.
//
// Aufgerufen aus oberflaeche.mjs:  const fehler = await startdatenPruefen(browser, repoWurzel)   – allein: node tools/tests/ui/startdaten.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

export async function startdatenPruefen(browser, repo) {
  const R = path.join(repo, 'shared/bpcore/head/'), fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  const p = await browser.newPage({ viewport: { width: 900, height: 700 } });
  p.on('pageerror', (e) => fehler.push('Fehler im Skript – ' + e.message));
  const M = { 1: { zeilen: [] }, 2: { zeilen: [{ id: 'a', bereich: 'wand', name: 'Wand' }, { id: 'b', bereich: 'oeffnung', anzahl: 6 }] } }, puts = [];
  await p.route('http://sd.test/**', (r) => {
    const u = new URL(r.request().url()).pathname;
    if (u === '/seite') return r.fulfill({ contentType: 'text/html', body: `<!doctype html><meta charset=utf-8><body><script>${fs.readFileSync(R + 'bp.js', 'utf8')}</script>
      <script>${fs.readFileSync(R + 'startdaten.js', 'utf8')}</script><script>window.toast = (t) => { window.T = t; };</script>` });
    const m = u.match(/^\/api\/bp\/modell\/(\d+)(\/link\/(\w+))?$/);
    if (m && m[2]) { puts.push({ app: m[3], body: JSON.parse(r.request().postData() || '{}') }); return r.fulfill({ contentType: 'application/json', body: '{}' }); }
    if (m) return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ modell: { bauteilliste: M[m[1]] } }) });
    return r.fulfill({ status: 404, body: '' });
  });
  try {
    await p.goto('http://sd.test/seite');
    const leer = await p.evaluate(async () => { const x = await bpStartdaten({ pid: 1, app: 'kosten' }); return { modus: x && x.modus, dialog: !!document.querySelector('.modal-bg'), t: window.T || '' }; });
    pruef(leer.modus === 'leer' && !leer.dialog && /leer/.test(leer.t), `leeres Modell: ${JSON.stringify(leer)}`);
    await p.evaluate(() => { window.E = bpStartdaten({ pid: 2, app: 'termine', titel: 'Neuer Bauzeitenplan', baubeginn: true }); });
    await p.waitForSelector('.modal-bg input[name="bpsd"]');
    const txt = await p.$eval('.modal-bg', (x) => x.textContent);
    pruef(/2 Bauteilgruppen/.test(txt) && /6 Fenster und Türen/.test(txt) && (await p.$$('.modal-bg input[name="bpsd"]')).length === 3 && await p.$('[data-sdbb]'),
      `Frage mit drei Antworten und Baubeginn: ${txt.slice(0, 200)}`);
    await p.check('input[value="auto"]'); await p.fill('[data-sdbb]', '2027-03-01'); await p.click('.modal-bg [data-m="ok"]');
    const e = await p.evaluate(() => window.E);
    pruef(e && e.modus === 'auto' && e.baubeginn === '2027-03-01', `Ergebnis: ${JSON.stringify(e)}`);
    pruef(puts.length === 1 && puts[0].app === 'termine' && puts[0].body.zustand === 'lebendig' && puts[0].body.uebernahme === 'auto', `Linie gesetzt: ${JSON.stringify(puts)}`);
    await p.evaluate(() => { window.E = bpStartdaten({ pid: 2, app: 'kosten' }); });
    await p.waitForSelector('.modal-bg input[name="bpsd"]');
    await p.click('.modal-bg [data-m="abbrechen"]');
    pruef(await p.evaluate(() => window.E) === null && puts.length === 1, 'Abbrechen → null, keine Linie gesetzt');
  } catch (e) { fehler.push('bricht ab – ' + String(e.message).split('\n')[0]); }
  await p.close();
  return fehler;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await startdatenPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
  await b.close(); console.log(f.length ? f.join('\n') : 'ok'); process.exit(f.length ? 1 : 0);
}
