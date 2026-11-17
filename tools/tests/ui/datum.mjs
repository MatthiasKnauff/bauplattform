// Datumswahl (bp/datum.js, 17.11.2026 im Aussehen des Bautagebuch-Kalenders – überall): keine KW-Spalte, nur Tage des Monats,
// Punkte an Tagen mit Einträgen (data-punkte), Schnellwahl nur soweit min/max erlauben (nur Vergangenheit → nur „Heute“), „Leeren“ nur ohne required; beides nur bei Fristen/Erinnerungen.
//
// Aufgerufen aus oberflaeche.mjs:  const fehler = await datumPruefen(browser, repoWurzel)   – allein: node tools/tests/ui/datum.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

export async function datumPruefen(browser, repo) {
  const KASTEN = path.join(repo, 'shared/bpcore/head'), fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  const heute = new Date(), iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const mo = iso(heute).slice(0, 7), punkt = `${mo}-01`;
  const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>
    <input type="date" id="a" value="${iso(heute)}" max="${iso(heute)}" required data-punkte="pk" data-schnell> <label>Frist <input type="date" id="b"></label> <label>eingegangen <input type="date" id="c"></label>
    <script>window.pk = async (m) => (m === '${mo}' ? ['${punkt}'] : []);</script><script src="bp/datum.js"></script></body></html>`;
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 } }), p = await ctx.newPage();
  p.on('pageerror', (e) => fehler.push('JavaScript-Fehler: ' + String(e.message || e).split('\n')[0]));
  await p.route('http://dt.test/**', (r) => { const pf = new URL(r.request().url()).pathname;
    if (pf === '/') return r.fulfill({ contentType: 'text/html', body: html });
    return r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(KASTEN, pf.replace('/bp/', ''))) }); });
  try {
    await p.goto('http://dt.test/'); await p.waitForFunction(() => window.bpDatum);
    await p.click('#a'); await p.waitForSelector('.bpd .t');
    await p.waitForFunction((s) => document.querySelector(`.bpd [data-t="${s}"]`).classList.contains('p'), punkt, { timeout: 3000 });
    const a = await p.evaluate(() => ({ kw: [...document.querySelectorAll('.bpd .w')].map((x) => x.textContent).join(','), tage: document.querySelectorAll('.bpd .t').length,
      schnell: [...document.querySelectorAll('.bpd-s button')].map((x) => x.textContent), on: (document.querySelector('.bpd .t.on') || {}).textContent }));
    const n = new Date(heute.getFullYear(), heute.getMonth() + 1, 0).getDate();
    pruef(a.kw === 'Mo,Di,Mi,Do,Fr,Sa,So', `ohne KW-Spalte: ${a.kw}`);
    pruef(a.tage === n, `nur die ${n} Tage des Monats, kamen ${a.tage}`);
    pruef(a.schnell.join('|') === 'Heute', `nur Vergangenheit + Pflichtfeld: nur „Heute“, kamen ${a.schnell.join('|')}`);
    pruef(a.on === String(heute.getDate()), 'gewählter Tag markiert');
    await p.keyboard.press('Escape'); await p.click('#b'); await p.waitForSelector('.bpd .t');
    const b = await p.evaluate(() => [...document.querySelectorAll('.bpd-s button')].map((x) => x.textContent).join('|'));
    pruef(b === 'Heute|+1 Woche|+2 Wochen|+4 Wochen|Leeren', `Frist ohne Grenzen: alle Schnellwahlen und Leeren: ${b}`);
    await p.keyboard.press('Escape'); await p.click('#c'); await p.waitForSelector('.bpd .t');
    const c = await p.evaluate(() => document.querySelectorAll('.bpd-s').length);
    pruef(c === 0, 'normale Datumswahl („eingegangen“): ohne den unteren Teil (Schnellwahl, Leeren)');
  } catch (e) { fehler.push('Prüfung bricht ab – ' + String(e.message).split('\n')[0]); }
  await ctx.close();
  // Tablet (Touch, breit): kein Blatt über die ganze Breite, sondern am Feld wie am Rechner (17.11.2026)
  for (const [w, h, blatt] of [[1180, 820, false], [390, 800, true]]) {
    const c2 = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: w < 700 }), q = await c2.newPage();
    await q.route('http://dt.test/**', (r) => { const pf = new URL(r.request().url()).pathname;
      if (pf === '/') return r.fulfill({ contentType: 'text/html', body: html });
      return r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(KASTEN, pf.replace('/bp/', ''))) }); });
    try {
      await q.goto('http://dt.test/'); await q.waitForFunction(() => window.bpDatum); await q.tap('#a'); await q.waitForSelector('.bpd .t');
      const v = await q.evaluate(() => ({ blatt: document.querySelector('.bpd-bg').classList.contains('blatt'), b: document.querySelector('.bpd').getBoundingClientRect().width }));
      pruef(v.blatt === blatt && (blatt || v.b < 400), `${w} px mit Touch: ${blatt ? 'Blatt von unten erwartet' : 'am Feld erwartet'} – Blatt ${v.blatt}, Breite ${Math.round(v.b)} px`);
    } catch (e) { fehler.push(`${w} px Touch: Prüfung bricht ab – ` + String(e.message).split('\n')[0]); }
    await c2.close();
  }
  return fehler;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await datumPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
  await b.close(); console.log(f.length ? f.join('\n') : 'ok'); process.exit(f.length ? 1 : 0);
}
