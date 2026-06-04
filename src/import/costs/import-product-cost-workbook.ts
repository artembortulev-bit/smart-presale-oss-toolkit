import XLSX from "xlsx";

import {
  ProductCostImportIssue,
  ProductCostImportResult,
  ProductCostMaterial,
  ProductCostRecordCost,
  ProductCostRecordPrice,
  ProductCostSheetSummary,
  ProductCostSourceRecord,
} from "@/application/costing/types";
import { normalizeCategoryName } from "@/import/shared/category-rules";
import {
  cleanMultilineText,
  cleanText,
  normalizeCode,
  parsePriceText,
} from "@/import/shared/normalizers";

type SheetCell = XLSX.CellObject | undefined;

const materialTokens: Array<{ token: string; material: ProductCostMaterial }> = [
  { token: "сосна", material: "PINE" },
  { token: "лиственница", material: "LARCH" },
  { token: "лисвенница", material: "LARCH" },
  { token: "робиния", material: "ROBINIA" },
];

const sheetCategoryOverrides: Record<string, string> = {
  "Серия Neo-Eco": "Игровые элементы",
  "Серия  Neo-Eco": "Игровые элементы",
  "Серия Kidsplay": "Игровые элементы",
  "ИК металлопластик": "Игровые комплексы",
  Батуты: "Игровые элементы",
};

function getCell(sheet: XLSX.WorkSheet, rowIndex: number, columnIndex: number) {
  return sheet[XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex })];
}

function getCellText(cell?: SheetCell) {
  if (!cell) {
    return "";
  }

  if (typeof cell.w === "string" && cell.w.trim()) {
    return cleanMultilineText(cell.w);
  }

  if (typeof cell.v === "string" && cell.v.trim()) {
    return cleanMultilineText(cell.v);
  }

  if (typeof cell.v === "number") {
    return String(cell.v);
  }

  return "";
}

function getCellNumber(cell?: SheetCell) {
  if (!cell) {
    return undefined;
  }

  if (typeof cell.v === "number" && Number.isFinite(cell.v)) {
    return cell.v;
  }

  const parsed = parsePriceText(getCellText(cell));
  return parsed?.toNumber();
}

function getFirstNumericValue(value?: string) {
  const source = cleanText(value);
  if (!source) {
    return undefined;
  }

  const match = source.match(/\d[\d\s]*(?:[.,]\d+)?/);
  if (!match) {
    return undefined;
  }

  return parsePriceText(match[0])?.toNumber();
}

function findHeaderRow(sheet: XLSX.WorkSheet) {
  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1:A1");
  const maxScanRow = Math.min(range.e.r, range.s.r + 12);

  for (let rowIndex = range.s.r; rowIndex <= maxScanRow; rowIndex += 1) {
    const values: string[] = [];
    for (let columnIndex = range.s.c; columnIndex <= range.e.c; columnIndex += 1) {
      values.push(getCellText(getCell(sheet, rowIndex, columnIndex)));
    }

    const joined = values.join(" | ");
    if (joined.includes("Артикул") && joined.includes("Наименование")) {
      return rowIndex;
    }
  }

  return -1;
}

function buildHeaderIndex(sheet: XLSX.WorkSheet, headerRowIndex: number) {
  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1:A1");
  const headerIndex = new Map<string, number>();

  for (let columnIndex = range.s.c; columnIndex <= range.e.c; columnIndex += 1) {
    const label = getCellText(getCell(sheet, headerRowIndex, columnIndex));
    if (label) {
      headerIndex.set(label, columnIndex);
    }
  }

  return headerIndex;
}

function countNonEmpty(values: string[]) {
  return values.filter(Boolean).length;
}

function getArticlePrefix(articleNormalized: string) {
  const match = articleNormalized.match(/^([A-ZА-ЯЁ]+)/u);
  return match?.[1];
}

function getSeriesName(sectionLabel?: string, sheetName?: string) {
  if (sectionLabel?.startsWith("Серия ")) {
    return sectionLabel;
  }

  if (sheetName?.includes("Neo-Eco")) {
    return "Серия Neo-Eco";
  }

  return undefined;
}

