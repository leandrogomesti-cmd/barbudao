import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase Service Key or URL. Admin client will fail.');
}

/**
 * Creates a Supabase client with the SERVICE ROLE key.
 * This client BYPASSES ALL Row Level Security (RLS) policies.
 * USE WITH CAUTION.
 */
export function getSupabaseAdmin() {
    return createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
}
