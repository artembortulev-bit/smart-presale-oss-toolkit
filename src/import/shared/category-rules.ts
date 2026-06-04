import { cleanText } from "@/import/shared/normalizers";

const categoryAliases: Record<string, string> = {
  "Серия Neo-Eco": "Игровые элементы",
  "Серия Kidsplay": "Игровые элементы",
  "Оборудование для детскиx садов": "Оборудование для детских садов",
  "ИК металлопластик": "Игровые комплексы",
};

export function normalizeCategoryName(value?: string | null) {
  const source = cleanText(value);

  if (!source) {
    return "";
  }

  return categoryAliases[source] ?? source;
}

export function normalizeSubcategoryLabel(
  categoryName: string,
  subcategoryLabel?: string | null,
) {
  const source = cleanText(subcategoryLabel);

  if (!source) {
    return source;
  }

  if (source === categoryName && source.startsWith("Серия ")) {
    return source;
  }

  return source;
}
