export function canManageStore(adminType: string | null | undefined): boolean {
  return adminType === "jobs" || adminType === "full"
}

export function parsePriceToCents(value: unknown): number | null {
  const normalized =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value.trim().replace(",", "."))
        : Number.NaN

  if (!Number.isFinite(normalized) || normalized < 0) {
    return null
  }

  return Math.round(normalized * 100)
}

export function parseOptionalPriceToCents(value: unknown): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === "string" && value.trim() === "") return null
  return parsePriceToCents(value)
}

export function parseFeatureList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
      .filter(Boolean)
  }

  if (typeof value !== "string") return []

  return value
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean)
}

export function parseFeatureListFromJson(value: string | null | undefined): string[] {
  if (!value) return []

  try {
    const parsed = JSON.parse(value) as unknown
    return parseFeatureList(parsed)
  } catch {
    return parseFeatureList(value)
  }
}

export function formatPriceFromCents(priceCents: number, currency: string): string {
  const amount = priceCents / 100
  const formatted = Number.isInteger(amount) ? amount.toFixed(0) : amount.toFixed(2)
  const normalizedCurrency = currency.trim().toUpperCase()

  if (normalizedCurrency === "EUR" || normalizedCurrency === "€") {
    return `${formatted}€`
  }

  return `${formatted} ${normalizedCurrency}`
}
