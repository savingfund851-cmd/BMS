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
import TenantReport from './pages/TenantReport'
import { initializeDefaultData, userStore } from './data/store'

function App() {
  const [user, setUser] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    initializeDefaultData()
    const checkUser = async () => {
      const savedUser = localStorage.getItem('tba_current_user')
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser)
        try {
          const freshUser = await userStore.getById(parsedUser.id)
          if (freshUser) {
            setUser(freshUser)
            localStorage.setItem('tba_current_user', JSON.stringify(freshUser))
          } else {
            setUser(parsedUser)
          }
        } catch (err) {
          console.error("Error fetching user", err)
          setUser(parsedUser)
        }
      }
    }
    checkUser()
  }, [])

  const handleLogin = (userData) => {
    setUser(userData)
    localStorage.setItem('tba_current_user', JSON.stringify(userData))
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('tba_current_user')
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
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/buildings" element={<Buildings />} />
            <Route path="/tenants" element={<Tenants />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/tenant-report/:tenantId" element={<TenantReport />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/bill-preview/:billId" element={<BillPreview />} />
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
