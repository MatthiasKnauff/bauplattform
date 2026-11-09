-- Zeiterfassung: Fahrten zur Baustelle / zurück ins Büro mit Einsteigen und Aussteigen (Quelle „unterwegs“).
-- fahrt (JSON): richtung (hin | zurueck | andere), ab/an: Standort beim Ein- bzw. Aussteigen {lat, lng, acc} – nur wenn auf dem Handy erlaubt.
ALTER TABLE zeit_eintrag ADD COLUMN IF NOT EXISTS fahrt TEXT NOT NULL DEFAULT '';
ALTER TABLE zeit_lauf ADD COLUMN IF NOT EXISTS fahrt TEXT NOT NULL DEFAULT '';
