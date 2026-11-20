/* 3D-Ansicht des Gebäudemodells – eigener kleiner Betrachter (WebGL, ohne Zusatzbibliothek), GO 16.11.2026 („Gebäudemodell als Mitte“, Punkt 20).
   Der Kern rechnet je Planstand einmal die Dreiecke (bpcore/netz.py, /api/bp/modell/<pid>/netz); hier wird nur noch gezeichnet.
   Drehen (ziehen), Zoomen (Rad, zwei Finger), Verschieben (Umschalt/rechte Taste, zwei Finger), Geschosse und Dach ein/aus,
   Färben nach Maßnahme (aus der Bauteil-Checkliste) oder nach den Farben des Modells, Bauteil antippen → Name, Nummer, Maßnahme.

   bp3d.mount(el, { url | netz, zeilen, titel, hervor }) → { neu(zeilen), hervor(ids) } – url liefert das Netz (oder netz = das Netz selbst, Bauherrenportal), zeilen = bauteilliste.zeilen (für Farben und Antippen).
   Wird erst beim Öffnen geladen (Gebäudemodell → „3D“, Bauherrenportal).

   20.11.2026 (Probe „3D-Ansicht“, A1 B1 C1): Geschosse auseinanderziehen (Schieber), eigene Färbungen einer App und Auswählen.
     modi:  [{ key, name, farbe(e) → '#rrggbb' | null (null = blass, gehört nicht dazu), legende: [['#rrggbb', 'Text']] }] – zusätzliche Färbungen (Wärmeschutz: U-Wert, Bauteilart)
     start: Schlüssel der Färbung beim Öffnen · info(e) → HTML für das Feld oben rechts
     wahl:  true → Klick wählt (violett), Strg + Klick dazu/ab, „Rahmen“ (oder Alt + Ziehen) wählt viele: nach rechts gezogen ganz darin, nach links berührt;
            onWahl(ids, e) meldet die Nummern der Bauteile im Plan
   → { neu(zeilen), hervor(ids), waehle(ids), farben() } – farben(): neu färben, wenn sich in der App etwas geändert hat. */
