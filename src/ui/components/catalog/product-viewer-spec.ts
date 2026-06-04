import { GeneratedProduct } from "@/import/catalog/types";
import { cleanDisplayText } from "@/shared/utils/display-text";

type BoxGeometrySpec = {
  type: "box";
  args: [number, number, number];
};

type CylinderGeometrySpec = {
  type: "cylinder";
  args: [number, number, number, number?];
};

export type ViewerSceneKind =
  | "PLAYGROUND"
  | "SWING"
  | "WORKOUT"
  | "PARK"
  | "PAVILION"
  | "SANDBOX"
  | "BENCH"
  | "BASKETBALL"
  | "ROPE_COMPLEX"
  | "SLIDE_GDAP01";

export type RealModelFormat = "GLB" | "OBJ" | "FBX" | "3DS" | "DAE";

export type ViewerPart = {
  id: string;
  label: string;
  material: string;
  purpose?: string;
  finish: string;
  description: string;
  color: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  annotationPosition: [number, number, number];
  imageAnchor: [number, number];
  geometry: BoxGeometrySpec | CylinderGeometrySpec;
  modelMatchers?: {
    materialNames?: string[];
    objectNamePrefixes?: string[];
    objectNameIncludes?: string[];
  };
};

export type ProductViewerSpec = {
  sceneKind: ViewerSceneKind;
  title: string;
  subtitle: string;
  hasRealModel: boolean;
  modelUrl?: string;
  modelFormat?: RealModelFormat;
  materialUrl?: string;
  defaultPartId?: string;
  cameraPosition?: [number, number, number];
  cameraTarget?: [number, number, number];
  modelScale?: number;
  parts: ViewerPart[];
};

const ENGINEERING_TITLE = "Интерактивная 3D-модель";

function inferModelFormat(url?: string): RealModelFormat | undefined {
  const source = url?.toLowerCase();

  if (!source) {
    return undefined;
  }

  if (source.endsWith(".glb") || source.endsWith(".gltf")) {
    return "GLB";
  }

  if (source.endsWith(".obj")) {
    return "OBJ";
  }

  if (source.endsWith(".fbx")) {
    return "FBX";
  }

  if (source.endsWith(".3ds")) {
    return "3DS";
  }

  if (source.endsWith(".dae")) {
    return "DAE";
  }

  return undefined;
}

function isRenderableModelFormat(format?: RealModelFormat) {
  return format === "GLB" || format === "OBJ" || format === "FBX" || format === "DAE";
}

function pickMaterial(product: GeneratedProduct, keywords: string[], fallback: string) {
  const matched = product.materials.find((material) =>
    keywords.some((keyword) =>
      cleanDisplayText(material).toLowerCase().includes(cleanDisplayText(keyword).toLowerCase()),
    ),
  );

  return matched ?? product.materials[0] ?? fallback;
}

function colorByMaterial(material: string) {
  const source = cleanDisplayText(material).toLowerCase();

  if (source.includes("нержав")) {
    return "#9aa7b2";
  }

  if (source.includes("металл") || source.includes("сталь")) {
    return "#5f6975";
  }

  if (
    source.includes("дерев") ||
    source.includes("робини") ||
    source.includes("сосн") ||
    source.includes("листвен") ||
    source.includes("брус")
  ) {
    return "#c99259";
  }

  if (source.includes("hpl") || source.includes("hdpe") || source.includes("пласт")) {
    return "#8fb355";
  }

  if (source.includes("канат")) {
    return "#d36f2c";
  }

  return "#7b8794";
}

function includesAny(source: string, keywords: string[]) {
  return keywords.some((keyword) => source.includes(keyword));
}

