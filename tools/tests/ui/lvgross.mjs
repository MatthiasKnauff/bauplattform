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
  const liste = () => Object.values(LVS).map((l) => ({ id: l.id, project_id: 1, nr: l.nr, name: l.name, gewerk: l.gewerk, status: l.status, archived: false, updated: '', n_pos: l.data.items.length, n_el: l.data.items.length, n_angebote: 0, auftragnehmer: '', schaetzung: 1, auftrag: 0, nachtraege: 0, nt_angemeldet: 0, n_nt: 0, leistung: 0, prognose: 1, abgerechnet: 0, min_angebot: 0, vergeben: false, frei: false, angebot_id: null, aufgehoben: null, ohne_lv: false, ohne_auftrag: false, kg: '', lv_weg: null, angebote: [], rechnungen: [] }));
  const antwort = (u, m) => {
    const p = u.pathname.replace(/^\/ava\//, ''), q = u.searchParams;
    if (p === 'api/me') return { id: 1, name: 'admin', role: 'admin', admin: true, look: {} };
    if (p === 'api/platform') return { apps: [], user: { name: 'admin', role: 'admin' }, projekte: [{ id: 1, name: 'Test' }] };
    if (p === 'api/projekte') return [{ id: 1, name: 'Test', archived: false }];
    if (p === 'api/lv') return q.get('id') ? liste().filter((x) => x.id === +q.get('id')) : liste();
    const mm = /^api\/lv\/(\d+)$/.exec(p);
    if (mm) { const l = LVS[+mm[1]]; if (m === 'PUT') { l.rev++; return { rev: l.rev, calc: l.calc, vergabe: {}, status: l.status, name: l.name, nr: l.nr, gewerk: l.gewerk, archived: false, data: l.data }; } return l; }
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
