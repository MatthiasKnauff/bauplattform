// U-Werte an den Bauteilen (bp/uwert.js über bp/bauteile.js, GO 18.11.2026 UW-A1 B1 C1 D1) – nachgebildeter Kern, kein Server.
// Geprüft: Wert je Zeile (grün gegen Anlage 1 im Neubau), Ergänzung zeigt den Wert der Kern-Zeile, unvollständig grau mit „~“,
// Details mit Schichten-Tabelle, Fenster: Uw aus der Position und „Uw laut Angebot“ schickt uw an die Zeile.
//
// Aufgerufen aus oberflaeche.mjs:  const fehler = await uwertPruefen(browser, repoWurzel)   – allein: node tools/tests/ui/uwert.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

export async function uwertPruefen(browser, repo, bild) {
  const R = path.join(repo, 'shared/bpcore/head/'), fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  const p = await browser.newPage({ viewport: { width: 900, height: 1000 } });
  p.on('pageerror', (e) => fehler.push('Fehler im Skript – ' + e.message));
  const DB = JSON.parse(fs.readFileSync(path.join(repo, 'shared/bpcore/ws_baustoffe.json'), 'utf8')).baustoffe;
  const bs = (k) => { const e = DB.find((x) => x.k === k); return { id: k, name: e.name, lambda: e.lambda, rho: e.rho, mu: e.mu, c: e.c || 1000 }; };
  const Z = (id, kg, name, mehr) => ({ id, bereich: 'rohbau', art: name, kg, name, menge: 50, einheit: 'm²', anzahl: 1, zustand: 'neu', status: 'neu', berechnen: true,
    vorlage: '331.01', wahl: [0], dicken: {}, code: '', kurz: name, quelle: 'hand', ids: [], nummern: [], hinweis: '', erlaubt: ['neu'], ...mehr });
  const S = { anfragen: [], zeilen: [Z('a', '331', 'Außenwand EG'), Z('b', '336', 'Innenputz Außenwand'), Z('k', '331', 'Kellerwand'), Z('f', '334', 'Fenster', { einheit: 'St', vorlage: '334.15' })] };
  const U = { neubau: true, baustoffe: Object.fromEntries(['ks_1800', 'eps_035', 'putz_kalkgips', 'beton_stb'].map((k) => [k, bs(k)])), zeilen: {
    a: { typ: 'wand', s: [{ n: 'Innenseite Gipsputz', m: 'putz_kalkgips', d: 1, seite: -1 }, { n: 'Tragschicht KS 17,5', m: 'ks_1800', d: 17.5, seite: 1 }, { n: 'WDVS EPS 16', m: 'eps_035', d: 16, lam: 0.032, seite: 2 }], mit: ['b'] },
    b: { typ: 'wand', wie: 'a' },
    k: { typ: 'erdwand', s: [{ n: 'WU-Beton 30', m: 'beton_stb', d: 30 }, { n: 'Perimeter CaSi', m: '', d: 10, fehlt: true }] },
    f: { typ: 'fenster', uw: null, uw_pos: 0.95 } } };
  const alles = () => ({ modell: { bauteilliste: { quelle: { datei: 'a.ifc' }, raeume: [], zeilen: S.zeilen } }, rev: S.anfragen.length + 1, staende: [], links: [] });
  await p.route('http://uw.test/**', async (r) => {
    const q = r.request(), u = new URL(q.url()).pathname, J = (o) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(o) });
    if (u === '/seite') return r.fulfill({ contentType: 'text/html', body: `<!doctype html><meta charset=utf-8><style>${fs.readFileSync(R + 'bp.css', 'utf8')}</style><body><div id="feld"></div><div id="det"></div><script>${fs.readFileSync(R + 'bp.js', 'utf8')}</script><script>${fs.readFileSync(R + 'baum.js', 'utf8')}</script><script>${fs.readFileSync(R + 'bauteile.js', 'utf8')}</script><script>
      window.API = bpBauteile.mount(document.getElementById('feld'), 7, { einlesen: true, baum: true })</script>` });
    if (u.startsWith('/bp/')) return r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(R + u.slice(4), 'utf8') });
    if (u.endsWith('/uwerte')) return J(U);
    if (u.endsWith('/bauteile/zeile')) { const d = q.postDataJSON(); S.anfragen.push(d); if ('uw' in d) { U.zeilen.f.uw = d.uw; S.zeilen[3].uw = d.uw; } return J(alles()); }
    if (u.endsWith('/planstaende')) return J({ planstaende: [], gilt: null });
    if (u.endsWith('/rueckweg')) return J({ vorschlaege: [], schalter: {}, phasen: [], termine: {} });
    if (u === '/api/bp/modell/7') return J(alles());
    return r.fulfill({ status: 404, body: '' });
  });
  try {
    await p.goto('http://uw.test/seite');
    await p.waitForSelector('[data-btu="a"] .bp-uw');
    const a = await p.evaluate(() => Object.fromEntries(['a', 'b', 'k', 'f'].map((id) => { const e = document.querySelector(`[data-btu="${id}"] .bp-uw`); return [id, e ? e.className.replace('bp-uw ', '') + ':' + e.textContent : '']; })));
    pruef(a.a === 'g:0,19', `Außenwand grün 0,19: ${JSON.stringify(a)}`);
    pruef(a.b === a.a, `Innenputz zeigt den Wert der Außenwand: ${JSON.stringify(a)}`);
    pruef(a.k.startsWith('gr:~'), `Kellerwand unvollständig grau mit ~: ${JSON.stringify(a)}`);
    pruef(a.f === 'g:0,95', `Fenster Uw aus der Position: ${JSON.stringify(a)}`);
    await p.evaluate(() => { API.details(document.getElementById('det')); API.zeige('a'); });
    await p.waitForSelector('#det [data-btuw="a"] table');
    const d = await p.evaluate(() => [...document.querySelectorAll('#det [data-btuw="a"] tbody tr')].map((t) => t.cells[0].textContent));
    pruef(d.length === 5 && d[1].includes('Gipsputz') && d[3].includes('EPS'), `Schichten innen → außen mit Übergängen: ${JSON.stringify(d)}`);
    if (bild) await p.screenshot({ path: bild, fullPage: true });
    await p.evaluate(() => API.zeige('f'));
    await p.waitForSelector('#det [data-btuwset="f"]');
    await p.fill('#det [data-btuwset="f"]', '0,8'); await p.press('#det [data-btuwset="f"]', 'Tab'); await p.waitForTimeout(300);
    pruef(S.anfragen.at(-1) && S.anfragen.at(-1).uw === 0.8 && S.anfragen.at(-1).id === 'f', `Uw laut Angebot: ${JSON.stringify(S.anfragen.at(-1))}`);
  } catch (e) { fehler.push('bricht ab – ' + String(e.message).split('\n')[0]); }
  await p.close();
  return fehler;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await uwertPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'), process.argv[2]);
  await b.close(); console.log(f.length ? f.join('\n') : 'ok'); process.exit(f.length ? 1 : 0);
}
