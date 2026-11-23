'use strict';
/* Kosten aus einer Excel-Liste (Mock „Excel-Kostenberechnung“ XL-0 … XL-8 alle A, 23.11.2026).
   Befehlsleiste → Neu → „Aus Excel …“: .xls/.xlsx wählen, der Server liest sie nur (plattform/baukosten_excel.py, alte .xls über bpcore/xls.py)
   und schickt Beträge je Kostengruppe (DIN 276:2008 → 2018 umgesetzt) und Befunde zurück; hier Vorschau, Vorschlag „441 → 444“ annehmen,
   „Als neuen Kostenstand übernehmen“. Die Seite „DIN 276“ zeigt einen solchen Stand wie die Liste: drei Ebenen, netto und brutto,
   Einzelbeträge aufklappbar, Schilder „war …“, „ergänzt“, „prüfen“. Gemeinsame Namen aus baukosten.js (B, V, LIST, datenAendern, oeffnen …). */
(function () {
  const css = document.createElement('style');
  css.textContent = `.bkx-t{width:100%;border-collapse:collapse;table-layout:fixed}.bkx-t th,.bkx-t td{padding:.26rem .45rem;border-bottom:1px solid var(--line);vertical-align:top;white-space:normal;overflow-wrap:anywhere}
.bkx-t th{text-align:left;color:var(--mute);font-weight:600}.bkx-t .z{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
.bkx-t tr.e1 td{font-weight:700;background:color-mix(in srgb,var(--af,#2a6) 9%,transparent)}.bkx-t tr.e2 td{font-weight:600}
.bkx-t tr.e3 td:nth-child(2){padding-left:1.2rem}.bkx-t tr.ee td:nth-child(2){padding-left:2.4rem;color:var(--mute)}.bkx-t tr.leer td{color:var(--mute)}
.bkx-t tr.s td{font-weight:700;border-top:2px solid var(--ink)}
.bkx-tag{display:inline-block;border:1px solid var(--line);border-radius:999px;padding:0 .4rem;font-size:.72rem;font-weight:400;color:var(--mute);margin-left:.3rem;white-space:nowrap}
.bkx-tag.gelb{background:color-mix(in srgb,var(--y,#e8b400) 22%,transparent);color:var(--ink)}.bkx-tag.rot{border-color:var(--red,#c62f2a);color:var(--red,#c62f2a)}
.bkx-hw{border:1px solid var(--line);border-left:4px solid var(--y,#e8b400);border-radius:calc(8px*var(--rk,1));padding:.5rem .7rem;margin:0 0 .7rem;background:var(--card)}
.bkx-hw ul{margin:.3rem 0;padding-left:1.1rem}.bkx-hw li{margin:.15rem 0}.bkx-hw .k{font-weight:600;margin-right:.3rem}
.bkx-kl{border:0;background:none;color:inherit;font:inherit;padding:0;cursor:pointer;text-align:left}
.bkx-l{max-height:min(42vh,26rem);overflow:auto;border:1px solid var(--line);border-radius:calc(8px*var(--rk,1));padding:.3rem .6rem}
@media (max-width:820px){.bkx-t .bru{display:none}}`;
  document.head.appendChild(css);

  const ART = { rechenfehler: ['Rechenfehler', 'rot'], gefahr: ['doppelt?', 'rot'], pruefen: ['prüfen', 'gelb'], luecke: ['Lücke', 'gelb'],
    ohne_aufteilung: ['aus anderer Datei', ''], umgesetzt: ['umgesetzt', ''], ergaenzt: ['ergänzt', ''] };
  const REIHE = ['rechenfehler', 'gefahr', 'pruefen', 'luecke', 'ohne_aufteilung'];   // „umgesetzt“ steht als Schild „war …“ an der Zeile
  const OFFEN = new Set();   // aufgeklappte Kostengruppen (Einzelbeträge)
  const e2 = (v) => (v == null ? '' : bpZahl(v, 2, 2) + ' €');

  function befundeHtml(BF, opt = {}) {
    const G = {}; BF.forEach((b, i) => { (G[b.art] ||= []).push([b, i]); });
    return REIHE.filter((a) => G[a]).map((a) => `<li><span class="k">${esc(ART[a][0])} (${G[a].length})</span><ul>${G[a].map(([b, i]) => `<li>${esc(b.text)}${b.nach && opt.nach
      ? ` <button type="button" class="btn sm" data-bkxnach="${i}">→ ${esc(b.nach)} übernehmen</button>` : ''}</li>`).join('')}</ul></li>`).join('');
  }
  // Vorschlag annehmen (441 → 444): Zeilen dieser KG wandern, der Befund geht
  function nachAnnehmen(X, i) {
    const b = X.befunde[i]; if (!b || !b.nach) return X;
    const N = (window.B && B.din) || {}, Z = X.zeilen.map((z) => (z.kg === b.kg ? { ...z, kg: b.nach, name: N[b.nach] || z.name } : z));
    return { ...X, zeilen: Z, befunde: X.befunde.filter((_, k) => k !== i) };
  }

  /* ---------- Seite „DIN 276“ eines Excel-Stands ---------- */
  function din() {
    const X = B.data.excel, c = B.calc, D = B.din || {}, f = 1 + (B.data.mwst || 0) / 100;
    const Z = c.zeilen, je = {}, alt = {};
    Z.forEach((z) => { (je[z.kg] ||= []).push(z); if (z.kg_alt && z.kg_alt !== z.kg) (alt[z.kg] ||= new Set()).add(z.kg_alt); });
    const sum = (p) => Z.filter((z) => z.kg.startsWith(p)).reduce((a, z) => a + z.betrag, 0);
    const tagsVon = (k) => {
      const t = [];
      if (alt[k]) t.push(`<span class="bkx-tag" title="Kostengruppe der Liste (DIN 276:2008)">war ${esc([...alt[k]].join(', '))}</span>`);
      X.befunde.filter((b) => b.kg === k && !['umgesetzt'].includes(b.art)).forEach((b) => { const a = ART[b.art] || [b.art, '']; t.push(`<span class="bkx-tag ${a[1]}" title="${esc(b.text)}">${esc(a[0])}</span>`); });
      if ((je[k] || []).some((z) => z.extern)) t.push('<span class="bkx-tag" title="Betrag kam aus einer anderen Datei">aus anderer Datei</span>');
      return t.join('');
    };
    const zeile = (cls, k, name, w, tags = '', kl = '') => `<tr class="${cls}"><td>${k}</td><td>${kl}${esc(name)}${tags}</td><td class="z">${w == null ? '' : e2(w)}</td><td class="z bru">${w == null ? '' : e2(w * f)}</td></tr>`;
    const L = new Set(X.liste || []), rows = [];
    const ersteEbene = [...new Set(Z.map((z) => z.kg[0]))].sort();
    ersteEbene.forEach((e) => {
      rows.push(zeile('e1', e + '00', D[e + '00'] || '', sum(e)));
      const zweite = [...new Set(Z.filter((z) => z.kg[0] === e).map((z) => z.kg.slice(0, 2)))].sort();
      zweite.forEach((p) => {
        if (p.endsWith('0') && p !== e + '0') return;
        const k2 = p + '0';
        if (k2 !== e + '00') rows.push(zeile('e2', k2, D[k2] || '', sum(p), tagsVon(k2)));
        // dritte Ebene: alle Gruppen der DIN 276:2018 – leere grau, solche, die die alte Liste nicht kannte, „ergänzt“
        const K3 = [...new Set([...Object.keys(D).filter((k) => k.startsWith(p) && !k.endsWith('0')), ...Object.keys(je).filter((k) => k.startsWith(p) && k !== k2)])].sort();
        K3.forEach((k) => {
          const E = je[k] || [], w = E.reduce((a, z) => a + z.betrag, 0), auf = OFFEN.has(k);
          const tags = tagsVon(k) + (!E.length && L.size && !L.has(k) ? '<span class="bkx-tag" title="Kostengruppe der DIN 276:2018, die in der alten Liste fehlte">ergänzt</span>' : '');
          const kl = E.length > 1 ? `<button type="button" class="bkx-kl" data-bkxk="${k}" aria-expanded="${auf}">${bpKlapp(auf)} </button>` : '';
          rows.push(zeile('e3' + (E.length ? '' : ' leer'), k, D[k] || (E[0] && E[0].name) || '', E.length ? w : null, tags + (E.length > 1 ? `<span class="bkx-tag">${E.length} Beträge</span>` : ''), kl));
          if (auf) E.forEach((z) => rows.push(zeile('ee', '', z.name, z.betrag)));
        });
        if (je[k2]) je[k2].forEach((z) => rows.push(zeile('ee', '', z.name_alt || z.name, z.betrag)));
      });
    });
    const unv = c.risiko ? zeile('e1', '', `Unvorhergesehenes (${bpZahl(B.data.risiko, 0, 2)} %)`, c.risiko) : '';
    const n = X.befunde.filter((b) => b.art !== 'umgesetzt').length;
    const hw = !X.gelesen && X.befunde.length ? `<div class="bkx-hw"><b>Beim Einlesen von „${esc(X.datei)}“ aufgefallen</b> <span class="mute">– ${n} Hinweise, ${X.befunde.length - n} Kostengruppen auf DIN 276:2018 umgesetzt</span>
        <ul>${befundeHtml(X.befunde, { nach: true })}</ul><button type="button" class="btn sm" data-bkxgel>Gelesen</button></div>`
      : X.befunde.length ? `<p class="mute" style="margin:0 0 .5rem"><button type="button" class="bkx-kl" data-bkxhw>${bpKlapp(false)} Hinweise aus dem Einlesen (${X.befunde.length})</button></p>` : '';
    return `${hw}<table class="bkx-t"><colgroup><col style="width:4.5rem"><col><col style="width:9.5rem"><col class="bru" style="width:9.5rem"></colgroup>
      <thead><tr><th>KG</th><th>Bezeichnung (DIN 276:2018)</th><th class="z">netto</th><th class="z bru">brutto</th></tr></thead><tbody>${rows.join('')}${unv}
      <tr class="s"><td></td><td>Summe</td><td class="z">${e2(c.total)}</td><td class="z bru">${e2(c.brutto)}</td></tr></tbody></table>
      <p class="mute bk-q">Aus „${esc(X.datei)}“, eingelesen am ${esc(bpTag(X.am))}${X.von ? ' von ' + esc(X.von) : ''}. Kostengruppen nach DIN 276:2018-12; die Beträge ändern im Reiter „Bauteile“ (Spalte EP).</p>`;
  }

  V.addEventListener('click', (e) => {
    if (!B || !B.data || !B.data.excel) return;
    const k = e.target.closest('[data-bkxk]'); if (k) { const g = k.dataset.bkxk; if (OFFEN.has(g)) OFFEN.delete(g); else OFFEN.add(g); zeichne(); return; }
    if (e.target.closest('[data-bkxgel]')) return datenAendern('Hinweise gelesen', { excel: { ...B.data.excel, gelesen: true } });
    if (e.target.closest('[data-bkxhw]')) return datenAendern('Hinweise wieder zeigen', { excel: { ...B.data.excel, gelesen: false } });
    const n = e.target.closest('[data-bkxnach]');
    if (n) { const X = B.data.excel, b = X.befunde[+n.dataset.bkxnach]; return datenAendern(`${b.kg} → ${b.nach}`, { excel: nachAnnehmen(X, +n.dataset.bkxnach) }); }
  });

  /* ---------- Einlesen ---------- */
  function einlesen() {
    const pid = BPHead.projektId(); if (!pid) { toast('Bitte zuerst ein Projekt wählen.', true); return; }
    const f = document.createElement('input'); f.type = 'file'; f.accept = '.xls,.xlsx,.xlsm';
    f.addEventListener('change', async () => {
      const d = f.files && f.files[0]; if (!d) return;
      const fd = new FormData(); fd.append('datei', d);
      const warte = setTimeout(() => toast('Datei wird gelesen …'), 1500);
      try {
        const r = await fetch('api/bk/excel/vorschau', { method: 'POST', body: fd }), j = await r.json().catch(() => ({ error: 'Unerwartete Antwort vom Server.' }));
        if (!r.ok) throw new Error(j.error || r.statusText);
        vorschau(j, pid);
      } catch (er) { toast(er.message, true); } finally { clearTimeout(warte); }
    });
    f.click();
  }
  function vorschau(X, pid) {
    const D = (B && B.din) || {};
    const inhalt = () => {
      const E1 = {}; X.zeilen.forEach((z) => { E1[z.kg[0]] = (E1[z.kg[0]] || 0) + z.betrag; });
      return `<p class="mute" style="margin:.4rem 0">${esc(X.datei)} · ${X.zeilen.length} Beträge · Summe netto <b>${e2(X.summe)}</b> – die Datei wird nur gelesen, nicht gespeichert.</p>
        <table class="bkx-t" style="margin-bottom:.6rem"><tbody>${Object.keys(E1).sort().map((e) => `<tr><td style="width:4rem">${e}00</td><td>${esc(D[e + '00'] || '')}</td><td class="z">${e2(E1[e])}</td></tr>`).join('')}</tbody></table>
        ${X.befunde.some((b) => REIHE.includes(b.art)) ? `<div class="bkx-l"><ul style="margin:.2rem 0;padding-left:1rem">${befundeHtml(X.befunde, { nach: true })}</ul></div>` : '<p class="mute">Keine Auffälligkeiten.</p>'}`;
    };
    modalBox(`<div class="mh"><h3 style="margin:0">Kostenberechnung aus Excel</h3><button type="button" class="x" data-m="x" aria-label="Schließen">✕</button></div>
      <div data-bkxv>${inhalt()}</div>
      <label style="display:block;margin-top:.7rem">Name des Kostenstands <input type="text" data-bkxname value="${esc(('Aus Excel – ' + X.datei.replace(/\.[^.]+$/, '')).slice(0, 200))}" style="width:100%"></label>
      <div class="acts" style="margin-top:.8rem;display:flex;gap:.5rem;justify-content:flex-end"><button type="button" class="btn" data-m="abbrechen">Abbrechen</button><button type="button" class="btn pri" data-m="ok">Als neuen Kostenstand übernehmen</button></div>`,
    async (m, bg, zu) => {
      if (m === 'x' || m === 'abbrechen') return zu();
      if (m !== 'ok') return;
      const b = bg.querySelector('[data-m="ok"]'); b.disabled = true;
      try {
        const r = await api('api/bk/excel', 'POST', { project_id: pid, name: bg.querySelector('[data-bkxname]').value, excel: X });
        zu(); tab = 'din'; LS.set('tab', 'din'); LIST = await api('api/bk'); await oeffnen(r.id);
        if (window.rueckgaengig) rueckgaengig('Kostenberechnung aus Excel eingelesen', async () => { await api('api/bk/' + r.id, 'DELETE'); B = null; await laden(); }, { neu: async () => { await laden(); } });
      } catch (er) { b.disabled = false; toast(er.message, true); }
    });
    const box = document.querySelector('[data-bkxv]');
    box.addEventListener('click', (e) => { const n = e.target.closest('[data-bkxnach]'); if (!n) return; X = nachAnnehmen(X, +n.dataset.bkxnach); box.innerHTML = inhalt(); });
  }

  window.bkExcel = { din, einlesen };
}());
