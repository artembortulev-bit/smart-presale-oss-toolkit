import { Prisma, ProposalStatus } from "@prisma/client";

import {
  CommercialBaselineReadout,
  CommercialRequestState,
  ManagerAttentionFlag,
  ManagerAttentionFlagCode,
  ManagerQueueFilters,
  ManagerQueueItem,
  ManagerQueueSort,
  ManagerQueueView,
  ManagerWorkspaceReadRepository,
  RequestWorkspaceView,
  WorkspaceEvent,
  WorkspaceProposalSummary,
  WorkspaceProposalVersion,
  WorkspaceSalesAction,
} from "@/application/manager-workspace/read-models";
import {
  ClientRequestStatus,
  SalesActionOutcome,
  SalesActionStatus,
  SalesActionType,
} from "@/application/sales-process/types";
import { DEMO_READINESS_SOURCE } from "@/application/demo-readiness/constants";
import { prisma } from "@/infrastructure/db/prisma";
import { withOperationalDatabase } from "@/infrastructure/db/readiness";

const activeProposalStatuses: ProposalStatus[] = ["DRAFT", "READY", "SENT"];
const terminalRequestStatuses = new Set<ClientRequestStatus>([
  "WON",
  "LOST",
  "ARCHIVED",
]);
const commercialBaselineTimezone = "Europe/Moscow" as const;
const stalledThresholdBusinessDays = 3;
const dayMs = 24 * 60 * 60 * 1000;
const meaningfulSalesActionTypes = new Set<SalesActionType>([
  "CALL",
  "EMAIL",
  "MEETING",
  "PROPOSAL_SENT",
  "FOLLOW_UP",
  "OUTCOME",
]);
const terminalSalesOutcomes = new Set<SalesActionOutcome>([
  "WON",
  "LOST",
  "NOT_A_FIT",
]);

