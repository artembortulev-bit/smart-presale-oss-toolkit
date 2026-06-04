import { copyFile, mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { GeneratedProduct } from "@/import/catalog/types";
import {
  getPredefinedThreeDAnnotationManifest,
  publishedThreeDArticles,
  ThreeDAnnotationManifest,
} from "@/import/3d/annotation-manifests";
import {
  extractArticleFromName,
  normalizeCode,
} from "@/import/shared/normalizers";
import { slugify } from "@/shared/utils/slugify";

export type ThreeDAssetLifecycleStatus =
  | "SOURCE_READY"
  | "CONVERTED"
  | "ANNOTATED"
  | "PUBLISHED";

export type ThreeDAnnotationStatus = "MISSING" | "READY";
export type ThreeDPublishStatus = "INTERNAL" | "LIVE";
export type ThreeDWorkflowStage = "CONVERSION" | "ANNOTATION" | "QA" | "LIVE";

export type ThreeDAssetRecord = {
  articleNormalized: string;
  productName: string;
  sourceRoots: string[];
  sourceDirectories: string[];
  sourceMaxFiles: string[];
  sourceDwgFiles: string[];
  sourceConvertibleFiles: string[];
  previewUrls: string[];
  glbUrl?: string;
  webModelUrl?: string;
  glbStatus: "READY" | "PENDING_CONVERSION";
  webModelSourceFile?: string;
  webModelFormat?: string;
  webModelSupportingUrls: string[];
  materialUrl?: string;
  lifecycleStatus: ThreeDAssetLifecycleStatus;
  annotationStatus: ThreeDAnnotationStatus;
  publishStatus: ThreeDPublishStatus;
  workflowStage: ThreeDWorkflowStage;
  annotationManifestUrl?: string;
  annotationManifestPath?: string;
  annotationCount: number;
  qualityGate: "APPROVED" | "REVIEW_REQUIRED";
};

export type ThreeDAssetRegistry = {
  generatedAt: string;
  summary: {
    records: number;
    readyModels: number;
    pendingModels: number;
    previewImages: number;
    dwgRecords: number;
    convertibleRecords: number;
    sourceReady: number;
    converted: number;
    annotated: number;
    published: number;
    annotationManifests: number;
  };
  roots: string[];
  records: ThreeDAssetRecord[];
};

export type ThreeDCoverageReport = {
  generatedAt: string;
  roots: string[];
  summary: {
    totalProducts: number;
    matchedProducts: number;
    readyProducts: number;
    pendingProducts: number;
    unmatchedProducts: number;
    productsWithDwg: number;
    productsWithConvertibleModels: number;
    productsWithPreviews: number;
    sourceReadyProducts: number;
    convertedProducts: number;
    annotatedProducts: number;
    publishedProducts: number;
  };
  topReadyProducts: Array<{
    article: string;
    name: string;
    categoryName?: string;
    modelUrl?: string;
    lifecycleStatus: ThreeDAssetLifecycleStatus;
  }>;
  topPendingProducts: Array<{
    article: string;
    name: string;
    categoryName?: string;
    sourceDirectory?: string;
    maxFiles: number;
    dwgFiles: number;
    convertibleFiles: number;
    lifecycleStatus: ThreeDAssetLifecycleStatus;
  }>;
};

export type ThreeDConversionQueueItem = {
  priorityTier: "P1" | "P2" | "P3";
  stage:
    | "CONVERTIBLE_TO_GLB"
    | "MAX_TO_GLB"
    | "DWG_ASSISTED_MODELING"
    | "PREVIEW_ONLY_REVIEW";
  score: number;
  article: string;
  articleNormalized: string;
  name: string;
  categoryName?: string;
  priceRub?: number;
  previewImages: number;
  maxFiles: number;
  dwgFiles: number;
  convertibleFiles: number;
  recommendedAction: string;
  sourceDirectory?: string;
  sourceDirectories: string[];
  sourceConvertibleFiles: string[];
  sourceMaxFiles: string[];
  sourceDwgFiles: string[];
};

export type ThreeDConversionQueue = {
  generatedAt: string;
  roots: string[];
  summary: {
    totalQueueItems: number;
    p1: number;
    p2: number;
    p3: number;
  };
  items: ThreeDConversionQueueItem[];
};

export type ThreeDProductionWorkflowItem = {
  article: string;
  articleNormalized: string;
  name: string;
  categoryName?: string;
  lifecycleStatus: ThreeDAssetLifecycleStatus;
  workflowStage: ThreeDWorkflowStage;
  publishStatus: ThreeDPublishStatus;
  annotationStatus: ThreeDAnnotationStatus;
  qualityGate: "APPROVED" | "REVIEW_REQUIRED";
  modelFormat?: string;
  modelUrl?: string;
  annotationManifestUrl?: string;
  annotationCount: number;
  previewImages: number;
  sourceFiles: number;
  sourceDirectory?: string;
  queueStage?: ThreeDConversionQueueItem["stage"];
  nextAction: string;
};

export type ThreeDProductionWorkflow = {
  generatedAt: string;
  roots: string[];
  summary: {
    trackedProducts: number;
    sourceReady: number;
    converted: number;
    annotated: number;
    published: number;
    qaBacklog: number;
    annotationBacklog: number;
    conversionBacklog: number;
  };
  liveItems: ThreeDProductionWorkflowItem[];
  qaItems: ThreeDProductionWorkflowItem[];
  annotationItems: ThreeDProductionWorkflowItem[];
  conversionItems: ThreeDProductionWorkflowItem[];
  firstWave: ThreeDProductionWorkflowItem[];
};

const previewExtensions = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".tga",
  ".tif",
  ".tiff",
  ".jfif",
]);
const webModelExtensions = new Set([".glb"]);
const supportedNativeModelExtensions = new Set([".fbx", ".obj", ".dae", ".3ds"]);
const convertibleModelExtensions = new Set([...supportedNativeModelExtensions, ".blend"]);
const materialExtensions = new Set([".mtl"]);
const maxExtensions = new Set([".max"]);
const dwgExtensions = new Set([".dwg", ".dxf", ".cdw"]);
const inactivePathPattern = /неактуал/i;

