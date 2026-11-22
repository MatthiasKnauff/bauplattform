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
import { lvGrossPruefen } from './lvgross.mjs';
import { startseitePruefen } from './startseite.mjs';
import { versandPruefen } from './versand.mjs';
import { baudatenPruefen } from './baudaten.mjs';
import { breitePruefen } from './breite.mjs';
import { assistentPruefen } from './assistent.mjs';
import { wsModellPruefen } from './wsmodell.mjs';
import { rueckgaengigPruefen } from './rueckgaengig.mjs';
import { katalogPruefen } from './katalog.mjs';
import { ganttHeftPruefen } from './ganttheft.mjs';
import { adrStartPruefen } from './adrstart.mjs';
import { gastPdfPruefen } from './gastpdf.mjs';
import { leistePruefen } from './leiste.mjs';
import { zaehlerPruefen } from './zaehler.mjs';
import { kiwahlPruefen } from './kiwahl.mjs';
import { ruegesuchePruefen } from './ruegesuche.mjs';
import { ganttGrossPruefen } from './ganttgross.mjs';
import { winappPruefen } from './winapp.mjs';
import { meinOrdnerPruefen } from './meinordner.mjs';
import { projektWahlPruefen } from './projektwahl.mjs';
import { zurueckPruefen } from './zurueck.mjs';
import { honorarPruefen } from './honorar.mjs';
import { adrAufraeumenPruefen } from './adraufraeumen.mjs';
import { verwaltungNavPruefen } from './verwaltungnav.mjs';
import { datenMaskePruefen } from './datenmaske.mjs';
import { datumPruefen } from './datum.mjs';
import { ablageEinstPruefen } from './ablageeinst.mjs';
import { ordnerAufrPruefen } from './ordneraufr.mjs';
import { pdfAnsichtPruefen } from './pdfansicht.mjs';
import { markWahlPruefen } from './markwahl.mjs';
import { meldungenPruefen } from './meldungen.mjs';
import { klappenPruefen } from './klappen.mjs';
import { hakenPruefen } from './haken.mjs';
import { begriffePruefen } from './begriffe.mjs';
import { abwesenheitPruefen } from './abwesenheit.mjs';
import { raumbuchPruefen } from './raumbuch.mjs';
import { baukastenPruefen } from './baukasten.mjs';
import { daemmdickePruefen } from './daemmdicke.mjs';
import { uwertPruefen } from './uwert.mjs';
import { ablaufPruefen } from './ablauf.mjs';
import { stapelPruefen } from './stapel.mjs';
import { bauherrenPortalPruefen } from './bauherrenportal.mjs';
import { kartePruefen } from './karte.mjs';
import { kontaktPruefen } from './kontakt.mjs';
import { dateiwahlPruefen } from './dateiwahl.mjs';
import { projektchipsPruefen } from './projektchips.mjs';
import { zeitstrahlPruefen } from './zeitstrahl.mjs';
import { gebaeudemodellPruefen } from './gebaeudemodell.mjs';
import { ansicht3dPruefen } from './ansicht3d.mjs';
import { startdatenPruefen } from './startdaten.mjs';
import { wikisymPruefen } from './wikisym.mjs';
import { versionsmenuePruefen } from './versionsmenue.mjs';
import { portal3dPruefen } from './portal3d.mjs';
import { fragenPruefen } from './fragen.mjs';
import { versandstandPruefen } from './versandstand.mjs';
import { bauteilePruefen } from './bauteile.mjs';
import { kostenPruefen } from './kosten.mjs';
import { angabenPruefen } from './angaben.mjs';
import { bauherrenPruefen } from './bauherren.mjs';
import { nachverfolgenPruefen } from './nachverfolgen.mjs';
import { modellquellePruefen } from './modellquelle.mjs';
import { kuerzelPruefen } from './kuerzel.mjs';
import { bautypenPruefen } from './bautypen.mjs';
import { grundrissBkPruefen } from './grundrissbk.mjs';
import { katalogNetzPruefen } from './katalognetz.mjs';

const { chromium, devices } = createRequire(import.meta.url)('playwright');   // auch global installiert (NODE_PATH) auffindbar

const BASE = (process.argv[2] || 'http://localhost:8090').replace(/\/$/, '');
const USER = 'Test-Admin', PW = 'Testdaten1';   // aus bautagebuch/tools/testdaten.py
const NUR = (process.env.UI_NUR || '').split(',').filter(Boolean);   // z. B. UI_NUR=ava,baukosten (zum Eingrenzen)
const ART = process.env.RT_ARTEFAKTE ? path.join(process.env.RT_ARTEFAKTE, 'oberflaeche') : '';

