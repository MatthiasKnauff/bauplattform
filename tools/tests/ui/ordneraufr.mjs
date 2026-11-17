// Projektordner aufräumen (Verwaltung → Ablage & Server, 17.11.2026; vorher eigener Punkt „Projektordner“): beim Öffnen werden alle
// Projektordner gelesen, die Tabelle zeigt je Projekt die Abweichung, abweichende sind angehakt, „passt“ nicht wählbar;
// „Vorher / Nachher“ zeigt die Karten nur der angehakten; ausgeführt werden nur angehakte Projekte.
//
// Aufgerufen aus oberflaeche.mjs:  const fehler = await ordnerAufrPruefen(browser, repoWurzel)   – allein: node tools/tests/ui/ordneraufr.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

export async function ordnerAufrPruefen(browser, repo) {
  const fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  const P = [{ name: 'A450.22 Auf dem Holte 32, Bochum', bt: { id: 1 } }, { name: 'A477 Merziger Aue 1, Essen', bt: { id: 2 } }, { name: 'A481 Tierheim, Essen', bt: { id: 3 } }];
  const S = { 1: [{ id: 'u1', art: 'umbenennen', pfad: ['A450 Plaene'], neu: 'A450.22 Pläne', vor: true }, { id: 'a1', art: 'anlegen', pfad: ['05 Fotos'], vor: true }], 2: [] };
  const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"></head><body><section id="ordBox"></section>
    <script>const $ = (s) => document.querySelector(s); const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    window.POSTS = []; const bpLS = (v) => ({ get: (k, d) => d, set() {} }); const toast = () => {}; window.bpFrage = async () => true;
    async function api(u, m, b) { const r = await fetch('/' + u, { method: m || 'GET', body: b ? JSON.stringify(b) : undefined }); const j = await r.json(); if (!r.ok) throw new Error(j.error); return j; }</script>
    <script src="admin-ordner.js"></script></body></html>`;
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 900 } }), p = await ctx.newPage();
  p.on('pageerror', (e) => fehler.push('JavaScript-Fehler: ' + String(e.message || e).split('\n')[0]));
  await p.route('http://oa.test/**', async (r) => { const u = new URL(r.request().url()), pf = u.pathname, J = (x, s = 200) => r.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(x) });
    if (pf === '/') return r.fulfill({ contentType: 'text/html', body: html });
    if (pf === '/admin-ordner.js') return r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(repo, 'plattform/static/admin-ordner.js')) });
    if (pf === '/api/projects') return J(P);
    if (pf === '/api/bt/ordner/muster') return J({ muster: { name: 'A0 Projektvorlage LEER' } });
    if (pf === '/api/bt/ordner/pruefen') { const id = +u.searchParams.get('project_id'); await p.evaluate((x) => { window.KV = x; }, u.searchParams.get('kv'));
      if (id === 3) return J({ error: 'Kein Projektordner gefunden' }, 404);
      return J({ projekt: { name: P[id - 1].name, pfad: `Projekte/${P[id - 1].name.split(',')[0]}` }, muster: { name: 'A0' }, schritte: S[id], vorher: {} }); }
    if (pf === '/api/bt/ordner/ausfuehren') { await p.evaluate((b) => window.POSTS.push(b), JSON.parse(r.request().postData())); return J({ erledigt: 2, fehler: [] }); }
    return r.fulfill({ status: 404, body: '' }); });
  try {
    await p.goto('http://oa.test/'); await p.waitForFunction(() => window.ordMount);
    await p.evaluate(() => ordMount(document.getElementById('ordBox')));
    await p.waitForFunction(() => /2 von 3|1 von 3/.test(document.querySelector('.ord-kopf').textContent) && !/lese/.test(document.querySelector('.ord-kopf').textContent));
    const z = await p.$$eval('.ord-t tbody tr', (T) => T.map((t) => ({ an: t.querySelector('input').checked, aus: t.querySelector('input').disabled, k: t.cells[1].textContent, ab: t.cells[4].textContent })));
    pruef(z.length === 3, `drei Zeilen: ${z.length}`);
    pruef(z[0].an && /1 umbenennen · 1 fehlt/.test(z[0].ab), `abweichend angehakt: ${JSON.stringify(z[0])}`);
    pruef(!z[1].an && z[1].aus && /passt/.test(z[1].ab), `passt: nicht wählbar: ${JSON.stringify(z[1])}`);
    pruef(/Kein Projektordner/.test(z[2].ab) && z[2].aus, `Fehler je Zeile: ${JSON.stringify(z[2])}`);
    pruef(z[0].k === 'A450.22', 'Kürzel eigene Spalte');
    pruef(!(await p.$('.ord-k')), 'Karten erst nach „Vorher / Nachher“');
    await p.click('[data-a="ordVN"]'); await p.waitForSelector('.ord-k');
    pruef((await p.$$('.ord-k')).length === 1, 'Karte nur für angehakte');
    await p.check('[data-ordkv]'); await p.waitForFunction(() => window.KV === '1' && !/lese/.test(document.querySelector('.ord-kopf').textContent));
    pruef(true, '');
    await p.click('[data-a="ordVN"]'); await p.waitForSelector('.ord-k');
    await p.click('[data-a="ordLos"]'); await p.waitForFunction(() => window.POSTS.length === 1);
    const b = await p.evaluate(() => window.POSTS[0]);
    pruef(b.project_id === 1 && b.ids.length === 2 && b.kv === true, `ausgeführt nur angehakt: ${JSON.stringify(b)}`);
  } catch (e) { fehler.push('Prüfung bricht ab – ' + String(e.message).split('\n')[0]); }
  await ctx.close();
  return fehler;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await ordnerAufrPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
  await b.close(); console.log(f.length ? f.join('\n') : 'ok'); process.exit(f.length ? 1 : 0);
}
