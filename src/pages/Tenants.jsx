import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Plus, Edit3, Trash2, Phone, Mail, Home, X, Filter, FileText } from 'lucide-react'
import { tenantStore, buildingStore, settingsStore, userStore } from '../data/store'
import { getInitials } from '../data/helpers'

function Tenants() {
  const navigate = useNavigate()
  const [appSettings, setAppSettings] = useState({})
  const [globalDemandRate, setGlobalDemandRate] = useState(90)
  const [billItems, setBillItems] = useState(['rent', 'electricity', 'water', 'gas', 'serviceCharge', 'otherCharges'])
  const [rentEnabled, setRentEnabled] = useState(true)

  useEffect(() => {
    const s = settingsStore.get()
    setAppSettings(s || {})
    setGlobalDemandRate(s?.electricityDemandRate ?? 90)
    const items = s?.billItems || ['rent', 'electricity', 'water', 'gas', 'serviceCharge', 'otherCharges']
    setBillItems(items)
    setRentEnabled(items.includes('rent'))

    const handler = () => {
      const s2 = settingsStore.get()
      setAppSettings(s2 || {})
      setGlobalDemandRate(s2?.electricityDemandRate ?? 90)
      const items2 = s2?.billItems || ['rent', 'electricity', 'water', 'gas', 'serviceCharge', 'otherCharges']
      setBillItems(items2)
      setRentEnabled(items2.includes('rent'))
    }
    window.addEventListener('storeUpdated', handler)
    return () => window.removeEventListener('storeUpdated', handler)
  }, [])
  const [tenants, setTenants] = useState([])
  const [buildings, setBuildings] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editingTenant, setEditingTenant] = useState(null)
  const [filterBuilding, setFilterBuilding] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [form, setForm] = useState({
    name: '', buildingId: '', flat: '', floor: '', phone: '', email: '',
    monthlyRent: '', advanceDeposit: '', moveInDate: '', status: 'active',
    // Electricity meter
    electricityMeterNo: '',
    electricityRate: '', electricityStartUnit: '', electricityStartDate: '',
    sectionLoad: '',
    // Water meter
    waterMeterNo: '',
    waterRate: '', waterStartUnit: '', waterStartDate: ''
  })

  useEffect(() => {
    const init = () => {
      const user = JSON.parse(sessionStorage.getItem('tba_current_user') || '{}')
      setCurrentUser(user)
      if (user.role !== 'superadmin' && user.permissions && !user.permissions.includes('manage_tenants')) {
        navigate('/')
        return
      }
      
      let allBuildings = buildingStore.getAll()
      if (user.role === 'manager' && user.buildingId) {
        allBuildings = allBuildings.filter(b => b.id === user.buildingId)
        setFilterBuilding(user.buildingId)
      }
      setBuildings(allBuildings)
      loadTenants(user)
    }
    init()

    const handler = () => loadTenants(JSON.parse(sessionStorage.getItem('tba_current_user') || '{}'))
    window.addEventListener('storeUpdated', handler)
    return () => window.removeEventListener('storeUpdated', handler)
  }, [navigate])

  const loadTenants = (user = currentUser) => {
    let all = tenantStore.getAll()
    if (user && user.role === 'manager' && user.buildingId) {
      all = all.filter(t => t.buildingId === user.buildingId)
    }
    const allBuildings = buildingStore.getAll()
    const enriched = all.map(t => ({
      ...t,
      buildingName: allBuildings.find(b => b.id === t.buildingId)?.name || 'Unknown'
    }))
    setTenants(enriched)
  }

  const filtered = tenants.filter(t => {
    const matchesBuilding = filterBuilding === 'all' || t.buildingId === filterBuilding
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.flat.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.phone.includes(searchTerm)
    return matchesBuilding && matchesSearch
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const data = {
      name: form.name,
      buildingId: form.buildingId,
      flat: form.flat,
      floor: parseInt(form.floor) || 1,
      phone: form.phone,
      email: form.email,
      monthlyRent: parseFloat(form.monthlyRent) || 0,
      advanceDeposit: parseFloat(form.advanceDeposit) || 0,
      moveInDate: form.moveInDate,
      status: form.status,
      // electricity
      electricityMeterNo: form.electricityMeterNo,
      electricityRate: parseFloat(form.electricityRate) || 0,
      electricityStartUnit: parseFloat(form.electricityStartUnit) || 0,
      electricityStartDate: form.electricityStartDate,
      sectionLoad: parseFloat(form.sectionLoad) || 0,
      // water
      waterMeterNo: form.waterMeterNo,
      waterRate: parseFloat(form.waterRate) || 0,
      waterStartUnit: parseFloat(form.waterStartUnit) || 0,
      waterStartDate: form.waterStartDate,
    }

    if (editingTenant) {
      await tenantStore.update(editingTenant.id, data)
    } else {
      await tenantStore.add(data)
    }
    
    setShowModal(false)
    setEditingTenant(null)
    setForm({ 
      name: '', buildingId: '', flat: '', floor: '', phone: '', email: '', 
      monthlyRent: '', advanceDeposit: '', moveInDate: '', status: 'active',
      electricityMeterNo: '', electricityRate: '', electricityStartUnit: '', electricityStartDate: '', sectionLoad: '',
      waterMeterNo: '', waterRate: '', waterStartUnit: '', waterStartDate: ''
    })
  }

  const resetForm = () => {
    setForm({
      name: '', buildingId: '', flat: '', floor: '', phone: '', email: '',
      monthlyRent: '', advanceDeposit: '', moveInDate: '', status: 'active',
      electricityRate: '', electricityStartUnit: '', electricityStartDate: '',
      sectionLoad: '',
      waterRate: '', waterStartUnit: '', waterStartDate: ''
    })
  }

  const handleEdit = (tenant) => {
    setEditingTenant(tenant)
    setForm({
      name: tenant.name, buildingId: tenant.buildingId, flat: tenant.flat,
      floor: tenant.floor, phone: tenant.phone, email: tenant.email,
      monthlyRent: tenant.monthlyRent, advanceDeposit: tenant.advanceDeposit,
      moveInDate: tenant.moveInDate, status: tenant.status,
      electricityMeterNo: tenant.electricityMeterNo || '',
      electricityRate: tenant.electricityRate || '',
      electricityStartUnit: tenant.electricityStartUnit ?? '',
      electricityStartDate: tenant.electricityStartDate || '',
      sectionLoad: tenant.sectionLoad || '',
      waterMeterNo: tenant.waterMeterNo || '',
      waterRate: tenant.waterRate || '',
      waterStartUnit: tenant.waterStartUnit ?? '',
      waterStartDate: tenant.waterStartDate || ''
    })
    setShowModal(true)
  }

  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authPassword, setAuthPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [deletingId, setDeletingId] = useState(null)

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
      await tenantStore.remove(deletingId)
      setShowAuthModal(false)
      setDeletingId(null)
    } else {
      setAuthError('Incorrect password')
    }
  }

  const avatarColors = [
    'linear-gradient(135deg, #10b981, #06d6a0)',
    'linear-gradient(135deg, #3b82f6, #6366f1)',
    'linear-gradient(135deg, #f59e0b, #ef4444)',
    'linear-gradient(135deg, #8b5cf6, #ec4899)',
    'linear-gradient(135deg, #14b8a6, #0ea5e9)',
    'linear-gradient(135deg, #f472b6, #a855f7)',
  ]

  return (
    <div className="page animate-fade-in">
      <div className="page-header">
        <div>
          <h2 className="page-title">Tenants</h2>
          <p className="page-subtitle">{filtered.length} tenants found</p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setEditingTenant(null); setShowModal(true) }}>
          <Plus size={18} />
          <span>Add Tenant</span>
        </button>
      </div>

      <div className="filter-bar">
        <div className="filter-group">
          <Filter size={16} />
          <select
            className="form-select filter-select"
            value={filterBuilding}
            onChange={e => setFilterBuilding(e.target.value)}
          >
            <option value="all">All Buildings</option>
            {buildings.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
        <input
          type="text"
          className="form-input search-filter"
          placeholder="Search by name, flat, or phone..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="tenant-grid">
        {filtered.map((tenant, index) => (
          <div key={tenant.id} className="tenant-card animate-slide-up" style={{ animationDelay: `${index * 0.05}s` }}>
            <div className="tenant-card-header">
              <div className="tenant-avatar" style={{ background: avatarColors[index % avatarColors.length] }}>
                {getInitials(tenant.name)}
              </div>
              <div className="tenant-card-actions">
                <button className="btn-icon" onClick={() => handleEdit(tenant)} title="Edit"><Edit3 size={14} /></button>
                {(currentUser?.role === 'superadmin' || (appSettings.allowedDeleteRoles || []).includes(currentUser?.role)) && (
                  <button className="btn-icon danger" onClick={() => handleDelete(tenant.id)} title="Delete"><Trash2 size={14} /></button>
                )}
              </div>
            </div>
            <h4 className="tenant-name">{tenant.name}</h4>
            <span className={`status-badge status-${tenant.status}`}>{tenant.status}</span>
            <div className="tenant-info-grid">
              <div className="tenant-info-item">
                <Home size={14} />
                <span>{tenant.buildingName} - Flat {tenant.flat}</span>
              </div>
              <div className="tenant-info-item">
                <Phone size={14} />
                <span>{tenant.phone}</span>
              </div>
              {tenant.email && (
                <div className="tenant-info-item">
                  <Mail size={14} />
                  <span>{tenant.email}</span>
                </div>
              )}
            </div>
            {rentEnabled && (
              <div className="tenant-rent">
                <span className="rent-label">Monthly Rent:</span>
                <span className="rent-value">৳{Number(tenant.monthlyRent).toLocaleString()}</span>
              </div>
            )}
            <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
              <button 
                className="btn btn-secondary" 
                style={{ flex: 1, display: 'flex', justifyContent: 'center' }}
                onClick={() => navigate(`/tenant-report/${tenant.id}`)}
              >
                <FileText size={16} style={{ marginRight: '6px' }} />
                <span>View Report</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal modal-lg animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingTenant ? 'Edit Tenant' : 'Add New Tenant'}</h3>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input className="form-input" type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Tenant name" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Building</label>
                    <select className="form-select" value={form.buildingId} onChange={e => setForm({...form, buildingId: e.target.value})} required>
                      <option value="">Select Building</option>
                      {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Flat Number</label>
                    <input className="form-input" type="text" value={form.flat} onChange={e => setForm({...form, flat: e.target.value})} placeholder="e.g. A1, 201" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Floor</label>
                    <input className="form-input" type="number" value={form.floor} onChange={e => setForm({...form, floor: e.target.value})} placeholder="1" min="0" required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input className="form-input" type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="01XXXXXXXXX" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input className="form-input" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="email@example.com" />
                  </div>
                </div>
                <div className="form-row">
                  {rentEnabled && (
                    <div className="form-group">
                      <label className="form-label">Monthly Rent (৳)</label>
                      <input className="form-input" type="number" value={form.monthlyRent} onChange={e => setForm({...form, monthlyRent: e.target.value})} placeholder="15000" />
                    </div>
                  )}
                  <div className="form-group">
                    <label className="form-label">Advance Deposit (৳)</label>
                    <input className="form-input" type="number" value={form.advanceDeposit} onChange={e => setForm({...form, advanceDeposit: e.target.value})} placeholder="30000" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Move-in Date</label>
                    <input className="form-input" type="date" value={form.moveInDate} onChange={e => setForm({...form, moveInDate: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-select" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                {/* ── Electricity Meter Settings ─────────────────────────── */}
                <div className="form-section-title" style={{display:'flex',alignItems:'center',gap:'8px'}}>
                  ⚡ Electricity Meter Settings
                </div>
                <div className="form-group">
                  <label className="form-label">Electricity Meter No. *</label>
                  <input className="form-input" type="text"
                    value={form.electricityMeterNo}
                    onChange={e => setForm({...form, electricityMeterNo: e.target.value})}
                    placeholder="e.g. EM-10123" required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Rate per Unit (৳/kWh)</label>
                    <input className="form-input" type="number" step="0.01"
                      value={form.electricityRate}
                      onChange={e => setForm({...form, electricityRate: e.target.value})}
                      placeholder="e.g. 12" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Starting Unit (meter reading)</label>
                    <input className="form-input" type="number"
                      value={form.electricityStartUnit}
                      onChange={e => setForm({...form, electricityStartUnit: e.target.value})}
                      placeholder="e.g. 1000" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Section Load (kW)</label>
                    <input className="form-input" type="number" step="0.1"
                      value={form.sectionLoad}
                      onChange={e => setForm({...form, sectionLoad: e.target.value})}
                      placeholder="e.g. 5" />
                  </div>
                </div>
                {form.sectionLoad && (
                  <div className="calc-hint">
                    Demand Charge = {form.sectionLoad} kW × ৳{globalDemandRate} = <strong>৳{(parseFloat(form.sectionLoad) * globalDemandRate).toLocaleString()}</strong> per month
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Electricity Billing Start Date</label>
                  <input className="form-input" type="date"
                    value={form.electricityStartDate}
                    onChange={e => setForm({...form, electricityStartDate: e.target.value})} />
                </div>

                {/* ── Water Meter Settings ────────────────────────────────── */}
                <div className="form-section-title" style={{display:'flex',alignItems:'center',gap:'8px'}}>
                  💧 Water Meter Settings
                </div>
                <div className="form-group">
                  <label className="form-label">Water Meter No. *</label>
                  <input className="form-input" type="text"
                    value={form.waterMeterNo}
                    onChange={e => setForm({...form, waterMeterNo: e.target.value})}
                    placeholder="e.g. WM-20456" required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Rate per Unit (৳/m³)</label>
                    <input className="form-input" type="number" step="0.01"
                      value={form.waterRate}
                      onChange={e => setForm({...form, waterRate: e.target.value})}
                      placeholder="e.g. 15" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Starting Unit (meter reading)</label>
                    <input className="form-input" type="number"
                      value={form.waterStartUnit}
                      onChange={e => setForm({...form, waterStartUnit: e.target.value})}
                      placeholder="e.g. 200" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Water Billing Start Date</label>
                  <input className="form-input" type="date"
                    value={form.waterStartDate}
                    onChange={e => setForm({...form, waterStartDate: e.target.value})} />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingTenant ? 'Update' : 'Add Tenant'}</button>
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

export default Tenants
