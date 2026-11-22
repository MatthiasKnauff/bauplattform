-- Leistungskatalog des Bauzeitenplans ohne Firma je Leistung (entschieden am 22.11.2026: „Spalte weg, Einträge löschen“).
-- Firmen gehören zum Projekt („Gewerke & Firmen“); beim Planen las niemand mehr die Firma je Leistung. Es bleibt nur die Vorgabe je Gewerk
-- (Schlüssel „gw~…“). Vorher sichert bpcore.schema die Datenbank („…-vor-v105.dump“); die Stände des Katalogs stehen zudem im Versionsverlauf.
DO $$
BEGIN
    UPDATE gantt_store
       SET data = (SELECT COALESCE(jsonb_object_agg(e.key, e.value), '{}'::jsonb)::text FROM jsonb_each(data::jsonb) AS e WHERE e.key LIKE 'gw~%')
     WHERE key = 'catfirms' AND jsonb_typeof(data::jsonb) = 'object';
    UPDATE gantt_store
       SET data = (SELECT COALESCE(jsonb_agg(CASE WHEN jsonb_typeof(x.v) = 'object' THEN x.v - 'firm' ELSE x.v END ORDER BY x.n), '[]'::jsonb)::text
                     FROM jsonb_array_elements(data::jsonb) WITH ORDINALITY AS x(v, n))
     WHERE key = 'library' AND jsonb_typeof(data::jsonb) = 'array';
EXCEPTION WHEN invalid_text_representation THEN
    RAISE NOTICE 'Katalog ohne Firmen: Daten nicht lesbar – unverändert';
END $$;
