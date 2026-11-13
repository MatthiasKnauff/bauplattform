-- Vorbemerkungen aus eingelesenen Katalogen (z. B. sirAdos Vorbemerkungen, Bauplattform Vorbemerkungen) zählen in den Baudaten mit:
-- bisher fielen alle Texte (art 'T') heraus, Vorbemerkungen-Kataloge standen dort mit 0 und waren leer.
CREATE OR REPLACE VIEW pdb_alle AS
  SELECT id, katalog, code, grund_id, lb_nr, gruppe, titel, kurz, bez, lang, einheit, kg, gewerk, h, stoff, geraet, ep_von, ep_mittel, ep_bis,
         genauigkeit, tags, hinweis, quelle, preisstand, aktiv, favorit, created, updated, updated_by
  FROM pdb_position
  UNION ALL
  SELECT -k.id, 'ava' || k.katalog_id, k.oz, NULL, k.gewerk, k.gewerk, COALESCE(gw.kurz, ''), k.kurz, '', k.lang, k.einheit, k.kg, '', 0, 0, 0,
         k.ep_von, k.ep, k.ep_bis, 'B', '', '', 'import', COALESCE(substr(kk.stand, 1, 7), ''), 1, 0, NULL, NULL, ''
  FROM ava_katalog k
  JOIN ava_kataloge kk ON kk.id = k.katalog_id
  LEFT JOIN ava_katalog gw ON gw.katalog_id = k.katalog_id AND gw.typ = 'gewerk' AND gw.gewerk = k.gewerk
  WHERE k.typ = 'pos' AND (k.art <> 'T' OR kk.art = 'vorbemerkungen');
-- früher als „Positionen“ eingelesene Text-Kataloge als Vorbemerkungen führen (Name, Anzahl)
UPDATE ava_kataloge kk SET art = 'vorbemerkungen', name = replace(name, 'Positionen', 'Vorbemerkungen'),
       n_pos = (SELECT COUNT(*) FROM ava_katalog x WHERE x.katalog_id = kk.id AND x.typ = 'pos')
 WHERE kk.art <> 'vorbemerkungen' AND kk.datei NOT LIKE 'bauplattform:%'
   AND EXISTS (SELECT 1 FROM ava_katalog x WHERE x.katalog_id = kk.id AND x.typ = 'pos')
   AND NOT EXISTS (SELECT 1 FROM ava_katalog x WHERE x.katalog_id = kk.id AND x.typ = 'pos' AND x.art <> 'T');
