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
// nur die nötigen Verknüpfungen zwischen den Teilen (PF-A1 B1): nach dem Erzeugen ist nichts mehr überflüssig
const pf = await p.evaluate(() => { const quer = (t, q) => t.teil && q.teil && t.teil !== q.teil, byU = new Map(P.tasks.map((t) => [t.uid, t]));
  const n = P.tasks.reduce((s, t) => s + (t.preds || []).filter((x) => !x.kiste && byU.get(x.uid) && quer(t, byU.get(x.uid))).length, 0);
  return { n, rest: ueberfluessigeLinks(P.tasks, quer).length }; });
pruef(pf.rest === 0 && pf.n > 0 && pf.n < 60, 'Nur nötige Verknüpfungen zwischen den Teilen: ' + JSON.stringify(pf));
const gem = await p.evaluate(() => ({ k: !!document.querySelector('#ablaufView .ab-k.gem'), n: P.tasks.filter((t) => t.teil === '_gem' && t.cat && t.cat[0] !== '_').map((t) => t.cat), doppelt: ['hak', 'waermeerz', 'hydr', 'kanal', 'be', 'bauzaun'].filter((c) => P.tasks.filter((t) => t.cat === c).length > 1) }));
pruef(gem.k && gem.n.length && !gem.doppelt.length, 'Gemeinsames (Haustechnik) als eigene, andersfarbige Kiste, nichts doppelt: ' + JSON.stringify(gem));
const gr = await p.evaluate(() => { const n0 = P.tasks.filter((t) => t.cat && t.cat[0] !== '_').length; ablaufGruppieren('phase');
  const ph = { n: P.tasks.filter((t) => t.cat && t.cat[0] !== '_').length, an: (document.querySelector('.bf-k[aria-pressed="true"]') || {}).textContent || '' };
  ablaufGruppieren('teil'); const te = { n: P.tasks.filter((t) => t.cat && t.cat[0] !== '_').length, erst: (P.tasks.find((t) => t.cat === '_teil') || {}).teil, an: (document.querySelector('.bf-k[aria-pressed="true"]') || {}).textContent || '' };
  return { n0, ph, te }; });
pruef(gr.ph.n === gr.n0 && gr.te.n === gr.n0 && gr.te.erst === '_gem', 'Gruppieren: nichts geht verloren, „Gemeinsam“ vorne: ' + JSON.stringify(gr));
const lk = await p.evaluate(async () => { const F = []; window.bpFrage = async (m) => { F.push(m); return false; }; window.toast = (m) => F.push('T:' + m);
  const hz = P.tasks.find((t) => t.teil === 'anbau' && t.cat === 'hz_fein'), be = P.tasks.find((t) => t.teil === '_gem' && t.cat === 'be');
  const a = hz ? await ablaufPruefeLink('_gem', 'hydr', 'anbau', 'hz_fein') : 'ohne'; const b = be ? await ablaufPruefeLink('anbau', '', '_gem', 'be') : 'ohne';
  return { a, b, F }; });
