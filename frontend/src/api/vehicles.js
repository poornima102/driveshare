import api from './axios'

export const getVehicles       = (params)       => api.get('/vehicles/', { params })
export const getVehicle        = (id)           => api.get(`/vehicles/${id}/`)
export const createVehicle     = (data)         => api.post('/vehicles/', data)
export const updateVehicle     = (id, data)     => api.put(`/vehicles/${id}/`, data)
export const deleteVehicle     = (id)           => api.delete(`/vehicles/${id}/`)
export const getMyVehicles     = ()             => api.get('/vehicles/my_vehicles/')
export const getAvailability   = (id)           => api.get(`/vehicles/${id}/availability/`)
export const toggleAvailability = (id)          => api.post(`/vehicles/${id}/toggle_availability/`)
export const getPlatformStats  = ()             => api.get('/vehicles/stats/')
export const uploadImages      = (id, formData) =>
  api.post(`/vehicles/${id}/upload_images/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
export const deleteVehicleImage = (vehicleId, imageId) =>
  api.delete(`/vehicles/${vehicleId}/images/${imageId}/`)