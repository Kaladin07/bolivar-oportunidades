ALTER TABLE "Opportunity"
ADD COLUMN "summary" TEXT,
ADD COLUMN "employmentType" TEXT,
ADD COLUMN "seniority" TEXT,
ADD COLUMN "salaryMin" INTEGER,
ADD COLUMN "salaryMax" INTEGER,
ADD COLUMN "salaryCurrency" TEXT,
ADD COLUMN "salaryPeriod" TEXT,
ADD COLUMN "eligibleLocations" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
