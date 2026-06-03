# SolarCheck

SolarCheck, balkon ve çatı güneş enerjisi için web ve mobil çalışan bir ön fizibilite ve teklif MVP'sidir.

## Yapı

- `apps/web`: Next.js + React + TypeScript + Tailwind CSS web uygulaması
- `apps/mobile`: Expo + React Native + TypeScript mobil uygulaması
- `packages/core`: Ortak hesaplama, Open-Meteo, ShadeMap/Shadowmap entegrasyon iskeleti, fallback gölge modeli, elektrik fiyatı, paket önerisi ve lead form mantığı

## Kurulum

Bu proje npm workspaces kullanır.

```bash
npm install
```

## Web

```bash
npm run dev
```

veya:

```bash
npm run dev:web
```

Varsayılan adres: `http://localhost:3000`

## Mobil

```bash
npm run dev:mobile
```

Expo Go ile QR kodu okutabilir veya Android/iOS simülatöründen açabilirsin.

## Android APK

`apps/mobile/eas.json` içinde preview profili APK üretecek şekilde ayarlandı.

```bash
cd apps/mobile
eas build -p android --profile preview
```

## Fallback davranışı

- Open-Meteo erişilemezse bölgesel yıllık radyasyon varsayımları kullanılır.
- ShadeMap/Shadowmap API key yoksa tahmini fallback gölge modeli kullanılır.
- Elektrik birim fiyatı ana akışta kullanıcıya sorulmaz; ülkeye göre fallback fiyat uygulanır.
- Lead formu MVP'de `console.log` ile kaydedilir; `submitLeadForm()` ileride API'ye bağlanmaya hazırdır.

## Test

```bash
npm test
```

Testler Çanakkale, Antalya, Berlin ve İstanbul senaryolarındaki temel hesaplama beklentilerini doğrular.
