import { CO2_KG_PER_KWH, PACKAGE_ASSUMPTIONS, STANDARD_COST_PER_KWP } from "./constants.js";
import { normalizeCountry } from "./electricityPrices.js";
import type { PackageResult, SolarCalculationInput } from "./types.js";

export function calculatePackageResults(
  input: SolarCalculationInput,
  annualRadiationKwhPerSqm: number,
  shadeFactor: number,
  electricityPrice: number
): PackageResult[] {
  const country = normalizeCountry(input.location.address?.country);
  const costBase = STANDARD_COST_PER_KWP[country] ?? STANDARD_COST_PER_KWP.Diğer;
  const usageBonus = input.usageType === "balcony" ? { A: 10, B: -2, C: 0, D: 12 } : { A: 0, B: 9, C: 7, D: -3 };

  return PACKAGE_ASSUMPTIONS.map((pkg) => {
    const usedAreaSqm = input.usableAreaSqm * pkg.areaUsageRatio;
    const installedPowerKwp = usedAreaSqm * pkg.areaPowerKwpPerSqm;
    const annualProductionKwh = annualRadiationKwhPerSqm * installedPowerKwp * pkg.systemEfficiency * shadeFactor;
    const annualSavings = annualProductionKwh * electricityPrice;
    const installationCost = installedPowerKwp * costBase.amount * pkg.costMultiplier;
    const paybackYears = annualSavings > 0 ? installationCost / annualSavings : null;
    const netGain25Years = annualSavings * 25 - installationCost;
    const co2ReductionKg = annualProductionKwh * CO2_KG_PER_KWH;
    const recommendationWeight =
      (annualSavings / Math.max(installationCost, 1)) * 120 +
      Math.min(30, annualProductionKwh / 120) +
      (usageBonus as Record<string, number>)[pkg.id];

    return {
      ...pkg,
      usedAreaSqm: round(usedAreaSqm, 1),
      installedPowerKwp: round(installedPowerKwp, 2),
      annualProductionKwh: Math.round(annualProductionKwh),
      annualSavings: Math.round(annualSavings),
      installationCost: Math.round(installationCost),
      paybackYears: paybackYears ? round(paybackYears, 1) : null,
      netGain25Years: Math.round(netGain25Years),
      co2ReductionKg: Math.round(co2ReductionKg),
      recommendationWeight: round(recommendationWeight, 2)
    };
  });
}

export function recommendBestPackage(packages: PackageResult[]): PackageResult {
  return [...packages].sort((a, b) => b.recommendationWeight - a.recommendationWeight)[0];
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
