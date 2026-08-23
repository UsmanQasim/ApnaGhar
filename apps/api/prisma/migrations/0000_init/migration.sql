-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('ur', 'en');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('customer', 'agent', 'admin');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'suspended');

-- CreateEnum
CREATE TYPE "PlanCode" AS ENUM ('basic', 'premium');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('trialing', 'active', 'past_due', 'restricted', 'dormant', 'cancelled');

-- CreateEnum
CREATE TYPE "PropertyPurpose" AS ENUM ('sale', 'rent');

-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('house', 'flat', 'plot', 'shop', 'office', 'warehouse');

-- CreateEnum
CREATE TYPE "AreaUnit" AS ENUM ('marla', 'kanal', 'sqft', 'sqyd');

-- CreateEnum
CREATE TYPE "RentPeriod" AS ENUM ('month', 'year');

-- CreateEnum
CREATE TYPE "PriceVisibility" AS ENUM ('public', 'on_request');

-- CreateEnum
CREATE TYPE "PropertyVisibility" AS ENUM ('public', 'hidden_from_agents', 'private');

-- CreateEnum
CREATE TYPE "PropertyStatus" AS ENUM ('draft', 'pending_payment', 'active', 'sold', 'rented', 'expired', 'archived');

-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('image', 'video');

-- CreateEnum
CREATE TYPE "MediaProcessingStatus" AS ENUM ('uploading', 'processing', 'ready', 'failed');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('open', 'due', 'partially_paid', 'paid', 'overdue', 'void');

-- CreateEnum
CREATE TYPE "InvoiceItemType" AS ENUM ('subscription', 'listing_fee', 'premium', 'boost', 'credit', 'adjustment');

-- CreateEnum
CREATE TYPE "PaymentProviderCode" AS ENUM ('manual_easypaisa', 'manual_jazzcash', 'jazzcash_api', 'easypaisa_api', 'card');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'verified', 'failed', 'refunded');

-- CreateEnum
CREATE TYPE "LedgerDirection" AS ENUM ('debit', 'credit');

-- CreateEnum
CREATE TYPE "LedgerSource" AS ENUM ('invoice_item', 'payment', 'refund', 'credit');

-- CreateEnum
CREATE TYPE "LeadChannel" AS ENUM ('call', 'whatsapp', 'in_app', 'share_link');

-- CreateEnum
CREATE TYPE "ViewSource" AS ENUM ('feed', 'search', 'share', 'profile');

