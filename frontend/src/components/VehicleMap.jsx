import { useEffect, useRef } from 'react'

const VehicleMap = ({ vehicles }) => {
  const mapRef      = useRef(null)
  const mapInstance = useRef(null)

  useEffect(() => {
    // Step A — Add Leaflet CSS to page
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link')
      link.id   = 'leaflet-css'
      link.rel  = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }

    const initMap = async () => {
      // Step B — Import Leaflet
      const L = await import('leaflet')

      // Step C — Fix broken marker icons (common Leaflet + Vite issue)
      delete L.Icon.Default.prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      // Step D — Remove old map if exists (prevents duplicate map error)
      if (mapInstance.current) {
        mapInstance.current.remove()
        mapInstance.current = null
      }

      if (!mapRef.current) return

      // Step E — Create the map centered on India
      const map = L.map(mapRef.current, {
        center:      [20.5937, 78.9629],
        zoom:        5,
        zoomControl: true,
      })

      mapInstance.current = map

      // Step F — Add OpenStreetMap tiles (free, no API key needed!)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map)

      // Step G — Filter vehicles that have coordinates
      const vehiclesWithCoords = vehicles.filter(
        v => v.latitude && v.longitude
      )

      if (vehiclesWithCoords.length > 0) {
        const bounds = []

        vehiclesWithCoords.forEach(vehicle => {
          const lat = parseFloat(vehicle.latitude)
          const lng = parseFloat(vehicle.longitude)

          if (isNaN(lat) || isNaN(lng)) return

          bounds.push([lat, lng])

          // Step H — Create custom car emoji marker
          const carIcon = L.divIcon({
            html: `
              <div style="
                background: #2563EB;
                color: white;
                border-radius: 50% 50% 50% 0;
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                transform: rotate(-45deg);
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                border: 2px solid white;
              ">
                <span style="transform:rotate(45deg)">🚗</span>
              </div>`,
            className:   '',
            iconSize:    [40, 40],
            iconAnchor:  [20, 40],
            popupAnchor: [0, -40]
          })

          // Step I — Add marker to map
          const marker = L.marker([lat, lng], { icon: carIcon }).addTo(map)

          // Step J — Add popup with vehicle details
          marker.bindPopup(`
            <div style="min-width:200px;font-family:sans-serif;padding:4px">
              ${vehicle.primary_image
                ? `<img
                    src="${vehicle.primary_image}"
                    style="width:100%;height:120px;object-fit:cover;border-radius:8px;margin-bottom:8px"
                  />`
                : `<div style="width:100%;height:80px;background:#f3f4f6;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:32px;margin-bottom:8px">🚗</div>`
              }
              <h3 style="margin:0 0 4px;font-size:15px;font-weight:700;color:#111">
                ${vehicle.brand} ${vehicle.model}
              </h3>
              <p style="margin:0 0 4px;color:#6b7280;font-size:13px">
                📍 ${vehicle.city}
              </p>
              <p style="margin:0 0 8px;font-size:16px;font-weight:700;color:#2563EB">
                ₹${vehicle.daily_price}/day
              </p>
              <div style="display:flex;gap:4px;margin-bottom:10px;flex-wrap:wrap">
                <span style="background:#EFF6FF;color:#2563EB;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:500">
                  ${vehicle.transmission}
                </span>
                <span style="background:#F0FDF4;color:#16A34A;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:500">
                  ${vehicle.fuel_type}
                </span>
                <span style="background:#FFF7ED;color:#EA580C;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:500">
                  ${vehicle.seats} seats
                </span>
              </div>
              <button
                onclick="window.location.href='/vehicles/${vehicle.id}'"
                style="
                  width:100%;
                  background:#2563EB;
                  color:white;
                  border:none;
                  padding:10px;
                  border-radius:8px;
                  cursor:pointer;
                  font-size:14px;
                  font-weight:600;
                ">
                View & Book →
              </button>
            </div>
          `)
        })

        // Step K — Zoom map to fit all markers
        if (bounds.length > 0) {
          map.fitBounds(bounds, { padding: [50, 50] })
        }

      } else {
        // No coordinates — show India overview
        map.setView([20.5937, 78.9629], 5)
      }
    }

    initMap()

    // Step L — Cleanup when component unmounts
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove()
        mapInstance.current = null
      }
    }
  }, [vehicles])

  return (
    <div style={{ position: 'relative' }}>
      <div
        ref={mapRef}
        style={{
          height:       '450px',
          width:        '100%',
          borderRadius: '12px',
          zIndex:       1,
        }}
      />
      {/* Show message if no vehicles have coordinates */}
      {vehicles.filter(v => v.latitude && v.longitude).length === 0 && (
        <div style={{
          position:   'absolute',
          top:        '50%',
          left:       '50%',
          transform:  'translate(-50%, -50%)',
          background: 'white',
          padding:    '16px 24px',
          borderRadius: '12px',
          boxShadow:  '0 2px 12px rgba(0,0,0,0.1)',
          textAlign:  'center',
          zIndex:     999,
        }}>
          <p style={{ fontSize: '24px', marginBottom: '8px' }}>🗺️</p>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>
            Add coordinates when listing your car to appear on map
          </p>
        </div>
      )}
    </div>
  )
}

export default VehicleMap