// Gebäude-Baukasten (bp/baukasten.js, GO 20.11.2026: A3 B2 C D2 E1 F1/F2 G1 H1) – nachgebildeter Kern, kein Server.
// Geprüft: lädt Baukasten + Korb, zeichnet ＋/−; ＋ Geschoss speichert (PUT) mit zwei Geschossen und Dach oben; Staffelgeschoss mit Flachdach
// und 1,25 m zurückgesetzt; „Bearbeiten beenden“ blendet ＋/− aus; Räume je Geschoss (F) umschaltbar; Rückgängig schickt den alten Stand.
//
// Aufgerufen aus oberflaeche.mjs:  const fehler = await baukastenPruefen(browser, repoWurzel)   – allein: node tools/tests/ui/baukasten.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

export async function baukastenPruefen(browser, repo) {
  const K = path.join(repo, 'shared/bpcore/head'), fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  const S = { puts: [] };
  const BK = { koerper: [{ id: 'k1', teil: 'h', x: 0, y: 0, z: 0, w: 10, d: 8, h: 2.9, wand: 'A1', boden: 'A2', seiten: {} }],
    dach: { k1: { form: 'sattel', neigung: 35, aufbau: 'A3' } }, gauben: [], oeff: [], teile: { h: 'Hauptgebäude' }, raeume: false };
  const KORB = { A1: { art: 'wand', vorlage: '331.02', name: 'Mauerwerk + WDVS' }, A2: { art: 'boden', vorlage: '322.04', name: 'Bodenplatte gedämmt' }, A3: { art: 'dach', vorlage: '363.04', name: 'Steildach Zwischensparren' } };
  const VL = { 331: [{ id: '331.02', name: 'Mauerwerk + WDVS' }], 36: [{ id: '363.04', name: 'Steildach Zwischensparren' }, { id: '363.09', name: 'Flachdach Warmdach' }],
    32: [{ id: '322.04', name: 'Bodenplatte gedämmt' }], 35: [{ id: '351.01', name: 'Geschossdecke Stahlbeton' }] };
  const p = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  p.on('pageerror', (e) => fehler.push('Fehler im Skript – ' + e.message));
  await p.route('http://bk.test/**', async (r) => {
    const u = new URL(r.request().url()), pf = u.pathname, J = (o) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(o) });
    if (pf === '/seite') return r.fulfill({ contentType: 'text/html', body: `<!doctype html><meta charset=utf-8><body><div id="h" style="width:1300px;height:820px"></div>
      <script>window.UNDO = []; window.rueckgaengig = (t, f) => UNDO.push([t, f]); window.toast = () => {};</script><script src="/bp/gebaeudekasten.js"></script>` });
    if (pf === '/bp/gebaeudekasten.js') return r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(K, 'gebaeudekasten.js')) });
    if (pf === '/api/bp/modell/1/bauteile/vorlagen') return J(VL[u.searchParams.get('kg')] || []);
    if (pf === '/api/bp/modell/1/baukasten' && r.request().method() === 'GET') return J({ baukasten: BK, korb: KORB, plan: 'hand', herkunft: S.herkunft, raeume: [{ nr: '0.01', name: 'Wohnen', geschoss: 'Erdgeschoss', flaeche: 32 }] });
    if (pf === '/api/bp/modell/1/baukasten') { const b = r.request().postDataJSON(); S.puts.push(b); return J({ rev: S.puts.length, plan: 'hand', modell: { bauteilliste: { zeilen: [] } } }); }
    return r.fulfill({ status: 404, body: '' });
  });
  const warte = async (n) => { for (let i = 0; i < 80 && S.puts.length < n; i++) await p.waitForTimeout(50); };
  try {
    await p.goto('http://bk.test/seite');
    await p.evaluate(() => bpBaukasten.mount(document.getElementById('h'), 1));
    await p.waitForSelector('[data-plus="oben"]', { timeout: 5000 });
    pruef(await p.evaluate(() => document.querySelectorAll('[data-plus^="seite:"]').length >= 2), 'je sichtbarer Wandfläche ein ＋ Anbau');
    pruef(await p.evaluate(() => document.querySelectorAll('[data-bkx-stil], #bkx-stil').length === 1), 'Stil des Bausteins fehlt');
    await p.dispatchEvent('[data-plus="oben"]', 'click');
    await warte(1);
    const a = S.puts[0] && S.puts[0].baukasten;
    pruef(a && a.koerper.length === 2, `＋ Geschoss speichert zwei Geschosse: ${JSON.stringify(a && a.koerper)}`);
    const ob = a && a.koerper.find((k) => k.z > 2);
    pruef(ob && Math.abs(ob.z - 2.9) < 0.01 && a.dach[ob.id] && !a.dach.k1, `Dach wandert mit nach oben: ${JSON.stringify(a && a.dach)}`);
    pruef(S.puts[0] && S.puts[0].korb && Object.values(S.puts[0].korb).some((e) => e.vorlage === '351.01'), 'Decke des neuen Geschosses kommt in den Korb');
    await p.waitForSelector('[data-plus="staffel"]', { timeout: 3000 });
    await p.evaluate(() => { const L = [...document.querySelectorAll('[data-plus="staffel"]')]; L[L.length - 1].dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    await warte(2);
    const b = S.puts[1] && S.puts[1].baukasten, st = b && b.koerper.find((k) => k.staffel);
    pruef(st && Math.abs(st.w - 7.5) < 0.01 && Math.abs(st.x - 1.25) < 0.01 && b.dach[st.id] && b.dach[st.id].form === 'flach', `Staffelgeschoss 1,25 m zurück mit Flachdach: ${JSON.stringify(st)} ${JSON.stringify(b && b.dach)}`);
    { const vor = await p.evaluate(() => document.querySelector('[data-plus="oben"]').getAttribute('transform')), b = await p.locator('[data-bk="sv"]').boundingBox();   // frei drehen (20.11.2026)
      await p.mouse.move(b.x + 30, b.y + b.height - 60); await p.mouse.down(); await p.mouse.move(b.x + 180, b.y + b.height - 30, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(150);
      pruef(await p.evaluate((v) => document.querySelector('[data-plus="oben"]').getAttribute('transform') !== v, vor), 'Ziehen auf freier Fläche dreht das Gebäude nicht'); }
    await p.click('[data-bk="plus"]');
    pruef(await p.evaluate(() => !document.querySelector('[data-plus]')), '„Bearbeiten beenden“ blendet ＋/− aus');
    await p.click('[data-bk="rm"]');
    await p.waitForTimeout(150);
    pruef(await p.evaluate(() => { const r = document.querySelector('[data-bk="raeume"]'); return r && !r.hidden && r.textContent.includes('Wohnen'); }), 'Räume je Geschoss lassen sich zuschalten (F)');
    await warte(3);
    pruef(S.puts[2] && S.puts[2].baukasten.raeume === true, 'Schalter Räume wird gespeichert');
    const n = S.puts.length;
    await p.evaluate(() => UNDO[0][1]());
    await warte(n + 1);
    pruef(S.puts[n] && S.puts[n].baukasten.koerper.length === 1, `Rückgängig schickt den alten Stand: ${JSON.stringify(S.puts[n] && S.puts[n].baukasten.koerper.length)}`);
    await p.waitForSelector('[data-dach="k1"][data-fl="0"]', { timeout: 3000 });   // Dachflächen einzeln (20.11.2026)
    await p.dispatchEvent('[data-dach="k1"][data-fl="0"]', 'click');
    await p.waitForSelector('[data-dflauf]', { timeout: 3000 });
    const m = S.puts.length;
    await p.selectOption('[data-dflauf]', 'bib:363.09');
    await warte(m + 1);
    const fl = S.puts[m] && S.puts[m].baukasten.dach.k1 && S.puts[m].baukasten.dach.k1.fl;
    pruef(fl && Object.keys(fl).join() === '0' && fl['0'] !== 'A3' && S.puts[m].korb[fl['0']] && S.puts[m].korb[fl['0']].vorlage === '363.09', `eigener Aufbau nur für Dachfläche 1: ${JSON.stringify(S.puts[m] && S.puts[m].baukasten.dach)}`);
    {   // eingebettet im Gebäudemodell (GO 20.11.2026, Mock „Gebäudemodell schlank“ F1): Angaben und Korb gehen in den Bereich rechts
      const n = S.puts.length;
      await p.evaluate(() => { const h = document.getElementById('h'), r = document.createElement('div'); r.id = 'rechts'; document.body.appendChild(r);
        bpBaukasten.mount(h, 1, { seite: ({ detail, korb }) => { r.append(detail, korb); } }); });
      await p.waitForSelector('#h [data-plus="oben"]', { timeout: 5000 });
      pruef(await p.evaluate(() => !document.querySelector('#h aside') && !!document.querySelector('#rechts [data-bk="detail"]') && !!document.querySelector('#rechts [data-bk="korb"]') && !!document.querySelector('#rechts [data-bk="pal"] [data-stein]') && !document.querySelector('#h [data-bk="pal"]') && document.querySelector('#h .bkx').classList.contains('eingebettet')), 'eingebettet: Hineinziehen, Angaben und Korb stehen rechts, nicht neben der Bühne');
      await p.dispatchEvent('#h [data-k="k1"][data-seite]', 'click'); await p.waitForTimeout(150);
      pruef(await p.evaluate(() => /Außenwand|Geschoss/.test(document.querySelector('#rechts [data-bk="detail"]').textContent)), 'eingebettet: Klick zeigt die Angaben rechts');
      await p.dispatchEvent('#h [data-plus="oben"]', 'click'); await warte(n + 1);
      pruef(S.puts.length > n, 'eingebettet: ＋ Geschoss speichert');
    }
    {   // 21.11.2026: Gebäudemodell ohne Planstand – was der Baukasten zeigt, wird der Planstand „Assistent“ (nicht bei bloßem Vorschlag „leer“)
      S.herkunft = 'leer'; let n = S.puts.length;
      await p.evaluate(() => bpBaukasten.mount(document.getElementById('h'), 1, { anlegen: () => true })); await p.waitForSelector('#h [data-plus="oben"]'); await p.waitForTimeout(1100);
      pruef(S.puts.length === n, 'ohne Angaben (nur Vorschlag) legt der Baukasten keinen Planstand an');
      S.herkunft = 'assistent'; n = S.puts.length;
      await p.evaluate(() => bpBaukasten.mount(document.getElementById('h'), 1, { anlegen: () => true })); await p.waitForSelector('#h [data-plus="oben"]'); await warte(n + 1);
      pruef(S.puts.length === n + 1, 'ohne Planstand legt der Baukasten den Planstand „Assistent“ an');
      S.herkunft = undefined;
    }
  } catch (e) { fehler.push('bricht ab – ' + String(e.message).split('\n')[0]); }
  await p.close();
  return fehler;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await baukastenPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
  await b.close(); console.log(f.length ? f.join('\n') : 'ok'); process.exit(f.length ? 1 : 0);
}
