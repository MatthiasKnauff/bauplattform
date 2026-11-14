'use strict';
/* =====================================================================
   Bauzeitenplan teilen: Links zum Ansehen (schreibgeschützt) für Firmen, Fachplaner, Bauherr – ohne Anmeldung.
   Das Fenster ist der gemeinsame Baustein BPHead.teilen (/bp/teilen.js: Büro-Kopf, Voreinstellungen, Kontakt, Senden);
   hier nur, was den Bauzeitenplan betrifft: „mitlaufend“ zeigt den eingestellten Plan im aktuellen Stand (die Version lässt
   sich auch nach dem Versand wechseln), „fest“ genau den Stand beim Erstellen · Fortschritt · Meilensteine · nur ein Gewerk.
   Server: /api/projects/<id>/links, /api/links/<schlüssel>; die Ansicht selbst: /ansicht/<schlüssel> (ansicht.html).
   ===================================================================== */
(function () {
  const url = (t) => new URL('ansicht/' + t, location.href.replace(/[#?].*$/, '').replace(/[^/]*$/, '')).href;
  const call = async (u, m = 'GET', b) => { const r = await fetch(u, { method: m, headers: b ? { 'Content-Type': 'application/json' } : {}, body: b ? JSON.stringify(b) : undefined });
    const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'Fehler ' + r.status); return d; };

  function teilen() {
    if (!P) { toast('Kein Bauzeitenplan geöffnet.', true); return; }
    if (!window.BPHead || !BPHead.teilen) { toast('Teilen ist gerade nicht verfügbar.', true); return; }
    const pid = P.id, bt = P._bt && P._bt.id;
    const plaene = () => (bt ? projects.filter((p) => p.bt_id === bt && !p.archived) : projects.filter((p) => p.id === pid));
    const gewerke = [...new Set((P.tasks || []).map((t) => t.gw).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'de'));
    BPHead.teilen({
      app: 'gantt', titel: 'Plan teilen', unter: P.name, arten: true,
      sicht: [{ k: 'fortschritt', l: 'Fortschritt', an: true, tip: 'Erledigt-Anteil je Leistung und Gruppe zeigen' },
        { k: 'meilensteine', l: 'Meilensteine', an: true },
        ...(gewerke.length ? [{ k: 'gewerk', l: 'nur Gewerk', wahl: gewerke.map((g) => ({ v: g, l: g })) }] : [])],
      url,
      liste: () => call(`api/projects/${encodeURIComponent(pid)}/links`),
      neu: (w) => call(`api/projects/${encodeURIComponent(pid)}/links`, 'POST', w),
      aendern: (t, w) => call('api/links/' + encodeURIComponent(t), 'PUT', w),
      loeschen: (t) => call('api/links/' + encodeURIComponent(t), 'DELETE'),
      zeigt: (x) => (x.art === 'fest' ? `<span class="bph-mu">zeigt: ${esc(x.stand_name)}</span>`
        : `<span class="bph-mu">zeigt:</span>${plaene().map((p) => `<button type="button" class="bpt-v${p.id === x.gantt_id ? ' on' : ''}" data-tv="${esc(p.id)}" title="Diese Version zeigen – gilt sofort, auch für bereits verschickte Links">${esc(p.name)}</button>`).join('')}`),
      klick: async (e, x, neu) => {
        const v = e.target.closest('[data-tv]'); if (!v) return false;
        try { neu(await call('api/links/' + encodeURIComponent(x.token), 'PUT', { gantt_id: v.dataset.tv })); } catch (er) { toast(er.message, true); }
        return true;
      },
      mail: () => ({ titel: 'Bauzeitenplan senden', art: 'terminplan', pid: bt || undefined, projekt: (P._bt && P._bt.name) || P.name,
        betreff: `Bauzeitenplan ${(P._bt && P._bt.name) || P.name}`,
        text: 'Guten Tag,\n\nüber diesen Link sehen Sie den Bauzeitenplan – ohne Anmeldung, immer im eingestellten Stand:' }),
    });
  }
  window.ganttTeilen = teilen;
})();
