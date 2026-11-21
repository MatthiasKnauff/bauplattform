// Gebäude-Baukasten (bp/gebaeudekasten.js) – seit 21.11.2026 mit derselben 3D-Ansicht wie das Modell aus dem Plan (Mock „Baukasten wie 3D“:
// A1 B3 C1 D2 E1, Symbolreihe). Nachgebildeter Kern, kein Server.
// Geprüft: 3D-Ansicht mit der Leiste des Betrachters (kein ＋/−, kein „drehen“); Wände mit Dicke aus den Schichten des Aufbaus (E1); Klick auf
// eine Wand wählt (Angaben rechts, Symbolreihe klappt zu); Befehle rechts und per Rechtsklick (B3): ＋ Geschoss speichert (PUT) mit Netz,
// Dach wandert mit, Staffelgeschoss 1,25 m zurück mit Flachdach, Anbau; violette Griffe ändern die Länge (D2); Fenster aus der Symbolreihe auf
// eine Wand ziehen (C1); Räume je Geschoss; Rückgängig schickt den alten Stand; eingebettet: Angaben und Korb rechts; „neu“ = Vorschlag
// Erdgeschoss + Satteldach, eigener Planstand.
//
// Aufgerufen aus oberflaeche.mjs:  const fehler = await baukastenPruefen(browser, repoWurzel)   – allein: node tools/tests/ui/baukasten.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

