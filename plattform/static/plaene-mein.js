'use strict';
/* Pläne & Dateien – „Mein Ordner“ (GO 19.11.2026, Mock „Mein Ordner“: A1 B1 C1; Lage nach Skizze: unter dem Ordnerbaum klein
   „Benutzerordner“, darunter eingerückt der eigene Ordner). Der Ordner läuft in „Alle Dateien“ wie ein Projekt mit der Nummer −Benutzer-ID
   (Kern bpcore/meinordner.py) – Liste, Ansehen, Kopieren/Verschieben (auch in Projekte), Papierkorb, Bauportal Office wie gewohnt;
   Vorschaubilder gibt es dort nicht. Ohne gewählten Ordner (C1): ausgegraut, Klick öffnet Mein Konto.
   Benutzt die gemeinsamen Namen der Seite plaene.html (pid, tab, ME, LS, render, laden). */
let MO = null, MO_ZURUECK = null;
const moIch = () => typeof pid === 'number' && pid < 0;
async function moLaden() { try { MO = await api('api/bp/meinordner'); } catch { MO = { ordner: '' }; } if (ME && (tab === 'alle' || moIch())) render(); }
window.meinNav = () => {   // Gruppe unter „Ansicht“ (bpNav): klein „Benutzerordner“, darunter der eigene Ordner
  if (!MO) return [];
  const IC = '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="12" cy="12.5" r="2"/><path d="M8.5 17c.6-1.6 2-2.4 3.5-2.4s2.9.8 3.5 2.4"/>';
  return [{ titel: 'Benutzerordner', klasse: 'ng-mo', punkte: [MO.ordner
    ? { id: 'ich', text: MO.ordner, icon: IC, farbe: 'var(--c-t)', zahl: moIch() && ALLE && ALLE_PID === pid && ALLE.dateien ? ALLE.dateien.length : '', unter: moIch() && typeof alleNavBaum === 'function' ? alleNavBaum() : '', tip: `Mein Ordner – ${MO.wurzel}/${MO.ordner}, nur für dich sichtbar` }
    : { id: 'ich', text: 'In Mein Konto festlegen', icon: IC, farbe: 'var(--mute)', tip: 'Noch kein eigener Ordner gewählt – unter Mein Konto festlegen' }] }];
};
window.meinAktiv = () => (moIch() ? 'ich' : null);
window.meinTab = (t) => {   // Klick in der Navigation; true = erledigt
  if (t === 'ich') {
    if (!MO || !MO.ordner) { BPHead.einstellungen({ bereich: 'ich', teil: 'konto' }); return true; }
    if (!moIch()) MO_ZURUECK = pid;
    pid = MO.pid; tab = 'alle'; history.replaceState(null, '', '#ich'); render(); return true;
  }
  if (moIch()) {   // zurück ins Projekt
    pid = MO_ZURUECK || LS.get('pid', null); tab = t; history.replaceState(null, '', '#' + t); laden(); return true;
  }
  return false;
};
moLaden();
