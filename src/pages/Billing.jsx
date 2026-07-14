import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Receipt, Plus, Eye, Filter, Building2,
  Zap, Droplets, CheckCircle2, Clock, AlertTriangle,
  X, FileText, Info, ChevronDown, ChevronUp, Edit3, Trash2, Mail
} from 'lucide-react'
import { billStore, tenantStore, buildingStore, meterReadingStore, settingsStore, paymentStore, userStore } from '../data/store'
import { formatCurrency, getCurrentMonthYear, calculateBillTotal, getDynamicBillStatus } from '../data/helpers'
import { sendBillEmail } from '../data/emailService'

/* ─── Electricity calculation helper ─────────────────────────────────────── */
function calcElectricity(tenant, currentReading, prevReading) {
  const cfg = settingsStore.get() || {}
  const units = Math.max(0, currentReading - prevReading)
  const unitCost = units * (tenant.electricityRate || 0)
  const globalDemandRate = cfg.electricityDemandRate ?? 90
  const demandCharge = (tenant.sectionLoad || 0) * globalDemandRate
  const subTotal = unitCost + demandCharge
  const vatRate = (cfg.electricityVatRate ?? 5) / 100
  const vat = subTotal * vatRate
  return { units, unitCost, demandCharge, subTotal, vat, vatRate: cfg.electricityVatRate ?? 5, total: subTotal + vat }
}

/* ─── Water calculation helper ────────────────────────────────────────────── */
function calcWater(tenant, currentReading, prevReading) {
  const cfg = settingsStore.get() || {}
  const units = Math.max(0, currentReading - prevReading)
  const waterCharge = units * (tenant.waterRate || 0)
  const sewerageCharge = waterCharge   // sewerage = same as water
  const subTotal = waterCharge + sewerageCharge
  const vatRate = (cfg.waterVatRate ?? 15) / 100
  const vat = subTotal * vatRate
  return { units, waterCharge, sewerageCharge, subTotal, vat, vatRate: cfg.waterVatRate ?? 15, total: subTotal + vat }
}

const MONTHS = ['January','February','March','April','May','June',
                 'July','August','September','October','November','December']

