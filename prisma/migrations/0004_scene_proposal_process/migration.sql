-- Wave 2A: persisted scene and proposal version process.

ALTER TYPE "EventType" ADD VALUE IF NOT EXISTS 'SCENE_PROJECT_CREATED';
ALTER TYPE "EventType" ADD VALUE IF NOT EXISTS 'SCENE_PROJECT_UPDATED';
ALTER TYPE "EventType" ADD VALUE IF NOT EXISTS 'PROPOSAL_CREATED';
ALTER TYPE "EventType" ADD VALUE IF NOT EXISTS 'PROPOSAL_VERSION_CREATED';
ALTER TYPE "EventType" ADD VALUE IF NOT EXISTS 'PROPOSAL_PDF_EXPORTED';

CREATE TYPE "SceneProjectStatus" AS ENUM (
  'DRAFT',
  'IN_REVIEW',
  'READY_FOR_PROPOSAL',
  'ATTACHED_TO_PROPOSAL',
  'ARCHIVED'
);

CREATE TYPE "ProposalVersionStatus" AS ENUM (
  'DRAFT',
  'LOCKED',
  'EXPORTED',
  'SENT',
  'SUPERSEDED'
);

CREATE TABLE "SceneProject" (
  "id" TEXT NOT NULL,
  "status" "SceneProjectStatus" NOT NULL DEFAULT 'DRAFT',
  "clientRequestId" TEXT,
  "selectionSessionId" TEXT,
  "title" TEXT NOT NULL,
  "customerName" TEXT,
  "customerAddress" TEXT,
  "solutionName" TEXT NOT NULL,
  "objectTypeLabel" TEXT,
  "segmentLabel" TEXT,
  "boundsJson" JSONB NOT NULL,
  "itemsJson" JSONB NOT NULL,
  "summaryJson" JSONB NOT NULL,
  "notes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SceneProject_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProposalVersion" (
  "id" TEXT NOT NULL,
  "proposalId" TEXT NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "status" "ProposalVersionStatus" NOT NULL DEFAULT 'LOCKED',
  "dedupeKey" TEXT,
  "title" TEXT NOT NULL,
  "clientSnapshot" JSONB NOT NULL,
  "itemsSnapshot" JSONB NOT NULL,
  "totalsSnapshot" JSONB NOT NULL,
  "sceneSnapshot" JSONB,
  "draftSnapshot" JSONB NOT NULL,
  "subtotalRub" DECIMAL(14,2) NOT NULL,
  "deliveryRub" DECIMAL(14,2) NOT NULL,
  "installationRub" DECIMAL(14,2) NOT NULL,
  "totalRub" DECIMAL(14,2) NOT NULL,
  "pdfExportedAt" TIMESTAMP(3),
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ProposalVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProposalVersionItem" (
  "id" TEXT NOT NULL,
  "proposalVersionId" TEXT NOT NULL,
  "article" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "imageUrl" TEXT,
  "sizeLabel" TEXT,
  "materialLabel" TEXT,
  "ageLabel" TEXT,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unitPriceRub" DECIMAL(14,2) NOT NULL,
  "totalPriceRub" DECIMAL(14,2) NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProposalVersionItem_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Proposal"
  ADD COLUMN "dedupeKey" TEXT,
  ADD COLUMN "clientRequestId" TEXT,
  ADD COLUMN "selectionSessionId" TEXT,
  ADD COLUMN "sceneProjectId" TEXT;

CREATE UNIQUE INDEX "Proposal_dedupeKey_key" ON "Proposal"("dedupeKey");
CREATE UNIQUE INDEX "ProposalVersion_dedupeKey_key" ON "ProposalVersion"("dedupeKey");
CREATE UNIQUE INDEX "ProposalVersion_proposalId_versionNumber_key" ON "ProposalVersion"("proposalId", "versionNumber");
CREATE INDEX "SceneProject_status_idx" ON "SceneProject"("status");
CREATE INDEX "SceneProject_clientRequestId_idx" ON "SceneProject"("clientRequestId");
CREATE INDEX "SceneProject_selectionSessionId_idx" ON "SceneProject"("selectionSessionId");
CREATE INDEX "SceneProject_createdByUserId_idx" ON "SceneProject"("createdByUserId");
CREATE INDEX "SceneProject_createdAt_idx" ON "SceneProject"("createdAt");
CREATE INDEX "Proposal_clientRequestId_idx" ON "Proposal"("clientRequestId");
CREATE INDEX "Proposal_selectionSessionId_idx" ON "Proposal"("selectionSessionId");
CREATE INDEX "Proposal_sceneProjectId_idx" ON "Proposal"("sceneProjectId");
CREATE INDEX "ProposalVersion_proposalId_idx" ON "ProposalVersion"("proposalId");
CREATE INDEX "ProposalVersion_createdByUserId_idx" ON "ProposalVersion"("createdByUserId");
CREATE INDEX "ProposalVersionItem_proposalVersionId_idx" ON "ProposalVersionItem"("proposalVersionId");
CREATE INDEX "ProposalVersionItem_article_idx" ON "ProposalVersionItem"("article");

ALTER TABLE "SceneProject" ADD CONSTRAINT "SceneProject_clientRequestId_fkey" FOREIGN KEY ("clientRequestId") REFERENCES "ClientRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SceneProject" ADD CONSTRAINT "SceneProject_selectionSessionId_fkey" FOREIGN KEY ("selectionSessionId") REFERENCES "SelectionSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SceneProject" ADD CONSTRAINT "SceneProject_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_clientRequestId_fkey" FOREIGN KEY ("clientRequestId") REFERENCES "ClientRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_selectionSessionId_fkey" FOREIGN KEY ("selectionSessionId") REFERENCES "SelectionSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_sceneProjectId_fkey" FOREIGN KEY ("sceneProjectId") REFERENCES "SceneProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProposalVersion" ADD CONSTRAINT "ProposalVersion_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProposalVersion" ADD CONSTRAINT "ProposalVersion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProposalVersionItem" ADD CONSTRAINT "ProposalVersionItem_proposalVersionId_fkey" FOREIGN KEY ("proposalVersionId") REFERENCES "ProposalVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
