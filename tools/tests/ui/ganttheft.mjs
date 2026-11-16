// Heftzwecke im Bauzeitenplan (17.11.2026, wie in der Ausschreibung – Baustein befehle.heft): reihum Kopf (Titel, Reiter) weg → auch die
// Befehlsleiste weg → alles wieder da. In Stufe 2 stehen die Befehle der Leiste im Kontextmenü des Plans (ctxMenu, befehle.kmPunkte),
// Die Heftzwecke liegt oben an der rechten Kante des Plans, nicht über dem Bereich rechts.
//
// Aufgerufen aus oberflaeche.mjs:  const fehler = await ganttHeftPruefen(browser, repoWurzel)   – allein: node tools/tests/ui/ganttheft.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

export async function ganttHeftPruefen(browser, repo) {
  const PUB = path.join(repo, 'gantt/public'), KASTEN = path.join(repo, 'shared/bpcore/head');
  const BK = /BAUKASTEN = \(([^)]*)\)/.exec(fs.readFileSync(path.join(repo, 'shared/bpcore/head.py'), 'utf8'))[1].match(/"[^"]+"/g).map((s) => s.slice(1, -1));
  const baukasten = 'void 0;\n' + BK.map((f) => fs.readFileSync(path.join(KASTEN, f), 'utf8')).join('\n;\n');
  const fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  const J = (o) => ({ contentType: 'application/json', body: JSON.stringify(o) });
  const ART = (f) => (f.endsWith('.css') ? 'text/css' : f.endsWith('.js') ? 'text/javascript' : f.endsWith('.html') ? 'text/html' : 'application/octet-stream');
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } }), p = await ctx.newPage();
  p.on('pageerror', (e) => { if (!/NaN/.test(e.message)) fehler.push('Fehler im Skript – ' + e.message); });
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
    if (pf === 'api/projects') return r.fulfill(J([{ id: 1, name: 'Testplan', updated: '2026-11-15' }]));
    if (/^api\/projects\/(1|undefined)$/.test(pf)) return r.fulfill(J({ id: 1, name: 'Testplan', rev: 1, start: 20773, nextUid: 3, tasks: [{ uid: 1, name: 'A', dur: 2, lvl: 0, preds: [] }, { uid: 2, name: 'B', dur: 3, lvl: 0, preds: [] }] }));
    return r.fulfill({ contentType: 'application/json', body: /projects$|firms|presets|liste|versions|neuigkeit|kontakte|library/.test(pf) ? '[]' : '{}' }); });
  try {
    await p.goto('http://portal.test/gantt/'); await p.waitForTimeout(1500);
    await p.evaluate(async () => { if (!P) await openProject(1); }); await p.waitForSelector('#gridBody .row, #gridBody [data-r], #gridBody > div', { timeout: 10000 });
    const sicht = () => p.evaluate(() => { const b = document.querySelector('.bf-heft'), g = document.querySelector('#gridPane'); return { da: !!b, tabs: !!document.querySelector('#tabs').offsetParent && !document.querySelector('#tabs').classList.contains('bf-zu'),
      leiste: !document.querySelector('#leiste').classList.contains('bf-zu'), pinR: b && Math.round(b.getBoundingClientRect().right), planR: Math.round(document.querySelector('#links').getBoundingClientRect().right), pinO: b && Math.round(b.getBoundingClientRect().top), planO: Math.round(g.getBoundingClientRect().top) }; });
    let v = await sicht();
    pruef(v.da && v.tabs && v.leiste, `Heftzwecke fehlt oder Kopf/Leiste nicht da: ${JSON.stringify(v)}`);
    pruef(v.da && v.pinR <= v.planR + 2 && v.pinR > v.planR - 40 && Math.abs(v.pinO - v.planO) < 30, `Heftzwecke nicht oben rechts am Plan: ${JSON.stringify(v)}`);
    await p.click('.bf-heft'); v = await sicht(); pruef(!v.tabs && v.leiste, `Stufe 1: Kopf weg, Leiste da – ${JSON.stringify(v)}`);
    await p.click('.bf-heft'); v = await sicht(); pruef(!v.tabs && !v.leiste, `Stufe 2: Kopf und Leiste weg – ${JSON.stringify(v)}`);
    const zeile = await p.evaluate(() => { const r = document.querySelector('#gridBody').getBoundingClientRect(); return { x: r.left + 60, y: r.top + 10 }; });
    await p.mouse.click(zeile.x, zeile.y, { button: 'right' }); await p.waitForSelector('.ctx');
    const km = await p.evaluate(() => [...document.querySelectorAll('.ctx div')].map((x) => x.textContent.trim()));
    pruef(km.some((t) => t.startsWith('Leistung einfügen')) && ['Gliederung', 'Ganzer Plan', 'Drucken', 'Verlauf'].every((t) => km.includes(t)), `Stufe 2: Befehle der Leiste fehlen im Kontextmenü – ${km.join(' | ')}`);
    await p.keyboard.press('Escape'); await p.mouse.click(5, 880);
    await p.click('.bf-heft'); v = await sicht(); pruef(v.tabs && v.leiste, `wieder angeheftet: ${JSON.stringify(v)}`);
  } catch (e) { fehler.push('Prüfung bricht ab – ' + String(e.message).split('\n')[0]); }
  await ctx.close();
  return fehler;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await ganttHeftPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
  await b.close(); console.log(f.length ? f.join('\n') : 'ok'); process.exit(f.length ? 1 : 0);
}
