"use client";

import {
  calculateSolarPotential,
  geocodeAddress,
  reverseGeocodeLocation,
  submitLeadForm,
  type Address,
  type LocationInput,
  type PackageResult,
  type RoofDirection,
  type RoofSlope,
  type ShadeObstacle,
  type SolarPotentialResult,
  type UsageType
} from "@solarcheck/core";
import {
  ArrowLeft,
  ArrowUp,
  BadgeCheck,
  BarChart3,
  Building2,
  Calculator,
  Check,
  ChevronRight,
  CircleHelp,
  CloudSun,
  Database,
  Download,
  Gauge,
  Home,
  Landmark,
  Leaf,
  LineChart,
  MapPin,
  Share2,
  RefreshCcw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Sun,
  TreePine,
  Zap
} from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { financialColor, financialSoftColor, financialTone, motionClasses, resultColors } from "./uiTokens";

const MapPicker = dynamic(() => import("./MapPicker"), { ssr: false });

type Step = "landing" | "location" | "usage" | "solar" | "results";
type DaytimeConsumption = "yes" | "partial" | "no";
type ProjectionPoint = {
  year: number;
  value: number;
  totalProductionKwh: number;
  totalSavings: number;
  totalMaintenance: number;
  totalCost: number;
  installationCost: number;
  paidBack: boolean;
};

const steps: Array<{ id: Step; label: string }> = [
  { id: "location", label: "Konum" },
  { id: "usage", label: "Alan" },
  { id: "solar", label: "Güneş" },
  { id: "results", label: "Sonuç" }
];

const usageOptions: Array<{ value: UsageType; label: string; description: string; icon: ReactNode }> = [
  { value: "balcony", label: "Balkon", description: "Küçük alanlar için kompakt kurulum.", icon: <Home /> },
  { value: "roof", label: "Çatı", description: "En yüksek alan ve üretim potansiyeli.", icon: <Landmark /> },
  { value: "terrace", label: "Teras", description: "Açık ve erişilebilir yüzeyler.", icon: <Sun /> },
  { value: "shared", label: "Site/apartman ortak alanı", description: "Ortak tüketim için toplu çözüm.", icon: <Building2 /> }
];

const directionOptions: Array<{ value: RoofDirection; label: string; description: string; rotate: string }> = [
  { value: "south", label: "Güney", description: "En güçlü üretim potansiyeli.", rotate: "rotate-180" },
  { value: "southeast", label: "Güneydoğu", description: "Sabah güneşini iyi değerlendirir.", rotate: "rotate-[135deg]" },
  { value: "southwest", label: "Güneybatı", description: "Öğleden sonra üretimi güçlüdür.", rotate: "-rotate-[135deg]" },
  { value: "east", label: "Doğu", description: "Sabah saatlerinde daha verimli.", rotate: "rotate-90" },
  { value: "west", label: "Batı", description: "Öğleden sonra güneşini yakalar.", rotate: "-rotate-90" },
  { value: "north", label: "Kuzey", description: "Daha korumacı hesap yapılır.", rotate: "" },
  { value: "unknown", label: "Bilmiyorum", description: "Güvenli varsayımla hesaplanır.", rotate: "rotate-45" }
];

const shadeOptions: Array<{ value: ShadeObstacle; label: string; description: string; icon: ReactNode }> = [
  { value: "open", label: "Hayır, açık alan", description: "Güneşin büyük kısmını alır.", icon: <Sun /> },
  { value: "partial", label: "Kısmen var", description: "Günün belli saatlerinde gölge oluşabilir.", icon: <CloudSun /> },
  { value: "building", label: "Yüksek bina var", description: "Özellikle sabah/akşam üretimi düşürebilir.", icon: <Building2 /> },
  { value: "tree", label: "Ağaç gölgesi var", description: "Mevsimsel gölge ve yaprak etkisi olabilir.", icon: <TreePine /> },
  { value: "unknown", label: "Emin değilim", description: "Tahmini güvenli hesap yapılır.", icon: <CircleHelp /> }
];

const slopeLabels: Record<RoofSlope, string> = {
  flat: "Düz yüzey varsayımı",
  low: "Düşük eğim varsayımı",
  medium: "Standart çatı eğimi varsayımı",
  steep: "Dik eğim varsayımı",
  unknown: "Güvenli eğim varsayımı"
};

const directionLoss: Record<RoofDirection, number> = {
  south: 0,
  southeast: 5,
  southwest: 5,
  east: 15,
  west: 15,
  north: 45,
  unknown: 12
};

const shadeLoss: Record<ShadeObstacle, number> = {
  open: 2,
  partial: 15,
  building: 30,
  tree: 22,
  serious: 35,
  unknown: 20
};

const packageCopy: Record<"A" | "B" | "C" | "D", { tag: string; badge: string; description: string }> = {
  A: {
    tag: "Alan verimliliği",
    badge: "Önerilen",
    description: "Küçük alanlardan yüksek üretim almak isteyenler için."
  },
  B: {
    tag: "Maksimum üretim",
    badge: "En yüksek üretim",
    description: "En yüksek üretim hedefleyen kullanıcılar için."
  },
  C: {
    tag: "Fiyat/performans",
    badge: "Dengeli",
    description: "Üretim ve maliyet arasında dengeli seçenek."
  },
  D: {
    tag: "Başlangıç",
    badge: "Başlangıç",
    description: "Düşük maliyetle güneşe başlamak isteyenler için."
  }
};

const monthFactors = [0.055, 0.066, 0.087, 0.098, 0.108, 0.116, 0.12, 0.112, 0.093, 0.077, 0.055, 0.041];
const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const projectionYears = [5, 10, 15, 20, 25];
const flowLogoSrc = "/flow-energy-logo.jpeg";

const currencyFormat = (value: number, currency: string) =>
  new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0, style: "currency", currency }).format(value);

const numberFormat = (value: number) => new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(value);

function inferSlope(usageType: UsageType): RoofSlope {
  if (usageType === "roof") return "medium";
  if (usageType === "balcony") return "low";
  return "flat";
}

export default function SolarCheckApp() {
  const [step, setStep] = useState<Step>("landing");
  const [locationSelected, setLocationSelected] = useState(false);
  const [location, setLocation] = useState<LocationInput>({
    latitude: 40.1553,
    longitude: 26.4142,
    address: { country: "Türkiye", city: "Çanakkale", district: "", neighborhood: "", line: "Çanakkale, Türkiye" }
  });
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Array<Address & { latitude: number; longitude: number }>>([]);
  const [area, setArea] = useState("10");
  const [usageType, setUsageType] = useState<UsageType>("balcony");
  const [monthlyConsumption, setMonthlyConsumption] = useState("250");
  const [monthlyBill, setMonthlyBill] = useState("");
  const [direction, setDirection] = useState<RoofDirection>("south");
  const [roofTilt, setRoofTilt] = useState("30");
  const [roofTiltError, setRoofTiltError] = useState("");
  const [shadeObstacle, setShadeObstacle] = useState<ShadeObstacle>("open");
  const [daytimeConsumption] = useState<DaytimeConsumption>("partial");
  const [result, setResult] = useState<SolarPotentialResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [leadPackage, setLeadPackage] = useState<PackageResult | null>(null);
  const [leadSent, setLeadSent] = useState(false);

  const addressLine = useMemo(
    () => location.address?.line || [location.address?.city, location.address?.country].filter(Boolean).join(", "),
    [location.address]
  );

  const inferredSlope = inferSlope(usageType);

  async function searchAddress() {
    if (!query.trim()) return;
    try {
      const items = await geocodeAddress(query);
      setSuggestions(items);
    } catch {
      setSuggestions([]);
    }
  }

  async function useCurrentLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        try {
          const address = await reverseGeocodeLocation(latitude, longitude);
          setLocation({ latitude, longitude, address });
        } catch {
          setLocation((current) => ({ ...current, latitude, longitude }));
        }
        setLocationSelected(true);
      },
      () => undefined
    );
  }

  async function calculate() {
    const roofTiltValue = Number(roofTilt);
    if (!Number.isFinite(roofTiltValue) || roofTiltValue < 0 || roofTiltValue > 90) {
      setRoofTiltError("Çatı eğimi 0° ile 90° arasında olmalı.");
      return;
    }
    setRoofTiltError("");
    setLoading(true);
    const consumption = Number(monthlyConsumption);
    const bill = Number(monthlyBill);
    const solar = await calculateSolarPotential({
      location,
      usableAreaSqm: Math.max(1, Number(area) || 1),
      usageType,
      direction,
      slope: inferredSlope,
      roofTilt: roofTiltValue,
      shadeObstacle,
      monthlyConsumptionKwh: consumption > 0 ? consumption : undefined,
      monthlyBillAmount: consumption > 0 ? undefined : bill > 0 ? bill : undefined,
      daytimeConsumption
    });
    await new Promise((resolve) => setTimeout(resolve, 650));
    setResult(solar);
    setStep("results");
    setLoading(false);
  }

  function recalculateFromStart() {
    setResult(null);
    setLeadPackage(null);
    setLeadSent(false);
    setLocationSelected(false);
    setStep("location");
  }

  function editInputs() {
    setResult(null);
    setLeadPackage(null);
    setLeadSent(false);
    setStep("usage");
  }

  useEffect(() => {
    if (step === "landing") return;
    if (typeof window.matchMedia !== "function") return;
    if (!window.matchMedia("(max-width: 767px)").matches) return;
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }, [step]);

  return (
    <main className="min-h-screen bg-solar-page text-ink-900">
      <TopBar step={step} goBack={() => setStep(step === "location" ? "landing" : step === "usage" ? "location" : step === "solar" ? "usage" : "solar")} />
      {step === "landing" && <LandingPage onStart={() => setStep("location")} onDiscovery={() => setStep("location")} />}
      {step === "location" && (
        <LocationPage
          query={query}
          setQuery={setQuery}
          searchAddress={searchAddress}
          suggestions={suggestions}
          selectSuggestion={(item) => {
            setLocation({ latitude: item.latitude, longitude: item.longitude, address: item });
            setLocationSelected(true);
            setSuggestions([]);
            setQuery(item.line);
          }}
          location={location}
          setLocation={(value) => {
            setLocation(value);
            setLocationSelected(true);
          }}
          addressLine={addressLine}
          useCurrentLocation={useCurrentLocation}
          canContinue={locationSelected}
          onNext={() => setStep("usage")}
        />
      )}
      {step === "usage" && (
        <UsagePage
          area={area}
          setArea={setArea}
          usageType={usageType}
          setUsageType={setUsageType}
          monthlyConsumption={monthlyConsumption}
          setMonthlyConsumption={setMonthlyConsumption}
          monthlyBill={monthlyBill}
          setMonthlyBill={setMonthlyBill}
          onNext={() => setStep("solar")}
        />
      )}
      {step === "solar" && (
        <SolarDetailsPage
          direction={direction}
          setDirection={setDirection}
          roofTilt={roofTilt}
          setRoofTilt={setRoofTilt}
          roofTiltError={roofTiltError}
          shadeObstacle={shadeObstacle}
          setShadeObstacle={setShadeObstacle}
          loading={loading}
          onCalculate={calculate}
        />
      )}
      {step === "results" && result && (
        <ResultsPage
          result={result}
          addressLine={addressLine}
          direction={direction}
          shadeObstacle={shadeObstacle}
          inferredSlope={inferredSlope}
          onRecalculate={recalculateFromStart}
          onEditInputs={editInputs}
          openLead={(pkg) => setLeadPackage(pkg)}
        />
      )}
      {leadPackage && (
        <LeadFormModal
          pkg={leadPackage}
          address={location.address}
          sent={leadSent}
          onClose={() => {
            setLeadPackage(null);
            setLeadSent(false);
          }}
          onSubmit={async (event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            await submitLeadForm({
              fullName: String(form.get("fullName") || ""),
              phone: String(form.get("phone") || ""),
              email: String(form.get("email") || ""),
              city: String(form.get("city") || ""),
              district: String(form.get("district") || ""),
              selectedPackage: leadPackage.id,
              note: String(form.get("note") || "")
            });
            setLeadSent(true);
          }}
        />
      )}
    </main>
  );
}

