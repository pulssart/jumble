import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zoetbdwgtbmprbhforwf.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvZXRiZHdndGJtcHJiaGZvcndmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5MzY4NzUsImV4cCI6MjA4MDUxMjg3NX0.cy_roW-sA0-dooU9qLy5-kGwS5Cxxs92FZ799Xvsk08'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
