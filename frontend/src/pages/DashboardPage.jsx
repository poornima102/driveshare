import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { getDashboard, getOwnerBookings } from '../api/bookings'
import { getMyVehicles, toggleAvailability, updateVehicle, uploadImages, deleteVehicle, deleteVehicleImage } from '../api/vehicles'
import toast from 'react-hot-toast'

const STATUS_STYLES = {
  pending:   'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  completed: 'bg-blue-100 text-blue-700',
}

const STATUS_ICONS = {
  pending:   '⏳',
  confirmed: '✅',
  cancelled: '❌',
  completed: '🏁',
}

const DashboardPage = () => {
  const navigate = useNavigate()
  const [stats,       setStats]       = useState(null)
  const [vehicles,    setVehicles]    = useState([])
  const [bookings,    setBookings]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [editVehicle, setEditVehicle] = useState(null)
  const [editForm,    setEditForm]    = useState({})
  const [existingImages, setExistingImages] = useState([])
  const [editImages,  setEditImages]  = useState([])
  const [previews,    setPreviews]    = useState([])
  const [saving,      setSaving]      = useState(false)
  const [activeTab,   setActiveTab]   = useState('all')
  const [highlightedBookingId, setHighlightedBookingId] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [deleting,    setDeleting]    = useState(false)

  const location = useLocation()

  useEffect(() => {
    fetchAll()
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const bookingId = params.get('bookingId')

    if (bookingId) {
      setActiveTab('confirmed')
      setHighlightedBookingId(bookingId)
    }
  }, [location.search])

  useEffect(() => {
    if (!highlightedBookingId) return

    const el = document.getElementById(`dashboard-booking-${highlightedBookingId}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [highlightedBookingId, bookings])

  const fetchAll = async () => {
    try {
      const [statsRes, vehiclesRes, bookingsRes] = await Promise.all([
        getDashboard(),
        getMyVehicles(),
        getOwnerBookings(),
      ])
      setStats(statsRes.data)
      setVehicles(vehiclesRes.data)
      setBookings(bookingsRes.data)
    } catch {
      toast.error('Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (vehicleId) => {
    try {
      const res = await toggleAvailability(vehicleId)
      toast.success(res.data.message)
      setVehicles(prev =>
        prev.map(v =>
          v.id === vehicleId
            ? { ...v, is_available: res.data.is_available }
            : v
        )
      )
    } catch {
      toast.error('Failed to update availability')
    }
  }

  const handleDeleteVehicle = async (vehicleId) => {
    setDeleteConfirm(vehicleId)
  }

  const confirmDeleteVehicle = async () => {
    if (!deleteConfirm) return

    setDeleting(true)
    try {
      await deleteVehicle(deleteConfirm)
      setVehicles(prev => prev.filter(v => v.id !== deleteConfirm))
      toast.success('Vehicle deleted successfully')
      if (editVehicle?.id === deleteConfirm) {
        closeEdit()
      }
      setDeleteConfirm(null)
    } catch (err) {
      toast.error('Failed to delete vehicle')
    } finally {
      setDeleting(false)
    }
  }

  const closeEdit = () => {
    previews.forEach(url => URL.revokeObjectURL(url))
    setPreviews([])
    setEditImages([])
    setExistingImages([])
    setEditVehicle(null)
  }

  const openEdit = (vehicle) => {
    setEditVehicle(vehicle)
    setEditForm({
      brand:           vehicle.brand,
      model:           vehicle.model,
      transmission:    vehicle.transmission || '',
      fuel_type:       vehicle.fuel_type || '',
      year:            vehicle.year,
      daily_price:     vehicle.daily_price,
      hourly_price:    vehicle.hourly_price,
      weekly_price:    vehicle.weekly_price,
      city:            vehicle.city,
      pickup_location: vehicle.pickup_location,
      latitude:        vehicle.latitude ?? '',
      longitude:       vehicle.longitude ?? '',
      status:          vehicle.status || 'available',
      seats:           vehicle.seats,
      description:     vehicle.description || '',
      is_available:    vehicle.is_available,
    })
    setExistingImages(vehicle.images || [])
    setEditImages([])
    setPreviews([])
  }

  const handleImageSelect = (event) => {
    const files = Array.from(event.target.files || [])
    if (!files.length) return

    const filePreviews = files.map(file => URL.createObjectURL(file))
    setEditImages(prev => [...prev, ...files])
    setPreviews(prev => [...prev, ...filePreviews])
    event.target.value = ''
  }

  const handleRemovePreview = (index) => {
    setPreviews(prev => {
      const removedUrl = prev[index]
      if (removedUrl) URL.revokeObjectURL(removedUrl)
      return prev.filter((_, i) => i !== index)
    })
    setEditImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleDeleteExistingImage = async (imageId) => {
    if (!editVehicle) return
    try {
      await deleteVehicleImage(editVehicle.id, imageId)
      setExistingImages(prev => prev.filter(img => img.id !== imageId))
      toast.success('Image deleted')
    } catch (err) {
      toast.error('Failed to delete image')
    }
  }

  const handleEditSave = async () => {
    setSaving(true)
    try {
      const payload = {
        ...editForm,
        year: parseInt(editForm.year, 10),
        seats: parseInt(editForm.seats, 10),
        daily_price: parseFloat(editForm.daily_price),
        hourly_price: parseFloat(editForm.hourly_price),
        weekly_price: parseFloat(editForm.weekly_price),
        latitude: editForm.latitude === '' ? null : parseFloat(editForm.latitude),
        longitude: editForm.longitude === '' ? null : parseFloat(editForm.longitude),
        status: editForm.status,
      }
      await updateVehicle(editVehicle.id, payload)
      // If new images were selected, upload them
      if (editImages && editImages.length > 0) {
        try {
          const formData = new FormData()
          editImages.forEach(f => formData.append('images', f))
          await uploadImages(editVehicle.id, formData)
          toast.success('Images uploaded ✅')
        } catch (e) {
          console.error('Image upload failed', e.response?.data || e)
          toast.error('Image upload failed')
        }
      }
      toast.success('Vehicle updated! ✅')
      closeEdit()
      fetchAll()
    } catch (err) {
      const errors = err.response?.data
      if (errors) {
        const first = Object.values(errors)[0]
        toast.error(Array.isArray(first) ? first[0] : first)
      } else {
        toast.error('Failed to update vehicle')
      }
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  })

  const formatDateTime = (d) => new Date(d).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  })

  const filteredBookings = bookings.filter(b => {
    if (activeTab === 'all')       return true
    if (activeTab === 'confirmed') return b.status === 'confirmed'
    if (activeTab === 'pending')   return b.status === 'pending'
    if (activeTab === 'cancelled') return b.status === 'cancelled'
    return true
  })

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Loading dashboard...</p>
    </div>
  )

  return (
    <div
      className="min-h-screen py-8 px-4"
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(15,23,42,0.76) 0%, rgba(15,23,42,0.92) 100%), url('https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1600&q=80')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="max-w-6xl mx-auto">

        <section className="rounded-[2rem] bg-slate-900/85 border border-white/10 p-8 shadow-2xl mb-8 backdrop-blur-xl">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-sm uppercase tracking-[0.35em] text-sky-300/80 mb-3">Owner Dashboard</p>
              <h1 className="text-4xl sm:text-5xl font-semibold text-white tracking-tight">Manage your fleet, bookings and earnings</h1>
              <p className="mt-4 text-slate-300 text-sm sm:text-base">
                Stay on top of every rental opportunity with a streamlined host dashboard built for modern vehicle management.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full lg:w-auto">
              <div className="rounded-3xl bg-white/10 border border-white/10 p-5 text-center backdrop-blur-xl">
                <p className="text-2xl font-semibold text-white">₹{stats?.total_earnings || 0}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.24em] text-slate-400">Total Earnings</p>
              </div>
              <div className="rounded-3xl bg-white/10 border border-white/10 p-5 text-center backdrop-blur-xl">
                <p className="text-2xl font-semibold text-emerald-300">{stats?.confirmed_bookings || 0}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.24em] text-slate-400">Confirmed</p>
              </div>
              <div className="rounded-3xl bg-white/10 border border-white/10 p-5 text-center backdrop-blur-xl">
                <p className="text-2xl font-semibold text-sky-300">{stats?.total_bookings || 0}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.24em] text-slate-400">Total Bookings</p>
              </div>
              <div className="rounded-3xl bg-white/10 border border-white/10 p-5 text-center backdrop-blur-xl">
                <p className="text-2xl font-semibold text-rose-300">{stats?.cancellation_rate || 0}%</p>
                <p className="mt-2 text-xs uppercase tracking-[0.24em] text-slate-400">Cancel Rate</p>
              </div>
            </div>
          </div>
        </section>

        {/* My Vehicles */}
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 p-6 mb-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-800">🚗 My Vehicles</h2>
              <p className="mt-2 text-sm text-slate-500">Your live fleet at a glance. Update availability, pricing, and keep top listings polished.</p>
            </div>
            <Link to="/list-vehicle"
              className="inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition">
              + Add New
            </Link>
          </div>

          {vehicles.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-4xl mb-2">🚗</p>
              <p className="text-gray-500">No vehicles listed yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {vehicles.map((v) => (
                <div key={v.id} className="group grid gap-4 lg:grid-cols-[280px_1fr] rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
                  <div className="relative overflow-hidden rounded-[1.75rem] bg-slate-100 border border-slate-200 min-h-[240px]">
                    {v.primary_image ? (
                      <img src={v.primary_image} className="h-full w-full object-cover" alt={`${v.brand} ${v.model}`} />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-5xl text-slate-400">🚗</div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/95 via-slate-950/20 to-transparent p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold text-white">{v.brand} {v.model}</p>
                          <p className="text-xs text-slate-200">{v.city || 'Kochi'} · {v.year}</p>
                        </div>
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${v.is_available ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                          {v.is_available ? 'Available' : 'Hidden'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col justify-between gap-5">
                    <div className="space-y-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-xl font-semibold text-slate-900">{v.brand} {v.model}</p>
                          <p className="text-sm text-slate-500">{v.city || 'Kochi'} · {v.year}</p>
                        </div>
                        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold ${v.is_available ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                          {v.is_available ? 'Live on market' : 'Hidden from guests'}
                        </span>
                      </div>

                      <p className="text-sm leading-6 text-slate-600">{v.description || 'Crisp hatchback built for hassle-free city and weekend rentals.'}</p>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.24em] text-slate-400 mb-1">Daily</p>
                          <p className="text-sm font-semibold text-slate-900">₹{v.daily_price}/day</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.24em] text-slate-400 mb-1">Hourly</p>
                          <p className="text-sm font-semibold text-slate-900">{v.hourly_price ? `₹${v.hourly_price}/hr` : 'N/A'}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.24em] text-slate-400 mb-1">Weekly</p>
                          <p className="text-sm font-semibold text-slate-900">{v.weekly_price ? `₹${v.weekly_price}/wk` : 'N/A'}</p>
                        </div>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-3 text-sm text-slate-500">
                        <div className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3">
                          <p className="font-semibold text-slate-900">{v.seats || '—'} seats</p>
                          <p className="mt-1">Capacity</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3">
                          <p className="font-semibold text-slate-900">{v.transmission || 'Automatic'}</p>
                          <p className="mt-1">Transmission</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3">
                          <p className="font-semibold text-slate-900">{v.fuel_type || 'Petrol'}</p>
                          <p className="mt-1">Fuel</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <button
                        onClick={() => openEdit(v)}
                        className="rounded-2xl bg-slate-900 text-white px-4 py-3 text-sm font-semibold hover:bg-slate-800 transition">
                        Edit listing
                      </button>
                      <button
                        onClick={() => handleDeleteVehicle(v.id)}
                        className="rounded-2xl border border-slate-200 bg-white text-slate-700 px-4 py-3 text-sm font-semibold hover:bg-slate-50 transition">
                        Delete
                      </button>
                      <button
                        onClick={() => handleToggle(v.id)}
                        className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${v.is_available ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}`}>
                        {v.is_available ? 'Hide listing' : 'Publish listing'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bookings Section */}
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 p-6 mb-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-5">
            <div>
              <h2 className="text-xl font-bold text-gray-800">📅 Bookings</h2>
              <p className="mt-2 text-sm text-slate-500">Active reservations and guest details in one polished overview.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {['all', 'confirmed', 'pending', 'cancelled'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold capitalize transition ${
                    activeTab === tab
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}>
                  {tab === 'all' ? `All (${bookings.length})` : `${tab} (${bookings.filter(b => b.status === tab).length})`}
                </button>
              ))}
            </div>
          </div>

          {filteredBookings.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-4xl mb-3">📅</p>
              <p className="text-gray-500">No {activeTab} bookings</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredBookings.map((b) => (
                <div key={b.id} className={`overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-lg transition ${highlightedBookingId === b.id ? 'ring-2 ring-blue-400/40' : 'hover:-translate-y-0.5 hover:shadow-2xl'}`}>
                  <div className="grid gap-6 lg:grid-cols-[1.55fr_220px] p-6">
                    <div className="space-y-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-4">
                          <div className="w-20 h-14 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0">
                            {b.vehicle_primary_image || b.vehicle_image ? (
                              <img src={b.vehicle_primary_image || b.vehicle_image} alt={`${b.vehicle_brand} ${b.vehicle_model}`} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-2xl text-slate-400">🚗</div>
                            )}
                          </div>
                          <div>
                            <p className="text-lg font-semibold text-slate-900">{b.vehicle_brand} {b.vehicle_model}</p>
                            <p className="text-xs text-slate-500">{b.renter_name} · {formatDate(b.pickup_date)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-2 text-sm ${STATUS_STYLES[b.status] || ''} rounded-full px-3 py-1 font-semibold`}>{STATUS_ICONS[b.status] || ''} <span className="capitalize">{b.status}</span></span>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-[1.75rem] bg-slate-50 p-4 border border-slate-200">
                          <p className="text-xs uppercase tracking-[0.28em] text-slate-400 mb-2">Pickup</p>
                          <p className="text-sm font-semibold text-slate-900">{formatDateTime(b.pickup_date)}</p>
                        </div>
                        <div className="rounded-[1.75rem] bg-slate-50 p-4 border border-slate-200">
                          <p className="text-xs uppercase tracking-[0.28em] text-slate-400 mb-2">Return</p>
                          <p className="text-sm font-semibold text-slate-900">{formatDateTime(b.return_date)}</p>
                        </div>
                        <div className="rounded-[1.75rem] bg-slate-50 p-4 border border-slate-200">
                          <p className="text-xs uppercase tracking-[0.28em] text-slate-400 mb-2">Booked on</p>
                          <p className="text-sm font-semibold text-slate-900">{formatDate(b.created_at)}</p>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-[1.75rem] bg-white border border-slate-200 p-4">
                          <p className="text-xs uppercase tracking-[0.28em] text-slate-400 mb-2">Customer</p>
                          <p className="font-semibold text-slate-900">{b.renter_name}</p>
                        </div>
                        { (b.pickup_location || b.pickup_address) && (
                        <div className="rounded-[1.75rem] bg-white border border-slate-200 p-4">
                          <p className="text-xs uppercase tracking-[0.28em] text-slate-400 mb-2">Location</p>
                          <p className="font-semibold text-slate-900">{b.pickup_location || b.pickup_address}</p>
                        </div>
                      ) }
                      </div>
                    </div>

                    <div className="flex flex-col justify-between gap-4">
                      <div className="rounded-[2rem] bg-slate-900 p-6 text-center text-white shadow-xl">
                        <p className="text-xs uppercase tracking-[0.28em] text-slate-400 mb-3">Revenue</p>
                        <p className="text-4xl font-semibold">₹{b.total_price}</p>
                      </div>
                      <Link
                        to={`/chat/${b.id}`}
                        className="inline-flex items-center justify-center gap-2 rounded-3xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition">
                        💬 Chat with {b.renter_name}
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Monthly earnings */}
        {stats?.monthly_earnings?.length > 0 && (
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-5">
              <div>
                <h2 className="text-xl font-bold text-gray-800">📊 Monthly Earnings</h2>
                <p className="mt-2 text-sm text-slate-500">Revenue performance and booking trends for the recent months.</p>
              </div>
              <div className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-600">
                {new Date(stats.monthly_earnings[0]?.month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-[1.75rem] bg-slate-900 text-white p-6 shadow-xl">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400 mb-3">This month</p>
                <p className="text-4xl font-semibold">₹{stats.monthly_earnings[0]?.earnings}</p>
                <p className="text-sm text-slate-400 mt-2">{stats.monthly_earnings[0]?.count} booking{stats.monthly_earnings[0]?.count === 1 ? '' : 's'}</p>
              </div>
              {stats.monthly_earnings.slice(1, 3).map((m, i) => (
                <div key={i} className="rounded-[1.75rem] bg-slate-50 border border-slate-200 p-5">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400 mb-2">{new Date(m.month).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</p>
                  <p className="text-2xl font-semibold text-slate-900">₹{m.earnings}</p>
                  <p className="text-sm text-slate-500 mt-2">{m.count} booking{m.count === 1 ? '' : 's'}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Edit Vehicle Modal */}
      {editVehicle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">
                  ✏️ Edit Vehicle
                </h2>
                <button
                  onClick={closeEdit}
                  className="text-gray-400 hover:text-gray-600 text-2xl">
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                    <input
                      value={editForm.brand}
                      onChange={e => setEditForm({...editForm, brand: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                    <input
                      value={editForm.model}
                      onChange={e => setEditForm({...editForm, model: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                    <input
                      type="number"
                      value={editForm.year}
                      onChange={e => setEditForm({...editForm, year: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Transmission</label>
                    <input
                      value={editForm.transmission}
                      onChange={e => setEditForm({...editForm, transmission: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fuel Type</label>
                    <input
                      value={editForm.fuel_type}
                      onChange={e => setEditForm({...editForm, fuel_type: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Daily ₹</label>
                    <input
                      type="number"
                      value={editForm.daily_price}
                      onChange={e => setEditForm({...editForm, daily_price: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hourly ₹</label>
                    <input
                      type="number"
                      value={editForm.hourly_price}
                      onChange={e => setEditForm({...editForm, hourly_price: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Weekly ₹</label>
                    <input
                      type="number"
                      value={editForm.weekly_price}
                      onChange={e => setEditForm({...editForm, weekly_price: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input
                      value={editForm.city}
                      onChange={e => setEditForm({...editForm, city: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Seats</label>
                    <input
                      type="number"
                      value={editForm.seats}
                      onChange={e => setEditForm({...editForm, seats: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Location</label>
                  <input
                    value={editForm.pickup_location}
                    onChange={e => setEditForm({...editForm, pickup_location: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                    <input
                      type="number"
                      step="0.000001"
                      value={editForm.latitude}
                      onChange={e => setEditForm({...editForm, latitude: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                    <input
                      type="number"
                      step="0.000001"
                      value={editForm.longitude}
                      onChange={e => setEditForm({...editForm, longitude: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={editForm.status}
                      onChange={e => setEditForm({...editForm, status: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="available">Available</option>
                      <option value="unavailable">Unavailable</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={editForm.description}
                    onChange={e => setEditForm({...editForm, description: e.target.value})}
                    rows={3}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Vehicle Images</p>
                      <p className="text-xs text-gray-500">Remove existing images or add new ones.</p>
                    </div>
                  </div>

                  {existingImages.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {existingImages.map(image => (
                        <div key={image.id} className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                          <img
                            src={image.image}
                            alt="Vehicle"
                            className="w-full h-32 object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => handleDeleteExistingImage(image.id)}
                            className="absolute top-2 right-2 bg-white/90 text-red-600 rounded-full p-2 shadow-sm hover:bg-white"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No existing images available.</p>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Add Images</label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageSelect}
                      className="w-full text-sm text-gray-600"
                    />
                  </div>

                  {previews.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-800">New image previews</p>
                      <div className="grid grid-cols-2 gap-3">
                        {previews.map((src, idx) => (
                          <div key={src} className="relative rounded-xl overflow-hidden border border-dashed border-blue-300 bg-blue-50">
                            <img src={src} alt={`Preview ${idx + 1}`} className="w-full h-32 object-cover" />
                            <button
                              type="button"
                              onClick={() => handleRemovePreview(idx)}
                              className="absolute top-2 right-2 bg-white/90 text-red-600 rounded-full p-2 shadow-sm hover:bg-white"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Availability toggle in edit */}
                <label className="flex items-center gap-3 cursor-pointer bg-gray-50 rounded-xl p-3">
                  <input
                    type="checkbox"
                    checked={editForm.is_available}
                    onChange={e => setEditForm({...editForm, is_available: e.target.checked})}
                    className="w-5 h-5 accent-blue-600"
                  />
                  <div>
                    <p className="font-semibold text-gray-800">Available for booking</p>
                    <p className="text-gray-500 text-sm">
                      Uncheck to hide from listings temporarily
                    </p>
                  </div>
                </label>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={closeEdit}
                  className="flex-1 border border-gray-300 text-gray-600 py-3 rounded-xl hover:bg-gray-50">
                  Cancel
                </button>
                <button
                  onClick={handleEditSave}
                  disabled={saving}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 font-semibold">
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in">
            {/* Header with icon */}
            <div className="bg-gradient-to-r from-red-50 to-red-100 px-6 py-8 text-center">
              <div className="text-5xl mb-3">⚠️</div>
              <h2 className="text-2xl font-bold text-gray-800">Delete Vehicle?</h2>
            </div>

            {/* Content */}
            <div className="px-6 py-6">
              <p className="text-gray-700 text-center mb-2">
                Are you sure you want to delete this vehicle?
              </p>
              <p className="text-gray-500 text-sm text-center mb-6">
                This action cannot be undone and all associated data will be permanently removed.
              </p>

              {/* Vehicle info */}
              {vehicles.find(v => v.id === deleteConfirm) && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                  {(() => {
                    const vehicle = vehicles.find(v => v.id === deleteConfirm)
                    return (
                      <div className="flex items-center gap-3">
                        {vehicle.primary_image && (
                          <img src={vehicle.primary_image} alt={vehicle.brand} className="w-16 h-16 rounded-lg object-cover" />
                        )}
                        <div>
                          <p className="font-semibold text-gray-800">
                            {vehicle.brand} {vehicle.model} ({vehicle.year})
                          </p>
                          <p className="text-sm text-gray-600">
                            ₹{vehicle.daily_price}/day • {vehicle.city}
                          </p>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 px-6 py-4 bg-gray-50 border-t">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-100 transition disabled:opacity-50">
                Cancel
              </button>
              <button
                onClick={confirmDeleteVehicle}
                disabled={deleting}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2">
                {deleting ? (
                  <>
                    <span className="inline-block animate-spin">⏳</span>
                    Deleting...
                  </>
                ) : (
                  <>🗑️ Delete</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DashboardPage