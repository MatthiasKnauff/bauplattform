/* Kataloge der Baudaten und der Ausschreibung verwalten – ein Baustein für beide Apps (Einstellungen → Kataloge).
   Braucht aus bp.js: api, esc, toast, bpEingabe, bpFrage. o.bd / o.ava: Pfad zur jeweiligen App (leer = diese). */
/* Einstellungen → Kataloge: alle Kataloge anzeigen, ein-/ausblenden, hinzufügen (sirAdos *.ava, GAEB, LV), umbenennen, löschen */
const KAT_ART = { katalog: 'Bauplattform', eigen: 'eigene Positionen', import: 'GAEB / LV', avakatalog: 'sirAdos / Ausschreibung' };
window.KatalogeEinst = async function katalogeEinst(host, o = {}) {
  o = { bd: '', ava: '../ava/', gaeb: null, nachher: async () => {}, ...o };
  let S; try { S = await api(o.bd + 'api/start?katalog=gk3'); } catch (e) { host.innerHTML = `<p class="bph-mu">${esc(e.message)}</p>`; return; }
  const LSA = { get: () => { try { return JSON.parse(localStorage.getItem('bd.ausgeblendet') || '[]'); } catch { return []; } }, set: (v) => { try { localStorage.setItem('bd.ausgeblendet', JSON.stringify(v)); } catch { /* egal */ } } };
  const aus = new Set(LSA.get());
  const mb = (k) => k.art === 'import' || k.art === 'avakatalog';
  host.innerHTML = `<p class="bph-mu">Alle Kataloge der Baudaten. Ausgeblendete erscheinen nicht in der Auswahl oben (gilt für diesen Browser). sirAdos-Kataloge (*.ava) stehen auch in der Ausschreibung als Kopierquelle zur Verfügung.</p>
    ${S.kataloge.map((k) => `<div style="border:1px solid var(--line);border-radius:10px;padding:.6rem .8rem;margin:.45rem 0;display:flex;gap:.6rem;align-items:center;flex-wrap:wrap">
      <label style="display:flex;gap:.4rem;align-items:center;margin:0" title="In der Katalogauswahl anzeigen"><input type="checkbox" data-kzeig="${esc(k.key)}"${aus.has(k.key) ? '' : ' checked'} style="width:auto"></label>
      <div style="flex:1;min-width:13rem"><b>${esc(k.name)}</b><br><span class="bph-mu" style="margin:0">${esc(KAT_ART[k.art] || k.art)} · ${k.n.toLocaleString('de-DE')} ${k.key === 'gk3e' ? 'Elemente' : 'Positionen'}${k.preisstand ? ' · Preisstand ' + esc(k.preisstand) : ''}${k.index_basis && k.key !== 'gk3' ? ' · Index ' + String(k.index_basis).replace('.', ',') : ''}${k.lizenz ? ' · ' + esc(k.lizenz) : ''}</span></div>
      ${S.admin && mb(k) ? `<button type="button" class="bph-btn" data-kren="${esc(k.key)}">Umbenennen</button><button type="button" class="bph-btn" data-kweg="${esc(k.key)}">Löschen</button>` : ''}</div>`).join('')}
    ${S.admin ? `<div class="bph-row" style="gap:.5rem;flex-wrap:wrap;margin-top:.7rem;align-items:center">
      <label class="bph-btn pri" style="cursor:pointer">＋ sirAdos-Katalog (*.ava) …<input type="file" id="kAva" accept=".ava,.mdb,.accdb" hidden></label>
      ${o.gaeb ? '<button type="button" class="bph-btn" data-kgaeb>＋ GAEB-Datei oder LV …</button>' : ''}<span class="bph-mu" id="kMsg" style="margin:0"></span></div>
      <p class="bph-mu">sirAdos Positionen oder Elemente: dieselbe Datei noch einmal einlesen ersetzt den Katalog (neuer Preisstand). Die Kataloge bleiben nur in der Datenbank des Büros – bitte die Lizenz des Anbieters beachten.</p>` : '<p class="bph-mu">Kataloge hinzufügen und löschen kann die Verwaltung.</p>'}
    <h4 style="margin:1.1rem 0 .3rem">Bauteilkatalog für Allplan</h4>
    <p class="bph-mu">Die gängigen Bauteil-Aufbauten als fünf Allplan-Kundenkataloge nach Bauteilart (Wände, Decken/Böden, Dächer, Öffnungen, Weitere – je etwa 300 Einträge, Format wie der Elementkatalog NEM_ELE). In Allplan unter Material/Qualität wählbar; der Code am Anfang geht mit dem IFC-Export zurück, und die Baukosten übernehmen dann genau diesen Aufbau mit Preis. Anleitung im ZIP.</p>
    <a class="bph-btn" href="${o.bd}api/allplan-katalog.zip" download>⤓ Kataloge für Allplan (ZIP)</a>`;
  const neu = async () => { await o.nachher(); katalogeEinst(host, o); };
  host.onchange = (e) => {
    const z = e.target.closest('[data-kzeig]'); if (!z) return;
    const a = new Set(LSA.get()); if (z.checked) a.delete(z.dataset.kzeig); else a.add(z.dataset.kzeig); LSA.set([...a]); o.nachher();
  };
  host.onclick = async (e) => {
    const r = e.target.closest('[data-kren]'), w = e.target.closest('[data-kweg]');
    if (e.target.closest('[data-kgaeb]')) { if (o.gaeb) o.gaeb(); return; }
    const k = S.kataloge.find((x) => x.key === (r || w || {}).dataset?.[r ? 'kren' : 'kweg']); if (!k) return;
    const ava = k.art === 'avakatalog' ? k.key.replace(/^ava/, '') : null;
    try {
      if (r) {
        const n = await bpEingabe('Name des Katalogs', k.name); if (!n || !n.trim()) return;
        if (ava) await api(`${o.ava}api/katalog/${ava}`, 'PUT', { name: n.trim() }); else await api(o.bd + 'api/katalog/' + encodeURIComponent(k.key), 'PUT', { name: n.trim() });
      } else {
        if (!(await bpFrage(`Katalog „${k.name}“ mit ${k.n.toLocaleString('de-DE')} Positionen löschen? Bereits übernommene Positionen in LVs und Baukosten bleiben.`))) return;
        if (ava) await api(`${o.ava}api/katalog/${ava}`, 'DELETE'); else await api(o.bd + 'api/katalog/' + encodeURIComponent(k.key), 'DELETE');
        if (o.geloescht) o.geloescht(k.key);
      }
      await neu(); toast(r ? 'Umbenannt' : 'Gelöscht');
    } catch (er) { toast(er.message, true); }
  };
  const inp = host.querySelector('#kAva');
  if (inp) inp.onchange = async () => {   // wie in der Ausschreibung: gepackt und in Teilen unter 1 MB an die Ausschreibung (gleiche Datenbank)
    const f = inp.files[0]; if (!f) return; const m = host.querySelector('#kMsg'); m.textContent = `Packe „${f.name}“ (${Math.round(f.size / 1048576)} MB) …`;
    try {
      const gz = new Uint8Array(await new Response(f.stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
      const T = 900 * 1024, n = Math.max(1, Math.ceil(gz.length / T)), id = [...crypto.getRandomValues(new Uint8Array(8))].map((b) => b.toString(16).padStart(2, '0')).join('');
      let j = null;
      for (let i = 0; i < n; i++) {
        m.textContent = i < n - 1 ? `Lade hoch … ${Math.round(i / n * 100)} %` : 'Lese den Katalog ein … (bis zu einer halben Minute)';
        const rr = await fetch(`${o.ava}api/katalog/teil?id=${id}&i=${i}&n=${n}&name=${encodeURIComponent(f.name)}`, { method: 'POST', body: gz.subarray(i * T, (i + 1) * T), headers: { 'Content-Type': 'application/octet-stream' }, credentials: 'same-origin' });
        const txt = await rr.text(); try { j = JSON.parse(txt); } catch { throw new Error(`Der Server hat den Teil ${i + 1} von ${n} abgelehnt (${rr.status}).`); }
        if (!rr.ok) throw new Error(j.error || 'Fehler ' + rr.status);
      }
      const x = (j.kataloge || []).find((y) => y.id === j.neu);
      toast(x ? `„${x.name}“ eingelesen: ${(x.n_pos || 0).toLocaleString('de-DE')} ${x.art === 'elemente' ? 'Elemente' : 'Positionen'}.` : 'Katalog eingelesen.');
      await neu();
    } catch (er) { m.textContent = er.message; }
  };
};