type AssetAccumulator = {
  articleNormalized: string;
  productName: string;
  sourceRoots: Set<string>;
  sourceDirectories: Set<string>;
  sourceMaxFiles: Set<string>;
  sourceDwgFiles: Set<string>;
  sourceConvertibleFiles: Set<string>;
  previewFiles: Set<string>;
  glbFiles: Set<string>;
};

function normalizeRootPaths(rootPaths: string | string[]) {
  return Array.from(
    new Set(
      (Array.isArray(rootPaths) ? rootPaths : [rootPaths])
        .map((value) => value.trim())
        .filter(Boolean)
        .map((value) => path.resolve(value)),
    ),
  );
}

async function walkFiles(rootPath: string) {
  const files: string[] = [];
  const queue = [rootPath];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const entries = await readdir(current, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(current, entry.name);

      if (inactivePathPattern.test(entryPath)) {
        continue;
      }

      if (entry.isDirectory()) {
        queue.push(entryPath);
        continue;
      }

      if (entry.isFile()) {
        files.push(entryPath);
      }
    }
  }

  return files;
}

function buildPublicPreviewUrl(articleNormalized: string, fileName: string) {
  return `/imported-3d-previews/${slugify(articleNormalized.toLowerCase())}/${encodeURIComponent(fileName)}`;
}

function buildPublicModelUrl(articleNormalized: string, fileName: string) {
  return `/models/${slugify(articleNormalized.toLowerCase())}/${encodeURIComponent(fileName)}`;
}

function isLikelyArticle(code: string) {
  return /[A-ZА-ЯЁ]/u.test(code) && /\d/.test(code);
}

function extractArticleCandidate(segment: string) {
  const directArticle = extractArticleFromName(segment);
  if (directArticle && isLikelyArticle(directArticle)) {
    return directArticle;
  }

  const firstToken = normalizeCode(segment.split(/\s+/)[0] ?? "");
  if (firstToken && isLikelyArticle(firstToken)) {
    return firstToken;
  }

  return undefined;
}

function extractArticleFromFilePath(filePath: string, rootPath: string) {
  const relativePath = path.relative(rootPath, filePath);
  const parsed = path.parse(relativePath);
  const segments = [
    parsed.name,
    path.basename(parsed.dir),
    path.basename(path.dirname(parsed.dir)),
  ].filter(Boolean);

  for (const segment of segments) {
    const article = extractArticleCandidate(segment);
    if (article) {
      return article;
    }
  }

  return undefined;
}

function getPreferredName(filePath: string) {
  const parentDirectory = path.basename(path.dirname(filePath));
  const fileStem = path.parse(filePath).name;

  return parentDirectory.length >= fileStem.length ? parentDirectory : fileStem;
}

function getExtension(filePath: string) {
  return path.extname(filePath).toLowerCase();
}

function pickPreviewFiles(previewFiles: string[]) {
  return [...previewFiles]
    .sort((left, right) => {
      const leftScore =
        /render|persp|preview|виз/i.test(left) ? -1 : 0;
      const rightScore =
        /render|persp|preview|виз/i.test(right) ? -1 : 0;

      if (leftScore !== rightScore) {
        return leftScore - rightScore;
      }

      return left.localeCompare(right, "ru");
    })
    .slice(0, 6);
}

