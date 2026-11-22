// pdf.js (vendor/pdfjs, wird per Workflow „pdf.js aktualisieren“ erneuert): die Aufrufe, die Baukasten und Apps benutzen, gibt es noch.
// Anlass: pdf.js 6 hat viewport.convertToViewportRectangle gestrichen – der Brief-Editor (Mängelrüge) blieb mit Fehler stehen.
// Aufruf:  node --test tools/tests/js/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const PDF = '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF';

for (const app of ['shared/bpcore']) {
  test(`pdf.js im Kern: Seite, Ansicht, Punkte umrechnen, Formularfelder`, async () => {
    const dir = path.join(ROOT, app, 'vendor/pdfjs');
    const warn = console.warn; console.warn = () => {};
    try {
      const lib = await import(pathToFileURL(path.join(dir, 'pdf.mjs')).href);
      lib.GlobalWorkerOptions.workerSrc = pathToFileURL(path.join(dir, 'pdf.worker.mjs')).href;
      const pdf = await lib.getDocument({ data: new TextEncoder().encode(PDF), isEvalSupported: false }).promise;
      for (const f of ['getPage', 'getDestinations', 'getPageIndex']) assert.equal(typeof pdf[f], 'function', f);
      const pg = await pdf.getPage(1);
      for (const f of ['getViewport', 'render', 'getAnnotations', 'getTextContent']) assert.equal(typeof pg[f], 'function', f);
      const v = pg.getViewport({ scale: 2 });
      assert.equal(typeof v.convertToViewportPoint, 'function', 'convertToViewportPoint (BPHead.pdfSeite → feld)');
      assert.deepEqual(v.convertToViewportPoint(0, 842).map(Math.round), [0, 0], 'oben links');
      assert.equal(typeof lib.AnnotationMode.DISABLE, 'number');
      await pdf.cleanup?.();
    } finally { console.warn = warn; }
  });
}
