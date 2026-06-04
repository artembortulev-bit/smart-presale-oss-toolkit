import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  getCurrentInternalUser,
  getPortalRole,
} from "@/application/auth/portal-access";
import { eventRepository } from "@/infrastructure/db/event-repository";
import {
  assertOperationalDatabaseReady,
  isOperationalDatabaseError,
} from "@/infrastructure/db/readiness";
import { sceneProjectRepository } from "@/infrastructure/db/scene-project-repository";

const sceneProjectPayloadSchema = z.object({
  id: z.string().optional(),
  clientRequestId: z.string().optional(),
  selectionSessionId: z.string().optional(),
  title: z.string().min(1),
  customerName: z.string().optional(),
  customerAddress: z.string().optional(),
  solutionName: z.string().min(1),
  objectTypeLabel: z.string().optional(),
  segmentLabel: z.string().optional(),
  bounds: z.object({
    widthM: z.number(),
    lengthM: z.number(),
    areaM2: z.number(),
    source: z.enum(["FORM", "TEXT", "DERIVED"]),
  }),
  items: z.array(
    z.object({
      id: z.string(),
      productSlug: z.string().optional(),
      article: z.string(),
      name: z.string(),
      colorToken: z.enum(["accent", "graphite", "sand", "sage", "copper"]),
      placementRole: z.string(),
      productKind: z.string(),
      positionXM: z.number(),
      positionYM: z.number(),
      rotationDeg: z.number(),
      widthM: z.number(),
      lengthM: z.number(),
      safetyWidthM: z.number(),
      safetyLengthM: z.number(),
      basePriceRub: z.number().optional(),
    }),
  ),
  summary: z.object({
    estimatedTotalRub: z.number(),
    collisionCount: z.number(),
    outOfBoundsCount: z.number(),
    warningCount: z.number(),
    itemsCount: z.number(),
  }),
  notes: z.array(z.string()).default([]),
});

export async function POST(request: NextRequest) {
  try {
    const role = await getPortalRole();

    if (role !== "employee") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    await assertOperationalDatabaseReady();
    const internalUser = await getCurrentInternalUser();
    const payload = sceneProjectPayloadSchema.parse(await request.json());
    const status =
      payload.summary.warningCount > 0 ? "IN_REVIEW" : "READY_FOR_PROPOSAL";
    const project = await sceneProjectRepository.save({
      ...payload,
      status,
      createdByUserId: internalUser?.id,
    });

    await eventRepository.record({
      dedupeKey: payload.id ? undefined : `scene-project:${project.id}:created`,
      actorUserId: internalUser?.id,
      eventType: payload.id ? "SCENE_PROJECT_UPDATED" : "SCENE_PROJECT_CREATED",
      entityType: "SceneProject",
      entityId: project.id,
      payload: {
        status: project.status,
        clientRequestId: project.clientRequestId,
        selectionSessionId: project.selectionSessionId,
        itemsCount: project.summary.itemsCount,
        warningCount: project.summary.warningCount,
      },
    });

    return NextResponse.json({
      id: project.id,
      status: project.status,
      savedAt: project.updatedAt,
    });
  } catch (error) {
    if (isOperationalDatabaseError(error)) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          action: error.action,
        },
        { status: 503 },
      );
    }

    throw error;
  }
}
