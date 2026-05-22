import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

export const useNotifications = () => {
  const { user, token }                   = useAuthStore()
  const [notifications, setNotifications] = useState([])
  const [unreadCount,   setUnreadCount]   = useState(0)
  const wsRef                             = useRef(null)

  const addNotification = useCallback((notif) => {
    setNotifications(prev => [{ ...notif, id: Date.now(), read: false }, ...prev.slice(0, 49)])
    setUnreadCount(prev => prev + 1)
  }, [])

  useEffect(() => {
    if (!user || !token) return

    const wsUrl = `${import.meta.env.VITE_WS_URL}/ws/notifications/${user.id}/`
    const ws    = new WebSocket(wsUrl)

    ws.onopen    = () => console.log('Notification WS connected')

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        addNotification(data)

        // Show simple toast — no JSX needed
        if (data.type === 'new_message') {
          toast(`💬 ${data.title}: ${data.message}`, {
            duration: 5000,
            style: {
              background: '#fff',
              color: '#1f2937',
              borderRadius: '12px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              padding: '12px 16px',
              fontSize: '14px',
            },
          })
        } else if (data.type === 'booking_confirmed') {
          toast.success(`✅ ${data.message}`, { duration: 6000 })
        } else if (data.type === 'new_vehicle') {
          toast(`🚗 ${data.title}: ${data.message}`, {
            duration: 5000,
            style: {
              background: '#fff',
              color: '#1f2937',
              borderRadius: '12px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              padding: '12px 16px',
              fontSize: '14px',
            },
          })
        } else {
          toast(`🔔 ${data.title}`, { duration: 4000 })
        }

      } catch (err) {
        console.error('Notification parse error:', err)
      }
    }

    ws.onerror = () => console.log('Notification WS error — will retry on reconnect')
    ws.onclose = () => console.log('Notification WS closed')

    wsRef.current = ws

    return () => {
      ws.close()
    }
  }, [user?.id, token])

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }, [])

  return { notifications, unreadCount, markAllRead }
}