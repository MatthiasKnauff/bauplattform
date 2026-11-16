// Ausschreibung → Versand an Bieter:innen, Details einer Firma: der Stand (abgegeben / will abgeben / gibt nicht ab / offen) steht als eine Reihe,
// auch im schmalen Bereich – 16.11.2026 stapelte er sich zu einem senkrechten Klumpen (alte Breitenregel der Tabelle, 2×2-Raster im Container).
//
// Aufgerufen aus oberflaeche.mjs:  const fehler = await versandstandPruefen(browser, repoWurzel)   – allein: node tools/tests/ui/versandstand.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

export async function versandstandPruefen(browser, repo) {
  const css = fs.readFileSync(path.join(repo, 'plattform/static/ava.css'), 'utf8'), fehler = [];
  for (const w of [640, 1200]) {
    const p = await browser.newPage({ viewport: { width: w, height: 400 } });
    await p.setContent(`<style>${css}</style><div class="vs-seite" style="container-type:inline-size"><table class="vs-tab"><tr class="vs-det"><td colspan="5"><div class="vs-dg">
      <div class="vs-an"><select><option>Jörg Assenmacher</option></select><input value="Sehr geehrte Damen und Herren,"></div>
      <div class="vs-sta"><span class="seg sm"><button>abgegeben</button><button>will abgeben</button><button>gibt nicht ab</button><button class="on">offen</button></span></div><div class="vs-nf"></div></div></td></tr></table></div>`);
    const h = await p.evaluate(() => { const b = [...document.querySelectorAll('.vs-sta .seg button')].map((x) => Math.round(x.getBoundingClientRect().top)); return new Set(b).size; });
    if (h !== 1) fehler.push(`${w} px: Stand-Knöpfe in ${h} Reihen statt einer`);
    await p.close();
  }
  return fehler;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await versandstandPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
  await b.close(); console.log(f.length ? f.join('\n') : 'ok'); process.exit(f.length ? 1 : 0);
}
