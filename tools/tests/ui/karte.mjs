// Verknüpfungen (bp/karte.js, neu nach dem Konzept 20.11.2026: A → B → C, Feld rechts) – Ablauftest im echten Browser mit nachgebildetem Kern.
// Geprüft: A2 + C1–C6 mit Pfeilen (keine Zeiten, keine Wahl der Richtung), vorgewählt die App mit Hinweisen, Übernahme automatisch/mit Übernahme/getrennt
// im Feld rechts, Hinweise abarbeiten, Versionen (an der Kiste nur ★, Version wählen = fest, „aktuell“ fragt übernehmen/nur folgen), Stand festhalten,
// Planstände an A2, alle Apps, Standard, Verlauf, Weg I–V; Bereich rechts und schmal ohne waagerechten Scrollbalken; kein Fehler in der Konsole.
//
// Aufgerufen aus oberflaeche.mjs:  const fehler = await kartePruefen(browser, repoWurzel)   – allein: node tools/tests/ui/karte.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

const APPS = [['plaene', 'Pläne', 'zum_modell', 'lebendig'], ['termine', 'Termine', 'beide', 'lebendig'], ['kosten', 'Kosten', 'beide', 'lebendig'], ['ausschreibung', 'Ausschreibung', 'beide', 'lebendig'],
  ['bauantrag', 'Bauantrag', 'zur_app', 'lebendig'], ['waermeschutz', 'Wärmeschutz', 'beide', 'lebendig'], ['honorar', 'Honorar', 'zur_app', 'lebendig'], ['bautagebuch', 'Bautagebuch', 'zum_modell', 'lebendig'], ['zeiten', 'Zeiten', 'beide', 'getrennt']];

