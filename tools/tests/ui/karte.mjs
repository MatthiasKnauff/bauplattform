// Verknüpfungs-Karte (bp/karte.js): App „Planung“ und Reiter „Verknüpfungen“ – Ablauftest im echten Browser mit nachgebildetem Kern.
// Geprüft: je App eine Kiste und eine Linie (getrennt: keine), Beschriftung wechselt die Übernahme, das Ende an der Kiste die Richtung,
// „Alle Linien“, Zustand fest (fragt nach dem Stand der App, legt einen Modellstand an) und getrennt, Griff auf einen Modellstand ziehen,
// Stand festhalten, eigenes Rückgängig/Wiederholen, Standard, Hinweise an der Linie (Ablehnen); schmal (Bereich rechts, Handy) ohne Linien
// und ohne waagerechten Scrollbalken; kein Fehler in der Konsole.
//
// Aufgerufen aus oberflaeche.mjs:  const fehler = await kartePruefen(browser, repoWurzel)   – allein: node tools/tests/ui/karte.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

const APPS = [['plaene', 'Pläne', 'zum_modell', 'lebendig'], ['termine', 'Termine', 'beide', 'lebendig'], ['kosten', 'Kosten', 'beide', 'lebendig'], ['ausschreibung', 'Ausschreibung', 'beide', 'lebendig'],
  ['bauantrag', 'Bauantrag', 'zur_app', 'lebendig'], ['waermeschutz', 'Wärmeschutz', 'zur_app', 'lebendig'], ['honorar', 'Honorar', 'zur_app', 'lebendig'], ['bautagebuch', 'Bautagebuch', 'zum_modell', 'lebendig'], ['zeiten', 'Zeiten', 'beide', 'getrennt']];

