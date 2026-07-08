import { useState, useEffect } from 'react'
import { 
  Settings as SettingsIcon, Save, Building2, Receipt, Bell, 
  Palette, Shield, Users, Plus, Trash2, X, Check
} from 'lucide-react'
import { settingsStore, userStore, buildingStore } from '../data/store'

function Settings() {
  const [activeTab, setActiveTab] = useState('general')
  const [settings, setSettings] = useState({})
  const [users, setUsers] = useState([])
  const [buildings, setBuildings] = useState([])
  const [showUserModal, setShowUserModal] = useState(false)
  
  const defaultPermissions = ['view_dashboard', 'manage_buildings', 'manage_tenants', 'manage_billing', 'manage_payments', 'manage_settings_general', 'manage_settings_billing', 'manage_settings_users', 'manage_settings_appearance']
  const [userForm, setUserForm] = useState({ 
    username: '', password: '', name: '', role: 'admin', email: '', buildingId: '', 
    permissions: [...defaultPermissions]
  })
  const [saved, setSaved] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    const init = async () => {
      const savedUser = localStorage.getItem('tba_current_user')
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser)
        setCurrentUser(parsedUser)
        
        const hasPerm = (perm) => parsedUser.role === 'superadmin' || (parsedUser.permissions && parsedUser.permissions.includes(perm))
        
        if (!hasPerm('manage_settings_general')) {
          if (hasPerm('manage_settings_billing')) setActiveTab('billing')
          else if (hasPerm('manage_settings_users')) setActiveTab('users')
          else if (hasPerm('manage_settings_appearance')) setActiveTab('appearance')
        }
      }

      setSettings(await settingsStore.get())
      setUsers(await userStore.getAll())
      setBuildings(await buildingStore.getAll())
    }
    init()
  }, [])

  const handleSave = async () => {
    await settingsStore.save(settings)
    window.dispatchEvent(new Event('settingsUpdated'))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleAddUser = async (e) => {
    e.preventDefault()
    
    // If admin is creating user, ensure they can only grant permissions they themselves have
    let finalForm = { ...userForm }
    if (currentUser?.role !== 'superadmin') {
      const myPerms = currentUser?.permissions || []
      finalForm.permissions = userForm.permissions.filter(p => myPerms.includes(p))
      // Admin cannot create superadmin
      if (finalForm.role === 'superadmin') finalForm.role = 'admin'
    }
    
    await userStore.add(finalForm)
    setUsers(await userStore.getAll())
    setShowUserModal(false)
    setUserForm({ 
      username: '', password: '', name: '', role: 'admin', email: '', buildingId: '', 
      permissions: [...defaultPermissions] 
    })
  }

  const handleEditUser = (u) => {
    setUserForm({
      id: u.id,
      username: u.username,
      password: u.password,
      name: u.name,
      role: u.role,
      email: u.email || '',
      buildingId: u.buildingId || '',
      permissions: u.permissions || (u.role === 'superadmin' ? [] : [...defaultPermissions])
    })
    setShowUserModal(true)
  }

  const handleUpdateUser = (e) => {
    e.preventDefault()
    if (userForm.id) {
      userStore.update(userForm.id, userForm)
    } else {
      userStore.add(userForm)
    }
    setUsers(userStore.getAll())
    setShowUserModal(false)
    setUserForm({ 
      username: '', password: '', name: '', role: 'admin', email: '', buildingId: '', 
      permissions: [...defaultPermissions] 
    })
  }

  const handleDeleteUser = async (id) => {
    const targetUser = users.find(u => u.id === id)
    // Admin cannot delete superadmin
    if (currentUser?.role !== 'superadmin' && targetUser?.role === 'superadmin') return
    // Admin cannot delete other admins unless superadmin
    if (currentUser?.role === 'admin' && targetUser?.role === 'admin' && targetUser?.id !== currentUser?.id) return
    if (confirm('Remove this user?')) {
      await userStore.remove(id)
      setUsers(await userStore.getAll())
    }
  }


  const hasPerm = (perm) => currentUser?.role === 'superadmin' || (currentUser?.permissions && currentUser.permissions.includes(perm))

  const allTabs = [
    { id: 'general', icon: Building2, label: 'General', perm: 'manage_settings_general' },
    { id: 'billing', icon: Receipt, label: 'Billing', perm: 'manage_settings_billing' },
    { id: 'users', icon: Users, label: 'User Management', perm: 'manage_settings_users' },
    { id: 'appearance', icon: Palette, label: 'Appearance', perm: 'manage_settings_appearance' },
  ]
  const tabs = allTabs.filter(tab => hasPerm(tab.perm))

  return (
    <div className="page animate-fade-in">
      <div className="page-header">
        <div>
          <h2 className="page-title">Settings</h2>
          <p className="page-subtitle">Super Admin Configuration Panel</p>
        </div>
        {activeTab !== 'users' && (
          <button className={`btn btn-primary ${saved ? 'btn-success' : ''}`} onClick={handleSave}>
            {saved ? <Check size={18} /> : <Save size={18} />}
            <span>{saved ? 'Saved!' : 'Save Changes'}</span>
          </button>
        )}
      </div>

      <div className="settings-layout">
        <div className="settings-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.icon size={18} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="settings-content glass-card">
          {activeTab === 'general' && (
            <div className="settings-section animate-fade-in">
              <h3 className="section-title">Company Information</h3>
              <div className="form-group">
                <label className="form-label">Company Name</label>
                <input className="form-input" value={settings.companyName || ''} onChange={e => setSettings({...settings, companyName: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Tagline / Subtitle <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 400 }}>(নামের নিচের লেখা)</span></label>
                <input 
                  className="form-input" 
                  value={settings.companyTagline || ''} 
                  placeholder="e.g. Property Manager, Real Estate Solutions..."
                  onChange={e => setSettings({...settings, companyTagline: e.target.value})} 
                />
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px', display: 'block' }}>
                  Default: "Property Manager"
                </span>
              </div>
              <div className="form-group">
                <label className="form-label">Company Logo</label>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  {settings.logoUrl && (
                    <img src={settings.logoUrl} alt="Logo Preview" style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 4, background: '#fff', border: '1px solid var(--border-subtle)' }} />
                  )}
                  <input 
                    type="file" 
                    accept="image/*"
                    className="form-input" 
                    onChange={e => {
                      const file = e.target.files[0]
                      if (file) {
                        if (file.size > 2 * 1024 * 1024) {
                          alert('Image must be less than 2MB')
                          return
                        }
                        const reader = new FileReader()
                        reader.onloadend = () => {
                          setSettings({...settings, logoUrl: reader.result})
                        }
                        reader.readAsDataURL(file)
                      }
                    }} 
                    style={{ padding: '6px' }}
                  />
                  {settings.logoUrl && (
                    <button className="btn-icon danger" type="button" onClick={() => setSettings({...settings, logoUrl: ''})} title="Remove Logo">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Address</label>
                <input className="form-input" value={settings.companyAddress || ''} onChange={e => setSettings({...settings, companyAddress: e.target.value})} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-input" value={settings.companyPhone || ''} onChange={e => setSettings({...settings, companyPhone: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-input" value={settings.companyEmail || ''} onChange={e => setSettings({...settings, companyEmail: e.target.value})} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Currency Symbol</label>
                  <input className="form-input" value={settings.currency || '৳'} onChange={e => setSettings({...settings, currency: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Currency Name</label>
                  <input className="form-input" value={settings.currencyName || 'BDT'} onChange={e => setSettings({...settings, currencyName: e.target.value})} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="settings-section animate-fade-in">
              <h3 className="section-title">Billing Configuration</h3>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Bill Due Day (of each month)</label>
                  <input className="form-input" type="number" min="1" max="28" value={settings.billDueDay || 10} onChange={e => setSettings({...settings, billDueDay: parseInt(e.target.value)})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Late Fee Percentage (%)</label>
                  <input className="form-input" type="number" min="0" max="100" value={settings.lateFeePercentage || 5} onChange={e => setSettings({...settings, lateFeePercentage: parseInt(e.target.value)})} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Electricity Demand Rate (৳/kW)</label>
                  <input className="form-input" type="number" min="0" value={settings.electricityDemandRate !== undefined ? settings.electricityDemandRate : 90} onChange={e => setSettings({...settings, electricityDemandRate: parseInt(e.target.value) || 0})} />
                </div>
              </div>
              <h3 className="section-title" style={{ marginTop: '2rem' }}>VAT Configuration</h3>
              <p className="section-desc">Set VAT percentages applied to utility bills.</p>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Electricity VAT (%)</label>
                  <input className="form-input" type="number" min="0" max="100" step="0.5"
                    value={settings.electricityVatRate !== undefined ? settings.electricityVatRate : 5}
                    onChange={e => setSettings({...settings, electricityVatRate: parseFloat(e.target.value) || 0})} />
                  <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px', display: 'block' }}>Default: 5%</span>
                </div>
                <div className="form-group">
                  <label className="form-label">Washa (Water) VAT (%)</label>
                  <input className="form-input" type="number" min="0" max="100" step="0.5"
                    value={settings.waterVatRate !== undefined ? settings.waterVatRate : 15}
                    onChange={e => setSettings({...settings, waterVatRate: parseFloat(e.target.value) || 0})} />
                  <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px', display: 'block' }}>Default: 15%</span>
                </div>
              </div>
              <h3 className="section-title" style={{ marginTop: '3rem' }}>Invoice Field Settings (Superadmin)</h3>
              <p className="section-desc">Select which fields and charges should appear on the generated invoice.</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px', marginTop: '16px' }}>
                {[
                  { id: 'rent', label: 'House Rent', desc: 'Show monthly house rent' },
                  { id: 'electricity', label: 'Electricity Bill', desc: 'Show electricity meter reading & charge' },
                  { id: 'water', label: 'Water (Washa)', desc: 'Show water reading & charge' },
                  { id: 'gas', label: 'Gas Bill', desc: 'Show fixed gas bill' },
                  { id: 'serviceCharge', label: 'Service Charge', desc: 'Show monthly service charge' },
                  { id: 'otherCharges', label: 'Other Charges', desc: 'Show any additional/other charges' }
                ].map(item => (
                  <div key={item.id} style={{ 
                    background: 'var(--color-surface)', 
                    border: '1px solid var(--color-border)', 
                    borderRadius: '8px', 
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{item.label}</span>
                        <label className="toggle-switch">
                          <input 
                            type="checkbox" 
                            checked={(settings.billItems || []).includes(item.id)} 
                            onChange={(e) => {
                              const items = settings.billItems || []
                              if (e.target.checked) {
                                setSettings({...settings, billItems: [...items, item.id]})
                              } else {
                                setSettings({...settings, billItems: items.filter(i => i !== item.id)})
                              }
                            }}
                          />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>
                      <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0 }}>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="settings-section animate-fade-in">
              <div className="section-header-row">
                <h3 className="section-title">User Management</h3>
                <button className="btn btn-primary btn-sm" onClick={() => {
                  setUserForm({ username: '', password: '', name: '', role: 'admin', email: '', buildingId: '', permissions: [...defaultPermissions] })
                  setShowUserModal(true)
                }}>
                  <Plus size={16} />
                  <span>Add User</span>
                </button>
              </div>
              <div className="users-list">
                {users
                  .filter(u => {
                    // Admin cannot see superadmin users
                    if (currentUser?.role !== 'superadmin' && u.role === 'superadmin') return false
                    return true
                  })
                  .map(u => (
                  <div key={u.id} className="user-row">
                    <div className="user-row-avatar">
                      {u.name.charAt(0)}
                    </div>
                    <div className="user-row-info">
                      <span className="user-row-name">{u.name}</span>
                      <span className="user-row-meta">@{u.username} • {u.email}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={`role-badge role-${u.role}`}>
                        <Shield size={12} />
                        {u.role === 'superadmin' ? 'Super Admin' : u.role === 'manager' ? 'Manager' : 'Admin'}
                      </span>
                      {u.role === 'manager' && (
                        <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                          {buildings.find(b => b.id === u.buildingId)?.name || 'No building'}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {/* Admin can only edit/delete non-superadmin, non-admin users (managers) */}
                      {(currentUser?.role === 'superadmin' || (currentUser?.role === 'admin' && u.role === 'manager')) && (
                        <>
                          <button className="btn-icon" onClick={() => handleEditUser(u)} title="Edit"><SettingsIcon size={15} /></button>
                          <button className="btn-icon danger" onClick={() => handleDeleteUser(u.id)} title="Remove"><Trash2 size={15} /></button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="settings-section animate-fade-in">
              <h3 className="section-title">Appearance Settings</h3>
              <div className="toggle-item">
                <div>
                  <span className="toggle-label">Dark Mode</span>
                  <p className="toggle-desc">Use dark theme for the application</p>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" checked={settings.theme === 'dark'} onChange={e => setSettings({...settings, theme: e.target.checked ? 'dark' : 'light'})} />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      {showUserModal && (
        <div className="modal-overlay" onClick={() => setShowUserModal(false)}>
          <div className="modal animate-slide-up" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>{userForm.id ? 'Edit User' : 'Add New User'}</h3>
              <button className="btn-icon" onClick={() => setShowUserModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleUpdateUser}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input className="form-input" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Username</label>
                    <input className="form-input" value={userForm.username} onChange={e => setUserForm({...userForm, username: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Password</label>
                    <input className="form-input" type="password" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input className="form-input" type="email" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Role</label>
                    <select className="form-select" value={userForm.role} onChange={e => {
                      const newRole = e.target.value
                      let perms = userForm.permissions
                      if (newRole === 'manager' && !userForm.id) {
                        perms = ['manage_payments'] // default for new manager
                      } else if (newRole === 'admin' && !userForm.id) {
                        perms = [...defaultPermissions]
                      }
                      setUserForm({...userForm, role: newRole, permissions: perms})
                    }}>
                      <option value="admin">Admin</option>
                      <option value="manager">Manager</option>
                      {currentUser?.role === 'superadmin' && <option value="superadmin">Super Admin</option>}
                    </select>
                  </div>
                </div>
                
                {userForm.role === 'manager' && (
                  <div className="form-group">
                    <label className="form-label">Assign Building</label>
                    <select className="form-select" value={userForm.buildingId} onChange={e => setUserForm({...userForm, buildingId: e.target.value})} required>
                      <option value="">Select Building</option>
                      {buildings.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                
                {/* Permission checklist: show for both superadmin and admin, but admin can only grant their own perms */}
                {userForm.role !== 'superadmin' && (
                  <div className="form-group" style={{ marginTop: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <label className="form-label" style={{ margin: 0 }}>Permissions</label>
                      {currentUser?.role !== 'superadmin' && (
                        <span style={{ fontSize: '11px', color: 'var(--color-amber)', background: 'rgba(245,158,11,0.1)', padding: '3px 8px', borderRadius: '12px' }}>
                          ⚠️ You can only grant permissions you have
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                      {[
                        { id: 'view_dashboard', label: 'View Dashboard', icon: '📊' },
                        { id: 'manage_buildings', label: 'Manage Buildings', icon: '🏢' },
                        { id: 'manage_tenants', label: 'Manage Tenants', icon: '👥' },
                        { id: 'manage_billing', label: 'Manage Billing', icon: '🧾' },
                        { id: 'manage_payments', label: 'Manage Payments', icon: '💳' },
                        { id: 'manage_settings_general', label: 'Settings: General', icon: '⚙️' },
                        { id: 'manage_settings_billing', label: 'Settings: Billing', icon: '💰' },
                        { id: 'manage_settings_users', label: 'Settings: Users', icon: '🔑' },
                        { id: 'manage_settings_appearance', label: 'Settings: Appearance', icon: '🎨' },
                      ].map(perm => {
                        // Admin can only grant permissions they themselves have
                        const myPerms = currentUser?.permissions || []
                        const canGrant = currentUser?.role === 'superadmin' || myPerms.includes(perm.id)
                        const isChecked = userForm.permissions.includes(perm.id)
                        return (
                          <div key={perm.id} style={{ 
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '8px 10px',
                            borderRadius: '6px',
                            background: isChecked ? 'rgba(16,185,129,0.08)' : 'transparent',
                            border: `1px solid ${isChecked ? 'rgba(16,185,129,0.2)' : 'transparent'}`,
                            opacity: canGrant ? 1 : 0.4,
                          }}>
                            <input 
                              type="checkbox" 
                              id={`perm-${perm.id}`}
                              checked={isChecked}
                              disabled={!canGrant}
                              onChange={(e) => {
                                if (!canGrant) return
                                const checked = e.target.checked
                                const newPerms = checked 
                                  ? [...userForm.permissions, perm.id]
                                  : userForm.permissions.filter(p => p !== perm.id)
                                setUserForm({...userForm, permissions: newPerms})
                              }}
                              style={{ accentColor: 'var(--color-emerald)', width: '15px', height: '15px', cursor: canGrant ? 'pointer' : 'not-allowed', flexShrink: 0 }}
                            />
                            <label htmlFor={`perm-${perm.id}`} style={{ 
                              fontSize: '13px', 
                              color: isChecked ? 'var(--color-text)' : 'var(--color-text-secondary)', 
                              cursor: canGrant ? 'pointer' : 'not-allowed',
                              display: 'flex', alignItems: 'center', gap: '6px'
                            }}>
                              <span>{perm.icon}</span> {perm.label}
                              {!canGrant && <span style={{ fontSize: '10px', color: 'var(--color-danger)' }}>(restricted)</span>}
                            </label>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowUserModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{userForm.id ? 'Save Changes' : 'Add User'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Settings
