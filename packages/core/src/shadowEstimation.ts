import { DIRECTION_FACTORS, FALLBACK_SHADE_FACTORS, SLOPE_FACTORS } from "./constants.js";
import type { RoofDirection, RoofSlope, ShadeData, ShadeObstacle } from "./types.js";

const shadeMessages: Record<ShadeObstacle, string> = {
  open: "Gölge etkisi düşük kabul edildi; alan yılın büyük bölümünde güneş alıyor.",
  partial: "Günün belli saatlerinde oluşabilecek gölge için güvenli bir kayıp varsayımı kullanıldı.",
  building: "Yakındaki yüksek bina etkisi için sabah/akşam üretim kaybı hesaba katıldı.",
  tree: "Ağaç gölgesi için mevsimsel yaprak ve gölge etkisi hesaba katıldı.",
  serious: "Ciddi gölge etkisi için daha korumacı bir üretim tahmini kullanıldı.",
  unknown: "Gölge bilgisi belirsiz olduğu için güvenli bir tahmin yapıldı."
};

export function estimateShadowFallback(
  direction: RoofDirection,
  slope: RoofSlope,
  obstacle: ShadeObstacle,
  latitude?: number
): ShadeData {
  const latitudeAdjustment = typeof latitude === "number" && Math.abs(latitude) > 50 ? 0.95 : 1;
  const raw =
    FALLBACK_SHADE_FACTORS[obstacle] *
    Math.max(0.72, DIRECTION_FACTORS[direction]) *
    Math.max(0.9, SLOPE_FACTORS[slope]) *
    latitudeAdjustment;
  return {
    shadeFactor: Number(Math.max(0.35, Math.min(1, raw)).toFixed(2)),
    source: "Tahmini fallback model",
    message: shadeMessages[obstacle]
  };
}
