import {
  ClientRequestStatus,
  CreateSalesActionInput,
  ProposalProcessStatus,
  SalesActionOutcome,
  SalesActionRecord,
  SalesActionStatus,
  SalesProcessState,
  UpdateSalesActionInput,
} from "@/application/sales-process/types";

export type PersistSalesActionInput = CreateSalesActionInput & {
  actorUserId?: string;
  resolvedAssignedManagerId?: string;
  resolvedStatus: SalesActionStatus;
  resolvedTitle: string;
  resolvedClientRequestStatus?: ClientRequestStatus;
  resolvedProposalStatus?: ProposalProcessStatus;
  resolvedOutcome?: SalesActionOutcome;
};

export type PersistSalesActionUpdateInput = UpdateSalesActionInput & {
  actionId: string;
  actorUserId?: string;
  resolvedStatus?: SalesActionStatus;
  resolvedClientRequestStatus?: ClientRequestStatus;
  resolvedProposalStatus?: ProposalProcessStatus;
  resolvedOutcome?: SalesActionOutcome;
};

export type SalesProcessRepository = {
  getProcessState(input: {
    clientRequestId: string;
    proposalId?: string;
  }): Promise<SalesProcessState | null>;
  findActionById(actionId: string): Promise<SalesActionRecord | null>;
  createAction(input: PersistSalesActionInput): Promise<SalesActionRecord>;
  updateAction(input: PersistSalesActionUpdateInput): Promise<SalesActionRecord>;
};
