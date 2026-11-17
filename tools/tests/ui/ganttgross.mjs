// Großer Bauzeitenplan (600 Leistungen) bleibt flüssig – Mess- und Ablauftest im echten Browser (17.11.2026, wie lvgross.mjs für das LV).
// Die Seite läuft mit ihren echten Skripten aus dem Repository; nur die Antworten des Servers sind nachgebildet (ein Plan mit 600 Leistungen).
// Geprüft: nur ein Ausschnitt der Zeilen steht in Tabelle und Diagramm (fenster() in gantt-diagramm.js), Rollen baut nach – unten stehen die
// letzten Zeilen, Balken und Verknüpfungslinien dazu; die Zeile mit dem Cursor ist immer dabei; Zeitgrenzen für Neuzeichnen und Klick.
// Die Grenzen sind großzügig (langsame Maschine der Pipeline, ohne Grafikbeschleunigung); hier gemessen: Neuzeichnen ~30 ms, Klick ~23 ms.
//
// Aufgerufen aus oberflaeche.mjs:  const fehler = await ganttGrossPruefen(browser, repoWurzel)   – allein: node tools/tests/ui/ganttgross.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

const N = 600, GRENZE = { render: 400, klick: 150 };

export async function ganttGrossPruefen(browser, repo) {
  const PUB = path.join(repo, 'gantt/public'), KASTEN = path.join(repo, 'shared/bpcore/head');
  const BK = /BAUKASTEN = \(([^)]*)\)/.exec(fs.readFileSync(path.join(repo, 'shared/bpcore/head.py'), 'utf8'))[1].match(/"[^"]+"/g).map((s) => s.slice(1, -1));
  const baukasten = 'void 0;\n' + BK.map((f) => fs.readFileSync(path.join(KASTEN, f), 'utf8')).join('\n;\n');
  const fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  const J = (o) => ({ contentType: 'application/json', body: JSON.stringify(o) });
  const ART = (f) => (f.endsWith('.css') ? 'text/css' : f.endsWith('.js') ? 'text/javascript' : f.endsWith('.html') ? 'text/html' : 'application/octet-stream');
  const tasks = []; for (let i = 1; i <= N; i++) tasks.push(i % 10 === 1 ? { uid: i, name: 'Abschnitt ' + i, dur: 0, lvl: 0, preds: [] } : { uid: i, name: 'Leistung ' + i, dur: 1 + (i % 9), lvl: 1, preds: i % 10 > 2 ? [{ uid: i - 1, type: 'FS', lag: 0 }] : [] });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } }), p = await ctx.newPage();
  p.on('pageerror', (e) => { if (!/NaN/.test(e.message)) fehler.push('JavaScript-Fehler: ' + String(e.message || e).split('\n')[0]); });
  await p.addInitScript(() => { try { localStorage.clear(); } catch { /* egal */ } });
  await p.route('http://portal.test/**', (r) => { const u = new URL(r.request().url()), pf = u.pathname.replace(/^\/gantt\//, '').replace(/^\//, '');
    if (pf === '' || pf === 'gantt') return r.fulfill({ contentType: 'text/html', body: fs.readFileSync(path.join(PUB, 'index.html'), 'utf8') });
    if (pf === 'bp/baukasten.js') return r.fulfill({ contentType: 'text/javascript', body: baukasten });
    const f = pf.startsWith('bp/') ? path.join(KASTEN, pf.slice(3)) : path.join(PUB, pf);
    if (!pf.startsWith('api/') && fs.existsSync(f) && fs.statSync(f).isFile()) return r.fulfill({ contentType: ART(f), body: fs.readFileSync(f) });
    if (!pf.startsWith('api/')) return r.fulfill({ status: 404, body: '' });
    if (r.request().method() === 'PUT') return r.fulfill(J({ ok: true, rev: 2 }));
    if (pf === 'api/me') return r.fulfill(J({ ok: true, id: 1, name: 'admin', vorname: 'A', role: 'admin', admin: true, is_admin: true, look: {} }));
    if (pf === 'api/platform') return r.fulfill(J({ apps: [], user: { name: 'admin', role: 'admin' }, projekte: [] }));
    if (pf === 'api/projects') return r.fulfill(J([{ id: 1, name: 'Großer Plan', updated: '2026-11-15' }]));
    if (/^api\/projects\/(1|undefined)$/.test(pf)) return r.fulfill(J({ id: 1, name: 'Großer Plan', rev: 1, start: 20773, nextUid: N + 1, tasks }));
    return r.fulfill({ contentType: 'application/json', body: /projects$|firms|presets|liste|versions|neuigkeit|kontakte|library/.test(pf) ? '[]' : '{}' }); });
  try {
    await p.goto('http://portal.test/gantt/'); await p.waitForTimeout(1500);
    await p.evaluate(async () => { if (!P) await openProject(1); }); await p.waitForSelector('#gridBody .row', { timeout: 10000 }); await p.waitForTimeout(500);
    await p.evaluate(() => {
      window.bild = () => new Promise((r) => requestAnimationFrame(() => { const c = new MessageChannel(); c.port1.onmessage = () => r(); c.port2.postMessage(0); }));
      window.mess = async (f, n = 5) => { const T = []; for (let i = 0; i < n; i++) { const t = performance.now(); await f(i); await bild(); T.push(performance.now() - t); await bild(); } T.sort((a, b) => a - b); return Math.round(T[Math.floor(T.length / 2)]); }; });
    const st = () => p.evaluate(() => { const R = [...document.querySelectorAll('#gridBody .row')]; const B = [...document.querySelectorAll('#chartBody .bar[data-i]')];
      return { n: R.length, von: R.length ? +R[0].dataset.r : -1, bis: R.length ? +R[R.length - 1].dataset.r : -1, balken: B.length, linien: document.querySelectorAll('#chartBody .lk').length, dom: document.querySelectorAll('*').length,
        hoehe: document.getElementById('gridBody').scrollHeight, zeilen: vis.length }; });
    let s = await st();
    pruef(s.zeilen === N, `${N} Leistungen erwartet, sichtbar sind ${s.zeilen}`);
    pruef(s.n > 20 && s.n < 200, `Ausschnitt: zwischen 20 und 200 Zeilen in der Tabelle erwartet, sind ${s.n} (von ${N})`);
    pruef(s.balken > 20 && s.balken < 200, `Ausschnitt: zwischen 20 und 200 Balken im Diagramm erwartet, sind ${s.balken}`);
    pruef(s.hoehe >= N * 24, `Platzhalter: Tabelle muss so hoch sein wie alle Zeilen (${s.hoehe} px für ${N} Zeilen)`);
    pruef(s.dom < 8000, `Seite hat ${s.dom} Elemente – erwartet unter 8.000`);
    // Zeiten
    const T = {};
    T.render = await p.evaluate(() => mess(() => render(), 5));
    T.klick = await p.evaluate(() => mess((k) => { const R = document.querySelectorAll('#gridBody .row'); const el = R[5 + k]; el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); el.dispatchEvent(new MouseEvent('click', { bubbles: true })); }, 6));
    for (const k of Object.keys(GRENZE)) pruef(T[k] <= GRENZE[k], `${k}: ${T[k]} ms – Grenze ${GRENZE[k]} ms`);
    console.log(`          großer Bauzeitenplan (${N} Leistungen): Neuzeichnen ${T.render} ms · Klick auf eine Zeile ${T.klick} ms`);
    // Rollen baut nach: ganz unten stehen die letzten Zeilen, Balken und Linien
    await p.evaluate(() => { gridPane.scrollTop = gridPane.scrollHeight; }); await p.waitForTimeout(300);
    s = await st();
    pruef(s.bis >= N - 1, `nach dem Rollen ans Ende fehlt die letzte Zeile (Zeilen ${s.von}–${s.bis})`);
    pruef(s.von > 0, `nach dem Rollen ans Ende stehen noch alle Zeilen von oben auf der Seite (ab ${s.von})`);
    const unten = await p.evaluate(() => ({ balken: !!document.querySelector(`#chartBody .bar[data-i="${vis.length - 1}"]`), linie: [...document.querySelectorAll('#chartBody .lk')].some((g) => +g.dataset.s >= vis.length - 10), sync: Math.abs(chartPane.scrollTop - gridPane.scrollTop) < 2 }));
    pruef(unten.balken, 'nach dem Rollen ans Ende fehlt der letzte Balken im Diagramm');
    pruef(unten.linie, 'nach dem Rollen ans Ende fehlen die Verknüpfungslinien der letzten Leistungen');
    pruef(unten.sync, 'Diagramm rollt nicht mit der Tabelle');
    // Cursor außerhalb des Bilds: die Zeile ist trotzdem da
    await p.evaluate(() => { gridPane.scrollTop = 0; }); await p.waitForTimeout(300);
    await p.evaluate(() => { cur.r = 400; render(); });
    const cz = await p.evaluate(() => !!document.querySelector('#gridBody .row[data-r="400"]'));
    pruef(cz, 'Zeile mit dem Cursor (400) steht nicht auf der Seite, obwohl sie außerhalb des Bilds liegt');
  } catch (e) { fehler.push('Prüfung bricht ab – ' + String(e.message).split('\n')[0]); }
  await ctx.close();
  return fehler;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await ganttGrossPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
  await b.close(); console.log(f.length ? f.join('\n') : 'ok'); process.exit(f.length ? 1 : 0);
}
