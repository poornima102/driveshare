# 🚗 DriveShare — Peer-to-Peer Car Rental Marketplace

A full-stack car rental platform similar to Turo, built with Django REST Framework and React.

![DriveShare](https://images.unsplash.com/photo-1525609004556-c46c7d6cf023?w=800)

## 🌐 Live Demo
- **Frontend:** https://driveshare.vercel.app
- **Backend API:** https://driveshare-backend.railway.app/api

## 🛠️ Tech Stack

### Backend
- Python 3.12 + Django 5
- Django REST Framework
- PostgreSQL (Neon)
- Django Channels (WebSocket)
- Redis (real-time)
- Razorpay (payments)
- Cloudinary (images)
- JWT Authentication

### Frontend
- React 18 + Vite
- Tailwind CSS
- Zustand (state management)
- Leaflet.js (maps)
- Socket.io / WebSocket
- Axios

## ✨ Features

- ✅ User registration and login with JWT
- ✅ Vehicle listing with multiple photos
- ✅ Search and filter by city, price, transmission
- ✅ Interactive map showing vehicles
- ✅ Instant booking system
- ✅ Razorpay payment integration (test mode)
- ✅ Refund system with cancellation policy
- ✅ Real-time chat between owner and renter
- ✅ Real-time notifications via WebSocket
- ✅ Owner dashboard with earnings analytics
- ✅ Availability calendar
- ✅ Reviews and ratings system
- ✅ Email notifications

## 🚀 Getting Started

### Prerequisites
- Python 3.12+
- Node.js 20+
- PostgreSQL
- Redis

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env      # Add your credentials
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env      # Add your API URL
npm run dev
```

## 📁 Project Structure
