import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { usePersistFn } from "@/hooks/usePersistFn";
import { cn } from "@/lib/utils";

export type MapPosition = { lat: number; lng: number };

interface MapViewProps {
  className?: string;
  initialCenter?: MapPosition;
  initialZoom?: number;
  onMapReady?: (map: L.Map) => void;
}

export function MapView({
  className,
  initialCenter = { lat: 37.7749, lng: -122.4194 },
  initialZoom = 12,
  onMapReady,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const ready = usePersistFn((readyMap: L.Map) => onMapReady?.(readyMap));

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const instance = L.map(mapContainer.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView([initialCenter.lat, initialCenter.lng], initialZoom);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    }).addTo(instance);

    map.current = instance;
    ready?.(instance);
    window.setTimeout(() => instance.invalidateSize(), 0);

    return () => {
      instance.remove();
      map.current = null;
    };
  }, [initialCenter.lat, initialCenter.lng, initialZoom, ready]);

  return <div ref={mapContainer} className={cn("w-full h-[500px]", className)} />;
}
