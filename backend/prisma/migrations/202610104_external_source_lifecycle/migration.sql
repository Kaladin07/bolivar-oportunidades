ALTER TABLE "Opportunity"
ADD COLUMN "sourceActive" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "Opportunity_sourceActive_lastSyncedAt_idx"
ON "Opportunity"("sourceActive", "lastSyncedAt");
