import XLSX from "xlsx";

import { cleanText } from "@/import/shared/normalizers";

export type WorkbookRows = string[][];

export function readWorkbookRows(path: string) {
  const workbook = XLSX.readFile(path, {
    cellDates: false,
    raw: false,
    dense: false,
  });

  return workbook.SheetNames.map((sheetName) => ({
    sheetName,
    rows: XLSX.utils
      .sheet_to_json<string[]>(workbook.Sheets[sheetName]!, {
        header: 1,
        raw: false,
        defval: "",
      })
      .map((row) => row.map((cell) => cleanText(cell))),
  }));
}

export function findHeaderRow(rows: WorkbookRows) {
  return rows.findIndex((row) => {
    const joined = row.join(" | ");
    return joined.includes("Наименование") && joined.includes("Размер");
  });
}

export function countNonEmpty(values: string[]) {
  return values.filter(Boolean).length;
}
