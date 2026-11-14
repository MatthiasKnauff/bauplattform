// Versand: überall derselbe Dialog (bp/versand.js) – Ablauftest im echten Browser mit nachgebildeten Server-Antworten.
// Geprüft: (1) BPHead.unterlagenSenden – Vorschlag der App wird aus den Beteiligten des Projekts ergänzt (Name, Adresse), Senden geht mit Anhang,
// Art, Projekt und „einzeln“ an /api/bp/versand. (2) „📋 Vorlage“ setzt Betreff und Text mit {projekt}, {firma}, {ich} ein. (3) „Vorschau für“.
// (4) Kommunikation: „Neue Nachricht“ öffnet den gemeinsamen Dialog, nicht mehr den eigenen. (5) Druckseite und Ansehen-Fenster kennen „Senden“.
//
// Aufgerufen aus oberflaeche.mjs:  const fehler = await versandPruefen(browser, repoWurzel)   – allein: node tools/tests/ui/versand.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

export async function versandPruefen(browser, repo) {
  const KASTEN = path.join(repo, 'shared/bpcore/head'), STAT = path.join(repo, 'plattform/static');
  const BK = /BAUKASTEN = \(([^)]*)\)/.exec(fs.readFileSync(path.join(repo, 'shared/bpcore/head.py'), 'utf8'))[1].match(/"[^"]+"/g).map((s) => s.slice(1, -1));
  const baukasten = 'void 0;\n' + BK.map((f) => fs.readFileSync(path.join(KASTEN, f), 'utf8')).join('\n;\n');
  const fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  const BET = [{ id: 1, name: 'Muster Rohbau GmbH', gewerk: 'Rohbau', email: 'info@rohbau.test', rolle: 'Auftrag Rohbau' }, { id: 2, name: 'Elektro Beispiel', gewerk: 'Elektro', email: 'mail@elektro.test', rolle: 'Bautagebuch' }];
  const LEER = '<!doctype html><html lang="de"><head><meta charset="utf-8"><link rel="stylesheet" href="bp/bp.css"><link rel="stylesheet" href="bp/head.css"></head><body><script src="bp/baukasten.js"></script><script src="bp/head.js"></script></body></html>';

  async function seite(html, name) {
    const ctx = await browser.newContext({ viewport: { width: 1300, height: 900 } }), p = await ctx.newPage(), gesendet = [];
    p.on('pageerror', (e) => fehler.push(`${name}: JavaScript-Fehler: ` + String(e.message || e).split('\n')[0]));
    await p.route('http://v.test/**', (r) => {
      const q = r.request(), pf = new URL(q.url()).pathname.replace(/^\//, '');
      if (pf === '') return r.fulfill({ contentType: 'text/html', body: html });
      if (pf === 'bp/baukasten.js') return r.fulfill({ contentType: 'text/javascript', body: baukasten });
      const f = pf.startsWith('bp/') ? path.join(KASTEN, pf.slice(3)) : pf.startsWith('static/') ? path.join(STAT, pf.slice(7)) : null;
      if (f) return fs.existsSync(f) ? r.fulfill({ contentType: f.endsWith('.css') ? 'text/css' : 'text/javascript', body: fs.readFileSync(f) }) : r.fulfill({ status: 404, body: '' });
      if (pf === 'api/bp/versand' && q.method() === 'POST') { gesendet.push(q.postData() || ''); return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, weg: 'test', betreff: 'x', neue_adressen: [] }) }); }
      const a = pf === 'api/me' ? { ok: true, id: 1, name: 'admin', vorname: 'Matthias', nachname: 'Test', role: 'admin', admin: true, look: {}, theme: 'hell' }
        : pf === 'api/platform' ? { apps: [{ key: 'kommunikation', name: 'Kommunikation', url: '/', allowed: true }], user: { name: 'admin' }, projekte: [{ id: 1, name: 'A481 Tierheim' }] }
        : pf === 'api/bp/versand/beteiligte' || pf === 'api/beteiligte' ? BET
        : pf === 'api/bp/textvorlagen' ? { vorlagen: [{ id: 'a', name: 'Terminbestätigung', betreff: 'Termin {projekt}', text: 'Guten Tag {firma},\n\nbitte bestätigen.\n\n{ich}' }] }
        : pf === 'api/vorgang/arten' ? [{ key: 'telefon', name: 'Telefonat', ic: '☎' }] : /kom$|antworten|vorgaenge|kontakte|mailadressen|liste|neuigkeit|projekte/.test(pf) ? [] : {};
      return r.fulfill({ contentType: 'application/json', body: JSON.stringify(a) });
    });
    await p.goto('http://v.test/');
    await p.waitForFunction(() => window.BPHead && BPHead.unterlagenSenden && BPHead.versand, null, { timeout: 20000 });
    return { p, ctx, gesendet };
  }

  try {   // (1)–(3) der Baustein
    const { p, ctx, gesendet } = await seite(LEER, 'Baustein');
    await p.evaluate(() => { BPHead.me = { id: 1, name: 'admin', vorname: 'Matthias', nachname: 'Test' };   // setzt sonst die App (BPHead.init)
      BPHead.unterlagenSenden(BPHead.mailVorgabe({ name: 'Bauvertrag Rohbau.pdf', pdf: async () => new Blob(['%PDF-1.4'], { type: 'application/pdf' }), art: 'bauvertrag', pid: 1, projekt: 'A481 Tierheim', einzeln: true,
      an: [{ contact_id: 1, name: '', email: '', on: true }] })); });
    await p.waitForSelector('.bpv [data-e]', { timeout: 10000 });
    const an = await p.evaluate(() => [...document.querySelectorAll('.bpv [data-e]')].map((c) => c.closest('label').textContent.trim().split(/\s{2,}/)[0] + (c.checked ? ' ✓' : '') + (c.disabled ? ' aus' : '')));
    pruef(an.length === 2 && /^Muster Rohbau GmbH.*✓$/.test(an[0]) && !/✓/.test(an[1]), 'Empfänger: die Firma der App soll mit Name und Adresse aus dem Projekt angehakt sein, die übrigen Beteiligten nicht – gezeigt: ' + an.join(' | '));
    await p.click('.bpv [data-v="vl"]'); await p.waitForSelector('.bpv [data-vlp]'); await p.click('.bpv [data-vlp]');
    const txt = await p.evaluate(() => [document.querySelector('.bpv [data-betreff]').value, document.querySelector('.bpv [data-text]').value]);
    pruef(txt[0] === 'Termin A481 Tierheim' && /Guten Tag Muster Rohbau GmbH,/.test(txt[1]) && /Matthias Test$/.test(txt[1]), 'Vorlage: Platzhalter nicht ersetzt – ' + JSON.stringify(txt));
    await p.click('.bpv [data-v="ok"]'); await p.waitForFunction(() => !document.querySelector('.bpv'), null, { timeout: 10000 });
    const body = gesendet[0] || '';
    pruef(gesendet.length === 1 && /name="art"\r\n\r\nbauvertrag/.test(body) && /name="pid"\r\n\r\n1/.test(body) && /name="einzeln"\r\n\r\n1/.test(body) && /filename="Bauvertrag Rohbau\.pdf"/.test(body) && /info@rohbau\.test/.test(body),
      'Senden: an /api/bp/versand gehören Art, Projekt, „einzeln“, Empfänger:in und das PDF als Anhang');
    // Vorschau für …
    await p.evaluate(() => { BPHead.versand({ titel: 'Test', empfaenger: [{ name: 'Firma A', email: 'a@firma.test', on: true }], betreff: 'B', text: '{anrede}', vorschau: async (x, V) => ({ an: x.email, betreff: V.betreff + '!', text: 'Sehr geehrte Frau A' }), senden: async () => {} }); });
    await p.click('.bpv [data-v="vs"]'); await p.waitForFunction(() => { const b = document.querySelector('.bpv [data-vsb]'); return b && !b.hidden; }, null, { timeout: 5000 });
    pruef(/An: a@firma\.test/.test(await p.evaluate(() => document.querySelector('.bpv [data-vsb]').textContent)), '„Vorschau für“ zeigt die Mail der gewählten Empfänger:in nicht');
    await ctx.close();
  } catch (e) { fehler.push('Baustein: Prüfung bricht ab – ' + String(e.message).split('\n')[0]); }

  try {   // (4) Kommunikation
    const { p, ctx } = await seite(fs.readFileSync(path.join(STAT, 'kommunikation.html'), 'utf8'), 'Kommunikation');
    await p.waitForFunction(() => typeof verfassen === 'function', null, { timeout: 20000 });
    await p.evaluate(() => { BPHead.projekt = { id: 1, name: 'A481 Tierheim' }; verfassen('n', { an: [{ name: 'Muster Rohbau GmbH', email: 'info@rohbau.test', contact_id: 1 }], betreff: 'Statik' }); });
    await p.waitForSelector('.bpv [data-betreff]', { timeout: 10000 });
    pruef(await p.evaluate(() => !document.querySelector('.kv') && document.querySelector('.bpv h3').textContent === 'Neue Nachricht' && !!document.querySelector('.bpv [data-bpneu="nachricht"].on') && !!document.querySelector('.bpv [data-v="vl"]')),
      'Kommunikation: „Neue Nachricht“ soll der gemeinsame Dialog sein (mit Leiste „＋ Neu“ und Vorlagen)');
    await ctx.close();
  } catch (e) { fehler.push('Kommunikation: Prüfung bricht ab – ' + String(e.message).split('\n')[0]); }

  // (5) Druckseite und Ansehen-Fenster: „Senden“ über denselben Baustein
  pruef(/data-d="mail"/.test(fs.readFileSync(path.join(KASTEN, 'druck.js'), 'utf8')) && /unterlagenSenden\(BPHead\.mailVorgabe/.test(fs.readFileSync(path.join(KASTEN, 'druck.js'), 'utf8')), 'Druckseite (druck.js): „✉ Senden“ über BPHead.unterlagenSenden fehlt');
  pruef(/data-gv="ml"/.test(fs.readFileSync(path.join(KASTEN, 'head.js'), 'utf8')), 'Ansehen-Fenster (head.js): „Per Mail senden“ fehlt');
  return fehler;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await versandPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
  await b.close(); console.log(f.length ? f.join('\n') : 'ok'); process.exit(f.length ? 1 : 0);
}