// Pfad im Verteiler → Name (gleiche Liste wie tools/rauchtest.py)
const APPS = {
  '': 'Startseite', bautagebuch: 'Bautagebuch', bauzeitenplan: 'Bauzeitenplan', adressen: 'Adressen', baukosten: 'Baukosten',
  maengel: 'Aufgaben & Post (Offen)', plaene: 'Pläne', ava: 'Ausschreibung', kommunikation: 'Aufgaben & Post (Verschickt)', baudaten: 'Baudaten',
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
      // Versionswahl (und alles unter dem Kopf) passt in die Navigation links – 16.11.2026: im Bauzeitenplan ragte sie rechts hinaus
      const ueber = await p.evaluate(() => [...document.querySelectorAll('.bp-nav:not(.oben) .nv-davor *')].filter((x) => x.offsetParent).map((x) => {
        const n = x.closest('.bp-nav').getBoundingClientRect(), r = x.getBoundingClientRect(); return r.right > n.right + 1 ? (x.className || x.tagName) + ' ' + Math.round(r.right - n.right) + ' px' : ''; }).filter(Boolean));
      if (ueber.length) probleme.push('Ragt rechts aus der Navigation: ' + ueber.slice(0, 3).join(', '));
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
      // Suche in der Kopfleiste (suche.js): Strg+K öffnet sie, „Kennwort“ findet die Einstellung, Esc schließt
      if (gname === 'PC' && st.kopf && pfad && !st.login) {
        await p.keyboard.press('Escape'); await p.keyboard.press('Control+k');
        const da = await p.waitForSelector('.bph-su input', { timeout: 4000 }).catch(() => null);
        if (!da) probleme.push('Suche (Strg+K) öffnet sich nicht');
        else {
          await da.fill('Kennwort'); await p.waitForTimeout(400);
          if (!await p.evaluate(() => [...document.querySelectorAll('.bph-su-t')].some((x) => /Kennwort/.test(x.textContent)))) probleme.push('Suche findet die Einstellung „Kennwort“ nicht');
          await p.keyboard.press('Escape'); await p.waitForTimeout(100);
          if (await p.$('.bph-su')) probleme.push('Suche schließt mit Esc nicht');
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
// Großes LV bleibt flüssig (nur ein Ausschnitt der Zeilen auf der Seite) – Seite mit nachgebildetem Server, siehe lvgross.mjs
{ let f = [];
  try { f = await lvGrossPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); } catch (e) { f = ['Prüfung bricht ab – ' + String(e.message).split('\n')[0]]; }
  if (f.length) { fehler.push('Großes LV:\n    - ' + f.join('\n    - ')); console.log('  FEHLER  Großes LV'); } else { ok++; console.log('  ok      Großes LV'); } }
// Kürzel aus dem Plan: wie verstanden, bitte bestätigen, An den Zeichner – nachgebildeter Kern, siehe kuerzel.mjs
{ let f = [];
  try { f = await kuerzelPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); } catch (e) { f = ['Prüfung bricht ab – ' + String(e.message).split('\n')[0]]; }
  if (f.length) { fehler.push('Kürzel aus dem Plan:\n    - ' + f.join('\n    - ')); console.log('  FEHLER  Kürzel aus dem Plan'); } else { ok++; console.log('  ok      Kürzel aus dem Plan'); } }
// LV-Nachverfolgung: alle versendeten LVs mit Bieter:innen, Einstieg /ava/#nachverfolgen – nachgebildeter Server, siehe nachverfolgen.mjs
{ let f = [];
  try { f = await nachverfolgenPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); } catch (e) { f = ['Prüfung bricht ab – ' + String(e.message).split('\n')[0]]; }
  if (f.length) { fehler.push('LV-Nachverfolgung:\n    - ' + f.join('\n    - ')); console.log('  FEHLER  LV-Nachverfolgung'); } else { ok++; console.log('  ok      LV-Nachverfolgung'); } }
// Ausschreibung: Quelle „Bauteile“ aus dem Gebäudemodell neben „Baudaten“, Kette an verknüpften Positionen – nachgebildeter Server, siehe modellquelle.mjs
{ let f = [];
  try { f = await modellquellePruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); } catch (e) { f = ['Prüfung bricht ab – ' + String(e.message).split('\n')[0]]; }
  if (f.length) { fehler.push('Quelle „Bauteile“ (Ausschreibung):\n    - ' + f.join('\n    - ')); console.log('  FEHLER  Quelle „Bauteile“ (Ausschreibung)'); } else { ok++; console.log('  ok      Quelle „Bauteile“ (Ausschreibung)'); } }
// Startseite: jede Sache steht nur einmal da (eigenes Widget oder „Erinnerungen & Fristen“) – nachgebildeter Server, siehe startseite.mjs
{ let f = [];
  try { f = await startseitePruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); } catch (e) { f = ['Prüfung bricht ab – ' + String(e.message).split('\n')[0]]; }
  if (f.length) { fehler.push('Startseite:\n    - ' + f.join('\n    - ')); console.log('  FEHLER  Startseite'); } else { ok++; console.log('  ok      Startseite'); } }
// Versand: überall derselbe Dialog (bp/versand.js) – nachgebildeter Server, siehe versand.mjs
{ let f = [];
  try { f = await versandPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); } catch (e) { f = ['Prüfung bricht ab – ' + String(e.message).split('\n')[0]]; }
  if (f.length) { fehler.push('Versand:\n    - ' + f.join('\n    - ')); console.log('  FEHLER  Versand'); } else { ok++; console.log('  ok      Versand'); } }
// Baudaten: Bereich rechts mit Reitern Position/Korb steht neben der Liste – nachgebildeter Server, siehe baudaten.mjs
{ let f = [];
  try { f = await baudatenPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); } catch (e) { f = ['Prüfung bricht ab – ' + String(e.message).split('\n')[0]]; }
  if (f.length) { fehler.push('Baudaten:\n    - ' + f.join('\n    - ')); console.log('  FEHLER  Baudaten'); } else { ok++; console.log('  ok      Baudaten'); } }
