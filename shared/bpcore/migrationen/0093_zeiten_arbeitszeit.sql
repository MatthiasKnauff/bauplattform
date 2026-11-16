-- Zeiten: eigene Arbeitszeit je Person und Wochentag (entschieden am 16.11.2026, Entwurf „Zeiten: Kommen/Gehen nach Arbeitszeit“).
-- JSON {"0": {"von": "08:00", "bis": "16:30", "pb": "13:00", "pd": 30}, …} (0 = Montag); leer = Vorgabe des Büros (Einstellung „zeit_arbeitszeit“).
-- Kommen/Gehen ohne Eintrag kommen daraus (grau, zählt erst mit Bestätigen bzw. sobald am Tag gearbeitet wurde); die Pause des Tages ebenso.
ALTER TABLE zeit_person ADD COLUMN IF NOT EXISTS arbeitszeit TEXT NOT NULL DEFAULT '';
