import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function test() {
  console.log("Testing Supabase connection...")
  const { data, error } = await supabase.from('buildings').select('*')
  if (error) {
    console.error("Error fetching buildings:", error)
  } else {
    console.log(`Found ${data?.length || 0} buildings.`)
    if (data?.length > 0) console.log(data[0])
  }
}

test()
