-- Operational Foundation Wave 1

CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MANAGER');
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'DISABLED');
CREATE TYPE "ClientRequestStatus" AS ENUM (
  'SUBMITTED',
  'NEEDS_REVIEW',
  'QUALIFIED',
  'RECOMMENDATION_READY',
  'ARCHIVED',
  'UPLOADED',
  'PRELIMINARY_ESTIMATE_READY',
  'WAITING_MATERIAL_COSTS',
  'MODEL_BRIEF_READY',
  'PROPOSAL_DRAFT_READY'
);
CREATE TYPE "ClientRequestAssetKind" AS ENUM ('PHOTO', 'DOCUMENT', 'TECHNICAL_BRIEF');
CREATE TYPE "EventType" AS ENUM (
  'CLIENT_REQUEST_CREATED',
  'CLIENT_REQUEST_QUALIFIED',
  'SELECTION_RECOMMENDATION_CREATED',
  'STATUS_CHANGED'
);

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'MANAGER',
  "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClientRequest" (
  "id" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "status" "ClientRequestStatus" NOT NULL DEFAULT 'SUBMITTED',
  "source" TEXT NOT NULL DEFAULT 'CLIENT_PORTAL',
  "customerName" TEXT NOT NULL,
  "companyName" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "projectName" TEXT,
  "location" TEXT,
  "objectType" TEXT NOT NULL,
  "segment" TEXT NOT NULL,
  "widthM" DECIMAL(12,2),
  "lengthM" DECIMAL(12,2),
  "heightM" DECIMAL(12,2),
  "targetBudgetRub" DECIMAL(14,2),
  "needsDelivery" BOOLEAN NOT NULL DEFAULT false,
  "needsInstallation" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  "estimateJson" JSONB NOT NULL,
  "modelBriefJson" JSONB NOT NULL,
  "qualificationJson" JSONB,
  "qualificationSummary" TEXT,
  "qualificationConfidence" DECIMAL(5,4),
  "qualificationWarnings" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "customerCompanyId" TEXT,
  "customerContactId" TEXT,
  "projectId" TEXT,
  "createdByUserId" TEXT,
  "assignedManagerId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "qualifiedAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),

  CONSTRAINT "ClientRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClientRequestAsset" (
  "id" TEXT NOT NULL,
  "clientRequestId" TEXT NOT NULL,
  "kind" "ClientRequestAssetKind" NOT NULL DEFAULT 'PHOTO',
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "storagePath" TEXT,
  "publicUrl" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ClientRequestAsset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EventLog" (
  "id" TEXT NOT NULL,
  "actorUserId" TEXT,
  "eventType" "EventType" NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "EventLog_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "SelectionSession"
  ADD COLUMN "clientRequestId" TEXT,
  ADD COLUMN "constraintsJson" JSONB,
  ADD COLUMN "recognizedPreferences" JSONB,
  ADD COLUMN "filtersApplied" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "filteredOutCount" INTEGER,
  ADD COLUMN "createdByUserId" TEXT;

ALTER TABLE "SelectionRecommendation" DROP CONSTRAINT "SelectionRecommendation_productId_fkey";
ALTER TABLE "SelectionRecommendation"
  ALTER COLUMN "productId" DROP NOT NULL,
  ADD COLUMN "rank" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "score" DECIMAL(10,4),
  ADD COLUMN "catalogProductId" TEXT,
  ADD COLUMN "productArticle" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "productSlug" TEXT,
  ADD COLUMN "productName" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "productImageUrl" TEXT,
  ADD COLUMN "productSnapshot" JSONB,
  ADD COLUMN "highlights" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "scoreBreakdown" JSONB;

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "ClientRequest_reference_key" ON "ClientRequest"("reference");
CREATE INDEX "ClientRequest_status_idx" ON "ClientRequest"("status");
CREATE INDEX "ClientRequest_customerCompanyId_idx" ON "ClientRequest"("customerCompanyId");
CREATE INDEX "ClientRequest_customerContactId_idx" ON "ClientRequest"("customerContactId");
CREATE INDEX "ClientRequest_projectId_idx" ON "ClientRequest"("projectId");
CREATE INDEX "ClientRequest_assignedManagerId_idx" ON "ClientRequest"("assignedManagerId");
CREATE INDEX "ClientRequest_createdAt_idx" ON "ClientRequest"("createdAt");
CREATE INDEX "ClientRequestAsset_clientRequestId_idx" ON "ClientRequestAsset"("clientRequestId");
CREATE INDEX "SelectionSession_clientRequestId_idx" ON "SelectionSession"("clientRequestId");
CREATE INDEX "SelectionSession_createdByUserId_idx" ON "SelectionSession"("createdByUserId");
CREATE INDEX "SelectionRecommendation_productArticle_idx" ON "SelectionRecommendation"("productArticle");
CREATE INDEX "SelectionRecommendation_catalogProductId_idx" ON "SelectionRecommendation"("catalogProductId");
CREATE INDEX "EventLog_actorUserId_idx" ON "EventLog"("actorUserId");
CREATE INDEX "EventLog_entityType_entityId_idx" ON "EventLog"("entityType", "entityId");
CREATE INDEX "EventLog_eventType_idx" ON "EventLog"("eventType");
CREATE INDEX "EventLog_createdAt_idx" ON "EventLog"("createdAt");

ALTER TABLE "ClientRequest" ADD CONSTRAINT "ClientRequest_customerCompanyId_fkey" FOREIGN KEY ("customerCompanyId") REFERENCES "CustomerCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClientRequest" ADD CONSTRAINT "ClientRequest_customerContactId_fkey" FOREIGN KEY ("customerContactId") REFERENCES "CustomerContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClientRequest" ADD CONSTRAINT "ClientRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClientRequest" ADD CONSTRAINT "ClientRequest_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClientRequest" ADD CONSTRAINT "ClientRequest_assignedManagerId_fkey" FOREIGN KEY ("assignedManagerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClientRequestAsset" ADD CONSTRAINT "ClientRequestAsset_clientRequestId_fkey" FOREIGN KEY ("clientRequestId") REFERENCES "ClientRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SelectionSession" ADD CONSTRAINT "SelectionSession_clientRequestId_fkey" FOREIGN KEY ("clientRequestId") REFERENCES "ClientRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SelectionSession" ADD CONSTRAINT "SelectionSession_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SelectionRecommendation" ADD CONSTRAINT "SelectionRecommendation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EventLog" ADD CONSTRAINT "EventLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