function TopBar({ step, goBack }: { step: Step; goBack: () => void }) {
  const currentIndex = step === "landing" ? -1 : steps.findIndex((item) => item.id === step);
  return (
    <header className="sticky top-0 z-30 border-b border-blue-950/10 bg-white/88 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <FlowEnergyLogo className="header-flow-logo shrink-0" />
          <div>
            <p className="text-lg font-black text-blue-950">SolarCheck</p>
            <p className="text-xs font-semibold text-blue-900/60">Güneş potansiyeli ve teklif ön analizi</p>
          </div>
        </div>
        {step !== "landing" && (
          <div className="hidden flex-1 items-center justify-center gap-2 md:flex">
            {steps.map((item, index) => (
              <div key={item.id} className="flex items-center gap-2">
                <div className="h-2.5 w-16 overflow-hidden rounded-full bg-slate-200">
                  {index <= currentIndex && <div className="h-full rounded-full bg-solar-gradient animate-grow" />}
                </div>
                <span className={`text-xs font-black ${index <= currentIndex ? "text-blue-950" : "text-slate-400"}`}>{item.label}</span>
              </div>
            ))}
          </div>
        )}
        {step !== "landing" && step !== "results" && (
          <button className="btn-ghost flex items-center gap-2" onClick={goBack}>
            <ArrowLeft size={16} /> Geri
          </button>
        )}
      </div>
    </header>
  );
}

function LandingPage({ onStart, onDiscovery }: { onStart: () => void; onDiscovery: () => void }) {
  return (
    <section className="hero-shell relative isolate overflow-hidden">
      <div className="absolute inset-0">
        <div className="hero-grid-bg absolute inset-0" />
      </div>
      <FlowEnergyLogo className="hero-corner-logo absolute right-4 top-4 z-20 sm:right-6 md:right-10 md:top-8" />
      <div className="relative mx-auto grid min-h-[82vh] max-w-7xl items-center gap-10 px-4 pb-14 pt-28 sm:px-6 md:grid-cols-[minmax(0,0.92fr)_minmax(320px,1fr)] md:pb-20 md:pt-24 lg:gap-14">
        <div className="hero-copy max-w-3xl animate-enter text-center text-white md:text-left">
          <h1 className="text-4xl font-black leading-tight md:text-6xl">Güneş yatırımını dakikalar içinde netleştir.</h1>
          <p className="mt-4 inline-flex rounded-full bg-white/12 px-4 py-2 text-sm font-black text-white/90 backdrop-blur">
            Solar fizibilite • Akıllı paket analizi • Uzun vadeli kâr projeksiyonu
          </p>
          <p className="mt-5 max-w-2xl text-lg font-semibold leading-8 text-white/92 md:text-xl">
            Konum, çatı yönü, eğim, gölge ve tüketim verilerini birleştirip üretim, tasarruf ve uzun vadeli kâr projeksiyonunu hesaplayan premium enerji ön analiz deneyimi.
          </p>
          <p className="mt-4 max-w-xl text-base font-bold text-yellow-300">
            Flow Energy marka diliyle uyumlu, hızlı ve güven veren solar karar ekranı.
          </p>
          <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center md:justify-start">
            <button className="btn-primary px-6 py-4 text-base" onClick={onStart}>
              Hemen Hesapla <ChevronRight size={18} />
            </button>
            <button className="btn-light px-6 py-4 text-base" onClick={onDiscovery}>
              Ücretsiz Keşif Al
            </button>
          </div>
          <p className="mt-5 max-w-xl text-sm font-semibold leading-6 text-white/78">
            Sonuçlar ön fizibilite amaçlıdır. Kesin teklif için uzman keşfi önerilir.
          </p>
        </div>
        <div className="hero-brand-panel relative min-h-[260px] md:min-h-[520px]">
          <FlowEnergyBrand />
        </div>
      </div>
      <HowItWorksSection compact />
    </section>
  );
}

function FlowEnergyLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`flow-logo-card ${className}`}>
      <img src={flowLogoSrc} alt="Flow Energy logosu" />
    </div>
  );
}

function FlowEnergyBrand() {
  return (
    <div className="flow-energy-mark">
      <span className="sr-only">FLOW ENERGY</span>
      <span aria-hidden="true" className="flow-word flow-word-main block text-center font-black uppercase italic leading-none text-white md:text-right">
        FLOW
      </span>
      <span aria-hidden="true" className="flow-word flow-word-sub block text-center font-black uppercase italic leading-none md:text-right">
        ENERGY
      </span>
    </div>
  );
}

function HowItWorksSection({ compact = false }: { compact?: boolean }) {
  const items = [
    { icon: <MapPin />, title: "Konum verisi", text: "Haritadan seçtiğiniz konumla enlem, boylam, şehir ve ülke bilgisine ulaşılır." },
    { icon: <Sun />, title: "Güneş verisi", text: "Konuma göre yıllık ve aylık güneş radyasyonu verileri alınır." },
    { icon: <CloudSun />, title: "Cephe ve gölge", text: "Yön ve çevredeki gölge oluşturabilecek engeller üretim hesabına dahil edilir." },
    { icon: <Zap />, title: "Tüketim ve fiyat", text: "Aylık tüketim ve ülkeye göre tahmini elektrik fiyatıyla yıllık tasarruf hesaplanır." },
    { icon: <BarChart3 />, title: "Paket karşılaştırması", text: "Panel A, B, C ve D alan, üretim, maliyet ve geri dönüş açısından karşılaştırılır." },
    { icon: <LineChart />, title: "Uzun vadeli kazanç", text: "5, 10, 15, 20 ve 25 yıllık net kazanç projeksiyonu oluşturulur." }
  ];
  return (
    <section className={compact ? "relative bg-white/95 px-4 py-10" : "rounded-lg bg-white p-5 shadow-soft ring-1 ring-blue-950/5"}>
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <h2 className="text-2xl font-black" style={{ color: resultColors.corporateNavy }}>Nasıl hesaplanıyor?</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            SolarCheck, seçtiğiniz konum ve kullanım alanı üzerinden güneşlenme, cephe yönü, gölge etkisi ve elektrik tüketimini birlikte analiz ederek yaklaşık üretim ve kazanç tahmini yapar.
          </p>
        </div>
        <div className={`${motionClasses.staggerContainer} mt-6 grid gap-3 md:grid-cols-3`}>
          {items.map((item) => (
            <div key={item.title} className="rounded-lg border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-soft">
              <div className="grid h-10 w-10 place-items-center rounded-lg" style={{ background: resultColors.softYellow, color: resultColors.corporateNavy }}>{item.icon}</div>
              <h3 className="mt-3 font-black" style={{ color: resultColors.corporateNavy }}>{item.title}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">{item.text}</p>
            </div>
          ))}
        </div>
        <LocationDataExplanation />
        <p className="mt-4 text-xs font-semibold text-slate-500">Bu hesap kesin teklif değildir, ön fizibilite sağlar.</p>
      </div>
    </section>
  );
}

function LocationDataExplanation() {
  const chips = ["Enlem ve boylam", "Şehir ve ülke", "Bölgesel güneş radyasyonu", "Aylık üretim potansiyeli", "Elektrik fiyatı ülkesi", "Gölge ve cephe analizi"];
  return (
    <div className="mt-5 rounded-lg p-4" style={{ background: resultColors.softBlue }}>
      <h3 className="font-black" style={{ color: resultColors.corporateNavy }}>Konumdan hangi verileri alıyoruz?</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {chips.map((chip) => (
          <span key={chip} className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">{chip}</span>
        ))}
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        Konum bilgisi, panelin yıllık ne kadar güneş enerjisi alabileceğini tahmin etmek için kullanılır. Bu veriler tüketim bilgilerinizle birleştirilerek tasarruf ve geri dönüş süresi hesaplanır.
      </p>
    </div>
  );
}

