-- Wave 2B: process layer for sales handoff and managed commercial workflow.

ALTER TYPE "ProposalStatus" ADD VALUE IF NOT EXISTS 'ACCEPTED';
ALTER TYPE "ProposalStatus" ADD VALUE IF NOT EXISTS 'DECLINED';

ALTER TYPE "ClientRequestStatus" ADD VALUE IF NOT EXISTS 'IN_SALES';
ALTER TYPE "ClientRequestStatus" ADD VALUE IF NOT EXISTS 'PROPOSAL_SENT';
ALTER TYPE "ClientRequestStatus" ADD VALUE IF NOT EXISTS 'WON';
ALTER TYPE "ClientRequestStatus" ADD VALUE IF NOT EXISTS 'LOST';

ALTER TYPE "EventType" ADD VALUE IF NOT EXISTS 'SALES_HANDOFF_CREATED';
ALTER TYPE "EventType" ADD VALUE IF NOT EXISTS 'SALES_ACTION_CREATED';
ALTER TYPE "EventType" ADD VALUE IF NOT EXISTS 'SALES_ACTION_UPDATED';
ALTER TYPE "EventType" ADD VALUE IF NOT EXISTS 'OWNERSHIP_ASSIGNED';
ALTER TYPE "EventType" ADD VALUE IF NOT EXISTS 'OUTCOME_RECORDED';

CREATE TYPE "SalesActionType" AS ENUM (
  'HANDOFF',
  'CALL',
  'EMAIL',
  'MEETING',
  'PROPOSAL_SENT',
  'FOLLOW_UP',
  'STATUS_CHANGE',
  'OUTCOME',
  'INTERNAL_NOTE'
);

CREATE TYPE "SalesActionStatus" AS ENUM (
  'OPEN',
  'COMPLETED',
  'CANCELED'
);

CREATE TYPE "SalesActionOutcome" AS ENUM (
  'CONTACTED',
  'PROPOSAL_SENT',
  'FOLLOW_UP_REQUIRED',
  'WON',
  'LOST',
  'NO_RESPONSE',
  'NOT_A_FIT'
);

ALTER TABLE "ClientRequest"
  ADD COLUMN "nextActionLabel" TEXT,
  ADD COLUMN "nextActionDueAt" TIMESTAMP(3),
  ADD COLUMN "lastSalesActionAt" TIMESTAMP(3),
  ADD COLUMN "salesOutcome" "SalesActionOutcome",
  ADD COLUMN "salesOutcomeAt" TIMESTAMP(3);

ALTER TABLE "Proposal"
  ADD COLUMN "sentAt" TIMESTAMP(3),
  ADD COLUMN "acceptedAt" TIMESTAMP(3),
  ADD COLUMN "declinedAt" TIMESTAMP(3),
  ADD COLUMN "outcomeNote" TEXT;

CREATE TABLE "SalesAction" (
  "id" TEXT NOT NULL,
  "dedupeKey" TEXT,
  "clientRequestId" TEXT NOT NULL,
  "proposalId" TEXT,
  "proposalVersionId" TEXT,
  "sceneProjectId" TEXT,
  "assignedManagerId" TEXT,
  "actorUserId" TEXT,
  "type" "SalesActionType" NOT NULL,
  "status" "SalesActionStatus" NOT NULL DEFAULT 'OPEN',
  "title" TEXT NOT NULL,
  "notes" TEXT,
  "nextActionLabel" TEXT,
  "dueAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "outcome" "SalesActionOutcome",
  "outcomeNote" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SalesAction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SalesAction_dedupeKey_key" ON "SalesAction"("dedupeKey");
CREATE INDEX "SalesAction_clientRequestId_idx" ON "SalesAction"("clientRequestId");
CREATE INDEX "SalesAction_proposalId_idx" ON "SalesAction"("proposalId");
CREATE INDEX "SalesAction_proposalVersionId_idx" ON "SalesAction"("proposalVersionId");
CREATE INDEX "SalesAction_sceneProjectId_idx" ON "SalesAction"("sceneProjectId");
CREATE INDEX "SalesAction_assignedManagerId_idx" ON "SalesAction"("assignedManagerId");
CREATE INDEX "SalesAction_actorUserId_idx" ON "SalesAction"("actorUserId");
CREATE INDEX "SalesAction_type_idx" ON "SalesAction"("type");
CREATE INDEX "SalesAction_status_idx" ON "SalesAction"("status");
CREATE INDEX "SalesAction_dueAt_idx" ON "SalesAction"("dueAt");
CREATE INDEX "SalesAction_outcome_idx" ON "SalesAction"("outcome");
CREATE INDEX "SalesAction_createdAt_idx" ON "SalesAction"("createdAt");
CREATE INDEX "ClientRequest_nextActionDueAt_idx" ON "ClientRequest"("nextActionDueAt");
CREATE INDEX "ClientRequest_salesOutcome_idx" ON "ClientRequest"("salesOutcome");
CREATE INDEX "Proposal_status_idx" ON "Proposal"("status");
CREATE UNIQUE INDEX "SalesAction_clientRequest_open_unique_idx"
  ON "SalesAction"("clientRequestId")
  WHERE "status" = 'OPEN';
CREATE UNIQUE INDEX "Proposal_clientRequest_active_unique_idx"
  ON "Proposal"("clientRequestId")
  WHERE "clientRequestId" IS NOT NULL
    AND "status" IN ('DRAFT', 'READY', 'SENT');

ALTER TABLE "SalesAction"
  ADD CONSTRAINT "SalesAction_clientRequestId_fkey"
  FOREIGN KEY ("clientRequestId") REFERENCES "ClientRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SalesAction"
  ADD CONSTRAINT "SalesAction_proposalId_fkey"
  FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SalesAction"
  ADD CONSTRAINT "SalesAction_proposalVersionId_fkey"
  FOREIGN KEY ("proposalVersionId") REFERENCES "ProposalVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SalesAction"
  ADD CONSTRAINT "SalesAction_sceneProjectId_fkey"
  FOREIGN KEY ("sceneProjectId") REFERENCES "SceneProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SalesAction"
  ADD CONSTRAINT "SalesAction_assignedManagerId_fkey"
  FOREIGN KEY ("assignedManagerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SalesAction"
  ADD CONSTRAINT "SalesAction_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
