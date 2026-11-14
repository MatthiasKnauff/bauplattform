-- Protokoll der KI-Anfragen (Datenschutz, 14.11.2026): gesendet = was hinausging (bei externer KI anonymisiert),
-- ersetzt = Zuordnung Kennung → Klartext (bleibt im Büro). Einsehbar nur mit dem Recht „datenschutz“; gelöscht nach ki_protokoll_tage.
CREATE TABLE IF NOT EXISTS ki_protokoll (
  id SERIAL PRIMARY KEY,
  zeit TEXT NOT NULL,
  wer TEXT NOT NULL DEFAULT '',
  app TEXT NOT NULL DEFAULT '',
  anbieter TEXT NOT NULL DEFAULT '',
  zweck TEXT NOT NULL DEFAULT '',
  gesendet TEXT NOT NULL DEFAULT '',
  antwort TEXT NOT NULL DEFAULT '',
  ersetzt TEXT NOT NULL DEFAULT '[]',
  bild INTEGER NOT NULL DEFAULT 0,
  dauer_ms INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS ki_protokoll_zeit ON ki_protokoll(zeit);
-- Recht „datenschutz“ (Protokoll der KI-Anfragen ansehen und exportieren) – ab Werk Geschäftsführung
UPDATE rollen SET rechte = (rechte::jsonb || '["datenschutz"]'::jsonb)::text
 WHERE key = 'gf' AND rechte IS NOT NULL AND rechte <> '' AND NOT (rechte::jsonb ? 'datenschutz');
UPDATE users SET rechte = (rechte::jsonb || '["datenschutz"]'::jsonb)::text
 WHERE rolle = 'gf' AND rechte IS NOT NULL AND rechte <> '' AND NOT (rechte::jsonb ? 'datenschutz')
   AND NOT (COALESCE(NULLIF(rechte_minus, ''), '[]')::jsonb ? 'datenschutz');
