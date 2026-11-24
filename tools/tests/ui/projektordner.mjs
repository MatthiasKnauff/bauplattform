// Projektordner beim Anlegen eines Projekts (bp/projektordner.js, 24.11.2026) – nachgebildeter Server.
// Geprüft: „fertig“ (Ordner hat schon Unterordner) → kein Fenster; „dateien“ → Fenster mit Ordnern der Vorlage und je Datei einem Vorschlag;
// Datei ohne Vorschlag ohne Haken; Ziel auf „bleibt liegen“ nimmt den Haken weg; „Anlegen“ schickt nur angehakte Dateien mit Ziel;
// „Nicht jetzt“ schickt nichts.
// Aufgerufen aus oberflaeche.mjs:  const fehler = await projektordnerPruefen(browser, repoWurzel)   – allein: node tools/tests/ui/projektordner.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

export async function projektordnerPruefen(browser, repo) {
  const K = path.join(repo, 'shared/bpcore/head'), fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  const S = { zustand: 'fertig', posts: [] };
  const STAND = () => ({ zustand: S.zustand, pfad: 'A541 Schürmannstr. 4', testserver: false,
    ordner: ['A541 1. Leistungsphasen 1-4', 'A541 2. Pläne', 'A541 3. Ausschreibung'],
    dateien: [{ rel: 'Lageplan.pdf', name: 'Lageplan.pdf', ziel: 'A541 2. Pläne', grund: 'Plan' }, { rel: 'notiz.txt', name: 'notiz.txt', ziel: '', grund: 'nicht zuzuordnen – bleibt liegen' },
      { rel: 'LV Rohbau.pdf', name: 'LV Rohbau.pdf', ziel: 'A541 3. Ausschreibung', grund: 'LV' }] });
  const p = await browser.newPage({ viewport: { width: 1100, height: 800 } });
  p.on('pageerror', (e) => fehler.push('Fehler im Skript – ' + e.message));
  await p.route('http://po.test/**', async (r) => {
    const u = new URL(r.request().url()), pf = u.pathname, J = (o) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(o) });
    if (pf === '/seite') return r.fulfill({ contentType: 'text/html', body: `<!doctype html><meta charset=utf-8><body>
      <script src="/bp/bp.js"></script><script>window.BPHead = { app: 'test', _i: { KX: (u, o = {}) => fetch(u, o).then(async (r) => { const j = await r.json(); if (!r.ok || j.error) throw new Error(j.error); return j; }) } };</script>
      <script src="/bp/projektordner.js"></script>` });
    if (pf.startsWith('/bp/')) return r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(K, pf.slice(4))) });
    if (pf === '/api/bp/bt/projektordner' && r.request().method() === 'GET') return J(STAND());
    if (pf === '/api/bp/bt/projektordner') { S.posts.push(r.request().postDataJSON()); return J({ ok: true, ordner: 3, dateien: 1, fehler: [], testserver: false }); }
    return r.fulfill({ status: 404, body: '' });
  });
  try {
    await p.goto('http://po.test/seite');
    const f1 = await p.evaluate(() => BPHead.projektOrdner(5, 'A541 Schürmannstr. 4'));
    pruef(f1 === false && !(await p.$('.bp-po')), 'Ordner schon eingerichtet – trotzdem gefragt');
    S.zustand = 'dateien';
    await p.evaluate(() => { window.ERG = null; BPHead.projektOrdner(5, 'A541 Schürmannstr. 4').then((x) => { window.ERG = x; }); });
    await p.waitForSelector('.bp-po', { timeout: 5000 });
    const h = await p.evaluate(() => [...document.querySelectorAll('[data-poh]')].map((x) => x.checked));
    pruef(h.join() === 'true,false,true', `Haken vorgewählt: ${h}`);
    pruef((await p.textContent('.bp-po-o summary')).includes('3 Ordner'), 'Ordner der Vorlage fehlen');
    await p.selectOption('[data-pozi="2"]', '');
    pruef(!(await p.isChecked('[data-poh="2"]')), '„bleibt liegen“ nimmt den Haken nicht weg');
    await p.click('[data-m="ok"]');
    await p.waitForFunction(() => window.ERG !== null, null, { timeout: 3000 });
    const b = S.posts[0];
    pruef(b && b.project_id === 5 && JSON.stringify(b.zuordnung) === JSON.stringify([{ rel: 'Lageplan.pdf', ziel: 'A541 2. Pläne' }]), `Anlegen schickt ${JSON.stringify(b)}`);
    await p.evaluate(() => { window.ERG = null; BPHead.projektOrdner(5).then((x) => { window.ERG = x; }); });
    await p.waitForSelector('.bp-po', { timeout: 5000 });
    await p.click('[data-m="x"]');
    await p.waitForFunction(() => window.ERG === false, null, { timeout: 3000 });
    pruef(S.posts.length === 1, '„Nicht jetzt“ hat etwas geschickt');
  } finally { await p.close(); }
  return fehler;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await projektordnerPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); await b.close();
  console.log(f.length ? 'FEHLER:\n' + f.join('\n') : 'Projektordner: ok'); process.exit(f.length ? 1 : 0);
}
