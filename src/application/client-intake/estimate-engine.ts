import { buildCatalogBenchmarkEstimate } from "@/application/client-intake/catalog-benchmark";
import {
  ClientObjectType,
  ClientRequestEstimate,
  ClientRequestModelBrief,
  ClientRequestSubmission,
  clientObjectTypeLabels,
} from "@/application/client-intake/types";
import { GeneratedProduct } from "@/import/catalog/types";

const objectTypeConfig: Record<
  ClientObjectType,
  {
    baseRub: number;
    areaRub: number;
    deliveryShare: number;
    installationShare: number;
    sceneKind: string;
    materials: string[];
    hotspots: Array<{
      id: string;
      label: string;
      material: string;
      comment: string;
    }>;
  }
> = {
  PLAYGROUND_COMPLEX: {
    baseRub: 420_000,
    areaRub: 68_000,
    deliveryShare: 0.06,
    installationShare: 0.12,
    sceneKind: "PLAYGROUND",
    materials: [
      "Стальной каркас с порошковой окраской",
      "HDPE или влагостойкие панели",
      "Нержавеющие скаты и крепеж",
    ],
    hotspots: [
      {
        id: "support-frame",
        label: "Несущий каркас",
        material: "Металлические стойки",
        comment:
          "Основная силовая часть, от которой зависят общий бюджет, долговечность и класс исполнения.",
      },
      {
        id: "activity-zone",
        label: "Игровые элементы",
        material: "Комбинация металла, канатов и полимерных деталей",
        comment:
          "Зона, где чаще всего нужна точная деталировка по фото и уточняющим размерам.",
      },
      {
        id: "panels",
        label: "Панели и ограждения",
        material: "HDPE / фанера / композит",
        comment:
          "Влияют на сегмент исполнения, цветовую схему и итоговую стоимость проекта.",
      },
    ],
  },
  SLIDE: {
    baseRub: 240_000,
    areaRub: 42_000,
    deliveryShare: 0.05,
    installationShare: 0.11,
    sceneKind: "SLIDE_GDAP01",
    materials: ["Металлические опоры", "Нержавеющий скат", "Настил и боковые панели"],
    hotspots: [
      {
        id: "slide-surface",
        label: "Скат",
        material: "Нержавеющая сталь",
        comment:
          "Ключевой элемент для оценки трудоемкости, обработки поверхности и класса исполнения.",
      },
      {
        id: "platform-deck",
        label: "Подиум",
        material: "Настил из влагостойких материалов",
        comment: "Отдельно учитываются высота подиума и тип опорной рамы.",
      },
      {
        id: "support-posts",
        label: "Опоры",
        material: "Стальные столбы",
        comment: "По фото уточняются шаг опор и способ крепления к основанию.",
      },
    ],
  },
  SWING: {
    baseRub: 190_000,
    areaRub: 36_000,
    deliveryShare: 0.05,
    installationShare: 0.1,
    sceneKind: "SWING",
    materials: [
      "Металлическая рама",
      "Подвесы и узлы качания",
      "Сиденья и защитные элементы",
    ],
    hotspots: [
      {
        id: "top-beam",
        label: "Верхняя балка",
        material: "Сталь",
        comment: "Определяет несущую схему и класс нагрузки.",
      },
      {
        id: "suspension",
        label: "Подвесы",
        material: "Цепи или армированные подвесы",
        comment: "Здесь чаще всего меняются материалы и типы сидений.",
      },
      {
        id: "seat",
        label: "Сиденье",
        material: "Резина / пластик / комбинированное исполнение",
        comment: "Влияет на возрастную группу и спецификацию.",
      },
    ],
  },
  WORKOUT: {
    baseRub: 310_000,
    areaRub: 48_000,
    deliveryShare: 0.05,
    installationShare: 0.11,
    sceneKind: "WORKOUT",
    materials: [
      "Стальные трубы",
      "Антикоррозионное покрытие",
      "Крепеж и закладные узлы",
    ],
    hotspots: [
      {
        id: "frame",
        label: "Силовая рама",
        material: "Стальные трубы",
        comment: "Формирует конфигурацию станции и несущую способность.",
      },
      {
        id: "bars",
        label: "Турники и перекладины",
        material: "Сталь с износостойкой окраской",
        comment: "Оцениваются по числу уровней и длине рабочих зон.",
      },
      {
        id: "anchors",
        label: "Узлы крепления",
        material: "Закладные и крепеж",
        comment: "Влияют на монтаж и общую смету.",
      },
    ],
  },
  PARK_EQUIPMENT: {
    baseRub: 160_000,
    areaRub: 24_000,
    deliveryShare: 0.04,
    installationShare: 0.08,
    sceneKind: "PARK",
    materials: [
      "Металл с порошковой окраской",
      "Дерево / композит",
      "Крепеж и анкерные элементы",
    ],
    hotspots: [
      {
        id: "main-body",
        label: "Основной корпус",
        material: "Сталь / дерево / композит",
        comment: "Определяет базовую себестоимость изделия и сегмент исполнения.",
      },
      {
        id: "decor",
        label: "Декоративные элементы",
        material: "Панели и отделка",
        comment: "Здесь чаще всего появляются кастомные требования клиента.",
      },
      {
        id: "mounting",
        label: "Монтажный узел",
        material: "Анкера и опорные пластины",
        comment: "Нужен для корректного расчета доставки и монтажа.",
      },
    ],
  },
  CUSTOM: {
    baseRub: 280_000,
    areaRub: 40_000,
    deliveryShare: 0.05,
    installationShare: 0.1,
    sceneKind: "PLAYGROUND",
    materials: [
      "Металлический каркас",
      "Комбинированные панели и накладки",
      "Индивидуальные узлы по проекту",
    ],
    hotspots: [
      {
        id: "frame",
        label: "Базовый каркас",
        material: "Сталь",
        comment: "Сначала собираем силовую схему, затем уточняем декоративные элементы.",
      },
      {
        id: "custom-node",
        label: "Кастомный узел",
        material: "По фото и уточняющим размерам",
        comment: "Точка, где позже подключится AI/инженерный моделинг.",
      },
      {
        id: "finish",
        label: "Финишное исполнение",
        material: "Покраска, панели, отделка",
        comment: "Влияет на сегмент, срок и финальную цену.",
      },
    ],
  },
};

