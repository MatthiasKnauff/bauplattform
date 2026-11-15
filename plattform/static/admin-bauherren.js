/* Verwaltung → Einstellungen → Bauherrenportal (beschlossen am 15.11.2026): Portal an/aus, Adresse, Schlüssel (nur setzen – den Wert sieht
   niemand), Takt des Abgleichs, Stand; darunter je Projekt Bauherr:innen, Freigaben und Nachrichten (Baustein bp/freigeben.js: BPHead.bauherrProjekt).
   Server: bpcore/bauherren.py (/api/bp/bauherren/…), Dienst bautagebuch/core/bauherren_dienst.py. Das Portal erreicht das Büro nie. */
async function renderBauherren() {
  $('#main').innerHTML = stNav() + '<p class="mute">Lade …</p>';
  let E, P = [];
  try { E = await api('api/bp/bauherren/einst'); P = await api('api/projects').catch(() => []); } catch (e) { $('#main').innerHTML = stNav() + `<p class="err">${esc(e.message)}</p>`; return; }
  const S = E.stand || {};
  $('#main').innerHTML = stNav() + `<section class="card st"><h2>Bauherrenportal</h2>
    <p class="mute">Das Portal läuft auf einem eigenen Server und erreicht das Büro nie: die Bauplattform schickt Freigaben hinaus und holt Nachrichten ab. Auf dem Portal-Server steht derselbe Schlüssel in der Umgebungsvariablen <code>BH_SCHLUESSEL</code>.</p>
    <div class="sf"><label class="cb"><input type="checkbox" id="bhAn"${E.an ? ' checked' : ''}> Portal eingeschaltet</label>
      <label class="w">Adresse des Portals<input id="bhUrl" value="${esc(E.url)}" placeholder="https://bauherren.beispiel.de"></label>
      <label>Abgleich alle … Sekunden<input id="bhTakt" type="number" min="15" max="3600" value="${E.takt}"></label>
      <label class="w">Schlüssel ${E.schluessel ? '<small class="ok">hinterlegt</small>' : '<small class="err">fehlt</small>'}<input id="bhKey" type="password" autocomplete="new-password" placeholder="${E.schluessel ? 'neu setzen (mind. 32 Zeichen)' : 'mind. 32 Zeichen'}"></label></div>
    <div class="st-a"><button class="btn pri" data-bhs="save">Speichern</button><button class="btn" data-bhs="gen">Schlüssel erzeugen</button></div>
    <p class="mute" style="font-size:.85rem">${S.zeit ? `Letzter Abgleich ${esc(new Date(S.zeit).toLocaleString('de-DE'))}: ${S.gesendet || 0} hinaus, ${S.eingang || 0} Nachrichten, ${S.mails || 0} Anmeldemails.` : 'Noch kein Abgleich.'}${S.fehler ? ` <span class="err">Fehler: ${esc(S.fehler)}</span>` : ''}</p></section>
    <section class="card st"><h2>Projekte</h2><p class="mute">Bauherr:innen einladen und sperren, Freigaben ansehen und zurückziehen, Nachrichten erledigen.</p>
    <div class="bp-voll"><input id="bhQ" type="search" placeholder="Projekt suchen …" style="width:100%;margin:.3rem 0"></div><div id="bhP"></div></section>`;
  const liste = () => { const q = ($('#bhQ').value || '').toLowerCase(); $('#bhP').innerHTML = (P || []).filter((p) => !p.archived && (!q || (p.name || '').toLowerCase().includes(q))).slice(0, 60)
    .map((p) => `<button class="btn sm" style="margin:.15rem" data-bhp="${p.id}" data-bhpn="${esc(p.name)}">${esc(p.name)}</button>`).join('') || '<p class="mute">Keine Projekte.</p>'; };
  liste(); $('#bhQ').addEventListener('input', liste);
}
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-bhs],[data-bhp]'); if (!b) return;
  if (b.dataset.bhp) { BPHead.bauherrProjekt(+b.dataset.bhp, b.dataset.bhpn); return; }
  if (b.dataset.bhs === 'gen') { const a = new Uint8Array(32); crypto.getRandomValues(a); const k = [...a].map((x) => x.toString(16).padStart(2, '0')).join('');
    $('#bhKey').type = 'text'; $('#bhKey').value = k; toast('Schlüssel erzeugt – jetzt speichern und denselben Wert auf dem Portal-Server als BH_SCHLUESSEL eintragen.'); return; }
  try {
    const body = { an: $('#bhAn').checked, url: $('#bhUrl').value.trim(), takt: +$('#bhTakt').value || 60 }; if ($('#bhKey').value.trim()) body.schluessel = $('#bhKey').value.trim();
    await api('api/bp/bauherren/einst', 'PUT', body); toast('Gespeichert.'); renderBauherren();
  } catch (x) { toast(x.message, true); }
});
