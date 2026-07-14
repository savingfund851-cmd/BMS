import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Printer, CheckCircle } from 'lucide-react'
import { billStore, tenantStore, buildingStore, settingsStore, paymentStore } from '../data/store'
import { formatCurrency, formatDate, generateBillNumber } from '../data/helpers'

function PaymentReceipt() {
  const { paymentId } = useParams()
  const navigate = useNavigate()
  
  const [payment, setPayment] = useState(null)
  const [bill, setBill] = useState(null)
  const [tenant, setTenant] = useState(null)
  const [building, setBuilding] = useState(null)
  const [settings, setSettings] = useState({})
  const [allBillPayments, setAllBillPayments] = useState([])

  useEffect(() => {
    const fetchData = () => {
      const p = paymentStore.getById(paymentId)
      if (p) {
        setPayment(p)
        const b = billStore.getById(p.billId)
        if (b) {
          setBill(b)
          setTenant(tenantStore.getById(b.tenantId))
          setBuilding(buildingStore.getById(b.buildingId))
          // Get all payments for this bill to show payment history
          const billPays = paymentStore.getAll().filter(x => x.billId === b.id)
          setAllBillPayments(billPays)
        }
        setSettings(settingsStore.get() || {})
      }
    }
    fetchData()
    const handler = () => fetchData()
    window.addEventListener('storeUpdated', handler)
    return () => window.removeEventListener('storeUpdated', handler)
  }, [paymentId])

  const handlePrint = () => window.print()

  if (!payment || !bill || !tenant || !building) {
    return (
      <div className="page animate-fade-in">
        <div className="empty-state">
          <p>Receipt not found</p>
          <button className="btn btn-secondary" onClick={() => navigate('/payments')}>Go Back</button>
        </div>
      </div>
    )
  }

  const billNumber = generateBillNumber(building.id, tenant.id, bill.month, bill.year)
  const receiptNo = `RCP-${payment.id.substring(0,8).toUpperCase()}`
  const orgName = settings.companyName || building.name
  const orgAddr = settings.companyAddress || building.address
  const orgPhone = settings.companyPhone || ''
  const crestInitials = orgName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()

  const totalBillPaid = allBillPayments.reduce((s, p) => s + p.amount, 0)
  const isPaidInFull = totalBillPaid >= bill.totalAmount

  // Payment breakdown methods
  const breakdown = payment.breakdown || {}
  const hasBreakdown = Object.values(breakdown).some(v => parseFloat(v) > 0)

  return (
    <div className="animate-fade-in">
      {/* Top bar - no-print */}
      <div className="page-header no-print" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/payments')}>
          <ArrowLeft size={16} />
          <span>Back to Payments</span>
        </button>
        <button className="btn btn-primary" onClick={handlePrint}>
          <Printer size={18} />
          <span>Print Receipt</span>
        </button>
      </div>

      {/* Scoped styles */}
      <style>{`
        .receipt-wrapper {
          display: flex;
          justify-content: center;
          padding: 0 16px 60px;
          background: #cbd5e1;
          min-height: 100vh;
        }
        .receipt-card {
          width: 780px;
          background: #ffffff;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          font-family: 'Inter', sans-serif;
          color: #1e293b;
          position: relative;
          overflow: hidden;
        }

        /* Top accent bar */
        .rc-top-bar {
          height: 8px;
          background: linear-gradient(90deg, #1B2A4A 0%, #B8873B 50%, #1B2A4A 100%);
        }

        /* Header */
        .rc-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 32px 40px 24px;
          border-bottom: 1px solid #e2e8f0;
        }
        .rc-brand { display: flex; align-items: center; gap: 16px; }
        .rc-logo-box {
          width: 64px; height: 64px;
          background: #1B2A4A; color: #fff;
          display: flex; align-items: center; justify-content: center;
          font-size: 26px; font-weight: 800; border-radius: 12px;
          flex-shrink: 0;
        }
        .rc-logo-img { width: 64px; height: 64px; object-fit: contain; border-radius: 8px; }
        .rc-org-name { font-size: 22px; font-weight: 800; color: #1B2A4A; line-height: 1.2; }
        .rc-org-addr { font-size: 12px; color: #64748b; margin-top: 4px; max-width: 240px; line-height: 1.5; }

        .rc-title-block { text-align: right; }
        .rc-title-block h2 {
          font-size: 36px; font-weight: 900; letter-spacing: 4px;
          color: #B8873B; text-transform: uppercase; margin: 0;
        }
        .rc-receipt-no { font-size: 13px; color: #475569; margin-top: 6px; font-weight: 600; }
        .rc-date { font-size: 12px; color: #94a3b8; margin-top: 3px; }

        /* Info boxes */
        .rc-info-row {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 0;
          border-bottom: 1px solid #e2e8f0;
        }
        .rc-info-box {
          padding: 20px 28px;
          border-right: 1px solid #e2e8f0;
        }
        .rc-info-box:last-child { border-right: none; }
        .rc-info-box h4 {
          font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px;
          color: #94a3b8; margin: 0 0 10px; font-weight: 600;
        }
        .rc-info-box p { margin: 4px 0; font-size: 13px; color: #334155; }
        .rc-info-box .rc-name { font-size: 16px; font-weight: 700; color: #1B2A4A; margin-bottom: 6px; }

        /* Amount hero */
        .rc-amount-hero {
          background: linear-gradient(135deg, #1B2A4A 0%, #0f172a 100%);
          padding: 28px 40px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .rc-amount-label { font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: #94a3b8; }
        .rc-amount-value { font-size: 42px; font-weight: 900; color: #ffffff; margin-top: 4px; }
        .rc-amount-sub { font-size: 12px; color: #64748b; margin-top: 4px; }
        .rc-paid-badge {
          background: rgba(16,185,129,0.15);
          border: 2px solid #10b981;
          color: #10b981;
          font-size: 18px; font-weight: 800;
          letter-spacing: 3px; text-transform: uppercase;
          padding: 10px 22px; border-radius: 10px;
          display: flex; align-items: center; gap: 8px;
          transform: rotate(-3deg);
        }

        /* Breakdown */
        .rc-section { padding: 24px 40px; border-bottom: 1px solid #e2e8f0; }
        .rc-section h3 {
          font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px;
          color: #94a3b8; margin: 0 0 14px; font-weight: 600;
        }
        .rc-breakdown-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }
        .rc-bd-item {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 12px;
          text-align: center;
        }
        .rc-bd-method { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }
        .rc-bd-amount { font-size: 18px; font-weight: 700; color: #1B2A4A; margin-top: 4px; }

        /* Bill summary */
        .rc-summary-table { width: 100%; border-collapse: collapse; }
        .rc-summary-table td { padding: 8px 0; font-size: 13px; border-bottom: 1px solid #f1f5f9; }
        .rc-summary-table td:last-child { text-align: right; font-weight: 600; color: #334155; }
        .rc-summary-table .rc-total-row td { 
          padding-top: 14px; font-weight: 800; font-size: 15px; 
          color: #1B2A4A; border-bottom: none;
        }

        /* Note */
        .rc-note {
          background: #fefce8;
          border-left: 3px solid #B8873B;
          padding: 10px 14px;
          font-size: 12px;
          color: #713f12;
          border-radius: 0 6px 6px 0;
          margin-top: 12px;
        }

        /* Footer */
        .rc-footer {
          padding: 20px 40px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          border-top: 1px solid #e2e8f0;
        }
        .rc-footer-left { font-size: 11px; color: #94a3b8; line-height: 1.7; }
        .rc-sig-block { text-align: center; }
        .rc-sig-line { width: 140px; border-top: 1px solid #334155; margin: 0 auto; padding-top: 6px; }
        .rc-sig-text { font-size: 11px; color: #64748b; }

        .rc-bottom-bar {
          height: 5px;
          background: linear-gradient(90deg, #B8873B 0%, #1B2A4A 50%, #B8873B 100%);
        }

        @media print {
          body * { visibility: hidden; }
          .receipt-wrapper, .receipt-wrapper * { visibility: visible; }
          .receipt-wrapper {
            position: absolute; left: 0; top: 0;
            background: white; padding: 0; min-height: auto;
          }
          .receipt-card { box-shadow: none; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="receipt-wrapper">
        <div className="receipt-card">
          <div className="rc-top-bar" />

          {/* Header */}
          <div className="rc-header">
            <div className="rc-brand">
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt="Logo" className="rc-logo-img" />
              ) : (
                <div className="rc-logo-box">{crestInitials}</div>
              )}
              <div>
                <div className="rc-org-name">{orgName}</div>
                <div className="rc-org-addr">
                  {orgAddr && <span>{orgAddr}</span>}
                  {orgPhone && <><br/>{orgPhone}</>}
                </div>
              </div>
            </div>
            <div className="rc-title-block">
              <h2>RECEIPT</h2>
              <div className="rc-receipt-no">#{receiptNo}</div>
              <div className="rc-date">Issued: {formatDate(payment.paymentDate)}</div>
            </div>
          </div>

          {/* Info Row */}
          <div className="rc-info-row">
            <div className="rc-info-box">
              <h4>Received From</h4>
              <p className="rc-name">{tenant.name}</p>
              <p>📍 Flat {tenant.flat} — {building.name}</p>
              {tenant.phone && <p>📞 {tenant.phone}</p>}
            </div>
            <div className="rc-info-box">
              <h4>Bill Reference</h4>
              <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>#{billNumber}</p>
              <p><strong>Period:</strong> {bill.month} {bill.year}</p>
              <p><strong>Due Date:</strong> {formatDate(bill.dueDate)}</p>
              <p><strong>Bill Total:</strong> {formatCurrency(bill.totalAmount)}</p>
            </div>
            <div className="rc-info-box">
              <h4>Payment Method</h4>
              <p style={{ fontSize: '20px', fontWeight: 700, color: '#1B2A4A', marginBottom: '6px' }}>
                {payment.method}
              </p>
              <p>Received by: <strong>{payment.receivedBy || 'Admin'}</strong></p>
              <p style={{ fontSize: '12px', color: isPaidInFull ? '#10b981' : '#f59e0b', fontWeight: 600, marginTop: '6px' }}>
                {isPaidInFull ? '✅ Bill Fully Paid' : `⚠️ Partial — Balance: ${formatCurrency(bill.totalAmount - totalBillPaid)}`}
              </p>
            </div>
          </div>

          {/* Amount Hero */}
          <div className="rc-amount-hero">
            <div>
              <div className="rc-amount-label">Amount Received</div>
              <div className="rc-amount-value">{formatCurrency(payment.amount)}</div>
              <div className="rc-amount-sub">Payment for {bill.month} {bill.year} Bill</div>
            </div>
            <div className="rc-paid-badge">
              <CheckCircle size={20} />
              PAID
            </div>
          </div>

          {/* Breakdown */}
          {hasBreakdown && (
            <div className="rc-section">
              <h3>Payment Breakdown</h3>
              <div className="rc-breakdown-grid">
                {Object.entries(breakdown).map(([method, val]) => {
                  const amt = parseFloat(val) || 0
                  if (amt <= 0) return null
                  return (
                    <div key={method} className="rc-bd-item">
                      <div className="rc-bd-method">{method.toUpperCase()}</div>
                      <div className="rc-bd-amount">{formatCurrency(amt)}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Bill Summary */}
          <div className="rc-section">
            <h3>Bill Summary</h3>
            <table className="rc-summary-table">
              <tbody>
                {bill.rent > 0 && <tr><td>Rent</td><td>{formatCurrency(bill.rent)}</td></tr>}
                {bill.electricity > 0 && <tr><td>Electricity</td><td>{formatCurrency(bill.electricity)}</td></tr>}
                {bill.water > 0 && <tr><td>Water</td><td>{formatCurrency(bill.water)}</td></tr>}
                {bill.gas > 0 && <tr><td>Gas</td><td>{formatCurrency(bill.gas)}</td></tr>}
                {bill.serviceCharge > 0 && <tr><td>Service Charge</td><td>{formatCurrency(bill.serviceCharge)}</td></tr>}
                {bill.otherCharges > 0 && <tr><td>Other Charges</td><td>{formatCurrency(bill.otherCharges)}</td></tr>}
                <tr className="rc-total-row">
                  <td>Total Bill Amount</td>
                  <td>{formatCurrency(bill.totalAmount)}</td>
                </tr>
                <tr>
                  <td style={{ color: '#10b981' }}>Previously Paid</td>
                  <td style={{ color: '#10b981' }}>-{formatCurrency(totalBillPaid - payment.amount)}</td>
                </tr>
                <tr>
                  <td style={{ color: '#10b981', fontWeight: 700 }}>This Payment</td>
                  <td style={{ color: '#10b981', fontWeight: 700 }}>-{formatCurrency(payment.amount)}</td>
                </tr>
                {!isPaidInFull && (
                  <tr>
                    <td style={{ color: '#f59e0b', fontWeight: 700 }}>Remaining Balance</td>
                    <td style={{ color: '#f59e0b', fontWeight: 700 }}>{formatCurrency(bill.totalAmount - totalBillPaid)}</td>
                  </tr>
                )}
              </tbody>
            </table>
            {payment.note && (
              <div className="rc-note">
                📝 Note: {payment.note}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="rc-footer">
            <div className="rc-footer-left">
              <div>This is a computer-generated receipt.</div>
              <div>No physical signature required.</div>
              <div style={{ marginTop: '6px', color: '#B8873B' }}>Thank you for your payment!</div>
            </div>
            <div className="rc-sig-block">
              <div className="rc-sig-line">
                <div className="rc-sig-text">Authorized Signatory</div>
              </div>
            </div>
          </div>

          <div className="rc-bottom-bar" />
        </div>
      </div>
    </div>
  )
}

export default PaymentReceipt
