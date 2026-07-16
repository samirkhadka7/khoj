'use client'

import 'leaflet/dist/leaflet.css'
import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { Check, X } from 'lucide-react'

/**
 * Map picker dialog — Leaflet + OpenStreetMap.
 * Loaded via next/dynamic with `{ ssr: false }` so the `window`-dependent
 * Leaflet code never runs on the server.
 */

// Fix the default marker icon — Webpack mangles asset paths so we re-bind them.
// Inline SVG keeps the bundle slim (no PNG round-trip).
const customIcon = L.icon({
  iconUrl:
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="44" viewBox="0 0 32 44">
  <path d="M16 0C7.2 0 0 7.2 0 16c0 11.5 16 28 16 28s16-16.5 16-28C32 7.2 24.8 0 16 0z" fill="#1D9E75"/>
  <circle cx="16" cy="16" r="6" fill="white"/>
</svg>`),
  iconSize: [32, 44],
  iconAnchor: [16, 44],
  popupAnchor: [0, -44],
})

interface MapPickerProps {
  open: boolean
  initialLat: number
  initialLng: number
  onPick: (lat: number, lng: number) => void
  onClose: () => void
}

export default function MapPicker({
  open,
  initialLat,
  initialLng,
  onPick,
  onClose,
}: MapPickerProps) {
  const [lat, setLat] = useState(initialLat)
  const [lng, setLng] = useState(initialLng)

  // Sync when reopened with new initial coords
  useEffect(() => {
    if (open) {
      setLat(initialLat)
      setLng(initialLng)
    }
  }, [open, initialLat, initialLng])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[700px] bg-white rounded-lg overflow-hidden"
        style={{ boxShadow: '0 24px 64px rgba(0,0,0,.25)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <div className="font-display font-extrabold text-[16px] text-gray-800">
              Pick exact location
            </div>
            <div className="text-[12px] text-gray-400 mt-0.5">
              Click on the map or drag the pin
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="h-[420px] w-full">
          <MapContainer
            center={[lat, lng]}
            zoom={13}
            scrollWheelZoom
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ClickHandler onClick={(la, lo) => { setLat(la); setLng(lo) }} />
            <DraggableMarker lat={lat} lng={lng} onMove={(la, lo) => { setLat(la); setLng(lo) }} />
          </MapContainer>
        </div>

        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-gray-100 bg-gray-50">
          <div className="text-[12.5px] text-gray-600 font-mono tabular-nums">
            <span className="text-gray-400">lat </span>
            {lat.toFixed(6)}
            <span className="text-gray-400 ml-3">lng </span>
            {lng.toFixed(6)}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 bg-white border-[1.5px] border-gray-200 rounded-sm font-semibold text-[13px] text-gray-800 hover:border-gray-400 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onPick(lat, lng)
                onClose()
              }}
              className="h-9 px-5 bg-primary text-white border-none rounded-sm font-bold text-[13px] flex items-center gap-1.5 hover:bg-dark transition-colors"
            >
              <Check size={13} strokeWidth={2.5} />
              Use this location
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

function DraggableMarker({
  lat,
  lng,
  onMove,
}: {
  lat: number
  lng: number
  onMove: (lat: number, lng: number) => void
}) {
  return (
    <Marker
      position={[lat, lng]}
      icon={customIcon}
      draggable
      eventHandlers={{
        dragend(e) {
          const m = e.target as L.Marker
          const p = m.getLatLng()
          onMove(p.lat, p.lng)
        },
      }}
    />
  )
}
