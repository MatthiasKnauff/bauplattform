/* Verwaltung → Einstellungen → Bauherrenportal (beschlossen am 15.11.2026): Portal an/aus, Adresse, Schlüssel (nur setzen – den Wert sieht
   niemand), Takt des Abgleichs, Stand; darunter je Projekt Bauherr:innen, Freigaben und Nachrichten (Baustein bp/freigeben.js: BPHead.bauherrProjekt).
   Server: bpcore/bauherren.py (/api/bp/bauherren/…), Dienst bautagebuch/core/bauherren_dienst.py. Das Portal erreicht das Büro nie. */
async function renderBauherren() {
  $('#main').innerHTML = stNav() + '<p class="mute">Lade …</p>';
  let E, P = [], AU = null;
  try { E = await api('api/bp/bauherren/einst'); P = await api('api/projects').catch(() => []); AU = await api('api/bp/bauherren/aussehen').catch(() => null); } catch (e) { $('#main').innerHTML = stNav() + `<p class="err">${esc(e.message)}</p>`; return; }
  const S = E.stand || {};
  $('#main').innerHTML = stNav() + `<section class="card st"><h2>Bauherrenportal</h2>
    <p class="mute">Das Portal läuft auf einem eigenen Server und erreicht das Büro nie: die Bauplattform schickt Freigaben hinaus und holt Nachrichten ab. Auf dem Portal-Server steht derselbe Schlüssel in der Umgebungsvariablen <code>BH_SCHLUESSEL</code>.</p>
    <div class="sf"><label class="cb"><input type="checkbox" id="bhAn"${E.an ? ' checked' : ''}> Portal eingeschaltet</label>
      <label class="w">Adresse des Portals<input id="bhUrl" value="${esc(E.url)}" placeholder="https://bauherren.beispiel.de"></label>
      <label>Abgleich alle … Sekunden<input id="bhTakt" type="number" min="15" max="3600" value="${E.takt}"></label>
      <label class="w">Schlüssel ${E.schluessel ? '<small class="ok">hinterlegt</small>' : '<small class="err">fehlt</small>'}<input id="bhKey" type="password" autocomplete="new-password" placeholder="${E.schluessel ? 'neu setzen (mind. 32 Zeichen)' : 'mind. 32 Zeichen'}"></label></div>
    <div class="st-a"><button class="btn pri" data-bhs="save">Speichern</button><button class="btn" data-bhs="gen">Schlüssel erzeugen</button></div>
    <p class="mute" style="font-size:.85rem">${S.zeit ? `Letzter Abgleich ${esc(new Date(S.zeit).toLocaleString('de-DE'))}: ${S.gesendet || 0} hinaus, ${S.eingang || 0} Nachrichten, ${S.mails || 0} Anmeldemails${S.konten ? `, ${S.konten} Einladung${S.konten === 1 ? '' : 'en'} übertragen` : ''}.` : 'Noch kein Abgleich.'}${S.fehler ? ` <span class="err">Fehler: ${esc(S.fehler)}</span>` : ''}</p>
    ${E.testmails ? `<details${E.testmails.length ? ' open' : ''}><summary>Testserver: Anmeldemails (werden hier nicht verschickt) – ${E.testmails.length}</summary>${E.testmails.map((m) => `<div style="margin:.4rem 0;font-size:.88rem"><b>${esc(m.an)}</b> <span class="mute">${esc(new Date(m.zeit).toLocaleString('de-DE'))}</span><pre style="white-space:pre-wrap;margin:.2rem 0">${esc(m.text)}</pre></div>`).join('') || '<p class="mute">Noch keine.</p>'}</details>` : ''}</section>
    ${AU ? `<section class="card st"><h2>Aussehen des Portals</h2><p class="mute">Logo und Name kommen aus dem Briefbogen des Büros (Verwaltung → Büro). Gilt für alle Projekte; Titelbild, Ansprechperson und Anrede je Projekt stellst du am Projekt ein.</p>
      <div class="sf"><div class="w"><span class="mute" style="font-size:.85rem">Akzentfarbe</span><div style="display:flex;gap:.4rem;margin-top:.25rem">${AU.farben.map((f) => `<button type="button" class="btn sm" data-bhfarbe="${f}" title="${f}" aria-pressed="${f === AU.farbe}" style="background:${f};border-color:${f === AU.farbe ? 'var(--ink)' : f};width:2rem;height:2rem;outline:${f === AU.farbe ? '2px solid ' + f : 'none'};outline-offset:2px"></button>`).join('')}</div></div>
        <label>Anrede<select id="bhAnrede"><option${AU.anrede === 'Sie' ? ' selected' : ''}>Sie</option><option${AU.anrede === 'du' ? ' selected' : ''}>du</option></select></label>
        <label class="w">Begrüßung auf der Startseite (leer = keine)<textarea id="bhGruss" rows="2" placeholder="z. B. Schön, dass Sie da sind – hier sehen Sie, wie es auf Ihrer Baustelle vorangeht.">${esc(AU.gruss)}</textarea></label></div>
      <div class="st-a"><button class="btn" data-bhs="aussehen">Aussehen speichern</button></div></section>` : ''}
    <section class="card st"><h2>Projekte</h2><p class="mute">Bauherr:innen einladen und sperren, Freigaben ansehen und zurückziehen, Nachrichten erledigen.</p>
    <div class="bp-voll"><input id="bhQ" type="search" placeholder="Projekt suchen …" style="width:100%;margin:.3rem 0"></div><div id="bhP"></div></section>`;
  const liste = () => { const q = ($('#bhQ').value || '').toLowerCase(); $('#bhP').innerHTML = (P || []).filter((p) => p.bt && p.bt.id && !p.archived && (!q || (p.name || '').toLowerCase().includes(q))).slice(0, 60)   // /api/projects: Projekt-Nummer steht unter bt.id (key ist „bt12“)
    .map((p) => `<button class="btn sm" style="margin:.15rem" data-bhp="${p.bt.id}" data-bhpn="${esc(p.name)}">${esc(p.name)}</button>`).join('') || '<p class="mute">Keine Projekte.</p>'; };
  liste(); $('#bhQ').addEventListener('input', liste);
}
document.addEventListener('click', async (e) => {
  const fb = e.target.closest('[data-bhfarbe]');
  if (fb) { try { await api('api/bp/bauherren/aussehen', 'PUT', { farbe: fb.dataset.bhfarbe }); renderBauherren(); } catch (x) { toast(x.message, true); } return; }
  const b = e.target.closest('[data-bhs],[data-bhp]'); if (!b) return;
  if (b.dataset.bhp) { BPHead.bauherrProjekt(+b.dataset.bhp, b.dataset.bhpn); return; }
  if (b.dataset.bhs === 'aussehen') { try { await api('api/bp/bauherren/aussehen', 'PUT', { anrede: $('#bhAnrede').value, gruss: $('#bhGruss').value }); toast('Gespeichert – das Portal bekommt es mit dem nächsten Abgleich.'); } catch (x) { toast(x.message, true); } return; }
  if (b.dataset.bhs === 'gen') { const a = new Uint8Array(32); crypto.getRandomValues(a); const k = [...a].map((x) => x.toString(16).padStart(2, '0')).join('');
    $('#bhKey').type = 'text'; $('#bhKey').value = k; toast('Schlüssel erzeugt – jetzt speichern und denselben Wert auf dem Portal-Server als BH_SCHLUESSEL eintragen.'); return; }
  try {
    const body = { an: $('#bhAn').checked, url: $('#bhUrl').value.trim(), takt: +$('#bhTakt').value || 60 }; if ($('#bhKey').value.trim()) body.schluessel = $('#bhKey').value.trim();
    await api('api/bp/bauherren/einst', 'PUT', body); toast('Gespeichert.'); renderBauherren();
  } catch (x) { toast(x.message, true); }
});
