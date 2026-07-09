import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
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
        }
        setSettings(settingsStore.get() || {})
      }
    }
    fetchData()

    const handler = () => fetchData()
    window.addEventListener('storeUpdated', handler)
    return () => window.removeEventListener('storeUpdated', handler)
  }, [paymentId])

  const handlePrint = () => { window.print() }

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
  const orgName = settings.companyName || building.name
  const orgAddr = settings.companyAddress || building.address
  const crestInitials = orgName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()

  return (
    <div className="animate-fade-in">
      <div className="page-header no-print" style={{ padding: '20px', maxWidth: '210mm', margin: '0 auto', display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/payments')}>
            <ArrowLeft size={16} />
            <span>Back to Payments</span>
          </button>
        </div>
        <div>
          <button className="btn btn-primary" onClick={handlePrint}>
            <Printer size={18} />
            <span>Print Receipt</span>
          </button>
        </div>
      </div>

      <div className="a4-invoice-container">
        <style>{`
          .a4-invoice-container {
            --navy:#1B2A4A;
            --navy-deep:#121E38;
            --brass:#B8873B;
            --brass-light:#D9A85C;
            --text-dark:#333333;
            --text-mid:#555555;
            --text-light:#888888;
            
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            background: #ffffff;
            color: var(--text-dark);
            padding: 40px;
            box-sizing: border-box;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            font-family: 'Inter', sans-serif;
            position: relative;
          }
          
          @media print {
            body * { visibility: hidden; }
            .a4-invoice-container, .a4-invoice-container * { visibility: visible; }
            .a4-invoice-container {
              position: absolute; left: 0; top: 0;
              box-shadow: none; margin: 0; padding: 20px;
            }
            .no-print { display: none !important; }
          }
          
          .inv-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid var(--navy);
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .inv-brand { display: flex; align-items: center; gap: 15px; }
          .inv-logo-box {
            width: 60px; height: 60px;
            background: var(--navy); color: #fff;
            display: flex; align-items: center; justify-content: center;
            font-size: 24px; font-weight: 700; border-radius: 8px;
          }
          .inv-logo-img { width: 60px; height: 60px; object-fit: contain; }
          .inv-company h1 { margin: 0; font-size: 24px; color: var(--navy); font-weight: 700; }
          .inv-company p { margin: 4px 0 0; font-size: 13px; color: var(--text-mid); max-width: 250px; }
          
          .inv-title { text-align: right; }
          .inv-title h2 { margin: 0; font-size: 32px; color: var(--brass); letter-spacing: 2px; text-transform: uppercase; }
          .inv-title p { margin: 4px 0 0; font-size: 14px; font-weight: 600; color: var(--navy); }
          .inv-title p span { color: var(--text-mid); font-weight: 400; }
          
          .inv-info-row { display: flex; justify-content: space-between; margin-bottom: 30px; gap: 30px; }
          .inv-box {
            flex: 1; border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px;
            background: #fafafa;
          }
          .inv-box h3 { margin: 0 0 10px; font-size: 12px; text-transform: uppercase; color: var(--text-light); letter-spacing: 1px; }
          .inv-box p { margin: 4px 0; font-size: 14px; color: var(--text-dark); }
          .inv-box p strong { color: var(--navy); display: inline-block; width: 80px; }
          
          .inv-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          .inv-table th { background: var(--navy); color: #fff; text-align: left; padding: 12px 15px; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; }
          .inv-table td { padding: 15px; border-bottom: 1px solid #eee; font-size: 14px; }
          .inv-table tr:last-child td { border-bottom: 2px solid var(--navy); }
          
          .inv-total-row { display: flex; justify-content: flex-end; margin-bottom: 40px; }
          .inv-total-box { width: 300px; background: #fafafa; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; }
          .inv-tot-line { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; }
          .inv-tot-line.grand { border-top: 1px solid #ddd; padding-top: 15px; margin-top: 5px; font-size: 18px; font-weight: 700; color: var(--navy); }
          
          .inv-footer { text-align: center; border-top: 1px solid #eee; padding-top: 20px; color: var(--text-light); font-size: 12px; }
          
          .stamp {
            position: absolute; right: 50px; bottom: 150px;
            border: 3px solid #10b981; color: #10b981;
            font-size: 24px; font-weight: 700; text-transform: uppercase;
            padding: 10px 20px; border-radius: 8px;
            transform: rotate(-15deg); opacity: 0.8;
          }
        `}</style>

        <div className="inv-header">
          <div className="inv-brand">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo" className="inv-logo-img" />
            ) : (
              <div className="inv-logo-box">{crestInitials}</div>
            )}
            <div className="inv-company">
              <h1>{orgName}</h1>
              <p>{orgAddr}</p>
            </div>
          </div>
          <div className="inv-title">
            <h2>RECEIPT</h2>
            <p>Receipt No: <span>RC-{payment.id.substring(0,6).toUpperCase()}</span></p>
            <p>Date: <span>{formatDate(payment.paymentDate)}</span></p>
          </div>
        </div>

        <div className="inv-info-row">
          <div className="inv-box">
            <h3>Received From</h3>
            <p style={{ fontSize: '18px', fontWeight: '600', color: 'var(--navy)', marginBottom: '8px' }}>{tenant.name}</p>
            <p><strong>Flat:</strong> {tenant.flat}</p>
            <p><strong>Phone:</strong> {tenant.phone}</p>
          </div>
          
          <div className="inv-box">
            <h3>Payment For</h3>
            <p><strong>Bill No:</strong> {billNumber}</p>
            <p><strong>Month:</strong> {bill.month} {bill.year}</p>
            <p><strong>Method:</strong> {payment.method}</p>
          </div>
        </div>

        <table className="inv-table">
          <thead>
            <tr>
              <th>Description</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <div style={{ fontWeight: '600', color: 'var(--navy)' }}>Payment for {bill.month} {bill.year} Bill</div>
                {payment.note && <div style={{ fontSize: '12px', color: 'var(--text-mid)', marginTop: '4px' }}>Note: {payment.note}</div>}
              </td>
              <td style={{ textAlign: 'right', fontWeight: '600' }}>৳{formatCurrency(payment.amount)}</td>
            </tr>
          </tbody>
        </table>

        <div className="inv-total-row">
          <div className="inv-total-box">
            <div className="inv-tot-line grand">
              <span>Amount Received</span>
              <span>৳{formatCurrency(payment.amount)}</span>
            </div>
            
            <div style={{ fontSize: '12px', color: 'var(--text-mid)', marginTop: '15px', fontStyle: 'italic' }}>
              Received by: {payment.receivedBy || 'Admin'}
            </div>
          </div>
        </div>

        <div className="stamp">PAID</div>

        <div className="inv-footer">
          <p>Thank you for your payment.</p>
          <p>This is a computer-generated document. No signature is required.</p>
        </div>
      </div>
    </div>
  )
}

export default PaymentReceipt
