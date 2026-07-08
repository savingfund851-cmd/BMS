import { supabase } from '../lib/supabase'

// Helpers to convert cases
const toCamel = (s) => {
  return s.replace(/([-_][a-z])/ig, ($1) => {
    return $1.toUpperCase()
      .replace('-', '')
      .replace('_', '');
  });
};

const toSnake = (s) => {
  return s.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

const keysToCamel = function(o) {
  if (o === Object(o) && !Array.isArray(o) && typeof o !== 'function') {
    const n = {};
    Object.keys(o).forEach((k) => {
      n[toCamel(k)] = keysToCamel(o[k]);
    });
    return n;
  } else if (Array.isArray(o)) {
    return o.map((i) => {
      return keysToCamel(i);
    });
  }
  return o;
};

const keysToSnake = function(o) {
  if (o === Object(o) && !Array.isArray(o) && typeof o !== 'function') {
    const n = {};
    Object.keys(o).forEach((k) => {
      n[toSnake(k)] = keysToSnake(o[k]);
    });
    return n;
  } else if (Array.isArray(o)) {
    return o.map((i) => {
      return keysToSnake(i);
    });
  }
  return o;
};

// Helper to handle Supabase responses
const handleResponse = async (promise) => {
  const { data, error } = await promise
  if (error) {
    console.error('Supabase Error:', error)
    throw error
  }
  return keysToCamel(data)
}

// Buildings
export const buildingStore = {
  getAll: async () => {
    return handleResponse(supabase.from('buildings').select('*').order('created_at', { ascending: false }))
  },
  getById: async (id) => {
    const data = await handleResponse(supabase.from('buildings').select('*').eq('id', id).single())
    return data
  },
  add: async (building) => {
    return handleResponse(supabase.from('buildings').insert([keysToSnake(building)]).select().single())
  },
  update: async (id, updates) => {
    return handleResponse(supabase.from('buildings').update(keysToSnake(updates)).eq('id', id).select().single())
  },
  remove: async (id) => {
    return handleResponse(supabase.from('buildings').delete().eq('id', id))
  }
}

// Tenants
export const tenantStore = {
  getAll: async () => {
    return handleResponse(supabase.from('tenants').select('*').order('created_at', { ascending: false }))
  },
  getById: async (id) => {
    const data = await handleResponse(supabase.from('tenants').select('*').eq('id', id).single())
    return data
  },
  add: async (tenant) => {
    return handleResponse(supabase.from('tenants').insert([keysToSnake(tenant)]).select().single())
  },
  update: async (id, updates) => {
    return handleResponse(supabase.from('tenants').update(keysToSnake(updates)).eq('id', id).select().single())
  },
  remove: async (id) => {
    return handleResponse(supabase.from('tenants').delete().eq('id', id))
  }
}

// Bills
export const billStore = {
  getAll: async () => {
    return handleResponse(supabase.from('bills').select('*').order('created_at', { ascending: false }))
  },
  getById: async (id) => {
    const data = await handleResponse(supabase.from('bills').select('*').eq('id', id).single())
    return data
  },
  add: async (bill) => {
    return handleResponse(supabase.from('bills').insert([keysToSnake(bill)]).select().single())
  },
  update: async (id, updates) => {
    return handleResponse(supabase.from('bills').update(keysToSnake(updates)).eq('id', id).select().single())
  },
  remove: async (id) => {
    return handleResponse(supabase.from('bills').delete().eq('id', id))
  }
}

// Payments
export const paymentStore = {
  getAll: async () => {
    return handleResponse(supabase.from('payments').select('*').order('created_at', { ascending: false }))
  },
  getById: async (id) => {
    const data = await handleResponse(supabase.from('payments').select('*').eq('id', id).single())
    return data
  },
  add: async (payment) => {
    return handleResponse(supabase.from('payments').insert([keysToSnake(payment)]).select().single())
  },
  update: async (id, updates) => {
    return handleResponse(supabase.from('payments').update(keysToSnake(updates)).eq('id', id).select().single())
  },
  remove: async (id) => {
    return handleResponse(supabase.from('payments').delete().eq('id', id))
  }
}

// Meter Readings
export const meterReadingStore = {
  getAll: async () => {
    return handleResponse(supabase.from('meter_readings').select('*').order('created_at', { ascending: false }))
  },
  getById: async (id) => {
    const data = await handleResponse(supabase.from('meter_readings').select('*').eq('id', id).single())
    return data
  },
  add: async (reading) => {
    return handleResponse(supabase.from('meter_readings').insert([keysToSnake(reading)]).select().single())
  },
  update: async (id, updates) => {
    return handleResponse(supabase.from('meter_readings').update(keysToSnake(updates)).eq('id', id).select().single())
  },
  remove: async (id) => {
    return handleResponse(supabase.from('meter_readings').delete().eq('id', id))
  }
}

// Users
export const userStore = {
  getAll: async () => {
    return handleResponse(supabase.from('app_users').select('*').order('created_at', { ascending: false }))
  },
  getById: async (id) => {
    const data = await handleResponse(supabase.from('app_users').select('*').eq('id', id).single())
    return data
  },
  add: async (user) => {
    return handleResponse(supabase.from('app_users').insert([keysToSnake(user)]).select().single())
  },
  update: async (id, updates) => {
    return handleResponse(supabase.from('app_users').update(keysToSnake(updates)).eq('id', id).select().single())
  },
  remove: async (id) => {
    return handleResponse(supabase.from('app_users').delete().eq('id', id))
  },
  authenticate: async (username, password) => {
    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .single()
    
    if (error || !data) return null
    return keysToCamel(data)
  }
}

// Settings
export const settingsStore = {
  get: async () => {
    const { data, error } = await supabase.from('app_settings').select('data').eq('id', 1).single()
    if (error) {
      console.error('Error fetching settings:', error)
      return {}
    }
    // app_settings JSON data stores exact keys, no need to snake_case inner JSON
    return data?.data || {}
  },
  save: async (settings) => {
    return handleResponse(supabase.from('app_settings').update({ data: settings }).eq('id', 1))
  }
}

export const initializeDefaultData = () => {}
