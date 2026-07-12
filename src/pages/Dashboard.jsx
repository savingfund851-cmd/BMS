import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Building2, Users, Receipt, CreditCard, TrendingUp, TrendingDown,
  ArrowUpRight, Clock, CheckCircle2, AlertTriangle, DollarSign
} from 'lucide-react'
import { buildingStore, tenantStore, billStore, paymentStore } from '../data/store'
import { formatCurrency, getCurrentMonthYear } from '../data/helpers'

function Dashboard() {
  const navigate = useNavigate()
  const [currentUser, setCurrentUser] = useState(null)
  const [stats, setStats] = useState({
    totalBuildings: 0,
    totalTenants: 0,
    totalBills: 0,
    totalCollected: 0,
    totalPending: 0,
    totalOverdue: 0,
    collectionRate: 0
  })
  const [recentBills, setRecentBills] = useState([])
  const [recentPayments, setRecentPayments] = useState([])
  const [buildingStats, setBuildingStats] = useState([])

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('tba_current_user') || '{}')
    setCurrentUser(user)
    
    // Quick permission check
    if (user.role !== 'superadmin' && user.permissions && !user.permissions.includes('view_dashboard')) {
      navigate('/buildings') // redirect to something else
      return
    }
    
    loadDashboardData(user)

    const handler = () => loadDashboardData(user)
    window.addEventListener('storeUpdated', handler)
    return () => window.removeEventListener('storeUpdated', handler)
  }, [navigate])

  const { month: currentMonth, year: currentYear } = getCurrentMonthYear()
  const loadDashboardData = (user) => {

    let buildings = buildingStore.getAll()
    let tenants = tenantStore.getAll()
    let allBills = billStore.getAll()
    let allPayments = paymentStore.getAll()

    if (user && user.role === 'manager' && user.buildingId) {
      buildings = buildings.filter(b => b.id === user.buildingId)
      tenants = tenants.filter(t => t.buildingId === user.buildingId)
      allBills = allBills.filter(b => b.buildingId === user.buildingId)
      allPayments = allPayments.filter(p => {
        const bill = allBills.find(b => b.id === p.billId)
        return bill && bill.buildingId === user.buildingId
      })
    }

    // Filter to current month ONLY
    const bills = allBills.filter(b => b.month === currentMonth && Number(b.year) === currentYear)
    
    // For payments, since they are tied to bills or have their own date, 
    // we want payments that were MADE in the current month, or payments for the current month's bills.
    // The safest is to filter payments by their date for the dashboard.
    const payments = allPayments.filter(p => {
      const pDate = new Date(p.paymentDate)
      return pDate.getMonth() === new Date().getMonth() && pDate.getFullYear() === currentYear
    })

    const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0)
    const totalBilled = bills.reduce((sum, b) => sum + b.totalAmount, 0)
    const pendingBills = bills.filter(b => b.status === 'pending' || b.status === 'partial')
    const overdueBills = bills.filter(b => b.status === 'overdue')
    
    // For pending/overdue, we look at the specific bill's due minus paid
    const getBillDue = (b) => {
      const bPayments = allPayments.filter(p => p.billId === b.id)
      const paid = bPayments.reduce((sum, p) => sum + p.amount, 0)
      return Math.max(0, b.totalAmount - paid)
    }

    const totalPending = pendingBills.reduce((sum, b) => sum + getBillDue(b), 0)
    const totalOverdue = overdueBills.reduce((sum, b) => sum + getBillDue(b), 0)

    setStats({
      totalBuildings: buildings.length,
      totalTenants: tenants.filter(t => t.status === 'active').length,
      totalBills: bills.length,
      totalCollected,
      totalPending: totalPending + totalOverdue,
      totalOverdue,
      collectionRate: totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0
    })

    // Building-wise stats
    const bStats = buildings.map(building => {
      const bTenants = tenants.filter(t => t.buildingId === building.id && t.status === 'active')
      const bBills = bills.filter(b => b.buildingId === building.id)
      const bPayments = payments.filter(p => {
        const bill = bills.find(b => b.id === p.billId)
        return bill && bill.buildingId === building.id
      })
      const collected = bPayments.reduce((sum, p) => sum + p.amount, 0)
      const pending = bBills.filter(b => b.status !== 'paid').reduce((sum, b) => sum + b.totalAmount, 0)
      return {
        ...building,
        tenantCount: bTenants.length,
        collected,
        pending
      }
    })
    setBuildingStats(bStats)

    // Recent bills (sorted by date)
    const sortedBills = [...bills].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5)
    const enrichedBills = sortedBills.map(bill => {
      const tenant = tenants.find(t => t.id === bill.tenantId)
      const building = buildings.find(b => b.id === bill.buildingId)
      return { ...bill, tenantName: tenant?.name || 'Unknown', buildingName: building?.name || 'Unknown' }
    })
    setRecentBills(enrichedBills)

    // Recent payments
    const sortedPayments = [...payments].sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate)).slice(0, 5)
    const enrichedPayments = sortedPayments.map(payment => {
      const tenant = tenants.find(t => t.id === payment.tenantId)
      const bill = bills.find(b => b.id === payment.billId)
      const building = bill ? buildings.find(b => b.id === bill.buildingId) : null
      return { 
        ...payment, 
        tenantName: tenant?.name || 'Unknown', 
        buildingName: building?.name || 'Unknown',
        month: bill?.month || '',
        year: bill?.year || ''
      }
    })
    setRecentPayments(enrichedPayments)
  }

  return (
    <div className="dashboard animate-fade-in">
      <div className="page-header">
        <div>
          <h2 className="page-title">Dashboard</h2>
          <p className="page-subtitle">Overview for {currentMonth} {currentYear}</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card stat-emerald" onClick={() => navigate('/buildings')}>
          <div className="stat-icon">
            <Building2 size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.totalBuildings}</span>
            <span className="stat-label">Total Buildings</span>
          </div>
          <div className="stat-trend up">
            <ArrowUpRight size={14} />
          </div>
        </div>

        <div className="stat-card stat-blue" onClick={() => navigate('/tenants')}>
          <div className="stat-icon">
            <Users size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.totalTenants}</span>
            <span className="stat-label">Active Tenants</span>
          </div>
          <div className="stat-trend up">
            <ArrowUpRight size={14} />
          </div>
        </div>

        <div className="stat-card stat-purple" onClick={() => navigate('/billing')}>
          <div className="stat-icon">
            <Receipt size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{formatCurrency(stats.totalCollected)}</span>
            <span className="stat-label">Total Collected</span>
          </div>
          <div className="stat-trend up">
            <TrendingUp size={14} />
            <span>{stats.collectionRate}%</span>
          </div>
        </div>

        <div className="stat-card stat-amber" onClick={() => navigate('/payments')}>
          <div className="stat-icon">
            <CreditCard size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{formatCurrency(stats.totalPending)}</span>
            <span className="stat-label">Pending Amount</span>
          </div>
          <div className="stat-trend down">
            <TrendingDown size={14} />
          </div>
        </div>
      </div>

      {/* Building Overview */}
      <div className="section-header">
        <h3>Building Overview</h3>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/buildings')}>View All</button>
      </div>
      <div className="building-stats-grid">
        {buildingStats.map((building, index) => (
          <div key={building.id} className="building-stat-card animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
            <div className="building-stat-header">
              <Building2 size={20} />
              <h4>{building.name}</h4>
            </div>
            <p className="building-address">{building.address}</p>
            <div className="building-mini-stats">
              <div className="mini-stat">
                <Users size={14} />
                <span>{building.tenantCount} Tenants</span>
              </div>
              <div className="mini-stat collected">
                <CheckCircle2 size={14} />
                <span>{formatCurrency(building.collected)}</span>
              </div>
              <div className="mini-stat pending">
                <Clock size={14} />
                <span>{formatCurrency(building.pending)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="dashboard-grid">
        <div className="glass-card">
          <div className="card-header">
            <h3 className="card-title">
              <Receipt size={18} />
              Recent Bills
            </h3>
          </div>
          <div className="activity-list">
            {recentBills.length === 0 ? (
              <div className="empty-state-mini">No bills generated yet</div>
            ) : (
              recentBills.map(bill => (
                <div key={bill.id} className="activity-item" onClick={() => navigate(`/bill-preview/${bill.id}`)}>
                  <div className="activity-icon">
                    <Receipt size={16} />
                  </div>
                  <div className="activity-details">
                    <span className="activity-name">{bill.tenantName}</span>
                    <span className="activity-meta">{bill.buildingName} • {bill.month} {bill.year}</span>
                  </div>
                  <div className="activity-right">
                    <span className="activity-amount">{formatCurrency(bill.totalAmount)}</span>
                    <span className={`status-badge status-${bill.status}`}>{bill.status}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="glass-card">
          <div className="card-header">
            <h3 className="card-title">
              <CreditCard size={18} />
              Recent Payments
            </h3>
          </div>
          <div className="activity-list">
            {recentPayments.length === 0 ? (
              <div className="empty-state-mini">No payments recorded yet</div>
            ) : (
              recentPayments.map(payment => (
                <div key={payment.id} className="activity-item">
                  <div className="activity-icon success">
                    <CheckCircle2 size={16} />
                  </div>
                  <div className="activity-details">
                    <span className="activity-name">{payment.tenantName}</span>
                    <span className="activity-meta">{payment.buildingName} • {payment.method} • {payment.month} {payment.year}</span>
                  </div>
                  <div className="activity-right">
                    <span className="activity-amount success">{formatCurrency(payment.amount)}</span>
                    <span className="activity-date">{new Date(payment.paymentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
