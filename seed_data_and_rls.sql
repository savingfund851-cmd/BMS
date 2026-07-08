-- Disable RLS (Row Level Security) so our React app can access data
ALTER TABLE buildings DISABLE ROW LEVEL SECURITY;
ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE bills DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE meter_readings DISABLE ROW LEVEL SECURITY;
ALTER TABLE app_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings DISABLE ROW LEVEL SECURITY;

-- Insert an initial superadmin user if not exists
INSERT INTO app_users (username, password, name, role, permissions)
SELECT 'admin', 'admin', 'Super Admin', 'superadmin', '[]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM app_users WHERE username = 'admin');

-- Insert default settings
INSERT INTO app_settings (id, data)
SELECT 1, '{"companyName": "RentFlow", "electricityDemandRate": 90, "electricityVatRate": 5, "waterVatRate": 15}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM app_settings WHERE id = 1);

-- Insert dummy data for buildings
INSERT INTO buildings (name, address, floors, total_flats)
SELECT 'Greenview Tower', '12/A Dhanmondi, Dhaka', 6, 24
WHERE NOT EXISTS (SELECT 1 FROM buildings WHERE name = 'Greenview Tower');

INSERT INTO buildings (name, address, floors, total_flats)
SELECT 'Skyline Residency', '45 Gulshan Ave, Dhaka', 8, 32
WHERE NOT EXISTS (SELECT 1 FROM buildings WHERE name = 'Skyline Residency');

-- Insert dummy data for tenants
INSERT INTO tenants (building_id, name, flat, floor, phone, monthly_rent, status, electricity_rate, water_rate)
SELECT id, 'Rahim Uddin', 'A1', 1, '01711234567', 15000, 'active', 10, 15
FROM buildings WHERE name = 'Greenview Tower'
AND NOT EXISTS (SELECT 1 FROM tenants WHERE name = 'Rahim Uddin');

INSERT INTO tenants (building_id, name, flat, floor, phone, monthly_rent, status, electricity_rate, water_rate)
SELECT id, 'Sufia Khatun', '3A', 3, '01715678901', 22000, 'active', 10, 15
FROM buildings WHERE name = 'Skyline Residency'
AND NOT EXISTS (SELECT 1 FROM tenants WHERE name = 'Sufia Khatun');

