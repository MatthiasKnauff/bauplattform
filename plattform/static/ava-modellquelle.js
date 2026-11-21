/* Ausschreibung (AVA) – Quelle „Bauteile“: die Bauteile des Gebäudemodells neben den Baudaten (GO 21.11.2026, Mock „Gebäudemodell in der
   Kopierquelle“: A1 B1 C2 D3 F1). Server: ava_modellquelle.py.
   Teil der Seite ava.html: die Dateien ava-*.js werden dort in fester Reihenfolge geladen und teilen sich ihre Namen.

   Reiter „Bauteile“ rechts neben „Baudaten“ (lvSplitMount in ava-baum.js): Kostengruppe › Bauteil › Positionen seines Aufbaus, im Aussehen
   des LV-Baums (bpBaum.zelle). Ziehen oder „← Übernehmen“ legt Positionen ins LV; ein ganzes Bauteil bringt alle seine Positionen mit (B1).
   Im LV tragen sie die Kette 🔗 (C2): verknüpft folgen Menge, Text und Preis dem Modell (D3), gelöst gehören sie dem LV.
   Die Linie „Ausschreibung“ der Verknüpfungen geht vor – ist sie fest oder getrennt, folgt nichts, die Kette ist grau.

   MQ.d      Antwort von api/projekt/<pid>/modellquelle  {planstand, linie, bauteile: [{id, name, kgname, menge, einheit, pos: […]}], im}
   MQ.zu     zugeklappte Knoten (bpBaum.klapp)   MQ.sel  gewählte Schlüssel (mod) */
const MQ = { d: null, pid: null, laed: false, fehler: '', sel: new Set(), zu: bpBaum.klapp({ key: 'ava.mq' }), el: null };
const modPos = (x) => !!(x && x.typ === 'pos' && x.mod);
const modLinie = () => (L && L.mod && L.mod.linie) || (MQ.d && MQ.d.linie) || 'lebendig';
const modKette = (x) => { const fest = modLinie() !== 'lebendig', los = !!x.mod_los || fest;   // Zeichen in der LV-Zeile (ava-lv.js)
  return `<i class="lv-mod${los ? ' los' : ''}${x.mod_weg ? ' weg' : ''}" data-modkette title="${fest ? `Linie „Ausschreibung“ ist ${modLinie()} – nichts folgt dem Gebäudemodell (Gebäudemodell → Verknüpfungen)` : x.mod_weg ? 'aus dem Gebäudemodell – das Bauteil oder diese Schicht gibt es dort nicht mehr' : x.mod_los ? 'aus dem Gebäudemodell, gelöst – Klick: wieder verknüpfen' : 'verknüpft mit dem Gebäudemodell: Menge, Text und Preis folgen – Klick: lösen'}">🔗</i>`; };

