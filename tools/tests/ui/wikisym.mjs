// Wiki-Symbol überall (bp/wikisym.js, GO 16.11.2026): Platzhalter [data-wk] → EINE Abfrage für alle; Treffer → „W“ im Kreis (ab 2 mit Zahl),
// ohne Treffer nichts; Antippen (schmales Fenster: in der Seite) → lesen, bearbeiten (PUT), löschen mit Rückfrage in der Seite (DELETE).
// Ablauftest im echten Browser, ohne Server.
//
// Aufgerufen aus oberflaeche.mjs:  const fehler = await wikisymPruefen(browser, repoWurzel)   – allein: node tools/tests/ui/wikisym.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

export async function wikisymPruefen(browser, repo) {
  const R = path.join(repo, 'shared/bpcore/head/'), fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  const p = await browser.newPage({ viewport: { width: 420, height: 800 } });
  p.on('pageerror', (e) => fehler.push('Fehler im Skript – ' + e.message));
  const abfragen = [], puts = [], deletes = [];
  const E = { 7: { id: 7, titel: 'Sockel: Abdichtung hochführen', text: 'Mindestens 30 cm über Gelände.', tags: ['Abdichtung'], projekte: [], darf: { aendern: true, loeschen: true } },
    8: { id: 8, titel: 'Bitumendickbeschichtung nicht bei Frost', text: 'Unter +5 °C nicht verarbeiten.', tags: ['Abdichtung'], projekte: [], darf: { aendern: true, loeschen: false } } };
  await p.route('http://wk.test/**', (r) => {
    const u = new URL(r.request().url()).pathname, m = r.request().method();
    if (u === '/seite') return r.fulfill({ contentType: 'text/html', body: `<!doctype html><meta charset=utf-8><body>
      <div id="a">Sockelabdichtung <span data-wk="Sockelabdichtung Bitumendickbeschichtung"></span></div>
      <div id="b">Estrich <span data-wk="Estrich"></span></div><div id="c">nochmal <span data-wk="Sockelabdichtung Bitumendickbeschichtung"></span></div>
      <script>${fs.readFileSync(R + 'bp.js', 'utf8')}</script><script>window.toast = (t) => { window.T = t; }; window.rueckgaengig = (t) => { window.U = t; };</script>
      <script>${fs.readFileSync(R + 'wikisym.js', 'utf8')}</script>` });
    if (u === '/api/bp/wiki/symbole') { const b = JSON.parse(r.request().postData() || '{}'); abfragen.push(Object.keys(b));
      return r.fulfill({ contentType: 'application/json', body: JSON.stringify(Object.fromEntries(Object.keys(b).map((k) => [k, /Sockel/.test(k) ? [{ id: 7, titel: E[7].titel }, { id: 8, titel: E[8].titel }] : []]))) }); }
    const e = u.match(/^\/api\/bp\/wiki\/eintrag\/(\d+)$/);
    if (e && m === 'GET') return r.fulfill({ contentType: 'application/json', body: JSON.stringify(E[e[1]]) });
    if (e && m === 'PUT') { const b = JSON.parse(r.request().postData() || '{}'); puts.push(b); Object.assign(E[e[1]], b); return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ ...E[e[1]], vorher: { titel: 'alt' } }) }); }
    if (e && m === 'DELETE') { deletes.push(+e[1]); return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, papierkorb: 99 }) }); }
    return r.fulfill({ status: 404, body: '' });
  });
  try {
    await p.goto('http://wk.test/seite');
    await p.waitForSelector('#a .bpwk', { timeout: 5000 });
    const s = await p.evaluate(() => ({ a: document.querySelector('#a .bpwk').textContent.trim(), b: !!document.querySelector('#b .bpwk'), c: !!document.querySelector('#c .bpwk') }));
    pruef(s.a === '2' && !s.b && s.c, `Symbol mit Zahl nur bei Treffern: ${JSON.stringify(s)}`);
    pruef(abfragen.length === 1 && abfragen[0].length === 2, `eine Abfrage, gleiche Worte nur einmal: ${JSON.stringify(abfragen)}`);
    await p.evaluate(() => { const d = document.createElement('div'); d.id = 'd'; d.innerHTML = 'neu <span data-wk="Estrich"></span>'; document.body.appendChild(d); });
    await p.waitForTimeout(900);
    pruef(abfragen.length === 1, `neue Zeile mit bekannten Worten: aus dem Gedächtnis, keine neue Abfrage (${abfragen.length})`);
    await p.click('#a .bpwk');
    await p.waitForSelector('.modal-bg .bpwkf b');
    const t = await p.$eval('.modal-bg .bpwkf', (x) => x.textContent);
    pruef(/Sockel: Abdichtung hochführen/.test(t) && /30 cm/.test(t) && /Bitumendickbeschichtung nicht bei Frost/.test(t), `Fenster zeigt Eintrag und Liste: ${t.slice(0, 160)}`);
    await p.click('.modal-bg [data-wk-a="bearbeiten"]');
    await p.fill('.modal-bg [data-wkf="text"]', 'Mindestens 30 cm über Gelände, Übergang zum Putz überlappen.');
    await p.click('.modal-bg [data-wk-a="speichern"]');
    await p.waitForTimeout(300);
    pruef(puts.length === 1 && /überlappen/.test(puts[0].text) && Array.isArray(puts[0].tags), `Bearbeiten speichert: ${JSON.stringify(puts)}`);
    pruef(/geändert/.test(await p.evaluate(() => window.U || '')), 'Rückgängig nach dem Bearbeiten');
    await p.waitForSelector('.modal-bg [data-wk-a="loeschen"]');
    await p.click('.modal-bg [data-wk-a="loeschen"]');
    pruef(!deletes.length && !!(await p.$('.modal-bg .warn')), 'Löschen fragt erst in der Seite');
    await p.click('.modal-bg [data-wk-a="weg"]');
    await p.waitForTimeout(300);
    pruef(deletes.join() === '7' && /gelöscht/.test(await p.evaluate(() => window.U || '')), `Löschen: ${JSON.stringify(deletes)}`);
    const rest = await p.evaluate(() => (document.querySelector('.modal-bg .bpwkf') || {}).textContent || '');
    pruef(/Frost/.test(rest) && !(await p.$('.modal-bg [data-wk-a="loeschen"]')), 'danach der zweite Eintrag – ohne Löschen-Knopf, weil nicht erlaubt');
  } catch (e) { fehler.push('bricht ab – ' + String(e.message).split('\n')[0]); }
  await p.close();
  return fehler;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await wikisymPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
  await b.close(); console.log(f.length ? f.join('\n') : 'ok'); process.exit(f.length ? 1 : 0);
}
