import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import XLSX from "xlsx";
import { afterEach, describe, expect, it } from "vitest";

import { importProductCostWorkbook } from "@/import/costs/import-product-cost-workbook";

const tempDirs: string[] = [];

async function createWorkbookFile() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "smart-presale-cost-workbook-"));
  tempDirs.push(dir);

  const workbook = XLSX.utils.book_new();

  const standardSheet = XLSX.utils.aoa_to_sheet([
    ["", "", "", "", "", "", "", ""],
    ["№", "Артикул", "Наименование", "Изображение", "Размер (м)", "Цена с НДС (руб.)", "Себестоимость", "Дата просчета себестоимости"],
    ["Серия Тест", "", "", "", "", "", "", ""],
    [1, "МАФ.001", "МАФ.001 Скамья", "", "1,2х0,6х0,8", 120000, "72 500,00 без доставки", "01.04.2026"],
  ]);

  const neoEcoSheet = XLSX.utils.aoa_to_sheet([
    ["", "", "", "", "", "", "", "", "", "", "", ""],
    ["№", "Артикул", "Наименование", "Изображение", "Размер (м)", "Сосна", "Лиственница", "Робиния", "", "", "Себестоимость", "Дата просчета себестоимости"],
    ["Серия Neo-Eco", "", "", "", "", "", "", "", "", "", "", ""],
    [1, "ЭКО.К.001", 'ЭКО.К.001 Качели "Neo-Eco"', "", "3,5х2,9х2,4", undefined, undefined, 400000, "", "", "100 000,00 сосна\n120 000,00 лиственница\n160 000,00 робиния", "20.03.2026"],
  ]);

  neoEcoSheet.F4 = { t: "n", f: "H4*0.8", v: 320000 };
  neoEcoSheet.G4 = { t: "n", f: "H4*0.9", v: 360000 };

  XLSX.utils.book_append_sheet(workbook, standardSheet, "МАФ");
  XLSX.utils.book_append_sheet(workbook, neoEcoSheet, "Серия  Neo-Eco");

  const filePath = path.join(dir, "product-costs.xlsx");
  XLSX.writeFile(workbook, filePath);
  return filePath;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) =>
      rm(dir, {
        recursive: true,
        force: true,
      }),
    ),
  );
});

describe("importProductCostWorkbook", () => {
  it("parses standard costs and Neo-Eco material ladders", async () => {
    const workbookPath = await createWorkbookFile();
    const imported = await importProductCostWorkbook(workbookPath);

    expect(imported.records).toHaveLength(2);

    const bench = imported.records.find((record) => record.articleNormalized === "МАФ.001");
    expect(bench?.priceVariants[0]?.clientPriceRub).toBe(120000);
    expect(bench?.costVariants[0]?.costRub).toBe(72500);
    expect(bench?.costVariants[0]?.material).toBe("STANDARD");

    const neo = imported.records.find((record) => record.articleNormalized === "ЭКО.К.001");
    expect(neo?.priceVariants.find((variant) => variant.material === "PINE")?.clientPriceRub).toBe(320000);
    expect(neo?.priceVariants.find((variant) => variant.material === "LARCH")?.clientPriceRub).toBe(360000);
    expect(neo?.priceVariants.find((variant) => variant.material === "ROBINIA")?.clientPriceRub).toBe(400000);
    expect(neo?.costVariants).toHaveLength(3);
    expect(neo?.costVariants.find((variant) => variant.material === "LARCH")?.costRub).toBe(120000);
    expect(imported.summary.recordsWithCost).toBe(2);
  });
});
