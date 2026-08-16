-- Things Prisma's schema language cannot express: PostGIS indexes, full-text
-- search indexes, and partial indexes. Run after `prisma migrate dev`.

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Geo ─────────────────────────────────────────────────────────────────────
-- Powers "near me" and radius search via ST_DWithin.
CREATE INDEX IF NOT EXISTS properties_location_gist
  ON properties USING GIST (location);

CREATE INDEX IF NOT EXISTS localities_location_gist
  ON localities USING GIST (location);

-- ── Full-text search ────────────────────────────────────────────────────────
-- Postgres has no Urdu text-search configuration, so Urdu uses 'simple'
-- (no stemming, no stop words) while English gets proper stemming. Combined
-- into one generated column so a single index serves both languages.
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce("titleUr", '')), 'A') ||
    setweight(to_tsvector('english', coalesce("titleEn", '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(city, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(locality, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce("descriptionUr", '')), 'C') ||
    setweight(to_tsvector('english', coalesce("descriptionEn", '')), 'C')
  ) STORED;

CREATE INDEX IF NOT EXISTS properties_search_vector_gin
  ON properties USING GIN (search_vector);

-- Trigram indexes for fuzzy/transliterated matching: a buyer typing
-- "johar town" must match "Johar Town", and "jouhar" should still get close.
CREATE INDEX IF NOT EXISTS properties_city_trgm
  ON properties USING GIN (city gin_trgm_ops);
CREATE INDEX IF NOT EXISTS properties_locality_trgm
  ON properties USING GIN (locality gin_trgm_ops);

-- ── Hot-path partial indexes ────────────────────────────────────────────────
-- The feed and search only ever look at active, publicly visible listings.
CREATE INDEX IF NOT EXISTS properties_public_active
  ON properties ("publishedAt" DESC)
  WHERE status = 'active' AND visibility = 'public';

CREATE INDEX IF NOT EXISTS properties_public_active_geo
  ON properties USING GIST (location)
  WHERE status = 'active' AND visibility = 'public';

-- Quota counting: how many listings occupy a slot right now.
CREATE INDEX IF NOT EXISTS properties_quota_count
  ON properties ("agentId")
  WHERE status IN ('active', 'pending_payment');

-- The admin payment verification queue.
CREATE INDEX IF NOT EXISTS payments_pending_queue
  ON payments ("createdAt")
  WHERE status = 'pending';

-- The dunning worker: who has fallen out of grace.
CREATE INDEX IF NOT EXISTS subscriptions_dunning
  ON subscriptions ("graceEndsAt")
  WHERE status = 'past_due';

-- Share-link expiry sweep.
CREATE INDEX IF NOT EXISTS share_links_expiring
  ON share_links ("expiresAt")
  WHERE "revokedAt" IS NULL AND "expiresAt" IS NOT NULL;

-- ── Invoice numbering ───────────────────────────────────────────────────────
-- Human-readable, gapless-enough invoice numbers (GHR-2026-000123) that an
-- agent can quote in the reference field of a wallet transfer.
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;

-- ── Ledger immutability ─────────────────────────────────────────────────────
-- The ledger is the audit trail for every rupee. Mistakes are corrected by
-- appending a compensating entry, never by editing history.
CREATE OR REPLACE FUNCTION ledger_entries_immutable()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'ledger_entries is append-only (attempted %)', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ledger_entries_no_update ON ledger_entries;
CREATE TRIGGER ledger_entries_no_update
  BEFORE UPDATE OR DELETE ON ledger_entries
  FOR EACH ROW EXECUTE FUNCTION ledger_entries_immutable();

-- ── Notes for production ────────────────────────────────────────────────────
-- property_views grows fast (every feed scroll is a row). Before it gets big,
-- convert it to a monthly-partitioned table and drop partitions older than
-- 13 months; the premium insights only ever query a rolling window.