function getModelFormat(filePath: string) {
  switch (getExtension(filePath)) {
    case ".glb":
      return "GLB";
    case ".obj":
      return "OBJ";
    case ".fbx":
      return "FBX";
    case ".3ds":
      return "3DS";
    case ".dae":
      return "DAE";
    default:
      return undefined;
  }
}

function pickPrimaryModelFile(glbFiles: string[], convertibleFiles: string[]) {
  const priority = [".glb", ".obj", ".fbx", ".3ds", ".dae"] as const;
  const priorityIndex = new Map<string, number>(
    priority.map((extension, index) => [extension, index] as const),
  );

  return [...glbFiles, ...convertibleFiles.filter((filePath) => supportedNativeModelExtensions.has(getExtension(filePath)))]
    .sort((left, right) => {
      const leftPriority = priorityIndex.get(getExtension(left)) ?? Number.MAX_SAFE_INTEGER;
      const rightPriority = priorityIndex.get(getExtension(right)) ?? Number.MAX_SAFE_INTEGER;

      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }

      return left.localeCompare(right, "ru");
    })[0];
}

async function copyPreviewFiles(
  articleNormalized: string,
  previewFiles: string[],
  publicRoot: string,
) {
  const previewTargetDir = path.join(publicRoot, slugify(articleNormalized.toLowerCase()));
  await mkdir(previewTargetDir, { recursive: true });

  const previewUrls: string[] = [];

  for (const filePath of pickPreviewFiles(previewFiles)) {
    const fileName = path.basename(filePath);
    const targetPath = path.join(previewTargetDir, fileName);
    await copyFile(filePath, targetPath);
    previewUrls.push(buildPublicPreviewUrl(articleNormalized, fileName));
  }

  return previewUrls;
}

async function copyModelBundle(
  articleNormalized: string,
  modelFilePath: string,
  publicModelsRoot: string,
) {
  const targetDir = path.join(publicModelsRoot, slugify(articleNormalized.toLowerCase()));
  await mkdir(targetDir, { recursive: true });

  const modelExtension = getExtension(modelFilePath);
  const sourceDirectory = path.dirname(modelFilePath);
  const filesToCopy =
    modelExtension === ".glb"
      ? [modelFilePath]
      : (await readdir(sourceDirectory, { withFileTypes: true }))
          .filter(
            (entry) =>
              entry.isFile() &&
              (webModelExtensions.has(getExtension(entry.name)) ||
                supportedNativeModelExtensions.has(getExtension(entry.name)) ||
                materialExtensions.has(getExtension(entry.name)) ||
                previewExtensions.has(getExtension(entry.name))),
          )
          .map((entry) => path.join(sourceDirectory, entry.name))
          .sort((left, right) => left.localeCompare(right, "ru"));

  const copiedUrls = new Map<string, string>();

  for (const filePath of filesToCopy) {
    const fileName = path.basename(filePath);
    const targetPath = path.join(targetDir, fileName);
    await copyFile(filePath, targetPath);
    copiedUrls.set(filePath, buildPublicModelUrl(articleNormalized, fileName));
  }

  const materialFilePath =
    modelExtension === ".obj"
      ? filesToCopy.find((filePath) => getExtension(filePath) === ".mtl")
      : undefined;

  return {
    primaryUrl: copiedUrls.get(modelFilePath)!,
    format: getModelFormat(modelFilePath)!,
    materialUrl: materialFilePath ? copiedUrls.get(materialFilePath) : undefined,
    supportingUrls: Array.from(copiedUrls.entries())
      .filter(([filePath]) => filePath !== modelFilePath)
      .map(([, url]) => url),
  };
}

async function writeAnnotationManifest(
  articleNormalized: string,
  manifest: ThreeDAnnotationManifest | undefined,
) {
  if (!manifest) {
    return undefined;
  }

  const annotationsDir = path.join(process.cwd(), "public", "3d-annotations");
  await mkdir(annotationsDir, { recursive: true });

  const fileName = `${slugify(articleNormalized.toLowerCase())}.json`;
  const filePath = path.join(annotationsDir, fileName);
  await writeFile(filePath, JSON.stringify(manifest, null, 2), "utf8");

  return {
    url: `/3d-annotations/${fileName}`,
    path: filePath,
    count: manifest.nodes.length,
  };
}

function getLifecycleStatus(input: {
  hasConvertedModel: boolean;
  hasAnnotationManifest: boolean;
  publishable: boolean;
}): ThreeDAssetLifecycleStatus {
  if (input.hasConvertedModel) {
    if (input.hasAnnotationManifest) {
      return input.publishable ? "PUBLISHED" : "ANNOTATED";
    }

    return "CONVERTED";
  }

  return "SOURCE_READY";
}

