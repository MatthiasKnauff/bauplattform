// Verwaltung → Projekte (admin-module.js): jedes App-Feld eines Projekts öffnet beim Antippen ein Menü – nie direkt die App (16.11.2026);
// auch die übrigen Apps lassen sich von hier löschen (Papierkorb, mit Rückgängig) und – wo die App es kennt – archivieren.
// Ablauftest im echten Browser, ohne Server.
//
// Aufgerufen aus oberflaeche.mjs:  const fehler = await projektchipsPruefen(browser, repoWurzel)   – allein: node tools/tests/ui/projektchips.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

export async function projektchipsPruefen(browser, repo) {
  const js = fs.readFileSync(path.join(repo, 'plattform/static/admin-module.js'), 'utf8'), fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  const p = await browser.newPage();
  p.on('pageerror', (e) => fehler.push('Fehler im Skript – ' + e.message));
  const posts = [];
  await p.route('http://chips.test/**', (r) => {
    const u = new URL(r.request().url()).pathname;
    if (u === '/api/projects/7/teile/bauantrag') {
      if (r.request().method() === 'POST') { posts.push(JSON.parse(r.request().postData())); return r.fulfill({ contentType: 'application/json', body: '{"ok":true,"done":["Bauantrag „BA 1“"],"papierkorb":[55]}' }); }
      return r.fulfill({ contentType: 'application/json', body: '{"liste":[{"id":4,"name":"BA 1","archived":false},{"id":5,"name":"BA 2","archived":false}],"archivierbar":false}' });
    }
    return r.fulfill({ contentType: 'text/html', body: `<!doctype html><meta charset=utf-8><body><div class="papps" id=pa data-key="1"></div>
    <script>${fs.readFileSync(path.join(repo, 'shared/bpcore/head/bp.js'), 'utf8')}</script>
    <script>const data = { conf: { apps: [{ key: 'bauantrag' }, { key: 'baukosten' }] } }; window.toast = (t) => { window.T = t; }; window.rueckgaengig = (t) => { window.U = t; }; window.load = () => {};
      const appOf = (k) => data.conf.apps.find((a) => a.key === k); const P = { name: 'Test', bt: { id: 7 }, plans: [], bks: [{ id: 3, name: 'KE', archived: false }], weitere: { bauantrag: 2 } };
      const projOf = () => P;</script><script>${js}</script>
    <script>document.getElementById('pa').innerHTML = modChips(P);</script>` });
  });
  try {
    await p.goto('http://chips.test/');
    for (const mod of ['bk', 'app:bauantrag']) {
      await p.click(`[data-mod="${mod}"]`);
      const m = await p.evaluate(() => { const x = document.querySelector('.pmenu'); return x ? x.textContent : null; });
      pruef(m && m.includes('Öffnen'), `${mod}: Menü mit „Öffnen“ erwartet – ${m}`);
      pruef(p.url() === 'http://chips.test/', `${mod}: darf nicht direkt in die App springen – ${p.url()}`);
    }
    await p.click('[data-mod="app:bauantrag"]');
    pruef(!!(await p.$('.pmenu [data-mm="del"]')) && !(await p.$('.pmenu [data-mm="arch"]')), 'Bauantrag: „In den Papierkorb …“, kein Archivieren (kann die App nicht)');
    await p.click('.pmenu [data-mm="del"]');
    await p.waitForSelector('.modal-bg [data-mid="5"]');
    await p.uncheck('.modal-bg [data-mid="5"]'); await p.click('.modal-bg [data-m="ok"]');
    await p.waitForTimeout(300);
    pruef(posts.length === 1 && posts[0].was === 'del' && posts[0].ids.join() === '4', `nur das gewählte in den Papierkorb: ${JSON.stringify(posts)}`);
    pruef(/Papierkorb/.test(await p.evaluate(() => window.U || '')), 'mit Rückgängig');
  } catch (e) { fehler.push('bricht ab – ' + String(e.message).split('\n')[0]); }
  await p.close();
  return fehler;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await projektchipsPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
  await b.close(); console.log(f.length ? f.join('\n') : 'ok'); process.exit(f.length ? 1 : 0);
}
