// Wärmeschutz – Schichtaufbau (Mock „Schichtaufbau neu – mit Gefachen“, GO 22.11.2026: SA-1 … SA-17) im echten Browser mit nachgebildetem Server.
// Geprüft: Querschnitt mit Holz im Gefach und Temperaturlinie, Draufsicht mit den Teilflächen (in Flucht 2, kreuzweise 4), R′/R″ unter der Liste,
// Stufe bezogen aufs Soll, − / + an der Dicke, Umsortieren durch Ziehen am ⋮⋮, Dicke an der Fuge ziehen, Soll fürs Gebäude wählen; kein Fehler im Skript.
// Aufgerufen aus oberflaeche.mjs:  const fehler = await schichtaufbauPruefen(browser, repoWurzel)
import fs from 'node:fs'; import path from 'node:path';

export async function schichtaufbauPruefen(browser, repo) {
  const KASTEN = path.join(repo, 'shared/bpcore/head'), STAT = path.join(repo, 'plattform/static');
  const BK = /BAUKASTEN = \(([^)]*)\)/.exec(fs.readFileSync(path.join(repo, 'shared/bpcore/head.py'), 'utf8'))[1].match(/"[^"]+"/g).map((s) => s.slice(1, -1));
  const baukasten = 'void 0;\n' + BK.map((f) => fs.readFileSync(path.join(KASTEN, f), 'utf8')).join('\n;\n');
  const STOFFE = JSON.parse(fs.readFileSync(path.join(repo, 'shared/bpcore/ws_baustoffe.json'), 'utf8')).baustoffe.map((b) => ({ herkunft: 'din', aktiv: true, ...b }));
  const fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 1000 } }), p = await ctx.newPage();
  p.on('pageerror', (e) => fehler.push('Fehler im Skript – ' + e.message));
  const S = { grund: { vorhaben: 'aenderung', zone: '19' }, puts: [], b: { id: 'd1', kurz: 'D 1', name: 'Steildach', typ: 'steildach', massnahme: '5a', flaeche: 168, schichten: [
    { m: 'gkb', d: 1.25 }, { m: 'mw_035', d: 22, m2: 'holz_nadel', breite: 8, abstand: 75 }, { m: 'mw_035', d: 6, m2: 'holz_nadel', breite: 8, abstand: 75, gl: 'flucht' },
    { m: 'luft_belueftet', d: 4 }, { m: 'dachziegel', d: 2 }] } };
  const detail = () => ({ nachweis: { id: 5, project_id: 7, name: 'Nachweis', status: 'bauteile' }, projekt: 'Testprojekt', grundlagen: S.grund, bauteile: [S.b], bauantrag: null });
  await p.route('http://portal.test/**', (r) => {
    const q = r.request(), pf = new URL(q.url()).pathname.replace(/^\//, ''), J = (o) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(o) });
    if (pf === 'waermeschutz') return r.fulfill({ contentType: 'text/html', body: fs.readFileSync(path.join(STAT, 'waermeschutz.html'), 'utf8') });
    if (pf === 'bp/baukasten.js') return r.fulfill({ contentType: 'text/javascript', body: baukasten });
    const f = pf.startsWith('bp/') ? path.join(KASTEN, pf.slice(3)) : pf.startsWith('static/') ? path.join(STAT, pf.slice(7)) : null;
    if (f) return fs.existsSync(f) ? r.fulfill({ contentType: f.endsWith('.css') ? 'text/css' : 'text/javascript', body: fs.readFileSync(f) }) : r.fulfill({ status: 404, body: '' });
    if (pf === 'api/me') return J({ ok: true, id: 1, name: 'admin', vorname: 'A', role: 'admin', admin: true, look: {} });
    if (pf === 'api/platform') return J({ apps: [], user: { name: 'admin', role: 'admin' }, projekte: [] });
    if (pf === 'api/bp/projekt') return J({ id: 7, name: 'Testprojekt', adresse: '' });
    if (pf === 'api/baustoffe') return J({ baustoffe: STOFFE });
    if (pf === 'api/nachweise') return J({ nachweise: [{ id: 5, project_id: 7, name: 'Nachweis', status: 'bauteile', bauteile: 1 }] });
    if (pf === 'api/nachweise/5/modell') return J({ hinweise: [], linie: { richtung: 'beide' }, quellen: [], huelle: [] });
    if (pf === 'api/nachweise/5' && q.method() === 'PUT') { const b = JSON.parse(q.postData()); S.puts.push(b); if (b.bauteil) S.b = b.bauteil; if (b.grundlagen) S.grund = { ...S.grund, ...b.grundlagen }; return J({ ...detail(), vorher: { data: {} } }); }
    if (pf === 'api/nachweise/5') return J(detail());
    if (/(^|\/)api\//.test(pf)) return J(/katalog|liste|kontakte|neuigkeit|projekte|verlauf|fehler/.test(pf) ? [] : {});
    return r.fulfill({ status: 404, body: '' });
  });
  const zustand = () => p.evaluate(() => ({ lagen: document.querySelectorAll('#wsBand .ws-lage').length, holz: document.querySelectorAll('#wsBand .ws-holz').length, linie: !!document.querySelector('#wsBand .ws-tl polyline'),
    teil: document.querySelectorAll('#wsDrauf table tr').length, drauf: !document.querySelector('#wsDrauf').hidden, rech: document.querySelector('#wsRech').textContent, stufe: (document.querySelector('#wsErg .ws-st') || {}).textContent || '',
    zeilen: document.querySelectorAll('.ws-zb').length, gef: document.querySelectorAll('.ws-gef').length, soll: document.querySelector('.ws-soll').textContent }));
  try {
    await p.goto('http://portal.test/waermeschutz');
    await p.waitForSelector('#wsBand .ws-lage', { timeout: 20000 });
    let z = await zustand();
    pruef(z.lagen === 5 && z.holz > 0 && z.linie && z.zeilen === 5 && z.gef === 2, `Querschnitt und Liste: ${JSON.stringify(z)}`);
    pruef(z.drauf && z.teil === 2, `in Flucht: Draufsicht mit 2 Teilflächen – ${JSON.stringify(z)}`);
    pruef(/R′\/R″/.test(z.rech) && /erfüllt|besser|drüber/.test(z.stufe), `R′/R″ und Stufe – ${JSON.stringify(z)}`);
    if (process.env.RT_ARTEFAKTE) await p.screenshot({ path: path.join(process.env.RT_ARTEFAKTE, 'schichtaufbau.png'), fullPage: true }).catch(() => {});
    await p.click('[data-sgl="2"][data-v="kreuz"]'); await p.waitForTimeout(250);
    z = await zustand();
    pruef(!S.b.schichten[2].gl && z.teil === 4, `kreuzweise: 4 Teilflächen – ${JSON.stringify({ gl: S.b.schichten[2].gl, teil: z.teil })}`);
    await p.click('[data-skp="d"][data-si="0"]'); await p.waitForTimeout(200);
    pruef(S.b.schichten[0].d === 1.75, `+ an der Dicke: ${S.b.schichten[0].d}`);
    {   // ⋮⋮ der ersten Zeile hinter die zweite ziehen
      const a = await p.locator('[data-grip="0"]').boundingBox(), c = await p.locator('[data-zb="1"]').boundingBox();
      await p.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await p.mouse.down(); await p.mouse.move(a.x + 5, c.y + c.height * 0.8, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(250);
      pruef(S.b.schichten[1].m === 'gkb' && S.b.schichten[0].m === 'mw_035', `Umsortieren durch Ziehen: ${S.b.schichten.map((s) => s.m).join(', ')}`);
    }
    {   // Fuge nach der ersten Schicht nach rechts ziehen = dicker
      await p.locator('.ws-fuge[data-fuge="0"]').scrollIntoViewIfNeeded();
      const d0 = S.b.schichten[0].d, f = await p.locator('.ws-fuge[data-fuge="0"]').boundingBox();
      await p.mouse.move(f.x + f.width / 2, f.y + f.height - 10); await p.mouse.down(); await p.mouse.move(f.x + 60, f.y + f.height - 10, { steps: 5 }); await p.mouse.up(); await p.waitForTimeout(250);
      pruef(S.b.schichten[0].d > d0, `Fuge ziehen: ${d0} → ${S.b.schichten[0].d}`);
    }
    await p.click('[data-wssoll]'); await p.waitForSelector('.pickm .pm-o');
    await p.evaluate(() => [...document.querySelectorAll('.pickm .pm-o')].find((o) => /BEG/.test(o.textContent)).click()); await p.waitForTimeout(250);
    z = await zustand();
    pruef(S.grund.soll === 'beg' && /0,14/.test(z.soll), `Soll fürs Gebäude BEG: ${S.grund.soll} – ${z.soll}`);
  } catch (e) { fehler.push('Prüfung bricht ab – ' + String(e.message).split('\n')[0]); }
  await ctx.close();
  return fehler;
}
