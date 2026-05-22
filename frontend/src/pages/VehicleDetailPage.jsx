import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getVehicle } from '../api/vehicles'
import { createBooking } from '../api/bookings'
import { createOrder, verifyPayment } from '../api/payments'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'
import api from '../api/axios'


const AddReviewForm = ({ vehicleId, onReviewAdded }) => {
  const [rating,  setRating]  = useState(0)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [hover,   setHover]   = useState(0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (rating === 0) {
      toast.error('Please select a rating')
      return
    }
    setLoading(true)
    try {
      await api.post(`/vehicles/${vehicleId}/add_review/`, { rating, comment })
      toast.success('Review submitted! ⭐')
      setRating(0)
      setComment('')
      onReviewAdded()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not submit review')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow p-6 mt-4">
      <h3 className="font-bold text-lg mb-4">⭐ Leave a Review</h3>
      <form onSubmit={handleSubmit}>

        {/* Star selector */}
        <div className="flex items-center gap-1 mb-4">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
              className="text-3xl transition-transform hover:scale-110">
              {star <= (hover || rating) ? '⭐' : '☆'}
            </button>
          ))}
          {rating > 0 && (
            <span className="ml-2 text-gray-500 text-sm">
              {['','Poor','Fair','Good','Very Good','Excellent'][rating]}
            </span>
          )}
        </div>

        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Share your experience..."
          rows={3}
          className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
        />

        <button
          type="submit"
          disabled={loading || rating === 0}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
          {loading ? 'Submitting...' : 'Submit Review ⭐'}
        </button>
      </form>
    </div>
  )
}


