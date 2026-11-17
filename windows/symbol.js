/* Symbol der Windows-App beim Bauen erzeugen – aus demselben SVG wie die installierbare Web-App (shared/bpcore/head.py, APP_SVG).
   Bilder gehören nicht ins Repo (tools/tests/ordnung.py); so gibt es auch nur eine Quelle für das Logo.
   node symbol.js  → build/icon.png (256 px; electron-builder macht daraus das .ico) */
const fs = require('node:fs');
const path = require('node:path');

function svgAusKern() {
  const py = fs.readFileSync(path.join(__dirname, '..', 'shared', 'bpcore', 'head.py'), 'utf8');
  const m = /APP_SVG = \(([\s\S]*?)\)\r?\nAPP_DATEIEN/.exec(py);
  if (!m) throw new Error('APP_SVG in shared/bpcore/head.py nicht gefunden');
  return m[1].split('\n').map((z) => (/'(.*)'/.exec(z) || [, ''])[1]).join('');
}

if (require.main === module) {
  const { Resvg } = require('@resvg/resvg-js');
  const png = new Resvg(svgAusKern(), { fitTo: { mode: 'width', value: 256 } }).render().asPng();
  fs.mkdirSync(path.join(__dirname, 'build'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, 'build', 'icon.png'), png);
  console.log('build/icon.png', png.length, 'Bytes');
}
module.exports = { svgAusKern };
