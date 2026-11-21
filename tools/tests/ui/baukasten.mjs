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
import { ESC } from './esc.mjs';

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
      <script>window.UNDO = []; window.rueckgaengig = (t, f) => UNDO.push([t, f]); window.toast = () => {};</script>${ESC}<script src="/bp/gebaeudekasten.js"></script>` });
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
  const punkt = (pt) => p.evaluate((q) => { scrollTo(0, 0); const d = BKH.d3, x = d.proj(q), r = d.feld.querySelector('canvas').getBoundingClientRect(); return x && [r.left + x[0], r.top + x[1]]; }, pt);
  const kontext = (xy) => p.evaluate(([x, y]) => { const P = [], c = BKH.d3.feld.querySelector('canvas'); c.dispatchEvent(new CustomEvent('bph:kontext', { bubbles: true, detail: { punkte: P, x, y, ziel: c } })); window.KP = P; return P.map((q) => q.text); }, xy);
  try {
    await p.goto('http://bk.test/seite');
    await p.evaluate(() => { window.BKH = bpBaukasten.mount(document.getElementById('h'), 1); });
    await p.waitForFunction(() => window.BKH.d3 && document.querySelector('#h .b3 canvas') && document.querySelector('#h .b3-l [data-b3dar]'), null, { timeout: 8000 });
    await p.waitForTimeout(200);
    pruef(await p.evaluate(() => !document.querySelector('[data-plus],[data-dreh],[data-bk="plus"]')), 'kein ＋/−, kein „drehen“, kein „Bearbeiten beenden“ mehr (A1)');
    pruef(await p.evaluate(() => document.querySelectorAll('[data-bk="pal"] [data-stein]').length === 10), 'Symbolreihe mit zehn Bausteinen');
    pruef(await p.evaluate(() => document.querySelectorAll('#bkx-stil').length === 1), 'Stil des Bausteins fehlt');
    { const t = await p.evaluate(() => [...document.querySelectorAll('.bkx-nm .bkx-tn')].filter((x) => !x.hidden).map((x) => x.textContent));   // 21.11.2026: Name des Teils auf dem Dach
      pruef(t.length >= 1 && t.every(Boolean), `Namen der Gebäudeteile auf dem Dach: ${JSON.stringify(t)}`); }
    // Klick auf die vordere Wand (Blick von −x, −y: Seite ym bei y = 0) → gewählt, Angaben rechts, Symbolreihe klappt zu
    const w = await punkt([5, 0, 1.45]);
    pruef(!!w, 'Wand liegt im Bild');
    await p.mouse.click(w[0], w[1]); await p.waitForTimeout(250);
    pruef(await p.evaluate(() => /Außenwand/.test(document.querySelector('[data-bk="detail"]').textContent)), `Klick auf eine Wand zeigt rechts die Außenwand: ${await p.evaluate(() => document.querySelector('[data-bk="detail"]').textContent.slice(0, 80))}`);
    pruef(await p.evaluate(() => { const d = document.querySelector('[data-bk="detail"]'); return !d.querySelector('[data-boden]') && !/Boden|Kellersohle/.test(d.textContent); }), 'Wand gewählt: rechts steht nur die Wand, nicht der Boden des Geschosses (21.11.2026)');
    pruef(await p.evaluate(() => !document.querySelector('[data-bk="palk"]').classList.contains('zu')), '„Hineinziehen“ bleibt beim Bearbeiten offen (21.11.2026)');
    await p.click('[data-bk="palzu"]');
    pruef(await p.evaluate(() => document.querySelector('[data-bk="palk"]').classList.contains('zu') && localStorage.getItem('bp.bk.pal') === 'zu'), 'der Knopf klappt die Symbolreihe zu, gemerkt');
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
    // Fenster aus der Symbolreihe auf die Wand des EG ziehen (C1) – Symbolreihe wieder aufklappen
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
      pruef(!e.k && e.st && e.b === 1, `ohne Korb, Stand rechts, ein „Aufbau …“-Knopf für die gewählte Wand: ${JSON.stringify(e)}`);
      await p.click('#rechts [data-bkeig]'); await p.waitForTimeout(100);
      const ids = await p.evaluate(() => window.__eig);
      pruef(ids.length === 1 && ids[0].length >= 1 && ids[0].every((i) => i >= 9600000), `„Aufbau …“ meldet die Nummern der Wand: ${JSON.stringify(ids)}`);
    }
    {   // keine überlappenden Bauteile am Dach (21.11.2026): Giebel, Ortgang und Rückwand enden an der Unterseite des Dachs, die Dachplatte liegt darüber –
        // geprüft am Netz: Pultdach (Anbau k2) und Satteldach (k1, First längs x, Überstand 40 cm)
      S.bk = { ...BK, koerper: [BK.koerper[0], { id: 'k2', teil: 't2', x: 12, y: 1, z: 0, w: 5, d: 6, h: 2.9, wand: 'A1', boden: 'A2', seiten: {} }],
        dach: { k1: { form: 'sattel', aufbau: 'A3', first: 'x' }, k2: { form: 'pult', aufbau: 'A3' } }, teile: { h: 'Hauptgebäude', t2: 'Anbau 1' } };
      await p.evaluate(() => { window.BKH = bpBaukasten.mount(document.getElementById('h'), 1); });
      await p.waitForFunction(() => window.BKH.d3 && document.querySelector('#h .b3 canvas'), null, { timeout: 8000 }); await p.waitForTimeout(200);
      const w = await punkt([14.5, 1, 1.45]); await p.mouse.click(w[0], w[1]); await p.waitForSelector('[data-bk="detail"] [data-mass="h"]');
      const n = S.puts.length; await p.fill('[data-bk="detail"] [data-mass="h"]', '3'); await warte(n + 1);
      const c = S.puts[n], K1 = c && c.baukasten.koerper.find((k) => k.id === 'k1'), K2 = c && c.baukasten.koerper.find((k) => k.id === 'k2');
      const tan = (g) => Math.tan(g * Math.PI / 180), E = (c && c.netz.e) || [], pkt = (e) => { const P = []; for (let i = 0; i < e.v.length; i += 3) P.push([e.v[i] / 100, e.v[i + 1] / 100, e.v[i + 2] / 100]); return P; };
      const unter = { 0: (q) => K1.z + K1.h + tan(38) * K1.d / 2 * (1 - Math.abs(q[1] - (K1.y + K1.d / 2)) / (K1.d / 2)),   // Unterseite des Satteldachs über k1: geht durch die Oberkante der Traufwand (kein Spalt), im Überstand weiter nach unten
        1: (q) => K2.z + K2.h + tan(15) * K2.d * (1 - (q[1] - K2.y) / K2.d) };   // … des Pultdachs über k2 (hoch an der Seite y0)
      const schlecht = [];
      [0, 1].forEach((b) => E.filter((e) => e.i >= 9600000 + b * 20 && e.i < 9600000 + b * 20 + 19).forEach((e) => pkt(e).forEach((q) => {
        const u = unter[b](q), wand = e.t === 'w';
        if (wand && q[2] > u + 0.006) schlecht.push(`Wand ${e.i} ragt ${Math.round((q[2] - u) * 1000) / 10} cm über die Dachunterseite`);
        if (e.t === 'r' && q[2] < u + 0.014) schlecht.push(`Dach ${e.i} liegt nicht über den Wänden (${Math.round((q[2] - u) * 1000) / 10} cm, mindestens 1 cm)`); })));
      pruef(K2 && K2.h === 3 && E.some((e) => e.t === 'r' && e.i === 9600026) && !schlecht.length, `Dach und Wände überlappen nicht: ${[...new Set(schlecht)].slice(0, 6).join(' · ') || 'Netz fehlt'}`);
      const tr = E.find((e) => e.i === 9600006), zmin = tr ? Math.min(...pkt(tr).map((q) => q[2])) : 0;
      pruef(tr && Math.abs(zmin - (K1.z + K1.h - tan(38) * 0.4)) < 0.03, `Satteldach: Traufe am Ende des Überstands ${Math.round(tan(38) * 40)} cm unter der Wandoberkante – ${zmin} m`);
      const ort = E.find((e) => e.i === 9600027), rw = E.find((e) => e.i === 9600029), tw = rw ? Math.max(...pkt(rw).map((q) => q[1])) : 0;
      pruef(ort && rw && Math.min(...pkt(ort).map((q) => q[1])) >= tw - 0.011, `Pultdach: Ortgang endet an der Rückwand (ab ${ort && Math.min(...pkt(ort).map((q) => q[1]))} m, Rückwand bis ${tw} m)`);
      if (process.env.BILD) await p.screenshot({ path: process.env.BILD.replace('.png', '-pult.png') });
    }
    {   // Dächer verschneiden (Schritt 1, 21.11.2026): Pultdach läuft mit der hohen Seite in die Fläche des Satteldachs; Satteldach mit dem Giebel voran (Kehlen)
      const lauf = async (bk, klick) => { S.bk = bk; await p.evaluate(() => { window.BKH = bpBaukasten.mount(document.getElementById('h'), 1); });
        await p.waitForFunction(() => window.BKH.d3 && document.querySelector('#h .b3 canvas'), null, { timeout: 8000 }); await p.waitForTimeout(200);
        const w = await punkt(klick); await p.mouse.click(w[0], w[1]); await p.waitForSelector('[data-bk="detail"] [data-mass="h"]');
        const n = S.puts.length; await p.fill('[data-bk="detail"] [data-mass="h"]', '2.9'); await p.fill('[data-bk="detail"] [data-mass="h"]', '3'); await warte(n + 1); return S.puts.length > n ? S.puts[S.puts.length - 1] : null; };
      const pkt = (e) => { const P = []; for (let i = 0; i < e.v.length; i += 3) P.push([e.v[i] / 100, e.v[i + 1] / 100, e.v[i + 2] / 100]); return P; }, tan = (g) => Math.tan(g * Math.PI / 180);
      const H1 = { id: 'k1', teil: 'h', x: 0, y: 0, z: 0, w: 12, d: 9, h: 3, wand: 'A1', boden: 'A2', seiten: {} };
      // 1) Pult (k2, hinten am Haus: seine hohe Seite ym liegt an der Traufseite yp des Satteldachs)
      let c = await lauf({ ...BK, koerper: [H1, { id: 'k2', teil: 't2', x: 3, y: 9, z: 0, w: 5, d: 6, h: 2.9, wand: 'A1', boden: 'A2', seiten: {} }],
        dach: { k1: { form: 'sattel', aufbau: 'A3', first: 'x' }, k2: { form: 'pult', aufbau: 'A3' } }, teile: { h: 'Hauptgebäude', t2: 'Anbau 1' } }, [5.5, 15, 1.45]);
      let E = (c && c.netz.e) || [], pu = E.find((e) => e.i === 9600026), rw = E.find((e) => e.i === 9600029), ha = E.find((e) => e.i === 9600006);
      const yI = 9 - tan(15) * 6 / (tan(38) - tan(15));   // dort trifft die Pultfläche die Satteldachfläche
      pruef(pu && Math.abs(Math.min(...pkt(pu).map((q) => q[1])) - yI) < 0.03 && !rw, `Pultdach läuft bis zur Satteldachfläche (y ${yI.toFixed(2)}), Rückwand entfällt: ${pu && Math.min(...pkt(pu).map((q) => q[1]))} / ${!!rw}`);
      const unterPult = ha ? pkt(ha).filter((q) => q[0] > 3.05 && q[0] < 7.95 && q[1] > yI + 0.05 && q[1] < 8.95) : [null];
      pruef(ha && !unterPult.length, `Satteldachfläche unter dem Pultdach ausgeschnitten: ${unterPult.length} Punkte darunter`);
      if (process.env.BILD) await p.screenshot({ path: process.env.BILD.replace('.png', '-schnitt1.png'), clip: { x: 0, y: 0, width: 1300, height: 820 } });
      // 2) Satteldach (k2 vor dem Haus, First längs y) mit dem Giebel voran in die Traufseite des Hauses: Kehlen bis zum First des Anbaus
      c = await lauf({ ...BK, koerper: [H1, { id: 'k2', teil: 't2', x: 3, y: -6, z: 0, w: 5, d: 6, h: 2.9, wand: 'A1', boden: 'A2', seiten: {} }],
        dach: { k1: { form: 'sattel', aufbau: 'A3', first: 'x' }, k2: { form: 'sattel', aufbau: 'A3', first: 'y' } }, teile: { h: 'Hauptgebäude', t2: 'Anbau 1' } }, [5.5, -6, 0.5]);
      E = (c && c.netz.e) || []; const f0 = E.find((e) => e.i === 9600026), h1 = E.find((e) => e.i === 9600007);
      const ymax = f0 ? Math.max(...pkt(f0).map((q) => q[1])) : 0;   // First des Anbaus (halbe Breite 2,5 m, gleiche Neigung) trifft die Hausfläche 2,5 m hinter der Wand
      pruef(f0 && Math.abs(ymax - 2.5) < 0.03, `Satteldach des Anbaus läuft 2,50 m ins Hausdach: ${ymax}`);
      pruef(E.some((e) => e.i === 9600029) && !E.some((e) => e.i === 9600028), `nur noch der freie Giebel des Anbaus: ${E.filter((e) => [9600028, 9600029].includes(e.i)).map((e) => e.i)}`);
      const drin = h1 ? pkt(h1).filter((q) => Math.abs(q[0] - 5.5) < 0.3 && q[1] > 0.3 && q[1] < 2.0) : [null];
      pruef(h1 && !drin.length, `Hausdach unter dem First des Anbaus ausgeschnitten: ${drin.length} Punkte darin`);
      if (process.env.BILD) await p.screenshot({ path: process.env.BILD.replace('.png', '-schnitt2.png'), clip: { x: 0, y: 0, width: 1300, height: 820 } });
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
