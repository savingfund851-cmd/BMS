-- ============================================================
-- Khawaja Palace BMS - Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Drop existing tables if re-running
DROP TABLE IF EXISTS meter_readings CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS bills CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;
DROP TABLE IF EXISTS buildings CASCADE;
DROP TABLE IF EXISTS app_settings CASCADE;
DROP TABLE IF EXISTS app_users CASCADE;

-- ── Buildings ────────────────────────────────────────────────
CREATE TABLE buildings (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  floors INTEGER DEFAULT 1,
  total_flats INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Tenants ──────────────────────────────────────────────────
CREATE TABLE tenants (
  id TEXT PRIMARY KEY,
  building_id TEXT REFERENCES buildings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  flat TEXT,
  floor INTEGER DEFAULT 1,
  phone TEXT,
  email TEXT,
  monthly_rent NUMERIC DEFAULT 0,
  advance_deposit NUMERIC DEFAULT 0,
  move_in_date DATE,
  status TEXT DEFAULT 'active',
  electricity_rate NUMERIC DEFAULT 0,
  electricity_start_unit NUMERIC DEFAULT 0,
  electricity_start_date DATE,
  section_load NUMERIC DEFAULT 0,
  water_rate NUMERIC DEFAULT 0,
  water_start_unit NUMERIC DEFAULT 0,
  water_start_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Bills ────────────────────────────────────────────────────
CREATE TABLE bills (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  building_id TEXT REFERENCES buildings(id) ON DELETE CASCADE,
  month TEXT,
  year INTEGER,
  bill_type TEXT DEFAULT 'both',
  rent NUMERIC DEFAULT 0,
  electricity NUMERIC DEFAULT 0,
  electricity_units NUMERIC DEFAULT 0,
  electricity_unit_cost NUMERIC DEFAULT 0,
  electricity_demand_charge NUMERIC DEFAULT 0,
  electricity_vat NUMERIC DEFAULT 0,
  electricity_current_reading NUMERIC,
  electricity_previous_reading NUMERIC,
  water NUMERIC DEFAULT 0,
  water_units NUMERIC DEFAULT 0,
  water_unit_cost NUMERIC DEFAULT 0,
  water_vat NUMERIC DEFAULT 0,
  water_current_reading NUMERIC,
  water_previous_reading NUMERIC,
  gas NUMERIC DEFAULT 0,
  service_charge NUMERIC DEFAULT 0,
  other_charges NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  due_date DATE,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Payments ─────────────────────────────────────────────────
CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  bill_id TEXT REFERENCES bills(id) ON DELETE CASCADE,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  amount NUMERIC DEFAULT 0,
  payment_date DATE,
  method TEXT DEFAULT 'cash',
  breakdown JSONB DEFAULT '{}',
  received_by TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Meter Readings ───────────────────────────────────────────
CREATE TABLE meter_readings (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  building_id TEXT REFERENCES buildings(id) ON DELETE CASCADE,
  month TEXT,
  year INTEGER,
  electricity_current_reading NUMERIC DEFAULT 0,
  electricity_previous_reading NUMERIC DEFAULT 0,
  electricity_units NUMERIC DEFAULT 0,
  water_current_reading NUMERIC DEFAULT 0,
  water_previous_reading NUMERIC DEFAULT 0,
  water_units NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── App Settings ─────────────────────────────────────────────
CREATE TABLE app_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  company_name TEXT DEFAULT 'Khawaja Palace',
  company_tagline TEXT DEFAULT 'Billing Management System',
  logo_url TEXT DEFAULT '',
  electricity_demand_rate NUMERIC DEFAULT 90,
  electricity_vat_rate NUMERIC DEFAULT 5,
  water_vat_rate NUMERIC DEFAULT 15,
  late_fee_percentage NUMERIC DEFAULT 5,
  bill_items JSONB DEFAULT '["rent","electricity","water","gas","serviceCharge","otherCharges"]',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── App Users ────────────────────────────────────────────────
CREATE TABLE app_users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'admin',
  email TEXT,
  building_id TEXT,
  permissions JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DISABLE RLS ON ALL TABLES (app has its own auth)
-- ============================================================
ALTER TABLE buildings DISABLE ROW LEVEL SECURITY;
ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE bills DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE meter_readings DISABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE app_users DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- Default Data
-- ============================================================
INSERT INTO app_settings (id, company_name, company_tagline) 
VALUES ('default', 'Khawaja Palace', 'Billing Management System')
ON CONFLICT (id) DO NOTHING;

INSERT INTO app_users (id, username, password, name, role)
VALUES ('admin', 'admin', 'admin', 'Super Admin', 'superadmin')
ON CONFLICT (id) DO NOTHING;

SELECT 'Schema created successfully!' as message;
