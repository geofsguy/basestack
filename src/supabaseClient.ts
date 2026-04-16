import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tlpfmktpdxekqaadypkv.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRscGZta3RwZHhla3FhYWR5cGt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NDI5NjcsImV4cCI6MjA5MTMxODk2N30.NWBzeinA3nNaI9Wyqr3tHL6izURm7OfFvuAPzPaHDug';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
