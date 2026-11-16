-- Bauherrenportal: wann die Einladungsmail an die Bauherr:in ging (gemeinsamer Versand-Dialog, nie automatisch) – leer = noch nicht
ALTER TABLE bh_konto ADD COLUMN eingeladen TEXT NOT NULL DEFAULT '';