function getWorkflowStage(
  lifecycleStatus: ThreeDAssetLifecycleStatus,
): ThreeDWorkflowStage {
  switch (lifecycleStatus) {
    case "PUBLISHED":
      return "LIVE";
    case "ANNOTATED":
    case "CONVERTED":
      return "QA";
    case "SOURCE_READY":
    default:
      return "CONVERSION";
  }
}

export async function importThreeDAssetRegistry(rootPaths: string | string[]) {
  const normalizedRoots = normalizeRootPaths(rootPaths);
  const publicPreviewRoot = path.join(process.cwd(), "public", "imported-3d-previews");
  const publicModelsRoot = path.join(process.cwd(), "public", "models");
  const generatedRoot = path.join(process.cwd(), "generated");

  await mkdir(publicPreviewRoot, { recursive: true });
  await mkdir(publicModelsRoot, { recursive: true });
  await mkdir(generatedRoot, { recursive: true });

  const filesByRoot = await Promise.all(
    normalizedRoots.map(async (rootPath) => ({
      rootPath,
      files: await walkFiles(rootPath),
    })),
  );

  const grouped = new Map<string, AssetAccumulator>();

  for (const { rootPath, files } of filesByRoot) {
    for (const filePath of files) {
      const articleNormalized = extractArticleFromFilePath(filePath, rootPath);

      if (!articleNormalized) {
        continue;
      }

      const current =
        grouped.get(articleNormalized) ??
        {
          articleNormalized,
          productName: getPreferredName(filePath),
          sourceRoots: new Set<string>(),
          sourceDirectories: new Set<string>(),
          sourceMaxFiles: new Set<string>(),
          sourceDwgFiles: new Set<string>(),
          sourceConvertibleFiles: new Set<string>(),
          previewFiles: new Set<string>(),
          glbFiles: new Set<string>(),
        };

      current.sourceRoots.add(rootPath);
      current.sourceDirectories.add(path.dirname(filePath));
      const extension = getExtension(filePath);

      if (previewExtensions.has(extension)) {
        current.previewFiles.add(filePath);
      } else if (webModelExtensions.has(extension)) {
        current.glbFiles.add(filePath);
      } else if (convertibleModelExtensions.has(extension)) {
        current.sourceConvertibleFiles.add(filePath);
      } else if (maxExtensions.has(extension)) {
        current.sourceMaxFiles.add(filePath);
      } else if (dwgExtensions.has(extension)) {
        current.sourceDwgFiles.add(filePath);
      }

      grouped.set(articleNormalized, current);
    }
  }

  const records: ThreeDAssetRecord[] = [];

  for (const entry of grouped.values()) {
    const previewUrls = await copyPreviewFiles(
      entry.articleNormalized,
      Array.from(entry.previewFiles),
      publicPreviewRoot,
    );
    const primaryModelFile = pickPrimaryModelFile(
      Array.from(entry.glbFiles),
      Array.from(entry.sourceConvertibleFiles),
    );
    const copiedModelBundle = primaryModelFile
      ? await copyModelBundle(entry.articleNormalized, primaryModelFile, publicModelsRoot)
      : undefined;
    const glbUrl =
      primaryModelFile && getExtension(primaryModelFile) === ".glb"
        ? copiedModelBundle?.primaryUrl
        : undefined;
    const annotationManifest = getPredefinedThreeDAnnotationManifest(
      entry.articleNormalized,
      entry.productName,
      copiedModelBundle?.format,
    );
    const annotationArtifact = await writeAnnotationManifest(
      entry.articleNormalized,
      copiedModelBundle ? annotationManifest : undefined,
    );
    const lifecycleStatus = getLifecycleStatus({
      hasConvertedModel: Boolean(copiedModelBundle),
      hasAnnotationManifest: Boolean(annotationArtifact),
      publishable: publishedThreeDArticles.has(entry.articleNormalized),
    });

    records.push({
      articleNormalized: entry.articleNormalized,
      productName: entry.productName,
      sourceRoots: Array.from(entry.sourceRoots).sort((left, right) =>
        left.localeCompare(right, "ru"),
      ),
      sourceDirectories: Array.from(entry.sourceDirectories).sort((left, right) =>
        left.localeCompare(right, "ru"),
      ),
      sourceMaxFiles: Array.from(entry.sourceMaxFiles).sort((left, right) =>
        left.localeCompare(right, "ru"),
      ),
      sourceDwgFiles: Array.from(entry.sourceDwgFiles).sort((left, right) =>
        left.localeCompare(right, "ru"),
      ),
      sourceConvertibleFiles: Array.from(entry.sourceConvertibleFiles).sort(
        (left, right) => left.localeCompare(right, "ru"),
      ),
      previewUrls,
      glbUrl,
      webModelUrl: copiedModelBundle?.primaryUrl,
      glbStatus: copiedModelBundle ? "READY" : "PENDING_CONVERSION",
      webModelSourceFile: primaryModelFile,
      webModelFormat: copiedModelBundle?.format,
      webModelSupportingUrls: copiedModelBundle?.supportingUrls ?? [],
      materialUrl: copiedModelBundle?.materialUrl,
      lifecycleStatus,
      annotationStatus: annotationArtifact ? "READY" : "MISSING",
      publishStatus:
        lifecycleStatus === "PUBLISHED" ? "LIVE" : "INTERNAL",
      workflowStage: getWorkflowStage(lifecycleStatus),
      annotationManifestUrl: annotationArtifact?.url,
      annotationManifestPath: annotationArtifact?.path,
      annotationCount: annotationArtifact?.count ?? 0,
      qualityGate:
        lifecycleStatus === "PUBLISHED" ? "APPROVED" : "REVIEW_REQUIRED",
    });
  }

  const registry: ThreeDAssetRegistry = {
    generatedAt: new Date().toISOString(),
    roots: normalizedRoots,
    summary: {
      records: records.length,
      readyModels: records.filter((record) => record.glbStatus === "READY").length,
      pendingModels: records.filter((record) => record.glbStatus === "PENDING_CONVERSION").length,
      previewImages: records.reduce((total, record) => total + record.previewUrls.length, 0),
      dwgRecords: records.filter((record) => record.sourceDwgFiles.length > 0).length,
      convertibleRecords: records.filter(
        (record) => record.sourceConvertibleFiles.length > 0,
      ).length,
      sourceReady: records.filter((record) => record.lifecycleStatus === "SOURCE_READY").length,
      converted: records.filter((record) => record.lifecycleStatus === "CONVERTED").length,
      annotated: records.filter((record) => record.lifecycleStatus === "ANNOTATED").length,
      published: records.filter((record) => record.lifecycleStatus === "PUBLISHED").length,
      annotationManifests: records.filter((record) => record.annotationStatus === "READY").length,
    },
    records: records.sort((left, right) =>
      left.articleNormalized.localeCompare(right.articleNormalized, "ru"),
    ),
  };

  await writeFile(
    path.join(generatedRoot, "3d-asset-registry.json"),
    JSON.stringify(registry, null, 2),
    "utf8",
  );

  return registry;
}

