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
  p.on('pageerror', (e) => { if (!/NaN/.test(e.message)) fehler.push('Fehler im Skript – ' + e.message + ' ' + String(e.stack).split('\n').slice(1,4).join(' | ')); });
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
      // Zeit und Stand (SI2-6 A): Dauer, Fortschritt, später fertig und Grund als ein Block unter der Bezeichnung
      await p.evaluate(() => taskDialog(0)); await p.waitForSelector('.td-eig .zs [data-zs="ue"]');
      const zl = await p.evaluate(() => { const f = document.querySelector('.td-eig .form'), z = f.querySelector('.zs'), n = f.querySelector('#fName').closest('div');
        return { unter: !!(n.compareDocumentPosition(z) & Node.DOCUMENT_POSITION_FOLLOWING), vier: ['dur', 'ue', 'ueg'].every((k) => z.querySelector(`[data-zs="${k}"]`)) && !!z.querySelector('.bp-pz'), alt: !!document.querySelector('.td-eig #fPct, .td-eig #fUe') }; });
      pruef(zl.unter && zl.vier && !zl.alt, `Block „Zeit und Stand“ im Fenster: ${JSON.stringify(zl)}`);
      const bu = await p.evaluate(() => { const a = document.querySelector('.td-eig [data-zs="ue"]').getBoundingClientRect(), b = document.querySelector('.td-eig [data-zs="ueg"]').getBoundingClientRect(); return { dt: a.top - b.top, dh: a.height - b.height }; });
      pruef(Math.abs(bu.dt) < 1.5 && Math.abs(bu.dh) < 1.5, `„Später fertig um“ und „Grund“ bündig: ${JSON.stringify(bu)}`);
      await p.click('.td-eig .zs [data-zsp][data-p="75"]'); await p.fill('.td-eig .zs [data-zs="ue"]', '3');
      await p.click('.td-eig .zs [data-zs="ueg"]'); await p.waitForTimeout(150);   // Grund: Vorschlagsliste der Plattform (bp/vorschlag.js) – auswählen oder eigenen Text tippen
      pruef(await p.evaluate(() => document.querySelectorAll('.bp-vs-z').length >= 5), 'Grund: Vorschlagsliste mit den üblichen Gründen');
      await p.evaluate(() => [...document.querySelectorAll('.bp-vs-z')].find((o) => /Wetter/i.test(o.textContent)).dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))); await p.waitForTimeout(80);
      pruef(/jetzt fertig/.test(await p.textContent('.td-eig .zs [data-zs="erg"]')), 'Ergebniszeile zeigt „jetzt fertig …“');
      await p.click('.td-eig .bp-eigf [data-m="ok"]'); await p.waitForTimeout(200);
      const ue = await p.evaluate(() => ({ u: P.tasks[0].ueber, pct: P.tasks[0].pct }));
      pruef(ue.u && ue.u.at === 3 && ue.u.grund === 'wetter' && ue.pct === 75, `Später fertig und Fortschritt im Eigenschaften-Fenster: ${JSON.stringify(ue)}`);
      await p.evaluate(() => taskDialog(0)); await p.waitForSelector('.td-eig .zs [data-zs="ue"]'); await p.fill('.td-eig .zs [data-zs="ue"]', '0'); await p.click('.td-eig .bp-eigf [data-m="ok"]'); await p.waitForTimeout(200);
      pruef(await p.evaluate(() => !P.tasks[0].ueber && P.tasks[0].pct === 75), '0 AT nimmt die Überziehung weg, Fortschritt bleibt'); }
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
      {   // Änderungssätze (22.11.2026, saetze.js): „<Leistung> 2 Tage länger“ → Vorschau mit Projektende, Ausführen = ein Schritt im Rückgängig
        const r = await p.evaluate(() => { const i = P.tasks.findIndex((t, k) => !CAL.summ[k] && !String(t.cat || '').startsWith('_')), t = P.tasks[i], d0 = t.dur, w = t.name.split(/\s+/)[0];
          const v = bpFragenLokal.verstehen(`${w} 2 Tage länger`), ok = bpFragenLokal.erkennt(`${w} 2 Tage länger`) && !bpFragenLokal.erkennt('Wann ist der Rohbau fertig?');
          const x = v && v.schritte && v.schritte.find((y) => y.uid === t.uid); if (!v || !v.schritte) return { v, w }; const T = () => P.tasks.find((y) => y.uid === t.uid), dVor = T().dur; bpFragenLokal.ausfuehren(v); const d1 = T().dur; doUndo();
          return { ok, x: !!x && x.wert === d0 + 2, unberuehrt: dVor === d0, d1, d0, zur: T().dur === d0, ende: !!(v && v.ende), w, fehler: (bpFragenLokal.verstehen('Gibtsnicht 2 Tage länger') || {}).fehler }; });
        pruef(r.ok && r.x && r.unberuehrt && r.d1 === r.d0 + 2 && r.zur && r.ende && /Keine Leistung/.test(r.fehler || ''), `Änderungssatz im Bauzeitenplan – ${JSON.stringify(r)}`);
      }
      // Wortvervollständigung (22.11.2026): „trock“ → Trockenbau, Trockenestrich untereinander; ‹ › so groß wie das ✕
      await p.evaluate(() => { P.tasks.push(fillTask({ uid: 9001, name: 'Trockenbau Wände', dur: 2, lvl: 0, preds: [] }), fillTask({ uid: 9002, name: 'Trockenestrich', dur: 2, lvl: 0, preds: [] })); CAL = schedule(); render(); });
      await p.fill('#gsQ', ''); await p.keyboard.type('trock'); await p.waitForSelector('.bp-vs .bp-vs-z', { timeout: 3000 });
      const v = await p.evaluate(() => ({ w: [...document.querySelectorAll('.bp-vs .bp-vs-z b')].map((b) => b.textContent), k: Math.round(document.querySelector('#leiste .gs-box [data-gs="1"]').getBoundingClientRect().width), s: Math.round(document.querySelector('#leiste .gs-box [data-gs="1"] svg').getBoundingClientRect().width) }));
      pruef(v.w.includes('Trockenbau') && v.w.includes('Trockenestrich') && v.k >= 26 && v.s >= 17, `Suchvorschläge und Knöpfe – ${JSON.stringify(v)}`);
      await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter'); await p.waitForTimeout(100);
      pruef(/^Trocken/.test(await p.inputValue('#gsQ')) && /^–/.test(await p.textContent('#gsN')), `Enter übernimmt den Vorschlag und springt nicht – ${await p.textContent('#gsN')}`);
      await p.keyboard.press('Enter'); await p.waitForTimeout(100);
      pruef(/^1 \//.test(await p.textContent('#gsN')), `danach springt Enter zum ersten Treffer – ${await p.textContent('#gsN')}`);
      await p.evaluate(() => { P.tasks = P.tasks.filter((t) => t.uid < 9000); CAL = schedule(); render(); });
      await p.keyboard.press('Escape'); await p.keyboard.press('Escape'); await p.evaluate(() => document.activeElement.blur());
      await p.setViewportSize({ width: 1600, height: 900 }); await p.waitForTimeout(300);
    }
    {   // Mock „Soll, Ist und Fortschritt“ (GO 22.11.2026): Klick auf den Balken = Feld „Zeit und Stand“ (SI2-4 A); der ganze Balken füllt sich (SI2-2 A)
      await p.evaluate(() => { P.tasks = [fillTask({ uid: 1, name: 'A', dur: 4, lvl: 0, preds: [] }), fillTask({ uid: 2, name: 'B', dur: 2, lvl: 0, preds: [{ uid: 1, type: 'FS', lag: 0 }] })]; CAL = schedule(); render(); });
      const r = await p.evaluate(() => { const b = document.querySelector('#chartBody .bar[data-i="0"] rect.b').getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2, es: CAL.es[1] }; });
      await p.mouse.click(r.x, r.y); await p.waitForSelector('.zs-pop .bp-pz', { timeout: 3000 });
      pruef(await p.evaluate(() => !document.querySelector('#chartBody .ph, #chartBody .uh')), 'keine Griffe mehr für Fortschritt und „später fertig“');
      {   // 23.11.2026: Anfang und Ende haben breite Anfasser mit sichtbarem Griff beim Darüberfahren
        await p.mouse.move(r.x, r.y); await p.waitForTimeout(200);
        const a = await p.evaluate(() => { const g = document.querySelector('#chartBody .bar[data-i="0"]'), rh = g.querySelector('rect.rh').getBoundingClientRect(), b = g.querySelector('rect.b').getBoundingClientRect();
          return { breit: rh.width >= 8, amEnde: Math.abs(rh.right - b.right) < 5, griffe: [...g.querySelectorAll('.gr')].filter((x) => +getComputedStyle(x).opacity > 0.3).length }; });
        pruef(a.breit && a.amEnde && a.griffe === 2, `Anfasser an Anfang und Ende: ${JSON.stringify(a)}`);
      }
      await p.click('.zs-pop [data-zsp][data-p="50"]'); await p.waitForTimeout(150);
      const f = await p.evaluate(() => { const g = document.querySelector('#chartBody .bar[data-i="0"]'), b = g.querySelector('rect.b').getBoundingClientRect(), q = g.querySelector('rect.p').getBoundingClientRect(), t = g.querySelector('text.pt');
        return { pct: P.tasks[0].pct, f: q.width / b.width, h: q.height / b.height, txt: t && t.textContent, offen: !!document.querySelector('.zs-pop') }; });
      pruef(f.pct === 50 && Math.abs(f.f - 0.5) < 0.05 && f.h > 0.95 && f.txt === '50 %' && f.offen, `Fortschritt im Feld: Balken halb gefüllt in voller Höhe, „50 %“ im Balken – ${JSON.stringify(f)}`);
      await p.fill('.zs-pop [data-zs="ue"]', '2'); await p.press('.zs-pop [data-zs="ue"]', 'Enter'); await p.waitForTimeout(200);
      const z = await p.evaluate(() => { const t = P.tasks[0], g = document.querySelector('#chartBody .bar[data-i="0"]'), b = g.querySelector('rect.b').getBoundingClientRect(), ue = g.querySelector('rect.ue'), P2 = [...g.querySelectorAll('rect.p')].reduce((s, x) => s + x.getBoundingClientRect().width, 0);
        return { u: t.ueber, pct: t.pct, nach: CAL.es[1], plan: b.width, ue: ue ? ue.getBoundingClientRect().width : 0, ueh: ue ? ue.getBoundingClientRect().height / b.height : 0, prog: P2, alt: !!g.querySelector('rect.ut, rect.zt'), st: (document.querySelector('text.bst[data-st="0"]') || {}).textContent || '' }; });
      pruef(z.u && z.u.at === 2 && z.u.grund === 'leistung' && z.pct === 50 && z.nach === r.es + 2 && z.ueh > 0.95 && !z.alt && /\+2 AT · liegt an der Leistung/.test(z.st), `Später fertig im Feld: volle Höhe, Nachfolger rückt, Stand rechts (${JSON.stringify(z)})`);
      pruef(Math.abs(z.prog - z.plan * 0.75) < 3, `Fortschritt zählt den Überzug mit: 50 % von 4 + 2 AT = 3 AT = ¾ des geplanten Balkens (${z.prog.toFixed(1)} von ${z.plan.toFixed(1)})`);
      await p.keyboard.press('Escape'); pruef(!(await p.$('.zs-pop')), 'Esc schließt das Feld');
      {   // Gruppen füllen sich wie jeder Balken (SI2-2 A, Nachtrag 22.11.2026): offen hell, erledigt kräftig – kein 1,5-px-Strich mehr
        const g = await p.evaluate(() => { const d = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); d.innerHTML = sumBalken(0, 100, 0, 40, 'probe'); document.body.appendChild(d);
          const r = { hell: !!d.querySelector('path.sumbar.of'), voll: !!d.querySelector('path.sumbar[clip-path]'), w: +d.querySelector('clipPath rect').getAttribute('width'), strich: !!document.querySelector('#chartBody .sumprog') }; d.remove(); return r; });
        pruef(g.hell && g.voll && g.w === 40 && !g.strich, `Gruppe: offen hell, 40 % kräftig – ${JSON.stringify(g)}`); }
      await p.evaluate(() => doUndo()); pruef(await p.evaluate(() => !P.tasks[0].ueber && P.tasks[0].pct === 50), 'Rückgängig nimmt „später fertig“ zurück, Fortschritt bleibt');
      {   // „Zeit und Stand“ auch rechts unter Details; Grund auch als eigener Text; Felder bündig (22.11.2026)
        await p.evaluate(() => { selectRow(rowOfIdx(0)); seiteReiter('gantt', 'details'); }); await p.waitForSelector('.g-det .zs [data-zsp][data-p="25"]', { timeout: 4000 });
        await p.click('.g-det .zs .bp-pz-s [data-zsp][data-p="25"]'); await p.waitForTimeout(200);
        const a1 = await p.evaluate(() => P.tasks[0].pct);
        await p.fill('.g-det [data-zs="ue"]', '1'); await p.press('.g-det [data-zs="ue"]', 'Enter'); await p.waitForTimeout(200);
        await p.fill('.g-det [data-zs="ueg"]', 'Lieferverzug Fenster'); await p.press('.g-det [data-zs="ueg"]', 'Enter'); await p.waitForTimeout(250);
        const a2 = await p.evaluate(() => { const t = P.tasks[0], a = document.querySelector('.g-det [data-zs="ue"]'), b = document.querySelector('.g-det [data-zs="ueg"]'); const ra = a && a.getBoundingClientRect(), rb = b && b.getBoundingClientRect();
          return { u: t.ueber, st: (document.querySelector('text.bst[data-st="0"]') || {}).textContent || '' }; });
        pruef(a1 === 25 && a2.u && a2.u.at === 1 && a2.u.grund === 'Lieferverzug Fenster' && /Lieferverzug Fenster/.test(a2.st), `Details: Zeit und Stand, eigener Grund – ${JSON.stringify({ a1, ...a2 })}`); }
      // 23.11.2026: ohne festgehaltenes Soll kein Verzug – ein neuer Plan in der Vergangenheit ist ein Entwurf, kein Urteil am Balken
      const ohne = await p.evaluate(() => { window.__soll = GVGL.soll; GVGL.soll = () => null; P.tasks = [fillTask({ uid: 1, name: 'A', dur: 20, lvl: 0, preds: [] })]; P.start = snapWork(todayN() - 30); P.tasks[0].cons = snapWork(todayN() - 14); CAL = schedule(); render();
        const g = document.querySelector('#chartBody .bar[data-i="0"]'); const r = { punkt: !!g.querySelector('circle.vz'), st: (document.querySelector('text.bst[data-st="0"]') || {}).textContent || '' }; GVGL.soll = () => ({ data: {} }); return r; });
      pruef(!ohne.punkt && !/Verzug/.test(ohne.st), `ohne Soll kein Verzug – ${JSON.stringify(ohne)}`);
      // SI2-3 A: mit Soll begonnen, aber nichts eingetragen → roter Punkt „heute“, „… AT im Verzug“
      const vz = await p.evaluate(() => { P.tasks = [fillTask({ uid: 1, name: 'A', dur: 20, lvl: 0, preds: [] })]; P.start = snapWork(todayN() - 30); P.tasks[0].cons = snapWork(todayN() - 14); CAL = schedule(); render();
        const g = document.querySelector('#chartBody .bar[data-i="0"]'); return { rot: !!g.querySelector('circle.vz.rot'), st: (document.querySelector('text.bst[data-st="0"]') || {}).textContent || '' }; });
      pruef(vz.rot && /AT im Verzug/.test(vz.st), `Verzug: roter Punkt und Text – ${JSON.stringify(vz)}`);
      const gr = await p.evaluate(() => { P.tasks[0].pct = 90; CAL = schedule(); render(); const g = document.querySelector('#chartBody .bar[data-i="0"]'); return { gruen: !!g.querySelector('circle.vz:not(.rot)'), st: document.querySelector('text.bst[data-st="0"]').textContent }; });
      pruef(gr.gruen && !/Verzug/.test(gr.st), `voraus: grüner Punkt, kein Verzug – ${JSON.stringify(gr)}`);
      await p.evaluate(() => { GVGL.soll = window.__soll; });
      // 23.11.2026: neue Leistung mit der Maus gezogen, ungefähr am Ende einer Leistung begonnen → Ende → Anfang verknüpft
      const pz = await p.evaluate(() => { P.tasks = [fillTask({ uid: 1, name: 'Rohbau', dur: 5, lvl: 0, preds: [] })]; P.start = snapWork(todayN()); CAL = schedule(); render();
        chartPane.scrollTop = 0; const r = chartBody.getBoundingClientRect(), x0 = X(fromW(toW(CAL.fd[0]) + 1)) + 3, x1 = X(fromW(toW(CAL.fd[0]) + 4)) - 3;
        return { a: r.left + x0, b: r.left + x1, y: r.top + RH * 2 + 10, vis: chartPane.getBoundingClientRect().bottom }; });
      await p.mouse.move(pz.a, pz.y); await p.mouse.down(); await p.mouse.move((pz.a + pz.b) / 2, pz.y, { steps: 3 }); await p.mouse.move(pz.b, pz.y, { steps: 3 });
      const tip = await p.evaluate(() => (document.querySelector('#tip, .tip') || {}).textContent || '');
      await p.mouse.up(); await p.waitForTimeout(250); await p.keyboard.press('Escape');
      const nz = await p.evaluate(() => { const t = P.tasks[1]; return t ? { preds: t.preds, cons: t.cons, sd: CAL.sd[1], ende: CAL.fd[0] } : null; });
      pruef(nz && nz.preds.length === 1 && nz.preds[0].uid === 1 && nz.preds[0].type === 'FS' && nz.sd > nz.ende && /Vorgänger:\s*Rohbau/.test(tip), `gezogene Leistung am Ende des Vorgängers: EA verknüpft – ${JSON.stringify({ nz, tip })}`);      // 23.11.2026: „Leistung einfügen“ (Einfg) setzt die neue Leistung UNTER die aktuelle Zeile – bei einer offenen Gruppe als erste darin
      const ein = await p.evaluate(() => { const nn = () => P.tasks.map((t) => t.name).join(',');
        P.tasks = [fillTask({ uid: 1, name: 'A', dur: 2, lvl: 0, preds: [] }), fillTask({ uid: 2, name: 'B', dur: 2, lvl: 0, preds: [] }), fillTask({ uid: 3, name: 'G', dur: 1, lvl: 0, preds: [] }), fillTask({ uid: 4, name: 'G1', dur: 1, lvl: 1, preds: [] })];
        P.nextUid = 10; CAL = schedule(); render(); cur.r = 0; insertTask(); if (typeof stopEdit === 'function') stopEdit(); const a = nn();
        cur.r = rowOfIdx(3); insertTask(); if (typeof stopEdit === 'function') stopEdit(); const b = nn(), l = P.tasks[4].lvl;
        cur.r = rowOfIdx(2); insertTask('task', true); return [a, b, l, nn()]; });
      pruef(ein[0] === 'A,Neue Leistung,B,G,G1' && ein[1] === 'A,Neue Leistung,B,G,Neue Leistung,G1' && ein[2] === 1 && ein[3] === 'A,Neue Leistung,Neue Leistung,B,G,Neue Leistung,G1', `Einfügen unter (Alt+Einfg: darüber) der aktuellen Leistung – ${JSON.stringify(ein)}`);
    }
    {   // Soll und Ist (Mock „Soll und Ist“, 22.11.2026): Überziehung schiebt die Nachfolger (SI-3); das Soll liegt darunter, „Soll aus“ (SI-2)
      const T0 = [{ uid: 1, name: 'A', dur: 2, lvl: 0, preds: [] }, { uid: 2, name: 'B', dur: 3, lvl: 0, preds: [{ uid: 1, type: 'FS', lag: 0 }] }];
      const v = await p.evaluate((T0) => { P.tasks = T0.map((t) => fillTask({ ...t, preds: t.preds.map((x) => ({ ...x })) })); const a = schedule().es[1];
        P.tasks[0].ueber = { at: 2, grund: 'wetter' }; P.tasks[0].pct = 100; CAL = schedule(); render(); return { vor: a, nach: CAL.es[1], ende: CAL.ef[0] - CAL.es[0] }; }, T0);
      pruef(v.nach === v.vor + 2 && v.ende === 4, `Überziehung schiebt den Nachfolger: ${JSON.stringify(v)}`);
      SOLL = { id: 's1', name: 'Bauvertrag', created: '2026-03-15T10:00:00Z', by: 'X', frueher: 0, data: { start: 20773, nextUid: 3, tasks: T0 } };
      await p.evaluate(() => GVGL.laden()); await p.waitForSelector('#vgBand:not(.vg-aus)', { timeout: 5000 });
      const b = await p.evaluate(() => ({ t: document.querySelector('#vgBand').textContent, alt: document.querySelectorAll('#vgl .vg-soll').length, unter: (() => { const a = document.querySelector('#vgl .vg-soll'), b = document.querySelector('#chartBody .bar[data-i="0"] rect.b'); return a && b ? a.getBoundingClientRect().top >= b.getBoundingClientRect().bottom - 0.5 : false; })(), st: [...document.querySelectorAll('text.bst .st-sp, text.bst .st-fr')].map((x) => x.textContent), menue: document.body.textContent.includes('Vergleichen mit anderer Version') }));
      const hz = await p.evaluate(() => { const h = document.querySelector('.bf-heft').getBoundingClientRect(), v = document.querySelector('#vgBand').getBoundingClientRect(); return { h: h.top, band: v.bottom }; });
      pruef(hz.h >= hz.band - 1, `Heftzwecke liegt auf dem Soll-Band statt darunter am Arbeitsbereich (${JSON.stringify(hz)})`);
      pruef(/Soll vom 15\.03\.2026/.test(b.t) && /Bauvertrag/.test(b.t) && b.alt >= 1 && b.unter && b.st.some((x) => /^[+-]\d+ T$/.test(x)) && !b.menue, `Soll grau unter dem Ist-Balken, Abweichung rechts (SI2-1 A): ${JSON.stringify(b)}`);
      await p.click('#vgBand [data-vgende]'); await p.waitForSelector('#vgBand.vg-aus', { timeout: 3000 });
      pruef(await p.evaluate(() => !document.querySelector('#vgl') && /Soll zeigen/.test(document.querySelector('#vgBand').textContent)), '„Soll aus“ blendet das Soll aus, „Soll zeigen“ bleibt');
      await p.click('#vgBand [data-sollan]'); await p.waitForSelector('#vgl .vg-soll', { timeout: 3000 }).catch(() => {});
      pruef(await p.evaluate(() => !!document.querySelector('#vgl .vg-soll')), '„Soll zeigen“ legt es wieder darunter');
      // 23.11.2026 (Bildschirmfoto „gemurkse“): entfallene an derselben Stelle = EINE Linie mit einem Text, nicht Texte übereinander
      const weg = await p.evaluate(() => { P.tasks = [fillTask({ uid: 9, name: 'C', dur: 2, lvl: 0, preds: [] })]; CAL = schedule(); render();
        return { lin: document.querySelectorAll('#vgl .vg-lin').length, li: [...document.querySelectorAll('#gridBody .vg-li')].map((x) => x.textContent), oben: (() => { const sp = document.querySelector('#gridBody .vg-li span'), h = document.querySelector('#gridBody'); return sp && h ? sp.getBoundingClientRect().top >= h.getBoundingClientRect().top - 0.5 : false; })() }; });
      pruef(weg.lin === 1 && weg.li.length === 1 && /2 entfallen: A, B/.test(weg.li[0]) && weg.oben, `Entfallene an einer Stelle: ${JSON.stringify(weg)}`);
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
