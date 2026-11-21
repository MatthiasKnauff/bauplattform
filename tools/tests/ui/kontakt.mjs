// Kontaktmaske (bp/kontakt.js, besprochen am 15.11.2026): Ansprechpartner:in neben dem Gewerk, Funktion halb breit; Gewerk, Stichwörter
// und Tags als Bausteine mit Vorschlägen aus den Adressen (?begriffe=1) – Enter übernimmt den Vorschlag, Neues nur über „＋ neu“,
// Rücktaste im leeren Feld nimmt den letzten Baustein weg; Baustein-Feld so hoch wie ein normales Feld (auch mit bp.css/head.css danach geladen); gespeichert wird mit Komma getrennt. Ablauftest im echten Browser, ohne Server.
//
// Aufgerufen aus oberflaeche.mjs:  const fehler = await kontaktPruefen(browser, repoWurzel)   – allein: node tools/tests/ui/kontakt.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { ESC } from './esc.mjs';

export async function kontaktPruefen(browser, repo) {
  const R = path.join(repo, 'shared/bpcore/head/'), fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  const p = await browser.newPage({ viewport: { width: 760, height: 1000 } });
  p.on('pageerror', (e) => fehler.push('Fehler im Skript – ' + e.message));
  await p.route('http://kontakt.test/**', (r) => { const u = r.request().url();
    const js = /\/bp\/([\w-]+\.js)$/.exec(new URL(u).pathname); if (js) return r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(R + js[1], 'utf8') });   // nachgeladene Bausteine (begriffe.js)
    if (u.includes('suggest')) { const o = new URL(u).searchParams.get('ort') || ''; return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ items: [{ name: 'Bauordnungsamt' + (o ? ' ' + o : ''), trade: 'Amt', city: o || 'Bremerhaven' }] }) }); }
    if (u.includes('begriffe')) return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ trade: [['Gerüstbau', 14], ['Dachdecker', 9]], stichworte: [['Container', 6]], tags: [['Stammfirma', 21]] }) });
    if (u.endsWith('/seite')) return r.fulfill({ contentType: 'text/html', body: `<!doctype html><meta charset=utf-8><body>${ESC}<script>${fs.readFileSync(R + 'kontakt.js', 'utf8')}</script><style>${fs.readFileSync(R + 'bp.css', 'utf8')}${fs.readFileSync(R + 'head.css', 'utf8')}</style>` });
    return r.fulfill({ contentType: 'application/json', body: '{}' }); });
  try {
    await p.goto('http://kontakt.test/seite');
    await p.evaluate(() => { bpKontakt({ id: 5, name: 'Fa. Dunker', trade: 'Baustelleneinrichtung', tags: 'Stammfirma' }, { voll: true, speichern: async (d) => { window.D = d; return d; } }); });
    await p.waitForSelector('[data-chipin="trade"]');
    const lage = await p.evaluate(() => { const r = (k) => document.querySelector(`[data-kmf="${k}"]`).closest('.bph-dm-f').getBoundingClientRect();
      return { nebenGewerk: Math.abs(r('contact_person').top - r('trade').top) < 4, funktionHalb: r('role').width < r('name').width * 0.7,
        gleichHoch: ((a, b) => Math.abs(a.top - b.top) < 2 && Math.abs(a.height - b.height) < 2)(document.querySelector('.bph-chips').getBoundingClientRect(), document.querySelector('[data-kmf="contact_person"]').getBoundingClientRect()),
        innenOhneRahmen: getComputedStyle(document.querySelector('[data-chipin="trade"]')).borderTopWidth === '0px' }; });
    pruef(lage.nebenGewerk && lage.funktionHalb && lage.gleichHoch && lage.innenOhneRahmen, `Anordnung: Ansprechpartner:in neben Gewerk auf gleicher Höhe, Funktion halb breit, Eingabe im Baustein-Feld ohne eigenen Rahmen – ${JSON.stringify(lage)}`);
    await p.click('[data-chipin="trade"]'); await p.keyboard.type('Ger'); await p.waitForTimeout(400);
    pruef(await p.evaluate(() => /Gerüstbau/.test(document.querySelector('[data-chl="trade"]').textContent)), 'Gewerk: kein Vorschlag „Gerüstbau“ beim Tippen von „Ger“');
    pruef(await p.evaluate(() => { const z = [...document.querySelectorAll('[data-chl="trade"] [data-chipw]')].find((x) => /Gerüstbau/.test(x.textContent)); return !!(z && z.querySelector('[data-bpbegr="kontakt.trade"]')); }), 'Gewerk-Vorschlag ohne 🗑 (löschen mit Ersatz)');
    await p.keyboard.press('Enter');
    await p.click('[data-chipin="stichworte"]'); await p.keyboard.type('Gründach'); await p.waitForTimeout(150);
    pruef(await p.evaluate(() => /＋ neu/.test(document.querySelector('[data-chl="stichworte"]').textContent)), 'Stichwort: neuer Begriff ohne „＋ neu“');
    await p.keyboard.press('Enter');
    await p.click('[data-chipin="tags"]'); await p.keyboard.press('Backspace');
    await p.click('[data-kms]'); await p.waitForTimeout(200);
    const D = await p.evaluate(() => window.D && { trade: D.trade, stichworte: D.stichworte, tags: D.tags });
    pruef(D && D.trade === 'Baustelleneinrichtung, Gerüstbau' && D.stichworte === 'Gründach' && D.tags === '', `Gespeichert: ${JSON.stringify(D)}`);
    // Neuer Kontakt: Firmen und Ämter aus dem Netz beim Namen; ein eingetragener Ort verfeinert die Suche (GO 17.11.2026)
    await p.evaluate(() => { document.querySelectorAll('.bph-dlg-bg').forEach((x) => x.remove()); bpKontakt({}, { voll: true, speichern: async (d) => d }); });
    await p.waitForSelector('[data-kmsug]', { state: 'attached', timeout: 5000 });
    await p.fill('[data-kmf="name"]', 'Bauordnungsamt'); await p.waitForTimeout(700);
    const v1 = await p.evaluate(() => document.querySelector('[data-kmsug]').textContent);
    await p.fill('[data-kmf="city"]', 'Essen'); await p.waitForTimeout(700);
    const v2 = await p.evaluate(() => document.querySelector('[data-kmsug]').textContent);
    pruef(/Bremerhaven|Bauordnungsamt/.test(v1) && /Bauordnungsamt Essen/.test(v2) && /um Essen/.test(v2), `Netzsuche: Ort verfeinert nicht – vorher „${v1}“, nachher „${v2}“`);
  } catch (e) { fehler.push('bricht ab – ' + String(e.message).split('\n')[0]); }
  await p.close();
  return fehler;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await kontaktPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
  await b.close(); console.log(f.length ? f.join('\n') : 'ok'); process.exit(f.length ? 1 : 0);
}