export async function buildThreeDCoverageReport(
  products: GeneratedProduct[],
  registry: ThreeDAssetRegistry,
) {
  const byArticle = new Map(
    registry.records.map((record) => [record.articleNormalized, record] as const),
  );

  const matchedProducts = products.filter((product) =>
    byArticle.has(product.articleNormalized),
  );
  const readyProducts = matchedProducts.filter((product) =>
    byArticle.get(product.articleNormalized)?.glbStatus === "READY",
  );
  const pendingProducts = matchedProducts.filter((product) =>
    byArticle.get(product.articleNormalized)?.glbStatus === "PENDING_CONVERSION",
  );
  const productsWithDwg = matchedProducts.filter(
    (product) => (byArticle.get(product.articleNormalized)?.sourceDwgFiles.length ?? 0) > 0,
  );
  const productsWithConvertibleModels = matchedProducts.filter(
    (product) =>
      (byArticle.get(product.articleNormalized)?.sourceConvertibleFiles.length ?? 0) > 0,
  );
  const productsWithPreviews = matchedProducts.filter(
    (product) => (byArticle.get(product.articleNormalized)?.previewUrls.length ?? 0) > 0,
  );
  const sourceReadyProducts = matchedProducts.filter(
    (product) =>
      byArticle.get(product.articleNormalized)?.lifecycleStatus === "SOURCE_READY",
  );
  const convertedProducts = matchedProducts.filter(
    (product) =>
      byArticle.get(product.articleNormalized)?.lifecycleStatus === "CONVERTED",
  );
  const annotatedProducts = matchedProducts.filter(
    (product) =>
      byArticle.get(product.articleNormalized)?.lifecycleStatus === "ANNOTATED",
  );
  const publishedProducts = matchedProducts.filter(
    (product) =>
      byArticle.get(product.articleNormalized)?.lifecycleStatus === "PUBLISHED",
  );

  const report: ThreeDCoverageReport = {
    generatedAt: new Date().toISOString(),
    roots: registry.roots,
    summary: {
      totalProducts: products.length,
      matchedProducts: matchedProducts.length,
      readyProducts: readyProducts.length,
      pendingProducts: pendingProducts.length,
      unmatchedProducts: products.length - matchedProducts.length,
      productsWithDwg: productsWithDwg.length,
      productsWithConvertibleModels: productsWithConvertibleModels.length,
      productsWithPreviews: productsWithPreviews.length,
      sourceReadyProducts: sourceReadyProducts.length,
      convertedProducts: convertedProducts.length,
      annotatedProducts: annotatedProducts.length,
      publishedProducts: publishedProducts.length,
    },
    topReadyProducts: readyProducts.slice(0, 20).map((product) => {
      const record = byArticle.get(product.articleNormalized);
      return {
        article: product.article,
        name: product.name,
        categoryName: product.categoryName,
        modelUrl: record?.webModelUrl ?? record?.glbUrl,
        lifecycleStatus: record?.lifecycleStatus ?? "SOURCE_READY",
      };
    }),
    topPendingProducts: pendingProducts.slice(0, 40).map((product) => {
      const record = byArticle.get(product.articleNormalized);
      return {
        article: product.article,
        name: product.name,
        categoryName: product.categoryName,
        sourceDirectory: record?.sourceDirectories[0],
        maxFiles: record?.sourceMaxFiles.length ?? 0,
        dwgFiles: record?.sourceDwgFiles.length ?? 0,
        convertibleFiles: record?.sourceConvertibleFiles.length ?? 0,
        lifecycleStatus: record?.lifecycleStatus ?? "SOURCE_READY",
      };
    }),
  };

  await writeFile(
    path.join(process.cwd(), "generated", "3d-coverage-report.json"),
    JSON.stringify(report, null, 2),
    "utf8",
  );

  return report;
}

