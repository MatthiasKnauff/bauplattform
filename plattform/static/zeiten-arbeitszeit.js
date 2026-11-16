'use strict';
/* Zeiten – Arbeitszeit je Wochentag (entschieden am 16.11.2026, Entwurf „Zeiten: Kommen/Gehen nach Arbeitszeit“).
   Vorgabe des Büros (Einstellungen, Verwaltung), je Person abweichend (Mein Konto im Monat bzw. Mitarbeiter:innen in den Einstellungen).
   Daraus kommen Kommen/Gehen ohne Eintrag (grau, zählt erst mit Bestätigen oder sobald am Tag gearbeitet wurde) und die Pause des Tages.
   Server: bpcore/zeiten.py (arbeitszeit_norm, arbeitszeit_buero, arbeitszeit), plattform/zeiten.py (zeit_einst, meine_arbeitszeit, person). */
const AZ_WT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const azJ = (v) => { if (!v) return {}; if (typeof v === 'object') return v; try { return JSON.parse(v) || {}; } catch { return {}; } };
function azZeile(x) { return x ? `${x.von}–${x.bis}${x.pd ? ` (Pause ${x.pb}, ${x.pd} min)` : ''}` : ''; }
function azText(A) {   // „Mo–Do 08:00–16:30 (Pause 13:00, 30 min) · Fr 08:00–14:00“
  const T = [];
  for (let i = 0; i < 7; i++) {
    const z = azZeile(A[i]); if (!z) continue;
    const L = T[T.length - 1];
    if (L && L.z === z && L.bis === i - 1) L.bis = i; else T.push({ von: i, bis: i, z });
  }
  return T.length ? T.map((t) => `${AZ_WT[t.von]}${t.bis > t.von ? (t.bis - t.von > 1 ? '–' : ', ') + AZ_WT[t.bis] : ''} ${t.z}`).join(' · ') : 'keine';
}
/* Fenster: je Wochentag „arbeitet“, von, bis, Pause ab, Dauer. speichern(A | '') – '' = wie das Büro */
function azDialog({ titel, hinweis, A, wieBuero, speichern }) {
  const z = (i) => { const x = A[i] || {}, an = !!A[i]; return `<tr data-azi="${i}"><td><label style="display:flex;gap:.35rem;align-items:center"><input type="checkbox" data-azan${an ? ' checked' : ''}> ${AZ_WT[i]}</label></td>
    ${[['von', x.von || '08:00'], ['bis', x.bis || '16:30'], ['pb', x.pb || '']].map(([k, v]) => `<td><input class="hm" data-az="${k}" value="${esc(v)}" placeholder="${k === 'pb' ? 'keine' : 'hh:mm'}" inputmode="numeric" maxlength="5" style="width:4.6rem"${an ? '' : ' disabled'} aria-label="${AZ_WT[i]} ${{ von: 'von', bis: 'bis', pb: 'Pause ab' }[k]}"></td>`).join('')}
    <td><input type="number" data-az="pd" value="${x.pd || ''}" min="0" max="180" step="5" placeholder="0" style="width:4.2rem"${an ? '' : ' disabled'} aria-label="${AZ_WT[i]} Pause Minuten"></td></tr>`; };
  modalBox(`<h3>${esc(titel)}</h3>
    <div>${hinweis ? `<p class="hinw" style="margin:0 0 .5rem">${hinweis}</p>` : ''}<table class="t"><thead><tr><th>Tag</th><th>von</th><th>bis</th><th>Pause ab</th><th>Min.</th></tr></thead><tbody>${[0, 1, 2, 3, 4, 5, 6].map(z).join('')}</tbody></table></div>
    <div class="acts">${wieBuero ? '<button type="button" class="btn" data-m="buero">Wie das Büro</button><span class="fill"></span>' : ''}<button type="button" class="btn" data-m="x">Abbrechen</button><button type="button" class="btn pri" data-m="ok">Speichern</button></div>`,
  async (m, bg, close) => {
    if (m === 'x') return close();
    if (m === 'buero') { close(); return speichern(''); }
    if (m !== 'ok') return;
    const N = {};
    for (const tr of bg.querySelectorAll('[data-azi]')) {
      if (!tr.querySelector('[data-azan]').checked) continue;
      const v = (k) => tr.querySelector(`[data-az="${k}"]`).value.trim();
      if (!/^\d{1,2}:\d{2}$/.test(v('von')) || !/^\d{1,2}:\d{2}$/.test(v('bis')) || v('bis') <= v('von')) { toast(`${AZ_WT[tr.dataset.azi]}: bitte „von“ und „bis“ als hh:mm, „bis“ nach „von“.`, true); return; }
      N[tr.dataset.azi] = { von: v('von'), bis: v('bis'), pb: v('pb'), pd: +v('pd') || 0 };
    }
    close(); speichern(N);
  });
}
document.addEventListener('change', (e) => { const c = e.target.closest && e.target.closest('[data-azan]'); if (c) c.closest('tr').querySelectorAll('[data-az]').forEach((x) => { x.disabled = !c.checked; }); });
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-azme],[data-azbuero],[data-azp]'); if (!b) return;
  if (b.dataset.azme !== undefined) {   // eigene Arbeitszeit (Mein Konto)
    const alt = azJ(G.person && G.person.arbeitszeit);
    const setze = async (A, text) => { const r = await api('api/meine_arbeitszeit', 'PUT', { arbeitszeit: A }); G.person = r.person; G.arbeitszeit = r.arbeitszeit; await laden(); return text; };
    azDialog({ titel: 'Meine Arbeitszeit', hinweis: `Vorgabe für Kommen, Gehen und Pause, solange du nichts einträgst. Büro: ${esc(azText(G.arbeitszeit_buero || {}))}`, A: G.arbeitszeit || {}, wieBuero: true,
      speichern: async (A) => { try { await setze(A); rueckgaengig('Arbeitszeit geändert', () => setze(Object.keys(alt).length ? alt : '')); } catch (er) { toast(er.message, true); } } });
    return;
  }
  if (b.dataset.azbuero !== undefined) {   // Vorgabe des Büros (Einstellungen)
    const alt = K.arbeitszeit_buero, setze = async (A) => { const r = await api('api/zeit_einst', 'PUT', { arbeitszeit: A }); K.arbeitszeit_buero = r.arbeitszeit_buero; G.arbeitszeit_buero = r.arbeitszeit_buero; zeichne(); };
    azDialog({ titel: 'Arbeitszeit des Büros', hinweis: 'Gilt für alle ohne eigene Arbeitszeit.', A: alt, wieBuero: false,
      speichern: async (A) => { try { await setze(A); rueckgaengig('Arbeitszeit des Büros geändert', () => setze(alt)); } catch (er) { toast(er.message, true); } } });
    return;
  }
  const uid = b.closest('[data-pu]').dataset.pu, x = K.konten.find((k) => String(k.user_id) === uid), alt = azJ(x.person.arbeitszeit);
  const setze = async (A) => { const p = await api('api/person/' + uid, 'PUT', { arbeitszeit: A }); x.person = { ...x.person, ...p }; zeichne(); };
  azDialog({ titel: `Arbeitszeit – ${x.name}`, hinweis: `Ohne eigene Angabe gilt das Büro: ${esc(azText(K.arbeitszeit_buero || {}))}`, A: Object.keys(alt).length ? alt : (K.arbeitszeit_buero || {}), wieBuero: true,
    speichern: async (A) => { try { await setze(A); rueckgaengig(`Arbeitszeit ${x.name} geändert`, () => setze(Object.keys(alt).length ? alt : '')); } catch (er) { toast(er.message, true); } } });
});
