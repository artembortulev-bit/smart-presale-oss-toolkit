import Decimal from "decimal.js";

import { slugify } from "@/shared/utils/slugify";

const separatorRegex = /[xх×*]/i;

export function cleanText(value: unknown) {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function cleanMultilineText(value: unknown) {
  return cleanText(String(value ?? "").replace(/[\r\n]+/g, " "));
}

export function normalizeCode(rawValue?: string | null) {
  const source = cleanText(rawValue);

  if (!source) {
    return "";
  }

  return source
    .normalize("NFKC")
    .replace(/\s*\(.*?\)\s*/g, "")
    .replace(/[–—]/g, "-")
    .replace(/[«»"']/g, "")
    .replace(/\s+/g, "")
    .toUpperCase();
}

export function fallbackArticleFromName(name: string, context: string) {
  return `${slugify(context)}-${slugify(name)}`.toUpperCase();
}

export function extractArticleFromName(name: string) {
  const source = cleanText(name).toUpperCase();
  const match = source.match(
    /^(?:\d+\s+)?([A-ZА-ЯЁ0-9]+[A-ZА-ЯЁ0-9.\-]*\d+[A-ZА-ЯЁ0-9.\-]*)\b/u,
  );

  return normalizeCode(match?.[1]);
}

function normalizeNumericFragment(value: string) {
  return value
    .replace(/[^\d,.-]/g, "")
    .replace(",", ".")
    .trim();
}

export function decimalFromText(value?: string | number | null) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = normalizeNumericFragment(String(value));

  if (!normalized) {
    return null;
  }

  try {
    return new Decimal(normalized);
  } catch {
    return null;
  }
}

export function parsePriceText(value?: string | number | null) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const normalized = String(value)
    .replace(/\|RUB/gi, "")
    .replace(/\s+/g, "")
    .replace(",", ".");

  if (!normalized) {
    return null;
  }

  try {
    return new Decimal(normalized);
  } catch {
    return null;
  }
}

export function parseMaterials(value?: string | null) {
  const source = cleanText(value);

  if (!source) {
    return [];
  }

  return source
    .split(",")
    .map((item) => cleanText(item))
    .filter(Boolean);
}

export function parseAgeRange(value?: string | null) {
  const source = cleanText(value);

  if (!source) {
    return {
      ageLabel: undefined,
      ageMinYears: undefined,
      ageMaxYears: undefined,
    };
  }

  const matches = Array.from(source.matchAll(/\d+/g)).map((match) =>
    Number(match[0]),
  );

  return {
    ageLabel: source,
    ageMinYears: matches[0],
    ageMaxYears: matches[1] ?? matches[0],
  };
}

export function parseDimensions(value?: string | null) {
  const source = cleanText(value);

  if (!source) {
    return {
      sizeLabel: undefined,
      lengthM: undefined,
      widthM: undefined,
      heightM: undefined,
    };
  }

  const normalized = source
    .replace(/мм/gi, "")
    .replace(/м3/gi, "")
    .replace(/м\//gi, "")
    .replace(/м/gi, "")
    .trim();

  const parts = normalized.split(separatorRegex).map(cleanText).filter(Boolean);

  if (parts.length < 2) {
    return {
      sizeLabel: source,
      lengthM: undefined,
      widthM: undefined,
      heightM: undefined,
    };
  }

  return {
    sizeLabel: source,
    lengthM: decimalFromText(parts[0]) ?? undefined,
    widthM: decimalFromText(parts[1]) ?? undefined,
    heightM: decimalFromText(parts[2]) ?? undefined,
  };
}

export function uniqueStrings(items: Array<string | undefined>) {
  return Array.from(new Set(items.filter(Boolean) as string[]));
}

export function firstDefined<T>(items: Array<T | undefined | null>) {
  return items.find((item) => item !== undefined && item !== null) ?? undefined;
}
