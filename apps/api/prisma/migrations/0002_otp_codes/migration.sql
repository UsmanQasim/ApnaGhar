-- Login codes move from Redis into Postgres.
--
-- This is what removes the API's dependency on an always-on Redis instance,
-- and with it the last reason the service could not run serverless.

-- CreateTable
CREATE TABLE "otp_codes" (
    "phone" VARCHAR(20) NOT NULL,
    "codeHash" VARCHAR(64) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "resendAfter" TIMESTAMPTZ NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("phone")
);

-- CreateIndex
-- Drives the sweep of expired rows. Without a TTL the table would otherwise
-- grow by one row per login attempt, forever.
CREATE INDEX "otp_codes_expiresAt_idx" ON "otp_codes"("expiresAt");
