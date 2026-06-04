export type ThreeDAnnotationManifestNodeMatcher = {
  materialNames?: string[];
  objectNamePrefixes?: string[];
  objectNameIncludes?: string[];
};

export type ThreeDAnnotationManifestNode = {
  id: string;
  label: string;
  material: string;
  purpose: string;
  color: string;
  matchers?: ThreeDAnnotationManifestNodeMatcher;
};

export type ThreeDAnnotationManifest = {
  articleNormalized: string;
  title: string;
  version: number;
  modelFormat?: string;
  notes?: string;
  defaultPartId?: string;
  nodes: ThreeDAnnotationManifestNode[];
};

type PredefinedManifestDefinition = Omit<
  ThreeDAnnotationManifest,
  "articleNormalized" | "title" | "modelFormat"
>;

const predefinedManifests = new Map<string, PredefinedManifestDefinition>([
  [
    "СКП.О.021",
    {
      version: 1,
      defaultPartId: "ride-surface",
      notes:
        "Публикационный manifest для реальной OBJ-модели скейт-элемента. Узлы готовы к интерактивному выбору материала в viewer.",
      nodes: [
        {
          id: "ride-surface",
          label: "Катальная поверхность",
          material: "Ламинированная фанера / композитная катальная плоскость",
          purpose: "Основная зона катания и разгона в составе элемента.",
          color: "#4b8df8",
          matchers: {
            materialNames: ["blue", "ride", "surface"],
            objectNameIncludes: ["surface", "deck", "ramp"],
          },
        },
        {
          id: "rails",
          label: "Рейлы и кромки",
          material: "Окрашенная сталь",
          purpose: "Силовой каркас, ребра жесткости и скользящие металлические элементы.",
          color: "#2f3339",
          matchers: {
            materialNames: ["black", "metal", "steel"],
            objectNameIncludes: ["rail", "edge", "frame", "metal"],
          },
        },
      ],
    },
  ],
  [
    "ЭКО.ГК006",
    {
      version: 1,
      defaultPartId: "bars",
      notes:
        "Черновой manifest для 3DS-модели. Требует QA перед публикацией, но уже описывает основные узлы изделия.",
      nodes: [
        {
          id: "posts",
          label: "Опорные стойки",
          material: "Деревянные стойки",
          purpose: "Несущий каркас комплекса и базовая опорная геометрия.",
          color: "#b07a48",
          matchers: {
            objectNameIncludes: ["post", "wood", "support"],
          },
        },
        {
          id: "bars",
          label: "Перекладины",
          material: "Нержавеющая сталь",
          purpose: "Рабочая зона подтягивания и базовых упражнений.",
          color: "#9ea8b3",
          matchers: {
            materialNames: ["metal", "steel"],
            objectNameIncludes: ["bar", "pipe", "cross"],
          },
        },
      ],
    },
  ],
]);

export const publishedThreeDArticles = new Set<string>(["СКП.О.021"]);

export function getPredefinedThreeDAnnotationManifest(
  articleNormalized: string,
  productName: string,
  modelFormat?: string,
) {
  const definition = predefinedManifests.get(articleNormalized);

  if (!definition) {
    return undefined;
  }

  return {
    articleNormalized,
    title: productName,
    modelFormat,
    ...definition,
  } satisfies ThreeDAnnotationManifest;
}
