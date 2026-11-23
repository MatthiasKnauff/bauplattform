// Wärmeschutz ⇄ Projektmodell: Hinweise aus den Quellen des Projekts in der Stufe „Bauteile“ – Ablauftest im echten Browser mit nachgebildetem Server.
// Geprüft: Die Hinweise kommen nach dem Laden (eigene Abfrage), rote Zahl und Zahl in der Stufe; „Anlegen“ ohne Art fragt erst nach der Art;
// Übernehmen schickt hid/tun/typ, zeigt das neue Bauteil mit Herkunft und legt ein Rückgängig ab; „Nicht nötig“ schickt ablehnen;
// der Rückweg fragt vor dem Öffnen der Linie; der alte Knopf „Aus Baukosten“ ist weg; kein Fehler im Skript.
//
// Aufgerufen aus oberflaeche.mjs:  const fehler = await wsModellPruefen(browser, repoWurzel)   – allein: node tools/tests/ui/wsmodell.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

export async function wsModellPruefen(browser, repo) {
  const KASTEN = path.join(repo, 'shared/bpcore/head'), STAT = path.join(repo, 'plattform/static');
  const BK = /BAUKASTEN = \(([^)]*)\)/.exec(fs.readFileSync(path.join(repo, 'shared/bpcore/head.py'), 'utf8'))[1].match(/"[^"]+"/g).map((s) => s.slice(1, -1));
  const baukasten = 'void 0;\n' + BK.map((f) => fs.readFileSync(path.join(KASTEN, f), 'utf8')).join('\n;\n');
  const STOFFE = JSON.parse(fs.readFileSync(path.join(repo, 'shared/bpcore/ws_baustoffe.json'), 'utf8')).baustoffe.map((b) => ({ herkunft: 'din', aktiv: true, ...b }));
  const fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  const ctx = await browser.newContext({ viewport: { width: 1700, height: 1000 } }), p = await ctx.newPage();
  p.on('pageerror', (e) => fehler.push('Fehler im Skript – ' + e.message));
  const AW = { id: 'aw1', kurz: 'AW1', name: 'Außenwand', typ: 'wand', flaeche: 212, ref: 'bk:3:b1', schichten: [{ m: STOFFE[0].schluessel, d: 17.5 }] };
  const IW = { id: 'iw1', kurz: 'IW1', name: 'IW KS 11,5', typ: 'wand', aussen: false, flaeche: 40, schichten: [] };
  const S = { bauteile: [AW, IW], posts: [], zurueck: [], puts: [],
    hin: [{ id: 11, art: 'flaeche', titel: 'AW1: Fläche 212 → 228 m²', text: 'Fläche geändert.', quelle: 'Baukosten „KB“', typ: 'wand', ref: 'bk:3:b1', da: 'aw1' },
      { id: 12, art: 'neu', titel: 'Neu: Decke über EG 90 m²', text: 'Die Art bitte wählen.', quelle: 'Baukosten „KB“ · KG 351', typ: '', ref: 'bk:3:b5' },
      { id: 13, art: 'vorschlag', titel: 'Vorschlag: Kellerwand gegen Erdreich fehlt', text: 'Keller laut Assistent.', quelle: 'Planungsassistent', typ: 'erdwand', ref: 'as:erdwand' },
      { id: 14, art: 'neu', titel: 'Neu: Dach 168 m²', text: 'Aus dem Gebäudemodell.', quelle: 'Gebäudemodell', typ: 'steildach', ref: 'bk:0:b7' }] };
  const detail = () => ({ nachweis: { id: 5, project_id: 7, name: 'Nachweis', status: 'bauteile', erstellt: '', geaendert: '', von: '' }, projekt: 'Testprojekt', grundlagen: { vorhaben: 'neubau', zone: '19' }, bauteile: S.bauteile, bauantrag: null });
  const modell = () => ({ hinweise: S.hin, linie: { richtung: 'zur_app', uebernahme: 'uebernahme', zustand: 'lebendig' }, quellen: ['KB', 'Planungsassistent'],
    huelle: [{ zeile: 'b1', art: 'wand', ref: 'bk:3:b1' }, { zeile: 'b7', art: 'steildach', ref: 'bk:0:b7' }] });   // Baum links (WB-2 A): nur diese Zeilen
  await p.route('http://portal.test/**', (r) => {
    const q = r.request(), pf = new URL(q.url()).pathname.replace(/^\//, ''), J = (o, st = 200) => r.fulfill({ status: st, contentType: 'application/json', body: JSON.stringify(o) });
    if (pf === 'waermeschutz') return r.fulfill({ contentType: 'text/html', body: fs.readFileSync(path.join(STAT, 'waermeschutz.html'), 'utf8') });
    if (pf === 'bp/baukasten.js') return r.fulfill({ contentType: 'text/javascript', body: baukasten });
    const f = pf.startsWith('bp/') ? path.join(KASTEN, pf.slice(3)) : pf.startsWith('static/') ? path.join(STAT, pf.slice(7)) : null;
    if (f) return fs.existsSync(f) ? r.fulfill({ contentType: f.endsWith('.css') ? 'text/css' : 'text/javascript', body: fs.readFileSync(f) }) : r.fulfill({ status: 404, body: '' });
    if (pf === 'api/me') return J({ ok: true, id: 1, name: 'admin', vorname: 'A', role: 'admin', admin: true, look: {} });
    if (pf === 'api/bp/kopf') return J({ conf: { apps: [], projekte: [] }, projekt: { id: 7, name: 'Testprojekt', adresse: '' } });
    if (pf === 'api/platform') return J({ apps: [], user: { name: 'admin', role: 'admin' }, projekte: [] });
    if (pf === 'api/bp/projekt') return J({ id: 7, name: 'Testprojekt', adresse: '' });
    if (pf === 'api/baustoffe') return J({ baustoffe: STOFFE });
    if (pf === 'api/nachweise') return J({ nachweise: [{ id: 5, project_id: 7, name: 'Nachweis', status: 'bauteile', geaendert: '', bauteile: S.bauteile.length }] });
    if (pf === 'api/nachweise/5/modell/zurueck') { const b = JSON.parse(q.postData()); S.zurueck.push(b); return J({ ok: true, gesendet: 2 }); }
    if (pf === 'api/nachweise/5/modell' && q.method() === 'POST') { const b = JSON.parse(q.postData()); S.posts.push(b); const h = S.hin.find((x) => x.id === b.hid);
      const vorher = { name: 'Nachweis', status: 'bauteile', data: { grundlagen: {}, bauteile: JSON.parse(JSON.stringify(S.bauteile)) } };
      if (b.tun === 'uebernehmen' && h.art === 'flaeche') S.bauteile = S.bauteile.map((x) => (x.id === h.da ? { ...x, flaeche: 228 } : x));
      else if (b.tun === 'uebernehmen') S.bauteile = [...S.bauteile, { id: 'n' + h.id, name: h.titel.replace(/^\w+: /, ''), typ: b.typ || h.typ, flaeche: 0, ref: h.ref, schichten: [] }];
      S.hin = S.hin.filter((x) => x !== h); return J({ ...detail(), vorher, modell: modell() }); }
    if (pf === 'api/bp/modell/7') return J({ modell: { bauteilliste: { zeilen: [{ id: 'b1', name: 'Außenwand 36,5 cm', bereich: 'rohbau', kg: '331', menge: 212, einheit: 'm²', status: 'neu', ids: [10], nummern: [] },
      { id: 'b7', name: 'Dach Sparren', bereich: 'rohbau', kg: '361', menge: 168, einheit: 'm²', status: 'neu', ids: [20], nummern: [] }, { id: 'x9', name: 'Innenwand GK', bereich: 'rohbau', kg: '342', menge: 80, einheit: 'm²', status: 'neu', ids: [], nummern: [] }] } }, rev: 1 });
    if (pf === 'api/bp/modell/7/netz') { const q3 = (x0, y0, z0, x1, y1, z1) => { const P = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]];
      return [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]].flatMap(([a, b, c, d]) => [...P[a], ...P[b], ...P[c], ...P[a], ...P[c], ...P[d]]); };
      return J({ e: [{ i: 10, t: 'w', g: 0, c: '', a: 0, v: q3(-500, -100, 0, 500, 100, 1500) }, { i: 20, t: 'r', g: 1, c: '', a: 0, v: q3(-600, -300, 1500, 600, 300, 1600) }], geschosse: [{ n: 'Erdgeschoss', z: 0 }, { n: 'Dach', z: 3 }], dreiecke: 24, voll: true }); }
    if (pf === 'api/nachweise/5/modell') return J(modell());
    if (pf === 'api/nachweise/5' && q.method() === 'PUT') { const b = JSON.parse(q.postData()); S.puts.push(b); if (b.bauteil) S.bauteile = S.bauteile.map((x) => (x.id === b.bauteil.id ? b.bauteil : x)); return J(detail()); }
    if (pf === 'api/nachweise/5') return J(detail());
    if (/(^|\/)api\//.test(pf)) return J(/katalog|liste|kontakte|neuigkeit|projekte|verlauf|fehler/.test(pf) ? [] : {});
    return r.fulfill({ status: 404, body: '' });
  });
  try {
    await p.goto('http://portal.test/waermeschutz');
    await p.waitForSelector('.ws-mod li', { timeout: 20000 });
    const b = await p.evaluate(() => ({ n: document.querySelectorAll('.ws-mod li').length, z: document.querySelector('.ws-modz').textContent, stufe: document.querySelector('[data-wsstufe="bauteile"] small').textContent,
      alt: [...document.querySelectorAll('#bfl button')].some((x) => /Aus Baukosten/.test(x.textContent)), her: (document.querySelector('.ws-her') || {}).textContent || '' }));
    pruef(b.n === 3 && b.z === '3', `Hinweise im Kasten: ${b.n}, rote Zahl ${b.z}`);
    pruef(/4 Hinweise/.test(b.stufe), `Stufe „Bauteile“ nennt die Hinweise nicht (${b.stufe})`);
    pruef(!b.alt, 'Knopf „Aus Baukosten“ ist noch in der Befehlsleiste');
    pruef(/Projektmodell · Baukosten/.test(b.her), `Herkunft des Bauteils fehlt (${b.her.trim().slice(0, 60)})`);
    await p.click('[data-wsmod="uebernehmen"][data-hid="12"]'); await p.waitForTimeout(200);
    pruef(S.posts.length === 0, 'Decke ohne Art wurde angelegt, statt erst nach der Art zu fragen');
    await p.selectOption('[data-wsmodtyp="12"]', 'kellerdecke'); await p.click('[data-wsmod="uebernehmen"][data-hid="12"]');
    await p.waitForFunction(() => BID === 'n12' && document.querySelectorAll('.ws-mod li').length === 1);   // WR-5 A: die Flächenänderung von AW1 steht nur bei AW1
    pruef(JSON.stringify(S.posts[0]) === JSON.stringify({ hid: 12, tun: 'uebernehmen', typ: 'kellerdecke' }), `Übernehmen schickt ${JSON.stringify(S.posts[0])}`);
    pruef(await p.evaluate(() => BID === 'n12'), 'das neue Bauteil wird nicht gezeigt');
    await p.click('[data-wsmod="ablehnen"][data-hid="13"]'); await p.waitForFunction(() => !document.querySelector('.ws-mod'));
    pruef(S.posts[1] && S.posts[1].tun === 'ablehnen' && S.posts[1].hid === 13, '„Nicht nötig“ schickt kein Ablehnen');
    await p.evaluate(() => { BID = 'aw1'; zeichne(); }); await p.waitForSelector('[data-wsmod="uebernehmen"][data-hid="11"]');
    await p.click('[data-wsmod="uebernehmen"][data-hid="11"]'); await p.waitForFunction(() => !document.querySelector('.ws-mod'));
    pruef(S.bauteile[0].flaeche === 228, 'Fläche nicht angeglichen');
    await p.evaluate(() => { BID = 'aw1'; zeichne(); });
    await p.click('[data-wszurueck]'); await p.waitForSelector('.bph-dlg, .modal, [role="dialog"]', { timeout: 5000 });
    pruef(S.zurueck.length === 0, 'Rückweg ging ohne Frage nach dem Öffnen der Linie hinaus');
    await p.evaluate(() => { const k = [...document.querySelectorAll('[role="dialog"] button, .bph-dlg button, .modal button')].find((x) => /Öffnen und melden/.test(x.textContent)); if (k) k.click(); });
    for (let i = 0; i < 40 && !S.zurueck.length; i++) await p.waitForTimeout(50);
    pruef(S.zurueck.length === 1 && S.zurueck[0].bid === 'aw1' && S.zurueck[0].oeffnen === true && S.zurueck[0].u > 0, `Rückweg schickt ${JSON.stringify(S.zurueck)}`);
    await p.evaluate(() => document.querySelectorAll('.modal, .bph-dlg').forEach((x) => (x.closest('.modal-bg') || x).remove()));
    // Filter Alle · Außen · Innen (D1): Innenbauteil standardmäßig ausgeblendet, mit „Innen“ sichtbar
    pruef(!(await p.evaluate(() => /IW KS 11,5/.test(document.querySelector('#navL').innerText))), 'Innenbauteil steht trotz Filter „Außen“ in der Liste');
    await p.click('#navL [data-wsfi="innen"]'); await p.waitForTimeout(150);
    pruef(await p.evaluate(() => /IW KS 11,5/.test(document.querySelector('#navL').innerText) && !/Außenwand/.test(document.querySelector('#navL').innerText)), 'Filter „Innen“ zeigt nur das Innenbauteil nicht');
    await p.click('#navL [data-wsfi="aussen"]');
    // Baustoff wählen: Suche mit Filtern statt langer Liste
    await p.evaluate(() => { BID = 'aw1'; zeichne(); });
    await p.click('.ws-bsb[data-sk="m"][data-si="0"]'); await p.waitForSelector('.ws-bsw', { timeout: 5000 });
    await p.fill('.modal .bpf-in', 'rockwool'); await p.waitForTimeout(250);
    if (process.env.SHOT) await p.screenshot({ path: process.env.SHOT });
    const w = await p.evaluate(() => [...document.querySelectorAll('.ws-bsw tr[data-bsw]')].filter((x) => x.dataset.bsw !== 'eigen').map((x) => x.textContent));
    pruef(w.length > 20 && w.every((t) => /ROCKWOOL/.test(t)), `Suche „rockwool“: ${w.length} Treffer, nicht alle ROCKWOOL`);
    const id = await p.evaluate(() => document.querySelector('.ws-bsw tr[data-bsw]:not([data-bsw="eigen"])').dataset.bsw);
    await p.click(`.ws-bsw tr[data-bsw="${id}"]`); for (let i = 0; i < 40 && !S.puts.length; i++) await p.waitForTimeout(50);
    pruef(S.puts.length && S.puts[S.puts.length - 1].bauteil.schichten[0].m === id, `gewählter Baustoff nicht gespeichert (${JSON.stringify(S.puts.slice(-1)).slice(0, 120)})`);
    pruef(!(await p.$('.ws-bsw')), 'Fenster der Baustoff-Wahl bleibt offen');
    {   // 20.11.2026: Reiter „3D“ – das Gebäude aus dem Planstand, gefärbt nach dem Nachweis; das gewählte Bauteil leuchtet, Klick zeigt U-Wert
      await p.evaluate(() => seiteReiter('ws', 'd3'));   // nicht über den Reiter klicken: bei schmaler Leiste steht er im „+n“-Menü (bp/leiste.js)
      await p.waitForSelector('.ws-3d .b3-l [data-b3f="ws-u"]', { timeout: 10000 }); await p.waitForTimeout(400);
      await p.click('.ws-3d .b3-l [data-b3dar]');   // Schieber und Geschosse unter „Darstellung ▾“ (Mock „Gebäudemodell schlank“, 20.11.2026)
      const d = await p.evaluate(() => ({ modi: [...document.querySelectorAll('.ws-3d .b3-l [data-b3f]')].map((b) => b.textContent), an: document.querySelector('.ws-3d [data-b3f="ws-u"]').classList.contains('on'),
        leg: document.querySelector('.ws-3d .b3-k').textContent, wahl: document.querySelector('.ws-3d canvas').dataset.wahl, zug: !!document.querySelector('.ws-3d .b3-l [data-b3z]'), rahmen: !!document.querySelector('.ws-3d [data-b3w]') }));
      pruef(d.modi[0] === 'U-Wert' && d.modi[1] === 'Bauteilart' && d.an && /Höchstwert/.test(d.leg) && /nicht im Nachweis/.test(d.leg) && d.zug && d.rahmen, '3D im Wärmeschutz: Färbungen, Legende, Schieber, Rahmen – ' + JSON.stringify(d));
      pruef(d.wahl === '1', `3D: das links gewählte Bauteil (AW1) leuchtet im Modell – gewählt ${d.wahl}`);
      const c = await p.$eval('.ws-3d canvas', (x) => { const r = x.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height * 0.62]; });
      await p.mouse.click(c[0], c[1]); await p.waitForTimeout(300);
      const info = await p.evaluate(() => { const i = document.querySelector('.ws-3d .b3-i'); return i.hidden ? '' : i.textContent; });
      pruef(/AW1 Außenwand/.test(info) && /U = /.test(info) || /Nicht im Nachweis/.test(info), `3D: Klick zeigt das Bauteil des Nachweises – „${info}“`);
      await p.$eval('.ws-3d [data-b3z]', (r) => { r.value = 60; r.dispatchEvent(new Event('input')); }); await p.click('.ws-3d [data-b3f="ws-art"]');
      pruef(await p.evaluate(() => /Außenwand/.test(document.querySelector('.ws-3d .b3-k').textContent)), '3D: Färbung „Bauteilart“ mit Legende');
      {   // „Auswahl aufheben“ oben in der Leiste – nur solange etwas gewählt ist
        const vor = await p.evaluate(() => { const x = document.querySelector('.ws-3d [data-b3x]'); return [!x.hidden, document.querySelector('.ws-3d canvas').dataset.wahl]; });
        await p.click('.ws-3d [data-b3x]'); const nach = await p.evaluate(() => { const x = document.querySelector('.ws-3d [data-b3x]'); return [x.hidden, document.querySelector('.ws-3d canvas').dataset.wahl]; });
        pruef(vor[0] && vor[1] === '1' && nach[0] && nach[1] === '0', '3D: „Auswahl aufheben“ – ' + JSON.stringify({ vor, nach }));
      }
      if (process.env.BILD3) await p.screenshot({ path: process.env.BILD3 });
    }
    {   // Gebäudemodell rechts wie die Kopierquelle (Mock „Wärmeschutz – Gebäudemodell rechts“ WR-1 … WR-7 A): nur die Hülle, Hüllfläche › Typ, „← übernehmen“;
        // links wieder die Bauteile des Nachweises; rechts nur Gebäudemodell · Bauphysik · 3D (kein Planung, Baukasten, Fragen, Querschnitt, Prüfung)
      await p.evaluate(() => seiteReiter('ws', 'modell')); await p.waitForSelector('.ws-baum .bt-baum', { timeout: 8000 });
      for (let n = 0; n < 4; n++) { const z = await p.$('.ws-baum tr.bt-bh .car.zu'); if (!z) break; await z.click(); await p.waitForTimeout(80); }
      const t = await p.evaluate(() => ({ k: [...document.querySelectorAll('.ws-baum tr.bt-bh b')].map((b) => b.textContent), z: [...document.querySelectorAll('.ws-baum tr[data-btz]')].map((r) => r.dataset.btz),
        plus: (document.querySelector('.ws-baum [data-wsplus="b7"]') || {}).textContent || '', inNav: !!document.querySelector('#navL .ws-baum'), links: document.querySelector('#navL').innerText,
        reiter: [...document.querySelectorAll('.sr-tabs [data-srt], .sr-tab, [role="tab"]')].map((x) => x.textContent.trim()).filter(Boolean), kasten: [...document.querySelectorAll('.ws-mod li')].some((l) => /Dach 168/.test(l.textContent)) }));
      pruef(t.k[0] === 'Außenwände' && t.k.includes('Dach und oberste Geschossdecke') && !t.z.includes('x9') && /übernehmen/.test(t.plus) && !t.inNav && !t.kasten && /Außenwand/.test(t.links) && /Bauteil …/.test(t.links),
        `Gebäudemodell rechts, links die Bauteile des Nachweises – ${JSON.stringify(t)}`);
      pruef(!t.reiter.some((r) => /^(Planung|Baukasten|Fragen|Querschnitt|Prüfung|Tauwasser|Hitzeschutz)/.test(r)), `Reiter rechts: ${t.reiter.join(' · ')}`);
      const n0 = S.posts.length; await p.click('.ws-baum [data-wsplus="b7"]'); for (let i = 0; i < 40 && S.posts.length === n0; i++) await p.waitForTimeout(50);
      pruef(JSON.stringify(S.posts[n0]) === JSON.stringify({ hid: 14, tun: 'uebernehmen', typ: 'steildach' }), `← übernehmen schickt ${JSON.stringify(S.posts[n0])}`);
      await p.click('.ws-baum tr[data-btz="b1"] td:nth-child(2)'); await p.waitForTimeout(200);
      pruef(await p.evaluate(() => BID === 'aw1'), 'Klick auf die Zeile öffnet das Bauteil des Nachweises');
    }
  } catch (e) { fehler.push('bricht ab – ' + String(e.message).split('\n').slice(0, 3).join(' ')); }
  await ctx.close();
  return fehler;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await wsModellPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
  await b.close(); console.log(f.length ? f.join('\n') : 'ok'); process.exit(f.length ? 1 : 0);
}
