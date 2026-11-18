// Seite „Ablauf der Teile“ im Bauzeitenplan (gantt/public/ablauf.js, 18.11.2026): Pfeile docken an den einander zugewandten Seiten an
// (nebeneinander seitlich, übereinander unten/oben), Drucken/PDF als eine Seite mit Kisten, Leistungen und Pfeilen. Nachgebildeter Server.
// Aufgerufen aus oberflaeche.mjs:  const fehler = await ablaufPruefen(browser, repoWurzel)   – allein: node tools/tests/ui/ablauf.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
export async function ablaufPruefen(b, repo) {
const fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
const PUB = path.join(repo, 'gantt/public'), KASTEN = path.join(repo, 'shared/bpcore/head');
const BK = /BAUKASTEN = \(([^)]*)\)/.exec(fs.readFileSync(path.join(repo, 'shared/bpcore/head.py'), 'utf8'))[1].match(/"[^"]+"/g).map((s) => s.slice(1, -1));
const baukasten = 'void 0;\n' + BK.map((f) => fs.readFileSync(path.join(KASTEN, f), 'utf8')).join('\n;\n');
const J = (o) => ({ contentType: 'application/json', body: JSON.stringify(o) });
const ART = (f) => (f.endsWith('.css') ? 'text/css' : f.endsWith('.js') ? 'text/javascript' : 'text/html');
const p = await b.newPage({ viewport: { width: 1600, height: 950 } });
p.on('pageerror', (e) => { if (!/NaN|iterable/.test(e.message)) fehler.push('Fehler im Skript – ' + e.message); });
try {
await p.route('http://portal.test/**', (r) => { const u = new URL(r.request().url()), pf = u.pathname.replace(/^\/gantt\//, '').replace(/^\//, '');
  if (pf === '' || pf === 'gantt') return r.fulfill({ contentType: 'text/html', body: fs.readFileSync(path.join(PUB, 'index.html'), 'utf8') });
  if (pf === 'bp/baukasten.js') return r.fulfill({ contentType: 'text/javascript', body: baukasten });
  const f = pf.startsWith('bp/') ? path.join(KASTEN, pf.slice(3)) : path.join(PUB, pf);
  if (!pf.startsWith('api/') && fs.existsSync(f) && fs.statSync(f).isFile()) return r.fulfill({ contentType: ART(f), body: fs.readFileSync(f) });
  if (!pf.startsWith('api/')) return r.fulfill({ status: 404, body: '' });
  if (r.request().method() === 'PUT') return r.fulfill(J({ ok: true }));
  if (pf === 'api/me') return r.fulfill(J({ ok: true, id: 1, name: 'admin', role: 'admin', admin: true, is_admin: true, look: {}, katalog: true }));
  if (pf === 'api/platform') return r.fulfill(J({ apps: [], user: { name: 'admin', role: 'admin' }, projekte: [] }));
  if (pf === 'api/projects') return r.fulfill(J([{ id: 1, name: 'Testplan', updated: '2026-11-15' }]));
  if (/^api\/projects\/(1|undefined)$/.test(pf)) return r.fulfill(J({ id: 1, name: 'Testplan', rev: 1, start: 20773, nextUid: 3, tasks: [{ uid: 1, name: 'A', dur: 2, lvl: 0, preds: [] }] }));
  return r.fulfill({ contentType: 'application/json', body: /projects$|firms|presets|liste|versions|neuigkeit|kontakte|library/.test(pf) ? '[]' : '{}' }); });
await p.goto('http://portal.test/gantt/'); await p.waitForTimeout(2500);
await p.evaluate(() => { const cfg = { ...PlanKern.grund('k:ef:an.au.um:'), area: 160, floors: 2 }; P.assist = cfg; return AssistCore.erzeugen(cfg, null, false).then(() => showTab('ablauf')); });
await p.waitForTimeout(800);
await p.evaluate(() => { document.querySelectorAll('.ab-kk').forEach((k) => k.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))); });
await p.waitForTimeout(800);
await p.evaluate(() => { const T = P.tasks.filter((t) => t.teil); const a = T.find((t) => t.teil === 'aufstock' && t.cat !== '_teil'), z = P.tasks.filter((t) => t.teil === 'anbau' && t.cat !== '_teil').at(-1); if (a && z) { P.ablauf = P.ablauf || {}; P.ablauf.links = [{ von: 'bestand', nach: 'anbau', type: 'FS', lag: 0 }, { von: 'anbau', vonCat: z.cat || '#' + z.uid, nach: 'aufstock', type: 'FS', lag: 0 }]; } render(); });
await p.waitForTimeout(800);
const gem = await p.evaluate(() => ({ k: !!document.querySelector('#ablaufView .ab-k.gem'), n: P.tasks.filter((t) => t.teil === '_gem' && t.cat && t.cat[0] !== '_').map((t) => t.cat), doppelt: ['hak', 'waermeerz', 'hydr', 'kanal', 'be', 'bauzaun'].filter((c) => P.tasks.filter((t) => t.cat === c).length > 1) }));
pruef(gem.k && gem.n.length && !gem.doppelt.length, 'Gemeinsames (Haustechnik) als eigene, andersfarbige Kiste, nichts doppelt: ' + JSON.stringify(gem));
const gr = await p.evaluate(() => { const n0 = P.tasks.filter((t) => t.cat && t.cat[0] !== '_').length; ablaufGruppieren('phase');
  const ph = { n: P.tasks.filter((t) => t.cat && t.cat[0] !== '_').length, an: (document.querySelector('.bf-k[aria-pressed="true"]') || {}).textContent || '' };
  ablaufGruppieren('teil'); const te = { n: P.tasks.filter((t) => t.cat && t.cat[0] !== '_').length, erst: (P.tasks.find((t) => t.cat === '_teil') || {}).teil, an: (document.querySelector('.bf-k[aria-pressed="true"]') || {}).textContent || '' };
  return { n0, ph, te }; });
