import { describe, expect, it } from "vitest";

import { matchViewerPartId } from "@/ui/components/catalog/real-model-matching";
import { ViewerPart } from "@/ui/components/catalog/product-viewer-spec";

const parts: ViewerPart[] = [
  {
    id: "ride-surface",
    label: "Катальная поверхность",
    material: "Поверхность",
    finish: "Износостойкое покрытие",
    description: "Рабочая плоскость",
    color: "#2d6cdf",
    position: [0, 0, 0],
    annotationPosition: [0, 0, 0],
    imageAnchor: [0, 0],
    geometry: { type: "box", args: [1, 1, 1] },
    modelMatchers: {
      materialNames: ["Материал"],
    },
  },
  {
    id: "metal-coping",
    label: "Металлические кромки",
    material: "Металл",
    finish: "Окраска",
    description: "Рейлы и кромки",
    color: "#5f6975",
    position: [0, 0, 0],
    annotationPosition: [0, 0, 0],
    imageAnchor: [0, 0],
    geometry: { type: "box", args: [1, 1, 1] },
    modelMatchers: {
      materialNames: ["Material_#44"],
      objectNamePrefixes: ["Line", "Circle", "Rectangle"],
    },
  },
];

describe("matchViewerPartId", () => {
  it("matches ride surface by material name", () => {
    expect(
      matchViewerPartId(parts, {
        objectName: "Куб.004",
        materialNames: ["Материал"],
      }),
    ).toBe("ride-surface");
  });

  it("matches metal coping by material and object prefix", () => {
    expect(
      matchViewerPartId(parts, {
        objectName: "Line10388",
        materialNames: ["Material_#44"],
      }),
    ).toBe("metal-coping");
  });
});
