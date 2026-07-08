import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Printer, FileText, Phone, Mail, MapPin } from 'lucide-react'
import { tenantStore, buildingStore, billStore, paymentStore, settingsStore } from '../data/store'
import { formatCurrency, formatDate } from '../data/helpers'

function TenantReport() {
  const { tenantId } = useParams()
  const navigate = useNavigate()
  
  const [tenant, setTenant] = useState(null)
  const [building, setBuilding] = useState(null)
  const [bills, setBills] = useState([])
  const [payments, setPayments] = useState([])
  const [settings, setSettings] = useState({})
  const [totals, setTotals] = useState({ billed: 0, paid: 0, due: 0 })

  useEffect(() => {
    const fetchReport = async () => {
      const t = await tenantStore.getById(tenantId)
      if (t) {
        setTenant(t)
        setBuilding(await buildingStore.getById(t.buildingId))
        setSettings(await settingsStore.get())
        
        const allBills = await billStore.getAll()
        const tBills = allBills.filter(b => b.tenantId === t.id)
        const allPayments = await paymentStore.getAll()
        const tPayments = allPayments.filter(p => p.tenantId === t.id)
        
        // Sort chronologically
        tBills.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        tPayments.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate))
        
        setBills(tBills)
        setPayments(tPayments)
        
        const billed = tBills.reduce((sum, b) => sum + b.totalAmount, 0)
        const paid = tPayments.reduce((sum, p) => sum + p.amount, 0)
        setTotals({ billed, paid, due: Math.max(0, billed - paid) })
      }
    }
    fetchReport()
  }, [tenantId])

  if (!tenant) {
    return (
      <div className="page animate-fade-in">
        <div className="empty-state">
          <p>Tenant not found</p>
          <button className="btn btn-secondary" onClick={() => navigate('/tenants')}>Go Back</button>
        </div>
      </div>
    )
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="page animate-fade-in">
      <div className="page-header no-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)' }}>
          <button className="btn-icon" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="page-title">Tenant Report</h2>
            <p className="page-subtitle">Complete financial ledger for {tenant.name}</p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={handlePrint}>
          <Printer size={18} />
          <span>Print Report</span>
        </button>
      </div>

      <div className="bill-preview" style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Report Header */}
        <div className="bill-header" style={{ marginBottom: '32px' }}>
          <div className="bill-company" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            {settings.logoUrl && (
              <img src={settings.logoUrl} alt="Logo" style={{ width: 64, height: 64, objectFit: 'contain' }} />
            )}
            <div>
              <h2 className="bill-company-name">{settings.companyName || 'RentFlow Property Management'}</h2>
              <p>{settings.companyAddress || 'Dhaka, Bangladesh'}</p>
              <p>Phone: {settings.companyPhone || '01XXXXXXXXX'}</p>
            </div>
          </div>
          <div className="bill-meta" style={{ textAlign: 'right' }}>
            <h1 className="bill-title" style={{ fontSize: '24px', marginBottom: '8px' }}>TENANT LEDGER</h1>
            <p className="meta-value">Date: {formatDate(new Date().toISOString())}</p>
          </div>
        </div>

        <div className="bill-divider"></div>

        {/* Tenant Details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
          <div>
            <h4 style={{ color: 'var(--color-text-muted)', textTransform: 'uppercase', fontSize: '12px', marginBottom: '8px' }}>Tenant Information</h4>
            <p style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px', color: 'var(--color-text-primary)' }}>{tenant.name}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-text-secondary)', fontSize: '14px', marginBottom: '4px' }}>
              <Phone size={14} /> {tenant.phone}
            </div>
            {tenant.email && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                <Mail size={14} /> {tenant.email}
              </div>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <h4 style={{ color: 'var(--color-text-muted)', textTransform: 'uppercase', fontSize: '12px', marginBottom: '8px' }}>Property Details</h4>
            <p style={{ fontSize: '16px', fontWeight: '500', color: 'var(--color-text-primary)' }}>{building?.name}</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', color: 'var(--color-text-secondary)', fontSize: '14px' }}>
              <MapPin size={14} /> Flat {tenant.flat}, Floor {tenant.floor}
            </div>
            <p style={{ marginTop: '8px', fontSize: '14px', color: 'var(--color-text-secondary)' }}>Move-in: {formatDate(tenant.moveInDate)}</p>
          </div>
        </div>

        {/* Financial Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px', background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
          <div>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Advance Deposit</p>
            <p style={{ fontSize: '18px', fontWeight: '600', color: 'var(--color-text-primary)' }}>{formatCurrency(tenant.advanceDeposit)}</p>
          </div>
          <div>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Total Billed</p>
            <p style={{ fontSize: '18px', fontWeight: '600', color: 'var(--color-text-primary)' }}>{formatCurrency(totals.billed)}</p>
          </div>
          <div>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Total Paid</p>
            <p style={{ fontSize: '18px', fontWeight: '600', color: 'var(--color-emerald)' }}>{formatCurrency(totals.paid)}</p>
          </div>
          <div>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Total Due</p>
            <p style={{ fontSize: '18px', fontWeight: '600', color: 'var(--color-red)' }}>{formatCurrency(totals.due)}</p>
          </div>
        </div>

        {/* Ledger Tables */}
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--color-text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} /> Billing History
          </h3>
          <table className="bill-items-table" style={{ fontSize: '14px' }}>
            <thead>
              <tr>
                <th>Month</th>
                <th>Bill Date</th>
                <th>Due Date</th>
                <th>Status</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {bills.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '16px', color: 'var(--color-text-muted)' }}>No bills generated yet</td></tr>
              ) : (
                bills.map(b => (
                  <tr key={b.id}>
                    <td>{b.month} {b.year}</td>
                    <td>{formatDate(b.createdAt)}</td>
                    <td>{formatDate(b.dueDate)}</td>
                    <td>
                      <span className={`bill-status-badge bill-status-${b.status}`} style={{ fontSize: '10px', padding: '2px 6px' }}>
                        {b.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="text-right" style={{ fontWeight: '500' }}>{formatCurrency(b.totalAmount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--color-text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} /> Payment History
          </h3>
          <table className="bill-items-table" style={{ fontSize: '14px' }}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Method</th>
                <th>Note</th>
                <th className="text-right">Amount Paid</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '16px', color: 'var(--color-text-muted)' }}>No payments recorded yet</td></tr>
              ) : (
                payments.map(p => (
                  <tr key={p.id}>
                    <td>{formatDate(p.paymentDate)}</td>
                    <td style={{ textTransform: 'capitalize' }}>{p.method}</td>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>{p.note || '-'}</td>
                    <td className="text-right" style={{ fontWeight: '600', color: 'var(--color-emerald)' }}>{formatCurrency(p.amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Footer */}
        <div style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px solid var(--border-subtle)', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '12px' }}>
          This is a system generated report and does not require a physical signature.
        </div>
      </div>
    </div>
  )
}

export default TenantReport