-- CreateEnum
CREATE TYPE "BoostType" AS ENUM ('top_search', 'featured_home');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "name" VARCHAR(120),
    "role" "UserRole" NOT NULL DEFAULT 'customer',
    "locale" "Locale" NOT NULL DEFAULT 'ur',
    "urduNumerals" BOOLEAN NOT NULL DEFAULT true,
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "avatarUrl" VARCHAR(500),
    "lastSeenAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "refreshTokenHash" VARCHAR(64) NOT NULL,
    "deviceId" VARCHAR(128),
    "userAgent" VARCHAR(300),
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "revokedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agents" (
    "userId" UUID NOT NULL,
    "agencyName" VARCHAR(160),
    "cnicHash" VARCHAR(64),
    "cnicVerifiedAt" TIMESTAMPTZ,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "city" VARCHAR(80),
    "serviceAreas" JSONB NOT NULL DEFAULT '[]',
    "bioUr" VARCHAR(1000),
    "bioEn" VARCHAR(1000),
    "whatsappPhone" VARCHAR(20),
    "ratingAvg" DOUBLE PRECISION,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "plans" (
    "code" "PlanCode" NOT NULL,
    "pricePaisa" BIGINT NOT NULL,
    "includedListings" INTEGER,
    "features" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "agentId" UUID NOT NULL,
    "planCode" "PlanCode" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'trialing',
    "currentPeriodStart" TIMESTAMPTZ NOT NULL,
    "currentPeriodEnd" TIMESTAMPTZ NOT NULL,
    "graceEndsAt" TIMESTAMPTZ,
    "restrictedAt" TIMESTAMPTZ,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "prepaidUntil" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "agentId" UUID NOT NULL,
    "number" VARCHAR(24) NOT NULL,
    "periodStart" TIMESTAMPTZ NOT NULL,
    "periodEnd" TIMESTAMPTZ NOT NULL,
    "subtotalPaisa" BIGINT NOT NULL DEFAULT 0,
    "totalPaisa" BIGINT NOT NULL DEFAULT 0,
    "amountPaidPaisa" BIGINT NOT NULL DEFAULT 0,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'open',
    "dueAt" TIMESTAMPTZ,
    "paidAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "type" "InvoiceItemType" NOT NULL,
    "referenceId" UUID,
    "descriptionUr" VARCHAR(300) NOT NULL,
    "descriptionEn" VARCHAR(300) NOT NULL,
    "amountPaisa" BIGINT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "agentId" UUID NOT NULL,
    "invoiceId" UUID,
    "amountPaisa" BIGINT NOT NULL,
    "provider" "PaymentProviderCode" NOT NULL,
    "providerTxnId" VARCHAR(120),
    "payerMsisdn" VARCHAR(20),
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "proofKey" VARCHAR(300),
    "provisionalUntil" TIMESTAMPTZ,
    "verifiedById" UUID,
    "verifiedAt" TIMESTAMPTZ,
    "rejectionReason" VARCHAR(500),
    "rawPayload" JSONB,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entries" (
    "id" UUID NOT NULL,
    "agentId" UUID NOT NULL,
    "direction" "LedgerDirection" NOT NULL,
    "amountPaisa" BIGINT NOT NULL,
    "source" "LedgerSource" NOT NULL,
    "sourceId" UUID NOT NULL,
    "balanceAfterPaisa" BIGINT NOT NULL,
    "memo" VARCHAR(300),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "properties" (
    "id" UUID NOT NULL,
    "agentId" UUID NOT NULL,
    "purpose" "PropertyPurpose" NOT NULL,
    "type" "PropertyType" NOT NULL,
    "titleUr" VARCHAR(160) NOT NULL,
    "titleEn" VARCHAR(160),
    "descriptionUr" VARCHAR(4000),
    "descriptionEn" VARCHAR(4000),
    "voiceNoteKey" VARCHAR(300),
    "pricePaisa" BIGINT,
    "priceVisibility" "PriceVisibility" NOT NULL DEFAULT 'public',
    "rentPeriod" "RentPeriod",
    "areaValue" DOUBLE PRECISION NOT NULL,
    "areaUnit" "AreaUnit" NOT NULL,
    "areaSqft" DOUBLE PRECISION NOT NULL,
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "floors" INTEGER,
    "furnished" BOOLEAN NOT NULL DEFAULT false,
    "addressText" VARCHAR(300),
    "city" VARCHAR(80) NOT NULL,
    "locality" VARCHAR(120),
    "location" geography(Point, 4326),
    "visibility" "PropertyVisibility" NOT NULL DEFAULT 'public',
    "status" "PropertyStatus" NOT NULL DEFAULT 'draft',
    "listingFeeCharged" BOOLEAN NOT NULL DEFAULT false,
    "listingFeeInvoiceItemId" UUID,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "shareCount" INTEGER NOT NULL DEFAULT 0,
    "salePricePaisa" BIGINT,
    "commissionPercent" DOUBLE PRECISION,
    "publishedAt" TIMESTAMPTZ,
    "soldAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_media" (
    "id" UUID NOT NULL,
    "propertyId" UUID NOT NULL,
    "kind" "MediaKind" NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "storageKey" VARCHAR(300) NOT NULL,
    "streamUid" VARCHAR(120),
    "playbackUrl" VARCHAR(500),
    "thumbnailUrl" VARCHAR(500),
    "width" INTEGER,
    "height" INTEGER,
    "durationSeconds" DOUBLE PRECISION,
    "byteSize" BIGINT,
    "processingStatus" "MediaProcessingStatus" NOT NULL DEFAULT 'uploading',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "share_links" (
    "id" UUID NOT NULL,
    "propertyId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "token" VARCHAR(64) NOT NULL,
    "recipientName" VARCHAR(80),
    "recipientPhone" VARCHAR(20),
    "requireOtp" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMPTZ,
    "maxViews" INTEGER,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "revokedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "share_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "share_link_views" (
    "id" UUID NOT NULL,
    "shareLinkId" UUID NOT NULL,
    "ipHash" VARCHAR(64) NOT NULL,
    "userAgent" VARCHAR(300),
    "viewedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "share_link_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "likes" (
    "userId" UUID NOT NULL,
    "propertyId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "likes_pkey" PRIMARY KEY ("userId","propertyId")
);

-- CreateTable
CREATE TABLE "favorites" (
    "userId" UUID NOT NULL,
    "propertyId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("userId","propertyId")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" UUID NOT NULL,
    "propertyId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "parentId" UUID,
    "body" VARCHAR(1000) NOT NULL,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "flaggedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" UUID NOT NULL,
    "propertyId" UUID NOT NULL,
    "agentId" UUID NOT NULL,
    "customerId" UUID,
    "channel" "LeadChannel" NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_views" (
    "id" UUID NOT NULL,
    "propertyId" UUID NOT NULL,
    "viewerId" UUID,
    "source" "ViewSource" NOT NULL,
    "viewerCity" VARCHAR(80),
    "viewerLocality" VARCHAR(120),
    "watchRatio" DOUBLE PRECISION,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_searches" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "filters" JSONB NOT NULL,
    "notify" BOOLEAN NOT NULL DEFAULT true,
    "lastNotifiedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_searches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boosts" (
    "id" UUID NOT NULL,
    "propertyId" UUID NOT NULL,
    "type" "BoostType" NOT NULL,
    "startsAt" TIMESTAMPTZ NOT NULL,
    "endsAt" TIMESTAMPTZ NOT NULL,
    "pricePaisa" BIGINT NOT NULL DEFAULT 0,
    "invoiceItemId" UUID,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "boosts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" VARCHAR(60) NOT NULL,
    "payload" JSONB NOT NULL,
    "readAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_audit_log" (
    "id" UUID NOT NULL,
    "adminId" UUID NOT NULL,
    "action" VARCHAR(80) NOT NULL,
    "entity" VARCHAR(60) NOT NULL,
    "entityId" VARCHAR(64),
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "localities" (
    "id" UUID NOT NULL,
    "city" VARCHAR(80) NOT NULL,
    "nameUr" VARCHAR(120) NOT NULL,
    "nameEn" VARCHAR(120) NOT NULL,
    "location" geography(Point, 4326),

    CONSTRAINT "localities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_role_status_idx" ON "users"("role", "status");

-- CreateIndex
CREATE INDEX "sessions_userId_revokedAt_idx" ON "sessions"("userId", "revokedAt");

-- CreateIndex
CREATE INDEX "sessions_refreshTokenHash_idx" ON "sessions"("refreshTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "agents_cnicHash_key" ON "agents"("cnicHash");

-- CreateIndex
CREATE INDEX "agents_city_isVerified_idx" ON "agents"("city", "isVerified");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_agentId_key" ON "subscriptions"("agentId");

-- CreateIndex
CREATE INDEX "subscriptions_status_currentPeriodEnd_idx" ON "subscriptions"("status", "currentPeriodEnd");

-- CreateIndex
CREATE INDEX "subscriptions_status_graceEndsAt_idx" ON "subscriptions"("status", "graceEndsAt");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_number_key" ON "invoices"("number");

-- CreateIndex
CREATE INDEX "invoices_agentId_status_idx" ON "invoices"("agentId", "status");

-- CreateIndex
CREATE INDEX "invoices_status_dueAt_idx" ON "invoices"("status", "dueAt");

-- CreateIndex
CREATE INDEX "invoice_items_invoiceId_idx" ON "invoice_items"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_items_type_referenceId_key" ON "invoice_items"("type", "referenceId");

-- CreateIndex
CREATE INDEX "payments_status_createdAt_idx" ON "payments"("status", "createdAt");

-- CreateIndex
CREATE INDEX "payments_agentId_status_idx" ON "payments"("agentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "payments_provider_providerTxnId_key" ON "payments"("provider", "providerTxnId");

-- CreateIndex
CREATE INDEX "ledger_entries_agentId_createdAt_idx" ON "ledger_entries"("agentId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_entries_source_sourceId_direction_key" ON "ledger_entries"("source", "sourceId", "direction");

-- CreateIndex
CREATE INDEX "properties_agentId_status_idx" ON "properties"("agentId", "status");

-- CreateIndex
CREATE INDEX "properties_city_purpose_status_pricePaisa_idx" ON "properties"("city", "purpose", "status", "pricePaisa");

-- CreateIndex
CREATE INDEX "properties_status_visibility_publishedAt_idx" ON "properties"("status", "visibility", "publishedAt");

-- CreateIndex
CREATE INDEX "properties_city_locality_status_idx" ON "properties"("city", "locality", "status");

-- CreateIndex
CREATE INDEX "property_media_propertyId_position_idx" ON "property_media"("propertyId", "position");

-- CreateIndex
CREATE INDEX "property_media_streamUid_idx" ON "property_media"("streamUid");

-- CreateIndex
CREATE UNIQUE INDEX "share_links_token_key" ON "share_links"("token");

-- CreateIndex
CREATE INDEX "share_links_propertyId_createdAt_idx" ON "share_links"("propertyId", "createdAt");

-- CreateIndex
CREATE INDEX "share_links_expiresAt_idx" ON "share_links"("expiresAt");

-- CreateIndex
CREATE INDEX "share_link_views_shareLinkId_viewedAt_idx" ON "share_link_views"("shareLinkId", "viewedAt");

-- CreateIndex
CREATE INDEX "likes_propertyId_idx" ON "likes"("propertyId");

-- CreateIndex
CREATE INDEX "favorites_propertyId_idx" ON "favorites"("propertyId");

-- CreateIndex
CREATE INDEX "comments_propertyId_createdAt_idx" ON "comments"("propertyId", "createdAt");

-- CreateIndex
CREATE INDEX "comments_parentId_idx" ON "comments"("parentId");

-- CreateIndex
CREATE INDEX "leads_agentId_createdAt_idx" ON "leads"("agentId", "createdAt");

-- CreateIndex
CREATE INDEX "leads_propertyId_createdAt_idx" ON "leads"("propertyId", "createdAt");

-- CreateIndex
CREATE INDEX "property_views_propertyId_createdAt_idx" ON "property_views"("propertyId", "createdAt");

-- CreateIndex
CREATE INDEX "property_views_createdAt_idx" ON "property_views"("createdAt");

-- CreateIndex
CREATE INDEX "saved_searches_userId_idx" ON "saved_searches"("userId");

-- CreateIndex
CREATE INDEX "saved_searches_notify_lastNotifiedAt_idx" ON "saved_searches"("notify", "lastNotifiedAt");

-- CreateIndex
CREATE INDEX "boosts_type_startsAt_endsAt_idx" ON "boosts"("type", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "boosts_propertyId_idx" ON "boosts"("propertyId");

-- CreateIndex
CREATE INDEX "notifications_userId_readAt_createdAt_idx" ON "notifications"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "admin_audit_log_adminId_createdAt_idx" ON "admin_audit_log"("adminId", "createdAt");

-- CreateIndex
CREATE INDEX "admin_audit_log_entity_entityId_idx" ON "admin_audit_log"("entity", "entityId");

-- CreateIndex
CREATE INDEX "localities_city_idx" ON "localities"("city");

-- CreateIndex
CREATE UNIQUE INDEX "localities_city_nameEn_key" ON "localities"("city", "nameEn");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agents" ADD CONSTRAINT "agents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_planCode_fkey" FOREIGN KEY ("planCode") REFERENCES "plans"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_media" ADD CONSTRAINT "property_media_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_link_views" ADD CONSTRAINT "share_link_views_shareLinkId_fkey" FOREIGN KEY ("shareLinkId") REFERENCES "share_links"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "likes" ADD CONSTRAINT "likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "likes" ADD CONSTRAINT "likes_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_views" ADD CONSTRAINT "property_views_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_views" ADD CONSTRAINT "property_views_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boosts" ADD CONSTRAINT "boosts_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

