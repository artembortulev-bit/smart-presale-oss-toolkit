import { describe, expect, it } from "vitest";

import { getProductThreeDInfo } from "@/application/catalog/three-d";
import { GeneratedProduct } from "@/import/catalog/types";

function buildProduct(overrides?: Partial<GeneratedProduct>): GeneratedProduct {
  return {
    id: "product-1",
    slug: "product-1",
    article: "ART-1",
    articleNormalized: "ART1",
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

describe("getProductThreeDInfo", () => {
  it("returns extended lifecycle from metadata", () => {
    const product = buildProduct({
      metadata: {
        threeD: {
          status: "READY",
          lifecycleStatus: "ANNOTATED",
          workflowStage: "QA",
          annotationStatus: "READY",
          publishStatus: "INTERNAL",
          qualityGate: "REVIEW_REQUIRED",
          previewImages: ["/preview-1.jpg", "/preview-2.jpg"],
          sourceMaxFiles: ["model.max"],
          sourceConvertibleFiles: ["model.obj"],
          sourceDwgFiles: ["model.dwg"],
          sourceDirectory: "C:/3D/ART-1",
          webModelFormat: "OBJ",
          annotationCount: 3,
          annotationManifestUrl: "/3d-annotations/art-1.json",
        },
      },
      assets: [
        {
          kind: "MODEL_3D",
          url: "/models/art-1/model.obj",
          metadata: {
            format: "OBJ",
          },
        },
      ],
    });

    expect(getProductThreeDInfo(product)).toEqual({
      status: "READY",
      lifecycleStatus: "ANNOTATED",
      workflowStage: "QA",
      annotationStatus: "READY",
      publishStatus: "INTERNAL",
      qualityGate: "REVIEW_REQUIRED",
      hasModelAsset: true,
      previewImages: 2,
      sourceFiles: 3,
      annotationCount: 3,
      sourceDirectory: "C:/3D/ART-1",
      deliveryFormat: "OBJ",
      annotationManifestUrl: "/3d-annotations/art-1.json",
      renderableInViewer: true,
    });
  });

  it("returns converted state when only MODEL_3D asset exists", () => {
    const product = buildProduct({
      gallery: ["/preview.jpg"],
      assets: [
        {
          kind: "MODEL_3D",
          url: "/models/art-1/model.glb",
          metadata: {
            format: "GLB",
          },
        },
      ],
    });

    expect(getProductThreeDInfo(product)).toEqual({
      status: "READY",
      lifecycleStatus: "CONVERTED",
      workflowStage: "QA",
      annotationStatus: "MISSING",
      publishStatus: "INTERNAL",
      qualityGate: "REVIEW_REQUIRED",
      hasModelAsset: true,
      previewImages: 1,
      sourceFiles: 0,
      annotationCount: 0,
      sourceDirectory: undefined,
      deliveryFormat: "GLB",
      annotationManifestUrl: undefined,
      renderableInViewer: true,
    });
  });
});
