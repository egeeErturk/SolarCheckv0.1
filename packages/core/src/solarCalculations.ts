import { DIRECTION_FACTORS, SLOPE_FACTORS } from "./constants.js";
import { getElectricityPriceByCountry } from "./electricityPrices.js";
import { fetchOpenMeteoSolarData } from "./openMeteo.js";
import { calculatePackageResults, recommendBestPackage } from "./packageRecommendations.js";
import { fetchShadeMapData } from "./shadeMap.js";
import { estimateShadowFallback } from "./shadowEstimation.js";
import type { RoofDirection, RoofSlope, SolarCalculationInput, SolarPotentialResult } from "./types.js";

const DEG_TO_RAD = Math.PI / 180;
const MONTH_DAY_OF_YEAR = [15, 46, 74, 105, 135, 166, 196, 227, 258, 288, 319, 349];
const MONTH_RADIATION_WEIGHTS = [0.055, 0.066, 0.087, 0.098, 0.108, 0.116, 0.12, 0.112, 0.093, 0.077, 0.055, 0.041];

const SLOPE_DEFAULT_TILT: Record<RoofSlope, number> = {
  flat: 5,
  low: 15,
  medium: 30,
  steep: 45,
  unknown: 30
};

const DIRECTION_AZIMUTH_DEGREES: Record<RoofDirection, number> = {
  north: 0,
  east: 90,
  southeast: 135,
  south: 180,
  southwest: 225,
  west: 270,
  unknown: 180
};

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
  const roofTiltDegrees = normalizeRoofTilt(input.roofTilt, input.slope);
  const roofTiltFactor = estimatePlaneOfArrayFactor(roofTiltDegrees, input.direction, input.location.latitude);
  const effectiveTiltFactor = Number.isFinite(roofTiltFactor) ? roofTiltFactor : SLOPE_FACTORS[input.slope];
  const orientationFactor = DIRECTION_FACTORS[input.direction] * effectiveTiltFactor;
  const effectiveRadiation = solarData.annualRadiationKwhPerSqm * orientationFactor;
  const packages = calculatePackageResults(input, effectiveRadiation, shadeData.shadeFactor, electricityPrice.pricePerKwh);
  const recommendedPackage = recommendBestPackage(packages);
  const tiltLossPercent = Math.max(0, Math.round((1 - Math.min(effectiveTiltFactor, 1)) * 100));

  const suitabilityScore = Math.round(
    Math.max(
      10,
      Math.min(
        98,
        30 +
          shadeData.shadeFactor * 28 +
          DIRECTION_FACTORS[input.direction] * 22 +
          Math.min(1.08, effectiveTiltFactor) * 8 +
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

  notes.push(`Çatı eğimi ${roofTiltDegrees} derece olarak hesaba katıldı; panel yüzeyi ışınım katsayısı ${effectiveTiltFactor.toFixed(2)}.`);

  return {
    suitabilityScore,
    annualRadiationKwhPerSqm: Math.round(effectiveRadiation),
    roofTiltDegrees,
    roofTiltFactor: Number(effectiveTiltFactor.toFixed(3)),
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

function estimatePlaneOfArrayFactor(roofTiltDegrees: number, direction: RoofDirection, latitudeDegrees: number) {
  const latitude = Number.isFinite(latitudeDegrees) ? latitudeDegrees : 39;
  const panelAzimuth = DIRECTION_AZIMUTH_DEGREES[direction] * DEG_TO_RAD;
  const sunAzimuth = latitude >= 0 ? Math.PI : 0;
  const tilt = roofTiltDegrees * DEG_TO_RAD;
  const weightedRatio = MONTH_DAY_OF_YEAR.reduce((sum, dayOfYear, index) => {
    const declination = 23.45 * Math.sin(((360 * (284 + dayOfYear)) / 365) * DEG_TO_RAD);
    const zenithDegrees = Math.max(0, Math.min(88, Math.abs(latitude - declination)));
    const zenith = zenithDegrees * DEG_TO_RAD;
    const cosIncidence =
      Math.cos(tilt) * Math.cos(zenith) +
      Math.sin(tilt) * Math.sin(zenith) * Math.cos(panelAzimuth - sunAzimuth);
    const horizontalIrradiance = Math.max(0.18, Math.cos(zenith));
    const surfaceIrradiance = Math.max(0, cosIncidence);
    return sum + (surfaceIrradiance / horizontalIrradiance) * MONTH_RADIATION_WEIGHTS[index];
  }, 0);
  return Math.max(0.55, Math.min(1.22, weightedRatio));
}
