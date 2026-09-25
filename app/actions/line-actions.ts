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

export interface PairingCodeResult {
    code: string;
    expiresAt: number;
}

/**
 * Generate a secure 6-digit one-time pairing code for linking LINE account
 * Valid for 10 minutes.
 */
export async function generateLinePairingCode(): Promise<ActionResult<PairingCodeResult>> {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return { error: 'กรุณาเข้าสู่ระบบก่อนดำเนินการ' };
        }

        const { createAdminClient } = await import('@/utils/supabase/admin');
        const admin = createAdminClient();

        // 6-digit random numeric pairing code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

        const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
            user_metadata: {
                ...user.user_metadata,
                line_pairing_code: code,
                line_pairing_expires: expiresAt,
            },
        });

        if (updateError) {
            return { error: updateError.message };
        }

        return {
            data: {
                code,
                expiresAt,
            },
        };
    } catch (err) {
        const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการสร้างรหัสผูกบัญชี';
        return { error: message };
    }
}

/**
 * Retrieve current active pairing code if still valid
 */
export async function getActivePairingCode(): Promise<ActionResult<PairingCodeResult | null>> {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return { error: 'กรุณาเข้าสู่ระบบก่อน' };
        }

        const meta = user.user_metadata;
        const code = meta?.line_pairing_code;
        const expiresAt = Number(meta?.line_pairing_expires);

        if (code && expiresAt && expiresAt > Date.now()) {
            return {
                data: {
                    code,
                    expiresAt,
                },
            };
        }

        return { data: null };
    } catch (err) {
        const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการดึงรหัสผูกบัญชี';
        return { error: message };
    }
}

