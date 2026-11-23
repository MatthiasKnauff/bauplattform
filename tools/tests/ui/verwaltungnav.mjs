// Verwaltung: „Für mich“ abgesetzt von den Einstellungen des Büros (Mock „Persönlich in der Verwaltung“ A1, 19.11.2026) – Ablauftest im echten Browser.
// Geprüft: oben ein eigener Kasten „Für mich – <Name>“ (Klasse ng-ich) mit Mein Konto, Darstellung, KI, Benachrichtigungen; „Persönlich“ steht nicht mehr
// unter „Einstellungen“; Klick auf „KI“ zeigt die Seite mit der Überschrift „KI“ ohne Reiterzeile.
//
// Aufgerufen aus oberflaeche.mjs:  const fehler = await verwaltungNavPruefen(browser, repoWurzel)   – allein: node tools/tests/ui/verwaltungnav.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

export async function verwaltungNavPruefen(browser, repo) {
  const KASTEN = path.join(repo, 'shared/bpcore/head'), STAT = path.join(repo, 'plattform/static');
  const BK = /BAUKASTEN = \(([^)]*)\)/.exec(fs.readFileSync(path.join(repo, 'shared/bpcore/head.py'), 'utf8'))[1].match(/"[^"]+"/g).map((s) => s.slice(1, -1));
  const baukasten = 'void 0;\n' + BK.map((f) => fs.readFileSync(path.join(KASTEN, f), 'utf8')).join('\n;\n');
  let mailAus = '0'; const gesetzt = [];
  const fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } }), p = await ctx.newPage();
  p.on('pageerror', (e) => fehler.push('JavaScript-Fehler: ' + String(e.message || e).split('\n')[0]));
  await p.route('http://adm.test/**', (r) => {
    const u = new URL(r.request().url()), pf = u.pathname.replace(/^\/verwaltung\//, ''), J = (o) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(o) });
    if (pf === '') return r.fulfill({ contentType: 'text/html', body: fs.readFileSync(path.join(STAT, 'admin.html'), 'utf8') });
    if (pf === 'bp/baukasten.js') return r.fulfill({ contentType: 'text/javascript', body: baukasten });
    const f = pf.startsWith('bp/') ? path.join(KASTEN, pf.slice(3)) : pf.startsWith('static/') ? path.join(STAT, pf.slice(7)) : null;
    if (f) return fs.existsSync(f) ? r.fulfill({ contentType: f.endsWith('.css') ? 'text/css' : 'text/javascript', body: fs.readFileSync(f) }) : r.fulfill({ status: 404, body: '' });
    if (pf === 'api/me') return J({ ok: true, id: 1, name: 'Matthias Knauff', role: 'admin', admin: true, is_admin: true, look: {} });
    if (pf === 'api/bt/settings') { if (r.request().method() === 'PUT') { const b = r.request().postDataJSON(); gesetzt.push(b); if ('mail_aus' in b) mailAus = b.mail_aus; return J({ ok: true }); } return J({ mail_user: 'buero@firma.de', mail_pass_set: true, mail_aus: mailAus }); }
    if (pf === 'api/bp/post/zuweisung') return J({ benutzer: [], postfaecher: [], zuordnung: {} });
    if (pf === 'api/bp/kopf') return J({ conf: { apps: [], projekte: [] }, ki: { choice: 'ollama', providers: [{ key: 'ollama', label: 'Ollama', ok: true }] } });
    if (pf === 'api/rollen') return J({ rollen: ['Geschäftsführung', 'Büroleitung', 'Bauleitung', 'Mitarbeiter:in', 'Azubi', 'Praktikant:in', 'Extern'].map((n, i) => ({ key: 'r' + i, name: n, n: 1, modus: '', rechte: i ? [] : ['verwaltung', 'app.zeiten.aus'] })),
      rechte_liste: [{ key: 'verwaltung', gruppe: 'Verwaltung', name: 'Verwaltung', erkl: 'Alles in der Verwaltung einstellen' }],
      apps_liste: [{ key: 'zeiten', name: 'Zeiten', seiten: [] }, { key: 'ava', name: 'Ausschreibung & Abrechnung', seiten: [] }] });
    if (pf === 'api/platform') return J({ apps: [], projekte: [] });
    if (pf === 'api/bp/ki') return J({ choice: 'ollama', providers: [{ key: 'ollama', label: 'Ollama', ok: true }] });
    if (pf === 'api/bp/ki/stufen') return J({ buero: true, extern: false, grund: { extern: 'nicht erlaubt' } });
    if (/(^|\/)api\//.test(pf)) return J(/liste|kontakte|neuigkeit|projects|users|verlauf|fehler|akquisen|sessions/.test(pf) ? [] : {});
    return r.fulfill({ status: 404, body: '' });
  });
  try {
    await p.goto('http://adm.test/verwaltung/#einstellungen-ich:konto'); await p.waitForSelector('#navL .ng-ich', { timeout: 15000 });
    const n = await p.evaluate(() => ({ kopf: document.querySelector('#navL .ng-ich .nh').textContent, punkte: [...document.querySelectorAll('#navL .ng-ich [data-adm]')].map((x) => x.textContent.trim()),
      erste: document.querySelector('#navL .ng').classList.contains('ng-ich'), alt: [...document.querySelectorAll('#navL [data-adm="e:ich"]')].length }));
    pruef(/Für mich/.test(n.kopf) && /Matthias/.test(n.kopf) && n.punkte.join('|') === 'Mein Konto|Darstellung|KI|Benachrichtigungen' && n.erste && !n.alt, 'Kasten „Für mich“: ' + JSON.stringify(n));
    if (process.env.SHOT) await p.screenshot({ path: process.env.SHOT });
    await p.click('#navL [data-adm="i:ki"]'); await p.waitForSelector('#ichBox [data-kiv]', { timeout: 8000 });
    const s = await p.evaluate(() => ({ h1: (document.querySelector('#main .stnav h1') || {}).textContent, reiter: document.querySelectorAll('#main .bar.stnav [data-stab]').length, an: (document.querySelector('#navL .ng-ich .on') || {}).textContent }));
    pruef(s.h1 === 'KI' && !s.reiter && /KI/.test(s.an || ''), 'Seite KI aus „Für mich“: ' + JSON.stringify(s));
    {   // 20.11.2026: Rückgängig steht in der Verwaltung als ↶ ↷ oben rechts im Inhalt – keine Zeile unter der Kopfleiste, die erste Zeile macht Platz
      await p.waitForTimeout(1500);
      const u = await p.evaluate(() => { const z = document.querySelector('.adm-undo'), r = z.getBoundingClientRect(), m = document.querySelector('#main').getBoundingClientRect(), e = document.querySelector('#main > :first-child').getBoundingClientRect();
        return { knoepfe: z.querySelectorAll('.bf-k').length, rechts: m.right - r.right < 30 && r.top - m.top < 30, frei: e.right <= r.left + 1, zeile: !!document.querySelector('.bp-undo-zeile, .bph-uk') }; });
      pruef(u.knoepfe >= 2 && u.rechts && u.frei && !u.zeile, `Verwaltung: ↶ ↷ nicht oben rechts im Inhalt oder noch eine eigene Zeile (${JSON.stringify(u)})`);
      if (process.env.BILD) await p.screenshot({ path: process.env.BILD });
    }
    {   // 20.11.2026: „Mailversand deaktivieren“ am Büro-Postfach – ein Knopf mit Rückfrage, danach roter Kasten und „wieder einschalten“
      await p.goto('http://adm.test/verwaltung/#einstellungen-mail'); await p.waitForSelector('#mvAus [data-bs="mailaus"]', { timeout: 8000 });
      const v = await p.evaluate(() => ({ t: document.querySelector('#mvAus button').textContent, an: document.querySelector('#mvAus').classList.contains('an') }));
      await p.click('#mvAus [data-bs="mailaus"]'); await p.waitForSelector('.bph-dlg [data-f="ja"], .bph-dlg [data-f="ok"]', { timeout: 5000 });
      const frage = await p.evaluate(() => document.querySelector('.bph-dlg').textContent);
      await p.click('.bph-dlg [data-f="ja"], .bph-dlg [data-f="ok"]'); await p.waitForSelector('#mvAus.an', { timeout: 8000 });
      const n2 = await p.evaluate(() => document.querySelector('#mvAus').textContent);
      pruef(v.t === 'Mailversand deaktivieren' && !v.an && /Kennworts/.test(frage) && gesetzt.some((b) => b.mail_aus === '1') && /deaktiviert/.test(n2) && /wieder einschalten/.test(n2), 'Mailversand deaktivieren: ' + JSON.stringify({ v, n2, gesetzt }));
      if (process.env.BILD2) await p.screenshot({ path: process.env.BILD2 });
      await p.click('#mvAus [data-bs="mailaus"]'); await p.waitForSelector('#mvAus:not(.an)', { timeout: 8000 });
      pruef(gesetzt.some((b) => b.mail_aus === '0'), 'Mailversand wieder einschalten speichert nicht');
    }
    {   // 23.11.2026: Rollen & Rechte bei schmalem Fenster – Knöpfe brechen nicht um, die Tabelle rollt für sich; Apps auch für Rollen mit „Verwaltung“ wählbar
      await p.setViewportSize({ width: 1000, height: 800 });
      await p.goto('http://adm.test/verwaltung/#rollen'); await p.waitForSelector('.ro-t .ro-mod', { timeout: 8000 });
      const r = await p.evaluate(() => { const segs = [...document.querySelectorAll('.ro-t .seg')], hoch = segs.filter((s) => s.getBoundingClientRect().height > 2 * s.querySelector('button').getBoundingClientRect().height);
        const gf = [...document.querySelectorAll('.ro-t [data-roapp="r0"]')];
        return { hoch: hoch.length, seite: document.documentElement.scrollWidth <= innerWidth, gf: gf.length && gf.every((b) => !b.disabled), aus: (document.querySelector('.ro-t [data-roapp="r0"][data-app="zeiten"].pri') || {}).dataset?.s }; });
      pruef(!r.hoch && r.seite && r.gf && r.aus === 'aus', 'Rollen & Rechte bei 1.000 px: ' + JSON.stringify(r));
      if (process.env.BILD3) await p.screenshot({ path: process.env.BILD3, fullPage: true });
    }
  } catch (e) { fehler.push('bricht ab – ' + String(e.message).split('\n')[0]); }
  await ctx.close();
  return fehler;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await verwaltungNavPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); await b.close();
  console.log(f.length ? 'FEHLER:\n' + f.join('\n') : 'ok'); process.exit(f.length ? 1 : 0);
}
