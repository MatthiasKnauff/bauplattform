// Benachrichtigungen (meldungen.js, 18.11.2026): die Liste hat in Standardbreite keinen waagerechten Rollbalken – der Ein/Aus-Schalter rechts
// ist sichtbar; das Häkchen zum Markieren bleibt ein Häkchen, auch mit dem Stil „Schalter“ (html[data-schalter="an"]), sonst sieht es aus wie
// ein ausgeschalteter Schalter. Lange Titel und Projekte brechen um. Nachgebildeter Kern, kein Server.
//
// Aufgerufen aus oberflaeche.mjs:  const fehler = await meldungenPruefen(browser, repoWurzel)   – allein: node tools/tests/ui/meldungen.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

export async function meldungenPruefen(browser, repo) {
  const KASTEN = path.join(repo, 'shared/bpcore/head'), fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  const BK = /BAUKASTEN = \(([^)]*)\)/.exec(fs.readFileSync(path.join(repo, 'shared/bpcore/head.py'), 'utf8'))[1].match(/"[^"]+"/g).map((s) => s.slice(1, -1));
  const baukasten = 'void 0;\n' + BK.map((f) => fs.readFileSync(path.join(KASTEN, f), 'utf8')).join('\n;\n');
  const html = '<!doctype html><html lang="de" data-schalter="an"><head><meta charset="utf-8"><link rel="stylesheet" href="bp/bp.css"><link rel="stylesheet" href="bp/head.css"></head><body><div id="h" style="padding:1rem"></div><script src="bp/baukasten.js"></script><script src="bp/head.js"></script></body></html>';
  const lang = 'Gewerk Baugrund (Firma noch offen) kommt zum ersten Mal auf die Baustelle – Mo 23.11.2026 und noch ein sehr langer Zusatz dazu';
  const L = { erinnerung: Array.from({ length: 6 }, (_, i) => ({ id: 'r' + i, art: 'erinnerung', titel: lang, projekt: 'A534 Ostpreußenstraße 54, 45259 Essen-Heisingen Erweiterung', fuer: ['Matthias Knauff', 'Zimmermann'], datum: '2026-11-23', uhrzeit: '08:00', woher: 'Bauzeitenplan', gesendet: '2026-11-17', aktiv: true, loeschbar: false })),
    hinweis: [], kalender: [], mail: [{ id: 'm1', art: 'mail', titel: 'Erinnerungen per Mail', fuer: ['Paganini-Langername'], datum: 'am Erinnerungstag', woher: 'Vorgabe', aktiv: true }] };
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 900 } }), p = await ctx.newPage();
  p.on('pageerror', (e) => fehler.push('JavaScript-Fehler: ' + String(e.message || e).split('\n')[0]));
  await p.route('http://ml.test/**', async (r) => {
    const u = new URL(r.request().url()), pf = u.pathname.replace(/^\//, ''), J = (o) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(o) });
    if (pf === '') return r.fulfill({ contentType: 'text/html', body: html });
    if (pf === 'bp/baukasten.js') return r.fulfill({ contentType: 'text/javascript', body: baukasten });
    if (pf.startsWith('bp/')) { const f = path.join(KASTEN, pf.slice(3)); return fs.existsSync(f) ? r.fulfill({ contentType: f.endsWith('.css') ? 'text/css' : 'text/javascript', body: fs.readFileSync(f) }) : r.fulfill({ status: 404, body: '' }); }
    if (pf === 'api/bp/meldungen') return J({ listen: L, darf_alle: true, personen: [], rollen: [], regeln: [], matrix: {} });
    return J({});
  });
  try {
    await p.goto('http://ml.test/'); await p.waitForFunction(() => window.BPHead && BPHead.meldungen, null, { timeout: 20000 });
    await p.evaluate(() => BPHead.meldungen(document.getElementById('h'), { alle: true }));
    await p.evaluate(() => { document.documentElement.dataset.schalter = 'an'; });   // Stil „Schalter“ (⚙ → Darstellung → Häkchen)
    await p.waitForSelector('table.bp-ml [data-mlsw]', { timeout: 8000 });
    const m = await p.evaluate(() => { const w = document.querySelector('.bp-ml-tw'), sw = document.querySelector('[data-mlsw]').getBoundingClientRect(), ck = getComputedStyle(document.querySelector('[data-mlsel]'));
      return { ueber: w.scrollWidth - w.clientWidth, swRechts: sw.right, breite: w.getBoundingClientRect().right, ckApp: ck.appearance || ck.webkitAppearance, ckBreite: parseFloat(ck.width) }; });
    pruef(m.ueber <= 1, `waagerechter Rollbalken in der Liste (${m.ueber} px zu breit)`);
    pruef(m.swRechts <= m.breite + 1, `Ein/Aus-Schalter rechts abgeschnitten (${m.swRechts} > ${m.breite})`);
    pruef(m.ckApp !== 'none' && m.ckBreite < 24, `Markier-Häkchen sieht aus wie ein Schalter (appearance ${m.ckApp}, ${m.ckBreite}px)`);
  } catch (e) { fehler.push('Prüfung bricht ab – ' + String(e.message).split('\n')[0]); }
  await ctx.close();
  return fehler;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await meldungenPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
  await b.close(); console.log(f.length ? f.join('\n') : 'ok'); process.exit(f.length ? 1 : 0);
}
