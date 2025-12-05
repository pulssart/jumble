import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ogmohzywzjcngxggozbz.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nbW9oenl3empjbmd4Z2dvemJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5MjM2NDcsImV4cCI6MjA4MDQ5OTY0N30.BN67VLXvrTXpFy-hQ-yeZyLgEspWe_2EBIbB71z_N50'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
