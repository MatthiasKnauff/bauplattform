// Projekt wählen – neu (GO 19.11.2026, Mock „Projekt wählen – neu“: A1 B1 C1 D1 E1) – Ablauftest mit nachgebildetem Server.
// Geprüft: (1) Gruppen ★ Favoriten · Zuletzt benutzt · Meine Projekte, Kürzel vorn, Zähler und Stand nachgeladen; (2) Vorschau rechts am Rechner;
// (3) Suche findet auch Projekte anderer (👥), Filter „Archiv“; (4) ↓ + Enter wählt (PUT api/bp/projekt); ☆ merkt den Favoriten (PUT …/fav);
// (5) Strg+K „p a4“ zeigt nur die Gruppe „Projekte“.
// Aufgerufen aus oberflaeche.mjs:  const fehler = await projektWahlPruefen(browser, repoWurzel)   – allein: node tools/tests/ui/projektwahl.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

export async function projektWahlPruefen(browser, repo) {
  const KASTEN = path.join(repo, 'shared/bpcore/head'), STAT = path.join(repo, 'plattform/static');
  const BK = /BAUKASTEN = \(([^)]*)\)/.exec(fs.readFileSync(path.join(repo, 'shared/bpcore/head.py'), 'utf8'))[1].match(/"[^"]+"/g).map((s) => s.slice(1, -1));
  const baukasten = 'void 0;\n' + BK.map((f) => fs.readFileSync(path.join(KASTEN, f), 'utf8')).join('\n;\n');
  const fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  const PJ = [
    { id: 1, name: 'A497 Maybachstraße 15a, Essen', client: 'Familie Muster', street: 'Maybachstraße 15a', zip: '45133', city: 'Essen', lat: 51.4, lon: 7.0, archived: false, eigen: true, mein: true, bauleiter: 'Knauff', fav: true, zuletzt: 2 },
    { id: 2, name: 'A450.22 Auf dem Holte 32, Bochum', client: '', street: 'Auf dem Holte 32', zip: '44879', city: 'Bochum', lat: null, lon: null, archived: false, eigen: true, mein: true, bauleiter: 'Knauff', fav: false, zuletzt: 1 },
    { id: 3, name: 'A480 Grundstück Spedition Knauf, Duisburg', client: '', street: '', zip: '', city: 'Duisburg', lat: null, lon: null, archived: false, eigen: true, mein: true, bauleiter: 'Knauff', fav: false, zuletzt: 0 },
    { id: 4, name: 'A434 Ostpreußenstraße 54, Essen', client: '', street: '', zip: '', city: 'Essen', lat: null, lon: null, archived: false, eigen: true, mein: false, bauleiter: 'Anna', fav: false, zuletzt: 0 },
    { id: 5, name: 'A301 Altbau, Essen', client: '', street: '', zip: '', city: 'Essen', lat: null, lon: null, archived: true, eigen: true, mein: true, bauleiter: 'Knauff', fav: false, zuletzt: 0 }];
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } }), p = await ctx.newPage(), puts = [];
  p.on('pageerror', (e) => fehler.push('JavaScript-Fehler: ' + String(e.message || e).split('\n')[0]));
  await p.route('http://pw.test/**', (r) => {
    const u = new URL(r.request().url()), pf = u.pathname.replace(/^\//, ''), m = r.request().method();
    if (pf === '') return r.fulfill({ contentType: 'text/html', body: fs.readFileSync(path.join(STAT, 'portal.html'), 'utf8') });
    if (pf === 'bp/baukasten.js') return r.fulfill({ contentType: 'text/javascript', body: baukasten });
    const f = pf.startsWith('bp/') ? path.join(KASTEN, pf.slice(3)) : pf.startsWith('static/') ? path.join(STAT, pf.slice(7)) : null;
    if (f) return fs.existsSync(f) ? r.fulfill({ contentType: f.endsWith('.css') ? 'text/css' : 'text/javascript', body: fs.readFileSync(f) }) : r.fulfill({ status: 404, body: '' });
    const J = (o) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(o) });
    if (m !== 'GET') puts.push([pf, r.request().postData() || '']);
    if (pf === 'api/bp/projekte') return J(PJ);
    if (pf === 'api/bp/projekte/stand') return J({ 1: { rot: 3, grau: 5, stand: 'Innenausbau bis 26.02.' }, 2: { rot: 0, grau: 1, stand: 'Honorar: Angebot' } });
    if (/^api\/bp\/projekte\/\d+\/fav$/.test(pf)) return J({ fav: [1, 3] });
    if (pf === 'api/bp/projekt') return J(m === 'PUT' ? { id: JSON.parse(r.request().postData() || '{}').id, name: 'x' } : { id: 2, name: 'A450.22 Auf dem Holte 32, Bochum' });
    if (pf === 'api/me') return J({ ok: true, id: 1, name: 'mk', role: 'admin', admin: false, look: {} });
    if (pf === 'api/platform') return J({ apps: [], projekte: [] });
    if (pf === 'api/bp/bt/leaders') return J([{ id: 1, name: 'mk' }]);
    if (/(^|\/)api\//.test(pf)) return J(/liste|kontakte|neuigkeit|verlauf|fehler/.test(pf) ? [] : {});
    return r.fulfill({ status: 404, body: '' });
  });
  try {
    await p.addInitScript(() => { window.__reload = 0; });
    await p.goto('http://pw.test/'); await p.waitForSelector('.bph-who', { timeout: 10000 });
    await p.evaluate(() => { BPHead.beiProjektWahl((id) => { window.__gewaehlt = id; }); BPHead.projektWahl(); });
    await p.waitForSelector('.bph-pw2 [data-pid]', { timeout: 5000 }); await p.waitForTimeout(300);
    if (process.env.PW_BILD) await p.screenshot({ path: process.env.PW_BILD });
    const g = await p.evaluate(() => ({ gr: [...document.querySelectorAll('.bph-pw2 .bph-pws')].map((x) => x.textContent), k: [...document.querySelectorAll('.bph-pw2 .bph-pk')].map((x) => x.textContent),
      z: (document.querySelector('.bph-pw2 [data-pid="1"] .bph-pr') || {}).textContent || '', v: !document.querySelector('.bph-pwv').hidden && /Familie Muster/.test(document.querySelector('.bph-pwv').textContent) }));
    pruef(g.gr.join('|') === '★ Favoriten|Zuletzt benutzt|Meine Projekte' && g.k.join('|') === 'A497|A450.22|A480', 'Gruppen/Reihenfolge: ' + JSON.stringify(g));
    pruef(/Innenausbau/.test(g.z) && /3/.test(g.z) && /5/.test(g.z), 'Stand und Zähler an der Zeile: ' + g.z);
    pruef(g.v, 'Vorschau rechts mit Bauherr:in fehlt');
    { const st = await p.evaluate(() => { const b = document.querySelector('.bph-pw2 [data-pedit]'), z = b.closest('.bph-pz'); return { f: parseFloat(getComputedStyle(b).fontSize), zf: parseFloat(getComputedStyle(z).fontSize), w: b.getBoundingClientRect().width }; });
      pruef(st.f >= st.zf && st.w < 60, `✎ in der Zeile zu klein oder zu breit – ${JSON.stringify(st)}`); }   // 19.11.2026: Stift erbte .78em, Klasse stieß mit dem Bearbeiten-Fenster zusammen
    await p.fill('.bph-pw2 [data-pq]', 'a434'); await p.waitForTimeout(80);
    pruef(await p.evaluate(() => [...document.querySelectorAll('.bph-pw2 .bph-pk')].map((x) => x.textContent).join() === 'A434' && /👥/.test(document.querySelector('.bph-pw2 [data-pid="4"]').textContent)), 'Suche findet Projekt anderer mit 👥');
    await p.fill('.bph-pw2 [data-pq]', ''); await p.click('.bph-pw2 [data-pfil="archiv"]'); await p.waitForTimeout(50);
    pruef(await p.evaluate(() => [...document.querySelectorAll('.bph-pw2 .bph-pk')].map((x) => x.textContent).join() === 'A301'), 'Filter Archiv');
    await p.click('.bph-pw2 [data-pfil="meine"]'); await p.click('.bph-pw2 [data-pid="3"] [data-pfav]'); await p.waitForTimeout(100);
    pruef(puts.some(([u, b]) => u === 'api/bp/projekte/3/fav' && /true/.test(b)) && await p.evaluate(() => [...document.querySelectorAll('.bph-pw2 .bph-pk')].slice(0, 2).map((x) => x.textContent).join() === 'A480,A497'), '☆ merkt den Favoriten und sortiert ihn nach oben');
    await p.mouse.move(5, 5); await p.focus('.bph-pw2 [data-pq]'); await p.evaluate(() => document.querySelector('.bph-pw2 [data-pq]').dispatchEvent(new Event('input', { bubbles: true }))); await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
    pruef(await p.evaluate(() => window.__gewaehlt) === 1 && !(await p.$('.bph-pw2')), '↓ + Enter wählt das zweite Projekt (A497): ' + await p.evaluate(() => window.__gewaehlt));
    // 19.11.2026: „＋ Neues Projekt“ zeigte nur den dunklen Hintergrund – die Klasse des Stifts (.bph-pe, unsichtbar) war auch die des Fensters
    await p.evaluate(() => BPHead.projektWahl({})); await p.waitForSelector('.bph-pw2 [data-pneu]', { timeout: 5000 }); await p.click('.bph-pw2 [data-pneu]');
    await p.waitForSelector('.bph-dlg [data-pok]', { timeout: 5000 }).catch(() => {});
    const nf = await p.evaluate(() => { const d = document.querySelector('.bph-dlg [data-pok]'); if (!d) return { da: false }; const dl = d.closest('.bph-dlg'), cs = getComputedStyle(dl); return { da: true, op: cs.opacity, w: dl.getBoundingClientRect().width }; });
    pruef(nf.da && nf.op === '1' && nf.w > 300, '„＋ Neues Projekt“: Fenster nicht zu sehen – ' + JSON.stringify(nf));
    await p.evaluate(() => document.querySelector('.bph-dlg [data-pc]').click());
    await p.keyboard.press('Control+k'); await p.waitForSelector('.bph-su input', { timeout: 5000 }); await p.keyboard.type('p a4'); await p.waitForTimeout(700);
    const s = await p.evaluate(() => ({ g: [...document.querySelectorAll('.bph-su-g')].map((x) => x.textContent), n: document.querySelectorAll('.bph-su-t').length }));
    pruef(s.g.join() === 'Projekte' && s.n === 4, 'Strg+K „p a4“: nur Projekte – ' + JSON.stringify(s));
  } catch (e) { fehler.push('Prüfung bricht ab – ' + String(e.message).split('\n')[0]); }
  await ctx.close();
  return fehler;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch();
  const f = await projektWahlPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
  await b.close(); console.log(f.length ? f.join('\n') : 'ok'); process.exit(f.length ? 1 : 0);
}
