// Gebäudemodell (Mock „Gebäude bearbeiten“ und „Räume rechts“, 21.11.2026): links 3D · Grundriss · Verknüpfungen, Mitte nur Grafik,
// rechts Bauteile (Baum wie im LV, Fenster & Türen einzeln) · Räume · Fragen · Planung; Schalter „Gebäude bearbeiten“ vorn in der 3D-Leiste
// (Baukasten: an = Baukörper, aus = Baum; Plan aus einer Datei: grau); Doppelklick = Eigenschaften-Fenster mit Antwort und Aufbau;
// Mehrfachauswahl (H1), Grundriss mit „als Raum annehmen“; Anweisung mit Vorschau, Rückfrage (Katalog) und Anwenden (bp/anweisung.js).
// Ablauftest im echten Browser mit nachgebildetem Server.
//
// Aufgerufen aus oberflaeche.mjs:  const fehler = await gebaeudemodellPruefen(browser, repoWurzel)   – allein: node tools/tests/ui/gebaeudemodell.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

export async function gebaeudemodellPruefen(browser, repo) {
  const KASTEN = path.join(repo, 'shared/bpcore/head'), fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  const BK = /BAUKASTEN = \(([^)]*)\)/.exec(fs.readFileSync(path.join(repo, 'shared/bpcore/head.py'), 'utf8'))[1].match(/"[^"]+"/g).map((s) => s.slice(1, -1));
  const baukasten = 'void 0;\n' + BK.map((f) => fs.readFileSync(path.join(KASTEN, f), 'utf8')).join('\n;\n');
  const zeile = (id, mehr) => ({ id, bereich: 'raum', art: 'Böden', kg: '353', name: 'Böden (0.01, 0.02)', menge: 36, einheit: 'm²', anzahl: 2, status: 'offen', berechnen: false, vorlage: '', wahl: [], kurz: '',
    erlaubt: ['bleibt', 'instandsetzen', 'erneuern', 'neu'], mitglieder: ['0.01', '0.02'], ids: [], nummern: [], ...mehr });
  const S = { zeile: [], anw: null, weg: 0 };
  const L = () => ({ quelle: { name: 'Werkplanung', planstand: 1, ...(S.hand ? { art: 'hand' } : {}) }, raeume: [{ nr: '0.01', name: 'Wohnen', flaeche: 30, hoehe: 2.5, geschoss: 'EG' }, { nr: '0.02', name: 'Bad', flaeche: 6, hoehe: 2.5, geschoss: 'EG' }, { nr: 'EG.03', name: S.rn || 'Raum', flaeche: 12, hoehe: 2.5, geschoss: 'EG', ermittelt: true },
      ...(S.schacht === 'raum' ? [{ nr: 'EG.04', name: 'Raum', flaeche: 4.5, hoehe: 2.5, geschoss: 'EG', ermittelt: true, z: 0, umriss: [[0.2, 0.3], [4.8, 0.3], [4.8, 1.3], [0.2, 1.3]] }] : [])],
    ...(S.schacht && S.schacht !== 'raum' ? { raumweg: [{ g: 'EG', p: [2.5, 0.8], art: S.schacht }] } : {}),
    elemente: [{ id: 11, nr: 'F 01', typ: 'Fenster', art: 'Fenster', geschoss: 'EG', raeume: ['0.01'], b: 1.26, h: 1.38, bruestung: 0.9, aussen: true },
      ...((S.plus || {}).elemente || []).map((e, k) => ({ id: 9500001 + k, nr: e.nr || 'F 02', typ: e.art, art: 'Fenster', geschoss: e.geschoss, raeume: [e.raum], b: e.b, h: e.h, bruestung: e.bruestung, aussen: true, quelle: 'plus' }))],
    ...(S.plus ? { plus: { raeume: S.plus.raeume || [], elemente: (S.plus.elemente || []).map((e) => ({ ...e, nr: e.nr || 'F 02' })) } } : {}),
    zeilen: S.leer ? [] : [zeile('raum:boden:trocken', S.status ? { status: S.status, berechnen: true } : {}), { ...zeile('f'), bereich: 'oeffnung', art: 'Fenster', kg: '334', name: 'Fenster', menge: 1.74, mitglieder: ['11'], nummern: ['F 01'], ids: [11], erlaubt: ['bleibt', 'erneuern', 'neu'] },
      ...(S.zwei ? [zeile('raum:boden:nass', { name: 'Böden Bad (0.02)', mitglieder: ['0.02'], menge: 6 })] : []),
      ...(S.mh ? [{ ...zeile('hand:1'), bereich: 'hand', art: 'von Hand', kg: '342', name: 'Trockenbauwand Flur', menge: 0, status: 'neu', berechnen: true, erlaubt: ['neu', 'erneuern', 'instandsetzen', 'abbruch'], mitglieder: [], quelle: 'hand' }] : []),
      ...(S.anw ? [{ ...zeile('raum:boden:trocken~ab'), abgeleitet: 'raum:boden:trocken', name: 'Böden – Estrich + Parkett, Mosaikparkett (0.01)', mitglieder: ['0.01'], menge: 30, status: 'erneuern', kurz: 'Estrich + Parkett, Mosaikparkett' }] : [])],
    anweisungen: S.anw ? [{ id: 'a1', text: S.anw, schritte: [{ material: 'Mosaikparkett', treffer: { name: 'Estrich + Parkett, Mosaikparkett' } }], wer: 'admin', wann: '2026-11-16T18:00' }] : [] });
  const M = () => ({ modell: { bauteilliste: L() }, rev: S.rev || 4, staende: [] });
  const quader = (x0, y0, z0, x1, y1, z1) => { const P = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], F = [[0, 1, 2], [0, 2, 3], [4, 5, 6], [4, 6, 7], [0, 1, 5], [0, 5, 4], [1, 2, 6], [1, 6, 5], [2, 3, 7], [2, 7, 6], [3, 0, 4], [3, 4, 7]]; return F.flatMap((f) => f.flatMap((k) => P[k])); };
  const NETZ = { stand: 2, e: [{ i: 11, t: 'f', g: 0, c: '', a: 0, v: quader(-100, -10, 90, 26, 10, 228) }, { i: 12, t: 'w', g: 0, c: '', a: 0, v: quader(-500, -20, 0, 500, 20, 280) }], geschosse: [{ n: 'EG', z: 0 }], dreiecke: 24, voll: true };
  const p = await browser.newPage({ viewport: { width: 1500, height: 950 } });
  p.on('pageerror', (e) => fehler.push('Fehler im Skript – ' + e.message));
  await p.route('http://gm.test/**', (r) => {
    const q = r.request(), pf = new URL(q.url()).pathname.replace(/^\//, ''), J = (o, st) => r.fulfill({ status: st || 200, contentType: 'application/json', body: JSON.stringify(o) });
    if (pf === '') return r.fulfill({ contentType: 'text/html', body: fs.readFileSync(path.join(repo, 'plattform/static/gebaeudemodell.html')) });
    if (pf.startsWith('static/')) return r.fulfill({ contentType: pf.endsWith('.css') ? 'text/css' : 'text/javascript', body: fs.readFileSync(path.join(repo, 'plattform/static', pf.slice(7))) });
    if (pf === 'bp/baukasten.js') return r.fulfill({ contentType: 'text/javascript', body: baukasten });
    if (pf.startsWith('bp/')) { const f = path.join(KASTEN, pf.slice(3).split('?')[0]); return fs.existsSync(f) ? r.fulfill({ contentType: f.endsWith('.css') ? 'text/css' : 'text/javascript', body: fs.readFileSync(f) }) : r.fulfill({ status: 404, body: '' }); }
    if (pf === 'api/me') return J({ ok: true, id: 1, name: 'admin', vorname: 'A', role: 'admin', admin: true, is_admin: true, look: {} });
    if (pf === 'api/platform') return J({ apps: [], user: { name: 'admin', role: 'admin' }, projekte: [] });
    if (pf === 'api/bp/projekt') return J({ id: 7, name: 'Testprojekt', nummer: 'A1' });
    if (pf === 'api/bp/modell/7/planstaende') return J(S.keinPs ? { planstaende: [], gilt: null } : { planstaende: [{ id: 1, name: 'Werkplanung', erstellt: '2026-11-16' }, { id: 2, name: 'Baukasten 21.11.2026', erstellt: '2026-11-21' }], gilt: 1 });
    if (pf === 'api/bp/modell/7/planstand/2') return J({ planstand: { id: 2, name: 'Baukasten 21.11.2026', art: 'hand' }, liste: { quelle: { art: 'hand', planstand: 2 }, raeume: [{ nr: 'X.01', name: 'Altbau', flaeche: 20, hoehe: 2.5, geschoss: 'EG' }], elemente: [], zeilen: [zeile('raum:boden:alt', { name: 'Böden Altbau', mitglieder: ['X.01'] })] }, abgleich: { neu: [], geaendert: [], entfaellt: [] } });
    if (pf === 'api/bp/modell/7/rueckweg') return J({ vorschlaege: [], schalter: { kosten: true, termine: true }, phasen: [], termine: {}, extern: false });
    if (pf === 'api/bp/modell/7/bauteile/zeile') { const b = JSON.parse(q.postData() || '{}'); S.zeile.push(b); S.status = b.status || null; S.rev = (S.rev || 4) + 1; return J(M()); }
    if (pf === 'api/bp/modell/7/bauteile/vorlagen') return J([{ id: '353.02', kg: '353', name: 'Estrich + Parkett', einheit: 'm²', schichten: [] }]);
    if (pf === 'api/bp/modell/7/anweisung/verstehen') return J({ ki: '', schritte: [{ ziel: 'raum', teil: 'boden', filter: { geschoss: ['EG'] }, material: 'Mosaikparkett geölt', beschreibung: 'Böden der Räume · Geschoss EG', anzahl: 2, bleiben: 0, einheit: 'Räume',
      rueckfrage: { text: '„Mosaikparkett geölt“ steht so nicht im Katalog der Bauplattform. Ähnlich:', kandidaten: [{ vorlage: '353.02', setze: { 1: 6 }, name: 'Estrich + Parkett, Mosaikparkett', wert: 0.5 }] } }] });
    if (pf === 'api/bp/modell/7/anweisung/anwenden') { const b = JSON.parse(q.postData() || '{}'); S.anwB = b; S.anw = b.text; return J({ id: 'a1', ...M() }); }
    if (pf === 'api/bp/modell/7/anweisung/a1' && q.method() === 'DELETE') { S.anw = null; S.weg++; return J(M()); }
    if (pf === 'api/bp/modell/7/plus' && q.method() === 'PUT') { const b = JSON.parse(q.postData() || '{}'); S.plusPut = b; S.plus = { ...(S.plus || {}), ...b }; return J(M()); }
    if (pf === 'api/bp/modell/7/raumweg' && q.method() === 'PUT') { const b = JSON.parse(q.postData() || '{}'); S.rwPut = b; S.schacht = b.art || 'raum'; return J(M()); }
    if (pf === 'api/bp/modell/7/hand' && q.method() === 'PUT') { S.handPut = JSON.parse(q.postData() || '{}'); return J(M()); }
    if (pf === 'api/bp/modell/7/hand/vorschlag') return J({ quelle: 'assistent', raeume: [{ nr: 'EG.01', name: 'Wohnen', geschoss: 'EG', flaeche: 30, hoehe: 2.5 }], elemente: [{ nr: 'F 01', art: 'Fenster', geschoss: 'EG', raum: 'EG.01', b: 1.26, h: 1.38, bruestung: 0.9 }] });
    if (pf === 'api/bp/modell/7/raum') { const b = JSON.parse(q.postData() || '{}'); S.rn = b.name; return J(M()); }
    if (pf === 'api/bp/modell/7/uwerte') { S.uwN = (S.uwN || 0) + 1; return J({ zeilen: {} }); }
    if (pf === 'api/bp/modell/7/netz') { S.netzUrl = q.url(); return J(NETZ); }
    if (pf === 'api/bp/ki/stufen') return J({ buero: true, extern: false, grund: {} });
    if (pf === 'api/bp/modell/7/verfeinern') { S.verf = JSON.parse(q.postData() || '{}'); return J({ n: 2, vorschlaege: [] }); }
    if (pf === 'api/bp/modell/7/grundriss') return J({ art: 'ifc', geschosse: [{ n: 'EG', z: 0 }], flaechen: [{ g: 0, umriss: [[-4.8, 0.3], [-0.2, 0.3], [-0.2, 4], [-4.8, 4]], flaeche: 17, z: 0, hoehe: 2.5, mitte: [-2.5, 2], raum: { nr: '0.01', name: 'Wohnen' } },
      { g: 0, umriss: [[0.2, 0.3], [4.8, 0.3], [4.8, 1.3], [0.2, 1.3]], flaeche: 4.5, z: 0, hoehe: 2.5, mitte: [2.5, 0.8], raum: null }] });
    if (pf === 'api/bp/modell/einst') return J({ e: 'e1', f: 'f1' });
    if (pf === 'api/bp/modell/7/baukasten' && q.method() === 'GET') { S.bkGet = q.url(); return J({ baukasten: { koerper: [{ id: 'k1', teil: 'h', x: 0, y: 0, z: 0, w: 12, d: 9, h: 2.9, seiten: {} }], dach: { k1: { form: 'sattel', aufbau: '' } }, gauben: [], oeff: [], teile: { h: 'Hauptgebäude' } }, korb: {}, plan: 'hand', herkunft: 'leer', raeume: [] }); }
    if (pf === 'api/bp/modell/7/baukasten') { S.bkPut = JSON.parse(q.postData() || '{}'); if (S.bkPut.neu) { S.bkNeuPut = (S.bkNeuPut || 0) + 1; S.hand = true; } return J({ ...M(), plan: 'hand' }); }
    if (pf === 'api/bp/modell/7') return J(M());
    return J(/liste|projekte|neuigkeit|kontakte/.test(pf) ? [] : {});
  });
  const zu = async (k) => {   // Seite neu aufbauen wie über die Navigation – rechts danach der Reiter „Bauteile“ (der gewählte Reiter bleibt sonst stehen)
    await p.evaluate((k) => { SICHT = k; LS.set('sicht', k); G3.bk = null; return zeichne(); }, k);
    await p.waitForFunction(() => G3.bk !== null, null, { timeout: 8000 }).catch(() => {});
    await p.evaluate(() => { if (document.querySelector('.sr-tab[data-srt="details"]')) seiteReiter('gm', 'details'); }); };
  const reiter = (k) => p.evaluate((k) => seiteReiter('gm', k), k);
  const tabs = () => p.evaluate(() => [...document.querySelectorAll('.sr-tab')].map((x) => x.textContent.trim()).join('|'));
  const popZu = () => p.evaluate(() => { const b = document.querySelector('.bt-pop .bp-eigk [data-m="x"]'); if (b) b.click(); });
  try {
    await p.addInitScript(() => { try { localStorage.setItem('bp.projekt', '7'); localStorage.removeItem('pl.sicht'); localStorage.setItem('pl.mitte', '"3d"'); } catch { /* egal */ } });
    await p.goto('http://gm.test/'); await p.waitForSelector('.sr-r table.bt-baum tr[data-btz="raum:boden:trocken"]', { timeout: 10000 });
    const a = await p.evaluate(() => ({ nav: [...document.querySelectorAll('#navL [data-pl]')].map((x) => x.textContent.trim()), bf: [...document.querySelectorAll('#bfl .bf-gt')].map((x) => x.textContent.trim()),
      kn: [...document.querySelectorAll('#bfl button')].map((x) => x.textContent.trim()), rk: [...document.querySelectorAll('.sr-r [data-gmrk]')].map((x) => x.textContent.trim()),
      tabs: [...document.querySelectorAll('.sr-tab')].map((x) => x.textContent.trim()), quer: document.documentElement.scrollWidth > innerWidth + 1, vm: !!document.querySelector('.gm-vm *'),
      tabelle: !!document.querySelector('#view table.bt-baum') }));
    // Mock „Gebäude bearbeiten“ (21.11.2026): links Gebäude › 3D · Grundriss, Verknüpfungen; Mitte nur Grafik (E1), rechts Bauteile · Räume · Fragen · Planung (C, R-A)
    pruef(a.nav.join('|') === '3D|Grundriss|Verknüpfungen', `Navigation: ${a.nav.join('|')}`);
    pruef(a.bf.includes('Stand') && !a.bf.includes('Ansicht') && !['Neu', 'KI', 'Ausgabe', 'Teilen'].some((g) => a.bf.includes(g)), `Befehlsleiste: ${a.bf.join('|')}`);
    pruef(!['3D', 'Grundriss', 'Tabelle'].some((t) => a.kn.some((k) => k.endsWith(t))) && !a.kn.some((k) => /Details|Aufräumen|entfallene/.test(k)), `Knöpfe: ${a.kn.join('|')}`);
    pruef(a.rk.join('|') === 'Alle Bauteile|Fenster & Türen einzeln', `über dem Baum rechts: ${a.rk.join('|')}`);
    pruef(a.tabs.join('|') === 'Bauteile|Räume|Fragen|Planung', `Reiter rechts: ${a.tabs.join('|')}`);
    pruef(!a.tabelle, 'Mitte: keine Tabelle mehr (E1)');
    pruef(await p.evaluate(() => !!document.querySelector('.bf-heftz .bf-heft')), 'Heftzwecke über dem Gebäudemodell');
    pruef(a.vm, 'Versionsmenü der Planstände in der Navigation fehlt');
    pruef(!a.quer, 'waagerechter Scrollbalken');
    pruef(await p.evaluate(() => window.bpBauteile.material({ lagen: [['Putz', 1.5], ['Kalksandstein', 17.5], ['Mineralwolle Dämmung', 20]] }) === 'Kalksandstein'), 'Gruppe „Material“ (F1): Hauptschicht ohne Dämmung');
    // Antwort im Eigenschaften-Fenster (Doppelklick wie im LV)
    await p.waitForTimeout(300); const uw0 = S.uwN || 0;
    await p.dblclick('tr[data-btz="raum:boden:trocken"] td.baumz'); await p.waitForSelector('.bt-pop [data-btst="erneuern"]', { timeout: 6000 });
    await p.click('.bt-pop [data-btst="erneuern"]'); await p.waitForTimeout(300);
    {   // niedriges Fenster: nur die Bereiche rollen, nicht die Seite – Navigation links reicht bis unten (Video 17.11.2026)
      await p.setViewportSize({ width: 1280, height: 520 }); await p.waitForTimeout(200);
      const h = await p.evaluate(() => ({ doc: document.documentElement.scrollHeight, win: innerHeight, nav: Math.round(document.querySelector('#navL').getBoundingClientRect().bottom) }));
      pruef(h.doc <= h.win + 1 && h.nav >= h.win - 2, `ganze Seite rollt bzw. Navigation endet zu früh: ${JSON.stringify(h)}`);
      await p.setViewportSize({ width: 1500, height: 950 }); }
    pruef(S.zeile.at(-1) && S.zeile.at(-1).status === 'erneuern', `Antwort im Eigenschaften-Fenster: ${JSON.stringify(S.zeile.at(-1))}`);
    pruef((S.uwN || 0) > uw0, `neuer Stand: U-Werte der Färbung neu geholt (${uw0} → ${S.uwN})`);
    await popZu(); await p.keyboard.press('Control+z'); await p.waitForTimeout(400);
    pruef(S.zeile.at(-1) && S.zeile.at(-1).status === 'offen', `Rückgängig stellt die Antwort zurück: ${JSON.stringify(S.zeile.at(-1))}`);
    {   // H1: Haken an zwei Zeilen → violette Leiste „2 gewählt“, Antwort für beide, ein Rückgängig für beide
      S.zeile = [];
      pruef(await p.evaluate(() => document.querySelector('tr[data-btz="raum:boden:trocken"] [data-btmw]').checked), 'gewählte Zeile hat den Haken');
      await p.click('tr[data-btz="f"] [data-btmw]'); await p.waitForSelector('.bt-mwl [data-btmwst="erneuern"]', { timeout: 4000 });
      pruef(await p.evaluate(() => /2 gewählt/.test(document.querySelector('.bt-mwl').textContent) && document.querySelector('.b3 canvas').dataset.wahl === '1'), 'Mehrfachauswahl: Leiste über dem Baum, im 3D gewählt');
      await p.click('.bt-mwl [data-btmwst="erneuern"]'); await p.waitForTimeout(400);
      pruef(S.zeile.filter((b) => b.status === 'erneuern').map((b) => b.id).sort().join() === 'f,raum:boden:trocken', `gemeinsam ändern: ${JSON.stringify(S.zeile)}`);
      S.zeile = []; await p.keyboard.press('Control+z'); await p.waitForTimeout(500);
      pruef(S.zeile.length === 2 && S.zeile.every((b) => b.status === 'offen'), `ein Rückgängig für beide: ${JSON.stringify(S.zeile)}`);
      await p.click('.bt-mwl [data-btmwweg]'); await p.waitForTimeout(150); }
    {   // mehrere gleicher Art – im Eigenschaften-Fenster derselbe Aufbau-Editor wie bei einem Bauteil, die Wahl gilt für alle
      S.zwei = true; S.zeile = []; await zu('bauteile'); await p.waitForSelector('tr[data-btz="raum:boden:nass"]');
      await p.click('tr[data-btz="raum:boden:trocken"] td.baumz'); await p.click('tr[data-btz="raum:boden:nass"] [data-btmw]');
      await p.evaluate(() => BT.eigenschaften(null));
      await p.waitForSelector('.bt-pop .bt-mwe [data-btvl="353.02"]', { timeout: 5000 });
      await p.click('.bt-pop .bt-mwe [data-btvl="353.02"]'); await p.waitForTimeout(500);
      pruef(S.zeile.filter((b) => b.vorlage === '353.02').map((b) => b.id).sort().join() === 'raum:boden:nass,raum:boden:trocken', `Aufbau im Editor gilt für alle Gewählten: ${JSON.stringify(S.zeile)}`);
      await popZu(); await p.click('.bt-mwl [data-btmwweg]').catch(() => {}); S.zwei = false; S.zeile = []; await zu('bauteile'); }
    {   // Räume als Reiter rechts (R-A), Fenster & Türen über dem Baum – rechts bleibt derselbe Bereich (kein „Planungsassistent wird geladen“)
      await p.waitForSelector('.sr-r table.bt-baum');
      await p.evaluate(() => { window.RECHTS = document.querySelector('#work .sr-r'); });
      await reiter('raeume'); await p.waitForSelector('.sr-r .gm-li-r tr[data-gmz]');
      pruef(await p.evaluate(() => document.querySelector('#work .sr-r') === window.RECHTS && /Wohnen/.test(document.querySelector('.sr-r .gm-li-r').textContent)), 'Räume rechts im eigenen Reiter');
      await p.click('#navL [data-pl="rgr"]'); await p.waitForTimeout(300);
      pruef(await p.evaluate(() => !document.querySelector('#view .gm-gr').hidden && document.querySelector('#view .gm-d3').hidden && document.querySelector('#navL [data-pl="rgr"]').classList.contains('on')), 'Grundriss in der Mitte');
      await p.click('#navL [data-pl="g3d"]'); await p.waitForTimeout(200);
      await reiter('details'); await p.click('.sr-r [data-gmrk="fenster"]'); await p.waitForSelector('.sr-r .gm-li-f tr[data-gmz]');
      pruef(await p.evaluate(() => document.querySelector('#work .sr-r') === window.RECHTS && !/Planungsassistent wird geladen/.test(document.querySelector('#work').textContent) && document.querySelector('.sr-r .gm-tabi').hidden), 'Fenster & Türen einzeln: statt des Baums, rechts nicht neu geladen');
      await p.click('.sr-r [data-gmrk="baum"]');
      // angesehener Planstand, der nicht gilt: Räume, 3D und Grundriss bleiben bei ihm, nur zum Ansehen
      await p.evaluate(() => BT.ansehen(2)); await reiter('raeume'); await p.waitForSelector('.sr-r .gm-li-r .gm-ansehen', { timeout: 6000 });
      pruef(await p.evaluate(() => /Altbau/.test(document.querySelector('.sr-r .gm-li-r').textContent) && !/Wohnen/.test(document.querySelector('.sr-r .gm-li-r').textContent)
        && [...document.querySelectorAll('.sr-r .gm-li-r input')].every((x) => x.disabled)), 'angesehener Planstand: Räume aus ihm, nur zum Ansehen');
      pruef(/planstand=2/.test(S.netzUrl || ''), `3D zeigt den angesehenen Planstand: ${S.netzUrl}`);
      await p.click('.sr-r [data-gman="zurueck"]'); await p.waitForFunction(() => /Wohnen/.test((document.querySelector('.sr-r .gm-li-r') || {}).textContent || ''), null, { timeout: 6000 }).catch(() => {});
      pruef(await p.evaluate(() => /Wohnen/.test(document.querySelector('.sr-r .gm-li-r').textContent) && !document.querySelector('.sr-r .gm-ansehen')), '„Zurück zum gültigen“: wieder die Räume des gültigen Planstands');
      // Plan aus einer Datei: „Gebäude bearbeiten“ grau (D1)
      await p.waitForSelector('.b3-l [data-gmbearb]', { timeout: 8000 }).catch(() => {});   // nach „Zurück zum gültigen“ baut sich das 3D neu auf
      pruef(await p.evaluate(() => { const b = document.querySelector('.b3-l [data-gmbearb]'); return b && b.disabled; }), 'Plan aus einer Datei: Schalter „Gebäude bearbeiten“ grau');
      await zu('bauteile'); await p.waitForSelector('.sr-r table.bt-baum');
      // „Neuer Planstand …“ in der Befehlsleiste: Wie willst du beginnen? → Mit dem Baukasten = Erdgeschoss + Satteldach, eigener Planstand (gilt sofort)
      await p.evaluate(() => [...document.querySelectorAll('#bfl button')].find((b) => /Neuer Plan/.test(b.textContent)).click()); await p.waitForSelector('.bt-anf [data-m="baukasten"]');
      await p.click('.bt-anf [data-m="baukasten"]'); await p.waitForFunction(() => !!document.querySelector('#view .gm-d3 .b3 canvas'), null, { timeout: 8000 }).catch(() => {});
      for (let i = 0; i < 40 && !S.bkPut; i++) await p.waitForTimeout(100);
      await p.waitForTimeout(1500);   // ein zweiter Baukasten (zwei Aufrufe gleichzeitig) hätte jetzt auch gespeichert
      pruef(S.bkNeuPut === 1, `Neuer Planstand: genau eine Anfrage „neu“ (${S.bkNeuPut}×) – sonst entstehen zwei Planstände`);
      {   // B: im Baukasten „Gebäude bearbeiten“ an → rechts Baukörper; aus → der Baum zum Belegen
        const an = await p.evaluate(() => { const b = document.querySelector('.b3-l [data-gmbearb]'); return b && !b.disabled && b.classList.contains('on'); });
        pruef(an && (await tabs()).startsWith('Baukörper|Räume'), `Baukasten: „Gebäude bearbeiten“ an, rechts Baukörper: ${an} ${await tabs()}`);
        await p.click('.b3-l [data-gmbearb]'); await p.waitForTimeout(400);
        pruef((await tabs()).startsWith('Bauteile|Räume') && await p.evaluate(() => !document.querySelector('.b3-l [data-gmbearb]').classList.contains('on')), `aus: rechts der Baum: ${await tabs()}`);
        await p.click('.b3-l [data-gmbearb]'); await p.waitForTimeout(300); }
      S.bkNeuPut = 0;   // gleichzeitig: „Neuer Planstand“ läuft, während die Bauteile fertig laden und die Mitte ebenfalls aufbauen wollen
      await p.evaluate(() => { gmWeg('baukasten'); g3Mitte('3d', true); }); await p.waitForTimeout(2500);
      pruef(S.bkNeuPut === 1, `Neuer Planstand, zwei Aufrufe gleichzeitig: ${S.bkNeuPut}× „neu“ – die Mitte darf nur einmal aufgebaut werden`);
      pruef(/neu=1/.test(S.bkGet || '') && S.bkPut && S.bkPut.neu === true && (S.bkPut.netz || {}).e && S.bkPut.netz.e.length > 4, `Neuer Planstand mit dem Baukasten: ${S.bkGet} ${JSON.stringify(S.bkPut && { neu: S.bkPut.neu, n: (S.bkPut.netz || {}).e && S.bkPut.netz.e.length })}`);
      S.hand = false; await zu('bauteile');
    }
    // Fragen & Anweisungen: Anweisung mit Vorschau, Rückfrage (Katalog), anwenden – ausgeführt in der Liste darunter; Rückgängig nimmt sie zurück
    await reiter('fragen'); await p.waitForSelector('.sr-r [data-gmanw]', { timeout: 8000 });
    pruef(await p.evaluate(() => !!document.querySelector('.sr-r [data-gmluecken]') && ![...document.querySelectorAll('#bfl .bf-gt')].some((x) => /KI/.test(x.textContent))), 'Fragen & Anweisungen: Reiter rechts mit „KI: Lücken füllen“, keine KI-Gruppe in der Leiste');
    await p.click('.sr-r [data-gmluecken]'); await p.waitForSelector('.sr-r [data-gmvs]', { timeout: 6000 });
    pruef(S.verf && S.verf.ki && S.verf.was.includes('luecken'), `Lücken füllen mit einem Klick: ${JSON.stringify(S.verf)}`);
    await p.click('.sr-r [data-gmanw]');
    await p.waitForSelector('[data-awt]'); await p.fill('[data-awt]', 'Alle Räume im EG Mosaikparkett geölt'); await p.click('[data-m="verstehen"]');
    await p.waitForSelector('[data-m="k:0:0"]');
    pruef(await p.evaluate(() => document.querySelector('[data-m="ok"]').disabled), 'Anwenden vor der Wahl im Katalog darf nicht gehen');
    await p.click('[data-m="k:0:0"]'); await p.click('[data-m="ok"]'); await p.waitForSelector('.sr-r [data-gmanwweg="a1"]', { timeout: 6000 });
    pruef(S.anwB && S.anwB.schritte[0].treffer.vorlage === '353.02', `Anwenden mit Treffer: ${JSON.stringify(S.anwB)}`);
    await p.keyboard.press('Control+z'); await p.waitForTimeout(400);
    pruef(S.weg === 1, 'Rückgängig nimmt die Anweisung zurück');
    // Fenster & Türen einzeln, Räume
    await zu('bauteile'); await p.waitForSelector('.sr-r [data-gmrk="fenster"]'); await p.click('.sr-r [data-gmrk="fenster"]'); await p.waitForSelector('.sr-r .gm-li-f tr[data-gmz]');
    pruef(await p.evaluate(() => /F 01/.test(document.querySelector('.sr-r .gm-li-f').textContent) && /1,26/.test(document.querySelector('.sr-r .gm-li-f').textContent)), 'Fenster & Türen: Nummer, Maße');
    await p.click('.sr-r tr[data-gmz="f"]'); await p.waitForSelector('table.bt-baum tr.akt[data-btz="f"]');
    pruef(await p.evaluate(() => !document.querySelector('.sr-r .gm-tabi').hidden), 'Klick auf das Fenster: zurück im Baum bei seiner Zeile');
    await reiter('raeume'); await p.waitForSelector('.sr-r .gm-li-r tr[data-gmz]');
    await p.fill('[data-gmrn="EG.03"]', 'Kind'); await p.press('[data-gmrn="EG.03"]', 'Tab'); await p.waitForTimeout(300);   // ermittelter Raum: Namen vergeben
    pruef(S.rn === 'Kind' && await p.evaluate(() => document.querySelector('[data-gmrn="EG.03"]').value === 'Kind' && /ermittelt/.test(document.querySelector('.sr-r .gm-li-r').textContent)), `Raum benennen: ${S.rn}`);
    S.hand = true; await zu('bauteile'); await p.waitForFunction(() => G3.bk === true, null, { timeout: 6000 }).catch(() => {});   // ohne Plan: Arbeitsmaske
    await reiter('raeume'); await p.waitForSelector('.sr-r .gm-mask [data-gmh="0:flaeche"]');
    pruef(await p.evaluate(() => document.querySelector('.sr-r .gm-mask [data-gmh="0:flaeche"]').disabled && /im Grundriss/.test((document.querySelector('.sr-r .gm-lesen') || {}).textContent || '') && document.querySelector('.sr-r [data-gmneu="raeume"]').hidden), 'ohne Plan keine Arbeitsmaske (G4-A): Räume nur zum Lesen, „Zum Grundriss“');
    await p.click('.b3-l [data-gmbearb]'); await p.waitForTimeout(300); await reiter('raeume'); await p.waitForSelector('.sr-r .gm-mask [data-gmh="0:flaeche"]');
    pruef(await p.evaluate(() => document.querySelector('.sr-r .gm-mask [data-gmh="0:flaeche"]').disabled), '„Gebäude bearbeiten“ aus: Räume bleiben nur zum Lesen (G4-A)');
    // „aus der Planung“ (21.11.2026): kein Fenster „Mengen/Preise“ mehr – das ganze Gebäude aus dem Assistenten im Baukasten, eigener Planstand „Planung …“
    S.bkPut = null; S.bkGet = '';
    await p.evaluate(() => gmWeg('planung')); for (let i = 0; i < 60 && !S.bkPut; i++) await p.waitForTimeout(100);
    pruef(await p.evaluate(() => !document.querySelector('.modal [data-bta]')) && /neu=1&planung=1/.test(S.bkGet || '') && S.bkPut && S.bkPut.neu === true && S.bkPut.name === 'Planung',
      `aus der Planung: ohne Mengen/Preise-Fenster, ganzes Gebäude als Planstand „Planung“: ${S.bkGet} ${JSON.stringify(S.bkPut && { neu: S.bkPut.neu, name: S.bkPut.name })}`);
    {   // Zeilen von Hand lassen sich ändern und entfernen – Name im Eigenschaften-Fenster, im Baum Kontextmenü/F2/Entf
      S.mh = true; S.hand = false; S.zeile = []; await zu('bauteile'); await p.waitForSelector('table.bt-baum tr[data-btz="hand:1"]');
      await p.dblclick('tr[data-btz="hand:1"] td.baumz'); await p.waitForSelector('.bt-pop [data-btname]', { timeout: 4000 });
      await p.fill('.bt-pop [data-btname]', 'Trockenbauwand Diele'); await p.keyboard.press('Tab'); await p.waitForTimeout(250);
      pruef(S.zeile.some((b) => b.id === 'hand:1' && b.name === 'Trockenbauwand Diele'), 'Zeile von Hand: Name ändern geht nicht an den Kern – ' + JSON.stringify(S.zeile));
      await popZu();
      await p.click('tr[data-btz="hand:1"] td.baumz'); await p.keyboard.press('Delete'); await p.waitForTimeout(300);
      pruef(S.zeile.some((b) => b.id === 'hand:1' && b.loeschen), 'Zeile von Hand: Entf im Baum entfernt nicht – ' + JSON.stringify(S.zeile));
      S.zeile = []; await p.click('tr[data-btz="f"] td.baumz'); await p.keyboard.press('Delete'); await p.waitForTimeout(200);
      pruef(!S.zeile.some((b) => b.loeschen), 'Entf entfernt ein Bauteil aus dem Plan');
      S.mh = false; }
    {   // 19.11.2026 (Bild „runter gerutscht“): ohne Bauteile steht die Tabelle gleich unter der Meldung – .bt-bl war auch die Klasse der Vorlagen-Blöcke (flex:1 je Teil)
      S.leer = true; await zu('bauteile'); await p.waitForSelector('.bt-bl .bp-leer', { timeout: 8000 });
      const g = await p.evaluate(() => ({ leer: Math.round(document.querySelector('.bt-bl .bp-leer').getBoundingClientRect().bottom), tab: Math.round(document.querySelector('.bt-bw').getBoundingClientRect().top) }));
      pruef(g.tab - g.leer < 60, `ohne Bauteile: Tabelle rutscht nach unten – ${JSON.stringify(g)}`);
      // 21.11.2026: einziger Planstand gelöscht – das Menü bleibt offen bar mit „noch keiner“ und „Neuen Planstand einlesen“
      S.keinPs = true; await zu('bauteile'); await p.waitForSelector('.gm-vm .bph-vm-b', { timeout: 8000 }); await p.waitForTimeout(300);
      const vm = await p.evaluate(() => { const b = document.querySelector('.gm-vm .bph-vm-b'); b.click(); const m = document.querySelector('.bph-vm-m:not([hidden])'); return { aus: b.disabled, t: b.textContent, neu: !!(m && /Neuer Plan/.test(m.textContent)) }; });
      pruef(!vm.aus && /noch keiner/.test(vm.t) && vm.neu, `ohne Planstand: Menü gesperrt oder ohne „Neu“ – ${JSON.stringify(vm)}`);
      pruef(await p.evaluate(() => !document.querySelector('#view .gm-d3 .bkx') && !document.querySelector('#view .gm-d3 canvas') && !!document.querySelector('#view .gm-start [data-gmstart]')), 'ohne Planstand ist die Mitte leer bis auf „Wie willst du beginnen?“ – kein altes Gebäude, kein Baukasten von selbst');
      await p.keyboard.press('Escape'); S.keinPs = false; S.leer = false; }
    {   // GO 20.11.2026 (Mock „Gebäudemodell ergänzen“ A1 C1): „＋ Fenster / Tür“ / „＋ Raum“ über der Liste rechts;
      // die Zeile steht gelb mit Feldern neben denen aus dem Plan, Art als Auswahlliste, 🗑 entfernt
      S.mh = false; S.hand = false; S.plus = null; await zu('bauteile'); await p.waitForSelector('.sr-r [data-gmrk="fenster"]'); await p.click('.sr-r [data-gmrk="fenster"]'); await p.waitForSelector('.sr-r table.gm-l');
      pruef(await p.evaluate(() => !!document.querySelector('.sr-r [data-gmneu="fenster"]:not([hidden])') && /Herkunft/.test(document.querySelector('.sr-r table.gm-l thead').textContent) && /Plan/.test(document.querySelector('.sr-r table.gm-l tbody tr[data-gmz] .gm-her').textContent)), 'Liste mit Plan: „＋ Fenster / Tür“ oder Spalte „Herkunft“ fehlt');
      await p.click('.sr-r [data-gmneu="fenster"]'); await p.waitForSelector('.sr-r tr.gm-plus [data-gmh="0:b"]');
      pruef(S.plusPut && S.plusPut.elemente && S.plusPut.elemente.length === 1 && S.plusPut.elemente[0].art === 'Fenster' && S.plusPut.elemente[0].geschoss === 'EG', `Ergänzen geht nicht an den Kern: ${JSON.stringify(S.plusPut)}`);
      pruef(await p.evaluate(() => { const r = document.querySelector('.sr-r tr.gm-plus'); return /ergänzt/.test(r.querySelector('.gm-her').textContent) && !!r.querySelector('[data-gmhweg]') && document.querySelectorAll('.sr-r .gm-li-f table.gm-l tbody tr[data-gmz]').length === 2; }), 'ergänzte Zeile: gelb mit „ergänzt“ und 🗑 neben der aus dem Plan');
      await p.fill('.sr-r tr.gm-plus [data-gmh="0:b"]', '0,76'); await p.keyboard.press('Tab'); await p.waitForTimeout(250);
      pruef(S.plusPut.elemente[0].b === 0.76, `Breite der ergänzten Zeile: ${JSON.stringify(S.plusPut.elemente[0])}`);
      await p.click('.sr-r tr.gm-plus [data-gmart]'); await p.waitForTimeout(200);
      const men = await p.evaluate(() => [...document.querySelectorAll('.pickm .pm-l > *')].map((b) => b.textContent.trim()));
      pruef(['Fenster', 'Fenstertür', 'Innentür', 'Außentür'].every((a) => men.includes(a)), `Art als Auswahlliste: ${men.join(' | ')}`);
      await p.evaluate(() => [...document.querySelectorAll('.pickm .pm-l > *')].find((b) => b.textContent.trim() === 'Innentür').click()); await p.waitForTimeout(250);
      pruef(S.plusPut.elemente[0].art === 'Innentür' && S.plusPut.elemente[0].bruestung === null, `Art gewählt: ${JSON.stringify(S.plusPut.elemente[0])}`);
      await p.click('.sr-r tr.gm-plus [data-gmhweg]'); await p.waitForTimeout(250);
      pruef(S.plusPut.elemente.length === 0 && await p.evaluate(() => !document.querySelector('.sr-r tr.gm-plus')), 'ergänzte Zeile entfernen');
      await reiter('raeume'); await p.waitForSelector('.sr-r .gm-li-r table.gm-l');
      await p.click('.sr-r [data-gmneu="raeume"]'); await p.waitForSelector('.sr-r tr.gm-plus [data-gmh="0:name"]');
      pruef(S.plusPut.raeume && S.plusPut.raeume[0].nr === 'EG.01' && S.plusPut.raeume[0].geschoss === 'EG', `Raum ergänzt: ${JSON.stringify(S.plusPut.raeume)}`);
      S.plus = null; await zu('bauteile'); await p.waitForSelector('table.bt-baum');
      pruef(await p.evaluate(() => !!document.querySelector('table.bt-baum [data-bthand]')), 'Bauteile: „＋ Zeile“ im Baum fehlt');
    }
    // Grundriss (A1, Räume annehmen): Fläche ohne Raum gelb, Klick nimmt sie als Raum an (Ergänzung neben dem Plan)
    { S.plusPut = null;
      await p.click('#navL [data-pl="rgr"]'); await p.waitForSelector('#view .gr-f.frei', { timeout: 8000 });
      pruef(await p.evaluate(() => !!document.querySelector('#view .gr-w') && document.querySelectorAll('#view .gr-f').length === 2 && /Wohnen/.test(document.querySelector('#view .gr-b').textContent)), 'Grundriss: Wände und zwei Flächen, eine mit Raum aus dem Plan');
      await p.click('#view .gr-f.frei'); await p.waitForSelector('.bph-frage-in'); await p.fill('.bph-frage-in', 'Abstellraum'); await p.click('.bph-frage [data-f="ja"]'); await p.waitForTimeout(400);
      pruef(S.plusPut && S.plusPut.raeume && S.plusPut.raeume[0].name === 'Abstellraum' && S.plusPut.raeume[0].flaeche === 4.5, `Fläche als Raum angenommen: ${JSON.stringify(S.plusPut)}`); S.plus = null;
      // Entf am ermittelten Raum (22.11.2026): kein Raum / Schacht – grau; ein Klick ändert nichts, wieder Raum nur über das Kontextmenü
      S.schacht = 'raum'; await p.evaluate(() => BT.laden()); await p.evaluate(() => gmGrundriss(document.querySelector('#view .gm-gr') || GR.box, true)); await p.waitForFunction(() => document.querySelectorAll('#view .gr-f:not(.frei)').length === 2, null, { timeout: 8000 }).catch(() => {});
      await p.click('#view .gr-f[data-grf="1"]'); await p.keyboard.press('Delete'); await p.waitForSelector('.bph-frage [data-f="drei"]', { timeout: 4000 }).catch(() => {});
      await p.click('.bph-frage [data-f="drei"]').catch(() => {}); await p.waitForSelector('#view .gr-f.weg', { timeout: 6000 }).catch(() => {});
      pruef(S.rwPut && S.rwPut.art === 'schacht' && S.rwPut.g === 'EG' && S.rwPut.p[0] === 2.5 && S.rwPut.umriss.length === 4, `Entf → Schacht: ${JSON.stringify(S.rwPut)}`);
      pruef(await p.evaluate(() => /Schacht/.test((document.querySelector('#view .gr-f.weg') || {}).textContent || '')), 'Fläche grau als „Schacht“');
      S.rwPut = null; await p.click('#view .gr-f.weg'); await p.waitForTimeout(500);
      pruef(!S.rwPut, `Klick auf die graue Fläche ändert nichts: ${JSON.stringify(S.rwPut)}`);
      await p.click('#view .gr-f.weg', { button: 'right' }); await p.waitForSelector('.bph-km');
      await p.evaluate(() => [...document.querySelectorAll('.bph-km button')].find((b) => /Doch ein Raum/.test(b.textContent)).click()); await p.waitForTimeout(500);
      pruef(S.rwPut && S.rwPut.art === '', `Kontextmenü „Doch ein Raum“ nimmt die Fläche wieder als Raum: ${JSON.stringify(S.rwPut)}`); S.schacht = null; }
    // 3D in der Mitte: nur zwei Färbungen, Klick im Baum wählt im Modell; „Darstellung ▾“ rechts, ⧉ abdocken
    { S.leer = false; S.mh = false; S.hand = false; S.plus = null;
      await p.click('#navL [data-pl="g3d"]'); await p.waitForSelector('#view .gm-d3 .b3 canvas', { timeout: 8000 });
      const a = await p.evaluate(() => ({ modi: [...document.querySelectorAll('.b3-l [data-b3f]')].map((b) => b.textContent), erst: (document.querySelector('.b3-l > *') || {}).dataset }));
      pruef(a.modi.join('|') === 'U-Wert|Maßnahmen' && a.erst && 'gmbearb' in a.erst, `3D: zwei Färbungen, „Gebäude bearbeiten“ vorn in der Leiste (A1): ${JSON.stringify(a)}`);
      await p.click('.sr-r tr[data-btz="f"] td.baumz'); await p.waitForTimeout(250);
      pruef(await p.evaluate(() => document.querySelector('.b3 canvas').dataset.wahl === '1'), 'Klick im Baum wählt im Modell');
      if (process.env.BILD) await p.screenshot({ path: process.env.BILD });   // zum Ansehen: BILD=/tmp/gm.png node tools/tests/ui/gebaeudemodell.mjs
      await p.click('.b3-l [data-b3dar]'); await p.waitForSelector('.b3-l [data-b3o]');
      { await p.evaluate(() => { const r = document.querySelector('.b3-l [data-b3o]'); r.value = 60; r.dispatchEvent(new Event('input', { bubbles: true })); }); await p.waitForTimeout(150); }
      { const d = await p.evaluate(() => { const l = document.querySelector('.b3-l').getBoundingClientRect(), b = document.querySelector('.b3-l [data-b3dar]').getBoundingClientRect(), x = document.querySelector('.b3-dar').getBoundingClientRect(), c = document.querySelector('.b3 canvas').getBoundingClientRect();
          const ab = document.querySelector('.b3-l [data-b3ab]').getBoundingClientRect();
          return { rechts: l.right - ab.right < 4 && ab.left >= b.right, unter: x.top >= b.bottom - 1, buendig: Math.abs(x.right - l.right) < 4, hoehe: c.bottom > document.querySelector('#view').getBoundingClientRect().bottom - 30 }; });
        pruef(d.rechts && d.unter && d.buendig && d.hoehe, `„Darstellung ▾“ rechts (daneben ⧉), klappt darunter auf; 3D bis unten: ${JSON.stringify(d)}`); }
      await p.click('.b3-l [data-b3dar]');
      {   // 3D abdocken (21.11.2026, A1 B3): eigenes Fenster, die Mitte zeigt den Grundriss; Fenster zu → 3D wieder in der Mitte
        const [w] = await Promise.all([p.waitForEvent('popup'), p.click('.b3-l [data-b3ab]')]);
        await w.waitForSelector('.b3 canvas', { timeout: 8000 }).catch(() => {});
        const r = await p.evaluate(() => ({ mitte: G3.mitte, d3: document.querySelector('#view .gm-d3').hidden, leer: !document.querySelector('#view .gm-d3 canvas') }));
        const z = await w.evaluate(() => ({ canvas: !!document.querySelector('.b3 canvas'), zurueck: (document.querySelector('[data-b3ab]') || {}).textContent }));
        pruef(r.mitte === 'grundriss' && r.d3 && r.leer && z.canvas && z.zurueck === '↙', `3D abgedockt: ${JSON.stringify([r, z])}`);
        await w.reload().catch(() => {}); await p.waitForTimeout(1500);   // F5 im Fenster: bleibt abgedockt, das 3D steht wieder darin
        const f5 = { mitte: await p.evaluate(() => G3.mitte), canvas: await w.evaluate(() => !!document.querySelector('.b3 canvas')).catch(() => false) };
        pruef(f5.mitte === 'grundriss' && f5.canvas, `F5 im abgedockten Fenster: ${JSON.stringify(f5)}`);
        await w.close(); await p.waitForTimeout(400);
        pruef(await p.evaluate(() => G3.mitte === '3d' && !!document.querySelector('#view .gm-d3 canvas')), 'Fenster zu: 3D wieder in der Mitte'); } }
  } catch (e) { fehler.push('bricht ab – ' + String(e.message).split('\n').slice(0, 3).join(' ')); }
  await p.close();
  return fehler;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await gebaeudemodellPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
  await b.close(); console.log(f.length ? f.join('\n') : 'ok'); process.exit(f.length ? 1 : 0);
}
