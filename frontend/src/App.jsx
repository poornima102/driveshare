import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './store/authStore'

import HomePage       from './pages/HomePage'
import LoginPage      from './pages/LoginPage'
import RegisterPage   from './pages/RegisterPage'
import VehicleDetail  from './pages/VehicleDetailPage'
import ListVehicle    from './pages/ListVehiclePage'
import BookingPage    from './pages/BookingPage'
import DashboardPage  from './pages/DashboardPage'
import ProfilePage    from './pages/ProfilePage'
import UserProfilePage from './pages/UserProfilePage'
import ChatPage       from './pages/ChatPage'
import MyBookingsPage from './pages/MyBookingsPage'
import Navbar         from './components/Navbar'
import Footer         from './components/Footer'

const ProtectedRoute = ({ children }) => {
  const { token } = useAuthStore()
  return token ? children : <Navigate to="/login" replace />
}

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/"             element={<><Navbar /><HomePage /></>} />
        <Route path="/login"        element={<LoginPage />} />
        <Route path="/register"     element={<RegisterPage />} />
        <Route path="/vehicles/:id" element={<><Navbar /><VehicleDetail /><Footer /></>} />
        <Route path="/list-vehicle" element={
          <ProtectedRoute><Navbar /><ListVehicle /><Footer /></ProtectedRoute>
        } />
        <Route path="/booking/:vehicleId" element={
          <ProtectedRoute><Navbar /><BookingPage /><Footer /></ProtectedRoute>
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute><Navbar /><DashboardPage /><Footer /></ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute><Navbar /><ProfilePage /><Footer /></ProtectedRoute>
        } />
        <Route path="/users/:id" element={<><Navbar /><UserProfilePage /><Footer /></>} />
        <Route path="/chat/:bookingId" element={
          <ProtectedRoute><Navbar /><ChatPage /><Footer /></ProtectedRoute>
        } />
        <Route path="/my-bookings" element={
          <ProtectedRoute><Navbar /><MyBookingsPage /><Footer /></ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App