const segmentMultiplier = {
  ECONOMY: 0.86,
  OPTIMUM: 1,
  PREMIUM: 1.27,
} as const;

function roundRub(value: number, step: number) {
  return Math.max(step, Math.round(value / step) * step);
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function getArea(input: ClientRequestSubmission) {
  if (input.lengthM && input.widthM) {
    return Number((input.lengthM * input.widthM).toFixed(2));
  }

  return undefined;
}

function getComplexityBoost(input: ClientRequestSubmission) {
  const notes = (input.notes ?? "").toLowerCase();
  let boost = 1;

  [
    { pattern: /канат|верев/, amount: 0.12 },
    { pattern: /домик|башн|кровл/, amount: 0.08 },
    { pattern: /нержав|inox/, amount: 0.06 },
    { pattern: /нестандарт|индивидуал|кастом/, amount: 0.14 },
    { pattern: /подсвет|led/, amount: 0.05 },
  ].forEach((rule) => {
    if (rule.pattern.test(notes)) {
      boost += rule.amount;
    }
  });

  return boost;
}

function getBaseConfidence(input: ClientRequestSubmission, photoCount: number) {
  let confidence = 0.42;

  confidence += Math.min(photoCount, 5) * 0.08;
  confidence += input.widthM && input.lengthM ? 0.14 : 0;
  confidence += input.heightM ? 0.05 : 0;
  confidence += (input.notes?.trim().length ?? 0) > 40 ? 0.08 : 0;

  return Math.min(0.92, Number(confidence.toFixed(2)));
}

function buildHeuristicEquipmentRub(
  input: ClientRequestSubmission,
  resolvedObjectType: ClientObjectType,
) {
  const config = objectTypeConfig[resolvedObjectType];
  const refinedFromBroad =
    input.objectType === "PLAYGROUND_COMPLEX" &&
    (resolvedObjectType === "SLIDE" || resolvedObjectType === "SWING");
  const areaM2 = getArea(input);
  const areaMultiplier =
    refinedFromBroad
      ? areaM2
        ? Math.max(1, Math.min(areaM2 * 0.24, 4.5))
        : 1
      : resolvedObjectType === "SLIDE" || resolvedObjectType === "SWING"
      ? areaM2
        ? Math.max(1, Math.min(areaM2, 6))
        : 1
      : areaM2
        ? Math.max(1, areaM2)
        : 1.1;
  const heightMultiplier = input.heightM
    ? refinedFromBroad
      ? 1
      : 1 + Math.min(Math.max(input.heightM - 1.2, 0), 3.8) * 0.09
    : 1;
  const complexityBoost = getComplexityBoost(input);
  const segmentFactor = segmentMultiplier[input.segment];

  return roundRub(
    (config.baseRub + config.areaRub * areaMultiplier) *
      segmentFactor *
      heightMultiplier *
      complexityBoost,
    5_000,
  );
}

function buildEstimateNotes(params: {
  input: ClientRequestSubmission;
  photoCount: number;
  areaM2?: number;
  method: ClientRequestEstimate["method"];
  benchmarkSourceCount: number;
  benchmarkCoverage: number;
  benchmarkArticles: string[];
  resolvedObjectType: ClientObjectType;
  targetBudgetRub?: number;
}) {
  const {
    input,
    photoCount,
    areaM2,
    method,
    benchmarkSourceCount,
    benchmarkCoverage,
    benchmarkArticles,
    resolvedObjectType,
    targetBudgetRub,
  } = params;
  const segmentLabel =
    input.segment === "ECONOMY"
      ? "Эконом"
      : input.segment === "OPTIMUM"
        ? "Оптимум"
        : "Премиум";

  const notes = [
    method === "HEURISTIC"
      ? `Черновой расчет собран по ${photoCount} фото и параметрам заявки, пока без опоры на каталожные benchmark-позиции.`
      : `Черновой расчет собран по ${photoCount} фото, параметрам заявки и каталожным benchmark-позициям Smart Presale.`,
    `Сегмент исполнения принят как «${segmentLabel}».`,
    areaM2
      ? `Для оценки использована ориентировочная площадь ${areaM2} м² и тип объекта «${clientObjectTypeLabels[input.objectType]}».`
      : `Размеры неполные, поэтому оценка опирается на тип объекта «${clientObjectTypeLabels[input.objectType]}» и визуальную сложность.`,
  ];

  if (resolvedObjectType !== input.objectType) {
    notes.push(`Система уточнила сценарий объекта до «${clientObjectTypeLabels[resolvedObjectType]}».`);
  }

  if (benchmarkSourceCount > 0) {
    notes.push(
      `В расчет вошло ${benchmarkSourceCount} каталожных аналогов, покрытие benchmark-слоя ${Math.round(benchmarkCoverage * 100)}%.`,
    );

    if (benchmarkArticles.length > 0) {
      notes.push(`Опорные артикула: ${benchmarkArticles.slice(0, 3).join(", ")}.`);
    }
  }

  notes.push(
    "Финальный material-cost engine по матрице материалов будет подключен следующим слоем и уточнит вилку по себестоимости.",
  );

  if (targetBudgetRub) {
    notes.push(
      `Бюджетный ориентир клиента зафиксирован на уровне ${new Intl.NumberFormat("ru-RU").format(targetBudgetRub)} ₽.`,
    );
  }

  return notes;
}

function buildConfidence(
  baseConfidence: number,
  method: ClientRequestEstimate["method"],
  benchmarkConfidence: number,
  benchmarkSourceCount: number,
) {
  if (method === "HEURISTIC") {
    return baseConfidence;
  }

  const lift =
    (method === "CATALOG_BENCHMARK" ? 0.16 : 0.11) +
    Math.min(0.08, benchmarkSourceCount * 0.02) +
    benchmarkConfidence * 0.06;

  return Math.min(0.95, Number((baseConfidence + lift).toFixed(2)));
}

function buildEstimateMethod(
  benchmarkSourceCount: number,
  benchmarkCoverage: number,
): ClientRequestEstimate["method"] {
  if (benchmarkSourceCount >= 4 && benchmarkCoverage >= 0.72) {
    return "CATALOG_BENCHMARK";
  }

  if (benchmarkSourceCount >= 2 && benchmarkCoverage >= 0.42) {
    return "HYBRID";
  }

  return "HEURISTIC";
}

function buildEquipmentRub(params: {
  heuristicEquipmentRub: number;
  benchmarkEquipmentRub?: number;
  method: ClientRequestEstimate["method"];
  resolvedObjectType: ClientObjectType;
  inputObjectType: ClientObjectType;
}) {
  const {
    heuristicEquipmentRub,
    benchmarkEquipmentRub,
    method,
    resolvedObjectType,
    inputObjectType,
  } = params;

  if (!benchmarkEquipmentRub || method === "HEURISTIC") {
    return heuristicEquipmentRub;
  }

  const objectTypeWasRefined = resolvedObjectType !== inputObjectType;
  const cappedHeuristicRub = Math.min(
    heuristicEquipmentRub,
    benchmarkEquipmentRub * (objectTypeWasRefined ? 1.3 : 1.55),
  );

  if (method === "CATALOG_BENCHMARK") {
    return roundRub(
      benchmarkEquipmentRub * (objectTypeWasRefined ? 0.95 : 0.88) +
        cappedHeuristicRub * (objectTypeWasRefined ? 0.05 : 0.12),
      5_000,
    );
  }

  return roundRub(
    benchmarkEquipmentRub * (objectTypeWasRefined ? 0.78 : 0.68) +
      cappedHeuristicRub * (objectTypeWasRefined ? 0.22 : 0.32),
    5_000,
  );
}

function buildEstimatedRange(params: {
  equipmentRub: number;
  deliveryRub: number;
  installationRub: number;
  method: ClientRequestEstimate["method"];
  benchmarkCoverage: number;
}) {
  const { equipmentRub, deliveryRub, installationRub, method, benchmarkCoverage } = params;

  const minFactor =
    method === "HEURISTIC" ? 0.9 : Math.max(0.9, 0.95 - benchmarkCoverage * 0.03);
  const maxFactor =
    method === "CATALOG_BENCHMARK"
      ? Math.max(1.08, 1.14 - benchmarkCoverage * 0.05)
      : method === "HYBRID"
        ? Math.max(1.11, 1.16 - benchmarkCoverage * 0.04)
        : 1.16;

  return {
    estimatedMinRub: roundRub(equipmentRub * minFactor + deliveryRub + installationRub, 1_000),
    estimatedMaxRub: roundRub(equipmentRub * maxFactor + deliveryRub + installationRub, 1_000),
  };
}

export function buildClientRequestEstimate(
  input: ClientRequestSubmission,
  photoCount: number,
  catalogProducts: GeneratedProduct[] = [],
  photoFileNames: string[] = [],
): ClientRequestEstimate {
  const rawBenchmark = buildCatalogBenchmarkEstimate(input, catalogProducts, {
    photoFileNames,
  });
  const resolvedObjectType = rawBenchmark?.resolvedObjectType ?? input.objectType;
  const config = objectTypeConfig[resolvedObjectType];
  const areaM2 = getArea(input);
  const heuristicEquipmentRub = buildHeuristicEquipmentRub(input, resolvedObjectType);
  const benchmark = rawBenchmark;
  const method = buildEstimateMethod(benchmark?.sourceCount ?? 0, benchmark?.coverage ?? 0);
  const equipmentRub = buildEquipmentRub({
    heuristicEquipmentRub,
    benchmarkEquipmentRub: benchmark?.equipmentRub,
    method,
    resolvedObjectType,
    inputObjectType: input.objectType,
  });
  const deliveryRub = input.needsDelivery
    ? roundRub(Math.max(25_000, equipmentRub * config.deliveryShare), 1_000)
    : 0;
  const installationRub = input.needsInstallation
    ? roundRub(Math.max(55_000, equipmentRub * config.installationShare), 1_000)
    : 0;
  const { estimatedMinRub, estimatedMaxRub } = buildEstimatedRange({
    equipmentRub,
    deliveryRub,
    installationRub,
    method,
    benchmarkCoverage: benchmark?.coverage ?? 0,
  });
  const confidence = buildConfidence(
    getBaseConfidence(input, photoCount),
    method,
    benchmark?.confidence ?? 0,
    benchmark?.sourceCount ?? 0,
  );
  const benchmarkArticles = benchmark?.benchmarkProducts.map((product) => product.article) ?? [];
  const notes = unique([
    ...buildEstimateNotes({
      input,
      photoCount,
      areaM2,
      method,
      benchmarkSourceCount: benchmark?.sourceCount ?? 0,
      benchmarkCoverage: benchmark?.coverage ?? 0,
      benchmarkArticles,
      resolvedObjectType,
      targetBudgetRub: input.targetBudgetRub,
    }),
    ...(benchmark?.notes ?? []),
  ]);

  if (input.targetBudgetRub) {
    const withinBudget = estimatedMinRub <= input.targetBudgetRub;
    notes.push(
      withinBudget
        ? `Заложенный бюджет ${new Intl.NumberFormat("ru-RU").format(input.targetBudgetRub)} ₽ выглядит достижимым на черновом уровне.`
        : `Заложенный бюджет ${new Intl.NumberFormat("ru-RU").format(input.targetBudgetRub)} ₽ ниже предварительной вилки и потребует оптимизации состава или материалов.`,
    );
  }

  return {
    method,
    resolvedObjectType,
    confidence,
    areaM2,
    equipmentRub,
    deliveryRub,
    installationRub,
    estimatedMinRub,
    estimatedMaxRub,
    notes,
    assumedMaterials:
      benchmark?.assumedMaterials.length ? benchmark.assumedMaterials : config.materials,
    breakdown: [
      {
        code: "equipment",
        label: "Оборудование",
        amountRub: equipmentRub,
        comment:
          method === "HEURISTIC"
            ? "Базовая оценка изделия по фото, типу объекта и предполагаемой сложности."
            : `Черновая оценка по фото и ${benchmark?.sourceCount ?? 0} релевантным позициям каталога Smart Presale.`,
      },
      {
        code: "delivery",
        label: "Доставка",
        amountRub: deliveryRub,
        comment: input.needsDelivery
          ? "Учтена отдельной строкой по ориентировочному коэффициенту logistics-ready оценки."
          : "Не включена в текущий запрос.",
      },
      {
        code: "installation",
        label: "Монтаж",
        amountRub: installationRub,
        comment: input.needsInstallation
          ? "Черновая ставка на монтаж, крепление и пусконаладочный контур."
          : "Не включен в текущий запрос.",
      },
    ],
    benchmarkSourceCount: benchmark?.sourceCount ?? 0,
    benchmarkCoverage: benchmark?.coverage ?? 0,
    benchmarkProducts: benchmark?.benchmarkProducts ?? [],
    waitingForMaterialMatrix: true,
  };
}

export function buildClientRequestModelBrief(
  input: ClientRequestSubmission,
  estimate: ClientRequestEstimate,
  photoCount: number,
): ClientRequestModelBrief {
  const resolvedObjectType = estimate.resolvedObjectType ?? input.objectType;
  const config = objectTypeConfig[resolvedObjectType];
  const dimensionsLabel = [input.lengthM, input.widthM, input.heightM]
    .filter((value) => typeof value === "number")
    .join(" x ");

  return {
    title: `3D-концепция: ${clientObjectTypeLabels[resolvedObjectType]}`,
    summary: [
      `Стартовая 3D-модель будет собрана как интерактивный proxy twin по ${photoCount} фото.`,
      dimensionsLabel
        ? `В базе уже зафиксированы размеры ${dimensionsLabel} м.`
        : "Размеры частично отсутствуют, поэтому геометрия пока будет предварительной.",
      estimate.method === "HEURISTIC"
        ? "Пока 3D-бриф собран от типа объекта и визуальных признаков."
        : `В бриф уже добавлены каталожные ориентиры: ${estimate.benchmarkProducts
            .slice(0, 2)
            .map((product) => product.article)
            .join(", ")}.`,
      "После получения матрицы себестоимости материалов и уточняющих размеров этот же контур можно перевести в более точную инженерную модель.",
    ].join(" "),
    sceneKind: config.sceneKind,
    interactionHint:
      "В viewer клиент сможет кликать по ключевым узлам и видеть материал, комментарий по исполнению и влияние на смету.",
    nextInputs: [
      "Фото объекта с 3-4 ракурсов",
      "Габариты или хотя бы один опорный размер",
      "Желаемые материалы / цветовая схема",
      "Комментарий по основанию и месту монтажа",
    ],
    hotspots: config.hotspots,
  };
}