async function mqLaden(neu) {
  const p = (L && L.project_id) || pid; if (!p) { MQ.d = null; return; }
  if (MQ.laed || (!neu && MQ.d && MQ.pid === p)) return;
  MQ.laed = true; MQ.fehler = '';
  try { MQ.d = await api(`api/projekt/${p}/modellquelle`); MQ.pid = p; } catch (e) { MQ.fehler = e.message; MQ.d = null; }
  MQ.laed = false;
}
/* alle Positionen der Quelle zu einer Auswahl (Bauteil-Kennung „b:<id>“ = alle seine Positionen) – in der Reihenfolge der Quelle */
function mqAuswahl(wahl) {
  const out = []; if (!MQ.d) return out;
  MQ.d.bauteile.forEach((b) => b.pos.forEach((p) => { if (wahl.has('b:' + b.id) || wahl.has(p.mod)) out.push(p); }));
  return out;
}
function mqZeichnen() {
  const el = MQ.el; if (!el || !el.isConnected) return;
  const gm = ((BPHead.conf || {}).apps || []).find((a) => a.key === 'gebaeudemodell'), hin = gm ? `<a class="btn sm" href="${esc(BPHead.appUrl(gm))}/" title="Bauteile und Aufbauten ändern">↗ Gebäudemodell</a>` : '';
  if (MQ.laed && !MQ.d) { el.innerHTML = '<p class="hint" style="padding:1rem">Bauteile werden geladen …</p>'; return; }
  if (MQ.fehler) { el.innerHTML = `<p class="hint" style="padding:1rem">${esc(MQ.fehler)}</p>`; return; }
  const D = MQ.d, B = (D && D.bauteile) || [];
  if (!B.length) { el.innerHTML = `<div class="sr-pad"><p class="hint">Im Gebäudemodell gibt es noch keine Bauteile mit Aufbau, die berechnet werden. Dort die Bauteile beantworten und einen Aufbau wählen – dann stehen sie hier mit ihren Positionen.</p>${hin}</div>`; return; }
  const hier = new Set(items().filter(modPos).map((x) => x.mod)), fest = D.linie !== 'lebendig';
  const T = []; let g = null;
  B.forEach((b) => {
    if (b.kgname !== g) { g = b.kgname; const k = 'g:' + g, n = B.filter((y) => y.kgname === g).length; T.push({ k, t: 0, html: () => `<tr class="ti" data-mqk="${esc(k)}">${bpBaum.zelle({ attr: ' colspan="4"', tiefe: 0, auf: !MQ.zu.zu(k), klapp: k, icon: IC.ti, html: `<b>${esc(g || 'Ohne Kostengruppe')}</b> <span class="hint">${n}</span>` })}</tr>` }); }
    const k = 'b:' + b.id, on = MQ.sel.has(k), sum = b.pos.reduce((a, p) => a + (p.menge || 0) * (p.ep_s || 0), 0);
    T.push({ k, t: 1, html: () => `<tr class="mq-b${on ? ' on' : ''}" draggable="true" data-mq="${esc(k)}" title="Ziehen: alle Positionen dieses Bauteils ins LV">${bpBaum.zelle({ tiefe: 1, auf: !MQ.zu.zu(k), klapp: k, icon: IC.lv, html: `<span>${esc(b.name)}${b.teil ? ` <small class="hint">${esc(b.teil)}</small>` : ''}</span>` })}<td class="r">${nf(b.menge)}</td><td>${esc(b.einheit)}</td><td class="r">${sum ? eur(sum) : ''}</td></tr>` });
    b.pos.forEach((p) => { const im = (D.im[p.mod] || []), da = hier.has(p.mod), an = MQ.sel.has(p.mod) || on;
      T.push({ k: p.mod, t: 2, html: () => `<tr class="mq-p${an ? ' on' : ''}${im.length ? ' mq-im' : ''}" draggable="true" data-mq="${esc(p.mod)}">${bpBaum.zelle({ tiefe: 2, icon: IC.pos, html: `<span>${esc(p.kurz)}${im.length ? ` <small class="mq-in" title="liegt schon in ${esc(im.join(', '))}">${da ? 'in diesem LV' : 'in ' + esc(im.join(', '))}</small>` : ''}</span>` })}<td class="r">${nf(p.menge)}</td><td>${esc(p.einheit || '')}</td><td class="r">${p.ep_s != null ? nf2(p.ep_s) : ''}</td></tr>` }); });
  });
  const S = bpBaum.sicht(T, (x) => (x.t === 2 ? Infinity : x.t), MQ.zu, (x) => x.k), Z = T.filter((x, i) => S[i]);
  const n = mqAuswahl(MQ.sel).length, st = el.querySelector('.qu-l') ? el.querySelector('.qu-l').scrollTop : 0;
  el.innerHTML = `<div class="qu-h"><div class="rr" style="align-items:center"><b>Gebäudemodell</b><span class="hint">${D.planstand ? 'Planstand „' + esc(D.planstand) + '“' : ''}</span><span style="flex:1"></span><button type="button" class="ib" data-mqa="neu" title="Bauteile neu aus dem Gebäudemodell holen">↻</button>${hin}</div>
    ${fest ? `<div class="hint mq-fest">Die Linie „Ausschreibung“ ist <b>${esc(D.linie)}</b> – Positionen lassen sich ablegen, folgen dem Modell aber nicht (Gebäudemodell → Verknüpfungen).</div>` : ''}
    <div class="qu-o"><button type="button" class="btn sm" data-mqa="alle" ${L ? '' : 'disabled'} title="Alle Positionen aller Bauteile, die noch nicht in diesem LV liegen, ans Ende des LV – wie Ziehen, nur für alle">Alle Bauteile ablegen</button>
      <span class="hint" style="flex:1 1 0;text-align:right">${n ? n + ' gewählt' : 'Klick wählt · Strg+Klick dazu/weg · ins LV ziehen'}</span>
      <button type="button" class="btn sm pri" data-mqa="ein" ${n && L ? '' : 'disabled'} title="${LASTI != null ? 'nach der zuletzt bearbeiteten Zeile einfügen' : 'am Ende einfügen'}">← Übernehmen</button></div></div>
    <div class="qu-l"><table class="bp-baum mq-t"><thead><tr><th>Bauteil · Position</th><th class="r">Menge</th><th>EH</th><th class="r">EP</th></tr></thead><tbody>${bpBaum.fenster.html('mq', Z.length, (k) => Z[k].html())}</tbody></table></div>`;
  el.querySelector('.qu-l').scrollTop = st;
}
function mqReiter(el) {   // Reiter „Bauteile“ (seite.js) – einmal anmelden, dann zeichnen
  if (!el._mq) { el._mq = true; el.classList.add('qu', 'mq');
    el.addEventListener('click', (e) => {
      const z = e.target.closest('[data-zu]'); if (z) { MQ.zu.um(z.dataset.zu); return mqZeichnen(); }
      const a = e.target.closest('[data-mqa]');
      if (a && a.dataset.mqa === 'neu') return mqLaden(true).then(mqZeichnen);
      if (a && a.dataset.mqa === 'ein') return mqEinfuegen(mqAuswahl(MQ.sel), LASTI);
      if (a && a.dataset.mqa === 'alle') return mqAlle();
      const r = e.target.closest('tr[data-mq]'); if (!r) return;
      const k = r.dataset.mq; if (e.ctrlKey || e.metaKey) { if (MQ.sel.has(k)) MQ.sel.delete(k); else MQ.sel.add(k); } else MQ.sel = new Set(MQ.sel.size === 1 && MQ.sel.has(k) ? [] : [k]);
      mqZeichnen();
    });
    el.addEventListener('dragstart', (e) => { const r = e.target.closest && e.target.closest('tr[data-mq]'); if (!r) return;
      const k = r.dataset.mq, wahl = MQ.sel.has(k) ? MQ.sel : new Set([k]);
      e.dataTransfer.setData('text/x-ava-modell', JSON.stringify([...wahl])); e.dataTransfer.effectAllowed = 'copy'; });
  }
  MQ.el = el; mqZeichnen();
  if (!MQ.d || MQ.pid !== ((L && L.project_id) || pid)) mqLaden(true).then(mqZeichnen);
}
/* Positionen ins LV legen: jede einzeln verknüpft (Schlüssel mod, Fingerabdruck mod_h vom Server); was schon in diesem LV liegt, kommt nicht doppelt */
async function mqEinfuegen(liste, nach) {
  if (!L || !liste.length) return;
  const hier = new Set(items().filter(modPos).map((x) => x.mod)), neu = liste.filter((p) => !hier.has(p.mod)).map((p) => ({ ...JSON.parse(JSON.stringify(p)), id: uid() }));
  if (!neu.length) return toast('Diese Positionen liegen schon in diesem LV.');
  const I = items(), at = nach === -1 ? 0 : nach != null && nach >= 0 && nach < I.length ? nach + 1 : I.length;
  I.splice(at, 0, ...neu); HIST.next = `${neu.length} Positionen aus dem Gebäudemodell`;
  numerieren(); changed(true);
  toast(`${neu.length === 1 ? '1 Position' : neu.length + ' Positionen'} aus dem Gebäudemodell abgelegt${liste.length > neu.length ? ` (${liste.length - neu.length} lagen schon hier)` : ''} – ↶ Rückgängig nimmt es zurück.`);
  MQ.sel = new Set(); neu.forEach((p) => { (MQ.d.im[p.mod] = MQ.d.im[p.mod] || []).includes('LV ' + L.nr) || MQ.d.im[p.mod].push(('LV ' + (L.nr || '')).trim()); }); mqZeichnen();
  setTimeout(() => { const r = lvTr(at); if (r) { r.scrollIntoView({ block: 'nearest' }); r.classList.add('flash'); setTimeout(() => r.classList.remove('flash'), 1600); } }, 50);
}
async function mqAlle() {   // F1: wie Ziehen, nur für alle – was in irgendeinem LV des Projekts liegt, bleibt dort
  if (!MQ.d || !L) return;
  const P = MQ.d.bauteile.flatMap((b) => b.pos).filter((p) => !(MQ.d.im[p.mod] || []).length);
  if (!P.length) return toast('Alle Positionen der Bauteile liegen schon in einem LV dieses Projekts.');
  if (!(await bpFrage(`${P.length} Positionen aus dem Gebäudemodell ans Ende dieses LV legen?\nWas schon in einem LV des Projekts liegt, bleibt dort.`, { ok: 'Ablegen' }))) return;
  mqEinfuegen(P, null);
}
/* Ziehen aus der Quelle ins LV (wie aus den Baudaten – ava-bearbeiten.js) */
document.addEventListener('dragover', (e) => {
  if (![...(e.dataTransfer.types || [])].includes('text/x-ava-modell')) return;
  const tr = e.target.closest && (e.target.closest('table.lv tr[data-i]') || e.target.closest('table.lv thead tr, table.lv tr.wurzel'));
  document.querySelectorAll('.drop-hier').forEach((r) => r.classList.remove('drop-hier'));
  if (tr || e.target.closest('.pane')) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; if (tr) tr.classList.add('drop-hier'); }
});
document.addEventListener('drop', (e) => {
  const d = e.dataTransfer.getData('text/x-ava-modell'); if (!d) return;
  e.preventDefault(); document.querySelectorAll('.drop-hier').forEach((r) => r.classList.remove('drop-hier'));
  const tr = e.target.closest && e.target.closest('table.lv tr[data-i]'), kopf = !tr && e.target.closest && e.target.closest('table.lv thead tr, table.lv tr.wurzel');
  mqEinfuegen(mqAuswahl(new Set(JSON.parse(d))), tr ? +tr.dataset.i : kopf ? -1 : null);
});

