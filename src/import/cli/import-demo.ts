import { mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";

import {
  buildProductCostCatalog,
  buildProductCostMergeReport,
} from "@/application/costing/product-cost-engine";
import {
  buildProductTruthFoundation,
  renderFirstWaveMarkdown,
} from "@/application/placement-foundation/product-truth-foundation";
import { logger } from "@/infrastructure/logging/logger";
import { mergeCatalogData } from "@/import/catalog/merge-catalog";
import { importBitrixCsv } from "@/import/bitrix/import-bitrix";
import { resolveImportSources } from "@/import/cli/source-paths";
import {
  buildThreeDConversionQueue,
  buildThreeDCoverageReport,
  buildThreeDProductionWorkflow,
  importThreeDAssetRegistry,
} from "@/import/3d/import-3d-assets";
import { importProductCostWorkbook } from "@/import/costs/import-product-cost-workbook";
import { importPriceWorkbook } from "@/import/prices/import-prices";
import { importProposalSamples } from "@/import/proposals/import-proposal-samples";

async function fileExists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveProposalSamplePaths(primaryWorkbook?: string) {
  const candidates = [primaryWorkbook].filter(Boolean) as string[];

  const resolved: string[] = [];

  for (const candidate of candidates) {
    const normalizedPath = path.resolve(candidate);

    if ((await fileExists(normalizedPath)) && !resolved.includes(normalizedPath)) {
      resolved.push(normalizedPath);
    }
  }

  return resolved;
}

async function main() {
  const sources = await resolveImportSources();
  const requiredPaths = [sources.bitrixCsv, sources.priceOptimum, sources.pricePremium];

  if (requiredPaths.some((value) => !value)) {
    throw new Error(
      "Import paths are not configured. Copy .env.example to .env and set IMPORT_BITRIX_CSV_PATH, IMPORT_PRICE_OPTIMUM_XLSX_PATH, and IMPORT_PRICE_PREMIUM_XLSX_PATH to local demo-safe source files.",
    );
  }

  logger.info(
    {
      sources,
    },
    "Starting catalog import",
  );

  const proposalSamplePaths = await resolveProposalSamplePaths(sources.proposalWorkbook);
  const threeDRoots = [sources.threeDRoot, sources.dwgRoot].filter(
    (value): value is string => Boolean(value),
  );

  const [bitrixBundle, optimumBundle, premiumBundle, threeDRegistry, productCostImport] = await Promise.all([
    importBitrixCsv(sources.bitrixCsv!),
    importPriceWorkbook(sources.priceOptimum!, "PRICE_OPTIMUM"),
    importPriceWorkbook(sources.pricePremium!, "PRICE_PREMIUM"),
    threeDRoots.length > 0
      ? importThreeDAssetRegistry(threeDRoots)
      : Promise.resolve(undefined),
    sources.materialCostsWorkbook
      ? importProductCostWorkbook(sources.materialCostsWorkbook)
      : Promise.resolve(undefined),
  ]);

  const proposalScenarios = importProposalSamples(proposalSamplePaths);
  const productCostCatalog = productCostImport
    ? buildProductCostCatalog(productCostImport)
    : undefined;

  const merged = mergeCatalogData(
    [bitrixBundle, optimumBundle, premiumBundle],
    proposalScenarios,
    threeDRegistry,
    productCostCatalog,
  );
  const threeDCoverage = threeDRegistry
    ? await buildThreeDCoverageReport(merged.products, threeDRegistry)
    : undefined;
  const threeDQueue = threeDRegistry
    ? await buildThreeDConversionQueue(merged.products, threeDRegistry)
    : undefined;
  const threeDWorkflow = threeDRegistry
    ? await buildThreeDProductionWorkflow(merged.products, threeDRegistry, threeDQueue)
    : undefined;
  const productCostReport =
    productCostImport && productCostCatalog
      ? buildProductCostMergeReport(merged.products, productCostCatalog, productCostImport)
      : undefined;
  const productTruthFoundation = buildProductTruthFoundation(merged.products);

  const outputDir = path.resolve("generated");
  await mkdir(outputDir, { recursive: true });
  await writeFile(
    path.join(outputDir, "catalog-data.json"),
    JSON.stringify(merged, null, 2),
    "utf8",
  );
  if (productCostImport) {
    await writeFile(
      path.join(outputDir, "product-cost-matrix.json"),
      JSON.stringify(productCostImport, null, 2),
      "utf8",
    );
  }
  if (productCostReport) {
    await writeFile(
      path.join(outputDir, "product-cost-report.json"),
      JSON.stringify(productCostReport, null, 2),
      "utf8",
    );
  }
  await writeFile(
    path.join(outputDir, "product-truth-foundation.json"),
    JSON.stringify(productTruthFoundation, null, 2),
    "utf8",
  );
  await writeFile(
    path.join(outputDir, "product-truth-first-wave.json"),
    JSON.stringify(productTruthFoundation.firstWave, null, 2),
    "utf8",
  );
  await writeFile(
    path.join(outputDir, "product-truth-first-wave.md"),
    renderFirstWaveMarkdown(productTruthFoundation),
    "utf8",
  );

  logger.info(
    {
      summary: merged.summary,
      threeD: threeDRegistry?.summary,
      threeDCoverage: threeDCoverage?.summary,
      threeDQueue: threeDQueue?.summary,
      threeDWorkflow: threeDWorkflow?.summary,
      productCost: productCostReport?.summary,
      productTruth: productTruthFoundation.firstWaveSummary,
      proposalSamplePaths,
      output: path.join(outputDir, "catalog-data.json"),
    },
    "Catalog import completed",
  );
}

main().catch((error: unknown) => {
  logger.error(error, "Catalog import failed");
  process.exitCode = 1;
});