function buildPlaygroundSpec(product: GeneratedProduct): ProductViewerSpec {
  const frameMaterial = pickMaterial(product, ["металл", "стойк", "столб"], "Металлические стойки");
  const panelMaterial = pickMaterial(product, ["hpl", "hdpe", "пласт"], "HPL-панели");
  const slideMaterial = pickMaterial(product, ["нержав", "металл"], "Нержавеющая сталь");
  const supportColor = colorByMaterial(frameMaterial);
  const panelColor = colorByMaterial(panelMaterial);
  const slideColor = colorByMaterial(slideMaterial);

  return {
    sceneKind: "PLAYGROUND",
    title: ENGINEERING_TITLE,
    subtitle:
      "Вращайте сцену и кликайте по узлам. Модель собрана как 3D proxy товара и готова к замене на реальный GLB-файл без смены интерфейса.",
    hasRealModel: false,
    parts: [
      {
        id: "supports",
        label: "Опорная рама",
        material: frameMaterial,
        finish: "Порошковая окраска и уличная антикоррозионная защита",
        description: "Несущий каркас комплекса, рассчитанный на постоянную наружную эксплуатацию.",
        color: supportColor,
        position: [-1.2, 0.9, -1.1],
        annotationPosition: [-1.2, 2.2, -1.1],
        imageAnchor: [28, 66],
        geometry: { type: "cylinder", args: [0.12, 0.12, 2.2, 24] },
      },
      {
        id: "platform",
        label: "Платформа",
        material: panelMaterial,
        finish: "Износостойкая поверхность и безопасная рабочая зона",
        description: "Основная игровая площадка, на которой собирается ключевой сценарий использования.",
        color: "#d9b07a",
        position: [0, 1.05, 0],
        annotationPosition: [0, 2.1, 0],
        imageAnchor: [48, 58],
        geometry: { type: "box", args: [2.1, 0.16, 2.1] },
      },
      {
        id: "roof",
        label: "Кровля",
        material: panelMaterial,
        finish: "Влагостойкая панель с декоративной функцией",
        description: "Верхний элемент, который формирует узнаваемый силуэт комплекса и защищает игровую зону.",
        color: panelColor,
        position: [0, 2.35, 0],
        rotation: [0.08, 0.25, 0],
        annotationPosition: [0, 3.1, 0],
        imageAnchor: [50, 24],
        geometry: { type: "box", args: [2.4, 0.14, 2.4] },
      },
      {
        id: "slide",
        label: "Скат горки",
        material: slideMaterial,
        finish: "Полированная рабочая поверхность",
        description: "Спусковой элемент с самым заметным визуальным акцентом в составе изделия.",
        color: slideColor,
        position: [1.8, 0.65, 0.12],
        rotation: [0, 0, -0.56],
        annotationPosition: [2.35, 1.85, 0.2],
        imageAnchor: [73, 70],
        geometry: { type: "box", args: [2.8, 0.2, 0.78] },
      },
      {
        id: "ladder",
        label: "Подъемный марш",
        material: frameMaterial,
        finish: "Антискользящее исполнение ступеней",
        description: "Зона входа на платформу и одна из главных пользовательских точек контакта.",
        color: supportColor,
        position: [-1.65, 0.56, 0.75],
        rotation: [0, 0, 0.82],
        annotationPosition: [-2.2, 1.7, 0.95],
        imageAnchor: [26, 73],
        geometry: { type: "box", args: [1.65, 0.14, 0.72] },
      },
      {
        id: "guard-panel",
        label: "Защитная панель",
        material: panelMaterial,
        finish: "Декоративно-защитное исполнение",
        description: "Щит безопасности, который одновременно усиливает характер и образ изделия.",
        color: panelColor,
        position: [0, 1.45, -1.12],
        annotationPosition: [0, 2.3, -1.45],
        imageAnchor: [58, 43],
        geometry: { type: "box", args: [2.1, 0.84, 0.08] },
      },
    ],
  };
}

function buildSwingSpec(product: GeneratedProduct): ProductViewerSpec {
  const frameMaterial = pickMaterial(product, ["дерев", "металл", "стойк", "столб"], "Опорная рама");
  const seatMaterial = pickMaterial(product, ["канат", "hdpe", "пласт", "резин"], "Сиденье");
  const frameColor = colorByMaterial(frameMaterial);
  const seatColor = colorByMaterial(seatMaterial);

  return {
    sceneKind: "SWING",
    title: ENGINEERING_TITLE,
    subtitle:
      "Вращайте сцену, приближайте и кликайте по узлам. Это параметрическая 3D-модель семейства качелей с активными материалами и аннотациями.",
    hasRealModel: false,
    parts: [
      {
        id: "left-support",
        label: "Левая опора",
        material: frameMaterial,
        finish: "Уличное защитное покрытие",
        description: "Несущая стойка качелей с расчетом на длительную динамическую нагрузку.",
        color: frameColor,
        position: [-1.35, 0.9, 0],
        rotation: [0, 0, 0.2],
        annotationPosition: [-1.8, 2.2, 0],
        imageAnchor: [26, 44],
        geometry: { type: "cylinder", args: [0.11, 0.11, 2.2, 24] },
      },
      {
        id: "right-support",
        label: "Правая опора",
        material: frameMaterial,
        finish: "Уличное защитное покрытие",
        description: "Вторая опора рамы, которая формирует жесткость всей системы.",
        color: frameColor,
        position: [1.35, 0.9, 0],
        rotation: [0, 0, -0.2],
        annotationPosition: [1.8, 2.2, 0],
        imageAnchor: [74, 44],
        geometry: { type: "cylinder", args: [0.11, 0.11, 2.2, 24] },
      },
      {
        id: "beam",
        label: "Верхняя балка",
        material: frameMaterial,
        finish: "Силовой несущий элемент",
        description: "Главная балка подвеса, на которой держится рабочая зона качания.",
        color: frameColor,
        position: [0, 1.95, 0],
        annotationPosition: [0, 2.55, 0],
        imageAnchor: [50, 24],
        geometry: { type: "box", args: [3.2, 0.16, 0.2] },
      },
      {
        id: "suspension",
        label: "Подвес",
        material: "Стальной подвес",
        finish: "Оцинковка или нержавеющий крепеж",
        description: "Связующий узел между несущей балкой и сиденьем.",
        color: "#8d98a5",
        position: [0, 1.15, 0],
        annotationPosition: [0.5, 1.9, 0],
        imageAnchor: [50, 48],
        geometry: { type: "box", args: [0.08, 1.3, 0.08] },
      },
      {
        id: "seat",
        label: "Сиденье",
        material: seatMaterial,
        finish: "Износостойкий рабочий слой",
        description: "Контактная часть изделия, выбранная под конкретный сценарий эксплуатации.",
        color: seatColor,
        position: [0, 0.3, 0],
        annotationPosition: [0, 0.95, 0.3],
        imageAnchor: [50, 74],
        geometry: { type: "box", args: [1.35, 0.12, 0.55] },
      },
    ],
  };
}

