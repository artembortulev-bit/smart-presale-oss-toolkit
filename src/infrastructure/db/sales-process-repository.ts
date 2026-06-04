import { Prisma } from "@prisma/client";

import {
  PersistSalesActionInput,
  PersistSalesActionUpdateInput,
  SalesProcessRepository,
} from "@/application/sales-process/repository";
import { OpenSalesActionConflictError } from "@/application/sales-process/errors";
import {
  ClientRequestStatus,
  ProposalProcessStatus,
  SalesActionRecord,
} from "@/application/sales-process/types";
import { prisma } from "@/infrastructure/db/prisma";
import {
  OperationalDatabaseError,
  withOperationalDatabase,
} from "@/infrastructure/db/readiness";

type DbSalesAction = Prisma.SalesActionGetPayload<Record<string, never>>;
type SalesActionTransaction = Prisma.TransactionClient;

const openActionUniqueIndexName = "SalesAction_clientRequest_open_unique_idx";

function optionalDate(value?: string) {
  return value ? new Date(value) : undefined;
}

function toJsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function unwrapOperationalDatabaseCause(error: unknown) {
  return error instanceof OperationalDatabaseError ? error.cause : error;
}

function isPrismaUniqueConflict(
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

function prismaConflictText(error: Prisma.PrismaClientKnownRequestError) {
  return `${error.message} ${JSON.stringify(error.meta ?? {})}`;
}

function conflictTargetIncludes(
  error: Prisma.PrismaClientKnownRequestError,
  value: string,
) {
  const target = (error.meta as { target?: unknown } | undefined)?.target;

  return Array.isArray(target)
    ? target.some((item) => String(item).includes(value))
    : String(target ?? "").includes(value);
}

function isDedupeKeyUniqueConflict(error: unknown) {
  if (!isPrismaUniqueConflict(error)) {
    return false;
  }

  const text = prismaConflictText(error);

  return (
    conflictTargetIncludes(error, "dedupeKey") ||
    text.includes("dedupeKey") ||
    text.includes("SalesAction_dedupeKey_key")
  );
}

function isOpenActionUniqueConflict(error: unknown) {
  if (!isPrismaUniqueConflict(error)) {
    return false;
  }

  const text = prismaConflictText(error);

  return (
    text.includes(openActionUniqueIndexName) ||
    conflictTargetIncludes(error, "clientRequestId") ||
    text.includes("clientRequestId")
  );
}

function toMetadataObject(value: Prisma.JsonValue | null | undefined) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function processedUpdateCommandKeys(value: Prisma.JsonValue | null | undefined) {
  const metadata = toMetadataObject(value);
  const rawKeys = metadata.processedUpdateCommandDedupeKeys;

  return Array.isArray(rawKeys)
    ? rawKeys.filter((key): key is string => typeof key === "string")
    : [];
}

function hasProcessedUpdateCommand(
  value: Prisma.JsonValue | null | undefined,
  dedupeKey?: string,
) {
  return Boolean(
    dedupeKey && processedUpdateCommandKeys(value).includes(dedupeKey),
  );
}

function buildUpdateMetadata(input: {
  existingMetadata: Prisma.JsonValue | null;
  nextMetadata?: Record<string, unknown>;
  dedupeKey?: string;
}) {
  const metadata = {
    ...toMetadataObject(input.existingMetadata),
    ...(input.nextMetadata ?? {}),
  };

  if (input.dedupeKey) {
    metadata.processedUpdateCommandDedupeKeys = Array.from(
      new Set([...processedUpdateCommandKeys(input.existingMetadata), input.dedupeKey]),
    );
  }

  return Object.keys(metadata).length > 0 ? metadata : undefined;
}

function toRecord(action: DbSalesAction): SalesActionRecord {
  return {
    id: action.id,
    dedupeKey: action.dedupeKey ?? undefined,
    clientRequestId: action.clientRequestId,
    proposalId: action.proposalId ?? undefined,
    proposalVersionId: action.proposalVersionId ?? undefined,
    sceneProjectId: action.sceneProjectId ?? undefined,
    assignedManagerId: action.assignedManagerId ?? undefined,
    actorUserId: action.actorUserId ?? undefined,
    type: action.type,
    status: action.status,
    title: action.title,
    notes: action.notes ?? undefined,
    nextActionLabel: action.nextActionLabel ?? undefined,
    dueAt: action.dueAt?.toISOString(),
    completedAt: action.completedAt?.toISOString(),
    outcome: action.outcome ?? undefined,
    outcomeNote: action.outcomeNote ?? undefined,
    createdAt: action.createdAt.toISOString(),
    updatedAt: action.updatedAt.toISOString(),
  };
}

async function findActionByDedupeKey(dedupeKey?: string) {
  if (!dedupeKey) {
    return null;
  }

  return withOperationalDatabase(() =>
    prisma.salesAction.findUnique({
      where: { dedupeKey },
    }),
  );
}

async function resolveCreateActionWriteError(
  error: unknown,
  input: PersistSalesActionInput,
): Promise<DbSalesAction> {
  const cause = unwrapOperationalDatabaseCause(error);

  if (cause instanceof OpenSalesActionConflictError) {
    throw cause;
  }

  if (isDedupeKeyUniqueConflict(cause) && input.dedupeKey) {
    const existing = await findActionByDedupeKey(input.dedupeKey);

    if (existing) {
      return existing;
    }
  }

  if (input.resolvedStatus === "OPEN" && isOpenActionUniqueConflict(cause)) {
    if (input.dedupeKey) {
      const existing = await findActionByDedupeKey(input.dedupeKey);

      if (existing) {
        return existing;
      }
    }

    throw new OpenSalesActionConflictError();
  }

  throw error;
}

async function resolveUpdateActionWriteError(
  error: unknown,
  input: PersistSalesActionUpdateInput,
): Promise<DbSalesAction> {
  const cause = unwrapOperationalDatabaseCause(error);

  if (cause instanceof OpenSalesActionConflictError) {
    throw cause;
  }

  if (input.resolvedStatus === "OPEN" && isOpenActionUniqueConflict(cause)) {
    throw new OpenSalesActionConflictError();
  }

  throw error;
}

async function lockClientRequest(
  tx: SalesActionTransaction,
  clientRequestId: string,
) {
  await tx.$queryRaw`
    SELECT id FROM "ClientRequest" WHERE id = ${clientRequestId} FOR UPDATE
  `;
}

async function lockSalesAction(tx: SalesActionTransaction, actionId: string) {
  await tx.$queryRaw`
    SELECT id FROM "SalesAction" WHERE id = ${actionId} FOR UPDATE
  `;
}

async function findOpenAction(
  tx: SalesActionTransaction,
  input: {
    clientRequestId: string;
    excludeActionId?: string;
  },
) {
  return tx.salesAction.findFirst({
    where: {
      clientRequestId: input.clientRequestId,
      status: "OPEN",
      id: input.excludeActionId ? { not: input.excludeActionId } : undefined,
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });
}

function assertOpenReplacementAllowed(input: {
  currentOpenAction: DbSalesAction | null;
  preexistingOpenActionId?: string;
  commandStartedAt: Date;
  dedupeKey?: string;
}) {
  if (!input.currentOpenAction) {
    return "none" as const;
  }

  if (
    input.dedupeKey &&
    input.currentOpenAction.dedupeKey === input.dedupeKey
  ) {
    return "replay" as const;
  }

  if (
    input.preexistingOpenActionId &&
    input.currentOpenAction.id === input.preexistingOpenActionId &&
    input.currentOpenAction.createdAt.getTime() <= input.commandStartedAt.getTime()
  ) {
    return "replace" as const;
  }

  throw new OpenSalesActionConflictError();
}

function buildProposalUpdateData(input: {
  status?: ProposalProcessStatus;
  outcomeNote?: string;
}) {
  const now = new Date();

  return {
    status: input.status,
    sentAt: input.status === "SENT" ? now : undefined,
    acceptedAt: input.status === "ACCEPTED" ? now : undefined,
    declinedAt: input.status === "DECLINED" ? now : undefined,
    outcomeNote: input.outcomeNote,
  };
}

function isTerminalOutcome(outcome?: string | null) {
  return outcome === "WON" || outcome === "LOST" || outcome === "NOT_A_FIT";
}

function shouldClearNextAction(input: {
  resolvedOutcome?: string | null;
  resolvedClientRequestStatus?: string | null;
  resolvedStatus?: string | null;
  nextActionLabel?: string | null;
  dueAt?: Date;
}) {
  if (isTerminalOutcome(input.resolvedOutcome)) {
    return true;
  }

  if (input.resolvedClientRequestStatus === "ARCHIVED") {
    return true;
  }

  return (
    (input.resolvedStatus === "COMPLETED" || input.resolvedStatus === "CANCELED") &&
    !input.nextActionLabel &&
    !input.dueAt
  );
}

export const salesProcessRepository: SalesProcessRepository = {
  async getProcessState(input) {
    const state = await withOperationalDatabase(async () => {
      const [clientRequest, proposal] = await Promise.all([
        prisma.clientRequest.findUnique({
          where: { id: input.clientRequestId },
          select: {
            id: true,
            status: true,
            assignedManagerId: true,
          },
        }),
        input.proposalId
          ? prisma.proposal.findUnique({
              where: { id: input.proposalId },
              select: {
                id: true,
                status: true,
              },
            })
          : Promise.resolve(null),
      ]);

      if (!clientRequest) {
        return null;
      }

      return {
        clientRequest: {
          id: clientRequest.id,
          status: clientRequest.status as ClientRequestStatus,
          assignedManagerId: clientRequest.assignedManagerId ?? undefined,
        },
        proposal: proposal
          ? {
              id: proposal.id,
              status: proposal.status as ProposalProcessStatus,
            }
          : undefined,
      };
    });

    return state;
  },

  async findActionById(actionId) {
    const action = await withOperationalDatabase(() =>
      prisma.salesAction.findUnique({
        where: { id: actionId },
      }),
    );

    return action ? toRecord(action) : null;
  },

  async createAction(input: PersistSalesActionInput) {
    const commandStartedAt = new Date();
    let saved: DbSalesAction;

    try {
      saved = await withOperationalDatabase(async () => {
        if (input.dedupeKey) {
          const existing = await prisma.salesAction.findUnique({
            where: { dedupeKey: input.dedupeKey },
          });

          if (existing) {
            return existing;
          }
        }

        const preexistingOpenAction =
          input.resolvedStatus === "OPEN"
            ? await prisma.salesAction.findFirst({
                where: {
                  clientRequestId: input.clientRequestId,
                  status: "OPEN",
                },
                select: { id: true },
                orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
              })
            : null;
        const now = new Date();
        const dueAt = optionalDate(input.dueAt);
        const clearNextAction = shouldClearNextAction({
          resolvedOutcome: input.resolvedOutcome,
          resolvedClientRequestStatus: input.resolvedClientRequestStatus,
          resolvedStatus: input.resolvedStatus,
          nextActionLabel: input.nextActionLabel,
          dueAt,
        });
        const completedAt =
          input.resolvedStatus === "COMPLETED" || input.resolvedStatus === "CANCELED"
            ? now
            : undefined;

        return prisma.$transaction(async (tx) => {
          if (input.resolvedStatus === "OPEN") {
            await lockClientRequest(tx, input.clientRequestId);

            const currentOpenAction = await findOpenAction(tx, {
              clientRequestId: input.clientRequestId,
            });
            const replacementPolicy = assertOpenReplacementAllowed({
              currentOpenAction,
              preexistingOpenActionId: preexistingOpenAction?.id,
              commandStartedAt,
              dedupeKey: input.dedupeKey,
            });

            if (replacementPolicy === "replay") {
              return currentOpenAction as DbSalesAction;
            }

            await tx.salesAction.updateMany({
              where: {
                clientRequestId: input.clientRequestId,
                status: "OPEN",
              },
              data: {
                status: "CANCELED",
                completedAt: now,
              },
            });
          }

          const action = await tx.salesAction.create({
            data: {
              dedupeKey: input.dedupeKey,
              clientRequestId: input.clientRequestId,
              proposalId: input.proposalId,
              proposalVersionId: input.proposalVersionId,
              sceneProjectId: input.sceneProjectId,
              assignedManagerId: input.resolvedAssignedManagerId,
              actorUserId: input.actorUserId,
              type: input.type,
              status: input.resolvedStatus,
              title: input.resolvedTitle,
              notes: input.notes,
              nextActionLabel: input.nextActionLabel,
              dueAt,
              completedAt,
              outcome: input.resolvedOutcome,
              outcomeNote: input.outcomeNote,
              metadata: input.metadata ? toJsonValue(input.metadata) : undefined,
            },
          });

          await tx.clientRequest.update({
            where: { id: input.clientRequestId },
            data: {
              assignedManagerId: input.resolvedAssignedManagerId,
              status: input.resolvedClientRequestStatus,
              nextActionLabel: clearNextAction ? null : input.nextActionLabel,
              nextActionDueAt: clearNextAction ? null : dueAt,
              lastSalesActionAt: now,
              salesOutcome: input.resolvedOutcome,
              salesOutcomeAt: input.resolvedOutcome ? now : undefined,
              archivedAt:
                input.resolvedClientRequestStatus === "ARCHIVED" ? now : undefined,
            },
          });

          if (input.proposalId) {
            await tx.proposal.update({
              where: { id: input.proposalId },
              data: buildProposalUpdateData({
                status: input.resolvedProposalStatus,
                outcomeNote: input.outcomeNote,
              }),
            });
          }

          return action;
        });
      });
    } catch (error) {
      saved = await resolveCreateActionWriteError(error, input);
    }

    return toRecord(saved);
  },

  async updateAction(input: PersistSalesActionUpdateInput) {
    const commandStartedAt = new Date();
    let saved: DbSalesAction;

    try {
      saved = await withOperationalDatabase(async () => {
        const preflightAction = await prisma.salesAction.findUnique({
          where: { id: input.actionId },
          select: { clientRequestId: true },
        });
        const preexistingOpenAction =
          input.resolvedStatus === "OPEN" && preflightAction
            ? await prisma.salesAction.findFirst({
                where: {
                  clientRequestId: preflightAction.clientRequestId,
                  status: "OPEN",
                  id: { not: input.actionId },
                },
                select: { id: true },
                orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
              })
            : null;
        const now = new Date();
        const dueAt = optionalDate(input.dueAt);
        const clearNextAction = shouldClearNextAction({
          resolvedOutcome: input.resolvedOutcome,
          resolvedClientRequestStatus: input.resolvedClientRequestStatus,
          resolvedStatus: input.resolvedStatus,
          nextActionLabel: input.nextActionLabel,
          dueAt,
        });
        const completedAt =
          input.resolvedStatus === "COMPLETED" || input.resolvedStatus === "CANCELED"
            ? now
            : undefined;

        return prisma.$transaction(async (tx) => {
          if (preflightAction) {
            await lockClientRequest(tx, preflightAction.clientRequestId);
          }

          await lockSalesAction(tx, input.actionId);

          const existing = await tx.salesAction.findUniqueOrThrow({
            where: { id: input.actionId },
          });

          if (hasProcessedUpdateCommand(existing.metadata, input.dedupeKey)) {
            return existing;
          }

          const metadata = buildUpdateMetadata({
            existingMetadata: existing.metadata,
            nextMetadata: input.metadata,
            dedupeKey: input.dedupeKey,
          });

          if (input.resolvedStatus === "OPEN") {
            const currentOpenAction = await findOpenAction(tx, {
              clientRequestId: existing.clientRequestId,
              excludeActionId: input.actionId,
            });
            assertOpenReplacementAllowed({
              currentOpenAction,
              preexistingOpenActionId: preexistingOpenAction?.id,
              commandStartedAt,
              dedupeKey: input.dedupeKey,
            });

            await tx.salesAction.updateMany({
              where: {
                clientRequestId: existing.clientRequestId,
                status: "OPEN",
                id: { not: input.actionId },
              },
              data: {
                status: "CANCELED",
                completedAt: now,
              },
            });
          }

          const action = await tx.salesAction.update({
            where: { id: input.actionId },
            data: {
              status: input.resolvedStatus,
              notes: input.notes,
              nextActionLabel: input.nextActionLabel,
              dueAt,
              completedAt,
              outcome: input.resolvedOutcome,
              outcomeNote: input.outcomeNote,
              metadata: metadata ? toJsonValue(metadata) : undefined,
            },
          });

          await tx.clientRequest.update({
            where: { id: existing.clientRequestId },
            data: {
              status: input.resolvedClientRequestStatus,
              nextActionLabel: clearNextAction ? null : input.nextActionLabel,
              nextActionDueAt: clearNextAction ? null : dueAt,
              lastSalesActionAt: now,
              salesOutcome: input.resolvedOutcome,
              salesOutcomeAt: input.resolvedOutcome ? now : undefined,
              archivedAt:
                input.resolvedClientRequestStatus === "ARCHIVED" ? now : undefined,
            },
          });

          if (existing.proposalId) {
            await tx.proposal.update({
              where: { id: existing.proposalId },
              data: buildProposalUpdateData({
                status: input.resolvedProposalStatus,
                outcomeNote: input.outcomeNote,
              }),
            });
          }

          return action;
        });
      });
    } catch (error) {
      saved = await resolveUpdateActionWriteError(error, input);
    }

    return toRecord(saved);
  },
};
