// Für Prüfseiten, die einen Baustein OHNE das Bündel laden: die Bausteine nehmen seit 21.11.2026 `window.bpEsc` aus bp.js (eine Stelle statt einer
// Kopie je Datei). ESC ist genau diese Zeile aus bp.js als <script> – keine zweite Fassung im Test.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const bp = fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../shared/bpcore/head/bp.js'), 'utf8');
const m = /^const esc = (\(s\) => .*);$/m.exec(bp);
if (!m) throw new Error('esc in bp.js nicht gefunden');
export const ESC_JS = `window.bpEsc = ${m[1]};`;
export const ESC = `<script>${ESC_JS}</script>`;
