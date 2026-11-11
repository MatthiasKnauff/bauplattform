/* Pläne & Dateien – Dateien hereinziehen: das Ablegen selbst macht der Baustein für alle Apps (bp/ablegen.js, BPHead.ablage).
   Hier nur, was diese Seite weiß: welcher Ordner „hier“ ist (die Planzeile, auf die gezogen wurde, sonst der Ordner der gezeigten Pläne)
   und dass die Liste danach neu gelesen wird. Benutzt die gemeinsamen Namen der Seite plaene.html (pid, D, sichtbar, laden, stKey). */
const plOrdnerVon = (pfad) => (pfad || '').split('/').slice(0, -1).join('/');
function plHier(zeile) {   // wo ich gerade bin
  if (zeile && D) {
    for (const p of D.plaene.concat(D.frei || [])) for (const st of p.staende) if (stKey(p, st) === zeile.dataset.k && st.pdf) return plOrdnerVon(st.pdf.pfad);
  }
  const n = {};
  for (const p of (D && !D.error ? sichtbar() : [])) { const st = p.staende.find((x) => x.pdf); if (st) { const o = plOrdnerVon(st.pdf.pfad); n[o] = (n[o] || 0) + 1; } }
  const best = Object.entries(n).sort((a, b) => b[1] - a[1])[0];
  return best ? best[0] : null;
}
(function haken() {
  if (!window.BPHead) { setTimeout(haken, 50); return; }
  BPHead.ablage = Object.assign(BPHead.ablage || {}, {
    hier: (ziel) => plHier(ziel && ziel.closest && ziel.closest('table.pl tr[data-k]')),
    nachher: () => laden(true),   // Ordner neu einlesen, damit die Datei gleich in der Liste steht
  });
})();
/* beim Ziehen die Planzeile unter dem Zeiger markieren (abgelegt wird dann in ihrem Ordner) */
document.addEventListener('dragover', (e) => {
  document.querySelectorAll('tr.pl-ziel').forEach((x) => x.classList.remove('pl-ziel'));
  const z = e.target.closest && e.target.closest('table.pl tr[data-k]'); if (z && [...(e.dataTransfer.types || [])].includes('Files')) z.classList.add('pl-ziel');
});
['drop', 'dragend'].forEach((t) => document.addEventListener(t, () => document.querySelectorAll('tr.pl-ziel').forEach((x) => x.classList.remove('pl-ziel'))));
