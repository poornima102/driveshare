import api from './axios'

export const getMessages      = (bookingId)          => api.get(`/chat/${bookingId}/messages/`)
export const sendMessage      = (bookingId, content) => api.post(`/chat/${bookingId}/messages/`, { content })
export const getConversations = ()                   => api.get('/chat/conversations/')