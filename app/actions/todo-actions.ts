'use server';

import { createClient } from '@/utils/supabase/server';
import type { Todo, TodoInsert, TodoUpdate, ActionResult } from '@/types/database';
import { ensureProfileExists } from '@/utils/supabase/profile';
import { pushLineMessage, createTodoReminderFlex } from '@/utils/line/line-client';

// ==========================================
// READ — Fetch all todos for current user
// ==========================================
export async function getTodos(): Promise<ActionResult<Todo[]>> {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return { error: 'กรุณาเข้าสู่ระบบก่อน' };
        }

        const { data, error } = await supabase
            .from('todos')
            .select('id, user_id, title, description, completed, priority, due_date, reminder_at, is_reminded, reminded_at, created_at, updated_at')
            .eq('user_id', user.id)
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
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return { error: 'กรุณาเข้าสู่ระบบก่อน' };
        }

        const { data, error } = await supabase
            .from('todos')
            .update(input)
            .eq('id', id)
            .eq('user_id', user.id)
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
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return { error: 'กรุณาเข้าสู่ระบบก่อน' };
        }

        const { data, error } = await supabase
            .from('todos')
            .update({ completed })
            .eq('id', id)
            .eq('user_id', user.id)
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
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return { error: 'กรุณาเข้าสู่ระบบก่อน' };
        }

        const { error } = await supabase
            .from('todos')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);

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

// ==========================================
// TEST — Immediately push reminder to LINE for a todo
// ==========================================
export async function sendTestReminder(todoId: string): Promise<ActionResult<{ success: boolean; message: string }>> {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return { error: 'กรุณาเข้าสู่ระบบก่อน' };
        }

        // 1. Fetch user's LINE account
        const { data: lineAccount } = await supabase
            .from('line_accounts')
            .select('line_user_id')
            .eq('user_id', user.id)
            .maybeSingle();

        if (!lineAccount?.line_user_id) {
            return { error: 'ยังไม่ได้ผูกบัญชี LINE ค่ะ กรุณาผูกบัญชีก่อนกดทดสอบแจ้งเตือนนะคะ' };
        }

        // 2. Fetch todo
        const { data: todo, error: todoError } = await supabase
            .from('todos')
            .select('*')
            .eq('id', todoId)
            .eq('user_id', user.id)
            .single();

        if (todoError || !todo) {
            return { error: 'ไม่พบรายการงานนี้' };
        }

        let formattedTime = 'ทันที (โหมดทดสอบ)';
        if (todo.reminder_at) {
            try {
                const d = new Date(todo.reminder_at);
                formattedTime = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' }) + ' น.';
            } catch {
                // ignore
            }
        }

        const flex = createTodoReminderFlex({
            id: todo.id,
            title: todo.title,
            description: todo.description,
            priority: todo.priority,
            dueDate: todo.due_date,
            reminderTime: formattedTime,
        });

        const pushed = await pushLineMessage(lineAccount.line_user_id, [
            {
                type: 'flex',
                altText: `⏰ [ทดสอบ] แจ้งเตือนงาน: ${todo.title}`,
                contents: flex,
            },
        ]);

        if (!pushed) {
            return { error: 'ส่งแจ้งเตือนเข้า LINE ไม่สำเร็จ โปรดตรวจสอบการเชื่อมต่อ LINE Channel' };
        }

        // Update reminder status
        await supabase
            .from('todos')
            .update({
                is_reminded: true,
                reminded_at: new Date().toISOString(),
            })
            .eq('id', todo.id);

        return {
            data: {
                success: true,
                message: 'ส่งแจ้งเตือนเข้า LINE สำเร็จเรียบร้อยแล้วค่ะ! 🔔✨',
            },
        };
    } catch (err) {
        const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการส่งแจ้งเตือน';
        return { error: message };
    }
}
