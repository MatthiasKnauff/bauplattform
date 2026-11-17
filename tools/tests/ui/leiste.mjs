// Zu schmale Reiterleisten (leiste.js, GO 17.11.2026): erst rücken die Reiter zusammen, dann wandern die letzten ins Pulldown „+n ▾“;
// der gewählte Reiter bleibt sichtbar, Knöpfe neben den Reitern (⇱ ⧉ ✕) bleiben stehen; ein Punkt im Pulldown klickt den versteckten Reiter.
// Geprüft an einer Leiste wie im Bereich rechts (role="tablist" + Knöpfe) und an einer .tabs-Leiste mit Links.
//
// Aufgerufen aus oberflaeche.mjs:  const fehler = await leistePruefen(browser, repoWurzel)   – allein: node tools/tests/ui/leiste.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

export async function leistePruefen(browser, repo) {
  const KASTEN = path.join(repo, 'shared/bpcore/head');
  const BK = /BAUKASTEN = \(([^)]*)\)/.exec(fs.readFileSync(path.join(repo, 'shared/bpcore/head.py'), 'utf8'))[1].match(/"[^"]+"/g).map((s) => s.slice(1, -1));
  const css = ['bp.css', 'head.css'].map((f) => fs.readFileSync(path.join(KASTEN, f), 'utf8')).join('\n');
  const js = 'void 0;\n' + BK.map((f) => fs.readFileSync(path.join(KASTEN, f), 'utf8')).join('\n;\n');
  const R = ['Rechnung', 'Abzüge', 'Prüfen', 'Planung', 'Bauteile', 'Verknüpfungen', 'Fragen'];
  const html = `<!doctype html><meta charset="utf-8"><style>${css}</style><body>
    <div id="w" style="width:760px"><div class="sr-rt" role="tablist">${R.map((t, i) => `<button type="button" role="tab" class="sr-tab${i === 5 ? ' on' : ''}" data-srt="${i}">${t}</button>`).join('')}<span class="sr-sp"></span><button class="sr-ik" data-sra="fen">⇱</button><button class="sr-ik" data-sra="ab">⧉</button><button class="sr-ik" data-sra="zu">✕</button></div></div>
    <div id="w2" style="width:300px;display:flex"><nav class="tabs" style="flex:1;min-width:0">${['Pläne', 'Fotos', 'Dokumente', 'Schriftverkehr', 'Alle Dateien'].map((t, i) => `<a href="#${i}" class="${i === 0 ? 'on' : ''}">${t}</a>`).join('')}</nav></div>
    <script>${js}</script><script>window.geklickt = []; document.querySelector('.sr-rt').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) geklickt.push(b.dataset.srt || b.dataset.sra || 'falsch'); });</script></body>`;
  const fehler = [];
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 700 } }), p = await ctx.newPage();
  const fe = []; p.on('pageerror', (e) => fe.push(e.message));
  try {
    await p.setContent(html); await p.waitForTimeout(150);
    const lage = () => p.evaluate(() => {
      const L = document.querySelector('.sr-rt'), b = L.getBoundingClientRect(), m = L.querySelector('.bp-ul-mehr');
      const sicht = (x) => getComputedStyle(x).display !== 'none' && x.getBoundingClientRect().right <= b.right + 0.5;
      return { voll: L.scrollWidth > L.clientWidth + 1, ik: [...L.querySelectorAll('.sr-ik')].every(sicht), mehr: m && !m.hidden ? m.textContent : '',
        weg: [...L.querySelectorAll('.sr-tab')].filter((x) => !sicht(x)).map((x) => x.textContent), akt: sicht(L.querySelector('.sr-tab.on')), eng: !!L.querySelector('.bp-ul-eng') };
    });
    let a = await lage();
    if (a.mehr || a.weg.length) fehler.push(`breit genug, trotzdem versteckt: ${a.weg.join(', ')} ${a.mehr}`);
    await p.evaluate(() => { document.getElementById('w').style.width = '680px'; }); await p.waitForTimeout(150); a = await lage();
    if (!a.eng || a.mehr) fehler.push(`etwas zu schmal: zuerst enger zusammenrücken (eng=${a.eng}, Pulldown „${a.mehr}“)`);
    await p.evaluate(() => { document.getElementById('w').style.width = '330px'; }); await p.waitForTimeout(150); a = await lage();
    if (a.voll) fehler.push('schmal: die Leiste läuft über');
    if (!a.ik) fehler.push('schmal: die Knöpfe ⇱ ⧉ ✕ sind nicht mehr ganz zu sehen');
    if (!/^\+\d+ ▾$/.test(a.mehr) || +a.mehr.slice(1, -2) !== a.weg.length) fehler.push(`schmal: Pulldown „${a.mehr}“ passt nicht zu ${a.weg.length} versteckten Reitern`);
    if (!a.akt) fehler.push('schmal: der gewählte Reiter „Verknüpfungen“ ist nicht sichtbar');
    await p.click('.sr-rt .bp-ul-mehr'); await p.waitForTimeout(80);
    const menue = await p.evaluate(() => [...document.querySelectorAll('.bp-ul-menue [role=menuitem]')].map((x) => x.textContent));
    if (menue.join('|') !== a.weg.join('|')) fehler.push(`Pulldown zeigt ${menue.join(', ')} statt ${a.weg.join(', ')}`);
    const g0 = await p.evaluate(() => geklickt.slice());
    if (g0.length) fehler.push('der Knopf „+n ▾“ darf beim Klick-Verteiler der Leiste nicht ankommen: ' + g0.join(','));
    await p.click('.bp-ul-menue [role=menuitem]'); await p.waitForTimeout(80);
    const g = await p.evaluate(() => ({ k: geklickt.slice(), m: !!document.querySelector('.bp-ul-menue') }));
    if (g.k.length !== 1 || g.k[0] !== String(R.indexOf(a.weg[0]))) fehler.push(`Punkt im Pulldown klickt nicht den versteckten Reiter (${g.k.join(',')})`);
    if (g.m) fehler.push('Pulldown bleibt nach der Wahl offen');
    await p.click('.sr-rt .bp-ul-mehr'); await p.keyboard.press('Escape'); await p.waitForTimeout(50);
    if (await p.evaluate(() => !!document.querySelector('.bp-ul-menue'))) fehler.push('Esc schließt das Pulldown nicht');
    // neu gezeichnet (wie seite.js bei jedem Wechsel): wieder passend
    await p.evaluate(() => { const L = document.querySelector('.sr-rt'); L.querySelectorAll('.sr-tab').forEach((x) => x.classList.toggle('on', x.textContent === 'Fragen')); L.innerHTML = L.innerHTML.replace(/<button type="button" class="bp-ul-mehr"[^>]*>[^<]*<\/button>/, ''); }); await p.waitForTimeout(150); a = await lage();
    if (a.voll || !a.mehr || !a.ik) fehler.push(`nach dem Neuzeichnen nicht wieder passend (voll=${a.voll}, „${a.mehr}“)`);
    await p.evaluate(() => { document.getElementById('w').style.width = '900px'; }); await p.waitForTimeout(150); a = await lage();
    if (a.mehr || a.weg.length || a.eng) fehler.push(`wieder breit: alles soll zurück (${a.weg.join(', ')} ${a.mehr})`);
    const t = await p.evaluate(() => { const L = document.querySelector('.tabs'), m = L.querySelector('.bp-ul-mehr'); return { voll: L.scrollWidth > L.clientWidth + 1, mehr: m && !m.hidden ? m.textContent : '', erst: getComputedStyle(L.children[0]).display !== 'none' }; });
    if (t.voll || !t.mehr || !t.erst) fehler.push(`.tabs-Leiste: läuft über oder kein Pulldown (voll=${t.voll}, „${t.mehr}“)`);
  } catch (e) { fehler.push('bricht ab – ' + String(e.message).split('\n')[0]); }
  if (fe.length) fehler.push('Skriptfehler: ' + fe.join(' | '));
  await ctx.close();
  return fehler;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await leistePruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); await b.close();
  console.log(f.length ? 'FEHLER:\n' + f.join('\n') : 'Reiterleisten: ok'); process.exit(f.length ? 1 : 0);
}
