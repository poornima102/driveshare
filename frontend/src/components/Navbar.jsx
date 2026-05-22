import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useState, useEffect, useRef } from 'react'
import api from '../api/axios'
import toast from 'react-hot-toast'

const Navbar = () => {
  const { user, token, logout } = useAuthStore()
  const navigate = useNavigate()
  const [notifications,  setNotifications]  = useState([])
  const [showNotif,      setShowNotif]      = useState(false)
  const [unreadCount,    setUnreadCount]    = useState(0)
  const wsRef = useRef(null)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5

  useEffect(() => {
    if (!token || !user) return

    const initId = window.setTimeout(() => {
      fetchNotifications()
      connectNotificationSocket()
    }, 0)

    return () => {
      reconnectAttempts.current = 0
      window.clearTimeout(initId)
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [token, user])

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications/')
      setNotifications(res.data)
      setUnreadCount(res.data.filter(n => !n.is_read).length)
    } catch {
      console.warn('Failed to load notifications')
    }
  }

  const connectNotificationSocket = () => {
    if (!user?.id) return
    if (wsRef.current?.readyState === WebSocket.CONNECTING || wsRef.current?.readyState === WebSocket.OPEN) return

    const apiBase = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'
    const defaultWsScheme = window.location.protocol === 'https:' ? 'wss://' : 'ws://'
    const envBase = import.meta.env.VITE_WS_URL || ''
    const wsBase = envBase
      ? envBase.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:').replace(/\/$/, '')
      : apiBase.replace(/\/api\/?$/, '').replace(/^http:/, 'ws:').replace(/^https:/, 'wss:').replace(/\/$/, '')
    const wsUrl = `${wsBase}/ws/notifications/${encodeURIComponent(user.id)}/`

    console.log('🔔 Connecting notification socket:', wsUrl)

    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      if (wsRef.current !== ws) return
      console.log('✅ Notification WebSocket connected!')
      reconnectAttempts.current = 0
    }

    ws.onmessage = (e) => {
      if (wsRef.current !== ws) return
      try {
        const data = JSON.parse(e.data)
        console.log('📨 Notification received:', data)

        setNotifications(prev => [data, ...prev])
        setUnreadCount(prev => prev + 1)

        toast(`🔔 ${data.title}`, {
          duration: 5000,
          style: { background: '#2563EB', color: 'white', borderRadius: '12px' }
        })
      } catch (err) {
        console.error('Notification parse error:', err)
      }
    }

    ws.onerror = (e) => {
      if (wsRef.current !== ws) return
      console.error('❌ Notification WebSocket error:', e)
    }

    ws.onclose = (event) => {
      if (wsRef.current !== ws) return
      console.log('🔌 Notification WebSocket closed — reconnecting in 3s...', event)

      wsRef.current = null
      if (reconnectAttempts.current >= maxReconnectAttempts) {
        console.warn('WebSocket reconnect limit reached. Please make sure the backend ASGI server is running.')
        return
      }

      reconnectAttempts.current += 1
      setTimeout(() => {
        if (token && user) connectNotificationSocket()
      }, 3000)
    }
  }

  const getNotificationTarget = (notification) => {
    if (notification.target_url) return notification.target_url
    if (notification.data?.target_url) return notification.data.target_url
    if (notification.type === 'new_message' && notification.data?.booking_id) return `/chat/${notification.data.booking_id}/`
    if (notification.type === 'new_vehicle' && notification.data?.vehicle_id) return `/vehicles/${notification.data.vehicle_id}/`
    if (notification.type === 'booking_confirmed') {
      if (notification.data?.renter && notification.data?.booking_id) {
        return `/dashboard?bookingId=${notification.data.booking_id}`
      }
      if (notification.data?.vehicle_id) {
        return `/vehicles/${notification.data.vehicle_id}/`
      }
      return '/my-bookings'
    }
    if (notification.type === 'booking_cancelled') {
      if (notification.target_url) return notification.target_url
      if (notification.data?.booking_id) {
        return `/dashboard?bookingId=${notification.data.booking_id}`
      }
      return '/my-bookings'
    }
    return null
  }

  const handleNotificationClick = (notification) => {
    const target = getNotificationTarget(notification)
    if (!target) return

    navigate(target)
    setShowNotif(false)
  }

  const markAllRead = async () => {
    try {
      await api.post('/notifications/mark-all-read/')
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch {}
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="bg-slate-950 text-slate-100 sticky top-0 z-50 shadow-lg shadow-slate-950/20 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">

        {/* Logo + brand */}
        <div className="flex items-center gap-3">
          <Link to="/" className="inline-flex items-center gap-3 rounded-3xl border border-slate-800 bg-slate-900/90 px-4 py-2 text-lg font-bold text-white shadow-sm shadow-slate-950/30 transition hover:bg-slate-900">
            <span className="text-2xl">🚗</span>
            <span>DriveShare</span>
          </Link>
          <span className="hidden sm:inline-flex rounded-full bg-sky-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-sky-200">
            Car rental marketplace
          </span>
        </div>

        <div className="flex flex-1 items-center justify-end gap-3">
          <Link to="/#car-listings" className="text-slate-300 transition hover:text-white">
            Browse cars
          </Link>
          <Link to="/list-vehicle" className="text-slate-300 transition hover:text-white">
            List car
          </Link>
          <Link to="/my-bookings" className="hidden lg:inline-flex text-slate-300 transition hover:text-white">
            Bookings
          </Link>
          <Link to="/dashboard" className="hidden lg:inline-flex text-slate-300 transition hover:text-white">
            Dashboard
          </Link>

          {token ? (
            <>
              <button
                onClick={() => {
                  setShowNotif(!showNotif)
                  if (!showNotif) markAllRead()
                }}
                className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900/80 text-xl text-slate-100 transition hover:bg-slate-800">
                🔔
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[0.65rem] font-semibold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              <Link to="/profile" className="rounded-3xl border border-slate-800 bg-slate-900/80 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-800">
                {user?.username || 'Profile'}
              </Link>
              <button
                onClick={handleLogout}
                className="rounded-3xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-600">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="rounded-3xl border border-slate-800 bg-slate-900/80 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-800">
                Login
              </Link>
              <Link to="/register" className="rounded-3xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-400">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>

      {showNotif && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30"
            onClick={() => setShowNotif(false)}
          />
          <div className="fixed right-4 top-20 z-50 w-[min(24rem,calc(100%-2rem))] max-h-[calc(100vh-5rem)] overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/95 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4 border-b border-slate-800 px-4 py-4">
              <div>
                <p className="text-sm font-semibold text-white">Notifications</p>
                <p className="text-xs text-slate-400">{unreadCount} unread</p>
              </div>
              <button
                onClick={() => setShowNotif(false)}
                className="rounded-full bg-slate-900/80 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:bg-slate-800"
              >
                Close
              </button>
            </div>
            <div className="max-h-[22rem] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-400">
                  No notifications yet.
                </div>
              ) : (
                notifications.map((notification) => (
                  <button
                    type="button"
                    key={notification.id || notification.title || Math.random()}
                    onClick={() => handleNotificationClick(notification)}
                    className="w-full text-left border-b border-slate-800 px-4 py-4 last:border-b-0 transition hover:bg-slate-900"
                  >
                    <p className="text-sm font-semibold text-white">
                      {notification.title || 'Notification'}
                    </p>
                    {notification.message && (
                      <p className="mt-1 text-sm text-slate-300">
                        {notification.message}
                      </p>
                    )}
                    <div className="mt-2 flex items-center justify-between text-[0.7rem] uppercase tracking-[0.16em] text-slate-500">
                      <span>{notification.type || 'general'}</span>
                      {notification.is_read === false ? (
                        <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-rose-300">
                          New
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-700/70 px-2 py-0.5 text-slate-300">
                          Read
                        </span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </nav>
  )
}

export default Navbar