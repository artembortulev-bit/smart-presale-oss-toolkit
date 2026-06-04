import { describe, expect, it } from "vitest";

import {
  TRACK_V_DEMO_READY_SKU,
  TRACK_V_QA_CANDIDATES,
  TRACK_V_SCENE_PRESET,
  getTrackVReadiness,
} from "@/application/visual-confidence/showcase";
import { GeneratedProduct } from "@/import/catalog/types";

function buildProduct(overrides?: Partial<GeneratedProduct>): GeneratedProduct {
  return {
    id: "product-1",
    slug: "product-1",
    article: "ART-1",
    articleNormalized: "ART-1",
    name: "Demo product",
    materials: [],
    gallery: [],
    tags: [],
    metadata: {},
    prices: [],
    assets: [],
    variants: [],
    rawSources: [],
    ...overrides,
  };
}

function buildReadySkateBank(overrides?: Partial<GeneratedProduct>) {
  return buildProduct({
    slug: TRACK_V_DEMO_READY_SKU.slug,
    article: TRACK_V_DEMO_READY_SKU.article,
    articleNormalized: TRACK_V_DEMO_READY_SKU.article,
    metadata: {
      threeD: {
        lifecycleStatus: "PUBLISHED",
        publishStatus: "LIVE",
        qualityGate: "APPROVED",
        annotationStatus: "READY",
        annotationManifestUrl: "/3d-annotations/skpo021.json",
      },
    },
    assets: [
      {
        kind: "MODEL_3D",
        url: "/models/skpo021/model.obj",
        metadata: {
          format: "OBJ",
          materialUrl: "/models/skpo021/model.mtl",
        },
      },
    ],
    ...overrides,
  });
}

describe("Track V visual confidence readiness", () => {
  it("marks only the canonical published OBJ SKU as demo-ready", () => {
    const readiness = getTrackVReadiness(buildReadySkateBank());

    expect(readiness.demoReady).toBe(true);
    expect(readiness.statusLabel).toBe("DEMO_READY");
    expect(readiness.modelFormat).toBe("OBJ");
    expect(readiness.modelUrl).toBe("/models/skpo021/model.obj");
  });

  it("does not silently pass the canonical SKU without a real model asset", () => {
    const readiness = getTrackVReadiness(
      buildReadySkateBank({
        assets: [],
      }),
    );

    expect(readiness.demoReady).toBe(false);
    expect(readiness.statusLabel).toBe("NOT_READY");
    expect(readiness.reasons.some((reason) => reason.includes("MODEL_3D"))).toBe(true);
  });

  it("keeps ECO.GK006 as a QA candidate instead of demo-ready", () => {
    const candidate = TRACK_V_QA_CANDIDATES[0];
    const readiness = getTrackVReadiness(
      buildReadySkateBank({
        slug: candidate.slug,
        article: candidate.article,
        articleNormalized: candidate.article,
      }),
    );

    expect(readiness.demoReady).toBe(false);
    expect(readiness.statusLabel).toBe("QA_CANDIDATE");
  });

  it("keeps the V2 scene preset deterministic", () => {
    expect(TRACK_V_SCENE_PRESET.productSlug).toBe(TRACK_V_DEMO_READY_SKU.slug);
    expect(TRACK_V_SCENE_PRESET.bounds).toEqual({ widthM: 10, lengthM: 8 });
    expect(TRACK_V_SCENE_PRESET.placement).toEqual({
      positionXM: 5,
      positionYM: 4,
      rotationDeg: 0,
    });
    expect(TRACK_V_SCENE_PRESET.controls).toEqual({
      orbit: true,
      zoom: true,
      pan: true,
    });
  });
});