function LocationPage(props: {
  query: string;
  setQuery: (value: string) => void;
  searchAddress: () => void;
  suggestions: Array<Address & { latitude: number; longitude: number }>;
  selectSuggestion: (item: Address & { latitude: number; longitude: number }) => void;
  location: LocationInput;
  setLocation: (location: LocationInput) => void;
  addressLine: string;
  useCurrentLocation: () => void;
  canContinue: boolean;
  onNext: () => void;
}) {
  return (
    <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[1fr_420px]">
      <div className="hidden min-h-[560px] overflow-hidden rounded-lg bg-white shadow-soft ring-1 ring-blue-950/5 md:block">
        <MapPicker
          latitude={props.location.latitude}
          longitude={props.location.longitude}
          onChange={(value) => props.setLocation({ ...props.location, ...value })}
        />
      </div>
      <div className="mobile-location-map overflow-hidden rounded-lg bg-white shadow-soft ring-1 ring-blue-950/5 md:hidden">
        <MapPicker
          latitude={props.location.latitude}
          longitude={props.location.longitude}
          addressLine={props.addressLine}
          showConfirmationPopup={props.canContinue}
          onConfirmLocation={props.onNext}
          onChange={(value) => props.setLocation({ ...props.location, ...value })}
        />
      </div>
      <aside className="animate-enter self-start rounded-lg bg-white p-5 shadow-soft ring-1 ring-blue-950/5">
        <StepEyebrow icon={<MapPin size={16} />} label="Konum seçimi" />
        <h2 className="mt-3 text-3xl font-black text-blue-950">Haritadan konum seç</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Adres ara, haritaya tıkla veya pini sürükle. Seçilen adres otomatik doldurulur.
        </p>
        <div className="mt-5 flex gap-2">
          <input
            value={props.query}
            onChange={(event) => props.setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") props.searchAddress();
            }}
            className="input"
            placeholder="Şehir, ilçe, mahalle veya adres"
          />
          <button className="btn-icon bg-blue-950 text-white" onClick={props.searchAddress} title="Adres ara">
            <Search size={18} />
          </button>
        </div>
        {!!props.suggestions.length && (
          <div className="mt-3 max-h-56 overflow-auto rounded-lg border border-slate-200">
            {props.suggestions.map((item) => (
              <button
                key={`${item.latitude}-${item.longitude}-${item.line}`}
                className="block w-full border-b border-slate-100 px-3 py-3 text-left text-sm transition hover:bg-yellow-50"
                onClick={() => props.selectSuggestion(item)}
              >
                {item.line}
              </button>
            ))}
          </div>
        )}
        <button className="btn-ghost mt-4 flex w-full items-center justify-center gap-2 py-3" onClick={props.useCurrentLocation}>
          <MapPin size={18} /> Mevcut konumumu kullan
        </button>
        <div className="mt-5 rounded-lg bg-gradient-to-br from-yellow-50 to-blue-50 p-4 text-sm leading-7">
          <p className="font-black text-blue-950">Seçilen adres</p>
          <p>{props.canContinue ? props.addressLine || "Adres çözümleniyor" : "Devam etmek için haritadan veya aramadan konum seçin."}</p>
          <p>Koordinatlar: {props.location.latitude.toFixed(5)}, {props.location.longitude.toFixed(5)}</p>
        </div>
        <button disabled={!props.canContinue} className="btn-primary mt-5 w-full justify-center py-4 disabled:cursor-not-allowed disabled:opacity-50" onClick={props.onNext}>
          Bu konumu kullan <ChevronRight size={18} />
        </button>
      </aside>
    </section>
  );
}

function UsagePage(props: {
  area: string;
  setArea: (value: string) => void;
  usageType: UsageType;
  setUsageType: (value: UsageType) => void;
  monthlyConsumption: string;
  setMonthlyConsumption: (value: string) => void;
  monthlyBill: string;
  setMonthlyBill: (value: string) => void;
  onNext: () => void;
}) {
  return (
    <section className="mx-auto max-w-5xl px-4 py-10">
      <div className="animate-enter">
        <StepEyebrow icon={<Home size={16} />} label="Alan ve tüketim" />
        <h2 className="mt-3 text-3xl font-black text-blue-950">Kurulum alanını ve tüketimini gir</h2>
        <p className="mt-2 max-w-2xl text-slate-600">
          Sadece hesaplama için gerekli bilgileri alıyoruz. Teknik panel detayları arka planda varsayımlarla hesaplanır.
        </p>
      </div>
      <div className="mt-7 grid gap-6">
        <QuestionCard title="Kullanım alanı" description="Panelin kurulabileceği alan türünü seçin.">
          <OptionGrid options={usageOptions} value={props.usageType} onChange={props.setUsageType} columns="md:grid-cols-4" />
        </QuestionCard>
        <QuestionCard
          title="Kullanılabilir alan"
          description="Panel kurulabilecek yaklaşık alanı girin. Balkon için 3-10 m², çatı/teras için 10 m² ve üzeri olabilir."
        >
          <div className="max-w-sm">
            <input type="number" min={1} value={props.area} onChange={(event) => props.setArea(event.target.value)} className="input text-lg font-black" />
            <p className="hint mt-2">Değer m² olarak kullanılacaktır.</p>
          </div>
        </QuestionCard>
        <QuestionCard
          title="Aylık elektrik tüketimi"
          description="Elektrik tüketiminizi faturanızda kWh olarak görebilirsiniz. Genellikle tüketim detayları bölümünde yazar."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <span className="text-sm font-black text-blue-950">Aylık tüketim, kWh</span>
              <input
                type="number"
                min={0}
                value={props.monthlyConsumption}
                onChange={(event) => props.setMonthlyConsumption(event.target.value)}
                className="input mt-2"
                placeholder="Örn. 250"
              />
            </div>
            <div>
              <span className="text-sm font-black text-blue-950">Bilmiyorsan fatura tutarı</span>
              <input
                value={props.monthlyBill}
                onChange={(event) => props.setMonthlyBill(event.target.value)}
                className="input mt-2"
                placeholder="Örn. 850"
              />
              <p className="hint mt-2">Elektrik birim fiyatı ülkeye göre otomatik tahmin edilir.</p>
            </div>
          </div>
        </QuestionCard>
        <button className="btn-primary ml-auto px-6 py-4" onClick={props.onNext}>
          Devam et <ChevronRight size={18} />
        </button>
      </div>
    </section>
  );
}

function SolarDetailsPage(props: {
  direction: RoofDirection;
  setDirection: (value: RoofDirection) => void;
  roofTilt: string;
  setRoofTilt: (value: string) => void;
  roofTiltError: string;
  shadeObstacle: ShadeObstacle;
  setShadeObstacle: (value: ShadeObstacle) => void;
  loading: boolean;
  onCalculate: () => void;
}) {
  return (
    <section className="mx-auto max-w-5xl px-4 py-10">
      <div className="animate-enter">
        <StepEyebrow icon={<Sun size={16} />} label="Güneş etkisi" />
        <h2 className="mt-3 text-3xl font-black text-blue-950">Cephe ve gölge bilgisini seç</h2>
        <p className="mt-2 max-w-2xl text-slate-600">
          Cephe yönü, panelin gün içinde güneşi ne kadar doğrudan alacağını etkiler. Eğim bilgisi otomatik varsayılır.
        </p>
      </div>
      <div className="mt-7 grid gap-6">
        <QuestionCard title="Cephe yönü" description="Bilmiyorsanız güvenli varsayımla hesaplama yapılır.">
          <DirectionGrid value={props.direction} onChange={props.setDirection} />
        </QuestionCard>
        <QuestionCard
          title="Çatı Eğimi (°)"
          description="Panel yüzeyinin yataya göre eğimini derece cinsinden girin. Bilmiyorsanız 30° güvenli bir başlangıç varsayımıdır."
        >
          <div className="max-w-sm">
            <input
              type="number"
              min={0}
              max={90}
              step={1}
              value={props.roofTilt}
              onChange={(event) => props.setRoofTilt(event.target.value)}
              className={`input text-lg font-black ${props.roofTiltError ? "border-blue-700 bg-blue-50" : ""}`}
              aria-invalid={!!props.roofTiltError}
              aria-describedby="roof-tilt-help"
            />
            <p id="roof-tilt-help" className="hint mt-2">Geçerli aralık 0° ile 90° arasındadır.</p>
            {props.roofTiltError && (
              <p className="mt-2 rounded-lg px-3 py-2 text-sm font-black" style={{ background: resultColors.lossNavySoft, color: resultColors.lossNavy }}>
                {props.roofTiltError}
              </p>
            )}
          </div>
        </QuestionCard>
        <QuestionCard
          title="Balkonunuzun veya çatınızın önünde yılın büyük bölümünde güneşi kapatan bir engel var mı?"
          description="Gölge, panel üretimini ciddi şekilde düşürebilir. Çevredeki bina ve ağaçlar hesaba katılır."
        >
          <OptionGrid options={shadeOptions} value={props.shadeObstacle} onChange={props.setShadeObstacle} columns="md:grid-cols-5" />
        </QuestionCard>
        {props.loading && <AnalysisLoading />}
        <button className="btn-primary ml-auto px-6 py-4" onClick={props.onCalculate} disabled={props.loading}>
          {props.loading ? <span className="energy-spinner !h-5 !w-5 !border-2" /> : null}
          {props.loading ? "Analiz ediliyor..." : "Sonuçları hesapla"} <ChevronRight size={18} />
        </button>
      </div>
    </section>
  );
}

