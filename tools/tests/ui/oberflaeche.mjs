// Oberflächentests der Bauplattform – jede App wird in einem echten Browser (Chromium, Playwright) geöffnet,
// am PC und als Handy. Läuft in GitHub Actions nach dem Rauchtest gegen die frisch gestartete Plattform.
//
// Geprüft je App und Gerät:
//   - die Seite lädt, ohne JavaScript-Fehler (pageerror) und ohne Fehlermeldungen in der Konsole
//   - alle eigenen Skripte, Stilblätter und Datenabfragen antworten (keine 404 / 5xx)
//   - die gemeinsame Kopfleiste ist da
//   - am Handy keine waagerechte Scrollleiste der ganzen Seite
//   - die Seite kommt zur Ruhe (kein Baustein baut das Dokument im Kreis um)
//   - am PC: zeigt die Seite eine Tabelle mit Kopfzeile, lässt sich dort eine Spalte aus- und wieder einblenden (spalten.js)
// Dazu einmal die Tastatur im Baum (baum.js) und OK/Abbrechen der Fenster (bp.js) an Mustern – siehe baumtasten.mjs, fenster.mjs
//
// Aufruf:  node tools/tests/ui/oberflaeche.mjs http://localhost:8090
// Braucht das npm-Paket „playwright“ mit Chromium (in der Pipeline: npx playwright install --with-deps chromium).
// Rückgabewert 0 = alles grün. Bildschirmfotos bei Fehlern: Ordner aus RT_ARTEFAKTE (sonst keine).
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { baumTastenPruefen } from './baumtasten.mjs';
import { fensterPruefen } from './fenster.mjs';

const { chromium, devices } = createRequire(import.meta.url)('playwright');   // auch global installiert (NODE_PATH) auffindbar

const BASE = (process.argv[2] || 'http://localhost:8090').replace(/\/$/, '');
const USER = 'Test-Admin', PW = 'Testdaten1';   // aus bautagebuch/tools/testdaten.py
const NUR = (process.env.UI_NUR || '').split(',').filter(Boolean);   // z. B. UI_NUR=ava,baukosten (zum Eingrenzen)
const ART = process.env.RT_ARTEFAKTE ? path.join(process.env.RT_ARTEFAKTE, 'oberflaeche') : '';

// Pfad im Verteiler → Name (gleiche Liste wie tools/rauchtest.py)
const APPS = {
  '': 'Startseite', bautagebuch: 'Bautagebuch', bauzeitenplan: 'Bauzeitenplan', adressen: 'Adressen', baukosten: 'Baukosten',
  maengel: 'Aufgaben & Mängel', plaene: 'Pläne', ava: 'Ausschreibung', kommunikation: 'Kommunikation', baudaten: 'Baudaten',
  zeiten: 'Zeiten', verwaltung: 'Verwaltung',
};
const GERAETE = { PC: { viewport: { width: 1400, height: 900 } }, Handy: { ...devices['iPhone 13'] } };

// Meldungen, die nichts mit der App zu tun haben (Testumgebung ohne Dateiserver, ohne KI, ohne Postfach …)
// „Failed to load resource“ prüft schon die Antwortkontrolle unten (mit Pfad) – in der Konsole nicht doppelt zählen
const HARMLOS = [/favicon/i, /Failed to load resource/, /ollama/i, /net::ERR_ABORTED/,
  /blocked by CORS policy/];   // Testumgebung ohne gemeinsame Adresse: die Startseite fragt die Apps über ihre Ports – im Betrieb läuft das über den Verteiler