function resolveCategoryName(sheetName: string) {
  return normalizeCategoryName(sheetCategoryOverrides[sheetName] ?? cleanText(sheetName));
}

function parseFormulaDerivedPrice(cell: SheetCell, fallbackBasePrice?: number) {
  if (!cell?.f || fallbackBasePrice === undefined) {
    return undefined;
  }

  const factorMatch = cell.f.match(/\*\s*([0-9.]+)/);
  if (!factorMatch) {
    return undefined;
  }

  const factor = Number(factorMatch[1]);
  if (!Number.isFinite(factor)) {
    return undefined;
  }

  return Number((fallbackBasePrice * factor).toFixed(2));
}

function pushPrice(
  target: ProductCostRecordPrice[],
  material: ProductCostMaterial,
  cell: SheetCell,
  fallbackBasePrice?: number,
) {
  const numericValue = getCellNumber(cell) ?? parseFormulaDerivedPrice(cell, fallbackBasePrice);
  if (numericValue === undefined) {
    return;
  }

  target.push({
    material,
    clientPriceRub: numericValue,
    formulaHint: cell?.f,
  });
}

function parseCostMaterialFromNote(note: string) {
  const normalized = note.toLowerCase();
  const hit = materialTokens.find((item) => normalized.includes(item.token));
  return hit?.material;
}

function pushUniqueCost(target: ProductCostRecordCost[], entry: ProductCostRecordCost) {
  const existing = target.find((item) => item.material === entry.material);
  if (!existing) {
    target.push(entry);
  }
}

function parseMultiMaterialCostNote(note: string) {
  const variants: ProductCostRecordCost[] = [];
  const regex =
    /(\d[\d\s]*(?:[.,]\d+)?)\s*(сосна|лиственница|лисвенница|робиния)/giu;

  for (const match of note.matchAll(regex)) {
    const material = parseCostMaterialFromNote(match[2] ?? "");
    const costRub = parsePriceText(match[1])?.toNumber();

    if (!material || costRub === undefined) {
      continue;
    }

    pushUniqueCost(variants, {
      material,
      costRub,
      note: cleanMultilineText(note),
    });
  }

  return variants;
}

function parseCostVariants(cell: SheetCell, dateCell?: SheetCell) {
  const textValue = getCellText(cell);
  const dateLabel = getCellText(dateCell) || undefined;
  const variants = parseMultiMaterialCostNote(textValue);

  if (variants.length > 0) {
    return {
      variants,
      dateLabel,
      rawCostValue: textValue || undefined,
    };
  }

  const numericValue = getCellNumber(cell) ?? getFirstNumericValue(textValue);
  if (numericValue === undefined) {
    return {
      variants: [],
      dateLabel,
      rawCostValue: textValue || undefined,
    };
  }

  const material = parseCostMaterialFromNote(`${textValue} ${dateLabel ?? ""}`) ?? "STANDARD";

  return {
    variants: [
      {
        material,
        costRub: numericValue,
        note: textValue || undefined,
      },
    ],
    dateLabel,
    rawCostValue: textValue || undefined,
  };
}

function isSectionRow(
  rowValues: string[],
  articleValue: string,
  nameValue: string,
) {
  if (countNonEmpty(rowValues) !== 1) {
    return false;
  }

  return !articleValue && Boolean(nameValue);
}

function buildStandardRecord(params: {
  sheetName: string;
  categoryName: string;
  sectionLabel?: string;
  rowNumber: number;
  articleRaw: string;
  articleNormalized: string;
  name: string;
  sizeLabel?: string;
  priceCell?: SheetCell;
  costCell?: SheetCell;
  costDateCell?: SheetCell;
}) {
  const priceVariants: ProductCostRecordPrice[] = [];
  pushPrice(priceVariants, "STANDARD", params.priceCell);

  const costInfo = parseCostVariants(params.costCell, params.costDateCell);

  return {
    articleRaw: params.articleRaw || undefined,
    articleNormalized: params.articleNormalized,
    name: params.name,
    categoryName: params.categoryName,
    sectionLabel: params.sectionLabel,
    seriesName: getSeriesName(params.sectionLabel, params.sheetName),
    sizeLabel: params.sizeLabel,
    sheetName: params.sheetName,
    rowNumber: params.rowNumber,
    costDateLabel: costInfo.dateLabel,
    rawCostValue: costInfo.rawCostValue,
    priceVariants,
    costVariants: costInfo.variants,
  } satisfies ProductCostSourceRecord;
}

