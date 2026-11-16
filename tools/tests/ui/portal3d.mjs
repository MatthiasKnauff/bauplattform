// Bauherrenportal, Seite der Bauherr:innen (bauherren/static/bh.js): Paket „Gebäude“ mit Räumen, Maßnahmen und 3D-Ansicht – unter der
// strengen CSP des Portals (style-src 'self', kein Inline-Stil): Betrachter wird von /static/ansicht3d.js geholt, Stil und Legende per CSSOM.
// Schritt 9 „Gebäudemodell als Mitte“ (16.11.2026). Ablauftest im echten Browser, nachgebildeter Portal-Server.
//
// Aufgerufen aus oberflaeche.mjs:  const fehler = await portal3dPruefen(browser, repoWurzel)   – allein: node tools/tests/ui/portal3d.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

const CSP = "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'";
const quader = (x0, y0, z0, x1, y1, z1) => {
  const P = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]];
  return [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]].flatMap(([a, b, c, d]) => [...P[a], ...P[b], ...P[c], ...P[a], ...P[c], ...P[d]]);
};

export async function portal3dPruefen(browser, repo) {
  const ST = path.join(repo, 'bauherren/static'), fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  const p = await browser.newPage({ viewport: { width: 420, height: 900 } });
  p.on('pageerror', (e) => fehler.push('Fehler im Skript – ' + e.message));
  const csp = []; p.on('console', (m) => { if (/Content Security Policy/i.test(m.text())) csp.push(m.text()); });
  const D = { titel: 'Gebäude', stand: '2026-11-16', daten: { text: 'Planstand „Entwurf“. 2 Räume mit zusammen 40,00 m².', zeilen: [['Raum', 'Geschoss', 'Fläche'], ['0.01 Wohnen', 'EG', '30,00 m²']],
    liste: ['Fenster: erneuern (6 St)'], netz: { e: [{ i: 10, t: 'w', g: 0, c: '', a: 0, v: quader(-500, -100, 0, 500, 100, 1500) }], geschosse: [{ n: 'Erdgeschoss', z: 0 }], dreiecke: 12, voll: true },
    netz_zeilen: [{ id: 'w', name: 'Außenwand', status: 'erneuern', ids: [10], nummern: [], kurz: '' }] } };
  await p.route('http://bh.test/**', (r) => {
    const u = new URL(r.request().url()).pathname, J = (o) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(o) });
    const H = { 'Content-Security-Policy': CSP };
    if (u === '/') return r.fulfill({ contentType: 'text/html', headers: H, body: fs.readFileSync(path.join(ST, 'index.html'), 'utf8') });
    if (u === '/static/ansicht3d.js') return r.fulfill({ contentType: 'text/javascript', headers: H, body: fs.readFileSync(path.join(repo, 'shared/bpcore/head/ansicht3d.js'), 'utf8') });
    if (u.startsWith('/static/')) return r.fulfill({ contentType: u.endsWith('.css') ? 'text/css' : 'text/javascript', headers: H, body: fs.readFileSync(path.join(ST, u.slice(8))) });
    if (u === '/api/ich') return J({ angemeldet: true, konto: { name: 'B. Herr', email: 'b@example.org' }, projekte: [{ pid: '7', name: 'Haus Muster', pakete: [{ id: '7:gebaeude:modell', art: 'gebaeude', titel: 'Gebäude', stand: '2026-11-16' }] }] });
    if (u.startsWith('/api/paket/')) return J(D);
    return r.fulfill({ status: 404, body: '' });
  });
  try {
    await p.goto('http://bh.test/');
    await p.waitForSelector('button.pk'); 
    pruef(await p.evaluate(() => [...document.querySelectorAll('.kach button')].some((x) => /Gebäude/.test(x.textContent))), 'Kachel „Gebäude“ in der Übersicht');   // Startseite seit 17.11.2026: Kacheln je Bereich
    await p.click('button.pk'); await p.waitForSelector('.d3 .b3 canvas'); await p.waitForTimeout(300);
    const a = await p.evaluate(() => { const k = document.querySelector('.b3-k i'), cv = document.querySelector('.b3 canvas');
      return { hoehe: cv.getBoundingClientRect().height, legende: k ? getComputedStyle(k).backgroundColor : '', raum: /0\.01 Wohnen/.test(document.body.textContent), mass: /Fenster: erneuern/.test(document.body.textContent),
        quer: document.documentElement.scrollWidth > innerWidth + 1 }; });
    pruef(a.hoehe >= 300, `3D-Ansicht ohne Stil (Höhe ${a.hoehe}) – CSSOM-Blatt greift nicht`);
    pruef(a.legende && a.legende !== 'rgba(0, 0, 0, 0)', `Legende ohne Farben: ${a.legende}`);
    pruef(a.raum && a.mass, 'Räume oder Maßnahmen fehlen');
    pruef(!a.quer, 'waagerechter Scrollbalken am Handy');
    pruef(!csp.length, 'CSP blockiert: ' + csp.slice(0, 2).join(' | '));
  } catch (e) { fehler.push('bricht ab – ' + String(e.message).split('\n')[0]); }
  await p.close();
  return fehler;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await portal3dPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
  await b.close(); console.log(f.length ? f.join('\n') : 'ok'); process.exit(f.length ? 1 : 0);
}
