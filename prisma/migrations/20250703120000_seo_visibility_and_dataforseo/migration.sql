-- CreateEnum
CREATE TYPE "RankingSource" AS ENUM ('GOOGLE_ORGANIC');

-- AlterEnum
ALTER TYPE "CronJobType" ADD VALUE 'PROCESS_SEO_RANKINGS';

-- AlterTable
ALTER TABLE "business_configs" ADD COLUMN "country" TEXT NOT NULL DEFAULT 'CH';

-- CreateTable
CREATE TABLE "business_keywords" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "target_domain" TEXT NOT NULL,
    "location_label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_keywords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "keyword_ranking_syncs" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "source" "RankingSource" NOT NULL DEFAULT 'GOOGLE_ORGANIC',
    "provider" TEXT NOT NULL DEFAULT 'dataforseo',
    "started_at" TIMESTAMP(3) NOT NULL,
    "finished_at" TIMESTAMP(3),
    "total_count" INTEGER NOT NULL,
    "success_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "skipped_count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "keyword_ranking_syncs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_keyword_rankings" (
    "id" TEXT NOT NULL,
    "keyword_id" TEXT NOT NULL,
    "sync_id" TEXT,
    "source" "RankingSource" NOT NULL DEFAULT 'GOOGLE_ORGANIC',
    "provider" TEXT NOT NULL DEFAULT 'dataforseo',
    "position" INTEGER,
    "ranking_url" TEXT,
    "ranking_title" TEXT,
    "top_domains" JSONB,
    "checked_at" TIMESTAMP(3) NOT NULL,
    "checked_on" DATE NOT NULL,
    "device" TEXT NOT NULL DEFAULT 'desktop',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_keyword_rankings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "business_keywords_business_id_idx" ON "business_keywords"("business_id");

-- CreateIndex
CREATE UNIQUE INDEX "business_keywords_business_id_keyword_key" ON "business_keywords"("business_id", "keyword");

-- CreateIndex
CREATE INDEX "keyword_ranking_syncs_business_id_started_at_idx" ON "keyword_ranking_syncs"("business_id", "started_at");

-- CreateIndex
CREATE INDEX "business_keyword_rankings_keyword_id_checked_at_idx" ON "business_keyword_rankings"("keyword_id", "checked_at");

-- CreateIndex
CREATE INDEX "business_keyword_rankings_sync_id_idx" ON "business_keyword_rankings"("sync_id");

-- CreateIndex
CREATE UNIQUE INDEX "business_keyword_rankings_keyword_id_source_checked_on_key" ON "business_keyword_rankings"("keyword_id", "source", "checked_on");

-- AddForeignKey
ALTER TABLE "business_keywords" ADD CONSTRAINT "business_keywords_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "keyword_ranking_syncs" ADD CONSTRAINT "keyword_ranking_syncs_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_keyword_rankings" ADD CONSTRAINT "business_keyword_rankings_keyword_id_fkey" FOREIGN KEY ("keyword_id") REFERENCES "business_keywords"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_keyword_rankings" ADD CONSTRAINT "business_keyword_rankings_sync_id_fkey" FOREIGN KEY ("sync_id") REFERENCES "keyword_ranking_syncs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
