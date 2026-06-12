import { DIRECTION_FACTORS } from "./constants.js";
import { estimateMonthlyConsumptionFromBill, getElectricityPriceByCountry } from "./electricityPrices.js";
import { fetchOpenMeteoSolarData } from "./openMeteo.js";
import { calculatePackageResults, recommendBestPackage } from "./packageRecommendations.js";
import { fetchShadeMapData } from "./shadeMap.js";
import { estimateShadowFallback } from "./shadowEstimation.js";
import type { RoofSlope, SolarCalculationInput, SolarPotentialResult } from "./types.js";

const SLOPE_DEFAULT_TILT: Record<RoofSlope, number> = {
  flat: 5,
  low: 15,
  medium: 30,
  steep: 45,
  unknown: 30
};

export async function calculateSolarPotential(input: SolarCalculationInput): Promise<SolarPotentialResult> {
  const country = input.location.address?.country;
  const electricityPrice = getElectricityPriceByCountry(country, input.electricityPriceOverride);
  const monthlyConsumption =
    input.monthlyConsumptionKwh ??
    estimateMonthlyConsumptionFromBill(country, input.monthlyBillAmount ?? 0, input.electricityPriceOverride) ??
    250;

  const [solarData, shadeApiData] = await Promise.all([
    fetchOpenMeteoSolarData(input.location.latitude, input.location.longitude, country),
    fetchShadeMapData(
      input.location.latitude,
      input.location.longitude,
      input.direction,
      input.slope,
      input.shadeApiKey
    )
  ]);

  const shadeData =
    shadeApiData ??
    estimateShadowFallback(input.direction, input.slope, input.shadeObstacle, input.location.latitude);
  const roofTiltDegrees = normalizeRoofTilt(input.roofTilt, input.slope);
  const flatRoofRadiation = solarData.annualRadiationKwhPerSqm;
  const roofTiltFactor = 1;
  const packages = calculatePackageResults(input, flatRoofRadiation, shadeData.shadeFactor, electricityPrice.pricePerKwh);
  const recommendedPackage = recommendBestPackage(packages);
  const tiltLossPercent = 0;

  const suitabilityScore = Math.round(
    Math.max(
      10,
      Math.min(
        98,
        30 +
          shadeData.shadeFactor * 28 +
          DIRECTION_FACTORS[input.direction] * 22 +
          Math.min(1.08, roofTiltFactor) * 8 +
          Math.min(12, input.usableAreaSqm)
      )
    )
  );

  const notes = [
    shadeData.message,
    solarData.source === "Open-Meteo"
      ? "Güneş radyasyonu Open-Meteo yıllık saatlik veriden hesaplandı."
      : "Open-Meteo erişilemezse bölgesel güvenli varsayım kullanılır."
  ];

  if (monthlyConsumption * 12 < recommendedPackage.annualProductionKwh) {
    notes.push("Seçilen sistem yıllık tüketimin üzerine çıkabilir; keşifte mahsuplaşma ve mevzuat kontrol edilmelidir.");
  }

  if (input.direction === "north" || ["building", "tree", "serious"].includes(input.shadeObstacle)) {
    notes.push("Kuzey cephe veya belirgin gölge nedeniyle daha küçük ve esnek paketler daha mantıklı olabilir.");
  }

  notes.push(`Radyasyon, seçilen çatı konumunda yatay düz yüzey varsayımıyla hesaplandı; ${roofTiltDegrees} derece çatı eğimi radyasyon değerini değiştirmedi.`);

  return {
    suitabilityScore,
    annualRadiationKwhPerSqm: Math.round(flatRoofRadiation),
    roofTiltDegrees,
    roofTiltFactor,
    tiltLossPercent,
    radiationSource: solarData.source,
    shadeSource: shadeData.source,
    estimatedMonthlyConsumptionKwh: monthlyConsumption,
    electricityPrice,
    recommendedPackage,
    packages,
    notes
  };
}

function normalizeRoofTilt(value: number | undefined, slope: RoofSlope) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return SLOPE_DEFAULT_TILT[slope];
  return Math.max(0, Math.min(90, parsed));
}
