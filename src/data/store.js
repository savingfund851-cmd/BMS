// localStorage keys
const KEYS = {
  BUILDINGS: 'tba_buildings',
  TENANTS: 'tba_tenants',
  BILLS: 'tba_bills',
  PAYMENTS: 'tba_payments',
  SETTINGS: 'tba_settings',
  USERS: 'tba_users',
  METER_READINGS: 'tba_meter_readings'
};

// ---------------------------------------------------------------------------
// Generic CRUD helpers
// ---------------------------------------------------------------------------

function getAll(key) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function getById(key, id) {
  const items = getAll(key);
  return items.find((item) => item.id === id) || null;
}

function save(key, items) {
  localStorage.setItem(key, JSON.stringify(items));
}

function add(key, item) {
  const items = getAll(key);
  const newItem = {
    ...item,
    id: item.id || crypto.randomUUID(),
    createdAt: item.createdAt || new Date().toISOString(),
  };
  items.push(newItem);
  save(key, items);
  return newItem;
}

function update(key, id, updates) {
  const items = getAll(key);
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) return null;
  items[index] = {
    ...items[index],
    ...updates,
    id, // prevent id from being overwritten
    updatedAt: new Date().toISOString(),
  };
  save(key, items);
  return items[index];
}

function remove(key, id) {
  const items = getAll(key);
  const filtered = items.filter((item) => item.id !== id);
  save(key, filtered);
  return filtered;
}

// ---------------------------------------------------------------------------
// Factory – creates a domain store bound to a specific localStorage key
// ---------------------------------------------------------------------------

function createStore(key) {
  return {
    getAll: () => getAll(key),
    getById: (id) => getById(key, id),
    add: (item) => add(key, item),
    update: (id, updates) => update(key, id, updates),
    remove: (id) => remove(key, id),
  };
}

// ---------------------------------------------------------------------------
// Domain-specific stores
// ---------------------------------------------------------------------------

export const buildingStore = createStore(KEYS.BUILDINGS);
export const tenantStore = createStore(KEYS.TENANTS);
export const billStore = createStore(KEYS.BILLS);
export const paymentStore = createStore(KEYS.PAYMENTS);
export const meterReadingStore = {
  ...createStore(KEYS.METER_READINGS),
  // Get reading for a specific tenant+month+year
  getForMonth(tenantId, month, year) {
    return getAll(KEYS.METER_READINGS).find(
      r => r.tenantId === tenantId && r.month === month && r.year === year
    ) || null;
  },
  // Get the most recent reading before a given month
  getPreviousReading(tenantId, month, year) {
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const monthIdx = months.indexOf(month);
    const allReadings = getAll(KEYS.METER_READINGS)
      .filter(r => r.tenantId === tenantId)
      .filter(r => {
        if (r.year < year) return true;
        if (r.year === year && months.indexOf(r.month) < monthIdx) return true;
        return false;
      })
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return months.indexOf(b.month) - months.indexOf(a.month);
      });
    return allReadings[0] || null;
  }
};