export async function kartePruefen(browser, repo) {
  const KASTEN = path.join(repo, 'shared/bpcore/head');
  const fehler = [];
  const SEITE = `<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/bp/bp.css"><link rel="stylesheet" href="/bp/head.css"><body>
    <div id="feld"></div><script>window.BP_HEAD_BASIS = ['/bp/', ''];</script><script src="/bp/baukasten.js"></script><script src="/bp/head.js"></script><script src="/bp/karte.js"></script>
    <script>window.K = bpKarte.mount(document.getElementById('feld'), 7);</script>`;
  const BK = /BAUKASTEN = \(([^)]*)\)/.exec(fs.readFileSync(path.join(repo, 'shared/bpcore/head.py'), 'utf8'))[1].match(/"[^"]+"/g).map((s) => s.slice(1, -1));
  const baukasten = 'void 0;\n' + BK.map((f) => fs.readFileSync(path.join(KASTEN, f), 'utf8')).join('\n;\n');

  async function lauf(name, breite, tun, start = 'seite', warteAuf = '#feld .vk-karte') {
    const pruef = (ok, t) => { if (!ok) fehler.push(`${name}: ${t}`); };
    const ctx = await browser.newContext({ viewport: { width: breite, height: 900 } }), p = await ctx.newPage();
    p.on('pageerror', (e) => fehler.push(`${name}: Fehler im Skript – ${e.message}`));
    // Nachbildung des Kerns (bpcore/modell.py): Linien über dem Standard, Stände, Verlauf mit Rückgängig, Hinweise
    const STD = Object.fromEntries(APPS.map(([k, , r, z]) => [k, { richtung: r, uebernahme: 'uebernahme', zustand: z, stand_ref: '', stand_name: '', modell_stand: null }]));
    const S = { L: JSON.parse(JSON.stringify(STD)), staende: [{ nr: 1, kommentar: 'erste Skizze', anlass: 'hand', wann: '2026-11-01T10:00:00', wer: 'A' }], V: [], hin: [{ id: 5, app: 'kosten', titel: 'Wohnfläche OG im Modell: 82 m² → 88 m²', daten: { aenderung: 'Bodenbelag und Estrich OG steigen.', auswirkungen: [] }, status: 'offen' }, { id: 6, app: 'kosten', titel: 'Wärmeschutz: Aufbau Außenwand festgelegt', daten: { aenderung: '20 cm Mineralwolle' }, status: 'offen' }], anfragen: [] };
    const links = () => APPS.map(([k, n]) => ({ app: k, name: n, ...S.L[k], abweichend: JSON.stringify(S.L[k]) !== JSON.stringify(STD[k]), offen: S.hin.filter((h) => h.app === k && h.status === 'offen').length }));
    const alles = (mehr) => ({ modell: {}, rev: 1, staende: [...S.staende].reverse(), links: links(), apps: [], app_staende: { termine: [{ ref: 'gantt:v4', name: 'Plan V4', wann: '2026-11-10T09:00:00' }, { ref: 'gantt:v3', name: 'Plan V3', wann: '2026-11-02T09:00:00' }] }, ...mehr,
      verlauf: { eintraege: [...S.V].reverse().map((v) => ({ id: 1, text: v.text, zurueck: v.zr ? 1 : 0, wann: '2026-11-15T10:00:00', wer: 'A' })), rueck: S.V.some((v) => !v.zr), vor: S.V.some((v) => v.zr) } });
    const aendern = (text, fn) => { const vor = JSON.stringify(S.L); fn(); S.V = S.V.filter((v) => !v.zr); S.V.push({ text, vor, nach: JSON.stringify(S.L), zr: false }); };
    const sauber = (k) => { if (S.L[k].zustand !== 'fest') Object.assign(S.L[k], { stand_ref: '', stand_name: '', modell_stand: null }); };
    await p.route('http://portal.test/**', (r) => {
      const q = r.request(), pf0 = new URL(q.url()).pathname.replace(/^\//, ''), pf = pf0.startsWith('gebaeudemodell/') && pf0 !== 'gebaeudemodell/' ? pf0.slice(15) : pf0, J = (o, st) => r.fulfill({ status: st || 200, contentType: 'application/json', body: JSON.stringify(o) });
      if (pf === 'seite') return r.fulfill({ contentType: 'text/html', body: SEITE });
      if (pf === 'gebaeudemodell/') return r.fulfill({ contentType: 'text/html', body: fs.readFileSync(path.join(repo, 'plattform/static/gebaeudemodell.html')) });   // die App „Gebäudemodell“ selbst
      if (pf.startsWith('static/')) { const f = path.join(repo, 'plattform/static', pf.slice(7)); return fs.existsSync(f) ? r.fulfill({ contentType: f.endsWith('.css') ? 'text/css' : 'text/javascript', body: fs.readFileSync(f) }) : r.fulfill({ status: 404, body: '' }); }
      if (pf === 'bp/baukasten.js') return r.fulfill({ contentType: 'text/javascript', body: baukasten });
      if (pf.startsWith('bp/')) { const f = path.join(KASTEN, pf.slice(3)); return fs.existsSync(f) ? r.fulfill({ contentType: f.endsWith('.css') ? 'text/css' : 'text/javascript', body: fs.readFileSync(f) }) : r.fulfill({ status: 404, body: '' }); }
      if (pf === 'api/me') return J({ ok: true, id: 1, name: 'admin', vorname: 'A', role: 'admin', admin: true, is_admin: true, look: {} });
      if (pf === 'api/platform') return J({ apps: [], user: { name: 'admin', role: 'admin' }, projekte: [] });
      if (pf === 'api/bp/projekt') return J({ id: 7, name: 'Testprojekt', nummer: 'A1' });
      if (pf === 'api/bp/modell/7/vorschlag') return J({ felder: [], assistent: {} });
      if (pf.startsWith('api/') && !pf.startsWith('api/bp/modell/')) return J(/liste|projekte|neuigkeit|kontakte/.test(pf) ? [] : {});
      const m = /^api\/bp\/modell\/7(\/.*)?$/.exec(pf); if (!m) return J({}, pf.startsWith('api/') ? 200 : 404);
      const u = m[1] || '', b = q.method() === 'GET' ? {} : JSON.parse(q.postData() || '{}'); S.anfragen.push(q.method() + ' ' + u);
      if (u === '') return J(alles());
      if (u === '/hinweise') return J(S.hin.filter((h) => h.status === 'offen'));
      if (u.startsWith('/link/')) { const k = u.slice(6);
        if (b.zustand === 'fest' && !(b.stand_name || S.L[k].stand_name)) return J({ error: 'Fest geht nur auf einem Stand der App – bitte den Stand angeben.' }, 400);
        aendern(k, () => { Object.assign(S.L[k], b); sauber(k); }); return J(alles()); }
      if (u === '/alle') { aendern('Alle Linien', () => { for (const k in S.L) if (S.L[k].zustand === 'lebendig') S.L[k].uebernahme = b.uebernahme; }); return J(alles()); }
      if (u === '/stand') { const nr = S.staende.length + 1; S.staende.push({ nr, kommentar: b.kommentar, wann: '2026-11-15T10:00:00', wer: 'A' }); aendern('Stand', () => { for (const k in S.L) if (S.L[k].zustand === 'lebendig') S.L[k].uebernahme = 'uebernahme'; }); return J(alles({ nr })); }
      if (u === '/einfrieren') { const nr = S.staende.length + 1; S.staende.push({ nr, kommentar: b.stand_name, wann: '2026-11-15T10:00:00', wer: 'A' }); aendern('fest', () => { Object.assign(S.L[b.app], { zustand: 'fest', stand_ref: b.stand_ref || '', stand_name: b.stand_name, modell_stand: nr }); }); return J(alles({ nr })); }
      if (u === '/standard') { aendern('Standard', () => { for (const k of b.app ? [b.app] : Object.keys(S.L)) S.L[k] = { ...STD[k] }; }); return J(alles()); }
      if (u === '/rueck') { const v = [...S.V].reverse().find((x) => !x.zr); if (v) { S.L = JSON.parse(v.vor); v.zr = true; } return J(alles({ text: v ? v.text : '' })); }
      if (u === '/vor') { const v = S.V.find((x) => x.zr); if (v) { S.L = JSON.parse(v.nach); v.zr = false; } return J(alles({ text: v ? v.text : '' })); }
      if (u.startsWith('/hinweis/')) { const h = S.hin.find((x) => x.id === +u.slice(9)); if (h) h.status = b.status; return J(alles()); }
      return J({}, 404);
    });
    try { await p.goto('http://portal.test/' + start); await p.waitForSelector(warteAuf); await p.waitForTimeout(150); await tun(p, S, pruef); }
    catch (e) { fehler.push(`${name}: bricht ab – ` + String(e.message).split('\n').slice(0, 3).join(' ')); }
    await ctx.close();
  }
  const warte = (p) => p.waitForTimeout(250);
  const eingabe = async (p, text) => { await p.waitForSelector('.bph-dlg input, .bph-frage input'); await p.fill('.bph-dlg input, .bph-frage input', text); await p.keyboard.press('Enter'); await warte(p); };

  await lauf('breit', 1400, async (p, S, pruef) => {
    const bild = () => p.evaluate(() => ({ kisten: document.querySelectorAll('#feld .vk-box[data-app]').length, linien: document.querySelectorAll('#feld .vk-svg path').length, lab: [...document.querySelectorAll('#feld .vk-karte > .vk-lab')].map((x) => x.dataset.lab + ':' + x.textContent.trim()),
      quer: document.documentElement.scrollWidth > innerWidth + 1, det: (document.querySelector('#feld .vk-det h3') || {}).textContent || '' }));
    let b = await bild();
    pruef(b.kisten === 9 && b.linien === 8, `9 Kisten und 8 Linien erwartet (Zeiten ist getrennt): ${b.kisten}/${b.linien}`);
    pruef(b.lab.includes('kosten:mit Übernahme2'), `Zähler der offenen Hinweise fehlt an der Linie Kosten (${b.lab.join(', ')})`);
    pruef(/Modell und Kosten/.test(b.det), 'Die Linie mit offenem Hinweis ist nicht vorgewählt');
    pruef(!b.quer, 'waagerechter Scrollbalken');
    // Linien enden an Kiste und Modell
    const geo = await p.evaluate(() => { const k = document.querySelector('#feld .vk-karte').getBoundingClientRect(), g = document.querySelector('#feld [data-griff="termine"]').getBoundingClientRect(), m = document.querySelector('#feld .vk-mod').getBoundingClientRect(); return { dx: Math.abs(g.left + g.width / 2 - m.left), innen: g.top > k.top && g.bottom < k.bottom }; });
    pruef(geo.dx < 2 && geo.innen, `Griff der Linie Termine sitzt nicht am Rand des Modells (${JSON.stringify(geo)})`);
    // Beschriftung: Übernahme wechseln
    await p.click('#feld .vk-karte > .vk-lab[data-lab="termine"]'); await warte(p);
    pruef(S.L.termine.uebernahme === 'auto' && (await bild()).lab.includes('termine:automatisch'), 'Tippen auf die Beschriftung wechselt die Übernahme nicht');
    // Ende an der Kiste: Richtung wechseln
    await p.click('#feld [data-pf="termine"]'); await warte(p);
    pruef(S.L.termine.richtung === 'zur_app', `Tippen auf das Linienende wechselt die Richtung nicht (${S.L.termine.richtung})`);
    // eigenes Rückgängig / Wiederholen
    await p.click('#feld [data-vk="rueck"]'); await warte(p); pruef(S.L.termine.richtung === 'beide', 'Zurück nimmt die letzte Änderung nicht zurück');
    await p.click('#feld [data-vk="vor"]'); await warte(p); pruef(S.L.termine.richtung === 'zur_app', 'Wieder stellt die Änderung nicht wieder her');
    // Alle Linien
    await p.click('#feld [data-vk="alle"][data-v="auto"]'); await warte(p);
    pruef(S.L.kosten.uebernahme === 'auto' && S.L.zeiten.uebernahme === 'uebernahme' && await p.evaluate(() => document.querySelector('#feld [data-vk="alle"][data-v="auto"]').classList.contains('on')), '„Alle Linien: automatisch“ wirkt nicht (oder fasst getrennte Linien an)');
    // Stand festhalten → alle wieder mit Übernahme
    await p.click('#feld [data-vk="stand"]'); await eingabe(p, 'Vorentwurf');
    pruef(S.staende.length === 2 && S.L.kosten.uebernahme === 'uebernahme' && await p.evaluate(() => /2 · Vorentwurf/.test(document.querySelector('#feld .vk-ml').textContent)), 'Stand festhalten: Stand fehlt in der Kiste oder Linien stehen nicht auf „mit Übernahme“');
    // Zustand fest: fragt nach dem Stand der App, legt einen Modellstand an
    await p.click('#feld .vk-box[data-app="ausschreibung"] .vk-bh b'); await warte(p);
    await p.click('#feld .vk-det [data-set="zustand"][data-v="fest"]'); await eingabe(p, 'LV versendet 15.11.');
    pruef(S.L.ausschreibung.zustand === 'fest' && S.L.ausschreibung.modell_stand === 3 && await p.evaluate(() => /LV versendet 15\.11\./.test(document.querySelector('#feld .vk-box[data-app="ausschreibung"]').textContent)), `„fest“ hält den Stand nicht fest (${JSON.stringify(S.L.ausschreibung)})`);
    // getrennt: Linie verschwindet
    await p.click('#feld .vk-det [data-set="zustand"][data-v="getrennt"]'); await warte(p);
    b = await bild(); pruef(S.L.ausschreibung.zustand === 'getrennt' && b.linien === 7, `„getrennt“ nimmt die Linie nicht weg (${b.linien})`);
    // Griff auf einen Modellstand ziehen → fest auf diesem Stand
    const g = await p.locator('#feld [data-griff="kosten"]').boundingBox(), z = await p.locator('#feld .vk-ml [data-ms="1"]').boundingBox();
    await p.mouse.move(g.x + g.width / 2, g.y + g.height / 2); await p.mouse.down(); await p.mouse.move(z.x + 30, z.y + z.height / 2, { steps: 6 }); await p.mouse.up();
    await eingabe(p, 'Kostenschätzung'); if (process.env.DBG) { console.log(S.anfragen.slice(-4), await p.evaluate(() => (document.querySelector('.bph-dlg, .bph-frage') || {}).textContent)); await p.screenshot({ path: '/tmp/vk.png' }); }
    pruef(S.L.kosten.zustand === 'fest' && S.L.kosten.modell_stand === 1 && S.L.kosten.stand_name === 'Kostenschätzung', `Griff auf Stand 1 ziehen macht die Linie nicht fest (${JSON.stringify(S.L.kosten)})`);
    // Hinweise: einer wird abgelehnt, einer übernommen (zur Kenntnis)
    await p.waitForSelector('#feld .vk-det [data-hin="abgelehnt"]'); await p.click('#feld .vk-det [data-hid="5"] [data-hin="abgelehnt"]'); await warte(p);
    await p.waitForSelector('#feld .vk-det [data-hid="6"] [data-hin="uebernommen"]'); await p.click('#feld .vk-det [data-hid="6"] [data-hin="uebernommen"]'); await warte(p);
    pruef(S.hin[0].status === 'abgelehnt' && S.hin[1].status === 'uebernommen' && !(await bild()).lab.some((x) => /kosten:.*\d$/.test(x)), `Hinweise ablehnen/übernehmen wirkt nicht (${S.hin.map((h) => h.status)})`);
    // Stände der App in der Kiste: Linienende auf „Plan V3“ ziehen → fest auf diesem Stand; zurück auf „Arbeitsstand“ → lebendig
    pruef(await p.evaluate(() => [...document.querySelectorAll('#feld .vk-box[data-app="termine"] [data-as]')].map((x) => x.textContent.trim()).join('|')) === 'Arbeitsstand|Plan V4|Plan V3', 'Kiste Termine zeigt die Stände der App nicht');
    const zieh = async (von, nach) => { const a = await p.locator(von).boundingBox(), b = await p.locator(nach).boundingBox(); await p.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await p.mouse.down(); await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 6 }); await p.mouse.up(); await warte(p); };
    const ri = S.L.termine.richtung;
    await zieh('#feld [data-pf="termine"]', '#feld .vk-box[data-app="termine"] [data-as="gantt:v3"]');
    pruef(S.L.termine.zustand === 'fest' && S.L.termine.stand_ref === 'gantt:v3' && S.L.termine.stand_name === 'Plan V3' && S.L.termine.richtung === ri, `Linienende auf einen Stand der App ziehen (${JSON.stringify(S.L.termine)})`);
    pruef(await p.evaluate(() => document.querySelector('#feld .vk-box[data-app="termine"] [data-as="gantt:v3"]').classList.contains('on')), 'Der festgehaltene Stand ist in der Kiste nicht hervorgehoben');
    await zieh('#feld [data-pf="termine"]', '#feld .vk-box[data-app="termine"] [data-as=""]');
    pruef(S.L.termine.zustand === 'lebendig' && S.L.termine.stand_ref === '', 'Linienende zurück auf den Arbeitsstand macht die Linie nicht lebendig');
    // „fest“ über den Knopf: die Stände der App stehen zur Wahl
    await p.click('#feld .vk-box[data-app="termine"] .vk-bh b'); await warte(p); if (!await p.$('#feld .vk-det [data-set="zustand"]')) { await p.click('#feld .vk-box[data-app="termine"] .vk-bh b'); await warte(p); }
    await p.click('#feld .vk-det [data-set="zustand"][data-v="fest"]'); await p.waitForSelector('.modal .vk-wl'); await p.click('.modal .vk-wl [data-m="s0"]'); await warte(p);
    pruef(S.L.termine.zustand === 'fest' && S.L.termine.stand_ref === 'gantt:v4', `„fest“ mit Wahl des Standes (${JSON.stringify(S.L.termine)})`);
    // Beschriftung ziehen: die Linie biegt sich, die Übernahme bleibt; gemerkt je Projekt; nahe der Ausgangslage rastet sie zurück
    const ue = S.L.plaene.uebernahme, lab = await p.locator('#feld .vk-karte > .vk-lab[data-lab="plaene"]').boundingBox();
    await p.mouse.move(lab.x + lab.width / 2, lab.y + lab.height / 2); await p.mouse.down(); await p.mouse.move(lab.x + lab.width / 2 + 30, lab.y - 50, { steps: 5 }); await p.mouse.up(); await warte(p);
    const bg = await p.evaluate(() => ({ merk: JSON.parse(localStorage.getItem('bp.vk.biege.7') || '{}').plaene, pfad: [...document.querySelectorAll('#feld .vk-svg path')].filter((x) => (x.getAttribute('d').match(/C/g) || []).length === 2).length }));
    pruef(S.L.plaene.uebernahme === ue && Array.isArray(bg.merk) && Math.abs(bg.merk[1] + 60) < 14 && bg.pfad === 1, `Beschriftung ziehen biegt die Linie nicht (${JSON.stringify(bg)})`);
    const l2 = await p.locator('#feld .vk-karte > .vk-lab[data-lab="plaene"]').boundingBox();
    await p.mouse.move(l2.x + l2.width / 2, l2.y + l2.height / 2); await p.mouse.down(); await p.mouse.move(lab.x + lab.width / 2 + 4, lab.y + lab.height / 2 + 3, { steps: 5 }); await p.mouse.up(); await warte(p);
    pruef(await p.evaluate(() => !JSON.parse(localStorage.getItem('bp.vk.biege.7') || '{}').plaene), 'Beschriftung rastet nahe der Ausgangslage nicht zurück');
    // Standard wiederherstellen (mit Rückfrage)
    await p.click('#feld [data-vk="standard"]'); await p.waitForSelector('.bph-frage, .bph-dlg'); await p.evaluate(() => [...document.querySelectorAll('.bph-frage button, .bph-dlg button')].find((x) => /Zurücksetzen/.test(x.textContent)).click()); await warte(p);
    b = await bild(); pruef(S.L.kosten.zustand === 'lebendig' && S.L.termine.richtung === 'beide' && b.linien === 8, 'Standard wiederherstellen wirkt nicht');
    // Verlauf
    await p.click('#feld [data-vk="verlauf"]'); await p.waitForSelector('.modal .vk-vl');
    pruef(await p.evaluate(() => document.querySelectorAll('.modal .vk-vl > div').length >= 6), 'Verlauf zeigt die Änderungen nicht');
    await p.click('.modal [data-m="zu"]');
  });

  await lauf('schmal', 420, async (p, S, pruef) => {
    const b = await p.evaluate(() => ({ eng: document.querySelector('#feld').classList.contains('vk-eng'), linien: document.querySelectorAll('#feld .vk-svg path').length, quer: document.documentElement.scrollWidth > innerWidth + 1,
      lab: [...document.querySelectorAll('#feld .vk-bh .vk-lab')].filter((x) => x.offsetParent).length, erste: document.querySelector('#feld .vk-karte .vk-box').className }));
    pruef(b.eng && b.linien === 0 && b.lab === 9, `schmal: Kisten untereinander mit Knopf je Linie erwartet (${JSON.stringify(b)})`);
    pruef(!b.quer, 'schmal: waagerechter Scrollbalken');
    await p.click('#feld .vk-box[data-app="kosten"] .vk-lab'); await warte(p);
    pruef(S.L.kosten.uebernahme === 'auto', 'schmal: Knopf an der Kiste wechselt die Übernahme nicht');
  });
  // Die App „Planung“: Navigation links (Verknüpfungen · Assistent · Bauteile · Stände), Projekt aus der Kopfleiste, Bausteine erst bei Bedarf
  await lauf('App Planung', 1500, async (p, S, pruef) => {
    const b = await p.evaluate(() => ({ nav: [...document.querySelectorAll('#navL [data-pl]')].map((x) => x.textContent.trim()), kisten: document.querySelectorAll('#view .vk-box[data-app]').length, linien: document.querySelectorAll('#view .vk-svg path').length, quer: document.documentElement.scrollWidth > innerWidth + 1 }));
    if (process.env.BILD) await p.screenshot({ path: process.env.BILD });   // zum Ansehen: BILD=/tmp/planung.png node tools/tests/ui/karte.mjs
    pruef(b.nav.join('|') === 'Verknüpfungen|Assistent|Bauteile|Stände', `Navigation der App: ${b.nav.join('|')}`);
    pruef(b.kisten === 9 && b.linien === 8 && !b.quer, `Karte in der App: ${JSON.stringify(b)}`);
    await p.evaluate(() => [...document.querySelectorAll('#navL [data-pl]')].find((x) => /Stände/.test(x.textContent)).click()); await p.waitForSelector('#view table');
    pruef(await p.evaluate(() => /erste Skizze/.test(document.querySelector('#view table').textContent)), 'Bereich „Stände“ zeigt die Stände nicht');
    await p.click('#view [data-plstand]'); await eingabe(p, 'Entwurf'); await p.waitForTimeout(300);
    pruef(S.staende.length === 2 && await p.evaluate(() => /Entwurf/.test(document.querySelector('#view table').textContent)), '„Stand festhalten“ im Bereich Stände wirkt nicht');
    await p.evaluate(() => [...document.querySelectorAll('#navL [data-pl]')].find((x) => /Assistent/.test(x.textContent)).click()); await p.waitForSelector('#view .pa', { timeout: 8000 });
  }, 'gebaeudemodell/', '#view .vk-karte');
  return fehler;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await kartePruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
  await b.close(); console.log(f.length ? f.join('\n') : 'ok'); process.exit(f.length ? 1 : 0);
}
