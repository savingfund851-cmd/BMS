/**
 * Format a numeric amount as Bangladeshi Taka with locale grouping.
 * @param {number|string} amount
 * @returns {string} e.g. "৳19,500"
 */
export function formatCurrency(amount) {
  return '৳' + Number(amount).toLocaleString('en-BD');
}

/**
 * Format an ISO / date string into a human-readable short date.
 * @param {string} dateStr
 * @returns {string} e.g. "05 Jul 2026"
 */
export function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Return the full English month name for a 0-based month index.
 * @param {number} monthIndex 0–11
 * @returns {string}
 */
export function getMonthName(monthIndex) {
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  return months[monthIndex];
}

/**
 * Get the current month name and year.
 * @returns {{ month: string, year: number }}
 */
export function getCurrentMonthYear() {
  const now = new Date();
  return { month: getMonthName(now.getMonth()), year: now.getFullYear() };
}

/**
 * Generate a deterministic bill reference number.
 * @param {string} buildingId
 * @param {string} tenantId
 * @param {string} month   Full month name e.g. "July"
 * @param {number} year
 * @returns {string} e.g. "BILL-B1-JUL-2026-T1"
 */
export function generateBillNumber(buildingId, tenantId, month, year) {
  return `BILL-${buildingId.toUpperCase()}-${month
    .substring(0, 3)
    .toUpperCase()}-${year}-${tenantId.toUpperCase()}`;
}

/**
 * Map a bill / tenant status to a CSS custom-property colour.
 * @param {string} status  "paid" | "pending" | "overdue"
 * @returns {string} CSS variable reference
 */
export function getStatusColor(status) {
  switch (status) {
    case 'paid':
      return 'var(--color-success)';
    case 'pending':
      return 'var(--color-warning)';
    case 'overdue':
      return 'var(--color-error)';
    default:
      return 'var(--color-text-muted)';
  }
}

/**
 * Extract up to two initials from a full name.
 * @param {string} name
 * @returns {string} e.g. "RU" for "Rahim Uddin"
 */
export function getInitials(name) {
  if (!name) return '';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

/**
 * Sum all charge fields on a bill object.
 * @param {object} bill
 * @returns {number}
 */
export function calculateBillTotal(bill) {
  return (
    (bill.rent || 0) +
    (bill.electricity || 0) +
    (bill.water || 0) +
    (bill.gas || 0) +
    (bill.serviceCharge || 0) +
    (bill.otherCharges || 0)
  );
}

const MONTHS_LIST = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Calculate next month's due date for a bill.
 * @param {string} monthName
 * @param {number|string} yearVal
 * @param {number} dueDay
 * @returns {string} YYYY-MM-DD
 */
export function calcDueDate(monthName, yearVal, dueDay = 10) {
  const mIndex = MONTHS_LIST.indexOf(monthName);
  if (mIndex === -1) return '';
  const y = parseInt(yearVal, 10);
  let nextMIndex = mIndex + 1;
  let nextYear = y;
  if (nextMIndex > 11) {
    nextMIndex = 0;
    nextYear = y + 1;
  }
  const mStr = String(nextMIndex + 1).padStart(2, '0');
  const dStr = String(dueDay).padStart(2, '0');
  return `${nextYear}-${mStr}-${dStr}`;
}

/**
 * Get effective due date for a bill.
 * Auto-corrects legacy bills where due date was set in the bill's month instead of next month.
 * @param {object} bill
 * @param {number} defaultDueDay
 * @returns {string} YYYY-MM-DD
 */
export function getEffectiveDueDate(bill, defaultDueDay = 10) {
  if (!bill || !bill.dueDate) return bill?.dueDate || '';
  if (!bill.month || !bill.year) return bill.dueDate;

  const mIndex = MONTHS_LIST.indexOf(bill.month);
  if (mIndex === -1) return bill.dueDate;

  const parts = String(bill.dueDate).split('-');
  if (parts.length === 3) {
    const dueYear = parseInt(parts[0], 10);
    const dueMonth = parseInt(parts[1], 10) - 1; // 0-based
    const dueDay = parseInt(parts[2], 10);

    // If due date was saved in the same month as the bill (e.g. July bill with July due date),
    // auto-adjust to next month (August)
    if (dueYear === parseInt(bill.year, 10) && dueMonth === mIndex) {
      return calcDueDate(bill.month, bill.year, dueDay || defaultDueDay);
    }
  }
  return bill.dueDate;
}

/**
 * Determine dynamic status based on due date.
 * If pending/partial and past due date, it becomes overdue.
 * @param {object} bill
 * @returns {string} e.g. "paid", "pending", "overdue", "partial"
 */
export function getDynamicBillStatus(bill) {
  let status = bill.status || 'pending';
  if (status === 'pending' || status === 'partial') {
    const dueDate = getEffectiveDueDate(bill);
    if (dueDate) {
      const today = new Date().toISOString().split('T')[0];
      if (dueDate < today) {
        status = 'overdue';
      }
    }
  }
  return status;
}
