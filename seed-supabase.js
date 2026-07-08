import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function seed() {
  console.log("Seeding data...")

  const { data: bData } = await supabase.from('buildings').select('*')
  if (bData && bData.length > 0) {
    console.log("Data already exists!")
    return
  }

  // Buildings
  const buildings = [
    { name: 'Greenview Tower', address: '12/A Dhanmondi, Dhaka', floors: 6, total_flats: 24 },
    { name: 'Skyline Residency', address: '45 Gulshan Ave, Dhaka', floors: 8, total_flats: 32 },
    { name: 'Pearl Heights', address: '78 Uttara Sector 7, Dhaka', floors: 5, total_flats: 20 }
  ];

  const { data: bRes, error: bErr } = await supabase.from('buildings').insert(buildings).select()
  if (bErr) {
    console.error("Buildings error:", bErr)
    return
  }
  
  const b1 = bRes[0].id
  const b2 = bRes[1].id
  const b3 = bRes[2].id

  // Tenants
  const tenants = [
    { building_id: b1, name: 'Rahim Uddin', flat: 'A1', floor: 1, phone: '01711234567', monthly_rent: 15000, status: 'active', electricity_rate: 10, water_rate: 15 },
    { building_id: b1, name: 'Kamal Hossain', flat: 'A2', floor: 1, phone: '01812345678', monthly_rent: 16000, status: 'active', electricity_rate: 10, water_rate: 15 },
    { building_id: b2, name: 'Sufia Khatun', flat: '3A', floor: 3, phone: '01715678901', monthly_rent: 22000, status: 'active', electricity_rate: 10, water_rate: 15 },
    { building_id: b3, name: 'Abdul Karim', flat: '1A', floor: 1, phone: '01720123456', monthly_rent: 12000, status: 'active', electricity_rate: 10, water_rate: 15 }
  ];

  const { error: tErr } = await supabase.from('tenants').insert(tenants)
  if (tErr) {
    console.error("Tenants error:", tErr)
    return
  }

  console.log("Seed successful!")
}

seed()
