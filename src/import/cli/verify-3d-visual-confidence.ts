import { promises as fs } from "node:fs";
import path from "node:path";

import {
  TRACK_V_DEMO_READY_SKU,
  TRACK_V_QA_CANDIDATES,
  TRACK_V_SCENE_PRESET,
  getTrackVReadiness,
} from "@/application/visual-confidence/showcase";
import { getCatalogProductBySlug } from "@/infrastructure/data/generated-catalog";
import { GeneratedProduct } from "@/import/catalog/types";
import { buildProductViewerSpec } from "@/ui/components/catalog/product-viewer-spec";
import { matchViewerPartId } from "@/ui/components/catalog/real-model-matching";

type VerificationResult = {
  ok: boolean;
  checked: string[];
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function publicPathFromUrl(url: string) {
  const pathname = decodeURIComponent(url.split("?")[0]?.replace(/^\/+/, "") ?? "");
  return path.join(process.cwd(), "public", pathname);
}

async function fileExists(filePath: string) {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile() ? stat.size : 0;
  } catch {
    return 0;
  }
}

function cloneWithoutAssets(product: GeneratedProduct): GeneratedProduct {
  return {
    ...product,
    assets: product.assets.filter((asset) => asset.kind !== "MODEL_3D"),
    metadata: {},
  };
}

async function main() {
  const checked: string[] = [];

  const product = await getCatalogProductBySlug(TRACK_V_DEMO_READY_SKU.slug);
  assert(product, `Canonical Track V SKU is missing: ${TRACK_V_DEMO_READY_SKU.slug}`);
  checked.push("canonical SKU exists in generated catalog");

  const repeatedOpenProduct = await getCatalogProductBySlug(TRACK_V_DEMO_READY_SKU.slug);
  assert(
    repeatedOpenProduct?.slug === product.slug,
    "Repeat catalog open does not resolve the same canonical product",
  );
  checked.push("repeat open resolves the same catalog product");

  const readiness = getTrackVReadiness(product);
  assert(readiness.demoReady, `Canonical SKU is not demo-ready: ${readiness.reasons.join("; ")}`);
  assert(readiness.statusLabel === "DEMO_READY", "Canonical SKU must be DEMO_READY");
  assert(readiness.modelFormat === "OBJ", "Canonical SKU must use the approved OBJ asset");
  assert(readiness.modelUrl, "Canonical SKU must expose a model URL");
  checked.push("readiness gate marks only canonical SKU as demo-ready");

  const modelPath = publicPathFromUrl(readiness.modelUrl);
  const modelSize = await fileExists(modelPath);
  assert(modelSize > 100_000, `Model file is missing or too small: ${modelPath}`);
  checked.push("real OBJ asset exists and is non-empty");

  assert(readiness.materialUrl, "Canonical OBJ asset must have materialUrl");
  const materialPath = publicPathFromUrl(readiness.materialUrl);
  const materialSize = await fileExists(materialPath);
  assert(materialSize > 0, `Material file is missing: ${materialPath}`);
  checked.push("real MTL material file exists");

  if (readiness.annotationManifestUrl) {
    const manifestPath = publicPathFromUrl(readiness.annotationManifestUrl);
    const manifestSize = await fileExists(manifestPath);
    assert(manifestSize > 0, `Annotation manifest is missing: ${manifestPath}`);
    checked.push("annotation manifest exists");
  }

  const spec = buildProductViewerSpec(product);
  assert(spec.hasRealModel, "Viewer spec must use a real model for canonical SKU");
  assert(spec.modelFormat === "OBJ", "Viewer spec must resolve the canonical model as OBJ");
  assert(spec.modelUrl === readiness.modelUrl, "Viewer spec model URL differs from readiness URL");
  checked.push("viewer spec resolves the real OBJ asset");

  const rideSurface = spec.parts.find((part) => part.id === "ride-surface");
  const metalCoping = spec.parts.find((part) => part.id === "metal-coping");
  assert(rideSurface?.modelMatchers?.materialNames?.[0], "Ride surface material matcher missing");
  assert(metalCoping?.modelMatchers?.materialNames?.[0], "Metal coping material matcher missing");

  const materialSource = await fs.readFile(materialPath, "utf8");
  assert(
    materialSource.includes(rideSurface.modelMatchers.materialNames[0]),
    "MTL file does not contain ride-surface material matcher",
  );
  assert(
    materialSource.includes(metalCoping.modelMatchers.materialNames[0]),
    "MTL file does not contain metal-coping material matcher",
  );
  checked.push("material names match real MTL content");

  assert(
    matchViewerPartId(spec.parts, {
      objectName: "Plane001",
      materialNames: [rideSurface.modelMatchers.materialNames[0]],
    }) === "ride-surface",
    "Ride surface hotspot matcher does not resolve to ride-surface",
  );
  assert(
    matchViewerPartId(spec.parts, {
      objectName: "Circle073",
      materialNames: [metalCoping.modelMatchers.materialNames[0]],
    }) === "metal-coping",
    "Metal coping hotspot matcher does not resolve to metal-coping",
  );
  checked.push("hotspot interaction matchers resolve expected material nodes");

  assert(TRACK_V_SCENE_PRESET.productSlug === product.slug, "Scene preset targets wrong SKU");
  assert(TRACK_V_SCENE_PRESET.bounds.widthM === 10, "Scene preset width must be fixed");
  assert(TRACK_V_SCENE_PRESET.bounds.lengthM === 8, "Scene preset length must be fixed");
  assert(TRACK_V_SCENE_PRESET.placement.positionXM === 5, "Scene preset X placement changed");
  assert(TRACK_V_SCENE_PRESET.placement.positionYM === 4, "Scene preset Y placement changed");
  assert(TRACK_V_SCENE_PRESET.placement.rotationDeg === 0, "Scene preset rotation changed");
  assert(TRACK_V_SCENE_PRESET.controls.orbit, "Orbit control must be enabled for demo");
  assert(TRACK_V_SCENE_PRESET.controls.zoom, "Zoom control must be enabled for demo");
  assert(TRACK_V_SCENE_PRESET.controls.pan, "Pan control must be enabled for demo");
  checked.push("deterministic V2 scene preset is stable");

  const notReady = getTrackVReadiness(cloneWithoutAssets(product));
  assert(!notReady.demoReady, "Missing real model asset must not pass Track V readiness");
  checked.push("graceful failure path rejects missing real asset");

  const qaCandidate = await getCatalogProductBySlug(TRACK_V_QA_CANDIDATES[0].slug);
  if (qaCandidate) {
    const qaReadiness = getTrackVReadiness(qaCandidate);
    assert(!qaReadiness.demoReady, "QA candidate must not be demo-ready");
    assert(qaReadiness.statusLabel === "QA_CANDIDATE", "QA candidate status changed");
    checked.push("ECO.GK006 remains QA candidate only");
  }

  const viewerSource = await fs.readFile(
    path.join(process.cwd(), "src", "ui", "components", "catalog", "product-viewer-client.tsx"),
    "utf8",
  );
  assert(
    viewerSource.includes("realAssetMissing") &&
      viewerSource.includes("Empty3DState"),
    "Showcase viewer no-proxy failure path is not present",
  );
  checked.push("showcase mode has no-proxy unavailable state");

  const result: VerificationResult = {
    ok: true,
    checked,
  };

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exit(1);
});
