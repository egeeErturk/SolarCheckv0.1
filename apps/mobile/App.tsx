import {
  calculateSolarPotential,
  geocodeAddress,
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
import * as Location from "expo-location";
import { Check, Leaf, MapPin, Phone, Search, Sun, Zap } from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import MapView, { Marker, Region } from "react-native-maps";

type Step = "home" | "location" | "area" | "roof" | "results";

const orange = "#f58220";
const ink = "#182434";

export default function App() {
  const [step, setStep] = useState<Step>("home");
  const [location, setLocation] = useState<LocationInput>({
    latitude: 40.1553,
    longitude: 26.4142,
    address: { country: "Türkiye", city: "Çanakkale", line: "Çanakkale, Türkiye" }
  });
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Array<Address & { latitude: number; longitude: number }>>([]);
  const [area, setArea] = useState("10");
  const [usageType, setUsageType] = useState<UsageType>("balcony");
  const [monthlyConsumption, setMonthlyConsumption] = useState("250");
  const [direction, setDirection] = useState<RoofDirection>("south");
  const [slope, setSlope] = useState<RoofSlope>("medium");
  const [shadeObstacle, setShadeObstacle] = useState<ShadeObstacle>("open");
  const [result, setResult] = useState<SolarPotentialResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [leadPackage, setLeadPackage] = useState<PackageResult | null>(null);

  const region: Region = {
    latitude: location.latitude,
    longitude: location.longitude,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08
  };

  async function searchAddress() {
    try {
      setSuggestions(await geocodeAddress(query));
    } catch {
      Alert.alert("Adres bulunamadı", "Adres arama servisine ulaşılamadı.");
    }
  }

  async function useCurrentLocation() {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert("Konum izni verilmedi", "Adres arama ile devam edebilirsin.");
      return;
    }
    const current = await Location.getCurrentPositionAsync({});
    setLocation({
      ...location,
      latitude: current.coords.latitude,
      longitude: current.coords.longitude
    });
  }

  async function calculate() {
    setLoading(true);
    const solar = await calculateSolarPotential({
      location,
      usableAreaSqm: Number(area) || 1,
      usageType,
      direction,
      slope,
      shadeObstacle,
      monthlyConsumptionKwh: Number(monthlyConsumption) || 250,
      daytimeConsumption: "partial"
    });
    setResult(solar);
    setLoading(false);
    setStep("results");
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.logo}><Sun color="white" size={20} /></View>
        <View>
          <Text style={styles.brand}>SolarCheck</Text>
          <Text style={styles.caption}>Güneş enerjisi ön fizibilite</Text>
        </View>
      </View>
      {step === "home" && <HomeScreen onStart={() => setStep("location")} />}
      {step === "location" && (
        <LocationPickerScreen
          region={region}
          location={location}
          setLocation={setLocation}
          query={query}
          setQuery={setQuery}
          suggestions={suggestions}
          searchAddress={searchAddress}
          useCurrentLocation={useCurrentLocation}
          onNext={() => setStep("area")}
        />
      )}
      {step === "area" && (
        <AreaAndUsageScreen
          area={area}
          setArea={setArea}
          usageType={usageType}
          setUsageType={setUsageType}
          monthlyConsumption={monthlyConsumption}
          setMonthlyConsumption={setMonthlyConsumption}
          onNext={() => setStep("roof")}
        />
      )}
      {step === "roof" && (
        <RoofDirectionScreen
          direction={direction}
          setDirection={setDirection}
          slope={slope}
          setSlope={setSlope}
          shadeObstacle={shadeObstacle}
          setShadeObstacle={setShadeObstacle}
          loading={loading}
          onCalculate={calculate}
        />
      )}
      {step === "results" && result && <ResultsScreen result={result} openLead={setLeadPackage} />}
      {leadPackage && <LeadFormScreen pkg={leadPackage} address={location.address} onClose={() => setLeadPackage(null)} />}
    </SafeAreaView>
  );
}

function HomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>SolarCheck</Text>
        <Text style={styles.heroText}>Balkonun veya çatının güneş potansiyelini hesapla, sana en uygun güneş paneli paketini öğren.</Text>
        <Text style={styles.body}>Konumunu seç, kullanabileceğin alanı ve aylık elektrik tüketimini gir. SolarCheck yıllık üretim, tasarruf ve paket önerisini hesaplar.</Text>
        <Pressable style={styles.primaryButton} onPress={onStart}><Text style={styles.primaryText}>Hemen Hesapla</Text></Pressable>
        <Text style={styles.captionLight}>Sonuçlar ön fizibilite amaçlıdır. Kesin teklif için ücretsiz keşif yapılır.</Text>
      </View>
    </ScrollView>
  );
}

function LocationPickerScreen(props: {
  region: Region;
  location: LocationInput;
  setLocation: (location: LocationInput) => void;
  query: string;
  setQuery: (value: string) => void;
  suggestions: Array<Address & { latitude: number; longitude: number }>;
  searchAddress: () => void;
  useCurrentLocation: () => void;
  onNext: () => void;
}) {
  return (
    <View style={{ flex: 1 }}>
      <MapView
        style={styles.map}
        region={props.region}
        onPress={(event) => props.setLocation({ ...props.location, latitude: event.nativeEvent.coordinate.latitude, longitude: event.nativeEvent.coordinate.longitude })}
      >
        <Marker draggable coordinate={{ latitude: props.location.latitude, longitude: props.location.longitude }} onDragEnd={(event) => props.setLocation({ ...props.location, latitude: event.nativeEvent.coordinate.latitude, longitude: event.nativeEvent.coordinate.longitude })} />
      </MapView>
      <View style={styles.sheet}>
        <View style={styles.searchRow}>
          <TextInput value={props.query} onChangeText={props.setQuery} placeholder="Adres ara" style={styles.input} />
          <Pressable style={styles.iconButton} onPress={props.searchAddress}><Search color="white" size={18} /></Pressable>
        </View>
        {props.suggestions.slice(0, 3).map((item) => (
          <Pressable key={`${item.latitude}-${item.longitude}`} style={styles.suggestion} onPress={() => props.setLocation({ latitude: item.latitude, longitude: item.longitude, address: item })}>
            <Text style={styles.suggestionText}>{item.line}</Text>
          </Pressable>
        ))}
        <Text style={styles.body}>{props.location.address?.line || "Haritada bir nokta seçildi"}</Text>
        <Text style={styles.caption}>Koordinatlar: {props.location.latitude.toFixed(5)}, {props.location.longitude.toFixed(5)}</Text>
        <Pressable style={styles.secondaryButton} onPress={props.useCurrentLocation}><Text style={styles.secondaryText}>Mevcut konumumu kullan</Text></Pressable>
        <Pressable style={styles.primaryButton} onPress={props.onNext}><Text style={styles.primaryText}>Bu konumu kullan</Text></Pressable>
      </View>
    </View>
  );
}

function AreaAndUsageScreen(props: {
  area: string;
  setArea: (value: string) => void;
  usageType: UsageType;
  setUsageType: (value: UsageType) => void;
  monthlyConsumption: string;
  setMonthlyConsumption: (value: string) => void;
  onNext: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Title title="Alan ve tüketim" />
      <TextInput style={styles.input} keyboardType="numeric" value={props.area} onChangeText={props.setArea} placeholder="Kullanılabilir alan, m²" />
      <Text style={styles.caption}>Balkon için 3-10 m², teras/çatı için 10 m² ve üzeri olabilir.</Text>
      <OptionRow value={props.usageType} onChange={props.setUsageType} options={[
        ["balcony", "Balkon"],
        ["terrace", "Teras"],
        ["roof", "Çatı"],
        ["shared", "Ortak alan"]
      ]} />
      <TextInput style={styles.input} keyboardType="numeric" value={props.monthlyConsumption} onChangeText={props.setMonthlyConsumption} placeholder="Aylık tüketim, kWh" />
      <Text style={styles.caption}>Elektrik tüketiminizi faturanızdaki tüketim detaylarında görebilirsiniz.</Text>
      <Pressable style={styles.primaryButton} onPress={props.onNext}><Text style={styles.primaryText}>Devam et</Text></Pressable>
    </ScrollView>
  );
}

