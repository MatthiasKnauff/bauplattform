// Breite: Tabellen und Listen nutzen die ganze Breite des Fensters – Ablauftest im echten Browser bei 1.920 px mit nachgebildeten (leeren) Server-Antworten.
// Geprüft je App: der Bereich neben der Navigation reicht bis an den rechten Fensterrand (keine feste Obergrenze mehr); in der Verwaltung
// bleiben Seiten mit Karten und Text (Server-Status) schmal. Regel im Baukasten: bp.css (.bp-voll / .bp-schmal).
//
// Aufgerufen aus oberflaeche.mjs:  const fehler = await breitePruefen(browser, repoWurzel)   – allein: node tools/tests/ui/breite.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

export async function breitePruefen(browser, repo) {
  const KASTEN = path.join(repo, 'shared/bpcore/head'), STAT = path.join(repo, 'plattform/static');
  const BK = /BAUKASTEN = \(([^)]*)\)/.exec(fs.readFileSync(path.join(repo, 'shared/bpcore/head.py'), 'utf8'))[1].match(/"[^"]+"/g).map((s) => s.slice(1, -1));
  const baukasten = 'void 0;\n' + BK.map((f) => fs.readFileSync(path.join(KASTEN, f), 'utf8')).join('\n;\n');
  const fehler = [];
  // [Seite, Auswahl des Bereichs, voll?]
  const SEITEN = [['aufgaben', '#pane', true], ['aufgaben#post', '.pv', true], ['papierkorb', 'section.pane', true], ['plaene', 'section.pane', true], ['zeiten', 'section.pane', true],
    ['admin#sessions', '#main', true], ['admin#system', '#main', false]];
  for (const [seite, sel, voll] of SEITEN) {
    const [name, hash = ''] = seite.split('#');
    const ctx = await browser.newContext({ viewport: { width: 1920, height: 1000 } }), p = await ctx.newPage();
    await p.route('http://portal.test/**', (r) => {
      const u = new URL(r.request().url()), pf = u.pathname.replace(/^\//, '');
      if (pf === name) return r.fulfill({ contentType: 'text/html', body: fs.readFileSync(path.join(STAT, name + '.html'), 'utf8') });
      if (pf === 'bp/baukasten.js') return r.fulfill({ contentType: 'text/javascript', body: baukasten });
      const f = pf.startsWith('bp/') ? path.join(KASTEN, pf.slice(3)) : pf.startsWith('static/') ? path.join(STAT, pf.slice(7)) : null;
      if (f) return fs.existsSync(f) ? r.fulfill({ contentType: f.endsWith('.css') ? 'text/css' : 'text/javascript', body: fs.readFileSync(f) }) : r.fulfill({ status: 404, body: '' });
      const a = pf === 'api/me' ? { ok: true, id: 1, name: 'admin', vorname: 'A', role: 'admin', admin: true, look: {}, rechte: [] }
        : pf === 'api/platform' ? { apps: [], user: { name: 'admin', role: 'admin' }, projekte: [] } : /s$|liste|kontakte|neuigkeit|verlauf|fehler|items/.test(pf) ? [] : {};
      return r.fulfill({ contentType: 'application/json', body: JSON.stringify(a) });
    });
    try {
      await p.goto(`http://portal.test/${name}${hash ? '#' + hash : ''}`); await p.waitForSelector(sel, { timeout: 20000 }); await p.waitForTimeout(700);
      if (name === 'admin') { await p.evaluate(async (h) => { tab = h === 'system' ? 'system' : h; data.sys = 'health'; await load(); }, hash); await p.waitForTimeout(200); }   // die Seite direkt wählen (das nachgebildete Konto landet sonst bei „Persönlich“)
      const m = await p.evaluate((s) => { const e = document.querySelector(s), b = e.getBoundingClientRect(); return { rest: Math.round(innerWidth - b.right), w: Math.round(b.width), max: getComputedStyle(e).maxWidth }; }, sel);
      if (voll && (m.rest > 24 || m.max !== 'none')) fehler.push(`${seite}: der Bereich nutzt die Breite nicht (${m.w} px breit, rechts ${m.rest} px frei, Obergrenze ${m.max})`);
      if (!voll && m.w > 1120) fehler.push(`${seite}: Karten und Text sollen schmal bleiben (${m.w} px breit)`);
    } catch (e) { fehler.push(`${seite}: bricht ab – ` + String(e.message).split('\n')[0]); }
    await ctx.close();
  }
  return fehler;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await breitePruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
  await b.close(); console.log(f.length ? f.join('\n') : 'ok'); process.exit(f.length ? 1 : 0);
}
