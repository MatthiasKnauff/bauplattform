// Bauherrenportal – Seite der Bauherr:innen (bauherren/static, 17.11.2026): Logo und Name des Büros im Kopf, Akzentfarbe, Titelbild,
// „Wo stehen wir?“ (Bauphasen), Kacheln mit „neu“, „Neu seit deinem letzten Besuch“ (Anrede du), Ansprechperson; am Handy ohne
// waagerechtes Rollen. Ohne Server (Antworten nachgebildet).
//
// Aufgerufen aus oberflaeche.mjs:  const fehler = await bauherrenPortalPruefen(browser, repoWurzel)   – allein: node tools/tests/ui/bauherrenportal.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

export async function bauherrenPortalPruefen(browser, repo) {
  const ST = path.join(repo, 'bauherren/static'), fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const heute = new Date(), tag = (n) => { const d = new Date(heute); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  const ICH = { angemeldet: true, konto: { name: 'Anna', email: 'a@b.de', kennwort: true, zfa: false },
    aussehen: { buero: 'GK3 Architektur', logo: png, farbe: '#7a5c2e', anrede: 'du', gruss: 'Schön, dass du da bist.' },
    projekte: [{ pid: '7', name: 'Erweiterung Tierheim', upload: true, nachricht: true,
      kopf: { bild: png.replace('png', 'jpeg'), bild_text: 'Ansicht Süd', anrede: '', ansprech: { name: 'Matthias Knauff', funktion: 'Bauleitung', tel: '0201 777', mail: 'm@b.de' },
        phasen: [{ n: 'Erd- und Gründungsarbeiten', von: tag(-60), bis: tag(-20) }, { n: 'Rohbau', von: tag(-19), bis: tag(30) }, { n: 'Innenausbau', von: tag(31), bis: tag(120) }] },
      pakete: [{ id: '7:foto:1', art: 'foto', titel: 'Decke über EG betoniert', stand: tag(-1), neu: true }, { id: '7:foto:2', art: 'foto', titel: 'Bodenplatte', stand: tag(-20), neu: false },
        { id: '7:plan:1', art: 'plan', titel: 'Grundriss OG', stand: tag(-3), neu: true }, { id: '7:termine:gantt:1', art: 'termine', titel: 'Bauzeitenplan', stand: tag(-2), neu: false }] }] };
  const ZP = { zeilen: [{ n: 'Rohbau', l: 0, s: tag(-30), f: tag(20), g: 1, m: 0, r: '', p: 40 }, { n: 'Mauerwerk', l: 1, s: tag(-30), f: tag(5), g: 0, m: 0, c: '#5f7d8c', r: 'Bau GmbH', p: 70 },
    { n: 'Decke', l: 1, s: tag(6), f: tag(20), g: 0, m: 0, c: '#5f7d8c', r: 'Bau GmbH', p: 0 }, { n: 'Richtfest', l: 0, s: tag(25), f: tag(25), g: 0, m: 1, r: '', p: 0 }], fortschritt: true };
  const CSP = "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; frame-ancestors 'none'; base-uri 'none'";   // wie bauherren/app.py
  const lauf = async (breit) => {
    const ctx = await browser.newContext({ viewport: { width: breit, height: 900 } }), p = await ctx.newPage();
    p.on('pageerror', (e) => fehler.push(`${breit}px: Fehler im Skript – ${e.message}`));
    await p.route('http://bh.test/**', (r) => {
      const pf = new URL(r.request().url()).pathname;
      if (pf === '/') return r.fulfill({ contentType: 'text/html', headers: { 'Content-Security-Policy': CSP }, body: fs.readFileSync(path.join(ST, 'index.html'), 'utf8') });
      if (pf === '/static/zeitplan.js') return r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(repo, 'shared/bpcore/head/zeitplan.js')) });
      if (pf.startsWith('/api/paket/')) return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ titel: 'Bauzeitenplan', stand: tag(-2), daten: { zeitplan: ZP, zeilen: [['Leistung', 'Beginn', 'Ende']] } }) });
      if (pf.startsWith('/static/')) { const f = path.join(ST, pf.slice(8)); return fs.existsSync(f) ? r.fulfill({ contentType: f.endsWith('.css') ? 'text/css' : 'text/javascript', body: fs.readFileSync(f) }) : r.fulfill({ status: 404, body: '' }); }
      if (pf === '/api/ich') return r.fulfill({ contentType: 'application/json', body: JSON.stringify(ICH) });
      return r.fulfill({ contentType: 'application/json', body: '[]' });
    });
    try {
      await p.goto('http://bh.test/'); await p.waitForSelector('.bh-p', { timeout: 10000 });
      const v = await p.evaluate(() => ({
        kopf: document.querySelector('.bh-k b').textContent, logo: !!document.querySelector('.bh-k img.logo'), farbe: getComputedStyle(document.documentElement).getPropertyValue('--af').trim(),
        held: !!document.querySelector('.held img'), titel: document.querySelector('.held h1').textContent, gruss: (document.querySelector('.gruss') || {}).textContent,
        phasen: [...document.querySelectorAll('.phasen > div')].map((x) => x.className), kach: [...document.querySelectorAll('.kach button')].map((x) => x.textContent),
        feed: (document.querySelector('.feed .mu') || {}).textContent, an: (document.querySelector('.an b') || {}).textContent, quer: document.documentElement.scrollWidth > innerWidth + 1 }));
      pruef(v.kopf === 'GK3 Architektur' && v.logo && v.farbe === '#7a5c2e', `${breit}px: Kopf/Farbe – ${JSON.stringify(v)}`);
      pruef(v.held && v.titel === 'Erweiterung Tierheim' && v.gruss === 'Schön, dass du da bist.', `${breit}px: Titelbild/Begrüßung`);
      pruef(v.phasen.join() === 'f,a,', `${breit}px: Bauphasen fertig/aktiv/offen – ${v.phasen}`);
      pruef(v.kach.some((t) => /Fotos2/.test(t) && /1 neu/.test(t)) && v.kach.some((t) => /Datei senden/.test(t)), `${breit}px: Kacheln – ${v.kach.join(' | ')}`);
      pruef(v.feed === 'Neu seit deinem letzten Besuch' && v.an === 'Deine Ansprechperson: Matthias Knauff', `${breit}px: Anrede du – ${v.feed} / ${v.an}`);
      pruef(!v.quer, `${breit}px: Seite rollt waagerecht`);
      await p.click('.kach button'); await p.waitForSelector('.pk em.neu', { timeout: 3000 });
      pruef(await p.evaluate(() => document.querySelector('h1').textContent === 'Fotos'), `${breit}px: Kachel öffnet den Bereich`);
      // Termine: Bauzeitenplan als Balken (bp/zeitplan.js) unter der strengen CSP des Portals – Lagen per CSSOM, nicht als style-Attribut
      const csp = []; p.on('console', (m) => { if (/Content Security Policy/i.test(m.text())) csp.push(m.text()); });
      await p.evaluate(() => [...document.querySelectorAll('button')].find((b) => /Zurück/.test(b.textContent)).click());
      await p.evaluate(() => [...document.querySelectorAll('.kach button')].find((b) => /Termine/.test(b.textContent)).click());
      await p.click('button.pk'); await p.waitForSelector('.zp td.bal .bar', { timeout: 5000 });
      const z = await p.evaluate(() => ({ bars: [...document.querySelectorAll('.zp td.bal .bar')].map((b) => Math.round(b.getBoundingClientRect().width)), ms: document.querySelectorAll('.zp .ms').length,
        heute: !!document.querySelector('.zp .heute'), farbe: getComputedStyle(document.querySelectorAll('.zp td.bal .bar')[1]).backgroundColor, firma: (document.querySelector('.zp .bl') || {}).textContent,
        quer: document.documentElement.scrollWidth > innerWidth + 1, seite: !!document.querySelector('.zp-l [data-zz="monat"]') }));
      pruef(z.bars.length === 3 && z.bars.every((w) => w > 2) && z.ms === 1 && z.heute && z.farbe === 'rgb(95, 125, 140)' && z.firma === 'Bau GmbH' && z.seite, `${breit}px: Bauzeitenplan im Portal – ${JSON.stringify(z)}`);
      pruef(!z.quer, `${breit}px: Bauzeitenplan – Seite rollt waagerecht (nur der Plan darf rollen)`);
      pruef(!csp.length, `${breit}px: CSP verletzt – ${csp[0]}`);
      await p.click('.zp-l [data-zz="monat"]'); await p.click('.zp tr.grp .c-n');
      pruef(await p.evaluate(() => document.querySelectorAll('.zp tbody tr').length) === 2, `${breit}px: Gruppe zuklappen`);
    } catch (e) { fehler.push(`${breit}px: Prüfung bricht ab – ` + String(e.message).split('\n')[0]); }
    await ctx.close();
  };
  await lauf(1300); await lauf(390);
  return fehler;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await bauherrenPortalPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
  await b.close(); console.log(f.length ? f.join('\n') : 'ok'); process.exit(f.length ? 1 : 0);
}
