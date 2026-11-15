-- Zeiten: Vorschläge einfrieren (besprochen am 15.11.2026, Entwurf „Zeiten: Strahl und Vorschläge“) – einmal in „Mein Tag“ gezeigt,
-- bleiben sie stehen; nur neue Arbeit bringt neue dazu. JSON-Liste [{von, bis (Minuten), project_id, art, quelle, woher, neu}].
ALTER TABLE zeit_tag ADD COLUMN IF NOT EXISTS vorschlag TEXT;
