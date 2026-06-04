import { Prisma, ProposalStatus } from "@prisma/client";

import { buildProposalDraft } from "@/application/proposals/build-proposal";
import {
  OpenSalesActionConflictError,
  archiveClientRequest,
  createSalesAction,
  recordProposalSent,
  recordSalesOutcome,
  updateSalesAction,
} from "@/application/sales-process/service";
import { managerWorkspaceReadRepository } from "@/infrastructure/db/manager-workspace-read-repository";
import { prisma } from "@/infrastructure/db/prisma";
import { checkOperationalDatabaseReadiness } from "@/infrastructure/db/readiness";
import { proposalRepository } from "@/infrastructure/db/proposal-repository";
import { userRepository } from "@/infrastructure/db/user-repository";

type VerificationContext = {
  source: string;
  directRequestId?: string;
  raceRequestId?: string;
  replayRequestId?: string;
  updateRequestId?: string;
  regressionRequestId?: string;
  regressionProposalId?: string;
  regressionProposalVersionId?: string;
};

type IndexRow = {
  indexName: string;
  isUnique: boolean;
  indexDef: string;
  predicate: string | null;
};

const activeProposalStatuses: ProposalStatus[] = ["DRAFT", "READY", "SENT"];

function assertCondition(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function describePrismaError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return {
      name: error.name,
      code: error.code,
      message: error.message,
      meta: error.meta,
    };
  }

  return {
    name: error instanceof Error ? error.name : typeof error,
    message: error instanceof Error ? error.message : String(error),
  };
}

function isOpenConflict(error: unknown) {
  const cause =
    error instanceof Error && "cause" in error && error.cause
      ? error.cause
      : error;

  return (
    cause instanceof OpenSalesActionConflictError ||
    error instanceof OpenSalesActionConflictError
  );
}

async function createRequest(ctx: VerificationContext, suffix: string) {
  const user = await userRepository.ensureDefaultInternalUser();

  return prisma.clientRequest.create({
    data: {
      reference: `${ctx.source}-${suffix}`,
      source: ctx.source,
      status: "IN_SALES",
      customerName: "P1A Verification Contact",
      companyName: "P1A Verification",
      email: "p1a-verify@example.local",
      projectName: `P1A ${suffix}`,
      objectType: "playground",
      segment: "OPTIMUM",
      widthM: new Prisma.Decimal(5),
      lengthM: new Prisma.Decimal(6),
      needsDelivery: false,
      needsInstallation: false,
      estimateJson: {},
      modelBriefJson: {},
      qualificationJson: {},
      qualificationSummary: "P1A exit gate fixture",
      qualificationConfidence: new Prisma.Decimal(1),
      assignedManagerId: user.id,
    },
  });
}

async function verifyIndexSemantics() {
  const rows = await prisma.$queryRaw<IndexRow[]>`
    SELECT
      c.relname AS "indexName",
      i.indisunique AS "isUnique",
      pg_get_indexdef(i.indexrelid) AS "indexDef",
      pg_get_expr(i.indpred, i.indrelid) AS "predicate"
    FROM pg_index i
    JOIN pg_class c ON c.oid = i.indexrelid
    JOIN pg_class t ON t.oid = i.indrelid
    WHERE t.relname = 'SalesAction'
      AND c.relname = 'SalesAction_clientRequest_open_unique_idx'
  `;

  const [index] = rows;

  if (!index) {
    throw new Error("SalesAction_clientRequest_open_unique_idx is missing");
  }

  assertCondition(index.isUnique, "SalesAction open invariant index is not unique");
  assertCondition(
    index.indexDef.includes('"clientRequestId"'),
    "SalesAction open invariant index does not target clientRequestId",
  );
  assertCondition(
    /status/i.test(index.predicate ?? "") && /OPEN/.test(index.predicate ?? ""),
    `SalesAction open invariant predicate is wrong: ${index.predicate}`,
  );

  return index;
}