pruef(lk.b === false && lk.F.some((m) => /Kreis/.test(m)), 'Kreis wird abgelehnt: ' + JSON.stringify(lk));
pruef(lk.a === 'ohne' || (lk.a === false && lk.F.some((m) => /Unüblich|Kreis/.test(m))), 'Gegen die übliche Reihenfolge wird gewarnt: ' + JSON.stringify(lk));
await p.evaluate(() => showTab('vorgang')); await p.waitForTimeout(400);
const knopf = async (t) => { const ok = await p.evaluate((t) => { const b = [...document.querySelectorAll('.bf-k')].find((x) => x.textContent.includes(t)); if (!b) return false; b.click(); return true; }, t); if (!ok) return 'fehlt'; await p.waitForTimeout(500); return p.evaluate(() => [...document.querySelectorAll('.bf-k[aria-pressed]')].map((x) => x.textContent.trim() + ':' + x.getAttribute('aria-pressed')).join('|')); };
// Fenster „Gruppieren“ (19.11.2026, A1): Ebenen anhaken, Vorschau, „Gruppieren“ – danach jederzeit wieder; Rückgängig stellt den Plan her
const g1 = await knopf('Gruppieren');
if (process.env.SHOT) await p.screenshot({ path: process.env.SHOT });
const gf = await p.evaluate(async () => { const L = document.querySelector('.ab-gl'); if (!L) return { fehlt: true };
  const n = L.querySelectorAll('[data-gk]').length, fest = !!L.querySelector('[data-gc="teil"]:disabled'), cb = L.querySelector('[data-gc="gewerk"]');
  cb.checked = true; cb.dispatchEvent(new Event('change', { bubbles: true })); await new Promise((r) => setTimeout(r, 200));
  const vor = document.querySelectorAll('.ab-gv .ab-gdot').length, uid0 = P.tasks.length;
  [...document.querySelectorAll('.modal .btn')].find((b) => b.textContent === 'Gruppieren').click(); await new Promise((r) => setTimeout(r, 300));
  const r = { n, fest, vor, eb: ablaufEbenen(), gw: P.tasks.filter((t) => t.cat === '_gw').length, zu: !document.querySelector('.ab-gl') };
  doUndo(); r.zurueck = P.tasks.length === uid0 && !P.tasks.some((t) => t.cat === '_gw'); return r; });
pruef(g1 !== 'fehlt' && gf.n === 4 && gf.fest && gf.vor > 0 && gf.eb.includes('gewerk') && gf.gw > 0 && gf.zu && gf.zurueck, 'Gantt: Fenster „Gruppieren“ mit Ebenen, Vorschau, Rückgängig: ' + JSON.stringify([g1, gf]));
await p.evaluate(() => showTab('ablauf')); await p.waitForTimeout(400);
// Leistung in eine andere Kiste ziehen (UZ-A1 B1): gehört danach zum Ziel-Teil, bleibt nach „Plan neu aus den Angaben“ dort
for (const k of ['anbau', '_gem']) await p.evaluate((k) => { const b = document.querySelector(`[data-abk="${k}"]`); if (b && !b.classList.contains('auf')) b.querySelector('.ab-kk').dispatchEvent(new MouseEvent('dblclick', { bubbles: true })); }, k);
await p.waitForTimeout(300);
const zr = await p.evaluate(() => { const z = [...document.querySelectorAll('[data-abk="anbau"] .ab-z[data-abuid]')].find((x) => { const t = P.tasks.find((y) => y.uid === +x.dataset.abuid); return t && t.cat && t.cat[0] !== '_'; });
  if (!z) return null; z.scrollIntoView({ block: 'center' }); const r = z.querySelector('.ab-zn').getBoundingClientRect(), k = document.querySelector('[data-abk="_gem"] .ab-kk').getBoundingClientRect();
  return { uid: +z.dataset.abuid, cat: P.tasks.find((y) => y.uid === +z.dataset.abuid).cat, x: r.left + 20, y: r.top + r.height / 2, zx: k.left + 40, zy: k.top + 15 }; });
