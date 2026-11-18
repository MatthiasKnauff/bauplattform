// Ausklappen (18.11.2026): EIN Zeichen für alle Apps – Abschnitte <details>, Baumzellen (.car.auf/.car.zu) und Zeilen/Knöpfe (bpKlapp)
// zeigen dasselbe Zeichen in derselben Farbe; der Stil „Ausklappen“ (html[data-klapp]) ändert es überall zugleich; ein Menü-<details>
// (class="bp-klapp-aus") bleibt ohne Dreieck; <details data-klapp="…"> merkt sich offen/zu. Nachgebaute Seite, kein Server.
//
// Aufgerufen aus oberflaeche.mjs:  const fehler = await klappenPruefen(browser, repoWurzel)   – allein: node tools/tests/ui/klappen.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

export async function klappenPruefen(browser, repo) {
  const KASTEN = path.join(repo, 'shared/bpcore/head'), fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  const html = '<!doctype html><html lang="de"><head><meta charset="utf-8"><link rel="stylesheet" href="bp/bp.css"><link rel="stylesheet" href="bp/head.css"></head><body>'
    + '<details id="d1"><summary>Abschnitt</summary>Inhalt</details><details id="d2" open><summary>offen</summary>x</details>'
    + '<details id="m" class="bp-klapp-aus"><summary>Menü</summary></details><span id="z"></span><span id="c1" class="car zu"></span><span id="c2" class="car auf"></span>'
    + '<script src="bp/bp.js"></script></body></html>';
  const ctx = await browser.newContext({ viewport: { width: 800, height: 600 } }), p = await ctx.newPage();
  p.on('pageerror', (e) => fehler.push('JavaScript-Fehler: ' + String(e.message || e).split('\n')[0]));
  await p.route('http://kl.test/**', async (r) => {
    const pf = new URL(r.request().url()).pathname.replace(/^\//, '');
    if (pf === '') return r.fulfill({ contentType: 'text/html', body: html });
    const f = path.join(KASTEN, pf.slice(3));
    return pf.startsWith('bp/') && fs.existsSync(f) ? r.fulfill({ contentType: f.endsWith('.css') ? 'text/css' : 'text/javascript', body: fs.readFileSync(f) }) : r.fulfill({ status: 404, body: '' });
  });
  try {
    await p.goto('http://kl.test/'); await p.waitForFunction(() => typeof window.bpKlapp === 'function', null, { timeout: 10000 });
    const lies = () => p.evaluate(() => { document.getElementById('z').innerHTML = bpKlapp(false) + bpKlapp(true);
      const v = (el) => { const s = getComputedStyle(el, '::before'); return { t: s.content, f: s.color }; }, q = (s) => document.querySelector(s);
      return { zu: v(q('#d1>summary')), auf: v(q('#d2>summary')), menue: getComputedStyle(q('#m>summary'), '::before').content, kz: v(q('#z .bp-kl:not(.auf)')), ka: v(q('#z .bp-kl.auf')), cz: v(q('#c1')), ca: v(q('#c2')),
        marker: getComputedStyle(q('#d1>summary')).listStyleType }; });
    let m = await lies();
    pruef(m.zu.t === '"▸"' && m.auf.t === '"▾"', `Abschnitt: Zeichen ${m.zu.t} / ${m.auf.t} statt ▸ / ▾`);
    pruef(m.kz.t === m.zu.t && m.ka.t === m.auf.t && m.cz.t === m.zu.t && m.ca.t === m.auf.t, `Zeile/Baum anders als Abschnitt: ${m.kz.t} ${m.ka.t} ${m.cz.t} ${m.ca.t}`);
    pruef(m.zu.f === m.kz.f && m.zu.f === m.cz.f, `Farbe uneinheitlich: ${m.zu.f} / ${m.kz.f} / ${m.cz.f}`);
    pruef(m.menue === 'none' || m.menue === 'normal', `Menü-<details> bekommt ein Dreieck (${m.menue})`);
    pruef(m.marker === 'none', `Dreieck des Browsers noch sichtbar (list-style ${m.marker})`);
    await p.evaluate(() => { document.documentElement.dataset.klapp = 'plus'; }); m = await lies();
    pruef(m.zu.t === '"+"' && m.ka.t === '"−"' && m.cz.t === '"+"', `Stil „+ / −“ wirkt nicht überall: ${m.zu.t} ${m.ka.t} ${m.cz.t}`);
    await p.evaluate(() => { document.documentElement.dataset.klapp = 'grau'; }); const g = await lies();
    pruef(g.zu.f !== m.zu.f || g.zu.f === g.kz.f, 'Stil „grau“ ändert die Farbe nicht einheitlich');
    const gemerkt = await p.evaluate(async () => { document.body.insertAdjacentHTML('beforeend', `<details id="k" data-klapp="test.k"${bpKlappOffen('test.k', false)}><summary>k</summary></details>`);
      const k = document.getElementById('k'); k.open = true; await new Promise((r) => setTimeout(r, 50)); return bpKlappOffen('test.k', false); });
    pruef(gemerkt === ' open', 'data-klapp merkt sich „offen“ nicht');
  } catch (e) { fehler.push('Prüfung bricht ab – ' + String(e.message).split('\n')[0]); }
  await ctx.close();
  return fehler;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await klappenPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
  await b.close(); console.log(f.length ? f.join('\n') : 'ok'); process.exit(f.length ? 1 : 0);
}
