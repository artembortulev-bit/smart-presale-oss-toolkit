import Decimal from "decimal.js";

export function decimalOrNull(value?: string | number | null) {
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

export function formatPriceRub(value?: Decimal | number | string | null) {
  if (value === null || value === undefined || value === "") {
    return "По запросу";
  }

  const amount = value instanceof Decimal ? value.toNumber() : Number(value);

  if (!Number.isFinite(amount)) {
    return "По запросу";
  }

  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(amount);
}