if (!zr) pruef(false, 'Umziehen: keine Leistung im Anbau ' + await p.evaluate(() => [...document.querySelectorAll('[data-abk]')].map((k) => k.dataset.abk + ':' + k.querySelectorAll('.ab-z').length).join(',')));
else {
  await p.mouse.move(zr.x, zr.y); await p.mouse.down(); await p.mouse.move(zr.x + 30, zr.y + 10, { steps: 3 });
  const geist = await p.evaluate(() => !!document.querySelector('.ab-geist'));
  await p.mouse.move(zr.zx, zr.zy, { steps: 6 }); const ziel = await p.evaluate(() => !!document.querySelector('[data-abk="_gem"].ab-ziel')); await p.mouse.up(); await p.waitForTimeout(400);
  const u = await p.evaluate((zr) => { const t = P.tasks.find((x) => x.uid === zr.uid); return { teil: t && t.teil, umzug: JSON.stringify(P.ablauf.umzug || []), inKiste: !!document.querySelector(`[data-abk="_gem"] [data-abuid="${zr.uid}"]`) }; }, zr);
  pruef(geist && ziel && u.teil === '_gem' && /"von":"anbau"/.test(u.umzug), 'Umziehen per Ziehen: ' + JSON.stringify({ geist, ziel, ...u }));
  const nach = await p.evaluate((zr) => AssistCore.erzeugen(P.assist, null, false).then(() => P.tasks.filter((t) => t.cat === zr.cat).map((t) => t.teil)), zr);
  pruef(nach.includes('_gem') && !nach.includes('anbau'), 'Umzug bleibt nach „Plan neu aus den Angaben“: ' + JSON.stringify(nach));
  await p.evaluate(() => { const b = document.querySelector('[data-abk="anbau"].auf'); if (b) b.querySelector('.ab-kk').dispatchEvent(new MouseEvent('dblclick', { bubbles: true })); });
  await p.waitForTimeout(300);
}
const sv = await p.evaluate(() => [...document.querySelectorAll('#ablaufView .ab-p .ab-pl')].map((x) => x.getAttribute('d')));
pruef(sv.length >= 2, 'Pfeile auf der Seite: ' + sv.length);
pruef(sv.some((d) => { const m = /^M([\d.]+),([\d.]+) C([\d.]+),([\d.]+)/.exec(d); return m && Math.abs(+m[1] - +m[3]) < 0.5 && +m[4] > +m[2]; }), 'Anbau → Aufstockung (übereinander): Pfeil geht unten aus der Kiste');
// Gliederung grob · mittel · fein (GL-A1 B1 C1, seit 19.11.2026 D1: grob = oberste, mittel = innerste Gruppen zu – mit der Ebene Gewerk aus „Gruppieren“)
const gl = await p.evaluate(() => {
  ablaufGruppieren(['teil', 'phase', 'gewerk']);
  const blatt = () => P.tasks.filter((t) => t.cat && t.cat[0] !== '_').map((t) => t.uid).sort((a, b) => a - b).join(','), b0 = blatt(), R = {};
  ganttStufe.setze('mittel'); R.mittel = { gw: P.tasks.filter((t) => t.cat === '_gw').length, zu: P.tasks.filter((t) => t.cat === '_gw' && t.collapsed).length, gleich: blatt() === b0 };
  ganttStufe.setze('grob'); R.grob = { gw: P.tasks.filter((t) => t.cat === '_gw').length, grpZu: P.tasks.filter((t) => t.cat === '_grp' && t.collapsed).length, gleich: blatt() === b0 };
  const i = P.tasks.findIndex((t) => t.cat === '_grp' && t.collapsed); R.farbe = i >= 0 ? ganttStufe.summeFarbe(i) : null;
  ganttStufe.setze('fein', 'anbau'); R.block = { anbau: ganttStufe.stufeVon('anbau'), bestand: ganttStufe.stufeVon('bestand'), offen: P.tasks.filter((t) => t.cat === '_grp' && t.teil === 'anbau' && t.collapsed).length };
  const vorher = JSON.stringify(P.tasks); const Lg = printMitStufe({ ...printOpts(), outline: 'grob' }), Lf = printMitStufe({ ...printOpts(), outline: 'fein' });
  R.druck = { grob: Lg.rows.length, fein: Lf.rows.length, unveraendert: JSON.stringify(P.tasks) === vorher };
  ganttStufe.setze('fein'); R.fein = { gw: P.tasks.filter((t) => t.cat === '_gw').length, gleich: blatt() === b0 };
  doUndo(); R.undo = ganttStufe.plan();
  return R; });