function buildWorkoutSpec(product: GeneratedProduct): ProductViewerSpec {
  const frameMaterial = pickMaterial(product, ["металл", "стойк", "столб"], "Металлический каркас");
  const gripMaterial = pickMaterial(product, ["нержав", "металл"], "Стальные перекладины");
  const frameColor = colorByMaterial(frameMaterial);
  const gripColor = colorByMaterial(gripMaterial);

  return {
    sceneKind: "WORKOUT",
    title: ENGINEERING_TITLE,
    subtitle:
      "Полноценная 3D-сцена workout-модуля: можно вращать, приближать и выбирать отдельные несущие и рабочие элементы.",
    hasRealModel: false,
    parts: [
      {
        id: "front-post",
        label: "Передняя стойка",
        material: frameMaterial,
        finish: "Порошковая окраска для уличной эксплуатации",
        description: "Одна из главных несущих стоек тренировочного контура.",
        color: frameColor,
        position: [-1.3, 1.05, 0],
        annotationPosition: [-1.9, 2.35, 0],
        imageAnchor: [26, 38],
        geometry: { type: "cylinder", args: [0.1, 0.1, 2.4, 24] },
      },
      {
        id: "rear-post",
        label: "Задняя стойка",
        material: frameMaterial,
        finish: "Порошковая окраска для уличной эксплуатации",
        description: "Вторая точка опоры, отвечающая за стабильность всей системы.",
        color: frameColor,
        position: [1.3, 1.05, 0],
        annotationPosition: [1.9, 2.35, 0],
        imageAnchor: [74, 38],
        geometry: { type: "cylinder", args: [0.1, 0.1, 2.4, 24] },
      },
      {
        id: "pullup-bar",
        label: "Турник",
        material: gripMaterial,
        finish: "Рабочая шлифованная поверхность",
        description: "Главная зона хвата и тренировочного контакта пользователя.",
        color: gripColor,
        position: [0, 1.95, 0],
        annotationPosition: [0, 2.55, 0],
        imageAnchor: [50, 24],
        geometry: { type: "box", args: [2.9, 0.12, 0.12] },
      },
      {
        id: "parallel-bars",
        label: "Брусья",
        material: gripMaterial,
        finish: "Шлифованная рабочая поверхность",
        description: "Дополнительный тренировочный контур для силовых и функциональных упражнений.",
        color: gripColor,
        position: [0, 1.15, -0.75],
        annotationPosition: [0, 1.85, -1.1],
        imageAnchor: [46, 58],
        geometry: { type: "box", args: [2.2, 0.12, 0.12] },
      },
      {
        id: "cross-link",
        label: "Связевая балка",
        material: frameMaterial,
        finish: "Силовой связующий элемент",
        description: "Узел пространственной жесткости, который удерживает геометрию каркаса.",
        color: frameColor,
        position: [0, 0.75, 0.65],
        annotationPosition: [0, 1.35, 1.05],
        imageAnchor: [57, 67],
        geometry: { type: "box", args: [2.5, 0.12, 0.12] },
      },
    ],
  };
}

function buildParkSpec(product: GeneratedProduct): ProductViewerSpec {
  const supportMaterial = pickMaterial(product, ["металл", "дерев"], "Опорный контур");
  const surfaceMaterial = pickMaterial(product, ["дерев", "hpl", "композит"], "Декоративный элемент");

  return {
    sceneKind: "PARK",
    title: ENGINEERING_TITLE,
    subtitle:
      "Параметрическая 3D-модель малой архитектурной формы. Вращайте объект и выбирайте опорные, декоративные и акцентные элементы.",
    hasRealModel: false,
    parts: [
      {
        id: "base",
        label: "Основание",
        material: supportMaterial,
        finish: "Антикоррозионная защита для наружной эксплуатации",
        description: "Опорная база изделия, которая отвечает за устойчивость и долговечность.",
        color: colorByMaterial(supportMaterial),
        position: [0, -0.15, 0],
        annotationPosition: [0, 0.45, 0],
        imageAnchor: [50, 78],
        geometry: { type: "box", args: [3.2, 0.24, 2.1] },
      },
      {
        id: "body",
        label: "Основной объем",
        material: surfaceMaterial,
        finish: "Декоративное или защитное покрытие",
        description: "Главная объемная часть изделия, которая формирует его образ и посадку в среде.",
        color: colorByMaterial(surfaceMaterial),
        position: [0, 1.1, 0],
        annotationPosition: [0, 2.2, 0],
        imageAnchor: [48, 46],
        geometry: { type: "box", args: [2.2, 2.0, 1.4] },
      },
      {
        id: "accent",
        label: "Акцентный элемент",
        material: surfaceMaterial,
        finish: "Окраска, ламинация или декоративная панель",
        description: "Фронтальная часть с максимальной визуальной заметностью и характером бренда.",
        color: "#f26622",
        position: [0.8, 1.45, 0.82],
        rotation: [0.25, 0.5, 0],
        annotationPosition: [1.5, 2.35, 1.15],
        imageAnchor: [68, 34],
        geometry: { type: "box", args: [0.9, 1.1, 0.2] },
      },
    ],
  };
}

function buildPavilionSpec(product: GeneratedProduct): ProductViewerSpec {
  const frameMaterial = pickMaterial(product, ["металл", "дерев", "брус"], "Несущие стойки");
  const roofMaterial = pickMaterial(product, ["hpl", "дерев", "профлист", "металл"], "Кровельный контур");
  const frameColor = colorByMaterial(frameMaterial);
  const roofColor = colorByMaterial(roofMaterial);

  return {
    sceneKind: "PAVILION",
    title: ENGINEERING_TITLE,
    subtitle:
      "Интерактивная 3D-визуализация беседки: стойки, настил, кровля и декоративные панели вынесены в отдельные кликабельные узлы.",
    hasRealModel: false,
    defaultPartId: "pavilion-frame",
    cameraPosition: [6.4, 4.4, 6.8],
    cameraTarget: [0, 1.25, 0],
    parts: [
      {
        id: "pavilion-frame",
        label: "Несущий каркас",
        material: frameMaterial,
        finish: "Уличная защита и стойкое покрытие опор",
        description: "Главный силовой контур беседки: стойки и верхняя обвязка, удерживающие геометрию павильона.",
        color: frameColor,
        position: [0, 1.15, 0],
        annotationPosition: [-1.2, 2.15, 1.05],
        imageAnchor: [28, 42],
        geometry: { type: "cylinder", args: [0.11, 0.11, 2.3, 18] },
      },
      {
        id: "pavilion-roof",
        label: "Кровля",
        material: roofMaterial,
        finish: "Влагостойкий верхний контур",
        description: "Крыша формирует силуэт изделия и защищает внутреннюю зону от солнца и осадков.",
        color: roofColor,
        position: [0, 2.55, 0],
        annotationPosition: [0.3, 3.05, 0],
        imageAnchor: [52, 18],
        geometry: { type: "box", args: [3.1, 0.2, 2.5] },
      },
      {
        id: "pavilion-deck",
        label: "Настил",
        material: pickMaterial(product, ["дерев", "дпк", "композит"], "Настил"),
        finish: "Рабочая поверхность для эксплуатации",
        description: "Нижняя площадка, задающая посадку беседки на участке и сценарий использования.",
        color: "#b98551",
        position: [0, 0.08, 0],
        annotationPosition: [0, 0.55, 0.85],
        imageAnchor: [50, 78],
        geometry: { type: "box", args: [2.8, 0.16, 2.15] },
      },
      {
        id: "pavilion-panels",
        label: "Декоративные панели",
        material: roofMaterial,
        finish: "Защитно-декоративное исполнение",
        description: "Боковые панели создают закрытость, визуальный ритм и защищают внутреннюю зону.",
        color: "#d7b17a",
        position: [0, 1.18, -1.04],
        annotationPosition: [1.1, 1.65, -1.3],
        imageAnchor: [70, 52],
        geometry: { type: "box", args: [2.4, 0.72, 0.08] },
      },
    ],
  };
}

function buildSandboxSpec(product: GeneratedProduct): ProductViewerSpec {
  const boardMaterial = pickMaterial(product, ["дерев", "брус", "hpl"], "Борт песочницы");
  const boardColor = colorByMaterial(boardMaterial);

  return {
    sceneKind: "SANDBOX",
    title: ENGINEERING_TITLE,
    subtitle:
      "Интерактивная 3D-визуализация песочного игрового элемента: борта, сиденья, игровая зона и навес показываются как отдельные узлы.",
    hasRealModel: false,
    defaultPartId: "sandbox-board",
    cameraPosition: [5.5, 3.8, 6.2],
    cameraTarget: [0, 0.7, 0],
    parts: [
      {
        id: "sandbox-board",
        label: "Борт песочницы",
        material: boardMaterial,
        finish: "Безопасная обработка кромок",
        description: "Периметр удерживает песочную зону и формирует безопасный контур для детей.",
        color: boardColor,
        position: [0, 0.35, 0],
        annotationPosition: [-1.4, 0.82, 1.05],
        imageAnchor: [28, 62],
        geometry: { type: "box", args: [3.0, 0.32, 0.18] },
      },
      {
        id: "sandbox-seat",
        label: "Сиденье",
        material: boardMaterial,
        finish: "Износостойкая рабочая поверхность",
        description: "Посадочная зона по периметру, удобная для игры и сопровождения ребенка.",
        color: "#d6a66d",
        position: [0, 0.52, 1.05],
        annotationPosition: [0.5, 0.9, 1.45],
        imageAnchor: [58, 58],
        geometry: { type: "box", args: [2.65, 0.12, 0.38] },
      },
      {
        id: "sandbox-fill",
        label: "Игровая зона",
        material: "Песочное наполнение",
        finish: "Открытая развивающая зона",
        description: "Основная игровая поверхность для сенсорных и сюжетных сценариев.",
        color: "#e4c28a",
        position: [0, 0.22, 0],
        annotationPosition: [0, 0.65, 0],
        imageAnchor: [50, 68],
        geometry: { type: "box", args: [2.35, 0.12, 1.75] },
      },
      {
        id: "sandbox-canopy",
        label: "Навес",
        material: pickMaterial(product, ["hpl", "тент", "пласт"], "Защитная панель"),
        finish: "Теневая защита игровой зоны",
        description: "Верхний элемент снижает перегрев и делает объект комфортнее на открытом участке.",
        color: "#8fb355",
        position: [0, 2.1, 0],
        annotationPosition: [0.7, 2.55, 0.2],
        imageAnchor: [66, 22],
        geometry: { type: "box", args: [2.8, 0.12, 1.8] },
      },
    ],
  };
}

function buildBenchSpec(product: GeneratedProduct): ProductViewerSpec {
  const frameMaterial = pickMaterial(product, ["металл", "сталь"], "Металлический каркас");
  const slatMaterial = pickMaterial(product, ["дерев", "брус", "композит"], "Деревянные ламели");

  return {
    sceneKind: "BENCH",
    title: ENGINEERING_TITLE,
    subtitle:
      "Интерактивная 3D-визуализация скамейки: опоры, сиденье, спинка и крепежная зона доступны для выбора.",
    hasRealModel: false,
    defaultPartId: "bench-seat",
    cameraPosition: [5.8, 3.2, 5.4],
    cameraTarget: [0, 0.75, 0],
    parts: [
      {
        id: "bench-frame",
        label: "Опорный каркас",
        material: frameMaterial,
        finish: "Порошковая окраска для улицы",
        description: "Металлические боковины и опоры принимают основную нагрузку и задают жесткость.",
        color: colorByMaterial(frameMaterial),
        position: [0, 0.42, 0],
        annotationPosition: [-1.25, 0.95, 0.6],
        imageAnchor: [28, 68],
        geometry: { type: "box", args: [0.16, 0.82, 1.0] },
      },
      {
        id: "bench-seat",
        label: "Сиденье",
        material: slatMaterial,
        finish: "Шлифованная контактная поверхность",
        description: "Основная посадочная зона, собранная из ламелей или композитной поверхности.",
        color: colorByMaterial(slatMaterial),
        position: [0, 0.74, 0.12],
        annotationPosition: [0.25, 1.15, 0.75],
        imageAnchor: [54, 54],
        geometry: { type: "box", args: [2.9, 0.12, 0.72] },
      },
      {
        id: "bench-back",
        label: "Спинка",
        material: slatMaterial,
        finish: "Декоративно-защитная обработка",
        description: "Вертикальная поддержка делает изделие комфортным для длительного использования.",
        color: "#c99259",
        position: [0, 1.22, -0.34],
        annotationPosition: [0.85, 1.65, -0.65],
        imageAnchor: [68, 32],
        geometry: { type: "box", args: [2.9, 0.82, 0.12] },
      },
      {
        id: "bench-mount",
        label: "Крепеж",
        material: frameMaterial,
        finish: "Анкерное или стационарное крепление",
        description: "Нижние точки крепления фиксируют изделие на покрытии или бетонном основании.",
        color: "#5f6975",
        position: [0, 0.04, 0],
        annotationPosition: [1.15, 0.42, 0.55],
        imageAnchor: [72, 82],
        geometry: { type: "box", args: [2.4, 0.08, 0.7] },
      },
    ],
  };
}

function buildBasketballSpec(product: GeneratedProduct): ProductViewerSpec {
  const frameMaterial = pickMaterial(product, ["металл", "сталь"], "Металлическая стойка");
  const shieldMaterial = pickMaterial(product, ["фанера", "hpl", "щит"], "Баскетбольный щит");

  return {
    sceneKind: "BASKETBALL",
    title: ENGINEERING_TITLE,
    subtitle:
      "Интерактивная 3D-визуализация баскетбольного элемента: стойка, вынос, щит и кольцо разделены по материалам.",
    hasRealModel: false,
    defaultPartId: "basket-shield",
    cameraPosition: [5.2, 3.8, 6.0],
    cameraTarget: [0, 1.65, 0],
    parts: [
      {
        id: "basket-post",
        label: "Стойка",
        material: frameMaterial,
        finish: "Антикоррозионная защита",
        description: "Несущая вертикальная опора баскетбольного элемента.",
        color: colorByMaterial(frameMaterial),
        position: [-1.0, 1.25, 0],
        annotationPosition: [-1.35, 2.0, 0.25],
        imageAnchor: [30, 48],
        geometry: { type: "cylinder", args: [0.12, 0.12, 2.5, 20] },
      },
      {
        id: "basket-arm",
        label: "Вынос",
        material: frameMaterial,
        finish: "Силовая металлическая связь",
        description: "Горизонтальная балка переносит щит вперед от стойки и держит рабочую плоскость.",
        color: "#5f6975",
        position: [-0.25, 2.35, 0],
        annotationPosition: [0.05, 2.75, 0.25],
        imageAnchor: [50, 26],
        geometry: { type: "box", args: [1.55, 0.14, 0.14] },
      },
      {
        id: "basket-shield",
        label: "Щит",
        material: shieldMaterial,
        finish: "Ударостойкая лицевая поверхность",
        description: "Плоскость щита определяет игровой сценарий и визуально читается с расстояния.",
        color: "#f3f0e9",
        position: [0.68, 2.26, 0],
        annotationPosition: [1.05, 2.72, 0.15],
        imageAnchor: [70, 30],
        geometry: { type: "box", args: [1.05, 0.82, 0.08] },
      },
      {
        id: "basket-ring",
        label: "Кольцо",
        material: "Окрашенный металл",
        finish: "Рабочая игровая зона",
        description: "Кольцо и крепежная зона щита, которые принимают основную игровую нагрузку.",
        color: "#f26622",
        position: [1.04, 1.9, 0.24],
        annotationPosition: [1.5, 2.08, 0.65],
        imageAnchor: [78, 48],
        geometry: { type: "cylinder", args: [0.28, 0.28, 0.04, 28] },
      },
    ],
  };
}

function buildRopeComplexSpec(product: GeneratedProduct): ProductViewerSpec {
  const postMaterial = pickMaterial(product, ["металл", "дерев", "столб"], "Опорные стойки");
  const ropeMaterial = pickMaterial(product, ["канат", "верев"], "Армированный канат");

  return {
    sceneKind: "ROPE_COMPLEX",
    title: ENGINEERING_TITLE,
    subtitle:
      "Интерактивная 3D-визуализация канатного комплекса: опоры, сетка, переход и крепежные узлы показываются отдельно.",
    hasRealModel: false,
    defaultPartId: "rope-net",
    cameraPosition: [6.2, 4.0, 6.4],
    cameraTarget: [0, 1.25, 0],
    parts: [
      {
        id: "rope-posts",
        label: "Опорные стойки",
        material: postMaterial,
        finish: "Уличная защита несущих элементов",
        description: "Вертикальные опоры удерживают канатную геометрию и воспринимают нагрузку.",
        color: colorByMaterial(postMaterial),
        position: [0, 1.15, 0],
        annotationPosition: [-1.55, 2.05, 0.8],
        imageAnchor: [24, 38],
        geometry: { type: "cylinder", args: [0.1, 0.1, 2.3, 18] },
      },
      {
        id: "rope-net",
        label: "Канатная сетка",
        material: ropeMaterial,
        finish: "Армированный канат с устойчивостью к улице",
        description: "Основной развивающий элемент для лазания, баланса и координации.",
        color: colorByMaterial(ropeMaterial),
        position: [0, 1.1, 0],
        annotationPosition: [0.1, 1.78, 0.95],
        imageAnchor: [52, 45],
        geometry: { type: "box", args: [2.4, 1.25, 0.08] },
      },
      {
        id: "rope-bridge",
        label: "Переход",
        material: ropeMaterial,
        finish: "Гибкая рабочая линия",
        description: "Горизонтальный участок связывает игровые точки и усложняет сценарий движения.",
        color: "#d36f2c",
        position: [0, 0.72, 0.86],
        annotationPosition: [0.9, 1.15, 1.2],
        imageAnchor: [68, 62],
        geometry: { type: "box", args: [2.2, 0.1, 0.52] },
      },
      {
        id: "rope-fittings",
        label: "Крепежные узлы",
        material: "Металлический крепеж",
        finish: "Скрытая или открытая фиксация каната",
        description: "Точки крепления передают нагрузку с канатов на несущий каркас.",
        color: "#7b8794",
        position: [1.25, 1.55, 0],
        annotationPosition: [1.7, 1.95, 0.25],
        imageAnchor: [78, 38],
        geometry: { type: "box", args: [0.18, 0.42, 0.18] },
      },
    ],
  };
}

function buildSkateBankSpec(product: GeneratedProduct): ProductViewerSpec {
  return {
    sceneKind: "PARK",
    title: "Интерактивная 3D-модель bank with stairs",
    subtitle:
      "Крутите модель и кликайте прямо по 3D-объекту: справа покажем, где находится катальная поверхность и где идут металлические кромки и рейлы.",
    hasRealModel: false,
    defaultPartId: "ride-surface",
    cameraPosition: [6.1, 4.1, 7.2],
    cameraTarget: [0, 1.1, 1.4],
    parts: [
      {
        id: "ride-surface",
        label: "Катальная поверхность и ступени",
        material: "Износостойкое покрытие riding surface",
        purpose: "Основная рабочая зона для катания, разгона и захода на элемент.",
        finish: "Рабочая поверхность для катания и захода на элемент",
        description:
          "Основной объем элемента: bank-плоскость, ступени и боковые панели. Именно эта часть формирует сценарий катания и визуальный силуэт изделия.",
        color: "#2d6cdf",
        position: [0, 0.9, 1.5],
        annotationPosition: [0.25, 2.1, 1.9],
        imageAnchor: [46, 50],
        geometry: { type: "box", args: [3.2, 1.4, 2.4] },
        modelMatchers: {
          materialNames: ["Материал"],
        },
      },
      {
        id: "metal-coping",
        label: "Металлические кромки и рейлы",
        material: "Окрашенный или оцинкованный металл",
        purpose: "Контактная металлическая арматура для скольжения, защиты кромок и усиления узла.",
        finish: "Усиленные грани для скольжения и защиты кромок",
        description:
          "Металлические трубы, рейлы и кромки, которые принимают контакт при скольжении, защищают рабочие ребра и усиливают износостойкость узла.",
        color: "#5f6975",
        position: [0, 1.25, 1.55],
        annotationPosition: [1.9, 2.7, 2.2],
        imageAnchor: [74, 28],
        geometry: { type: "box", args: [3.4, 0.18, 2.6] },
        modelMatchers: {
          materialNames: ["Material_#44"],
          objectNamePrefixes: ["Circle", "Line", "Rectangle", "NGon"],
        },
      },
    ],
  };
}

