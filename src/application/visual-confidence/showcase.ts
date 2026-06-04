import { GeneratedProduct } from "@/import/catalog/types";

export const TRACK_V_DEMO_READY_SOURCE = "TRACK_V_3D_VISUAL_CONFIDENCE";

export const TRACK_V_DEMO_READY_SKU = {
  article: "СКП.О.021",
  articleMojibake: "РЎРљРџ.Рћ.021",
  slug: "skpo021-skpo021-oborudovanie-dlya-skeyt-parka-bank-with-stairs",
  label: "СКП.О.021 Bank with stairs",
} as const;

export const TRACK_V_QA_CANDIDATES = [
  {
    article: "ЭКО.ГК006",
    articleMojibake: "Р­РљРћ.Р“Рљ006",
    slug: "ekogk006-ekogk006-gimnasticheskiy-kompleks-optimum-eco",
    label: "ЭКО.ГК006 Гимнастический комплекс Optimum-Eco",
    reason: "Есть 3DS asset и manifest, но статус QA/ANNOTATED, не demo-ready.",
  },
] as const;

export const TRACK_V_SCENE_PRESET = {
  id: "track-v-skate-bank-demo-scene",
  title: "Демо-размещение скейт-элемента",
  productSlug: TRACK_V_DEMO_READY_SKU.slug,
  bounds: {
    widthM: 10,
    lengthM: 8,
  },
  placement: {
    positionXM: 5,
    positionYM: 4,
    rotationDeg: 0,
  },
  footprint: {
    widthM: 5.3,
    lengthM: 4.8,
  },
  safetyZone: {
    widthM: 7.3,
    lengthM: 6.8,
  },
  camera: {
    position: [6.2, 4.15, 6.4] as [number, number, number],
    target: [0.05, 0.78, 0.9] as [number, number, number],
    fov: 34,
  },
  controls: {
    orbit: true,
    zoom: true,
    pan: true,
  },
  overlayStyle: {
    footprintColor: "#171412",
    safetyColor: "#ef641d",
    plotColor: "#f6f1e8",
  },
} as const;

export type TrackVReadiness = {
  demoReady: boolean;
  canonicalSku: boolean;
  statusLabel: "DEMO_READY" | "QA_CANDIDATE" | "NOT_READY";
  reasons: string[];
  modelUrl?: string;
  materialUrl?: string;
  modelFormat?: string;
  annotationManifestUrl?: string;
};

function getThreeDMetadata(product: GeneratedProduct) {
  const metadata = product.metadata.threeD;
  return metadata && typeof metadata === "object"
    ? (metadata as Record<string, unknown>)
    : undefined;
}

function getModelAsset(product: GeneratedProduct) {
  return product.assets.find((asset) => asset.kind === "MODEL_3D");
}

function getStringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function isCanonicalDemoSku(product: GeneratedProduct) {
  return (
    product.slug === TRACK_V_DEMO_READY_SKU.slug ||
    product.article === TRACK_V_DEMO_READY_SKU.articleMojibake ||
    product.articleNormalized === TRACK_V_DEMO_READY_SKU.articleMojibake
  );
}

function isQaCandidate(product: GeneratedProduct) {
  return TRACK_V_QA_CANDIDATES.some(
    (candidate) =>
      product.slug === candidate.slug ||
      product.article === candidate.articleMojibake ||
      product.articleNormalized === candidate.articleMojibake,
  );
}

export function getTrackVReadiness(product: GeneratedProduct): TrackVReadiness {
  const metadata = getThreeDMetadata(product);
  const modelAsset = getModelAsset(product);
  const modelUrl = modelAsset?.url ?? getStringValue(metadata?.webModelUrl);
  const materialUrl =
    getStringValue(modelAsset?.metadata?.materialUrl) ??
    getStringValue(metadata?.materialUrl);
  const modelFormat =
    getStringValue(modelAsset?.metadata?.format)?.toUpperCase() ??
    getStringValue(metadata?.webModelFormat)?.toUpperCase();
  const annotationManifestUrl = getStringValue(metadata?.annotationManifestUrl);
  const canonicalSku = isCanonicalDemoSku(product);

  const reasons: string[] = [];

  if (!canonicalSku) {
    reasons.push("Товар не входит в канонический Track V demo-ready SKU.");
  }

  if (!modelAsset || !modelUrl) {
    reasons.push("Нет подключенного MODEL_3D asset.");
  }

  if (modelFormat !== "OBJ") {
    reasons.push("Для DR-P0 выбран только проверенный OBJ asset СКП.О.021.");
  }

  if (metadata?.lifecycleStatus !== "PUBLISHED") {
    reasons.push("3D lifecycle не PUBLISHED.");
  }

  if (metadata?.publishStatus !== "LIVE") {
    reasons.push("3D publish status не LIVE.");
  }

  if (metadata?.qualityGate !== "APPROVED") {
    reasons.push("Quality gate не APPROVED.");
  }

  if (metadata?.annotationStatus !== "READY" || !annotationManifestUrl) {
    reasons.push("Annotation manifest не готов.");
  }

  const demoReady = canonicalSku && reasons.length === 0;

  if (demoReady) {
    reasons.push("Канонический SKU имеет опубликованный real OBJ asset и готов к демо.");
  }

  return {
    demoReady,
    canonicalSku,
    statusLabel: demoReady
      ? "DEMO_READY"
      : isQaCandidate(product)
        ? "QA_CANDIDATE"
        : "NOT_READY",
    reasons,
    modelUrl,
    materialUrl,
    modelFormat,
    annotationManifestUrl,
  };
}
