import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

// We need the service role key to execute DDL, or we can just ask the user to run SQL.
// BUT since we don't have the service role key, we cannot run arbitrary SQL or alter tables via the REST API!
