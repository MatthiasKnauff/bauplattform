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
    // Mock „Behörden in den Adressen“ (BH-0 … BH-4, 22.11.2026): Art ganz oben, Person in einer Zeile, Maske stellt sich je Art um
    const lage = await p.evaluate(() => { const r = (el) => el.getBoundingClientRect(), g = document.querySelector('.bph-dm-g'), z = document.querySelector('.bph-kpz');
      const top = (e) => Math.round(r(e).top);
      return { artOben: g.firstElementChild.querySelector('[data-kmart]') !== null, zeile: z && [...z.children].every((e) => Math.abs(top(e) - top(z.children[0])) < 3),
        funktionHalb: r(document.querySelector('[data-kmf="role"]')).width < r(document.querySelector('[data-kmf="name"]')).width * 0.7,
        innenOhneRahmen: getComputedStyle(document.querySelector('[data-chipin="trade"]')).borderTopWidth === '0px' }; });
    pruef(lage.artOben && lage.zeile && lage.funktionHalb && lage.innenOhneRahmen, `Anordnung: Art oben, Person in einer Zeile, Funktion halb breit – ${JSON.stringify(lage)}`);
    await p.evaluate(() => { const s = document.querySelector('.bph-kpz select'); if (!s) return; const w = document.createElement('span'); w.className = 'bph-pa'; w.innerHTML = '<input value="Anrede –">'; s.replaceWith(w); });   // wie head.js (projektAuswahl) die Auswahl ersetzt – hier ohne head.js
    const at = await p.evaluate(() => { const a = document.querySelector('.bph-kpz > :first-child'), t = document.querySelector('[data-kmfi="ap_titel"]'); return a && t ? [a.getBoundingClientRect().right, t.getBoundingClientRect().left] : null; });
    pruef(at && at[0] <= at[1] + 1, `Anrede schiebt sich über den Titel (22.11.2026, „rof.“ statt „Prof.“) – ${JSON.stringify(at)}`);
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
    {   // Behörde: Amt statt Gewerk, „Kira Potschka M.A.“ zerlegt; Bauherr:in: Name in der Personenzeile
      await p.evaluate(() => { document.querySelectorAll('.bph-dlg-bg').forEach((x) => x.remove()); window.D = null;
        bpKontakt({ id: 6, name: 'Stadt Duisburg', art: '', trade: 'Amt für Baurecht', contact_person: 'Kira Potschka M.A.' }, { voll: true, speichern: async (d) => { window.D = d; return d; } }); });
      await p.waitForSelector('[data-kmart]');
      let z = await p.evaluate(() => ({ n: document.querySelector('[data-kmf="contact_person"]').value, zu: document.querySelector('[data-kmfi="ap_zusatz"]').value }));
      pruef(z.n === 'Kira Potschka' && z.zu === 'M.A.', `älterer Eintrag zerlegt: ${JSON.stringify(z)}`);
      await p.selectOption('[data-kmart]', 'behoerde');
      z = await p.evaluate(() => ({ amt: !document.querySelector('[data-kmfi="amt"]').closest('[data-fuer]').hidden, gw: document.querySelector('[data-chips="trade"]').closest('[data-fuer]').hidden, lab: document.querySelector('[data-kmnlab]').textContent }));
      pruef(z.amt && z.gw && z.lab === 'Behörde', `Behörde: Amt statt Gewerk – ${JSON.stringify(z)}`);
      await p.fill('[data-kmfi="amt"]', 'Bauordnungsamt'); await p.click('[data-kms]'); await p.waitForTimeout(200);
      z = await p.evaluate(() => window.D && { art: D.art, amt: D.firma.amt, zu: D.firma.ap_zusatz, cp: D.contact_person });
      pruef(z && z.art === 'behoerde' && z.amt === 'Bauordnungsamt' && z.zu === 'M.A.' && z.cp === 'Kira Potschka', `Behörde gespeichert: ${JSON.stringify(z)}`);
      // Plotdienst als feste Art (23.11.2026): ältere „Plotservice“ werden erkannt, Maske wie Firma (Gewerk sichtbar)
      await p.evaluate(() => { document.querySelectorAll('.bph-dlg-bg').forEach((x) => x.remove()); window.D = null;
        bpKontakt({ id: 8, name: 'Plot & Druck GmbH', art: 'Plotservice' }, { voll: true, speichern: async (d) => { window.D = d; return d; } }); });
      await p.waitForSelector('[data-kmart]');
      z = await p.evaluate(() => ({ art: document.querySelector('[data-kmart]').value, gw: !document.querySelector('[data-chips="trade"]').closest('[data-fuer]').hidden }));
      pruef(z.art === 'plotdienst' && z.gw, `Plotdienst als feste Art, Maske wie Firma: ${JSON.stringify(z)}`);
      await p.evaluate(() => { document.querySelectorAll('.bph-dlg-bg').forEach((x) => x.remove()); window.D = null;
        bpKontakt({ id: 7, name: 'Herr Dr. Otto Probe', art: 'bauherr' }, { voll: true, speichern: async (d) => { window.D = d; return d; } }); });
      await p.waitForSelector('[data-kmart]');
      z = await p.evaluate(() => ({ imZeile: !!document.querySelector('.bph-kpz [data-kmf="name"]'), name: document.querySelector('[data-kmf="name"]').value, ti: document.querySelector('[data-kmfi="ap_titel"]').value, lab: document.querySelector('[data-kmplab]').textContent }));
      pruef(z.imZeile && z.name === 'Otto Probe' && z.ti === 'Dr.' && z.lab === 'Person', `Bauherr:in als Person: ${JSON.stringify(z)}`);
      await p.check('[data-kmfi="ist_firma"]');
      pruef(await p.evaluate(() => !document.querySelector('.bph-kpz [data-kmf="name"]') && !document.querySelector('[data-kmf="contact_person"]').hidden), '„ist eine Firma“: Name wieder oben, Ansprechpartner:in in der Zeile');
    }
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
