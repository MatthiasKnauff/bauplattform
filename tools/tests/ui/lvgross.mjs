// Großes LV (2.000 Zeilen, alles aufgeklappt) bleibt flüssig – Mess- und Ablauftest für die Ausschreibung im echten Browser.
// Die Seite läuft mit ihren echten Skripten aus dem Repository; nur die Antworten des Servers sind nachgebildet (ein Projekt, ein großes LV).
// Geprüft: nur ein Ausschnitt der Zeilen steht auf der Seite (bpBaum.fenster), Rollen baut nach, Getipptes bleibt erhalten, Tastatur läuft
// über den Ausschnitt hinaus, Pos1/Ende, neue Position, Langtext, Aufmaßprüfung – und Obergrenzen für Neuzeichnen, Tastendruck, Zeilenwechsel, Auf-/Zuklappen.
// Die Grenzen sind großzügig (langsame Maschine der Pipeline); vor dem Umbau am 13.11.2026 lagen die Werte beim 10- bis 40-Fachen.
//
// Aufgerufen aus oberflaeche.mjs:  const fehler = await lvGrossPruefen(browser, repoWurzel)   – allein: node tools/tests/ui/lvgross.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

const N = 2000, GRENZE = { render: 1200, klappen: 700, tippen: 150, zeile: 150 }, GRENZE_AM = 1000;

function lv(id, n) {
  const items = []; let t = 0, p = 0;
  for (let i = 0; items.length < n; i++) {
    if (i % 26 === 0) { t++; p = 0; items.push({ id: 't' + id + '_' + t, typ: 'titel', lvl: 1, kurz: 'Titel ' + t, oz: String(t).padStart(2, '0') }); continue; }
    p++; items.push({ id: 'p' + id + '_' + i, typ: 'pos', oz: String(t).padStart(2, '0') + '.' + String(p * 10).padStart(4, '0'), kurz: 'Position ' + i + ' Mauerwerk der Innenwand herstellen', lang: 'Langtext '.repeat(12), menge: (i % 17) + 1.5, einheit: 'm2', art: 'N', kg: '341', ep_s: 10 + (i % 90) });
  }
  const calc = { schaetzung: 1, ohne_schaetzung: 0, angebote: [], auftrag: 0, nachtraege: { beauftragt: 0, angemeldet: 0, abgelehnt: 0 }, aufmass: {}, leistung: 0, rechnungen: [], nicht_gezahlt: 0, abgerechnet: 0, sicherheit: { einbehalten: 0, freigegeben: 0, offen: 0 } };
  return { id, project_id: 1, projekt: 'Test', bk_id: null, nr: String(id).padStart(2, '0'), name: 'Rohbau ' + id, gewerk: 'Rohbauarbeiten', status: 'entwurf', archived: false, rev: 1, updated: '', updated_by: '', lv_weg: null, data: { items, meta: {} }, vergabe: {}, angebote: [], aufmass: [], rechnungen: [], calc, bilder: {}, dokumente: [], buergschaften: [] };
}

