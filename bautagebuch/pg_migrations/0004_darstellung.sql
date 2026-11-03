-- Bauplattform: Darstellung je Benutzer, zentral auf der Startseite eingestellt (gilt für alle Apps).
-- theme: '' = Dunkel (Standard), 'hell', 'auto' (nach Systemeinstellung), 'klassisch' (nur Bauzeitenplan, sonst wie hell)
ALTER TABLE users ADD COLUMN theme TEXT NOT NULL DEFAULT '';
