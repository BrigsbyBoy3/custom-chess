/**
 * Supabase Configuration
 * 
 * To set up Supabase:
 * 1. Go to https://supabase.com and create a free account
 * 2. Create a new project
 * 3. Go to Project Settings > API
 * 4. Copy your "Project URL" and "anon public" key
 * 5. Replace the values below, or set them as environment variables
 * 
 * For production, you should use environment variables or a config file
 * that's not committed to git. For now, we'll use a simple config file.
 */

// TODO: Replace these with your Supabase project credentials
// You can get these from: https://app.supabase.com/project/_/settings/api
export const SUPABASE_CONFIG = {
  url: 'https://npicuoloroztngxkgqdb.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5waWN1b2xvcm96dG5neGtncWRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxMjIwMzEsImV4cCI6MjA3NzY5ODAzMX0.YhLF20OgCenbP2vXbNzl_5OK8fbYqmBEUQArrvjtWk4' // Your Supabase anon/public key
};

// Check if config is set
if (!SUPABASE_CONFIG.url || !SUPABASE_CONFIG.anonKey) {
  console.warn('Supabase not configured. Please set SUPABASE_CONFIG.url and SUPABASE_CONFIG.anonKey in js/supabaseConfig.js');
  console.warn('Get your credentials from: https://app.supabase.com/project/_/settings/api');
}

