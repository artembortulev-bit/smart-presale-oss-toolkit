import { DemoProposalScenario } from "@/import/catalog/types";
import { cleanText, parsePriceText } from "@/import/shared/normalizers";
import { countNonEmpty, readWorkbookRows } from "@/import/shared/workbook";
import { slugify } from "@/shared/utils/slugify";

function parseCustomerLine(value: string) {
  const source = cleanText(value);
  const match = source.match(
    /(?<date>\d{2}\.\d{2}\.\d{4})г\.\s*Заказчик:?\s*(?<customer>.+?)\s+Адрес:?\s*(?<address>.+)$/i,
  );

  if (!match?.groups) {
    return {
      issueDate: undefined,
      customerName: source,
      address: undefined,
    };
  }

  return {
    issueDate: match.groups.date,
    customerName: cleanText(match.groups.customer),
    address: cleanText(match.groups.address),
  };
}

function findHeaderRowIndex(rows: string[][]) {
  return rows.findIndex((row) => {
    const joined = row.join(" | ");
    return joined.includes("Артикул") && joined.includes("Наименование");
  });
}

function findCellValueNearLabel(rows: string[][], labelPattern: RegExp) {
  for (const row of rows) {
    const labelIndex = row.findIndex((cell) => labelPattern.test(cell));
    if (labelIndex < 0) {
      continue;
    }

    const inNextCell = cleanText(row[labelIndex + 1]);
    if (inNextCell) {
      return inNextCell;
    }

    const labelCell = row[labelIndex];
    if (!labelCell) {
      continue;
    }

    const inSameCell = cleanText(labelCell.replace(labelPattern, ""));
    if (inSameCell) {
      return inSameCell;
    }
  }

  return undefined;
}

function parseStructuredScenario(path: string, sheetName: string, rows: string[][]) {
  const headerRowIndex = findHeaderRowIndex(rows);
  if (headerRowIndex < 0) {
    return undefined;
  }

  const header = rows[headerRowIndex]!;
  const articleIndex = header.findIndex((cell) => cell.includes("Артикул"));
  const nameIndex = header.findIndex((cell) => cell.includes("Наименование"));
  const materialsIndex = header.findIndex((cell) => cell.includes("Материал"));
  const sizeIndex = header.findIndex((cell) => cell.includes("Размер"));
  const quantityIndex = header.findIndex((cell) => cell.includes("Кол-во"));
  const unitPriceIndex = header.findIndex((cell) => cell.includes("Цена"));
  const totalPriceIndex = header.findIndex((cell) => cell.includes("Стоимость"));

  const lines: DemoProposalScenario["lines"] = [];

  for (let index = headerRowIndex + 1; index < rows.length; index += 1) {
    const row = rows[index]!;
    const article = cleanText(row[articleIndex]);
    const name = cleanText(row[nameIndex] || row[articleIndex]);

    if (countNonEmpty(row) === 0) {
      continue;
    }

    if (/стоимость оборудования|итого|доставка|монтаж|исполнитель/i.test(row.join(" "))) {
      break;
    }

    if (!article && !name) {
      continue;
    }

    lines.push({
      article: article || undefined,
      name,
      sizeLabel: cleanText(row[sizeIndex]),
      quantity: Number(cleanText(row[quantityIndex]).replace(",", ".")) || undefined,
      unitPriceRub: parsePriceText(row[unitPriceIndex])?.toNumber(),
      totalPriceRub: parsePriceText(row[totalPriceIndex])?.toNumber(),
      materialLabel: cleanText(row[materialsIndex]) || undefined,
    });
  }

  if (!lines.length) {
    return undefined;
  }

  const title =
    rows
      .flat()
      .map(cleanText)
      .find((cell) => /коммерческое предложение/i.test(cell)) ??
    (sheetName === "лист" ? "Коммерческое предложение" : sheetName);

  const customerName =
    findCellValueNearLabel(rows.slice(0, headerRowIndex), /^Заказчик:?/i) ??
    "Демо-клиент";
  const address = findCellValueNearLabel(rows.slice(0, headerRowIndex), /^Адрес:?/i);
  const issueDate = findCellValueNearLabel(rows.slice(0, headerRowIndex), /^Дата:?/i);

  return {
    id: slugify(`${path}-${sheetName}-structured`),
    title,
    customerName,
    address,
    issueDate,
    lines,
  } satisfies DemoProposalScenario;
}

function parseLegacyScenario(path: string, sheetName: string, rows: string[][]) {
  if (!rows.length) {
    return undefined;
  }

  const customerLine = rows[2]?.[0] ?? "";
  const parsedCustomer = parseCustomerLine(customerLine);
  const lines: DemoProposalScenario["lines"] = [];

  for (let index = 5; index < rows.length; index += 1) {
    const row = rows[index]!;
    const article = cleanText(row[1]);
    const name = cleanText(row[2] || row[1]);

    if (!article && !name) {
      continue;
    }

    if (/итого|стоимость|сумма/i.test(name)) {
      break;
    }

    if (!article && /^объект/i.test(cleanText(row[0]))) {
      continue;
    }

    lines.push({
      article: article || undefined,
      name,
      sizeLabel: cleanText(row[4]),
      quantity: Number(cleanText(row[5]).replace(",", ".")) || undefined,
      unitPriceRub: parsePriceText(row[6])?.toNumber(),
      totalPriceRub: parsePriceText(row[7])?.toNumber(),
    });
  }

  if (!lines.length) {
    return undefined;
  }

  return {
    id: slugify(`${path}-${sheetName}`),
    title: sheetName === "лист" ? "Коммерческое предложение" : sheetName,
    customerName: parsedCustomer.customerName || "Демо-клиент",
    address: parsedCustomer.address,
    issueDate: parsedCustomer.issueDate,
    lines,
  } satisfies DemoProposalScenario;
}

function parseScenario(path: string): DemoProposalScenario[] {
  const workbook = readWorkbookRows(path);

  return workbook.flatMap(({ sheetName, rows }) => {
    const structured = parseStructuredScenario(path, sheetName, rows);
    if (structured) {
      return [structured];
    }

    const legacy = parseLegacyScenario(path, sheetName, rows);
    return legacy ? [legacy] : [];
  });
}

export function importProposalSamples(paths: string[]) {
  return paths.flatMap((path) => parseScenario(path));
}
