-- Wave 1.1 hardening: idempotency keys for primary recommendation and audit events.

ALTER TABLE "SelectionSession" ADD COLUMN "dedupeKey" TEXT;
ALTER TABLE "EventLog" ADD COLUMN "dedupeKey" TEXT;

CREATE UNIQUE INDEX "SelectionSession_dedupeKey_key" ON "SelectionSession"("dedupeKey");
CREATE UNIQUE INDEX "EventLog_dedupeKey_key" ON "EventLog"("dedupeKey");
