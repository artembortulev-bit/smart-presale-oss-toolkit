-- P1A formal exit gate:
-- one ClientRequest may have at most one canonical OPEN SalesAction.
-- This migration is intentionally fail-loud. If duplicate OPEN actions exist,
-- run the guarded repair script first, then apply migrations again.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "SalesAction"
    WHERE "status" = 'OPEN'
    GROUP BY "clientRequestId"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot create SalesAction open invariant: duplicate OPEN actions exist';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "SalesAction_clientRequest_open_unique_idx"
  ON "SalesAction"("clientRequestId")
  WHERE "status" = 'OPEN';
