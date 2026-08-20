'use server';

import { createClient } from '@/utils/supabase/server';
import type { ActionResult } from '@/types/database';

export interface LineAccountStatus {
    isLinked: boolean;
    lineUserId?: string;
    displayName?: string;
    linkedAt?: string;
}

/**
 * Check if the currently authenticated user is linked to a LINE account
 */
export async function getLineAccountStatus(): Promise<ActionResult<LineAccountStatus>> {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return { error: 'กรุณาเข้าสู่ระบบก่อน' };
        }

        const { data, error } = await supabase
            .from('line_accounts')
            .select('line_user_id, display_name, created_at')
            .eq('user_id', user.id)
            .maybeSingle();

        if (error) {
            // If table doesn't exist yet or query error, gracefully return not linked
            return {
                data: { isLinked: false },
            };
        }

        if (data) {
            return {
                data: {
                    isLinked: true,
                    lineUserId: data.line_user_id,
                    displayName: data.display_name,
                    linkedAt: data.created_at,
                },
            };
        }

        return {
            data: { isLinked: false },
        };
    } catch (err) {
        const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
        return { error: message };
    }
}

/**
 * Unlink LINE account for current user
 */
export async function unlinkLineAccount(): Promise<ActionResult<boolean>> {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return { error: 'กรุณาเข้าสู่ระบบก่อน' };
        }

        const { error } = await supabase
            .from('line_accounts')
            .delete()
            .eq('user_id', user.id);

        if (error) {
            return { error: error.message };
        }

        return { data: true };
    } catch (err) {
        const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
        return { error: message };
    }
}
