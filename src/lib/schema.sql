-- ============================================================
-- Tenant Billing Management System - Supabase Schema
-- Run this in: Supabase Dashboard > SQL Editor > New Query
-- ============================================================

DROP TABLE IF EXISTS meter_readings CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS bills CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;
DROP TABLE IF EXISTS buildings CASCADE;
DROP TABLE IF EXISTS app_users CASCADE;
DROP TABLE IF EXISTS app_settings CASCADE;

CREATE TABLE buildings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  address text,
  floors integer DEFAULT 1,
  total_flats integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE tenants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  building_id uuid REFERENCES buildings(id) ON DELETE CASCADE,
  name text NOT NULL,
  flat text,
  floor integer DEFAULT 1,
  phone text,
  email text,
  monthly_rent numeric DEFAULT 0,
  advance_deposit numeric DEFAULT 0,
  move_in_date date,
  status text DEFAULT 'active',
  electricity_rate numeric DEFAULT 0,
  electricity_start_unit numeric DEFAULT 0,
  electricity_start_date date,
  section_load numeric DEFAULT 0,
  water_rate numeric DEFAULT 0,
  water_start_unit numeric DEFAULT 0,
  water_start_date date,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE bills (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  building_id uuid REFERENCES buildings(id) ON DELETE CASCADE,
  month text,
  year integer,
  bill_type text DEFAULT 'both',
  rent numeric DEFAULT 0,
  electricity numeric DEFAULT 0,
  electricity_units numeric DEFAULT 0,
  electricity_unit_cost numeric DEFAULT 0,
  electricity_demand_charge numeric DEFAULT 0,
  electricity_vat numeric DEFAULT 0,
  electricity_current_reading numeric,
  electricity_previous_reading numeric,
  water numeric DEFAULT 0,
  water_units numeric DEFAULT 0,
  water_unit_cost numeric DEFAULT 0,
  water_vat numeric DEFAULT 0,
  water_current_reading numeric,
  water_previous_reading numeric,
  gas numeric DEFAULT 0,
  service_charge numeric DEFAULT 0,
  other_charges numeric DEFAULT 0,
  total_amount numeric DEFAULT 0,
  due_date date,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE payments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  bill_id uuid REFERENCES bills(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  amount numeric DEFAULT 0,
  payment_date date DEFAULT CURRENT_DATE,
  method text DEFAULT 'cash',
  received_by text,
  note text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE meter_readings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  building_id uuid REFERENCES buildings(id) ON DELETE CASCADE,
  month text,
  year integer,
  electricity_current_reading numeric DEFAULT 0,
  electricity_previous_reading numeric DEFAULT 0,
  electricity_units numeric DEFAULT 0,
  water_current_reading numeric DEFAULT 0,
  water_previous_reading numeric DEFAULT 0,
  water_units numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE app_users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  username text UNIQUE NOT NULL,
  password text NOT NULL,
  name text,
  role text DEFAULT 'admin',
  email text,
  building_id uuid REFERENCES buildings(id) ON DELETE SET NULL,
  permissions jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE app_settings (
  id integer DEFAULT 1 PRIMARY KEY CHECK (id = 1),
  data jsonb DEFAULT '{}'
);

ALTER TABLE buildings DISABLE ROW LEVEL SECURITY;
ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE bills DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE meter_readings DISABLE ROW LEVEL SECURITY;
ALTER TABLE app_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings DISABLE ROW LEVEL SECURITY;

INSERT INTO app_users (username, password, name, role, email, permissions) VALUES
  ('superadmin', 'admin123', 'Super Admin', 'superadmin', 'superadmin@rentflow.com', '[]'),
  ('admin', 'admin123', 'Admin User', 'admin', 'admin@rentflow.com', 
   '["view_dashboard","manage_buildings","manage_tenants","manage_billing","manage_payments","manage_settings_general","manage_settings_billing","manage_settings_users","manage_settings_appearance"]');

INSERT INTO app_settings (id, data) VALUES (1, '{
  "companyName": "RentFlow Property Management",
  "companyTagline": "Property Manager",
  "companyAddress": "Dhaka, Bangladesh",
  "companyPhone": "01XXXXXXXXX",
  "companyEmail": "info@rentflow.com",
  "currency": "৳",
  "currencyName": "BDT",
  "billDueDay": 10,
  "lateFeePercentage": 5,
  "billItems": ["rent","electricity","water","gas","serviceCharge","otherCharges"],
  "theme": "dark",
  "electricityDemandRate": 90,
  "electricityVatRate": 5,
  "waterVatRate": 15
}');

SELECT ''Schema created successfully!'' as status;