/* ---------- im LV: Herkunft in den Details, Kette lösen / verknüpfen, Abgleich mit dem Modell (D3) ---------- */
function modHerkunft(x) {
  if (!modPos(x)) return '';
  const fest = modLinie() !== 'lebendig', los = !!x.mod_los;
  return `<div class="card tl-hk mod-hk"><b>Herkunft</b> <span class="bph-q-z"><span class="bph-q${los || fest ? ' e' : ''}">${los ? 'gelöst – eigene Position' : '🔗 Gebäudemodell'}</span></span>
    <div class="hint" style="margin:.2rem 0">${esc(String(x.quelle || '').replace(/^Gebäudemodell:\s*/, '') || '–')}</div>
    <span class="seg sm"><button type="button" data-modlos="0" class="${los ? '' : 'on'}"${fest ? ' disabled' : ''}>verknüpft</button><button type="button" data-modlos="1" class="${los ? 'on' : ''}"${fest ? ' disabled' : ''}>gelöst</button></span>
    <p class="hint" style="margin:.3rem 0 0">${fest ? `Die Linie „Ausschreibung“ ist ${esc(modLinie())} – sie geht vor: nichts folgt dem Modell.` : x.mod_weg ? 'Das Bauteil oder diese Schicht gibt es im Gebäudemodell nicht mehr – die Position bleibt stehen, bis du sie löschst oder löst.' : los ? 'Gelöst: Menge, Text und Preis gehören dem LV.' : 'Menge, Text und Preis folgen dem Gebäudemodell. Änderst du sie hier von Hand, fragt das LV bei der nächsten Änderung im Modell nach.'}</p></div>`;
}
async function modLosSetzen(x, los) {
  if (!L || !!x.mod_los === los) return;
  const tun = async (l) => { await flush(); L = await api(`api/lv/${L.id}/modell/los`, 'POST', { pos: x.id, los: l }); render(); };
  try { await tun(los); rueckgaengig(los ? 'Position vom Gebäudemodell gelöst' : 'Wieder mit dem Gebäudemodell verknüpft', () => tun(!los), 10000, () => tun(los)); } catch (er) { toast(er.message, true); }
}
document.addEventListener('click', (e) => {
  const t = e.target; if (!t.closest || !L) return;
  const k = t.closest('[data-modkette]');
  if (k) { const tr = k.closest('tr[data-i]'), x = tr && items()[+tr.dataset.i]; if (modPos(x) && modLinie() === 'lebendig' && !x.mod_weg) modLosSetzen(x, !x.mod_los); return; }
  const lo = t.closest('[data-modlos]'); if (lo) { const x = items().find((y) => y.id === LVAKT); if (modPos(x)) modLosSetzen(x, lo.dataset.modlos === '1'); return; }
  const o = t.closest('[data-modoffen]'); if (o) modAbgleich(o.dataset.modoffen);
});
/* Hinweis über dem LV: das Modell hat sich geändert, aber Positionen sind von Hand geändert oder das LV ist versandt/vergeben (D3) */
function modOffenHtml() {
  const o = L && L.data && L.data.mod_offen; if (!o || !(o.ids || []).length) return '';
  const n = o.ids.length;
  return `<div class="hint tl-offen"><span>Das Gebäudemodell hat sich geändert – ${n === 1 ? '1 Position wurde' : n + ' Positionen wurden'} nicht von selbst angepasst (<b>${esc(o.grund || 'von Hand geändert')}</b>).</span>
    <button type="button" class="btn sm" data-modoffen="uebernehmen" title="Menge, Text und Preis aus dem Gebäudemodell übernehmen">Übernehmen</button><button type="button" class="btn sm" data-modoffen="spaeter">Später</button></div>`;
}
async function modAbgleich(aktion) {
  if (!L) return;
  try { await flush(); const id = L.id, r = await api(`api/lv/${id}/modell/abgleich`, 'POST', aktion ? { aktion } : {}); if (!L || L.id !== id) return;
    const st = r.mod_stat; L = r; L._mq = true; render();
    if (st && (st.auto || st.offen || st.weg)) toast([st.auto ? `${st.auto} Position${st.auto === 1 ? '' : 'en'} dem Gebäudemodell nachgeführt` : '', st.offen ? `${st.offen} warten auf deine Entscheidung` : '', st.weg ? `${st.weg} gibt es im Modell nicht mehr` : ''].filter(Boolean).join(' · '));
    if (MQ.d) mqLaden(true).then(mqZeichnen);
  } catch (er) { toast(er.message, true); }
}
/* beim Öffnen eines LV (lvSplitMount): hat sich das Modell seit dem letzten Abgleich geändert, einmal nachführen – sonst keine Anfrage */
function modPruefen() { if (L && L.mod && L.mod.alt && !L._mq) { L._mq = true; modAbgleich(''); } }