// Abfragen, die auf Dienste außerhalb der Plattform angewiesen sind (Adresssuche, Karten, Wetter, Postfach, Dateiserver)
const EXTERN = [/\/autoaddress\b/, /\/staticmap\b/, /\/weather\b/, /\/geo\b/, /\/post(eingang)?\b/, /\/ablage\b/, /\/store\//, /\/api\/logo\b/, /\/api\/plaene\b/];

const fehler = [];
let ok = 0, spaltenGeprueft = 0;

const b = await chromium.launch();
for (const [gname, gopt] of Object.entries(GERAETE)) {
  const ctx = await b.newContext({ ...gopt, locale: 'de-DE', timezoneId: 'Europe/Berlin' });
  const login = await ctx.request.post(BASE + '/api/login', { data: { name: USER, password: PW } });
  if (!login.ok()) console.log(`Hinweis: Anmeldung als ${USER} nicht möglich (${login.status()}) – teste ohne Anmeldung`);
  for (const [pfad, name] of Object.entries(APPS)) {
    if (NUR.length && !NUR.includes(pfad || 'start')) continue;
    const p = await ctx.newPage(), probleme = [];
    p.on('pageerror', (e) => probleme.push('JavaScript-Fehler: ' + String(e.message || e).split('\n')[0]));
    p.on('console', (m) => { if (m.type() === 'error' && !HARMLOS.some((r) => r.test(m.text()))) probleme.push('Konsole: ' + m.text().slice(0, 200)); });
    p.on('response', (r) => {
      const u = r.url(), s = r.status();
      if (!u.startsWith(BASE) || EXTERN.some((r) => r.test(u))) return;
      const art = r.request().resourceType();
      if (s >= 500 || (s === 404 && ['script', 'stylesheet', 'fetch', 'xhr'].includes(art) && !/favicon|logo\.png/.test(u))) probleme.push(`${s} ${art}: ${u.slice(BASE.length)}`);
    });
    const url = BASE + '/' + (pfad ? pfad + '/' : '');
    try {
      await p.goto(url, { waitUntil: 'load', timeout: 30000 });
      await p.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      await p.waitForTimeout(800);
      const st = await p.evaluate(() => ({
        kopf: !!document.querySelector('.bph, #bph, [data-bph], .bph-bar, header.bph'),
        breit: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        login: /\/login/.test(location.pathname),
      }));
      // kommt die Seite zur Ruhe? Baut ein Baustein das Dokument ohne Zutun immer wieder um, gehen Klicks verloren
      // (die Zelle unter der gedrückten Maustaste wird ausgehängt) – so geschehen mit spalten.js im LV-Baum
      const unruhe = await p.evaluate(() => new Promise((fertig) => { let n = 0; const mo = new MutationObserver((ms) => { n += ms.length; });
        mo.observe(document.documentElement, { childList: true, subtree: true }); setTimeout(() => { mo.disconnect(); fertig(n); }, 600); }));
      if (unruhe > 60) probleme.push(`Seite kommt nicht zur Ruhe: ${unruhe} Umbauten am Dokument in 0,6 s ohne Zutun (Klicks können verloren gehen)`);
      // Spalten wählen (spalten.js) geht an jeder Tabelle mit Kopfzeile: rechte Maustaste auf den Kopf → Menü; eine Spalte
      // ausblenden → jede Zeile ist danach genauso viele Spalten breit wie der Kopf; „Standard“ stellt alles wieder her
      if (gname === 'PC') {
        const th = await p.$('table:not([data-sp="-"]) thead tr:first-child th:nth-child(2)');
        if (th && await th.isVisible().catch(() => false) && await th.evaluate((e) => e.parentElement.cells.length >= 3 && [...e.parentElement.cells].every((c) => c.colSpan === 1))) {
          await th.click({ button: 'right' }); await p.waitForTimeout(250);
          const breit = () => p.evaluate(() => { const t = [...document.querySelectorAll('table[data-sp]')].find((x) => x.dataset.sp !== '-' && x._spN && x.offsetParent); if (!t) return null;
            const z = (r) => [...r.cells].reduce((a, c) => a + (c.classList.contains('bp-sp-aus') ? 0 : c.colSpan), 0);
            return { kopf: z(t.tHead.rows[0]), zeilen: [...new Set([...t.rows].filter((r) => r._sp > 0).map(z))] }; });
          const haken = await p.$('.bp-spm .bp-spm-z input');
          if (!haken) probleme.push('Spalten-Menü öffnet sich nicht (rechte Maustaste auf den Tabellenkopf)');
          else {
            const v = await breit(); await haken.click(); await p.waitForTimeout(350); const n = await breit();
            if (!v || !n || n.kopf !== v.kopf - 1 || n.zeilen.some((x) => x !== n.kopf)) probleme.push(`Spalte ausblenden: Kopf und Zeilen passen nicht zusammen (vorher ${JSON.stringify(v)}, nachher ${JSON.stringify(n)})`);
            await p.click('.bp-spm [data-spstd]').catch(() => {}); await p.waitForTimeout(250); const d = await breit();
            if (!d || !v || d.kopf !== v.kopf) probleme.push('Spalten-Menü: „Standard“ stellt die Spalten nicht wieder her');
            await p.click('.bp-spm [data-spx]').catch(() => {});
            spaltenGeprueft++;
          }
        }
      }
      if (st.login) probleme.push('landet auf der Anmeldeseite');
      else if (!st.kopf && pfad) probleme.push('gemeinsame Kopfleiste fehlt');
      if (gname === 'Handy' && st.breit > 2) {
        const wer = await p.evaluate(() => {   // welche Elemente ragen heraus? (nur solche, die kein rollender Bereich abschneidet)
          const w = document.documentElement.clientWidth, out = [];
          document.querySelectorAll('body *').forEach((e) => { const r = e.getBoundingClientRect(); if (r.right <= w + 2 || !r.width) return;
            for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) if (getComputedStyle(a).overflowX !== 'visible') return;
            out.push(`${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''}.${String(e.className).split(' ')[0]} (${Math.round(r.width)}px)`); });
          return out.slice(0, 4).join(', ');
        });
        probleme.push(`Seite ${st.breit}px breiter als das Handy (waagerechte Scrollleiste)${wer ? ' – ragt heraus: ' + wer : ''}`);
      }
    } catch (e) { probleme.push('lädt nicht: ' + String(e.message).split('\n')[0]); }
    const titel = `${name} (${gname})`;
    if (probleme.length) {
      fehler.push(`${titel}:\n    - ` + [...new Set(probleme)].join('\n    - '));
      if (ART) { fs.mkdirSync(ART, { recursive: true }); await p.screenshot({ path: path.join(ART, `${pfad || 'start'}_${gname}.png`) }).catch(() => {}); }
      console.log(`  FEHLER  ${titel}`);
    } else { ok++; console.log(`  ok      ${titel}`); }
    await p.close();
  }
  await ctx.close();
}
// Tastatur im Baum (baum.js): Muster-Baum im Browser, unabhängig von den Testdaten
{ const KASTEN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../shared/bpcore/head');
  const ctx = await b.newContext({ viewport: { width: 1200, height: 800 } }), p = await ctx.newPage(), js = [];
  p.on('pageerror', (e) => js.push('JavaScript-Fehler: ' + String(e.message || e).split('\n')[0]));
  let f = [];
  try { f = await baumTastenPruefen(p, fs.readFileSync(path.join(KASTEN, 'baum.js'), 'utf8'), fs.readFileSync(path.join(KASTEN, 'bp.css'), 'utf8')); }
  catch (e) { f = ['Prüfung bricht ab – ' + String(e.message).split('\n')[0]]; }
  try { const p2 = await ctx.newPage(); p2.on('pageerror', (e) => js.push('Fenster: JavaScript-Fehler: ' + String(e.message || e).split('\n')[0]));
    f.push(...(await fensterPruefen(p2, fs.readFileSync(path.join(KASTEN, 'bp.js'), 'utf8'))).map((x) => 'Fenster: ' + x)); }
  catch (e) { f.push('Fenster: Prüfung bricht ab – ' + String(e.message).split('\n')[0]); }
  f = [...js, ...f];
  if (f.length) { fehler.push('Tastatur im Baum / Fenster:\n    - ' + f.join('\n    - ')); console.log('  FEHLER  Tastatur im Baum / Fenster'); } else { ok++; console.log('  ok      Tastatur im Baum / Fenster'); }
  await ctx.close(); }
await b.close();
if (fehler.length) console.log('\n' + fehler.join('\n'));
console.log(`\nSpalten-Menü an ${spaltenGeprueft} Tabellen geprüft.`);
console.log(`\nOberflächentests: ${ok} in Ordnung, ${fehler.length} mit Fehlern.`);
process.exit(fehler.length ? 1 : 0);
