import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { getVehicles } from '../api/vehicles'
import toast from 'react-hot-toast'
import VehicleMap from '../components/VehicleMap'
import PlatformStats from '../components/PlatformStats'
import Footer from '../components/Footer'

const HomePage = () => {
  const listingsRef = useRef(null)
  const [vehicles, setVehicles]   = useState([])
  const [loading,  setLoading]    = useState(true)
  const [filters,  setFilters]    = useState({
    city:         '',
    min_price:    '',
    max_price:    '',
    transmission: '',
    fuel_type:    '',
  })

  const fetchVehicles = async (params = {}) => {
    setLoading(true)
    try {
      const res = await getVehicles(params)
      setVehicles(res.data.results || res.data)
    } catch {
      toast.error('Failed to load vehicles')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVehicles()
  }, [])

  const location = useLocation()

  const scrollToListings = () => {
    listingsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  useEffect(() => {
    if (location.hash === '#car-listings') {
      scrollToListings()
    }
  }, [location.hash])

  const handleFilter = (e) => {
    e.preventDefault()
    // Remove empty filters
    const clean = Object.fromEntries(
      Object.entries(filters).filter(([_, v]) => v !== '')
    )
    fetchVehicles(clean)
  }

  const handleReset = () => {
    setFilters({ city: '', min_price: '', max_price: '', transmission: '', fuel_type: '' })
    fetchVehicles()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">

      {/* Hero Section */}
      <div
        className="relative overflow-hidden bg-slate-950 px-4 py-16 sm:px-6 lg:px-8"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(15,23,42,0.85) 0%, rgba(15,23,42,0.88) 100%), url('https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1800&q=80')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.16),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.14),_transparent_25%)]" />
        <div className="relative mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-[1.35fr_0.9fr] lg:items-center">
            <div className="max-w-2xl">
              <span className="inline-flex items-center rounded-full bg-sky-500/15 px-4 py-2 text-sm font-semibold text-sky-200 ring-1 ring-sky-200/20">
                <span className="mr-2">🚘</span> Peer-to-peer car rentals
              </span>
              <h1 className="mt-6 text-4xl font-bold tracking-tight text-white sm:text-5xl">
                Rent local cars or list your own vehicle in minutes
              </h1>
              <p className="mt-6 text-lg leading-8 text-slate-300">
                DriveShare is the marketplace for modern car rentals. Browse verified vehicles across cities, choose hourly, daily or weekly booking plans, and earn from your own fleet.
              </p>

              <div className="mt-10 flex flex-wrap gap-4">
                <button
                type="button"
                onClick={scrollToListings}
                className="inline-flex items-center justify-center rounded-full bg-sky-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/25 transition hover:bg-sky-400">
                Browse cars
              </button>
              <Link to="/list-vehicle"
                className="inline-flex items-center justify-center rounded-full border border-slate-700 bg-slate-900/80 px-6 py-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-900">
                List your car
              </Link>
              </div>

              <PlatformStats />
            </div>

          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Filters */}
        <form onSubmit={handleFilter}
          className="rounded-[1.75rem] border border-white/10 bg-slate-900/90 p-6 shadow-2xl shadow-slate-950/20 backdrop-blur-xl mb-8 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="flex flex-col gap-2">
              <label className="text-xs uppercase tracking-[0.22em] text-slate-500">City</label>
              <input
                type="text"
                placeholder="Mumbai, Delhi..."
                value={filters.city}
                onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                className="rounded-3xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs uppercase tracking-[0.22em] text-slate-500">Min price</label>
              <input
                type="number"
                placeholder="₹500"
                value={filters.min_price}
                onChange={(e) => setFilters({ ...filters, min_price: e.target.value })}
                className="rounded-3xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs uppercase tracking-[0.22em] text-slate-500">Max price</label>
              <input
                type="number"
                placeholder="₹5000"
                value={filters.max_price}
                onChange={(e) => setFilters({ ...filters, max_price: e.target.value })}
                className="rounded-3xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs uppercase tracking-[0.22em] text-slate-500">Transmission</label>
              <select
                value={filters.transmission}
                onChange={(e) => setFilters({ ...filters, transmission: e.target.value })}
                className="rounded-3xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20">
                <option value="">Any</option>
                <option value="manual">Manual</option>
                <option value="automatic">Automatic</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs uppercase tracking-[0.22em] text-slate-500">Fuel</label>
              <select
                value={filters.fuel_type}
                onChange={(e) => setFilters({ ...filters, fuel_type: e.target.value })}
                className="rounded-3xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20">
                <option value="">Any</option>
                <option value="petrol">Petrol</option>
                <option value="diesel">Diesel</option>
                <option value="electric">Electric</option>
                <option value="hybrid">Hybrid</option>
                <option value="cng">CNG</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col justify-end gap-3 sm:flex-row sm:items-center sm:justify-end">
            <button type="submit"
              className="w-full rounded-3xl bg-sky-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition hover:bg-sky-400 sm:w-auto">
              Search listings
            </button>
            <button type="button" onClick={handleReset}
              className="w-full rounded-3xl border border-slate-700 bg-slate-950/80 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-900 sm:w-auto">
              Reset filters
            </button>
          </div>
        </form>

        {/* Results count */}
        <div ref={listingsRef} id="car-listings" className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-white">{loading ? 'Loading listings...' : `${vehicles.length} cars ready to rent`}</h2>
            <p className="mt-1 text-sm text-slate-400">Instant bookings, trusted owners, and flexible rental terms.</p>
          </div>
          <Link to="/list-vehicle"
            className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-400">
            + List Your Car
          </Link>
        </div>
    {/* Map Section */}
       {!loading && vehicles.length > 0 && (
          <div className="rounded-[2rem] border border-white/10 bg-slate-900/85 p-5 shadow-2xl shadow-slate-950/30 mb-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">🗺️ Vehicles on Map</h3>
                <p className="mt-1 text-sm text-slate-400">Explore available cars near you at a glance.</p>
              </div>
              <span className="text-sm text-slate-400">Tap markers for details</span>
            </div>
            <div className="overflow-hidden rounded-[1.5rem] border border-white/10">
              <VehicleMap vehicles={vehicles} />
            </div>
          </div>
        )}
        {/* Vehicle Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="rounded-[1.75rem] bg-slate-900/80 p-6 shadow-lg shadow-slate-950/20 animate-pulse">
                <div className="h-48 rounded-[1.5rem] bg-slate-800" />
                <div className="mt-5 space-y-4">
                  <div className="h-4 rounded bg-slate-800" />
                  <div className="h-4 rounded bg-slate-800 w-3/4" />
                  <div className="h-12 rounded bg-slate-800" />
                </div>
              </div>
            ))}
          </div>
        ) : vehicles.length === 0 ? (
          <div className="rounded-[2rem] bg-slate-900/90 p-16 text-center shadow-2xl shadow-slate-950/20 border border-white/10">
            <p className="text-6xl">🚗</p>
            <h3 className="mt-6 text-3xl font-semibold text-white">No cars match your search</h3>
            <p className="mt-3 text-sm text-slate-400">Try changing your filters or list your own car to get started.</p>
            <Link to="/list-vehicle"
              className="mt-6 inline-flex rounded-full bg-sky-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 hover:bg-sky-400">
              List Your Car
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {vehicles.map((vehicle) => (
              <VehicleCard key={vehicle.id} vehicle={vehicle} />
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}

const VehicleCard = ({ vehicle }) => {
  return (
    <Link to={`/vehicles/${vehicle.id}`}
      className="group overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-900/85 shadow-2xl shadow-slate-950/20 transition hover:-translate-y-1 hover:border-sky-500/20 hover:bg-slate-900">

      {/* Image */}
      <div className="relative h-52 overflow-hidden">
        {vehicle.primary_image ? (
          <img
            src={vehicle.primary_image}
            alt={`${vehicle.brand} ${vehicle.model}`}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-slate-800 text-6xl text-slate-400">
            🚗
          </div>
        )}

        <div className={`absolute top-4 left-4 rounded-full px-3 py-2 text-xs font-semibold ${
          vehicle.is_available
            ? 'bg-emerald-500/90 text-white'
            : 'bg-rose-500/90 text-white'
        }`}>
          {vehicle.is_available ? 'Available' : 'Unavailable'}
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">{vehicle.fuel_type || 'Vehicle'}</p>
          <h3 className="mt-2 text-xl font-semibold text-white">
            {vehicle.brand} {vehicle.model}
          </h3>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-3xl bg-slate-950/70 px-3 py-3 text-sm text-slate-300">
            <p className="font-medium text-slate-100">{vehicle.city || 'City'}</p>
            <p className="mt-1">Location</p>
          </div>
          <div className="rounded-3xl bg-slate-950/70 px-3 py-3 text-sm text-slate-300">
            <p className="font-medium text-slate-100">{vehicle.transmission || 'Automatic'}</p>
            <p className="mt-1">Transmission</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-300">
          <div className="rounded-3xl bg-slate-950/70 px-3 py-3">
            <p className="font-semibold text-slate-100">{vehicle.seats || '4'}</p>
            <p className="mt-1">Seats</p>
          </div>
          <div className="rounded-3xl bg-slate-950/70 px-3 py-3">
            <p className="font-semibold text-slate-100">{vehicle.year || '2023'}</p>
            <p className="mt-1">Year</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-400">Starting price</p>
            <p className="text-xl font-bold text-white">₹{vehicle.daily_price}</p>
          </div>
          <span className="rounded-full bg-slate-950/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-200">
            /day
          </span>
        </div>

        <div className="flex items-center justify-between gap-3 text-sm text-slate-300">
          <div className="flex items-center gap-2">
            <span className="text-yellow-400">⭐</span>
            <span className="font-semibold text-white">{vehicle.avg_rating > 0 ? vehicle.avg_rating : 'New'}</span>
          </div>
          <span className="rounded-full bg-sky-500/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-200">
            View details
          </span>
        </div>
      </div>
    </Link>
  )
}

export default HomePage