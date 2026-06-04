import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1).optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  IMPORT_BITRIX_CSV_PATH: z.string().min(1).optional(),
  IMPORT_PRICE_OPTIMUM_XLSX_PATH: z.string().min(1).optional(),
  IMPORT_PRICE_PREMIUM_XLSX_PATH: z.string().min(1).optional(),
  IMPORT_KP_SAMPLE_XLSX_PATH: z.string().min(1).optional(),
  IMPORT_MATERIAL_COSTS_XLSX_PATH: z.string().min(1).optional(),
  IMPORT_3D_ROOT_PATH: z.string().min(1).optional(),
  IMPORT_DWG_ROOT_PATH: z.string().min(1).optional(),
  CLIENT_REQUESTS_DATA_PATH: z.string().min(1).optional(),
  CLIENT_REQUEST_UPLOADS_DIR: z.string().min(1).optional(),
  DEMO_DATA_ONLY: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration", parsed.error.flatten());
  throw new Error("Invalid environment configuration");
}

export const env = parsed.data;

export const isDemoDataOnly = env.DEMO_DATA_ONLY ?? !env.DATABASE_URL;