function buildGdap01SlideSpec(product: GeneratedProduct): ProductViewerSpec {
  const steelMaterial = pickMaterial(
    product,
    ["нержав", "сталь", "металл"],
    "Нержавеющая сталь",
  );
  const woodMaterial = pickMaterial(product, ["дерев", "брус"], "Дерево");
  const steelColor = colorByMaterial(steelMaterial);
  const woodColor = colorByMaterial(woodMaterial);

  return {
    sceneKind: "SLIDE_GDAP01",
    title: "Интерактивная 3D-модель ГД.АП01",
    subtitle:
      "Для этой позиции собрана отдельная 3D-сцена по референсному фото: крутите модель, приближайте и кликайте по ключевым узлам.",
    hasRealModel: false,
    defaultPartId: "slide-surface",
    cameraPosition: [5.8, 3.8, 7.8],
    cameraTarget: [0.4, 1.1, 0.4],
    parts: [
      {
        id: "support-posts",
        label: "Опорные стойки",
        material: steelMaterial,
        finish: "Полированная нержавеющая сталь",
        description:
          "Основные вертикальные стойки, которые держат стартовую площадку и входную зону горки.",
        color: steelColor,
        position: [-1.15, 1.25, 0.15],
        annotationPosition: [-1.55, 2.55, 0.4],
        imageAnchor: [20, 28],
        geometry: { type: "cylinder", args: [0.11, 0.11, 2.45, 20] },
      },
      {
        id: "platform-deck",
        label: "Подиум",
        material: woodMaterial,
        finish: "Деревянный настил для уличной эксплуатации",
        description: "Стартовая площадка, с которой начинается спуск.",
        color: woodColor,
        position: [-1.7, 0.6, -0.25],
        annotationPosition: [-2.1, 1.1, -0.35],
        imageAnchor: [10, 48],
        geometry: { type: "box", args: [1.65, 0.16, 1.05] },
      },
      {
        id: "slide-surface",
        label: "Скат горки",
        material: steelMaterial,
        finish: "Формованный полированный скат",
        description:
          "Главная рабочая поверхность спуска с плавным переходом в выкатную часть.",
        color: "#c7cdd3",
        position: [1.25, 0.9, 0.38],
        annotationPosition: [2.45, 1.7, 0.9],
        imageAnchor: [63, 58],
        geometry: { type: "box", args: [3.6, 0.16, 0.78] },
      },
      {
        id: "side-panels",
        label: "Боковые щиты",
        material: steelMaterial,
        finish: "Нержавеющая сталь с защитной геометрией",
        description:
          "Боковые борта удерживают траекторию спуска и формируют узнаваемый силуэт изделия.",
        color: "#aeb6be",
        position: [0.05, 1.45, 0.2],
        annotationPosition: [0.65, 2.45, 0.7],
        imageAnchor: [42, 32],
        geometry: { type: "box", args: [1.1, 1.0, 0.08] },
      },
      {
        id: "handrail",
        label: "Поручень входа",
        material: steelMaterial,
        finish: "Гнутый нержавеющий поручень",
        description: "Верхний поручень для безопасного входа на стартовую площадку.",
        color: steelColor,
        position: [-0.45, 2.35, 0.25],
        annotationPosition: [-0.35, 3.05, 0.55],
        imageAnchor: [38, 14],
        geometry: { type: "cylinder", args: [0.05, 0.05, 0.9, 12] },
      },
      {
        id: "exit-support",
        label: "Опора выкатной части",
        material: steelMaterial,
        finish: "Нержавеющая трубчатая опора",
        description: "Передние ножки, поддерживающие выходную полку горки.",
        color: steelColor,
        position: [3.1, -0.05, 0.35],
        annotationPosition: [3.35, 0.7, 0.7],
        imageAnchor: [84, 86],
        geometry: { type: "cylinder", args: [0.045, 0.045, 0.55, 12] },
      },
    ],
  };
}

