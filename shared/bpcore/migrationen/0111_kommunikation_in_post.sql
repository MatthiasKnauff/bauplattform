-- Kommunikation ist seit 24.11.2026 Teil von Post & Vorgänge (App „aufgaben“): Links der Sendungen zeigen dorthin.
UPDATE benachrichtigungen SET link = 'aufgaben:' || substr(link, 15) WHERE link LIKE 'kommunikation:%';
