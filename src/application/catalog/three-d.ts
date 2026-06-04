import { GeneratedProduct } from "@/import/catalog/types";

export type ProductThreeDInfo = {
  status: "READY" | "PENDING_CONVERSION";
  lifecycleStatus: "SOURCE_READY" | "CONVERTED" | "ANNOTATED" | "PUBLISHED";
  workflowStage: "CONVERSION" | "ANNOTATION" | "QA" | "LIVE";
  annotationStatus: "MISSING" | "READY";
  publishStatus: "INTERNAL" | "LIVE";
  qualityGate: "APPROVED" | "REVIEW_REQUIRED";
  hasModelAsset: boolean;
  previewImages: number;
  sourceFiles: number;
  annotationCount: number;
  sourceDirectory?: string;
  deliveryFormat?: string;
  annotationManifestUrl?: string;
  renderableInViewer: boolean;
};

type ThreeDMetadataShape = {
  status?: unknown;
  lifecycleStatus?: unknown;
  workflowStage?: unknown;
  annotationStatus?: unknown;
  publishStatus?: unknown;
  qualityGate?: unknown;
  previewImages?: unknown;
  sourceMaxFiles?: unknown;
  sourceConvertibleFiles?: unknown;
  sourceDwgFiles?: unknown;
  sourceDirectory?: unknown;
  webModelFormat?: unknown;
  annotationCount?: unknown;
  annotationManifestUrl?: unknown;
};

function isRenderableModelFormat(format?: string) {
  return (
    format === "GLB" ||
    format === "OBJ" ||
    format === "FBX" ||
    format === "DAE"
  );
}

export function getProductThreeDInfo(
  product: GeneratedProduct,
): ProductThreeDInfo | null {
  const metadata = product.metadata.threeD;
  const modelAsset = product.assets.find((asset) => asset.kind === "MODEL_3D");

  if (!metadata || typeof metadata !== "object") {
    if (!modelAsset) {
      return null;
    }

    const deliveryFormat =
      typeof modelAsset.metadata?.format === "string"
        ? modelAsset.metadata.format
        : undefined;

    return {
      status: "READY",
      lifecycleStatus: "CONVERTED",
      workflowStage: "QA",
      annotationStatus: "MISSING",
      publishStatus: "INTERNAL",
      qualityGate: "REVIEW_REQUIRED",
      hasModelAsset: true,
      previewImages: product.gallery.length,
      sourceFiles: 0,
      annotationCount: 0,
      deliveryFormat,
      renderableInViewer:
        isRenderableModelFormat(deliveryFormat) || deliveryFormat === undefined,
    };
  }

  const threeDMetadata = metadata as ThreeDMetadataShape;
  const status =
    threeDMetadata.status === "READY"
      ? "READY"
      : threeDMetadata.status === "PENDING_CONVERSION"
        ? "PENDING_CONVERSION"
        : modelAsset
          ? "READY"
          : "PENDING_CONVERSION";

  const lifecycleStatus =
    threeDMetadata.lifecycleStatus === "PUBLISHED" ||
    threeDMetadata.lifecycleStatus === "ANNOTATED" ||
    threeDMetadata.lifecycleStatus === "CONVERTED" ||
    threeDMetadata.lifecycleStatus === "SOURCE_READY"
      ? threeDMetadata.lifecycleStatus
      : modelAsset
        ? "CONVERTED"
        : "SOURCE_READY";

  const workflowStage =
    threeDMetadata.workflowStage === "LIVE" ||
    threeDMetadata.workflowStage === "QA" ||
    threeDMetadata.workflowStage === "ANNOTATION" ||
    threeDMetadata.workflowStage === "CONVERSION"
      ? threeDMetadata.workflowStage
      : lifecycleStatus === "PUBLISHED"
        ? "LIVE"
        : lifecycleStatus === "SOURCE_READY"
          ? "CONVERSION"
          : "QA";

  const annotationStatus =
    threeDMetadata.annotationStatus === "READY" ? "READY" : "MISSING";
  const publishStatus =
    threeDMetadata.publishStatus === "LIVE" ? "LIVE" : "INTERNAL";
  const qualityGate =
    threeDMetadata.qualityGate === "APPROVED"
      ? "APPROVED"
      : "REVIEW_REQUIRED";
  const deliveryFormat =
    typeof threeDMetadata.webModelFormat === "string"
      ? threeDMetadata.webModelFormat
      : typeof modelAsset?.metadata?.format === "string"
        ? modelAsset.metadata.format
        : undefined;

  return {
    status,
    lifecycleStatus,
    workflowStage,
    annotationStatus,
    publishStatus,
    qualityGate,
    hasModelAsset: Boolean(modelAsset),
    previewImages: Array.isArray(threeDMetadata.previewImages)
      ? threeDMetadata.previewImages.length
      : 0,
    sourceFiles:
      (Array.isArray(threeDMetadata.sourceMaxFiles)
        ? threeDMetadata.sourceMaxFiles.length
        : 0) +
      (Array.isArray(threeDMetadata.sourceConvertibleFiles)
        ? threeDMetadata.sourceConvertibleFiles.length
        : 0) +
      (Array.isArray(threeDMetadata.sourceDwgFiles)
        ? threeDMetadata.sourceDwgFiles.length
        : 0),
    annotationCount:
      typeof threeDMetadata.annotationCount === "number"
        ? threeDMetadata.annotationCount
        : 0,
    sourceDirectory:
      typeof threeDMetadata.sourceDirectory === "string"
        ? threeDMetadata.sourceDirectory
        : undefined,
    deliveryFormat,
    annotationManifestUrl:
      typeof threeDMetadata.annotationManifestUrl === "string"
        ? threeDMetadata.annotationManifestUrl
        : undefined,
    renderableInViewer:
      isRenderableModelFormat(deliveryFormat) || deliveryFormat === undefined,
  };
}
