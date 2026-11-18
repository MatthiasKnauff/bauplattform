// Leistungskatalog im Bauzeitenplan (gantt/public/library.js) – Ablauftest im echten Browser mit nachgebildetem Server.
// Geprüft, einmal mit Maus und einmal auf einem Gerät mit Finger (pointer: coarse): Auswahlfelder (Bezug) öffnen ihre Liste und sie bleibt offen,
// die Wahl wird gespeichert (eigene Leistung und Standardzeile); beim Tippen auf „Vorausgewählt bei“ bleibt die Tabelle stehen (senkrecht und
// waagerecht); Abschnitte: Alt+↑/↓ im Namen, Ziehen auf eine beliebige Zeile des Zielabschnitts, Fenster „Abschnitte“ (umbenennen, ziehen, Alt+↑/↓, neu, löschen) – keine ▲▼.
//
// Aufgerufen aus oberflaeche.mjs:  const fehler = await katalogPruefen(browser, repoWurzel)   – allein: node tools/tests/ui/katalog.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

export async function katalogPruefen(browser, repo) {
  const PUB = path.join(repo, 'gantt/public'), KASTEN = path.join(repo, 'shared/bpcore/head');
  const BK = /BAUKASTEN = \(([^)]*)\)/.exec(fs.readFileSync(path.join(repo, 'shared/bpcore/head.py'), 'utf8'))[1].match(/"[^"]+"/g).map((s) => s.slice(1, -1));
  const baukasten = 'void 0;\n' + BK.map((f) => fs.readFileSync(path.join(KASTEN, f), 'utf8')).join('\n;\n');
  const fehler = [];
  const J = (o) => ({ contentType: 'application/json', body: JSON.stringify(o) });
  const ART = (f) => (f.endsWith('.css') ? 'text/css' : f.endsWith('.js') ? 'text/javascript' : f.endsWith('.html') ? 'text/html' : 'application/octet-stream');

  async function lauf(name, finger, schmal, maus = !finger) {   // finger: Gerät mit Finger als Hauptzeiger; maus: bedient wird mit der Maus (Tablet oder Touch-Laptop mit Maus)
    const pruef = (ok, t) => { if (!ok) fehler.push(`${name}: ${t}`); };
    const ctx = await browser.newContext({ viewport: { width: schmal ? 900 : 1700, height: 800 }, hasTouch: finger }), p = await ctx.newPage();
    p.on('pageerror', (e) => { if (!/NaN/.test(e.message)) fehler.push(`${name}: Fehler im Skript – ${e.message}`); });
    const PUT = {};
    await p.route('http://portal.test/**', (r) => { const u = new URL(r.request().url()), pf = u.pathname.replace(/^\/gantt\//, '').replace(/^\//, '');
      if (pf === '' || pf === 'gantt') return r.fulfill({ contentType: 'text/html', body: fs.readFileSync(path.join(PUB, 'index.html'), 'utf8') });
      if (pf === 'bp/baukasten.js') return r.fulfill({ contentType: 'text/javascript', body: baukasten });
      const f = pf.startsWith('bp/') ? path.join(KASTEN, pf.slice(3)) : path.join(PUB, pf);
      if (!pf.startsWith('api/') && fs.existsSync(f) && fs.statSync(f).isFile()) return r.fulfill({ contentType: ART(f), body: fs.readFileSync(f) });
      if (!pf.startsWith('api/')) return r.fulfill({ status: 404, body: '' });
      if (r.request().method() === 'PUT') { try { PUT[pf] = JSON.parse(r.request().postData() || 'null'); } catch { /* egal */ } return r.fulfill(J({ ok: true })); }
      if (pf === 'api/me') return r.fulfill(J({ ok: true, id: 1, name: 'admin', vorname: 'A', role: 'admin', admin: true, is_admin: true, look: {}, katalog: true }));
      if (pf === 'api/platform') return r.fulfill(J({ apps: [], user: { name: 'admin', role: 'admin' }, projekte: [] }));
      if (pf === 'api/projects') return r.fulfill(J([{ id: 1, name: 'Testplan', updated: '2026-11-15' }]));
      if (/^api\/projects\/(1|undefined)$/.test(pf)) return r.fulfill(J({ id: 1, name: 'Testplan', rev: 1, start: 20773, nextUid: 3, tasks: [{ uid: 1, name: 'A', dur: 2, lvl: 0, preds: [] }, { uid: 2, name: 'B', dur: 3, lvl: 0, preds: [] }] }));
      if (pf === 'api/library') return r.fulfill(J([{ id: 'l1', n: 'Eigene Leistung', ph: 'planung', gw: 'Abbruch', din: '18459', sc: 'we', d: 2, a: [], b: [], rec: [] }, { id: 'l2', n: 'Bewehrungsabnahme', ph: 'rohbau', gw: 'Rohbau', din: '18330', sc: 'we', d: 1, a: [], b: [], rec: [] }]));
      return r.fulfill({ contentType: 'application/json', body: /projects$|firms|presets|liste|versions|neuigkeit|kontakte/.test(pf) ? '[]' : '{}' }); });
    const warte = (ms) => p.waitForTimeout(ms);
    const nimm = async () => { const o = p.locator('.bph-wahl-bg .bph-wahl-o:not(.on):not(.aus)').first(); if (!(await o.count())) return; const r = await o.boundingBox();   // einen anderen Eintrag wählen – mit Maus bzw. Finger
      if (!maus) await p.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); else await p.mouse.click(r.x + r.width / 2, r.y + r.height / 2); };
    const folge = () => p.evaluate(() => CATALOG.phases.map((x) => x.k));
    try {
      await p.goto('http://portal.test/gantt/'); await warte(2000);
      await p.evaluate(() => { showTab('katalog'); if (libEk || libZu.size) { libEk = 0; libZu = new Set(); renderLib(); } }); await warte(500);
      pruef(await p.evaluate(() => matchMedia('(pointer:coarse)').matches) === finger, 'Testumgebung: Zeigerart stimmt nicht');

      // 1 Auswahlfeld „Bezug“ einer eigenen Leistung: Liste öffnet, bleibt offen, Wahl wird gespeichert
      const SEL = '#libView tr[data-lid="l1"] select[data-k="sc"]';
      await p.locator(SEL).scrollIntoViewIfNeeded(); const bx = await p.locator(SEL).boundingBox();
      if (!maus) await p.touchscreen.tap(bx.x + bx.width / 2, bx.y + bx.height / 2); else await p.mouse.click(bx.x + bx.width / 2, bx.y + bx.height / 2);
      await warte(600);
      pruef(await p.evaluate(() => !!document.querySelector('.bph-wahl-bg .bph-wahl')), 'Auswahlfeld „Bezug“: die Liste ist nach dem Antippen nicht offen');
      await nimm(); await warte(600);
      const sc = await p.evaluate((S) => ({ lib: LIBRARY.find((x) => x.id === 'l1').sc, feld: document.querySelector(S).value, offen: !!document.querySelector('.bph-wahl-bg') }), SEL);
      pruef(sc.lib !== 'we' && sc.feld === sc.lib && !sc.offen, `Auswahlfeld „Bezug“: Wahl nicht übernommen (${JSON.stringify(sc)})`);
      pruef(Array.isArray(PUT['api/library']) && PUT['api/library'].some((x) => x.id === 'l1' && x.sc === sc.lib), 'Auswahlfeld „Bezug“: Wahl nicht gespeichert');

      // 2 Bezug einer Standardzeile
      const S2 = await p.evaluate(() => { const s = document.querySelector('#libView select[data-sscope]'); s.scrollIntoView({ block: 'center' }); return { id: s.dataset.sscope, v0: s.value }; });
      const b2 = await p.locator(`#libView select[data-sscope="${S2.id}"]`).boundingBox();
      if (!maus) await p.touchscreen.tap(b2.x + b2.width / 2, b2.y + b2.height / 2); else await p.mouse.click(b2.x + b2.width / 2, b2.y + b2.height / 2);
      await warte(600);
      pruef(await p.evaluate(() => !!document.querySelector('.bph-wahl-bg .bph-wahl')), 'Bezug der Standardleistung: die Liste ist nicht offen');
      await nimm(); await warte(600);
      const v2 = await p.evaluate((id) => ({ feld: document.querySelector(`#libView select[data-sscope="${id}"]`).value, scope: (window.CATSCOPE || {})[id] }), S2.id);
      pruef(v2.feld !== S2.v0 && v2.scope === v2.feld, `Bezug der Standardleistung nicht änderbar (${JSON.stringify(v2)})`);

      // 3 „Vorausgewählt bei“: die Tabelle bleibt stehen – senkrecht und waagerecht
      const r3 = await p.evaluate(async () => { const b = document.querySelector('#libView tr[data-lid="l2"] [data-rec]'); if (!b) return null; b.scrollIntoView({ block: 'center', inline: 'center' });
        const s = document.querySelector('#libView .fv-scroll'); await new Promise((r) => setTimeout(r, 100)); const vor = [s.scrollTop, s.scrollLeft, s.scrollWidth > s.clientWidth]; b.click(); await new Promise((r) => setTimeout(r, 700));
        const n = document.querySelector('#libView .fv-scroll'); return { vor, nach: [n.scrollTop, n.scrollLeft] }; });
      pruef(r3, '„Vorausgewählt bei“: Knopf fehlt');
      if (r3) { pruef(r3.vor[0] > 0 && Math.abs(r3.nach[0] - r3.vor[0]) < 2, `„Vorausgewählt bei“: Tabelle springt senkrecht (${r3.vor[0]} → ${r3.nach[0]})`);
        pruef(Math.abs(r3.nach[1] - r3.vor[1]) < 2, `„Vorausgewählt bei“: Tabelle springt waagerecht (${r3.vor[1]} → ${r3.nach[1]})`);
        if (schmal) pruef(r3.vor[2] && r3.vor[1] > 0, 'Testumgebung: Tabelle sollte hier waagerecht gerollt sein'); }

      // 4 Abschnitte: keine ▲▼ mehr – Alt+↓ / Alt+↑ im Namen der Abschnittszeile
      const f0 = await folge();
      pruef(!(await p.$('#libView button[data-phauf],#libView button[data-phab]')), 'Abschnittszeile hat noch ▲▼');
      await p.focus(`#libView input[data-phn="${f0[0]}"]`); await p.keyboard.press('Alt+ArrowDown'); await warte(500);
      let f1 = await folge(); pruef(f1[0] === f0[1] && f1[1] === f0[0], 'Alt+↓ im Abschnittsnamen verschiebt nicht');
      pruef(Array.isArray(PUT['api/phases']) && PUT['api/phases'][1].k === f0[0], 'Alt+↓: neue Reihenfolge nicht gespeichert');
      await p.focus(`#libView input[data-phn="${f0[0]}"]`); await p.keyboard.press('Alt+ArrowUp'); await warte(500);
      pruef((await folge()).join() === f0.join(), 'Alt+↑ im Abschnittsnamen verschiebt nicht zurück');

      // 5 Ziehen: ablegen auf einer beliebigen Zeile des Zielabschnitts
      const z = await p.evaluate(async (ks) => { const dt = new DataTransfer(), q = (k) => document.querySelector(`#libView tr[data-phk="${k}"]`);
        const ziel = q(ks[2]).nextElementSibling; if (!ziel || ziel.dataset.phk) return 'kein Ziel';
        const ev = (el, t) => { const e = new DragEvent(t, { bubbles: true, cancelable: true, dataTransfer: dt, clientX: 50, clientY: 300 }); el.dispatchEvent(e); return e.defaultPrevented; };
        ev(q(ks[0]), 'dragstart'); const darf = ev(ziel.cells[0], 'dragover'), marke = q(ks[2]).classList.contains('lv-drop'); ev(ziel.cells[0], 'drop'); ev(document.querySelector('#libView'), 'dragend');
        await new Promise((r) => setTimeout(r, 300)); return { darf, marke }; }, f0);
      f1 = await folge();
      pruef(z.darf && z.marke, `Ziehen: Ablegen auf einer Leistungszeile ist nicht erlaubt (${JSON.stringify(z)})`);
      pruef(f1.indexOf(f0[0]) === 2 && f1[0] === f0[1], `Ziehen: Abschnitt landet nicht an der Stelle des Zielabschnitts (${f1.slice(0, 4).join()})`);

      // 5b Eigene Leistung ziehen – in einen anderen Abschnitt (auf dessen Kopfzeile) und mit Alt+↑ zurück; Rückgängig stellt her
      const lz = await p.evaluate(async () => { const dt = new DataTransfer(), g = document.querySelector('#libView tr[data-lid="l2"] .lv-lg'), ziel = document.querySelector('#libView tr[data-phk="planung"]');
        if (!g || !ziel) return { fehlt: true };
        const ev = (el, t) => { const r = el.getBoundingClientRect(), e = new DragEvent(t, { bubbles: true, cancelable: true, dataTransfer: dt, clientX: r.left + 30, clientY: r.top + r.height / 2 }); el.dispatchEvent(e); return e.defaultPrevented; };
        ev(g, 'dragstart'); const darf = ev(ziel.cells[0], 'dragover'); ev(ziel.cells[0], 'drop'); ev(document.querySelector('#libView'), 'dragend');
        await new Promise((r) => setTimeout(r, 300)); const L = window.LIBRARY; return { darf, ph: L.find((x) => x.id === 'l2').ph, erst: L.filter((x) => x.ph === 'planung')[0].id }; });
      pruef(lz.darf && lz.ph === 'planung' && lz.erst === 'l2', `Leistung in anderen Abschnitt ziehen: ${JSON.stringify(lz)} (erwartet: Abschnitt planung, an erster Stelle)`);
      await p.focus('#libView tr[data-lid="l2"] input[data-k="n"]'); await p.keyboard.press('Alt+ArrowDown'); await warte(400);
      pruef(await p.evaluate(() => window.LIBRARY.filter((x) => x.ph === 'planung').map((x) => x.id).join() === 'l1,l2'), 'Alt+↓: Leistung rückt im Abschnitt nicht nach unten');
      for (let k = 0; k < 2; k++) { await p.keyboard.press('Escape'); await p.evaluate(() => document.activeElement && document.activeElement.blur()); await p.keyboard.press('Control+z'); await warte(400); }   // zweimal zurück: Alt+↓, dann das Ziehen
      pruef(await p.evaluate(() => window.LIBRARY.find((x) => x.id === 'l2').ph === 'rohbau'), 'Rückgängig holt die gezogene Leistung nicht in ihren Abschnitt zurück');

      // 5c Rückgängig für Eingaben im Katalog: Name ändern, Strg+Z (außerhalb des Felds) holt den alten Namen
      await p.fill('#libView tr[data-lid="l1"] input[data-k="n"]', 'Geändert'); await p.keyboard.press('Tab'); await warte(300);
      await p.evaluate(() => document.activeElement && document.activeElement.blur()); await p.keyboard.press('Control+z'); await warte(400);
      pruef(await p.evaluate(() => window.LIBRARY.find((x) => x.id === 'l1').n === 'Eigene Leistung' && document.querySelector('#libView tr[data-lid="l1"] input[data-k="n"]').value === 'Eigene Leistung'), 'Strg+Z nimmt die Änderung im Leistungskatalog nicht zurück');

      // 6 Fenster „Abschnitte“ (Befehlsleiste): umbenennen, ziehen, Alt+↑/↓, neu, löschen
      await p.evaluate(() => phNeu()); await warte(300);
      pruef(await p.evaluate(() => document.querySelectorAll('.modal .pd-z').length === CATALOG.phases.length), 'Fenster „Abschnitte“: Liste fehlt');
      await p.fill(`.modal input[data-pdn="${f0[1]}"]`, 'Umbenannt'); await p.keyboard.press('Tab'); await warte(500);
      pruef(await p.evaluate((k) => CATALOG.phases.find((x) => x.k === k).n === 'Umbenannt' && document.querySelector(`#libView input[data-phn="${k}"]`).value === 'Umbenannt', f0[1]), 'Fenster „Abschnitte“: Umbenennen wirkt nicht');
      pruef(!(await p.$('.modal [data-m="auf"],.modal [data-m="ab"]')), 'Fenster „Abschnitte“: hat noch ▲▼');
      const vorZ = await folge(), wer = vorZ[0];
      const zz = await p.evaluate((ks) => { const dt = new DataTransfer(), q = (k) => document.querySelector(`.modal .pd-z[data-pdk="${k}"]`);
        const ev = (el, t, y) => { const e = new DragEvent(t, { bubbles: true, cancelable: true, dataTransfer: dt, clientX: 60, clientY: y }); el.dispatchEvent(e); return e.defaultPrevented; };
        const r = q(ks[2]).getBoundingClientRect(), y = r.bottom - 2;   // untere Hälfte des dritten → danach
        ev(q(ks[0]).querySelector('.pd-grip'), 'dragstart', 0); const darf = ev(q(ks[2]), 'dragover', y), marke = q(ks[2]).classList.contains('pd-unter'); ev(q(ks[2]), 'drop', y);
        return { darf, marke }; }, vorZ); await warte(500);
      const nachZ = await folge();
      pruef(zz.darf && zz.marke && nachZ.indexOf(wer) === 2 && nachZ[0] === vorZ[1], `Fenster „Abschnitte“: Ziehen hinter den dritten wirkt nicht (${JSON.stringify(zz)}, ${nachZ.slice(0, 4).join()})`);
      await p.focus(`.modal input[data-pdn="${wer}"]`); await p.keyboard.press('Alt+ArrowUp'); await warte(500);
      pruef((await folge()).indexOf(wer) === 1, 'Fenster „Abschnitte“: Alt+↑ verschiebt nicht');
      pruef(await p.evaluate(() => !!document.querySelector('.modal .pd-z')), 'Fenster „Abschnitte“: schließt sich beim Verschieben');
      const n0 = (await folge()).length;
      await p.click('.modal [data-m="neu"]'); await warte(500);
      const neu = await p.evaluate(() => { const x = CATALOG.phases[CATALOG.phases.length - 1]; return { k: x.k, own: x.own, fokus: document.activeElement.dataset.pdn === x.k }; });
      pruef((await folge()).length === n0 + 1 && neu.own && neu.fokus, 'Fenster „Abschnitte“: ＋ Abschnitt legt nichts an oder setzt den Fokus nicht');
      await p.click(`.modal [data-m="weg"][data-k="${neu.k}"]`); await warte(300);
      await p.evaluate(() => { const b = [...document.querySelectorAll('.bph-frage button, .bph-dlg button')].find((x) => /Löschen/.test(x.textContent)); if (b) b.click(); }); await warte(500);
      pruef((await folge()).length === n0, 'Fenster „Abschnitte“: Löschen eines eigenen Abschnitts wirkt nicht');
      await p.click('.modal [data-m="zu"]'); await warte(200);
      pruef(await p.evaluate(() => !document.querySelector('.modal .pd-z')), 'Fenster „Abschnitte“: Schließen wirkt nicht');
      // Einklappen (18.11.2026, EK-A1 B2): alles offen → nur eigene (Standard weg, Abschnitte offen) → nur Abschnitte → alles offen; einzeln per ⌄/›
      const zahl = () => p.evaluate(() => ({ ph: document.querySelectorAll('#libView tr.lv-ph').length, std: document.querySelectorAll('#libView tr.lv-std').length, eigen: document.querySelectorAll('#libView tr[data-lid]').length }));
      const z0 = await zahl(); await p.evaluate(() => libKlapp()); const z1 = await zahl(); await p.evaluate(() => libKlapp()); const z2 = await zahl();
      pruef(z0.std > 0 && z1.std === 0 && z1.eigen === z0.eigen && z2.std === 0 && z2.eigen === 0 && z2.ph === z0.ph, `Einklappen in zwei Schritten: ${JSON.stringify([z0, z1, z2])}`);
      await p.click('#libView [data-phklapp]'); await warte(200);
      pruef(await p.evaluate(() => libZu.size === CATALOG.phases.length - 1), 'Einzelnen Abschnitt aufklappen wirkt nicht');
      await p.evaluate(() => libKlapp()); pruef((await zahl()).std === z0.std, 'Dritter Klick: wieder alles offen');
    } catch (e) { fehler.push(`${name}: bricht ab – ` + String(e.message).split('\n').slice(0, 3).join(' ')); }
    await ctx.close();
  }
  await lauf('Maus', false, false);
  await lauf('Finger', true, false);
  await lauf('Finger, schmal', true, true);
  await lauf('Gerät mit Finger, bedient mit der Maus', true, false, true);
  return fehler;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await katalogPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
  await b.close(); console.log(f.length ? f.join('\n') : 'ok'); process.exit(f.length ? 1 : 0);
}
