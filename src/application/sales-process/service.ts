import { ClientRequestStatus } from "@/application/client-intake/types";
import {
  CreateSalesActionInput,
  ProposalProcessStatus,
  SalesActionOutcome,
  SalesActionRecord,
  SalesActionStatus,
  UpdateSalesActionInput,
  clientRequestStatusTransitions,
  proposalStatusTransitions,
} from "@/application/sales-process/types";
import { SalesProcessValidationError } from "@/application/sales-process/errors";
import { eventRepository } from "@/infrastructure/db/event-repository";
import { salesProcessRepository } from "@/infrastructure/db/sales-process-repository";

export {
  OpenSalesActionConflictError,
  SalesProcessValidationError,
} from "@/application/sales-process/errors";

function ensureTransition<TStatus extends string>(
  entity: string,
  current: TStatus,
  next: TStatus | undefined,
  transitions: Record<TStatus, TStatus[]>,
) {
  if (!next || next === current) {
    return;
  }

  if (!transitions[current]?.includes(next)) {
    throw new SalesProcessValidationError(
      `${entity} status transition ${current} -> ${next} is not allowed`,
    );
  }
}

function defaultTitle(input: CreateSalesActionInput | UpdateSalesActionInput) {
  if ("title" in input && input.title) {
    return input.title;
  }

  if (input.outcome === "WON") {
    return "Сделка выиграна";
  }

  if (input.outcome === "LOST" || input.outcome === "NOT_A_FIT") {
    return "Сделка проиграна";
  }

  if ("type" in input) {
    switch (input.type) {
      case "PROPOSAL_SENT":
        return "КП отправлено клиенту";
      case "FOLLOW_UP":
        return "Запланирован follow-up";
      case "CALL":
        return "Звонок клиенту";
      case "EMAIL":
        return "Письмо клиенту";
      case "MEETING":
        return "Встреча с клиентом";
      case "INTERNAL_NOTE":
        return "Внутренняя заметка";
      case "STATUS_CHANGE":
        return "Изменение статуса";
      case "OUTCOME":
        return "Итог по заявке";
      case "HANDOFF":
      default:
        return "Передача заявки в работу";
    }
  }

  return "Обновление действия";
}

function defaultActionStatus(
  input: CreateSalesActionInput | UpdateSalesActionInput,
): SalesActionStatus {
  if (input.status) {
    return input.status;
  }

  return input.outcome ? "COMPLETED" : "OPEN";
}

function deriveClientRequestStatus(
  input: CreateSalesActionInput | UpdateSalesActionInput,
): ClientRequestStatus | undefined {
  if (input.outcome === "WON") {
    return "WON";
  }

  if (input.outcome === "LOST" || input.outcome === "NOT_A_FIT") {
    return "LOST";
  }

  if (input.outcome === "PROPOSAL_SENT" || ("type" in input && input.type === "PROPOSAL_SENT")) {
    return "PROPOSAL_SENT";
  }

  if ("type" in input && input.type === "HANDOFF") {
    return "IN_SALES";
  }

  return undefined;
}

function deriveProposalStatus(
  input: CreateSalesActionInput | UpdateSalesActionInput,
): ProposalProcessStatus | undefined {
  if (input.outcome === "WON") {
    return "ACCEPTED";
  }

  if (input.outcome === "LOST" || input.outcome === "NOT_A_FIT") {
    return "DECLINED";
  }

  if (input.outcome === "PROPOSAL_SENT" || ("type" in input && input.type === "PROPOSAL_SENT")) {
    return "SENT";
  }

  return undefined;
}

