/* Baumtabelle – gemeinsamer Baustein (/bp/baum.js): Projekt → LV/Plan → Gliederung → Zeilen, als <table class="bp-baum">.
   Erster Teil: die Baumzelle (Einrückung, Dreieck, Symbol) und ihr Aussehen (bp.css). Markieren, Auf-/Zuklappen und Ziehen
   stecken noch in der AVA und folgen hierher.

   bpBaum.zelle(o) → '<td class="… baumz">…</td>'
     o.tiefe   Ebene (0 = Wurzel); je Ebene bpBaum.EINZUG rem eingerückt
     o.auf     true = aufgeklappt (▾), false = zugeklappt (▸), sonst kein Dreieck (der Platz bleibt, damit die Texte fluchten)
     o.car     zusätzliche Attribute am Dreieck, z. B. ' data-zu="…" title="zuklappen"'
     o.icon    HTML des Symbols
     o.html    Inhalt hinter dem Symbol (Text, Eingabefeld, Marken)
     o.kl      weitere Klassen der Zelle, o.attr weitere Attribute der Zelle
   bpBaum.einzug(tiefe) → 'padding-left:…rem' (für Zeilen, die ihre Zelle selbst bauen) */
(() => {
  if (window.bpBaum) return;
  const EINZUG = 1.15;
  const einzug = (t) => `padding-left:${(t || 0) * EINZUG}rem`;
  function zelle(o) {
    return `<td class="${o.kl ? o.kl + ' ' : ''}baumz"${o.attr || ''}><div class="bz" style="${einzug(o.tiefe)}"><span class="car"${o.car || ''}>${o.auf === true ? '▾' : o.auf === false ? '▸' : ''}</span>${o.icon || ''}${o.html || ''}</div></td>`;
  }
  window.bpBaum = { EINZUG, einzug, zelle };
})();
