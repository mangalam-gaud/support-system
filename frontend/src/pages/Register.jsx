import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { register } from '../services/api'
import toast from 'react-hot-toast'
import { UserPlus, Eye, EyeOff, Sun, Moon } from 'lucide-react'

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const { loginUser } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await register(form)
      loginUser(res.data.token, res.data.user)
      toast.success('Account created!')
      navigate(res.data.user.role === 'worker' ? '/worker' : '/student')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <button className="auth-theme-toggle" onClick={toggleTheme} title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <div className="auth-icon"><UserPlus size={28} /></div>
          <h1>Join MANGAUD</h1>
          <p>Create your account</p>
        </div>
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Full Name</label>
            <input type="text" name="name" value={form.name} onChange={handleChange} placeholder="John Doe" required minLength={2} />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="you@example.com" required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <div className="input-wrapper">
              <input type={showPw ? 'text' : 'password'} name="password" value={form.password} onChange={handleChange} placeholder="Min 6 characters" required minLength={6} />
              <button type="button" className="input-toggle" onClick={() => setShowPw(!showPw)}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div className="form-group">
            <label>Role</label>
            <select name="role" value={form.role} onChange={handleChange}>
              <option value="student">Student</option>
              <option value="worker">Worker</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Creating...' : 'Create Account'}
          </button>
        </form>
        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
          <p className="auth-developed">Developed by Mangaud</p>
        </div>
      </div>
    </div>
  )
}
