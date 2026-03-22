import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

// Fix default marker icons broken by webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom orange rider marker
const riderIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:40px;height:40px;background:#F88000;border-radius:50% 50% 50% 0;
    transform:rotate(-45deg);border:3px solid #fff;
    box-shadow:0 2px 8px rgba(0,0,0,0.3);
    display:flex;align-items:center;justify-content:center;
  ">
    <span style="transform:rotate(45deg);font-size:18px;line-height:1;">🏍️</span>
  </div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -44],
});

export default function LiveMap({ lat, lng, address }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  // Init map once
  useEffect(() => {
    if (mapInstanceRef.current) return;
    mapInstanceRef.current = L.map(mapRef.current, {
      center: [lat, lng],
      zoom: 15,
      zoomControl: true,
      attributionControl: true,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(mapInstanceRef.current);

    markerRef.current = L.marker([lat, lng], { icon: riderIcon })
      .addTo(mapInstanceRef.current)
      .bindPopup(address || 'Your location');
  }, []); // eslint-disable-line

  // Update marker + pan when coords change
  useEffect(() => {
    if (!mapInstanceRef.current || !markerRef.current) return;
    const pos = [lat, lng];
    markerRef.current.setLatLng(pos);
    markerRef.current.setPopupContent(address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    mapInstanceRef.current.panTo(pos, { animate: true, duration: 0.8 });
  }, [lat, lng, address]);

  return (
    <div
      ref={mapRef}
      style={{ width: '100%', height: '300px', borderRadius: '16px', overflow: 'hidden', zIndex: 0 }}
    />
  );
}
