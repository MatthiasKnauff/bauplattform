// Heftzwecke im Bauzeitenplan (17.11.2026, wie in der Ausschreibung – Baustein befehle.heft): reihum Kopf (Titel, Reiter) weg → auch die
// Befehlsleiste weg → alles wieder da. In Stufe 2 stehen die Befehle der Leiste im Kontextmenü des Plans (ctxMenu, befehle.kmPunkte),
// Die Heftzwecke liegt oben an der rechten Kante des Plans, nicht über dem Bereich rechts.
//
// Aufgerufen aus oberflaeche.mjs:  const fehler = await ganttHeftPruefen(browser, repoWurzel)   – allein: node tools/tests/ui/ganttheft.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

export async function ganttHeftPruefen(browser, repo) {
  const PUB = path.join(repo, 'gantt/public'), KASTEN = path.join(repo, 'shared/bpcore/head');
  const BK = /BAUKASTEN = \(([^)]*)\)/.exec(fs.readFileSync(path.join(repo, 'shared/bpcore/head.py'), 'utf8'))[1].match(/"[^"]+"/g).map((s) => s.slice(1, -1));
  const baukasten = 'void 0;\n' + BK.map((f) => fs.readFileSync(path.join(KASTEN, f), 'utf8')).join('\n;\n');
  const fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  let SOLL = {};   // Soll und Ist (SI): erst am Ende ein Soll liefern – sonst steht das Band über allen anderen Prüfungen
  const J = (o) => ({ contentType: 'application/json', body: JSON.stringify(o) });
  const ART = (f) => (f.endsWith('.css') ? 'text/css' : f.endsWith('.js') ? 'text/javascript' : f.endsWith('.html') ? 'text/html' : 'application/octet-stream');
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } }), p = await ctx.newPage();
  p.on('pageerror', (e) => { if (!/NaN/.test(e.message)) fehler.push('Fehler im Skript – ' + e.message); });
  await p.addInitScript(() => { try { localStorage.clear(); } catch { /* egal */ } });
  await p.route('http://portal.test/**', (r) => { const u = new URL(r.request().url()), pf = u.pathname.replace(/^\/gantt\//, '').replace(/^\//, '');
    if (pf === '' || pf === 'gantt') return r.fulfill({ contentType: 'text/html', body: fs.readFileSync(path.join(PUB, 'index.html'), 'utf8') });
    if (pf === 'bp/baukasten.js') return r.fulfill({ contentType: 'text/javascript', body: baukasten });
    const f = pf.startsWith('bp/') ? path.join(KASTEN, pf.slice(3)) : path.join(PUB, pf);
    if (!pf.startsWith('api/') && fs.existsSync(f) && fs.statSync(f).isFile()) return r.fulfill({ contentType: ART(f), body: fs.readFileSync(f) });
    if (!pf.startsWith('api/')) return r.fulfill({ status: 404, body: '' });
    if (r.request().method() === 'PUT') return r.fulfill(J({ ok: true, rev: 2 }));
    if (pf === 'api/me') return r.fulfill(J({ ok: true, id: 1, name: 'admin', vorname: 'A', role: 'admin', admin: true, is_admin: true, look: {} }));
    if (pf === 'api/platform') return r.fulfill(J({ apps: [], user: { name: 'admin', role: 'admin' }, projekte: [] }));
    if (pf === 'api/projects/1/soll') return r.fulfill(J(SOLL));
    if (pf === 'api/projects') return r.fulfill(J([{ id: 1, name: 'Testplan', updated: '2026-11-15' }]));
    if (/^api\/projects\/(1|undefined)$/.test(pf)) return r.fulfill(J({ id: 1, name: 'Testplan', rev: 1, start: 20773, nextUid: 3, tasks: [{ uid: 1, name: 'A', dur: 2, lvl: 0, preds: [] }, { uid: 2, name: 'B', dur: 3, lvl: 0, preds: [] }] }));
    return r.fulfill({ contentType: 'application/json', body: /projects$|firms|presets|liste|versions|neuigkeit|kontakte|library/.test(pf) ? '[]' : '{}' }); });
  try {
    await p.goto('http://portal.test/gantt/'); await p.waitForTimeout(1500);
    await p.evaluate(async () => { if (!P) await openProject(1); }); await p.waitForSelector('#gridBody .row, #gridBody [data-r], #gridBody > div', { timeout: 10000 });
    // Bearbeiten (GO 17.11.2026): Kopieren · Ausschneiden · Einfügen · Duplizieren in der Leiste; Duplizieren mit Verknüpfung und Vorschau
    { const kn = await p.evaluate(() => [...document.querySelectorAll('#leiste button')].map((b) => (b.title || b.getAttribute('aria-label') || b.textContent).trim()).join(' | '));
      {   // K6-A (22.11.2026): kein ✨-Knopf mehr; neue Leistungen belegt der Textvergleich ohne KI vor (ai.js → LeistungVorschlag)
        const v = await p.evaluate(() => ({ alt: !!window.AiPlace || !!window.SugBar, r: window.LeistungVorschlag && LeistungVorschlag.platz('Rauchwarnmelder montieren', { type: 'neubau_efh' }, '') }));
        pruef(!v.alt && v.r && v.r.gw === 'Elektro' && v.r.a.length === 1, `Vorschlag ohne KI: ${JSON.stringify(v)}`); }
      pruef(['(Strg+C)', '(Strg+X)', '(Strg+V)', '(Strg+D)'].every((t) => kn.includes(t)), `Leiste: Bearbeiten-Knöpfe fehlen – ${kn}`);
      await p.evaluate(() => { sel = new Set([1]); cur.r = 0; updateSel(); duplizierenDialog(); });
      await p.waitForSelector('#kpVs svg', { timeout: 5000 });
      const vs = await p.evaluate(() => ({ balken: document.querySelectorAll('#kpVs rect').length, pfeil: document.querySelectorAll('#kpVs .kp-vp').length, std: document.querySelector('[name=kpArt]:checked').value }));
      pruef(vs.std === 'ende' && vs.balken === 2 && vs.pfeil === 1, `Duplizieren: Vorschau mit Original, Kopie und Pfeil (Standard Ende → Anfang) – ${JSON.stringify(vs)}`);
      await p.check('[name=kpArt][value=eigen]');
      pruef(await p.isVisible('.kp-paare [data-kpp=von]'), 'Eigene Verknüpfung: Auswahl von/nach erscheint nicht');
      await p.selectOption('.kp-paare [data-kpp=vt]', 'A');
      await p.evaluate(() => [...document.querySelectorAll('.bp-modal button, .modal button, button')].find((b) => b.textContent.trim() === 'Duplizieren' && b.offsetParent).click());
      const r = await p.evaluate(() => P.tasks.map((t) => ({ uid: t.uid, mu: t.mu, preds: t.preds })));
      const k = r.find((t) => t.mu === 1 && t.uid !== 1);
      pruef(r.length === 3 && k && k.preds.some((x) => x.uid === 1 && x.type === 'SS'), `Duplizieren mit Anfang → Anfang: Kopie ohne SS-Verknüpfung – ${JSON.stringify(r)}`); }
    {   // Duplizieren „eigene Verknüpfung“: die Kopie rückt als Block – Abstände in der Kopie wie im Original (Rückmeldung 17.11.2026)
      const r = await p.evaluate(() => { const alt = P.tasks;
        P.tasks = [1, 2, 3, 4].map((u) => ({ uid: u, name: 'L' + u, dur: [2, 4, 4, 2][u - 1], lvl: 0, preds: u > 1 ? [{ uid: u - 1, type: 'FS', lag: 0 }] : [] }));
        const C0 = schedule(), lage = new Map(P.tasks.map((t, i) => [t.uid, { s: C0.es[i], f: C0.ef[i] }])); let z = 500;
        P.tasks = GKopie.duplizieren(P.tasks, [0, 1, 2, 3], 1, 'eigen', false, () => z++, [{ von: 4, vt: 'E', nach: 3, nt: 'A' }], lage);
        const C = schedule(), i = (u) => P.tasks.findIndex((t) => t.uid === u), k = (m) => P.tasks.findIndex((t) => t.mu === m && t.uid >= 500);
        const out = { k3: C.es[k(3)], o4e: C.ef[i(4)], abst: [1, 2, 3, 4].map((m) => C.es[k(m)] - C.es[k(1)]), orig: [1, 2, 3, 4].map((m) => C.es[i(m)] - C.es[i(1)]) };
        P.tasks = alt; return out; });
      pruef(r.k3 === r.o4e && JSON.stringify(r.abst) === JSON.stringify(r.orig), `Duplizieren eigene Verknüpfung: Block verformt – ${JSON.stringify(r)}`); }
    {   // Kette 🔗 (Mock BZ H2, 22.11.2026): folgt dem Assistenten / von Hand geändert – Klick holt den Vorschlag zurück
      const k = await p.evaluate(() => { const t = P.tasks[0], alt = t.cat; t.cat = 'putz'; GKette.merken([t]); const d0 = t.dur; t.dur = d0 + 3; render();
        const los = !!document.querySelector('#gridBody [data-r="0"] [data-kette].los'); document.querySelector('#gridBody [data-r="0"] [data-kette]').click();
        const r = { los, zurueck: t.dur === d0, verbunden: !!document.querySelector('#gridBody [data-r="0"] [data-kette]:not(.los)'), eigene: !document.querySelector('#gridBody [data-r="1"] [data-kette]') };
        t.cat = alt; delete t.vs; render(); return r; });
      pruef(k.los && k.zurueck && k.verbunden && k.eigene, `Kette im Bauzeitenplan: ${JSON.stringify(k)}`); }
    {   // Leistungsinformationen im gemeinsamen Eigenschaften-Fenster (22.11.2026): Reiter, ↑ ↓ ✕, OK übernimmt
      await p.evaluate(() => taskDialog(0)); await p.waitForSelector('.bp-eig.td-eig', { timeout: 5000 });
      const a = await p.evaluate(() => ({ reiter: [...document.querySelectorAll('.td-eig [data-eigt]')].map((b) => b.textContent), kopf: !!document.querySelector('.td-eig .bp-eigk [data-m="next"]'), alt: !!document.querySelector('.modal .mh-tools'),
        sicht: [...document.querySelectorAll('.td-eig [data-tdp]')].filter((x) => !x.hidden).map((x) => x.dataset.tdp) }));
      pruef(a.reiter[0] === 'Allgemein' && a.reiter.some((r) => r.startsWith('Vorgänger')) && a.kopf && !a.alt && a.sicht.join() === 'allg', `Leistungsinformationen nicht im Eigenschaften-Fenster: ${JSON.stringify(a)}`);
      await p.click('.td-eig [data-eigt="vorg"]'); pruef(await p.isVisible('.td-eig #pAdd'), 'Reiter „Vorgänger“ zeigt die Vorgänger nicht');
      await p.click('.td-eig [data-eigt="allg"]'); await p.fill('.td-eig #fDur', '7'); await p.click('.td-eig .bp-eigf [data-m="ok"]'); await p.waitForTimeout(200);
      const b = await p.evaluate(() => ({ dur: P.tasks[0].dur, offen: !!document.querySelector('.td-eig') }));
      pruef(b.dur === 7 && !b.offen, `OK übernimmt die Dauer und schließt: ${JSON.stringify(b)}`);
      await p.evaluate(() => taskDialog(0)); await p.waitForSelector('.td-eig'); await p.click('.td-eig .bp-eigk [data-m="next"]'); await p.waitForTimeout(400);
      pruef(await p.evaluate(() => ((document.querySelector('.td-eig .bp-eigk b') || {}).textContent || '') === 'Leistungsinformationen – ' + P.tasks[vis[1]].name), 'Blättern ↓ öffnet die nächste Leistung');
      await p.keyboard.press('Escape'); await p.waitForTimeout(100); pruef(!(await p.$('.td-eig')), 'Esc schließt');
      // überzogen (K7) auch im Eigenschaften-Fenster: Tage und Grund
      await p.evaluate(() => taskDialog(0)); await p.waitForSelector('.td-eig #fUe'); await p.fill('.td-eig #fUe', '3'); await p.selectOption('.td-eig #fUeG', 'wetter');
      await p.click('.td-eig .bp-eigf [data-m="ok"]'); await p.waitForTimeout(200);
      const ue = await p.evaluate(() => ({ u: P.tasks[0].ueber, pct: P.tasks[0].pct }));
      pruef(ue.u && ue.u.at === 3 && ue.u.grund === 'wetter' && ue.pct === 100, `Überzogen im Eigenschaften-Fenster: ${JSON.stringify(ue)}`);
      await p.evaluate(() => taskDialog(0)); await p.waitForSelector('.td-eig #fUe'); await p.fill('.td-eig #fUe', '0'); await p.click('.td-eig .bp-eigf [data-m="ok"]'); await p.waitForTimeout(200);
      pruef(await p.evaluate(() => !P.tasks[0].ueber), '0 AT nimmt die Überziehung weg'); }
    const sicht = () => p.evaluate(() => { const b = document.querySelector('.bf-heft'), g = document.querySelector('#gridPane'); return { da: !!b, tabs: !!document.querySelector('#tabs').offsetParent, such: !!document.querySelector('#leiste .gs-box'),
      leiste: !document.querySelector('#leiste').classList.contains('bf-zu'), pinR: b && Math.round(b.getBoundingClientRect().right), planR: Math.round(document.querySelector('#links').getBoundingClientRect().right), pinO: b && Math.round(b.getBoundingClientRect().top), planO: Math.round(g.getBoundingClientRect().top) }; });
    let v = await sicht();
    pruef(v.da && v.leiste && v.such && !v.tabs, `Heftzwecke fehlt, Leiste nicht da, Suche nicht in der Leiste oder eigene Suchzeile noch da: ${JSON.stringify(v)}`);
    pruef(v.da && v.pinR <= v.planR + 2 && v.pinR > v.planR - 40 && Math.abs(v.pinO - v.planO) < 30, `Heftzwecke nicht oben rechts am Plan: ${JSON.stringify(v)}`);
    await p.click('.bf-heft'); v = await sicht(); pruef(!v.leiste, `ein Klick (einstufig): Leiste weg – ${JSON.stringify(v)}`);
    const zeigt = () => p.evaluate(() => getComputedStyle(document.querySelector('#leiste')).display !== 'none');
    { await p.mouse.move(600, 600); await p.waitForTimeout(100);
      const r = await p.evaluate(() => { const z = document.querySelector('#work').getBoundingClientRect(), x = z.left + 30, y = z.top + 4, oben = document.elementFromPoint(x, y);
        return [x, y, oben && oben.className]; });
      await p.mouse.move(r[0], r[1], { steps: 5 });
      const da = await p.waitForFunction(() => getComputedStyle(document.querySelector('#leiste')).display !== 'none', null, { timeout: 2000 }).then(() => true, () => false);
      pruef(da, `Maus an der Oberkante: Befehlsleiste erscheint über dem Plan (Punkt ${Math.round(r[0])}/${Math.round(r[1])}, oben liegt „${r[2]}“)`); await p.mouse.move(r[0] + 40, r[1] + 400, { steps: 5 }); await p.waitForTimeout(700);
      pruef(!(await zeigt()), 'Maus weg: Befehlsleiste wieder eingeklappt'); }
    // Kontextmenü des Plans direkt auslösen (Maus-Koordinaten hängen in der Pipeline von Schrift und Fenster ab)
    await p.evaluate(() => { const g = document.querySelector('#gridBody'), r = g.getBoundingClientRect(); g.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: r.left + 60, clientY: r.top + 10 })); });
    await p.waitForSelector('.ctx', { timeout: 5000 });
    const km = await p.evaluate(() => [...document.querySelectorAll('.ctx div')].map((x) => x.textContent.trim()));
    pruef(km.some((t) => t.startsWith('Leistung einfügen')) && ['Ganzer Plan', 'Drucken', 'Export'].every((t) => km.includes(t)), `Stufe 2: Befehle der Leiste fehlen im Kontextmenü – ${km.join(' | ')}`);
    // Entscheidung A: Gruppen nur als Trennlinie (keine Überschriften), nichts doppelt, keine ‹ › des Suchfelds
    pruef(!['Gliederung', 'Bearbeiten', 'Finden', 'Planen'].some((t) => km.includes(t)), `Kontextmenü zeigt Gruppen-Überschriften – ${km.join(' | ')}`);
    pruef(km.filter((t) => /^Kopieren/.test(t)).length === 1 && !km.some((t) => /^[‹›<>]$/.test(t)), `Kontextmenü: „Kopieren“ doppelt oder ‹ › als Punkt – ${km.join(' | ')}`);
    await p.keyboard.press('Escape'); await p.mouse.click(5, 880);
    await p.click('.bf-heft'); v = await sicht(); pruef(v.leiste && v.such, `zweiter Klick: wieder angeheftet – ${JSON.stringify(v)}`);
    {   // 20.11.2026: Befehlsleiste wie in den anderen Apps – Symbole MIT Beschriftung; das Suchfeld ist eingeklappt ein Knopf „Suchen“ und klappt mit Klick auf
      await p.setViewportSize({ width: 2300, height: 900 }); await p.waitForTimeout(400);
      const l = await p.evaluate(() => { const bf = document.querySelector('#leiste .bf'), t = bf.querySelector('.bf-g:not(.bf-undo) .bf-k .bf-t'), g = document.querySelector('#leiste .gs-box');
        return { kompakt: bf.classList.contains('kompakt'), text: t && getComputedStyle(t).display !== 'none' && t.getBoundingClientRect().width > 5, such: getComputedStyle(g, '::after').content, breit: Math.round(g.getBoundingClientRect().width), svg: bf.querySelector('.bf-k svg').getBoundingClientRect().width }; });
      pruef(!l.kompakt && l.text && /Suchen/.test(l.such) && l.breit < 90 && l.svg === 18, `Befehlsleiste mit Beschriftung, Suche eingeklappt – ${JSON.stringify(l)}`);
      await p.click('#leiste .gs-box'); await p.keyboard.type('a');
      const o = await p.evaluate(() => ({ fokus: document.activeElement.id, breit: Math.round(document.querySelector('#leiste .gs-box').getBoundingClientRect().width) }));
      pruef(o.fokus === 'gsQ' && o.breit > 250, `Klick auf „Suchen“ öffnet das Suchfeld – ${JSON.stringify(o)}`);
      await p.keyboard.press('Escape'); await p.evaluate(() => document.activeElement.blur());
      await p.setViewportSize({ width: 1600, height: 900 }); await p.waitForTimeout(300);
    }
    {   // Soll und Ist (Mock „Soll und Ist“, 22.11.2026): Überziehung schiebt die Nachfolger (SI-3); das Soll liegt darunter, „Soll aus“ (SI-2)
      const T0 = [{ uid: 1, name: 'A', dur: 2, lvl: 0, preds: [] }, { uid: 2, name: 'B', dur: 3, lvl: 0, preds: [{ uid: 1, type: 'FS', lag: 0 }] }];
      const v = await p.evaluate((T0) => { P.tasks = T0.map((t) => fillTask({ ...t, preds: t.preds.map((x) => ({ ...x })) })); const a = schedule().es[1];
        P.tasks[0].ueber = { at: 2, grund: 'wetter' }; P.tasks[0].pct = 100; CAL = schedule(); render(); return { vor: a, nach: CAL.es[1], ende: CAL.ef[0] - CAL.es[0] }; }, T0);
      pruef(v.nach === v.vor + 2 && v.ende === 4, `Überziehung schiebt den Nachfolger: ${JSON.stringify(v)}`);
      SOLL = { id: 's1', name: 'Bauvertrag', created: '2026-03-15T10:00:00Z', by: 'X', frueher: 0, data: { start: 20773, nextUid: 3, tasks: T0 } };
      await p.evaluate(() => GVGL.laden()); await p.waitForSelector('#vgBand:not(.vg-aus)', { timeout: 5000 });
      const b = await p.evaluate(() => ({ t: document.querySelector('#vgBand').textContent, alt: document.querySelectorAll('#vgl .vg-alt').length, menue: document.body.textContent.includes('Vergleichen mit anderer Version') }));
      pruef(/Soll vom 15\.03\.2026/.test(b.t) && /Bauvertrag/.test(b.t) && b.alt >= 1 && !b.menue, `Soll unter dem Plan: ${JSON.stringify(b)}`);
      await p.click('#vgBand [data-vgende]'); await p.waitForSelector('#vgBand.vg-aus', { timeout: 3000 });
      pruef(await p.evaluate(() => !document.querySelector('#vgl') && /Soll zeigen/.test(document.querySelector('#vgBand').textContent)), '„Soll aus“ blendet das Soll aus, „Soll zeigen“ bleibt');
      await p.click('#vgBand [data-sollan]'); await p.waitForSelector('#vgl .vg-alt', { timeout: 3000 }).catch(() => {});
      pruef(await p.evaluate(() => !!document.querySelector('#vgl .vg-alt')), '„Soll zeigen“ legt es wieder darunter');
    }
  } catch (e) { fehler.push('Prüfung bricht ab – ' + String(e.message).split('\n')[0]); }
  await ctx.close();
  return fehler;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await ganttHeftPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
  await b.close(); console.log(f.length ? f.join('\n') : 'ok'); process.exit(f.length ? 1 : 0);
}
