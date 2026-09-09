-- Roman Urdu ("ur-Latn") becomes a third locale.
--
-- The "Locale" Postgres enum is dropped and users.locale becomes a varchar.
-- Reason: BCP-47 writes Roman Urdu as "ur-Latn", and a Postgres enum label
-- cannot contain a hyphen. Keeping the enum would mean storing "ur_Latn" and
-- translating it at every boundary — a mapping that eventually disagrees with
-- itself. The column is validated at the edge by z.enum(LOCALES) instead, and
-- a CHECK constraint keeps the database honest about what it will accept.
--
-- Safe to re-run in the sense that it is additive to existing rows: every
-- current value ('ur' or 'en') is already a valid tag and survives the cast.

ALTER TABLE "users"
  ALTER COLUMN "locale" DROP DEFAULT;

ALTER TABLE "users"
  ALTER COLUMN "locale" TYPE VARCHAR(12) USING "locale"::text;

ALTER TABLE "users"
  ALTER COLUMN "locale" SET DEFAULT 'ur';

ALTER TABLE "users"
  ALTER COLUMN "locale" SET NOT NULL;

DROP TYPE IF EXISTS "Locale";

-- The enum is gone, so this is what stops a typo becoming a user who receives
-- no SMS at all: notifications.service falls back to Urdu on an unknown tag,
-- but silently, and a row that says "ur-latn" would never be Roman Urdu.
ALTER TABLE "users"
  ADD CONSTRAINT "users_locale_check" CHECK ("locale" IN ('ur', 'ur-Latn', 'en'));