function RoofDirectionScreen(props: {
  direction: RoofDirection;
  setDirection: (value: RoofDirection) => void;
  slope: RoofSlope;
  setSlope: (value: RoofSlope) => void;
  shadeObstacle: ShadeObstacle;
  setShadeObstacle: (value: ShadeObstacle) => void;
  loading: boolean;
  onCalculate: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Title title="Cephe, eğim ve gölge" />
      <Text style={styles.label}>Cephe</Text>
      <OptionRow value={props.direction} onChange={props.setDirection} options={[
        ["south", "Güney"],
        ["southeast", "Güneydoğu"],
        ["southwest", "Güneybatı"],
        ["east", "Doğu"],
        ["west", "Batı"],
        ["north", "Kuzey"],
        ["unknown", "Bilmiyorum"]
      ]} />
      <Text style={styles.label}>Eğim</Text>
      <OptionRow value={props.slope} onChange={props.setSlope} options={[
        ["flat", "Düz"],
        ["low", "Az eğimli"],
        ["medium", "Orta eğimli"],
        ["steep", "Dik"],
        ["unknown", "Bilmiyorum"]
      ]} />
      <Text style={styles.label}>Yılın büyük bölümünde güneşi kapatan engel var mı?</Text>
      <OptionRow value={props.shadeObstacle} onChange={props.setShadeObstacle} options={[
        ["open", "Açık alan"],
        ["partial", "Kısmen"],
        ["serious", "Ciddi gölge"],
        ["unknown", "Emin değilim"]
      ]} />
      <Pressable style={styles.primaryButton} onPress={props.onCalculate} disabled={props.loading}>
        {props.loading ? <ActivityIndicator color="white" /> : <Text style={styles.primaryText}>Sonuçları hesapla</Text>}
      </Pressable>
    </ScrollView>
  );
}

function ResultsScreen({ result, openLead }: { result: SolarPotentialResult; openLead: (pkg: PackageResult) => void }) {
  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Title title="Ön fizibilite sonucu" />
      <View style={styles.metrics}>
        <Metric icon={<Sun color={orange} />} label="Skor" value={`${result.suitabilityScore}/100`} />
        <Metric icon={<Zap color={orange} />} label="Üretim" value={`${result.recommendedPackage.annualProductionKwh} kWh`} />
        <Metric icon={<Leaf color={orange} />} label="CO₂" value={`${result.recommendedPackage.co2ReductionKg} kg`} />
      </View>
      <Text style={styles.warning}>Bu sonuçlar ön fizibilite amaçlı yaklaşık tahminlerdir. Kesin teklif için profesyonel keşif, elektrik projesi ve yerel mevzuat kontrolü gerekir.</Text>
      {result.packages.map((pkg) => (
        <View key={pkg.id} style={[styles.packageCard, pkg.id === result.recommendedPackage.id && styles.recommended]}>
          <Text style={styles.packageTitle}>{pkg.name} - {pkg.tag}</Text>
          <Text style={styles.body}>{pkg.description}</Text>
          <Text style={styles.body}>Kurulu güç: {pkg.installedPowerKwp} kWp</Text>
          <Text style={styles.body}>Yıllık tasarruf: {pkg.annualSavings} {result.electricityPrice.currency}</Text>
          <Text style={styles.body}>Amortisman: {pkg.paybackYears ?? "-"} yıl</Text>
          <Pressable style={styles.secondaryButton} onPress={() => openLead(pkg)}><Text style={styles.secondaryText}>Bu pakete teklif al</Text></Pressable>
        </View>
      ))}
      <Text style={styles.caption}>Gölge verisi: {result.shadeSource} | Radyasyon: {result.radiationSource}</Text>
    </ScrollView>
  );
}

function LeadFormScreen({ pkg, address, onClose }: { pkg: PackageResult; address?: Partial<Address>; onClose: () => void }) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  return (
    <Modal transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modal}>
          <Phone color={orange} />
          <Text style={styles.title}>Teklif/keşif talebi</Text>
          <Text style={styles.caption}>Seçilen paket: {pkg.name}</Text>
          <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="Ad soyad" />
          <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Telefon" />
          <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="E-posta" />
          <Pressable style={styles.primaryButton} onPress={async () => {
            await submitLeadForm({ fullName, phone, email, city: address?.city || "", district: address?.district || "", selectedPackage: pkg.id });
            Alert.alert("Talep alındı", "MVP akışında lead console.log ile kaydedildi.");
            onClose();
          }}><Text style={styles.primaryText}>Gönder</Text></Pressable>
          <Pressable style={styles.secondaryButton} onPress={onClose}><Text style={styles.secondaryText}>Kapat</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}