export async function baukastenPruefen(browser, repo) {
  const K = path.join(repo, 'shared/bpcore/head'), fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  const S = { puts: [], gets: [] };
  const BK = { koerper: [{ id: 'k1', teil: 'h', x: 0, y: 0, z: 0, w: 10, d: 8, h: 2.9, wand: 'A1', boden: 'A2', seiten: {} }],
    dach: { k1: { form: 'sattel', aufbau: 'A3' } }, gauben: [], oeff: [], teile: { h: 'Hauptgebäude' }, raeume: false };
  const KORB = { A1: { art: 'wand', vorlage: '331.02', name: 'Mauerwerk + WDVS' }, A2: { art: 'boden', vorlage: '322.04', name: 'Bodenplatte gedämmt' }, A3: { art: 'dach', vorlage: '363.04', name: 'Steildach Zwischensparren' } };
  const VL = { 331: [{ id: '331.02', name: 'Mauerwerk + WDVS', schichten: [{ name: 'Mauerwerk', optionen: [{ k: 'KS', mat: 'KS', dicke: 17.5, std: true }] }, { name: 'Dämmung', optionen: [{ k: 'EPS', dicke: 16, std: true }] }] }],
    36: [{ id: '363.04', name: 'Steildach Zwischensparren', schichten: [] }, { id: '363.09', name: 'Flachdach Warmdach', schichten: [] }],
    32: [{ id: '322.04', name: 'Bodenplatte gedämmt', schichten: [] }], 35: [{ id: '351.01', name: 'Geschossdecke Stahlbeton', schichten: [] }] };
  const p = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  p.on('pageerror', (e) => fehler.push('Fehler im Skript – ' + e.message));
  await p.route('http://bk.test/**', async (r) => {
    const u = new URL(r.request().url()), pf = u.pathname, J = (o) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(o) });
    if (pf === '/seite') return r.fulfill({ contentType: 'text/html', body: `<!doctype html><meta charset=utf-8><body style="margin:0"><div id="h" style="width:1300px;height:820px"></div>
      <script>window.UNDO = []; window.rueckgaengig = (t, f) => UNDO.push([t, f]); window.toast = () => {};</script><script src="/bp/gebaeudekasten.js"></script>` });
    if (pf === '/bp/gebaeudekasten.js' || pf === '/bp/ansicht3d.js') return r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(K, pf.slice(4))) });
    if (pf === '/api/bp/modell/1/bauteile/vorlagen') return J(VL[u.searchParams.get('kg')] || []);
    if (pf === '/api/bp/modell/1/baukasten' && r.request().method() === 'GET') { S.gets.push(u.search);
      const neu = u.searchParams.get('neu') === '1';
      return J({ baukasten: neu ? { koerper: [{ id: 'k1', teil: 'h', x: 0, y: 0, z: 0, w: 12, d: 9, h: 2.9, seiten: {} }], dach: { k1: { form: 'sattel', aufbau: '' } }, gauben: [], oeff: [], teile: { h: 'Hauptgebäude' } } : S.bk || BK,
        korb: neu ? {} : KORB, plan: 'hand', herkunft: neu ? 'leer' : 'baukasten', raeume: [{ nr: '0.01', name: 'Wohnen', geschoss: 'Erdgeschoss', flaeche: 32 }] }); }
    if (pf === '/api/bp/modell/1/baukasten') { const b = r.request().postDataJSON(); S.puts.push(b); return J({ rev: S.puts.length, plan: 'hand', modell: { bauteilliste: { zeilen: [] } } }); }
    return r.fulfill({ status: 404, body: '{}' });
  });
  const warte = async (n) => { for (let i = 0; i < 80 && S.puts.length < n; i++) await p.waitForTimeout(50); };
  const punkt = (pt) => p.evaluate((q) => { const d = BKH.d3, x = d.proj(q), r = d.feld.querySelector('canvas').getBoundingClientRect(); return x && [r.left + x[0], r.top + x[1]]; }, pt);
  const kontext = (xy) => p.evaluate(([x, y]) => { const P = [], c = BKH.d3.feld.querySelector('canvas'); c.dispatchEvent(new CustomEvent('bph:kontext', { bubbles: true, detail: { punkte: P, x, y, ziel: c } })); window.KP = P; return P.map((q) => q.text); }, xy);
  try {
    await p.goto('http://bk.test/seite');
    await p.evaluate(() => { window.BKH = bpBaukasten.mount(document.getElementById('h'), 1); });
    await p.waitForFunction(() => window.BKH.d3 && document.querySelector('#h .b3 canvas') && document.querySelector('#h .b3-l [data-b3dar]'), null, { timeout: 8000 });
    await p.waitForTimeout(200);
    pruef(await p.evaluate(() => !document.querySelector('[data-plus],[data-dreh],[data-bk="plus"]')), 'kein ＋/−, kein „drehen“, kein „Bearbeiten beenden“ mehr (A1)');
    pruef(await p.evaluate(() => document.querySelectorAll('[data-bk="pal"] [data-stein]').length === 10), 'Symbolreihe mit zehn Bausteinen');
    pruef(await p.evaluate(() => document.querySelectorAll('#bkx-stil').length === 1), 'Stil des Bausteins fehlt');
    // Klick auf die vordere Wand (Blick von −x, −y: Seite ym bei y = 0) → gewählt, Angaben rechts, Symbolreihe klappt zu
    const w = await punkt([5, 0, 1.45]);
    pruef(!!w, 'Wand liegt im Bild');
    await p.mouse.click(w[0], w[1]); await p.waitForTimeout(250);
    pruef(await p.evaluate(() => /Außenwand/.test(document.querySelector('[data-bk="detail"]').textContent)), `Klick auf eine Wand zeigt rechts die Außenwand: ${await p.evaluate(() => document.querySelector('[data-bk="detail"]').textContent.slice(0, 80))}`);
    pruef(await p.evaluate(() => document.querySelector('[data-bk="palk"]').classList.contains('zu')), 'beim Bearbeiten klappt die Symbolreihe zu');
    pruef(await p.evaluate(() => /Dicke 33,5 cm – aus den Schichten/.test(document.querySelector('[data-bk="detail"]').textContent)), 'Dicke der Wand aus den Schichten des Aufbaus (E1)');
    pruef(await p.evaluate(() => document.querySelectorAll('.bkx-gr .griff').length >= 5), 'violette Griffe am gewählten Bauteil (D2)');
    // Rechtsklick an derselben Stelle: Befehle der Stelle (B3)
    const P = await kontext(w);
    pruef(P.includes('＋ Geschoss darauf') && P.some((t) => /Anbau an dieser Seite/.test(t)) && P.includes('＋ Keller darunter'), `Rechtsklick auf die Wand: Geschoss, Anbau, Keller – ${P.join(' · ')}`);
    // ＋ Geschoss über den Knopf rechts
    await p.evaluate(() => { const b = [...document.querySelectorAll('[data-bk="detail"] [data-bef]')].find((x) => x.textContent === '＋ Geschoss darauf'); b.click(); });
    await warte(1);
    const a = S.puts[0] && S.puts[0].baukasten, ob = a && a.koerper.find((k) => k.z > 2);
    pruef(a && a.koerper.length === 2 && ob && Math.abs(ob.z - 2.9) < 0.01 && a.dach[ob.id] && !a.dach.k1, `＋ Geschoss: zwei Geschosse, Dach wandert mit nach oben: ${JSON.stringify(a && a.dach)}`);
    const N = S.puts[0] && S.puts[0].netz;
    pruef(N && N.e.length > 8 && N.geschosse.length === 2, `das Netz geht mit (Geschosse, Elemente): ${N && N.e.length}`);
    { const xm = N && N.e.find((e) => e.i === 9600001), xs = xm ? xm.v.filter((_, i) => i % 3 === 0) : [];   // Wand links (xm) des EG: 0 … 33,5 cm
      pruef(xs.length && Math.min(...xs) === 0 && Math.max(...xs) === 34, `Wand links 33,5 cm dick (cm gerundet): ${Math.min(...xs)}–${Math.max(...xs)}`); }
    pruef(N && N.e.some((e) => e.i === 9600005) && N.e.some((e) => e.i === 9600020 + 6), 'Nummern wie im Kern: Boden EG, Dachfläche des OG');
    {   // First bleibt fest (21.11.2026) und lässt sich drehen – Rechtsklick aufs Dach des EG-Teils
      const d = await punkt([5, 2.5, 5.8 + 1.2]); const P3 = await kontext(d), n = S.puts.length;
      pruef(P3.includes('First drehen'), `Rechtsklick aufs Satteldach: „First drehen“ – ${P3.join(' · ')}`);
      if (P3.includes('First drehen')) { await p.evaluate(() => KP.find((q) => q.text === 'First drehen').fn()); await warte(n + 1);
        const x = S.puts[n] && Object.values(S.puts[n].baukasten.dach).find((D) => D.form === 'sattel'); pruef(x && x.first === 'y', `First gedreht (war längs): ${JSON.stringify(x)}`); }
    }
    // Staffelgeschoss per Rechtsklick auf das obere Geschoss
    const w2 = await punkt([5, 0, 4.3]); const P2 = await kontext(w2);
    pruef(P2.includes('＋ Staffelgeschoss'), `Rechtsklick oben: Staffelgeschoss – ${P2.join(' · ')}`);
    const nS = S.puts.length; await p.evaluate(() => KP.find((q) => q.text === '＋ Staffelgeschoss').fn());
    await warte(nS + 1);
    const b = S.puts[nS] && S.puts[nS].baukasten, st = b && b.koerper.find((k) => k.staffel);
    pruef(st && Math.abs(st.w - 7.5) < 0.01 && Math.abs(st.x - 1.25) < 0.01 && b.dach[st.id] && b.dach[st.id].form === 'flach', `Staffelgeschoss 1,25 m zurück mit Flachdach: ${JSON.stringify(st)}`);
    // Griff ziehen: Länge (am gewählten Staffelgeschoss rechts) – im 0,5-m-Raster
    { await p.waitForTimeout(200); const g = await p.evaluate(() => { const L = [...document.querySelectorAll('.bkx-gr .griff')].filter((x) => !x.hidden && x.title === 'Länge ziehen'); const r = L[0] && L[0].getBoundingClientRect(), c = document.querySelector('#h .b3 canvas').getBoundingClientRect(); return r && [r.left + r.width / 2, r.top + r.height / 2, c.left + c.width / 2, c.top + c.height / 2]; });
      pruef(!!g, 'Griff „Länge ziehen“ da');
      if (g) { const n = S.puts.length; await p.mouse.move(g[0], g[1]); await p.mouse.down(); await p.mouse.move(g[0] + Math.sign(g[0] - g[2]) * 110, g[1], { steps: 6 }); await p.mouse.up(); await warte(n + 1);   // waagrecht nach außen ziehen
        const c = S.puts[n] && S.puts[n].baukasten.koerper.find((k) => k.staffel);
        pruef(c && Math.abs(c.w - 7.5) > 0.2 && Math.abs(c.w * 2 - Math.round(c.w * 2)) < 0.01, `Griff ändert die Länge im 0,5-m-Raster: ${c && c.w}`); } }
    pruef(await p.evaluate(() => { const L = [...document.querySelectorAll('.bkx-gr .griff')]; return L.some((x) => x.hidden) && L.some((x) => !x.hidden); }), 'Griffe nur an den zugewandten Seiten (abgewandte nicht durchs Gebäude)');
    // Fenster aus der Symbolreihe auf die Wand des EG ziehen (C1) – Symbolreihe erst wieder aufklappen
    await p.click('[data-bk="palzu"]');
    { const s = await p.locator('[data-stein="fenster"]').boundingBox(), z = await punkt([6, 0, 1.4]), n = S.puts.length;
      await p.mouse.move(s.x + 10, s.y + 10); await p.mouse.down(); await p.mouse.move(z[0], z[1], { steps: 10 }); await p.waitForTimeout(120); await p.mouse.up(); await warte(n + 1);
      const c = S.puts[n] && S.puts[n].baukasten;
      pruef(c && c.oeff.length === 1 && c.oeff[0].seite === 'ym' && c.oeff[0].k === 'k1', `Fenster auf die Wand gezogen: ${JSON.stringify(c && c.oeff)}`);
      pruef(S.puts[n] && S.puts[n].netz.e.some((e) => e.t === 'f' && e.h === 9600003), 'Fenster im Netz an seiner Wand'); }
    // Räume je Geschoss
    { const n = S.puts.length; await p.click('[data-bkrm]'); await p.waitForTimeout(150);
      pruef(await p.evaluate(() => { const r = document.querySelector('[data-bk="raeume"]'); return r && !r.hidden && r.textContent.includes('Wohnen'); }), 'Räume je Geschoss lassen sich zuschalten');
      await warte(n + 1); pruef(S.puts[n] && S.puts[n].baukasten.raeume === true, 'Schalter Räume wird gespeichert'); }
    { await p.waitForTimeout(150); const T = await p.evaluate(() => UNDO.map((u) => u[0]));   // Rückgängig sagt, was sich geändert hat (21.11.2026)
      pruef(T[0] === 'Hauptgebäude: Geschoss darauf' && T.includes('Dach: First gedreht') && T.includes('Fenster eingesetzt') && T.includes('Räume je Geschoss an') && T.some((t) => /: Länge 7,5 → \d/.test(t)), `Texte fürs Rückgängig: ${T.join(' · ')}`); }
    { const n = S.puts.length; await p.evaluate(() => UNDO[0][1]()); await warte(n + 2);
      pruef(S.puts[n + 1] && S.puts[n + 1].netz && S.puts[n + 1].baukasten.koerper.length === 1, 'nach dem Rückgängig geht das Netz des alten Stands mit');
      pruef(S.puts[n] && S.puts[n].baukasten.koerper.length === 1, 'Rückgängig schickt den alten Stand'); }
    {   // keine durchdringenden Körper (21.11.2026): Länge bis zum Anbau, Dachüberstand endet an der Wand, Giebel gehören zur Wand
      S.bk = { ...BK, koerper: [BK.koerper[0], { id: 'k2', teil: 't2', x: 12, y: 1, z: 0, w: 5, d: 6, h: 2.9, wand: 'A1', boden: 'A2', seiten: {} }],
        dach: { k1: { form: 'sattel', aufbau: 'A3', first: 'x' }, k2: { form: 'flach', aufbau: 'A3' } }, teile: { h: 'Hauptgebäude', t2: 'Anbau 1' } };
      await p.evaluate(() => { window.BKH = bpBaukasten.mount(document.getElementById('h'), 1); });
      await p.waitForFunction(() => window.BKH.d3 && document.querySelector('#h .b3 canvas'), null, { timeout: 8000 }); await p.waitForTimeout(200);
      const w3 = await punkt([5, 0, 1.45]); await p.mouse.click(w3[0], w3[1]); await p.waitForSelector('[data-bk="detail"] [data-mass="w"]');
      const n = S.puts.length; await p.fill('[data-bk="detail"] [data-mass="w"]', '15'); await warte(n + 1);
      const c = S.puts[n], k1 = c && c.baukasten.koerper.find((k) => k.id === 'k1');
      pruef(k1 && k1.w === 12, `Länge hält am Anbau an (12 statt 15): ${k1 && k1.w}`);
      const xs = (i) => { const e = c && c.netz.e.find((x) => x.i === i); return e ? e.v.filter((_, j) => j % 3 === 0) : []; };
      pruef(xs(9600026).length && Math.min(...xs(9600026)) >= 1200, `Flachdach des Anbaus ragt nicht ins Hauptgebäude: ab ${Math.min(...xs(9600026))} cm`);
      pruef(xs(9600006).length && Math.max(...xs(9600006)) <= 1200, `Satteldach ohne Überstand über dem Anbau: bis ${Math.max(...xs(9600006))} cm`);
      const g = c && c.netz.e.find((x) => x.i === 9600008);
      pruef(g && g.t === 'w', 'Giebel als Wand im Netz');
      const gp = await punkt([0, 4, 3.6]); await p.mouse.click(gp[0], gp[1]); await p.waitForTimeout(250);
      pruef(await p.evaluate(() => /Außenwand/.test(document.querySelector('[data-bk="detail"]').textContent)), 'Klick auf den Giebel wählt die Außenwand, nicht das Dach');
      if (process.env.BILD) { await p.click('.b3-l [data-b3dar]'); await p.waitForTimeout(150); await p.screenshot({ path: process.env.BILD }); await p.click('.b3-l [data-b3dar]'); }   // zum Ansehen
      S.bk = null;
    }
    {   // eingebettet im Gebäudemodell: Symbolreihe, Angaben und Korb gehen in den Bereich rechts
      await p.evaluate(() => { const h = document.getElementById('h'), r = document.createElement('div'); r.id = 'rechts'; document.body.appendChild(r);
        window.BKH = bpBaukasten.mount(h, 1, { seite: ({ detail, korb }) => { r.append(detail, korb); } }); });
      await p.waitForFunction(() => window.BKH.d3 && document.querySelector('#h .b3 canvas'), null, { timeout: 8000 });
      pruef(await p.evaluate(() => !document.querySelector('#h aside') && !!document.querySelector('#rechts [data-bk="detail"]') && !!document.querySelector('#rechts [data-bk="korb"]') && !!document.querySelector('#rechts [data-bk="pal"] [data-stein]') && document.querySelector('#h .bkx').classList.contains('eingebettet')), 'eingebettet: Symbolreihe, Angaben und Korb stehen rechts');
    }
    {   // Gebäudemodell (21.11.2026, I1 F1): kein Korb-Reiter – rechts nur Maße und Befehle, „Aufbau … (Eigenschaften)“ öffnet das Eigenschaften-Fenster der Bauteilliste
      await p.evaluate(() => { document.getElementById('rechts').innerHTML = ''; window.__eig = [];
        window.BKH = bpBaukasten.mount(document.getElementById('h'), 1, { seite: ({ detail }) => document.getElementById('rechts').append(detail), eigenschaften: (ids) => window.__eig.push(ids) }); });
      await p.waitForFunction(() => window.BKH.d3 && document.querySelector('#h .b3 canvas'), null, { timeout: 8000 }); await p.waitForTimeout(250);
      const w2 = await punkt([5, 0, 1.45]); await p.mouse.click(w2[0], w2[1]); await p.waitForTimeout(250);
      const e = await p.evaluate(() => ({ sel: document.querySelectorAll('#rechts [data-bk="detail"] select').length, k: !!document.querySelector('#rechts [data-bk="korb"]'), st: !!document.querySelector('#rechts [data-bk="stand"]'), b: document.querySelectorAll('#rechts [data-bkeig]').length }));
      pruef(!e.k && e.st && e.b >= 2, `ohne Korb, Stand rechts, „Aufbau …“-Knöpfe: ${JSON.stringify(e)}`);
      await p.click('#rechts [data-bkeig]'); await p.waitForTimeout(100);
      const ids = await p.evaluate(() => window.__eig);
      pruef(ids.length === 1 && ids[0].length >= 1 && ids[0].every((i) => i >= 9600000), `„Aufbau …“ meldet die Nummern der Wand: ${JSON.stringify(ids)}`);
    }
    {   // „Neuer Planstand – mit dem Baukasten“: Vorschlag (Erdgeschoss + Satteldach), sofort gespeichert als eigener Planstand
      const n = S.puts.length;
      await p.evaluate(() => { window.BKH = bpBaukasten.mount(document.getElementById('h'), 1, { neu: true }); }); await warte(n + 1);
      pruef(S.gets[S.gets.length - 1] === '?neu=1' && S.puts[n] && S.puts[n].neu === true && S.puts[n].baukasten.koerper.length === 1 && S.puts[n].baukasten.dach.k1.form === 'sattel', `neu: Erdgeschoss mit Satteldach als eigener Planstand: ${JSON.stringify(S.puts[n] && { neu: S.puts[n].neu })}`);
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