const categoryPriorityWeight: Record<string, number> = {
  "Игровые комплексы": 18,
  "Игровые элементы": 17,
  "Канатные комплексы": 16,
  "Оборудование для детских садов": 15,
  Воркаут: 12,
  "Гимнастические комплексы": 12,
  Тренажеры: 11,
  МАФ: 9,
  "Скейт парк": 8,
  Геопластика: 7,
};

function getCategoryPriorityScore(categoryName?: string) {
  if (!categoryName) {
    return 4;
  }

  return categoryPriorityWeight[categoryName] ?? 5;
}

function getQueueStage(record: ThreeDAssetRecord): ThreeDConversionQueueItem["stage"] {
  if (record.sourceConvertibleFiles.length > 0) {
    return "CONVERTIBLE_TO_GLB";
  }

  if (record.sourceMaxFiles.length > 0) {
    return "MAX_TO_GLB";
  }

  if (record.sourceDwgFiles.length > 0) {
    return "DWG_ASSISTED_MODELING";
  }

  return "PREVIEW_ONLY_REVIEW";
}

function getRecommendedAction(
  stage: ThreeDConversionQueueItem["stage"],
  record: ThreeDAssetRecord,
) {
  if (stage === "CONVERTIBLE_TO_GLB") {
    return `Конвертировать ${path.extname(record.sourceConvertibleFiles[0] ?? "").replace(".", "").toUpperCase() || "3D source"} в GLB и привязать к карточке.`;
  }

  if (stage === "MAX_TO_GLB") {
    return "Открыть исходник в 3ds Max, проверить текстуры и экспортировать web-версию в GLB.";
  }

  if (stage === "DWG_ASSISTED_MODELING") {
    return "Использовать DWG как инженерный референс и собрать web-модель или proxy GLB.";
  }

  return "Проверить превью, подтвердить соответствие артикула и решить, нужна ли ручная 3D-модель.";
}

function buildQueueScore(
  product: GeneratedProduct,
  record: ThreeDAssetRecord,
  matchedCountByCategory: Map<string, number>,
) {
  const categoryScore = getCategoryPriorityScore(product.categoryName);
  const formatScore =
    record.sourceConvertibleFiles.length > 0
      ? 62
      : record.sourceMaxFiles.length > 0
        ? 42
        : record.sourceDwgFiles.length > 0
          ? 24
          : 10;
  const previewScore = Math.min(record.previewUrls.length, 6) * 2;
  const dwgSupportScore = Math.min(record.sourceDwgFiles.length, 4) * 1.5;
  const maxSupportScore = Math.min(record.sourceMaxFiles.length, 3) * 2;
  const matchedDensityScore = Math.min(matchedCountByCategory.get(product.categoryName ?? "") ?? 0, 40) / 4;
  const priceScore = product.basePriceRub
    ? Math.min(product.basePriceRub / 400_000, 8)
    : 0;

  return Math.round(
    categoryScore +
      formatScore +
      previewScore +
      dwgSupportScore +
      maxSupportScore +
      matchedDensityScore +
      priceScore,
  );
}