export async function kartePruefen(browser, repo) {
  const KASTEN = path.join(repo, 'shared/bpcore/head');
  const fehler = [];
  const SEITE = `<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/bp/bp.css"><link rel="stylesheet" href="/bp/head.css"><body>
    <div id="feld"></div><script>window.BP_HEAD_BASIS = ['/bp/', ''];</script><script src="/bp/baukasten.js"></script><script src="/bp/head.js"></script><script src="/bp/karte.js"></script>
    <script>window.K = bpKarte.mount(document.getElementById('feld'), 7);</script>`;
  const BK = /BAUKASTEN = \(([^)]*)\)/.exec(fs.readFileSync(path.join(repo, 'shared/bpcore/head.py'), 'utf8'))[1].match(/"[^"]+"/g).map((s) => s.slice(1, -1));
  const baukasten = 'void 0;\n' + BK.map((f) => fs.readFileSync(path.join(KASTEN, f), 'utf8')).join('\n;\n');

  async function lauf(name, breite, tun, start = 'seite', warteAuf = '#feld .vk-bild') {
    const pruef = (ok, t) => { if (!ok) fehler.push(`${name}: ${t}`); };
    const ctx = await browser.newContext({ viewport: { width: breite, height: 900 } }), p = await ctx.newPage();
    p.on('pageerror', (e) => fehler.push(`${name}: Fehler im Skript – ${e.message}`));
    // Nachbildung des Kerns (bpcore/modell.py): Linien über dem Standard, Stände, Verlauf mit Rückgängig, Hinweise
    const STD = Object.fromEntries(APPS.map(([k, , r, z]) => [k, { richtung: r, uebernahme: 'uebernahme', zustand: z, stand_ref: '', stand_name: '', modell_stand: null }]));
    const S = { gilt: 'gantt:v4', L: JSON.parse(JSON.stringify(STD)), staende: [{ nr: 11, kommentar: 'Werkplanung', anlass: '', gilt: true, wann: '2026-11-01T10:00:00', wer: 'A' }], V: [], hin: [{ id: 5, app: 'kosten', titel: 'Wohnfläche OG im Modell: 82 m² → 88 m²', daten: { aenderung: 'Bodenbelag und Estrich OG steigen.', auswirkungen: [] }, status: 'offen' }, { id: 6, app: 'kosten', titel: 'Wärmeschutz: Aufbau Außenwand festgelegt', daten: { aenderung: '20 cm Mineralwolle' }, status: 'offen' }], anfragen: [] };
    const links = () => APPS.map(([k, n]) => ({ app: k, name: n, ...S.L[k], abweichend: JSON.stringify(S.L[k]) !== JSON.stringify(STD[k]), offen: S.hin.filter((h) => h.app === k && h.status === 'offen').length }));
    const alles = (mehr) => ({ modell: {}, rev: 1, staende: [...S.staende].reverse(), links: links(), apps: [], app_staende: { termine: [{ ref: 'gantt:v4', name: 'Plan V4', wann: '2026-11-10T09:00:00', gilt: S.gilt === 'gantt:v4' }, { ref: 'gantt:v3', name: 'Plan V3', wann: '2026-11-02T09:00:00', gilt: S.gilt === 'gantt:v3' }] }, ...mehr,
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
      if (u === '/gilt') { S.gilt = b.ref; return J(alles()); }   // Version wird die gültige (★)
      if (u === '/alle') { aendern('Alle Linien', () => { for (const k in S.L) if (S.L[k].zustand === 'lebendig') S.L[k].uebernahme = b.uebernahme; }); return J(alles()); }
      if (u === '/einfrieren') { const nr = 11; aendern('fest', () => { Object.assign(S.L[b.app], { zustand: 'fest', stand_ref: b.stand_ref || '', stand_name: b.stand_name, modell_stand: nr }); }); return J(alles({ nr })); }
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

  await lauf('breit', 1400, async (p, S, pruef) => {   // GO 20.11.2026 (Mock „Verknüpfungen neu“ A1 B1 C1 D1 E1): A → B → C nach dem Whiteboard
    const bild = () => p.evaluate(() => ({ apps: [...document.querySelectorAll('#feld .vk-bild .vk-k[data-app]')].map((x) => x.dataset.app).join(','), pfeile: document.querySelectorAll('#feld .vk-svg path[stroke]').length,
      quer: document.documentElement.scrollWidth > innerWidth + 1, det: (document.querySelector('#feld .vk-det h3') || {}).textContent || '', zeiten: /Zeiten/.test(document.querySelector('#feld').textContent),
      weg: [...document.querySelectorAll('#feld .vk-weg button')].findIndex((x) => x.classList.contains('jetzt')), richtung: !!document.querySelector('#feld [data-set="richtung"], #feld [data-pf]') }));
    let b = await bild();
    pruef(b.apps === '_plan,kosten,waermeschutz,ausschreibung,termine,honorar,bauantrag' && b.pfeile === 8, `A2 + C1–C6 und 8 Pfeile erwartet: ${b.apps} / ${b.pfeile}`);
    pruef(!b.zeiten && !b.richtung, 'D1/B1: keine Kiste „Zeiten“, keine Wahl der Richtung');
    pruef(/Kosten ↔ Gebäudemodell2/.test(b.det), `App mit offenen Hinweisen ist nicht vorgewählt (${b.det})`);
    pruef(b.weg === 0 && !b.quer, `Weg I–V: ohne Angaben steht das Projekt bei I (${b.weg}); waagerechter Scrollbalken: ${b.quer}`);
    // Übernahme im Feld rechts (A1): automatisch · mit Übernahme · getrennt
    await p.click('#feld .vk-det [data-ueb="auto"]'); await warte(p); pruef(S.L.kosten.uebernahme === 'auto' && S.L.kosten.zustand === 'lebendig', `automatisch (${JSON.stringify(S.L.kosten)})`);
    await p.click('#feld .vk-det [data-ueb="getrennt"]'); await warte(p);
    b = await bild(); pruef(S.L.kosten.zustand === 'getrennt' && await p.evaluate(() => document.querySelector('#feld .vk-k[data-app="kosten"]').classList.contains('weg')), 'getrennt');
    await p.click('#feld .vk-det [data-ueb="uebernahme"]'); await warte(p); pruef(S.L.kosten.zustand === 'lebendig' && S.L.kosten.uebernahme === 'uebernahme', `wieder mit Übernahme (${JSON.stringify(S.L.kosten)})`);
    pruef(await p.evaluate(() => typeof window.bpUndo === 'object' || typeof window.rueckgaengig === 'function'), 'Rückgängig über undo.js fehlt');
    // Hinweise abarbeiten
    await p.waitForSelector('#feld .vk-det [data-hid="5"] [data-hin="abgelehnt"]'); await p.click('#feld .vk-det [data-hid="5"] [data-hin="abgelehnt"]'); await warte(p);
    await p.waitForSelector('#feld .vk-det [data-hid="6"] [data-hin="uebernommen"]'); await p.click('#feld .vk-det [data-hid="6"] [data-hin="uebernommen"]'); await warte(p);
    pruef(S.hin[0].status === 'abgelehnt' && S.hin[1].status === 'uebernommen' && !(await p.$('#feld .vk-k[data-app="kosten"] .vk-z')), `Hinweise ablehnen/übernehmen (${S.hin.map((h) => h.status)})`);
    // Version der App (C1): an der Kiste nur ★, im Feld alle; Version wählen = fest, „aktuell“ fragt übernehmen/nur folgen
    await p.click('#feld .vk-k[data-app="termine"]'); await warte(p);
    pruef(await p.evaluate(() => /★ Plan V4/.test(document.querySelector('#feld .vk-k[data-app="termine"]').textContent) && !/Plan V3/.test(document.querySelector('#feld .vk-k[data-app="termine"]').textContent)
      && [...document.querySelectorAll('#feld .vk-det [data-ver] span')].map((x) => x.textContent.trim()).join('|') === 'aktuell – folgt dem Modell|★ Plan V4|Plan V3'), 'Versionen: an der Kiste nur ★, im Feld alle');
    await p.click('#feld .vk-det [data-ver="gantt:v3"]'); await warte(p);
    pruef(S.L.termine.zustand === 'fest' && S.L.termine.stand_ref === 'gantt:v3' && S.L.termine.stand_name === 'Plan V3', `Version wählen hält die Linie fest (${JSON.stringify(S.L.termine)})`);
    await p.click('#feld .vk-det [data-ver=""]'); await p.waitForSelector('.modal [name="vkz"]'); await p.click('.modal [name="vkz"][value="folgen"]'); await p.click('.modal [data-m="ok"]'); await warte(p);
    pruef(S.L.termine.zustand === 'lebendig' && S.gilt === 'gantt:v4', 'zurück auf „aktuell“ mit „nur folgen“');
    await p.click('#feld .vk-det [data-ver="gantt:v3"]'); await warte(p);
    await p.click('#feld .vk-det [data-ver=""]'); await p.waitForSelector('.modal [name="vkz"]'); await p.click('.modal [data-m="ok"]'); await warte(p);
    pruef(S.L.termine.zustand === 'lebendig' && S.gilt === 'gantt:v3', `zurück auf „aktuell“ mit „übernehmen“ (${S.gilt})`);
    // App ohne Versionen: Stand festhalten
    await p.click('#feld .vk-k[data-app="ausschreibung"]'); await warte(p);
    await p.click('#feld .vk-det [data-vk="festhalten"]'); await eingabe(p, 'LV versendet 15.11.');
    pruef(S.L.ausschreibung.zustand === 'fest' && S.L.ausschreibung.stand_name === 'LV versendet 15.11.' && await p.evaluate(() => /fest: LV versendet/.test(document.querySelector('#feld .vk-k[data-app="ausschreibung"]').textContent)), `Stand festhalten (${JSON.stringify(S.L.ausschreibung)})`);
    // A2: Planstände, ★ gilt
    await p.click('#feld .vk-k[data-app="_plan"]'); await warte(p);
    pruef(await p.evaluate(() => document.querySelector('#feld .vk-det [data-ps="11"]').classList.contains('on')), 'A2: Planstände mit ★');
    // ohne Auswahl: alle Apps, Standard, Verlauf
    await p.click('#feld .vk-k[data-app="_plan"]'); await warte(p);
    await p.click('#feld .vk-det [data-alle="auto"]'); await warte(p);
    pruef(S.L.kosten.uebernahme === 'auto' && S.L.zeiten.uebernahme === 'uebernahme', '„Alle Apps: automatisch“ wirkt nicht (oder fasst getrennte an)');
    await p.click('#feld [data-vk="standard"]'); await p.waitForSelector('.bph-frage, .bph-dlg'); await p.evaluate(() => [...document.querySelectorAll('.bph-frage button, .bph-dlg button')].find((x) => /Zurücksetzen/.test(x.textContent)).click()); await warte(p);
    pruef(S.L.kosten.uebernahme === 'uebernahme' && S.L.ausschreibung.zustand === 'lebendig', 'Standard wiederherstellen wirkt nicht');
    await p.click('#feld [data-vk="verlauf"]'); await p.waitForSelector('.modal .vk-vlg');
    pruef(await p.evaluate(() => document.querySelectorAll('.modal .vk-vlg > div').length >= 6), 'Verlauf zeigt die Änderungen nicht');
    await p.click('.modal [data-m="zu"]');
  });

  await lauf('Bereich rechts', 760, async (p, S, pruef) => {
    const b = await p.evaluate(() => { const K = document.querySelector('#feld .vk-bild'), k = K.getBoundingClientRect(), d = document.querySelector('#feld .vk-det').getBoundingClientRect();
      const B = [...K.querySelectorAll('.vk-k, .vk-m')].map((x) => x.getBoundingClientRect());
      return { mittel: document.querySelector('#feld').classList.contains('vk-mittel'), drin: B.every((r) => r.left >= k.left - 1 && r.right <= k.right + 1), unter: d.top >= k.bottom - 1,
        pfeile: K.querySelectorAll('.vk-svg path[stroke]').length, quer: document.documentElement.scrollWidth > innerWidth + 1 }; });
    pruef(b.mittel && b.drin && b.unter && b.pfeile === 8 && !b.quer, `im Bereich rechts: ${JSON.stringify(b)}`);
  });
  await lauf('schmal', 420, async (p, S, pruef) => {
    const b = await p.evaluate(() => ({ eng: document.querySelector('#feld').classList.contains('vk-eng'), pfeile: document.querySelectorAll('#feld .vk-svg path[stroke]').length, quer: document.documentElement.scrollWidth > innerWidth + 1 }));
    pruef(b.eng && b.pfeile === 0 && !b.quer, `schmal: untereinander ohne Pfeile (${JSON.stringify(b)})`);
    await p.click('#feld .vk-det [data-ueb="auto"]'); await warte(p);
    pruef(S.L.kosten.uebernahme === 'auto', 'schmal: Übernahme im Feld wirkt nicht');
  });
  // Die App „Gebäudemodell“: Navigation links (Gebäude · Fragen & Anweisungen · Verknüpfungen), Befehlsleiste, Projekt aus der Kopfleiste, Bausteine erst bei Bedarf
  await lauf('App Planung', 1500, async (p, S, pruef) => {
    const b = await p.evaluate(() => ({ nav: [...document.querySelectorAll('#navL [data-pl]')].map((x) => x.textContent.trim()), kisten: document.querySelectorAll('#view .vk-bild .vk-k[data-app]').length, linien: document.querySelectorAll('#view .vk-svg path[stroke]').length, quer: document.documentElement.scrollWidth > innerWidth + 1 }));
    if (process.env.BILD) await p.screenshot({ path: process.env.BILD });   // zum Ansehen: BILD=/tmp/planung.png node tools/tests/ui/karte.mjs
    pruef(b.nav.join('|') === 'Gebäude|Fragen & Anweisungen|Verknüpfungen', `Navigation der App: ${b.nav.join('|')}`);
    pruef(b.kisten === 7 && b.linien === 8 && !b.quer, `Verknüpfungen in der App: ${JSON.stringify(b)}`);
    pruef(await p.evaluate(() => ![...document.querySelectorAll('#bfl button')].some((x) => /^Stand$/.test(x.textContent.trim()))), 'Gebäudemodell: oben nur die Planstände – kein „Neu → Stand“ mehr (17.11.2026)');
    await p.evaluate(() => [...document.querySelectorAll('.sr-auf, .sr-tab')].find((x) => /Planung/.test(x.textContent)).click()); await p.waitForSelector('.sr-r .pa', { timeout: 8000 });   // Assistent rechts, zuerst an den Rand geklappt (17.11.2026)
  }, 'gebaeudemodell/#karte', '#view .vk-bild');   // die App startet mit der 3D-Ansicht
  return fehler;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await kartePruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
  await b.close(); console.log(f.length ? f.join('\n') : 'ok'); process.exit(f.length ? 1 : 0);
}
