import { z } from "zod";

export const clientObjectTypes = [
  "PLAYGROUND_COMPLEX",
  "SLIDE",
  "SWING",
  "WORKOUT",
  "PARK_EQUIPMENT",
  "CUSTOM",
] as const;

export type ClientObjectType = (typeof clientObjectTypes)[number];

export const clientSegments = ["ECONOMY", "OPTIMUM", "PREMIUM"] as const;

export type ClientSegment = (typeof clientSegments)[number];

export const clientRequestEstimateMethods = [
  "HEURISTIC",
  "HYBRID",
  "CATALOG_BENCHMARK",
] as const;

export type ClientRequestEstimateMethod = (typeof clientRequestEstimateMethods)[number];

export const clientRequestStatuses = [
  "SUBMITTED",
  "NEEDS_REVIEW",
  "QUALIFIED",
  "RECOMMENDATION_READY",
  "IN_SALES",
  "PROPOSAL_SENT",
  "WON",
  "LOST",
  "ARCHIVED",
  "UPLOADED",
  "PRELIMINARY_ESTIMATE_READY",
  "WAITING_MATERIAL_COSTS",
  "MODEL_BRIEF_READY",
  "PROPOSAL_DRAFT_READY",
] as const;

export type ClientRequestStatus = (typeof clientRequestStatuses)[number];

export const clientObjectTypeLabels: Record<ClientObjectType, string> = {
  PLAYGROUND_COMPLEX: "Игровой комплекс",
  SLIDE: "Горка",
  SWING: "Качели",
  WORKOUT: "Воркаут / спорт",
  PARK_EQUIPMENT: "МАФ / парковое оборудование",
  CUSTOM: "Другое оборудование",
};

export const clientSegmentLabels: Record<ClientSegment, string> = {
  ECONOMY: "Эконом",
  OPTIMUM: "Оптимум",
  PREMIUM: "Премиум",
};

export const clientRequestStatusLabels = {
  SUBMITTED: "Заявка получена",
  NEEDS_REVIEW: "Нужна проверка",
  QUALIFIED: "Квалификация готова",
  RECOMMENDATION_READY: "Подбор сохранен",
  ARCHIVED: "В архиве",
  UPLOADED: "Фото загружены",
  PRELIMINARY_ESTIMATE_READY: "Оценка готова",
  WAITING_MATERIAL_COSTS: "Ждем матрицу материалов",
  MODEL_BRIEF_READY: "3D-бриф готов",
  PROPOSAL_DRAFT_READY: "Черновик КП готов",
} as Record<ClientRequestStatus, string>;

Object.assign(clientRequestStatusLabels, {
  IN_SALES: "В работе у менеджера",
  PROPOSAL_SENT: "КП отправлено",
  WON: "Сделка выиграна",
  LOST: "Сделка проиграна",
});

export const clientRequestStatusTone = {
  SUBMITTED: "default",
  NEEDS_REVIEW: "default",
  QUALIFIED: "accent",
  RECOMMENDATION_READY: "success",
  ARCHIVED: "default",
  UPLOADED: "default",
  PRELIMINARY_ESTIMATE_READY: "accent",
  WAITING_MATERIAL_COSTS: "default",
  MODEL_BRIEF_READY: "accent",
  PROPOSAL_DRAFT_READY: "success",
} as Record<ClientRequestStatus, "default" | "accent" | "success">;

Object.assign(clientRequestStatusTone, {
  IN_SALES: "accent",
  PROPOSAL_SENT: "success",
  WON: "success",
  LOST: "default",
});

const optionalString = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }

  return value;
}, z.string().trim().transform((value) => (value ? value : undefined)).optional());

const optionalNumber = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : value;
}, z.number().positive().optional());

export const clientRequestSubmissionSchema = z
  .object({
    customerName: z.string().trim().min(2, "Укажите имя заказчика"),
    companyName: optionalString,
    email: optionalString.refine(
      (value) => !value || z.email().safeParse(value).success,
      "Укажите корректный email",
    ),
    phone: optionalString,
    projectName: optionalString,
    location: optionalString,
    objectType: z.enum(clientObjectTypes),
    segment: z.enum(clientSegments).default("OPTIMUM"),
    widthM: optionalNumber,
    lengthM: optionalNumber,
    heightM: optionalNumber,
    targetBudgetRub: z.preprocess((value) => {
      if (value === "" || value === null || value === undefined) {
        return undefined;
      }

      const numericValue = Number(value);
      return Number.isFinite(numericValue) ? numericValue : value;
    }, z.number().nonnegative().optional()),
    needsDelivery: z.boolean().default(false),
    needsInstallation: z.boolean().default(false),
    notes: optionalString,
  })
  .superRefine((data, ctx) => {
    if (!data.email && !data.phone) {
      ctx.addIssue({
        code: "custom",
        path: ["email"],
        message: "Нужен хотя бы один контакт: email или телефон",
      });
    }
  });

