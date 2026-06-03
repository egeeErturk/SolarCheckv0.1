import type { Address } from "./types.js";

interface NominatimItem {
  lat: string;
  lon: string;
  display_name: string;
  address?: Record<string, string>;
}

function nominatimHeaders(): HeadersInit | undefined {
  return typeof window === "undefined" ? { "User-Agent": "SolarCheck" } : undefined;
}

function toAddress(item: NominatimItem): Address {
  const source = item.address ?? {};
  return {
    country: source.country ?? "",
    city: source.city ?? source.province ?? source.state ?? "",
    district: source.town ?? source.county ?? source.city_district ?? "",
    neighborhood: source.suburb ?? source.neighbourhood ?? source.quarter ?? "",
    line: item.display_name
  };
}

export async function geocodeAddress(query: string): Promise<Array<Address & { latitude: number; longitude: number }>> {
  if (!query.trim()) return [];
  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    addressdetails: "1",
    limit: "5"
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    headers: nominatimHeaders()
  });
  if (!response.ok) throw new Error("Adres arama servisine ulaşılamadı.");
  const items = (await response.json()) as NominatimItem[];
  return items.map((item) => ({
    ...toAddress(item),
    latitude: Number(item.lat),
    longitude: Number(item.lon)
  }));
}

export async function reverseGeocodeLocation(latitude: number, longitude: number): Promise<Address> {
  const params = new URLSearchParams({
    lat: latitude.toString(),
    lon: longitude.toString(),
    format: "jsonv2",
    addressdetails: "1"
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
    headers: nominatimHeaders()
  });
  if (!response.ok) throw new Error("Seçilen konumun adresi alınamadı.");
  return toAddress((await response.json()) as NominatimItem);
}
