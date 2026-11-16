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
  const L = () => ({ quelle: { name: 'Werkplanung', planstand: 1 }, raeume: [{ nr: '0.01', name: 'Wohnen', flaeche: 30, hoehe: 2.5, geschoss: 'EG' }, { nr: '0.02', name: 'Bad', flaeche: 6, hoehe: 2.5, geschoss: 'EG' }],
    elemente: [{ id: 11, nr: 'F 01', typ: 'Fenster', art: 'Fenster', geschoss: 'EG', raeume: ['0.01'], b: 1.26, h: 1.38, bruestung: 0.9, aussen: true }],
    zeilen: [zeile('raum:boden:trocken', S.status ? { status: S.status, berechnen: true } : {}), { ...zeile('f'), bereich: 'oeffnung', art: 'Fenster', kg: '334', name: 'Fenster', menge: 1.74, mitglieder: ['11'], nummern: ['F 01'], ids: [11], erlaubt: ['bleibt', 'erneuern', 'neu'] },
      ...(S.anw ? [{ ...zeile('raum:boden:trocken~ab'), abgeleitet: 'raum:boden:trocken', name: 'Böden – Estrich + Parkett, Mosaikparkett (0.01)', mitglieder: ['0.01'], menge: 30, status: 'erneuern', kurz: 'Estrich + Parkett, Mosaikparkett' }] : [])],
    anweisungen: S.anw ? [{ id: 'a1', text: S.anw, schritte: [{ material: 'Mosaikparkett', treffer: { name: 'Estrich + Parkett, Mosaikparkett' } }], wer: 'admin', wann: '2026-11-16T18:00' }] : [] });
  const M = () => ({ modell: { bauteilliste: L() }, rev: 4, staende: [] });
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
    if (pf === 'api/bp/modell/7') return J(M());
    return J(/liste|projekte|neuigkeit|kontakte/.test(pf) ? [] : {});
  });
  try {
    await p.addInitScript(() => { try { localStorage.setItem('bp.projekt', '7'); localStorage.removeItem('pl.sicht'); } catch { /* egal */ } });
    await p.goto('http://gm.test/'); await p.waitForSelector('table.bt-baum tr[data-btz="raum:boden:trocken"]', { timeout: 10000 });
    const a = await p.evaluate(() => ({ nav: [...document.querySelectorAll('#navL [data-pl]')].map((x) => x.textContent.trim()), bf: [...document.querySelectorAll('#bfl .bf-gt')].map((x) => x.textContent.trim()),
      tabs: [...document.querySelectorAll('.sr-tab')].map((x) => x.textContent.trim()), quer: document.documentElement.scrollWidth > innerWidth + 1, vm: !!document.querySelector('.gm-vm *') }));
    pruef(a.nav.join('|') === 'Bauteile|Fenster & Türen|Räume|3D-Ansicht|Assistent|Fragen|Verknüpfungen|Stände|Anweisungen|Gelerntes', `Navigation: ${a.nav.join('|')}`);
    pruef(['Neu', 'Planstand', 'KI', 'Ausgabe'].every((g) => a.bf.includes(g)), `Befehlsleiste: ${a.bf.join('|')}`);
    pruef(a.tabs.join('|') === 'Details|3D|Fragen', `Reiter rechts: ${a.tabs.join('|')}`);
    pruef(a.vm, 'Versionsmenü der Planstände in der Navigation fehlt');
    pruef(!a.quer, 'waagerechter Scrollbalken');
    await p.click('tr[data-btz="raum:boden:trocken"] td.baumz'); await p.waitForSelector('.sr-r [data-btz="raum:boden:trocken"] [data-btst="erneuern"]');
    await p.click('.sr-r [data-btst="erneuern"]'); await p.waitForTimeout(300);
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
    pruef(await p.evaluate(() => /F 01/.test(document.querySelector('#view').textContent) && /1,26/.test(document.querySelector('#view').textContent) && !document.querySelector('.sr-r .sr-tab')), 'Fenster & Türen: Nummer, Maße; ohne Bereich rechts');
    await p.click('#view tr[data-gmz="f"]'); await p.waitForSelector('table.bt-baum tr.akt[data-btz="f"]');
    await p.evaluate(() => document.querySelector('#navL [data-pl="raeume"]').click()); await p.waitForSelector('#view tr[data-gmz]');
    pruef(await p.evaluate(() => /Wohnen/.test(document.querySelector('#view').textContent)), 'Räume');
  } catch (e) { fehler.push('bricht ab – ' + String(e.message).split('\n')[0]); }
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