function buildNeoEcoRecord(params: {
  sheetName: string;
  categoryName: string;
  sectionLabel?: string;
  rowNumber: number;
  articleRaw: string;
  articleNormalized: string;
  name: string;
  sizeLabel?: string;
  pineCell?: SheetCell;
  larchCell?: SheetCell;
  robiniaCell?: SheetCell;
  costCell?: SheetCell;
  costDateCell?: SheetCell;
}) {
  const priceVariants: ProductCostRecordPrice[] = [];
  const robiniaPrice = getCellNumber(params.robiniaCell);

  pushPrice(priceVariants, "PINE", params.pineCell, robiniaPrice);
  pushPrice(priceVariants, "LARCH", params.larchCell, robiniaPrice);
  pushPrice(priceVariants, "ROBINIA", params.robiniaCell);

  const costInfo = parseCostVariants(params.costCell, params.costDateCell);

  return {
    articleRaw: params.articleRaw || undefined,
    articleNormalized: params.articleNormalized,
    name: params.name,
    categoryName: params.categoryName,
    sectionLabel: params.sectionLabel,
    seriesName: getSeriesName(params.sectionLabel, params.sheetName),
    sizeLabel: params.sizeLabel,
    sheetName: params.sheetName,
    rowNumber: params.rowNumber,
    costDateLabel: costInfo.dateLabel,
    rawCostValue: costInfo.rawCostValue,
    priceVariants,
    costVariants: costInfo.variants,
  } satisfies ProductCostSourceRecord;
}

function summarizeSheet(
  sheetName: string,
  categoryName: string,
  rows: number,
  records: ProductCostSourceRecord[],
) {
  const recordsWithCost = records.filter((record) => record.costVariants.length > 0).length;
  const recordsWithMaterialCosts = records.filter((record) =>
    record.costVariants.some((variant) => variant.material !== "STANDARD"),
  ).length;

  return {
    sheetName,
    categoryName,
    rows,
    records: records.length,
    recordsWithCost,
    recordsWithMaterialCosts,
  } satisfies ProductCostSheetSummary;
}

