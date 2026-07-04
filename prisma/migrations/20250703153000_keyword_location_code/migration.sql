-- AlterTable: add new columns (nullable first for backfill)
ALTER TABLE "business_keywords" ADD COLUMN "location_code" INTEGER;
ALTER TABLE "business_keywords" ADD COLUMN "location_name" TEXT;

-- Backfill from business country defaults
UPDATE "business_keywords" AS bk
SET
  "location_code" = CASE bc.country
    WHEN 'CH' THEN 2756
    WHEN 'DE' THEN 2276
    WHEN 'AT' THEN 2040
    WHEN 'US' THEN 2840
    WHEN 'GB' THEN 2826
    WHEN 'IN' THEN 2356
    WHEN 'FR' THEN 2250
    WHEN 'IT' THEN 2380
    ELSE 2840
  END,
  "location_name" = CASE bc.country
    WHEN 'CH' THEN 'Switzerland'
    WHEN 'DE' THEN 'Germany'
    WHEN 'AT' THEN 'Austria'
    WHEN 'US' THEN 'United States'
    WHEN 'GB' THEN 'United Kingdom'
    WHEN 'IN' THEN 'India'
    WHEN 'FR' THEN 'France'
    WHEN 'IT' THEN 'Italy'
    ELSE COALESCE(NULLIF(bk."location_label", ''), 'United States')
  END
FROM "businesses" AS b
JOIN "business_configs" AS bc ON bc."business_id" = b.id
WHERE bk."business_id" = b.id;

-- Prefer existing free-text label when present
UPDATE "business_keywords"
SET "location_name" = "location_label"
WHERE "location_label" IS NOT NULL AND TRIM("location_label") <> '';

ALTER TABLE "business_keywords" ALTER COLUMN "location_code" SET NOT NULL;
ALTER TABLE "business_keywords" ALTER COLUMN "location_name" SET NOT NULL;

DROP INDEX IF EXISTS "business_keywords_business_id_keyword_key";

ALTER TABLE "business_keywords" DROP COLUMN "location_label";

CREATE UNIQUE INDEX "business_keywords_business_id_keyword_location_code_key"
  ON "business_keywords"("business_id", "keyword", "location_code");
