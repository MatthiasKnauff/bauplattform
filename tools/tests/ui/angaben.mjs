// Bauantrag – Schritt „Angaben der Vordrucke“ (bauantrag-angaben.js): Ablauftest im echten Browser mit nachgebildetem Server.
// Geprüft: Liste mit Antragsfeld (⇄ Quelle) und Angaben, Zähler, „Nur offene zeigen“, Eintragen schickt PUT …/angaben und legt ein
// Rückgängig ab, Kästchen-Angabe, Felder der Behörde unten eingeklappt, Antragsfeld ändern geht über PUT /api/antraege/<id>; kein Skriptfehler.
//
// Aufgerufen aus oberflaeche.mjs:  const fehler = await angabenPruefen(browser, repoWurzel)   – allein: node tools/tests/ui/angaben.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

export async function angabenPruefen(browser, repo) {
  const KASTEN = path.join(repo, 'shared/bpcore/head'), STAT = path.join(repo, 'plattform/static');
  const BK = /BAUKASTEN = \(([^)]*)\)/.exec(fs.readFileSync(path.join(repo, 'shared/bpcore/head.py'), 'utf8'))[1].match(/"[^"]+"/g).map((s) => s.slice(1, -1));
  const baukasten = 'void 0;\n' + BK.map((f) => fs.readFileSync(path.join(KASTEN, f), 'utf8')).join('\n;\n');
  const fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } }), p = await ctx.newPage();
  p.on('pageerror', (e) => fehler.push('Fehler im Skript – ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) fehler.push('Konsole – ' + m.text().slice(0, 200)); });
  const SCHR = [['verfahren', 'Verfahren & Formulare'], ['beteiligte', 'Beteiligte'], ['grundstueck', 'Grundstück'], ['vorhaben', 'Vorhaben & Kenndaten'], ['angaben', 'Angaben der Vordrucke'], ['bauvorlagen', 'Bauvorlagen'], ['pruefen', 'Prüfen & PDF']];
  const S = { A: {}, puts: [], felder: [], bh: 'Familie Muster', bv: [], abg: [], druck: false, ph: true };
  const FELDER = [...fs.readFileSync(path.join(repo, 'shared/bpcore/bauantrag.py'), 'utf8').matchAll(/^\s+\("(\w+)", "([^"]+)", "(\w+)", "(\w+)"/gm)].map((m) => ({ key: m[1], label: m[2], schritt: m[3], typ: m[4] }));
  const detail = () => ({ antrag: { id: 1, project_id: 7, name: 'Bauantrag', verfahren: 'baugenehmigung', land: 'NW', status: 'entwurf', erstellt: '', geaendert: 'g' + S.felder.length, von: '' },
    projekt: 'Testprojekt', felder: FELDER.map((x) => ({ ...x, optionen: [], hilfe: '', ziel: x.key === 'bauherr_name' ? 'Projektdaten' : '', pflicht: false, wert: x.key === 'bauherr_name' ? S.bh : '', quelle: x.key === 'bauherr_name' ? 'Projektdaten' : '', quelle_wert: '', quelle_name: '', eigen: false })),
    bauvorlagen: [{ key: 'grundrisse', name: 'Bauzeichnungen – Grundrisse 1:100', pflicht: true, status: 'da', dateien: [{ name: '101 Grundriss EG.pdf', pfad: 'a/101.pdf' }], auto: true, notiz: '' }], fehlt: { felder: [], bauvorlagen: [] }, schritte: SCHR, paket: [{ key: 'f1', art: 'vordruck', nr: 'I/2', titel: 'Bauantrag', felder: 4 }, { key: 'f2', art: 'vordruck', nr: '', titel: 'Baubeschreibung', felder: 2 }],
    gewaehlt: ['f1', 'f2'], haupt_nr: '', deckblatt: { an: true, punkte: [] }, anschreiben: { an: false, ausfertigungen: 3 }, version: null, anlagen: [{ id: 'bvd:1', art: 'datei', bv: 'grundrisse', pfad: 'a/101.pdf', text: 'Bauzeichnungen – Grundrisse 1:100', bezeichnung: 'Bauzeichnungen – Grundrisse 1:100', an: true, beilegen: S.druck, stand: 'bei', abschnitt: 3, format: { name: 'A1' } }],
    gliederung: [], abgabe: 'papier', packliste: 0, platzhalter: S.ph,
    stand_namen: { bei: 'liegt bei' }, druck_max: 'A3', formate: ['A4', 'A3', 'A2', 'A1', 'A0'], einreichungen: [] });
  const liste = () => { const z = (key, label, typ, extra = {}) => ({ key, art: 'angabe', label, typ, optionen: [], wert: S.A[key] ?? '', quelle: S.A[key] ? 'Antragsangabe am Projekt' : '', schritt: '', in: ['I/2 Bauantrag'], vordruck: 'f1', amt: false, nur_hier: false, ...extra });
    const Z = [{ key: 'f:bauherr_name', art: 'antrag', label: 'Bauherrschaft – Name / Firma', typ: 'text', optionen: [], wert: S.bh, quelle: 'Projektdaten', schritt: 'beteiligte', in: ['I/2 Bauantrag', 'Baubeschreibung'], vordruck: 'f1', amt: false },
      z('a:zahl_der_stellplaetze', 'Zahl der Stellplätze', 'text', { in: ['I/2 Bauantrag', 'Baubeschreibung'] }), z('a:heizung', 'Heizung mit Wärmepumpe', 'kreuz'),
      z('a:aktenzeichen', 'Aktenzeichen der Bauaufsicht', 'text', { amt: true })];
    const zaehl = Z.filter((x) => !x.amt), voll = (x) => x.wert === true || (typeof x.wert === 'string' && x.wert.trim());
    return { zeilen: Z, felder: 6, gefuellt: zaehl.filter(voll).length, offen: zaehl.filter((x) => !voll(x) && x.typ !== 'kreuz').length, vordrucke: [{ key: 'f1', titel: 'I/2 Bauantrag', felder: 4, platziert: 0 }, { key: 'f2', titel: 'Baubeschreibung', felder: 2, platziert: 0 }] }; };
  await p.route('http://portal.test/**', (r) => {
    const q = r.request(), pf = new URL(q.url()).pathname.replace(/^\//, ''), J = (o, st = 200) => r.fulfill({ status: st, contentType: 'application/json', body: JSON.stringify(o) });
    if (pf === 'bauantrag') return r.fulfill({ contentType: 'text/html', body: fs.readFileSync(path.join(STAT, 'bauantrag.html'), 'utf8') });
    if (pf === 'bp/baukasten.js') return r.fulfill({ contentType: 'text/javascript', body: baukasten });
    const f = pf.startsWith('bp/') ? path.join(KASTEN, pf.slice(3)) : pf.startsWith('static/') ? path.join(STAT, pf.slice(7)) : null;
    if (f) return fs.existsSync(f) ? r.fulfill({ contentType: f.endsWith('.css') ? 'text/css' : 'text/javascript', body: fs.readFileSync(f) }) : r.fulfill({ status: 404, body: '' });
    if (pf === 'api/me') return J({ ok: true, id: 1, name: 'admin', vorname: 'A', role: 'admin', admin: true, look: {} });
    if (pf === 'api/bp/kopf') return J({ conf: { apps: [], projekte: [] }, projekt: { id: 7, name: 'Testprojekt', adresse: '' } });
    if (pf === 'api/platform') return J({ apps: [], user: { name: 'admin', role: 'admin' }, projekte: [] });
    if (pf === 'api/bp/projekt') return J({ id: 7, name: 'Testprojekt', adresse: '' });
    if (pf === 'api/antraege') return J({ antraege: [{ id: 1, project_id: 7, name: 'Bauantrag', status: 'entwurf' }], projekte: [{ id: 7, name: 'Testprojekt' }], haupt: {} });
    if (pf === 'api/antraege/1/angaben' && q.method() === 'PUT') { const b = JSON.parse(q.postData()); S.puts.push(b); const alt = {};
      for (const [k, v] of Object.entries(b.werte)) { alt[k] = S.A[k] ?? null; if (v === null || v === '' || v === false) delete S.A[k]; else S.A[k] = v; }
      return J({ ...liste(), alt }); }
    if (pf === 'api/antraege/1/angaben') return J(liste());
    if (pf === 'api/antraege/1/bv_abgleich') { S.abg.push(1); return J(detail()); }
    if (pf === 'api/antraege/1/bv_druck') { const b = JSON.parse(q.postData()); S.bv.push(b); S.druck = !!b.druck; return J(detail()); }
    if (pf === 'api/antraege/1/abgabe' && q.method() === 'PUT') { const b = JSON.parse(q.postData()); S.bv.push(b); if ('platzhalter' in b) S.ph = b.platzhalter; return J(detail()); }
    if (pf === 'api/antraege/1' && q.method() === 'PUT') { const b = JSON.parse(q.postData()); S.felder.push(b); if (b.felder && 'bauherr_name' in b.felder) S.bh = b.felder.bauherr_name || 'Familie Muster'; return J(detail()); }
    if (pf === 'api/antraege/1') return J(detail());
    if (/(^|\/)api\//.test(pf)) return J(/katalog|liste|kontakte|neuigkeit|projekte|verlauf|fehler/.test(pf) ? [] : {});
    return r.fulfill({ status: 404, body: '' });
  });
  try {
    await p.goto('http://portal.test/bauantrag');
    await p.waitForSelector('[data-schritt="angaben"]', { timeout: 20000 });
    await p.click('[data-schritt="angaben"]');
    await p.waitForSelector('.ang-t', { timeout: 10000 });
    if (process.env.BILD) await p.screenshot({ path: process.env.BILD });   // zum Ansehen: BILD=/tmp/angaben.png node tools/tests/ui/angaben.mjs
    let b = await p.evaluate(() => ({ zeilen: [...document.querySelectorAll('.ang > .ang-t tbody tr')].map((x) => x.cells[0].textContent.trim()), kopf: document.querySelector('.ang-kopf').textContent,
      amt: (document.querySelector('.ang-amt summary') || {}).textContent || '', sync: (document.querySelector('.ang-t [data-angf]') || {}).value, stufe: document.querySelector('[data-schritt="angaben"] small').textContent }));
    pruef(b.zeilen.length === 3 && /Stellplätze/.test(b.zeilen[0]), `Zeilen (offene zuerst): ${JSON.stringify(b.zeilen)}`);
    pruef(/2 Vordrucke/.test(b.kopf) && /1 offen/.test(b.kopf), `Kopf: ${b.kopf}`);
    pruef(/Behörde.*\(1\)/.test(b.amt), `Felder der Behörde unten: ${b.amt}`);
    pruef(b.sync === 'Familie Muster', `Antragsfeld in der Liste: ${b.sync}`);
    pruef(/1 offen/.test(b.stufe), `Stufe zählt die offenen Angaben nicht: ${b.stufe}`);
    await p.click('[data-angnur]');
    pruef(await p.evaluate(() => document.querySelectorAll('.ang > .ang-t tbody tr').length) === 1, '„Nur offene zeigen“ zeigt nicht nur die offene Zeile');
    await p.fill('[data-ang="a:zahl_der_stellplaetze"]', '4'); await p.press('[data-ang="a:zahl_der_stellplaetze"]', 'Enter');
    await p.waitForFunction(() => /nichts offen/.test(document.querySelector('.ang-kopf').textContent), null, { timeout: 5000 });
    // eben gefüllt: die Zeile bleibt in „nur offene“ stehen (verschwindet nicht unter der Hand, 17.11.2026)
    pruef(await p.evaluate(() => { const r = document.querySelectorAll('.ang > .ang-t tbody tr'); return r.length === 1 && /Stellplätze/.test(r[0].textContent); }), 'gefüllte Zeile verschwindet in „nur offene“');
    await p.click('[data-angnur]');
    pruef(JSON.stringify(S.puts[0]) === JSON.stringify({ werte: { 'a:zahl_der_stellplaetze': '4' } }), `Eintragen schickt ${JSON.stringify(S.puts[0])}`);
    pruef(await p.evaluate(() => /Stellplätze/.test(document.body.textContent) && [...document.querySelectorAll('button,[role="button"]')].some((x) => /Rückgängig|Stellplätze/.test(x.title || x.textContent))), 'kein Rückgängig für die Angabe');
    await p.click('[data-angk="a:heizung"]');
    for (let i = 0; i < 40 && S.puts.length < 2; i++) await p.waitForTimeout(50);
    pruef(JSON.stringify(S.puts[1]) === JSON.stringify({ werte: { 'a:heizung': true } }), `Kästchen schickt ${JSON.stringify(S.puts[1])}`);
    await p.waitForSelector('[data-angk="a:heizung"][aria-pressed="true"]', { timeout: 5000 });   // neu gezeichnet
    pruef(await p.evaluate(() => { const k = document.querySelector('.ang'); return k.scrollWidth <= k.clientWidth + 1; }), 'Liste breiter als die Karte (waagerechter Überlauf)');
    await p.fill('[data-angf="bauherr_name"]', 'Familie Beispiel'); await p.press('[data-angf="bauherr_name"]', 'Tab');
    for (let i = 0; i < 40 && !S.felder.length; i++) await p.waitForTimeout(50);
    pruef(S.felder.length === 1 && S.felder[0].felder.bauherr_name === 'Familie Beispiel', `Antragsfeld schickt ${JSON.stringify(S.felder)}`);
    await p.waitForTimeout(300);   // Antwort da, Rückgängig abgelegt
    await p.evaluate(() => document.activeElement && document.activeElement.blur());   // im Textfeld gehört Strg+Z dem Browser
    await p.keyboard.press('Control+z');
    for (let i = 0; i < 40 && S.felder.length < 2; i++) await p.waitForTimeout(50);
    pruef(S.felder.length === 2 && S.puts.length === 2, `Strg+Z setzt das Antragsfeld nicht zurück (${S.felder.length} Feld-, ${S.puts.length} Angaben-Aufrufe)`);
    // Schritt 6: an der Datei „drucken wir | nur nennen“, Platzhalterblatt-Haken (16.11.2026)
    await p.click('[data-schritt="bauvorlagen"]');
    await p.waitForSelector('[data-bvdr="bvd:1"][data-v="1"]', { timeout: 5000 });
    pruef(await p.evaluate(() => document.querySelector('[data-bvdr="bvd:1"][data-v=""]').classList.contains('on') && /A1/.test(document.querySelector('.ba-bv').textContent)), 'A1-Plan nicht auf „nur nennen“ oder ohne Format');
    pruef(await p.evaluate(() => document.querySelector('[data-bvph]').checked), 'Platzhalterblatt nicht vorgewählt');
    await p.click('[data-bvdr="bvd:1"][data-v="1"]');
    await p.waitForSelector('[data-bvdr="bvd:1"][data-v="1"].on', { timeout: 5000 });
    pruef(JSON.stringify(S.bv[0]) === JSON.stringify({ id: 'bvd:1', druck: true }), `drucken wir schickt ${JSON.stringify(S.bv[0])}`);
    await p.click('[data-bvph]');
    for (let i = 0; i < 40 && S.bv.length < 2; i++) await p.waitForTimeout(50);
    pruef(JSON.stringify(S.bv[1]) === JSON.stringify({ platzhalter: false }), `Platzhalter schickt ${JSON.stringify(S.bv[1])}`);
    pruef(!S.abg.length, 'Abgleich, obwohl alle Dateien schon als Anlagen stehen');
    // am Ende vor fehlenden Unterlagen warnen (17.11.2026): Pflicht rot, „falls nötig“ zum Prüfen, nachgereicht zur Kenntnis – im Einreichen-Dialog „Trotzdem eingereicht“
    const w = await p.evaluate(() => { D.bauvorlagen = [...D.bauvorlagen, { key: 'schnitte', name: 'Schnitte', pflicht: true, status: 'offen', dateien: [] }, { key: 'brand', name: 'Brandschutz', pflicht: false, status: 'offen', dateien: [] },
      { key: 'stat', name: 'Standsicherheit', pflicht: true, status: 'nachgereicht', dateien: [] }]; const h = bvWarnHtml(true); einreichenDialog(); const k = [...document.querySelectorAll('.modal-bg [data-m="ok"]')].pop().textContent;
      [...document.querySelectorAll('.modal-bg [data-m="x"]')].pop().click(); return { h, k }; });
    pruef(/ba-w-r.*Schnitte/s.test(w.h) && /ba-w-g.*Brandschutz/s.test(w.h) && /ba-w-i.*Standsicherheit/s.test(w.h), `Warnung fehlender Unterlagen: ${w.h.replace(/\s+/g, ' ').slice(0, 200)}`);
    pruef(w.k === 'Trotzdem eingereicht', `Einreichen trotz fehlender Unterlage: ${w.k}`);
  } catch (e) { fehler.push('bricht ab – ' + String(e.message).split('\n').slice(0, 3).join(' ')); }
  await ctx.close();
  return fehler;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await angabenPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
  await b.close(); console.log(f.length ? f.join('\n') : 'ok'); process.exit(f.length ? 1 : 0);
}