pruef(gr.ph.n === gr.n0 && gr.te.n === gr.n0 && /Bauphase/.test(gr.ph.an) && /Gebäudeteil/.test(gr.te.an) && gr.te.erst === '_gem', 'Gruppieren: nichts geht verloren, Knopf markiert, „Gemeinsam“ vorne: ' + JSON.stringify(gr));
const lk = await p.evaluate(async () => { const F = []; window.bpFrage = async (m) => { F.push(m); return false; }; window.toast = (m) => F.push('T:' + m);
  const hz = P.tasks.find((t) => t.teil === 'anbau' && t.cat === 'hz_fein'), be = P.tasks.find((t) => t.teil === '_gem' && t.cat === 'be');
  const a = hz ? await ablaufPruefeLink('_gem', 'hydr', 'anbau', 'hz_fein') : 'ohne'; const b = be ? await ablaufPruefeLink('anbau', '', '_gem', 'be') : 'ohne';
  return { a, b, F }; });
pruef(lk.b === false && lk.F.some((m) => /Kreis/.test(m)), 'Kreis wird abgelehnt: ' + JSON.stringify(lk));
pruef(lk.a === 'ohne' || (lk.a === false && lk.F.some((m) => /Unüblich|Kreis/.test(m))), 'Gegen die übliche Reihenfolge wird gewarnt: ' + JSON.stringify(lk));
const sv = await p.evaluate(() => [...document.querySelectorAll('#ablaufView .ab-p .ab-pl')].map((x) => x.getAttribute('d')));
pruef(sv.length >= 2, 'Pfeile auf der Seite: ' + sv.length);
pruef(sv.some((d) => { const m = /^M([\d.]+),([\d.]+) C([\d.]+),([\d.]+)/.exec(d); return m && Math.abs(+m[1] - +m[3]) < 0.5 && +m[4] > +m[2]; }), 'Anbau → Aufstockung (übereinander): Pfeil geht unten aus der Kiste');
await p.evaluate(() => { window.doPrint = (L) => { window.__L = L; }; window.ablaufDruck(); });
await p.waitForTimeout(300); await p.click('.modal [data-m="druck"]'); await p.waitForTimeout(500);
const svg = await p.evaluate(() => window.__L && window.__L.pages[0]);
pruef(svg && /Ablauf der Gebäudeteile/.test(svg) && (svg.match(/marker-end="url\(#abD\)"/g) || []).length >= 2 && /Bestand/.test(svg), 'Druck: eine Seite mit Kisten und Pfeilen');
} catch (e) { fehler.push('bricht ab – ' + String(e.message).split('\n')[0]); }
await p.close(); return fehler;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await ablaufPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
  await b.close(); console.log(f.length ? f.join('\n') : 'ok'); process.exit(f.length ? 1 : 0);
}
