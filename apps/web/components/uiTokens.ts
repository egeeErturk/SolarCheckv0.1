export const resultColors = {
  profitGreen: "#16A34A",
  profitGreenStrong: "#22C55E",
  profitGreenSoft: "#DCFCE7",
  lossBlue: "#2563EB",
  lossBlueSoft: "#DBEAFE",
  lossNavy: "#003B71",
  lossNavySoft: "#EAF4FF",
  breakEvenYellow: "#FDB913",
  energyYellow: "#FDB913",
  productionYellow: "#FACC15",
  corporateNavy: "#003B71",
  warningOrange: "#F97316",
  warningOrangeSoft: "#FFF1E8",
  softBlue: "#EAF4FF",
  softYellow: "#FFF7D6",
  background: "#F8FAFC",
  card: "#FFFFFF",
  textDark: "#0F172A",
  textMuted: "#64748B",
  gridLine: "#CBD5E1"
} as const;

export const motionClasses = {
  fadeUp: "animate-enter",
  staggerContainer: "animate-stagger",
  scaleTap: "active:scale-[0.97]",
  chartReveal: "animate-chart-reveal",
  barGrow: "animate-bar-grow",
  softPop: "animate-soft-pop"
} as const;

export function financialTone(value: number): "profit" | "loss" {
  return value >= 0 ? "profit" : "loss";
}

export function financialColor(value: number): string {
  return value >= 0 ? resultColors.profitGreenStrong : resultColors.lossNavy;
}

export function financialSoftColor(value: number): string {
  return value >= 0 ? resultColors.profitGreenSoft : resultColors.lossNavySoft;
}
