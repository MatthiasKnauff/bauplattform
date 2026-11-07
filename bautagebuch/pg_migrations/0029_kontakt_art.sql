-- Adressen: Art des Kontakts frei wählbar (Firma, Bauherr, Baustelle oder eigene wie „Behörde“); leer = wie bisher aus Gewerk/Baustelle
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS art TEXT NOT NULL DEFAULT '';