async function verifyDirectDbBehavior(ctx: VerificationContext) {
  const request = await createRequest(ctx, "DIRECT");
  ctx.directRequestId = request.id;

  await prisma.salesAction.create({
    data: {
      dedupeKey: `p1a-direct-${ctx.source}-one`,
      clientRequestId: request.id,
      type: "FOLLOW_UP",
      status: "OPEN",
      title: "P1A direct open one",
    },
  });

  let duplicateError: unknown;

  try {
    await prisma.salesAction.create({
      data: {
        dedupeKey: `p1a-direct-${ctx.source}-two`,
        clientRequestId: request.id,
        type: "FOLLOW_UP",
        status: "OPEN",
        title: "P1A direct open two",
      },
    });
  } catch (error) {
    duplicateError = error;
  }

  assertCondition(duplicateError, "Direct second OPEN SalesAction did not fail");
  assertCondition(
    duplicateError instanceof Prisma.PrismaClientKnownRequestError &&
      duplicateError.code === "P2002",
    "Direct second OPEN SalesAction failed with unexpected error",
  );

  const openCount = await prisma.salesAction.count({
    where: {
      clientRequestId: request.id,
      status: "OPEN",
    },
  });

  assertCondition(openCount === 1, "Direct DB behavior left duplicate OPEN actions");

  return describePrismaError(duplicateError);
}

async function verifyParallelServiceCreate(ctx: VerificationContext, actorUserId: string) {
  const request = await createRequest(ctx, "RACE");
  ctx.raceRequestId = request.id;

  const results = await Promise.allSettled(
    Array.from({ length: 6 }, (_, index) =>
      createSalesAction(
        {
          clientRequestId: request.id,
          type: "FOLLOW_UP",
          status: "OPEN",
          title: `P1A race action ${index + 1}`,
          nextActionLabel: `P1A race next ${index + 1}`,
          dueAt: new Date(Date.now() + (index + 1) * 60_000).toISOString(),
          dedupeKey: `manager-command:${ctx.source}:race:${index + 1}`,
        },
        actorUserId,
      ),
    ),
  );

  const fulfilled = results.filter((result) => result.status === "fulfilled");
  const rejected = results.filter((result) => result.status === "rejected");

  assertCondition(fulfilled.length === 1, "Parallel OPEN race did not keep exactly one winner");
  assertCondition(
    rejected.length === 5 &&
      rejected.every(
        (result) => result.status === "rejected" && isOpenConflict(result.reason),
      ),
    "Parallel OPEN race did not return controlled conflicts for losing commands",
  );

  const openActions = await prisma.salesAction.findMany({
    where: {
      clientRequestId: request.id,
      status: "OPEN",
    },
  });

  assertCondition(openActions.length === 1, "Parallel OPEN race left duplicate OPEN actions");

  const [queue, detail] = await Promise.all([
    managerWorkspaceReadRepository.getManagerQueue({
      scope: "all",
      nextAction: "any",
    }),
    managerWorkspaceReadRepository.getRequestWorkspace(request.id),
  ]);

  const queueItem = queue.items.find((item) => item.clientRequestId === request.id);

  assertCondition(queueItem, "Race request disappeared from manager queue");
  assertCondition(detail, "Race request detail is missing");
  assertCondition(
    queueItem?.nextActionLabel === detail?.process.nextActionLabel,
    "Queue/detail next action diverged after race conflict",
  );
}

