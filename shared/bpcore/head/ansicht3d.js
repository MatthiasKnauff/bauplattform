/* 3D-Ansicht des Gebäudemodells – eigener kleiner Betrachter (WebGL, ohne Zusatzbibliothek), GO 16.11.2026 („Gebäudemodell als Mitte“, Punkt 20).
   Der Kern rechnet je Planstand einmal die Dreiecke (bpcore/netz.py, /api/bp/modell/<pid>/netz); hier wird nur noch gezeichnet.
   Drehen (ziehen), Zoomen (Rad, zwei Finger), Verschieben (Umschalt/rechte Taste, zwei Finger), Geschosse und Dach ein/aus,
   Färben nach Maßnahme (aus der Bauteil-Checkliste) oder nach den Farben des Modells, Bauteil antippen → Name, Nummer, Maßnahme.

   bp3d.mount(el, { url, zeilen, titel }) – url liefert das Netz, zeilen = bauteilliste.zeilen (für Farben und Antippen).
   Wird erst beim Öffnen geladen (Gebäudemodell → „3D“, Bauherrenportal). */
(function () {
  if (window.bp3d) return;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const MASS = { neu: ['#3f9d55', 'neu'], erneuern: ['#2f6fb3', 'erneuern'], instandsetzen: ['#d9a400', 'instandsetzen'], bleibt: ['#b9b7af', 'bleibt'],
    abbruch: ['#c62f2a', 'Abbruch'], pruefen: ['#8e5bb5', 'prüfen'], offen: ['#efe9dc', 'noch offen'] };
  const TYPF = { w: '#ece8df', f: '#9cc3e0', d: '#a7805a', s: '#b9b6ad', r: '#4a4d55', x: '#a9a59b' };
  const TYPN = { w: 'Wand', f: 'Fenster', d: 'Tür', s: 'Decke / Platte', r: 'Dach', x: 'Bauteil' };
  const rgb = (h) => { const n = parseInt(String(h || '#999999').slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
  const STIL = `.b3{position:relative;width:100%;height:min(72vh,720px);min-height:320px;border:1px solid var(--line,#d5d9de);border-radius:calc(8px*var(--rk,1));overflow:hidden;background:linear-gradient(#f4f6f8,#e3e7eb);touch-action:none}
.b3 canvas{width:100%;height:100%;display:block;cursor:grab}.b3 canvas:active{cursor:grabbing}
.b3-l{position:absolute;left:.5rem;top:.5rem;display:flex;flex-wrap:wrap;gap:.3rem;max-width:calc(100% - 1rem)}
.b3-l button{font:inherit;font-size:.78rem;border:1px solid var(--line,#c9ced4);background:rgba(255,255,255,.88);color:#23282b;border-radius:calc(99px*var(--rkp,1));padding:.12rem .6rem;cursor:pointer}
.b3-l button.on{border-color:var(--y,#2f6fb3);box-shadow:inset 0 0 0 1px var(--y,#2f6fb3);font-weight:600}
.b3-k{position:absolute;left:.5rem;bottom:.5rem;display:flex;flex-wrap:wrap;gap:.2rem .6rem;font-size:.74rem;color:#23282b;background:rgba(255,255,255,.85);border-radius:6px;padding:.25rem .5rem}
.b3-k i{display:inline-block;width:.75rem;height:.75rem;border-radius:2px;margin-right:.25rem;vertical-align:-.1rem}
.b3-i{position:absolute;right:.5rem;top:.5rem;max-width:min(320px,70%);background:rgba(255,255,255,.95);color:#23282b;border:1px solid #c9ced4;border-radius:8px;padding:.45rem .6rem;font-size:.82rem}
.b3-i b{display:block}.b3-m{position:absolute;inset:0;display:grid;place-items:center;color:#59606a;font-size:.9rem;padding:1rem;text-align:center}
.b3 [hidden]{display:none}`;

  function mat(a, b) { const o = new Float32Array(16); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k]; o[i * 4 + j] = s; } return o; }
  function persp(f, a, n, w) { const t = 1 / Math.tan(f / 2); return new Float32Array([t / a, 0, 0, 0, 0, t, 0, 0, 0, 0, (w + n) / (n - w), -1, 0, 0, 2 * w * n / (n - w), 0]); }
  function blick(e, c, u) {
    const z = norm([e[0] - c[0], e[1] - c[1], e[2] - c[2]]), x = norm(kreuz(u, z)), y = kreuz(z, x);
    return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, e), -dot(y, e), -dot(z, e), 1]);
  }
  const kreuz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };

  const VS = `attribute vec3 p;attribute vec3 n;attribute vec4 c;uniform mat4 m;varying vec4 vc;varying vec3 vn;void main(){vc=c;vn=n;gl_Position=m*vec4(p,1.0);}`;
  const FS = `precision mediump float;varying vec4 vc;varying vec3 vn;uniform vec3 l;void main(){float h=0.55+0.45*abs(dot(normalize(vn),l));gl_FragColor=vec4(vc.rgb*h,vc.a);}`;
  const PS = `precision mediump float;varying vec4 vc;varying vec3 vn;void main(){gl_FragColor=vec4(vc.rgb,1.0);}`;

  function mount(el, o = {}) {
    if (!document.getElementById('b3-stil')) { const s = document.createElement('style'); s.id = 'b3-stil'; s.textContent = STIL; document.head.appendChild(s); }
    el.innerHTML = '<div class="b3"><canvas></canvas><div class="b3-l"></div><div class="b3-k"></div><div class="b3-i" hidden></div><div class="b3-m">3D-Ansicht wird geladen …</div></div>';
    const box = el.querySelector('.b3'), cv = box.querySelector('canvas'), meld = (t) => { const m = box.querySelector('.b3-m'); m.hidden = !t; m.textContent = t || ''; };
    const gl = cv.getContext('webgl', { antialias: true, preserveDrawingBuffer: true });
    if (!gl) { meld('Dieser Browser kann keine 3D-Grafik (WebGL) anzeigen.'); return; }
    const prog = (fs) => { const p = gl.createProgram(); [[gl.VERTEX_SHADER, VS], [gl.FRAGMENT_SHADER, fs]].forEach(([t, q]) => { const s = gl.createShader(t); gl.shaderSource(s, q); gl.compileShader(s); gl.attachShader(p, s); }); gl.linkProgram(p); return p; };
    const P = prog(FS), PP = prog(PS);
    const S = { N: null, farbe: 'massnahme', aus: new Set(), dach: true, yaw: -2.3, pitch: 0.5, dist: 30, ziel: [0, 0, 0], puf: null, mitte: [0, 0, 0] };
    const zu = {};   // IFC-Objekt → Zeile der Checkliste (Status, Name, Nummer)
    (o.zeilen || []).forEach((z) => (z.ids || []).forEach((i, k) => { zu[i] = { z, nr: (z.nummern || [])[k] || '' }; }));

    function farbe(e) {
      if (S.farbe === 'massnahme') { const r = zu[e.i]; return [...rgb(r ? MASS[r.z.status] ? MASS[r.z.status][0] : '#d0ccc2' : '#d8d5ce'), e.t === 'f' ? 0.85 : 1]; }
      return [...rgb(e.c || TYPF[e.t]), e.a ? Math.max(0.35, 1 - e.a) : e.t === 'f' && !e.c ? 0.55 : 1];
    }
    function bauen() {   // sichtbare Elemente → Puffer (undurchsichtig, durchsichtig) mit Normalen, Farben und Pick-Farben
      const N = S.N, sicht = N.e.filter((e) => !S.aus.has(e.g) && (S.dach || e.t !== 'r'));
      const teile = [[], []];
      sicht.forEach((e, k) => { const c = farbe(e); teile[c[3] < 0.99 ? 1 : 0].push([e, c, k + 1]); });
      S.sicht = sicht;
      S.puf = teile.map((T) => {
        let n = 0; T.forEach(([e]) => { n += e.v.length / 3; });
        const p = new Float32Array(n * 3), nn = new Float32Array(n * 3), c = new Float32Array(n * 4), pc = new Float32Array(n * 4);
        let j = 0;
        T.forEach(([e, f, id]) => {
          const v = e.v;
          for (let k = 0; k < v.length; k += 9) {
            const a = [v[k] / 100 - S.mitte[0], v[k + 1] / 100 - S.mitte[1], v[k + 2] / 100 - S.mitte[2]], b = [v[k + 3] / 100 - S.mitte[0], v[k + 4] / 100 - S.mitte[1], v[k + 5] / 100 - S.mitte[2]], d = [v[k + 6] / 100 - S.mitte[0], v[k + 7] / 100 - S.mitte[1], v[k + 8] / 100 - S.mitte[2]];
            const nv = norm(kreuz([b[0] - a[0], b[1] - a[1], b[2] - a[2]], [d[0] - a[0], d[1] - a[1], d[2] - a[2]]));
            [a, b, d].forEach((q) => { p.set(q, j * 3); nn.set(nv, j * 3); c.set(f, j * 4); pc.set([(id & 255) / 255, (id >> 8 & 255) / 255, (id >> 16 & 255) / 255, 1], j * 4); j++; });
          }
        });
        const buf = (x) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, x, gl.STATIC_DRAW); return b; };
        return { n, p: buf(p), nn: buf(nn), c: buf(c), pc: buf(pc) };
      });
      zeichne();
    }
    function attr(pr, name, b, g) { const l = gl.getAttribLocation(pr, name); if (l < 0) return; gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, g, gl.FLOAT, false, 0, 0); }
    function mvp() {
      const w = cv.clientWidth, h = cv.clientHeight, cp = Math.cos(S.pitch);
      const auge = [S.ziel[0] + S.dist * cp * Math.cos(S.yaw), S.ziel[1] + S.dist * cp * Math.sin(S.yaw), S.ziel[2] + S.dist * Math.sin(S.pitch)];
      return mat(persp(0.8, w / Math.max(1, h), Math.max(0.05, S.dist / 200), S.dist * 20), blick(auge, S.ziel, [0, 0, 1]));
    }
    function zeichne(pick) {
      if (!S.puf) return;
      const r = window.devicePixelRatio || 1, w = Math.round(cv.clientWidth * r), h = Math.round(cv.clientHeight * r);
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
      gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); gl.enable(gl.DEPTH_TEST);
      const pr = pick ? PP : P, M = mvp(); gl.useProgram(pr);
      gl.uniformMatrix4fv(gl.getUniformLocation(pr, 'm'), false, M);
      if (!pick) gl.uniform3fv(gl.getUniformLocation(pr, 'l'), norm([-0.4, -0.7, 0.8]));
      S.puf.forEach((B, k) => {
        if (!B.n) return;
        if (k === 1 && !pick) { gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false); } else { gl.disable(gl.BLEND); gl.depthMask(true); }
        attr(pr, 'p', B.p, 3); attr(pr, 'n', B.nn, 3); attr(pr, 'c', pick ? B.pc : B.c, 4);
        gl.drawArrays(gl.TRIANGLES, 0, B.n);
      });
      gl.depthMask(true); gl.disable(gl.BLEND);
    }
    function antippen(x, y) {
      zeichne(true);
      const r = window.devicePixelRatio || 1, px = new Uint8Array(4), rc = cv.getBoundingClientRect();
      gl.readPixels(Math.round((x - rc.left) * r), Math.round(cv.height - (y - rc.top) * r), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      zeichne();
      const id = px[0] + (px[1] << 8) + (px[2] << 16), e = id && S.sicht[id - 1], I = box.querySelector('.b3-i');
      if (!e) { I.hidden = true; return; }
      const z = zu[e.i];
      I.hidden = false;
      I.innerHTML = z ? `<b>${esc(z.z.name)}</b>${z.nr ? esc(z.nr) + ' · ' : ''}${esc((MASS[z.z.status] || [, z.z.status])[1])}${z.z.kurz ? `<br><small>${esc(z.z.kurz)}</small>` : ''}`
        : `<b>${esc(TYPN[e.t] || 'Bauteil')}</b><small>nicht in der Checkliste</small>`;
    }
    function leiste() {
      const G = S.N.geschosse;
      box.querySelector('.b3-l').innerHTML = `<button type="button" data-b3f="massnahme" class="${S.farbe === 'massnahme' ? 'on' : ''}">Maßnahmen</button><button type="button" data-b3f="modell" class="${S.farbe === 'modell' ? 'on' : ''}">Farben des Modells</button>`
        + G.map((g, k) => `<button type="button" data-b3g="${k}" class="${S.aus.has(k) ? '' : 'on'}">${esc(g.n)}</button>`).join('')
        + (S.N.e.some((e) => e.t === 'r') ? `<button type="button" data-b3d class="${S.dach ? 'on' : ''}">Dach</button>` : '') + '<button type="button" data-b3r title="Ansicht zurücksetzen">⟲</button>';
      box.querySelector('.b3-k').innerHTML = S.farbe === 'massnahme' ? Object.values(MASS).map(([c, t]) => `<span><i style="background:${c}"></i>${t}</span>`).join('') : '';
      box.querySelector('.b3-k').hidden = S.farbe !== 'massnahme';
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
      if ('b3r' in b.dataset) { start(); return zeichne(); }
      leiste(); bauen();
    });
    const P_ = new Map(); let weg = 0, abst = 0;
    cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture(e.pointerId); P_.set(e.pointerId, [e.clientX, e.clientY]); weg = 0; if (P_.size === 2) { const [a, b] = [...P_.values()]; abst = Math.hypot(a[0] - b[0], a[1] - b[1]); } });
    cv.addEventListener('pointermove', (e) => {
      const alt = P_.get(e.pointerId); if (!alt) return;
      const dx = e.clientX - alt[0], dy = e.clientY - alt[1]; weg += Math.abs(dx) + Math.abs(dy); P_.set(e.pointerId, [e.clientX, e.clientY]);
      if (P_.size === 2) {
        const [a, b] = [...P_.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        if (abst) S.dist = Math.max(1, Math.min(2000, S.dist * abst / d)); abst = d; schieben(dx / 2, dy / 2);
      } else if (e.shiftKey || e.buttons === 2) schieben(dx, dy);
      else { S.yaw -= dx * 0.008; S.pitch = Math.max(-0.2, Math.min(1.5, S.pitch + dy * 0.006)); }
      zeichne();
    });
    const los = (e) => { if (P_.size === 1 && weg < 6 && e.type === 'pointerup') antippen(e.clientX, e.clientY); P_.delete(e.pointerId); if (P_.size < 2) abst = 0; };
    cv.addEventListener('pointerup', los); cv.addEventListener('pointercancel', los);
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
    cv.addEventListener('wheel', (e) => { e.preventDefault(); S.dist = Math.max(1, Math.min(2000, S.dist * Math.exp(e.deltaY * 0.0012))); zeichne(); }, { passive: false });
    function schieben(dx, dy) {
      const s = S.dist / Math.max(200, cv.clientHeight) * 1.2, r = [-Math.sin(S.yaw), Math.cos(S.yaw), 0];
      S.ziel = [S.ziel[0] - r[0] * dx * s, S.ziel[1] - r[1] * dx * s, S.ziel[2] + dy * s];
    }
    if (window.ResizeObserver) new ResizeObserver(() => zeichne()).observe(box);
    fetch(o.url, { credentials: 'same-origin' }).then(async (r) => { const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Die 3D-Ansicht konnte nicht geladen werden.'); return j; })
      .then((N) => { S.N = N; if (!N.e.length) return meld('Im Planstand ist keine Geometrie.'); meld(''); start(); leiste(); bauen(); })
      .catch((e) => meld(e.message));
    return { neu: (zeilen) => { Object.keys(zu).forEach((k) => delete zu[k]); (zeilen || []).forEach((z) => (z.ids || []).forEach((i, k) => { zu[i] = { z, nr: (z.nummern || [])[k] || '' }; })); if (S.N) bauen(); } };
  }
  window.bp3d = { mount };
}());
