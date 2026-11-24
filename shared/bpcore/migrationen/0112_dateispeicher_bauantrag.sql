-- Dateispeicher, Etappe 3 (24.11.2026): die amtlichen Vordrucke des Bauantrags (bauantrag_formular, fürs ganze Büro, keinem Projekt zugeordnet)
-- auf das Laufwerk des Kerns (bpcore/dateien.py). Eigene Unterlagen eines Antrags liegen schon im Projektordner (bauantrag_unterlage.pfad).
ALTER TABLE bauantrag_formular ADD COLUMN IF NOT EXISTS datei_ref TEXT;
