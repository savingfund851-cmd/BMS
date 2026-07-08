import { db } from '../lib/firebase';
import { 
  collection, doc, setDoc, deleteDoc, updateDoc, onSnapshot, getDocs
} from 'firebase/firestore';

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
// In-Memory Real-Time Cache for Synchronous UI
// ---------------------------------------------------------------------------
const cache = {
  [KEYS.BUILDINGS]: [],
  [KEYS.TENANTS]: [],
  [KEYS.BILLS]: [],
  [KEYS.PAYMENTS]: [],
  [KEYS.USERS]: [],
  [KEYS.METER_READINGS]: [],
  [KEYS.SETTINGS]: {}
};

// Setup real-time listeners for all collections
Object.values(KEYS).forEach(key => {
  onSnapshot(collection(db, key), (snapshot) => {
    if (key === KEYS.SETTINGS) {
      cache[key] = snapshot.empty ? {} : snapshot.docs[0].data();
    } else {
      cache[key] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
    // Notify the UI to re-render
    window.dispatchEvent(new Event('storeUpdated'));
    // Keep local storage as a fallback/offline cache
    localStorage.setItem(key, JSON.stringify(cache[key]));
  });
});

// Load initial data from localStorage for instant render before Firebase connects
Object.values(KEYS).forEach(key => {
  try {
    const data = localStorage.getItem(key);
    if (data) cache[key] = JSON.parse(data);
  } catch (e) {}
});

// ---------------------------------------------------------------------------
// Generic CRUD helpers for Firestore
// ---------------------------------------------------------------------------

function getAllSync(key) {
  return cache[key] || [];
}

function getByIdSync(key, id) {
  const items = getAllSync(key);
  return items.find((item) => item.id === id) || null;
}

async function addAsync(collectionName, item) {
  try {
    const id = item.id || crypto.randomUUID();
    const docRef = doc(db, collectionName, id);
    const newItem = {
      ...item,
      createdAt: item.createdAt || new Date().toISOString(),
    };
    const cleanItem = JSON.parse(JSON.stringify(newItem)); 
    await setDoc(docRef, cleanItem);
    return { id, ...cleanItem };
  } catch (error) {
    console.error(`Error adding to ${collectionName}:`, error);
    return null;
  }
}

async function updateAsync(collectionName, id, updates) {
  try {
    const docRef = doc(db, collectionName, id);
    const cleanUpdates = JSON.parse(JSON.stringify(updates));
    cleanUpdates.updatedAt = new Date().toISOString();
    await updateDoc(docRef, cleanUpdates);
    return { id, ...cleanUpdates }; 
  } catch (error) {
    console.error(`Error updating ${id} in ${collectionName}:`, error);
    return null;
  }
}

async function removeAsync(collectionName, id) {
  try {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error(`Error removing ${id} from ${collectionName}:`, error);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Hybrid Store APIs (Sync Reads, Async Writes)
// ---------------------------------------------------------------------------

const createHybridStore = (key) => ({
  getAll: () => getAllSync(key),
  getById: (id) => getByIdSync(key, id),
  add: async (item) => addAsync(key, item),
  update: async (id, updates) => updateAsync(key, id, updates),
  remove: async (id) => removeAsync(key, id)
});

export const buildingStore = createHybridStore(KEYS.BUILDINGS);
export const tenantStore = createHybridStore(KEYS.TENANTS);
export const billStore = createHybridStore(KEYS.BILLS);
export const paymentStore = createHybridStore(KEYS.PAYMENTS);

export const meterReadingStore = {
  ...createHybridStore(KEYS.METER_READINGS),
  getPreviousReading: (tenantId, currentMonth, currentYear) => {
    const readings = getAllSync(KEYS.METER_READINGS).filter(r => r.tenantId === tenantId);
    readings.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      const m = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      return m.indexOf(b.month) - m.indexOf(a.month);
    });
    // Return the most recent reading that is BEFORE the current month/year
    const m = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const currIdx = m.indexOf(currentMonth);
    return readings.find(r => r.year < currentYear || (r.year === currentYear && m.indexOf(r.month) < currIdx)) || null;
  }
};

export const userStore = {
  ...createHybridStore(KEYS.USERS),
  authenticate: (username, password) => {
    const users = getAllSync(KEYS.USERS);
    const user = users.find(u => u.username === username && u.password === password);
    return user || null;
  }
};

export const settingsStore = {
  get: () => cache[KEYS.SETTINGS] || {},
  save: async (settings) => {
    let docId = 'default_settings';
    try {
      const snap = await getDocs(collection(db, KEYS.SETTINGS));
      if (!snap.empty) {
        docId = snap.docs[0].id;
      }
    } catch (e) {}
    await setDoc(doc(db, KEYS.SETTINGS, docId), JSON.parse(JSON.stringify(settings)));
    cache[KEYS.SETTINGS] = settings;
    return settings;
  }
};

export const initializeDefaultData = async () => {
  // Wait a small amount of time for Firebase to connect and populate cache
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  const users = getAllSync(KEYS.USERS);
  if (users.length === 0) {
    await addAsync(KEYS.USERS, {
      id: 'admin',
      username: 'admin',
      password: 'admin',
      name: 'Super Admin',
      role: 'superadmin',
      permissions: []
    });
  }

  const settings = settingsStore.get();
  if (Object.keys(settings).length === 0) {
    await settingsStore.save({
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
