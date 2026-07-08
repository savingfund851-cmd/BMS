import { useState, useEffect, useRef } from 'react'
import { Search, Bell, Menu, X, Building2, Users, Receipt, CheckCircle2, Clock, AlertTriangle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { tenantStore, buildingStore, billStore } from '../data/store'

function Header({ user, onToggleSidebar }) {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showSearch, setShowSearch] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState([])
  const searchRef = useRef(null)
  const notifRef = useRef(null)

  const today = new Date()
  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  // Build notifications from bills
  useEffect(() => {
    const fetchNotifs = async () => {
      const bills = await billStore.getAll()
      const tenants = await tenantStore.getAll()
    const now = new Date()
    const notifs = []

    bills.forEach(b => {
      const tenant = tenants.find(t => t.id === b.tenantId)
      if (!tenant) return
      const due = new Date(b.dueDate)

      if (b.status === 'overdue') {
        notifs.push({
          id: b.id,
          type: 'overdue',
          icon: 'overdue',
          message: `${tenant.name} — Bill overdue (${b.month} ${b.year})`,
          sub: `Due: ${b.dueDate}`,
          link: `/bill-preview/${b.id}`
        })
      } else if (b.status === 'pending' && due <= now) {
        notifs.push({
          id: b.id,
          type: 'due',
          icon: 'due',
          message: `${tenant.name} — Bill due today (${b.month} ${b.year})`,
          sub: `Amount: ৳${Number(b.totalAmount).toLocaleString()}`,
          link: `/bill-preview/${b.id}`
        })
      } else if (b.status === 'pending') {
        const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24))
        if (diffDays <= 3) {
          notifs.push({
            id: b.id,
            type: 'upcoming',
            icon: 'upcoming',
            message: `${tenant.name} — Bill due in ${diffDays} day(s)`,
            sub: `${b.month} ${b.year} • ৳${Number(b.totalAmount).toLocaleString()}`,
            link: `/bill-preview/${b.id}`
          })
        }
      }
    })

      setNotifications(notifs.slice(0, 20))
    }
    fetchNotifs()
  }, [])

  // Search logic
  useEffect(() => {
    const doSearch = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([])
        setShowSearch(false)
        return
      }
      const q = searchQuery.toLowerCase()
      const results = []

      // Search tenants
      const allTenants = await tenantStore.getAll()
      allTenants.forEach(t => {
      if (
        t.name?.toLowerCase().includes(q) ||
        t.flat?.toLowerCase().includes(q) ||
        t.phone?.includes(q) ||
        t.email?.toLowerCase().includes(q)
      ) {
        results.push({
          type: 'tenant',
          id: t.id,
          title: t.name,
          sub: `Flat ${t.flat} • ${t.phone}`,
          link: '/tenants'
        })
      }
    })

    // Search buildings
    const allBuildings = await buildingStore.getAll()
    allBuildings.forEach(b => {
      if (b.name?.toLowerCase().includes(q) || b.address?.toLowerCase().includes(q)) {
        results.push({
          type: 'building',
          id: b.id,
          title: b.name,
          sub: b.address,
          link: '/buildings'
        })
      }
    })

    // Search bills by tenant name
    const allBills = await billStore.getAll()
    allBills.forEach(b => {
      const tenant = allTenants.find(t => t.id === b.tenantId)
      if (!tenant) return
      if (
        tenant.name?.toLowerCase().includes(q) ||
        b.month?.toLowerCase().includes(q) ||
        String(b.year).includes(q)
      ) {
        results.push({
          type: 'bill',
          id: b.id,
          title: `Bill — ${tenant.name}`,
          sub: `${b.month} ${b.year} • ৳${Number(b.totalAmount).toLocaleString()} • ${b.status}`,
          link: `/bill-preview/${b.id}`
        })
      }
    })

      setSearchResults(results.slice(0, 8))
      setShowSearch(results.length > 0)
    }
    doSearch()
  }, [searchQuery])

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearch(false)
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleResultClick = (link) => {
    navigate(link)
    setSearchQuery('')
    setShowSearch(false)
  }

  const getTypeIcon = (type) => {
    if (type === 'tenant') return <Users size={14} />
    if (type === 'building') return <Building2 size={14} />
    return <Receipt size={14} />
  }

  const getNotifIcon = (icon) => {
    if (icon === 'overdue') return <AlertTriangle size={14} style={{ color: 'var(--color-error)' }} />
    if (icon === 'due') return <Clock size={14} style={{ color: 'var(--color-warning)' }} />
    return <Clock size={14} style={{ color: 'var(--color-info, #3b82f6)' }} />
  }

  return (
    <header className="header">
      <div className="header-left">
        <button className="menu-toggle" onClick={onToggleSidebar}>
          <Menu size={20} />
        </button>

        {/* Search */}
        <div className="header-search-wrap" ref={searchRef}>
          <div className="header-search">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search tenants, buildings, bills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
              onFocus={() => searchResults.length > 0 && setShowSearch(true)}
            />
            {searchQuery && (
              <button className="search-clear" onClick={() => { setSearchQuery(''); setShowSearch(false) }}>
                <X size={15} />
              </button>
            )}
          </div>

          {showSearch && searchResults.length > 0 && (
            <div className="search-dropdown">
              {searchResults.map((r, i) => (
                <div key={i} className="search-result-item" onClick={() => handleResultClick(r.link)}>
                  <span className="search-result-icon">{getTypeIcon(r.type)}</span>
                  <div className="search-result-text">
                    <span className="search-result-title">{r.title}</span>
                    <span className="search-result-sub">{r.sub}</span>
                  </div>
                  <span className={`search-result-badge badge-${r.type}`}>{r.type}</span>
                </div>
              ))}
            </div>
          )}

          {showSearch && searchResults.length === 0 && searchQuery.trim() && (
            <div className="search-dropdown">
              <div className="search-no-result">No results for "{searchQuery}"</div>
            </div>
          )}
        </div>
      </div>

      <div className="header-right">
        <span className="header-date">{dateStr}</span>

        {/* Notifications */}
        <div className="notif-wrap" ref={notifRef}>
          <button className="notification-btn" onClick={() => setShowNotifications(!showNotifications)}>
            <Bell size={20} />
            {notifications.length > 0 && (
              <span className="notification-badge">{notifications.length > 9 ? '9+' : notifications.length}</span>
            )}
          </button>

          {showNotifications && (
            <div className="notif-dropdown">
              <div className="notif-header">
                <span>Notifications</span>
                <span className="notif-count">{notifications.length}</span>
              </div>
              {notifications.length === 0 ? (
                <div className="notif-empty">
                  <CheckCircle2 size={24} />
                  <span>All caught up!</span>
                </div>
              ) : (
                <div className="notif-list">
                  {notifications.map((n, i) => (
                    <div key={i} className={`notif-item notif-${n.type}`}
                      onClick={() => { navigate(n.link); setShowNotifications(false) }}>
                      <span className="notif-icon">{getNotifIcon(n.icon)}</span>
                      <div className="notif-text">
                        <span className="notif-msg">{n.message}</span>
                        <span className="notif-sub">{n.sub}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="header-user">
          <div className="header-avatar">{user.name.charAt(0)}</div>
          <div className="header-user-info">
            <span className="header-user-name">{user.name}</span>
            <span className="header-user-role">
              {user.role === 'superadmin' ? 'Super Admin' : 'Admin'}
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