export async function lvGrossPruefen(browser, repo) {
  const KASTEN = path.join(repo, 'shared/bpcore/head'), STAT = path.join(repo, 'plattform/static');
  const BK = /BAUKASTEN = \(([^)]*)\)/.exec(fs.readFileSync(path.join(repo, 'shared/bpcore/head.py'), 'utf8'))[1].match(/"[^"]+"/g).map((s) => s.slice(1, -1));
  const baukasten = 'void 0;\n' + BK.map((f) => fs.readFileSync(path.join(KASTEN, f), 'utf8')).join('\n;\n');
  const LVS = { 1: lv(1, N), 2: lv(2, 40) };
  {   // drei Angebote für das große LV (Preisspiegel im LV-Format)
    const l = LVS[1], P = l.data.items.filter((x) => x.typ === 'pos');
    l.angebote = [1, 2, 3].map((a) => ({ id: a, contact_id: null, bieter: 'Bieter ' + a, eingang: '2026-11-01', preise: Object.fromEntries(P.map((x) => [x.id, x.ep_s * (1 + a / 20)])), nachlass: 0, nachlass_eur: 0, skonto: 0, skonto_tage: 0, data: {} }));
    l.calc.angebote = l.angebote.map((a, i) => ({ id: a.id, summe: 1000 + i, netto: 1000 + i, fehlt: 0, rang: i + 1 }));
  }
  const liste = () => Object.values(LVS).map((l) => ({ id: l.id, project_id: 1, nr: l.nr, name: l.name, gewerk: l.gewerk, status: l.status, archived: false, updated: '', n_pos: l.data.items.length, n_el: l.data.items.length, n_angebote: 0, auftragnehmer: '', schaetzung: 1, auftrag: 0, nachtraege: 0, nt_angemeldet: 0, n_nt: 0, leistung: 0, prognose: 1, abgerechnet: 0, min_angebot: 0, vergeben: false, frei: false, angebot_id: null, aufgehoben: null, ohne_lv: false, ohne_auftrag: false, kg: '', lv_weg: null, angebote: [], rechnungen: [] }));
  const antwort = (u, m) => {
    const p = u.pathname.replace(/^\/ava\//, ''), q = u.searchParams;
    if (p === 'api/me') return { id: 1, name: 'admin', role: 'admin', admin: true, look: {} };
    if (p === 'api/platform') return { apps: [], user: { name: 'admin', role: 'admin' }, projekte: [{ id: 1, name: 'Test' }] };
    if (p === 'api/projekte') return [{ id: 1, name: 'Test', archived: false }];
    if (p === 'api/lv') return q.get('id') ? liste().filter((x) => x.id === +q.get('id')) : liste();
    const mm = /^api\/lv\/(\d+)$/.exec(p);
    if (mm) { const l = LVS[+mm[1]]; if (m === 'PUT') { l.rev++; return { rev: l.rev, calc: l.calc, vergabe: {}, status: l.status, name: l.name, nr: l.nr, gewerk: l.gewerk, archived: false, data: l.data }; } return l; }
    if (/^api\/angebote\/\d+$/.test(p)) return LVS[1];
    if (/vergabedok$/.test(p)) return { status: {}, arten: {}, dokumente: [] };
    if (/^api\/lv\/\d+\/versand$/.test(p)) { const T = { betreff: 'Angebotsanfrage {lv}', text: '{anrede}\n\nbitte um Angebot.' };
      return { abgabe: '', rueckmeldung: '', vorschlaege: [], laeufe: [], unterlagen: [], project_id: 1, ohne_x83: false, namen: { pdf: 'LV.pdf', x83: 'LV.x83' }, vorlage: T, standard: { versand: T, erinnerung: T, nachversand: T }, texte: {}, lv_verschickt: '', lv_geaendert: false,
        bieter: [1, 2].map((n) => ({ contact_id: n, name: 'Bieter ' + n, trade: 'Rohbau', city: '', adressen: [], email: `b${n}@firma.test`, anrede: '', anrede_hand: false, versendet: '', rueck: '', notiz: '', grund: '', bis: '', naechst: '', todo_id: null, anrufe: [], telefon: '', texte: {}, verlauf: [] })) }; }
    return /versionen|kontakte|katalog$|eingang|fehler|neuigkeit/.test(p) ? [] : {};
  };
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } }), p = await ctx.newPage(), fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  p.on('pageerror', (e) => fehler.push('JavaScript-Fehler: ' + String(e.message || e).split('\n')[0]));
  const art = (f) => (f.endsWith('.css') ? 'text/css' : 'text/javascript');
  await p.route('http://ava.test/**', (r) => {
    const u = new URL(r.request().url()), pf = u.pathname.replace(/^\/ava\//, '');
    if (pf === '') return r.fulfill({ contentType: 'text/html', body: fs.readFileSync(path.join(STAT, 'ava.html'), 'utf8') });
    if (pf === 'bp/baukasten.js') return r.fulfill({ contentType: 'text/javascript', body: baukasten });
    const f = pf.startsWith('bp/') ? path.join(KASTEN, pf.slice(3)) : pf.startsWith('static/') ? path.join(STAT, pf.slice(7)) : null;
    if (f) return fs.existsSync(f) ? r.fulfill({ contentType: art(f), body: fs.readFileSync(f) }) : r.fulfill({ status: 404, body: '' });
    if (pf.startsWith('api/')) return r.fulfill({ contentType: 'application/json', body: JSON.stringify(antwort(u, r.request().method())) });
    return r.fulfill({ status: 404, body: '' });
  });
  try {
    await p.addInitScript(() => { try { localStorage.setItem('ava.mobilAus', '1'); } catch { /* egal */ } });
    await p.goto('http://ava.test/ava/');
    await p.waitForSelector('#view table', { timeout: 20000 });
    await p.evaluate(() => document.querySelector('[data-tab="lv"]').click()); await p.waitForSelector('#view table.lv.baum tr[data-i]', { timeout: 20000 });
    await p.evaluate(() => { LVZU.setze([]); render();   // alles aufklappen
      window.bild = () => new Promise((r) => requestAnimationFrame(() => { const c = new MessageChannel(); c.port1.onmessage = () => r(); c.port2.postMessage(0); }));
      window.mess = async (f, n = 5) => { const T = []; for (let i = 0; i < n; i++) { const t = performance.now(); await f(i); await bild(); T.push(performance.now() - t); await bild(); } T.sort((a, b) => a - b); return Math.round(T[Math.floor(T.length / 2)]); }; });
    await p.waitForTimeout(500);
    const st = () => p.evaluate(() => { const R = [...document.querySelectorAll('#view table.lv.baum tbody tr[data-bpk]')]; return { n: R.length, von: R.length ? +R[0].dataset.bpk : -1, bis: R.length ? +R[R.length - 1].dataset.bpk : -1, dom: document.querySelectorAll('*').length }; });
    let s = await st();
    pruef(s.n > 20 && s.n < 400, `Ausschnitt: zwischen 20 und 400 Zeilen auf der Seite erwartet, sind ${s.n} (von ${N})`);
    pruef(s.dom < 15000, `Seite hat ${s.dom} Elemente – erwartet unter 15.000`);
    // Zeiten
    const T = {};
    T.render = await p.evaluate(() => mess(() => render(), 3));
    T.tippen = await p.evaluate(() => { const i = document.querySelectorAll('#view tr[data-i] input[data-f="menge"]')[20]; i.focus(); return mess((k) => { i.value = String(10 + k); i.dispatchEvent(new Event('input', { bubbles: true })); }); });
    T.zeile = await p.evaluate(() => mess((k) => { document.querySelectorAll('#view tr[data-i]:not(.ti) td:first-child')[30 + k].dispatchEvent(new MouseEvent('click', { bubbles: true })); }));
    T.klappen = await p.evaluate(() => mess(() => { document.querySelector('#view tr.ti .car').click(); }, 4));
    for (const k of Object.keys(GRENZE)) pruef(T[k] <= GRENZE[k], `${k}: ${T[k]} ms – Grenze ${GRENZE[k]} ms`);
    console.log(`          großes LV (${N} Zeilen): Neuzeichnen ${T.render} ms · Tastendruck ${T.tippen} ms · Zeilenwechsel ${T.zeile} ms · Auf-/Zuklappen ${T.klappen} ms`);
    // Rollen baut nach; Getipptes bleibt
    const roller = '#view .lv-sl';
    const ziel = await p.evaluate(() => { const i = document.querySelectorAll('#view tr[data-i] input[data-f="menge"]')[12]; i.focus(); i.select(); return +i.closest('tr').dataset.i; });
    await p.keyboard.type('777');
    await p.evaluate((q) => { (document.querySelector(q) || document.scrollingElement).scrollTop = 30000; }, roller); await p.waitForTimeout(300);
    s = await st(); pruef(s.von > 300, `nach dem Rollen: Zeilen weiter unten erwartet, erste ist ${s.von}`);
    pruef(await p.evaluate((z) => items()[z].menge === 777, ziel), 'Getipptes ging beim Wegrollen verloren');
    await p.evaluate((q) => { (document.querySelector(q) || document.scrollingElement).scrollTop = 0; }, roller); await p.waitForTimeout(300);
    pruef(await p.evaluate((z) => { const i = document.querySelector(`#view tr[data-i="${z}"] input[data-f="menge"]`); return !!i && i.value === '777'; }, ziel), 'nach dem Zurückrollen steht der getippte Wert nicht im Feld');
    // Tastatur über den Ausschnitt hinaus: Enter läuft die Spalte hinunter
    await p.evaluate(() => { document.querySelectorAll('#view tr[data-i] input[data-f="menge"]')[2].focus(); });
    for (let i = 0; i < 150; i++) { await p.keyboard.type('5'); await p.keyboard.press('Enter'); }
    await p.waitForTimeout(300);
    const n5 = await p.evaluate(() => items().filter((x) => x.menge === 5).length); pruef(n5 === 150, `150× tippen + Enter: 150 Mengen erwartet, gesetzt sind ${n5}`);
    await p.keyboard.press('Escape'); await p.keyboard.press('Escape'); await p.keyboard.press('End'); await p.waitForTimeout(300);
    s = await st(); pruef(s.bis === s.bis && s.bis > N - 200, `Ende: letzte Zeilen erwartet, letzte auf der Seite ist ${s.bis}`);
    await p.keyboard.press('Home'); await p.waitForTimeout(300); s = await st(); pruef(s.von === 0, `Pos1: erste Zeile erwartet, erste auf der Seite ist ${s.von}`);
    // neue Position hinter der markierten Zeile, steht auf der Seite und hat den Fokus
    await p.evaluate(() => { document.querySelectorAll('#view tr[data-i]:not(.ti) td:first-child')[40].dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    await p.evaluate(() => document.querySelector('.rib [data-act="pos"]').click()); await p.waitForTimeout(300);
    pruef(await p.evaluate(() => items().length, 0) === N + 1, 'neue Position wurde nicht angelegt');
    pruef(await p.evaluate(() => { const a = document.activeElement, tr = a && a.closest && a.closest('tr[data-i]'); return !!tr && items()[+tr.dataset.i].id === LVAKT && a.dataset.f === 'kurz'; }), 'neue Position: Fokus steht nicht im Kurztext der neuen Zeile');
    // Langtext auf: nur die Zeilen werden getauscht, die Zeile ist da
    await p.evaluate(() => document.querySelectorAll('#view tr[data-i] [data-a="lang"]')[6].click()); await p.waitForTimeout(150);
    pruef(await p.evaluate(() => document.querySelectorAll('#view tr.lang textarea').length) === 1, 'Langtext aufklappen: keine Langtext-Zeile');
    // Aufmaßprüfung: ebenfalls nur ein Ausschnitt; Titel zuklappen nimmt seine Positionen weg, Spaltenbreiten bleiben
    await p.evaluate(() => document.querySelector('[data-tab="aufmass"]').click()); await p.waitForSelector('#view table.am.baum tr[data-ampos]', { timeout: 20000 });
    await p.evaluate(() => { AMZU.clear(); render(); }); await p.waitForTimeout(300);
    const am = () => p.evaluate(() => { const t = document.querySelector('#view table.am.baum'); return { n: t.querySelectorAll('tr[data-bpk]').length, pos: t.querySelectorAll('tr[data-ampos]').length, th: [...t.querySelectorAll('thead th')].map((h) => Math.round(h.getBoundingClientRect().width)).join(',') }; });
    let a1 = await am(); pruef(a1.n > 20 && a1.n < 400, `Aufmaß: Ausschnitt erwartet, auf der Seite sind ${a1.n} Zeilen`);
    const tAm = await p.evaluate(() => mess(() => render(), 3)); pruef(tAm <= GRENZE_AM, `Aufmaß neu zeichnen: ${tAm} ms – Grenze ${GRENZE_AM} ms`);
    await p.evaluate(() => { const t = document.querySelector('#view table.am.baum'); let sc = t.parentElement; while (sc && !(sc.scrollHeight > sc.clientHeight + 1)) sc = sc.parentElement; (sc || document.scrollingElement).scrollTop = 20000; }); await p.waitForTimeout(300);
    const a2 = await am(); pruef(a2.th === a1.th, `Aufmaß: Spaltenbreiten ändern sich beim Rollen (${a1.th} → ${a2.th})`);
    await p.evaluate(() => { const t = document.querySelector('#view table.am.baum'); let sc = t.parentElement; while (sc && !(sc.scrollHeight > sc.clientHeight + 1)) sc = sc.parentElement; (sc || document.scrollingElement).scrollTop = 0; }); await p.waitForTimeout(300);
    await p.evaluate(() => document.querySelectorAll('#view table.am tr[data-amti]')[0].click()); await p.waitForTimeout(150);
    pruef(await p.evaluate(() => AMZU.size) === 1 && (await am()).pos > 0, 'Aufmaß: Titel zuklappen');
    await p.evaluate(() => document.querySelectorAll('#view table.am tr[data-amti]')[0].click()); await p.waitForTimeout(150);
    const a3 = await am(); pruef(a3.pos > 0 && a3.pos <= 30, `Aufmaß: Titel aufklappen (die anderen klappen zu) – ${a3.pos} Positionen auf der Seite, erwartet höchstens 30`);
    // Kein Flackern: zeichnet die App in einem Bild-Schritt neu, sind die ausgeblendeten Spalten sofort weg – nicht erst ein Bild später (spalten.js)
    const sp = await p.evaluate(() => new Promise((fertig) => requestAnimationFrame(async () => {
      render(); await Promise.resolve(); await Promise.resolve();
      const t = document.querySelector('#view table.am[data-sp]'), z = () => [...t.tHead.rows[0].cells].filter((c) => !c.classList.contains('bp-sp-aus')).length, gleich = z();
      requestAnimationFrame(() => requestAnimationFrame(() => fertig([gleich, z(), t.tHead.rows[0].cells.length])));
    })));
    pruef(sp[0] === sp[1] && sp[1] < sp[2], `Aufmaß: ausgeblendete Spalten blitzen beim Neuzeichnen auf (sofort ${sp[0]} sichtbar, danach ${sp[1]} von ${sp[2]})`);
    // Eingabe rechts: ohne Aufmaß genau eine Zeile, vorbelegt mit der Nummer 1 (kein Datum), ＋ zum Erweitern, kein ✕
    const ein = await p.evaluate(() => { amAns = 'erfassen'; render(); return [...document.querySelectorAll('.am-ein tbody tr')].map((t) => [(t.querySelector('input') || {}).value, t.querySelectorAll('[data-amplus]').length, t.querySelectorAll('[data-amzweg],[data-amdel]').length]); });
    pruef(JSON.stringify(ein) === '[["1",1,0]]', `Aufmaß rechts: eine Zeile „1“ mit ＋ erwartet – ${JSON.stringify(ein)}`);
    // Angebote & Preisspiegel im LV-Format: Projekt und LVs als Ordner in der Tabelle, Titel klappbar, nur ein Ausschnitt, Preise eintragen tauscht nur die Zeilen
    await p.evaluate(() => document.querySelector('[data-tab="angebote"]').click()); await p.waitForSelector('#view table.lv.ps tr[data-lvwurzel]', { timeout: 20000 });
    pruef(await p.evaluate(() => !document.querySelector('#view #pjTree') && document.querySelectorAll('#view table.lv.ps tr[data-lvopen]').length === 1), 'Angebote: die anderen LVs stehen nicht als Ordner in der Tabelle');
    await p.evaluate(() => { LVZU.setze([]); psNeu(); }); await p.waitForTimeout(200);
    const ps = () => p.evaluate(() => { const t = document.querySelector('#view table.lv.ps'); return { n: t.querySelectorAll('tr[data-bpk]').length, felder: t.querySelectorAll('input.ep').length, titel: t.querySelectorAll('tr.ti').length }; });
    const p1 = await ps(); pruef(p1.n > 20 && p1.n < 400 && p1.felder > 60, `Angebote: Ausschnitt mit Preisfeldern erwartet, auf der Seite sind ${p1.n} Zeilen und ${p1.felder} Felder`);
    const tPs = await p.evaluate(() => mess(() => psNeu(), 3)); pruef(tPs <= GRENZE.klappen, `Angebote: Zeilen tauschen ${tPs} ms – Grenze ${GRENZE.klappen} ms`);
    await p.evaluate(() => document.querySelector('#view table.lv.ps tr.ti [data-zu]').click()); await p.waitForTimeout(150);
    pruef(await p.evaluate(() => LVZU.zahl()) === 1 && (await ps()).titel >= 2, 'Angebote: Titel zuklappen');
    await p.evaluate(() => { const i = document.querySelectorAll('#view table.lv.ps input.ep')[3]; i.focus(); i.select(); });
    const vor = await p.evaluate(() => { const a = document.activeElement; return a.dataset.aid + '/' + a.dataset.pid; });
    await p.keyboard.type('12'); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
    const nach = await p.evaluate(() => { const a = document.activeElement; return (a.dataset.aid || '') + '/' + (a.dataset.pid || ''); });
    pruef(nach !== vor && nach.split('/')[0] === vor.split('/')[0] && nach.split('/')[1] !== '', `Angebote: Enter im Preis geht in der Spalte der Bieter:in nach unten (${vor} → ${nach})`);
    // LV an Bieter:innen: Schreiben und Senden im gemeinsamen Versand-Dialog (bp/versand.js); die Seite behält Unterlagen und Bieterliste
    await p.evaluate(() => document.querySelector('[data-tab="versand"]').click()); await p.waitForSelector('[data-vssenden="versand"]:not([disabled])', { timeout: 20000 });
    await p.waitForFunction(() => typeof VS !== 'undefined' && VS.D && document.querySelector('#vsSeite .vs-h, #vsSeite h4, #vsSeite'), null, { timeout: 20000 });
    await p.evaluate(() => document.querySelector('[data-vssenden="versand"]').click()); await p.waitForSelector('.bpv [data-e]', { timeout: 10000 });
    const vd = await p.evaluate(() => ({ an: document.querySelectorAll('.bpv [data-e]:checked').length, was: document.querySelectorAll('.bpv .bpv-d').length, alt: !!document.querySelector('.vs-mail'), vs: !!document.querySelector('.bpv [data-vsf]'), unterlagen: /Unterlagen für die Bieter/.test(document.querySelector('#vsSeite').textContent) }));
    pruef(vd.an === 2 && vd.was === 2 && !vd.alt && vd.vs && vd.unterlagen, `LV-Versand: gemeinsamer Dialog mit 2 Bieter:innen, LV und GAEB, „Vorschau für“ erwartet; der Kasten „Unterlagen“ bleibt auf der Seite – ${JSON.stringify(vd)}`);
    await p.evaluate(() => document.querySelector('.bpv [data-v="x"]').click());
    // Aufträge im LV-Format: Spalten wie im LV, alle Titel des großen LV aufgeklappt – nur ein Ausschnitt steht auf der Seite, Neuzeichnen bleibt schnell
    await p.evaluate(() => document.querySelector('[data-tab="auftraege"]').click()); await p.waitForSelector('#view table.au-t tr[data-tr="l1"]', { timeout: 20000 });
    pruef(await p.evaluate(() => [...document.querySelectorAll('#view table.au-t thead th')].map((h) => h.textContent.replace('⚙ Spalten', '').trim()).join('|')) === 'Bezeichnung|Menge|EH|Art|KG|EP Auftrag|GP|Prognose|abgerechnet|', 'Aufträge: Spalten nicht im LV-Format');
    await p.evaluate(() => document.querySelector('#view table.au-t tr[data-tr="l1"] [data-car]').click()); await p.waitForFunction(() => !!PC[1] && document.querySelectorAll('#view table.au-t tr[data-tr^="l1:"]').length > 0, null, { timeout: 20000 });
    await p.evaluate(() => { PC[1].data.items.filter((x) => x.typ === 'titel').forEach((x) => EXP.add('l1:' + x.id)); render(); }); await p.waitForTimeout(300);
    const au = await p.evaluate(() => ({ alle: AUK.length, n: document.querySelectorAll('#view table.au-t tr[data-bpk]').length, felder: document.querySelectorAll('#view table.au-t input.aui').length }));
    pruef(au.alle > N - 100 && au.n > 20 && au.n < 400 && au.felder > 60, `Aufträge: Ausschnitt erwartet – ${au.alle} Zeilen im Baum, ${au.n} auf der Seite, ${au.felder} Felder`);
    const tAu = await p.evaluate(() => mess(() => render(), 3)); pruef(tAu <= GRENZE.render, `Aufträge neu zeichnen: ${tAu} ms – Grenze ${GRENZE.render} ms`);
    pruef(await p.evaluate(() => { const tr = auTr(AUK[AUK.length - 5]); return !!tr && tr.dataset.tr === AUK[AUK.length - 5]; }), 'Aufträge: Zeile außerhalb des Ausschnitts wird nicht geholt');
  } catch (e) { fehler.push('Prüfung bricht ab – ' + String(e.message).split('\n')[0]); }
  await ctx.close();
  return fehler;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await lvGrossPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
  await b.close(); console.log(f.length ? f.join('\n') : 'ok'); process.exit(f.length ? 1 : 0);
}
