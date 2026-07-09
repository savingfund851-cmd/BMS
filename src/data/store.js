import { supabase } from '../lib/supabase';

// ---------------------------------------------------------------------------
// In-Memory Cache (for instant synchronous reads in the UI)
// ---------------------------------------------------------------------------
const cache = {
  buildings: [],
  tenants: [],
  bills: [],
  payments: [],
  app_users: [],
  meter_readings: [],
  app_settings: {}
};

// Load from localStorage immediately (offline/instant fallback)
['buildings','tenants','bills','payments','app_users','meter_readings'].forEach(t => {
  try { const d = localStorage.getItem('sb_'+t); if (d) cache[t] = JSON.parse(d); } catch(e) {}
});
try { const d = localStorage.getItem('sb_app_settings'); if (d) cache.app_settings = JSON.parse(d); } catch(e) {}

// ---------------------------------------------------------------------------
// Real-time subscriptions — keep cache fresh
// ---------------------------------------------------------------------------
const TABLES = ['buildings','tenants','bills','payments','app_users','meter_readings'];

function subscribeAll() {
  TABLES.forEach(table => {
    supabase
      .channel(`realtime-${table}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        refreshTable(table);
      })
      .subscribe();
  });

  supabase
    .channel('realtime-app_settings')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, () => {
      refreshSettings();
    })
    .subscribe();
}

async function refreshTable(table) {
  const { data } = await supabase.from(table).select('*');
  if (data) {
    cache[table] = data.map(row => fromDb(row));
    localStorage.setItem('sb_'+table, JSON.stringify(cache[table]));
    window.dispatchEvent(new Event('storeUpdated'));
  }
}

async function refreshSettings() {
  const { data } = await supabase.from('app_settings').select('*').eq('id', 'default').single();
  if (data) {
    cache.app_settings = settingsFromDb(data);
    localStorage.setItem('sb_app_settings', JSON.stringify(cache.app_settings));
    window.dispatchEvent(new Event('storeUpdated'));
  }
}

// Load all tables from Supabase on startup
async function loadAll() {
  await Promise.all([
    ...TABLES.map(t => refreshTable(t)),
    refreshSettings()
  ]);
}

loadAll().then(() => subscribeAll());

// ---------------------------------------------------------------------------
// Snake_case ↔ camelCase converters
// ---------------------------------------------------------------------------
function toDb(obj) {
  const map = {
    buildingId: 'building_id', tenantId: 'tenant_id', billId: 'bill_id',
    totalAmount: 'total_amount', dueDate: 'due_date', moveInDate: 'move_in_date',
    totalFlats: 'total_flats', monthlyRent: 'monthly_rent', advanceDeposit: 'advance_deposit',
    electricityRate: 'electricity_rate', electricityStartUnit: 'electricity_start_unit',
    electricityStartDate: 'electricity_start_date', sectionLoad: 'section_load',
    waterRate: 'water_rate', waterStartUnit: 'water_start_unit', waterStartDate: 'water_start_date',
    electricityUnits: 'electricity_units', electricityUnitCost: 'electricity_unit_cost',
    electricityDemandCharge: 'electricity_demand_charge', electricityVat: 'electricity_vat',
    electricityCurrentReading: 'electricity_current_reading', electricityPreviousReading: 'electricity_previous_reading',
    waterUnits: 'water_units', waterUnitCost: 'water_unit_cost', waterVat: 'water_vat',
    waterCurrentReading: 'water_current_reading', waterPreviousReading: 'water_previous_reading',
    serviceCharge: 'service_charge', otherCharges: 'other_charges', billType: 'bill_type',
    receivedBy: 'received_by', paymentDate: 'payment_date',
    createdAt: 'created_at', updatedAt: 'updated_at'
  };
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    result[map[k] || k] = v;
  }
  return result;
}

function fromDb(row) {
  if (!row) return null;
  const map = {
    building_id: 'buildingId', tenant_id: 'tenantId', bill_id: 'billId',
    total_amount: 'totalAmount', due_date: 'dueDate', move_in_date: 'moveInDate',
    total_flats: 'totalFlats', monthly_rent: 'monthlyRent', advance_deposit: 'advanceDeposit',
    electricity_rate: 'electricityRate', electricity_start_unit: 'electricityStartUnit',
    electricity_start_date: 'electricityStartDate', section_load: 'sectionLoad',
    water_rate: 'waterRate', water_start_unit: 'waterStartUnit', water_start_date: 'waterStartDate',
    electricity_units: 'electricityUnits', electricity_unit_cost: 'electricityUnitCost',
    electricity_demand_charge: 'electricityDemandCharge', electricity_vat: 'electricityVat',
    electricity_current_reading: 'electricityCurrentReading', electricity_previous_reading: 'electricityPreviousReading',
    water_units: 'waterUnits', water_unit_cost: 'waterUnitCost', water_vat: 'waterVat',
    water_current_reading: 'waterCurrentReading', water_previous_reading: 'waterPreviousReading',
    service_charge: 'serviceCharge', other_charges: 'otherCharges', bill_type: 'billType',
    received_by: 'receivedBy', payment_date: 'paymentDate',
    created_at: 'createdAt', updated_at: 'updatedAt'
  };
  const result = {};
  for (const [k, v] of Object.entries(row)) {
    result[map[k] || k] = v;
  }
  return result;
}

function settingsFromDb(row) {
  if (!row) return {};
  return {
    companyName: row.company_name,
    companyTagline: row.company_tagline,
    logoUrl: row.logo_url,
    electricityDemandRate: row.electricity_demand_rate,
    electricityVatRate: row.electricity_vat_rate,
    waterVatRate: row.water_vat_rate,
    lateFeePercentage: row.late_fee_percentage,
    billItems: row.bill_items || ['rent','electricity','water','gas','serviceCharge','otherCharges']
  };
}

function settingsToDb(obj) {
  return {
    company_name: obj.companyName,
    company_tagline: obj.companyTagline,
    logo_url: obj.logoUrl,
    electricity_demand_rate: obj.electricityDemandRate,
    electricity_vat_rate: obj.electricityVatRate,
    water_vat_rate: obj.waterVatRate,
    late_fee_percentage: obj.lateFeePercentage,
    bill_items: obj.billItems
  };
}

// ---------------------------------------------------------------------------
// Generic store factory
// ---------------------------------------------------------------------------
function createStore(table) {
  return {
    getAll: () => cache[table] || [],
    getById: (id) => (cache[table] || []).find(r => r.id === id) || null,

    add: async (item) => {
      const id = item.id || crypto.randomUUID();
      const dbRow = toDb({ ...item, id, createdAt: new Date().toISOString() });
      const { data, error } = await supabase.from(table).insert([dbRow]).select().single();
      if (error) { 
        console.error('Add error:', error.message); 
        alert(`Supabase Error (${table}): ${error.message}`);
        return null; 
      }
      const converted = fromDb(data);
      cache[table] = [...(cache[table] || []), converted];
      localStorage.setItem('sb_'+table, JSON.stringify(cache[table]));
      window.dispatchEvent(new Event('storeUpdated'));
      return converted;
    },

    update: async (id, updates) => {
      const dbUpdates = toDb({ ...updates, updatedAt: new Date().toISOString() });
      const { data, error } = await supabase.from(table).update(dbUpdates).eq('id', id).select().single();
      if (error) { console.error('Update error:', error.message); return null; }
      const converted = fromDb(data);
      cache[table] = (cache[table] || []).map(r => r.id === id ? converted : r);
      localStorage.setItem('sb_'+table, JSON.stringify(cache[table]));
      window.dispatchEvent(new Event('storeUpdated'));
      return converted;
    },

    remove: async (id) => {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) { console.error('Delete error:', error.message); return false; }
      cache[table] = (cache[table] || []).filter(r => r.id !== id);
      localStorage.setItem('sb_'+table, JSON.stringify(cache[table]));
      window.dispatchEvent(new Event('storeUpdated'));
      return true;
    }
  };
}

// ---------------------------------------------------------------------------
// Domain Stores
// ---------------------------------------------------------------------------
export const buildingStore = createStore('buildings');
export const tenantStore = createStore('tenants');
export const paymentStore = createStore('payments');

// billStore with extra method for multi-PC safe duplicate check
export const billStore = {
  ...createStore('bills'),
  // Queries Supabase directly to check if a bill exists — bypasses local cache
  checkExists: async (tenantId, month, year) => {
    const { data, error } = await supabase
      .from('bills')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('month', month)
      .eq('year', year)
      .maybeSingle();
    if (error) return false;
    return !!data;
  }
};

export const meterReadingStore = {
  ...createStore('meter_readings'),
  getPreviousReading: (tenantId, currentMonth, currentYear) => {
    const readings = (cache.meter_readings || []).filter(r => r.tenantId === tenantId);
    const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    readings.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return MONTHS.indexOf(b.month) - MONTHS.indexOf(a.month);
    });
    const currIdx = MONTHS.indexOf(currentMonth);
    return readings.find(r =>
      r.year < currentYear || (r.year === currentYear && MONTHS.indexOf(r.month) < currIdx)
    ) || null;
  }
};

export const userStore = {
  ...createStore('app_users'),
  authenticate: async (username, password) => {
    // First try cache (instant)
    const fromCache = (cache.app_users || []).find(u => u.username === username && u.password === password);
    if (fromCache) return fromCache;

    // Fallback: query Supabase directly (in case cache not loaded yet)
    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .single();
    if (error || !data) return null;
    return fromDb(data);
  }
};

export const settingsStore = {
  get: () => cache.app_settings || {},
  save: async (settings) => {
    const dbData = { id: 'default', ...settingsToDb(settings), updated_at: new Date().toISOString() };
    const { error } = await supabase.from('app_settings').upsert([dbData]);
    if (error) { console.error('Settings save error:', error.message); return null; }
    cache.app_settings = settings;
    localStorage.setItem('sb_app_settings', JSON.stringify(settings));
    window.dispatchEvent(new Event('storeUpdated'));
    return settings;
  }
};

// ---------------------------------------------------------------------------
// Initialize default data if empty
// ---------------------------------------------------------------------------
export const initializeDefaultData = async () => {
  // Wait for initial load
  await new Promise(r => setTimeout(r, 2000));

  const users = cache.app_users || [];
  if (users.length === 0) {
    await userStore.add({
      id: 'admin',
      username: 'admin',
      password: 'admin',
      name: 'Super Admin',
      role: 'superadmin',
      permissions: []
    });
  }

  const settings = cache.app_settings || {};
  if (!settings.companyName) {
    await settingsStore.save({
      companyName: 'Khawaja Palace',
      companyTagline: 'Billing Management System',
      logoUrl: '',
      electricityDemandRate: 90,
      electricityVatRate: 5,
      waterVatRate: 15,
      lateFeePercentage: 5,
      billItems: ['rent','electricity','water','gas','serviceCharge','otherCharges']
    });
  }
};
