const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Missing SUPABASE_URL environment variable');
}

// Use service role for server-side insert into users (bypasses RLS). Fallback to anon if not set.
const key = serviceRoleKey || anonKey;
if (!key) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY');
}

const supabaseAdmin = createClient(supabaseUrl, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

module.exports = supabaseAdmin;