async function recordProcessEvents(input: {
  action: SalesActionRecord;
  actorUserId?: string;
  previousClientRequestStatus: ClientRequestStatus;
  nextClientRequestStatus?: ClientRequestStatus;
  previousProposalStatus?: ProposalProcessStatus;
  nextProposalStatus?: ProposalProcessStatus;
  previousAssignedManagerId?: string;
  nextAssignedManagerId?: string;
  outcome?: SalesActionOutcome;
  isUpdate?: boolean;
  dedupeKey?: string;
}) {
  const {
    action,
    actorUserId,
    previousClientRequestStatus,
    nextClientRequestStatus,
    previousProposalStatus,
    nextProposalStatus,
    previousAssignedManagerId,
    nextAssignedManagerId,
    outcome,
    isUpdate,
    dedupeKey,
  } = input;

  await eventRepository.record({
    dedupeKey: isUpdate ? dedupeKey : `sales-action:${action.id}:created`,
    actorUserId,
    eventType: isUpdate ? "SALES_ACTION_UPDATED" : "SALES_ACTION_CREATED",
    entityType: "SalesAction",
    entityId: action.id,
    payload: {
      clientRequestId: action.clientRequestId,
      proposalId: action.proposalId,
      proposalVersionId: action.proposalVersionId,
      type: action.type,
      status: action.status,
      outcome: action.outcome,
    },
  });

  if (!isUpdate && action.type === "HANDOFF") {
    await eventRepository.record({
      dedupeKey: `client-request:${action.clientRequestId}:handoff:${action.id}`,
      actorUserId,
      eventType: "SALES_HANDOFF_CREATED",
      entityType: "ClientRequest",
      entityId: action.clientRequestId,
      payload: {
        salesActionId: action.id,
        assignedManagerId: nextAssignedManagerId,
      },
    });
  }

  if (
    nextAssignedManagerId &&
    nextAssignedManagerId !== previousAssignedManagerId
  ) {
    await eventRepository.record({
      dedupeKey: `client-request:${action.clientRequestId}:assigned:${nextAssignedManagerId}:${action.id}`,
      actorUserId,
      eventType: "OWNERSHIP_ASSIGNED",
      entityType: "ClientRequest",
      entityId: action.clientRequestId,
      payload: {
        previousAssignedManagerId,
        assignedManagerId: nextAssignedManagerId,
        salesActionId: action.id,
      },
    });
  }

  if (
    nextClientRequestStatus &&
    nextClientRequestStatus !== previousClientRequestStatus
  ) {
    await eventRepository.record({
      dedupeKey: `client-request:${action.clientRequestId}:status:${previousClientRequestStatus}:${nextClientRequestStatus}:${action.id}`,
      actorUserId,
      eventType: "STATUS_CHANGED",
      entityType: "ClientRequest",
      entityId: action.clientRequestId,
      payload: {
        from: previousClientRequestStatus,
        to: nextClientRequestStatus,
        salesActionId: action.id,
      },
    });
  }

  if (
    action.proposalId &&
    previousProposalStatus &&
    nextProposalStatus &&
    nextProposalStatus !== previousProposalStatus
  ) {
    await eventRepository.record({
      dedupeKey: `proposal:${action.proposalId}:status:${previousProposalStatus}:${nextProposalStatus}:${action.id}`,
      actorUserId,
      eventType: "STATUS_CHANGED",
      entityType: "Proposal",
      entityId: action.proposalId,
      payload: {
        from: previousProposalStatus,
        to: nextProposalStatus,
        salesActionId: action.id,
      },
    });
  }

  if (outcome) {
    await eventRepository.record({
      dedupeKey: `client-request:${action.clientRequestId}:outcome:${outcome}:${action.id}`,
      actorUserId,
      eventType: "OUTCOME_RECORDED",
      entityType: "ClientRequest",
      entityId: action.clientRequestId,
      payload: {
        outcome,
        outcomeNote: action.outcomeNote,
        proposalId: action.proposalId,
        salesActionId: action.id,
      },
    });
  }
}

export async function createSalesAction(
  input: CreateSalesActionInput,
  actorUserId?: string,
) {
  const state = await salesProcessRepository.getProcessState({
    clientRequestId: input.clientRequestId,
    proposalId: input.proposalId,
  });

  if (!state) {
    throw new SalesProcessValidationError("Client request was not found");
  }

  const nextClientRequestStatus = deriveClientRequestStatus(input);
  const nextProposalStatus = deriveProposalStatus(input);

  ensureTransition(
    "ClientRequest",
    state.clientRequest.status,
    nextClientRequestStatus,
    clientRequestStatusTransitions,
  );

  if (input.proposalId && !state.proposal) {
    throw new SalesProcessValidationError("Proposal was not found");
  }

  if (state.proposal) {
    ensureTransition(
      "Proposal",
      state.proposal.status,
      nextProposalStatus,
      proposalStatusTransitions,
    );
  }

  const resolvedAssignedManagerId =
    input.assignedManagerId ?? state.clientRequest.assignedManagerId ?? actorUserId;
  const action = await salesProcessRepository.createAction({
    ...input,
    actorUserId,
    resolvedAssignedManagerId,
    resolvedStatus: defaultActionStatus(input),
    resolvedTitle: defaultTitle(input),
    resolvedClientRequestStatus: nextClientRequestStatus,
    resolvedProposalStatus: nextProposalStatus,
    resolvedOutcome: input.outcome,
  });

  await recordProcessEvents({
    action,
    actorUserId,
    previousClientRequestStatus: state.clientRequest.status,
    nextClientRequestStatus,
    previousProposalStatus: state.proposal?.status,
    nextProposalStatus,
    previousAssignedManagerId: state.clientRequest.assignedManagerId,
    nextAssignedManagerId: resolvedAssignedManagerId,
    outcome: input.outcome,
  });

  return action;
}

