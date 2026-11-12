'use strict';
/* Zeiten → Mitarbeiter: wer wann weg ist (Monat, alle aktiven Personen). Wer Urlaub entscheidet oder verwaltet, sieht den Grund,
   offene Anträge und je Person Rolle, Vorgesetzte und Urlaubskonto (Klick auf den Namen); alle anderen sehen bei Kolleg:innen nur
   „weg“. Server: GET api/abwesenheiten?m= (bpcore.zeiten.abwesenheiten). Geladen nach zeiten.html – benutzt monat, esc. */
let TM = null, TM_AUF = null;
const TM_ART = { urlaub: ['U', 'Urlaub'], urlaub_halb: ['½', 'halber Urlaubstag'], krank: ['K', 'krank'], frei: ['F', 'Frei / Ausgleich'], schule: ['B', 'Fortbildung'], beantragt: ['?', 'Urlaub beantragt'], weg: ['', 'nicht da'] };

function vTeam() {
  if (!TM) return '<div class="card"><p class="hinw">Lade …</p></div>';
  const T = TM.tage, n = (v) => String(v).replace('.', ',');
  const kopf = `<tr><th class="tm-n"></th>${T.map((t) => `<th class="tm-d${t.we || t.feiertag ? ' tm-we' : ''}"${t.feiertag ? ` title="${esc(t.feiertag)}"` : ''}>${+t.tag.slice(8)}</th>`).join('')}</tr>`;
  const zeile = (p) => {
    const auf = TM_AUF === p.id && p.rolle != null;
    return `<tr><td class="tm-n">${p.rolle != null ? `<button type="button" class="tm-p" data-tmp="${p.id}" aria-expanded="${auf}">${auf ? '▾' : '▸'} ${esc(p.name)}</button>` : esc(p.name)}</td>${T.map((t) => {
      const a = p.abw[t.tag], x = TM_ART[a] || ['', a || ''];
      return `<td class="tm-d${t.we || t.feiertag ? ' tm-we' : ''}${a ? ' tm-' + (TM_ART[a] ? a : 'weg') : ''}"${a ? ` title="${esc(x[1])}"` : ''}>${a ? x[0] : ''}</td>`; }).join('')}</tr>`
      + (auf ? `<tr class="tm-info"><td colspan="${T.length + 1}"><div class="tm-kv"><span>Rolle</span><b>${esc(p.rolle)}</b><span>Vorgesetzt</span><b>${esc(p.vorgesetzt || '–')}</b>
        <span>Soll</span><b>${n(p.soll_woche)} h / Woche</b><span>Urlaub ${TM.tage[0].tag.slice(0, 4)}</span><b>${n(p.urlaub)} T Anspruch · ${n(p.genommen)} genommen/geplant${p.beantragt ? ` · ${n(p.beantragt)} beantragt` : ''} · Rest ${n(p.rest)}</b>
        ${p.krank != null ? `<span>Krank</span><b>${p.krank} T im Jahr</b>` : ''}</div></td></tr>` : '');
  };
  const leg = Object.entries(TM_ART).filter(([k]) => !TM.alles || k !== 'weg').map(([k, [z, t]]) => `<span><i class="tm-${k}">${z}</i>${esc(t)}</span>`).join('');
  return `<div class="card"><h3>Mitarbeiter · wer ist wann weg?</h3>${monatNav()}
    <div class="tm-w"><table class="tm">${kopf}${TM.personen.map(zeile).join('')}</table></div>
    <div class="tm-leg">${leg}<span><i class="tm-we"></i>Wochenende / Feiertag</span></div>
    ${TM.alles ? '<p class="hinw">Klick auf einen Namen: Rolle, Vorgesetzte und Urlaubskonto. Rollen und Vorgesetzte stellst du in der Verwaltung ein.</p>' : '<p class="hinw">Bei Kolleg:innen steht nur, dass sie nicht da sind – den Grund sehen, wer Urlaub entscheidet, und die Person selbst.</p>'}</div>`;
}
document.addEventListener('click', (e) => {
  const b = e.target.closest && e.target.closest('[data-tmp]'); if (!b) return;
  TM_AUF = TM_AUF === +b.dataset.tmp ? null : +b.dataset.tmp; $('#view').innerHTML = vTeam();
});
