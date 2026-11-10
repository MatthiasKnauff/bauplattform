/* Baumtabelle – gemeinsamer Baustein (/bp/baum.js): Projekt → LV/Plan → Gliederung → Zeilen, als <table class="bp-baum">.
   Bisher: die Baumzelle (Einrückung, Dreieck, Symbol), ihr Aussehen (bp.css) und das Auf-/Zuklappen. Markieren und Ziehen
   stecken noch in der AVA und folgen hierher.

   bpBaum.zelle(o) → '<td class="… baumz">…</td>'
     o.tiefe   Ebene (0 = Wurzel); je Ebene bpBaum.EINZUG rem eingerückt
     o.auf     true = aufgeklappt (▾), false = zugeklappt (▸), sonst kein Dreieck (der Platz bleibt, damit die Texte fluchten)
     o.klapp   Kennung des Knotens: das Dreieck klappt ihn auf und zu (data-zu, siehe bpBaum.klappbar)
     o.car     zusätzliche Attribute am Dreieck (für Dreiecke mit eigener Bedeutung)
     o.icon    HTML des Symbols
     o.html    Inhalt hinter dem Symbol (Text, Eingabefeld, Marken)
     o.kl      weitere Klassen der Zelle, o.attr weitere Attribute der Zelle
   bpBaum.einzug(tiefe) → 'padding-left:…rem' (für Zeilen, die ihre Zelle selbst bauen)

   Auf- und Zuklappen – die Zeilen liegen als flache Liste vor, jede mit einer Tiefe (Blätter: Infinity):
   bpBaum.klapp({ anfang, key }) → K   Stand „welche Knoten sind zu“
     anfang    Kennungen, die anfangs zu sind (Liste oder Funktion)
     key       Name zum Merken im Browser (bp.baum.<key>); ohne key gilt der Stand bis zum Neuladen der Seite
     K.zu(id) · K.um(id) · K.oeffne(id) · K.setze(ids) · K.liste() · K.zahl()
   bpBaum.sicht(zeilen, tiefe, K, id) → je Zeile true/false: sichtbar? (alles unter einem zugeklappten Knoten ist versteckt)
     tiefe(x) → Ebene der Zeile, id(x) → Kennung (Vorgabe x.id)
   bpBaum.eltern(zeilen, i, tiefe) → die Knoten über Zeile i, vom nächsten bis zur Wurzel
   bpBaum.zeige(zeilen, i, tiefe, K, id) → klappt alles über Zeile i auf (z. B. vor dem Hinscrollen)
   bpBaum.klappbar(wurzel, { klapp: () => K oder null, neu: () => …, alle: () => Kennungen aller Knoten })
     → Klick auf ein Dreieck mit data-zu klappt um und zeichnet neu; ein Knopf mit data-zualle="zu" klappt alles zu, mit "auf" alles auf */
(() => {
  if (window.bpBaum) return;
  const EINZUG = 1.15;
  const einzug = (t) => `padding-left:${(t || 0) * EINZUG}rem`;
  function zelle(o) {
    return `<td class="${o.kl ? o.kl + ' ' : ''}baumz"${o.attr || ''}><div class="bz" style="${einzug(o.tiefe)}"><span class="car"${o.klapp != null ? ` data-zu="${o.klapp}" title="${o.auf === false ? 'aufklappen' : 'zuklappen'}"` : ''}${o.car || ''}>${o.auf === true ? '▾' : o.auf === false ? '▸' : ''}</span>${o.icon || ''}${o.html || ''}</div></td>`;
  }
  const SP = 'bp.baum.';
  function klapp(o) {
    o = o || {};
    let S = null;
    if (o.key) try { const v = JSON.parse(localStorage.getItem(SP + o.key)); if (Array.isArray(v)) S = new Set(v.map(String)); } catch { /* ohne Speicher: Anfangsstand */ }
    if (!S) S = new Set((typeof o.anfang === 'function' ? o.anfang() : o.anfang || []).map(String));
    const merke = () => { if (o.key) try { localStorage.setItem(SP + o.key, JSON.stringify([...S])); } catch { /* egal */ } };
    return {
      zu: (id) => S.has(String(id)),
      um(id) { id = String(id); if (S.has(id)) S.delete(id); else S.add(id); merke(); },
      oeffne(id) { if (S.delete(String(id))) merke(); },
      setze(ids) { S = new Set((ids || []).map(String)); merke(); },
      liste: () => [...S],
      zahl: () => S.size,
    };
  }
  const kenn = (x) => x.id;
  function sicht(zeilen, tiefe, K, id) {
    id = id || kenn; let zuAb = null;   // zuAb: ab dieser Ebene ist zugeklappt
    return zeilen.map((x) => {
      const t = tiefe(x); if (zuAb != null && t <= zuAb) zuAb = null;
      if (zuAb != null) return false;
      if (t !== Infinity && K.zu(id(x))) zuAb = t;
      return true;
    });
  }
  function eltern(zeilen, i, tiefe) {
    const out = []; if (i < 0 || i >= zeilen.length) return out;
    let t = tiefe(zeilen[i]);
    for (let j = i - 1; j >= 0; j--) { const tj = tiefe(zeilen[j]); if (tj < t) { out.push(zeilen[j]); t = tj; } }
    return out;
  }
  function zeige(zeilen, i, tiefe, K, id) { id = id || kenn; eltern(zeilen, i, tiefe).forEach((x) => K.oeffne(id(x))); }
  function klappbar(wurzel, o) {
    wurzel.addEventListener('click', (e) => {
      const c = e.target.closest && e.target.closest('[data-zu]'), a = !c && o.alle && e.target.closest && e.target.closest('[data-zualle]');
      if (!c && !a) return;
      const K = o.klapp(); if (!K) return;
      e.stopPropagation();
      if (c) K.um(c.dataset.zu); else K.setze(a.dataset.zualle === 'zu' ? o.alle() : []);
      o.neu();
    }, true);
  }
  window.bpBaum = { EINZUG, einzug, zelle, klapp, sicht, eltern, zeige, klappbar };
})();
