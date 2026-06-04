import { access } from "node:fs/promises";

import { env } from "@/infrastructure/config/env";

type KnownSourceKey =
  | "bitrixCsv"
  | "priceOptimum"
  | "pricePremium"
  | "materialCostsWorkbook"
  | "proposalWorkbook"
  | "threeDRoot"
  | "dwgRoot";

type SourceCandidatesMap = Record<KnownSourceKey, string[]>;

const candidatePaths: SourceCandidatesMap = {
  bitrixCsv: [env.IMPORT_BITRIX_CSV_PATH ?? ""],
  priceOptimum: [env.IMPORT_PRICE_OPTIMUM_XLSX_PATH ?? ""],
  pricePremium: [env.IMPORT_PRICE_PREMIUM_XLSX_PATH ?? ""],
  materialCostsWorkbook: [env.IMPORT_MATERIAL_COSTS_XLSX_PATH ?? ""],
  proposalWorkbook: [env.IMPORT_KP_SAMPLE_XLSX_PATH ?? ""],
  threeDRoot: [env.IMPORT_3D_ROOT_PATH ?? ""],
  dwgRoot: [env.IMPORT_DWG_ROOT_PATH ?? ""],
};

async function exists(targetPath: string) {
  if (!targetPath) {
    return false;
  }

  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function resolveSourcePath(key: KnownSourceKey) {
  const candidates = candidatePaths[key].filter(Boolean);

  for (const candidate of candidates) {
    if (await exists(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

export async function resolveImportSources() {
  const [
    bitrixCsv,
    priceOptimum,
    pricePremium,
    materialCostsWorkbook,
    proposalWorkbook,
    threeDRoot,
    dwgRoot,
  ] = await Promise.all([
    resolveSourcePath("bitrixCsv"),
    resolveSourcePath("priceOptimum"),
    resolveSourcePath("pricePremium"),
    resolveSourcePath("materialCostsWorkbook"),
    resolveSourcePath("proposalWorkbook"),
    resolveSourcePath("threeDRoot"),
    resolveSourcePath("dwgRoot"),
  ]);

  return {
    bitrixCsv,
    priceOptimum,
    pricePremium,
    materialCostsWorkbook,
    proposalWorkbook,
    threeDRoot,
    dwgRoot,
  };
}
