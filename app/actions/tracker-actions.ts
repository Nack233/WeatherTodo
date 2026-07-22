'use server';

import { createClient } from '@/utils/supabase/server';
import type { Expense, ExpenseInsert, ActionResult } from '@/types/database';
import { ensureProfileExists } from '@/utils/supabase/profile';

// ==========================================
// READ — Fetch all expenses for current user
// ==========================================
export async function getExpenses(): Promise<ActionResult<Expense[]>> {
    try {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('expenses')
            .select('id, user_id, category_id, amount, type, note, transaction_date, created_at, expense_categories(name)')
            .order('transaction_date', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[getExpenses]', error.message);
            return { error: error.message };
        }

        const mappedExpenses = (data ?? []).map((expense) => ({
            ...expense,
            category: Array.isArray((expense as { expense_categories?: { name?: string }[] }).expense_categories)
                ? (expense as { expense_categories?: { name?: string }[] }).expense_categories?.[0]?.name ?? 'อื่นๆ'
                : (expense as { expense_categories?: { name?: string } }).expense_categories?.name ?? 'อื่นๆ',
        })) as Expense[];

        return { data: mappedExpenses };
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

        const profileResult = await ensureProfileExists(supabase, user);
        if ('error' in profileResult) {
            return { error: profileResult.error };
        }

        const { data: categoryRow, error: categoryError } = await supabase
            .from('expense_categories')
            .select('id')
            .eq('user_id', user.id)
            .eq('name', input.category)
            .maybeSingle();

        if (categoryError) {
            console.error('[createExpense] category lookup', categoryError.message);
            return { error: categoryError.message };
        }

        let categoryId = categoryRow?.id ?? null;

        if (!categoryId) {
            const { data: createdCategory, error: createCategoryError } = await supabase
                .from('expense_categories')
                .insert({
                    user_id: user.id,
                    name: input.category,
                })
                .select('id')
                .single();

            if (createCategoryError) {
                console.error('[createExpense] create category', createCategoryError.message);
                return { error: createCategoryError.message };
            }

            categoryId = createdCategory.id;
        }

        const { data, error } = await supabase
            .from('expenses')
            .insert({
                user_id: user.id,
                category_id: categoryId,
                amount: input.amount,
                type: input.type,
                note: input.note ?? null,
                transaction_date: input.transaction_date,
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
