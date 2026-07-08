import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { 
  LayoutDashboard, Building2, Users, Receipt, CreditCard, 
  Settings, LogOut, ChevronLeft, ChevronRight, Zap
} from 'lucide-react'
import { settingsStore } from '../data/store'

function Sidebar({ user, isOpen, onToggle, onLogout }) {
  const [settings, setSettings] = useState(settingsStore.get() || {})

  useEffect(() => {
    const handleSettings = () => setSettings(settingsStore.get() || {})
    window.addEventListener('settingsUpdated', handleSettings)
    return () => window.removeEventListener('settingsUpdated', handleSettings)
  }, [])

  const hasPerm = (perm) => user.role === 'superadmin' || (user.permissions && user.permissions.includes(perm))

  const allNavItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard', perm: 'view_dashboard' },
    { path: '/buildings', icon: Building2, label: 'Buildings', perm: 'manage_buildings' },
    { path: '/tenants', icon: Users, label: 'Tenants', perm: 'manage_tenants' },
    { path: '/billing', icon: Receipt, label: 'Billing', perm: 'manage_billing' },
    { path: '/payments', icon: CreditCard, label: 'Payments', perm: 'manage_payments' }
  ]

  const navItems = allNavItems.filter(item => hasPerm(item.perm))

  const hasAnySettingsPerm = hasPerm('manage_settings') || hasPerm('manage_settings_general') || hasPerm('manage_settings_billing') || hasPerm('manage_settings_appearance')

  if (hasAnySettingsPerm || user.canAccessSettings) {
    navItems.push({ path: '/settings', icon: Settings, label: 'Settings' })
  }

  return (
    <aside className={`sidebar ${isOpen ? 'open' : 'collapsed'}`}>
      <div className="sidebar-brand">
        <div className="brand-icon">
          {settings.logoUrl ? (
            <img src={settings.logoUrl} alt="Logo" style={{ width: 28, height: 28, borderRadius: 4, objectFit: 'contain', display: 'block' }} />
          ) : (
            <Zap size={24} />
          )}
        </div>
        {isOpen && (
          <div className="brand-text">
            <h1 style={{ fontSize: settings.companyName?.length > 15 ? '0.9rem' : undefined }}>
              {settings.companyName || 'RentFlow'}
            </h1>
            <span>{settings.companyTagline || 'Property Manager'}</span>
          </div>
        )}
        <button className="sidebar-toggle" onClick={onToggle}>
          {isOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            title={item.label}
          >
            <item.icon size={20} />
            {isOpen && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-info-mini">
          <div className="user-avatar-small">
            {user.name.charAt(0)}
          </div>
          {isOpen && (
            <div className="user-details">
              <span className="user-name-small">{user.name}</span>
              <span className="user-role-badge">{user.role === 'superadmin' ? 'Super Admin' : 'Admin'}</span>
            </div>
          )}
        </div>
        <button className="logout-btn" onClick={onLogout} title="Logout">
          <LogOut size={18} />
          {isOpen && <span>Logout</span>}
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
