import api from './axios'

export const createOrder       = (data)       => api.post('/payments/create-order/', data)
export const verifyPayment     = (data)       => api.post('/payments/verify/', data)
export const getPaymentHistory = ()           => api.get('/payments/history/')
export const requestRefund     = (data)       => api.post('/payments/refund/', data)
export const getRefundPolicy   = (bookingId)  => api.get(`/payments/refund-policy/${bookingId}/`)