function Billing() {
  const navigate = useNavigate()
  const [bills, setBills] = useState([])
  const [buildings, setBuildings] = useState([])
  const [tenants, setTenants] = useState([])
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [filterBuilding, setFilterBuilding] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const { month: currentMonth, year: currentYear } = getCurrentMonthYear()
  const [filterMonth, setFilterMonth] = useState(currentMonth)
  const [filterYear, setFilterYear] = useState(currentYear)
  const [currentUser, setCurrentUser] = useState(null)

  // Generate modal state
  const [genStep, setGenStep] = useState(1)  // step 1: select building/month  step 2: enter readings
  const [genBase, setGenBase] = useState({
    buildingId: '', tenantId: 'all', month: currentMonth, year: currentYear,
    gas: '', serviceCharge: '', otherCharges: '', billType: 'both',
    dueDate: `${currentYear}-${String(MONTHS.indexOf(currentMonth) + 1).padStart(2,'0')}-10`
  })
  // Per-tenant meter readings during generation
  const [meterInputs, setMeterInputs] = useState({})  // { [tenantId]: { elec: '', water: '' } }
  const [calcPreview, setCalcPreview] = useState({})  // live calculation preview

  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [generatedBillsList, setGeneratedBillsList] = useState([])
  const [emailStatus, setEmailStatus] = useState({})

  const [settings, setSettings] = useState({})
  
  // Delete Auth State
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authPassword, setAuthPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('tba_current_user') || '{}')
    setCurrentUser(user)
    if (user.role !== 'superadmin' && user.permissions && !user.permissions.includes('manage_billing')) {
      navigate('/')
      return
    }

    setSettings(settingsStore.get() || {})

    let allBuildings = buildingStore.getAll()
    if (user.role === 'manager' && user.buildingId) {
      allBuildings = allBuildings.filter(b => b.id === user.buildingId)
      setFilterBuilding(user.buildingId)
      setGenBase(prev => ({ ...prev, buildingId: user.buildingId }))
    }
    setBuildings(allBuildings)
    setTenants(tenantStore.getAll())
    loadBills(user)
    
    // Listen for payments to update bill statuses dynamically
    const handleUpdate = () => {
      loadBills(JSON.parse(localStorage.getItem('tba_current_user') || '{}'))
      setSettings(settingsStore.get() || {})
    }
    window.addEventListener('billsUpdated', handleUpdate)
    window.addEventListener('storeUpdated', handleUpdate)
    return () => {
      window.removeEventListener('billsUpdated', handleUpdate)
      window.removeEventListener('storeUpdated', handleUpdate)
    }
  }, [])

  const loadBills = (user = currentUser) => {
    let allTenants = tenantStore.getAll()
    if (user && user.role === 'manager' && user.buildingId) {
      allTenants = allTenants.filter(t => t.buildingId === user.buildingId)
    }
    setTenants(allTenants)

    let allBills = billStore.getAll()
    if (user && user.role === 'manager' && user.buildingId) {
      allBills = allBills.filter(b => b.buildingId === user.buildingId)
    }
    
    const allBuildings = buildingStore.getAll()
    const allPayments = paymentStore.getAll()
    const currentSettings = JSON.parse(localStorage.getItem('sb_app_settings') || '{}')
    const lateFeePct = currentSettings.lateFeePercentage || 5
    
    const enriched = allBills.map(b => {
      const dynamicStatus = getDynamicBillStatus(b)
      const billPayments = allPayments.filter(p => p.billId === b.id)
      const totalPaid = billPayments.reduce((sum, p) => sum + p.amount, 0)
      
      const isOverdue = dynamicStatus === 'overdue'
      const lateFeeVal = isOverdue ? (b.totalAmount * lateFeePct) / 100 : 0
      const lateFeeDiscount = b.lateFeeDiscount || 0
      
      const dueAmount = Math.max(0, b.totalAmount + lateFeeVal - lateFeeDiscount - totalPaid)
      
      return {
        ...b,
        status: dynamicStatus, // Override status for UI display
        dueAmount,
        totalPaid,
        lateFeeVal,
        lateFeeDiscount,
        tenantName: allTenants.find(t => t.id === b.tenantId)?.name || 'Unknown',
        tenantFlat: allTenants.find(t => t.id === b.tenantId)?.flat || '',
        buildingName: allBuildings.find(bl => bl.id === b.buildingId)?.name || 'Unknown'
      }
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    setBills(enriched)
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
      await billStore.remove(deletingId)
      setShowAuthModal(false)
      setDeletingId(null)
      loadBills()
    } else {
      setAuthError('Incorrect password')
    }
  }

  const handleEmailBill = async (bill) => {
    const key = bill.id
    setEmailStatus(prev => ({ ...prev, [key]: 'sending' }))
    const t = tenants.find(x => x.id === bill.tenantId)
    const bld = buildings.find(b => b.id === bill.buildingId)
    const result = await sendBillEmail(t, bill, bld)
    
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

  /* ── Filtering ─────────────────────────────────────────────────────────── */
  const baseFiltered = bills.filter(b => {
    const matchBuilding = filterBuilding === 'all' || b.buildingId === filterBuilding
    const matchMonth = filterMonth === 'all' || b.month === filterMonth
    const matchYear = filterYear === 'all' || String(b.year) === String(filterYear)
    return matchBuilding && matchMonth && matchYear
  })

  const filtered = baseFiltered.filter(b => filterStatus === 'all' || b.status === filterStatus)

  const statusCounts = {
    all: baseFiltered.length,
    paid: baseFiltered.filter(b => b.status === 'paid').length,
    partial: baseFiltered.filter(b => b.status === 'partial').length,
    pending: baseFiltered.filter(b => b.status === 'pending').length,
    overdue: baseFiltered.filter(b => b.status === 'overdue').length,
  }

  /* ── Tenants for selected building ─────────────────────────────────────── */
  const buildingTenants = genBase.buildingId
    ? tenants.filter(t => t.buildingId === genBase.buildingId && t.status === 'active'
        && (!t.electricityStartDate || new Date(t.electricityStartDate) <= new Date()))
    : []

  const targetTenants = genBase.tenantId === 'all'
    ? buildingTenants
    : buildingTenants.filter(t => t.id === genBase.tenantId)

  /* ── Step 1 → Step 2: prepare meter input rows ─────────────────────────── */
  const goToStep2 = () => {
    if (!genBase.buildingId) return
    const inputs = {}
    targetTenants.forEach(t => {
      // Find previous reading or use startUnit
      const prevReading = meterReadingStore.getPreviousReading(t.id, genBase.month, Number(genBase.year))
      const prevElec = prevReading?.electricityCurrentReading ?? t.electricityStartUnit ?? 0
      const prevWater = prevReading?.waterCurrentReading ?? t.waterStartUnit ?? 0
      inputs[t.id] = { elec: '', water: '', prevElec, prevWater }
    })
    setMeterInputs(inputs)
    setCalcPreview({})
    setGenStep(2)
  }

  /* ── Live preview when reading is entered ──────────────────────────────── */
  const handleReadingChange = (tenantId, field, value) => {
    const tenant = tenants.find(t => t.id === tenantId)
    const updated = { ...meterInputs, [tenantId]: { ...meterInputs[tenantId], [field]: value } }
    setMeterInputs(updated)

    const inp = updated[tenantId]
    const billType = genBase.billType
    const elecCurrent = billType !== 'water' ? (parseFloat(inp.elec) || 0) : 0
    const waterCurrent = billType !== 'electricity' ? (parseFloat(inp.water) || 0) : 0
    const elecCalc = calcElectricity(tenant, elecCurrent, inp.prevElec)
    const waterCalc = calcWater(tenant, waterCurrent, inp.prevWater)
    const gas = parseFloat(genBase.gas) || 0
    const svc = parseFloat(genBase.serviceCharge) || 0
    const other = parseFloat(genBase.otherCharges) || 0
    const billItems = settingsStore.get()?.billItems || ['rent', 'electricity', 'water', 'gas', 'serviceCharge', 'otherCharges']
    const rentEnabled = billItems.includes('rent')
    const total = (rentEnabled ? tenant.monthlyRent : 0)
      + (billType !== 'water' ? elecCalc.total : 0)
      + (billType !== 'electricity' ? waterCalc.total : 0)
      + gas + svc + other

    setCalcPreview(prev => ({
      ...prev,
      [tenantId]: { elecCalc, waterCalc, total }
    }))
  }

  /* ── Final bill generation ──────────────────────────────────────────────── */
  const handleGenerateBills = async () => {
    let skippedCount = 0
    const attemptedTenants = []  // tenants we tried to generate for

    const promises = targetTenants.map(async tenant => {
      // Check Supabase directly — safe for multi-PC use
      const alreadyExists = await billStore.checkExists(tenant.id, genBase.month, Number(genBase.year))
      if (alreadyExists) {
        skippedCount++
        return
      }

      const inp = meterInputs[tenant.id] || {}
      const billType = genBase.billType
      const includeElec = billType !== 'water'
      const includeWater = billType !== 'electricity'

      const elecCurrent = includeElec ? (parseFloat(inp.elec) >= 0 ? parseFloat(inp.elec) : 0) : 0
      const waterCurrent = includeWater ? (parseFloat(inp.water) >= 0 ? parseFloat(inp.water) : 0) : 0
      const prevElec = parseFloat(inp.prevElec ?? tenant.electricityStartUnit ?? 0)
      const prevWater = parseFloat(inp.prevWater ?? tenant.waterStartUnit ?? 0)
      const elecCalc = includeElec
        ? calcElectricity(tenant, elecCurrent, prevElec)
        : { units: 0, unitCost: 0, demandCharge: 0, subTotal: 0, vat: 0, total: 0 }
      const waterCalc = includeWater
        ? calcWater(tenant, waterCurrent, prevWater)
        : { units: 0, subTotal: 0, vat: 0, total: 0 }
      const gas = parseFloat(genBase.gas) || 0
      const svc = parseFloat(genBase.serviceCharge) || 0
      const other = parseFloat(genBase.otherCharges) || 0
      const billItemsCfg = settingsStore.get()?.billItems || ['rent', 'electricity', 'water', 'gas', 'serviceCharge', 'otherCharges']
      const rentEnabled = billItemsCfg.includes('rent')

      const bill = {
        id: crypto.randomUUID(),
        tenantId: tenant.id,
        buildingId: genBase.buildingId,
        month: genBase.month,
        year: Number(genBase.year),
        billType: genBase.billType,
        rent: rentEnabled ? tenant.monthlyRent : 0,
        electricityUnits: includeElec ? elecCalc.units : 0,
        electricityUnitCost: includeElec ? elecCalc.unitCost : 0,
        electricityDemandCharge: includeElec ? elecCalc.demandCharge : 0,
        electricityVat: includeElec ? Math.round(elecCalc.vat) : 0,
        electricity: includeElec ? Math.round(elecCalc.total) : 0,
        electricityCurrentReading: includeElec ? elecCurrent : null,
        electricityPreviousReading: includeElec ? prevElec : null,
        waterUnits: includeWater ? waterCalc.units : 0,
        waterUnitCost: includeWater ? waterCalc.subTotal : 0,
        waterVat: includeWater ? Math.round(waterCalc.vat) : 0,
        water: includeWater ? Math.round(waterCalc.total) : 0,
        waterCurrentReading: includeWater ? waterCurrent : null,
        waterPreviousReading: includeWater ? prevWater : null,
        gas, serviceCharge: svc, otherCharges: other,
        dueDate: genBase.dueDate,
        status: 'pending'
      }
      bill.totalAmount = bill.rent + bill.electricity + bill.water + gas + svc + other

      attemptedTenants.push(tenant)
      await billStore.add(bill)
      
      // Auto open the bill preview
      window.open(`/bill-preview/${bill.id}`, '_blank')

      // Save meter reading record
      await meterReadingStore.add({
        tenantId: tenant.id,
        buildingId: genBase.buildingId,
        month: genBase.month,
        year: Number(genBase.year),
        electricityCurrentReading: elecCurrent,
        electricityPreviousReading: prevElec,
        electricityUnits: elecCalc.units,
        waterCurrentReading: waterCurrent,
        waterPreviousReading: prevWater,
        waterUnits: waterCalc.units
      })
    })

    await Promise.all(promises)

    setShowGenerateModal(false)
    setGenStep(1)
    setMeterInputs({})
    setCalcPreview({})

    if (attemptedTenants.length === 0 && skippedCount > 0) {
      alert(`Bills already exist for all ${skippedCount} tenant(s) for ${genBase.month} ${genBase.year}. Please choose a different month/year.`)
      return
    }

    // Wait for Supabase writes to propagate, then reload
    await new Promise(r => setTimeout(r, 600))
    loadBills()
  }

  const resetModal = () => {
    setShowGenerateModal(false)
    setGenStep(1)
    setMeterInputs({})
    setCalcPreview({})
  }

  return (
    <div className="page animate-fade-in">
      <div className="page-header">
        <div>
          <h2 className="page-title">Billing</h2>
          <p className="page-subtitle">Meter-based bill generation</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setGenStep(1); setShowGenerateModal(true) }}>
          <Plus size={18} /><span>Generate Bills</span>
        </button>
      </div>

      {/* Status Tabs */}
      <div className="status-tabs">
        {['all','paid','partial','pending','overdue'].map(s => (
          <button
            key={s}
            className={`status-tab ${filterStatus === s ? 'active' : ''} ${s}`}
            onClick={() => setFilterStatus(s)}
          >
            {s === 'paid' && <CheckCircle2 size={14} />}
            {s === 'partial' && <Clock size={14} />}
            {s === 'pending' && <Clock size={14} />}
            {s === 'overdue' && <AlertTriangle size={14} />}
            <span>{s.charAt(0).toUpperCase() + s.slice(1)}</span>
            <span className="tab-count">{statusCounts[s]}</span>
          </button>
        ))}
      </div>

      <div className="filter-bar">
        <div className="filter-group">
          <Building2 size={16} />
          <select className="form-select filter-select" value={filterBuilding}
            onChange={e => setFilterBuilding(e.target.value)}>
            <option value="all">All Buildings</option>
            {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <Clock size={16} />
          <select className="form-select filter-select" value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}>
            <option value="all">All Months</option>
            {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <select className="form-select filter-select" value={filterYear}
            onChange={e => setFilterYear(e.target.value)}>
            <option value="all">All Years</option>
            {Array.from({length: 5}, (_, i) => currentYear - 2 + i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Bills Table */}
      <div className="glass-card table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Tenant</th><th>Building</th><th>Flat</th>
              <th>Month</th><th>Amount</th><th>Status</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="7" className="empty-cell">
                <div className="empty-state-mini"><Receipt size={32}/><p>No bills found</p></div>
              </td></tr>
            ) : filtered.map(bill => (
              <tr key={bill.id} className="animate-fade-in">
                <td><span className="table-primary-text">{bill.tenantName}</span></td>
                <td>{bill.buildingName}</td>
                <td>{bill.tenantFlat}</td>
                <td>{bill.month} {bill.year}</td>
                <td className="table-amount">{formatCurrency(bill.totalAmount)}</td>
                <td><span className={`status-badge status-${bill.status}`}>{bill.status}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-icon" title="View Bill"
                      onClick={() => navigate(`/bill-preview/${bill.id}`)}>
                      <Eye size={16}/>
                    </button>
                    <button className="btn-icon" title="Edit Bill"
                      onClick={() => navigate(`/bill-preview/${bill.id}?edit=true`)}>
                      <Edit3 size={16}/>
                    </button>
                    {(currentUser?.role === 'superadmin' || (settings.allowedDeleteRoles || []).includes(currentUser?.role)) && (
                      <button className="btn-icon danger" title="Delete Bill"
                        onClick={() => handleDelete(bill.id)}>
                        <Trash2 size={16}/>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ═══ GENERATE MODAL ═══ */}
      {showGenerateModal && (
        <div className="modal-overlay" onClick={resetModal}>
          <div className="modal modal-xl animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <h3>Generate Bills</h3>
                <div className="step-indicator">
                  <span className={`step-dot ${genStep >= 1 ? 'active' : ''}`}>1</span>
                  <span className="step-line"></span>
                  <span className={`step-dot ${genStep >= 2 ? 'active' : ''}`}>2</span>
                </div>
              </div>
              <button className="btn-icon" onClick={resetModal}><X size={20}/></button>
            </div>

            {/* ── STEP 1: Configure ─────────────────────────────────────── */}
            {genStep === 1 && (
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Building *</label>
                    <select className="form-select"
                      value={genBase.buildingId}
                      onChange={e => setGenBase({...genBase, buildingId: e.target.value, tenantId: 'all'})}
                      required>
                      <option value="">Select Building</option>
                      {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tenant</label>
                    <select className="form-select" value={genBase.tenantId}
                      onChange={e => setGenBase({...genBase, tenantId: e.target.value})}>
                      <option value="all">All Active Tenants</option>
                      {buildingTenants.map(t => (
                        <option key={t.id} value={t.id}>{t.name} (Flat {t.flat})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Month *</label>
                    <select className="form-select" value={genBase.month}
                      onChange={e => setGenBase({...genBase, month: e.target.value})}>
                      {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Year *</label>
                    <input className="form-input" type="number"
                      value={genBase.year}
                      onChange={e => setGenBase({...genBase, year: e.target.value})}
                      min="2024" max="2030"/>
                  </div>
                </div>

                {/* ── Bill Type Selector ── */}
                <div className="form-group">
                  <label className="form-label">Bill Type *</label>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                    {[
                      { value: 'both', label: '⚡ Electricity + 💧 Washa' },
                      { value: 'electricity', label: '⚡ Electricity Only' },
                      { value: 'water', label: '💧 Washa Only' },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setGenBase({...genBase, billType: opt.value})}
                        style={{
                          flex: 1,
                          padding: '10px 8px',
                          borderRadius: '8px',
                          border: `2px solid ${genBase.billType === opt.value ? 'var(--color-emerald)' : 'var(--border-default)'}`,
                          background: genBase.billType === opt.value ? 'rgba(16,185,129,0.12)' : 'var(--bg-tertiary)',
                          color: genBase.billType === opt.value ? 'var(--color-emerald)' : 'var(--color-text-secondary)',
                          cursor: 'pointer',
                          fontWeight: genBase.billType === opt.value ? 600 : 400,
                          fontSize: '13px',
                          transition: 'all 0.2s'
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-section-title">Additional Charges (Common for all)</div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Gas (৳)</label>
                    <input className="form-input" type="number"
                      value={genBase.gas} placeholder="0"
                      onChange={e => setGenBase({...genBase, gas: e.target.value})}/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Service Charge (৳)</label>
                    <input className="form-input" type="number"
                      value={genBase.serviceCharge} placeholder="0"
                      onChange={e => setGenBase({...genBase, serviceCharge: e.target.value})}/>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Other Charges (৳)</label>
                    <input className="form-input" type="number"
                      value={genBase.otherCharges} placeholder="0"
                      onChange={e => setGenBase({...genBase, otherCharges: e.target.value})}/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Due Date</label>
                    <input className="form-input" type="date"
                      value={genBase.dueDate}
                      onChange={e => setGenBase({...genBase, dueDate: e.target.value})}/>
                  </div>
                </div>

                <div className="modal-footer" style={{padding: '0', marginTop: '1rem'}}>
                  <button className="btn btn-secondary" onClick={resetModal}>Cancel</button>
                  <button className="btn btn-primary" onClick={goToStep2}
                    disabled={!genBase.buildingId}>
                    Next: Enter Meter Readings →
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 2: Meter Readings ──────────────────────────────────── */}
            {genStep === 2 && (
              <div className="modal-body">
                <div className="meter-reading-header">
                  <div>
                    <h4>{genBase.month} {genBase.year} — Meter Readings</h4>
                    <p className="meter-subtitle">
                      Enter current meter readings for each tenant. Bills will be auto-calculated.
                    </p>
                  </div>
                  <span className="tenant-count-badge">{targetTenants.length} Tenants</span>
                </div>

                <div className="meter-tenants-list">
                   {targetTenants.map((tenant, idx) => {
                    const inp = meterInputs[tenant.id] || {}
                    const prev = calcPreview[tenant.id]
                    const cfg = settingsStore.get() || {}
                    const globalDemandRate = cfg.electricityDemandRate ?? 90
                    const demandChargeTotal = (tenant.sectionLoad || 0) * globalDemandRate
                    const rentEnabled = (cfg.billItems || ['rent']).includes('rent')

                    return (
                      <div key={tenant.id} className="meter-tenant-card animate-slide-up"
                        style={{ animationDelay: `${idx * 0.05}s` }}>
                        <div className="meter-tenant-header">
                          <div className="meter-tenant-info">
                            <span className="meter-tenant-name">{tenant.name}</span>
                            <span className="meter-tenant-meta">
                              Flat {tenant.flat}{rentEnabled && tenant.monthlyRent ? ` • Rent: ${formatCurrency(tenant.monthlyRent)}` : ''}
                            </span>
                          </div>
                          {prev && (
                            <div className="meter-total-preview">
                              <span>Total</span>
                              <strong>{formatCurrency(prev.total)}</strong>
                            </div>
                          )}
                        </div>

                        <div className="meter-inputs-row">
                          {/* ── Electricity ── */}
                          {genBase.billType !== 'water' && (
                          <div className="meter-section elec-section">
                            <div className="meter-section-title">
                              <Zap size={14}/> Electricity
                            </div>
                            <div className="meter-rate-info">
                              Rate: ৳{tenant.electricityRate}/unit &nbsp;|&nbsp;
                              Demand: {tenant.sectionLoad} kW × ৳{settingsStore.get()?.electricityDemandRate ?? 90} = <strong>৳{demandChargeTotal}</strong>
                              &nbsp;|&nbsp; <span style={{color:'var(--color-amber)'}}>VAT: {settingsStore.get()?.electricityVatRate ?? 5}%</span>
                            </div>
                            <div className="meter-reading-row">
                              <div className="meter-read-item">
                                <label>Prev Reading</label>
                                <span className="prev-reading">{inp.prevElec ?? tenant.electricityStartUnit}</span>
                              </div>
                              <div className="meter-arrow">→</div>
                              <div className="meter-read-item">
                                <label>Current Reading *</label>
                                <input
                                  className="form-input meter-input"
                                  type="number"
                                  placeholder="Enter reading"
                                  value={inp.elec}
                                  onChange={e => handleReadingChange(tenant.id, 'elec', e.target.value)}
                                />
                              </div>

                            </div>
                          </div>
                          )}

                          {/* ── Water/Washa ── */}
                          {genBase.billType !== 'electricity' && (
                          <div className="meter-section water-section">
                            <div className="meter-section-title">
                              <Droplets size={14}/> Washa (Water)
                            </div>
                            <div className="meter-rate-info">
                              Rate: ৳{tenant.waterRate}/unit &nbsp;|&nbsp; <span style={{color:'var(--color-amber)'}}>VAT: {settingsStore.get()?.waterVatRate ?? 15}%</span>
                            </div>
                            <div className="meter-reading-row">
                              <div className="meter-read-item">
                                <label>Prev Reading</label>
                                <span className="prev-reading">{inp.prevWater ?? tenant.waterStartUnit}</span>
                              </div>
                              <div className="meter-arrow">→</div>
                              <div className="meter-read-item">
                                <label>Current Reading *</label>
                                <input
                                  className="form-input meter-input"
                                  type="number"
                                  placeholder="Enter reading"
                                  value={inp.water}
                                  onChange={e => handleReadingChange(tenant.id, 'water', e.target.value)}
                                />
                              </div>

                            </div>
                          </div>
                          )}
                          {/* ── Detailed Breakdown Preview ── */}
                          {prev && (
                            <div style={{
                              marginTop: '16px',
                              padding: '16px',
                              background: 'var(--bg-tertiary)',
                              borderRadius: '8px',
                              border: '1px solid var(--border-default)',
                              fontSize: '13px'
                            }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                
                                {/* Usage & Rates Info */}
                                <div>
                                  <div style={{ fontWeight: 600, color: 'var(--color-text)', marginBottom: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '4px' }}>Usage & Rates</div>
                                  
                                  {genBase.billType !== 'water' && (
                                    <>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <span style={{ color: 'var(--color-text-secondary)' }}>Electricity Units:</span>
                                        <span>{prev.elecCalc.units} kWh</span>
                                      </div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <span style={{ color: 'var(--color-text-secondary)' }}>Elec Unit Cost (Rate):</span>
                                        <span>৳{tenant.electricityRate}/unit</span>
                                      </div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <span style={{ color: 'var(--color-text-secondary)' }}>Elec Prev &rarr; Curr:</span>
                                        <span>{inp.prevElec ?? tenant.electricityStartUnit} &rarr; {inp.elec || 0}</span>
                                      </div>
                                    </>
                                  )}

                                  {genBase.billType !== 'water' && genBase.billType !== 'electricity' && <div style={{ height: '8px' }}></div>}

                                  {genBase.billType !== 'electricity' && (
                                    <>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <span style={{ color: 'var(--color-text-secondary)' }}>Water Units:</span>
                                        <span>{prev.waterCalc.units}</span>
                                      </div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <span style={{ color: 'var(--color-text-secondary)' }}>Water Unit Cost (Rate):</span>
                                        <span>৳{tenant.waterRate}/unit</span>
                                      </div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <span style={{ color: 'var(--color-text-secondary)' }}>Water Prev &rarr; Curr:</span>
                                        <span>{inp.prevWater ?? tenant.waterStartUnit} &rarr; {inp.water || 0}</span>
                                      </div>
                                    </>
                                  )}
                                </div>

                                {/* Charges Breakdown */}
                                <div>
                                  <div style={{ fontWeight: 600, color: 'var(--color-text)', marginBottom: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '4px' }}>Charge Breakdown</div>
                                  
                                  {genBase.billType !== 'water' && (
                                    <>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <span style={{ color: 'var(--color-text-secondary)' }}>Energy Charge:</span>
                                        <span>{formatCurrency(prev.elecCalc.unitCost)}</span>
                                      </div>
                                      {prev.elecCalc.demandCharge > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                          <span style={{ color: 'var(--color-text-secondary)' }}>Demand Charge:</span>
                                          <span>{formatCurrency(prev.elecCalc.demandCharge)}</span>
                                        </div>
                                      )}
                                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <span style={{ color: 'var(--color-text-secondary)' }}>Elec VAT ({prev.elecCalc.vatRate}%):</span>
                                        <span>{formatCurrency(prev.elecCalc.vat)}</span>
                                      </div>
                                    </>
                                  )}

                                  {genBase.billType !== 'electricity' && (
                                    <>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <span style={{ color: 'var(--color-text-secondary)' }}>Water Charge:</span>
                                        <span>{formatCurrency(prev.waterCalc.subTotal)}</span>
                                      </div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <span style={{ color: 'var(--color-text-secondary)' }}>Water VAT ({prev.waterCalc.vatRate}%):</span>
                                        <span>{formatCurrency(prev.waterCalc.vat)}</span>
                                      </div>
                                    </>
                                  )}
                                  
                                  <div style={{ borderTop: '1px dashed var(--border-subtle)', margin: '8px 0' }}></div>

                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontWeight: 600 }}>
                                    <span>Total Without Late Fee:</span>
                                    <span style={{ color: 'var(--color-emerald)' }}>{formatCurrency(prev.total)}</span>
                                  </div>
                                  
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span style={{ color: 'var(--color-text-secondary)' }}>Late Payment Charge ({cfg.lateFeePercentage || 5}%):</span>
                                    <span style={{ color: 'var(--color-amber)' }}>+{formatCurrency((prev.total * (cfg.lateFeePercentage || 5)) / 100)}</span>
                                  </div>
                                  
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', paddingTop: '4px', borderTop: '1px solid var(--border-subtle)', fontWeight: 700 }}>
                                    <span>Total (If paid late):</span>
                                    <span style={{ color: 'var(--color-danger)' }}>{formatCurrency(prev.total + (prev.total * (cfg.lateFeePercentage || 5)) / 100)}</span>
                                  </div>
                                </div>

                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="modal-footer" style={{padding: '0', marginTop: '1.5rem'}}>
                  {(() => {
                    const billType = genBase.billType
                    const hasInvalid = targetTenants.some(t => {
                      const inp = meterInputs[t.id] || {}
                      const eCurr = parseFloat(inp.elec)
                      const ePrev = parseFloat(inp.prevElec ?? t.electricityStartUnit ?? 0)
                      const wCurr = parseFloat(inp.water)
                      const wPrev = parseFloat(inp.prevWater ?? t.waterStartUnit ?? 0)
                      // only validate fields required by the bill type
                      const elecInvalid = billType !== 'water' && (inp.elec === '' || inp.elec === undefined || isNaN(eCurr) || eCurr < ePrev)
                      const waterInvalid = billType !== 'electricity' && (inp.water === '' || inp.water === undefined || isNaN(wCurr) || wCurr < wPrev)
                      return elecInvalid || waterInvalid
                    })

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                        {hasInvalid && (
                          <div style={{ color: 'var(--color-danger)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <AlertTriangle size={14} /> Current reading cannot be less than previous reading or empty.
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <button className="btn btn-secondary" onClick={() => setGenStep(1)}>
                            ← Back
                          </button>
                          <button className="btn btn-primary" onClick={handleGenerateBills} disabled={hasInvalid}>
                            <FileText size={18}/>
                            <span>Generate {targetTenants.length} Bill{targetTenants.length !== 1 ? 's' : ''}</span>
                          </button>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUCCESS MODAL */}
      {showSuccessModal && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 9999 }}>
          <div className="modal-content animate-slide-up" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>Bills Generated Successfully</h3>
              <button className="btn-close" onClick={() => setShowSuccessModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <div style={{ padding: '15px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 size={24} />
                <span>Successfully generated {generatedBillsList.length} bill(s).</span>
              </div>
              <p style={{ marginBottom: '15px', color: '#94a3b8' }}>You can now view and print the generated invoices:</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {generatedBillsList.map((b, idx) => (
                  <div key={b.id || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', backgroundColor: 'var(--bg-lighter)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div>
                      <div style={{ fontWeight: '500', color: 'var(--text-main)', marginBottom: '4px' }}>{b.tenantName}</div>
                      <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Flat: {b.flat} • Amount: ৳{b.totalAmount.toLocaleString()}</div>
                    </div>
                    {b.id ? (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => window.open(`/bill-preview/${b.id}`, '_blank')}
                          style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                        >
                          <FileText size={14} style={{ marginRight: '6px' }} />
                          Print Invoice
                        </button>
                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleEmailBill(b)}
                          disabled={emailStatus[b.id] === 'sending'}
                          style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                        >
                          {emailStatus[b.id] === 'sending' ? <Clock size={14} style={{ marginRight: '6px' }} /> : 
                           emailStatus[b.id] === 'sent' ? <CheckCircle2 size={14} style={{ marginRight: '6px' }} color="var(--color-success)" /> : 
                           <Mail size={14} style={{ marginRight: '6px' }} />}
                          Email
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.85rem', color: '#f59e0b', padding: '6px 12px' }}>
                        Processing ID...
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer" style={{ marginTop: '20px' }}>
              <button className="btn btn-primary" onClick={() => setShowSuccessModal(false)}>
                Done
              </button>
            </div>
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

export default Billing