(function () {
  if (window.bp3d) return;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const MASS = { neu: ['#3f9d55', 'neu'], erneuern: ['#2f6fb3', 'erneuern'], instandsetzen: ['#d9a400', 'instandsetzen'], bleibt: ['#b9b7af', 'bleibt'],
    abbruch: ['#c62f2a', 'Abbruch'], pruefen: ['#8e5bb5', 'prüfen'], offen: ['#efe9dc', 'noch offen'] };
  const TYPF = { o: '#9cc3e0', w: '#ece8df', f: '#9cc3e0', d: '#a7805a', s: '#b9b6ad', r: '#4a4d55', x: '#a9a59b' };
  const TYPN = { o: 'Öffnung', w: 'Wand', f: 'Fenster', d: 'Tür', s: 'Decke / Platte', r: 'Dach', x: 'Bauteil' };
  const glas = (e) => e.t === 'f' || e.t === 'o';   // Fenster und Öffnungen ohne Bauteil (netz.py) durchscheinend
  const rgb = (h) => { const n = parseInt(String(h || '#999999').slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
  const STIL = `.b3-z{display:inline-flex;gap:.35rem;align-items:center;font-size:.78rem;color:#23282b;background:rgba(255,255,255,.88);border:1px solid var(--line,#c9ced4);border-radius:calc(99px*var(--rkp,1));padding:.05rem .6rem}
.b3-z input{width:6rem;accent-color:var(--y,#2f6fb3)}.b3-r{position:absolute;border:1.5px solid #2f6fb3;background:rgba(47,111,179,.12);pointer-events:none}.b3-r.streif{border-style:dashed;border-color:#2b8a3e;background:rgba(43,138,62,.12)}.b3-r.ab{border-color:#c62f2a;background:rgba(198,47,42,.1)}
.b3.rahmen canvas{cursor:crosshair}
.b3{position:relative;width:100%;height:min(72vh,720px);min-height:320px;border:1px solid var(--line,#d5d9de);border-radius:calc(8px*var(--rk,1));overflow:hidden;background:linear-gradient(#f4f6f8,#e3e7eb);touch-action:none}
.b3 canvas{width:100%;height:100%;display:block;cursor:grab}.b3 canvas:active{cursor:grabbing}
.b3-l{position:absolute;left:.5rem;top:.5rem;display:flex;flex-wrap:wrap;align-items:center;gap:.3rem;max-width:calc(100% - 1rem)}
.b3-l button{font:inherit;font-size:.78rem;border:1px solid var(--line,#c9ced4);background:rgba(255,255,255,.88);color:#23282b;border-radius:calc(99px*var(--rkp,1));padding:.12rem .6rem;cursor:pointer}
.b3-l button.on{border-color:var(--y,#2f6fb3);box-shadow:inset 0 0 0 1px var(--y,#2f6fb3);font-weight:600}
.b3-k{position:absolute;left:.5rem;bottom:.5rem;display:flex;flex-wrap:wrap;gap:.2rem .6rem;font-size:.74rem;color:#23282b;background:rgba(255,255,255,.85);border-radius:6px;padding:.25rem .5rem}
.b3-k i{display:inline-block;width:.75rem;height:.75rem;border-radius:2px;margin-right:.25rem;vertical-align:-.1rem}
.b3-i{position:absolute;right:.5rem;bottom:2.6rem;max-width:min(320px,70%);background:rgba(255,255,255,.95);color:#23282b;border:1px solid #c9ced4;border-radius:8px;padding:.45rem .6rem;font-size:.82rem}
.b3-i b{display:block}.b3-m{position:absolute;inset:0;display:grid;place-items:center;color:#59606a;font-size:.9rem;padding:1rem;text-align:center}
.b3 [hidden]{display:none}.b3:focus{outline:none}.b3-l button[data-b3x]{border-color:#7b2ff7;color:#5b1fc4;font-weight:600}`;

  function mat(a, b) { const o = new Float32Array(16); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k]; o[i * 4 + j] = s; } return o; }
  function persp(f, a, n, w) { const t = 1 / Math.tan(f / 2); return new Float32Array([t / a, 0, 0, 0, 0, t, 0, 0, 0, 0, (w + n) / (n - w), -1, 0, 0, 2 * w * n / (n - w), 0]); }
  function blick(e, c, u) {
    const z = norm([e[0] - c[0], e[1] - c[1], e[2] - c[2]]), x = norm(kreuz(u, z)), y = kreuz(z, x);
    return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, e), -dot(y, e), -dot(z, e), 1]);
  }
  const kreuz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };

  const ZUG = 9, SEIT = 1;   // höchstens: 9 m je Geschoss nach oben, seitlich noch einmal der Abstand zur Mitte (20.11.2026: „das dürfte ein bisschen mehr“)
  const VS = `attribute vec3 p;attribute vec3 n;attribute vec4 c;attribute float g;attribute vec2 q;uniform mat4 m;uniform float zug;uniform float seit;varying vec4 vc;varying vec3 vn;void main(){vc=c;vn=n;gl_Position=m*vec4(p.x+q.x*seit,p.y+q.y*seit,p.z+g*zug,1.0);}`;   // g = Geschoss, zug = Meter je Geschoss; q = Mitte des Bauteils, seit = seitlich auseinander (Anteil des Abstands zur Mitte)
  const FS = `precision mediump float;varying vec4 vc;varying vec3 vn;uniform vec3 l;void main(){float h=0.55+0.45*abs(dot(normalize(vn),l));gl_FragColor=vec4(vc.rgb*h,vc.a);}`;
  const LV = `attribute vec3 p;attribute float g;attribute vec2 q;uniform mat4 m;uniform float zug;uniform float seit;void main(){gl_Position=m*vec4(p.x+q.x*seit,p.y+q.y*seit,p.z+g*zug,1.0);}`, LF = `precision mediump float;uniform vec4 f;void main(){gl_FragColor=f;}`;   // Randlinien
  const PS = `precision mediump float;varying vec4 vc;varying vec3 vn;void main(){gl_FragColor=vec4(vc.rgb,1.0);}`;

  function mount(el, o = {}) {
    const D = el.ownerDocument || document, W = D.defaultView || window;   // abgedocktes Fenster (seite.js) = eigenes Dokument: Stil auch dort
    if (!W.bp3dStil) {   // Stil als CSSOM-Blatt – geht auch unter strenger CSP (Bauherrenportal: style-src 'self'); sonst <style>
      W.bp3dStil = true;
      try { const b = new W.CSSStyleSheet(); b.replaceSync(STIL); D.adoptedStyleSheets = [...D.adoptedStyleSheets, b]; } catch { const s = D.createElement('style'); s.id = 'b3-stil'; s.textContent = STIL; D.head.appendChild(s); }
    }
    el.innerHTML = '<div class="b3"><canvas></canvas><div class="b3-l"></div><div class="b3-k"></div><div class="b3-r" hidden></div><div class="b3-i" hidden></div><div class="b3-m">3D-Ansicht wird geladen …</div></div>';
    const box = el.querySelector('.b3'), cv = box.querySelector('canvas'), meld = (t) => { const m = box.querySelector('.b3-m'); m.hidden = !t; m.textContent = t || ''; };
    const gl = cv.getContext('webgl', { antialias: true, preserveDrawingBuffer: true });
    if (!gl) { meld('Dieser Browser kann keine 3D-Grafik (WebGL) anzeigen.'); return; }
    const prog = (fs) => { const p = gl.createProgram(); [[gl.VERTEX_SHADER, VS], [gl.FRAGMENT_SHADER, fs]].forEach(([t, q]) => { const s = gl.createShader(t); gl.shaderSource(s, q); gl.compileShader(s); gl.attachShader(p, s); }); gl.linkProgram(p); return p; };
    const P = prog(FS), PP = prog(PS), PL = (() => { const p = gl.createProgram(); [[gl.VERTEX_SHADER, LV], [gl.FRAGMENT_SHADER, LF]].forEach(([t, q]) => { const x = gl.createShader(t); gl.shaderSource(x, q); gl.compileShader(x); gl.attachShader(p, x); }); gl.linkProgram(p); return p; })();
    const MODI = (o.modi || []).slice(), WAHL = new Set();
    const S = { N: null, zug: 0, seit: 0, infoE: null, rahmen: false, farbe: o.start || 'massnahme', aus: new Set(), dach: true, yaw: -2.3, pitch: 0.5, dist: 30, ziel: [0, 0, 0], puf: null, mitte: [0, 0, 0] };
    const zu = {};   // IFC-Objekt → Zeile der Checkliste (Status, Name, Nummer)
    (o.zeilen || []).forEach((z) => (z.ids || []).forEach((i, k) => { zu[i] = { z, nr: (z.nummern || [])[k] || '' }; }));

    let HV = o.hervor ? new Set(o.hervor.map(Number)) : null;   // hervorheben (z. B. die Objekte der markierten Zeile): alles andere blass
    const modus = () => MODI.find((m) => m.key === S.farbe);
    function farbe(e) {
      if (WAHL.has(e.i)) return [0.48, 0.18, 0.97, 1];   // angewählt: violett (hebt sich von Rot/Grün/Gelb der Färbungen ab)
      const f = farbe0(e);
      return HV && HV.size && !HV.has(e.i) ? [f[0] * 0.35 + 0.62, f[1] * 0.35 + 0.62, f[2] * 0.35 + 0.62, Math.min(f[3], 0.35)] : f;
    }
    function farbe0(e) {
      const M = modus(); if (M) { const c = M.farbe(e); return c ? [...rgb(c), glas(e) ? 0.85 : 1] : [0.84, 0.85, 0.86, glas(e) ? 0.6 : 1]; }   // gehört nicht dazu: hellgrauer Körper – nie Glas (20.11.2026: sonst blieb ein Drahtmodell mit den ein, zwei Bauteilen des Nachweises)
      if (S.farbe === 'massnahme') { const r = zu[e.i]; return [...rgb(r ? MASS[r.z.status] ? MASS[r.z.status][0] : '#d0ccc2' : '#d8d5ce'), glas(e) ? 0.85 : 1]; }
      return [...rgb(e.c || TYPF[e.t]), e.a ? Math.max(0.35, 1 - e.a) : glas(e) && !e.c ? 0.55 : 1];
    }
    function kasten(e) {   // Umriss des Bauteils (relativ zur Mitte des Modells) und seine Mitte im Grundriss – für Rahmen und „seitlich auseinander“
      if (!e._b) { const b = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9], m = S.mitte; for (let k = 0; k < e.v.length; k += 3) for (let a = 0; a < 3; a++) { const w = e.v[k + a] / 100 - m[a]; if (w < b[a]) b[a] = w; if (w > b[a + 3]) b[a + 3] = w; } e._b = b; e._q = [(b[0] + b[3]) / 2, (b[1] + b[4]) / 2]; }
      return e._b;
    }
    function bauen() {   // sichtbare Elemente → Puffer (undurchsichtig, durchsichtig) mit Normalen, Farben und Pick-Farben
      const N = S.N, sicht = N.e.filter((e) => !S.aus.has(e.g) && (S.dach || e.t !== 'r'));
      sicht.forEach(kasten);
      if (!N._h) { N._h = 1; const W = new Map(N.e.map((e) => [e.i, e])); N.e.forEach((e) => { const w = e.h && W.get(e.h); if (w) { kasten(e); kasten(w); e._q = w._q; } }); }   // Fenster, Türen, Öffnungen ziehen mit ihrer Wand
      const teile = [[], []];
      sicht.forEach((e, k) => { const c = farbe(e); teile[c[3] < 0.99 ? 1 : 0].push([e, c, k + 1]); });
      S.sicht = sicht;
      S.puf = teile.map((T) => {
        let n = 0; T.forEach(([e]) => { n += e.v.length / 3; });
        const p = new Float32Array(n * 3), nn = new Float32Array(n * 3), c = new Float32Array(n * 4), pc = new Float32Array(n * 4), gg = new Float32Array(n), qq = new Float32Array(n * 2);
        let j = 0;
        T.forEach(([e, f, id]) => {
          const v = e.v;
          for (let k = 0; k < v.length; k += 9) {
            const a = [v[k] / 100 - S.mitte[0], v[k + 1] / 100 - S.mitte[1], v[k + 2] / 100 - S.mitte[2]], b = [v[k + 3] / 100 - S.mitte[0], v[k + 4] / 100 - S.mitte[1], v[k + 5] / 100 - S.mitte[2]], d = [v[k + 6] / 100 - S.mitte[0], v[k + 7] / 100 - S.mitte[1], v[k + 8] / 100 - S.mitte[2]];
            const nv = norm(kreuz([b[0] - a[0], b[1] - a[1], b[2] - a[2]], [d[0] - a[0], d[1] - a[1], d[2] - a[2]]));
            [a, b, d].forEach((q) => { p.set(q, j * 3); nn.set(nv, j * 3); c.set(f, j * 4); pc.set([(id & 255) / 255, (id >> 8 & 255) / 255, (id >> 16 & 255) / 255, 1], j * 4); gg[j] = e.g || 0; qq.set(e._q, j * 2); j++; });
          }
        });
        const buf = (x) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, x, gl.STATIC_DRAW); return b; };
        return { n, p: buf(p), nn: buf(nn), c: buf(c), pc: buf(pc), g: buf(gg), q: buf(qq) };
      });
      /* Randlinien je Bauteil (19.11.2026: „abgegrenzter, mit Randlinie – hilft, die Bauteile zuzuordnen“): Kanten, die nur ein Dreieck hat oder an
         denen die Fläche abknickt (> 20°) – keine Dreieckskanten mitten in einer ebenen Fläche. Blasse Bauteile (Hervorheben) mit blasser Linie. */
      const L = [[], [], []], LG = [[], [], []], LQ = [[], [], []], WF = [], WG = [], WQ = [];   // normal · blass (nicht hervorgehoben) · angewählt; WF = Flächen der angewählten (scheinen durch)
      sicht.forEach((e) => {
        if (!e._k) {   // Kanten je Bauteil nur einmal rechnen (bleiben beim Umfärben und Auswählen stehen)
          const v = e.v, K = new Map(), q = (k) => v[k] + ',' + v[k + 1] + ',' + v[k + 2], Z = [], m = S.mitte;
          for (let k = 0; k < v.length; k += 9) {
            const nv = norm(kreuz([v[k + 3] - v[k], v[k + 4] - v[k + 1], v[k + 5] - v[k + 2]], [v[k + 6] - v[k], v[k + 7] - v[k + 1], v[k + 8] - v[k + 2]]));
            [[k, k + 3], [k + 3, k + 6], [k + 6, k]].forEach(([x, y]) => { const a1 = q(x), b1 = q(y), key = a1 < b1 ? a1 + '|' + b1 : b1 + '|' + a1; const E = K.get(key); if (E) E.n.push(nv); else K.set(key, { x, y, n: [nv] }); });
          }
          K.forEach((E) => { if (E.n.length === 2 && Math.abs(dot(E.n[0], E.n[1])) > 0.94) return;
            Z.push(v[E.x] / 100 - m[0], v[E.x + 1] / 100 - m[1], v[E.x + 2] / 100 - m[2], v[E.y] / 100 - m[0], v[E.y + 1] / 100 - m[1], v[E.y + 2] / 100 - m[2]); });
          e._k = Z;
        }
        const k = WAHL.has(e.i) ? 2 : HV && HV.size && !HV.has(e.i) ? 1 : 0, Z = L[k], G = LG[k], Q = LQ[k];
        for (let i = 0; i < e._k.length; i++) Z.push(e._k[i]);
        for (let i = 0; i < e._k.length / 3; i++) { G.push(e.g || 0); Q.push(e._q[0], e._q[1]); }
        if (k === 2) { const v = e.v, m = S.mitte; for (let i = 0; i < v.length; i += 3) { WF.push(v[i] / 100 - m[0], v[i + 1] / 100 - m[1], v[i + 2] / 100 - m[2]); WG.push(e.g || 0); WQ.push(e._q[0], e._q[1]); } }
      });
      cv.dataset.kanten = (L[0].length + L[1].length + L[2].length) / 6; cv.dataset.wahl = WAHL.size;
      { const x = box.querySelector('[data-b3x]'); if (x) { x.hidden = !WAHL.size; x.textContent = '✕ Auswahl aufheben' + (WAHL.size > 1 ? ' (' + WAHL.size + ')' : ''); } }   // für den Test
      const pf = (x) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(x), gl.STATIC_DRAW); return b; };
      S.lin = L.map((Z, k) => ({ n: Z.length / 3, b: pf(Z), g: pf(LG[k]), q: pf(LQ[k]) }));
      S.wf = WF.length ? { n: WF.length / 3, b: pf(WF), g: pf(WG), q: pf(WQ) } : null;
      zeichne();
    }
    function attr(pr, name, b, g) { const l = gl.getAttribLocation(pr, name); if (l < 0) return; gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, g, gl.FLOAT, false, 0, 0); }
    function mvp() {
      const w = cv.clientWidth, h = cv.clientHeight, cp = Math.cos(S.pitch), hub = S.zug * Math.max(0, (S.N ? S.N.geschosse.length : 1) - 1), d = S.dist * (1 + S.seit * 0.45) + hub * 1.1, z = [S.ziel[0], S.ziel[1], S.ziel[2] + hub / 2];
      const auge = [z[0] + d * cp * Math.cos(S.yaw), z[1] + d * cp * Math.sin(S.yaw), z[2] + d * Math.sin(S.pitch)];
      return mat(persp(0.8, w / Math.max(1, h), Math.max(0.05, d / 200), d * 20), blick(auge, z, [0, 0, 1]));
    }
    function zeichne(pick) {
      if (!S.puf) return;
      const r = window.devicePixelRatio || 1, w = Math.round(cv.clientWidth * r), h = Math.round(cv.clientHeight * r);
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
      gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); gl.enable(gl.DEPTH_TEST);
      const pr = pick ? PP : P, M = mvp(); gl.useProgram(pr);
      gl.uniformMatrix4fv(gl.getUniformLocation(pr, 'm'), false, M); gl.uniform1f(gl.getUniformLocation(pr, 'zug'), S.zug); gl.uniform1f(gl.getUniformLocation(pr, 'seit'), S.seit);
      if (!pick) gl.uniform3fv(gl.getUniformLocation(pr, 'l'), norm([-0.4, -0.7, 0.8]));
      S.puf.forEach((B, k) => {
        if (!B.n) return;
        if (k === 1 && !pick) { gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false); } else { gl.disable(gl.BLEND); gl.depthMask(true); }
        attr(pr, 'p', B.p, 3); attr(pr, 'n', B.nn, 3); attr(pr, 'c', pick ? B.pc : B.c, 4); attr(pr, 'g', B.g, 1); attr(pr, 'q', B.q, 2);
        gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(1, 1);   // Flächen ein wenig zurück – die Randlinien liegen sichtbar darauf
        gl.drawArrays(gl.TRIANGLES, 0, B.n); gl.disable(gl.POLYGON_OFFSET_FILL);
      });
      if (!pick && S.lin) {
        gl.useProgram(PL); gl.uniformMatrix4fv(gl.getUniformLocation(PL, 'm'), false, M); gl.uniform1f(gl.getUniformLocation(PL, 'zug'), S.zug); gl.uniform1f(gl.getUniformLocation(PL, 'seit'), S.seit); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
        for (let i = 0; i < 8; i++) gl.disableVertexAttribArray(i);   // n, c der Flächen aus – die Linien haben nur p
        S.lin.forEach((B, k) => { if (!B.n) return; gl.uniform4fv(gl.getUniformLocation(PL, 'f'), k === 2 ? [0.2, 0.0, 0.5, 1] : k ? [0.2, 0.22, 0.25, 0.18] : [0.05, 0.06, 0.08, 0.9]); attr(PL, 'p', B.b, 3); attr(PL, 'g', B.g, 1); attr(PL, 'q', B.q, 2); gl.drawArrays(gl.LINES, 0, B.n); });
        /* Angewähltes scheint durch alles hindurch (20.11.2026: kleine oder verdeckte Bauteile wie eine Wand im Innenhof sah man sonst nicht leuchten) */
        if (S.wf) { gl.disable(gl.DEPTH_TEST); gl.uniform4fv(gl.getUniformLocation(PL, 'f'), [0.48, 0.18, 0.97, 0.22]); attr(PL, 'p', S.wf.b, 3); attr(PL, 'g', S.wf.g, 1); attr(PL, 'q', S.wf.q, 2); gl.drawArrays(gl.TRIANGLES, 0, S.wf.n);
          const B = S.lin[2]; if (B.n) { gl.uniform4fv(gl.getUniformLocation(PL, 'f'), [0.36, 0.1, 0.8, 0.75]); attr(PL, 'p', B.b, 3); attr(PL, 'g', B.g, 1); attr(PL, 'q', B.q, 2); gl.drawArrays(gl.LINES, 0, B.n); }
          gl.enable(gl.DEPTH_TEST); }
      }
      gl.depthMask(true); gl.disable(gl.BLEND);
    }
    function antippen(x, y, dazu) {
      zeichne(true);
      const r = window.devicePixelRatio || 1, px = new Uint8Array(4), rc = cv.getBoundingClientRect();
      gl.readPixels(Math.round((x - rc.left) * r), Math.round(cv.height - (y - rc.top) * r), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      zeichne();
      const id = px[0] + (px[1] << 8) + (px[2] << 16), e = id && S.sicht[id - 1], I = box.querySelector('.b3-i');
      if (o.wahl) {
        if (!e) { if (!dazu) { WAHL.clear(); HV = null; } } else if (dazu) { if (WAHL.has(e.i)) WAHL.delete(e.i); else WAHL.add(e.i); } else { const nur = WAHL.size === 1 && WAHL.has(e.i); WAHL.clear(); if (!nur) WAHL.add(e.i); }
        bauen(); if (o.onWahl) o.onWahl([...WAHL], e || null);
      }
      S.infoE = e || null;
      if (!e) { I.hidden = true; return; }
      if (o.info) return infoNeu();
      const z = zu[e.i];
      I.hidden = false;
      I.innerHTML = z ? `<b>${esc(z.z.name)}</b>${z.nr ? esc(z.nr) + ' · ' : ''}${esc((MASS[z.z.status] || [, z.z.status])[1])}${z.z.kurz ? `<br><small>${esc(z.z.kurz)}</small>` : ''}`
        : `<b>${esc(TYPN[e.t] || 'Bauteil')}</b><small>nicht in der Checkliste</small>`;
    }
    function infoNeu() {   // Feld unten rechts: neu schreiben, wenn sich in der App etwas geändert hat (z. B. eben in den Nachweis übernommen)
      const I = box.querySelector('.b3-i'), e = S.infoE; if (!o.info || !I) return;
      const t = e ? o.info(e) : ''; I.hidden = !t; if (t) I.innerHTML = t;
    }
    function leiste() {
      const G = S.N.geschosse;
      box.querySelector('.b3-l').innerHTML = MODI.map((m) => `<button type="button" data-b3f="${esc(m.key)}" class="${S.farbe === m.key ? 'on' : ''}">${esc(m.name)}</button>`).join('')
        + `<button type="button" data-b3f="massnahme" class="${S.farbe === 'massnahme' ? 'on' : ''}">Maßnahmen</button><button type="button" data-b3f="modell" class="${S.farbe === 'modell' ? 'on' : ''}">Farben des Modells</button>`
        + (o.wahl ? `<button type="button" data-b3x ${WAHL.size ? '' : 'hidden'} title="Auswahl aufheben (Esc)">✕ Auswahl aufheben${WAHL.size > 1 ? ' (' + WAHL.size + ')' : ''}</button><button type="button" data-b3w class="${S.rahmen ? 'on' : ''}" title="Rahmen ziehen wählt viele Bauteile (nach rechts: ganz darin · nach links: berührt) – Strg wählt ab; auch mit Alt + Ziehen">▭ Rahmen</button>` : '')
        + G.map((g, k) => `<button type="button" data-b3g="${k}" class="${S.aus.has(k) ? '' : 'on'}">${esc(g.n)}</button>`).join('')
        + (S.N.e.some((e) => e.t === 'r') ? `<button type="button" data-b3d class="${S.dach ? 'on' : ''}">Dach</button>` : '') + '<button type="button" data-b3r title="Ansicht zurücksetzen">⟲</button>'
        + (G.length > 1 ? `<label class="b3-z">↕ auseinander <input type="range" min="0" max="100" value="${Math.round(S.zug / ZUG * 100)}" data-b3z aria-label="Geschosse auseinanderziehen" title="Geschosse auseinanderziehen"></label>` : '')
        + `<label class="b3-z">↔ seitlich <input type="range" min="0" max="100" value="${Math.round(S.seit / SEIT * 100)}" data-b3s aria-label="Bauteile seitlich auseinanderziehen" title="Bauteile seitlich auseinanderziehen – weg von der Mitte"></label>`;
      const k = box.querySelector('.b3-k'); k.replaceChildren();   // Farben per CSSOM (kein style-Attribut – CSP im Bauherrenportal)
      const M = modus(), E = M ? (M.legende || []) : S.farbe === 'massnahme' ? Object.values(MASS) : [];
      E.forEach(([c, t]) => { const sp = document.createElement('span'), i = document.createElement('i'); i.style.background = c; sp.append(i, t); k.append(sp); });
      if (o.wahl) { const sp = document.createElement('span'), i = document.createElement('i'); i.style.background = '#7b2ff7'; sp.append(i, 'angewählt'); k.append(sp); }
      box.querySelector('.b3-k').hidden = !E.length;
      box.classList.toggle('rahmen', S.rahmen);
    }
    function start() {
      const L = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
      S.N.e.forEach((e) => { for (let k = 0; k < e.v.length; k += 3) for (let a = 0; a < 3; a++) { const x = e.v[k + a] / 100; if (x < L[a]) L[a] = x; if (x > L[a + 3]) L[a + 3] = x; } });
      S.mitte = [(L[0] + L[3]) / 2, (L[1] + L[4]) / 2, L[2]];
      S.ziel = [0, 0, (L[5] - L[2]) / 2.5]; S.dist = Math.max(8, Math.hypot(L[3] - L[0], L[4] - L[1], L[5] - L[2]) * 1.4); S.yaw = -2.3; S.pitch = 0.5;
    }
    box.querySelector('.b3-l').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.b3f) S.farbe = b.dataset.b3f;
      if (b.dataset.b3g) { const g = +b.dataset.b3g; if (S.aus.has(g)) S.aus.delete(g); else S.aus.add(g); }
      if ('b3d' in b.dataset) S.dach = !S.dach;
      if ('b3w' in b.dataset) { S.rahmen = !S.rahmen; return leiste(); }
      if ('b3x' in b.dataset) return wahlWeg();
      if ('b3r' in b.dataset) { start(); return zeichne(); }
      leiste(); bauen();
    });
    box.querySelector('.b3-l').addEventListener('input', (e) => { if ('b3z' in e.target.dataset) { S.zug = e.target.value / 100 * ZUG; zeichne(); } if ('b3s' in e.target.dataset) { S.seit = e.target.value / 100 * SEIT; zeichne(); } });
    /* Mausrahmen wie im CAD: nach rechts gezogen = nur was ganz im Rahmen liegt, nach links = alles, was er berührt; Strg nimmt heraus */
    let RZ = null; const RD = box.querySelector('.b3-r');
    function rahmenBild(ab) { if (!RZ) { RD.hidden = true; return; } const r = box.getBoundingClientRect(); RD.hidden = false; RD.className = 'b3-r' + (RZ.x1 < RZ.x0 ? ' streif' : '') + (ab ? ' ab' : '');
      RD.style.left = Math.min(RZ.x0, RZ.x1) - r.left + 'px'; RD.style.top = Math.min(RZ.y0, RZ.y1) - r.top + 'px'; RD.style.width = Math.abs(RZ.x1 - RZ.x0) + 'px'; RD.style.height = Math.abs(RZ.y1 - RZ.y0) + 'px'; }
    function rahmenWahl(z, ab) {
      const rc = cv.getBoundingClientRect(), M = mvp(), x0 = Math.min(z.x0, z.x1) - rc.left, x1 = Math.max(z.x0, z.x1) - rc.left, y0 = Math.min(z.y0, z.y1) - rc.top, y1 = Math.max(z.y0, z.y1) - rc.top, ganz = z.x1 >= z.x0, m = S.mitte;
      (S.sicht || []).forEach((e) => {
        kasten(e);
        let a = 1e9, b = -1e9, c = 1e9, d = -1e9, ok = true; const B = e._b, hz = (e.g || 0) * S.zug, hx = e._q[0] * S.seit, hy = e._q[1] * S.seit;
        for (let k = 0; k < 8 && ok; k++) { const X = B[k & 1 ? 3 : 0] + hx, Y = B[k & 2 ? 4 : 1] + hy, Zz = B[k & 4 ? 5 : 2] + hz, w = M[3] * X + M[7] * Y + M[11] * Zz + M[15]; if (w <= 0) { ok = false; break; }
          const sx = ((M[0] * X + M[4] * Y + M[8] * Zz + M[12]) / w * 0.5 + 0.5) * rc.width, sy = (1 - ((M[1] * X + M[5] * Y + M[9] * Zz + M[13]) / w * 0.5 + 0.5)) * rc.height;
          if (sx < a) a = sx; if (sx > b) b = sx; if (sy < c) c = sy; if (sy > d) d = sy; }
        if (ok && (ganz ? a >= x0 && b <= x1 && c >= y0 && d <= y1 : a <= x1 && b >= x0 && c <= y1 && d >= y0)) { if (ab) WAHL.delete(e.i); else WAHL.add(e.i); } });
      bauen(); if (o.onWahl) o.onWahl([...WAHL], null);
    }
    function wahlWeg() { if (!WAHL.size && !HV) return; WAHL.clear(); HV = null; box.querySelector('.b3-i').hidden = true; bauen(); if (o.onWahl) o.onWahl([], null); }
    box.tabIndex = -1; box.addEventListener('keydown', (e) => { if (e.key === 'Escape' && o.wahl && WAHL.size) { e.stopPropagation(); wahlWeg(); } });
    cv.addEventListener('pointerdown', () => box.focus({ preventScroll: true }));
    const P_ = new Map(); let weg = 0, abst = 0;
    cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture(e.pointerId); P_.set(e.pointerId, [e.clientX, e.clientY]); weg = 0;
      RZ = o.wahl && e.button === 0 && P_.size === 1 && !e.shiftKey && (S.rahmen ? !e.altKey : e.altKey) ? { x0: e.clientX, y0: e.clientY, x1: e.clientX, y1: e.clientY } : null; if (P_.size === 2) { const [a, b] = [...P_.values()]; abst = Math.hypot(a[0] - b[0], a[1] - b[1]); } });
    cv.addEventListener('pointermove', (e) => {
      const alt = P_.get(e.pointerId); if (!alt) return;
      const dx = e.clientX - alt[0], dy = e.clientY - alt[1]; weg += Math.abs(dx) + Math.abs(dy); P_.set(e.pointerId, [e.clientX, e.clientY]);
      if (RZ && P_.size === 1) { RZ.x1 = e.clientX; RZ.y1 = e.clientY; return rahmenBild(e.ctrlKey || e.metaKey); }
      if (P_.size === 2) {
        RZ = null; rahmenBild(); const [a, b] = [...P_.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        if (abst) S.dist = Math.max(1, Math.min(2000, S.dist * abst / d)); abst = d; schieben(dx / 2, dy / 2);
      } else if (e.shiftKey || e.buttons === 2) schieben(dx, dy);
      else { S.yaw -= dx * 0.008; S.pitch = Math.max(-0.2, Math.min(1.5, S.pitch + dy * 0.006)); }
      zeichne();
    });
    const los = (e) => { const z = RZ; RZ = null; rahmenBild(); if (z && weg >= 6 && e.type === 'pointerup') rahmenWahl(z, e.ctrlKey || e.metaKey); else if (P_.size === 1 && weg < 6 && e.type === 'pointerup') antippen(e.clientX, e.clientY, e.ctrlKey || e.metaKey); P_.delete(e.pointerId); if (P_.size < 2) abst = 0; };
    cv.addEventListener('pointerup', los); cv.addEventListener('pointercancel', los);
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
    cv.addEventListener('wheel', (e) => { e.preventDefault(); S.dist = Math.max(1, Math.min(2000, S.dist * Math.exp(e.deltaY * 0.0012))); zeichne(); }, { passive: false });
    function schieben(dx, dy) {
      const s = S.dist / Math.max(200, cv.clientHeight) * 1.2, r = [-Math.sin(S.yaw), Math.cos(S.yaw), 0];
      S.ziel = [S.ziel[0] - r[0] * dx * s, S.ziel[1] - r[1] * dx * s, S.ziel[2] + dy * s];
    }
    if (window.ResizeObserver) new ResizeObserver(() => zeichne()).observe(box);
    (o.netz ? Promise.resolve(o.netz) : fetch(o.url, { credentials: 'same-origin' }).then(async (r) => { const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Die 3D-Ansicht konnte nicht geladen werden.'); return j; }))
      .then((N) => { S.N = N; if (!N.e.length) return meld('Dieser Planstand hat keine Geometrie – die 3D-Ansicht gibt es nur mit einem eingelesenen IFC-Plan.'); meld(''); start(); leiste(); bauen(); })
      .catch((e) => meld(e.message));
    return { waehle: (ids) => { const vor = [...WAHL].join(); WAHL.clear(); (ids || []).forEach((i) => WAHL.add(+i));
        if (S.N && o.info && WAHL.size && [...WAHL].join() !== vor) { S.infoE = S.N.e.find((e) => WAHL.has(e.i)) || S.infoE; infoNeu(); }   // von außen gewählt: das Feld zeigt dieses Bauteil
        if (S.N) bauen(); },
      farben: (modi) => { if (modi) { MODI.length = 0; modi.forEach((m) => MODI.push(m)); } if (S.N && S.N.e.length) { leiste(); bauen(); infoNeu(); } },
      hervor: (ids) => { HV = ids && ids.length ? new Set(ids.map(Number)) : null; if (S.N) bauen(); }, neu: (zeilen) => { Object.keys(zu).forEach((k) => delete zu[k]); (zeilen || []).forEach((z) => (z.ids || []).forEach((i, k) => { zu[i] = { z, nr: (z.nummern || [])[k] || '' }; })); if (S.N) bauen(); } };
  }
  window.bp3d = { mount };
}());
