import { z } from "zod";

import { ClientRequestStatus } from "@/application/client-intake/types";

export type { ClientRequestStatus };

export const proposalProcessStatuses = [
  "DRAFT",
  "READY",
  "SENT",
  "ACCEPTED",
  "DECLINED",
  "ARCHIVED",
] as const;

export type ProposalProcessStatus = (typeof proposalProcessStatuses)[number];

export const salesActionTypes = [
  "HANDOFF",
  "CALL",
  "EMAIL",
  "MEETING",
  "PROPOSAL_SENT",
  "FOLLOW_UP",
  "STATUS_CHANGE",
  "OUTCOME",
  "INTERNAL_NOTE",
] as const;

export type SalesActionType = (typeof salesActionTypes)[number];

export const salesActionStatuses = ["OPEN", "COMPLETED", "CANCELED"] as const;

export type SalesActionStatus = (typeof salesActionStatuses)[number];

export const salesActionOutcomes = [
  "CONTACTED",
  "PROPOSAL_SENT",
  "FOLLOW_UP_REQUIRED",
  "WON",
  "LOST",
  "NO_RESPONSE",
  "NOT_A_FIT",
] as const;

export type SalesActionOutcome = (typeof salesActionOutcomes)[number];

export const clientRequestStatusTransitions: Record<
  ClientRequestStatus,
  ClientRequestStatus[]
> = {
  SUBMITTED: ["NEEDS_REVIEW", "QUALIFIED", "IN_SALES", "ARCHIVED"],
  NEEDS_REVIEW: ["QUALIFIED", "IN_SALES", "ARCHIVED"],
  QUALIFIED: ["RECOMMENDATION_READY", "PROPOSAL_DRAFT_READY", "IN_SALES", "ARCHIVED"],
  RECOMMENDATION_READY: ["PROPOSAL_DRAFT_READY", "IN_SALES", "ARCHIVED"],
  IN_SALES: ["PROPOSAL_SENT", "WON", "LOST", "ARCHIVED"],
  PROPOSAL_SENT: ["IN_SALES", "WON", "LOST", "ARCHIVED"],
  WON: ["ARCHIVED"],
  LOST: ["ARCHIVED"],
  ARCHIVED: [],
  UPLOADED: ["PRELIMINARY_ESTIMATE_READY", "QUALIFIED", "IN_SALES", "ARCHIVED"],
  PRELIMINARY_ESTIMATE_READY: ["WAITING_MATERIAL_COSTS", "MODEL_BRIEF_READY", "IN_SALES", "ARCHIVED"],
  WAITING_MATERIAL_COSTS: ["MODEL_BRIEF_READY", "PROPOSAL_DRAFT_READY", "IN_SALES", "ARCHIVED"],
  MODEL_BRIEF_READY: ["PROPOSAL_DRAFT_READY", "IN_SALES", "ARCHIVED"],
  PROPOSAL_DRAFT_READY: ["IN_SALES", "PROPOSAL_SENT", "ARCHIVED"],
};

export const proposalStatusTransitions: Record<
  ProposalProcessStatus,
  ProposalProcessStatus[]
> = {
  DRAFT: ["READY", "ARCHIVED"],
  READY: ["SENT", "ARCHIVED"],
  SENT: ["ACCEPTED", "DECLINED", "ARCHIVED"],
  ACCEPTED: ["ARCHIVED"],
  DECLINED: ["ARCHIVED"],
  ARCHIVED: [],
};

export type SalesActionRecord = {
  id: string;
  dedupeKey?: string;
  clientRequestId: string;
  proposalId?: string;
  proposalVersionId?: string;
  sceneProjectId?: string;
  assignedManagerId?: string;
  actorUserId?: string;
  type: SalesActionType;
  status: SalesActionStatus;
  title: string;
  notes?: string;
  nextActionLabel?: string;
  dueAt?: string;
  completedAt?: string;
  outcome?: SalesActionOutcome;
  outcomeNote?: string;
  createdAt: string;
  updatedAt: string;
};

export type SalesProcessState = {
  clientRequest: {
    id: string;
    status: ClientRequestStatus;
    assignedManagerId?: string;
  };
  proposal?: {
    id: string;
    status: ProposalProcessStatus;
  };
};

export const createSalesActionSchema = z.object({
  dedupeKey: z.string().min(1).optional(),
  clientRequestId: z.string().min(1),
  proposalId: z.string().min(1).optional(),
  proposalVersionId: z.string().min(1).optional(),
  sceneProjectId: z.string().min(1).optional(),
  assignedManagerId: z.string().min(1).optional(),
  type: z.enum(salesActionTypes).default("HANDOFF"),
  status: z.enum(salesActionStatuses).optional(),
  title: z.string().trim().min(1).optional(),
  notes: z.string().trim().optional(),
  nextActionLabel: z.string().trim().min(1).optional(),
  dueAt: z.string().datetime().optional(),
  outcome: z.enum(salesActionOutcomes).optional(),
  outcomeNote: z.string().trim().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CreateSalesActionInput = z.infer<typeof createSalesActionSchema>;

export const updateSalesActionSchema = z.object({
  dedupeKey: z.string().min(1).optional(),
  status: z.enum(salesActionStatuses).optional(),
  notes: z.string().trim().optional(),
  nextActionLabel: z.string().trim().min(1).optional(),
  dueAt: z.string().datetime().optional(),
  outcome: z.enum(salesActionOutcomes).optional(),
  outcomeNote: z.string().trim().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type UpdateSalesActionInput = z.infer<typeof updateSalesActionSchema>;
