// Stammdaten-Maske (BPHead.datenMaske): Feldart „auswahl“ (17.11.2026) – Liste mit üblichen Werten, gespeicherter Wert außerhalb der Liste
// bleibt wählbar, „✎ eigener Wert …“ macht ein Textfeld daraus, OK speichert den getippten Wert. Ohne Server (Antworten nachgebildet).
//
// Aufgerufen aus oberflaeche.mjs:  const fehler = await datenMaskePruefen(browser, repoWurzel)   – allein: node tools/tests/ui/datenmaske.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

export async function datenMaskePruefen(browser, repo) {
  const KASTEN = path.join(repo, 'shared/bpcore/head');
  const BK = /BAUKASTEN = \(([^)]*)\)/.exec(fs.readFileSync(path.join(repo, 'shared/bpcore/head.py'), 'utf8'))[1].match(/"[^"]+"/g).map((s) => s.slice(1, -1));
  const baukasten = 'void 0;\n' + BK.map((f) => fs.readFileSync(path.join(KASTEN, f), 'utf8')).join('\n;\n');
  const fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  const LEER = '<!doctype html><html lang="de"><head><meta charset="utf-8"><link rel="stylesheet" href="bp/bp.css"><link rel="stylesheet" href="bp/head.css"></head><body><script src="bp/baukasten.js"></script><script src="bp/head.js"></script></body></html>';
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 900 } }), p = await ctx.newPage();
  p.on('pageerror', (e) => fehler.push('JavaScript-Fehler: ' + String(e.message || e).split('\n')[0]));
  await p.route('http://dm.test/**', (r) => {
    const pf = new URL(r.request().url()).pathname.replace(/^\//, '');
    if (pf === '') return r.fulfill({ contentType: 'text/html', body: LEER });
    if (pf === 'bp/baukasten.js') return r.fulfill({ contentType: 'text/javascript', body: baukasten });
    if (pf.startsWith('bp/')) { const f = path.join(KASTEN, pf.slice(3)); return fs.existsSync(f) ? r.fulfill({ contentType: f.endsWith('.css') ? 'text/css' : 'text/javascript', body: fs.readFileSync(f) }) : r.fulfill({ status: 404, body: '' }); }
    if (pf === 'api/bp/listen') return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ kammer: ['Architektenkammer Nordrhein-Westfalen', 'AK eigene'] }) });
    const a = pf === 'api/me' ? { ok: true, id: 1, name: 'admin', role: 'admin', admin: true, look: {}, theme: 'hell' } : pf === 'api/platform' ? { apps: [], user: { name: 'admin' }, projekte: [] } : /neuigkeit|liste/.test(pf) ? [] : {};
    return r.fulfill({ contentType: 'application/json', body: JSON.stringify(a) });
  });
  try {
    await p.goto('http://dm.test/'); await p.waitForFunction(() => window.BPHead && BPHead.datenMaske, null, { timeout: 20000 });
    await p.evaluate(() => { window.GESP = null; BPHead.datenMaske({ titel: 'Test', gruppen: [{ titel: 'A', felder: [
      { k: 'strafe', l: 'Vertragsstrafe', typ: 'auswahl', opt: ['keine', '0,2 % je Werktag'] }, { k: 'kg', l: 'Kostengruppe', typ: 'auswahl', opt: [['331', '331 Tragende Außenwände'], ['332', '332 Nichttragende Außenwände']] },
      { k: 'alt', l: 'Alt', typ: 'auswahl', opt: ['a', 'b'] }]}], werte: { kg: '332', alt: 'früher von Hand' }, speichern: async (W) => { window.GESP = { ...W }; return {}; } }); });
    await p.waitForSelector('#dm_strafe');
    const o = await p.evaluate(() => ({ s: [...document.querySelectorAll('#dm_strafe option')].map((x) => x.textContent), kg: document.querySelector('#dm_kg').value, kgT: document.querySelector('#dm_kg').selectedOptions[0].textContent, alt: document.querySelector('#dm_alt').value }));
    pruef(o.s.join('|') === '–|keine|0,2 % je Werktag|✎ eigener Wert …', `Liste mit „eigener Wert …“ am Ende: ${o.s.join('|')}`);
    pruef(o.kg === '332' && o.kgT === '332 Nichttragende Außenwände', `Wert und Anzeige getrennt: ${o.kg} / ${o.kgT}`);
    pruef(o.alt === 'früher von Hand', 'gespeicherter Wert außerhalb der Liste bleibt stehen');
    await p.evaluate(() => { const s = document.querySelector('#dm_strafe'); s.value = '__eigen'; s.dispatchEvent(new Event('change', { bubbles: true })); });
    const ist = await p.evaluate(() => { const i = document.querySelector('#dm_strafe'); return { tag: i.tagName, fokus: document.activeElement === i }; });
    pruef(ist.tag === 'INPUT' && ist.fokus, `„eigener Wert …“ wird ein Textfeld mit Fokus: ${JSON.stringify(ist)}`);
    await p.fill('#dm_strafe', '0,25 % je Werktag'); await p.evaluate(() => document.querySelector('#dm_strafe').dispatchEvent(new Event('change', { bubbles: true })));
    const zur = await p.evaluate(() => { const s = document.querySelector('#dm_strafe'); return { tag: s.tagName, v: s.value, n: s.options ? s.options.length : 0 }; });
    pruef(zur.tag === 'SELECT' && zur.v === '0,25 % je Werktag' && zur.n > 3, `nach der Eingabe wieder Auswahl mit eigenem Wert: ${JSON.stringify(zur)}`);
    await p.click('[data-dms]'); await p.waitForFunction(() => window.GESP, null, { timeout: 5000 });
    const W = await p.evaluate(() => window.GESP);
    pruef(W.strafe === '0,25 % je Werktag' && W.kg === '332' && W.alt === 'früher von Hand', `gespeichert: ${JSON.stringify(W)}`);
    {   // Fenster stapeln (bp.js): ein Dialog aus dem Ansehen-Fenster liegt darüber, nicht dahinter (17.11.2026)
      const z = await p.evaluate(async () => { const v = document.createElement('div'); v.className = 'bph-gv'; document.body.appendChild(v); await new Promise((r) => setTimeout(r, 20));
        const bg = modalBox('<p>x</p>', () => {}); await new Promise((r) => setTimeout(r, 20)); const r = [+getComputedStyle(v).zIndex, +getComputedStyle(bg).zIndex]; bg.remove(); v.remove(); return r; });
      pruef(z[1] > z[0], `Dialog liegt hinter dem Ansehen-Fenster: ${z}`);
    }
    {   // Auswahl + frei mit Liste aus dem Kern (vorschlag.js, data-vs-kern → /api/bp/listen): erst beim Klick geladen, dann Vorschläge
      let n = 0; p.on('request', (q) => { if (q.url().includes('api/bp/listen')) n++; });
      await p.evaluate(() => { document.body.insertAdjacentHTML('beforeend', '<input id="kam" data-vs="kammer" data-vs-kern style="position:fixed;top:10px;left:10px">'); });
      await p.waitForTimeout(100); const vorher = n;
      await p.click('#kam'); await p.waitForSelector('.bp-vs-z', { timeout: 3000 }).catch(() => {});
      const z = await p.evaluate(() => [...document.querySelectorAll('.bp-vs-z b')].map((x) => x.textContent));
      pruef(vorher === 0 && n === 1 && z.join('|') === 'Architektenkammer Nordrhein-Westfalen|AK eigene', `Liste aus dem Kern: vorher ${vorher}, Abfragen ${n}, Liste ${z.join('|')}`);
      await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter'); pruef(await p.inputValue('#kam') === 'Architektenkammer Nordrhein-Westfalen', '↓ + Enter übernimmt den Vorschlag');
    }
    {   // eine Seite mit einklappbaren Gruppen statt Reitern (o.abschnitte, Ausschreibungsdaten 18.11.2026): Kopfzeile mit Zusammenfassung, offen/zu gemerkt
      await p.evaluate(() => { document.querySelectorAll('.bph-dlg-bg').forEach((x) => x.remove()); try { localStorage.clear(); } catch { /* egal */ }
        BPHead.datenMaske({ titel: 'Abschnitte', abschnitte: 'test', kurz: (g) => g.titel + ' kurz', gruppen: [{ titel: 'Eins', offen: true, felder: [{ k: 'a', l: 'A', typ: 'text' }] }, { titel: 'Zwei', felder: [{ k: 'b', l: 'B', typ: 'text' }] }], werte: {}, speichern: async () => ({}) }); });
      await p.waitForSelector('details.bph-dm-ab');
      const m = await p.evaluate(() => ({ tabs: document.querySelectorAll('.bph-dm-t').length, offen: [...document.querySelectorAll('details.bph-dm-ab')].map((d) => d.open), kurz: document.querySelector('details.bph-dm-ab summary small').textContent }));
      pruef(m.tabs === 0 && m.offen.join() === 'true,false' && m.kurz === 'Eins kurz', `Abschnitte: ${JSON.stringify(m)}`);
      await p.click('details.bph-dm-ab:nth-of-type(2) > summary'); await p.waitForTimeout(50);
      pruef(await p.evaluate(() => bpKlappOffen('test:1', false)) === ' open', 'aufgeklappte Gruppe wird gemerkt');
    }
  } catch (e) { fehler.push('Prüfung bricht ab – ' + String(e.message).split('\n')[0]); }
  await ctx.close();
  return fehler;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await datenMaskePruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
  await b.close(); console.log(f.length ? f.join('\n') : 'ok'); process.exit(f.length ? 1 : 0);
}