export async function buildThreeDConversionQueue(
  products: GeneratedProduct[],
  registry: ThreeDAssetRegistry,
  limit = 30,
) {
  const byArticle = new Map(
    registry.records.map((record) => [record.articleNormalized, record] as const),
  );
  const matchedProducts = products
    .map((product) => ({
      product,
      record: byArticle.get(product.articleNormalized),
    }))
    .filter(
      (
        entry,
      ): entry is {
        product: GeneratedProduct;
        record: ThreeDAssetRecord;
      } => Boolean(entry.record),
    )
    .filter((entry) => entry.record.glbStatus !== "READY");

  const matchedCountByCategory = matchedProducts.reduce((acc, entry) => {
    const key = entry.product.categoryName ?? "Без категории";
    acc.set(key, (acc.get(key) ?? 0) + 1);
    return acc;
  }, new Map<string, number>());

  const items = matchedProducts
    .map(({ product, record }) => {
      const stage = getQueueStage(record);
      const score = buildQueueScore(product, record, matchedCountByCategory);

      return {
        priorityTier: "P3",
        stage,
        score,
        article: product.article,
        articleNormalized: product.articleNormalized,
        name: product.name,
        categoryName: product.categoryName,
        priceRub: product.basePriceRub,
        previewImages: record.previewUrls.length,
        maxFiles: record.sourceMaxFiles.length,
        dwgFiles: record.sourceDwgFiles.length,
        convertibleFiles: record.sourceConvertibleFiles.length,
        recommendedAction: getRecommendedAction(stage, record),
        sourceDirectory: record.sourceDirectories[0],
        sourceDirectories: record.sourceDirectories,
        sourceConvertibleFiles: record.sourceConvertibleFiles,
        sourceMaxFiles: record.sourceMaxFiles,
        sourceDwgFiles: record.sourceDwgFiles,
      } satisfies ThreeDConversionQueueItem;
    })
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      if ((right.priceRub ?? 0) !== (left.priceRub ?? 0)) {
        return (right.priceRub ?? 0) - (left.priceRub ?? 0);
      }

      return left.article.localeCompare(right.article, "ru");
    })
    .slice(0, limit)
    .map((item, index) => ({
      ...item,
      priorityTier:
        index < 10
          ? ("P1" as const)
          : index < 20
            ? ("P2" as const)
            : ("P3" as const),
    }));

  const queue: ThreeDConversionQueue = {
    generatedAt: new Date().toISOString(),
    roots: registry.roots,
    summary: {
      totalQueueItems: items.length,
      p1: items.filter((item) => item.priorityTier === "P1").length,
      p2: items.filter((item) => item.priorityTier === "P2").length,
      p3: items.filter((item) => item.priorityTier === "P3").length,
    },
    items,
  };

  await writeFile(
    path.join(process.cwd(), "generated", "3d-conversion-queue.json"),
    JSON.stringify(queue, null, 2),
    "utf8",
  );

  const markdown = [
    "# 3D Conversion Queue",
    "",
    `Generated: ${queue.generatedAt}`,
    "",
    `Roots: ${queue.roots.join(" | ")}`,
    "",
    `Summary: total=${queue.summary.totalQueueItems}, P1=${queue.summary.p1}, P2=${queue.summary.p2}, P3=${queue.summary.p3}`,
    "",
    "| Priority | Stage | Article | Category | Previews | MAX | DWG | Convertible | Price |",
    "| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: |",
    ...queue.items.map((item) => {
      const priceLabel =
        item.priceRub !== undefined ? item.priceRub.toFixed(2) : "";
      return `| ${item.priorityTier} | ${item.stage} | ${item.article} | ${item.categoryName ?? ""} | ${item.previewImages} | ${item.maxFiles} | ${item.dwgFiles} | ${item.convertibleFiles} | ${priceLabel} |`;
    }),
    "",
  ].join("\n");

  await writeFile(
    path.join(process.cwd(), "generated", "3d-conversion-queue.md"),
    markdown,
    "utf8",
  );

  return queue;
}

function buildWorkflowAction(
  record: ThreeDAssetRecord,
  queueItem?: ThreeDConversionQueueItem,
) {
  if (record.lifecycleStatus === "PUBLISHED") {
    return "Модель уже опубликована в карточке товара и готова к использованию в сцене и КП.";
  }

  if (record.lifecycleStatus === "ANNOTATED") {
    return "Провести QA модели и подтвердить публикацию в каталоговом контуре.";
  }

  if (record.lifecycleStatus === "CONVERTED") {
    return "Подготовить annotation manifest, проверить materials/hotspots и передать модель на QA.";
  }

  return (
    queueItem?.recommendedAction ??
    "Подготовить web-ready модель и перевести позицию в стадию converted."
  );
}