export async function recordProposalSent(
  input: {
    clientRequestId: string;
    proposalId: string;
    proposalVersionId?: string;
    sceneProjectId?: string;
    assignedManagerId?: string;
    nextActionLabel?: string;
    dueAt?: string;
    notes?: string;
    dedupeKey?: string;
  },
  actorUserId?: string,
) {
  return createSalesAction(
    {
      ...input,
      type: "PROPOSAL_SENT",
      status: "COMPLETED",
      outcome: "PROPOSAL_SENT",
      title: "КП отправлено клиенту",
    },
    actorUserId,
  );
}

export async function recordSalesOutcome(
  input: {
    clientRequestId: string;
    proposalId?: string;
    proposalVersionId?: string;
    sceneProjectId?: string;
    assignedManagerId?: string;
    outcome: "WON" | "LOST" | "NOT_A_FIT";
    outcomeNote?: string;
    notes?: string;
    dedupeKey?: string;
  },
  actorUserId?: string,
) {
  return createSalesAction(
    {
      ...input,
      type: "OUTCOME",
      status: "COMPLETED",
      title: input.outcome === "WON" ? "Сделка выиграна" : "Сделка проиграна",
    },
    actorUserId,
  );
}

export async function archiveClientRequest(
  input: {
    clientRequestId: string;
    assignedManagerId?: string;
    notes?: string;
    dedupeKey?: string;
  },
  actorUserId?: string,
) {
  const state = await salesProcessRepository.getProcessState({
    clientRequestId: input.clientRequestId,
  });

  if (!state) {
    throw new SalesProcessValidationError("Client request was not found");
  }

  ensureTransition(
    "ClientRequest",
    state.clientRequest.status,
    "ARCHIVED",
    clientRequestStatusTransitions,
  );

  const resolvedAssignedManagerId =
    input.assignedManagerId ?? state.clientRequest.assignedManagerId ?? actorUserId;
  const action = await salesProcessRepository.createAction({
    clientRequestId: input.clientRequestId,
    assignedManagerId: input.assignedManagerId,
    actorUserId,
    type: "INTERNAL_NOTE",
    status: "COMPLETED",
    title: "Заявка отправлена в архив",
    notes: input.notes,
    dedupeKey: input.dedupeKey,
    resolvedAssignedManagerId,
    resolvedStatus: "COMPLETED",
    resolvedTitle: "Заявка отправлена в архив",
    resolvedClientRequestStatus: "ARCHIVED",
  });

  await recordProcessEvents({
    action,
    actorUserId,
    previousClientRequestStatus: state.clientRequest.status,
    nextClientRequestStatus: "ARCHIVED",
    previousAssignedManagerId: state.clientRequest.assignedManagerId,
    nextAssignedManagerId: resolvedAssignedManagerId,
  });

  return action;
}

export async function updateSalesAction(
  actionId: string,
  input: UpdateSalesActionInput,
  actorUserId?: string,
) {
  const existingAction = await salesProcessRepository.findActionById(actionId);

  if (!existingAction) {
    throw new SalesProcessValidationError("Sales action was not found");
  }

  if (input.dedupeKey && (await eventRepository.hasDedupeKey(input.dedupeKey))) {
    return existingAction;
  }

  const state = await salesProcessRepository.getProcessState({
    clientRequestId: existingAction.clientRequestId,
    proposalId: existingAction.proposalId,
  });

  if (!state) {
    throw new SalesProcessValidationError("Client request was not found");
  }

  const nextClientRequestStatus = deriveClientRequestStatus(input);
  const nextProposalStatus = deriveProposalStatus(input);

  ensureTransition(
    "ClientRequest",
    state.clientRequest.status,
    nextClientRequestStatus,
    clientRequestStatusTransitions,
  );

  if (state.proposal) {
    ensureTransition(
      "Proposal",
      state.proposal.status,
      nextProposalStatus,
      proposalStatusTransitions,
    );
  }

  const action = await salesProcessRepository.updateAction({
    ...input,
    actionId,
    actorUserId,
    resolvedStatus: input.status ?? (input.outcome ? "COMPLETED" : undefined),
    resolvedClientRequestStatus: nextClientRequestStatus,
    resolvedProposalStatus: nextProposalStatus,
    resolvedOutcome: input.outcome,
  });

  await recordProcessEvents({
    action,
    actorUserId,
    previousClientRequestStatus: state.clientRequest.status,
    nextClientRequestStatus,
    previousProposalStatus: state.proposal?.status,
    nextProposalStatus,
    previousAssignedManagerId: state.clientRequest.assignedManagerId,
    nextAssignedManagerId: state.clientRequest.assignedManagerId,
    outcome: input.outcome,
    isUpdate: true,
    dedupeKey: input.dedupeKey,
  });

  return action;
}
