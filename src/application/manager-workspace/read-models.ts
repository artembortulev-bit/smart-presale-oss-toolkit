import {
  ClientRequestStatus,
  SalesActionOutcome,
  SalesActionStatus,
  SalesActionType,
} from "@/application/sales-process/types";

export type ManagerQueueScope = "mine" | "all";
export type ManagerQueueNextActionFilter = "any" | "with" | "without";
export type ManagerQueueSort = "priority" | "dueAsc" | "updatedDesc" | "createdDesc";
export type ManagerQueueAttentionFilter =
  | "any"
  | "overdue"
  | "no-owner"
  | "no-next-action"
  | "proposal-ready"
  | "active-proposal"
  | "sent-without-outcome";

export type ManagerAttentionFlagCode =
  | "OVERDUE_NEXT_ACTION"
  | "NO_OWNER"
  | "NO_NEXT_ACTION"
  | "ACTIVE_PROPOSAL_NOT_SENT"
  | "PROPOSAL_READY_NOT_SENT"
  | "SENT_WITHOUT_OUTCOME"
  | "PROCESS_OK";

export type ManagerAttentionFlag = {
  code: ManagerAttentionFlagCode;
  label: string;
  severity: "warning" | "critical" | "info";
};

export type ManagerQueueFilters = {
  scope: ManagerQueueScope;
  status?: ClientRequestStatus;
  overdueOnly?: boolean;
  nextAction?: ManagerQueueNextActionFilter;
  attention?: ManagerQueueAttentionFilter;
  sort?: ManagerQueueSort;
  managerId?: string;
};

export type ManagerQueueItem = {
  clientRequestId: string;
  requestNumber: string;
  source: string;
  isDemo: boolean;
  title: string;
  companyName?: string;
  contactName: string;
  currentStatus: ClientRequestStatus;
  assignedManagerId?: string;
  assignedManagerName?: string;
  nextActionType?: SalesActionType;
  nextActionLabel?: string;
  nextActionAt?: string;
  overdueFlag: boolean;
  attentionFlags: ManagerAttentionFlag[];
  primaryAttentionCode?: ManagerAttentionFlagCode;
  priorityRank: number;
  hasActiveProposal: boolean;
  activeProposalId?: string;
  activeProposalStatus?: string;
  commercialState: CommercialRequestState;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
};

export type CommercialRatioMetric = {
  count: number;
  total: number;
  rate: number;
};

export type CommercialBaselineReadout = {
  generatedAt: string;
  timezone: "Europe/Moscow";
  stalledThresholdBusinessDays: number;
  activeRequests: number;
  noOwner: CommercialRatioMetric;
  noCanonicalNextAction: CommercialRatioMetric;
  overdueCanonicalNextAction: CommercialRatioMetric;
  activeUnsentProposal: CommercialRatioMetric;
  proposalReadyNotSent: CommercialRatioMetric;
  sentWithoutOutcome: CommercialRatioMetric;
  stalledActiveRequests: CommercialRatioMetric & {
    thresholdBefore: string;
  };
  medianActiveWorkToProposalSentHours?: number;
  medianProposalSentToOutcomeHours?: number;
  sentThroughput: {
    last7Days: number;
    last30Days: number;
  };
  outcomeCompletionRate: CommercialRatioMetric;
};

export type CommercialRequestState = {
  hasCanonicalOpenAction: boolean;
  canonicalOpenActionDueAt?: string;
  canonicalOpenActionOverdue: boolean;
  activeProposalNotSent: boolean;
  proposalReadyNotSent: boolean;
  proposalSentAt?: string;
  sentWithoutOutcome: boolean;
  outcomeRecorded: boolean;
  lastMeaningfulMovementAt?: string;
  stalled: boolean;
};

export type ManagerQueueView = {
  generatedAt: string;
  filters: ManagerQueueFilters;
  summary: {
    total: number;
    mine: number;
    overdue: number;
    withoutOwner: number;
    withActiveProposal: number;
  };
  commercialBaseline: CommercialBaselineReadout;
  items: ManagerQueueItem[];
};

export type RequestWorkspaceView = {
  request: {
    id: string;
    reference: string;
    source: string;
    isDemo: boolean;
    title: string;
    companyName?: string;
    contactName: string;
    email?: string;
    phone?: string;
    location?: string;
    objectType: string;
    segment: string;
    widthM?: number;
    lengthM?: number;
    targetBudgetRub?: number;
    notes?: string;
    status: ClientRequestStatus;
    createdAt: string;
    updatedAt: string;
  };
  qualification: {
    summary?: string;
    confidence?: number;
    warnings: string[];
  };
  process: {
    assignedManagerId?: string;
    assignedManagerName?: string;
    currentStatus: ClientRequestStatus;
    nextActionLabel?: string;
    nextActionAt?: string;
    outcome?: SalesActionOutcome;
    outcomeAt?: string;
    openAction?: WorkspaceSalesAction;
  };
  recommendation?: {
    sessionId: string;
    estimatedTotalRub?: number;
    rationale?: string;
    recommendationCount: number;
    topItems: Array<{
      article: string;
      name: string;
      quantity: number;
      estimatedLineRub?: number;
    }>;
  };
  scene?: {
    id: string;
    title: string;
    status: string;
    itemsCount: number;
    estimatedTotalRub?: number;
    updatedAt: string;
  };
  activeProposal?: WorkspaceProposalSummary;
  proposalVersions: WorkspaceProposalVersion[];
  salesActions: WorkspaceSalesAction[];
  timeline: WorkspaceEvent[];
  attentionFlags: ManagerAttentionFlag[];
  commercialState: CommercialRequestState;
  availableManagers: Array<{
    id: string;
    name: string;
    email: string;
  }>;
};

export type WorkspaceProposalSummary = {
  id: string;
  number: string;
  title: string;
  status: string;
  totalRub: number;
  sentAt?: string;
  updatedAt: string;
  latestVersionId?: string;
  latestVersionNumber?: number;
};

export type WorkspaceProposalVersion = {
  id: string;
  proposalId: string;
  proposalNumber: string;
  versionNumber: number;
  status: string;
  title: string;
  totalRub: number;
  pdfExportedAt?: string;
  createdAt: string;
};

export type WorkspaceSalesAction = {
  id: string;
  clientRequestId: string;
  proposalId?: string;
  proposalVersionId?: string;
  sceneProjectId?: string;
  type: SalesActionType;
  status: SalesActionStatus;
  title: string;
  notes?: string;
  nextActionLabel?: string;
  dueAt?: string;
  completedAt?: string;
  outcome?: SalesActionOutcome;
  outcomeNote?: string;
  assignedManagerId?: string;
  assignedManagerName?: string;
  actorUserName?: string;
  createdAt: string;
  updatedAt: string;
};

export type WorkspaceEvent = {
  id: string;
  eventType: string;
  entityType: string;
  entityId: string;
  actorUserName?: string;
  payload?: Record<string, unknown>;
  createdAt: string;
};

export type ManagerWorkspaceReadRepository = {
  getManagerQueue(filters: ManagerQueueFilters): Promise<ManagerQueueView>;
  getRequestWorkspace(
    requestId: string,
  ): Promise<RequestWorkspaceView | null>;
};
