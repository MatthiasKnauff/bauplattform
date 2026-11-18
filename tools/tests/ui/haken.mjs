// Rechnung prüfen im Dokument – Abhaken (ava-aufmass.js, 18.11.2026): auf Seite 2 Klick ✔ → noch mal rotes ✘ (sichtbar, nicht von der
// Kennzahlen-Regel „.kz“ ausgeblendet) → noch mal weg; das ganze Zeichen ist anklickbar, knapp daneben schaltet dasselbe Zeichen weiter
// statt einen zweiten Haken zu setzen; zwei Seitenaufbauten zugleich (Breite geändert) ergeben die Seiten genau einmal, in der richtigen Reihenfolge.
// Echte Skripte, nachgebildete Umgebung (L, api) – kein Server, kein pdf.js.
//
// Aufgerufen aus oberflaeche.mjs:  const fehler = await hakenPruefen(browser, repoWurzel)   – allein: node tools/tests/ui/haken.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

export async function hakenPruefen(browser, repo) {
  const S = path.join(repo, 'plattform/static'), fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  const stub = "const LS={get:(k,d)=>d,set(){}}; let L=null, tab='rechnungen', PJSEL='r1'; const api=async()=>({}); const toast=()=>{}; const esc=(s)=>String(s??''); const nf=(v)=>String(v); const nf2=nf; const rueckgaengig=()=>{}; const bpFrage=async()=>true;";
  const html = `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="s/ava.css"></head><body><div class="am-pv" style="height:760px;overflow:auto;width:600px"></div><script>${stub}</script><script src="s/ava-aufmass.js"></script><script src="s/ava-dokument.js"></script></body></html>`;
  const ctx = await browser.newContext({ viewport: { width: 900, height: 900 } }), p = await ctx.newPage();
  p.on('pageerror', (e) => fehler.push('JavaScript-Fehler: ' + String(e.message || e).split('\n')[0]));
  await p.route('http://hk.test/**', (r) => { const u = new URL(r.request().url()).pathname; if (u === '/') return r.fulfill({ contentType: 'text/html', body: html });
    const f = path.join(S, u.replace('/s/', '')); return fs.existsSync(f) ? r.fulfill({ contentType: u.endsWith('.css') ? 'text/css' : 'text/javascript', body: fs.readFileSync(f) }) : r.fulfill({ status: 404, body: '' }); });
  try {
    await p.goto('http://hk.test/');
    await p.evaluate(() => {
      L = { rechnungen: [{ id: 1, nr: 1, status: 'offen', art: 'abschlag', data: { haken: [] }, belege: [{ id: 5, name: 'R.pdf' }] }], calc: { rechnungen: [{ id: 1, leistung: 0, nachlass: 0 }], aufmass: {} }, vergabe: {}, aufmass: [] };
      const el = document.querySelector('.am-pv'), pages = [];
      for (let i = 0; i < 2; i++) { const w = document.createElement('div'); w.className = 'am-pg'; w.style.width = '560px'; w.style.height = '700px'; el.appendChild(w); pages.push(w); }
      AMV = { bid: 5, el, pages, zoom: 1 }; amMarken(); pages[1].scrollIntoView();
    });
    const punkt = await p.evaluate(() => { const q = AMV.pages[1].getBoundingClientRect(); return { x: q.left + 200, y: q.top + 300 }; });
    const H = () => p.evaluate(() => L.rechnungen[0].data.haken.slice());
    await p.mouse.click(punkt.x, punkt.y); await p.waitForTimeout(80);
    pruef(JSON.stringify(await H()) === '["5|2|0.4286|0.3451"]', `1. Klick: Haken auf Seite 2 erwartet, kam ${JSON.stringify(await H())}`);
    await p.mouse.click(punkt.x + 4, punkt.y + 3); await p.waitForTimeout(80);   // nicht genau auf den Strich
    pruef(JSON.stringify(await H()) === '["5|2|0.4286|0.3451|k"]', `2. Klick: Kreuz erwartet, kam ${JSON.stringify(await H())}`);
    const k = await p.evaluate(() => { const d = document.querySelector('.am-mk.hk-kreuz'), r = d && d.getBoundingClientRect(); return r ? { w: r.width, h: r.height, f: getComputedStyle(d).color } : null; });
    pruef(k && k.w > 10 && k.h > 10 && k.f === 'rgb(224, 36, 36)', `rotes Kreuz nicht sichtbar: ${JSON.stringify(k)}`);
    await p.mouse.click(punkt.x - 3, punkt.y - 2); await p.waitForTimeout(80);
    pruef(JSON.stringify(await H()) === '[]', `3. Klick: weg erwartet (kein zweiter Haken), kam ${JSON.stringify(await H())}`);
    // zwei Seitenaufbauten zugleich: Seiten genau einmal
    const n = await p.evaluate(async () => {
      const seite = (i) => ({ getViewport: ({ scale }) => ({ width: 100 * scale, height: 140 * scale }), render: () => ({ promise: new Promise((ok) => setTimeout(ok, 20 + (i % 2) * 15)) }) });
      AMV.pdf = { numPages: 3, getPage: async (i) => { await new Promise((ok) => setTimeout(ok, 5)); return seite(i); } };
      const a = amPdfZeichnen(AMV); await new Promise((ok) => setTimeout(ok, 12)); const b = amPdfZeichnen(AMV); await Promise.all([a, b]);
      return [AMV.pages.length, AMV.el.querySelectorAll('.am-pg').length, AMV.pages.every((w) => w.parentElement === AMV.el)];
    });
    pruef(n[0] === 3 && n[1] === 3 && n[2], `Seiten doppelt nach zwei Aufbauten: ${JSON.stringify(n)}`);
  } catch (e) { fehler.push('Prüfung bricht ab – ' + String(e.message).split('\n')[0]); }
  await ctx.close();
  return fehler;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await hakenPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
  await b.close(); console.log(f.length ? f.join('\n') : 'ok'); process.exit(f.length ? 1 : 0);
}
