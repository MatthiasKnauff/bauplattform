// Gebäudemodell schlank (GO 20.11.2026): Navigation Gebäude · Fragen & Anweisungen · Verknüpfungen, Befehlsleiste Rückgängig · Planstand · Ansicht,
// Reiter Bauteile · Räume · Fenster & Türen, Mehrfachauswahl (H1), Grundriss mit „als Raum annehmen“, Liste rechts getrennt (L-B, F1);
// Bauteile als Baumtabelle (bp/bauteile.js, baum: true), Zeile antippen → Details rechts (seite.js) mit Antwort und Aufbau; Antwort ändern mit
// Rückgängig; Fenster & Türen und Räume aus dem Modell; Anweisung mit Vorschau, Rückfrage (Katalog) und Anwenden (bp/anweisung.js).
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
  const L = () => ({ quelle: { name: 'Werkplanung', planstand: 1, ...(S.hand ? { art: 'hand' } : {}) }, raeume: [{ nr: '0.01', name: 'Wohnen', flaeche: 30, hoehe: 2.5, geschoss: 'EG' }, { nr: '0.02', name: 'Bad', flaeche: 6, hoehe: 2.5, geschoss: 'EG' }, { nr: 'EG.03', name: S.rn || 'Raum', flaeche: 12, hoehe: 2.5, geschoss: 'EG', ermittelt: true }],
    elemente: [{ id: 11, nr: 'F 01', typ: 'Fenster', art: 'Fenster', geschoss: 'EG', raeume: ['0.01'], b: 1.26, h: 1.38, bruestung: 0.9, aussen: true },
      ...((S.plus || {}).elemente || []).map((e, k) => ({ id: 9500001 + k, nr: e.nr || 'F 02', typ: e.art, art: 'Fenster', geschoss: e.geschoss, raeume: [e.raum], b: e.b, h: e.h, bruestung: e.bruestung, aussen: true, quelle: 'plus' }))],
    ...(S.plus ? { plus: { raeume: S.plus.raeume || [], elemente: (S.plus.elemente || []).map((e) => ({ ...e, nr: e.nr || 'F 02' })) } } : {}),
    zeilen: S.leer ? [] : [zeile('raum:boden:trocken', S.status ? { status: S.status, berechnen: true } : {}), { ...zeile('f'), bereich: 'oeffnung', art: 'Fenster', kg: '334', name: 'Fenster', menge: 1.74, mitglieder: ['11'], nummern: ['F 01'], ids: [11], erlaubt: ['bleibt', 'erneuern', 'neu'] },
      ...(S.zwei ? [zeile('raum:boden:nass', { name: 'Böden Bad (0.02)', mitglieder: ['0.02'], menge: 6 })] : []),
      ...(S.mh ? [{ ...zeile('hand:1'), bereich: 'hand', art: 'von Hand', kg: '342', name: 'Trockenbauwand Flur', menge: 0, status: 'neu', berechnen: true, erlaubt: ['neu', 'erneuern', 'instandsetzen', 'abbruch'], mitglieder: [], quelle: 'hand' }] : []),
      ...(S.anw ? [{ ...zeile('raum:boden:trocken~ab'), abgeleitet: 'raum:boden:trocken', name: 'Böden – Estrich + Parkett, Mosaikparkett (0.01)', mitglieder: ['0.01'], menge: 30, status: 'erneuern', kurz: 'Estrich + Parkett, Mosaikparkett' }] : [])],
    anweisungen: S.anw ? [{ id: 'a1', text: S.anw, schritte: [{ material: 'Mosaikparkett', treffer: { name: 'Estrich + Parkett, Mosaikparkett' } }], wer: 'admin', wann: '2026-11-16T18:00' }] : [] });
  const M = () => ({ modell: { bauteilliste: L() }, rev: 4, staende: [] });
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
    if (pf === 'api/bp/modell/7/planstaende') return J(S.keinPs ? { planstaende: [], gilt: null } : { planstaende: [{ id: 1, name: 'Werkplanung', erstellt: '2026-11-16' }], gilt: 1 });
    if (pf === 'api/bp/modell/7/rueckweg') return J({ vorschlaege: [], schalter: { kosten: true, termine: true }, phasen: [], termine: {}, extern: false });
    if (pf === 'api/bp/modell/7/bauteile/zeile') { const b = JSON.parse(q.postData() || '{}'); S.zeile.push(b); S.status = b.status || null; return J(M()); }
    if (pf === 'api/bp/modell/7/bauteile/vorlagen') return J([{ id: '353.02', kg: '353', name: 'Estrich + Parkett', einheit: 'm²', schichten: [] }]);
    if (pf === 'api/bp/modell/7/anweisung/verstehen') return J({ ki: '', schritte: [{ ziel: 'raum', teil: 'boden', filter: { geschoss: ['EG'] }, material: 'Mosaikparkett geölt', beschreibung: 'Böden der Räume · Geschoss EG', anzahl: 2, bleiben: 0, einheit: 'Räume',
      rueckfrage: { text: '„Mosaikparkett geölt“ steht so nicht im Katalog der Bauplattform. Ähnlich:', kandidaten: [{ vorlage: '353.02', setze: { 1: 6 }, name: 'Estrich + Parkett, Mosaikparkett', wert: 0.5 }] } }] });
    if (pf === 'api/bp/modell/7/anweisung/anwenden') { const b = JSON.parse(q.postData() || '{}'); S.anwB = b; S.anw = b.text; return J({ id: 'a1', ...M() }); }
    if (pf === 'api/bp/modell/7/anweisung/a1' && q.method() === 'DELETE') { S.anw = null; S.weg++; return J(M()); }
    if (pf === 'api/bp/modell/7/plus' && q.method() === 'PUT') { const b = JSON.parse(q.postData() || '{}'); S.plusPut = b; S.plus = { ...(S.plus || {}), ...b }; return J(M()); }
    if (pf === 'api/bp/modell/7/hand' && q.method() === 'PUT') { S.handPut = JSON.parse(q.postData() || '{}'); return J(M()); }
    if (pf === 'api/bp/modell/7/hand/vorschlag') return J({ quelle: 'assistent', raeume: [{ nr: 'EG.01', name: 'Wohnen', geschoss: 'EG', flaeche: 30, hoehe: 2.5 }], elemente: [{ nr: 'F 01', art: 'Fenster', geschoss: 'EG', raum: 'EG.01', b: 1.26, h: 1.38, bruestung: 0.9 }] });
    if (pf === 'api/bp/modell/7/raum') { const b = JSON.parse(q.postData() || '{}'); S.rn = b.name; return J(M()); }
    if (pf === 'api/bp/modell/7/netz') return J(NETZ);
    if (pf === 'api/bp/modell/7/aenderungen') return J({ aenderungen: [{ id: 3, zeile: 'f', ids: [11], art: 'bauteil', feld: 'status', text: 'Maßnahme: noch offen → erneuern', wann: new Date().toISOString().slice(0, 19), wer: 'anna', app: 'waermeschutz', zurueck: false, kann: true }], einst: { a: 'a1', b: 'b1', c: 'c2', d: 'd2', e: 'e1', f: 'f1' } });
    if (pf === 'api/bp/modell/7/aenderungen/3/zurueck') { S.zur = true; return J({ ...M(), aenderungen: [] }); }
    if (pf === 'api/bp/ki/stufen') return J({ buero: true, extern: false, grund: {} });
    if (pf === 'api/bp/modell/7/verfeinern') { S.verf = JSON.parse(q.postData() || '{}'); return J({ n: 2, vorschlaege: [] }); }
    if (pf === 'api/bp/modell/7/grundriss') return J({ art: 'ifc', geschosse: [{ n: 'EG', z: 0 }], flaechen: [{ g: 0, umriss: [[-4.8, 0.3], [-0.2, 0.3], [-0.2, 4], [-4.8, 4]], flaeche: 17, z: 0, hoehe: 2.5, mitte: [-2.5, 2], raum: { nr: '0.01', name: 'Wohnen' } },
      { g: 0, umriss: [[0.2, 0.3], [4.8, 0.3], [4.8, 1.3], [0.2, 1.3]], flaeche: 4.5, z: 0, hoehe: 2.5, mitte: [2.5, 0.8], raum: null }] });
    if (pf === 'api/bp/modell/einst') return J({ a: 'a1', b: 'b1', c: 'c2', d: 'd2', e: 'e1', f: 'f1' });
    if (pf === 'api/bp/modell/7') return J(M());
    return J(/liste|projekte|neuigkeit|kontakte/.test(pf) ? [] : {});
  });
  const zu = (k) => p.evaluate((k) => { SICHT = k; LS.set('sicht', k); if (k === 'bauteile') LS.set('mitte', 'tabelle'); return zeichne(); }, k);   // Ansicht wechseln wie über Reiter/Navigation
  try {
    await p.addInitScript(() => { try { localStorage.setItem('bp.projekt', '7'); localStorage.removeItem('pl.sicht'); if (!localStorage.getItem('pl.mitte')) localStorage.setItem('pl.mitte', '"tabelle"'); } catch { /* egal */ } });
    await p.goto('http://gm.test/'); await p.waitForSelector('table.bt-baum tr[data-btz="raum:boden:trocken"]', { timeout: 10000 });
    const a = await p.evaluate(() => ({ nav: [...document.querySelectorAll('#navL [data-pl]')].map((x) => x.textContent.trim()), bf: [...document.querySelectorAll('#bfl .bf-gt')].map((x) => x.textContent.trim()),
      kn: [...document.querySelectorAll('#bfl button')].map((x) => x.textContent.trim()), reiter: [...document.querySelectorAll('#view .gm-tr [role=tab]')].map((x) => x.textContent.trim()),
      tabs: [...document.querySelectorAll('.sr-tab')].map((x) => x.textContent.trim()), quer: document.documentElement.scrollWidth > innerWidth + 1, vm: !!document.querySelector('.gm-vm *') }));
    // GO 20.11.2026 (Mock „Gebäudemodell schlank“): drei Punkte links, Leiste nur Rückgängig · Planstand · Ansicht, Reiter über der Tabelle
    pruef(a.nav.join('|') === 'Gebäude|Fragen & Anweisungen|Verknüpfungen', `Navigation: ${a.nav.join('|')}`);
    pruef(a.bf.includes('Planstand') && a.bf.includes('Ansicht') && !['Neu', 'KI', 'Ausgabe', 'Teilen'].some((g) => a.bf.includes(g)), `Befehlsleiste: ${a.bf.join('|')}`);
    pruef(['3D', 'Grundriss', 'Tabelle'].every((t) => a.kn.some((k) => k.endsWith(t))) && !a.kn.some((k) => /Details|Aufräumen|entfallene/.test(k)), `Knöpfe: ${a.kn.join('|')}`);
    pruef(a.reiter.join('|') === 'Bauteile|Räume|Fenster & Türen', `Reiter über der Tabelle: ${a.reiter.join('|')}`);
    pruef(a.tabs.join('|') === 'Bauteil|Änderungen|Planung', `Reiter rechts: ${a.tabs.join('|')}`);
    pruef(a.vm, 'Versionsmenü der Planstände in der Navigation fehlt');
    pruef(!a.quer, 'waagerechter Scrollbalken');
    await p.click('tr[data-btz="raum:boden:trocken"] td.baumz'); await p.waitForSelector('.sr-r [data-btz="raum:boden:trocken"] [data-btst="erneuern"]');
    await p.click('.sr-r [data-btst="erneuern"]'); await p.waitForTimeout(300);
    {   // niedriges Fenster: nur die Bereiche rollen, nicht die Seite – Navigation links reicht bis unten (Video 17.11.2026)
      await p.setViewportSize({ width: 1280, height: 520 }); await p.waitForTimeout(200);
      const h = await p.evaluate(() => ({ doc: document.documentElement.scrollHeight, win: innerHeight, nav: Math.round(document.querySelector('#navL').getBoundingClientRect().bottom) }));
      pruef(h.doc <= h.win + 1 && h.nav >= h.win - 2, `ganze Seite rollt bzw. Navigation endet zu früh: ${JSON.stringify(h)}`);
      await p.setViewportSize({ width: 1500, height: 950 }); }
    pruef(S.zeile.at(-1) && S.zeile.at(-1).status === 'erneuern', `Antwort in den Details: ${JSON.stringify(S.zeile.at(-1))}`);
    await p.keyboard.press('Control+z'); await p.waitForTimeout(400);
    pruef(S.zeile.at(-1) && S.zeile.at(-1).status === 'offen', `Rückgängig stellt die Antwort zurück: ${JSON.stringify(S.zeile.at(-1))}`);
    {   // H1: Haken an zwei Zeilen → violette Leiste „2 gewählt“, Antwort für beide, ein Rückgängig für beide; rechts „2 Bauteile gewählt“
      S.zeile = [];
      pruef(await p.evaluate(() => document.querySelector('tr[data-btz="raum:boden:trocken"] [data-btmw]').checked), 'gewählte Zeile hat den Haken');
      await p.click('tr[data-btz="f"] [data-btmw]');   // die gewählte Zeile zählt mit await p.waitForSelector('.bt-mwl [data-btmwst="erneuern"]', { timeout: 4000 });
      pruef(await p.evaluate(() => /2 gewählt/.test(document.querySelector('.bt-mwl').textContent) && /2 Bauteile gewählt/.test(document.querySelector('.sr-r').textContent) && /verschieden/.test(document.querySelector('.sr-r .bt-mwd').textContent)), 'Mehrfachauswahl: Leiste über der Tabelle und rechts „2 Bauteile gewählt“ mit „verschieden“');
      await p.click('.bt-mwl [data-btmwst="erneuern"]'); await p.waitForTimeout(400);
      pruef(S.zeile.filter((b) => b.status === 'erneuern').map((b) => b.id).sort().join() === 'f,raum:boden:trocken', `gemeinsam ändern: ${JSON.stringify(S.zeile)}`);
      S.zeile = []; await p.keyboard.press('Control+z'); await p.waitForTimeout(500);
      pruef(S.zeile.length === 2 && S.zeile.every((b) => b.status === 'offen'), `ein Rückgängig für beide: ${JSON.stringify(S.zeile)}`);
      await p.click('.bt-mwl [data-btmwweg]'); await p.waitForTimeout(150); }
    {   // 21.11.2026: mehrere gleicher Art – rechts derselbe Aufbau-Editor wie bei einem Bauteil, die Wahl gilt für alle
      S.zwei = true; S.zeile = []; await zu('bauteile'); await p.waitForSelector('tr[data-btz="raum:boden:nass"]');
      await p.click('tr[data-btz="raum:boden:trocken"] td.baumz'); await p.click('tr[data-btz="raum:boden:nass"] [data-btmw]');
      await p.waitForSelector('.sr-r .bt-mwe [data-btvl="353.02"]', { timeout: 5000 });
      await p.click('.sr-r .bt-mwe [data-btvl="353.02"]'); await p.waitForTimeout(500);
      pruef(S.zeile.filter((b) => b.vorlage === '353.02').map((b) => b.id).sort().join() === 'raum:boden:nass,raum:boden:trocken', `Aufbau im Editor gilt für alle Gewählten: ${JSON.stringify(S.zeile)}`);
      await p.click('.bt-mwl [data-btmwweg]').catch(() => {}); S.zwei = false; S.zeile = []; await zu('bauteile'); }
    // Fragen & Anweisungen: Anweisung mit Vorschau, Rückfrage (Katalog), anwenden – ausgeführt in der Liste darunter; Rückgängig nimmt sie zurück
    await p.click('#navL [data-pl="fragen"]'); await p.waitForSelector('#view [data-gmanw]', { timeout: 8000 });
    pruef(await p.evaluate(() => !!document.querySelector('#view [data-gmluecken]') && !document.querySelectorAll('#bfl .bf-gt').length || ![...document.querySelectorAll('#bfl .bf-gt')].some((x) => /KI/.test(x.textContent))), 'Fragen & Anweisungen: „KI: Lücken füllen“ auf der Seite, keine KI-Gruppe in der Leiste');
    await p.click('#view [data-gmluecken]'); await p.waitForSelector('#view [data-gmvs]', { timeout: 6000 });
    pruef(S.verf && S.verf.ki && S.verf.was.includes('luecken'), `Lücken füllen mit einem Klick: ${JSON.stringify(S.verf)}`);
    await p.click('#view [data-gmanw]');
    await p.waitForSelector('[data-awt]'); await p.fill('[data-awt]', 'Alle Räume im EG Mosaikparkett geölt'); await p.click('[data-m="verstehen"]');
    await p.waitForSelector('[data-m="k:0:0"]');
    pruef(await p.evaluate(() => document.querySelector('[data-m="ok"]').disabled), 'Anwenden vor der Wahl im Katalog darf nicht gehen');
    await p.click('[data-m="k:0:0"]'); await p.click('[data-m="ok"]'); await p.waitForSelector('#view [data-gmanwweg="a1"]', { timeout: 6000 });
    pruef(S.anwB && S.anwB.schritte[0].treffer.vorlage === '353.02', `Anwenden mit Treffer: ${JSON.stringify(S.anwB)}`);
    await p.keyboard.press('Control+z'); await p.waitForTimeout(400);
    pruef(S.weg === 1, 'Rückgängig nimmt die Anweisung zurück');
    // Fenster & Türen, Räume – Reiter über der Tabelle (B1, C1)
    await zu('bauteile'); await p.waitForSelector('#view [data-gmtr="fenster"]'); await p.click('#view [data-gmtr="fenster"]'); await p.waitForSelector('#view tr[data-gmz]');
    pruef(await p.evaluate(() => /F 01/.test(document.querySelector('#view').textContent) && /1,26/.test(document.querySelector('#view').textContent) && document.querySelector('#navL [data-pl="gebaeude"]').classList.contains('on')), 'Fenster & Türen: Nummer, Maße; links bleibt „Gebäude“ gewählt');
    await p.click('#view tr[data-gmz="f"]'); await p.waitForSelector('table.bt-baum tr.akt[data-btz="f"]');
    await zu('raeume'); await p.waitForSelector('#view tr[data-gmz]');
    pruef(await p.evaluate(() => /Wohnen/.test(document.querySelector('#view').textContent)), 'Räume');
    await p.fill('[data-gmrn="EG.03"]', 'Kind'); await p.press('[data-gmrn="EG.03"]', 'Tab'); await p.waitForTimeout(300);   // ermittelter Raum: Namen vergeben
    pruef(S.rn === 'Kind' && await p.evaluate(() => document.querySelector('[data-gmrn="EG.03"]').value === 'Kind' && /ermittelt/.test(document.querySelector('#view').textContent)), `Raum benennen: ${S.rn}`);
    S.hand = true; await zu('raeume');   // ohne Plan: Arbeitsmaske
    await p.waitForSelector('#view .gm-mask [data-gmh="0:flaeche"]');
    await p.fill('#view [data-gmh="0:flaeche"]', '31,5'); await p.press('#view [data-gmh="0:flaeche"]', 'Tab'); await p.waitForTimeout(300);
    pruef(S.handPut && S.handPut.raeume && S.handPut.raeume[0].flaeche === 31.5, `Arbeitsmaske speichert: ${JSON.stringify(S.handPut)}`);
    // derselbe Dialog wie im Reiter „Bauteile“ (bpBauteile.ausPlanung, Y1/Z1 17.11.2026): Mengen und Preise wählbar, Räume aufklappbar
    await p.click('#view [data-gmhvor]'); await p.waitForSelector('.modal [data-bta="m"]', { timeout: 8000 });
    pruef(await p.evaluate(() => document.querySelectorAll('.modal [data-bta]').length === 4), 'Mengen/Preise nicht wählbar');
    await p.click('.modal [data-m="raeume"]'); await p.waitForSelector('.modal [data-btan]');
    pruef(await p.evaluate(() => /1 Fenster/.test(document.querySelector('.modal').textContent)), 'Vorschlag des Assistenten zeigt Räume mit Fenstern');
    await p.click('.modal [data-m="x"]');
    {   // 20.11.2026: Zeilen von Hand lassen sich ändern und entfernen – Name rechts in den Details, im Baum Kontextmenü/F2/Entf; ein Klick auf die Zeile holt „Bauteil“ nach vorn
      S.mh = true; S.hand = false; S.zeile = []; await zu('bauteile'); await p.waitForSelector('table.bt-baum tr[data-btz="hand:1"]');
      await p.evaluate(() => seiteReiter('gm', 'aend')); await p.waitForTimeout(200);
      await p.click('tr[data-btz="hand:1"] td.baumz'); await p.waitForSelector('.sr-r [data-btz="hand:1"] [data-btname]', { timeout: 4000 }).catch(() => {});
      pruef(await p.evaluate(() => { const t = document.querySelector('#work .sr-tab.on'); return t && t.dataset.srt === 'details' && !!document.querySelector('.sr-r [data-btz="hand:1"] [data-btweg]'); }), 'Zeile von Hand gewählt: „Bauteil“ kommt nicht nach vorn');
      await p.fill('.sr-r [data-btz="hand:1"] [data-btname]', 'Trockenbauwand Diele'); await p.keyboard.press('Tab'); await p.waitForTimeout(250);
      pruef(S.zeile.some((b) => b.id === 'hand:1' && b.name === 'Trockenbauwand Diele'), 'Zeile von Hand: Name ändern geht nicht an den Kern – ' + JSON.stringify(S.zeile));
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
      const vm = await p.evaluate(() => { const b = document.querySelector('.gm-vm .bph-vm-b'); b.click(); const m = document.querySelector('.bph-vm-m:not([hidden])'); return { aus: b.disabled, t: b.textContent, neu: !!(m && /Neuen Planstand einlesen/.test(m.textContent)) }; });
      pruef(!vm.aus && /noch keiner/.test(vm.t) && vm.neu, `ohne Planstand: Menü gesperrt oder ohne „Neu“ – ${JSON.stringify(vm)}`);
      await p.keyboard.press('Escape'); S.keinPs = false; S.leer = false; }
    {   // GO 20.11.2026 (Mock „Gebäudemodell ergänzen“ A1 C1; „schlank“: „＋ Fenster / Tür“ / „＋ Raum“ rechts über der Tabelle statt „Neu“ in der Leiste):
      // die Zeile steht gelb mit Feldern neben denen aus dem Plan, Art als Auswahlliste, 🗑 entfernt
      S.mh = false; S.hand = false; S.plus = null; await zu('fenster'); await p.waitForSelector('#view table.gm-l');
      pruef(await p.evaluate(() => !!document.querySelector('#view [data-gmneu="fenster"]') && /Herkunft/.test(document.querySelector('#view table.gm-l thead').textContent) && /Plan/.test(document.querySelector('#view table.gm-l tbody tr[data-gmz] .gm-her').textContent)), 'Liste mit Plan: „＋ Fenster / Tür“ oder Spalte „Herkunft“ fehlt');
      await p.click('#view [data-gmneu="fenster"]'); await p.waitForSelector('#view tr.gm-plus [data-gmh="0:b"]');
      pruef(S.plusPut && S.plusPut.elemente && S.plusPut.elemente.length === 1 && S.plusPut.elemente[0].art === 'Fenster' && S.plusPut.elemente[0].geschoss === 'EG', `Ergänzen geht nicht an den Kern: ${JSON.stringify(S.plusPut)}`);
      pruef(await p.evaluate(() => { const r = document.querySelector('#view tr.gm-plus'); return /ergänzt/.test(r.querySelector('.gm-her').textContent) && !!r.querySelector('[data-gmhweg]') && document.querySelectorAll('#view table.gm-l tbody tr[data-gmz]').length === 2; }), 'ergänzte Zeile: gelb mit „ergänzt“ und 🗑 neben der aus dem Plan');
      await p.fill('#view tr.gm-plus [data-gmh="0:b"]', '0,76'); await p.keyboard.press('Tab'); await p.waitForTimeout(250);
      pruef(S.plusPut.elemente[0].b === 0.76, `Breite der ergänzten Zeile: ${JSON.stringify(S.plusPut.elemente[0])}`);
      await p.click('#view tr.gm-plus [data-gmart]'); await p.waitForTimeout(200);
      const men = await p.evaluate(() => [...document.querySelectorAll('.pickm .pm-l > *')].map((b) => b.textContent.trim()));
      pruef(['Fenster', 'Fenstertür', 'Innentür', 'Außentür'].every((a) => men.includes(a)), `Art als Auswahlliste: ${men.join(' | ')}`);
      await p.evaluate(() => [...document.querySelectorAll('.pickm .pm-l > *')].find((b) => b.textContent.trim() === 'Innentür').click()); await p.waitForTimeout(250);
      pruef(S.plusPut.elemente[0].art === 'Innentür' && S.plusPut.elemente[0].bruestung === null, `Art gewählt: ${JSON.stringify(S.plusPut.elemente[0])}`);
      await p.click('#view tr.gm-plus [data-gmhweg]'); await p.waitForTimeout(250);
      pruef(S.plusPut.elemente.length === 0 && await p.evaluate(() => !document.querySelector('#view tr.gm-plus')), 'ergänzte Zeile entfernen');
      await zu('raeume'); await p.waitForSelector('#view table.gm-l');
      await p.click('#view [data-gmneu="raeume"]'); await p.waitForSelector('#view tr.gm-plus [data-gmh="0:name"]');
      pruef(S.plusPut.raeume && S.plusPut.raeume[0].nr === 'EG.01' && S.plusPut.raeume[0].geschoss === 'EG', `Raum ergänzt: ${JSON.stringify(S.plusPut.raeume)}`);
      S.plus = null; await zu('bauteile'); await p.waitForSelector('table.bt-baum');
      pruef(await p.evaluate(() => !!document.querySelector('table.bt-baum [data-bthand]')), 'Bauteile: „＋ Zeile“ in der Tabelle fehlt');
    }
    // Grundriss (A1, Räume annehmen): Fläche ohne Raum gelb, Klick nimmt sie als Raum an (Ergänzung neben dem Plan)
    { S.plusPut = null;
      await p.evaluate(() => [...document.querySelectorAll('#bfl button')].find((b) => /Grundriss/.test(b.textContent)).click()); await p.waitForSelector('#view .gr-f.frei', { timeout: 8000 });
      pruef(await p.evaluate(() => !!document.querySelector('#view .gr-w') && document.querySelectorAll('#view .gr-f').length === 2 && /Wohnen/.test(document.querySelector('#view .gr-b').textContent)), 'Grundriss: Wände und zwei Flächen, eine mit Raum aus dem Plan');
      await p.click('#view .gr-f.frei'); await p.waitForSelector('.bph-frage-in'); await p.fill('.bph-frage-in', 'Abstellraum'); await p.click('.bph-frage [data-f="ja"]'); await p.waitForTimeout(400);
      pruef(S.plusPut && S.plusPut.raeume && S.plusPut.raeume[0].name === 'Abstellraum' && S.plusPut.raeume[0].flaeche === 4.5, `Fläche als Raum angenommen: ${JSON.stringify(S.plusPut)}`); S.plus = null; }
    // Gebäude mit großem 3D (20.11.2026): Mitte 3D, rechts oben Angaben, darunter die Liste einzeln (L-B), Änderungen mit Zeitschieber und Zurücknehmen
    { S.leer = false; S.mh = false; S.hand = false; S.plus = null;
      await p.evaluate(() => { localStorage.setItem('pl.mitte', '"3d"'); SICHT = 'bauteile'; return zeichne(); });
      await p.waitForSelector('#view .gm-d3 .b3 canvas', { timeout: 8000 }); await p.waitForSelector('#work [data-g3auf]', { timeout: 8000 }); await p.evaluate(() => { for (let k = 0; k < 9; k++) { const b = [...document.querySelectorAll('#work .g3-g:not(.auf) [data-g3auf]')][0]; if (!b) break; b.click(); } }); await p.waitForSelector('#work [data-g3e]', { timeout: 4000 });
      const a = await p.evaluate(() => ({ tab: !!document.querySelector('#view .gm-tab[hidden]'), modi: [...document.querySelectorAll('.b3-l [data-b3f]')].map((b) => b.textContent),
        liste: document.querySelectorAll('#work [data-g3e]').length, getrennt: !!document.querySelector('#work .g3-teil > .g3-oben') && !!document.querySelector('#work .g3-teil > .g3-tr') && !!document.querySelector('#work .g3-teil > .g3-li') }));
      pruef(a.tab && a.modi.join('|') === 'U-Wert|Änderungen|Maßnahmen' && a.liste === 2 && a.getrennt, `3D in der Mitte, nur drei Färbungen, Liste getrennt unter den Angaben: ${JSON.stringify(a)}`);
      await p.click('#work [data-g3e="11"]'); await p.waitForTimeout(250);
      { const w = await p.evaluate(() => ({ wahl: document.querySelector('.b3 canvas').dataset.wahl, det: !!document.querySelector('.sr-r [data-btz="f"]'), an: !!document.querySelector('#work .g3-e.an[data-g3e="11"]') }));
        pruef(w.wahl === '1' && w.det && w.an, `Klick in der Liste wählt im Modell und zeigt die Zeile: ${JSON.stringify(w)}`); }
      // Filter über der Liste (F1: „alle wählen“), Schieber unter „Darstellung ▾“
      pruef(await p.evaluate(() => !!document.querySelector('#work .g3-li .g3-fl .bpf-in') && !document.querySelector('.b3-l [data-b3o]') && !!document.querySelector('#work [data-g3alle]')), 'Filter und „alle wählen“ über der Liste, Schieber eingeklappt');
      await p.click('#work [data-g3alle]'); await p.waitForTimeout(300);
      pruef(await p.evaluate(() => document.querySelector('.b3 canvas').dataset.wahl === '2' && !!document.querySelector('#work .g3-oben [data-btz="f"]')), '„alle wählen“: beide im Modell gewählt, oben die Zeile (nur eine hat Bauteile)');
      if (process.env.BILD) await p.screenshot({ path: process.env.BILD });   // zum Ansehen: BILD=/tmp/gm.png node tools/tests/ui/gebaeudemodell.mjs
      await p.click('.b3-l [data-b3dar]'); await p.waitForSelector('.b3-l [data-b3o]');
      { await p.evaluate(() => { const r = document.querySelector('.b3-l [data-b3o]'); r.value = 60; r.dispatchEvent(new Event('input', { bubbles: true })); }); await p.waitForTimeout(150); }
      await p.click('#work .sr-tab[data-srt="aend"]'); await p.waitForSelector('#work [data-g3zeit]');
      await p.evaluate(() => { const r = document.querySelector('[data-g3zeit]'); r.value = -7; r.dispatchEvent(new Event('input', { bubbles: true })); }); await p.waitForTimeout(350);
      const z = await p.evaluate(() => ({ on: (document.querySelector('.b3-l [data-b3f].on') || {}).textContent, leg: document.querySelector('.b3-k').textContent, alt: document.querySelector('[data-g3a="3"]').classList.contains('alt') }));
      pruef(z.on === 'Änderungen' && /Wärmeschutz/.test(z.leg) && !z.alt, `Zeitschieber: Färbung Änderungen, je App: ${JSON.stringify(z)}`);
      { const r = await p.evaluate(() => { const a = document.querySelector('[data-g3a="3"]'), m = a.querySelector('.g3-am').getBoundingClientRect(), t = a.querySelector('.g3-at').getBoundingClientRect();
          return { unter: t.top >= m.bottom - 1, breit: t.width > a.getBoundingClientRect().width * 0.5, filter: !!document.querySelector('#work .g3-aend .g3-fl .bpf-in'), schieber: !!document.querySelector('#work .g3-aend .g3-ak [data-g3zeit]') }; });
        pruef(r.unter && r.breit && r.filter && r.schieber, `Änderung: Datum/App/Person über dem Text in voller Breite, Filter darüber: ${JSON.stringify(r)}`); }
      await p.click('[data-g3zur="3"]'); await p.waitForTimeout(250); pruef(S.zur, 'Zurücknehmen');
      await p.evaluate(() => [...document.querySelectorAll('#bfl button')].find((b) => /Tabelle/.test(b.textContent)).click()); await p.waitForSelector('table.bt-baum', { timeout: 4000 });
      pruef(await p.evaluate(() => !!document.querySelector('#view .gm-d3[hidden]')), 'Umschalten auf die Tabelle'); }
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
