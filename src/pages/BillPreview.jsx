import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import { billStore, tenantStore, buildingStore, settingsStore, paymentStore } from '../data/store'
import { formatCurrency, formatDate, generateBillNumber } from '../data/helpers'

function BillPreview() {
  const { billId } = useParams()
  const navigate = useNavigate()
  const [bill, setBill] = useState(null)
  const [tenant, setTenant] = useState(null)
  const [building, setBuilding] = useState(null)
  const [settings, setSettings] = useState({})
  const [payments, setPayments] = useState([])
  const [totalPaid, setTotalPaid] = useState(0)

  useEffect(() => {
    const b = billStore.getById(billId)
    if (b) {
      setBill(b)
      setTenant(tenantStore.getById(b.tenantId))
      setBuilding(buildingStore.getById(b.buildingId))
      setSettings(settingsStore.get() || {})
      
      const allPayments = paymentStore.getAll().filter(p => p.billId === b.id)
      setPayments(allPayments)
      setTotalPaid(allPayments.reduce((sum, p) => sum + p.amount, 0))
    }
  }, [billId])

  const handlePrint = () => { window.print() }

  if (!bill || !tenant || !building) {
    return (
      <div className="page animate-fade-in">
        <div className="empty-state">
          <p>Bill not found</p>
          <button className="btn btn-secondary" onClick={() => navigate('/billing')}>Go Back</button>
        </div>
      </div>
    )
  }

  const billNumber = generateBillNumber(building.id, tenant.id, bill.month, bill.year)
  const billItems = settings.billItems || ['rent', 'electricity', 'water', 'gas', 'serviceCharge', 'otherCharges']
  
  const showRent = billItems.includes('rent') && bill.rent > 0
  const showElectricity = billItems.includes('electricity') && bill.electricity > 0
  const showWater = billItems.includes('water') && bill.water > 0
  const showGas = billItems.includes('gas') && bill.gas > 0
  const showServiceCharge = billItems.includes('serviceCharge') && bill.serviceCharge > 0
  const showOtherCharges = billItems.includes('otherCharges') && bill.otherCharges > 0

  const elecVatRate = settings.electricityVatRate ?? 5
  const waterVatRate = settings.waterVatRate ?? 15

  const orgName = settings.companyName || building.name
  const orgAddr = settings.companyAddress || building.address
  const crestInitials = orgName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()

  const totalVat = (bill.electricityVat || 0) + (bill.waterVat || 0)
  const subTotal = bill.totalAmount - totalVat

  const lateFeeVal = (bill.totalAmount * (settings.lateFeePercentage || 5)) / 100
  const grandTotal = bill.totalAmount
  const amountDue = Math.max(0, grandTotal - totalPaid)
  const totalAfterLateFee = amountDue + lateFeeVal

  return (
    <div className="animate-fade-in">
      <div className="page-header no-print" style={{ padding: '20px', maxWidth: '210mm', margin: '0 auto', display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/billing')}>
            <ArrowLeft size={16} />
            <span>Back to Billing</span>
          </button>
        </div>
        <div>
          <button className="btn btn-primary" onClick={handlePrint}>
            <Printer size={18} />
            <span>Print Invoice</span>
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
            --paper:#FAF8F3;
            --paper-line:#E7E1D4;
            --ink:#2B2B2B;
            --ink-soft:#5B5B5B;
            --green:#2F7A4D;
            --red:#B3261E;

            display: flex;
            justify-content: center;
            padding: 0 12px 40px;
            background: #8892a3;
          }
          .a4-page {
            width: 210mm;
            min-height: 297mm;
            background: var(--paper);
            box-shadow: 0 20px 60px rgba(0,0,0,0.35);
            position: relative;
            padding: 14mm 14mm 12mm;
            color: var(--ink);
            font-family: 'Inter', sans-serif;
            box-sizing: border-box;
          }
          .a4-page * { box-sizing: border-box; }
          
          /* Header */
          .letterhead {
            display: flex;
            align-items: center;
            gap: 16px;
            border-bottom: 3px solid var(--navy);
            padding-bottom: 12px;
          }
          .crest {
            width: 56px; height: 56px;
            border-radius: 50%;
            background: linear-gradient(135deg, var(--navy), var(--navy-deep));
            display: flex; align-items: center; justify-content: center;
            color: var(--brass-light);
            font-family: 'Lora', serif;
            font-weight: 700;
            font-size: 20px;
            flex-shrink: 0;
            border: 2px solid var(--brass);
            overflow: hidden;
          }
          .crest img {
            width: 100%; height: 100%; object-fit: cover;
          }
          .org-name {
            font-family: 'Lora', serif;
            font-weight: 700;
            font-size: 26px;
            color: var(--navy);
            letter-spacing: 0.5px;
            text-transform: uppercase;
          }
          .org-addr {
            font-size: 11.5px;
            color: var(--ink-soft);
            margin-top: 2px;
          }
          .doc-tag {
            margin-left: auto;
            text-align: right;
          }
          .doc-tag .label {
            font-size: 10px;
            letter-spacing: 2.5px;
            text-transform: uppercase;
            color: var(--brass);
            font-weight: 700;
          }
          .doc-tag .no {
            font-family: 'JetBrains Mono', monospace;
            font-size: 13px;
            color: var(--navy);
            margin-top: 2px;
          }

          .bill-title {
            text-align: center;
            margin: 16px 0 4px;
          }
          .bill-title h1 {
            font-family: 'Lora', serif;
            font-size: 15px;
            letter-spacing: 4px;
            text-transform: uppercase;
            color: var(--navy);
            margin: 0;
            font-weight: 600;
          }
          .bill-title .rule {
            width: 60px; height: 2px; background: var(--brass);
            margin: 6px auto 0;
          }

          /* Meta strip */
          .meta-grid {
            display: grid;
            grid-template-columns: 1.3fr 1fr 1fr;
            gap: 0;
            margin-top: 16px;
            border: 1px solid var(--paper-line);
            background: #fff;
          }
          .meta-cell {
            padding: 10px 14px;
            border-right: 1px solid var(--paper-line);
          }
          .meta-cell:last-child { border-right: none; }
          .meta-cell .k {
            font-size: 9.5px;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            color: var(--ink-soft);
            font-weight: 600;
          }
          .meta-cell .v {
            font-size: 13.5px;
            font-weight: 600;
            color: var(--navy);
            margin-top: 3px;
          }
          .meta-cell .v.due { color: var(--red); }

          .tenant-strip {
            display: flex;
            justify-content: space-between;
            margin-top: 10px;
            padding: 10px 14px;
            background: var(--navy);
            color: #fff;
          }
          .tenant-strip div .k {
            font-size: 9px; text-transform: uppercase; letter-spacing: 1.5px; color: var(--brass-light);
          }
          .tenant-strip div .v {
            font-size: 14px; font-weight: 600; margin-top: 2px;
          }

          /* Section label */
          .section-label {
            display: flex;
            align-items: center;
            gap: 10px;
            margin: 22px 0 8px;
          }
          .section-label .dot {
            width: 9px; height: 9px; background: var(--brass);
            transform: rotate(45deg);
          }
          .section-label span {
            font-family: 'Lora', serif;
            font-weight: 600;
            font-size: 13.5px;
            letter-spacing: 1px;
            color: var(--navy);
          }
          .section-label .line {
            flex: 1; height: 1px; background: var(--paper-line);
          }

          .reading-table {
            width: 100%;
            border-collapse: collapse;
            background: #fff;
          }
          .reading-table th {
            background: var(--navy);
            color: #fff;
            font-size: 9.5px;
            text-transform: uppercase;
            letter-spacing: 1px;
            padding: 8px 10px;
            text-align: left;
            font-weight: 600;
          }
          .reading-table td {
            padding: 8px 10px;
            font-size: 12px;
            border-bottom: 1px solid var(--paper-line);
            font-family: 'JetBrains Mono', monospace;
          }
          .reading-table td:first-child {
            font-family: 'Inter', sans-serif;
            font-weight: 600;
            color: var(--navy);
          }
          .reading-table tr:last-child td {
            background: #F3EEE1;
            font-weight: 700;
            border-bottom: 2px solid var(--brass);
          }
          .num { text-align: right; }

          .two-col {
            margin-top: 18px;
          }

          .charges-table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid var(--paper-line);
            background: #fff;
          }
          .charges-table td {
            padding: 12px 16px;
            font-size: 14.5px;
            border-bottom: 1px solid var(--paper-line);
          }
          .charges-table td:last-child {
            text-align: right;
            font-family: 'JetBrains Mono', monospace;
            font-weight: 600;
          }
          .charges-table tr.subtotal td {
            border-top: 2px solid var(--navy);
            font-weight: 700;
            font-size: 15px;
          }
          .charges-table tr.grand td {
            background: var(--navy);
            color: #fff;
            font-size: 20px;
            font-weight: 700;
            padding: 16px;
          }
          .charges-table tr.grand td:last-child { color: var(--brass-light); }
          .charges-table tr.overdue td {
            background: #FBEAE9;
            color: var(--red);
            font-weight: 700;
            font-size: 13px;
          }
          .charges-table tr.payment td {
            color: var(--green);
            font-weight: 600;
            font-size: 14px;
          }

          .footer {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-top: 34px;
            padding-top: 14px;
            border-top: 1px solid var(--paper-line);
          }
          .footer .note {
            font-size: 10px;
            color: var(--ink-soft);
            max-width: 60%;
            line-height: 1.6;
          }
          .sign {
            text-align: center;
          }
          .sign .line {
            width: 150px;
            border-bottom: 1px solid var(--ink);
            margin-bottom: 6px;
            height: 34px;
          }
          .sign .role {
            font-size: 11px;
            font-weight: 600;
            color: var(--navy);
            text-transform: uppercase;
          }

          @media print {
            body { background: #fff !important; padding: 0 !important; }
            .a4-invoice-container { padding: 0 !important; background: #fff !important; }
            .a4-page { box-shadow: none !important; margin: 0 !important; padding: 0 !important; }
            .no-print { display: none !important; }
            .app-layout { padding: 0 !important; }
            .sidebar, .header { display: none !important; }
            .main-content { margin: 0 !important; padding: 0 !important; }
          }
        `}</style>

        <div className="a4-page">
          
          {/* Letterhead */}
          <div className="letterhead">
            <div className="crest">
              {settings.logoUrl ? <img src={settings.logoUrl} alt="Logo" /> : crestInitials}
            </div>
            <div>
              <div className="org-name">{orgName}</div>
              <div className="org-addr">{orgAddr}</div>
            </div>
            <div className="doc-tag">
              <div className="label">Invoice No.</div>
              <div className="no">{billNumber}</div>
            </div>
          </div>

          <div className="bill-title">
            <h1>{showElectricity && !showWater && !showRent ? 'SUB METER ELECTRICITY BILL' : 'COMBINED UTILITY BILL'}</h1>
            <div className="rule"></div>
          </div>

          {/* Meta */}
          <div className="meta-grid">
            <div className="meta-cell">
              <div className="k">Billing Month</div>
              <div className="v">{bill.month} {bill.year}</div>
            </div>
            <div className="meta-cell">
              <div className="k">Issue Date</div>
              <div className="v">{formatDate(bill.createdAt)}</div>
            </div>
            <div className="meta-cell">
              <div className="k">Due Date</div>
              <div className="v due">{formatDate(bill.dueDate)}</div>
            </div>
          </div>

          <div className="tenant-strip">
            <div>
              <div className="k">Unit / Tenant</div>
              <div className="v">{tenant.name} — Floor {tenant.floor}, Flat {tenant.flat}</div>
            </div>
            <div>
              <div className="k">Meter No. / Load</div>
              <div className="v">EM-{tenant.flat} {tenant.sectionLoad ? `(${tenant.sectionLoad} KW)` : ''}</div>
            </div>
            <div>
              <div className="k">Status</div>
              <div className="v" style={{ color: bill.status === 'paid' ? 'var(--green)' : (bill.status === 'overdue' ? 'var(--red)' : '#F2C078') }}>
                {bill.status.toUpperCase()}
              </div>
            </div>
          </div>

          {/* Electricity readings */}
          {showElectricity && bill.electricityUnits != null && (
            <>
              <div className="section-label"><div className="dot"></div><span>Electricity — Meter Reading</span><div className="line"></div></div>
              <table className="reading-table">
                <thead>
                  <tr><th>Reading</th><th>Date</th><th className="num">Off-Peak</th><th className="num">Peak</th></tr>
                </thead>
                <tbody>
                  <tr><td>Current</td><td>{formatDate(bill.createdAt)}</td><td className="num">{bill.electricityCurrentReading}</td><td className="num">0</td></tr>
                  <tr><td>Previous</td><td>—</td><td className="num">{bill.electricityPreviousReading}</td><td className="num">0</td></tr>
                  <tr><td>Used Unit</td><td>—</td><td className="num">{bill.electricityUnits} kWh</td><td className="num">0 kWh</td></tr>
                </tbody>
              </table>
            </>
          )}

          {/* Water readings */}
          {showWater && bill.waterUnits != null && (
            <>
              <div className="section-label"><div className="dot"></div><span>Water &amp; Sewerage — Meter Reading</span><div className="line"></div></div>
              <table className="reading-table">
                <thead>
                  <tr><th>Reading</th><th>Date</th><th className="num">Unit</th><th className="num">Rate</th></tr>
                </thead>
                <tbody>
                  <tr><td>Current</td><td>{formatDate(bill.createdAt)}</td><td className="num">{bill.waterCurrentReading}</td><td className="num">{formatCurrency(tenant.waterRate)}</td></tr>
                  <tr><td>Previous</td><td>—</td><td className="num">{bill.waterPreviousReading}</td><td className="num">—</td></tr>
                  <tr><td>Used Unit</td><td>—</td><td className="num">{bill.waterUnits}</td><td className="num">{formatCurrency(bill.waterUnitCost)}</td></tr>
                </tbody>
              </table>
            </>
          )}

          {/* Charges */}
          <div className="section-label"><div className="dot"></div><span>Charge Breakdown</span><div className="line"></div></div>
          <div className="two-col">
            <table className="charges-table">
              <tbody>
                {showRent && <tr><td>House Rent</td><td>{formatCurrency(bill.rent)}</td></tr>}
                
                {showElectricity && (
                  <>
                    {bill.electricityUnits != null ? (
                      <>
                        <tr><td>Energy Charge (Off-Peak)</td><td>{formatCurrency(bill.electricityUnitCost)}</td></tr>
                        {bill.electricityDemandCharge > 0 && <tr><td>Demand Charge</td><td>{formatCurrency(bill.electricityDemandCharge)}</td></tr>}
                      </>
                    ) : (
                      <tr><td>Electricity Bill (Incl. VAT)</td><td>{formatCurrency(bill.electricity)}</td></tr>
                    )}
                  </>
                )}

                {showWater && (
                  <>
                    {bill.waterUnits != null ? (
                      <tr><td>Water &amp; Sewerage Charge</td><td>{formatCurrency(bill.waterUnitCost)}</td></tr>
                    ) : (
                      <tr><td>Washa (Water) Bill (Incl. VAT)</td><td>{formatCurrency(bill.water)}</td></tr>
                    )}
                  </>
                )}

                {showGas && <tr><td>Gas Bill</td><td>{formatCurrency(bill.gas)}</td></tr>}
                {showServiceCharge && <tr><td>Service Charge</td><td>{formatCurrency(bill.serviceCharge)}</td></tr>}
                {showOtherCharges && <tr><td>Other Charges</td><td>{formatCurrency(bill.otherCharges)}</td></tr>}

                {totalVat > 0 && (
                  <>
                    <tr className="subtotal"><td>Subtotal</td><td>{formatCurrency(subTotal)}</td></tr>
                    <tr>
                      <td>VAT {bill.electricityVat > 0 ? `(Electricity ${elecVatRate}%) ` : ''}{bill.waterVat > 0 ? `(Water ${waterVatRate}%)` : ''}</td>
                      <td>{formatCurrency(totalVat)}</td>
                    </tr>
                  </>
                )}

                <tr className="grand"><td>Grand Total</td><td>{formatCurrency(grandTotal)}</td></tr>
                
                {totalPaid > 0 && <tr className="payment"><td>Payments Received</td><td>-{formatCurrency(totalPaid)}</td></tr>}
                
                {bill.status !== 'paid' && (
                  <tr className="overdue">
                    <td>Late Payment Charge (if after due date)</td>
                    <td>+{formatCurrency(lateFeeVal)}</td>
                  </tr>
                )}
                
                {bill.status !== 'paid' && (
                  <tr style={{ fontWeight: 700 }}>
                    <td>Total (If paid after due date)</td>
                    <td>{formatCurrency(totalAfterLateFee)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '16px', fontSize: '13px', color: 'var(--navy)' }}>
            <span>In Words:</span> <strong>Taka {numberToWords(bill.totalAmount)} Only</strong>
          </div>

          {/* Footer */}
          <div className="footer">
            <div className="note">
              Please settle payment before the due date to avoid late charges.<br/>
              For queries, contact the building management office.<br/>
              This is a system-generated bill from Utility Manager.
            </div>
            <div className="sign">
              <div className="line"></div>
              <div className="role">Manager, {orgName}</div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

function numberToWords(num) {
  if (num === 0) return 'Zero'
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  function convert(n) {
    if (n < 20) return ones[n]
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '')
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convert(n % 100) : '')
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '')
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '')
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '')
  }
  return convert(Math.round(num))
}

export default BillPreview
