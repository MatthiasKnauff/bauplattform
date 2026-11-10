-- Chat in der Kopfleiste wieder entfernt (war nur kurz auf dem Testserver). Die Nummer 0030 bleibt belegt, damit Test- und
-- Produktivserver gleich zählen; vorhandene Chat-Tabellen werden entfernt.
DROP TABLE IF EXISTS chat_gelesen;
DROP TABLE IF EXISTS chat_nachricht;
