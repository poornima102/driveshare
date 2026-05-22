import api from './axios'

export const registerUser   = (data) => api.post('/auth/register/', data)
export const loginUser      = (data) => api.post('/auth/login/', data)
export const getMe          = ()     => api.get('/auth/me/')
export const updateProfile  = (data) => api.put('/auth/me/', data)
export const changePassword = (data) => api.post('/auth/change-password/', data)
export const deleteAccount  = ()     => api.delete('/auth/me/')
export const getUserProfile = (id) => api.get(`/auth/profile/${id}/`)