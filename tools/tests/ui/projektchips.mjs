// Verwaltung → Projekte (admin-module.js): jedes App-Feld eines Projekts öffnet beim Antippen ein Menü – nie direkt die App (16.11.2026).
// Ablauftest im echten Browser, ohne Server.
//
// Aufgerufen aus oberflaeche.mjs:  const fehler = await projektchipsPruefen(browser, repoWurzel)   – allein: node tools/tests/ui/projektchips.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

export async function projektchipsPruefen(browser, repo) {
  const js = fs.readFileSync(path.join(repo, 'plattform/static/admin-module.js'), 'utf8'), fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  const p = await browser.newPage();
  p.on('pageerror', (e) => fehler.push('Fehler im Skript – ' + e.message));
  await p.route('http://chips.test/**', (r) => r.fulfill({ contentType: 'text/html', body: `<!doctype html><meta charset=utf-8><body><div class="papps" id=pa data-key="1"></div>
    <script>const esc = (s) => String(s); const data = { conf: { apps: [{ key: 'bauantrag' }, { key: 'baukosten' }] } };
      const appOf = (k) => data.conf.apps.find((a) => a.key === k); const P = { name: 'Test', plans: [], bks: [{ id: 3, name: 'KE', archived: false }], weitere: { bauantrag: 1 } };
      const projOf = () => P;</script><script>${js}</script>
    <script>document.getElementById('pa').innerHTML = modChips(P);</script>` }));
  try {
    await p.goto('http://chips.test/');
    for (const mod of ['bk', 'app:bauantrag']) {
      await p.click(`[data-mod="${mod}"]`);
      const m = await p.evaluate(() => { const x = document.querySelector('.pmenu'); return x ? x.textContent : null; });
      pruef(m && m.includes('Öffnen'), `${mod}: Menü mit „Öffnen“ erwartet – ${m}`);
      pruef(p.url() === 'http://chips.test/', `${mod}: darf nicht direkt in die App springen – ${p.url()}`);
    }
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
