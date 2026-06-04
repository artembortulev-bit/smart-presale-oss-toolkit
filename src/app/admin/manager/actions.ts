"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  ManagerWorkspaceAccessError,
  requireManagerWorkspaceCommandUser,
} from "@/application/manager-workspace/access";
import {
  archiveClientRequest,
  createSalesAction,
  recordProposalSent,
  recordSalesOutcome,
  updateSalesAction,
} from "@/application/sales-process/service";
import { SalesActionOutcome, SalesActionType } from "@/application/sales-process/types";

const allowedManualActionTypes = new Set<SalesActionType>([
  "CALL",
  "EMAIL",
  "MEETING",
  "FOLLOW_UP",
  "INTERNAL_NOTE",
]);

function stringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function requiredString(formData: FormData, key: string) {
  const value = stringValue(formData, key);

  if (!value) {
    throw new Error(`Missing form field: ${key}`);
  }

  return value;
}

function commandDedupeKey(formData: FormData) {
  const commandId = requiredString(formData, "commandId");

  if (!/^[a-zA-Z0-9_-]{8,80}$/.test(commandId)) {
    throw new Error("Некорректный commandId");
  }

  return `manager-command:${commandId}`;
}

function optionalIsoDateTime(formData: FormData, key: string) {
  const value = stringValue(formData, key);

  if (!value) {
    return undefined;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date field: ${key}`);
  }

  return date.toISOString();
}

function safeReturnTo(formData: FormData) {
  const value = stringValue(formData, "returnTo");

  if (value?.startsWith("/admin/manager")) {
    return value;
  }

  return "/admin/manager";
}

function withNotice(returnTo: string, kind: "ok" | "error", message: string) {
  const url = new URL(returnTo, "http://example.local");
  url.searchParams.delete(kind === "ok" ? "error" : "ok");
  url.searchParams.set(kind, message);
  return `${url.pathname}${url.search}`;
}

async function runManagerCommand(
  formData: FormData,
  command: (actorUserId: string, dedupeKey: string) => Promise<void>,
  okMessage: string,
) {
  const returnTo = safeReturnTo(formData);
  let target = withNotice(returnTo, "ok", okMessage);

  try {
    const user = await requireManagerWorkspaceCommandUser();
    const dedupeKey = commandDedupeKey(formData);
    await command(user.id, dedupeKey);
    revalidatePath("/admin/manager");
    revalidatePath(returnTo);
  } catch (error) {
    const message =
      error instanceof ManagerWorkspaceAccessError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Не удалось выполнить действие";
    target = withNotice(returnTo, "error", message);
  }

  redirect(target);
}

export async function assignManagerAction(formData: FormData) {
  await runManagerCommand(
    formData,
    async (actorUserId, dedupeKey) => {
      const clientRequestId = requiredString(formData, "clientRequestId");
      const assignedManagerId = requiredString(formData, "assignedManagerId");
      await createSalesAction(
        {
          clientRequestId,
          assignedManagerId,
          type: "HANDOFF",
          status: "OPEN",
          title: "Заявка назначена менеджеру",
          nextActionLabel:
            stringValue(formData, "nextActionLabel") ?? "Связаться с клиентом",
          dueAt: optionalIsoDateTime(formData, "dueAt"),
          notes: stringValue(formData, "notes"),
          dedupeKey,
        },
        actorUserId,
      );
    },
    "Менеджер назначен",
  );
}

export async function createSalesActionAction(formData: FormData) {
  await runManagerCommand(
    formData,
    async (actorUserId, dedupeKey) => {
      const submittedType = (stringValue(formData, "type") ?? "FOLLOW_UP") as SalesActionType;
      const type = allowedManualActionTypes.has(submittedType)
        ? submittedType
        : "FOLLOW_UP";
      await createSalesAction(
        {
          clientRequestId: requiredString(formData, "clientRequestId"),
          proposalId: stringValue(formData, "proposalId"),
          proposalVersionId: stringValue(formData, "proposalVersionId"),
          sceneProjectId: stringValue(formData, "sceneProjectId"),
          type,
          status: "OPEN",
          title: stringValue(formData, "title"),
          nextActionLabel: stringValue(formData, "nextActionLabel"),
          dueAt: optionalIsoDateTime(formData, "dueAt"),
          notes: stringValue(formData, "notes"),
          dedupeKey,
        },
        actorUserId,
      );
    },
    "Действие создано",
  );
}

export async function completeSalesActionAction(formData: FormData) {
  await runManagerCommand(
    formData,
    async (actorUserId, dedupeKey) => {
      const outcome = stringValue(formData, "outcome") as SalesActionOutcome | undefined;
      await updateSalesAction(
        requiredString(formData, "actionId"),
        {
          status: "COMPLETED",
          outcome,
          notes: stringValue(formData, "notes"),
          dedupeKey,
        },
        actorUserId,
      );
    },
    "Действие завершено",
  );
}

export async function cancelSalesActionAction(formData: FormData) {
  await runManagerCommand(
    formData,
    async (actorUserId, dedupeKey) => {
      await updateSalesAction(
        requiredString(formData, "actionId"),
        {
          status: "CANCELED",
          notes: stringValue(formData, "notes"),
          dedupeKey,
        },
        actorUserId,
      );
    },
    "Действие отменено",
  );
}

export async function rescheduleSalesActionAction(formData: FormData) {
  await runManagerCommand(
    formData,
    async (actorUserId, dedupeKey) => {
      await updateSalesAction(
        requiredString(formData, "actionId"),
        {
          status: "OPEN",
          nextActionLabel: requiredString(formData, "nextActionLabel"),
          dueAt: optionalIsoDateTime(formData, "dueAt"),
          notes: stringValue(formData, "notes"),
          dedupeKey,
        },
        actorUserId,
      );
    },
    "Действие перенесено",
  );
}

export async function recordProposalSentAction(formData: FormData) {
  await runManagerCommand(
    formData,
    async (actorUserId, dedupeKey) => {
      await recordProposalSent(
        {
          clientRequestId: requiredString(formData, "clientRequestId"),
          proposalId: requiredString(formData, "proposalId"),
          proposalVersionId: stringValue(formData, "proposalVersionId"),
          sceneProjectId: stringValue(formData, "sceneProjectId"),
          nextActionLabel:
            stringValue(formData, "nextActionLabel") ?? "Проверить реакцию клиента",
          dueAt: optionalIsoDateTime(formData, "dueAt"),
          notes: stringValue(formData, "notes"),
          dedupeKey,
        },
        actorUserId,
      );
    },
    "КП отмечено как отправленное",
  );
}

export async function recordOutcomeAction(formData: FormData) {
  await runManagerCommand(
    formData,
    async (actorUserId, dedupeKey) => {
      await recordSalesOutcome(
        {
          clientRequestId: requiredString(formData, "clientRequestId"),
          proposalId: stringValue(formData, "proposalId"),
          proposalVersionId: stringValue(formData, "proposalVersionId"),
          sceneProjectId: stringValue(formData, "sceneProjectId"),
          outcome: requiredString(formData, "outcome") as "WON" | "LOST" | "NOT_A_FIT",
          outcomeNote: stringValue(formData, "outcomeNote"),
          notes: stringValue(formData, "notes"),
          dedupeKey,
        },
        actorUserId,
      );
    },
    "Итог зафиксирован",
  );
}

export async function archiveRequestAction(formData: FormData) {
  await runManagerCommand(
    formData,
    async (actorUserId, dedupeKey) => {
      await archiveClientRequest(
        {
          clientRequestId: requiredString(formData, "clientRequestId"),
          notes: stringValue(formData, "notes"),
          dedupeKey,
        },
        actorUserId,
      );
    },
    "Заявка отправлена в архив",
  );
}
