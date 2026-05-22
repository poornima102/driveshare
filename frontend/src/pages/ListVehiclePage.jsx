import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { createVehicle, uploadImages } from '../api/vehicles'
import toast from 'react-hot-toast'

// ─── Location Picker Map Component ────────────────────────────
const LocationPickerMap = ({ lat, lng, onLocationSelect }) => {
  const mapRef      = useRef(null)
  const mapInstance = useRef(null)
  const markerRef   = useRef(null)

  useState(() => {
    // Add Leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link')
      link.id   = 'leaflet-css'
      link.rel  = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }

    const initMap = async () => {
      const L = await import('leaflet')

      delete L.Icon.Default.prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      if (mapInstance.current) return
      if (!mapRef.current)    return

      const defaultLat = lat ? parseFloat(lat) : 10.8505
      const defaultLng = lng ? parseFloat(lng) : 76.2711

      const map = L.map(mapRef.current, {
        center: [defaultLat, defaultLng],
        zoom:   13,
      })

      mapInstance.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map)

      if (lat && lng) {
        const marker = L.marker([parseFloat(lat), parseFloat(lng)], {
          draggable: true
        }).addTo(map)
        markerRef.current = marker

        marker.on('dragend', () => {
          const pos = marker.getLatLng()
          onLocationSelect(pos.lat.toFixed(6), pos.lng.toFixed(6))
        })
      }

      map.on('click', (e) => {
        const { lat: clickLat, lng: clickLng } = e.latlng

        if (markerRef.current) {
          markerRef.current.remove()
        }

        const marker = L.marker([clickLat, clickLng], {
          draggable: true
        }).addTo(map)

        marker.bindPopup('📍 Your pickup location').openPopup()
        markerRef.current = marker

        onLocationSelect(
          clickLat.toFixed(6),
          clickLng.toFixed(6)
        )

        marker.on('dragend', () => {
          const pos = marker.getLatLng()
          onLocationSelect(pos.lat.toFixed(6), pos.lng.toFixed(6))
        })
      })
    }

    initMap()

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove()
        mapInstance.current = null
      }
    }
  }, [])

  return (
    <div
      ref={mapRef}
      style={{
        height:       '300px',
        width:        '100%',
        borderRadius: '16px',
        border:       '1px solid #BAE6FD',
        zIndex:       1,
      }}
    />
  )
}