function withSkateBankPresentationCopy(spec: ProductViewerSpec): ProductViewerSpec {
  return {
    ...spec,
    cameraPosition: [5.55, 3.85, 6.25],
    cameraTarget: [0.72, 0.86, 1.05],
    modelScale: 3.65,
    title: "Интерактивная 3D-модель bank with stairs",
    subtitle:
      "Крутите модель и кликайте по узлам: покажем рабочую поверхность, ступени и металлические кромки изделия.",
    parts: spec.parts.map((part) => {
      if (part.id === "ride-surface") {
        return {
          ...part,
          label: "Катальная поверхность и ступени",
          material: "Износостойкое покрытие riding surface",
          annotationPosition: [-1.05, 0.34, 1.05],
          purpose: "Основная рабочая зона для катания, разгона и захода на элемент.",
          finish: "Рабочая поверхность для катания и захода на элемент",
          description:
            "Основной объем элемента: bank-плоскость, ступени и боковые панели. Эта часть формирует сценарий катания и визуальный силуэт изделия.",
          modelMatchers: {
            ...part.modelMatchers,
            materialNames: ["Материал"],
          },
        };
      }

      if (part.id === "metal-coping") {
        return {
          ...part,
          label: "Металлические кромки и рейлы",
          material: "Окрашенный или оцинкованный металл",
          annotationPosition: [1.1, 1.6, 1.6],
          purpose:
            "Контактная металлическая арматура для скольжения, защиты кромок и усиления узла.",
          finish: "Усиленные грани для скольжения и защиты кромок",
          description:
            "Металлические трубы, рейлы и кромки принимают контакт при скольжении, защищают рабочие ребра и усиливают износостойкость узла.",
        };
      }

      return part;
    }),
  };
}

export function buildProductViewerSpec(product: GeneratedProduct): ProductViewerSpec {
  const modelAsset = product.assets.find((asset) => asset.kind === "MODEL_3D");
  const modelUrl = modelAsset?.url;
  const metadataFormat =
    typeof modelAsset?.metadata?.format === "string"
      ? modelAsset.metadata.format.toUpperCase()
      : undefined;
  const modelFormat =
    metadataFormat === "GLB" ||
    metadataFormat === "OBJ" ||
    metadataFormat === "FBX" ||
    metadataFormat === "3DS" ||
    metadataFormat === "DAE"
      ? metadataFormat
      : inferModelFormat(modelUrl);
  const materialUrl =
    typeof modelAsset?.metadata?.materialUrl === "string"
      ? modelAsset.metadata.materialUrl
      : undefined;
  const hasRenderableModel = Boolean(modelAsset && isRenderableModelFormat(modelFormat));
  const categoryText = cleanDisplayText(
    `${product.categoryName ?? ""} ${product.subcategoryLabel ?? ""} ${product.classLabel ?? ""}`,
  ).toLowerCase();
  const productText = cleanDisplayText(
    `${product.name ?? ""} ${product.article ?? ""} ${product.slug ?? ""} ${product.categoryName ?? ""} ${
      product.subcategoryLabel ?? ""
    } ${product.classLabel ?? ""}`,
  ).toLowerCase();
  const isSkateBank =
    product.slug === "skpo021-skpo021-oborudovanie-dlya-skeyt-parka-bank-with-stairs" ||
    product.articleNormalized === "СКП.О.021";

  if (
    product.slug === "gdap01-gdap01-gorka-na-sklon-s-podiumom-900-mm" ||
    product.articleNormalized === "ГД.АП01"
  ) {
    return {
      ...buildGdap01SlideSpec(product),
      hasRealModel: hasRenderableModel,
      modelUrl: hasRenderableModel ? modelUrl : undefined,
      modelFormat,
      materialUrl,
    };
  }

  if (isSkateBank) {
    return {
      ...withSkateBankPresentationCopy(buildSkateBankSpec(product)),
      hasRealModel: hasRenderableModel,
      modelUrl: hasRenderableModel ? modelUrl : undefined,
      modelFormat,
      materialUrl,
    };
  }

  const baseSpec =
    includesAny(productText, ["песоч", "sandbox"])
      ? buildSandboxSpec(product)
      : includesAny(productText, ["скамей", "скамья", "bench"])
        ? buildBenchSpec(product)
        : includesAny(productText, ["бесед", "пергол", "pavilion", "pagoda", "altanka", "berso"])
          ? buildPavilionSpec(product)
          : includesAny(productText, ["баскет", "basket"])
            ? buildBasketballSpec(product)
            : includesAny(productText, ["канат", "rope"])
              ? buildRopeComplexSpec(product)
              : categoryText.includes("качел")
      ? buildSwingSpec(product)
      : categoryText.includes("воркаут") ||
          categoryText.includes("гимнаст") ||
          categoryText.includes("тренаж") ||
          categoryText.includes("спорт")
        ? buildWorkoutSpec(product)
        : categoryText.includes("маф") ||
            categoryText.includes("декор") ||
            categoryText.includes("скам") ||
            categoryText.includes("урн") ||
            categoryText.includes("пергол") ||
            categoryText.includes("бесед")
          ? buildParkSpec(product)
          : buildPlaygroundSpec(product);

  return {
    ...baseSpec,
    hasRealModel: hasRenderableModel,
    modelUrl: hasRenderableModel ? modelUrl : undefined,
    modelFormat,
    materialUrl,
  };
}
