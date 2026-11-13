-- KI-Verbrauch je Dienst (besprochen am 13.11.2026): die Plattform schreibt jede Anfrage an Claude, Gemini, ChatGPT mit (Tokens je Tag und Modell).
-- Die Anbieter geben den Kontostand mit normalen Schlüsseln nicht heraus – Guthaben = eingetragene Aufladungen − Verbrauch (bpcore.ki_verbrauch).
CREATE TABLE IF NOT EXISTS ki_verbrauch (
    tag      TEXT NOT NULL,
    anbieter TEXT NOT NULL,
    modell   TEXT NOT NULL DEFAULT '',
    ein      BIGINT NOT NULL DEFAULT 0,
    aus      BIGINT NOT NULL DEFAULT 0,
    n        INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (tag, anbieter, modell)
);
