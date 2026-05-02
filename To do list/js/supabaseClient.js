// js/supabaseClient.js

// IMPORTANT: Replace these with your actual Supabase project URL and Anon Key
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';

// Initialize Supabase Client
// We use the UMD build via CDN which exposes the window.supabase global
export const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
