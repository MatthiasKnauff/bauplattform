// LV-Nachverfolgung (17.11.2026, ava-nachverfolgen.js): Reiter unter Vergabe und Einstieg /ava/#nachverfolgen – alle versendeten LVs mit Bieter:innen.
// Die Ausschreibung läuft mit ihren echten Skripten; der Server ist nachgebildet. Geprüft: Einstieg über die Adresse, Kennzahlen, Filter „Stand“,
// „nur fällige Anrufe“, Zuklappen eines LV, „📞 angerufen“ schreibt über die Adresse des Versands (PUT /api/lv/<i>/versand).
// Aufgerufen aus oberflaeche.mjs – allein: node tools/tests/ui/nachverfolgen.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

export async function nachverfolgenPruefen(browser, repo) {
  const KASTEN = path.join(repo, 'shared/bpcore/head'), STAT = path.join(repo, 'plattform/static');
  const BK = /BAUKASTEN = \(([^)]*)\)/.exec(fs.readFileSync(path.join(repo, 'shared/bpcore/head.py'), 'utf8'))[1].match(/"[^"]+"/g).map((s) => s.slice(1, -1));
  const baukasten = 'void 0;\n' + BK.map((f) => fs.readFileSync(path.join(KASTEN, f), 'utf8')).join('\n;\n');
  const heute = new Date().toISOString().slice(0, 10), in2 = new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10), vor = new Date(Date.now() - 3 * 864e5).toISOString().slice(0, 10);
  const B = (cid, name, rueck, naechst) => ({ contact_id: cid, name, email: `${name.split(' ')[0].toLowerCase()}@firma.test`, rueck, telefon: '0201 1', bis: '', naechst: naechst || '', versendet: '10.11.2026', anrufe: 0,
    letzt: { t: '2026-11-10T09:00', weg: 'mail' }, faellig: !!naechst && naechst <= heute && ['', 'zusage'].includes(rueck) });
  const D = { heute, lvs: [
    { lv_id: 2, nr: '02', name: 'Garten', gewerk: 'GaLaBau', pid: 1, projekt: 'A481 Tierheim', mein: true, abgabe: in2 + 'T12:00', rueckmeldung: '', verschickt: '10.11.2026 09:00', stand: 'laufend', vergeben: false, da: 0, zusage: 1, absage: 0,
      bieter: [B(11, 'Classen Galabau', 'zusage'), B(12, 'Plassmann GmbH', '', heute), B(13, 'Assenmacher GmbH', '', heute)] },
    { lv_id: 5, nr: '01', name: 'Abbruch', gewerk: 'Abbruch', pid: 2, projekt: 'A484 Wohnhaus', mein: true, abgabe: vor, rueckmeldung: '', verschickt: '28.10.2026 09:00', stand: 'frist', vergeben: false, da: 1, zusage: 0, absage: 0,
      bieter: [B(21, 'Abriss AG', 'angebot'), B(22, 'Bagger KG', '')] }] };
  const puts = [];
  const antwort = (u, m, body) => {
    const p = u.pathname.replace(/^\/ava\//, '');
    if (p === 'api/me') return { id: 1, name: 'admin', role: 'admin', admin: true, look: {} };
    if (p === 'api/platform') return { apps: [], user: { name: 'admin', role: 'admin' }, projekte: [{ id: 1, name: 'A481 Tierheim' }] };
    if (p === 'api/projekte') return [{ id: 1, name: 'A481 Tierheim', archived: false }];
    if (p === 'api/nachverfolgen') return D;
    if (/^api\/lv\/\d+\/versand$/.test(p)) { if (m === 'PUT') puts.push({ p, body }); return { bieter: [{ contact_id: 12, anrufe: [] }] }; }
    if (p === 'api/lv') return [];
    return /versionen|kontakte|katalog$|eingang|fehler|neuigkeit|baukosten/.test(p) ? [] : {};
  };
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } }), pg = await ctx.newPage(), fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  pg.on('pageerror', (e) => fehler.push('JavaScript-Fehler: ' + String(e.message || e).split('\n')[0]));
  await pg.route('http://ava.test/**', (r) => {
    const u = new URL(r.request().url()), pf = u.pathname.replace(/^\/ava\//, '');
    if (pf === '') return r.fulfill({ contentType: 'text/html', body: fs.readFileSync(path.join(STAT, 'ava.html'), 'utf8') });
    if (pf === 'bp/baukasten.js') return r.fulfill({ contentType: 'text/javascript', body: baukasten });
    const f = pf.startsWith('bp/') ? path.join(KASTEN, pf.slice(3)) : pf.startsWith('static/') ? path.join(STAT, pf.slice(7)) : null;
    if (f) return fs.existsSync(f) ? r.fulfill({ contentType: f.endsWith('.css') ? 'text/css' : 'text/javascript', body: fs.readFileSync(f) }) : r.fulfill({ status: 404, body: '' });
    if (pf.startsWith('api/')) { let b = null; try { b = JSON.parse(r.request().postData() || 'null'); } catch { /* egal */ } return r.fulfill({ contentType: 'application/json', body: JSON.stringify(antwort(u, r.request().method(), b)) }); }
    return r.fulfill({ status: 404, body: '' });
  });
  try {
    await pg.addInitScript(() => { try { localStorage.setItem('ava.mobilAus', '1'); } catch { /* egal */ } });
    await pg.goto('http://ava.test/ava/#nachverfolgen');
    await pg.waitForSelector('#nvSeite table.nv-t', { timeout: 20000 });
    const bild = () => pg.evaluate(() => ({ lvs: [...document.querySelectorAll('#nvSeite tr.nv-lv')].map((x) => x.dataset.nvlv), bieter: document.querySelectorAll('#nvSeite tr.nv-b').length,
      z: document.querySelector('#nvSeite .nv-z').textContent.replace(/\s+/g, ' '), titel: (document.querySelector('#phT') || {}).textContent || '' }));
    let v = await bild();
    pruef(v.lvs.join() === '2' && v.bieter === 3, `Vorgabe „laufend“: nur LV 02 mit 3 Bieter:innen – ${JSON.stringify(v)}`);
    pruef(/2 Anrufe fällig/.test(v.z) && /1 Abgabe in ≤ 3 Tagen/.test(v.z) && /2 LVs unterwegs/.test(v.z) && /1 \/ 5 Angebote da/.test(v.z), `Kennzahlen: ${v.z}`);
    pruef(/Nachverfolgen/.test(v.titel), `Titel: ${v.titel}`);
    {   // 21.11.2026: Navigation bis ganz unten, das Ablegefeld springt beim Aufklappen der Navigation nicht
      const h = () => pg.evaluate(() => ({ unten: Math.round(document.querySelector('#navL').getBoundingClientRect().bottom), ih: innerHeight, feld: Math.round(document.querySelector('.nfuss .ava-drop').getBoundingClientRect().height) }));
      const a = await h(); if (process.env.BILD) await pg.screenshot({ path: process.env.BILD });
      await pg.mouse.move(20, 300); await pg.waitForTimeout(500); const b = await h(); if (process.env.BILD) await pg.screenshot({ path: process.env.BILD.replace('.png', '-2.png') });
      await pg.mouse.move(900, 600); await pg.waitForTimeout(400);
      pruef(a.ih - a.unten < 4 && Math.abs(a.feld - b.feld) < 3, `Navigation bis unten, Ablegefeld gleich hoch (zu/auf): ${JSON.stringify([a, b])}`); }
    // Einstieg über die Kachel (19.11.2026): Navigation gelöst (nur Symbole), die gemerkte Wahl bleibt
    const nl = await pg.evaluate(() => ({ jetzt: window.bpNav && bpNav.lage(), gemerkt: localStorage.getItem('bp.navlage') }));
    pruef(nl.jetzt === 'frei' && nl.gemerkt !== 'frei', `Navigation beim Einstieg nicht gelöst oder Wahl überschrieben: ${JSON.stringify(nl)}`);
    await pg.click('[data-nvf="alle"]'); v = await bild();
    pruef(v.lvs.join() === '2,5', `„alle“: beide LVs – ${v.lvs}`);
    await pg.click('[data-nvanrufe]'); v = await bild();
    pruef(v.lvs.join() === '2' && v.bieter === 2, `„nur fällige Anrufe“: LV 02 mit 2 Firmen – ${JSON.stringify(v)}`);
    await pg.click('[data-nvanrufe]');
    await pg.click('tr.nv-lv[data-nvlv="5"] td:nth-child(2)'); v = await bild();
    pruef(v.bieter === 3, `LV 01 zugeklappt: noch 3 Firmen sichtbar – ${v.bieter}`);
    await pg.click('tr.nv-b[data-nvcid="12"] [data-nvanruf]'); await pg.waitForTimeout(300);
    pruef(puts.length === 1 && puts[0].p === 'api/lv/2/versand' && puts[0].body.bieter['12'].anruf === 'angerufen', `„📞 angerufen“ über den Versand: ${JSON.stringify(puts)}`);
    await pg.screenshot({ path: '/tmp/nachverfolgen.png' });
  } catch (e) { fehler.push('Prüfung bricht ab – ' + String(e.message).split('\n')[0]); }
  await ctx.close();
  return fehler;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await nachverfolgenPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
  await b.close(); console.log(f.length ? f.join('\n') : 'ok'); process.exit(f.length ? 1 : 0);
}
