export const operationalEventTypes = [
  "CLIENT_REQUEST_CREATED",
  "CLIENT_REQUEST_QUALIFIED",
  "SELECTION_RECOMMENDATION_CREATED",
  "SCENE_PROJECT_CREATED",
  "SCENE_PROJECT_UPDATED",
  "PROPOSAL_CREATED",
  "PROPOSAL_VERSION_CREATED",
  "PROPOSAL_PDF_EXPORTED",
  "SALES_HANDOFF_CREATED",
  "SALES_ACTION_CREATED",
  "SALES_ACTION_UPDATED",
  "OWNERSHIP_ASSIGNED",
  "OUTCOME_RECORDED",
  "STATUS_CHANGED",
] as const;

export type OperationalEventType = (typeof operationalEventTypes)[number];

export type RecordOperationalEventInput = {
  dedupeKey?: string;
  actorUserId?: string;
  eventType: OperationalEventType;
  entityType: string;
  entityId: string;
  payload?: Record<string, unknown>;
};

export type EventRepository = {
  hasDedupeKey(dedupeKey: string): Promise<boolean>;
  record(input: RecordOperationalEventInput): Promise<void>;
};
