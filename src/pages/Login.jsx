import { useState, useEffect } from 'react'
import { Zap, Eye, EyeOff, LogIn } from 'lucide-react'
import { userStore, settingsStore } from '../data/store'

function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState({})

  useEffect(() => {
    setSettings(settingsStore.get() || {})
    const handler = () => setSettings(settingsStore.get() || {})
    window.addEventListener('storeUpdated', handler)
    return () => window.removeEventListener('storeUpdated', handler)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const user = await userStore.authenticate(username, password)
      if (user) {
        onLogin(user)
      } else {
        setError('Invalid username or password')
      }
    } catch (err) {
      setError('Connection error. Please try again.')
    }
    setLoading(false)
  }

  return (
    <div className="login-page">
      <div className="login-bg-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>
      
      <div className="login-container animate-slide-up">
        <div className="login-header">
          <div className="login-brand">
            <div className="brand-icon-large">
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt="Logo" style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 8, display: 'block' }} />
              ) : (
                <Zap size={36} />
              )}
            </div>
            <h1>{settings.companyName || 'RentFlow'}</h1>
            <p>Tenant Billing Management System</p>
          </div>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {error && (
            <div className="login-error animate-fade-in">
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              className="form-input"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <div className="password-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button 
                type="button" 
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            className={`btn btn-primary btn-lg login-btn ${loading ? 'loading' : ''}`}
            disabled={loading}
          >
            {loading ? (
              <span className="spinner"></span>
            ) : (
              <>
                <LogIn size={20} />
                <span>Sign In</span>
              </>
            )}
          </button>

          <div className="login-hint">
            <p>Demo Credentials:</p>
            <div className="credentials-grid">
              <div className="credential-item">
                <span className="credential-role">Super Admin</span>
                <code>superadmin / admin123</code>
              </div>
              <div className="credential-item">
                <span className="credential-role">Admin</span>
                <code>admin / admin123</code>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Login
