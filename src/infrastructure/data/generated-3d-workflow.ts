import { promises as fs } from "node:fs";
import path from "node:path";
import { cache } from "react";

import {
  ThreeDAssetRegistry,
  ThreeDConversionQueue,
  ThreeDProductionWorkflow,
} from "@/import/3d/import-3d-assets";

const registryPath = path.join(process.cwd(), "generated", "3d-asset-registry.json");
const coveragePath = path.join(process.cwd(), "generated", "3d-coverage-report.json");
const queuePath = path.join(process.cwd(), "generated", "3d-conversion-queue.json");
const workflowPath = path.join(process.cwd(), "generated", "3d-production-workflow.json");

async function readJson<T>(filePath: string) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
}

export const getGeneratedThreeDRegistry = cache(async () => {
  return readJson<ThreeDAssetRegistry>(registryPath);
});

export const getGeneratedThreeDConversionQueue = cache(async () => {
  return readJson<ThreeDConversionQueue>(queuePath);
});

export const getGeneratedThreeDProductionWorkflow = cache(async () => {
  return readJson<ThreeDProductionWorkflow>(workflowPath);
});

export const getGeneratedThreeDCoverage = cache(async () => {
  return readJson<Record<string, unknown>>(coveragePath);
});
