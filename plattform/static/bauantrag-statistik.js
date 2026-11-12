/* Bauantrag – Statistischer Erhebungsbogen (nach bauantrag-pdf.js geladen, gemeinsame Namen).
   Wird wie jeder andere amtliche Vordruck behandelt – nur die Quelle ist eine andere: Die Statistischen Ämter erzeugen den leeren Bogen
   je Land auf ihrer Seite (Bundesland wählen → „Leeren Erhebungsbogen für Baugenehmigung ausdrucken (PDF)“ → Ausführen); das lässt sich
   nicht selbst abrufen. Den Bogen einmal herunterladen und hier hochladen → Vordruck des Landes (Nr. „Statistik“), danach in jedem Antrag
   unter „Amtliche Vordrucke“: „Platzieren …“, „Im PDF ausfüllen“, ins Paket. Ersetzen bei neuer Fassung wie bei den anderen Formularen. */
const STAT_URL = 'https://bau.statistik-bw.de/baut/servlet/LaenderServlet';   // Bautätigkeitsstatistik Online der Statistischen Ämter (Land wählen)
const statVordruck = () => ((D && D.paket) || []).find((x) => x.art === 'vordruck' && /statist|erhebungsbogen/i.test(x.titel));
const LAND_NAME = { BW: 'Baden-Württemberg', BY: 'Bayern', BE: 'Berlin', BB: 'Brandenburg', HB: 'Bremen', HH: 'Hamburg', HE: 'Hessen', MV: 'Mecklenburg-Vorpommern',
  NI: 'Niedersachsen', NW: 'Nordrhein-Westfalen', RP: 'Rheinland-Pfalz', SL: 'Saarland', SN: 'Sachsen', ST: 'Sachsen-Anhalt', SH: 'Schleswig-Holstein', TH: 'Thüringen' };

/* Anleitung + Hochladen – auf der Statistik-Seite (noch kein Vordruck) und unter „Alle Vordrucke …“ */
function statQuelleHtml(land) {
  return `<ol class="ba-stat-s"><li>Die Seite der Statistischen Ämter öffnen, <b>${esc(LAND_NAME[land] || 'das Bundesland')}</b> wählen und „<b>Leeren Erhebungsbogen für Baugenehmigung ausdrucken (PDF)</b>“ → Ausführen, das PDF speichern.</li>
      <li>Hier hochladen – einmal fürs Büro; bei einer neuen Fassung „Ersetzen“ wie bei den anderen Formularen.</li></ol>
    <p><a class="btn" href="${STAT_URL}" target="_blank" rel="noopener">Statistische Ämter öffnen ↗</a> <label class="btn pri">📎 Leeren Bogen hochladen<input type="file" accept="application/pdf" data-statvordruck="${esc(land)}" hidden></label></p>`;
}
function statistikHtml() {
  const b = D.bauvorlagen.find((x) => x.key === 'statistik') || {};
  const st = b.status === 'entfaellt' ? '<span class="ba-chip">entfällt</span>' : b.status === 'offen' ? '<span class="ba-chip of">fehlt noch</span>' : '<span class="ba-chip ok">✓ liegt bei</span>';
  return `<div class="ba-k"><h3>Statistischer Erhebungsbogen ${st}</h3>
    <p>Der Erhebungsbogen ist ein amtlicher Vordruck wie die anderen – nur die Quelle ist eine andere. Für ${esc(LAND_NAME[D.antrag.land] || 'dieses Land')} liegt er noch nicht vor.</p>
    ${statQuelleHtml(D.antrag.land || 'NW')}
    <p><button type="button" class="btn sm" data-bv="statistik" data-v="${b.status === 'entfaellt' ? 'offen' : 'entfaellt'}">${b.status === 'entfaellt' ? 'wird doch gebraucht' : 'entfällt (z. B. Abbruch ohne Neubau)'}</button></p></div>`;
}

/* leeren Bogen als Vordruck des Landes hochladen; im Antrag gleich aufnehmen */
document.addEventListener('change', async (e) => {
  const inp = e.target; if (!inp.dataset || inp.dataset.statvordruck === undefined || !inp.files.length) return;
  const f = inp.files[0], land = inp.dataset.statvordruck || (D && D.antrag.land) || 'NW', id = AID; inp.value = '';
  const fd = new FormData(); fd.append('datei', f); fd.append('land', land); fd.append('nr', 'Statistik'); fd.append('titel', 'Statistischer Erhebungsbogen (Baugenehmigung)');
  try {
    const r = await fetch('api/formulare/hochladen', { method: 'POST', body: fd, credentials: 'same-origin' }), d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Hochladen fehlgeschlagen');
    if (FORM) { FORM = d; zeichne(); toast('Erhebungsbogen als Vordruck abgelegt.'); return; }
    D = await api('api/antraege/' + id); const x = statVordruck();
    if (x && !x.an) D = await api(`api/antraege/${id}/paket`, 'PUT', { key: x.key, an: true });
    VIEW = null; if (x) NAVAKT = 'st:' + x.key;
    zeichne(); toast('Erhebungsbogen als Vordruck abgelegt und in den Antrag aufgenommen – jetzt einmal „Platzieren …“.');
  } catch (er) { toast(er.message, true); }
});
