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
