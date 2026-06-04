import { russianNumberWords } from "@/application/selection/dictionaries";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function normalizeSelectionText(text: string) {
  return text
    .toLowerCase()
    .replaceAll("ё", "е")
    .replace(/[“”«»"]/g, " ")
    .replace(/[()[\],;:!?]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function replaceRussianNumberWords(text: string) {
  return text
    .split(" ")
    .map((token) => {
      const cleanToken = token.replace(/[^a-zа-я0-9+-]/gi, "");
      const replacement = russianNumberWords[cleanToken];

      if (replacement === undefined) {
        return token;
      }

      return token.replace(cleanToken, String(replacement));
    })
    .join(" ");
}

export function normalizeSelectionQueryText(text: string) {
  return replaceRussianNumberWords(normalizeSelectionText(text));
}

export function tokenizeSelectionText(text: string) {
  return normalizeSelectionQueryText(text)
    .split(/[^a-zа-я0-9+]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

export function uniqueValues<TValue>(values: TValue[]) {
  return Array.from(new Set(values));
}

export function includesAnyPhrase(text: string, phrases: string[]) {
  return phrases.some((phrase) => text.includes(normalizeSelectionQueryText(phrase)));
}

export function toNumber(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const numeric = Number(value.replace(",", "."));
  return Number.isFinite(numeric) ? numeric : undefined;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function round(value: number, precision = 2) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

export function buildKeywordIndex(sourceValues: Array<string | undefined>) {
  return uniqueValues(
    sourceValues
      .flatMap((value) => tokenizeSelectionText(value ?? ""))
      .filter((token) => token.length >= 2),
  );
}
