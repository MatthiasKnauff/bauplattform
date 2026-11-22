// Grundriss im Baukasten (Etappe 5 „Gebäudemodell neu“, 22.11.2026): Werkzeuge Wand/Treppe, Linie ziehen (rechtwinklig, rastet ein),
// Treppe als Rechteck mit Eigenschaften-Fenster, Entf, Doppelklick = Raumname – plattform/static/gebaeudemodell-grundriss-bk.js
// Aufgerufen aus oberflaeche.mjs:  const fehler = await grundrissBkPruefen(browser, repoWurzel)
import fs from 'node:fs'; import path from 'node:path';

export async function grundrissBkPruefen(browser, repo) {
  const H = path.join(repo, 'shared/bpcore/head/'), ST = path.join(repo, 'plattform/static/'), fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  const p = await browser.newPage({ viewport: { width: 1000, height: 800 } });
  p.on('pageerror', (e) => fehler.push('Fehler im Skript – ' + e.message));
  const F = { art: 'baukasten', geschosse: [{ n: 'Erdgeschoss', z: 0 }], koerper: [{ k: 'k1', g: 0, x: 0, y: 0, w: 10, d: 8, h: 2.75, aussen: 0.365 }],
    innen: [{ id: 'iw1', k: 'k1', g: 0, a: [4, 0.365], b: [4, 7.635] }], treppen: [],
    flaechen: [{ g: 0, k: 'k1', umriss: [[0.365, 0.365], [3.94, 0.365], [3.94, 7.635], [0.365, 7.635]], flaeche: 26, mitte: [2, 4], raum: { nr: '0.01', name: 'Wohnen' } },
      { g: 0, k: 'k1', umriss: [[4.06, 0.365], [9.635, 0.365], [9.635, 7.635], [4.06, 7.635]], flaeche: 40, mitte: [7, 4], raum: { nr: '0.02', name: 'Raum' } }] };
  const wand = (x0, y0, x1, y1) => ({ i: 1, t: 'w', g: 0, v: [x0, y0, 0, x1, y0, 0, x1, y1, 0, x0, y0, 0, x1, y1, 0, x0, y1, 0].map((n) => n * 100) });
  const NETZ = { e: [wand(0, 0, 10, 0.365), wand(0, 7.635, 10, 8), wand(0, 0, 0.365, 8), wand(9.635, 0, 10, 8)], geschosse: [{ n: 'Erdgeschoss', z: 0 }] };
  await p.route('http://grb.test/**', (r) => r.fulfill({ contentType: 'text/html', body: `<!doctype html><meta charset=utf-8><style>${fs.readFileSync(H + 'bp.css', 'utf8')}${fs.readFileSync(ST + 'gebaeudemodell.css', 'utf8')}
    .gm-gr{height:600px;display:flex;flex-direction:column}</style><body><div class="gm-gr" id="gr"></div>
    <script>${fs.readFileSync(H + 'bp.js', 'utf8')}</script><script>${fs.readFileSync(H + 'eigenschaften.js', 'utf8')}</script>
    <script>const PID = 7, LS = bpLS('gm.'), F = ${JSON.stringify(F)}; window.T = []; window.toast = (t) => T.push(t); window.bpEingabe = async () => 'Küche';
      const BT = { zustand: () => ({ rev: 1, modell: { bauteilliste: { raeume: [] } } }) }, g3Zeilen = () => [];
      window.A = []; const JETZT = { innen: [], treppen: [], rnamen: [] };
      const G3 = { N: ${JSON.stringify(NETZ)}, BK: { grundriss: { innenNeu: (...a) => A.push(['innen', ...a]), innenWeg: (id) => A.push(['innenWeg', id]), treppeNeu: (k, t) => { A.push(['treppe', k, t]); JETZT.treppen.push({ id: 'tr9', k, form: 'gerade', mat: 'stahlbeton', stg: 0, ...t }); return 'tr9'; },
        treppeSetzen: (id, w) => { A.push(['setzen', id, w]); Object.assign(JETZT.treppen[0], w); }, treppeWeg: (id) => A.push(['treppeWeg', id]), raum: (...a) => A.push(['raum', ...a]), jetzt: () => JETZT } } };
      api = async (u) => (u.includes('grundriss') ? F : G3.N);</script>
    <script>${fs.readFileSync(ST + 'gebaeudemodell-grundriss.js', 'utf8')}</script><script>${fs.readFileSync(ST + 'gebaeudemodell-grundriss-bk.js', 'utf8')}</script>` }));
  try {
    await p.goto('http://grb.test/seite');
    await p.evaluate(() => gmGrundriss(document.getElementById('gr')));
    await p.waitForSelector('.gr-wz [data-grwz="wand"]');
    pruef(await p.evaluate(() => document.querySelectorAll('.gr-iw').length === 1 && /2 Räume aus den Wänden/.test(document.querySelector('.gr-k').textContent)), 'Grundriss: Innenwand und Räume aus den Wänden');
    const bild = async (x, y) => p.evaluate(([x, y]) => { const s = document.querySelector('.gr-b svg'), q = s.createSVGPoint(); q.x = x; q.y = -y; const r = q.matrixTransform(s.getScreenCTM()); return [r.x, r.y]; }, [x, y]);
    // Wand ziehen: schräg gezogen → rechtwinklig, Anfang rastet an der Innenwand (x = 4) ein, Ende an der Außenwand (innen 9,635)
    await p.click('[data-grwz="wand"]'); await p.waitForSelector('.gr-b svg.gr-zieh');
    let [a, b] = [await bild(4.2, 4.0), await bild(9.5, 4.3)];
    await p.mouse.move(...a); await p.mouse.down(); await p.mouse.move(b[0], b[1], { steps: 5 }); await p.mouse.up();
    const w = await p.evaluate(() => A.find((x) => x[0] === 'innen'));
    pruef(w && w[1] === 'k1' && Math.abs(w[2][0] - 4) < 1e-6 && Math.abs(w[3][0] - 9.635) < 1e-6 && w[2][1] === w[3][1] && Math.abs(w[2][1] - 4) < 1e-6, `Wand rechtwinklig und eingerastet: ${JSON.stringify(w)}`);
    // Treppe: Rechteck ziehen → Laufrichtung = längere Seite, Eigenschaften-Fenster, Form wählen
    await p.click('[data-grwz="treppe"]');
    [a, b] = [await bild(1, 1), await bild(5.2, 2)];
    await p.mouse.move(...a); await p.mouse.down(); await p.mouse.move(b[0], b[1], { steps: 5 }); await p.mouse.up();
    const t = await p.evaluate(() => A.find((x) => x[0] === 'treppe'));
    pruef(t && t[2].r === 'xp' && t[2].w === 4.2 && t[2].l === 1, `Treppe: ${JSON.stringify(t)}`);
    await p.waitForSelector('.gr-trp [data-trf="form:halb"]', { state: 'attached', timeout: 5000 });
    pruef(await p.evaluate(() => /Schrittmaß/.test(document.querySelector('.gr-trp').textContent)), 'Eigenschaften der Treppe mit Schrittmaß');
    await p.click('.gr-trp [data-trf="form:halb"]');
    pruef(await p.evaluate(() => A.some((x) => x[0] === 'setzen' && x[2].form === 'halb')), 'Form gesetzt');
    // Wählen: Innenwand anklicken, Entf entfernt; Doppelklick in einen Raum = Name
    await p.evaluate(() => { const b = document.querySelector('.bp-eig [data-m="x"]'); if (b) b.click(); });
    await p.click('[data-grwz="wahl"]');
    await p.evaluate(() => document.querySelector('.gr-iw').dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 })));
    await p.keyboard.press('Delete');
    pruef(await p.evaluate(() => A.some((x) => x[0] === 'innenWeg' && x[1] === 'iw1')), 'Entf entfernt die gewählte Innenwand');
    const c = await bild(7, 4); await p.mouse.dblclick(c[0], c[1]); await p.waitForTimeout(100);
    const rn = await p.evaluate(() => A.find((x) => x[0] === 'raum'));
    pruef(rn && rn[1] === 'k1' && rn[2].join() === '7,4' && rn[3].name === 'Küche', `Doppelklick: Raumname – ${JSON.stringify(rn)}`);
  } catch (e) { fehler.push('bricht ab – ' + String(e.message).split('\n').slice(0, 2).join(' / ')); }
  await p.close();
  return fehler;
}
