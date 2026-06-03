import type { PackageAssumption, RoofDirection, RoofSlope, ShadeObstacle } from "./types.js";

export const DIRECTION_FACTORS: Record<RoofDirection, number> = {
  south: 1,
  southeast: 0.95,
  southwest: 0.95,
  east: 0.85,
  west: 0.85,
  north: 0.55,
  unknown: 0.88
};

export const SLOPE_FACTORS: Record<RoofSlope, number> = {
  flat: 0.9,
  low: 0.95,
  medium: 1,
  steep: 0.92,
  unknown: 0.95
};

export const FALLBACK_SHADE_FACTORS: Record<ShadeObstacle, number> = {
  open: 1,
  partial: 0.85,
  building: 0.7,
  tree: 0.78,
  serious: 0.65,
  unknown: 0.8
};

export const PACKAGE_ASSUMPTIONS: PackageAssumption[] = [
  {
    id: "A",
    name: "Panel A",
    tag: "Alan verimliliği",
    bestCriterion: "Alan verimliliği",
    areaPowerKwpPerSqm: 0.23,
    systemEfficiency: 0.88,
    costMultiplier: 1.15,
    areaUsageRatio: 0.8,
    description: "Alanı en iyi kullanan, küçük balkon veya çatı alanı için ideal paket."
  },
  {
    id: "B",
    name: "Panel B",
    tag: "Maksimum üretim",
    bestCriterion: "Performans / yüksek üretim",
    areaPowerKwpPerSqm: 0.22,
    systemEfficiency: 0.92,
    costMultiplier: 1.3,
    areaUsageRatio: 1,
    description: "Maksimum performans ve en yüksek yıllık üretim isteyenler için premium seçenek."
  },
  {
    id: "C",
    name: "Panel C",
    tag: "Dengeli seçim",
    bestCriterion: "Maliyet avantajı + dengeli geri dönüş",
    areaPowerKwpPerSqm: 0.2,
    systemEfficiency: 0.85,
    costMultiplier: 1,
    areaUsageRatio: 0.7,
    description: "Fiyat ve performans arasında dengeli, ortalama kullanıcı için mantıklı çözüm."
  },
  {
    id: "D",
    name: "Panel D",
    tag: "Başlangıç",
    bestCriterion: "Esneklik / düşük giriş",
    areaPowerKwpPerSqm: 0.18,
    systemEfficiency: 0.8,
    costMultiplier: 0.75,
    areaUsageRatio: 0.4,
    description: "Düşük bütçe, küçük alan veya sistemi denemek isteyenler için başlangıç paketi."
  }
];

export const STANDARD_COST_PER_KWP: Record<string, { amount: number; currency: "TRY" | "EUR" | "USD" | "GBP" }> = {
  Türkiye: { amount: 36000, currency: "TRY" },
  Almanya: { amount: 1700, currency: "EUR" },
  Fransa: { amount: 1600, currency: "EUR" },
  İtalya: { amount: 1500, currency: "EUR" },
  ABD: { amount: 2500, currency: "USD" },
  İngiltere: { amount: 1800, currency: "GBP" },
  Diğer: { amount: 2000, currency: "USD" }
};

export const FALLBACK_RADIATION_BY_COUNTRY: Record<string, number> = {
  Türkiye: 1650,
  Almanya: 1050,
  Fransa: 1250,
  İtalya: 1500,
  ABD: 1450,
  İngiltere: 1000,
  Diğer: 1300
};

export const CO2_KG_PER_KWH = 0.42;