// Breite: Tabellen und Listen nutzen bei 1.920 px die ganze Breite – nachgebildeter Server, siehe breite.mjs
{ let f = [];
  try { f = await breitePruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); } catch (e) { f = ['Prüfung bricht ab – ' + String(e.message).split('\n')[0]]; }
  if (f.length) { fehler.push('Breite:\n    - ' + f.join('\n    - ')); console.log('  FEHLER  Breite'); } else { ok++; console.log('  ok      Breite'); } }
// Planungsassistent: Reiter „Planung“ im Bereich rechts, Schritte, Speichern ins Projektmodell – nachgebildeter Server, siehe assistent.mjs
{ let f = [];
  try { f = await assistentPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); } catch (e) { f = ['Prüfung bricht ab – ' + String(e.message).split('\n')[0]]; }
  if (f.length) { fehler.push('Planungsassistent:\n    - ' + f.join('\n    - ')); console.log('  FEHLER  Planungsassistent'); } else { ok++; console.log('  ok      Planungsassistent'); } }
// Wärmeschutz: Hinweise aus dem Projektmodell in der Stufe „Bauteile“ – nachgebildeter Server, siehe wsmodell.mjs
{ let f = [];
  try { f = await wsModellPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); } catch (e) { f = ['Prüfung bricht ab – ' + String(e.message).split('\n')[0]]; }
  if (f.length) { fehler.push('Wärmeschutz ⇄ Projektmodell:\n    - ' + f.join('\n    - ')); console.log('  FEHLER  Wärmeschutz ⇄ Projektmodell'); } else { ok++; console.log('  ok      Wärmeschutz ⇄ Projektmodell'); } }
// Rückgängig fest oben links: erste Gruppe der Befehlsleiste bzw. schmale Zeile – ohne Server, siehe rueckgaengig.mjs
{ let f = [];
  try { f = await rueckgaengigPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); } catch (e) { f = ['Prüfung bricht ab – ' + String(e.message).split('\n')[0]]; }
  if (f.length) { fehler.push('Rückgängig oben links:\n    - ' + f.join('\n    - ')); console.log('  FEHLER  Rückgängig oben links'); } else { ok++; console.log('  ok      Rückgängig oben links'); } }
// Leistungskatalog im Bauzeitenplan: Auswahlfelder (Maus, Finger), Rollposition, Abschnitte umsortieren – nachgebildeter Server, siehe katalog.mjs
{ let f = [];
  try { f = await katalogPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); } catch (e) { f = ['Prüfung bricht ab – ' + String(e.message).split('\n')[0]]; }
  if (f.length) { fehler.push('Leistungskatalog:\n    - ' + f.join('\n    - ')); console.log('  FEHLER  Leistungskatalog'); } else { ok++; console.log('  ok      Leistungskatalog'); } }
// Bauherrenportal – Seite der Bauherr:innen: Kopf, Titelbild, Bauphasen, Kacheln, Neuigkeiten, Ansprechperson – ohne Server, siehe bauherrenportal.mjs
{ let f = [];
  try { f = await bauherrenPortalPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); } catch (e) { f = ['Prüfung bricht ab – ' + String(e.message).split('\n')[0]]; }
  if (f.length) { fehler.push('Bauherrenportal (Startseite):\n    - ' + f.join('\n    - ')); console.log('  FEHLER  Bauherrenportal (Startseite)'); } else { ok++; console.log('  ok      Bauherrenportal (Startseite)'); } }
// Datumswahl im Aussehen des Bautagebuch-Kalenders: ohne KW, Punkte, Schnellwahl nur im erlaubten Bereich – ohne Server, siehe datum.mjs
{ let f = [];
  try { f = await datumPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); } catch (e) { f = ['Prüfung bricht ab – ' + String(e.message).split('\n')[0]]; }
  if (f.length) { fehler.push('Datumswahl:\n    - ' + f.join('\n    - ')); console.log('  FEHLER  Datumswahl'); } else { ok++; console.log('  ok      Datumswahl'); } }
// PDF-Ansicht: Knöpfe mit Beschriftung, Hauptknopf je App, Seitenübersicht, Handy-Leiste unten – ohne Server, siehe pdfansicht.mjs
{ let f = [];
  try { f = await pdfAnsichtPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); } catch (e) { f = ['Prüfung bricht ab – ' + String(e.message).split('\n')[0]]; }
  if (f.length) { fehler.push('PDF-Ansicht:\n    - ' + f.join('\n    - ')); console.log('  FEHLER  PDF-Ansicht'); } else { ok++; console.log('  ok      PDF-Ansicht'); } }
// Einträge aus Vorschlagslisten löschen mit Ersatz – ohne Server, siehe begriffe.mjs
{ let f = [];
  try { f = await begriffePruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); } catch (e) { f = ['Prüfung bricht ab – ' + String(e.message).split('\n')[0]]; }
  if (f.length) { fehler.push('Vorschlag löschen mit Ersatz:\n    - ' + f.join('\n    - ')); console.log('  FEHLER  Vorschlag löschen mit Ersatz'); } else { ok++; console.log('  ok      Vorschlag löschen mit Ersatz'); } }
// Fenster stapeln: neues Fenster über Druckseite/PDF-Ansicht – ohne Server, siehe stapel.mjs
{ let f = [];
  try { f = await stapelPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); } catch (e) { f = ['Prüfung bricht ab – ' + String(e.message).split('\n')[0]]; }
  if (f.length) { fehler.push('Fenster stapeln:\n    - ' + f.join('\n    - ')); console.log('  FEHLER  Fenster stapeln'); } else { ok++; console.log('  ok      Fenster stapeln'); } }
// Dämmdicke: Dämmstoff und Dicke getrennt – ohne Server, siehe daemmdicke.mjs
{ let f = [];
  try { f = await daemmdickePruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); } catch (e) { f = ['Prüfung bricht ab – ' + String(e.message).split('\n')[0]]; }
  if (f.length) { fehler.push('Dämmdicke:\n    - ' + f.join('\n    - ')); console.log('  FEHLER  Dämmdicke'); } else { ok++; console.log('  ok      Dämmdicke'); } }
// U-Werte an den Bauteilen – ohne Server, siehe uwert.mjs
{ let f = [];
  try { f = await uwertPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); } catch (e) { f = ['Prüfung bricht ab – ' + String(e.message).split('\n')[0]]; }
  if (f.length) { fehler.push('U-Werte:\n    - ' + f.join('\n    - ')); console.log('  FEHLER  U-Werte'); } else { ok++; console.log('  ok      U-Werte'); } }
// Ablauf der Gebäudeteile (Pfeile, Drucken) – ohne Server, siehe ablauf.mjs
{ let f = [];
  try { f = await ablaufPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); } catch (e) { f = ['Prüfung bricht ab – ' + String(e.message).split('\n')[0]]; }
  if (f.length) { fehler.push('Ablauf der Teile:\n    - ' + f.join('\n    - ')); console.log('  FEHLER  Ablauf der Teile'); } else { ok++; console.log('  ok      Ablauf der Teile'); } }
// Raumbuch: Boden, Wand, Decke je Raum – ohne Server, siehe raumbuch.mjs
{ let f = [];
  try { f = await raumbuchPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); } catch (e) { f = ['Prüfung bricht ab – ' + String(e.message).split('\n')[0]]; }
  if (f.length) { fehler.push('Raumbuch:\n    - ' + f.join('\n    - ')); console.log('  FEHLER  Raumbuch'); } else { ok++; console.log('  ok      Raumbuch'); } }
// Gebäude-Baukasten: ＋/−, Staffel, Korb, Rückgängig – ohne Server, siehe baukasten.mjs
{ let f = [];
  try { f = await baukastenPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); } catch (e) { f = ['Prüfung bricht ab – ' + String(e.message).split('\n')[0]]; }
  if (f.length) { fehler.push('Gebäude-Baukasten:\n    - ' + f.join('\n    - ')); console.log('  FEHLER  Gebäude-Baukasten'); } else { ok++; console.log('  ok      Gebäude-Baukasten'); } }
// Abwesenheit zurücknehmen oder löschen – ohne Server, siehe abwesenheit.mjs
{ let f = [];
  try { f = await abwesenheitPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); } catch (e) { f = ['Prüfung bricht ab – ' + String(e.message).split('\n')[0]]; }
  if (f.length) { fehler.push('Abwesenheit zurücknehmen:\n    - ' + f.join('\n    - ')); console.log('  FEHLER  Abwesenheit zurücknehmen'); } else { ok++; console.log('  ok      Abwesenheit zurücknehmen'); } }
// Markierungen auswählen/löschen, Radiergummi, Unterschrift als Ebene – ohne Server, siehe markwahl.mjs
{ let f = [];
  try { f = await markWahlPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); } catch (e) { f = ['Prüfung bricht ab – ' + String(e.message).split('\n')[0]]; }
  if (f.length) { fehler.push('Markieren & Unterschrift:\n    - ' + f.join('\n    - ')); console.log('  FEHLER  Markieren & Unterschrift'); } else { ok++; console.log('  ok      Markieren & Unterschrift'); } }
// Rechnung abhaken: ✔ → ✘ → weg auf Seite 2, Seiten nicht doppelt – ohne Server, siehe haken.mjs
{ let f = [];
  try { f = await hakenPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); } catch (e) { f = ['Prüfung bricht ab – ' + String(e.message).split('\n')[0]]; }
  if (f.length) { fehler.push('Rechnung abhaken:\n    - ' + f.join('\n    - ')); console.log('  FEHLER  Rechnung abhaken'); } else { ok++; console.log('  ok      Rechnung abhaken'); } }
// Benachrichtigungen: kein waagerechter Rollbalken, Markier-Häkchen bleibt ein Häkchen – ohne Server, siehe meldungen.mjs
{ let f = [];
  try { f = await meldungenPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); } catch (e) { f = ['Prüfung bricht ab – ' + String(e.message).split('\n')[0]]; }
  if (f.length) { fehler.push('Benachrichtigungen:\n    - ' + f.join('\n    - ')); console.log('  FEHLER  Benachrichtigungen'); } else { ok++; console.log('  ok      Benachrichtigungen'); } }
// Ausklappen: ein Zeichen für Abschnitte, Bäume und Zeilen, Stil „Ausklappen“ wirkt überall – ohne Server, siehe klappen.mjs
{ let f = [];
  try { f = await klappenPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); } catch (e) { f = ['Prüfung bricht ab – ' + String(e.message).split('\n')[0]]; }
  if (f.length) { fehler.push('Ausklappen:\n    - ' + f.join('\n    - ')); console.log('  FEHLER  Ausklappen'); } else { ok++; console.log('  ok      Ausklappen'); } }
