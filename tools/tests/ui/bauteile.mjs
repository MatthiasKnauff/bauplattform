// Bauteil-Checkliste (bp/bauteile.js, Entwurf vom 16.11.2026): Zeilen je Bereich, offene rot markiert, Status setzen (POST …/bauteile/zeile),
// Aufbau wählen (Vorlage, Option je Schicht), „berechnen“ an- und abhaken, IFC einlesen; schmal ohne waagerechten Scrollbalken.
// Ablauftest im echten Browser mit nachgebildetem Kern.
//
// Aufgerufen aus oberflaeche.mjs:  const fehler = await bauteilePruefen(browser, repoWurzel)   – allein: node tools/tests/ui/bauteile.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

export async function bauteilePruefen(browser, repo) {
  const R = path.join(repo, 'shared/bpcore/head/'), fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  const p = await browser.newPage({ viewport: { width: 420, height: 900 } });
  p.on('pageerror', (e) => fehler.push('Fehler im Skript – ' + e.message));
  const Z = (id, b, name, mehr = {}) => ({ id, bereich: b, art: name, kg: b === 'oeffnung' ? '334' : '345', name, menge: 9, einheit: 'St', anzahl: 9, zustand: 'leer', status: 'offen', berechnen: false,
    vorlage: '', wahl: [], code: '', kurz: '', quelle: 'ifc', ids: [], nummern: [], hinweis: '',
    erlaubt: { oeffnung: ['bleibt', 'instandsetzen', 'erneuern', 'neu', 'abbruch'], raum: ['bleibt', 'instandsetzen', 'erneuern'], frage: ['bleibt', 'erneuern', 'neu'] }[b] || ['neu'], ...mehr });   // erlaubt: vom Kern (bauteilliste.erlaubt)
  const S = { L: { quelle: { datei: 'wohnung.ifc', gelesen: '2026-11-16T00:30:00', programm: 'Allplan 2026.1' }, raeume: [],
    zeilen: [Z('f', 'oeffnung', 'Fensteröffnung', { nummern: ['F 01', 'F 02'] }), Z('w', 'raum', 'Wände (0.01, 0.02)', { einheit: 'm²', menge: 120.5 }), Z('frage:elektro', 'frage', 'Elektroinstallation', { kg: '444', einheit: 'm²' })] },
    anfragen: [] };
  const alles = () => ({ modell: { bauteilliste: S.L }, rev: S.anfragen.length + 1, staende: [], links: [] });
  await p.route('http://bauteile.test/**', async (r) => {
    const q = r.request(), u = new URL(q.url()).pathname, J = (o) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(o) });
    if (u === '/seite') return r.fulfill({ contentType: 'text/html', body: `<!doctype html><meta charset=utf-8><style>${fs.readFileSync(R + 'bp.css', 'utf8')}</style><body><div id="feld"></div><div id="det"></div><script>${fs.readFileSync(R + 'bp.js', 'utf8')}</script><script>${fs.readFileSync(R + 'bauteile.js', 'utf8')}</script><script>window.bpFrage = async () => 'drei'; window.BPHead = { conf: { apps: [{ key: 'gebaeudemodell', url: 'http://bauteile.test/gebaeudemodell', port: 1 }] }, appUrl: (a) => a.url };
      bpBauteile.mount(document.getElementById('feld'), 7, { einlesen: !location.search.includes('reiter') })</script>` });
    if (u.endsWith('/bauteile/vorlagen')) return J([{ id: '334.15', kg: '334', block: 'Außenwandöffnungen', bestand: true, name: 'Fenstertausch Bestand je St', einheit: 'St', schichten: [{ name: 'Fenster neu', optionen: [{ k: 'Kunststoff', t: '', std: true }, { k: 'Holz', t: '', std: true }] }] },
      { id: '334.01', kg: '334', block: 'Außenwandöffnungen', name: 'Fenster Kunststoff je m²', einheit: 'm²', schichten: [] }, { id: '331.01', kg: '331', block: 'Tragende Außenwände', name: 'AW tragend Mauerwerk', einheit: 'm²', schichten: [] }]);
    if (u.endsWith('/bauteile/zeile')) {
      const d = q.postDataJSON(); S.anfragen.push(d);
      const z = S.L.zeilen.find((x) => x.id === d.id);
      if (d.status) Object.assign(z, { status: d.status, berechnen: !['offen', 'bleibt', 'pruefen'].includes(d.status) }, d.status === 'erneuern' ? { vorlage: '334.15', wahl: [0], code: '334.15.002', kurz: 'Fenstertausch Bestand je St, Kunststoff' } : {});
      if ('berechnen' in d) z.berechnen = d.berechnen;
      if (d.wahl) Object.assign(z, { wahl: d.wahl, code: '', kurz: 'Fenstertausch Bestand je St, Holz' });
      return J(alles());
    }
    if (u.endsWith('/bauteile/lesen') && /\.dxf"/.test(q.postData() || '')) {
      if (!/name="zuordnung"/.test(q.postData())) return J({ zuordnen: { ebenen: [{ name: 'A_Raum', flaechen: 2, linien: 0, rolle: 'raum' }, { name: 'Schraffur', flaechen: 0, linien: 9, rolle: 'ignorieren' }], bloecke: [{ name: 'FE_1', n: 3, rolle: 'fenster' }] } });
      S.dxf = /"Schraffur":"wand_innen"/.test(q.postData()); return J({ entwurf: 6, name: 'P', erster: true, abgleich: { neu: [], geaendert: [], entfaellt: [], gleich: 0 }, hinweise: [] });
    }
    if (u.endsWith('/planstand/6/uebernehmen')) { S.dxfFertig = true; return J({ ...alles(), planstaende: [] }); }
    if (u.endsWith('/bauteile/lesen')) { S.gelesen = true; return J({ entwurf: 5, name: 'Planstand 16.11.2026 – neu.ifc', art: 'ifc', erster: false, hinweise: [], zeilen: 3,
      abgleich: { ergaenzt: [{ art: 'elemente', k: 0, text: 'F 03 (Fenster 1,26 × 1,38 m)' }, { art: 'raeume', k: 1, text: 'Raum 0.04 Bad' }],  neu: [{ id: 'f2', bereich: 'oeffnung', name: 'Fenster neu gezeichnet', menge: 2, einheit: 'St', status: 'offen', beantwortet: false }],
        geaendert: [{ id: 'w', name: 'Wände', menge: 121, menge_alt: 120.5, einheit: 'm²' }], entfaellt: [{ id: 'f', bereich: 'oeffnung', name: 'Fensteröffnung', menge: 2, einheit: 'St', status: 'erneuern', beantwortet: true }], gleich: 1 } }); }
    if (u.endsWith('/planstand/5/uebernehmen')) { S.uebernommen = q.postDataJSON(); S.L.quelle = { ...S.L.quelle, planstand: 5, name: S.uebernommen.name }; return J({ ...alles(), planstaende: [{ id: 5, name: S.uebernommen.name }] }); }
    if (u.endsWith('/planstaende')) return J({ planstaende: [], gilt: null });
    if (u.endsWith('/rueckweg/schalter')) { S.schalter = q.postDataJSON(); return J({ schalter: { kosten: true, termine: !!S.schalter.termine } }); }
    if (u.endsWith('/verfeinern')) { S.ki = q.postDataJSON(); return J({ n: 1, vorschlaege: [{ id: 11, app: 'plaene', titel: 'Externe KI (claude): 1 Vorschlag – ungeprüft', daten: { art: 'rueckweg', extern: true, herkunft: { app: 'ki' },
      zeilen: [{ art: 'aendern', id: 'w', name: 'Wände', alt: { aufbau: '' }, neu: { vorlage: '345.10', vorlage_name: 'Innenputz ausbessern' }, einheit: 'm²', grund: 'Zeile hat noch keinen Aufbau' }] } }] }); }
    if (/\/rueckweg\/9$/.test(u)) { S.rwWahl = q.postDataJSON(); return J({ n: 1, vorschlaege: [], ...alles() }); }
    if (u.endsWith('/rueckweg')) return J(S.rw || { vorschlaege: [], schalter: { kosten: true, termine: true }, phasen: [{ k: 'huelle', n: 'Gebäudehülle' }], termine: {} });
    if (u === '/api/bp/modell/7') return J(alles());
    return r.fulfill({ status: 404, body: '' });
  });
  try {
    await p.goto('http://bauteile.test/seite');
    await p.waitForSelector('[data-btz="f"]');
    const a = await p.evaluate(() => ({ offen: document.querySelectorAll('.bt-r.offen').length, bereiche: [...document.querySelectorAll('.bt-b h4')].map((h) => h.textContent), nr: document.querySelector('[data-btz="f"] .bt-nr').textContent,
      quer: document.documentElement.scrollWidth > innerWidth + 1, ber: document.querySelector('[data-btz="f"] [data-btber]').disabled }));
    pruef(a.offen === 3 && a.bereiche.length === 3 && /F 01/.test(a.nr) && a.ber, `Anfang: ${JSON.stringify(a)}`);
    pruef(!a.quer, 'schmal: waagerechter Scrollbalken');
    await p.click('[data-btz="f"] [data-btst="erneuern"]'); await p.waitForSelector('[data-btz="f"] code');
    pruef(S.anfragen[0] && S.anfragen[0].status === 'erneuern' && S.anfragen[0].rev === 1, `Status: ${JSON.stringify(S.anfragen[0])}`);
    pruef(await p.evaluate(() => /334\.15\.002/.test(document.querySelector('[data-btz="f"]').textContent) && document.querySelector('[data-btz="f"] [data-btber]').checked), 'erneuern: Element und „berechnen“ fehlen');
    await p.click('[data-btz="f"] [data-btauf]'); await p.waitForSelector('[data-btz="f"] [data-btop="0.1"]');
    pruef(await p.evaluate(() => !document.querySelector('[data-btz="f"] .bt-blk') && document.querySelectorAll('[data-btz="f"] [data-btvlauf]').length === 2), 'Vorlage gewählt: nur sie und „andere Vorlage …“ (kompakt, 20.11.2026)');
    await p.click('[data-btz="f"] .bt-vlw[data-btvlauf]'); await p.waitForSelector('[data-btz="f"] .bt-blk');
    pruef(await p.evaluate(() => !!document.querySelector('[data-btz="f"] .bt-weitere')), 'übrige Kostengruppen unter „weitere Kostengruppen“');
    const bl = await p.evaluate(() => [...document.querySelectorAll('[data-btz="f"] .bt-blk:not(.bt-weitere)')].map((d) => d.querySelector('summary').textContent.trim() + (d.open ? ':auf' : ':zu') + ':' + [...d.querySelectorAll('[data-btvl]')].map((b) => b.textContent).join('/')));
    pruef(bl.length === 3 && /^Bestand 1:auf/.test(bl[0]) && /^334 · Außenwandöffnungen 1:auf/.test(bl[1]) && /^331 .*:zu:Mauerwerk$/.test(bl[2]), 'Vorlagen in Blöcken (BL-A1 B1): ' + JSON.stringify(bl));
    // 19.11.2026 (Video „ohne Herumgehüpfe“): Antwort wählen lässt den Bereich an seiner Rollposition – kein Sprung nach oben
    const y0 = await p.evaluate(() => { const f = document.getElementById('feld'); f.style.cssText = 'height:220px;overflow:auto'; document.querySelector('[data-btz="f"] [data-btop="0.1"]').scrollIntoView({ block: 'center' }); return f.scrollTop; });
    await p.click('[data-btz="f"] [data-btop="0.1"]'); await p.waitForTimeout(200);
    const y1 = await p.evaluate(() => { const f = document.getElementById('feld'), y = f.scrollTop; f.style.cssText = ''; return y; });
    pruef(y0 > 20 && Math.abs(y1 - y0) < 3, `Bereich hüpft nach der Antwort: ${y0} → ${y1}`);
    pruef(JSON.stringify(S.anfragen.at(-1).wahl) === '[1]', `Option gewählt: ${JSON.stringify(S.anfragen.at(-1))}`);
    await p.click('[data-btz="f"] [data-btber]'); await p.waitForTimeout(200);
    pruef(S.anfragen.at(-1).berechnen === false, '„berechnen“ abhaken geht nicht an den Kern');
    await p.click('[data-btz="frage:elektro"] [data-btst="bleibt"]'); await p.waitForTimeout(200);
    pruef(await p.evaluate(() => /nein, bleibt/.test(document.querySelector('[data-btz="frage:elektro"] .on').textContent)), 'Frage: „nein, bleibt“ nicht gewählt');
    const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click('[data-btlesen]')]);
    await fc.setFiles({ name: 'neu.ifc', mimeType: 'application/octet-stream', buffer: Buffer.from('ISO-10303-21;') });
    await p.waitForSelector('.bt-ab [data-m="e:f"]');
    pruef(S.gelesen, 'Planstand einlesen schickt die Datei nicht');
    await p.click('.bt-ab [data-m="e:f"]'); await p.click('.bt-ab [data-m="n:f2"]');
    pruef(await p.evaluate(() => document.querySelectorAll('.bt-ab .bt-i.paar').length === 2), 'Zuordnung per Klick: entfällt ↔ neu nicht markiert');
    // A1 (20.11.2026): Ergänztes, das jetzt im Plan steht – der Abgleich fragt; antippen wechselt entfernen ↔ behalten
    pruef(await p.evaluate(() => /F 03 .* ist jetzt im Plan – ergänzte Zeile entfernen/.test(document.querySelector('.bt-ab [data-m="p:0"]').textContent)), 'Abgleich fragt nicht nach der ergänzten Zeile');
    await p.click('.bt-ab [data-m="p:1"]');
    pruef(await p.evaluate(() => /behalten/.test(document.querySelector('.bt-ab [data-m="p:1"]').textContent) && document.querySelectorAll('.bt-ab .bt-i.paar').length === 2), 'Ergänztes behalten: Wahl wechselt nicht oder die Zuordnung geht verloren');
    await p.fill('.bt-ab [data-btname]', 'Werkplanung'); await p.click('.bt-ab [data-m="ok"]'); await p.waitForTimeout(300);
    pruef(S.uebernommen && S.uebernommen.zuordnung.f === 'f2' && S.uebernommen.name === 'Werkplanung', `Übernehmen mit Zuordnung und Name: ${JSON.stringify(S.uebernommen)}`);
    pruef(JSON.stringify(S.uebernommen.plus_weg) === '{"raeume":[],"elemente":[0]}', `Ergänztes entfernen geht mit: ${JSON.stringify(S.uebernommen.plus_weg)}`);
    const [fc2] = await Promise.all([p.waitForEvent('filechooser'), p.click('[data-btlesen]')]);
    await fc2.setFiles({ name: 'grundriss.dxf', mimeType: 'application/octet-stream', buffer: Buffer.from('0\nSECTION') });
    await p.waitForSelector('.bt-ab [data-m="ebenen|wand_innen|Schraffur"]');
    await p.click('.bt-ab [data-m="ebenen|wand_innen|Schraffur"]'); await p.click('.bt-ab [data-m="ok"]'); await p.waitForTimeout(400);
    pruef(S.dxf && S.dxfFertig, `DXF: Zuordnung per Klick wird mitgeschickt (${S.dxf}, ${S.dxfFertig})`);
    // Reiter in einer anderen App: kein Einlesen, nur Stand und Sprung ins Gebäudemodell
    await p.goto('http://bauteile.test/seite?reiter'); await p.waitForSelector('[data-btz="f"]');
    const rt = await p.evaluate(() => ({ lesen: !!document.querySelector('[data-btlesen]'), link: (document.querySelector('.bt-ps a') || {}).href || '' }));
    pruef(!rt.lesen && /gebaeudemodell\/#bauteile$/.test(rt.link), `Reiter: Einlesen nur im Gebäudemodell – ${JSON.stringify(rt)}`);
    // Rückweg (Schritt 8): Vorschläge der Apps – neue Leistung (gibt es schon → „Verbinden“ vorgewählt), Menge; Schalter „ins Modell“
    S.rw = { schalter: { kosten: true, termine: true }, phasen: [{ k: 'huelle', n: 'Gebäudehülle' }], termine: { phasen: { huelle: { von: '2027-04-01', bis: '2027-04-30' } } },
      vorschlaege: [{ id: 9, app: 'termine', titel: 'Bauzeitenplan „Plan“: 2 Vorschläge fürs Modell', daten: { art: 'rueckweg', herkunft: { app: 'termine' }, zeilen: [
        { art: 'neu', name: 'Fensteröffnungen', neu: { phase: 'huelle' }, doppelt: 'f' }, { art: 'aendern', id: 'w', name: 'Wände', alt: { menge: 120.5 }, neu: { menge: 130 }, einheit: 'm²' }] } }] };
    await p.goto('http://bauteile.test/seite?reiter'); await p.waitForSelector('.bt-rw');
    const rw = await p.evaluate(() => ({ t: document.querySelector('.bt-rw').textContent, vor: [...document.querySelectorAll('.bt-rw .btn.primary[data-btrw]')].map((b) => b.dataset.w) }));
    pruef(/gibt es schon/.test(rw.t) && /120,5 → 130/.test(rw.t) && rw.vor.join() === 'verbinden:f,ja', `Vorschläge: ${JSON.stringify(rw)}`);
    await p.click('.bt-rw [data-i="1"][data-w="nein"]'); await p.click('.bt-rw [data-btrwok]'); await p.waitForTimeout(300);
    pruef(S.rwWahl && JSON.stringify(S.rwWahl.wahl) === '{"0":"verbinden:f","1":"nein"}', `Entscheidung: ${JSON.stringify(S.rwWahl)}`);
    pruef(await p.evaluate(() => !document.querySelector('.bt-rw')), 'nach der Entscheidung ist der Vorschlag weg');
    await p.uncheck('[data-btrws="termine"]'); await p.waitForTimeout(300);
    pruef(S.schalter && S.schalter.termine === false, `Schalter „ins Modell“: ${JSON.stringify(S.schalter)}`);
    // Verfeinern (extern, GO 16.11.2026): Knopf nur im Gebäudemodell und nur mit Zusatzrecherche; 1. was · 2. was hinausgeht · Vorschlag mit „extern, ungeprüft“
    S.rw = { vorschlaege: [], schalter: { kosten: true, termine: true }, phasen: [], termine: {}, extern: false };
    await p.goto('http://bauteile.test/seite'); await p.waitForSelector('[data-btz="f"]');
    pruef(await p.evaluate(() => !document.querySelector('[data-btki]')), 'Verfeinern ohne Zusatzrecherche sichtbar');
    S.rw.extern = true;
    await p.goto('http://bauteile.test/seite'); await p.waitForSelector('[data-btki]');
    await p.click('[data-btki]'); await p.click('.bt-ab [data-btkw="mengen"]'); await p.click('.bt-ab [data-m="kweiter"]');
    pruef(await p.evaluate(() => /Nicht:/.test(document.querySelector('.bt-ab').textContent)), 'Schritt 2 zeigt nicht, was hinausgeht');
    await p.click('.bt-ab [data-m="kgo"]'); await p.waitForSelector('.bt-rw .bt-ext');
    pruef(S.ki && S.ki.was.join() === 'luecken,aufbau,mengen', `Auswahl: ${JSON.stringify(S.ki)}`);
    pruef(await p.evaluate(() => /Aufbau Innenputz ausbessern/.test(document.querySelector('.bt-rw').textContent) && /noch keinen Aufbau/.test(document.querySelector('.bt-rw').textContent) && !document.querySelector('.bt-ab')),
      'Vorschlag der KI (Aufbau, Grund) nicht in der Liste oder Fenster offen');
  } catch (e) { fehler.push('bricht ab – ' + String(e.message).split('\n')[0]); }
  await p.close();
  // Standardbaum ohne Planstand (GO 17.11.2026): Meldung wie in allen Apps, Rohbau nach Bauteilen, „＋ Zeile“ mit KG, Fragen → Planstand „Von Hand“
  const q = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  q.on('pageerror', (e) => fehler.push('Standardbaum: Fehler im Skript – ' + e.message));
  const T = { L: { quelle: {}, raeume: [], zeilen: [] }, hand: [] };
  await q.route('http://gm.test/**', async (r) => {
    const u = new URL(r.request().url()).pathname, J = (o) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(o) });
    if (u === '/seite') return r.fulfill({ contentType: 'text/html', body: `<!doctype html><meta charset=utf-8><body><div id="feld"></div><div id="det"></div><script>${fs.readFileSync(R + 'bp.js', 'utf8')}</script><script>${fs.readFileSync(R + 'baum.js', 'utf8')}</script><script>${fs.readFileSync(R + 'bauteile.js', 'utf8')}</script>
      <script>window.bpEingabe = async () => 'Mauerwerk Nord'; window.BPHead = { projekt: { name: 'A100 Testhaus' }, conf: { apps: [] }, appUrl: () => '' }; window.BT = bpBauteile.mount(document.getElementById('feld'), 7, { einlesen: true, baum: true }); BT.details(document.getElementById('det'))</script>` });
    if (u.endsWith('/bauteile/hand')) { const d = r.request().postDataJSON(); T.hand.push(d);
      T.L = { quelle: { planstand: 9, name: 'Von Hand', art: 'hand' }, raeume: [], zeilen: [{ id: 'frage:elektro', bereich: 'frage', art: 'Elektro', kg: '444', name: 'Elektroinstallation', menge: 0, einheit: 'm²', zustand: 'frage', status: 'offen', erlaubt: ['bleibt', 'erneuern'], quelle: 'frage', ids: [], nummern: [] }]
        .concat(d.nur_start ? [] : [{ id: 'hand:1', bereich: 'hand', art: 'von Hand', kg: d.kg, name: d.name, menge: 0, einheit: 'm²', zustand: 'hand', status: 'neu', erlaubt: ['neu'], quelle: 'hand', ids: [], nummern: [] }]) };
      return J({ modell: { bauteilliste: T.L }, rev: 2, staende: [], links: [] }); }
    if (u.endsWith('/planstaende')) return J({ planstaende: [], gilt: null });
    if (u.endsWith('/rueckweg')) return J({ vorschlaege: [], schalter: {}, phasen: [], termine: {} });
    if (u === '/api/bp/modell/7') return J({ modell: { bauteilliste: T.L }, rev: 1, staende: [], links: [] });
    return r.fulfill({ status: 404, body: '' });
  });
  try {
    await q.goto('http://gm.test/seite'); await q.waitForSelector('.bp-leer');
    const v = await q.evaluate(() => ({ h: document.querySelector('.bp-leer h2').textContent, g: [...document.querySelectorAll('.bt-gerust tr.bt-bh b')].map((b) => b.textContent) }));
    pruef(/A100 Testhaus gibt es noch kein Gebäudemodell/.test(v.h), `Meldung: ${v.h}`);
    pruef(['Rohbau', 'Gründung · Bodenplatte', 'Außenwände', 'Innenwände', 'Treppen', 'Decken', 'Dach'].every((x) => v.g.includes(x)) && v.g.includes('Nicht im Modell – bitte beantworten'), `Gerüst: ${v.g.join(' | ')}`);
    // GO 20.11.2026 (Mock „Gebäudemodell ergänzen“ D1): ein Knopf „Anfangen …“ → ein Fenster mit vier Wegen und je einem Satz
    const kn = await q.evaluate(() => [...document.querySelectorAll('.bp-leer button')].map((b) => b.textContent.trim()));
    pruef(kn.length === 1 && /Anfangen/.test(kn[0]), `leeres Modell: ein Knopf „Anfangen …“ – ${kn.join(' | ')}`);
    await q.click('[data-btanfang]'); await q.waitForSelector('.bt-anf');
    const wg = await q.evaluate(() => ({ t: [...document.querySelectorAll('.bt-anf .bt-weg4 b')].map((b) => b.textContent), s: [...document.querySelectorAll('.bt-anf .bt-weg4 small')].every((x) => x.textContent.trim().length > 20), satz: document.querySelector('.bt-anf').textContent }));
    pruef(wg.t.join('|') === 'Aus der Planung|Räume und Fenster selbst eintragen|Nur einzelne Bauteile|Plan einlesen' && wg.s && /Es entsteht ein Planstand/.test(wg.satz), `vier Wege mit je einem Satz: ${wg.t.join(' | ')}`);
    await q.click('.bt-anf [data-m="x"]'); await q.waitForTimeout(100);
    // B1: Name, Menge und Einheit gleich beim Anlegen
    await q.click('.bt-plus[data-kg="330"]'); await q.waitForSelector('.bt-hd [data-bthn]');
    pruef(await q.evaluate(() => [...document.querySelectorAll('.bt-hd [data-m^="eh:"]')].map((b) => b.textContent).join(' ') === 'm² m St psch' && document.querySelector('.bt-hd [data-m="eh:m²"]').classList.contains('on')), 'Zeile von Hand: Einheit m² · m · St · psch steht nicht zur Wahl');
    await q.fill('.bt-hd [data-bthn]', 'Mauerwerk Nord'); await q.click('.bt-hd [data-m="eh:m"]'); await q.click('.bt-hd [data-m="ok"]'); await q.waitForSelector('[data-btz="hand:1"]');
    pruef(T.hand[0] && T.hand[0].kg === '330' && T.hand[0].name === 'Mauerwerk Nord' && T.hand[0].einheit === 'm' && T.hand[0].menge === 0, `„＋ Zeile“ in Außenwände: ${JSON.stringify(T.hand[0])}`);
    pruef(await q.evaluate(() => /Menge fehlt/.test(document.querySelector('.bt-baum [data-btz="hand:1"] td.r').textContent) && /Menge fehlt – wird mit 0 gerechnet/.test((document.querySelector('#det [data-btmf]') || {}).textContent || '') && !!document.querySelector('#det [data-bteh]')),
      'Zeile von Hand ohne Menge: gelber Hinweis im Baum und in den Details, Einheit wählbar');
    pruef(await q.evaluate(() => { const r = [...document.querySelectorAll('.bt-baum tr')], i = r.findIndex((x) => /Außenwände/.test(x.textContent) && x.classList.contains('bt-bh')); return i >= 0 && r[i + 1] && r[i + 1].dataset.btz === 'hand:1'; }),
      'Zeile von Hand mit KG 330 steht unter „Außenwände“');
    // konsequent (17.11.2026): mit Planstand „Von Hand“ bleiben alle Gruppen stehen (leer mit 0 und „＋ Zeile“), die neue Zeile steht rechts in den Details,
    // Fragen ohne Menge zeigen „–“ statt „0 m²“, eine angetippte Zeile kommt in die Details
    const w = await q.evaluate(() => ({ g: [...document.querySelectorAll('.bt-baum tr.bt-bh b')].map((b) => b.textContent), plus: document.querySelectorAll('.bt-baum .bt-plus').length,
      leer: !!document.querySelector('.bp-leer'), det: (document.querySelector('#det [data-btname]') || {}).value || document.getElementById('det').textContent,   // Zeile von Hand: Name als Feld (20.11.2026)
      m: (document.querySelector('[data-btz="frage:elektro"] td.r') || {}).textContent }));
    pruef(['Gründung · Bodenplatte', 'Innenwände', 'Dach', 'Küche und Bad'].every((x) => w.g.includes(x)) && w.plus >= 7 && !w.leer, `Gruppen bleiben mit Planstand: ${w.g.join(' | ')} · ${w.plus}× ＋ · Meldung ${w.leer}`);
    pruef(/Mauerwerk Nord/.test(w.det), `neue Zeile in den Details: ${w.det.slice(0, 80)}`);
    pruef(w.m && w.m.trim() === '–', `Frage ohne Menge: „${w.m}“`);
    await q.click('[data-btz="frage:elektro"] .bt-tn');
    pruef(/Elektroinstallation/.test(await q.textContent('#det')), 'angetippte Frage steht in den Details');
  } catch (e) { fehler.push('Standardbaum: bricht ab – ' + String(e.message).split('\n')[0]); }
  await q.close();
  return fehler;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await bauteilePruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
  await b.close(); console.log(f.length ? f.join('\n') : 'ok'); process.exit(f.length ? 1 : 0);
}
