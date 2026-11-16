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
    if (u === '/seite') return r.fulfill({ contentType: 'text/html', body: `<!doctype html><meta charset=utf-8><style>${fs.readFileSync(R + 'bp.css', 'utf8')}</style><body><div id="feld"></div><script>${fs.readFileSync(R + 'bp.js', 'utf8')}</script><script>${fs.readFileSync(R + 'bauteile.js', 'utf8')}</script><script>bpBauteile.mount(document.getElementById('feld'), 7)</script>` });
    if (u.endsWith('/bauteile/vorlagen')) return J([{ id: '334.15', kg: '334', name: 'Fenstertausch Bestand je St', einheit: 'St', schichten: [{ name: 'Fenster neu', optionen: [{ k: 'Kunststoff', t: '', std: true }, { k: 'Holz', t: '', std: true }] }] }]);
    if (u.endsWith('/bauteile/zeile')) {
      const d = q.postDataJSON(); S.anfragen.push(d);
      const z = S.L.zeilen.find((x) => x.id === d.id);
      if (d.status) Object.assign(z, { status: d.status, berechnen: !['offen', 'bleibt', 'pruefen'].includes(d.status) }, d.status === 'erneuern' ? { vorlage: '334.15', wahl: [0], code: '334.15.002', kurz: 'Fenstertausch Bestand je St, Kunststoff' } : {});
      if ('berechnen' in d) z.berechnen = d.berechnen;
      if (d.wahl) Object.assign(z, { wahl: d.wahl, code: '', kurz: 'Fenstertausch Bestand je St, Holz' });
      return J(alles());
    }
    if (u.endsWith('/bauteile/lesen')) { S.gelesen = true; return J({ ...alles(), hinweise: [] }); }
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
    await p.click('[data-btz="f"] [data-btop="0.1"]'); await p.waitForTimeout(200);
    pruef(JSON.stringify(S.anfragen.at(-1).wahl) === '[1]', `Option gewählt: ${JSON.stringify(S.anfragen.at(-1))}`);
    await p.click('[data-btz="f"] [data-btber]'); await p.waitForTimeout(200);
    pruef(S.anfragen.at(-1).berechnen === false, '„berechnen“ abhaken geht nicht an den Kern');
    await p.click('[data-btz="frage:elektro"] [data-btst="bleibt"]'); await p.waitForTimeout(200);
    pruef(await p.evaluate(() => /nein, bleibt/.test(document.querySelector('[data-btz="frage:elektro"] .on').textContent)), 'Frage: „nein, bleibt“ nicht gewählt');
    const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click('[data-btlesen]')]);
    await fc.setFiles({ name: 'neu.ifc', mimeType: 'application/octet-stream', buffer: Buffer.from('ISO-10303-21;') }); await p.waitForTimeout(300);
    pruef(S.gelesen, 'IFC einlesen schickt die Datei nicht');
  } catch (e) { fehler.push('bricht ab – ' + String(e.message).split('\n')[0]); }
  await p.close();
  return fehler;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await bauteilePruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
  await b.close(); console.log(f.length ? f.join('\n') : 'ok'); process.exit(f.length ? 1 : 0);
}
