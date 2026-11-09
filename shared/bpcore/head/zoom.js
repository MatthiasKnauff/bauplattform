/* Vorschau vergrößern und verkleinern – gemeinsamer Baustein (/bp/zoom.js) für jede Druck- und Dokumentvorschau (.bed).
   Setzt „− 100 % +“ in die Leiste der Vorschau (.bed-bar); dazu Strg + Mausrad und Strg + / − / 0. Klick auf die Zahl = 100 %.
   Die Seiten (.bed-p) werden über die Stil-Variable --bpz skaliert (bp.css) – Eingabefelder auf der Seite wachsen mit.
   Die Stufe wird je Benutzer im Browser gemerkt (bp.zoom). Neue Vorschauen werden selbst erkannt. */
(() => {
  if (window.bpZoom) return;
  const STUFEN = [0.5, 0.67, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3];
  const lies = () => { try { const z = +localStorage.getItem('bp.zoom'); return z >= 0.5 && z <= 3 ? z : 1; } catch { return 1; } };
  function setzen(bed, z) {
    z = Math.max(0.5, Math.min(3, z)); const S = bed.querySelector('.bed-s'), alt = +bed.dataset.bpz || 1;
    const mitte = S ? (S.scrollTop + S.clientHeight / 2) / alt : 0;
    bed.dataset.bpz = z; bed.style.setProperty('--bpz', z); try { localStorage.setItem('bp.zoom', z); } catch { /* egal */ }
    const a = bed.querySelector('[data-bpz="1"]'); if (a) a.textContent = Math.round(z * 100) + ' %';
    if (S) S.scrollTop = mitte * z - S.clientHeight / 2;   // die Stelle in der Mitte bleibt in der Mitte
  }
  const stufe = (bed, r) => { const z = +bed.dataset.bpz || 1; setzen(bed, r > 0 ? (STUFEN.find((s) => s > z + 0.001) || 3) : ([...STUFEN].reverse().find((s) => s < z - 0.001) || 0.5)); };
  function anbringen(bed) {
    const bar = bed.querySelector('.bed-bar'); if (!bar || bar.querySelector('.bp-zoom')) return;
    const g = document.createElement('span'); g.className = 'bp-zoom'; g.setAttribute('role', 'group'); g.setAttribute('aria-label', 'Größe der Vorschau');
    g.innerHTML = '<button type="button" data-bpz="-" title="Verkleinern (Strg + Mausrad)" aria-label="Verkleinern">−</button><button type="button" data-bpz="1" title="Originalgröße (100 %)"></button><button type="button" data-bpz="+" title="Vergrößern (Strg + Mausrad)" aria-label="Vergrößern">+</button>';
    const erster = bar.querySelector('button'); if (erster) erster.before(g); else bar.appendChild(g);
    g.addEventListener('click', (e) => { const b = e.target.closest('[data-bpz]'); if (!b) return; if (b.dataset.bpz === '1') setzen(bed, 1); else stufe(bed, b.dataset.bpz === '+' ? 1 : -1); });
    bed.addEventListener('wheel', (e) => { if (!(e.ctrlKey || e.metaKey) || !e.target.closest('.bed-s')) return; e.preventDefault(); stufe(bed, e.deltaY < 0 ? 1 : -1); }, { passive: false });
    bed.addEventListener('keydown', (e) => { if (!(e.ctrlKey || e.metaKey)) return; const r = e.key === '+' || e.key === '=' ? 1 : e.key === '-' ? -1 : e.key === '0' ? 0 : null; if (r == null) return; e.preventDefault(); if (r) stufe(bed, r); else setzen(bed, 1); });
    setzen(bed, lies());
  }
  let warte = 0;
  const alle = () => { warte = 0; document.querySelectorAll('.bed').forEach(anbringen); };
  try { new MutationObserver(() => { if (!warte) warte = requestAnimationFrame(alle); }).observe(document.documentElement, { childList: true, subtree: true }); } catch { /* egal */ }
  window.bpZoom = { setzen, anbringen };
})();
