import { promises as fs } from "node:fs";

import { parse } from "csv-parse/sync";
import iconv from "iconv-lite";

import {
  cleanMultilineText,
  normalizeCode,
  parseAgeRange,
  parseDimensions,
  parseMaterials,
  parsePriceText,
} from "@/import/shared/normalizers";
import {
  normalizeCategoryName,
  normalizeSubcategoryLabel,
} from "@/import/shared/category-rules";
import { ImportBundle, SourceProductDraft } from "@/import/shared/types";

type BitrixRow = Record<string, string>;

function priceEntriesFromBitrix(row: BitrixRow) {
  const entries: SourceProductDraft["prices"] = [];

  const base = parsePriceText(row["Цена с НДС (руб.)"]);
  const pine = parsePriceText(row["Цена Сосна (руб.)"]);
  const larch = parsePriceText(row["Цена Лиственница (руб.)"]);
  const robinia = parsePriceText(row["Цена Робиния (руб.)"]);

  if (base) {
    entries.push({
      material: "STANDARD",
      level: "BASE",
      amountRub: base,
      source: "BITRIX",
      sourceLabel: "Bitrix CSV",
    });
  }

  if (pine) {
    entries.push({
      material: "PINE",
      level: "BASE",
      amountRub: pine,
      source: "BITRIX",
      sourceLabel: "Bitrix CSV",
    });
  }

  if (larch) {
    entries.push({
      material: "LARCH",
      level: "BASE",
      amountRub: larch,
      source: "BITRIX",
      sourceLabel: "Bitrix CSV",
    });
  }

  if (robinia) {
    entries.push({
      material: "ROBINIA",
      level: "BASE",
      amountRub: robinia,
      source: "BITRIX",
      sourceLabel: "Bitrix CSV",
    });
  }

  return entries;
}

export async function importBitrixCsv(path: string): Promise<ImportBundle> {
  const fileBuffer = await fs.readFile(path);
  const decoded = iconv.decode(fileBuffer, "win1251");

  const rows = parse(decoded, {
    columns: true,
    delimiter: ";",
    skip_empty_lines: true,
    relax_quotes: true,
    trim: true,
  }) as BitrixRow[];

  const items: SourceProductDraft[] = [];
  const issues: ImportBundle["issues"] = [];

  rows.forEach((row, index) => {
    const articleRaw = row["Артикул"];
    const articleNormalized = normalizeCode(articleRaw);
    const name = cleanMultilineText(row["Наименование"]);
    const imageUrl = row["Изображение"] || undefined;
    const prices = priceEntriesFromBitrix(row);
    const { ageLabel, ageMinYears, ageMaxYears } = parseAgeRange(row["Возраст"]);
    const dimensions = parseDimensions(row["Размер (м)"]);
    const rawCategoryName = row["Раздел (уровень 1)"] || undefined;
    const categoryName = normalizeCategoryName(rawCategoryName);
    const subcategoryLabel =
      normalizeSubcategoryLabel(categoryName, row["Раздел (уровень 2)"] || undefined) ||
      (rawCategoryName?.startsWith("Серия ") ? rawCategoryName : undefined);

    if (!articleNormalized) {
      issues.push({
        severity: "ERROR",
        code: "BITRIX_ARTICLE_MISSING",
        message: "Не найден артикул в Bitrix CSV.",
        sourceRow: index + 2,
        sourceKey: row["id"],
      });
      return;
    }

    if (prices.length === 0) {
      issues.push({
        severity: "WARNING",
        code: "BITRIX_PRICE_MISSING",
        message: "У записи отсутствует базовая цена в Bitrix CSV.",
        sourceRow: index + 2,
        sourceKey: articleNormalized,
      });
    }

    items.push({
      source: "BITRIX",
      sourceRecordId: row["id"],
      sourceRow: index + 2,
      articleRaw,
      articleNormalized,
      externalCode: row["Внешний код"] || undefined,
      name,
      categoryName: categoryName || undefined,
      subcategoryLabel,
      classLabel: row["Класс"] || undefined,
      seriesName: subcategoryLabel?.startsWith("Серия ")
        ? subcategoryLabel
        : undefined,
      imageUrl,
      materials: parseMaterials(row["Материал"]),
      ageLabel,
      ageMinYears,
      ageMaxYears,
      lengthM: dimensions.lengthM,
      widthM: dimensions.widthM,
      heightM: dimensions.heightM,
      sizeLabel: dimensions.sizeLabel,
      prices,
      rawData: row,
      normalizedData: {
        articleNormalized,
        categoryName: categoryName || undefined,
        subcategoryLabel,
      },
    });
  });

  return {
    items,
    issues,
  };
}
