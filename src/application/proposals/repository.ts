import { ProposalDraft } from "@/application/proposals/build-proposal";

export type SaveProposalDraftVersionInput = {
  draft: ProposalDraft;
  clientRequestId?: string;
  selectionSessionId?: string;
  sceneProjectId?: string;
  createdByUserId?: string;
  source?: string;
};

export type SavedProposalVersion = {
  proposalId: string;
  proposalNumber: string;
  proposalVersionId: string;
  versionNumber: number;
};

export type ProposalVersionSnapshot = SavedProposalVersion & {
  draft: ProposalDraft;
};

export type ProposalRepository = {
  saveDraftVersion(
    input: SaveProposalDraftVersionInput,
  ): Promise<SavedProposalVersion>;
  findVersion(versionId: string): Promise<ProposalVersionSnapshot | null>;
  markVersionPdfExported(versionId: string, actorUserId?: string): Promise<void>;
};
