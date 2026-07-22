import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import Dashboard from './pages/Dashboard'
import Buildings from './pages/Buildings'
import Tenants from './pages/Tenants'
import Billing from './pages/Billing'
import Payments from './pages/Payments'
import Settings from './pages/Settings'
import Login from './pages/Login'
import BillPreview from './pages/BillPreview'
import Reports from './pages/Reports'
import TenantReport from './pages/TenantReport'
import Profile from './pages/Profile'
import PaymentReceipt from './pages/PaymentReceipt'
import { initializeDefaultData, userStore } from './data/store'

function App() {
  const [user, setUser] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768)
  const [lastUpdate, setLastUpdate] = useState(Date.now())

  useEffect(() => {
    initializeDefaultData()
    
    const handleUpdate = () => {
      setLastUpdate(Date.now())
    }
    window.addEventListener('storeUpdated', handleUpdate)

    const checkUser = () => {
      const savedUser = sessionStorage.getItem('tba_current_user')
      
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser)
        // getById reads from cache (synchronous)
        const freshUser = userStore.getById(parsedUser.id)
        setUser(freshUser || parsedUser)
        if (freshUser) {
          sessionStorage.setItem('tba_current_user', JSON.stringify(freshUser))
        }
      }
    }
    checkUser()

    return () => window.removeEventListener('storeUpdated', handleUpdate)
  }, [])

  // 12-hour inactivity logout
  useEffect(() => {
    if (!user) return

    const TIMEOUT = 12 * 60 * 60 * 1000 // 12 hours
    const checkTimeout = () => {
      const lastActive = sessionStorage.getItem('tba_last_activity')
      if (lastActive && Date.now() - parseInt(lastActive) > TIMEOUT) {
        handleLogout()
      }
    }

    const updateActivity = () => {
      sessionStorage.setItem('tba_last_activity', Date.now())
    }

    updateActivity()
    const interval = setInterval(checkTimeout, 60000)

    window.addEventListener('mousemove', updateActivity)
    window.addEventListener('keydown', updateActivity)
    window.addEventListener('click', updateActivity)

    return () => {
      clearInterval(interval)
      window.removeEventListener('mousemove', updateActivity)
      window.removeEventListener('keydown', updateActivity)
      window.removeEventListener('click', updateActivity)
    }
  }, [user])

  const handleLogin = (userData) => {
    setUser(userData)
    sessionStorage.setItem('tba_current_user', JSON.stringify(userData))
  }

  const handleLogout = () => {
    setUser(null)
    sessionStorage.removeItem('tba_current_user')
    localStorage.removeItem('tba_saved_creds')
  }

  if (!user) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <div className={`app-layout ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>
      <Sidebar 
        user={user} 
        isOpen={sidebarOpen} 
        onToggle={() => setSidebarOpen(!sidebarOpen)} 
        onLogout={handleLogout}
      />
      <div className="main-area">
        <Header 
          user={user} 
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} 
        />
        <main className="main-content">
          <Routes key={lastUpdate}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/buildings" element={<Buildings />} />
            <Route path="/tenants" element={<Tenants />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/tenant-report/:tenantId" element={<TenantReport />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/bill-preview/:billId" element={<BillPreview />} />
            <Route path="/payment-receipt/:paymentId" element={<PaymentReceipt />} />
            <Route path="/profile" element={<Profile user={user} />} />
            {(user.role === 'superadmin' || user.canAccessSettings || 
               (user.permissions && (user.permissions.includes('manage_settings_general') || user.permissions.includes('manage_settings_billing') || user.permissions.includes('manage_settings_appearance') || user.permissions.includes('manage_settings')))) && (
              <Route path="/settings" element={<Settings />} />
            )}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default App
