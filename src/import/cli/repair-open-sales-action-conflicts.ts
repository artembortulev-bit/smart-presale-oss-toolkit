import { Prisma } from "@prisma/client";

import { prisma } from "@/infrastructure/db/prisma";
import { checkOperationalDatabaseReadiness } from "@/infrastructure/db/readiness";

type ConflictRow = {
  clientRequestId: string;
  openCount: bigint;
};

function toMetadataObject(value: Prisma.JsonValue | null | undefined) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function toJsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function isConfirmed() {
  return (
    process.env.CONFIRM_OPEN_ACTION_REPAIR === "true" ||
    process.argv.includes("--confirm-open-action-repair")
  );
}

async function findConflicts() {
  return prisma.$queryRaw<ConflictRow[]>`
    SELECT "clientRequestId", COUNT(*)::bigint AS "openCount"
    FROM "SalesAction"
    WHERE "status" = 'OPEN'
    GROUP BY "clientRequestId"
    HAVING COUNT(*) > 1
    ORDER BY "clientRequestId"
  `;
}

async function repairConflict(
  tx: Prisma.TransactionClient,
  clientRequestId: string,
  repairedAt: Date,
) {
  const openActions = await tx.salesAction.findMany({
    where: {
      clientRequestId,
      status: "OPEN",
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }, { id: "desc" }],
  });

  const [keptAction, ...actionsToCancel] = openActions;

  if (!keptAction) {
    return { clientRequestId, keptActionId: null, canceledActionIds: [] };
  }

  for (const action of actionsToCancel) {
    const metadata = {
      ...toMetadataObject(action.metadata),
      p1aOpenInvariantRepair: {
        repairedAt: repairedAt.toISOString(),
        keptActionId: keptAction.id,
      },
    };

    await tx.salesAction.update({
      where: { id: action.id },
      data: {
        status: "CANCELED",
        completedAt: repairedAt,
        metadata: toJsonValue(metadata),
      },
    });
  }

  await tx.clientRequest.update({
    where: { id: clientRequestId },
    data: {
      nextActionLabel: keptAction.nextActionLabel ?? keptAction.title,
      nextActionDueAt: keptAction.dueAt,
      lastSalesActionAt: repairedAt,
    },
  });

  return {
    clientRequestId,
    keptActionId: keptAction.id,
    canceledActionIds: actionsToCancel.map((action) => action.id),
  };
}

async function main() {
  const readiness = await checkOperationalDatabaseReadiness();

  if (!readiness.ok) {
    throw new Error(
      `Operational DB is not ready: ${readiness.code}. ${readiness.action}`,
    );
  }

  const conflicts = await findConflicts();
  const summary = conflicts.map((row) => ({
    clientRequestId: row.clientRequestId,
    openCount: Number(row.openCount),
  }));

  if (conflicts.length === 0) {
    console.log(JSON.stringify({ ok: true, repaired: false, conflicts: [] }, null, 2));
    return;
  }

  if (!isConfirmed()) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          repaired: false,
          message:
            "Duplicate OPEN SalesAction records found. Re-run with --confirm-open-action-repair or CONFIRM_OPEN_ACTION_REPAIR=true to repair explicitly.",
          conflicts: summary,
        },
        null,
        2,
      ),
    );
    process.exitCode = 1;
    return;
  }

  const repairedAt = new Date();
  const repaired = await prisma.$transaction(async (tx) => {
    const results = [];

    for (const conflict of conflicts) {
      results.push(await repairConflict(tx, conflict.clientRequestId, repairedAt));
    }

    return results;
  });
  const remainingConflicts = await findConflicts();

  if (remainingConflicts.length > 0) {
    throw new Error("Open SalesAction repair did not clear all conflicts");
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        repaired: true,
        repairedAt: repairedAt.toISOString(),
        repairs: repaired,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
