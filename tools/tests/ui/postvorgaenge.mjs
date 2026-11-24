// Post & Vorgänge (24.11.2026, Mock „Post & Vorgänge“ PV-1 … PV-10, Etappe 1): Aufgaben und Kommunikation sind EINE Seite.
// Geprüft mit nachgebildetem Server: (1) Navigation mit „Alles offen“ und „Verlauf“; ein Klick auf eine Art im Verlauf wechselt ohne Neuladen
// (die Seite bleibt dieselbe) und zeigt die Sendungen; (2) zurück zu „Alles offen“ ebenso ohne Neuladen; (3) alte Adressen #art=… und
// #kontakt=… landen im Verlauf; (4) „＋ Neu“ bietet Nachricht, Vorgang, Abnahme und Datei an; (5) Titel „Post & Vorgänge“.
// Etappe 2 (PV-4 B): (6) „Alles offen“ ist EINE Liste – ein Mangel steht darin, Klick zeigt rechts den Vorgang (Frist, Firma, Rüge);
// darunter „Zuletzt verschickt“; alte Adresse #maengel landet in „Alles offen“ mit der Auswahl „Mängel“.
// (7) Die Navigation bleibt beim Wechsel der Ansicht stehen (Suchfelder stehen im Inhalt, nicht in der Navigation); „Büro“ öffnet ohne Fehler.
// (8) Verschickte Rüge im Verlauf: das PDF lässt sich ansehen und „Erneut bearbeiten …“ holt die Eingaben (api/kom/<id>/eingabe).
//
// Aufgerufen aus oberflaeche.mjs:  const fehler = await postPruefen(browser, repoWurzel)   – allein: node tools/tests/ui/postvorgaenge.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

