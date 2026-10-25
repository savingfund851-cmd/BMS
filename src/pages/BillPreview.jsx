import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Printer, Edit3, Lock, X } from 'lucide-react'
import { billStore, tenantStore, buildingStore, settingsStore, paymentStore, userStore, meterReadingStore } from '../data/store'
import { formatCurrency, formatDate, generateBillNumber, getEffectiveDueDate, getDynamicBillStatus } from '../data/helpers'

function BillPreview() {
  const { billId } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [bill, setBill] = useState(null)
  const [tenant, setTenant] = useState(null)
  const [building, setBuilding] = useState(null)
  const [settings, setSettings] = useState({})
  const [payments, setPayments] = useState([])
  const [totalPaid, setTotalPaid] = useState(0)
  const [currentUser, setCurrentUser] = useState(null)

  // Edit Modal State
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authPassword, setAuthPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({
    month: '',
    year: '',
    billType: '',
    electricityCurrentReading: '',
    waterCurrentReading: '',
    rent: 0, electricity: 0, water: 0, gas: 0, serviceCharge: 0, otherCharges: 0
  })

  useEffect(() => {
    const fetchData = () => {
      const b = billStore.getById(billId)
      if (b) {
        setBill(b)
        setTenant(tenantStore.getById(b.tenantId))
        setBuilding(buildingStore.getById(b.buildingId))
        setSettings(settingsStore.get() || {})
        
        const allPayments = paymentStore.getAll()
        const bPayments = allPayments.filter(p => p.billId === b.id)
        setPayments(bPayments)
        setTotalPaid(bPayments.reduce((sum, p) => sum + p.amount, 0))
      }
      setCurrentUser(JSON.parse(sessionStorage.getItem('tba_current_user') || '{}'))
    }
    fetchData()

    const handler = () => fetchData()
    window.addEventListener('storeUpdated', handler)
    return () => window.removeEventListener('storeUpdated', handler)
  }, [billId])

  useEffect(() => {
    if (searchParams.get('edit') === 'true' && bill && !showAuthModal && !showEditModal) {
      // Clear the edit param so it doesn't trigger again on re-renders
      const params = new URLSearchParams(searchParams)
      params.delete('edit')
      setSearchParams(params, { replace: true })
      
      handleEditClick()
    }
  }, [searchParams, bill, showAuthModal, showEditModal])

  // Dynamically set document.title so PDF save filename uses: Tenant Name - Bill Type - Month Year
  useEffect(() => {
    if (tenant && bill) {
      const prevTitle = document.title
      const titleType = getBillTitle()
      const formattedTitleType = titleType.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
      document.title = `${tenant.name} - ${formattedTitleType} - ${bill.month} ${bill.year}`
      return () => {
        document.title = prevTitle
      }
    }
  }, [tenant, bill])

  const handlePrint = () => { window.print() }

  const handleEditClick = () => {
    setAuthPassword('')
    setAuthError('')
    setShowAuthModal(true)
  }

  const handleAuthSubmit = async (e) => {
    e.preventDefault()
    setAuthError('')
    const verified = await userStore.authenticate(currentUser.username, authPassword)
    if (verified) {
      setShowAuthModal(false)
      setEditForm({
        month: bill.month || '',
        year: bill.year || '',
        billType: bill.billType || 'both',
        electricityPreviousReading: bill.electricityPreviousReading ?? '',
        electricityCurrentReading: bill.electricityCurrentReading ?? '',
        waterPreviousReading: bill.waterPreviousReading ?? '',
        waterCurrentReading: bill.waterCurrentReading ?? '',
        rent: bill.rent || 0,
        electricity: bill.electricity || 0,
        water: bill.water || 0,
        gas: bill.gas || 0,
        serviceCharge: bill.serviceCharge || 0,
        otherCharges: bill.otherCharges || 0
      })
      setShowEditModal(true)
    } else {
      setAuthError('Incorrect password')
    }
  }

  // Real-time calculations inside the Edit Modal
  const getElecCalc = () => {
    const rawPrev = editForm.electricityPreviousReading !== '' ? editForm.electricityPreviousReading : bill?.electricityPreviousReading;
    const rawCurr = editForm.electricityCurrentReading !== '' ? editForm.electricityCurrentReading : bill?.electricityCurrentReading;
    if (rawPrev == null || rawCurr == null || rawPrev === '' || rawCurr === '') return null;
    const prev = parseFloat(rawPrev) || 0;
    const current = parseFloat(rawCurr) || 0;
    const units = Math.max(0, current - prev);
    const unitCost = units * (tenant.electricityRate || 0);
    const globalDemandRate = settings.electricityDemandRate ?? 90;
    const demandCharge = (tenant.sectionLoad || 0) * globalDemandRate;
    const subTotal = unitCost + demandCharge;
    const vatRate = (settings.electricityVatRate ?? 5) / 100;
    const vat = subTotal * vatRate;
    return { prev, current, units, unitCost, demandCharge, subTotal, vat, total: subTotal + vat };
  }

  const getWaterCalc = () => {
    const rawPrev = editForm.waterPreviousReading !== '' ? editForm.waterPreviousReading : bill?.waterPreviousReading;
    const rawCurr = editForm.waterCurrentReading !== '' ? editForm.waterCurrentReading : bill?.waterCurrentReading;
    if (rawPrev == null || rawCurr == null || rawPrev === '' || rawCurr === '') return null;
    const prev = parseFloat(rawPrev) || 0;
    const current = parseFloat(rawCurr) || 0;
    const units = Math.max(0, current - prev);
    const waterCharge = units * (tenant.waterRate || 0);
    const sewerageCharge = waterCharge;
    const subTotal = waterCharge + sewerageCharge;
    const vatRate = (settings.waterVatRate ?? 15) / 100;
    const vat = subTotal * vatRate;
    return { prev, current, units, waterCharge, sewerageCharge, subTotal, vat, total: subTotal + vat };
  }

  const elecCalc = (editForm.billType !== 'water') ? getElecCalc() : null;
  const waterCalc = (editForm.billType !== 'electricity') ? getWaterCalc() : null;

  const displayElectricity = elecCalc ? Math.round(elecCalc.total) : parseFloat(editForm.electricity) || 0;
  const displayWater = waterCalc ? Math.round(waterCalc.total) : parseFloat(editForm.water) || 0;

  const editTotal = (parseFloat(editForm.rent) || 0) + displayElectricity + displayWater + (parseFloat(editForm.gas) || 0) + (parseFloat(editForm.serviceCharge) || 0) + (parseFloat(editForm.otherCharges) || 0);

  const handleEditSubmit = async (e) => {
    e.preventDefault()

    const hasElec = editForm.billType !== 'water';
    const hasWater = editForm.billType !== 'electricity';

    const ePrev = hasElec ? (parseFloat(editForm.electricityPreviousReading) >= 0 ? parseFloat(editForm.electricityPreviousReading) : (bill.electricityPreviousReading ?? null)) : null;
    const eCurr = hasElec ? (parseFloat(editForm.electricityCurrentReading) >= 0 ? parseFloat(editForm.electricityCurrentReading) : (bill.electricityCurrentReading ?? null)) : null;

    const wPrev = hasWater ? (parseFloat(editForm.waterPreviousReading) >= 0 ? parseFloat(editForm.waterPreviousReading) : (bill.waterPreviousReading ?? null)) : null;
    const wCurr = hasWater ? (parseFloat(editForm.waterCurrentReading) >= 0 ? parseFloat(editForm.waterCurrentReading) : (bill.waterCurrentReading ?? null)) : null;

    const eCalc = hasElec && ePrev != null && eCurr != null ? getElecCalc() : null;
    const wCalc = hasWater && wPrev != null && wCurr != null ? getWaterCalc() : null;

    const eTotal = hasElec ? (eCalc ? Math.round(eCalc.total) : (parseFloat(editForm.electricity) || 0)) : 0;
    const wTotal = hasWater ? (wCalc ? Math.round(wCalc.total) : (parseFloat(editForm.water) || 0)) : 0;

    const rentVal = parseFloat(editForm.rent) || 0;
    const gasVal = parseFloat(editForm.gas) || 0;
    const svcVal = parseFloat(editForm.serviceCharge) || 0;
    const othVal = parseFloat(editForm.otherCharges) || 0;

    const updatedData = {
      month: editForm.month,
      year: parseInt(editForm.year) || bill.year,
      billType: editForm.billType,

      rent: rentVal,
      gas: gasVal,
      serviceCharge: svcVal,
      otherCharges: othVal,

      electricityPreviousReading: ePrev,
      electricityCurrentReading: eCurr,
      electricityUnits: eCalc ? eCalc.units : (hasElec ? (bill.electricityUnits || 0) : 0),
      electricityUnitCost: eCalc ? eCalc.unitCost : (hasElec ? (bill.electricityUnitCost || 0) : 0),
      electricityDemandCharge: eCalc ? eCalc.demandCharge : (hasElec ? (bill.electricityDemandCharge || 0) : 0),
      electricityVat: eCalc ? Math.round(eCalc.vat) : (hasElec ? (bill.electricityVat || 0) : 0),
      electricity: eTotal,

      waterPreviousReading: wPrev,
      waterCurrentReading: wCurr,
      waterUnits: wCalc ? wCalc.units : (hasWater ? (bill.waterUnits || 0) : 0),
      waterUnitCost: wCalc ? wCalc.subTotal : (hasWater ? (bill.waterUnitCost || 0) : 0),
      waterVat: wCalc ? Math.round(wCalc.vat) : (hasWater ? (bill.waterVat || 0) : 0),
      water: wTotal,

      totalAmount: rentVal + eTotal + wTotal + gasVal + svcVal + othVal
    };

    try {
      const res = await billStore.update(bill.id, updatedData);
      const mergedBill = res || { ...bill, ...updatedData };
      setBill(mergedBill);

      // Keep meterReadingStore in sync if meter reading record exists
      try {
        const allReadings = meterReadingStore.getAll();
        const existingReading = allReadings.find(r => r.tenantId === bill.tenantId && r.month === bill.month && Number(r.year) === Number(bill.year));
        if (existingReading) {
          await meterReadingStore.update(existingReading.id, {
            month: updatedData.month,
            year: updatedData.year,
            electricityPreviousReading: ePrev,
            electricityCurrentReading: eCurr,
            electricityUnits: updatedData.electricityUnits,
            waterPreviousReading: wPrev,
            waterCurrentReading: wCurr,
            waterUnits: updatedData.waterUnits
          });
        }
      } catch (mErr) {
        console.warn('Meter reading sync notice:', mErr);
      }

      setShowEditModal(false);
    } catch (err) {
      console.error('Error updating bill:', err);
      setBill(prev => ({ ...prev, ...updatedData }));
      setShowEditModal(false);
      alert('Updated locally! Note: Supabase connection warning: ' + (err.message || err));
    }
  }

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

  // Bill title logic
  const getBillTitle = () => {
    if (showElectricity && !showWater && !showRent) return 'ELECTRICITY BILL'
    if (showWater && !showElectricity && !showRent) return 'WATER & SEWERAGE BILL'
    return 'COMBINED BILL'
  }

  const elecVatRate = settings.electricityVatRate ?? 5
  const waterVatRate = settings.waterVatRate ?? 15

  // Header: always BMS + building name/address
  const orgName = building.name
  const orgAddr = building.address

  const totalVat = (bill.electricityVat || 0) + (bill.waterVat || 0)
  const subTotal = bill.totalAmount - totalVat

  const lateFeeVal = (bill.totalAmount * (settings.lateFeePercentage || 5)) / 100
  const grandTotal = bill.totalAmount
  const amountDue = Math.max(0, grandTotal - totalPaid)
  const lateFeeDiscount = bill.lateFeeDiscount || 0
  const totalAfterLateFee = amountDue + Math.max(0, lateFeeVal - lateFeeDiscount)

  return (
    <>
      <div className="page-header no-print" style={{ padding: '20px', maxWidth: '210mm', margin: '0 auto', display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/billing')}>
            <ArrowLeft size={16} />
            <span>Back to Billing</span>
          </button>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {(currentUser?.role === 'admin' || currentUser?.role === 'superadmin') && (
            <button className="btn btn-secondary" onClick={handleEditClick}>
              <Edit3 size={18} />
              <span>Edit Bill</span>
            </button>
          )}
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
            padding: 10mm 12mm 10mm;
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
            margin: 10px 0 2px;
          }
          .bill-title h1 {
            font-family: 'Lora', serif;
            font-size: 14px;
            letter-spacing: 4px;
            text-transform: uppercase;
            color: var(--navy);
            margin: 0;
            font-weight: 600;
          }
          .bill-title .rule {
            width: 60px; height: 2px; background: var(--brass);
            margin: 4px auto 0;
          }

          /* Meta strip */
          .meta-grid {
            display: grid;
            grid-template-columns: 1.3fr 1fr 1fr;
            gap: 0;
            margin-top: 10px;
            border: 1px solid var(--paper-line);
            background: #fff;
          }
          .meta-cell {
            padding: 8px 12px;
            border-right: 1px solid var(--paper-line);
          }
          .meta-cell:last-child { border-right: none; }
          .meta-cell .k {
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            color: var(--ink-soft);
            font-weight: 600;
          }
          .meta-cell .v {
            font-size: 13px;
            font-weight: 600;
            color: var(--navy);
            margin-top: 2px;
          }
          .meta-cell .v.due { color: var(--red); }

          .tenant-strip {
            display: flex;
            justify-content: space-between;
            margin-top: 8px;
            padding: 8px 12px;
            background: var(--navy);
            color: #fff;
          }
          .tenant-strip div .k {
            font-size: 8.5px; text-transform: uppercase; letter-spacing: 1.5px; color: var(--brass-light);
          }
          .tenant-strip div .v {
            font-size: 13px; font-weight: 600; margin-top: 2px;
          }

          /* Section label */
          .section-label {
            display: flex;
            align-items: center;
            gap: 8px;
            margin: 12px 0 6px;
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
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 1px;
            padding: 6px 8px;
            text-align: left;
            font-weight: 600;
          }
          .reading-table td {
            padding: 6px 8px;
            font-size: 11.5px;
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
            margin-top: 10px;
          }

          .charges-table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid var(--paper-line);
            background: #fff;
          }
          .charges-table td {
            padding: 7px 12px;
            font-size: 13px;
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
            font-size: 13.5px;
          }
          .charges-table tr.grand td {
            background: var(--navy);
            color: #fff;
            font-size: 17px;
            font-weight: 700;
            padding: 10px 12px;
          }
          .charges-table tr.grand td:last-child { color: var(--brass-light); }
          .charges-table tr.overdue td {
            background: #FBEAE9;
            color: var(--red);
            font-weight: 700;
            font-size: 12px;
          }
          .charges-table tr.payment td {
            color: var(--green);
            font-weight: 600;
            font-size: 12.5px;
          }

          .footer {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-top: 16px;
            padding-top: 8px;
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

          @page {
            size: A4 portrait;
            margin: 0;
          }
          @media print {
            html, body {
              width: 210mm !important;
              height: 297mm !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow: hidden !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .a4-invoice-container { padding: 0 !important; background: #fff !important; margin: 0 !important; }
            .a4-page {
              box-shadow: none !important;
              margin: 0 !important;
              width: 210mm !important;
              height: 297mm !important;
              min-height: 297mm !important;
              max-height: 297mm !important;
              padding: 10mm 12mm !important;
              overflow: hidden !important;
              page-break-inside: avoid !important;
              page-break-after: avoid !important;
            }
            .no-print { display: none !important; }
            .app-layout, .main-area, .main-content { padding: 0 !important; margin: 0 !important; overflow: visible !important; }
            .sidebar, .header { display: none !important; }
          }
        `}</style>

        <div className="a4-page">
          
          {/* Letterhead */}
          <div className="letterhead">
            <div style={{ flex: 1 }}>
              <div className="org-name" style={{ fontSize: '24px', letterSpacing: '0.5px', fontWeight: 800 }}>{orgName}</div>
              <div style={{ fontSize: '12px', color: 'var(--ink-soft)', marginTop: '2px' }}>{orgAddr}</div>
            </div>
            <div className="doc-tag">
              <div className="label">Invoice No.</div>
              <div className="no">{billNumber}</div>
            </div>
          </div>

          <div className="bill-title">
            <h1>{getBillTitle()}</h1>
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
              <div className="v due">{formatDate(getEffectiveDueDate(bill, settings.billDueDay || 10))}</div>
            </div>
          </div>

          <div className="tenant-strip">
            <div>
              <div className="k">Unit / Tenant</div>
              <div className="v">{tenant.name} — Floor {tenant.floor}, Flat {tenant.flat}</div>
            </div>
            {showElectricity && (
              <div>
                <div className="k">Electricity Meter No.</div>
                <div className="v">{tenant.electricityMeterNo || `EM-${tenant.flat}`}</div>
              </div>
            )}
            {showWater && (
              <div>
                <div className="k">W&S Meter No.</div>
                <div className="v">{tenant.waterMeterNo || `WM-${tenant.flat}`}</div>
              </div>
            )}
          </div>

          {/* Electricity readings */}
          {showElectricity && bill.electricityUnits != null && (
            <>
              <div className="section-label"><div className="dot"></div><span>Electricity — Meter Reading</span><div className="line"></div></div>
              <table className="reading-table">
                <thead>
                  <tr><th>Reading</th><th>Date</th><th className="num">Unit (Flat Rate)</th><th className="num">Amount</th></tr>
                </thead>
                <tbody>
                  <tr><td>Current</td><td>{formatDate(bill.createdAt)}</td><td className="num">{bill.electricityCurrentReading}</td><td className="num">—</td></tr>
                  <tr><td>Previous</td><td>—</td><td className="num">{bill.electricityPreviousReading}</td><td className="num">—</td></tr>
                  <tr><td>Unit Used</td><td>—</td><td className="num">{bill.electricityUnits} Unit</td><td className="num">—</td></tr>
                  <tr><td>Rate per Unit</td><td>—</td><td className="num">—</td><td className="num">{formatCurrency(tenant.electricityRate)}/Unit</td></tr>
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
                  <tr><th>Reading</th><th>Date</th><th className="num">Unit</th><th className="num">Amount</th></tr>
                </thead>
                <tbody>
                  <tr><td>Current</td><td>{formatDate(bill.createdAt)}</td><td className="num">{bill.waterCurrentReading}</td><td className="num">—</td></tr>
                  <tr><td>Previous</td><td>—</td><td className="num">{bill.waterPreviousReading}</td><td className="num">—</td></tr>
                  <tr><td>Unit Used</td><td>—</td><td className="num">{bill.waterUnits} Unit</td><td className="num">—</td></tr>
                  <tr><td>Rate per Unit</td><td>—</td><td className="num">—</td><td className="num">{formatCurrency(tenant.waterRate)}/Unit</td></tr>
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
                        <tr><td>Energy Charge</td><td>{formatCurrency(bill.electricityUnitCost)}</td></tr>
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
                      <>
                        <tr><td>Water Charge</td><td>{formatCurrency(bill.waterCharge ?? bill.waterUnitCost / 2)}</td></tr>
                        <tr><td>Sewerage Charge</td><td>{formatCurrency(bill.sewerageCharge ?? bill.waterUnitCost / 2)}</td></tr>
                      </>
                    ) : (
                      <tr><td>Water &amp; Sewerage Bill (Incl. VAT)</td><td>{formatCurrency(bill.water)}</td></tr>
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
                      <td>VAT {bill.electricityVat > 0 ? `(Electricity ${elecVatRate}%) ` : ''}{bill.waterVat > 0 ? `(W&S ${waterVatRate}%)` : ''}</td>
                      <td>{formatCurrency(totalVat)}</td>
                    </tr>
                  </>
                )}

                <tr className="grand"><td>Grand Total</td><td>{formatCurrency(grandTotal)}</td></tr>
                
                {totalPaid > 0 && <tr className="payment"><td>Payments Received</td><td>-{formatCurrency(totalPaid)}</td></tr>}
                
                {getDynamicBillStatus(bill) !== 'paid' && (
                  <>
                    <tr className="overdue">
                      <td>Late Payment Charge (if after due date)</td>
                      <td>+{formatCurrency(lateFeeVal)}</td>
                    </tr>
                    {lateFeeDiscount > 0 && (
                      <tr className="overdue" style={{ color: 'var(--green)' }}>
                        <td>Late Fee Discount</td>
                        <td>-{formatCurrency(lateFeeDiscount)}</td>
                      </tr>
                    )}
                    <tr style={{ fontWeight: 700 }}>
                      <td>Total (If paid after due date)</td>
                      <td>{formatCurrency(totalAfterLateFee)}</td>
                    </tr>
                  </>
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
              <span style={{ display: 'inline-block', marginTop: '4px', color: 'var(--ink-soft)' }}>
                system generated invoice | software powered by: <strong style={{ fontSize: '12px', color: 'var(--navy)', fontWeight: 800 }}>BMS</strong> (Building Management System)
              </span>
            </div>
            <div className="sign">
              <div className="line"></div>
              <div className="role">Manager, {orgName}</div>
            </div>
          </div>
        </div>
      </div>

      {/* AUTH MODAL */}
      {showAuthModal && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 9999 }}>
          <div className="modal-content animate-slide-up" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>Admin Verification</h3>
              <button className="btn-close" onClick={() => setShowAuthModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ color: '#94a3b8', marginBottom: '15px', fontSize: '0.9rem' }}>
                Please enter your password to edit this bill.
              </p>
              {authError && (
                <div style={{ padding: '10px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '6px', marginBottom: '15px', fontSize: '0.9rem' }}>
                  {authError}
                </div>
              )}
              <form onSubmit={handleAuthSubmit}>
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>
                      <Lock size={18} />
                    </span>
                    <input
                      type="password"
                      className="form-input"
                      style={{ paddingLeft: '40px' }}
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="Enter admin password"
                      required
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAuthModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Verify</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEditModal && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 9999 }}>
          <div className="modal-content animate-slide-up" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Edit Bill Items</h3>
              <button className="btn-close" onClick={() => setShowEditModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <form onSubmit={handleEditSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Month</label>
                    <select className="form-select" value={editForm.month} onChange={e => setEditForm({...editForm, month: e.target.value})}>
                      {['January','February','March','April','May','June','July','August','September','October','November','December'].map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Year</label>
                    <input type="number" className="form-input" value={editForm.year} onChange={e => setEditForm({...editForm, year: e.target.value})} min="2024" max="2030" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Bill Type</label>
                  <select className="form-select" value={editForm.billType} onChange={e => setEditForm({...editForm, billType: e.target.value})}>
                    <option value="both">Electricity + Water & Sewerage</option>
                    <option value="electricity">Electricity Only</option>
                    <option value="water">Water & Sewerage Only</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Rent</label>
                  <input type="number" className="form-input" value={editForm.rent} onChange={e => setEditForm({...editForm, rent: e.target.value})} min="0" step="0.01" />
                </div>
                {editForm.billType !== 'water' && (
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', marginBottom: '14px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '8px', color: 'var(--color-primary, #10b981)' }}>⚡ Electricity Meter Reading</div>
                    <div className="form-row">
                      <div className="form-group" style={{ marginBottom: '6px' }}>
                        <label className="form-label">Prev Reading</label>
                        <input type="number" className="form-input" value={editForm.electricityPreviousReading} onChange={e => setEditForm({...editForm, electricityPreviousReading: e.target.value})} step="any" placeholder="0" />
                      </div>
                      <div className="form-group" style={{ marginBottom: '6px' }}>
                        <label className="form-label">Current Reading</label>
                        <input type="number" className="form-input" value={editForm.electricityCurrentReading} onChange={e => setEditForm({...editForm, electricityCurrentReading: e.target.value})} step="any" placeholder="0" />
                      </div>
                    </div>
                    {elecCalc ? (
                      <small style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                        Used: {elecCalc.units} kWh • Energy: ৳{Math.round(elecCalc.unitCost).toLocaleString()} • Demand: ৳{Math.round(elecCalc.demandCharge).toLocaleString()} • VAT: ৳{Math.round(elecCalc.vat).toLocaleString()} • <strong>Total: ৳{displayElectricity.toLocaleString()}</strong>
                      </small>
                    ) : (
                      <div className="form-group" style={{ marginTop: '8px' }}>
                        <label className="form-label">Electricity Total (Fixed)</label>
                        <input type="number" className="form-input" value={editForm.electricity} onChange={e => setEditForm({...editForm, electricity: e.target.value})} min="0" step="0.01" />
                      </div>
                    )}
                  </div>
                )}

                {editForm.billType !== 'electricity' && (
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', marginBottom: '14px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '8px', color: '#06b6d4' }}>💧 Water & Sewerage Meter Reading</div>
                    <div className="form-row">
                      <div className="form-group" style={{ marginBottom: '6px' }}>
                        <label className="form-label">Prev Reading</label>
                        <input type="number" className="form-input" value={editForm.waterPreviousReading} onChange={e => setEditForm({...editForm, waterPreviousReading: e.target.value})} step="any" placeholder="0" />
                      </div>
                      <div className="form-group" style={{ marginBottom: '6px' }}>
                        <label className="form-label">Current Reading</label>
                        <input type="number" className="form-input" value={editForm.waterCurrentReading} onChange={e => setEditForm({...editForm, waterCurrentReading: e.target.value})} step="any" placeholder="0" />
                      </div>
                    </div>
                    {waterCalc ? (
                      <small style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                        Used: {waterCalc.units} unit • Water: ৳{Math.round(waterCalc.waterCharge).toLocaleString()} • Sewerage: ৳{Math.round(waterCalc.sewerageCharge).toLocaleString()} • VAT: ৳{Math.round(waterCalc.vat).toLocaleString()} • <strong>Total: ৳{displayWater.toLocaleString()}</strong>
                      </small>
                    ) : (
                      <div className="form-group" style={{ marginTop: '8px' }}>
                        <label className="form-label">Water & Sewerage Total (Fixed)</label>
                        <input type="number" className="form-input" value={editForm.water} onChange={e => setEditForm({...editForm, water: e.target.value})} min="0" step="0.01" />
                      </div>
                    )}
                  </div>
                )}
                
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Gas Bill</label>
                    <input type="number" className="form-input" value={editForm.gas} onChange={e => setEditForm({...editForm, gas: e.target.value})} min="0" step="0.01" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Service Charge</label>
                    <input type="number" className="form-input" value={editForm.serviceCharge} onChange={e => setEditForm({...editForm, serviceCharge: e.target.value})} min="0" step="0.01" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Other Charges</label>
                  <input type="number" className="form-input" value={editForm.otherCharges} onChange={e => setEditForm({...editForm, otherCharges: e.target.value})} min="0" step="0.01" />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Save Changes</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
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