export async function importProductCostWorkbook(
  workbookPath: string,
): Promise<ProductCostImportResult> {
  const workbook = XLSX.readFile(workbookPath, {
    cellFormula: true,
    cellDates: false,
    raw: false,
  });

  const issues: ProductCostImportIssue[] = [];
  const records: ProductCostSourceRecord[] = [];
  const sheetSummaries: ProductCostSheetSummary[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      continue;
    }

    const headerRowIndex = findHeaderRow(sheet);
    if (headerRowIndex < 0) {
      issues.push({
        severity: "WARNING",
        code: "COST_HEADER_NOT_FOUND",
        message: `Could not resolve header row for sheet ${sheetName}.`,
        sheetName,
      });
      continue;
    }

    const categoryName = resolveCategoryName(sheetName);
    const headerIndex = buildHeaderIndex(sheet, headerRowIndex);
    const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1:A1");
    const articleColumn = headerIndex.get("Артикул") ?? 1;
    const nameColumn = headerIndex.get("Наименование") ?? 2;
    const sizeColumn = headerIndex.get("Размер (м)") ?? headerIndex.get("Размер") ?? 4;
    const basePriceColumn = headerIndex.get("Цена с НДС (руб.)") ?? 5;
    const pineColumn = headerIndex.get("Сосна");
    const larchColumn = headerIndex.get("Лиственница");
    const robiniaColumn = headerIndex.get("Робиния");
    const costColumn = headerIndex.get("Себестоимость");
    const dateColumn = headerIndex.get("Дата просчета себестоимости");

    let currentSection = cleanText(getCellText(getCell(sheet, headerRowIndex - 1, nameColumn)));
    const sheetRecords: ProductCostSourceRecord[] = [];

    for (let rowIndex = headerRowIndex + 1; rowIndex <= range.e.r; rowIndex += 1) {
      const rowValues: string[] = [];
      for (let columnIndex = range.s.c; columnIndex <= range.e.c; columnIndex += 1) {
        rowValues.push(getCellText(getCell(sheet, rowIndex, columnIndex)));
      }

      if (countNonEmpty(rowValues) === 0) {
        continue;
      }

      const articleRaw = getCellText(getCell(sheet, rowIndex, articleColumn));
      const name = cleanMultilineText(getCellText(getCell(sheet, rowIndex, nameColumn)));

      if (isSectionRow(rowValues, articleRaw, name)) {
        currentSection = name || currentSection;
        continue;
      }

      if (!name) {
        continue;
      }

      const articleNormalized = normalizeCode(articleRaw);
      if (!articleNormalized) {
        issues.push({
          severity: "WARNING",
          code: "COST_ARTICLE_MISSING",
          message: "Workbook row has no normalized article and cannot be linked reliably.",
          sheetName,
          rowNumber: rowIndex + 1,
          details: {
            name,
          },
        });
        continue;
      }

      const record =
        pineColumn !== undefined && larchColumn !== undefined && robiniaColumn !== undefined
          ? buildNeoEcoRecord({
              sheetName,
              categoryName,
              sectionLabel: currentSection || undefined,
              rowNumber: rowIndex + 1,
              articleRaw,
              articleNormalized,
              name,
              sizeLabel: getCellText(getCell(sheet, rowIndex, sizeColumn)) || undefined,
              pineCell: getCell(sheet, rowIndex, pineColumn),
              larchCell: getCell(sheet, rowIndex, larchColumn),
              robiniaCell: getCell(sheet, rowIndex, robiniaColumn),
              costCell: costColumn !== undefined ? getCell(sheet, rowIndex, costColumn) : undefined,
              costDateCell:
                dateColumn !== undefined ? getCell(sheet, rowIndex, dateColumn) : undefined,
            })
          : buildStandardRecord({
              sheetName,
              categoryName,
              sectionLabel: currentSection || undefined,
              rowNumber: rowIndex + 1,
              articleRaw,
              articleNormalized,
              name,
              sizeLabel: getCellText(getCell(sheet, rowIndex, sizeColumn)) || undefined,
              priceCell:
                basePriceColumn !== undefined ? getCell(sheet, rowIndex, basePriceColumn) : undefined,
              costCell: costColumn !== undefined ? getCell(sheet, rowIndex, costColumn) : undefined,
              costDateCell:
                dateColumn !== undefined ? getCell(sheet, rowIndex, dateColumn) : undefined,
            });

      sheetRecords.push(record);
      records.push(record);

      if (record.costVariants.length === 0 && record.rawCostValue) {
        issues.push({
          severity: "INFO",
          code: "COST_VALUE_UNPARSED",
          message: "Cost cell contains text, but no numeric cost was parsed from it.",
          sheetName,
          rowNumber: rowIndex + 1,
          articleNormalized,
          details: {
            rawCostValue: record.rawCostValue,
          },
        });
      }
    }

    sheetSummaries.push(
      summarizeSheet(sheetName, categoryName, range.e.r - headerRowIndex, sheetRecords),
    );
  }

  const recordsWithCost = records.filter((record) => record.costVariants.length > 0).length;

  return {
    workbookPath,
    records,
    issues,
    sheetSummaries,
    summary: {
      sheets: sheetSummaries.length,
      records: records.length,
      recordsWithCost,
      coverageRatio: records.length > 0 ? Number((recordsWithCost / records.length).toFixed(4)) : 0,
    },
  };
}

export function getProductCostRecordArticlePrefix(record: ProductCostSourceRecord) {
  return getArticlePrefix(record.articleNormalized);
}
