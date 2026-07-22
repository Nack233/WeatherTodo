'use server';

import { createClient } from '@/utils/supabase/server';
import type { Todo, TodoInsert, TodoUpdate, ActionResult } from '@/types/database';
import { ensureProfileExists } from '@/utils/supabase/profile';

// ==========================================
// READ — Fetch all todos for current user
// ==========================================
export async function getTodos(): Promise<ActionResult<Todo[]>> {
    try {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('todos')
            .select('*')
            .order('completed', { ascending: true })
            .order('due_date', { ascending: true, nullsFirst: false })
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[getTodos]', error.message);
            return { error: error.message };
        }

        return { data: data as Todo[] };
    } catch (err) {
        const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
        console.error('[getTodos] unexpected:', message);
        return { error: message };
    }
}

// ==========================================
// CREATE — Add a new todo
// ==========================================
export async function createTodo(input: TodoInsert): Promise<ActionResult<Todo>> {
    try {
        const supabase = await createClient();

        // Get current user (RLS will also enforce this, but explicit is cleaner)
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return { error: 'กรุณาเข้าสู่ระบบก่อน' };
        }

        const profileResult = await ensureProfileExists(supabase, user);
        if ('error' in profileResult) {
            return { error: profileResult.error };
        }

        const { data, error } = await supabase
            .from('todos')
            .insert({
                ...input,
                user_id: user.id,
            })
            .select()
            .single();

        if (error) {
            console.error('[createTodo]', error.message);
            return { error: error.message };
        }

        return { data: data as Todo };
    } catch (err) {
        const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
        console.error('[createTodo] unexpected:', message);
        return { error: message };
    }
}

// ==========================================
// UPDATE — Update todo fields
// ==========================================
export async function updateTodo(id: string, input: TodoUpdate): Promise<ActionResult<Todo>> {
    try {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('todos')
            .update(input)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('[updateTodo]', error.message);
            return { error: error.message };
        }

        return { data: data as Todo };
    } catch (err) {
        const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
        console.error('[updateTodo] unexpected:', message);
        return { error: message };
    }
}

// ==========================================
// TOGGLE — Toggle completed status
// ==========================================
export async function toggleTodo(id: string, completed: boolean): Promise<ActionResult<Todo>> {
    try {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('todos')
            .update({ completed })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('[toggleTodo]', error.message);
            return { error: error.message };
        }

        return { data: data as Todo };
    } catch (err) {
        const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
        console.error('[toggleTodo] unexpected:', message);
        return { error: message };
    }
}

// ==========================================
// DELETE — Remove a todo
// ==========================================
export async function deleteTodo(id: string): Promise<ActionResult> {
    try {
        const supabase = await createClient();

        const { error } = await supabase
            .from('todos')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('[deleteTodo]', error.message);
            return { error: error.message };
        }

        return {};
    } catch (err) {
        const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
        console.error('[deleteTodo] unexpected:', message);
        return { error: message };
    }
}
