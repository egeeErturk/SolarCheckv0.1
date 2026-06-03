import { FALLBACK_RADIATION_BY_COUNTRY } from "./constants.js";
import { normalizeCountry } from "./electricityPrices.js";
import type { SolarData } from "./types.js";

function fallbackSolarData(country?: string): SolarData {
  const normalized = normalizeCountry(country);
  return {
    annualRadiationKwhPerSqm: FALLBACK_RADIATION_BY_COUNTRY[normalized] ?? FALLBACK_RADIATION_BY_COUNTRY.Diğer,
    source: "Bölgesel fallback"
  };
}

export async function fetchOpenMeteoSolarData(
  latitude: number,
  longitude: number,
  country?: string
): Promise<SolarData> {
  try {
    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      start_date: "2025-01-01",
      end_date: "2025-12-31",
      hourly: "shortwave_radiation",
      timezone: "auto"
    });
    const response = await fetch(`https://archive-api.open-meteo.com/v1/archive?${params.toString()}`);
    if (!response.ok) return fallbackSolarData(country);
    const data = (await response.json()) as { hourly?: { shortwave_radiation?: number[] } };
    const hourly = data.hourly?.shortwave_radiation?.filter((value) => Number.isFinite(value)) ?? [];
    if (!hourly.length) return fallbackSolarData(country);
    const annualRadiationKwhPerSqm = hourly.reduce((sum, wattsPerSqm) => sum + wattsPerSqm / 1000, 0);
    return {
      annualRadiationKwhPerSqm: Math.round(annualRadiationKwhPerSqm),
      source: "Open-Meteo"
    };
  } catch {
    return fallbackSolarData(country);
  }
}