async function verifyRepeatedSameCreate(ctx: VerificationContext, actorUserId: string) {
  const request = await createRequest(ctx, "REPLAY");
  ctx.replayRequestId = request.id;
  const dedupeKey = `manager-command:${ctx.source}:replay:create`;

  const [one, two] = await Promise.all([
    createSalesAction(
      {
        clientRequestId: request.id,
        type: "FOLLOW_UP",
        status: "OPEN",
        title: "P1A replay action",
        nextActionLabel: "P1A replay next",
        dedupeKey,
      },
      actorUserId,
    ),
    createSalesAction(
      {
        clientRequestId: request.id,
        type: "FOLLOW_UP",
        status: "OPEN",
        title: "P1A replay action",
        nextActionLabel: "P1A replay next",
        dedupeKey,
      },
      actorUserId,
    ),
  ]);

  assertCondition(one.id === two.id, "Same commandId create replay returned different actions");

  const [actionCount, openCount] = await Promise.all([
    prisma.salesAction.count({ where: { dedupeKey } }),
    prisma.salesAction.count({
      where: {
        clientRequestId: request.id,
        status: "OPEN",
      },
    }),
  ]);

  assertCondition(actionCount === 1, "Same commandId create replay created duplicate action");
  assertCondition(openCount === 1, "Same commandId create replay left duplicate OPEN actions");
}

async function verifyParallelRepeatedUpdate(ctx: VerificationContext, actorUserId: string) {
  const request = await createRequest(ctx, "UPDATE");
  ctx.updateRequestId = request.id;
  const action = await createSalesAction(
    {
      clientRequestId: request.id,
      type: "FOLLOW_UP",
      status: "OPEN",
      title: "P1A update action",
      nextActionLabel: "P1A update next",
      dedupeKey: `manager-command:${ctx.source}:update:create`,
    },
    actorUserId,
  );
  const updateDedupeKey = `manager-command:${ctx.source}:update:reschedule`;
  const dueAt = new Date(Date.now() + 3_600_000).toISOString();

  await Promise.all([
    updateSalesAction(
      action.id,
      {
        status: "OPEN",
        nextActionLabel: "P1A updated next",
        dueAt,
        dedupeKey: updateDedupeKey,
      },
      actorUserId,
    ),
    updateSalesAction(
      action.id,
      {
        status: "OPEN",
        nextActionLabel: "P1A updated next",
        dueAt,
        dedupeKey: updateDedupeKey,
      },
      actorUserId,
    ),
  ]);

  const afterParallel = await prisma.salesAction.findUniqueOrThrow({
    where: { id: action.id },
    select: { updatedAt: true, dueAt: true },
  });

  await updateSalesAction(
    action.id,
    {
      status: "OPEN",
      nextActionLabel: "P1A updated next",
      dueAt,
      dedupeKey: updateDedupeKey,
    },
    actorUserId,
  );

  const afterReplay = await prisma.salesAction.findUniqueOrThrow({
    where: { id: action.id },
    select: { updatedAt: true, dueAt: true },
  });
  const eventCount = await prisma.eventLog.count({
    where: { dedupeKey: updateDedupeKey },
  });

  assertCondition(
    afterParallel.updatedAt.getTime() === afterReplay.updatedAt.getTime(),
    "Repeated update command changed SalesAction.updatedAt",
  );
  assertCondition(
    afterParallel.dueAt?.getTime() === afterReplay.dueAt?.getTime(),
    "Repeated update command changed SalesAction.dueAt",
  );
  assertCondition(eventCount === 1, "Repeated update command created duplicate EventLog");
}

async function createRegressionProposal(
  ctx: VerificationContext,
  requestId: string,
  actorUserId: string,
) {
  const draft = await buildProposalDraft({
    title: "P1A regression proposal",
    customerName: "P1A Verification",
    customerAddress: "Verification address",
    deliveryRub: 0,
    installationRub: 0,
    customLines: [
      {
        article: "P1A-001",
        name: "P1A regression item",
        quantity: 1,
        unitPriceRub: 100_000,
        totalPriceRub: 100_000,
        materialLabel: "Verification material",
        sizeLabel: "5 x 6 m",
      },
    ],
  });

  const saved = await proposalRepository.saveDraftVersion({
    draft,
    clientRequestId: requestId,
    createdByUserId: actorUserId,
    source: ctx.source,
  });

  await prisma.proposal.update({
    where: { id: saved.proposalId },
    data: { status: "READY" },
  });

  ctx.regressionProposalId = saved.proposalId;
  ctx.regressionProposalVersionId = saved.proposalVersionId;

  return saved;
}

