import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getUserProfile } from '../api/auth'

const UserProfilePage = () => {
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getUserProfile(id)
        setUser(res.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [id])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="inline-block animate-pulse mb-4">
          <div className="w-14 h-14 bg-sky-500 rounded-full"></div>
        </div>
        <p className="text-slate-600 font-medium">Loading host profile...</p>
      </div>
    </div>
  )

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <p className="text-slate-600">Profile not found.</p>
    </div>
  )

  const defaultProfileImage = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80'
  const profileImage = user.profile_image || defaultProfileImage
  const rating = user.owner_avg_rating
  const reviewCount = user.owner_review_count
  const memberSince = user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'
  const reviews = user.owner_reviews || []

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="space-y-6">
            <div className="bg-white rounded-[28px] shadow-lg border border-slate-200 overflow-hidden">
              <div className="relative h-72 bg-slate-800">
                <img
                  src={profileImage}
                  alt="Host profile"
                  className="absolute inset-0 h-full w-full object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-90"></div>
                <div className="absolute bottom-6 left-6 right-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-24 w-24 rounded-3xl overflow-hidden border-4 border-white shadow-xl">
                      <img src={profileImage} alt="Host avatar" className="h-full w-full object-cover" />
                    </div>
                    <div>
                      <p className="text-sm uppercase tracking-[0.24em] text-sky-200">{user.is_verified ? 'Verified host' : 'Host profile'}</p>
                      <h1 className="text-4xl font-semibold text-white">{user.username}</h1>
                      <p className="mt-1 text-sm text-slate-200">Member since {memberSince}</p>
                    </div>
                  </div>
                  <div className="rounded-3xl bg-slate-900/90 px-5 py-4 text-center text-white shadow-2xl shadow-slate-900/20">
                    <div className="text-sm uppercase tracking-[0.2em] text-slate-400">Host rating</div>
                    <div className="mt-2 flex items-center justify-center gap-2 text-xl font-semibold">
                      <span>{reviewCount > 0 ? rating.toFixed(1) : '—'}</span>
                      <span className="text-amber-400">★</span>
                    </div>
                    <p className="text-sm text-slate-300">{reviewCount > 0 ? `${reviewCount} reviews` : 'No reviews yet'}</p>
                  </div>
                </div>
              </div>

              <div className="px-6 py-8 sm:px-10">
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-slate-700">
                    <span className={`h-2.5 w-2.5 rounded-full ${user.is_verified ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                    {user.is_verified ? 'Verified host' : 'Host profile'}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-slate-700">
                    <span className="font-semibold">{reviewCount}</span> reviews
                  </span>
                </div>

                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-3xl bg-slate-50 p-5">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Email</p>
                    <p className="mt-3 text-base font-semibold text-slate-900">{user.email}</p>
                  </div>
                  <div className="rounded-3xl bg-slate-50 p-5">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Phone</p>
                    <p className="mt-3 text-base font-semibold text-slate-900">{user.phone || 'Not provided'}</p>
                  </div>
                  <div className="rounded-3xl bg-slate-50 p-5">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Member since</p>
                    <p className="mt-3 text-base font-semibold text-slate-900">{memberSince}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] bg-white p-8 shadow-lg border border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">About the host</h2>
              <p className="mt-4 text-slate-600 leading-7">
                {user.bio ? user.bio : 'This host has not added a profile description yet.'}
              </p>

              <div className="mt-6 grid gap-4 text-sm text-slate-600 sm:grid-cols-2">
                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">Reliable communication</p>
                  <p className="mt-2">Direct messages with the host once booking is confirmed.</p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">Flexible pickup</p>
                  <p className="mt-2">Pickup preferences set by the host are honored for every booking.</p>
                </div>
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-[28px] bg-white p-8 shadow-lg border border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">Host details</h2>
              <div className="mt-6 space-y-4 text-sm text-slate-600">
                <div className="flex justify-between gap-4">
                  <span className="font-medium text-slate-800">Verified email</span>
                  <span>{user.email ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="font-medium text-slate-800">Phone</span>
                  <span>{user.phone || 'Hidden'}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="font-medium text-slate-800">Reviews</span>
                  <span>{reviewCount}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="font-medium text-slate-800">Average rating</span>
                  <span>{reviewCount > 0 ? rating.toFixed(1) : '—'}</span>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] bg-white p-8 shadow-lg border border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">Recent reviews</h2>
              <div className="mt-6 space-y-4">
                {reviews.length > 0 ? (
                  reviews.slice(0, 3).map(review => (
                    <div key={review.id} className="rounded-3xl bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <p className="font-semibold text-slate-900">{review.reviewer_name}</p>
                        <span className="text-sm text-amber-400">★ {review.rating.toFixed(1)}</span>
                      </div>
                      <p className="mt-2 text-sm text-slate-600">{review.comment || 'No comment provided.'}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-3xl bg-slate-50 p-6 text-slate-600">
                    This host has not received any reviews yet.
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

export default UserProfilePage
