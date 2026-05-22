import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { createBooking } from '../api/bookings'
import { createOrder, verifyPayment } from '../api/payments'
import { getVehicle } from '../api/vehicles'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

const BookingPage = () => {
  const { vehicleId } = useParams()
  const navigate      = useNavigate()
  const { user }      = useAuthStore()

  const [vehicle,    setVehicle]    = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [booking,    setBooking]    = useState(false)
  const [pickupDate, setPickupDate] = useState('')
  const [returnDate, setReturnDate] = useState('')
  const [totalPrice, setTotalPrice] = useState(0)

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getVehicle(vehicleId)
        setVehicle(res.data)
      } catch {
        toast.error('Vehicle not found')
        navigate('/')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [vehicleId])

  // Auto calculate price when dates change
  useEffect(() => {
    if (pickupDate && returnDate && vehicle) {
      const start = new Date(pickupDate)
      const end   = new Date(returnDate)
      const days  = Math.ceil((end - start) / (1000 * 60 * 60 * 24))
      setTotalPrice(days > 0 ? days * vehicle.daily_price : 0)
    }
  }, [pickupDate, returnDate, vehicle])

  const getApiErrorMessage = (data) => {
    if (!data) return null
    if (typeof data === 'string') return data
    if (Array.isArray(data)) return data.join(' ')
    if (typeof data === 'object') {
      return Object.values(data).flat().join(' ')
    }
    return null
  }

  const getMinPickupDateTime = () => {
    const now = new Date()
    now.setMinutes(now.getMinutes() + 5)
    return now.toISOString().slice(0, 16)
  }

  const handleBookAndPay = async () => {
    if (!pickupDate || !returnDate) {
      toast.error('Please select pickup and return dates')
      return
    }

    const pickup = new Date(pickupDate)
    const now = new Date()
    const bufferTime = new Date(now.getTime() + 5 * 60000) // 5 minutes in ms
    if (pickup < bufferTime) {
      toast.error('Pickup date must be at least 5 minutes from now')
      return
    }
    if (new Date(returnDate) <= pickup) {
      toast.error('Return date must be after pickup date')
      return
    }
    if (totalPrice <= 0) {
      toast.error('Return date must be after pickup date')
      return
    }

    setBooking(true)
    try {
      // Step 1 — Create booking
      const bookingRes = await createBooking({
        vehicle:     vehicleId,
        pickup_date: new Date(pickupDate).toISOString(),
        return_date: new Date(returnDate).toISOString(),
      })
      const bookingId = bookingRes.data.id

      // Step 2 — Create Razorpay order
      const orderRes = await createOrder({ booking_id: bookingId })
      const order    = orderRes.data

      // Step 3 — Open Razorpay payment popup
      const options = {
        key:         import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount:      order.amount,
        currency:    order.currency,
        name:        'DriveShare',
        description: `${vehicle.brand} ${vehicle.model} Rental`,
        order_id:    order.order_id,
        prefill: {
          name:    user?.username,
          email:   user?.email,
          contact: user?.phone,
        },
        theme: { color: '#2563EB' },

        handler: async (response) => {
          try {
            // Step 4 — Verify payment on backend
            await verifyPayment({
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
            })
            toast.success('Booking confirmed! 🎉')
            navigate('/my-bookings')
          } catch {
            toast.error('Payment verification failed')
          }
        },

        modal: {
          ondismiss: () => {
            toast.error('Payment cancelled')
            setBooking(false)
          }
        }
      }

      const rzp = new window.Razorpay(options)
      rzp.open()

    } catch (err) {
      const msg = getApiErrorMessage(err.response?.data) ||
                  err.response?.data?.vehicle ||
                  err.response?.data?.error   ||
                  'Booking failed — try again'
      toast.error(msg)
      setBooking(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Loading...</p>
    </div>
  )

  if (!vehicle) return null

  const days = pickupDate && returnDate
    ? Math.ceil((new Date(returnDate) - new Date(pickupDate)) / (1000 * 60 * 60 * 24))
    : 0

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <Link to={`/vehicles/${vehicleId}`}
            className="text-blue-600 hover:underline text-sm">
            ← Back to vehicle
          </Link>
          <h1 className="text-3xl font-bold text-gray-800 mt-2">
            Complete Your Booking
          </h1>
        </div>

        {/* Vehicle summary */}
        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <div className="flex gap-4 items-center">
            <div className="w-20 h-20 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
              {vehicle.images?.[0] ? (
                <img src={vehicle.images[0].image}
                  className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl">
                  🚗
                </div>
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                {vehicle.brand} {vehicle.model}
              </h2>
              <p className="text-gray-500">
                {vehicle.year} • {vehicle.transmission} • {vehicle.fuel_type}
              </p>
              <p className="text-gray-500 text-sm">📍 {vehicle.city}</p>
            </div>
          </div>
        </div>

        {/* Date selection */}
        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            📅 Select Dates
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pickup Date & Time
              </label>
              <input
                type="datetime-local"
                value={pickupDate}
                min={new Date().toISOString().slice(0, 16)}
                onChange={(e) => setPickupDate(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Return Date & Time
              </label>
              <input
                type="datetime-local"
                value={returnDate}
                min={pickupDate || new Date().toISOString().slice(0, 16)}
                onChange={(e) => setReturnDate(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Price breakdown */}
        {days > 0 && (
          <div className="bg-white rounded-2xl shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              💰 Price Breakdown
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between text-gray-600">
                <span>₹{vehicle.daily_price} × {days} day{days > 1 ? 's' : ''}</span>
                <span>₹{days * vehicle.daily_price}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Service fee</span>
                <span className="text-green-600">Free</span>
              </div>
              <div className="border-t pt-3 flex justify-between">
                <span className="font-bold text-gray-800 text-lg">Total</span>
                <span className="font-bold text-blue-600 text-2xl">
                  ₹{totalPrice}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Pickup info */}
        <div className="bg-blue-50 rounded-2xl p-4 mb-6">
          <h3 className="font-semibold text-blue-800 mb-1">📍 Pickup Location</h3>
          <p className="text-blue-700">{vehicle.pickup_location}</p>
          <p className="text-blue-600 text-sm">{vehicle.city}</p>
        </div>

        {/* Book button */}
        <button
          onClick={handleBookAndPay}
          disabled={booking || !pickupDate || !returnDate || totalPrice <= 0}
          className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-xl hover:bg-blue-700 disabled:opacity-50 transition">
          {booking ? 'Processing...' : `Book & Pay ₹${totalPrice || '—'}`}
        </button>

        <p className="text-center text-gray-400 text-sm mt-3">
          🔒 Secure payment via Razorpay • No hidden charges
        </p>
      </div>
    </div>
  )
}

export default BookingPage