// Ablage-Einstellungen je App: Felder vom Kern, Frage beim Ordnernamen – ohne Server, siehe ablageeinst.mjs
{ let f = [];
  try { f = await ablageEinstPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); } catch (e) { f = ['Prüfung bricht ab – ' + String(e.message).split('\n')[0]]; }
  if (f.length) { fehler.push('Ablage-Einstellungen:\n    - ' + f.join('\n    - ')); console.log('  FEHLER  Ablage-Einstellungen'); } else { ok++; console.log('  ok      Ablage-Einstellungen'); } }
// Projektordner aufräumen (Ablage & Server): Tabelle mit Abweichungen, nur angehakte ausführen – ohne Server, siehe ordneraufr.mjs
{ let f = [];
  try { f = await ordnerAufrPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); } catch (e) { f = ['Prüfung bricht ab – ' + String(e.message).split('\n')[0]]; }
  if (f.length) { fehler.push('Projektordner aufräumen:\n    - ' + f.join('\n    - ')); console.log('  FEHLER  Projektordner aufräumen'); } else { ok++; console.log('  ok      Projektordner aufräumen'); } }
// Stammdaten-Maske: Feldart „auswahl“ mit „eigener Wert …“ – ohne Server, siehe datenmaske.mjs
{ let f = [];
  try { f = await datenMaskePruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); } catch (e) { f = ['Prüfung bricht ab – ' + String(e.message).split('\n')[0]]; }
  if (f.length) { fehler.push('Stammdaten-Maske (Auswahl):\n    - ' + f.join('\n    - ')); console.log('  FEHLER  Stammdaten-Maske (Auswahl)'); } else { ok++; console.log('  ok      Stammdaten-Maske (Auswahl)'); } }
// Rüge aus dem Suchfeld – siehe ruegesuche.mjs
{ let f = [];
  try { f = await ruegesuchePruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); } catch (e) { f = ['Prüfung bricht ab – ' + String(e.message).split('\n')[0]]; }
  if (f.length) { fehler.push('Rüge aus dem Suchfeld:\n    - ' + f.join('\n    - ')); console.log('  FEHLER  Rüge aus dem Suchfeld'); } else { ok++; console.log('  ok      Rüge aus dem Suchfeld'); } }
// KI nur in den Einstellungen wählen – siehe kiwahl.mjs
{ let f = [];
  try { f = await kiwahlPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); } catch (e) { f = ['Prüfung bricht ab – ' + String(e.message).split('\n')[0]]; }
  if (f.length) { fehler.push('KI-Wahl:\n    - ' + f.join('\n    - ')); console.log('  FEHLER  KI-Wahl'); } else { ok++; console.log('  ok      KI-Wahl'); } }
// Anzahl mit − / + (bpZaehler) – siehe zaehler.mjs
{ let f = [];
  try { f = await zaehlerPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); } catch (e) { f = ['Prüfung bricht ab – ' + String(e.message).split('\n')[0]]; }
  if (f.length) { fehler.push('Anzahl − / +:\n    - ' + f.join('\n    - ')); console.log('  FEHLER  Anzahl − / +'); } else { ok++; console.log('  ok      Anzahl − / +'); } }
// Zu schmale Reiterleisten: enger, dann „+n ▾“, Knöpfe bleiben – siehe leiste.mjs
{ let f = [];
  try { f = await leistePruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); } catch (e) { f = ['Prüfung bricht ab – ' + String(e.message).split('\n')[0]]; }
  if (f.length) { fehler.push('Reiterleisten:\n    - ' + f.join('\n    - ')); console.log('  FEHLER  Reiterleisten'); } else { ok++; console.log('  ok      Reiterleisten'); } }
// Gemeinsam markieren für Externe (/gast/…): pdf.js lädt trotz <base href="/"> – siehe gastpdf.mjs
{ let f = [];
  try { f = await gastPdfPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); } catch (e) { f = ['Prüfung bricht ab – ' + String(e.message).split('\n')[0]]; }
  if (f.length) { fehler.push('Gast-Seite PDF:\n    - ' + f.join('\n    - ')); console.log('  FEHLER  Gast-Seite PDF'); } else { ok++; console.log('  ok      Gast-Seite PDF'); } }
// Adressen beginnen mit dem Projektbezug, einmalige Frage „immer ohne Projekt?“, Häkchen unter „Beteiligte …“ – nachgebildeter Server, siehe adrstart.mjs
{ let f = [];
  try { f = await adrStartPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); } catch (e) { f = ['Prüfung bricht ab – ' + String(e.message).split('\n')[0]]; }
  if (f.length) { fehler.push('Adressen mit Projektbezug:\n    - ' + f.join('\n    - ')); console.log('  FEHLER  Adressen mit Projektbezug'); } else { ok++; console.log('  ok      Adressen mit Projektbezug'); } }
// Heftzwecke im Bauzeitenplan: Kopf und Befehlsleiste zweistufig weg, Befehle im Kontextmenü – nachgebildeter Server, siehe ganttheft.mjs
{ let f = [];
  try { f = await ganttHeftPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); } catch (e) { f = ['Prüfung bricht ab – ' + String(e.message).split('\n')[0]]; }
  if (f.length) { fehler.push('Heftzwecke Bauzeitenplan:\n    - ' + f.join('\n    - ')); console.log('  FEHLER  Heftzwecke Bauzeitenplan'); } else { ok++; console.log('  ok      Heftzwecke Bauzeitenplan'); } }
