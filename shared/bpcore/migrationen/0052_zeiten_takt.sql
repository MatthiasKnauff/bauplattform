-- Zeiten: Pause als Zeitraum je Tag (JSON [[von, bis], …] in Minuten; NULL = Vorgabe aus den Einstellungen)
-- und eigene Pausenvorgabe je Person („12:30/45“, „-“ = keine, leer = wie das Büro). Takt und Büro-Pause stehen in settings
-- (zeit_takt, zeit_pause).
ALTER TABLE zeit_tag ADD COLUMN IF NOT EXISTS pausen TEXT;
ALTER TABLE zeit_person ADD COLUMN IF NOT EXISTS pause TEXT NOT NULL DEFAULT '';
