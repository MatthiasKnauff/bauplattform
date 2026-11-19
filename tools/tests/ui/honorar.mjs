// Honorar in Schritten (GO 19.11.2026, Mock „Honorar in Schritten“: A1 B1 C wie Ausschreibung, D1) – Ablauftest im echten Browser.
// Die Seite läuft mit ihren echten Skripten; der Server ist nachgebildet (ein Auftrag „Vertrag“, ein weiterer „Angebot“, eine bezahlte Abschlagsrechnung –
// Daten aus bpcore.honorar gerechnet, tools/tests/ui/daten/honorar.json).
// Geprüft: (1) links die Gruppe mit den sechs Schritten des gewählten Auftrags, erledigte mit ✓, der aktuelle gewählt (D1); andere Aufträge darunter.
// (2) rechts nur EINE Karte (der gewählte Schritt), die Stufenleiste oben markiert ihn. (3) Klick links bzw. oben auf „Angebot“ zeigt Angebot +
// Berechnung (Leistungsphasen), setzt aber keine Stufe. (4) „Abrechnung“: Rechnungen oben als Reiter. (5) „Als aktuellen Schritt setzen“ schickt die Stufe.
//
// Aufgerufen aus oberflaeche.mjs:  const fehler = await honorarPruefen(browser, repoWurzel)   – allein: node tools/tests/ui/honorar.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

export async function honorarPruefen(browser, repo) {
  const KASTEN = path.join(repo, 'shared/bpcore/head'), STAT = path.join(repo, 'plattform/static');
  const BK = /BAUKASTEN = \(([^)]*)\)/.exec(fs.readFileSync(path.join(repo, 'shared/bpcore/head.py'), 'utf8'))[1].match(/"[^"]+"/g).map((s) => s.slice(1, -1));
  const baukasten = 'void 0;\n' + BK.map((f) => fs.readFileSync(path.join(KASTEN, f), 'utf8')).join('\n;\n');
  const DATEN = JSON.parse(fs.readFileSync(path.join(repo, 'tools/tests/ui/daten/honorar.json'), 'utf8'));
  const gesendet = [];
  const antwort = (u, m, body) => {
    const p = u.pathname.replace(/^\/honorar\//, '');
    if (p === 'api/me') return { id: 1, name: 'admin', role: 'admin', admin: true, look: {} };
    if (p === 'api/platform') return { apps: [], user: { name: 'admin', role: 'admin' }, projekte: [] };
    if (p === 'api/auftraege') return DATEN.liste;
    if (/^api\/auftraege\/\d+$/.test(p)) { if (m === 'PUT') { gesendet.push(body); return { ok: true }; } return DATEN.detail; }
    if (/versionen$/.test(p)) return { versionen: [], modus: 'auftrag', andere: 0 };
    return /kontakte|neuigkeit|fehler/.test(p) ? [] : {};
  };
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } }), p = await ctx.newPage(), fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  p.on('pageerror', (e) => fehler.push('JavaScript-Fehler: ' + String(e.message || e).split('\n')[0]));
  const art = (f) => (f.endsWith('.css') ? 'text/css' : 'text/javascript');
  await p.route('http://ho.test/**', (r) => {
    const u = new URL(r.request().url()), pf = u.pathname.replace(/^\/honorar\//, '');
    if (pf === '') return r.fulfill({ contentType: 'text/html', body: fs.readFileSync(path.join(STAT, 'honorar.html'), 'utf8') });
    if (pf === 'bp/baukasten.js') return r.fulfill({ contentType: 'text/javascript', body: baukasten });
    const f = pf.startsWith('bp/') ? path.join(KASTEN, pf.slice(3)) : pf.startsWith('static/') ? path.join(STAT, pf.slice(7)) : null;
    if (f) return fs.existsSync(f) ? r.fulfill({ contentType: art(f), body: fs.readFileSync(f) }) : r.fulfill({ status: 404, body: '' });
    if (pf.startsWith('api/')) { let b = null; try { b = JSON.parse(r.request().postData() || 'null'); } catch { /* leer */ } return r.fulfill({ contentType: 'application/json', body: JSON.stringify(antwort(u, r.request().method(), b)) }); }
    return r.fulfill({ status: 404, body: '' });
  });
  try {
    await p.goto('http://ho.test/honorar/');
    await p.waitForSelector('#view .hab-flow', { timeout: 20000 });
    const stand = () => p.evaluate(() => ({
      nav: [...document.querySelectorAll('#navL [data-hon]')].map((x) => x.textContent.replace(/\s+/g, ' ').trim()),
      aktiv: (document.querySelector('#navL [data-hon].on, #navL [data-hon][aria-current]') || {}).textContent || '',
      karten: [...document.querySelectorAll('#view .hab-r .hab-k h3')].map((h) => h.childNodes[0].textContent.trim()),
      gew: (document.querySelector('.hab-flow .bp-stufe.gew b') || {}).textContent || '',
      lph: !!document.querySelector('#view .ho-t [data-lph]'), reiter: [...document.querySelectorAll('.hre-reiter .hre-rt')].map((x) => x.textContent) }));
    let s = await stand();
    pruef(s.nav.some((x) => /Angebot/.test(x)) && s.nav.some((x) => /Vertrag/.test(x)) && s.nav.some((x) => /Bauleitung/.test(x)), 'Navigation: Schritte und weitere Aufträge – ' + JSON.stringify(s.nav));
    pruef(s.karten.length === 1 && /Vertrag/.test(s.karten[0]) && s.gew === 'Vertrag' && /Vertrag/.test(s.aktiv), 'Start: nur die Karte des aktuellen Schritts – ' + JSON.stringify(s));
    await p.evaluate(() => [...document.querySelectorAll('#navL [data-hon]')].find((x) => /Angebot/.test(x.textContent) && !/Bauleitung/.test(x.textContent)).click());
    await p.waitForTimeout(300); s = await stand();
    pruef(s.karten.length === 1 && /Angebot/.test(s.karten[0]) && s.lph && s.gew === 'Angebot' && !gesendet.length, 'Links „Angebot“: Angebot mit Berechnung, keine Stufe gesetzt – ' + JSON.stringify([s, gesendet]));
    await p.click('.hab-flow [data-stufe="abrechnung"]'); await p.waitForTimeout(300); s = await stand();
    pruef(s.karten.length === 1 && /Abrechnung/.test(s.karten[0]) && s.reiter.length === 1 && /1\. Abschlag/.test(s.reiter[0]) && !gesendet.length, 'Oben „Abrechnung“: Rechnungen oben als Reiter – ' + JSON.stringify(s));
    if (process.env.SHOT) await p.screenshot({ path: process.env.SHOT });
    await p.click('[data-stufeset="abrechnung"]'); await p.waitForTimeout(400);
    pruef(gesendet.some((b) => b && b.status === 'abrechnung'), 'Als aktuellen Schritt setzen schickt die Stufe – ' + JSON.stringify(gesendet));
  } catch (e) { fehler.push('Prüfung bricht ab – ' + String(e.message).split('\n')[0]); }
  await ctx.close();
  return fehler;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await honorarPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
  await b.close(); console.log(f.length ? f.join('\n') : 'ok'); process.exit(f.length ? 1 : 0);
}
