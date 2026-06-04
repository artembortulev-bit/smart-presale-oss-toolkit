import { Prisma, ProposalStatus } from "@prisma/client";

import { buildProposalDraft } from "@/application/proposals/build-proposal";
import {
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
  requestId?: string;
  proposalId?: string;
  proposalVersionId?: string;
};

const activeProposalStatuses: ProposalStatus[] = ["DRAFT", "READY", "SENT"];

function assertCondition(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function requireFixtureIds(ctx: VerificationContext) {
  assertCondition(ctx.requestId, "Verification request was not created");
  assertCondition(ctx.proposalId, "Verification proposal was not created");
  assertCondition(ctx.proposalVersionId, "Verification proposal version was not created");

  return {
    requestId: ctx.requestId as string,
    proposalId: ctx.proposalId as string,
    proposalVersionId: ctx.proposalVersionId as string,
  };
}

function cookieHeaderFromSetCookie(value: string | null) {
  if (!value) {
    return "";
  }

  return value
    .split(/,(?=\s*[^;,]+=)/)
    .map((cookie) => cookie.split(";")[0]?.trim())
    .filter(Boolean)
    .join("; ");
}

async function createEmployeeCookie(baseUrl: string) {
  const formData = new FormData();
  formData.set("role", "employee");
  formData.set("next", "/admin/manager");

  const response = await fetch(new URL("/api/session/role", baseUrl), {
    method: "POST",
    body: formData,
    redirect: "manual",
  });

  const cookie = cookieHeaderFromSetCookie(response.headers.get("set-cookie"));

  if (!cookie) {
    throw new Error("Failed to obtain employee session cookie from dev server");
  }

  return cookie;
}

async function getWithCookie(baseUrl: string, path: string, cookie: string) {
  const response = await fetch(new URL(path, baseUrl), {
    headers: {
      cookie,
    },
    redirect: "manual",
  });

  if (response.status >= 400) {
    throw new Error(`GET ${path} failed with status ${response.status}`);
  }

  return response.status;
}

async function createVerificationFixture(ctx: VerificationContext) {
  const user = await userRepository.ensureDefaultInternalUser();
  const reference = `P1A-P0-${Date.now()}`;

  const request = await prisma.clientRequest.create({
    data: {
      reference,
      source: ctx.source,
      status: "IN_SALES",
      customerName: "Verification Contact",
      companyName: "P1A P0 Verification",
      email: "verify@example.local",
      projectName: "Runtime verification request",
      objectType: "playground",
      segment: "OPTIMUM",
      widthM: new Prisma.Decimal(5),
      lengthM: new Prisma.Decimal(6),
      needsDelivery: false,
      needsInstallation: false,
      estimateJson: {},
      modelBriefJson: {},
      qualificationJson: {},
      qualificationSummary: "Verification fixture",
      qualificationConfidence: new Prisma.Decimal(1),
      assignedManagerId: user.id,
    },
  });

  ctx.requestId = request.id;

  const draft = await buildProposalDraft({
    title: "Verification КП",
    customerName: "P1A P0 Verification",
    customerAddress: "Verification address",
    deliveryRub: 0,
    installationRub: 0,
    customLines: [
      {
        article: "VERIFY-001",
        name: "Verification playground item",
        quantity: 1,
        unitPriceRub: 100_000,
        totalPriceRub: 100_000,
        materialLabel: "Verification material",
        sizeLabel: "5 x 6 м",
      },
    ],
  });

  const savedProposal = await proposalRepository.saveDraftVersion({
    draft,
    clientRequestId: request.id,
    createdByUserId: user.id,
    source: ctx.source,
  });

  await prisma.proposal.update({
    where: { id: savedProposal.proposalId },
    data: { status: "READY" },
  });

  ctx.proposalId = savedProposal.proposalId;
  ctx.proposalVersionId = savedProposal.proposalVersionId;

  return { user, request, savedProposal };
}

async function fingerprint(ctx: VerificationContext) {
  const { requestId, proposalId, proposalVersionId } = requireFixtureIds(ctx);

  const relatedEntityIds = [
    requestId,
    proposalId,
    proposalVersionId,
  ];

  const [request, proposal, version, salesActionsCount, eventsCount] =
    await Promise.all([
      prisma.clientRequest.findUnique({
        where: { id: requestId },
        select: {
          status: true,
          updatedAt: true,
          lastSalesActionAt: true,
          salesOutcomeAt: true,
          archivedAt: true,
        },
      }),
      prisma.proposal.findUnique({
        where: { id: proposalId },
        select: {
          status: true,
          updatedAt: true,
          sentAt: true,
          acceptedAt: true,
          declinedAt: true,
        },
      }),
      prisma.proposalVersion.findUnique({
        where: { id: proposalVersionId },
        select: {
          status: true,
          updatedAt: true,
          pdfExportedAt: true,
        },
      }),
      prisma.salesAction.count({
        where: { clientRequestId: requestId },
      }),
      prisma.eventLog.count({
        where: {
          entityId: {
            in: relatedEntityIds,
          },
        },
      }),
    ]);

  return JSON.stringify({
    request,
    proposal,
    version,
    salesActionsCount,
    eventsCount,
  });
}

async function verifyHiddenWrites(ctx: VerificationContext, baseUrl: string) {
  const { requestId, proposalVersionId } = requireFixtureIds(ctx);
  const cookie = await createEmployeeCookie(baseUrl);
  const before = await fingerprint(ctx);

  await getWithCookie(baseUrl, "/admin/manager", cookie);
  await getWithCookie(baseUrl, `/admin/manager/${requestId}`, cookie);
  await getWithCookie(
    baseUrl,
    `/proposals/new?proposalVersionId=${proposalVersionId}`,
    cookie,
  );
  await getWithCookie(
    baseUrl,
    `/api/proposals/pdf?proposalVersionId=${proposalVersionId}`,
    cookie,
  );

  const after = await fingerprint(ctx);
  assertCondition(before === after, "Hidden write detected on open/view routes");
}

async function verifyIdempotentCommands(ctx: VerificationContext, actorUserId: string) {
  const { requestId, proposalId, proposalVersionId } = requireFixtureIds(ctx);

  const createKey = `manager-command:${ctx.source}:create`;
  const actionOne = await createSalesAction(
    {
      clientRequestId: requestId,
      type: "FOLLOW_UP",
      status: "OPEN",
      title: "Verification follow-up",
      nextActionLabel: "Verification next action",
      dueAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      dedupeKey: createKey,
    },
    actorUserId,
  );
  const actionTwo = await createSalesAction(
    {
      clientRequestId: requestId,
      type: "FOLLOW_UP",
      status: "OPEN",
      title: "Verification follow-up",
      nextActionLabel: "Verification next action",
      dueAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      dedupeKey: createKey,
    },
    actorUserId,
  );

  assertCondition(actionOne.id === actionTwo.id, "Repeated create action was not deduped");

  const completeKey = `manager-command:${ctx.source}:complete`;
  await updateSalesAction(
    actionOne.id,
    {
      status: "COMPLETED",
      outcome: "CONTACTED",
      dedupeKey: completeKey,
    },
    actorUserId,
  );
  const afterFirstComplete = await prisma.salesAction.findUniqueOrThrow({
    where: { id: actionOne.id },
    select: { updatedAt: true, completedAt: true },
  });
  await updateSalesAction(
    actionOne.id,
    {
      status: "COMPLETED",
      outcome: "CONTACTED",
      dedupeKey: completeKey,
    },
    actorUserId,
  );
  const afterSecondComplete = await prisma.salesAction.findUniqueOrThrow({
    where: { id: actionOne.id },
    select: { updatedAt: true, completedAt: true },
  });

  assertCondition(
    afterFirstComplete.updatedAt.getTime() === afterSecondComplete.updatedAt.getTime(),
    "Repeated update changed SalesAction.updatedAt",
  );
  assertCondition(
    afterFirstComplete.completedAt?.getTime() === afterSecondComplete.completedAt?.getTime(),
    "Repeated update changed SalesAction.completedAt",
  );

  const updateEventsCount = await prisma.eventLog.count({
    where: { dedupeKey: completeKey },
  });
  assertCondition(updateEventsCount === 1, "Repeated update created duplicate EventLog");

  const sentKey = `manager-command:${ctx.source}:proposal-sent`;
  await recordProposalSent(
    {
      clientRequestId: requestId,
      proposalId,
      proposalVersionId,
      nextActionLabel: "Verification client follow-up",
      dueAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      dedupeKey: sentKey,
    },
    actorUserId,
  );
  await recordProposalSent(
    {
      clientRequestId: requestId,
      proposalId,
      proposalVersionId,
      nextActionLabel: "Verification client follow-up",
      dueAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      dedupeKey: sentKey,
    },
    actorUserId,
  );

  const sentActionsCount = await prisma.salesAction.count({
    where: { dedupeKey: sentKey },
  });
  assertCondition(sentActionsCount === 1, "Repeated proposal sent created duplicate action");

  const outcomeKey = `manager-command:${ctx.source}:won`;
  await recordSalesOutcome(
    {
      clientRequestId: requestId,
      proposalId,
      proposalVersionId,
      outcome: "WON",
      dedupeKey: outcomeKey,
    },
    actorUserId,
  );
  await recordSalesOutcome(
    {
      clientRequestId: requestId,
      proposalId,
      proposalVersionId,
      outcome: "WON",
      dedupeKey: outcomeKey,
    },
    actorUserId,
  );

  const outcomeActionsCount = await prisma.salesAction.count({
    where: { dedupeKey: outcomeKey },
  });
  assertCondition(outcomeActionsCount === 1, "Repeated outcome created duplicate action");

  const archiveKey = `manager-command:${ctx.source}:archive`;
  await archiveClientRequest(
    {
      clientRequestId: requestId,
      notes: "Verification archive",
      dedupeKey: archiveKey,
    },
    actorUserId,
  );
  await archiveClientRequest(
    {
      clientRequestId: requestId,
      notes: "Verification archive",
      dedupeKey: archiveKey,
    },
    actorUserId,
  );

  const archiveActionsCount = await prisma.salesAction.count({
    where: { dedupeKey: archiveKey },
  });
  assertCondition(archiveActionsCount === 1, "Repeated archive created duplicate action");
}

async function verifyReadModelConsistency(ctx: VerificationContext) {
  const { requestId } = requireFixtureIds(ctx);

  const [queue, detail, activeProposalCount] = await Promise.all([
    managerWorkspaceReadRepository.getManagerQueue({
      scope: "all",
      nextAction: "any",
    }),
    managerWorkspaceReadRepository.getRequestWorkspace(requestId),
    prisma.proposal.count({
      where: {
        clientRequestId: requestId,
        status: { in: activeProposalStatuses },
      },
    }),
  ]);

  assertCondition(detail, "Archived request detail was not readable");
  assertCondition(detail?.request.status === "ARCHIVED", "Request detail did not show ARCHIVED");
  assertCondition(
    !queue.items.some((item) => item.clientRequestId === requestId),
    "Archived request is still visible in default queue",
  );
  assertCondition(activeProposalCount === 0, "Terminal request still has active proposal");
  assertCondition(
    detail?.attentionFlags.every(
      (flag) =>
        flag.code !== "NO_OWNER" &&
        flag.code !== "NO_NEXT_ACTION" &&
        flag.code !== "PROPOSAL_READY_NOT_SENT",
    ),
    "Terminal request still shows non-terminal attention flags",
  );
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
        ctx.proposalId ? { id: ctx.proposalId } : undefined,
      ].filter(Boolean) as Prisma.ProposalWhereInput[],
    },
    select: { id: true },
  });
  const proposalIds = proposals.map((proposal) => proposal.id);
  const versions = await prisma.proposalVersion.findMany({
    where: {
      OR: [
        { proposalId: { in: proposalIds } },
        ctx.proposalVersionId ? { id: ctx.proposalVersionId } : undefined,
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
        { dedupeKey: { startsWith: `manager-command:${ctx.source}` } },
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

  const baseUrl =
    process.env.VERIFY_MANAGER_BASE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";
  const ctx: VerificationContext = {
    source: `P1A_P0_VERIFY_${Date.now()}`,
  };

  try {
    const { user } = await createVerificationFixture(ctx);
    await verifyHiddenWrites(ctx, baseUrl);
    await verifyIdempotentCommands(ctx, user.id);
    await verifyReadModelConsistency(ctx);

    console.log(
      JSON.stringify(
        {
          ok: true,
          source: ctx.source,
          checked: [
            "hidden-writes",
            "idempotent-create-update-sent-outcome-archive",
            "archived-queue-detail-consistency",
          ],
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
