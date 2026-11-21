// Adressen aufräumen (GO 19.11.2026, Mock „Adressen aufräumen“: A1 B1 C1 D1 + Duplikate unter demselben Knopf) – Ablauftest im echten Browser,
// Server nachgebildet. Geprüft: „🧹 Aufräumen“ öffnet das Fenster mit den Reitern Doppelte Adressen · Gewerk · Art · Stichwörter · Tags; im Reiter
// Gewerk je Gruppe Werte, Ziel und „Zusammenführen (n)“, Aufteilen gelb; Klick schickt den Vorschlag mit dem gewählten Ziel; „Nicht ähnlich“ meldet
// den Schlüssel und nimmt die Gruppe heraus; der Reiter „Doppelte Adressen“ zeigt die Zahl der Duplikate.
//
// Aufgerufen aus oberflaeche.mjs:  const fehler = await adrAufraeumenPruefen(browser, repoWurzel)   – allein: node tools/tests/ui/adraufraeumen.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

export async function adrAufraeumenPruefen(browser, repo) {
  const KASTEN = path.join(repo, 'shared/bpcore/head'), STAT = path.join(repo, 'plattform/static');
  const BK = /BAUKASTEN = \(([^)]*)\)/.exec(fs.readFileSync(path.join(repo, 'shared/bpcore/head.py'), 'utf8'))[1].match(/"[^"]+"/g).map((s) => s.slice(1, -1));
  const baukasten = 'void 0;\n' + BK.map((f) => fs.readFileSync(path.join(KASTEN, f), 'utf8')).join('\n;\n');
  const fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); }, J = (o) => ({ contentType: 'application/json', body: JSON.stringify(o) }), post = [];
  const VOR = { 'kontakt.trade': { titel: 'Gewerk', werte: [['Elektro', 9], ['Elektroarbeiten', 4], ['Heizung Sanitär', 3]], vorschlaege: [
    { art: 'zusammen', schluessel: 'elektro|elektroarbeit', grund: 'Wortstamm', werte: [{ w: 'Elektro', n: 9 }, { w: 'Elektroarbeiten', n: 4 }], ziel: 'Elektro' },
    { art: 'aufteilen', schluessel: 'teil|heizungsanitaer', grund: 'mehrere Gewerke in einem Eintrag', werte: [{ w: 'Heizung Sanitär', n: 3 }], ziel: ['Heizung', 'Sanitär'] }] } };
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } }), p = await ctx.newPage();
  p.on('pageerror', (e) => fehler.push('Fehler im Skript – ' + e.message));
  const leite = (r) => { const u = new URL(r.request().url()), pf = u.pathname.replace(/^\/adressen\//, '');
    if (pf === '') return r.fulfill({ contentType: 'text/html', body: fs.readFileSync(path.join(STAT, 'adressen.html'), 'utf8') });
    if (pf === 'bp/baukasten.js') return r.fulfill({ contentType: 'text/javascript', body: baukasten });
    const f = pf.startsWith('bp/') ? path.join(KASTEN, pf.slice(3)) : pf.startsWith('static/') ? path.join(STAT, pf.slice(7)) : null;
    if (f) return fs.existsSync(f) ? r.fulfill({ contentType: f.endsWith('.css') ? 'text/css' : 'text/javascript', body: fs.readFileSync(f) }) : r.fulfill({ status: 404, body: '' });
    if (pf === 'api/me') return r.fulfill(J({ ok: true, id: 1, name: 'admin', is_admin: true, apps: [], start: { ohne_projekt: true, gefragt: true } }));
    if (pf === 'api/platform') return r.fulfill(J({ apps: [], user: { name: 'admin' } }));
    if (pf === 'api/contacts') return r.fulfill(J([{ id: 1, name: 'Dach GmbH', kind: 'firma', trade: 'Elektro', projects: [], site_of: '' }]));
    if (pf === 'api/contacts/duplikate') return r.fulfill(J([{ ids: [1, 2], kontakte: [] }, { ids: [3, 4], kontakte: [] }]));
    const m = /^api\/bp\/aufraeumen\/([\w.]+)(\/\w+)?$/.exec(pf);
    if (m && !m[2]) return r.fulfill(J(VOR[m[1]] || { titel: m[1], werte: [], vorschlaege: [] }));
    if (m) { post.push([m[2], JSON.parse(r.request().postData() || '{}')]); return r.fulfill(J(m[2] === '/anwenden' ? { n: 13, rueck: [{ id: 1, alt: 'Elektroarbeiten' }] } : { ok: true })); }
    return r.fulfill(J(/liste|kontakte|neuigkeit/.test(pf) ? [] : {})); };
  await p.route('http://portal.test/**', leite);
  try {
    await p.goto('http://portal.test/adressen/'); await p.waitForSelector('#dup', { timeout: 10000 }); await p.waitForTimeout(300);
    pruef(/Aufräumen/.test(await p.textContent('#dup')), 'Knopf heißt nicht „Aufräumen“');
    {   // 21.11.2026: Befehlsleiste wie in allen Apps statt eigener Knopfreihe – am Handy EINE Zeile (vorher fünf), Zahl und Sortieren in einer Zeile
      const mess = () => p.evaluate(() => { const b = document.querySelector('#bfl .bf'), k = [...document.querySelectorAll('#bfl .bf-k')].filter((x) => x.offsetParent), z = document.querySelector('.kz'), li = document.querySelector('#list');
        return { h: b ? Math.round(b.getBoundingClientRect().height) : 0, zeilen: new Set(k.map((x) => Math.round(x.getBoundingClientRect().top))).size, neu: !!document.querySelector('#bfl .bf-neu #neu'), an: (document.querySelector('#bfl [aria-pressed="true"]') || {}).textContent,
          oben: Math.round((li.hidden ? document.querySelector('#tw') : li).getBoundingClientRect().top), kz: Math.round(z.getBoundingClientRect().height), quer: document.documentElement.scrollWidth > innerWidth + 1, alt: !!document.querySelector('.bar') }; });
      let m = await mess();
      pruef(m.h > 20 && m.zeilen === 1 && m.neu && !m.alt && /Tabelle|Karten/.test(m.an || ''), `Befehlsleiste am Rechner: ${JSON.stringify(m)}`);
      if (process.env.BILD) await p.screenshot({ path: process.env.BILD });
      // Handy wie in oberflaeche.mjs (Berührung, 390 px – dort sind Knöpfe und Auswahl größer): Leiste in einer Zeile, Sortieren · Richtung · Filter in einer Zeile, nichts ragt heraus
      const c2 = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }), h = await c2.newPage();
      await h.route('http://portal.test/**', leite); await h.goto('http://portal.test/adressen/'); await h.waitForSelector('#dup', { state: 'attached', timeout: 10000 });
      await h.evaluate(() => { TV.sort = { k: 'contact_person', d: 1 }; TV.flt = { name: 'a', trade: 'b' }; setView('karten'); }); await h.waitForTimeout(400);
      m = await h.evaluate(() => { const b = document.querySelector('#bfl .bf'), k = [...document.querySelectorAll('#bfl .bf-k')].filter((x) => x.offsetParent), z = document.querySelector('.kz'), kb = document.querySelector('#kb');
        return { h: Math.round(b.getBoundingClientRect().height), zeilen: new Set(k.map((x) => Math.round(x.getBoundingClientRect().top))).size, kz: Math.round(z.getBoundingClientRect().height), kb: Math.round(kb.getBoundingClientRect().right), ih: innerWidth, quer: document.documentElement.scrollWidth - innerWidth }; });
      if (process.env.ZEIG) console.log(JSON.stringify(m), await h.evaluate(() => [...document.querySelectorAll('#kb > *, .kz, #pane')].map((x) => x.id + ':' + Math.round(x.getBoundingClientRect().left) + '-' + Math.round(x.getBoundingClientRect().right))));
      pruef(m.zeilen === 1 && m.h < 110 && m.kz < 120 && m.quer <= 1 && m.kb <= m.ih, `Handy: Leiste in einer Zeile, Sortieren kompakt, kein Querrollen – ${JSON.stringify(m)}`);
      if (process.env.BILD) await h.screenshot({ path: process.env.BILD.replace('.png', '-handy.png') });
      await c2.close();
      await p.setViewportSize({ width: 1400, height: 900 }); await p.waitForTimeout(300);
    }
    await p.click('#dup'); await p.waitForSelector('[data-afok="0"]', { timeout: 8000 });
    const s = await p.evaluate(() => ({ reiter: [...document.querySelectorAll('[data-afr]')].map((x) => x.textContent), gr: document.querySelectorAll('.af-g').length, gelb: document.querySelectorAll('.af-g.zerl').length, knopf: document.querySelector('[data-afok="0"]').textContent }));
    pruef(s.reiter.length === 5 && /Doppelte Adressen · 2/.test(s.reiter[0]) && /Gewerk · 2/.test(s.reiter[1]) && s.gr === 2 && s.gelb === 1 && /Zusammenführen \(13\)/.test(s.knopf), 'Fenster: ' + JSON.stringify(s));
    if (process.env.SHOT) await p.screenshot({ path: process.env.SHOT });
    await p.click('[data-afzw="0"][data-w="Elektroarbeiten"]'); await p.click('[data-afok="0"]'); await p.waitForTimeout(300);
    const a = post.find((x) => x[0] === '/anwenden');
    pruef(a && a[1].vorschlaege[0].ziel === 'Elektroarbeiten' && a[1].vorschlaege[0].werte.length === 2, 'Zusammenführen schickt Werte und gewähltes Ziel – ' + JSON.stringify(post));
    await p.click('[data-afnein="1"]'); await p.waitForTimeout(300);
    pruef(post.some((x) => x[0] === '/nicht' && x[1].schluessel === 'teil|heizungsanitaer'), '„So lassen“ meldet den Schlüssel');
    await p.click('[data-afr="dup"]'); await p.waitForTimeout(200);
    pruef(await p.isVisible('[data-afdup]'), 'Reiter „Doppelte Adressen“: Knopf „Durchsehen …“ fehlt');
  } catch (e) { fehler.push('bricht ab – ' + String(e.message).split('\n')[0]); }
  await ctx.close();
  return fehler;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await adrAufraeumenPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); await b.close();
  console.log(f.length ? 'FEHLER:\n' + f.join('\n') : 'ok'); process.exit(f.length ? 1 : 0);
}
