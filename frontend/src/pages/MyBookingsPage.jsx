import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getMyBookings, cancelBooking, completeExpiredBookings } from '../api/bookings'
import { requestRefund, getRefundPolicy } from '../api/payments'
import { useAuthStore } from '../store/authStore'
import api from '../api/axios'
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

const ReviewForm = ({ vehicleId, bookingId, onDone }) => {
  const [rating,  setRating]  = useState(0)
  const [hover,   setHover]   = useState(0)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!rating) { toast.error('Please select a star rating'); return }
    setLoading(true)
    try {
      await api.post(`/vehicles/${vehicleId}/add_review/`, { rating, comment })
      toast.success('Review submitted! ⭐')
      onDone()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not submit review')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-4 bg-slate-50 rounded-3xl p-5 border border-slate-200 shadow-sm">
      <p className="font-semibold text-slate-900 text-sm mb-4">Rate your experience</p>
      <form onSubmit={handleSubmit}>
        <div className="flex gap-1 mb-3">
          {[1,2,3,4,5].map(star => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
              className="text-2xl transition">
              {star <= (hover || rating) ? '⭐' : '☆'}
            </button>
          ))}
          {rating > 0 && (
            <span className="ml-2 text-xs text-slate-500 self-center">
              {['','Poor','Fair','Good','Very Good','Excellent'][rating]}
            </span>
          )}
        </div>

        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Share your experience..."
          rows={3}
          className="w-full border rounded-3xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 mb-4 bg-white"
        />

        <button
          type="submit"
          disabled={loading || !rating}
          className="bg-slate-900 text-white px-5 py-3 rounded-3xl text-sm font-semibold hover:bg-slate-800 disabled:opacity-50">
          {loading ? 'Submitting...' : 'Submit Review'}
        </button>
      </form>
    </div>
  )
}

