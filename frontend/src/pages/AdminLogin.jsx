import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { login } from '../services/api'
import toast from 'react-hot-toast'
import { Shield, Eye, EyeOff } from 'lucide-react'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const { loginUser } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await login({ email, password })
      if (res.data.user.role !== 'admin') {
        toast.error('Access denied.')
        setLoading(false)
        return
      }
      loginUser(res.data.token, res.data.user)
      toast.success('Admin access granted.')
      navigate('/admin')
    } catch (err) {
      toast.error('Invalid credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-icon" style={{ background: 'linear-gradient(135deg, #dc2626, #991b1b)' }}>
            <Shield size={28} />
          </div>
          <h1>Admin Portal</h1>
          <p>Restricted access only</p>
        </div>
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <div className="input-wrapper">
              <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required />
              <button type="button" className="input-toggle" onClick={() => setShowPw(!showPw)}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <button type="submit" className="btn btn-danger btn-full" disabled={loading}>
            {loading ? 'Verifying...' : 'Access Admin'}
          </button>
        </form>
      </div>
    </div>
  )
}
