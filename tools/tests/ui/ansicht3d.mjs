// 3D-Ansicht (bp/ansicht3d.js, GO 16.11.2026): Netz laden, zeichnen (WebGL), Geschosse/Dach ein/aus, Färben nach Maßnahme,
// Antippen eines Bauteils zeigt Name, Nummer und Maßnahme aus der Checkliste. Ablauftest im echten Browser, ohne Server.
//
// Aufgerufen aus oberflaeche.mjs:  const fehler = await ansicht3dPruefen(browser, repoWurzel)   – allein: node tools/tests/ui/ansicht3d.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

const quader = (x0, y0, z0, x1, y1, z1) => {   // Dreiecke eines Quaders in cm
  const P = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]];
  const F = [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]];
  return F.flatMap(([a, b, c, d]) => [...P[a], ...P[b], ...P[c], ...P[a], ...P[c], ...P[d]]);
};

export async function ansicht3dPruefen(browser, repo) {
  const R = path.join(repo, 'shared/bpcore/head/'), fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  const p = await browser.newPage({ viewport: { width: 900, height: 700 } });
  p.on('pageerror', (e) => fehler.push('Fehler im Skript – ' + e.message));
  const N = { e: [{ i: 10, t: 'w', g: 0, c: '', a: 0, v: quader(-500, -100, 0, 500, 100, 1500) }, { i: 20, t: 'r', g: 1, c: '#333333', a: 0, v: quader(-600, -300, 1500, 600, 300, 1600) }],
    geschosse: [{ n: 'Erdgeschoss', z: 0 }, { n: 'Dach', z: 3 }], dreiecke: 24, voll: true };
  await p.route('http://d3.test/**', (r) => {
    const u = new URL(r.request().url()).pathname;
    if (u === '/seite') return r.fulfill({ contentType: 'text/html', body: `<!doctype html><meta charset=utf-8><body style="margin:0"><div id="f" style="width:880px"></div><script>${fs.readFileSync(R + 'ansicht3d.js', 'utf8')}</script>
      <script>bp3d.mount(document.getElementById('f'), { url: '/netz', zeilen: [{ id: 'w', name: 'Wand außen 36,5 cm', status: 'erneuern', ids: [10], nummern: [], kurz: 'Putz erneuern' }] })</script>` });
    if (u === '/netz') return r.fulfill({ contentType: 'application/json', body: JSON.stringify(N) });
    return r.fulfill({ status: 404, body: '' });
  });
  try {
    await p.goto('http://d3.test/seite');
    await p.waitForSelector('.b3-l [data-b3g="1"]');
    const a = await p.evaluate(() => ({ knoepfe: [...document.querySelectorAll('.b3-l button')].map((b) => b.textContent), legende: document.querySelector('.b3-k').textContent,
      meld: document.querySelector('.b3-m').hidden }));
    pruef(a.knoepfe.includes('Erdgeschoss') && a.knoepfe.includes('Dach') && /erneuern/.test(a.legende) && a.meld, `Leiste und Legende: ${JSON.stringify(a)}`);
    { const k = await p.$eval('.b3 canvas', (c) => +c.dataset.kanten);   // 19.11.2026: Randlinien – je Quader 12 Kanten, keine Diagonalen der Flächen
      pruef(k === 24, `Randlinien der Bauteile: ${k} statt 24 Kanten`); }
    const bx = await p.$eval('.b3 canvas', (c) => { const r = c.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
    await p.mouse.click(bx[0], bx[1]); await p.waitForTimeout(200);
    const info = await p.evaluate(() => { const i = document.querySelector('.b3-i'); return i.hidden ? '' : i.textContent; });
    pruef(/Wand außen/.test(info) && /erneuern/.test(info) || /Dach|Bauteil/.test(info), `Antippen zeigt das Bauteil: „${info}“`);
    await p.click('[data-b3g="1"]'); await p.click('[data-b3f="modell"]');
    pruef(await p.evaluate(() => !document.querySelector('[data-b3g="1"]').classList.contains('on') && document.querySelector('.b3-k').hidden), 'Geschoss aus, Farben des Modells ohne Legende');
    await p.mouse.move(bx[0], bx[1]); await p.mouse.down(); await p.mouse.move(bx[0] + 120, bx[1] + 40, { steps: 5 }); await p.mouse.up();
    await p.mouse.wheel(0, -300); await p.waitForTimeout(100);
    pruef(await p.evaluate(() => document.querySelector('.b3 canvas').width > 0), 'Zeichenfläche fehlt');
    // abgedocktes Fenster (seite.js) = anderes Dokument: der Stil muss dort ankommen, sonst steht eine winzige Zeichenfläche ohne Leiste da (20.11.2026)
    const fr = await p.evaluate(async () => { const f = document.createElement('iframe'); f.style.cssText = 'width:700px;height:500px'; document.body.append(f);
      const d = f.contentDocument; d.body.innerHTML = '<div id="g" style="height:460px"></div>';
      bp3d.mount(d.getElementById('g'), { url: '/netz', zeilen: [] }); await new Promise((r) => setTimeout(r, 400));
      const b = d.querySelector('.b3'), c = d.querySelector('.b3 canvas'); return { pos: f.contentWindow.getComputedStyle(b).position, w: c.clientWidth, h: c.clientHeight }; });
    pruef(fr.pos === 'relative' && fr.w > 500 && fr.h > 300, `Stil im abgedockten Fenster: ${JSON.stringify(fr)}`);
  } catch (e) { fehler.push('bricht ab – ' + String(e.message).split('\n')[0]); }
  await p.close();
  return fehler;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await ansicht3dPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
  await b.close(); console.log(f.length ? f.join('\n') : 'ok'); process.exit(f.length ? 1 : 0);
}
