// Windows-App anbieten (GO 17.11.2026) – Ablauftest im echten Browser auf der Startseite mit nachgebildeten Server-Antworten.
// Geprüft: (1) Unter Windows im Browser kommt einmal das Angebot „Bauplattform als Windows-App“ mit Nicht mehr fragen · Später · App installieren;
// „Später“ wird gemerkt, in derselben Sitzung kommt es nicht noch einmal. (2) Wer die App schon benutzt hat, „nie“ gesagt hat oder für den es noch kein
// Setup gibt, bekommt kein Angebot. (3) Unter dem Benutzernamen steht immer „Windows-App …“; das Fenster daraus führt zum Setup.
// (4) In der App selbst (window.bpDesktop) kein Angebot – die Seite meldet „genutzt“ mit Version. (5) Nicht unter Linux/Mac: kein Angebot, kein Menüpunkt.
//
// Aufgerufen aus oberflaeche.mjs:  const fehler = await winappPruefen(browser, repoWurzel)   – allein: node tools/tests/ui/winapp.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

const WIN = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

export async function winappPruefen(browser, repo) {
  const KASTEN = path.join(repo, 'shared/bpcore/head'), STAT = path.join(repo, 'plattform/static');
  const BK = /BAUKASTEN = \(([^)]*)\)/.exec(fs.readFileSync(path.join(repo, 'shared/bpcore/head.py'), 'utf8'))[1].match(/"[^"]+"/g).map((s) => s.slice(1, -1));
  const baukasten = 'void 0;\n' + BK.map((f) => fs.readFileSync(path.join(KASTEN, f), 'utf8')).join('\n;\n');
  const fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };

  async function lauf(name, { ua, stand, desktop }) {
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, userAgent: ua }), p = await ctx.newPage(), post = [];
    p.on('pageerror', (e) => fehler.push(`${name}: JavaScript-Fehler: ` + String(e.message || e).split('\n')[0]));
    if (desktop) await p.addInitScript((v) => { window.bpDesktop = { app: 'windows', version: v, server: 'produktion', erneut() {}, einstellungen() {} }; }, desktop);
    let setupAufgerufen = false;
    await p.route('http://portal.test/**', (r) => {
      const u = new URL(r.request().url()), pf = u.pathname.replace(/^\//, '');
      if (pf === '') return r.fulfill({ contentType: 'text/html', body: fs.readFileSync(path.join(STAT, 'portal.html'), 'utf8') });
      if (pf === 'bp/baukasten.js') return r.fulfill({ contentType: 'text/javascript', body: baukasten });
      const f = pf.startsWith('bp/') ? path.join(KASTEN, pf.slice(3)) : pf.startsWith('static/') ? path.join(STAT, pf.slice(7)) : null;
      if (f) return fs.existsSync(f) ? r.fulfill({ contentType: f.endsWith('.css') ? 'text/css' : 'text/javascript', body: fs.readFileSync(f) }) : r.fulfill({ status: 404, body: '' });
      if (pf === 'api/bp/winapp/setup') { setupAufgerufen = true; return r.fulfill({ status: 200, contentType: 'text/plain', body: 'Setup' }); }
      if (pf === 'api/bp/winapp') {
        if (r.request().method() === 'POST') { const d = JSON.parse(r.request().postData() || '{}'); post.push(d); return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ ...stand, genutzt: d.art === 'genutzt' || stand.genutzt }) }); }
        return r.fulfill({ contentType: 'application/json', body: JSON.stringify(stand) });
      }
      const J = (o) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(o) });
      if (pf === 'api/me') return J({ ok: true, id: 1, name: 'admin', vorname: 'A', role: 'admin', admin: true, look: {} });
      if (pf === 'api/platform') return J({ apps: [], projekte: [] });
      if (/(^|\/)api\//.test(pf)) return J(/liste|kontakte|neuigkeit|projekte|verlauf|fehler/.test(pf) ? [] : {});
      return r.fulfill({ status: 404, body: '' });
    });
    const sieh = () => p.evaluate(() => { const m = [...document.querySelectorAll('.modal')].find((x) => /Windows-App/.test(x.textContent));
      return m ? { titel: m.querySelector('h3').textContent, knoepfe: [...m.querySelectorAll('.acts button')].map((b) => b.textContent.trim()) } : null; });
    const menue = async () => { await p.evaluate(() => document.querySelector('.bph-who').click()); await p.waitForTimeout(150);
      const t = await p.evaluate(() => { const b = document.querySelector('.bph-menu [data-winapp]'); return b ? b.textContent.replace(/\s+/g, ' ').trim() : ''; });
      await p.keyboard.press('Escape'); return t; };
    try {
      await p.goto('http://portal.test/');
      await p.waitForSelector('.bph-who', { timeout: 10000 }); await p.waitForTimeout(2200);   // Angebot kommt 1,5 s nach dem Aufbau
      return { p, ctx, post, sieh, menue, setup: () => setupAufgerufen };
    } catch (e) { fehler.push(`${name}: bricht ab – ` + String(e.message).split('\n')[0]); await ctx.close(); return null; }
  }
  const NEU = { genutzt: false, nie: false, spaeter_bis: null, setup: true, setup_version: '2026.11.276', version: '' };

  // (1) Windows im Browser, noch nie benutzt → Angebot; „Später“ wird gemerkt, nach Neuladen kein zweites Mal
  let L = await lauf('Windows, neu', { ua: WIN, stand: NEU });
  if (L) {
    const m = await L.sieh();
    pruef(m && m.titel === 'Bauplattform als Windows-App', 'Windows im Browser: Angebot „Bauplattform als Windows-App“ fehlt');
    pruef(m && m.knoepfe.join('|') === 'Nicht mehr fragen|Später|App installieren', `Knöpfe: Nicht mehr fragen · Später · App installieren erwartet, sind ${m && m.knoepfe.join(' · ')}`);
    await L.p.evaluate(() => [...document.querySelectorAll('.modal .acts button')].find((b) => b.textContent.trim() === 'Später').click()); await L.p.waitForTimeout(200);
    pruef(!(await L.sieh()), '„Später“ schließt das Angebot nicht');
    pruef(L.post.some((d) => d.art === 'spaeter'), '„Später“ wird nicht gemerkt (POST api/bp/winapp art=spaeter)');
    await L.p.reload(); await L.p.waitForSelector('.bph-who'); await L.p.waitForTimeout(2200);
    pruef(!(await L.sieh()), 'Angebot kommt in derselben Sitzung ein zweites Mal');
    const t = await L.menue();
    pruef(/Windows-App installieren/.test(t), `Menü unter dem Benutzernamen: „Windows-App installieren“ fehlt (${t || 'kein Eintrag'})`);
    await L.p.evaluate(() => document.querySelector('.bph-who').click()); await L.p.waitForTimeout(100);
    await L.p.evaluate(() => document.querySelector('.bph-menu [data-winapp]').click()); await L.p.waitForTimeout(300);
    const f = await L.sieh();
    pruef(f && f.knoepfe.some((k) => /App installieren/.test(k)), 'Fenster aus dem Menü: Knopf „App installieren“ fehlt');
    await L.p.evaluate(() => [...document.querySelectorAll('.modal .acts button')].find((b) => /installieren/.test(b.textContent)).click()); await L.p.waitForTimeout(400);
    pruef(L.setup(), '„App installieren“ führt nicht zum Setup (api/bp/winapp/setup)');
    await L.ctx.close();
  }
  // (2) schon benutzt / nie / kein Setup → kein Angebot; Menüpunkt bleibt
  for (const [name, stand, menueText] of [['schon benutzt', { ...NEU, genutzt: true, version: '2026.11.276' }, /nutzt du schon/], ['nie fragen', { ...NEU, nie: true }, /installieren/], ['ohne Setup', { ...NEU, setup: false }, /installieren/]]) {
    L = await lauf('Windows, ' + name, { ua: WIN, stand });
    if (!L) continue;
    pruef(!(await L.sieh()), `Windows, ${name}: Angebot erscheint trotzdem`);
    const t = await L.menue();
    pruef(menueText.test(t), `Windows, ${name}: Menüpunkt passt nicht (${t || 'kein Eintrag'})`);
    await L.ctx.close();
  }
  // (4) in der App: kein Angebot, Meldung „genutzt“ mit Version, Menü zeigt die Version
  L = await lauf('in der App', { ua: WIN, stand: NEU, desktop: '2026.11.276' });
  if (L) {
    pruef(!(await L.sieh()), 'in der App: Angebot erscheint');
    pruef(L.post.some((d) => d.art === 'genutzt' && d.version === '2026.11.276'), 'in der App: „genutzt“ mit Version wird nicht gemeldet');
    const t = await L.menue();
    pruef(/Windows-App/.test(t) && /2026\.11\.276/.test(t), `in der App: Menüpunkt mit Version fehlt (${t || 'kein Eintrag'})`);
    await L.ctx.close();
  }
  // (5) Mac: weder Angebot noch Menüpunkt
  L = await lauf('Mac', { ua: MAC, stand: NEU });
  if (L) {
    pruef(!(await L.sieh()), 'Mac: Angebot erscheint');
    pruef(!(await L.menue()), 'Mac: Menüpunkt „Windows-App“ erscheint');
    await L.ctx.close();
  }
  return fehler;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await winappPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
  await b.close(); console.log(f.length ? f.join('\n') : 'ok'); process.exit(f.length ? 1 : 0);
}
