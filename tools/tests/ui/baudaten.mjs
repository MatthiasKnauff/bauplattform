// Baudaten: Bereich rechts (seite.js) mit den Reitern „Position“ und „Korb“ – Ablauftest im echten Browser mit nachgebildeten Server-Antworten.
// Geprüft: Steht „Korb“ vorn oder ist der Bereich zugeklappt, liegen die Details (#det) nicht lose im Raster (sie nahmen dem Bereich
// rechts die Spalte weg: Liste schmal, rechts leer); Liste und Bereich stehen nebeneinander und füllen die Breite; „Position“ holt die Details zurück.
//
// Aufgerufen aus oberflaeche.mjs:  const fehler = await baudatenPruefen(browser, repoWurzel)   – allein: node tools/tests/ui/baudaten.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

export async function baudatenPruefen(browser, repo) {
  const KASTEN = path.join(repo, 'shared/bpcore/head'), STAT = path.join(repo, 'plattform/static');
  const BK = /BAUKASTEN = \(([^)]*)\)/.exec(fs.readFileSync(path.join(repo, 'shared/bpcore/head.py'), 'utf8'))[1].match(/"[^"]+"/g).map((s) => s.slice(1, -1));
  const baukasten = 'void 0;\n' + BK.map((f) => fs.readFileSync(path.join(KASTEN, f), 'utf8')).join('\n;\n');
  const fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  const antwort = (pf) => {
    if (pf === 'api/me') return { ok: true, id: 1, name: 'admin', vorname: 'A', role: 'admin', admin: true, look: {} };
    if (pf === 'api/platform') return { apps: [], user: { name: 'admin', role: 'admin' }, projekte: [] };
    if (pf === 'api/start') return { kataloge: [{ key: 'gk3', name: 'Positionsdatenbank', n: 0 }], einheiten: [], lbs: [], gruppen: [], loehne: [] };
    if (pf === 'api/suche') return { positionen: [], gesamt: 0 };
    return /korb|liste|kontakte|neuigkeit|projekte|verlauf|fehler|gruppen|lvs|firmen/.test(pf) ? [] : {};
  };
  async function lauf(name, merker, pruefen) {
    const ctx = await browser.newContext({ viewport: { width: 1900, height: 1000 } }), p = await ctx.newPage();
    await p.addInitScript((m) => { try { for (const k in m) localStorage.setItem(k, m[k]); } catch { /* ohne Speicher */ } }, merker);
    await p.route('http://portal.test/**', (r) => {
      const u = new URL(r.request().url()), pf = u.pathname.replace(/^\//, '');
      if (pf === 'baudaten') return r.fulfill({ contentType: 'text/html', body: fs.readFileSync(path.join(STAT, 'baudaten.html'), 'utf8') });
      if (pf === 'bp/baukasten.js') return r.fulfill({ contentType: 'text/javascript', body: baukasten });
      const f = pf.startsWith('bp/') ? path.join(KASTEN, pf.slice(3)) : pf.startsWith('static/') ? path.join(STAT, pf.slice(7)) : null;
      if (f) return fs.existsSync(f) ? r.fulfill({ contentType: f.endsWith('.css') ? 'text/css' : 'text/javascript', body: fs.readFileSync(f) }) : r.fulfill({ status: 404, body: '' });
      if (/(^|\/)api\//.test(pf)) return r.fulfill({ contentType: 'application/json', body: JSON.stringify(antwort(pf)) });
      return r.fulfill({ status: 404, body: '' });
    });
    try {
      await p.goto('http://portal.test/baudaten');
      await p.waitForSelector('.grid.sr-split > .sr-r', { timeout: 20000 }); await p.waitForTimeout(300);
      const lage = () => p.evaluate(() => { const g = document.querySelector('.grid'), q = (s) => { const e = g.querySelector(':scope > ' + s); if (!e) return null; const b = e.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, w: b.width }; };
        const b = g.getBoundingClientRect(); return { lose: !!g.querySelector(':scope > #det'), det: DET.isConnected, im: !!DET.closest('.sr-r'), li: q('section'), re: q('.sr-r'), g: { l: b.left, r: b.right } }; });
      await pruefen(await lage(), p, lage);
    } catch (e) { fehler.push(`${name}: bricht ab – ` + String(e.message).split('\n')[0]); }
    await ctx.close();
  }
  const neben = (b, name, minR) => {
    pruef(!b.lose, `${name}: die Details (#det) liegen lose im Raster – sie nehmen dem Bereich rechts die Spalte weg`);
    pruef(b.li && b.re && Math.abs(b.li.t - b.re.t) < 4 && b.re.l >= b.li.r - 1, `${name}: Liste und Bereich rechts stehen nicht nebeneinander`);
    pruef(b.re && b.re.w >= minR && b.g.r - b.re.r < 4, `${name}: der Bereich rechts füllt die Breite nicht (${b.re && Math.round(b.re.w)} px, Rest ${b.re && Math.round(b.g.r - b.re.r)} px)`);
  };
  await lauf('Korb vorn', { 'bp.sr.bd.r': '"korb"' }, async (b, p, lage) => {
    neben(b, 'Korb vorn', 400);
    await p.evaluate(() => seiteReiter('bd', 'pos')); await p.waitForTimeout(100);
    const c = await lage(); neben(c, 'nach „Position“', 400); pruef(c.det && c.im, 'Reiter „Position“: die Details stehen nicht im Bereich rechts');
  });
  await lauf('Position vorn', {}, async (b, p, lage) => {
    neben(b, 'Position vorn', 400); pruef(b.det && b.im, 'Position vorn: die Details stehen nicht im Bereich rechts');
    await p.click('.sr-r [data-srt="korb"]'); await p.waitForTimeout(150); neben(await lage(), 'Wechsel zu „Korb“', 400);
  });
  // Gemeinsame Grundhilfen (bp.js): bpZahl liefert dasselbe wie toLocaleString, bpTag und bpLS wie die früheren Kopien der Apps
  await lauf('Grundhilfen', {}, async (b, p) => {
    const r = await p.evaluate(() => { const F = []; for (const v of [0, 1, -1, 0.005, 1234.5678, -98765.4321, 1e7, 12.3, 0.1 + 0.2]) for (const [mi, ma] of [[0, 3], [2, 2], [3, 3], [0, 1], [0, 0], [1, 1], [4, 4]]) {
        const soll = v.toLocaleString('de-DE', { minimumFractionDigits: mi, maximumFractionDigits: ma }); if (bpZahl(v, mi, ma) !== soll) F.push(`${v} ${mi}/${ma}: ${bpZahl(v, mi, ma)} statt ${soll}`); }
      if (bpZahl(1234.56789) !== (1234.56789).toLocaleString('de-DE')) F.push('ohne Stellen'); if (bpZahl(1.5, 4) !== (1.5).toLocaleString('de-DE', { minimumFractionDigits: 4 })) F.push('nur Mindeststellen');
      if (bpTag('2026-11-14') !== '14.11.2026' || bpTag('') !== '' || bpTag('bald') !== 'bald') F.push('bpTag');
      const L = bpLS('test.'); L.set('a', { x: 1 }); if (L.get('a').x !== 1 || L.get('fehlt') !== null || L.get('fehlt', 7) !== 7 || localStorage.getItem('test.a') !== '{"x":1}') F.push('bpLS'); return F; });
    pruef(!r.length, 'Grundhilfen: ' + r.join(' · '));
  });
  await lauf('zugeklappt', { 'bp.sr.bd.zu': 'true' }, async (b) => neben(b, 'zugeklappt', 20));
  return fehler;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await baudatenPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
  await b.close(); console.log(f.length ? f.join('\n') : 'ok'); process.exit(f.length ? 1 : 0);
}
