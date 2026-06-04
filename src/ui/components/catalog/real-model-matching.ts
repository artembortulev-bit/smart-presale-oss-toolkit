import { ViewerPart } from "@/ui/components/catalog/product-viewer-spec";

type MatchContext = {
  objectName?: string;
  materialNames?: string[];
};

function normalizeValue(value?: string) {
  return value?.trim().toLowerCase() ?? "";
}

function includesAny(sourceValues: string[], candidates?: string[]) {
  if (!candidates || candidates.length === 0) {
    return true;
  }

  const normalizedCandidates = candidates.map(normalizeValue).filter(Boolean);
  return normalizedCandidates.some((candidate) =>
    sourceValues.some((sourceValue) => sourceValue.includes(candidate)),
  );
}

function startsWithAny(sourceValue: string, candidates?: string[]) {
  if (!candidates || candidates.length === 0) {
    return true;
  }

  const normalizedCandidates = candidates.map(normalizeValue).filter(Boolean);
  return normalizedCandidates.some((candidate) => sourceValue.startsWith(candidate));
}

export function matchViewerPartId(parts: ViewerPart[], context: MatchContext) {
  const normalizedObjectName = normalizeValue(context.objectName);
  const normalizedMaterialNames = (context.materialNames ?? []).map(normalizeValue).filter(Boolean);

  for (const part of parts) {
    const matchers = part.modelMatchers;

    if (!matchers) {
      continue;
    }

    const materialMatch = includesAny(normalizedMaterialNames, matchers.materialNames);
    const prefixMatch = startsWithAny(normalizedObjectName, matchers.objectNamePrefixes);
    const nameIncludesMatch = includesAny(
      normalizedObjectName ? [normalizedObjectName] : [],
      matchers.objectNameIncludes,
    );

    if (materialMatch && prefixMatch && nameIncludesMatch) {
      return part.id;
    }
  }

  return undefined;
}
