import { useState } from 'react'
import { User, Mail, Lock, Shield, CheckCircle2 } from 'lucide-react'
import { userStore } from '../data/store'

function Profile({ user }) {
  const [formData, setFormData] = useState({
    name: user.name || '',
    email: user.email || '',
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      setErrorMsg('New passwords do not match')
      return
    }

    if (formData.newPassword && !formData.oldPassword) {
      setErrorMsg('Current password is required to set a new password')
      return
    }

    setLoading(true)
    
    // Verify old password if trying to change password
    if (formData.oldPassword) {
      const verified = await userStore.authenticate(user.username, formData.oldPassword)
      if (!verified) {
        setErrorMsg('Incorrect current password')
        setLoading(false)
        return
      }
    }

    try {
      const updates = {
        name: formData.name,
        email: formData.email
      }
      if (formData.newPassword) {
        updates.password = formData.newPassword
      }

      await userStore.update(user.id, updates)
      setSuccessMsg('Profile updated successfully!')
      setFormData({ ...formData, oldPassword: '', newPassword: '', confirmPassword: '' })
      
      // Update local storage so the session has the latest name/email
      const current = JSON.parse(localStorage.getItem('tba_current_user') || '{}')
      localStorage.setItem('tba_current_user', JSON.stringify({ ...current, ...updates }))
      
    } catch (err) {
      setErrorMsg('Failed to update profile. Please try again.')
    }
    setLoading(false)
  }

  return (
    <div className="page animate-fade-in">
      <div className="page-header">
        <h1>My Profile</h1>
      </div>

      <div className="settings-grid">
        <div className="glass-card">
          <div className="card-header">
            <h2 className="card-title">
              <User size={20} />
              Account Settings
            </h2>
          </div>
          <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
            {errorMsg && (
              <div style={{ padding: '10px 15px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem' }}>
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div style={{ padding: '10px 15px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={18} />
                {successMsg}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                type="text"
                className="form-input"
                value={user.username}
                disabled
                style={{ opacity: 0.7, cursor: 'not-allowed' }}
              />
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px', display: 'block' }}>Username cannot be changed.</span>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>
                    <User size={18} />
                  </span>
                  <input
                    type="text"
                    name="name"
                    className="form-input"
                    value={formData.name}
                    onChange={handleChange}
                    style={{ paddingLeft: '40px' }}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>
                    <Mail size={18} />
                  </span>
                  <input
                    type="email"
                    name="email"
                    className="form-input"
                    value={formData.email}
                    onChange={handleChange}
                    style={{ paddingLeft: '40px' }}
                    placeholder="Enter email address"
                  />
                </div>
              </div>
            </div>

            <hr style={{ borderColor: 'rgba(255,255,255,0.05)', margin: '30px 0' }} />
            
            <h3 style={{ fontSize: '1rem', marginBottom: '20px', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={18} />
              Change Password
            </h3>

            <div className="form-group">
              <label className="form-label">Current Password</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>
                  <Lock size={18} />
                </span>
                <input
                  type="password"
                  name="oldPassword"
                  className="form-input"
                  value={formData.oldPassword}
                  onChange={handleChange}
                  style={{ paddingLeft: '40px' }}
                  placeholder="Leave blank if not changing password"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input
                  type="password"
                  name="newPassword"
                  className="form-input"
                  value={formData.newPassword}
                  onChange={handleChange}
                  placeholder="New password"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  className="form-input"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm new password"
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '30px' }}>
              <button 
                type="submit" 
                className={`btn btn-primary ${loading ? 'loading' : ''}`}
                disabled={loading}
              >
                {loading ? <span className="spinner"></span> : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Profile