async function verifyRegressionFlow(ctx: VerificationContext, actorUserId: string) {
  const request = await createRequest(ctx, "REGRESSION");
  ctx.regressionRequestId = request.id;

  const assigned = await createSalesAction(
    {
      clientRequestId: request.id,
      assignedManagerId: actorUserId,
      type: "HANDOFF",
      status: "OPEN",
      title: "P1A assigned",
      nextActionLabel: "P1A contact client",
      dedupeKey: `manager-command:${ctx.source}:regression:assign`,
    },
    actorUserId,
  );

  await updateSalesAction(
    assigned.id,
    {
      status: "OPEN",
      nextActionLabel: "P1A rescheduled contact",
      dueAt: new Date(Date.now() + 7_200_000).toISOString(),
      dedupeKey: `manager-command:${ctx.source}:regression:reschedule`,
    },
    actorUserId,
  );

  await updateSalesAction(
    assigned.id,
    {
      status: "COMPLETED",
      outcome: "CONTACTED",
      dedupeKey: `manager-command:${ctx.source}:regression:complete`,
    },
    actorUserId,
  );

  const canceled = await createSalesAction(
    {
      clientRequestId: request.id,
      type: "FOLLOW_UP",
      status: "OPEN",
      title: "P1A cancel candidate",
      nextActionLabel: "P1A cancel candidate",
      dedupeKey: `manager-command:${ctx.source}:regression:create-cancel`,
    },
    actorUserId,
  );

  await updateSalesAction(
    canceled.id,
    {
      status: "CANCELED",
      dedupeKey: `manager-command:${ctx.source}:regression:cancel`,
    },
    actorUserId,
  );

  const proposal = await createRegressionProposal(ctx, request.id, actorUserId);

  await recordProposalSent(
    {
      clientRequestId: request.id,
      proposalId: proposal.proposalId,
      proposalVersionId: proposal.proposalVersionId,
      nextActionLabel: "P1A follow proposal",
      dedupeKey: `manager-command:${ctx.source}:regression:sent`,
    },
    actorUserId,
  );

  await recordSalesOutcome(
    {
      clientRequestId: request.id,
      proposalId: proposal.proposalId,
      proposalVersionId: proposal.proposalVersionId,
      outcome: "WON",
      dedupeKey: `manager-command:${ctx.source}:regression:won`,
    },
    actorUserId,
  );

  await archiveClientRequest(
    {
      clientRequestId: request.id,
      notes: "P1A regression archive",
      dedupeKey: `manager-command:${ctx.source}:regression:archive`,
    },
    actorUserId,
  );

  const [finalRequest, finalProposal, openCount, activeProposalCount] =
    await Promise.all([
      prisma.clientRequest.findUniqueOrThrow({
        where: { id: request.id },
        select: {
          status: true,
          nextActionLabel: true,
          nextActionDueAt: true,
          salesOutcome: true,
          salesOutcomeAt: true,
          archivedAt: true,
        },
      }),
      prisma.proposal.findUniqueOrThrow({
        where: { id: proposal.proposalId },
        select: { status: true, sentAt: true, acceptedAt: true },
      }),
      prisma.salesAction.count({
        where: { clientRequestId: request.id, status: "OPEN" },
      }),
      prisma.proposal.count({
        where: {
          clientRequestId: request.id,
          status: { in: activeProposalStatuses },
        },
      }),
    ]);

  assertCondition(finalRequest.status === "ARCHIVED", "Regression request was not archived");
  assertCondition(finalRequest.salesOutcome === "WON", "Regression outcome was not WON");
  assertCondition(finalRequest.salesOutcomeAt, "Regression outcome timestamp is missing");
  assertCondition(finalRequest.archivedAt, "Regression archive timestamp is missing");
  assertCondition(openCount === 0, "Regression flow left an OPEN SalesAction");
  assertCondition(activeProposalCount === 0, "Regression flow left an active proposal");
  assertCondition(finalProposal.status === "ACCEPTED", "Regression proposal was not accepted");
  assertCondition(finalProposal.sentAt, "Regression proposal sentAt is missing");
  assertCondition(finalProposal.acceptedAt, "Regression proposal acceptedAt is missing");
}