const queueInclude = Prisma.validator<Prisma.ClientRequestInclude>()({
  assignedManager: {
    select: {
      id: true,
      name: true,
    },
  },
  customerCompany: {
    select: {
      name: true,
    },
  },
  customerContact: {
    select: {
      fullName: true,
    },
  },
  salesActions: {
    where: {
      status: "OPEN",
    },
    orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
    take: 1,
  },
  proposals: {
    where: {
      status: {
        in: activeProposalStatuses,
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
    include: {
      versions: {
        select: {
          id: true,
          createdAt: true,
        },
        orderBy: {
          versionNumber: "desc",
        },
        take: 1,
      },
    },
    take: 1,
  },
});

const baselineInclude = Prisma.validator<Prisma.ClientRequestInclude>()({
  assignedManager: {
    select: {
      id: true,
    },
  },
  salesActions: {
    select: {
      id: true,
      type: true,
      status: true,
      title: true,
      notes: true,
      nextActionLabel: true,
      dueAt: true,
      outcome: true,
      proposalId: true,
      proposalVersionId: true,
      sceneProjectId: true,
      assignedManagerId: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  },
  proposals: {
    select: {
      id: true,
      status: true,
      sentAt: true,
      createdAt: true,
      updatedAt: true,
      versions: {
        select: {
          id: true,
          createdAt: true,
        },
        orderBy: {
          versionNumber: "desc",
        },
        take: 1,
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  },
});

type QueueRequest = Prisma.ClientRequestGetPayload<{
  include: typeof queueInclude;
}>;
type BaselineRequest = Prisma.ClientRequestGetPayload<{
  include: typeof baselineInclude;
}>;

const workspaceInclude = Prisma.validator<Prisma.ClientRequestInclude>()({
  assignedManager: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  customerCompany: {
    select: {
      name: true,
    },
  },
  customerContact: {
    select: {
      fullName: true,
      email: true,
      phone: true,
    },
  },
  selectionSessions: {
    orderBy: {
      createdAt: "desc",
    },
    take: 1,
    include: {
      recommendations: {
        orderBy: {
          rank: "asc",
        },
        take: 5,
      },
    },
  },
  sceneProjects: {
    orderBy: {
      updatedAt: "desc",
    },
    take: 1,
  },
  proposals: {
    orderBy: {
      updatedAt: "desc",
    },
    include: {
      versions: {
        orderBy: {
          versionNumber: "desc",
        },
      },
    },
  },
  salesActions: {
    orderBy: {
      createdAt: "desc",
    },
    take: 20,
    include: {
      assignedManager: {
        select: {
          id: true,
          name: true,
        },
      },
      actor: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
});

type WorkspaceRequest = Prisma.ClientRequestGetPayload<{
  include: typeof workspaceInclude;
}>;

type MeaningfulSalesActionCandidate = {
  type: string;
  nextActionLabel?: string | null;
  dueAt?: Date | string | null;
  notes?: string | null;
  outcome?: string | null;
  proposalId?: string | null;
  proposalVersionId?: string | null;
  sceneProjectId?: string | null;
  assignedManagerId?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type ProposalSentCandidate = {
  status: string;
  sentAt?: Date | null;
  updatedAt?: Date | null;
};

function decimalToNumber(value?: Prisma.Decimal | null) {
  return value === null || value === undefined ? undefined : value.toNumber();
}

function toIso(value?: Date | null) {
  return value?.toISOString();
}

function toDate(value?: Date | string | null) {
  if (!value) {
    return undefined;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function latestIso(...values: Array<Date | null | undefined>) {
  const timestamps = values
    .filter((value): value is Date => Boolean(value))
    .map((value) => value.getTime());

  if (timestamps.length === 0) {
    return new Date(0).toISOString();
  }

  return new Date(Math.max(...timestamps)).toISOString();
}

function isOverdue(value?: Date | null) {
  return Boolean(value && value.getTime() < Date.now());
}

function hasOverdueFlag(flags: ManagerAttentionFlag[]) {
  return flags.some((flag) => flag.code === "OVERDUE_NEXT_ACTION");
}

function isTerminalRequestStatus(status: ClientRequestStatus) {
  return terminalRequestStatuses.has(status);
}

function isTerminalOutcome(outcome?: SalesActionOutcome | null) {
  return Boolean(outcome && terminalSalesOutcomes.has(outcome));
}

function ratio(count: number, total: number) {
  return {
    count,
    total,
    rate: total > 0 ? count / total : 0,
  };
}

function median(values: number[]) {
  if (values.length === 0) {
    return undefined;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0
    ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
    : sorted[middle];
}

function hoursBetween(start?: Date, end?: Date) {
  if (!start || !end || end.getTime() < start.getTime()) {
    return undefined;
  }

  return (end.getTime() - start.getTime()) / (60 * 60 * 1000);
}

function weekdayInBaselineTimezone(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: commercialBaselineTimezone,
  }).format(date);
}

function isBusinessDay(date: Date) {
  const weekday = weekdayInBaselineTimezone(date);
  return weekday !== "Sat" && weekday !== "Sun";
}

function subtractBusinessDays(date: Date, businessDays: number) {
  let remaining = businessDays;
  let cursor = new Date(date);

  while (remaining > 0) {
    cursor = new Date(cursor.getTime() - dayMs);

    if (isBusinessDay(cursor)) {
      remaining -= 1;
    }
  }

  return cursor;
}

function earliestDate(dates: Array<Date | null | undefined>) {
  const timestamps = dates
    .filter((value): value is Date => Boolean(value))
    .map((value) => value.getTime());

  return timestamps.length > 0 ? new Date(Math.min(...timestamps)) : undefined;
}

function latestDate(dates: Array<Date | null | undefined>) {
  const timestamps = dates
    .filter((value): value is Date => Boolean(value))
    .map((value) => value.getTime());

  return timestamps.length > 0 ? new Date(Math.max(...timestamps)) : undefined;
}

function isMeaningfulSalesAction(action: MeaningfulSalesActionCandidate) {
  const type = action.type as SalesActionType;

  if (meaningfulSalesActionTypes.has(type)) {
    return true;
  }

  return (
    type === "HANDOFF" &&
    Boolean(
      action.nextActionLabel ||
        action.dueAt ||
        action.notes ||
        action.outcome ||
        action.proposalId ||
        action.proposalVersionId ||
        action.sceneProjectId ||
        action.assignedManagerId,
    )
  );
}

function firstMeaningfulSalesActionAt(request: {
  salesActions: MeaningfulSalesActionCandidate[];
}) {
  return request.salesActions.find(isMeaningfulSalesAction)?.createdAt;
}

function proposalSentAt(request: {
  status: string;
  salesOutcome?: SalesActionOutcome | null;
  salesActions: MeaningfulSalesActionCandidate[];
  proposals: ProposalSentCandidate[];
}) {
  return earliestDate([
    ...request.salesActions
      .filter((action) => action.type === "PROPOSAL_SENT")
      .map((action) => action.createdAt),
    ...request.proposals.map((proposal) =>
      proposal.sentAt ?? (proposal.status === "SENT" ? proposal.updatedAt : undefined),
    ),
  ]);
}

function hasProposalSentState(request: {
  status: string;
  salesOutcome?: SalesActionOutcome | null;
  salesActions: MeaningfulSalesActionCandidate[];
  proposals: ProposalSentCandidate[];
}) {
  return Boolean(
    proposalSentAt(request) ||
      request.status === "PROPOSAL_SENT" ||
      request.salesOutcome === "PROPOSAL_SENT" ||
      request.proposals.some((proposal) => proposal.status === "SENT"),
  );
}

function lastMeaningfulMovementAt(request: {
  salesActions: MeaningfulSalesActionCandidate[];
  proposals: ProposalSentCandidate[];
  salesOutcomeAt?: Date | null;
  submittedAt: Date;
}) {
  const meaningfulActionDates = request.salesActions
    .filter(isMeaningfulSalesAction)
    .map((action) => action.updatedAt ?? action.createdAt);

  return (
    latestDate([
      ...meaningfulActionDates,
      ...request.proposals.map((proposal) => proposal.sentAt),
      request.salesOutcomeAt,
    ]) ?? request.submittedAt
  );
}

function hasLatestProposalVersion(
  proposal?: {
    versions?: unknown[];
  } | null,
) {
  return Boolean(proposal?.versions?.length);
}

function buildCommercialState(input: {
  status: ClientRequestStatus;
  assignedManagerId?: string | null;
  openAction?: {
    dueAt?: Date | string | null;
  };
  activeProposal?: {
    status?: string | null;
    sentAt?: Date | string | null;
    versions?: unknown[];
  } | null;
  proposalSentAt?: Date | string | null;
  hasProposalSentState?: boolean;
  salesOutcome?: SalesActionOutcome | null;
  lastMeaningfulMovementAt?: Date | string | null;
  now?: Date;
  stalledBefore?: Date;
}): CommercialRequestState {
  const now = input.now ?? new Date();
  const stalledBefore =
    input.stalledBefore ?? subtractBusinessDays(now, stalledThresholdBusinessDays);
  const status = input.status;
  const isTerminal = isTerminalRequestStatus(status);
  const openDueAt = toDate(input.openAction?.dueAt);
  const sentAt =
    toDate(input.proposalSentAt) ?? toDate(input.activeProposal?.sentAt);
  const activeProposalStatus = input.activeProposal?.status;
  const hasSentState = Boolean(
    input.hasProposalSentState ||
      sentAt ||
      status === "PROPOSAL_SENT" ||
      input.salesOutcome === "PROPOSAL_SENT" ||
      activeProposalStatus === "SENT",
  );
  const hasUnsentActiveProposal = Boolean(
    !isTerminal &&
      !hasSentState &&
      activeProposalStatus &&
      (activeProposalStatus === "DRAFT" ||
        activeProposalStatus === "READY" ||
        hasLatestProposalVersion(input.activeProposal)),
  );
  const lastMovementAt = toDate(input.lastMeaningfulMovementAt);

  return {
    hasCanonicalOpenAction: Boolean(input.openAction),
    canonicalOpenActionDueAt: toIso(openDueAt),
    canonicalOpenActionOverdue: Boolean(openDueAt && openDueAt.getTime() < now.getTime()),
    activeProposalNotSent: hasUnsentActiveProposal,
    proposalReadyNotSent: Boolean(
      hasUnsentActiveProposal && activeProposalStatus === "READY",
    ),
    proposalSentAt: toIso(sentAt),
    sentWithoutOutcome: Boolean(
      !isTerminal &&
        hasSentState &&
        !isTerminalOutcome(input.salesOutcome),
    ),
    outcomeRecorded: isTerminalOutcome(input.salesOutcome),
    lastMeaningfulMovementAt: toIso(lastMovementAt),
    stalled: Boolean(
      !isTerminal && lastMovementAt && lastMovementAt.getTime() < stalledBefore.getTime(),
    ),
  };
}

function attentionRank(code: ManagerAttentionFlagCode) {
  switch (code) {
    case "OVERDUE_NEXT_ACTION":
      return 10;
    case "NO_OWNER":
      return 20;
    case "SENT_WITHOUT_OUTCOME":
      return 25;
    case "PROPOSAL_READY_NOT_SENT":
      return 30;
    case "ACTIVE_PROPOSAL_NOT_SENT":
      return 35;
    case "NO_NEXT_ACTION":
      return 40;
    case "PROCESS_OK":
    default:
      return 90;
  }
}

function primaryAttentionCode(flags: ManagerAttentionFlag[]) {
  return [...flags].sort(
    (left, right) => attentionRank(left.code) - attentionRank(right.code),
  )[0]?.code;
}

function priorityRank(flags: ManagerAttentionFlag[]) {
  return attentionRank(primaryAttentionCode(flags) ?? "PROCESS_OK");
}

function dateValue(value?: string) {
  if (!value) {
    return Number.POSITIVE_INFINITY;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? Number.POSITIVE_INFINITY : date.getTime();
}

function descendingDateValue(value?: string) {
  const date = value ? new Date(value) : undefined;
  return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
}

function compareQueueItems(sort: ManagerQueueSort | undefined) {
  return (left: ManagerQueueItem, right: ManagerQueueItem) => {
    if (sort === "dueAsc") {
      return (
        dateValue(left.nextActionAt) - dateValue(right.nextActionAt) ||
        left.priorityRank - right.priorityRank ||
        descendingDateValue(right.lastActivityAt) -
          descendingDateValue(left.lastActivityAt)
      );
    }

    if (sort === "updatedDesc") {
      return (
        descendingDateValue(right.updatedAt) - descendingDateValue(left.updatedAt) ||
        left.priorityRank - right.priorityRank
      );
    }

    if (sort === "createdDesc") {
      return (
        descendingDateValue(right.createdAt) - descendingDateValue(left.createdAt) ||
        left.priorityRank - right.priorityRank
      );
    }

    return (
      left.priorityRank - right.priorityRank ||
      dateValue(left.nextActionAt) - dateValue(right.nextActionAt) ||
      descendingDateValue(right.lastActivityAt) -
        descendingDateValue(left.lastActivityAt)
    );
  };
}

function requestTitle(request: {
  projectName?: string | null;
  objectType: string;
  reference: string;
}) {
  return request.projectName ?? `${request.objectType} / ${request.reference}`;
}

function appendAnd(
  where: Prisma.ClientRequestWhereInput,
  condition: Prisma.ClientRequestWhereInput,
) {
  where.AND = [...(Array.isArray(where.AND) ? where.AND : []), condition];
}

function toQueueItem(request: QueueRequest): ManagerQueueItem {
  const openAction = request.salesActions[0];
  const activeProposal = request.proposals[0];
  const nextActionAt = openAction?.dueAt ?? request.nextActionDueAt;
  const status = request.status as ClientRequestStatus;
  const proposalSentTimestamp = proposalSentAt({
    status,
    salesOutcome: request.salesOutcome as SalesActionOutcome | null,
    salesActions: request.salesActions,
    proposals: request.proposals,
  });
  const commercialState = buildCommercialState({
    status,
    assignedManagerId: request.assignedManagerId,
    openAction,
    activeProposal,
    proposalSentAt: proposalSentTimestamp,
    hasProposalSentState: hasProposalSentState({
      status,
      salesOutcome: request.salesOutcome as SalesActionOutcome | null,
      salesActions: request.salesActions,
      proposals: request.proposals,
    }),
    salesOutcome: request.salesOutcome as SalesActionOutcome | null,
  });
  const attentionFlags = buildAttentionFlags({
    status,
    assignedManagerId: request.assignedManagerId,
    nextActionLabel: request.nextActionLabel,
    nextActionDueAt: request.nextActionDueAt,
    commercialState,
    openAction: openAction
      ? {
          dueAt: openAction.dueAt,
          nextActionLabel: openAction.nextActionLabel,
          title: openAction.title,
        }
      : undefined,
  });
  const lastActivityAt = latestIso(
    request.lastSalesActionAt,
    activeProposal?.updatedAt,
    request.updatedAt,
  );
  const primaryCode = primaryAttentionCode(attentionFlags);

  return {
    clientRequestId: request.id,
    requestNumber: request.reference,
    source: request.source,
    isDemo: request.source === DEMO_READINESS_SOURCE,
    title: requestTitle(request),
    companyName: request.customerCompany?.name ?? request.companyName ?? undefined,
    contactName: request.customerContact?.fullName ?? request.customerName,
    currentStatus: status,
    assignedManagerId: request.assignedManagerId ?? undefined,
    assignedManagerName: request.assignedManager?.name ?? undefined,
    nextActionType: openAction?.type as SalesActionType | undefined,
    nextActionLabel:
      openAction?.nextActionLabel ?? openAction?.title ?? request.nextActionLabel ?? undefined,
    nextActionAt: toIso(nextActionAt),
    overdueFlag: hasOverdueFlag(attentionFlags),
    attentionFlags,
    primaryAttentionCode: primaryCode === "PROCESS_OK" ? undefined : primaryCode,
    priorityRank: priorityRank(attentionFlags),
    hasActiveProposal: Boolean(activeProposal),
    activeProposalId: activeProposal?.id,
    activeProposalStatus: activeProposal?.status,
    commercialState,
    lastActivityAt,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
  };
}

function buildQueueWhere(filters: ManagerQueueFilters): Prisma.ClientRequestWhereInput {
  const where: Prisma.ClientRequestWhereInput = {};

  if (filters.scope === "mine" && filters.managerId) {
    where.assignedManagerId = filters.managerId;
  }

  if (filters.status) {
    where.status = filters.status;
  } else {
    where.status = {
      not: "ARCHIVED",
    };
  }

  if (filters.overdueOnly) {
    appendAnd(where, {
      OR: [
        {
          nextActionDueAt: {
            lt: new Date(),
          },
        },
        {
          salesActions: {
            some: {
              status: "OPEN",
              dueAt: {
                lt: new Date(),
              },
            },
          },
        },
      ],
    });
  }

  if (filters.attention === "overdue") {
    appendAnd(where, {
      OR: [
        {
          nextActionDueAt: {
            lt: new Date(),
          },
        },
        {
          salesActions: {
            some: {
              status: "OPEN",
              dueAt: {
                lt: new Date(),
              },
            },
          },
        },
      ],
    });
  }

  if (filters.attention === "no-owner") {
    appendAnd(where, { assignedManagerId: null });
  }

  if (filters.attention === "no-next-action") {
    appendAnd(where, { nextActionLabel: null });
    appendAnd(where, { nextActionDueAt: null });
    appendAnd(where, { salesActions: { none: { status: "OPEN" } } });
  }

  if (filters.attention === "proposal-ready") {
    appendAnd(where, {
      proposals: {
        some: {
          status: "READY",
        },
      },
    });
  }

  if (filters.attention === "active-proposal") {
    appendAnd(where, {
      proposals: {
        some: {
          status: {
            in: ["DRAFT", "READY"],
          },
        },
      },
    });
  }

  if (filters.attention === "sent-without-outcome") {
    appendAnd(where, {
      OR: [
        { status: "PROPOSAL_SENT" },
        { salesOutcome: "PROPOSAL_SENT" },
        {
          proposals: {
            some: {
              status: "SENT",
            },
          },
        },
      ],
    });
    appendAnd(where, {
      OR: [
        { salesOutcome: null },
        {
          salesOutcome: {
            notIn: ["WON", "LOST", "NOT_A_FIT"],
          },
        },
      ],
    });
  }

  if (filters.nextAction === "with") {
    appendAnd(where, {
      OR: [
        { nextActionLabel: { not: null } },
        { nextActionDueAt: { not: null } },
        { salesActions: { some: { status: "OPEN" } } },
      ],
    });
  }

  if (filters.nextAction === "without") {
    appendAnd(where, { nextActionLabel: null });
    appendAnd(where, { nextActionDueAt: null });
    appendAnd(where, { salesActions: { none: { status: "OPEN" } } });
  }

  return where;
}

function buildBaselineCommercialState(
  request: BaselineRequest,
  now: Date,
  stalledBefore: Date,
) {
  const status = request.status as ClientRequestStatus;
  const openAction = request.salesActions.find((action) => action.status === "OPEN");
  const activeProposal = request.proposals.find((proposal) =>
    activeProposalStatuses.includes(proposal.status),
  );
  const sentAt = proposalSentAt({
    status,
    salesOutcome: request.salesOutcome as SalesActionOutcome | null,
    salesActions: request.salesActions,
    proposals: request.proposals,
  });

  return buildCommercialState({
    status,
    assignedManagerId: request.assignedManagerId,
    openAction,
    activeProposal,
    proposalSentAt: sentAt,
    hasProposalSentState: hasProposalSentState({
      status,
      salesOutcome: request.salesOutcome as SalesActionOutcome | null,
      salesActions: request.salesActions,
      proposals: request.proposals,
    }),
    salesOutcome: request.salesOutcome as SalesActionOutcome | null,
    lastMeaningfulMovementAt: lastMeaningfulMovementAt(request),
    now,
    stalledBefore,
  });
}

function buildCommercialBaseline(
  requests: BaselineRequest[],
  generatedAt: Date,
): CommercialBaselineReadout {
  const stalledBefore = subtractBusinessDays(
    generatedAt,
    stalledThresholdBusinessDays,
  );
  const activeRequests = requests.filter(
    (request) => !isTerminalRequestStatus(request.status as ClientRequestStatus),
  );
  const activeStates = activeRequests.map((request) => ({
    request,
    state: buildBaselineCommercialState(request, generatedAt, stalledBefore),
    openAction: request.salesActions.find((action) => action.status === "OPEN"),
  }));

  const sentRows = requests
    .map((request) => {
      const sentAt = proposalSentAt({
        status: request.status,
        salesOutcome: request.salesOutcome as SalesActionOutcome | null,
        salesActions: request.salesActions,
        proposals: request.proposals,
      });

      return {
        request,
        sentAt,
        hasSentState: hasProposalSentState({
          status: request.status,
          salesOutcome: request.salesOutcome as SalesActionOutcome | null,
          salesActions: request.salesActions,
          proposals: request.proposals,
        }),
      };
    })
    .filter((row) => row.hasSentState);

  const activeWorkToSentHours = requests
    .map((request) =>
      hoursBetween(
        firstMeaningfulSalesActionAt(request),
        proposalSentAt({
          status: request.status,
          salesOutcome: request.salesOutcome as SalesActionOutcome | null,
          salesActions: request.salesActions,
          proposals: request.proposals,
        }),
      ),
    )
    .filter((value): value is number => value !== undefined);
  const sentToOutcomeHours = sentRows
    .map((row) =>
      hoursBetween(
        row.sentAt,
        isTerminalOutcome(row.request.salesOutcome as SalesActionOutcome | null)
          ? row.request.salesOutcomeAt ?? undefined
          : undefined,
      ),
    )
    .filter((value): value is number => value !== undefined);
  const last7Days = new Date(generatedAt.getTime() - 7 * dayMs);
  const last30Days = new Date(generatedAt.getTime() - 30 * dayMs);
  const sentWithTimestamp = sentRows.filter((row) => row.sentAt);
  const outcomeCompleted = sentRows.filter((row) =>
    isTerminalOutcome(row.request.salesOutcome as SalesActionOutcome | null),
  ).length;

  return {
    generatedAt: generatedAt.toISOString(),
    timezone: commercialBaselineTimezone,
    stalledThresholdBusinessDays,
    activeRequests: activeRequests.length,
    noOwner: ratio(
      activeStates.filter(({ request }) => !request.assignedManagerId).length,
      activeRequests.length,
    ),
    noCanonicalNextAction: ratio(
      activeStates.filter(({ openAction }) => !openAction).length,
      activeRequests.length,
    ),
    overdueCanonicalNextAction: ratio(
      activeStates.filter(
        ({ openAction }) =>
          openAction?.dueAt && openAction.dueAt.getTime() < generatedAt.getTime(),
      ).length,
      activeRequests.length,
    ),
    activeUnsentProposal: ratio(
      activeStates.filter(({ state }) => state.activeProposalNotSent).length,
      activeRequests.length,
    ),
    proposalReadyNotSent: ratio(
      activeStates.filter(({ state }) => state.proposalReadyNotSent).length,
      activeRequests.length,
    ),
    sentWithoutOutcome: ratio(
      activeStates.filter(({ state }) => state.sentWithoutOutcome).length,
      activeRequests.length,
    ),
    stalledActiveRequests: {
      ...ratio(
        activeStates.filter(({ state }) => state.stalled).length,
        activeRequests.length,
      ),
      thresholdBefore: stalledBefore.toISOString(),
    },
    medianActiveWorkToProposalSentHours: median(activeWorkToSentHours),
    medianProposalSentToOutcomeHours: median(sentToOutcomeHours),
    sentThroughput: {
      last7Days: sentWithTimestamp.filter(
        (row) => row.sentAt && row.sentAt.getTime() >= last7Days.getTime(),
      ).length,
      last30Days: sentWithTimestamp.filter(
        (row) => row.sentAt && row.sentAt.getTime() >= last30Days.getTime(),
      ).length,
    },
    outcomeCompletionRate: ratio(outcomeCompleted, sentRows.length),
  };
}

function toWorkspaceSalesAction(
  action: WorkspaceRequest["salesActions"][number],
): WorkspaceSalesAction {
  return {
    id: action.id,
    clientRequestId: action.clientRequestId,
    proposalId: action.proposalId ?? undefined,
    proposalVersionId: action.proposalVersionId ?? undefined,
    sceneProjectId: action.sceneProjectId ?? undefined,
    type: action.type as SalesActionType,
    status: action.status as SalesActionStatus,
    title: action.title,
    notes: action.notes ?? undefined,
    nextActionLabel: action.nextActionLabel ?? undefined,
    dueAt: toIso(action.dueAt),
    completedAt: toIso(action.completedAt),
    outcome: action.outcome as SalesActionOutcome | undefined,
    outcomeNote: action.outcomeNote ?? undefined,
    assignedManagerId: action.assignedManagerId ?? undefined,
    assignedManagerName: action.assignedManager?.name ?? undefined,
    actorUserName: action.actor?.name ?? undefined,
    createdAt: action.createdAt.toISOString(),
    updatedAt: action.updatedAt.toISOString(),
  };
}

function toProposalVersion(
  proposal: WorkspaceRequest["proposals"][number],
  version: WorkspaceRequest["proposals"][number]["versions"][number],
): WorkspaceProposalVersion {
  return {
    id: version.id,
    proposalId: proposal.id,
    proposalNumber: proposal.number,
    versionNumber: version.versionNumber,
    status: version.status,
    title: version.title,
    totalRub: decimalToNumber(version.totalRub) ?? 0,
    pdfExportedAt: toIso(version.pdfExportedAt),
    createdAt: version.createdAt.toISOString(),
  };
}

function toProposalSummary(
  proposal: WorkspaceRequest["proposals"][number],
): WorkspaceProposalSummary {
  const latestVersion = proposal.versions[0];

  return {
    id: proposal.id,
    number: proposal.number,
    title: proposal.title,
    status: proposal.status,
    totalRub: decimalToNumber(proposal.totalRub) ?? 0,
    sentAt: toIso(proposal.sentAt),
    updatedAt: proposal.updatedAt.toISOString(),
    latestVersionId: latestVersion?.id,
    latestVersionNumber: latestVersion?.versionNumber,
  };
}

function buildAttentionFlags(input: {
  status: ClientRequestStatus;
  assignedManagerId?: string | null;
  nextActionLabel?: string | null;
  nextActionDueAt?: Date | string | null;
  commercialState?: CommercialRequestState;
  openAction?: {
    dueAt?: Date | string | null;
    nextActionLabel?: string | null;
    title?: string | null;
  };
}) {
  const flags: ManagerAttentionFlag[] = [];
  const status = input.status;
  const isTerminal = terminalRequestStatuses.has(status);

  if (!input.assignedManagerId && !isTerminal) {
    flags.push({
      code: "NO_OWNER",
      label: "Нет назначенного менеджера",
      severity: "critical",
    });
  }

  const nextActionAt = toDate(input.openAction?.dueAt) ?? toDate(input.nextActionDueAt);

  if (nextActionAt && isOverdue(nextActionAt) && !isTerminal) {
    flags.push({
      code: "OVERDUE_NEXT_ACTION",
      label: "Просрочено следующее действие",
      severity: "critical",
    });
  }

  if (
    !input.openAction &&
    !input.nextActionLabel &&
    !input.nextActionDueAt &&
    !isTerminal
  ) {
    flags.push({
      code: "NO_NEXT_ACTION",
      label: "Не запланирован следующий шаг",
      severity: "warning",
    });
  }

  if (input.commercialState?.sentWithoutOutcome && !isTerminal) {
    flags.push({
      code: "SENT_WITHOUT_OUTCOME",
      label: "КП отправлено, итог не зафиксирован",
      severity: "warning",
    });
  }

  if (input.commercialState?.proposalReadyNotSent && !isTerminal) {
    flags.push({
      code: "PROPOSAL_READY_NOT_SENT",
      label: "КП готово, но не отмечено как отправленное",
      severity: "warning",
    });
  }

  if (
    input.commercialState?.activeProposalNotSent &&
    !input.commercialState.proposalReadyNotSent &&
    !isTerminal
  ) {
    flags.push({
      code: "ACTIVE_PROPOSAL_NOT_SENT",
      label: "Есть активное КП без отправки",
      severity: "info",
    });
  }

  if (flags.length === 0) {
    flags.push({
      code: "PROCESS_OK",
      label: "Критичных сигналов нет",
      severity: "info",
    });
  }

  return flags;
}

function toWorkspaceEvent(
  event: Prisma.EventLogGetPayload<{
    include: { actor: { select: { name: true } } };
  }>,
): WorkspaceEvent {
  return {
    id: event.id,
    eventType: event.eventType,
    entityType: event.entityType,
    entityId: event.entityId,
    actorUserName: event.actor?.name ?? undefined,
    payload: event.payload as Record<string, unknown> | undefined,
    createdAt: event.createdAt.toISOString(),
  };
}

export const managerWorkspaceReadRepository: ManagerWorkspaceReadRepository = {
  async getManagerQueue(filters) {
    const view = await withOperationalDatabase(async () => {
      const where = buildQueueWhere(filters);
      const [requests, summaryRequests, baselineRequests] = await Promise.all([
        prisma.clientRequest.findMany({
          where,
          include: queueInclude,
          orderBy: [{ nextActionDueAt: "asc" }, { updatedAt: "desc" }],
          take: 200,
        }),
        prisma.clientRequest.findMany({
          where: {
            status: {
              not: "ARCHIVED",
            },
          },
          include: queueInclude,
        }),
        prisma.clientRequest.findMany({
          where: {
            status: {
              not: "ARCHIVED",
            },
            source: {
              not: DEMO_READINESS_SOURCE,
            },
          },
          include: baselineInclude,
        }),
      ]);

      const items = requests
        .map(toQueueItem)
        .sort(compareQueueItems(filters.sort))
        .slice(0, 80);
      const summaryItems = summaryRequests.map(toQueueItem);

      const generatedAt = new Date();

      return {
        generatedAt: generatedAt.toISOString(),
        filters,
        summary: {
          total: summaryItems.length,
          mine: filters.managerId
            ? summaryItems.filter(
                (request) => request.assignedManagerId === filters.managerId,
              ).length
            : 0,
          overdue: summaryItems.filter((request) =>
            request.attentionFlags.some(
              (flag) => flag.code === "OVERDUE_NEXT_ACTION",
            ),
          ).length,
          withoutOwner: summaryItems.filter(
            (request) => !request.assignedManagerId,
          ).length,
          withActiveProposal: summaryItems.filter(
            (request) => request.hasActiveProposal,
          ).length,
        },
        commercialBaseline: buildCommercialBaseline(baselineRequests, generatedAt),
        items,
      } satisfies ManagerQueueView;
    });

    return view;
  },

  async getRequestWorkspace(requestId) {
    const view = await withOperationalDatabase(async () => {
      const request = await prisma.clientRequest.findUnique({
        where: { id: requestId },
        include: workspaceInclude,
      });

      if (!request) {
        return null;
      }

      const availableManagers = await prisma.user.findMany({
        where: {
          status: "ACTIVE",
          role: {
            in: ["ADMIN", "MANAGER"],
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
        orderBy: {
          name: "asc",
        },
      });

      const activeProposalRecord = request.proposals.find((proposal) =>
        activeProposalStatuses.includes(proposal.status),
      );
      const activeProposal = activeProposalRecord
        ? toProposalSummary(activeProposalRecord)
        : undefined;
      const proposalVersions = request.proposals.flatMap((proposal) =>
        proposal.versions.map((version) => toProposalVersion(proposal, version)),
      );
      const salesActions = request.salesActions.map(toWorkspaceSalesAction);
      const openAction = salesActions.find((action) => action.status === "OPEN");
      const scene = request.sceneProjects[0];
      const selectionSession = request.selectionSessions[0];
      const status = request.status as ClientRequestStatus;
      const workspaceSentAt = proposalSentAt({
        status,
        salesOutcome: request.salesOutcome as SalesActionOutcome | null,
        salesActions: request.salesActions,
        proposals: request.proposals,
      });
      const commercialState = buildCommercialState({
        status,
        assignedManagerId: request.assignedManagerId,
        openAction,
        activeProposal: activeProposalRecord,
        proposalSentAt: workspaceSentAt,
        hasProposalSentState: hasProposalSentState({
          status,
          salesOutcome: request.salesOutcome as SalesActionOutcome | null,
          salesActions: request.salesActions,
          proposals: request.proposals,
        }),
        salesOutcome: request.salesOutcome as SalesActionOutcome | null,
        lastMeaningfulMovementAt: lastMeaningfulMovementAt(request),
      });

      const relatedIds = [
        request.id,
        ...request.salesActions.map((action) => action.id),
        ...request.proposals.map((proposal) => proposal.id),
        ...proposalVersions.map((version) => version.id),
        ...request.sceneProjects.map((project) => project.id),
      ];

      const events = await prisma.eventLog.findMany({
        where: {
          entityId: {
            in: relatedIds,
          },
        },
        include: {
          actor: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 40,
      });

      return {
        request: {
          id: request.id,
          reference: request.reference,
          source: request.source,
          isDemo: request.source === DEMO_READINESS_SOURCE,
          title: requestTitle(request),
          companyName: request.customerCompany?.name ?? request.companyName ?? undefined,
          contactName: request.customerContact?.fullName ?? request.customerName,
          email: request.customerContact?.email ?? request.email ?? undefined,
          phone: request.customerContact?.phone ?? request.phone ?? undefined,
          location: request.location ?? undefined,
          objectType: request.objectType,
          segment: request.segment,
          widthM: decimalToNumber(request.widthM),
          lengthM: decimalToNumber(request.lengthM),
          targetBudgetRub: decimalToNumber(request.targetBudgetRub),
          notes: request.notes ?? undefined,
          status,
          createdAt: request.createdAt.toISOString(),
          updatedAt: request.updatedAt.toISOString(),
        },
        qualification: {
          summary: request.qualificationSummary ?? undefined,
          confidence: decimalToNumber(request.qualificationConfidence),
          warnings: request.qualificationWarnings,
        },
        process: {
          assignedManagerId: request.assignedManagerId ?? undefined,
          assignedManagerName: request.assignedManager?.name ?? undefined,
          currentStatus: status,
          nextActionLabel: openAction?.nextActionLabel ?? request.nextActionLabel ?? undefined,
          nextActionAt: openAction?.dueAt ?? toIso(request.nextActionDueAt),
          outcome: request.salesOutcome as SalesActionOutcome | undefined,
          outcomeAt: toIso(request.salesOutcomeAt),
          openAction,
        },
        recommendation: selectionSession
          ? {
              sessionId: selectionSession.id,
              estimatedTotalRub:
                decimalToNumber(selectionSession.estimatedTotalRub) ?? undefined,
              rationale: selectionSession.rationale ?? undefined,
              recommendationCount: selectionSession.recommendations.length,
              topItems: selectionSession.recommendations.map((item) => ({
                article: item.productArticle,
                name: item.productName,
                quantity: item.quantity,
                estimatedLineRub: decimalToNumber(item.estimatedLineRub),
              })),
            }
          : undefined,
        scene: scene
          ? {
              id: scene.id,
              title: scene.title,
              status: scene.status,
              itemsCount:
                (scene.summaryJson as { itemsCount?: number } | null)?.itemsCount ?? 0,
              estimatedTotalRub: decimalToNumber(
                new Prisma.Decimal(
                  String(
                    (scene.summaryJson as { estimatedTotalRub?: number } | null)
                      ?.estimatedTotalRub ?? 0,
                  ),
                ),
              ),
              updatedAt: scene.updatedAt.toISOString(),
            }
          : undefined,
        activeProposal,
        proposalVersions,
        salesActions,
        timeline: events.map(toWorkspaceEvent),
        attentionFlags: buildAttentionFlags({
          status,
          assignedManagerId: request.assignedManagerId,
          nextActionLabel: request.nextActionLabel,
          nextActionDueAt: request.nextActionDueAt,
          commercialState,
          openAction,
        }),
        commercialState,
        availableManagers,
      } satisfies RequestWorkspaceView;
    });

    return view;
  },
};
