-- Honorar: anrechenbare Kosten folgen der Kosten-App, bis sie von Hand überschrieben werden oder die erste Honorarrechnung geschrieben ist
-- (MJ-C1, 18.11.2026). Bestehende Aufträge mit Kosten behalten ihren Wert (gelten als eigener Wert).
ALTER TABLE honorar_auftrag ADD COLUMN IF NOT EXISTS kosten_eigen BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE honorar_auftrag SET kosten_eigen = TRUE WHERE COALESCE(kosten, 0) <> 0 AND kosten_eigen = FALSE;