function buildWorkflowItem(
  product: GeneratedProduct,
  record: ThreeDAssetRecord,
  queueItem?: ThreeDConversionQueueItem,
): ThreeDProductionWorkflowItem {
  return {
    article: product.article,
    articleNormalized: product.articleNormalized,
    name: product.name,
    categoryName: product.categoryName,
    lifecycleStatus: record.lifecycleStatus,
    workflowStage: record.workflowStage,
    publishStatus: record.publishStatus,
    annotationStatus: record.annotationStatus,
    qualityGate: record.qualityGate,
    modelFormat: record.webModelFormat,
    modelUrl: record.webModelUrl ?? record.glbUrl,
    annotationManifestUrl: record.annotationManifestUrl,
    annotationCount: record.annotationCount,
    previewImages: record.previewUrls.length,
    sourceFiles:
      record.sourceMaxFiles.length +
      record.sourceConvertibleFiles.length +
      record.sourceDwgFiles.length,
    sourceDirectory: record.sourceDirectories[0],
    queueStage: queueItem?.stage,
    nextAction: buildWorkflowAction(record, queueItem),
  };
}

export async function buildThreeDProductionWorkflow(
  products: GeneratedProduct[],
  registry: ThreeDAssetRegistry,
  queue?: ThreeDConversionQueue,
) {
  const byArticle = new Map(
    registry.records.map((record) => [record.articleNormalized, record] as const),
  );
  const queueByArticle = new Map(
    (queue?.items ?? []).map((item) => [item.articleNormalized, item] as const),
  );

  const trackedProducts: Array<{
    product: GeneratedProduct;
    record: ThreeDAssetRecord;
    queueItem?: ThreeDConversionQueueItem;
  }> = [];

  for (const product of products) {
    const record = byArticle.get(product.articleNormalized);

    if (!record) {
      continue;
    }

    trackedProducts.push({
      product,
      record,
      queueItem: queueByArticle.get(product.articleNormalized),
    });
  }

  const liveItems = trackedProducts
    .filter((entry) => entry.record.lifecycleStatus === "PUBLISHED")
    .map((entry) => buildWorkflowItem(entry.product, entry.record, entry.queueItem));
  const qaItems = trackedProducts
    .filter((entry) => entry.record.workflowStage === "QA")
    .map((entry) => buildWorkflowItem(entry.product, entry.record, entry.queueItem));
  const annotationItems = trackedProducts
    .filter((entry) => entry.record.lifecycleStatus === "CONVERTED")
    .map((entry) => buildWorkflowItem(entry.product, entry.record, entry.queueItem));
  const conversionItems = trackedProducts
    .filter((entry) => entry.record.lifecycleStatus === "SOURCE_READY")
    .sort((left, right) => (right.queueItem?.score ?? 0) - (left.queueItem?.score ?? 0))
    .map((entry) => buildWorkflowItem(entry.product, entry.record, entry.queueItem));

  const firstWave = [
    ...liveItems.slice(0, 4),
    ...qaItems.slice(0, 4),
    ...annotationItems.slice(0, 4),
    ...conversionItems.slice(0, 8),
  ]
    .filter(
      (item, index, collection) =>
        collection.findIndex((candidate) => candidate.articleNormalized === item.articleNormalized) === index,
    )
    .slice(0, 16);

  const workflow: ThreeDProductionWorkflow = {
    generatedAt: new Date().toISOString(),
    roots: registry.roots,
    summary: {
      trackedProducts: trackedProducts.length,
      sourceReady: trackedProducts.filter((entry) => entry.record.lifecycleStatus === "SOURCE_READY").length,
      converted: trackedProducts.filter((entry) => entry.record.lifecycleStatus === "CONVERTED").length,
      annotated: trackedProducts.filter((entry) => entry.record.lifecycleStatus === "ANNOTATED").length,
      published: trackedProducts.filter((entry) => entry.record.lifecycleStatus === "PUBLISHED").length,
      qaBacklog: qaItems.length,
      annotationBacklog: annotationItems.length,
      conversionBacklog: conversionItems.length,
    },
    liveItems,
    qaItems,
    annotationItems,
    conversionItems,
    firstWave,
  };

  await writeFile(
    path.join(process.cwd(), "generated", "3d-production-workflow.json"),
    JSON.stringify(workflow, null, 2),
    "utf8",
  );

  const markdown = [
    "# 3D Production Workflow",
    "",
    `Generated: ${workflow.generatedAt}`,
    "",
    `Tracked products: ${workflow.summary.trackedProducts}`,
    `Published: ${workflow.summary.published}`,
    `Annotated: ${workflow.summary.annotated}`,
    `Converted: ${workflow.summary.converted}`,
    `Source ready: ${workflow.summary.sourceReady}`,
    "",
    "## First wave",
    "",
    "| Article | Lifecycle | Stage | Format | Next action |",
    "| --- | --- | --- | --- | --- |",
    ...workflow.firstWave.map((item) => {
      return `| ${item.article} | ${item.lifecycleStatus} | ${item.workflowStage} | ${item.modelFormat ?? "—"} | ${item.nextAction} |`;
    }),
    "",
  ].join("\n");

  await writeFile(
    path.join(process.cwd(), "generated", "3d-production-workflow.md"),
    markdown,
    "utf8",
  );

  return workflow;
}
