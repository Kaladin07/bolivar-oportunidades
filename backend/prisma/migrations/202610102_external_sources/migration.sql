ALTER TABLE "Opportunity"
ADD COLUMN "organizationName" TEXT,
ADD COLUMN "externalKey" TEXT,
ADD COLUMN "sourceName" TEXT,
ADD COLUMN "sourceUrl" TEXT,
ADD COLUMN "lastSyncedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Opportunity_externalKey_key" ON "Opportunity"("externalKey");

CREATE TABLE "ImportState" (
    "source" TEXT NOT NULL,
    "lastSuccessAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ImportState_pkey" PRIMARY KEY ("source")
);
