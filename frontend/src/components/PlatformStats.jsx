import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { getPlatformStats } from '../api/vehicles'

const PlatformStats = () => {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let canceled = false

    const fetchStats = async () => {
      setLoading(true)
      try {
        const res = await getPlatformStats()
        if (!canceled) setStats(res.data)
      } catch {
        if (!canceled) {
          toast.error('Unable to load platform stats')
        }
      } finally {
        if (!canceled) setLoading(false)
      }
    }

    fetchStats()
    return () => {
      canceled = true
    }
  }, [])

  const cards = [
    {
      title: 'Bookings completed',
      value: loading ? '—' : stats?.completed_bookings ?? 0,
    },
    {
      title: 'Cities served',
      value: loading ? '—' : stats?.cities_served ?? 0,
    },
    {
      title: 'Average rating',
      value: loading
        ? '—'
        : stats?.avg_rating
        ? Number(stats.avg_rating).toFixed(1)
        : 'New',
    },
  ]

  return (
    <div className="mt-12 grid gap-4 sm:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.title}
          className="rounded-3xl border border-white/10 bg-slate-900/70 p-5"
        >
          <p className="text-3xl font-semibold text-white">{card.value}</p>
          <p className="mt-2 text-sm text-slate-400">{card.title}</p>
        </div>
      ))}
    </div>
  )
}

export default PlatformStats
