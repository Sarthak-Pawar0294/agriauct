import { Routes, Route, Link } from 'react-router-dom'
import './App.css'
import Register from './pages/Register.jsx'
import Login from './pages/Login.jsx'
import FarmerDashboard from './pages/FarmerDashboard.jsx'
import VendorDashboard from './pages/VendorDashboard.jsx'

function App() {
  return (
    <div className="app-container">
      <header className="app-header">
        <Link to="/" className="app-logo">AgriAuct</Link>
        <nav className="app-nav">
          <Link to="/register">Register</Link>
          <Link to="/login">Login</Link>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/farmer/dashboard" element={<FarmerDashboard />} />
          <Route path="/vendor/dashboard" element={<VendorDashboard />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
