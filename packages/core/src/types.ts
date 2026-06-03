export type UsageType = "balcony" | "terrace" | "roof" | "shared";
export type RoofDirection =
  | "south"
  | "southeast"
  | "southwest"
  | "east"
  | "west"
  | "north"
  | "unknown";
export type RoofSlope = "flat" | "low" | "medium" | "steep" | "unknown";
export type ShadeObstacle = "open" | "partial" | "building" | "tree" | "serious" | "unknown";
export type ShadeSource =
  | "ShadeMap API"
  | "Shadowmap API"
  | "Harita simülasyonu"
  | "Tahmini fallback model";

export interface Address {
  country: string;
  city: string;
  district: string;
  neighborhood: string;
  line: string;
}

export interface LocationInput {
  latitude: number;
  longitude: number;
  address?: Partial<Address>;
}

export interface SolarCalculationInput {
  location: LocationInput;
  usableAreaSqm: number;
  usageType: UsageType;
  direction: RoofDirection;
  slope: RoofSlope;
  shadeObstacle: ShadeObstacle;
  monthlyConsumptionKwh?: number;
  monthlyBillAmount?: number;
  daytimeConsumption: "yes" | "partial" | "no";
  electricityPriceOverride?: number;
  shadeApiKey?: string;
}

export interface ElectricityPrice {
  country: string;
  pricePerKwh: number;
  currency: "TRY" | "EUR" | "USD" | "GBP";
  source: "fallback" | "override";
  label: string;
}

export interface SolarData {
  annualRadiationKwhPerSqm: number;
  source: "Open-Meteo" | "Bölgesel fallback";
}

export interface ShadeData {
  shadeFactor: number;
  source: ShadeSource;
  message: string;
}

export interface PackageAssumption {
  id: "A" | "B" | "C" | "D";
  name: string;
  tag: string;
  bestCriterion: string;
  areaPowerKwpPerSqm: number;
  systemEfficiency: number;
  costMultiplier: number;
  areaUsageRatio: number;
  description: string;
}

export interface PackageResult extends PackageAssumption {
  usedAreaSqm: number;
  installedPowerKwp: number;
  annualProductionKwh: number;
  annualSavings: number;
  installationCost: number;
  paybackYears: number | null;
  netGain25Years: number;
  co2ReductionKg: number;
  recommendationWeight: number;
}

export interface SolarPotentialResult {
  suitabilityScore: number;
  annualRadiationKwhPerSqm: number;
  radiationSource: SolarData["source"];
  shadeSource: ShadeSource;
  estimatedMonthlyConsumptionKwh: number;
  electricityPrice: ElectricityPrice;
  recommendedPackage: PackageResult;
  packages: PackageResult[];
  notes: string[];
}

export interface LeadData {
  fullName: string;
  phone: string;
  email: string;
  city: string;
  district: string;
  selectedPackage: "A" | "B" | "C" | "D";
  note?: string;
}
