import type { RoofDirection, RoofSlope, ShadeData } from "./types.js";

function scoreToFactor(score: number): number {
  if (score >= 90) return 0.95;
  if (score >= 75) return 0.88;
  if (score >= 55) return 0.75;
  if (score >= 35) return 0.6;
  return 0.4;
}

export async function fetchShadeMapData(
  latitude: number,
  longitude: number,
  direction: RoofDirection,
  slope: RoofSlope,
  apiKey?: string
): Promise<ShadeData | null> {
  if (!apiKey) return null;

  try {
    const params = new URLSearchParams({
      lat: latitude.toString(),
      lng: longitude.toString(),
      direction,
      slope
    });
    const response = await fetch(`https://api.shademap.app/v1/solar-exposure?${params.toString()}`, {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    if (!response.ok) return null;
    const data = (await response.json()) as {
      annualSunExposure?: number;
      sunlightScore?: number;
      source?: "ShadeMap API" | "Shadowmap API";
    };
    const score = data.sunlightScore ?? data.annualSunExposure;
    if (typeof score !== "number") return null;
    return {
      shadeFactor: scoreToFactor(score),
      source: data.source ?? "ShadeMap API",
      message: "Gölge katsayısı gerçek gölge/güneşlenme servisinden alındı."
    };
  } catch {
    return null;
  }
}
