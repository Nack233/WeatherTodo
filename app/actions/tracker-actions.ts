'use server';

import { createClient } from '@/utils/supabase/server';
import type { Expense, ExpenseInsert, ActionResult } from '@/types/database';

// ==========================================
// READ — Fetch all expenses for current user
// ==========================================
export async function getExpenses(): Promise<ActionResult<Expense[]>> {
    try {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('expenses')
            .select('*')
            .order('transaction_date', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[getExpenses]', error.message);
            return { error: error.message };
        }

        return { data: data as Expense[] };
    } catch (err) {
        const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการดึงข้อมูลรายรับ-รายจ่าย';
        console.error('[getExpenses] unexpected:', message);
        return { error: message };
    }
}

// ==========================================
// CREATE — Add a new income/expense record
// ==========================================
export async function createExpense(input: ExpenseInsert): Promise<ActionResult<Expense>> {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return { error: 'กรุณาเข้าสู่ระบบก่อนดำเนินการ' };
        }

        const { data, error } = await supabase
            .from('expenses')
            .insert({
                ...input,
                user_id: user.id,
            })
            .select()
            .single();

        if (error) {
            console.error('[createExpense]', error.message);
            return { error: error.message };
        }

        return { data: data as Expense };
    } catch (err) {
        const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึกรายการ';
        console.error('[createExpense] unexpected:', message);
        return { error: message };
    }
}

// ==========================================
// DELETE — Delete income/expense record
// ==========================================
export async function deleteExpense(id: string): Promise<ActionResult> {
    try {
        const supabase = await createClient();

        const { error } = await supabase
            .from('expenses')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('[deleteExpense]', error.message);
            return { error: error.message };
        }

        return {};
    } catch (err) {
        const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการลบรายการ';
        console.error('[deleteExpense] unexpected:', message);
        return { error: message };
    }
}