// ─── Main Component ───────────────────────────────────────────
const ListVehiclePage = () => {
  const navigate = useNavigate()
  const [loading,  setLoading]  = useState(false)
  const [images,   setImages]   = useState([])
  const [previews, setPreviews] = useState([])

  const [formData, setFormData] = useState({
    brand:           '',
    model:           '',
    year:            '',
    transmission:    'manual',
    fuel_type:       'petrol',
    seats:           5,
    description:     '',
    city:            '',
    pickup_location: '',
    latitude:        '',
    longitude:       '',
    daily_price:     '',
    hourly_price:    '',
    weekly_price:    '',
    is_available:    true,
  })

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    })
  }

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported')
      return
    }
    toast('Getting your location...', { icon: '📡' })
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(6)
        const lng = position.coords.longitude.toFixed(6)
        setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }))
        toast.success('Location detected! 📍')
      },
      () => toast.error('Could not get location — pin manually on map')
    )
  }

  const handleImages = (e) => {
    const files = Array.from(e.target.files)
    if (files.length + images.length > 10) {
      toast.error('Maximum 10 images allowed')
      return
    }
    const newImages   = [...images, ...files]
    const newPreviews = [...previews, ...files.map(f => URL.createObjectURL(f))]
    setImages(newImages)
    setPreviews(newPreviews)
    toast.success(`${files.length} photo(s) added!`)
  }

  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index))
    setPreviews(previews.filter((_, i) => i !== index))
  }

  const setPrimary = (index) => {
    const newImages   = [...images]
    const newPreviews = [...previews]
    const [img]  = newImages.splice(index, 1)
    const [prev] = newPreviews.splice(index, 1)
    newImages.unshift(img)
    newPreviews.unshift(prev)
    setImages(newImages)
    setPreviews(newPreviews)
    toast.success('Set as primary photo!')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (images.length === 0) {
      toast.error('Please add at least one photo')
      return
    }
    setLoading(true)
    try {
      const res       = await createVehicle(formData)
      const vehicleId = res.data.id
      const imgForm   = new FormData()
      images.forEach(img => imgForm.append('images', img))
      await uploadImages(vehicleId, imgForm)
      toast.success('Vehicle listed successfully! 🎉')
      navigate('/')
    } catch (err) {
      const errors = err.response?.data
      if (errors) {
        const firstError = Object.values(errors)[0]
        toast.error(Array.isArray(firstError) ? firstError[0] : firstError)
      } else {
        toast.error('Failed to list vehicle')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-fixed bg-slate-900"
      style={{
        backgroundImage: "url('https://images.unsplash.com/photo-1525609004556-c46c7d6cf023?auto=format&fit=crop&w=1600&q=80')",
      }}
    >
      {/* Hero Section */}
      <div className="relative overflow-hidden px-4 py-20 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-slate-950/80" />
        <div className="relative mx-auto max-w-7xl">
          <div className="text-center">
            <span className="inline-flex items-center rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white/90 ring-1 ring-white/10">
              <span className="mr-2">💰</span> List your vehicle in minutes
            </span>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Welcome to DriveShare Host Dashboard
            </h1>
            <p className="mt-6 text-lg leading-8 text-slate-200/90 max-w-2xl mx-auto">
              Start earning with your vehicle today. Add photos, set rates, and manage bookings with ease.
            </p>
          </div>

          {/* Benefits */}
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            <div className="rounded-2xl border border-sky-200 bg-white shadow-md p-6">
              <p className="text-3xl">🚀</p>
              <h3 className="mt-3 text-lg font-semibold text-slate-900">Quick Setup</h3>
              <p className="mt-2 text-sm text-slate-600">Get listed and earning in under 5 minutes</p>
            </div>
            <div className="rounded-2xl border border-sky-200 bg-white shadow-md p-6">
              <p className="text-3xl">🔒</p>
              <h3 className="mt-3 text-lg font-semibold text-slate-900">Fully Protected</h3>
              <p className="mt-2 text-sm text-slate-600">Verified renters for your peace of mind</p>
            </div>
            <div className="rounded-2xl border border-sky-200 bg-white shadow-md p-6">
              <p className="text-3xl">📊</p>
              <h3 className="mt-3 text-lg font-semibold text-slate-900">Earn More</h3>
              <p className="mt-2 text-sm text-slate-600">Flexible hourly, daily, and weekly pricing</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="relative z-10 mx-auto max-w-4xl px-4 pb-16">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Vehicle Details */}
          <div className="rounded-[2rem] border border-sky-200 bg-white shadow-lg p-8">
            <div className="flex items-start gap-4 mb-6">
              <span className="text-3xl">🚗</span>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Vehicle Details</h2>
                <p className="mt-1 text-sm text-slate-600">Provide accurate information about your vehicle</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Brand *</label>
                <input
                  name="brand" value={formData.brand}
                  onChange={handleChange} required
                  placeholder="Maruti, Honda, Toyota..."
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Model *</label>
                <input
                  name="model" value={formData.model}
                  onChange={handleChange} required
                  placeholder="Swift, City, Innova..."
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Year *</label>
                <input
                  name="year" value={formData.year} type="number"
                  onChange={handleChange} required
                  placeholder="2022" min="2000" max="2026"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Seats *</label>
                <input
                  name="seats" value={formData.seats} type="number"
                  onChange={handleChange} required min="2" max="10"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Transmission *</label>
                <select
                  name="transmission" value={formData.transmission}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200">
                  <option value="manual">Manual</option>
                  <option value="automatic">Automatic</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Fuel Type *</label>
                <select
                  name="fuel_type" value={formData.fuel_type}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200">
                  <option value="petrol">Petrol</option>
                  <option value="diesel">Diesel</option>
                  <option value="electric">Electric</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="cng">CNG</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Description *</label>
                <textarea
                  name="description" value={formData.description}
                  onChange={handleChange} rows={4} required
                  placeholder="Tell renters about your car — condition, features, AC, music system..."
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                />
              </div>
            </div>
          </div>

          {/* Location with Map Picker */}
          <div className="rounded-[2rem] border border-sky-200 bg-white shadow-lg p-8">
            <div className="flex items-start gap-4 mb-6">
              <span className="text-3xl">📍</span>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Pickup Location</h2>
                <p className="mt-1 text-sm text-slate-600">Where will renters collect the vehicle?</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">City *</label>
                <input
                  name="city" value={formData.city}
                  onChange={handleChange} required
                  placeholder="Kochi, Mumbai, Delhi..."
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Pickup Address *</label>
                <input
                  name="pickup_location" value={formData.pickup_location}
                  onChange={handleChange} required
                  placeholder="MG Road, near Metro Station..."
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                />
              </div>
            </div>

            {/* Coordinates display */}
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Latitude (auto-filled from map)
                </label>
                <input
                  name="latitude"
                  value={formData.latitude || ''}
                  onChange={handleChange}
                  placeholder="Click map to set"
                  readOnly
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-600 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Longitude (auto-filled from map)
                </label>
                <input
                  name="longitude"
                  value={formData.longitude || ''}
                  onChange={handleChange}
                  placeholder="Click map to set"
                  readOnly
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-600 outline-none"
                />
              </div>
            </div>

            {/* Map picker */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-semibold text-slate-700">
                  🗺️ Click on the map to pin your pickup location
                </label>
                <button
                  type="button"
                  onClick={getCurrentLocation}
                  className="text-xs bg-sky-100 text-sky-700 px-3 py-1.5 rounded-full hover:bg-sky-200 font-medium transition flex items-center gap-1">
                  📡 Use my location
                </button>
              </div>

              <LocationPickerMap
                lat={formData.latitude}
                lng={formData.longitude}
                onLocationSelect={(lat, lng) =>
                  setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }))
                }
              />
            </div>

            {formData.latitude && formData.longitude && (
              <div className="rounded-lg border border-green-300 bg-green-50 p-3 flex items-center gap-2">
                <span className="text-green-600 text-lg">✅</span>
                <p className="text-sm text-green-800 font-medium">
                  Location pinned: {parseFloat(formData.latitude).toFixed(4)}, {parseFloat(formData.longitude).toFixed(4)}
                </p>
              </div>
            )}

            <div className="mt-4 rounded-lg border border-sky-300 bg-sky-50 p-4">
              <p className="text-sm text-sky-900">
                💡 <span className="font-semibold">Pro tip:</span> Pinning your exact location helps renters find you and makes your vehicle appear on the map view!
              </p>
            </div>
          </div>

          {/* Pricing */}
          <div className="rounded-[2rem] border border-sky-200 bg-white shadow-lg p-8">
            <div className="flex items-start gap-4 mb-6">
              <span className="text-3xl">💰</span>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Pricing Strategy</h2>
                <p className="mt-1 text-sm text-slate-600">Set competitive prices for different rental periods</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Hourly Rate (₹) *</label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-slate-500 font-semibold">₹</span>
                  <input
                    name="hourly_price" value={formData.hourly_price} type="number"
                    onChange={handleChange} required min="50"
                    placeholder="150"
                    className="w-full rounded-xl border border-slate-300 bg-white pl-8 pr-4 py-3 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Daily Rate (₹) *</label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-slate-500 font-semibold">₹</span>
                  <input
                    name="daily_price" value={formData.daily_price} type="number"
                    onChange={handleChange} required min="100"
                    placeholder="1200"
                    className="w-full rounded-xl border border-slate-300 bg-white pl-8 pr-4 py-3 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Weekly Rate (₹) *</label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-slate-500 font-semibold">₹</span>
                  <input
                    name="weekly_price" value={formData.weekly_price} type="number"
                    onChange={handleChange} required min="500"
                    placeholder="7000"
                    className="w-full rounded-xl border border-slate-300 bg-white pl-8 pr-4 py-3 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                  />
                </div>
              </div>
            </div>

            {/* Earnings calculator */}
            {formData.daily_price && (
              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-xs text-slate-600">Estimated monthly income</p>
                  <p className="mt-2 text-2xl font-bold text-emerald-600">
                    ₹{(formData.daily_price * 25).toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">(avg. 25 bookings/month)</p>
                </div>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-xs text-slate-600">Potential yearly income</p>
                  <p className="mt-2 text-2xl font-bold text-emerald-600">
                    ₹{(formData.daily_price * 25 * 12).toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">(12 months)</p>
                </div>
              </div>
            )}
          </div>

          {/* Photos */}
          <div className="rounded-[2rem] border border-sky-200 bg-white shadow-lg p-8">
            <div className="flex items-start gap-4 mb-6">
              <span className="text-3xl">📸</span>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">Vehicle Photos</h2>
                    <p className="mt-1 text-sm text-slate-600">High-quality photos boost bookings by 85%</p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-sky-100 px-3 py-1 text-sm font-semibold text-sky-700">
                    {images.length}/10
                  </span>
                </div>
              </div>
            </div>

            {images.length < 10 && (
              <label className="block cursor-pointer mb-6">
                <div className="border-2 border-dashed border-sky-300 rounded-[1.5rem] p-10 text-center hover:border-sky-500 hover:bg-sky-50 transition">
                  <div className="text-5xl mb-3">📷</div>
                  <p className="text-slate-900 font-semibold text-lg">Add your vehicle photos</p>
                  <p className="text-slate-600 text-sm mt-2">Click to browse or drag and drop</p>
                  <p className="text-slate-500 text-xs mt-2">JPG, PNG, WEBP — Max 5MB each — Up to 10 photos</p>
                </div>
                <input
                  type="file" multiple accept="image/*"
                  onChange={handleImages} className="hidden"
                />
              </label>
            )}

            {previews.length > 0 && (
              <div className="space-y-4">
                <div className="rounded-lg border border-sky-300 bg-sky-50 p-3">
                  <p className="text-sm text-sky-900">
                    <span className="font-semibold">📌 First photo is your primary image</span> — shown in search results
                  </p>
                </div>

                <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                  {previews.map((url, i) => (
                    <div key={i} className="relative group">
                      <img
                        src={url}
                        className={`w-full h-32 object-cover rounded-[1rem] border-2 transition ${
                          i === 0
                            ? 'border-sky-500 ring-2 ring-sky-300'
                            : 'border-slate-300'
                        }`}
                      />
                      {i === 0 && (
                        <div className="absolute top-2 left-2 bg-sky-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                          ⭐ Primary
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black bg-opacity-40 rounded-[1rem] opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                        {i !== 0 && (
                          <button
                            type="button" onClick={() => setPrimary(i)}
                            className="bg-sky-500 text-white w-9 h-9 rounded-full flex items-center justify-center"
                            title="Set as primary">
                            ⭐
                          </button>
                        )}
                        <button
                          type="button" onClick={() => removeImage(i)}
                          className="bg-red-500 text-white w-9 h-9 rounded-full flex items-center justify-center"
                          title="Remove">
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}

                  {images.length < 10 && (
                    <label className="cursor-pointer">
                      <div className="w-full h-32 border-2 border-dashed border-sky-300 rounded-[1rem] flex flex-col items-center justify-center hover:border-sky-500 hover:bg-sky-50 transition">
                        <span className="text-2xl text-slate-400">+</span>
                        <span className="text-xs text-slate-500 mt-1">Add more</span>
                      </div>
                      <input
                        type="file" multiple accept="image/*"
                        onChange={handleImages} className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Availability */}
          <div className="rounded-[2rem] border border-sky-200 bg-white shadow-lg p-8">
            <label className="flex items-center gap-4 cursor-pointer">
              <input
                type="checkbox"
                name="is_available"
                checked={formData.is_available}
                onChange={handleChange}
                className="w-6 h-6 accent-sky-500"
              />
              <div>
                <p className="text-lg font-bold text-slate-900">
                  Available for bookings immediately
                </p>
                <p className="text-slate-600 text-sm mt-1">
                  {formData.is_available
                    ? 'Your vehicle will appear in search results right away'
                    : 'Save as draft — publish from your dashboard when ready'}
                </p>
              </div>
            </label>
          </div>

          {/* Before you list checklist */}
          <div className="rounded-[2rem] border border-emerald-300 bg-emerald-50 p-8">
            <h3 className="text-lg font-bold text-emerald-900 flex items-center gap-2">
              ✅ Before You List
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-700">
              <li className="flex items-start gap-3">
                <span className="text-emerald-600 font-bold mt-0.5">✓</span>
                <span>Vehicle must be in good working condition and well-maintained</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-emerald-600 font-bold mt-0.5">✓</span>
                <span>Valid insurance and registration documents required</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-emerald-600 font-bold mt-0.5">✓</span>
                <span>Clear, high-quality photos of exterior and interior</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-emerald-600 font-bold mt-0.5">✓</span>
                <span>Pin your exact location on the map for better visibility</span>
              </li>
            </ul>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-sky-500 to-sky-400 text-white py-4 rounded-[1.5rem] font-bold text-lg hover:from-sky-600 hover:to-sky-500 disabled:opacity-50 transition shadow-lg shadow-sky-500/30">
            {loading ? (
              <span className="flex items-center justify-center gap-3">
                <span className="animate-spin">⏳</span>
                Listing your vehicle...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                🚀 List My Vehicle & Start Earning
              </span>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

export default ListVehiclePage