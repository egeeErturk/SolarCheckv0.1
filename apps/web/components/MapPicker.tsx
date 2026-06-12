"use client";

import { reverseGeocodeLocation, type Address } from "@solarcheck/core";
import L from "leaflet";
import { useEffect, useRef } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

interface MapPickerProps {
  latitude: number;
  longitude: number;
  onChange: (location: { latitude: number; longitude: number; address?: Address }) => void;
  addressLine?: string;
  showConfirmationPopup?: boolean;
  onConfirmLocation?: () => void;
}

function FlyTo({ latitude, longitude }: { latitude: number; longitude: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([latitude, longitude], 13, { duration: 0.8 });
  }, [latitude, longitude, map]);
  return null;
}

function ClickHandler({ onChange }: Pick<MapPickerProps, "onChange">) {
  useMapEvents({
    async click(event: L.LeafletMouseEvent) {
      const latitude = event.latlng.lat;
      const longitude = event.latlng.lng;
      try {
        const address = await reverseGeocodeLocation(latitude, longitude);
        onChange({ latitude, longitude, address });
      } catch {
        onChange({ latitude, longitude });
      }
    }
  });
  return null;
}

function SelectedMarker({
  latitude,
  longitude,
  onChange,
  addressLine,
  showConfirmationPopup,
  onConfirmLocation
}: MapPickerProps) {
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (showConfirmationPopup && addressLine) {
      const marker = markerRef.current;
      if (marker && typeof marker.openPopup === "function") {
        marker.openPopup();
      }
    }
  }, [addressLine, latitude, longitude, showConfirmationPopup]);

  return (
    <Marker
      ref={markerRef}
      draggable
      icon={markerIcon}
      position={[latitude, longitude]}
      eventHandlers={{
        async dragend(event: L.LeafletEvent) {
          const marker = event.target as L.Marker;
          const latLng = marker.getLatLng();
          try {
            const address = await reverseGeocodeLocation(latLng.lat, latLng.lng);
            onChange({ latitude: latLng.lat, longitude: latLng.lng, address });
          } catch {
            onChange({ latitude: latLng.lat, longitude: latLng.lng });
          }
        }
      }}
    >
      {showConfirmationPopup && addressLine && onConfirmLocation && (
        <Popup closeButton className="location-confirm-popup" minWidth={210}>
          <div className="grid gap-3">
            <div>
              <p className="text-xs font-black uppercase text-blue-950">Seçilen konum</p>
              <p className="mt-1 text-sm font-semibold leading-5 text-slate-700">{addressLine}</p>
            </div>
            <button type="button" className="btn-primary w-full py-3 text-sm" onClick={onConfirmLocation}>
              Bu konumu kullan
            </button>
          </div>
        </Popup>
      )}
    </Marker>
  );
}

export default function MapPicker({ latitude, longitude, onChange, addressLine, showConfirmationPopup, onConfirmLocation }: MapPickerProps) {
  const safeLatitude = Number.isFinite(latitude) ? latitude : 39.9334;
  const safeLongitude = Number.isFinite(longitude) ? longitude : 32.8597;

  return (
    <MapContainer center={[safeLatitude, safeLongitude]} zoom={12} scrollWheelZoom className="overflow-hidden rounded-lg">
      <TileLayer
        attribution='Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community'
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
      />
      <FlyTo latitude={safeLatitude} longitude={safeLongitude} />
      <ClickHandler onChange={onChange} />
      <SelectedMarker
        latitude={safeLatitude}
        longitude={safeLongitude}
        onChange={onChange}
        addressLine={addressLine}
        showConfirmationPopup={showConfirmationPopup}
        onConfirmLocation={onConfirmLocation}
      />
    </MapContainer>
  );
}
