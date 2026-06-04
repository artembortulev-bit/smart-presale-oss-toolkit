import { createHash } from "node:crypto";

import { Prisma } from "@prisma/client";

import { ProposalDraft } from "@/application/proposals/build-proposal";
import {
  ProposalRepository,
  SaveProposalDraftVersionInput,
} from "@/application/proposals/repository";
import { eventRepository } from "@/infrastructure/db/event-repository";
import { prisma } from "@/infrastructure/db/prisma";
import { withOperationalDatabase } from "@/infrastructure/db/readiness";

function optionalDate(value?: string) {
  if (!value) {
    return undefined;
  }

  const match = value.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (match) {
    return new Date(`${match[3]}-${match[2]}-${match[1]}T00:00:00.000Z`);
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function toDecimal(value: number) {
  return new Prisma.Decimal(value);
}

function toJsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function stableHash(value: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");
}

function buildProposalNumber(hash: string) {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `KP-${y}${m}${d}-${hash.slice(0, 8).toUpperCase()}`;
}

function buildClientSnapshot(draft: ProposalDraft) {
  return {
    customerName: draft.customerName,
    customerAddress: draft.customerAddress,
    issueDate: draft.issueDate,
    validityLabel: draft.validityLabel,
    leadTimeLabel: draft.leadTimeLabel,
  };
}

function buildTotalsSnapshot(draft: ProposalDraft) {
  return {
    subtotalRub: draft.subtotalRub,
    deliveryRub: draft.deliveryRub,
    installationRub: draft.installationRub,
    totalRub: draft.totalRub,
    commercialMetrics: draft.commercialMetrics,
  };
}

function buildVersionDedupeKey(input: SaveProposalDraftVersionInput) {
  const proposalDedupeKey = buildProposalDedupeKey(input);

  return `proposal-version:${stableHash({
    proposalDedupeKey,
    draft: input.draft,
  })}`;
}

function buildProposalDedupeKey(input: SaveProposalDraftVersionInput) {
  if (input.clientRequestId) {
    return `proposal:client-request:${input.clientRequestId}`;
  }

  if (input.sceneProjectId) {
    return `proposal:scene-project:${input.sceneProjectId}`;
  }

  if (input.selectionSessionId) {
    return `proposal:selection-session:${input.selectionSessionId}`;
  }

  return `proposal:standalone:${stableHash({
    source: input.source ?? "unknown",
    title: input.draft.title,
    customerName: input.draft.customerName,
    customerAddress: input.draft.customerAddress,
    lines: input.draft.lines.map((line) => ({
      article: line.article,
      quantity: line.quantity,
    })),
  })}`;
}

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export const proposalRepository: ProposalRepository = {
  async saveDraftVersion(input: SaveProposalDraftVersionInput) {
    const draft = input.draft;

    const saved = await withOperationalDatabase(async () => {
      const sceneProject = input.sceneProjectId
        ? await prisma.sceneProject.findUnique({
            where: { id: input.sceneProjectId },
            select: {
              clientRequestId: true,
              selectionSessionId: true,
            },
          })
        : null;
      const scopedInput: SaveProposalDraftVersionInput = {
        ...input,
        clientRequestId: input.clientRequestId ?? sceneProject?.clientRequestId ?? undefined,
        selectionSessionId:
          input.selectionSessionId ?? sceneProject?.selectionSessionId ?? undefined,
      };
      const proposalDedupeKey = buildProposalDedupeKey(scopedInput);
      const versionDedupeKey = buildVersionDedupeKey(scopedInput);
      const proposalHash = stableHash(proposalDedupeKey);
      const existingVersion = await prisma.proposalVersion.findUnique({
        where: { dedupeKey: versionDedupeKey },
        include: { proposal: true },
      });

      if (existingVersion) {
        return existingVersion;
      }

      const proposal = await prisma.proposal.upsert({
        where: { dedupeKey: proposalDedupeKey },
        create: {
          dedupeKey: proposalDedupeKey,
          number: buildProposalNumber(proposalHash),
          status: "READY",
          clientRequestId: scopedInput.clientRequestId,
          selectionSessionId: scopedInput.selectionSessionId,
          sceneProjectId: input.sceneProjectId,
          title: draft.title,
          issueDate: optionalDate(draft.issueDate) ?? new Date(),
          currency: "RUB",
          subtotalRub: toDecimal(draft.subtotalRub),
          deliveryRub: toDecimal(draft.deliveryRub),
          installationRub: toDecimal(draft.installationRub),
          totalRub: toDecimal(draft.totalRub),
          notes: draft.qualityNote,
        },
        update: {
          status: "READY",
          clientRequestId: scopedInput.clientRequestId,
          selectionSessionId: scopedInput.selectionSessionId,
          sceneProjectId: input.sceneProjectId,
          title: draft.title,
          subtotalRub: toDecimal(draft.subtotalRub),
          deliveryRub: toDecimal(draft.deliveryRub),
          installationRub: toDecimal(draft.installationRub),
          totalRub: toDecimal(draft.totalRub),
        },
      });

      let version: Prisma.ProposalVersionGetPayload<{
        include: { proposal: true };
      }> | null = null;
      let createVersionAttempts = 0;

      while (!version) {
        const latestVersion = await prisma.proposalVersion.aggregate({
          where: { proposalId: proposal.id },
          _max: { versionNumber: true },
        });

        try {
          version = await prisma.proposalVersion.create({
            data: {
              proposalId: proposal.id,
              versionNumber: (latestVersion._max.versionNumber ?? 0) + 1,
              status: "LOCKED",
              dedupeKey: versionDedupeKey,
              title: draft.title,
              clientSnapshot: toJsonValue(buildClientSnapshot(draft)),
              itemsSnapshot: toJsonValue(draft.lines),
              totalsSnapshot: toJsonValue(buildTotalsSnapshot(draft)),
              sceneSnapshot: draft.sceneLayout ? toJsonValue(draft.sceneLayout) : undefined,
              draftSnapshot: toJsonValue(draft),
              subtotalRub: toDecimal(draft.subtotalRub),
              deliveryRub: toDecimal(draft.deliveryRub),
              installationRub: toDecimal(draft.installationRub),
              totalRub: toDecimal(draft.totalRub),
              createdByUserId: input.createdByUserId,
              items: {
                create: draft.lines.map((line) => ({
                  article: line.article,
                  name: line.name,
                  imageUrl: line.imageUrl,
                  sizeLabel: line.sizeLabel,
                  materialLabel: line.materialLabel,
                  ageLabel: line.ageLabel,
                  quantity: line.quantity,
                  unitPriceRub: toDecimal(line.unitPriceRub),
                  totalPriceRub: toDecimal(line.totalPriceRub),
                  metadata: toJsonValue({
                    costRub: line.costRub,
                    totalCostRub: line.totalCostRub,
                    grossMarginRub: line.grossMarginRub,
                    grossMarginPercent: line.grossMarginPercent,
                    costAvailability: line.costAvailability,
                  }),
                })),
              },
            },
            include: { proposal: true },
          });
        } catch (error) {
          if (!isUniqueConstraintError(error)) {
            throw error;
          }

          const existingAfterRace = await prisma.proposalVersion.findUnique({
            where: { dedupeKey: versionDedupeKey },
            include: { proposal: true },
          });

          if (existingAfterRace) {
            version = existingAfterRace;
            break;
          }

          createVersionAttempts += 1;
          if (createVersionAttempts >= 3) {
            throw error;
          }
        }
      }

      if (!version) {
        throw new Error("Failed to persist proposal version");
      }

      if (input.sceneProjectId) {
        await prisma.sceneProject.update({
          where: { id: input.sceneProjectId },
          data: { status: "ATTACHED_TO_PROPOSAL" },
        });
      }

      return version;
    });

    await eventRepository.record({
      dedupeKey: `proposal:${saved.proposalId}:created`,
      actorUserId: input.createdByUserId,
      eventType: "PROPOSAL_CREATED",
      entityType: "Proposal",
      entityId: saved.proposalId,
      payload: {
        number: saved.proposal.number,
        source: input.source,
      },
    });
    await eventRepository.record({
      dedupeKey: `proposal-version:${saved.id}:created`,
      actorUserId: input.createdByUserId,
      eventType: "PROPOSAL_VERSION_CREATED",
      entityType: "ProposalVersion",
      entityId: saved.id,
      payload: {
        proposalId: saved.proposalId,
        versionNumber: saved.versionNumber,
        totalRub: draft.totalRub,
      },
    });
    if (input.sceneProjectId) {
      await eventRepository.record({
        dedupeKey: `scene-project:${input.sceneProjectId}:attached-to-proposal:${saved.proposalId}`,
        actorUserId: input.createdByUserId,
        eventType: "STATUS_CHANGED",
        entityType: "SceneProject",
        entityId: input.sceneProjectId,
        payload: {
          status: "ATTACHED_TO_PROPOSAL",
          proposalId: saved.proposalId,
          proposalVersionId: saved.id,
        },
      });
    }

    return {
      proposalId: saved.proposalId,
      proposalNumber: saved.proposal.number,
      proposalVersionId: saved.id,
      versionNumber: saved.versionNumber,
    };
  },

  async findVersion(versionId: string) {
    const version = await withOperationalDatabase(() =>
      prisma.proposalVersion.findUnique({
        where: { id: versionId },
        include: { proposal: true },
      }),
    );

    if (!version) {
      return null;
    }

    return {
      proposalId: version.proposalId,
      proposalNumber: version.proposal.number,
      proposalVersionId: version.id,
      versionNumber: version.versionNumber,
      draft: version.draftSnapshot as ProposalDraft,
    };
  },

  async markVersionPdfExported(versionId: string, actorUserId?: string) {
    const version = await withOperationalDatabase(() =>
      prisma.proposalVersion.update({
        where: { id: versionId },
        data: {
          status: "EXPORTED",
          pdfExportedAt: new Date(),
        },
      }),
    );

    await eventRepository.record({
      dedupeKey: `proposal-version:${versionId}:pdf-exported`,
      actorUserId,
      eventType: "PROPOSAL_PDF_EXPORTED",
      entityType: "ProposalVersion",
      entityId: versionId,
      payload: {
        proposalId: version.proposalId,
      },
    });
  },
};
