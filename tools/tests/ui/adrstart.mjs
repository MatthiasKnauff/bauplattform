// Adressen beginnen mit dem Projektbezug (GO 17.11.2026): Filter „Projekt“ = Projekt aus der zuletzt benutzten App; wird er weggeklickt,
// kommt EINMAL die Frage „künftig immer ohne Projekt beginnen?“, die Antwort steht danach als Häkchen unter „Beteiligte …“ und geht an den Server.
//
// Aufgerufen aus oberflaeche.mjs:  const fehler = await adrStartPruefen(browser, repoWurzel)   – allein: node tools/tests/ui/adrstart.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

export async function adrStartPruefen(browser, repo) {
  const KASTEN = path.join(repo, 'shared/bpcore/head');
  const BK = /BAUKASTEN = \(([^)]*)\)/.exec(fs.readFileSync(path.join(repo, 'shared/bpcore/head.py'), 'utf8'))[1].match(/"[^"]+"/g).map((s) => s.slice(1, -1));
  const baukasten = 'void 0;\n' + BK.map((f) => fs.readFileSync(path.join(KASTEN, f), 'utf8')).join('\n;\n');
  const fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  const J = (o) => ({ contentType: 'application/json', body: JSON.stringify(o) });
  const lauf = async (start) => {
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } }), p = await ctx.newPage(), puts = [];
    p.on('pageerror', (e) => fehler.push('Fehler im Skript – ' + e.message));
    await p.route('http://portal.test/**', (r) => { const u = new URL(r.request().url()), pf = u.pathname.replace(/^\/adressen\//, '');
      if (pf === '' ) return r.fulfill({ contentType: 'text/html', body: fs.readFileSync(path.join(repo, 'plattform/static/adressen.html'), 'utf8') });
      if (pf === 'bp/baukasten.js') return r.fulfill({ contentType: 'text/javascript', body: baukasten });
      if (pf.startsWith('bp/')) { const f = path.join(KASTEN, pf.slice(3)); return fs.existsSync(f) ? r.fulfill({ contentType: f.endsWith('.css') ? 'text/css' : 'text/javascript', body: fs.readFileSync(f) }) : r.fulfill({ status: 404, body: '' }); }
      if (pf === 'api/ansicht/start') { const d = JSON.parse(r.request().postData() || '{}'); puts.push(d); return r.fulfill(J({ ohne_projekt: !!d.ohne_projekt, gefragt: !!d.gefragt })); }
      if (pf === 'api/me') return r.fulfill(J({ ok: true, id: 1, name: 'admin', is_admin: true, apps: [], start }));
      if (pf === 'api/platform') return r.fulfill(J({ apps: [], user: { name: 'admin' } }));
      if (pf === 'api/bp/projekt') return r.fulfill(J({ id: 7, name: 'Haus Mustermann' }));
      if (pf === 'api/contacts') return r.fulfill(J([{ id: 1, name: 'Dach GmbH', kind: 'firma', trade: 'Dachdecker', projects: ['Haus Mustermann'], site_of: '' },
        { id: 2, name: 'Putz KG', kind: 'firma', trade: 'Putz', projects: [], site_of: '' }]));
      return r.fulfill(J(/liste|kontakte|neuigkeit/.test(pf) ? [] : {})); });
    await p.goto('http://portal.test/adressen/'); await p.waitForSelector('[data-adr="b"]', { timeout: 10000 }); await p.waitForTimeout(300);
    return { ctx, p, puts };
  };
  const zahl = (p) => p.evaluate(() => shown().length);   // gefilterte Liste (Karten oder Tabelle)
  try {
    { const { ctx, p, puts } = await lauf({ ohne_projekt: false, gefragt: false });
      pruef(await zahl(p) === 1, `Start: nur die Beteiligten des Projekts (1) – ${await zahl(p)}`);
      pruef(await p.isVisible('.adr-ohne input:not(:checked)'), 'Häkchen „immer ohne Projekt beginnen“ fehlt unter „Beteiligte …“');
      await p.click('[data-adr="b"]');
      await p.waitForSelector('.bph-dlg, [data-f="ja"]', { timeout: 3000 }).catch(() => {});
      const txt = await p.evaluate(() => document.body.innerText);
      pruef(/immer ohne Projekt beginnen\?/.test(txt), 'Projekt weggeklickt: keine Frage „künftig immer ohne Projekt beginnen?“');
      await p.click('[data-f="ja"]'); await p.waitForTimeout(300);
      pruef(puts.some((d) => d.ohne_projekt && d.gefragt), `Antwort nicht an den Server – ${JSON.stringify(puts)}`);
      pruef(await p.isVisible('.adr-ohne input:checked'), 'nach „Ja“: Häkchen nicht gesetzt');
      pruef(await zahl(p) === 2, `ohne Projekt: alle Adressen (2) – ${await zahl(p)}`);
      await p.click('[data-adr="b"]'); await p.waitForTimeout(200); await p.click('[data-adr="b"]'); await p.waitForTimeout(300);
      pruef(!(await p.evaluate(() => !!document.querySelector('[data-f="ja"]'))), 'Frage kommt ein zweites Mal');
      await ctx.close(); }
    { const { ctx, p } = await lauf({ ohne_projekt: true, gefragt: true });
      pruef(await zahl(p) === 2, `„immer ohne Projekt“: Start ohne Projektfilter (2) – ${await zahl(p)}`);
      await ctx.close(); }
  } catch (e) { fehler.push('Prüfung bricht ab – ' + String(e.message).split('\n')[0]); }
  return fehler;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await adrStartPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
  await b.close(); console.log(f.length ? f.join('\n') : 'ok'); process.exit(f.length ? 1 : 0);
}
