import { createBrowserClient } from '@supabase/ssr';
import { getSupabaseEnv } from './env';

export function createClient() {
    const { url, key, ready } = getSupabaseEnv();

    if (!ready || !url || !key) {
        return {
            auth: {
                getUser: async () => ({ data: { user: null } }),
                onAuthStateChange: () => ({
                    data: { subscription: { unsubscribe: () => {} } },
                }),
                signUp: async () => ({ error: new Error('Supabase environment variables are missing') }),
                signInWithPassword: async () => ({ error: new Error('Supabase environment variables are missing') }),
                signOut: async () => ({}),
            },
        } as any;
    }

    return createBrowserClient(url, key);
}
