// Anzahl mit − / + (bp.js bpZaehler, GO 18.11.2026 – zuerst Bautagebuch): Schritte um 1, nicht unter min, gedrückt halten zählt weiter,
// „input“ je Schritt und „change“ beim Loslassen, Zahl bleibt eintippbar, Mausrad verstellt nichts, am Handy große Tasten.
//
// Aufgerufen aus oberflaeche.mjs:  const fehler = await zaehlerPruefen(browser, repoWurzel)   – allein: node tools/tests/ui/zaehler.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

export async function zaehlerPruefen(browser, repo) {
  const K = path.join(repo, 'shared/bpcore/head'), css = fs.readFileSync(path.join(K, 'bp.css'), 'utf8'), js = fs.readFileSync(path.join(K, 'bp.js'), 'utf8');
  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><body style="padding:40px">
    <div id="h"></div><div style="height:2000px"></div><script>${js}</script>
    <script>document.getElementById('h').innerHTML = bpZaehler('<input class="cnt" data-k="headcount" type="number" min="0" placeholder="Anz." value="1">');
    window.ev = []; document.addEventListener('input', (e) => ev.push('i' + e.target.value)); document.addEventListener('change', (e) => ev.push('c' + e.target.value));</script></body>`;
  const fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  for (const [w, h, touch] of [[1200, 800, false], [390, 800, true]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch }), p = await ctx.newPage();
    p.on('pageerror', (e) => fehler.push('Skriptfehler: ' + e.message));
    try {
      await p.setContent(html);
      const z = () => p.evaluate(() => ({ v: document.querySelector('[data-zl-z]').value, aus: document.querySelector('[data-zl="-1"]').classList.contains('aus'), ev: ev.splice(0) }));
      const tipp = (s) => (touch ? p.tap(s) : p.click(s));
      const b = await p.evaluate(() => document.querySelector('[data-zl="1"]').getBoundingClientRect().width);
      pruef(touch ? b >= 40 : b < 34, `${w} px: Taste ${Math.round(b)} px breit – ${touch ? 'am Handy groß (≥ 40 px)' : 'am PC klein'}`);
      await tipp('[data-zl="1"]'); let a = await z();
      pruef(a.v === '2' && a.ev.join() === 'i2,c2', `${w} px: + soll 2 ergeben mit input/change, kam ${a.v} (${a.ev})`);
      await tipp('[data-zl="-1"]'); await tipp('[data-zl="-1"]'); a = await z();
      pruef(a.v === '0' && a.aus, `${w} px: zweimal − → 0 und − grau, kam ${a.v} grau=${a.aus}`);
      await tipp('[data-zl="-1"]'); a = await z();
      pruef(a.v === '0' && !a.ev.length, `${w} px: unter 0 geht es nicht (kam ${a.v}, ${a.ev})`);
      if (!touch) {
        const r = await p.evaluate(() => { const x = document.querySelector('[data-zl="1"]').getBoundingClientRect(); return [x.x + x.width / 2, x.y + x.height / 2]; });
        await p.mouse.move(r[0], r[1]); await p.mouse.down(); await p.waitForTimeout(1350); await p.mouse.up(); a = await z();
        pruef(+a.v >= 4 && +a.v <= 7 && a.ev.filter((x) => x[0] === 'c').length === 1, `gedrückt halten 1,35 s: 4–7 erwartet, ein change – kam ${a.v} (${a.ev})`);
        await p.fill('[data-zl-z]', '12'); await p.mouse.move(r[0] - 40, r[1]); await p.mouse.wheel(0, 200); await p.waitForTimeout(100); a = await z();
        pruef(a.v === '12', `eintippen 12 und Mausrad: Zahl bleibt 12, kam ${a.v}`);
      }
    } catch (e) { fehler.push(`${w} px: bricht ab – ` + String(e.message).split('\n')[0]); }
    await ctx.close();
  }
  return fehler;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await zaehlerPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); await b.close();
  console.log(f.length ? 'FEHLER:\n' + f.join('\n') : 'Zähler: ok'); process.exit(f.length ? 1 : 0);
}
