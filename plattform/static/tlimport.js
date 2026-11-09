/* Fenster- und Türliste: Import aus beliebigen Tabellen (Excel/CSV) und Plausibilitätsprüfung.
   Nutzt die Türliste aus ava.html (TL, TA, TJA, TSP, tlMerken, tlSpeichern, tlZeichnen …).

   Import: Kopfzeile(n) werden an den Spaltennamen erkannt (auch wiederholte Kopfzeilen mitten in der Tabelle),
   Zeilen mit nur einem Wert davor („EG“, „Fenster“) gelten als Abschnitt. Jede Spalte lässt sich im Dialog anders
   zuordnen; Maße in mm werden in m umgerechnet, Schreibweisen vereinheitlicht, Stichwörter (Umfassungszarge, T30-RS,
   Lüftungsöffnung …) als Ausstattung erkannt. Blätter mit denselben Zeilen werden nur einmal übernommen. */
(function () {
  const norm = (s) => String(s == null ? '' : s).toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, ' ').trim();
  // Spaltenname → Feld (erste passende Regel gewinnt)
  const REGELN = [
    ['flg', /fluegel|^flg\b/], ['raum', /raum ?(nr|nummer)|^rnr\b|^r nr\b/], ['zu', /^(zu|nach) ?raum\b|^zu$/],
    ['nr', /^(nr|nummer|pos|position|einbaupos\w*|tuer ?nr|tuernummer|fenster ?nr|element ?nr|kennung|lfd ?nr|id)\b/],
    ['raumname', /^(ort|raum|raumbezeichnung|raumname|lage|bereich|zimmer|einbauort)\b/], ['geschoss', /geschoss|etage|ebene|stockwerk|^gs$/],
    ['anzahl', /^(anzahl|stk|stueck|menge|anz)\b/], ['din', /oeffnungsrichtung|anschlag|^din\b|drehrichtung/],
    ['oeffnung', /oeffnungsart|^oeffnung|fluegelart|funktion/], ['bruestung', /\bbrh\b|bruestung|parapet/],
    ['bh', /^b ?x ?h\b|^masse?\b|^groesse/], ['b', /^(breite|b|rb|rohbaubreite|bmr|rbb|lichte breite)\b/], ['h', /^(hoehe|h|rh|rohbauhoehe|rbh|lichte hoehe)\b/],
    ['wand', /wand/], ['fb_innen', /fensterbank innen|innenfensterbank|^ifb\b/], ['fb_aussen', /fensterbank aussen|aussenfensterbank|^afb\b/],
    ['rollo', /roll|sonnenschutz|raffstore|jalousie|verschattung/], ['glas', /verglasung|^glas/], ['brand', /brand|feuer|^fh\b/],
    ['schall', /schall/], ['rc', /einbruch|^rc\b|^wk\b/], ['klima', /klima/], ['zarge', /zarge/], ['blatt', /blatt/], ['oberfl', /oberfl/],
    ['farbe', /farbe|^ral\b/], ['schloss', /schloss/], ['beschlag', /beschlag|druecker|griff/], ['typ', /^typ/],
    ['art', /^(art|elementart|element|bauteil|bezeichnung|tuerart|fensterart|gegenstand)\b/], ['bem', /notiz|bemerk|hinweis|anmerk|kommentar|sonstig/]];
  const feldVon = (kopf) => { const n = norm(kopf); if (!n) return ''; const r = REGELN.find(([, rx]) => rx.test(n)); return r ? r[0] : 'bem+'; };
  const FELDER = () => [['', '– nicht übernehmen –'], ['bem+', '→ an Bemerkung anhängen'], ['bh', 'Breite × Höhe (zusammen)'], ['aus', 'Ausstattung (Stichwörter)'],
    ...TSP.filter((c) => c[2] !== 'b').map((c) => [c[0], c[1]])];
  const istKopf = (row) => { const F = new Set(row.map(feldVon).filter((f) => f && f !== 'bem+')); return F.size >= 3 && row.filter((x) => typeof x === 'string' && x).length >= 3; };
  const GESCH = /^(kg|ug|eg|og|dg|sb|sg|\d\.? ?og|\d\.? ?ug|keller\w*|erdgeschoss|obergeschoss|dachgeschoss|untergeschoss)$/i;
  const leer = (v) => v === '' || v == null || (typeof v === 'string' && !v.trim());

  // ---------- Werte vereinheitlichen ----------
  const lev = (a, b) => { const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; };
  function artVon(v, info) {
    const s = String(v).trim(); if (!s) return '';
    if (/rettungsweg/i.test(s)) { info.rw = true; return 'Fenster'; }
    const n = norm(s).replace(/tuere\b/g, 'tuer').replace(/tueren\b/g, 'tuer');
    let best = '', d = 99; TA.art.forEach((a) => { const x = lev(n, norm(a)); if (x < d) { d = x; best = a; } });
    return d <= Math.max(2, Math.round(n.length / 6)) ? best : s;
  }
  function mass(v, info, k) {
    if (leer(v)) return '';
    const x = typeof v === 'number' ? v : parseFloat(String(v).replace(/\s/g, '').replace(',', '.'));
    if (!isFinite(x)) { info.hinw.push(`${k === 'b' ? 'Breite' : k === 'h' ? 'Höhe' : k === 'wand' ? 'Wanddicke' : 'Brüstung'} „${v}“ ist keine Zahl`); return ''; }
    const m = x >= 10 ? x / 1000 : x; if (x >= 10) info.mm = true;
    return String(Math.round(m * 1000) / 1000).replace('.', ',');
  }
  const STICH = [[/umfassungszarge/i, 'umfz'], [/l(ue|ü)ftung/i, 'lueft'], [/lichtausschnitt/i, 'licht'], [/obent(ue|ü)rschlie|\bots\b|t(ue|ü)rschlie(ss|ß)er/i, 'otsch'],
    [/feststell/i, 'frl'], [/panik/i, 'panik'], [/notausgang|en ?179/i, 'notaus'], [/barrierefrei|din ?18040/i, 'bf'], [/schwellenlos|nullschwelle/i, 'schwelle'],
    [/bodendichtung/i, 'bodend'], [/oberlicht/i, 'oberlicht'], [/seitenteil/i, 'seitenteil'], [/e-?(ö|oe)ffner|t(ue|ü)r(ö|oe)ffner/i, 'eoeff'],
    [/antrieb/i, 'antrieb'], [/zutritt/i, 'zk'], [/schlie(ss|ß)anlage/i, 'sa'], [/stopper/i, 'stopper'], [/kantenschutz/i, 'kanten'], [/feuchtraum|klimaklasse ?iii/i, 'nass']];
  function stichwoerter(t, text) {
    STICH.forEach(([rx, k]) => { if (rx.test(text)) t[k] = true; });
    const br = text.match(/\b(t ?30|t ?90|ei2? ?30|ei2? ?90)[\s-]*(rs)?\b/i); if (br && !t.brand) t.brand = br[1].replace(/\s/g, '').toUpperCase().replace(/^EI(\d)/, 'EI2 $1') + (br[2] ? '-RS' : '');
    else if (/\brs\b|rauchschutz/i.test(text) && !t.brand) t.brand = 'RS';
    const rc = text.match(/\b(rc|wk) ?([2-4])\b/i); if (rc && !t.rc) t.rc = 'RC' + rc[2];
    const db = text.match(/(\d{2}) ?db\b/i); if (db && !t.schall) t.schall = db[1] + ' dB';
  }
  function wert(k, v, info, t) {
    if (leer(v)) return;
    const s = String(v).trim();
    if (s === '?' || /^\?+$/.test(s)) { info.hinw.push(`${(TSP.find((c) => c[0] === k) || [, k])[1]}: noch offen („?“)`); return; }
    if (['b', 'h', 'wand', 'bruestung'].includes(k)) { const m = mass(v, info, k); if (m) t[k] = m; return; }
    if (k === 'bh') { const m = s.match(/([\d.,]+)\s*[x×\/*]\s*([\d.,]+)/i); if (m) { wert('b', m[1], info, t); wert('h', m[2], info, t); } else info.hinw.push(`Maß „${s}“ nicht lesbar`); return; }
    if (k === 'art') { t.art = artVon(s, info); if (info.rw) t.bem = [t.bem, '2. Rettungsweg'].filter(Boolean).join(' · '); return; }
    if (k === 'flg') { const n = parseInt(s, 10); t.flg = n === 1 ? '1-flg.' : n === 2 ? '2-flg.' : /stulp|2/.test(s) ? '2-flg.' : s; return; }
    if (k === 'din') { const m = s.match(/^(?:din\s*)?(l|r|links|rechts)\b/i); if (m) t.din = 'DIN ' + m[1][0].toUpperCase(); else t.din = s; return; }
    if (k === 'oeffnung') { const x = s.toLowerCase().replace(/\s/g, '').replace('dreh/kipp', 'drehkipp').replace('dreh-kipp', 'drehkipp'); t.oeffnung = t.oeffnung && t.oeffnung !== x ? t.oeffnung + ' / ' + x : x; return; }
    if (k === 'fb_innen') { t.fb_innen = /^gefliest$/i.test(s) ? 'gefliest (bauseits)' : s; return; }
    if (k === 'fb_aussen') { t.fb_aussen = /^alu/i.test(s) ? 'Aluminium' : s; return; }
    if (k === 'rollo') { t.rollo = /^(ja|j|x|1)$/i.test(s) ? 'ja' : /^(nein|n|-|0)$/i.test(s) ? 'nein' : s; return; }
    if (k === 'glas' && /^lichtausschnitt$/i.test(s)) { t.licht = true; return; }
    if (k === 'geschoss') { t.geschoss = s.length <= 4 ? s.toUpperCase() : s; return; }
    if (k === 'aus') { stichwoerter(t, s); return; }
    if (k === 'bem+') { info.bem.push(`${info.kopf}: ${s}`); return; }
    if (k === 'bem') { t.bem = [t.bem, s].filter(Boolean).join(' · '); return; }
    if (k === 'anzahl') { const n = parseFloat(s.replace(',', '.')); if (isFinite(n) && n !== 1) t.anzahl = String(n); return; }
    t[k] = (typeof v === 'number' ? String(v).replace('.', ',') : s).slice(0, 500);
  }

  // ---------- Tabelle → Zeilen der Türliste ----------
  function auswerten(blaetter, wahl, map) {
    const out = [], gesehen = new Map(), stat = { doppelt: 0, mm: false, leer: 0, ohneKopf: [] };
    blaetter.forEach((bl, bi) => {
      if (!wahl.has(bi)) return;
      let kopf = null, ctx = { geschoss: '', art: '' };
      const Z = bl.zeilen;
      if (!Z.some(istKopf)) { stat.ohneKopf.push(bl.name); return; }
      Z.forEach((row) => {
        const voll = row.map((v, i) => [i, v]).filter(([, v]) => !leer(v));
        if (!voll.length) return;
        if (istKopf(row)) { const alt = kopf; kopf = row.map((h, i) => String(h || '').trim() || (alt && alt[i]) || ''); return; }   // leere Zellen in einer wiederholten Kopfzeile: Spalte wie vorher
        if (voll.length === 1) {   // Abschnitt: „EG“, „Fenster“, „Türen OG“
          const s = String(voll[0][1]).trim();
          if (GESCH.test(s)) ctx.geschoss = s.toUpperCase(); else { const g = s.match(/\b(kg|ug|eg|og|dg|\d\.? ?og)\b/i); if (g) ctx.geschoss = g[1].toUpperCase(); if (/fenster/i.test(s)) ctx.art = 'Fenster'; else if (/t(ue|ü)r/i.test(s)) ctx.art = 'Innentür'; }
          return;
        }
        if (!kopf) return;
        const t = { id: uid() }, info = { hinw: [], bem: [], mm: false, rw: false, kopf: '' }, texte = [];
        row.forEach((v, i) => { const h = kopf[i] || `Spalte ${i + 1}`; const f = map[h] !== undefined ? map[h] : feldVon(h); if (!f || leer(v)) return; info.kopf = h; wert(f, v, info, t); if (typeof v === 'string') texte.push(v); });
        if (!t.geschoss && ctx.geschoss) t.geschoss = ctx.geschoss;
        if (!t.art && ctx.art) t.art = ctx.art;
        if (info.bem.length) t.bem = [t.bem, ...info.bem].filter(Boolean).join(' · ');
        stichwoerter(t, [t.bem || '', ...texte.filter((x) => x.length > 3)].join(' '));
        if (info.mm) stat.mm = true;
        const sig = JSON.stringify(Object.keys(t).filter((k) => k !== 'id').sort().map((k) => [k, t[k]]));
        if (gesehen.has(sig)) { stat.doppelt++; return; }
        gesehen.set(sig, bl.name);
        if (Object.keys(t).length <= 2) { stat.leer++; return; }
        out.push({ t, hinw: info.hinw, blatt: bl.name });
      });
    });
    return { zeilen: out, stat };
  }

  // ---------- Plausibilitätsprüfung (für eine Zeile im Zusammenhang der ganzen Liste) ----------
  const zahl = (v) => { const x = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(x) ? (x >= 10 ? x / 1000 : x) : null; };
  const f2 = (x) => String(Math.round(x * 100) / 100).replace('.', ',');
  function pruefen(t, alle) {
    const H = [], w = (s) => H.push(['w', s]), i = (s) => H.push(['i', s]);
    const art = (t.art || '').toLowerCase(), text = `${t.art || ''} ${t.bem || ''}`.toLowerCase();
    const fenster = /fenster/.test(art) && !/fenstert(ü|ue)r/.test(art), tuer = !fenster && (/t(ü|ue)r|tor/.test(art) || (!art && !t.bruestung));
    const b = zahl(t.b), h = zahl(t.h), brh = zahl(t.bruestung), rw = /rettungsweg/.test(text);
    if (!t.nr) w('Nr. fehlt'); else if (alle.filter((x) => x.nr === t.nr).length > 1) w(`Nr. ${t.nr} kommt mehrfach vor`);
    if (!t.art) i('Art fehlt (Fenster, Innentür …)');
    else if (!TA.art.includes(t.art)) (/^[\d.,\s]+$/.test(t.art) ? w : i)(`Art „${t.art}“ ${/^[\d.,\s]+$/.test(t.art) ? 'ist eine Zahl – verrutschte Spalte?' : 'ist keine der üblichen Arten'}`);
    if (!t.raumname && !t.raum) i('Raum fehlt');
    if (b == null || h == null) w('Breite oder Höhe fehlt');
    if (tuer && b != null && h != null) {
      if (b < 0.55 || b > 3.2) w(`Breite ${f2(b)} m ist für eine Tür ungewöhnlich`);
      if (h < 1.98) w(`Höhe ${f2(h)} m – lichte Durchgangshöhe von 2,00 m ist so kaum möglich`);
      if (h > 3.5) w(`Höhe ${f2(h)} m ist für eine Tür ungewöhnlich`);
      if (t.bf && b < 1.01) w('barrierefrei: Rohbaubreite unter 1,01 m – lichte Breite 0,90 m (DIN 18040) wird kaum erreicht');
    }
    if (fenster && b != null && h != null && (b < 0.25 || b > 6 || h < 0.25 || h > 4)) w(`Maß ${f2(b)} × ${f2(h)} m ist für ein Fenster ungewöhnlich`);
    if (tuer && brh != null && brh > 0.25) i(`Tür mit Brüstung ${f2(brh)} m?`);
    if (fenster && brh == null && !rw) i('Brüstungshöhe fehlt');
    if (brh != null && brh > 0 && brh < 0.1 && !tuer) w(`Brüstung ${String(brh).replace('.', ',')} m – Tippfehler?`);
    if (fenster && brh != null && brh < 0.9 && !/^(eg|kg|ug)$/i.test(t.geschoss || '') && !/absturz/.test(text)) w(`Brüstung ${f2(brh)} m im ${t.geschoss || 'Obergeschoss'} – Absturzsicherung prüfen`);
    if (rw) {
      if (b != null && h != null && (b < 0.9 || h < 1.2)) w(`2. Rettungsweg: ${f2(b)} × ${f2(h)} m – lichte Öffnung mind. 0,90 × 1,20 m`);
      else if (b != null && h != null) i('2. Rettungsweg: lichte Öffnung (nicht Rohbaumaß) mind. 0,90 × 1,20 m prüfen');
      if (brh != null && brh > 1.2) w(`2. Rettungsweg: Brüstung ${f2(brh)} m – höchstens 1,20 m`);
      if (/^ja/i.test(t.rollo || '') && !/kurbel|notöffn|notoeffn/i.test(`${t.rollo} ${t.bem}`)) w('2. Rettungsweg mit Rollladen: von innen ohne Strom zu öffnen (Handkurbel)?');
      if (/fest/.test(t.oeffnung || '')) w('2. Rettungsweg, aber festverglast');
    }
    const fest = /^fest/.test(t.oeffnung || '');
    if (!fest && (tuer || (fenster && t.oeffnung)) && !t.din) i('Öffnungsrichtung (DIN L/R) fehlt');
    if (fest && /din [lr]/i.test(t.din || '')) i('festverglast, aber mit Öffnungsrichtung');
    if (t.brand && tuer && !t.otsch) w(`${t.brand}: Brand-/Rauchschutztür muss selbstschließend sein – Obentürschließer fehlt`);
    if (t.brand && tuer && t.licht && !/brandschutz/i.test(t.glas || '')) i(`${t.brand} mit Lichtausschnitt – Brandschutzverglasung angeben`);
    if (tuer && /\bwc\b|dusch|bad\b|umkleide/i.test(t.raumname || '') && !t.lueft) i('WC/Bad/Dusche: Lüftungsöffnung (Überströmung)?');
    if (tuer && /innent/.test(art) && (t.rollo && t.rollo !== 'nein' || t.fb_innen || t.fb_aussen)) i('Innentür mit Rollladen/Fensterbank?');
    Object.entries(t).forEach(([k, v]) => { if (typeof v === 'string' && /^\?+$/.test(v.trim())) i(`${(TSP.find((c) => c[0] === k) || [, k])[1]}: noch offen („?“)`); });
    return H;
  }
  window.tlPruefen = pruefen;

  // ---------- Dialog: Import ----------
  window.tlImport = function () {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.xlsx,.xlsm,.csv,.txt';
    inp.onchange = async () => {
      const f = inp.files[0]; if (!f) return;
      const fd = new FormData(); fd.append('datei', f);
      let D; try { const r = await fetch('api/tabelle/lesen', { method: 'POST', body: fd }); D = await r.json(); if (!r.ok) throw new Error(D.error || r.statusText); } catch (e) { toast(e.message, true); return; }
      dialog(D);
    };
    inp.click();
  };
  function dialog(D) {
    const B = D.blaetter || [], wahl = new Set(B.map((_, i) => i)), map = {};
    // Blätter mit (fast) denselben Nummern sind meist zwei Stände derselben Liste → nur das letzte vorwählen
    const nrs = B.map((_, i) => new Set(auswerten(B, new Set([i]), map).zeilen.map((z) => z.t.nr).filter(Boolean)));
    const staende = [];
    nrs.forEach((A, i) => { for (let j = i + 1; j < nrs.length; j++) { const gem = [...A].filter((x) => nrs[j].has(x)).length; if (A.size && gem >= 0.5 * Math.min(A.size, nrs[j].size)) { wahl.delete(i); staende.push([i, j, gem]); break; } } });
    let ersetzen = false, nurW = false;   // nurW: Vorschau nur mit Warnungen
    const unterschiede = (i, j) => { const a = {}, n = { c: 0 }; auswerten(B, new Set([i]), map).zeilen.forEach((z) => { a[z.t.nr] = JSON.stringify({ ...z.t, id: 0 }); });
      auswerten(B, new Set([j]), map).zeilen.forEach((z) => { if (a[z.t.nr] && a[z.t.nr] !== JSON.stringify({ ...z.t, id: 0 })) n.c++; }); return n.c; };
    const koepfe = () => { const K = []; B.forEach((bl, bi) => { if (!wahl.has(bi)) return; bl.zeilen.filter(istKopf).forEach((r) => r.forEach((h) => { h = String(h || '').trim(); if (h && !K.includes(h)) K.push(h); })); }); return K; };
    const body = () => {
      const E = auswerten(B, wahl, map), K = koepfe(), F = FELDER();
      const P = E.zeilen.map((z) => ({ ...z, pl: pruefen(z.t, E.zeilen.map((y) => y.t)).concat(z.hinw.map((x) => ['i', x])) }));
      const nW = P.reduce((a, z) => a + z.pl.filter((x) => x[0] === 'w').length, 0), nI = P.reduce((a, z) => a + z.pl.filter((x) => x[0] === 'i').length, 0);
      const PV = nurW && nW ? P.filter((z) => z.pl.some((x) => x[0] === 'w')) : P;
      const vorschau = PV.slice(0, 200).map((z) => `<tr class="${z.pl.some((x) => x[0] === 'w') ? 'w' : ''}"><td>${esc(z.t.nr || '')}</td><td>${esc(z.t.geschoss || '')}</td><td>${esc(z.t.raumname || z.t.raum || '')}</td><td>${esc(z.t.art || '')}</td>
        <td class="r">${esc(z.t.b || '')}${z.t.b || z.t.h ? ' × ' : ''}${esc(z.t.h || '')}</td><td>${esc([z.t.din, z.t.oeffnung, z.t.brand, ...TJA.filter(([k]) => z.t[k]).map(([, l]) => l)].filter(Boolean).join(', '))}</td>
        <td class="pl">${z.pl.map(([l, s]) => `<span class="${l}">${l === 'w' ? '⚠' : 'ℹ'} ${esc(s)}</span>`).join('')}</td></tr>`).join('');
      return `<h3>Fenster- & Türliste einlesen – ${esc(D.datei)}</h3>
        <div class="tli">
          <div class="tli-l">
            <b>Tabellenblätter</b>${B.map((bl, i) => `<label class="chk"><input type="checkbox" data-tib="${i}"${wahl.has(i) ? ' checked' : ''}> ${esc(bl.name)} <small class="mute">${bl.zeilen.length} Zeilen</small></label>`).join('')}
            ${staende.map(([i, j, n]) => `<p class="hint">„${esc(B[i].name)}“ und „${esc(B[j].name)}“ haben ${n} gleiche Nummern – wohl zwei Stände derselben Liste. Vorgewählt: „${esc(B[j].name)}“.${(() => { const d = unterschiede(i, j); return d ? ` ${d} Zeilen unterscheiden sich.` : ''; })()}</p>`).join('')}
            ${E.stat.ohneKopf.length ? `<p class="hint">Ohne erkennbare Kopfzeile: ${E.stat.ohneKopf.map(esc).join(', ')}</p>` : ''}
            <b style="margin-top:.6rem;display:block">Spalten</b><p class="hint" style="margin:.1rem 0 .4rem">Erkannt am Spaltennamen – bei Bedarf ändern.</p>
            <div class="tli-map">${K.map((h) => { const f = map[h] !== undefined ? map[h] : feldVon(h); return `<label><span title="${esc(h)}">${esc(h)}</span><select data-tim="${esc(h)}">${F.map(([k, l]) => `<option value="${k}"${k === f ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`; }).join('')}</div>
            <label class="chk" style="margin-top:.6rem"><input type="checkbox" data-tiers${ersetzen ? ' checked' : ''}> vorhandene ${TL.tueren.length} Zeilen ersetzen (sonst anhängen)</label>
          </div>
          <div class="tli-r">
            <p class="tli-sum"><b>${P.length}</b> Zeilen · ${nW ? `<button type="button" class="btn sm${nurW ? ' pri' : ''} tli-nw" data-tinw title="${nurW ? 'Wieder alle Zeilen zeigen' : 'Nur Zeilen mit Warnungen zeigen'}">⚠ ${nW} Warnungen${nurW ? ' – alle zeigen' : ' – nur diese zeigen'}</button> · ` : ''}${nI} Hinweise${E.stat.doppelt ? ` · ${E.stat.doppelt} gleiche Zeilen aus mehreren Blättern nur einmal` : ''}${E.stat.mm ? ' · Maße in mm erkannt und in m umgerechnet' : ''}</p>
            <div class="tli-v"><table><thead><tr><th>Nr.</th><th>Gesch.</th><th>Raum</th><th>Art</th><th class="r">B × H (m)</th><th>Ausführung</th><th>Prüfung</th></tr></thead><tbody>${vorschau || '<tr><td colspan="7" class="mute">Keine Zeilen erkannt – Spalten oder Blätter prüfen.</td></tr>'}</tbody></table>${PV.length > 200 ? `<p class="hint">… und ${PV.length - 200} weitere</p>` : ''}</div>
          </div>
        </div>
        <div class="acts"><button class="btn" data-m="x">Abbrechen</button><button class="btn pri" data-m="ok"${P.length ? '' : ' disabled'}>${P.length} Zeilen übernehmen</button></div>`;
    };
    modalBox(body(), (m, bg, close) => {
      if (m === 'x') return close();
      if (m === 'ok') {
        const E = auswerten(B, wahl, map); if (!E.zeilen.length) return;
        tlMerken(`${E.zeilen.length} Zeilen eingelesen`);
        TL.tueren = ersetzen ? E.zeilen.map((z) => z.t) : TL.tueren.concat(E.zeilen.map((z) => z.t));
        TLA = TLC = null; TLq = ''; tlSpeichern(true); close(); if (typeof render === 'function') render();
        const nW = E.zeilen.reduce((a, z) => a + pruefen(z.t, TL.tueren).filter((x) => x[0] === 'w').length, 0);
        toast(`${E.zeilen.length} Zeilen eingelesen${nW ? ` – ${nW} Warnungen, siehe „⚠ Prüfen“` : ''}. Strg+Z macht es rückgängig.`);
      }
    });
    const bg = [...document.querySelectorAll('.modal-bg')].pop(), mo = bg.querySelector('.modal'); mo.classList.add('tli-modal');
    const neu = () => { const sc = (mo.querySelector('.tli-v') || {}).scrollTop || 0; mo.innerHTML = body(); const v = mo.querySelector('.tli-v'); if (v) v.scrollTop = sc; };
    mo.addEventListener('click', (e) => { if (e.target.closest('[data-tinw]')) { nurW = !nurW; mo.querySelector('.tli-v').scrollTop = 0; neu(); } });
    mo.addEventListener('change', (e) => {
      const el = e.target;
      if (el.dataset.tib != null) { if (el.checked) wahl.add(+el.dataset.tib); else wahl.delete(+el.dataset.tib); neu(); }
      else if (el.dataset.tim != null) { map[el.dataset.tim] = el.value; neu(); }
      else if (el.hasAttribute('data-tiers')) { ersetzen = el.checked; }
    });
  }

  // ---------- Dialog: Prüfen ----------
  window.tlPruefDialog = function () {
    const T = TL.tueren, L = T.map((t, r) => [t, r, pruefen(t, T)]).filter(([, , p]) => p.length);
    const nW = L.reduce((a, x) => a + x[2].filter((y) => y[0] === 'w').length, 0);
    modalBox(`<h3>Plausibilität der Fenster- & Türliste</h3>
      <p class="hint">${L.length ? `${L.length} von ${T.length} Zeilen mit Hinweisen${nW ? `, davon ${nW} Warnungen` : ''}. Zeile anklicken springt in die Liste.` : `Alle ${T.length} Zeilen sind plausibel.`}</p>
      <div class="tli-v" style="max-height:60vh">${L.map(([t, , p]) => `<button type="button" class="tlp-z" data-m="geh" data-id="${esc(t.id)}"><b>${esc(t.nr || '–')}</b> <span class="mute">${esc([t.geschoss, t.raumname || t.raum, t.art].filter(Boolean).join(' · '))}</span>
        ${p.map(([l, s]) => `<span class="${l}">${l === 'w' ? '⚠' : 'ℹ'} ${esc(s)}</span>`).join('')}</button>`).join('')}</div>
      <div class="acts"><button class="btn" data-m="x">Schließen</button></div>`, (m, bg, close, b) => {
      if (m === 'x') return close();
      if (m === 'geh') {
        close(); TLq = ''; const r = tlSicht().findIndex((t) => t.id === b.dataset.id); if (r < 0) return;
        TLA = TLC = { r, c: 0 }; tlZeichnen();
        const tr = document.querySelector(`table.tl tr[data-t="${CSS.escape(b.dataset.id)}"]`); if (tr) tr.scrollIntoView({ block: 'center' });
      }
    });
  };
  window.tlWarnungen = () => (TL && TL.tueren ? TL.tueren.reduce((a, t) => a + pruefen(t, TL.tueren).filter((x) => x[0] === 'w').length, 0) : 0);

  const css = document.createElement('style');
  css.textContent = `.tli-modal{width:min(1180px,96vw);max-width:none}
.tli{display:grid;grid-template-columns:290px minmax(0,1fr);gap:1rem;align-items:start}
@media (max-width:800px){.tli{grid-template-columns:1fr}}
.tli-l .chk{display:flex;gap:.4rem;align-items:center;margin:.2rem 0}
.tli-map{display:flex;flex-direction:column;gap:.25rem;max-height:46vh;overflow:auto;padding-right:.3rem}
.tli-map label{display:grid;grid-template-columns:minmax(0,1fr) 150px;gap:.4rem;align-items:center;font-size:.85rem}
.tli-map label span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tli-map select{font-size:.82rem;padding:.2rem .3rem;width:100%}
.tli-sum{margin:0 0 .4rem}.tli-sum .tli-nw{padding:.1rem .5rem;font-size:.84rem}.tli-sum .tli-nw:not(.pri){color:var(--red,#c0392b);border-color:var(--red,#c0392b)}.tli-sum .w,.tli-v .w{color:var(--red,#c0392b)}
.tli-v{max-height:58vh;overflow:auto;border:1px solid var(--line);border-radius:calc(8px*var(--rk,1))}
.tli-v table{border-collapse:collapse;width:100%;font-size:.84rem}
.tli-v th{position:sticky;top:0;background:var(--tabs,var(--card));text-align:left;padding:.3rem .4rem;font-weight:500}
.tli-v td{padding:.25rem .4rem;border-top:1px solid var(--line);vertical-align:top}
.tli-v td.r,.tli-v th.r{text-align:right;white-space:nowrap}
.tli-v tr.w td:first-child{background:color-mix(in srgb,#e07b3a 10%,transparent)}
.tli-v .pl span,.tlp-z span{display:block;font-size:.8rem}.tli-v .pl span.i,.tlp-z span.i{color:var(--mute)}
.tlp-z{display:block;width:100%;text-align:left;border:0;border-bottom:1px solid var(--line);background:none;color:inherit;padding:.45rem .6rem;cursor:pointer;font:inherit}
.btn.warnb{border-color:var(--red,#c0392b);color:var(--red,#c0392b)}
.tlp-z:hover{background:var(--hov,rgba(0,0,0,.04))}.tlp-z span.w{color:var(--red,#c0392b)}`;
  document.head.appendChild(css);
})();
