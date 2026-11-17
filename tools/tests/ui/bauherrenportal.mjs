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
      pakete: [{ id: '7:foto:1', art: 'foto', titel: 'Decke über EG betoniert', stand: tag(-1), neu: true, v: 5, karte: { bilder: [{ v: 2, g: 0, t: 'Decke 1' }, { v: 3, g: 1, t: 'Decke 2' }] } },
        { id: '7:foto:2', art: 'foto', titel: 'Bodenplatte', stand: tag(-20), neu: false, karte: { bilder: [{ v: 1, g: 0, t: 'Bodenplatte' }] } },
        { id: '7:plan:1:b', art: 'plan', titel: 'Grundriss OG – Index B', stand: tag(-3), neu: true, karte: { index: 'B', bilder: [{ v: 1, g: 0 }] } },
        { id: '7:plan:1:a', art: 'plan', titel: 'Grundriss OG – Index A', stand: tag(-30), neu: false, karte: { index: 'A' } },
        { id: '7:bericht:9', art: 'tagesbericht', titel: 'Tagesbericht Nr. 9', stand: tag(-1), neu: true, karte: { wetter: '8 °C · bewölkt', text: 'Decke über EG betoniert.', bilder: [{ v: 3, g: 1 }, { v: 4, g: 2 }] } },
        { id: '7:info:1', art: 'info', titel: 'Wasserzähler wird am Montag gesetzt.', stand: tag(-2), neu: true, karte: { text: 'Wasserzähler wird am Montag gesetzt. Bitte den Kellerzugang offen lassen.' } },
        { id: '7:maengel:1', art: 'maengel', titel: 'Riss Kellerwand', stand: tag(-4), neu: false, karte: { status: { text: 'offen mit Frist', ton: 'offen', frist: tag(-1) } } },
        { id: '7:maengel:2', art: 'maengel', titel: 'Fuge Bad', stand: tag(-6), neu: false, karte: { status: { text: 'erledigt', ton: 'ok' } } },
        { id: '7:termine:gantt:1', art: 'termine', titel: 'Bauzeitenplan', stand: tag(-2), neu: false }] }] };
  const PNG = Buffer.from(png.split(',')[1], 'base64');
  const PDF = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF');
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
      if (pf.startsWith('/api/paket/7/7%3Aplan') || pf.startsWith('/api/paket/7/7:plan')) return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ titel: 'Grundriss OG', stand: tag(-3), daten: { dateien: [{ nr: 0, name: 'Grundriss OG B.pdf', mime: 'application/pdf' }, { nr: 1, name: 'vorschau-0.jpg', mime: 'image/jpeg' }] } }) });
      if (pf.startsWith('/api/paket/')) return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ titel: 'Bauzeitenplan', stand: tag(-2), daten: { zeitplan: ZP, zeilen: [['Leistung', 'Beginn', 'Ende']] } }) });
      if (pf.startsWith('/api/datei/')) return /plan/.test(decodeURIComponent(pf)) && /\/0$/.test(pf) ? r.fulfill({ contentType: 'application/pdf', body: PDF }) : r.fulfill({ contentType: 'image/png', body: PNG });
      if (pf.startsWith('/static/pdfjs/')) return r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(repo, 'plattform/static/vendor/pdfjs', pf.slice(14))) });
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
      await p.click('.kach button'); await p.waitForSelector('.raster img', { timeout: 3000 });
      pruef(await p.evaluate(() => document.querySelector('h1').textContent === 'Fotos'), `${breit}px: Kachel öffnet den Bereich`);
      // Ansichten (17.11.2026): Fotos nach Tagen mit großer Ansicht, Pläne als Karten, Bautagebuch als Zeitleiste, Informationen, Mängel mit Schild, PDF im Portal
      const bereich = async (t) => { await p.evaluate(() => [...document.querySelectorAll('button')].find((b) => /Zurück/.test(b.textContent)).click());
        await p.evaluate((t) => [...document.querySelectorAll('.kach button')].find((b) => b.textContent.includes(t)).click(), t); };
      const f = await p.evaluate(() => ({ tage: document.querySelectorAll('.fotos .tag').length, bilder: document.querySelectorAll('.raster img').length, src: document.querySelector('.raster img').getAttribute('src') }));
      pruef(f.tage === 2 && f.bilder === 3 && /\/api\/datei\/7\/7%3Afoto%3A1\/2\?v=5$/.test(f.src), `${breit}px: Fotos nach Tagen – ${JSON.stringify(f)}`);
      await p.click('.raster button'); await p.waitForSelector('.lb img');
      const lb1 = await p.evaluate(() => [document.querySelector('.lb img').getAttribute('src'), document.querySelector('.lb-u').textContent]);
      await p.keyboard.press('ArrowRight'); const lb2 = await p.evaluate(() => document.querySelector('.lb-u').textContent);
      pruef(/\/0\?v=5$/.test(lb1[0]) && /Decke 1.*1 von 3/.test(lb1[1]) && /Decke 2.*2 von 3/.test(lb2), `${breit}px: Foto groß + weiter – ${lb1} / ${lb2}`);
      await p.click('.lb-x'); pruef(!(await p.$('.lb')), `${breit}px: Foto groß schließt mit ✕`);
      await bereich('Pläne');
      const pl = await p.evaluate(() => ({ n: document.querySelectorAll('.pkarte').length, t: document.querySelector('.pkarte').textContent, img: !!document.querySelector('.pkarte img') }));
      pruef(pl.n === 1 && /Grundriss OG/.test(pl.t) && /Index B/.test(pl.t) && /frühere Stände: A/.test(pl.t) && pl.img, `${breit}px: Pläne als Karte – ${JSON.stringify(pl)}`);
      await p.click('.pk-b'); await p.waitForSelector('.pdfs canvas', { timeout: 8000 }).catch(() => {});
      const pv = await p.evaluate(() => ({ cv: document.querySelectorAll('.pdfs canvas').length, dl: !!document.querySelector('.pdfv a.pk-dl'), vor: [...document.querySelectorAll('figure img')].length }));
      pruef(pv.cv === 1 && pv.dl && pv.vor === 0, `${breit}px: Plan im Portal ansehen (pdf.js, ohne Vorschaubild) – ${JSON.stringify(pv)}`);
      await bereich('Bautagebuch');
      const geladen = await p.waitForFunction(() => [...document.querySelectorAll('.zl-f img')].every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 4000 }).then(() => true, () => false);
      pruef(geladen, `${breit}px: Fotos in der Zeitleiste laden nicht`);
      const bt = await p.evaluate(() => ({ n: document.querySelectorAll('.zl').length, t: document.querySelector('.zl').textContent, f: document.querySelectorAll('.zl-f img').length }));
      pruef(bt.n === 1 && /8 °C/.test(bt.t) && /Decke über EG betoniert/.test(bt.t) && /Bericht als PDF/.test(bt.t) && bt.f === 2, `${breit}px: Bautagebuch-Zeitleiste – ${JSON.stringify(bt)}`);
      await bereich('Informationen');
      const inf = await p.evaluate(() => ({ neu: !!document.querySelector('.info.neu'), t: document.querySelector('.info').textContent }));
      pruef(inf.neu && /Kellerzugang/.test(inf.t), `${breit}px: Informationen als Karte – ${JSON.stringify(inf)}`);
      await bereich('Mängel');
      const mg = await p.evaluate(() => [...document.querySelectorAll('.schild')].map((x) => x.className + ':' + x.textContent));
      pruef(mg.length === 2 && /faellig:offen mit Frist · bis/.test(mg[0]) && /schild ok:erledigt/.test(mg[1]), `${breit}px: Mängel mit Schild – ${mg.join(' | ')}`);
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
