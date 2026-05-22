import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { registerUser } from '../api/auth'
import api from '../api/axios'
import toast from 'react-hot-toast'
import PlatformStats from '../components/PlatformStats'

const RegisterPage = () => {
  const navigate    = useNavigate()
  const { setAuth } = useAuthStore()

  // Steps: 'form' → 'otp' → done
  const [step,    setStep]    = useState('form')
  const [loading, setLoading] = useState(false)
  const [errors,  setErrors]  = useState({})
  const [otp,     setOtp]     = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [countdown, setCountdown] = useState(0)

  const [formData, setFormData] = useState({
    username:  '',
    email:     '',
    phone:     '',
    password:  '',
    password2: ''
  })

  // ── Validators ──────────────────────────────────────────────
  const validateEmail = (email) => {
    if (!email) return 'Email is required'
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return re.test(email) ? '' : 'Enter a valid email address'
  }

  const validatePhone = (phone) => {
    if (!phone) return 'Phone number is required'
    const re = /^(?:\+91[\-\s]?|0)?[6-9]\d{9}$/
    return re.test(phone) ? '' : 'Enter a valid 10-digit Indian phone number'
  }

  const validatePassword = (pw) => {
    if (!pw) return 'Password is required'
    const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/
    return re.test(pw)
      ? ''
      : 'Must be ≥8 chars with uppercase, lowercase, number and symbol'
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
    setErrors({ ...errors, [name]: '' })
  }

  // ── Start countdown timer ───────────────────────────────────
  const startCountdown = () => {
    setCountdown(60)
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(timer); return 0 }
        return prev - 1
      })
    }, 1000)
  }

  // ── Send OTP ────────────────────────────────────────────────
  const handleSendOTP = async () => {
    const emailErr = validateEmail(formData.email)
    if (emailErr) {
      setErrors({ ...errors, email: emailErr })
      return
    }

    setLoading(true)
    try {
      await api.post('/auth/send-otp/', { email: formData.email })
      setOtpSent(true)
      setStep('otp')
      startCountdown()
      toast.success(`OTP sent to ${formData.email}`)
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to send OTP'
      setErrors({ ...errors, email: msg })
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  // ── Resend OTP ──────────────────────────────────────────────
  const handleResendOTP = async () => {
    setLoading(true)
    try {
      await api.post('/auth/send-otp/', { email: formData.email })
      setOtp('')
      startCountdown()
      toast.success('New OTP sent!')
    } catch (err) {
      toast.error('Failed to resend OTP')
    } finally {
      setLoading(false)
    }
  }

  // ── Verify OTP then Register ─────────────────────────────────
  const handleVerifyAndRegister = async (e) => {
    e.preventDefault()

    if (otp.length !== 6) {
      toast.error('Enter the 6-digit OTP')
      return
    }

    // Validate all other fields first
    const nextErrors = {}
    const phoneErr = validatePhone(formData.phone)
    if (phoneErr) nextErrors.phone = phoneErr
    const pwErr = validatePassword(formData.password)
    if (pwErr) nextErrors.password = pwErr
    if (formData.password !== formData.password2)
      nextErrors.password2 = 'Passwords do not match'
    if (!formData.username.trim())
      nextErrors.username = 'Username is required'

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      setStep('form')
      toast.error('Please fix the form errors')
      return
    }

    setLoading(true)
    try {
      // Step 1 — Verify OTP
      await api.post('/auth/verify-otp/', {
        email: formData.email,
        otp:   otp,
      })

      // Step 2 — Register
      const res  = await registerUser(formData)
      const user = res.data.user
      setAuth(user, user.access)
      toast.success(`Welcome to DriveShare, ${user.username}! 🎉`)
      navigate('/')

    } catch (err) {
      const msg = err.response?.data?.error ||
                  err.response?.data?.detail ||
                  'Verification failed'
      toast.error(msg)
      if (msg.toLowerCase().includes('otp') ||
          msg.toLowerCase().includes('expired')) {
        setOtp('')
      }
    } finally {
      setLoading(false)
    }
  }

  // ── Validate all form fields on submit ──────────────────────
  const handleFormSubmit = (e) => {
    e.preventDefault()
    const nextErrors = {}

    if (!formData.username.trim()) nextErrors.username = 'Username is required'
    const emailErr = validateEmail(formData.email)
    if (emailErr) nextErrors.email = emailErr
    const phoneErr = validatePhone(formData.phone)
    if (phoneErr) nextErrors.phone = phoneErr
    const pwErr = validatePassword(formData.password)
    if (pwErr) nextErrors.password = pwErr
    if (formData.password !== formData.password2)
      nextErrors.password2 = 'Passwords do not match'

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    handleSendOTP()
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER — Step 1: Registration Form
  // ─────────────────────────────────────────────────────────────
  if (step === 'form') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4 py-12">
        <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-[2rem] bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.25),_transparent_35%),linear-gradient(180deg,#0f172a,_#020617)] p-10 shadow-2xl shadow-slate-950/50 ring-1 ring-white/5">
            <div className="flex flex-wrap items-center gap-3 rounded-full bg-slate-900/80 px-4 py-2 text-sm text-sky-200 ring-1 ring-white/10">
              <span>DriveShare Rentals</span>
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-800/80 px-3 py-1 text-xs tracking-[0.18em] uppercase text-sky-100/80">
                Vehicle marketplace</span>
            </div>

            <h1 className="mt-8 text-4xl font-bold tracking-tight sm:text-5xl">
              Rent or list cars with ease
            </h1>
            <p className="mt-5 max-w-xl text-slate-300 leading-8">
              Create your account in minutes and start listing your own car or booking rentals across city cars, SUVs, premium sedans, and family-friendly vans. Choose hourly, daily, or weekly plans on a modern peer-to-peer marketplace.
            </p>

            <div className="mt-10 space-y-5">
              <div className="rounded-[1.75rem] bg-slate-900/80 p-6 ring-1 ring-white/10">
                <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Trusted listings</p>
                <p className="mt-3 text-xl font-semibold text-white">Verified car owners</p>
              </div>
              <div className="rounded-[1.75rem] bg-slate-900/80 p-6 ring-1 ring-white/10">
                <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Flexible bookings</p>
                <p className="mt-3 text-xl font-semibold text-white">Hourly, daily, weekly</p>
              </div>
              <PlatformStats />
            </div>
          </section>

          <section className="rounded-[2rem] bg-white p-8 shadow-2xl shadow-slate-900/10 ring-1 ring-slate-200/20 text-slate-900">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-sky-600">Create your account</p>
                <h2 className="mt-3 text-3xl font-bold">Secure your next ride</h2>
              </div>
              <div className="inline-flex rounded-3xl bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700">
                <span>DriveShare</span>
              </div>
            </div>

            <p className="mt-4 text-sm text-slate-500">
              Signup with a verified email and phone number to access instant rentals, flexible pricing, and premium customer care.
            </p>

            <form onSubmit={handleFormSubmit} className="mt-8 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Alex Johnson"
                  required
                  className="w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                />
                {errors.username && (
                  <p className="mt-2 text-sm text-rose-600">{errors.username}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@bestdrive.com"
                  required
                  className="w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                />
                {errors.email && (
                  <p className="mt-2 text-sm text-rose-600">{errors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="9876543210"
                  required
                  className="w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                />
                {errors.phone && (
                  <p className="mt-2 text-sm text-rose-600">{errors.phone}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Create a strong password"
                  required
                  className="w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                />
                <p className="mt-2 text-xs text-slate-400">
                  At least 8 characters, one uppercase, number and symbol.
                </p>
                {errors.password && (
                  <p className="mt-2 text-sm text-rose-600">{errors.password}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Confirm Password</label>
                <input
                  type="password"
                  name="password2"
                  value={formData.password2}
                  onChange={handleChange}
                  placeholder="Confirm your password"
                  required
                  className="w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                />
                {errors.password2 && (
                  <p className="mt-2 text-sm text-rose-600">{errors.password2}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-3xl bg-sky-600 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-sky-500/20 transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60">
                {loading ? 'Sending OTP...' : 'Verify Email & Continue'}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-500">
              Already booked before?{' '}
              <Link to="/login" className="font-semibold text-slate-900 hover:text-sky-600">
                Sign in
              </Link>
            </div>
          </section>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER — Step 2: OTP Verification
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl rounded-[2rem] bg-slate-900/95 shadow-2xl shadow-slate-950/50 ring-1 ring-white/10 p-8 sm:p-10">

        <div className="grid gap-8 lg:grid-cols-[0.9fr_0.7fr] items-center">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-3 rounded-full bg-sky-500/10 px-4 py-2 text-sm text-sky-200 ring-1 ring-sky-500/15">
              <span className="text-xl">🔐</span>
              <span>Email verification</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Almost ready to hit the road</h1>
            <p className="max-w-xl text-slate-300 leading-7">
              A secure 6-digit code has been sent to your email address. Enter it below to finish registration and unlock instant access to our rental fleet.
            </p>
            <div className="rounded-3xl bg-slate-800/80 p-5 ring-1 ring-white/10">
              <p className="text-sm text-slate-400">Verify email for faster booking and safer rentals.</p>
              <p className="mt-2 text-lg font-semibold text-white">Sending to {formData.email}</p>
            </div>
          </div>

          <div className="rounded-[1.75rem] bg-slate-950/90 p-6 ring-1 ring-slate-700/50 shadow-xl shadow-slate-950/40">
            <form onSubmit={handleVerifyAndRegister} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">Enter 6-digit code</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  maxLength={6}
                  className="w-full rounded-3xl border border-slate-700 bg-slate-900 px-5 py-4 text-center text-4xl font-semibold tracking-[0.55em] text-white outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-500/20"
                  autoFocus
                />
                <p className="mt-3 text-sm text-slate-400 text-center">Code expires in 10 minutes.</p>
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full rounded-3xl bg-sky-600 px-5 py-3 text-base font-semibold text-white shadow-lg shadow-sky-500/20 transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60">
                {loading ? 'Verifying...' : 'Verify & Complete Signup'}
              </button>
            </form>

            <div className="mt-5 text-center text-sm text-slate-400">
              {countdown > 0 ? (
                <p>Resend code in {countdown}s</p>
              ) : (
                <button
                  onClick={handleResendOTP}
                  disabled={loading}
                  className="font-semibold text-sky-300 hover:text-sky-100 disabled:opacity-50">
                  Didn’t receive the code? Resend
                </button>
              )}
            </div>

            <div className="mt-4 text-center text-sm text-slate-500">
              <button
                onClick={() => { setStep('form'); setOtp('') }}
                className="font-medium text-slate-300 hover:text-white">
                ← Change email address
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage