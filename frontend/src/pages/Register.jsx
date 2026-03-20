import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API_BASE = 'http://localhost:5000'

function Register() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('FARMER')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
          role,
        }),
      })

      const data = await res.json().catch(() => ({}))
      const message = data?.error ?? data?.message ?? 'Registration failed'

      if (!res.ok) {
        setError(message)
        return
      }

      navigate('/login')
    } catch (err) {
      if (err.message === 'Failed to fetch') {
        setError('Cannot reach server. Make sure the backend is running on http://localhost:5000')
      } else {
        setError(err.message || 'Something went wrong during registration.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <h2>Create your AgriAuct account</h2>
      <form onSubmit={handleSubmit} className="auth-form">
        <label>
          Full name
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </label>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </label>
        <label>
          Role
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="FARMER">Farmer</option>
            <option value="VENDOR">Vendor</option>
          </select>
        </label>

        {error && <div className="auth-error">{error}</div>}

        <button type="submit" disabled={loading}>
          {loading ? 'Registering...' : 'Register'}
        </button>
      </form>
    </div>
  )
}

export default Register
