import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ckpriqvoovosgbzircee.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrcHJpcXZvb3Zvc2diemlyY2VlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1MDIwMDEsImV4cCI6MjA5OTA3ODAwMX0.lEym-Fd2ryraAIptgm6bR3g3NhcyjO1cVxp4pejDvSY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
