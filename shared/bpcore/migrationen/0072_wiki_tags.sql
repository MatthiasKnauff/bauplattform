-- Wiki (besprochen am 13.11.2026, Mock „Wiki-Tags“): Tags statt Rubrik und mehrere Projekte je Eintrag.
-- Tags stehen in „stichworte“ (Komma-getrennt, der erste Tag ordnet den Eintrag im Baum ein – bleibt zusätzlich in „kapitel“);
-- die bisherigen Kapitel werden zum ersten Tag. „projekte“: [{id?, name}] – Projekte der Plattform und Projektordner vom Fileserver.
ALTER TABLE wiki_eintrag ADD COLUMN IF NOT EXISTS projekte TEXT NOT NULL DEFAULT '[]';
UPDATE wiki_eintrag SET stichworte = kapitel || CASE WHEN stichworte <> '' THEN ', ' || stichworte ELSE '' END
 WHERE kapitel <> '' AND position(lower(kapitel) IN lower(stichworte)) = 0;
UPDATE wiki_eintrag e SET projekte = json_build_array(json_build_object('id', p.id, 'name', p.name))::text
  FROM projects p WHERE p.id = e.projekt_id AND e.projekte = '[]';