const MyBookingsPage = () => {
  const { user }                      = useAuthStore()
  const [bookings,    setBookings]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [reviewFor,   setReviewFor]   = useState(null)
  const [reviewed,    setReviewed]    = useState([])
  const [cancelConfirm, setCancelConfirm] = useState(null)
  const [cancelling,  setCancelling]  = useState(false)
  const [refundModal,   setRefundModal]   = useState(null)
  const [refundPolicy,  setRefundPolicy]  = useState(null)
  const [refundLoading, setRefundLoading] = useState(false)
  const [refundReason,  setRefundReason]  = useState('')

  useEffect(() => {
    completeExpiredBookings().catch(() => {})
    fetchBookings()
  }, [])

  const fetchBookings = async () => {
    try {
      const res = await getMyBookings()
      setBookings(res.data)
    } catch {
      toast.error('Failed to load bookings')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = (id) => {
    setCancelConfirm(id)
  }

  const confirmCancelBooking = async () => {
    if (!cancelConfirm) return
    setCancelling(true)
    try {
      await cancelBooking(cancelConfirm)
      toast.success('Booking cancelled successfully')
      fetchBookings()
      setCancelConfirm(null)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Cannot cancel this booking')
    } finally {
      setCancelling(false)
    }
  }

  const openRefundModal = async (booking) => {
    setRefundModal(booking)
    try {
      const res = await getRefundPolicy(booking.id)
      setRefundPolicy(res.data)
    } catch {
      toast.error('Could not get refund policy')
    }
  }

  const handleRefund = async () => {
    if (!refundModal) return
    setRefundLoading(true)
    try {
      const res = await requestRefund({
        booking_id: refundModal.id,
        reason:     refundReason || 'Customer requested cancellation'
      })
      toast.success(`Refund of ₹${res.data.refund_amount} initiated! 💰`)
      setRefundModal(null)
      setRefundPolicy(null)
      fetchBookings()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Refund failed')
    } finally {
      setRefundLoading(false)
    }
  }

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    })

  const totalSpend = bookings.reduce((total, booking) => total + Number(booking.total_price || 0), 0)
  const confirmedCount = bookings.filter(b => b.status === 'confirmed').length
  const completedCount = bookings.filter(b => b.status === 'completed').length
  const pendingCount = bookings.filter(b => b.status === 'pending').length

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <p className="text-slate-500">Loading your bookings...</p>
    </div>
  )

  return (
    <div
      className="min-h-screen bg-slate-950/95 py-8 px-4"
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(15,23,42,0.92) 0%, rgba(15,23,42,0.86) 100%), url('https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=1600&q=80')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="max-w-6xl mx-auto space-y-8">

        <section className="rounded-[2rem] bg-slate-950/90 border border-white/10 text-white p-8 shadow-2xl overflow-hidden backdrop-blur-xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <p className="text-sm uppercase tracking-[0.3em] text-slate-400 mb-3">My rentals</p>
              <h1 className="text-4xl font-semibold tracking-tight">Your ride history and upcoming trips</h1>
              <p className="mt-4 text-slate-300 text-sm sm:text-base">
                Manage all your vehicle bookings from one place. See pickup and return details, payment summary, and quick actions for every rental.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-3xl bg-slate-900/90 p-5 border border-white/10">
                <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Total bookings</p>
                <p className="mt-3 text-3xl font-semibold">{bookings.length}</p>
              </div>
              <div className="rounded-3xl bg-slate-900/90 p-5 border border-white/10">
                <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Upcoming</p>
                <p className="mt-3 text-3xl font-semibold text-emerald-300">{confirmedCount}</p>
              </div>
              <div className="rounded-3xl bg-slate-900/90 p-5 border border-white/10">
                <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Total spent</p>
                <p className="mt-3 text-3xl font-semibold">₹{totalSpend}</p>
              </div>
            </div>
          </div>
        </section>

        {bookings.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[2rem] shadow-xl">
            <p className="text-6xl mb-4">🚘</p>
            <h3 className="text-2xl font-semibold text-slate-900 mb-2">No bookings yet</h3>
            <p className="text-slate-500 mb-6">Browse cars and reserve the perfect ride for your next trip.</p>
            <Link to="/" className="inline-flex items-center justify-center rounded-full bg-slate-900 px-7 py-3 text-white text-sm font-semibold hover:bg-slate-800">
              Browse Cars
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {bookings.map((booking) => (
              <div key={booking.id} className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/95 shadow-2xl transition hover:-translate-y-0.5">
                <div className="grid gap-6 md:grid-cols-[320px_1fr]">
                  <div className="relative h-72 overflow-hidden bg-slate-200">
                    {booking.vehicle_image ? (
                      <img src={booking.vehicle_image} className="h-full w-full object-cover" alt={`${booking.vehicle_brand} ${booking.vehicle_model}`} />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-6xl text-slate-400">🚗</div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/10 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-6">
                      {booking.vehicle_type && (
                        <span className="inline-flex rounded-full bg-slate-900/70 px-3 py-1 text-xs uppercase tracking-[0.35em] text-slate-300 mb-2">
                          {booking.vehicle_type}
                        </span>
                      )}
                      <h2 className="text-3xl font-semibold text-white leading-tight">{booking.vehicle_brand} {booking.vehicle_model}</h2>
                      <p className="mt-2 text-sm text-slate-300">Hosted by {booking.owner_name || 'DriveShare Host'}</p>
                    </div>
                    <div className="absolute top-4 left-4 flex flex-col gap-2">
                      <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${STATUS_STYLES[booking.status]}`}>
                        {STATUS_ICONS[booking.status]} {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col justify-between p-6 gap-6">
                    <div className="space-y-6">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-[0.3em] text-slate-400 mb-2">Vehicle booking</p>
                          <p className="text-sm text-slate-500">{booking.pickup_location || booking.pickup_address || 'City center'} → {booking.return_location || booking.return_address || 'City center'}</p>
                        </div>
                        <div className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700">
                          {booking.owner_name || 'DriveShare Host'}
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-3 text-sm text-slate-600">
                        <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                          <p className="text-xs uppercase tracking-[0.28em] text-slate-400 mb-2">Pickup</p>
                          <p className="font-semibold text-slate-900 mb-1">{booking.pickup_location || booking.pickup_address || 'City center'}</p>
                          <p>{formatDate(booking.pickup_date)}</p>
                        </div>
                        <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                          <p className="text-xs uppercase tracking-[0.28em] text-slate-400 mb-2">Return</p>
                          <p className="font-semibold text-slate-900 mb-1">{booking.return_location || booking.return_address || 'City center'}</p>
                          <p>{formatDate(booking.return_date)}</p>
                        </div>
                        <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                          <p className="text-xs uppercase tracking-[0.28em] text-slate-400 mb-2">Total paid</p>
                          <p className="text-3xl font-semibold text-blue-600">₹{booking.total_price}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap gap-3">
                        {booking.status === 'confirmed' && (
                          <>
                            <Link
                              to={`/chat/${booking.id}`}
                              className="inline-flex items-center justify-center gap-2 rounded-3xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition">
                              💬 Chat with host
                            </Link>
                            <button
                              onClick={() => openRefundModal(booking)}
                              className="inline-flex items-center justify-center gap-2 rounded-3xl bg-white px-4 py-3 text-sm font-semibold text-red-700 border border-red-100 hover:bg-red-50 transition">
                              ❌ Cancel & refund
                            </button>
                          </>
                        )}
                        {booking.status === 'pending' && (
                          <button
                            onClick={() => handleCancel(booking.id)}
                            className="inline-flex items-center justify-center gap-2 rounded-3xl bg-orange-100 px-4 py-3 text-sm font-semibold text-orange-700 hover:bg-orange-200 transition border border-orange-200">
                            Cancel booking
                          </button>
                        )}
                        {booking.status === 'completed' && !reviewed.includes(booking.vehicle) && (
                          <button
                            onClick={() => setReviewFor(reviewFor === booking.id ? null : booking.id)}
                            className="inline-flex items-center justify-center gap-2 rounded-3xl bg-amber-100 px-4 py-3 text-sm font-semibold text-amber-700 hover:bg-amber-200 transition border border-amber-200">
                            {reviewFor === booking.id ? '✕ Close review' : '⭐ Rate & review'}
                          </button>
                        )}
                      </div>
                      {reviewed.includes(booking.vehicle) && (
                        <span className="text-sm font-semibold text-emerald-600">✅ Review submitted</span>
                      )}
                    </div>

                    {reviewFor === booking.id && (
                      <ReviewForm
                        vehicleId={booking.vehicle}
                        bookingId={booking.id}
                        onDone={() => {
                          setReviewed(prev => [...prev, booking.vehicle])
                          setReviewFor(null)
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {cancelConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-gradient-to-r from-orange-50 to-orange-100 px-6 py-8 text-center">
              <div className="text-5xl mb-3">❌</div>
              <h2 className="text-2xl font-bold text-gray-800">Cancel Booking?</h2>
            </div>
            <div className="px-6 py-6">
              <p className="text-gray-700 text-center mb-2">Are you sure you want to cancel this booking?</p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
                <p className="text-red-700 font-semibold text-sm mb-1">⚠️ No Refund</p>
                <p className="text-red-600 text-xs">Cancelling this booking is permanent. No refund will be issued.</p>
              </div>
              {bookings.find(b => b.id === cancelConfirm) && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
                  {(() => {
                    const booking = bookings.find(b => b.id === cancelConfirm)
                    return (
                      <div className="flex items-center gap-3">
                        {booking.vehicle_image && (
                          <img src={booking.vehicle_image} alt={booking.vehicle_brand} className="w-16 h-16 rounded-lg object-cover" />
                        )}
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800">{booking.vehicle_brand} {booking.vehicle_model}</p>
                          <p className="text-sm text-gray-600">Pickup: {new Date(booking.pickup_date).toLocaleDateString('en-IN')}</p>
                          <p className="text-sm font-bold text-orange-600">₹{booking.total_price}</p>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
            <div className="flex gap-3 px-6 py-4 bg-gray-50 border-t">
              <button
                onClick={() => setCancelConfirm(null)}
                disabled={cancelling}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-100 transition disabled:opacity-50">
                Keep Booking
              </button>
              <button
                onClick={confirmCancelBooking}
                disabled={cancelling}
                className="flex-1 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2">
                {cancelling ? (
                  <>
                    <span className="inline-block animate-spin">⏳</span>
                    Cancelling...
                  </>
                ) : (
                  <>❌ Cancel Booking</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {refundModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Cancel Booking & Request Refund</h2>
            <p className="text-gray-500 text-sm mb-6">{refundModal.vehicle_brand} {refundModal.vehicle_model}</p>
            {refundPolicy && (
              <div className="bg-blue-50 rounded-xl p-4 mb-4">
                <h3 className="font-semibold text-blue-800 mb-3">💰 Your Refund Amount</h3>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Total Paid</span>
                  <span className="font-bold">₹{refundPolicy.total_paid}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Refund ({refundPolicy.refund_percent}%)</span>
                  <span className="font-bold text-green-600 text-xl">₹{refundPolicy.refund_amount}</span>
                </div>
                <div className="flex justify-between items-center text-sm text-gray-500">
                  <span>Hours before pickup</span>
                  <span>{refundPolicy.hours_before} hours</span>
                </div>
              </div>
            )}
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">📋 Cancellation Policy</h4>
              <div className="space-y-1">
                {refundPolicy?.policy?.map((p, i) => (
                  <div key={i} className="flex justify-between text-xs text-gray-600">
                    <span>{p.hours}</span>
                    <span className="font-semibold text-green-600">{p.refund} refund</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason for cancellation</label>
              <select
                value={refundReason}
                onChange={e => setRefundReason(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select a reason</option>
                <option value="Change of plans">Change of plans</option>
                <option value="Found better option">Found better option</option>
                <option value="Emergency">Emergency</option>
                <option value="Vehicle not as described">Vehicle not as described</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setRefundModal(null); setRefundPolicy(null) }}
                className="flex-1 border border-gray-300 text-gray-600 py-3 rounded-xl hover:bg-gray-50">
                Keep Booking
              </button>
              <button
                onClick={handleRefund}
                disabled={refundLoading}
                className="flex-1 bg-red-500 text-white py-3 rounded-xl hover:bg-red-600 disabled:opacity-50 font-semibold">
                {refundLoading ? 'Processing...' : `Cancel & Get ₹${refundPolicy?.refund_amount || '...'}`}
              </button>
            </div>
            <p className="text-center text-gray-400 text-xs mt-3">Refund will be processed in 5-7 business days</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default MyBookingsPage
