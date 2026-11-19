// Mein Ordner (GO 19.11.2026, Mock „Mein Ordner“: A1 B1 C1) – Ablauftest im echten Browser mit nachgebildeten Server-Antworten.
// Geprüft: (1) Menü unter dem Benutzernamen: „Mein Ordner“ mit dem Namen des Ordners; ohne Eintrag ausgegraut mit „In Mein Konto festlegen“ (C1).
// (2) Mein Konto: Abschnitt „Mein Ordner“ zeigt die Wurzel der Verwaltung, schlägt den vorhandenen Ordner mit dem eigenen Namen vor (C1),
//     Klick auf einen Ordner + Speichern schickt nur den Namen (A1).
// (3) Pläne & Dateien: unter „Ansicht“ klein „Benutzerordner“ mit dem eigenen Ordner; Klick lädt „Alle Dateien“ mit project_id = −Benutzer-ID.
//
// Aufgerufen aus oberflaeche.mjs:  const fehler = await meinOrdnerPruefen(browser, repoWurzel)   – allein: node tools/tests/ui/meinordner.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

export async function meinOrdnerPruefen(browser, repo) {
  const KASTEN = path.join(repo, 'shared/bpcore/head'), STAT = path.join(repo, 'plattform/static');
  const BK = /BAUKASTEN = \(([^)]*)\)/.exec(fs.readFileSync(path.join(repo, 'shared/bpcore/head.py'), 'utf8'))[1].match(/"[^"]+"/g).map((s) => s.slice(1, -1));
  const baukasten = 'void 0;\n' + BK.map((f) => fs.readFileSync(path.join(KASTEN, f), 'utf8')).join('\n;\n');
  const fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  const APPS = [{ key: 'plaene', name: 'Pläne & Dateien', allowed: true, url: '/plaene', port: 1 }];

  async function seite(name, url, html, stand) {
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } }), p = await ctx.newPage(), put = [], alle = [];
    p.on('pageerror', (e) => fehler.push(`${name}: JavaScript-Fehler: ` + String(e.message || e).split('\n')[0]));
    await p.route('http://mo.test/**', (r) => {
      const u = new URL(r.request().url()), pf = u.pathname.replace(/^\/(plaene\/)?/, '');
      if (pf === '') return r.fulfill({ contentType: 'text/html', body: fs.readFileSync(path.join(STAT, html), 'utf8') });
      if (pf === 'bp/baukasten.js') return r.fulfill({ contentType: 'text/javascript', body: baukasten });
      const f = pf.startsWith('bp/') ? path.join(KASTEN, pf.slice(3)) : pf.startsWith('static/') ? path.join(STAT, pf.slice(7)) : null;
      if (f) return fs.existsSync(f) ? r.fulfill({ contentType: f.endsWith('.css') ? 'text/css' : 'text/javascript', body: fs.readFileSync(f) }) : r.fulfill({ status: 404, body: '' });
      const J = (o) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(o) });
      if (pf === 'api/bp/meinordner') {
        if (r.request().method() === 'PUT') { const d = JSON.parse(r.request().postData() || '{}'); put.push(d); stand.ordner = d.ordner; }
        return J({ ...stand, ...(u.searchParams.get('liste') === '1' ? { liste: ['Anna', 'Matthias', 'Team'], vorschlag: stand.ordner ? '' : 'Matthias' } : {}) });
      }
      if (pf === 'api/alle') { alle.push(u.searchParams.get('project_id')); return J({ basis: 'Mitarbeiter/Matthias', dateien: [['Notizen.docx', 2000, 1763550000, 2]], ordner: [], arten: { office: ['docx'] }, vorschau: [] }); }
      if (pf === 'api/me') return J({ ok: true, id: 5, name: 'mk', vorname: 'Matthias', role: 'admin', admin: true, look: {} });
      if (pf === 'api/platform') return J({ apps: APPS, projekte: [] });
      if (pf === 'api/projekte') return J([{ id: 3, name: 'A450 Bochum', mine: true, archived: false }]);
      if (pf === 'api/bp/konto') return J({ uid: 5, admin: false, sig_platz: {} });
      if (/(^|\/)api\//.test(pf)) return J(/liste|kontakte|neuigkeit|verlauf|fehler|versandliste/.test(pf) ? [] : pf === 'api/plaene' ? { plaene: [], sonstige: [], gewerke: [], firmen: [] } : {});
      return r.fulfill({ status: 404, body: '' });
    });
    await p.goto(url); await p.waitForSelector('.bph-who', { timeout: 10000 }); await p.waitForTimeout(500);
    return { p, ctx, put, alle };
  }
  const menue = async (p) => { await p.evaluate(() => document.querySelector('.bph-who').click()); await p.waitForTimeout(400);
    const t = await p.evaluate(() => { const b = document.querySelector('.bph-menu [data-meinordner]'); return b ? { t: b.textContent.replace(/\s+/g, ' ').trim(), aus: b.classList.contains('bph-aus') } : null; });
    await p.keyboard.press('Escape'); return t; };

  // (1) Menü mit und ohne Ordner
  let S = await seite('Startseite mit Ordner', 'http://mo.test/', 'portal.html', { wurzel: 'Mitarbeiter', ordner: 'Matthias', pid: -5 });
  let m = await menue(S.p);
  pruef(m && /Mein Ordner/.test(m.t) && /Matthias/.test(m.t) && !m.aus, `Menü: „Mein Ordner · Matthias“ erwartet, ist ${JSON.stringify(m)}`);
  await S.ctx.close();
  S = await seite('Startseite ohne Ordner', 'http://mo.test/', 'portal.html', { wurzel: 'Mitarbeiter', ordner: '', pid: -5 });
  m = await menue(S.p);
  pruef(m && m.aus && /In Mein Konto festlegen/.test(m.t), `ohne Ordner: ausgegraut mit „In Mein Konto festlegen“ erwartet (C1), ist ${JSON.stringify(m)}`);
  // (2) Mein Konto: Abschnitt mit Vorschlag, Wahl, Speichern
  await S.p.evaluate(() => BPHead.konto()); await S.p.waitForTimeout(700);
  const k = await S.p.evaluate(() => { const el = document.querySelector('[data-kmo]'); return el ? { text: el.textContent, wert: (el.querySelector('[data-mo-in]') || {}).value, chips: el.querySelectorAll('[data-mo-w]').length } : null; });
  pruef(k && /Mitarbeiter \//.test(k.text) && k.wert === 'Matthias' && /Vorschlag/.test(k.text) && k.chips === 3, `Mein Konto: Wurzel, Vorschlag „Matthias“ und drei Ordner erwartet, ist ${JSON.stringify(k)}`);
  await S.p.evaluate(() => document.querySelector('[data-mo-w="Anna"]').click());
  await S.p.evaluate(() => document.querySelector('[data-mo-ok]').click()); await S.p.waitForTimeout(500);
  pruef(S.put.length === 1 && S.put[0].ordner === 'Anna', `Speichern schickt nur den Ordnernamen (A1): ${JSON.stringify(S.put)}`);
  await S.ctx.close();
  // (3) Pläne & Dateien: Benutzerordner in der Navigation, Klick lädt den eigenen Ordner
  S = await seite('Pläne & Dateien', 'http://mo.test/plaene/', 'plaene.html', { wurzel: 'Mitarbeiter', ordner: 'Matthias', pid: -5 });
  await S.p.waitForTimeout(600);
  const n = await S.p.evaluate(() => { const g = document.querySelector('#navL .ng.ng-mo'); return g ? g.textContent.replace(/\s+/g, ' ').trim() : ''; });
  pruef(/Benutzerordner/.test(n) && /Matthias/.test(n), `Navigation: „Benutzerordner · Matthias“ erwartet, ist „${n}“`);
  await S.p.evaluate(() => document.querySelector('#navL [data-tab="ich"]').click()); await S.p.waitForTimeout(900);
  pruef(S.alle.includes('-5'), `Klick auf den Ordner lädt „Alle Dateien“ mit project_id −5, geladen: ${JSON.stringify(S.alle)}`);
  const a = await S.p.evaluate(() => ({ on: !!document.querySelector('#navL [data-tab="ich"].on'), datei: /Notizen\.docx/.test(document.querySelector('#viewA') ? document.querySelector('#viewA').textContent : '') }));
  pruef(a.on && a.datei, `eigener Ordner gewählt und Datei zu sehen erwartet: ${JSON.stringify(a)}`);
  await S.ctx.close();
  return fehler;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch();
  const f = await meinOrdnerPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
  await b.close();
  console.log(f.length ? f.join('\n') : 'ok'); process.exit(f.length ? 1 : 0);
}
