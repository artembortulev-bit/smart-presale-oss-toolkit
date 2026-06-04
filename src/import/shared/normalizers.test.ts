import { describe, expect, it } from "vitest";

import {
  extractArticleFromName,
  normalizeCode,
  parseDimensions,
  parsePriceText,
} from "@/import/shared/normalizers";

describe("normalizers", () => {
  it("normalizes article codes with spaces and brackets", () => {
    expect(normalizeCode("ГД.012 (фанера)")).toBe("ГД.012");
    expect(normalizeCode(" ДГ. МКМ 01 ")).toBe("ДГ.МКМ01");
  });

  it("parses price strings from Bitrix format", () => {
    expect(parsePriceText("343965|RUB")?.toNumber()).toBe(343965);
    expect(parsePriceText("14 732,93")?.toNumber()).toBe(14732.93);
  });

  it("parses dimension strings with mixed separators", () => {
    const dimensions = parseDimensions("3,42х0,57х2,325м");
    expect(dimensions.lengthM?.toNumber()).toBe(3.42);
    expect(dimensions.widthM?.toNumber()).toBe(0.57);
    expect(dimensions.heightM?.toNumber()).toBe(2.325);
  });

  it("extracts article from a name when the row has no dedicated article cell", () => {
    expect(extractArticleFromName("1 ГК-10-Ст.01 Гимнастический комплекс")).toBe(
      "ГК-10-СТ.01",
    );
    expect(extractArticleFromName("Ангелочек девочка")).toBe("");
  });
});
