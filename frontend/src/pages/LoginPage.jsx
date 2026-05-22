import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { loginUser } from '../api/auth'
import toast from 'react-hot-toast'
import PlatformStats from '../components/PlatformStats'

const LoginPage = () => {
  const navigate  = useNavigate()
  const { setAuth } = useAuthStore()

  const [formData, setFormData] = useState({
    email:    '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [errors,  setErrors]  = useState({})

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    setErrors({  ...errors,   [e.target.name]: '' })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res  = await loginUser(formData)
      const user = res.data.user

      // Save user and token to Zustand store
      setAuth(user, user.access)

      toast.success(`Welcome back, ${user.username}!`)
      navigate('/')

    } catch (err) {
      const data = err.response?.data
      if (data) {
        setErrors(data)
        toast.error('Login failed — check your credentials')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="relative overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_35%),linear-gradient(180deg,#020617,_#0f172a)] p-10 shadow-2xl shadow-slate-950/70 ring-1 ring-white/10">
          <div className="absolute inset-y-0 right-0 w-2/5 bg-[radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.15),_transparent_35%)]" />
          <div className="relative z-10">
            <p className="text-sm uppercase tracking-[0.24em] text-sky-300/80">Vehicle rental marketplace</p>
            <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl text-white">
              Sign in to manage rentals and listings
            </h1>
            <p className="mt-5 max-w-xl text-slate-300 leading-8">
              Access your account to book cars hourly, daily, or weekly, or list your own vehicle for others to rent. A simpler way to earn and travel.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <p className="text-sm uppercase tracking-[0.18em] text-slate-400">Flexible bookings</p>
                <p className="mt-3 text-xl font-semibold text-white">Hourly, daily & weekly</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <p className="text-sm uppercase tracking-[0.18em] text-slate-400">List your car</p>
                <p className="mt-3 text-xl font-semibold text-white">Earn from idle vehicles</p>
              </div>
            </div>

            <PlatformStats />
          </div>
        </section>

        <section className="rounded-[2rem] bg-white p-8 shadow-2xl shadow-slate-950/10 ring-1 ring-slate-200/20 text-slate-900">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-sky-600">Welcome back</p>
              <h2 className="mt-3 text-3xl font-bold">Login to DriveShare</h2>
            </div>
            <div className="inline-flex rounded-full bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700">
              Marketplace
            </div>
          </div>

          <p className="mt-4 text-sm text-slate-500">
            Sign in to manage your rental bookings, list your car, and see your account activity.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                required
                className="w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
              />
              {errors.email && (
                <p className="text-sm text-rose-600 mt-2">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                className="w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
              />
              {errors.password && (
                <p className="text-sm text-rose-600 mt-2">{errors.password}</p>
              )}
            </div>

            {errors.non_field_errors && (
              <div className="rounded-3xl bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
                {errors.non_field_errors}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-3xl bg-sky-600 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-sky-500/20 transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? 'Signing in...' : 'Continue to DriveShare'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-500">
            New to DriveShare?{' '}
            <Link to="/register" className="font-semibold text-slate-900 hover:text-sky-600">
              Create an account
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}

export default LoginPage