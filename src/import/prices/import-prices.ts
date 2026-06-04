import {
  cleanMultilineText,
  decimalFromText,
  extractArticleFromName,
  fallbackArticleFromName,
  normalizeCode,
  parseDimensions,
  parsePriceText,
} from "@/import/shared/normalizers";
import { normalizeCategoryName } from "@/import/shared/category-rules";
import { ImportBundle, PriceEntryDraft, SourceProductDraft } from "@/import/shared/types";
import {
  countNonEmpty,
  findHeaderRow,
  readWorkbookRows,
  WorkbookRows,
} from "@/import/shared/workbook";

type ImportPriceSource = "PRICE_OPTIMUM" | "PRICE_PREMIUM";

const sheetCategoryOverrides: Record<string, string> = {
  "Серия Kidsplay": "Игровые элементы",
  "Серия  Neo-Eco": "Игровые элементы",
  "ИК металлопластик": "Игровые комплексы",
  Батуты: "Игровые элементы",
};

const standardDiscountLevels = [
  { level: "BASE" as const, header: "Цена с НДС (руб.)" },
  { level: "DISCOUNT_10" as const, header: "10%" },
  { level: "DISCOUNT_20" as const, header: "20%" },
  { level: "DISCOUNT_30" as const, header: "30%" },
];

function isSectionRow(row: string[], nameIndex: number, articleIndex: number | null) {
  if (countNonEmpty(row) !== 1) {
    return false;
  }

  const articleValue = articleIndex === null ? "" : row[articleIndex];
  const nameValue = row[nameIndex] ?? "";

  return !articleValue && (!nameValue || nameValue.startsWith("Серия "));
}

function buildPriceEntriesFromHeader(
  header: string[],
  row: string[],
  source: ImportPriceSource,
  sourceLabel: string,
) {
  const entries: PriceEntryDraft[] = [];
  const normalizedHeader = header.map((cell) => cell.trim());

  if (normalizedHeader.includes("Сосна")) {
    const pineIndex = normalizedHeader.indexOf("Сосна");
    const larchIndex = normalizedHeader.indexOf("Лиственница");
    const robiniaIndex = normalizedHeader.indexOf("Робиния");

    const materialGroups = [
      { material: "PINE" as const, startIndex: pineIndex },
      { material: "LARCH" as const, startIndex: larchIndex },
      { material: "ROBINIA" as const, startIndex: robiniaIndex },
    ].filter((group) => group.startIndex >= 0);

    materialGroups.forEach((group) => {
      const base = parsePriceText(row[group.startIndex]);
      const discount10 = parsePriceText(row[group.startIndex + 1]);
      const discount20 = parsePriceText(row[group.startIndex + 2]);
      const discount30 = parsePriceText(row[group.startIndex + 3]);

      [
        { level: "BASE" as const, value: base },
        { level: "DISCOUNT_10" as const, value: discount10 },
        { level: "DISCOUNT_20" as const, value: discount20 },
        { level: "DISCOUNT_30" as const, value: discount30 },
      ].forEach((entry) => {
        if (!entry.value) {
          return;
        }

        entries.push({
          material: group.material,
          level: entry.level,
          amountRub: entry.value,
          source,
          sourceLabel,
        });
      });
    });

    return entries;
  }

  standardDiscountLevels.forEach(({ level, header: headerName }) => {
    const index = normalizedHeader.indexOf(headerName);
    const price = parsePriceText(index >= 0 ? row[index] : "");

    if (!price) {
      return;
    }

    entries.push({
      material: "STANDARD",
      level,
      amountRub: price,
      source,
      sourceLabel,
    });
  });

  return entries;
}

function resolveCategoryName(sheetName: string) {
  return normalizeCategoryName(sheetCategoryOverrides[sheetName] ?? sheetName.trim());
}

function importSheet(
  sheetName: string,
  rows: WorkbookRows,
  source: ImportPriceSource,
) {
  const items: SourceProductDraft[] = [];
  const issues: ImportBundle["issues"] = [];
  const headerRowIndex = findHeaderRow(rows);

  if (headerRowIndex < 0) {
    issues.push({
      severity: "WARNING",
      code: "PRICE_HEADER_NOT_FOUND",
      message: `Не удалось определить строку заголовков для листа ${sheetName}.`,
      sourceSheet: sheetName,
    });
    return { items, issues };
  }

  const header = rows[headerRowIndex]!;
  const articleIndex = header.indexOf("Артикул");
  const nameIndex = header.indexOf("Наименование");
  const imageIndex = header.indexOf("Изображение");
  const sizeIndex = header.findIndex((cell) => cell.startsWith("Размер"));
  const weightIndex = header.findIndex((cell) => cell.startsWith("Вес"));
  const volumeIndex = header.findIndex((cell) => cell.startsWith("Объем"));

  const preHeaderRow = rows[headerRowIndex - 1];
  let currentSection =
    preHeaderRow && countNonEmpty(preHeaderRow) === 1
      ? preHeaderRow.find(Boolean) ?? ""
      : "";

  for (let rowIndex = headerRowIndex + 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex]!;

    if (countNonEmpty(row) === 0) {
      continue;
    }

    if (nameIndex >= 0 && isSectionRow(row, nameIndex, articleIndex >= 0 ? articleIndex : null)) {
      currentSection = row.find(Boolean) ?? currentSection;
      continue;
    }

    const name = cleanMultilineText(row[nameIndex >= 0 ? nameIndex : 0]);

    if (!name) {
      continue;
    }

    const articleRaw = articleIndex >= 0 ? row[articleIndex] : "";
    const articleFromName = extractArticleFromName(name);
    const articleNormalized =
      normalizeCode(articleRaw) ||
      articleFromName ||
      fallbackArticleFromName(name, `${sheetName}-${currentSection || "base"}`);

    if (!normalizeCode(articleRaw)) {
      issues.push({
        severity: "WARNING",
        code: "PRICE_ARTICLE_SYNTHESIZED",
        message: "У строки отсутствует артикул, создан синтетический ключ по имени.",
        sourceSheet: sheetName,
        sourceRow: rowIndex + 1,
        sourceKey: articleNormalized,
      });
    }

    const dimensions = parseDimensions(sizeIndex >= 0 ? row[sizeIndex] : "");
    const prices = buildPriceEntriesFromHeader(
      header,
      row,
      source,
      `${sheetName}${currentSection ? ` / ${currentSection}` : ""}`,
    );

    if (prices.length === 0) {
      issues.push({
        severity: "WARNING",
        code: "PRICE_VALUE_MISSING",
        message: "У строки прайса отсутствуют числовые цены.",
        sourceSheet: sheetName,
        sourceRow: rowIndex + 1,
        sourceKey: articleNormalized,
      });
    }

    items.push({
      source,
      sourceSheet: sheetName,
      sourceRow: rowIndex + 1,
      articleRaw: articleRaw || undefined,
      articleNormalized,
      name,
      categoryName: resolveCategoryName(sheetName),
      subcategoryLabel: currentSection || undefined,
      seriesName: currentSection.startsWith("Серия ") ? currentSection : undefined,
      imageUrl: imageIndex >= 0 ? row[imageIndex] || undefined : undefined,
      sizeLabel: dimensions.sizeLabel,
      lengthM: dimensions.lengthM,
      widthM: dimensions.widthM,
      heightM: dimensions.heightM,
      weightKg: weightIndex >= 0 ? decimalFromText(row[weightIndex]) ?? undefined : undefined,
      volumeM3: volumeIndex >= 0 ? decimalFromText(row[volumeIndex]) ?? undefined : undefined,
      prices,
      rawData: {
        sheetName,
        row,
      },
      normalizedData: {
        sheetName,
        currentSection: currentSection || undefined,
        articleNormalized,
      },
    });
  }

  return { items, issues };
}

export async function importPriceWorkbook(path: string, source: ImportPriceSource) {
  const workbook = readWorkbookRows(path);
  const items: SourceProductDraft[] = [];
  const issues: ImportBundle["issues"] = [];

  workbook.forEach(({ sheetName, rows }) => {
    const result = importSheet(sheetName, rows, source);
    items.push(...result.items);
    issues.push(...result.issues);
  });

  return {
    items,
    issues,
  };
}
