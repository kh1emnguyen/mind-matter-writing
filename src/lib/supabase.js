import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://agwujdejggupteumannq.supabase.co'
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnd3VqZGVqZ2d1cHRldW1hbm5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMzU0OTgsImV4cCI6MjA4MjYxMTQ5OH0.2UZUJUs1mSJWQFo7io3J0TQyDpFbRwvNhNCkacLGMW8'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
