-- Eigene Postfächer per Anmeldung bei Google/Microsoft (OAuth) sind wieder entfernt: Zugangsdaten der Apps, offene Anmeldevorgänge
-- und die so verbundenen Postfächer (samt Tokens) löschen. IMAP-Postfächer und die zentralen Microsoft-365-Postfächer bleiben.
DELETE FROM settings WHERE key IN ('oauth_google_client', 'oauth_google_secret', 'oauth_ms_client', 'oauth_ms_secret');
DELETE FROM bp_store WHERE key LIKE 'oauthstate:%';
UPDATE bp_store SET data = jsonb_set(data::jsonb, '{konten}',
    COALESCE((SELECT jsonb_agg(k) FROM jsonb_array_elements(data::jsonb -> 'konten') k WHERE k ->> 'art' IS DISTINCT FROM 'oauth'), '[]'::jsonb))::text
  WHERE key LIKE 'postfaecher:%' AND data LIKE '%oauth%' AND jsonb_typeof(data::jsonb -> 'konten') = 'array';
