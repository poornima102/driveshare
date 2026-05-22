import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

api.interceptors.request.use((config) => {
  const auth = localStorage.getItem('driveshare-auth')
  if (auth) {
    const { state } = JSON.parse(auth)
    if (state?.token) {
      config.headers.Authorization = `Bearer ${state.token}`
    }
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('driveshare-auth')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api