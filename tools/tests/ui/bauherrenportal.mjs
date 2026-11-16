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
        { id: '7:plan:1', art: 'plan', titel: 'Grundriss OG', stand: tag(-3), neu: true }] }] };
  const lauf = async (breit) => {
    const ctx = await browser.newContext({ viewport: { width: breit, height: 900 } }), p = await ctx.newPage();
    p.on('pageerror', (e) => fehler.push(`${breit}px: Fehler im Skript – ${e.message}`));
    await p.route('http://bh.test/**', (r) => {
      const pf = new URL(r.request().url()).pathname;
      if (pf === '/') return r.fulfill({ contentType: 'text/html', body: fs.readFileSync(path.join(ST, 'index.html'), 'utf8') });
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