// Settings is a single object, not an array
export const settingsStore = {
  get() {
    try {
      const data = localStorage.getItem(KEYS.SETTINGS);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },
  save(settings) {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  },
};

// Users store extends the generic store with authentication
export const userStore = {
  ...createStore(KEYS.USERS),
  authenticate(username, password) {
    const users = getAll(KEYS.USERS);
    return (
      users.find(
        (u) => u.username === username && u.password === password
      ) || null
    );
  },
};

// ---------------------------------------------------------------------------
// Default / seed data
// ---------------------------------------------------------------------------

export function initializeDefaultData() {
  // Only initialize when the store is completely empty
  if (buildingStore.getAll().length > 0) return;

  // -- Buildings ----------------------------------------------------------
  const buildings = [
    { id: 'b1', name: 'Greenview Tower', address: '12/A Dhanmondi, Dhaka', floors: 6, totalFlats: 24 },
    { id: 'b2', name: 'Skyline Residency', address: '45 Gulshan Ave, Dhaka', floors: 8, totalFlats: 32 },
    { id: 'b3', name: 'Pearl Heights', address: '78 Uttara Sector 7, Dhaka', floors: 5, totalFlats: 20 },
    { id: 'b4', name: 'Royal Palace', address: '23 Mirpur DOHS, Dhaka', floors: 7, totalFlats: 28 },
    { id: 'b5', name: 'Sunrise Apartments', address: '56 Banani, Dhaka', floors: 5, totalFlats: 20 },
  ];
  save(KEYS.BUILDINGS, buildings);

  // -- Tenants ------------------------------------------------------------
  // Each tenant has electricity & water meter settings:
  //   electricityRate      : ৳ per unit (kWh)
  //   electricityStartUnit : meter reading when billing started
  //   electricityStartDate : YYYY-MM-DD – billing active from this date
  //   sectionLoad          : kW – demand charge = sectionLoad × global demand rate
  //   waterRate            : ৳ per unit (cubic meter) or flat monthly
  //   waterStartUnit       : meter reading when billing started
  //   waterStartDate       : YYYY-MM-DD
  const tenants = [
    // Greenview Tower
    { id: 't1', buildingId: 'b1', name: 'Rahim Uddin', flat: 'A1', floor: 1, phone: '01711234567', email: 'rahim@email.com', monthlyRent: 15000, advanceDeposit: 30000, moveInDate: '2025-01-15', status: 'active', electricityRate: 12, electricityStartUnit: 1000, electricityStartDate: '2025-01-15', sectionLoad: 5, waterRate: 15, waterStartUnit: 200, waterStartDate: '2025-01-15' },
    { id: 't2', buildingId: 'b1', name: 'Kamal Hossain', flat: 'A2', floor: 1, phone: '01812345678', email: 'kamal@email.com', monthlyRent: 16000, advanceDeposit: 32000, moveInDate: '2025-03-01', status: 'active', electricityRate: 12, electricityStartUnit: 500, electricityStartDate: '2025-03-01', sectionLoad: 5, waterRate: 15, waterStartUnit: 100, waterStartDate: '2025-03-01' },
    { id: 't3', buildingId: 'b1', name: 'Fatema Begum', flat: 'B1', floor: 2, phone: '01913456789', email: 'fatema@email.com', monthlyRent: 18000, advanceDeposit: 36000, moveInDate: '2024-11-10', status: 'active', electricityRate: 12, electricityStartUnit: 2000, electricityStartDate: '2024-11-10', sectionLoad: 6, waterRate: 15, waterStartUnit: 350, waterStartDate: '2024-11-10' },
    { id: 't4', buildingId: 'b1', name: 'Nasir Ahmed', flat: 'B2', floor: 2, phone: '01614567890', email: 'nasir@email.com', monthlyRent: 14000, advanceDeposit: 28000, moveInDate: '2025-06-01', status: 'active', electricityRate: 12, electricityStartUnit: 0, electricityStartDate: '2025-06-01', sectionLoad: 4, waterRate: 15, waterStartUnit: 0, waterStartDate: '2025-06-01' },
    // Skyline Residency
    { id: 't5', buildingId: 'b2', name: 'Sufia Khatun', flat: '3A', floor: 3, phone: '01715678901', email: 'sufia@email.com', monthlyRent: 22000, advanceDeposit: 44000, moveInDate: '2024-08-20', status: 'active', electricityRate: 13, electricityStartUnit: 3000, electricityStartDate: '2024-08-20', sectionLoad: 7, waterRate: 18, waterStartUnit: 500, waterStartDate: '2024-08-20' },
    { id: 't6', buildingId: 'b2', name: 'Jahangir Alam', flat: '3B', floor: 3, phone: '01816789012', email: 'jahangir@email.com', monthlyRent: 20000, advanceDeposit: 40000, moveInDate: '2025-02-14', status: 'active', electricityRate: 13, electricityStartUnit: 1500, electricityStartDate: '2025-02-14', sectionLoad: 6, waterRate: 18, waterStartUnit: 250, waterStartDate: '2025-02-14' },
    { id: 't7', buildingId: 'b2', name: 'Mina Akter', flat: '4A', floor: 4, phone: '01917890123', email: 'mina@email.com', monthlyRent: 25000, advanceDeposit: 50000, moveInDate: '2025-01-01', status: 'active', electricityRate: 13, electricityStartUnit: 800, electricityStartDate: '2025-01-01', sectionLoad: 8, waterRate: 18, waterStartUnit: 120, waterStartDate: '2025-01-01' },
    { id: 't8', buildingId: 'b2', name: 'Rafiq Islam', flat: '4B', floor: 4, phone: '01618901234', email: 'rafiq@email.com', monthlyRent: 23000, advanceDeposit: 46000, moveInDate: '2024-12-05', status: 'active', electricityRate: 13, electricityStartUnit: 2200, electricityStartDate: '2024-12-05', sectionLoad: 7, waterRate: 18, waterStartUnit: 400, waterStartDate: '2024-12-05' },
    { id: 't9', buildingId: 'b2', name: 'Shahida Parvin', flat: '5A', floor: 5, phone: '01519012345', email: 'shahida@email.com', monthlyRent: 21000, advanceDeposit: 42000, moveInDate: '2025-04-10', status: 'active', electricityRate: 13, electricityStartUnit: 300, electricityStartDate: '2025-04-10', sectionLoad: 5, waterRate: 18, waterStartUnit: 60, waterStartDate: '2025-04-10' },
    // Pearl Heights
    { id: 't10', buildingId: 'b3', name: 'Abdul Karim', flat: '1A', floor: 1, phone: '01720123456', email: 'abdul@email.com', monthlyRent: 12000, advanceDeposit: 24000, moveInDate: '2025-05-01', status: 'active', electricityRate: 11, electricityStartUnit: 0, electricityStartDate: '2025-05-01', sectionLoad: 4, waterRate: 12, waterStartUnit: 0, waterStartDate: '2025-05-01' },
    { id: 't11', buildingId: 'b3', name: 'Roksana Begum', flat: '1B', floor: 1, phone: '01821234567', email: 'roksana@email.com', monthlyRent: 13000, advanceDeposit: 26000, moveInDate: '2024-09-15', status: 'active', electricityRate: 11, electricityStartUnit: 1800, electricityStartDate: '2024-09-15', sectionLoad: 5, waterRate: 12, waterStartUnit: 300, waterStartDate: '2024-09-15' },
    { id: 't12', buildingId: 'b3', name: 'Habibur Rahman', flat: '2A', floor: 2, phone: '01922345678', email: 'habib@email.com', monthlyRent: 14000, advanceDeposit: 28000, moveInDate: '2025-07-01', status: 'active', electricityRate: 11, electricityStartUnit: 0, electricityStartDate: '2025-07-01', sectionLoad: 4, waterRate: 12, waterStartUnit: 0, waterStartDate: '2025-07-01' },
    { id: 't13', buildingId: 'b3', name: 'Julekha Khatun', flat: '2B', floor: 2, phone: '01623456789', email: 'julekha@email.com', monthlyRent: 11000, advanceDeposit: 22000, moveInDate: '2024-10-20', status: 'active', electricityRate: 11, electricityStartUnit: 2500, electricityStartDate: '2024-10-20', sectionLoad: 3, waterRate: 12, waterStartUnit: 450, waterStartDate: '2024-10-20' },
    // Royal Palace
    { id: 't14', buildingId: 'b4', name: 'Masud Rana', flat: 'A-101', floor: 1, phone: '01724567890', email: 'masud@email.com', monthlyRent: 28000, advanceDeposit: 56000, moveInDate: '2024-07-01', status: 'active', electricityRate: 15, electricityStartUnit: 5000, electricityStartDate: '2024-07-01', sectionLoad: 10, waterRate: 20, waterStartUnit: 800, waterStartDate: '2024-07-01' },
    { id: 't15', buildingId: 'b4', name: 'Taslima Akter', flat: 'A-102', floor: 1, phone: '01825678901', email: 'taslima@email.com', monthlyRent: 30000, advanceDeposit: 60000, moveInDate: '2025-01-20', status: 'active', electricityRate: 15, electricityStartUnit: 1000, electricityStartDate: '2025-01-20', sectionLoad: 10, waterRate: 20, waterStartUnit: 150, waterStartDate: '2025-01-20' },
    { id: 't16', buildingId: 'b4', name: 'Shafiq Uddin', flat: 'B-201', floor: 2, phone: '01926789012', email: 'shafiq@email.com', monthlyRent: 27000, advanceDeposit: 54000, moveInDate: '2025-03-15', status: 'active', electricityRate: 15, electricityStartUnit: 700, electricityStartDate: '2025-03-15', sectionLoad: 9, waterRate: 20, waterStartUnit: 90, waterStartDate: '2025-03-15' },
    { id: 't17', buildingId: 'b4', name: 'Nusrat Jahan', flat: 'B-202', floor: 2, phone: '01627890123', email: 'nusrat@email.com', monthlyRent: 26000, advanceDeposit: 52000, moveInDate: '2024-11-30', status: 'active', electricityRate: 15, electricityStartUnit: 4000, electricityStartDate: '2024-11-30', sectionLoad: 8, waterRate: 20, waterStartUnit: 600, waterStartDate: '2024-11-30' },
    // Sunrise Apartments
    { id: 't18', buildingId: 'b5', name: 'Imran Hossain', flat: '101', floor: 1, phone: '01728901234', email: 'imran@email.com', monthlyRent: 17000, advanceDeposit: 34000, moveInDate: '2025-02-01', status: 'active', electricityRate: 12, electricityStartUnit: 900, electricityStartDate: '2025-02-01', sectionLoad: 5, waterRate: 15, waterStartUnit: 130, waterStartDate: '2025-02-01' },
    { id: 't19', buildingId: 'b5', name: 'Ayesha Siddiqua', flat: '102', floor: 1, phone: '01829012345', email: 'ayesha@email.com', monthlyRent: 19000, advanceDeposit: 38000, moveInDate: '2024-06-15', status: 'active', electricityRate: 12, electricityStartUnit: 6000, electricityStartDate: '2024-06-15', sectionLoad: 6, waterRate: 15, waterStartUnit: 950, waterStartDate: '2024-06-15' },
    { id: 't20', buildingId: 'b5', name: 'Belal Ahmed', flat: '201', floor: 2, phone: '01930123456', email: 'belal@email.com', monthlyRent: 16000, advanceDeposit: 32000, moveInDate: '2025-05-20', status: 'active', electricityRate: 12, electricityStartUnit: 200, electricityStartDate: '2025-05-20', sectionLoad: 5, waterRate: 15, waterStartUnit: 30, waterStartDate: '2025-05-20' },
    { id: 't21', buildingId: 'b5', name: 'Hasina Akter', flat: '202', floor: 2, phone: '01631234567', email: 'hasina@email.com', monthlyRent: 18000, advanceDeposit: 36000, moveInDate: '2025-01-10', status: 'active', electricityRate: 12, electricityStartUnit: 1100, electricityStartDate: '2025-01-10', sectionLoad: 5, waterRate: 15, waterStartUnit: 180, waterStartDate: '2025-01-10' },
  ];
  save(KEYS.TENANTS, tenants);

  // -- Meter Readings (seed) -----------------------------------------------
  save(KEYS.METER_READINGS, []);

  // -- Bills (July 2026) --------------------------------------------------
  const bills = [
    { id: 'bill1', tenantId: 't1', buildingId: 'b1', month: 'July', year: 2026, rent: 15000, electricity: 1200, water: 500, gas: 800, serviceCharge: 2000, otherCharges: 0, totalAmount: 19500, dueDate: '2026-07-10', status: 'paid', createdAt: '2026-07-01' },
    { id: 'bill2', tenantId: 't2', buildingId: 'b1', month: 'July', year: 2026, rent: 16000, electricity: 1500, water: 500, gas: 800, serviceCharge: 2000, otherCharges: 0, totalAmount: 20800, dueDate: '2026-07-10', status: 'pending', createdAt: '2026-07-01' },
    { id: 'bill3', tenantId: 't3', buildingId: 'b1', month: 'July', year: 2026, rent: 18000, electricity: 1800, water: 600, gas: 900, serviceCharge: 2500, otherCharges: 0, totalAmount: 23800, dueDate: '2026-07-10', status: 'paid', createdAt: '2026-07-01' },
    { id: 'bill4', tenantId: 't5', buildingId: 'b2', month: 'July', year: 2026, rent: 22000, electricity: 2200, water: 700, gas: 1000, serviceCharge: 3000, otherCharges: 0, totalAmount: 28900, dueDate: '2026-07-10', status: 'paid', createdAt: '2026-07-01' },
    { id: 'bill5', tenantId: 't6', buildingId: 'b2', month: 'July', year: 2026, rent: 20000, electricity: 1900, water: 600, gas: 900, serviceCharge: 2500, otherCharges: 0, totalAmount: 25900, dueDate: '2026-07-10', status: 'pending', createdAt: '2026-07-01' },
    { id: 'bill6', tenantId: 't10', buildingId: 'b3', month: 'July', year: 2026, rent: 12000, electricity: 900, water: 400, gas: 600, serviceCharge: 1500, otherCharges: 0, totalAmount: 15400, dueDate: '2026-07-10', status: 'overdue', createdAt: '2026-07-01' },
    { id: 'bill7', tenantId: 't14', buildingId: 'b4', month: 'July', year: 2026, rent: 28000, electricity: 2800, water: 800, gas: 1200, serviceCharge: 3500, otherCharges: 500, totalAmount: 36800, dueDate: '2026-07-10', status: 'paid', createdAt: '2026-07-01' },
    { id: 'bill8', tenantId: 't18', buildingId: 'b5', month: 'July', year: 2026, rent: 17000, electricity: 1400, water: 500, gas: 700, serviceCharge: 2000, otherCharges: 0, totalAmount: 21600, dueDate: '2026-07-10', status: 'pending', createdAt: '2026-07-01' },
  ];
  save(KEYS.BILLS, bills);

  // -- Payments -----------------------------------------------------------
  const payments = [
    { id: 'pay1', billId: 'bill1', tenantId: 't1', amount: 19500, paymentDate: '2026-07-05', method: 'cash', receivedBy: 'Admin', note: '' },
    { id: 'pay2', billId: 'bill3', tenantId: 't3', amount: 23800, paymentDate: '2026-07-06', method: 'bkash', receivedBy: 'Admin', note: 'Paid via bKash' },
    { id: 'pay3', billId: 'bill4', tenantId: 't5', amount: 28900, paymentDate: '2026-07-04', method: 'bank', receivedBy: 'Admin', note: 'Bank transfer' },
    { id: 'pay4', billId: 'bill7', tenantId: 't14', amount: 36800, paymentDate: '2026-07-03', method: 'cash', receivedBy: 'Admin', note: '' },
  ];
  save(KEYS.PAYMENTS, payments);

  // -- Settings -----------------------------------------------------------
  const settings = {
    companyName: 'RentFlow Property Management',
    companyAddress: 'Dhaka, Bangladesh',
    companyPhone: '01XXXXXXXXX',
    companyEmail: 'info@rentflow.com',
    currency: '৳',
    currencyName: 'BDT',
    billDueDay: 10,
    lateFeePercentage: 5,
    billItems: ['rent', 'electricity', 'water', 'gas', 'serviceCharge', 'otherCharges'],
    theme: 'dark',
    electricityDemandRate: 90,
  };
  save(KEYS.SETTINGS, settings);

  // -- Users --------------------------------------------------------------
  const users = [
    { 
      id: 'u1', username: 'superadmin', password: 'admin123', name: 'Super Admin', role: 'superadmin', email: 'superadmin@rentflow.com' 
    },
    { 
      id: 'u2', username: 'admin', password: 'admin123', name: 'Admin User', role: 'admin', email: 'admin@rentflow.com',
      permissions: ['view_dashboard', 'manage_buildings', 'manage_tenants', 'manage_billing', 'manage_payments', 'manage_settings_general', 'manage_settings_billing', 'manage_settings_users', 'manage_settings_appearance']
    },
    {
      id: 'u3', username: 'manager1', password: 'password', name: 'Building Manager', role: 'manager', email: 'manager@rentflow.com', buildingId: 'b1',
      permissions: ['manage_payments']
    }
  ];
  save(KEYS.USERS, users);
}

// Ensure all existing users have permissions initialized if missing (migration)
const existingUsers = getAll(KEYS.USERS);
if (existingUsers.length > 0) {
  let modified = false;
  const migratedUsers = existingUsers.map(u => {
    if (u.role !== 'superadmin' && !u.permissions) {
      modified = true;
      return { ...u, permissions: ['view_dashboard', 'manage_buildings', 'manage_tenants', 'manage_billing', 'manage_payments', 'manage_settings_general', 'manage_settings_billing', 'manage_settings_users', 'manage_settings_appearance'] };
    }
    return u;
  });
  if (modified) {
    save(KEYS.USERS, migratedUsers);
  }
}

export default KEYS;