function AnalysisLoading() {
  return (
    <div className="analysis-panel animate-enter rounded-lg p-5 shadow-soft">
      <div className="flex items-start gap-4">
        <div className="energy-spinner mt-1" />
        <div>
          <h3 className="text-lg font-black text-blue-950">Sonuçlar hazırlanıyor</h3>
          <div className="mt-3 grid gap-2 text-sm font-semibold text-slate-600">
            <p>Güneş verileri analiz ediliyor...</p>
            <p>Gölge ve cephe etkisi hesaplanıyor...</p>
            <p>Kazanç projeksiyonu hazırlanıyor...</p>
            <p>Panel paketleri karşılaştırılıyor...</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultsPage({
  result,
  addressLine,
  direction,
  shadeObstacle,
  inferredSlope,
  onRecalculate,
  onEditInputs,
  openLead
}: {
  result: SolarPotentialResult;
  addressLine: string;
  direction: RoofDirection;
  shadeObstacle: ShadeObstacle;
  inferredSlope: RoofSlope;
  onRecalculate: () => void;
  onEditInputs: () => void;
  openLead: (pkg: PackageResult) => void;
}) {
  const currency = result.electricityPrice.currency;
  const monthly = getMonthlyProduction(result.recommendedPackage.annualProductionKwh);
  const peak = monthly.reduce((best, item) => (item.value > best.value ? item : best), monthly[0]);
  const low = monthly.reduce((worst, item) => (item.value < worst.value ? item : worst), monthly[0]);
  const gains = getLongTermGains(result.recommendedPackage);
  const losses = getLosses(direction, shadeObstacle, result.tiltLossPercent);
  const net25 = gains[gains.length - 1].value;
  const payback = result.recommendedPackage.paybackYears;
  const paybackTone = !payback || payback > 15 ? "loss" : payback <= 9 ? "profit" : "warning";
  const isPositive = net25 >= 0;
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <div className="animate-enter flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="font-bold text-yellow-600">{addressLine}</p>
          <h2 className="mt-2 text-4xl font-black text-blue-950">
            {isPositive ? "Güneşten kazancınız düşündüğünüzden yüksek olabilir." : "Bu konum için daha dikkatli bir keşif öneriyoruz."}
          </h2>
          <p className="mt-2 max-w-2xl text-slate-600">
            {isPositive
              ? "Seçtiğiniz konuma ve tüketiminize göre sisteminiz uzun vadede ciddi tasarruf sağlayabilir."
              : "Gölge, yön veya düşük tüketim nedeniyle geri dönüş süresi uzayabilir. Uzman keşfiyle daha net sonuç alınabilir."}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="btn-ghost flex items-center gap-2" onClick={() => setShareOpen(true)}>
            <Share2 size={16} /> Paylaş
          </button>
          <button className="btn-primary" onClick={() => openLead(result.recommendedPackage)}>Uzmanla görüş</button>
          <RecalculateButton onClick={onRecalculate} />
          <button className="btn-ghost" onClick={onEditInputs}>Bilgileri düzenle</button>
        </div>
      </div>

      <div className={`${motionClasses.staggerContainer} mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-6`}>
        <Metric icon={<Sun />} label="Genel uygunluk" value={`${result.suitabilityScore}/100`} tone="navy" description="Kurulum potansiyeli" />
        <Metric icon={<Zap />} label="Yıllık üretim" value={`${numberFormat(result.recommendedPackage.annualProductionKwh)} kWh/yıl`} tone="energy" description="Tahmini üretim" />
        <Metric icon={<Sparkles />} label="Yıllık tasarruf" value={`${currencyFormat(result.recommendedPackage.annualSavings, currency)}/yıl`} tone="profit" description="Pozitif finansal etki" />
        <Metric icon={<BadgeCheck />} label="25 yıllık net kazanç" value={`${currencyFormat(net25, currency)} net`} tone={financialTone(net25)} description={net25 >= 0 ? "Uzun vadeli kazanç" : "Negatif net sonuç"} />
        <Metric icon={<ShieldCheck />} label="Amortisman süresi" value={payback ? `${payback} yıl` : "Geri dönüş yok"} tone={paybackTone} description={paybackTone === "profit" ? "Makul geri dönüş" : paybackTone === "warning" ? "Keşifte netleşmeli" : "Ekonomik risk"} />
        <Metric icon={<Leaf />} label="CO₂ azaltımı" value={`${numberFormat(result.recommendedPackage.co2ReductionKg)} kg`} tone="navy" description="Çevresel etki" />
      </div>

      <InfoBand>
        <b>En güçlü dönem:</b> Bu konum için en yüksek üretim {peak.month} ayında bekleniyor. En verimli dönem Mayıs-Ağustos arasıdır.
        Kış aylarında güneş açısı ve gün uzunluğu nedeniyle üretim düşebilir.
      </InfoBand>

      <div className="mt-10 -mx-4 px-4 md:-mx-6 md:px-6">
        <ProfitProjectionLineChart gains={gains} currency={currency} paybackYears={result.recommendedPackage.paybackYears} />
      </div>
      <div className="mt-6">
        <LossBreakdownChart losses={losses} />
      </div>

      <MonthlyProductionChart monthly={monthly} peak={peak} low={low} className="mt-8" />

      <PanelPackageGrid packages={result.packages} currency={currency} openLead={openLead} />

      <PackageComparisonChart packages={result.packages} currency={currency} />

      <AnimatedResultSection className="mt-8">
        <ResultCalculationSummary />
      </AnimatedResultSection>
      <AnimatedResultSection className="mt-6">
        <HowItWorksSection />
      </AnimatedResultSection>

      <details className="mt-8 rounded-lg bg-white p-5 shadow-soft ring-1 ring-blue-950/5">
        <summary className="cursor-pointer font-black text-blue-950">Varsayımları göster</summary>
        <ul className="mt-4 list-inside list-disc text-sm leading-7 text-slate-600">
          <li>Elektrik fiyatı: {result.electricityPrice.label} ({result.electricityPrice.pricePerKwh} {currency}/kWh)</li>
          <li>Radyasyon verisi: {result.radiationSource}</li>
          <li>Çatı eğimi: {result.roofTiltDegrees}°</li>
          <li>Panel yüzeyi ışınım katsayısı: {result.roofTiltFactor} (eğim kaynaklı kayıp: %{result.tiltLossPercent})</li>
          <li>Eğim: {slopeLabels[inferredSlope]}</li>
          <li>Panel üretimi her yıl %0.5 azalır; bakım maliyeti ve elektrik fiyatı yıllara göre artar.</li>
          {result.notes.map((note) => <li key={note}>{note}</li>)}
        </ul>
      </details>

      <section className="mt-8 rounded-lg p-7 text-white shadow-soft" style={{ background: resultColors.corporateNavy }}>
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <h3 className="text-3xl font-black">Güneşe geçmek için ilk adımı atın.</h3>
            <p className="mt-3 max-w-2xl text-white/78">
              Uzman ekibimiz çatınızı veya balkonunuzu değerlendirerek size en uygun panel paketini netleştirsin.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="btn-primary" onClick={() => openLead(result.recommendedPackage)}>Ücretsiz keşif talep et</button>
            <button className="btn-light" onClick={() => openLead(result.recommendedPackage)}>Teklif iste</button>
            <button className="btn-outline-light" onClick={() => openLead(result.recommendedPackage)}>Uzmanla görüş</button>
            <button className="btn-outline-light" onClick={onRecalculate}>Gene hesapla</button>
          </div>
        </div>
      </section>
      {shareOpen && (
        <ShareResultsModal
          result={result}
          addressLine={addressLine}
          currency={currency}
          gains={getProjectionForYears(result.recommendedPackage, [5, 10, 15, 20, 25, 30])}
          losses={losses}
          onClose={() => setShareOpen(false)}
        />
      )}
    </section>
  );
}

function ShareResultsModal({
  result,
  addressLine,
  currency,
  gains,
  losses,
  onClose
}: {
  result: SolarPotentialResult;
  addressLine: string;
  currency: string;
  gains: ProjectionPoint[];
  losses: ReturnType<typeof getLosses>;
  onClose: () => void;
}) {
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareText = `SolarCheck ile çatımın/balkonumun güneş enerjisi potansiyelini hesapladım. Tahmini üretim, geri dönüş süresi ve uzun vadeli tasarruf sonuçlarımı buradan inceleyebilirsiniz: ${shareUrl}`;

  async function copyText(text: string, message: string) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setError("");
      setFeedback(message);
    } catch {
      setError("Kopyalama sırasında bir hata oluştu. Lütfen tekrar deneyin.");
    }
  }

  function downloadPdf() {
    setIsGeneratingPdf(true);
    setError("");
    try {
      const pdf = createSolarReportPdf({ result, addressLine, currency, gains, losses });
      const url = URL.createObjectURL(pdf);
      const link = document.createElement("a");
      link.href = url;
      link.download = "solarcheck-flow-energy-raporu.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setFeedback("PDF raporu indirildi.");
    } catch {
      setError("PDF oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setIsGeneratingPdf(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-blue-950/60 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="share-results-title">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-auto rounded-lg bg-white p-5 shadow-2xl ring-1 ring-blue-950/10 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="inline-flex rounded-full px-3 py-1 text-xs font-black" style={{ background: resultColors.softYellow, color: resultColors.corporateNavy }}>Paylaşım</span>
            <h3 id="share-results-title" className="mt-3 text-2xl font-black text-blue-950">Sonuçlarını Paylaş</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">Linki, hazır paylaşım metnini veya PDF raporunu güvenle paylaşabilirsiniz.</p>
          </div>
          <button className="btn-ghost px-3 py-2" onClick={onClose}>Kapat</button>
        </div>

        <div className="mt-5 grid gap-4">
          <section className="rounded-lg border border-slate-100 bg-slate-50 p-4">
            <label className="text-sm font-black text-blue-950" htmlFor="share-link">Paylaşım linki</label>
            <input id="share-link" readOnly className="input mt-2 text-sm" value={shareUrl} />
            <button className="btn-primary mt-3 w-full py-3 md:w-auto" onClick={() => copyText(shareUrl, "Paylaşım linki kopyalandı.")}>
              Linki Kopyala
            </button>
          </section>

          <section className="rounded-lg border border-slate-100 bg-white p-4 shadow-sm">
            <label className="text-sm font-black text-blue-950" htmlFor="share-message">Hazır paylaşım metni</label>
            <textarea id="share-message" readOnly className="input mt-2 min-h-28 text-sm leading-6" value={shareText} />
            <button className="btn-ghost mt-3 w-full py-3 md:w-auto" onClick={() => copyText(shareText, "Paylaşım metni kopyalandı.")}>
              Metni Kopyala
            </button>
          </section>

          <section className="rounded-lg border border-yellow-200 p-4" style={{ background: resultColors.softYellow }}>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h4 className="font-black text-blue-950">PDF raporu</h4>
                <p className="mt-1 text-sm leading-6 text-slate-700">Konum, üretim, amortisman, kazanç projeksiyonu ve kayıp yüzdeleri dahil edilir.</p>
              </div>
              <button className="btn-primary py-3" onClick={downloadPdf} disabled={isGeneratingPdf}>
                <Download size={16} /> {isGeneratingPdf ? "Hazırlanıyor..." : "PDF Olarak İndir"}
              </button>
            </div>
          </section>
        </div>

        {feedback && <p className="mt-4 rounded-lg px-4 py-3 text-sm font-black" style={{ background: resultColors.profitGreenSoft, color: resultColors.profitGreen }}>{feedback}</p>}
        {error && <p className="mt-4 rounded-lg px-4 py-3 text-sm font-black" style={{ background: resultColors.lossNavySoft, color: resultColors.lossNavy }}>{error}</p>}
      </div>
    </div>
  );
}

function ProfitProjectionLineChart({ gains, currency, paybackYears }: { gains: ProjectionPoint[]; currency: string; paybackYears: number | null }) {
  const final = gains[gains.length - 1];
  const chart = getSmoothLineChart(gains);
  const lineColor = financialColor(final.value);
  const zeroStop = Math.max(0, Math.min(100, (chart.zeroY / 360) * 100));
  return (
    <ChartCard
      title="25 Yıllık Kâr / Zarar Projeksiyonu"
      subtitle="Bu grafik, sistemin yıllar içinde ilk yatırım maliyetini ne zaman geri kazandırabileceğini ve uzun vadede ne kadar net kazanç sağlayabileceğini gösterir."
      badge="İnteraktif"
      className="profit-chart-card"
    >
      <div className={`${motionClasses.chartReveal} mt-6 grid gap-6 2xl:grid-cols-[minmax(0,1fr)_340px]`}>
        <div className="relative min-h-[380px] rounded-lg border border-slate-100 bg-slate-50/70 p-4 md:min-h-[500px]">
          <svg className="h-[340px] w-full overflow-visible md:h-[460px]" viewBox="0 0 720 360" role="img" aria-label="Uzun vadeli net kazanç çizgi grafiği">
            <defs>
              <linearGradient id="profit-area" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={lineColor} stopOpacity="0.24" />
                <stop offset="100%" stopColor={lineColor} stopOpacity="0.02" />
              </linearGradient>
              <linearGradient id="profit-loss-stroke" x1="0" x2="0" y1="0" y2="360" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor={resultColors.profitGreenStrong} />
                <stop offset={`${zeroStop}%`} stopColor={resultColors.profitGreenStrong} />
                <stop offset={`${zeroStop}%`} stopColor={resultColors.lossNavy} />
                <stop offset="100%" stopColor={resultColors.lossNavy} />
              </linearGradient>
            </defs>
            <line x1="54" x2="674" y1={chart.zeroY} y2={chart.zeroY} stroke={resultColors.breakEvenYellow} strokeDasharray="5 6" />
            <text x="58" y={Math.max(18, chart.zeroY - 8)} className="fill-slate-500 text-[12px] font-black">Başabaş çizgisi</text>
            <path className="profit-area-path" d={`${chart.areaPath} L ${chart.points[chart.points.length - 1].x} ${chart.zeroY} L ${chart.points[0].x} ${chart.zeroY} Z`} fill="url(#profit-area)" />
            <path className="profit-line-path" d={chart.path} fill="none" stroke="url(#profit-loss-stroke)" strokeWidth="4" strokeLinecap="round" />
            {chart.points.map((point) => {
              return (
                <g key={point.year} className="chart-svg-point">
                  <line className="profit-reference-line" x1={point.x} x2={point.x} y1="32" y2="302" stroke={resultColors.gridLine} strokeDasharray="4 5" />
                  <circle cx={point.x} cy={point.y} r="8" fill={financialColor(point.value)} stroke={resultColors.card} strokeWidth="3" />
                  <foreignObject x={Math.min(466, Math.max(58, point.x - 130))} y={Math.min(150, Math.max(28, point.y - 112))} width="260" height="166" className="pointer-events-none opacity-0 transition-opacity duration-150 chart-svg-tooltip">
                    <ProfitProjectionTooltip point={point} currency={currency} />
                  </foreignObject>
                </g>
              );
            })}
            {chart.points.map((point) => (
              <text key={`label-${point.year}`} x={point.x} y="342" textAnchor="middle" className="profit-year-label fill-slate-500 text-[14px] font-black">
                {point.year}Y
              </text>
            ))}
            <BreakEvenMarker paybackYears={paybackYears} paybackX={chart.paybackX} />
          </svg>
        </div>
        <ProfitYearSummaryCards gains={gains} currency={currency} />
      </div>
      <p className="mt-5 text-sm leading-6 text-slate-600">
        Pozitif net kazançlar yeşil, negatif net sonuçlar mavi gösterilir. Hesap elektrik fiyatı artışı, bakım gideri ve panel üretim düşüşü varsayımlarını içerir.
      </p>
    </ChartCard>
  );
}

function ProfitProjectionTooltip({ point, currency }: { point: ProjectionPoint; currency: string }) {
  const netTone = financialTone(point.value);
  const netLabel = `${point.value >= 0 ? "+" : ""}${currencyFormat(point.value, currency)} ${point.value >= 0 ? "kâr" : "zarar"}`;
  return (
    <div className="rounded-lg border bg-white p-3 text-left text-[11px] leading-5 shadow-soft" style={{ borderColor: financialSoftColor(point.value), color: resultColors.textDark }}>
      <p className="text-sm font-black" style={{ color: resultColors.corporateNavy }}>{point.year}. yıl</p>
      <p>Toplam üretim: <b>{numberFormat(point.totalProductionKwh)} kWh</b></p>
      <p>Toplam tasarruf: <b>{currencyFormat(point.totalSavings, currency)}</b></p>
      <p>Toplam maliyet: <b>{currencyFormat(point.totalCost, currency)}</b></p>
      <p>Başlangıç yatırımı: <b>{currencyFormat(point.installationCost, currency)}</b></p>
      <p className="font-black" style={{ color: financialColor(point.value) }}>Net durum: {netLabel}</p>
      <p className="font-bold" style={{ color: netTone === "profit" ? resultColors.profitGreen : resultColors.lossNavy }}>
        {point.value >= 0 ? "Potansiyel kâr miktarı" : "Yıllık Tasarruf Kaybı"}
      </p>
    </div>
  );
}

function ProfitYearSummaryCards({ gains, currency }: { gains: ProjectionPoint[]; currency: string }) {
  return (
    <aside className="grid content-start gap-3">
      {gains.map((point) => {
        const isProfit = point.value >= 0;
        const style = getToneStyle(isProfit ? "profit" : "loss");
        return (
          <div key={point.year} className="rounded-lg border p-4 shadow-sm" style={{ background: style.background, borderColor: style.border }}>
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">{point.year} yıl</p>
            <p className="mt-2 text-xl font-black leading-snug" style={{ color: style.color }}>
              {point.value >= 0 ? "+" : ""}{currencyFormat(point.value, currency)}
            </p>
            <p className="mt-1 text-sm font-bold" style={{ color: style.color }}>
              {isProfit ? "Potansiyel kâr miktarı" : "Yıllık Tasarruf Kaybı"}
            </p>
          </div>
        );
      })}
    </aside>
  );
}

function BreakEvenMarker({ paybackYears, paybackX }: { paybackYears: number | null; paybackX: (year: number) => number }) {
  if (!paybackYears || paybackYears > 25) {
    return (
      <foreignObject x="474" y="34" width="192" height="40">
        <div className="rounded-full px-3 py-1 text-xs font-black shadow-sm" style={{ background: resultColors.lossNavySoft, color: resultColors.lossNavy }}>
          25 yıl içinde geri dönüş yok
        </div>
      </foreignObject>
    );
  }
  const x = paybackX(paybackYears);
  return (
    <g>
      <line x1={x} x2={x} y1="32" y2="302" stroke={resultColors.breakEvenYellow} strokeDasharray="5 5" />
      <foreignObject x={Math.min(520, x + 10)} y="34" width="158" height="40">
        <div className="rounded-full px-3 py-1 text-xs font-black shadow-sm" style={{ background: resultColors.softYellow, color: resultColors.corporateNavy }}>
          Amortisman: {paybackYears} yıl
        </div>
      </foreignObject>
    </g>
  );
}

function MonthlyProductionChart({
  monthly,
  peak,
  low,
  className = ""
}: {
  monthly: Array<{ month: string; short: string; value: number }>;
  peak: { month: string; value: number };
  low: { month: string; value: number };
  className?: string;
}) {
  const maxMonthly = Math.max(...monthly.map((item) => item.value), 1);
  return (
    <ChartCard
      title="Aylık üretim grafiği"
      subtitle={`En yüksek üretim ${peak.month}, en düşük üretim ${low.month} ayında bekleniyor.`}
      className={className}
    >
      <div className={`${motionClasses.chartReveal} mt-6 grid gap-5 lg:grid-cols-[1fr_260px]`}>
        <div className="grid min-h-72 grid-cols-12 items-end gap-2 rounded-lg border border-slate-100 bg-slate-50/70 p-4">
          {monthly.map((item) => {
            const isPeak = item.month === peak.month;
            return (
              <div key={item.month} className="chart-item flex h-72 flex-col justify-end gap-2">
                <div
                  className="chart-bar rounded-t-lg"
                  style={{
                    height: `${Math.max(12, (item.value / maxMonthly) * 100)}%`,
                    background: isPeak ? resultColors.productionYellow : resultColors.energyYellow,
                    opacity: isPeak ? 1 : 0.78
                  }}
                />
                <span className="text-center text-[11px] font-bold text-slate-500">{item.short}</span>
                <div className="chart-tooltip border" style={{ borderColor: resultColors.energyYellow }}>
                  <span className="text-sm font-black" style={{ color: resultColors.corporateNavy }}>{item.month}: {numberFormat(item.value)} kWh</span>
                </div>
              </div>
            );
          })}
        </div>
        <ChartHighlightCards
          items={[
            { label: "En verimli dönem", value: "Mayıs - Ağustos", tone: "energy" },
            { label: "En yüksek üretim", value: `${peak.month} • ${numberFormat(peak.value)} kWh`, tone: "energy" },
            { label: "En düşük üretim", value: `${low.month} • ${numberFormat(low.value)} kWh`, tone: "navy" }
          ]}
        />
      </div>
      <p className="mt-5 text-sm leading-6 text-slate-600">
        En düşük ay: {low.month} • {numberFormat(low.value)} kWh. Kış aylarında üretim doğal olarak azalabilir.
      </p>
    </ChartCard>
  );
}

function LossBreakdownChart({ losses }: { losses: ReturnType<typeof getLosses> }) {
  const biggest = losses.items.reduce((max, item) => (item.value > max.value ? item : max), losses.items[0]);
  return (
    <ChartCard
      title="Enerji kayıpları nereden geliyor?"
      subtitle={`Toplam tahmini kayıp: %${losses.totalLoss}. Kullanılabilir üretim: %${100 - losses.totalLoss}.`}
    >
      <div className={`${motionClasses.chartReveal} mt-6 grid gap-3`}>
        {losses.items.map((loss) => (
          <div key={loss.label} className="chart-item grid grid-cols-[1fr_54px] items-center gap-3 text-sm">
            <div>
              <div className="flex justify-between font-bold" style={{ color: resultColors.corporateNavy }}>
                <span>{loss.label}</span>
              </div>
              <div className="mt-1 h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="chart-bar h-full rounded-full"
                  style={{
                    width: `${Math.max(5, loss.value * 2.2)}%`,
                    background: loss.label === biggest.label ? resultColors.warningOrange : resultColors.corporateNavy
                  }}
                />
              </div>
            </div>
            <span className="text-right font-black" style={{ color: loss.label === biggest.label ? resultColors.warningOrange : resultColors.corporateNavy }}>%{loss.value}</span>
            <div className="chart-tooltip">
              <span className="text-sm font-black" style={{ color: resultColors.warningOrange }}>{loss.label}: %{loss.value}</span>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-5 rounded-lg px-3 py-2 text-sm font-black" style={{ background: resultColors.warningOrangeSoft, color: resultColors.warningOrange }}>
        En büyük kayıp: {biggest.label} %{biggest.value}
      </p>
    </ChartCard>
  );
}

function ChartHighlightCards({
  items
}: {
  items: Array<{ label: string; value: string; tone: "profit" | "loss" | "warning" | "energy" | "navy" }>;
}) {
  return (
    <aside className="grid content-start gap-3">
      {items.map((item) => {
        const style = getToneStyle(item.tone);
        return (
          <div key={`${item.label}-${item.value}`} className="rounded-lg border p-4 shadow-sm" style={{ background: style.background, borderColor: style.border }}>
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">{item.label}</p>
            <p className="mt-2 text-lg font-black leading-snug" style={{ color: style.color }}>{item.value}</p>
          </div>
        );
      })}
    </aside>
  );
}

function AnimatedResultSection({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`${motionClasses.fadeUp} ${className}`}>{children}</section>;
}

function ResultCalculationSummary() {
  const badges = [
    { icon: <MapPin size={16} />, label: "Konum" },
    { icon: <Sun size={16} />, label: "Güneş verisi" },
    { icon: <Gauge size={16} />, label: "Tüketim" },
    { icon: <BarChart3 size={16} />, label: "Paket karşılaştırması" }
  ];
  return (
    <div className="rounded-lg bg-white p-5 shadow-soft ring-1 ring-blue-950/5">
      <h3 className="text-xl font-black" style={{ color: resultColors.corporateNavy }}>Bu sonuç nasıl hesaplandı?</h3>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
        Konumunuzdan alınan güneşlenme verileri, cephe yönü, gölge etkisi, kullanılabilir alan ve elektrik tüketiminiz birlikte değerlendirilerek üretim ve kazanç tahmini oluşturuldu.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {badges.map((badge) => (
          <span key={badge.label} className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-black" style={{ background: resultColors.softBlue, color: resultColors.corporateNavy }}>
            {badge.icon} {badge.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function RecalculateButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="btn-ghost flex items-center gap-2" onClick={onClick}>
      <RefreshCcw size={16} /> Gene hesapla
    </button>
  );
}

function PanelPackageGrid({ packages, currency, openLead }: { packages: PackageResult[]; currency: string; openLead: (pkg: PackageResult) => void }) {
  return (
    <div className={`${motionClasses.staggerContainer} mt-8 grid items-stretch gap-6 md:grid-cols-2 xl:grid-cols-4`}>
      {packages.map((pkg) => (
        <PanelPackageCard key={pkg.id} pkg={pkg} currency={currency} recommended={pkg.id === "A"} onLead={() => openLead(pkg)} />
      ))}
    </div>
  );
}

function PanelPackageCard({ pkg, currency, recommended, onLead }: { pkg: PackageResult; currency: string; recommended: boolean; onLead: () => void }) {
  const netTone = financialTone(pkg.netGain25Years);
  const paybackTone = !pkg.paybackYears || pkg.paybackYears > 15 ? "loss" : pkg.paybackYears <= 9 ? "profit" : "warning";
  const copy = packageCopy[pkg.id];
  return (
    <article className={`package-card group flex h-full flex-col p-5 ${recommended ? "ring-2 ring-yellow-400" : ""}`}>
      <section className="visual-section">
        <PanelPackageVisual type={pkg.id} badge={copy.badge} />
      </section>
      <section className="content-section mt-5">
        <div>
          <h3 className="text-2xl font-black text-blue-950">{pkg.name}</h3>
          <p className="mt-1 text-sm font-black text-yellow-600">{copy.tag}</p>
        </div>
        <p className="mt-2 min-h-[48px] text-sm leading-6 text-slate-600">{copy.description}</p>
      </section>
      <section className="metrics-section mt-5 grid gap-3">
        <PackageMetricRow label="Yıllık üretim" value={`${numberFormat(pkg.annualProductionKwh)} kWh/yıl`} />
        <PackageMetricRow label="Yıllık tasarruf" value={`${currencyFormat(pkg.annualSavings, currency)}/yıl`} tone="profit" />
        <PackageMetricRow label="Amortisman" value={pkg.paybackYears ? `${pkg.paybackYears} yıl` : "Geri dönüş yok"} tone={paybackTone} />
        <PackageMetricRow label="25 yıllık net kazanç" value={`${currencyFormat(pkg.netGain25Years, currency)} net`} tone={netTone} />
      </section>
      <PackageDetailsAccordion pkg={pkg} currency={currency} />
      <section className="action-section mt-auto pt-5">
        <button className="btn-primary w-full justify-center py-3" onClick={onLead}>
          Bu panel için teklif al
        </button>
      </section>
    </article>
  );
}

function PackageComparisonChart({ packages, currency }: { packages: PackageResult[]; currency: string }) {
  const rows = [
    { label: "Kullanılan alan", get: (pkg: PackageResult) => `${pkg.usedAreaSqm} m²` },
    { label: "Kurulu güç", get: (pkg: PackageResult) => `${pkg.installedPowerKwp} kWp` },
    { label: "Yıllık üretim", get: (pkg: PackageResult) => `${numberFormat(pkg.annualProductionKwh)} kWh` },
    { label: "Yıllık tasarruf", get: (pkg: PackageResult) => currencyFormat(pkg.annualSavings, currency) },
    { label: "Amortisman", get: (pkg: PackageResult) => `${pkg.paybackYears ?? "-"} yıl` },
    { label: "En iyi olduğu kriter", get: (pkg: PackageResult) => pkg.bestCriterion }
  ];
  return (
    <ChartCard title="Paket karşılaştırma" subtitle="Panel paketlerinin temel üretim ve finans değerleri." className="mt-8">
      <div className="mt-5 overflow-x-auto">
        <div className="grid min-w-[900px] grid-cols-5 border-b border-slate-100 p-4 text-sm font-black" style={{ background: resultColors.softBlue, color: resultColors.corporateNavy }}>
          <span>Kriter</span>
          {packages.map((pkg) => <span key={pkg.id}>{pkg.name}</span>)}
        </div>
        {rows.map((row) => (
          <div key={row.label} className="grid min-w-[900px] grid-cols-5 border-b border-slate-100 p-4 text-sm">
            <span className="font-bold text-slate-600">{row.label}</span>
            {packages.map((pkg) => <span key={pkg.id} className="font-black" style={{ color: resultColors.corporateNavy }}>{row.get(pkg)}</span>)}
          </div>
        ))}
      </div>
      <div className={`${motionClasses.chartReveal} mt-5 grid gap-3 md:grid-cols-4`}>
        {packages.map((pkg) => {
          const maxProduction = Math.max(...packages.map((item) => item.annualProductionKwh), 1);
          return (
            <div key={pkg.id} className="chart-item rounded-lg border border-slate-100 bg-white p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-black" style={{ color: resultColors.corporateNavy }}>{pkg.name}</span>
                <span className="font-black" style={{ color: resultColors.energyYellow }}>{numberFormat(pkg.annualProductionKwh)} kWh/yıl</span>
              </div>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
                <div className="chart-bar h-full rounded-full" style={{ width: `${(pkg.annualProductionKwh / maxProduction) * 100}%`, background: resultColors.energyYellow }} />
              </div>
              <div className="chart-tooltip">
                <span className="text-sm font-black" style={{ color: resultColors.corporateNavy }}>{pkg.name}: {numberFormat(pkg.annualProductionKwh)} kWh/yıl</span>
              </div>
            </div>
          );
        })}
      </div>
    </ChartCard>
  );
}

function PackageMetricRow({ label, value, tone }: { label: string; value: string; tone?: "profit" | "loss" | "warning" }) {
  const color = tone === "profit" ? resultColors.profitGreen : tone === "loss" ? resultColors.lossNavy : tone === "warning" ? resultColors.warningOrange : resultColors.corporateNavy;
  const bg = tone === "profit" ? resultColors.profitGreenSoft : tone === "loss" ? resultColors.lossNavySoft : tone === "warning" ? resultColors.warningOrangeSoft : resultColors.softBlue;
  return (
    <div className="rounded-lg px-3 py-2" style={{ background: bg }}>
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-base font-black leading-tight" style={{ color }}>{value}</p>
    </div>
  );
}

function PackageDetailsAccordion({ pkg, currency }: { pkg: PackageResult; currency: string }) {
  const risk = !pkg.paybackYears || pkg.paybackYears > 15 ? "Yüksek" : pkg.paybackYears <= 9 ? "Düşük" : "Orta";
  return (
    <details className="mt-4 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
      <summary className="cursor-pointer font-black" style={{ color: resultColors.corporateNavy }}>Detayları gör</summary>
      <dl className="mt-3 grid gap-2">
        <Row label="Kullanılan alan" value={`${pkg.usedAreaSqm} m²`} />
        <Row label="Kurulu güç" value={`${pkg.installedPowerKwp} kWp`} />
        <Row label="CO₂ azaltımı" value={`${numberFormat(pkg.co2ReductionKg)} kg`} />
        <Row label="Maliyet" value={currencyFormat(pkg.installationCost, currency)} />
        <Row label="Risk seviyesi" value={risk} tone={risk === "Düşük" ? "profit" : risk === "Yüksek" ? "loss" : "warning"} />
      </dl>
    </details>
  );
}

function LeadFormModal(props: {
  pkg: PackageResult;
  address?: Partial<Address>;
  sent: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-blue-950/65 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl animate-enter rounded-lg bg-white p-5 shadow-soft">
        {props.sent ? (
          <div className="py-8 text-center">
            <Check className="mx-auto text-yellow-500" size={44} />
            <h3 className="mt-4 text-2xl font-black text-blue-950">Talebin alındı</h3>
            <p className="mt-2 text-slate-600">Uzman ekibimiz en kısa sürede seninle iletişime geçecektir.</p>
            <button className="btn-primary mt-6" onClick={props.onClose}>Kapat</button>
          </div>
        ) : (
          <form onSubmit={props.onSubmit} className="grid gap-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-2xl font-black text-blue-950">Teklif / keşif talebi</h3>
                <p className="text-sm text-slate-600">Seçilen paket: {props.pkg.name}</p>
              </div>
              <button type="button" className="btn-ghost" onClick={props.onClose}>Kapat</button>
            </div>
            <input name="fullName" required className="input" placeholder="Ad soyad" />
            <input name="phone" required className="input" placeholder="Telefon" />
            <input name="email" type="email" required className="input" placeholder="E-posta" />
            <div className="grid gap-3 md:grid-cols-2">
              <input name="city" className="input" defaultValue={props.address?.city} placeholder="Şehir" />
              <input name="district" className="input" defaultValue={props.address?.district} placeholder="İlçe" />
            </div>
            <textarea name="note" className="input min-h-24" placeholder="Not" />
            <button className="btn-primary justify-center py-3">
              <Send size={18} /> Gönder
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function DirectionGrid<T extends RoofDirection>({ value, onChange }: { value: T; onChange: (value: T) => void }) {
  return (
    <div className="grid gap-3 md:grid-cols-4">
      {directionOptions.map((option) => (
        <button
          type="button"
          key={option.value}
          className={`option-card relative ${value === option.value ? "option-card-selected" : ""}`}
          onClick={() => onChange(option.value as T)}
        >
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-blue-950">
            {option.value === "unknown" ? <CircleHelp size={20} /> : <ArrowUp className={option.rotate} size={20} />}
          </span>
          {value === option.value && <Check className="absolute right-3 top-3 text-yellow-500" size={18} />}
          <span className="mt-3 block font-black">{option.label}</span>
          <span className="mt-1 block text-xs leading-5 text-slate-500">{option.description}</span>
        </button>
      ))}
    </div>
  );
}

function OptionGrid<T extends string>({
  options,
  value,
  onChange,
  columns = "md:grid-cols-2"
}: {
  options: Array<{ value: T; label: string; description?: string; icon?: ReactNode }>;
  value: T;
  onChange: (value: T) => void;
  columns?: string;
}) {
  return (
    <div className={`grid gap-3 ${columns}`}>
      {options.map((option) => (
        <button
          type="button"
          key={option.value}
          className={`option-card relative ${value === option.value ? "option-card-selected" : ""}`}
          onClick={() => onChange(option.value)}
        >
          {option.icon && <span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-blue-950">{option.icon}</span>}
          {value === option.value && <Check className="absolute right-3 top-3 text-yellow-500" size={18} />}
          <span className="mt-3 block font-black">{option.label}</span>
          {option.description && <span className="mt-1 block text-xs leading-5 text-slate-500">{option.description}</span>}
        </button>
      ))}
    </div>
  );
}

function QuestionCard({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="animate-enter rounded-lg bg-white p-5 shadow-soft ring-1 ring-blue-950/5">
      <h3 className="text-xl font-black text-blue-950">{title}</h3>
      {description && <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function ChartCard({ title, subtitle, children, className = "", badge }: { title: string; subtitle?: string; children: ReactNode; className?: string; badge?: string }) {
  return (
    <section className={`rounded-lg bg-white p-5 shadow-soft ring-1 ring-blue-950/5 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xl font-black text-blue-950">{title}</h3>
        {badge && <span className="rounded-full px-3 py-1 text-xs font-black" style={{ background: resultColors.softYellow, color: resultColors.corporateNavy }}>{badge}</span>}
      </div>
      {subtitle && <p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p>}
      {children}
    </section>
  );
}

function Metric({
  icon,
  label,
  value,
  tone = "energy",
  description
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone?: "energy" | "navy" | "profit" | "loss" | "warning";
  description?: string;
}) {
  const color =
    tone === "profit"
      ? resultColors.profitGreen
      : tone === "loss"
        ? resultColors.lossNavy
        : tone === "warning"
          ? resultColors.warningOrange
          : tone === "navy"
            ? resultColors.corporateNavy
            : resultColors.energyYellow;
  const background =
    tone === "profit"
      ? resultColors.profitGreenSoft
      : tone === "loss"
        ? resultColors.lossNavySoft
        : tone === "warning"
          ? resultColors.warningOrangeSoft
          : tone === "navy"
            ? resultColors.softBlue
            : resultColors.softYellow;
  return (
    <div className="animate-soft-pop rounded-lg bg-white p-4 shadow-soft ring-1 ring-blue-950/5">
      <div className="grid h-10 w-10 place-items-center rounded-lg" style={{ color, background }}>{icon}</div>
      <p className="mt-3 text-xs font-bold uppercase text-slate-500">{label}</p>
      <p className="metric-value mt-1 text-xl font-black" style={{ color }}>{value}</p>
      {description && <p className="mt-1 text-xs font-semibold text-slate-500">{description}</p>}
    </div>
  );
}

function StepEyebrow({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-yellow-100 px-4 py-2 text-sm font-black text-blue-950">
      {icon} {label}
    </div>
  );
}

function InfoBand({ children }: { children: ReactNode }) {
  return (
    <div
      className="mt-7 rounded-lg border p-4 text-sm leading-7"
      style={{ borderColor: resultColors.warningOrange, background: resultColors.warningOrangeSoft, color: resultColors.corporateNavy }}
    >
      {children}
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "profit" | "loss" | "warning" }) {
  const color = tone === "profit" ? resultColors.profitGreen : tone === "loss" ? resultColors.lossNavy : tone === "warning" ? resultColors.warningOrange : resultColors.corporateNavy;
  return (
    <div className="flex justify-between gap-3 border-b border-slate-100 py-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-black" style={{ color }}>{value}</dd>
    </div>
  );
}

function PanelPackageVisual({ type, badge }: { type: "A" | "B" | "C" | "D"; badge: string }) {
  const config = {
    A: { bg: "from-yellow-300 via-blue-700 to-blue-950", label: "Panel A", caption: "Kompakt balkon", grid: "grid-cols-3", scale: "w-36" },
    B: { bg: "from-blue-950 via-blue-900 to-yellow-400", label: "Panel B", caption: "Premium performans", grid: "grid-cols-5", scale: "w-52" },
    C: { bg: "from-blue-800 via-emerald-600 to-yellow-300", label: "Panel C", caption: "Dengeli çatı", grid: "grid-cols-4", scale: "w-44" },
    D: { bg: "from-sky-100 via-blue-500 to-yellow-300", label: "Panel D", caption: "Mini başlangıç", grid: "grid-cols-2", scale: "w-28" }
  }[type];
  return (
    <div className={`panel-visual relative h-[160px] overflow-hidden rounded-lg bg-gradient-to-br ${config.bg} p-4 transition duration-300 md:h-[200px]`}>
      <div className="absolute left-4 top-4 z-10 rounded-full bg-white/95 px-3 py-1 text-xs font-black shadow-sm backdrop-blur" style={{ color: resultColors.corporateNavy }}>{badge}</div>
      <div className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-yellow-300 text-blue-950 shadow-yellow">
        <Sun size={21} />
      </div>
      {type === "A" && <div className="absolute bottom-3 left-5 h-16 w-24 rounded-t-lg bg-white/80" />}
      {type === "C" && <div className="absolute bottom-2 left-8 h-14 w-32 rotate-[-4deg] bg-white/75 [clip-path:polygon(50%_0,100%_45%,100%_100%,0_100%,0_45%)]" />}
      {type === "D" && <div className="absolute bottom-3 left-5 h-10 w-14 rounded border-2 border-white/75" />}
      <div className={`absolute bottom-11 left-7 grid ${config.scale} rotate-[-7deg] ${config.grid} gap-1 rounded-lg bg-blue-950/82 p-2 shadow-2xl`}>
        {Array.from({ length: type === "B" ? 15 : type === "D" ? 4 : 12 }).map((_, index) => (
          <div key={index} className="h-5 rounded bg-sky-300/75 ring-1 ring-white/20" />
        ))}
      </div>
      <div className="absolute bottom-3 left-4 rounded-full bg-blue-950/55 px-3 py-1 text-xs font-black text-white backdrop-blur">{config.caption}</div>
      <div className="pointer-events-none absolute inset-0 translate-x-[-110%] skew-x-[-18deg] bg-white/18 transition duration-700 group-hover:translate-x-[120%]" />
    </div>
  );
}

function getMonthlyProduction(annualProduction: number) {
  return monthFactors.map((factor, index) => ({
    month: monthNames[index],
    short: monthNames[index].slice(0, 3),
    value: Math.round(annualProduction * factor)
  }));
}

function getLongTermGains(pkg: PackageResult): ProjectionPoint[] {
  return getProjectionForYears(pkg, projectionYears);
}

function getProjectionForYears(pkg: PackageResult, years: number[]): ProjectionPoint[] {
  return years.map((year) => {
    let net = -pkg.installationCost;
    let production = pkg.annualProductionKwh;
    let priceValue = pkg.annualSavings / Math.max(pkg.annualProductionKwh, 1);
    let maintenance = pkg.installationCost * 0.018;
    let totalProductionKwh = 0;
    let totalSavings = 0;
    let totalMaintenance = 0;
    for (let currentYear = 1; currentYear <= year; currentYear += 1) {
      const yearlySavings = production * priceValue;
      totalProductionKwh += production;
      totalSavings += yearlySavings;
      totalMaintenance += maintenance;
      net += yearlySavings - maintenance;
      production *= 0.995;
      priceValue *= 1.08;
      maintenance *= 1.1;
    }
    return {
      year,
      value: Math.round(net),
      totalProductionKwh: Math.round(totalProductionKwh),
      totalSavings: Math.round(totalSavings),
      totalMaintenance: Math.round(totalMaintenance),
      totalCost: Math.round(pkg.installationCost + totalMaintenance),
      installationCost: pkg.installationCost,
      paidBack: net >= 0
    };
  });
}

function getToneStyle(tone: "profit" | "loss" | "warning" | "energy" | "navy") {
  if (tone === "profit") {
    return { color: resultColors.profitGreen, background: resultColors.profitGreenSoft, border: resultColors.profitGreenSoft };
  }
  if (tone === "loss") {
    return { color: resultColors.lossNavy, background: resultColors.lossNavySoft, border: resultColors.lossNavySoft };
  }
  if (tone === "warning") {
    return { color: resultColors.warningOrange, background: resultColors.warningOrangeSoft, border: resultColors.warningOrangeSoft };
  }
  if (tone === "energy") {
    return { color: resultColors.corporateNavy, background: resultColors.softYellow, border: resultColors.energyYellow };
  }
  return { color: resultColors.corporateNavy, background: resultColors.softBlue, border: resultColors.softBlue };
}

function getSmoothLineChart(gains: ProjectionPoint[]) {
  const width = 720;
  const height = 360;
  const paddingX = 54;
  const paddingTop = 32;
  const paddingBottom = 62;
  const values = gains.map((item) => item.value);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const span = Math.max(max - min, 1);
  const plotWidth = width - paddingX * 2;
  const plotHeight = height - paddingTop - paddingBottom;
  const toY = (value: number) => paddingTop + ((max - value) / span) * plotHeight;
  const points = gains.map((item, index) => ({
    ...item,
    x: paddingX + (plotWidth / Math.max(1, gains.length - 1)) * index,
    y: toY(item.value)
  }));
  const zeroY = toY(0);
  const path = points.reduce((pathValue, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const previous = points[index - 1];
    const controlDistance = (point.x - previous.x) / 2;
    return `${pathValue} C ${previous.x + controlDistance} ${previous.y}, ${point.x - controlDistance} ${point.y}, ${point.x} ${point.y}`;
  }, "");
  const paybackX = (year: number) => {
    const firstYear = gains[0]?.year ?? 5;
    const lastYear = gains[gains.length - 1]?.year ?? 25;
    const ratio = Math.max(0, Math.min(1, (year - firstYear) / Math.max(1, lastYear - firstYear)));
    return paddingX + plotWidth * ratio;
  };
  return { points, path, areaPath: path, zeroY, paybackX };
}

function getStrongestGainPeriod(gains: ProjectionPoint[]) {
  if (gains.length < 2) return "Yeterli veri yok";
  let best = { label: `${gains[0].year} yıl`, delta: gains[0].value };
  for (let index = 1; index < gains.length; index += 1) {
    const delta = gains[index].value - gains[index - 1].value;
    if (delta > best.delta) {
      best = { label: `${gains[index - 1].year}-${gains[index].year} yıl`, delta };
    }
  }
  return best.label;
}

function getLosses(direction: RoofDirection, shadeObstacle: ShadeObstacle, roofTiltLossPercent = 0) {
  const items = [
    { label: "Gölge kaybı", value: shadeLoss[shadeObstacle] },
    { label: "Cephe/yön kaybı", value: directionLoss[direction] },
    { label: "Çatı eğimi kaybı", value: roofTiltLossPercent },
    { label: "Sıcaklık kaybı", value: 6 },
    { label: "İnverter kaybı", value: 4 },
    { label: "Kablo/bağlantı kaybı", value: 2 },
    { label: "Kirlenme/toz kaybı", value: 3 },
    { label: "Ekonomik kullanılamayan üretim", value: 5 }
  ];
  const totalLoss = Math.min(85, Math.round(items.reduce((sum, item) => sum + item.value, 0)));
  return { items, totalLoss };
}

function createSolarReportPdf({
  result,
  addressLine,
  currency,
  gains,
  losses
}: {
  result: SolarPotentialResult;
  addressLine: string;
  currency: string;
  gains: ProjectionPoint[];
  losses: ReturnType<typeof getLosses>;
}) {
  const pkg = result.recommendedPackage;
  const lines = [
    "SolarCheck / Flow Energy Ön Fizibilite Raporu",
    "",
    `Seçilen konum: ${addressLine || "Belirtilmedi"}`,
    `Kullanılan panel paketi: ${pkg.name}`,
    `Tahmini yıllık üretim: ${numberFormat(pkg.annualProductionKwh)} kWh/yıl`,
    `Geri dönüş süresi: ${pkg.paybackYears ? `${pkg.paybackYears} yıl` : "Geri dönüş yok"}`,
    `Yıllık tasarruf: ${currencyFormat(pkg.annualSavings, currency)}`,
    `25 yıllık net kazanç: ${currencyFormat(pkg.netGain25Years, currency)}`,
    "",
    "5, 10, 15, 20, 25 ve 30 yıllık tahmini kazanç:",
    ...gains.map((point) => `${point.year} yıl: ${point.value >= 0 ? "+" : ""}${currencyFormat(point.value, currency)}`),
    "",
    "Kayıp yüzdeleri / verim kayıpları:",
    ...losses.items.map((loss) => `${loss.label}: %${loss.value}`),
    `Toplam tahmini kayıp: %${losses.totalLoss}`,
    "",
    "Bu sonuçlar tahmini ön fizibilite amacıyla hazırlanmıştır. Karar verme sürecini destekler; kesin teklif ve kurulum kararı için uzman keşfi önerilir."
  ];

  return buildSimplePdf(lines);
}

function buildSimplePdf(lines: string[]) {
  const pageWidth = 595;
  const pageHeight = 842;
  const marginX = 52;
  const firstY = 790;
  const lineHeight = 18;
  const pageLineLimit = 40;
  const pages: string[][] = [[]];

  lines.flatMap((line) => wrapPdfLine(line, 78)).forEach((line) => {
    if (pages[pages.length - 1].length >= pageLineLimit) pages.push([]);
    pages[pages.length - 1].push(line);
  });

  const objects: string[] = [];
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push(`<< /Type /Pages /Kids [${pages.map((_, index) => `${3 + index * 2} 0 R`).join(" ")}] /Count ${pages.length} >>`);

  pages.forEach((pageLines, pageIndex) => {
    const pageObject = 3 + pageIndex * 2;
    const contentObject = pageObject + 1;
    const title = pageIndex === 0 ? pageLines[0] || "SolarCheck Raporu" : "SolarCheck Raporu";
    const contentLines = pageIndex === 0 ? pageLines.slice(1) : pageLines;
    const content = [
      "BT",
      "/F1 16 Tf",
      "0 0.23 0.44 rg",
      `${marginX} ${firstY + 12} Td`,
      `${pdfText(title)} Tj`,
      "/F1 10 Tf",
      "0.05 0.09 0.16 rg",
      ...contentLines.flatMap((line) => [`0 -${lineHeight} Td`, `${pdfText(line)} Tj`]),
      "ET"
    ].join("\n");

    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /Contents ${contentObject} 0 R >>`);
    objects.push(`<< /Length ${utf8Length(content)} >>\nstream\n${content}\nendstream`);
  });

  const header = "%PDF-1.4\n";
  let body = "";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(utf8Length(header + body));
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = utf8Length(header + body);
  const xref = [
    "xref",
    `0 ${objects.length + 1}`,
    "0000000000 65535 f ",
    ...offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `),
    "trailer",
    `<< /Size ${objects.length + 1} /Root 1 0 R >>`,
    "startxref",
    String(xrefOffset),
    "%%EOF"
  ].join("\n");

  return new Blob([header, body, xref], { type: "application/pdf" });
}

function wrapPdfLine(line: string, maxLength: number) {
  if (!line) return [""];
  const words = line.split(" ");
  const wrapped: string[] = [];
  let current = "";
  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLength && current) {
      wrapped.push(current);
      current = word;
    } else {
      current = next;
    }
  });
  if (current) wrapped.push(current);
  return wrapped;
}

function pdfText(value: string) {
  const hex = Array.from(value).map((char) => char.charCodeAt(0).toString(16).padStart(4, "0")).join("");
  return `<FEFF${hex}>`;
}

function utf8Length(value: string) {
  return new TextEncoder().encode(value).length;
}
