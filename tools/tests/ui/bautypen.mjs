// Bauteiltypen in der Oberfläche (Gebäudemodell neu, Etappe 2 – 22.11.2026): Baum nach Typ gruppiert (Vorgabe), Eigenschaften-Fenster mit
// Reiter „Typ AW-01“ (alle Bauteile desselben Typs), „Neuer Typ aus den angehakten …“ (PUT …/typen) mit Rückgängig (Aktion „stand“).
// Aufgerufen aus oberflaeche.mjs:  const fehler = await bautypenPruefen(browser, repoWurzel)
import fs from 'node:fs'; import path from 'node:path';

export async function bautypenPruefen(browser, repo) {
  const R = path.join(repo, 'shared/bpcore/head/'), fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  const q = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  q.on('pageerror', (e) => fehler.push('Fehler im Skript – ' + e.message));
  const Z = (id, name, typ, teil, ids = [1]) => ({ id, bereich: 'rohbau', art: 'Wand', kg: '331', name, menge: 20, einheit: 'm²', zustand: 'ifc', status: 'neu', erlaubt: ['neu'], quelle: 'ifc', ids, nummern: [],
    teil, typ, vorlage: '331.01', wahl: [0], code: '', kurz: 'AW KS 17,5', berechnen: true });
  const S = { L: { quelle: { planstand: 4, name: 'Plan', art: 'ifc' }, raeume: [], zeilen: [Z('a', 'AW 24 Nord', 'AW-01', 'Haus', [7, 8]), Z('b', 'AW 24 Süd', 'AW-01', 'Anbau'), Z('c', 'AW 30', 'AW-02', 'Haus')],
    typen: { 'AW-01': { k: 'AW-01', kg: '331', name: 'Außenwand 24', vorlage: '331.01', wahl: [0], kurz: 'AW KS 17,5' }, 'AW-02': { k: 'AW-02', kg: '331', name: '', vorlage: '331.01', wahl: [0], kurz: 'AW KS 17,5' } } }, put: [] };
  const alles = () => ({ modell: { bauteilliste: S.L }, rev: 3 + S.put.length, staende: [], links: [] });
  await q.route('http://typ.test/**', async (r) => {
    const u = new URL(r.request().url()).pathname, J = (o) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(o) });
    if (u === '/seite') return r.fulfill({ contentType: 'text/html', body: `<!doctype html><meta charset=utf-8><style>${fs.readFileSync(R + 'bp.css', 'utf8')}</style><body><div id="feld"></div><div id="det"></div><script>${fs.readFileSync(R + 'bp.js', 'utf8')}</script><script>${fs.readFileSync(R + 'baum.js', 'utf8')}</script><script>${fs.readFileSync(R + 'gruppen.js', 'utf8')}</script><script>${fs.readFileSync(R + 'spaltbreite.js', 'utf8')}</script><script>${fs.readFileSync(R + 'eigenschaften.js', 'utf8')}</script><script>${fs.readFileSync(R + 'bauteile.js', 'utf8')}</script>
      <script>window.bpEingabe = async () => 'Sonderwand'; window.bpHinweis = () => {}; window.U = []; window.rueckgaengig = (t, z) => U.push([t, z]); window.BPHead = { projekt: { name: 'A100' }, conf: { apps: [] }, appUrl: () => '' };
      window.BT = bpBauteile.mount(document.getElementById('feld'), 7, { baum: true, artJe: (ids, kg) => { window.AJ = [ids, kg]; }, e3: () => [7] }); BT.details(document.getElementById('det'))</script>` });
    if (u.endsWith('/typen')) { const d = r.request().postDataJSON(); S.put.push(d);
      if (d.aktion === 'neu_aus') { S.L.typen['AW-03'] = { ...S.L.typen[d.typ], k: 'AW-03', name: d.name }; S.L.zeilen.forEach((z) => { if (d.zeilen.includes(z.id)) z.typ = 'AW-03'; }); return J({ ...alles(), typ: 'AW-03' }); }
      if (d.aktion === 'stand') { S.L.typen = d.stand.typen; S.L.zeilen.forEach((z) => { if (d.stand.zeilen[z.id]) z.typ = d.stand.zeilen[z.id].typ; }); return J({ ...alles(), typ: '' }); }
      return J(alles()); }
    if (u.endsWith('/bauteile/vorlagen')) return J([{ id: '331.01', kg: '331', name: 'AW', einheit: 'm²', schichten: [] }]);
    if (u.endsWith('/modell/kurzwahl')) return J({ AW: { name: 'Außenwand', quelle: 'auto', eintraege: [{ vorlage: '331.01', wahl: [0], dicken: {}, ausf: {}, kurz: 'AW KS 17,5' }, { vorlage: '331.05', wahl: [0], dicken: {}, ausf: {}, kurz: 'Holzrahmen 24' }] } });
    if (u.endsWith('/bauteile/zeile')) { S.zeile = r.request().postDataJSON(); return J(alles()); }
    if (u.endsWith('/modell/kuerzel')) return J({ kern: [], lage: [] });
    if (u.endsWith('/planstaende')) return J({ planstaende: [{ id: 4, name: 'Plan' }], gilt: 4 });
    if (u.endsWith('/rueckweg')) return J({ vorschlaege: [], schalter: {}, phasen: [], termine: {} });
    if (u === '/api/bp/modell/7') return J(alles());
    return r.fulfill({ status: 404, body: '' });
  });
  try {
    await q.goto('http://typ.test/seite'); await q.waitForSelector('.bt-baum tr.bt-bh');
    const kopf = () => q.evaluate(() => ({ chips: [...document.querySelectorAll('.bt-grp [data-bpgk]')].map((c) => c.dataset.bpgk).join(), k: [...document.querySelectorAll('.bt-baum tr.bt-bh b')].map((b) => b.textContent), z: document.querySelectorAll('.bt-baum tr[data-btz]').length }));
    const g0 = await kopf();   // Vorgabe (22.11.2026): Bauteilart › Typ, Gruppen anfangs zu, Typ ohne Namen zeigt den Aufbau
    pruef(g0.chips === 'art,typ' && g0.k.join('|') === 'Außenwände' && !g0.z, `Vorgabe: Bauteilart › Typ, zu – ${JSON.stringify(g0)}`);
    await q.click('.bt-baum tr.bt-bh [data-zu]'); await q.waitForTimeout(100);
    const g1 = await kopf();
    pruef(g1.k.join('|') === 'Außenwände|AW-01 · Außenwand 24|AW-02 · AW KS 17,5' && !g1.z, `Außenwände auf: Typen darunter, zu – ${JSON.stringify(g1)}`);
    for (const n of [1, 2]) { await q.evaluate((n) => document.querySelectorAll('.bt-baum tr.bt-bh [data-zu]')[n].click(), n); await q.waitForTimeout(80); }
    await q.waitForSelector('.bt-baum [data-btz="a"]');
    // Spaltenbreite ziehen wie im LV (bp/spaltbreite.js, 22.11.2026)
    const th = await q.$('.bt-baum th .sb-griff'); const bx = th && await th.boundingBox();
    if (!bx) fehler.push('Spaltenbreite: kein Griff am Spaltenkopf'); else {
      const w0 = await q.evaluate(() => document.querySelector('.bt-baum th').getBoundingClientRect().width);
      await q.mouse.move(bx.x + 4, bx.y + 5); await q.mouse.down(); await q.mouse.move(bx.x + 84, bx.y + 5, { steps: 4 }); await q.mouse.up();
      const r = await q.evaluate(() => ({ w: document.querySelector('.bt-baum th').getBoundingClientRect().width, m: JSON.parse(localStorage.getItem('bp.sb') || '{}').bauteile }));
      pruef(r.w > w0 + 50 && r.m, `Spaltenbreite gezogen und gemerkt: ${w0} → ${r.w}, ${JSON.stringify(r.m)}`); }
    await q.dblclick('.bt-baum tr[data-btz="a"] .bt-tn'); await q.waitForSelector('.bt-pop .bt-typl', { state: 'attached', timeout: 5000 });
    const p = await q.evaluate(() => ({ titel: document.querySelector('.bt-pop .bp-eigk b').textContent, reiter: [...document.querySelectorAll('.bt-pop [data-btpu]')].map((b) => b.textContent) }));
    pruef(/Typ AW-01 · Außenwand 24/.test(p.titel) && p.reiter[1] === 'Typ AW-01 (2)', `Fenster: Typ im Titel, Reiter „Typ AW-01 (2)“ – ${JSON.stringify(p)}`);
    // Kurzwahl (Etappe 3): Knöpfe über der Suche, der jetzige Aufbau ist markiert, Klick setzt Vorlage und Optionen
    await q.waitForSelector('.bt-pop [data-btkw="1"]', { timeout: 5000 });
    pruef(await q.evaluate(() => document.querySelector('.bt-pop [data-btkw="0"]').classList.contains('on') && /meistbenutzt/.test(document.querySelector('.bt-pop .bt-kw').textContent)), 'Kurzwahl: jetziger Aufbau markiert, „meistbenutzt“');
    await q.click('.bt-pop [data-btkw="1"]'); await q.waitForTimeout(150);
    pruef(S.zeile && S.zeile.id === 'a' && S.zeile.vorlage === '331.05' && S.zeile.wahl.join() === '0', `Kurzwahl setzt den Aufbau: ${JSON.stringify(S.zeile)}`);
    await q.click('.bt-pop [data-btpu="gleich"]');
    pruef(await q.evaluate(() => [...document.querySelectorAll('.bt-pop .bt-popu tbody tr')].map((t) => t.dataset.btpz).join()) === 'a,b', 'Reiter Typ: beide Bauteile des Typs');
    await q.evaluate(() => { U.length = 0; });
    await q.click('.bt-pop [data-bttyp="neu"]'); await q.waitForFunction(() => document.querySelectorAll('.bt-baum tr.bt-bh').length === 4);   // Außenwände + drei Typen
    const n = S.put[0] || {};
    pruef(n.aktion === 'neu_aus' && n.typ === 'AW-01' && n.zeilen.join() === 'a' && n.name === 'Sonderwand', `Neuer Typ aus den angehakten: ${JSON.stringify(n)}`);
    pruef(await q.evaluate(() => U.length === 1 && /Neuer Typ aus AW-01/.test(U[0][0])), 'Rückgängig angeboten');
    await q.evaluate(() => U[0][1]()); await q.waitForFunction(() => document.querySelectorAll('.bt-baum tr.bt-bh').length === 3);
    const s = S.put[1] || {};
    pruef(s.aktion === 'stand' && s.stand.zeilen.a.typ === 'AW-01' && !s.stand.typen['AW-03'], `Rückgängig: Stand vorher – ${JSON.stringify(s).slice(0, 200)}`);
    // Art je Bauteil (22.11.2026): mehrere gewählt → „Art ▾“; im 3D gewählte Bauteile dieser Zeilen gehen hinaus, nicht die ganze Zeile
    await q.click('.bt-pop .bp-eigk [data-m="x"]');
    await q.evaluate(() => BT.mehr(['a', 'c'])); await q.waitForSelector('.bt-mwl [data-btmwart]', { timeout: 5000 });
    await q.click('.bt-mwl [data-btmwart]'); await q.click('.pickm .pm-o:has-text("Innenwand tragend")');
    const aj = await q.evaluate(() => window.AJ);
    pruef(aj && aj[0].join() === '7' && aj[1] === '341', `Art ▾ für die im 3D gewählten Bauteile: ${JSON.stringify(aj)}`);
  } catch (e) { fehler.push('bricht ab – ' + String(e.message).split('\n').slice(0, 3).join(' / ')); }
  await q.close();
  return fehler;
}
