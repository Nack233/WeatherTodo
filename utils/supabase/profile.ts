import type { SupabaseClient, User } from '@supabase/supabase-js';

export async function ensureProfileExists(supabase: SupabaseClient, user: User) {
    const displayName =
        user.user_metadata?.display_name ??
        user.user_metadata?.name ??
        user.email ??
        'User';

    const { error } = await supabase
        .from('profiles')
        .upsert(
            {
                id: user.id,
                display_name: displayName,
            },
            { onConflict: 'id' }
        );

    if (error) {
        return { error: error.message };
    }

    return {};
}