/* KI-Gespräch „Fragen“ zum Projekt – ein Baustein für Gebäudemodell, Kosten und Bauzeitenplan (GO 16.11.2026, „Gebäudemodell als Mitte“).
   Es fragt nur die KI im Büro (Ollama) mit den eigenen Daten (Kern bpcore/ki_fragen.py). Findet sie keinen Preis und hat die Verwaltung
   die Zusatzrecherche eingeschaltet, bietet der Reiter „im Netz nachfragen“ an – erst nach einer Warnung, denn dann geht die Frage
   (anonymisiert) an eine externe KI.
   bpFragen.mount(el, pid, { aendern }) – Reiter „Fragen und Antworten“ (seite.js); im Gebäudemodell eine eigene Ansicht mit aendern: true –
   dort erkennt der Baustein Änderungssätze („tausche AW KS WDVS in PP“, „Parkett in allen Wohnräumen“), zeigt eine Vorschau und führt sie erst
   nach „Ausführen“ aus (Kern bpcore/fragen_aenderung.py, Protokoll im audit_log). */
(function () {
  if (window.bpFragen) return;
  const esc = window.bpEsc;
  const sag = (t, f) => { if (window.toast) window.toast(t, f); };
  const KSN = { aus: 'ohne KI', buero: 'KI im Büro', extern: 'externe KI' };
  const AENDERN = /(?:^|\s)(tausch|ersetz|änder|aender|hinzu|ergänz|füg|entfern|lösch|setz)|\bin allen\b|^alle\b|\bstatt\b/i;   // wie bpcore/fragen_aenderung.py
  const FRAGE = /^(was|wie|wann|wo|wer|warum|welche\w*|gibt es|kostet|ist|sind|kann|hat)\b|\?\s*$/i;
  const STIL = `.kf{display:flex;flex-direction:column;gap:.6rem;padding:.8rem .9rem 1rem;font-size:.9rem}
.kf-v{display:flex;flex-direction:column;gap:.55rem}.kf-f{align-self:flex-end;max-width:85%;background:var(--hov,rgba(47,111,179,.1));border-radius:calc(10px*var(--rk,1));padding:.4rem .65rem}
.kf-a{border:1px solid var(--line,#d5d9de);border-radius:calc(10px*var(--rk,1));padding:.5rem .7rem;white-space:pre-wrap;line-height:1.45}.kf-a.ext{border-style:dashed}
.kf-q{display:flex;flex-wrap:wrap;gap:.25rem;margin-top:.35rem}.kf-q span{font-size:.74rem;border:1px solid var(--line,#d5d9de);border-radius:1em;padding:0 .5em;opacity:.8}
.kf-h{font-size:.85rem;border-left:3px solid var(--warn,#c99a06);padding:.3rem .6rem}.kf-e{display:flex;gap:.4rem;align-items:flex-end}
.kf-e textarea{flex:1;min-width:0;font:inherit;min-height:2.6rem;max-height:9rem;resize:vertical;padding:.35rem .5rem;border:1px solid var(--line,#d5d9de);border-radius:calc(6px*var(--rk,1));background:var(--card,#fff);color:inherit}
.kf-w{font-size:.8rem;opacity:.7}.kf-leer{font-size:.86rem;opacity:.75;line-height:1.5}`;
  const VERLAUF = {};   // je Projekt, nur in dieser Sitzung (nichts wird gespeichert)

  function mount(el, pid, opt = {}) {   // opt.aendern: Änderungssätze ausführen (nur im Gebäudemodell, FA-B2)
    if (!document.getElementById('kf-stil')) { const s = document.createElement('style'); s.id = 'kf-stil'; s.textContent = STIL; document.head.appendChild(s); }
    const V = (VERLAUF[pid] ||= []);
    let laeuft = false;
    const aenderHtml = (x, i) => {
      const A = x.aend;
      if (A.fehler) return `<div class="kf-h">${esc(A.fehler)}</div>`;
      if (A.erledigt) return `<div class="kf-a">✓ ausgeführt – ${esc(A.erledigt)}<div class="kf-q"><span>steht im Protokoll (Satz, ${esc(KSN[A.stufe] || A.stufe)}, wer, was vorher → nachher)</span></div></div>`;
      if (A.rueckfrage) return `<div class="kf-a"><b>${esc(A.rueckfrage)}</b>${A.optionen.map((o, k) => `<div><button type="button" class="btn sm" data-kfopt="${i}|${k}">${esc(o.text)}</button></div>`).join('')}</div>`;
      const knoepfe = `<div><button type="button" class="btn sm primary" data-kfaus="${i}">Ausführen</button> <button type="button" class="btn sm" data-kfab="${i}">Abbrechen</button></div>`;
      if (A.art === 'kuerzel') return `<div class="kf-a"><b>Änderung am Gebäudemodell</b> – so verstanden:<div class="kf-q"><span>${A.zeilen.length} Bauteil${A.zeilen.length === 1 ? '' : 'e'} mit „${esc(A.alt)}“ → „${esc(A.neu)}“ (${esc(A.verstanden || '')})</span><span>neuer Aufbau aus dem Katalog: ${esc(A.vorlage_name)}${A.dicke ? ' · ' + esc(A.dicke) : ''}</span>${A.zeilen.slice(0, 6).map((z) => `<span>${esc(z.name)} · ${esc(String(z.menge).replace('.', ','))} ${esc(z.einheit)}${z.vorher ? ' · bisher ' + esc(z.vorher) : ''}</span>`).join('')}</div><small>Nichts ist geändert, bis du ausführst · ${esc(KSN[A.stufe] || '')}</small>${knoepfe}</div>`;
      const offen = (A.schritte || []).some((v) => !v.treffer);
      return `<div class="kf-a"><b>Änderung am Gebäudemodell</b> – so verstanden:<div class="kf-q">${(A.schritte || []).map((v) => `<span>${esc(v.beschreibung)} · ${v.anzahl} ${esc(v.einheit)} → ${v.treffer ? esc(v.treffer.name) : '<b>' + esc((v.rueckfrage || {}).text || 'kein Treffer im Katalog') + '</b>'}</span>`).join('')}</div>
        <small>Nichts ist geändert, bis du ausführst · ${esc(KSN[A.stufe] || '')}</small>${offen ? '<div class="kf-w">Nicht alles ist eindeutig – bitte genauer formulieren oder unter „Anweisung …“ den Katalogeintrag wählen.</div>' : knoepfe}</div>`;
    };
    const antwortHtml = (x, i) => {
      if (x.aend) return x.wartet ? '<div class="kf-a kf-w">Einen Moment …</div>' : aenderHtml(x, i);
      if (x.hinweis) return `<div class="kf-h">${esc(x.hinweis)}</div>`;
      if (x.fehler) return `<div class="kf-h">${esc(x.fehler)}</div>`;
      if (!x.antwort && x.wartet) return '<div class="kf-a kf-w">Einen Moment …</div>';
      return `<div class="kf-a${x.extern ? ' ext' : ''}">${esc(x.antwort)}<div class="kf-q">${(x.quellen || []).map((q) => `<span>${esc(q.text)}</span>`).join('')}</div></div>
        ${x.kein_preis ? (x.zusatz ? `<div><button type="button" class="btn sm" data-kfnetz="${i}" title="Die Frage geht anonymisiert an eine externe KI – kostenpflichtig, Antwort ungeprüft">Im Netz nachfragen …</button></div>`
          : '<div class="kf-w">Kein Preis in den eigenen Daten. Die externe KI als Ergänzung ist in der Verwaltung ausgeschaltet.</div>') : ''}`;
    };
    function zeichne() {
      el.innerHTML = `<div class="kf"><div class="kf-v">${V.length ? V.map((x, i) => `<div class="kf-f">${esc(x.frage)}${x.extern ? ' <small>(im Netz)</small>' : ''}</div>${antwortHtml(x, i)}`).join('')
        : '<p class="kf-leer">Frag zum Projekt – zum Beispiel „Was kostet der Fenstertausch?“ oder „Wann ist der Rohbau fertig?“. Es antwortet die KI im Büro, nur aus unseren Daten: Gebäudemodell, Bauteile, Kosten, Bauphasen, eigene Angebote und die Preisdatenbank.</p>'}</div>
        <div class="kf-e"><textarea data-kft placeholder="Frage zum Projekt …" aria-label="Frage zum Projekt"></textarea><button type="button" class="btn primary" data-kfok>Fragen</button></div><div class="kf-ks"></div></div>`;
      schieber();
      const v = el.querySelector('.kf-v'); if (v.lastElementChild) v.lastElementChild.scrollIntoView({ block: 'nearest' });
    }
    /* KI-Schieber (KS, 18.11.2026): ohne KI · KI im Büro · externe KI – Obergrenze aus Verwaltung und Projekt (bp/kischieber.js) */
    let KS = null, extOk = false;
    async function schieber() {
      const box = el.querySelector('.kf-ks'); if (!box) return;
      KS = await bpKiSchieber(box, 'fragen', { pid });
    }
    async function senden(frage, extern) {
      if (laeuft || !String(frage || '').trim()) return;
      const st = extern ? 'extern' : KS ? KS.wert() : 'buero';
      if (st === 'extern' && !extOk) {   // C1: einmal je Gespräch der Hinweis, dann nicht mehr
        if (!(window.bpFrage && await bpFrage('Externe KI fragen?\n\nDie Frage geht mit den Projektdaten anonymisiert hinaus (Namen, Adressen, Kontaktdaten werden ersetzt). Das kostet je Anfrage und steht im Datenschutz-Protokoll; die Antwort ist nicht geprüft.', { ok: 'Extern fragen' }))) return;
        extOk = true;
      }
      extern = st === 'extern'; laeuft = true;
      if (opt.aendern && AENDERN.test(String(frage)) && !FRAGE.test(String(frage).trim())) return aendern(String(frage).trim(), st);
      const x = { frage: String(frage).trim(), wartet: true, extern }; V.push(x); zeichne();
      try {
        const r = await fetch(`api/bp/modell/${pid}/fragen`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ frage: x.frage, extern: !!extern, ki: st }) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) x.fehler = j.error || 'Der Server ist gerade nicht erreichbar.'; else Object.assign(x, j);
      } catch (e) { x.fehler = e.message; }
      x.wartet = false; laeuft = false; zeichne();
    }
    async function aendern(text, st, x0) {   // Änderungssatz → Vorschau (FA-A1)
      const x = x0 || { frage: text, wartet: true, aend: {} }; if (!x0) V.push(x); x.wartet = true; zeichne();
      try {
        const r = await fetch(`api/bp/modell/${pid}/aendern/verstehen`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, ki: st }) });
        const j = await r.json().catch(() => ({})); x.aend = r.ok ? { ...j, text } : { fehler: j.error || 'Der Server ist gerade nicht erreichbar.' };
      } catch (e) { x.aend = { fehler: e.message }; }
      x.wartet = false; laeuft = false; zeichne();
    }
    el.onclick = async (e) => {
      const op = e.target.closest('[data-kfopt]');
      if (op) { const [i, k] = op.dataset.kfopt.split('|').map(Number), x = V[i], o = x.aend.optionen[k]; laeuft = true; return aendern(`tausche ${x.aend.alt} in ${o.neu}`, KS ? KS.wert() : 'buero', x); }
      const ab = e.target.closest('[data-kfab]'); if (ab) { V[+ab.dataset.kfab].aend = { fehler: 'Abgebrochen – nichts geändert.' }; return zeichne(); }
      const au = e.target.closest('[data-kfaus]');
      if (au) {
        const x = V[+au.dataset.kfaus], A = x.aend; au.disabled = true;
        const b = A.art === 'kuerzel' ? { art: 'kuerzel', text: A.text, stufe: A.stufe, ids: A.zeilen.map((z) => z.id), vorlage: A.vorlage, wahl: A.wahl, alt: A.alt, neu: A.neu }
          : { art: 'anweisung', text: A.text, stufe: A.stufe, ki: A.ki || '', schritte: A.schritte };
        try {
          const r = await fetch(`api/bp/modell/${pid}/aendern/ausfuehren`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
          const j = await r.json().catch(() => ({}));
          x.aend = r.ok ? { erledigt: A.art === 'kuerzel' ? `${j.n} Bauteil${j.n === 1 ? '' : 'e'} mit neuem Aufbau` : 'Anweisung im Gebäudemodell (unter „Anweisungen“ zurücknehmbar)', stufe: A.stufe } : { fehler: j.error || 'Nicht ausgeführt.' };
          if (r.ok) window.dispatchEvent(new CustomEvent('bp:modellGeaendert', { detail: { pid } }));
        } catch (e2) { x.aend = { fehler: e2.message }; }
        return zeichne();
      }
      if (e.target.closest('[data-kfok]')) return senden(el.querySelector('[data-kft]').value);
      const n = e.target.closest('[data-kfnetz]');
      if (n) {
        const x = V[+n.dataset.kfnetz];
        senden(x.frage, true);
      }
    };
    el.onkeydown = (e) => { if (e.target.matches('[data-kft]') && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); senden(e.target.value); } };
    zeichne();
  }
  window.bpFragen = { mount };
}());
