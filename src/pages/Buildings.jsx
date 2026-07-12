import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Plus, Edit3, Trash2, MapPin, Users, X } from 'lucide-react'
import { buildingStore, tenantStore, userStore, settingsStore } from '../data/store'

function Buildings() {
  const navigate = useNavigate()
  const [buildings, setBuildings] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingBuilding, setEditingBuilding] = useState(null)
  const [form, setForm] = useState({ name: '', address: '', floors: '', totalFlats: '' })
  const [currentUser, setCurrentUser] = useState(null)
  const [settings, setSettings] = useState({})

  // Delete Auth State
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authPassword, setAuthPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => { 
    const user = JSON.parse(localStorage.getItem('tba_current_user') || '{}')
    setCurrentUser(user)
    setSettings(settingsStore.get() || {})
    if (user.role !== 'superadmin' && user.permissions && !user.permissions.includes('manage_buildings')) {
      navigate('/')
      return
    }
    loadBuildings(user) 

    const handler = () => {
      loadBuildings(JSON.parse(localStorage.getItem('tba_current_user') || '{}'))
      setSettings(settingsStore.get() || {})
    }
    window.addEventListener('storeUpdated', handler)
    return () => window.removeEventListener('storeUpdated', handler)
  }, [navigate])

  const loadBuildings = (user = currentUser) => {
    let allBuildings = buildingStore.getAll()
    if (user && user.role === 'manager' && user.buildingId) {
      allBuildings = allBuildings.filter(b => b.id === user.buildingId)
    }
    const tenants = tenantStore.getAll()
    const enriched = allBuildings.map(b => ({
      ...b,
      activeTenants: tenants.filter(t => t.buildingId === b.id && t.status === 'active').length
    }))
    setBuildings(enriched)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const data = {
      name: form.name,
      address: form.address,
      floors: parseInt(form.floors) || 0,
      totalFlats: parseInt(form.totalFlats) || 0
    }
    if (editingBuilding) {
      await buildingStore.update(editingBuilding.id, data)
    } else {
      await buildingStore.add(data)
    }
    setShowModal(false)
    setEditingBuilding(null)
    setForm({ name: '', address: '', floors: '', totalFlats: '' })
  }

  const handleEdit = (building) => {
    setEditingBuilding(building)
    setForm({ name: building.name, address: building.address, floors: building.floors, totalFlats: building.totalFlats })
    setShowModal(true)
  }

  const handleDelete = (id) => {
    setDeletingId(id)
    setAuthPassword('')
    setAuthError('')
    setShowAuthModal(true)
  }

  const handleAuthSubmit = async (e) => {
    e.preventDefault()
    setAuthError('')
    const verified = await userStore.authenticate(currentUser.username, authPassword)
    if (verified) {
      await buildingStore.remove(deletingId)
      setShowAuthModal(false)
      setDeletingId(null)
    } else {
      setAuthError('Incorrect password')
    }
  }

  const openAddModal = () => {
    setEditingBuilding(null)
    setForm({ name: '', address: '', floors: '', totalFlats: '' })
    setShowModal(true)
  }

  const gradients = [
    'linear-gradient(135deg, #10b981, #06d6a0)',
    'linear-gradient(135deg, #3b82f6, #6366f1)',
    'linear-gradient(135deg, #f59e0b, #ef4444)',
    'linear-gradient(135deg, #8b5cf6, #ec4899)',
    'linear-gradient(135deg, #14b8a6, #0ea5e9)'
  ]

  return (
    <div className="page animate-fade-in">
      <div className="page-header">
        <div>
          <h2 className="page-title">Buildings</h2>
          <p className="page-subtitle">Manage your properties</p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          <Plus size={18} />
          <span>Add Building</span>
        </button>
      </div>

      <div className="building-grid">
        {buildings.map((building, index) => (
          <div key={building.id} className="building-card animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
            <div className="building-card-accent" style={{ background: gradients[index % gradients.length] }}></div>
            <div className="building-card-body">
              <div className="building-card-header">
                <div className="building-icon" style={{ background: gradients[index % gradients.length] }}>
                  <Building2 size={22} />
                </div>
                <div className="building-card-actions">
                  <button className="btn-icon" onClick={() => handleEdit(building)} title="Edit">
                    <Edit3 size={15} />
                  </button>
                  {(currentUser?.role === 'superadmin' || (settings.allowedDeleteRoles || []).includes(currentUser?.role)) && (
                    <button className="btn-icon danger" onClick={() => handleDelete(building.id)} title="Delete">
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
              <h3 className="building-name">{building.name}</h3>
              <p className="building-address-text">
                <MapPin size={14} />
                {building.address}
              </p>
              <div className="building-card-stats">
                <div className="building-stat-item">
                  <span className="stat-num">{building.floors}</span>
                  <span className="stat-lbl">Floors</span>
                </div>
                <div className="building-stat-item">
                  <span className="stat-num">{building.totalFlats}</span>
                  <span className="stat-lbl">Flats</span>
                </div>
                <div className="building-stat-item">
                  <span className="stat-num">{building.activeTenants}</span>
                  <span className="stat-lbl">Tenants</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingBuilding ? 'Edit Building' : 'Add New Building'}</h3>
              <button className="btn-icon" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Building Name</label>
                  <input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Address</label>
                  <input className="form-input" value={form.address} onChange={e => setForm({...form, address: e.target.value})} required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Number of Floors</label>
                    <input type="number" className="form-input" value={form.floors} onChange={e => setForm({...form, floors: e.target.value})} required min="1" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Total Flats</label>
                    <input type="number" className="form-input" value={form.totalFlats} onChange={e => setForm({...form, totalFlats: e.target.value})} required min="1" />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingBuilding ? 'Save Changes' : 'Add Building'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAuthModal && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 9999 }}>
          <div className="modal-content animate-slide-up" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>Security Verification</h3>
              <button className="btn-close" onClick={() => setShowAuthModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '15px', color: 'var(--color-text-muted)' }}>
                Deleting this record requires admin verification. Please enter your password to continue.
              </p>
              {authError && <div className="alert alert-danger" style={{ marginBottom: '15px' }}>{authError}</div>}
              <form onSubmit={handleAuthSubmit}>
                <div className="form-group">
                  <label className="form-label">Admin Password</label>
                  <input 
                    type="password" 
                    className="form-input" 
                    value={authPassword} 
                    onChange={e => setAuthPassword(e.target.value)} 
                    placeholder="Enter password"
                    required 
                    autoFocus
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAuthModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-danger">Confirm Delete</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Buildings