export async function postPruefen(browser, repo) {
  const KASTEN = path.join(repo, 'shared/bpcore/head'), STAT = path.join(repo, 'plattform/static');
  const BK = /BAUKASTEN = \(([^)]*)\)/.exec(fs.readFileSync(path.join(repo, 'shared/bpcore/head.py'), 'utf8'))[1].match(/"[^"]+"/g).map((s) => s.slice(1, -1));
  const baukasten = 'void 0;\n' + BK.map((f) => fs.readFileSync(path.join(KASTEN, f), 'utf8')).join('\n;\n');
  const fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  const KOM = { gesamt: 2, eintraege: [
    { id: 11, ts: '2026-11-20T11:30:00', art: 'planversand', art_name: 'Planversand', weg: 'mail', weg_name: 'E-Mail', contact_id: 5, kontakt: 'Rohbau Kaya', email: 'kaya@rohbau.test', name: 'Rohbau Kaya', project_id: 1, projekt: 'A497 Maybachstraße', betreff: '3 Pläne', inhalt: 'A497-101 c', von: 'Test', status: 'gesendet', fehler: '', link: 'plaene:#plaene' },
    { id: 12, ts: '2026-11-20T15:02:00', art: 'maengelruege', art_name: 'Mängelrüge', weg: 'mail', weg_name: 'E-Mail', contact_id: 5, kontakt: 'Rohbau Kaya', email: 'kaya@rohbau.test', name: 'Rohbau Kaya', project_id: 1, projekt: 'A497 Maybachstraße', betreff: 'Abdichtung Bad', inhalt: '1. Dichtschlämme', von: 'Test', status: 'gesendet', fehler: '', link: 'aufgaben:#maengel', dateien: [{ id: 31, name: 'Mängelrüge Rohbau Kaya.pdf', mime: 'application/pdf' }], eingabe: true }],
    kontakte: [{ contact_id: 5, email: '', name: 'Rohbau Kaya', ansprech: '', gewerk: 'Rohbau', n: 2, letzte: '2026-11-20T15:02:00' }], projekte: [],
    arten: [{ key: 'planversand', name: 'Planversand', n: 1 }, { key: 'maengelruege', name: 'Mängelrüge', n: 1 }] };

  const MAE = [{ id: 7, pid: 1, rid: 3, projekt: 'A497 Maybachstraße', text: 'Abdichtung Bad fehlt', art: 'maengel', art_n: 'Mangel', status: 'ueberfaellig', done: false, frist: '2026-11-20', firma: 'Rohbau Kaya', datum: '2026-11-10', fotos: 0 }];
  async function seite(hash) {
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } }), p = await ctx.newPage(), abfragen = [];
    p.on('pageerror', (e) => fehler.push(`#${hash}: JavaScript-Fehler: ` + String(e.message || e).split('\n')[0]));
    await p.route('http://pv.test/**', (r) => {
      const q = r.request(), u = new URL(q.url()), pf = u.pathname.replace(/^\//, '');
      if (pf === '') return r.fulfill({ contentType: 'text/html', body: fs.readFileSync(path.join(STAT, 'aufgaben.html'), 'utf8') });
      if (pf === 'bp/baukasten.js') return r.fulfill({ contentType: 'text/javascript', body: baukasten });
      const f = pf.startsWith('bp/') ? path.join(KASTEN, pf.slice(3)) : pf.startsWith('static/') ? path.join(STAT, pf.slice(7)) : null;
      if (f) return fs.existsSync(f) ? r.fulfill({ contentType: f.endsWith('.css') ? 'text/css' : 'text/javascript', body: fs.readFileSync(f) }) : r.fulfill({ status: 404, body: '' });
      abfragen.push(pf + u.search);
      const a = pf === 'api/me' ? { ok: true, id: 1, name: 'admin', vorname: 'Test', full: 'Test', is_admin: true, look: {} }
        : pf === 'api/platform' || pf === 'api/bp/kopf' ? { apps: [{ key: 'aufgaben', name: 'Post & Vorgänge', url: '/', allowed: true }], user: { name: 'admin' } }
        : pf === 'api/kom' ? KOM : pf === 'api/kom/kontakte' ? [{ id: 5, name: 'Rohbau Kaya', ansprech: '', email: 'kaya@rohbau.test', gewerk: 'Rohbau', n: 2 }]
        : pf === 'api/bauplattform/todo' ? { abschnitte: [{ titel: 'Wartet auf dich', warten: true, punkte: [{ id: 'p1', text: 'Probe', zeit: '' }] }], antworten: {} }
        : pf === 'api/kom/12/eingabe' ? { error: 'nur Probe' }
        : pf === 'api/maengel' ? MAE : pf === 'api/antworten' ? { antworten: [] } : pf === 'api/erinnerungen' ? { items: [], mail: true }
        : /maengel$|termine$|vorgaenge|projekte|briefe|benutzer|liste|neuigkeit/.test(pf) ? [] : pf === 'api/verzug' ? { vorgaenge: [] } : {};
      return r.fulfill({ contentType: 'application/json', body: JSON.stringify(a) });
    });
    await p.goto('http://pv.test/' + (hash ? '#' + hash : ''));
    await p.waitForFunction(() => window.PV && document.querySelector('#navL [data-ap]'), null, { timeout: 20000 });
    return { p, ctx, abfragen };
  }

  try {   // (1) (2) (5)
    const { p, ctx, abfragen } = await seite('offen');
    pruef(await p.title() === 'Post & Vorgänge', 'Titel soll „Post & Vorgänge“ heißen');
    const gr = await p.evaluate(() => [...document.querySelectorAll('#navL [data-ap]')].map((x) => x.dataset.ap));
    pruef(gr.includes('o:offen') && !gr.includes('o:maengel') && gr.includes('v:') && gr.includes('v:planversand'), 'Navigation: „Alles offen“ (statt Mängel, Termine …) und „Verlauf“ gehören in dieselbe Seite – ' + gr.join(' '));
    // (6) Alles offen: der Mangel steht in der Liste, Klick → Vorgang rechts
    await p.waitForSelector('#aoW #todo [data-tk="m:7"] .tt', { timeout: 10000 });
    pruef(await p.evaluate(() => /Mangel/.test(document.querySelector('#todo [data-tk="m:7"] .zt-a').textContent)), 'Alles offen: Mangel ohne Schild „Mangel“');
    await p.click('#todo [data-tk="m:7"] .tt');
    await p.waitForSelector('#aoW [data-m="7"] [data-f="frist"]', { timeout: 5000 });
    pruef(await p.evaluate(() => !!document.querySelector('#aoW [data-m="7"] [data-ruege]') && location.hash === '#offen'), 'Vorgang rechts: Mangel mit Frist und Mängelrüge erwartet');
    await p.waitForSelector('#aoW .ao-ver .ao-vz', { timeout: 5000 });
    await p.evaluate(() => { window.__gleich = 1; });
    pruef(await p.evaluate(() => !!document.querySelector('#aoW .ao-flt .bpf') && !document.querySelector('#navL .bpf, #navL input[type=search]')), 'Alles offen: Suchfeld gehört oben in die Liste, nicht in die Navigation');
    const lage = () => p.evaluate(() => document.querySelector('#navL [data-ap="v:planversand"]').getBoundingClientRect().top);
    const y0 = await lage();
    await p.click('#navL [data-ap="v:planversand"]');
    await p.waitForSelector('.pv #pvList .e', { timeout: 10000 });
    pruef(await p.evaluate(() => window.__gleich === 1), 'Wechsel in den Verlauf lädt die Seite neu');
    pruef(await p.evaluate(() => location.hash === '#post' && document.querySelectorAll('.pv #pvList details.e').length === 2), 'Verlauf: zwei Sendungen und #post in der Adresse erwartet');
    pruef(await p.evaluate(() => getComputedStyle(document.getElementById('scope')).visibility === 'hidden'), 'Im Verlauf gehört „Meine/Alle Projekte“ der Aufgaben nicht oben hin');
    pruef(Math.abs((await lage()) - y0) < 1, `Navigation springt beim Wechsel in den Verlauf (${y0} → ${await lage()})`);
    pruef(await p.evaluate(() => !!document.querySelector('.pv .pv-such input[type=search]')), 'Verlauf: Suchfeld oben im Verlauf fehlt');
    // (8) Rüge im Verlauf: PDF und „Erneut bearbeiten …“
    await p.evaluate(() => { document.querySelectorAll('.pv #pvList details.e').forEach((d) => { d.open = true; }); });
    pruef(await p.evaluate(() => !!document.querySelector('.pv [data-pvdat="31"]') && !!document.querySelector('.pv [data-pvneu="12"]')), 'Verlauf: verschickte Mängelrüge ohne PDF bzw. ohne „Erneut bearbeiten …“');
    await p.click('.pv [data-pvneu="12"]'); await p.waitForTimeout(400);
    pruef(abfragen.some((x) => x.startsWith('api/kom/12/eingabe')), '„Erneut bearbeiten …“ holt die Eingaben der Rüge nicht');
    // (7) Büro
    await p.click('#navL [data-ap="o:bauplattform"]');
    await p.waitForSelector('#view .bpt-flt .bpf', { timeout: 5000 });
    pruef(Math.abs((await lage()) - y0) < 1, 'Navigation springt beim Wechsel ins Büro');
    await p.click('#navL [data-ap="o:offen"]');
    await p.waitForFunction(() => !document.querySelector('.pv') && location.hash === '#offen' && document.querySelector('#aoW #todo'), null, { timeout: 10000 });
    pruef(await p.evaluate(() => window.__gleich === 1 && !PV.an()), 'Zurück zu „Alles offen“ lädt neu oder der Verlauf bleibt stehen');
    // (4)
    await p.click('#neuBtn'); await p.waitForSelector('.nw [data-m="nachricht"]', { timeout: 5000 });
    pruef(await p.evaluate(() => ['nachricht', 'vorgang', 'abnahme', 'datei'].every((k) => document.querySelector(`.nw [data-m="${k}"]`))), '„＋ Neu“: Nachricht, Vorgang, Abnahme und Datei fehlen');
    await ctx.close();
  } catch (e) { fehler.push('Post & Vorgänge: Prüfung bricht ab – ' + String(e.message).split('\n')[0]); }

  try {   // (3) alte Adressen der Kommunikation
    const { p, ctx } = await seite('art=maengelruege');
    await p.waitForSelector('.pv #pvList', { timeout: 10000 });
    pruef(await p.evaluate(() => location.hash === '#post' && PV.an()), '#art=… soll im Verlauf landen');
    await ctx.close();
    const k = await seite('kontakt=5');
    await k.p.waitForSelector('.pv .kb', { timeout: 10000 });
    pruef(await k.p.evaluate(() => /Rohbau Kaya/.test(document.querySelector('.pv .kb').textContent)), '#kontakt=… soll den Kontakt im Verlauf zeigen');
    pruef(k.abfragen.some((x) => /^api\/kom\?cid=5/.test(x)), '#kontakt=…: Sendungen des Kontakts werden nicht abgefragt');
    await k.ctx.close();
    const m = await seite('maengel');
    await m.p.waitForSelector('#aoW #todo [data-tk="m:7"]', { timeout: 10000 });
    pruef(await m.p.evaluate(() => location.hash === '#offen' && document.querySelector('#todo [data-ztf="mangel"].on')), '#maengel soll in „Alles offen“ mit der Auswahl „Mängel“ landen');
    await m.ctx.close();
  } catch (e) { fehler.push('Post & Vorgänge (alte Adressen): Prüfung bricht ab – ' + String(e.message).split('\n')[0]); }
  return fehler;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await postPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
  await b.close(); console.log(f.length ? f.join('\n') : 'ok'); process.exit(f.length ? 1 : 0);
}
