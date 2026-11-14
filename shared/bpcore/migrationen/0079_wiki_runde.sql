-- Wiki in Runden (besprochen am 14.11.2026): sammeln → vorsichten → auswerten → fachlich prüfen (bpcore/wiki_runde.py).
-- pruefer: wer den Eintrag fachlich prüft (verteilt nach Projektleitung, Kapitel, sonst zufällig); warten: Nummer der Runde, ab der ein
-- zurückgestellter Eintrag wieder vorgelegt wird (0 = nicht zurückgestellt). Die bisher gesammelten „neu“ werden die erste Runde zum Vorsichten.
ALTER TABLE wiki_eintrag ADD COLUMN IF NOT EXISTS pruefer INTEGER;
ALTER TABLE wiki_eintrag ADD COLUMN IF NOT EXISTS warten INTEGER NOT NULL DEFAULT 0;
UPDATE wiki_eintrag SET status = 'vorsicht' WHERE status = 'neu' AND deleted = '' AND kapitel <> 'Wochen';
