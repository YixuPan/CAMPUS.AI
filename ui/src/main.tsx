import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import Calendar from './Calendar.tsx'
import User from './User.tsx'
import Booking from './Booking.tsx'
import Login from './Login.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/app" element={<App />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/user" element={<User />} />
        <Route path="/booking" element={<Booking />} />
      </Routes>
    </HashRouter>
  </StrictMode>,
)