function Title({ title }: { title: string }) {
  return <Text style={styles.title}>{title}</Text>;
}

function OptionRow<T extends string>({ value, onChange, options }: { value: T; onChange: (value: T) => void; options: Array<[T, string]> }) {
  return (
    <View style={styles.optionGrid}>
      {options.map(([optionValue, label]) => (
        <Pressable key={optionValue} style={[styles.option, value === optionValue && styles.optionActive]} onPress={() => onChange(optionValue)}>
          <Text style={[styles.optionText, value === optionValue && styles.optionTextActive]}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={styles.metric}>
      {icon}
      <Text style={styles.caption}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f6f7fb" },
  header: { flexDirection: "row", gap: 12, alignItems: "center", padding: 16, backgroundColor: "white", borderBottomWidth: 1, borderColor: "#e5e7eb" },
  logo: { width: 38, height: 38, borderRadius: 8, backgroundColor: orange, alignItems: "center", justifyContent: "center" },
  brand: { fontSize: 20, fontWeight: "900", color: ink },
  caption: { color: "#64748b", fontSize: 12, lineHeight: 18 },
  captionLight: { color: "#fff7ed", fontSize: 13, lineHeight: 20, marginTop: 14 },
  screen: { padding: 16, gap: 14 },
  hero: { backgroundColor: ink, borderRadius: 8, padding: 22, minHeight: 520, justifyContent: "center" },
  heroTitle: { color: "white", fontSize: 44, fontWeight: "900" },
  heroText: { color: "white", fontSize: 22, fontWeight: "800", lineHeight: 30, marginTop: 16 },
  body: { color: "#475569", fontSize: 14, lineHeight: 22 },
  title: { fontSize: 28, fontWeight: "900", color: ink },
  label: { fontWeight: "900", color: ink, marginTop: 8 },
  input: { backgroundColor: "white", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 8, padding: 13, fontSize: 15 },
  primaryButton: { backgroundColor: orange, borderRadius: 8, padding: 15, alignItems: "center", marginTop: 6 },
  primaryText: { color: "white", fontWeight: "900", fontSize: 16 },
  secondaryButton: { borderColor: "#e2e8f0", borderWidth: 1, borderRadius: 8, padding: 13, alignItems: "center", marginTop: 6 },
  secondaryText: { color: ink, fontWeight: "900" },
  iconButton: { backgroundColor: ink, borderRadius: 8, width: 48, alignItems: "center", justifyContent: "center" },
  searchRow: { flexDirection: "row", gap: 8 },
  map: { flex: 1 },
  sheet: { position: "absolute", left: 12, right: 12, bottom: 12, backgroundColor: "white", borderRadius: 8, padding: 14, gap: 8 },
  suggestion: { padding: 10, backgroundColor: "#fff7ed", borderRadius: 8 },
  suggestionText: { color: ink, fontSize: 12 },
  optionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  option: { borderWidth: 1, borderColor: "#e2e8f0", backgroundColor: "white", borderRadius: 8, paddingVertical: 11, paddingHorizontal: 12 },
  optionActive: { backgroundColor: "#fff7ed", borderColor: orange },
  optionText: { color: "#475569", fontWeight: "800" },
  optionTextActive: { color: orange },
  metrics: { flexDirection: "row", gap: 10 },
  metric: { flex: 1, backgroundColor: "white", borderRadius: 8, padding: 12 },
  metricValue: { color: ink, fontWeight: "900", fontSize: 17 },
  warning: { backgroundColor: "#fffbeb", color: "#92400e", borderRadius: 8, padding: 12, lineHeight: 22, fontWeight: "700" },
  packageCard: { backgroundColor: "white", borderRadius: 8, padding: 14, gap: 6 },
  recommended: { borderWidth: 2, borderColor: orange },
  packageTitle: { color: ink, fontWeight: "900", fontSize: 18 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(13,22,36,0.6)", justifyContent: "center", padding: 16 },
  modal: { backgroundColor: "white", borderRadius: 8, padding: 18, gap: 12 }
});
