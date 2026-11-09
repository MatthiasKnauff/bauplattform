// Oberflächentests der Bauplattform – jede App wird in einem echten Browser (Chromium, Playwright) geöffnet,
// am PC und als Handy. Läuft in GitHub Actions nach dem Rauchtest gegen die frisch gestartete Plattform.
//
// Geprüft je App und Gerät:
//   - die Seite lädt, ohne JavaScript-Fehler (pageerror) und ohne Fehlermeldungen in der Konsole
//   - alle eigenen Skripte, Stilblätter und Datenabfragen antworten (keine 404 / 5xx)
//   - die gemeinsame Kopfleiste ist da
//   - am Handy keine waagerechte Scrollleiste der ganzen Seite
//
// Aufruf:  node tools/tests/ui/oberflaeche.mjs http://localhost:8090
// Braucht das npm-Paket „playwright“ mit Chromium (in der Pipeline: npx playwright install --with-deps chromium).
// Rückgabewert 0 = alles grün. Bildschirmfotos bei Fehlern: Ordner aus RT_ARTEFAKTE (sonst keine).
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

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
let ok = 0;

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
      if (st.login) probleme.push('landet auf der Anmeldeseite');
      else if (!st.kopf && pfad) probleme.push('gemeinsame Kopfleiste fehlt');
      if (gname === 'Handy' && st.breit > 2) probleme.push(`Seite ${st.breit}px breiter als das Handy (waagerechte Scrollleiste)`);
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
await b.close();
if (fehler.length) console.log('\n' + fehler.join('\n'));
console.log(`\nOberflächentests: ${ok} in Ordnung, ${fehler.length} mit Fehlern.`);
process.exit(fehler.length ? 1 : 0);