// Großer Bauzeitenplan bleibt flüssig (nur ein Ausschnitt der Zeilen in Tabelle und Diagramm) – nachgebildeter Server, siehe ganttgross.mjs
{ let f = [];
  try { f = await ganttGrossPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); } catch (e) { f = ['Prüfung bricht ab – ' + String(e.message).split('\n')[0]]; }
  if (f.length) { fehler.push('Großer Bauzeitenplan:\n    - ' + f.join('\n    - ')); console.log('  FEHLER  Großer Bauzeitenplan'); } else { ok++; console.log('  ok      Großer Bauzeitenplan'); } }
// Projekt wählen – neu: Favoriten, Zuletzt, Zähler, Vorschau, Tastatur, Strg+K – nachgebildeter Server, siehe projektwahl.mjs
{ let f = [];
  try { f = await projektWahlPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); } catch (e) { f = ['Prüfung bricht ab – ' + String(e.message).split('\n')[0]]; }
  if (f.length) { fehler.push('Projekt wählen:\n    - ' + f.join('\n    - ')); console.log('  FEHLER  Projekt wählen'); } else { ok++; console.log('  ok      Projekt wählen'); } }
// Mein Ordner: Menü unter dem Namen, Mein Konto, Benutzerordner in Pläne & Dateien – nachgebildeter Server, siehe meinordner.mjs
{ let f = [];
  try { f = await meinOrdnerPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); } catch (e) { f = ['Prüfung bricht ab – ' + String(e.message).split('\n')[0]]; }
  if (f.length) { fehler.push('Mein Ordner:\n    - ' + f.join('\n    - ')); console.log('  FEHLER  Mein Ordner'); } else { ok++; console.log('  ok      Mein Ordner'); } }
// Windows-App anbieten: Popup auf der Startseite unter Windows, Menüpunkt, „genutzt“ aus der App – nachgebildeter Server, siehe winapp.mjs
{ let f = [];
  try { f = await winappPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); } catch (e) { f = ['Prüfung bricht ab – ' + String(e.message).split('\n')[0]]; }
  if (f.length) { fehler.push('Windows-App anbieten:\n    - ' + f.join('\n    - ')); console.log('  FEHLER  Windows-App anbieten'); } else { ok++; console.log('  ok      Windows-App anbieten'); } }
// Verwaltung: „Für mich“ abgesetzt (admin.html) – nachgebildeter Server, siehe verwaltungnav.mjs
{ let f = [];
  try { f = await verwaltungNavPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); } catch (e) { f = ['Prüfung bricht ab – ' + String(e.message).split('\n')[0]]; }
  if (f.length) { fehler.push('Verwaltung „Für mich“:\n    - ' + f.join('\n    - ')); console.log('  FEHLER  Verwaltung „Für mich“'); } else { ok++; console.log('  ok      Verwaltung „Für mich“'); } }
// Adressen aufräumen (adressen-aufraeumen.js) – nachgebildeter Server, siehe adraufraeumen.mjs
{ let f = [];
  try { f = await adrAufraeumenPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); } catch (e) { f = ['Prüfung bricht ab – ' + String(e.message).split('\n')[0]]; }
  if (f.length) { fehler.push('Adressen aufräumen:\n    - ' + f.join('\n    - ')); console.log('  FEHLER  Adressen aufräumen'); } else { ok++; console.log('  ok      Adressen aufräumen'); } }
// Honorar in Schritten (honorar-ablauf.js) – nachgebildeter Server, siehe honorar.mjs
{ let f = [];
  try { f = await honorarPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); } catch (e) { f = ['Prüfung bricht ab – ' + String(e.message).split('\n')[0]]; }
  if (f.length) { fehler.push('Honorar in Schritten:\n    - ' + f.join('\n    - ')); console.log('  FEHLER  Honorar in Schritten'); } else { ok++; console.log('  ok      Honorar in Schritten'); } }
// Schwebendes Zurück-Feld nach Sprüngen aus „Zu tun“ und Suche (bp/zurueck.js) – nachgebildete Seiten, siehe zurueck.mjs
{ let f = [];
  try { f = await zurueckPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); } catch (e) { f = ['Prüfung bricht ab – ' + String(e.message).split('\n')[0]]; }
  if (f.length) { fehler.push('Zurück-Feld:\n    - ' + f.join('\n    - ')); console.log('  FEHLER  Zurück-Feld'); } else { ok++; console.log('  ok      Zurück-Feld'); } }
// Verknüpfungs-Karte des Projektmodells (bp/karte.js) und App „Planung“ – nachgebildeter Kern, siehe karte.mjs
{ let f = [];
  try { f = await kartePruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); } catch (e) { f = ['Prüfung bricht ab – ' + String(e.message).split('\n')[0]]; }
  if (f.length) { fehler.push('Verknüpfungs-Karte:\n    - ' + f.join('\n    - ')); console.log('  FEHLER  Verknüpfungs-Karte'); } else { ok++; console.log('  ok      Verknüpfungs-Karte'); } }
