/* Anweisung an das Gebäudemodell – Baustein (GO 16.11.2026, Entwurf „Gebäudemodell wie alle Apps + Elemente und Anweisungen“).
   Ein Satz („Alle Wohnräume im EG außer Nassräume Mosaikparkett, im OG Teppich, im Keller Fliesen“) → Kern bpcore/anweisung.py:
   verstehen (KI im Büro, ohne KI eine einfache Regel) → Vorschau je Schritt (wie viele Räume/Elemente, Treffer im Katalog der Bauplattform)
   → bei Rückfrage Eintrag wählen, „als eigene Leistung“ oder Schritt weglassen → „Anwenden“ (ein Schritt Rückgängig).

   bpAnweisung.dialog(pid, { nachher(d) })   d = Antwort des Kerns mit dem Modell ({modell, rev}) */
(function () {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sag = (t, f) => { if (window.toast) window.toast(t, f); };
  async function J(u, m, b) {
    const r = await fetch(u, { method: m || 'GET', credentials: 'same-origin', headers: b ? { 'Content-Type': 'application/json' } : {}, body: b ? JSON.stringify(b) : undefined });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'Der Server ist gerade nicht erreichbar.');
    return j;
  }
  const BEISPIEL = ['Füge zu allen nicht bodentiefen Fenstern Fensterbänke aus Quarzkomposit hinzu', 'Alle Wohnräume im EG außer Nassräume Mosaikparkett, im OG Teppich, im Keller Fliesen'];
  const STIL = `.aw{width:min(760px,100%);display:flex;flex-direction:column;gap:.6rem;padding:1rem 1.1rem;max-height:86vh;overflow:auto;font-size:.9rem}.aw h3{margin:0;font-size:1.05rem}
.aw textarea{font:inherit;width:100%;box-sizing:border-box;min-height:4.5rem;padding:.45rem .55rem}.aw .aw-b{display:flex;flex-wrap:wrap;gap:.3rem}.aw .aw-b button{font:inherit;font-size:.8rem;border:1px dashed var(--line,#d5d9de);background:none;color:inherit;border-radius:calc(99px*var(--rkp,1));padding:.1rem .6rem;cursor:pointer;text-align:left}
.aw .aw-s{border-left:3px solid var(--y,#2f6fb3);padding:.3rem .6rem;display:flex;flex-direction:column;gap:.25rem}.aw .aw-s.rf{border-left-color:var(--red,#c62f2a)}.aw .aw-s.weg{opacity:.5}
.aw .aw-k{display:flex;flex-wrap:wrap;gap:.3rem}.aw .aw-k button{font:inherit;font-size:.8rem;border:1px solid var(--line,#d5d9de);background:none;color:inherit;border-radius:calc(6px*var(--rk,1));padding:.15rem .5rem;cursor:pointer;text-align:left}
.aw .aw-k button.on{border-color:var(--y,#2f6fb3);box-shadow:inset 0 0 0 1px var(--y,#2f6fb3)}.aw .aw-m{font-size:.8rem;opacity:.75}.aw .aw-ft{display:flex;gap:.5rem;justify-content:flex-end;flex-wrap:wrap}`;
  const stil = () => { if (document.getElementById('aw-stil')) return; const s = document.createElement('style'); s.id = 'aw-stil'; s.textContent = STIL; document.head.appendChild(s); };

  function dialog(pid, opt = {}) {
    stil();
    const basis = `api/bp/modell/${pid}/anweisung`;
    let text = '', S = null, ki = '', laeuft = false, fehler = '';
    const fertig = () => S && S.some((s) => !s.weg) && S.every((s) => s.weg || s.treffer);
    const schritt = (s, i) => {
      const k = s.rueckfrage ? s.rueckfrage.kandidaten || [] : [];
      return `<div class="aw-s${s.treffer || s.weg ? '' : ' rf'}${s.weg ? ' weg' : ''}"><div><b>${esc(s.beschreibung)}</b> → <i>${esc(s.material || '…')}</i></div>
        <div class="aw-m">${s.anzahl} ${esc(s.einheit)}${s.bleiben ? ` · ${s.bleiben} davon bleiben (Antwort „bleibt“/offen) und werden nicht geändert` : ''}${s.anzahl ? '' : ' – nichts gefunden, bitte Geschoss oder Art prüfen'}</div>
        ${s.weg ? `<div class="aw-k"><button type="button" data-m="wieder:${i}">wieder aufnehmen</button></div>`
          : s.treffer ? `<div>Katalog: <b>${esc(s.treffer.eigen ? 'als eigene Leistung (ohne Katalog, Preis in den Kosten)' : s.treffer.name)}</b></div>${s.rueckfrage ? `<div class="aw-k"><button type="button" data-m="anders:${i}">anders wählen</button></div>` : ''}`
            : `<div>${esc(s.rueckfrage.text)}</div><div class="aw-k">${k.map((x, j) => `<button type="button" data-m="k:${i}:${j}" title="${esc(x.vorlage)}">${esc(x.name)}</button>`).join('')}
              <button type="button" data-m="eigen:${i}">als eigene Leistung anlegen</button><button type="button" data-m="weg:${i}">Schritt weglassen</button></div>`}</div>`;
    };
    const html = () => `<div class="aw"><h3>Anweisung an das Modell</h3>
      ${S ? `<div class="aw-m">${ki ? `Verstanden von der KI (${esc(ki === 'ollama' ? 'im Büro' : ki + ', anonymisiert')})` : 'Ohne KI verstanden (einfache Regel)'} – bitte prüfen: „${esc(text)}“</div>${S.map(schritt).join('')}`
        : `<textarea data-awt placeholder="z. B. ${esc(BEISPIEL[1])}">${esc(text)}</textarea><div class="aw-b">${BEISPIEL.map((b, i) => `<button type="button" data-m="bsp:${i}">${esc(b)}</button>`).join('')}</div>
          <div class="aw-m">Nur Einträge aus dem Katalog der Bauplattform. Was nicht drin steht, fragt der Dialog nach – nichts wird erfunden. Erst die Vorschau, dann „Anwenden“; Rückgängig wie überall.</div>`}
      <div class="aw-m" data-awf>${esc(fehler)}</div>
      <div class="aw-ft"><button type="button" class="btn" data-m="abbrechen">Abbrechen</button>${S ? '<button type="button" class="btn" data-m="aendern">Ändern</button>' : ''}
        ${S ? `<button type="button" class="btn primary" data-m="ok"${fertig() ? '' : ' disabled'}>Anwenden</button>` : `<button type="button" class="btn primary" data-m="verstehen"${laeuft ? ' disabled' : ''}>${laeuft ? 'wird verstanden …' : 'Vorschau'}</button>`}</div></div>`;
    modalBox(html(), async (m, bg, close) => {
      const box = bg.querySelector('.modal'), neu = () => { box.innerHTML = html(); const t = box.querySelector('[data-awt]'); if (t) t.focus(); };
      const t = box.querySelector('[data-awt]'); if (t) text = t.value.trim();
      if (m === 'abbrechen') return close();
      if (m.startsWith('bsp:')) { text = BEISPIEL[+m.slice(4)]; return neu(); }
      if (m === 'aendern') { S = null; fehler = ''; return neu(); }
      if (m === 'verstehen') {
        if (!text) { fehler = 'Bitte eine Anweisung eingeben.'; return neu(); }
        laeuft = true; fehler = ''; neu();
        const tm = setTimeout(() => { const f = box.querySelector('[data-awf]'); if (f) f.textContent = 'Die KI liest die Anweisung … (höchstens 20 Sekunden, sonst ohne KI)'; }, 1500);
        try { const d = await J(`${basis}/verstehen`, 'POST', { text }); S = d.schritte; ki = d.ki || ''; } catch (e) { fehler = e.message; }
        clearTimeout(tm); laeuft = false; return neu();
      }
      const [w, a, b] = m.split(':'), s = S && S[+a];
      if (w === 'k' && s) { s.treffer = { ...s.rueckfrage.kandidaten[+b] }; return neu(); }
      if (w === 'eigen' && s) { s.treffer = { eigen: true, name: s.material }; return neu(); }
      if (w === 'anders' && s) { delete s.treffer; return neu(); }
      if (w === 'weg' && s) { s.weg = true; return neu(); }
      if (w === 'wieder' && s) { s.weg = false; return neu(); }
      if (m === 'ok' && fertig()) {
        const ok = box.querySelector('[data-m="ok"]'); ok.disabled = true;
        try {
          const d = await J(`${basis}/anwenden`, 'POST', { text, schritte: S.filter((x) => !x.weg) });
          close(); if (opt.nachher) opt.nachher(d);
          sag('Anweisung angewendet – die Zeilen sind aufgeteilt.');
          if (window.rueckgaengig) rueckgaengig(`Anweisung „${text.slice(0, 40)}“`, async () => { const r = await J(`${basis}/${d.id}`, 'DELETE'); if (opt.nachher) opt.nachher(r); });
        } catch (e) { ok.disabled = false; fehler = e.message; neu(); }
      }
    });
  }
  window.bpAnweisung = { dialog };
}());
