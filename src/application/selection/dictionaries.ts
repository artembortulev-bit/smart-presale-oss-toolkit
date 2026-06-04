import {
  ExclusionTag,
  MaterialPreferenceTag,
  ObjectType,
  UsageContextTag,
} from "@/application/selection/types";

type PhraseRule<TValue> = {
  value: TValue;
  phrases: string[];
};

export const objectTypeKeywordRules: PhraseRule<ObjectType>[] = [
  {
    value: "kindergarten",
    phrases: ["детский сад", "доу", "садик", "дошколь"],
  },
  {
    value: "school_sport",
    phrases: ["воркаут", "спортивн", "спорт", "школьн", "гимнастич", "тренажер"],
  },
  {
    value: "park",
    phrases: ["парк", "обществен", "благоустрой", "маф", "сквер"],
  },
  {
    value: "playground",
    phrases: ["детская площадка", "игровая площадка", "игровой комплекс", "площадка"],
  },
];

export const usageKeywordRules: PhraseRule<UsageContextTag>[] = [
  {
    value: "dacha",
    phrases: ["для дачи", "на дачу", "дачный участок", "дача"],
  },
  {
    value: "private_house",
    phrases: ["частный дом", "частного дома", "для дома", "для частного дома"],
  },
  {
    value: "cottage",
    phrases: ["коттедж", "коттеджа", "коттеджный"],
  },
  {
    value: "private_family",
    phrases: ["для семьи", "для детей дома", "семейный", "частное использование"],
  },
  {
    value: "municipal",
    phrases: ["муниципаль", "городской объект", "городская площадка", "бюджетный заказчик"],
  },
  {
    value: "residential_courtyard",
    phrases: ["двор жк", "для двора жк", "жилой комплекс", "двор дома", "двор"],
  },
  {
    value: "kindergarten",
    phrases: ["детский сад", "садик", "дошколь"],
  },
  {
    value: "school",
    phrases: ["школ", "школьн", "лицей", "гимназ"],
  },
  {
    value: "park_public",
    phrases: ["парк", "сквер", "общественное пространство", "набережная"],
  },
];

export const materialPreferenceRules: PhraseRule<MaterialPreferenceTag>[] = [
  {
    value: "eco",
    phrases: ["эко", "экологич", "экологичные материалы", "эко материалы"],
  },
  {
    value: "wood",
    phrases: ["дерево", "деревян", "из дерева", "деревянная", "деревянный"],
  },
  {
    value: "natural",
    phrases: ["натуральн", "природн", "естественн"],
  },
  {
    value: "hdpe",
    phrases: ["hdpe"],
  },
  {
    value: "hpl",
    phrases: ["hpl"],
  },
  {
    value: "metal",
    phrases: ["металл", "металлическ"],
  },
  {
    value: "antivandal",
    phrases: ["антиванд", "антивандальное исполнение", "антивандальная"],
  },
];

export const exclusionRules: Array<
  PhraseRule<ExclusionTag> & { keywords: string[] }
> = [
  {
    value: "sandbox",
    phrases: ["без песочницы", "не нужна песочница", "исключить песочницу"],
    keywords: ["песоч", "песочница"],
  },
  {
    value: "swing",
    phrases: ["без качелей", "не нужны качели", "исключить качели"],
    keywords: ["качел", "качели"],
  },
  {
    value: "metal",
    phrases: ["без металла", "не использовать металл", "без металлических элементов"],
    keywords: ["металл", "металлическ"],
  },
  {
    value: "bright_colors",
    phrases: ["без ярких цветов", "спокойные цвета", "не яркая", "неяркая"],
    keywords: ["ярк", "цвет"],
  },
  {
    value: "rope",
    phrases: ["без канатных элементов", "без канатов", "без веревочных элементов"],
    keywords: ["канат", "верев", "rope"],
  },
  {
    value: "high_slide",
    phrases: ["без высоких горок", "без высокой горки", "невысокая горка"],
    keywords: ["высок", "горк"],
  },
  {
    value: "complex_climb",
    phrases: ["без сложных лазалок", "без сложного лазания", "без сложных элементов лазания"],
    keywords: ["лазал", "скалодр", "канат", "верев"],
  },
];

export const compactPreferencePhrases = [
  "компактн",
  "небольш",
  "маленький участок",
  "маленьком участке",
  "чтобы поместился",
  "чтобы влезло",
  "поместилось",
];

export const growthPreferencePhrases = [
  "на вырост",
  "хватило надолго",
  "надолго",
  "долгосрочн",
  "дольше, чем",
];

export const safetyPreferencePhrases = [
  "безопасн",
  "для малышей",
  "для самых маленьких",
  "мягкие формы",
];

export const toddlerPreferencePhrases = [
  "для малышей",
  "для самых маленьких",
  "для детей до 3",
];

export const antiVandalPreferencePhrases = [
  "антиванд",
  "усиленн",
  "для общественного двора",
];

export const russianNumberWords: Record<string, number> = {
  ноль: 0,
  один: 1,
  одна: 1,
  одного: 1,
  одной: 1,
  два: 2,
  две: 2,
  двух: 2,
  три: 3,
  трех: 3,
  трёх: 3,
  четыре: 4,
  четырех: 4,
  четырёх: 4,
  пять: 5,
  пяти: 5,
  шесть: 6,
  шести: 6,
  семь: 7,
  семи: 7,
  восемь: 8,
  восьми: 8,
  девять: 9,
  девяти: 9,
  десять: 10,
  десяти: 10,
  одиннадцать: 11,
  одиннадцати: 11,
  двенадцать: 12,
  двенадцати: 12,
  тринадцать: 13,
  тринадцати: 13,
  четырнадцать: 14,
  четырнадцати: 14,
  пятнадцать: 15,
  пятнадцати: 15,
  шестнадцать: 16,
  шестнадцати: 16,
};
