-- Add new brew method enum values.
-- Postgres requires each ADD VALUE in a separate statement.
alter type brew_method add value if not exists 'v60';
alter type brew_method add value if not exists 'kalita_wave';
alter type brew_method add value if not exists 'clever_dripper';
alter type brew_method add value if not exists 'ristretto';
alter type brew_method add value if not exists 'vietnamese_phin';
