import api from './axios'

export const createBooking          = (data) => api.post('/bookings/', data)
export const getMyBookings          = ()     => api.get('/bookings/my_bookings/')
export const getOwnerBookings       = ()     => api.get('/bookings/owner_bookings/')
export const cancelBooking          = (id)   => api.post(`/bookings/${id}/cancel/`)
export const getDashboard           = ()     => api.get('/bookings/dashboard/')
export const completeExpiredBookings = ()    => api.post('/bookings/complete-expired/')