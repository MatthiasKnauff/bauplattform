'use strict';
/* Adressen einlesen (GO 22.11.2026, Mock „Adressen einlesen“: AE-1 … AE-7 alle A) – Befehlsleiste → Datei → „Einlesen …“.
   Datei (.xlsx/.csv) wählen → der Server liest sie nur (plattform/adressen_einlesen.py) und schickt Zeilen + Vorschlag zurück; hier:
   Zuordnung der Spalten (Knopf je Spalte, pickMenu), Vorschau je Kontakt (☑, schon da → ergänzen · überspringen · doppelt),
   „Einlesen“ legt an bzw. ergänzt – ein Rückgängig für alles; danach „Aufräumen“ mit dem Reiter Gewerk (AE-7). */
(function () {
  const css = document.createElement('style');
  css.textContent = `.ae-sp{display:flex;flex-wrap:wrap;gap:.3rem;margin:.4rem 0 .6rem}.ae-sp button{border:1px solid var(--line);border-radius:calc(8px*var(--rk,1));background:var(--card);color:var(--ink);font:inherit;font-size:.8rem;padding:.2rem .45rem;cursor:pointer;text-align:left;max-width:12rem}
.ae-sp button small{display:block;color:var(--mute);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ae-sp button.leer{opacity:.55}
.ae-l{max-height:min(55vh,32rem);overflow:auto;border:1px solid var(--line);border-radius:calc(8px*var(--rk,1))}
.ae-t{width:100%;border-collapse:collapse;table-layout:fixed;font-size:.86rem}.ae-t th,.ae-t td{padding:.28rem .45rem;border-bottom:1px solid var(--line);text-align:left;vertical-align:top;overflow:hidden;text-overflow:ellipsis}
.ae-t th{position:sticky;top:0;background:var(--card);color:var(--mute);font-weight:600;z-index:1}.ae-t tr.schon{background:color-mix(in srgb,var(--y) 14%,transparent)}.ae-t tr.aus td:not(:first-child){opacity:.45}
.ae-chip{display:inline-block;border:1px solid var(--line);border-radius:999px;padding:0 .4rem;font-size:.75rem;color:var(--mute);margin-left:.25rem}
.ae-akt{border:1px solid var(--line);border-radius:999px;background:var(--card);color:var(--ink);font:inherit;font-size:.78rem;padding:0 .5rem;cursor:pointer}
.ae-sum{color:var(--mute);font-size:.86rem}`;
  document.head.appendChild(css);
  const AKT = { neu: 'neu', ergaenzen: 'ergänzen', ueberspringen: 'überspringen', doppelt: 'doppelt anlegen' };
  let D = null;   // { name, kopf, zeilen, spalten, felder, kontakte, summe }

  function waehlen() {
    const f = document.createElement('input'); f.type = 'file'; f.accept = '.xlsx,.xlsm,.csv,.txt';
    f.addEventListener('change', async () => {
      const d = f.files && f.files[0]; if (!d) return;
      const fd = new FormData(); fd.append('datei', d);
      toast('Datei wird gelesen …');
      try {
        const r = await fetch('api/contacts/einlesen/datei', { method: 'POST', body: fd }), j = await r.json().catch(() => ({ error: 'Unerwartete Antwort vom Server.' }));
        if (!r.ok) throw new Error(j.error || r.statusText);
        D = { ...j, name: d.name }; zeigen();
      } catch (e) { toast(e.message, true); }
    });
    f.click();
  }
  const anzahl = () => { const n = { neu: 0, ergaenzen: 0, ueberspringen: 0, doppelt: 0 }; D.kontakte.forEach((k) => { n[k.aktion] = (n[k.aktion] || 0) + 1; }); return n; };
  function spaltenHtml() {
    return D.kopf.map((k, i) => { const f = D.spalten[i] || '', bsp = (D.zeilen.find((z) => z[i]) || [])[i] || '';
      return `<button type="button" data-aesp="${i}" class="${f ? '' : 'leer'}" title="${esc(k || 'Spalte ' + (i + 1))}: Feld wählen"><b>${esc(D.felder[f])}</b><small>${esc(k || 'Spalte ' + (i + 1))}${bsp ? ' · ' + esc(bsp) : ''}</small></button>`; }).join('');
  }
  function zeileHtml(k, i) {
    const p = k.personen || [], pn = p.map((x) => [x.anrede, x.name].filter(Boolean).join(' ')).filter(Boolean);
    return `<tr class="${k.schon ? 'schon' : ''}${k.aktion === 'ueberspringen' ? ' aus' : ''}"><td><input type="checkbox" data-aeck="${i}"${k.aktion !== 'ueberspringen' ? ' checked' : ''} aria-label="einlesen"></td>
      <td>${k.art === 'bauherr' ? '<span class="mute">Art Bauherr:in</span>' : esc((k.gewerke || []).join(', '))}</td>
      <td><b>${esc(k.name)}</b>${p.length > 1 ? `<span class="ae-chip">${p.length} Personen</span>` : ''}${k.schon ? ` <button type="button" class="ae-akt" data-aeakt="${i}" title="Gibt es schon in den Adressen">schon da: ${esc(AKT[k.aktion])} ▾</button>` : ''}</td>
      <td>${esc(pn.join(', '))}</td><td>${esc([k.zip, k.city].filter(Boolean).join(' '))}</td>
      <td>${(k.projekte || []).map((x) => esc(x.name.split(' ')[0]) + ' 🔗').concat((k.stichworte || []).map(esc)).join(', ')}</td></tr>`;
  }
  function sumText() { const n = anzahl(); return `${n.neu + n.doppelt} Kontakte neu · ${n.ergaenzen} ergänzen · ${n.ueberspringen} überspringen`; }
  let BG = null;
  function zeigen() {
    BG = modalBox(`<div class="mh"><h3 style="margin:0">Adressen einlesen</h3><button type="button" class="x" data-m="x" aria-label="Schließen">✕</button></div>
      <div><p class="mute" style="margin:.4rem 0 0">${esc(D.name)} · ${D.zeilen.length} Zeilen – die Datei wird nur gelesen, nicht gespeichert. Spalte anklicken, um das Feld zu ändern.</p>
      <div class="ae-sp">${spaltenHtml()}</div>
      <div class="ae-l"><table class="ae-t"><colgroup><col style="width:2.2rem"><col style="width:17%"><col style="width:30%"><col style="width:20%"><col style="width:15%"><col style="width:13%"></colgroup>
      <thead><tr><th></th><th>Gewerk</th><th>Firma / Name</th><th>Ansprechpartner</th><th>Ort</th><th>Projekt</th></tr></thead><tbody></tbody></table></div></div>
      <div class="acts" style="margin-top:.8rem;display:flex;gap:.5rem;align-items:center"><span class="ae-sum"></span><span style="flex:1"></span><button type="button" class="btn" data-m="abbrechen">Abbrechen</button><button type="button" class="btn pri" data-m="ok">Einlesen</button></div>`,
    async (m, bg, zu) => {
      if (m === 'x' || m === 'abbrechen') { zu(); BG = null; return; }
      if (m === 'ok') {
        const b = bg.querySelector('[data-m="ok"]'); b.disabled = true;
        try {
          const r = await api('api/contacts/einlesen', 'POST', { kontakte: D.kontakte });
          zu(); BG = null; await load();
          toast(`${r.neu} Kontakte angelegt, ${r.ergaenzt} ergänzt.`);
          rueckgaengig('Adressen eingelesen', async () => { await api('api/contacts/einlesen/zurueck', 'POST', {}); await load(); }, { neu: load });
          if (window.aufraeumen) window.aufraeumen();   // AE-7: gleich die Gewerke vereinheitlichen
        } catch (e) { b.disabled = false; toast(e.message, true); }
      }
    });
    BG.querySelector('.modal').style.width = 'min(1100px, 96vw)';
    liste();
  }
  function liste() { if (!BG) return; BG.querySelector('.ae-t tbody').innerHTML = D.kontakte.map(zeileHtml).join(''); BG.querySelector('.ae-sum').textContent = sumText(); BG.querySelector('.ae-sp').innerHTML = spaltenHtml(); }
  document.addEventListener('click', (e) => {
    if (!BG || !BG.contains(e.target)) return;
    const sp = e.target.closest('[data-aesp]');
    if (sp) {
      const i = +sp.dataset.aesp;
      pickMenu(sp, { items: Object.entries(D.felder).map(([k, t]) => ({ title: t, value: k, on: (D.spalten[i] || '') === k })), onPick: async (v) => {
        D.spalten[i] = v;
        try { const r = await api('api/contacts/einlesen/ordnen', 'POST', { zeilen: D.zeilen, spalten: D.spalten }); D.kontakte = r.kontakte; liste(); } catch (er) { toast(er.message, true); }
      } });
      return;
    }
    const ak = e.target.closest('[data-aeakt]');
    if (ak) { const k = D.kontakte[+ak.dataset.aeakt];
      pickMenu(ak, { items: ['ergaenzen', 'ueberspringen', 'doppelt'].map((a) => ({ title: AKT[a], sub: a === 'ergaenzen' ? 'leere Felder füllen, Personen dazu' : '', value: a, on: k.aktion === a })), onPick: (v) => { k.aktion = v; liste(); } }); }
  });
  document.addEventListener('change', (e) => {
    const c = e.target.closest && e.target.closest('[data-aeck]'); if (!c || !BG) return;
    const k = D.kontakte[+c.dataset.aeck]; k.aktion = c.checked ? (k.schon ? 'ergaenzen' : 'neu') : 'ueberspringen'; liste();
  });
  window.adrEinlesen = waehlen;
})();
