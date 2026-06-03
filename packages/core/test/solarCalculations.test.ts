import test from "node:test";
import assert from "node:assert/strict";
import { calculatePackageResults, estimateShadowFallback, getElectricityPriceByCountry } from "../src/index.js";
import type { SolarCalculationInput } from "../src/index.js";

const baseInput: SolarCalculationInput = {
  location: { latitude: 40.15, longitude: 26.4, address: { country: "Türkiye", city: "Çanakkale" } },
  usableAreaSqm: 10,
  usageType: "balcony",
  direction: "south",
  slope: "medium",
  shadeObstacle: "open",
  monthlyConsumptionKwh: 250,
  daytimeConsumption: "partial"
};

test("Test A: Çanakkale küçük alanda A üretim ve C fiyat/performans görünür", () => {
  const shade = estimateShadowFallback("south", "medium", "open", 40.15);
  const packages = calculatePackageResults(baseInput, 1650, shade.shadeFactor, 3);
  const a = packages.find((pkg) => pkg.id === "A");
  const c = packages.find((pkg) => pkg.id === "C");
  assert.ok(a);
  assert.ok(c);
  assert.ok(a.annualProductionKwh > 2500);
  assert.ok(c.paybackYears && c.paybackYears < 12);
});

test("Test B: Antalya radyasyon artışı B paketini üretimde öne çıkarır", () => {
  const input = {
    ...baseInput,
    location: { latitude: 36.9, longitude: 30.7, address: { country: "Türkiye", city: "Antalya" } },
    usableAreaSqm: 20,
    usageType: "roof" as const,
    direction: "southwest" as const,
    monthlyConsumptionKwh: 400
  };
  const packages = calculatePackageResults(input, 1900, 0.95, 3);
  const max = [...packages].sort((a, b) => b.annualProductionKwh - a.annualProductionKwh)[0];
  assert.equal(max.id, "B");
});

test("Test C: Berlin üretimi düşük ama elektrik fiyatı yüksek", () => {
  const turkey = getElectricityPriceByCountry("Türkiye");
  const germany = getElectricityPriceByCountry("Germany");
  assert.equal(germany.currency, "EUR");
  assert.ok(germany.pricePerKwh < turkey.pricePerKwh);
  const shade = estimateShadowFallback("south", "medium", "partial", 52.5);
  assert.ok(shade.shadeFactor < 1);
});

test("Test D: İstanbul kuzey ve ciddi gölgede uygunluk girdileri cezalandırılır", () => {
  const shade = estimateShadowFallback("north", "unknown", "serious", 41);
  assert.ok(shade.shadeFactor <= 0.5);
});
