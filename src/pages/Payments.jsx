import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  CreditCard, Plus, CheckCircle2, X, Building2, Receipt, DollarSign, Calendar, Eye, Printer
} from 'lucide-react'
import { paymentStore, billStore, tenantStore, buildingStore } from '../data/store'
import { formatCurrency, formatDate, getDynamicBillStatus } from '../data/helpers'

function Payments() {
  const navigate = useNavigate()
  const [payments, setPayments] = useState([])
  const [pendingBills, setPendingBills] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [filterBuilding, setFilterBuilding] = useState('all')
  const [buildings, setBuildings] = useState([])
  const [tenants, setTenants] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  
  // Modal filters
  const [modalBuilding, setModalBuilding] = useState('all')
  const [modalTenant, setModalTenant] = useState('all')

  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [lastPayment, setLastPayment] = useState(null)

  const [form, setForm] = useState({
    billId: '', paymentDate: new Date().toISOString().split('T')[0],
    breakdown: { cash: '', check: '', nagad: '', bkash: '' }, note: '', lateFeeDiscount: ''
  })

  const getTotalAmount = () => {
    return Object.values(form.breakdown).reduce((sum, val) => sum + (parseFloat(val) || 0), 0)
  }

  useEffect(() => {
    const init = () => {
      const user = JSON.parse(sessionStorage.getItem('tba_current_user') || '{}')
      setCurrentUser(user)
      if (user.role !== 'superadmin' && user.permissions && !user.permissions.includes('manage_payments')) {
        navigate('/')
        return
      }

      let allBuildings = buildingStore.getAll()
      if (user.role === 'manager' && user.buildingId) {
        allBuildings = allBuildings.filter(b => b.id === user.buildingId)
        setFilterBuilding(user.buildingId)
        setModalBuilding(user.buildingId)
      }
      setBuildings(allBuildings)
      setTenants(tenantStore.getAll())
      loadPayments(user)
      loadPendingBills(user)
    }
    init()

    const handleUpdate = () => {
      const user = JSON.parse(sessionStorage.getItem('tba_current_user') || '{}')
      loadPayments(user)
      loadPendingBills(user)
    }
    window.addEventListener('storeUpdated', handleUpdate)
    return () => window.removeEventListener('storeUpdated', handleUpdate)
  }, [navigate])

  const loadPayments = (user = currentUser) => {
    const allBills = billStore.getAll()
    const allTenants = tenantStore.getAll()
    const allBuildings = buildingStore.getAll()
    let allPayments = paymentStore.getAll()
    
    // Pre-filter payments for manager
    if (user && user.role === 'manager' && user.buildingId) {
      allPayments = allPayments.filter(p => {
        const tenant = allTenants.find(t => t.id === p.tenantId)
        return tenant && tenant.buildingId === user.buildingId
      })
    }
    
    const enriched = allPayments.map(p => {
      const tenant = allTenants.find(t => t.id === p.tenantId)
      const bill = allBills.find(b => b.id === p.billId)
      const building = bill ? allBuildings.find(b => b.id === bill.buildingId) : (tenant ? allBuildings.find(b => b.id === tenant.buildingId) : null)
      return {
        ...p,
        tenantName: tenant?.name || 'Unknown',
        tenantFlat: tenant?.flat || '',
        buildingName: building?.name || 'Unknown',
        buildingId: building?.id || '',
        billMonth: bill ? `${bill.month} ${bill.year}` : '',
        billAmount: bill?.totalAmount || 0
      }
    }).sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate))
    
    setPayments(enriched)
  }

  const loadPendingBills = (user = currentUser) => {
    let allBills = billStore.getAll()
    
    if (user && user.role === 'manager' && user.buildingId) {
      allBills = allBills.filter(b => b.buildingId === user.buildingId)
    }
    
    const allTenants = tenantStore.getAll()
    const allBuildings = buildingStore.getAll()
    const allPayments = paymentStore.getAll()
    const currentSettings = JSON.parse(localStorage.getItem('sb_app_settings') || '{}')
    const lateFeePct = currentSettings.lateFeePercentage || 5
    
    const pending = allBills
      .map(b => ({ ...b, dynamicStatus: getDynamicBillStatus(b) }))
      .filter(b => b.dynamicStatus === 'pending' || b.dynamicStatus === 'overdue' || b.dynamicStatus === 'partial')
      .map(b => {
        const tenant = allTenants.find(t => t.id === b.tenantId)
        const building = allBuildings.find(bl => bl.id === b.buildingId)
        const billPayments = allPayments.filter(p => p.billId === b.id)
        const totalPaid = billPayments.reduce((sum, p) => sum + p.amount, 0)
        
        const isOverdue = b.dynamicStatus === 'overdue'
        const lateFeeVal = isOverdue ? (b.totalAmount * lateFeePct) / 100 : 0
        const lateFeeDiscount = b.lateFeeDiscount || 0
        
        const dueAmount = Math.max(0, b.totalAmount + lateFeeVal - lateFeeDiscount - totalPaid)

        return {
          ...b,
          dueAmount,
          lateFeeVal,
          lateFeeDiscount,
          totalPaid,
          tenantName: tenant?.name || 'Unknown',
          tenantFlat: tenant?.flat || '',
          buildingName: building?.name || 'Unknown'
        }
      })
      .filter(b => b.dueAmount > 0)
    setPendingBills(pending)
  }

  const handleDelete = async (id, billId) => {
    if (confirm('Are you sure you want to delete this payment record?')) {
      await paymentStore.remove(id)
      
      const remainingPayments = paymentStore.getAll().filter(p => p.billId === billId)
      if (remainingPayments.length === 0) {
        await billStore.update(billId, { status: 'pending' })
      } else {
        await billStore.update(billId, { status: 'partial' })
      }
      
      window.dispatchEvent(new Event('billsUpdated'))
    }
  }

  const handlePayment = async (e) => {
    e.preventDefault()
    const bill = billStore.getById(form.billId)
    if (!bill) return

    const pendingBillData = pendingBills.find(b => b.id === form.billId)
    if (!pendingBillData) return

    const amt = getTotalAmount()
    const discountInput = parseFloat(form.lateFeeDiscount) || 0
    
    if (amt <= 0 && discountInput <= 0) return

    const newTotalDiscount = pendingBillData.lateFeeDiscount + discountInput
    if (newTotalDiscount > pendingBillData.lateFeeVal) {
      alert(`Total discount cannot exceed the late fee amount (৳${pendingBillData.lateFeeVal})`)
      return
    }

    const effectiveMaxDue = pendingBillData.dueAmount - discountInput
    if (amt > effectiveMaxDue) {
      alert(`Amount cannot exceed the due amount (৳${effectiveMaxDue})`)
      return
    }

    if (amt > 0) {
      const activeMethods = Object.entries(form.breakdown)
        .filter(([_, val]) => parseFloat(val) > 0)
        .map(([key]) => key)
      
      const displayMethod = activeMethods.length > 1 ? 'Multiple' : (activeMethods[0] || 'Unknown')

      const payment = {
        id: crypto.randomUUID(),
        billId: form.billId,
        tenantId: bill.tenantId,
        amount: amt,
        paymentDate: form.paymentDate,
        method: displayMethod,
        breakdown: form.breakdown,
        receivedBy: 'Admin',
        note: form.note
      }
      await paymentStore.add(payment)
      setLastPayment({ ...payment, tenantName: pendingBillData.tenantName })
    }
    
    // Wait briefly for cache to update, then check totals
    await new Promise(r => setTimeout(r, 400))
    const allPayments = paymentStore.getAll().filter(p => p.billId === bill.id)
    const totalPaid = allPayments.reduce((s, p) => s + p.amount, 0)
    
    const newStatus = (totalPaid >= (bill.totalAmount + pendingBillData.lateFeeVal - newTotalDiscount)) ? 'paid' : 'partial'
    
    await billStore.update(form.billId, { status: newStatus, lateFeeDiscount: newTotalDiscount })

    setShowModal(false)
    if (amt > 0) setShowSuccessModal(true)
    setForm({ billId: '', paymentDate: new Date().toISOString().split('T')[0], breakdown: { cash: '', check: '', nagad: '', bkash: '' }, note: '', lateFeeDiscount: '' })
    setModalBuilding('all')
    setModalTenant('all')
    loadPayments()
    loadPendingBills()
    
    window.dispatchEvent(new Event('billsUpdated'))
  }

  const selectBill = (billId) => {
    const bill = pendingBills.find(b => b.id === billId)
    if (bill) {
      setForm({ ...form, billId, amount: bill.dueAmount, lateFeeDiscount: '' })
    } else {
      setForm({ ...form, billId, amount: '', lateFeeDiscount: '' })
    }
  }

  const modalFilteredTenants = tenants.filter(t => modalBuilding === 'all' || t.buildingId === modalBuilding)
  const modalFilteredBills = pendingBills.filter(b => {
    const matchB = modalBuilding === 'all' || b.buildingId === modalBuilding
    const matchT = modalTenant === 'all' || b.tenantId === modalTenant
    return matchB && matchT
  })

  const filtered = payments.filter(p => 
    filterBuilding === 'all' || p.buildingId === filterBuilding
  )

  const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0)
  const todayPayments = payments.filter(p => p.paymentDate === new Date().toISOString().split('T')[0])
  const todayCollected = todayPayments.reduce((sum, p) => sum + p.amount, 0)

  return (
    <div className="page animate-fade-in">
      <div className="page-header">
        <div>
          <h2 className="page-title">Payments</h2>
          <p className="page-subtitle">Track bill collections</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)} disabled={pendingBills.length === 0}>
          <Plus size={18} />
          <span>Record Payment</span>
        </button>
      </div>

      {/* Payment Summary */}
      <div className="payment-summary-grid">
        <div className="payment-summary-card">
          <DollarSign size={22} />
          <div>
            <span className="summary-value">{formatCurrency(totalCollected)}</span>
            <span className="summary-label">Total Collected</span>
          </div>
        </div>
        <div className="payment-summary-card today">
          <Calendar size={22} />
          <div>
            <span className="summary-value">{formatCurrency(todayCollected)}</span>
            <span className="summary-label">Today's Collection</span>
          </div>
        </div>
        <div className="payment-summary-card pending-card">
          <Receipt size={22} />
          <div>
            <span className="summary-value">{pendingBills.length}</span>
            <span className="summary-label">Pending Bills</span>
          </div>
        </div>
      </div>

      <div className="filter-bar">
        <div className="filter-group">
          <Building2 size={16} />
          <select className="form-select filter-select" value={filterBuilding} onChange={e => setFilterBuilding(e.target.value)}>
            <option value="all">All Buildings</option>
            {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      </div>

      {/* Payments Table */}
      <div className="glass-card table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Tenant</th>
              <th>Building</th>
              <th>Bill Period</th>
              <th>Bill Amount</th>
              <th>Paid</th>
              <th>Method</th>
              <th>Receipt</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="7" className="empty-cell">
                  <div className="empty-state-mini">
                    <CreditCard size={32} />
                    <p>No payments recorded</p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map(payment => (
                <tr key={payment.id} className="animate-fade-in">
                  <td>{formatDate(payment.paymentDate)}</td>
                  <td>
                    <span className="table-primary-text">{payment.tenantName}</span>
                    <span className="table-sub-text">Flat {payment.tenantFlat}</span>
                  </td>
                  <td>{payment.buildingName}</td>
                  <td>{payment.billMonth}</td>
                  <td>{formatCurrency(payment.billAmount)}</td>
                  <td className="table-amount success">{formatCurrency(payment.amount)}</td>
                  <td>
                    <span className={`method-badge method-${payment.method?.toLowerCase()}`}>
                      {payment.method}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        className="btn-icon"
                        title="View Receipt"
                        onClick={() => navigate(`/payment-receipt/${payment.id}`)}
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        className="btn-icon"
                        title="Print Receipt"
                        onClick={() => window.open(`/payment-receipt/${payment.id}`, '_blank')}
                      >
                        <Printer size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Payment Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Record Payment</h3>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handlePayment}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Filter Building</label>
                    <select className="form-select" value={modalBuilding} onChange={e => {
                      setModalBuilding(e.target.value)
                      setModalTenant('all')
                      setForm({...form, billId: '', breakdown: { cash: '', card: '', nagad: '', bkash: '' }})
                    }}>
                      <option value="all">All Buildings</option>
                      {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Filter Tenant/Flat</label>
                    <select className="form-select" value={modalTenant} onChange={e => {
                      setModalTenant(e.target.value)
                      setForm({...form, billId: '', breakdown: { cash: '', card: '', nagad: '', bkash: '' }})
                    }}>
                      <option value="all">All Tenants</option>
                      {modalFilteredTenants.map(t => <option key={t.id} value={t.id}>{t.name} (Flat {t.flat})</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Select Pending Bill *</label>
                  <select className="form-select" value={form.billId} onChange={e => selectBill(e.target.value)} required>
                    <option value="">Choose a bill...</option>
                    {modalFilteredBills.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.tenantName} - {b.month} {b.year} - Due: {formatCurrency(b.dueAmount)}
                      </option>
                    ))}
                  </select>
                </div>
                {(() => {
                  const selectedBill = pendingBills.find(b => b.id === form.billId);
                  if (selectedBill && selectedBill.lateFeeVal > 0) {
                    const discountInput = parseFloat(form.lateFeeDiscount) || 0
                    const afterDiscount = Math.max(0, selectedBill.dueAmount - discountInput)
                    return (
                      <div style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.25)', padding: '14px', borderRadius: '10px', marginBottom: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-amber)', fontSize: '12.5px', fontWeight: 600, marginBottom: '10px' }}>
                          ⚠️ Overdue Bill — Late fee: {formatCurrency(selectedBill.lateFeeVal)}
                        </div>
                        <div className="form-group" style={{ marginBottom: '8px' }}>
                          <label className="form-label" style={{ fontSize: '11px' }}>Late Fee Discount (৳) — Max {formatCurrency(selectedBill.lateFeeVal)}</label>
                          <input 
                            className="form-input" 
                            type="number" 
                            min="0"
                            max={selectedBill.lateFeeVal}
                            step="0.01"
                            placeholder="0.00" 
                            value={form.lateFeeDiscount || ''} 
                            onChange={e => setForm({...form, lateFeeDiscount: e.target.value})} 
                          />
                        </div>
                        {discountInput > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '8px 10px', background: 'rgba(16,185,129,0.08)', borderRadius: '6px', border: '1px solid rgba(16,185,129,0.2)' }}>
                            <span style={{ color: '#94a3b8' }}>After Discount Payable:</span>
                            <span style={{ color: '#10b981', fontWeight: 700 }}>{formatCurrency(afterDiscount)}</span>
                          </div>
                        )}
                      </div>
                    )
                  }
                  return null;
                })()}
                <div className="form-group">
                  <label className="form-label" style={{ marginBottom: '10px' }}>Payment Breakdown</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: 'var(--bg-tertiary)', padding: '14px', borderRadius: '10px' }}>
                    {[['cash','💵 Cash'],['check','🏦 Check / Bank'],['nagad','📱 Nagad'],['bkash','📲 bKash']].map(([method, label]) => (
                      <div key={method} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label className="form-label" style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{label}</label>
                        <input 
                          className="form-input" 
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={form.breakdown[method]} 
                          onChange={e => setForm(prev => ({...prev, breakdown: {...prev.breakdown, [method]: e.target.value}}))} 
                        />
                      </div>
                    ))}
                  </div>
                  {getTotalAmount() > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', padding: '8px 12px', background: 'rgba(16,185,129,0.08)', borderRadius: '6px', border: '1px solid rgba(16,185,129,0.2)' }}>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>Total Payment:</span>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#10b981' }}>{formatCurrency(getTotalAmount())}</span>
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Date</label>
                  <input className="form-input" type="date" value={form.paymentDate} onChange={e => setForm({...form, paymentDate: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Note (Optional)</label>
                  <textarea className="form-textarea" value={form.note} onChange={e => setForm({...form, note: e.target.value})} placeholder="Any additional notes..." rows={3}></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">
                  <CheckCircle2 size={18} />
                  <span>Confirm Payment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUCCESS MODAL */}
      {showSuccessModal && lastPayment && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 9999 }}>
          <div className="modal-content animate-slide-up" style={{ maxWidth: '400px', textAlign: 'center' }}>
            <div style={{ padding: '20px 0' }}>
              <div style={{ width: '64px', height: '64px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <CheckCircle2 size={32} />
              </div>
              <h3 style={{ marginBottom: '10px' }}>Payment Successful!</h3>
              <p style={{ color: '#94a3b8', marginBottom: '5px' }}>
                Received <strong>৳{lastPayment.amount.toLocaleString()}</strong> from {lastPayment.tenantName}.
              </p>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
              {lastPayment.id && (
                <button 
                  className="btn btn-primary"
                  onClick={() => {
                    window.open(`/payment-receipt/${lastPayment.id}`, '_blank')
                    setShowSuccessModal(false)
                  }}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <Receipt size={18} />
                  <span>Print Receipt</span>
                </button>
              )}
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowSuccessModal(false)}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Payments
