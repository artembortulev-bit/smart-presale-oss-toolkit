import { describe, expect, it } from "vitest";

import { parseSelectionQuery } from "@/application/selection/query-parser";

describe("parseSelectionQuery", () => {
  it("parses the core playground scenario from free text", () => {
    const parsed = parseSelectionQuery(
      "Детская площадка из экологичных материалов для дачи 4 на 5 метра, для детей от трех лет, на вырост, без песочницы.",
    );

    expect(parsed.objectType).toBe("playground");
    expect(parsed.widthM).toBe(4);
    expect(parsed.lengthM).toBe(5);
    expect(parsed.materialPreferences).toEqual(
      expect.arrayContaining(["eco"]),
    );
    expect(parsed.usageContexts).toEqual(
      expect.arrayContaining(["dacha"]),
    );
    expect(parsed.ageMinYears).toBe(3);
    expect(parsed.growthPreference).toBe(true);
    expect(parsed.excludeCategories).toContain("sandbox");
    expect(parsed.excludeKeywords).toContain("песоч");
    expect(parsed.targetUse).toBe("private_family");
    expect(parsed.solutionIntent).toBe("long_term_use");
  });

  it("parses compact size, range age and high-slide exclusion", () => {
    const parsed = parseSelectionQuery(
      "Нужна компактная площадка для частного дома, детям 2-6 лет, желательно дерево, без высоких горок.",
    );

    expect(parsed.compactPreference).toBe(true);
    expect(parsed.usageContexts).toEqual(
      expect.arrayContaining(["private_house"]),
    );
    expect(parsed.ageMinYears).toBe(2);
    expect(parsed.ageMaxYears).toBe(6);
    expect(parsed.materialPreferences).toEqual(
      expect.arrayContaining(["wood"]),
    );
    expect(parsed.excludeCategories).toContain("high_slide");
  });

  it("parses municipal budget requests and anti-vandal intent", () => {
    const parsed = parseSelectionQuery(
      "Муниципальная игровая площадка для двора ЖК, антивандальная, для детей 5+, бюджет до 2 млн.",
    );

    expect(parsed.usageContexts).toEqual(
      expect.arrayContaining(["municipal", "residential_courtyard"]),
    );
    expect(parsed.antiVandalPreference).toBe(true);
    expect(parsed.ageMinYears).toBe(5);
    expect(parsed.budgetRub).toBe(2_000_000);
  });
});
