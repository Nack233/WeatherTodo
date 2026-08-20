import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getSupabaseEnv } from './env';

export function createAdminClient() {
    const { url, serviceRoleKey, key } = getSupabaseEnv();
    const activeKey = serviceRoleKey || key;

    if (!url || !activeKey) {
        throw new Error('Supabase client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or PUBLISHABLE_KEY');
    }

    return createSupabaseClient(url, activeKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}