// Kontaktmaske: Bausteine Gewerk/Stichwörter/Tags mit Vorschlägen, Anordnung – siehe kontakt.mjs
{ let f = [];
  try { f = await kontaktPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); } catch (e) { f = ['Prüfung bricht ab – ' + String(e.message).split('\n')[0]]; }
  if (f.length) { fehler.push('Kontaktmaske:\n    - ' + f.join('\n    - ')); console.log('  FEHLER  Kontaktmaske'); } else { ok++; console.log('  ok      Kontaktmaske'); } }
// Dateiauswahl am iPhone: Filter mit unbekannten Endungen (.ifc, GAEB) fallen weg – siehe dateiwahl.mjs
{ let f = [];
  try { f = await dateiwahlPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); } catch (e) { f = ['Prüfung bricht ab – ' + String(e.message).split('\n')[0]]; }
  if (f.length) { fehler.push('Dateiauswahl am iPhone:\n    - ' + f.join('\n    - ')); console.log('  FEHLER  Dateiauswahl am iPhone'); } else { ok++; console.log('  ok      Dateiauswahl am iPhone'); } }
// Verwaltung → Projekte: App-Felder öffnen ein Menü – siehe projektchips.mjs
{ let f = [];
  try { f = await projektchipsPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); } catch (e) { f = ['Prüfung bricht ab – ' + String(e.message).split('\n')[0]]; }
  if (f.length) { fehler.push('Projekt-Felder:\n    - ' + f.join('\n    - ')); console.log('  FEHLER  Projekt-Felder'); } else { ok++; console.log('  ok      Projekt-Felder'); } }
// Gebäudemodell wie alle Apps: Befehlsleiste, Baumtabelle, Details rechts, Anweisungen – siehe gebaeudemodell.mjs
{ let f = [];
  try { f = await gebaeudemodellPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); } catch (e) { f = ['Prüfung bricht ab – ' + String(e.message).split('\n')[0]]; }
  if (f.length) { fehler.push('Gebäudemodell:\n    - ' + f.join('\n    - ')); console.log('  FEHLER  Gebäudemodell'); } else { ok++; console.log('  ok      Gebäudemodell'); } }
// Zeiten → Mein Tag: Zeitstrahl zoomen und verschieben – siehe zeitstrahl.mjs
{ let f = [];
  try { f = await zeitstrahlPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); } catch (e) { f = ['Prüfung bricht ab – ' + String(e.message).split('\n')[0]]; }
  if (f.length) { fehler.push('Zeitstrahl:\n    - ' + f.join('\n    - ')); console.log('  FEHLER  Zeitstrahl'); } else { ok++; console.log('  ok      Zeitstrahl'); } }
// 3D-Ansicht des Gebäudemodells (bp/ansicht3d.js): zeichnen, Geschosse, Färben, Antippen – siehe ansicht3d.mjs
{ let f = [];
  try { f = await ansicht3dPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); } catch (e) { f = ['Prüfung bricht ab – ' + String(e.message).split('\n')[0]]; }
  if (f.length) { fehler.push('3D-Ansicht:\n    - ' + f.join('\n    - ')); console.log('  FEHLER  3D-Ansicht'); } else { ok++; console.log('  ok      3D-Ansicht'); } }
// Versand an Bieter:innen: Stand in den Details einer Firma als eine Reihe – siehe versandstand.mjs
{ let f = [];
  try { f = await versandstandPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); } catch (e) { f = ['Prüfung bricht ab – ' + String(e.message).split('\n')[0]]; }
  if (f.length) { fehler.push('Versand: Stand der Firma:\n    - ' + f.join('\n    - ')); console.log('  FEHLER  Versand: Stand der Firma'); } else { ok++; console.log('  ok      Versand: Stand der Firma'); } }
// KI-Gespräch „Fragen“ (bp/fragen.js): nur Ollama, im Netz erst nach Warnung – siehe fragen.mjs
{ let f = [];
  try { f = await fragenPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); } catch (e) { f = ['Prüfung bricht ab – ' + String(e.message).split('\n')[0]]; }
  if (f.length) { fehler.push('KI-Gespräch „Fragen“:\n    - ' + f.join('\n    - ')); console.log('  FEHLER  KI-Gespräch „Fragen“'); } else { ok++; console.log('  ok      KI-Gespräch „Fragen“'); } }
// Bauherrenportal, Seite der Bauherr:innen: Gebäude mit 3D unter der strengen CSP des Portals – siehe portal3d.mjs
{ let f = [];
  try { f = await portal3dPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); } catch (e) { f = ['Prüfung bricht ab – ' + String(e.message).split('\n')[0]]; }
  if (f.length) { fehler.push('Bauherrenportal 3D:\n    - ' + f.join('\n    - ')); console.log('  FEHLER  Bauherrenportal 3D'); } else { ok++; console.log('  ok      Bauherrenportal 3D'); } }
// Versionsmenü (head.js): offen an <body>, nicht verdeckt oder abgeschnitten – siehe versionsmenue.mjs
{ let f = [];
  try { f = await versionsmenuePruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); } catch (e) { f = ['Prüfung bricht ab – ' + String(e.message).split('\n')[0]]; }
  if (f.length) { fehler.push('Versionsmenü:\n    - ' + f.join('\n    - ')); console.log('  FEHLER  Versionsmenü'); } else { ok++; console.log('  ok      Versionsmenü'); } }
