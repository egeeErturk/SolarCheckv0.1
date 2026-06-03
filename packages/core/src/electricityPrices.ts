import type { ElectricityPrice } from "./types.js";

const PRICE_TABLE: Record<string, ElectricityPrice> = {
  Türkiye: { country: "Türkiye", pricePerKwh: 3, currency: "TRY", source: "fallback", label: "Tahmini elektrik fiyatı" },
  Almanya: { country: "Almanya", pricePerKwh: 0.35, currency: "EUR", source: "fallback", label: "Tahmini elektrik fiyatı" },
  Fransa: { country: "Fransa", pricePerKwh: 0.25, currency: "EUR", source: "fallback", label: "Tahmini elektrik fiyatı" },
  İtalya: { country: "İtalya", pricePerKwh: 0.3, currency: "EUR", source: "fallback", label: "Tahmini elektrik fiyatı" },
  ABD: { country: "ABD", pricePerKwh: 0.17, currency: "USD", source: "fallback", label: "Tahmini elektrik fiyatı" },
  İngiltere: { country: "İngiltere", pricePerKwh: 0.28, currency: "GBP", source: "fallback", label: "Tahmini elektrik fiyatı" },
  Diğer: { country: "Diğer", pricePerKwh: 0.2, currency: "USD", source: "fallback", label: "Tahmini elektrik fiyatı" }
};

export function normalizeCountry(country?: string): string {
  const value = (country || "").toLocaleLowerCase("tr-TR");
  if (value.includes("turkey") || value.includes("türkiye") || value.includes("turkiye")) return "Türkiye";
  if (value.includes("germany") || value.includes("almanya") || value.includes("deutschland")) return "Almanya";
  if (value.includes("france") || value.includes("fransa")) return "Fransa";
  if (value.includes("italy") || value.includes("italia") || value.includes("italya")) return "İtalya";
  if (value.includes("united states") || value.includes("usa") || value.includes("abd")) return "ABD";
  if (value.includes("united kingdom") || value.includes("ingiltere") || value.includes("uk")) return "İngiltere";
  return "Diğer";
}

export function getElectricityPriceByCountry(country?: string, override?: number): ElectricityPrice {
  const normalized = normalizeCountry(country);
  const base = PRICE_TABLE[normalized] ?? PRICE_TABLE.Diğer;
  if (typeof override === "number" && override > 0) {
    return { ...base, pricePerKwh: override, source: "override", label: "Gelişmiş fiyat ayarı" };
  }
  return base;
}
