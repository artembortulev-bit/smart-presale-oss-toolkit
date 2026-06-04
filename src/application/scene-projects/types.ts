import { z } from "zod";

const sceneProjectItemSchema = z.object({
  id: z.string(),
  productSlug: z.string().optional(),
  article: z.string(),
  name: z.string(),
  colorToken: z
    .enum(["accent", "graphite", "sand", "sage", "copper"])
    .optional()
    .default("accent"),
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
});

export const sceneProjectRecordSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  status: z.enum([
    "DRAFT",
    "READY_FOR_PROPOSAL",
    "IN_REVIEW",
    "ATTACHED_TO_PROPOSAL",
    "ARCHIVED",
  ]),
  clientRequestId: z.string().optional(),
  selectionSessionId: z.string().optional(),
  title: z.string(),
  customerName: z.string().optional(),
  customerAddress: z.string().optional(),
  solutionName: z.string(),
  objectTypeLabel: z.string().optional(),
  segmentLabel: z.string().optional(),
  bounds: z.object({
    widthM: z.number(),
    lengthM: z.number(),
    areaM2: z.number(),
    source: z.enum(["FORM", "TEXT", "DERIVED"]),
  }),
  items: z.array(sceneProjectItemSchema),
  summary: z.object({
    estimatedTotalRub: z.number(),
    collisionCount: z.number(),
    outOfBoundsCount: z.number(),
    warningCount: z.number(),
    itemsCount: z.number(),
  }),
  notes: z.array(z.string()),
});

export const sceneProjectStoreSchema = z.object({
  version: z.literal(1),
  updatedAt: z.string(),
  projects: z.array(sceneProjectRecordSchema),
});

export type SceneProjectRecord = z.infer<typeof sceneProjectRecordSchema>;
export type SceneProjectStore = z.infer<typeof sceneProjectStoreSchema>;
