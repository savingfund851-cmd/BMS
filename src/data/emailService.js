/**
 * Email Service for sending bills to tenants.
 * Supports two modes:
 *   1. EmailJS (automatic) — if configured in Settings
 *   2. mailto: (manual) — opens user's email client as fallback
 */

import { settingsStore } from './store'

/**
 * Generate HTML email body for a bill
 */
function generateBillEmailBody(tenant, bill, building, settings) {
  const companyName = settings.companyName || 'RentFlow'
  const items = []

  if (bill.rent) items.push(`<tr><td style="padding:8px 12px;border-bottom:1px solid #eee">Rent</td><td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right">৳${Number(bill.rent).toLocaleString()}</td></tr>`)
  if (bill.electricity) items.push(`<tr><td style="padding:8px 12px;border-bottom:1px solid #eee">Electricity</td><td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right">৳${Number(bill.electricity).toLocaleString()}</td></tr>`)
  if (bill.water) items.push(`<tr><td style="padding:8px 12px;border-bottom:1px solid #eee">Water & Sewerage Bill</td><td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right">৳${Number(bill.water).toLocaleString()}</td></tr>`)
  if (bill.gas) items.push(`<tr><td style="padding:8px 12px;border-bottom:1px solid #eee">Gas</td><td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right">৳${Number(bill.gas).toLocaleString()}</td></tr>`)
  if (bill.serviceCharge) items.push(`<tr><td style="padding:8px 12px;border-bottom:1px solid #eee">Service Charge</td><td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right">৳${Number(bill.serviceCharge).toLocaleString()}</td></tr>`)
  if (bill.otherCharges) items.push(`<tr><td style="padding:8px 12px;border-bottom:1px solid #eee">Other Charges</td><td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right">৳${Number(bill.otherCharges).toLocaleString()}</td></tr>`)

  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
      <div style="background:linear-gradient(135deg,#10b981,#06d6a0);padding:24px;text-align:center">
        <h1 style="color:#fff;margin:0;font-size:22px">${companyName}</h1>
        <p style="color:rgba(255,255,255,0.85);margin:4px 0 0;font-size:14px">Monthly Bill Statement</p>
      </div>
      <div style="padding:24px">
        <p style="color:#374151;margin:0 0 16px">Dear <strong>${tenant.name}</strong>,</p>
        <p style="color:#6b7280;margin:0 0 20px;font-size:14px">Here is your bill for <strong>${bill.month} ${bill.year}</strong> at <strong>${building?.name || ''}</strong>, Flat: <strong>${tenant.flat}</strong>.</p>
        
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
          <thead>
            <tr style="background:#f9fafb">
              <th style="padding:10px 12px;text-align:left;font-size:13px;color:#6b7280;text-transform:uppercase">Item</th>
              <th style="padding:10px 12px;text-align:right;font-size:13px;color:#6b7280;text-transform:uppercase">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${items.join('')}
            <tr style="background:#f0fdf4">
              <td style="padding:12px;font-weight:700;color:#065f46;font-size:15px">Total Amount</td>
              <td style="padding:12px;font-weight:700;color:#065f46;text-align:right;font-size:15px">৳${Number(bill.totalAmount).toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:6px;padding:12px;margin-bottom:20px">
          <p style="margin:0;color:#92400e;font-size:13px"><strong>Due Date:</strong> ${bill.dueDate || 'N/A'}</p>
          <p style="margin:4px 0 0;color:#92400e;font-size:13px"><strong>Status:</strong> ${bill.status?.toUpperCase() || 'PENDING'}</p>
        </div>

        <p style="color:#6b7280;font-size:13px;margin:0">If you have already made the payment, please disregard this notice.</p>
        <p style="color:#6b7280;font-size:13px;margin:8px 0 0">Thank you for your timely payments.</p>
      </div>
      <div style="background:#f9fafb;padding:16px;text-align:center;border-top:1px solid #e5e7eb">
        <p style="color:#9ca3af;font-size:12px;margin:0">${companyName} • ${settings.companyAddress || ''}</p>
      </div>
    </div>
  `
}

/**
 * Generate plain text version for mailto
 */
function generatePlainText(tenant, bill, building, settings) {
  const companyName = settings.companyName || 'RentFlow'
  let text = `${companyName} - Monthly Bill Statement\n`
  text += `${'='.repeat(40)}\n\n`
  text += `Dear ${tenant.name},\n\n`
  text += `Here is your bill for ${bill.month} ${bill.year}\n`
  text += `Building: ${building?.name || ''}\n`
  text += `Flat: ${tenant.flat}\n\n`
  text += `--- Bill Details ---\n`
  if (bill.rent) text += `Rent: ৳${Number(bill.rent).toLocaleString()}\n`
  if (bill.electricity) text += `Electricity: ৳${Number(bill.electricity).toLocaleString()}\n`
  if (bill.water) text += `Water: ৳${Number(bill.water).toLocaleString()}\n`
  if (bill.gas) text += `Gas: ৳${Number(bill.gas).toLocaleString()}\n`
  if (bill.serviceCharge) text += `Service Charge: ৳${Number(bill.serviceCharge).toLocaleString()}\n`
  if (bill.otherCharges) text += `Other Charges: ৳${Number(bill.otherCharges).toLocaleString()}\n`
  text += `${'─'.repeat(30)}\n`
  text += `TOTAL: ৳${Number(bill.totalAmount).toLocaleString()}\n\n`
  text += `Due Date: ${bill.dueDate || 'N/A'}\n`
  text += `Status: ${bill.status?.toUpperCase() || 'PENDING'}\n\n`
  text += `If you have already made the payment, please disregard this notice.\n`
  text += `Thank you.\n\n`
  text += `${companyName}`
  return text
}

/**
 * Send bill email to a tenant.
 * Returns { success: boolean, method: 'emailjs' | 'mailto', error?: string }
 */
export async function sendBillEmail(tenant, bill, building) {
  const settings = settingsStore.get() || {}
  const emailConfig = settings.emailConfig || {}

  if (!tenant.email) {
    return { success: false, error: 'Tenant has no email address' }
  }

  const subject = `${settings.companyName || 'RentFlow'} - Bill for ${bill.month} ${bill.year} | Flat ${tenant.flat}`

  // Try EmailJS if configured
  if (emailConfig.serviceId && emailConfig.templateId && emailConfig.publicKey) {
    try {
      // Dynamically load EmailJS
      const emailjs = await import('https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js')
      
      await emailjs.send(emailConfig.serviceId, emailConfig.templateId, {
        to_email: tenant.email,
        to_name: tenant.name,
        subject: subject,
        message_html: generateBillEmailBody(tenant, bill, building, settings),
        from_name: settings.companyName || 'RentFlow',
        bill_month: bill.month,
        bill_year: bill.year,
        bill_total: `৳${Number(bill.totalAmount).toLocaleString()}`,
        tenant_flat: tenant.flat,
        building_name: building?.name || '',
        due_date: bill.dueDate || 'N/A'
      }, emailConfig.publicKey)

      return { success: true, method: 'emailjs' }
    } catch (err) {
      console.error('EmailJS failed, falling back to mailto:', err)
      // Fall through to mailto
    }
  }

  // Fallback: mailto link
  try {
    const body = generatePlainText(tenant, bill, building, settings)
    const mailtoUrl = `mailto:${encodeURIComponent(tenant.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.open(mailtoUrl, '_blank')
    return { success: true, method: 'mailto' }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

/**
 * Send multiple bill emails (for batch operations after bill generation)
 */
export async function sendBulkBillEmails(billTenantPairs) {
  const results = []
  for (const { tenant, bill, building } of billTenantPairs) {
    const result = await sendBillEmail(tenant, bill, building)
    results.push({ tenantId: tenant.id, billId: bill.id, ...result })
    // Small delay between emails to avoid rate limiting
    await new Promise(r => setTimeout(r, 300))
  }
  return results
}
