/* U-Werte an den Bauteilen (GO 18.11.2026, Mock „U-Werte an den Bauteilen“: UW-A1 B1 C1 D1) – global bpUwert.
   Rechnet je Zeile der Bauteilliste mit dem Rechenkern des Wärmeschutzes (bp/wsphysik.js, bp/wsregeln.js – erst hier geladen); Schichten,
   Baustoffe und „Neubau?“ liefert der Kern (bpcore/uwert.py, GET <basis>/uwerte). Farbe nach der Bauart: Neubau gegen das Referenzgebäude
   (GModG Anlage 1), sonst Höchstwerte bei Änderung (Anlage 7) – WS_REGELN.anforderung. Schicht ohne Baustoff: gerechnet ohne sie, grau mit „~“ (C1).
   Fenster/Türen: Uw aus der Position, je Zeile überschreibbar (Zeile.uw, D1).
   bpUwert.fuellen(wurzel, basis, rev, { name(id), setzen(id, {uw}) }) füllt [data-btu="<id>"] (Wert) und [data-btuw="<id>"] (Details). */
(function () {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const z2 = (v) => (v == null ? '–' : (Math.round(v * 100) / 100).toFixed(2).replace('.', ','));
  const zk = (v, n) => (v == null ? '' : String(Math.round(v * 10 ** n) / 10 ** n).replace('.', ','));
  const lade = (n) => new Promise((ok) => { const [b, v] = window.BP_HEAD_BASIS || ['/bp/', ''], s = document.createElement('script'); s.src = b + n + v; s.onload = ok; s.onerror = ok; document.head.appendChild(s); });
  const C = {};
  function stil() {
    if (document.getElementById('bp-uw-stil')) return;
    const s = document.createElement('style'); s.id = 'bp-uw-stil';
    s.textContent = `.bp-uw{display:inline-block;border-radius:1em;padding:0 .45em;font-size:.78rem;font-weight:600;white-space:nowrap;font-variant-numeric:tabular-nums}
.bp-uw.g{background:color-mix(in srgb,var(--ok,#2e9d5b) 14%,transparent);color:var(--ok,#2e9d5b)}.bp-uw.y{background:color-mix(in srgb,#d99a00 18%,transparent);color:#a86f00}
.bp-uw.r{background:color-mix(in srgb,var(--red,#c62f2a) 13%,transparent);color:var(--red,#c62f2a)}.bp-uw.n,.bp-uw.gr{background:color-mix(in srgb,var(--mute,#667080) 14%,transparent);color:var(--mute,#667080)}
.bp-uwd{margin:.5rem 0;display:flex;flex-direction:column;gap:.35rem;font-size:.86rem}.bp-uwd table{border-collapse:collapse;width:100%}.bp-uwd td,.bp-uwd th{padding:.2rem .4rem;border-bottom:1px solid var(--line,#d5d9de);text-align:left}
.bp-uwd th{font-size:.74rem;color:var(--mute,#667080);font-weight:600}.bp-uwd .r{text-align:right;white-space:nowrap}.bp-uwd .m{color:var(--mute,#667080)}.bp-uwd input{width:5em}`;
    document.head.appendChild(s);
  }
  function rechne(d) {
    const M = Object.values(d.baustoffe || {}), R = {}, RG = window.WS_REGELN, P = window.WSP;
    for (const [id, x] of Object.entries(d.zeilen || {})) {
      if (x.wie) continue;
      const anf = RG.anforderung(x.typ, d.neubau);
      if (RG.ohneSchichten(x.typ)) { R[id] = { typ: x.typ, u: x.uw || x.uw_pos || null, uw_pos: x.uw_pos, eigen: x.uw != null && x.uw !== x.uw_pos, anf, fenster: true }; continue; }
      const S = x.s || [], ok = S.filter((s) => s.m && s.d > 0 && !s.fehlt), fehlt = S.filter((s) => !ok.includes(s));
      let r = null;
      if (ok.length) r = P.uWert(RG.aufbau({ typ: x.typ, schichten: ok.map((s) => ({ m: s.m, d: s.d, lam: s.lam, m2: s.m2, breite: s.breite, abstand: s.abstand, name: s.n })) }, M));
      R[id] = { typ: x.typ, u: r ? r.u : null, r, ok, fehlt, ohneKern: !!x.ohne_kern, mit: x.mit || [], anf, M: d.baustoffe || {} };
    }
    for (const [id, x] of Object.entries(d.zeilen || {})) if (x.wie && R[x.wie]) R[id] = { ...R[x.wie], wie: x.wie };
    return R;
  }
  async function holen(basis, rev) {
    const k = C[basis];
    if (k && k.rev === rev) return k.p;
    const p = (async () => {
      if (!window.WSP) await lade('wsphysik.js');
      if (!window.WS_REGELN) await lade('wsregeln.js');
      const r = await fetch(`${basis}/uwerte`, { credentials: 'same-origin' });
      if (!r.ok || !window.WSP || !window.WS_REGELN) return {};
      return rechne(await r.json());
    })().catch(() => ({}));
    C[basis] = { rev, p };
    return p;
  }
  const art = (e) => (e.u == null ? '' : (e.fehlt && e.fehlt.length) || e.ohneKern ? 'gr' : !e.anf ? 'n' : Math.round(e.u * 100) / 100 <= e.anf.u + 1e-9 ? 'g' : e.u <= e.anf.u * 1.1 ? 'y' : 'r');
  function chip(e) {
    if (!e || e.u == null) return '';
    const a = art(e), t = [e.fenster ? (e.eigen ? 'Uw von Hand (laut Angebot)' : 'Uw aus der Position') : 'U-Wert aus dem gewählten Aufbau',
      e.anf ? `Anforderung ${z2(e.anf.u)} – ${e.anf.quelle}` : '', a === 'gr' ? (e.ohneKern ? 'unvollständig: die Tragschicht steht nicht im Modell' : `unvollständig: ${e.fehlt.map((s) => s.n).join(', ')} ohne Baustoff`) : '',
      e.wie ? 'gemeinsam mit der Kern-Zeile gerechnet' : ''].filter(Boolean).join(' · ');
    return `<span class="bp-uw ${a}" title="${esc(t)}">${a === 'gr' ? '~' : ''}${z2(e.u)}</span>`;
  }
  function details(e, id, o) {
    if (!e) return '';
    const kopf = `<div><b>${e.fenster ? 'Uw' : 'U'} = ${e.u == null ? '–' : z2(e.u) + ' W/(m²K)'}</b> ${chip(e)}${e.anf ? ` <span class="m">· Anforderung ${z2(e.anf.u)} (${esc(e.anf.quelle)})</span>` : ''}</div>`;
    if (e.fenster) {
      return `<div class="bp-uwd">${kopf}<label>Uw laut Angebot <input data-btuwset="${esc(id)}" inputmode="decimal" value="${e.eigen ? z2(e.u) : ''}" placeholder="${e.uw_pos != null ? z2(e.uw_pos) : ''}"> W/(m²K)</label>
        <span class="m">${e.uw_pos != null ? `Aus der Position: Uw ${z2(e.uw_pos)}.` : 'Die Position nennt keinen Uw.'} Leer lassen = Wert der Position.</span></div>`;
    }
    const r = e.r, M = e.M || {};
    const zeilen = r ? e.ok.map((s, i) => `<tr><td>${esc(s.n)}</td><td>${esc((M[s.m] || {}).name || s.m)}${s.m2 ? ` <span class="m">(Holzanteil ${zk(Math.min(1, s.breite / s.abstand) * 100, 0)} %)</span>` : ''}</td><td class="r">${zk(s.d, 1)}</td>
      <td class="r">${zk(s.lam || (M[s.m] || {}).lambda, 3)}</td><td class="r">${z2(r.rSchicht[i])}</td></tr>`).join('') : '';
    const mit = e.mit && e.mit.length && o.name ? `<span class="m">Gerechnet mit: ${e.mit.map((x) => esc(o.name(x))).join(', ')}.</span>` : '';
    return `<div class="bp-uwd">${kopf}${r ? `<table><thead><tr><th>Schicht (innen → außen)</th><th>Baustoff</th><th class="r">d cm</th><th class="r">λ W/(mK)</th><th class="r">R m²K/W</th></tr></thead>
      <tbody><tr class="m"><td colspan="4">Wärmeübergang innen</td><td class="r">${z2(r.rsi)}</td></tr>${zeilen}<tr class="m"><td colspan="4">Wärmeübergang außen</td><td class="r">${z2(r.rse)}</td></tr></tbody></table>` : ''}
      ${e.fehlt && e.fehlt.length ? `<span class="m">Ohne Baustoff, nicht gerechnet: ${e.fehlt.map((s) => esc(s.n)).join(', ')}.</span>` : ''}${e.ohneKern ? '<span class="m">Nur eine Ergänzung (Dämmung, Putz …) – die Tragschicht steht nicht im Modell.</span>' : ''}${mit}
      ${e.wie && o.name ? `<span class="m">Der Wert gilt für „${esc(o.name(e.wie))}“ mit allen Ergänzungen.</span>` : ''}<span class="m">Gerechnet wie im Wärmeschutz (DIN EN ISO 6946), ohne Wärmebrücken und Tauwasser – der Nachweis bleibt in der App Wärmeschutz.</span></div>`;
  }
  async function fuellen(wurzel, basis, rev, o = {}) {
    if (!wurzel || !wurzel.querySelector('[data-btu],[data-btuw]')) return;
    stil();
    const R = await holen(basis, rev);
    wurzel.querySelectorAll('[data-btu]').forEach((el) => { el.innerHTML = chip(R[el.dataset.btu]); });
    wurzel.querySelectorAll('[data-btuw]').forEach((el) => {
      const id = el.dataset.btuw; el.innerHTML = details(R[id], id, o);
      const i = el.querySelector('[data-btuwset]');
      if (i && o.setzen) i.addEventListener('change', (ev) => { ev.stopPropagation(); const v = parseFloat(i.value.replace(',', '.')); o.setzen(id, { uw: v > 0 ? v : null }); });
    });
  }
  window.bpUwert = { fuellen, holen, rechne };
}());