pruef(gl.mittel.gw > 0 && gl.mittel.gw === gl.mittel.zu && gl.mittel.gleich, 'Gliederung mittel: Gewerk-Zeilen zugeklappt, Leistungen alle da: ' + JSON.stringify(gl.mittel));
pruef(gl.grob.gw === gl.mittel.gw && gl.grob.grpZu > 0 && gl.grob.gleich && /^#/.test(gl.farbe || ''), 'Gliederung grob: Bauphasen zugeklappt, farbig: ' + JSON.stringify([gl.grob, gl.farbe]));
pruef(gl.block.anbau === 'fein' && gl.block.bestand === 'grob' && gl.block.offen === 0, 'Gliederung je Block: ' + JSON.stringify(gl.block));
pruef(gl.druck.grob < gl.druck.fein && gl.druck.unveraendert, 'Druck mit eigener Gliederung, Plan bleibt: ' + JSON.stringify(gl.druck));
pruef(gl.fein.gw === gl.mittel.gw && gl.fein.gleich && gl.undo === 'grob', 'zurück auf fein, Rückgängig: ' + JSON.stringify([gl.fein, gl.undo]));
// Endgültig zusammenfassen (GL-A2): erst Warnung, Abbrechen ändert nichts; danach eine Leistung, Anfang und Ende gleich, Nachfolger hängen daran, Rückgängig
const zs = await p.evaluate(async () => {
  CAL = schedule(); const i = P.tasks.findIndex((t, k) => t.cat === '_grp' && t.teil === 'anbau' && CAL.summ[k]), t = P.tasks[i], uid = t.uid;
  const vor = { n: P.tasks.length, sd: CAL.sd[i], fd: CAL.fd[i], pe: CAL.pe };
  let warn = '', antwort = false; window.bpFrage = async (m) => { warn = m; return antwort; };   // Dialog nachgebildet (im Test ohne Kopfleiste)
  await ganttStufe.zusammenfassen(i); const nachAbbr = P.tasks.length;
  antwort = true; await ganttStufe.zusammenfassen(i);
  CAL = schedule(); const j = P.tasks.findIndex((x) => x.uid === uid), nach = { n: P.tasks.length, sd: CAL.sd[j], fd: CAL.fd[j], pe: CAL.pe, summ: !!CAL.summ[j], cat: P.tasks[j].cat };
  const haengt = P.tasks.some((x) => (x.preds || []).some((p) => p.uid === uid));
  doUndo(); CAL = schedule();
  return { warn, nachAbbr, vor, nach, haengt, zurueck: P.tasks.length }; });
pruef(/endgültig/.test(zs.warn) && zs.nachAbbr === zs.vor.n, 'Warnung vor dem Zusammenfassen, Abbrechen ändert nichts: ' + JSON.stringify([zs.warn, zs.nachAbbr, zs.vor.n]));
pruef(zs.nach.n < zs.vor.n && !zs.nach.summ && zs.nach.cat === '' && zs.nach.sd === zs.vor.sd && zs.nach.fd >= zs.vor.fd && zs.haengt, 'Zusammengefasst: eine Leistung, gleicher Anfang, Nachfolger hängen daran: ' + JSON.stringify(zs));
pruef(zs.zurueck === zs.vor.n, 'Rückgängig holt die Leistungen zurück: ' + JSON.stringify([zs.zurueck, zs.vor.n]));
await p.evaluate(() => ganttStufe.setze('grob')); await p.evaluate(() => showTab('vorgang')); await p.waitForTimeout(400);
pruef(await p.evaluate(() => document.querySelectorAll('.bar.sum.zu rect.b').length > 0), 'Gantt: zugeklappte Bauphase als farbiger Balken');
await p.evaluate(() => { ganttStufe.setze('fein'); showTab('ablauf'); }); await p.waitForTimeout(400);
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