// Wiki-Symbol überall (bp/wikisym.js): eine Abfrage je Seite, Symbol mit Zahl, Fenster lesen/bearbeiten/löschen – siehe wikisym.mjs
{ let f = [];
  try { f = await wikisymPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); } catch (e) { f = ['Prüfung bricht ab – ' + String(e.message).split('\n')[0]]; }
  if (f.length) { fehler.push('Wiki-Symbol:\n    - ' + f.join('\n    - ')); console.log('  FEHLER  Wiki-Symbol'); } else { ok++; console.log('  ok      Wiki-Symbol'); } }
// Startdaten aus dem Gebäudemodell (bp/startdaten.js): Frage beim ersten Stand, Antwort setzt die Linie – siehe startdaten.mjs
{ let f = [];
  try { f = await startdatenPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); } catch (e) { f = ['Prüfung bricht ab – ' + String(e.message).split('\n')[0]]; }
  if (f.length) { fehler.push('Startdaten aus dem Gebäudemodell:\n    - ' + f.join('\n    - ')); console.log('  FEHLER  Startdaten aus dem Gebäudemodell'); } else { ok++; console.log('  ok      Startdaten aus dem Gebäudemodell'); } }
// Bauteil-Checkliste im Projektmodell (bp/bauteile.js): Status, Aufbau, berechnen, IFC einlesen – siehe bauteile.mjs
{ let f = [];
  try { f = await bauteilePruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); } catch (e) { f = ['Prüfung bricht ab – ' + String(e.message).split('\n')[0]]; }
  if (f.length) { fehler.push('Bauteil-Checkliste:\n    - ' + f.join('\n    - ')); console.log('  FEHLER  Bauteil-Checkliste'); } else { ok++; console.log('  ok      Bauteil-Checkliste'); } }
// Bauteiltypen (Gebäudemodell neu, Etappe 2): Baum nach Typ, Eigenschaften-Fenster mit Typ, Neuer Typ mit Rückgängig – siehe bautypen.mjs
{ let f = [];
  try { f = await bautypenPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); } catch (e) { f = ['Prüfung bricht ab – ' + String(e.message).split('\n')[0]]; }
  if (f.length) { fehler.push('Bauteiltypen:\n    - ' + f.join('\n    - ')); console.log('  FEHLER  Bauteiltypen'); } else { ok++; console.log('  ok      Bauteiltypen'); } }
// Grundriss im Baukasten (Etappe 5): Wand ziehen, Treppe, Entf, Raumname – siehe grundrissbk.mjs
{ let f = [];
  try { f = await grundrissBkPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); } catch (e) { f = ['Prüfung bricht ab – ' + String(e.message).split('\n')[0]]; }
  if (f.length) { fehler.push('Grundriss im Baukasten:\n    - ' + f.join('\n    - ')); console.log('  FEHLER  Grundriss im Baukasten'); } else { ok++; console.log('  ok      Grundriss im Baukasten'); } }
// Leistungskatalog: Büro-Ebene, Abhängigkeiten, Lernen, Fortschritt über 100 % – siehe katalognetz.mjs
{ let f = [];
  try { f = await katalogNetzPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); } catch (e) { f = ['Prüfung bricht ab – ' + String(e.message).split('\n')[0]]; }
  if (f.length) { fehler.push('Leistungskatalog Abhängigkeiten:\n    - ' + f.join('\n    - ')); console.log('  FEHLER  Leistungskatalog Abhängigkeiten'); } else { ok++; console.log('  ok      Leistungskatalog Abhängigkeiten'); } }
// Kosten aus Bauteilen (plattform/static/baukosten.js): Band, Übernehmen, Stufe, Preis von Hand, DIN 276 – siehe kosten.mjs
{ let f = [];
  try { f = await kostenPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); } catch (e) { f = ['Prüfung bricht ab – ' + String(e.message).split('\n')[0]]; }
  if (f.length) { fehler.push('Kosten:\n    - ' + f.join('\n    - ')); console.log('  FEHLER  Kosten'); } else { ok++; console.log('  ok      Kosten'); } }
// Bauherrenportal – Baustein bp/freigeben.js: Bereiche an/aus, Eingang mit Datei, Information, Freigabe mit PDF – siehe bauherren.mjs
{ let f = [];
  try { f = await bauherrenPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); } catch (e) { f = ['Prüfung bricht ab – ' + String(e.message).split('\n')[0]]; }
  if (f.length) { fehler.push('Bauherrenportal:\n    - ' + f.join('\n    - ')); console.log('  FEHLER  Bauherrenportal'); } else { ok++; console.log('  ok      Bauherrenportal'); } }
// Bauantrag – Angaben der Vordrucke (bauantrag-angaben.js): Liste, Eintragen, Kästchen, Antragsfeld, Rückgängig – siehe angaben.mjs
{ let f = [];
  try { f = await angabenPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); } catch (e) { f = ['Prüfung bricht ab – ' + String(e.message).split('\n')[0]]; }
  if (f.length) { fehler.push('Bauantrag-Angaben:\n    - ' + f.join('\n    - ')); console.log('  FEHLER  Bauantrag-Angaben'); } else { ok++; console.log('  ok      Bauantrag-Angaben'); } }
await b.close();
if (fehler.length) console.log('\n' + fehler.join('\n'));
console.log(`\nSpalten-Menü an ${spaltenGeprueft} Tabellen geprüft.`);
console.log(`\nOberflächentests: ${ok} in Ordnung, ${fehler.length} mit Fehlern.`);
process.exit(fehler.length ? 1 : 0);
