import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart3, Building2, Users, Printer, Mail,
  TrendingUp, CheckCircle2, Clock, AlertTriangle, ArrowUpRight
} from 'lucide-react'
import { billStore, tenantStore, buildingStore, paymentStore, settingsStore } from '../data/store'
import { formatCurrency, formatDate, getCurrentMonthYear } from '../data/helpers'
import { sendBillEmail } from '../data/emailService'

const MONTHS = ['January','February','March','April','May','June',
                 'July','August','September','October','November','December']

function Reports() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('monthly')
  const [currentUser, setCurrentUser] = useState(null)
  
  const [buildings, setBuildings] = useState([])
  const [tenants, setTenants] = useState([])
  const [bills, setBills] = useState([])
  const [payments, setPayments] = useState([])
  const [settings, setSettings] = useState({})
  
  const { month: currentMonth, year: currentYear } = getCurrentMonthYear()
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [selectedBuilding, setSelectedBuilding] = useState('all')
  const [selectedTenant, setSelectedTenant] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  
  const [emailStatus, setEmailStatus] = useState({})

  const tabs = [
    { id: 'monthly', label: 'Monthly Summary', icon: BarChart3 },
    { id: 'building', label: 'Building Report', icon: Building2 },
    { id: 'tenant', label: 'Individual Tenant', icon: Users },
    { id: 'collection', label: 'Collection Report', icon: TrendingUp }
  ]

  useEffect(() => {
    const user = JSON.parse(sessionStorage.getItem('tba_current_user') || '{}')
    setCurrentUser(user)
    
    if (user.role !== 'superadmin' && user.permissions && !user.permissions.includes('view_reports')) {
      navigate('/')
      return
    }
    
    loadData(user)
    const handler = () => loadData(user)
    window.addEventListener('storeUpdated', handler)
    return () => window.removeEventListener('storeUpdated', handler)
  }, [navigate])

  const loadData = (user) => {
    let b = buildingStore.getAll()
    let t = tenantStore.getAll()
    let bls = billStore.getAll()
    let pms = paymentStore.getAll()

    if (user && user.role === 'manager' && user.buildingId) {
      b = b.filter(x => x.id === user.buildingId)
      t = t.filter(x => x.buildingId === user.buildingId)
      bls = bls.filter(x => x.buildingId === user.buildingId)
      pms = pms.filter(x => {
        const bill = bls.find(y => y.id === x.billId)
        return bill && bill.buildingId === user.buildingId
      })
    }
    
    setBuildings(b)
    setTenants(t)
    setBills(bls)
    setPayments(pms)
    setSettings(settingsStore.get() || {})
  }

  const handlePrint = () => {
    window.print()
  }

  const handleEmailBill = async (tenant, bill) => {
    const key = `${tenant.id}_${bill.id}`
    setEmailStatus(prev => ({ ...prev, [key]: 'sending' }))
    const bld = buildings.find(b => b.id === tenant.buildingId)
    const result = await sendBillEmail(tenant, bill, bld)
    
    if (result.success) {
      setEmailStatus(prev => ({ ...prev, [key]: 'sent' }))
      setTimeout(() => {
        setEmailStatus(prev => {
          const newState = { ...prev }
          delete newState[key]
          return newState
        })
      }, 3000)
    } else {
      setEmailStatus(prev => ({ ...prev, [key]: 'error' }))
      alert(`Failed to send email: ${result.error}`)
    }
  }

  const getFilteredBills = () => {
    let b = bills.filter(bl => bl.month === selectedMonth && Number(bl.year) === Number(selectedYear))
    if (selectedBuilding !== 'all') {
      b = b.filter(bl => bl.buildingId === selectedBuilding)
    }
    return b
  }

  const renderMonthlySummary = () => {
    const fBills = getFilteredBills()
    
    // For payments, match by bill ID since we are looking at this month's bills
    const fBillsIds = fBills.map(b => b.id)
    const fPayments = payments.filter(p => fBillsIds.includes(p.billId))
    
    const totalBilled = fBills.reduce((sum, b) => sum + b.totalAmount, 0)
    const totalCollected = fPayments.reduce((sum, p) => sum + p.amount, 0)
    
    const pendingBills = fBills.filter(b => b.status === 'pending' || b.status === 'partial')
    const totalPending = pendingBills.reduce((sum, b) => {
      const p = payments.filter(pm => pm.billId === b.id).reduce((s, pm) => s + pm.amount, 0)
      return sum + Math.max(0, b.totalAmount - p)
    }, 0)

    const collectionRate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0

    return (
      <div className="report-section animate-fade-in">
        <div className="filter-bar no-print">
          <div className="filter-group">
            <Building2 size={16} />
            <select className="form-select filter-select" value={selectedBuilding} onChange={e => setSelectedBuilding(e.target.value)}>
              <option value="all">All Buildings</option>
              {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <select className="form-select filter-select" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
              {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <select className="form-select filter-select" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        <div className="stats-grid" style={{ marginBottom: '24px' }}>
          <div className="stat-card stat-emerald">
            <div className="stat-icon"><BarChart3 size={24} /></div>
            <div className="stat-content">
              <span className="stat-value">{formatCurrency(totalBilled)}</span>
              <span className="stat-label">Total Billed</span>
            </div>
          </div>
          <div className="stat-card stat-blue">
            <div className="stat-icon"><CheckCircle2 size={24} /></div>
            <div className="stat-content">
              <span className="stat-value">{formatCurrency(totalCollected)}</span>
              <span className="stat-label">Total Collected</span>
            </div>
            <div className="stat-trend up"><ArrowUpRight size={14} /></div>
          </div>
          <div className="stat-card stat-amber">
            <div className="stat-icon"><Clock size={24} /></div>
            <div className="stat-content">
              <span className="stat-value">{formatCurrency(totalPending)}</span>
              <span className="stat-label">Total Pending</span>
            </div>
          </div>
          <div className="stat-card stat-purple">
            <div className="stat-icon"><TrendingUp size={24} /></div>
            <div className="stat-content">
              <span className="stat-value">{collectionRate}%</span>
              <span className="stat-label">Collection Rate</span>
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ marginBottom: '24px' }}>
          <div className="card-header">
            <h3 className="card-title">Building-wise Breakdown</h3>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Building Name</th>
                  <th>Billed Amount</th>
                  <th>Collected</th>
                  <th>Pending</th>
                  <th>Rate</th>
                </tr>
              </thead>
              <tbody>
                {buildings.filter(b => selectedBuilding === 'all' || b.id === selectedBuilding).map(b => {
                  const bBills = fBills.filter(bl => bl.buildingId === b.id)
                  const bPayments = fPayments.filter(pm => bBills.find(bl => bl.id === pm.billId))
                  const bTotal = bBills.reduce((s, bl) => s + bl.totalAmount, 0)
                  const bCol = bPayments.reduce((s, pm) => s + pm.amount, 0)
                  const bPend = Math.max(0, bTotal - bCol)
                  const bRate = bTotal > 0 ? Math.round((bCol/bTotal)*100) : 0
                  return (
                    <tr key={b.id}>
                      <td style={{ fontWeight: 500 }}>{b.name}</td>
                      <td>{formatCurrency(bTotal)}</td>
                      <td className="success">{formatCurrency(bCol)}</td>
                      <td className="warning">{formatCurrency(bPend)}</td>
                      <td>{bRate}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-card">
          <div className="card-header">
            <h3 className="card-title">Tenant-wise Detail</h3>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>Building & Flat</th>
                  <th>Bill Amount</th>
                  <th>Paid Amount</th>
                  <th>Due Amount</th>
                  <th>Status</th>
                  <th className="no-print">Action</th>
                </tr>
              </thead>
              <tbody>
                {fBills.length === 0 && (
                  <tr><td colSpan="7" style={{textAlign:'center', padding:'20px'}}>No bills found for this period.</td></tr>
                )}
                {fBills.map(bill => {
                  const t = tenants.find(x => x.id === bill.tenantId)
                  const b = buildings.find(x => x.id === bill.buildingId)
                  const paid = payments.filter(p => p.billId === bill.id).reduce((s, p) => s + p.amount, 0)
                  const due = Math.max(0, bill.totalAmount - paid)
                  return (
                    <tr key={bill.id}>
                      <td style={{ fontWeight: 500 }}>{t?.name}</td>
                      <td>{b?.name} • Flat {t?.flat}</td>
                      <td>{formatCurrency(bill.totalAmount)}</td>
                      <td className="success">{formatCurrency(paid)}</td>
                      <td className="error">{formatCurrency(due)}</td>
                      <td><span className={`status-badge status-${bill.status}`}>{bill.status}</span></td>
                      <td className="no-print" style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn-icon" title="View Bill" onClick={() => window.open(`/bill-preview/${bill.id}`, '_blank')}>
                          <Printer size={16} />
                        </button>
                        <button className="btn-icon" title="Email Bill" onClick={() => handleEmailBill(t, bill)} disabled={emailStatus[`${t?.id}_${bill.id}`] === 'sending'}>
                          {emailStatus[`${t?.id}_${bill.id}`] === 'sending' ? <Clock size={16} /> : 
                           emailStatus[`${t?.id}_${bill.id}`] === 'sent' ? <CheckCircle2 size={16} color="var(--color-success)" /> : 
                           <Mail size={16} />}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  const renderBuildingReport = () => {
    const selBuilding = selectedBuilding === 'all' ? buildings[0]?.id : selectedBuilding
    const bld = buildings.find(b => b.id === selBuilding)
    
    if (!bld) return <div className="empty-state">No building found.</div>
    
    const bTenants = tenants.filter(t => t.buildingId === bld.id && t.status === 'active')
    
    // Past 6 months performance
    const pastMonths = []
    let tempMonth = MONTHS.indexOf(currentMonth)
    let tempYear = currentYear
    for (let i=0; i<6; i++) {
      pastMonths.push({ month: MONTHS[tempMonth], year: tempYear })
      tempMonth--
      if (tempMonth < 0) { tempMonth = 11; tempYear-- }
    }
    
    return (
      <div className="report-section animate-fade-in">
        <div className="filter-bar no-print">
          <div className="filter-group">
            <Building2 size={16} />
            <select className="form-select filter-select" value={selBuilding} onChange={e => setSelectedBuilding(e.target.value)}>
              {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        </div>

        <div className="glass-card" style={{ marginBottom: '24px' }}>
          <div className="card-header">
            <h3 className="card-title">{bld.name} Summary</h3>
          </div>
          <div style={{ padding: '0 24px 24px' }}>
            <p style={{ margin: '0 0 16px', color: 'var(--text-muted)' }}>{bld.address}</p>
            <div style={{ display: 'flex', gap: '32px' }}>
              <div><strong style={{ display: 'block', fontSize: '20px' }}>{bld.totalFlats}</strong><span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total Flats</span></div>
              <div><strong style={{ display: 'block', fontSize: '20px', color: 'var(--color-emerald)' }}>{bTenants.length}</strong><span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Active Tenants</span></div>
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ marginBottom: '24px' }}>
          <div className="card-header">
            <h3 className="card-title">6-Month Collection History</h3>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Billed</th>
                  <th>Collected</th>
                  <th>Pending</th>
                  <th>Rate</th>
                </tr>
              </thead>
              <tbody>
                {pastMonths.map((pm, idx) => {
                  const mBills = bills.filter(b => b.buildingId === bld.id && b.month === pm.month && b.year === pm.year)
                  const mPayments = payments.filter(p => mBills.find(b => b.id === p.billId))
                  const mBilled = mBills.reduce((s, b) => s + b.totalAmount, 0)
                  const mCollected = mPayments.reduce((s, p) => s + p.amount, 0)
                  const mPending = Math.max(0, mBilled - mCollected)
                  const rate = mBilled > 0 ? Math.round((mCollected/mBilled)*100) : 0
                  return (
                    <tr key={idx}>
                      <td style={{ fontWeight: 500 }}>{pm.month} {pm.year}</td>
                      <td>{formatCurrency(mBilled)}</td>
                      <td className="success">{formatCurrency(mCollected)}</td>
                      <td className="warning">{formatCurrency(mPending)}</td>
                      <td>{rate}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  const renderTenantReport = () => {
    const selBuilding = selectedBuilding === 'all' ? buildings[0]?.id : selectedBuilding
    const bTenants = tenants.filter(t => t.buildingId === selBuilding)
    const activeTenantId = selectedTenant || (bTenants.length > 0 ? bTenants[0].id : '')
    const t = bTenants.find(x => x.id === activeTenantId)

    return (
      <div className="report-section animate-fade-in">
        <div className="filter-bar no-print">
          <div className="filter-group">
            <Building2 size={16} />
            <select className="form-select filter-select" value={selBuilding} onChange={e => { setSelectedBuilding(e.target.value); setSelectedTenant('') }}>
              {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <Users size={16} />
            <select className="form-select filter-select" value={activeTenantId} onChange={e => setSelectedTenant(e.target.value)}>
              {bTenants.map(tn => <option key={tn.id} value={tn.id}>{tn.name} - Flat {tn.flat}</option>)}
            </select>
          </div>
        </div>

        {!t ? (
          <div className="empty-state">Select a tenant to view report.</div>
        ) : (
          <>
            <div className="glass-card" style={{ marginBottom: '24px' }}>
              <div className="card-header">
                <h3 className="card-title">{t.name} (Flat {t.flat})</h3>
                <button className="btn btn-secondary btn-sm no-print" onClick={() => navigate(`/tenant-report/${t.id}`)}>
                  Full Ledger
                </button>
              </div>
              <div style={{ padding: '0 24px 24px', display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
                <div><span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Phone</span><br/><strong>{t.phone}</strong></div>
                <div><span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Email</span><br/><strong>{t.email || 'N/A'}</strong></div>
                <div><span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Base Rent</span><br/><strong style={{ color: 'var(--color-emerald)' }}>{formatCurrency(t.monthlyRent)}</strong></div>
              </div>
            </div>

            <div className="glass-card">
              <div className="card-header">
                <h3 className="card-title">Recent Bills (Last 12 Months)</h3>
              </div>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Billed Amount</th>
                      <th>Paid Amount</th>
                      <th>Due</th>
                      <th>Status</th>
                      <th className="no-print">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bills.filter(b => b.tenantId === t.id).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 12).map(bill => {
                      const paid = payments.filter(p => p.billId === bill.id).reduce((s, p) => s + p.amount, 0)
                      const due = Math.max(0, bill.totalAmount - paid)
                      return (
                        <tr key={bill.id}>
                          <td style={{ fontWeight: 500 }}>{bill.month} {bill.year}</td>
                          <td>{formatCurrency(bill.totalAmount)}</td>
                          <td className="success">{formatCurrency(paid)}</td>
                          <td className="error">{formatCurrency(due)}</td>
                          <td><span className={`status-badge status-${bill.status}`}>{bill.status}</span></td>
                          <td className="no-print" style={{ display: 'flex', gap: '8px' }}>
                            <button className="btn-icon" title="View Bill" onClick={() => window.open(`/bill-preview/${bill.id}`, '_blank')}>
                              <Printer size={16} />
                            </button>
                            <button className="btn-icon" title="Email Bill" onClick={() => handleEmailBill(t, bill)} disabled={emailStatus[`${t.id}_${bill.id}`] === 'sending'}>
                              {emailStatus[`${t.id}_${bill.id}`] === 'sending' ? <Clock size={16} /> : 
                               emailStatus[`${t.id}_${bill.id}`] === 'sent' ? <CheckCircle2 size={16} color="var(--color-success)" /> : 
                               <Mail size={16} />}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  const renderCollectionReport = () => {
    // Filter payments
    let fPayments = payments
    if (dateFrom) {
      fPayments = fPayments.filter(p => new Date(p.paymentDate) >= new Date(dateFrom))
    }
    if (dateTo) {
      fPayments = fPayments.filter(p => new Date(p.paymentDate) <= new Date(dateTo))
    }
    // If no date range, default to current month
    if (!dateFrom && !dateTo) {
      fPayments = fPayments.filter(p => {
        const d = new Date(p.paymentDate)
        return d.getMonth() === MONTHS.indexOf(selectedMonth) && d.getFullYear() === selectedYear
      })
    }

    if (selectedBuilding !== 'all') {
      const bBillsIds = bills.filter(b => b.buildingId === selectedBuilding).map(b => b.id)
      fPayments = fPayments.filter(p => bBillsIds.includes(p.billId))
    }

    const methodTotals = { cash: 0, card: 0, bkash: 0, nagad: 0, other: 0 }
    let totalCol = 0
    fPayments.forEach(p => {
      totalCol += p.amount
      if (p.methodBreakdown) {
        Object.keys(p.methodBreakdown).forEach(k => {
          methodTotals[k] = (methodTotals[k] || 0) + (p.methodBreakdown[k] || 0)
        })
      } else {
        const m = (p.method || 'cash').toLowerCase()
        methodTotals[m] = (methodTotals[m] || 0) + p.amount
      }
    })

    return (
      <div className="report-section animate-fade-in">
        <div className="filter-bar no-print">
          <div className="filter-group">
            <Building2 size={16} />
            <select className="form-select filter-select" value={selectedBuilding} onChange={e => setSelectedBuilding(e.target.value)}>
              <option value="all">All Buildings</option>
              {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>From</span>
            <input type="date" className="form-input filter-select" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div className="filter-group">
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>To</span>
            <input type="date" className="form-input filter-select" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
          {!dateFrom && !dateTo && (
            <>
              <div className="filter-group">
                <select className="form-select filter-select" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
                  {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="filter-group">
                <select className="form-select filter-select" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
                  {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </>
          )}
        </div>

        <div className="stats-grid" style={{ marginBottom: '24px' }}>
          <div className="stat-card stat-emerald">
            <div className="stat-content">
              <span className="stat-value">{formatCurrency(methodTotals.cash)}</span>
              <span className="stat-label">Cash Collected</span>
            </div>
          </div>
          <div className="stat-card stat-blue">
            <div className="stat-content">
              <span className="stat-value">{formatCurrency(methodTotals.bkash)}</span>
              <span className="stat-label">bKash Collected</span>
            </div>
          </div>
          <div className="stat-card stat-amber">
            <div className="stat-content">
              <span className="stat-value">{formatCurrency(methodTotals.nagad)}</span>
              <span className="stat-label">Nagad Collected</span>
            </div>
          </div>
          <div className="stat-card stat-purple">
            <div className="stat-content">
              <span className="stat-value">{formatCurrency(methodTotals.card + methodTotals.other)}</span>
              <span className="stat-label">Card / Bank</span>
            </div>
          </div>
        </div>

        <div className="glass-card">
          <div className="card-header">
            <h3 className="card-title">Detailed Collection ({formatCurrency(totalCol)})</h3>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Tenant</th>
                  <th>Building</th>
                  <th>Method</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {fPayments.length === 0 && (
                  <tr><td colSpan="5" style={{textAlign:'center', padding:'20px'}}>No payments found for this period.</td></tr>
                )}
                {fPayments.sort((a,b) => new Date(b.paymentDate) - new Date(a.paymentDate)).map(p => {
                  const t = tenants.find(x => x.id === p.tenantId)
                  const bill = bills.find(x => x.id === p.billId)
                  const bld = bill ? buildings.find(x => x.id === bill.buildingId) : null
                  let mString = p.method
                  if (p.methodBreakdown) {
                    mString = Object.entries(p.methodBreakdown).filter(([_,v])=>v>0).map(([k,v]) => `${k} (${formatCurrency(v)})`).join(', ')
                  }
                  return (
                    <tr key={p.id}>
                      <td>{formatDate(p.paymentDate)}</td>
                      <td style={{ fontWeight: 500 }}>{t?.name}</td>
                      <td>{bld?.name}</td>
                      <td style={{ textTransform: 'capitalize' }}>{mString}</td>
                      <td className="success" style={{ fontWeight: 600 }}>{formatCurrency(p.amount)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page animate-fade-in reports-page">
      <div className="page-header no-print">
        <div>
          <h2 className="page-title">Reports</h2>
          <p className="page-subtitle">Professional analytics & financial reports</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={handlePrint}>
            <Printer size={18} /><span>Print / Save PDF</span>
          </button>
        </div>
      </div>

      <div className="report-tabs no-print">
        {tabs.map(tab => (
          <button key={tab.id} className={`report-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}>
            <tab.icon size={18} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="report-content">
        {activeTab === 'monthly' && renderMonthlySummary()}
        {activeTab === 'building' && renderBuildingReport()}
        {activeTab === 'tenant' && renderTenantReport()}
        {activeTab === 'collection' && renderCollectionReport()}
      </div>
    </div>
  )
}

export default Reports
