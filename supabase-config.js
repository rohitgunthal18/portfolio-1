// Supabase Configuration
const SUPABASE_URL = 'https://fkdcxkbbpaufcihkbmxo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrZGN4a2JicGF1ZmNpaGtibXhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2MDYzMDUsImV4cCI6MjA3NTE4MjMwNX0.jEUmzIHu4wH0iwETT33zmPPUn9TVNdERyGpm5YXfDDY';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Export for use in other files
window.supabaseClient = supabase;
window.SUPABASE_CONFIG = {
    url: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY
};

