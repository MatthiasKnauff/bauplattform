// Gebäudemodell wie alle Apps (GO 16.11.2026): Navigation (Modell · Planung · Projekt), Befehlsleiste mit Rückgängig, Neu, Planstand, KI, Ausgabe;
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
    if (pf === 'api/bp/modell/7/planstaende') return J({ planstaende: [{ id: 1, name: 'Werkplanung', erstellt: '2026-11-16' }], gilt: 1 });
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
    if (pf === 'api/bp/modell/einst') return J({ a: 'a1', b: 'b1', c: 'c2', d: 'd2', e: 'e1', f: 'f1' });
    if (pf === 'api/bp/modell/7') return J(M());
    return J(/liste|projekte|neuigkeit|kontakte/.test(pf) ? [] : {});
  });
  try {
    await p.addInitScript(() => { try { localStorage.setItem('bp.projekt', '7'); localStorage.removeItem('pl.sicht'); if (!localStorage.getItem('pl.mitte')) localStorage.setItem('pl.mitte', '"tabelle"'); } catch { /* egal */ } });
    await p.goto('http://gm.test/'); await p.waitForSelector('table.bt-baum tr[data-btz="raum:boden:trocken"]', { timeout: 10000 });
    const a = await p.evaluate(() => ({ nav: [...document.querySelectorAll('#navL [data-pl]')].map((x) => x.textContent.trim()), bf: [...document.querySelectorAll('#bfl .bf-gt')].map((x) => x.textContent.trim()),
      tabs: [...document.querySelectorAll('.sr-tab')].map((x) => x.textContent.trim()), quer: document.documentElement.scrollWidth > innerWidth + 1, vm: !!document.querySelector('.gm-vm *') }));
    pruef(a.nav.join('|') === 'Bauteile|Fenster & Türen|Räume|Fragen und Antworten|Verknüpfungen|Anweisungen|Gelerntes', `Navigation: ${a.nav.join('|')}`);
    pruef(['Neu', 'Planstand', 'KI', 'Ausgabe'].every((g) => a.bf.includes(g)), `Befehlsleiste: ${a.bf.join('|')}`);
    pruef(a.tabs.join('|') === 'Bauteil|Änderungen|Fragen und Antworten|Planung', `Reiter rechts: ${a.tabs.join('|')}`);
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
    // Anweisung: Vorschau mit Rückfrage → Eintrag wählen → anwenden → abgeleitete Zeile; Rückgängig nimmt sie zurück
    await p.evaluate(() => [...document.querySelectorAll('#bfl button')].find((b) => /Anweisung/.test(b.textContent)).click());
    await p.waitForSelector('[data-awt]'); await p.fill('[data-awt]', 'Alle Räume im EG Mosaikparkett geölt'); await p.click('[data-m="verstehen"]');
    await p.waitForSelector('[data-m="k:0:0"]');
    pruef(await p.evaluate(() => document.querySelector('[data-m="ok"]').disabled), 'Anwenden vor der Wahl im Katalog darf nicht gehen');
    await p.click('[data-m="k:0:0"]'); await p.click('[data-m="ok"]'); await p.waitForSelector('tr[data-btz="raum:boden:trocken~ab"]');
    pruef(S.anwB && S.anwB.schritte[0].treffer.vorlage === '353.02', `Anwenden mit Treffer: ${JSON.stringify(S.anwB)}`);
    await p.keyboard.press('Control+z'); await p.waitForTimeout(400);
    pruef(S.weg === 1, 'Rückgängig nimmt die Anweisung zurück');
    // Fenster & Türen, Räume
    await p.evaluate(() => document.querySelector('#navL [data-pl="fenster"]').click()); await p.waitForSelector('#view tr[data-gmz]');
    pruef(await p.evaluate(() => /F 01/.test(document.querySelector('#view').textContent) && /1,26/.test(document.querySelector('#view').textContent) && [...document.querySelectorAll('.sr-tab, .sr-auf')].map((x) => x.textContent.trim()).join('|') === 'Planung'), 'Fenster & Türen: Nummer, Maße; rechts nur der Reiter „Planung“');
    await p.click('#view tr[data-gmz="f"]'); await p.waitForSelector('table.bt-baum tr.akt[data-btz="f"]');
    await p.evaluate(() => document.querySelector('#navL [data-pl="raeume"]').click()); await p.waitForSelector('#view tr[data-gmz]');
    pruef(await p.evaluate(() => /Wohnen/.test(document.querySelector('#view').textContent)), 'Räume');
    await p.fill('[data-gmrn="EG.03"]', 'Kind'); await p.press('[data-gmrn="EG.03"]', 'Tab'); await p.waitForTimeout(300);   // ermittelter Raum: Namen vergeben
    pruef(S.rn === 'Kind' && await p.evaluate(() => document.querySelector('[data-gmrn="EG.03"]').value === 'Kind' && /ermittelt/.test(document.querySelector('#view').textContent)), `Raum benennen: ${S.rn}`);
    pruef(a.tabs.includes('Planung') && !a.nav.includes('Assistent'), `Assistent rechts als Reiter „Planung“: ${a.tabs.join('|')}`);
    S.hand = true; await p.evaluate(() => document.querySelector('#navL [data-pl="fenster"]').click()); await p.evaluate(() => document.querySelector('#navL [data-pl="raeume"]').click());   // ohne Plan: Arbeitsmaske
    await p.waitForSelector('#view .gm-mask [data-gmh="0:flaeche"]');
    await p.fill('#view [data-gmh="0:flaeche"]', '31,5'); await p.press('#view [data-gmh="0:flaeche"]', 'Tab'); await p.waitForTimeout(300);
    pruef(S.handPut && S.handPut.raeume && S.handPut.raeume[0].flaeche === 31.5, `Arbeitsmaske speichert: ${JSON.stringify(S.handPut)}`);
    // derselbe Dialog wie im Reiter „Bauteile“ (bpBauteile.ausPlanung, Y1/Z1 17.11.2026): Mengen und Preise wählbar, Räume aufklappbar
    await p.click('#view [data-gmhvor]'); await p.waitForSelector('.modal [data-bta="m"]', { timeout: 8000 });
    pruef(await p.evaluate(() => document.querySelectorAll('.modal [data-bta]').length === 4), 'Mengen/Preise nicht wählbar');
    await p.click('.modal [data-m="raeume"]'); await p.waitForSelector('.modal [data-btan]');
    pruef(await p.evaluate(() => /1 Fenster/.test(document.querySelector('.modal').textContent)), 'Vorschlag des Assistenten zeigt Räume mit Fenstern');
    await p.click('.modal [data-m="x"]');
    {   // 20.11.2026: Zeilen von Hand lassen sich ändern und entfernen – Name rechts in den Details, im Baum Kontextmenü/F2/Entf; ein Klick auf die Zeile holt „Details“ nach vorn
      S.mh = true; S.hand = false; S.zeile = []; await p.setViewportSize({ width: 1500, height: 950 }); await p.click('#navL [data-pl="fenster"]'); await p.click('#navL [data-pl="bauteile"]'); await p.waitForSelector('table.bt-baum tr[data-btz="hand:1"]');
      await p.evaluate(() => seiteReiter('gm', 'fragen')); await p.waitForTimeout(200);
      await p.click('tr[data-btz="hand:1"] td.baumz'); await p.waitForSelector('.sr-r [data-btz="hand:1"] [data-btname]', { timeout: 4000 }).catch(() => {});
      pruef(await p.evaluate(() => { const t = document.querySelector('#work .sr-tab.on'); return t && t.dataset.srt === 'details' && !!document.querySelector('.sr-r [data-btz="hand:1"] [data-btweg]'); }), 'Zeile von Hand gewählt: „Details“ kommt nicht nach vorn');
      await p.fill('.sr-r [data-btz="hand:1"] [data-btname]', 'Trockenbauwand Diele'); await p.keyboard.press('Tab'); await p.waitForTimeout(250);
      pruef(S.zeile.some((b) => b.id === 'hand:1' && b.name === 'Trockenbauwand Diele'), 'Zeile von Hand: Name ändern geht nicht an den Kern – ' + JSON.stringify(S.zeile));
      await p.click('tr[data-btz="hand:1"] td.baumz'); await p.keyboard.press('Delete'); await p.waitForTimeout(300);
      pruef(S.zeile.some((b) => b.id === 'hand:1' && b.loeschen), 'Zeile von Hand: Entf im Baum entfernt nicht – ' + JSON.stringify(S.zeile));
      S.zeile = []; await p.click('tr[data-btz="f"] td.baumz'); await p.keyboard.press('Delete'); await p.waitForTimeout(200);
      pruef(!S.zeile.some((b) => b.loeschen), 'Entf entfernt ein Bauteil aus dem Plan');
      S.mh = false; }
    {   // 19.11.2026 (Bild „runter gerutscht“): ohne Bauteile steht die Tabelle gleich unter der Meldung – .bt-bl war auch die Klasse der Vorlagen-Blöcke (flex:1 je Teil)
      S.leer = true; await p.setViewportSize({ width: 1500, height: 950 }); await p.click('#navL [data-pl="bauteile"]'); await p.waitForSelector('.bt-bl .bp-leer', { timeout: 8000 });
      const g = await p.evaluate(() => ({ leer: Math.round(document.querySelector('.bt-bl .bp-leer').getBoundingClientRect().bottom), tab: Math.round(document.querySelector('.bt-bw').getBoundingClientRect().top) }));
      pruef(g.tab - g.leer < 60, `ohne Bauteile: Tabelle rutscht nach unten – ${JSON.stringify(g)}`); S.leer = false; }
    {   // GO 20.11.2026 (Mock „Gebäudemodell ergänzen“ A1 C1): mit Plan ergänzen – „Neu“ der Befehlsleiste legt an, was die Ansicht zeigt;
      // die Zeile steht gelb mit Feldern neben denen aus dem Plan, Art als Auswahlliste, 🗑 entfernt
      S.mh = false; S.hand = false; S.plus = null; await p.click('#navL [data-pl="fenster"]'); await p.waitForSelector('#view table.gm-l');
      const kn = () => p.evaluate(() => { const g = [...document.querySelectorAll('#bfl .bf-g, #bfl [data-bfg]')].find((x) => /^Neu/.test(x.textContent.trim())); const b = [...document.querySelectorAll('#bfl button')].find((x) => /Fenster \/ Tür|Raum|Zeile/.test(x.textContent) && !/Bereich/.test(x.textContent)); return b ? b.textContent.trim() + (b.disabled ? ' (aus)' : '') : (g ? g.textContent : ''); });
      pruef(/Fenster \/ Tür/.test(await kn()) && !/aus/.test(await kn()), `Fenster & Türen: „Neu“ heißt nicht „Fenster / Tür“ – ${await kn()}`);
      pruef(await p.evaluate(() => !document.querySelector('#view [data-gmhneu]') && /Herkunft/.test(document.querySelector('#view table.gm-l thead').textContent) && /Plan/.test(document.querySelector('#view table.gm-l tbody tr[data-gmz] .gm-her').textContent)), 'Liste mit Plan: Spalte „Herkunft“ fehlt oder Knopf unter der Tabelle ist noch da');
      await p.evaluate(() => [...document.querySelectorAll('#bfl button')].find((x) => /Fenster \/ Tür/.test(x.textContent)).click()); await p.waitForSelector('#view tr.gm-plus [data-gmh="0:b"]');
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
      await p.click('#navL [data-pl="raeume"]'); await p.waitForSelector('#view table.gm-l');
      pruef(/Raum/.test(await kn()), `Räume: „Neu“ heißt nicht „Raum“ – ${await kn()}`);
      await p.evaluate(() => [...document.querySelectorAll('#bfl button')].find((x) => /^\s*Raum\s*$/.test(x.textContent) || /Raum$/.test(x.textContent.trim())).click()); await p.waitForSelector('#view tr.gm-plus [data-gmh="0:name"]');
      pruef(S.plusPut.raeume && S.plusPut.raeume[0].nr === 'EG.01' && S.plusPut.raeume[0].geschoss === 'EG', `Raum ergänzt: ${JSON.stringify(S.plusPut.raeume)}`);
      S.plus = null; await p.click('#navL [data-pl="bauteile"]'); await p.waitForSelector('table.bt-baum');
      pruef(/Zeile/.test(await kn()), `Bauteile: „Neu“ heißt nicht „Zeile“ – ${await kn()}`);
    }
    // Seite „Bauteile“ mit großem 3D (20.11.2026): Mitte 3D, rechts Bauteil + Liste einzeln, Änderungen mit Zeitschieber und Zurücknehmen
    { S.leer = false; S.mh = false; S.hand = false; S.plus = null;
      await p.evaluate(() => { localStorage.setItem('pl.mitte', '"3d"'); }); await p.click('#navL [data-pl="fenster"]'); await p.click('#navL [data-pl="bauteile"]');
      await p.waitForSelector('#view .gm-d3 .b3 canvas', { timeout: 8000 }); await p.waitForSelector('#work [data-g3auf]', { timeout: 8000 }); await p.evaluate(() => { for (let k = 0; k < 9; k++) { const b = [...document.querySelectorAll('#work .g3-g:not(.auf) [data-g3auf]')][0]; if (!b) break; b.click(); } }); await p.waitForSelector('#work [data-g3e]', { timeout: 4000 });
      const a = await p.evaluate(() => ({ tab: !!document.querySelector('#view .gm-tab[hidden]'), modi: [...document.querySelectorAll('.b3-l [data-b3f]')].map((b) => b.textContent),
        liste: document.querySelectorAll('#work [data-g3e]').length, knopf: [...document.querySelectorAll('#bfl button')].some((b) => /Tabelle/.test(b.textContent)) }));
      pruef(a.tab && a.knopf && ['Bauteilart', 'Gleiche Bauteile', 'Material', 'Änderungen', 'U-Wert'].every((m) => a.modi.includes(m)) && a.liste === 2, `3D in der Mitte, Färbungen, Liste einzeln: ${JSON.stringify(a)}`);
      await p.click('#work [data-g3e="11"]'); await p.waitForTimeout(250)
      { const w = await p.evaluate(() => ({ wahl: document.querySelector('.b3 canvas').dataset.wahl, det: !!document.querySelector('.sr-r [data-btz="f"]'), an: !!document.querySelector('#work .g3-e.an[data-g3e="11"]') }));
        pruef(w.wahl === '1' && w.det && w.an, `Klick in der Liste wählt im Modell und zeigt die Zeile: ${JSON.stringify(w)}`); }
      await p.click('#work .sr-tab[data-srt="aend"]'); await p.waitForSelector('#work [data-g3zeit]');
      await p.evaluate(() => { const r = document.querySelector('[data-g3zeit]'); r.value = -7; r.dispatchEvent(new Event('input', { bubbles: true })); }); await p.waitForTimeout(350);
      const z = await p.evaluate(() => ({ on: (document.querySelector('.b3-l [data-b3f].on') || {}).textContent, leg: document.querySelector('.b3-k').textContent, alt: document.querySelector('[data-g3a="3"]').classList.contains('alt') }));
      pruef(z.on === 'Änderungen' && /Wärmeschutz/.test(z.leg) && !z.alt, `Zeitschieber: Färbung Änderungen, je App: ${JSON.stringify(z)}`);
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
