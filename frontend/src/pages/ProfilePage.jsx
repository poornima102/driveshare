import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMe, updateProfile, changePassword, deleteAccount } from '../api/auth'
import { getMyBookings, getDashboard } from '../api/bookings'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

const ProfilePage = () => {
  const navigate = useNavigate()
  const { setAuth, token, logout } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const defaultProfileImage = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&q=80'
  const apiBaseURL = (import.meta.env.VITE_API_URL).replace(/\/api\/?$/, '')
  
  const normalizeMediaUrl = (url) => {
    if (!url) return defaultProfileImage
    if (url.startsWith('http')) return url
    const safeUrl = url.startsWith('/') ? url : `/${url}`
    return `${apiBaseURL}${safeUrl}`
  }

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone: '',
    bio: '',
    profile_image: defaultProfileImage,
    created_at: '',
  })
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [ratingInfo, setRatingInfo] = useState({
    average: 0,
    reviews: 0,
    happyRate: 0,
  })
  const [bookingStats, setBookingStats] = useState({
    totalBookings: 0,
    completedBookings: 0,
    activeBookings: 0,
    totalSpent: 0,
  })
  const [ownerStats, setOwnerStats] = useState({
    totalEarnings: 0,
    totalBookings: 0,
    completedBookings: 0,
    cancellationRate: 0,
  })
  const [verification, setVerification] = useState({
    emailVerified: false,
    hasPhone: false,
  })
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })

  useEffect(() => {
    const fetch = async () => {
      try {
        const [userRes, myBookingsRes, dashboardRes] = await Promise.all([
          getMe(),
          getMyBookings(),
          getDashboard().catch(() => ({ data: null }))
        ])

        const u = userRes.data
        const bookings = myBookingsRes.data || []

        const completedBookings = bookings.filter((b) => b.status === 'completed').length
        const activeBookings = bookings.filter((b) => ['pending', 'confirmed'].includes(b.status)).length
        const totalSpent = bookings.reduce((sum, booking) => sum + Number(booking.total_price || 0), 0)

        setFormData({
          username: u.username || '',
          email: u.email || '',
          phone: u.phone || '',
          bio: u.bio || '',
          profile_image: normalizeMediaUrl(u.profile_image) || defaultProfileImage,
          created_at: u.created_at || '',
        })
        setRatingInfo({
          average: u.rating ?? 0,
          reviews: u.review_count ?? 0,
          happyRate: u.happy_rate ?? 0,
        })
        setBookingStats({
          totalBookings: bookings.length,
          completedBookings,
          activeBookings,
          totalSpent,
        })

        if (dashboardRes.data) {
          setOwnerStats({
            totalEarnings: Number(dashboardRes.data.total_earnings || 0),
            totalBookings: Number(dashboardRes.data.total_bookings || 0),
            completedBookings: Number(dashboardRes.data.completed_bookings || 0),
            cancellationRate: Number(dashboardRes.data.cancellation_rate || 0),
          })
        }

        setVerification({
          emailVerified: u.is_verified ?? false,
          hasPhone: Boolean(u.phone),
        })
      } catch (error) {
        console.error(error)
        toast.error('Failed to load profile data')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const oldPreviewUrl = formData.profile_image?.startsWith?.('blob:') ? formData.profile_image : null
      const submitData = new FormData()
      submitData.append('username', formData.username)
      submitData.append('phone', formData.phone)
      submitData.append('bio', formData.bio)
      if (selectedPhoto) {
        submitData.append('profile_image', selectedPhoto)
      }

      const res = await updateProfile(submitData)
      setAuth(res.data.user, token)
      setFormData((prev) => ({
        ...prev,
        profile_image: normalizeMediaUrl(res.data.user.profile_image) || prev.profile_image,
      }))
      if (selectedPhoto && oldPreviewUrl) {
        URL.revokeObjectURL(oldPreviewUrl)
      }
      setSelectedPhoto(null)
      toast.success('Profile updated successfully!')
      setIsEditing(false)
    } catch (err) {
      const errors = err.response?.data
      if (errors) {
        const firstError = Object.values(errors)[0]
        toast.error(Array.isArray(firstError) ? firstError[0] : firstError)
      } else {
        toast.error('Failed to update profile')
      }
    } finally {
      setSaving(false)
    }
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (formData.profile_image?.startsWith?.('blob:')) {
      URL.revokeObjectURL(formData.profile_image)
    }
    const previewUrl = URL.createObjectURL(file)
    setSelectedPhoto(file)
    setFormData((prev) => ({
      ...prev,
      profile_image: previewUrl,
    }))
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('New passwords do not match')
      return
    }
    
    if (passwordForm.new_password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setPasswordLoading(true)
    try {
      await changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      })
      toast.success('Password changed successfully!')
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' })
      setShowPasswordModal(false)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to change password')
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    setDeleteLoading(true)
    try {
      await deleteAccount()
      toast.success('Account deleted successfully')
      logout()
      navigate('/login')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete account')
    } finally {
      setDeleteLoading(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="text-center">
        <div className="inline-block animate-pulse mb-4">
          <div className="w-12 h-12 bg-blue-600 rounded-full"></div>
        </div>
        <p className="text-gray-600 font-medium">Loading your profile...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Navigation Breadcrumb */}
      <div className="border-b border-white/10 backdrop-blur-md bg-white/5 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <span className="text-blue-300 font-semibold">My Profile</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Premium Profile Header Card */}
        <div className="rounded-3xl border border-white/10 bg-slate-950/90 shadow-2xl shadow-slate-950/20 overflow-hidden mb-8">
          <div className="relative">
            <div
              className="h-48 sm:h-56 relative overflow-hidden bg-cover bg-center"
              style={{
                backgroundImage: `url('https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1400&q=80')`,
              }}
            >
              <div className="absolute inset-0 bg-slate-950/75" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.35),_transparent_25%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(14,165,233,0.25),_transparent_22%)]" />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.12),rgba(15,23,42,0.75))]" />
            </div>
            <div className="absolute left-6 -bottom-20">
              <div className="w-44 h-44 rounded-[28px] overflow-hidden border-4 border-white/20 shadow-2xl bg-slate-900">
                <img
                  src={formData.profile_image || defaultProfileImage}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          <div className="px-6 sm:px-8 pb-8 pt-28">
            <div className="flex flex-col lg:flex-row lg:items-end gap-6 relative z-10">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-sm text-white/90 backdrop-blur-sm">
                    <svg className="w-4 h-4 text-sky-300" fill="currentColor" viewBox="0 0 20 20"><path d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" /></svg>
                    Host Partner
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200/20 bg-emerald-200/10 px-3 py-1.5 text-sm text-emerald-100 backdrop-blur-sm">
                    <svg className="w-4 h-4 text-emerald-300" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    Verified Host
                  </span>
                </div>

                <h1 className="text-4xl sm:text-5xl font-semibold text-white tracking-tight">{formData.username}</h1>
                <p className="text-slate-300 mt-4 max-w-2xl leading-7">Your profile is the hub for your rentals and hosted trips. Keep your details updated so renters can book with confidence.</p>

                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-white/90 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Rating</p>
                    <p className="mt-3 text-3xl font-semibold text-amber-300">{Number(ratingInfo.average || 0).toFixed(1)}</p>
                    <p className="mt-1 text-sm text-slate-400">Based on {ratingInfo.reviews || 0} reviews</p>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-white/90 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Repeat Rate</p>
                    <p className="mt-3 text-3xl font-semibold text-emerald-300">{ratingInfo.happyRate || 0}%</p>
                    <p className="mt-1 text-sm text-slate-400">Would book again</p>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-white/90 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Verified</p>
                    <p className="mt-3 text-3xl font-semibold text-sky-300">{verification.emailVerified && verification.hasPhone ? 'Full' : 'Partial'}</p>
                    <p className="mt-1 text-sm text-slate-400">Verified email + phone connected</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 min-w-[220px]">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Member since</p>
                  <p className="mt-3 text-xl font-semibold text-white">{formData.created_at ? new Date(formData.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown'}</p>
                </div>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-3xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-transform duration-200 hover:-translate-y-0.5 hover:bg-blue-500 active:scale-95">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                    Edit Profile
                  </button>
                )}
              </div>
            </div>

            {/* Rating Summary */}
            <div className="mt-10 rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-sm">
              <p className="text-sm text-slate-400 mb-4">Rating based on {ratingInfo.reviews || 0} reviews</p>
              <div className="flex flex-wrap items-center gap-3">
                {Array.from({ length: 5 }, (_, i) => (
                  <svg key={i} className={`w-5 h-5 ${i < Math.round(Number(ratingInfo.average || 0)) ? 'text-amber-400' : 'text-slate-600'}`} fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                ))}
                <span className="ml-2 text-sm font-medium text-white/90">{Number(ratingInfo.average || 0).toFixed(1)} out of 5</span>
                <span className="ml-2 text-sm text-slate-400">({ratingInfo.reviews || 0} reviews)</span>
              </div>
              <p className="mt-2 text-sm text-slate-400">{ratingInfo.happyRate || 0}% of renters would book again</p>
            </div>

            {formData.bio && !isEditing && (
              <div className="mt-6 p-4 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-sm">
                <p className="text-slate-100 italic">"{formData.bio}"</p>
              </div>
            )}
          </div>
        </div>

        {/* Profile Details */}
        <div className="rounded-3xl border border-white/10 bg-slate-950/90 p-6 shadow-lg shadow-slate-950/10 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Profile Details</p>
              <h2 className="text-2xl font-semibold text-white">More about your account</h2>
            </div>
            <div className="text-sm text-slate-400">Visible details include verification and membership status.</div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Email</p>
              <p className="mt-3 text-lg font-semibold text-white">{formData.email || 'Not available'}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Phone</p>
              <p className="mt-3 text-lg font-semibold text-white">{formData.phone || 'Not provided'}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Member Since</p>
              <p className="mt-3 text-lg font-semibold text-white">{formData.created_at ? new Date(formData.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown'}</p>
            </div>
          </div>

        </div>

        {/* Key Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-sm p-6 hover:bg-white/15 hover:shadow-lg transition-all cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm font-medium">Total Bookings</p>
                <p className="text-3xl font-bold text-white mt-2">{bookingStats.totalBookings}</p>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <svg className="w-6 h-6 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-sm p-6 hover:bg-white/15 hover:shadow-lg transition-all cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm font-medium">Completed Trips</p>
                <p className="text-3xl font-bold text-green-400 mt-2">{bookingStats.completedBookings}</p>
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <svg className="w-6 h-6 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-sm p-6 hover:bg-white/15 hover:shadow-lg transition-all cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm font-medium">Active Bookings</p>
                <p className="text-3xl font-bold text-orange-400 mt-2">{bookingStats.activeBookings}</p>
              </div>
              <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <svg className="w-6 h-6 text-orange-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-sm p-6 hover:bg-white/15 hover:shadow-lg transition-all cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm font-medium">Total Spent</p>
                <p className="text-3xl font-bold text-purple-400 mt-2">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(bookingStats.totalSpent || 0)}</p>
              </div>
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <svg className="w-6 h-6 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
            </div>
          </div>
        </div>

        {/* Host Earnings Section */}
        {ownerStats.totalEarnings > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl p-6 hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-indigo-700 text-sm font-medium">Host Earnings</p>
                  <p className="text-3xl font-bold text-indigo-600 mt-2">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(ownerStats.totalEarnings || 0)}</p>
                </div>
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-orange-50 border border-red-200 rounded-xl p-6 hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-700 text-sm font-medium">Cancellation Rate</p>
                  <p className="text-3xl font-bold text-red-600 mt-2">{ownerStats.cancellationRate}%</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"></path></svg>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Edit Form or View Mode */}
            <div className="bg-slate-900 border border-slate-700/60 rounded-3xl overflow-hidden shadow-2xl shadow-slate-950/20">
              <div className="bg-gradient-to-r from-sky-600 via-slate-900 to-slate-950 px-8 py-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                      Edit Your Profile
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      Profile Information
                    </>
                  )}
                </h3>
              </div>

              <div className="px-8 py-8 text-slate-100">
                {isEditing ? (
                  <form onSubmit={handleSubmit} className="grid gap-6">
                    <div className="grid gap-6 md:grid-cols-2">
                      <div>
                        <label className="block text-sm font-semibold text-slate-100 mb-2">
                          Full Name
                        </label>
                        <input
                          value={formData.username}
                          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                          className="w-full px-4 py-3 border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                          placeholder="Enter your full name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-100 mb-2">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={formData.email}
                          disabled
                          className="w-full px-4 py-3 border border-slate-700 rounded-2xl bg-slate-950 text-slate-300 cursor-not-allowed"
                        />
                        <p className="text-xs text-slate-400 mt-1">Email cannot be changed for security</p>
                      </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                      <div>
                        <label className="block text-sm font-semibold text-slate-100 mb-2">
                          Phone Number
                        </label>
                        <input
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full px-4 py-3 border border-slate-700 rounded-2xl bg-slate-950 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                          placeholder="+91 XXXXX XXXXX"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-100 mb-2">
                          Profile Photo
                        </label>
                        <div className="flex items-center gap-4">
                          <div className="w-20 h-20 rounded-3xl overflow-hidden border-2 border-slate-300 bg-slate-50">
                            <img src={formData.profile_image || defaultProfileImage} alt="Preview" className="w-full h-full object-cover" />
                          </div>
                          <label className="cursor-pointer px-4 py-2 border-2 border-slate-700 rounded-2xl bg-slate-950 text-sm font-semibold text-slate-100 hover:bg-slate-800 transition-colors">
                            Upload Photo
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handlePhotoChange}
                              className="hidden"
                            />
                          </label>
                        </div>
                        <p className="text-xs text-slate-400 mt-2">JPG, PNG up to 5MB. Recommended: 400x400px</p>
                      </div>
                    </div>

                    <div className="grid gap-6">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-slate-100 mb-2">
                          Bio
                        </label>
                        <textarea
                          value={formData.bio}
                          onChange={(e) => setFormData({ ...formData, bio: e.target.value.slice(0, 500) })}
                          rows={5}
                          placeholder="Tell other members about yourself, your experience with vehicles, and driving habits..."
                          className="w-full px-4 py-3 border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
                        />
                        <p className="text-xs text-slate-400 mt-2">{formData.bio.length}/500 characters</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 pt-4 border-t border-slate-700 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="flex-1 px-4 py-3 border border-slate-700 text-slate-100 font-semibold rounded-2xl hover:bg-slate-800 active:scale-95 transition-all">
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className="flex-1 px-4 py-3 bg-blue-600 text-white font-semibold rounded-2xl hover:bg-blue-700 disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center gap-2">
                        {saving ? (
                          <>
                            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                            Saving...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"></path></svg>
                            Save Changes
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-6">
                    <div className="border-b border-slate-700 pb-4">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Full Name</p>
                      <p className="text-lg font-semibold text-slate-100 mt-1">{formData.username}</p>
                    </div>
                    <div className="border-b border-slate-700 pb-4">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Email</p>
                      <p className="text-lg font-semibold text-slate-100 mt-1">{formData.email || 'Not available'}</p>
                    </div>
                    <div className="border-b border-slate-700 pb-4">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Phone Number</p>
                      <p className="text-lg font-semibold text-slate-100 mt-1">{formData.phone || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Bio</p>
                      <p className="text-slate-300 mt-1 leading-relaxed">{formData.bio || 'No bio added yet'}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Verification Status */}
            <div className="bg-slate-900 border border-slate-700/60 rounded-3xl p-6 shadow-2xl shadow-slate-950/20">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-5 h-5 text-sky-300" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"></path></svg>
                <h4 className="text-lg font-bold text-white">Verification</h4>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-4 bg-slate-950/80 border border-slate-700 rounded-3xl">
                  <svg className="w-5 h-5 text-emerald-300 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                  <div>
                    <p className="font-semibold text-white text-sm">Email Verified</p>
                    <p className="text-xs text-slate-400 mt-0.5">{verification.emailVerified ? `Confirmed on ${formData.created_at ? new Date(formData.created_at).toLocaleDateString() : 'signup'}` : 'Verify your email to unlock instant bookings'}</p>
                  </div>
                </div>
                <div className={`flex items-start gap-3 p-4 rounded-3xl border ${verification.hasPhone ? 'bg-slate-950/80 border-slate-700' : 'bg-slate-900/80 border-slate-700'}`}>
                  <svg className={`w-5 h-5 flex-shrink-0 mt-0.5 ${verification.hasPhone ? 'text-emerald-300' : 'text-slate-500'}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                  <div>
                    <p className="font-semibold text-white text-sm">Phone Number</p>
                    <p className="text-xs text-slate-400 mt-0.5">{verification.hasPhone ? 'Phone number on file' : 'Add phone to complete your profile'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Member Info */}
            <div className="bg-slate-900 border border-slate-700/60 rounded-3xl p-6 shadow-2xl shadow-slate-950/20">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-5 h-5 text-sky-300" fill="currentColor" viewBox="0 0 20 20"><path d="M10.5 1.5H5.75A2.25 2.25 0 003.5 3.75v12.5A2.25 2.25 0 005.75 18.5h8.5a2.25 2.25 0 002.25-2.25V6.5m-11-4v4m0 0a2.25 2.25 0 014.5 0m-4.5 0h4.5" clipRule="evenodd"></path></svg>
                <h4 className="text-lg font-bold text-white">Member Info</h4>
              </div>
              <div className="space-y-4 text-sm text-slate-300">
                <div className="bg-slate-950/80 border border-slate-700 rounded-3xl p-4">
                  <p className="text-slate-400 font-medium">Member Since</p>
                  <p className="text-white font-semibold mt-1">{formData.created_at ? new Date(formData.created_at).toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Unknown'}</p>
                </div>
              </div>
            </div>

            {/* Security & Settings */}
            <div className="bg-slate-900 border border-slate-700/60 rounded-3xl p-6 shadow-2xl shadow-slate-950/20">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"></path></svg>
                <h4 className="text-lg font-bold text-white">Account Security</h4>
              </div>
              <div className="space-y-3">
                <button 
                  onClick={() => setShowPasswordModal(true)}
                  className="w-full text-left px-4 py-3 rounded-3xl bg-slate-950/80 border border-slate-700 text-slate-100 font-semibold transition-colors hover:bg-slate-800 hover:border-sky-400">
                  Change Password
                </button>
                <button 
                  onClick={() => setShowDeleteModal(true)}
                  className="w-full text-left px-4 py-3 rounded-3xl bg-rose-950/90 border border-rose-700 text-rose-200 font-semibold transition-colors hover:bg-rose-800 hover:border-rose-400">
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in scale-95">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-8 text-center text-white">
              <div className="text-4xl mb-2">🔐</div>
              <h2 className="text-2xl font-bold">Change Password</h2>
            </div>

            {/* Content */}
            <div className="px-6 py-6">
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.current_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Enter current password"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Enter new password"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.confirm_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Confirm new password"
                    required
                  />
                </div>

                <div className="flex gap-3 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordModal(false)
                      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' })
                    }}
                    disabled={passwordLoading}
                    className="flex-1 border border-slate-300 text-gray-700 py-2.5 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50">
                    {passwordLoading ? 'Changing...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in scale-95">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-500 px-6 py-8 text-center text-white">
              <div className="text-5xl mb-2">⚠️</div>
              <h2 className="text-2xl font-bold">Delete Account</h2>
            </div>

            {/* Content */}
            <div className="px-6 py-6">
              <p className="text-gray-700 mb-4">
                This action cannot be undone. Please read carefully.
              </p>

              {/* Warning */}
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-700 font-semibold text-sm mb-3">What will be deleted:</p>
                <ul className="text-red-600 text-sm space-y-2">
                  <li>✗ Your profile and all personal data</li>
                  <li>✗ Your booking history</li>
                  <li>✗ Your ratings and reviews</li>
                  <li>✗ All account information</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleteLoading}
                  className="flex-1 border border-slate-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50">
                  Keep Account
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading}
                  className="flex-1 bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {deleteLoading ? 'Deleting...' : 'Delete Account'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProfilePage
