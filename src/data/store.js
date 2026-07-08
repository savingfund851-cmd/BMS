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

function getAllSync(key) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function getByIdSync(key, id) {
  const items = getAllSync(key);
  return items.find((item) => item.id === id) || null;
}

function saveSync(key, items) {
  localStorage.setItem(key, JSON.stringify(items));
}

function addSync(key, item) {
  const items = getAllSync(key);
  const newItem = {
    ...item,
    id: item.id || crypto.randomUUID(),
    createdAt: item.createdAt || new Date().toISOString(),
  };
  items.push(newItem);
  saveSync(key, items);
  return newItem;
}

function updateSync(key, id, updates) {
  const items = getAllSync(key);
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) return null;
  items[index] = {
    ...items[index],
    ...updates,
    id, // prevent id from being overwritten
    updatedAt: new Date().toISOString(),
  };
  saveSync(key, items);
  return items[index];
}

function removeSync(key, id) {
  let items = getAllSync(key);
  items = items.filter((item) => item.id !== id);
  saveSync(key, items);
  return true;
}

// ---------------------------------------------------------------------------
// Async wrappers for compatibility with the advanced UI
// ---------------------------------------------------------------------------

const createAsyncStore = (key) => ({
  getAll: async () => getAllSync(key),
  getById: async (id) => getByIdSync(key, id),
  add: async (item) => addSync(key, item),
  update: async (id, updates) => updateSync(key, id, updates),
  remove: async (id) => removeSync(key, id)
});

export const buildingStore = createAsyncStore(KEYS.BUILDINGS);
export const tenantStore = createAsyncStore(KEYS.TENANTS);
export const billStore = createAsyncStore(KEYS.BILLS);
export const paymentStore = createAsyncStore(KEYS.PAYMENTS);
export const meterReadingStore = createAsyncStore(KEYS.METER_READINGS);

export const userStore = {
  ...createAsyncStore(KEYS.USERS),
  authenticate: async (username, password) => {
    const users = getAllSync(KEYS.USERS);
    const user = users.find(u => u.username === username && u.password === password);
    return user || null;
  }
};

export const settingsStore = {
  get: async () => {
    try {
      const data = localStorage.getItem(KEYS.SETTINGS);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  },
  save: async (settings) => {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
    return settings;
  }
};

export const initializeDefaultData = () => {
  if (getAllSync(KEYS.BUILDINGS).length === 0) {
    saveSync(KEYS.BUILDINGS, [
      { id: 'b1', name: 'Greenview Tower', address: '12/A Dhanmondi, Dhaka', floors: 6, totalFlats: 24 },
      { id: 'b2', name: 'Skyline Residency', address: '45 Gulshan Ave, Dhaka', floors: 8, totalFlats: 32 }
    ]);
  }
  
  if (getAllSync(KEYS.USERS).length === 0) {
    saveSync(KEYS.USERS, [{
      id: 'admin',
      username: 'admin',
      password: 'admin',
      name: 'Super Admin',
      role: 'superadmin',
      permissions: []
    }]);
  }

  if (!localStorage.getItem(KEYS.SETTINGS)) {
    saveSync(KEYS.SETTINGS, {
      companyName: 'Khawaja Palace',
      companyTagline: 'Billing Management System',
      logoUrl: '',
      electricityDemandRate: 90,
      electricityVatRate: 5,
      waterVatRate: 15,
      billItems: ['rent', 'electricity', 'water', 'gas', 'serviceCharge', 'otherCharges']
    });
  }
};