export type ClientRequestSubmission = z.infer<typeof clientRequestSubmissionSchema>;

export const clientRequestPhotoSchema = z.object({
  id: z.string().min(1),
  url: z.string().min(1),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  uploadedAt: z.string().datetime(),
});

export type ClientRequestPhoto = z.infer<typeof clientRequestPhotoSchema>;

export const clientRequestEstimateBreakdownLineSchema = z.object({
  code: z.string().min(1),
  label: z.string().min(1),
  amountRub: z.number().nonnegative(),
  comment: z.string().min(1),
});

export type ClientRequestEstimateBreakdownLine = z.infer<
  typeof clientRequestEstimateBreakdownLineSchema
>;

export const clientRequestEstimateBenchmarkProductSchema = z.object({
  article: z.string().min(1),
  name: z.string().min(1),
  categoryName: z.string().min(1).optional(),
  basePriceRub: z.number().nonnegative(),
  costRub: z.number().nonnegative().optional(),
  confidence: z.number().min(0).max(1),
  score: z.number().nonnegative(),
  reasons: z.array(z.string().min(1)).default([]),
});

export type ClientRequestEstimateBenchmarkProduct = z.infer<
  typeof clientRequestEstimateBenchmarkProductSchema
>;

export const clientRequestEstimateSchema = z.object({
  method: z.enum(clientRequestEstimateMethods).default("HEURISTIC"),
  resolvedObjectType: z.enum(clientObjectTypes).optional(),
  confidence: z.number().min(0).max(1),
  areaM2: z.number().nonnegative().optional(),
  equipmentRub: z.number().nonnegative(),
  deliveryRub: z.number().nonnegative(),
  installationRub: z.number().nonnegative(),
  estimatedMinRub: z.number().nonnegative(),
  estimatedMaxRub: z.number().nonnegative(),
  notes: z.array(z.string().min(1)),
  assumedMaterials: z.array(z.string().min(1)),
  breakdown: z.array(clientRequestEstimateBreakdownLineSchema),
  benchmarkSourceCount: z.number().int().nonnegative().default(0),
  benchmarkCoverage: z.number().min(0).max(1).default(0),
  benchmarkProducts: z.array(clientRequestEstimateBenchmarkProductSchema).default([]),
  waitingForMaterialMatrix: z.boolean().default(true),
});

export type ClientRequestEstimate = z.infer<typeof clientRequestEstimateSchema>;

export const clientRequestModelPartSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  material: z.string().min(1),
  comment: z.string().min(1),
});

export type ClientRequestModelPart = z.infer<typeof clientRequestModelPartSchema>;

export const clientRequestModelBriefSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  sceneKind: z.string().min(1),
  interactionHint: z.string().min(1),
  nextInputs: z.array(z.string().min(1)),
  hotspots: z.array(clientRequestModelPartSchema),
});

export type ClientRequestModelBrief = z.infer<typeof clientRequestModelBriefSchema>;

export const clientRequestRecordSchema = z.object({
  id: z.string().min(1),
  reference: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  status: z.enum(clientRequestStatuses),
  customerName: z.string().min(1),
  companyName: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  projectName: z.string().optional(),
  location: z.string().optional(),
  objectType: z.enum(clientObjectTypes),
  segment: z.enum(clientSegments),
  widthM: z.number().positive().optional(),
  lengthM: z.number().positive().optional(),
  heightM: z.number().positive().optional(),
  targetBudgetRub: z.number().nonnegative().optional(),
  needsDelivery: z.boolean(),
  needsInstallation: z.boolean(),
  notes: z.string().optional(),
  photos: z.array(clientRequestPhotoSchema).min(1),
  estimate: clientRequestEstimateSchema,
  modelBrief: clientRequestModelBriefSchema,
});

export type ClientRequestRecord = z.infer<typeof clientRequestRecordSchema>;

export const clientRequestStoreSchema = z.object({
  version: z.literal(1),
  updatedAt: z.string().datetime(),
  requests: z.array(clientRequestRecordSchema),
});

export type ClientRequestStore = z.infer<typeof clientRequestStoreSchema>;