const VehicleDetailPage = () => {
  const { id }          = useParams()
  const navigate        = useNavigate()
  const { token, user } = useAuthStore()

  const [vehicle,     setVehicle]     = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [booking,     setBooking]     = useState(false)
  const [pickupDate,  setPickupDate]  = useState('')
  const [returnDate,  setReturnDate]  = useState('')
  const [totalPrice,  setTotalPrice]  = useState(0)
  const [activeImage, setActiveImage] = useState(0)

  useEffect(() => {
    const fetchVehicle = async () => {
      try {
        const res = await getVehicle(id)
        setVehicle(res.data)
      } catch {
        toast.error('Vehicle not found')
        navigate('/')
      } finally {
        setLoading(false)
      }
    }
    fetchVehicle()
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [id])

  const computeBookingTotals = () => {
    if (!pickupDate || !returnDate || !vehicle) return { totalPrice: 0, durationLabel: '', breakdown: '' }

    const start = new Date(pickupDate)
    const end = new Date(returnDate)
    const diffMs = end - start
    if (diffMs <= 0) return { totalPrice: 0, durationLabel: '', breakdown: '' }

    const hours = diffMs / (1000 * 60 * 60)
    if (hours < 24) {
      const hourCount = Math.ceil(hours)
      const totalPrice = hourCount * vehicle.hourly_price
      return {
        totalPrice,
        durationLabel: `${hourCount} hour${hourCount === 1 ? '' : 's'}`,
        breakdown: `₹${vehicle.hourly_price} × ${hourCount} hr`
      }
    }

    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    if (days >= 7) {
      const weeks = Math.floor(days / 7)
      const remainder = days % 7
      const weekPrice = weeks * vehicle.weekly_price
      const dayPrice = remainder * vehicle.daily_price
      const totalPrice = weekPrice + dayPrice
      const durationLabel = remainder
        ? `${weeks} week${weeks === 1 ? '' : 's'} + ${remainder} day${remainder === 1 ? '' : 's'}`
        : `${weeks} week${weeks === 1 ? '' : 's'}`
      const breakdown = remainder
        ? `₹${vehicle.weekly_price} × ${weeks} wk + ₹${vehicle.daily_price} × ${remainder} day${remainder === 1 ? '' : 's'}`
        : `₹${vehicle.weekly_price} × ${weeks} wk`
      return { totalPrice, durationLabel, breakdown }
    }

    const totalPrice = days * vehicle.daily_price
    return {
      totalPrice,
      durationLabel: `${days} day${days === 1 ? '' : 's'}`,
      breakdown: `₹${vehicle.daily_price} × ${days} day${days === 1 ? '' : 's'}`
    }
  }

  useEffect(() => {
    const { totalPrice } = computeBookingTotals()
    setTotalPrice(totalPrice)
  }, [pickupDate, returnDate, vehicle])

  const getMinPickupDateTime = () => {
    const now = new Date()
    now.setMinutes(now.getMinutes() + 5)
    return now.toISOString().slice(0, 16)
  }

  const formatDateTime = (dateStr) => {
    return new Date(dateStr).toLocaleString('en-IN', {
      weekday: 'short',
      day:     'numeric',
      month:   'short',
      year:    'numeric',
      hour:    '2-digit',
      minute:  '2-digit',
      hour12:  true
    })
  }

  const getDays = () => {
    if (!pickupDate || !returnDate) return 0
    return Math.ceil(
      (new Date(returnDate) - new Date(pickupDate)) / (1000 * 60 * 60 * 24)
    )
  }

  const getDurationLabel = () => {
    if (!pickupDate || !returnDate || !vehicle) return ''
    const start = new Date(pickupDate)
    const end = new Date(returnDate)
    const diffMs = end - start
    if (diffMs <= 0) return ''

    const hours = diffMs / (1000 * 60 * 60)
    if (hours < 24) {
      const hourCount = Math.ceil(hours)
      return `${hourCount} hour${hourCount === 1 ? '' : 's'}`
    }

    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    if (days >= 7) {
      const weeks = Math.floor(days / 7)
      const remainder = days % 7
      return remainder
        ? `${weeks} week${weeks === 1 ? '' : 's'} + ${remainder} day${remainder === 1 ? '' : 's'}`
        : `${weeks} week${weeks === 1 ? '' : 's'}`
    }

    return `${days} day${days === 1 ? '' : 's'}`
  }

  const handleBooking = async () => {
    if (booking) return

    if (!token) {
      toast.error('Please login to book')
      navigate('/login')
      return
    }
    if (!pickupDate || !returnDate) {
      toast.error('Please select pickup and return dates')
      return
    }
    if (totalPrice <= 0) {
      toast.error('Return date must be after pickup date')
      return
    }

    setBooking(true)

    try {
      const bookingRes = await createBooking({
        vehicle:     id,
        pickup_date: new Date(pickupDate).toISOString(),
        return_date: new Date(returnDate).toISOString(),
      })

      const bookingId = bookingRes.data.id

      if (!bookingId) {
        toast.error('Booking creation failed')
        setBooking(false)
        return
      }

      const orderRes = await createOrder({ booking_id: bookingId })
      const order    = orderRes.data

      const razorpayOptions = {
        key:         import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount:      order.amount,
        currency:    order.currency || 'INR',
        name:        'DriveShare',
        description: `${vehicle.brand} ${vehicle.model} Rental`,
        order_id:    order.order_id,
        prefill: {
          name:    user?.username || '',
          email:   user?.email    || '',
          contact: user?.phone    || '',
        },
        theme: { color: '#2563EB' },

        handler: async (response) => {
          try {
            await verifyPayment({
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
            })
            toast.success('🎉 Booking confirmed!')
            navigate('/my-bookings')
          } catch (err) {
            console.error('Verify error:', err.response?.data)
            toast.error('Payment verification failed')
          }
        },

        modal: {
          ondismiss: () => {
            toast('Payment cancelled', { icon: '⚠️' })
            setBooking(false)
          }
        }
      }

      if (!window.Razorpay) {
        toast.error('Razorpay not loaded')
        setBooking(false)
        return
      }

      const rzp = new window.Razorpay(razorpayOptions)

      rzp.on('payment.failed', (response) => {
        toast.error(`Payment failed: ${response.error.description}`)
        setBooking(false)
      })

      rzp.open()

    } catch (err) {
      const msg = err.response?.data?.vehicle ||
                  err.response?.data?.error   ||
                  err.response?.data?.detail  ||
                  'Booking failed — please try again'
      toast.error(msg)
      setBooking(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">🚗</div>
        <p className="text-gray-500">Loading vehicle details...</p>
      </div>
    </div>
  )

  if (!vehicle) return null

  const images = vehicle.images || []
  const days   = getDays()

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-fixed"
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(15,23,42,0.78) 0%, rgba(15,23,42,0.88) 100%), url('https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=1800&q=80')`,
      }}
    >
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="rounded-[2rem] border border-white/10 bg-white/10 backdrop-blur-xl shadow-2xl shadow-slate-950/20 p-8 mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-4">
            ← Back to listings
          </Link>
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] items-center">
            <div>
              <span className="inline-flex items-center rounded-full bg-blue-500/20 px-4 py-2 text-sm font-semibold uppercase tracking-[0.25em] text-blue-100">
                Premium rental experience
              </span>
              <h1 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight text-white">
                Rent the {vehicle.brand} {vehicle.model}
              </h1>
              <p className="mt-4 max-w-2xl text-sm md:text-base text-slate-200/90 leading-7">
                Pick up your ride in {vehicle.city} and drive with confidence. Flexible bookings, transparent pricing, and 24/7 support for every journey.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <span className="rounded-full bg-white/10 px-4 py-2 text-sm text-white/90">Free cancellation</span>
                <span className="rounded-full bg-white/10 px-4 py-2 text-sm text-white/90">No hidden fees</span>
                <span className="rounded-full bg-white/10 px-4 py-2 text-sm text-white/90">Roadside assistance</span>
              </div>
            </div>
            <div className="rounded-3xl bg-white/15 p-5 text-right text-sm text-slate-100">
              <p className="text-gray-100 uppercase tracking-[0.2em] text-xs font-semibold">Instant booking</p>
              <p className="mt-3 text-3xl font-bold">₹{vehicle.daily_price}/day</p>
              <p className="mt-2 text-slate-200 text-sm">
                ₹{vehicle.hourly_price}/hr • ₹{vehicle.weekly_price}/week
              </p>
              <div className="mt-4 inline-flex rounded-full bg-blue-500/20 px-4 py-2 text-xs uppercase tracking-[0.2em] text-blue-100">
                {vehicle.is_available ? 'Available now' : 'Currently booked'}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── LEFT COLUMN ── */}
          <div className="lg:col-span-2">

            {/* Main image */}
            <div className="bg-white rounded-2xl shadow overflow-hidden mb-4">
              {images.length > 0 ? (
                <img
                  src={images[activeImage]?.image}
                  alt={`${vehicle.brand} ${vehicle.model}`}
                  className="w-full h-80 object-cover"
                />
              ) : (
                <div className="w-full h-80 bg-gray-100 flex items-center justify-center text-8xl">
                  🚗
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 mb-6 flex-wrap">
                {images.map((img, i) => (
                  <img
                    key={i}
                    src={img.image}
                    onClick={() => setActiveImage(i)}
                    className={`w-20 h-20 object-cover rounded-lg cursor-pointer border-2 ${
                      activeImage === i ? 'border-blue-500' : 'border-transparent'
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Vehicle info */}
            <div className="bg-white rounded-2xl shadow p-6 mb-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-800">
                    {vehicle.brand} {vehicle.model}
                  </h1>
                  <p className="text-gray-500">{vehicle.year}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  vehicle.is_available
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {vehicle.is_available ? '🟢 Available' : '🔴 Unavailable'}
                </span>
              </div>

              {/* Specs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-2xl mb-1">⚙️</p>
                  <p className="text-xs text-gray-500">Transmission</p>
                  <p className="font-semibold capitalize">{vehicle.transmission}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-2xl mb-1">⛽</p>
                  <p className="text-xs text-gray-500">Fuel Type</p>
                  <p className="font-semibold capitalize">{vehicle.fuel_type}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-2xl mb-1">💺</p>
                  <p className="text-xs text-gray-500">Seats</p>
                  <p className="font-semibold">{vehicle.seats} seats</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-2xl mb-1">⭐</p>
                  <p className="text-xs text-gray-500">Rating</p>
                  <p className="font-semibold">
                    {vehicle.avg_rating > 0 ? vehicle.avg_rating : 'New'}
                  </p>
                </div>
              </div>

              {/* Location */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">📍</span>
                <div>
                  <p className="font-semibold">{vehicle.city}</p>
                  <p className="text-gray-500 text-sm">{vehicle.pickup_location}</p>
                </div>
              </div>

              {/* Description */}
              {vehicle.description && (
                <div>
                  <h3 className="font-semibold mb-2">About this car</h3>
                  <p className="text-gray-600">{vehicle.description}</p>
                </div>
              )}
            </div>

            {/* Owner */}
            <div className="bg-white rounded-2xl shadow p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Hosted by</p>
                  <Link to={`/users/${vehicle.owner_id}`} className="text-xl font-semibold text-slate-900 hover:text-blue-600">
                    {vehicle.owner_name}
                  </Link>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-blue-500 text-white text-lg font-semibold">
                    {vehicle.owner_name?.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4 text-sm text-slate-600">
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Rating</p>
                  <p className="mt-2 font-semibold text-slate-900">
                    {vehicle.avg_rating > 0 ? vehicle.avg_rating.toFixed(1) : 'New'}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Reviews</p>
                  <p className="mt-2 font-semibold text-slate-900">{vehicle.review_count || 0}</p>
                </div>
              </div>

              {vehicle.owner_bio && (
                <div className="mb-4 text-sm text-slate-600">
                  <p className="font-medium text-slate-800 mb-2">About the owner</p>
                  <p className="leading-6">{vehicle.owner_bio}</p>
                </div>
              )}

              <div className="border-t border-slate-200 pt-4">
                <Link
                  to={`/users/${vehicle.owner_id}`}
                  className="inline-flex items-center gap-2 rounded-3xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  View owner profile
                </Link>
              </div>
            </div>

            {/* Reviews */}
            <div className="bg-white rounded-2xl shadow p-6 mb-6">
              <h3 className="font-bold text-lg mb-4">
                Reviews ({vehicle.review_count || 0})
              </h3>
              {vehicle.reviews?.length === 0 && (
                <p className="text-gray-400 text-sm">No reviews yet</p>
              )}
              {vehicle.reviews?.map((review) => (
                <div key={review.id} className="border-b pb-4 mb-4 last:border-0">
                  <div className="flex justify-between items-center mb-2">
                    <p className="font-semibold">{review.reviewer_name}</p>
                    <div className="flex">
                      {[...Array(review.rating)].map((_, i) => (
                        <span key={i} className="text-yellow-400">⭐</span>
                      ))}
                    </div>
                  </div>
                  <p className="text-gray-600">{review.comment}</p>
                </div>
              ))}
            </div>

            {/* Add Review — only for non-owners who are logged in */}
            {token && user && vehicle.owner_id !== String(user.id) && (
              <AddReviewForm
                vehicleId={vehicle.id}
                onReviewAdded={() => getVehicle(id).then(res => setVehicle(res.data))}
              />
            )}

          </div>
          {/* ── END LEFT COLUMN ── */}

          {/* ── RIGHT COLUMN — Booking card ── */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow p-6 sticky top-24">

              <h2 className="text-2xl font-bold text-gray-800 mb-1">
                ₹{vehicle.daily_price}
                <span className="text-gray-400 text-base font-normal">/day</span>
              </h2>
              <p className="text-gray-500 text-sm mb-6">
                ₹{vehicle.hourly_price}/hr • ₹{vehicle.weekly_price}/week
              </p>

              {vehicle.is_available ? (
                <>
                  {/* Pickup date */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      🛫 Pickup Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={pickupDate}
                      min={getMinPickupDateTime()}
                      onChange={(e) => setPickupDate(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    {pickupDate && (
                      <p className="text-xs text-blue-600 mt-1 font-medium">
                        ✅ {formatDateTime(pickupDate)}
                      </p>
                    )}
                  </div>

                  {/* Return date */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      🛬 Return Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={returnDate}
                      min={pickupDate || new Date().toISOString().slice(0, 16)}
                      onChange={(e) => setReturnDate(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    {returnDate && (
                      <p className="text-xs text-blue-600 mt-1 font-medium">
                        ✅ {formatDateTime(returnDate)}
                      </p>
                    )}
                  </div>

                  {/* Price breakdown */}
                  {totalPrice > 0 && (
                    <div className="bg-blue-50 rounded-xl p-4 mb-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Duration</span>
                        <span className="font-medium text-gray-800">
                          {getDurationLabel()}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">
                          {computeBookingTotals().breakdown}
                        </span>
                        <span className="font-medium text-gray-800">₹{totalPrice}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Service fee</span>
                        <span className="text-green-600 font-medium">Free</span>
                      </div>
                      <div className="border-t pt-2 flex justify-between">
                        <span className="font-bold text-gray-800">Total</span>
                        <span className="text-2xl font-bold text-blue-600">₹{totalPrice}</span>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleBooking}
                    disabled={booking || !vehicle.is_available}
                    className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition text-lg">
                    {booking ? '⏳ Processing...' : 'Book & Pay Now'}
                  </button>

                  <p className="text-center text-gray-400 text-xs mt-3">
                    🔒 Secure payment via Razorpay
                  </p>
                </>
              ) : (
                <div className="bg-red-50 rounded-xl p-4 text-center">
                  <p className="text-red-600 font-semibold">
                    This vehicle is currently unavailable
                  </p>
                </div>
              )}
            </div>
          </div>
          {/* ── END RIGHT COLUMN ── */}

        </div>
      </div>
    </div>
  )
}

export default VehicleDetailPage