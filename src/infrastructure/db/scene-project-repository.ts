import { Prisma } from "@prisma/client";

import {
  SaveSceneProjectInput,
  SceneProjectRepository,
} from "@/application/scene-projects/repository";
import { SceneProjectRecord } from "@/application/scene-projects/types";
import { prisma } from "@/infrastructure/db/prisma";
import { withOperationalDatabase } from "@/infrastructure/db/readiness";

type DbSceneProject = Prisma.SceneProjectGetPayload<Record<string, never>>;

function toJsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function toRecord(project: DbSceneProject): SceneProjectRecord {
  return {
    id: project.id,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    status: project.status,
    clientRequestId: project.clientRequestId ?? undefined,
    selectionSessionId: project.selectionSessionId ?? undefined,
    title: project.title,
    customerName: project.customerName ?? undefined,
    customerAddress: project.customerAddress ?? undefined,
    solutionName: project.solutionName,
    objectTypeLabel: project.objectTypeLabel ?? undefined,
    segmentLabel: project.segmentLabel ?? undefined,
    bounds: project.boundsJson as SceneProjectRecord["bounds"],
    items: project.itemsJson as SceneProjectRecord["items"],
    summary: project.summaryJson as SceneProjectRecord["summary"],
    notes: project.notes,
  };
}

function buildData(input: SaveSceneProjectInput) {
  return {
    status: input.status,
    clientRequestId: input.clientRequestId,
    selectionSessionId: input.selectionSessionId,
    title: input.title,
    customerName: input.customerName,
    customerAddress: input.customerAddress,
    solutionName: input.solutionName,
    objectTypeLabel: input.objectTypeLabel,
    segmentLabel: input.segmentLabel,
    boundsJson: toJsonValue(input.bounds),
    itemsJson: toJsonValue(input.items),
    summaryJson: toJsonValue(input.summary),
    notes: input.notes,
    createdByUserId: input.createdByUserId,
  };
}

export const sceneProjectRepository: SceneProjectRepository = {
  async findById(sceneProjectId: string) {
    const project = await withOperationalDatabase(() =>
      prisma.sceneProject.findUnique({
        where: { id: sceneProjectId },
      }),
    );

    return project ? toRecord(project) : null;
  },

  async save(input: SaveSceneProjectInput) {
    const data = buildData(input);
    const project = await withOperationalDatabase(() =>
      input.id
        ? prisma.sceneProject.upsert({
            where: { id: input.id },
            create: {
              id: input.id,
              ...data,
            },
            update: data,
          })
        : prisma.sceneProject.create({
            data,
          }),
    );

    return toRecord(project);
  },
};