async function cleanup(ctx: VerificationContext) {
  const requests = await prisma.clientRequest.findMany({
    where: { source: ctx.source },
    select: { id: true },
  });
  const requestIds = requests.map((request) => request.id);
  const proposals = await prisma.proposal.findMany({
    where: {
      OR: [
        { clientRequestId: { in: requestIds } },
        ctx.regressionProposalId ? { id: ctx.regressionProposalId } : undefined,
      ].filter(Boolean) as Prisma.ProposalWhereInput[],
    },
    select: { id: true },
  });
  const proposalIds = proposals.map((proposal) => proposal.id);
  const versions = await prisma.proposalVersion.findMany({
    where: {
      OR: [
        { proposalId: { in: proposalIds } },
        ctx.regressionProposalVersionId
          ? { id: ctx.regressionProposalVersionId }
          : undefined,
      ].filter(Boolean) as Prisma.ProposalVersionWhereInput[],
    },
    select: { id: true },
  });
  const versionIds = versions.map((version) => version.id);
  const actionIds = (
    await prisma.salesAction.findMany({
      where: { clientRequestId: { in: requestIds } },
      select: { id: true },
    })
  ).map((action) => action.id);
  const entityIds = [...requestIds, ...proposalIds, ...versionIds, ...actionIds];

  await prisma.eventLog.deleteMany({
    where: {
      OR: [
        { dedupeKey: { contains: ctx.source } },
        { entityId: { in: entityIds } },
      ],
    },
  });
  await prisma.salesAction.deleteMany({
    where: { clientRequestId: { in: requestIds } },
  });
  await prisma.proposalVersionItem.deleteMany({
    where: { proposalVersionId: { in: versionIds } },
  });
  await prisma.proposalVersion.deleteMany({
    where: { id: { in: versionIds } },
  });
  await prisma.proposalItem.deleteMany({
    where: { proposalId: { in: proposalIds } },
  });
  await prisma.proposal.deleteMany({
    where: { id: { in: proposalIds } },
  });
  await prisma.clientRequest.deleteMany({
    where: { id: { in: requestIds } },
  });
}

async function main() {
  const readiness = await checkOperationalDatabaseReadiness();

  if (!readiness.ok) {
    throw new Error(
      `Operational DB is not ready: ${readiness.code}. ${readiness.action}`,
    );
  }

  const user = await userRepository.ensureDefaultInternalUser();
  const ctx: VerificationContext = {
    source: `P1A_EXIT_VERIFY_${Date.now()}`,
  };

  try {
    const index = await verifyIndexSemantics();
    const directDuplicateError = await verifyDirectDbBehavior(ctx);
    await verifyParallelServiceCreate(ctx, user.id);
    await verifyRepeatedSameCreate(ctx, user.id);
    await verifyParallelRepeatedUpdate(ctx, user.id);
    await verifyRegressionFlow(ctx, user.id);

    console.log(
      JSON.stringify(
        {
          ok: true,
          source: ctx.source,
          checked: [
            "partial-unique-index-semantics",
            "direct-db-duplicate-open-rejection",
            "parallel-service-open-race-conflicts",
            "same-command-create-replay",
            "parallel-repeated-update-serialization",
            "manager-flow-regressions",
          ],
          index,
          directDuplicateError,
        },
        null,
        2,
      ),
    );
  } finally {
    await cleanup(ctx);
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
