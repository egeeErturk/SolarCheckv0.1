import { DIRECTION_FACTORS, SLOPE_FACTORS } from "./constants.js";
import { getElectricityPriceByCountry } from "./electricityPrices.js";
import { fetchOpenMeteoSolarData } from "./openMeteo.js";
import { calculatePackageResults, recommendBestPackage } from "./packageRecommendations.js";
import { fetchShadeMapData } from "./shadeMap.js";
import { estimateShadowFallback } from "./shadowEstimation.js";
import type { SolarCalculationInput, SolarPotentialResult } from "./types.js";

export async function calculateSolarPotential(input: SolarCalculationInput): Promise<SolarPotentialResult> {
  const country = input.location.address?.country;
  const electricityPrice = getElectricityPriceByCountry(country, input.electricityPriceOverride);
  const monthlyConsumption =
    input.monthlyConsumptionKwh ??
    (input.monthlyBillAmount ? Math.round(input.monthlyBillAmount / electricityPrice.pricePerKwh) : 250);

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
  const orientationFactor = DIRECTION_FACTORS[input.direction] * SLOPE_FACTORS[input.slope];
  const effectiveRadiation = solarData.annualRadiationKwhPerSqm * orientationFactor;
  const packages = calculatePackageResults(input, effectiveRadiation, shadeData.shadeFactor, electricityPrice.pricePerKwh);
  const recommendedPackage = recommendBestPackage(packages);

  const suitabilityScore = Math.round(
    Math.max(
      10,
      Math.min(
        98,
        30 +
          shadeData.shadeFactor * 28 +
          DIRECTION_FACTORS[input.direction] * 22 +
          SLOPE_FACTORS[input.slope] * 8 +
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

  return {
    suitabilityScore,
    annualRadiationKwhPerSqm: Math.round(effectiveRadiation),
    radiationSource: solarData.source,
    shadeSource: shadeData.source,
    estimatedMonthlyConsumptionKwh: monthlyConsumption,
    electricityPrice,
    recommendedPackage,
    packages,
    notes
  };
}
