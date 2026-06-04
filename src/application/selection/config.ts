import {
  ExclusionTag,
  MaterialPreferenceTag,
  ObjectType,
  SelectionScoreWeights,
  UsageContextTag,
} from "@/application/selection/types";

export const objectTypeLabels: Record<ObjectType, string> = {
  playground: "Игровая площадка",
  school_sport: "Школьный спорт / воркаут",
  kindergarten: "Детский сад",
  park: "Парк / общественное пространство",
};

export const selectionSegmentLabels = {
  ECONOMY: "Эконом",
  OPTIMUM: "Оптимум",
  PREMIUM: "Премиум",
} as const;

export const objectTypeCategoryMap: Record<ObjectType, string[]> = {
  playground: [
    "Игровые комплексы",
    "Игровые элементы",
    "Канатные комплексы",
    "Батуты",
    "Оборудование для детских садов",
  ],
  school_sport: [
    "Гимнастические комплексы",
    "Воркаут",
    "Спортивные элементы",
    "Тренажеры",
    "Скейт парк",
  ],
  kindergarten: [
    "Оборудование для детских садов",
    "Игровые комплексы",
    "Игровые элементы",
  ],
  park: [
    "МАФ",
    "Декор",
    "Тренировка собак",
    "Уличное освещение",
    "Геопластика",
  ],
};

export const usageContextLabels: Record<UsageContextTag, string> = {
  dacha: "для дачи",
  private_house: "частный дом",
  cottage: "коттедж",
  private_family: "частное использование",
  municipal: "муниципальный объект",
  residential_courtyard: "двор ЖК",
  kindergarten: "детский сад",
  school: "школа / спорт",
  park_public: "парк / общественное пространство",
};

export const materialPreferenceLabels: Record<MaterialPreferenceTag, string> = {
  eco: "эко-материалы",
  wood: "дерево",
  natural: "натуральные материалы",
  hdpe: "HDPE",
  hpl: "HPL",
  metal: "металл",
  antivandal: "антивандальное исполнение",
};

export const exclusionLabels: Record<ExclusionTag, string> = {
  sandbox: "без песочницы",
  swing: "без качелей",
  metal: "без металла",
  bright_colors: "без ярких цветов",
  rope: "без канатных элементов",
  high_slide: "без высоких горок",
  complex_climb: "без сложных лазалок",
};

export const defaultSelectionScoreWeights: SelectionScoreWeights = {
  objectType: 28,
  sizeFit: 24,
  age: 16,
  material: 14,
  usage: 12,
  budget: 6,
  growth: 8,
  confidence: 4,
  diversityPenalty: 7,
};

export function getSelectionTargetCount(areaM2?: number) {
  if (!areaM2 || Number.isNaN(areaM2)) {
    return 4;
  }

  if (areaM2 <= 24) {
    return 3;
  }

  if (areaM2 <= 48) {
    return 4;
  }

  if (areaM2 <= 90) {
    return 5;
  }

  if (areaM2 <= 160) {
    return 6;
  }

  return 8;
}
